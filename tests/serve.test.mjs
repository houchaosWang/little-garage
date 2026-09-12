import test from 'node:test';
import assert from 'node:assert/strict';
import { sep } from 'node:path';
import { safeResolve, parseRange, isLoopbackHost, TYPES } from '../tools/http-util.mjs';
import { rankAddress, sortAddresses, lanAddresses, describeAddress } from '../tools/net.mjs';
import { needsReissue } from '../tools/certs.mjs';
import { portalHtml } from '../tools/portal.mjs';

const ROOT = sep === '\\' ? 'Z:\\app' : '/app';
const inside = p => p.startsWith(ROOT + sep);

test('safeResolve：正常路径与目录默认页', () => {
  assert.ok(inside(safeResolve(ROOT, '/index.html')));
  assert.equal(safeResolve(ROOT, '/'), `${ROOT}${sep}index.html`);
  assert.equal(safeResolve(ROOT, '/?x=1'), `${ROOT}${sep}index.html`);
  // 中文文件名（描字的笔画数据）必须能取到
  assert.equal(safeResolve(ROOT, '/vendor/hanzi-data/%E8%BD%A6.json'),
    `${ROOT}${sep}vendor${sep}hanzi-data${sep}车.json`);
});

test('safeResolve：越狱一律拒绝', () => {
  for (const bad of ['/..%2f..%2fsecret', '/js/..%2f..%2f.gitignore', '/%5c..%5cREADME.md',
    '/a/%2e%2e%2f%2e%2e%2fetc/passwd', '/%00secret', '/x%ZZ']) {
    assert.equal(safeResolve(ROOT, bad), null, bad);
  }
  // URL 规范化会先把 ../ 折掉，落点仍在根目录内才算安全
  const dotted = safeResolve(ROOT, '/../README.md');
  assert.ok(dotted === null || inside(dotted));
});

test('parseRange：Safari 播 <audio> 时的各种写法', () => {
  assert.deepEqual(parseRange('bytes=0-99', 2044), { start: 0, end: 99 });
  assert.deepEqual(parseRange('bytes=100-', 2044), { start: 100, end: 2043 });
  assert.deepEqual(parseRange('bytes=-50', 2044), { start: 1994, end: 2043 });
  assert.deepEqual(parseRange('bytes=0-99999', 2044), { start: 0, end: 2043 });
  assert.equal(parseRange(undefined, 2044), null);
  assert.equal(parseRange('bytes=abc', 2044), null);
  assert.equal(parseRange('bytes=-', 2044), null);
  assert.deepEqual(parseRange('bytes=5000-6000', 2044), { unsatisfiable: true });
  assert.deepEqual(parseRange('bytes=99-10', 2044), { unsatisfiable: true });
  assert.deepEqual(parseRange('bytes=0-0', 0), { unsatisfiable: true });
});

test('isLoopbackHost：本机调试给应用，局域网IP给向导', () => {
  for (const h of ['localhost', 'localhost:8080', '127.0.0.1:8080', '127.0.0.2', '[::1]:8080']) {
    assert.equal(isLoopbackHost(h), true, h);
  }
  for (const h of ['192.168.0.42:8080', '100.103.75.29:8080', '10.0.0.5', '', undefined]) {
    assert.equal(isLoopbackHost(h), false, String(h));
  }
});

test('iOS 靠 MIME 认证书', () => {
  assert.equal(TYPES['.crt'], 'application/x-x509-ca-cert');
});

test('地址排序：家里的局域网地址排在虚拟网卡前面', () => {
  assert.ok(rankAddress('192.168.0.42') < rankAddress('100.103.75.29'));
  assert.ok(rankAddress('10.0.0.5') < rankAddress('169.254.1.1'));
  assert.deepEqual(
    sortAddresses(['169.254.9.9', '100.103.75.29', '192.168.0.42', '10.0.0.5', '192.168.0.7']),
    ['192.168.0.7', '192.168.0.42', '10.0.0.5', '100.103.75.29', '169.254.9.9'],
  );
  assert.match(describeAddress('100.103.75.29'), /Tailscale/);
  assert.match(describeAddress('192.168.0.42'), /局域网/);
});

test('lanAddresses：跳过回环与IPv6，去重', () => {
  const ips = lanAddresses({
    lo: [{ family: 'IPv4', address: '127.0.0.1', internal: true }],
    eth: [{ family: 'IPv4', address: '192.168.0.42', internal: false },
      { family: 'IPv6', address: 'fe80::1', internal: false }],
    wifi: [{ family: 'IPv4', address: '192.168.0.42', internal: false }],
    ts: [{ family: 'IPv4', address: '100.103.75.29', internal: false }],
  });
  assert.deepEqual(ips, ['192.168.0.42', '100.103.75.29']);
});

test('needsReissue：换了地址或快过期就要重签', () => {
  const now = new Date('2026-09-12T00:00:00Z');
  const far = new Date('2027-10-14T00:00:00Z');
  assert.equal(needsReissue({ ips: ['192.168.0.42'], notAfter: far }, ['192.168.0.42'], now), false);
  assert.equal(needsReissue({ ips: ['192.168.0.42'], notAfter: far }, ['192.168.1.9'], now), true);
  assert.equal(needsReissue({ ips: [], notAfter: null }, [], now), true);
  const soon = new Date('2026-09-20T00:00:00Z');
  assert.equal(needsReissue({ ips: ['192.168.0.42'], notAfter: soon }, ['192.168.0.42'], now), true);
});

test('安装向导：带上游戏地址，且不直接把应用放在http上', () => {
  const html = portalHtml({ httpsUrl: 'https://192.168.0.42:8443/', addresses: ['192.168.0.42', '100.103.75.29'] });
  assert.match(html, /https:\/\/192\.168\.0\.42:8443\//);
  assert.match(html, /\/ca\.crt/);
  assert.match(html, /证书信任设置/);
  assert.match(html, /添加到主屏幕/);
  assert.match(html, /100\.103\.75\.29/);
  assert.doesNotMatch(html, /<script src="js\/main\.js"/);
});
