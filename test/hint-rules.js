// T4-17 / T4-19 — unit tests dla js/hint-rules.js
'use strict';
const path = require('path');
global.window = global.window || {};
require(path.join(__dirname, '..', 'js', 'hint-rules.js'));
const H = global.window.MATM0_HINT;

let pass = 0, fail = 0;
function ok(name, cond) {
    if (cond) { pass++; }
    else { fail++; console.log('  ✗', name); }
}

var hints = H.getLiveHints('dziś');
ok('dziś → + 90 dni', hints.some(function (c) { return (c.label || c).indexOf('90 dni') >= 0; }));
ok('ile dni → do 1.09', H.getLiveHints('ile dni').some(function (c) { return (c.label || c).indexOf('1.09') >= 0; }));
ok('fuzzy czas w tokjo', H.fuzzySuggest('czas w tokjo') === 'czas w Tokio');
ok('fuzzy brak dla 12', H.fuzzySuggest('12') === null);

// --- Warstwa A: „przestań być głupi" (2026-09-09) ---
// 1) Nie dopasowuj niepowiązanych szablonów po znakach: "100 + 23" ≠ "17:00 + 3h".
ok('A: 100 + 23 nie proponuje 17:00 + 3h', H.fuzzySuggest('100 + 23') === null);
// 2) Nigdy nie podsuwaj cudzych liczb — trzymaj liczby użytkownika.
ok('A: podstawia liczby usera (2 kg + 300 → 2 kg + 300 g)', H.fuzzySuggest('2 kg + 300') === '2 kg + 300 g');
ok('A: 250 zl + 40 eur zachowuje 250/40', H.fuzzySuggest('250 zl + 40 eur') === '250 zl + 40 eur' ? false : (function () {
    var s = H.fuzzySuggest('250 zl + 40 eur');
    return s == null || (s.indexOf('250') >= 0 && s.indexOf('40') >= 0 && s.indexOf('100') < 0 && s.indexOf('20 eur') < 0);
})());
// 3) Nie proponuj dokładnie tego, co user już wpisał.
ok('A: nie proponuje identycznego (2+2)', H.fuzzySuggest('2+2') === null);
// 4) matchIntent zwraca kształt pod Warstwę B (confidence + numbers + kind).
var mi = H.matchIntent('czas w tokjo');
ok('A: matchIntent kind=typo dla korekty słowa', mi && mi.kind === 'typo' && typeof mi.confidence === 'number' && mi.confidence > 0);
var mi2 = H.matchIntent('2 kg + 300');
ok('A: matchIntent kind=template + numbers', mi2 && mi2.kind === 'template' && mi2.numbers.join(',') === '2,300');
// 5) Szkielet rozróżnia kształty liczbowe.
ok('A: skeleton 17:00 + 3h', H.skeleton('17:00 + 3h') === '#:# + #h');
ok('A: skeleton 100 + 23', H.skeleton('100 + 23') === '# + #');

// --- Warstwa B / B3: normalizacja swobodnego zdania → kandydat wyrażenia (2026-09-09) ---
ok('B3: ile to 5 plus 5 → 5 + 5', H.normalizeIntent('ile to 5 plus 5') === '5 + 5');
ok('B3: ile wynosi 5+5 → 5 + 5', H.normalizeIntent('ile wynosi 5+5') === '5 + 5');
ok('B3: policz 2+2 → 2 + 2', H.normalizeIntent('policz 2+2') === '2 + 2');
ok('B3: trailing ? / =', H.normalizeIntent('2+2?') === '2 + 2' && H.normalizeIntent('5 plus 5 =') === '5 + 5');
ok('B3: 100 dodać 23 (pl-litera) → 100 + 23', H.normalizeIntent('100 dodać 23') === '100 + 23');
ok('B3: 10 odjąć 4 → 10 - 4', H.normalizeIntent('10 odjąć 4') === '10 - 4');
ok('B3: 5 pomnożyć przez 3 → 5 * 3', H.normalizeIntent('5 pomnożyć przez 3') === '5 * 3');
ok('B3: 5 razy 3 → 5 * 3', H.normalizeIntent('5 razy 3') === '5 * 3');
ok('B3: 20 podzielić przez 4 → 20 / 4', H.normalizeIntent('20 podzielić przez 4') === '20 / 4');
ok('B3: EN what is 5 times 3 → 5 * 3', H.normalizeIntent('what is 5 times 3') === '5 * 3');
ok('B3: nie rusza gdy brak zmian (100 + 23)', H.normalizeIntent('100 + 23') === null);
ok('B3: nie łapie „przez" w środku słowa (przezrocze)', H.normalizeIntent('przezrocze 5') === null);
ok('B3: pusty/tekstowy → null', H.normalizeIntent('') === null && H.normalizeIntent('zwykły tekst') === null);

console.log('  ' + (fail ? '✗' : '✓') + ' hint-rules: ' + pass + '/' + (pass + fail) + ' PASS');
process.exit(fail ? 1 : 0);
