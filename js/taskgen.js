export const TIRE_LEVELS = {
  1: { min: 2, max: 4 },
  2: { min: 3, max: 6 },
  3: { min: 5, max: 10 },
  4: { min: 8, max: 12 },
};
export const MAX_TIRE_LEVEL = 4;

export function genTireTask(rng, level) {
  const l = Math.max(1, Math.min(Math.floor(level), MAX_TIRE_LEVEL));
  const { min, max } = TIRE_LEVELS[l];
  const count = rng.int(min, max);
  const rackCount = Math.min(count + rng.int(2, 4), 14);
  return { type: 'tires', count, rackCount };
}

export const FUEL_LEVELS = {
  1: { min: 1, max: 5 },
  2: { min: 3, max: 8 },
  3: { min: 5, max: 10 },
  4: { min: 8, max: 15 },
};
export const MAX_FUEL_LEVEL = 4;

export function genFuelTask(rng, level) {
  const l = Math.max(1, Math.min(Math.floor(level), MAX_FUEL_LEVEL));
  const { min, max } = FUEL_LEVELS[l];
  return { type: 'fuel', target: rng.int(min, max), max: l === 4 ? 15 : 10 };
}

export const LIGHTS_OPTION_COUNT = { 1: 3, 2: 4, 3: 5, 4: 6 };
export const MAX_LIGHTS_LEVEL = 4;

export function genLightsTask(rng, level, bodyColor, palette) {
  const l = Math.max(1, Math.min(Math.floor(level), MAX_LIGHTS_LEVEL));
  const k = LIGHTS_OPTION_COUNT[l];
  const others = rng.shuffle(palette.filter(c => c !== bodyColor)).slice(0, k - 1);
  return { type: 'lights', answer: bodyColor, options: rng.shuffle([bodyColor, ...others]) };
}

export const CHARSET = ['一', '二', '三', '人', '大', '小', '上', '下', '口', '中',
  '山', '水', '火', '土', '木', '日', '月', '手', '车', '门',
  '天', '地', '你', '我', '他', '白', '云', '雨', '风', '花',
  '草', '虫', '鸟', '牛', '羊', '马', '鱼', '米', '田', '电'];
export const HANZI_POOLS = { 1: 6, 2: 12, 3: 20, 4: 40 };
export const MAX_HANZI_LEVEL = 4;

export function genHanziTask(rng, level) {
  const l = Math.max(1, Math.min(Math.floor(level), MAX_HANZI_LEVEL));
  const poolSize = HANZI_POOLS[l];
  const k = l + 1;
  const pool = Array.from({ length: poolSize }, (_, i) => i);
  const picked = rng.shuffle(pool).slice(0, k);
  const answerIndex = rng.pick(picked);
  return { type: 'hanzi', answerIndex, optionIndexes: rng.shuffle(picked) };
}

export const TRACE_POOLS = {
  1: [0, 1, 2, 3, 4],
  2: [6, 7, 8, 9, 10],
  3: [11, 12, 13, 14, 15, 16, 17, 18, 19],
  4: [20, 25, 38, 39, 26, 28, 33, 34, 35, 37],
};
export const MAX_TRACE_LEVEL = 4;

export function genTraceTask(rng, level) {
  const l = Math.max(1, Math.min(Math.floor(level), MAX_TRACE_LEVEL));
  return { type: 'trace', charIndex: rng.pick(TRACE_POOLS[l]) };
}

export const MAX_MATH_LEVEL = 5;

export function genMathTask(rng, level) {
  const l = Math.max(1, Math.min(Math.floor(level), MAX_MATH_LEVEL));
  let op, a, b;
  const plusWithin = limit => {
    a = rng.int(1, limit - 1);
    b = rng.int(1, limit - a);
    op = '+';
  };
  const minusWithin = limit => {
    a = rng.int(2, limit);
    b = rng.int(1, a - 1);
    op = '-';
  };
  const plusCarry = () => {
    a = rng.int(6, 9);
    b = rng.int(11 - a, 9);
    op = '+';
  };
  if (l === 1) plusWithin(5);
  else if (l === 2) plusWithin(10);
  else if (l === 3) minusWithin(10);
  else if (l === 4) (rng.next() < 0.5 ? plusWithin(10) : minusWithin(10));
  else plusCarry();
  const answer = op === '+' ? a + b : a - b;
  const options = [answer];
  while (options.length < 3) {
    const delta = rng.int(1, 3) * (rng.next() < 0.5 ? -1 : 1);
    const d = answer + delta;
    if (d >= 1 && d <= 20 && !options.includes(d)) options.push(d);
  }
  return { type: 'math', op, a, b, answer, options: rng.shuffle(options) };
}

export function taskSignature(key, task) {
  switch (key) {
    case 'tires': return `c${task.count}`;
    case 'fuel': return `f${task.target}`;
    case 'lights': return `l${task.answer}`;
    case 'math': return `${task.a}${task.op}${task.b}`;
    case 'hanzi': return `h${task.answerIndex}`;
    case 'trace': return `w${task.charIndex}`;
    default: return '';
  }
}
