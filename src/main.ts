import { Editor, MarkdownFileInfo, MarkdownView, Notice, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, FluencyBridgeSettings } from "./types";
import { FluencyBridgeSettingTab } from "./settings";
import { LLMClient } from "./llm/client";
import { ContextParser } from "./services/contextParser";
import { VocabularyManager } from "./services/vocabulary";

export default class FluencyBridgePlugin extends Plugin {
  settings: FluencyBridgeSettings = DEFAULT_SETTINGS;
  llmClient: LLMClient = new LLMClient(this.settings);
  vocabManager: VocabularyManager = new VocabularyManager(this.app, this.settings);

  async onload() {
    await this.loadSettings();

    this.llmClient = new LLMClient(this.settings);
    this.vocabManager = new VocabularyManager(this.app, this.settings);

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

    console.log("[Fluency Bridge] Eklenti başarıyla yüklendi.");
  }

  onunload() {
    console.log("[Fluency Bridge] Eklenti devreden çıkarıldı.");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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

      // Replace the text inside the editor
      editor.replaceRange(
        result.replacement,
        target.replaceRange.from,
        target.replaceRange.to
      );

      // Position the cursor at the end of the newly inserted text
      const newCursorCh = target.replaceRange.from.ch + result.replacement.length;
      editor.setCursor({
        line: target.replaceRange.from.line,
        ch: newCursorCh,
      });

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
}
