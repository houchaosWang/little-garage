import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// 为什么非要HTTPS：Service Worker 只在安全上下文注册，没有它 iPad 装到主屏幕后
// 就不能离线玩（电脑一关就黑屏）。局域网没有公网域名，只能自签证书 + iPad 装一次根证书。
// certs/ 目录含私钥，已在 .gitignore 里排除，绝不要提交。
const CA_DAYS = 3650;
const LEAF_DAYS = 397;   // Apple 对自装根证书没有398天上限，但短期+自动续签更保险
const RENEW_WITHIN_DAYS = 30;

let cached;
export function findOpenssl() {
  if (cached !== undefined) return cached;
  const cands = ['openssl'];
  if (process.platform === 'win32') {
    cands.push(
      'C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe',
      'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
      'C:\\Windows\\System32\\OpenSSL\\openssl.exe',
    );
  }
  cached = null;
  for (const c of cands) {
    try {
      if (spawnSync(c, ['version'], { encoding: 'utf8' }).status === 0) { cached = c; break; }
    } catch { /* 试下一个 */ }
  }
  return cached;
}

function run(bin, args) {
  const r = spawnSync(bin, args, { encoding: 'utf8' });
  if (r.error) throw new Error(`无法运行 openssl：${r.error.message}`);
  if (r.status !== 0) throw new Error(`openssl ${args[0]} 失败：${(r.stderr || r.stdout || '').trim()}`);
  return r.stdout || '';
}

const CA_CNF = `[req]
distinguished_name = dn
x509_extensions = ext
prompt = no
[dn]
CN = Little Garage Local CA
O = Little Garage
[ext]
basicConstraints = critical,CA:TRUE,pathlen:0
keyUsage = critical,keyCertSign,cRLSign
subjectKeyIdentifier = hash
`;

function leafCnf(ips) {
  const alt = ['DNS.1 = localhost', 'IP.1 = 127.0.0.1', 'IP.2 = ::1'];
  ips.forEach((ip, i) => alt.push(`IP.${i + 3} = ${ip}`));
  return `[req]
distinguished_name = dn
prompt = no
[dn]
CN = Little Garage LAN
O = Little Garage
[ext]
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature,keyEncipherment
extendedKeyUsage = serverAuth
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer
subjectAltName = @alt
[alt]
${alt.join('\n')}
`;
}

// 证书里写死了IP。家里换路由器/DHCP变了地址，旧证书就对不上，必须重签。
export function certCoverage(bin, crtPath) {
  let out;
  try {
    out = run(bin, ['x509', '-in', crtPath, '-noout', '-ext', 'subjectAltName', '-enddate']);
  } catch {
    return { ips: [], notAfter: null };
  }
  const ips = [...out.matchAll(/IP Address:([0-9.]+)/g)].map(m => m[1]);
  const m = /notAfter=(.+)/.exec(out);
  const notAfter = m ? new Date(m[1].trim()) : null;
  return { ips, notAfter: notAfter && !Number.isNaN(notAfter.getTime()) ? notAfter : null };
}

export function needsReissue(coverage, wantIps, now = new Date()) {
  if (!coverage.notAfter) return true;
  if (coverage.notAfter.getTime() - now.getTime() < RENEW_WITHIN_DAYS * 864e5) return true;
  return wantIps.some(ip => !coverage.ips.includes(ip));
}

export function ensureCerts(dir, ips) {
  const bin = findOpenssl();
  if (!bin) {
    return { ok: false, reason: '找不到 openssl（装了 Git for Windows 就自带，或把它加进 PATH）' };
  }
  const notes = [];
  try {
    mkdirSync(dir, { recursive: true });
    const caKey = join(dir, 'ca.key');
    const caCrt = join(dir, 'ca.crt');
    const srvKey = join(dir, 'server.key');
    const srvCrt = join(dir, 'server.crt');

    if (!existsSync(caKey) || !existsSync(caCrt)) {
      const cnf = join(dir, 'ca.cnf');
      writeFileSync(cnf, CA_CNF);
      run(bin, ['req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-nodes',
        '-days', String(CA_DAYS), '-keyout', caKey, '-out', caCrt, '-config', cnf]);
      notes.push('新建了本地根证书 certs/ca.crt —— iPad 只需安装这一次，以后换地址也不用重装');
    }

    const coverage = existsSync(srvCrt) ? certCoverage(bin, srvCrt) : { ips: [], notAfter: null };
    if (!existsSync(srvKey) || needsReissue(coverage, ips)) {
      const cnf = join(dir, 'server.cnf');
      const csr = join(dir, 'server.csr');
      writeFileSync(cnf, leafCnf(ips));
      run(bin, ['req', '-new', '-newkey', 'rsa:2048', '-sha256', '-nodes',
        '-keyout', srvKey, '-out', csr, '-config', cnf]);
      run(bin, ['x509', '-req', '-in', csr, '-CA', caCrt, '-CAkey', caKey, '-CAcreateserial',
        '-days', String(LEAF_DAYS), '-sha256', '-extfile', cnf, '-extensions', 'ext', '-out', srvCrt]);
      notes.push(`签发了服务器证书，覆盖地址：${ips.join('、') || '(仅本机)'}`);
    }

    return {
      ok: true,
      key: readFileSync(srvKey),
      cert: readFileSync(srvCrt),
      caPath: caCrt,
      caPem: readFileSync(caCrt),
      notes,
    };
  } catch (e) {
    return { ok: false, reason: String((e && e.message) || e) };
  }
}
