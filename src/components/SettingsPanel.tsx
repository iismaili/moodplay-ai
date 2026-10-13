import { useEffect, useId, useRef, type ReactNode } from 'react';
import { EXPRESSION_PRESENTATION } from '../config/expressions.ts';
import { exportSettings, importSettingsJson } from '../config/runtimeSettings.ts';
import { EXPRESSION_IDS, MUSICAL_EXPRESSION_IDS, type MusicalExpression, type RuntimeSettings } from '../types/index.ts';

interface SettingsPanelProps {
  settings: RuntimeSettings;
  notice: string | null;
  onClose: () => void;
  onChange: (recipe: (current: RuntimeSettings) => RuntimeSettings) => void;
  onReplace: (settings: RuntimeSettings) => void;
  onReset: () => void;
  onNotice: (notice: string | null) => void;
  onPreview: (trackId: string, file: File) => void;
  onTestMusic: () => void;
}

export function SettingsPanel({
  settings,
  notice,
  onClose,
  onChange,
  onReplace,
  onReset,
  onNotice,
  onPreview,
  onTestMusic,
}: SettingsPanelProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-slate-950/75 p-4">
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-900 p-6 text-slate-100 shadow-2xl"
        data-testid="settings-panel"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold text-white" id={titleId}>
              Ayarlar
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Mesajlar ve müzik yolları bu cihazda saklanır. Yüz görüntüsü kaydedilmez. Dosya yükleme
              sunucuya gitmez; kalıcı parçalar için yolu elle yazın.
            </p>
          </div>
          <button
            className="min-h-11 rounded-full border border-white/15 px-4"
            onClick={onClose}
            ref={closeRef}
            type="button"
          >
            Kapat
          </button>
        </div>
        {notice ? (
          <p className="mt-4 rounded-2xl bg-sky-400/10 px-4 py-3 text-sky-100" role="status">
            {notice}
          </p>
        ) : null}

        <Section title="Mesajlar">
          {EXPRESSION_IDS.map((expression) => (
            <label className="flex flex-col gap-2 text-sm text-slate-300" key={expression}>
              {EXPRESSION_PRESENTATION[expression].label}
              <textarea
                className="min-h-24 rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-base text-white"
                data-testid={`messages-${expression}`}
                onChange={(event) => {
                  const lines = event.target.value.split('\n');
                  onChange((current) => ({
                    ...current,
                    messages: { ...current.messages, [expression]: lines },
                  }));
                }}
                value={settings.messages[expression].join('\n')}
              />
            </label>
          ))}
        </Section>

        <Section title="Müzikler">
          {settings.tracks.map((track) => (
            <div className="grid gap-3 rounded-2xl border border-white/10 p-3 md:grid-cols-2" key={track.id}>
              <label className="flex flex-col gap-1 text-sm text-slate-300">
                Başlık
                <input
                  className="min-h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-white"
                  onChange={(event) => updateTrack(onChange, track.id, { title: event.target.value })}
                  value={track.title}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-300">
                Dosya yolu
                <input
                  className="min-h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-white"
                  onChange={(event) => updateTrack(onChange, track.id, { src: event.target.value })}
                  value={track.src}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-300">
                İfade
                <select
                  className="min-h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-white"
                  onChange={(event) =>
                    updateTrack(onChange, track.id, { expression: event.target.value as MusicalExpression })
                  }
                  value={track.expression}
                >
                  {MUSICAL_EXPRESSION_IDS.map((expression) => (
                    <option key={expression} value={expression}>
                      {EXPRESSION_PRESENTATION[expression].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-300">
                Oturumluk dosya
                <input
                  accept="audio/*"
                  className="text-sm"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onPreview(track.id, file);
                  }}
                  type="file"
                />
              </label>
              <button
                className="min-h-11 rounded-full border border-white/15 px-4 md:col-span-2"
                onClick={() =>
                  onChange((current) => ({
                    ...current,
                    tracks: current.tracks.filter((item) => item.id !== track.id),
                  }))
                }
                type="button"
              >
                Parçayı listeden çıkar
              </button>
            </div>
          ))}
          <button
            className="min-h-11 rounded-full border border-white/15 px-4"
            onClick={() =>
              onChange((current) => ({
                ...current,
                tracks: [
                  ...current.tracks,
                  {
                    id: `custom-${Date.now()}`,
                    title: 'Yeni parça',
                    src: '/music/neutral-hafif.wav',
                    expression: 'neutral',
                    license: 'Yerel dosya yolu. Lisansı ayrıca doğrulayın.',
                  },
                ],
              }))
            }
            type="button"
          >
            Parça yolu ekle
          </button>
        </Section>

        <Section title="İfade eşikleri">
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Gülümseme eşiği" max={1} min={0} onChange={(value) => patchThreshold(onChange, 'happyMin', value)} step={0.01} value={settings.thresholds.happyMin} />
            <NumberField label="Kaş çatma eşiği" max={1} min={0} onChange={(value) => patchThreshold(onChange, 'browFurrowMin', value)} step={0.01} value={settings.thresholds.browFurrowMin} />
            <NumberField label="Şaşkınlık eşiği" max={1} min={0} onChange={(value) => patchThreshold(onChange, 'surprisedMin', value)} step={0.01} value={settings.thresholds.surprisedMin} />
            <NumberField label="Sakin tavan" max={1} min={0} onChange={(value) => patchThreshold(onChange, 'neutralMax', value)} step={0.01} value={settings.thresholds.neutralMax} />
            <NumberField label="Minimum fark" max={1} min={0} onChange={(value) => patchThreshold(onChange, 'minMargin', value)} step={0.01} value={settings.thresholds.minMargin} />
          </div>
        </Section>

        <Section title="Kararlılık ve ses">
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="İlk gözlem (ms)" max={10000} min={500} onChange={(value) => patchStabilizer(onChange, 'initialObservationMs', value)} step={100} value={settings.stabilizer.initialObservationMs} />
            <NumberField label="Yeni ifade kanıtı (ms)" max={20000} min={500} onChange={(value) => patchStabilizer(onChange, 'stableEvidenceMs', value)} step={100} value={settings.stabilizer.stableEvidenceMs} />
            <NumberField label="Müzik bekleme (ms)" max={120000} min={1000} onChange={(value) => patchStabilizer(onChange, 'musicCooldownMs', value)} step={500} value={settings.stabilizer.musicCooldownMs} />
            <NumberField label="Yüz yok susması (ms)" max={60000} min={1000} onChange={(value) => patchStabilizer(onChange, 'noFaceDuckMs', value)} step={500} value={settings.stabilizer.noFaceDuckMs} />
            <NumberField label="Geçiş solması (ms)" max={1500} min={800} onChange={(value) => onChange((current) => ({ ...current, fadeMs: value }))} step={50} value={settings.fadeMs} />
          </div>
          <label className="mt-3 flex flex-col gap-1 text-sm text-slate-300">
            Müzik seçimi
            <select
              className="min-h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-white"
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  musicSelection: event.target.value === 'shuffle' ? 'shuffle' : 'sequential',
                }))
              }
              value={settings.musicSelection}
            >
              <option value="sequential">Sırayla</option>
              <option value="shuffle">Tekrarsız rastgele</option>
            </select>
          </label>
          <div className="mt-3 flex flex-col gap-2 text-base">
            <Check label="Videoyu yatay aynala" checked={settings.mirrorVideo} onChange={(checked) => onChange((current) => ({ ...current, mirrorVideo: checked }))} />
            <Check label="Yüz iskeletini göster" checked={settings.showOverlay} onChange={(checked) => onChange((current) => ({ ...current, showOverlay: checked }))} />
            <Check label="Geliştirici panelini göster" checked={settings.showDebug} onChange={(checked) => onChange((current) => ({ ...current, showDebug: checked }))} />
          </div>
        </Section>

        <div className="mt-6 flex flex-wrap gap-3">
          <button className="min-h-11 rounded-full bg-white px-4 font-semibold text-slate-950" onClick={onTestMusic} type="button">
            Test müziği çal
          </button>
          <button className="min-h-11 rounded-full border border-white/15 px-4" onClick={onReset} type="button">
            Varsayılana dön
          </button>
          <button
            className="min-h-11 rounded-full border border-white/15 px-4"
            onClick={() => downloadSettings(settings)}
            type="button"
          >
            JSON dışa aktar
          </button>
          <label className="min-h-11 cursor-pointer rounded-full border border-white/15 px-4 py-2">
            JSON içe aktar
            <input
              accept="application/json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void file.text().then((raw) => {
                  const imported = importSettingsJson(raw);
                  if (!imported.ok) {
                    onNotice(imported.message);
                    return;
                  }
                  onReplace(imported.settings);
                  onNotice('Ayarlar içe aktarıldı.');
                });
              }}
              type="file"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-300">
      {label}
      <input
        className="min-h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-white"
        max={max}
        min={min}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3">
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      {label}
    </label>
  );
}

function updateTrack(
  onChange: (recipe: (current: RuntimeSettings) => RuntimeSettings) => void,
  id: string,
  patch: Partial<RuntimeSettings['tracks'][number]>,
) {
  onChange((current) => ({
    ...current,
    tracks: current.tracks.map((track) => (track.id === id ? { ...track, ...patch } : track)),
  }));
}

function patchThreshold(
  onChange: (recipe: (current: RuntimeSettings) => RuntimeSettings) => void,
  key: keyof RuntimeSettings['thresholds'],
  value: number,
) {
  onChange((current) => ({
    ...current,
    thresholds: { ...current.thresholds, [key]: value },
  }));
}

function patchStabilizer(
  onChange: (recipe: (current: RuntimeSettings) => RuntimeSettings) => void,
  key: keyof RuntimeSettings['stabilizer'],
  value: number,
) {
  onChange((current) => ({
    ...current,
    stabilizer: { ...current.stabilizer, [key]: value },
  }));
}

function downloadSettings(settings: RuntimeSettings) {
  const blob = new Blob([exportSettings(settings)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'moodplay-ayarlar.json';
  link.click();
  URL.revokeObjectURL(url);
}
