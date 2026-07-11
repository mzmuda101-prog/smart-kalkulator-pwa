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
        if (!/^[0-9+\-*()]+$/.test(s)) return null; // brak kropki/przecinka, „/”, liter
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
            var v = parseFactor();
            while (peek() === '*') { i++; v = v * parseFactor(); }
            return v;
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

    function insertImplicitMultiplication(expr) {
        var names = '(x|pi|e|sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|cot|csc|sqrt|abs|log|ln|exp|floor|ceil|round)';
        expr = expr.replace(new RegExp('(\\d|\\)|x|pi|e)(?=' + names + '|\\()', 'g'), '$1*');
        expr = expr.replace(new RegExp('(\\))(?=(\\d|' + names + '))', 'g'), '$1*');
        return expr;
    }

    function compileGraphExpression(raw) {
        var expr = stripFunctionPrefix(raw).toLowerCase();
        expr = expr.replace(/π/g, 'pi');
        expr = expr.replace(/(\d),(\d)/g, '$1.$2');
        expr = expr.replace(/\s+/g, '');
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
        };

        var names = expr.match(/[a-z]+/g) || [];
        for (var i = 0; i < names.length; i++) {
            if (!Object.prototype.hasOwnProperty.call(allowedNames, names[i])) {
                throw new Error('Nieznana nazwa: ' + names[i]);
            }
        }

        if (!/^[0-9a-z+\-*/^().]+$/.test(expr)) {
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
                if ('+-*/^()'.indexOf(ch) !== -1) {
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
            while (peek() && peek().type === 'operator' && (peek().value === '*' || peek().value === '/')) {
                var op = consume().value;
                var rhs = parseFactor();
                value = op === '*' ? value * rhs : value / rhs;
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
            return parsePrimary();
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
                if (peek() && peek().type === 'paren' && peek().value === '(') {
                    consume();
                    var arg = parseExpression();
                    if (!peek() || peek().type !== 'paren' || peek().value !== ')') {
                        throw new Error('Brak nawiasu kończącego.');
                    }
                    consume();
                    return evaluateFunction(token.value, arg);
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

        function evaluateFunction(name, arg) {
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
