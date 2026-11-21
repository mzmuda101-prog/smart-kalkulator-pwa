// @ts-check
/* ============================================================
   [EN] MATM0_LIMITS — granice ciągów i funkcji krok po kroku (bez DOM, działa też w Node).
   Wyrażenia, pokaz i pochodne z js/math-calculus.js (MATM0_CALC._core).
   Każdy wynik reguł jest sprawdzany liczbowo w wysokiej precyzji (decimal.js):
   wynik, który się nie zgadza, nie trafia na ekran.
   ============================================================ */
(function () {
    'use strict';

    var STEPS = (typeof window !== 'undefined' && window.MATM0_STEPS) || require('./math-steps.js');
    var CALC = (typeof window !== 'undefined' && window.MATM0_CALC) || require('./math-calculus.js');
    var K = STEPS._core;
    var toNum = K.toNum;

    var _Decimal = null;
    function Dec() { // [EN] lazy: w przeglądarce globalny Decimal (js/vendor/decimal.js), w Node pakiet
        if (_Decimal) return _Decimal;
        var G = typeof Decimal !== 'undefined' ? Decimal : (typeof window !== 'undefined' && window.Decimal);
        // eslint-disable-next-line no-undef
        var base = G || require('decimal.js');
        _Decimal = base.clone({ precision: 80, maxE: 9e15, minE: -9e15 });
        return _Decimal;
    }

    // ── Wartość w wysokiej precyzji (tylko do sprawdzania) ───────────
    function rat(r) { var D = Dec(); return new D(r.n.toString()).div(r.d.toString()); }
    function powRat(b, r) { // [EN] b^(n/d); pierwiastek nieparzysty z ujemnej działa jak na kartce
        var D = Dec();
        if (b.isNaN()) return b;
        var neg = b.isNeg() && !b.isZero();
        if (neg && r.d % 2n === 0n) return new D(NaN);
        var mag = b.abs().pow(rat(r));
        return neg && r.n % 2n !== 0n ? mag.neg() : mag;
    }
    function evalDec(e, env) {
        var D = Dec(), sum = new D(0);
        for (var i = 0; i < e.length; i++) {
            var cur = rat(e[i].c);
            for (var j = 0; j < e[i].fs.length; j++) {
                var f = e[i].fs[j];
                cur = cur.mul(powRat(atomDec(f.b, env), f.e));
            }
            sum = sum.add(cur);
        }
        return sum;
    }
    function atomDec(a, env) {
        var D = Dec();
        switch (a.k) {
            case 'var': return env[a.v];
            case 'const': return a.v === 'pi' ? D.acos(-1) : D.exp(1);
            case 'num': return rat(a.v);
            case 'sum': return evalDec(a.s, env);
            case 'exp': return evalDec(a.b, env).pow(evalDec(a.x, env));
            case 'fn':
                var u = evalDec(a.a, env);
                switch (a.f) {
                    case 'sin': return u.sin();
                    case 'cos': return u.cos();
                    case 'tan': return u.tan();
                    case 'cot': return new D(1).div(u.tan());
                    case 'ln': return u.lte(0) ? new D(NaN) : u.ln();
                    case 'lnabs': return u.isZero() ? new D(NaN) : u.abs().ln();
                    case 'log': return u.lte(0) ? new D(NaN) : u.log(10);
                    case 'logb': return u.lte(0) ? new D(NaN) : u.ln().div(rat(a.base).ln());
                    case 'asin': return u.asin();
                    case 'acos': return u.acos();
                    case 'atan': return u.atan();
                }
        }
        return new D(NaN);
    }
    function valueAt(e, v, x) {
        var env = {}; env[v] = x;
        try {
            var r = evalDec(e, env);
            return r.isFinite() ? r : null;
        } catch (err) { return null; } // [EN] poza dziedziną (np. dzielenie przez 0)
    }

    /* Ciąg próbek zbliżających się do celu: ∞ → 10^k, punkt → a ± 10^-k.
       Zbieżność: różnice kolejnych próbek maleją (każda ≤ połowy poprzedniej), ostatnia
       względnie < 1e-6. Rozbieżność do ∞: moduł rośnie, różnice nie maleją. Inaczej null. */
    function samples(e, v, at, side) {
        var D = Dec(), out = [];
        var ks = at === 'inf' || at === '-inf' ? [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18] : [3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20];
        for (var i = 0; i < ks.length; i++) {
            var x;
            if (at === 'inf') x = new D(10).pow(ks[i]);
            else if (at === '-inf') x = new D(10).pow(ks[i]).neg();
            else x = new D(at).add(new D(10).pow(-ks[i]).mul(side));
            var y = valueAt(e, v, x);
            if (y) out.push(y);
        }
        return out;
    }
    function judge(ys) {
        if (ys.length < 4) return null;
        var last = ys.slice(-5), D = Dec();
        var diffs = [];
        for (var i = 1; i < last.length; i++) diffs.push(last[i].sub(last[i - 1]).abs());
        var y = last[last.length - 1];
        var shrinking = true;
        for (var j = 1; j < diffs.length; j++) if (diffs[j].gt(diffs[j - 1].mul(0.5)) && !diffs[j].lte(new D(10).pow(-30))) shrinking = false;
        var scale = D.max(new D(1), y.abs());
        var lastDiff = diffs[diffs.length - 1];
        if (shrinking && lastDiff.div(scale).lt(1e-6)) {
            return { kind: 'num', value: y.toNumber(), err: lastDiff.div(scale).toNumber() };
        }
        var sign = y.isNeg() ? -1 : 1, growing = true;
        for (var k = 0; k < last.length; k++) if ((last[k].isNeg() ? -1 : 1) !== sign) growing = false;
        for (var m = 1; m < last.length; m++) if (!last[m].abs().gt(last[m - 1].abs())) growing = false;
        // [EN] różnice nie maleją (≥ 0,9 poprzedniej): ln n, n^(1/12) rosną; 1/ln n (różnice ~0,77×) — nie
        for (var q = 1; q < diffs.length; q++) if (diffs[q].lt(diffs[q - 1].mul(0.9))) growing = false;
        if (growing) return { kind: 'inf', sign: sign };
        return null;
    }
    /**
     * Granica liczbowa (do sprawdzania wyniku reguł).
     * @param {any} e wyrażenie MATM0_CALC
     * @param {string} v zmienna
     * @param {{at: number|'inf'|'-inf', side: number}} target
     * @returns {{kind:'num', value:number, err:number}|{kind:'inf', sign:number}|{kind:'sides', left:any, right:any}|null}
     */
    function numericLimit(e, v, target) {
        if (target.at === 'inf' || target.at === '-inf') return judge(samples(e, v, target.at, 1));
        if (target.side) return judge(samples(e, v, target.at, target.side));
        var right = judge(samples(e, v, target.at, 1)), left = judge(samples(e, v, target.at, -1));
        if (!right || !left) return null;
        if (sameLimit(left, right)) return right;
        return { kind: 'sides', left: left, right: right };
    }
    function sameLimit(a, b) {
        if (a.kind !== b.kind) return false;
        if (a.kind === 'inf') return a.sign === b.sign;
        var tol = Math.max(1e-9, 10 * Math.max(a.err || 0, b.err || 0));
        return Math.abs(a.value - b.value) <= tol * (1 + Math.abs(a.value));
    }

    // ── Wykrywanie komendy ───────────────────────────────────────────
    var C = CALC._core, NotSupported = K.NotSupported, ONE = K.ONE;
    var TARGET = '([+-]?(?:∞|inf(?:inity)?|nieskonczonosc[ia]?|nieskonczonosci)|-?\\d+(?:[.,]\\d+)?)\\s*(\\+|-|z\\s+prawej|z\\s+lewej|prawostronn\\w*|lewostronn\\w*)?';
    var ARROW = '\\s*(?:→|do|dazy\\s+do|zmierza\\s+do)\\s*';
    var HEAD_RE = new RegExp('^(?:oblicz\\s+)?(?:lim|limit|granica|granice|granicy)\\s*(?:_?\\{|\\(|_)?\\s*([a-z])' + ARROW + TARGET + '\\s*[})]?\\s+(.+)$');
    var TAIL_RE = new RegExp('^(?:oblicz\\s+)?(?:lim|limit|granica|granice|granicy)(?:\\s+(?:ciagu|funkcji|of))?\\s+(.+?)\\s+(?:przy|dla|gdy|as|when|for)\\s+([a-z])' + ARROW + TARGET + '$');
    function normalize(raw) {
        return K.fold(raw)
            .replace(/[−–]/g, '-').replace(/->|\\to\b/g, '→').replace(/\s*→\s*/g, '→')
            .replace(/→\+?∞|→\+inf/g, function (m) { return m.replace('+', ''); });
    }
    function targetOf(tok, sideTok) {
        var t = tok.replace(/^\+/, ''), side = 0;
        if (sideTok) side = /^(?:\+|z\s+prawej|prawostronn)/.test(sideTok) ? 1 : -1;
        if (/^-/.test(t) && /∞|inf|nieskon/.test(t)) return { at: '-inf', side: 0 };
        if (/∞|inf|nieskon/.test(t)) return { at: 'inf', side: 0 };
        var n = parseFloat(t.replace(',', '.'));
        return isFinite(n) ? { at: n, side: side, src: t.replace(',', '.') } : null;
    }
    function detect(raw) {
        var s = normalize(raw);
        if (!s || s.length > K.MAX_INPUT || !/^(?:oblicz\s+)?(?:lim|granic)/.test(s)) return null;
        var m = HEAD_RE.exec(s), body, v, tg, side;
        if (m) { v = m[1]; tg = m[2]; side = m[3]; body = m[4]; }
        else if ((m = TAIL_RE.exec(s))) { body = m[1]; v = m[2]; tg = m[3]; side = m[4]; }
        else return null;
        var target = targetOf(tg, side);
        body = body.trim();
        return target && body ? { src: body, v: v, target: target } : null;
    }

    // ── Wynik i jego pokaz ───────────────────────────────────────────
    function targetText(t) {
        if (t.at === 'inf') return '∞';
        if (t.at === '-inf') return '−∞';
        var a = String(t.src != null ? t.src : t.at).replace('-', '−').replace('.', ',');
        return a + (t.side > 0 ? '⁺' : (t.side < 0 ? '⁻' : ''));
    }
    function limHead(v, t) { return 'lim(' + v + '→' + targetText(t) + ') '; }
    function limOf(v, t, e) { return limHead(v, t) + (e.length > 1 ? '(' + C.show(e) + ')' : C.show(e)); }
    function formatAnswer(ans) {
        if (ans.kind === 'inf') return { text: ans.sign > 0 ? '+∞' : '−∞', value: ans.sign > 0 ? Infinity : -Infinity };
        if (ans.kind === 'dne') return { text: 'granica nie istnieje', value: null };
        return { text: C.show(rationalize(ans.e)), value: C.evalExpr(ans.e, {}) };
    }
    function rationalize(e) { // [EN] 1/√3 → √3/3: pierwiastek liczby w mianowniku przenosimy do licznika
        return e.map(function (t) {
            var c = t.c, fs = t.fs.map(function (f) {
                if (f.b.k !== 'num' || f.e.n >= 0n || K.isInt(f.e)) return f;
                var whole = (-f.e.n + f.e.d - 1n) / f.e.d; // [EN] ceil(|e|)
                c = K.div(c, K.powR(f.b.v, Number(whole)));
                return { b: f.b, e: K.add(f.e, K.R(whole)) };
            });
            return C.term(c, fs);
        });
    }
    function agrees(ans, check) {
        if (!check) return false;
        if (ans.kind === 'inf') return check.kind === 'inf' && check.sign === ans.sign;
        if (ans.kind === 'dne') return check.kind === 'sides';
        if (check.kind !== 'num') return false;
        var v = C.evalExpr(ans.e, {}), tol = Math.max(1e-9, 10 * (check.err || 0));
        return isFinite(v) && Math.abs(v - check.value) <= tol * (1 + Math.abs(check.value));
    }

    // ── Reguły ───────────────────────────────────────────────────────
    function line(log, label, math) { if (log) log.push({ label: label, math: math }); }
    function isFiniteTarget(t) { return t.at !== 'inf' && t.at !== '-inf'; }
    function pointExpr(t) { // [EN] punkt docelowy jako dokładna liczba (ułamek dziesiętny → wymierny)
        return C.fromAst(K.parse(String(t.src != null ? t.src : t.at)));
    }
    function substitute(e, v, valueExpr) {
        return C.mapExpr(e, function (a) { return a.k === 'var' && a.v === v ? valueExpr : null; });
    }
    var RULES = [
        { // [EN] funkcja ciągła w punkcie: podstawiamy
            name: 'substitution',
            test: function (e, v, t) { return isFiniteTarget(t); },
            apply: function (e, v, t, log) {
                var at = substitute(e, v, pointExpr(t));
                var val = C.evalExpr(at, {});
                if (C.hasVar(at, v) || !isFinite(val)) throw new NotSupported();
                line(log, 'Podstawiamy ' + v + ' = ' + targetText({ at: t.at, src: t.src, side: 0 }), limOf(v, t, e) + ' = ' + C.show(at));
                return { kind: 'num', e: at };
            }
        }
    ];
    // ── Rozbiór na licznik i mianownik ─────────────────────────────────
    function splitFraction(e) {
        if (e.length !== 1) return { N: e, D: C.num(ONE) };
        var t = e[0], up = [], down = [];
        t.fs.forEach(function (f) {
            if (f.e.n < 0n) down.push({ b: f.b, e: K.neg(f.e) }); else up.push(f);
        });
        return { N: [C.term(t.c, up)], D: down.length ? [C.term(ONE, down)] : C.num(ONE) };
    }
    function isOne(e) { return C.isNumber(e) && K.eq(C.numberOf(e), ONE); }

    /* Wyłączanie najwyższej potęgi przy v → ±∞. Z u = sign·v (u → +∞):
       pull(e) = { p, rest, c } gdzie e = u^p · rest, a rest → c (stała ≠ 0, dokładnie).
       Skrócenie się najwyższych potęg w sumie (∞ − ∞) → NotSupported (to robota innych reguł). */
    function uPow(v, sign, q) { // [EN] u^q wyrażone przez v
        if (sign > 0) return C.cPow(C.variable(v), q);
        if (!K.isInt(q)) throw new NotSupported();
        var r = C.cPow(C.variable(v), q);
        return q.n % 2n === 0n ? r : C.cNeg(r);
    }
    function pullTerm(t, v, sign) {
        var p = K.ZERO, rest = C.num(t.c), c = C.num(t.c);
        t.fs.forEach(function (f) {
            var a = f.b, r = f.e;
            if (a.k === 'var' && a.v === v) {
                p = K.add(p, r);
                if (sign < 0) {
                    if (!K.isInt(r)) throw new NotSupported();
                    if (r.n % 2n !== 0n) { rest = C.cNeg(rest); c = C.cNeg(c); }
                }
                return;
            }
            if (a.k === 'sum' && C.hasVar(a.s, v)) {
                var inner = pullExpr(a.s, v, sign);
                p = K.add(p, K.mul(inner.p, r));
                rest = C.cMul(rest, C.cPow(inner.rest, r));
                c = C.cMul(c, C.cPow(inner.c, r));
                return;
            }
            if (atomHasVar(a, v)) throw new NotSupported();
            var self = C.cPow(C.atomExpr(a), r);
            rest = C.cMul(rest, self); c = C.cMul(c, self);
        });
        return { p: p, rest: rest, c: c };
    }
    function atomHasVar(a, v) { return C.hasVar(C.atomExpr(a), v); }
    function pullExpr(e, v, sign) {
        if (e.length === 1) return pullTerm(e[0], v, sign);
        var parts = e.map(function (t) { return pullTerm(t, v, sign); });
        var p = parts.reduce(function (m, x) { return K.toNum(x.p) > K.toNum(m) ? x.p : m; }, parts[0].p);
        var rest = [], c = [];
        parts.forEach(function (x) {
            var q = K.sub(x.p, p);
            rest = C.cAdd(rest, K.isZero(q) ? x.rest : C.cMul(x.rest, uPow(v, sign, q)));
            if (K.isZero(q)) c = C.cAdd(c, x.c);
        });
        if (!c.length || Math.abs(C.evalExpr(c, {})) < 1e-12) throw new NotSupported(); // [EN] ∞ − ∞
        return { p: p, rest: rest, c: c };
    }
    function uText(v, sign, p) {
        var base = sign > 0 ? v : '(−' + v + ')';
        if (K.eq(p, ONE)) return base;
        return sign > 0 ? C.show(C.cPow(C.variable(v), p)) : base + (K.isInt(p) ? K.sup(p.n.toString()) : '^(' + K.fmt(p) + ')');
    }
    function hasEvenRoot(e, v) {
        var found = false;
        (function walk(x) {
            x.forEach(function (t) {
                t.fs.forEach(function (f) {
                    if (f.b.k === 'sum') {
                        if (C.hasVar(f.b.s, v) && f.e.d % 2n === 0n) found = true;
                        walk(f.b.s);
                    }
                });
            });
        })(e);
        return found;
    }
    function grp(e) { // [EN] nawias także dla iloczynu kilku czynników: /((2n + 1)(4n + 5))
        if (e.length > 1) return '(' + C.show(e) + ')';
        var t = e[0];
        return t && (t.fs.length > 1 || (t.fs.length && !K.eq(t.c, ONE))) ? '(' + C.show(e) + ')' : C.show(e);
    }
    function quotientText(n, d) { return isOne(d) ? C.show(n) : C.paren(n) + '/' + grp(d); }
    function pulledText(v, sign, x) { // [EN] u^p · (reszta); liczba jako współczynnik: −(−x), nie (−x)−1
        if (K.isZero(x.p)) return C.paren(x.rest);
        var u = uText(v, sign, x.p);
        if (C.isNumber(x.rest)) {
            var c = C.numberOf(x.rest);
            if (K.eq(c, ONE)) return u;
            if (K.eq(c, K.neg(ONE))) return '−' + u;
            return C.show(x.rest) + u;
        }
        if (x.rest.length === 1 && !K.eq(x.rest[0].c, ONE)) { // [EN] 3n²(1 + …), nie n²3(1 + …)
            var k = x.rest[0].c, inner = [C.term(ONE, x.rest[0].fs)];
            var kt = K.eq(k, K.neg(ONE)) ? '−' : K.fmt(k);
            return kt + u + C.paren(inner);
        }
        return u + C.paren(x.rest);
    }

    var dominantPower = {
        name: 'dominantPower',
        test: function (e, v, t) { return !isFiniteTarget(t) && C.hasVar(e, v); },
        apply: function (e, v, t, log) {
            var sign = t.at === 'inf' ? 1 : -1, fr = splitFraction(e);
            var N = pullExpr(fr.N, v, sign), D = pullExpr(fr.D, v, sign);
            var head = limHead(v, t);
            if (sign < 0 && hasEvenRoot(e, v)) line(log, 'Dla ' + v + ' → −∞', '√(' + v + '²) = |' + v + '| = −' + v);
            var same = K.eq(N.p, D.p), alone = isOne(fr.D);
            var label = (same || alone) && !K.isZero(N.p) ? 'Wyłączamy ' + uText(v, sign, N.p) + ' przed nawias' : 'Wyłączamy najwyższe potęgi przed nawias';
            var pn = pulledText(v, sign, N), pd = pulledText(v, sign, D);
            var pdWrapped = K.isZero(D.p) ? grp(D.rest) : '(' + pd + ')';
            line(log, label, head + (alone ? pn : pn + '/' + pdWrapped));
            var q = K.sub(N.p, D.p);
            if (same && !K.isZero(N.p)) line(log, 'Skracamy ' + uText(v, sign, N.p), head + quotientText(N.rest, D.rest));
            var cval = C.cMul(N.c, C.cPow(D.c, K.neg(ONE)));
            var cv = C.evalExpr(cval, {}), cText = C.show(rationalize(cval));
            if (K.isZero(q)) {
                line(log, 'Wyrazy z ' + v + ' w mianowniku dążą do 0', '→ ' + cText);
                return { kind: 'num', e: cval };
            }
            var neg = K.toNum(q) < 0, infSign = cv > 0 ? 1 : -1;
            var tail = neg ? ' → 0' : ' → ' + (infSign > 0 ? '+∞' : '−∞');
            line(log, 'Wyrazy z ' + v + ' w mianowniku dążą do 0', '→ ' + (cText === '1' ? '' : cText + ' · ') + uText(v, sign, neg ? K.neg(q) : q) + (neg ? ' w mianowniku' : '') + tail);
            return neg ? { kind: 'num', e: [] } : { kind: 'inf', sign: infSign };
        }
    };
    // ── Wspólny mianownik (różnica ułamków, ułamek piętrowy) ───────────
    function keyOf(f) { return C.showAtom(f.b); }
    function hasFracTerm(sumE, v) {
        return sumE.length > 1 && sumE.some(function (t) {
            return t.fs.some(function (f) { return f.e.n < 0n && atomHasVar(f.b, v); });
        });
    }
    function combine(sumE) { // [EN] Σ tᵢ → (Σ tᵢ·D) / D, D = iloczyn różnych mianowników
        var dens = {}, order = [];
        sumE.forEach(function (t) {
            t.fs.forEach(function (f) {
                if (f.e.n >= 0n || !C.hasVar(C.atomExpr(f.b), _curVar)) return;
                var k = keyOf(f), need = K.neg(f.e);
                if (!dens[k]) { dens[k] = { b: f.b, e: need }; order.push(k); }
                else if (K.toNum(need) > K.toNum(dens[k].e)) dens[k].e = need;
            });
        });
        var D = C.num(ONE);
        order.forEach(function (k) { D = C.cMul(D, C.cPow(C.atomExpr(dens[k].b), dens[k].e)); });
        var top = [];
        sumE.forEach(function (t) { top = C.cAdd(top, C.expandExpr(C.cMul([t], D))); });
        return { top: top, D: D };
    }
    var _curVar = 'x';
    var commonDenominator = {
        name: 'commonDenominator',
        test: function (e, v) {
            _curVar = v;
            if (hasFracTerm(e, v)) return true;
            return e.length === 1 && e[0].fs.some(function (f) { return f.b.k === 'sum' && hasFracTerm(f.b.s, v); });
        },
        apply: function (e, v, t, log, depth) {
            _curVar = v;
            var out;
            if (hasFracTerm(e, v)) {
                var cb = combine(e);
                out = C.cMul(cb.top, C.cPow(cb.D, K.neg(ONE)));
                line(log, 'Sprowadzamy do wspólnego mianownika', limHead(v, t) + C.paren(cb.top) + '/' + grp(cb.D));
            } else {
                var only = e[0], rest = C.num(only.c), shown = '';
                only.fs.forEach(function (f) {
                    if (f.b.k === 'sum' && hasFracTerm(f.b.s, v)) {
                        var c2 = combine(f.b.s), frac = C.cMul(c2.top, C.cPow(c2.D, K.neg(ONE)));
                        shown = C.show(f.b.s) + ' = ' + C.paren(c2.top) + '/' + grp(c2.D);
                        rest = C.cMul(rest, C.cPow(frac, f.e));
                    } else rest = C.cMul(rest, C.cPow(C.atomExpr(f.b), f.e));
                });
                out = rest;
                line(log, 'Sprowadzamy do wspólnego mianownika', shown);
                line(log, 'Upraszczamy', limOf(v, t, out));
            }
            return limitOf(out, v, t, log, depth);
        }
    };

    // ── Logarytmy: log f − log g = log(f/g), k·log f = log f^k ──────────
    function logParts(e) { // [EN] Σ kᵢ·log(uᵢ) z jednym rodzajem logarytmu albo null
        var kind = null, parts = [];
        for (var i = 0; i < e.length; i++) {
            var t = e[i];
            if (t.fs.length !== 1 || t.fs[0].b.k !== 'fn' || !K.eq(t.fs[0].e, ONE)) return null;
            var a = t.fs[0].b, key = a.f + (a.base ? K.fmt(a.base) : '');
            if (['ln', 'log', 'logb'].indexOf(a.f) < 0) return null;
            if (kind && kind.key !== key) return null;
            kind = { key: key, f: a.f, base: a.base };
            parts.push({ k: t.c, u: a.a });
        }
        return parts.length > 1 ? { kind: kind, parts: parts } : null;
    }
    function exactLog(fnName, base, q) { // [EN] log o podstawie b z liczby wymiernej, gdy wynik wymierny
        var b = fnName === 'log' ? K.R(10) : (fnName === 'ln' ? null : base);
        if (!b || q.n <= 0n) return null;
        var k = Math.log(K.toNum(q)) / Math.log(K.toNum(b));
        for (var den = 1; den <= 12; den++) {
            var m = Math.round(k * den);
            if (Math.abs(k * den - m) > 1e-9) continue;
            var lhs = K.powR(b, Math.abs(m)), rhs = K.powR(q, den); // [EN] b^m = q^den
            if (m < 0) lhs = K.div(ONE, lhs);
            if (K.eq(lhs, rhs)) return K.R(m, den);
        }
        return null;
    }
    var logCombine = {
        name: 'logCombine',
        test: function (e) { return !!logParts(e); },
        apply: function (e, v, t, log, depth) {
            var lp = logParts(e), inner = C.num(ONE);
            lp.parts.forEach(function (p) { inner = C.cMul(inner, C.cPow(p.u, p.k)); });
            var combined = C.cFn(lp.kind.f, inner, lp.kind.base);
            line(log, 'Łączymy logarytmy: log f − log g = log(f/g), k·log f = log fᵏ', limOf(v, t, combined));
            var inn = limitOf(inner, v, t, log, depth);
            if (inn.kind === 'inf') {
                if (inn.sign < 0) throw new NotSupported();
                line(log, 'Logarytm rośnie bez ograniczeń', '→ +∞');
                return { kind: 'inf', sign: 1 };
            }
            if (inn.kind !== 'num') throw new NotSupported();
            var val = C.evalExpr(inn.e, {});
            if (!(val > 0)) throw new NotSupported();
            var res = C.isNumber(inn.e) ? exactLog(lp.kind.f, lp.kind.base, C.numberOf(inn.e)) : null;
            var resE = res ? C.num(res) : C.cFn(lp.kind.f, inn.e, lp.kind.base);
            line(log, 'Logarytm jest ciągły', '→ ' + C.show(C.cFn(lp.kind.f, inn.e, lp.kind.base)) + (res ? ' = ' + C.show(resE) : ''));
            return { kind: 'num', e: resE };
        }
    };
    RULES.push(commonDenominator, logCombine, dominantPower);

    // ── Symbol nieoznaczony (do pierwszego kroku, jak na zajęciach) ──────
    function kindOf(x) {
        if (!x) return null;
        if (x.kind === 'inf') return '∞';
        if (x.kind === 'num') return Math.abs(x.value) < 1e-9 ? '0' : (Math.abs(x.value - 1) < 1e-9 ? '1' : 'c');
        return null;
    }
    function indeterminate(e, v, t) {
        try {
            if (e.length > 1) {
                var signs = e.map(function (term) { var r = numericLimit([term], v, t); return r && r.kind === 'inf' ? r.sign : 0; });
                return signs.indexOf(1) >= 0 && signs.indexOf(-1) >= 0 ? '∞ − ∞' : null;
            }
            var only = e[0];
            if (only.fs.length === 1 && only.fs[0].b.k === 'exp' && K.eq(only.c, ONE)) {
                var b = kindOf(numericLimit(only.fs[0].b.b, v, t)), x = kindOf(numericLimit(only.fs[0].b.x, v, t));
                if (b === '1' && x === '∞') return '1^∞';
                if (b === '0' && x === '0') return '0^0';
                if (b === '∞' && x === '0') return '∞^0';
                return null;
            }
            var fr = splitFraction(e);
            if (isOne(fr.D)) return null;
            var n = kindOf(numericLimit(fr.N, v, t)), d = kindOf(numericLimit(fr.D, v, t));
            if (n === '0' && d === '0') return '0/0';
            if (n === '∞' && d === '∞') return '∞/∞';
            return null;
        } catch (err) { return null; }
    }

    var MAX_DEPTH = 8;
    function limitOf(e, v, t, log, depth) {
        if ((depth || 0) > MAX_DEPTH) throw new NotSupported();
        for (var i = 0; i < RULES.length; i++) {
            var rule = RULES[i];
            if (!rule.test(e, v, t)) continue;
            var mark = log ? log.length : 0;
            try { return rule.apply(e, v, t, log, (depth || 0) + 1); }
            catch (err) {
                if (!(err instanceof NotSupported) && !(err instanceof RangeError)) throw err;
                if (log) log.length = mark; // [EN] nieudana próba nie zostawia kroków
            }
        }
        throw new NotSupported();
    }
    function run(d) {
        var e = C.fromAst(K.parse(d.src));
        C.setVar(d.v);
        var ind = indeterminate(e, d.v, d.target);
        var steps = [{ label: 'Granica', math: limOf(d.v, d.target, e) + (ind ? '  [' + ind + ']' : '') }];
        var ans = limitOf(e, d.v, d.target, steps, 0);
        if (!agrees(ans, numericLimit(e, d.v, d.target))) throw new NotSupported(); // [EN] nigdy błędnego wyniku
        var out = formatAnswer(ans);
        steps.push({ label: 'Wynik', math: limOf(d.v, d.target, e) + ' = ' + out.text });
        return K.done('Granica', out.text, out.value, steps);
    }

    var API = {
        detect: detect, run: run, numericLimit: numericLimit, _evalDec: evalDec,
        _test: {
            formatAnswer: formatAnswer,
            pushRule: function (r) { RULES.unshift(r); },
            popRule: function () { RULES.shift(); }
        },
        _internal: { RULES: RULES, limitOf: limitOf, line: line, limHead: limHead, targetText: targetText, substitute: substitute, pointExpr: pointExpr, agrees: agrees }
    };
    STEPS.registerLimits(API);
    if (typeof window !== 'undefined') window.MATM0_LIMITS = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
