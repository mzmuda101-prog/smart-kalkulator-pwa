// „Dlaczego” pod każdym krokiem (js/step-why.js, plan kroków 3c).
// Uruchom: node test/step-why.js
// Bramka: każdy krok z przekształceniem (58 granic, przykłady ściągi, dodatkowe) ma jedno zdanie „dlaczego”:
// krótkie (do 25 słów), bez zapisu z klawiatury poza $…$, kończy się kropką.
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const S = require(path.join(root, 'js', 'math-steps.js'));
require(path.join(root, 'js', 'math-calculus.js'));
require(path.join(root, 'js', 'math-limits.js'));
const { whyFor, isStatement } = require(path.join(root, 'js', 'step-why.js'));
const ZESTAW = require('./limits-zestaw.json');

let pass = 0, fail = 0;
function ok(name, cond, got) {
    if (cond) { pass++; return; }
    fail++;
    console.log('  ✗', name, got === undefined ? '' : '→ ' + JSON.stringify(got));
}

const defs = fs.readFileSync(path.join(root, 'command-definitions.js'), 'utf8');
const sciaga = [...defs.matchAll(/command: '((?:[^'\\]|\\.)*)'/g)].map(m => m[1].replace(/\\'/g, "'"));
const extra = ['lim n→∞ (1-1/n)^2', 'lim x→-∞ sqrt(7-2x)(sqrt(15-8x)-sqrt(3-8x))', 'lim x→0 sin(3x)/x', 'lim x→0 (e^x-1)/x',
    'lim x→0+ 1/x', 'lim n→∞ 5(1+1/n)^n', 'rozwiąż 2x + 3 = 11', 'rozwiąż x^2 = 9', 'kroki 3/4 - 1/6', 'pochodna sin(x^2)',
    'pochodna x/(x+1)', 'całka 1/(x^2+4)', 'całka sin(x)^2', 'rozwiąż x^2 + 1 = 0', 'pochodna 3x^2',
    'całka 1/(x^2-1)', 'całka x*sin(x)', 'całka (2x+1)^3', 'całka tan(x)^2', 'całka √x', 'całka sin(x) od 0 do pi', 'pochodna (3x+1)^5',
    'pochodna √x', 'pochodna 5x^3', 'pochodna (x^2+1)/(x-1)', 'pochodna x^2*e^x', 'całka x^3/(x^2-1)'];

const missing = new Set(), bad = [], dubs = new Set();
const { FORMULAS } = require(path.join(root, 'js', 'step-formulas.js'));
// bez dubli (raporty D, E): przy kroku z dymkiem zdanie mówi o tym zadaniu, a dymek o regule — nie to samo dwa razy
const stems = t => t.replace(/\$[^$]*\$/g, ' ').toLowerCase().replace(/[^a-ząćęłńóśźż ]/g, ' ').split(/\s+/)
    .filter(w => w.length > 3 && !/^(więc|przez|jest|żeby|tylko|jako|albo|potem)$/.test(w)).map(w => w.slice(0, 5));
const grams = w => new Set(w.slice(0, Math.max(0, w.length - 3)).map((_, i) => w.slice(i, i + 4).join(' ')));
function dubbed(why, f) {
    const a = stems(why), b = new Set(stems(f.why)), g = grams(stems(why)), h = grams(stems(f.why));
    const shared = new Set(a.filter(x => b.has(x)));
    return [...g].some(x => h.has(x)) || (shared.size >= 3 && shared.size / new Set(a).size >= 0.5);
}
let steps = 0;
for (const q of ZESTAW.map(z => z.input).concat(sciaga, extra)) {
    let r; try { r = S.run(q); } catch { continue; }
    if (!r || !r.explain || !r.explain.steps) continue;
    for (const st of r.explain.steps) {
        if (isStatement(st.label)) continue;
        steps++;
        const w = whyFor(st, r.explain.title, r.explain, r.explain.steps.indexOf(st));
        if (!w) { missing.add(st.label); continue; }
        const words = w.replace(/\$[^$]*\$/g, 'X').split(/\s+/).length;
        const plain = w.replace(/\$[^$]*\$/g, '');
        if (st.formula && FORMULAS[st.formula.id] && dubbed(w, FORMULAS[st.formula.id])) dubs.add(st.formula.id + ': ' + w);
        if (words > 25 || /\^\(|sqrt\(|√\(/.test(plain) || !/[.!?]$/.test(w) || (w.split('$').length - 1) % 2)
            bad.push(st.label + ' → ' + w + ' (' + words + ' słów)');
    }
}
console.log('  kroki z „dlaczego”:', steps);
ok('każdy krok ma „dlaczego”', missing.size === 0, [...missing]);
ok('„dlaczego” krótkie i bez zapisu z klawiatury', bad.length === 0, bad);
ok('„dlaczego” nie powtarza dymku', dubs.size === 0, [...dubs]);
// symbole nieoznaczone w kroku 1 mają własne wyjaśnienie
const first = q => { const r = S.run(q); return whyFor(r.explain.steps[0], r.explain.title); };
ok('[0/0] wyjaśnione', /frac\{0\}\{0\}/.test(first('lim x→4 (x^2-6x+8)/(3x^2-10x-8)')));
ok('[1^∞] wyjaśnione', /1\^\{\\infty\}/.test(first('lim n→∞ (1-1/n)^n')));
// krok 1 bez symbolu nie obiecuje, że „nic nie przeszkadza” (7e: ∞ · 0, a silnik tego nie nazywa)
ok('krok 1 bez symbolu — neutralnie', !/nie przeszkadza/.test(first('lim x→-∞ sqrt(7-2x)(sqrt(15-8x)-sqrt(3-8x))')));
// uwagi „słabego ucznia” (3c): zdanie pasuje do konkretnego kroku, nie tylko do nazwy
const whyOf = (q, label) => { const r = S.run(q), st = r.explain.steps, i = st.findIndex(x => x.label.startsWith(label)); return i < 0 ? null : whyFor(st[i], r.explain.title, r.explain, i); };
ok('sprzężenie przy x → liczba nie mówi o ∞ − ∞', !/infty/.test(whyOf('lim x→5 (x-5)/(3-sqrt(x+4))', 'Mnożymy przez sprzężenie') || 'infty'));
ok('sprzężenie przy n → ∞ mówi o ∞ − ∞', /infty-\\infty/.test(whyOf('lim n→∞ (sqrt(n^2+n)-n)', 'Mnożymy przez sprzężenie') || ''));
ok('„Skracamy (−x)” przy −∞ bez „nawias nie jest zerem”', !/nie jest zerem/.test(whyOf('lim x→-∞ x/sqrt(3x^2+5)', 'Skracamy (') || 'nie jest zerem'));
ok('„dążą do 0” z wynikiem +∞ mówi o nieskończoności', /bez końca/.test(whyOf(ZESTAW.find(z => z.id === '1e').input, 'Wyrazy z') || ''));
ok('krok 1 przed „Dorabiamy jedynkę” mówi o 1^∞', /1\^\{\\infty\}/.test(whyOf('lim n→∞ ((2n+sqrt(n))/(2n+7sqrt(n)))^(2+sqrt(n))', 'Granica') || ''));
ok('A i B: zdanie o wstawianiu miejsc zerowych', /miejsca zerowe/.test(whyOf('całka 1/(x^2-1)', 'Wyznaczam A i B') || ''));
// „Sprawdzenie” zależy od zadania
ok('Sprawdzenie w całce ≠ w równaniu', whyFor({ label: 'Sprawdzenie', math: '' }, 'Całka') !== whyFor({ label: 'Sprawdzenie', math: '' }, 'Równanie'));

console.log(fail ? '❌ ' + fail + ' błędów, ' + pass + ' ok' : '✅ step-why: ' + pass + ' ok');
process.exit(fail ? 1 : 0);
