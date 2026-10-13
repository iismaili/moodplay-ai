import { useEffect, useState } from 'react';
import { defaultSettings, loadSettings, saveSettings } from '../config/runtimeSettings.ts';
import type { RuntimeSettings } from '../types/index.ts';

export function useRuntimeSettings() {
  const [boot] = useState(() => loadSettings());
  const [settings, setSettings] = useState<RuntimeSettings>(boot.settings);
  const [notice, setNotice] = useState<string | null>(
    boot.restoredDefaults ? 'Kayıtlı ayarlar bozuktu, varsayılanlar yüklendi.' : null,
  );
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const update = (recipe: (current: RuntimeSettings) => RuntimeSettings) => {
    setSettings((current) => recipe(current));
  };

  const resetDefaults = () => {
    for (const url of Object.values(previews)) URL.revokeObjectURL(url);
    setPreviews({});
    setSettings(defaultSettings());
    setNotice('Varsayılan ayarlar yüklendi.');
  };

  const setPreview = (trackId: string, file: File) => {
    setPreviews((current) => {
      const previous = current[trackId];
      if (previous) URL.revokeObjectURL(previous);
      return { ...current, [trackId]: URL.createObjectURL(file) };
    });
    setNotice(
      'Seçilen dosya yalnızca bu oturumda çalar. Kalıcı olması için dosyayı public/music altına koyup yolu yazın.',
    );
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
