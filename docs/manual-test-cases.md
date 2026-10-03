# Fluency Bridge v0.2 – Manuel Test Senaryoları

Bu dosyayı Obsidian kasanıza kopyalayın. Her maddede **imleci cümlenin üzerine** getirip `Cmd/Ctrl + Shift + E` basın.
Temizlemek için `Cmd/Ctrl + Shift + H`.

> Model çıktısı deterministik değildir. Aşağıdaki "Beklenen" kısımlar **yaklaşık** sonuçtur; asıl bakılacak şey **hangi kelimenin boyandığı** ve **metinde HTML olmadığıdır**.

**Renk rehberi:** mavi zemin = çevrilen ifade · kehribar dalgalı çizgi = hata/doğallık uyarısı · fareyle üstüne gelince ipucu çıkar.

---

## A. Temel çeviri (sadece mavi vurgu beklenir)

- [ ] **A1** I want to [araştırma yapmak] about this topic.
  - Beklenen: `conduct research` mavi. Dalgalı çizgi yok.
- [ ] **A2** She was [çok mutlu] when she heard the news.
  - Beklenen: `over the moon` / `thrilled` mavi.
- [ ] **A3** We need to [karar vermek] before Friday.
  - Beklenen: `make a decision` / `decide` mavi.
- [ ] **A4** He tried to [üstesinden gelmek] the problem.
  - Beklenen: `overcome` mavi. Hover: `Orijinal: [üstesinden gelmek]`.
- [ ] **A5** [Sonunda] I finished the project.
  - Beklenen: cümle başındaki ifade de çevrilir (`Finally`).
- [ ] **A6** I finished the project [sonunda]
  - Beklenen: cümle sonunda, noktasız da çalışır.

## B. Tek hata (mavi + 1 dalgalı çizgi)

- [ ] **B1** My hearth is racing so I need to [sakinleşmek].
  - Beklenen: `calm down` mavi, `hearth` dalgalı. İpucu: `heart`.
- [ ] **B2** I [araştırma yapmak] but I make research every day.
  - Beklenen: `make research` dalgalı (öneri `do research`).
- [ ] **B3** I recieve many emails and I need to [cevap vermek].
  - Beklenen: `recieve` dalgalı (`receive`).
- [ ] **B4** The [toplantı] was cancelled because of the wether.
  - Beklenen: `wether` dalgalı (`weather`).

## C. Birden fazla hata – v0.2 düzeltmesi ⭐

Hepsi boyanmalı; biri boyanıp diğeri boyanmamışsa **hata var**.

- [ ] **C1** My hearth is racing and I recieve the [kötü haber] now.
  - Beklenen: `hearth` **ve** `recieve` dalgalı + mavi çeviri (3 vurgu).
- [ ] **C2** Teh cat and teh dog [koşmak] very fast.
  - Beklenen: iki `teh` de dalgalı (aynı hata iki kez).
- [ ] **C3** I beleive that we shoud [başlamak] earlier, becuase it is importent.
  - Beklenen: `beleive`, `shoud`, `becuase`, `importent` – 4 dalgalı + mavi.
- [ ] **C4** I make research and I take a decision about [yatırım yapmak].
  - Beklenen: `make research` ve `take a decision` iki ifade dalgalı (doğallık).
- [ ] **C5** Yesterday I goed to the [pazar] and buyed some vegetables.
  - Beklenen: `goed` ve `buyed` dalgalı.

## D. Hata konumu (parantezin önü / arkası)

- [ ] **D1** (hata önde) Definately I will [gelmek] tomorrow.
- [ ] **D2** (hata arkada) I will [gelmek] tomorrow, definately.
- [ ] **D3** (iki yanda) Definately I will [gelmek] tomorrow, accomodation is ready.
  - Beklenen: `Definately` ve `accomodation` ikisi de dalgalı.

## E. Hatasız cümle (dalgalı çizgi OLMAMALI)

- [ ] **E1** I would like to [rezervasyon yapmak] a table for two.
  - Beklenen: sadece mavi vurgu. Bildirim: "Akışa uyarlandı".
- [ ] **E2** The weather is great, so let's [yürüyüşe çıkmak] together.

## F. Parantezsiz / seçim ile kullanım

- [ ] **F1** Köşeli parantez olmadan bu cümlede `karar vermek` ifadesini **fare ile seçin**: We have to karar vermek today.
  - Beklenen: seçili kısım çevrilir ve mavi olur.
- [ ] **F2** İmleç hiçbir yerde seçili değil ve satırda `[ ]` yok: This line has no brackets.
  - Beklenen: "Çevrilecek ifade bulunamadı" uyarısı, metin değişmez.

## G. Aynı satırda birden fazla parantez

- [ ] **G1** I want to [koşmak] and then [dinlenmek] after work.
  - Beklenen: imlece **en yakın** olan çevrilir. Sonra imleci diğerine taşıyıp tekrar basın; ikisi de mavi olmalı.
- [ ] **G2** First [kahvaltı yapmak], then [işe gitmek], then [eve dönmek].
  - Beklenen: her çalıştırmada bir parantez; üçü sonunda mavi.

## H. Özel karakter ve biçim

- [ ] **H1** She said "I will [gelmek]" and left.
  - Tırnak içinde çalışmalı.
- [ ] **H2** It costs $5 | €4 so I want to [satın almak] it.
  - Boru `|` karakteri kelime kasası tablosunu bozmamalı (`Vocabulary.md`'yi açıp kontrol edin).
- [ ] **H3** - [x] Madde içinde: I need to [hazırlanmak] for the exam.
- [ ] **H4** > Alıntı içinde: I want to [öğrenmek] English.
- [ ] **H5** # Başlıkta [planlamak]
- [ ] **H6** | Tablo | Hücre [kontrol etmek] |
- [ ] **H7** Café, naïve, résumé: I need to [güncellemek] my résumé.
  - Aksanlı harfler hata sayılmamalı, boyama kaymamalı.
- [ ] **H8** Çok uzun cümle: Although I was very tired after the long journey and the endless meetings, I still managed to [zamanında teslim etmek] the final report, and my hearth was full of pride.
  - Beklenen: `hearth` dalgalı, mavi doğru yerde.

## I. Kalıcılık – v0.2 düzeltmesi ⭐

Önce **C1** cümlesini çalıştırıp 3 vurgu oluşturun, sonra:

- [ ] **I1** Başka bir nota geçip geri dönün → vurgular duruyor mu?
- [ ] **I2** Notun sekmesini **kapatıp** tekrar açın → vurgular geri geliyor mu?
- [ ] **I3** Obsidian'ı tamamen kapatıp açın → vurgular geri geliyor mu?
- [ ] **I4** Notun **başına** bir satır yazın, kapatıp açın → vurgular doğru kelimede mi (kaymadı mı)?
- [ ] **I5** Notu **yeniden adlandırın** → vurgular duruyor mu?
- [ ] **I6** Aynı nota ait bir **bölünmüş (split) pencere** açın → iki tarafta da var mı?
- [ ] **I7** Notu silin, aynı adla yenisini oluşturun → eski vurgular **gelmemeli**.

## J. Düzenleme sırasında davranış

- [ ] **J1** C1 sonrası dalgalı `hearth` kelimesini kendiniz `heart` yapın → dalgalı çizgi **kalkmalı**.
- [ ] **J2** Mavi ifadenin sonuna harf ekleyin (`conduct researches`) → vurgu genişlemez, bozulmaz.
- [ ] **J3** Mavi ifadenin ortasına imleç koyup yazın → editör normal davranmalı, HTML görünmemeli.
- [ ] **J4** Vurgulu kelimeyi tamamen silin → vurgu kaybolur, hata vermez.
- [ ] **J5** Kapalıyken (başka editörde) hatalı kelimeyi düzeltip notu açın → o kelimenin vurgusu **gelmemeli**, diğerleri gelmeli.
- [ ] **J6** Notu seçip **Ctrl/Cmd+Z** ile geri alın → hata/çökme olmamalı.

## K. Temizleme

- [ ] **K1** `Cmd/Ctrl + Shift + H` → tüm vurgular gider.
- [ ] **K2** Notu kapatıp açın → temizlenen vurgular **geri gelmemeli**.
- [ ] **K3** Vurgu olmayan notta komutu çalıştırın → hata vermemeli, bildirim çıkmalı.

## L. Ayarlar

- [ ] **L1** *Vurgulama Yöntemi → Standart Markdown*: C1'i çalıştırın → çevrilen kısım `==...==` olur, dalgalı çizgi çıkmaz.
- [ ] **L2** *Vurgulama Yöntemi → Vurgusuz*: hiçbir renk, metin düz.
- [ ] **L3** *Çevrilen İfadeyi Renklendir* kapalı: sadece dalgalı çizgiler.
- [ ] **L4** *Uyarı & İpucu Alan Kelimeleri İşaretle* kapalı: sadece mavi.
- [ ] **L5** *Yazım ve Doğallık Önerileri* kapalı: ipucu bildirimi çıkmaz ("Akışa uyarlandı" çıkar).
- [ ] **L6** Dil çiftini değiştirin (örn. Hedef: German) ve cümleyi o dilde yazıp deneyin.

## M. Kelime kasası (`Vocabulary.md`)

- [ ] **M1** Her çeviri sonrası `Vocabulary.md`'ye bir satır eklenmeli (tarih, ifade, anlam, cümle).
- [ ] **M2** *Kelimeyi Otomatik Kaydet* kapalıyken satır eklenmemeli.
- [ ] **M3** H2 cümlesi sonrası tablo bozulmamalı.

## N. Hata durumları

- [ ] **N1** API anahtarını silin → anlaşılır "API Anahtarı ayarlanmamış" bildirimi.
- [ ] **N2** Geçersiz anahtar girin → API hatası bildirimi, metin değişmez.
- [ ] **N3** İnterneti kapatın → "Bağlantı" hatası, metin değişmez, takılı "dönüştürülüyor" bildirimi kalmamalı.
- [ ] **N4** Boş parantez: I want to [] go. → metin değişmemeli.
- [ ] **N5** Anlamsız içerik: I want to [asdfghjkl] now. → çökmemeli.
- [ ] **N6** Çevrilen ifade zaten İngilizce: I want to [do research] today. → makul davranmalı, hata vermemeli.

## O. Bilinen sınırlar (hata değil, beklenen)

- Bağlam yalnızca **bulunduğunuz satırdır**; çok satırlı paragrafta başka satırdaki yazım hataları taranmaz.
- Vurgular **Edit/Live Preview** modunda görünür; **Reading** modunda görünmez.
- Başka bir uygulamada (VS Code vb.) açılan not vurgusuz görünür; metin temizdir.
- Model ipucu vermezse hata boyanmaz; boyama modelin döndürdüğü listeye bağlıdır.

---

### Hızlı kontrol listesi (kritik 5)

1. C1: iki hata da boyanıyor mu?
2. I2: sekmeyi kapat-aç sonrası vurgular var mı?
3. Metinde hiç `<mark>`/HTML yok mu?
4. J1: hatayı düzeltince çizgi kalkıyor mu?
5. K2: temizlenen vurgular geri gelmiyor mu?
