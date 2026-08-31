export const TIRE_LEVELS = {
  1: { min: 2, max: 4 },
  2: { min: 3, max: 6 },
  3: { min: 5, max: 10 },
};
export const MAX_TIRE_LEVEL = 3;

export function genTireTask(rng, level) {
  const l = Math.max(1, Math.min(Math.floor(level), MAX_TIRE_LEVEL));
  const { min, max } = TIRE_LEVELS[l];
  const count = rng.int(min, max);
  const rackCount = Math.min(count + rng.int(2, 4), 12);
  return { type: 'tires', count, rackCount };
}

export const FUEL_LEVELS = {
  1: { min: 1, max: 5 },
  2: { min: 3, max: 8 },
  3: { min: 5, max: 10 },
};
export const MAX_FUEL_LEVEL = 3;

export function genFuelTask(rng, level) {
  const l = Math.max(1, Math.min(Math.floor(level), MAX_FUEL_LEVEL));
  const { min, max } = FUEL_LEVELS[l];
  return { type: 'fuel', target: rng.int(min, max), max: 10 };
}

export const LIGHTS_OPTION_COUNT = { 1: 3, 2: 4, 3: 5 };
export const MAX_LIGHTS_LEVEL = 3;

export function genLightsTask(rng, level, bodyColor, palette) {
  const l = Math.max(1, Math.min(Math.floor(level), MAX_LIGHTS_LEVEL));
  const k = LIGHTS_OPTION_COUNT[l];
  const others = rng.shuffle(palette.filter(c => c !== bodyColor)).slice(0, k - 1);
  return { type: 'lights', answer: bodyColor, options: rng.shuffle([bodyColor, ...others]) };
}
