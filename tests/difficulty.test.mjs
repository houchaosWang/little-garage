import test from 'node:test';
import assert from 'node:assert/strict';
import { createSkill, effectiveLevel, recordOutcome } from '../js/difficulty.js';

const MAX = 3;
const clean = { errors: 0, helps: 0 };
const bad = { errors: 2, helps: 0 };
const helped = { errors: 0, helps: 1 };

test('初始1级，出题级别=1', () => {
  const s = createSkill();
  assert.equal(s.level, 1);
  assert.equal(effectiveLevel(s, MAX), 1);
});

test('连续2次干净完成升1级', () => {
  let s = createSkill();
  s = recordOutcome(s, clean, MAX);
  assert.equal(s.level, 1);
  s = recordOutcome(s, clean, MAX);
  assert.equal(s.level, 2);
  assert.equal(s.streak, 0);
});

test('一次干净一次出错不升级', () => {
  let s = createSkill();
  s = recordOutcome(s, clean, MAX);
  s = recordOutcome(s, bad, MAX);
  assert.equal(effectiveLevel(s, MAX), 1);
});

test('2错误降0.5级，求助也降0.5级，保底1', () => {
  let s = createSkill(2);
  s = recordOutcome(s, bad, MAX);
  assert.equal(s.level, 1.5);
  assert.equal(effectiveLevel(s, MAX), 1);
  s = recordOutcome(s, helped, MAX);
  assert.equal(s.level, 1);
  s = recordOutcome(s, bad, MAX);
  assert.equal(s.level, 1);
});

test('1错误不降级但清空连击', () => {
  let s = createSkill(2);
  s = recordOutcome(s, clean, MAX);
  s = recordOutcome(s, { errors: 1, helps: 0 }, MAX);
  assert.equal(s.level, 2);
  s = recordOutcome(s, clean, MAX);
  assert.equal(s.level, 2);
  s = recordOutcome(s, clean, MAX);
  assert.equal(s.level, 3);
});

test('封顶maxLevel不再升', () => {
  let s = createSkill(3);
  s = recordOutcome(s, clean, MAX);
  s = recordOutcome(s, clean, MAX);
  assert.equal(s.level, 3);
});

test('半级状态升级取整+1（2.5升到3）', () => {
  let s = { level: 2.5, streak: 1 };
  s = recordOutcome(s, clean, MAX);
  assert.equal(s.level, 3);
});

test('VIP挑战 allowDemote:false 时，出错/求助不降级但仍清空连击', () => {
  let s = createSkill(2);
  s = recordOutcome(s, clean, MAX, { allowDemote: false });
  assert.equal(s.level, 2);
  assert.equal(s.streak, 1);
  s = recordOutcome(s, bad, MAX, { allowDemote: false });
  assert.equal(s.level, 2);
  assert.equal(s.streak, 0);
  s = recordOutcome(s, helped, MAX, { allowDemote: false });
  assert.equal(s.level, 2);
  assert.equal(s.streak, 0);
  // 不传 options 时默认行为不变（allowDemote 默认true）
  s = recordOutcome(s, bad, MAX);
  assert.equal(s.level, 1.5);
});
