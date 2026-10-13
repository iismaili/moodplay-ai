import { describe, expect, it } from 'vitest';
import { DEFAULT_TRACKS } from '../../src/config/musicLibrary.ts';
import { clampFadeMs, emptyPickerState, pickMessage, pickNextTrack } from '../../src/services/musicEngine.ts';
import { MusicController, type Playable } from '../../src/services/musicController.ts';
import type { MusicTrack } from '../../src/types/index.ts';

function track(id: string, expression: MusicTrack['expression'], src = `/music/${id}.wav`): MusicTrack {
  return { id, title: id, src, expression, license: 'test' };
}

class FakeAudio implements Playable {
  src = '';
  loop = false;
  paused = true;
  currentTime = 0;
  volume = 1;
  onerror: (() => void) | null = null;
  playCount = 0;
  pauseCount = 0;
  failWith: string | null = null;

  play(): Promise<void> {
    this.playCount += 1;
    if (this.failWith) return Promise.reject(Object.assign(new Error('fail'), { name: this.failWith }));
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.pauseCount += 1;
    this.paused = true;
  }

  load(): void {
    this.currentTime = 0;
  }
}

describe('musicEngine', () => {
  it('sırayla döner ve parçası olmayan ifadede null döner', () => {
    const tracks = [track('a', 'happy'), track('b', 'happy')];
    const first = pickNextTrack(tracks, 'happy', 'sequential', emptyPickerState());
    const second = pickNextTrack(tracks, 'happy', 'sequential', first.state);
    const third = pickNextTrack(tracks, 'happy', 'sequential', second.state);
    expect(first.track?.id).toBe('a');
    expect(second.track?.id).toBe('b');
    expect(third.track?.id).toBe('a');
    expect(pickNextTrack(tracks, 'neutral', 'sequential', emptyPickerState()).track).toBeNull();
  });

  it('rastgele seçimde mümkünse aynı parçayı hemen tekrarlamaz', () => {
    const tracks = [track('a', 'happy'), track('b', 'happy'), track('c', 'happy')];
    const first = pickNextTrack(tracks, 'happy', 'shuffle', emptyPickerState(), () => 0);
    const second = pickNextTrack(tracks, 'happy', 'shuffle', first.state, () => 0);
    expect(second.track?.id).not.toBe(first.track?.id);
  });

  it('mesaj yoksa güvenli metin döner ve aynı mesajı hemen tekrarlamaz', () => {
    expect(pickMessage([], null)).toMatch(/tanımlanmadı/);
    const picked = pickMessage(['bir', 'iki'], 'bir', () => 0);
    expect(picked).toBe('iki');
  });

  it('geçiş süresini 800 ile 1500 ms arasında tutar', () => {
    expect(clampFadeMs(100)).toBe(800);
    expect(clampFadeMs(5000)).toBe(1500);
    expect(clampFadeMs(1100)).toBe(1100);
  });

  it('varsayılan kitaplıkta her müzikli ifade için en az bir parça vardır', () => {
    for (const expression of ['happy', 'brow_furrow', 'surprised', 'neutral'] as const) {
      expect(DEFAULT_TRACKS.some((item) => item.expression === expression)).toBe(true);
    }
  });
});

describe('musicController', () => {
  it('oynatma reddini yakalar ve eksik dosyayı bildirir', async () => {
    const audio = new FakeAudio();
    audio.failWith = 'NotAllowedError';
    const controller = new MusicController({
      createAudio: () => audio,
      sleep: () => Promise.resolve(),
      fadeMs: 1100,
    });
    const rejected = await controller.playTrack(track('a', 'happy'));
    expect(rejected).toEqual({ ok: false, reason: 'play_rejected' });
    expect(controller.snapshot().error).toMatch(/Oynat/);

    audio.failWith = 'NotSupportedError';
    const missing = await controller.playTrack(track('missing', 'happy', '/music/missing.wav'));
    expect(missing).toEqual({ ok: false, reason: 'media' });
    expect(controller.snapshot().error).toMatch(/çözülemedi/);
  });

  it('geçiş bitmeden ikinci parçayı aynı anda başlatmaz', async () => {
    const audio = new FakeAudio();
    let release: (() => void) | undefined;
    audio.play = () => {
      audio.playCount += 1;
      audio.paused = false;
      return new Promise((resolve) => {
        release = resolve;
      });
    };
    const controller = new MusicController({
      createAudio: () => audio,
      sleep: () => Promise.resolve(),
      fadeMs: 800,
    });
    const first = controller.playTrack(track('a', 'happy'));
    const second = controller.playTrack(track('b', 'neutral', '/music/other.wav'));
    await Promise.resolve();
    expect(audio.playCount).toBe(1);
    await expect(second).resolves.toEqual({ ok: false, reason: 'queued' });
    release?.();
    await first;
    expect(audio.pauseCount).toBeGreaterThan(0);
  });

  it('ilk parçada solma süresi alt sınırın altına inmez', async () => {
    const audio = new FakeAudio();
    const sleeps: number[] = [];
    const controller = new MusicController({
      createAudio: () => audio,
      sleep: (ms) => {
        sleeps.push(ms);
        return Promise.resolve();
      },
      fadeMs: 50,
    });
    await controller.playTrack(track('a', 'happy'));
    const total = sleeps.reduce((sum, value) => sum + value, 0);
    expect(total).toBeGreaterThanOrEqual(800);
    expect(total).toBeLessThanOrEqual(1500);
  });
});
