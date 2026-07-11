// ============================================================
//  GENERATOR „złotego snapshotu" — spisuje, jak silnik (evalCalcExpression)
//  liczy TERAZ, dla szerokiej, STABILNEJ listy wyrażeń. Wynik → test/baseline-snapshot.json.
//
//  Po co: siatka bezpieczeństwa pod przebudowę silnika (KROK 3). Najpierw uruchom TEN
//  generator (zapisze stan obecny), potem `node test/baseline.js` pilnuje, że nic się
//  nie zmieniło. Gdy ZMIANA jest CELOWA — przejrzyj diff i wygeneruj snapshot na nowo.
//
//  Uruchom:  node test/baseline-gen.js
//  Determinizm: stubujemy kursy FX; pomijamy wyrażenia zależne od „dziś" (tylko daty
//  absolutne). Zrzucamy logiczne pola makeVal (value/unit/text/kind/exact/big/bigStr).
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const { api } = require('./_bootstrap');

// ── Determinizm: stub kursów (jak w smoke), domyślne ustawienia z atrapy localStorage ──
api.state.fx.rates = { PLN: 1, EUR: 4.30, USD: 3.95, GBP: 5.00, CHF: 4.50 };
api.state.fx.ts = Date.now();
api.state.fx.source = 'merge';

// Lista STABILNYCH wyrażeń (bez „za 3 dni"/„jutro" — zależą od daty bieżącej).
const EXPRESSIONS = [
    // — podstawy / liczby —
    '2+2', '2 + 2 * 3', '(2+3)*4', '10/4', '1/3', '0,1 + 0,2', '-5 + 3', '2^10',
    '10 % 3', 'sqrt(16)', '2*pi', 'abs(-7)',
    // — duże liczby (BigInt) —
    '99999999999999999+1', '123456789012345678+876543210987654322', '10000000000000000-9999999999999999',
    // — procenty —
    '537 + 12%', '3*160 + 12%', '100 + 10% + 10%', '200 + 10% + 10%', '100 + 20 + 10%',
    '100*50%', '100/50%', '12%*100', '20% z 100', '89% z 6%', '81%*6%', '100 - 23%',
    // — „ile %" (kierunek odwrotny) —
    'ile % stanowi 25 z 200', '25 z 200 to ile %', '25 to ile % z 200', 'ile % stanowi 50 z 50',
    // — koszt trasy / paliwo (deterministyczne) —
    'koszt trasy 300 km 7 l/100km 6,50 zł/l', 'paliwo na 100 km 8 l/100 7 zł/l',
    // — jednostki: sumy / konwersje —
    '5 km + 300 m', '2 cm + 5 mm', '5 km na mile', '6 cali na mm', '2 kg + 300 g',
    '5 funtow na kg', '90 min na h', '2 h + 30 min', '300 s na min', '1.5 l na ml',
    '2 ha na m2', '180 deg na rad', '2 GB na MB', "5' + 6\"",
    // — jednostki: KOMPOZYCJA WYMIARÓW (tu były wątpliwości — patrz feedback Mateusza) —
    '10 km / 2 km', '5 km * 2 km', '10 m / 5 m', '6 km / 2', '100 / 4 km', '2 kg * 3', '12 km - 12 km',
    // — prędkość —
    '100 km/h na m/s', '10 m/s na km/h', '36 km/h', '60 mph na km/h', '10 knots na km/h',
    // — temperatura —
    '20 C na F', '100 C na K', '32 F na C',
    // — waluty (kursy stubowane) —
    '12 zł + 20 eur', '20 eur na zł', '100 zł na eur', '100 usd na eur', '20% z 100 zł',
    '12pln - vat', 'brutto 12 zł', 'netto 1230 zł', '1000 zł + vat', 'połowa 100 zł',
    // — zegar —
    '17:00 + 3h', '17:00 + 90 min', '9:30 + 1h30', '23:00 + 3h', '08:15 - 45 min',
    'od 9:30 do 17:15', 'od 22:00 do 6:00', '17:00 - 9:30', '12:30 + 300s', '15:00 + 30s',
    // — daty (ABSOLUTNE, stabilne) —
    'ile dni od 1.01.2026 do 1.02.2026', '1.09.2026 + 2 tyg', '1.01.2026 + 90 dni',
    '10 dni temu w odniesieniu? ', // celowo „śmieciowe" — sprawdza brak wyjątku
];

const snapshot = EXPRESSIONS.map(function (expr) {
    var rec = { expr: expr };
    try {
        var r = api.evalCalcExpression(expr) || {};
        rec.value = (r.value === undefined ? null : r.value);
        rec.unit = (r.unit === undefined ? null : r.unit);
        rec.text = (r.text === undefined ? null : r.text);
        rec.kind = (r.kind === undefined ? null : r.kind);
        rec.exact = (r.exact === undefined ? null : r.exact);
        rec.big = !!r.big;
        rec.bigStr = (r.bigStr === undefined ? null : r.bigStr);
    } catch (e) {
        rec.error = (e && e.message) || String(e);
    }
    return rec;
});

const outPath = path.join(__dirname, 'baseline-snapshot.json');
fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
console.log('✓ Zapisano baseline: ' + snapshot.length + ' wyrażeń → ' + path.relative(path.join(__dirname, '..'), outPath));
process.exit(0); // atrapa fetch trzyma event-loop (jak w smoke-node) → kończymy jawnie
