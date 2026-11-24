// Klawiatura „Wzory” (js/formula-keys.js): każdy klawisz i wariant wstawia zapis, który silnik naprawdę liczy.
// Uruchom: node test/formula-keys.js
'use strict';
const path = require('path');
const { api } = require('./_bootstrap');
const K = require(path.join(__dirname, '..', 'js', 'formula-keys.js'));

let pass = 0, fail = 0;
function ok(name, cond, got) {
    if (cond) { pass++; return; }
    fail++;
    console.log('  ✗', name, got === undefined ? '' : '→ ' + JSON.stringify(got));
}
const val = (q) => { try { const r = api.evalCalcExpression(q); return r ? (typeof r.value === 'number' && isFinite(r.value) ? r.value : r.text) : null; } catch (e) { return 'ERR ' + e.message; } };
const near = (a, b) => typeof a === 'number' && Math.abs(a - b) <= 1e-9 * (1 + Math.abs(b));

// wstawka → [przed, po, oczekiwany wynik (liczba albo tekst)]
const SAMPLE = {
    'lim n→∞ ': ['', '1/n', 0], 'lim x→0 ': ['', 'sin(x)/x', 1], 'lim x→0+ ': ['', '1/x', '+∞'], 'lim x→0- ': ['', '1/x', '−∞'],
    'lim x→∞ ': ['', '1/x', 0], 'lim x→': ['', '2 x^2', 4], '∞': ['lim n→', ' 1/n', 0], '-∞': ['lim x→', ' 1/x', 0],
    'abs(': ['', '-3)', 3], 'sqrt(': ['', '16)', 4], '∛(': ['', '27)', 3], '∜(': ['', '16)', 2], ' mod ': ['10', '3', 1],
    '^(': ['2', '3)', 8], '^3': ['2', '', 8], '^(-1)': ['4', '', 0.25], 'e^(': ['', '0)', 1], '^2': ['3', '', 9], '!': ['5', '', 120],
    'x': ['lim ', '→2 x^2', 4], 'y': ['lim ', '→2 y^2', 4], 't': ['lim ', '→2 t^2', 4], 'n': ['lim ', '→2 n^2', 4],
    'k': ['lim ', '→2 k^2', 4], 'm': ['lim ', '→2 m^2', 4], 'a': ['lim ', '→2 a^2', 4], 'b': ['lim ', '→2 b^2', 4], 'e': ['', '', Math.E], 'π': ['', '', Math.PI],
    'sin(': ['', '0)', 0], 'cos(': ['', '0)', 1], 'tg(': ['', '0)', 0], 'ctg(': ['', 'pi/4)', 1], 'arcsin(': ['', '1)', 90],
    'arccos(': ['', '1)', 0], 'arctg(': ['', '1)', 45], 'ln(': ['', 'e)', 1], 'log(': ['', '100)', 2], 'log_2(': ['', '8)', 3],
    'pochodna ': ['', 'x^2', 'f′(x) = 2x'], 'całka ': ['', 'x^2 od 0 do 3', 9], 'rozwiąż ': ['', 'x+1=3', 2], '=': ['x+1', '3', 2],
    ' dx': ['całka 2x', '', 'x² + C'], '→': ['lim x', '0 sin(x)/x', 1],
};
const seen = new Set();
function check(page, k, where) {
    k = K.view(k, ''); // klawisz zmiennej: litera z pola (puste → x)
    if (k.act || k.page) return;
    const ins = K.insertText(k, '');
    seen.add(ins);
    const s = SAMPLE[ins];
    if (!s) { ok(where + ': brak przykładu dla ' + JSON.stringify(ins), false); return; }
    const q = s[0] + ins + s[1], got = val(q);
    ok(where + ' ' + JSON.stringify(q) + ' = ' + s[2], typeof s[2] === 'number' ? near(got, s[2]) : got === s[2], got);
}
for (const [name, keys] of Object.entries(K.PAGES)) {
    ok(name + ': 30 klawiszy (5 kolumn × 6 rzędów)', keys.length === 30, keys.length);
    for (const k of keys) {
        if (!k.smart) check(name, k, name + '/' + k.label);
        for (const a of K.view(k, '').alts || []) check(name, a, name + '/' + k.label + '→' + a.label);
    }
}
// ułamek: zamyka otwarty licznik, inaczej otwiera mianownik
const frac = K.PAGES.wzory.find((k) => k.smart === 'frac');
ok('a/b po „(2n+1” → „)/(”', K.insertText(frac, 'lim n→∞ (2n+1') === ')/(');
ok('a/b po „5” → „/(”', K.insertText(frac, '5') === '/(');
ok('a/b: lim n→∞ (2n+1)/(6n+5) = 1/3', near(val('lim n→∞ (2n+1' + K.insertText(frac, '(2n+1') + '6n+5)'), 1 / 3));
// wszystko spod przytrzymania jest też na karcie Funkcje (poza literami zmiennych i wariantami lim)
const funk = new Set(K.PAGES.funkcje.map((k) => k.ins).filter(Boolean));
for (const k of K.PAGES.wzory) for (const a of k.alts || [])
    if (!/^[a-z]$/.test(a.ins || '') && !/^lim/.test(a.ins || '')) ok('na karcie Funkcje: ' + a.label, funk.has(a.ins), a.ins);
// znaczki w rogach (pomysł Mateusza)
const by = (l) => K.PAGES.wzory.find((k) => k.label === l);
const VAR = K.PAGES.wzory.find((k) => k.var);
ok('zmienna: pusto → x, ⋯ w rogu', K.view(VAR, '').label === 'x' && K.cornerHint(K.view(VAR, '')).tr === '⋯');
ok('zmienna: po „lim n→∞” → n, x pod przytrzymaniem', K.view(VAR, 'lim n→∞ (').label === 'n' && K.view(VAR, 'lim n→∞ (').alts.some((a) => a.label === 'x'));
ok('zmienna: „przy t → 0” → t', K.varFor('granica sin(t)/t przy t → 0') === 't');
ok('zmienna: ostatnia granica wygrywa', K.varFor('lim n→∞ 1/n + lim k→∞ ') === 'k');
ok('lim: wariant „własny punkt” otwiera klawiaturę telefonu', by('lim').alts.some((a) => a.ins === 'lim x→' && a.focus === true));
ok('√: ∛ i ∜ w rogach', JSON.stringify(K.cornerHint(by('√'))) === JSON.stringify({ tl: '∛', tr: '∜' }));
ok('∞: jeden wariant w prawym rogu', JSON.stringify(K.cornerHint(by('∞'))) === JSON.stringify({ tr: '−∞' }));
ok('lim: wiele — ⋯', JSON.stringify(K.cornerHint(by('lim'))) === JSON.stringify({ tr: '⋯' }));
ok('7: bez znaczka', JSON.stringify(K.cornerHint(by('7'))) === '{}');

console.log(fail ? '❌ formula-keys: ' + fail + ' błędów, ' + pass + ' ok' : '✅ formula-keys: ' + pass + ' ok');
process.exit(fail ? 1 : 0);
