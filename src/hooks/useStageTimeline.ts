"use client";

import { useState, useCallback, useEffect } from "react";
import {
  STAGE,
  STAGE_DURATIONS,
  SKIP_DURATION,
} from "@/config/welcome-stages";

/**
 * Manages the welcome-screen stage progression and click-to-skip behavior.
 *
 * - Stages advance automatically after their configured duration.
 * - First click shortens the current stage to SKIP_DURATION.
 * - Second click during the shortened wait jumps immediately.
 */
export function useStageTimeline(isReady: boolean) {
  const [stage, setStage] = useState<number>(STAGE.UNROLL);
  const [skipCurrent, setSkipCurrent] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    const base = STAGE_DURATIONS[stage];
    if (base == null) return;

    const duration = skipCurrent ? SKIP_DURATION : base;
    const tid = setTimeout(() => {
      setStage((s) => s + 1);
      setSkipCurrent(false);
    }, duration);

    return () => clearTimeout(tid);
  }, [isReady, stage, skipCurrent]);

  const handleSkip = useCallback(() => {
    if (!isReady || stage >= STAGE.COMPLETE) return;
    if (skipCurrent) {
      setStage((s) => s + 1);
      setSkipCurrent(false);
    } else {
      setSkipCurrent(true);
    }
  }, [isReady, stage, skipCurrent]);

  return { stage, skipCurrent, handleSkip };
}
