import { EXPRESSION_PRESENTATION, OBSERVING_MESSAGE } from '../config/expressions.ts';
import type { ExpressionId } from '../types/index.ts';

interface ExpressionCardProps {
  observing: boolean;
  expression: ExpressionId;
  message: string;
}

export function ExpressionCard({ observing, expression, message }: ExpressionCardProps) {
  const presentation = EXPRESSION_PRESENTATION[expression];
  const headline = observing ? OBSERVING_MESSAGE : message;
  const label = observing ? 'Gözleniyor' : presentation.label;
  const emoji = observing ? '👀' : presentation.emoji;

  return (
    <section
      aria-live="polite"
      className="rounded-3xl border border-white/10 bg-slate-900/80 p-6"
      data-testid="expression-card"
    >
      <p aria-hidden="true" className="text-6xl">
        {emoji}
      </p>
      <h2 className="mt-3 text-sm font-semibold tracking-[0.16em] text-sky-300 uppercase">{label}</h2>
      <p className="mt-3 text-3xl font-semibold text-balance text-white sm:text-5xl">{headline}</p>
      {expression === 'brow_furrow' && !observing ? (
        <p className="mt-4 text-sm text-slate-300">Kaş çatma bir görüntü ipucudur; duygusal teşhis değildir.</p>
      ) : null}
    </section>
  );
}
