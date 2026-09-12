import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { makeRng } from '../js/rng.js';
import {
  genTireTask, TIRE_LEVELS, MAX_TIRE_LEVEL, TIRE_RACK_MAX,
  FUEL_GRACE, fuelShown, fuelOver, fuelHit,
  genHanziTask, CHARSET, LOOKALIKE_GROUPS, MAX_HANZI_LEVEL,
  TRACE_POOLS, MAX_TRACE_LEVEL,
  genShapesTask, SHAPE_SET, SHAPE_ROTATIONS, MAX_SHAPES_LEVEL,
  genCompareTask, COMPARE_LEVELS, MAX_COMPARE_LEVEL, staggerTrap,
} from '../js/taskgen.js';

test('装轮胎5-6级是"数出N个"：不画编号圈，5级报数、6级不报', () => {
  assert.equal(MAX_TIRE_LEVEL, 6);
  for (const level of [5, 6]) {
    const { min, max } = TIRE_LEVELS[level];
    for (let seed = 0; seed < 80; seed++) {
      const t = genTireTask(makeRng(seed), level);
      assert.equal(t.mode, 'count');
      assert.equal(t.aloud, level === 5);
      assert.ok(t.count >= min && t.count <= max);
      assert.ok(t.rackCount > t.count, '架上必须比要的多，不然不用数');
      assert.ok(t.rackCount <= TIRE_RACK_MAX.count);
    }
  }
  for (let level = 1; level <= 4; level++) assert.equal(genTireTask(makeRng(1), level).mode, 'slots');
});

test('加油：到目标数字后宽限半格——屏幕仍显示目标、松手算对；过了宽限才算加多', () => {
  const T = 5;
  assert.equal(fuelShown(4.9, T), 4);
  assert.equal(fuelShown(5.2, T), 5);
  assert.equal(fuelShown(6.2, T), 5);
  assert.equal(fuelShown(6 + FUEL_GRACE, T), 6);
  assert.equal(fuelHit(4.99, T), false);
  assert.equal(fuelHit(5, T), true);
  assert.equal(fuelHit(6.3, T), true);
  assert.equal(fuelHit(6 + FUEL_GRACE, T), false);
  assert.equal(fuelOver(6.3, T), false);
  assert.equal(fuelOver(6 + FUEL_GRACE, T), true);
});

test('形近字分组：40个字每个恰好在一组', () => {
  const all = LOOKALIKE_GROUPS.flat();
  assert.equal(all.length, 40);
  assert.equal(new Set(all).size, 40);
  assert.ok(all.every(i => i >= 0 && i < CHARSET.length));
  assert.ok(LOOKALIKE_GROUPS.every(g => g.length >= 2));
});

test('认字5级：6个箱子，干扰项先挑长得像的字', () => {
  assert.equal(MAX_HANZI_LEVEL, 5);
  for (let seed = 0; seed < 200; seed++) {
    const t = genHanziTask(makeRng(seed), 5);
    assert.equal(t.optionIndexes.length, 6);
    assert.equal(new Set(t.optionIndexes).size, 6);
    assert.ok(t.optionIndexes.includes(t.answerIndex));
    const group = LOOKALIKE_GROUPS.find(g => g.includes(t.answerIndex));
    const alike = t.optionIndexes.filter(i => i !== t.answerIndex && group.includes(i));
    assert.equal(alike.length, Math.min(group.length - 1, 5), `「${CHARSET[t.answerIndex]}」的形近字要尽量都进干扰项`);
  }
});

test('描字5级：10个笔画更多的字，各级不重复，笔画数据都已离线打包', () => {
  assert.equal(MAX_TRACE_LEVEL, 5);
  assert.equal(TRACE_POOLS[5].length, 10);
  const used = Object.values(TRACE_POOLS).flat();
  assert.equal(new Set(used).size, used.length);
  for (const i of TRACE_POOLS[5]) {
    assert.ok(existsSync(new URL(`../vendor/hanzi-data/${CHARSET[i]}.json`, import.meta.url)), CHARSET[i]);
  }
});

test('形状5-6级：5个孔、新增长方形/六边形；6级零件只转90/180/270度', () => {
  assert.equal(MAX_SHAPES_LEVEL, 6);
  assert.deepEqual(SHAPE_SET.slice(0, 7),
    ['circle', 'square', 'triangle', 'star', 'ellipse', 'diamond', 'trapezoid'], '老形状顺序不能动：低级别的池子是它的前缀');
  assert.ok(SHAPE_ROTATIONS.every(r => r % 90 === 0 && r % 360 !== 0), '转45度的正方形就是菱形，不许');
  let sawNew = false;
  for (let seed = 0; seed < 80; seed++) {
    const t5 = genShapesTask(makeRng(seed), 5);
    assert.equal(t5.shapes.length, 5);
    assert.equal(t5.rotations, undefined);
    if (t5.shapes.some(s => s === 'rectangle' || s === 'hexagon')) sawNew = true;
    const t6 = genShapesTask(makeRng(seed), 6);
    assert.equal(t6.rotations.length, t6.tray.length);
    assert.ok(t6.rotations.every(r => SHAPE_ROTATIONS.includes(r)));
  }
  assert.ok(sawNew);
});

test('比大小5级：5个、差距更小；6级错位且一定有陷阱', () => {
  assert.equal(MAX_COMPARE_LEVEL, 6);
  for (let seed = 0; seed < 300; seed++) {
    const t5 = genCompareTask(makeRng(seed), 5);
    assert.equal(t5.n, 5);
    assert.equal(t5.offsets, undefined);
    const t6 = genCompareTask(makeRng(seed), 6);
    assert.equal(t6.offsets.length, t6.n);
    assert.ok(t6.offsets.every(o => o >= 0 && o <= COMPARE_LEVELS[6].stagger));
    const wantMax = t6.kind === 'big' || t6.kind === 'long';
    assert.ok(staggerTrap(t6.sizes, t6.offsets, t6.answerIdx, wantMax), `seed ${seed} 没有陷阱`);
  }
});

test('staggerTrap 判定', () => {
  assert.equal(staggerTrap([1, 2], [0, 0], 1, true), false);
  assert.equal(staggerTrap([1, 2], [1.5, 0], 1, true), true);
  assert.equal(staggerTrap([1, 2], [0, 0], 0, false), false);
  assert.equal(staggerTrap([1, 2], [1.2, 0], 0, false), true);
});

test('pickWeighted：权重0的永远抽不到，比例大致对，全0时退回均匀', () => {
  const rng = makeRng(42);
  const n = { a: 0, b: 0, c: 0 };
  for (let i = 0; i < 6000; i++) n[rng.pickWeighted(['a', 'b', 'c'], [1, 0, 3])] += 1;
  assert.equal(n.b, 0);
  assert.ok(n.c / n.a > 2.5 && n.c / n.a < 3.5, JSON.stringify(n));
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(rng.pickWeighted(['x', 'y'], [0, 0]));
  assert.deepEqual([...seen].sort(), ['x', 'y']);
});

test('离线清单与磁盘一致：语音一条不多一条不少，js 文件全在清单里', () => {
  const src = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const ctx = { self: { addEventListener() {} }, caches: {}, fetch() {}, URL };
  const { AUDIO_NAMES, ASSETS } = vm.runInNewContext(`${src}\n;({ AUDIO_NAMES, ASSETS })`, ctx);
  const disk = readdirSync(new URL('../audio/', import.meta.url)).filter(f => f.endsWith('.mp3')).map(f => f.slice(0, -4));
  assert.deepEqual([...AUDIO_NAMES].sort(), disk.sort());
  const js = readdirSync(new URL('../js/', import.meta.url)).filter(f => f.endsWith('.js')).map(f => `js/${f}`);
  assert.deepEqual(js.filter(f => !ASSETS.includes(f)), [], '有 js 文件没进离线清单：iPad 断网会白屏');
  assert.equal(new Set(ASSETS).size, ASSETS.length);
});
