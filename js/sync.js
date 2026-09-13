// 局域网同步：把孩子的进度发给家里那台装游戏的电脑，家长（和 Claude）在电脑上就能看。
// 边界——这是对"数据不出家门"的承诺，改之前想清楚：
//   只在 https + 私有局域网IP（192.168 / 10 / 172.16-31，以及 Tailscale 的 100.64-127）下才发。
//   github.io 等任何公网地址一个字节都不发；localhost 调试也不发，免得测试数据混进真实进度。
// 电脑关着是常态：发不出去就静默放弃，下次存档再发，孩子完全无感。
const STATUS_KEY = 'garage-sync-v1';
const DEVICE_KEY = 'garage-device-v1';

export function isPrivateLanHost(hostname) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(String(hostname || ''));
  if (!m) return false;
  const o = m.slice(1).map(Number);
  if (o.some(n => n > 255)) return false;
  const [a, b] = o;
  return (a === 192 && b === 168) || a === 10 || (a === 172 && b >= 16 && b <= 31)
    || (a === 100 && b >= 64 && b <= 127);
}

export function shouldSync(loc) {
  return !!loc && loc.protocol === 'https:' && isPrivateLanHost(loc.hostname);
}

// 每台 iPad 一个随机编号，只用来让电脑分清"这是哪台 iPad 的进度"，不含任何个人信息。
// 家里有两台 iPad 时，没有它就会互相覆盖——一台刚装好的空白 iPad 同步一次，就把孩子的主进度冲掉了。
export function deviceId(storage, rand = Math.random, now = Date.now) {
  try {
    const old = storage.getItem(DEVICE_KEY);
    if (old && /^[a-z0-9-]{4,40}$/.test(old)) return old;
  } catch { /* 读不了就用一个临时编号 */ }
  const id = `pad-${now().toString(36)}-${Math.floor(rand() * 1e9).toString(36)}`;
  try { storage.setItem(DEVICE_KEY, id); } catch { /* 静默 */ }
  return id;
}

export function createSync({
  enabled, post, storage, app = '', device = '',
  now = () => Date.now(), delayMs = 3000,
  setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = id => clearTimeout(id),
}) {
  let timer = null;
  let pending = null;
  const dev = enabled ? (device || deviceId(storage)) : '';

  function status() {
    try { return JSON.parse(storage.getItem(STATUS_KEY) || 'null') || {}; } catch { return {}; }
  }
  function remember(patch) {
    try { storage.setItem(STATUS_KEY, JSON.stringify({ ...status(), ...patch })); } catch { /* 静默 */ }
  }

  // 一局里会连着存好几次档，攒 3 秒只发最后一份；页面被切走时立刻发。
  async function flush() {
    if (timer !== null) { clearTimer(timer); timer = null; }
    if (!enabled || !pending) return false;
    const body = JSON.stringify({ app: typeof app === 'function' ? app() : app, device: dev, sentAt: now(), save: pending });
    pending = null;
    let ok = false;
    try { ok = !!(await post(body)); } catch { ok = false; }
    remember(ok ? { okAt: now(), triedAt: now() } : { triedAt: now() });
    return ok;
  }

  function schedule(data) {
    if (!enabled) return;
    pending = data;
    if (timer !== null) clearTimer(timer);
    timer = setTimer(() => { timer = null; flush(); }, delayMs);
  }

  return { enabled: !!enabled, schedule, flush, status };
}
