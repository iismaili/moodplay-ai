import type { RefObject } from 'react';
import type { FacePoint } from '../types/index.ts';
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
