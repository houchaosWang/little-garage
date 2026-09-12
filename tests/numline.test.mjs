import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/rng.js';
import { genNumlineTask, NUMLINE_LEVELS, MAX_NUMLINE_LEVEL, taskSignature } from '../js/taskgen.js';

test('数字赛道·比赛：转盘点数在范围内，整局从第1格正好跑到终点', () => {
  assert.equal(MAX_NUMLINE_LEVEL, 6);
  for (const level of [1, 2, 3]) {
    const cfg = NUMLINE_LEVELS[level];
    for (let seed = 0; seed < 200; seed++) {
      const t = genNumlineTask(makeRng(seed), level);
      assert.equal(t.kind, 'race');
      assert.equal(t.predict, cfg.predict);
      assert.ok(t.spins.every(s => s >= cfg.spin[0] && s <= cfg.spin[1]));
      let pos = 1;
      t.spins.forEach((s, i) => {
        assert.ok(pos < t.end, `第${i + 1}次转之前还没到终点`);
        pos = Math.min(t.end, pos + s);
      });
      assert.equal(pos, t.end);
    }
  }
  assert.equal(NUMLINE_LEVELS[1].predict, false, '1级只管一格一格走、听数');
  assert.equal(NUMLINE_LEVELS[3].end, 20);
});

test('数字赛道·估位置：三轮目标不重复、避开两头', () => {
  for (const level of [4, 5]) {
    const cfg = NUMLINE_LEVELS[level];
    for (let seed = 0; seed < 200; seed++) {
      const t = genNumlineTask(makeRng(seed), level);
      assert.equal(t.targets.length, cfg.rounds);
      assert.equal(new Set(t.targets).size, cfg.rounds);
      assert.ok(t.targets.every(v => v >= 2 && v <= cfg.end - 2));
      assert.equal(t.tol, cfg.tol);
      assert.ok(t.tol < 1 || cfg.end > 10, '0-10 上容差要小于1格');
    }
  }
});

test('数字赛道·还差几格：位置不重复，每题选项含正确的差', () => {
  for (let seed = 0; seed < 200; seed++) {
    const t = genNumlineTask(makeRng(seed), 6);
    assert.equal(t.positions.length, 3);
    assert.equal(new Set(t.positions).size, 3);
    t.positions.forEach((p, i) => {
      assert.ok(p >= 8 && p <= 18);
      const o = t.options[i];
      assert.equal(o.length, 3);
      assert.equal(new Set(o).size, 3);
      assert.ok(o.includes(t.end - p));
      assert.ok(o.every(v => v >= 1 && v <= 15));
    });
  }
});

test('taskSignature：数字赛道', () => {
  assert.equal(taskSignature('numline', { kind: 'race', end: 10, spins: [2, 1] }), 'n-race-10-2.1');
  assert.equal(taskSignature('numline', { kind: 'estimate', end: 20, targets: [7, 13, 4] }), 'n-estimate-20-7.13.4');
});
