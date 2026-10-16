import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  calculateCampusMoodStats,
  defaultCampusMoodCounts,
  incrementCampusMood,
  isTrackedMood,
  loadCampusMoodCounts,
  saveCampusMoodCounts,
  type CampusMoodCounts,
  type CampusMoodStats,
} from '../services/campusMoodStorage.ts';
import type { ExpressionId } from '../types/index.ts';

export interface UseCampusMoodStatsResult {
  counts: CampusMoodCounts;
  stats: CampusMoodStats;
  recordMood: (expression: ExpressionId) => void;
  resetStats: () => void;
}

export function useCampusMoodStats(): UseCampusMoodStatsResult {
  const [counts, setCounts] = useState<CampusMoodCounts>(() => loadCampusMoodCounts());

  useEffect(() => {
    saveCampusMoodCounts(counts);
  }, [counts]);

  const recordMood = useCallback((expression: ExpressionId) => {
    if (!isTrackedMood(expression)) return;
    setCounts((current) => incrementCampusMood(current, expression));
  }, []);

  const resetStats = useCallback(() => {
    const fresh = defaultCampusMoodCounts();
    setCounts(fresh);
    saveCampusMoodCounts(fresh);
  }, []);

  const stats = useMemo(() => calculateCampusMoodStats(counts), [counts]);

  return {
    counts,
    stats,
    recordMood,
    resetStats,
  };
}
