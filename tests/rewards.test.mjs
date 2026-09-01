import test from 'node:test';
import assert from 'node:assert/strict';
import { STICKERS, rollDrop, applyDrop } from '../js/rewards-data.js';
import { PALETTE } from '../js/vehicles.js';
import { makeRng } from '../js/rng.js';
import { defaultSave } from '../js/store.js';

test('STICKERS 恰好24个：s1..s20 + v1..v4，且每个都有 name 与 svg', () => {
  const keys = Object.keys(STICKERS);
  assert.equal(keys.length, 24);
  const expected = [...Array.from({ length: 20 }, (_, i) => `s${i + 1}`), 'v1', 'v2', 'v3', 'v4'];
  assert.deepEqual(keys.slice().sort(), expected.slice().sort());
  for (const k of keys) {
    assert.ok(typeof STICKERS[k].name === 'string' && STICKERS[k].name.length > 0, `${k} 缺 name`);
    assert.ok(typeof STICKERS[k].svg === 'string' && STICKERS[k].svg.length > 0, `${k} 缺 svg`);
  }
});

test('rollDrop 分布合理、从不返回已拥有的喷漆/轮毂；applyDrop 幂等', () => {
  const kinds = new Set();
  for (let seed = 0; seed < 200; seed++) {
    const rng = makeRng(seed);
    const collection = defaultSave().collection; // paint=purple(拥有), paints=[red], wheels=[w1], stickers=[]
    const drop = rollDrop(rng, collection);
    kinds.add(drop.kind);
    if (drop.kind === 'paint') {
      assert.ok(Object.keys(PALETTE).includes(drop.id));
      assert.notEqual(drop.id, collection.carConfig.paint);
      assert.ok(!collection.paints.includes(drop.id));
    } else if (drop.kind === 'wheel') {
      assert.ok(['w2', 'w3'].includes(drop.id));
      assert.ok(!collection.wheels.includes(drop.id));
    } else {
      assert.equal(drop.kind, 'sticker');
      assert.match(drop.id, /^s\d+$/);
    }
    const before = JSON.stringify(applyDrop(collection, drop));
    const after = JSON.stringify(applyDrop(collection, drop));
    assert.equal(before, after, '重复 applyDrop 不应产生新变化');
  }
  assert.ok(kinds.has('sticker'), '200个种子里应该出现过 sticker 掉落');
  assert.ok(kinds.has('paint'), '200个种子里应该出现过 paint 掉落');
  assert.ok(kinds.has('wheel'), '200个种子里应该出现过 wheel 掉落');

  // 全部拥有时：只会掉普通贴纸（允许重复）
  const full = {
    carConfig: { paint: 'red', wheel: 'w1', placed: [] },
    paints: Object.keys(PALETTE),
    wheels: ['w1', 'w2', 'w3'],
    stickers: Array.from({ length: 20 }, (_, i) => `s${i + 1}`),
  };
  for (let seed = 0; seed < 60; seed++) {
    const rng = makeRng(seed * 31 + 7);
    const drop = rollDrop(rng, full);
    assert.equal(drop.kind, 'sticker');
    assert.match(drop.id, /^s([1-9]|1[0-9]|20)$/);
    applyDrop(full, drop); // 幂等，不应抛错，也不应超出20个
  }
  assert.ok(full.stickers.length === 20);
});
