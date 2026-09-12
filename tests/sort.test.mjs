import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/rng.js';
import { genSortTask, SORT_LEVELS, MAX_SORT_LEVEL, SORT_COLORS, SORT_SHAPES, taskSignature } from '../js/taskgen.js';

const ATTRS = ['color', 'shape', 'size'];

test('零件分拣：各级题型；每件零件的正确筐都符合规则', () => {
  assert.equal(MAX_SORT_LEVEL, 6);
  for (let level = 1; level <= MAX_SORT_LEVEL; level++) {
    for (let seed = 0; seed < 150; seed++) {
      const t = genSortTask(makeRng(seed), level);
      assert.equal(t.kind, SORT_LEVELS[level].kind);
      assert.ok(t.items.length >= 4);
      t.items.forEach(it => {
        assert.ok(SORT_COLORS.includes(it.color) && SORT_SHAPES.includes(it.shape));
        assert.ok(it.bin >= 0 && it.bin < t.bins.length);
      });
    }
  }
});

test('1-2级只变一个特征，两个筐各两件', () => {
  for (let seed = 0; seed < 100; seed++) {
    const c = genSortTask(makeRng(seed), 1);
    assert.equal(new Set(c.items.map(i => i.shape)).size, 1);
    c.items.forEach(i => assert.equal(i.color, c.bins[i.bin].color));
    const s = genSortTask(makeRng(seed), 2);
    assert.equal(new Set(s.items.map(i => i.color)).size, 1);
    s.items.forEach(i => assert.equal(i.shape, s.bins[i.bin].shape));
    for (const t of [c, s]) assert.deepEqual([0, 1].map(b => t.items.filter(i => i.bin === b).length), [2, 2]);
  }
});

test('3-4级是 DCCS：每张卡按颜色和按形状会进不同的筐（换规则才有意义）', () => {
  for (const level of [3, 4]) {
    for (let seed = 0; seed < 150; seed++) {
      const t = genSortTask(makeRng(seed), level);
      t.items.forEach(it => {
        const byColor = t.bins.findIndex(b => b.color === it.color);
        const byShape = t.bins.findIndex(b => b.shape === it.shape);
        assert.notEqual(byColor, byShape, '双维卡片');
        assert.equal(it.bin, it.rule === 'color' ? byColor : byShape);
      });
    }
  }
  for (let seed = 0; seed < 100; seed++) {
    const t = genSortTask(makeRng(seed), 3);
    assert.ok(t.items.slice(0, t.switchAt).every(i => i.rule === 'color'));
    assert.ok(t.items.slice(t.switchAt).every(i => i.rule === 'shape'));
    const b = genSortTask(makeRng(seed), 4);
    b.items.forEach(i => assert.equal(i.border, i.rule === 'shape'));
    assert.equal(b.items.filter(i => i.border).length, 3);
  }
});

test('5级猜规则：筐里的示例只有规则那一项一致，新零件按那一项进筐', () => {
  const seen = new Set();
  for (let seed = 0; seed < 300; seed++) {
    const t = genSortTask(makeRng(seed), 5);
    seen.add(t.rule);
    t.bins.forEach(b => {
      assert.equal(b.examples.length, 2);
      ATTRS.forEach(a => {
        const same = b.examples[0][a] === b.examples[1][a];
        assert.equal(same, a === t.rule, `seed ${seed} 属性 ${a}`);
      });
    });
    assert.notEqual(t.bins[0].examples[0][t.rule], t.bins[1].examples[0][t.rule]);
    t.items.forEach(i => assert.equal(i[t.rule], t.bins[i.bin].examples[0][t.rule]));
  }
  assert.deepEqual([...seen].sort(), ['color', 'shape', 'size']);
});

test('6级交叉分：四个筐两两不同，零件两个特征都要对上', () => {
  for (let seed = 0; seed < 150; seed++) {
    const t = genSortTask(makeRng(seed), 6);
    assert.equal(new Set(t.bins.map(b => `${b.color}-${b.shape}`)).size, 4);
    t.items.forEach(i => {
      assert.equal(i.color, t.bins[i.bin].color);
      assert.equal(i.shape, t.bins[i.bin].shape);
    });
  }
});

test('taskSignature：零件分拣', () => {
  const sig = taskSignature('sort', { kind: 'one', rule: 'color', items: [{ color: 'red', shape: 'star', bin: 0 }] });
  assert.equal(sig, 'o-one-color-rs0');
});
