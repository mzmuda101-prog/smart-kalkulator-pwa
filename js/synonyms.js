/* =============================================================================
   WARSTWA SYNONIMÓW — js/synonyms.js  (window.MATM0_SYN)
   -----------------------------------------------------------------------------
   PO CO TO JEST

   Audyt z 2026-09-20 postawił diagnozę: silnik rozumie JEDNO sformułowanie,
   a bliski wariant o tym samym znaczeniu już nie.

       działa                      nie działa (to samo znaczenie)
       ─────────────────────────   ──────────────────────────────────
       od 8:00 do 16:30            ile godzin od 8:00 do 16:30
       średnia z 2 4 6             średnia 2 4 6
       ile dni do 25.12            ile tygodni do 25.12
       19m + 47%                   20% z 5 km
       250 zł / 4                  podziel 250 zł na 4

   Dla użytkownika to nie wygląda jak brak funkcji, tylko jak losowa awaria —
   raz policzyło, raz nie. Wniosek audytu: „największa dźwignia jakościowa to
   warstwa synonimów, nie kolejne regexy".

   -----------------------------------------------------------------------------
   ZASADA NADRZĘDNA — TYLKO FALLBACK

   Ta warstwa NIE dokłada się do pipeline'u. Odpala się WYŁĄCZNIE wtedy, gdy
   normalny pipeline zwrócił pustkę. Sprawdzone na żywym silniku: wszystkie luki
   z audytu dają dziś ∅, a nie zły wynik — więc przepisanie nie ma jak zmienić
   żadnego istniejącego wyniku. Dryf baseline jest strukturalnie niemożliwy.

   To ten sam kontrakt, co przy algebrze wymiarowej (patrz
   docs/ENGINE-PREPROCESS-RULES.md): „wchodzi tylko tam, gdzie stara ścieżka
   milczała albo się myliła".

   -----------------------------------------------------------------------------
   DWA RODZAJE REGUŁ

   1. PRZEPISANIE — sformułowanie → forma kanoniczna, którą silnik już zna.
        „podziel 250 zł na 4"  →  „250 zł / 4"

   2. PRZEPISANIE + KONWERSJA — kiedy pytanie prosi o inną jednostkę niż ta,
      w której forma kanoniczna odpowiada. Liczymy formę kanoniczną, a potem
      jej WYNIK przepuszczamy przez konwersję, której silnik też już uczy:
        „ile tygodni do 25.12"  →  „ile dni do 25.12" (= 87 dni)
                                →  „87 dni w tygodniach" (= 12,43)
      Dzięki temu nie dublujemy logiki dat ani zegara — składamy dwie
      przetestowane zdolności zamiast pisać trzecią.

   -----------------------------------------------------------------------------
   DOPISYWANIE REGUŁ

   Dopisz wpis do RULES i przypadek do test/synonyms.js. Reguła MUSI:
     • mieć zakotwiczony wzorzec (^…$) — inaczej złapie fragment czegoś innego,
     • produkować formę, którą silnik naprawdę zna (test to zweryfikuje),
     • nie zgadywać: jak nie pasuje, ma milczeć i oddać sterowanie dalej.
   ============================================================================= */
(function () {
    'use strict';

    // Liczby: „2", „2,5", „2.5", „-3". Bez wykładników — te i tak idą starą ścieżką.
    var NUM = '-?\\d+(?:[.,]\\d+)?';

    /* Jednostki czasu, o które można zapytać „ile X…". Wartość = nazwa, którą
       rozumie konwerter silnika („87 dni w tygodniach"). */
    var TIME_UNIT_ASK = {
        'sekund': 'sekundach', 'sekundy': 'sekundach', 'sekundę': 'sekundach', 's': 'sekundach',
        'seconds': 'sekundach', 'second': 'sekundach',
        'minut': 'minutach', 'minuty': 'minutach', 'min': 'minutach',
        'minutes': 'minutach', 'minute': 'minutach',
        'godzin': 'godzinach', 'godziny': 'godzinach', 'godzinę': 'godzinach', 'h': 'godzinach',
        'hours': 'godzinach', 'hour': 'godzinach',
        'dni': 'dniach', 'dzień': 'dniach', 'days': 'dniach', 'day': 'dniach',
        'tygodni': 'tygodniach', 'tygodnie': 'tygodniach', 'tydzień': 'tygodniach',
        'weeks': 'tygodniach', 'week': 'tygodniach',
        'miesięcy': 'miesiącach', 'miesiące': 'miesiącach', 'miesiąc': 'miesiącach',
        'months': 'miesiącach', 'month': 'miesiącach',
        'lat': 'latach', 'lata': 'latach', 'rok': 'latach', 'roku': 'latach',
        'years': 'latach', 'year': 'latach'
    };
    var TIME_UNIT_RE = Object.keys(TIME_UNIT_ASK)
        .sort(function (a, b) { return b.length - a.length; }) // dłuższe najpierw
        .join('|');

    function askedUnit(word) {
        return TIME_UNIT_ASK[String(word || '').toLowerCase()] || null;
    }

    var RULES = [
        /* ── 1. Zakres zegarowy z pytajnikiem ──────────────────────────────────
           „ile godzin od 8:00 do 16:30", „how many hours from 8:00 to 16:30".
           Forma kanoniczna „od X do Y" zwraca wartość w MINUTACH (kind duration),
           więc przy pytaniu o inną jednostkę konwertujemy z „min". */
        {
            id: 'clock-range-ask',
            re: new RegExp(
                '^(?:ile|how\\s+many|how\\s+much)\\s+(' + TIME_UNIT_RE + '|czasu|to|long)\\s+' +
                '(?:jest\\s+|minęło\\s+|upłynęło\\s+)?' +
                '((?:od|from)\\s+.+?\\s+(?:do|to)\\s+.+)$', 'i'
            ),
            build: function (m) {
                var unit = askedUnit(m[1]);
                return {
                    expr: m[2],
                    // „ile czasu / ile to / how long" — bez konwersji, czytelny zapis
                    convertTo: unit,
                    fromUnit: 'min',
                };
            },
        },

        /* ── 2. Odliczanie do daty w innej jednostce ───────────────────────────
           „ile tygodni do 25.12" → „ile dni do 25.12" (87) → „87 dni w tygodniach".
           „ile dni…" zostawiamy nietknięte — to już działa i nie ma po co wchodzić. */
        {
            id: 'date-countdown-unit',
            re: new RegExp(
                '^(?:ile|how\\s+many)\\s+(' + TIME_UNIT_RE + ')\\s+' +
                '((?:do|od|to|from|until|till)\\s+.+)$', 'i'
            ),
            build: function (m) {
                var unit = askedUnit(m[1]);
                if (!unit || unit === 'dniach') return null; // „ile dni do…" — stara ścieżka
                return { expr: 'ile dni ' + m[2], convertTo: unit, fromUnit: 'dni' };
            },
        },

        /* ── 3. Procent Z WIELKOŚCI (nie z gołej liczby) ───────────────────────
           „20% z 5 km" → „5 km * 20%"  (mnożenie zachowuje jednostkę: 1 km).
           Gołe „20% z 5" ma własny router (evalPercentQuery) i tu nie dochodzi,
           bo pipeline zwraca wtedy wynik, a nie pustkę. */
        {
            id: 'percent-of-quantity',
            re: new RegExp('^(' + NUM + ')\\s*%\\s+(?:z|ze|of|from)\\s+(.+)$', 'i'),
            build: function (m) { return { expr: m[2] + ' * ' + m[1] + '%' }; },
        },

        /* ── 4. Dzielenie opisowe ──────────────────────────────────────────────
           „podziel 250 zł na 4", „250 zł na 4 osoby", „250 zł podzielić na 4",
           „split 250 by 4". Rzecz z życia: rachunek na kilka osób. */
        {
            id: 'divide-verbose-prefix',
            re: new RegExp('^(?:podziel|rozdziel|split|divide)\\s+(.+?)\\s+(?:na|by|between|among)\\s+(' + NUM + ')(?:\\s+(?:osoby|osób|os\\.|person|people|części))?$', 'i'),
            build: function (m) { return { expr: m[1] + ' / ' + m[2] }; },
        },
        {
            id: 'divide-verbose-infix',
            re: new RegExp('^(.+?)\\s+(?:podzielić|podzielone|podziel|dzielone)?\\s*(?:na|by)\\s+(' + NUM + ')\\s*(?:osoby|osób|os\\.|person|people|części|równe\\s+części)$', 'i'),
            build: function (m) { return { expr: m[1] + ' / ' + m[2] }; },
        },
        {
            id: 'divide-bill',
            re: new RegExp('^(?:rachunek|bill|kwota)\\s+(.+?)\\s+(?:na|by)\\s+(' + NUM + ')(?:\\s+(?:osoby|osób|os\\.|person|people))?$', 'i'),
            build: function (m) { return { expr: m[1] + ' / ' + m[2] }; },
        },

        {
            // Z czasownikiem, bez rzeczownika: „250 zł podzielić na 4".
            // Czasownik jest tu WYMAGANY — bez niego „250 zł na 4" byłoby zgadywaniem,
            // bo „na" to w tej apce także przyimek konwersji („2 kg na lb").
            id: 'divide-verbose-infix-verb',
            re: new RegExp('^(.+?)\\s+(?:podzieli\u0107|podzielone|podziel|dzielone|dziel)\\s+(?:na|by|przez)\\s+(' + NUM + ')$', 'i'),
            build: function (m) { return { expr: m[1] + ' / ' + m[2] }; },
        },

        /* ── 5. Agregacja bez „z" ──────────────────────────────────────────────
           „średnia 2 4 6" → „średnia z 2 4 6". Sam przyimek gubił całą komendę.
           Suma/min/max/mediana to NOWE funkcje, nie synonimy — nie ma ich tutaj. */
        {
            id: 'average-no-preposition',
            re: /^(?:średnia|srednia|average|avg|mean)\s+(?!(?:z|ze|of|from)\s)(.+)$/i,
            build: function (m) { return { expr: 'średnia z ' + m[1] }; },
        },
        {
            id: 'average-alias',
            re: /^(?:avg|mean)\s+(?:of|z|ze)\s+(.+)$/i,
            build: function (m) { return { expr: 'średnia z ' + m[1] }; },
        },
    ];

    /* Dopasowanie → lista kandydatów do policzenia (w kolejności reguł).
       Zwraca [] gdy nic nie pasuje — wołający idzie wtedy swoją drogą. */
    function candidates(raw) {
        var s = String(raw == null ? '' : raw).trim();
        var out = [];
        if (!s) return out;
        for (var i = 0; i < RULES.length; i++) {
            var rule = RULES[i];
            var m = s.match(rule.re);
            if (!m) continue;
            var built = null;
            try { built = rule.build(m); } catch (e) { built = null; }
            if (!built || !built.expr) continue;
            var expr = String(built.expr).trim();
            if (!expr || expr.toLowerCase() === s.toLowerCase()) continue; // bez pętli
            out.push({
                id: rule.id,
                expr: expr,
                convertTo: built.convertTo || null,
                fromUnit: built.fromUnit || null,
            });
        }
        return out;
    }

    var API = { RULES: RULES, candidates: candidates, TIME_UNIT_ASK: TIME_UNIT_ASK };
    if (typeof window !== 'undefined') window.MATM0_SYN = API;
    if (typeof self !== 'undefined') self.MATM0_SYN = API;
})();
