// ============================================================
//  ORACLE + GOLDEN dla jednostek — „test, który łapie błędy za człowieka".
//
//  Dwie warstwy:
//   A) GOLDEN AUTODOBÓR — ręcznie wpisane, ludzkie oczekiwania dla trybu
//      „Czytelnie (auto)". Strażnik klasy błędu „108 m + 900 m → 1,008 km"
//      (mylące, wygląda jak 1008 km; poprawnie ma być 1008 m).
//   B) RÓŻNICOWY ORACLE (fast-check) — generuje TYSIĄCE losowych wyrażeń
//      addytywnych na jednostkach i porównuje wynik silnika z NIEZALEŻNIE
//      policzoną wartością bazową (Σ ± nᵢ·factorᵢ). To właśnie ta warstwa
//      wyłapuje nieznane błędy (jak dawne „10 km / 2 km = 5 mm"): nie znamy
//      z góry oczekiwań, więc liczymy je drugim, banalnym torem i szukamy
//      rozjazdu. Kontrprzykład jest „skracany" (shrinking) do minimalnego.
//   C) NIEZMIENNIK CZYTELNOŚCI — dla losowych wartości autodobór NIGDY nie
//      pokazuje 3+ miejsc po przecinku (kontrakt isCleanDisplay/chooseUnit).
//
//  Uruchom:  node test/units-oracle.js   (albo npm run test:oracle)
//  PROP_RUNS=2000 node test/units-oracle.js  — więcej losowań.
//  Kod 0 = OK, 1 = błędy.
// ============================================================
'use strict';
const { api } = require('./_bootstrap');
let fc;
try { fc = require('fast-check'); }
catch (e) { console.error('❌ Brak fast-check — zainstaluj: npm install --include=dev'); process.exit(2); }

const DATA = (global.window.MATM0_DATA || {}).UNIT_CATEGORIES || {};
const RUNS = parseInt(process.env.PROP_RUNS || '600', 10);

let pass = 0, fail = 0;
const fails = [];
function near(a, b) {
    if (typeof a !== 'number' || typeof b !== 'number') return false;
    return Math.abs(a - b) <= Math.max(1e-6, Math.abs(b) * 1e-9);
}
function setAuto() {
    const du = api.state.settings.defaultUnits;
    ['length', 'mass', 'volume', 'area', 'time', 'data', 'speed'].forEach(c => { du[c] = '__auto__'; });
}
function setBase() {
    const du = api.state.settings.defaultUnits;
    Object.keys(du).forEach(c => { du[c] = ''; });
}

// ── A) GOLDEN: ludzkie oczekiwania dla autodoboru ──────────────────────────────
function gold(expr, value, unit) {
    const r = api.evalCalcExpression(expr) || {};
    const okV = near(r.value, value);
    const okU = (r.unit === unit);
    if (okV && okU) pass++;
    else { fail++; fails.push({ tag: 'GOLDEN', expr, want: value + ' ' + unit, got: r.value + ' ' + r.unit }); }
}

setAuto();
// ── Sedno zgłoszonego błędu: suma metrów ma zostać w metrach, nie skakać w km ──
gold('108m+900m', 1008, 'm');     // ⟵ był „1,008 km" (mylące). Teraz 1008 m.
gold('108 m + 900 m', 1008, 'm');
gold('900m+108m', 1008, 'm');     // przemienność
gold('999m+10m', 1009, 'm');
gold('1m+1m', 2, 'm');
gold('1000m', 1, 'km');           // równo 1 km — awans czytelny
gold('1001m', 1001, 'm');         // 1,001 km byłoby brzydkie → zostaje m
// ── Awans DOZWOLONY, gdy zostaje czytelnie (≤2 miejsca) ──
gold('500m+600m', 1.1, 'km');
gold('2km+300m', 2.3, 'km');
gold('5km+300m', 5.3, 'km');
gold('1230m', 1.23, 'km');        // 2 miejsca — OK
gold('1500mm', 1.5, 'm');
gold('500mm', 50, 'cm');
gold('100km', 100, 'km');
gold('12345m', 12345, 'm');       // 12,345 km brzydkie → zostaje m
// ── Masa / objętość: ten sam kontrakt ──
gold('2kg+300g', 2.3, 'kg');
gold('2500g', 2.5, 'kg');
gold('1008g', 1008, 'g');         // analogiczne do 1008 m
gold('1l+500ml', 1.5, 'l');
gold('250ml+500ml', 750, 'ml');
gold('1008ml', 1008, 'ml');

// ── B) RÓŻNICOWY ORACLE: silnik vs niezależna suma bazowa ───────────────────────
// Tylko jednoznaczne, czysto fizyczne wymiary (bez time/speed/angle — kolizje z
// zegarem/datą/slashami). Jednostki metryczne bez aliasów-pułapek (in/t/ft…).
setBase();
const SAFE_UNITS = {
    length: ['mm', 'cm', 'dm', 'm', 'km'],
    mass: ['g', 'dag', 'kg'],
    volume: ['ml', 'cl', 'dl', 'l', 'hl'],
    area: ['mm2', 'cm2', 'dm2', 'm2', 'ar', 'ha'],
    data: ['B', 'KB', 'MB'],
};
function factorOf(cat, u) { return DATA[cat].units[u]; }
const DISP = (global.window.MATM0_DATA || {}).CALC_UNIT_DISPLAY || {};
function unitKeyFromLabel(cat, label) {
    if (!label || !DATA[cat]) return label;
    const units = DATA[cat].units;
    if (units[label] != null) return label;
    for (const k of Object.keys(units)) {
        if ((DISP[k] || k) === label) return k;
    }
    return label;
}
function displayToBase(cat, value, unitLabel) {
    if (value == null || !cat || !DATA[cat]) return value;
    const key = unitKeyFromLabel(cat, unitLabel);
    const f = factorOf(cat, key);
    return f != null ? value * f : value;
}

const oracleFails = [];
function runOracle() {
    const cats = Object.keys(SAFE_UNITS);
    const termArb = (cat) => fc.record({
        n: fc.integer({ min: 1, max: 999 }),
        u: fc.constantFrom(...SAFE_UNITS[cat]),
        sign: fc.constantFrom(1, -1),
        sp: fc.boolean(), // spacja między liczbą a jednostką?
    });
    const exprArb = fc.constantFrom(...cats).chain((cat) =>
        fc.array(termArb(cat), { minLength: 1, maxLength: 4 }).map((terms) => ({ cat, terms })));

    const prop = fc.property(exprArb, ({ cat, terms }) => {
        // pierwszy term zawsze dodatni (silnik nie zaczyna wyrażenia od „-jednostka")
        let expr = '';
        let expected = 0;
        terms.forEach((t, i) => {
            const sign = i === 0 ? 1 : t.sign;
            const op = i === 0 ? '' : (sign > 0 ? '+' : '-');
            expr += op + t.n + (t.sp ? ' ' : '') + t.u;
            expected += sign * t.n * factorOf(cat, t.u);
        });
        const r = api.evalCalcExpression(expr) || {};
        if (r.value == null) return true; // ścieżka BigInt/odmowa — pomijamy
        const gotBase = displayToBase(cat, r.value, r.unit);
        const ok = near(gotBase, expected);
        if (!ok) oracleFails.push({ expr, expected, got: r.value, unit: r.unit, base: DATA[cat].base });
        return ok;
    });

    try {
        fc.assert(prop, { numRuns: RUNS, seed: 42 });
        pass++;
    } catch (e) {
        fail++;
        const cx = (e && e.counterexample && e.counterexample[0]) || null;
        let detail = (oracleFails[0] && JSON.stringify(oracleFails[0])) || (e && e.message) || String(e);
        fails.push({ tag: 'ORACLE', expr: '(różnicowy fuzz)', want: 'silnik == Σ±nᵢ·factorᵢ', got: detail });
    }
}
runOracle();

// ── C) NIEZMIENNIK CZYTELNOŚCI: autodobór nie pokazuje 3+ miejsc po przecinku ────
function decimals(v) {
    if (!isFinite(v)) return 0;
    const s = String(v);
    const i = s.indexOf('.');
    return i < 0 ? 0 : (s.length - i - 1);
}
function runCleanInvariant() {
    setAuto();
    // bazą długości jest mm (factor 1) → suma metryczna to ZAWSZE całkowite mm.
    const prop = fc.property(
        fc.constantFrom('length', 'mass', 'volume'),
        fc.array(fc.integer({ min: 1, max: 5000 }), { minLength: 1, maxLength: 3 }),
        (cat, ns) => {
            const u = SAFE_UNITS[cat][0]; // najmniejsza jednostka drabinki (mm/g/ml)
            const expr = ns.map(n => n + u).join('+');
            const r = api.evalCalcExpression(expr) || {};
            if (r.value == null) return true;
            return decimals(r.value) <= 2; // kontrakt isCleanDisplay
        });
    try { fc.assert(prop, { numRuns: Math.min(RUNS, 400), seed: 7 }); pass++; }
    catch (e) {
        fail++;
        const cx = e && e.counterexample;
        fails.push({ tag: 'CLEAN', expr: cx ? JSON.stringify(cx) : '(niezmiennik)', want: '≤2 miejsca po przecinku', got: (e && e.message) || String(e) });
    }
    setBase();
}
runCleanInvariant();

// ── Raport ─────────────────────────────────────────────────────────────────────
console.log('  ' + (fail ? '✗' : '✓') + ' units-oracle: ' + pass + '/' + (pass + fail) + ' PASS (numRuns=' + RUNS + ')');
if (fails.length) {
    console.log('\nNIEPRZESZŁE:');
    fails.forEach(f => console.log('  ✗ [' + f.tag + ']', f.expr, '| chcę:', f.want, '| mam:', f.got));
    if (oracleFails.length) {
        console.log('\n  Pierwsze rozjazdy różnicowe:');
        oracleFails.slice(0, 5).forEach(d => console.log('     ', d.expr, '→ silnik', d.got, '≠ oczekiwane', d.expected, '(' + d.base + ')'));
    }
}
process.exit(fail ? 1 : 0); // atrapa fetch trzyma event-loop → kończymy jawnie
