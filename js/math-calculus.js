// @ts-check
/* ============================================================
   [EN] MATM0_CALC — pochodne i całki krok po kroku (bez DOM, działa też w Node).
   Wyrażenie = lista składników {c: ułamek, fs: [{b: atom, e: wykładnik}]}.
   Atomy: var, const, num (√2), fn, sum, exp (a^u). Parser i ułamki z math-steps.js.
   Każdy wynik jest sprawdzany numerycznie, niezależnie od użytych reguł: wynik,
   który się nie zgadza, nie trafia na ekran.
   ============================================================ */
(function () {
    'use strict';

    var STEPS = (typeof window !== 'undefined' && window.MATM0_STEPS) || require('./math-steps.js');
    var K = STEPS._core;
    var R = K.R, ZERO = K.ZERO, ONE = K.ONE, add = K.add, neg = K.neg, sub = K.sub, mul = K.mul,
        div = K.div, isZero = K.isZero, isInt = K.isInt, eq = K.eq, toNum = K.toNum, powR = K.powR,
        gcd = K.gcd, sup = K.sup, fmt = K.fmt, NotSupported = K.NotSupported;
    var MAX_DEPTH = 7, MAX_EXPAND = 8;
    var FN_SHOW = { tan: 'tg', cot: 'ctg', atan: 'arctg', asin: 'arcsin', acos: 'arccos' };
    var _var = 'x'; // [EN] zmienna bieżącego zadania: układa wyrazy malejąco po jej potędze

    // ── Budowanie wyrażeń ────────────────────────────────────
    function term(c, fs) { return { c: c, fs: fs }; }
    // [EN] liczba z wykładnikiem całkowitym (√3 · √3 = 3¹) wraca do współczynnika; inaczej show() pisze ją jako √3
    function absorbNums(t) {
        if (!t.fs.some(function (f) { return f.b.k === 'num' && isInt(f.e); })) return t;
        var c = t.c, fs = [];
        t.fs.forEach(function (f) {
            if (f.b.k !== 'num' || !isInt(f.e)) { fs.push(f); return; }
            var p = powR(f.b.v, Number(f.e.n < 0n ? -f.e.n : f.e.n));
            c = f.e.n < 0n ? div(c, p) : mul(c, p);
        });
        return term(c, fs);
    }
    function num(r) { return isZero(r) ? [] : [term(r, [])]; }
    function atomExpr(b, e) { return [term(ONE, [{ b: b, e: e || ONE }])]; }
    function variable(v) { return atomExpr({ k: 'var', v: v }); }

    function keyOfFactors(fs) {
        return fs.map(function (f) { return showAtom(f.b) + '^' + f.e.n + '/' + f.e.d; }).sort().join('*');
    }
    var RANK = { num: 0, var: 1, const: 2, exp: 3, fn: 4, sum: 5 };
    function normFactors(fs) {
        var map = {}, order = [];
        fs.forEach(function (f) {
            var k = showAtom(f.b);
            if (map[k]) map[k].e = add(map[k].e, f.e);
            else { map[k] = { b: f.b, e: f.e }; order.push(k); }
        });
        return order.map(function (k) { return map[k]; })
            .filter(function (f) { return !isZero(f.e); })
            .sort(function (x, y) {
                return RANK[x.b.k] - RANK[y.b.k] || (showAtom(x.b) < showAtom(y.b) ? -1 : 1);
            });
    }
    function cAdd(a, b) {
        var map = {}, order = [];
        a.concat(b).forEach(function (t) {
            var k = keyOfFactors(t.fs);
            if (map[k]) map[k] = term(add(map[k].c, t.c), map[k].fs);
            else { map[k] = t; order.push(k); }
        });
        return order.map(function (k) { return map[k]; }).filter(function (t) { return !isZero(t.c); });
    }
    function cNeg(a) { return a.map(function (t) { return term(neg(t.c), t.fs); }); }
    function cSub(a, b) { return cAdd(a, cNeg(b)); }
    function mulTerm(x, y) { return absorbNums(term(mul(x.c, y.c), normFactors(x.fs.concat(y.fs)))); }
    function cMul(a, b) {
        if (!a.length || !b.length) return [];
        if (a.length === 1 && !a[0].fs.length) return b.map(function (t) { return term(mul(a[0].c, t.c), t.fs); });
        if (b.length === 1 && !b[0].fs.length) return a.map(function (t) { return term(mul(b[0].c, t.c), t.fs); });
        return [mulTerm(asTerm(a), asTerm(b))];
    }
    function asTerm(e, keepSign) { // [EN] suma jako czynnik; wspólna liczba wychodzi przed nawias
        if (e.length === 1) return e[0];
        var list = sortedTerms(e);
        var den = list.reduce(function (l, t) { return (l * t.c.d) / gcd(l, t.c.d); }, 1n);
        var g = list.reduce(function (acc, t) { return gcd(acc, mul(t.c, R(den)).n); }, 0n);
        var c = R(g, den);
        if (list[0].c.n < 0n && !keepSign) c = neg(c);
        return term(c, [{ b: { k: 'sum', s: list.map(function (t) { return term(div(t.c, c), t.fs); }) }, e: ONE }]);
    }
    function cPow(a, r) {
        if (!a.length) {
            if (r.n <= 0n) throw new NotSupported();
            return [];
        }
        var t = asTerm(a, !isInt(r)), c = ONE, extra = []; // [EN] √(1 − x²): minusa nie wolno wyciągać
        if (isInt(r)) c = powR(t.c, Number(r.n));
        else if (!eq(t.c, ONE)) {
            if (t.c.n < 0n) throw new NotSupported();
            var root = r.d === 2n ? K.sqrtExact(t.c) : null;
            if (root) c = powR(root, Number(r.n));
            else extra.push({ b: { k: 'num', v: t.c }, e: r });
        }
        return [absorbNums(term(c, normFactors(extra.concat(t.fs.map(function (f) {
            var ne = mul(f.e, r);
            // [EN] (x²)^(1/2) = |x|, nie x: parzysta potęga pod parzystym pierwiastkiem traci znak — nie upraszczamy
            if (f.b.k !== 'num' && f.b.k !== 'const' && f.e.n % 2n === 0n && ne.n % 2n !== 0n) throw new NotSupported();
            return { b: f.b, e: ne };
        })))))];
    }
    function isNumber(e) { return !e.length || (e.length === 1 && !e[0].fs.length); }
    function numberOf(e) { return e.length ? e[0].c : ZERO; }
    function cFn(f, a, base) {
        if (f === 'logb') { // [EN] log_b(u); log_b(1) = 0, log_b(b) = 1
            if (isNumber(a) && eq(numberOf(a), ONE)) return [];
            if (isNumber(a) && eq(numberOf(a), base)) return num(ONE);
            return atomExpr({ k: 'fn', f: 'logb', base: base, a: a });
        }
        if (!a.length) {
            if (f === 'sin' || f === 'tan' || f === 'atan' || f === 'asin') return [];
            if (f === 'cos') return num(ONE);
        }
        if ((f === 'ln' || f === 'lnabs') && isNumber(a) && eq(numberOf(a), ONE)) return [];
        if (f === 'ln' && a.length === 1 && a[0].fs.length === 1 && a[0].fs[0].b.k === 'const' && a[0].fs[0].b.v === 'e' && eq(a[0].fs[0].e, ONE) && eq(a[0].c, ONE)) return num(ONE);
        return atomExpr({ k: 'fn', f: f, a: a });
    }
    function cExp(base, x) {
        if (isNumber(x)) return cPow(base, numberOf(x));
        return atomExpr({ k: 'exp', b: base, x: x });
    }
    var E_CONST = atomExpr({ k: 'const', v: 'e' });
    function fromAst(n) {
        switch (n.k) {
            case 'num': return num(n.v);
            case 'var': return variable(n.v);
            case 'const': return atomExpr({ k: 'const', v: n.v });
            case 'add': return cAdd(fromAst(n.a), fromAst(n.b));
            case 'sub': return cSub(fromAst(n.a), fromAst(n.b));
            case 'neg': return cNeg(fromAst(n.a));
            case 'mul': return cMul(fromAst(n.a), fromAst(n.b));
            case 'div': return cMul(fromAst(n.a), cPow(fromAst(n.b), neg(ONE)));
            case 'pow': return cExp(fromAst(n.a), fromAst(n.b));
            case 'sqrt': return cPow(fromAst(n.a), R(1, 2));
            case 'fn':
                if (n.f === 'exp') return cExp(E_CONST, fromAst(n.a));
                return cFn(n.f, fromAst(n.a), n.base != null ? R(BigInt(n.base)) : undefined);
        }
        throw new NotSupported();
    }

    function mapExpr(e, fn) { // [EN] podstawienie: fn(atom) daje wyrażenie albo null (zejdź głębiej)
        if (fn.whole && show(e) === fn.key) return fn.whole; // [EN] całe wnętrze, np. 2x w sin(2x)
        return e.reduce(function (acc, t) {
            var cur = num(t.c);
            t.fs.forEach(function (f) { cur = cMul(cur, cPow(mapAtom(f.b, fn), f.e)); });
            return cAdd(acc, cur);
        }, []);
    }
    function mapAtom(a, fn) {
        var hit = fn(a);
        if (hit) return hit;
        if (a.k === 'fn') return cFn(a.f, mapExpr(a.a, fn), a.base);
        if (a.k === 'sum') return mapExpr(a.s, fn);
        if (a.k === 'exp') return cExp(mapExpr(a.b, fn), mapExpr(a.x, fn));
        return atomExpr(a);
    }
    function hasVar(e, v) {
        return e.some(function (t) { return t.fs.some(function (f) { return atomHas(f.b, v); }); });
    }
    function atomHas(a, v) {
        if (a.k === 'var') return a.v === v;
        if (a.k === 'fn') return hasVar(a.a, v);
        if (a.k === 'sum') return hasVar(a.s, v);
        if (a.k === 'exp') return hasVar(a.b, v) || hasVar(a.x, v);
        return false;
    }
    function varsIn(e, out) {
        e.forEach(function (t) {
            t.fs.forEach(function (f) {
                var a = f.b;
                if (a.k === 'var') out[a.v] = 1;
                if (a.k === 'fn') varsIn(a.a, out);
                if (a.k === 'sum') varsIn(a.s, out);
                if (a.k === 'exp') { varsIn(a.b, out); varsIn(a.x, out); }
            });
        });
        return out;
    }
    function expandExpr(e) { // [EN] wymnaża nawiasy o dodatnich całkowitych potęgach
        return e.reduce(function (acc, t) {
            var rest = [], cur = num(t.c);
            t.fs.forEach(function (f) {
                if (f.b.k === 'sum' && isInt(f.e) && f.e.n > 0n && f.e.n <= BigInt(MAX_EXPAND)) {
                    for (var i = 0; i < Number(f.e.n); i++) cur = distribute(cur, expandExpr(f.b.s));
                } else rest.push(f);
            });
            return cAdd(acc, distribute(cur, [term(ONE, rest)]));
        }, []);
    }
    function distribute(a, b) {
        var out = [];
        a.forEach(function (x) { b.forEach(function (y) { out = cAdd(out, [mulTerm(x, y)]); }); });
        return out;
    }
    function polyCoefs(e, v) { // [EN] wielomian o współczynnikach wymiernych albo null
        var list = expandExpr(e), out = [];
        for (var i = 0; i < list.length; i++) {
            var t = list[i], d = 0;
            if (t.fs.length > 1) return null;
            if (t.fs.length) {
                var f = t.fs[0];
                if (f.b.k !== 'var' || f.b.v !== v || !isInt(f.e) || f.e.n <= 0n || f.e.n > 40n) return null;
                d = Number(f.e.n);
            }
            while (out.length <= d) out.push(ZERO);
            out[d] = add(out[d], t.c);
        }
        return out;
    }
    function polyExpr(c, v) {
        var out = [];
        c.forEach(function (x, i) {
            if (isZero(x)) return;
            out = cAdd(out, i ? cMul(num(x), cPow(variable(v), R(i))) : num(x));
        });
        return out;
    }

    // ── Wyświetlanie ─────────────────────────────────────────
    function degreeIn(t) {
        var d = 0;
        t.fs.forEach(function (f) { if (f.b.k === 'var' && f.b.v === _var) d = toNum(f.e); });
        return d;
    }
    function sortedTerms(e) {
        return e.slice().sort(function (a, b) {
            var d = degreeIn(b) - degreeIn(a);
            if (d) return d;
            var ca = a.fs.length ? 1 : 0, cb = b.fs.length ? 1 : 0;
            return cb - ca;
        });
    }
    function supFrac(e) {
        if (isInt(e) && e.n > 0n) return sup(e.n.toString());
        return '^(' + fmt(e) + ')';
    }
    function exponentText(x) {
        var s = show(x);
        return /^(?:[a-z]|\d+)$/.test(s) ? s : '(' + s + ')';
    }
    function showAtom(a) {
        switch (a.k) {
            case 'var': return a.v;
            case 'const': return a.v === 'pi' ? 'π' : 'e';
            case 'num': return fmt(a.v);
            case 'sum': return '(' + show(a.s) + ')';
            case 'exp':
                var base = show(a.b);
                if (!/^[\wπ]+$/.test(base)) base = '(' + base + ')';
                return base + '^' + exponentText(a.x);
            case 'fn':
                if (a.f === 'lnabs') return 'ln|' + showInner(a.a) + '|';
                if (a.f === 'logb') return 'log' + K.sub_(a.base.n.toString()) + '(' + showInner(a.a) + ')';
                return (FN_SHOW[a.f] || a.f) + '(' + showInner(a.a) + ')';
        }
        return '?';
    }
    function showInner(e) { // [EN] ln(x² + 1), nie ln((x² + 1))
        var only = e.length === 1 && e[0].fs.length === 1 && e[0].fs[0].b.k === 'sum' && eq(e[0].fs[0].e, ONE) && eq(e[0].c, ONE);
        return only ? show(e[0].fs[0].b.s) : show(e);
    }
    function showFactor(f) {
        var a = f.b, e = f.e;
        if (eq(e, ONE)) return a.k === 'num' ? '√' + fmt(a.v).replace('^', '') : showAtom(a);
        if (eq(e, R(1, 2)) || eq(e, R(1, 3)) || eq(e, R(1, 4))) {
            var body = showAtom(a), mark = eq(e, R(1, 2)) ? '√' : (eq(e, R(1, 3)) ? '∛' : '∜');
            return mark + (a.k === 'var' || a.k === 'num' || a.k === 'sum' || a.k === 'const' ? body : '(' + body + ')');
        }
        if (a.k === 'fn' && a.f !== 'lnabs' && isInt(e) && e.n > 0n) {
            return (FN_SHOW[a.f] || a.f) + sup(e.n.toString()) + '(' + showInner(a.a) + ')';
        }
        if (a.k === 'exp') return '(' + showAtom(a) + ')' + supFrac(e);
        if (a.k === 'var' && e.d === 2n && e.n > 2n) { // [EN] n^(3/2) → n√n, n^(5/2) → n²√n (nie zapis z klawiatury)
            var whole = (e.n - 1n) / 2n;
            return a.v + (whole > 1n ? sup(whole.toString()) : '') + '√' + a.v;
        }
        return showAtom(a) + supFrac(e);
    }
    function joinFactors(list) {
        var out = '';
        list.forEach(function (f, i) {
            var s = showFactor(f);
            if (i) {
                var prev = list[i - 1].b.k, cur = f.b.k;
                out += (prev === 'var' || prev === 'num' || prev === 'const') && (cur === 'var' || cur === 'const' || cur === 'sum') ? '' : ' · ';
            }
            out += s;
        });
        return out;
    }
    function showTerm(t) { // [EN] bez znaku; znak dokłada show()
        var ups = [], downs = [];
        t.fs.forEach(function (f) {
            if (f.e.n < 0n) downs.push({ b: f.b, e: neg(f.e) }); else ups.push(f);
        });
        var p = t.c.n < 0n ? -t.c.n : t.c.n, q = t.c.d;
        var top = joinFactors(ups);
        if (p !== 1n || !top) top = p.toString() + (top ? (ups[0].b.k === 'fn' || ups[0].b.k === 'exp' ? ' · ' : '') + top : '');
        if (q === 1n && !downs.length) return top;
        var bottom = joinFactors(downs);
        if (q !== 1n) bottom = q.toString() + (bottom ? (downs[0].b.k === 'fn' || downs[0].b.k === 'exp' ? ' · ' : '') + bottom : '');
        // [EN] n√n w mianowniku to dwa czynniki: 2/(n√n), bo 2/n√n czyta się jak (2/n)·√n
        var many = (q !== 1n && downs.length > 0) || downs.length > 1 || /^[a-z][²³⁴⁵⁶⁷⁸⁹]*√/.test(bottom);
        return top + '/' + (many ? '(' + bottom + ')' : bottom);
    }
    function viewOrder(e) { // [EN] kolejność jak na ekranie: bez minusa na początku, gdy jest wyraz dodatni: 15 − 8x, √(n² + n) − n
        var list = sortedTerms(e);
        if (list.length && list[0].c.n < 0n) {
            var pos = list.findIndex(function (t) { return t.c.n > 0n; });
            if (pos > 0) list = [list[pos]].concat(list.slice(0, pos), list.slice(pos + 1));
        }
        return list;
    }
    function show(e) {
        var list = viewOrder(e);
        if (!list.length) return '0';
        return list.map(function (t, i) {
            var negative = t.c.n < 0n;
            if (!i) return (negative ? '−' : '') + showTerm(t);
            return (negative ? ' − ' : ' + ') + showTerm(t);
        }).join('');
    }
    function paren(e) { return e.length > 1 ? '(' + show(e) + ')' : show(e); }

    // ── Wartości liczbowe (tylko do sprawdzania) ─────────────
    function evalExpr(e, env) {
        var sum = 0;
        for (var i = 0; i < e.length; i++) {
            var cur = toNum(e[i].c);
            for (var j = 0; j < e[i].fs.length; j++) {
                var f = e[i].fs[j];
                cur *= Math.pow(evalAtom(f.b, env), toNum(f.e));
            }
            sum += cur;
        }
        return sum;
    }
    function evalAtom(a, env) {
        switch (a.k) {
            case 'var': return env[a.v] != null ? env[a.v] : env['*'];
            case 'const': return a.v === 'pi' ? Math.PI : Math.E;
            case 'num': return toNum(a.v);
            case 'sum': return evalExpr(a.s, env);
            case 'exp': return Math.pow(evalExpr(a.b, env), evalExpr(a.x, env));
            case 'fn':
                var u = evalExpr(a.a, env);
                switch (a.f) {
                    case 'sin': return Math.sin(u);
                    case 'cos': return Math.cos(u);
                    case 'tan': return Math.tan(u);
                    case 'cot': return 1 / Math.tan(u);
                    case 'ln': return Math.log(u);
                    case 'lnabs': return Math.log(Math.abs(u));
                    case 'log': return Math.log10(u);
                    case 'logb': return Math.log(u) / Math.log(toNum(a.base));
                    case 'asin': return Math.asin(u);
                    case 'acos': return Math.acos(u);
                    case 'atan': return Math.atan(u);
                }
        }
        return NaN;
    }
    var SAMPLES = [0.37, 0.73, 1.31, 1.93, 2.41, -0.61, -1.27, 0.19, 0.53, -0.23];
    function sameAsDerivative(F, f, v) { // [EN] F′ = f w punktach próbnych, różnicą centralną
        var valid = 0, h = 1e-5;
        for (var i = 0; i < SAMPLES.length; i++) {
            var env = { '*': 1.37 }, up = { '*': 1.37 }, down = { '*': 1.37 };
            env[v] = SAMPLES[i]; up[v] = SAMPLES[i] + h; down[v] = SAMPLES[i] - h;
            var want = evalExpr(f, env), got = (evalExpr(F, up) - evalExpr(F, down)) / (2 * h);
            if (!isFinite(want) || !isFinite(got) || Math.abs(want) > 1e6) continue;
            valid++;
            if (Math.abs(want - got) > 1e-4 * (1 + Math.abs(want))) return false;
        }
        return valid >= 3;
    }
    function simpson(f, v, a, b) {
        var n = 2000, h = (b - a) / n, env = { '*': 1.37 }, sum = 0;
        for (var i = 0; i <= n; i++) {
            env[v] = a + i * h;
            var y = evalExpr(f, env);
            if (!isFinite(y)) return NaN;
            sum += y * (i === 0 || i === n ? 1 : (i % 2 ? 4 : 2));
        }
        return sum * h / 3;
    }

    // ── Pochodne ─────────────────────────────────────────────
    // [EN] formula = id wzoru ze słownika (js/step-formulas.js); fragment ⟦…⟧ w math jest wyróżniony kolorem i do stuknięcia
    function line(log, label, math, formula, here) { // [EN] here: liczby z zadania przy literach wzoru (dymek)
        if (log) log.push(formula ? { label: label, math: math, formula: here ? { id: formula, here: here } : { id: formula } } : { label: label, math: math });
    }
    function grpT(x) { return x.length > 1 ? '(' + show(x) + ')' : show(x); } // [EN] suma w nawiasie przy mnożeniu
    function grpN(x) { var t = grpT(x); return t[0] === '−' ? '(' + t + ')' : t; } // [EN] 3 · (−2/x³), nie 3 · −2/x³
    function sameText(a, b) { return a.replace(/\s/g, '').split('').sort().join('') === b.replace(/\s/g, '').split('').sort().join(''); }
    function isSimplePower(t, v) {
        var vars = t.fs.filter(function (f) { return atomHas(f.b, v); });
        return !vars.length || (vars.length === 1 && vars[0].b.k === 'var');
    }
    function dExpr(e, v, log) {
        if (!hasVar(e, v)) return [];
        if (e.length === 1) return dTerm(e[0], v, log);
        var list = viewOrder(e); // [EN] ta sama kolejność co w zapisie funkcji (S123)
        if (list.every(function (t) { return isSimplePower(t, v); })) {
            var res = [], rows = [];
            list.forEach(function (t) {
                var r = dTerm(t, v, null);
                res = cAdd(res, r);
                var bare1 = term(ONE, t.fs), inner1 = hasVar([t], v) && !eq(t.c, ONE) && !eq(t.c, neg(ONE)) ? dTerm(bare1, v, null) : null;
                // [EN] (3x)′ = 3 · (x)′ = 3 · 1 = 3: skąd liczba (S40)
                var mid1 = inner1 ? ' = ' + fmt(t.c) + ' · (' + show([bare1]) + ')′ = ' + fmt(t.c) + ' · ' + grpN(inner1) : '';
                rows.push(hasVar([t], v) ? '⟦(' + show([t]) + ')′⟧' + mid1 + ' = ' + show(r) : '(' + show([t]) + ')′ = ' + show(r)); // [EN] stała to nie potęga
            });
            line(log, 'Liczę pochodną każdego wyrazu', rows.join('\n'), 'pochodna-potegi');
            return res;
        }
        line(log, 'Rozbijam na sumę pochodnych', list.map(function (t) { return '(' + show([t]) + ')′'; }).join(' + '));
        return list.reduce(function (acc, t) { return cAdd(acc, dTerm(t, v, log)); }, []);
    }
    function dTerm(t, v, log) {
        var fixed = [], moving = [];
        var U = v === 'u' || v === 'v' ? 'f' : 'u', V = U === 'f' ? 'g' : 'v'; // [EN] części u, v (f to cała funkcja); przy zmiennej u/v — f, g
        t.fs.forEach(function (f) { (atomHas(f.b, v) ? moving : fixed).push(f); });
        if (!moving.length) return [];
        var constant = [term(t.c, fixed)];
        var one = eq(t.c, ONE) && !fixed.length;
        if (moving.length === 1) {
            if (!one) { // [EN] także a · t²: stała zostaje, liczymy pochodną samej potęgi
                line(log, 'Stała zostaje przed pochodną', '(' + show([t]) + ')′ = ' + paren(constant) + ' · (' + show([term(ONE, [moving[0]])]) + ')′');
            }
            var d1 = dFactor(moving[0], v, log), r1 = cMul(constant, d1);
            if (!one && show(d1) !== '1') line(log, 'Mnożę przez stałą', paren(constant) + ' · ' + grpN(d1) + ' = ' + show(r1));
            return r1;
        }
        var ups = moving.filter(function (f) { return f.e.n > 0n; });
        var downs = moving.filter(function (f) { return f.e.n < 0n; });
        var res;
        if (ups.length && downs.length) {
            var top = [term(ONE, ups)];
            var bottom = [term(ONE, downs.map(function (f) { return { b: f.b, e: neg(f.e) }; }))];
            line(log, 'Rozpoznaję iloraz', U + ' = ' + showInner(top) + ',  ' + V + ' = ' + showInner(bottom));
            var dt = dPart(top, v, log, U), db = dPart(bottom, v, log, V);
            res = cMul(expandExpr(cSub(cMul(dt, bottom), cMul(top, db))), cPow(bottom, R(-2)));
            // [EN] wstawienie do wzoru w jego kolejności, potem uproszczenie
            // [EN] licznik wymnożony, ale jeszcze nie zredukowany: (2x² − 2x − x² − 1), potem wynik
            var left = expandExpr(cMul(dt, bottom)), right = sortedTerms(expandExpr(cMul(top, db)));
            var opened = '(' + show(left) + right.map(function (t) { return (t.c.n < 0n ? ' + ' : ' − ') + showTerm(t); }).join('') + ')/' + grpT(bottom) + '²';
            var done = show(res);
            line(log, 'Wstawiam do wzoru', U + '′ = ' + show(dt) + ',  ' + V + '′ = ' + show(db) + '\n(' + U + '′ · ' + V + ' − ' + U + ' · ' + V + '′)/' + V + '² = ⟦(' + grpT(dt) + ' · ' + grpT(bottom) + ' − ' + grpT(top) + ' · ' + grpT(db) + ')/' + grpT(bottom) + '²⟧'
                + (opened !== done ? ' = ' + opened : '') + ' = ' + done, 'pochodna-ilorazu', U + ' = ' + showInner(top) + ', ' + V + ' = ' + showInner(bottom));
            if (!one) line(log, 'Mnożę przez stałą', paren(constant) + ' · ' + grpT(res) + ' = ' + show(cMul(constant, res)));
            return cMul(constant, res);
        } else {
            var head = [term(ONE, [moving[0]])], tail = [term(ONE, moving.slice(1))];
            line(log, 'Rozpoznaję iloczyn', U + ' = ' + showInner(head) + ',  ' + V + ' = ' + showInner(tail));
            var df = dPart(head, v, log, U), dg = dPart(tail, v, log, V);
            res = cAdd(cMul(df, tail), cMul(head, dg));
            var put = grpT(df) + ' · ' + grpN(tail) + ' + ' + grpT(head) + ' · ' + grpN(dg); // [EN] kolejność jak we wzorze; x · (−sin(x)), nie x · −sin(x)
            var out1 = cMul(constant, res);
            // [EN] stała przed iloczynem mnożona osobnym krokiem: −2 · (x · eˣ)′, nie „1 · eˣ + x · eˣ = −2x · eˣ − 2eˣ”
            line(log, 'Wstawiam do wzoru', U + '′ = ' + show(df) + ',  ' + V + '′ = ' + show(dg) + '\n' + U + '′ · ' + V + ' + ' + U + ' · ' + V + '′ = ⟦' + put + '⟧' + (sameText(show(res), put) ? '' : ' = ' + show(res)), 'pochodna-iloczynu', U + ' = ' + showInner(head) + ', ' + V + ' = ' + showInner(tail));
            if (!one) line(log, 'Mnożę przez stałą', paren(constant) + ' · ' + grpT(res) + ' = ' + show(out1));
            return out1;
        }
    }
    function dPart(e, v, log, name) { // [EN] krok części iloczynu/ilorazu zaczyna się od u′ = …, v′ = … (widać, którą liczymy)
        var mine = [], r = dExpr(e, v, mine);
        if (mine.length === 1) {
            var st = mine[0];
            if (st.label === 'Liczę pochodną każdego wyrazu') { // [EN] v′ = (x + 1)′ = (x)′ + (1)′ = 1 + 0 = 1
                var rows = st.math.split('\n').map(function (x) { return x.split(' = '); });
                var sum = function (list) { return list.map(function (x, i) { return !i ? x : x[0] === '−' ? ' − ' + x.slice(1) : ' + ' + x; }).join(''); };
                st.math = name + '′ = (' + showInner(e) + ')′ = ' + rows.map(function (x) { return x[0]; }).join(' + ') + ' = '
                    + sum(rows.map(function (x) { return x[x.length - 1]; })) + ' = ' + show(r);
            } else st.math = name + '′ = ' + st.math;
        }
        if (log) mine.forEach(function (x) { log.push(x); });
        return r;
    }
    function chain(outer, u, v, log, name, inU) {
        var plain = u.length === 1 && u[0].fs.length === 1 && u[0].fs[0].b.k === 'var' && eq(u[0].c, ONE) && eq(u[0].fs[0].e, ONE);
        if (plain) { line(log, 'Korzystam z tablicy pochodnych', '⟦(' + name + ')′⟧ = ' + show(outer), 'tablica-pochodnych'); return outer; }
        // [EN] funkcja zewnętrzna nazwana: u = 3x + 1, (u⁵)′ = 5u⁴ (S30)
        var U = inU ? inU(v === 'u' ? 't' : 'u') : null;
        // [EN] wstawienie u do wzoru, gdy u jest w potędze: 1/(u² + 1) z u = x/2 → 1/((x/2)² + 1) = 1/(x²/4 + 1) = 4/(x² + 4) (S120)
        var putU = '';
        if (U && new RegExp(U[2] + '[²³⁴]').test(U[1])) {
            var inner = showInner(u), withU = U[1].replace(new RegExp(U[2] + '(?![a-z])', 'g'), '(' + inner + ')');
            var fr = /^([a-z])\/(\d+|√\d+)$/.exec(inner), mid = '';
            if (fr) { var c2 = /^√/.test(fr[2]) ? fr[2].slice(1) : String(Number(fr[2]) * Number(fr[2])); mid = U[1].replace(new RegExp(U[2] + '²', 'g'), fr[1] + '²/' + c2); }
            if (withU !== show(outer)) putU = U[1] + ' = ' + withU + (mid && mid !== show(outer) ? ' = ' + mid : '') + ' = ' + show(outer) + '\n';
        }
        line(log, 'Liczę pochodną złożoną', (U ? U[2] + ' = ' + showInner(u) + ',  (' + U[0] + ')′ = ' + U[1] + '\n' + putU : '')
            + '(' + name + ')′ = ⟦' + show(outer) + ' · (' + showInner(u) + ')′⟧', 'pochodna-zlozona', U ? U[2] + ' = ' + showInner(u) : null);
        if (log && U) log[log.length - 1].outer = U[0];
        var mine = [], d = dExpr(u, v, mine);
        if (mine.length === 1 && mine[0].label === 'Liczę pochodną każdego wyrazu') { // [EN] (3x + 1)′ = 3 + 0 = 3 jako ostatni wiersz
            var vals = mine[0].math.split('\n').map(function (x) { var p = x.split(' = '); return p[p.length - 1]; });
            mine[0].math += '\n(' + showInner(u) + ')′ = ' + vals.map(function (x, i) { return !i ? x : x[0] === '−' ? ' − ' + x.slice(1) : ' + ' + x; }).join('') + ' = ' + show(d);
        }
        if (log) mine.forEach(function (x) { log.push(x); });
        return timesInner(outer, d, log);
    }
    function timesInner(outer, inner, log) { // [EN] 5(3x + 1)⁴ · 3 = 15(3x + 1)⁴ — bez skoku do wyniku
        var out = cMul(outer, inner);
        var put = show(outer) + ' · ' + grpN(inner); // [EN] sama zmiana kolejności — bez „= …”
        if (show(inner) !== '1') line(log, 'Mnożę przez pochodną środka', put + (sameText(put, show(out)) ? '' : ' = ' + show(out)));
        return out;
    }
    function dFactor(f, v, log) {
        var a = f.b, e = f.e, res;
        if (a.k === 'var') {
            res = cMul(num(e), cPow(variable(a.v), sub(e, ONE)));
            if (isInt(e) && e.n > 0n) line(log, 'Liczę pochodną potęgi', '⟦(' + showFactor(f) + ')′⟧ = ' + show(res), 'pochodna-potegi');
            else { // [EN] wykładnik ułamkowy lub ujemny: najpierw zapis jako potęga, potem wzór
                var signed = function (x) { return (x.n < 0n ? '−' : '') + fmt(x.n < 0n ? neg(x) : x); };
                var pw = function (x) { return a.v + '^(' + signed(x) + ')'; };
                var asWritten = show([term(ONE, [f])]);
                // [EN] 2/3 · x^(2/3 − 1) = 2/3 · x^(−1/3) = 2/3 · 1/x^(1/3): wykładnik policzony, potem ułamek (S34)
                var e1 = sub(e, ONE), back = e1.n < 0n ? ' = ' + signed(e) + ' · 1/' + (isInt(e1) ? show(cPow(variable(a.v), neg(e1))) : pw(neg(e1))) : '';
                line(log, 'Liczę pochodną potęgi', (asWritten !== pw(e) ? asWritten + ' = ' + pw(e) + '\n' : '') + '⟦(' + pw(e) + ')′⟧ = '
                    + signed(e) + ' · ' + a.v + '^(' + signed(e) + ' − 1) = ' + signed(e) + ' · ' + pw(e1) + back + ' = ' + show(res), 'pochodna-potegi');
            }
            return res;
        }
        if (!eq(e, ONE)) {
            var base = atomExpr(a);
            var outer = cMul(num(e), cPow(base, sub(e, ONE)));
            return chain(outer, base, v, log, showFactor(f), function (L) {
                var uu = variable(L); return [show(cPow(uu, e)), show(cMul(num(e), cPow(uu, sub(e, ONE)))), L];
            });
        }
        if (a.k === 'sum') return dExpr(a.s, v, log);
        if (a.k === 'exp') {
            if (hasVar(a.b, v)) throw new NotSupported();
            var self = atomExpr(a);
            var outerE = isEuler(a.b) ? self : cMul(self, cFn('ln', a.b));
            return chain(outerE, a.x, v, log, show(self), function (L) {
                var sa = Object.assign({}, a, { x: variable(L) }), se = atomExpr(sa);
                return [show(se), show(isEuler(a.b) ? se : cMul(se, cFn('ln', a.b))), L];
            });
        }
        if (a.k === 'fn') return chain(fnOuter(a.f, a.a, a.base), a.a, v, log, showAtom(a), function (L) {
            var uu = variable(L); return [showAtom(Object.assign({}, a, { a: uu })), show(fnOuter(a.f, uu, a.base)), L];
        });
        throw new NotSupported();
    }
    function isEuler(b) {
        return b.length === 1 && b[0].fs.length === 1 && b[0].fs[0].b.k === 'const' && b[0].fs[0].b.v === 'e' && eq(b[0].c, ONE) && eq(b[0].fs[0].e, ONE);
    }
    function fnOuter(f, u, base) {
        var minus1 = neg(ONE);
        switch (f) {
            case 'sin': return cFn('cos', u);
            case 'cos': return cNeg(cFn('sin', u));
            case 'tan': return cPow(cFn('cos', u), R(-2));
            case 'cot': return cNeg(cPow(cFn('sin', u), R(-2)));
            case 'ln': case 'lnabs': return cPow(u, minus1);
            case 'log': return cPow(cMul(u, cFn('ln', num(R(10)))), minus1);
            case 'logb': return cPow(cMul(u, cFn('ln', num(base))), minus1);
            case 'asin': return cPow(cSub(num(ONE), cPow(u, R(2))), R(-1, 2));
            case 'acos': return cNeg(cPow(cSub(num(ONE), cPow(u, R(2))), R(-1, 2)));
            case 'atan': return cPow(cAdd(num(ONE), cPow(u, R(2))), minus1);
        }
        throw new NotSupported();
    }

    // ── Całki ────────────────────────────────────────────────
    function isVarExpr(e, v) {
        return e.length === 1 && eq(e[0].c, ONE) && e[0].fs.length === 1 && e[0].fs[0].b.k === 'var' && e[0].fs[0].b.v === v && eq(e[0].fs[0].e, ONE);
    }
    function integralText(e, v) { return '∫ ' + (e.length > 1 ? '(' + show(e) + ')' : show(e)) + ' d' + v; } // [EN] ∫ (3x² + 2) dx
    function integ(e, v, depth, log) {
        if (depth > MAX_DEPTH) throw new NotSupported();
        if (!hasVar(e, v)) {
            var flat = cMul(e, variable(v));
            line(log, 'Całkuję stałą', integralText(e, v) + ' = ' + show(flat));
            return flat;
        }
        if (e.length > 1) {
            var list = sortedTerms(e);
            line(log, 'Całka sumy to suma całek', list.map(function (t) { return integralText([t], v); }).join('\n+ '));
            return list.reduce(function (acc, t) { return cAdd(acc, integ([t], v, depth, log)); }, []);
        }
        var t = e[0], fixed = [], moving = [];
        t.fs.forEach(function (f) { (atomHas(f.b, v) ? moving : fixed).push(f); });
        var rest = [term(ONE, moving)];
        if (eq(t.c, ONE) && !fixed.length) return integCore(rest, v, depth, log);
        var constant = [term(t.c, fixed)];
        line(log, 'Stałą wyłączam przed całkę', integralText(e, v) + ' = ' + paren(constant) + ' · ' + integralText(rest, v));
        var inner = integCore(rest, v, depth, log), outC = cMul(constant, inner);
        // [EN] wyłączona stała wraca na końcu — inaczej 2 · ∫ … „znika” między krokami
        line(log, 'Mnożę przez wyłączoną stałą', paren(constant) + ' · ' + grpN(inner) + ' = ' + show(outC));
        return outC;
    }
    function attempt(log, fn) { // [EN] nieudana próba nie zostawia kroków
        var buffer = [], res = null;
        try { res = fn(buffer); }
        catch (e) { if (!(e instanceof NotSupported)) throw e; res = null; }
        if (res && log) buffer.forEach(function (s) { log.push(s); });
        return res;
    }
    function integCore(e, v, depth, log) {
        return attempt(log, function (b) { return table(e, v, b); })
            || attempt(log, function (b) { return substitution(e, v, depth, b); })
            || attempt(log, function (b) { return rational(e, v, depth, b); })
            || attempt(log, function (b) { return byParts(e, v, depth, b); })
            || attempt(log, function (b) { return expanded(e, v, depth, b); })
            || failNotSupported();
    }
    function failNotSupported() { throw new NotSupported(); }

    function table(e, v, log) {
        var t = e[0];
        if (t.fs.length !== 1) return null;
        // [EN] etykieta krótka, wzór w dymku (id ze słownika; tablica-calek, gdy brak osobnego)
        var f = t.fs[0], a = f.b, x = variable(v), res, label = 'Korzystam z tablicy całek', fid = 'tablica-calek';
        var two = R(2), minus1 = neg(ONE);
        if (a.k === 'var') {
            if (eq(f.e, minus1)) res = cFn('lnabs', x);
            else {
                var n1 = add(f.e, ONE);
                res = cMul(num(div(ONE, n1)), cPow(x, n1));
                label = 'Całkuję potęgę'; fid = 'calka-potegi';
            }
        } else if (a.k === 'exp' && isVarExpr(a.x, v) && !hasVar(a.b, v) && eq(f.e, ONE)) {
            res = isEuler(a.b) ? atomExpr(a) : cMul(atomExpr(a), cPow(cFn('ln', a.b), minus1));

        } else if (a.k === 'fn' && isVarExpr(a.a, v)) {
            var one = eq(f.e, ONE), two2 = eq(f.e, two), minus2 = eq(f.e, R(-2));
            if (a.f === 'sin' && one) res = cNeg(cFn('cos', x));
            else if (a.f === 'cos' && one) res = cFn('sin', x);
            else if (a.f === 'tan' && one) res = cNeg(cFn('lnabs', cFn('cos', x)));
            else if (a.f === 'cot' && one) res = cFn('lnabs', cFn('sin', x));
            else if (a.f === 'cos' && minus2) res = cFn('tan', x);
            else if (a.f === 'sin' && minus2) res = cNeg(cFn('cot', x));
            else if ((a.f === 'sin' || a.f === 'cos') && two2) {
                var half = cMul(num(R(1, 2)), x);
                var wave = cMul(num(R(1, 4)), cFn('sin', cMul(num(two), x)));
                res = a.f === 'sin' ? cSub(half, wave) : cAdd(half, wave);
                label = 'Korzystam z tożsamości'; fid = a.f === 'sin' ? 'sin-kwadrat' : 'cos-kwadrat';
            } else if (a.f === 'tan' && two2) {
                res = cSub(cFn('tan', x), x);
                label = 'Korzystam z tożsamości'; fid = 'tg-kwadrat';
            }
        } else if (a.k === 'sum' && eq(f.e, R(1, 2))) { // [EN] √(k − x²)
            var cc = polyCoefs(a.s, v);
            if (cc && cc.length === 3 && isZero(cc[1]) && eq(cc[2], neg(ONE)) && cc[0].n > 0n) {
                var scale = cPow(num(cc[0]), R(1, 2));
                res = cAdd(cMul(cMul(num(R(1, 2)), x), cPow(a.s, R(1, 2))),
                    cMul(num(div(cc[0], R(2))), cFn('asin', cMul(x, cPow(scale, neg(ONE))))));

            }
        } else if (a.k === 'sum' && eq(f.e, R(-1, 2))) {
            var c = polyCoefs(a.s, v);
            if (c && c.length === 3 && isZero(c[1])) {
                if (eq(c[0], ONE) && eq(c[2], neg(ONE))) res = cFn('asin', x);
                else if (eq(c[2], ONE)) res = cFn('lnabs', cAdd(x, cPow(a.s, R(1, 2))));
            }
        }
        if (!res) return null;
        // [EN] tożsamość widać wprost (wyróżniona lewa strona → dymek), potem całka
        var IDENT = { 'sin-kwadrat': 'sin²(#) = (1 − cos(2#))/2', 'cos-kwadrat': 'cos²(#) = (1 + cos(2#))/2', 'tg-kwadrat': 'tg²(#) = 1/cos²(#) − 1' };
        if (IDENT[fid]) {
            var id = IDENT[fid].replace(/#/g, v), eqAt = id.indexOf(' = ');
            // [EN] kolor na tym, co wstawiamy (prawa strona tożsamości)
            line(log, label, id.slice(0, eqAt + 3) + '⟦' + id.slice(eqAt + 3) + '⟧', fid);
            // [EN] potem każda część osobno (raport E, C5): skąd /4 przy sin(2x)
            // [EN] rozbicie ułamka i ∫ cos(2x) dx = sin(2x)/2 widoczne (S47): skąd /4 i skąd minus
            var COS2 = '∫ cos(2#) d# = sin(2#)/2\n∫ cos(2#)/2 d# = 1/2 · sin(2#)/2 = sin(2#)/4';
            var PARTS = { 'sin-kwadrat': '∫ (1 − cos(2#))/2 d# = ∫ 1/2 d# − ∫ cos(2#)/2 d#\n∫ 1/2 d# = #/2\n' + COS2,
                'cos-kwadrat': '∫ (1 + cos(2#))/2 d# = ∫ 1/2 d# + ∫ cos(2#)/2 d#\n∫ 1/2 d# = #/2\n' + COS2,
                'tg-kwadrat': '∫ 1/cos²(#) d# = tg(#)\n∫ 1 d# = #' };
            line(log, 'Całkuję każdą część', PARTS[fid].replace(/#/g, v) + '\n' + integralText(e, v) + ' = ' + show(res));
        } else if (fid === 'calka-potegi' && !(isInt(f.e) && f.e.n > 0n)) { // [EN] √x = x^(1/2), 1/x² = x^(−2): najpierw potęga, potem wzór
            var signed = function (r) { return (r.n < 0n ? '−' : '') + fmt(r.n < 0n ? neg(r) : r); };
            var pw = function (r) { return v + '^(' + signed(r) + ')'; }, n1t = signed(add(f.e, ONE));
            var asWritten = show(e);
            // [EN] x^(1/2 + 1)/(1/2 + 1) = x^(3/2)/(3/2) = 2/3 · x^(3/2): wykładnik i dzielenie policzone osobno (S34)
            var n1 = add(f.e, ONE), plus = v + '^(' + signed(f.e) + ' + 1)/(' + signed(f.e) + ' + 1)', inv = div(ONE, n1);
            var coefT = (inv.n < 0n ? '−' : '') + fmt(inv.n < 0n ? neg(inv) : inv) + ' · ' + pw(n1);
            line(log, label, (asWritten !== pw(f.e) ? asWritten + ' = ' + pw(f.e) + '\n' : '') + '⟦∫ ' + pw(f.e) + ' d' + v + '⟧ = ' + plus + ' = '
                + pw(n1) + '/' + (isInt(n1) && n1.n > 0n ? n1t : '(' + n1t + ')') + ' = ' + coefT + (coefT === show(res) ? '' : ' = ' + show(res))
                + (n1.d === 2n && n1.n > 1n && /√/.test(show(res)) ? (function () { // [EN] x^(3/2) = x · x^(1/2) = x√x (S126)
                    var k = (n1.n - 1n) / 2n, xk = k === 1n ? v : v + K.sup(String(k));
                    return '\n' + pw(n1) + ' = ' + xk + ' · ' + v + '^(1/2) = ' + xk + '√' + v;
                })() : ''), fid);
        } else line(log, label, '⟦' + integralText(e, v) + '⟧ = ' + show(res), fid);
        return res;
    }

    function candidates(e, v) {
        var out = [], seen = {};
        function push(g) {
            if (!hasVar(g, v) || isVarExpr(g, v)) return;
            var k = show(g);
            if (!seen[k]) { seen[k] = 1; out.push(g); }
        }
        function walk(list) {
            list.forEach(function (t) {
                t.fs.forEach(function (f) {
                    var a = f.b;
                    if (a.k === 'fn') { push(a.a); push(atomExpr(a)); walk(a.a); }
                    if (a.k === 'sum') { push(a.s); walk(a.s); }
                    if (a.k === 'exp') { push(a.x); push(atomExpr(a)); walk(a.x); }
                });
            });
        }
        walk(e);
        return out;
    }
    function substitution(e, v, depth, log) {
        var list = candidates(e, v), tv = v === 't' ? 'u' : 't', tExpr = variable(tv);
        for (var i = 0; i < list.length; i++) {
            var g = list[i], dg;
            try { dg = dExpr(g, v, null); } catch (err) { continue; }
            if (!dg.length) continue;
            var key = show(g);
            var ratio;
            try { ratio = cMul(e, cPow(dg, neg(ONE))); } catch (err2) { continue; }
            var swap = function (a) {
                if (a.k === 'sum' && '(' + key + ')' === showAtom(a)) return tExpr;
                return showAtom(a) === key ? tExpr : null;
            };
            swap.key = key;
            swap.whole = tExpr;
            var inT = mapExpr(ratio, swap);
            if (hasVar(inT, v)) continue;
            var inner = [];
            var solved = attempt(inner, function (b) { return integ(inT, tv, depth + 1, b); });
            if (!solved) continue;
            // [EN] dt = 2 dx, więc dx = dt/2 — skąd dzielenie przez 2 (raport E, C6)
            var solveFor = dg.length === 1 && !eq(dg[0].c, ONE) ? ', więc ' + (dg[0].fs.length ? show([term(ONE, dg[0].fs)]) + ' ' : '') + 'd' + v + ' = d' + tv + '/' + (isInt(dg[0].c) && dg[0].c.n > 0n ? fmt(dg[0].c) : '(' + fmt(dg[0].c) + ')') : '';
            line(log, 'Podstawienie: ' + tv + ' = ' + key, 'd' + tv + ' = (' + key + ')′ d' + v + ' = ' + paren(dg) + ' d' + v + solveFor + '\n' + integralText(e, v) + ' = ' + integralText(inT, tv));
            inner.forEach(function (s) { log.push(s); });
            var back = mapExpr(solved, function (a) { return a.k === 'var' && a.v === tv ? g : null; });
            line(log, 'Wracam do zmiennej ' + v, show(back));
            return back;
        }
        return null;
    }

    function byParts(e, v, depth, log) {
        var t = e[0], logs = [], waves = [], polys = [];
        t.fs.forEach(function (f) {
            var a = f.b;
            if (a.k === 'fn' && eq(f.e, ONE) && (a.f === 'ln' || a.f === 'atan' || a.f === 'asin' || a.f === 'log')) logs.push(f);
            else if (a.k === 'exp' && eq(f.e, ONE)) waves.push(f);
            else if (a.k === 'fn' && eq(f.e, ONE) && (a.f === 'sin' || a.f === 'cos')) waves.push(f);
            else polys.push(f);
        });
        var poly = [term(ONE, polys)];
        if (!polyCoefs(poly, v)) return null;
        var u, dv;
        if (logs.length === 1 && !waves.length) { u = [term(ONE, logs)]; dv = poly; }
        else if (waves.length === 1 && !logs.length && polys.length) { u = poly; dv = [term(ONE, waves)]; }
        else return null;
        var du = dExpr(u, v, null);
        var inner = [];
        var bigV = integ(dv, v, depth + 1, null);
        var next = expandExpr(cMul(bigV, du));
        // [EN] − ∫ −cos(x) dx = + ∫ cos(x) dx: minus razy minus od razu, bez wyłączania −1 (raport E, C3)
        var flip = next.length === 1 && next[0].c.n < 0n, small = flip ? cNeg(next) : next;
        var rest = integ(small, v, depth + 1, inner);
        var uv = show(cMul(u, bigV)), sign = flip ? ' + ' : ' − ';
        // [EN] du i v policzone w osobnych wierszach (S36): du = (u)′ dx, v = ∫ dv
        var dvT = show(dv), vInt = '∫ ' + (dv.length > 1 ? '(' + dvT + ')' : dvT) + ' d' + v;
        line(log, 'Całkuję przez części',
            'u = ' + show(u) + ', dv = ' + dvT + ' d' + v + '\ndu = (' + show(u) + ')′ d' + v + ' = ' + paren(du) + ' d' + v + '\nv = ' + vInt + ' = ' + show(bigV));
        if (log) log[log.length - 1].partsU = show(u);
        // [EN] v · du przed uproszczeniem: x²/2 · 1/x = x/2 (S45)
        var vdu = grpT(bigV) + ' · ' + grpN(du), raw = vdu === show(next) ? '' : ' − ∫ ' + vdu + ' d' + v;
        line(log, 'Podstawiam do wzoru', 'u · v − ∫ v du = ⟦' + uv + (raw || ' − ' + integralText(next, v)) + '⟧' + (raw ? ' = ' + uv + ' − ' + integralText(next, v) : '')
            + (flip ? ' = ' + uv + sign + integralText(small, v) : ''), 'przez-czesci', 'u = ' + show(u) + ', dv = ' + show(dv) + ' d' + v);
        inner.forEach(function (s) { log.push(s); });
        var out = flip ? cAdd(cMul(u, bigV), rest) : cSub(cMul(u, bigV), rest);
        line(log, 'Wstawiam policzoną całkę', uv + sign + (rest.length > 1 ? '(' + show(rest) + ')' : show(rest)) + (sameText(uv + sign + show(rest), show(out)) ? '' : ' = ' + show(out)));
        return out;
    }

    function overText(c, f) { // [EN] (1/2)/(x − 1), nie 1/2/(x − 1)
        return (isInt(c) ? fmt(c) : '(' + fmt(c) + ')') + '/' + paren(f);
    }
    function rational(e, v, depth, log) {
        var t = e[0], ups = [], downs = [];
        t.fs.forEach(function (f) {
            if (f.e.n < 0n) downs.push({ b: f.b, e: neg(f.e) }); else ups.push(f);
        });
        if (!downs.length) return null;
        var top = polyCoefs([term(t.c, ups)], v), bottom = polyCoefs([term(ONE, downs)], v);
        if (!top || !bottom || bottom.length !== 3) return null;
        var x = variable(v), q = bottom, n = top.slice(), quotient = [];
        while (n.length >= 3) { // [EN] dzielenie wielomianów, aż licznik ma stopień < 2
            var lead = div(n[n.length - 1], q[2]), shift = n.length - 3;
            quotient[shift] = lead;
            for (var i = 0; i < 3; i++) n[i + shift] = sub(n[i + shift], mul(lead, q[i]));
            n.pop();
        }
        var whole = [];
        if (quotient.length) {
            for (var j = 0; j < quotient.length; j++) if (!quotient[j]) quotient[j] = ZERO;
            whole = polyExpr(quotient, v);
            // [EN] x³ = x · (x² − 1) + x, czyli x³/(x² − 1) = x + x/(x² − 1) (S55)
            var restP = polyExpr(n, v), restT = restP.length ? (restP[0].c.n < 0n && restP.length === 1 ? ' − ' + show(cNeg(restP)) : ' + ' + show(restP)) : '';
            line(log, 'Dzielę licznik przez mianownik', show(polyExpr(top, v)) + ' = ' + grpT(whole) + ' · ' + paren(polyExpr(q, v)) + restT
                + '\n' + paren(polyExpr(top, v)) + '/' + paren(polyExpr(q, v)) + ' = ' + show(whole) + (restP.length ? ' + ' + paren(restP) + '/' + paren(polyExpr(q, v)) : ''));
        }
        var n0 = n[0] || ZERO, n1 = n[1] || ZERO, a = q[2], b = q[1], c = q[0];
        var delta = sub(mul(b, b), mul(R(4), mul(a, c)));
        var res;
        if (delta.n > 0n) {
            var root = K.sqrtExact(delta);
            if (!root) return null;
            var r1 = div(sub(neg(b), root), mul(R(2), a)), r2 = div(add(neg(b), root), mul(R(2), a));
            var A = div(add(mul(n1, r1), n0), mul(a, sub(r1, r2))), B = div(add(mul(n1, r2), n0), mul(a, sub(r2, r1)));
            var f1 = cSub(x, num(r1)), f2 = cSub(x, num(r2));
            // [EN] skąd A i B (raport E, C2): rozkład mianownika, równość liczników, wstawienie pierwiastków
            var aPre = eq(a, ONE) ? '' : fmt(a) + ' · ', numText = show(polyExpr([n0, n1], v));
            var times = function (k, L) { return eq(k, ONE) ? L : eq(k, neg(ONE)) ? '−' + L : (isInt(k) ? fmt(k) : '(' + fmt(k) + ')') + L; };
            line(log, 'Rozkładam mianownik', show(polyExpr(q, v)) + ' = ' + aPre + paren(f1) + paren(f2));
            var numE = polyExpr([n0, n1], v), den = aPre + paren(f1) + paren(f2);
            line(log, 'Zapisuję ułamki proste', paren(numE) + '/(' + den + ') = A/' + (aPre ? '(' + aPre + paren(f1) + ')' : paren(f1)) + ' + B/' + paren(f2)
                + '\n' + numText + ' = ' + aPre + 'A' + paren(f2) + ' + ' + aPre + 'B' + paren(f1));
            var atR = function (r) { return fmt(add(n0, mul(n1, r))); };
            // [EN] wstawienie miejsca zerowego widoczne: 1 = A(−1 − 1) + B(−1 + 1) = −2A (S37)
            var at = function (r, root) { return '(' + fmt(r) + (root.n < 0n ? ' + ' + fmt(neg(root)) : ' − ' + fmt(root)) + ')'; };
            line(log, 'Wyznaczam A i B', v + ' = ' + fmt(r1) + ':  ' + atR(r1) + ' = ' + aPre + 'A' + at(r1, r2) + ' + ' + aPre + 'B' + at(r1, r1) + ' = ' + times(mul(a, sub(r1, r2)), 'A') + ',  A = ' + fmt(A)
                + '\n' + v + ' = ' + fmt(r2) + ':  ' + atR(r2) + ' = ' + aPre + 'A' + at(r2, r2) + ' + ' + aPre + 'B' + at(r2, r1) + ' = ' + times(mul(a, sub(r2, r1)), 'B') + ',  B = ' + fmt(B));
            line(log, 'Wstawiam A i B', paren(numE) + '/(' + den + ') = ' + overText(A, f1) + (B.n < 0n ? ' − ' + overText(neg(B), f2) : ' + ' + overText(B, f2)));
            res = cAdd(cMul(num(A), cFn('lnabs', f1)), cMul(num(B), cFn('lnabs', f2)));
            // [EN] każdy ułamek osobno: ∫ c/(x − a) dx = c · ln|x − a|, w kolejności z rozkładu (S4)
            var lnRow = function (k, f) { return '∫ ' + overText(k, f) + ' d' + v + ' = ' + show(cMul(num(k), cFn('lnabs', f))); };
            log && log.push({ label: 'Każdy ułamek daje logarytm', math: lnRow(A, f1) + '\n' + lnRow(B, f2), formula: { id: 'ulamki-proste', here: 'c = ' + fmt(A) + ', a = ' + fmt(r1) + ';  c = ' + fmt(B) + ', a = ' + fmt(r2) } });
        } else if (isZero(delta)) {
            var r = div(neg(b), mul(R(2), a));
            var fr = cSub(x, num(r));
            var rest = add(n0, mul(n1, r));
            res = cSub(cMul(num(div(n1, a)), cFn('lnabs', fr)), cMul(num(div(rest, a)), cPow(fr, neg(ONE))));
            line(log, 'Mianownik jest kwadratem', show(polyExpr(q, v)) + ' = ' + fmt(a) + paren(fr) + '²');
        } else {
            var p = div(b, a), qq = div(c, a);
            var shiftP = div(p, R(2));
            var s2 = sub(qq, mul(shiftP, shiftP));
            var s = cPow(num(s2), R(1, 2));
            var m = div(n1, mul(R(2), a));
            var k = div(sub(n0, mul(n1, shiftP)), a);
            var inside = cAdd(x, num(shiftP));
            var lnPart = cMul(num(m), cFn('ln', polyExpr([qq, p, ONE], v)));
            var atanPart = cMul(cMul(num(k), cPow(s, neg(ONE))), cFn('atan', cMul(inside, cPow(s, neg(ONE)))));
            if (!isZero(shiftP)) line(log, 'Δ < 0, więc dopełniam do kwadratu', show(polyExpr([qq, p, ONE], v)) + ' = ' + paren(inside) + '² + ' + fmt(s2));
            res = cAdd(lnPart, atanPart);
            var aT = show(s), aSq = /^\d+$/.test(aT) ? aT + '²' : '(' + aT + ')²'; // [EN] 4 = 2², a = 2 — skąd a we wzorze
            // [EN] sama 1/(x² + a²): wynik w kształcie wzoru, 1/2 · arctg(x/2), potem uproszczony (raport E, C7)
            var plainAt = isZero(m) && eq(k, ONE) && isZero(shiftP);
            var put = plainAt ? '1/' + aT + ' · arctg(' + v + '/' + aT + ')' : show(res);
            line(log, 'Korzystam z tablicy całek', fmt(s2) + ' = ' + aSq + ',  a = ' + aT + ':  ∫ 1/(' + v + '² + a²) d' + v + ' = ⟦' + put + '⟧'
                + (put !== show(res) ? ' = ' + show(res) : ''), 'calka-arctg');
        }
        if (whole.length) {
            var wholeInt = integ(whole, v, depth + 1, log);
            return cAdd(wholeInt, res);
        }
        return res;
    }

    function expanded(e, v, depth, log) {
        var open = expandExpr(e);
        if (show(open) === show(e)) return null;
        // [EN] (x² + 1)/x: to dzielenie każdego wyrazu licznika, nie wymnażanie (S124)
        var fr = /^\(([^()]+)\)\/(\w+|\([^()]+\))$/.exec(show(e));
        if (fr) {
            var pieces = fr[1].split(/ (?=[+−] )/).map(function (q, i) { return (i ? ' ' + q.slice(0, 2) + q.slice(2) : q) + '/' + fr[2]; }).join('');
            line(log, 'Dzielę każdy wyraz licznika przez ' + fr[2], integralText(e, v) + ' = ∫ (' + pieces + ') d' + v + ' = ' + integralText(open, v), 'dzielenie-sumy');
        } else line(log, 'Wymnażam nawiasy', integralText(e, v) + ' = ' + integralText(open, v));
        return integ(open, v, depth + 1, log);
    }

    // ── Polecenia ────────────────────────────────────────────
    function detect(raw) {
        var s = K.fold(raw);
        if (!s || s.length > K.MAX_INPUT) return null;
        var m = /^\((.+)\)\s*['′]$/.exec(s);
        if (m) return { kind: 'd', src: m[1] };
        m = /^d\/d([a-z])\s+(.+)$/.exec(s);
        if (m) return { kind: 'd', src: m[2], v: m[1] };
        m = /^(?:oblicz\s+)?(?:pochodna|derivative|diff)(?:\s+funkcji)?(?:\s+of)?(?:\s+z(?=\s))?\s*(.*)$/.exec(s);
        if (m) {
            if (!m[1]) return null;
            var by = /\s+(?:po|wzgledem|with respect to)\s+([a-z])$/.exec(m[1]);
            return { kind: 'd', src: by ? m[1].slice(0, by.index) : m[1], v: by ? by[1] : null };
        }
        m = /^(?:oblicz\s+)?(?:(?:calka|calke|calkuj|integral|integrate)(?:\s+(?:nieoznaczona|oznaczona))?(?:\s+of)?(?:\s+z(?=\s))?|∫)\s*(.*)$/.exec(s);
        if (!m || !m[1]) return null;
        var body = m[1], from = null, to = null;
        var head = /^(?:od|from)\s+(\S+)\s+(?:do|to)\s+(\S+)\s+(.+)$/.exec(body);
        var tail = /^(.+?)\s+(?:od|from)\s+(.+?)\s+(?:do|to)\s+(.+)$/.exec(body);
        if (head) { from = head[1]; to = head[2]; body = head[3]; }
        else if (tail) { body = tail[1]; from = tail[2]; to = tail[3]; }
        var dx = /\s*d([a-z])$/.exec(body);
        var v = null;
        if (dx) { v = dx[1]; body = body.slice(0, dx.index); }
        return body.trim() ? { kind: 'i', src: body.trim(), v: v, from: from, to: to } : null;
    }
    function pickVar(e, wanted) {
        if (wanted) return wanted;
        var names = Object.keys(varsIn(e, {})).sort();
        return names.indexOf('x') >= 0 || !names.length ? 'x' : names[0];
    }
    function derivative(e, v) {
        _var = v;
        var name = 'f(' + v + ')';
        var steps = [{ label: 'Funkcja', math: name + ' = ' + show(e) }];
        var res = dExpr(e, v, steps);
        if (!sameAsDerivative(e, res, v)) throw new NotSupported();
        // [EN] wynik w kolejności z rachunku (3x² · sin(x) + x³ · cos(x)), nie posortowany na nowo
        var prev = steps[steps.length - 1], tail = prev.math.split('\n').pop().split(' = ').pop().replace(/[⟦⟧]/g, '');
        var body = prev.label === 'Wstawiam do wzoru' && sameText(tail, show(res)) ? tail : show(res);
        var text = "f′(" + v + ') = ' + body;
        steps.push({ label: 'Wynik', math: text });
        return K.done('Pochodna', text, null, steps);
    }
    function boundValue(src) {
        var e = fromAst(K.parse(src));
        var value = evalExpr(e, {});
        if (!isFinite(value)) throw new NotSupported();
        return { e: e, value: value, text: show(e) };
    }
    function exactAt(F, v, point) { // [EN] wynik dokładny, gdy zostają same ułamki
        if (!isNumber(point)) return null;
        var value = ZERO, x = numberOf(point);
        for (var i = 0; i < F.length; i++) {
            var cur = F[i].c;
            for (var j = 0; j < F[i].fs.length; j++) {
                var f = F[i].fs[j];
                if (f.b.k !== 'var' || f.b.v !== v || !isInt(f.e)) return null;
                if (isZero(x) && f.e.n < 0n) return null;
                cur = mul(cur, powR(x, Number(f.e.n)));
            }
            value = add(value, cur);
        }
        return value;
    }
    function integral(e, v, d) {
        _var = v;
        // [EN] granice widać od pierwszego kroku: ∫(0→1) x² dx (rysowane jako ∫ z granicami)
        var pi = function (b) { return String(b).replace(/\bpi\b/g, 'π'); }; // [EN] π jak w dalszych krokach
        var steps = [{ label: 'Całka', math: d && d.from != null ? '∫(' + pi(d.from) + '→' + pi(d.to) + ') ' + (e.length > 1 ? '(' + show(e) + ')' : show(e)) + ' d' + v : integralText(e, v) }];
        var F = integ(e, v, 0, steps);
        if (!sameAsDerivative(F, e, v)) throw new NotSupported();
        // [EN] sprawdzenie z rachunkiem pochodnej (S5, S17): wiersze z silnika pochodnych, potem zgodność z funkcją pod całką
        var rowsD = [], dl = [];
        try {
            var dF = dExpr(F, v, dl);
            dl.forEach(function (st) {
                st.math.split('\n').forEach(function (r) {
                    r = r.replace(/[⟦⟧]/g, '');
                    if (r.indexOf(' = ') < 0 && /\)′ [+−] /.test(r)) r = '(' + show(F) + ')′ = ' + r; // [EN] rozbicie na sumę pochodnych
                    var sides = r.split(' = ');
                    if (sides.length === 2 && sides[0] === sides[1]) return; // [EN] 2 · eˣ = 2 · eˣ nic nie mówi
                    if (rowsD.indexOf(r) >= 0 || r.split(',  ').length > 1 && r.split(',  ').every(function (q) { return rowsD.indexOf(q) >= 0 || rowsD.some(function (x) { return x.indexOf(q.split(' = ')[0] + ' = ') === 0; }); })) return;
                    rowsD.push(r);
                });
            });
            if (F.length > 1 && rowsD.length) { // [EN] na końcu suma pochodnych składników, która się redukuje do funkcji spod całki
                var partsD = viewOrder(F).map(function (t) { return grpT(dTerm(t, v, null)); });
                rowsD.push(partsD.map(function (x, i) { return !i ? x : x[0] === '−' ? ' − ' + x.slice(1) : ' + ' + x; }).join('') + ' = ' + show(dF));
            }
            if (rowsD.length && show(dF) !== show(e)) rowsD.push(show(dF) + ' = ' + show(e));
            // [EN] (x)′ = 1, (1)′ = 0, (x + 1)′ = 1 + 0 = 1 → jeden wiersz (x + 1)′ = 1; bez wierszy „A = A” (S123)
            var SUMD = /^(\([^()]*\)′) = −?\d+(?: [+−] \d+)+ = (−?\d+)$/, TRIV = /^\((−?\d+|[a-z])\)′ = [01]$/;
            rowsD = rowsD.filter(function (r) { var sd = r.split(' = '); return !(sd.length === 2 && sd[0] === sd[1]); });
            rowsD = rowsD.filter(function (r, i) { // [EN] trywialne wiersze tuż przed zwiniętą sumą znikają
                if (!TRIV.test(r)) return true;
                for (var j = i + 1; j < rowsD.length && TRIV.test(rowsD[j]); j++);
                return !(j < rowsD.length && SUMD.test(rowsD[j]));
            }).map(function (r) { return r.replace(SUMD, '$1 = $2'); });
        } catch (x) { rowsD = []; }
        if (rowsD.length > 99) rowsD = []; // shortcut: bardzo długie sprawdzenie zostaje jednym wierszem, rozwinąć przy przeglądzie ucznia
        steps.push({ label: 'Sprawdzenie', math: (rowsD.length ? rowsD.join('\n') + '\n' : '') + '(' + show(F) + ')′ = ' + show(e) + ' ✓' });
        if (d.from == null) {
            var text = show(F) + ' + C';
            steps.push({ label: 'Wynik', math: text });
            return K.done('Całka', text, null, steps);
        }
        var lo = boundValue(d.from), hi = boundValue(d.to);
        var atLo = {}, atHi = {};
        atLo[v] = lo.value; atHi[v] = hi.value;
        atLo['*'] = atHi['*'] = 1.37;
        var value = evalExpr(F, atHi) - evalExpr(F, atLo);
        var check = simpson(e, v, lo.value, hi.value);
        if (!isFinite(value) || !isFinite(check) || Math.abs(value - check) > 1e-5 * (1 + Math.abs(check))) throw new NotSupported();
        var a = exactAt(F, v, lo.e), b = exactAt(F, v, hi.e);
        var exact = a && b ? sub(b, a) : null;
        var whole = Math.abs(value - Math.round(value)) < 1e-11; // [EN] ∫ sin(x) od 0 do π to dokładnie 2
        var res = exact ? fmt(exact) : (whole ? fmt(R(Math.round(value))) : '≈ ' + K.fmtApprox(value));
        // [EN] wartości z tablicy przed odejmowaniem: cos(π) = −1, cos(0) = 1 (S125)
        var TAB = { sin: { '0': '0', 'π/6': '1/2', 'π/4': '√2/2', 'π/3': '√3/2', 'π/2': '1', 'π': '0', '2π': '0' },
            cos: { '0': '1', 'π/6': '√3/2', 'π/4': '√2/2', 'π/3': '1/2', 'π/2': '0', 'π': '−1', '2π': '1' } };
        var putHi = putIn(F, v, hi.text), putLo = putIn(F, v, lo.text), vals = [];
        (putHi + ' ' + putLo).replace(/(sin|cos)\(([^()]*)\)/g, function (m, f, x) { var t = TAB[f][x]; if (t && vals.indexOf(m + ' = ' + t) < 0) vals.push(m + ' = ' + t); return m; });
        var bT = b ? fmt(b) : K.fmtApprox(evalExpr(F, atHi)), aT = (a ? fmt(a) : K.fmtApprox(evalExpr(F, atLo)));
        // [EN] odejmowanie liczby ujemnej rozpisane: 8/3 − (−1/3) = 8/3 + 1/3 (S125)
        var minusNeg = /^−/.test(aT) && !/^≈/.test(res) ? ' = ' + bT + ' + ' + aT.slice(1) : '';
        if (minusNeg && a && b && a.d === b.d && b.d > 1n && fmt(R(b.n - a.n, b.d)) !== fmt(R(b.n - a.n)) ) minusNeg += ' = ' + (b.n - a.n) + '/' + b.d; // [EN] 8/3 + 1/3 = 9/3 = 3
        steps.push({
            label: 'Liczę F(b) − F(a)', formula: { id: 'newton-leibniz' },
            math: 'F(' + v + ') = ' + show(F) + (vals.length ? '\n' + vals.join(',  ') : '') + '\nF(' + hi.text + ') − F(' + lo.text + ') = ⟦' + putHi + ' − ' + putLo + '⟧ = '
                + bT + ' − ' + aT.replace(/^−(.*)$/, '(−$1)') + minusNeg + (/^≈/.test(res) ? ' ' : ' = ') + res
        });
        steps.push({ label: 'Wynik', math: res });
        return K.done('Całka oznaczona', res, value, steps);
    }
    // [EN] F z granicą w miejscu zmiennej: x³/3 → 1³/3, −cos(x) → (−cos(π)), 2x → 2 · 3; zmienna tylko jako osobna litera (nie t w tg)
    function putIn(F, v, at) {
        var val = /^[\dπe]+$/.test(at) ? at : '(' + at + ')';
        var out = show(F).replace(new RegExp('(\\d?)(?<![a-zA-Z])' + v + '(?![a-zA-Z])', 'g'), function (m, d, i, str) {
            var bare = str[i + d.length - 1] === '(' && str[i + m.length] === ')' || str[i + d.length - 1] === '|' && str[i + m.length] === '|'; // [EN] sin(π/2), nie sin((π/2))
            var x = bare ? at : val;
            return d ? d + ' · ' + x : x;
        });
        return /^−| [+−] /.test(out) ? '(' + out + ')' : out;
    }
    function run(d) {
        var e = fromAst(K.parse(d.src));
        var v = pickVar(e, d.v);
        return d.kind === 'd' ? derivative(e, v) : integral(e, v, d);
    }

    var API = {
        detect: detect, run: run,
        // [EN] dla js/math-limits.js — te same wyrażenia, pokaz i pochodne (bez zmiany zachowania)
        _core: {
            fromAst: fromAst, show: show, paren: paren, evalExpr: evalExpr, dExpr: dExpr,
            cAdd: cAdd, cSub: cSub, cNeg: cNeg, cMul: cMul, cPow: cPow, cExp: cExp, cFn: cFn,
            num: num, variable: variable, atomExpr: atomExpr, term: term, hasVar: hasVar,
            isNumber: isNumber, numberOf: numberOf, mapExpr: mapExpr, expandExpr: expandExpr,
            polyCoefs: polyCoefs, polyExpr: polyExpr, E_CONST: E_CONST, showAtom: showAtom,
            showInner: showInner, asTerm: asTerm, setVar: function (v) { _var = v; },
            atomsProduct: function (fs) { return [term(ONE, normFactors(fs))]; }
        }
    };
    STEPS.registerCalculus(API);
    if (typeof window !== 'undefined') window.MATM0_CALC = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
