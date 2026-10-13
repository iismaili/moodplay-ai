export const EXPRESSION_IDS = [
  'happy',
  'brow_furrow',
  'surprised',
  'neutral',
  'unknown',
  'no_face',
] as const;

export type ExpressionId = (typeof EXPRESSION_IDS)[number];

export const MUSICAL_EXPRESSION_IDS = ['happy', 'brow_furrow', 'surprised', 'neutral'] as const;

export type MusicalExpression = (typeof MUSICAL_EXPRESSION_IDS)[number];

export type AppPhase =
  | 'idle'
  | 'requesting_permission'
  | 'loading_model'
  | 'analyzing'
  | 'playing'
  | 'no_face'
  | 'error'
  | 'stopped';

export interface BlendshapeMap {
  [name: string]: number;
}

export interface CategoryScores {
  happy: number;
  browFurrow: number;
  surprised: number;
}

export interface SignalReading {
  id: string;
  label: string;
  value: number;
}

export interface ClassificationFrame {
  expression: ExpressionId;
  scores: CategoryScores;
  signals: SignalReading[];
  margin: number;
  reason: string;
}

export interface ClassifierThresholds {
  happyMin: number;
  browFurrowMin: number;
  surprisedMin: number;
  neutralMax: number;
  minMargin: number;
  yawnJawOpen: number;
  yawnEyeSquint: number;
  surpriseEyeWide: number;
}

export interface StabilizerConfig {
  initialObservationMs: number;
  stableEvidenceMs: number;
  musicCooldownMs: number;
  noFaceDuckMs: number;
  windowMs: number;
  minSamples: number;
  minMajority: number;
  hysteresis: number;
  neutralCeiling: number;
}

export interface MusicTrack {
  id: string;
  title: string;
  src: string;
  expression: MusicalExpression;
  license: string;
}

export type MusicSelectionMode = 'sequential' | 'shuffle';

export interface RuntimeSettings {
  version: 1;
  thresholds: ClassifierThresholds;
  stabilizer: StabilizerConfig;
  volume: number;
  muted: boolean;
  mirrorVideo: boolean;
  showOverlay: boolean;
  showDebug: boolean;
  musicSelection: MusicSelectionMode;
  fadeMs: number;
  messages: Record<ExpressionId, string[]>;
  tracks: MusicTrack[];
}

export interface FacePoint {
  x: number;
  y: number;
  z: number;
}

export interface PerfSnapshot {
  inferences: number;
  avgInferenceMs: number;
  lastInferenceMs: number;
  fps: number;
}

export interface DetectionFrame {
  blendshapes: BlendshapeMap;
  landmarks: FacePoint[];
  faceCount: number;
  inferenceMs: number;
  perf: PerfSnapshot;
  delegate: 'GPU' | 'CPU' | 'unknown';
}

export interface PhaseInput {
  lifecycle: 'idle' | 'running' | 'stopped';
  permissionPending: boolean;
  modelReady: boolean;
  cameraError: string | null;
  modelError: string | null;
  duckAudio: boolean;
  musicActive: boolean;
}
