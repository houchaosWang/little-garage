import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/rng.js';
import {
  genTireTask, TIRE_LEVELS, MAX_TIRE_LEVEL,
  genFuelTask, FUEL_LEVELS, MAX_FUEL_LEVEL,
  genLightsTask, LIGHTS_OPTION_COUNT, MAX_LIGHTS_LEVEL,
  genMathTask, MAX_MATH_LEVEL,
  genHanziTask, CHARSET, HANZI_POOLS, MAX_HANZI_LEVEL,
  genTraceTask, TRACE_POOLS, MAX_TRACE_LEVEL,
} from '../js/taskgen.js';

test('各级别数量落在配置区间，架上轮胎多于目标且不超12', () => {
  for (let level = 1; level <= MAX_TIRE_LEVEL; level++) {
    const { min, max } = TIRE_LEVELS[level];
    for (let seed = 0; seed < 60; seed++) {
      const t = genTireTask(makeRng(seed), level);
      assert.equal(t.type, 'tires');
      assert.ok(t.count >= min && t.count <= max, `L${level} count=${t.count}`);
      assert.ok(t.rackCount > t.count);
      assert.ok(t.rackCount <= 14);
    }
  }
});

test('越界级别被夹回有效区间', () => {
  const lo = genTireTask(makeRng(1), 0);
  assert.ok(lo.count >= TIRE_LEVELS[1].min && lo.count <= TIRE_LEVELS[1].max);
  const hi = genTireTask(makeRng(1), 99);
  assert.ok(hi.count >= TIRE_LEVELS[MAX_TIRE_LEVEL].min);
});

test('genFuelTask 各级别目标在区间，越界与小数级别被夹回', () => {
  for (let level = 1; level <= MAX_FUEL_LEVEL; level++) {
    const { min, max } = FUEL_LEVELS[level];
    for (let seed = 0; seed < 40; seed++) {
      const t = genFuelTask(makeRng(seed), level);
      assert.equal(t.type, 'fuel');
      assert.ok(Number.isInteger(t.target) && t.target >= min && t.target <= max);
      assert.equal(t.max, level === 4 ? 15 : 10);
    }
  }
  const frac = genFuelTask(makeRng(1), 2.5);
  assert.ok(frac.target >= FUEL_LEVELS[2].min && frac.target <= FUEL_LEVELS[2].max);
  const hi = genFuelTask(makeRng(1), 99);
  assert.ok(hi.target >= FUEL_LEVELS[MAX_FUEL_LEVEL].min);
});

test('genLightsTask 选项数正确、答案恰出现一次、全部来自调色板', () => {
  const palette = ['red', 'blue', 'green', 'yellow', 'purple', 'teal'];
  for (let level = 1; level <= MAX_LIGHTS_LEVEL; level++) {
    for (let seed = 0; seed < 40; seed++) {
      const t = genLightsTask(makeRng(seed), level, 'red', palette);
      assert.equal(t.options.length, LIGHTS_OPTION_COUNT[level]);
      assert.equal(t.options.filter(c => c === 'red').length, 1);
      assert.ok(t.options.every(c => palette.includes(c)));
      assert.equal(t.answer, 'red');
      assert.equal(new Set(t.options).size, t.options.length);
    }
  }
});

test('轮胎L4与加油L4区间正确', () => {
  for (let seed = 0; seed < 40; seed++) {
    const t = genTireTask(makeRng(seed), 4);
    assert.ok(t.count >= 8 && t.count <= 12);
    const f = genFuelTask(makeRng(seed), 4);
    assert.ok(f.target >= 8 && f.target <= 15);
    assert.equal(f.max, 15);
    assert.equal(genFuelTask(makeRng(seed), 3).max, 10);
  }
});

test('genMathTask 各级别运算与选项合法', () => {
  for (let level = 1; level <= MAX_MATH_LEVEL; level++) {
    for (let seed = 0; seed < 80; seed++) {
      const t = genMathTask(makeRng(seed), level);
      assert.ok(['+', '-'].includes(t.op));
      if (level <= 2) assert.equal(t.op, '+');
      if (level === 3) assert.equal(t.op, '-');
      const expect = t.op === '+' ? t.a + t.b : t.a - t.b;
      assert.equal(t.answer, expect);
      assert.ok(t.a >= 1 && t.b >= 1 && t.answer >= 1);
      if (level === 1) assert.ok(t.answer <= 5);
      else assert.ok(t.answer <= 10 && t.a <= 10);
      assert.equal(t.options.length, 3);
      assert.equal(t.options.filter(o => o === t.answer).length, 1);
      assert.equal(new Set(t.options).size, 3);
      assert.ok(t.options.every(o => o >= 1 && o <= 15));
    }
  }
});

test('genHanziTask 选项数、池范围、答案唯一', () => {
  for (let level = 1; level <= MAX_HANZI_LEVEL; level++) {
    for (let seed = 0; seed < 60; seed++) {
      const t = genHanziTask(makeRng(seed), level);
      assert.equal(t.optionIndexes.length, level + 1);
      assert.ok(t.optionIndexes.includes(t.answerIndex));
      assert.equal(new Set(t.optionIndexes).size, t.optionIndexes.length);
      assert.ok(t.optionIndexes.every(i => i >= 0 && i < HANZI_POOLS[level]));
    }
  }
  assert.equal(CHARSET.length, 20);
  assert.equal(new Set(CHARSET).size, 20);
});

test('genTraceTask 字索引落在对应级别池', () => {
  for (let level = 1; level <= MAX_TRACE_LEVEL; level++) {
    for (let seed = 0; seed < 30; seed++) {
      const t = genTraceTask(makeRng(seed), level);
      assert.ok(TRACE_POOLS[level].includes(t.charIndex));
    }
  }
});
