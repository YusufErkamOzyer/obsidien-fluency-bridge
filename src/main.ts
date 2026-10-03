import {
  Editor,
  MarkdownFileInfo,
  MarkdownView,
  Notice,
  Plugin,
  TAbstractFile,
} from "obsidian";
import { DEFAULT_SETTINGS, FluencyBridgeSettings, StoredHighlight } from "./types";
import { FluencyBridgeSettingTab } from "./settings";
import { LLMClient } from "./llm/client";
import { ContextParser } from "./services/contextParser";
import { VocabularyManager } from "./services/vocabulary";
import {
  createHighlightPersistence,
  fluencyHighlightField,
  HighlightManager,
} from "./services/highlightManager";

export default class FluencyBridgePlugin extends Plugin {
  settings: FluencyBridgeSettings = DEFAULT_SETTINGS;
  llmClient: LLMClient = new LLMClient(this.settings);
  vocabManager: VocabularyManager = new VocabularyManager(this.app, this.settings);

  private persistTimer: number | null = null;

  async onload() {
    await this.loadSettings();

    this.llmClient = new LLMClient(this.settings);
    this.vocabManager = new VocabularyManager(this.app, this.settings);

    // Register CodeMirror 6 Visual Highlight Extension (Zero HTML tags in Markdown)
    // plus the persistence listener that remembers highlights per note.
    this.registerEditorExtension([
      fluencyHighlightField,
      createHighlightPersistence((path, highlights) => this.rememberHighlights(path, highlights)),
    ]);

    // Add Settings Tab
    this.addSettingTab(new FluencyBridgeSettingTab(this.app, this));

    // Register In-Flow Translation Command
    this.addCommand({
      id: "replace-in-flow-expression",
      name: "Replace In-Flow Expression (Akış İçi İfadeyi Çevir)",
      editorCallback: async (editor: Editor, _ctx: MarkdownView | MarkdownFileInfo) => {
        await this.handleInFlowTranslation(editor);
      },
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: "E",
        },
      ],
    });

    // Register Command to Clear Highlights
    this.addCommand({
      id: "clear-fluency-highlights",
      name: "Clear Fluency Highlights in Active Note (Aktif Nottaki Vurguları Temizle)",
      editorCallback: (editor: Editor, _ctx: MarkdownView | MarkdownFileInfo) => {
        this.handleClearHighlights(editor);
      },
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: "H",
        },
      ],
    });

    // Restore saved highlights whenever a note is (re)opened or the layout changes.
    this.registerEvent(this.app.workspace.on("file-open", () => this.scheduleRestore()));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.scheduleRestore()));
    this.registerEvent(this.app.workspace.on("layout-change", () => this.scheduleRestore()));
    this.app.workspace.onLayoutReady(() => this.scheduleRestore());

    // Keep the saved highlights attached to the right note when files move or disappear.
    this.registerEvent(
      this.app.vault.on("rename", (file: TAbstractFile, oldPath: string) => {
        const saved = this.settings.savedHighlights;
        if (saved[oldPath]) {
          saved[file.path] = saved[oldPath];
          delete saved[oldPath];
          this.queuePersist();
        }
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", (file: TAbstractFile) => {
        if (this.settings.savedHighlights[file.path]) {
          delete this.settings.savedHighlights[file.path];
          this.queuePersist();
        }
      })
    );

    console.log("[Fluency Bridge v0.2.0] Eklenti başarıyla yüklendi.");
  }

  onunload() {
    // Flush any pending highlight save so nothing is lost on reload/disable.
    if (this.persistTimer !== null) {
      window.clearTimeout(this.persistTimer);
      this.persistTimer = null;
      void this.saveData(this.settings);
    }
    console.log("[Fluency Bridge] Eklenti devreden çıkarıldı.");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    // Never share the default's object between sessions/notes.
    this.settings.savedHighlights = { ...(this.settings.savedHighlights ?? {}) };
    if (this.llmClient) {
      this.llmClient.updateSettings(this.settings);
    }
    if (this.vocabManager) {
      this.vocabManager.updateSettings(this.settings);
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.llmClient.updateSettings(this.settings);
    this.vocabManager.updateSettings(this.settings);
  }

  /** Called by the editor extension on every change of a note's highlights. */
  private rememberHighlights(path: string, highlights: StoredHighlight[]) {
    if (highlights.length === 0) {
      delete this.settings.savedHighlights[path];
    } else {
      this.settings.savedHighlights[path] = highlights;
    }
    this.queuePersist();
  }

  /** In-memory state is always current; only the disk write is debounced. */
  private queuePersist() {
    if (this.persistTimer !== null) window.clearTimeout(this.persistTimer);
    this.persistTimer = window.setTimeout(() => {
      this.persistTimer = null;
      void this.saveData(this.settings);
    }, 600);
  }

  /** The note content may still be loading right after open, so retry a few times (idempotent). */
  private scheduleRestore() {
    for (const delay of [0, 150, 500, 1200]) {
      window.setTimeout(() => this.restoreOpenNotes(), delay);
    }
  }

  private restoreOpenNotes() {
    this.app.workspace.iterateAllLeaves((leaf) => {
      const view = leaf.view;
      if (!(view instanceof MarkdownView) || !view.file) return;

      const stored = this.settings.savedHighlights[view.file.path];
      if (!stored || stored.length === 0) return;

      HighlightManager.restoreToEditor(view.editor, stored);
    });
  }

  private async handleInFlowTranslation(editor: Editor) {
    const target = ContextParser.extractTarget(editor);

    if (!target) {
      new Notice(
        "Fluency Bridge: Çevrilecek ifade bulunamadı! Lütfen bir ifadeyi [köşeli parantez] içine alın veya metni seçin.",
        4000
      );
      return;
    }

    const pendingNotice = new Notice(
      `Fluency Bridge: [${target.rawExpression}] bağlama göre dönüştürülüyor...`,
      0
    );

    try {
      const startTime = performance.now();
      const result = await this.llmClient.translateInFlow(
        target.rawExpression,
        target.fullSentence
      );
      const durationMs = Math.round(performance.now() - startTime);

      pendingNotice.hide();

      if (!result.replacement) {
        new Notice("Fluency Bridge: Modelden geçerli bir karşılık alınamadı.", 4000);
        return;
      }

      // Apply the translation cleanly without HTML tags and trigger CM6 editor decorations
      HighlightManager.applyToEditor(editor, target, result, this.settings);

      // Show Fluency & Nuance feedback tip if provided
      const tip = result.feedback || result.warning;
      const enableTips = this.settings.enableNuanceTips ?? this.settings.enableSlangAlerts ?? true;
      if (enableTips && tip) {
        new Notice(`💡 İpucu: ${tip}`, 8000);
      } else {
        new Notice(`✓ Akışa uyarlandı (${durationMs}ms)`, 2000);
      }

      // Log to active vocabulary deck
      if (this.settings.autoLogVocabulary) {
        await this.vocabManager.logItem(result, target.fullSentence);
      }
    } catch (err: unknown) {
      pendingNotice.hide();
      const errorMsg = err instanceof Error ? err.message : String(err);
      new Notice(`Fluency Bridge Hatası: ${errorMsg}`, 7000);
      console.error("[Fluency Bridge Error]", err);
    }
  }

  private handleClearHighlights(editor: Editor) {
    const { legacyRemovedCount } = HighlightManager.clearHighlights(editor);
    if (legacyRemovedCount > 0) {
      new Notice(`✓ Fluency Bridge: Görsel vurgular ve ${legacyRemovedCount} adet eski etiket temizlendi.`, 3000);
    } else {
      new Notice("✓ Fluency Bridge: Görsel vurgulamalar temizlendi.", 2500);
    }
  }
}
