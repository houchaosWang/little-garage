import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseUpload, writeProgress, summarize, localDay } from '../tools/progress-store.mjs';
import { diagnose, renderReport, SKILLS } from '../tools/progress-report.mjs';
import { createStore, defaultSave, LOG_CAP } from '../js/store.js';
import { syncLine } from '../js/parent.js';

function fakeStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
  };
}

test('parseUpload：只收维修站存档', () => {
  const ok = parseUpload(JSON.stringify({ app: 'garage-v11', sentAt: 5, save: defaultSave() }));
  assert.equal(ok.error, undefined);
  assert.equal(ok.app, 'garage-v11');
  assert.equal(ok.sentAt, 5);
  for (const bad of ['', 'x', '{}', JSON.stringify({ save: { version: 2, skills: {} } }),
    JSON.stringify({ save: { version: 1 } }), JSON.stringify(defaultSave())]) {
    assert.ok(parseUpload(bad).error, bad.slice(0, 30));
  }
  const odd = parseUpload(JSON.stringify({ app: 'x'.repeat(100), sentAt: 'soon', save: defaultSave() }));
  assert.equal(odd.app.length, 40);
  assert.equal(odd.sentAt, null);
});

test('writeProgress：latest + 当天快照，原子写入，不留临时文件', () => {
  const dir = mkdtempSync(join(tmpdir(), 'garage-progress-'));
  try {
    const save = defaultSave();
    save.skills.math.level = 3;
    const now = new Date(2026, 8, 12, 15, 30);
    const { latest, day } = writeProgress(dir, { app: 'garage-v11', sentAt: 1, save }, now);
    assert.ok(latest.endsWith('latest.json'));
    assert.ok(day.endsWith(join('daily', '2026-09-12.json')));
    const rec = JSON.parse(readFileSync(latest, 'utf8'));
    assert.equal(rec.save.skills.math.level, 3);
    assert.equal(rec.app, 'garage-v11');
    assert.equal(rec.receivedAt, now.toISOString());
    assert.deepEqual(JSON.parse(readFileSync(day, 'utf8')), rec);
    // 同一天再来一份：覆盖当天快照，不新增文件
    save.skills.math.level = 4;
    writeProgress(dir, { app: 'garage-v11', sentAt: 2, save }, new Date(2026, 8, 12, 20, 0));
    assert.deepEqual(readdirSync(join(dir, 'daily')), ['2026-09-12.json']);
    assert.equal(JSON.parse(readFileSync(latest, 'utf8')).save.skills.math.level, 4);
    assert.equal(readdirSync(dir).filter(f => f.endsWith('.tmp')).length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('summarize：服务器窗口里那一行', () => {
  const save = defaultSave();
  save.stats.daily = { '2026-09-11': { jobs: 4 }, '2026-09-12': { jobs: 2 } };
  save.skills.math.level = 3.5;
  const line = summarize(save, '2026-09-12');
  assert.match(line, /累计6单 今日2单/);
  assert.match(line, /算数L3/);
  assert.equal(localDay(new Date(2026, 0, 5)), '2026-01-05');
});

test('recordGame 记明细：级别、错、求助、用时、题目；抽查/金头盔打标；总账照记', () => {
  const s = createStore(fakeStorage(), () => '2026-09-12');
  const d = s.load();
  s.recordGame(d, 'math', { errors: 1, helps: 0 }, { level: 2, ms: 6140, sig: '3+4' });
  s.recordGame(d, 'tires', { errors: 0, helps: 1 }, { level: 1, ms: 9000, review: true });
  s.recordGame(d, 'compare', { errors: 0, helps: 0 }, { level: 3, ms: 4000, vip: true });
  s.recordGame(d, 'wash', { errors: 0, helps: 0 });
  assert.deepEqual(d.stats.log, [
    { day: '2026-09-12', game: 'math', lvl: 2, err: 1, help: 0, sec: 6.1, sig: '3+4' },
    { day: '2026-09-12', game: 'tires', lvl: 1, err: 0, help: 1, sec: 9, review: 1 },
    { day: '2026-09-12', game: 'compare', lvl: 3, err: 0, help: 0, sec: 4, vip: 1 },
    { day: '2026-09-12', game: 'wash', lvl: 0, err: 0, help: 0, sec: 0 },
  ]);
  assert.equal(d.stats.byGame.math.errors, 1);
  assert.equal(d.stats.byGame.tires.helps, 1);
});

test('明细是环形的，只留最近 LOG_CAP 条（总账不受影响）', () => {
  const s = createStore(fakeStorage(), () => '2026-09-12');
  const d = s.load();
  for (let i = 0; i < LOG_CAP + 25; i++) s.recordGame(d, 'tires', { errors: 0, helps: 0 }, { level: 1, sig: String(i) });
  assert.equal(d.stats.log.length, LOG_CAP);
  assert.equal(d.stats.log[0].sig, '25');
  assert.equal(d.stats.byGame.tires.plays, LOG_CAP + 25);
});

test('旧存档没有明细字段：读出来自动补空数组', () => {
  const st = fakeStorage();
  st.setItem('garage-save-v1', JSON.stringify({ version: 1, skills: {}, stats: { daily: {}, byGame: {}, byVehicle: {} } }));
  assert.deepEqual(createStore(st).load().stats.log, []);
});

test('每次存档都会通知同步；同步出错不影响存档', () => {
  const seen = [];
  const st = fakeStorage();
  const s = createStore(st, () => '2026-09-12', { onSave: d => seen.push(d.settings.dailyJobs) });
  const d = s.load();
  d.settings.dailyJobs = 6;
  s.save(d);
  assert.deepEqual(seen, [6]);
  const boom = createStore(st, () => '2026-09-12', { onSave: () => { throw new Error('sync down'); } });
  d.settings.dailyJobs = 7;
  boom.save(d);
  assert.equal(boom.load().settings.dailyJobs, 7);
});

test('存储写失败时不通知同步（只同步真正存下来的）', () => {
  const seen = [];
  const full = { getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem: () => {} };
  createStore(full, () => '2026-09-12', { onSave: d => seen.push(d) }).save(defaultSave());
  assert.equal(seen.length, 0);
});

test('syncLine：家长面板那一行', () => {
  const now = new Date(2026, 8, 12, 18, 0);
  assert.match(syncLine(false, {}, now), /不是从家里电脑装的/);
  assert.match(syncLine(true, {}, now), /还没同步/);
  assert.match(syncLine(true, undefined, now), /还没同步/);
  assert.equal(syncLine(true, { okAt: new Date(2026, 8, 12, 14, 5).getTime() }, now), '已同步到电脑 · 今天 14:05');
  assert.equal(syncLine(true, { okAt: new Date(2026, 8, 10, 9, 7).getTime() }, now), '已同步到电脑 · 9月10日 09:07');
});

function saveWithLog(entries, levels = {}) {
  const save = defaultSave();
  for (const [k, v] of Object.entries(levels)) Object.assign(save.skills[k], v);
  save.stats.log = entries;
  return save;
}
const play = (game, lvl, err = 0, help = 0, extra = {}) => ({ day: '2026-09-12', game, lvl, err, help, sec: 5, ...extra });

test('diagnose：少于3局不下结论', () => {
  const d = diagnose(saveWithLog([play('math', 1), play('math', 1)]));
  assert.equal(d.find(x => x.key === 'math').tag, 'few');
});

test('diagnose：最近几乎全对 → 偏简单', () => {
  const d = diagnose(saveWithLog([play('math', 1), play('math', 1), play('math', 2), play('math', 2), play('math', 2)],
    { math: { level: 2 } }));
  const m = d.find(x => x.key === 'math');
  assert.equal(m.tag, 'easy');
  assert.equal(m.cleanRate, 1);
  assert.equal(m.sec, 5);
});

test('diagnose：一半以上出错或求助 → 吃力', () => {
  const d = diagnose(saveWithLog([play('math', 2, 1), play('math', 2, 0, 1), play('math', 2, 2), play('math', 2)]));
  assert.equal(d.find(x => x.key === 'math').tag, 'hard');
});

test('diagnose：封顶还全对 → 该加一级；抽查和金头盔题不算（封顶级数随配置走，不写死）', () => {
  const M = SKILLS.counting.max;
  const log = [play('tires', M), play('tires', M), play('tires', M),
    play('tires', 1, 3, 0, { review: 1 }), play('tires', M, 5, 0, { vip: 1 })];
  const t = diagnose(saveWithLog(log, { counting: { level: M } })).find(x => x.key === 'counting');
  assert.equal(t.tag, 'ceiling');
  assert.equal(t.plays, 3);
  // 同样全对但还没到顶 → 只是偏简单，不是封顶
  const below = diagnose(saveWithLog([play('tires', M - 1), play('tires', M - 1), play('tires', M - 1)],
    { counting: { level: M - 1 } })).find(x => x.key === 'counting');
  assert.equal(below.tag, 'easy');
});

test('renderReport：没有明细的老数据也能出报告', () => {
  const save = defaultSave();
  save.stats.daily = { '2026-09-10': { jobs: 4 }, '2026-09-11': { jobs: 4 } };
  save.stats.byGame = { tires: { plays: 5, errors: 1, helps: 0 }, wash: { plays: 2, errors: 0, helps: 0 } };
  save.skills.counting.level = 2;
  const text = renderReport({ receivedAt: '2026-09-12T07:00:00.000Z', app: 'garage-v11', save });
  assert.match(text, /玩了 2 天，共 8 单，学习小游戏 5 局/);
  assert.match(text, new RegExp(`平均每个技能每天轮到 ${(5 / 2 / Object.keys(SKILLS).length).toFixed(1).replace('.', '\\.')} 局`));
  // 被"今天重新营业"清过计数时，按车数统计
  save.stats.byVehicle = { race: 20, fire: 6 };
  assert.match(renderReport({ save }), /共 26 单.*\n.*18 单的日计数被"今天重新营业"清掉过/);
  assert.match(text, /数数·装轮胎\s+当前L2/);
  assert.match(text, /现有 0 条/);
  assert.match(text, /样本太少/);
});
