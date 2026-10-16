import type { ExpressionId, MusicSelectionMode, MusicTrack, MusicalExpression } from '../types/index.ts';

export function isMusicalExpression(expression: ExpressionId): expression is MusicalExpression {
  return (
    expression === 'happy' ||
    expression === 'brow_furrow' ||
    expression === 'disgust' ||
    expression === 'sad' ||
    expression === 'surprised' ||
    expression === 'neutral'
  );
}

export interface PickerState {
  indexes: Partial<Record<MusicalExpression, number>>;
  lastId: string | null;
}

export function emptyPickerState(): PickerState {
  return { indexes: {}, lastId: null };
}

export function tracksFor(tracks: readonly MusicTrack[], expression: MusicalExpression): MusicTrack[] {
  return tracks.filter((track) => track.expression === expression && track.src.trim() && track.title.trim());
}

export function pickNextTrack(
  tracks: readonly MusicTrack[],
  expression: MusicalExpression,
  mode: MusicSelectionMode,
  state: PickerState,
  random: () => number = Math.random,
): { track: MusicTrack | null; state: PickerState } {
  const pool = tracksFor(tracks, expression);
  if (pool.length === 0) return { track: null, state };

  if (mode === 'sequential') {
    const index = state.indexes[expression] ?? 0;
    const track = pool[index % pool.length] ?? null;
    if (!track) return { track: null, state };
    return {
      track,
      state: {
        indexes: { ...state.indexes, [expression]: index + 1 },
        lastId: track.id,
      },
    };
  }

  const alternatives = pool.filter((track) => track.id !== state.lastId);
  const choices = alternatives.length > 0 ? alternatives : pool;
  const index = Math.min(choices.length - 1, Math.max(0, Math.floor(random() * choices.length)));
  const track = choices[index] ?? null;
  return {
    track,
    state: { ...state, lastId: track?.id ?? state.lastId },
  };
}

export function pickMessage(messages: readonly string[], previous: string | null, random: () => number = Math.random): string {
  const cleaned = messages.map((message) => message.trim()).filter(Boolean);
  if (cleaned.length === 0) return 'Bu ifade için bir mesaj tanımlanmadı.';
  const options = cleaned.filter((message) => message !== previous);
  const pool = options.length > 0 ? options : cleaned;
  const index = Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)));
  return pool[index] ?? cleaned[0] ?? 'Bu ifade için bir mesaj tanımlanmadı.';
}

export function clampFadeMs(value: number): number {
  if (!Number.isFinite(value)) return 1100;
  if (value < 800) return 800;
  if (value > 1500) return 1500;
  return Math.round(value);
}
