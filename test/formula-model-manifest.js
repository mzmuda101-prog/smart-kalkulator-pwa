// Model odczytu wzorów (PP-FormulaNet-S ONNX) i silnik onnxruntime-web są w repo i nieuszkodzone.
// Uruchom: node test/formula-model-manifest.js
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const root = path.join(__dirname, '..');
let fail = 0;
function ok(name, cond, got) { if (!cond) { fail++; console.log('  ✗', name, got === undefined ? '' : '→ ' + JSON.stringify(got)); } }
const dir = path.join(root, 'models', 'formulanet-s');
const exists = f => fs.existsSync(f);

if (!exists(path.join(dir, 'manifest.json'))) { ok('manifest.json istnieje', false); }
else {
    const M = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    let bytes = 0, gz = 0;
    for (const p of M.parts) {
        const f = path.join(dir, p.file);
        if (!exists(f)) { ok(p.file + ' istnieje', false); continue; }
        const raw = fs.readFileSync(f);
        ok(p.file + ' rozmiar = gzBytes', raw.length === p.gzBytes, raw.length);
        ok(p.file + ' < 50 MB', raw.length < 50e6);
        const un = zlib.gunzipSync(raw);
        ok(p.file + ' rozpakowany = bytes', un.length === p.bytes, un.length);
        ok(p.file + ' sha256', crypto.createHash('sha256').update(un).digest('hex') === p.sha256);
        bytes += p.bytes; gz += p.gzBytes;
    }
    ok('suma bytes', bytes === M.bytes, bytes);
    ok('suma gzBytes', gz === M.gzBytes, gz);
    ok('pola stałe', M.input === 'x' && M.eosId === 2 && M.firstTextId === 4 && M.inputShape.join() === '1,1,384,384');
    const vf = path.join(dir, 'vocab.json');
    if (!exists(vf)) ok('vocab.json istnieje', false);
    else {
        const V = JSON.parse(fs.readFileSync(vf, 'utf8'));
        ok('vocab 50000', V.length === 50000, V.length);
        ok('vocab[2] = </s>', V[2] === '</s>', V[2]);
    }
}
for (const f of ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'])
    ok('vendor/onnxruntime-web/' + f, exists(path.join(root, 'vendor', 'onnxruntime-web', f)));
ok('vendor/onnxruntime-web/LICENSE', exists(path.join(root, 'vendor', 'onnxruntime-web', 'LICENSE')));
console.log(fail ? '✗ ' + fail + ' błędów' : '✓ model i silnik w repo');
process.exit(fail ? 1 : 0);
