import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/rng.js';
import { genTireTask, TIRE_LEVELS, MAX_TIRE_LEVEL } from '../js/taskgen.js';

test('各级别数量落在配置区间，架上轮胎多于目标且不超12', () => {
  for (let level = 1; level <= MAX_TIRE_LEVEL; level++) {
    const { min, max } = TIRE_LEVELS[level];
    for (let seed = 0; seed < 60; seed++) {
      const t = genTireTask(makeRng(seed), level);
      assert.equal(t.type, 'tires');
      assert.ok(t.count >= min && t.count <= max, `L${level} count=${t.count}`);
      assert.ok(t.rackCount > t.count);
      assert.ok(t.rackCount <= 12);
    }
  }
});

test('越界级别被夹回有效区间', () => {
  const lo = genTireTask(makeRng(1), 0);
  assert.ok(lo.count >= TIRE_LEVELS[1].min && lo.count <= TIRE_LEVELS[1].max);
  const hi = genTireTask(makeRng(1), 99);
  assert.ok(hi.count >= TIRE_LEVELS[MAX_TIRE_LEVEL].min);
});
