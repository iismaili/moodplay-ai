export const TRACKED_MOODS = [
  'happy',
  'sad',
  'brow_furrow',
  'disgust',
  'surprised',
  'neutral',
] as const;

export type TrackedMood = (typeof TRACKED_MOODS)[number];

export interface CampusMoodCounts {
  happy: number;
  sad: number;
  brow_furrow: number;
  disgust: number;
  surprised: number;
  neutral: number;
}

export interface MoodMeta {
  id: TrackedMood;
  label: string;
  emoji: string;
  gradient: string;
  accentColor: string;
}

export const MOOD_META: Record<TrackedMood, MoodMeta> = {
  happy: {
    id: 'happy',
    label: 'Mutlu',
    emoji: '😊',
    gradient: 'from-amber-400 to-emerald-400',
    accentColor: '#34d399',
  },
  sad: {
    id: 'sad',
    label: 'Üzgün',
    emoji: '😢',
    gradient: 'from-blue-400 to-indigo-500',
    accentColor: '#60a5fa',
  },
  brow_furrow: {
    id: 'brow_furrow',
    label: 'Sinirli',
    emoji: '😠',
    gradient: 'from-rose-500 to-red-600',
    accentColor: '#f43f5e',
  },
  disgust: {
    id: 'disgust',
    label: 'Tiksinti',
    emoji: '🤢',
    gradient: 'from-emerald-500 to-lime-500',
    accentColor: '#10b981',
  },
  surprised: {
    id: 'surprised',
    label: 'Şaşkın',
    emoji: '😮',
    gradient: 'from-purple-400 to-pink-500',
    accentColor: '#c084fc',
  },
  neutral: {
    id: 'neutral',
    label: 'Sakin',
    emoji: '😐',
    gradient: 'from-cyan-400 to-teal-500',
    accentColor: '#22d3ee',
  },
};

export const CAMPUS_MOOD_STORAGE_KEY = 'moodplay_campus_mood_counts_v1';

export function defaultCampusMoodCounts(): CampusMoodCounts {
  return {
    happy: 0,
    sad: 0,
    brow_furrow: 0,
    disgust: 0,
    surprised: 0,
    neutral: 0,
  };
}

export function isTrackedMood(value: unknown): value is TrackedMood {
  return typeof value === 'string' && (TRACKED_MOODS as readonly string[]).includes(value);
}

export function loadCampusMoodCounts(
  storage: Pick<Storage, 'getItem'> = localStorage,
): CampusMoodCounts {
  try {
    const raw = storage.getItem(CAMPUS_MOOD_STORAGE_KEY);
    if (!raw) return defaultCampusMoodCounts();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaultCampusMoodCounts();

    const record = parsed as Record<string, unknown>;
    const counts = defaultCampusMoodCounts();
    for (const mood of TRACKED_MOODS) {
      const val = record[mood];
      if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
        counts[mood] = Math.floor(val);
      }
    }
    return counts;
  } catch {
    return defaultCampusMoodCounts();
  }
}

export function saveCampusMoodCounts(
  counts: CampusMoodCounts,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  try {
    storage.setItem(CAMPUS_MOOD_STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // Ignore storage quota errors in restricted environments
  }
}

export function incrementCampusMood(
  current: CampusMoodCounts,
  mood: TrackedMood,
): CampusMoodCounts {
  return {
    ...current,
    [mood]: (current[mood] ?? 0) + 1,
  };
}

export interface CampusMoodStats {
  total: number;
  percentages: Record<TrackedMood, number>;
  ranked: Array<{
    mood: TrackedMood;
    count: number;
    percentage: number;
    meta: MoodMeta;
  }>;
  summaryText: string;
}

export function calculateCampusMoodStats(counts: CampusMoodCounts): CampusMoodStats {
  const total = TRACKED_MOODS.reduce((sum, mood) => sum + (counts[mood] ?? 0), 0);

  const percentages = {} as Record<TrackedMood, number>;
  for (const mood of TRACKED_MOODS) {
    const count = counts[mood] ?? 0;
    percentages[mood] = total > 0 ? Math.round((count / total) * 100) : 0;
  }

  const ranked = TRACKED_MOODS.map((mood) => ({
    mood,
    count: counts[mood] ?? 0,
    percentage: percentages[mood] ?? 0,
    meta: MOOD_META[mood],
  })).sort((a, b) => b.count - a.count);

  let summaryText = 'Bugün henüz anonim duygu kaydedilmedi.';
  if (total > 0) {
    const active = ranked.filter((item) => item.count > 0);
    if (active.length === 1 && active[0]) {
      summaryText = `Bugün %${active[0].percentage} ${active[0].meta.label}`;
    } else if (active.length >= 2 && active[0] && active[1]) {
      summaryText = `Bugün %${active[0].percentage} ${active[0].meta.label}, %${active[1].percentage} ${active[1].meta.label}`;
      if (active.length > 2 && active[2] && active[2].percentage > 10) {
        summaryText += `, %${active[2].percentage} ${active[2].meta.label}`;
      }
    }
  }

  return {
    total,
    percentages,
    ranked,
    summaryText,
  };
}
