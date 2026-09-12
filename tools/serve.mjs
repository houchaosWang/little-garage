// 局域网服务器：让 iPad 连同一个WiFi就能装、能玩，不用梯子也不用 GitHub。
//   http://<电脑IP>:8080  → 给家长看的安装向导（iPad 用这个开始）
//   http://localhost:8080 → 电脑上自己调试用，直接就是游戏（http 下不注册 SW，不会被缓存干扰）
//   https://<电脑IP>:8443 → 真正的游戏；HTTPS 才能注册 Service Worker，装完才能离线玩
// 用法：node tools/serve.mjs   （或双击项目根目录的「启动维修站服务器.cmd」）
import { createServer as createHttp } from 'node:http';
import { createServer as createHttps } from 'node:https';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { TYPES, safeResolve, parseRange, isLoopbackHost } from './http-util.mjs';
import { lanAddresses, describeAddress } from './net.mjs';
import { ensureCerts } from './certs.mjs';
import { portalHtml } from './portal.mjs';

const ROOT = process.cwd();
const HTTP_PORT = Number(process.env.PORT || 8080);
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 8443);

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

async function handle(req, res, { portalForLan }) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendText(req, res, 405, 'method not allowed');
  let pathname = '/';
  try { pathname = new URL(req.url, 'http://x').pathname; } catch { /* 下面按404处理 */ }

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

const httpServer = createHttp((req, res) => handle(req, res, { portalForLan: certs.ok })
  .catch(() => sendText(req, res, 500, 'server error')));
await listen(httpServer, HTTP_PORT, 'HTTP');

if (certs.ok) {
  const httpsServer = createHttps({ key: certs.key, cert: certs.cert },
    (req, res) => handle(req, res, { portalForLan: false })
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
  console.log('  现在只能用 http 玩：孩子玩的时候电脑必须开着，而且不能离线。');
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
console.log('\n  第一次启动如果 Windows 弹防火墙窗口，勾选「专用网络」并允许访问。');
console.log('  按 Ctrl+C 关闭服务器。\n');
