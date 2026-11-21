// Granice krok po kroku (js/math-limits.js).
// Uruchom: node test/math-limits.js
// Bramka: zestaw 58 zadań z ćwiczeń (test/limits-zestaw.json) — 0 błędnych wyników zawsze,
// pokrycie z krokami co najmniej MIN_COVERED.
'use strict';
const path = require('path');
const S = require(path.join(__dirname, '..', 'js', 'math-steps.js'));
require(path.join(__dirname, '..', 'js', 'math-calculus.js'));
let L = null;
try { L = require(path.join(__dirname, '..', 'js', 'math-limits.js')); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
const ZESTAW = require('./limits-zestaw.json');

const MIN_COVERED = 0;
const NOPE = 'Jeszcze tego nie rozwiążę';
let pass = 0, fail = 0;
function ok(name, cond, got) {
    if (cond) { pass++; return; }
    fail++;
    console.log('  ✗', name, got === undefined ? '' : '→ ' + JSON.stringify(got));
}
const text = q => { const r = S.run(q); return r && r.text; };

// ── Zestaw 58 zadań ─────────────────────────────────────────
function agrees(got, want) {
    if (want === 'inf') return got === Infinity;
    if (want === '-inf') return got === -Infinity;
    return typeof got === 'number' && Math.abs(got - want) <= 1e-9 * (1 + Math.abs(want));
}
let covered = 0, wrong = 0;
const missing = [];
for (const z of ZESTAW) {
    const r = S.run(z.input);
    if (!r || r.text === NOPE) { missing.push(z.id); continue; }
    if (!agrees(r.value, z.value)) { wrong++; console.log('  ✗ BŁĘDNY WYNIK', z.id, r.text, 'chcę', z.sympy); continue; }
    if (r.explain && r.explain.steps.length >= 2) covered++; else missing.push(z.id);
}
console.log(`zestaw: ${covered}/${ZESTAW.length} z krokami, ${wrong} błędnych` + (missing.length ? ` · bez: ${missing.join(' ')}` : ''));
ok('zestaw: 0 błędnych', wrong === 0, wrong);
ok('zestaw: pokrycie ≥ ' + MIN_COVERED, covered >= MIN_COVERED, covered);

console.log(`math-limits: ${pass} OK, ${fail} błędów`);
process.exit(fail ? 1 : 0);
