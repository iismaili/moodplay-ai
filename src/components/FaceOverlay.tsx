import { useEffect, useRef } from 'react';
import type { FacePoint } from '../types/index.ts';

interface FaceOverlayProps {
  landmarks: readonly FacePoint[];
  visible: boolean;
}

export function FaceOverlay({ landmarks, visible }: FaceOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const bounds = parent.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, width, height);
    if (!visible || landmarks.length === 0) return;
    context.fillStyle = 'rgba(125, 211, 252, 0.9)';
    for (const point of landmarks) {
      context.beginPath();
      context.arc(point.x * width, point.y * height, 1.4, 0, Math.PI * 2);
      context.fill();
    }
  }, [landmarks, visible]);

  return (
    <canvas
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      ref={canvasRef}
    />
  );
}
