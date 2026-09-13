import { mkdirSync, writeFileSync, renameSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// iPad 同步来的进度只落在这台电脑的 data/progress/ 下。
// 仓库是公开的——data/ 已在 .gitignore 里，孩子的数据绝不能提交。
export const MAX_UPLOAD_BYTES = 512 * 1024;

const SKILL_SHORT = {
  counting: '数数', numerals: '数字', colors: '颜色', math: '算数',
  literacy: '认字', tracing: '描字', shapes: '形状', compare: '比较',
};

export function parseUpload(text) {
  let body = null;
  try { body = JSON.parse(text); } catch { body = null; }
  const save = body && body.save;
  if (!save || typeof save !== 'object' || save.version !== 1 || !save.skills || typeof save.skills !== 'object') {
    return { error: 'not a garage save' };
  }
  return {
    save,
    app: typeof body.app === 'string' ? body.app.slice(0, 40) : '',
    sentAt: Number.isFinite(body.sentAt) ? body.sentAt : null,
    // 哪台 iPad 发来的（v15 起才有）。只收字母数字和横线——它会拼进文件名
    device: typeof body.device === 'string' && /^[a-z0-9-]{4,40}$/i.test(body.device) ? body.device : '',
  };
}

export function localDay(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function totalJobs(save) {
  const daily = (save && save.stats && save.stats.daily) || {};
  return Object.values(daily).reduce((a, d) => a + ((d && d.jobs) || 0), 0);
}

// 先写临时文件再改名：任何时候去读 latest.json 都不会读到写了一半的文件。
function atomicWrite(file, text) {
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, file);
}

function readJson(file) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
}

// devices/编号.json = 每台 iPad 各自的最新一份（老版本没有编号的记作 legacy）。
// latest.json + daily/日期.json = "主进度"，报告读的是它。家里有两台 iPad 时，主进度只跟着
// "同一台 iPad"或"进度不少于它的那台"走——否则一台空白 iPad 同步一次就能把孩子的主进度冲掉
// （2026-09-13 真实发生过：旧 iPad mini 打开游戏，0 单的存档盖掉了孩子的进度）。
export function writeProgress(dir, record, now = new Date()) {
  const daily = join(dir, 'daily');
  const devices = join(dir, 'devices');
  mkdirSync(daily, { recursive: true });
  mkdirSync(devices, { recursive: true });
  const device = record.device || '';
  const text = JSON.stringify({
    receivedAt: now.toISOString(), app: record.app, device, sentAt: record.sentAt, save: record.save,
  }, null, 2);
  const deviceFile = join(devices, `${device || 'legacy'}.json`);
  atomicWrite(deviceFile, text);
  const latest = join(dir, 'latest.json');
  const day = join(daily, `${localDay(now)}.json`);
  const cur = existsSync(latest) ? readJson(latest) : null;
  const sameDevice = !!(device && cur && cur.device === device);
  const main = !cur || !cur.save || sameDevice || totalJobs(record.save) >= totalJobs(cur.save);
  if (main) {
    atomicWrite(latest, text);
    atomicWrite(day, text);
  }
  return { latest, day, deviceFile, main };
}

export function summarize(save, today = localDay()) {
  const daily = (save.stats && save.stats.daily) || {};
  const total = Object.values(daily).reduce((a, d) => a + ((d && d.jobs) || 0), 0);
  const todayJobs = (daily[today] && daily[today].jobs) || 0;
  const levels = Object.entries(save.skills)
    .map(([k, s]) => `${SKILL_SHORT[k] || k}L${Math.floor((s && s.level) || 1)}`).join(' ');
  return `累计${total}单 今日${todayJobs}单 | ${levels}`;
}
