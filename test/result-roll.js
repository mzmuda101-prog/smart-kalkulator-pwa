// [EN] Toczenie cyfr wyniku (_rollSeq/_flowOps w app.js): kolumna mijanych cyfr, parowanie cyfr i kierunek.
const assert = require('assert');
const { api } = require('./_bootstrap');
const eq = (a, b) => assert.deepStrictEqual(a, b);
eq(api.rollSeq(1, 6, 1), [1, 2, 3, 4, 5]);          // w górę: nad cyfrą docelową, od startowej
eq(api.rollSeq(7, 3, 1), [7, 8, 9, 0, 1, 2]);       // zawinięcie 9→0 przy wzroście
eq(api.rollSeq(7, 3, -1), [4, 5, 6, 7]);            // w dół: pod cyfrą docelową, rosnąco
eq(api.rollSeq(2, 8, -1), [9, 0, 1, 2]);            // zawinięcie 0→9 przy spadku
const f = (p, n) => api.flowOps(p, n);
eq(f('17', '69'), { ops: [1, 7], dir: 1, ghosts: [] });
eq(f('69', '17').dir, -1);
eq(f('−5', '−7').dir, -1);                          // ujemna: większa cyfra = mniejsza wartość
eq(f('1 234,50 zł', '1 234,90 zł').ops, ['keep', 'keep', 'keep', 'keep', 'keep', 5, 'keep', 'keep', 'keep']);
// zmiana długości: całkowite od prawej, nowa cyfra wjeżdża (999 → 1 000)
eq(f('999', '1 000'), { ops: ['new', 9, 9, 9], dir: 1, ghosts: [] });
// w drugą stronę: „1” z przodu gaśnie (duch przed pierwszą cyfrą)
eq(f('1 000', '999').ghosts, [{ at: 0, text: '1', side: 'lead' }]);
eq(f('1 000', '999').dir, -1);
// po przecinku: nadmiarowe końcowe cyfry gasną za ostatnią
eq(f('2,375', '2,4').ghosts, [{ at: 3, text: '75', side: 'trail' }]);
eq(f('864 192', '9 629 568').ops, ['new', 8, 6, 4, 1, 9, 2]);
// spacje i łamanie wiersza nie zmieniają parowania
eq(f('12 345 678', '12 345\n679').ops.slice(-1), [8]);
// całkowite od prawej, po przecinku od lewej: 12,5 → 123,45
eq(f('12,5', '123,45').ops, ['new', 1, 2, 'keep', 5, 'new']); // 4 i 5: wyrównanie od przecinka
// data: dzień się toczy, inny dzień tygodnia wjeżdża od pierwszej różnej litery
const d = f('13.11.2026 (piątek)', '16.11.2026 (poniedziałek)');
eq(d.ops.slice(0, 2), ['keep', 3]);
eq(d.dir, 1);
eq(d.ops.slice(10, 13), ['keep', 'keep', 'new']);  // „(p” zostaje, „oniedziałek)” wjeżdża
// inny układ (kreska → data, zmiana znaku) → zwykłe pojawianie
eq(f('—', '13.11.2026 (piątek)'), null);
eq(f('5', '−5'), null);
console.log('✓ result-roll: 19/19 PASS');
process.exit(0); // _bootstrap zostawia timery aplikacji — bez tego proces wisi
