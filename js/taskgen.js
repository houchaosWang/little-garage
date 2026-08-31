export const TIRE_LEVELS = {
  1: { min: 2, max: 4 },
  2: { min: 3, max: 6 },
  3: { min: 5, max: 10 },
};
export const MAX_TIRE_LEVEL = 3;

export function genTireTask(rng, level) {
  const l = Math.max(1, Math.min(level, MAX_TIRE_LEVEL));
  const { min, max } = TIRE_LEVELS[l];
  const count = rng.int(min, max);
  const rackCount = Math.min(count + rng.int(2, 4), 12);
  return { type: 'tires', count, rackCount };
}
