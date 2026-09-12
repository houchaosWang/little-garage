import { join, normalize, sep } from 'node:path';

export const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8',
  // iOS 靠这个 MIME 才会把证书当成"描述文件"提示安装
  '.crt': 'application/x-x509-ca-cert',
};

// 把URL路径解析成磁盘路径；任何越狱尝试一律返回 null。
export function safeResolve(root, urlPath) {
  let p;
  try {
    p = decodeURIComponent(new URL(String(urlPath), 'http://x').pathname);
  } catch {
    return null; // 非法百分号编码
  }
  if (p.includes('\0') || p.includes('\\')) return null;
  if (p.endsWith('/')) p += 'index.html';
  const base = normalize(root).endsWith(sep) ? normalize(root) : normalize(root) + sep;
  const file = normalize(join(root, p));
  if (!file.startsWith(base)) return null;
  return file;
}

// Safari 播放 <audio> 时会发 Range 请求，不支持就可能卡住静音keepalive。
export function parseRange(header, size) {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(header).trim());
  if (!m) return null;
  const [, a, b] = m;
  if (a === '' && b === '') return null;
  let start;
  let end;
  if (a === '') {
    const n = Number(b);
    if (!n) return { unsatisfiable: true };
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(a);
    end = b === '' ? size - 1 : Math.min(Number(b), size - 1);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
    return { unsatisfiable: true };
  }
  return { start, end };
}

// 电脑上自己调试（localhost）直接给应用；iPad用局域网IP访问时给安装向导。
export function isLoopbackHost(hostHeader) {
  const raw = String(hostHeader || '').trim().toLowerCase();
  if (!raw) return false;
  const h = raw.startsWith('[')
    ? raw.slice(1, raw.indexOf(']') === -1 ? raw.length : raw.indexOf(']'))
    : raw.split(':')[0];
  return h === 'localhost' || h === '::1' || /^127\.\d+\.\d+\.\d+$/.test(h);
}
