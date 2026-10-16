import type { CampusMoodStats } from '../services/campusMoodStorage.ts';

interface CampusMoodDashboardProps {
  stats: CampusMoodStats;
  onReset?: () => void;
  compact?: boolean;
}

export function CampusMoodDashboard({ stats, onReset, compact = false }: CampusMoodDashboardProps) {
  const { total, ranked, summaryText } = stats;

  return (
    <section
      aria-label="Anonim Kampüs Duygu Haritası"
      className="rounded-3xl border border-white/10 bg-slate-900/85 p-5 text-slate-100 shadow-2xl backdrop-blur-md"
      data-testid="campus-mood-dashboard"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <p className="text-xs font-semibold tracking-wider text-sky-300 uppercase">
            Anonim Kampüs Duygu Haritası
          </p>
        </div>
        {onReset && total > 0 ? (
          <button
            className="text-xs font-medium text-slate-400 transition-colors hover:text-rose-300"
            data-testid="campus-mood-reset"
            onClick={onReset}
            title="Sayaçları sıfırla"
            type="button"
          >
            Sıfırla
          </button>
        ) : null}
      </div>

      <div className="mt-2.5">
        <h3
          className="text-lg font-semibold tracking-tight text-white md:text-xl"
          data-testid="campus-mood-summary"
        >
          {summaryText}
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          {total > 0
            ? `Kampüste bugün toplam ${total} anonim yüz ifadesi kaydedildi.`
            : 'Henüz mimik kaydedilmedi. Kameraya bakın ve ifadenizi sergileyin!'}
        </p>
      </div>

      <div className={`mt-4 grid gap-2.5 ${compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {ranked.map(({ mood, count, percentage, meta }) => {
          const hasCount = count > 0;
          return (
            <div
              className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-950/60 p-3 transition-all hover:border-white/15"
              data-testid={`mood-stat-${mood}`}
              key={mood}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-slate-200">
                  <span aria-hidden="true" className="text-base">
                    {meta.emoji}
                  </span>
                  <span>{meta.label}</span>
                </span>
                <span className="flex items-baseline gap-1 font-mono">
                  <strong className={`text-base font-bold ${hasCount ? 'text-white' : 'text-slate-500'}`}>
                    %{percentage}
                  </strong>
                  <span className="text-xs text-slate-400">({count})</span>
                </span>
              </div>

              {/* Progress bar container */}
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800/80">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${meta.gradient} transition-all duration-500 ease-out`}
                  style={{
                    width: `${total > 0 ? Math.max(percentage, count > 0 ? 4 : 0) : 0}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 text-[11px] text-slate-400">
        <span>🔒 Yüz veya kimlik kaydedilmez, veriler yerel sayaçta anonim tutulur.</span>
        <span className="font-medium text-slate-300">MoodPlay AI Kampüs Kiosk</span>
      </div>
    </section>
  );
}
