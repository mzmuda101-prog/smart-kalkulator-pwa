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
            if ('+-*/^()='.indexOf(c) >= 0) { out.push({ t: 'op', v: c }); i++; continue; }
            if (c === '−' || c === '–') { out.push({ t: 'op', v: '-' }); i++; continue; }
            if (c === '×' || c === '·' || c === '∙') { out.push({ t: 'op', v: '*' }); i++; continue; }
            if (c === '÷' || c === ':') { out.push({ t: 'op', v: '/' }); i++; continue; }
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
            return !!t && (t.t === 'var' || t.t === 'sqrt' || t.t === 'fn' || t.t === 'const' || (t.t === 'op' && t.v === '('));
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
                if (isOp('*')) { i++; left = { k: 'mul', a: left, b: power() }; continue; }
                if (isOp('/')) { i++; left = { k: 'div', a: left, b: power() }; continue; }
                if (startsFactor()) { left = { k: 'mul', a: left, b: power(), implicit: true }; continue; }
                return left;
            }
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
            if (t.t === 'const') return { k: 'const', v: t.v };
            if (t.t === 'fn') {
                if (isOp('^')) { // [EN] sin²x, sin^2(x)
                    i++;
                    var outer = atom();
                    return { k: 'pow', a: { k: 'fn', f: t.v, a: fnArg() }, b: outer };
                }
                return { k: 'fn', f: t.v, a: fnArg() };
            }
            if (t.t === 'op' && t.v === '(') {
                var inner = sum();
                if (!isOp(')')) throw new SyntaxError('paren');
                i++;
                inner.paren = true;
                return inner;
            }
            if (t.t === 'op' && t.v === '-') return { k: 'neg', a: atom() };
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
            case 'div': s = show(n.a, ctx) + '/' + show(n.b, ctx); break;
            case 'pow':
                s = n.b.k === 'num' && isInt(n.b.v) && n.b.v.n >= 0n
                    ? showFactor(n.a, ctx) + sup(n.b.v.n.toString())
                    : showFactor(n.a, ctx) + '^' + show(n.b, ctx);
                break;
            case 'sqrt': s = '√' + (n.a.k === 'num' || n.a.paren ? show(n.a, ctx) : '(' + show(n.a, ctx) + ')'); break;
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
    function solveQuadratic(c, v, steps, ctx, sol) {
        var a = c[2], b = c[1], k = c[0];
        if (!isZero(b)) {
            steps.push({ label: 'Odczytuję współczynniki', math: 'a = ' + fmt(a, ctx) + ', b = ' + fmt(b, ctx) + ', c = ' + fmt(k, ctx) });
        }
        if (isZero(b)) {
            var rhs = neg(div(k, a));
            var isolated = v + '² = ' + fmt(rhs, ctx);
            if (isolated !== steps[steps.length - 1].math) {
                steps.push({ label: 'Nie ma wyrazu z ' + v + ', więc zostawiam ' + v + '² po lewej', math: isolated });
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
            steps.push({ label: 'Nie ma wyrazu wolnego, więc wyłączam ' + v + ' przed nawias', math: v + '(' + polyText([b, a], v, ctx) + ') = 0' });
            steps.push({ label: 'Iloczyn jest zerem, gdy zeruje się któryś czynnik', math: v + ' = 0 lub ' + v + ' = ' + fmt(other, ctx) });
            sol.push({ r: ZERO }, { r: other });
            return;
        }
        var delta = sub(mul(b, b), mul(R(4), mul(a, k)));
        steps.push({
            label: 'Liczę wyróżnik: Δ = b² − 4ac',
            math: 'Δ = ' + fmtParen(b, ctx) + '² − 4 · ' + fmtParen(a, ctx) + ' · ' + fmtParen(k, ctx) + ' = ' + fmt(delta, ctx)
        });
        var twoA = mul(R(2), a);
        var minusB = neg(b);
        if (delta.n < 0n) {
            steps.push({ label: 'Δ < 0, więc parabola nie przecina osi', math: 'brak rozwiązań rzeczywistych' });
            return;
        }
        if (isZero(delta)) {
            var x0 = div(minusB, twoA);
            steps.push({ label: 'Δ = 0, więc jest jedno rozwiązanie: x₀ = −b / 2a', math: v + '₀ = ' + fmt(minusB, ctx) + ' / ' + fmtDen(twoA, ctx) + ' = ' + fmt(x0, ctx) });
            sol.push({ r: x0 });
            return;
        }
        var root = sqrtExact(delta);
        if (root) {
            var x1 = div(sub(minusB, root), twoA), x2 = div(add(minusB, root), twoA);
            steps.push({ label: 'Pierwiastek z wyróżnika', math: '√Δ = ' + fmt(root, ctx) });
            steps.push({
                label: 'Δ > 0, więc są dwa rozwiązania: (−b ∓ √Δ) / 2a',
                math: v + '₁ = (' + fmt(minusB, ctx) + ' − ' + fmt(root, ctx) + ') / ' + fmtDen(twoA, ctx) + ' = ' + fmt(x1, ctx) +
                    '\n' + v + '₂ = (' + fmt(minusB, ctx) + ' + ' + fmt(root, ctx) + ') / ' + fmtDen(twoA, ctx) + ' = ' + fmt(x2, ctx)
            });
            sol.push({ r: x1 }, { r: x2 });
            return;
        }
        var s = simplifiedRoot(delta);
        var p = div(minusB, twoA), q = div(s.q, twoA);
        var r1 = surdRoot(p, q, s.t, -1), r2 = surdRoot(p, q, s.t, 1);
        steps.push({ label: 'Pierwiastek z wyróżnika upraszczam', math: '√Δ = ' + surdText(s.q, s.t) });
        steps.push({
            label: 'Δ > 0, więc są dwa rozwiązania: (−b ∓ √Δ) / 2a',
            math: v + '₁ = ' + r1.text + ' ≈ ' + fmtApprox(r1.value) + '\n' + v + '₂ = ' + r2.text + ' ≈ ' + fmtApprox(r2.value)
        });
        sol.push({ text: r1.text, value: r1.value }, { text: r2.text, value: r2.value });
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
        steps.push({
            label: 'Szukam pierwiastka wśród dzielników wyrazu wolnego i dzielę wielomian przez (' + v + (r.n < 0n ? ' + ' + fmt(neg(r), ctx) : ' − ' + fmt(r, ctx)) + ')',
            math: v + ' = ' + fmt(r, ctx) + ' pasuje, zostaje: ' + polyText(low, v, ctx) + ' = 0'
        });
        solveDegree(low, v, steps, ctx, sol);
    }

    function solveEquation(lhs, rhs) {
        var ctx = { dec: hasDecimal(lhs) || hasDecimal(rhs) };
        var steps = [{ label: 'Równanie', math: show(lhs, ctx) + ' = ' + show(rhs, ctx) }];
        var rawL = termsOf(lhs), rawR = termsOf(rhs);
        var L = collect(rawL), Rr = collect(rawR);
        var opened = showTerms(rawL, ctx, true) + ' = ' + showTerms(rawR, ctx, true);
        var reduced = showTerms(L, ctx) + ' = ' + showTerms(Rr, ctx);
        var parens = hasParenGroup(lhs) || hasParenGroup(rhs);
        if (parens && opened !== steps[0].math && opened !== reduced) {
            steps.push({ label: 'Opuszczam nawiasy', math: opened });
        }
        if (reduced !== steps[steps.length - 1].math) {
            steps.push({ label: parens && opened === reduced ? 'Opuszczam nawiasy' : 'Porządkuję i redukuję wyrazy podobne', math: reduced });
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
            if (moved !== steps[steps.length - 1].math) {
                steps.push({ label: 'Wyrazy z ' + v + ' przenoszę na lewą stronę, liczby na prawą (zmieniam znak)', math: moved });
            }
            if (!eq(a, ONE)) {
                steps.push({ label: 'Dzielę obie strony przez ' + fmt(a, ctx), math: v + ' = ' + fmt(b, ctx) + ' / ' + fmtDen(a, ctx) + ' = ' + fmt(div(b, a), ctx) });
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
            return v + ' = ' + s.text + ': L = ' + fmt(a, ctx) + ', P = ' + fmt(b, ctx) + ' ✓';
        });
        if (check.length) steps.push({ label: 'Sprawdzenie', math: check.join('\n') });
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
            steps.push({ label: 'Opuszczam nawiasy', math: opened });
        }
        if (final !== steps[steps.length - 1].math) {
            steps.push({ label: 'Redukuję wyrazy podobne', math: final });
        }
        return done('Upraszczanie', final, null, steps);
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
                steps.push({ label: 'Różnica kwadratów: a² − b² = (a − b)(a + b)', math: v + '² − ' + fmt(b, ctx) + '² = (' + v + ' − ' + fmt(b, ctx) + ')(' + v + ' + ' + fmt(b, ctx) + ')' });
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
                if (last.label.indexOf('Różnica') === 0) {
                    if (prefix) steps.push({ label: 'Składam całość', math: result });
                } else if (last.math !== result) {
                    steps.push({ label: 'Pierwiastki wielomianu dają czynniki (x − pierwiastek)', math: result });
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
        if (n.k === 'div' && n.a.k === 'num' && n.b.k === 'num' && isInt(n.a.v) && isInt(n.b.v) && !isZero(n.b.v)) {
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
    var OP_LABEL = { add: 'Dodawanie', sub: 'Odejmowanie', mul: 'Mnożenie', div: 'Dzielenie', pow: 'Potęgowanie', neg: 'Zmiana znaku', sqrt: 'Pierwiastek' };

    function arithmetic(ast) {
        var ctx = { dec: hasDecimal(ast) };
        var tree = foldFractions(ast);
        var steps = [{ label: 'Działanie', math: show(tree, ctx) }];
        for (var guard = 0; tree.k !== 'num' && guard < 60; guard++) {
            var node = findReducible(tree);
            if (!node || !OP_LABEL[node.k]) throw new NotSupported();
            var label = node.paren ? 'Najpierw nawias: ' + OP_LABEL[node.k].toLowerCase() : OP_LABEL[node.k];
            var value = evalExact(node, {});
            if (!ctx.dec && (node.k === 'add' || node.k === 'sub') && !isInt(node.a.v) && !isInt(node.b.v) && node.a.v.d !== node.b.v.d) {
                var lcm = (node.a.v.d * node.b.v.d) / gcd(node.a.v.d, node.b.v.d);
                steps.push({
                    label: 'Sprowadzam do wspólnego mianownika ' + lcm.toString(),
                    math: fmt(mul(node.a.v, R(lcm))) + '/' + lcm + (node.k === 'add' ? ' + ' : ' − ') + fmt(mul(node.b.v, R(lcm))) + '/' + lcm
                });
            }
            ['a', 'b'].forEach(function (key) { delete node[key]; });
            node.k = 'num'; node.v = value; node.paren = false; node.implicit = false;
            node.frac = !isInt(value);
            steps.push({ label: label, math: show(tree, ctx) });
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
        tokens.forEach(function (t, i) { if (t.t === 'op' && t.v === '=') { at = i; count++; } });
        if (count > 1) throw new SyntaxError('eq');
        if (at < 0) return { expr: parseTokens(tokens) };
        return { lhs: parseTokens(tokens.slice(0, at)), rhs: parseTokens(tokens.slice(at + 1)) };
    }

    function runParsed(d, opts) {
        var parts = parseEquationParts(d.src, opts || {});
        if (parts.lhs) {
            if (d.mode === 'simplify' || d.mode === 'factor') return null;
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
    function run(raw) { // [EN] jawna komenda („rozwiąż …”); null = nie nasza
        var c = _calculus && _calculus.detect(raw);
        if (c) return memo('d:' + raw, function () { return _calculus.run(c); });
        var d = detect(raw);
        if (!d) return null;
        return memo('c:' + raw, function () { return runParsed(d, {}); });
    }
    function runBare(raw) { // [EN] gołe „2x + 3 = 7”, gdy parser nie dał wyniku
        var s = fold(raw);
        if (!s || s.length > MAX_INPUT || s.indexOf('=') < 0 || !/[a-z]/.test(s)) return null;
        if (/^[a-z]\s*=\s*[\d.,]+$/.test(s)) return null; // [EN] „x = 5” to już odpowiedź
        var res = memo('b:' + raw, function () {
            return runParsed({ mode: 'solve', src: s }, { singleLetters: true });
        });
        return res && res.explain ? res : null; // [EN] bez komendy nie obiecujemy rozwiązania
    }

    var API = {
        detect: detect, run: run, runBare: runBare,
        registerCalculus: function (mod) { _calculus = mod; },
        _core: {
            NotSupported: NotSupported, R: R, ZERO: ZERO, ONE: ONE, gcd: gcd, add: add, neg: neg, sub: sub,
            mul: mul, div: div, isZero: isZero, isInt: isInt, eq: eq, toNum: toNum, powR: powR,
            sqrtExact: sqrtExact, sup: sup, fmt: fmt, fmtApprox: fmtApprox, fold: fold, done: done,
            MAX_INPUT: MAX_INPUT,
            parse: function (src) { return parseTokens(tokenize(src, { calculus: true })); }
        }
    };
    if (typeof window !== 'undefined') window.MATM0_STEPS = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
