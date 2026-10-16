import type {
  BlendshapeMap,
  CategoryScores,
  ClassificationFrame,
  ClassifierThresholds,
  ExpressionId,
  SignalReading,
} from '../types/index.ts';

export const DEFAULT_THRESHOLDS: ClassifierThresholds = {
  happyMin: 0.2,
  browFurrowMin: 0.18,
  disgustMin: 0.14,
  sadMin: 0.13,
  surprisedMin: 0.22,
  neutralMax: 0.12,
  minMargin: 0.04,
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

function balancedPair(map: BlendshapeMap, left: string, right: string): number {
  const leftValue = read(map, left);
  const rightValue = read(map, right);
  const average = (leftValue + rightValue) / 2;
  const peak = Math.max(leftValue, rightValue);
  return 0.65 * average + 0.35 * peak;
}

interface ScoredCategory {
  id: 'happy' | 'brow_furrow' | 'disgust' | 'sad' | 'surprised';
  score: number;
  reason: string;
}

function thresholdFor(thresholds: ClassifierThresholds, id: ScoredCategory['id']): number {
  if (id === 'happy') return thresholds.happyMin;
  if (id === 'brow_furrow') return thresholds.browFurrowMin;
  if (id === 'disgust') return thresholds.disgustMin;
  if (id === 'sad') return thresholds.sadMin;
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
      scores: { happy: 0, browFurrow: 0, disgust: 0, sad: 0, surprised: 0 },
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
  const browInnerUp = read(map, 'browInnerUp');
  const jawOpen = read(map, 'jawOpen');
  const eyeSquint = balancedPair(map, 'eyeSquintLeft', 'eyeSquintRight');
  const eyeBlink = mean([read(map, 'eyeBlinkLeft'), read(map, 'eyeBlinkRight')]);
  const mouthUpperUp = balancedPair(map, 'mouthUpperUpLeft', 'mouthUpperUpRight');
  const mouthLowerDown = balancedPair(map, 'mouthLowerDownLeft', 'mouthLowerDownRight');
  const mouthShrugUpper = read(map, 'mouthShrugUpper');
  const mouthShrugLower = read(map, 'mouthShrugLower');
  const mouthPucker = read(map, 'mouthPucker');
  const mouthRollLower = read(map, 'mouthRollLower');
  const tongueOut = read(map, 'tongueOut');

  const yawn =
    jawOpen >= thresholds.yawnJawOpen &&
    eyeWide < thresholds.surpriseEyeWide &&
    (eyeSquint >= thresholds.yawnEyeSquint || eyeBlink >= 0.4);

  let happy = 0.68 * smile + 0.18 * dimple + 0.14 * cheek;
  happy *= 1 - 0.45 * frown;

  const browFurrow = 0.65 * browDown + 0.2 * eyeSquint + 0.15 * press;

  let disgust = 0.38 * sneer + 0.28 * mouthUpperUp + 0.12 * mouthShrugUpper + 0.08 * eyeSquint;
  if (tongueOut >= 0.14) {
    disgust += 0.38 + 0.38 * tongueOut;
  } else {
    disgust += 0.20 * tongueOut;
  }

  if (tongueOut >= 0.14) {
    disgust *= 1 - 0.15 * smile;
  } else {
    disgust *= 1 - 0.45 * smile;
  }

  const lowerLipPout = Math.max(
    mouthShrugLower,
    mouthRollLower,
    0.65 * mouthShrugLower + 0.35 * mouthLowerDown,
    0.6 * mouthPucker + 0.4 * mouthShrugLower,
  );

  const hasPoutCue = lowerLipPout >= 0.14;
  const hasFrownCue = frown >= 0.12 || mouthLowerDown >= 0.14;
  const hasBrowInnerUpCue = browInnerUp >= 0.12;

  let sad = 0.35 * frown + 0.28 * browInnerUp + 0.35 * lowerLipPout + 0.12 * mouthLowerDown;

  if ((hasFrownCue || hasPoutCue) && hasBrowInnerUpCue) {
    sad += 0.22 * Math.min(Math.max(frown, lowerLipPout), browInnerUp) + 0.08;
  } else if (hasFrownCue && hasPoutCue) {
    sad += 0.20 * Math.min(frown, lowerLipPout) + 0.08;
  } else {
    const strongPoutOnly = lowerLipPout >= 0.18;
    const strongFrownOnly = frown >= 0.18 || (frown >= 0.14 && mouthLowerDown >= 0.16);
    const strongBrowOnly =
      browInnerUp >= 0.22 &&
      (frown >= 0.04 || lowerLipPout >= 0.04 || mouthLowerDown >= 0.04);
    if (strongPoutOnly || strongFrownOnly || strongBrowOnly) {
      sad += 0.14;
    }
  }

  sad *= 1 - 0.55 * smile;
  sad *= 1 - 0.25 * eyeWide;

  const surpriseCues = [
    eyeWide >= 0.18,
    browUp >= 0.16,
    jawOpen >= 0.16,
  ].filter(Boolean).length;
  let surprised = 0.44 * eyeWide + 0.28 * browUp + 0.28 * Math.min(jawOpen / 0.45, 1);
  if (surpriseCues < 2) surprised *= 0.35;
  if (yawn) surprised *= 0.1;

  const scores: CategoryScores = {
    happy: clamp01(happy),
    browFurrow: clamp01(browFurrow),
    disgust: clamp01(disgust),
    sad: clamp01(sad),
    surprised: clamp01(surprised),
  };

  const signals: SignalReading[] = [
    { id: 'smile', label: 'İki taraflı gülümseme', value: smile },
    { id: 'dimple', label: 'Gamze', value: dimple },
    { id: 'cheek', label: 'Yanak sıkışması', value: cheek },
    { id: 'browDown', label: 'Kaşların aşağı çekilmesi', value: browDown },
    { id: 'sneer', label: 'Burun kırıştırma', value: sneer },
    { id: 'mouthUpperUp', label: 'Üst dudak kalkması', value: mouthUpperUp },
    { id: 'tongueOut', label: 'Dil çıkarma', value: tongueOut },
    { id: 'frown', label: 'Dudak köşelerinin inmesi', value: frown },
    { id: 'pout', label: 'Alt dudak büzme', value: lowerLipPout },
    { id: 'browInnerUp', label: 'İç kaş kalkması', value: browInnerUp },
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
      reason: 'Kaşların aşağı çekilmesi ve gergin ifade baskın.',
    },
    {
      id: 'disgust',
      score: scores.disgust,
      reason: 'Dil çıkarma, burun kırıştırma veya üst dudak çekilmesi baskın.',
    },
    {
      id: 'sad',
      score: scores.sad,
      reason: 'Alt dudak büzme, dudak köşelerinin inmesi veya hüzünlü mimik baskın.',
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
