/* ============================================================
   [EN] MATM0_STEPS — rozwiązania krok po kroku (bez DOM, działa też w Node).
   Równania (liniowe, kwadratowe przez Δ, wyższe z pierwiastkami wymiernymi),
   upraszczanie, rozkład na czynniki i rachunki na dokładnych ułamkach (BigInt).
   Bez zależności: CSP apki nie ma 'unsafe-eval', więc mathsteps/mathjs odpadają.
   Każde rozwiązanie równania jest podstawiane do oryginału — wynik, który się
   nie zgadza, nie trafia na ekran.
   ============================================================ */
(function () {
    'use strict';

    var MAX_INPUT = 160, MAX_POW = 12, MAX_TERMS = 400, MAX_DEG = 24;
    var UNSUPPORTED = 'Jeszcze tego nie rozwiążę';

    function NotSupported() {}

    // ── Ułamki dokładne ──────────────────────────────────────
    function gcd(a, b) {
        a = a < 0n ? -a : a; b = b < 0n ? -b : b;
        while (b) { var t = a % b; a = b; b = t; }
        return a;
    }
    function R(n, d) {
        n = BigInt(n); d = d == null ? 1n : BigInt(d);
        if (d === 0n) throw new NotSupported();
        if (d < 0n) { n = -n; d = -d; }
        var g = gcd(n, d);
        if (g > 1n) { n /= g; d /= g; }
        return { n: n, d: d };
    }
    var ZERO = R(0), ONE = R(1);
    function add(a, b) { return R(a.n * b.d + b.n * a.d, a.d * b.d); }
    function neg(a) { return { n: -a.n, d: a.d }; }
    function sub(a, b) { return add(a, neg(b)); }
    function mul(a, b) { return R(a.n * b.n, a.d * b.d); }
    function div(a, b) { return R(a.n * b.d, a.d * b.n); }
    function isZero(a) { return a.n === 0n; }
    function isInt(a) { return a.d === 1n; }
    function eq(a, b) { return a.n === b.n && a.d === b.d; }
    function cmp(a, b) { var l = a.n * b.d, r = b.n * a.d; return l < r ? -1 : (l > r ? 1 : 0); }
    function toNum(a) { return Number(a.n) / Number(a.d); }
    function powR(a, k) {
        if (k < 0) return div(ONE, powR(a, -k));
        return R(a.n ** BigInt(k), a.d ** BigInt(k));
    }
    function isqrt(n) {
        if (n < 2n) return n;
        var x = BigInt(Math.floor(Math.sqrt(Number(n))));
        while (x * x > n) x--;
        while ((x + 1n) * (x + 1n) <= n) x++;
        return x;
    }
    function sqrtExact(a) { // [EN] pierwiastek wymierny albo null
        if (a.n < 0n) return null;
        var p = isqrt(a.n), q = isqrt(a.d);
        return p * p === a.n && q * q === a.d ? R(p, q) : null;
    }

    // ── Wyświetlanie ─────────────────────────────────────────
    var SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
    var SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
    function sup(n) { return String(n).replace(/\d/g, function (c) { return SUP[c]; }); }
    function sub_(n) { return String(n).replace(/\d/g, function (c) { return SUB[c]; }); }

    function decimalOf(a) { // [EN] ułamek skończony jako tekst z przecinkiem, inaczej null
        var d = a.d;
        while (d % 2n === 0n) d /= 2n;
        while (d % 5n === 0n) d /= 5n;
        if (d !== 1n) return null;
        var n = a.n < 0n ? -a.n : a.n, places = 0, den = a.d;
        while (den !== 1n && places < 18) {
            n *= 10n; places++;
            var g = gcd(n, den); n /= g; den /= g;
        }
        if (den !== 1n) return null;
        var s = n.toString();
        while (s.length <= places) s = '0' + s;
        return s.slice(0, s.length - places) + ',' + s.slice(s.length - places);
    }
    function fmtAbs(a, ctx) {
        if (isInt(a)) return (a.n < 0n ? -a.n : a.n).toString();
        if (ctx && ctx.dec) { var dec = decimalOf(a); if (dec) return dec; }
        return (a.n < 0n ? -a.n : a.n).toString() + '/' + a.d.toString();
    }
    function fmt(a, ctx) { return (a.n < 0n ? '−' : '') + fmtAbs(a, ctx); }
    function fmtParen(a, ctx) { return a.n < 0n ? '(' + fmt(a, ctx) + ')' : fmt(a, ctx); }
    function fmtDen(a, ctx) { // [EN] dzielnik: 2 / (1/2), nie 2 / 1/2
        var s = fmt(a, ctx);
        return a.n < 0n || s.indexOf('/') >= 0 ? '(' + s + ')' : s;
    }
    function fmtApprox(v) {
        var s = String(parseFloat(v.toPrecision(6))).replace('.', ',');
        return s.charAt(0) === '-' ? '−' + s.slice(1) : s;
    }

    // ── Tokeny i parser ──────────────────────────────────────
    var FN_RE = /^(?:arcsin|arccos|arctan|arctg|asin|acos|atan|sin|cos|tan|tg|ctg|cot|ln|log|exp)/;
    var FN_NAMES = { arcsin: 'asin', arccos: 'acos', arctan: 'atan', arctg: 'atan', tg: 'tan', ctg: 'cot' };

    function tokenize(src, opts) {
        var out = [], i = 0, s = src;
        while (i < s.length) {
            var c = s.charAt(i);
            if (/\s/.test(c)) { i++; continue; }
            var num = /^\d+(?:[.,]\d+)?/.exec(s.slice(i));
            if (num) { out.push({ t: 'num', v: num[0].replace(',', '.') }); i += num[0].length; continue; }
            var fn = /^(sqrt|pierwiastek z|pierwiastek)\b/.exec(s.slice(i));
            if (fn) { out.push({ t: 'sqrt' }); i += fn[0].length; continue; }
            if (c === '√') { out.push({ t: 'sqrt' }); i++; continue; }
            // [EN] pierwiastki 3. i 4. stopnia: ∛u, ∜u, cbrt(u) → u^(1/n)
            if (c === '∛' || c === '∜') { out.push({ t: 'root', n: c === '∛' ? 3 : 4 }); i++; continue; }
            var cb = /^cbrt\b/.exec(s.slice(i));
            if (cb) { out.push({ t: 'root', n: 3 }); i += cb[0].length; continue; }
            // [EN] log o podstawie: log_2(u), log2(u) — przed ogólnym „log” (= log₁₀)
            var lb = /^log_?(\d+)(?=\s*\()/.exec(s.slice(i));
            if (lb && +lb[1] >= 2) { out.push({ t: 'fn', v: 'logb', base: lb[1] }); i += lb[0].length; continue; }
            var name = FN_RE.exec(s.slice(i));
            if (name) { out.push({ t: 'fn', v: FN_NAMES[name[0]] || name[0] }); i += name[0].length; continue; }
            var pi = /^(?:pi(?![a-z])|π)/.exec(s.slice(i));
            if (pi) {
                if (!opts.calculus) throw new NotSupported();
                out.push({ t: 'const', v: 'pi' }); i += pi[0].length;
                continue;
            }
            if (/[a-z]/.test(c)) {
                if (c === 'e') {
                    if (!opts.calculus) throw new NotSupported();
                    out.push({ t: 'const', v: 'e' }); i++;
                    continue;
                }
                if (opts.singleLetters && /[a-z]/.test(s.charAt(i + 1))) throw new SyntaxError('word');
                out.push({ t: 'var', v: c }); i++;
                continue;
            }
            if ('²³⁴⁵⁶⁷⁸⁹'.indexOf(c) >= 0) { out.push({ t: 'op', v: '^' }); out.push({ t: 'num', v: String('²³⁴⁵⁶⁷⁸⁹'.indexOf(c) + 2) }); i++; continue; }
            if ((c === '<' || c === '>') && s.charAt(i + 1) === '=') { out.push({ t: 'op', v: c === '<' ? '≤' : '≥' }); i += 2; continue; }
            if ('<>≤≥'.indexOf(c) >= 0) { out.push({ t: 'op', v: c }); i++; continue; } // [EN] nierówności
            if (c === '|') { out.push({ t: 'op', v: '|' }); i++; continue; } // [EN] wartość bezwzględna |x − 2|
            if ('+-*/^()='.indexOf(c) >= 0) { out.push({ t: 'op', v: c }); i++; continue; }
            if (c === '−' || c === '–') { out.push({ t: 'op', v: '-' }); i++; continue; }
            if (c === '×' || c === '·' || c === '∙') { out.push({ t: 'op', v: '*' }); i++; continue; }
            if (c === '÷' || c === ':') { out.push({ t: 'op', v: ':' }); i++; continue; } // [EN] dzielenie „:” — prawa strona może być ułamkiem (3/5 : 9/10)
            throw new SyntaxError('char');
        }
        return out;
    }

    function parseTokens(tokens) {
        var i = 0;
        function peek() { return tokens[i]; }
        function isOp(v) { var t = tokens[i]; return !!t && t.t === 'op' && t.v === v; }
        function startsFactor() {
            var t = tokens[i];
            return !!t && (t.t === 'var' || t.t === 'sqrt' || t.t === 'root' || t.t === 'fn' || t.t === 'const' || (t.t === 'op' && t.v === '('));
        }
        function sum() {
            var left = isOp('-') ? (i++, { k: 'neg', a: product() }) : (isOp('+') ? (i++, product()) : product());
            while (isOp('+') || isOp('-')) {
                var op = tokens[i++].v;
                left = { k: op === '+' ? 'add' : 'sub', a: left, b: product() };
            }
            return left;
        }
        function product() {
            var left = power();
            for (;;) {
                if (isOp('*')) { i++; left = { k: 'mul', a: left, b: fracOperand() }; continue; }
                if (isOp(':')) { i++; left = { k: 'div', a: left, b: fracOperand(), colon: true }; continue; }
                if (isOp('/')) { i++; left = { k: 'div', a: left, b: power() }; continue; }
                if (startsFactor()) { left = { k: 'mul', a: left, b: power(), implicit: true }; continue; }
                return left;
            }
        }
        // [EN] po „·” i „:” liczba/liczba to jeden ułamek: 3/5 : 9/10 = (3/5) : (9/10), jak w zeszycie (nie 3/5/9/10)
        function fracOperand() {
            var r = power();
            if (r.k === 'num' && isOp('/') && tokens[i + 1] && tokens[i + 1].t === 'num' && !(tokens[i + 2] && tokens[i + 2].t === 'op' && tokens[i + 2].v === '^')) {
                i++;
                r = { k: 'div', a: r, b: power() };
            }
            return r;
        }
        function power() {
            var base = atom();
            if (isOp('^')) {
                i++;
                var exp = isOp('-') ? (i++, { k: 'neg', a: atom() }) : atom();
                return { k: 'pow', a: base, b: exp };
            }
            return base;
        }
        function fnArg() { // [EN] sin 2x = sin(2x), sin(x) y = sin(x)·y
            if (isOp('(')) { var inner = atom(); inner.paren = false; return inner; }
            var left = power();
            while (startsFactor() && tokens[i].t !== 'fn') left = { k: 'mul', a: left, b: power(), implicit: true };
            return left;
        }
        function atom() {
            var t = peek();
            if (!t) throw new SyntaxError('end');
            i++;
            if (t.t === 'num') {
                var parts = t.v.split('.');
                var r = parts[1] ? R(BigInt(parts[0] + parts[1]), 10n ** BigInt(parts[1].length)) : R(BigInt(parts[0]));
                return { k: 'num', v: r, dec: !!parts[1] };
            }
            if (t.t === 'var') return { k: 'var', v: t.v };
            if (t.t === 'sqrt') { return { k: 'sqrt', a: atom() }; }
            if (t.t === 'root') return { k: 'pow', a: atom(), b: { k: 'num', v: R(1n, BigInt(t.n)) } };
            if (t.t === 'const') return { k: 'const', v: t.v };
            if (t.t === 'fn') {
                if (isOp('^')) { // [EN] sin²x, sin^2(x)
                    i++;
                    var outer = atom();
                    return { k: 'pow', a: { k: 'fn', f: t.v, a: fnArg() }, b: outer };
                }
                return t.base ? { k: 'fn', f: t.v, base: t.base, a: fnArg() } : { k: 'fn', f: t.v, a: fnArg() };
            }
            if (t.t === 'op' && t.v === '(') {
                var inner = sum();
                if (!isOp(')')) throw new SyntaxError('paren');
                i++;
                inner.paren = true;
                return inner;
            }
            if (t.t === 'op' && t.v === '-') return { k: 'neg', a: atom() };
            if (t.t === 'op' && t.v === '|') {
                var inside = sum();
                if (!isOp('|')) throw new SyntaxError('abs');
                i++;
                return { k: 'abs', a: inside };
            }
            throw new SyntaxError('token');
        }
        var res = sum();
        if (i !== tokens.length) throw new SyntaxError('rest');
        return res;
    }

    function hasDecimal(n) {
        if (n.k === 'num') return n.dec;
        return (n.a ? hasDecimal(n.a) : false) || (n.b ? hasDecimal(n.b) : false);
    }
    function hasParenGroup(n) {
        if (n.k === 'mul' || n.k === 'pow' || n.k === 'neg' || n.k === 'sub') {
            if (n.b && n.b.paren && n.b.k !== 'num') return true;
            if (n.a && n.a.paren && n.a.k !== 'num') return true;
        }
        return (n.a ? hasParenGroup(n.a) : false) || (n.b ? hasParenGroup(n.b) : false);
    }
    function hasVars(n) {
        if (n.k === 'var') return true;
        return (n.a ? hasVars(n.a) : false) || (n.b ? hasVars(n.b) : false);
    }

    function showFactor(n, ctx) { // [EN] ułamek przy mnożeniu/potędze dostaje nawias
        var s = show(n, ctx);
        return n.k === 'num' && (n.frac || n.v.n < 0n) && s.indexOf('/') + (n.v.n < 0n ? 1 : 0) >= 0 && !n.paren ? '(' + s + ')' : s;
    }
    function show(n, ctx) { // [EN] wyrażenie tak, jak je wpisano
        var s;
        switch (n.k) {
            case 'num': s = fmt(n.v, ctx); break;
            case 'var': s = n.v; break;
            case 'add': s = show(n.a, ctx) + ' + ' + show(n.b, ctx); break;
            case 'sub': s = show(n.a, ctx) + ' − ' + show(n.b, ctx); break;
            case 'neg': s = '−' + show(n.a, ctx); break;
            case 'mul':
                s = n.implicit ? show(n.a, ctx) + show(n.b, ctx) : showFactor(n.a, ctx) + ' · ' + showFactor(n.b, ctx);
                break;
            case 'div': s = n.colon ? show(n.a, ctx) + ' : ' + show(n.b, ctx) : show(n.a, ctx) + '/' + show(n.b, ctx); break;
            case 'pow':
                s = n.b.k === 'num' && isInt(n.b.v) && n.b.v.n >= 0n
                    ? showFactor(n.a, ctx) + sup(n.b.v.n.toString())
                    : showFactor(n.a, ctx) + '^' + show(n.b, ctx);
                break;
            case 'sqrt': s = '√' + (n.a.k === 'var' ? n.a.v : n.a.k === 'num' && isInt(n.a.v) ? fmt(n.a.v, ctx) : n.a.k === 'num' || n.a.paren ? show(n.a, ctx) : '(' + show(n.a, ctx) + ')'); break;
            case 'abs': s = '|' + show(Object.assign({}, n.a, { paren: false }), ctx) + '|'; break;
            case 'fn': // [EN] log₂(2x − 1), log(x), ln(x) — w równaniach logarytmicznych
                s = (n.f === 'logb' ? 'log' + sub_(n.base) : ({ tan: 'tg', cot: 'ctg', atan: 'arctg' })[n.f] || n.f) + '(' + show(Object.assign({}, n.a, { paren: false }), ctx) + ')';
                break;
        }
        return n.paren ? '(' + s + ')' : s;
    }

    // ── Wielomiany: lista jednomianów {c, e: {x: 2}} ─────────
    function monoKey(e) {
        return Object.keys(e).sort().map(function (v) { return v + e[v]; }).join('');
    }
    function constOf(terms) {
        var list = collect(terms);
        if (!list.length) return ZERO;
        if (list.length === 1 && !Object.keys(list[0].e).length) return list[0].c;
        throw new NotSupported();
    }
    function mulTerms(a, b) {
        if (a.length * b.length > MAX_TERMS) { a = collect(a); b = collect(b); }
        if (a.length * b.length > MAX_TERMS) throw new NotSupported();
        var out = [];
        a.forEach(function (x) {
            b.forEach(function (y) {
                var e = {};
                Object.keys(x.e).forEach(function (v) { e[v] = x.e[v]; });
                Object.keys(y.e).forEach(function (v) { e[v] = (e[v] || 0) + y.e[v]; });
                out.push({ c: mul(x.c, y.c), e: e });
            });
        });
        return out;
    }
    function termsOf(n) { // [EN] rozwinięcie BEZ scalania — widać, co powstało z nawiasów
        switch (n.k) {
            case 'num': return [{ c: n.v, e: {} }];
            case 'var': var e = {}; e[n.v] = 1; return [{ c: ONE, e: e }];
            case 'add': return termsOf(n.a).concat(termsOf(n.b));
            case 'sub': return termsOf(n.a).concat(negTerms(termsOf(n.b)));
            case 'neg': return negTerms(termsOf(n.a));
            case 'mul': return mulTerms(termsOf(n.a), termsOf(n.b));
            case 'div':
                var d = constOf(termsOf(n.b));
                if (isZero(d)) throw new NotSupported();
                return termsOf(n.a).map(function (t) { return { c: div(t.c, d), e: t.e }; });
            case 'pow':
                var k = constOf(termsOf(n.b));
                if (!isInt(k) || k.n < 0n || k.n > BigInt(MAX_POW)) throw new NotSupported();
                var out = [{ c: ONE, e: {} }];
                var base = termsOf(n.a);
                for (var i = 0; i < Number(k.n); i++) out = mulTerms(out, base);
                return out;
            case 'sqrt':
                var r = sqrtExact(constOf(termsOf(n.a)));
                if (!r) throw new NotSupported();
                return [{ c: r, e: {} }];
        }
        throw new NotSupported();
    }
    function negTerms(list) { return list.map(function (t) { return { c: neg(t.c), e: t.e }; }); }
    function collect(terms) {
        var map = {}, order = [];
        terms.forEach(function (t) {
            var k = monoKey(t.e);
            if (!map[k]) { map[k] = { c: ZERO, e: t.e }; order.push(k); }
            map[k].c = add(map[k].c, t.c);
        });
        return order.map(function (k) { return map[k]; }).filter(function (t) { return !isZero(t.c); });
    }
    function degreeOf(t) { return Object.keys(t.e).reduce(function (s, v) { return s + t.e[v]; }, 0); }
    function sorted(terms) {
        return terms.slice().sort(function (a, b) {
            return degreeOf(b) - degreeOf(a) || (monoKey(a) < monoKey(b) ? -1 : 1);
        });
    }
    function monoText(e) {
        return Object.keys(e).sort().map(function (v) { return e[v] === 1 ? v : v + sup(e[v]); }).join('');
    }
    function showTerms(terms, ctx, keepOrder) {
        var list = keepOrder ? terms : sorted(terms);
        if (!list.length) return '0';
        return list.map(function (t, i) {
            var m = monoText(t.e), a = fmtAbs(t.c, ctx), body;
            if (!m) body = a;
            else if (a === '1') body = m;
            else if (a.indexOf('/') >= 0) body = '(' + a + ')' + m;
            else body = a + m;
            if (i === 0) return (t.c.n < 0n ? '−' : '') + body;
            return (t.c.n < 0n ? ' − ' : ' + ') + body;
        }).join('');
    }
    function varsOf(terms) {
        var seen = {};
        terms.forEach(function (t) { Object.keys(t.e).forEach(function (v) { seen[v] = 1; }); });
        return Object.keys(seen).sort();
    }
    function coefs(terms, v) { // [EN] współczynniki po potęgach v (jedna zmienna)
        var deg = 0;
        terms.forEach(function (t) { deg = Math.max(deg, t.e[v] || 0); });
        if (deg > MAX_DEG) throw new NotSupported();
        var out = [];
        for (var i = 0; i <= deg; i++) out.push(ZERO);
        terms.forEach(function (t) { out[t.e[v] || 0] = t.c; });
        return out;
    }
    function polyText(c, v, ctx) { // [EN] współczynniki → tekst
        var list = [];
        for (var i = c.length - 1; i >= 0; i--) {
            if (isZero(c[i])) continue;
            var e = {};
            if (i) e[v] = i;
            list.push({ c: c[i], e: e });
        }
        return showTerms(list, ctx, true);
    }

    function evalExact(n, env) {
        switch (n.k) {
            case 'num': return n.v;
            case 'var': if (!env[n.v]) throw new NotSupported(); return env[n.v];
            case 'add': return add(evalExact(n.a, env), evalExact(n.b, env));
            case 'sub': return sub(evalExact(n.a, env), evalExact(n.b, env));
            case 'neg': return neg(evalExact(n.a, env));
            case 'mul': return mul(evalExact(n.a, env), evalExact(n.b, env));
            case 'div': return div(evalExact(n.a, env), evalExact(n.b, env));
            case 'pow':
                var k = evalExact(n.b, env);
                if (!isInt(k) || k.n > BigInt(MAX_POW) || k.n < -BigInt(MAX_POW)) throw new NotSupported();
                return powR(evalExact(n.a, env), Number(k.n));
            case 'abs': var av = evalExact(n.a, env); return av.n < 0n ? neg(av) : av;
            case 'sqrt':
                var r = sqrtExact(evalExact(n.a, env));
                if (!r) throw new NotSupported();
                return r;
        }
        throw new NotSupported();
    }
    function evalNum(n, env) {
        switch (n.k) {
            case 'num': return toNum(n.v);
            case 'var': return env[n.v];
            case 'add': return evalNum(n.a, env) + evalNum(n.b, env);
            case 'sub': return evalNum(n.a, env) - evalNum(n.b, env);
            case 'neg': return -evalNum(n.a, env);
            case 'mul': return evalNum(n.a, env) * evalNum(n.b, env);
            case 'div': return evalNum(n.a, env) / evalNum(n.b, env);
            case 'pow': return Math.pow(evalNum(n.a, env), evalNum(n.b, env));
            case 'sqrt': return Math.sqrt(evalNum(n.a, env));
            case 'abs': return Math.abs(evalNum(n.a, env));
            case 'fn': // [EN] sprawdzenie równań logarytmicznych (tylko liczbowo)
                if (n.f === 'log') return Math.log10(evalNum(n.a, env));
                if (n.f === 'logb') return Math.log(evalNum(n.a, env)) / Math.log(+n.base);
                if (n.f === 'ln') return Math.log(evalNum(n.a, env));
        }
        return NaN;
    }

    // ── Pierwiastki postaci (P ± Q√t)/D ──────────────────────
    function simplifiedRoot(delta) { // [EN] √(n/d) = (s/d)·√t
        var nd = delta.n * delta.d, s = 1n, t = nd;
        for (var f = 2n; f * f <= t && f < 100000n; f++) {
            while (t % (f * f) === 0n) { t /= f * f; s *= f; }
        }
        return { q: R(s, delta.d), t: t };
    }
    function surdText(q, t) { // [EN] q·√t
        var a = isInt(q) ? (q.n === 1n ? '' : q.n === -1n ? '−' : fmt(q)) : fmt(q);
        return a + '√' + t.toString();
    }
    function surdRoot(p, q, t, sign) { // [EN] dokładny tekst p ± q√t + wartość
        var qq = sign < 0 ? neg(q) : q;
        var den = (p.d * q.d) / gcd(p.d, q.d);
        var P = mul(p, R(den)), Q = mul(qq, R(den));
        var head = isZero(P) ? '' : fmt(P);
        var absQ = Q.n < 0n ? neg(Q) : Q;
        var body = (absQ.n === 1n ? '' : fmt(absQ)) + '√' + t.toString();
        var num = head ? head + (Q.n < 0n ? ' − ' : ' + ') + body : (Q.n < 0n ? '−' : '') + body;
        return {
            text: den === 1n ? num : '(' + num + ')/' + den.toString(),
            value: toNum(p) + toNum(qq) * Math.sqrt(Number(t))
        };
    }

    function divisorsText(k) { // [EN] dzielniki liczby całkowitej: ±1, ±2, ±3, ±6
        var n = k.n < 0n ? -k.n : k.n, out = [];
        if (n > 1000n) return '';
        for (var i = 1n; i <= n; i++) if (n % i === 0n) out.push('±' + i);
        return out.join(', ');
    }
    function rationalRoot(c) { // [EN] pierwiastek wymierny wielomianu (twierdzenie o p/q) albo null
        var den = c.reduce(function (l, x) { return (l * x.d) / gcd(l, x.d); }, 1n);
        var ints = c.map(function (x) { return (x.n * den) / x.d; });
        var a0 = ints[0] < 0n ? -ints[0] : ints[0];
        var an = ints[ints.length - 1]; an = an < 0n ? -an : an;
        if (a0 > 1000000n || an > 1000000n) return null;
        var ds = function (n) {
            var out = [];
            for (var i = 1n; i * i <= n; i++) if (n % i === 0n) { out.push(i); if (i * i !== n) out.push(n / i); }
            return out.sort(function (x, y) { return x < y ? -1 : 1; });
        };
        var ps = ds(a0), qs = ds(an);
        for (var i = 0; i < ps.length; i++) {
            for (var j = 0; j < qs.length; j++) {
                var cand = [R(ps[i], qs[j]), R(-ps[i], qs[j])];
                for (var k = 0; k < 2; k++) {
                    var v = ZERO;
                    for (var d = c.length - 1; d >= 0; d--) v = add(mul(v, cand[k]), c[d]);
                    if (isZero(v)) return cand[k];
                }
            }
        }
        return null;
    }
    function deflate(c, r) { // [EN] schemat Hornera: c(x) / (x − r)
        var out = [], carry = ZERO;
        for (var d = c.length - 1; d >= 1; d--) {
            carry = add(mul(carry, r), c[d]);
            out.unshift(carry);
        }
        return out;
    }

    // ── Równania ─────────────────────────────────────────────
    function overThen(n, d, ctx) { // [EN] 4/2 = 2: licznik i mianownik policzone, potem wynik (raport E, R1)
        var res = fmt(div(n, d), ctx), raw = fmt(n, ctx) + '/' + fmtDen(d, ctx);
        return eq(d, ONE) || raw === res ? res : raw + ' = ' + res;
    }
    function solveQuadratic(c, v, steps, ctx, sol) {
        var a = c[2], b = c[1], k = c[0];
        if (!isZero(b) && !isZero(k)) { // [EN] przy c = 0 delty nie ma — współczynniki nic nie dają
            steps.push({ label: 'Odczytuję współczynniki', math: 'a = ' + fmt(a, ctx) + ', b = ' + fmt(b, ctx) + ', c = ' + fmt(k, ctx) });
        }
        if (isZero(b)) {
            var rhs = neg(div(k, a));
            var isolated = v + '² = ' + fmt(rhs, ctx);
            if (isolated !== steps[steps.length - 1].math) {
                steps.push({ label: 'Przenoszę liczbę na prawo', math: isolated });
            }
            if (rhs.n < 0n) {
                steps.push({ label: 'Kwadrat nie może być ujemny', math: 'brak rozwiązań rzeczywistych' });
                return;
            }
            var ex = sqrtExact(rhs);
            if (ex) {
                if (isZero(ex)) { sol.push({ r: ZERO }); return; }
                sol.push({ r: neg(ex) }, { r: ex });
                steps.push({ label: 'Pierwiastkuję obie strony (są dwa znaki)', math: v + ' = ±' + fmt(ex, ctx) });
                return;
            }
            var sr = simplifiedRoot(rhs);
            var lo = surdRoot(ZERO, sr.q, sr.t, -1), hi = surdRoot(ZERO, sr.q, sr.t, 1);
            sol.push({ text: lo.text, value: lo.value }, { text: hi.text, value: hi.value });
            steps.push({ label: 'Pierwiastkuję obie strony (są dwa znaki)', math: v + ' = ±' + surdText(sr.q, sr.t) });
            return;
        }
        if (isZero(k)) {
            var other = neg(div(b, a));
            steps.push({ label: 'Wyłączam ' + v + ' przed nawias', math: (eq(a, ONE) ? v : fmt(a, ctx) + v) + '(' + polyText([div(b, a), ONE], v, ctx) + ') = 0' });
            steps.push({ label: 'Przyrównuję każdy czynnik do zera', math: v + ' = 0 lub ' + polyText([div(b, a), ONE], v, ctx) + ' = 0\n' + v + ' = 0 lub ' + v + ' = ' + fmt(other, ctx) });
            sol.push({ r: ZERO }, { r: other });
            return;
        }
        var delta = sub(mul(b, b), mul(R(4), mul(a, k)));
        var abc = 'a = ' + fmt(a, ctx) + ', b = ' + fmt(b, ctx) + ', c = ' + fmt(k, ctx); // [EN] dymek: liczby z zadania przy literach wzoru
        var abD = 'a = ' + fmt(a, ctx) + ', b = ' + fmt(b, ctx) + ', Δ = ' + fmt(delta, ctx);
        steps.push({ // [EN] wzór w dymku (słownik: delta), nie w etykiecie
            label: 'Liczę deltę',
            // [EN] 25 − 24 przed wynikiem; przy c < 0 widać 4 + 4 (minus razy minus)
            math: 'Δ = ⟦' + fmtParen(b, ctx) + '² − 4 · ' + fmtParen(a, ctx) + ' · ' + fmtParen(k, ctx) + '⟧ = ' + fmt(mul(b, b), ctx)
                + (mul(a, k).n < 0n ? ' + ' + fmt(neg(mul(R(4), mul(a, k))), ctx) : ' − ' + fmt(mul(R(4), mul(a, k)), ctx)) + ' = ' + fmt(delta, ctx),
            formula: { id: 'delta', here: abc }
        });
        var twoA = mul(R(2), a);
        var minusB = neg(b);
        if (delta.n < 0n) {
            steps.push({ label: 'Delta ujemna: brak rozwiązań', math: 'brak rozwiązań rzeczywistych' });
            return;
        }
        if (isZero(delta)) {
            var x0 = div(minusB, twoA);
            steps.push({ label: 'Liczę jedno rozwiązanie', math: v + '₀ = ⟦' + fmt(minusB, ctx) + ' / (2 · ' + fmtParen(a, ctx) + ')⟧ = ' + overThen(minusB, twoA, ctx), formula: { id: 'wzor-x0', here: abc } });
            sol.push({ r: x0 });
            return;
        }
        var root = sqrtExact(delta);
        if (root) {
            var x1 = div(sub(minusB, root), twoA), x2 = div(add(minusB, root), twoA);
            steps.push({ label: 'Liczę pierwiastek z delty', math: '√Δ = √' + fmt(delta, ctx) + ' = ' + fmt(root, ctx) });
            var den2 = ' / (2 · ' + fmtParen(a, ctx) + ')'; // [EN] 2a widać jako 2 · a, nie gotowe 2
            steps.push({
                label: 'Liczę dwa rozwiązania',
                math: v + '₁ = ⟦(' + fmt(minusB, ctx) + ' − ' + fmt(root, ctx) + ')' + den2 + '⟧ = ' + overThen(sub(minusB, root), twoA, ctx) +
                    '\n' + v + '₂ = ⟦(' + fmt(minusB, ctx) + ' + ' + fmt(root, ctx) + ')' + den2 + '⟧ = ' + overThen(add(minusB, root), twoA, ctx),
                formula: { id: 'wzory-x12', here: abD }
            });
            sol.push({ r: x1 }, { r: x2 });
            return;
        }
        var s = simplifiedRoot(delta);
        var p = div(minusB, twoA), q = div(s.q, twoA);
        var r1 = surdRoot(p, q, s.t, -1), r2 = surdRoot(p, q, s.t, 1);
        steps.push({ label: 'Upraszczam pierwiastek z delty', math: '√Δ = √' + fmt(delta, ctx) + ' = ' + surdText(s.q, s.t) });
        steps.push({
            label: 'Liczę dwa rozwiązania', formula: { id: 'wzory-x12', here: abD },
            // [EN] podkreślone podstawienie do wzoru, potem wynik (nie sam gotowy wynik)
            math: v + '₁ = ⟦(' + fmt(minusB, ctx) + ' − ' + surdText(s.q, s.t) + ') / (2 · ' + fmtParen(a, ctx) + ')⟧ = ' + r1.text + ' ≈ ' + fmtApprox(r1.value) +
                '\n' + v + '₂ = ⟦(' + fmt(minusB, ctx) + ' + ' + surdText(s.q, s.t) + ') / (2 · ' + fmtParen(a, ctx) + ')⟧ = ' + r2.text + ' ≈ ' + fmtApprox(r2.value)
        });
        sol.push({ text: r1.text, value: r1.value }, { text: r2.text, value: r2.value });
    }

    function plugPoly(c, r, ctx) { // [EN] W(1) = 1 − 6 + 11 − 6: wartość każdego wyrazu po wstawieniu r
        var out = '';
        for (var d = c.length - 1; d >= 0; d--) {
            if (isZero(c[d])) continue;
            var t = c[d];
            for (var k = 0; k < d; k++) t = mul(t, r);
            out += out ? (t.n < 0n ? ' − ' + fmt(neg(t), ctx) : ' + ' + fmt(t, ctx)) : fmt(t, ctx);
        }
        return out || '0';
    }
    function solveDegree(c, v, steps, ctx, sol) { // [EN] c = współczynniki; schodzi do stopnia 2
        while (c.length > 1 && isZero(c[c.length - 1])) c = c.slice(0, -1);
        if (c.length === 2) {
            sol.push({ r: neg(div(c[0], c[1])) });
            return;
        }
        if (c.length === 3) { solveQuadratic(c, v, steps, ctx, sol); return; }
        if (c.length < 2) return;
        var r = rationalRoot(c);
        if (!r) throw new NotSupported();
        var low = deflate(c, r);
        sol.push({ r: r });
        var lin = '(' + v + (r.n < 0n ? ' + ' + fmt(neg(r), ctx) : ' − ' + fmt(r, ctx)) + ')';
        // [EN] skąd kandydaci: dzielniki wyrazu wolnego (gdy przy najwyższej potędze stoi 1), raport E, R6
        var divs = isInt(c[0]) && eq(c[c.length - 1], ONE) && !isZero(c[0]) ? divisorsText(c[0]) : '';
        steps.push({ // [EN] W(r) = 0 → W dzieli się przez (x − r) (słownik: bezout)
            label: 'Szukam pierwiastka wśród dzielników',
            math: 'W(' + v + ') = ' + polyText(c, v, ctx) + (divs ? '\ndzielniki ' + fmt(c[0], ctx) + ': ' + divs : '') + '\nW(' + fmt(r, ctx) + ') = ' + plugPoly(c, r, ctx) + ' = 0, więc W(' + v + ') = ⟦' + lin + '(' + polyText(low, v, ctx) + ')⟧',
            formula: { id: 'bezout' }
        });
        steps.push({ label: 'Przyrównuję każdy czynnik do zera', math: lin.slice(1, -1) + ' = 0 lub ' + polyText(low, v, ctx) + ' = 0\n' + v + ' = ' + fmt(r, ctx) + ' lub ' + polyText(low, v, ctx) + ' = 0' });
        solveDegree(low, v, steps, ctx, sol);
    }

    // ── Równania trygonometryczne (plan „jak Photomath”, pkt 6): sin/cos/tg(p·x) = wartość z tablicy ──
    var TRIG_NAME = { sin: 'sin', cos: 'cos', tan: 'tg' };
    function isTrig(n) { return !!n && n.k === 'fn' && !!TRIG_NAME[n.f] && hasVars(n.a); }
    function piText(r) { // [EN] ułamek π jak w zeszycie: π/6, 5π/6, −π/4, π, 2π, 0
        if (isZero(r)) return '0';
        var a = r.n < 0n ? -r.n : r.n, top = (a === 1n ? '' : a.toString()) + 'π';
        return (r.n < 0n ? '−' : '') + top + (r.d === 1n ? '' : '/' + r.d);
    }
    function kText(c) { // [EN] okres: kπ, 2kπ, kπ/2, 2kπ/3
        var top = (c.n === 1n ? '' : c.n.toString()) + 'kπ';
        return top + (c.d === 1n ? '' : '/' + c.d);
    }
    function nicePi(x) { // [EN] kąt (w radianach) jako ułamek π z mianownikiem 1, 2, 3, 4, 6 — albo null
        var r = x / Math.PI;
        for (var d = 1; d <= 12; d++) { var n = Math.round(r * d); if (Math.abs(r * d - n) < 1e-9) return R(BigInt(n), BigInt(d)); }
        return null;
    }
    function solveTrig(lhs, rhs, ctx) {
        var T = isTrig(lhs) ? lhs : rhs, other = T === lhs ? rhs : lhs;
        if (hasVars(other)) throw new NotSupported(); // shortcut: tylko trig(p·x) = liczba, rozszerzyć o sin x = cos x i równania kwadratowe w sinusie, gdy będzie potrzeba
        var t = collect(termsOf(T.a));
        if (t.length !== 1 || Object.keys(t[0].e).length !== 1 || t[0].e[Object.keys(t[0].e)[0]] !== 1 || !isInt(t[0].c) || t[0].c.n <= 0n) throw new NotSupported();
        var v = Object.keys(t[0].e)[0], p = t[0].c, a = evalNum(other, {}), name = TRIG_NAME[T.f], u = plain(T.a, ctx);
        if (!isFinite(a)) throw new NotSupported();
        var steps = [{ label: 'Równanie', math: show(lhs, ctx) + ' = ' + show(rhs, ctx) }];
        var title = 'Równanie trygonometryczne';
        if (T.f !== 'tan' && Math.abs(a) > 1 + 1e-12) {
            steps.push({ label: (T.f === 'sin' ? 'Sinus' : 'Cosinus') + ' przyjmuje wartości od −1 do 1', math: '−1 ≤ ' + name + '(' + u + ') ≤ 1,  ' + show(other, ctx) + (a > 0 ? ' > 1' : ' < −1') });
            steps.push({ label: 'Odpowiedź', math: 'Brak rozwiązań' });
            return done(title, 'Brak rozwiązań', null, steps);
        }
        var alpha = nicePi(T.f === 'sin' ? Math.asin(a) : T.f === 'cos' ? Math.acos(a) : Math.atan(a));
        var fn = T.f === 'sin' ? Math.sin : T.f === 'cos' ? Math.cos : Math.tan;
        if (!alpha || alpha.d > 6n) throw new NotSupported(); // [EN] tylko wartości z tablicy (0, ±1/2, ±√2/2, ±√3/2, ±1, ±√3, ±√3/3)
        steps.push({ label: 'Odczytuję kąt z tablicy', math: name + '(' + piText(alpha) + ') = ' + show(other, ctx) });
        // [EN] serie rozwiązań dla argumentu u: {base, period} — wielokrotności π
        var TWO = R(2n), fams;
        if (T.f === 'tan') fams = [{ b: alpha, k: ONE }];
        else if (T.f === 'sin') {
            fams = Math.abs(Math.abs(a) - 1) < 1e-12 ? [{ b: alpha, k: TWO }] : isZero(alpha) ? [{ b: ZERO, k: ONE }] : [{ b: alpha, k: TWO }, { b: sub(ONE, alpha), k: TWO }];
        } else {
            fams = isZero(alpha) || eq(alpha, ONE) ? [{ b: alpha, k: TWO }] : Math.abs(a) < 1e-12 ? [{ b: alpha, k: ONE }] : [{ b: alpha, k: TWO }, { b: neg(alpha), k: TWO }];
        }
        var series = function (f, scale) { var b = div(f.b, scale), k = div(f.k, scale); return isZero(b) ? kText(k) : piText(b) + ' + ' + kText(k); };
        var line = function (lhsT, scale) { return fams.map(function (f) { return lhsT + ' = ' + series(f, scale); }).join(' lub '); };
        steps.push({ label: 'Zapisuję wszystkie rozwiązania', math: line(u, ONE) + '\nk ∈ ℤ' });
        if (!eq(p, ONE)) steps.push({ label: 'Wyliczam ' + v, math: line(v, p) + '\nk ∈ ℤ' });
        fams.forEach(function (f) { // [EN] bezpiecznik: każda seria spełnia równanie dla kilku k
            for (var k = -2; k <= 2; k++) {
                var x = (toNum(f.b) + toNum(f.k) * k) * Math.PI / toNum(p), val = fn(toNum(p) * x);
                if (!(Math.abs(val - a) < 1e-9 * (1 + Math.abs(a)))) throw new NotSupported();
            }
        });
        var text = line(v, p) + ', k ∈ ℤ'; // [EN] na ekranik wyniku w jednej linii; w krokach k ∈ ℤ w osobnej linii
        steps.push({ label: 'Odpowiedź', math: line(v, p) + '\nk ∈ ℤ' });
        return done(title, text, null, steps);
    }

    // ── Wartość bezwzględna i równania z pierwiastkiem (plan „jak Photomath”, pkt 5) ──
    function hasKind(n, k) { return !!n && (n.k === k || hasKind(n.a, k) || hasKind(n.b, k)); }
    function hasVarSqrt(n) { return !!n && ((n.k === 'sqrt' && hasVars(n.a)) || hasVarSqrt(n.a) || hasVarSqrt(n.b)); }
    function plain(n, ctx) { return show(Object.assign({}, n, { paren: false }), ctx); }
    function innerSolve(src) { // [EN] kroki równania z jedną niewiadomą, bez nagłówka, sprawdzenia i odpowiedzi + rozwiązania
        var pr = parseEquationParts(src.replace(/−/g, '-'), {}), r = solveEquation(pr.lhs, pr.rhs);
        if (!r.explain) throw new NotSupported();
        var all = r.explain.steps, last = all[all.length - 1], found = [];
        if (last.label === 'Odpowiedź') last.math.split('\n').forEach(function (l) {
            var t = l.replace(/^[a-z][₀-₉]*\s*=\s*/, '');
            found.push({ text: t, value: evalNum(parseTokens(tokenize(t.replace(/−/g, '-'), {})), {}) });
        });
        else if (!/Brak rozwiązań/.test(r.text)) throw new NotSupported();
        return { steps: all.filter(function (st, i) { return i && st.label !== 'Sprawdzenie' && st.label !== 'Odpowiedź'; }), sols: found };
    }
    function listAnswer(v, sols, steps, lhs, rhs) {
        sols = sols.slice().sort(function (a, b) { return a.value - b.value; })
            .filter(function (s, i, all) { return !i || Math.abs(s.value - all[i - 1].value) > 1e-12; });
        sols.forEach(function (s) { // [EN] bezpiecznik: oryginał spełniony
            var env = {}; env[v] = s.value;
            var l = evalNum(lhs, env), r = evalNum(rhs, env);
            if (!isFinite(l) || !isFinite(r) || Math.abs(l - r) > 1e-9 * (1 + Math.abs(l) + Math.abs(r))) throw new NotSupported();
        });
        var text = !sols.length ? 'Brak rozwiązań' : sols.length === 1 ? v + ' = ' + sols[0].text
            : sols.map(function (s, i) { return v + sub_(i + 1) + ' = ' + s.text; }).join(', ');
        steps.push({ label: 'Odpowiedź', math: text.split(', ').join('\n') });
        return done('Równanie', text, sols.length === 1 ? sols[0].value : null, steps);
    }
    function firstVar(n) { if (!n) return null; if (n.k === 'var') return n.v; return firstVar(n.a) || firstVar(n.b); }
    function solveAbs(lhs, rhs, ctx) {
        var absSide = lhs.k === 'abs' ? lhs : rhs.k === 'abs' ? rhs : null, other = absSide === lhs ? rhs : lhs;
        if (!absSide || hasVars(other) || hasKind(absSide.a, 'abs')) throw new NotSupported(); // shortcut: tylko |A| = liczba, rozszerzyć o |A| = |B| i |A| = B, gdy będzie potrzeba
        var v = firstVar(absSide.a), c = evalExact(other, {}), A = plain(absSide.a, ctx);
        var steps = [{ label: 'Równanie', math: show(lhs, ctx) + ' = ' + show(rhs, ctx) }];
        if (c.n < 0n) {
            steps.push({ label: 'Wartość bezwzględna nie jest ujemna', math: '|' + A + '| ≥ 0,  ' + fmt(c, ctx) + ' < 0' });
            return listAnswer(v, [], steps, lhs, rhs);
        }
        if (isZero(c)) {
            steps.push({ label: 'Wartość bezwzględna jest zerem tylko dla zera', math: A + ' = 0' });
            var z = innerSolve(A + ' = 0');
            return listAnswer(v, z.sols, steps.concat(z.steps), lhs, rhs);
        }
        steps.push({ label: 'Rozbijam na dwa przypadki', math: A + ' = ' + fmt(c, ctx) + ' lub ' + A + ' = ' + fmt(neg(c), ctx) });
        var p1 = innerSolve(A + ' = ' + fmt(c, ctx)), p2 = innerSolve(A + ' = ' + fmt(neg(c), ctx));
        if (p1.sols.length !== 1 || p2.sols.length !== 1) throw new NotSupported();
        steps.push({ label: 'Rozwiązuję oba przypadki', math: v + ' = ' + p1.sols[0].text + ' lub ' + v + ' = ' + p2.sols[0].text });
        return listAnswer(v, p1.sols.concat(p2.sols), steps, lhs, rhs);
    }
    function solveRadical(lhs, rhs, ctx) {
        var root = lhs.k === 'sqrt' ? lhs : rhs.k === 'sqrt' ? rhs : null, other = root === lhs ? rhs : lhs;
        if (!root || hasVarSqrt(other) || hasKind(other, 'abs')) throw new NotSupported(); // shortcut: tylko √A = B, rozszerzyć o √A + √B = c, gdy będzie potrzeba
        var v = firstVar(root.a), A = plain(root.a, ctx), B = plain(other, ctx);
        var steps = [{ label: 'Równanie', math: show(lhs, ctx) + ' = ' + show(rhs, ctx) }];
        if (!hasVars(other) && evalExact(other, {}).n < 0n) {
            steps.push({ label: 'Pierwiastek nie jest ujemny', math: '√(' + A + ') ≥ 0,  ' + B + ' < 0' });
            return listAnswer(v, [], steps, lhs, rhs);
        }
        steps.push({ label: 'Wyznaczam dziedzinę', math: A + ' ≥ 0' + (hasVars(other) ? '\n' + B + ' ≥ 0' : '') });
        var sq = A + ' = ' + (hasVars(other) || evalExact(other, {}).n < 0n || !isInt(evalExact(other, {})) ? '(' + B + ')²' : B + '²');
        steps.push({ label: 'Podnoszę obie strony do kwadratu', math: sq });
        var inn = innerSolve(sq.replace(/²/g, '^2'));
        steps = steps.concat(inn.steps);
        var good = [], bad = [];
        inn.sols.forEach(function (s) {
            var env = {}; env[v] = s.value;
            var l = evalNum(lhs, env), r = evalNum(rhs, env);
            (isFinite(l) && isFinite(r) && Math.abs(l - r) <= 1e-9 * (1 + Math.abs(l) + Math.abs(r)) ? good : bad).push(s);
        });
        // [EN] po podniesieniu do kwadratu mogą dojść fałszywe rozwiązania — każde wstawiam do oryginału
        var lines = inn.sols.map(function (s) { // [EN] widać wstawienie: √(6 + 3) = 3,  6 − 3 = 3 ✓
            var env = {}; env[v] = s.value;
            var isGood = good.indexOf(s) >= 0, rv = evalNum(other, env), lv = evalNum(root, env), q = null;
            try { q = evalExact(parseTokens(tokenize(s.text.replace(/−/g, '-'), {})), {}); } catch (e) { if (!(e instanceof NotSupported)) throw e; }
            var put = function (n, val) { return q ? show(plugIn(n, v, q), ctx) + ' = ' + fmtApprox(val) : fmtApprox(val); };
            return v + ' = ' + s.text + ':  ' + (isGood ? put(root, lv) + (hasVars(other) ? ',  ' + put(other, rv) : '') + ' ✓' : put(other, rv) + ' < 0');
        });
        if (inn.sols.length) steps.push({ label: bad.length ? 'Odrzucam fałszywe rozwiązanie' : 'Sprawdzam rozwiązania', math: lines.join('\n') });
        return listAnswer(v, good, steps, lhs, rhs);
    }

    // ── Równania wykładnicze i logarytmiczne (plan „jak Photomath”, pkt 4) ──
    function hasExpLog(n) {
        if (!n) return false;
        if (n.k === 'pow' && hasVars(n.b)) return true;
        if (n.k === 'fn' && (n.f === 'log' || n.f === 'logb') && hasVars(n.a)) return true;
        return hasExpLog(n.a) || hasExpLog(n.b);
    }
    function linearIn(n, v) { // [EN] wykładnik / argument: a·x + b, inaczej NotSupported
        var t = collect(termsOf(n));
        t.forEach(function (q) { var ks = Object.keys(q.e); if (ks.length > 1 || (ks.length && (ks[0] !== v || q.e[v] !== 1))) throw new NotSupported(); });
        return t;
    }
    function powerOf(q, g) { // [EN] q = g^k (k całkowite) → k, inaczej null; 1/8 = 2^(−3)
        if (q.n <= 0n) return null;
        var top = q.n, bot = q.d, k = 0;
        if (top === 1n && bot === 1n) return 0;
        var up = bot === 1n, n = up ? top : bot;
        if (!up && top !== 1n) return null;
        while (n % g === 0n) { n /= g; k++; }
        return n === 1n ? (up ? k : -k) : null;
    }
    function smallestBase(q) { // [EN] 8 → 2, 9 → 3, 1/8 → 2, 5 → 5
        var n = q.d === 1n ? q.n : q.n === 1n ? q.d : null;
        if (!n || n < 2n) return null;
        for (var g = 2n; g * g <= n; g++) if (powerOf(R(n), g) !== null) return g;
        return n;
    }
    function solveExpLog(lhs, rhs, ctx) {
        var v;
        var findVar = function (n) { if (!n) return null; if (n.k === 'var') return n.v; return findVar(n.a) || findVar(n.b); };
        v = findVar(lhs) || findVar(rhs);
        var steps = [{ label: 'Równanie', math: show(lhs, ctx) + ' = ' + show(rhs, ctx) }];
        var bare = function (n) { return show(Object.assign({}, n, { paren: false }), ctx); };
        var inner = function (src) {
            var pr = parseEquationParts(src.replace(/−/g, '-').replace(/·/g, '*'), {}), r = solveEquation(pr.lhs, pr.rhs);
            if (!r.explain) throw new NotSupported();
            var all = r.explain.steps, last = all[all.length - 1];
            return { steps: all.filter(function (st, i) { return i && st.label !== 'Sprawdzenie' && st.label !== 'Odpowiedź'; }), r: r, last: last };
        };
        var finish = function (val, text, value) { // [EN] sprawdzenie liczbowe na oryginale, potem odpowiedź
            var env = {}; env[v] = value;
            var l = evalNum(lhs, env), r = evalNum(rhs, env);
            if (!isFinite(l) || !isFinite(r) || Math.abs(l - r) > 1e-9 * (1 + Math.abs(l) + Math.abs(r))) throw new NotSupported();
            if (val) {
                var side = function (n) { var t = show(plugIn(n, v, val), ctx), w = fmt(evalExact(n, env2), ctx); return t === w ? t : t + ' = ' + w; };
                var env2 = {}; env2[v] = val;
                try { steps.push({ label: 'Sprawdzenie', math: v + ' = ' + fmt(val, ctx) + ':  L = ' + side(lhs) + ',  P = ' + side(rhs) + ' ✓' }); }
                catch (e) { if (!(e instanceof NotSupported)) throw e; } // [EN] logarytmu nie liczymy dokładnie — sprawdzenie liczbowe wystarcza
            }
            steps.push({ label: 'Odpowiedź', math: v + ' = ' + text });
            return done('Równanie', v + ' = ' + text, value, steps);
        };
        var answerOf = function (res) { // [EN] jedno rozwiązanie z równania liniowego
            if (!res.last || res.last.label !== 'Odpowiedź' || /\n/.test(res.last.math)) throw new NotSupported();
            var t = res.last.math.replace(/^[a-z]\s*=\s*/, ''), q = evalExact(parseTokens(tokenize(t.replace(/−/g, '-'), {})), {});
            return q;
        };
        // ── logarytmy: log_b(A) = c albo log_b(A) = log_b(B) ──
        var isLog = function (n) { return n.k === 'fn' && (n.f === 'log' || n.f === 'logb'); };
        var baseOf = function (n) { return n.f === 'log' ? 10n : BigInt(n.base); };
        if (isLog(lhs) || isLog(rhs)) {
            var Lg = isLog(lhs) ? lhs : rhs, other = isLog(lhs) ? rhs : lhs, b = baseOf(Lg);
            var args = [Lg.a].concat(isLog(other) ? [other.a] : []);
            if (isLog(other) && baseOf(other) !== b) throw new NotSupported();
            if (!isLog(other) && hasVars(other)) throw new NotSupported();
            // dziedzina: każdy argument > 0 (liniowy)
            var lo = null, hi = null, dom = [];
            args.forEach(function (a) {
                var t = linearIn(a, v), p = ZERO, q = ZERO;
                t.forEach(function (x) { if (Object.keys(x.e).length) p = x.c; else q = x.c; });
                if (isZero(p)) throw new NotSupported();
                var edge = neg(div(q, p));
                var cond = bare(a) + ' > 0', sol = v + (p.n > 0n ? ' > ' : ' < ') + fmt(edge, ctx);
                [cond, sol].forEach(function (l) { if (dom.indexOf(l) < 0) dom.push(l); }); // [EN] „x > 0” raz, nie dwa razy
                if (p.n > 0n) { if (lo === null || toNum(edge) > toNum(lo)) lo = edge; } else { if (hi === null || toNum(edge) < toNum(hi)) hi = edge; }
            });
            var empty = lo !== null && hi !== null && toNum(lo) >= toNum(hi);
            var dText = empty ? '∅' : (lo === null ? '(−∞' : '(' + fmt(lo, ctx)) + ', ' + (hi === null ? '+∞)' : fmt(hi, ctx) + ')');
            steps.push({ label: 'Wyznaczam dziedzinę', math: dom.join('\n') + '\nD = ' + dText });
            if (empty) { // [EN] dziedzina pusta: dalej nie liczę (raport F, M4)
                steps.push({ label: 'Odpowiedź', math: 'Brak rozwiązań' });
                return done('Równanie', 'Brak rozwiązań', null, steps);
            }
            var res;
            if (isLog(other)) {
                var eqTxt = bare(Lg.a) + ' = ' + bare(other.a);
                steps.push({ label: 'Porównuję argumenty logarytmów', math: eqTxt });
                res = inner(eqTxt);
            } else {
                var c = evalExact(other, {});
                if (!isInt(c)) throw new NotSupported();
                var pw = c.n < 0n ? b.toString() + '^(' + fmt(c, ctx) + ')' : b.toString() + sup(c.n.toString());
                var val = powR(R(b), Number(c.n));
                var arg = bare(Lg.a);
                // [EN] kolor na potędze, która powstała z definicji (dymek: definicja-logarytmu)
                if (arg === v) { steps.push({ label: 'Korzystam z definicji logarytmu', math: v + ' = ⟦' + pw + '⟧ = ' + fmt(val, ctx), formula: { id: 'definicja-logarytmu' } }); res = null; }
                else { steps.push({ label: 'Korzystam z definicji logarytmu', math: arg + ' = ⟦' + pw + '⟧' + (fmt(val, ctx) === pw ? '' : '\n' + arg + ' = ' + fmt(val, ctx)), formula: { id: 'definicja-logarytmu' } }); res = inner(arg + ' = ' + fmt(val, ctx)); }
                if (!res) {
                    var x0 = val;
                    steps.push({ label: 'Sprawdzam dziedzinę', math: v + ' = ' + fmt(x0, ctx) + ' ∈ D' });
                    return finish(x0, fmt(x0, ctx), toNum(x0));
                }
            }
            steps = steps.concat(res.steps);
            var xs = answerOf(res), okDom = (lo === null || toNum(xs) > toNum(lo)) && (hi === null || toNum(xs) < toNum(hi));
            steps.push({ label: okDom ? 'Sprawdzam dziedzinę' : 'Odrzucam rozwiązanie spoza dziedziny', math: v + ' = ' + fmt(xs, ctx) + (okDom ? ' ∈ D' : ' ∉ D') });
            if (!okDom) { steps.push({ label: 'Odpowiedź', math: 'Brak rozwiązań' }); return done('Równanie', 'Brak rozwiązań', null, steps); }
            return finish(xs, fmt(xs, ctx), toNum(xs));
        }
        // ── wykładnicze: g^(A) = g^(B) albo g^(A) = c ──
        var sideOf = function (n) { // {base: q, exp: terms} albo {num: q}
            if (n.k === 'pow' && n.a.k === 'num' && hasVars(n.b)) return { base: n.a.v, exp: linearIn(n.b, v), node: n };
            if (!hasVars(n)) return { num: evalExact(n, {}) };
            throw new NotSupported();
        };
        var P = sideOf(lhs), Q = sideOf(rhs);
        if (!P.exp && !Q.exp) throw new NotSupported();
        var firstB = (P.exp ? P.base : Q.base);
        var g = smallestBase(firstB);
        if (!g) throw new NotSupported();
        var kOf = function (side) { return side.exp ? powerOf(side.base, g) : powerOf(side.num, g); };
        var kP = kOf(P), kQ = kOf(Q), gs = g.toString();
        var expText = function (k, t) { // [EN] wykładnik k·(a·x + b) jako tekst
            var sc = collect(t.map(function (q) { return { c: mul(q.c, R(BigInt(k))), e: q.e }; }));
            return showTerms(sc, ctx);
        };
        var powTxt = function (e) { e = e.replace(/^-/, '−'); return /^\d+$/.test(e) ? gs + sup(e) : /^[a-z]$/.test(e) ? gs + '^' + e : gs + '^(' + e + ')'; }; // [EN] 2³, 2^x, 2^(2x), 2^(−3)
        if (kP === null || kQ === null) { // [EN] brak wspólnej podstawy: logarytmuję (np. 2^x = 5)
            var E = P.exp ? P : Q, C = P.exp ? Q : P;
            if (!C.num || C.num.n <= 0n || !isInt(E.base) || E.base.n < 2n) throw new NotSupported();
            var bS = E.base.n.toString(), logT = 'log' + sub_(bS) + '(' + fmt(C.num, ctx) + ')', lv = Math.log(toNum(C.num)) / Math.log(Number(E.base.n));
            var eT = expText(1, E.exp);
            steps.push({ label: 'Zapisuję wykładnik jako logarytm', math: eT + ' = ' + logT });
            if (eT !== v) throw new NotSupported(); // shortcut: logarytm tylko przy samym x w wykładniku, rozszerzyć o x + 1 = log₂(5), gdy ktoś o to poprosi
            return finish(null, logT + ' ≈ ' + fmtApprox(lv), lv);
        }
        var sideTxt = function (s, k) { return s.exp ? (eq(s.base, R(g)) ? powTxt(expText(1, s.exp)) : '(' + gs + sup(String(k)) + ')' + '^' + (expText(1, s.exp).length > 1 ? '(' + expText(1, s.exp) + ')' : expText(1, s.exp))) : powTxt(String(k)); };
        var raw = sideTxt(P, kP) + ' = ' + sideTxt(Q, kQ);
        var flat = (P.exp ? powTxt(expText(kP, P.exp)) : powTxt(String(kP))) + ' = ' + (Q.exp ? powTxt(expText(kQ, Q.exp)) : powTxt(String(kQ)));
        steps.push({ label: 'Zapisuję obie strony jako potęgi ' + gs, math: raw === flat ? raw : raw + '\n' + flat });
        var eqE = (P.exp ? expText(kP, P.exp) : String(kP)) + ' = ' + (Q.exp ? expText(kQ, Q.exp) : String(kQ));
        eqE = eqE.replace(/(^| )-(\d)/g, '$1−$2');
        steps.push({ label: 'Porównuję wykładniki', math: eqE });
        var r2 = inner(eqE);
        steps = steps.concat(r2.steps);
        var xv = answerOf(r2);
        return finish(xv, fmt(xv, ctx), toNum(xv));
    }

    // ── Równania wymierne (plan „jak Photomath”, pkt 3): dziedzina, mnożenie przez mianownik, odrzucanie ──
    function hasVarDen(n) { return !!n && ((n.k === 'div' && !n.colon && hasVars(n.b)) || hasVarDen(n.a) || hasVarDen(n.b)); }
    function fracOf(n) { // [EN] cała strona to jeden ułamek z x w mianowniku albo wielomian; inne postacie — później
        if (n.k === 'div' && !n.colon && hasVars(n.b) && !hasVarDen(n.a) && !hasVarDen(n.b)) return { num: n.a, den: n.b };
        if (!hasVarDen(n)) return { num: n, den: null };
        throw new NotSupported();
    }
    function rootsOf(n, v) { // [EN] miejsca zerowe wielomianu, tylko gdy rozkłada się na czynniki liniowe o pierwiastkach wymiernych
        var c = coefs(collect(termsOf(n)), v), out = [];
        while (c.length > 2) { var r = rationalRoot(c); if (!r) throw new NotSupported(); out.push(r); c = deflate(c, r); }
        if (c.length === 2) out.push(neg(div(c[0], c[1])));
        return out.filter(function (r, i) { return out.findIndex(function (q) { return eq(q, r); }) === i; });
    }
    function solveRational(lhs, rhs, ctx) {
        var A = fracOf(lhs), B = fracOf(rhs), dens = [A.den, B.den].filter(Boolean);
        var v = varsOf(collect(termsOf(dens[0])))[0];
        if (!v || varsOf(collect(termsOf(A.num)).concat(collect(termsOf(B.num)))).some(function (w) { return w !== v; })) throw new NotSupported();
        var steps = [{ label: 'Równanie', math: show(lhs, ctx) + ' = ' + show(rhs, ctx) }];
        var bare = function (n) { return show(Object.assign({}, n, { paren: false }), ctx); }; // [EN] bez nawiasu z wpisu: (x − 2), nie ((x − 2))
        var wrap = function (n) { return n.k === 'add' || n.k === 'sub' || n.k === 'neg' ? '(' + bare(n) + ')' : bare(n); };
        var bad = [], lines = [];
        dens.forEach(function (d) {
            if (lines.indexOf(bare(d) + ' ≠ 0') >= 0) return;
            lines.push(bare(d) + ' ≠ 0');
            rootsOf(d, v).forEach(function (r) { if (!bad.some(function (q) { return eq(q, r); })) bad.push(r); });
        });
        bad.sort(function (p, q) { return toNum(p) - toNum(q); });
        var only = lines.length === 1 && lines[0] === v + ' ≠ 0';
        steps.push({ label: 'Wyznaczam dziedzinę', math: lines.join('\n') + (only ? '' : '\n' + bad.map(function (r) { return v + ' ≠ ' + fmt(r, ctx); }).join(',  '))
            + '\nD = ℝ \\ {' + bad.map(function (r) { return fmt(r, ctx); }).join(', ') + '}' });
        var times = function (a, b) { // [EN] 3(x − 2), x(x + 1), (x + 1)(x − 2) — bez zbędnej jedynki
            if (a.k === 'num' && eq(a.v, ONE)) return bare(b);
            var left = wrap(a), right = wrap(b);
            return left + (/^\(/.test(right) || (/[\d)]$/.test(left) && /^[a-z]/.test(right)) ? '' : ' · ') + right;
        };
        var cleared;
        if (A.den && B.den && bare(A.den) === bare(B.den)) {
            cleared = bare(A.num) + ' = ' + bare(B.num);
            steps.push({ label: 'Mnożę obie strony przez ' + wrap(A.den), math: cleared });
        } else if (A.den && B.den) {
            cleared = times(A.num, B.den) + ' = ' + times(B.num, A.den);
            steps.push({ label: 'Mnożę na krzyż', math: cleared });
        } else {
            var f = A.den ? A : B, o = A.den ? B : A;
            cleared = A.den ? bare(f.num) + ' = ' + times(o.num, f.den) : times(o.num, f.den) + ' = ' + bare(f.num);
            steps.push({ label: 'Mnożę obie strony przez ' + wrap(f.den), math: cleared });
        }
        var pr = parseEquationParts(cleared.replace(/−/g, '-').replace(/·/g, '*'), {});
        var inner = solveEquation(pr.lhs, pr.rhs);
        var inSteps = inner.explain ? inner.explain.steps : [];
        steps = steps.concat(inSteps.filter(function (st, i) { return i && st.label !== 'Sprawdzenie' && st.label !== 'Odpowiedź'; }));
        var last = inSteps[inSteps.length - 1], found = [];
        if (last && last.label === 'Odpowiedź') last.math.split('\n').forEach(function (l) {
            var t = l.replace(/^[a-z][₀-₉]*\s*=\s*/, '');
            found.push({ text: t, value: evalNum(parseTokens(tokenize(t.replace(/−/g, '-'), {})), {}) });
        });
        else if (inner.text !== 'Brak rozwiązań' && !/Brak rozwiązań/.test(inner.text)) throw new NotSupported(); // [EN] np. tożsamość — później
        var isBad = function (s) { return bad.some(function (r) { return Math.abs(toNum(r) - s.value) < 1e-12; }); };
        var kept = found.filter(function (s) { return !isBad(s); });
        if (found.length) steps.push({ label: kept.length === found.length ? 'Sprawdzam dziedzinę' : 'Odrzucam rozwiązanie spoza dziedziny',
            math: found.map(function (s) { return v + ' = ' + s.text + (isBad(s) ? ' ∉ D' : ' ∈ D'); }).join('\n') });
        kept.forEach(function (s) { // [EN] bezpiecznik: oryginał spełniony liczbowo
            var env = {}; env[v] = s.value;
            var l = evalNum(lhs, env), r = evalNum(rhs, env);
            if (!isFinite(l) || !isFinite(r) || Math.abs(l - r) > 1e-9 * (1 + Math.abs(l) + Math.abs(r))) throw new NotSupported();
        });
        var exact = kept.filter(function (s) { return /^[−\d/]+$/.test(s.text); });
        if (exact.length) steps.push({ label: 'Sprawdzenie', math: exact.map(function (s) {
            var q = parseTokens(tokenize(s.text.replace(/−/g, '-'), {})), val = evalExact(q, {});
            var env = {}; env[v] = val;
            var side = function (n) { var t = show(plugIn(n, v, val), ctx), w = fmt(evalExact(n, env), ctx); return t === w ? t : t + ' = ' + w; };
            return v + ' = ' + s.text + ':  L = ' + side(lhs) + ',  P = ' + side(rhs) + ' ✓';
        }).join('\n') });
        var text = !kept.length ? 'Brak rozwiązań' : kept.length === 1 ? v + ' = ' + kept[0].text
            : kept.map(function (s, i) { return v + sub_(i + 1) + ' = ' + s.text; }).join(', ');
        steps.push({ label: 'Odpowiedź', math: text.split(', ').join('\n') });
        return done('Równanie', text, kept.length === 1 ? kept[0].value : null, steps);
    }

    function solveEquation(lhs, rhs) {
        var ctx = { dec: hasDecimal(lhs) || hasDecimal(rhs) };
        if (hasVarDen(lhs) || hasVarDen(rhs)) return solveRational(lhs, rhs, ctx);
        if (hasExpLog(lhs) || hasExpLog(rhs)) return solveExpLog(lhs, rhs, ctx);
        if (hasKind(lhs, 'abs') || hasKind(rhs, 'abs')) return solveAbs(lhs, rhs, ctx);
        if (isTrig(lhs) || isTrig(rhs)) return solveTrig(lhs, rhs, ctx);
        if (hasVarSqrt(lhs) || hasVarSqrt(rhs)) return solveRadical(lhs, rhs, ctx);
        var steps = [{ label: 'Równanie', math: show(lhs, ctx) + ' = ' + show(rhs, ctx) }];
        // [EN] 5 = 2x − 7 → 2x − 7 = 5: niewiadoma po lewej, bez dwóch minusów (raport E, R2)
        if (!varsOf(collect(termsOf(lhs))).length && varsOf(collect(termsOf(rhs))).length) {
            var swap = lhs; lhs = rhs; rhs = swap;
            steps.push({ label: 'Zamieniam strony', math: show(lhs, ctx) + ' = ' + show(rhs, ctx) });
        }
        var rawL = termsOf(lhs), rawR = termsOf(rhs);
        var L = collect(rawL), Rr = collect(rawR);
        var opened = showTerms(rawL, ctx, true) + ' = ' + showTerms(rawR, ctx, true);
        var reduced = showTerms(L, ctx) + ' = ' + showTerms(Rr, ctx);
        var parens = hasParenGroup(lhs) || hasParenGroup(rhs);
        if (parens && opened !== steps[0].math && opened !== reduced) {
            steps.push({ label: 'Opuszczam nawiasy', math: opened });
        }
        // [EN] x = 52 + 65: po lewej już samo x — tylko liczę prawą stronę, sprawdzenie nic by nie dodało
        var lone = L.length === 1 && eq(L[0].c, ONE) && Object.keys(L[0].e).length === 1 && L[0].e[Object.keys(L[0].e)[0]] === 1 && !varsOf(Rr).length;
        if (lone) ctx.noCheck = true;
        var nz = function (list) { return list.filter(function (t) { return !isZero(t.c); }).length; };
        var merged = nz(rawL) !== L.length || nz(rawR) !== Rr.length; // [EN] sam inny zapis (x/2 → (1/2)x) to nie krok
        if (reduced !== steps[steps.length - 1].math && (merged || parens)) {
            steps.push({ label: lone ? 'Liczę prawą stronę' : parens && opened === reduced ? 'Opuszczam nawiasy' : 'Porządkuję i redukuję wyrazy podobne', math: reduced });
        }
        var diff = collect(rawL.concat(negTerms(rawR)));
        var vars = varsOf(diff);
        if (!vars.length) {
            var always = !diff.length;
            steps.push({
                label: always ? 'Zmienna się skróciła, a zostało zdanie prawdziwe' : 'Zmienna się skróciła, a zostało zdanie fałszywe',
                math: always ? '0 = 0' : fmt(diff[0].c, ctx) + ' = 0'
            });
            var text0 = always ? 'Każda liczba spełnia' : 'Brak rozwiązań';
            return done('Równanie', text0, null, steps);
        }
        var v = vars.indexOf('x') >= 0 ? 'x' : vars[0];
        var sol = [];
        if (vars.length > 1) return solveForVariable(diff, v, steps, ctx);

        var c = coefs(diff, v);
        if (c.length === 2) {
            var a = c[1], b = neg(c[0]);
            var moved = polyText([ZERO, a], v, ctx) + ' = ' + fmt(b, ctx);
            // [EN] najpierw samo przeniesienie (3x − x = 4 + 6), potem redukcja (2x = 10) — inaczej skok jest niewidoczny
            var hasV = function (t) { return !!t.e[v]; };
            var xR = Rr.filter(hasV), cL = L.filter(function (t) { return !hasV(t); });
            if (xR.length || cL.length) {
                var xs = L.filter(hasV).concat(negTerms(xR)), cs = Rr.filter(function (t) { return !hasV(t); }).concat(negTerms(cL));
                var shift = (xs.length ? showTerms(xs, ctx, true) : '0') + ' = ' + (cs.length ? showTerms(cs, ctx, true) : '0');
                if (shift !== moved && shift !== steps[steps.length - 1].math) {
                    steps.push({ label: xR.length && cL.length ? 'Przenoszę ' + v + ' na lewo, liczby na prawo' : xR.length ? 'Przenoszę ' + v + ' na lewo' : 'Przenoszę liczby na prawo', math: shift });
                    if (moved !== shift) steps.push({ label: 'Redukuję wyrazy podobne', math: moved });
                }
            }
            if (moved !== steps[steps.length - 1].math) {
                steps.push({ label: xR.length && !cL.length ? 'Przenoszę ' + v + ' na lewo' : !xR.length && cL.length ? 'Przenoszę liczby na prawo'
                    : !xR.length && !cL.length ? 'Liczę prawą stronę' : 'Przenoszę ' + v + ' na lewo, liczby na prawo', math: moved });
            }
            if (!eq(a, ONE) && !isInt(a)) { // [EN] (1/2)x = 2 → mnożę przez 2, nie dzielę przez 1/2 (raport E, R3)
                var inv = div(ONE, a);
                steps.push({ label: 'Mnożę obie strony przez ' + fmt(inv, ctx), math: v + ' = ' + fmt(b, ctx) + ' · ' + fmtParen(inv, ctx) + ' = ' + fmt(div(b, a), ctx) });
            } else if (eq(a, neg(ONE))) { // [EN] −x = 4 → x = −4, bez dzielenia przez −1
                steps.push({ label: 'Zmieniam znak obu stron', math: v + ' = ' + fmt(neg(b), ctx) });
            } else if (!eq(a, ONE)) {
                var q0 = fmt(b, ctx) + '/' + fmtDen(a, ctx), q1 = fmt(div(b, a), ctx); // [EN] x = 2/3, nie x = 2/3 = 2/3
                steps.push({ label: 'Dzielę obie strony przez ' + fmt(a, ctx), math: v + ' = ' + (q0 === q1 ? q1 : fmt(b, ctx) + ' / ' + fmtDen(a, ctx) + ' = ' + q1) });
            }
            sol.push({ r: div(b, a) });
        } else {
            var zero = polyText(c, v, ctx) + ' = 0';
            var pureSquare = c.length === 3 && isZero(c[1]);
            if (!pureSquare && zero !== steps[steps.length - 1].math) {
                steps.push({ label: 'Przenoszę wszystko na lewą stronę', math: zero });
            }
            solveDegree(c, v, steps, ctx, sol);
        }
        return finishSolutions(sol, v, lhs, rhs, steps, ctx);
    }

    // ── Nierówności (plan „jak Photomath”, pkt 1): liniowe i kwadratowe ──
    var FLIP = { '<': '>', '>': '<', '≤': '≥', '≥': '≤' };
    function strict(rel) { return rel === '<' || rel === '>'; }
    // [EN] zbiór: lista przedziałów {lo, hi, loIn, hiIn} (null = ∞) i opis tekstowy jak w szkole: (2, +∞), ⟨−2, 2⟩, ℝ, ∅
    function setText(parts, txt) {
        if (!parts.length) return '∅';
        return parts.map(function (p) {
            if (p.point) return '{' + txt(p.lo) + '}';
            if (p.lo === null && p.hi === null) return p.minus ? 'ℝ \\ {' + txt(p.minus) + '}' : 'ℝ';
            return (p.lo === null ? '(−∞' : (p.loIn ? '⟨' : '(') + txt(p.lo)) + ', ' + (p.hi === null ? '+∞)' : txt(p.hi) + (p.hiIn ? '⟩' : ')'));
        }).join(' ∪ ');
    }
    function inSet(parts, x) {
        return parts.some(function (p) {
            if (p.point) return Math.abs(x - p.lo.value) < 1e-12;
            if (p.minus) return Math.abs(x - p.minus.value) > 1e-12;
            var okLo = p.lo === null || x > p.lo.value || (p.loIn && Math.abs(x - p.lo.value) < 1e-12);
            var okHi = p.hi === null || x < p.hi.value || (p.hiIn && Math.abs(x - p.hi.value) < 1e-12);
            return okLo && okHi;
        });
    }
    function holds(val, rel) { return rel === '<' ? val < 0 : rel === '>' ? val > 0 : rel === '≤' ? val <= 1e-12 : val >= -1e-12; }
    // [EN] |A| < c → −c < A < c;  |A| > c → A < −c lub A > c (A liniowe)
    function absInequality(lhs, rel, rhs, ctx, steps) {
        if (hasVars(rhs) || hasKind(lhs.a, 'abs')) throw new NotSupported();
        var c = evalExact(rhs, {}), A = plain(lhs.a, ctx), t = collect(termsOf(lhs.a)), v = firstVar(lhs.a), p = ZERO, q = ZERO;
        t.forEach(function (x) { var ks = Object.keys(x.e); if (!ks.length) q = x.c; else if (ks.length === 1 && x.e[ks[0]] === 1) p = x.c; else throw new NotSupported(); });
        if (isZero(p)) throw new NotSupported();
        var at = function (k) { var r = div(sub(k, q), p); return { text: fmt(r, ctx), value: toNum(r), r: r }; }; // [EN] A = k → x
        var less = rel === '<' || rel === '≤', closed = !strict(rel), parts;
        var finish = function (pre) {
            var probe = [-1000, 1000, 0];
            parts.forEach(function (pp) { [pp.lo, pp.hi, pp.minus].forEach(function (e) { if (e) probe.push(e.value, e.value - 0.5, e.value + 0.5, e.value - 1e-4, e.value + 1e-4); }); });
            probe.forEach(function (x) { // [EN] bezpiecznik
                var val = Math.abs(toNum(p) * x + toNum(q)) - toNum(c);
                if (holds(val, rel) !== inSet(parts, x)) throw new NotSupported();
            });
            var text = v + ' ∈ ' + setText(parts, function (e) { return e.text; });
            steps.push({ label: 'Odpowiedź', math: (pre ? pre + '\n' : '') + text });
            return done('Nierówność', text, null, steps);
        };
        if (c.n < 0n || (isZero(c) && (rel === '<' || rel === '≥'))) { // [EN] |A| zawsze ≥ 0
            steps.push({ label: 'Wartość bezwzględna nie jest ujemna', math: '|' + A + '| ≥ 0' });
            parts = less ? [] : [{ lo: null, hi: null }];
            return finish('');
        }
        if (isZero(c)) { // |A| ≤ 0 → A = 0;  |A| > 0 → A ≠ 0
            var z = at(ZERO);
            steps.push({ label: rel === '≤' ? 'Wartość bezwzględna jest zerem tylko dla zera' : 'Wartość bezwzględna jest dodatnia poza zerem', math: A + (rel === '≤' ? ' = 0' : ' ≠ 0') });
            parts = rel === '≤' ? [{ point: true, lo: z }] : [{ lo: null, hi: null, minus: z }];
            return finish('');
        }
        var e1 = at(neg(c)), e2 = at(c), lo = e1.value < e2.value ? e1 : e2, hi = lo === e1 ? e2 : e1;
        if (less) {
            steps.push({ label: 'Zamieniam na podwójną nierówność', math: fmt(neg(c), ctx) + ' ' + rel + ' ' + A + ' ' + rel + ' ' + fmt(c, ctx) });
            steps.push({ label: 'Rozwiązuję podwójną nierówność', math: lo.text + ' ' + rel + ' ' + v + ' ' + rel + ' ' + hi.text });
            parts = [{ lo: lo, hi: hi, loIn: closed, hiIn: closed }];
        } else {
            var lessRel = closed ? '≤' : '<';
            steps.push({ label: 'Rozbijam na dwa przypadki', math: A + ' ' + lessRel + ' ' + fmt(neg(c), ctx) + ' lub ' + A + ' ' + rel + ' ' + fmt(c, ctx) });
            steps.push({ label: 'Rozwiązuję oba przypadki', math: v + ' ' + lessRel + ' ' + lo.text + ' lub ' + v + ' ' + rel + ' ' + hi.text });
            parts = [{ lo: null, hi: lo, hiIn: closed }, { lo: hi, hi: null, loIn: closed }];
        }
        return finish('');
    }
    function solveInequality(lhs, rel, rhs) {
        var ctx = { dec: hasDecimal(lhs) || hasDecimal(rhs) };
        if (rhs.k === 'abs' && lhs.k !== 'abs') return solveInequality(rhs, FLIP[rel], lhs); // [EN] 3 > |x − 2| → |x − 2| < 3
        var steps = [{ label: 'Nierówność', math: show(lhs, ctx) + ' ' + rel + ' ' + show(rhs, ctx) }];
        if (lhs.k === 'abs') return absInequality(lhs, rel, rhs, ctx, steps);
        var rawL = termsOf(lhs), rawR = termsOf(rhs), L = collect(rawL), Rr = collect(rawR);
        var diff = collect(rawL.concat(negTerms(rawR))), vars = varsOf(diff);
        var parts, v = vars.indexOf('x') >= 0 ? 'x' : vars[0];
        var answer = function (pre) {
            var txt = function (e) { return e.text; };
            var text = v + ' ∈ ' + setText(parts, txt);
            // [EN] bezpiecznik: każdy punkt próbny musi spełniać nierówność dokładnie wtedy, gdy należy do zbioru
            var c0 = v ? coefs(diff, v) : [diff.length ? diff[0].c : ZERO];
            var cuts = [0];
            parts.forEach(function (p) { [p.lo, p.hi, p.minus].forEach(function (e) { if (e) cuts.push(e.value); }); });
            var probe = [-1000, 1000];
            cuts.forEach(function (c) { probe.push(c, c - 0.5, c + 0.5, c - 1e-4, c + 1e-4); });
            probe.forEach(function (x) {
                var val = c0.reduce(function (acc, k, i) { return acc + toNum(k) * Math.pow(x, i); }, 0);
                if (holds(val, rel) !== inSet(parts, x)) throw new NotSupported();
            });
            steps.push({ label: 'Odpowiedź', math: (pre ? pre + '\n' : '') + text });
            return done('Nierówność', text, null, steps);
        };
        if (!vars.length) { // [EN] x + 1 > x: zmienna znika, zostaje zdanie prawdziwe albo fałszywe
            var k = diff.length ? diff[0].c : ZERO, truth = holds(toNum(k), rel);
            steps.push({ label: truth ? 'Zmienna się skróciła, a zostało zdanie prawdziwe' : 'Zmienna się skróciła, a zostało zdanie fałszywe', math: fmt(k, ctx) + ' ' + rel + ' 0' });
            v = varsOf(collect(rawL)).concat(varsOf(collect(rawR)))[0] || 'x';
            parts = truth ? [{ lo: null, hi: null }] : [];
            return answer('');
        }
        if (vars.length > 1) throw new NotSupported();
        var c = coefs(diff, v);
        if (c.length === 2) {
            var a = c[1], b = neg(c[0]);
            var hasV = function (t) { return !!t.e[v]; };
            var xR = Rr.filter(hasV), cL = L.filter(function (t) { return !hasV(t); });
            var moved = polyText([ZERO, a], v, ctx) + ' ' + rel + ' ' + fmt(b, ctx);
            if (xR.length || cL.length) {
                var xs = L.filter(hasV).concat(negTerms(xR)), cs = Rr.filter(function (t) { return !hasV(t); }).concat(negTerms(cL));
                var shift = (xs.length ? showTerms(xs, ctx, true) : '0') + ' ' + rel + ' ' + (cs.length ? showTerms(cs, ctx, true) : '0');
                if (shift !== moved) {
                    steps.push({ label: xR.length && cL.length ? 'Przenoszę ' + v + ' na lewo, liczby na prawo' : xR.length ? 'Przenoszę ' + v + ' na lewo' : 'Przenoszę liczby na prawo', math: shift });
                    steps.push({ label: 'Redukuję wyrazy podobne', math: moved });
                } else steps.push({ label: 'Przenoszę ' + v + ' na lewo, liczby na prawo', math: moved });
            }
            var r = div(b, a), relX = a.n < 0n ? FLIP[rel] : rel;
            if (a.n < 0n) steps.push({ label: 'Dzielę przez ' + fmt(a, ctx) + ' i odwracam znak', math: v + ' ' + relX + ' ' + fmt(b, ctx) + '/' + fmtDen(a, ctx) + ' = ' + fmt(r, ctx) });
            else if (!eq(a, ONE)) steps.push({ label: 'Dzielę obie strony przez ' + fmt(a, ctx), math: v + ' ' + relX + ' ' + fmt(b, ctx) + '/' + fmtDen(a, ctx) + ' = ' + fmt(r, ctx) });
            var end = { text: fmt(r, ctx), value: toNum(r) };
            parts = relX === '<' || relX === '≤' ? [{ lo: null, hi: end, hiIn: !strict(relX) }] : [{ lo: end, hi: null, loIn: !strict(relX) }];
            return answer(v + ' ' + relX + ' ' + end.text);
        }
        if (c.length !== 3) throw new NotSupported();
        if (L.length !== diff.length || Rr.length) steps.push({ label: 'Przenoszę wszystko na lewą stronę', math: polyText(c, v, ctx) + ' ' + rel + ' 0' });
        steps.push({ label: 'Szukam miejsc zerowych', math: polyText(c, v, ctx) + ' = 0' });
        var sol = [], mark = steps.length;
        solveQuadratic(c, v, steps, ctx, sol);
        steps.slice(mark).forEach(function (st) { // [EN] w nierówności „brak rozwiązań” równania znaczy tylko: parabola nie przecina osi
            if (/^Delta ujemna/.test(st.label)) { st.label = 'Brak miejsc zerowych'; st.math = 'Δ < 0'; }
            else if (/^Kwadrat nie może być ujemny/.test(st.label)) { st.label = 'Brak miejsc zerowych'; st.math = polyText(c, v, ctx) + ' ≠ 0'; }
        });
        var roots = sol.map(function (q) { return q.r ? { text: fmt(q.r, ctx), value: toNum(q.r) } : { text: q.text, value: q.value }; })
            .sort(function (p, q) { return p.value - q.value; })
            .filter(function (q, i, all) { return !i || Math.abs(q.value - all[i - 1].value) > 1e-12; });
        var up = c[2].n > 0n, wantNeg = (rel === '<' || rel === '≤') === up; // [EN] „ujemne przy ramionach w górę” = między pierwiastkami
        var closed = !strict(rel);
        steps.push({ label: 'Odczytuję znak z paraboli', math: 'a = ' + fmt(c[2], ctx) + (up ? ' > 0' : ' < 0'), parabola: { up: up, between: wantNeg, roots: roots.length } });
        if (roots.length === 2) {
            parts = wantNeg ? [{ lo: roots[0], hi: roots[1], loIn: closed, hiIn: closed }]
                : [{ lo: null, hi: roots[0], hiIn: closed }, { lo: roots[1], hi: null, loIn: closed }];
        } else if (roots.length === 1) {
            parts = wantNeg ? (closed ? [{ point: true, lo: roots[0] }] : []) : (closed ? [{ lo: null, hi: null }] : [{ lo: null, hi: null, minus: roots[0] }]);
        } else parts = wantNeg ? [] : [{ lo: null, hi: null }];
        return answer('');
    }

    // ── Układ dwóch równań liniowych (plan „jak Photomath”, pkt 2): podstawianie i przeciwne współczynniki ──
    function solveSystem(parts) {
        if (parts.some(function (p) { return !p.lhs || p.rel !== '='; })) throw new NotSupported();
        var ctx = { dec: parts.some(function (p) { return hasDecimal(p.lhs) || hasDecimal(p.rhs); }) };
        var diffs = parts.map(function (p) { return collect(termsOf(p.lhs).concat(negTerms(termsOf(p.rhs)))); });
        var vars = varsOf(diffs[0].concat(diffs[1])).sort();
        if (vars.length !== 2) throw new NotSupported();
        var X = vars[0], Y = vars[1];
        // [EN] a·x + b·y = c, tylko liniowo
        var lin = diffs.map(function (d) {
            var row = { a: ZERO, b: ZERO, c: ZERO };
            d.forEach(function (t) {
                var ks = Object.keys(t.e);
                if (!ks.length) row.c = neg(t.c);
                else if (ks.length === 1 && t.e[ks[0]] === 1) row[ks[0] === X ? 'a' : 'b'] = t.c;
                else throw new NotSupported();
            });
            return row;
        });
        var eqText = function (r) {
            var list = [];
            if (!isZero(r.a)) list.push({ c: r.a, e: (function () { var e = {}; e[X] = 1; return e; })() });
            if (!isZero(r.b)) list.push({ c: r.b, e: (function () { var e = {}; e[Y] = 1; return e; })() });
            return showTerms(list, ctx, true) + ' = ' + fmt(r.c, ctx);
        };
        var head = [{ label: 'Układ równań', math: parts.map(function (p) { return show(p.lhs, ctx) + ' = ' + show(p.rhs, ctx); }).join('\n') }];
        var tidy = lin.map(eqText).join('\n');
        if (tidy !== head[0].math) head.push({ label: 'Porządkuję równania', math: tidy });
        var A = lin[0], B = lin[1], det = sub(mul(A.a, B.b), mul(B.a, A.b));
        if (isZero(det)) { // [EN] lewe strony proporcjonalne: sprzeczny albo nieoznaczony
            var k = !isZero(A.a) ? div(B.a, A.a) : div(B.b, A.b), same = eq(mul(A.c, k), B.c);
            var steps0 = head.concat([{ label: 'Lewe strony są proporcjonalne', math: '(' + eqText(B).split(' = ')[0] + ') = ' + fmtParen(k, ctx) + ' · (' + eqText(A).split(' = ')[0] + ')' },
                { label: same ? 'Prawe strony też — to jedno równanie' : 'Prawe strony nie — układ jest sprzeczny', math: fmt(B.c, ctx) + (same ? ' = ' : ' ≠ ') + fmtParen(k, ctx) + ' · ' + fmtParen(A.c, ctx) }]);
            var free = !isZero(A.b) ? Y + ' = ' + showTerms(collect([{ c: div(A.c, A.b), e: {} }, { c: neg(div(A.a, A.b)), e: (function () { var e = {}; e[X] = 1; return e; })() }]), ctx) : X + ' = ' + fmt(div(A.c, A.a), ctx);
            var text0 = same ? 'Nieskończenie wiele rozwiązań: ' + free : 'Brak rozwiązań';
            steps0.push({ label: 'Odpowiedź', math: text0 });
            return done('Układ równań', text0, null, steps0);
        }
        var xv = div(sub(mul(A.c, B.b), mul(B.c, A.b)), det), yv = div(sub(mul(A.a, B.c), mul(B.a, A.c)), det);
        // [EN] bezpiecznik: wynik spełnia oba równania wprowadzone przez użytkownika, dokładnie
        var env = {}; env[X] = xv; env[Y] = yv;
        parts.forEach(function (p) { if (!eq(evalExact(p.lhs, env), evalExact(p.rhs, env))) throw new NotSupported(); });
        var plugged = function (n) { return show(plugIn(plugIn(n, X, xv), Y, yv), ctx); };
        var check = { label: 'Sprawdzenie', math: parts.map(function (p) {
            var l = evalExact(p.lhs, env), lt = plugged(p.lhs), rt = plugged(p.rhs);
            return lt + (lt === fmt(l, ctx) ? '' : ' = ' + fmt(l, ctx)) + (rt === fmt(l, ctx) ? '' : ' = ' + rt) + ' ✓';
        }).join('\n') };
        var ans = X + ' = ' + fmt(xv, ctx) + '\n' + Y + ' = ' + fmt(yv, ctx);
        var inner = function (src) { // [EN] kroki równania z jedną niewiadomą, bez nagłówka, sprawdzenia i odpowiedzi
            var pr = parseEquationParts(src, {}), r = solveEquation(pr.lhs, pr.rhs);
            return r.explain.steps.filter(function (st, i) { return i && st.label !== 'Sprawdzenie' && st.label !== 'Odpowiedź'; });
        };
        var ord = ['pierwszego', 'drugiego'];
        // ── podstawianie: niewiadoma ze współczynnikiem ±1, najlepiej y z pierwszego ──
        var pick = [[0, 'b'], [0, 'a'], [1, 'b'], [1, 'a']].filter(function (q) { var c0 = lin[q[0]][q[1]]; return eq(c0, ONE) || eq(c0, neg(ONE)); })[0] || [0, isZero(A.b) ? 'a' : 'b'];
        var I = pick[0], key = pick[1], W = key === 'b' ? Y : X, O = key === 'b' ? X : Y, oKey = key === 'b' ? 'a' : 'b';
        var row = lin[I], other = lin[1 - I], kw = row[key];
        var oe = {}; oe[O] = 1;
        var cT = { c: div(row.c, kw), e: {} }, vT = { c: neg(div(row[oKey], kw)), e: oe };
        // [EN] jak w zeszycie: y = 3x − 1, ale y = 5 − x (bez minusa na początku)
        var exprTerms = (vT.c.n < 0n && cT.c.n > 0n ? [cT, vT] : [vT, cT]).filter(function (t) { return !isZero(t.c); });
        var expr = exprTerms.length ? showTerms(exprTerms, ctx, true) : '0';
        var put = function (coef, txt, first) { // [EN] k · (wyrażenie) z dobrym znakiem; liczba po liczbie z kropką: 2 · 3, nie 23
            if (isZero(coef)) return '';
            var abs = coef.n < 0n ? neg(coef) : coef, body = eq(abs, ONE) ? txt : fmt(abs, ctx) + (/^[\d(]/.test(txt) && !/^\(.*[+−].*\)$/.test(txt) ? ' · ' : '') + txt;
            return (first ? (coef.n < 0n ? '−' : '') : (coef.n < 0n ? ' − ' : ' + ')) + body;
        };
        // [EN] nawias tylko wokół sumy albo gdy przed wyrażeniem stoi liczba: 3x − 2(4 − x), ale 2y + y
        var wrapped = exprTerms.length > 1 || !eq(other[key].n < 0n ? neg(other[key]) : other[key], ONE) || /^−/.test(expr) ? '(' + expr + ')' : expr;
        var subst = (oKey === 'a' ? put(other[oKey], O, true) + put(other[key], wrapped, isZero(other[oKey])) : put(other[key], wrapped, true) + put(other[oKey], O, false)) + ' = ' + fmt(other.c, ctx);
        var oVal = O === X ? xv : yv, wVal = W === X ? xv : yv;
        var exprAst = parseTokens(tokenize(expr.replace(/−/g, '-'), {}));
        var back = show(plugIn(exprAst, O, oVal), ctx);
        var subSteps = head.concat([
            { label: 'Wyznaczam ' + W + ' z ' + ord[I] + ' równania', math: W + ' = ' + expr },
            { label: 'Podstawiam do ' + ord[1 - I] + ' równania', math: subst }
        ], inner(subst), [
            { label: 'Wstawiam ' + O + ' = ' + fmt(oVal, ctx), math: W + ' = ' + back + (back === fmt(wVal, ctx) ? '' : ' = ' + fmt(wVal, ctx)) },
            check, { label: 'Odpowiedź', math: ans }
        ]);
        // ── przeciwne współczynniki: usuwam y (albo x, gdy już są przeciwne) ──
        var eKey = eq(A.a, neg(B.a)) && !eq(A.b, neg(B.b)) ? 'a' : 'b', keep = eKey === 'b' ? 'a' : 'b', V = keep === 'a' ? X : Y, U = keep === 'a' ? Y : X;
        var m1 = B[eKey], m2 = neg(A[eKey]);
        if (isInt(m1) && isInt(m2)) { var g = R(gcd(m1.n < 0n ? -m1.n : m1.n, m2.n < 0n ? -m2.n : m2.n)); m1 = div(m1, g); m2 = div(m2, g); }
        if (m1.n < 0n) { m1 = neg(m1); m2 = neg(m2); }
        var scale = function (r, m) { return { a: mul(r.a, m), b: mul(r.b, m), c: mul(r.c, m) }; };
        var s1 = scale(A, m1), s2 = scale(B, m2), sumK = add(s1[keep], s2[keep]), sumC = add(s1.c, s2.c);
        var elSteps = head.slice();
        if (!eq(m1, ONE) || !eq(m2, ONE)) {
            var what = [eq(m1, ONE) ? '' : 'pierwsze przez ' + fmt(m1, ctx), eq(m2, ONE) ? '' : 'drugie przez ' + fmt(m2, ctx)].filter(Boolean).join(', ');
            elSteps.push({ label: 'Mnożę ' + what, math: eqText(s1) + '\n' + eqText(s2) });
        }
        var ve = {}; ve[V] = 1;
        elSteps.push({ label: 'Dodaję równania stronami', math: showTerms([{ c: sumK, e: ve }], ctx, true) + ' = ' + fmt(sumC, ctx) });
        var vVal = V === X ? xv : yv;
        if (!eq(sumK, ONE)) elSteps.push({ label: 'Dzielę obie strony przez ' + fmt(sumK, ctx), math: V + ' = ' + fmt(sumC, ctx) + '/' + fmtDen(sumK, ctx) + ' = ' + fmt(vVal, ctx) });
        var into = isZero(A[eKey]) ? 1 : 0, back2 = put(lin[into][keep], fmtParen(vVal, ctx), true);
        var withV = (keep === 'a' ? back2 + put(lin[into][eKey], U, !back2) : put(lin[into][eKey], U, true) + put(lin[into][keep], fmtParen(vVal, ctx), false)) + ' = ' + fmt(lin[into].c, ctx);
        elSteps = elSteps.concat([{ label: 'Wstawiam ' + V + ' = ' + fmt(vVal, ctx) + ' do ' + ord[into] + ' równania', math: withV }], inner(withV), [check, { label: 'Odpowiedź', math: ans, final: true }]);
        var text = X + ' = ' + fmt(xv, ctx) + ', ' + Y + ' = ' + fmt(yv, ctx);
        var res = done('Układ równań', text, null, subSteps);
        res.explain.methods = [{ label: 'Podstawianie', steps: subSteps }, { label: 'Przeciwne współczynniki', steps: elSteps }];
        return res;
    }

    function solveForVariable(diff, v, steps, ctx) { // [EN] kilka zmiennych: tylko liniowo względem v
        var a = ZERO, others = [];
        diff.forEach(function (t) {
            var p = t.e[v] || 0;
            if (p > 1 || (p === 1 && Object.keys(t.e).length > 1)) throw new NotSupported();
            if (p === 1) a = t.c; else others.push({ c: neg(t.c), e: t.e });
        });
        if (isZero(a)) throw new NotSupported();
        var rest = showTerms(others, ctx);
        steps.push({ label: 'Wyznaczam ' + v + ': resztę przenoszę na prawą stronę', math: polyText([ZERO, a], v, ctx) + ' = ' + rest });
        var res = others.map(function (t) { return { c: div(t.c, a), e: t.e }; });
        var text = v + ' = ' + showTerms(res, ctx);
        if (!eq(a, ONE)) steps.push({ label: 'Dzielę obie strony przez ' + fmt(a, ctx), math: text });
        return done('Równanie', text, null, steps);
    }

    // [EN] drzewo z liczbą w miejscu zmiennej; 5x → 5 · 2 (bez sklejania), liczba ujemna w nawiasie
    function plugIn(n, v, r) {
        if (n.k === 'var' && n.v === v) return { k: 'num', v: r, paren: r.n < 0n || !isInt(r), frac: !isInt(r) };
        if (!n.a) return n;
        var out = {};
        Object.keys(n).forEach(function (key) { out[key] = n[key]; });
        out.a = plugIn(n.a, v, r);
        if (n.b) out.b = plugIn(n.b, v, r);
        if (n.k === 'mul' && n.implicit && (leftVar(n.b, v) || (n.a.k === 'var' && n.a.v === v))) out.implicit = false;
        return out;
    }
    function leftVar(n, v) { // [EN] czy zapis zaczyna się od zmiennej v (6x² → 6 · 1², nie 61²)
        while (n && !n.paren && n.k !== 'sqrt' && n.k !== 'fn' && n.k !== 'neg' && n.a) n = n.a;
        return !!n && !n.paren && n.k === 'var' && n.v === v;
    }
    function finishSolutions(sol, v, lhs, rhs, steps, ctx) {
        var seen = {}, list = [];
        sol.forEach(function (s) {
            var value = s.r ? toNum(s.r) : s.value;
            var key = value.toPrecision(12);
            if (seen[key]) return;
            seen[key] = 1;
            list.push({ r: s.r, value: value, text: s.r ? fmt(s.r, ctx) : s.text });
        });
        list.sort(function (x, y) { return x.value - y.value; });
        list.forEach(function (s) { // [EN] bezpiecznik: wynik musi spełniać oryginał
            var env = {}; env[v] = s.value;
            var l = evalNum(lhs, env), r = evalNum(rhs, env);
            if (!isFinite(l) || !isFinite(r) || Math.abs(l - r) > 1e-6 * (1 + Math.abs(l) + Math.abs(r))) throw new NotSupported();
        });
        if (!list.length) return done('Równanie', 'Brak rozwiązań rzeczywistych', null, steps);
        var check = list.filter(function (s) { return s.r; }).slice(0, 3).map(function (s) {
            var env = {}; env[v] = s.r;
            var a = evalExact(lhs, env), b = evalExact(rhs, env);
            if (!eq(a, b)) throw new NotSupported();
            // [EN] widać podstawienie: L = 3(5 − 2) = 9, nie samo L = 9
            var side = function (n, val) { var t = show(plugIn(n, v, s.r), ctx); return t === fmt(val, ctx) ? t : t + ' = ' + fmt(val, ctx); };
            return v + ' = ' + s.text + ':  L = ' + side(lhs, a) + ',  P = ' + side(rhs, b) + ' ✓';
        });
        if (check.length && !ctx.noCheck) steps.push({ label: 'Sprawdzenie', math: check.join('\n') });
        var text = list.length === 1
            ? v + ' = ' + list[0].text
            : list.map(function (s, i) { return v + sub_(i + 1) + ' = ' + s.text; }).join(', ');
        steps.push({ label: 'Odpowiedź', math: text.split(', ').join('\n') });
        if (text.length > 34) { // [EN] na ekranik przybliżenie; dokładna postać jest w krokach
            text = list.map(function (s, i) {
                return (list.length > 1 ? v + sub_(i + 1) : v) + ' ≈ ' + fmtApprox(s.value);
            }).join(', ');
        }
        return done('Równanie', text, list.length === 1 ? list[0].value : null, steps);
    }

    // ── Upraszczanie i rozkład ───────────────────────────────
    function simplify(ast) {
        var ctx = { dec: hasDecimal(ast) };
        var start = show(ast, ctx);
        var steps = [{ label: 'Wyrażenie', math: start }];
        var raw = termsOf(ast);
        var opened = showTerms(raw, ctx, true);
        var final = showTerms(collect(raw), ctx);
        if (hasParenGroup(ast) && opened !== start && opened !== final) {
            // [EN] (a + b)² → wzór skróconego mnożenia w dymku (słownik: kwadrat-sumy)
            steps.push(hasSquaredSum(ast) ? { label: 'Rozpisuję kwadrat sumy', math: underlineSquare(ast, opened, ctx), formula: { id: 'kwadrat-sumy' } } : { label: 'Opuszczam nawiasy', math: opened });
        }
        if (final !== steps[steps.length - 1].math.replace(/[⟦⟧]/g, '')) {
            steps.push({ label: 'Redukuję wyrazy podobne', math: final });
        }
        return done('Upraszczanie', final, null, steps);
    }

    function underlineSquare(ast, opened, ctx) { // [EN] (x + 1)² + 2x → ⟦x² + x + x + 1⟧ + 2x
        if ((ast.k === 'add' || ast.k === 'sub') && hasSquaredSum(ast.a) && !hasSquaredSum(ast.b)) {
            var pre = showTerms(termsOf(ast.a), ctx, true);
            if (opened.indexOf(pre) === 0) return '⟦' + pre + '⟧' + opened.slice(pre.length);
        }
        return '⟦' + opened + '⟧';
    }
    function hasSquaredSum(n) {
        if (n.k === 'pow' && (n.a.k === 'add' || n.a.k === 'sub') && n.b.k === 'num' && eq(n.b.v, R(2))) return true;
        return (n.a ? hasSquaredSum(n.a) : false) || (n.b ? hasSquaredSum(n.b) : false);
    }
    function factorize(ast) {
        var ctx = { dec: hasDecimal(ast) };
        var steps = [{ label: 'Wyrażenie', math: show(ast, ctx) }];
        var poly = sorted(collect(termsOf(ast)));
        if (poly.length < 2) return done('Rozkład', showTerms(poly, ctx), null, steps);
        var vars = varsOf(poly);
        var den = poly.reduce(function (l, t) { return (l * t.c.d) / gcd(l, t.c.d); }, 1n);
        var g = poly.reduce(function (acc, t) { return gcd(acc, mul(t.c, R(den)).n); }, 0n);
        var head = R(g, den);
        if (poly[0].c.n < 0n) head = neg(head);
        var common = {};
        vars.forEach(function (v) {
            var m = Math.min.apply(null, poly.map(function (t) { return t.e[v] || 0; }));
            if (m > 0) common[v] = m;
        });
        var rest = poly.map(function (t) {
            var e = {};
            Object.keys(t.e).forEach(function (v) {
                var left = t.e[v] - (common[v] || 0);
                if (left) e[v] = left;
            });
            return { c: div(t.c, head), e: e };
        });
        var prefix = showTerms([{ c: head, e: common }], ctx);
        if (prefix === '1') prefix = '';
        if (prefix === '−1') prefix = '−';
        if (prefix) steps.push({ label: 'Wyłączam wspólny czynnik przed nawias', math: prefix + '(' + showTerms(rest, ctx) + ')' });

        var result = prefix ? prefix + '(' + showTerms(rest, ctx) + ')' : showTerms(rest, ctx);
        var restVars = varsOf(rest);
        if (restVars.length === 1) {
            var v = restVars[0], c = coefs(rest, v), factors = [], lead = c[c.length - 1];
            if (c.length === 3 && isZero(c[1]) && eq(lead, ONE) && c[0].n < 0n && sqrtExact(neg(c[0]))) {
                var b = sqrtExact(neg(c[0]));
                steps.push({ label: 'Rozkładam różnicę kwadratów', math: v + '² − ' + fmt(b, ctx) + '² = ⟦(' + v + ' − ' + fmt(b, ctx) + ')(' + v + ' + ' + fmt(b, ctx) + ')⟧', formula: { id: 'roznica-kwadratow' } });
            }
            var cur = c;
            while (cur.length > 2) {
                var r = rationalRoot(cur);
                if (!r) break;
                factors.push(r);
                cur = deflate(cur, r);
            }
            var leftover = cur;
            if (leftover.length === 2) {
                factors.push(neg(div(leftover[0], leftover[1])));
                lead = leftover[1];
                leftover = null;
            } else {
                lead = ONE;
            }
            if (factors.length) {
                factors.sort(function (x, y) { // [EN] (x − 2)(x + 2), (x − 2)(x − 3)
                    var ax = x.n < 0n ? neg(x) : x, ay = y.n < 0n ? neg(y) : y;
                    return cmp(ax, ay) || cmp(y, x);
                });
                var groups = [];
                factors.forEach(function (r) {
                    var last = groups[groups.length - 1];
                    if (last && eq(last.r, r)) last.n++; else groups.push({ r: r, n: 1 });
                });
                var body = groups.map(function (f) {
                    var inner = isZero(f.r) ? v : v + (f.r.n < 0n ? ' + ' + fmt(neg(f.r), ctx) : ' − ' + fmt(f.r, ctx));
                    var wrapped = isZero(f.r) ? inner : '(' + inner + ')';
                    return f.n > 1 ? (isZero(f.r) ? inner + sup(f.n) : wrapped + sup(f.n)) : wrapped;
                }).join('');
                if (leftover) body += '(' + polyText(leftover, v, ctx) + ')';
                var leadText = eq(lead, ONE) ? '' : fmtParen(lead, ctx);
                result = prefix + leadText + body;
                var last = steps[steps.length - 1];
                if (last.label.indexOf('Rozkładam różnicę') === 0) {
                    if (prefix) steps.push({ label: 'Składam całość', math: result });
                } else if (last.math !== result) {
                    // [EN] najpierw miejsca zerowe, potem postać iloczynowa (słownik: postac-iloczynowa)
                    var uniq = groups.map(function (f) { return f.r; });
                    // [EN] trójmian: miejsca zerowe z delty, z rachunkiem (raport E, R5), nie gotowe x₁, x₂
                    if (c.length === 3 && !isZero(c[0]) && !isZero(c[1])) {
                        var quad = [];
                        solveQuadratic(c, v, quad, ctx, []);
                        quad.forEach(function (q) { steps.push(q); });
                    } else steps.push({ label: 'Szukam miejsc zerowych', math: uniq.map(function (r, i) { return v + (uniq.length > 1 ? sub_(i + 1) : '₀') + ' = ' + fmt(r, ctx); }).join(',  ') });
                    steps.push({ label: 'Zapisuję postać iloczynową', math: prefix + leadText + '⟦' + body + '⟧', formula: { id: 'postac-iloczynowa' } });
                }
            } else {
                steps.push({ label: 'Nie ma pierwiastków wymiernych, więc dalej się nie rozkłada', math: result });
            }
        } else if (!prefix) {
            steps.push({ label: 'Nie ma wspólnego czynnika, więc zostaje bez zmian', math: showTerms(rest, ctx) });
            result = showTerms(rest, ctx);
        }
        return done('Rozkład na czynniki', result, null, steps);
    }

    // ── Rachunki krok po kroku ───────────────────────────────
    function foldFractions(n) { // [EN] 1/2 to ułamek, nie działanie
        if (n.a) n.a = foldFractions(n.a);
        if (n.b) n.b = foldFractions(n.b);
        if (n.k === 'div' && !n.colon && n.a.k === 'num' && n.b.k === 'num' && isInt(n.a.v) && isInt(n.b.v) && !isZero(n.b.v)) {
            var r = R(n.a.v.n, n.b.v.n);
            if (r.n * n.b.v.n === n.a.v.n * r.d && n.b.v.n === r.d) {
                return { k: 'num', v: r, paren: false, frac: !isInt(r) };
            }
        }
        return n;
    }
    function findReducible(n) { // [EN] najgłębsze, skrajnie lewe działanie na liczbach
        if (n.k === 'num') return null;
        var deep = (n.a && findReducible(n.a)) || (n.b && findReducible(n.b));
        if (deep) return deep;
        if (n.a && n.a.k === 'num' && (!n.b || n.b.k === 'num')) return n;
        return null;
    }
    var OP_LABEL = { add: 'Dodaję', sub: 'Odejmuję', mul: 'Mnożę', div: 'Dzielę', pow: 'Potęguję', neg: 'Zmieniam znak', sqrt: 'Liczę pierwiastek' };

    // ── Pierwiastki liczbowe: Σ qᵢ·√tᵢ, mapa t → wymierne ───
    function hasSqrt(n) {
        return n.k === 'sqrt' || (n.a ? hasSqrt(n.a) : false) || (n.b ? hasSqrt(n.b) : false);
    }
    function hasSum(n) {
        return n.k === 'add' || n.k === 'sub' || (n.a ? hasSum(n.a) : false) || (n.b ? hasSum(n.b) : false);
    }
    function sPut(o, t, c) {
        var k = t.toString();
        o[k] = o[k] ? add(o[k], c) : c;
        if (isZero(o[k])) delete o[k];
        return o;
    }
    function sAdd(a, b) {
        var o = {};
        [a, b].forEach(function (m) { Object.keys(m).forEach(function (k) { sPut(o, k, m[k]); }); });
        return o;
    }
    function sScale(a, c) {
        var o = {};
        Object.keys(a).forEach(function (k) { sPut(o, k, mul(a[k], c)); });
        return o;
    }
    function sMul(a, b) { // [EN] √s·√t = g·√(s/g · t/g), g = NWD(s, t)
        var o = {};
        Object.keys(a).forEach(function (ka) {
            Object.keys(b).forEach(function (kb) {
                var s = BigInt(ka), t = BigInt(kb), g = gcd(s, t);
                sPut(o, (s / g) * (t / g), mul(mul(a[ka], b[kb]), R(g)));
            });
        });
        return o;
    }
    function sRational(a) { // [EN] liczba wymierna albo null
        var keys = Object.keys(a);
        return keys.length === 0 ? ZERO : (keys.length === 1 && keys[0] === '1' ? a['1'] : null);
    }
    function sValue(a) {
        return Object.keys(a).reduce(function (v, k) { return v + toNum(a[k]) * Math.sqrt(Number(k)); }, 0);
    }
    function sKeys(a) { // [EN] najpierw pierwiastki rosnąco, liczba na końcu
        return Object.keys(a).sort(function (x, y) {
            if (x === '1' || y === '1') return x === '1' ? 1 : -1;
            return BigInt(x) < BigInt(y) ? -1 : 1;
        });
    }
    function sText(a) { // [EN] wspólny mianownik: (√3 + 1)/2
        var keys = sKeys(a);
        if (!keys.length) return '0';
        var den = keys.reduce(function (l, k) { return (l * a[k].d) / gcd(l, a[k].d); }, 1n);
        var body = keys.map(function (k, i) {
            var c = mul(a[k], R(den)).n, abs = c < 0n ? -c : c;
            var term = k === '1' ? abs.toString() : (abs === 1n ? '' : abs.toString()) + '√' + k;
            return (i === 0 ? (c < 0n ? '−' : '') : (c < 0n ? ' − ' : ' + ')) + term;
        }).join('');
        if (den === 1n) return body;
        return (keys.length > 1 ? '(' + body + ')' : body) + '/' + den.toString();
    }
    function sDiv(a, b, steps) { // [EN] dzielenie przez q√t albo p√s + q√t: mnożę przez sprzężenie
        var r = sRational(b);
        if (r) {
            if (isZero(r)) throw new NotSupported();
            return sScale(a, div(ONE, r));
        }
        var keys = sKeys(b), conj = {};
        if (keys.length === 1) conj[keys[0]] = ONE;
        else if (keys.length === 2) { conj[keys[0]] = b[keys[0]]; conj[keys[1]] = neg(b[keys[1]]); }
        else throw new NotSupported();
        var den = sRational(sMul(b, conj));
        if (!den || isZero(den)) throw new NotSupported();
        var res = sScale(sMul(a, conj), div(ONE, den));
        var par = function (x) { return /[ /]/.test(x) ? '(' + x + ')' : x; };
        var C = par(sText(conj));
        steps.push({
            label: 'Usuwamy niewymierność z mianownika',
            math: par(sText(a)) + '·' + C + '/(' + par(sText(b)) + '·' + C + ') = ' + sText(res)
        });
        return res;
    }
    function surdEval(n, steps, ctx) {
        var one = function (c) { return { 1: c }; };
        switch (n.k) {
            case 'num': return isZero(n.v) ? {} : one(n.v);
            case 'add': return sAdd(surdEval(n.a, steps, ctx), surdEval(n.b, steps, ctx));
            case 'sub': return sAdd(surdEval(n.a, steps, ctx), sScale(surdEval(n.b, steps, ctx), neg(ONE)));
            case 'neg': return sScale(surdEval(n.a, steps, ctx), neg(ONE));
            case 'mul': return sMul(surdEval(n.a, steps, ctx), surdEval(n.b, steps, ctx));
            case 'div': return sDiv(surdEval(n.a, steps, ctx), surdEval(n.b, steps, ctx), steps);
            case 'pow':
                var k = sRational(surdEval(n.b, steps, ctx));
                if (!k || !isInt(k) || k.n > BigInt(MAX_POW) || k.n < -BigInt(MAX_POW)) throw new NotSupported();
                var base = surdEval(n.a, steps, ctx), out = one(ONE);
                for (var i = 0; i < Math.abs(Number(k.n)); i++) out = sMul(out, base);
                return k.n < 0n ? sDiv(one(ONE), out, steps) : out;
            case 'sqrt':
                var r = sRational(surdEval(n.a, steps, ctx));
                if (!r || r.n < 0n) throw new NotSupported();
                var sr = simplifiedRoot(r), res = {};
                if (sr.t > 1n) ctx.irr = true;
                sPut(res, sr.t, sr.q);
                var s = sr.q.n * sr.q.d / r.d; // [EN] wyciągnięty czynnik dla liczby całkowitej
                if (isInt(r) && s > 1n && sr.t > 1n) {
                    var plain = '√' + r.n.toString();
                    steps.push({
                        label: 'Wyciągam kwadrat spod pierwiastka',
                        math: (n.a.k === 'num' ? '' : show(n, ctx) + ' = ') + plain + ' = √(' + (s * s).toString() + '·' + sr.t.toString() + ') = ' + sText(res)
                    });
                }
                return res;
        }
        throw new NotSupported();
    }
    function surds(ast) { // [EN] null = brak niewymierności, niech liczy zwykła ścieżka
        if (!hasSqrt(ast)) return null;
        var ctx = { dec: hasDecimal(ast) };
        var steps = [{ label: 'Wyrażenie', math: show(ast, ctx) }];
        var res;
        try { res = surdEval(ast, steps, ctx); }
        catch (e) { if (e instanceof NotSupported) return null; throw e; }
        if (!ctx.irr) return null; // [EN] same pierwiastki wymierne: zwykłe kroki działania
        var text = sText(res), value = sValue(res), want = evalNum(ast, {});
        if (!(Math.abs(value - want) <= 1e-9 * Math.max(1, Math.abs(want)))) return unsupported();
        var lastMath = steps[steps.length - 1].math;
        if (lastMath !== text && lastMath.slice(-text.length - 3) !== ' = ' + text) {
            steps.push({ label: hasSum(ast) ? 'Redukuję wyrazy podobne' : 'Wynik', math: text });
        }
        if (!sRational(res)) steps.push({ label: 'Wynik w przybliżeniu', math: text + ' ≈ ' + fmtApprox(value) });
        return done('Upraszczanie pierwiastków', text, value, steps);
    }

    function fmtQ(q) { return q.n < 0n ? '(' + fmt(q) + ')' : fmt(q); } // [EN] ułamek ujemny w nawiasie przy mnożeniu
    function arithmetic(ast) {
        var ctx = { dec: hasDecimal(ast) };
        var exact = surds(ast);
        if (exact) return exact;
        var tree = foldFractions(ast);
        var steps = [{ label: 'Działanie', math: show(tree, ctx) }];
        for (var guard = 0; tree.k !== 'num' && guard < 60; guard++) {
            var node = findReducible(tree);
            if (!node || !OP_LABEL[node.k]) throw new NotSupported();
            var label = node.paren ? 'Najpierw nawias: ' + OP_LABEL[node.k].toLowerCase() : OP_LABEL[node.k];
            var value = evalExact(node, {});
            var fracs = !ctx.dec && (node.k === 'add' || node.k === 'sub') && !isInt(node.a.v) && !isInt(node.b.v);
            if (fracs && node.a.v.d !== node.b.v.d) {
                var lcm = (node.a.v.d * node.b.v.d) / gcd(node.a.v.d, node.b.v.d);
                // [EN] widać rozszerzanie: (1 · 3)/(2 · 3), nie gotowe 3/6
                var widen = function (q) { var f = lcm / q.d; return f === 1n ? fmt(q) : '(' + fmt(R(q.n)) + ' · ' + f + ')/(' + q.d + ' · ' + f + ')'; };
                var op = node.k === 'add' ? ' + ' : ' − ';
                steps.push({
                    dens: [node.a.v.d.toString(), node.b.v.d.toString(), lcm.toString()], // [EN] do zdania „dlaczego”: 12 dzieli 4 i 6
                    label: 'Sprowadzam do wspólnego mianownika ' + lcm.toString(),
                    math: widen(node.a.v) + op + widen(node.b.v) + ' = ' + fmt(mul(node.a.v, R(lcm))) + '/' + lcm + op + fmt(mul(node.b.v, R(lcm))) + '/' + lcm
                });
            }
            if (fracs) label = node.paren ? 'Najpierw nawias: ' + (node.k === 'add' ? 'dodaję liczniki' : 'odejmuję liczniki') : (node.k === 'add' ? 'Dodaję liczniki' : 'Odejmuję liczniki');
            if (fracs && node === tree) { // [EN] 4/6 + 5/6 = 9/6, potem osobno skracanie do 3/2 — bez ukrytego kroku
                var den = node.a.v.d === node.b.v.d ? node.a.v.d : (node.a.v.d * node.b.v.d) / gcd(node.a.v.d, node.b.v.d);
                var rawN = mul(value, R(den)).n;
                // [EN] 3/6 + 2/6 = (3 + 2)/6 = 5/6 — dodawanie liczników widać (raport E, U2)
                var nA = mul(node.a.v, R(den)), nB = mul(node.b.v, R(den)), sign = node.k === 'add' ? ' + ' : ' − ';
                var counted = fmt(nA) + '/' + den + sign + fmt(nB) + '/' + den + ' = (' + fmt(nA) + sign + fmtParen(nB) + ')/' + den + ' = ' + fmt(R(rawN)) + '/' + den;
                if (value.d !== den && isInt(mul(value, R(den)))) {
                    steps.push({ label: label, math: counted });
                    label = 'Skracam ułamek';
                    tree = { k: 'num', v: value, frac: !isInt(value) };
                    steps.push({ label: label, math: fmt(R(rawN)) + '/' + den + ' = ' + show(tree, ctx) });
                    continue;
                }
            }
            var whole = null;
            if (fracs && node === tree && value.d === den) whole = counted.replace(/ = [^=]*$/, '') + ' = ' + fmt(value); // [EN] bez skracania
            var fr = !ctx.dec && node === tree && (node.k === 'mul' || node.k === 'div') && node.a.k === 'num' && node.b.k === 'num' && !(isInt(node.a.v) && isInt(node.b.v));
            if (fr) { // [EN] 2/3 · 9/4 = (2 · 9)/(3 · 4) = 18/12 = 3/2; dzielenie: mnożę przez odwrotność
                var A = node.a.v, B = node.k === 'div' ? div(ONE, node.b.v) : node.b.v;
                var piece = function (x, y) { return x === 1n ? fmt(R(y)) : y === 1n ? fmt(R(x)) : fmt(R(x)) + ' · ' + fmt(R(y)); };
                var topN = A.n * B.n, botN = A.d * B.d;
                var chain = (node.k === 'div' ? fmtQ(A) + ' : ' + fmtQ(node.b.v) + ' = ' : '') + fmtQ(A) + ' · ' + fmtQ(B) + ' = (' + piece(A.n, B.n) + ')/' + (A.d === 1n || B.d === 1n ? piece(A.d, B.d) : '(' + piece(A.d, B.d) + ')')
                    + ' = ' + fmt(R(topN)) + (botN === 1n ? '' : '/' + botN) + (fmt(R(topN, botN)) === fmt(R(topN)) + (botN === 1n ? '' : '/' + botN) ? '' : ' = ' + fmt(value));
                label = node.k === 'mul' ? 'Mnożę ułamki' : 'Dzielę ułamki';
                whole = chain;
            }
            ['a', 'b'].forEach(function (key) { delete node[key]; });
            node.k = 'num'; node.v = value; node.paren = false; node.implicit = false;
            node.frac = !isInt(value);
            steps.push({ label: label, math: whole || show(tree, ctx) });
        }
        if (tree.k !== 'num') throw new NotSupported();
        var text = fmt(tree.v, ctx);
        if (!isInt(tree.v) && !(ctx.dec && decimalOf(tree.v))) {
            steps.push({ label: 'Wynik w przybliżeniu', math: text + ' ≈ ' + fmtApprox(toNum(tree.v)) });
        }
        return done('Działanie', text, toNum(tree.v), steps);
    }

    function done(title, text, value, steps) {
        steps[steps.length - 1].final = true;
        return { kind: 'steps', text: text, value: value, explain: { title: title, steps: steps } };
    }
    function unsupported() { return { kind: 'steps', text: UNSUPPORTED, value: null, explain: null }; }

    // ── Wejście ──────────────────────────────────────────────
    var FOLD = { 'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z' };
    function fold(s) {
        return String(s || '').toLowerCase().replace(/[ąćęłńóśźż]/g, function (c) { return FOLD[c]; }).trim();
    }
    var HEADS = [
        { re: /^(?:rozwiaz|solve)\b[:\s]*/, mode: 'solve' },
        { re: /^(?:uprosc|rozwin|simplify|expand)\b[:\s]*/, mode: 'simplify' },
        { re: /^(?:rozloz|factor)\b[:\s]*/, mode: 'factor' },
        { re: /^(?:nwd|gcd)(?=[\s(]|$)[:\s]*/, mode: 'gcd' },
        { re: /^(?:nww|lcm)(?=[\s(]|$)[:\s]*/, mode: 'lcm' },
        { re: /^(?:wierzcholek|vertex)\b[:\s]*/, mode: 'vertex' },
        { re: /^(?:krok po kroku|kroki|step by step|steps)\b[:\s]*/, mode: 'auto' }
    ];
    var TAIL = /\s+(?:krok po kroku|step by step)$/;

    function detect(raw) { // [EN] komenda z nazwy; zwykłe działania zostają w parserze
        var s = fold(raw);
        if (!s || s.length > MAX_INPUT) return null;
        for (var i = 0; i < HEADS.length; i++) {
            var m = HEADS[i].re.exec(s);
            if (m) {
                var body = s.slice(m[0].length).replace(TAIL, '').trim();
                return body ? { mode: HEADS[i].mode, src: body } : null;
            }
        }
        if (TAIL.test(s)) return { mode: 'auto', src: s.replace(TAIL, '').trim() };
        return null;
    }

    function parseEquationParts(src, opts) {
        var tokens = tokenize(src, opts);
        var at = -1, count = 0;
        tokens.forEach(function (t, i) { if (t.t === 'op' && '=<>≤≥'.indexOf(t.v) >= 0) { at = i; count++; } });
        if (count > 1) throw new SyntaxError('eq');
        if (at < 0) return { expr: parseTokens(tokens) };
        return { lhs: parseTokens(tokens.slice(0, at)), rhs: parseTokens(tokens.slice(at + 1)), rel: tokens[at].v };
    }

    // ── NWD i NWW przez rozkład na czynniki pierwsze (plan „jak Photomath”, pkt 7) ──
    function primeFactors(n) {
        var out = [];
        for (var p = 2n; p * p <= n; p++) while (n % p === 0n) { out.push(p); n /= p; }
        if (n > 1n) out.push(n);
        return out;
    }
    function gcdLcm(src, mode) {
        if (!/^[\s(),;\d]+$/.test(src)) throw new SyntaxError('nwd');
        var nums = (src.match(/\d+/g) || []).map(function (x) { return BigInt(x); });
        if (nums.length < 2 || nums.some(function (n) { return n < 1n || n > 1000000000n; })) throw new NotSupported();
        var NAME = mode === 'gcd' ? 'NWD' : 'NWW', head = NAME + '(' + nums.join(', ') + ')';
        var fs = nums.map(primeFactors);
        var steps = [{ label: 'Liczby', math: nums.join(', ') }];
        steps.push({ label: 'Rozkładam na czynniki pierwsze', math: nums.map(function (n, i) { return n + ' = ' + (fs[i].length ? fs[i].join(' · ') : '1'); }).join('\n') });
        var count = function (list) { var m = {}; list.forEach(function (p) { m[p] = (m[p] || 0) + 1; }); return m; };
        var maps = fs.map(count), primes = Object.keys(Object.assign.apply(null, [{}].concat(maps))).map(BigInt).sort(function (a, b) { return a < b ? -1 : 1; });
        var pick = [];
        primes.forEach(function (p) {
            var ks = maps.map(function (m) { return m[p] || 0; }), k = mode === 'gcd' ? Math.min.apply(null, ks) : Math.max.apply(null, ks);
            for (var j = 0; j < k; j++) pick.push(p);
        });
        var value = pick.reduce(function (a, b) { return a * b; }, 1n);
        // [EN] bezpiecznik: wynik dzieli wszystkie liczby (NWD) / jest ich wielokrotnością (NWW), sprawdzone Euklidesem
        var e = nums.reduce(function (a, b) { return gcd(a, b); }), l = nums.reduce(function (a, b) { return a / gcd(a, b) * b; });
        if (value !== (mode === 'gcd' ? e : l)) throw new NotSupported();
        if (!pick.length) steps.push({ label: 'Nie ma wspólnych czynników', math: head + ' = 1' });
        else steps.push({ label: mode === 'gcd' ? 'Mnożę wspólne czynniki' : 'Mnożę czynniki w najwyższej potędze', math: head + ' = ' + (pick.length > 1 ? pick.join(' · ') + ' = ' : '') + value });
        steps.push({ label: 'Wynik', math: head + ' = ' + value });
        return done(NAME, value.toString(), Number(value), steps);
    }

    // ── Wierzchołek paraboli: p = −b/(2a), q = f(p), postać kanoniczna ──
    function vertex(src) {
        var body = src.replace(/^(?:y|f\s*\(\s*x\s*\))\s*=\s*/, '');
        var ast = parseTokens(tokenize(body, {}));
        var t = collect(termsOf(ast)), vars = varsOf(t);
        if (vars.length !== 1) throw new NotSupported();
        var v = vars[0], c = coefs(t, v), ctx = { dec: hasDecimal(ast) };
        if (c.length !== 3 || isZero(c[2])) throw new NotSupported();
        var a = c[2], b = c[1], k = c[0], twoA = mul(R(2), a), p = div(neg(b), twoA);
        var env = {}; env[v] = p;
        var q = evalExact(ast, env);
        var f = 'f(' + v + ')';
        var steps = [{ label: 'Funkcja', math: f + ' = ' + polyText(c, v, ctx) }];
        steps.push({ label: 'Odczytuję współczynniki', math: 'a = ' + fmt(a, ctx) + ', b = ' + fmt(b, ctx) + ', c = ' + fmt(k, ctx) });
        var mb = b.n < 0n ? '−(' + fmt(b, ctx) + ')' : '−' + fmt(b, ctx);
        var raw = fmt(neg(b), ctx) + '/' + fmtDen(twoA, ctx);
        steps.push({ label: 'Liczę p', math: 'p = ⟦' + mb + '/(2 · ' + fmtParen(a, ctx) + ')⟧ = ' + (raw === fmt(p, ctx) || eq(twoA, ONE) ? '' : raw + ' = ') + fmt(p, ctx), formula: { id: 'wierzcholek', here: 'a = ' + fmt(a, ctx) + ', b = ' + fmt(b, ctx) } });
        steps.push({ label: 'Liczę q', math: 'q = f(' + fmt(p, ctx) + ') = ' + show(plugIn(ast, v, p), ctx) + ' = ' + fmt(q, ctx) });
        var inner = isZero(p) ? v : '(' + v + (p.n < 0n ? ' + ' + fmt(neg(p), ctx) : ' − ' + fmt(p, ctx)) + ')';
        var lead = eq(a, ONE) ? '' : eq(a, neg(ONE)) ? '−' : fmt(a, ctx);
        var canon = lead + inner + '²' + (isZero(q) ? '' : q.n < 0n ? ' − ' + fmt(neg(q), ctx) : ' + ' + fmt(q, ctx));
        steps.push({ label: 'Zapisuję postać kanoniczną', math: f + ' = ' + canon });
        if (!isZero(add(mul(twoA, p), b))) throw new NotSupported(); // [EN] bezpiecznik: f′(p) = 2ap + b = 0
        var text = 'W = (' + fmt(p, ctx) + ', ' + fmt(q, ctx) + ')';
        steps.push({ label: 'Odpowiedź', math: text });
        return done('Funkcja kwadratowa', text, null, steps);
    }

    // ── Procenty krok po kroku: P% z B, B ± P%, ile procent A z B ──
    function percentSteps(src) {
        var N = '(\\d+(?:[.,]\\d+)?)', num = function (t) {
            var x = t.replace(',', '.').split('.');
            return x[1] ? R(BigInt(x[0] + x[1]), 10n ** BigInt(x[1].length)) : R(BigInt(x[0]));
        };
        var ctx = { dec: /[.,]\d/.test(src) }, steps, m;
        var toFrac = function (P) { // 20% = 20/100 = 1/5
            var f = div(P, R(100n)), raw = fmt(P, ctx) + '/100';
            return { f: f, step: { label: 'Zamieniam procent na ułamek', math: fmt(P, ctx) + '% = ' + raw + (fmt(f, ctx) === raw ? '' : ' = ' + fmt(f, ctx)) } };
        };
        if ((m = new RegExp('^' + N + '\\s*%\\s*(?:z|of)\\s*' + N + '$').exec(src))) {
            var P = num(m[1]), B = num(m[2]), tf = toFrac(P), v = mul(tf.f, B);
            steps = [{ label: 'Działanie', math: fmt(P, ctx) + '% z ' + fmt(B, ctx) }, tf.step, { label: 'Mnożę ułamek przez liczbę', math: fmt(tf.f, ctx) + ' · ' + fmt(B, ctx) + ' = ' + fmt(v, ctx) }];
            steps.push({ label: 'Wynik', math: fmt(v, ctx) });
            return done('Procenty', fmt(v, ctx), toNum(v), steps);
        }
        if ((m = new RegExp('^' + N + '\\s*([+\\-−])\\s*' + N + '\\s*%$').exec(src))) {
            var B2 = num(m[1]), plus = m[2] === '+', P2 = num(m[3]), tf2 = toFrac(P2), part = mul(tf2.f, B2), v2 = plus ? add(B2, part) : sub(B2, part);
            steps = [{ label: 'Działanie', math: fmt(B2, ctx) + (plus ? ' + ' : ' − ') + fmt(P2, ctx) + '%' }, tf2.step,
                { label: 'Liczę procent z liczby', math: fmt(tf2.f, ctx) + ' · ' + fmt(B2, ctx) + ' = ' + fmt(part, ctx) },
                { label: plus ? 'Dodaję procent do liczby' : 'Odejmuję procent od liczby', math: fmt(B2, ctx) + (plus ? ' + ' : ' − ') + fmt(part, ctx) + ' = ' + fmt(v2, ctx) }];
            steps.push({ label: 'Wynik', math: fmt(v2, ctx) });
            return done('Procenty', fmt(v2, ctx), toNum(v2), steps);
        }
        if ((m = new RegExp('^ile\\s*(?:procent|%)\\s*(?:stanowi\\s*)?' + N + '\\s*z\\s*' + N + '$').exec(src))) {
            var A = num(m[1]), B3 = num(m[2]);
            if (isZero(B3)) throw new NotSupported();
            var q = div(A, B3), pc = mul(q, R(100n)), raw3 = fmt(A, ctx) + '/' + fmt(B3, ctx);
            steps = [{ label: 'Działanie', math: 'ile procent ' + fmt(A, ctx) + ' z ' + fmt(B3, ctx) },
                { label: 'Zapisuję część jako ułamek', math: raw3 + (fmt(q, ctx) === raw3 ? '' : ' = ' + fmt(q, ctx)) },
                { label: 'Zamieniam ułamek na procent', math: fmt(q, ctx) + ' · 100% = ' + fmt(pc, ctx) + '%' }];
            steps.push({ label: 'Wynik', math: fmt(pc, ctx) + '%' });
            return done('Procenty', fmt(pc, ctx) + '%', toNum(pc), steps);
        }
        return null;
    }
    function runParsed(d, opts) {
        if (d.mode === 'auto' && /%|procent/.test(d.src)) { var pr = percentSteps(d.src.trim()); if (pr) return pr; }
        if (d.mode === 'gcd' || d.mode === 'lcm') return gcdLcm(d.src, d.mode);
        if (d.mode === 'vertex') return vertex(d.src);
        // [EN] układ: „x + y = 5, x − y = 1” albo ze średnikiem; przecinek bez spacji to ułamek dziesiętny (2,5)
        var eqs = d.mode === 'simplify' || d.mode === 'factor' ? [d.src] : d.src.split(/\s*;\s*|,\s+(?=[^,]*=)/);
        if (eqs.length === 2 && eqs.every(function (e) { return e.indexOf('=') >= 0; })) {
            return solveSystem(eqs.map(function (e) { return parseEquationParts(e, opts || {}); }));
        }
        var parts = parseEquationParts(d.src, opts || {});
        if (parts.lhs) {
            if (d.mode === 'simplify' || d.mode === 'factor') return null;
            if (parts.rel !== '=') return solveInequality(parts.lhs, parts.rel, parts.rhs);
            return solveEquation(parts.lhs, parts.rhs);
        }
        var ast = parts.expr;
        if (d.mode === 'solve') {
            if (!hasVars(ast)) return null;
            return solveEquation(ast, { k: 'num', v: ZERO });
        }
        if (d.mode === 'factor') return factorize(ast);
        if (d.mode === 'simplify') return hasVars(ast) ? simplify(ast) : arithmetic(ast);
        return hasVars(ast) ? simplify(ast) : arithmetic(ast);
    }
    function safely(fn) {
        try { return fn(); }
        catch (e) {
            if (e instanceof NotSupported || e instanceof RangeError) return unsupported();
            return null; // [EN] jeszcze niedopisane wyrażenie
        }
    }

    var _last = { key: null, value: null }; // [EN] liveEval woła to przy każdym znaku
    function memo(key, fn) {
        if (_last.key === key) return _last.value;
        var value = safely(fn);
        _last = { key: key, value: value };
        return value;
    }

    var _calculus = null; // [EN] js/math-calculus.js: pochodne i całki
    var _limits = null;   // [EN] js/math-limits.js: granice
    function run(raw) { // [EN] jawna komenda („rozwiąż …”); null = nie nasza
        var l = _limits && _limits.detect(raw);
        if (l) return memo('l:' + raw, function () { return _limits.run(l); });
        var c = _calculus && _calculus.detect(raw);
        if (c) return memo('d:' + raw, function () { return _calculus.run(c); });
        var d = detect(raw);
        if (!d) return null;
        return memo('c:' + raw, function () { return runParsed(d, {}); });
    }
    function runBare(raw) { // [EN] gołe „2x + 3 = 7”, gdy parser nie dał wyniku
        var s = fold(raw);
        if (!s || s.length > MAX_INPUT || !/[=<>≤≥]/.test(s) || !/[a-z]/.test(s)) return null;
        if (/^[a-z]\s*(?:=|<=?|>=?|≤|≥)\s*-?[\d.,]+$/.test(s)) return null; // [EN] „x = 5”, „x > 2” to już odpowiedź
        var res = memo('b:' + raw, function () {
            return runParsed({ mode: 'solve', src: s }, { singleLetters: true });
        });
        return res && res.explain ? res : null; // [EN] bez komendy nie obiecujemy rozwiązania
    }

    var API = {
        detect: detect, run: run, runBare: runBare,
        registerCalculus: function (mod) { _calculus = mod; },
        registerLimits: function (mod) { _limits = mod; },
        _core: {
            NotSupported: NotSupported, R: R, ZERO: ZERO, ONE: ONE, gcd: gcd, add: add, neg: neg, sub: sub,
            mul: mul, div: div, isZero: isZero, isInt: isInt, eq: eq, toNum: toNum, powR: powR,
            sqrtExact: sqrtExact, sup: sup, sub_: sub_, fmt: fmt, fmtApprox: fmtApprox, fold: fold, done: done,
            MAX_INPUT: MAX_INPUT,
            parse: function (src) { return parseTokens(tokenize(src, { calculus: true })); }
        }
    };
    if (typeof window !== 'undefined') window.MATM0_STEPS = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
