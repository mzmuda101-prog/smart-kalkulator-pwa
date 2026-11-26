// Podręcznik: spójność haseł w js/step-formulas.js (dział, poziom, słowa, przykład „Spróbuj” z obiecanym wynikiem).
// Uruchom: node test/handbook-data.js
'use strict';
const path = require('path');
const root = path.join(__dirname, '..');
const S = require(path.join(root, 'js', 'math-steps.js'));
require(path.join(root, 'js', 'math-calculus.js'));
require(path.join(root, 'js', 'math-limits.js'));
const { FORMULAS, DZIALY } = require(path.join(root, 'js', 'step-formulas.js'));

let pass = 0, fail = 0;
function ok(name, cond, got) {
    if (cond) { pass++; return; }
    fail++;
    console.log('  ✗', name, got === undefined ? '' : '→ ' + JSON.stringify(got));
}

ok('DZIALY to niepusta lista {id, name}', Array.isArray(DZIALY) && DZIALY.length > 0
    && DZIALY.every(d => d && d.id && d.name), DZIALY);
const dzialy = new Set((DZIALY || []).map(d => d.id));
const names = new Map();
for (const [id, f] of Object.entries(FORMULAS)) {
    ok(id + ': dział z listy', dzialy.has(f.dzial), f.dzial);
    ok(id + ': poziom lp/lr/st', ['lp', 'lr', 'st'].includes(f.poziom), f.poziom);
    ok(id + ': treść', !!(f.name && f.tex && f.why), f.name);
    // zgubiony ukośnik w źródle: '\;' w JS to sam średnik, na ekranie „2;⇒;x” zamiast odstępu
    ok(id + ': LaTeX bez zgubionych ukośników', ![f.tex, f.why].concat(f.more || []).some(t => /[^\\\s];\\[a-zA-Z]|[a-zA-Z0-9];\\/.test(t)), f.tex);
    ok(id + ': słowa do wyszukiwarki', Array.isArray(f.keywords) && f.keywords.length > 0, f.keywords);
    ok(id + ': powiązane istnieją', Array.isArray(f.related) && f.related.every(r => r !== id && FORMULAS[r]), f.related);
    ok(id + ': nazwa bez dubla', !names.has(f.name), names.get(f.name));
    names.set(f.name, id);
    let r = null;
    try { r = f.try ? S.run(f.try) : null; } catch (e) { r = { text: 'wyjątek: ' + e.message }; }
    ok(id + ': „Spróbuj” ' + f.try + ' ma kroki', !!(r && r.explain && r.explain.steps && r.explain.steps.length), r && r.text);
    ok(id + ': „Spróbuj” daje obiecany wynik', !!r && !!f.expect && r.text === f.expect, r && r.text);
}

// „skąd wzór” (bottom-up) i „skąd nazwa” (term-origins) przy hasłach, gdzie „zapamiętaj” było najsłabsze
for (const id of ['delta', 'wzory-x12', 'e', 'pochodna-iloczynu', 'przez-czesci', 'suma-szescianow', 'kwadrat-roznicy'])
    ok(id + ': akapit „Skąd wzór”', (FORMULAS[id].more || []).some(t => /^Skąd (wzór|ta liczba):/.test(t)), FORMULAS[id].more);
for (const id of ['delta', 'e', 'definicja-logarytmu', 'sprzezenie', 'suma-szescianow', 'kwadrat-roznicy'])
    ok(id + ': akapit „Skąd nazwa”', (FORMULAS[id].more || []).some(t => /^Skąd nazwa:/.test(t)), FORMULAS[id].more);

// hasła z podstaw równań (dymki-podstawy, zadanie 3): każde ma „Skąd wzór” i „Skąd nazwa”
for (const id of ['wyrazy-podobne', 'opuszczanie-nawiasow', 'przenoszenie', 'obie-strony', 'pierwiastkowanie-obu-stron', 'iloczyn-rowny-zero',
    'sprawdzenie', 'wspolczynniki-trojmianu', 'dziedzina', 'rownosc-logarytmow', 'czynniki-pierwsze', 'skladanie-rozkladu']) {
    const f = FORMULAS[id];
    ok(id + ': hasło istnieje', !!f);
    if (!f) continue;
    ok(id + ': akapit „Skąd wzór”', (f.more || []).some(t => /^Skąd wzór:/.test(t)), f.more);
    ok(id + ': akapit „Skąd nazwa”', (f.more || []).some(t => /^Skąd nazwa:/.test(t)), f.more);
}

// hasła z analizy i reszty (dymki-podstawy, zadanie 5): każde ma „Skąd wzór” i „Skąd nazwa”
for (const id of ['sprawdzenie-calki', 'liniowosc-pochodnej', 'liniowosc-calki', 'ulamki-proste', 'podstawienie-w-calce', 'kolejnosc-dzialan',
    'skracanie-ulamka', 'dzielenie-z-reszta', 'pierwiastek-iloczynu', 'wciaganie-do-nawiasu', 'znak-ulamka', 'liczba-przy-x']) {
    const f = FORMULAS[id];
    ok(id + ': hasło istnieje', !!f);
    if (!f) continue;
    ok(id + ': akapit „Skąd wzór”', (f.more || []).some(t => /^Skąd wzór:/.test(t)), f.more);
    ok(id + ': akapit „Skąd nazwa”', (f.more || []).some(t => /^Skąd nazwa:/.test(t)), f.more);
}

// hasła z podstaw granic (dymki-podstawy, zadanie 4)
for (const id of ['granica-najwyzsza-potega', 'granice-podstawowe', 'granica-ciaglosc', 'skracanie-czynnika-w-granicy',
    'granica-jednostronna', 'granica-sumy', 'ciaglosc-logarytmu']) {
    const f = FORMULAS[id];
    ok(id + ': hasło istnieje', !!f);
    if (!f) continue;
    ok(id + ': akapit „Skąd wzór”', (f.more || []).some(t => /^Skąd wzór:/.test(t)), f.more);
    ok(id + ': akapit „Skąd nazwa”', (f.more || []).some(t => /^Skąd nazwa:/.test(t)), f.more);
}

console.log(`handbook-data: ${pass} ok, ${fail} błędów`);
process.exit(fail ? 1 : 0);
