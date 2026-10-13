# Changelog

## 2026-10-13

MoodPlay AI MVP iskeleti ve 0–8 aşamalarının kodu eklendi. Kamera, MediaPipe Face Landmarker, ifade kararlılığı, sentetik müzik, ayarlar ve kiosk akışı birbirine bağlandı.

### Doğrulanan komutlar

- `npx tsc -b --pretty false` temiz
- `npx eslint .` temiz
- `npx vitest run` — 6 dosya, 39 test geçti
- `npx vite build` geçti
- `npx playwright test` — 4 test geçti
- Playwright `webServer` üzerinden `npm run dev` ayağa kalktı

### Otomatik sonuçlar

- Karşılama ekranı düğmeden önce `getUserMedia` çağırmaz. İzin reddi Türkçe banner gösterir. İstek `audio: false` olur.
- Ayarlardaki mutlu mesaj metni yenilemeden sonra localStorage'da durur. Debug paneli varsayılan olarak kapalıdır.
- Sahte kamera akışı gerçek Face Landmarker'a gider. Yüz bulunamayınca kart **Yüz görünmüyor** der; gülümseme veya yüzde göstermez.
- Yeni ziyaretçi sayacı 2'den 3'e çıkar. Tam ekran düğmesi ya tam ekrana geçer ya da tarayıcı reddini yazar. Durdurma karşılama ekranına döner.
- 1280×800 ve 390×844 görünümlerinde yatay taşma yok.
- Headless ölçüm: ortalama işleme 373.5 ms, algılama 11.2 fps. Bu pencere ilk model ısınmasını içerir.

### Bilinen sınırlar

- Bu bilgisayarda kamera aygıtı yok. Fiziksel kamera ışığı, aydınlık/loş ışık, gözlük, yandan yüz ve gerçek gülümseme→müzik turu yapılmadı. ROADMAP aşama 8'deki bu iki madde açık.
- Tek yüz modu `numFaces: 1` kullanır. İkinci kişiyi sayamaz; arayüz tek kişi sınırını yazar ve küçük yüzde yaklaşma ister.
- Üzgün, korku ve hoşnutsuzluk sınıfları yok.
- Geliştirme sunucusu, `@mediapipe/tasks-vision` paketindeki eksik source map için bir uyarı basar. Çalışmayı durdurmaz.
- Oturumluk dosya seçimi sayfa yenilenince kaybolur. Kalıcı parça için `public/music` yolu yazılır.
