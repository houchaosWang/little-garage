import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/rng.js';
import {
  genSubitizeTask, SUBITIZE_LEVELS, MAX_SUBITIZE_LEVEL, SCATTER_BOX, numberOptions, taskSignature,
} from '../js/taskgen.js';

test('闪灯看数：各级数量、摆法、曝光时间、问法与选项', () => {
  assert.equal(MAX_SUBITIZE_LEVEL, 6);
  for (let level = 1; level <= MAX_SUBITIZE_LEVEL; level++) {
    const cfg = SUBITIZE_LEVELS[level];
    for (let seed = 0; seed < 120; seed++) {
      const t = genSubitizeTask(makeRng(seed), level);
      assert.equal(t.layout, cfg.layout);
      assert.ok(t.n >= cfg.min && t.n <= cfg.max);
      assert.ok(t.ms >= 1000 && t.ms <= 2000, '要短到来不及一个个数');
      assert.equal(t.answer, cfg.ask === 'complement' ? 10 - t.n : t.n);
      assert.equal(t.options.length, 3);
      assert.equal(new Set(t.options).size, 3);
      assert.ok(t.options.includes(t.answer));
      assert.ok(t.options.every(o => o >= 1 && o <= 10));
    }
  }
  assert.ok(SUBITIZE_LEVELS[1].ms > SUBITIZE_LEVELS[4].ms, '越往上看的时间越短');
  // 只有1级是随意摆（感知性速视）；之后都要有结构
  assert.deepEqual(Object.values(SUBITIZE_LEVELS).filter(c => c.layout === 'scatter').map(c => c.max), [3]);
});

test('1级随意摆：格子不重复、都在框内、任意两灯不重叠', () => {
  for (let seed = 0; seed < 300; seed++) {
    const t = genSubitizeTask(makeRng(seed), 1);
    assert.equal(t.spots.length, t.n);
    const px = t.spots.map(([x, y]) => [x * SCATTER_BOX.w, y * SCATTER_BOX.h]);
    for (const [x, y] of px) assert.ok(x >= 0 && x <= SCATTER_BOX.w && y >= 0 && y <= SCATTER_BOX.h);
    for (let i = 0; i < px.length; i++) {
      for (let j = i + 1; j < px.length; j++) {
        assert.ok(Math.hypot(px[i][0] - px[j][0], px[i][1] - px[j][1]) >= 48, `seed ${seed}`);
      }
    }
  }
});

test('5级两组：每组1-5个（骰子点），合起来就是总数', () => {
  for (let seed = 0; seed < 200; seed++) {
    const t = genSubitizeTask(makeRng(seed), 5);
    assert.equal(t.ask, 'sum');
    assert.equal(t.parts.length, 2);
    assert.ok(t.parts.every(p => p >= 1 && p <= 5));
    assert.equal(t.parts[0] + t.parts[1], t.n);
  }
});

test('6级凑十：十格阵上亮5-9个，答案是还差几个满十', () => {
  for (let seed = 0; seed < 100; seed++) {
    const t = genSubitizeTask(makeRng(seed), 6);
    assert.equal(t.layout, 'ten');
    assert.equal(t.answer, 10 - t.n);
    assert.ok(t.answer >= 1 && t.answer <= 5);
  }
});

test('numberOptions：答案靠边也能凑够3个不重复的选项', () => {
  for (let seed = 0; seed < 100; seed++) {
    for (const ans of [1, 2, 9, 10]) {
      const o = numberOptions(makeRng(seed), ans, 1, 10);
      assert.equal(o.length, 3);
      assert.equal(new Set(o).size, 3);
      assert.ok(o.includes(ans) && o.every(v => v >= 1 && v <= 10));
    }
  }
});

test('taskSignature：闪灯看数的指纹区分问法与分组', () => {
  assert.equal(taskSignature('subitize', { ask: 'count', n: 7 }), 'u-count-7');
  assert.equal(taskSignature('subitize', { ask: 'sum', n: 7, parts: [3, 4] }), 'u-sum-3+4');
  assert.notEqual(taskSignature('subitize', { ask: 'complement', n: 7 }), taskSignature('subitize', { ask: 'count', n: 7 }));
});
