import type { AppPhase, PhaseInput } from '../types/index.ts';

export function resolvePhase(input: PhaseInput): AppPhase {
  if (input.lifecycle === 'stopped') return 'stopped';
  if (input.lifecycle === 'idle') return 'idle';
  if (input.cameraError || input.modelError) return 'error';
  if (input.permissionPending) return 'requesting_permission';
  if (!input.modelReady) return 'loading_model';
  if (input.duckAudio) return 'no_face';
  if (input.musicActive) return 'playing';
  return 'analyzing';
}

export const PHASE_LABEL: Record<AppPhase, string> = {
  idle: 'Hazır',
  requesting_permission: 'Kamera izni bekleniyor',
  loading_model: 'Yüz modeli yükleniyor',
  analyzing: 'İfade gözleniyor',
  playing: 'Müzik açık',
  no_face: 'Yüz bekleniyor',
  error: 'Bir sorun var',
  stopped: 'Durduruldu',
};
