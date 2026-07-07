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

console.log('  ' + (fail ? '✗' : '✓') + ' hint-rules: ' + pass + '/' + (pass + fail) + ' PASS');
process.exit(fail ? 1 : 0);
