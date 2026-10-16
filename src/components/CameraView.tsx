import type { RefObject } from 'react';
import type { ExpressionId, FacePoint } from '../types/index.ts';
import { FaceOverlay } from './FaceOverlay.tsx';

interface CameraViewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  mirror: boolean;
  showOverlay: boolean;
  landmarks: readonly FacePoint[];
  statusText: string;
  devices: readonly MediaDeviceInfo[];
  deviceId: string;
  closerHint: boolean;
  onDeviceChange: (deviceId: string) => void;
  onStop: () => void;
  // 5 saniyelik geri sayım ve anlık yakalama özellikleri
  countdown: number | null;
  isCountingDown: boolean;
  flashActive: boolean;
  captureStatus: 'idle' | 'counting' | 'captured' | 'no_face';
  capturedExpression: ExpressionId | null;
  onStartCountdown: () => void;
}

export function CameraView({
  videoRef,
  mirror,
  showOverlay,
  landmarks,
  statusText,
  devices,
  deviceId,
  closerHint,
  onDeviceChange,
  onStop,
  countdown,
  isCountingDown,
  flashActive,
  captureStatus,
  capturedExpression,
  onStartCountdown,
}: CameraViewProps) {
  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label="Kamera">
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-black shadow-2xl shadow-black/40 sm:aspect-video">
        <div className={mirror ? 'absolute inset-0 scale-x-[-1]' : 'absolute inset-0'} data-mirrored={mirror ? 'true' : 'false'}>
          <video
            autoPlay
            className="h-full w-full object-cover"
            data-testid="camera-video"
            muted
            playsInline
            ref={videoRef}
            aria-label="Canlı kamera önizlemesi"
          />
          <FaceOverlay landmarks={landmarks} visible={showOverlay} />
        </div>

        {/* 5 Saniyelik Geri Sayım Görsel Katmanı */}
        {countdown !== null ? (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs transition-all"
            data-testid="countdown-overlay"
          >
            <div className="relative flex h-36 w-36 sm:h-44 sm:w-44 items-center justify-center rounded-full border-4 border-sky-400 bg-slate-900/90 shadow-[0_0_50px_rgba(56,189,248,0.5)]">
              <span className="text-7xl sm:text-8xl font-black text-white animate-pulse">
                {countdown}
              </span>
            </div>
            <p className="mt-4 rounded-full bg-slate-900/90 border border-white/20 px-5 py-2 text-base sm:text-lg font-semibold text-sky-200 shadow-lg text-center">
              📸 Kameraya ifadenizi gösterin!
            </p>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 text-center font-medium">
              😄 Gülümseyin | 😠 Kaş Çatın | 😲 Şaşırın | 😔 Üzülün | 😐 Sakin
            </p>
          </div>
        ) : null}

        {/* Fotoğraf Çekim Flaşı */}
        {flashActive ? (
          <div
            className="absolute inset-0 z-30 bg-white opacity-95 transition-opacity duration-300 pointer-events-none"
            data-testid="camera-flash"
          />
        ) : null}

        <p
          className="absolute top-3 left-3 rounded-full bg-slate-950/80 px-3 py-1 text-sm text-slate-100"
          data-testid="model-status"
        >
          {statusText}
        </p>
        <p className="absolute right-3 bottom-3 rounded-full bg-slate-950/80 px-3 py-1 text-sm text-slate-100">
          Tek kişi izlenir
        </p>
      </div>

      {closerHint ? (
        <p className="rounded-2xl bg-amber-300/15 px-4 py-3 text-lg text-amber-100" role="status">
          Bir kişi kameraya yaklaşsın
        </p>
      ) : null}

      {/* Ana Tetikleyici Buton (5sn Geri Sayım) */}
      <div className="flex flex-col gap-2">
        <button
          className={`min-h-14 w-full rounded-2xl px-6 py-3.5 text-lg font-bold text-white shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer ${
            isCountingDown
              ? 'bg-amber-600/90 cursor-wait'
              : capturedExpression
                ? 'bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-600 hover:opacity-95 shadow-teal-950/40 active:scale-[0.99]'
                : 'bg-gradient-to-r from-violet-600 via-sky-500 to-emerald-500 hover:opacity-95 shadow-sky-950/40 active:scale-[0.99]'
          }`}
          data-testid="countdown-trigger-button"
          disabled={isCountingDown}
          onClick={onStartCountdown}
          type="button"
        >
          {isCountingDown ? (
            <>
              <span className="inline-block animate-spin text-2xl">⏳</span>
              <span>İfade Yakalanıyor: {countdown} sn...</span>
            </>
          ) : capturedExpression ? (
            <>
              <span className="text-2xl">🔄</span>
              <span>Yeniden İfadeni Yakala (5sn Geri Sayım)</span>
            </>
          ) : (
            <>
              <span className="text-2xl">📸</span>
              <span>Duygumu Analiz Et (5sn Geri Sayım)</span>
            </>
          )}
        </button>

        {captureStatus === 'no_face' ? (
          <div
            className="rounded-2xl border border-rose-400/30 bg-rose-500/20 px-4 py-3 text-sm sm:text-base text-rose-100 flex items-center justify-between gap-3"
            role="alert"
          >
            <span>⚠️ Geri sayım bittiğinde yüz algılanamadı! Lütfen tam kameranın karşısına geçip butona tekrar basın.</span>
            <button
              className="shrink-0 font-bold underline hover:text-white"
              onClick={onStartCountdown}
              type="button"
            >
              Tekrar Dene
            </button>
          </div>
        ) : null}

        {captureStatus === 'captured' ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs sm:text-sm text-emerald-200 flex items-center justify-between">
            <span>🔒 İfade kilitlendi (Anlık değişim kapalı, müzik sabit çalıyor)</span>
            <span className="opacity-80">Yeni duygu için butona basabilirsiniz 👆</span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {devices.length > 0 ? (
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm text-slate-300">
            Kamera
            <select
              className="min-h-12 rounded-xl border border-white/10 bg-slate-900 px-3 text-base text-white"
              onChange={(event) => onDeviceChange(event.target.value)}
              value={deviceId}
            >
              <option value="">Varsayılan kamera</option>
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || 'Kamera'}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          className="min-h-12 rounded-full border border-white/15 px-5 text-base font-medium text-white"
          data-testid="stop-button"
          onClick={onStop}
          type="button"
        >
          Durdur
        </button>
      </div>
    </section>
  );
}
