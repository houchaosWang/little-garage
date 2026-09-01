export const MIN_LEVEL = 1;
const STEP_DOWN = 0.5;

export function createSkill(level = MIN_LEVEL) {
  return { level, streak: 0 };
}

export function effectiveLevel(skill, maxLevel) {
  return Math.max(MIN_LEVEL, Math.min(Math.floor(skill.level), maxLevel));
}

export function recordOutcome(skill, outcome, maxLevel, { allowDemote = true } = {}) {
  const clean = outcome.errors === 0 && outcome.helps === 0;
  let { level, streak } = skill;
  if (clean) {
    streak += 1;
    if (streak >= 2 && Math.floor(level) < maxLevel) {
      level = Math.floor(level) + 1;
      streak = 0;
    } else if (streak >= 2) {
      streak = 0;
    }
  } else {
    streak = 0;
    if (allowDemote && (outcome.errors >= 2 || outcome.helps >= 1)) {
      level = Math.max(MIN_LEVEL, level - STEP_DOWN);
    }
  }
  return { level, streak };
}
