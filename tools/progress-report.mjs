// 读 iPad 同步到这台电脑的进度，打印成人话，并判断"哪里太简单、哪里吃力、是不是升得太慢"。
// 用法：node tools/progress-report.mjs            （读 data/progress/latest.json）
//       node tools/progress-report.mjs 某份.json
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { levelState, STATE_INFO, GAME_NAMES } from '../js/parent.js';
import {
  MAX_TIRE_LEVEL, MAX_FUEL_LEVEL, MAX_LIGHTS_LEVEL, MAX_MATH_LEVEL,
  MAX_HANZI_LEVEL, MAX_TRACE_LEVEL, MAX_SHAPES_LEVEL, MAX_COMPARE_LEVEL,
} from '../js/taskgen.js';

export const SKILLS = {
  counting: { name: '数数·装轮胎', game: 'tires', max: MAX_TIRE_LEVEL },
  numerals: { name: '认数字·加油', game: 'fuel', max: MAX_FUEL_LEVEL },
  colors: { name: '颜色·车灯', game: 'lights', max: MAX_LIGHTS_LEVEL },
  math: { name: '算数·石头题', game: 'math', max: MAX_MATH_LEVEL },
  literacy: { name: '认字·搬箱', game: 'hanzi', max: MAX_HANZI_LEVEL },
  tracing: { name: '写字·描红', game: 'trace', max: MAX_TRACE_LEVEL },
  shapes: { name: '图形·对孔', game: 'shapes', max: MAX_SHAPES_LEVEL },
  compare: { name: '比较·大小', game: 'compare', max: MAX_COMPARE_LEVEL },
};

export const VERDICT = {
  few: '样本太少（不到3局），先不下结论',
  hard: '有点吃力 → 先别加难',
  ceiling: '已经封顶还几乎全对 → 该加更难的一级',
  easy: '最近几乎全对 → 这一级对他偏简单，可以升得更快',
  ok: '难度合适',
};

function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 10) / 10;
}

// 判断刻意保守：少于3局不下结论；抽查题和金头盔挑战题不算（它们本来就不在当前难度上）。
export function diagnose(save) {
  const log = save.stats && Array.isArray(save.stats.log) ? save.stats.log : [];
  const isClean = e => !e.err && !e.help;
  return Object.entries(SKILLS).map(([key, meta]) => {
    const s = save.skills[key] || { level: 1, streak: 0 };
    const cur = Math.floor(s.level);
    const plays = log.filter(e => e.game === meta.game && !e.review && !e.vip);
    const recent = plays.slice(-6);
    const cleanRate = recent.length ? recent.filter(isClean).length / recent.length : null;
    const sec = median(recent.map(e => e.sec).filter(Number.isFinite));
    const atMax = plays.filter(e => e.lvl >= meta.max);
    const maxClean = atMax.length ? atMax.filter(isClean).length / atMax.length : 0;
    let tag;
    if (recent.length < 3) tag = 'few';
    else if (cleanRate <= 0.5) tag = 'hard';
    else if (cur >= meta.max && atMax.length >= 3 && maxClean >= 0.8) tag = 'ceiling';
    else if (cleanRate >= 0.8) tag = 'easy';
    else tag = 'ok';
    return {
      key, name: meta.name, level: s.level, cur, max: meta.max, streak: s.streak || 0,
      plays: plays.length, recent: recent.length, cleanRate, sec, tag,
    };
  });
}

const width = s => [...String(s)].reduce((w, c) => w + (c.codePointAt(0) > 0x2e7f ? 2 : 1), 0);
const padEnd = (s, n) => String(s) + ' '.repeat(Math.max(1, n - width(s)));
const pct = x => (x === null ? '—' : `${Math.round(x * 100)}%`);

function dailyHistory(dir) {
  const d = join(dir, 'daily');
  if (!existsSync(d)) return [];
  return readdirSync(d).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().map(f => {
    try {
      const r = JSON.parse(readFileSync(join(d, f), 'utf8'));
      return { day: f.slice(0, 10), save: r.save || r };
    } catch { return null; }
  }).filter(Boolean);
}

export function renderReport(rec, history = []) {
  const save = rec.save || rec;
  const daily = (save.stats && save.stats.daily) || {};
  const days = Object.keys(daily).filter(d => (daily[d] && daily[d].jobs) > 0).sort();
  const jobs = days.reduce((a, d) => a + daily[d].jobs, 0);
  const byGame = (save.stats && save.stats.byGame) || {};
  const learnPlays = Object.entries(byGame).filter(([g]) => g !== 'wash').reduce((a, [, st]) => a + st.plays, 0);
  const L = [];

  L.push('《小小维修站》进度报告');
  if (rec.receivedAt) {
    L.push(`数据收于 ${new Date(rec.receivedAt).toLocaleString('zh-CN', { hour12: false })}${rec.app ? `（iPad 上是 ${rec.app}）` : ''}`);
  }
  L.push(`玩了 ${days.length} 天，共 ${jobs} 单，学习小游戏 ${learnPlays} 局；每天设定 ${save.settings ? save.settings.dailyJobs : '?'} 单`);
  if (days.length) {
    L.push(`平均每个技能每天只轮到 ${(learnPlays / days.length / 8).toFixed(1)} 局（连续2局全对才升一级）`);
  }

  L.push('', '— 各技能现在在哪 —');
  for (const [key, meta] of Object.entries(SKILLS)) {
    const s = save.skills[key] || { level: 1, streak: 0 };
    const chips = [];
    for (let n = 1; n <= meta.max; n++) chips.push(`L${n}${STATE_INFO[levelState(s, n)][0]}`);
    L.push(`${padEnd(meta.name, 13)}当前L${s.level}（封顶${meta.max}，连对${s.streak || 0}）  ${chips.join(' ')}`);
  }

  L.push('', '— 每个游戏的总账 —');
  const games = Object.entries(byGame);
  if (!games.length) L.push('还没有记录');
  for (const [g, st] of games) {
    const per = st.plays ? `平均每局错${(st.errors / st.plays).toFixed(1)}次、求助${(st.helps / st.plays).toFixed(1)}次` : '';
    L.push(`${padEnd(GAME_NAMES[g] || g, 10)}${String(st.plays).padStart(3)}局  出错${st.errors}  求助${st.helps}  ${per}`);
  }

  if (history.length) {
    L.push('', '— 每天结束时的等级 —');
    L.push(padEnd('日期', 12) + Object.values(SKILLS).map(m => padEnd(m.name.split('·')[0], 7)).join(''));
    for (const h of history) {
      L.push(padEnd(h.day, 12) + Object.keys(SKILLS)
        .map(k => padEnd(`L${(h.save.skills[k] && h.save.skills[k].level) || 1}`, 7)).join(''));
    }
  }

  const log = (save.stats && save.stats.log) || [];
  L.push('', `— 最近的题（v11 起才开始记，现有 ${log.length} 条）—`);
  for (const e of log.slice(-30)) {
    const tags = `${e.review ? ' [抽查]' : ''}${e.vip ? ' [金头盔]' : ''}`;
    L.push(`${e.day}  ${padEnd(GAME_NAMES[e.game] || e.game, 9)}L${e.lvl}  错${e.err} 求助${e.help}  ${String(e.sec).padStart(5)}秒  ${e.sig || ''}${tags}`);
  }

  L.push('', '— 判断 —');
  for (const d of diagnose(save)) {
    const detail = d.recent ? `（最近${d.recent}局全对${pct(d.cleanRate)}${d.sec !== null ? `，中位用时${d.sec}秒` : ''}）` : '';
    L.push(`${padEnd(d.name, 13)}${VERDICT[d.tag]}${detail}`);
  }
  return L.join('\n');
}

function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const dir = process.env.GARAGE_DATA_DIR || join(root, 'data', 'progress');
  const file = process.argv[2] || join(dir, 'latest.json');
  if (!existsSync(file)) {
    console.log(`还没收到 iPad 的进度（找不到 ${file}）。`);
    console.log('让孩子从"家里电脑装的那份"打开一次游戏，电脑上的服务器开着，就会自动同步过来。');
    process.exitCode = 1;
    return;
  }
  const rec = JSON.parse(readFileSync(file, 'utf8'));
  console.log(renderReport(rec, process.argv[2] ? [] : dailyHistory(dir)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
