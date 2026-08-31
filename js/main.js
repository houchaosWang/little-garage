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
