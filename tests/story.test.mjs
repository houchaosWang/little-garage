import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/rng.js';
import { genStoryTask, STORY_LEVELS, MAX_STORY_LEVEL, taskSignature } from '../js/taskgen.js';

test('停车场故事题：各级题型、算式成立、答案与选项', () => {
  assert.equal(MAX_STORY_LEVEL, 6);
  for (let level = 1; level <= MAX_STORY_LEVEL; level++) {
    const { kind, max } = STORY_LEVELS[level];
    for (let seed = 0; seed < 200; seed++) {
      const t = genStoryTask(makeRng(seed), level);
      assert.equal(t.kind, kind);
      assert.equal(t.op === '+' ? t.x + t.y : t.x - t.y, t.z, '算式 x op y = z 必须成立');
      assert.ok([t.x, t.y, t.z].every(v => Number.isInteger(v) && v >= 1 && v <= max), `L${level} ${JSON.stringify(t)}`);
      assert.equal(t.answer, kind === 'change' ? t.y : t.z);
      assert.equal(t.options.length, 3);
      assert.equal(new Set(t.options).size, 3);
      assert.ok(t.options.includes(t.answer));
      assert.ok(t.options.every(o => o >= 1 && o <= 10));
    }
  }
});

test('1级5以内合并；分离/藏起来/比较都是减；变化未知是"加几"', () => {
  for (let seed = 0; seed < 100; seed++) {
    const j = genStoryTask(makeRng(seed), 1);
    assert.equal(j.op, '+');
    assert.ok(j.z <= 5);
    for (const lv of [2, 3, 5]) assert.equal(genStoryTask(makeRng(seed), lv).op, '-');
    const c = genStoryTask(makeRng(seed), 4);
    assert.equal(c.op, '+');
    assert.ok(c.z > c.x, '现在的比原来的多');
  }
});

test('6级比较求数：蓝车比红车"多"和"少"两种都会出现', () => {
  const ts = Array.from({ length: 200 }, (_, s) => genStoryTask(makeRng(s), 6));
  assert.ok(ts.some(t => t.more) && ts.some(t => !t.more));
  ts.forEach(t => assert.equal(t.more ? t.z - t.x : t.x - t.z, t.y));
});

test('taskSignature：故事题', () => {
  assert.equal(taskSignature('story', { kind: 'join', x: 2, op: '+', y: 3 }), 's-join-2+3');
});
