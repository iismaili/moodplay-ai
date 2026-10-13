import type { FacePoint } from '../types/index.ts';
import { blendshapeMap } from './blendshapes.ts';
import { faceLandmarkerOptions, type LandmarkerDelegate } from './landmarkerConfig.ts';

export interface LandmarkerDetection {
  blendshapes: ReturnType<typeof blendshapeMap>;
  landmarks: FacePoint[];
  faceCount: number;
}

export interface LandmarkerSession {
  delegate: LandmarkerDelegate;
  detectForVideo: (video: HTMLVideoElement, timestampMs: number) => LandmarkerDetection;
  close: () => void;
}

let current: LandmarkerSession | null = null;
let pending: Promise<LandmarkerSession> | null = null;

export function loadFaceLandmarker(
  modelAssetPath = '/models/face_landmarker.task',
  wasmRoot = '/wasm',
): Promise<LandmarkerSession> {
  if (current) return Promise.resolve(current);
  if (!pending) {
    pending = createSession(modelAssetPath, wasmRoot)
      .then((session) => {
        current = session;
        return session;
      })
      .catch((error: unknown) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}

export function closeFaceLandmarker(): void {
  current?.close();
  current = null;
  pending = null;
}

async function createSession(modelAssetPath: string, wasmRoot: string): Promise<LandmarkerSession> {
  const vision = await import('@mediapipe/tasks-vision');
  const fileset = await vision.FilesetResolver.forVisionTasks(wasmRoot);
  const canvas = document.createElement('canvas');
  let delegate: LandmarkerDelegate = 'CPU';
  let landmarker: Awaited<ReturnType<typeof vision.FaceLandmarker.createFromOptions>>;
  try {
    landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
      ...faceLandmarkerOptions(modelAssetPath, 'GPU'),
      canvas,
    });
    delegate = 'GPU';
  } catch {
    landmarker = await vision.FaceLandmarker.createFromOptions(
      fileset,
      faceLandmarkerOptions(modelAssetPath, 'CPU'),
    );
    delegate = 'CPU';
  }

  return {
    delegate,
    close: () => {
      landmarker.close();
    },
    detectForVideo: (video, timestampMs) => {
      const result = landmarker.detectForVideo(video, timestampMs);
      const categories = result.faceBlendshapes[0]?.categories ?? [];
      const points = result.faceLandmarks[0] ?? [];
      return {
        blendshapes: blendshapeMap(categories),
        landmarks: points.map((point) => ({
          x: point.x,
          y: point.y,
          z: point.z,
        })),
        faceCount: result.faceLandmarks.length,
      };
    },
  };
}
