import { describe, expect, it } from 'vitest';
import { DEFAULT_THRESHOLDS, classifyBlendshapes } from '../../src/services/expressionClassifier.ts';
import type { BlendshapeMap } from '../../src/types/index.ts';

const thresholds = { ...DEFAULT_THRESHOLDS };

function blend(partial: BlendshapeMap): BlendshapeMap {
  return partial;
}

describe('expressionClassifier', () => {
  it('iki taraflı gülümsemeyi happy seçer', () => {
    const result = classifyBlendshapes(
      blend({
        mouthSmileLeft: 0.86,
        mouthSmileRight: 0.84,
        mouthDimpleLeft: 0.4,
        mouthDimpleRight: 0.38,
        cheekSquintLeft: 0.3,
        cheekSquintRight: 0.28,
      }),
      thresholds,
      1,
    );
    expect(result.expression).toBe('happy');
    expect(result.reason).toMatch(/gülümseme/i);
  });

  it('kaşların aşağı çekilmesini teşhis etmeden brow_furrow seçer', () => {
    const result = classifyBlendshapes(
      blend({
        browDownLeft: 0.78,
        browDownRight: 0.8,
        noseSneerLeft: 0.3,
        noseSneerRight: 0.28,
      }),
      thresholds,
      1,
    );
    expect(result.expression).toBe('brow_furrow');
    expect(result.reason.toLowerCase()).not.toContain('kızgınsın');
  });

  it('göz ve ağız birlikte açıldığında surprised seçer', () => {
    const result = classifyBlendshapes(
      blend({
        eyeWideLeft: 0.74,
        eyeWideRight: 0.72,
        jawOpen: 0.42,
        browInnerUp: 0.5,
        browOuterUpLeft: 0.46,
        browOuterUpRight: 0.44,
      }),
      thresholds,
      1,
    );
    expect(result.expression).toBe('surprised');
  });

  it('esneme benzeri çene açıklığını şaşkın saymaz', () => {
    const result = classifyBlendshapes(
      blend({
        jawOpen: 0.86,
        eyeBlinkLeft: 0.7,
        eyeBlinkRight: 0.68,
        eyeSquintLeft: 0.45,
        eyeSquintRight: 0.42,
        eyeWideLeft: 0.04,
        eyeWideRight: 0.03,
      }),
      thresholds,
      1,
    );
    expect(result.expression).not.toBe('surprised');
    expect(result.reason).toMatch(/Esneme/);
  });

  it('belirgin ipucu yoksa neutral döner', () => {
    expect(classifyBlendshapes({}, thresholds, 1).expression).toBe('neutral');
  });

  it('çelişkili yüksek skorlarda unknown döner', () => {
    const result = classifyBlendshapes(
      blend({
        mouthSmileLeft: 0.9,
        mouthSmileRight: 0.9,
        browDownLeft: 0.9,
        browDownRight: 0.9,
      }),
      thresholds,
      1,
    );
    expect(result.expression).toBe('unknown');
  });

  it('yüz yoksa blendshape olsa bile no_face döner', () => {
    const result = classifyBlendshapes(blend({ mouthSmileLeft: 1, mouthSmileRight: 1 }), thresholds, 0);
    expect(result.expression).toBe('no_face');
  });

  it('aralık dışı ve sayı olmayan skorları kırpıp çökmez', () => {
    const result = classifyBlendshapes(
      blend({
        mouthSmileLeft: 5,
        mouthSmileRight: Number.NaN,
      }),
      thresholds,
      1,
    );
    expect(result.scores.happy).toBeGreaterThanOrEqual(0);
    expect(result.scores.happy).toBeLessThanOrEqual(1);
    expect(result.expression).not.toBe('no_face');
  });
});
