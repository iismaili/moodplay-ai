export type CameraErrorCode =
  | 'insecure'
  | 'denied'
  | 'not_found'
  | 'in_use'
  | 'timeout'
  | 'overconstrained'
  | 'unknown';

const MESSAGES: Record<CameraErrorCode, string> = {
  insecure: 'Kamera için sayfanın localhost veya HTTPS üzerinde açılması gerekir.',
  denied: 'Kamera izni verilmedi. Tarayıcı ayarlarından izin verip yeniden deneyin.',
  not_found: 'Bu cihazda kullanılabilir bir kamera bulunamadı.',
  in_use: 'Kamera başka bir uygulama tarafından kullanılıyor olabilir. Diğer uygulamayı kapatıp yeniden deneyin.',
  timeout: 'Kamera yanıt vermedi. Bağlantıyı kontrol edip yeniden deneyin.',
  overconstrained: 'İstenen kamera ayarı bu cihazda desteklenmiyor. Farklı bir kamera deneyin.',
  unknown: 'Kamera başlatılamadı. Yeniden deneyin.',
};

export function cameraErrorCode(error: unknown): CameraErrorCode {
  const name = errorName(error);
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return 'denied';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'not_found';
  if (name === 'NotReadableError' || name === 'TrackStartError') return 'in_use';
  if (name === 'AbortError' || name === 'TimeoutError') return 'timeout';
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') return 'overconstrained';
  if (name === 'SecurityError' || name === 'TypeError') return 'insecure';
  return 'unknown';
}

export function describeCameraError(error: unknown): { code: CameraErrorCode; message: string } {
  const code = cameraErrorCode(error);
  return { code, message: MESSAGES[code] };
}

export function buildVideoConstraints(deviceId?: string): MediaStreamConstraints {
  const video: MediaTrackConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };
  if (deviceId) video.deviceId = { exact: deviceId };
  else video.facingMode = 'user';
  return { audio: false, video };
}

export async function requestVideoStream(
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>,
  constraints: MediaStreamConstraints,
  timeoutMs = 12000,
): Promise<MediaStream> {
  let unresolved = true;
  const pending = getUserMedia(constraints);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(Object.assign(new Error('Kamera zaman aşımı'), { name: 'TimeoutError' }));
    }, timeoutMs);
  });

  try {
    const stream = await Promise.race([pending, timeout]);
    unresolved = false;
    return stream;
  } catch (error) {
    void pending
      .then((stream) => {
        if (unresolved) stream.getTracks().forEach((track) => track.stop());
      })
      .catch(() => undefined);
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function errorName(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'name' in error) {
    const name = error.name;
    if (typeof name === 'string') return name;
  }
  return '';
}
