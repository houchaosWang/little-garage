import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import { defaultSave } from '../js/store.js';
import { GAME_NAMES } from '../js/parent.js';
import { SKILLS } from '../tools/progress-report.mjs';

const read = rel => readFileSync(new URL(rel, import.meta.url), 'utf8');
const swCtx = { self: { addEventListener() {} }, caches: {}, fetch() {}, URL };
const { AUDIO_NAMES } = vm.runInNewContext(`${read('../sw.js')}\n;({ AUDIO_NAMES })`, swCtx);
const CLIPS = new Set(AUDIO_NAMES);

test('技能三处一致：存档默认值、进度报告、游戏名', () => {
  assert.deepEqual(Object.keys(defaultSave().skills).sort(), Object.keys(SKILLS).sort());
  for (const meta of Object.values(SKILLS)) assert.ok(GAME_NAMES[meta.game], `缺游戏名：${meta.game}`);
});

test('代码里念到的每条语音都在离线清单里（防名字拼错——拼错了孩子就听不到那句）', () => {
  const missing = [];
  const jsDir = new URL('../js/', import.meta.url);
  for (const f of readdirSync(jsDir).filter(n => n.endsWith('.js'))) {
    const src = readFileSync(new URL(f, jsDir), 'utf8');
    for (const m of src.matchAll(/\bsay(?:Now)?\(([^)]*)\)/g)) {
      for (const lit of m[1].matchAll(/'([a-z][a-z0-9-]*)'/g)) if (!CLIPS.has(lit[1])) missing.push(`${f}: ${lit[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('main.js 里的任务语音和预加载清单里每个名字都存在', () => {
  const src = read('../js/main.js');
  // 语音名都带连字符（welcome 除外）；不带连字符的 'math' 'tires' 'sticker' 是游戏键/掉落种类，不是语音
  const prefix = /^(?:(?:task|sub|pat|col|shp|nl|st|sort|sp|obj|ref|pos|sy|syl|vn|math|intro|hub|buddy|friend|vip|praise|goodbye|closing|sleeping|idle|demo|fuel|lights|hanzi|trace|shapes|compare|tires|paint|wheel|sticker|badge|album|garage)-|welcome$)/;
  const missing = [...src.matchAll(/'([a-z][a-z0-9-]*)'/g)].map(m => m[1])
    .filter(n => prefix.test(n) && !CLIPS.has(n));
  assert.deepEqual([...new Set(missing)], []);
});

test('游戏模块里的语音常量表（按颜色/形状/方位读出来的词）都存在', () => {
  const maps = {
    'game-pattern.js': /WORD = \{([\s\S]*?)\};/,
    'game-sort.js': /RULE_VOICE = \{([\s\S]*?)\};/,
    'game-spatial.js': /HINT = \{([\s\S]*?)\};/,
  };
  const missing = [];
  for (const [f, re] of Object.entries(maps)) {
    const body = re.exec(read(`../js/${f}`));
    assert.ok(body, `${f} 里找不到语音表`);
    for (const lit of body[1].matchAll(/'([a-z][a-z0-9-]*)'/g)) if (!CLIPS.has(lit[1])) missing.push(`${f}: ${lit[1]}`);
  }
  assert.deepEqual(missing, []);
});
