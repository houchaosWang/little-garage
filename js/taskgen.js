// 1-4级每个轮胎都有带编号的虚线圈，把圈填满就算完成——其实不需要真的数。
// 5级起不画圈：自己数出N个放进框里、够了按绿勾（学前经典的"给我N个"任务，才算真懂数量）。
export const TIRE_LEVELS = {
  1: { min: 2, max: 4 },
  2: { min: 3, max: 6 },
  3: { min: 5, max: 10 },
  4: { min: 8, max: 12 },
  5: { min: 5, max: 10, mode: 'count', aloud: true }, // 每放一个还会报数
  6: { min: 8, max: 15, mode: 'count', aloud: false }, // 不报数，全靠自己数
};
export const MAX_TIRE_LEVEL = 6;
export const TIRE_RACK_MAX = { slots: 14, count: 18 };

export function genTireTask(rng, level) {
  const l = Math.max(1, Math.min(Math.floor(level), MAX_TIRE_LEVEL));
  const { min, max, mode = 'slots', aloud = true } = TIRE_LEVELS[l];
  const count = rng.int(min, max);
  const rackCount = Math.min(count + rng.int(2, 4), TIRE_RACK_MAX[mode]);
  return { type: 'tires', count, rackCount, mode, aloud };
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

// 按住加油时每个数字只停约0.83秒，而学前儿童松手的反应时间就要0.5秒上下——
// 实测最低级4局错2次，错在手慢、不在认数。所以到了目标数字后再宽限半格：
// 这半格里屏幕仍显示目标数字，松手算对；过了宽限才算加多了。
export const FUEL_RATE = 1.2;
export const FUEL_GRACE = 0.5;
export function fuelShown(level, target) {
  return level >= target + 1 && level < target + 1 + FUEL_GRACE ? target : Math.floor(level);
}
export function fuelOver(level, target) {
  return level >= target + 1 + FUEL_GRACE;
}
export function fuelHit(level, target) {
  return level >= target && level < target + 1 + FUEL_GRACE;
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
export const HANZI_POOLS = { 1: 6, 2: 12, 3: 20, 4: 40, 5: 40 };
export const MAX_HANZI_LEVEL = 5;
// 5级：干扰项专挑长得像的字（形近字），逼他看清笔画，而不是认个大概轮廓。
// 40个字每个恰好属于一组（测试里有校验）。
export const LOOKALIKE_GROUPS = ['一二三云', '人大天火', '木米水小', '上下土山', '口日田白中电虫雨',
  '月门风', '牛手羊车我', '马鸟鱼', '你他地', '花草'].map(g => [...g].map(c => CHARSET.indexOf(c)));

export function genHanziTask(rng, level) {
  const l = Math.max(1, Math.min(Math.floor(level), MAX_HANZI_LEVEL));
  const poolSize = HANZI_POOLS[l];
  const k = l + 1;
  const pool = Array.from({ length: poolSize }, (_, i) => i);
  if (l >= 5) {
    const answerIndex = rng.pick(pool);
    const group = LOOKALIKE_GROUPS.find(g => g.includes(answerIndex)) || [];
    const alike = rng.shuffle(group.filter(i => i !== answerIndex)).slice(0, k - 1);
    const rest = rng.shuffle(pool.filter(i => i !== answerIndex && !alike.includes(i)))
      .slice(0, k - 1 - alike.length);
    return { type: 'hanzi', answerIndex, optionIndexes: rng.shuffle([answerIndex, ...alike, ...rest]) };
  }
  const picked = rng.shuffle(pool).slice(0, k);
  const answerIndex = rng.pick(picked);
  return { type: 'hanzi', answerIndex, optionIndexes: rng.shuffle(picked) };
}

export const TRACE_POOLS = {
  1: [0, 1, 2, 3, 4],
  2: [6, 7, 8, 9, 10],
  3: [11, 12, 13, 14, 15, 16, 17, 18, 19],
  4: [20, 25, 38, 39, 26, 28, 33, 34, 35, 37],
  5: [21, 22, 23, 24, 27, 29, 30, 31, 32, 36], // 笔画更多：地你我他雨花草虫鸟鱼
};
export const MAX_TRACE_LEVEL = 5;

export function genTraceTask(rng, level) {
  const l = Math.max(1, Math.min(Math.floor(level), MAX_TRACE_LEVEL));
  return { type: 'trace', charIndex: rng.pick(TRACE_POOLS[l]) };
}

// 算数六级：内容和"想法"一起往上走——先允许一个一个数，再逼他"接着往后数"，最后"凑十"。
//   1  5以内加法，石头全摆出来（一个一个数没问题，这是起点）
//   2  10以内加法，石头五个一排（开始"看出"5和2，而不是数7下）
//   3  10以内加法，第一个数的石头装进桶、桶上写着数：数不到桶里的，只能从桶上的数接着往后数
//   4  10以内减法，桶里装着总数，拿出去几个，桶里还剩几个
//   5  10以内加减混合，桶；加法允许小数在前（练"从大的数开始数"）
//   6  20以内进位加法，十格框（凑十法）
export const MAX_MATH_LEVEL = 6;
export const MATH_MODES = { 1: 'visible', 2: 'visible', 3: 'bucket', 4: 'bucket', 5: 'bucket', 6: 'tenframe' };

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
  else if (l === 3) {
    plusWithin(10);
    if (a < b) [a, b] = [b, a]; // 刚学接着往后数：桶里放大的那个数，桶外要接着数的少
  } else if (l === 4) minusWithin(10);
  else if (l === 5) (rng.next() < 0.5 ? plusWithin(10) : minusWithin(10));
  else plusCarry();
  const answer = op === '+' ? a + b : a - b;
  const options = [answer];
  while (options.length < 3) {
    const delta = rng.int(1, 3) * (rng.next() < 0.5 ? -1 : 1);
    const d = answer + delta;
    if (d >= 1 && d <= 20 && !options.includes(d)) options.push(d);
  }
  return { type: 'math', op, a, b, answer, options: rng.shuffle(options), mode: MATH_MODES[l] };
}

// 新形状只能往后加：前面各级的候选池是 SHAPE_SET 的前缀
export const SHAPE_SET = ['circle', 'square', 'triangle', 'star', 'ellipse', 'diamond', 'trapezoid', 'rectangle', 'hexagon'];
export const SHAPES_LEVELS = {
  1: { k: 2, pool: 3 },
  2: { k: 3, pool: 4 },
  3: { k: 4, pool: 5 },
  4: { k: 4, pool: 7 },
  5: { k: 5, pool: 9 }, // 新增长方形、六边形：和正方形、圆形最容易看混
  6: { k: 5, pool: 9, rotate: true }, // 零件转了方向、孔还是正的：认形状不能只认"摆正的样子"
};
export const MAX_SHAPES_LEVEL = 6;
// 只转 90/180/270 度：转 45 度的正方形就是菱形，题目本身会出现歧义
export const SHAPE_ROTATIONS = [90, 180, 270];

export function genShapesTask(rng, level) {
  const l = Math.max(1, Math.min(Math.floor(level), MAX_SHAPES_LEVEL));
  const { k, pool, rotate = false } = SHAPES_LEVELS[l];
  const shapes = rng.shuffle(SHAPE_SET.slice(0, pool)).slice(0, k);
  const task = { type: 'shapes', shapes, tray: rng.shuffle(shapes) };
  if (rotate) task.rotations = task.tray.map(() => rng.pick(SHAPE_ROTATIONS));
  return task;
}

export const COMPARE_LEVELS = {
  1: { n: 2, ratio: 2.2, kinds: ['big', 'small'] },
  2: { n: 3, ratio: 1.7, kinds: ['big', 'small'] },
  3: { n: 3, ratio: 1.5, kinds: ['long', 'short'] },
  4: { n: 4, ratio: 1.25, kinds: ['big', 'small', 'long', 'short'] },
  5: { n: 5, ratio: 1.17, kinds: ['big', 'small', 'long', 'short'] }, // 更多、更接近
  // 不对齐：管子起点各不相同、尾翼高低错开——只看哪头伸得远、哪个顶得高就会上当
  //（一年级"比长短要把一端对齐"的反面，逼他比真正的长短和大小）
  6: { n: 4, ratio: 1.3, kinds: ['big', 'small', 'long', 'short'], stagger: 1.1 },
};
export const MAX_COMPARE_LEVEL = 6;

// 错位以"一个单位尺寸"计（游戏里再乘像素：管子横向、尾翼纵向）。
// 陷阱：找最大/最长时，有别的"伸得更远/顶得更高"；找最小/最短时，有别的"收得更早/顶得更低"。
export function staggerTrap(sizes, offsets, answerIdx, wantMax) {
  const reach = i => sizes[i] + offsets[i];
  return sizes.some((_, j) => j !== answerIdx
    && (wantMax ? reach(j) > reach(answerIdx) : reach(j) < reach(answerIdx)));
}

function staggerOffsets(rng, sizes, answerIdx, wantMax, range) {
  for (let t = 0; t < 30; t++) {
    const off = sizes.map(() => Math.round(rng.next() * range * 100) / 100);
    if (staggerTrap(sizes, off, answerIdx, wantMax)) return off;
  }
  // 兜底：答案贴一端、次优项顶到另一端，陷阱必然成立
  const off = sizes.map(() => Math.round((range / 2) * 100) / 100);
  const runnerUp = sizes.map((_, i) => i).filter(i => i !== answerIdx)
    .sort((a, b) => (wantMax ? sizes[b] - sizes[a] : sizes[a] - sizes[b]))[0];
  off[answerIdx] = wantMax ? 0 : range;
  off[runnerUp] = wantMax ? range : 0;
  return off;
}

export function genCompareTask(rng, level) {
  const l = Math.max(1, Math.min(Math.floor(level), MAX_COMPARE_LEVEL));
  const { n, ratio, kinds, stagger = 0 } = COMPARE_LEVELS[l];
  const kind = rng.pick(kinds);
  const sizes = rng.shuffle(Array.from({ length: n }, (_, i) => Math.pow(ratio, i)));
  const wantMax = kind === 'big' || kind === 'long';
  const answerIdx = sizes.indexOf(wantMax ? Math.max(...sizes) : Math.min(...sizes));
  const task = { type: 'compare', kind, n, sizes, answerIdx };
  if (stagger) task.offsets = staggerOffsets(rng, sizes, answerIdx, wantMax, stagger);
  return task;
}

export function taskSignature(key, task) {
  switch (key) {
    case 'tires': return `c${task.count}`;
    case 'fuel': return `f${task.target}`;
    case 'lights': return '';
    case 'math': return `${task.a}${task.op}${task.b}`;
    case 'hanzi': return `h${task.answerIndex}`;
    case 'trace': return `w${task.charIndex}`;
    case 'shapes': return 's' + [...task.shapes].sort().join('.');
    case 'compare': return task.kind + task.n + '-' + task.answerIdx;
    default: return '';
  }
}
