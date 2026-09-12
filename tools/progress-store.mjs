import { mkdirSync, writeFileSync, renameSync } from 'node:fs';
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
  };
}

export function localDay(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 先写临时文件再改名：任何时候去读 latest.json 都不会读到写了一半的文件。
function atomicWrite(file, text) {
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, file);
}

// latest.json = 最新一份；daily/日期.json = 每天最后一份（留着看每天的变化）。
export function writeProgress(dir, record, now = new Date()) {
  const daily = join(dir, 'daily');
  mkdirSync(daily, { recursive: true });
  const text = JSON.stringify({
    receivedAt: now.toISOString(), app: record.app, sentAt: record.sentAt, save: record.save,
  }, null, 2);
  const latest = join(dir, 'latest.json');
  const day = join(daily, `${localDay(now)}.json`);
  atomicWrite(latest, text);
  atomicWrite(day, text);
  return { latest, day };
}

export function summarize(save, today = localDay()) {
  const daily = (save.stats && save.stats.daily) || {};
  const total = Object.values(daily).reduce((a, d) => a + ((d && d.jobs) || 0), 0);
  const todayJobs = (daily[today] && daily[today].jobs) || 0;
  const levels = Object.entries(save.skills)
    .map(([k, s]) => `${SKILL_SHORT[k] || k}L${Math.floor((s && s.level) || 1)}`).join(' ');
  return `累计${total}单 今日${todayJobs}单 | ${levels}`;
}
