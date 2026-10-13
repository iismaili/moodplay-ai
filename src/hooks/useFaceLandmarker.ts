import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { DetectionFrame } from '../types/index.ts';
import { adaptSampleInterval, monotonicTimestamp, shouldProcessVideoFrame } from '../services/frameClock.ts';
import { closeFaceLandmarker, loadFaceLandmarker, type LandmarkerSession } from '../services/landmarkerService.ts';
import { PerfTracker } from '../services/perfStats.ts';

const MODEL_ERROR = 'Yüz modeli yüklenemedi. Model dosyasını ve WASM paketini kontrol edip yeniden deneyin.';
const ANALYSIS_ERROR = 'Yüz analizi durdu. Modeli yeniden yükleyin.';

interface UseFaceLandmarkerOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  onFrame: (frame: DetectionFrame) => void;
}

export function useFaceLandmarker({ videoRef, enabled, onFrame }: UseFaceLandmarkerOptions) {
  const onFrameRef = useRef(onFrame);
  const aliveRef = useRef(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    closeFaceLandmarker();
    setReady(false);
    setError(null);
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    aliveRef.current = true;
    const onLeave = () => {
      aliveRef.current = false;
      closeFaceLandmarker();
    };
    window.addEventListener('pagehide', onLeave);
    return () => {
      aliveRef.current = false;
      window.removeEventListener('pagehide', onLeave);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let raf = 0;
    const perf = new PerfTracker();
    let lastVideoTime = -1;
    let lastTimestamp = -1;
    let lastRun = 0;
    let interval = 100;
    let failures = 0;
    let session: LandmarkerSession | null = null;

    const loop = () => {
      if (cancelled || !aliveRef.current) return;
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      const video = videoRef.current;
      if (!video || !session) return;
      if (video.readyState < 2) return;
      const now = performance.now();
      if (now - lastRun < interval) return;
      if (!shouldProcessVideoFrame(video.currentTime, lastVideoTime)) return;
      lastVideoTime = video.currentTime;
      lastRun = now;
      const timestamp = monotonicTimestamp(now, lastTimestamp);
      lastTimestamp = timestamp;
      const started = performance.now();
      try {
        const detection = session.detectForVideo(video, timestamp);
        failures = 0;
        const inferenceMs = performance.now() - started;
        interval = adaptSampleInterval(interval, inferenceMs);
        onFrameRef.current({
          blendshapes: detection.blendshapes,
          landmarks: detection.landmarks,
          faceCount: detection.faceCount,
          inferenceMs,
          perf: perf.record(inferenceMs, performance.now()),
          delegate: session.delegate,
        });
      } catch {
        failures += 1;
        if (failures >= 8) setError(ANALYSIS_ERROR);
      }
    };

    loadFaceLandmarker()
      .then((loaded) => {
        if (cancelled || !aliveRef.current) return;
        session = loaded;
        setReady(true);
        setError(null);
        const video = videoRef.current;
        if (video?.paused) void video.play().catch(() => undefined);
        raf = requestAnimationFrame(loop);
      })
      .catch(() => {
        if (cancelled) return;
        setReady(false);
        setError(MODEL_ERROR);
      });

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const video = videoRef.current;
      if (video?.srcObject) void video.play().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [attempt, enabled, videoRef]);

  return { ready, error, retry };
}
