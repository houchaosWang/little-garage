import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseUpload, writeProgress, totalJobs } from '../tools/progress-store.mjs';
import { createSync, deviceId } from '../js/sync.js';
import { defaultSave } from '../js/store.js';

const saveWithJobs = n => {
  const s = defaultSave();
  s.stats.daily = n ? { '2026-09-12': { jobs: n } } : {};
  return s;
};
const withDir = fn => {
  const dir = mkdtempSync(join(tmpdir(), 'garage-dev-'));
  try { fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
};
const read = f => JSON.parse(readFileSync(f, 'utf8'));

test('parseUpload 带上设备编号；不像编号的一律当没有（它会拼进文件名）', () => {
  assert.equal(parseUpload(JSON.stringify({ device: 'pad-abc123', save: defaultSave() })).device, 'pad-abc123');
  for (const bad of ['../../etc', 'a/b', 'x', 'pad abc', 42]) {
    assert.equal(parseUpload(JSON.stringify({ device: bad, save: defaultSave() })).device, '', String(bad));
  }
  assert.equal(parseUpload(JSON.stringify({ save: defaultSave() })).device, '');
});

test('第二台空白 iPad 同步：单独存放，冲不掉孩子的主进度（2026-09-13 的真实事故）', () => withDir(dir => {
  assert.equal(writeProgress(dir, { device: 'pad-main01', save: saveWithJobs(26) }, new Date(2026, 8, 13, 11, 0)).main, true);
  const w = writeProgress(dir, { device: 'pad-mini01', save: saveWithJobs(0) }, new Date(2026, 8, 13, 11, 10));
  assert.equal(w.main, false);
  assert.equal(totalJobs(read(join(dir, 'latest.json')).save), 26);
  assert.equal(totalJobs(read(join(dir, 'daily', '2026-09-13.json')).save), 26);
  assert.equal(read(join(dir, 'devices', 'pad-mini01.json')).device, 'pad-mini01');
  assert.deepEqual(readdirSync(join(dir, 'devices')).sort(), ['pad-main01.json', 'pad-mini01.json']);
}));

test('同一台 iPad 的新进度总是更新主进度（哪怕清空了）', () => withDir(dir => {
  writeProgress(dir, { device: 'pad-main01', save: saveWithJobs(26) });
  assert.equal(writeProgress(dir, { device: 'pad-main01', save: saveWithJobs(0) }).main, true);
  assert.equal(totalJobs(read(join(dir, 'latest.json')).save), 0);
}));

test('存档搬到另一台 iPad 后：新 iPad 进度不少于主进度就接管，旧的那台不再覆盖', () => withDir(dir => {
  writeProgress(dir, { device: 'pad-old001', save: saveWithJobs(26) });
  assert.equal(writeProgress(dir, { device: 'pad-new001', save: saveWithJobs(26) }).main, true);
  assert.equal(read(join(dir, 'latest.json')).device, 'pad-new001');
  assert.equal(writeProgress(dir, { device: 'pad-old001', save: saveWithJobs(20) }).main, false);
}));

test('老版本（没有设备编号）按进度多少判断：空白的冲不掉有进度的', () => withDir(dir => {
  writeProgress(dir, { device: '', save: saveWithJobs(0) });
  assert.equal(writeProgress(dir, { device: '', save: saveWithJobs(26) }).main, true);
  assert.equal(writeProgress(dir, { device: '', save: saveWithJobs(0) }).main, false);
  assert.ok(existsSync(join(dir, 'devices', 'legacy.json')));
}));

test('每台 iPad 一个固定的随机编号，存在本机；存储坏了也照样能同步', async () => {
  const m = new Map();
  const st = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
  const a = deviceId(st);
  assert.match(a, /^[a-z0-9-]{4,40}$/);
  assert.equal(deviceId(st), a);
  const broken = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  assert.match(deviceId(broken), /^pad-[a-z0-9]+-[a-z0-9]+$/);
  const sent = [];
  const s = createSync({
    enabled: true, storage: st, setTimer: fn => { fn(); return 1; }, clearTimer: () => {},
    post: async b => { sent.push(JSON.parse(b)); return true; },
  });
  s.schedule({ v: 1 });
  await new Promise(r => setImmediate(r));
  assert.equal(sent[0].device, a);
  // 不同步的来源（github.io、localhost）不生成编号
  const quiet = new Map();
  createSync({ enabled: false, storage: { getItem: k => quiet.get(k) ?? null, setItem: (k, v) => quiet.set(k, v) }, post: async () => true });
  assert.equal(quiet.size, 0);
});
