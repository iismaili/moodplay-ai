import { describe, expect, it } from 'vitest';
import {
  calculateCampusMoodStats,
  defaultCampusMoodCounts,
  incrementCampusMood,
  loadCampusMoodCounts,
  saveCampusMoodCounts,
  CAMPUS_MOOD_STORAGE_KEY,
  type CampusMoodCounts,
} from '../../src/services/campusMoodStorage.ts';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => map.delete(key),
    setItem: (key, value) => map.set(key, value),
  };
}

describe('campusMoodStorage', () => {
  it('başlangıçta tüm sayaçları sıfır döner', () => {
    const counts = defaultCampusMoodCounts();
    expect(counts.happy).toBe(0);
    expect(counts.sad).toBe(0);
    expect(counts.brow_furrow).toBe(0);
    expect(counts.disgust).toBe(0);
    expect(counts.surprised).toBe(0);
    expect(counts.neutral).toBe(0);
  });

  it('duygu sayacını doğru artırır', () => {
    let counts = defaultCampusMoodCounts();
    counts = incrementCampusMood(counts, 'happy');
    counts = incrementCampusMood(counts, 'happy');
    counts = incrementCampusMood(counts, 'sad');
    expect(counts.happy).toBe(2);
    expect(counts.sad).toBe(1);
    expect(counts.brow_furrow).toBe(0);
  });

  it('yüzdeleri ve özet metnini formatlar (Örn: Bugün %60 Mutlu, %20 Üzgün)', () => {
    const counts: CampusMoodCounts = {
      happy: 6,
      sad: 2,
      brow_furrow: 1,
      disgust: 1,
      surprised: 0,
      neutral: 0,
    };
    const stats = calculateCampusMoodStats(counts);
    expect(stats.total).toBe(10);
    expect(stats.percentages.happy).toBe(60);
    expect(stats.percentages.sad).toBe(20);
    expect(stats.summaryText).toContain('Bugün %60 Mutlu, %20 Üzgün');
  });

  it('localStorage üzerinden verileri yükler ve kaydeder', () => {
    const storage = memoryStorage();
    const counts: CampusMoodCounts = {
      happy: 5,
      sad: 3,
      brow_furrow: 0,
      disgust: 1,
      surprised: 2,
      neutral: 4,
    };
    saveCampusMoodCounts(counts, storage);
    expect(storage.getItem(CAMPUS_MOOD_STORAGE_KEY)).toContain('"happy":5');

    const loaded = loadCampusMoodCounts(storage);
    expect(loaded.happy).toBe(5);
    expect(loaded.sad).toBe(3);
    expect(loaded.neutral).toBe(4);
  });

  it('bozuk veya eksik localStorage kaydında varsayılan sıfırlara döner', () => {
    const storage = memoryStorage({ [CAMPUS_MOOD_STORAGE_KEY]: '{"invalid":' });
    const loaded = loadCampusMoodCounts(storage);
    expect(loaded.happy).toBe(0);
    expect(loaded.sad).toBe(0);
  });
});
