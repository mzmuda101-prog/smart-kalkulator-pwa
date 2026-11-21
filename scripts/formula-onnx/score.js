// Trafienia: odczyt modelu → tłumacz → czy to TO SAMO zadanie co w test/limits-zestaw.json
// (ta sama zmienna i cel, to samo wyrażenie w 5 punktach) i czy kalkulator daje dobry wynik.
// Użycie: node score.js <repo> <wyniki.json> [-v]
'use strict';
const path = require('path');
const [repo, file] = process.argv.slice(2);
const verbose = process.argv.includes('-v');
const S = require(path.join(repo, 'js/math-steps.js'));
const C = require(path.join(repo, 'js/math-calculus.js'))._core;
require(path.join(repo, 'js/math-limits.js'));
const { latexToExpr } = require('./latex-to-expr.js');
const zestaw = require(path.join(repo, 'test/limits-zestaw.json'));
const res = require(path.resolve(file));

const split = s => { const m = /^lim\s*([a-z])\s*→\s*(\S+?)\s+(.*)$/.exec(s); return m && { v: m[1], at: m[2], body: m[3] }; };
const val = (body, v, x) => { try { return C.evalExpr(C.fromAst(S._core.parse(body)), { [v]: x }); } catch { return NaN; } };
// punkty w dziedzinie: blisko celu (dla ±∞ — po właściwej stronie)
const pts = at => at === '∞' ? [1.3, 2.3, 3.7, 5.1, 7.9, 12.4] : at === '-∞' ? [-1.3, -2.3, -3.7, -5.1, -7.9, -12.4] : [0.13, 0.37, -0.21, 0.29, -0.43, 0.61].map(d => +at + d);
let same = 0, solved = 0;
const bad = [];
for (const z of zestaw) {
    const r = res[z.id]; if (!r) continue;
    const tr = latexToExpr(r.onnx);
    const g = split(z.input), o = tr.expr && split(tr.expr);
    let ok = !!(o && o.v === g.v && o.at === g.at);
    let cmp = 0;
    if (ok) for (const x of pts(g.at)) {
        const a = val(g.body, g.v, x), b = val(o.body, o.v, x);
        if (Number.isNaN(a) && Number.isNaN(b)) continue;  // poza dziedziną w obu
        cmp++;
        if (!(a === b || Math.abs(a - b) <= 1e-9 * (1 + Math.abs(a)))) { ok = false; break; }
    }
    if (cmp < 3) ok = false;
    if (ok) {
        same++;
        const run = S.run(tr.expr);
        if (run && run.text !== 'Jeszcze tego nie rozwiążę') solved++; else if (verbose) console.log(z.id, 'nie rozwiązane:', tr.expr, '→', run && run.text);
    } else bad.push(z.id);
    if (verbose && !ok) console.log(z.id, '|', tr.expr || 'BŁĄD: ' + tr.error, '| chcę:', z.input);
}
console.log(`${path.basename(file)}: to samo zadanie ${same}/58, z tego rozwiązane ${solved} · złe: ${bad.join(' ')}`);
