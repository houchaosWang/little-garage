import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/rng.js';

test('同种子序列可复现', () => {
  const a = makeRng(42), b = makeRng(42);
  for (let i = 0; i < 10; i++) assert.equal(a.next(), b.next());
});

test('int(min,max) 含两端且不越界', () => {
  const r = makeRng(7);
  const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const v = r.int(2, 5);
    assert.ok(v >= 2 && v <= 5 && Number.isInteger(v));
    seen.add(v);
  }
  assert.deepEqual([...seen].sort(), [2, 3, 4, 5]);
});

test('pick 返回数组成员', () => {
  const r = makeRng(1);
  const arr = ['a', 'b', 'c'];
  for (let i = 0; i < 50; i++) assert.ok(arr.includes(r.pick(arr)));
});

test('shuffle 不改原数组且是排列', () => {
  const r = makeRng(9);
  const arr = [1, 2, 3, 4, 5];
  const s = r.shuffle(arr);
  assert.deepEqual(arr, [1, 2, 3, 4, 5]);
  assert.deepEqual([...s].sort(), [1, 2, 3, 4, 5]);
});
