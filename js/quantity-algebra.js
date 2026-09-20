/* ============================================================
   [EN] Matm0 Calc — ALGEBRA WYMIAROWA (typed quantities).

   PO CO TO JEST
   Główny pipeline (`js/smart-parser.js` → `resolveUnitsExpression`) przepisuje
   STRING: wycina jednostkę, wkleja gołą liczbę, liczy `eval`, a jednostkę dokleja
   na końcu. Przy dodawaniu to działa, ale przy mnożeniu/dzieleniu wymiar wyparowuje:

       5 km * 5 km   → „25 km”   (powinno: 25 km²)
       10 m / 2 s    → ∅         (powinno: 5 m/s)
       60 km/h * 2 h → ∅         (powinno: 120 km)

   Ten moduł liczy TE SAME wyrażenia na wartości z WEKTOREM WYMIARU
   ({ L: 1, T: -1 } = długość/czas) i dobiera jednostkę wyniku z wymiaru.

   ZASADA WŁĄCZANIA (patrz `evaluate()` w smart-parser.js)
   Nie zastępuje starej ścieżki — wchodzi TYLKO gdy stara nie umie albo się myli:
   gdy stara nie zwróciła jednostki, albo gdy jej kategoria ma INNY wymiar niż
   policzony tutaj. Dzięki temu wszystkie dotąd poprawne wyniki idą starą,
   ogranaą ścieżką (baseline 86/86 bez zmian).

   ŚWIADOME BAIL-OUTY (zwracamy null → stara ścieżka):
   - sąsiadujące wielkości bez operatora („1 dzień 3 h”) = suma, nie iloczyn,
   - waluty, temperatura (skala z offsetem), jednostki custom użytkownika,
   - nazwy funkcji / stałych (sin, pi, e, x), apostrof i cal w cudzysłowie.

   Baza kanoniczna: L = mm, M = g, T = s, D = B (bajt), A = deg.
   ============================================================ */
(function () {
    'use strict';

    /* ---------- kategoria z UNIT_CATEGORIES → wymiar + przelicznik na bazę kanoniczną ----------
       cf = ile jednostek kanonicznych mieści się w jednostce bazowej kategorii.
       Przykład: area.base = 'm2', a baza kanoniczna to mm → 1 m² = 1e6 mm² → cf = 1e6. */
    var CAT_DIM = {
        length: { dim: { L: 1 }, cf: 1 },              // base mm
        mass: { dim: { M: 1 }, cf: 1 },                // base g
        time: { dim: { T: 1 }, cf: 1 },                // base s
        data: { dim: { D: 1 }, cf: 1 },                // base B
        angle: { dim: { A: 1 }, cf: 1 },               // base deg
        area: { dim: { L: 2 }, cf: 1e6 },              // base m2  = 1e6 mm²
        volume: { dim: { L: 3 }, cf: 1000 },           // base ml  = 1000 mm³
        speed: { dim: { L: 1, T: -1 }, cf: 1000 },     // base m/s = 1000 mm/s
    };

    /* Wymiar → kategoria, z której dobieramy ładną jednostkę wyniku. */
    var DIM_CAT = {};
    Object.keys(CAT_DIM).forEach(function (cat) { DIM_CAT[dimKey(CAT_DIM[cat].dim)] = cat; });

    /* Jednostka wyświetlania per wymiar bazowy, gdy wymiar nie ma swojej kategorii
       (np. gęstość kg/m³). Symbol składamy z tych kawałków. */
    var SI_DISPLAY = {
        L: { sym: 'm', cf: 1000 },   // 1 m = 1000 mm
        M: { sym: 'kg', cf: 1000 },  // 1 kg = 1000 g
        T: { sym: 's', cf: 1 },
        D: { sym: 'B', cf: 1 },
        A: { sym: '°', cf: 1 },
    };

    var SUP = { '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };

    /* Ładny zapis potęg w nazwach jednostek. Tylko w TYM module — stara ścieżka
       zostaje przy 'm2'/'km2', żeby nie ruszać baseline'u. */
    var PRETTY = {
        mm2: 'mm²', cm2: 'cm²', dm2: 'dm²', m2: 'm²', km2: 'km²', m3: 'm³',
    };
    function pretty(u) { return PRETTY[String(u).toLowerCase()] || u; }

    /* ---------- wektor wymiaru ---------- */
    function dimKey(d) {
        var keys = Object.keys(d || {}).filter(function (k) { return d[k]; }).sort();
        if (!keys.length) return '';
        return keys.map(function (k) { return k + d[k]; }).join(' ');
    }
    function dimIsEmpty(d) { return dimKey(d) === ''; }
    function dimEq(a, b) { return dimKey(a) === dimKey(b); }
    function dimCombine(a, b, sign) {
        var out = {}, k;
        for (k in a) if (a[k]) out[k] = a[k];
        for (k in b) if (b[k]) out[k] = (out[k] || 0) + sign * b[k];
        for (k in out) if (!out[k]) delete out[k];
        return out;
    }
    function dimScale(a, f) {
        var out = {};
        for (var k in a) if (a[k]) out[k] = a[k] * f;
        return out;
    }
    /* „Prosty” wymiar = dokładnie jedna oś w pierwszej potędze (m, kg, s…). */
    function dimIsSimple(d) {
        var keys = Object.keys(d || {}).filter(function (k) { return d[k]; });
        return keys.length === 1 && d[keys[0]] === 1;
    }

    /* ---------- wartość typowana ---------- */
    function Q(n, dim) { return { n: n, dim: dim || {} }; }

    /* ---------- składanie symbolu z wymiaru (fallback bez kategorii) ---------- */
    function supStr(exp) {
        var s = String(Math.abs(exp));
        var out = '';
        for (var i = 0; i < s.length; i++) out += SUP[s.charAt(i)] || ('^' + s.charAt(i));
        return out;
    }
    function composeSymbol(dim) {
        var num = [], den = [], cf = 1, ok = true;
        Object.keys(dim).sort().forEach(function (k) {
            var e = dim[k], d = SI_DISPLAY[k];
            if (!d) { ok = false; return; }
            cf *= Math.pow(d.cf, e);
            var piece = d.sym + (Math.abs(e) === 1 ? '' : supStr(e));
            if (e > 0) num.push(piece); else den.push(piece);
        });
        if (!ok) return null;
        var sym = (num.length ? num.join('·') : '1') + (den.length ? '/' + den.join('·') : '');
        return { sym: sym, cf: cf };
    }

    /* ---------- tokenizer ----------
       Wejście: wyrażenie PO preprocesingu pipeline'u (stałe, skróty, NL już rozwinięte).
       Zwraca null przy czymkolwiek, czego nie rozumiemy — wtedy decyduje stara ścieżka. */
    function tokenize(src, unitLookup) {
        var s = String(src == null ? '' : src)
            .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
        if (/['"]/.test(s)) return null;                  // 5' / 5" — stopy/cale, zostaw starej ścieżce
        var toks = [], i = 0, sawUnit = false;
        var NUM = /^(\d+(?:[.,]\d+)?|[.,]\d+)/;
        var WORD = /^[A-Za-zÀ-ſ°µ€$£¥₺₹₽₴][A-Za-zÀ-ſ0-9°µ€$£¥₺₹₽₴]*(?:\/[A-Za-zÀ-ſ][A-Za-zÀ-ſ0-9]*)?/;
        while (i < s.length) {
            var ch = s.charAt(i);
            if (ch === ' ' || ch === '\t') { i++; continue; }
            if ('+-*/^()'.indexOf(ch) >= 0) { toks.push({ t: ch }); i++; continue; }
            var rest = s.slice(i);
            var mNum = rest.match(NUM);
            if (mNum) {
                var v = parseFloat(mNum[1].replace(',', '.'));
                if (!isFinite(v)) return null;
                toks.push({ t: 'num', v: v });
                i += mNum[1].length;
                continue;
            }
            var mWord = rest.match(WORD);
            if (mWord) {
                sawUnit = true;
                var word = mWord[0];
                /* najdłuższy pasujący prefiks słowa, który jest znaną jednostką
                   („km/h” zanim „km”) — reszta słowa musi zostać pusta */
                var hit = null;
                for (var len = word.length; len > 0; len--) {
                    var cand = word.slice(0, len);
                    if (unitLookup(cand) && len === word.length) { hit = cand; break; }
                }
                if (!hit) return null;                    // sin, pi, x, nieznana jednostka → bail
                toks.push({ t: 'unit', v: hit });
                i += word.length;
                continue;
            }
            return null;                                  // %, =, przecinek listy itp. → bail
        }
        if (!toks.length) return null;
        toks.sawUnit = sawUnit;
        return toks;
    }

    /* ---------- parser + ewaluator ---------- */
    function makeEvaluator(toks, unitLookup) {
        var p = 0;
        var failed = false;
        function fail() { failed = true; return Q(NaN, {}); }
        function peek() { return toks[p] || null; }
        function at(t) { var x = peek(); return x && x.t === t; }

        /* literał jednostki: atom (('/'|'*') atom)*, gdzie „/” wchodzi w jednostkę
           tylko jeśli zaraz za nim jest słowo (a nie liczba) → „10 m/s” vs „10 m / 2 s”. */
        function unitAtom() {
            if (!at('unit')) return null;
            var key = toks[p].v;
            var info = unitLookup(key);
            if (!info) return null;
            p++;
            var exp = 1;
            if (at('^') && toks[p + 1] && toks[p + 1].t === 'num' && Number.isInteger(toks[p + 1].v)) {
                p += 1; exp = toks[p].v; p++;
            }
            return { dim: dimScale(info.dim, exp), cf: Math.pow(info.cf, exp) };
        }
        function unitExpr() {
            var first = unitAtom();
            if (!first) return null;
            var acc = first;
            for (;;) {
                var op = peek();
                if (!op || (op.t !== '/' && op.t !== '*')) break;
                var nxt = toks[p + 1];
                if (!nxt || nxt.t !== 'unit') break;       // za operatorem liczba → to już arytmetyka
                p++;
                var a = unitAtom();
                if (!a) return null;
                acc = {
                    dim: dimCombine(acc.dim, a.dim, op.t === '/' ? -1 : 1),
                    cf: op.t === '/' ? acc.cf / a.cf : acc.cf * a.cf,
                };
            }
            return acc;
        }

        function primary() {
            if (at('(')) {
                p++;
                var v = expr();
                if (!at(')')) return fail();
                p++;
                return v;
            }
            if (at('num')) {
                var n = toks[p].v; p++;
                var u = at('unit') ? unitExpr() : null;
                if (at('unit')) return fail();            // jednostka, której nie złożyliśmy
                return u ? Q(n * u.cf, u.dim) : Q(n, {});
            }
            return fail();
        }
        function unary() {
            if (at('-')) { p++; var v = unary(); return Q(-v.n, v.dim); }
            if (at('+')) { p++; return unary(); }
            return primary();
        }
        function power() {
            var base = unary();
            if (at('^')) {
                p++;
                var e = power();
                if (!dimIsEmpty(e.dim)) return fail();     // wykładnik z jednostką = bez sensu
                if (!dimIsEmpty(base.dim) && !Number.isInteger(e.n)) return fail();
                return Q(Math.pow(base.n, e.n), dimScale(base.dim, e.n));
            }
            return base;
        }
        function term() {
            var v = power();
            for (;;) {
                if (at('*')) { p++; var r = power(); v = Q(v.n * r.n, dimCombine(v.dim, r.dim, 1)); continue; }
                if (at('/')) { p++; var d = power(); v = Q(v.n / d.n, dimCombine(v.dim, d.dim, -1)); continue; }
                /* sąsiedztwo bez operatora („1 dzień 3 h”) = suma w starym silniku, nie iloczyn */
                if (at('num') || at('(')) return fail();
                break;
            }
            return v;
        }
        function expr() {
            var v = term();
            for (;;) {
                if (at('+')) {
                    p++; var a = term();
                    if (!dimEq(v.dim, a.dim)) return fail();
                    v = Q(v.n + a.n, v.dim); continue;
                }
                if (at('-')) {
                    p++; var b = term();
                    if (!dimEq(v.dim, b.dim)) return fail();
                    v = Q(v.n - b.n, v.dim); continue;
                }
                break;
            }
            return v;
        }
        return {
            run: function () {
                var v = expr();
                if (failed || p !== toks.length) return null;
                return v;
            },
            unitExprOnly: function () {
                var u = unitExpr();
                if (!u || p !== toks.length) return null;
                return u;
            },
        };
    }

    /* ---------- API ---------- */

    /* raw → { value, unit, dim, dimKey, cat } | null
       opts: { unitDefs, unitDisplay, defaultUnits, qty } */
    function tryEvaluate(raw, options) {
        var opts = options || {};
        var unitDefs = opts.unitDefs || {};
        var unitDisplay = opts.unitDisplay || {};
        var defaultUnits = opts.defaultUnits || {};

        /* Waluty dostają WSPÓLNĄ oś wymiaru „C”, a kurs pełni rolę przelicznika na bazę
           (jak mm dla długości). Dzięki temu skracają się także KRZYŻOWO:
           „100 usd / 20 eur" = 4,59, a nie 18,14 zł. Kwot tym nie liczymy — wynik
           z niepustym wymiarem C nie ma symbolu w SI_DISPLAY, więc odpada i robotę
           przejmuje resolveCurrencyExpression (kursy, grosze, zaokrąglenia). */
        var curTokens = opts.currencyTokens || null;
        var curRate = opts.currencyRate || null;
        function unitLookup(token) {
            var key = String(token).toLowerCase();
            var def = unitDefs[key];
            if (def) {
                var cd = CAT_DIM[def.cat];
                if (cd) return { dim: cd.dim, cf: def.factor * cd.cf, cat: def.cat };
                return null;                               // custom:, temperatura → bail
            }
            if (curTokens && curTokens[key]) {
                var rate = curRate ? curRate(curTokens[key]) : 1;
                if (!(rate > 0) || !isFinite(rate)) return null;   // brak kursu → nie zgadujemy
                return { dim: { C: 1 }, cf: rate, cat: null };
            }
            return null;
        }

        var src = String(raw == null ? '' : raw).trim();
        if (!src) return null;

        /* jawna konwersja: „<wyrażenie> na <jednostka>” */
        var target = null, body = src;
        var conv = src.match(/^(.+?)\s+(?:na|do|in|to|w)\s+([^\s].*?)\s*$/i);
        if (conv) {
            var tToks = tokenize(conv[2], unitLookup);
            var tEval = tToks && makeEvaluator(tToks, unitLookup).unitExprOnly();
            if (tEval) { target = { dim: tEval.dim, cf: tEval.cf, label: conv[2].trim() }; body = conv[1]; }
        }

        var toks = tokenize(body, unitLookup);
        if (!toks) return null;
        var res = makeEvaluator(toks, unitLookup).run();
        if (!res || !isFinite(res.n)) return null;

        if (dimIsEmpty(res.dim)) {
            /* Iloraz tych samych jednostek jest BEZWYMIAROWY: „10 km / 2 km” = 5, nie „5 km”.
               Gołe liczby bez jednostek zostawiamy starej ścieżce. */
            if (!toks.sawUnit || target) return null;
            return { value: res.n, unit: null, dim: {}, dimKey: '', cat: null, dimensionless: true };
        }
        /* Sam odwrotny wymiar (1/km) to prawie zawsze „100 / 4 km” rozumiane jako
           (100/4) km, a nie 25 m⁻¹ — oddajemy staremu silnikowi. */
        var pos = Object.keys(res.dim).some(function (k) { return res.dim[k] > 0; });
        if (!pos) return null;

        /* Kwadrat czasu/masy/danych nie ma sensu użytkowego: „8h * 22 dni” to
           „8 h dziennie przez 22 dni” (176 h), a nie 5,47e10 s². Pole i objętość
           (L², L³) mają sens, więc długość jest wyjątkiem — reszta z dodatnim
           wykładnikiem ≥ 2 wraca do starego silnika. */
        var absurd = Object.keys(res.dim).some(function (k) {
            var e = res.dim[k];
            return k === 'L' ? e > 3 : e >= 2;
        });
        if (absurd) return null;

        if (target) {
            if (!dimEq(target.dim, res.dim)) return null;
            return {
                value: res.n / target.cf, unit: pretty(target.label), dim: res.dim,
                dimKey: dimKey(res.dim), cat: DIM_CAT[dimKey(res.dim)] || null, explicitConvert: true,
            };
        }
        return display(res, defaultUnits, unitDisplay, opts.qty);
    }

    /* „Czytelna” wartość = najwyżej 2 miejsca po przecinku (jak MATM0_QTY.isCleanDisplay),
       ale ODPORNA NA SZUM FLOAT: 60 km/h * 2 h wychodzi 120000000.00000001 mm i bez
       tolerancji drabinka nie awansowała z mm na km. */
    function isCleanDisplay(v) {
        var a = Math.abs(v);
        if (!isFinite(a)) return false;
        if (a === 0) return true;
        var r = Number(a.toPrecision(12));
        return Math.abs(r * 100 - Math.round(r * 100)) < 1e-6 * Math.max(1, r);
    }

    /* Drabinka jednostek kategorii, POSORTOWANA ROSNĄCO po współczynniku.
       MATM0_QTY._NICE_UNITS ma speed jako ['m/s','km/h'], a km/h ma MNIEJSZY
       współczynnik niż m/s — przy zachłannym awansie „10 m / 2 s” wychodziło
       „18 km/h” zamiast „5 m/s”. Tu sortujemy, więc awans działa jak trzeba. */
    /* „ar” (100 m²) zostaje jednostką wejścia i celem konwersji, ale nie awansujemy
       do niej automatycznie — „10 m * 10 m” ma pokazać 100 m², nie „1 ar”. */
    var LADDER_OVERRIDE = { area: ['mm2', 'cm2', 'm2', 'ha', 'km2'] };
    function ladderFor(cat, QTY) {
        var nice = LADDER_OVERRIDE[cat] ||
            (QTY && QTY._NICE_UNITS ? QTY._NICE_UNITS[cat] : null);
        if (!nice || !nice.length || !QTY.unitInfo) return null;
        return nice.map(function (u) {
            var info = QTY.unitInfo(u);
            return info ? { u: u, factor: info.factor } : null;
        }).filter(Boolean).sort(function (a, b) { return a.factor - b.factor; });
    }
    function pickFromLadder(cat, baseValue, QTY) {
        var ladder = ladderFor(cat, QTY);
        if (!ladder || !ladder.length) return null;
        var abs = Math.abs(baseValue);
        if (!(abs > 0)) return ladder[0];
        var best = ladder[0];
        for (var i = 0; i < ladder.length; i++) {
            var disp = abs / ladder[i].factor;
            if (disp < 1) break;                            // poniżej 1 nie awansujemy
            if (i > 0 && !isCleanDisplay(disp)) break;      // awans psułby czytelność
            best = ladder[i];
        }
        return best;
    }

    /* Dobór jednostki wyniku: kategoria (ładna drabinka) → inaczej złożony symbol SI. */
    function display(res, defaultUnits, unitDisplay, qtyApi) {
        var key = dimKey(res.dim);
        var cat = DIM_CAT[key];
        var QTY = qtyApi || (typeof window !== 'undefined' && window.MATM0_QTY) ||
            (typeof self !== 'undefined' && self.MATM0_QTY) || null;
        if (cat) {
            var cd = CAT_DIM[cat];
            var baseValue = res.n / cd.cf;                 // w jednostce bazowej kategorii
            var pick = defaultUnits[cat];
            var factor = null, unitKey = null;
            if (pick && pick !== '__auto__' && QTY && QTY.unitInfo) {
                var pi = QTY.unitInfo(String(pick).toLowerCase());
                if (pi && pi.dim === cat) { factor = pi.factor; unitKey = String(pick).toLowerCase(); }
            }
            if (factor == null) {
                var chosen = pickFromLadder(cat, baseValue, QTY);
                if (chosen) { factor = chosen.factor; unitKey = chosen.u; }
            }
            if (factor != null) {
                return {
                    value: baseValue / factor, unit: pretty(unitDisplay[unitKey] || unitKey),
                    dim: res.dim, dimKey: key, cat: cat,
                };
            }
            return { value: baseValue, unit: pretty(unitDisplay[cat] || cat), dim: res.dim, dimKey: key, cat: cat };
        }
        var comp = composeSymbol(res.dim);
        if (!comp) return null;
        return { value: res.n / comp.cf, unit: comp.sym, dim: res.dim, dimKey: key, cat: null };
    }

    /* Wymiar kategorii — potrzebny staremu pipeline'owi, żeby porównać „czy stara
       ścieżka trafiła w ten sam wymiar co algebra”. */
    function catDimKey(cat) {
        var cd = CAT_DIM[cat];
        return cd ? dimKey(cd.dim) : null;
    }

    var API = {
        tryEvaluate: tryEvaluate,
        catDimKey: catDimKey,
        dimKey: dimKey,
        dimIsSimple: dimIsSimple,
        _CAT_DIM: CAT_DIM,
    };

    if (typeof window !== 'undefined') window.MATM0_QALG = API;
    if (typeof self !== 'undefined') self.MATM0_QALG = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API; // testy w Node
})();
