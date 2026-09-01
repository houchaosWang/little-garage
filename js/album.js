import { BADGE_CHAR } from './rewards-data.js';
import { buildVehicle, VEHICLE_TYPES } from './vehicles.js';
import { say, sfx } from './audio.js';

export { BADGE_CHAR };

const SVG = 'http://www.w3.org/2000/svg';
const GOLD = '#F5B324', GOLD_STROKE = '#B4701E';

// 徽章仪式：直接画在舞台 svg 上（跟 rewards.js 的 showDrop 是同一套"礼物揭晓"节奏）——
// 压暗背景，金牌带丝带 pop 进来，配一句语音+欢呼音效，点"收下！"后 resolve。
export function showBadge(stage, type) {
  return new Promise(resolve => {
    const g = document.createElementNS(SVG, 'g');
    g.setAttribute('class', 'badge-overlay');
    g.innerHTML = `
      <rect x="0" y="0" width="1200" height="800" fill="#2B3A5C" opacity="0" style="transition: opacity 0.4s"/>
      <g transform="translate(600 380)">
        <g style="animation: pop 0.6s ease-out; transform-origin: 0px 0px;">
          <line x1="-28" y1="-72" x2="0" y2="-14" stroke="#3E8EE0" stroke-width="24"/>
          <line x1="28" y1="-72" x2="0" y2="-14" stroke="#E8493F" stroke-width="24"/>
          <circle cx="0" cy="26" r="72" fill="${GOLD}" stroke="${GOLD_STROKE}" stroke-width="8"/>
          <circle cx="0" cy="26" r="56" fill="none" stroke="#FDF3F1" stroke-width="3"/>
          <text x="0" y="45" text-anchor="middle" font-size="66" fill="#6B4A12">${BADGE_CHAR[type] || ''}</text>
        </g>
        <text x="0" y="146" text-anchor="middle" font-size="30" fill="#FFFFFF">修了3辆，获得新徽章！</text>
        <g class="badge-accept" style="cursor:pointer" transform="translate(0 206)">
          <rect x="-96" y="-34" width="192" height="68" rx="34" fill="${GOLD}"/>
          <text x="0" y="11" text-anchor="middle" font-size="32" fill="#6B4A12">收下！</text>
        </g>
      </g>`;
    stage.appendChild(g);
    const dim = g.querySelector('rect');
    requestAnimationFrame(() => { dim.style.opacity = '0.6'; });

    sfx.cheer();
    say('badge-get');

    g.querySelector('.badge-accept').addEventListener('pointerdown', () => {
      g.remove();
      resolve();
    }, { once: true });
  });
}

function friendCard(f) {
  const card = document.createElement('div');
  card.className = 'album-friend-card';

  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '-30 -110 420 190');
  svg.setAttribute('class', 'album-friend-svg');

  const vehicle = buildVehicle(f.type, f.color);
  vehicle.el.setAttribute('transform', 'translate(10 -55) scale(0.5)');
  svg.appendChild(vehicle.el);

  const label = document.createElementNS(SVG, 'g');
  label.innerHTML = `
    <text x="180" y="20" text-anchor="middle" font-size="26" fill="#6B4A12">${f.name}</text>
    <text x="180" y="52" text-anchor="middle" font-size="20" fill="#A0763A">来过 ${f.count} 次</text>`;
  svg.appendChild(label);

  card.appendChild(svg);
  return card;
}

function badgeSlot(type, earned) {
  const wrap = document.createElement('div');
  wrap.className = 'album-badge-slot';
  wrap.innerHTML = earned
    ? `<svg viewBox="0 0 100 100" width="84" height="84">
        <circle cx="50" cy="50" r="42" fill="${GOLD}" stroke="${GOLD_STROKE}" stroke-width="6"/>
        <circle cx="50" cy="50" r="32" fill="none" stroke="#FDF3F1" stroke-width="2"/>
        <text x="50" y="64" text-anchor="middle" font-size="38" fill="#6B4A12">${BADGE_CHAR[type]}</text>
      </svg>`
    : `<svg viewBox="0 0 100 100" width="84" height="84">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#D9CBAD" stroke-width="4" stroke-dasharray="8 7"/>
      </svg>`;
  return wrap;
}

export function openAlbum(data, onClose) {
  const friends = data.collection.friends;
  const badges = data.collection.badges;

  const wrap = document.createElement('div');
  wrap.className = 'page-overlay';
  wrap.innerHTML = `
    <div class="page-card page-wide">
      <p class="page-title">朋友相册</p>
      <div class="album-body">
        <section class="album-sec">
          <h3 class="album-sec-title">朋友们</h3>
          <div class="album-friends-grid" id="album-friends"></div>
        </section>
        <section class="album-sec">
          <h3 class="album-sec-title">徽章墙</h3>
          <div class="album-badges-grid" id="album-badges"></div>
        </section>
      </div>
      <button type="button" class="pp-wide" id="album-back">返回</button>
    </div>`;
  document.body.appendChild(wrap);

  const friendsGrid = wrap.querySelector('#album-friends');
  if (!friends.length) {
    friendsGrid.innerHTML = '<p class="album-empty">还没有朋友，快去修车吧！</p>';
  } else {
    friends.forEach(f => friendsGrid.appendChild(friendCard(f)));
  }

  const badgesGrid = wrap.querySelector('#album-badges');
  VEHICLE_TYPES.forEach(type => badgesGrid.appendChild(badgeSlot(type, badges.includes(type))));

  wrap.querySelector('#album-back').addEventListener('pointerdown', () => {
    wrap.remove();
    onClose();
  }, { once: true });

  say('album-open');
}
