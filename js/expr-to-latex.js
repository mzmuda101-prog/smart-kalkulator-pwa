// @ts-check
(function () {
    'use strict';
    // Zapis pola kalkulatora → LaTeX do rysunku wzoru (spec 5.9, etap 1).
    // Rysujemy z DRZEWA PARSERA (math-steps), więc rysunek pokazuje prawdziwą kolejność działań:
    // „1/2n” wyjdzie jako ułamek, który parser naprawdę liczy. Zwraca string albo null (nie rysujemy).
    const g = /** @type {any} */ (typeof window !== 'undefined' ? window : globalThis);
    /** @type {any} */ let S = g.MATM0_STEPS, L = g.MATM0_LIMITS, D = g.MATM0_CALC;
    if (typeof module !== 'undefined' && module.exports && !S) {
        S = require('./math-steps.js'); D = require('./math-calculus.js'); L = require('./math-limits.js');
    }

    const FN = { sin: '\\sin', cos: '\\cos', tan: '\\tan', cot: '\\cot', ln: '\\ln', log: '\\log', exp: '\\exp',
        asin: '\\arcsin', acos: '\\arccos', atan: '\\arctan' };
    // siła wiązania: wyższa = mocniej; nawias, gdy dziecko wiąże słabiej niż wymaga rodzic
    const PREC = { add: 1, sub: 1, neg: 2, mul: 3, div: 4, pow: 5 };
    const prec = (/** @type {any} */ n) => PREC[/** @type {'add'} */ (n.k)] || 9;
    const big = (/** @type {string} */ s) => '\\left(' + s + '\\right)';

    /** @param {{n: bigint, d: bigint}} r @param {boolean} [dec] */
    function num(r, dec) {
        if (r.d === 1n) return String(r.n);
        if (dec) { // ułamek dziesiętny wpisany przez użytkownika: 2,5 zostaje 2,5
            const x = Number(r.n) / Number(r.d);
            return String(x).replace('.', '{,}');
        }
        return '\\frac{' + r.n + '}{' + r.d + '}';
    }

    /** @param {any} n @param {number} [need] najmniejsza siła wiązania bez nawiasu */
    function tex(n, need = 0) {
        const s = node(n);
        return prec(n) < need ? big(s) : s;
    }

    /** @param {any} n @returns {string} */
    function node(n) {
        switch (n.k) {
            case 'num': return num(n.v, n.dec);
            case 'var': return n.v;
            case 'const': return n.v === 'pi' ? '\\pi' : 'e';
            case 'add': return tex(n.a, 1) + '+' + tex(n.b, 1);
            case 'sub': return tex(n.a, 1) + '-' + tex(n.b, 2);
            case 'neg': return '-' + tex(n.a, 3);
            case 'mul': {
                const a = tex(n.a, 3), b = tex(n.b, 3);
                // 2n, n√x — bez kropki; liczba po czymś (n·2) i dwie liczby — z kropką
                return n.implicit && !/^\d/.test(b) ? a + (/[a-zA-Z]$/.test(a) && /^[a-zA-Z]/.test(b) ? ' ' : '') + b : a + '\\cdot ' + b;
            }
            case 'div': return '\\frac{' + node(n.a) + '}{' + node(n.b) + '}';
            case 'sqrt': return '\\sqrt{' + node(n.a) + '}';
            case 'pow': {
                const e = n.b;
                // ∛u, ∜u (parser: u^(1/n)) — rysujemy jako pierwiastek, jak na kartce
                if (e.k === 'num' && e.v.n === 1n && e.v.d > 1n && e.v.d <= 9n && !e.dec)
                    return e.v.d === 2n ? '\\sqrt{' + node(n.a) + '}' : '\\sqrt[' + e.v.d + ']{' + node(n.a) + '}';
                const base = n.a.k === 'fn' ? fnTex(n.a, '^{' + node(e) + '}') : tex(n.a, 6);
                return n.a.k === 'fn' ? base : base + '^{' + node(e) + '}';
            }
            case 'fn': return fnTex(n, '');
            default: throw new Error('nieznany węzeł ' + n.k);
        }
    }
    /** sin x, sin²(x), log₂(8n+1) @param {any} n @param {string} sup */
    function fnTex(n, sup) {
        const name = n.f === 'logb' ? '\\log_{' + n.base + '}' : FN[/** @type {'sin'} */ (n.f)] || '\\operatorname{' + n.f + '}';
        const a = n.a, simple = a.k === 'var' || a.k === 'num' || a.k === 'const';
        return name + sup + (simple && !a.paren ? ' ' + node(a) : big(node(a)));
    }

    /** @param {any} t cel granicy z math-limits */
    function target(t) {
        if (t.at === 'inf') return '\\infty';
        if (t.at === '-inf') return '-\\infty';
        return String(t.src != null ? t.src : t.at).replace('.', '{,}') + (t.side > 0 ? '^{+}' : t.side < 0 ? '^{-}' : '');
    }
    const body = (/** @type {string} */ src) => node(S._core.parse(src));
    // ciało granicy/całki: suma bez nawiasu czytałaby się jak „(lim A) − B”
    const whole = (/** @type {string} */ src) => tex(S._core.parse(src), 3);
    // coś więcej niż prosta arytmetyka: dopiero wtedy rysunek coś daje
    const shaped = (/** @type {any} */ n) => !!n && typeof n === 'object' &&
        (['div', 'pow', 'sqrt', 'fn'].indexOf(n.k) >= 0 || shaped(n.a) || shaped(n.b));

    /** @param {string} raw zapis z pola @returns {string|null} */
    function exprToLatex(raw) {
        if (!S || !raw || !String(raw).trim()) return null;
        try {
            const l = L && L.detect(raw);
            if (l) return '\\lim_{' + l.v + '\\to ' + target(l.target) + '}' + whole(l.src);
            const c = D && D.detect(raw);
            if (c && c.kind === 'd') return '\\left(' + body(c.src) + '\\right)^{\\prime}';
            if (c && c.kind === 'i') {
                const v = c.v || 'x', lim = c.from != null ? '_{' + body(c.from) + '}^{' + body(c.to) + '}' : '';
                return '\\int' + lim + ' ' + whole(c.src) + '\\,d' + v;
            }
            const ast = S._core.parse(raw); // zwykłe działanie: tylko gdy ma kształt (ułamek, potęga, pierwiastek, funkcja)
            return shaped(ast) ? node(ast) : null;
        } catch { return null; } // nie parsuje się (jednostki, pieniądze, tekst) — bez rysunku
    }

    const API = { exprToLatex: exprToLatex };
    g.MATM0_TEX = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
