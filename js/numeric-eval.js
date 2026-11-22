// @ts-check
/* ============================================================
   [PL] Moduł numeryczny — BigInt, kompilacja wyrażeń (kalkulator + wykres).
   [EN] Numeric eval — BigInt path, compileExpression for calc + graph.
        Faza 3 ekstrakcji silnika; konsumowany przez app.js (MATM0_NUMERIC).
   ============================================================ */
(function () {
    'use strict';

    // Dokładne liczenie na DUŻYCH liczbach całkowitych (BigInt).
    function tryBigIntCalc(raw) {
        var s = String(raw == null ? '' : raw)
            .replace(/×/g, '*')
            .replace(/−/g, '-')
            .replace(/\s+/g, '');
        if (!s) return null;
        if (!/^[0-9+\-*^()]+$/.test(s)) return null; // brak kropki/przecinka, „/”, liter
        if (!/[0-9]/.test(s)) return null;
        var i = 0;
        function peek() { return s.charAt(i); }
        function parseExpr() {
            var v = parseTerm();
            while (peek() === '+' || peek() === '-') {
                var op = s.charAt(i++);
                var r = parseTerm();
                v = op === '+' ? v + r : v - r;
            }
            return v;
        }
        function parseTerm() {
            var v = parsePow();
            while (peek() === '*') { i++; v = v * parsePow(); }
            return v;
        }
        // [EN] Potęga w BigInt — bez tego „2^64" szło floatem i dawało
        // 18446744073709600000 zamiast 18446744073709551616 (a „2^64 + 1" to samo).
        // Prawostronnie łączna, jak w compileGraphExpression.
        function parsePow() {
            var base = parseFactor();
            if (peek() !== '^') return base;
            i++;
            var exp = parsePow();
            if (exp < 0n) throw new Error('neg-exp');       // ułamek → nie nasza działka
            if (exp > 8192n) throw new Error('exp-too-big'); // zapora przed zawieszeniem
            return base ** exp;
        }
        function parseFactor() {
            var c = peek();
            if (c === '+') { i++; return parseFactor(); }
            if (c === '-') { i++; return -parseFactor(); }
            if (c === '(') {
                i++;
                var v = parseExpr();
                if (peek() !== ')') throw new Error('paren');
                i++;
                return v;
            }
            var start = i;
            while (i < s.length && s.charAt(i) >= '0' && s.charAt(i) <= '9') i++;
            if (i === start) throw new Error('num');
            return BigInt(s.slice(start, i));
        }
        try {
            var result = parseExpr();
            if (i !== s.length) return null; // niedoparsowane resztki
            return result.toString();
        } catch (e) {
            return null;
        }
    }

    // Grupowanie tysięcy dla stringa liczby całkowitej (jak pl-PL: spacją niełamliwą).
    function groupBigIntStr(str) {
        var neg = str.charAt(0) === '-';
        var d = neg ? str.slice(1) : str;
        d = d.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
        return (neg ? '-' : '') + d;
    }

    function stripFunctionPrefix(raw) {
        return String(raw || '')
            .trim()
            .replace(/^f\s*\(\s*x\s*\)\s*=/i, '')
            .replace(/^y\s*=/i, '');
    }

    var _FN_NAMES = ['srednia', 'logb', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'sqrt', 'floor', 'round', 'suma', 'mean',
        'ceil', 'sin', 'cos', 'tan', 'cot', 'csc', 'abs', 'log', 'exp', 'sum', 'min', 'max', 'avg', 'ln'];
    function insertImplicitMultiplication(expr) {
        // [EN] nazwy funkcji chowamy przed regułą — inaczej „max(” = „ma·x·(”, „exp(” = „e·xp(”
        var saved = [];
        // sin^2(x): potęga przy nazwie zostaje z nazwą — inaczej „2(” dostałoby „*”
        expr = expr.replace(new RegExp('(?:' + _FN_NAMES.join('|') + ')(?:\\^\\d+(?:\\.\\d+)?)?(?=\\()', 'g'), function (f) {
            saved.push(f); return '\uE000' + String.fromCharCode(65 + saved.length - 1) + '\uE001';
        });
        var next = '(?=x|pi|e|\uE000|\\()';
        expr = expr.replace(new RegExp('(\\d|\\)|x|pi|e|\uE001)' + next, 'g'), function (m) {
            return m === '\uE001' ? m : m + '*';
        });
        expr = expr.replace(/(\))(?=(\d|x|pi|e|\uE000))/g, '$1*');
        return expr.replace(/\uE000([\s\S])\uE001/g, function (_, c) { return saved[c.charCodeAt(0) - 65]; });
    }

    function compileGraphExpression(raw) {
        var expr = stripFunctionPrefix(raw).toLowerCase();
        expr = expr.replace(/π/g, 'pi');
        expr = expr.replace(/(\d),(\d)/g, '$1.$2');
        expr = expr.replace(/\s+/g, '');
        // zapisy szkolne (klawiatura „Wzory”): tg/ctg/arctg, log_2(x), |x|, mod — przed mnożeniem domyślnym
        expr = expr.replace(/arc(sin|cos)/g, 'a$1').replace(/arc(?:tg|tan)/g, 'atan').replace(/ctg/g, 'cot').replace(/tg/g, 'tan')
            .replace(/log_?(\d+(?:\.\d+)?)\(/g, 'logb($1;').replace(/mod/g, '#');
        // shortcut: |x| od lewej, bez zagnieżdżania („||a|−|b||” nie zadziała) — wtedy abs(…)
        while (/\|[^|]+\|/.test(expr)) expr = expr.replace(/\|([^|]+)\|/, 'abs($1)');
        expr = insertImplicitMultiplication(expr);

        var allowedNames = {
            x: true,
            pi: true,
            e: true,
            sin: true,
            cos: true,
            tan: true,
            asin: true,
            acos: true,
            atan: true,
            sinh: true,
            cosh: true,
            tanh: true,
            cot: true,
            csc: true,
            sqrt: true,
            abs: true,
            log: true,
            ln: true,
            exp: true,
            floor: true,
            ceil: true,
            round: true,
            logb: true,
            sum: true, suma: true, min: true, max: true, avg: true, mean: true, srednia: true,
        };

        var names = expr.match(/[a-z]+/g) || [];
        for (var i = 0; i < names.length; i++) {
            if (!Object.prototype.hasOwnProperty.call(allowedNames, names[i])) {
                throw new Error('Nieznana nazwa: ' + names[i]);
            }
        }

        if (!/^[0-9a-z+\-*/^().;!#]+$/.test(expr)) {
            throw new Error('Użyj tylko liczb, x, nawiasów, operatorów i prostych funkcji.');
        }

        var tokens = tokenizeExpression(expr);
        var pos = 0;

        function tokenizeExpression(input) {
            var t = [];
            var idx = 0;
            while (idx < input.length) {
                var ch = input[idx];
                if (/\s/.test(ch)) {
                    idx++;
                    continue;
                }
                if (/[0-9.]/.test(ch)) {
                    var match = input.slice(idx).match(/^[0-9]*\.?[0-9]+/);
                    if (!match) throw new Error('Nieprawidłowa liczba w wyrażeniu.');
                    t.push({ type: 'number', value: parseFloat(match[0]) });
                    idx += match[0].length;
                    continue;
                }
                if (/[a-z]/.test(ch)) {
                    var match = input.slice(idx).match(/^[a-z]+/);
                    t.push({ type: 'name', value: match[0] });
                    idx += match[0].length;
                    continue;
                }
                if (ch === ';') { t.push({ type: 'sep', value: ch }); idx++; continue; } // [EN] separator argumentów
                if ('+-*/^()!#'.indexOf(ch) !== -1) {
                    t.push({ type: ch === '(' || ch === ')' ? 'paren' : 'operator', value: ch });
                    idx++;
                    continue;
                }
                throw new Error('Nieprawidłowy znak: ' + ch);
            }
            return t;
        }

        function peek() {
            return tokens[pos];
        }

        function consume() {
            return tokens[pos++];
        }

        function parseExpression() {
            var value = parseTerm();
            while (peek() && peek().type === 'operator' && (peek().value === '+' || peek().value === '-')) {
                var op = consume().value;
                var rhs = parseTerm();
                value = op === '+' ? value + rhs : value - rhs;
            }
            return value;
        }

        function parseTerm() {
            var value = parseFactor();
            while (peek() && peek().type === 'operator' && (peek().value === '*' || peek().value === '/' || peek().value === '#')) {
                var op = consume().value;
                var rhs = parseFactor();
                // # = mod: reszta matematyczna (−7 mod 3 = 2), jak na lekcji
                value = op === '*' ? value * rhs : op === '/' ? value / rhs : ((value % rhs) + rhs) % rhs;
            }
            return value;
        }

        function parseFactor() {
            var value = parseUnary();
            while (peek() && peek().type === 'operator' && peek().value === '^') {
                consume();
                var rhs = parseFactor();
                value = Math.pow(value, rhs);
            }
            return value;
        }

        function parseUnary() {
            if (peek() && peek().type === 'operator' && (peek().value === '+' || peek().value === '-')) {
                var op = consume().value;
                var value = parseUnary();
                return op === '-' ? -value : value;
            }
            var v = parsePrimary();
            while (peek() && peek().type === 'operator' && peek().value === '!') { consume(); v = factorial(v); }
            return v;
        }
        function factorial(n) {
            if (n < 0 || n !== Math.floor(n)) throw new Error('Silnia tylko z liczby naturalnej (0, 1, 2…).');
            var r = 1;
            for (var k = 2; k <= n && r !== Infinity; k++) r *= k;
            return r;
        }

        function parsePrimary() {
            var token = peek();
            if (!token) {
                throw new Error('Nieprawidłowe wyrażenie.');
            }
            if (token.type === 'number') {
                consume();
                return token.value;
            }
            if (token.type === 'name') {
                consume();
                if (token.value === 'x') {
                    return currentX;
                }
                if (token.value === 'pi') {
                    return Math.PI;
                }
                if (token.value === 'e') {
                    return Math.E;
                }
                // sin²x, sin^2(x): potęga przy nazwie funkcji dotyczy wyniku funkcji
                var power = null;
                if (peek() && peek().type === 'operator' && peek().value === '^') { consume(); power = parseUnary(); }
                if (peek() && peek().type === 'paren' && peek().value === '(') {
                    consume();
                    var args = [parseExpression()];
                    while (peek() && peek().type === 'sep') { consume(); args.push(parseExpression()); }
                    if (!peek() || peek().type !== 'paren' || peek().value !== ')') {
                        throw new Error('Brak nawiasu kończącego.');
                    }
                    consume();
                    var fv = evaluateFunction(token.value, args);
                    return power === null ? fv : Math.pow(fv, power);
                }
                throw new Error('Funkcja ' + token.value + ' wymaga nawiasów.');
            }
            if (token.type === 'paren' && token.value === '(') {
                consume();
                var value = parseExpression();
                if (!peek() || peek().type !== 'paren' || peek().value !== ')') {
                    throw new Error('Brak nawiasu kończącego.');
                }
                consume();
                return value;
            }
            throw new Error('Nieprawidłowe wyrażenie.');
        }

        function evaluateFunction(name, args) {
            var arg = args[0];
            switch (name) { // [EN] funkcje wieloargumentowe; reszta przyjmuje dokładnie jeden argument
                case 'sum': case 'suma': return args.reduce(function (a, b) { return a + b; }, 0);
                case 'avg': case 'mean': case 'srednia': return args.reduce(function (a, b) { return a + b; }, 0) / args.length;
                case 'min': return Math.min.apply(Math, args);
                case 'logb': // log_2(8) → logb(2;8)
                    if (args.length !== 2) throw new Error('Logarytm o podstawie: log_2(liczba).');
                    return Math.log(args[1]) / Math.log(args[0]);
                case 'max': return Math.max.apply(Math, args);
                case 'round':
                    if (args.length > 2) throw new Error('round przyjmuje liczbę i liczbę miejsc.');
                    if (args.length === 2) { var k = Math.pow(10, Math.round(args[1])); return Math.round(arg * k) / k; }
                    return Math.round(arg);
            }
            if (args.length !== 1) throw new Error('Funkcja ' + name + ' przyjmuje jeden argument.');
            switch (name) {
                case 'sin': return Math.sin(arg);
                case 'cos': return Math.cos(arg);
                case 'tan': return Math.tan(arg);
                case 'asin': return Math.asin(arg);
                case 'acos': return Math.acos(arg);
                case 'atan': return Math.atan(arg);
                case 'sinh': return Math.sinh(arg);
                case 'cosh': return Math.cosh(arg);
                case 'tanh': return Math.tanh(arg);
                case 'cot': return 1 / Math.tan(arg);
                case 'csc': return 1 / Math.sin(arg);
                case 'sqrt': return Math.sqrt(arg);
                case 'abs': return Math.abs(arg);
                case 'log': return Math.log10(arg);
                case 'ln': return Math.log(arg);
                case 'exp': return Math.exp(arg);
                case 'floor': return Math.floor(arg);
                case 'ceil': return Math.ceil(arg);
                case 'round': return Math.round(arg);
                default: throw new Error('Nieznana funkcja: ' + name);
            }
        }

        var currentX = 0;

        return function (x) {
            currentX = x;
            pos = 0;
            var result = parseExpression();
            if (pos < tokens.length) {
                throw new Error('Nieprawidłowe wyrażenie.');
            }
            return result;
        };
    }

    var API = {
        tryBigIntCalc: tryBigIntCalc,
        groupBigIntStr: groupBigIntStr,
        stripFunctionPrefix: stripFunctionPrefix,
        insertImplicitMultiplication: insertImplicitMultiplication,
        compileGraphExpression: compileGraphExpression,
        compileExpression: compileGraphExpression, // [EN] alias — jeden kompilator dla calc + graph
    };

    if (typeof window !== 'undefined') window.MATM0_NUMERIC = API;
    if (typeof self !== 'undefined') self.MATM0_NUMERIC = API;
})();
