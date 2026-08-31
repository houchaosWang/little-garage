import test from 'node:test';
import assert from 'node:assert/strict';
import { BOX_DAYS, addDays, onPromoted, dueReviews, onReviewResult, seedMissingMastery } from '../js/mastery.js';

const mkSkill = (level = 2) => ({ level, streak: 0, mastery: {}, recent: [] });

test('addDays 跨月跨年正确', () => {
  assert.equal(addDays('2026-08-31', 1), '2026-09-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-09-01', 21), '2026-09-22');
});

test('晋升标记初步掌握，次日到期', () => {
  const s = mkSkill(2);
  onPromoted(s, 1, '2026-09-01');
  assert.deepEqual(s.mastery['1'], { state: 'provisional', box: 0, due: '2026-09-02', passes7: 0, lapses: 0 });
});

test('干净抽查逐盒升级，两次≥7天通过转巩固', () => {
  const s = mkSkill(3);
  onPromoted(s, 1, '2026-09-01');
  let today = '2026-09-02';
  let r = onReviewResult(s, 1, 'pass', today);    // box0 interval1 → box1, due +3
  assert.equal(s.mastery['1'].box, 1);
  assert.equal(s.mastery['1'].due, addDays(today, 3));
  assert.equal(r.solid, false);
  today = s.mastery['1'].due;
  onReviewResult(s, 1, 'pass', today);            // box1 interval3 → box2, due +7
  assert.equal(s.mastery['1'].box, 2);
  today = s.mastery['1'].due;
  onReviewResult(s, 1, 'pass', today);            // interval7 → passes7=1, box3, due +21
  assert.equal(s.mastery['1'].passes7, 1);
  assert.equal(s.mastery['1'].state, 'provisional');
  today = s.mastery['1'].due;
  r = onReviewResult(s, 1, 'pass', today);        // interval21 → passes7=2 → solid, box4
  assert.equal(s.mastery['1'].state, 'solid');
  assert.equal(r.solid, true);
  assert.equal(s.mastery['1'].box, 4);
  today = s.mastery['1'].due;
  onReviewResult(s, 1, 'pass', today);            // box stays capped at 4 (45d maintenance)
  assert.equal(s.mastery['1'].box, 4);
  assert.equal(s.mastery['1'].due, addDays(today, 45));
});

test('抽查失败：回炉+等级回滚+盒清零，且不再进入待抽查', () => {
  const s = mkSkill(3);
  s.streak = 1;
  onPromoted(s, 1, '2026-09-01');
  const r = onReviewResult(s, 1, 'fail', '2026-09-02');
  assert.equal(r.lapsed, true);
  const m = s.mastery['1'];
  assert.equal(m.state, 'relearning');
  assert.equal(m.box, 0);
  assert.equal(m.passes7, 0);
  assert.equal(m.lapses, 1);
  assert.equal(s.level, 1);
  assert.equal(s.streak, 0);
  assert.deepEqual(dueReviews({ k: s }, '2026-09-30'), []);
});

test('回炉后重新晋升恢复待抽查', () => {
  const s = mkSkill(3);
  onPromoted(s, 1, '2026-09-01');
  onReviewResult(s, 1, 'fail', '2026-09-02');
  s.level = 2;
  onPromoted(s, 1, '2026-09-05');
  assert.equal(s.mastery['1'].state, 'provisional');
  assert.equal(s.mastery['1'].due, '2026-09-06');
  assert.equal(s.mastery['1'].lapses, 1);
});

test('dueReviews 只出低于当前工作级且到期的，按到期先后排序', () => {
  const a = mkSkill(3);
  onPromoted(a, 1, '2026-08-20');
  onPromoted(a, 2, '2026-08-28');
  const b = mkSkill(2);
  onPromoted(b, 1, '2026-09-05');
  const due = dueReviews({ a, b }, '2026-09-01');
  assert.deepEqual(due.map(d => [d.skill, d.level]), [['a', 1], ['a', 2]]);
  const none = dueReviews({ c: (() => { const s = mkSkill(1); s.mastery['1'] = { state: 'provisional', box: 0, due: '2026-08-01', passes7: 0, lapses: 0 }; return s; })() }, '2026-09-01');
  assert.deepEqual(none, []);
});

test('仅求助的抽查既不通过也不回炉，改天再查', () => {
  const s = mkSkill(3);
  onPromoted(s, 1, '2026-09-01');
  const r = onReviewResult(s, 1, 'soft', '2026-09-02');
  assert.equal(r.lapsed, false);
  const m = s.mastery['1'];
  assert.equal(m.state, 'provisional');
  assert.equal(m.box, 0);
  assert.equal(m.due, '2026-09-03');
  assert.equal(s.level, 3);
});

test('seedMissingMastery 为历史等级补建待抽查', () => {
  const skills = { a: { level: 3.5, streak: 0, mastery: { 2: { state: 'solid', box: 4, due: '2026-10-01', passes7: 2, lapses: 0 } }, recent: [] } };
  seedMissingMastery(skills, '2026-09-01');
  assert.equal(skills.a.mastery['1'].state, 'provisional');
  assert.equal(skills.a.mastery['1'].due, '2026-09-02');
  assert.equal(skills.a.mastery['2'].state, 'solid');
  assert.equal(skills.a.mastery['3'], undefined);
});
