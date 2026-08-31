let ctx = null;
let unlocked = false;
let keepalive = null;
const buffers = new Map();

function ensureCtx() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
  }
  return ctx;
}

function wake() {
  if (!unlocked) return;
  const c = ensureCtx();
  if (c && c.state !== 'running') { try { c.resume(); } catch { /* iOS需要手势时会静默失败，下次触摸再试 */ } }
  if (keepalive && keepalive.paused) keepalive.play().catch(() => {});
}

export function unlock() {
  if (unlocked) return;
  unlocked = true;
  const c = ensureCtx();
  if (c && c.state !== 'running') { try { c.resume(); } catch {} }
  try {
    keepalive = new Audio('audio/silence.wav');
    keepalive.loop = true;
    keepalive.play().catch(() => {});
  } catch { keepalive = null; }
}

document.addEventListener('pointerdown', wake, true);
document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
window.addEventListener('pageshow', wake);
window.addEventListener('focus', wake);

function loadBuffer(name) {
  if (!buffers.has(name)) {
    const p = (async () => {
      const c = ensureCtx();
      if (!c) throw new Error('no-ctx');
      const res = await fetch(`audio/${name}.mp3`);
      if (!res.ok) throw new Error(name);
      const raw = await res.arrayBuffer();
      return await c.decodeAudioData(raw);
    })();
    buffers.set(name, p);
    p.catch(() => { buffers.delete(name); });
  }
  return buffers.get(name);
}

export function preload(names, onProgress) {
  let done = 0, failed = 0;
  const total = names.length;
  const tick = ok => {
    done += 1;
    if (!ok) failed += 1;
    if (onProgress) onProgress(done, total);
  };
  return Promise.all(names.map(n => loadBuffer(n).then(() => tick(true), () => tick(false))))
    .then(() => failed);
}

let gen = 0;
let current = null;

function stopCurrent() {
  if (current) {
    const c = current;
    current = null;
    try { c.src.onended = null; c.src.stop(); } catch {}
    c.res();
  }
}

function playBuffer(buf, myGen) {
  return new Promise(res => {
    if (myGen !== gen) return res();
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      current = { src, res };
      const done = () => {
        if (current && current.src === src) current = null;
        res();
      };
      src.onended = done;
      src.start();
      setTimeout(done, buf.duration * 1000 + 500);
    } catch { res(); }
  });
}

async function speak(names, myGen) {
  for (const n of names) {
    if (myGen !== gen) return;
    try {
      const buf = await Promise.race([
        loadBuffer(n),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000)),
      ]);
      if (myGen !== gen) return;
      if (ctx && ctx.state !== 'running') { try { await ctx.resume(); } catch {} }
      await playBuffer(buf, myGen);
    } catch { /* 缺音频不阻塞游戏 */ }
  }
}

let queue = Promise.resolve();

export function say(...names) {
  const myGen = gen;
  queue = queue.then(() => speak(names, myGen));
  return queue;
}

export function sayNow(...names) {
  gen += 1;
  const myGen = gen;
  stopCurrent();
  queue = Promise.resolve().then(() => speak(names, myGen));
  return queue;
}

function tone(freq, dur, type = 'sine', gainPeak = 0.25, when = 0) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = ctx.currentTime + when;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gainPeak, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx = {
  ding() { tone(880, 0.3); tone(1320, 0.4, 'sine', 0.15, 0.05); },
  pop() { tone(520, 0.12, 'triangle', 0.3); },
  snap() { tone(660, 0.15, 'triangle', 0.3); tone(990, 0.2, 'sine', 0.15, 0.06); },
  horn() { tone(392, 0.25, 'square', 0.12); tone(494, 0.35, 'square', 0.12, 0.18); },
  cheer() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'triangle', 0.2, i * 0.12)); },
  night() { [659, 523, 392].forEach((f, i) => tone(f, 0.5, 'sine', 0.12, i * 0.3)); },
};
