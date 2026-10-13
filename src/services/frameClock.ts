export function shouldProcessVideoFrame(currentTime: number, lastTime: number): boolean {
  if (!Number.isFinite(currentTime) || currentTime < 0) return false;
  if (lastTime >= 0 && currentTime === lastTime) return false;
  return true;
}

export function monotonicTimestamp(nowMs: number, lastTimestamp: number): number {
  const now = Number.isFinite(nowMs) ? nowMs : 0;
  if (lastTimestamp < 0) return Math.max(0, now);
  return Math.max(now, lastTimestamp + 1);
}

const MIN_SAMPLE_INTERVAL_MS = 66;
const MAX_SAMPLE_INTERVAL_MS = 250;

export function adaptSampleInterval(currentMs: number, inferenceMs: number): number {
  if (!Number.isFinite(inferenceMs)) return clampInterval(currentMs);
  if (inferenceMs > 45) return clampInterval(currentMs + 25);
  if (inferenceMs < 18) return clampInterval(currentMs - 8);
  return clampInterval(currentMs);
}

function clampInterval(value: number): number {
  if (!Number.isFinite(value)) return 100;
  if (value < MIN_SAMPLE_INTERVAL_MS) return MIN_SAMPLE_INTERVAL_MS;
  if (value > MAX_SAMPLE_INTERVAL_MS) return MAX_SAMPLE_INTERVAL_MS;
  return value;
}
