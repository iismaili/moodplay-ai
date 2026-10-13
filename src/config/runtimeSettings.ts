import { DEFAULT_MESSAGES } from './expressions.ts';
import { DEFAULT_TRACKS } from './musicLibrary.ts';
import { DEFAULT_THRESHOLDS } from '../services/expressionClassifier.ts';
import { DEFAULT_STABILIZER } from '../services/expressionStabilizer.ts';
import { clampFadeMs } from '../services/musicEngine.ts';
import {
  EXPRESSION_IDS,
  MUSICAL_EXPRESSION_IDS,
  type ClassifierThresholds,
  type ExpressionId,
  type MusicSelectionMode,
  type MusicTrack,
  type MusicalExpression,
  type RuntimeSettings,
  type StabilizerConfig,
} from '../types/index.ts';

export const SETTINGS_STORAGE_KEY = 'moodplay-ai-settings-v1';

export function defaultSettings(): RuntimeSettings {
  return {
    version: 1,
    thresholds: { ...DEFAULT_THRESHOLDS },
    stabilizer: { ...DEFAULT_STABILIZER },
    volume: 0.8,
    muted: false,
    mirrorVideo: true,
    showOverlay: true,
    showDebug: false,
    musicSelection: 'sequential',
    fadeMs: 1100,
    messages: {
      happy: [...DEFAULT_MESSAGES.happy],
      brow_furrow: [...DEFAULT_MESSAGES.brow_furrow],
      surprised: [...DEFAULT_MESSAGES.surprised],
      neutral: [...DEFAULT_MESSAGES.neutral],
      unknown: [...DEFAULT_MESSAGES.unknown],
      no_face: [...DEFAULT_MESSAGES.no_face],
    },
    tracks: DEFAULT_TRACKS.map((track) => ({ ...track })),
  };
}

export function persistableSettings(settings: RuntimeSettings): RuntimeSettings {
  return {
    ...settings,
    tracks: settings.tracks
      .filter((track) => track.src.trim().length > 0 && !track.src.startsWith('blob:'))
      .map((track) => ({ ...track })),
  };
}

export function exportSettings(settings: RuntimeSettings): string {
  return JSON.stringify(persistableSettings(settings), null, 2);
}

export function loadSettings(storage: Pick<Storage, 'getItem'> = localStorage): {
  settings: RuntimeSettings;
  restoredDefaults: boolean;
} {
  const raw = storage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw) return { settings: defaultSettings(), restoredDefaults: false };
  const imported = importSettingsJson(raw);
  if (!imported.ok) return { settings: defaultSettings(), restoredDefaults: true };
  return { settings: imported.settings, restoredDefaults: false };
}

export function saveSettings(
  settings: RuntimeSettings,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(SETTINGS_STORAGE_KEY, exportSettings(settings));
}

export function importSettingsJson(
  raw: string,
): { ok: true; settings: RuntimeSettings } | { ok: false; message: string } {
  try {
    const parsed: unknown = JSON.parse(raw);
    const settings = sanitizeSettings(parsed);
    if (!settings) return { ok: false, message: 'Dosya tanınmadı. Mevcut ayarlar korundu.' };
    return { ok: true, settings };
  } catch {
    return { ok: false, message: 'JSON okunamadı. Mevcut ayarlar korundu.' };
  }
}

export function sanitizeSettings(value: unknown): RuntimeSettings | null {
  if (!isRecord(value)) return null;
  const defaults = defaultSettings();
  const thresholds = sanitizeThresholds(value.thresholds, defaults.thresholds);
  const stabilizer = sanitizeStabilizer(value.stabilizer, defaults.stabilizer);
  const messages = sanitizeMessages(value.messages, defaults.messages);
  const tracks = sanitizeTracks(value.tracks, defaults.tracks);
  const musicSelection: MusicSelectionMode =
    value.musicSelection === 'shuffle' ? 'shuffle' : 'sequential';

  return {
    version: 1,
    thresholds,
    stabilizer,
    volume: readNumber(value.volume, defaults.volume, 0, 1),
    muted: typeof value.muted === 'boolean' ? value.muted : defaults.muted,
    mirrorVideo: typeof value.mirrorVideo === 'boolean' ? value.mirrorVideo : defaults.mirrorVideo,
    showOverlay: typeof value.showOverlay === 'boolean' ? value.showOverlay : defaults.showOverlay,
    showDebug: typeof value.showDebug === 'boolean' ? value.showDebug : defaults.showDebug,
    musicSelection,
    fadeMs: clampFadeMs(typeof value.fadeMs === 'number' ? value.fadeMs : defaults.fadeMs),
    messages,
    tracks,
  };
}

function sanitizeThresholds(value: unknown, defaults: ClassifierThresholds): ClassifierThresholds {
  const record = isRecord(value) ? value : {};
  return {
    happyMin: readNumber(record.happyMin, defaults.happyMin, 0, 1),
    browFurrowMin: readNumber(record.browFurrowMin, defaults.browFurrowMin, 0, 1),
    surprisedMin: readNumber(record.surprisedMin, defaults.surprisedMin, 0, 1),
    neutralMax: readNumber(record.neutralMax, defaults.neutralMax, 0, 1),
    minMargin: readNumber(record.minMargin, defaults.minMargin, 0, 1),
    yawnJawOpen: readNumber(record.yawnJawOpen, defaults.yawnJawOpen, 0, 1),
    yawnEyeSquint: readNumber(record.yawnEyeSquint, defaults.yawnEyeSquint, 0, 1),
    surpriseEyeWide: readNumber(record.surpriseEyeWide, defaults.surpriseEyeWide, 0, 1),
  };
}

function sanitizeStabilizer(value: unknown, defaults: StabilizerConfig): StabilizerConfig {
  const record = isRecord(value) ? value : {};
  return {
    initialObservationMs: readNumber(record.initialObservationMs, defaults.initialObservationMs, 500, 10000),
    stableEvidenceMs: readNumber(record.stableEvidenceMs, defaults.stableEvidenceMs, 500, 20000),
    musicCooldownMs: readNumber(record.musicCooldownMs, defaults.musicCooldownMs, 1000, 120000),
    noFaceDuckMs: readNumber(record.noFaceDuckMs, defaults.noFaceDuckMs, 1000, 60000),
    windowMs: readNumber(record.windowMs, defaults.windowMs, 200, 5000),
    minSamples: Math.round(readNumber(record.minSamples, defaults.minSamples, 2, 30)),
    minMajority: readNumber(record.minMajority, defaults.minMajority, 0.5, 0.95),
    hysteresis: readNumber(record.hysteresis, defaults.hysteresis, 0, 0.5),
    neutralCeiling: readNumber(record.neutralCeiling, defaults.neutralCeiling, 0, 1),
  };
}

function sanitizeMessages(
  value: unknown,
  defaults: Record<ExpressionId, string[]>,
): Record<ExpressionId, string[]> {
  const record = isRecord(value) ? value : {};
  const messages = {} as Record<ExpressionId, string[]>;
  for (const id of EXPRESSION_IDS) {
    const lines = Array.isArray(record[id])
      ? record[id].filter((line): line is string => typeof line === 'string').map((line) => line.trim()).filter(Boolean)
      : [];
    messages[id] = lines.length > 0 ? lines : [...defaults[id]];
  }
  return messages;
}

function sanitizeTracks(value: unknown, defaults: MusicTrack[]): MusicTrack[] {
  if (!Array.isArray(value)) return defaults.map((track) => ({ ...track }));
  const tracks: MusicTrack[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    if (typeof item.id !== 'string' || typeof item.title !== 'string' || typeof item.src !== 'string') continue;
    if (!isMusical(item.expression)) continue;
    const src = item.src.trim();
    if (!src || src.startsWith('blob:')) continue;
    tracks.push({
      id: item.id,
      title: item.title.trim() || 'Adsız parça',
      src,
      expression: item.expression,
      license: typeof item.license === 'string' ? item.license : defaults[0]?.license ?? '',
    });
  }
  return tracks.length > 0 ? tracks : defaults.map((track) => ({ ...track }));
}

function isMusical(value: unknown): value is MusicalExpression {
  return typeof value === 'string' && MUSICAL_EXPRESSION_IDS.some((id) => id === value);
}

function readNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
