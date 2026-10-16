# MoodPlay AI

Canlı kameradaki görünür yüz ipuçlarına göre Türkçe mesaj gösteren ve kısa bir müzik seçen kiosk uygulaması. Gerçek duygu, kişilik veya kimlik tespiti yapmaz. Görüntü, landmark ve mimik zaman serisi kaydedilmez.

## Gereksinimler

Bu ortamda doğrulanan sürümler:

- Node.js 24.16.0 (`engines` alanı `>=20`)
- npm 11.13.0

Başlıca paketler `package.json` içindedir: Vite 7, React 19, TypeScript 5.9 (strict), Tailwind CSS 4, Vitest 5, Playwright 1.64, `@mediapipe/tasks-vision` 1.1.0.

## Kurulum

```bash
npm install
npm run setup:assets
npm run music:generate
```

`public/models/face_landmarker.task` ve `public/wasm/` bu depoda hazırdır. Model kaybolursa resmi float16 paketini yeniden indirin:

`https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`

WASM dosyaları `@mediapipe/tasks-vision` paketinden `npm run setup:assets` ile `public/wasm` altına kopyalanır. İkisi de Apache-2.0 lisanslıdır.

## Çalıştırma

```bash
npm run dev
```

Uygulama `http://localhost:5173` adresinde açılır. Kamera yalnızca `localhost` veya HTTPS üzerinde çalışır. **Deneyimi Başlat** düğmesine basılmadan `getUserMedia` çağrılmaz; istek yalnızca video içerir.

Tarayıcı otomatik sesi engellerse müzik kartındaki **Oynat** düğmesi kullanılır. Düğme, kullanıcı etkileşimi sırasında sessiz bir tampon çalarak sonraki `play()` çağrılarına zemin hazırlar. `play()` reddi ekranda Türkçe açıklanır.

```bash
npm run build
npm run preview
```

`dist/` tek bilgisayarda statik olarak servis edilebilir. Kamera için sayfa yine localhost veya HTTPS olmalıdır. Model ve WASM `public/` altından pakete girer; ilk açılıştan sonra bu dosyalar yerelde kalır.

## Müzik ve Ses Geçişleri

`public/music/` altındaki parçalar duygulara göre dinamik olarak çalınır:
- **Mutlu / Gülümseme**: Erik Dalı (`/music/erikdali.mp3`)
- **Sinirli / Kaş Çatma**: Cendere (`/music/cendere.mp3`)
- **Tiksinti**: Ajdar - Nane Nane (`/music/ajdarnane.mp3`)
- **Üzgün**: Üzgün (`/music/uzgun.mp3`)
- **Sakin / Nötr**: Sakin (`/music/sakin.mp3`)
- **Şaşkın**: Erik Dalı (`/music/erikdali.mp3`)

Duygu değiştiğinde çalan parça aniden kesilmez veya yeni parçayla üst üste binmez (overlap önlenir). Mevcut parça kısa bir fade-out ile kısılıp tamamen durdurulur ve yeni parça kısa bir fade-in ile 0'dan hedef seviyeye yükseltilerek başlatılır.

## Anonim Kampüs Duygu Haritası

Uygulama, tespit edilen duyguların (mutlu, üzgün, sinirli, tiksinti, şaşkın, sakin) toplam dağılımını yerel sayaç state'i ile tutar ve modern bir istatistik panelinde sunar (Örn: *Bugün %60 Mutlu, %20 Üzgün*). Sayfa yenilendiğinde verilerin kaybolmaması için sayaçlar anonim olarak `localStorage` üzerinde saklanır.

## Test

```bash
npm run lint
npm run test
npm run test:e2e
npx tsc -b --pretty false
```

Playwright, izin reddi için `getUserMedia` sahteciliği kullanır. Yüzsüz video akışı yalnızca `--use-fake-device-for-media-stream` ile e2e içindedir; uygulama bu kareleri gerçek Face Landmarker'a verir ve yüz yoksa gülümseme uydurmaz.

## Manuel doğrulama

Bu geliştirme bilgisayarında kamera aygıtı bulunamadı. Aşağıdaki satırlar bu yüzden boştur.

| Senaryo | Sonuç |
| --- | --- |
| Aydınlık oda, gerçek yüz | Yapılmadı |
| Loş ışık | Yapılmadı |
| Gözlük | Yapılmadı |
| Yandan yüz | Yapılmadı |
| Art arda ziyaretçi, gerçek kişi | Yapılmadı. Sayaç ve sıfırlama sahte kamerayla otomatik test edildi |
| Düşük performanslı fiziksel cihaz | Yapılmadı |

Headless Chromium ve yüzsüz sahte kamerada ölçülen değerler (2026-10-13): ortalama kare işleme **373.5 ms**, algılama hızı **11.2 fps**. Ortalama, ilk WASM/GPU ısınmasını da içerir. Yavaş karelerden sonra örnek aralığı 66–250 ms bandında ayarlanır. İşletim sistemi CPU yüzdesi ölçülmedi. Müzik geçişi kasıtlı olarak 800–1500 ms solma kullanır; varsayılan 1100 ms.

Gerçek yüzde gülümseme, kaş ve şaşkın ifade skorlarının değiştiği tur henüz yapılmadı.
