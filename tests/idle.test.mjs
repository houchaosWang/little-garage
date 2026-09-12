import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { attachIdleHelp } from '../js/guide.js';

const fakeStage = () => ({ addEventListener() {}, removeEventListener() {} });

test('提示阶梯：rearm 只重新计时不清零，reset 才清零', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const seen = [];
    const idle = attachIdleHelp(fakeStage(), f => seen.push(f), 100);
    mock.timers.tick(100);
    assert.deepEqual(seen, [1]);
    mock.timers.tick(50);
    idle.rearm(); // 提示自己放完：从现在起重新等满100
    mock.timers.tick(99);
    assert.deepEqual(seen, [1]);
    mock.timers.tick(1);
    assert.deepEqual(seen, [1, 2]); // 接着升到第2级，没有回到第1级
    idle.reset(); // 孩子动了：清零
    mock.timers.tick(100);
    assert.deepEqual(seen, [1, 2, 1]);
    idle.dispose();
    mock.timers.tick(1000);
    assert.deepEqual(seen, [1, 2, 1]);
  } finally {
    mock.timers.reset();
  }
});

test('回归：第2级提示是"重播一遍"时，阶梯仍能升到第3级（讲解/指答案）', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const seen = [];
    let idle = null;
    // 模拟 闪灯看数/停车场故事/找规律：第2级提示重播一段内容，放完后重新计时
    idle = attachIdleHelp(fakeStage(), f => {
      seen.push(f);
      if (f === 2) setTimeout(() => idle.rearm(), 30);
    }, 100);
    mock.timers.tick(100); // 1：提醒
    mock.timers.tick(100); // 2：重播（30后放完）
    mock.timers.tick(30);
    mock.timers.tick(100); // 3：讲解/指答案
    assert.deepEqual(seen, [1, 2, 3]);
    idle.dispose();
  } finally {
    mock.timers.reset();
  }
});
