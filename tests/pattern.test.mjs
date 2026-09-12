import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/rng.js';
import {
  genPatternTask, PATTERN_LEVELS, PATTERN_VALUES, MAX_PATTERN_LEVEL, patternShape, taskSignature,
} from '../js/taskgen.js';

const periodic = (seq, p) => seq.every((v, i) => v === seq[i % p]);

test('patternShape：只看结构，不看材料', () => {
  assert.equal(patternShape(['red', 'red', 'blue', 'red', 'red', 'blue']), 'AABAAB');
  assert.equal(patternShape(['star', 'star', 'circle']), 'AAB');
  assert.equal(patternShape(['blue', 'green', 'yellow']), 'ABC');
});

test('各级：题型、材料、选项数、选项不重复', () => {
  assert.equal(MAX_PATTERN_LEVEL, 6);
  for (let level = 1; level <= MAX_PATTERN_LEVEL; level++) {
    const cfg = PATTERN_LEVELS[level];
    for (let seed = 0; seed < 150; seed++) {
      const t = genPatternTask(makeRng(seed), level);
      assert.equal(t.kind, cfg.kind);
      assert.ok(cfg.units.includes(t.unit));
      assert.equal(t.options.length, cfg.opts);
      const keys = t.options.map(o => (Array.isArray(o) ? o.join('.') : o));
      assert.equal(new Set(keys).size, keys.length);
      assert.ok(t.answerIdx >= 0 && t.answerIdx < t.options.length);
    }
  }
  // 先颜色后形状：4级（补空）用形状
  assert.equal(PATTERN_LEVELS[1].attr, 'color');
  assert.equal(PATTERN_LEVELS[4].attr, 'shape');
});

test('延伸/补空：填上正确答案后整排按单元重复；换成别的选项就不重复了（答案唯一）', () => {
  for (const level of [1, 2, 3, 4]) {
    for (let seed = 0; seed < 150; seed++) {
      const t = genPatternTask(makeRng(seed), level);
      const U = t.unit.length;
      const blank = t.items.indexOf(null);
      assert.equal(t.items.filter(v => v === null).length, 1);
      if (t.kind === 'extend') assert.equal(blank, t.items.length - 1);
      else assert.ok(blank >= U, '第一段要完整，才看得出规律');
      t.options.forEach((opt, i) => {
        const filled = t.items.map(v => (v === null ? opt : v));
        assert.equal(periodic(filled, U), i === t.answerIdx, `L${level} seed${seed} 选项${i}`);
      });
      assert.equal(patternShape(t.items.slice(0, U)), patternShape([...t.unit]));
      const pool = PATTERN_VALUES[t.attr];
      assert.ok(t.items.every(v => v === null || pool.includes(v)));
    }
  }
});

test('抽象：上面彩灯、下面形状，恰好一排结构相同', () => {
  for (let seed = 0; seed < 200; seed++) {
    const t = genPatternTask(makeRng(seed), 5);
    assert.ok(t.model.every(v => PATTERN_VALUES.color.includes(v)));
    assert.ok(periodic(t.model, t.unit.length));
    const target = patternShape(t.model);
    const same = t.options.filter(r => patternShape(r) === target);
    assert.equal(same.length, 1);
    assert.equal(patternShape(t.options[t.answerIdx]), target);
    t.options.forEach(r => {
      assert.equal(r.length, t.model.length);
      assert.ok(r.every(v => PATTERN_VALUES.shape.includes(v)), '换材料：选项全是形状');
    });
  }
});

test('找单元：正确那段重复起来正好是整排，另外两段都不是', () => {
  for (let seed = 0; seed < 200; seed++) {
    const t = genPatternTask(makeRng(seed), 6);
    const tile = seg => Array.from({ length: t.items.length }, (_, i) => seg[i % seg.length]);
    t.options.forEach((seg, i) => {
      const ok = tile(seg).every((v, j) => v === t.items[j]);
      assert.equal(ok, i === t.answerIdx, `seed ${seed} 选项${i}`);
    });
  }
});

test('taskSignature：找规律的指纹带题型与整排', () => {
  const sig = taskSignature('pattern', { kind: 'extend', unit: 'AB', items: ['red', 'blue', 'red', null] });
  assert.equal(sig, 'p-extend-AB-red.blue.red._');
  assert.equal(taskSignature('pattern', { kind: 'abstract', unit: 'AB', model: ['red', 'blue'] }), 'p-abstract-AB-red.blue');
});
