import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateLanHost, shouldSync, createSync } from '../js/sync.js';

function fakeStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
  };
}

function fakeTimers() {
  let seq = 0;
  const q = new Map();
  return {
    setTimer: fn => { seq += 1; q.set(seq, fn); return seq; },
    clearTimer: id => { q.delete(id); },
    runAll: () => { const fns = [...q.values()]; q.clear(); fns.forEach(f => f()); },
    pending: () => q.size,
  };
}

const settle = () => new Promise(r => setImmediate(r));

test('只有私有局域网地址才算"自家电脑"', () => {
  for (const h of ['192.168.0.42', '10.0.0.5', '172.16.0.1', '172.31.255.255',
    '100.103.75.29', '100.64.0.1', '100.127.0.1']) {
    assert.equal(isPrivateLanHost(h), true, h);
  }
  for (const h of ['houchaoswang.github.io', 'localhost', '127.0.0.1', '8.8.8.8', '172.15.0.1',
    '172.32.0.1', '100.63.0.1', '100.128.0.1', '192.169.0.1', '999.1.1.1', '1.2.3', '', undefined]) {
    assert.equal(isPrivateLanHost(h), false, String(h));
  }
});

test('shouldSync：只认 https + 局域网IP；github.io 与本机调试一律不发', () => {
  assert.equal(shouldSync({ protocol: 'https:', hostname: '192.168.0.42' }), true);
  assert.equal(shouldSync({ protocol: 'https:', hostname: '100.103.75.29' }), true);
  assert.equal(shouldSync({ protocol: 'https:', hostname: 'houchaoswang.github.io' }), false);
  assert.equal(shouldSync({ protocol: 'http:', hostname: '192.168.0.42' }), false);
  assert.equal(shouldSync({ protocol: 'http:', hostname: 'localhost' }), false);
  assert.equal(shouldSync({ protocol: 'https:', hostname: 'localhost' }), false);
  assert.equal(shouldSync(undefined), false);
});

test('连着存好几次档只发一次，而且发的是最新那份', async () => {
  const t = fakeTimers();
  const sent = [];
  const s = createSync({
    enabled: true, storage: fakeStorage(), now: () => 1000, ...t,
    post: async b => { sent.push(JSON.parse(b)); return true; },
  });
  s.schedule({ v: 1 });
  s.schedule({ v: 2 });
  s.schedule({ v: 3 });
  assert.equal(t.pending(), 1);
  t.runAll();
  await settle();
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].save, { v: 3 });
  assert.equal(sent[0].sentAt, 1000);
  assert.equal(s.status().okAt, 1000);
});

test('不是从家里电脑装的：永远不发，也不排计时器', async () => {
  const t = fakeTimers();
  let calls = 0;
  const s = createSync({ enabled: false, storage: fakeStorage(), ...t, post: async () => { calls += 1; return true; } });
  s.schedule({ v: 1 });
  assert.equal(t.pending(), 0);
  assert.equal(await s.flush(), false);
  assert.equal(calls, 0);
  assert.equal(s.enabled, false);
});

test('电脑没开：失败静默，记下尝试时间，保留上次成功时间', async () => {
  let clock = 1000;
  let up = true;
  const s = createSync({
    enabled: true, storage: fakeStorage(), now: () => clock, ...fakeTimers(),
    post: async () => { if (!up) throw new Error('offline'); return true; },
  });
  s.schedule({ v: 1 });
  assert.equal(await s.flush(), true);
  up = false;
  clock = 2000;
  s.schedule({ v: 2 });
  assert.equal(await s.flush(), false);
  assert.deepEqual(s.status(), { okAt: 1000, triedAt: 2000 });
});

test('服务器回非200也算失败', async () => {
  const s = createSync({ enabled: true, storage: fakeStorage(), ...fakeTimers(), post: async () => false });
  s.schedule({});
  assert.equal(await s.flush(), false);
  assert.equal(s.status().okAt, undefined);
});

test('切走页面立刻发，不等3秒；没有新存档就不重复发', async () => {
  const t = fakeTimers();
  const sent = [];
  const s = createSync({ enabled: true, storage: fakeStorage(), ...t, post: async b => { sent.push(b); return true; } });
  s.schedule({ v: 1 });
  await s.flush();
  assert.equal(sent.length, 1);
  assert.equal(t.pending(), 0);
  assert.equal(await s.flush(), false);
  assert.equal(sent.length, 1);
});

test('版本号可以晚到（启动后才从缓存名里读出来）', async () => {
  let v = '';
  const sent = [];
  const s = createSync({
    enabled: true, storage: fakeStorage(), app: () => v, ...fakeTimers(),
    post: async b => { sent.push(JSON.parse(b)); return true; },
  });
  v = 'garage-v11';
  s.schedule({});
  await s.flush();
  assert.equal(sent[0].app, 'garage-v11');
});

test('存储坏了也不抛错', async () => {
  const broken = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
  const s = createSync({ enabled: true, storage: broken, ...fakeTimers(), post: async () => true });
  s.schedule({});
  assert.equal(await s.flush(), true);
  assert.deepEqual(s.status(), {});
});
