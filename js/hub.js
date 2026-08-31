import { buildVehicle } from './vehicles.js';
import { say, sayNow, sfx } from './audio.js';
import { makeRng } from './rng.js';

const btn = (id, x, icon, label) => `
  <g id="${id}" class="hub-btn" style="cursor:pointer" transform="translate(${x} 660)">
    <circle cx="0" cy="0" r="64" fill="#FFEDC2" stroke="#E8C97F" stroke-width="6"/>
    ${icon}
    <text x="0" y="100" text-anchor="middle" font-size="24" fill="#8A5A1F">${label}</text>
  </g>`;

export function showHub(stage, data, handlers) {
  const rng = makeRng();
  stage.innerHTML = `
    <rect x="0" y="0" width="1200" height="620" fill="#FFF3DD"/>
    <rect x="0" y="620" width="1200" height="180" rx="0" fill="#EFE6D2"/>
    <line x1="0" y1="620" x2="1200" y2="620" stroke="#D9CBAD" stroke-width="4"/>
    <rect x="40" y="60" width="360" height="300" rx="14" fill="none" stroke="#D9CBAD" stroke-width="8"/>
    <line x1="40" y1="130" x2="400" y2="130" stroke="#D9CBAD" stroke-width="5"/>
    <line x1="40" y1="200" x2="400" y2="200" stroke="#D9CBAD" stroke-width="5"/>
    <line x1="40" y1="270" x2="400" y2="270" stroke="#D9CBAD" stroke-width="5"/>
    <text x="880" y="130" text-anchor="middle" font-size="42" fill="#C8A96A">小小维修站</text>
    <g id="hub-buddy" style="cursor:pointer"></g>
    <g id="hub-btns">
      ${btn('hub-next', 520, '<path d="M0 -30 a20 20 0 0 1 20 20 v10 l8 10 h-56 l8 -10 v-10 a20 20 0 0 1 20 -20 z" fill="#8A5A1F"/><circle cx="0" cy="16" r="6" fill="#8A5A1F"/>', '下一位客人')}
      ${btn('hub-mycar', 730, '<rect x="-32" y="-6" width="56" height="13" rx="6" fill="#8A5A1F" transform="rotate(-35)"/><rect x="8" y="-32" width="16" height="24" rx="5" fill="#B4701E"/>', '我的车库')}
      ${btn('hub-album', 940, '<rect x="-26" y="-32" width="52" height="64" rx="6" fill="#B4701E"/><rect x="-18" y="-24" width="36" height="48" rx="4" fill="#FDF3F1"/><line x1="-10" y1="-10" x2="10" y2="-10" stroke="#B4701E" stroke-width="4"/><line x1="-10" y1="4" x2="10" y2="4" stroke="#B4701E" stroke-width="4"/>', '朋友相册')}
    </g>`;

  const buddy = buildVehicle('race', data.collection.carConfig.paint);
  buddy.el.setAttribute('transform', 'translate(150 560) scale(0.85)');
  stage.querySelector('#hub-buddy').appendChild(buddy.el);
  say(rng.pick(['buddy-hello-1', 'buddy-hello-2']));

  stage.querySelector('#hub-buddy').addEventListener('pointerdown', () => {
    sfx.horn();
    const g = buddy.el;
    g.style.transition = 'transform 0.18s';
    g.setAttribute('transform', 'translate(150 540) scale(0.85)');
    setTimeout(() => {
      g.setAttribute('transform', 'translate(150 560) scale(0.85)');
      setTimeout(() => { g.style.transition = ''; }, 200);
    }, 190);
  });
  stage.querySelector('#hub-next').addEventListener('pointerdown', () => {
    sayNow('hub-next');
    sfx.ding();
    handlers.onNext();
  }, { once: true });
  stage.querySelector('#hub-mycar').addEventListener('pointerdown', () => { sayNow('hub-mycar'); handlers.onGarage(); });
  stage.querySelector('#hub-album').addEventListener('pointerdown', () => { sayNow('hub-album'); handlers.onAlbum(); });
}
