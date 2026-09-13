// iPad 用局域网IP访问 8080 端口时看到的安装向导（家长看的，不是给孩子的界面）。
// 故意不在 http 上直接提供游戏：http 下 Service Worker 不注册，装到主屏幕就是个
// "必须开着电脑才能玩"的空壳，而且和 https 那份是两套独立存档。
const esc = s => String(s).replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

export function portalHtml({ httpsUrl, addresses = [], httpsPort = 8443 }) {
  const others = addresses.filter(a => !httpsUrl.includes(a));
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>小小维修站 · 安装向导</title>
<style>
  :root { color-scheme: light; }
  body { margin:0; padding:24px 18px 60px; background:#FFF3DD; color:#5A4426;
    font:17px/1.65 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif; }
  .wrap { max-width:680px; margin:0 auto; }
  h1 { font-size:26px; margin:8px 0 4px; color:#8A5A1F; }
  .sub { margin:0 0 22px; color:#9A876A; font-size:15px; }
  .card { background:#fff; border-radius:18px; padding:18px 20px; margin:0 0 16px;
    box-shadow:0 2px 10px rgba(138,90,31,.10); }
  .step { display:flex; align-items:center; font-size:20px; font-weight:700; color:#8A5A1F; margin:0 0 10px; }
  .n { flex:none; width:30px; height:30px; margin-right:10px; border-radius:50%; background:#E8763A; color:#fff;
    font-size:17px; display:flex; align-items:center; justify-content:center; }
  p { margin:8px 0; }
  ol { margin:8px 0; padding-left:22px; }
  li { margin:5px 0; }
  b { color:#A3521B; }
  .btn { display:block; text-align:center; text-decoration:none; margin:14px 0 4px;
    padding:16px; border-radius:14px; background:#E8763A; color:#fff; font-size:20px; font-weight:700; }
  .btn.ghost { background:#FBE6CF; color:#A3521B; }
  .tip { background:#FFF8EC; border-left:4px solid #F5B324; padding:10px 14px; border-radius:0 10px 10px 0;
    font-size:15px; color:#7A6444; }
  code { background:#F3EAD8; padding:1px 6px; border-radius:5px; font-size:15px; }
  #probe { font-weight:700; }
  .ok { color:#3B6D11; } .bad { color:#A32D2D; }
  .mini { font-size:14px; color:#9A876A; }
</style>
</head>
<body>
<div class="wrap">
  <h1>小小维修站 · iPad 安装向导</h1>
  <p class="sub">照着四步做一次，以后孩子点桌面图标就能玩，断网也行。</p>

  <div class="card">
    <p class="step"><span class="n">1</span>安装证书</p>
    <p>iPad 要先认识这台电脑，才肯让游戏离线保存。</p>
    <a class="btn" href="/ca.crt">下载证书</a>
    <ol>
      <li>点上面按钮 → 弹出“已下载描述文件”→ 点<b>允许 / 关闭</b></li>
      <li>打开 <b>设置</b> → 顶部会出现 <b>已下载描述文件</b>（找不到就进 <b>通用 → VPN与设备管理</b>）→ 点它 → 右上角 <b>安装</b>（输密码）→ 再 <b>安装</b></li>
      <li><b>关键一步别漏：</b>设置 → <b>通用 → 关于本机</b> → 拉到最底 → <b>证书信任设置</b> → 把 <code>Little Garage Local CA</code> 的开关<b>打开</b></li>
    </ol>
    <p class="tip">只做这一次。以后电脑换了IP地址也不用再装。</p>
  </div>

  <div class="card">
    <p class="step"><span class="n">2</span>检查是否生效</p>
    <p>证书状态：<span id="probe">正在检测……</span></p>
    <button class="btn ghost" type="button" id="recheck" style="width:100%;border:0;font-family:inherit">重新检测</button>
    <p class="mini">显示“未生效”就回第 1 步，多半是漏了“证书信任设置”那个开关。</p>
  </div>

  <div class="card">
    <p class="step"><span class="n">3</span>打开游戏并添加到主屏幕</p>
    <a class="btn" href="${esc(httpsUrl)}">打开游戏</a>
    <ol>
      <li>页面打开后，点 Safari 顶部的<b>分享按钮</b>（方框带箭头）</li>
      <li>选 <b>添加到主屏幕</b> → <b>添加</b></li>
      <li>回到桌面，点新出现的<b>“维修站”</b>图标（<b>一定要从桌面图标进</b>，Safari 里那份不算数）</li>
    </ol>
  </div>

  <div class="card">
    <p class="step"><span class="n">4</span>等它装满再给孩子</p>
    <p>从桌面图标打开后，门铃下面会显示 <code>正在准备声音 12/40</code>。</p>
    <p>等它变成 <b>“准备好啦！按一下门铃，车库开张！”</b>，再等半分钟（后台还在悄悄下剩下的语音和图），就可以交给孩子了。</p>
    <p class="tip">装满之后：电脑可以关机，iPad 也可以断网，游戏照样能玩。<br>
      电脑只在“要更新内容”的时候才需要开着。</p>
  </div>

  <p class="mini">这台电脑的其它地址：${others.length ? others.map(a => `<code>https://${esc(a)}:${httpsPort}</code>`).join(' ') : '无'}<br>
    地址变了游戏打不开？孩子的进度在 iPad 上不会丢，但建议在电脑路由器里给这台电脑固定IP。</p>
</div>
<script>
  var probe = document.getElementById('probe');
  function check() {
    probe.className = ''; probe.textContent = '正在检测……';
    fetch(${JSON.stringify(httpsUrl)} + 'manifest.webmanifest?t=' + Date.now(), { mode: 'no-cors', cache: 'no-store' })
      .then(function () { probe.className = 'ok'; probe.textContent = '✅ 已生效，可以做第 3 步了'; })
      .catch(function () { probe.className = 'bad'; probe.textContent = '❌ 还没生效（回第 1 步检查信任开关）'; });
  }
  document.getElementById('recheck').addEventListener('click', check);
  check();
</script>
</body>
</html>`;
}
