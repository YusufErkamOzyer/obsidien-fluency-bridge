# 🌉 Obsidian Fluency Bridge

> **İkinci Dilde (İngilizce) Günlük ve Not Yazanlar İçin "Akış Bozmayan" (In-Flow) Bağlamsal Çeviri, Yazım & Doğallık İpuçları ve Aktif Kelime Haznesi (SRS) Obsidian Eklentisi.**

---

## ⚡ Neden Fluency Bridge?

1. **Yazma Akışını (Flow State) Bozmaz:** Tarayıcıya veya sözlüğe geçmeden, cümlenizin ortasında `[takıldığınız Türkçe ifadeyi]` yazıp `Cmd + Shift + E` kısayoluna basmanız yeterlidir. Cümle bağlamına en uygun doğal İngilizce ifade yerinde değiştirilir.
2. **Yazım ve Doğallık Önerileri (Fluency & Nuance Tips):** Cümlenizdeki olası yazım hatalarını (typo), daha doğal eşdizimleri veya alternatif yerli ifadeleri yapıcı ve nazik bir ipucu bildirimiyle sunar.
3. **Otomatik Kelime Kasası (Active Vocabulary Deck):** Değiştirilen her deyim ve kelime, kasanızdaki `Vocabulary.md` dosyasına cümlenin bağlamı ve Türkçe notuyla birlikte otomatik tablo satırı olarak işlenir.

---

## 🚀 Desteklenen Ücretsiz Sağlayıcılar

| Sağlayıcı | Model | Neden Tercih Edilmeli? |
| :--- | :--- | :--- |
| **⚡ Groq (Önerilen)** | `openai/gpt-oss-120b` / `qwen/qwen3.8-27b` | **Ultra hızlı yanıt.** Ücretsiz GroqCloud API anahtarıyla akışı hiç kesmez. |
| **✨ Google Gemini** | `gemini-2.0-flash` | Google AI Studio ücretsiz API anahtarı ile yüksek bağlamsal doğruluk. |
| **🌐 OpenRouter** | `:free` modeller | Çeşitli açık kaynaklı modelleri denemek için. |
| **💻 Özel / Yerel (Ollama)** | `llama3.1`, `qwen2.5` vb. | `http://localhost:11434/v1` üzerinden internetsiz ve gizli çalışma. |

---

## 🛠️ Yerel Kurulum & Geliştirme (Obsidian Kasasına Bağlama)

### 1. Build Edin:
```bash
npm install
npm run build
```

### 2. Kasanızın `.obsidian/plugins/` Klasörüne Bağlayın:
Obsidian kasanızın yoluna göre (örneğin kasanız `Documents/Obsidian Vault` altındaysa):

```bash
# Eklenti klasörünü oluşturun
mkdir -p "/Users/yusuferkamozyer/Documents/Obsidian Vault/.obsidian/plugins/obsidian-fluency-bridge"

# main.js, manifest.json ve styles.css dosyalarını kopyalayın veya bağlayın:
cp main.js manifest.json styles.css "/Users/yusuferkamozyer/Documents/Obsidian Vault/.obsidian/plugins/obsidian-fluency-bridge/"
```

*(Veya geliştirme yaparken anlık güncellenmesi için sembolik bağ `ln -s` yapabilirsiniz).*

### 3. Obsidian'da Aktif Edin:
1. Obsidian'ı açın.
2. **Settings (Ayarlar) -> Community Plugins (Topluluk Eklentileri)** sekmesine gidin.
3. **Fluency Bridge** eklentisini bulun ve açık (ON) konuma getirin.
4. Eklenti ayarlarına girip **Groq** veya **Gemini** API anahtarınızı yapıştırın ve **"Bağlantıyı Test Et"** butonuna basın.

---

## 💡 Nasıl Kullanılır?

1. Notunuzda normal İngilizce cümlenizi yazarken aklınıza gelmeyen ifadeyi köşeli parantez içine alın:
   > *"I was thinking about how AI agents will [sektörü baştan şekillendireceği] in five years."*
2. İmleç cümlenin üzerindeyken **`Cmd + Shift + E`** (Windows'ta `Ctrl + Shift + E`) tuşlarına basın.
3. Saniyeler içinde metniniz akışa uygun hale gelir:
   > *"I was thinking about how AI agents will **reshape the industry** in five years."*
4. İfade otomatik olarak `Vocabulary.md` kütüğünüze kaydedilir!

---

## 📂 Proje Mimarisi

- `src/main.ts`: Obsidian Plugin giriş noktası, komut ve kısayol yönetimi.
- `src/services/contextParser.ts`: CodeMirror 6 imleç ve köşeli parantez / metin yakalama motoru.
- `src/llm/client.ts`: Groq, Gemini, OpenRouter ve Ollama uyumlu, JSON modlu hafif istemci.
- `src/services/vocabulary.ts`: Otomatik Markdown kelime kasası yöneticisi.
- `src/settings.ts`: Obsidian kullanıcı ayarları arayüzü.
- `esbuild.config.mjs`: Milisaniyelik bundle oluşturucu.
