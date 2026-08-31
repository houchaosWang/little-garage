import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, localDate } from '../js/store.js';

function fakeStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
  };
}

test('空存储返回默认档', () => {
  const s = createStore(fakeStorage(), () => '2026-08-31');
  const d = s.load();
  assert.equal(d.version, 1);
  assert.equal(d.skills.counting.level, 1);
  assert.equal(d.settings.dailyJobs, 4);
  assert.equal(Object.keys(d.skills).length, 6);
  assert.deepEqual(d.skills.counting.mastery, {});
  assert.deepEqual(d.skills.counting.recent, []);
  assert.deepEqual(d.reviewsToday, { date: '', count: 0 });
});

test('损坏JSON回默认档不抛错', () => {
  const st = fakeStorage();
  st.setItem('garage-save-v1', '{oops');
  const s = createStore(st, () => '2026-08-31');
  assert.equal(s.load().version, 1);
});

test('保存后能读回，且缺字段用默认补全', () => {
  const st = fakeStorage();
  const s = createStore(st, () => '2026-08-31');
  const d = s.load();
  d.skills.counting.level = 2.5;
  s.save(d);
  const d2 = s.load();
  assert.equal(d2.skills.counting.level, 2.5);
  assert.equal(d2.settings.dailyJobs, 4);
});

test('recordJob 累计当日，跨天从0起', () => {
  const st = fakeStorage();
  let today = '2026-08-31';
  const s = createStore(st, () => today);
  let d = s.load();
  s.recordJob(d);
  s.recordJob(d);
  assert.equal(s.jobsToday(d), 2);
  today = '2026-09-01';
  d = s.load();
  assert.equal(s.jobsToday(d), 0);
});

test('recordGame 累计游戏统计', () => {
  const s = createStore(fakeStorage(), () => '2026-08-31');
  const d = s.load();
  s.recordGame(d, 'tires', { helps: 1, errors: 0 });
  s.recordGame(d, 'tires', { helps: 0, errors: 2 });
  assert.deepEqual(d.stats.byGame.tires, { plays: 2, helps: 1, errors: 2 });
});

test('localDate 格式 YYYY-MM-DD', () => {
  assert.match(localDate(new Date(2026, 0, 5)), /^2026-01-05$/);
});

test('残缺存档load时用默认值补全缺失字段', () => {
  const st = fakeStorage();
  st.setItem('garage-save-v1', '{"version":1,"skills":{}}');
  const s = createStore(st, () => '2026-08-31');
  const d = s.load();
  assert.equal(d.skills.counting.level, 1);
  assert.equal(d.skills.counting.streak, 0);
  assert.equal(d.settings.dailyJobs, 4);
  assert.deepEqual(d.stats, { daily: {}, byGame: {} });
});

test('reopenToday 清除当日计数并立即生效', () => {
  const st = fakeStorage();
  const s = createStore(st, () => '2026-08-31');
  const d = s.load();
  s.recordJob(d);
  s.recordJob(d);
  s.reopenToday(d);
  assert.equal(s.jobsToday(d), 0);
  assert.equal(s.jobsToday(s.load()), 0);
});

test('wipe 后回默认档', () => {
  const st = fakeStorage();
  const s = createStore(st, () => '2026-08-31');
  const d = s.load();
  d.settings.dailyJobs = 9;
  s.save(d);
  s.wipe();
  assert.equal(s.load().settings.dailyJobs, 4);
});

test('旧档自动补全新技能字段且不动旧进度', () => {
  const st = fakeStorage();
  st.setItem('garage-save-v1', JSON.stringify({ version: 1, skills: { counting: { level: 2.5, streak: 1 } } }));
  const s = createStore(st, () => '2026-08-31');
  const d = s.load();
  assert.equal(d.skills.counting.level, 2.5);
  assert.equal(d.skills.numerals.level, 1);
  assert.equal(d.skills.colors.level, 1);
  assert.equal(d.skills.math.level, 1);
  assert.equal(d.skills.literacy.level, 1);
  assert.equal(d.skills.tracing.level, 1);
  assert.deepEqual(d.skills.counting.mastery, {});
  assert.deepEqual(d.skills.counting.recent, []);
  assert.deepEqual(d.reviewsToday, { date: '', count: 0 });
});
