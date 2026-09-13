import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { portalHtml } from '../tools/portal.mjs';

// 最老要支持到 iOS 13.4（Safari 13.1）：家里那台旧 iPad mini 就在 13.4~14.4 之间——2026-09-13 截图确认，
// 模块、可选链、指针事件都能用；而 inset、flex 的 gap、decodeAudioData 的 Promise 写法都不能用，
// 结果是开始画面和家长面板全挤在左上角叠成一团，语音一条也放不出来。
const read = rel => readFileSync(new URL(rel, import.meta.url), 'utf8');
const stripComments = css => css.replace(/\/\*[\s\S]*?\*\//g, '');
const rules = css => [...stripComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ sel: m[1].trim(), body: m[2] }));
const jsFiles = () => readdirSync(new URL('../js/', import.meta.url)).filter(n => n.endsWith('.js'));
const sheets = () => [['styles.css', read('../styles.css')], ['安装向导', portalHtml({ httpsUrl: 'https://192.168.0.42:8443/' })]];

test('CSS 不用 inset（iOS 14.5 才支持；老 iPad 上全屏层会缩成一小块堆在左上角）', () => {
  for (const [name, css] of sheets()) assert.doesNotMatch(stripComments(css), /(^|[;{\s])inset\s*:/, name);
});

test('CSS 只在 grid 里用 gap（flex 的 gap iOS 14.1 才支持，老 iPad 上会挤在一起）', () => {
  for (const [name, css] of sheets()) {
    const bad = rules(css)
      .filter(r => /(^|[;\s])(row-|column-)?gap\s*:/.test(r.body) && !/display\s*:\s*grid/.test(r.body))
      .map(r => r.sel);
    assert.deepEqual(bad, [], name);
  }
});

test('JS 拼出来的内联样式也不用 inset / gap', () => {
  const bad = jsFiles().filter(f => {
    const src = read(`../js/${f}`);
    return /style="[^"]*\b(inset|gap)\s*:/.test(src) || /\.style\.(inset|gap)\b/.test(src);
  });
  assert.deepEqual(bad, []);
});

test('带 hidden 的元素若有 display 规则，必须补一条 [hidden]（否则 hidden 失效——备份框一直露在外面）', () => {
  const css = read('../styles.css');
  const ids = new Set();
  for (const src of [read('../index.html'), ...jsFiles().map(f => read(`../js/${f}`))]) {
    for (const m of src.matchAll(/<[a-z]+\b[^>]*\bid="([\w-]+)"[^>]*\shidden[\s>]/g)) ids.add(m[1]);
  }
  assert.ok(ids.has('pp-io') && ids.has('stage'), '应能找到 pp-io 与 stage');
  const shown = id => rules(css).some(r => r.sel.split(',').map(s => s.trim()).includes(`#${id}`)
    && /display\s*:\s*(flex|block|grid)/.test(r.body));
  assert.deepEqual([...ids].filter(id => shown(id) && !css.includes(`#${id}[hidden]`)), []);
});

test('限高滚动的竖排 flex 容器：子元素不许被压扁（老 Safari 会叠在一起而不出滚动条）', () => {
  const css = read('../styles.css');
  for (const box of ['.pp-card', '#pp-io', '.page-card']) {
    assert.ok(new RegExp(`${box.replace('.', '\\.')}\\s*>\\s*\\*\\s*\\{[^}]*flex-shrink\\s*:\\s*0`).test(css), box);
  }
});

test('音频：decodeAudioData 用回调写法；connect 不链式；start/stop 带参数（老 WebKit）', () => {
  const src = read('../js/audio.js');
  const calls = [...src.matchAll(/decodeAudioData\(([^)]*)\)/g)];
  assert.ok(calls.length >= 1);
  for (const m of calls) assert.equal(m[1].split(',').length, 3, m[0]);
  assert.doesNotMatch(src, /\.connect\([^)]*\)\s*\.connect\(/);
  assert.doesNotMatch(src, /\.(start|stop)\(\)/);
});

test('JS 不用 iOS 13.4 还不支持的新语法 / 新 API', () => {
  const banned = [
    [/\.at\(/, 'Array.prototype.at（iOS 15.4）'],
    [/structuredClone\(/, 'structuredClone（15.4）'],
    [/Object\.hasOwn\(/, 'Object.hasOwn（15.4）'],
    [/(\?\?|\|\||&&)=/, '逻辑赋值 ??= ||= &&=（14）'],
    [/\(\?<[=!]/, '正则后行断言（16.4）'],
    [/\.findLast(Index)?\(/, 'findLast（15.4）'],
    [/\.to(Sorted|Reversed|Spliced)\(/, 'toSorted 等（16）'],
    [/\bstatic\s+[\w$]+\s*=/, '类静态字段（14.1）'],
  ];
  const hits = [];
  for (const f of [...jsFiles().map(n => `../js/${n}`), '../sw.js']) {
    const src = read(f).replace(/^\s*\/\/.*$/gm, '');
    for (const [re, what] of banned) if (re.test(src)) hits.push(`${f.slice(3)}：${what}`);
  }
  assert.deepEqual(hits, []);
});
