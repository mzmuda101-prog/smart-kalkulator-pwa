// Bramka „wyniki bez zmian”: każde zadanie z queries.js daje ten sam tekst co w test/fixtures/results-base.json.
// Różnica dozwolona tylko tam, gdzie w bazie stoi „Jeszcze tego nie rozwiążę” albo null (nowa zdolność).
// Uruchom: node test/results-unchanged.js
'use strict';
const path = require('path');
const root = path.join(__dirname, '..');
const S = require(path.join(root, 'js', 'math-steps.js'));
require(path.join(root, 'js', 'math-calculus.js'));
require(path.join(root, 'js', 'math-limits.js'));
const base = require('./fixtures/results-base.json');
const queries = require(path.join(root, 'scripts', 'steps-check', 'queries.js'));
const NOPE = 'Jeszcze tego nie rozwiążę';

let diffs = 0;
for (const q of Object.keys(base)) {
    if (!queries.includes(q)) { diffs++; console.log('  ✗ zadanie z bazy zniknęło z queries.js:', q); }
}
for (const q of queries) {
    if (!(q in base)) continue; // nowe zadanie: nie ma czego porównać
    let got = null;
    try { const r = S.run(q); got = r && r.text != null ? r.text : null; } catch (e) { got = null; }
    const was = base[q];
    if (was === null || was === NOPE || got === was) continue;
    diffs++;
    console.log('  ✗', q, '\n    było:', JSON.stringify(was), '\n    jest:', JSON.stringify(got));
}
console.log(`results-unchanged: ${queries.length} zadań, ${diffs} różnic`);
process.exit(diffs ? 1 : 0);
