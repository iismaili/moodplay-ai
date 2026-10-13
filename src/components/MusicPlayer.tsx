interface MusicPlayerProps {
  title: string;
  playing: boolean;
  error: string | null;
  volume: number;
  muted: boolean;
  canControl: boolean;
  onToggle: () => void;
  onNext: () => void;
  onVolume: (volume: number) => void;
  onMuted: (muted: boolean) => void;
}

export function MusicPlayer({
  title,
  playing,
  error,
  volume,
  muted,
  canControl,
  onToggle,
  onNext,
  onVolume,
  onMuted,
}: MusicPlayerProps) {
  return (
    <section aria-label="Müzik oynatıcı" className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
      <p className="text-sm font-semibold tracking-[0.16em] text-violet-300 uppercase">Şimdi</p>
      <h2 className="mt-2 text-2xl font-semibold text-white" data-testid="music-title">
        {title}
      </h2>
      {error ? (
        <p className="mt-3 text-base text-amber-200" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="min-h-12 rounded-full bg-white px-5 font-semibold text-slate-950 disabled:opacity-40"
          data-testid="music-play"
          disabled={!canControl && !playing}
          onClick={onToggle}
          type="button"
        >
          {playing ? 'Duraklat' : 'Oynat'}
        </button>
        <button
          className="min-h-12 rounded-full border border-white/15 px-5 text-white disabled:opacity-40"
          data-testid="music-next"
          disabled={!canControl}
          onClick={onNext}
          type="button"
        >
          Sonraki parça
        </button>
        <button
          aria-pressed={muted}
          className="min-h-12 rounded-full border border-white/15 px-5 text-white"
          onClick={() => onMuted(!muted)}
          type="button"
        >
          {muted ? 'Sesi aç' : 'Sesi kapat'}
        </button>
      </div>
      <label className="mt-5 flex flex-col gap-2 text-sm text-slate-300">
        Ses seviyesi
        <input
          aria-label="Ses seviyesi"
          className="accent-sky-400"
          max={1}
          min={0}
          onChange={(event) => onVolume(Number(event.target.value))}
          step={0.01}
          type="range"
          value={volume}
        />
      </label>
    </section>
  );
}
