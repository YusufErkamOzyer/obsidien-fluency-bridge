import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import FluencyBridgePlugin from "./main";
import { DEFAULT_SETTINGS, HighlightStyle, LLMProvider, PROVIDER_DEFAULTS } from "./types";

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
    const modelDesc =
      this.plugin.settings.provider === "groq"
        ? "Kullanılacak model ID. Groq için: llama-3.3-70b-versatile (Önerilen/Akıllı) veya qwen/qwen3.8-27b (Ultra Hızlı)"
        : "Kullanılacak model kimliği (ID).";

    new Setting(containerEl)
      .setName("Model Adı")
      .setDesc(modelDesc)
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

    containerEl.createEl("h3", { text: "Metin İçi Vurgulama & Renklendirme" });

    // 6. Highlight Style
    new Setting(containerEl)
      .setName("Vurgulama Yöntemi (Highlight Style)")
      .setDesc("Düzeltilen yerlerin ve ipucu verilen kelimelerin nasıl gösterileceğini belirleyin.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("decorations", "✨ Doğal Editör Vurgusu (CodeMirror 6 - Sıfır HTML, Dosyayı Kirletmez)")
          .addOption("markdown", "✏️ Standart Markdown (==vurgu==)")
          .addOption("none", "🚫 Vurgusuz (Doğrudan Düz Metin)")
          .setValue(this.plugin.settings.highlightStyle || "decorations")
          .onChange(async (val) => {
            this.plugin.settings.highlightStyle = val as HighlightStyle;
            await this.plugin.saveSettings();
          });
      });

    // 7. Highlight Replaced Text
    new Setting(containerEl)
      .setName("Çevrilen İfadeyi Renklendir")
      .setDesc("Köşeli parantezden dönüştürülen hedef kelime/ifadeyi renkli olarak işaretle (hover ile orijinal Türkçe ifade görünür).")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.highlightReplacedText)
          .onChange(async (val) => {
            this.plugin.settings.highlightReplacedText = val;
            await this.plugin.saveSettings();
          });
      });

    // 7b. Replaced Highlight Color
    new Setting(containerEl)
      .setName("Çevrilen İfade Vurgu Rengi")
      .setDesc("Köşeli parantezden dönüştürülen ifadenin alt çizgi ve arka plan rengi.")
      .addColorPicker((color) => {
        color
          .setValue(this.plugin.settings.replacedHighlightColor || DEFAULT_SETTINGS.replacedHighlightColor)
          .onChange(async (val) => {
            this.plugin.settings.replacedHighlightColor = val;
            this.plugin.updateColors();
            await this.plugin.saveSettings();
          });
      })
      .addExtraButton((btn) => {
        btn
          .setIcon("reset")
          .setTooltip("Varsayılan renge sıfırla (#3b82f6)")
          .onClick(async () => {
            this.plugin.settings.replacedHighlightColor = DEFAULT_SETTINGS.replacedHighlightColor;
            this.plugin.updateColors();
            await this.plugin.saveSettings();
            this.display();
          });
      });

    // 8. Highlight Flagged Nuances
    new Setting(containerEl)
      .setName("Uyarı & İpucu Alan Kelimeleri İşaretle")
      .setDesc("Cümledeki yazım hataları veya doğallık uyarısı alan kelimeleri dalgalı alt çizgi ile işaretle (hover ile öneri görünür).")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.highlightFlaggedNuances)
          .onChange(async (val) => {
            this.plugin.settings.highlightFlaggedNuances = val;
            await this.plugin.saveSettings();
          });
      });

    // 8b. Nuance Highlight Color
    new Setting(containerEl)
      .setName("Yazım Hatası & Nüans Vurgu Rengi")
      .setDesc("Cümledeki yazım hataları ve doğallık uyarılarının dalgalı alt çizgi ve arka plan rengi.")
      .addColorPicker((color) => {
        color
          .setValue(this.plugin.settings.nuanceHighlightColor || DEFAULT_SETTINGS.nuanceHighlightColor)
          .onChange(async (val) => {
            this.plugin.settings.nuanceHighlightColor = val;
            this.plugin.updateColors();
            await this.plugin.saveSettings();
          });
      })
      .addExtraButton((btn) => {
        btn
          .setIcon("reset")
          .setTooltip("Varsayılan renge sıfırla (#f59e0b)")
          .onClick(async () => {
            this.plugin.settings.nuanceHighlightColor = DEFAULT_SETTINGS.nuanceHighlightColor;
            this.plugin.updateColors();
            await this.plugin.saveSettings();
            this.display();
          });
      });

    containerEl.createEl("h3", { text: "Kelime Kasası & Uyarılar" });

    // 9. Vocabulary Path
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

    // 10. Auto Log Toggle
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

    // 11. Fluency & Nuance Tips
    new Setting(containerEl)
      .setName("Yazım ve Doğallık Önerileri (Fluency & Nuance Tips)")
      .setDesc("Cümlenizdeki olası yazım hataları (typo), daha doğal alternatif ifadeler ve bağlamsal nüanslar hakkında yapıcı ipuçları göster.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.enableNuanceTips ?? true)
          .onChange(async (val) => {
            this.plugin.settings.enableNuanceTips = val;
            this.plugin.settings.enableSlangAlerts = val;
            await this.plugin.saveSettings();
          });
      });
  }
}
