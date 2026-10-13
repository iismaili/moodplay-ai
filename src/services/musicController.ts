import type { MusicTrack } from '../types/index.ts';
import { clampFadeMs } from './musicEngine.ts';

export const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

export interface Playable {
  src: string;
  loop: boolean;
  paused: boolean;
  currentTime: number;
  volume: number;
  onerror: (() => void) | null;
  play: () => Promise<void>;
  pause: () => void;
  load: () => void;
}

export type PlayResult =
  | { ok: true }
  | { ok: false; reason: 'busy' | 'queued' | 'stale' | 'play_rejected' | 'media' | 'missing' };

export interface MusicSnapshot {
  track: MusicTrack | null;
  playing: boolean;
  status: 'idle' | 'playing' | 'paused' | 'error';
  error: string | null;
  volume: number;
  muted: boolean;
  ducked: boolean;
}

export interface MusicControllerOptions {
  createAudio: () => Playable;
  sleep: (ms: number) => Promise<void>;
  fadeMs: number;
  onChange?: () => void;
}

const PLAY_REJECTED = 'Tarayıcı sesi otomatik başlatamadı. Oynat düğmesine basın.';
const MEDIA_FAILED = 'Parça bulunamadı veya bu tarayıcıda çözülemedi.';

export class MusicController {
  private audio: Playable | null = null;

  private track: MusicTrack | null = null;

  private transitioning = false;

  private token = 0;

  private queued: MusicTrack | null = null;

  private volume = 0.8;

  private muted = false;

  private ducked = false;

  private playing = false;

  private status: MusicSnapshot['status'] = 'idle';

  private error: string | null = null;

  private fadeMs: number;

  private readonly options: MusicControllerOptions;

  constructor(options: MusicControllerOptions) {
    this.options = options;
    this.fadeMs = clampFadeMs(options.fadeMs);
  }

  snapshot(): MusicSnapshot {
    return {
      track: this.track,
      playing: this.playing,
      status: this.status,
      error: this.error,
      volume: this.volume,
      muted: this.muted,
      ducked: this.ducked,
    };
  }

  isTransitioning(): boolean {
    return this.transitioning;
  }

  setFadeMs(value: number): void {
    const next = clampFadeMs(value);
    if (next === this.fadeMs) return;
    this.fadeMs = next;
  }

  setVolume(value: number): void {
    const next = clampUnit(value);
    if (next === this.volume) return;
    this.volume = next;
    this.applyVolume();
    this.emit();
  }

  setMuted(muted: boolean): void {
    if (muted === this.muted) return;
    this.muted = muted;
    this.applyVolume();
    this.emit();
  }

  unlock(): Promise<void> {
    const audio = this.ensure();
    audio.loop = false;
    audio.src = SILENT_WAV;
    audio.volume = 0;
    const pending = audio.play();
    return pending
      .then(() => {
        audio.pause();
        this.error = null;
        this.emit();
      })
      .catch(() => {
        this.error = PLAY_REJECTED;
        this.status = 'error';
        this.emit();
      });
  }

  async playTrack(track: MusicTrack): Promise<PlayResult> {
    if (!track.src.trim()) {
      this.fail(MEDIA_FAILED);
      return { ok: false, reason: 'missing' };
    }
    if (this.transitioning) {
      this.queued = track;
      return { ok: false, reason: 'queued' };
    }

    this.transitioning = true;
    const token = ++this.token;
    try {
      const audio = this.ensure();
      if (this.playing) {
        const faded = await this.fadeTo(0, token);
        if (!faded) return { ok: false, reason: 'stale' };
      }
      if (token !== this.token) return { ok: false, reason: 'stale' };

      audio.pause();
      audio.loop = true;
      audio.src = track.src;
      audio.currentTime = 0;
      audio.volume = 0;
      audio.load();
      this.track = track;
      this.error = null;

      try {
        await audio.play();
      } catch (error) {
        const name = error instanceof Error ? error.name : '';
        const rejected = name === 'NotAllowedError';
        this.fail(rejected ? PLAY_REJECTED : MEDIA_FAILED);
        return { ok: false, reason: rejected ? 'play_rejected' : 'media' };
      }
      if (token !== this.token) {
        audio.pause();
        return { ok: false, reason: 'stale' };
      }

      this.playing = true;
      this.status = 'playing';
      this.emit();
      await this.fadeTo(this.targetVolume(), token);
      return { ok: true };
    } finally {
      this.transitioning = false;
      const next = this.queued;
      this.queued = null;
      if (next && token === this.token && next.id !== track.id) {
        void this.playTrack(next);
      }
    }
  }

  async toggle(): Promise<void> {
    const audio = this.audio;
    if (!audio || !this.track) return;
    if (this.playing) {
      audio.pause();
      this.playing = false;
      this.status = 'paused';
      this.emit();
      return;
    }
    try {
      await audio.play();
      this.playing = true;
      this.status = 'playing';
      this.error = null;
      this.applyVolume();
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      this.fail(name === 'NotAllowedError' ? PLAY_REJECTED : MEDIA_FAILED);
    }
  }

  async stop(): Promise<void> {
    this.token += 1;
    const token = this.token;
    this.queued = null;
    this.ducked = false;
    if (this.audio && this.playing) await this.fadeTo(0, token);
    this.audio?.pause();
    if (this.audio) this.audio.currentTime = 0;
    this.playing = false;
    this.track = null;
    this.status = 'idle';
    this.emit();
  }

  async duck(): Promise<void> {
    this.ducked = true;
    const token = this.token;
    if (this.playing) await this.fadeTo(0, token);
    else this.applyVolume();
    this.emit();
  }

  private ensure(): Playable {
    if (!this.audio) {
      this.audio = this.options.createAudio();
      this.audio.onerror = () => {
        this.fail(MEDIA_FAILED);
      };
    }
    return this.audio;
  }

  private targetVolume(): number {
    if (this.muted || this.ducked) return 0;
    return this.volume;
  }

  private applyVolume(): void {
    if (this.audio) this.audio.volume = this.targetVolume();
  }

  private async fadeTo(value: number, token: number): Promise<boolean> {
    const audio = this.audio;
    if (!audio) return false;
    const from = audio.volume;
    const steps = 8;
    const slice = this.fadeMs / steps;
    for (let step = 1; step <= steps; step += 1) {
      if (token !== this.token) return false;
      audio.volume = from + (value - from) * (step / steps);
      await this.options.sleep(slice);
    }
    if (token !== this.token) return false;
    audio.volume = value;
    return true;
  }

  private fail(message: string): void {
    this.playing = false;
    this.status = 'error';
    this.error = message;
    this.emit();
  }

  private emit(): void {
    this.options.onChange?.();
  }
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0.8;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function createHtmlPlayable(): Playable {
  const audio = new Audio();
  audio.preload = 'auto';
  let errorHandler: (() => void) | null = null;
  audio.onerror = () => {
    errorHandler?.();
  };
  return {
    get src() {
      return audio.src;
    },
    set src(value: string) {
      audio.src = value;
    },
    get loop() {
      return audio.loop;
    },
    set loop(value: boolean) {
      audio.loop = value;
    },
    get paused() {
      return audio.paused;
    },
    get currentTime() {
      return audio.currentTime;
    },
    set currentTime(value: number) {
      audio.currentTime = value;
    },
    get volume() {
      return audio.volume;
    },
    set volume(value: number) {
      audio.volume = value;
    },
    get onerror() {
      return errorHandler;
    },
    set onerror(handler: (() => void) | null) {
      errorHandler = handler;
    },
    play: () => audio.play(),
    pause: () => {
      audio.pause();
    },
    load: () => {
      audio.load();
    },
  };
}
