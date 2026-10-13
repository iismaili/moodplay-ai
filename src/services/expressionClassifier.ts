import type {
  BlendshapeMap,
  CategoryScores,
  ClassificationFrame,
  ClassifierThresholds,
  ExpressionId,
  SignalReading,
} from '../types/index.ts';

export const DEFAULT_THRESHOLDS: ClassifierThresholds = {
  happyMin: 0.34,
  browFurrowMin: 0.32,
  surprisedMin: 0.36,
  neutralMax: 0.18,
  minMargin: 0.08,
  yawnJawOpen: 0.45,
  yawnEyeSquint: 0.22,
  surpriseEyeWide: 0.22,
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function read(map: BlendshapeMap, name: string): number {
  return clamp01(map[name] ?? 0);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Both sides contribute. A one-sided cue is weaker than a balanced pair. */
function balancedPair(map: BlendshapeMap, left: string, right: string): number {
  const leftValue = read(map, left);
  const rightValue = read(map, right);
  const average = (leftValue + rightValue) / 2;
  const balance = 1 - Math.abs(leftValue - rightValue);
  return average * (0.65 + 0.35 * balance);
}

interface ScoredCategory {
  id: 'happy' | 'brow_furrow' | 'surprised';
  score: number;
  reason: string;
}

function thresholdFor(thresholds: ClassifierThresholds, id: ScoredCategory['id']): number {
  if (id === 'happy') return thresholds.happyMin;
  if (id === 'brow_furrow') return thresholds.browFurrowMin;
  return thresholds.surprisedMin;
}

export function classifyBlendshapes(
  map: BlendshapeMap,
  thresholds: ClassifierThresholds,
  faceCount: number,
): ClassificationFrame {
  if (faceCount <= 0) {
    return {
      expression: 'no_face',
      scores: { happy: 0, browFurrow: 0, surprised: 0 },
      signals: [],
      margin: 0,
      reason: 'Yüz saptanamadı.',
    };
  }

  const smile = balancedPair(map, 'mouthSmileLeft', 'mouthSmileRight');
  const dimple = balancedPair(map, 'mouthDimpleLeft', 'mouthDimpleRight');
  const cheek = balancedPair(map, 'cheekSquintLeft', 'cheekSquintRight');
  const frown = balancedPair(map, 'mouthFrownLeft', 'mouthFrownRight');
  const browDown = balancedPair(map, 'browDownLeft', 'browDownRight');
  const sneer = balancedPair(map, 'noseSneerLeft', 'noseSneerRight');
  const press = balancedPair(map, 'mouthPressLeft', 'mouthPressRight');
  const eyeWide = balancedPair(map, 'eyeWideLeft', 'eyeWideRight');
  const browUp = mean([
    read(map, 'browInnerUp'),
    read(map, 'browOuterUpLeft'),
    read(map, 'browOuterUpRight'),
  ]);
  const jawOpen = read(map, 'jawOpen');
  const eyeSquint = balancedPair(map, 'eyeSquintLeft', 'eyeSquintRight');
  const eyeBlink = mean([read(map, 'eyeBlinkLeft'), read(map, 'eyeBlinkRight')]);

  const yawn =
    jawOpen >= thresholds.yawnJawOpen &&
    eyeWide < thresholds.surpriseEyeWide &&
    (eyeSquint >= thresholds.yawnEyeSquint || eyeBlink >= 0.4);

  let happy = 0.7 * smile + 0.18 * dimple + 0.12 * cheek;
  happy *= 1 - 0.45 * frown;

  const browFurrow = 0.78 * browDown + 0.14 * sneer + 0.08 * press;

  const surpriseCues = [
    eyeWide >= 0.22,
    browUp >= 0.18,
    jawOpen >= 0.18,
  ].filter(Boolean).length;
  let surprised = 0.42 * eyeWide + 0.28 * browUp + 0.3 * Math.min(jawOpen / 0.5, 1);
  if (surpriseCues < 2) surprised *= 0.35;
  if (yawn) surprised *= 0.1;

  const scores: CategoryScores = {
    happy: clamp01(happy),
    browFurrow: clamp01(browFurrow),
    surprised: clamp01(surprised),
  };

  const signals: SignalReading[] = [
    { id: 'smile', label: 'İki taraflı gülümseme', value: smile },
    { id: 'dimple', label: 'Gamze', value: dimple },
    { id: 'cheek', label: 'Yanak sıkışması', value: cheek },
    { id: 'browDown', label: 'Kaşların aşağı çekilmesi', value: browDown },
    { id: 'sneer', label: 'Burun kırıştırma', value: sneer },
    { id: 'eyeWide', label: 'Göz genişlemesi', value: eyeWide },
    { id: 'browUp', label: 'Kaşların yukarı kalkması', value: browUp },
    { id: 'jawOpen', label: 'Çene açıklığı', value: jawOpen },
    { id: 'eyeSquint', label: 'Göz kısma', value: eyeSquint },
    { id: 'eyeBlink', label: 'Göz kırpma', value: eyeBlink },
  ];

  const ranked: ScoredCategory[] = [
    { id: 'happy', score: scores.happy, reason: 'İki taraflı gülümseme baskın.' },
    {
      id: 'brow_furrow',
      score: scores.browFurrow,
      reason: 'Kaşların aşağı çekilmesi baskın. Bu bir kızgınlık teşhisi değildir.',
    },
    {
      id: 'surprised',
      score: scores.surprised,
      reason: 'Göz genişlemesi ve ağız açıklığı birlikte yükseldi.',
    },
  ];
  ranked.sort((left, right) => right.score - left.score);

  const top = ranked[0];
  const second = ranked[1];
  if (!top || !second) {
    return {
      expression: 'unknown',
      scores,
      signals,
      margin: 0,
      reason: 'İşaretler ayrıştırılamadı.',
    };
  }

  const margin = top.score - second.score;
  const yawnReason = 'Esneme benzeri ağız açıklığı şaşkın ifadeden ayrıldı.';

  let expression: ExpressionId;
  let reason: string;
  if (top.score < thresholds.neutralMax && second.score < thresholds.neutralMax) {
    expression = 'neutral';
    reason = yawn ? yawnReason : 'Belirgin mimik eşiğin altında.';
  } else if (top.score < thresholdFor(thresholds, top.id) || margin < thresholds.minMargin) {
    expression = 'unknown';
    reason = yawn ? yawnReason : 'İşaretler çelişkili veya ayrışma yetersiz.';
  } else {
    expression = top.id;
    reason = top.reason;
  }

  return { expression, scores, signals, margin, reason };
}
