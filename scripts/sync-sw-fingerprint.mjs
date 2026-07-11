#!/usr/bin/env node
/* [EN] Sync SW_FINGERPRINT in sw.js with APP_VERSION from version.js — browser only reinstalls SW when sw.js bytes change. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const versionJs = fs.readFileSync(path.join(root, 'version.js'), 'utf8');
const match = versionJs.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
if (!match) {
    console.error('❌ sync-sw-fingerprint: brak APP_VERSION w version.js');
    process.exit(1);
}
const version = match[1];
const swPath = path.join(root, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
const line = "var SW_FINGERPRINT = '" + version + "'; // [EN] auto-synced — triggers SW reinstall on bump\n";
if (/var SW_FINGERPRINT = ['"][^'"]+['"];/.test(sw)) {
    sw = sw.replace(/var SW_FINGERPRINT = ['"][^'"]+['"];[^\n]*\n/, line);
} else {
    sw = sw.replace(
        /(\*\/\s*\n)(importScripts\('version\.js'\))/,
        '$1' + line + '$2'
    );
}
fs.writeFileSync(swPath, sw);
console.log('✅ sync-sw-fingerprint: SW_FINGERPRINT → ' + version);
