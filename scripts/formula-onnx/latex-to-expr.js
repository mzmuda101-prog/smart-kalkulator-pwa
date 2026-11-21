// @ts-check
// Prototyp: LaTeX z PP-FormulaNet → zapis parsera kalkulatora („lim n→∞ (2n+1)/(6n+5)”).
// Zwraca { expr } albo { error } — nigdy nie zgaduje po cichu.
'use strict';

const SKIP = new Set(['\\,', '\\;', '\\:', '\\!', '\\ ', '\\quad', '\\qquad', '\\displaystyle', '\\textstyle',
    '\\scriptstyle', '\\left', '\\right', '\\big', '\\Big', '\\bigg', '\\Bigg', '\\bigl', '\\bigr', '\\Bigl', '\\Bigr',
    '\\biggl', '\\biggr', '\\Biggl', '\\Biggr', '~', '\\limits', '\\nolimits']);
const WORD = { '\\infty': '∞', '\\to': '→', '\\rightarrow': '→', '\\longrightarrow': '→', '\\cdot': '*', '\\times': '*',
    '\\pi': 'pi', '\\{': '(', '\\}': ')', '\\lbrace': '(', '\\rbrace': ')', '\\lbrack': '(', '\\rbrack': ')',
    '\\cdots': null, '\\ldots': null };
const FUNCS = new Set(['sin', 'cos', 'tan', 'tg', 'cot', 'ctg', 'ln', 'log', 'exp', 'arcsin', 'arccos', 'arctan', 'arctg', 'sinh', 'cosh', 'tanh', 'lim']);

/** @param {string} s */
function tokenize(s) {
    const out = [];
    const re = /\\[a-zA-Z]+\*?|\\.|\s+|./g;
    let m;
    while ((m = re.exec(s))) if (!/^\s+$/.test(m[0])) out.push(m[0].length > 1 ? m[0].replace(/\*$/, '') : m[0]);
    return out;
}

/** @param {string} latex */
function latexToExpr(latex) {
    // znane potknięcia modelu: \\left, \\(, „sqrt” bez ukośnika
    const t = tokenize(latex.replace(/\\\\(?=left|right)/g, '\\').replace(/\\\\([()])/g, '$1')
        .replace(/(^|[^\\a-zA-Z])(sqrt|frac)(?![a-zA-Z])/g, '$1\\$2'));
    let i = 0;
    const peek = () => t[i];
    const fail = (/** @type {string} */ why) => { throw new Error(why); };

    // Jedna „cegiełka” jako argument: {…} albo pojedynczy znak/komenda.
    function arg() {
        while (SKIP.has(peek())) i++;
        if (peek() === '{') { i++; const s = seq('}'); i++; return s; }
        if (peek() === undefined) { if (t[i - 1] === '^') return ''; fail('brak argumentu'); }
        return atom();
    }
    // Tekst grupy liter, np. \operatorname*{l i m} → "lim"
    function name() {
        if (peek() !== '{') fail('zła nazwa');
        i++; let s = '';
        while (peek() !== '}' && peek() !== undefined) { const x = t[i++]; if (/^[a-zA-Z]$/.test(x)) s += x; else if (x !== '{' && x !== '}') fail('zła nazwa: ' + x); }
        i++; return s;
    }
    // bez nawiasu tylko jedna liczba albo jedna litera: 1/(2n), n^(2n)
    const wrap = (/** @type {string} */ s) => /^(\d+(\.\d+)?|[a-z]|∞)$/.test(s) ? s : '(' + s + ')';

    function limit() {
        while (SKIP.has(peek())) i++;
        if (peek() !== '_') fail('lim bez dolnego indeksu');
        i++;
        const sub = arg().replace(/\s+/g, '');
        const m = /^([a-z])→(-?(?:[\d.]+|∞))([+-])?$/.exec(sub);
        if (!m) fail('dziwny indeks granicy: ' + sub);
        return `lim ${m[1]}→${m[2]}${m[3] || ''} `;
    }

    function atom() {
        const x = t[i++];
        if (SKIP.has(x)) return '';
        if (x in WORD) { if (WORD[x] === null) fail('nieobsługiwane ' + x); return WORD[x]; }
        if (x === '{') { const s = seq('}'); i++; return s; }
        if (x === '^') { const a = arg(); return a ? '^' + wrap(a) : ''; }  // „^” na końcu odczytu — pomijamy
        if (x === '_') fail('indeks dolny poza lim/log');
        if (x === '\\frac' || x === '\\dfrac' || x === '\\tfrac') { const a = arg(), b = arg(); return wrap(a) + '/' + wrap(b); }
        if (x === '\\sqrt') {
            let n = '';
            if (peek() === '[') { i++; n = seq(']'); i++; }
            const a = '(' + arg() + ')';
            if (!n || n === '2') return 'sqrt' + a;
            if (n === '3') return '∛' + a;
            if (n === '4') return '∜' + a;
            return a + '^(1/' + n + ')';
        }
        if (x === '\\lim') return limit();
        if (x === '\\operatorname' || x === '\\mathrm' || x === '\\text') {
            if (peek() === '*') i++;
            const nm = name();
            if (nm === 'lim') return limit();
            if (FUNCS.has(nm)) return func(nm);
            if (/^[a-z]$/.test(nm)) return nm;
            fail('nieznana nazwa ' + nm);
        }
        if (x === '\\underset') { const sub = arg(); const what = arg(); if (what.trim() !== 'lim') fail('underset bez lim'); t.splice(i, 0, '_', '{', ...tokenize(sub), '}'); return limit(); }
        if (/^\\[a-zA-Z]+$/.test(x) && FUNCS.has(x.slice(1))) return func(x.slice(1));
        if (x.startsWith('\\')) fail('nieznana komenda ' + x);
        if (x === '[' ) return '(';
        if (x === ']') return ')';
        return x;
    }
    // \log_{2}( … ) → log_2( … ); \log{_{4}} też (taki zapis daje model)
    function func(/** @type {string} */ f) {
        while (SKIP.has(peek())) i++;
        if (f === 'log' && peek() === '{' && t[i + 1] === '_') { i += 2; const b = arg(); if (peek() !== '}') fail('log{_…}'); i++; return 'log_' + b; }
        if (f === 'log' && peek() === '_') { i++; return 'log_' + arg(); }
        return f;
    }
    function seq(/** @type {string} */ end) {
        let s = '';
        while (peek() !== undefined && peek() !== end) {
            const piece = atom();
            if (piece && /[a-zA-Z]$/.test(s) && /^[a-zA-Z∛∜]/.test(piece)) s += ' ';
            s += piece;
        }
        if (end && peek() !== end) fail('brak ' + end);
        return s;
    }
    try {
        let s = seq('').trim().replace(/[.,;^]+$/, '').trim();
        if (/\(\)|\(\s*$/.test(s)) fail('pusty nawias');
        let depth = 0;
        for (const c of s) { depth += c === '(' ? 1 : c === ')' ? -1 : 0; if (depth < 0) fail('nawiasy'); }
        if (depth) fail('nawiasy');
        return { expr: s };
    } catch (e) { return { error: /** @type {Error} */ (e).message }; }
}
module.exports = { latexToExpr };
