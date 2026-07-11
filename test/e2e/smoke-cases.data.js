// [EN] Curated UI smoke — wartości jak runCalcSmokeTests (silnik), sprawdzane też w DOM
module.exports = {
    standard: [
        { expr: '2+2', value: 4 },
        { expr: '100+10%', value: 110, tol: 1e-6 },
        { expr: '537 + 12%', value: 601.44, tol: 1e-6 },
        { expr: '100 + 10% + 10%', value: 121, tol: 1e-6 },
        { expr: 'brutto 1000', value: 1230 },
        { expr: 'netto 1230', value: 1000 },
        { expr: '8,5% to 20, ile 100%', value: 20 * 100 / 8.5, tol: 1e-4 },
        { expr: 'ile % stanowi 25 z 200', value: 12.5, tol: 1e-6 },
        { expr: '2 cm + 5 mm', value: 2.5 },
        { expr: '90 min na h', value: 1.5 },
        { expr: '20 C na F', value: 68 },
        { expr: '2 GB na MB', value: 2048 },
        { expr: '9999999999999×9', value: 89999999999991 },
    ],
    weird: [
        { expr: '', expectResultText: '0' },
        { expr: '()', noNumeric: true },
        { expr: '1/0', allowInfinity: true },
        { expr: '2 kg + 3 cm', noNumeric: true },
        { expr: '((((9))))', value: 9 },
        { expr: '0.1+0.2', value: 0.3, tol: 1e-9 },
        { expr: '1e309', noNumeric: true },
        { expr: '---', noNumeric: true },
        { expr: '100%', value: 1, tol: 1e-9 },
    ],
    keypadChains: [
        { taps: ['1', '0', '0', '+', '1', '0', '%'], expectValue: 110 },
        { taps: ['9', '9', '9', '×', '9'], expectValue: 8991 },
        { taps: ['1', '.', '5', '+', '2', '.', '5'], expectValue: 4 },
    ],
};
