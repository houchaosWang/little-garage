import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { makeRng } from '../js/rng.js';
import { SYL_WORDS, MAX_SYLLABLE_LEVEL, genSyllableTask, taskSignature, CHARSET, sylWord } from '../js/taskgen.js';

const read = rel => readFileSync(new URL(rel, import.meta.url), 'utf8');
const swCtx = { self: { addEventListener() {} }, caches: {}, fetch() {}, URL };
// 复制成本上下文的数组：vm 里造的数组和这里的数组原型不同，deepEqual 会判不等
const AUDIO_NAMES = [...vm.runInNewContext(`${read('../sw.js')}\n;({ AUDIO_NAMES })`, swCtx).AUDIO_NAMES];
const CLIPS = new Set(AUDIO_NAMES);
const len = w => sylWord(w).s.length;

test('词库：一个字一个音节，整词和每个音节的语音都在离线清单里', () => {
  for (const x of SYL_WORDS) {
    assert.equal([...x.w].length, x.s.length, x.w);
    assert.ok(CLIPS.has(`vn-${x.v}`), `缺整词语音 vn-${x.v}`);
    for (const k of x.s) {
      assert.match(k, /^[a-z]+[1-4]$/, `${x.w} 的音节键要写成拼音+声调：${k}`);
      assert.ok(CLIPS.has(`syl-${k}`), `缺音节语音 syl-${k}`);
    }
  }
});

test('词库：同一个字在不同的词里读音一致', () => {
  const seen = new Map();
  for (const x of SYL_WORDS) {
    [...x.w].forEach((c, i) => {
      if (seen.has(c)) assert.equal(seen.get(c), x.s[i], `${c} 的读音前后不一致`);
      else seen.set(c, x.s[i]);
    });
  }
});

test('sw.js 的 SYL_KEYS / VN_KEYS 与词库完全一致（多了少了都不行）', () => {
  const syl = [...new Set(SYL_WORDS.flatMap(x => x.s))].sort();
  const vn = SYL_WORDS.map(x => x.v).sort();
  assert.deepEqual(AUDIO_NAMES.filter(n => n.startsWith('syl-')).map(n => n.slice(4)).sort(), syl);
  assert.deepEqual(AUDIO_NAMES.filter(n => n.startsWith('vn-')).map(n => n.slice(3)).sort(), vn);
});

test('game-syllable 的提示语音都在清单里', () => {
  const m = /SYL_PROMPTS = \[([\s\S]*?)\];/.exec(read('../js/game-syllable.js'));
  assert.ok(m, '找不到 SYL_PROMPTS');
  const names = [...m[1].matchAll(/'([a-z][a-z0-9-]*)'/g)].map(x => x[1]);
  assert.ok(names.length >= 20);
  for (const n of names) assert.ok(CLIPS.has(n), `缺 ${n}`);
});

test('1级拍车名：3轮、都有车的图、2个字和3个字都练到', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const t = genSyllableTask(makeRng(seed), 1);
    assert.equal(t.kind, 'clap');
    assert.equal(t.rounds.length, 3);
    const lens = t.rounds.map(r => len(r.word));
    assert.ok(lens.includes(2) && lens.includes(3));
    for (const r of t.rounds) assert.ok(sylWord(r.word).pic, `${r.word} 没有图`);
    assert.equal(new Set(t.rounds.map(r => r.word)).size, 3);
  }
});

test('2级找牌子：每轮三块牌子正好2/3/4个字、目标唯一；三轮目标长度各不同', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const t = genSyllableTask(makeRng(seed), 2);
    assert.deepEqual(t.rounds.map(r => len(r.word)).sort(), [2, 3, 4]);
    for (const r of t.rounds) {
      assert.deepEqual(r.signs.map(len).sort(), [2, 3, 4]);
      assert.equal(r.signs.filter(w => w === r.word).length, 1);
    }
  }
});

test('3级指着念：从不问已经认得的字（车、水、电……），最后一轮是4个字', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const t = genSyllableTask(makeRng(seed), 3);
    assert.equal(t.rounds.length, 3);
    assert.equal(len(t.rounds[2].word), 4);
    for (const r of t.rounds) assert.ok(!CHARSET.includes(r.word[r.ask]), `${r.word} 问了认得的字 ${r.word[r.ask]}`);
  }
});

test('4/5级删除：正确选项就是去掉那个字剩下的，三个选项互不相同', () => {
  for (let seed = 1; seed <= 60; seed++) {
    for (const lvl of [4, 5]) {
      const t = genSyllableTask(makeRng(seed), lvl);
      assert.equal(t.rounds.length, 3);
      for (const r of t.rounds) {
        const n = len(r.word);
        assert.deepEqual(r.options[r.answer], [...Array(n).keys()].filter(i => i !== r.drop));
        assert.equal(new Set(r.options.map(o => o.join(','))).size, 3);
      }
      if (lvl === 4) {
        assert.ok(t.rounds.every(r => r.drop === 0 || r.drop === len(r.word) - 1), '4级只去头去尾');
        assert.equal(t.rounds.filter(r => len(r.word) === 2).length, 1, '4级有一轮是两个字（Shu 2008 的格式）');
      } else {
        assert.equal(t.rounds.filter(r => r.drop === 1).length, 2, '5级两轮去中间');
        assert.ok(t.rounds.every(r => len(r.word) === 3));
      }
    }
  }
});

test('6级是不是车：3个"车"字在后（是车）、3个"车"字在前（车上的东西）', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const t = genSyllableTask(makeRng(seed), 6);
    assert.equal(t.items.length, 6);
    const cars = t.items.filter(i => i.car);
    const parts = t.items.filter(i => !i.car);
    assert.equal(cars.length, 3);
    assert.equal(parts.length, 3);
    for (const c of cars) assert.ok(c.word.endsWith('车'), c.word);
    for (const p of parts) assert.ok(p.word.startsWith('车'), p.word);
  }
});

test('题目指纹能区分不同的题，级别越界时夹到1-6', () => {
  const sigs = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    for (let l = 1; l <= MAX_SYLLABLE_LEVEL; l++) sigs.add(taskSignature('syllable', genSyllableTask(makeRng(seed), l)));
  }
  assert.ok(sigs.size > 100, `只有 ${sigs.size} 种`);
  assert.equal(genSyllableTask(makeRng(1), 0).kind, 'clap');
  assert.equal(genSyllableTask(makeRng(1), 9).kind, 'head');
  assert.equal(genSyllableTask(makeRng(1), 4.5).kind, 'del');
});
