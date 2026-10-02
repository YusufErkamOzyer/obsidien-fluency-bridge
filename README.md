# 🌉 Obsidian Fluency Bridge

> **İkinci Dilde (İngilizce) Günlük ve Not Yazanlar İçin "Akış Bozmayan" (In-Flow) Bağlamsal Çeviri, Renkli Vurgu & İpucu Desteği ve Aktif Kelime Haznesi (SRS) Obsidian Eklentisi.**

---

## ⚡ Neden Fluency Bridge?

1. **Yazma Akışını (Flow State) Bozmaz:** Tarayıcıya veya sözlüğe geçmeden, cümlenizin ortasında `[takıldığınız Türkçe ifadeyi]` yazıp `Cmd + Shift + E` kısayoluna basmanız yeterlidir. Cümle bağlamına en uygun doğal İngilizce ifade yerinde değiştirilir.
2. **✨ Doğal Editör Vurgulaması (CodeMirror 6 Decorations - v0.2):**
   - **Sıfır HTML Etiketi / %100 Temiz Markdown:** Markdown dosyanıza hiçbir yabancı `<mark>` veya HTML etiketi **eklenmez**. Metniniz her zaman saf ve pürüzsüz kalır.
   - **Düzeltilen Çeviriler (`.fb-replaced`):** Çevrilen yerler editör üzerinde anında sakin mavi/turkuaz bir vurgu alır. Bilgisayar başından ayrılsanız bile döndüğünüzde neyin değiştiğini hemen fark edersiniz. Fareyle üzerine geldiğinizde (hover tooltip) orijinal Türkçe ifade gösterilir (`Orijinal: [ifade]`).
   - **Hata & Nüans Uyarıları (`.fb-nuance`):** Cümledeki yazım hataları (typo) veya daha doğal eşdizimler (örn: *make research* yerine *do research*) kehribar rengi dalgalı alt çizgi ile editörde işaretlenir. Üzerine gelindiğinde yapıcı ipucu ve önerilen alternatif görüntülenir.
   - **Tek Tuşla Temizleme (`Cmd + Shift + H`):** İstediğiniz an tek bir komutla tüm görsel vurgulamaları kaldırabilirsiniz.
3. **Yazım ve Doğallık Önerileri (Fluency & Nuance Tips):** Cümlenizdeki olası yazım hatalarını ve bağlamsal nüansları dostça bir bildirim ve görsel alt çizgi ile sunar.
4. **Otomatik Kelime Kasası (Active Vocabulary Deck):** Değiştirilen her deyim ve kelime, kasanızdaki `Vocabulary.md` dosyasına cümlenin bağlamı ve Türkçe notuyla birlikte otomatik tablo satırı olarak işlenir.

---

## 🚀 Desteklenen Ücretsiz Sağlayıcılar

| Sağlayıcı | Model | Neden Tercih Edilmeli? |
| :--- | :--- | :--- |
| **⚡ Groq (Önerilen)** | `llama-3.3-70b-versatile` / `qwen/qwen3.8-27b` | **Ultra hızlı yanıt.** Ücretsiz GroqCloud API anahtarıyla akışı hiç kesmez. |
| **✨ Google Gemini** | `gemini-2.0-flash` | Google AI Studio ücretsiz API anahtarı ile yüksek bağlamsal doğruluk. |
| **🌐 OpenRouter** | `:free` modeller | Çeşitli açık kaynaklı modelleri denemek için. |
| **💻 Özel / Yerel (Ollama)** | `llama3.1`, `qwen2.5` vb. | `http://localhost:11434/v1` üzerinden internetsiz ve gizli çalışma. |

---

## 💡 Nasıl Kullanılır?

1. Notunuzda normal cümlenizi yazarken aklınıza gelmeyen ifadeyi köşeli parantez içine alın:
   > *"I want to [araştırma yapmak] because my hearth is weak."*
2. İmleç cümlenin üzerindeyken **`Cmd + Shift + E`** (Windows'ta `Ctrl + Shift + E`) tuşlarına basın.
3. Saniyeler içinde cümleniz pürüzsüz metin olarak dönüştürülür:
   - Metin dosyanız: *"I want to conduct research because my hearth is weak."* (Tertemiz, HTML yok!)
   - Editörde: `conduct research` sakin maviyle vurgulanır, `hearth` dalgalı alt çizgi alır.
   - Fareyle kelimelerin üzerine gelince ipucu ve orijinal ifade açılır.
4. Vurgulamaları kaldırmak isterseniz **`Cmd + Shift + H`** tuşlarına basmanız yeterlidir.

---

## 🛠️ Yerel Kurulum & Geliştirme (Obsidian Kasasına Bağlama)

### 1. Build Edin:
```bash
npm install
npm run build
```

### 2. Kasanızın `.obsidian/plugins/` Klasörüne Bağlayın:
```bash
# Eklenti klasörünü oluşturun
mkdir -p "/Users/yusuferkamozyer/Documents/Obsidian Vault/.obsidian/plugins/obsidian-fluency-bridge"

# main.js, manifest.json ve styles.css dosyalarını kopyalayın:
cp main.js manifest.json styles.css "/Users/yusuferkamozyer/Documents/Obsidian Vault/.obsidian/plugins/obsidian-fluency-bridge/"
```

### 3. Obsidian'da Aktif Edin:
1. Obsidian'ı açın.
2. **Settings (Ayarlar) -> Community Plugins (Topluluk Eklentileri)** sekmesine gidin.
3. **Fluency Bridge** eklentisini bulun ve açık (ON) konuma getirin.
4. Eklenti ayarlarına girip **Groq** veya **Gemini** API anahtarınızı yapıştırın ve **"Bağlantıyı Test Et"** butonuna basın.

---

## 📂 Proje Mimarisi

- `src/main.ts`: Obsidian Plugin giriş noktası, komut ve kısayol yönetimi (`replace-in-flow`, `clear-fluency-highlights`).
- `src/services/highlightManager.ts`: HTML `<mark>` ve Markdown etiketlerini güvenli yerleştirme, nüans kelimelerini tag dışında eşleştirme ve temizleme motoru.
- `src/services/contextParser.ts`: CodeMirror 6 imleç ve köşeli parantez / metin yakalama motoru.
- `src/llm/client.ts`: Groq, Gemini, OpenRouter ve Ollama uyumlu, `flaggedItem` ve `vocabItem` JSON şemalı istemci.
- `src/services/vocabulary.ts`: Otomatik Markdown kelime kasası yöneticisi.
- `src/settings.ts`: Vurgulama stili, sağlayıcı ve kütük ayarları arayüzü.
- `styles.css`: `.fb-replaced` ve `.fb-nuance` sınıfları için açık ve koyu tema stilleri.
