import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import FluencyBridgePlugin from "./main";
import { LLMProvider, PROVIDER_DEFAULTS } from "./types";

export class FluencyBridgeSettingTab extends PluginSettingTab {
  plugin: FluencyBridgePlugin;

  constructor(app: App, plugin: FluencyBridgePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Fluency Bridge Ayarları" });
    containerEl.createEl("p", {
      text: "İki dilli yazma akışınızı bozmadan bağlamsal çeviri, argo koruması ve kelime kasası yönetimi.",
      cls: "setting-item-description",
    });

    // 1. LLM Provider
    new Setting(containerEl)
      .setName("Yapay Zeka Sağlayıcısı (Provider)")
      .setDesc("Kullanmak istediğiniz LLM API sağlayıcısını seçin. Hız için Groq önerilir.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("groq", "⚡ Groq (Önerilen - Ultra Hızlı, Ücretsiz)")
          .addOption("gemini", "✨ Google Gemini (Flash, Yüksek Zeka, Ücretsiz)")
          .addOption("openrouter", "🌐 OpenRouter (Geniş Model Yelpazesi)")
          .addOption("custom", "💻 Özel / Yerel (Ollama / Local REST)")
          .setValue(this.plugin.settings.provider)
          .onChange(async (val) => {
            this.plugin.settings.provider = val as LLMProvider;
            const def = PROVIDER_DEFAULTS[this.plugin.settings.provider];
            this.plugin.settings.model = def.defaultModel;
            await this.plugin.saveSettings();
            this.display(); // Refresh to update placeholders and custom endpoint visibility
          });
      });

    // 2. API Key
    const providerDef = PROVIDER_DEFAULTS[this.plugin.settings.provider];
    new Setting(containerEl)
      .setName("API Anahtarı")
      .setDesc(`Seçili sağlayıcı için API anahtarınız (${this.plugin.settings.provider.toUpperCase()}).`)
      .addText((text) => {
        text
          .setPlaceholder(providerDef.placeholderKey)
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (val) => {
            this.plugin.settings.apiKey = val.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.type = "password";
      });

    // 3. Model Name
    new Setting(containerEl)
      .setName("Model Adı")
      .setDesc("Kullanılacak model kimliği (ID).")
      .addText((text) => {
        text
          .setPlaceholder(providerDef.defaultModel)
          .setValue(this.plugin.settings.model)
          .onChange(async (val) => {
            this.plugin.settings.model = val.trim();
            await this.plugin.saveSettings();
          });
      });

    // 4. Custom Endpoint (if custom is selected)
    if (this.plugin.settings.provider === "custom") {
      new Setting(containerEl)
        .setName("Özel API Uç Noktası (Endpoint)")
        .setDesc("OpenAI uyumlu tam POST URL (örn: http://localhost:11434/v1/chat/completions)")
        .addText((text) => {
          text
            .setPlaceholder("http://localhost:11434/v1/chat/completions")
            .setValue(this.plugin.settings.customEndpoint)
            .onChange(async (val) => {
              this.plugin.settings.customEndpoint = val.trim();
              await this.plugin.saveSettings();
            });
        });
    }

    // 5. Connection Test Button
    new Setting(containerEl)
      .setName("API Bağlantısını Test Et")
      .setDesc("Girdiğiniz API anahtarının ve modelin çalıştığını doğrulayın.")
      .addButton((btn) => {
        btn
          .setButtonText("Bağlantıyı Test Et")
          .setCta()
          .onClick(async () => {
            btn.setDisabled(true);
            btn.setButtonText("Test ediliyor...");
            const res = await this.plugin.llmClient.testConnection();
            btn.setDisabled(false);
            btn.setButtonText("Bağlantıyı Test Et");

            if (res.success) {
              new Notice(`✅ ${res.message}`);
            } else {
              new Notice(`❌ ${res.message}`, 6000);
            }
          });
      });

    containerEl.createEl("h3", { text: "Kelime Kasası & Uyarılar" });

    // 6. Vocabulary Path
    new Setting(containerEl)
      .setName("Kelime Kasası Dosyası (Vocabulary Path)")
      .setDesc("Çevrilen ve öğrenilen kelimelerin otomatik ekleneceği markdown dosyası.")
      .addText((text) => {
        text
          .setPlaceholder("Vocabulary.md")
          .setValue(this.plugin.settings.vocabularyPath)
          .onChange(async (val) => {
            this.plugin.settings.vocabularyPath = val.trim();
            await this.plugin.saveSettings();
          });
      });

    // 7. Auto Log Toggle
    new Setting(containerEl)
      .setName("Kelimeyi Otomatik Kaydet")
      .setDesc("Değiştirilen her deyim ve kelimeyi otomatik olarak kelime kütüğüne tablo olarak ekle.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.autoLogVocabulary)
          .onChange(async (val) => {
            this.plugin.settings.autoLogVocabulary = val;
            await this.plugin.saveSettings();
          });
      });

    // 8. Slang & False Friend Alert
    new Setting(containerEl)
      .setName("Argo & False-Friend Koruması")
      .setDesc("İki dilli tuzaklar (örn: 'gets me hard' gibi argo veya utanç verici kullanımlar) tespit edildiğinde ekranda nazik bir uyarı bildirimi göster.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.enableSlangAlerts)
          .onChange(async (val) => {
            this.plugin.settings.enableSlangAlerts = val;
            await this.plugin.saveSettings();
          });
      });
  }
}
