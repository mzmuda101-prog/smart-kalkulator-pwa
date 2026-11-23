// Podręcznik: spis działów, hasła w dziale, wyszukiwanie (js/handbook.js).
// Uruchom: node test/handbook.js
'use strict';
const path = require('path');
const root = path.join(__dirname, '..');
globalThis.MATM0_PL_FOLD = require(path.join(root, 'js', 'pl-fold.js'));
const { FORMULAS } = require(path.join(root, 'js', 'step-formulas.js'));
const H = require(path.join(root, 'js', 'handbook.js'));

let pass = 0, fail = 0;
function ok(name, cond, got) {
    if (cond) { pass++; return; }
    fail++;
    console.log('  ✗', name, got === undefined ? '' : '→ ' + JSON.stringify(got));
}
const ids = (/** @type {{id: string}[]} */ list) => list.map(x => x.id);

const ch = H.chapters();
ok('spis: bez pustych działów', ch.every(c => c.count > 0), ch);
ok('spis: suma haseł = liczba wpisów', ch.reduce((s, c) => s + c.count, 0) === Object.keys(FORMULAS).length, ch);
ok('spis: kolejność jak w szkole (liczby/wyrażenia przed granicami)', ch.findIndex(c => c.id === 'wyrazenia') < ch.findIndex(c => c.id === 'granice'), ids(ch));
ok('dział: hasła z tego działu', H.entries('rownania').every(x => x.entry.dzial === 'rownania') && ids(H.entries('rownania')).includes('delta'), ids(H.entries('rownania')));
ok('dział: nieznany → pusto', H.entries('nie-ma').length === 0);

ok('szukaj: delta na pierwszym miejscu', ids(H.search('delta'))[0] === 'delta', ids(H.search('delta')));
ok('szukaj: wielkie litery', ids(H.search('DELTA')).includes('delta'), ids(H.search('DELTA')));
ok('szukaj: bez polskich znaków (słowo kluczowe)', ids(H.search('wyroznik')).includes('delta'), ids(H.search('wyroznik')));
ok('szukaj: kilka słów', ids(H.search('pochodna iloczynu'))[0] === 'pochodna-iloczynu', ids(H.search('pochodna iloczynu')));
// „Sinus do kwadratu” (nazwa) stoi w pliku po „sinu” (tylko słowo kluczowe), a ma być pierwsze
ok('szukaj: nazwa przed słowem kluczowym', ids(H.search('sinus'))[0] === 'sin-kwadrat' && ids(H.search('sinus')).includes('sinu'), ids(H.search('sinus')));
ok('szukaj: wynik ma nazwę działu', H.search('delta')[0].chapter === 'Równania i nierówności', H.search('delta')[0]);
ok('szukaj: puste → []', H.search('').length === 0 && H.search('   ').length === 0);
ok('szukaj: brak trafień → []', H.search('zzzz').length === 0);

ok('get: hasło z działem', H.get('delta') && H.get('delta').chapter === 'Równania i nierówności', H.get('delta'));
ok('get: nieznane → null', H.get('nie-ma') === null);

console.log(`handbook: ${pass} ok, ${fail} błędów`);
process.exit(fail ? 1 : 0);
