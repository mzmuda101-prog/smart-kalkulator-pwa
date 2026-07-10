// [EN] Copy decimal.js UMD into js/vendor/ for CSP script-src 'self' (postinstall).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'node_modules', 'decimal.js', 'decimal.js');
const dest = path.join(root, 'js', 'vendor', 'decimal.js');

if (!fs.existsSync(src)) {
  console.warn('vendor-decimal: node_modules/decimal.js missing — run npm install');
  process.exit(0);
}
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log('vendor-decimal: copied → js/vendor/decimal.js');
