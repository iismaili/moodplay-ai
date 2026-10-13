export type LandmarkerDelegate = 'GPU' | 'CPU';

export function faceLandmarkerOptions(modelAssetPath: string, delegate: LandmarkerDelegate) {
  return {
    baseOptions: {
      modelAssetPath,
      delegate,
    },
    runningMode: 'VIDEO' as const,
    numFaces: 1,
    outputFaceBlendshapes: true,
  };
}
