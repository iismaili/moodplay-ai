import { describe, expect, it } from 'vitest';
import { DEFAULT_STABILIZER, ExpressionStabilizer, type StabilizerSample } from '../../src/services/expressionStabilizer.ts';
import type { CategoryScores, ExpressionId } from '../../src/types/index.ts';

const happyScores: CategoryScores = { happy: 0.7, browFurrow: 0.05, disgust: 0.02, sad: 0.01, surprised: 0.04 };
const surprisedScores: CategoryScores = { happy: 0.08, browFurrow: 0.05, disgust: 0.02, sad: 0.01, surprised: 0.74 };
const neutralScores: CategoryScores = { happy: 0.05, browFurrow: 0.04, disgust: 0.02, sad: 0.01, surprised: 0.03 };
const unknownScores: CategoryScores = { happy: 0.3, browFurrow: 0.28, disgust: 0.1, sad: 0.1, surprised: 0.1 };

function sample(expression: ExpressionId, scores: CategoryScores): StabilizerSample {
  return { expression, scores, margin: 0.4 };
}

function feed(
  stabilizer: ExpressionStabilizer,
  expression: ExpressionId,
  scores: CategoryScores,
  from: number,
  to: number,
  step = 100,
) {
  let output = stabilizer.push(sample(expression, scores), from);
  for (let time = from + step; time <= to; time += step) {
    output = stabilizer.push(sample(expression, scores), time);
  }
  return output;
}

describe('expressionStabilizer', () => {
  it('ilk 2 saniyede karar vermez, sonra müziği bir kez seçer', () => {
    const stabilizer = new ExpressionStabilizer();
    const early = feed(stabilizer, 'happy', happyScores, 0, 1900);
    expect(early.observing).toBe(true);
    expect(early.stableExpression).toBeNull();
    expect(early.musicExpression).toBeNull();

    const committed = feed(stabilizer, 'happy', happyScores, 2000, 2000);
    expect(committed.observing).toBe(false);
    expect(committed.stableExpression).toBe('happy');
    expect(committed.musicExpression).toBe('happy');
    expect(committed.debug.musicRevision).toBeGreaterThan(0);
  });

  it('3 saniyelik kanıt ve 15 saniyelik bekleme dolmadan müziği değiştirmez', () => {
    const stabilizer = new ExpressionStabilizer();
    feed(stabilizer, 'happy', happyScores, 0, 2000);
    const tooSoon = feed(stabilizer, 'surprised', surprisedScores, 2100, 4000);
    expect(tooSoon.stableExpression).toBe('happy');
    expect(tooSoon.musicExpression).toBe('happy');

    const switched = feed(stabilizer, 'surprised', surprisedScores, 4100, 7500);
    expect(switched.stableExpression).toBe('surprised');
    expect(switched.musicExpression).toBe('happy');
    expect(switched.debug.cooldownRemainingMs).toBeGreaterThan(0);

    const stillCooling = feed(stabilizer, 'surprised', surprisedScores, 7600, 16000);
    expect(stillCooling.musicExpression).toBe('happy');

    const released = feed(stabilizer, 'surprised', surprisedScores, 16100, 17500);
    expect(released.musicExpression).toBe('surprised');
  });

  it('hızlı dalgalanmada önceki kararlı ifadeyi korur', () => {
    const stabilizer = new ExpressionStabilizer();
    feed(stabilizer, 'happy', happyScores, 0, 2000);
    let output = stabilizer.push(sample('happy', happyScores), 2100);
    for (let time = 2200; time <= 5000; time += 100) {
      const expression = time % 200 === 0 ? 'surprised' : 'happy';
      const scores = expression === 'surprised' ? surprisedScores : happyScores;
      output = stabilizer.push(sample(expression, scores), time);
    }
    expect(output.stableExpression).toBe('happy');
    expect(output.musicExpression).toBe('happy');
  });

  it('belirsiz pencerede önceki kararlı sonucu bırakmaz', () => {
    const stabilizer = new ExpressionStabilizer();
    feed(stabilizer, 'happy', happyScores, 0, 2000);
    const output = feed(stabilizer, 'unknown', unknownScores, 2100, 8000);
    expect(output.stableExpression).toBe('happy');
    expect(output.musicExpression).toBe('happy');
  });

  it('5 saniye yüz yoksa sesi kısar, dönüşte önceki sonucu temizler', () => {
    const stabilizer = new ExpressionStabilizer();
    feed(stabilizer, 'happy', happyScores, 0, 2000);
    const pending = stabilizer.push(sample('no_face', neutralScores), 8000);
    expect(pending.displayExpression).toBe('no_face');
    expect(pending.duckAudio).toBe(false);

    const ducked = stabilizer.push(sample('no_face', neutralScores), 8000 + DEFAULT_STABILIZER.noFaceDuckMs);
    expect(ducked.duckAudio).toBe(true);
    expect(ducked.stableExpression).toBeNull();

    const returned = stabilizer.push(sample('happy', happyScores), 14000);
    expect(returned.sessionReset).toBe(true);
    expect(returned.stableExpression).toBeNull();
    expect(returned.musicExpression).toBeNull();
    expect(returned.observing).toBe(true);

    const recommitted = feed(stabilizer, 'happy', happyScores, 14100, 16000);
    expect(recommitted.stableExpression).toBe('happy');
    expect(recommitted.musicExpression).toBe('happy');
  });

  it('sakin ifadeye ancak önceki skor düşünce geçer', () => {
    const stabilizer = new ExpressionStabilizer({ ...DEFAULT_STABILIZER, windowMs: 300, minSamples: 3 });
    feed(stabilizer, 'happy', happyScores, 0, 2000);
    const blocked = feed(stabilizer, 'neutral', happyScores, 2100, 7000);
    expect(blocked.stableExpression).toBe('happy');

    const relaxed = feed(stabilizer, 'neutral', neutralScores, 7100, 12000);
    expect(relaxed.stableExpression).toBe('neutral');
  });
});
