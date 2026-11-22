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
            // a + (−b), a − (−b): minus po plusie/minusie zawsze w nawiasie, jak na kartce
            case 'add': return tex(n.a, 1) + '+' + (n.b.k === 'neg' ? big(node(n.b)) : tex(n.b, 1));
            case 'sub': return tex(n.a, 1) + '-' + (n.b.k === 'neg' ? big(node(n.b)) : tex(n.b, 2));
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

    // ── Kroki rozwiązania jak na kartce (spec 5.12) ───────────────────────────────
    // Kroki budują tekst z drzewa (C.show, limHead), który parser czyta z powrotem — więc rysujemy
    // z tego samego drzewa: każdy kawałek między „ = ”, „ → ”, „, ” idzie przez parse → node.
    // Kawałek, którego parser nie zna (słowa, „brak rozwiązań”), zostaje tekstem.
    // ⟦…⟧ = fragment, w którym działa wzór (step.formula) — rysowany podkreślony, do stuknięcia.
    const SEPS = [[', więc ', ',\\ \\text{więc}\\ '], [' lub ', '\\quad\\text{lub}\\quad '], [':  ', ':\\quad '],
        [': ', ':\\quad '], [',  ', ',\\quad '], [', ', ',\\ '], [' = ', '='], [' ≈ ', '\\approx '], [' < ', '<'], [' > ', '>'], [' → ', '\\to '],
        [' ✓', '\\ \\checkmark']];
    const OPEN = '([⟦', CLOSE = ')]⟧';
    const SUBS = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', 'ₙ': 'n', 'ₖ': 'k' };
    const SUPS = { '⁺': '+', '⁻': '-' };
    // słowo = 3+ litery albo krótkie polskie słowo; „at”, „2ab” to iloczyny
    const WORD = /[a-ząćęłńóśźż]{3,}|(?:^|[^a-z])(?:do|od|na|to|po|ze|że|i)(?![a-z])/i, FNWORDS = /arcsin|arccos|arctan|arctg|sin|cos|tan|tg|ctg|cot|ln|log|exp|sqrt|cbrt|lim/g;
    const textTex = (/** @type {string} */ s) => '\\text{' + s.replace(/[\\{}$&#^_%~]/g, '\\$&') + '}';

    /** dzieli na kawałki na poziomie 0 nawiasów @param {string} s @returns {{sep: string, part: string}[]} */
    function splitTop(s) {
        const out = []; let depth = 0, start = 0, sep = '';
        if (s.startsWith('→ ')) { sep = '\\to '; start = 2; }
        for (let i = start; i < s.length; i++) {
            const c = s[i];
            if (OPEN.includes(c)) depth++;
            else if (CLOSE.includes(c)) depth--;
            else if (depth === 0) {
                if (s.startsWith('  [', i)) { out.push({ sep, part: s.slice(start, i) }); sep = '\\quad '; start = i + 2; i++; continue; }
                const hit = SEPS.find(p => s.startsWith(p[0], i));
                if (hit) { out.push({ sep, part: s.slice(start, i) }); sep = hit[1]; start = i + hit[0].length; i = start - 1; }
            }
        }
        out.push({ sep, part: s.slice(start) });
        return out.filter(p => p.part.trim() || p.sep);
    }

    /** cel granicy z tekstu kroku: ∞, −∞, 0⁺, 2,5 */
    const targetTex = (/** @type {string} */ t) => t.replace('−', '-').replace('∞', '\\infty ').replace(',', '{,}')
        .replace(/[⁺⁻]$/, m => '^{' + SUPS[/** @type {'⁺'} */ (m)] + '}');

    /** jeden kawałek wzoru → LaTeX; null, gdy parser go nie zna @param {string} p @param {string} fid @returns {string|null} */
    function pieceTex(p, fid) {
        p = p.trim();
        if (!p) return '';
        const lim = /^lim\((\w)→([^)]*)\)\s*([\s\S]*)$/.exec(p);
        if (lim) {
            const rest = pieceTex(lim[3], fid);
            return rest == null ? null : '\\lim_{' + lim[1] + '\\to ' + targetTex(lim[2]) + '}' + rest;
        }
        if (p[0] === '±' || p[0] === '+') { const r = pieceTex(p.slice(1), fid); return r == null ? null : (p[0] === '+' ? '+' : '\\pm ') + r; }
        if (WORD.test(p.replace(FNWORDS, ''))) return null;
        // n¹⁰ → n^(10) (tokenizer zna tylko jedną cyfrę ²…⁹), log₄( → log_4(
        p = p.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]{2,}|[⁰¹]/g, m => '^(' + m.split('').map(ch => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(ch)).join('') + ')')
            .replace(/log([₀-₉]+)\(/g, (m, b) => 'log_' + b.split('').map((/** @type {string} */ ch) => ch.charCodeAt(0) - 0x2080).join('') + '(');
        // grupy, których parser nie zna ([…], ⟦…⟧, |…|, aₙ, ∞, Δ), zastępujemy wolną literą i wstawiamy po narysowaniu
        const free = 'qwzjkuyvhgfdsr'.split('').filter(ch => !p.includes(ch));
        /** @type {Record<string, string>} */ const ph = {};
        const hold = (/** @type {string} */ texOut) => { const ch = free.shift(); if (!ch) throw new Error('brak liter'); ph[ch] = texOut; return ch; };
        let s = '', i = 0;
        while (i < p.length) {
            const c = p[i];
            if (c === '[' || c === '⟦') {
                let d = 0, j = i;
                for (; j < p.length; j++) { if (OPEN.includes(p[j])) d++; else if (CLOSE.includes(p[j]) && --d === 0) break; }
                const inner = pieceTex(p.slice(i + 1, j), fid);
                if (inner == null) return null;
                s += hold(c === '[' ? '\\left[' + inner + '\\right]' : '\\htmlData{formula=' + fid + '}{\\underline{' + inner + '}}');
                i = j + 1; continue;
            }
            if (c === '|') {
                const j = p.indexOf('|', i + 1), inner = j > 0 ? pieceTex(p.slice(i + 1, j), fid) : null;
                if (inner == null) return null;
                s += hold('\\left|' + inner + '\\right|'); i = j + 1; continue;
            }
            if (/[a-z]/.test(c) && SUBS[/** @type {'ₙ'} */ (p[i + 1])]) {
                let j = i + 1, sub = '';
                while (SUBS[/** @type {'ₙ'} */ (p[j])]) sub += SUBS[/** @type {'ₙ'} */ (p[j++])];
                s += hold(c + '_{' + sub + '}'); i = j; continue;
            }
            if (c === '∞') { s += hold('\\infty '); i++; continue; }
            // f(x), F(1), f′(t) — zapis funkcji, nie iloczyn f·x
            const fx = /^([fghA-Z])(′?)\(/.exec(p.slice(i)); // f(x), F(1), W(x) — zapis funkcji
            if (fx && !/[a-zA-Z]/.test(p[i - 1] || '')) {
                let d = 0, j = i + fx[0].length - 1;
                for (; j < p.length; j++) { if (p[j] === '(') d++; else if (p[j] === ')' && --d === 0) break; }
                const inner = pieceTex(p.slice(i + fx[0].length, j), fid);
                if (inner == null) return null;
                s += hold(fx[1] + (fx[2] ? '^{\\prime}' : '') + '\\left(' + inner + '\\right)'); i = j + 1; continue;
            }
            if (/[A-Z]/.test(c) && !/[a-zA-Z]/.test(p[i + 1] || '')) { s += hold(c); i++; continue; } // L, P (lewa/prawa strona)
            if (c === '∫') { // ∫ … dx (do najbliższego „ dx” na tym samym poziomie)
                const m = /^∫\s*([\s\S]*?)\s+d([a-z])(?![a-z])/.exec(p.slice(i)), inner = m && pieceTex(m[1], fid);
                if (inner == null) return null;
                s += hold('\\int ' + inner + '\\,d' + /** @type {RegExpExecArray} */ (m)[2]); i += /** @type {RegExpExecArray} */ (m)[0].length; continue;
            }
            if (c === 'd' && /^d[a-z](?![a-z])/.test(p.slice(i)) && !/[a-zA-Z]/.test(p[i - 1] || '')) { s += hold((i ? '\\,' : '') + 'd' + p[i + 1]); i += 2; continue; } // dx, dv — różniczka, nie d·x
            if (c === '⁺' || c === '⁻') { s += '^' + hold(c === '⁺' ? '+' : '-'); i++; continue; }
            if (c === 'Δ') { s += hold('\\Delta '); i++; continue; }
            if (c === '′') { s += '^' + hold('\\prime'); i++; continue; }
            s += c; i++;
        }
        let out;
        try { out = node(S._core.parse(s)); } catch { return null; }
        return out.replace(/(^|[^\\a-zA-Z])([a-z])(?![a-zA-Z])/g, (m, pre, ch) => ph[ch] != null ? pre + ph[ch] : m);
    }

    /**
     * tekst kroku → kawałki LaTeX ('\n' = nowa linia kroku; każdy kawałek z własnym znakiem na początku, żeby długi krok zawijał się
     * między „=” jak na kartce) @param {string} math @param {string} [fid] id wzoru z ⟦…⟧
     * @returns {string[]}
     */
    function stepToLatex(math, fid) {
        if (!S || !math) return [];
        // kolejna linia kroku (x₁ …, x₂ …) zaczyna się od '\n' — rysunek łamie tam wiersz
        return String(math).split('\n').flatMap((lineText, li) => {
            /** @type {string[]} */ const out = [];
            for (const { sep, part } of splitTop(lineText)) {
                let t = null;
                try { t = pieceTex(part, fid || ''); } catch { t = null; } // za dużo grup na litery zastępcze — kawałek tekstem
                const body = t != null ? t : textTex(part.replace(/[⟦⟧]/g, ''));
                // przecinek i dwukropek zostają przy poprzednim kawałku (zawijanie nie zostawi ich na początku linii)
                const punct = /^[,:]/.test(sep) && out.length ? sep[0] : '';
                if (punct) out[out.length - 1] += punct === ':' ? '{:}' : punct; // {:} — dwukropek bez odstępów relacji
                if (sep === SEPS[SEPS.length - 1][1] && out.length) { out[out.length - 1] += sep + body; continue; } // ✓ przy wyniku
                out.push((punct ? sep.slice(1).replace(/^\\quad |^\\ /, '') : sep) + body);
            }
            return li ? ['\n'].concat(out) : out;
        });
    }

    const API = { exprToLatex: exprToLatex, stepToLatex: stepToLatex };
    g.MATM0_TEX = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
