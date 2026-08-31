export function initParentPanel(store, getData) {
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
