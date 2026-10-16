import { useEffect, useState } from 'react';
import {
  defaultSettings,
  loadSettings,
  saveSettings,
  OBSOLETE_TRACK_SOURCES,
} from '../config/runtimeSettings.ts';
import {
  clearAllAudioFiles,
  loadAllAudioFiles,
  saveAudioFile,
} from '../services/audioStorage.ts';
import { MUSICAL_EXPRESSION_IDS, type RuntimeSettings } from '../types/index.ts';

export function useRuntimeSettings() {
  const [boot] = useState(() => {
    const loaded = loadSettings();
    const hasObsolete = loaded.settings.tracks.some((track) =>
      OBSOLETE_TRACK_SOURCES.some((obsolete) => track.src.includes(obsolete)),
    );
    const missingExpression = MUSICAL_EXPRESSION_IDS.some(
      (exp) => !loaded.settings.tracks.some((track) => track.expression === exp),
    );
    if (hasObsolete || missingExpression) {
      return { settings: defaultSettings(), restoredDefaults: true };
    }
    return loaded;
  });
  const [settings, setSettings] = useState<RuntimeSettings>(boot.settings);
  const [notice, setNotice] = useState<string | null>(
    boot.restoredDefaults ? 'Kayıtlı ayarlar bozuktu, varsayılanlar yüklendi.' : null,
  );
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    void loadAllAudioFiles().then((files) => {
      if (!alive) return;
      const urls: Record<string, string> = {};
      for (const [id, blob] of Object.entries(files)) {
        urls[id] = URL.createObjectURL(blob);
      }
      setPreviews((current) => ({ ...urls, ...current }));
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const update = (recipe: (current: RuntimeSettings) => RuntimeSettings) => {
    setSettings((current) => recipe(current));
  };

  const resetDefaults = () => {
    void clearAllAudioFiles();
    for (const url of Object.values(previews)) URL.revokeObjectURL(url);
    setPreviews({});
    setSettings(defaultSettings());
    setNotice('Varsayılan ayarlar ve müzikler yüklendi.');
  };

  const setPreview = (trackId: string, file: File) => {
    void saveAudioFile(trackId, file);
    setPreviews((current) => {
      const previous = current[trackId];
      if (previous) URL.revokeObjectURL(previous);
      return { ...current, [trackId]: URL.createObjectURL(file) };
    });
    setNotice(`"${file.name}" dosyası kaydedildi.`);
  };

  return {
    settings,
    setSettings,
    update,
    resetDefaults,
    restoredDefaults: boot.restoredDefaults,
    notice,
    setNotice,
    previews,
    setPreview,
  };
}
