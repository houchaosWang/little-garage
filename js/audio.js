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
  if (window.innerHeight > window.innerWidth) return;
  if (!unlocked) return;
  const c = ensureCtx();
  if (c && c.state !== 'running') {
    try { c.resume(); } catch { /* iOS需要手势时会静默失败，下次触摸再试 */ }
    // 老 iOS 要在手势里真的放一下声音才算解锁：放一个 1 帧的静音
    try {
      const s = c.createBufferSource();
      s.buffer = c.createBuffer(1, 1, 22050);
      s.connect(c.destination);
      s.start(0);
    } catch { /* 解锁失败下次触摸再试 */ }
  }
  if (keepalive && keepalive.paused) keepalive.play().catch(() => {});
}

export function setPaused(p) {
  if (!ctx) return;
  try {
    if (p) ctx.suspend();
    else if (unlocked) ctx.resume();
  } catch {}
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
// 老 iOS 只认 touchend 里的解锁（pointerdown 发生在 touchstart 阶段，不算"用户手势"）
document.addEventListener('touchend', wake, true);
document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
window.addEventListener('pageshow', wake);
window.addEventListener('focus', wake);

// 老 iPad（iOS 14.4 及以前，Safari < 14.1）的 decodeAudioData 只认回调写法、不返回 Promise，
// 只传一个参数会直接抛错——那样所有语音都"没准备好"，游戏一句话都不说。回调写法新旧都支持。
function decode(c, raw) {
  return new Promise((resolve, reject) => {
    const p = c.decodeAudioData(raw, resolve, reject);
    if (p && typeof p.then === 'function') p.then(resolve, reject);
  });
}

function loadBuffer(name) {
  if (!buffers.has(name)) {
    const p = (async () => {
      const c = ensureCtx();
      if (!c) throw new Error('no-ctx');
      const res = await fetch(`audio/${name}.mp3`);
      if (!res.ok) throw new Error(name);
      const raw = await res.arrayBuffer();
      return await decode(c, raw);
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
    try { c.src.onended = null; c.src.stop(0); } catch {}
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
      src.start(0);
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
      // iOS 被打断后 resume() 可能一直挂起到下一次触摸；算数讲解是一句句 await 的，
      // 不能让它卡住整个游戏——最多等0.8秒，之后照常往下走（播放本身也有超时兜底）
      if (ctx && ctx.state !== 'running') {
        try { await Promise.race([ctx.resume(), new Promise(r => setTimeout(r, 800))]); } catch {}
      }
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
  // 分两句连：老 WebKit 的 connect() 不返回目标节点，链式写法会抛错
  o.connect(g);
  g.connect(ctx.destination);
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
