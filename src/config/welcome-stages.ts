export const STAGE = {
  UNROLL: 0,
  ATMOSPHERE: 1,
  SWORD: 2,
  STARBURST: 3,
  BURN: 4,
  SUBTITLE: 5,
  MENU: 6,
  COMPLETE: 7,
} as const;

export const STAGE_DURATIONS: Partial<Record<number, number>> = {
  [STAGE.UNROLL]: 2700,
  [STAGE.ATMOSPHERE]: 1050,
  [STAGE.SWORD]: 350,
  [STAGE.STARBURST]: 3500,
  [STAGE.BURN]: 3000,
  [STAGE.SUBTITLE]: 0,
  [STAGE.MENU]: 3000,
};

export const SKIP_DURATION = 100;

/**
 * Returns the appropriate CSS class based on current stage and skip state.
 *
 * Covers the recurring pattern: play animation when at target stage,
 * show finished state when past it, show default when before it.
 */
export function stageClass(
  stage: number,
  target: number,
  skipCurrent: boolean,
  animateClass: string,
  doneClass: string,
  defaultClass = "",
): string {
  if (stage === target) return skipCurrent ? doneClass : animateClass;
  if (stage > target) return doneClass;
  return defaultClass;
}
