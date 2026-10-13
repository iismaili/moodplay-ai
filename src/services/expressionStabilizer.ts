import type {
  CategoryScores,
  ExpressionId,
  MusicalExpression,
  StabilizerConfig,
} from '../types/index.ts';
import { isMusicalExpression } from './musicEngine.ts';

export const DEFAULT_STABILIZER: StabilizerConfig = {
  initialObservationMs: 2000,
  stableEvidenceMs: 3000,
  musicCooldownMs: 15000,
  noFaceDuckMs: 5000,
  windowMs: 800,
  minSamples: 4,
  minMajority: 0.6,
  hysteresis: 0.06,
  neutralCeiling: 0.18,
};

export interface StabilizerSample {
  expression: ExpressionId;
  scores: CategoryScores;
  margin: number;
}

export interface StabilizerDebug {
  windowCounts: Partial<Record<ExpressionId, number>>;
  candidate: ExpressionId | null;
  candidateHeldMs: number;
  observationElapsedMs: number;
  cooldownRemainingMs: number;
  musicRevision: number;
  pendingMusic: boolean;
}

export interface StabilizerOutput {
  observing: boolean;
  displayExpression: ExpressionId;
  stableExpression: ExpressionId | null;
  musicExpression: MusicalExpression | null;
  duckAudio: boolean;
  sessionReset: boolean;
  debug: StabilizerDebug;
}

function categoryScore(scores: CategoryScores, expression: ExpressionId): number {
  if (expression === 'happy') return scores.happy;
  if (expression === 'brow_furrow') return scores.browFurrow;
  if (expression === 'surprised') return scores.surprised;
  return 0;
}

export class ExpressionStabilizer {
  revision = 0;

  private config: StabilizerConfig;

  private samples: Array<{ t: number; sample: StabilizerSample }> = [];

  private sessionStartedAt: number | null = null;

  private stable: ExpressionId | null = null;

  private candidate: ExpressionId | null = null;

  private candidateSince: number | null = null;

  private musicExpression: MusicalExpression | null = null;

  private musicChangedAt: number | null = null;

  private pendingMusic = false;

  private noFaceSince: number | null = null;

  private absenceLatched = false;

  constructor(config: StabilizerConfig = DEFAULT_STABILIZER) {
    this.config = config;
  }

  updateConfig(config: StabilizerConfig): void {
    this.config = config;
  }

  reset(now: number): StabilizerOutput {
    this.samples = [];
    this.sessionStartedAt = now;
    this.stable = null;
    this.candidate = null;
    this.candidateSince = null;
    this.musicExpression = null;
    this.musicChangedAt = null;
    this.pendingMusic = false;
    this.noFaceSince = null;
    this.absenceLatched = false;
    this.revision += 1;
    return this.finish(now, true);
  }

  push(sample: StabilizerSample, now: number): StabilizerOutput {
    if (this.sessionStartedAt === null) this.sessionStartedAt = now;

    if (sample.expression === 'no_face') {
      if (this.noFaceSince === null) this.noFaceSince = now;
      const absentFor = now - this.noFaceSince;
      if (absentFor >= this.config.noFaceDuckMs) this.absenceLatched = true;
      return this.finish(now, false);
    }

    let sessionReset = false;
    if (this.absenceLatched) {
      this.reset(now);
      sessionReset = true;
    }
    this.noFaceSince = null;

    this.samples.push({ t: now, sample });
    const cutoff = now - Math.max(this.config.windowMs, 1);
    this.samples = this.samples.filter((item) => item.t >= cutoff);

    const observing = now - (this.sessionStartedAt ?? now) < this.config.initialObservationMs;
    if (observing) return this.finish(now, sessionReset);

    const winner = this.majority(now);
    if (!winner) return this.finish(now, sessionReset);

    if (this.stable === null) {
      if (winner.expression !== 'unknown') {
        this.stable = winner.expression;
        this.syncMusic(now);
      }
      return this.finish(now, sessionReset);
    }

    if (winner.expression === this.stable || !this.acceptsSwitch(this.stable, winner.expression, winner.avg)) {
      this.candidate = null;
      this.candidateSince = null;
      this.syncMusic(now);
      return this.finish(now, sessionReset);
    }

    if (this.candidate !== winner.expression) {
      this.candidate = winner.expression;
      this.candidateSince = now;
    }
    const held = now - (this.candidateSince ?? now);
    if (held >= this.config.stableEvidenceMs) {
      this.stable = winner.expression;
      this.candidate = null;
      this.candidateSince = null;
    }
    this.syncMusic(now);
    return this.finish(now, sessionReset);
  }

  private majority(now: number): { expression: ExpressionId; avg: CategoryScores } | null {
    const window = this.samples.filter((item) => now - item.t <= this.config.windowMs);
    if (window.length < this.config.minSamples) return null;

    const counts = new Map<ExpressionId, number>();
    const totals = { happy: 0, browFurrow: 0, surprised: 0 };
    for (const item of window) {
      counts.set(item.sample.expression, (counts.get(item.sample.expression) ?? 0) + 1);
      totals.happy += item.sample.scores.happy;
      totals.browFurrow += item.sample.scores.browFurrow;
      totals.surprised += item.sample.scores.surprised;
    }

    let best: ExpressionId | null = null;
    let bestCount = 0;
    for (const [expression, count] of counts) {
      if (count > bestCount) {
        best = expression;
        bestCount = count;
      }
    }
    if (!best || bestCount / window.length < this.config.minMajority) return null;

    const size = window.length;
    return {
      expression: best,
      avg: {
        happy: totals.happy / size,
        browFurrow: totals.browFurrow / size,
        surprised: totals.surprised / size,
      },
    };
  }

  private acceptsSwitch(current: ExpressionId, winner: ExpressionId, avg: CategoryScores): boolean {
    if (winner === 'unknown' || winner === 'no_face') return false;
    if (current === 'unknown' || current === 'no_face') return true;
    if (winner === 'neutral') return categoryScore(avg, current) <= this.config.neutralCeiling;
    return categoryScore(avg, winner) >= categoryScore(avg, current) + this.config.hysteresis;
  }

  private syncMusic(now: number): void {
    if (!this.stable || !isMusicalExpression(this.stable)) return;
    if (this.stable === this.musicExpression) {
      this.pendingMusic = false;
      return;
    }
    const cooled =
      this.musicChangedAt === null || now - this.musicChangedAt >= this.config.musicCooldownMs;
    if (!cooled) {
      this.pendingMusic = true;
      return;
    }
    this.musicExpression = this.stable;
    this.musicChangedAt = now;
    this.pendingMusic = false;
    this.revision += 1;
  }

  private finish(now: number, sessionReset: boolean): StabilizerOutput {
    const elapsed = this.sessionStartedAt === null ? 0 : now - this.sessionStartedAt;
    const observing = this.noFaceSince === null && elapsed < this.config.initialObservationMs;
    let displayExpression: ExpressionId = 'unknown';
    if (this.noFaceSince !== null) displayExpression = 'no_face';
    else if (!observing && this.stable) displayExpression = this.stable;

    const windowCounts: Partial<Record<ExpressionId, number>> = {};
    for (const item of this.samples) {
      if (now - item.t <= this.config.windowMs) {
        windowCounts[item.sample.expression] = (windowCounts[item.sample.expression] ?? 0) + 1;
      }
    }

    const cooldownRemainingMs =
      this.musicChangedAt === null
        ? 0
        : Math.max(0, this.config.musicCooldownMs - (now - this.musicChangedAt));

    return {
      observing,
      displayExpression,
      stableExpression: this.absenceLatched ? null : this.stable,
      musicExpression: this.musicExpression,
      duckAudio: this.absenceLatched,
      sessionReset,
      debug: {
        windowCounts,
        candidate: this.candidate,
        candidateHeldMs: this.candidateSince === null ? 0 : Math.max(0, now - this.candidateSince),
        observationElapsedMs: elapsed,
        cooldownRemainingMs,
        musicRevision: this.revision,
        pendingMusic: this.pendingMusic,
      },
    };
  }
}
