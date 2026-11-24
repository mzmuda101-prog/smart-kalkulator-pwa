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
    'pochodna √x', 'pochodna 5x^3', 'pochodna (x^2+1)/(x-1)', 'pochodna x^2*e^x', 'całka x^3/(x^2-1)', 'rozwiąż 5 - 2x ≥ 11', 'rozwiąż x^2 + 2 > 2x', 'rozwiąż x^2 + 1 < 0', 'rozwiąż x^2 - 4x + 4 > 0', 'rozwiąż -x^2 + 1 > 0', 'rozwiąż x + 1 > x', 'rozwiąż 2x + 3y = 12; 3x - 2y = 5', 'rozwiąż x = 2y, x + y = 9', 'rozwiąż x + y = 1, x + y = 2', 'rozwiąż x + y = 1, 2x + 2y = 2', 'rozwiąż 3x - y = 1, -x + 2y = 3', 'rozwiąż 1/x = 2', 'rozwiąż (x+1)/(x-2) = 3', 'rozwiąż (x+3)/(x-1) = (x-1)/(x+1)', 'rozwiąż x^2/(x-1) = 1/(x-1)', 'rozwiąż 2^x = 8', 'rozwiąż 4^x = 2^(x+3)', 'rozwiąż 2^x = 5', 'rozwiąż log_2(x) = 3', 'rozwiąż log_2(x+3) = log_2(2x)', 'rozwiąż log_2(x-5) = log_2(1-x)', 'rozwiąż |x-2| = 3', 'rozwiąż |x| = -1', 'rozwiąż |2x+1| = 0', 'rozwiąż |x-2| < 3', 'rozwiąż |x-2| >= 3', 'rozwiąż |x| > -2', 'rozwiąż |x| > 0', 'rozwiąż √(x+3) = x - 3', 'rozwiąż √x = -2', 'rozwiąż sqrt(2x-1) = 3', 'rozwiąż sin(x) = 1/2', 'rozwiąż cos(x) = sqrt(2)/2', 'rozwiąż tg(x) = 1', 'rozwiąż sin(x) = 0', 'rozwiąż sin(x) = 2', 'rozwiąż sin(2x) = 1/2', 'nwd(12, 18)', 'nww(4, 6)', 'nwd(8, 15)', 'wierzchołek x^2 - 4x + 3', 'wierzchołek 2x^2 + 3x - 2', 'kroki 20% z 150', 'kroki 150 + 20%', 'kroki 200 - 15%', 'kroki ile procent 30 z 120'];

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
    // każdy sposób (explain.methods) sprawdzany jak osobne rozwiązanie
    for (const ex of (r.explain.methods || [r.explain]).map(m => ({ title: r.explain.title, steps: m.steps })))
    for (const st of ex.steps) {
        if (isStatement(st.label)) continue;
        steps++;
        const w = whyFor(st, ex.title, ex, ex.steps.indexOf(st));
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
ok('krok 1 przed „Zapisujemy podstawę jako 1 + 1/aₙ” mówi o 1^∞', /1\^\{\\infty\}/.test(whyOf('lim n→∞ ((2n+sqrt(n))/(2n+7sqrt(n)))^(2+sqrt(n))', 'Granica') || ''));
ok('A i B: zdanie o wstawianiu miejsc zerowych', /miejsca zerowe/.test(whyOf('całka 1/(x^2-1)', 'Wyznaczam A i B') || ''));
// przegląd dymków: znacznik koloru ⟦kπ⟧ nie może zmienić zdania o okresie (tg ma okres π, nie 2π)
ok('tg x = 1: okres π', /\$\\pi\$/.test(whyOf('rozwiąż tg(x) = 1', 'Zapisuję wszystkie rozwiązania') || '') && !/2\\pi/.test(whyOf('rozwiąż tg(x) = 1', 'Zapisuję wszystkie rozwiązania') || '2\\pi'), whyOf('rozwiąż tg(x) = 1', 'Zapisuję wszystkie rozwiązania'));
ok('sin x = 0: okres π', !/2\\pi/.test(whyOf('rozwiąż sin(x) = 0', 'Zapisuję wszystkie rozwiązania') || '2\\pi'), whyOf('rozwiąż sin(x) = 0', 'Zapisuję wszystkie rozwiązania'));
// zdanie nie zakłada litery x
ok('3 − y < 5: bez „x” w zdaniu', !/\bx\b/.test(whyOf('rozwiąż 3 - y < 5', 'Dzielę przez') || 'x'), whyOf('rozwiąż 3 - y < 5', 'Dzielę przez'));
{ // wykładnik może dążyć do −∞: zdanie nie mówi „rośnie”
    const r = S.run('lim n→∞ (1+1/n)^(-n^2)'), m = r.explain.methods, st = m && m[1].steps, i = st ? st.findIndex(x => /wzoru skróconego/.test(x.label)) : -1;
    const w = i >= 0 ? whyFor(st[i], r.explain.title, { steps: st }, i) : 'rośnie';
    ok('wzór skrócony przy −∞: bez „rośnie”', !/rośnie/.test(w), w);
}
{ // Partia 2a-1 (S1, S21, S26): „Wzór skrócony” nie mówi o podstawie dążącej do e ani o nawiasie
    for (const [q, num] of [['lim n→∞ (1-1/n)^n', '-1'], ['lim n→∞ ((n+4)/n)^(n+5)', '4'], ['lim n→∞ (1+2/n)^n', '2']]) {
        const r = S.run(q), m = r.explain.methods.find(x => x.label === 'Wzór skrócony'), st = m.steps;
        const ws = st.map((x, i) => whyFor(x, r.explain.title, { steps: st }, i));
        ok(q + ': wzór skrócony bez „Podstawa dąży do e” i „Środek nawiasu”', ws.every(w => !/Podstawa dąży do \$e\$|Środek nawiasu/.test(w)), ws);
        const fin = st.findIndex(x => x.label === 'Składamy wynik'), wf = ws[fin];
        ok(q + ': Składamy wynik ma e i liczbę z poprzedniego kroku', /\$e|e\^/.test(wf) && wf.includes('$' + num + '$'), wf);
        const sk = st.findIndex(x => x.formula && x.formula.id === 'e-skrocony');
        ok(q + ': krok ze wzorem — g i (f − 1)', /\bg\b/.test(ws[sk]) && /\(f-1\)|\(f − 1\)/.test(ws[sk]), ws[sk]);
        ok(q + ': krok ze wzorem ma here „f = …, g = …”', /^f = .+, g = .+$/.test(st[sk].formula.here || ''), st[sk].formula);
    }
    const r5 = S.run('lim n→∞ 5(1+1/n)^n'), s5 = r5.explain.steps, i5 = s5.findIndex(x => x.label === 'Składamy wynik');
    const w5 = whyFor(s5[i5], r5.explain.title, r5.explain, i5);
    for (const [q, pw] of [['lim n→∞ 5(1-1/n)^n', 'e^{-1}'], ['lim n→∞ 5(1+2/n)^n', 'e^{2}'], ['lim n→∞ 3(1+1/n)^(n/2)', 'e^{\\frac{1}{2}}']]) {
        const r = S.run(q), st = r.explain.steps, i = st.findIndex(x => x.label === 'Składamy wynik'), w = whyFor(st[i], r.explain.title, r.explain, i);
        ok(q + ': czynnik i prawdziwa potęga e w zdaniu', w.includes(pw) && !/razy \$e\$/.test(w), w);
    }
    for (const [q, pw] of [['lim n→∞ (1-1/n)^(n/2)', 'e^{-\\frac{1}{2}}'], ['lim n→∞ (1+2/n)^n', 'e^{2}'], ['lim n→∞ (1+1/n)^n', 'e$.']]) {
        const r = S.run(q), m = r.explain.methods && r.explain.methods.find(x => x.label === 'Wzór skrócony');
        if (!m) { ok(q + ': ma wzór skrócony', false); continue; }
        const i = m.steps.findIndex(x => x.label === 'Składamy wynik'), w = whyFor(m.steps[i], r.explain.title, { steps: m.steps }, i);
        ok(q + ': Składamy wynik (wzór skrócony) mówi o granicy potęgi ' + pw, w.includes(pw) && /Wykładnik dąży do/.test(w) && !/to jest wynik/.test(w), w);
    }
    { // nowe zdania: do 25 słów
        const qs = ['lim n→∞ (1-1/n)^n', 'lim n→∞ ((n+4)/n)^(n+5)', 'lim n→∞ (1+2/n)^n'], long = [];
        for (const q of qs) { const r = S.run(q), st = r.explain.methods.find(x => x.label === 'Wzór skrócony').steps;
            st.forEach((x, i) => { const w = whyFor(x, r.explain.title, { steps: st }, i); if (w.replace(/\$[^$]*\$/g, 'X').split(/\s+/).filter(Boolean).length > 25) long.push(w); }); }
        for (const q of ['lim n→∞ 5(1-1/n)^n', 'lim n→∞ 3(1+1/n)^(n/2)']) { const r = S.run(q), st = r.explain.steps, i = st.findIndex(x => x.label === 'Składamy wynik'); const w = whyFor(st[i], r.explain.title, r.explain, i);
            if (w.replace(/\$[^$]*\$/g, 'X').split(/\s+/).length > 25) long.push(w); }
        ok('nowe zdania wzoru skróconego i czynnika: do 25 słów', long.length === 0, long);
    }
    ok('5(1+1/n)^n: Składamy wynik mówi o czynniku 5', w5.includes('5') && !/Podstawa dąży do \$e\$/.test(w5), w5);
}
// „Sprawdzenie” zależy od zadania
ok('Sprawdzenie w całce ≠ w równaniu', whyFor({ label: 'Sprawdzenie', math: '' }, 'Całka') !== whyFor({ label: 'Sprawdzenie', math: '' }, 'Równanie'));

// Partia 1: Horner w granicy
{
    const w = whyOf('lim x→2 (x^4-13x^2+36)/(x^3-2x^2+x-2)', 'Rozkładamy na czynniki') || '', h = whyOf('lim x→2 (x^4-13x^2+36)/(x^3-2x^2+x-2)', 'Dzielimy schematem Hornera') || '';
    ok('Rozkładamy: konkretny nawias (x-2)', w.includes('(x-2)') && !w.includes('(x-a)'), w);
    ok('Hornera w granicy: zdanie o liczbie 2', h.includes('$2$') && h.includes('(x-2)'), h);
}

{
    const h0 = whyOf('lim x→0 (x^2+3x)/(x^2-2x)', 'Dzielimy schematem Hornera') || '';
    ok('Horner przy x → 0: (x), nie (x-0)', h0.includes('(x)') === false && !h0.includes('x-0') && /\$x\$/.test(h0), h0);
}

// ── poprawki końcowe: r nazwane (6b), de l'Hospital bez fałszu przy ponownym ∞/∞ (7) ──
{
    const wr = whyOf('lim n→∞ ((n+4)/n)^(n+5)', 'Zapisujemy podstawę');
    ok('FF6: zdanie mówi, czym jest r', /\$r\$/.test(wr || '') && /reszt/.test(wr || ''), wr);
    const w0 = whyOf('lim n→∞ (1+1/n)^n', 'Zapisujemy podstawę');
    ok('FF6: bez r w zadaniu bez r — zdanie bez r', !/\$r\$/.test(w0 || ''), w0);
    const lh = q => { const r = S.run(q), m = r.explain.methods.find(x => x.label === "de l'Hospital"), i = m.steps.findIndex(x => /^Reguła de l/.test(x.label));
        return whyFor(m.steps[i], r.explain.title, Object.assign({}, r.explain, { steps: m.steps }), i); };
    for (const q of ['lim x→∞ x/sqrt(3x^2+5)', 'lim x→-∞ x/sqrt(3x^2+5)', 'lim x→-1 (3x^3+8x^2+7x+2)/(2x^4+4x^3-3x^2-10x-5)'])
        ok('FF7: nie obiecuje policzenia ' + q, !/da się już policzyć/.test(lh(q)), lh(q));
    ok('FF7: ∞/∞ znowu', /infty/.test(lh('lim x→∞ x/sqrt(3x^2+5)')), lh('lim x→∞ x/sqrt(3x^2+5)'));
    ok('FF7: przy podstawieniu zdanie bez zmian', /da się już policzyć/.test(lh('lim x→4 (x^2-6x+8)/(3x^2-10x-8)')), lh('lim x→4 (x^2-6x+8)/(3x^2-10x-8)'));
}

console.log(fail ? '❌ ' + fail + ' błędów, ' + pass + ' ok' : '✅ step-why: ' + pass + ' ok');
process.exit(fail ? 1 : 0);
