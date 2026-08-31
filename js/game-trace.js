import { sfx, sayNow } from './audio.js';
import { CHARSET } from './taskgen.js';

export function runTraceGame(garage, customer, task, attachIdleHelp) {
  return new Promise(resolve => {
    const char = CHARSET[task.charIndex];
    let errors = 0;
    let helps = 0;
    let mistakes = 0;
    let done = false;

    const box = document.createElement('div');
    box.id = 'trace-box';
    box.innerHTML = '<div class="trace-card"><div id="trace-target"></div></div>';
    document.body.appendChild(box);

    const idle = attachIdleHelp(document, () => {
      if (document.getElementById('parent-panel')) return;
      helps += 1;
      sayNow('idle-trace');
    });

    function finish(aborted) {
      if (done) return;
      done = true;
      idle.dispose();
      box.remove();
      resolve({ errors: aborted ? 0 : errors, helps });
    }

    try {
      const writer = window.HanziWriter.create('trace-target', char, {
        width: 380, height: 380, padding: 16,
        showCharacter: false, showOutline: true,
        strokeColor: '#B4701E', outlineColor: '#E4D2AC',
        drawingWidth: 22, drawingColor: '#8A5A1F',
        showHintAfterMisses: 2, highlightOnComplete: true,
        charDataLoader: (c, onLoad) => fetch(`vendor/hanzi-data/${c}.json`).then(r => r.json()).then(onLoad).catch(() => finish(true)),
      });
      writer.quiz({
        onCorrectStroke: () => { sfx.snap(); idle.reset(); },
        onMistake: () => {
          mistakes += 1;
          sfx.pop();
          idle.reset();
          if (mistakes === 2) sayNow('trace-hint');
        },
        onComplete: () => {
          sfx.cheer();
          sayNow('trace-good', `char-${task.charIndex + 1}`);
          errors = mistakes >= 4 ? 1 : 0;
          setTimeout(() => finish(false), 900);
        },
      });
    } catch {
      finish(true);
    }
  });
}
