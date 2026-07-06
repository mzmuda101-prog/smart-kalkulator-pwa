/* ============================================================
   [EN] Matm0 Calc — czyste tablice danych (no-DOM, no-logic).
   Wydzielone z app.js dla porządku ("clean look"). Ładowane PRZED app.js;
   app.js czyta je przez window.MATM0_DATA (wzorzec jak MATM0_COMMAND_DEFINITIONS).
   Brak zależności od reszty aplikacji — bezpieczne do testów w izolacji.
   ============================================================ */
(function () {
    'use strict';

    // Jednostki konwersji: kategoria → { base, units: { nazwa → współczynnik do base } }.
    var UNIT_CATEGORIES = {
        length: { base: 'mm', units: {
            mm: 1, cm: 10, dm: 100, m: 1000, km: 1000000,
            'in': 25.4, inch: 25.4, inches: 25.4, cal: 25.4, cale: 25.4, cali: 25.4,
            ft: 304.8, feet: 304.8, foot: 304.8, stopa: 304.8, stopy: 304.8,
            yd: 914.4, yard: 914.4, yards: 914.4, jard: 914.4, jardy: 914.4,
            mila: 1609344, mile: 1609344, mil: 1609344,
        } },
        mass: { base: 'g', units: {
            mg: 0.001, g: 1, dag: 10, dkg: 10, deko: 10, kg: 1000,
            t: 1000000, tona: 1000000, tony: 1000000, ton: 1000000,
            lb: 453.59237, lbs: 453.59237, funt: 453.59237, funty: 453.59237, funtow: 453.59237,
            oz: 28.349523, uncja: 28.349523, uncje: 28.349523,
        } },
        time: { base: 's', units: {
            ms: 0.001, s: 1, sek: 1, sekunda: 1, sekundy: 1,
            min: 60, minuta: 60, minuty: 60,
            h: 3600, godz: 3600, godzina: 3600, godziny: 3600,
            doba: 86400, dzien: 86400, dni: 86400,
            tydzien: 604800, tyg: 604800, week: 604800,
            rok: 31557600, lata: 31557600, lat: 31557600, year: 31557600,
        } },
        volume: { base: 'ml', units: {
            ml: 1, cl: 10, dl: 100, l: 1000, litr: 1000, litry: 1000, litrow: 1000,
            hl: 100000, m3: 1000000,
            gal: 3785.411784, galon: 3785.411784, gallon: 3785.411784,
        } },
        data: { base: 'B', units: {
            // KB/MB/… traktowane binarnie (1024). Bity pominięte celowo —
            // flaga „i" w regexie nie odróżnia b od B.
            B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776, PB: 1125899906842624,
        } },
        area: { base: 'm2', units: {
            mm2: 0.000001, cm2: 0.0001, dm2: 0.01, m2: 1, ar: 100, ha: 10000, km2: 1000000,
        } },
        angle: { base: 'deg', units: {
            deg: 1, '°': 1, stopnie: 1, stopni: 1,
            rad: 180 / Math.PI, radian: 180 / Math.PI, radiany: 180 / Math.PI,
            grad: 0.9, gon: 0.9,
        } },
        // Prędkość = długość ÷ czas → jednostka „złożona". Skala liniowa (bez offsetu),
        // więc mieści się w modelu współczynników. Oś bazowa: m/s. Nazwy ze slashem
        // (km/h, m/s…) parser łapie jako JEDEN token dzięki sortowaniu „najdłuższe najpierw”.
        speed: { base: 'm/s', units: {
            'm/s': 1, mps: 1,
            'km/h': 1000 / 3600, 'km/godz': 1000 / 3600, kph: 1000 / 3600, kmh: 1000 / 3600,
            'km/s': 1000,
            'm/h': 1 / 3600, 'm/godz': 1 / 3600,
            'cm/s': 0.01, 'mm/s': 0.001,
            mph: 0.44704, 'mil/h': 0.44704,                       // mila/h
            'ft/s': 0.3048, 'stopa/s': 0.3048,                    // stopa/s
            kn: 1852 / 3600, kt: 1852 / 3600, kts: 1852 / 3600,   // węzeł = mila morska/h
            knot: 1852 / 3600, knots: 1852 / 3600,
            'węzeł': 1852 / 3600, 'węzły': 1852 / 3600, 'węzłów': 1852 / 3600,
            wezel: 1852 / 3600, wezly: 1852 / 3600, wezlow: 1852 / 3600,
        } },
    };

    // Polskie nazwy miesięcy (mianownik + dopełniacz, z/bez diakrytyków) → numer.
    var PL_MONTHS = {
        stycznia:1, styczen:1, 'styczeń':1, lutego:2, luty:2, marca:3, marzec:3,
        kwietnia:4, kwiecien:4, 'kwiecień':4, maja:5, maj:5, czerwca:6, czerwiec:6,
        lipca:7, lipiec:7, sierpnia:8, sierpien:8, 'sierpień':8,
        wrzesnia:9, 'września':9, wrzesien:9, 'wrzesień':9,
        pazdziernika:10, 'października':10, pazdziernik:10, 'październik':10,
        listopada:11, listopad:11, grudnia:12, grudzien:12, 'grudzień':12,
    };

    // Dni tygodnia wg Date.getDay() (0 = niedziela).
    var PL_WEEKDAYS = ['niedziela','poniedziałek','wtorek','środa','czwartek','piątek','sobota'];

    // Aliasy walut (token wpisany przez usera → kod ISO).
    var CUR_ALIAS = {
        'zł': 'PLN', 'zl': 'PLN', 'pln': 'PLN', 'złoty': 'PLN', 'złotych': 'PLN', 'zloty': 'PLN', 'zlotych': 'PLN',
        '€': 'EUR', 'euro': 'EUR', 'eur': 'EUR',
        '$': 'USD', 'usd': 'USD', 'dolar': 'USD', 'dolary': 'USD', 'dolarow': 'USD', 'dolarów': 'USD',
        '£': 'GBP', 'gbp': 'GBP',
        'chf': 'CHF', 'frank': 'CHF', 'franki': 'CHF',
    };

    /* ── PL_UNIT_GRAMMAR — odmiana jednostek słownych (polski) ─────────────────
       Wpis:
         forms: [1, 2–4, 5+] — trzy formy wg standardowej reguły PL
                  (1 stopa · 2 stopy · 5 stóp · 11 stóp · 22 stopy)
         parse: dodatkowe aliasy WEJŚCIA (dopełniacz itd.) — mergowane do UNIT_CATEGORIES
       Symbole (kg, km, mm, h…) NIE są tu — zostają bez odmiany.
       Współczynniki konwersji zostają w UNIT_CATEGORIES; tutaj TYLKO język. */
    var PL_UNIT_GRAMMAR = {
        stopa:   { forms: ['stopa', 'stopy', 'stóp'],   parse: ['stóp', 'stop', 'stope', 'stopę'] },
        cal:     { forms: ['cal', 'cale', 'cali'],       parse: ['cala', 'calu'] },
        mila:    { forms: ['mila', 'mile', 'mil'],       parse: ['mili'] },
        jard:    { forms: ['jard', 'jardy', 'jardów'],  parse: ['jardow'] },
        funt:    { forms: ['funt', 'funty', 'funtów'],   parse: ['funtow'] },
        uncja:   { forms: ['uncja', 'uncje', 'uncji'] },
        tona:    { forms: ['tona', 'tony', 'ton'],       parse: ['tonę'] },
        sekunda: { forms: ['sekunda', 'sekundy', 'sekund'] },
        minuta:  { forms: ['minuta', 'minuty', 'minut'] },
        godzina: { forms: ['godzina', 'godziny', 'godzin'] },
        doba:    { forms: ['doba', 'doby', 'dób'],       parse: ['dzień', 'dzien'] },
        tydzien: { forms: ['tydzień', 'tygodnie', 'tygodni'], parse: ['tygodnie', 'tygodni'] },
        rok:     { forms: ['rok', 'lata', 'lat'] },
        litr:    { forms: ['litr', 'litry', 'litrów'],   parse: ['litrow'] },
        galon:   { forms: ['galon', 'galony', 'galonów'] },
        stopien: { forms: ['stopień', 'stopnie', 'stopni'], parse: ['stopnia'] },
        radian:  { forms: ['radian', 'radiany', 'radianów'] },
        wezel:   { forms: ['węzeł', 'węzły', 'węzłów'] },
    };

    /* ── EN_UNIT_GRAMMAR — odmiana jednostek słownych (angielski) ──────────────
       Na razie mało wpisów (głównie nieregularne lm.). Struktura jak PL:
         forms: [1, 2+] — liczba pojedyncza / mnoga (1 foot · 5 feet)
         parse: dodatkowe aliasy WEJŚCIA — mergowane do UNIT_CATEGORIES
       Nie dodawaj tu symboli (ft, lb…) bez forms — chyba że parse ma je mapować na słowo.
       Unikaj kolizji z PL (np. „mile" jest formą PL „mila" — zostaje tylko w PL). */
    var EN_UNIT_GRAMMAR = {
        foot:   { forms: ['foot', 'feet'],     parse: ['ft'] },
        inch:   { forms: ['inch', 'inches'],    parse: ['in'] },
        yard:   { forms: ['yard', 'yards'] },
        pound:  { forms: ['pound', 'pounds'],  parse: ['lb', 'lbs'] },
        ounce:  { forms: ['ounce', 'ounces'],  parse: ['oz'] },
        gallon: { forms: ['gallon', 'gallons'], parse: ['gal'] },
        ton:    { forms: ['ton', 'tons'] },
        // przyszłość: stone, fluid ounce, … — ten sam wzorzec
    };

    // [EN] PL cardinal rule: 1 / 2–4 (bez 12–14) / reszta.
    function plPickUnitForm(value, forms) {
        if (!forms || !forms.length) return '';
        if (forms.length === 1) return forms[0];
        var abs = Math.abs(Number(value));
        if (!isFinite(abs)) return forms[forms.length - 1];
        var i = Math.floor(abs), frac = abs - i;
        var mod10 = i % 10, mod100 = i % 100;
        if (i === 1 && frac === 0) return forms[0];
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
        return forms[forms.length - 1];
    }

    // [EN] EN rule: 1 → singular, else plural (foot/feet, inch/inches).
    function enPickUnitForm(value, forms) {
        if (!forms || !forms.length) return '';
        var abs = Math.abs(Number(value));
        if (!isFinite(abs)) return forms[forms.length - 1];
        var i = Math.floor(abs), frac = abs - i;
        if (i === 1 && frac === 0) return forms[0];
        return forms.length > 1 ? forms[1] : forms[0];
    }

    function _grammarLookup(label, table) {
        if (label == null || label === '' || !table) return null;
        var low = String(label).toLowerCase();
        var key, g, i, f, p;
        for (key in table) {
            g = table[key];
            if (low === key) return g;
            if (g.forms) {
                for (i = 0; i < g.forms.length; i++) {
                    f = g.forms[i];
                    if (f && f.toLowerCase() === low) return g;
                }
            }
            if (g.parse) {
                for (i = 0; i < g.parse.length; i++) {
                    p = g.parse[i];
                    if (p && p.toLowerCase() === low) return g;
                }
            }
        }
        return null;
    }

    // Etykieta jednostki → poprawna forma po liczbie (PL lub EN, wg dopasowania etykiety).
    function inflectUnit(value, unitLabel) {
        var gEn = _grammarLookup(unitLabel, EN_UNIT_GRAMMAR);
        if (gEn && gEn.forms) return enPickUnitForm(value, gEn.forms);
        var gPl = _grammarLookup(unitLabel, PL_UNIT_GRAMMAR);
        if (gPl && gPl.forms) return plPickUnitForm(value, gPl.forms);
        return unitLabel;
    }
    function plInflectUnit(value, unitLabel) { return inflectUnit(value, unitLabel); } // [EN] backward compat

    // Aliasów parse dopisujemy do UNIT_CATEGORIES (ten sam współczynnik co kotwica).
    function _mergeUnitParseAliases(categories, grammar) {
        Object.keys(grammar).forEach(function (gkey) {
            var g = grammar[gkey];
            var names = [gkey].concat(g.forms || [], g.parse || []);
            var hit = null, anchor = null, cat, units, n, i;
            for (cat in categories) {
                units = categories[cat].units;
                for (i = 0; i < names.length; i++) {
                    n = names[i];
                    if (n && units[n] != null) { hit = units[n]; anchor = n; break; }
                }
                if (hit != null) break;
            }
            if (hit == null) return;
            for (cat in categories) {
                units = categories[cat].units;
                if (units[anchor] == null) continue;
                names.forEach(function (alias) {
                    if (alias && units[alias] == null) units[alias] = hit;
                });
                break;
            }
        });
    }
    _mergeUnitParseAliases(UNIT_CATEGORIES, PL_UNIT_GRAMMAR);
    _mergeUnitParseAliases(UNIT_CATEGORIES, EN_UNIT_GRAMMAR);

    var DATA = {
        UNIT_CATEGORIES: UNIT_CATEGORIES,
        PL_MONTHS: PL_MONTHS,
        PL_WEEKDAYS: PL_WEEKDAYS,
        CUR_ALIAS: CUR_ALIAS,
        PL_UNIT_GRAMMAR: PL_UNIT_GRAMMAR,
        EN_UNIT_GRAMMAR: EN_UNIT_GRAMMAR,
        plPickUnitForm: plPickUnitForm,
        enPickUnitForm: enPickUnitForm,
        inflectUnit: inflectUnit,
        plInflectUnit: plInflectUnit,
    };

    if (typeof window !== 'undefined') window.MATM0_DATA = DATA;
    if (typeof module !== 'undefined' && module.exports) module.exports = DATA; // testy w Node
})();
