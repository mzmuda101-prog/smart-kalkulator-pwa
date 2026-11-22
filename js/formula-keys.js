// @ts-check
(function () {
    'use strict';
    // Klawiatura „Wzory” (plan 2026-11-22, etap 2b): dane klawiszy, warianty pod przytrzymaniem, znaczki w rogach
    // i tekst do wstawienia. Bez DOM — rysuje i obsługuje app.js, testuje test/formula-keys.js.
    //
    // Klawisz: { label, act } — akcja zwykłego kalkulatora (cyfry, AC, ⌫, =, ( ), działania)
    //          { label, ins }  — tekst do wstawienia; fresh: po „=” zaczyna nowe działanie (jak cyfra)
    //          { label, page } — przełącza kartę; { label, smart: 'frac' } — ułamek (niżej)
    //          alts: warianty pod przytrzymaniem; cls: grupa wyglądu (fn/number/operator/equals/clear/word)

    /** @typedef {{ label: string, ins?: string, act?: string, page?: string, smart?: string, fresh?: boolean,
     *   cls?: string, aria?: string, alts?: Array<{label: string, ins?: string, act?: string, fresh?: boolean, aria?: string}> }} Key */

    const D = (/** @type {string} */ d) => ({ label: d, act: d, cls: 'number' });
    const LIM = { label: 'lim', ins: 'lim n→∞ ', fresh: true, cls: 'fn', aria: 'granica n do nieskończoności',
        alts: [{ label: 'lim x→0', ins: 'lim x→0 ', fresh: true }, { label: 'lim x→0⁺', ins: 'lim x→0+ ', fresh: true, aria: 'granica prawostronna w zerze' },
            { label: 'lim x→0⁻', ins: 'lim x→0- ', fresh: true, aria: 'granica lewostronna w zerze' }, { label: 'lim x→∞', ins: 'lim x→∞ ', fresh: true },
            { label: 'lim x→a', ins: 'lim x→', fresh: true, aria: 'granica w punkcie — wpisz punkt' }] };

    /** @type {Record<string, Key[]>} 6 kolumn × 5 rzędów */
    const PAGES = {
        wzory: [
            LIM,
            { label: '∞', ins: '∞', cls: 'fn', aria: 'nieskończoność', alts: [{ label: '−∞', ins: '-∞', aria: 'minus nieskończoność' }] },
            { label: '( )', act: '()', cls: 'fn', aria: 'nawias', alts: [{ label: '|x|', ins: 'abs(', fresh: true, aria: 'wartość bezwzględna' }] },
            { label: 'f(x)', page: 'funkcje', cls: 'fn', aria: 'funkcje: sinus, logarytm, pochodna i inne' },
            { label: '⌫', act: '⌫', cls: 'fn', aria: 'usuń znak' },
            { label: 'AC', act: 'AC', cls: 'fn clear', aria: 'wyczyść' },

            { label: 'a/b', smart: 'frac', cls: 'operator', aria: 'ułamek — zamyka licznik, otwiera mianownik' },
            { label: '√', ins: 'sqrt(', fresh: true, cls: 'operator', aria: 'pierwiastek',
                alts: [{ label: '∛', ins: '∛(', fresh: true, aria: 'pierwiastek trzeciego stopnia' }, { label: '∜', ins: '∜(', fresh: true, aria: 'pierwiastek czwartego stopnia' }] },
            D('7'), D('8'), D('9'),
            { label: '÷', act: '÷', cls: 'operator', aria: 'dzielenie', alts: [{ label: 'mod', ins: ' mod ', aria: 'reszta z dzielenia' }] },

            { label: 'xⁿ', ins: '^(', cls: 'operator', aria: 'potęga',
                alts: [{ label: 'x³', ins: '^3', aria: 'do sześcianu' }, { label: 'x⁻¹', ins: '^(-1)', aria: 'odwrotność' }, { label: 'eˣ', ins: 'e^(', fresh: true, aria: 'e do potęgi' }] },
            { label: 'x²', ins: '^2', cls: 'operator', aria: 'do kwadratu' },
            D('4'), D('5'), D('6'),
            { label: '×', act: '×', cls: 'operator', aria: 'mnożenie', alts: [{ label: 'n!', ins: '!', aria: 'silnia' }] },

            { label: 'x', ins: 'x', fresh: true, cls: 'fn', alts: [{ label: 'y', ins: 'y', fresh: true }, { label: 't', ins: 't', fresh: true }] },
            { label: 'n', ins: 'n', fresh: true, cls: 'fn', alts: [{ label: 'k', ins: 'k', fresh: true }, { label: 'm', ins: 'm', fresh: true }] },
            D('1'), D('2'), D('3'),
            { label: '−', act: '−', cls: 'operator', aria: 'minus' },

            { label: 'e', ins: 'e', fresh: true, cls: 'fn', aria: 'liczba e' },
            { label: 'π', ins: 'π', fresh: true, cls: 'fn', aria: 'pi' },
            D('0'),
            { label: '.', act: '.', cls: 'number', aria: 'przecinek' },
            { label: '=', act: '=', cls: 'equals', aria: 'wynik' },
            { label: '+', act: '+', cls: 'operator', aria: 'plus' },
        ],
        // karta „Funkcje”: każdy znak i funkcja spod przytrzymania jest też tu (odkrywalność, czytnik ekranu);
        // wyjątki: inne litery zmiennych (y, t, k, m) i warianty „lim” — da się je dopisać zwykłym pisaniem
        funkcje: [
            { label: 'sin', ins: 'sin(', fresh: true, cls: 'word' }, { label: 'cos', ins: 'cos(', fresh: true, cls: 'word' },
            { label: 'tg', ins: 'tg(', fresh: true, cls: 'word' }, { label: 'ctg', ins: 'ctg(', fresh: true, cls: 'word' },
            { label: '⌫', act: '⌫', cls: 'fn', aria: 'usuń znak' }, { label: 'AC', act: 'AC', cls: 'fn clear', aria: 'wyczyść' },

            { label: 'arcsin', ins: 'arcsin(', fresh: true, cls: 'word' }, { label: 'arccos', ins: 'arccos(', fresh: true, cls: 'word' },
            { label: 'arctg', ins: 'arctg(', fresh: true, cls: 'word' }, { label: 'ln', ins: 'ln(', fresh: true, cls: 'word' },
            { label: 'log', ins: 'log(', fresh: true, cls: 'word', aria: 'logarytm dziesiętny' }, { label: 'log₂', ins: 'log_2(', fresh: true, cls: 'word', aria: 'logarytm o podstawie 2' },

            { label: '|x|', ins: 'abs(', fresh: true, cls: 'fn', aria: 'wartość bezwzględna' }, { label: 'n!', ins: '!', cls: 'fn', aria: 'silnia' },
            { label: '∛', ins: '∛(', fresh: true, cls: 'fn', aria: 'pierwiastek trzeciego stopnia' }, { label: '∜', ins: '∜(', fresh: true, cls: 'fn', aria: 'pierwiastek czwartego stopnia' },
            { label: 'mod', ins: ' mod ', cls: 'word', aria: 'reszta z dzielenia' }, { label: '−∞', ins: '-∞', cls: 'fn', aria: 'minus nieskończoność' },

            { label: 'f′', ins: 'pochodna ', fresh: true, cls: 'fn', aria: 'pochodna' }, { label: '∫', ins: 'całka ', fresh: true, cls: 'fn', aria: 'całka' },
            { label: 'x=?', ins: 'rozwiąż ', fresh: true, cls: 'word', aria: 'rozwiąż równanie' }, { label: 'a=b', ins: '=', cls: 'word', aria: 'znak równania' },
            { label: 'dx', ins: ' dx', cls: 'word', aria: 'd x na końcu całki' }, { label: '→', ins: '→', cls: 'fn', aria: 'strzałka granicy' },

            { label: '123', page: 'wzory', cls: 'fn', aria: 'wróć do klawiatury wzorów' },
            { label: 'x³', ins: '^3', cls: 'operator', aria: 'do sześcianu' },
            { label: 'x⁻¹', ins: '^(-1)', cls: 'operator', aria: 'odwrotność' }, { label: 'eˣ', ins: 'e^(', fresh: true, cls: 'operator', aria: 'e do potęgi' },
            { label: '( )', act: '()', cls: 'fn', aria: 'nawias' }, { label: '=', act: '=', cls: 'equals', aria: 'wynik' },
        ],
    };

    /** Znaczki w górnych rogach: 1 wariant → prawy róg; 2 krótkie → lewy i prawy; więcej albo długie → „⋯”.
     * @param {Key} key @returns {{ tl?: string, tr?: string }} */
    function cornerHint(key) {
        const a = key.alts || [];
        if (!a.length) return {};
        if (a.length === 1 && a[0].label.length <= 3) return { tr: a[0].label };
        if (a.length === 2 && a.every((x) => x.label.length <= 2)) return { tl: a[0].label, tr: a[1].label };
        return { tr: '⋯' };
    }

    /** Tekst do wstawienia przed kursorem. Ułamek: jest otwarty nawias → „)/(” (licznik zamknięty), inaczej „/(”.
     * @param {Key | NonNullable<Key['alts']>[number]} key @param {string} before tekst przed kursorem @returns {string} */
    function insertText(key, before) {
        if (/** @type {Key} */ (key).smart === 'frac') {
            const open = (before.match(/\(/g) || []).length - (before.match(/\)/g) || []).length;
            return open > 0 ? ')/(' : '/(';
        }
        return key.ins || '';
    }

    const API = { PAGES: PAGES, cornerHint: cornerHint, insertText: insertText };
    /** @type {any} */ (typeof window !== 'undefined' ? window : globalThis).MATM0_FKEYS = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
