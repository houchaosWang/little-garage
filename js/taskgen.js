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

// ── 闪灯看数（速视）──
// 灯只亮一下（毫秒级），来不及一个个数。1级随意摆1-3个（感知性速视）；之后都用有结构的摆法
// （骰子点、十格阵），练"一眼看出5和几"（概念性速视，Clements & Sarama）；5级两组合起来；
// 6级十格阵看还差几个满十（凑十的基础）。
export const SUBITIZE_LEVELS = {
  1: { min: 1, max: 3, layout: 'scatter', ms: 2000, ask: 'count' },
  2: { min: 2, max: 5, layout: 'dice', ms: 1500, ask: 'count' },
  3: { min: 4, max: 7, layout: 'five', ms: 1300, ask: 'count' },
  4: { min: 6, max: 10, layout: 'ten', ms: 1200, ask: 'count' },
  5: { min: 4, max: 10, layout: 'twodice', ms: 1500, ask: 'sum' },
  6: { min: 5, max: 9, layout: 'ten', ms: 1200, ask: 'complement' },
};
export const MAX_SUBITIZE_LEVEL = 6;
// 1级随意摆的区域（游戏里居中放进仪表盘）；灯半径24，任意两灯中心至少相距48才不重叠
export const SCATTER_BOX = { w: 360, h: 150 };

// 三个选项：答案 + 两个相差1~3的干扰项，都在[lo, hi]里、不重复
export function numberOptions(rng, answer, lo, hi) {
  const opts = [answer];
  for (let guard = 0; opts.length < 3 && guard < 100; guard++) {
    const d = answer + rng.int(1, 3) * (rng.next() < 0.5 ? -1 : 1);
    if (d >= lo && d <= hi && !opts.includes(d)) opts.push(d);
  }
  for (let v = lo; opts.length < 3 && v <= hi; v++) if (!opts.includes(v)) opts.push(v);
  return rng.shuffle(opts);
}

function scatterSpots(rng, n) {
  // 3列×2行的格子里挑n格、格内轻微抖动：看着随意，又保证两灯不重叠
  const cells = rng.shuffle([0, 1, 2, 3, 4, 5]).slice(0, n);
  const r2 = v => Math.round(v * 100) / 100;
  return cells.map(c => {
    const col = c % 3, row = Math.floor(c / 3);
    return [r2((col + 0.5 + (rng.next() - 0.5) * 0.4) / 3), r2((row + 0.5 + (rng.next() - 0.5) * 0.2) / 2)];
  });
}

export function genSubitizeTask(rng, level) {
  const l = Math.max(1, Math.min(Math.floor(level), MAX_SUBITIZE_LEVEL));
  const { min, max, layout, ms, ask } = SUBITIZE_LEVELS[l];
  const n = rng.int(min, max);
  const task = { type: 'subitize', layout, ms, ask, n };
  if (layout === 'scatter') task.spots = scatterSpots(rng, n);
  if (layout === 'twodice') {
    const a = rng.int(Math.max(1, n - 5), Math.min(5, n - 1));
    task.parts = [a, n - a];
  }
  task.answer = ask === 'complement' ? 10 - n : n;
  task.options = numberOptions(rng, task.answer, 1, 10);
  return task;
}

// ── 找规律 ──
// 延伸 → 补空 → 抽象（换一种材料摆出同样的规律）→ 找出重复单元；单元 AB → AAB/ABB → ABC/AABB。
// （Rittle-Johnson 等：学前重复规律能力预测到小学四到六年级的数学成绩；指南5-6岁"能发现事物简单的排列规律"，
//  教育建议举的正是"按颜色间隔排列的瓷砖、按形状间隔排列的珠帘"——所以先颜色后形状。）
export const PATTERN_VALUES = {
  color: ['red', 'blue', 'yellow', 'green'],
  shape: ['circle', 'square', 'triangle', 'star'],
};
export const PATTERN_LEVELS = {
  1: { kind: 'extend', attr: 'color', units: ['AB'], opts: 2 },
  2: { kind: 'extend', attr: 'color', units: ['AAB', 'ABB'], opts: 3 },
  3: { kind: 'extend', attr: 'color', units: ['ABC', 'AABB'], opts: 3 },
  4: { kind: 'complete', attr: 'shape', units: ['AB', 'AAB', 'ABB', 'ABC'], opts: 3 },
  5: { kind: 'abstract', attr: 'color', units: ['AB', 'AAB', 'ABB', 'ABC'], opts: 3 },
  6: { kind: 'unit', attr: 'color', units: ['AAB', 'ABB', 'AABB', 'ABC'], opts: 3 },
};
export const MAX_PATTERN_LEVEL = 6;

// 把一排东西规范成字母结构：红红蓝红红蓝 → AABAAB。两排"规律一样"就是结构一样，材料可以不同。
export function patternShape(seq) {
  const map = new Map();
  return seq.map(v => {
    if (!map.has(v)) map.set(v, String.fromCharCode(65 + map.size));
    return map.get(v);
  }).join('');
}

function pickOptions(rng, answer, used, pool, n) {
  const opts = [answer];
  for (const v of rng.shuffle(used)) if (opts.length < n && !opts.includes(v)) opts.push(v);
  for (const v of rng.shuffle(pool)) if (opts.length < n && !opts.includes(v)) opts.push(v);
  return rng.shuffle(opts);
}

export function genPatternTask(rng, level) {
  const l = Math.max(1, Math.min(Math.floor(level), MAX_PATTERN_LEVEL));
  const cfg = PATTERN_LEVELS[l];
  const unit = rng.pick(cfg.units);
  const nLetters = new Set(unit).size;
  const vals = rng.shuffle(PATTERN_VALUES[cfg.attr]).slice(0, nLetters);
  const unitVals = [...unit].map(ch => vals[ch.charCodeAt(0) - 65]);
  const repeat = len => Array.from({ length: len }, (_, i) => unitVals[i % unit.length]);
  const task = { type: 'pattern', kind: cfg.kind, attr: cfg.attr, unit };
  if (cfg.kind === 'extend') {
    const k = rng.int(0, unit.length - 1); // 最后一段露出几个：下一个不总是"第一个"
    task.items = [...repeat(2 * unit.length + k), null];
    const answer = unitVals[k];
    task.options = pickOptions(rng, answer, vals, PATTERN_VALUES[cfg.attr], cfg.opts);
    task.answerIdx = task.options.indexOf(answer);
  } else if (cfg.kind === 'complete') {
    const full = repeat(3 * unit.length);
    const miss = rng.int(unit.length, full.length - 1); // 第一段保持完整，看得出规律
    task.items = full.map((v, i) => (i === miss ? null : v));
    task.options = pickOptions(rng, full[miss], vals, PATTERN_VALUES[cfg.attr], cfg.opts);
    task.answerIdx = task.options.indexOf(full[miss]);
  } else if (cfg.kind === 'abstract') {
    // 上面彩灯、下面形状：找结构一样的那一排（换材料的抽象，最能让孩子盯住"单元"）
    task.model = repeat(2 * unit.length);
    const shapes = rng.shuffle(PATTERN_VALUES.shape);
    const len = task.model.length;
    const build = u => Array.from({ length: len }, (_, i) => shapes[u.charCodeAt(i % u.length) - 65]);
    const target = patternShape(task.model);
    const rows = [build(unit)];
    for (const u of rng.shuffle(['AB', 'AAB', 'ABB', 'ABC', 'AABB', 'ABBC'])) {
      if (rows.length >= cfg.opts) break;
      const r = build(u);
      const s = patternShape(r);
      if (s !== target && !rows.some(x => patternShape(x) === s)) rows.push(r);
    }
    task.options = rng.shuffle(rows);
    task.answerIdx = task.options.findIndex(r => patternShape(r) === target);
  } else {
    // 找单元：一长串里哪一小段在重复（选项：正确单元 / 少一个 / 多一个）
    task.items = repeat(3 * unit.length);
    task.options = rng.shuffle([unitVals, unitVals.slice(0, unit.length - 1), [...unitVals, unitVals[0]]]);
    task.answerIdx = task.options.indexOf(unitVals);
  }
  return task;
}

// ── 数字赛道 ──
// Siegler & Ramani (2008, 2009)：1-10 的直线数字棋盘、走的时候说出格子上的数（"7、8"而不是"1、2"），
// 四次15-20分钟就提升数大小比较、数轴估计、计数、认数字，9周后仍在；环形棋盘、只有颜色的棋盘都不行。
// Siegler & Booth (2004)：数轴估计从"对数式"走向"线性式"，准确度与数学成绩强相关——
// 学前先练 0-10、0-20（0-100 要到一二年级才普遍线性）。
export const NUMLINE_LEVELS = {
  1: { kind: 'race', end: 10, spin: [1, 2], predict: false }, // 点赛车一格一格走，每格报数
  2: { kind: 'race', end: 10, spin: [1, 3], predict: true }, // 转完先猜停在哪一格
  3: { kind: 'race', end: 20, spin: [2, 4], predict: true },
  4: { kind: 'estimate', end: 10, rounds: 3, tol: 0.8 }, // 数字擦掉了，只剩两头：7在哪里？
  5: { kind: 'estimate', end: 20, rounds: 3, tol: 1.5 },
  6: { kind: 'left', end: 20, rounds: 3 }, // 赛车在13，还差几格到终点？
};
export const MAX_NUMLINE_LEVEL = 6;

export function genNumlineTask(rng, level) {
  const l = Math.max(1, Math.min(Math.floor(level), MAX_NUMLINE_LEVEL));
  const cfg = NUMLINE_LEVELS[l];
  const task = { type: 'numline', kind: cfg.kind, end: cfg.end };
  if (cfg.kind === 'race') {
    // 整局的转盘结果先掷好（可复现、可测）；从第1格出发，跑到终点为止
    const spins = [];
    let pos = 1;
    while (pos < cfg.end && spins.length < 30) {
      const s = rng.int(cfg.spin[0], cfg.spin[1]);
      spins.push(s);
      pos = Math.min(cfg.end, pos + s);
    }
    task.spins = spins;
    task.predict = cfg.predict;
  } else if (cfg.kind === 'estimate') {
    // 避开紧挨两头的数（太容易），三轮不重复
    task.targets = rng.shuffle(Array.from({ length: cfg.end - 3 }, (_, i) => i + 2)).slice(0, cfg.rounds);
    task.tol = cfg.tol;
  } else {
    task.positions = rng.shuffle(Array.from({ length: 11 }, (_, i) => i + 8)).slice(0, cfg.rounds);
    task.options = task.positions.map(p => numberOptions(rng, cfg.end - p, 1, 15));
  }
  return task;
}

// ── 停车场故事题（CGI 认知指导教学）──
// 四类加减情境：合并、分离、部分-整体、比较；未知数放在"结果/变化/起点"难度不同。幼儿先"直接建模"
// （照故事摆出来数），再到接着数、推理。指南5-6岁："借助实际情境和操作（如合并或拿取）理解'加'和'减'的
// 实际意义"，教育建议原例"家里来了5位客人，桌子上只有3个杯子，还需要几个杯子"；2024人教版一下
// 《数量间的加减关系》：求一个数比另一个数多（少）几、求比一个数多（少）几的数。
// 统一表示成算式 x op y = z（讲解最后念出来）。
export const STORY_LEVELS = {
  1: { kind: 'join', max: 5 }, // 又开来了几辆，现在一共几辆？
  2: { kind: 'separate', max: 10 }, // 开走了几辆，还剩几辆？
  3: { kind: 'hidden', max: 10 }, // 一共几辆、外面几辆，车库里藏着几辆？（部分-整体 / 分与合）
  4: { kind: 'change', max: 10 }, // 开来了一些，现在几辆，开来了几辆？（变化未知）
  5: { kind: 'compare', max: 10 }, // 红车比蓝车多几辆？（一一对应）
  6: { kind: 'compareq', max: 10 }, // 蓝车比红车多/少几辆，蓝车有几辆？
};
export const MAX_STORY_LEVEL = 6;

export function genStoryTask(rng, level) {
  const l = Math.max(1, Math.min(Math.floor(level), MAX_STORY_LEVEL));
  const { kind, max } = STORY_LEVELS[l];
  let x;
  let y;
  let z;
  let op;
  const extra = {};
  if (kind === 'join') { x = rng.int(1, max - 1); y = rng.int(1, max - x); op = '+'; z = x + y; }
  else if (kind === 'separate' || kind === 'hidden' || kind === 'compare') { x = rng.int(3, max); y = rng.int(1, x - 1); op = '-'; z = x - y; }
  else if (kind === 'change') { x = rng.int(1, max - 2); z = rng.int(x + 1, max); op = '+'; y = z - x; }
  else {
    const more = rng.next() < 0.5;
    x = rng.int(2, 8);
    y = Math.min(rng.int(1, 3), more ? max - x : x - 1);
    op = more ? '+' : '-';
    z = more ? x + y : x - y;
    extra.more = more;
  }
  const answer = kind === 'change' ? y : z;
  return { type: 'story', kind, x, op, y, z, answer, options: numberOptions(rng, answer, 1, 10), ...extra };
}

// ── 零件分拣（分类 + 规则切换）──
// 指南4-5岁"能感知和发现常见几何图形的基本特征，并能进行分类"，教育建议"按形状分类整理物品"；
// DCCS（Zelazo）：先按颜色分、再换按形状分——多数3岁孩子换不过来、4-5岁多数能过；
// 按线索每题换规则（有金边按形状、没金边按颜色）更难。练的是分类，也是认知灵活性（执行功能）。
// 5级不告诉规则，看筐里的示例自己猜（归纳推理）；6级两个特征交叉分（二级分类）。
export const SORT_LEVELS = {
  1: { kind: 'one', rule: 'color' },
  2: { kind: 'one', rule: 'shape' },
  3: { kind: 'switch' },
  4: { kind: 'border' },
  5: { kind: 'guess' },
  6: { kind: 'cross' },
};
export const MAX_SORT_LEVEL = 6;
export const SORT_COLORS = ['red', 'blue', 'yellow', 'green'];
export const SORT_SHAPES = ['circle', 'square', 'triangle', 'star'];
const part = (color, shape, size = 'mid', extra = {}) => ({ color, shape, size, ...extra });

export function genSortTask(rng, level) {
  const l = Math.max(1, Math.min(Math.floor(level), MAX_SORT_LEVEL));
  const cfg = SORT_LEVELS[l];
  const [c1, c2] = rng.shuffle(SORT_COLORS).slice(0, 2);
  const [s1, s2] = rng.shuffle(SORT_SHAPES).slice(0, 2);
  const task = { type: 'sort', kind: cfg.kind };
  if (cfg.kind === 'one') {
    task.rule = cfg.rule;
    const byColor = cfg.rule === 'color';
    task.bins = byColor ? [{ color: c1 }, { color: c2 }] : [{ shape: s1 }, { shape: s2 }];
    task.items = rng.shuffle([0, 0, 1, 1]).map(b => (byColor ? part([c1, c2][b], s1, 'mid', { bin: b }) : part(c1, [s1, s2][b], 'mid', { bin: b })));
  } else if (cfg.kind === 'switch' || cfg.kind === 'border') {
    // 经典 DCCS：目标卡"c1s1""c2s2"，测试卡"c1s2""c2s1"——按颜色和按形状会进不同的筐
    task.bins = [{ color: c1, shape: s1 }, { color: c2, shape: s2 }];
    const cards = [{ color: c1, shape: s2 }, { color: c2, shape: s1 }];
    const binFor = (cd, rule) => (rule === 'color' ? (cd.color === c1 ? 0 : 1) : (cd.shape === s1 ? 0 : 1));
    if (cfg.kind === 'switch') {
      const pre = rng.shuffle([...cards, rng.pick(cards)]);
      const post = rng.shuffle([...cards, rng.pick(cards)]);
      task.items = [
        ...pre.map(cd => part(cd.color, cd.shape, 'mid', { rule: 'color', bin: binFor(cd, 'color') })),
        ...post.map(cd => part(cd.color, cd.shape, 'mid', { rule: 'shape', bin: binFor(cd, 'shape') })),
      ];
      task.switchAt = pre.length;
    } else {
      task.items = rng.shuffle(['color', 'color', 'color', 'shape', 'shape', 'shape']).map(rule => {
        const cd = rng.pick(cards);
        return part(cd.color, cd.shape, 'mid', { rule, border: rule === 'shape', bin: binFor(cd, rule) });
      });
    }
  } else if (cfg.kind === 'guess') {
    // 每个筐里两件示例：只有"规则那一项"一样，另外两项在筐内都不同——才猜得出是按什么分的
    const rule = rng.pick(['color', 'shape', 'size']);
    task.rule = rule;
    const EX = {
      color: [[part(c1, s1, 'big'), part(c1, s2, 'small')], [part(c2, s2, 'big'), part(c2, s1, 'small')]],
      shape: [[part(c1, s1, 'big'), part(c2, s1, 'small')], [part(c2, s2, 'big'), part(c1, s2, 'small')]],
      size: [[part(c1, s1, 'big'), part(c2, s2, 'big')], [part(c2, s1, 'small'), part(c1, s2, 'small')]],
    };
    task.bins = EX[rule].map(examples => ({ examples }));
    const key = { color: [c1, c2], shape: [s1, s2], size: ['big', 'small'] }[rule];
    task.items = rng.shuffle([0, 0, 1, 1]).map(b => part(
      rule === 'color' ? key[b] : rng.pick([c1, c2]),
      rule === 'shape' ? key[b] : rng.pick([s1, s2]),
      rule === 'size' ? key[b] : rng.pick(['big', 'small']),
      { bin: b },
    ));
  } else {
    task.bins = [{ color: c1, shape: s1 }, { color: c1, shape: s2 }, { color: c2, shape: s1 }, { color: c2, shape: s2 }];
    task.items = rng.shuffle([0, 1, 2, 3, rng.int(0, 3), rng.int(0, 3)]).map(b => part(task.bins[b].color, task.bins[b].shape, 'mid', { bin: b }));
  }
  return task;
}

// ── 方位 ──
// 指南目标3：3-4岁理解上下、前后、里外；4-5岁用上下、前后、里外、中间、旁边描述位置；
// 5-6岁"能按语言指示或根据简单示意图正确取放物品""能辨别自己的左右"。教育建议原例：按指令找宝——
// 小的按语言指令，大的按简单示意图。空间语言训练（4-6岁练前后左右）能提升数量大小理解；"左右"最难，放后面。
// 参照物：前后用"有车头的车"（车头朝左：车灯那边是前面）；左右用对称的工具箱（不会和前后打架）。
export const SPATIAL_LEVELS = {
  1: { scene: 'car', words: ['up', 'down'], rounds: 3, steps: 1 },
  2: { scene: 'box', words: ['in', 'out', 'side'], rounds: 3, steps: 1 },
  3: { scene: 'car', words: ['front', 'back', 'up', 'down'], rounds: 3, steps: 1 },
  4: { scene: 'box', words: ['left', 'right'], rounds: 3, steps: 1 },
  5: { scene: 'car', words: ['up', 'down', 'front', 'back'], rounds: 2, steps: 2 }, // 两步指令（先……再……）
  6: { scene: 'car', words: ['up', 'down', 'front', 'back'], rounds: 2, steps: 2, map: true }, // 照小图摆
};
export const MAX_SPATIAL_LEVEL = 6;
export const SPATIAL_OBJECTS = ['wrench', 'tire', 'can', 'flag'];

export function genSpatialTask(rng, level) {
  const l = Math.max(1, Math.min(Math.floor(level), MAX_SPATIAL_LEVEL));
  const cfg = SPATIAL_LEVELS[l];
  let words;
  if (cfg.steps === 1) {
    if (cfg.words.length === 2) words = rng.shuffle([...cfg.words, rng.pick(cfg.words)]); // 两个词都出现，又不是死板交替
    else if (l === 3) words = rng.shuffle(['front', 'back', rng.pick(['up', 'down'])]); // 前、后一定都练到
    else words = rng.shuffle(cfg.words).slice(0, cfg.rounds);
  }
  const rounds = [];
  for (let r = 0; r < cfg.rounds; r++) {
    const objs = rng.shuffle(SPATIAL_OBJECTS).slice(0, cfg.steps);
    const ws = cfg.steps === 1 ? [words[r]] : rng.shuffle(cfg.words).slice(0, cfg.steps); // 一轮里两个地方不同
    rounds.push(objs.map((obj, i) => ({ obj, word: ws[i] })));
  }
  return { type: 'spatial', scene: cfg.scene, map: !!cfg.map, rounds };
}

// ── 车名拍拍（音节意识 → 一字一音 → 音节删除 → 语素） ──
// 依据（原文/摘要已核对，详见 docs/phase6-design-rationale.md 第七节）：Pan 等 2016 八年追踪——4-6岁的音节意识
// 独特预测后来的语素意识和11岁的汉字读写；McBride-Chang 等 2003——语素意识独特预测幼儿识字；
// 音节删除用 Shu 等 2008 的做法（双音节词去掉第一个或第二个音节）；Anthony 等 2003——同一单位里"删除"最难，
// 所以先拍（切分）、再对字、最后才删。指南5-6岁"知道文字表示一定的意义"，教育建议"使幼儿知道说的话可以用文字记录下来"。
// s：每个字一个音节语音 syl-拼音声调（多音字用同音无歧义字生成，见 gen-voice.py）；v：整词语音 vn-*（自然语调）。
export const SYL_WORDS = [
  { w: '警车', s: ['jing3', 'che1'], v: 'jingche', pic: 'police' },
  { w: '赛车', s: ['sai4', 'che1'], v: 'saiche', pic: 'race' },
  { w: '铲车', s: ['chan3', 'che1'], v: 'chanche', pic: 'loader' },
  { w: '火车', s: ['huo3', 'che1'], v: 'huoche' },
  { w: '吊车', s: ['diao4', 'che1'], v: 'diaoche' },
  { w: '汽车', s: ['qi4', 'che1'], v: 'qiche' },
  { w: '救护车', s: ['jiu4', 'hu4', 'che1'], v: 'jiuhuche', pic: 'ambulance' },
  { w: '消防车', s: ['xiao1', 'fang2', 'che1'], v: 'xiaofangche', pic: 'fire' },
  { w: '翻斗车', s: ['fan1', 'dou3', 'che1'], v: 'fandouche', pic: 'dump' },
  { w: '挖掘机', s: ['wa1', 'jue2', 'ji1'], v: 'wajueji', pic: 'digger' },
  { w: '搅拌车', s: ['jiao3', 'ban4', 'che1'], v: 'jiaobanche', pic: 'mixer' },
  { w: '洒水车', s: ['sa3', 'shui3', 'che1'], v: 'sashuiche' },
  { w: '垃圾车', s: ['la1', 'ji1', 'che1'], v: 'lajiche' },
  { w: '公交车', s: ['gong1', 'jiao1', 'che1'], v: 'gongjiaoche' },
  { w: '出租车', s: ['chu1', 'zu1', 'che1'], v: 'chuzuche' },
  { w: '摩托车', s: ['mo2', 'tuo1', 'che1'], v: 'motuoche' },
  { w: '公共汽车', s: ['gong1', 'gong4', 'qi4', 'che1'], v: 'gonggongqiche' },
  { w: '电动汽车', s: ['dian4', 'dong4', 'qi4', 'che1'], v: 'diandongqiche' },
  { w: '冰淇淋车', s: ['bing1', 'qi2', 'lin2', 'che1'], v: 'bingqilinche' },
  { w: '双层巴士', s: ['shuang1', 'ceng2', 'ba1', 'shi4'], v: 'shuangcengbashi' },
  // 车字在前：车上的东西（第6级）
  { w: '车灯', s: ['che1', 'deng1'], v: 'chedeng', part: true },
  { w: '车轮', s: ['che1', 'lun2'], v: 'chelun', part: true },
  { w: '车门', s: ['che1', 'men2'], v: 'chemen', part: true },
  { w: '车窗', s: ['che1', 'chuang1'], v: 'chechuang', part: true },
  { w: '车顶', s: ['che1', 'ding3'], v: 'cheding', part: true },
  { w: '车牌', s: ['che1', 'pai2'], v: 'chepai', part: true },
];
export const sylWord = w => SYL_WORDS.find(x => x.w === w);

export const SYLLABLE_LEVELS = {
  1: { kind: 'clap' }, // 拍车名：8种车（有图），2个字、3个字都练到
  2: { kind: 'sign' }, // 找牌子：三块牌子2/3/4个字——几个音就是几个字
  3: { kind: 'point' }, // 指着念：问"'防'是哪个字"，两轮3个字、最后一轮4个字
  4: { kind: 'del', where: 'edge' }, // 去头去尾：一轮两个字（Shu 2008 格式）+两轮三个字
  5: { kind: 'del', where: 'mid' }, // 去中间：两轮中间（要同时记住两头）+一轮头尾
  6: { kind: 'head' }, // 是不是车：3个"X车"+3个"车X"，车字在后是车、在前是车上的东西
};
export const MAX_SYLLABLE_LEVEL = 6;

// 删除题的三个选项（都是音节下标序列，念出来给他听）：正确的剩余、被去掉的那个字、删错了位置（两个字时是整词没删）
export function deletionOptions(rng, word, drop) {
  const n = word.s.length;
  const all = [...Array(n).keys()];
  const rest = d => all.filter(i => i !== d);
  const correct = rest(drop);
  const other = n === 2 ? all : rest(drop === 0 ? n - 1 : 0);
  const options = rng.shuffle([correct, [drop], other]);
  return { options, answer: options.indexOf(correct) };
}

export function genSyllableTask(rng, level) {
  const l = Math.max(1, Math.min(Math.floor(level), MAX_SYLLABLE_LEVEL));
  const cfg = SYLLABLE_LEVELS[l];
  const vehicles = SYL_WORDS.filter(x => !x.part);
  const byLen = n => vehicles.filter(x => x.s.length === n);
  if (cfg.kind === 'clap') {
    const pics = vehicles.filter(x => x.pic);
    const two = rng.pick(pics.filter(x => x.s.length === 2));
    const three = rng.pick(pics.filter(x => x.s.length === 3));
    const third = rng.pick(pics.filter(x => x !== two && x !== three));
    return { type: 'syllable', kind: 'clap', rounds: rng.shuffle([two, three, third]).map(x => ({ word: x.w })) };
  }
  if (cfg.kind === 'sign') {
    // 每轮三块牌子正好2、3、4个字；三轮的目标长度各不相同。牌子几乎都以"车"结尾，认得"车"也帮不上忙
    const rounds = rng.shuffle([2, 3, 4]).map(n => {
      const signs = [2, 3, 4].map(k => rng.pick(byLen(k)).w);
      return { word: signs[n - 2], signs: rng.shuffle(signs) };
    });
    return { type: 'syllable', kind: 'sign', rounds };
  }
  if (cfg.kind === 'point') {
    // 从不问他已经认得的字（车、水、电……）：认出字形就能答，练不到"第几个音=第几个字"
    const picks = [...rng.shuffle(byLen(3)).slice(0, 2), rng.pick(byLen(4))];
    const rounds = picks.map(x => {
      const idxs = [...x.w].map((_, i) => i).filter(i => !CHARSET.includes(x.w[i]));
      return { word: x.w, ask: rng.pick(idxs) };
    });
    return { type: 'syllable', kind: 'point', rounds };
  }
  if (cfg.kind === 'del') {
    const picks = cfg.where === 'edge'
      ? [rng.pick(byLen(2)), ...rng.shuffle(byLen(3)).slice(0, 2)]
      : rng.shuffle(byLen(3)).slice(0, 3);
    const rounds = picks.map((x, r) => {
      const n = x.s.length;
      const drop = cfg.where === 'mid' && r < 2 ? 1 : rng.pick([0, n - 1]);
      return { word: x.w, drop, ...deletionOptions(rng, x, drop) };
    });
    return { type: 'syllable', kind: 'del', where: cfg.where, rounds: rng.shuffle(rounds) };
  }
  const cars = rng.shuffle(vehicles.filter(x => x.w.endsWith('车') && x.w.length <= 3)).slice(0, 3);
  const parts = rng.shuffle(SYL_WORDS.filter(x => x.part)).slice(0, 3);
  return { type: 'syllable', kind: 'head', items: rng.shuffle([...cars, ...parts]).map(x => ({ word: x.w, car: !x.part })) };
}

export function taskSignature(key, task) {
  switch (key) {
    case 'syllable': return `y-${task.kind}-${(task.rounds || task.items).map(r => r.word + (r.ask ?? r.drop ?? '')).join('.')}`;
    case 'spatial': return `z-${task.scene}-${task.rounds.map(r => r.map(s => s.obj[0] + s.word).join('+')).join('.')}`;
    case 'sort': return `o-${task.kind}-${task.rule || ''}-${task.items.map(i => `${i.color[0]}${i.shape[0]}${i.bin}`).join('.')}`;
    case 'story': return `s-${task.kind}-${task.x}${task.op}${task.y}`;
    case 'numline': return `n-${task.kind}-${task.end}-${(task.spins || task.targets || task.positions).join('.')}`;
    case 'pattern': return `p-${task.kind}-${task.unit}-${(task.model || task.items).map(v => v || '_').join('.')}`;
    case 'subitize': return `u-${task.ask}-${task.parts ? task.parts.join('+') : task.n}`;
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
