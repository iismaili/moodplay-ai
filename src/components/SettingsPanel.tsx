import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { EXPRESSION_PRESENTATION } from '../config/expressions.ts';
import { exportSettings, importSettingsJson } from '../config/runtimeSettings.ts';
import { deleteAudioFile } from '../services/audioStorage.ts';
import {
  EXPRESSION_IDS,
  MUSICAL_EXPRESSION_IDS,
  type MusicTrack,
  type MusicalExpression,
  type RuntimeSettings,
} from '../types/index.ts';

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
  const [newTrackEmotion, setNewTrackEmotion] = useState<MusicalExpression>('happy');
  const [manualTitle, setManualTitle] = useState('');
  const [manualSrc, setManualSrc] = useState('');

  const removeTrack = (trackId: string) => {
    void deleteAudioFile(trackId);
    onChange((current) => ({
      ...current,
      tracks: current.tracks.filter((item) => item.id !== trackId),
    }));
  };

  const handleAddFileForEmotion = (file: File, targetEmotion: MusicalExpression) => {
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').trim() || 'Yeni Ses';
    const newId = `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newTrack: MusicTrack = {
      id: newId,
      title: cleanTitle,
      src: `/user-audio/${file.name}`,
      expression: targetEmotion,
      license: 'Kullanıcı sesi',
    };
    onChange((current) => ({
      ...current,
      tracks: [...current.tracks, newTrack],
    }));
    onPreview(newId, file);
    onNotice(`"${file.name}" ${EXPRESSION_PRESENTATION[targetEmotion].label} için eklendi.`);
  };

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
          <div className="rounded-2xl border border-sky-400/20 bg-sky-950/20 p-4">
            <h3 className="text-base font-semibold text-sky-200">Duyguya Göre Yeni Ses / Müzik Ekle</h3>
            <p className="mt-1 text-sm text-slate-300">
              Bir duygu seçin ve o duygu belirdiğinde rastgele çalması için bilgisayarınızdan ses dosyası ekleyin veya yol yazın.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-slate-300">
                Hedef Duygu
                <select
                  className="min-h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-white"
                  onChange={(e) => setNewTrackEmotion(e.target.value as MusicalExpression)}
                  value={newTrackEmotion}
                >
                  {MUSICAL_EXPRESSION_IDS.map((exp) => (
                    <option key={exp} value={exp}>
                      {EXPRESSION_PRESENTATION[exp].emoji} {EXPRESSION_PRESENTATION[exp].label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col gap-1 text-sm text-slate-300">
                Ses Dosyası Yükle
                <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-sky-400/40 bg-sky-500/10 px-4 text-center text-sm font-medium text-sky-200 hover:bg-sky-500/20 transition-colors">
                  <span>Bilgisayardan Dosya Seç (.mp3, .wav)</span>
                  <input
                    accept="audio/*"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        handleAddFileForEmotion(file, newTrackEmotion);
                        event.target.value = '';
                      }
                    }}
                    type="file"
                  />
                </label>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-3 pt-3 border-t border-white/5">
              <label className="flex-1 min-w-[140px] flex flex-col gap-1 text-xs text-slate-400">
                Alternatif: Parça Başlığı
                <input
                  className="min-h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white"
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="Örn: Yeni Parça"
                  value={manualTitle}
                />
              </label>
              <label className="flex-1 min-w-[180px] flex flex-col gap-1 text-xs text-slate-400">
                Dosya Yolu
                <input
                  className="min-h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white"
                  onChange={(e) => setManualSrc(e.target.value)}
                  placeholder="Örn: /music/parca.mp3"
                  value={manualSrc}
                />
              </label>
              <button
                className="min-h-10 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-medium text-white hover:bg-white/20"
                onClick={() => {
                  if (!manualSrc.trim()) return;
                  const newId = `custom-${Date.now()}`;
                  const title = manualTitle.trim() || 'Yeni Parça';
                  onChange((current) => ({
                    ...current,
                    tracks: [
                      ...current.tracks,
                      {
                        id: newId,
                        title,
                        src: manualSrc.trim(),
                        expression: newTrackEmotion,
                        license: 'Özel parça',
                      },
                    ],
                  }));
                  setManualTitle('');
                  setManualSrc('');
                  onNotice(`"${title}" ${EXPRESSION_PRESENTATION[newTrackEmotion].label} için eklendi.`);
                }}
                type="button"
              >
                Yolu Ekle
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {MUSICAL_EXPRESSION_IDS.map((expression) => {
              const emotionTracks = settings.tracks.filter((t) => t.expression === expression);
              return (
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4" key={expression}>
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{EXPRESSION_PRESENTATION[expression].emoji}</span>
                      <h4 className="font-semibold text-white">{EXPRESSION_PRESENTATION[expression].label}</h4>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">
                        {emotionTracks.length} parça {emotionTracks.length > 1 ? '(rastgele seçilir)' : ''}
                      </span>
                    </div>
                    <label className="cursor-pointer rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200 hover:bg-sky-500/20">
                      + Dosya Ekle
                      <input
                        accept="audio/*"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            handleAddFileForEmotion(file, expression);
                            event.target.value = '';
                          }
                        }}
                        type="file"
                      />
                    </label>
                  </div>
                  <div className="mt-3 grid gap-3">
                    {emotionTracks.map((track) => (
                      <div className="grid gap-3 rounded-xl border border-white/10 bg-slate-900/90 p-3 sm:grid-cols-2 lg:grid-cols-3" key={track.id}>
                        <label className="flex flex-col gap-1 text-xs text-slate-300">
                          Başlık
                          <input
                            className="min-h-10 rounded-lg border border-white/10 bg-slate-950 px-2.5 text-sm text-white"
                            onChange={(event) => updateTrack(onChange, track.id, { title: event.target.value })}
                            value={track.title}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-slate-300">
                          Dosya Yolu
                          <input
                            className="min-h-10 rounded-lg border border-white/10 bg-slate-950 px-2.5 text-sm text-white"
                            onChange={(event) => updateTrack(onChange, track.id, { src: event.target.value })}
                            value={track.src}
                          />
                        </label>
                        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
                          <label className="flex-1 cursor-pointer min-h-10 flex items-center justify-center rounded-lg border border-white/15 px-2 text-xs text-slate-300 hover:bg-white/5">
                            Dosyayı Değiştir
                            <input
                              accept="audio/*"
                              className="sr-only"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) onPreview(track.id, file);
                              }}
                              type="file"
                            />
                          </label>
                          <button
                            className="min-h-10 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 text-xs text-rose-300 hover:bg-rose-500/20"
                            onClick={() => removeTrack(track.id)}
                            type="button"
                          >
                            Kaldır
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="İfade eşikleri">
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Gülümseme eşiği" max={1} min={0} onChange={(value) => patchThreshold(onChange, 'happyMin', value)} step={0.01} value={settings.thresholds.happyMin} />
            <NumberField label="Sinirli ifade eşiği" max={1} min={0} onChange={(value) => patchThreshold(onChange, 'browFurrowMin', value)} step={0.01} value={settings.thresholds.browFurrowMin} />
            <NumberField label="Tiksinti eşiği" max={1} min={0} onChange={(value) => patchThreshold(onChange, 'disgustMin', value)} step={0.01} value={settings.thresholds.disgustMin} />
            <NumberField label="Üzgün ifade eşiği" max={1} min={0} onChange={(value) => patchThreshold(onChange, 'sadMin', value)} step={0.01} value={settings.thresholds.sadMin} />
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
                  musicSelection: event.target.value === 'sequential' ? 'sequential' : 'shuffle',
                }))
              }
              value={settings.musicSelection}
            >
              <option value="shuffle">Tekrarsız rastgele (Önerilen)</option>
              <option value="sequential">Sırayla</option>
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
