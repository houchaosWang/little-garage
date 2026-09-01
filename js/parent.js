import { localDate } from './store.js';

export const STATE_INFO = {
  locked: ['未解锁', '#EFE6D2', '#8C8272'],
  learning: ['学习中', '#D9E9FB', '#1F5FA8'],
  provisional: ['待抽查', '#FBEED3', '#8A5A1F'],
  solid: ['已巩固', '#DFF3C8', '#3B6D11'],
  relearning: ['回炉中', '#F9D9D2', '#A32D2D'],
};
export const GAME_NAMES = { tires: '装轮胎', fuel: '加油', lights: '换车灯', wash: '洗车', math: '石头算数', hanzi: '认字搬箱', trace: '描字', shapes: '形状对孔', compare: '比大小' };

export function levelState(skill, n) {
  const m = skill.mastery && skill.mastery[String(n)];
  if (m && m.state === 'relearning') return 'relearning';
  const cur = Math.floor(skill.level);
  if (n < cur) return m && m.state === 'solid' ? 'solid' : 'provisional';
  if (n === cur) return 'learning';
  return 'locked';
}

export function buildReport(data, skillMeta, today) {
  const lines = [`《小小维修站》学习报告 ${today}`, '', '— 掌握地图 —'];
  for (const [key, meta] of Object.entries(skillMeta)) {
    const s = data.skills[key];
    const parts = [];
    for (let n = 1; n <= meta.max; n++) parts.push(`L${n}${STATE_INFO[levelState(s, n)][0]}`);
    lines.push(`${meta.name}：${parts.join(' ')}`);
  }
  lines.push('', '— 游戏统计 —');
  for (const [g, st] of Object.entries(data.stats.byGame)) {
    lines.push(`${GAME_NAMES[g] || g}：玩${st.plays}次，出错${st.errors}，求助${st.helps}`);
  }
  const totalJobs = Object.values(data.stats.daily).reduce((a, d) => a + (d.jobs || 0), 0);
  lines.push('', `累计营业 ${totalJobs} 单；今日 ${(data.stats.daily[today] || { jobs: 0 }).jobs} 单`);
  return lines.join('\n');
}

// NOTE for node-safety: everything below that touches `document`/`window` lives
// inside initParentPanel (or functions it defines), which only runs when a
// caller invokes it. The module top level only defines the pure helpers above,
// so importing this file under Node (as tests/parent.test.mjs does) never
// touches the DOM and cannot throw.
export function initParentPanel(store, getData, skillMeta) {
  const pointers = new Map();
  let timer = null;

  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  document.addEventListener('pointerdown', e => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && !timer && !document.getElementById('parent-panel')) {
      timer = setTimeout(openPanel, 1800);
    }
    if (pointers.size > 2) cancel();
  }, true);
  const drop = e => { pointers.delete(e.pointerId); if (pointers.size < 2) cancel(); };
  document.addEventListener('pointerup', drop, true);
  document.addEventListener('pointercancel', drop, true);
  document.addEventListener('pointermove', e => {
    const p = pointers.get(e.pointerId);
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 40) cancel();
  }, true);

  function openPanel() {
    timer = null;
    const data = getData();

    const mapHtml = `<p class="pp-sec">掌握地图</p>` + Object.entries(skillMeta).map(([key, meta]) => {
      const s = data.skills[key];
      const chips = [];
      for (let n = 1; n <= meta.max; n++) {
        const [label, bg, fg] = STATE_INFO[levelState(s, n)];
        chips.push(`<span class="pp-chip" style="background:${bg};color:${fg}">L${n}·${label}</span>`);
      }
      return `<div class="pp-map-row"><span class="pp-map-name">${meta.name}</span><span class="pp-chips">${chips.join('')}</span></div>`;
    }).join('');

    const gameEntries = Object.entries(data.stats.byGame);
    const statHtml = `<p class="pp-sec">游戏统计</p>` + (gameEntries.length
      ? gameEntries.map(([g, st]) => `<p class="pp-stat">${GAME_NAMES[g] || g}：玩${st.plays}次 · 错${st.errors} · 求助${st.helps}</p>`).join('')
      : `<p class="pp-stat">还没有游玩记录</p>`);

    const wrap = document.createElement('div');
    wrap.id = 'parent-panel';
    wrap.innerHTML = `
      <div class="pp-card">
        <p class="pp-title">家长设置</p>
        <div class="pp-row">
          <span>每日营业单数</span>
          <div class="pp-step">
            <button type="button" class="pp-btn" data-act="minus">−</button>
            <span class="pp-num" id="pp-jobs">${data.settings.dailyJobs}</span>
            <button type="button" class="pp-btn" data-act="plus">＋</button>
          </div>
        </div>
        <p class="pp-hint" id="pp-est"></p>
        ${mapHtml}
        ${statHtml}
        <button type="button" class="pp-wide" data-act="export">导出报告（分享/复制）</button>
        <button type="button" class="pp-wide" data-act="reopen">今天重新营业</button>
        <button type="button" class="pp-wide pp-danger" data-act="wipe">清空全部进度</button>
        <button type="button" class="pp-wide" data-act="close">关闭</button>
      </div>`;
    document.body.appendChild(wrap);
    const jobsEl = wrap.querySelector('#pp-jobs');
    const estEl = wrap.querySelector('#pp-est');
    const renderEst = () => { estEl.textContent = `大约每天 ${data.settings.dailyJobs * 4} 分钟`; };
    renderEst();
    let wipeArmed = false;
    wrap.addEventListener('click', e => {
      const act = e.target.dataset && e.target.dataset.act;
      if (!act) return;
      if (act === 'minus' || act === 'plus') {
        const next = data.settings.dailyJobs + (act === 'plus' ? 1 : -1);
        data.settings.dailyJobs = Math.max(1, Math.min(12, next));
        jobsEl.textContent = data.settings.dailyJobs;
        renderEst();
        store.save(data);
      } else if (act === 'reopen') {
        store.reopenToday(data);
        location.reload();
      } else if (act === 'export') {
        const text = buildReport(getData(), skillMeta, localDate());
        const btn = e.target;
        const fallback = () => {
          const p = navigator.clipboard && navigator.clipboard.writeText
            ? navigator.clipboard.writeText(text) : Promise.reject(new Error('no-clipboard'));
          p.then(() => { btn.textContent = '已复制，去微信粘贴即可'; })
            .catch(() => { btn.textContent = '无法复制，请截图掌握地图'; });
        };
        if (navigator.share) navigator.share({ text }).catch(fallback);
        else fallback();
      } else if (act === 'wipe') {
        if (!wipeArmed) {
          wipeArmed = true;
          e.target.textContent = '再按一次确认清空';
        } else {
          store.wipe();
          location.reload();
        }
      } else if (act === 'close') {
        wrap.remove();
      }
    });
  }
}
