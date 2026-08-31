import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const rate = 8000, seconds = 0.25, n = Math.round(rate * seconds);
const data = Buffer.alloc(n, 128);
const header = Buffer.alloc(44);
header.write('RIFF', 0); header.writeUInt32LE(36 + n, 4); header.write('WAVE', 8);
header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate, 28);
header.writeUInt16LE(1, 32); header.writeUInt16LE(8, 34);
header.write('data', 36); header.writeUInt32LE(n, 40);
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'audio', 'silence.wav');
writeFileSync(out, Buffer.concat([header, data]));
console.log('ok', out, 44 + n, 'bytes');
