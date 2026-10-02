import { App, TFile, normalizePath } from "obsidian";
import { FluencyBridgeSettings, TranslationResult } from "../types";

export class VocabularyManager {
  private app: App;
  private settings: FluencyBridgeSettings;

  constructor(app: App, settings: FluencyBridgeSettings) {
    this.app = app;
    this.settings = settings;
  }

  updateSettings(settings: FluencyBridgeSettings) {
    this.settings = settings;
  }

  async logItem(result: TranslationResult, originalSentence: string): Promise<boolean> {
    if (!this.settings.autoLogVocabulary || !result.vocabItem) {
      return false;
    }

    try {
      const filePath = normalizePath(this.settings.vocabularyPath.trim() || "Vocabulary.md");
      const folderPath = filePath.substring(0, filePath.lastIndexOf("/"));

      if (folderPath && !(await this.app.vault.adapter.exists(folderPath))) {
        await this.app.vault.createFolder(folderPath);
      }

      const dateStr = new Date().toISOString().slice(0, 16).replace("T", " ");
      const term = result.vocabItem.term.replace(/\|/g, "\\|");
      const def = result.vocabItem.definition.replace(/\|/g, "\\|");
      const sentence = (result.vocabItem.example || originalSentence).replace(/\|/g, "\\|").trim();

      const newRow = `| ${dateStr} | **${term}** | ${def} | ${sentence} |\n`;

      const existingFile = this.app.vault.getAbstractFileByPath(filePath);

      if (existingFile instanceof TFile) {
        await this.app.vault.append(existingFile, newRow);
      } else {
        const initialContent = `# 📚 Active Vocabulary Deck (Fluency Bridge)\n\n` +
          `Otomatik oluşturulan aktif kelime ve deyimler listesi.\n\n` +
          `| Tarih | İfade / Kelime | Anlam & Not | Bağlamsal Cümle |\n` +
          `| :--- | :--- | :--- | :--- |\n` +
          newRow;
        await this.app.vault.create(filePath, initialContent);
      }

      return true;
    } catch (err) {
      console.error("[Fluency Bridge] Kelime kasasına kaydedilirken hata oluştu:", err);
      return false;
    }
  }
}
