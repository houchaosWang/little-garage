import test from 'node:test';
import assert from 'node:assert/strict';
import { levelState, buildReport } from '../js/parent.js';

const meta = { counting: { name: '数数·装轮胎', max: 4 } };

test('levelState 各状态判定', () => {
  const s = { level: 3, streak: 0, mastery: {
    1: { state: 'solid', box: 4 },
    2: { state: 'provisional', box: 1 },
  } };
  assert.equal(levelState(s, 1), 'solid');
  assert.equal(levelState(s, 2), 'provisional');
  assert.equal(levelState(s, 3), 'learning');
  assert.equal(levelState(s, 4), 'locked');
  const r = { level: 1, streak: 0, mastery: { 1: { state: 'relearning' } } };
  assert.equal(levelState(r, 1), 'relearning');
});

test('buildReport 生成完整文本', () => {
  const data = {
    skills: { counting: { level: 2, streak: 0, mastery: { 1: { state: 'provisional' } } } },
    stats: { daily: { '2026-09-01': { jobs: 3 }, '2026-08-31': { jobs: 4 } }, byGame: { tires: { plays: 5, errors: 1, helps: 2 } } },
  };
  const rep = buildReport(data, meta, '2026-09-01');
  assert.match(rep, /学习报告 2026-09-01/);
  assert.match(rep, /数数·装轮胎：L1待抽查 L2学习中 L3未解锁 L4未解锁/);
  assert.match(rep, /装轮胎：玩5次，出错1，求助2/);
  assert.match(rep, /累计营业 7 单；今日 3 单/);
});
