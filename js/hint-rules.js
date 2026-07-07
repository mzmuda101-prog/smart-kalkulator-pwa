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

    function fuzzySuggest(expr) {
        var q = norm(expr).replace(/\s+/g, ' ').trim();
        if (q.length < 3) return null;
        var best = null, bestD = Infinity;
        KNOWN_COMMANDS.forEach(function (cmd) {
            var cn = norm(cmd);
            var d = levenshtein(q, cn);
            var limit = Math.max(2, Math.floor(cn.length * 0.4));
            if (d <= limit && d < bestD) { bestD = d; best = cmd; }
        });
        return best;
    }

    var API = {
        getLiveHints: getLiveHints,
        fuzzySuggest: fuzzySuggest,
        KNOWN_COMMANDS: KNOWN_COMMANDS,
        norm: norm,
        lastToken: lastToken
    };

    if (typeof window !== 'undefined') window.MATM0_HINT = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
