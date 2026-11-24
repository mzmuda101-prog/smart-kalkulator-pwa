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
    function tick() { // [EN] jedna operacja w wysokiej precyzji; budżet pilnuje pisania na żywo
        if (++_work > _budget) throw new NotSupported();
    }
    function powRat(b, r) { // [EN] b^(n/d); pierwiastek nieparzysty z ujemnej działa jak na kartce
        var D = Dec();
        tick();
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
        tick();
        switch (a.k) {
            case 'var': return env[a.v];
            case 'const': return a.v === 'pi' ? D.acos(-1) : D.exp(1);
            case 'num': return rat(a.v);
            case 'sum': return evalDec(a.s, env);
            case 'exp': return evalDec(a.b, env).pow(evalDec(a.x, env));
            case 'fn': return fnDec(a.f, evalDec(a.a, env), a.base);
        }
        return new D(NaN);
    }
    function fnDec(f, u, base) {
        var D = Dec();
        if (u.isNaN()) return u;
        // [EN] sin/cos ogromnego argumentu: decimal.js podnosi precyzję o tysiące cyfr i wisi — pomijamy próbkę
        if ((f === 'sin' || f === 'cos' || f === 'tan' || f === 'cot') && u.abs().gt(1e40)) return new D(NaN);
        switch (f) {
            case 'sin': return u.sin();
            case 'cos': return u.cos();
            case 'tan': return u.tan();
            case 'cot': return new D(1).div(u.tan());
            case 'ln': return u.lte(0) ? new D(NaN) : u.ln();
            case 'lnabs': return u.isZero() ? new D(NaN) : u.abs().ln();
            case 'log': return u.lte(0) ? new D(NaN) : u.log(10);
            case 'logb': return u.lte(0) ? new D(NaN) : u.ln().div(rat(base).ln());
            case 'asin': return u.asin();
            case 'acos': return u.acos();
            case 'atan': return u.atan();
        }
        return new D(NaN);
    }
    // [EN] Wartość drzewa z parsera (MATM0_STEPS), niezależna od MATM0_CALC: bramka nie widzi
    // uproszczeń silnika, więc nie powtórzy jego błędu (np. √(x²) = x).
    function evalAst(n, env) {
        var D = Dec();
        switch (n.k) {
            case 'num': return rat(n.v);
            case 'var': return env[n.v] != null ? env[n.v] : new D(NaN);
            case 'const': return n.v === 'pi' ? D.acos(-1) : D.exp(1);
            case 'add': return evalAst(n.a, env).add(evalAst(n.b, env));
            case 'sub': return evalAst(n.a, env).sub(evalAst(n.b, env));
            case 'neg': return evalAst(n.a, env).neg();
            case 'mul': return evalAst(n.a, env).mul(evalAst(n.b, env));
            case 'div': return evalAst(n.a, env).div(evalAst(n.b, env));
            case 'sqrt': return powRat(evalAst(n.a, env), K.R(1, 2));
            case 'pow':
                var b = evalAst(n.a, env);
                if (n.b.k === 'num') return powRat(b, n.b.v);
                if (n.b.k === 'neg' && n.b.a.k === 'num') return powRat(b, K.neg(n.b.a.v));
                return b.pow(evalAst(n.b, env));
            case 'fn':
                var u = evalAst(n.a, env);
                if (n.f === 'exp') return u.exp();
                return fnDec(n.f, u, n.base != null ? K.R(BigInt(n.base)) : null);
        }
        return new D(NaN);
    }
    function valueAt(evalFn, x) {
        var D = Dec(), prec = D.precision, rnd = D.rounding;
        try {
            var r = evalFn(x);
            return r && r.isFinite() ? r : null;
        } catch (err) { return null; } // [EN] poza dziedziną (np. dzielenie przez 0)
        finally { D.precision = prec; D.rounding = rnd; } // [EN] trygonometria decimal.js potrafi zostawić podniesioną precyzję
    }
    function numVal(e) { // [EN] wartość stałej w wysokiej precyzji: ∛(−8) = −2, czego Math.pow nie umie
        var r = valueAt(function () { return evalDec(e, {}); }, null);
        return r ? r.toNumber() : NaN;
    }

    /* Ciąg próbek zbliżających się do celu: ∞ → 10^k, punkt → a ± 10^-k.
       Zbieżność: różnice kolejnych próbek maleją (każda ≤ połowy poprzedniej), ostatnia
       względnie < 1e-6. Rozbieżność do ∞: moduł rośnie, różnice nie maleją. Inaczej null. */
    // [EN] mnożnik √2 (pełna precyzja): w punktach 10ᵏ albo 1,23…·10ᵏ (całkowitych od k = 10)
    // sin(πx), cos(2πx) udawałyby zbieżność
    var _work = 0, _budget = Infinity; // [EN] budżet pracy reguł (operacje w wysokiej precyzji) — deterministyczny, nie zależy od szybkości telefonu
    function samples(evalFn, at, side, mult) {
        var D = Dec(), out = [], SAMPLE_C = mult || D.sqrt(2);

        // [EN] od najbliższej celu w dół, aż będzie 6 poprawnych (judge() patrzy na 5 ostatnich);
        // ogromne potęgi (zad. 6h) przekraczają zakres przy dużym n — wtedy sięgamy po mniejsze
        var ks = at === 'inf' || at === '-inf' ? [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18] : [3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20];
        for (var i = ks.length - 1; i >= 0 && out.length < 6; i--) {
            var x;
            if (at === 'inf') x = new D(10).pow(ks[i]).mul(SAMPLE_C);
            else if (at === '-inf') x = new D(10).pow(ks[i]).mul(SAMPLE_C).neg();
            else x = new D(at).add(new D(10).pow(-ks[i]).mul(SAMPLE_C).mul(side));
            var y = valueAt(evalFn, x);
            if (y) out.unshift(y); // [EN] rosnąco po zbliżeniu do celu
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
        return limitBy(function (x) { var env = {}; env[v] = x; return evalDec(e, env); }, target);
    }
    function numericLimitAst(ast, v, target) {
        // [EN] bramka: dwie niezależne siatki próbek (√2·10ᵏ i √3·0,7·10ᵏ) muszą się zgodzić —
        // okres dobrany pod jedną siatkę (sin(πx/√2)) nie przejdzie przez drugą
        var D = Dec(), f = function (x) { var env = {}; env[v] = x; return evalAst(ast, env); };
        var a = limitBy(f, target, D.sqrt(2)), b = limitBy(f, target, D.sqrt(3).mul('0.7'));
        if (!a || !b || a.kind !== b.kind) return null;
        if (a.kind === 'sides') return sameLimit(a.left, b.left) && sameLimit(a.right, b.right) ? a : null;
        return sameLimit(a, b) ? a : null;
    }
    function limitBy(evalFn, target, mult) {
        if (target.at === 'inf' || target.at === '-inf') return judge(samples(evalFn, target.at, 1, mult));
        if (target.side) return judge(samples(evalFn, target.at, target.side, mult));
        var right = judge(samples(evalFn, target.at, 1, mult)), left = judge(samples(evalFn, target.at, -1, mult));
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
    // [EN] strona: „0+”/„0-” bez spacji (z odstępem „x→0 - 1/x” to minus w wyrażeniu) albo słownie
    var TARGET = '([+-]?(?:∞|inf(?:inity)?|nieskonczonosc[ia]?|nieskonczonosci)|-?\\d+(?:[.,]\\d+)?)(?:([+-])(?=[\\s})]|$)|\\s+(z\\s+prawej|z\\s+lewej|prawostronn\\w*|lewostronn\\w*))?';
    var ARROW = '\\s*(?:→|do|dazy\\s+do|zmierza\\s+do)\\s*';
    var HEAD_RE = new RegExp('^(?:oblicz\\s+)?(?:lim|limit|granica|granice|granicy)\\s*(?:_?\\{|\\(|_)?\\s*([a-z])' + ARROW + TARGET + '\\s*[})]?\\s+(.+)$');
    var TAIL_RE = new RegExp('^(?:oblicz\\s+)?(?:lim|limit|granica|granice|granicy)(?:\\s+(?:ciagu|funkcji|of))?\\s+(.+?)\\s+(?:przy|dla|gdy|as|when|for)\\s+([a-z])' + ARROW + TARGET + '$');
    function normalize(raw) {
        return K.fold(raw)
            .replace(/^\\lim/, 'lim').replace(/\\infty/g, '∞').replace(/⟶|⇒/g, '→')
            .replace(/[−–]/g, '-').replace(/->|\\to(?![a-z])/g, '→').replace(/\s*→\s*/g, '→')
            .replace(/⁺/g, '+').replace(/⁻/g, '-').replace(/(→[^\s]*?)\^([+-])/, '$1$2')
            .replace(/\s+(?:krok po kroku|step by step)$/, '')
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
        if (m) { v = m[1]; tg = m[2]; side = m[3] || m[4]; body = m[5]; }
        else if ((m = TAIL_RE.exec(s))) { body = m[1]; v = m[2]; tg = m[3]; side = m[4] || m[5]; }
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
    // ── Zadanie tak, jak je wpisano (krok 1 i „Wynik”): z drzewa parsera, bez porządkowania wyrazów ──
    var AST_PREC = { add: 1, sub: 1, neg: 2, mul: 3, div: 3, pow: 5 };
    var FN_SHOW = { asin: 'arcsin', acos: 'arccos', atan: 'arctg', tan: 'tg', cot: 'ctg' };
    var SUB_DIGITS = '₀₁₂₃₄₅₆₇₈₉';
    function astText(n, need) {
        var s = astInner(n);
        return (AST_PREC[n.k] || 9) < (need || 0) ? '(' + s + ')' : s;
    }
    function astGroup(n) { return n.k === 'num' || n.k === 'var' || n.k === 'const' ? astInner(n) : '(' + astText(n) + ')'; }
    function fnName(n) {
        return n.f === 'logb' ? 'log' + String(n.base).replace(/\d/g, function (c) { return SUB_DIGITS[+c]; }) : FN_SHOW[n.f] || n.f;
    }
    function astInner(n) {
        switch (n.k) {
            case 'num': if (n.lp) return '(' + K.fmt(n.v) + ')'; return n.dec ? String(K.toNum(n.v)).replace('.', ',') : K.fmt(n.v);
            case 'var': return n.v;
            case 'const': return n.v === 'pi' ? 'π' : 'e';
            case 'add': return astText(n.a, 1) + ' + ' + astText(n.b, n.b.k === 'neg' ? 3 : 1);
            case 'sub': return astText(n.a, 1) + ' − ' + astText(n.b, n.b.k === 'neg' ? 3 : 2);
            case 'neg': return '−' + astText(n.a, 3);
            case 'mul': { // [EN] nawias użytkownika zostaje: 2(1/n), nie 21/n; liczba po czymś — z kropką
                var bt = n.b.paren ? '(' + astText(n.b) + ')' : astText(n.b, 3);
                return astText(n.a, 3) + (n.implicit && !/^\d/.test(bt) ? '' : ' · ') + bt;
            }
            case 'div': return astText(n.a, 3) + '/' + astText(n.b, 4);
            case 'sqrt': return '√' + astGroup(n.a);
            case 'fn': return fnName(n) + '(' + astText(n.a) + ')';
            case 'pow': {
                var b = n.b, a = n.a;
                if (b.k === 'num' && b.v.n === 1n && b.v.d >= 2n && b.v.d <= 4n) return '√∛∜'[Number(b.v.d) - 2] + astGroup(a);
                var exp = b.k === 'num' && K.isInt(b.v) && b.v.n >= 0n ? K.sup(b.v.n.toString())
                    : '^' + (b.k === 'var' || (b.k === 'num' && K.isInt(b.v) && b.v.n >= 0n) ? astInner(b) : '(' + astText(b) + ')');
                return a.k === 'fn' ? fnName(a) + exp + '(' + astText(a.a) + ')' : astText(a, 6) + exp;
            }
        }
        throw new NotSupported();
    }
    function userLim(d, e) { // [EN] węzeł, którego nie umiemy wypisać → zapis silnika
        try { return limHead(d.v, d.target) + astText(K.parse(d.src), 2); } catch (x) { return limOf(d.v, d.target, e); }
    }
    function formatAnswer(ans) {
        if (ans.kind === 'inf') return { text: ans.sign > 0 ? '+∞' : '−∞', value: ans.sign > 0 ? Infinity : -Infinity };
        if (ans.kind === 'dne') return { text: 'granica nie istnieje', value: null };
        return { text: C.show(rationalize(fold(ans.e))), value: numVal(ans.e) };
    }
    // [EN] ∛2 · ∛4 → ∛8 → 2, 2^(2/3) · 4^(2/3) → 8^(2/3) → 4: pierwiastki liczb o tym samym stopniu łączymy w jeden
    //      (także w sumach w mianowniku), potem fold wyciąga pełne potęgi — 5b: 9/(4 + 4 + 4) = 3/4, nie 9/(2∛2 · ∛4 + …)
    function mergeRootFactors(fs) {
        var byDen = {}, out = [];
        fs.forEach(function (f) {
            if (f.b.k === 'num' && f.e.n > 0n && !K.isInt(f.e) && f.b.v.n > 0n) {
                var key = String(f.e.d);
                (byDen[key] = byDen[key] || []).push(f);
            } else out.push(f);
        });
        Object.keys(byDen).forEach(function (key) {
            var group = byDen[key];
            if (group.length === 1) { out.push(group[0]); return; }
            var P = ONE;
            group.forEach(function (f) { P = K.mul(P, K.powR(f.b.v, Number(f.e.n))); });
            out.push({ b: { k: 'num', v: P }, e: K.R(1n, BigInt(key)) });
        });
        return out;
    }
    function mergeRoots(e) {
        var merged = e.map(function (t) { return C.term(t.c, mergeRootFactors(t.fs)); });
        return fold(C.mapExpr(merged, function (a) { return a.k === 'sum' ? mergeRoots(a.s) : null; }));
    }
    function rationalize(e) { // [EN] 1/√3 → √3/3: pierwiastek liczby w mianowniku przenosimy do licznika
        try { e = mergeRoots(e); } catch (x) { /* nietypowy węzeł — zostaje jak było */ }
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
        var v = numVal(ans.e), tol = Math.max(1e-9, 10 * (check.err || 0));
        return isFinite(v) && Math.abs(v - check.value) <= tol * (1 + Math.abs(check.value));
    }

    // ── Reguły ───────────────────────────────────────────────────────
    // [EN] formula = id wzoru ze słownika (js/step-formulas.js); fragment w ⟦…⟧ jest wtedy wyróżniony kolorem i do stuknięcia
    function line(log, label, math, formula, extra) {
        if (log) log.push(Object.assign(formula ? { label: label, math: math, formula: { id: formula } } : { label: label, math: math }, extra));
    }
    function isFiniteTarget(t) { return t.at !== 'inf' && t.at !== '-inf'; }
    function pointExpr(t) { // [EN] punkt docelowy jako dokładna liczba (ułamek dziesiętny → wymierny)
        return C.fromAst(K.parse(String(t.src != null ? t.src : t.at)));
    }
    function substitute(e, v, valueExpr) {
        return C.mapExpr(e, function (a) { return a.k === 'var' && a.v === v ? valueExpr : null; });
    }

    // ── Rachunek w kroku „Podstawiamy x = a”: wstawione liczby → wartości wyrazów → sumy policzone ──
    function astHasSum(n) { return n.k === 'add' || n.k === 'sub' || !!((n.a && astHasSum(n.a)) || (n.b && astHasSum(n.b))); }
    function intRoot(x, q) { // [EN] całkowity pierwiastek q-tego stopnia z x ≥ 0 albo null
        if (x > 1000000000000000n) return null;
        var g = BigInt(Math.round(Math.pow(Number(x), 1 / q)));
        for (var c = g - 1n; c <= g + 1n; c++) if (c >= 0n && c ** BigInt(q) === x) return c;
        return null;
    }
    function exactPow(a, e) { // [EN] a^(p/q), gdy wynik jest wymierny (√9, 8^(2/3), 16^(3/4)); inaczej null
        if (e.d === 1n || e.d > 8n || (e.n < 0n ? -e.n : e.n) > 64n) return null;
        var q = Number(e.d), neg = a.n < 0n;
        if (neg && q % 2 === 0) return null;
        var rn = intRoot(neg ? -a.n : a.n, q), rd = intRoot(a.d, q);
        if (rn === null || rd === null || rn === 0n && e.n < 0n) return null;
        return K.powR(K.R(neg ? -rn : rn, rd), Number(e.n));
    }
    function astValue(n) { // [EN] dokładna wartość wymierna albo null (pierwiastki, funkcje, zmienna, dzielenie przez 0)
        try {
            var a = n.a && astValue(n.a), b = n.b && astValue(n.b);
            switch (n.k) {
                case 'num': return n.v;
                case 'neg': return a && K.neg(a);
                case 'add': return a && b && K.add(a, b);
                case 'sub': return a && b && K.sub(a, b);
                case 'mul': return a && b && K.mul(a, b);
                case 'div': return a && b && !K.isZero(b) ? K.div(a, b) : null;
                case 'pow': return a && b && K.isInt(b) && b.n >= 0n && b.n <= 64n ? K.powR(a, Number(b.n)) : a && b ? exactPow(a, b) : null;
                case 'sqrt': return a && exactPow(a, K.R(1, 2));
            }
        } catch (x) { /* [EN] 0^(−1) itp. — brak wartości */ }
        return null;
    }
    function astNum(r, paren) { return { k: 'num', v: r, lp: paren && (r.n < 0n || r.d !== 1n) }; }
    function astSigns(n) { // [EN] 8 + (−4) → 8 − 4
        if ((n.k === 'add' || n.k === 'sub') && n.b.k === 'num' && !n.b.lp && n.b.v.n < 0n)
            return { k: n.k === 'add' ? 'sub' : 'add', a: n.a, b: astNum(K.neg(n.b.v)) };
        return n;
    }
    function parenLead(n, pr) { // [EN] −(−4) · 11: ujemna liczba na początku iloczynu/ilorazu po minusie też w nawiasie
        if ((n.k === 'mul' || n.k === 'div') && n.a) return Object.assign({}, n, { a: parenLead(n.a, pr) });
        return pr(n);
    }
    function astMap(n, f) { // [EN] kopia drzewa z f(dziecko) w miejscu a/b
        var out = Object.assign({}, n);
        if (n.a) out.a = f(n.a, 'a');
        if (n.b) out.b = f(n.b, 'b');
        out = astSigns(out);
        var pr = function (x, need) { return x && x.k === 'num' && !x.lp && (x.v.n < 0n || need === 2 && x.v.d !== 1n) ? Object.assign({}, x, { lp: true }) : x; };
        if (out.k === 'mul') out.b = pr(out.b);
        else if (out.k === 'pow') out.a = pr(out.a, 2);
        else if (out.k === 'div') out.b = pr(out.b, 2);
        else if (out.k === 'sub') out.b = pr(out.b);
        else if (out.k === 'neg') out.a = parenLead(out.a, pr);
        return out;
    }
    function plugVar(n, v, pt, ctx) { // [EN] zmienna → liczba punktu; nawias, gdy liczba ujemna/ułamkowa stoi pod potęgą, po minusie, w iloczynie
        if (n.k === 'var') return n.v === v ? astNum(pt, ctx !== 'add' && ctx !== 'fn' && ctx !== 'root' && ctx !== 'subA' && (pt.n < 0n || ctx !== 'addB')) : n;
        if (!n.a) return n;
        var c = n.k === 'sub' ? ['subA', 'sub'] : n.k === 'add' ? ['add', 'addB'] : n.k === 'fn' || n.k === 'sqrt' ? ['fn', 'fn'] : [n.k, n.k];
        var out = astMap(n, function (x, s) { return plugVar(x, v, pt, s === 'a' ? c[0] : c[1]); });
        if (out.k === 'mul') out.implicit = false;
        return out;
    }
    function plugRadicands(n) { // [EN] suma pod pierwiastkiem / w podstawie potęgi ułamkowej: √(3 + 1) → √4
        var rad = n.k === 'sqrt' ? 'a' : n.k === 'pow' && astValue(n.b) && astValue(n.b).d !== 1n ? 'a' : null;
        if (rad && astHasSum(n.a)) { var r = astValue(n.a); if (r) return Object.assign({}, n, { a: astNum(r) }); }
        return n.a ? astMap(n, plugRadicands) : n;
    }
    function plugValues(n) { // [EN] każdy fragment bez dodawania → jedna liczba
        if (!astHasSum(n) && n.k !== 'num') { var r = astValue(n); if (r) return astNum(r); }
        return n.a ? astMap(n, plugValues) : n;
    }
    function plugSumVals(n) { // [EN] każda suma → liczba, ale iloczyny i ilorazy jeszcze niepomnożone: 32 · (−3)
        if ((n.k === 'add' || n.k === 'sub') && astHasSum(n)) { var r = astValue(n); if (r) return astNum(r); }
        return n.a ? astMap(n, plugSumVals) : n;
    }
    function plugSums(n) { // [EN] sumy policzone; ułamek zostaje nieskrócony (−20/5), licznik i mianownik osobno
        if (n.k === 'div') {
            var a = astValue(n.a), b = astValue(n.b);
            if (a && b && !K.isZero(b)) return { k: 'div', a: astNum(a, a.d !== 1n), b: astNum(b, true) };
        }
        if (astHasSum(n)) { var r = astValue(n); if (r) return astNum(r); }
        return n.a ? astMap(n, plugSums) : n;
    }
    function plugSteps(e, v, t, at) { // [EN] kolejne zapisy po „=” (bez wyniku końcowego), bez sąsiednich powtórzeń
        var out = [];
        try {
            var cur = plugVar(K.parse(C.show(e)), v, C.numberOf(pointExpr(t)), 'root');
            [function (x) { return x; }, plugRadicands, plugValues, plugSumVals, plugSums].forEach(function (f) {
                cur = f(cur);
                var s = astText(cur);
                if (out[out.length - 1] !== s) out.push(s);
            });
        } catch (x) { /* [EN] nie umiemy wypisać — zostaje sam wynik */ }
        out.push(C.show(at));
        return out.filter(function (s, i) { return !i || s !== out[i - 1]; });
    }
    var RULES = [
        { // [EN] bez zmiennej: granica stałej to ta stała
            name: 'constant',
            test: function (e, v) { return !C.hasVar(e, v); },
            apply: function (e) {
                if (!isFinite(numVal(e))) throw new NotSupported();
                return { kind: 'num', e: e };
            }
        },
        { // [EN] funkcja ciągła w punkcie: podstawiamy
            name: 'substitution',
            test: function (e, v, t) { return isFiniteTarget(t); },
            apply: function (e, v, t, log) {
                var pt = pointExpr(t);
                // [EN] każdy czynnik liczony LICZBOWO w punkcie: ln(0), ctg(0) to nie liczby, a ln 0 − ln 0
                // nie wolno skrócić symbolicznie; mianownik ≠ 0 (∛8 − 2 to zero, choć nie wygląda)
                var D0 = Dec(), env0 = {};
                env0[v] = new D0(String(t.src != null ? t.src : t.at));
                e.forEach(function (term) {
                    term.fs.forEach(function (f) {
                        var r0 = valueAt(function () { return evalDec(C.atomExpr(f.b), env0); }, null);
                        if (!r0) throw new NotSupported();
                        if (f.e.n < 0n && r0.abs().lt(1e-12)) throw new NotSupported();
                    });
                });
                var at = fold(substitute(e, v, pt));
                var val = numVal(at);
                if (C.hasVar(at, v) || !isFinite(val)) throw new NotSupported();
                line(log, 'Podstawiamy ' + v + ' = ' + targetText({ at: t.at, src: t.src, side: 0 }), limOf(v, t, e) + ' = ' + plugSteps(e, v, t, at).join(' = '));
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
    /* (√2)² i ∛3·3^(2/3) zostają w wyrażeniu jako „liczba do potęgi całkowitej”, więc
       4n² − 2·2n² się nie skraca. Liczby z wykładnikiem całkowitym wracają do współczynnika. */
    function rootOut(k, d) { // [EN] największe m z mᵈ | k (√8 → 2√2); k całkowite dodatnie
        if (k > 1000000n) return 1n;
        for (var m = BigInt(Math.floor(Math.pow(Number(k), 1 / d) + 1e-9)); m > 1n; m--) {
            if (k % (m ** BigInt(d)) === 0n) return m;
        }
        return 1n;
    }
    function fold(e) {
        return e.reduce(function (acc, t) {
            var c = t.c, fs = [], sums = {};
            t.fs.forEach(function (f) {
                if (f.b.k === 'num' && K.isInt(f.e)) {
                    var pw = K.powR(f.b.v, Number(f.e.n < 0n ? -f.e.n : f.e.n));
                    c = f.e.n < 0n ? K.div(c, pw) : K.mul(c, pw);
                    return;
                }
                if (f.b.k === 'num' && f.b.v.d === 1n && f.b.v.n > 1n) { // [EN] √8 = 2√2
                    var d = Number(f.e.d), m = rootOut(f.b.v.n, d);
                    if (m > 1n) {
                        var mp = K.powR(K.R(m), Number(f.e.n < 0n ? -f.e.n : f.e.n));
                        c = f.e.n < 0n ? K.div(c, mp) : K.mul(c, mp);
                        var restN = f.b.v.n / (m ** BigInt(d));
                        if (restN > 1n) fs.push({ b: { k: 'num', v: K.R(restN) }, e: f.e });
                        return;
                    }
                }
                if (f.b.k === 'sum' && !K.isInt(f.e)) { // [EN] √a·√b = √(ab): jeden pierwiastek do sprzężenia
                    var key = K.fmt(f.e);
                    sums[key] = sums[key] ? { s: C.expandExpr(C.cMul(sums[key].s, fold(f.b.s))), e: f.e, many: true } : { s: fold(f.b.s), e: f.e };
                    return;
                }
                if (f.b.k === 'sum') {
                    var inner = fold(f.b.s);
                    if (C.isNumber(inner) && K.isInt(f.e) && !K.isZero(C.numberOf(inner))) { // [EN] (32)⁻¹ → 1/32
                        var q = K.powR(C.numberOf(inner), Number(f.e.n < 0n ? -f.e.n : f.e.n));
                        c = f.e.n < 0n ? K.div(c, q) : K.mul(c, q);
                    } else fs.push({ b: { k: 'sum', s: inner }, e: f.e });
                } else fs.push(f);
            });
            var out = fs.length ? C.cMul(C.num(c), C.atomsProduct(fs)) : C.num(c);
            Object.keys(sums).forEach(function (k2) {
                var sm = sums[k2];
                out = C.cMul(out, sm.many ? C.cPow(sm.s, sm.e) : C.atomsProduct([{ b: { k: 'sum', s: sm.s }, e: sm.e }]));
            });
            return C.cAdd(acc, out);
        }, []);
    }

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
                c = fold(C.cMul(c, C.cPow(inner.c, r)));
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
        if (!c.length || Math.abs(numVal(c)) < 1e-12) throw new NotSupported(); // [EN] ∞ − ∞
        return { p: p, rest: rest, c: c };
    }
    function uText(v, sign, p) {
        var base = sign > 0 ? v : '(−' + v + ')';
        if (K.eq(p, ONE)) return base;
        // [EN] potęga połówkowa/trzeciowa jak na kartce: x^(1/2) → √x, (−x)^(3/2) → (−x)√(−x), nie zapis z klawiatury
        if (p.n > 0n && (p.d === 2n || p.d === 3n)) {
            var whole = Number(p.n / p.d), rest = Number(p.n % p.d), root = (p.d === 2n ? '√' : '∛') + (sign > 0 ? v : '(−' + v + ')');
            if (rest === 1) return (whole ? base + (whole > 1 ? K.sup(String(whole)) : '') : '') + root;
        }
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
            // [EN] √(x²) = |x| tylko, gdy wyłączamy całe potęgi; przy √(−x) wystarczy: x < 0, więc −x > 0
            if (sign < 0 && hasEvenRoot(e, v)) line(log, 'Dla ' + v + ' → −∞', K.isInt(N.p) && K.isInt(D.p)
                ? '⟦√(' + v + '²)⟧ = |' + v + '| = −' + v : v + ' < 0, więc −' + v + ' > 0',
                K.isInt(N.p) && K.isInt(D.p) ? 'pierwiastek-z-kwadratu' : null);
            var same = K.eq(N.p, D.p), alone = isOne(fr.D);
            var label = (same || alone) && !K.isZero(N.p) ? 'Wyłączamy ' + uText(v, sign, N.p) + ' przed nawias' : 'Wyłączamy najwyższe potęgi przed nawias';
            // [EN] ułamek w liczniku (1/8 · …) → 8 do mianownika: …/(8(…)), nie 1/8√n(…) ani …/8/(…)
            var nc = N.rest.length === 1 ? N.rest[0].c : ONE;
            if (nc.d !== 1n && !isOne(fr.D)) {
                N = Object.assign({}, N, { rest: [C.term(K.R(nc.n), N.rest[0].fs)] });
                D = Object.assign({}, D, { rest: [C.term(K.R(nc.d), [{ b: { k: 'sum', s: D.rest }, e: ONE }])] });
            }
            var pn = pulledText(v, sign, N), pd = pulledText(v, sign, D);
            var pdWrapped = K.isZero(D.p) ? grp(D.rest) : '(' + pd + ')';
            // [EN] same liczby w nawiasach (−1/n) — nie ma czego wyłączać, krok byłby pusty (6e)
            if (!(C.isNumber(N.rest) && C.isNumber(D.rest))) line(log, label, head + (alone ? pn : pn + '/' + pdWrapped));
            var q = K.sub(N.p, D.p);
            if (same && !K.isZero(N.p)) line(log, 'Skracamy ' + uText(v, sign, N.p), head + quotientText(N.rest, D.rest));
            var cval = C.cMul(N.c, C.cPow(D.c, K.neg(ONE)));
            var cv = numVal(cval), cText = C.show(rationalize(cval));
            if (K.isZero(q)) { // [EN] pokazujemy podstawienie: (2 + 0)/(6 + 0) = 1/3, nie sam wynik
                var plugged = plugText(quotientText(N.rest, D.rest), v, t);
                line(log, 'Wyrazy z ' + v + ' w mianowniku dążą do 0', '→ ' + (plugged ? plugged + ' = ' : '') + cText);
                return { kind: 'num', e: cval };
            }
            var neg = K.toNum(q) < 0, infSign = cv > 0 ? 1 : -1;
            var tail = neg ? ' → 0' : ' → ' + (infSign > 0 ? '+∞' : '−∞');
            line(log, 'Wyrazy z ' + v + ' w mianowniku dążą do 0', '→ ' + (cText === '1' ? '' : cText + ' · ') + (neg ? '1/' : '') + uText(v, sign, neg ? K.neg(q) : q) + tail);
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
            line(log, 'Łączymy logarytmy w jeden', limHead(v, t) + '⟦' + C.show(combined) + '⟧', 'log-iloraz');
            var inn = limitOf(inner, v, t, log, depth);
            if (inn.kind === 'inf') {
                if (inn.sign < 0) throw new NotSupported();
                line(log, 'Logarytm rośnie bez ograniczeń', '→ +∞');
                return { kind: 'inf', sign: 1 };
            }
            if (inn.kind !== 'num') throw new NotSupported();
            var val = numVal(inn.e);
            if (!(val > 0)) throw new NotSupported();
            var res = C.isNumber(inn.e) ? exactLog(lp.kind.f, lp.kind.base, C.numberOf(inn.e)) : null;
            var resE = res ? C.num(res) : C.cFn(lp.kind.f, inn.e, lp.kind.base);
            line(log, 'Logarytm jest ciągły', '→ ' + C.show(C.cFn(lp.kind.f, inn.e, lp.kind.base)) + (res ? ' = ' + C.show(resE) : ''));
            return { kind: 'num', e: resE };
        }
    };
    // ── Sprzężenie: A − B = (Aᵏ − Bᵏ)/(Aᵏ⁻¹ + Aᵏ⁻²B + … + Bᵏ⁻¹) ────────────
    var ROOT_K = { '1/2': 2, '1/3': 3, '1/4': 4 };
    function rootDegree(t, v) { // [EN] c·∛3·∛(X) (wspólny dzielnik wyciągnięty spod pierwiastka) → k, inaczej 0
        var k = 0, sums = 0;
        for (var i = 0; i < t.fs.length; i++) {
            var f = t.fs[i], kk = ROOT_K[K.fmt(f.e).replace(/\s/g, '')] || 0;
            if (!kk) return 0;
            if (k && kk !== k) return 0;
            k = kk;
            if (f.b.k === 'sum' && C.hasVar(f.b.s, v)) sums++;
            else if (f.b.k !== 'num') return 0;
        }
        return sums === 1 ? k : 0;
    }
    function isPlain(t) { // [EN] bez pierwiastka z sumy (n, 3n², stała)
        return t.fs.every(function (f) { return f.b.k !== 'sum' || K.isInt(f.e); });
    }
    function cancels(D, v, t) { // [EN] różnica daje symbol nieoznaczony (∞ − ∞ albo → 0 w punkcie)
        if (!isFiniteTarget(t)) {
            try { pullExpr(D, v, t.at === 'inf' ? 1 : -1); return false; }
            catch (err) { return err instanceof NotSupported; }
        }
        var r = numericLimit(D, v, t);
        return !!r && r.kind === 'num' && Math.abs(r.value) < 1e-9;
    }
    function conjPair(D, v) {
        // [EN] A − B: jeden pierwiastek i reszta bez pierwiastka (√(x+7) − x − 1), dwa pierwiastki
        // tego samego stopnia, albo dwa pierwiastki kwadratowe i reszta (√a + √b − 2n²)
        if (D.length < 2) return null;
        var roots = D.filter(function (t) { return rootDegree(t, v) > 0; });
        var plain = D.filter(function (t) { return !rootDegree(t, v); });
        if (!roots.length || !plain.every(isPlain)) return null;
        var k = rootDegree(roots[0], v);
        if (roots.some(function (t) { return rootDegree(t, v) !== k; })) return null;
        if (roots.length === 1) return plain.length ? { A: roots, B: C.cNeg(plain), k: k } : null;
        if (roots.length === 2 && !plain.length) return { A: [roots[0]], B: C.cNeg([roots[1]]), k: k };
        if (roots.length === 2 && k === 2) return { A: roots, B: C.cNeg(plain), k: 2 };
        return null;
    }
    function findDifference(e, v, t) {
        if (e.length > 1) return conjPair(e, v) && cancels(e, v, t) ? { whole: true, D: e } : null;
        var fs = e[0].fs;
        for (var i = 0; i < fs.length; i++) {
            var f = fs[i];
            if (f.b.k !== 'sum' || !K.isInt(f.e) || (f.e.n !== 1n && f.e.n !== -1n)) continue;
            if (conjPair(f.b.s, v) && cancels(f.b.s, v, t)) return { whole: false, idx: i, D: f.b.s, up: f.e.n === 1n };
        }
        return null;
    }
    var CONJ_FORMULA = { 2: 'sprzezenie', 3: 'roznica-szescianow', 4: 'roznica-czwartych' }; // [EN] wzór w dymku, nie w etykiecie
    var conjugate = {
        name: 'conjugate',
        test: function (e, v, t) { return !!findDifference(e, v, t); },
        apply: function (e, v, t, log, depth) {
            var hit = findDifference(e, v, t), pair = conjPair(hit.D, v), k = pair.k;
            var Ak = fold(C.cPow(pair.A, K.R(k))), Bk = fold(C.cPow(pair.B, K.R(k)));
            var top = fold(C.expandExpr(fold(C.expandExpr(C.cSub(Ak, Bk))))); // [EN] (√a + √b)² → a + 2√(ab) + b
            var S = [];
            for (var i = 0; i < k; i++) S = C.cAdd(S, fold(C.cMul(C.cPow(pair.A, K.R(k - 1 - i)), C.cPow(pair.B, K.R(i)))));
            var bShown = Bk.length > 1 || (Bk[0] && Bk[0].c.n < 0n) ? '(' + C.show(Bk) + ')' : C.show(Bk);
            var raw = C.showInner(Ak) + ' − ' + bShown;
            line(log, 'Mnożymy przez sprzężenie', C.show(hit.D) + ' = (⟦' + raw + '⟧)/' + grp(S), CONJ_FORMULA[k]);
            var frac = C.cMul(top, C.cPow(S, K.neg(ONE)));
            var out;
            if (hit.whole) out = frac;
            else {
                out = C.num(e[0].c);
                e[0].fs.forEach(function (f, j) {
                    if (j === hit.idx) out = C.cMul(out, hit.up ? frac : C.cPow(frac, K.neg(ONE)));
                    else out = C.cMul(out, C.cPow(C.atomExpr(f.b), f.e));
                });
            }
            out = fold(out);
            line(log, 'Upraszczamy', limOf(v, t, out));
            return limitOf(out, v, t, log, depth);
        }
    };

    // ── Trzy wyrazy, które się znoszą: rozbijamy środkowy na dwie połowy ──
    function addAnswers(a, b) {
        if (a.kind === 'num' && b.kind === 'num') return { kind: 'num', e: C.cAdd(a.e, b.e) };
        if (a.kind === 'inf' && b.kind === 'num') return a;
        if (b.kind === 'inf' && a.kind === 'num') return b;
        if (a.kind === 'inf' && b.kind === 'inf' && a.sign === b.sign) return a;
        throw new NotSupported();
    }
    var splitPairs = {
        name: 'splitPairs',
        test: function (e, v, t) {
            return !isFiniteTarget(t) && e.length === 3 && cancels(e, v, t) &&
                e.some(function (x) { return K.eq(x.c, K.R(2)) || K.eq(x.c, K.R(-2)); });
        },
        apply: function (e, v, t, log, depth) {
            var mid = -1;
            e.forEach(function (x, i) { if (mid < 0 && (K.eq(x.c, K.R(2)) || K.eq(x.c, K.R(-2)))) mid = i; });
            var half = [C.term(K.div(e[mid].c, K.R(2)), e[mid].fs)];
            var others = e.filter(function (x, i) { return i !== mid; });
            var P = C.cAdd([others[0]], half), Q = C.cAdd([others[1]], half);
            line(log, 'Rozbijamy na dwie różnice', limHead(v, t) + '[(' + C.show(P) + ') + (' + C.show(Q) + ')]');
            var a = limitOf(P, v, t, log, depth), b = limitOf(Q, v, t, log, depth);
            var sum = addAnswers(a, b);
            if (sum.kind === 'num') line(log, 'Dodajemy granice', '→ ' + C.show(rationalize(a.e)) + ' + ' + C.show(rationalize(b.e)) + ' = ' + C.show(rationalize(sum.e)));
            return sum;
        }
    };
    // ── 1^∞: lim f^g = e^(lim g·(f − 1)), jak na zajęciach: f = 1 + 1/aₙ ──────
    function expOf(e) { // [EN] c · f^g (jedna potęga o zmiennym wykładniku) → { c, f, g }
        if (e.length !== 1) return null;
        var t = e[0];
        if (t.fs.length !== 1 || t.fs[0].b.k !== 'exp' || !K.eq(t.fs[0].e, ONE)) return null;
        return { c: t.c, f: t.fs[0].b.b, g: t.fs[0].b.x };
    }
    function minusOne(f) { // [EN] f − 1 jako jeden iloraz: (P − Q)/Q albo uproszczona suma
        var fr = splitFraction(f);
        if (!isOne(fr.D)) {
            var top = fold(C.expandExpr(C.cSub(fr.N, fr.D)));
            return C.cMul(top, C.cPow(fr.D, K.neg(ONE)));
        }
        return fold(C.expandExpr(C.cSub(f, C.num(ONE))));
    }
    var eLimit = {
        name: 'eLimit',
        test: function (e, v, t) {
            var p = expOf(e);
            if (!p || !C.hasVar(p.g, v)) return false;
            var fb = numericLimit(p.f, v, t), gx = numericLimit(p.g, v, t);
            // [EN] podstawa → 1 bywa wolna (1 − 3/√n), więc próg zależy od zbieżności; wynik i tak jest sprawdzany
            var gInf = !!gx && (gx.kind === 'inf' || (gx.kind === 'sides' && gx.left.kind === 'inf' && gx.right.kind === 'inf'));
            return !!fb && fb.kind === 'num' && Math.abs(fb.value - 1) <= Math.max(1e-6, 10 * (fb.err || 0)) && gInf;
        },
        apply: function (e, v, t, log, depth) {
            var p = expOf(e), h = minusOne(p.f), a = C.cPow(h, K.neg(ONE));
            var sa = C.show(a), pa = /^(\d+(\.\d+)?|[a-zA-Z])$/.test(sa) ? sa : '(' + sa + ')';
            // [EN] zawsze „1 + …”: 1 − 1/n = 1 + 1/(−n), 1 − 3/(n + 3) = 1 + (−3/(n + 3)); f już w tej postaci → 1 + 1/aₙ
            var sh = C.show(h), neg = /^−/.test(sh);
            var onePlus = neg && /^1\//.test(C.show(C.cNeg(h))) ? '1 + 1/' + pa : neg ? '1 + (' + sh + ')' : '1 + ' + sh;
            if (onePlus === C.show(p.f)) onePlus = '1 + 1/' + pa;
            line(log, 'Dorabiamy jedynkę', (onePlus === C.show(p.f) ? onePlus : C.show(p.f) + ' = ' + onePlus) + ',  aₙ = ' + sa);
            var gh = fold(C.cMul(p.g, h));
            var sgh = C.show(gh), still = !C.hasVar(gh, v);
            // [EN] bez osobnego kroku „Wzór na e” (spec 5.12): fragment ⟦…⟧ jest wyróżniony kolorem, stuknięcie → dymek ze wzorem
            var core = '⟦(' + onePlus + ')^' + pa + '⟧';
            var pw = function (x) { return x === '1' ? '' : /^\d+$/.test(x) ? K.sup(x) : '^(' + x + ')'; }; // [EN] e³, nie e^(3)
            line(log, 'Kolorowa potęga dąży do e', limHead(v, t) + (sgh === '1' ? core + ' = e'
                : '(' + core + ')' + pw(sgh) + (still ? ' = e' + pw(sgh) : '')));
            if (log) log[log.length - 1].formula = { id: 'e' };
            var mark = log ? log.length : 0;
            if (!still) line(log, 'Granica wykładnika', limOf(v, t, gh));
            var L = limitOf(gh, v, t, still ? null : log, depth); // [EN] stały wykładnik jest już w kroku wyżej
            // [EN] wykładnik bez kroków pośrednich (prosta granica): jeden krok zamiast dwóch
            var single = still || (!!log && log.length === mark + 1 && L.kind === 'num');
            if (single && !still) log[mark].math += ' = ' + C.show(rationalize(fold(L.e)));
            var coef = C.num(p.c);
            if (L.kind === 'inf') {
                line(log, 'Potęga e', L.sign > 0 ? '→ e^(+∞) = +∞' : '→ e^(−∞) = 0');
                if (L.sign < 0) return { kind: 'num', e: [] };
                if (p.c.n < 0n) return { kind: 'inf', sign: -1 };
                return { kind: 'inf', sign: 1 };
            }
            if (L.kind !== 'num') throw new NotSupported();
            var res = { kind: 'num', e: C.cMul(coef, C.cExp(C.E_CONST, L.e)) };
            // [EN] składamy wynik: e^(−6) = 1/e⁶ (bez powtórzonego „Wykładnik → −6”)
            var et = 'e' + pw(C.show(rationalize(fold(L.e))));
            var ct = K.eq(p.c, ONE) ? '' : K.fmt(p.c) + ' · ', fin = formatAnswer(res).text;
            // [EN] współczynnik spoza potęgi (5·(1 + 1/n)ⁿ) wraca dopiero tutaj — inaczej krok mówiłby „e = 5e”
            if (still && !ct) { if (log && fin !== et) log[mark - 1].math += ' = ' + fin; }
            else line(log, 'Składamy wynik', ct + et + (fin !== ct + et ? ' = ' + fin : ''));
            return res;
        }
    };
    // [EN] drugi sposób dla 1^∞ (spec 2026-11-23-sposoby-design.md): lim f^g = e^(lim g·(f − 1)) — bez dorabiania jedynki
    var eShortcut = {
        name: 'eShortcut',
        test: eLimit.test,
        apply: function (e, v, t, log, depth) {
            var p = expOf(e), h = minusOne(p.f), gh = fold(C.cMul(p.g, h));
            var grp = function (x) { var s = C.show(x); return x.length > 1 || /[+−/]/.test(s) ? '(' + s + ')' : s; }; // [EN] n · (−1/n), (1/x²) · (…) — bez dwuznaczności
            var put = grp(p.g) + ' · ' + grp(h), sgh = C.show(gh), still = !C.hasVar(gh, v);
            line(log, 'Liczę wykładnik ze wzoru skróconego', '⟦' + grp(p.g) + ' · (' + C.show(p.f) + ' − 1)⟧ = ' + put + (put === sgh ? '' : ' = ' + sgh), 'e-skrocony');
            var mark = log ? log.length : 0;
            if (!still) line(log, 'Granica wykładnika', limOf(v, t, gh));
            var L = limitOf(gh, v, t, still ? null : log, depth);
            if (!still && log && log.length === mark + 1 && L.kind === 'num') log[mark].math += ' = ' + C.show(rationalize(fold(L.e)));
            var pw = function (x) { return x === '1' ? '' : /^\d+$/.test(x) ? K.sup(x) : '^(' + x + ')'; };
            if (L.kind === 'inf') {
                line(log, 'Potęga e', L.sign > 0 ? '→ e^(+∞) = +∞' : '→ e^(−∞) = 0');
                if (L.sign < 0) return { kind: 'num', e: [] };
                return { kind: 'inf', sign: p.c.n < 0n ? -1 : 1 };
            }
            if (L.kind !== 'num') throw new NotSupported();
            var res = { kind: 'num', e: C.cMul(C.num(p.c), C.cExp(C.E_CONST, L.e)) };
            var et = 'e' + pw(C.show(rationalize(fold(L.e)))), ct = K.eq(p.c, ONE) ? '' : K.fmt(p.c) + ' · ', fin = formatAnswer(res).text;
            line(log, 'Składamy wynik', ct + et + (fin !== ct + et ? ' = ' + fin : ''));
            return res;
        }
    };
    // [EN] aᵍᵏ/bᵍ = (aᵏ/b)ᵍ — wspólny wykładnik dla ilorazu potęg (zad. 6h)
    var sameExponent = {
        name: 'sameExponent',
        test: function (e) {
            if (e.length !== 1) return false;
            var ex = e[0].fs.filter(function (f) { return f.b.k === 'exp'; });
            if (ex.length !== 2 || e[0].fs.length !== 2) return false;
            var ratio = C.cMul(ex[0].b.x, C.cPow(ex[1].b.x, K.neg(ONE)));
            return C.isNumber(ratio);
        },
        apply: function (e, v, t, log, depth) {
            var fs = e[0].fs, A = fs[0], B = fs[1];
            var k = C.numberOf(C.cMul(C.cMul(A.b.x, C.num(A.e)), C.cPow(C.cMul(B.b.x, C.num(B.e)), K.neg(ONE))));
            // A^(xA·eA) · B^(xB·eB), xA·eA = k · xB·eB → (A^k · B)^(xB·eB)
            var g = C.cMul(B.b.x, C.num(B.e)), kk = k, flip = k.n < 0n;
            if (flip) { g = C.cNeg(g); kk = K.neg(k); } // [EN] dodatni wykładnik, jak na kartce: (a/b)ᵍ
            var asAtom = function (x) { return x.length > 1 ? [C.term(ONE, [{ b: { k: 'sum', s: x }, e: ONE }])] : x; };
            var P = asAtom(fold(C.expandExpr(C.cPow(A.b.b, kk)))), Q = asAtom(fold(C.expandExpr(B.b.b)));
            var ratio = flip ? C.cMul(P, C.cPow(Q, K.neg(ONE))) : C.cMul(P, Q);
            var combined = C.cMul(C.num(e[0].c), C.cExp(ratio, g));
            line(log, 'Zapisujemy oba wykładniki tak samo', limHead(v, t) + '⟦' + C.show(combined) + '⟧', 'potega-ilorazu');
            return limitOf(combined, v, t, log, depth);
        }
    };
    // ── 0/0 w punkcie: rozkład wielomianów (schemat Hornera) i skracanie (x − a) ──
    function hornerAt(c, a) { // [EN] c rosnąco, dokładnie
        var r = K.ZERO;
        for (var i = c.length - 1; i >= 0; i--) r = K.add(K.mul(r, a), c[i]);
        return r;
    }
    function deflateBy(c, a) { // [EN] c(x)/(x − a), reszta = 0
        var n = c.length - 1, b = new Array(n);
        b[n - 1] = c[n];
        for (var i = n - 1; i >= 1; i--) b[i - 1] = K.add(c[i], K.mul(a, b[i]));
        return b;
    }
    function trimPoly(c) { while (c.length > 1 && K.isZero(c[c.length - 1])) c = c.slice(0, -1); return c; }
    var factorCancel = {
        name: 'factorCancel',
        test: function (e, v, t) {
            if (!isFiniteTarget(t) || e.length !== 1) return false;
            var a = C.numberOf(pointExpr(t));
            var rootIn = function (down) { // [EN] (x − a) musi być i w liczniku, i w mianowniku — inaczej nie ma czego skracać
                return e[0].fs.some(function (f) {
                    if ((f.e.n < 0n) !== down || !K.isInt(f.e)) return false;
                    var c = C.polyCoefs(C.atomExpr(f.b), v);
                    return !!c && c.length > 1 && K.isZero(hornerAt(c, a));
                });
            };
            return rootIn(true) && rootIn(false);
        },
        apply: function (e, v, t, log, depth) {
            var a = C.numberOf(pointExpr(t)), xa = C.polyExpr([K.neg(a), ONE], v);
            var M = 0, rest = C.num(e[0].c), ups = [], downs = [], tables = [], divLines = [];
            e[0].fs.forEach(function (f) {
                var c = K.isInt(f.e) ? C.polyCoefs(C.atomExpr(f.b), v) : null;
                var pow = Number(f.e.n < 0n ? -f.e.n : f.e.n), list = f.e.n < 0n ? downs : ups;
                if (!c || c.length < 2) {
                    rest = C.cMul(rest, C.cPow(C.atomExpr(f.b), f.e));
                    list.push(grpFactor(C.atomExpr(f.b), pow));
                    return;
                }
                c = trimPoly(c);
                var m = 0;
                while (c.length > 1 && K.isZero(hornerAt(c, a))) {
                    var low = deflateBy(c, a), top = c.slice().reverse(), mid = [''], bot = [top[0]]; // [EN] schemat Hornera jak w równaniach
                    for (var hi = 1; hi < top.length; hi++) { var pr = K.mul(a, bot[hi - 1]); mid.push(K.fmt(pr)); bot.push(K.add(top[hi], pr)); }
                    if (c.length === 2 && K.eq(c[1], ONE)) { c = low; m++; continue; } // [EN] już dokładnie (x − a): dzielenie (x − a) : (x − a) = 1 to szum
                    tables.push({ name: f.e.n < 0n ? 'mianownik' : 'licznik', r: K.fmt(a), top: top.map(K.fmt), mid: mid, bot: bot.map(K.fmt) });
                    var dl = '(' + C.show(C.polyExpr(c, v)) + ') : (' + C.show(xa) + ') = ' + C.show(C.polyExpr(low, v));
                    divLines.push({ name: tables[tables.length - 1].name, dl: dl });
                    c = low; m++;
                }
                M += (f.e.n < 0n ? -1 : 1) * m * pow;
                var Q = C.polyExpr(c, v);
                rest = C.cMul(rest, C.cPow(Q, f.e));
                for (var i = 0; i < m * pow; i++) list.push('(' + C.show(xa) + ')');
                if (!isOne(Q)) list.push(grpFactor(Q, pow));
            });
            if (!M && !ups.concat(downs).some(function (x) { return x === '(' + C.show(xa) + ')'; })) throw new NotSupported();
            var head = limHead(v, t), coef = K.fmt(e[0].c) === '1' ? '' : K.fmt(e[0].c);
            if (tables.length) { // [EN] licznik przed mianownikiem (sort jest stabilny)
                var byName = function (x, y) { return x.name < y.name ? -1 : x.name > y.name ? 1 : 0; };
                tables.sort(byName); divLines.sort(byName);
                line(log, 'Dzielimy schematem Hornera', divLines.map(function (x) { return x.dl.replace(/^(.*?) = /, '⟦$1⟧ = '); }).join('\n'), 'schemat-hornera', { horner: tables });
            }
            line(log, 'Rozkładamy na czynniki', head + coef + (ups.join('') || '1') + '/' + (downs.length > 1 ? '(' + downs.join('') + ')' : downs.join('')));
            var out = M ? C.cMul(rest, C.cPow(xa, K.R(M))) : rest;
            line(log, 'Skracamy (' + C.show(xa) + ')', limOf(v, t, out));
            return limitOf(out, v, t, log, depth);
        }
    };
    function grpFactor(x, pow) {
        var s = x.length > 1 ? '(' + C.show(x) + ')' : C.show(x);
        return pow > 1 ? (x.length > 1 ? s : '(' + s + ')') + K.sup(String(pow)) : s;
    }
    // ── Granice znane: sin u/u, tg u/u, (eᵘ − 1)/u, ln(1 + u)/u, arcsin u/u, arctg u/u → 1 ──
    var KNOWN_FN = { sin: 'sinu', tan: 'tgu', asin: 'arcsinu', atan: 'arctgu' }; // [EN] id wzoru w słowniku
    function isE(x) { return x.length === 1 && K.eq(x[0].c, ONE) && x[0].fs.length === 1 && x[0].fs[0].b.k === 'const' && x[0].fs[0].b.v === 'e' && K.eq(x[0].fs[0].e, ONE); }
    function knownPart(x, v, t) { // [EN] x = sin(u) | tg(u) | eᵘ − 1 | ln(1 + u), u → 0 → { u, label }
        var hit = null;
        // [EN] licznik (eˣ − 1) przychodzi jako jeden czynnik-suma — rozpakowujemy, inaczej szło de l'Hospitalem (błędne koło)
        if (x.length === 1 && K.eq(x[0].c, ONE) && x[0].fs.length === 1 && x[0].fs[0].b.k === 'sum' && K.eq(x[0].fs[0].e, ONE)) x = x[0].fs[0].b.s;
        if (x.length === 1 && x[0].fs.length === 1 && K.eq(x[0].fs[0].e, ONE) && x[0].fs[0].b.k === 'fn') {
            var a = x[0].fs[0].b;
            var top1 = [C.term(ONE, x[0].fs)];
            if (KNOWN_FN[a.f]) hit = { u: a.a, label: KNOWN_FN[a.f], c: x[0].c, top: top1 };
            else if (a.f === 'ln') hit = { u: fold(C.expandExpr(C.cSub(a.a, C.num(ONE)))), label: 'ln1u', c: x[0].c, top: top1 };
        } else if (x.length === 2) {
            var ex = x.filter(function (tt) { return tt.fs.length === 1 && tt.fs[0].b.k === 'exp' && isE(tt.fs[0].b.b) && K.eq(tt.fs[0].e, ONE); });
            var cst = x.filter(function (tt) { return !tt.fs.length; });
            if (ex.length === 1 && cst.length === 1 && K.eq(cst[0].c, K.neg(ex[0].c))) hit = { u: ex[0].fs[0].b.x, label: 'eu', c: ex[0].c, top: C.cAdd([C.term(ONE, ex[0].fs)], C.num(K.neg(ONE))) };
        }
        if (!hit || !C.hasVar(hit.u, v)) return null;
        var ul = numericLimit(hit.u, v, t);
        return ul && ul.kind === 'num' && Math.abs(ul.value) < 1e-9 ? hit : null;
    }
    var knownLimits = {
        name: 'knownLimits',
        test: function (e, v, t) {
            if (e.length !== 1) return false;
            var fr = splitFraction(e);
            return !!(knownPart(fr.N, v, t) || (!isOne(fr.D) && knownPart(fr.D, v, t)));
        },
        apply: function (e, v, t, log, depth) {
            var fr = splitFraction(e), up = knownPart(fr.N, v, t), hit = up || knownPart(fr.D, v, t);
            var u = hit.u, uText = C.show(u);
            var rest = up ? C.cMul(C.num(hit.c), C.cMul(u, C.cPow(fr.D, K.neg(ONE))))
                : C.cMul(fr.N, C.cPow(C.cMul(C.num(hit.c), u), K.neg(ONE)));
            rest = fold(rest);
            // [EN] bez [ ] wokół koloru: nawias kwadratowy znaczy tu „co wychodzi po wstawieniu” (symbol nieoznaczony)
            var bracket = up ? '⟦' + C.paren(hit.top) + '/' + grp(u) + '⟧' : '⟦' + C.paren(u) + '/' + grp(hit.top) + '⟧';
            line(log, 'Korzystamy ze znanej granicy', 'u = ' + uText + ' → 0:  ' + limHead(v, t) + bracket + ' · ' + C.show(rest), hit.label);
            line(log, 'Kolorowy ułamek dąży do 1', limOf(v, t, rest));
            return limitOf(rest, v, t, log, depth);
        }
    };

    // ── Mianownik → 0, licznik → c ≠ 0: granice jednostronne ──────────
    function sideSign(D, v, t, side) { // [EN] znak mianownika tuż obok punktu
        var D0 = Dec(), x = new D0(t.at).add(new D0(10).pow(-30).mul(side));
        var r = valueAt(function (xx) { var env = {}; env[v] = xx; return evalDec(D, env); }, x);
        return r && !r.isZero() ? (r.isNeg() ? -1 : 1) : 0;
    }
    var oneSided = {
        name: 'oneSided',
        test: function (e, v, t) {
            if (!isFiniteTarget(t) || e.length !== 1) return false;
            var fr = splitFraction(e);
            if (isOne(fr.D)) return false;
            var d = numericLimit(fr.D, v, t), n = numericLimit(fr.N, v, t);
            return !!d && d.kind === 'num' && Math.abs(d.value) < 1e-9 && !!n && n.kind === 'num' && Math.abs(n.value) > 1e-6;
        },
        apply: function (e, v, t, log, depth) {
            var fr = splitFraction(e);
            var N = limitOf(fr.N, v, { at: t.at, src: t.src, side: t.side }, null, depth);
            if (N.kind !== 'num') throw new NotSupported();
            var nv = numVal(N.e), cText = C.show(rationalize(fold(N.e)));
            function oneSide(side) {
                var sg = sideSign(fr.D, v, t, side);
                if (!sg) throw new NotSupported();
                var tt = { at: t.at, src: t.src, side: side };
                line(log, 'Granica jednostronna ' + targetText(tt), 'licznik → ' + cText + ', mianownik → 0' + (sg > 0 ? '⁺' : '⁻') + ',  ' + limOf(v, tt, e) + ' = ' + ((nv > 0) === (sg > 0) ? '+∞' : '−∞'));
                return (nv > 0) === (sg > 0) ? 1 : -1;
            }
            if (t.side) return { kind: 'inf', sign: oneSide(t.side) };
            var L = oneSide(-1), Rr = oneSide(1);
            if (L === Rr) return { kind: 'inf', sign: L };
            line(log, 'Granice jednostronne są różne', 'lim(' + v + '→' + targetText({ at: t.at, src: t.src, side: -1 }) + ') = ' + (L > 0 ? '+∞' : '−∞') +
                ',  lim(' + v + '→' + targetText({ at: t.at, src: t.src, side: 1 }) + ') = ' + (Rr > 0 ? '+∞' : '−∞'));
            return { kind: 'dne', why: 'sides' };
        }
    };

    // ── Reguła de l'Hospitala dla [0/0] i [∞/∞] (najwyżej 3 razy) ──────
    var _lhCount = 0;
    var lHospital = {
        name: 'lHospital',
        test: function (e, v, t) {
            if (e.length !== 1 || _lhCount >= 3) return false;
            var ind = indeterminate(e, v, t);
            return ind === '0/0' || ind === '∞/∞';
        },
        apply: function (e, v, t, log, depth) {
            var fr = splitFraction(e);
            var dN = fold(C.dExpr(fr.N, v, null)), dD = fold(C.dExpr(fr.D, v, null));
            if (!dD.length) throw new NotSupported();
            var out = fold(C.cMul(dN, C.cPow(dD, K.neg(ONE))));
            if (C.show(out).length > 4 * C.show(e).length + 40) throw new NotSupported(); // [EN] wyrażenie się komplikuje
            _lhCount++;
            try {
                // [EN] najpierw same pochodne (2x − 6)/(6x − 10), potem uproszczenie — bez skoku
                var raw = '(' + C.show(dN) + ')/(' + C.show(dD) + ')', simple = limOf(v, t, out).slice(limHead(v, t).length);
                line(log, "Reguła de l'Hospitala", limHead(v, t) + '⟦(' + C.showInner(fr.N) + ')′/(' + C.showInner(fr.D) + ')′⟧ = ' + limHead(v, t) + raw
                    + (raw.replace(/[()\s]/g, '') === simple.replace(/[()\s]/g, '') ? '' : ' = ' + limOf(v, t, out)), 'lhospital');
                return limitOf(out, v, t, log, depth);
            } finally { _lhCount--; }
        }
    };
    RULES.push(commonDenominator, logCombine, factorCancel, knownLimits, conjugate, splitPairs, sameExponent, eLimit, dominantPower, oneSided, lHospital);

    // ── Symbol nieoznaczony (do pierwszego kroku, jak na zajęciach) ──────
    function kindOf(x) {
        if (!x) return null;
        if (x.kind === 'inf') return '∞';
        // [EN] próg z błędem próbek: wolno zbieżne (√a − √b przy x → −∞) też liczą się jako 0 / 1
        if (x.kind === 'num') { var tol = Math.max(1e-9, 10 * (x.err || 0)); return Math.abs(x.value) < tol ? '0' : (Math.abs(x.value - 1) < tol ? '1' : 'c'); }
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
            if (isOne(fr.D)) { // [EN] iloczyn: jeden czynnik rośnie bez końca, drugi maleje do 0 → [0 · ∞]
                var kinds = only.fs.map(function (f) { return kindOf(numericLimit([C.term(ONE, [f])], v, t)); });
                return kinds.indexOf('∞') >= 0 && kinds.indexOf('0') >= 0 ? '0 · ∞' : null;
            }
            var n = kindOf(numericLimit(fr.N, v, t)), d = kindOf(numericLimit(fr.D, v, t));
            if (n === '0' && d === '0') return '0/0';
            if (n === '∞' && d === '∞') return '∞/∞';
            return null;
        } catch (err) { return null; }
    }

    var MAX_DEPTH = 8;
    var WORK_BUDGET = 1500; // [EN] operacji w wysokiej precyzji na zadanie; zestaw 58 zużywa najwyżej ~670, (x − sin x)/x³ ~1100
    // [EN] sposoby: _prefer = reguła próbowana najpierw w pierwszym ruchu; _first = reguła, która zrobiła pierwszy ruch
    var _prefer = null, _first = null;
    function limitOf(e, v, t, log, depth) {
        if ((depth || 0) > MAX_DEPTH) throw new NotSupported();
        var top = !depth, order = top && _prefer ? [_prefer].concat(RULES.filter(function (r) { return r !== _prefer; })) : RULES;
        for (var i = 0; i < order.length; i++) {
            var rule = order[i];
            if (!rule.test(e, v, t)) continue;
            var mark = log ? log.length : 0;
            try { var got = rule.apply(e, v, t, log, (depth || 0) + 1); if (top) _first = rule.name; return got; }
            catch (err) {
                if (!(err instanceof NotSupported) && !(err instanceof RangeError)) throw err;
                if (log) log.length = mark; // [EN] nieudana próba nie zostawia kroków
            }
        }
        throw new NotSupported();
    }
    // ── „Wstaw od razu” (plan kroków 3b): granica określona przy n → ±∞ — każde c/(coś → ∞) to 0, liczymy wprost.
    // Bez tego silnik przerabiał (1 − 1/n)² przez wspólny mianownik i wracał do punktu wyjścia.
    function astHasVar(n, v) { return n.k === 'var' ? n.v === v : !!((n.a && astHasVar(n.a, v)) || (n.b && astHasVar(n.b, v))); }
    function plugInfinity(n, d, hits) {
        if (n.k === 'div' && !astHasVar(n.a, d.v) && astHasVar(n.b, d.v)) {
            var lb = numericLimit(C.fromAst(n.b), d.v, d.target);
            if (lb && lb.kind === 'inf') {
                var h = astText(n) + ' → 0';
                if (hits.indexOf(h) < 0) hits.push(h);
                return { k: 'num', v: K.ZERO, paren: n.paren };
            }
        }
        if (!n.a) return n;
        var out = Object.assign({}, n);
        out.a = plugInfinity(n.a, d, hits);
        if (n.b) out.b = plugInfinity(n.b, d, hits);
        return out;
    }
    function plugText(text, v, t) { // [EN] tekst kroku z c/vᵖ → 0; null, gdy nic nie zniknęło albo zmienna została
        try {
            var hits = [], sub = plugInfinity(K.parse(text), { v: v, target: t }, hits);
            return hits.length && !astHasVar(sub, v) ? astText(sub) : null;
        } catch (x) { return null; }
    }
    function quickPlug(ast, d, ans) { // [EN] krok albo null, gdy podstawienie nie daje od razu wyniku
        if (ans.kind !== 'num') return null;
        var hits = [], sub = plugInfinity(ast, d, hits);
        if (!hits.length || astHasVar(sub, d.v)) return null;
        var got = numVal(C.fromAst(sub)), want = numVal(ans.e);
        if (!(Math.abs(got - want) <= 1e-9 * (1 + Math.abs(want)))) return null;
        return { label: 'Podstawiamy ' + d.v + ' → ' + targetText(d.target), math: hits.join(', ') + ':  ' + astText(sub) + ' = ' + formatAnswer(ans).text };
    }
    // [EN] krok 1 pokazuje zapis użytkownika, a reguły liczą postać silnika (znak wyciągnięty, liczba spod pierwiastka).
    // Gdy różnią się czymś więcej niż kolejnością wyrazów — krok pośredni, żeby kolejne kroki pasowały do poprzednich.
    function sameButOrder(a, b) {
        // [EN] bez spacji, „+”, „·”; n^(3/2) = n√n — to ten sam zapis, tylko inaczej ułożony
        var norm = function (x) { return x.replace(/([a-z])\^\(3\/2\)/g, '$1√$1').replace(/[\s+·]/g, '').split('').sort().join(''); };
        return norm(a) === norm(b);
    }
    function rewriteStep(ast, d, e) {
        var head = limHead(d.v, d.target), mine;
        try { mine = astText(ast, 2); } catch (x) { return null; }
        var eng = limOf(d.v, d.target, e).slice(head.length);
        if (mine === eng || sameButOrder(mine, eng)) return null;
        var bare = function (x) { return /^\(.*\)$/.test(x) && !/\)\s*[^\s)]/.test(x.slice(1, -1).replace(/\([^()]*\)/g, '')) ? x.slice(1, -1) : x; };
        return { label: 'Zapisujemy inaczej', math: bare(mine) + ' = ' + bare(eng) };
    }
    function run(d) {
        C.setVar(d.v); // [EN] przed budowaniem: kolejność wyrazów liczy się od potęgi TEJ zmiennej
        _first = null;
        var ast = K.parse(d.src), e = C.fromAst(ast);
        var ans, ind, steps;
        _work = 0; _budget = WORK_BUDGET;
        try {
            ind = indeterminate(e, d.v, d.target);
            if (!ind && ast.k === 'mul') { // [EN] iloczyn wpisany przez użytkownika — silnik mógł go już rozpisać na sumę
                var ka = kindOf(numericLimitAst(ast.a, d.v, d.target)), kb = kindOf(numericLimitAst(ast.b, d.v, d.target));
                if ((ka === '∞' && kb === '0') || (ka === '0' && kb === '∞')) ind = '0 · ∞';
            }
            // [EN] symbol nieoznaczony do stuknięcia: dymek „co to znaczy” (słownik: nieoznaczone)
            steps = [ind ? { label: 'Granica', math: userLim(d, e) + '  [⟦' + ind + '⟧]', formula: { id: 'nieoznaczone' } } : { label: 'Granica', math: userLim(d, e) }];
            var quick = null;
            if (!ind && !isFiniteTarget(d.target)) {
                ans = limitOf(e, d.v, d.target, null, 0);
                quick = quickPlug(ast, d, ans);
            }
            if (quick) steps.push(quick);
            else {
                _work = 0; // [EN] pierwszy przebieg (sprawdzenie „wstaw od razu”) nie zjada budżetu drugiemu
                var bridge = rewriteStep(ast, d, e);
                if (bridge) steps.push(bridge);
                ans = limitOf(e, d.v, d.target, steps, 0);
            }
        }
        finally { _budget = Infinity; }
        var truth = numericLimitAst(ast, d.v, d.target);
        if (!agrees(ans, truth)) throw new NotSupported(); // [EN] nigdy błędnego wyniku — liczone z zapisu użytkownika
        var out = formatAnswer(ans), first = _first;
        steps.push({ label: 'Wynik', math: userLim(d, e) + ' = ' + out.text });
        var res = K.done('Granica', out.text, out.value, steps);
        // [EN] drugi sposób: 0/0 przy x → liczba — de l'Hospital obok rozkładu/sprzężenia/znanej granicy (Mateusz, zadania 7–9)
        if (ind === '0/0' && isFiniteTarget(d.target) && METHOD[first]) {
            var alt = steps.slice(0, steps.length - 1).filter(function (s, i) { return i === 0 || s.label === 'Zapisujemy inaczej'; });
            _prefer = lHospital; _work = 0; _budget = WORK_BUDGET;
            try {
                var ansL = limitOf(e, d.v, d.target, alt, 0);
                if (_first === 'lHospital' && agrees(ansL, truth) && formatAnswer(ansL).text === out.text) {
                    alt.push({ label: 'Wynik', math: userLim(d, e) + ' = ' + out.text, final: true });
                    // [EN] przy ∛ i ∜ to nie sprzężenie, tylko różnica sześcianów / czwartych potęg (jak w dymku)
                    var cube = steps.some(function (s) { return s.formula && s.formula.id === 'roznica-szescianow'; });
                    var fourth = steps.some(function (s) { return s.formula && s.formula.id === 'roznica-czwartych'; });
                    var name = cube ? 'Różnica sześcianów' : fourth ? 'Różnica czwartych potęg' : METHOD[first];
                    res.explain.methods = [{ label: name, steps: steps }, { label: "de l'Hospital", steps: alt }];
                }
            } catch (err) { if (!(err instanceof NotSupported) && !(err instanceof RangeError)) throw err; }
            finally { _prefer = null; _budget = Infinity; }
        }
        // [EN] etap 1 sposobów: 1^∞ — wzór skrócony obok dorabiania jedynki; ∞/∞ — de l'Hospital obok najwyższej potęgi
        var other = !res.explain.methods && (ind === '1^∞' && first === 'eLimit' ? eShortcut : ind === '∞/∞' && first === 'dominantPower' && d.v !== 'n' ? lHospital : null);
        if (other) {
            var alt2 = steps.slice(0, steps.length - 1).filter(function (s, i) { return i === 0 || s.label === 'Zapisujemy inaczej'; });
            _prefer = other; _work = 0; _budget = WORK_BUDGET;
            try {
                var ans2 = limitOf(e, d.v, d.target, alt2, 0);
                if (_first === other.name && agrees(ans2, truth) && formatAnswer(ans2).text === out.text) {
                    alt2.push({ label: 'Wynik', math: userLim(d, e) + ' = ' + out.text, final: true });
                    res.explain.methods = [{ label: METHOD[first], steps: steps }, { label: METHOD[other.name], steps: alt2 }];
                }
            } catch (err) { if (!(err instanceof NotSupported) && !(err instanceof RangeError)) throw err; }
            finally { _prefer = null; _budget = Infinity; }
        }
        return res;
    }
    // [EN] nazwy sposobów do przełącznika w krokach (pierwszy ruch silnika)
    var METHOD = { factorCancel: 'Rozkład na czynniki', conjugate: 'Sprzężenie', knownLimits: 'Znana granica', commonDenominator: 'Wspólny mianownik',
        eLimit: 'Dorabianie jedynki', eShortcut: 'Wzór skrócony', dominantPower: 'Najwyższa potęga', lHospital: "de l'Hospital" };

    var API = {
        detect: detect, run: run, numericLimit: numericLimit, numericLimitAst: numericLimitAst, _evalDec: evalDec,
        _test: {
            formatAnswer: formatAnswer,
            lastWork: function () { return _work; },
            pushRule: function (r) { RULES.unshift(r); },
            popRule: function () { RULES.shift(); }
        },
        _internal: { RULES: RULES, limitOf: limitOf, line: line, limHead: limHead, targetText: targetText, substitute: substitute, pointExpr: pointExpr, agrees: agrees }
    };
    STEPS.registerLimits(API);
    if (typeof window !== 'undefined') window.MATM0_LIMITS = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
