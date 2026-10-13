import { describe, expect, it, vi } from 'vitest';
import { buildVideoConstraints, describeCameraError, requestVideoStream } from '../../src/services/cameraErrors.ts';
import { adaptSampleInterval, monotonicTimestamp, shouldProcessVideoFrame } from '../../src/services/frameClock.ts';
import { faceLandmarkerOptions } from '../../src/services/landmarkerConfig.ts';
import { PerfTracker, formatPerfReport } from '../../src/services/perfStats.ts';
import { blendshapeMap, faceBounds, shouldPromptCloser } from '../../src/services/blendshapes.ts';
import { createVisitorSession, rotateVisitor } from '../../src/services/sessionManager.ts';
import { resolvePhase } from '../../src/app/resolvePhase.ts';

describe('camera and frame scheduling', () => {
  it('yalnızca video ister', () => {
    expect(buildVideoConstraints()).toMatchObject({ audio: false });
    expect(buildVideoConstraints('cam-1').video).toMatchObject({ deviceId: { exact: 'cam-1' } });
    expect(buildVideoConstraints('cam-1').audio).toBe(false);
  });

  it('izin, cihaz ve güvenlik hatalarını Türkçe açıklar', () => {
    expect(describeCameraError({ name: 'NotAllowedError' }).message).toMatch(/izin/i);
    expect(describeCameraError({ name: 'NotFoundError' }).message).toMatch(/bulunamadı/i);
    expect(describeCameraError({ name: 'NotReadableError' }).message).toMatch(/uygulama/i);
    expect(describeCameraError({ name: 'SecurityError' }).message).toMatch(/HTTPS/i);
    expect(describeCameraError({ name: 'TimeoutError' }).message).toMatch(/yanıt vermedi/i);
    expect(describeCameraError({ name: 'OverconstrainedError' }).message).toMatch(/desteklenmiyor/i);
  });

  it('zaman aşımından sonra geç gelen akışı kapatır', async () => {
    vi.useFakeTimers();
    const stop = vi.fn();
    let resolveStream: ((stream: MediaStream) => void) | undefined;
    const pending = new Promise<MediaStream>((resolve) => {
      resolveStream = resolve;
    });
    const request = requestVideoStream(() => pending, { audio: false, video: true }, 12000);
    const expectation = expect(request).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(12000);
    await expectation;
    resolveStream?.({
      getTracks: () => [{ stop } as unknown as MediaStreamTrack],
    } as MediaStream);
    await Promise.resolve();
    await Promise.resolve();
    expect(stop).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('aynı video karesini tekrarlamaz ve zaman damgasını ileri taşır', () => {
    expect(shouldProcessVideoFrame(0, -1)).toBe(true);
    expect(shouldProcessVideoFrame(1.2, 1.2)).toBe(false);
    expect(shouldProcessVideoFrame(1.3, 1.2)).toBe(true);
    expect(monotonicTimestamp(10, -1)).toBe(10);
    expect(monotonicTimestamp(10, 10)).toBe(11);
    expect(monotonicTimestamp(4, 10)).toBe(11);
  });

  it('yavaş çıkarımda örnek aralığını büyütür', () => {
    expect(adaptSampleInterval(100, 80)).toBeGreaterThan(100);
    expect(adaptSampleInterval(100, 5)).toBeLessThan(100);
    expect(adaptSampleInterval(250, 90)).toBe(250);
  });
});

describe('landmarker config and geometry', () => {
  it('video modunda tek yüz ve blendshape ister', () => {
    expect(faceLandmarkerOptions('/models/face_landmarker.task', 'GPU')).toEqual({
      baseOptions: { modelAssetPath: '/models/face_landmarker.task', delegate: 'GPU' },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
    });
  });

  it('blendshape listesini söze çevirir ve küçük yüz için yaklaşma ister', () => {
    expect(blendshapeMap([{ categoryName: 'jawOpen', score: 0.4 }])).toEqual({ jawOpen: 0.4 });
    expect(shouldPromptCloser(faceBounds([{ x: 0.4, y: 0.4, z: 0 }, { x: 0.5, y: 0.5, z: 0 }]))).toBe(true);
    expect(shouldPromptCloser(faceBounds([{ x: 0.2, y: 0.2, z: 0 }, { x: 0.8, y: 0.8, z: 0 }]))).toBe(false);
  });
});

describe('session and phase', () => {
  it('yeni ziyaretçi kimliği artırır ama önceki zamanı taşımaz', () => {
    const first = createVisitorSession(1_000, 3);
    const next = rotateVisitor(first, 5_000);
    expect(next).toEqual({ id: 4, startedAt: 5_000 });
  });

  it('durum makinesi izin, model, yüz yok ve müzik sırasını korur', () => {
    expect(resolvePhase({ lifecycle: 'idle', permissionPending: false, modelReady: false, cameraError: null, modelError: null, duckAudio: false, musicActive: false })).toBe('idle');
    expect(resolvePhase({ lifecycle: 'running', permissionPending: true, modelReady: false, cameraError: null, modelError: null, duckAudio: false, musicActive: false })).toBe('requesting_permission');
    expect(resolvePhase({ lifecycle: 'running', permissionPending: false, modelReady: false, cameraError: null, modelError: null, duckAudio: false, musicActive: false })).toBe('loading_model');
    expect(resolvePhase({ lifecycle: 'running', permissionPending: false, modelReady: true, cameraError: null, modelError: null, duckAudio: false, musicActive: false })).toBe('analyzing');
    expect(resolvePhase({ lifecycle: 'running', permissionPending: false, modelReady: true, cameraError: null, modelError: null, duckAudio: false, musicActive: true })).toBe('playing');
    expect(resolvePhase({ lifecycle: 'running', permissionPending: false, modelReady: true, cameraError: null, modelError: null, duckAudio: true, musicActive: true })).toBe('no_face');
    expect(resolvePhase({ lifecycle: 'running', permissionPending: false, modelReady: false, cameraError: 'izin', modelError: null, duckAudio: false, musicActive: false })).toBe('error');
    expect(resolvePhase({ lifecycle: 'stopped', permissionPending: false, modelReady: true, cameraError: null, modelError: null, duckAudio: false, musicActive: true })).toBe('stopped');
  });
});

describe('perf report', () => {
  it('ortalama süreyi ve hızı hesaplar', () => {
    const tracker = new PerfTracker();
    tracker.record(20, 0);
    const snapshot = tracker.record(40, 1000);
    expect(snapshot.avgInferenceMs).toBe(30);
    expect(snapshot.fps).toBeCloseTo(1);
    expect(formatPerfReport(snapshot)).toMatch(/30\.0 ms/);
  });
});
