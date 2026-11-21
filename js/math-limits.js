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
    function formatAnswer(ans) {
        if (ans.kind === 'inf') return { text: ans.sign > 0 ? '+∞' : '−∞', value: ans.sign > 0 ? Infinity : -Infinity };
        if (ans.kind === 'dne') return { text: 'granica nie istnieje', value: null };
        return { text: C.show(ans.e), value: C.evalExpr(ans.e, {}) };
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
                line(log, 'Podstawiamy ' + v + ' = ' + targetText({ at: t.at, src: t.src, side: 0 }), limHead(v, t) + C.show(e) + ' = ' + C.show(at));
                return { kind: 'num', e: at };
            }
        }
    ];
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
        var steps = [{ label: 'Granica', math: limHead(d.v, d.target) + C.show(e) }];
        var ans = limitOf(e, d.v, d.target, steps, 0);
        if (!agrees(ans, numericLimit(e, d.v, d.target))) throw new NotSupported(); // [EN] nigdy błędnego wyniku
        var out = formatAnswer(ans);
        steps.push({ label: 'Wynik', math: limHead(d.v, d.target) + C.show(e) + ' = ' + out.text });
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
