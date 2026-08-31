let ctx = null;
let unlocked = false;
const cache = new Map();

export function unlock() {
  if (unlocked) return;
  unlocked = true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { ctx = null; }
}

function loadClip(name) {
  if (!cache.has(name)) {
    cache.set(name, new Promise((resolve, reject) => {
      const a = new Audio(`audio/${name}.mp3`);
      a.preload = 'auto';
      a.addEventListener('canplaythrough', () => resolve(a), { once: true });
      a.addEventListener('error', () => reject(new Error(name)), { once: true });
      a.load();
    }));
  }
  return cache.get(name);
}

export function preload(names) {
  for (const n of names) loadClip(n).catch(() => {});
}

let queue = Promise.resolve();
export function say(...names) {
  queue = queue.then(async () => {
    for (const n of names) {
      try {
        const a = await Promise.race([
          loadClip(n),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000)),
        ]);
        await new Promise(res => {
          const c = a.cloneNode();
          c.addEventListener('ended', res, { once: true });
          c.addEventListener('error', res, { once: true });
          c.play().catch(res);
        });
      } catch { /* 缺音频不阻塞游戏 */ }
    }
  });
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
