import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/rng.js';
import { genSpatialTask, SPATIAL_LEVELS, MAX_SPATIAL_LEVEL, SPATIAL_OBJECTS, taskSignature } from '../js/taskgen.js';

test('方位：各级场景、轮数、每轮步数；词都来自本级；一轮里物品不重复、两步的地方不同', () => {
  assert.equal(MAX_SPATIAL_LEVEL, 6);
  for (let level = 1; level <= MAX_SPATIAL_LEVEL; level++) {
    const cfg = SPATIAL_LEVELS[level];
    for (let seed = 0; seed < 200; seed++) {
      const t = genSpatialTask(makeRng(seed), level);
      assert.equal(t.scene, cfg.scene);
      assert.equal(t.map, !!cfg.map);
      assert.equal(t.rounds.length, cfg.rounds);
      t.rounds.forEach(r => {
        assert.equal(r.length, cfg.steps);
        assert.equal(new Set(r.map(s => s.obj)).size, r.length);
        assert.equal(new Set(r.map(s => s.word)).size, r.length);
        r.forEach(s => {
          assert.ok(cfg.words.includes(s.word));
          assert.ok(SPATIAL_OBJECTS.includes(s.obj));
        });
      });
    }
  }
});

test('该练的词一定练到：1级上下都有、2级里外旁边都有、3级前后都有、4级左右都有', () => {
  for (let seed = 0; seed < 200; seed++) {
    const words = lv => new Set(genSpatialTask(makeRng(seed), lv).rounds.flat().map(s => s.word));
    assert.deepEqual([...words(1)].sort(), ['down', 'up']);
    assert.deepEqual([...words(2)].sort(), ['in', 'out', 'side']);
    assert.ok(words(3).has('front') && words(3).has('back'));
    assert.deepEqual([...words(4)].sort(), ['left', 'right']);
  }
});

test('左右不是死板交替（不然背规律就能蒙对）', () => {
  const orders = new Set();
  for (let seed = 0; seed < 200; seed++) orders.add(genSpatialTask(makeRng(seed), 4).rounds.map(r => r[0].word).join(','));
  assert.ok(orders.size >= 4);
});

test('taskSignature：方位', () => {
  assert.equal(taskSignature('spatial', { scene: 'car', rounds: [[{ obj: 'tire', word: 'up' }], [{ obj: 'can', word: 'down' }]] }), 'z-car-tup.cdown');
});
