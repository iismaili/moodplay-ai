import { EXPRESSION_PRESENTATION, OBSERVING_MESSAGE } from '../config/expressions.ts';
import type { ExpressionId } from '../types/index.ts';

interface ExpressionCardProps {
  observing: boolean;
  expression: ExpressionId;
  message: string;
  captureStatus?: 'idle' | 'counting' | 'captured' | 'no_face';
  countdown?: number | null;
}

export function ExpressionCard({
  observing,
  expression,
  message,
  captureStatus = 'idle',
  countdown = null,
}: ExpressionCardProps) {
  const presentation = EXPRESSION_PRESENTATION[expression];

  let emoji = '👀';
  let label = 'Gözleniyor';
  let headline = message;

  if (captureStatus === 'idle') {
    emoji = '📸';
    label = 'ANALİZ BEKLENİYOR';
    headline = 'Butona basın, 5 saniye içinde kameraya ifadenizi gösterin!';
  } else if (captureStatus === 'counting') {
    emoji = '⏳';
    label = `GERİ SAYIM: ${countdown ?? 5}sn`;
    headline = 'İfadenizi kameraya gösterin...';
  } else if (captureStatus === 'no_face') {
    emoji = '👀';
    label = 'YÜZ BEKLENİYOR';
    headline = 'Kamerada yüz bulunamadı! Lütfen tam karşıya geçip butona tekrar basın.';
  } else if (captureStatus === 'captured') {
    emoji = presentation?.emoji ?? '✨';
    label = `${presentation?.label ?? 'İFADE'} (KİLİTLENDİ)`;
    headline = message || OBSERVING_MESSAGE;
  } else {
    emoji = observing ? '👀' : presentation.emoji;
    label = observing ? 'Gözleniyor' : presentation.label;
    headline = observing ? OBSERVING_MESSAGE : message;
  }

  return (
    <section
      aria-live="polite"
      className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl"
      data-testid="expression-card"
    >
      <div className="flex items-center justify-between">
        <p aria-hidden="true" className="text-6xl">
          {emoji}
        </p>
        {captureStatus === 'captured' ? (
          <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-semibold text-emerald-300">
            🔒 Müzik Sabitlendi
          </span>
        ) : captureStatus === 'counting' ? (
          <span className="rounded-full bg-amber-500/20 border border-amber-400/30 px-3 py-1 text-xs font-semibold text-amber-300 animate-pulse">
            ⏳ {countdown}s
          </span>
        ) : null}
      </div>
      <h2 className="mt-3 text-sm font-semibold tracking-[0.16em] text-sky-300 uppercase">{label}</h2>
      <p className="mt-3 text-3xl font-semibold text-balance text-white sm:text-4xl">{headline}</p>

      {captureStatus === 'captured' && expression === 'brow_furrow' ? (
        <p className="mt-4 text-sm text-slate-300">Kaş çatma bir görüntü ipucudur; duygusal teşhis değildir.</p>
      ) : null}

      {captureStatus === 'idle' ? (
        <p className="mt-4 text-sm text-slate-400">
          💡 İpucu: Kameraya dönüp aşağıdaki <strong>Duygumu Analiz Et</strong> butonuna tıklayın. 5 saniye içinde gülümseyebilir, kaşlarınızı çatabilir veya sakin durabilirsiniz.
        </p>
      ) : null}
    </section>
  );
}
