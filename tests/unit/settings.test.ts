import { describe, expect, it } from 'vitest';
import { DEFAULT_MESSAGES } from '../../src/config/expressions.ts';
import { defaultSettings, importSettingsJson, loadSettings, saveSettings } from '../../src/config/runtimeSettings.ts';
import { EXPRESSION_IDS } from '../../src/types/index.ts';

function memoryStorage(initial = ''): Storage {
  const values = new Map<string, string>();
  if (initial) values.set('moodplay-ai-settings-v1', initial);
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe('runtimeSettings', () => {
  it('bozuk kaydı varsayılanla değiştirir ve geçerli ayarı saklar', () => {
    const broken = memoryStorage('{');
    const restored = loadSettings(broken);
    expect(restored.restoredDefaults).toBe(true);
    expect(restored.settings.messages.happy.length).toBeGreaterThanOrEqual(3);

    const storage = memoryStorage();
    const custom = defaultSettings();
    custom.messages.happy = ['Yeni bir gülümseme mesajı', 'İkinci', 'Üçüncü'];
    custom.tracks[0] = { ...custom.tracks[0], title: 'Özel parça', src: '/music/ozel.wav' };
    saveSettings(custom, storage);
    const loaded = loadSettings(storage);
    expect(loaded.restoredDefaults).toBe(false);
    expect(loaded.settings.messages.happy[0]).toBe('Yeni bir gülümseme mesajı');
    expect(loaded.settings.tracks[0]?.title).toBe('Özel parça');
  });

  it('blob adreslerini kalıcı ayara yazmaz', () => {
    const storage = memoryStorage();
    const settings = defaultSettings();
    settings.tracks = [{ ...settings.tracks[0], src: 'blob:http://local/123' }, settings.tracks[1]].filter(
      (track): track is NonNullable<typeof track> => Boolean(track),
    );
    saveSettings(settings, storage);
    const loaded = loadSettings(storage);
    expect(loaded.settings.tracks.some((track) => track.src.startsWith('blob:'))).toBe(false);
  });

  it('geçersiz içe aktarmada mevcut ayarı koruyacak bir hata döner', () => {
    expect(importSettingsJson('[]').ok).toBe(false);
    const imported = importSettingsJson(JSON.stringify({ volume: 0.3, messages: { happy: ['  Tek satır  '] } }));
    expect(imported.ok).toBe(true);
    if (imported.ok) {
      expect(imported.settings.volume).toBe(0.3);
      expect(imported.settings.messages.happy).toEqual(['Tek satır']);
      expect(imported.settings.messages.neutral.length).toBeGreaterThan(0);
    }
  });

  it('varsayılan mesajlar teşhis yüzdesi içermez', () => {
    for (const expression of EXPRESSION_IDS) {
      expect(DEFAULT_MESSAGES[expression].length).toBeGreaterThanOrEqual(3);
      for (const message of DEFAULT_MESSAGES[expression]) {
        expect(message).not.toMatch(/%/);
        expect(message.toLowerCase()).not.toContain('sen kızgınsın');
        expect(message.toLowerCase()).not.toContain('mutlusun');
      }
    }
  });
});
