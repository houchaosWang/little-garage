import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHARS = [...'一二三人大小上下口中山水火土木日月手车门天地你我他白云雨风花草虫鸟牛羊马鱼米田电'];
const LIB_URLS = [
  'https://cdn.jsdelivr.net/npm/hanzi-writer@3/dist/hanzi-writer.min.js',
  'https://unpkg.com/hanzi-writer@3/dist/hanzi-writer.min.js',
];
const dataUrls = ch => [
  `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2/${ch}.json`,
  `https://unpkg.com/hanzi-writer-data@2/${ch}.json`,
  `https://raw.githubusercontent.com/chanind/hanzi-writer-data/master/data/${ch}.json`,
];

async function fetchFirst(urls) {
  let lastErr;
  for (const u of urls) {
    try {
      const res = await fetch(u);
      if (!res.ok) throw new Error(`${res.status} ${u}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

mkdirSync(join(root, 'vendor', 'hanzi-data'), { recursive: true });
const lib = await fetchFirst(LIB_URLS);
writeFileSync(join(root, 'vendor', 'hanzi-writer.min.js'), lib);
console.log('ok lib', lib.length, 'bytes');
for (const ch of CHARS) {
  const buf = await fetchFirst(dataUrls(ch));
  JSON.parse(buf.toString('utf8'));
  writeFileSync(join(root, 'vendor', 'hanzi-data', `${ch}.json`), buf);
  console.log('ok', ch, buf.length, 'bytes');
}
console.log('done', CHARS.length, 'chars');
