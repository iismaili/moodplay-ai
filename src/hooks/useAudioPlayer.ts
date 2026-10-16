import { useState } from 'react';
import type { MusicTrack } from '../types/index.ts';
import {
  createHtmlPlayable,
  MusicController,
  type MusicSnapshot,
  type PlayResult,
} from '../services/musicController.ts';

export interface AudioPlayerApi {
  unlock: () => Promise<void>;
  playTrack: (track: MusicTrack) => Promise<PlayResult>;
  toggle: () => Promise<void>;
  stop: () => Promise<void>;
  duck: () => Promise<void>;
  unduck: () => Promise<void>;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setFadeMs: (fadeMs: number) => void;
  isTransitioning: () => boolean;
  snapshot: MusicSnapshot;
}

export function useAudioPlayer(initialFadeMs = 1100): AudioPlayerApi {
  const [snapshot, setSnapshot] = useState<MusicSnapshot | null>(null);
  const [controller] = useState(() => {
    let instance: MusicController | null = null;
    instance = new MusicController({
      createAudio: createHtmlPlayable,
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      fadeMs: initialFadeMs,
      onChange: () => {
        if (instance) setSnapshot(instance.snapshot());
      },
    });
    return instance;
  });

  const view = snapshot ?? controller.snapshot();

  return {
    unlock: () => controller.unlock(),
    playTrack: (track) => controller.playTrack(track),
    toggle: () => controller.toggle(),
    stop: () => controller.stop(),
    duck: () => controller.duck(),
    unduck: () => controller.unduck(),
    setVolume: (volume) => controller.setVolume(volume),
    setMuted: (muted) => controller.setMuted(muted),
    setFadeMs: (fadeMs) => controller.setFadeMs(fadeMs),
    isTransitioning: () => controller.isTransitioning(),
    snapshot: view,
  };
}
