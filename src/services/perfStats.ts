import type { PerfSnapshot } from '../types/index.ts';

export class PerfTracker {
  private samples: Array<{ t: number; ms: number }> = [];

  record(inferenceMs: number, now: number): PerfSnapshot {
    this.samples.push({ t: now, ms: inferenceMs });
    const cutoff = now - 2000;
    this.samples = this.samples.filter((sample) => sample.t >= cutoff);
    const average =
      this.samples.reduce((sum, sample) => sum + sample.ms, 0) / Math.max(1, this.samples.length);
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const span = first && last ? last.t - first.t : 0;
    const fps = this.samples.length <= 1 || span <= 0 ? 0 : ((this.samples.length - 1) * 1000) / span;
    return {
      inferences: this.samples.length,
      avgInferenceMs: average,
      lastInferenceMs: inferenceMs,
      fps,
    };
  }
}

export function formatPerfReport(snapshot: PerfSnapshot): string {
  return [
    `analiz örnekleri (son 2 sn): ${snapshot.inferences}`,
    `ortalama kare işleme: ${snapshot.avgInferenceMs.toFixed(1)} ms`,
    `son kare: ${snapshot.lastInferenceMs.toFixed(1)} ms`,
    `algılama hızı: ${snapshot.fps.toFixed(1)} fps`,
  ].join('\n');
}
