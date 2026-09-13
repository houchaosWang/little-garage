// 局域网服务器：让 iPad 连同一个WiFi就能装、能玩，不用梯子也不用 GitHub。
//   http://<电脑IP>:8080  → 给家长看的安装向导（iPad 用这个开始）
//   http://localhost:8080 → 电脑上自己调试用，直接就是游戏（http 下不注册 SW，不会被缓存干扰）
//   https://<电脑IP>:8443 → 真正的游戏；HTTPS 才能注册 Service Worker，装完才能离线玩
//   POST https://<电脑IP>:8443/api/progress → iPad 同步来的进度，存进 data/progress/（只有 https 这一路收）
// 用法：node tools/serve.mjs   （或双击项目根目录的「启动维修站服务器.cmd」）
import { createServer as createHttp } from 'node:http';
import { createServer as createHttps } from 'node:https';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TYPES, safeResolve, parseRange, isLoopbackHost } from './http-util.mjs';
import { lanAddresses, describeAddress } from './net.mjs';
import { ensureCerts } from './certs.mjs';
import { portalHtml } from './portal.mjs';
import { MAX_UPLOAD_BYTES, parseUpload, writeProgress, summarize } from './progress-store.mjs';

// 以脚本所在位置定根目录，而不是"当前目录"：从别的目录启动也不会把证书和进度写到奇怪的地方
// （证书一旦在别处重新生成，iPad 就得重新装一次根证书）。
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const HTTP_PORT = Number(process.env.PORT || 8080);
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 8443);
const DATA_DIR = process.env.GARAGE_DATA_DIR || join(ROOT, 'data', 'progress');

const ips = lanAddresses();
const certs = ensureCerts(join(ROOT, 'certs'), ips);
const primary = ips[0] || 'localhost';
const httpsUrl = `https://${primary}:${HTTPS_PORT}/`;

function head(res, code, type, extra = {}) {
  res.writeHead(code, {
    'content-type': type,
    // 局域网够快，一律不缓存，免得改了东西 iPad 还拿旧的
    'cache-control': 'no-store',
    ...extra,
  });
}

function sendText(req, res, code, body, type = 'text/plain; charset=utf-8') {
  const buf = Buffer.from(body);
  head(res, code, type, { 'content-length': buf.length });
  res.end(req.method === 'HEAD' ? undefined : buf);
}

function clock() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function sendFile(req, res, file) {
  const info = await stat(file);
  if (!info.isFile()) throw new Error('not a file');
  const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
  const range = parseRange(req.headers.range, info.size);

  if (range && range.unsatisfiable) {
    head(res, 416, 'text/plain; charset=utf-8', { 'content-range': `bytes */${info.size}` });
    return res.end();
  }
  if (range) {
    const len = range.end - range.start + 1;
    head(res, 206, type, {
      'content-length': len,
      'content-range': `bytes ${range.start}-${range.end}/${info.size}`,
      'accept-ranges': 'bytes',
    });
    if (req.method === 'HEAD') return res.end();
    return createReadStream(file, { start: range.start, end: range.end }).pipe(res);
  }
  head(res, 200, type, { 'content-length': info.size, 'accept-ranges': 'bytes' });
  if (req.method === 'HEAD') return res.end();
  return createReadStream(file).pipe(res);
}

// iPad 发来的进度：限大小、验格式，只写到固定位置（路径不取自请求）。
function receiveProgress(req, res) {
  return new Promise(resolve => {
    const chunks = [];
    let size = 0;
    let done = false;
    const finish = (code, msg) => {
      if (done) return;
      done = true;
      sendText(req, res, code, msg);
      resolve();
    };
    req.on('data', c => {
      if (done) return;
      size += c.length;
      if (size > MAX_UPLOAD_BYTES) finish(413, 'too large');
      else chunks.push(c);
    });
    req.on('error', () => finish(400, 'bad request'));
    req.on('end', () => {
      if (done) return;
      const rec = parseUpload(Buffer.concat(chunks).toString('utf8'));
      if (rec.error) { finish(400, rec.error); return; }
      try {
        const w = writeProgress(DATA_DIR, rec);
        const who = rec.device ? `iPad·${rec.device.slice(-5)}` : 'iPad（旧版本，无编号）';
        const note = w.main ? '' : '  → 进度比主进度少，单独存到 devices/，没覆盖主进度';
        console.log(`  ● ${clock()} 收到${who}的进度（${rec.app || '版本未知'}）：${summarize(rec.save)}${note}`);
        finish(200, 'ok');
      } catch (e) {
        console.error(`  ✖ ${clock()} 进度写入失败：${e.message}`);
        finish(500, 'write failed');
      }
    });
  });
}

async function handle(req, res, { portalForLan, acceptProgress }) {
  let pathname = '/';
  try { pathname = new URL(req.url, 'http://x').pathname; } catch { /* 下面按404处理 */ }

  if (req.method === 'POST' && pathname === '/api/progress' && acceptProgress) {
    return receiveProgress(req, res);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendText(req, res, 405, 'method not allowed');

  // 证书任何时候都要能下载（iPad 装证书之前只能走 http）
  if (pathname === '/ca.crt' || pathname === '/ca.pem') {
    if (!certs.ok) return sendText(req, res, 503, '证书没生成成功：' + certs.reason);
    head(res, 200, TYPES['.crt'], { 'content-length': certs.caPem.length });
    return res.end(req.method === 'HEAD' ? undefined : certs.caPem);
  }

  if (portalForLan && !isLoopbackHost(req.headers.host)) {
    return sendText(req, res, 200, portalHtml({ httpsUrl, addresses: ips, httpsPort: HTTPS_PORT }), TYPES['.html']);
  }

  const file = safeResolve(ROOT, req.url);
  if (!file) return sendText(req, res, 400, 'bad path');
  try {
    await sendFile(req, res, file);
  } catch {
    sendText(req, res, 404, 'not found');
  }
}

function listen(server, port, label) {
  return new Promise(resolve => {
    server.once('error', err => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n✖ ${label} 端口 ${port} 被占用了。可能是上一个服务器窗口还开着——关掉它再试。`);
      } else {
        console.error(`\n✖ ${label} 启动失败：${err.message}`);
      }
      process.exit(1);
    });
    server.listen(port, () => resolve(server));
  });
}

const httpServer = createHttp((req, res) => handle(req, res, { portalForLan: certs.ok, acceptProgress: false })
  .catch(() => sendText(req, res, 500, 'server error')));
await listen(httpServer, HTTP_PORT, 'HTTP');

if (certs.ok) {
  const httpsServer = createHttps({ key: certs.key, cert: certs.cert },
    (req, res) => handle(req, res, { portalForLan: false, acceptProgress: true })
      .catch(() => sendText(req, res, 500, 'server error')));
  await listen(httpsServer, HTTPS_PORT, 'HTTPS');
}

const line = '─'.repeat(46);
console.log(`\n┌${line}┐`);
console.log('  小小维修站 · 局域网服务器已启动');
console.log(`└${line}┘`);
for (const note of certs.notes || []) console.log(`  · ${note}`);
if (!certs.ok) {
  console.log(`\n  ⚠ HTTPS 没能启动：${certs.reason}`);
  console.log('  现在只能用 http 玩：孩子玩的时候电脑必须开着，而且不能离线，进度也不会同步到电脑。');
}
console.log('\n  【iPad 第一次安装】用 Safari 打开：');
if (ips.length) {
  for (const ip of ips) {
    const mark = ip === primary ? '★' : ' ';
    console.log(`   ${mark} http://${ip}:${HTTP_PORT}        ${describeAddress(ip)}`);
  }
} else {
  console.log('   ⚠ 这台电脑没找到局域网地址，检查是否连上了路由器。');
}
console.log(`\n  【游戏地址】${certs.ok ? httpsUrl : `http://${primary}:${HTTP_PORT}/`}（向导里点按钮就会跳过去）`);
console.log(`  【电脑上调试】http://localhost:${HTTP_PORT}/`);
if (certs.ok) {
  console.log('\n  【孩子的进度】从这台电脑装的那份 iPad，每次存档都会自动同步到（只存在这台电脑上）：');
  console.log(`   ${join(DATA_DIR, 'latest.json')}`);
  console.log('   看报告：node tools/progress-report.mjs');
}
console.log('\n  如果 Windows 弹防火墙窗口，勾选「专用网络」并允许访问。');
console.log('  按 Ctrl+C 关闭服务器。收到进度时下面会多一行 ●\n');
