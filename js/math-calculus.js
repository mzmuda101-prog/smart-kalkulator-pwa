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
    function mulTerm(x, y) { return term(mul(x.c, y.c), normFactors(x.fs.concat(y.fs))); }
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
        return [term(c, normFactors(extra.concat(t.fs.map(function (f) { return { b: f.b, e: mul(f.e, r) }; }))))];
    }
    function isNumber(e) { return !e.length || (e.length === 1 && !e[0].fs.length); }
    function numberOf(e) { return e.length ? e[0].c : ZERO; }
    function cFn(f, a) {
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
                return cFn(n.f, fromAst(n.a));
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
        if (a.k === 'fn') return cFn(a.f, mapExpr(a.a, fn));
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
        if (eq(e, R(1, 2))) {
            var body = showAtom(a);
            return '√' + (a.k === 'var' || a.k === 'num' || a.k === 'sum' ? body : '(' + body + ')');
        }
        if (a.k === 'fn' && a.f !== 'lnabs' && isInt(e) && e.n > 0n) {
            return (FN_SHOW[a.f] || a.f) + sup(e.n.toString()) + '(' + showInner(a.a) + ')';
        }
        if (a.k === 'exp') return '(' + showAtom(a) + ')' + supFrac(e);
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
        var many = (q !== 1n && downs.length > 0) || downs.length > 1;
        return top + '/' + (many ? '(' + bottom + ')' : bottom);
    }
    function show(e) {
        var list = sortedTerms(e);
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
    function line(log, label, math) { if (log) log.push({ label: label, math: math }); }
    function isSimplePower(t, v) {
        var vars = t.fs.filter(function (f) { return atomHas(f.b, v); });
        return !vars.length || (vars.length === 1 && vars[0].b.k === 'var');
    }
    function dExpr(e, v, log) {
        if (!hasVar(e, v)) return [];
        if (e.length === 1) return dTerm(e[0], v, log);
        var list = sortedTerms(e);
        if (list.every(function (t) { return isSimplePower(t, v); })) {
            var res = [], rows = [];
            list.forEach(function (t) {
                var r = dTerm(t, v, null);
                res = cAdd(res, r);
                rows.push('(' + show([t]) + ')′ = ' + show(r));
            });
            line(log, 'Liczę każdy składnik: (xⁿ)′ = n·xⁿ⁻¹, a stałe dają 0', rows.join('\n'));
            return res;
        }
        line(log, 'Pochodna sumy: liczę każdy składnik osobno', list.map(function (t) { return '(' + show([t]) + ')′'; }).join(' + '));
        return list.reduce(function (acc, t) { return cAdd(acc, dTerm(t, v, log)); }, []);
    }
    function dTerm(t, v, log) {
        var fixed = [], moving = [];
        t.fs.forEach(function (f) { (atomHas(f.b, v) ? moving : fixed).push(f); });
        if (!moving.length) return [];
        var constant = [term(t.c, fixed)];
        var one = eq(t.c, ONE) && !fixed.length;
        if (moving.length === 1) {
            if (!one && moving[0].b.k !== 'var') {
                line(log, 'Stała zostaje przed pochodną', '(' + show([t]) + ')′ = ' + paren(constant) + ' · (' + showFactor(moving[0]) + ')′');
            }
            return cMul(constant, dFactor(moving[0], v, log));
        }
        var ups = moving.filter(function (f) { return f.e.n > 0n; });
        var downs = moving.filter(function (f) { return f.e.n < 0n; });
        var res;
        if (ups.length && downs.length) {
            var top = [term(ONE, ups)];
            var bottom = [term(ONE, downs.map(function (f) { return { b: f.b, e: neg(f.e) }; }))];
            line(log, 'Pochodna ilorazu: (f/g)′ = (f′g − fg′) / g²', 'f = ' + showInner(top) + '\ng = ' + showInner(bottom));
            var dt = dExpr(top, v, log), db = dExpr(bottom, v, log);
            res = cMul(expandExpr(cSub(cMul(dt, bottom), cMul(top, db))), cPow(bottom, R(-2)));
        } else {
            var head = [term(ONE, [moving[0]])], tail = [term(ONE, moving.slice(1))];
            line(log, 'Pochodna iloczynu: (f·g)′ = f′g + fg′', 'f = ' + showInner(head) + '\ng = ' + showInner(tail));
            var df = dExpr(head, v, log), dg = dExpr(tail, v, log);
            res = cAdd(cMul(df, tail), cMul(head, dg));
        }
        var out = cMul(constant, res);
        line(log, 'Składam wynik', show(out));
        return out;
    }
    function chain(outer, u, v, log, name) {
        var plain = u.length === 1 && u[0].fs.length === 1 && u[0].fs[0].b.k === 'var' && eq(u[0].c, ONE) && eq(u[0].fs[0].e, ONE);
        if (plain) { line(log, 'Wzór z tablicy', '(' + name + ')′ = ' + show(outer)); return outer; }
        line(log, 'Pochodna złożona: zewnętrzna razy wewnętrzna', '(' + name + ')′ = ' + show(outer) + ' · (' + showInner(u) + ')′');
        var inner = dExpr(u, v, log);
        return cMul(outer, inner);
    }
    function dFactor(f, v, log) {
        var a = f.b, e = f.e, res;
        if (a.k === 'var') {
            res = cMul(num(e), cPow(variable(a.v), sub(e, ONE)));
            line(log, 'Wzór: (xⁿ)′ = n·xⁿ⁻¹', '(' + showFactor(f) + ')′ = ' + show(res));
            return res;
        }
        if (!eq(e, ONE)) {
            var base = atomExpr(a);
            var outer = cMul(num(e), cPow(base, sub(e, ONE)));
            line(log, 'Pochodna złożona: najpierw potęga, potem wnętrze', '(' + showFactor(f) + ')′ = ' + show(outer) + ' · (' + showInner(base) + ')′');
            return cMul(outer, dFactor({ b: a, e: ONE }, v, log));
        }
        if (a.k === 'sum') return dExpr(a.s, v, log);
        if (a.k === 'exp') {
            if (hasVar(a.b, v)) throw new NotSupported();
            var self = atomExpr(a);
            var outerE = isEuler(a.b) ? self : cMul(self, cFn('ln', a.b));
            return chain(outerE, a.x, v, log, show(self));
        }
        if (a.k === 'fn') return chain(fnOuter(a.f, a.a), a.a, v, log, showAtom(a));
        throw new NotSupported();
    }
    function isEuler(b) {
        return b.length === 1 && b[0].fs.length === 1 && b[0].fs[0].b.k === 'const' && b[0].fs[0].b.v === 'e' && eq(b[0].c, ONE) && eq(b[0].fs[0].e, ONE);
    }
    function fnOuter(f, u) {
        var minus1 = neg(ONE);
        switch (f) {
            case 'sin': return cFn('cos', u);
            case 'cos': return cNeg(cFn('sin', u));
            case 'tan': return cPow(cFn('cos', u), R(-2));
            case 'cot': return cNeg(cPow(cFn('sin', u), R(-2)));
            case 'ln': case 'lnabs': return cPow(u, minus1);
            case 'log': return cPow(cMul(u, cFn('ln', num(R(10)))), minus1);
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
    function integralText(e, v) { return '∫ ' + show(e) + ' d' + v; }
    function integ(e, v, depth, log) {
        if (depth > MAX_DEPTH) throw new NotSupported();
        if (!hasVar(e, v)) {
            var flat = cMul(e, variable(v));
            line(log, 'Stała: ∫ a dx = a·x', integralText(e, v) + ' = ' + show(flat));
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
        return cMul(constant, integCore(rest, v, depth, log));
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
        var f = t.fs[0], a = f.b, x = variable(v), res, label = 'Wzór z tablicy';
        var two = R(2), minus1 = neg(ONE);
        if (a.k === 'var') {
            if (eq(f.e, minus1)) { res = cFn('lnabs', x); label = 'Wzór: ∫ 1/x dx = ln|x|'; }
            else {
                var n1 = add(f.e, ONE);
                res = cMul(num(div(ONE, n1)), cPow(x, n1));
                label = 'Wzór: ∫ xⁿ dx = xⁿ⁺¹/(n + 1)';
            }
        } else if (a.k === 'exp' && isVarExpr(a.x, v) && !hasVar(a.b, v) && eq(f.e, ONE)) {
            res = isEuler(a.b) ? atomExpr(a) : cMul(atomExpr(a), cPow(cFn('ln', a.b), minus1));
            label = isEuler(a.b) ? 'Wzór: ∫ eˣ dx = eˣ' : 'Wzór: ∫ aˣ dx = aˣ/ln(a)';
        } else if (a.k === 'fn' && isVarExpr(a.a, v)) {
            var one = eq(f.e, ONE), two2 = eq(f.e, two), minus2 = eq(f.e, R(-2));
            if (a.f === 'sin' && one) res = cNeg(cFn('cos', x));
            else if (a.f === 'cos' && one) res = cFn('sin', x);
            else if (a.f === 'tan' && one) { res = cNeg(cFn('lnabs', cFn('cos', x))); label = 'Wzór: ∫ tg(x) dx = −ln|cos(x)|'; }
            else if (a.f === 'cot' && one) { res = cFn('lnabs', cFn('sin', x)); label = 'Wzór: ∫ ctg(x) dx = ln|sin(x)|'; }
            else if (a.f === 'cos' && minus2) res = cFn('tan', x);
            else if (a.f === 'sin' && minus2) res = cNeg(cFn('cot', x));
            else if ((a.f === 'sin' || a.f === 'cos') && two2) {
                var half = cMul(num(R(1, 2)), x);
                var wave = cMul(num(R(1, 4)), cFn('sin', cMul(num(two), x)));
                res = a.f === 'sin' ? cSub(half, wave) : cAdd(half, wave);
                label = a.f === 'sin' ? 'Tożsamość: sin²(x) = (1 − cos(2x))/2' : 'Tożsamość: cos²(x) = (1 + cos(2x))/2';
            } else if (a.f === 'tan' && two2) {
                res = cSub(cFn('tan', x), x);
                label = 'Tożsamość: tg²(x) = 1/cos²(x) − 1';
            }
        } else if (a.k === 'sum' && eq(f.e, R(1, 2))) { // [EN] √(k − x²)
            var cc = polyCoefs(a.s, v);
            if (cc && cc.length === 3 && isZero(cc[1]) && eq(cc[2], neg(ONE)) && cc[0].n > 0n) {
                var scale = cPow(num(cc[0]), R(1, 2));
                res = cAdd(cMul(cMul(num(R(1, 2)), x), cPow(a.s, R(1, 2))),
                    cMul(num(div(cc[0], R(2))), cFn('asin', cMul(x, cPow(scale, neg(ONE))))));
                label = 'Wzór: ∫ √(a² − x²) dx = (x/2)√(a² − x²) + (a²/2)·arcsin(x/a)';
            }
        } else if (a.k === 'sum' && eq(f.e, R(-1, 2))) {
            var c = polyCoefs(a.s, v);
            if (c && c.length === 3 && isZero(c[1])) {
                if (eq(c[0], ONE) && eq(c[2], neg(ONE))) res = cFn('asin', x);
                else if (eq(c[2], ONE)) res = cFn('lnabs', cAdd(x, cPow(a.s, R(1, 2))));
            }
        }
        if (!res) return null;
        line(log, label, integralText(e, v) + ' = ' + show(res));
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
            line(log, 'Podstawienie: ' + tv + ' = ' + key, 'd' + tv + ' = ' + paren(dg) + ' d' + v + '\n' + integralText(e, v) + ' = ' + integralText(inT, tv));
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
        var rest = integ(next, v, depth + 1, inner);
        line(log, 'Całkowanie przez części: ∫ u dv = u·v − ∫ v du',
            'u = ' + show(u) + ', dv = ' + show(dv) + ' d' + v + '\ndu = ' + paren(du) + ' d' + v + ', v = ' + show(bigV));
        line(log, 'Podstawiam do wzoru', show(cMul(u, bigV)) + ' − ' + integralText(next, v));
        inner.forEach(function (s) { log.push(s); });
        return cSub(cMul(u, bigV), rest);
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
            line(log, 'Dzielę licznik przez mianownik', 'całość: ' + show(whole) + '\nreszta: ' + show(polyExpr(n, v)) + ' / ' + show(polyExpr(q, v)));
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
            line(log, 'Rozkład na ułamki proste', overText(A, f1) + (B.n < 0n ? ' − ' + overText(neg(B), f2) : ' + ' + overText(B, f2)));
            res = cAdd(cMul(num(A), cFn('lnabs', f1)), cMul(num(B), cFn('lnabs', f2)));
            line(log, 'Każdy ułamek daje logarytm', show(res));
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
            line(log, 'Wzór: ∫ 1/(x² + a²) dx = (1/a)·arctg(x/a)', show(res));
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
        line(log, 'Wymnażam nawiasy', integralText(e, v) + ' = ' + integralText(open, v));
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
        var text = "f′(" + v + ') = ' + show(res);
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
        var steps = [{ label: 'Całka', math: integralText(e, v) }];
        var F = integ(e, v, 0, steps);
        if (!sameAsDerivative(F, e, v)) throw new NotSupported();
        steps.push({ label: 'Sprawdzenie', math: '(' + show(F) + ')′ = ' + show(e) + ' ✓' });
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
        steps.push({
            label: 'Wzór Newtona-Leibniza: F(b) − F(a)',
            math: 'F(' + v + ') = ' + show(F) + '\nF(' + hi.text + ') − F(' + lo.text + ') = ' + (b ? fmt(b) : K.fmtApprox(evalExpr(F, atHi))) + ' − ' +
                (a ? fmt(a) : K.fmtApprox(evalExpr(F, atLo))).replace(/^−(.*)$/, '(−$1)')
        });
        steps.push({ label: 'Wynik', math: res });
        return K.done('Całka oznaczona', res, value, steps);
    }
    function run(d) {
        var e = fromAst(K.parse(d.src));
        var v = pickVar(e, d.v);
        return d.kind === 'd' ? derivative(e, v) : integral(e, v, d);
    }

    var API = { detect: detect, run: run };
    STEPS.registerCalculus(API);
    if (typeof window !== 'undefined') window.MATM0_CALC = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
