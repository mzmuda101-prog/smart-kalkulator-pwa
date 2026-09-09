/* ============================================================
   [EN] Live hint rules + known commands for Standard calculator (T4-17, T4-19).
   No DOM — safe for Node tests via window.MATM0_HINT.
   ============================================================ */
(function () {
    'use strict';

    function norm(s) { // [EN] lowercase + strip diacritics for fuzzy match
        return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function lastToken(raw) {
        var m = String(raw || '').trim().match(/([^\s]+)\s*$/);
        return m ? m[1] : '';
    }

    function chip(label, insert) { return { label: label, insert: insert }; }

    // Kontekstowe podpowiedzi (T4-17) — chipy doklejają fragment do bieżącego wyrażenia.
    var LIVE_RULES = [
        {
            test: function (n) { return /\bdzis\b$/.test(n) || n === 'today' || /\btoday$/.test(n); },
            chips: function () {
                return [chip('+ 90 dni', ' + 90 dni'), chip('- 2 dni', ' - 2 dni'), chip('+ 20h', ' + 20h'), chip('za 3 tygodnie', ' za 3 tygodnie')];
            }
        },
        {
            test: function (n) { return /\b(teraz|czas|time)\b$/.test(n) || n === 'time'; },
            chips: function () {
                return [chip('- 2 dni', ' - 2 dni'), chip('+ 90 min', ' + 90 min'), chip('w Tokio', ' w Tokio'), chip('in Kyoto', ' in Kyoto')];
            }
        },
        {
            test: function (n) { return /\bile dni\b/.test(n); },
            chips: function () {
                return [chip('do 1.09', ' do 1.09'), chip('od 1.01 do 1.02', ' od 1.01 do 1.02')];
            }
        },
        {
            test: function (n) { return /\b\d+\s*kg\b/.test(n) || /\bkg\b$/.test(n); },
            chips: function () {
                return [chip('+ 300 g', ' + 300 g'), chip('na lb', ' na lb'), chip('* 12', ' * 12')];
            }
        },
        {
            test: function (n) { return /\b\d+\s*(zl|pln)\b/.test(n) || /\b(zl|pln)\b$/.test(n); },
            chips: function () {
                return [chip('+ 20 eur', ' + 20 eur'), chip('na usd', ' na usd'), chip('+ 23% vat', ' + 23% vat')];
            }
        },
        {
            test: function (n) { return /\b\d{1,2}:\d{2}\b/.test(n); },
            chips: function () {
                return [chip('+ 3h', ' + 3h'), chip('w Londynie na Tokio', ' w Londynie na Tokio')];
            }
        },
        {
            test: function (n) { return /\b\d+\s*(eur|usd|gbp)\b/.test(n); },
            chips: function () {
                return [chip('na zł', ' na zł'), chip('+ 10%', ' + 10%')];
            }
        },
        {
            test: function (n) { return /\b\d+\s*(km|m)\b/.test(n) && !/\bna\b/.test(n); },
            chips: function () {
                return [chip('+ 300 m', ' + 300 m'), chip('na ft', ' na ft')];
            }
        }
    ];

    // Znane komendy do autocomplete (T4-16) i fuzzy (T4-19).
    var KNOWN_COMMANDS = [
        'dziś + 90 dni', 'dziś - 2 dni', 'za 3 tygodnie', 'ile dni do 1.09',
        'od 9:30 do 17:15', '17:00 + 3h', '17:00 w Londynie na Tokio',
        'czas w Tokio', 'time in Tokyo', 'time in Kyoto', 'która godzina w Tokio',
        'teraz w Tokio', 'teraz NYC', 'now in London', 'teraz Kyoto',
        '2 kg + 300 g', '5 km + 300 m', '100 zł + 20 eur', '20 eur na zł',
        '100 usd', 'sqrt(144)', 'pierwiastek z 144', '2^10', '20% z 150',
        'brutto 1000', 'netto 1230', 'sin(30 deg)', '2 in na px przy 96 ppi',
        '108m+900m', 'ans*2', '2+2', 'pi', 'e'
    ];

    function getLiveHints(expr) {
        var raw = String(expr || '').trim();
        if (!raw) return [];
        var n = norm(raw);
        for (var i = 0; i < LIVE_RULES.length; i++) {
            if (LIVE_RULES[i].test(n, raw)) return LIVE_RULES[i].chips(raw) || [];
        }
        return [];
    }

    function levenshtein(a, b) {
        if (a === b) return 0;
        if (!a.length) return b.length;
        if (!b.length) return a.length;
        var row = [], i, j;
        for (j = 0; j <= b.length; j++) row[j] = j;
        for (i = 1; i <= a.length; i++) {
            var prev = i - 1; row[0] = i;
            for (j = 1; j <= b.length; j++) {
                var tmp = row[j];
                row[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[j], row[j - 1]);
                prev = tmp;
            }
        }
        return row[b.length];
    }

    // [EN] Numeric literal = integer/decimal (comma or dot). Time "17:00" yields two
    // literals ("17","00") around the ':', which is exactly what we want for skeletons.
    var NUM_RE = /\d+(?:[.,]\d+)?/g;

    function extractNumbers(s) {
        var m = String(s == null ? '' : s).match(NUM_RE);
        return m ? m.slice() : [];
    }

    // [EN] Numeric-agnostic SHAPE of an expression: every number → '#'. This is the fix
    // for the "dumb" fuzzy: matching on raw characters made "100 + 23" (# + #) look close
    // to "17:00 + 3h" (#:# + #h). On skeletons those shapes are clearly different, so
    // only genuine near-misses (typos of a known command) survive.
    function skeleton(s) {
        return norm(s).replace(NUM_RE, '#').replace(/\s+/g, ' ').trim();
    }

    // [EN] Rebuild a template using the USER's typed numbers (in order), so a suggestion
    // never shows foreign operands. "2 kg + 300" against template "2 kg + 300 g" keeps the
    // user's 2 and 300 and only adds the useful " g".
    function fillNumbers(template, nums) {
        var i = 0;
        return template.replace(NUM_RE, function (orig) {
            return i < nums.length ? nums[i++] : orig;
        });
    }

    // [EN] SEED FOR "Warstwa B" (local intent layer). Today: skeleton match against
    // KNOWN_COMMANDS with number-preserving substitution + a confidence score. B extends
    // this by (a) growing KNOWN_COMMANDS into an intent table with synonyms/aliases and
    // flexible token order, (b) reordering via tokens, (c) mapping the matched intent onto
    // an existing parser command. Keep the { command, confidence, numbers, kind } shape.
    function matchIntent(expr) {
        var raw = String(expr == null ? '' : expr);
        var qSkel = skeleton(raw);
        var q = norm(raw).replace(/\s+/g, ' ').trim();
        if (q.length < 3 || !qSkel) return null;
        var qNums = extractNumbers(raw);
        var best = null, bestD = Infinity, bestLimit = 0;
        KNOWN_COMMANDS.forEach(function (cmd) {
            var cSkel = skeleton(cmd);
            var d = levenshtein(qSkel, cSkel);
            // [EN] Tolerance scales with skeleton length (typo-level), capped so long
            // templates can't quietly over-match a short query.
            var limit = Math.min(4, Math.max(1, Math.floor(cSkel.length * 0.25)));
            if (d <= limit && d < bestD) { bestD = d; best = cmd; bestLimit = limit; }
        });
        if (!best) return null;
        var cNums = extractNumbers(best);
        var out;
        if (cNums.length === 0) {
            out = best; // pure typo/word correction, e.g. "czas w tokjo" → "czas w Tokio"
        } else if (cNums.length === qNums.length) {
            out = fillNumbers(best, qNums); // keep the user's numbers, never the template's
        } else {
            return null; // different count of numbers → would show foreign operands → refuse
        }
        // [EN] Never suggest the exact string the user already typed.
        if (norm(out).replace(/\s+/g, ' ').trim() === q) return null;
        var confidence = 1 - bestD / (bestLimit + 1);
        return { command: out, confidence: confidence, numbers: qNums, kind: cNums.length ? 'template' : 'typo' };
    }

    function fuzzySuggest(expr) {
        var m = matchIntent(expr);
        return m ? m.command : null;
    }

    // [EN] ── Warstwa B / przyrost B3: normalizacja swobodnego zdania → kandydat wyrażenia.
    // Filler-frazy, które OPAKOWUJĄ prawdziwe wyrażenie ("ile to 5 plus 5", "how much is 5+5").
    var LEAD_FILLER = /^[\s:,.]*(?:ile\s+to\s+jest|ile\s+to|ile\s+wynosi|ile\s+jest|ile\s+b[eę]dzie|ile\s+bedzie|oblicz|policz|wylicz|how\s+much\s+is|what(?:'?s|\s+is)|whats|calculate|compute)\b[\s:,.]*/i;
    var TAIL_FILLER = /[\s:,.]*(?:=|\?|r[oó]wna\s+si[eę]|rowna\s+sie)\s*$/i;

    // [EN] Operatory-słowa → symbole. Wielowyrazowe najpierw. Stosowane WYŁĄCZNIE do kandydata
    // fallbacku (nigdy do głównej ścieżki liczenia), a kandydat jest pokazywany jako PODGLĄD
    // przed użyciem — więc nawet agresywne mapowanie nie da cichej złej odpowiedzi.
    // [EN] Uwaga: JS `\b` jest ASCII-only → granica PO polskiej literze (np. „ć" w „dodać")
    // nie zadziała. Dlatego koniec słowa gwarantujemy lookaheadem obejmującym pl-litery
    // (bez lookbehind — starsze Safari na iPadzie go nie ma).
    var _END = '(?![a-z0-9ąćęłńóśźż])';
    var WORD_OPS = [
        { re: new RegExp('\\b(?:podzielone\\s+przez|podzieli[cć]\\s+przez|divided\\s+by)' + _END, 'gi'), op: ' / ' },
        { re: new RegExp('\\b(?:pomno[zż]y[cć]\\s+przez|pomno[zż]one\\s+przez|multiplied\\s+by)' + _END, 'gi'), op: ' * ' },
        { re: new RegExp('\\b(?:razy|times)' + _END, 'gi'), op: ' * ' },
        { re: new RegExp('\\bprzez' + _END, 'gi'), op: ' / ' },
        { re: new RegExp('\\b(?:plus|doda[cć])' + _END, 'gi'), op: ' + ' },
        { re: new RegExp('\\b(?:minus|odj[aą][cć])' + _END, 'gi'), op: ' - ' }
    ];

    function normalizeIntent(raw) {
        var s = String(raw == null ? '' : raw);
        var before = s.trim();
        s = s.replace(LEAD_FILLER, '').replace(TAIL_FILLER, '');
        for (var i = 0; i < WORD_OPS.length; i++) s = s.replace(WORD_OPS[i].re, WORD_OPS[i].op);
        // [EN] Uspójnij odstępy wokół operatorów, żeby żywy ewaluator dostał czyste wyrażenie.
        s = s.replace(/\s*([+\-*/])\s*/g, ' $1 ').replace(/\s+/g, ' ').trim();
        if (!s || s === before) return null; // nic nie zmieniliśmy → nie ma czego podpowiadać
        return s;
    }

    var API = {
        getLiveHints: getLiveHints,
        fuzzySuggest: fuzzySuggest,
        matchIntent: matchIntent,
        normalizeIntent: normalizeIntent,
        skeleton: skeleton,
        extractNumbers: extractNumbers,
        KNOWN_COMMANDS: KNOWN_COMMANDS,
        norm: norm,
        lastToken: lastToken
    };

    if (typeof window !== 'undefined') window.MATM0_HINT = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
