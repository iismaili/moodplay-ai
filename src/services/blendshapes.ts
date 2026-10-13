import type { BlendshapeMap, FacePoint } from '../types/index.ts';

export interface NamedScore {
  categoryName: string;
  score: number;
}

export function blendshapeMap(categories: readonly NamedScore[] | undefined): BlendshapeMap {
  const map: BlendshapeMap = {};
  if (!categories) return map;
  for (const category of categories) map[category.categoryName] = category.score;
  return map;
}

export interface FaceBounds {
  width: number;
  height: number;
}

export function faceBounds(landmarks: readonly FacePoint[]): FaceBounds | null {
  if (landmarks.length === 0) return null;
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const point of landmarks) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return { width: maxX - minX, height: maxY - minY };
}

export function shouldPromptCloser(bounds: FaceBounds | null): boolean {
  if (!bounds) return false;
  return bounds.width < 0.18 || bounds.height < 0.18;
}
