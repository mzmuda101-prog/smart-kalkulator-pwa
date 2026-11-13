// [EN] Toczenie cyfr wyniku (_rollSeq/_rollTrend w app.js): kolumna mijanych cyfr i kierunek.
const assert = require('assert');
const { api } = require('./_bootstrap');
const eq = (a, b) => assert.deepStrictEqual(a, b);
eq(api.rollSeq(1, 6, 1), [1, 2, 3, 4, 5]);          // w górę: nad cyfrą docelową, od startowej
eq(api.rollSeq(7, 3, 1), [7, 8, 9, 0, 1, 2]);       // zawinięcie 9→0 przy wzroście
eq(api.rollSeq(7, 3, -1), [4, 5, 6, 7]);            // w dół: pod cyfrą docelową, rosnąco
eq(api.rollSeq(2, 8, -1), [9, 0, 1, 2]);            // zawinięcie 0→9 przy spadku
eq(api.rollTrend('17', '69'), 1);
eq(api.rollTrend('69', '17'), -1);
eq(api.rollTrend('−5', '−7'), -1);                  // ujemna: większa cyfra = mniejsza wartość
eq(api.rollTrend('1 234,50 zł', '1 234,90 zł'), 1);
console.log('✓ result-roll: 8/8 PASS');
process.exit(0); // _bootstrap zostawia timery aplikacji — bez tego proces wisi
