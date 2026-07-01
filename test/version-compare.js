// ============================================================
//  Regresja porównywania wersji (v95 → v0.96, v1.00 po v99).
// ============================================================
const path = require('path');
const vm = require('vm');
const fs = require('fs');

const code = fs.readFileSync(path.join(__dirname, '..', 'version.js'), 'utf8');
vm.runInThisContext(code, { filename: 'version.js' });

const cmp = global.compareAppVersions;
const parse = global.parseAppVersion;
if (typeof cmp !== 'function' || typeof parse !== 'function') {
    console.error('❌ compareAppVersions / parseAppVersion niedostępne');
    process.exit(2);
}

const cases = [
    ['v0.96', 'v95', 1],
    ['v95', 'v0.96', -1],
    ['v0.96', 'v0.95', 1],
    ['v1.00', 'v0.99', 1],
    ['v0.99', 'v1.00', -1],
    ['v100', 'v1.00', -1],       // legacy v100 = 0.100 < 1.00
    ['v1.00', 'v1.00', 0],
    ['v0.96', 'v0.96', 0],
];

let failed = 0;
for (const [a, b, expect] of cases) {
    const got = cmp(a, b);
    const sign = got === 0 ? 0 : got > 0 ? 1 : -1;
    if (sign !== expect) {
        console.error('❌ compareAppVersions(' + a + ', ' + b + ') → ' + got + ' (oczekiwano ' + expect + ')');
        failed++;
    }
}

const p96 = parse('v0.96');
if (p96.major !== 0 || p96.minor !== 96) {
    console.error('❌ parseAppVersion(v0.96)', p96);
    failed++;
}
const p95 = parse('v95');
if (p95.major !== 0 || p95.minor !== 95) {
    console.error('❌ parseAppVersion(v95)', p95);
    failed++;
}

if (failed) {
    console.error('❌ version-compare: ' + failed + ' błędów');
    process.exit(1);
}
console.log('✅ version-compare: ' + cases.length + ' przypadków OK');
