import { networkInterfaces } from 'node:os';

// 家里可能同时有以太网、WiFi、虚拟网卡（Tailscale/VMware/Hyper-V）。
// 给家长看的第一个地址必须是"iPad连同一个路由器就能用"的那个，所以要排序。
function isCgnat(ip) {
  const p = ip.split('.').map(Number);
  return p[0] === 100 && p[1] >= 64 && p[1] <= 127;
}

export function rankAddress(ip) {
  if (/^192\.168\./.test(ip)) return 0;
  if (/^10\./.test(ip)) return 1;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 2;
  if (isCgnat(ip)) return 8;       // Tailscale 等，能用但不是家里的局域网
  if (/^169\.254\./.test(ip)) return 9; // 网卡没拿到地址
  return 5;
}

export function describeAddress(ip) {
  if (isCgnat(ip)) return 'Tailscale等虚拟网卡（iPad装了同一账号，出门在外也能连）';
  if (/^169\.254\./.test(ip)) return '这块网卡没连上网，多半用不了';
  return '家里局域网（iPad连同一个WiFi即可）';
}

function ipOrder(ip) {
  return ip.split('.').reduce((a, n) => a * 256 + Number(n), 0);
}

export function sortAddresses(ips) {
  return [...new Set(ips)].sort((a, b) => rankAddress(a) - rankAddress(b) || ipOrder(a) - ipOrder(b));
}

export function lanAddresses(nics = networkInterfaces()) {
  const out = [];
  for (const list of Object.values(nics)) {
    for (const a of list || []) {
      if (a && a.family === 'IPv4' && !a.internal) out.push(a.address);
    }
  }
  return sortAddresses(out);
}
