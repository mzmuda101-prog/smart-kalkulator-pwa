// ============================================================
//  WARSTWA SYNONIMÓW — js/synonyms.js
//
//  Audyt 2026-09-20: silnik rozumiał JEDNO sformułowanie, a bliski wariant
//  o tym samym znaczeniu już nie. Dla użytkownika to wygląda jak losowa
//  awaria, nie jak brak funkcji.
//
//  Ten test pilnuje TRZECH rzeczy — i druga jest ważniejsza od pierwszej:
//
//    1. DZIAŁA        — warianty, które miały zacząć się liczyć, liczą się
//                       i dają POPRAWNĄ wartość (nie „jakąkolwiek").
//    2. NIE UKRADŁA   — wyrażenia, które działały wcześniej, dają DOKŁADNIE
//                       to samo. Warstwa jest fallbackiem: ma prawo odezwać
//                       się tylko tam, gdzie rdzeń milczał.
//    3. NIE ZGADUJE   — rzeczy niejednoznaczne mają dalej milczeć. Cichy zły
//                       wynik jest gorszy niż brak wyniku.
//
//  Uruchom:  node test/synonyms.js   (albo npm run test:syn)
// ============================================================
'use strict';
const { api } = require('./_bootstrap');

api.state.fx.rates = { PLN: 1, EUR: 4.30, USD: 3.95 };
api.state.fx.ts = Date.now();

let pass = 0, fail = 0;
const fails = [];

function val(expr) {
    let r = null;
    try { r = api.evalCalcExpression(expr); } catch (e) { return { err: e.message }; }
    return r || {};
}
function isEmpty(r) {
    return !r || (r.value == null && r.text == null && !r.big);
}
function near(a, b, tol) {
    return a != null && b != null && Math.abs(a - b) <= (tol == null ? 1e-6 : tol);
}

// ── 1. DZIAŁA — [wyrażenie, oczekiwana wartość, oczekiwana jednostka (opc.)] ──
const WORKS = [
    // zakres zegarowy z pytajnikiem (forma kanoniczna zwraca minuty)
    ['ile godzin od 8:00 do 16:30', 8.5],
    ['ile minut od 8:00 do 16:30', 510],
    ['how many hours from 8:00 to 16:30', 8.5],
    ['ile czasu od 8:00 do 16:30', 510],     // bez konwersji — forma kanoniczna
    // odliczanie do daty w innej jednostce
    ['ile tygodni do 25.12', 87 / 7, 'tyg'],
    ['ile godzin do 25.12', 87 * 24],
    // procent z WIELKOŚCI (jednostka musi przeżyć)
    ['20% z 5 km', 1, 'km'],
    ['60% z 2 godzin', 1.2, 'godzin'],   // jednostka echem słowa z wejścia
    // dzielenie opisowe
    ['podziel 250 zł na 4', 62.5],
    ['250 zł na 4 osoby', 62.5],
    ['250 zł podzielić na 4', 62.5],
    ['rachunek 250 zł na 4 osoby', 62.5],
    ['split 250 by 4', 62.5],
    // agregacja bez przyimka
    ['średnia 2 4 6', 4],
    ['avg of 2 4 6', 4],
];

for (const [expr, want, unit] of WORKS) {
    const r = val(expr);
    if (isEmpty(r)) {
        fail++; fails.push(`${expr} — dalej nic nie zwraca`);
    } else if (!near(r.value, want)) {
        fail++; fails.push(`${expr} — wartość ${r.value}, oczekiwano ${want}`);
    } else if (unit && r.unit !== unit) {
        fail++; fails.push(`${expr} — jednostka "${r.unit}", oczekiwano "${unit}"`);
    } else {
        pass++;
    }
}

// ── 2. NIE UKRADŁA — musi być identycznie jak przed warstwą ──────────────────
// Wartości wpisane RĘCZNIE z przebiegu na HEAD sprzed warstwy synonimów.
const UNCHANGED = [
    ['od 8:00 do 16:30', 510],
    ['ile dni do 25.12', 87],
    ['średnia z 2 4 6', 4],
    ['average of 2 4 6', 4],
    ['20% z 5', 1],
    ['20% ze 100', 20],
    ['15% z 200 zł', 30],
    ['19m + 47%', 27.93],
    ['250 zł / 4', 62.5],
    ['2 kg na lb', 4.409245243697551],   // „na" = konwersja, NIE dzielenie
    ['5 km + 300 m', 5.3],
    ['100 zł + 23% vat', 123],
    ['2+2', 4],
    // wynik zegarowy ma value null, a odpowiedź w text — porównujemy tekstem
    ['17:00 + 3h', '20:00'],
    ['55h in workdays', undefined],       // czas roboczy — tylko „nie znikło"
];

for (const [expr, want] of UNCHANGED) {
    const r = val(expr);
    if (isEmpty(r)) {
        fail++; fails.push(`${expr} — PRZESTAŁO działać (warstwa coś zepsuła)`);
    } else if (want === undefined) {
        pass++;
    } else if (typeof want === 'string') {
        if (String(r.text).trim() !== want) {
            fail++; fails.push(`${expr} — było "${want}", jest "${r.text}" (warstwa przejęła)`);
        } else pass++;
    } else if (!near(r.value, want, 1e-6)) {
        fail++; fails.push(`${expr} — było ${want}, jest ${r.value} (warstwa przejęła)`);
    } else {
        pass++;
    }
}

// ── 3. NIE ZGADUJE — ma dalej milczeć ────────────────────────────────────────
const SILENT = [
    'ile miesięcy do 25.12',  // miesiąc nie jest przeliczalną jednostką czasu —
                              // odpowiedź „87 dni" byłaby odpowiedzią na INNE pytanie
    'podziel na 4',           // nie ma czego dzielić
    'średnia',                // nie ma z czego liczyć
    'ile godzin od 8:00',     // brak końca zakresu
    'suma 2 4 6',             // suma to NOWA funkcja, nie synonim — świadomie poza zakresem
];

for (const expr of SILENT) {
    const r = val(expr);
    if (!isEmpty(r)) {
        fail++; fails.push(`${expr} — miało milczeć, zwróciło ${r.value != null ? r.value : r.text}`);
    } else {
        pass++;
    }
}

// ── 4. Reguły są zakotwiczone (^…$) — inaczej łapią fragment czegoś innego ──
const SYN = global.window.MATM0_SYN;
if (!SYN || !Array.isArray(SYN.RULES)) {
    fail++; fails.push('brak window.MATM0_SYN.RULES');
} else {
    for (const rule of SYN.RULES) {
        const src = rule.re.source;
        if (!src.startsWith('^') || !src.endsWith('$')) {
            fail++; fails.push(`reguła "${rule.id}" nie jest zakotwiczona (^…$)`);
        } else {
            pass++;
        }
    }
}

console.log('');
if (fail) {
    console.error('=== SYNONIMY: ' + pass + '/' + (pass + fail) + ' PASS ===');
    for (const f of fails) console.error('  ✗ ' + f);
    process.exit(1);
}
console.log('  ✓ synonimy (działa / nie ukradła / nie zgaduje): ' + pass + '/' + pass + ' PASS');
process.exit(0);
