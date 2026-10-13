import type { ClassificationFrame, DetectionFrame, PerfSnapshot } from '../types/index.ts';
import type { StabilizerOutput } from '../services/expressionStabilizer.ts';
import { formatPerfReport } from '../services/perfStats.ts';

interface DebugPanelProps {
  classification: ClassificationFrame | null;
  output: StabilizerOutput | null;
  perf: PerfSnapshot | null;
  delegate: DetectionFrame['delegate'] | null;
}

export function DebugPanel({ classification, output, perf, delegate }: DebugPanelProps) {
  return (
    <aside className="rounded-3xl border border-dashed border-sky-400/40 bg-slate-950/80 p-4 text-sm text-slate-200" data-testid="debug-panel">
      <h2 className="text-base font-semibold text-sky-200">Geliştirici görünümü</h2>
      <p className="mt-2 text-slate-300">
        Ham blendshape değerleri duygu doğruluğu değildir. Yüzde veya teşhis gösterilmez.
      </p>
      <p className="mt-3">Delege: {delegate ?? 'bekleniyor'}</p>
      <p data-testid="perf-fps">Hız: {perf ? `${perf.fps.toFixed(1)} fps` : 'ölçülmedi'}</p>
      <p data-testid="perf-inference">
        İşleme: {perf ? `${perf.avgInferenceMs.toFixed(1)} ms` : 'ölçülmedi'}
      </p>
      {perf ? <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-400">{formatPerfReport(perf)}</pre> : null}
      {classification ? (
        <div className="mt-3 space-y-1">
          <p>Anlık ipucu: {classification.expression}</p>
          <p>Gerekçe: {classification.reason}</p>
          <p>
            Skorlar — gülümseme {classification.scores.happy.toFixed(2)}, kaş {classification.scores.browFurrow.toFixed(2)}, şaşkın{' '}
            {classification.scores.surprised.toFixed(2)}
          </p>
          <ul className="max-h-40 overflow-auto">
            {classification.signals.map((signal) => (
              <li key={signal.id}>
                {signal.label}: {signal.value.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3">Henüz kare işlenmedi.</p>
      )}
      {output ? (
        <p className="mt-3">
          Kararlı: {output.stableExpression ?? 'yok'} · müzik: {output.musicExpression ?? 'yok'} · bekleme{' '}
          {Math.round(output.debug.cooldownRemainingMs / 1000)} sn
        </p>
      ) : null}
    </aside>
  );
}
