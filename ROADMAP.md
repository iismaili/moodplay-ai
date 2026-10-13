# MoodPlay AI — Tek Dosyalık Uçtan Uca Geliştirme Roadmap'i

> **Proje:** Canlı kameradan görünür yüz ifadelerini analiz ederek kişiye eğlenceli Türkçe mesajlar gösteren ve uygun müzik çalan, etkinlik/kiosk odaklı web uygulaması.
> **Geliştirme aracı:** Cursor Agent
> **Durum:** Aşama 0–7 ve aşama 8'in otomatik kontrolleri doğrulandı. Gerçek yüzle ışık ve mimik kabul turu bu ortamda kamera olmadığı için açık.
> **Çalışma biçimi:** Bu dosyayı projenin köküne `ROADMAP.md` adıyla koy. Agent her oturumda dosyayı okuyup tamamlanmamış ilk maddeye devam eder. Adımlar sıra ile uygulanır; başarısız kontroller geçilmeden sonraki aşamaya geçilmez.

## A. Ürün tanımı ve sınırlar

- Ziyaretçi bilgilendirme ekranını görür; **Deneyimi Başlat** düğmesine basınca kamera izni istenir ve ses sistemi kullanıcı etkileşimiyle etkinleştirilir.
- Tarayıcı yalnızca yüzün **görünür mimik ipuçlarını** analiz eder. Gerçek duyguyu, kişiliği, sağlık durumunu veya kimliği tespit ettiğini iddia etmez.
- Görünür ifadenin kararlı olduğundan emin olduğunda ekrandaki Türkçe eğlenceli mesajı ve uygun müzik parçasını seçer.
- **MVP ifadeleri:** `happy` (gülümseme), `brow_furrow` (kaş çatma / kızgın görünümlü), `surprised` (şaşkın ifade), `neutral` (belirgin mimik yok). `unknown` ve `no_face` ayrı sistem durumlarıdır, duygu etiketi değildir.
- Üzgün, korkmuş, hoşnutsuz gibi kategoriler yalnızca ayrıca doğrulanabilen ikinci sürümde değerlendirilir. Yanlış kesinlik iddiası kurulmaz.
- Müzik ve mesaj eşleştirmesi editlenebilir; şarkı olmayan kategori sistemi çökertmez.
- İlk sürümde giriş sistemi, sunucu, veritabanı, bulut AI servisi, fotoğraf kaydı ve yüz kimliklendirme **yoktur**.

## B. Teknoloji ve teknik ilkeler

| Amaç | Teknoloji / karar |
|---|---|
| Uygulama | Vite + React + TypeScript (strict) |
| Stil | Tailwind CSS; okunabilir, büyük ekran/kiosk odaklı responsive UI |
| Kamera | `navigator.mediaDevices.getUserMedia({video: ..., audio: false})`; izin kullanıcı düğmesinden sonra |
| Mimik analizi | `@mediapipe/tasks-vision` / Face Landmarker, `runningMode: 'VIDEO'`, `outputFaceBlendshapes: true`, `numFaces: 1` |
| Model dosyası | `public/models/` altında resmi uyumlu Face Landmarker modeli; modelin kaynağı/lisansı `README.md` içinde |
| Sınıflandırma | Yerel, deterministik TypeScript kuralları + skorlama + zamansal yumuşatma; ayarlanabilir eşikler |
| Müzik | Yerel, lisanslı ses dosyaları ve HTMLAudioElement/Web Audio API; `play()` reddi yakalanır |
| Test | Vitest + React Testing Library (birim); Playwright (UI ve izin/medya mock akışları); gerçek kamera ile manuel test |
| Ayarlar | JSON config ve seçili ayarlar için localStorage (görüntü/landmark saklanmaz) |
| Yayın | `localhost` veya HTTPS zorunlu; tek bilgisayar, mümkünse offline çalışabilir dağıtım |

**API notları:** `FaceLandmarker.detectForVideo(videoFrame, timestampMs)` zaman damgası alır; aynı kare gereksiz yere tekrar işlenmez. Çıktı `faceBlendshapes` skorlarıdır, doğrudan doğrulanmış “duygu olasılığı” değildir. Bu çağrı senkron çalışabildiğinden yavaş cihazlarda örnekleme hızını düşür veya uyumlu bir worker çözümünü araştır. Güncel API ve resmi örneğe bağlı kal.

Resmî referanslar:
- https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js
- https://developers.google.com/edge/api/mediapipe/js/tasks-vision.facelandmarker
- https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay

## C. Kullanıcı akışı ve ekranlar

1. **Karşılama:** Başlık, tek cümlelik açıklama, açık kamera/mahremiyet bilgilendirmesi, ses uyarısı, `Deneyimi Başlat`.
2. **Kamera:** Canlı video alanı; izin veya model yükleme durumu; isteğe bağlı yüz iskeleti overlay; `Durdur`.
3. **İfade kartı:** Kararlı tahmini mimik adı, ilgili emoji, Türkçe eğlenceli mesaj; belirsizlikte `Yüz ifadenizi anlamaya çalışıyorum`.
4. **Müzik oynatıcı:** Parça adı, oynat/duraklat, sonraki şarkı, ses kontrolü, sessize alma; bağlantı/medya hatalarını anlaşılır göster.
5. **Yönetim/ayarlar:** İfade → şarkı listesi ve mesaj dizisi, eşikler, analiz süresi, minimum değiştirme aralığı, efekt ve ses ayarları. İlk sürümde yerel dosya yolları ile çalışır; sunucuya yükleme işlevi vaat edilmez.
6. **Etkinlik/kiosk:** Tam ekran butonu (tarayıcı izin verdiğinde), uzaktan okunur metinler, yeni ziyaretçi oturumuna temiz geçiş; ekran dikey/yatay oranlarda bozulmaz.

İfade → tepki örnekleri:

| İfade | Mesaj | Müzik türü |
|---|---|---|
| `happy` | `Bu gülümsemeye bir oyun havası yakışır!` | Oyun havası / enerjik |
| `brow_furrow` | `Kızma biraz! Haydi neşemizi yükseltelim.` | Komik / neşeli |
| `surprised` | `Ooo, şaşkınlık seviyesi yükseldi!` | Eğlenceli sürpriz efekti |
| `neutral` | `Biraz enerji katalım mı?` | Hafif hareketli |
| `unknown` | `Biraz daha kameraya bakar mısın?` | Mevcut müziği koru veya sessiz |
| `no_face` | `Kameranın karşısına geç, müziğini bulalım!` | 5 saniye sonra ses kıs |

Not: Telifli eserleri proje ile paketleme; kullanılacak parçalar için gerekli lisans/çalma iznini ayrıca doğrula. Testlerde serbest kullanım hakkı bulunan kısa ses dosyaları veya sentetik test sesi kullan.

## D. Mimari ve önerilen proje yapısı

```text
moodplay-ai/
├── ROADMAP.md
├── README.md
├── public/
│   ├── models/                 # uyumlu Face Landmarker model varlığı
│   └── music/                  # lisanslı örnek müzikler; gerekirse placeholder
├── src/
│   ├── app/                    # App ve uygulama durum yönetimi
│   ├── components/
│   │   ├── WelcomeScreen.tsx
│   │   ├── CameraView.tsx
│   │   ├── FaceOverlay.tsx
│   │   ├── ExpressionCard.tsx
│   │   ├── MusicPlayer.tsx
│   │   └── SettingsPanel.tsx
│   ├── hooks/
│   │   ├── useCamera.ts
│   │   ├── useFaceLandmarker.ts
│   │   └── useAudioPlayer.ts
│   ├── services/
│   │   ├── landmarkerService.ts
│   │   ├── expressionClassifier.ts
│   │   ├── expressionStabilizer.ts
│   │   ├── musicEngine.ts
│   │   └── sessionManager.ts
│   ├── config/
│   │   ├── expressions.ts
│   │   ├── musicLibrary.ts
│   │   └── runtimeSettings.ts
│   ├── types/
│   │   └── index.ts
│   └── main.tsx
├── tests/
│   ├── unit/
│   └── e2e/
└── package.json
```

Gereksiz dosyalar oluşturma; klasör adları ihtiyaca göre düzenlenebilir. Tek amaç **modülerlik ve test edilebilirlik**tir. İfade tahmini, süre/kararlılık algoritması ve müzik kontrolü birbirinden bağımsız birimlerdir.

## E. İfade karar motoru — şartname

**1. Ölçüm:** Her işlenen karede `faceBlendshapes` ad/değer listesini normalize edilmiş sözlüğe çevir. Öncelikli işaretler: ağız köşelerinde gülümseme, kaşların aşağı/içe hareketi, gözlerin genişlemesi, çenenin açılması, dudakların şekli. Her kategori için birden çok ipucu kullan; tek skora körü körüne bağlanma.

**2. İlk kurallar:**
- `happy`: iki taraflı gülümseme göstergeleri baskınsa.
- `brow_furrow`: kaş çatma/aşağı çekme göstergeleri baskınsa; uygulama bunu yalnızca *kaş çatma ifadesi* olarak etiketler.
- `surprised`: göz genişlemesi ve/veya ağız açılması birlikte anlamlıysa; esneme gibi yanlış pozitiflere karşı kural ekle.
- `neutral`: belirgin işaret yoksa ve görüntü değerlendirme için yeterliyse.
- `unknown`: net ayrışma yoksa, kötü görüntü veya çelişkili işaretler varsa.
- `no_face`: yüz saptanmıyorsa.

**3. Kararlılık:**
- 2 saniyelik başlangıç gözlemi; sonraki değişim için en az 3 saniye tutarlı kanıt.
- Sınıflandırma titreşmesini azaltmak için hareketli ortalama/medyan, histerezis, rakip kategoriye göre minimum fark ve minimum örnek sayısı kullan.
- Varsayılan 15 saniyelik müzik değişim bekleme süresi; sürekli kaş/gülümseme geçişinde parçayı kesme.
- 5 saniye `no_face` sonrası sesi kıs ve karşılama/bekleme durumuna geç.
- Yeniden yüz algılanınca açık bir oturum geçiş stratejisi uygula; kimlik takibi yapma.
- Ayarlar tek dosyadan değiştirilebilir; zamanlar `Date.now()`/monotonic timestamp mantığıyla test edilebilir.

**4. Görünür metin:** Yüz ifadesi kategorilerini teşhis olarak sunma; örneğin `Kaşlarını çatmış gibisin` de, `Sen kızgınsın` deme. İçerikte “%92 mutlu” gibi kalibre edilmemiş olasılık rakamları gösterme. Geliştirici modunda ham blendshape değeri gösterilebilir; bu *duygu doğruluğu* değildir.

## F. Cursor görev sırası — TAM UYGULAMA KONTROL LİSTESİ

Her adımda: **kodla → çalıştır → doğrula → `ROADMAP.md` içindeki kutuyu işaretle → `CHANGELOG.md` içine kısa sonuç ve sorunları yaz → sıradaki adıma geç.** İlgili doğrulama başarısızsa işaretleme yapma.

### 0. Proje sözleşmesi ve çalışma ortamı
- [x] `ROADMAP.md` dosyasını oku, mevcut repo dosyalarını incele ve gerekiyorsa çatışmasız görev uyarlaması yap.
- [x] Node sürümünü ve bağımlılık sürümlerini belgeleyen `README.md` hazırla; paketlerin güncel belgelerini kontrol et.
- [x] TypeScript strict, ESLint, formatter, `dev/build/lint/test` betiklerini hazırla.
- [x] `npm install`, `npm run dev`, `npm run build`, `npm run lint` komutlarını başarıyla çalıştır.
- [x] `CHANGELOG.md` ve test notları için başlangıç oluştur.
**Kabul:** Boş ama çalışan React uygulaması; derleme ve lint temiz.

### 1. Ekranlar ve durum makinesi
- [x] Türkçe karşılama ekranı; gizlilik, kamera ve ses uyarısı; kullanıcı başlatması olmadan kamera/ses aktif değil.
- [x] Modern koyu tema, mor/mavi vurgu, büyük ekran için okunur responsive düzen.
- [x] `idle`, `requesting_permission`, `loading_model`, `analyzing`, `playing`, `no_face`, `error`, `stopped` durumlarını tanımla.
- [x] Kamera alanı, mimik kartı, müzik oynatıcı, ayarlar bölmesi tasarla; sahte analiz sonucu gerçekmiş gibi gösterme.
- [x] Klavye erişimi, focus görünürlüğü, yeterli kontrast, ekran okuyucu etiketlerini denetle.
**Kabul:** Temel ekranlarda kontrolsüz durum veya bozuk mobil/masaüstü layout yok.

### 2. Kamera güvenli başlatma/durdurma
- [x] `getUserMedia` ile yalnızca video iste; mikrofona erişim isteme.
- [x] İzin reddi, kamera bulunamaması, kamera başka uygulamada, HTTPS eksikliği, geç yanıt durumlarına açıklayıcı mesajlar.
- [x] Kamera önizlemesi ve isteğe bağlı cihaz seçimi (uygunsa) ekle; video yatay aynalanabilir, analiz koordinatlarıyla tutarlı ol.
- [x] Durdurunca tüm `MediaStreamTrack` öğelerini kapat; RAF/çalışan analizleri iptal et; sayfa terkinde kaynakları serbest bırak.
- [x] Kamera olmadan UI test edilebilsin; sahte kamera verisi yalnızca test ortamında.
**Kabul:** Başlat/durdur tekrarında kamera ışığı kapanıyor, hayalet akış kalmıyor, hata durumları kullanıcıya gösteriliyor.

### 3. Gerçek MediaPipe entegrasyonu
- [x] `@mediapipe/tasks-vision` kur ve uygun Face Landmarker modelini erişilebilir `public/models/` konumunda hazırla.
- [x] `runningMode: 'VIDEO'`, `numFaces: 1`, `outputFaceBlendshapes: true` yapılandır.
- [x] Model yükleme, hata, uygun WASM/GPU/CPU delegate seçimi ve geri dönüşleri uygula.
- [x] Yeni karelerde `detectForVideo(video, timestampMs)` çağır; aynı `video.currentTime` için tekrarlama; aynı anda çakışan döngü oluşturma.
- [x] Ham blendshape skorlarını yalnızca debug modunda görüntüle; birimlere tipli veri döndür.
- [x] Yüz yoksa `no_face`, çoklu yüz durumunda tek yüz modunun sınırlarını göster; gerekirse `Bir kişi kameraya yaklaşsın` uyarısı.
- [x] Frame süresi ve algılama hızını ölç; ana iş parçacığını zorlarsa işleme frekansını azalt veya uyumlu worker yaklaşımı kullan.
**Kabul:** Gerçek kamerada gülümseme/kaş/göz/ağız skorları değişiyor; hayali/sabit tahmin kullanılmıyor; durdurunca algılama sona eriyor.

### 4. İfade sınıflandırıcısı ve kararlılık motoru
- [x] `expressionClassifier.ts` dosyasında `happy`, `brow_furrow`, `surprised`, `neutral`, `unknown`, `no_face` tipleri ve karar mantığı.
- [x] Eşikler konfigürasyonda; sabit kod içine gömülü `if score > ...` dizisi yerine açıklanabilir test edilebilir mantık.
- [x] 2 sn ilk gözlem, 3 sn kararlı yeni ifade, 15 sn müzik geçiş cooldown, 5 sn yüz yok kuralı.
- [x] Hareketli pencere, histerezis ve belirsiz ifadede önceki kararlı sonucu koruma/unknown politikası.
- [x] Vitest ile örnek blendshape durumları, sıra dışı skorlar, sınır süreler, hızla değişen ifade ve yüzün kaybolma senaryoları.
- [x] Debug görünümünde kategori seçimine yol açan sinyalleri göster; bunları gerçek duygu kesinliği diye sunma.
**Kabul:** Bir mimik değişikliği nedeniyle müzik anında zıplamıyor; tüm süre kuralları testlerden geçiyor.

### 5. Müzik ve mesaj motoru
- [x] İfade → en az 3 özgün Türkçe mesaj + en az 1 örnek lisanslı müzik kaynağı eşleştirmesi tanımla; içerik yoksa güvenli fallback göster.
- [x] Birden fazla şarkı varsa sırayla veya tekrar etmeyen rastgele seç; tercih ayarlardan değişsin.
- [x] Kullanıcının `Deneyimi Başlat` tıklamasında ses yolunu tarayıcı autoplay politikasına uygun aç; `play()` Promise reddini yakala.
- [x] Oynat, duraklat, sonraki, ses seviyesi, sessize alma, görünür parça adı ve oynatma durumu.
- [x] İfade değişiminde örnek olarak 800–1500 ms fade-out/fade-in; durdurma ve `no_face` için yumuşak ses azaltma.
- [x] Sonraki parçaya iki kez aynı anda geçme, eski oynatıcıda ses kalması, missing file/codec error testleri.
- [x] Örnek içerik telif/lisans açıklamalarını `README.md` içine ekle.
**Kabul:** Gerçek sabit mimik → doğru mesaj + ilgili müzik; kısa süreli hareketler müziği bozmaz; kullanıcıdan ses açma müdahalesi gerekirse anlaşılır yönlendirme vardır.

### 6. Ayarlar / içerik yönetimi
- [x] Mesaj listelerini kategori bazında düzenlemeye imkân veren panel.
- [x] Uygulama içine paketli ses dosyalarının yolunu ve başlığını düzenleme; dosya seçme/yükleme gerekiyorsa ilk sürümün sınırlarını açık belirt.
- [x] İfade eşikleri, kararlılık süreleri, ses ve müzik değiştirme modunu panelden ayarla.
- [x] Uygun verileri localStorage'a kaydet; bozuk ayarlarda varsayılanları geri yükle; JSON import/export eklemek opsiyonel ama tercih edilir.
- [x] `Varsayılana dön`, `Test müziği çal` eylemleri ve yapılandırma doğrulaması.
**Kabul:** Kod değişmeden mesaj ve müzik eşleştirmeleri değiştirilebiliyor; sayfa yenilense de geçerli ayarlar korunuyor.

### 7. Festival/kiosk deneyimi ve hata dayanıklılığı
- [x] Tam ekran başlat/çık (FullScreen API izinlerini dikkate al), büyük tipografi, yüksek kontrast ve uzaktan okunabilir yönergeler.
- [x] `Yeni ziyaretçi` düğmesi: geçmiş ifadeleri/kararlılık penceresini sıfırla; önceki kişinin sonucunu gösterme.
- [x] Uzun süre kamera dışında kalınca bekleme ekranı; yeniden katılımda kararlı analiz yeniden başlasın.
- [x] Model yüklenememesi, ağ kopması, kaynak eksikliği, izin reddi, müzik açılamaması için kurtarma seçenekleri.
- [x] Sekme arka plana atıldığında gereksiz yoğun analiz yapma; ön plana dönünce bozuk durum yaratma.
- [x] Geliştirici/debug panelini normal kiosk ekranında gizle.
**Kabul:** Çok sayıda art arda ziyaretçi oturumunda uygulama yeniden başlatma gerektirmiyor.

### 8. Test, performans, dokümantasyon ve teslim
- [x] `npm run build`, `npm run lint`, `npm run test` temiz; varsa TypeScript `tsc --noEmit` temiz.
- [x] Playwright ile karşılama/izin reddi/hata/ayarlar/ses kontrolü gibi mock edilebilir akışları test et; gerçek kamera/mimik için ayrı manuel test tut.
- [ ] Gerçek cihazda aydınlık/loş ışık, gözlük, yandan yüz, arka arkaya ziyaretçi, düşük performans testlerini tabloyla raporla.
- [x] Ölçülebilir performans raporu: analiz FPS, ortalama kare işleme süresi, CPU durumu, müzik geçiş gecikmesi; eşikleri test cihazına göre gerekçelendir.
- [x] `README.md`: kurulum, Node sürümü, model kaynağı, müzik klasörü/lisansı, ayarlar, çalıştırma, build, dağıtım, kamera/HTTPS ve autoplay notları.
- [x] `CHANGELOG.md`: tamamlanan aşamalar, kalanlar ve bilinen sınırlamalar.
- [ ] Son kullanıcı kabul turu: başlat → yüz algıla → ifade kararlılığı → Türkçe mesaj → doğru müzik → ifade değişimi → fade → yüz ayrılması → yeniden ziyaretçi → durdur.
**Kabul:** Gerçek kamerada uçtan uca akış kanıtlandı; otomatik test edilenlerle manuel doğrulananlar açıkça ayrıldı. Tamamlanmayan görevler `[ ]` kalır.

## G. MVP bittikten SONRA değerlendirilecekler (otomatik zorunlu değil)
- [ ] Daha fazla ifade sınıfını veriyle doğrula; mevcut kurallar yetersizse ayrı bir eğitilmiş ifade sınıflandırıcısına geç.
- [ ] `Beni güldürebilir misin?` oyun modu / puan / süre sayacı.
- [ ] İsteğe bağlı, açık izinli anı fotoğrafı; varsayılan olarak kapalı ve otomatik saklama yok.
- [ ] Telifi uygun ses efektleri, animasyon ve Türkçe seslendirme.
- [ ] Çoklu dil desteği, kiosk için cihaz açılışında uygulamayı hazır tutma, offline paketleme.

## H. Cursor Agent çalışma kuralları

1. **Tek kaynak `ROADMAP.md`**. Her oturumda önce bu dosyayı ve `CHANGELOG.md` dosyasını oku; repodaki gerçek durumu kontrol et.
2. **Sırayla uygula:** Sıradaki ilk tamamlanmamış işe başla. Kullanıcının ayrıca her aşama için prompt yazması gerekmesin.
3. **Önce gerçek işlev:** Görsel olarak tamamlanmış ama sahte sonuç üreten ekranları bitmiş sayma; ölçümlerin gerçek kameradan geldiğini doğrula.
4. **Her aşamada test et:** İlgili komutları çalıştır, gerçek çıktıyı esas al, hata varsa düzelt. Test olmadan tik atma.
5. **Durum kaydı:** Her doğrulanan maddenin `[ ]` işaretini `[x]` yap. `CHANGELOG.md` içinde tarih, ne değişti, test komutu/sonuç, bilinen sorunlar yaz.
6. **Bağımlılık disiplini:** Doğru paket/API adlarını resmi dokümantasyondan kontrol et. Mevcut proje yapısını gereksiz yere bozma; sürüm değişikliklerini kaydet.
7. **Gizlilik:** Kamerayı açık rıza/etkileşim olmadan başlatma; yüz görüntüsü, landmark veya mimik zaman serisini sunucuya gönderme/kaydetme; analitik varsayılan kapalı.
8. **Duygu iddiası kurma:** `Kaş çatma` bir ipucudur, psikolojik teşhis değildir. Sahte yüzde başarı iddiası/kalibre edilmemiş güven yüzdesi üretme.
9. **Sonlandırma:** Her aşama sonunda kısa özeti çıkar; devam edebiliyorsa bir sonraki aşamaya geç. Ortam/izin/gerçek kamera erişimi yoksa bunu açıkça engel olarak kaydet, testleri taklit etme.
10. **Tamamlanma standardı:** Tüm 0–8 ana aşamaları geçmeden projenin bittiğini söyleme; G bölümündeki fikirler kapsam dışıdır.

## I. Cursor'a bir kez yapıştırılacak ANA PROMPT

```text
Bu repoda MoodPlay AI uygulamasını geliştir. Önce proje kökündeki ROADMAP.md dosyasını BAŞTAN SONA oku. Bu dosya tek ürün şartnamesi ve sıralı görev listesidir.

0–8 numaralı tüm aşamaları sırasıyla uygula; her görevi gerçek kodla gerçekleştir, ilgili build/lint/test kontrollerini çalıştır ve ancak başarılıysa ROADMAP.md içinde [x] olarak güncelle. Yaptığın değişiklikleri ve doğrulama sonuçlarını CHANGELOG.md dosyasına yaz. Bir aşamayı tamamlamadan sonraki aşamaya geçme. Ayrı ayrı prompt istemeden bir sonraki göreve devam et; çalışma sınırına ulaşırsan mevcut durumu dosyalarda koru ki sonraki Agent oturumu ilk eksik maddeden devam edebilsin.

MediaPipe Face Landmarker'ın gerçek kamera blendshape sonuçlarını kullan. Sahte mimik/duygu verisi üretme. Gerçek duyguyu bildiğini iddia etme. Kamera, ses, gizlilik, autoplay, model/medya hataları ve kaynak temizliğini ROADMAP.md'deki şartlara göre ele al. İçerik yönetimi ve kiosk modu dahil tüm MVP gereksinimlerini uygula.

Önce projeyi ve var olan dosyaları kontrol et; ardından ilk eksik checklist maddesinden işe başla. Bitirdiğinde tamamlanan işler, kullanılan test komutları, manuel yapılması gereken doğrulamalar ve varsa engelleri özetle.
```

---
**Teslimat ölçütü:** Kişi izin verip kameranın önüne geçtiğinde görünür ifadesi kararlı biçimde algılanır; örneğin gülümsediğinde oyun havası, kaşlarını çattığında neşeli/komik müzik çalar; Türkçe mesaj görünür; hızlı mimik dalgalanmaları şarkıyı sürekli değiştirmez; kullanıcı kamerayı durdurabilir; hiçbir yüz görüntüsü otomatik kaydedilmez.
