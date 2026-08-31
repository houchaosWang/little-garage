# 《小小维修站》阶段1·走通骨架 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做出一个4岁孩子可独立游玩的最小完整切片——门铃开张→客人车进场→语音求助→装轮胎微游戏（点数）→欢呼道别→循环，含隐形难度、演示小手、打烊仪式、真人感语音、PWA离线安装到iPad。

**Architecture:** 纯静态PWA，零框架零依赖零构建；单个全屏SVG舞台（viewBox 1200×800），场景状态机切换；纯函数逻辑层（随机/难度/出题/存档）用 node 内置测试器测试；语音为 edge-tts 预生成的mp3分段拼接，音效用 WebAudio 振荡器合成（零音频素材依赖）。

**Tech Stack:** HTML + SVG + CSS动画 + vanilla JS (ES Modules)；node:test；Python edge-tts（仅开发机生成语音）；GitHub Pages 部署。

**对应设计文档：** `docs/superpowers/specs/2026-08-31-garage-learning-app-design.md`。本阶段覆盖其第3、4节（核心循环）、第5节（六类微游戏之"装轮胎"、八车型之赛车+翻斗车）、第7节（难度引擎，仅"数与量"技能）、第9节（打烊仪式简版）、第10节（零阅读引导）、第11节（技术方案全部）。其余（更多微游戏/车型、贴纸养成、朋友相册、VIP、家长角落）属阶段2-4，另行计划。

---

## 文件结构（本阶段完成后）

```
Z:\Claudecode\学前APP\            （仓库根 = 应用根）
├── index.html                    页面骨架、启动画面、竖屏提示
├── styles.css                    全局样式与动画
├── manifest.webmanifest          PWA清单
├── sw.js                         Service Worker（预缓存+离线）
├── icons/icon-180.png icon-512.png
├── js/
│   ├── main.js                   启动、场景状态机、音频解锁
│   ├── garage.js                 车库场景：客人进场/对话/欢呼/道别/打烊
│   ├── game-tires.js             装轮胎微游戏（拖拽+点数）
│   ├── vehicles.js               车辆工厂（赛车/翻斗车 SVG 生成）
│   ├── guide.js                  演示小手 + 闲置援助
│   ├── audio.js                  语音播放队列 + WebAudio音效
│   ├── store.js                  localStorage存档
│   ├── difficulty.js             难度引擎（纯函数）
│   ├── taskgen.js                出题器（纯函数）
│   └── rng.js                    带种子随机
├── audio/*.mp3                   生成的语音（约22条）
├── tools/
│   ├── gen-voice.py              edge-tts 批量生成语音
│   ├── gen-icons.ps1             PowerShell 生成PNG图标
│   └── serve.mjs                 零依赖本地静态服务器
├── tests/
│   ├── rng.test.mjs
│   ├── difficulty.test.mjs
│   ├── taskgen.test.mjs
│   └── store.test.mjs
└── docs/…                        （既有设计文档与本计划）
```

模块边界：`rng/difficulty/taskgen/store` 是纯逻辑，不碰DOM，node可测；`vehicles` 只产SVG字符串；`audio/guide` 是可静默失败的服务；`garage/game-tires` 只管各自场景；`main` 只做粘合。

---

### Task 0: 环境检查与仓库整备

**Files:** 无新文件，仅命令。

- [ ] **Step 1: 确认 node ≥ 18**

Run: `node --version`
Expected: `v18.x` 或更高。若无 node，停下向家长说明需安装 Node.js LTS。

- [ ] **Step 2: 确认 Python 与 edge-tts 可用性（仅记录，不阻塞）**

Run: `python --version && pip show edge-tts | head -2`
Expected: 有Python则记录版本；`edge-tts` 未安装是正常的，Task 11 再装。Python 完全缺失也不阻塞本阶段前10个任务。

- [ ] **Step 3: 分支改名 main**

Run: `cd "Z:/Claudecode/学前APP" && git branch -M main && git branch`
Expected: `* main`

- [ ] **Step 4: 写 .gitignore 并提交**

创建 `.gitignore`：

```
__pycache__/
*.pyc
.DS_Store
Thumbs.db
```

```bash
git add .gitignore && git commit -m "chore: gitignore与main分支整备"
```

---

### Task 1: 带种子随机 rng.js

**Files:**
- Create: `js/rng.js`
- Test: `tests/rng.test.mjs`

- [ ] **Step 1: 写失败测试**

`tests/rng.test.mjs`：

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/rng.js';

test('同种子序列可复现', () => {
  const a = makeRng(42), b = makeRng(42);
  for (let i = 0; i < 10; i++) assert.equal(a.next(), b.next());
});

test('int(min,max) 含两端且不越界', () => {
  const r = makeRng(7);
  const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const v = r.int(2, 5);
    assert.ok(v >= 2 && v <= 5 && Number.isInteger(v));
    seen.add(v);
  }
  assert.deepEqual([...seen].sort(), [2, 3, 4, 5]);
});

test('pick 返回数组成员', () => {
  const r = makeRng(1);
  const arr = ['a', 'b', 'c'];
  for (let i = 0; i < 50; i++) assert.ok(arr.includes(r.pick(arr)));
});

test('shuffle 不改原数组且是排列', () => {
  const r = makeRng(9);
  const arr = [1, 2, 3, 4, 5];
  const s = r.shuffle(arr);
  assert.deepEqual(arr, [1, 2, 3, 4, 5]);
  assert.deepEqual([...s].sort(), [1, 2, 3, 4, 5]);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd "Z:/Claudecode/学前APP" && node --test tests/rng.test.mjs`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现 js/rng.js**

```js
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed = Date.now()) {
  const next = mulberry32(seed);
  return {
    next,
    int(min, max) { return Math.floor(next() * (max - min + 1)) + min; },
    pick(arr) { return arr[this.int(0, arr.length - 1)]; },
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = this.int(0, i);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `node --test tests/rng.test.mjs`
Expected: 4 pass。

- [ ] **Step 5: Commit**

```bash
git add js/rng.js tests/rng.test.mjs && git commit -m "feat: 带种子随机工具"
```

---

### Task 2: 难度引擎 difficulty.js

规则（设计文档§7）：技能级别为0.5粒度浮点，出题取整；同技能连续2次干净完成（0错误0求助）升1级并清空连击；出现≥2错误或≥1求助降0.5级；封顶 `maxLevel`（本阶段=3），保底1。

**Files:**
- Create: `js/difficulty.js`
- Test: `tests/difficulty.test.mjs`

- [ ] **Step 1: 写失败测试**

`tests/difficulty.test.mjs`：

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSkill, effectiveLevel, recordOutcome } from '../js/difficulty.js';

const MAX = 3;
const clean = { errors: 0, helps: 0 };
const bad = { errors: 2, helps: 0 };
const helped = { errors: 0, helps: 1 };

test('初始1级，出题级别=1', () => {
  const s = createSkill();
  assert.equal(s.level, 1);
  assert.equal(effectiveLevel(s, MAX), 1);
});

test('连续2次干净完成升1级', () => {
  let s = createSkill();
  s = recordOutcome(s, clean, MAX);
  assert.equal(s.level, 1);
  s = recordOutcome(s, clean, MAX);
  assert.equal(s.level, 2);
  assert.equal(s.streak, 0);
});

test('一次干净一次出错不升级', () => {
  let s = createSkill();
  s = recordOutcome(s, clean, MAX);
  s = recordOutcome(s, bad, MAX);
  assert.equal(effectiveLevel(s, MAX), 1);
});

test('2错误降0.5级，求助也降0.5级，保底1', () => {
  let s = createSkill(2);
  s = recordOutcome(s, bad, MAX);
  assert.equal(s.level, 1.5);
  assert.equal(effectiveLevel(s, MAX), 1);
  s = recordOutcome(s, helped, MAX);
  assert.equal(s.level, 1);
  s = recordOutcome(s, bad, MAX);
  assert.equal(s.level, 1);
});

test('1错误不降级但清空连击', () => {
  let s = createSkill(2);
  s = recordOutcome(s, clean, MAX);
  s = recordOutcome(s, { errors: 1, helps: 0 }, MAX);
  assert.equal(s.level, 2);
  s = recordOutcome(s, clean, MAX);
  assert.equal(s.level, 2);
  s = recordOutcome(s, clean, MAX);
  assert.equal(s.level, 3);
});

test('封顶maxLevel不再升', () => {
  let s = createSkill(3);
  s = recordOutcome(s, clean, MAX);
  s = recordOutcome(s, clean, MAX);
  assert.equal(s.level, 3);
});

test('半级状态升级取整+1（2.5升到3）', () => {
  let s = { level: 2.5, streak: 1 };
  s = recordOutcome(s, clean, MAX);
  assert.equal(s.level, 3);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test tests/difficulty.test.mjs`
Expected: FAIL。

- [ ] **Step 3: 实现 js/difficulty.js**

```js
export const MIN_LEVEL = 1;
const STEP_DOWN = 0.5;

export function createSkill(level = MIN_LEVEL) {
  return { level, streak: 0 };
}

export function effectiveLevel(skill, maxLevel) {
  return Math.max(MIN_LEVEL, Math.min(Math.floor(skill.level), maxLevel));
}

export function recordOutcome(skill, outcome, maxLevel) {
  const clean = outcome.errors === 0 && outcome.helps === 0;
  let { level, streak } = skill;
  if (clean) {
    streak += 1;
    if (streak >= 2 && Math.floor(level) < maxLevel) {
      level = Math.floor(level) + 1;
      streak = 0;
    } else if (streak >= 2) {
      streak = 0;
    }
  } else {
    streak = 0;
    if (outcome.errors >= 2 || outcome.helps >= 1) {
      level = Math.max(MIN_LEVEL, level - STEP_DOWN);
    }
  }
  return { level, streak };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `node --test tests/difficulty.test.mjs`
Expected: 7 pass。

- [ ] **Step 5: Commit**

```bash
git add js/difficulty.js tests/difficulty.test.mjs && git commit -m "feat: 隐形难度引擎"
```

---

### Task 3: 出题器 taskgen.js

装轮胎任务：级别1数量2-4；级别2数量3-6；级别3数量5-10。轮胎架上比目标多2-4个（干扰+可选性），上限12。

**Files:**
- Create: `js/taskgen.js`
- Test: `tests/taskgen.test.mjs`

- [ ] **Step 1: 写失败测试**

`tests/taskgen.test.mjs`：

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/rng.js';
import { genTireTask, TIRE_LEVELS, MAX_TIRE_LEVEL } from '../js/taskgen.js';

test('各级别数量落在配置区间，架上轮胎多于目标且不超12', () => {
  for (let level = 1; level <= MAX_TIRE_LEVEL; level++) {
    const { min, max } = TIRE_LEVELS[level];
    for (let seed = 0; seed < 60; seed++) {
      const t = genTireTask(makeRng(seed), level);
      assert.equal(t.type, 'tires');
      assert.ok(t.count >= min && t.count <= max, `L${level} count=${t.count}`);
      assert.ok(t.rackCount > t.count);
      assert.ok(t.rackCount <= 12);
    }
  }
});

test('越界级别被夹回有效区间', () => {
  const lo = genTireTask(makeRng(1), 0);
  assert.ok(lo.count >= TIRE_LEVELS[1].min && lo.count <= TIRE_LEVELS[1].max);
  const hi = genTireTask(makeRng(1), 99);
  assert.ok(hi.count >= TIRE_LEVELS[MAX_TIRE_LEVEL].min);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test tests/taskgen.test.mjs`
Expected: FAIL。

- [ ] **Step 3: 实现 js/taskgen.js**

```js
export const TIRE_LEVELS = {
  1: { min: 2, max: 4 },
  2: { min: 3, max: 6 },
  3: { min: 5, max: 10 },
};
export const MAX_TIRE_LEVEL = 3;

export function genTireTask(rng, level) {
  const l = Math.max(1, Math.min(level, MAX_TIRE_LEVEL));
  const { min, max } = TIRE_LEVELS[l];
  const count = rng.int(min, max);
  const rackCount = Math.min(count + rng.int(2, 4), 12);
  return { type: 'tires', count, rackCount };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `node --test tests/taskgen.test.mjs`
Expected: 2 pass。

- [ ] **Step 5: Commit**

```bash
git add js/taskgen.js tests/taskgen.test.mjs && git commit -m "feat: 装轮胎出题器"
```

---

### Task 4: 存档层 store.js

localStorage单键JSON，注入storage与"今天"函数以便测试；损坏数据自动回默认档；记录每日单量与按游戏统计。

**Files:**
- Create: `js/store.js`
- Test: `tests/store.test.mjs`

- [ ] **Step 1: 写失败测试**

`tests/store.test.mjs`：

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, localDate } from '../js/store.js';

function fakeStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
  };
}

test('空存储返回默认档', () => {
  const s = createStore(fakeStorage(), () => '2026-08-31');
  const d = s.load();
  assert.equal(d.version, 1);
  assert.equal(d.skills.counting.level, 1);
  assert.equal(d.settings.dailyJobs, 4);
});

test('损坏JSON回默认档不抛错', () => {
  const st = fakeStorage();
  st.setItem('garage-save-v1', '{oops');
  const s = createStore(st, () => '2026-08-31');
  assert.equal(s.load().version, 1);
});

test('保存后能读回，且缺字段用默认补全', () => {
  const st = fakeStorage();
  const s = createStore(st, () => '2026-08-31');
  const d = s.load();
  d.skills.counting.level = 2.5;
  s.save(d);
  const d2 = s.load();
  assert.equal(d2.skills.counting.level, 2.5);
  assert.equal(d2.settings.dailyJobs, 4);
});

test('recordJob 累计当日，跨天从0起', () => {
  const st = fakeStorage();
  let today = '2026-08-31';
  const s = createStore(st, () => today);
  let d = s.load();
  s.recordJob(d);
  s.recordJob(d);
  assert.equal(s.jobsToday(d), 2);
  today = '2026-09-01';
  d = s.load();
  assert.equal(s.jobsToday(d), 0);
});

test('recordGame 累计游戏统计', () => {
  const s = createStore(fakeStorage(), () => '2026-08-31');
  const d = s.load();
  s.recordGame(d, 'tires', { helps: 1, errors: 0 });
  s.recordGame(d, 'tires', { helps: 0, errors: 2 });
  assert.deepEqual(d.stats.byGame.tires, { plays: 2, helps: 1, errors: 2 });
});

test('localDate 格式 YYYY-MM-DD', () => {
  assert.match(localDate(new Date(2026, 0, 5)), /^2026-01-05$/);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test tests/store.test.mjs`
Expected: FAIL。

- [ ] **Step 3: 实现 js/store.js**

```js
const KEY = 'garage-save-v1';

export function localDate(now = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function defaultSave() {
  return {
    version: 1,
    skills: { counting: { level: 1, streak: 0 } },
    stats: { daily: {}, byGame: {} },
    settings: { dailyJobs: 4 },
  };
}

function mergeDefaults(base, data) {
  if (typeof data !== 'object' || data === null) return base;
  for (const k of Object.keys(base)) {
    if (!(k in data)) data[k] = base[k];
    else if (typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k])) {
      data[k] = mergeDefaults(base[k], data[k]);
    }
  }
  return data;
}

export function createStore(storage, todayFn = localDate) {
  function load() {
    try {
      const raw = storage.getItem(KEY);
      if (!raw) return defaultSave();
      const d = JSON.parse(raw);
      if (!d || d.version !== 1) return defaultSave();
      return mergeDefaults(defaultSave(), d);
    } catch {
      return defaultSave();
    }
  }
  function save(data) {
    try { storage.setItem(KEY, JSON.stringify(data)); } catch { /* 存储满/隐私模式：静默 */ }
  }
  function jobsToday(data) {
    return (data.stats.daily[todayFn()] || { jobs: 0 }).jobs;
  }
  function recordJob(data) {
    const t = todayFn();
    const day = data.stats.daily[t] || { jobs: 0 };
    day.jobs += 1;
    data.stats.daily[t] = day;
    save(data);
  }
  function recordGame(data, game, outcome) {
    const g = data.stats.byGame[game] || { plays: 0, helps: 0, errors: 0 };
    g.plays += 1;
    g.helps += outcome.helps;
    g.errors += outcome.errors;
    data.stats.byGame[game] = g;
    save(data);
  }
  return { load, save, jobsToday, recordJob, recordGame };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `node --test tests/`
Expected: rng/difficulty/taskgen/store 全部 pass（累计15个测试）。

- [ ] **Step 5: Commit**

```bash
git add js/store.js tests/store.test.mjs && git commit -m "feat: 本地存档层"
```

---

### Task 5: 页面骨架 + 本地服务器 + 音频服务

**Files:**
- Create: `index.html`, `styles.css`, `js/audio.js`, `tools/serve.mjs`, `.claude/launch.json`

- [ ] **Step 1: 写 tools/serve.mjs（零依赖静态服务器）**

```js
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.mp3': 'audio/mpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
};
const root = process.cwd();

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(root, p));
    if (!file.startsWith(normalize(root))) throw new Error('escape');
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
}).listen(8080, () => console.log('serving on http://localhost:8080'));
```

- [ ] **Step 2: 写 .claude/launch.json**

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "garage", "runtimeExecutable": "node", "runtimeArgs": ["tools/serve.mjs"], "port": 8080 }
  ]
}
```

- [ ] **Step 3: 写 index.html**

要点：横屏优先；竖屏遮罩；启动"门铃"画面（首次点击=音频解锁）；全屏SVG舞台。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#FFF3DD">
<title>小小维修站</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/icon-180.png">
<link rel="stylesheet" href="styles.css">
</head>
<body>
<div id="rotate-tip" hidden>
  <svg viewBox="0 0 200 200" width="160" height="160" aria-hidden="true">
    <rect x="55" y="30" width="90" height="140" rx="12" fill="none" stroke="#8A6D3B" stroke-width="6"/>
    <path d="M30 100 A70 70 0 0 1 100 30" fill="none" stroke="#E8763A" stroke-width="8" stroke-linecap="round"/>
    <path d="M100 30 l-16 -6 m16 6 l-6 16" stroke="#E8763A" stroke-width="8" stroke-linecap="round" fill="none"/>
  </svg>
  <p>把 iPad 横过来玩哦</p>
</div>
<div id="boot" class="boot">
  <button id="bell" aria-label="按门铃开始">
    <svg viewBox="0 0 120 120" width="180" height="180" aria-hidden="true">
      <circle cx="60" cy="60" r="54" fill="#F5B324"/>
      <circle cx="60" cy="60" r="44" fill="#FFD966"/>
      <path d="M60 34 a16 16 0 0 1 16 16 v10 l6 8 h-44 l6 -8 v-10 a16 16 0 0 1 16 -16 z" fill="#8A5A1F"/>
      <circle cx="60" cy="74" r="5" fill="#8A5A1F"/>
    </svg>
  </button>
  <p class="boot-hint">按一下门铃，车库开张啦！</p>
</div>
<svg id="stage" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid meet" hidden></svg>
<script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: 写 styles.css**

```css
* { margin: 0; padding: 0; box-sizing: border-box; touch-action: none; -webkit-user-select: none; user-select: none; }
html, body { height: 100%; overflow: hidden; background: #FFF3DD; font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; }
#stage { position: fixed; inset: 0; width: 100%; height: 100%; }

.boot { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; background: #FFF3DD; z-index: 10; }
.boot[hidden] { display: none; }
#bell { border: none; background: none; cursor: pointer; animation: bell-bounce 1.6s ease-in-out infinite; }
#bell:active { transform: scale(0.92); }
.boot-hint { font-size: 28px; color: #8A5A1F; }
@keyframes bell-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }

#rotate-tip { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; background: #FFF3DD; z-index: 99; }
#rotate-tip[hidden] { display: none; }
#rotate-tip p { font-size: 26px; color: #8A5A1F; }

.bounce-soft { animation: bounce-soft 1.2s ease-in-out infinite; }
@keyframes bounce-soft { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes pop { 0% { transform: scale(0.4); opacity: 0; } 70% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
@keyframes pulse-ring { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
```

- [ ] **Step 5: 写 js/audio.js**

语音=mp3队列播放（缺文件静默跳过）；音效=WebAudio合成（叮/啵/喇叭/欢呼琶音），零素材依赖。

```js
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
```

- [ ] **Step 6: 写最小 js/main.js（本任务仅启动画面逻辑，车库场景在Task 7替换）**

```js
import { unlock, sfx } from './audio.js';

const boot = document.getElementById('boot');
const bell = document.getElementById('bell');
const stage = document.getElementById('stage');
const rotateTip = document.getElementById('rotate-tip');

function checkOrientation() {
  const portrait = window.innerHeight > window.innerWidth;
  rotateTip.hidden = !portrait;
}
window.addEventListener('resize', checkOrientation);
checkOrientation();

bell.addEventListener('pointerdown', () => {
  unlock();
  sfx.ding();
  boot.hidden = true;
  stage.hidden = false;
  stage.innerHTML = '<text x="600" y="400" text-anchor="middle" font-size="48" fill="#8A5A1F">车库装修中……</text>';
});
```

- [ ] **Step 7: 预览验证**

启动预览服务器（browser pane 的 preview_start，配置名 `garage`），确认：竖屏窗口显示旋转提示；横屏显示门铃；点门铃有"叮"声并进入占位舞台。
Expected: 三点全部成立，控制台无报错。

- [ ] **Step 8: Commit**

```bash
git add index.html styles.css js/audio.js js/main.js tools/serve.mjs .claude/launch.json
git commit -m "feat: 页面骨架、门铃启动、音频服务与本地预览"
```

---

### Task 6: 车辆工厂 vehicles.js

生成客人车SVG：赛车、翻斗车两种车型 × 6配色 × 名字池。车辆是 `<g>`，含 `data-slot` 轮位锚点（供微游戏挂虚线圈）、眨眼动画、说话时嘴巴开合钩子。

**Files:**
- Create: `js/vehicles.js`

- [ ] **Step 1: 实现 js/vehicles.js**

```js
export const PALETTE = {
  red: '#E8493F', blue: '#3E8EE0', green: '#66BB4C',
  yellow: '#F5B324', purple: '#8B6FE8', teal: '#3FBFA8',
};
export const NAMES = ['小红', '小蓝', '大力', '闪闪', '嘟嘟', '轰轰', '小快', '皮皮'];

const eyes = (x1, x2, y) => `
  <g class="v-eyes">
    <circle cx="${x1}" cy="${y}" r="13" fill="#fff"/>
    <circle cx="${x2}" cy="${y}" r="13" fill="#fff"/>
    <circle class="v-pupil" cx="${x1 + 3}" cy="${y + 2}" r="6" fill="#2C2C2A"/>
    <circle class="v-pupil" cx="${x2 + 3}" cy="${y + 2}" r="6" fill="#2C2C2A"/>
  </g>
  <path class="v-mouth" d="M${x1 + 14} ${y + 26} Q${(x1 + x2) / 2 + 3} ${y + 34} ${x2 - 8} ${y + 26}" stroke="#2C2C2A" stroke-width="4" fill="none" stroke-linecap="round"/>`;

const wheel = (cx, cy, r = 30) => `
  <g class="v-wheel">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#3A3A38"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.4}" fill="#B9B6AD"/>
  </g>`;

// 每种车型：body(color)返回SVG内串；slots为需要装轮胎的锚点（舞台内相对本车原点）
const TYPES = {
  race: {
    label: '赛车',
    intro: 'intro-race',
    width: 340,
    body: c => `
      <rect x="150" y="-62" width="46" height="16" rx="6" fill="#3A3A38" transform="rotate(-8 150 -62)"/>
      <rect x="70" y="-58" width="120" height="60" rx="26" fill="${c}"/>
      <rect x="0" y="-16" width="300" height="62" rx="26" fill="${c}"/>
      <rect x="86" y="-46" width="88" height="36" rx="12" fill="#FDF3F1"/>
      ${eyes(112, 150, -30)}`,
    slots: [{ x: 66, y: 46 }, { x: 234, y: 46 }],
    fixedWheels: [],
  },
  dump: {
    label: '翻斗车',
    intro: 'intro-dump',
    width: 360,
    body: c => `
      <polygon points="0,-70 150,-84 150,-6 10,-6" fill="#B9B6AD" stroke="#8F8C84" stroke-width="5"/>
      <circle cx="42" cy="-74" r="12" fill="#6E6B64"/><circle cx="76" cy="-79" r="12" fill="#6E6B64"/><circle cx="110" cy="-83" r="12" fill="#6E6B64"/>
      <rect x="156" y="-64" width="120" height="110" rx="16" fill="${c}"/>
      <rect x="172" y="-48" width="88" height="40" rx="10" fill="#FDF3F1"/>
      ${eyes(196, 236, -30)}`,
    slots: [{ x: 60, y: 46 }, { x: 130, y: 46 }, { x: 226, y: 46 }],
    fixedWheels: [],
  },
};

export const VEHICLE_TYPES = Object.keys(TYPES);

export function buildVehicle(type, colorName, { missingWheels = false } = {}) {
  const t = TYPES[type];
  const c = PALETTE[colorName];
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'vehicle');
  const wheels = missingWheels ? '' : t.slots.map(s => wheel(s.x, s.y)).join('');
  g.innerHTML = t.body(c) + wheels;
  return { el: g, meta: t, slots: t.slots.map(s => ({ ...s })) };
}
```

说明：`slots` 是"轮位"锚点；`missingWheels: true` 时车辆无轮（微游戏负责画虚线圈与装上的轮子）。翻斗车3个轮位、赛车2个轮位——轮位数与任务数量无关，任务的"N个"由轮胎序数徽章呈现（见Task 8设计说明）。

- [ ] **Step 2: 临时预览验证**

在 `js/main.js` 的门铃回调里临时加入：

```js
import { buildVehicle } from './vehicles.js';
// 门铃回调内、占位文字之后：
const v = buildVehicle('dump', 'yellow');
v.el.setAttribute('transform', 'translate(300 500)');
stage.appendChild(v.el);
const v2 = buildVehicle('race', 'red', { missingWheels: true });
v2.el.setAttribute('transform', 'translate(700 500)');
stage.appendChild(v2.el);
```

预览确认：黄色翻斗车完整、红色赛车无轮，造型与车斗/石头等细节正常，无变形。确认后**删除这段临时代码**。

- [ ] **Step 3: Commit**

```bash
git add js/vehicles.js js/main.js && git commit -m "feat: 车辆工厂（赛车/翻斗车）"
```

---

### Task 7: 车库场景 garage.js + 场景状态机

**Files:**
- Create: `js/garage.js`
- Modify: `js/main.js`（换成真状态机）

- [ ] **Step 1: 实现 js/garage.js**

职责：画固定布景（地面/门框/工牌）；一单流程 = 客人驶入 → 说话气泡+重听按钮 → 启动微游戏 → 欢呼 → 驶出 → 回调。语音名与Task 11清单一致。

```js
import { buildVehicle, VEHICLE_TYPES, PALETTE, NAMES } from './vehicles.js';
import { say, sfx } from './audio.js';

const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, html = '') => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (html) n.innerHTML = html;
  return n;
};

export function createGarage(stage, rng) {
  stage.innerHTML = `
    <rect x="0" y="0" width="1200" height="620" fill="#FFF3DD"/>
    <rect x="0" y="620" width="1200" height="180" fill="#EFE6D2"/>
    <line x1="0" y1="620" x2="1200" y2="620" stroke="#D9CBAD" stroke-width="4"/>
    <rect x="40" y="60" width="360" height="300" rx="14" fill="none" stroke="#D9CBAD" stroke-width="8"/>
    <line x1="40" y1="130" x2="400" y2="130" stroke="#D9CBAD" stroke-width="5"/>
    <line x1="40" y1="200" x2="400" y2="200" stroke="#D9CBAD" stroke-width="5"/>
    <line x1="40" y1="270" x2="400" y2="270" stroke="#D9CBAD" stroke-width="5"/>
    <g id="layer-vehicle"></g>
    <g id="layer-game"></g>
    <g id="layer-bubble"></g>
    <g id="layer-fx"></g>`;
  const layers = {
    vehicle: stage.querySelector('#layer-vehicle'),
    game: stage.querySelector('#layer-game'),
    bubble: stage.querySelector('#layer-bubble'),
    fx: stage.querySelector('#layer-fx'),
  };

  function showBubble(text, voiceNames) {
    layers.bubble.innerHTML = '';
    const w = Math.max(360, text.length * 34 + 140);
    const g = el('g', { transform: `translate(${600 - w / 2} 70)` });
    g.innerHTML = `
      <rect x="0" y="0" width="${w}" height="86" rx="43" fill="#FFFFFF" stroke="#E8C97F" stroke-width="4"/>
      <path d="M${w / 2 - 18} 86 L${w / 2} 120 L${w / 2 + 18} 86 Z" fill="#FFFFFF" stroke="#E8C97F" stroke-width="4"/>
      <g class="replay" style="cursor:pointer">
        <circle cx="52" cy="43" r="26" fill="#FFEDC2"/>
        <polygon points="42,33 50,33 60,24 60,62 50,53 42,53" fill="#8A5A1F"/>
        <path d="M66 34 Q73 43 66 52" stroke="#8A5A1F" stroke-width="4" fill="none" stroke-linecap="round"/>
      </g>
      <text x="${52 + 40 + (w - 92) / 2}" y="55" text-anchor="middle" font-size="34" fill="#6B4A12">${text}</text>`;
    g.querySelector('.replay').addEventListener('pointerdown', e => {
      e.stopPropagation();
      say(...voiceNames);
    });
    layers.bubble.appendChild(g);
    say(...voiceNames);
  }

  function clearBubble() { layers.bubble.innerHTML = ''; }

  function driveIn(vehicle) {
    vehicle.el.style.transition = 'none';
    vehicle.el.setAttribute('transform', 'translate(1400 560)');
    layers.vehicle.appendChild(vehicle.el);
    requestAnimationFrame(() => {
      vehicle.el.style.transition = 'transform 1.6s cubic-bezier(.25,.9,.35,1)';
      vehicle.el.setAttribute('transform', 'translate(480 560)');
    });
    sfx.horn();
    return new Promise(res => setTimeout(res, 1700));
  }

  function driveOut(vehicle) {
    vehicle.el.style.transition = 'transform 1.4s cubic-bezier(.55,0,.9,.4)';
    vehicle.el.setAttribute('transform', 'translate(-500 560)');
    sfx.horn();
    return new Promise(res => setTimeout(res, 1500));
  }

  function celebrate() {
    sfx.cheer();
    const fx = layers.fx;
    for (let i = 0; i < 24; i++) {
      const c = el('circle', {
        cx: 400 + rng.int(0, 400), cy: 760, r: rng.int(6, 12),
        fill: Object.values(PALETTE)[i % 6],
      });
      c.style.transition = `transform ${1 + rng.int(0, 8) / 10}s ease-out, opacity 1.4s`;
      fx.appendChild(c);
      requestAnimationFrame(() => {
        c.style.transform = `translate(${rng.int(-160, 160)}px, ${-rng.int(380, 640)}px)`;
        c.style.opacity = '0';
      });
    }
    setTimeout(() => { fx.innerHTML = ''; }, 1600);
    return new Promise(res => setTimeout(res, 1400));
  }

  function newCustomer() {
    const type = rng.pick(VEHICLE_TYPES);
    const color = rng.pick(Object.keys(PALETTE));
    const name = rng.pick(NAMES);
    const vehicle = buildVehicle(type, color, { missingWheels: true });
    return { type, color, name, vehicle };
  }

  return { layers, showBubble, clearBubble, driveIn, driveOut, celebrate, newCustomer };
}
```

- [ ] **Step 2: 重写 js/main.js 为状态机**

```js
import { unlock, sfx, say, preload } from './audio.js';
import { makeRng } from './rng.js';
import { createStore } from './store.js';
import { createGarage } from './garage.js';
import { effectiveLevel, recordOutcome } from './difficulty.js';
import { genTireTask, MAX_TIRE_LEVEL } from './taskgen.js';
import { runTireGame } from './game-tires.js';
import { attachIdleHelp } from './guide.js';

const boot = document.getElementById('boot');
const bell = document.getElementById('bell');
const stage = document.getElementById('stage');
const rotateTip = document.getElementById('rotate-tip');

const rng = makeRng();
const store = createStore(window.localStorage);
let data = store.load();

function checkOrientation() {
  rotateTip.hidden = !(window.innerHeight > window.innerWidth);
}
window.addEventListener('resize', checkOrientation);
checkOrientation();

preload(['welcome', 'intro-race', 'intro-dump', 'task-tires-prefix', 'task-tires-suffix',
  'num-1', 'num-2', 'num-3', 'num-4', 'num-5', 'praise-1', 'praise-2', 'goodbye-1',
  'closing-1', 'closing-2', 'sleeping-1', 'idle-tires']);

bell.addEventListener('pointerdown', async () => {
  unlock();
  sfx.ding();
  boot.hidden = true;
  stage.hidden = false;
  if (store.jobsToday(data) >= data.settings.dailyJobs) {
    showSleeping();
  } else {
    await say('welcome');
    nextJob();
  }
}, { once: true });

async function nextJob() {
  const garage = createGarage(stage, rng);
  const customer = garage.newCustomer();
  await garage.driveIn(customer.vehicle);

  const level = effectiveLevel(data.skills.counting, MAX_TIRE_LEVEL);
  const task = genTireTask(rng, level);
  garage.showBubble(
    `帮我装上 ${task.count} 个轮胎吧！`,
    [customer.vehicle.meta.intro, 'task-tires-prefix', `num-${task.count}`, 'task-tires-suffix'],
  );

  const outcome = await runTireGame(garage, customer, task, attachIdleHelp);

  data.skills.counting = recordOutcome(data.skills.counting, outcome, MAX_TIRE_LEVEL);
  store.recordGame(data, 'tires', outcome);
  store.recordJob(data);

  garage.clearBubble();
  await garage.celebrate();
  await say(rng.pick(['praise-1', 'praise-2']));
  await garage.driveOut(customer.vehicle);
  await say('goodbye-1');

  if (store.jobsToday(data) >= data.settings.dailyJobs) {
    await showClosing();
  } else {
    nextJob();
  }
}

async function showClosing() {
  const night = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  night.setAttribute('x', 0); night.setAttribute('y', 0);
  night.setAttribute('width', 1200); night.setAttribute('height', 800);
  night.setAttribute('fill', '#2B3A5C');
  night.style.opacity = '0';
  night.style.transition = 'opacity 2.5s';
  stage.appendChild(night);
  requestAnimationFrame(() => { night.style.opacity = '0.85'; });
  sfx.night();
  await say('closing-1', 'closing-2');
  showSleeping();
}

function showSleeping() {
  stage.innerHTML = `
    <rect x="0" y="0" width="1200" height="800" fill="#2B3A5C"/>
    <circle cx="1000" cy="140" r="70" fill="#F5E6A8"/>
    <circle cx="970" cy="120" r="62" fill="#2B3A5C"/>
    <rect x="380" y="330" width="440" height="290" rx="16" fill="#3D4E76"/>
    <rect x="420" y="380" width="360" height="240" rx="10" fill="#55679A"/>
    <line x1="420" y1="440" x2="780" y2="440" stroke="#3D4E76" stroke-width="8"/>
    <line x1="420" y1="500" x2="780" y2="500" stroke="#3D4E76" stroke-width="8"/>
    <line x1="420" y1="560" x2="780" y2="560" stroke="#3D4E76" stroke-width="8"/>
    <text x="600" y="290" text-anchor="middle" font-size="44" fill="#F5E6A8">车库睡觉啦，明天见！</text>
    <text x="840" y="360" font-size="40" fill="#F5E6A8">Z</text>
    <text x="880" y="320" font-size="52" fill="#F5E6A8">Z</text>`;
  say('sleeping-1');
}
```

- [ ] **Step 3: 预览验证（微游戏尚缺，用临时桩）**

临时创建 `js/game-tires.js` 桩：

```js
export function runTireGame(garage, customer, task, attachIdleHelp) {
  return new Promise(res => setTimeout(() => res({ errors: 0, helps: 0 }), 1500));
}
```

临时创建 `js/guide.js` 桩：

```js
export function attachIdleHelp() { return { reset() {}, dispose() {}, count: () => 0 }; }
```

预览确认：门铃→欢迎语音（无音频文件时静默，流程不断）→客人驶入带喇叭→气泡出现→1.5秒后彩纸欢呼→驶出→下一位；4单后天色变暗进入睡觉画面；刷新页面直接是睡觉画面。
验证打烊复位：DevTools console 执行 `localStorage.clear()` 后刷新可重玩。

- [ ] **Step 4: Commit**

```bash
git add js/garage.js js/main.js js/game-tires.js js/guide.js
git commit -m "feat: 车库场景与单量循环、打烊与睡觉画面"
```

---

### Task 8: 装轮胎微游戏 game-tires.js

**Files:**
- Modify: `js/game-tires.js`（替换桩）

交互设计：轮胎架在右侧（`task.rackCount` 个轮胎）；车下方一排 `task.count` 个虚线圈（超出车身宽度也没关系，圈排在车前地面，编号1..N）；拖一个轮胎放进任意空圈→吸附+念数（1、2、3…）；放错位置轮胎弹回架上（不算错误，navigation不惩罚）；全部装满→完成。错误计数本游戏恒为0（无错误可犯），求助数=闲置援助触发次数。

- [ ] **Step 1: 实现 js/game-tires.js**

```js
import { sfx, say } from './audio.js';

const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, html = '') => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (html) n.innerHTML = html;
  return n;
};

function svgPoint(stage, clientX, clientY) {
  const pt = stage.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  return pt.matrixTransform(stage.getScreenCTM().inverse());
}

const tireHTML = `
  <circle cx="0" cy="0" r="34" fill="#3A3A38"/>
  <circle cx="0" cy="0" r="14" fill="#B9B6AD"/>`;

export function runTireGame(garage, customer, task, attachIdleHelp) {
  return new Promise(resolve => {
    const stage = document.getElementById('stage');
    const layer = garage.layers.game;
    layer.innerHTML = '';
    let placed = 0;
    let helps = 0;

    const slotY = 700;
    const slotGap = Math.min(100, 760 / task.count);
    const slotX0 = 180;
    const slots = [];
    for (let i = 0; i < task.count; i++) {
      const cx = slotX0 + i * slotGap;
      const ring = el('g', {}, `
        <circle cx="${cx}" cy="${slotY}" r="38" fill="none" stroke="#C89B4A" stroke-width="5" stroke-dasharray="10 8" style="animation: pulse-ring 1.4s infinite"/>
        <text x="${cx}" y="${slotY + 10}" text-anchor="middle" font-size="30" fill="#C89B4A">${i + 1}</text>`);
      ring.dataset.filled = '';
      ring.dataset.cx = cx;
      layer.appendChild(ring);
      slots.push(ring);
    }

    const rackX = 1000, rackY0 = 200;
    const tires = [];
    for (let i = 0; i < task.rackCount; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const t = el('g', { class: 'tire', transform: `translate(${rackX + col * 90} ${rackY0 + row * 84})` }, tireHTML);
      t.dataset.home = `${rackX + col * 90},${rackY0 + row * 84}`;
      layer.appendChild(t);
      tires.push(t);
    }
    layer.insertBefore(
      el('rect', { x: rackX - 60, y: rackY0 - 60, width: 210, height: Math.ceil(task.rackCount / 2) * 84 + 90, rx: 14, fill: 'none', stroke: '#D9CBAD', 'stroke-width': 8 }),
      layer.firstChild,
    );

    const idle = attachIdleHelp(stage, () => {
      helps += 1;
      say('idle-tires');
      const freeTire = tires.find(t => !t.dataset.placed);
      const freeSlot = slots.find(s => !s.dataset.filled);
      if (freeTire && freeSlot) window.__guideHand?.(freeTire, freeSlot);
    });

    let drag = null;
    function onDown(e) {
      const g = e.target.closest('.tire');
      if (!g || g.dataset.placed) return;
      const p = svgPoint(stage, e.clientX, e.clientY);
      const [hx, hy] = g.dataset.home.split(',').map(Number);
      drag = { g, dx: p.x - hx, dy: p.y - hy };
      g.parentNode.appendChild(g);
      sfx.pop();
      idle.reset();
    }
    function onMove(e) {
      if (!drag) return;
      const p = svgPoint(stage, e.clientX, e.clientY);
      drag.g.setAttribute('transform', `translate(${p.x - drag.dx} ${p.y - drag.dy})`);
    }
    function onUp(e) {
      if (!drag) return;
      const p = svgPoint(stage, e.clientX, e.clientY);
      const near = slots.find(s => !s.dataset.filled && Math.hypot(p.x - s.dataset.cx, p.y - slotY) < 70);
      if (near) {
        near.dataset.filled = '1';
        drag.g.dataset.placed = '1';
        drag.g.setAttribute('transform', `translate(${near.dataset.cx} ${slotY})`);
        drag.g.style.animation = 'pop 0.35s ease-out';
        placed += 1;
        sfx.snap();
        say(`num-${placed}`);
        near.querySelector('circle').style.animation = 'none';
        near.querySelector('circle').setAttribute('stroke-dasharray', 'none');
        if (placed === task.count) finish();
      } else {
        const [hx, hy] = drag.g.dataset.home.split(',').map(Number);
        drag.g.style.transition = 'transform 0.3s';
        drag.g.setAttribute('transform', `translate(${hx} ${hy})`);
        setTimeout(() => { drag && (drag.g.style.transition = ''); }, 320);
      }
      drag = null;
      idle.reset();
    }

    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);

    function finish() {
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointercancel', onUp);
      idle.dispose();
      setTimeout(() => {
        layer.innerHTML = '';
        resolve({ errors: 0, helps });
      }, 700);
    }
  });
}
```

设计说明：轮胎装在地面一排编号圈而非车身轮位——保证任意数量(2-10)排得下、点数视觉一目了然；车身在后方看着他装，完成后欢呼时视觉上"焕然一新"。放错弹回不算错误：拖拽失误≠数错。多拖（架上有多余轮胎）不可能超装：圈满即完成。

- [ ] **Step 2: 预览验证**

预览走完整流程：气泡念数量→按编号拖装→每装一个念一个数→装满自动完成→欢呼。用鼠标验证拖拽吸附与弹回；把 `settings.dailyJobs` 流程走满验证打烊仍正常。
Expected: 全流程顺畅，控制台无报错。

- [ ] **Step 3: Commit**

```bash
git add js/game-tires.js && git commit -m "feat: 装轮胎微游戏（拖拽点数）"
```

---

### Task 9: 引导系统 guide.js（演示小手 + 闲置援助）

**Files:**
- Modify: `js/guide.js`（替换桩）
- Modify: `js/main.js`（首次演示触发）

- [ ] **Step 1: 实现 js/guide.js**

```js
const SVG = 'http://www.w3.org/2000/svg';

export function attachIdleHelp(stage, onIdle, ms = 12000) {
  let timer = null;
  let disposed = false;
  const reset = () => {
    if (disposed) return;
    clearTimeout(timer);
    timer = setTimeout(() => { onIdle(); reset(); }, ms);
  };
  const onAny = () => reset();
  stage.addEventListener('pointerdown', onAny);
  reset();
  return {
    reset,
    dispose() {
      disposed = true;
      clearTimeout(timer);
      stage.removeEventListener('pointerdown', onAny);
    },
  };
}

// 发光小手从 fromEl 移到 toEl（各取其舞台坐标中心），演示一遍后消失
export function guideHand(stage, fromEl, toEl) {
  const old = stage.querySelector('.guide-hand');
  if (old) old.remove();
  const bf = fromEl.getBBox();
  const mf = fromEl.getCTM();
  const bt = toEl.getBBox();
  const mt = toEl.getCTM();
  const from = { x: mf.e + bf.x + bf.width / 2, y: mf.f + bf.y + bf.height / 2 };
  const to = { x: mt.e + bt.x + bt.width / 2, y: mt.f + bt.y + bt.height / 2 };

  const hand = document.createElementNS(SVG, 'g');
  hand.setAttribute('class', 'guide-hand');
  hand.setAttribute('pointer-events', 'none');
  hand.innerHTML = `
    <circle cx="0" cy="0" r="34" fill="#F5B324" opacity="0.35"/>
    <circle cx="0" cy="0" r="16" fill="#F5B324" opacity="0.85"/>
    <circle cx="0" cy="0" r="6" fill="#FFF3DD"/>`;
  stage.appendChild(hand);
  const anim = hand.animate(
    [
      { transform: `translate(${from.x}px, ${from.y}px) scale(0.6)`, opacity: 0 },
      { transform: `translate(${from.x}px, ${from.y}px) scale(1)`, opacity: 1, offset: 0.2 },
      { transform: `translate(${to.x}px, ${to.y}px) scale(1)`, opacity: 1, offset: 0.85 },
      { transform: `translate(${to.x}px, ${to.y}px) scale(1.4)`, opacity: 0 },
    ],
    { duration: 2600, easing: 'ease-in-out' },
  );
  anim.onfinish = () => hand.remove();
}
```

- [ ] **Step 2: 接线**

`js/main.js`：import 后设置 `window.__guideHand = (a, b) => guideHand(stage, a, b);`；并在 `nextJob()` 里、微游戏启动后，如 `!data.stats.byGame.tires`（第一次玩）则延时800ms调用一次小手演示（从第一个轮胎到1号圈）+ `say('demo-hint')`。实现方式：`runTireGame` 返回前不便取内部元素，故在 `game-tires.js` 的游戏搭建完成处加：

```js
if (window.__firstTirePlay) {
  setTimeout(() => {
    say('demo-hint');
    window.__guideHand?.(tires[0], slots[0]);
  }, 800);
}
```

`main.js` 在调用 `runTireGame` 前设 `window.__firstTirePlay = !data.stats.byGame.tires;`。

- [ ] **Step 3: 预览验证**

`localStorage.clear()` 后完整体验：首玩有演示小手+提示音；放置后12秒不动触发闲置援助（语音+小手指向）。
Expected: 两种小手都出现且动画自然消失，helps 计数体现在完成后的存档（console查看 `localStorage['garage-save-v1']`）。

- [ ] **Step 4: Commit**

```bash
git add js/guide.js js/game-tires.js js/main.js && git commit -m "feat: 演示小手与闲置援助"
```

---

### Task 10: 语音生成 gen-voice.py + 台词清单

**Files:**
- Create: `tools/gen-voice.py`
- Create: `audio/`（生成物，提交入库）

- [ ] **Step 1: 安装 edge-tts**

Run: `pip install edge-tts`
Expected: 安装成功。若失败（无Python），先 `winget install Python.Python.3.12` 后重试；仍失败则暂跳过本任务（应用无音频也可玩），并在交接说明中记录。

- [ ] **Step 2: 写 tools/gen-voice.py**

```python
import asyncio, os
import edge_tts

VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "-8%"
OUT = os.path.join(os.path.dirname(__file__), "..", "audio")

LINES = {
    "welcome": "欢迎来到小小维修站！",
    "intro-race": "你好呀！我马上要去比赛，可是我的轮胎坏啦！",
    "intro-dump": "你好呀！我要去工地运石头，可是我的轮胎不见啦！",
    "task-tires-prefix": "帮我装上",
    "task-tires-suffix": "个轮胎吧！",
    "praise-1": "哇！太棒啦！",
    "praise-2": "谢谢你，小师傅！",
    "goodbye-1": "我出发啦！下次见！",
    "closing-1": "今天辛苦啦！车库要打烊咯！",
    "closing-2": "晚安，明天见！",
    "sleeping-1": "嘘，大家都在睡觉呢。明天再来吧！",
    "demo-hint": "看我做一遍哦！",
    "idle-tires": "把轮胎拖到圈圈里试试看！",
}
for i, zh in enumerate("一二三四五六七八九十", start=1):
    LINES[f"num-{i}"] = zh

async def main():
    os.makedirs(OUT, exist_ok=True)
    for name, text in LINES.items():
        path = os.path.join(OUT, f"{name}.mp3")
        await edge_tts.Communicate(text, VOICE, rate=RATE).save(path)
        print("ok", name)

asyncio.run(main())
```

- [ ] **Step 3: 生成并抽查**

Run: `cd "Z:/Claudecode/学前APP" && python tools/gen-voice.py && ls audio | wc -l`
Expected: 逐行 `ok …`，共23个mp3。本机播放 `welcome.mp3`、`num-4.mp3` 抽查音质与语气自然。

- [ ] **Step 4: 预览验证拼接**

预览游戏：气泡语音应为"（车型开场白）＋帮我装上／四／个轮胎吧！"三段自然衔接；装胎时逐个念数。
Expected: 无明显割裂或抢拍（`say` 队列保证顺序）。

- [ ] **Step 5: Commit**

```bash
git add tools/gen-voice.py audio && git commit -m "feat: edge-tts语音生成与全套台词"
```

---

### Task 11: PWA清单、图标与Service Worker

**Files:**
- Create: `manifest.webmanifest`, `sw.js`, `tools/gen-icons.ps1`, `icons/icon-180.png`, `icons/icon-512.png`
- Modify: `js/main.js`（注册SW）

- [ ] **Step 1: 写 manifest.webmanifest**

```json
{
  "name": "小小维修站",
  "short_name": "维修站",
  "display": "standalone",
  "orientation": "landscape",
  "background_color": "#FFF3DD",
  "theme_color": "#FFF3DD",
  "start_url": ".",
  "icons": [
    { "src": "icons/icon-180.png", "sizes": "180x180", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: 写 tools/gen-icons.ps1（System.Drawing画图标：奶油底红车大眼睛）**

```powershell
Add-Type -AssemblyName System.Drawing
function New-Icon([int]$size, [string]$path) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $s = $size / 512.0
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#FFF3DD'))
  $red = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#E8493F'))
  $dark = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#3A3A38'))
  $hub = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#B9B6AD'))
  $white = [System.Drawing.Brushes]::White
  $cream = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#FDF3F1'))
  $pupil = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#2C2C2A'))
  $g.FillEllipse($red, 130 * $s, 120 * $s, 250 * $s, 160 * $s)
  $g.FillRectangle($red, 60 * $s, 230 * $s, 392 * $s, 110 * $s)
  $g.FillEllipse($cream, 170 * $s, 150 * $s, 170 * $s, 90 * $s)
  $g.FillEllipse($white, 195 * $s, 165 * $s, 55 * $s, 55 * $s)
  $g.FillEllipse($white, 265 * $s, 165 * $s, 55 * $s, 55 * $s)
  $g.FillEllipse($pupil, 215 * $s, 182 * $s, 24 * $s, 24 * $s)
  $g.FillEllipse($pupil, 285 * $s, 182 * $s, 24 * $s, 24 * $s)
  $g.FillEllipse($dark, 100 * $s, 300 * $s, 100 * $s, 100 * $s)
  $g.FillEllipse($dark, 310 * $s, 300 * $s, 100 * $s, 100 * $s)
  $g.FillEllipse($hub, 130 * $s, 330 * $s, 40 * $s, 40 * $s)
  $g.FillEllipse($hub, 340 * $s, 330 * $s, 40 * $s, 40 * $s)
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
New-Item -ItemType Directory -Force "icons" | Out-Null
New-Icon 512 "icons\icon-512.png"
New-Icon 180 "icons\icon-180.png"
Write-Output "icons done"
```

Run (PowerShell): `cd "Z:\Claudecode\学前APP"; .\tools\gen-icons.ps1`
Expected: `icons done`，两个PNG生成，打开看是红色小车脸。

- [ ] **Step 3: 写 sw.js**

```js
const VERSION = 'garage-v1';
const ASSETS = [
  '.', 'index.html', 'styles.css', 'manifest.webmanifest',
  'icons/icon-180.png', 'icons/icon-512.png',
  'js/main.js', 'js/garage.js', 'js/game-tires.js', 'js/vehicles.js', 'js/guide.js',
  'js/audio.js', 'js/store.js', 'js/difficulty.js', 'js/taskgen.js', 'js/rng.js',
].concat([
  'welcome', 'intro-race', 'intro-dump', 'task-tires-prefix', 'task-tires-suffix',
  'praise-1', 'praise-2', 'goodbye-1', 'closing-1', 'closing-2', 'sleeping-1',
  'demo-hint', 'idle-tires',
  ...Array.from({ length: 10 }, (_, i) => `num-${i + 1}`),
].map(n => `audio/${n}.mp3`));

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)),
  );
});
```

维护规约：以后每次发布内容更新，必须把 `VERSION` 改成新值（如 `garage-v2`），否则iPad拿不到新资源。

- [ ] **Step 4: main.js 注册SW**

`js/main.js` 末尾追加：

```js
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
```

（限制https：本地开发不装SW，避免缓存干扰调试。）

- [ ] **Step 5: 预览回归**

本地预览完整流程一遍确认无回归（SW不会注册，正常）。
Expected: 与Task 10结束时行为一致。

- [ ] **Step 6: Commit**

```bash
git add manifest.webmanifest sw.js tools/gen-icons.ps1 icons js/main.js
git commit -m "feat: PWA清单、图标与离线Service Worker"
```

---

### Task 12: 家长手册 README + 部署上线

**Files:**
- Create: `README.md`

前置：家长已确认创建**公开**仓库（GitHub免费版Pages要求公开；代码内无孩子任何个人信息）。仓库名 `little-garage`（最终以家长确认为准）。

- [ ] **Step 1: 写 README.md（家长手册）**

```markdown
# 小小维修站

给4-5岁孩子的学前学习兴趣引导APP。设计文档见 `docs/superpowers/specs/`。

## 装到iPad上（一次性）
1. iPad Safari 打开：https://houchaoswang.github.io/little-garage/
2. 点分享按钮 → "添加到主屏幕" → 完成。桌面出现"维修站"图标，点开全屏运行，之后无网也能玩。
3. 建议开启 设置→辅助功能→引导式访问：孩子玩时三击侧边按钮锁定在本APP内。

## 日常
- 每天默认营业4单（约15分钟），玩完自动打烊，次日自动开张。
- 想清空进度重来：Safari 网站设置里清除本站数据（或等阶段4家长角落上线后在应用内操作）。

## 更新内容（在电脑上）
1. 让 Claude Code 修改代码；改动会更新 `sw.js` 里的 VERSION。
2. `git push` 后约1分钟，iPad 在联网状态下重开APP两次即拿到新版。

## 开发
- 本地预览：`node tools/serve.mjs` 后开 http://localhost:8080
- 跑测试：`node --test tests/`
- 重新生成语音：`python tools/gen-voice.py`（需 `pip install edge-tts`）
- 重新生成图标：`powershell tools/gen-icons.ps1`
```

- [ ] **Step 2: 创建仓库并推送**

Run:

```bash
cd "Z:/Claudecode/学前APP" && git add README.md && git commit -m "docs: 家长手册" && gh repo create little-garage --public --source . --remote origin --push
```

Expected: 仓库创建成功并推送 main。

- [ ] **Step 3: 开启 GitHub Pages**

Run:

```bash
gh api -X POST repos/houchaosWang/little-garage/pages -f "source[branch]=main" -f "source[path]=/" 2>/dev/null || gh api -X PUT repos/houchaosWang/little-garage/pages -f "source[branch]=main" -f "source[path]=/"
```

Run: `gh api repos/houchaosWang/little-garage/pages --jq .html_url`
Expected: 输出 `https://houchaosWang.github.io/little-garage/`。

- [ ] **Step 4: 线上验证**

等待约1-2分钟后，浏览器打开 Pages URL：门铃出现、全流程可玩、语音正常、DevTools Application 面板确认 SW 已激活、断网刷新仍可玩。
Expected: 全部通过。若 github.io 打不开（网络原因），记录下来，向家长提出切换 Cloudflare Pages。

- [ ] **Step 5: Commit（若有修补）并收尾**

```bash
git status
```

Expected: 工作区干净。阶段1完成。

---

## 验收清单（阶段1完成定义）

- [ ] `node --test tests/` 全绿（≥15个测试）
- [ ] 本地预览：门铃→客人→语音求助→拖装轮胎（逐个念数）→欢呼→道别→循环→4单打烊→睡觉画面→次日重开
- [ ] 首玩演示小手出现；闲置12秒援助触发并计入求助数
- [ ] 难度可观察：连续2单干净完成后，第3单数量区间上移（console看存档level）
- [ ] 无音频文件时游戏全程不阻塞（删掉audio/临时验证）
- [ ] iPad Safari 添加到主屏幕后全屏运行，断网可玩
- [ ] 家长在README指引下能独立完成"更新→push→iPad拿到新版"

## 后续阶段（另行计划）

- 阶段2：其余5类微游戏 + 6种新车型 + 签名任务 + 更多语音
- 阶段3：贴纸掉落、爱车装扮、朋友相册、金头盔VIP
- 阶段4：家长角落（观察面板/单量设置/级别范围）、打烊例外开关、家长录音
