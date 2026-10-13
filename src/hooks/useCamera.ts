import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { buildVideoConstraints, describeCameraError, requestVideoStream } from '../services/cameraErrors.ts';

export interface CameraController {
  status: 'idle' | 'live' | 'error';
  error: string | null;
  devices: MediaDeviceInfo[];
  deviceId: string;
  start: (deviceId?: string) => Promise<MediaStream | null>;
  stop: () => void;
  clearError: () => void;
  setDeviceId: (deviceId: string) => void;
}

export function useCamera(videoRef: RefObject<HTMLVideoElement | null>): CameraController {
  const streamRef = useRef<MediaStream | null>(null);
  const requestId = useRef(0);
  const deviceIdRef = useRef('');
  const [status, setStatus] = useState<'idle' | 'live' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceIdState] = useState('');

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
  }, [videoRef]);

  const stop = useCallback(() => {
    requestId.current += 1;
    stopTracks();
    setStatus('idle');
  }, [stopTracks]);

  const start = useCallback(
    async (nextDeviceId?: string): Promise<MediaStream | null> => {
      const id = ++requestId.current;
      stopTracks();
      setError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setError(describeCameraError(Object.assign(new Error('insecure'), { name: 'SecurityError' })).message);
        return null;
      }

      const chosen = nextDeviceId ?? deviceIdRef.current;
      try {
        const stream = await requestVideoStream(
          (constraints) => navigator.mediaDevices.getUserMedia(constraints),
          buildVideoConstraints(chosen || undefined),
        );
        if (id !== requestId.current) {
          stream.getTracks().forEach((track) => track.stop());
          return null;
        }
        stream.getAudioTracks().forEach((track) => track.stop());
        streamRef.current = stream;
        const attached = await attachPreview(videoRef, stream, () => id === requestId.current);
        if (!attached || id !== requestId.current) {
          stream.getTracks().forEach((track) => track.stop());
          if (streamRef.current === stream) streamRef.current = null;
          if (id === requestId.current) {
            setStatus('error');
            setError('Kamera önizlemesi hazır değil. Yeniden deneyin.');
          }
          return null;
        }
        setStatus('live');
        const listed = await navigator.mediaDevices.enumerateDevices();
        if (id !== requestId.current) return stream;
        setDevices(listed.filter((device) => device.kind === 'videoinput'));
        return stream;
      } catch (caught) {
        if (id !== requestId.current) return null;
        setStatus('error');
        setError(describeCameraError(caught).message);
        return null;
      }
    },
    [stopTracks, videoRef],
  );

  const clearError = useCallback(() => {
    setError(null);
    setStatus((current) => (current === 'error' ? 'idle' : current));
  }, []);

  const setDeviceId = useCallback((next: string) => {
    deviceIdRef.current = next;
    setDeviceIdState(next);
  }, []);

  useEffect(() => {
    const release = () => {
      requestId.current += 1;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
    window.addEventListener('pagehide', release);
    return () => {
      window.removeEventListener('pagehide', release);
      release();
    };
  }, []);

  return {
    status,
    error,
    devices,
    deviceId,
    start,
    stop,
    clearError,
    setDeviceId,
  };
}

async function attachPreview(
  videoRef: RefObject<HTMLVideoElement | null>,
  stream: MediaStream,
  isCurrent: () => boolean,
): Promise<boolean> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!isCurrent()) return false;
    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      await video.play();
      return isCurrent();
    }
    await nextFrame();
  }
  return false;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}
