/* ============================================================
   [PL] smart-parser — wydzielany silnik wyrażeń smart-kalkulatora.
   [EN] smart-parser — the smart-calculator expression engine, being
        extracted out of app.js (pkt 2 kierunku „typowanego silnika”,
        patrz project_kalkulator_unified_engine_direction).

   PIERWSZY NAJEMCA: podsilnik CZASU (prymityw `_TIME` + zegar).
   Samowystarczalny — zależy WYŁĄCZNIE od window.MATM0_DATA (tabela jednostek).
   Wystawia window.MATM0_PARSER. app.js konsumuje go jako cienkie wiązanie.
   Kolejne podsilniki (daty/waluty/jednostki) dochodzą tu ewolucyjnie.
   ============================================================ */
(function() {
    'use strict';
    var DATA = (typeof window !== 'undefined' && window.MATM0_DATA) || {};
    var UNIT_CATS = DATA.UNIT_CATEGORIES || {};

    function _nowMinutes() { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
    // Token zegara → minuty doby (0..1439) lub null. Akceptuje HH:MM oraz „teraz"/„now".
    function _parseClockToken(str) {
        var s = String(str).trim().toLowerCase();
        if (s === 'teraz' || s === 'now') return _nowMinutes();
        var m = s.match(/^(\d{1,2}):(\d{2})$/);
        if (!m) return null;
        var h = +m[1], mi = +m[2];
        if (h > 23 || mi > 59) return null;
        return h * 60 + mi;
    }

    // ── Wspólny PRYMITYW CZASU: JEDNO źródło prawdy dla zegara i jednostek.
    // Tabela = MATM0_DATA.UNIT_CATEGORIES.time (ta sama, z której app.js buduje CALC_UNITS) →
    // współczynniki NIE mogą się rozjechać (to był powód rozjazdu „300s"). Do PARSOWANIA TRWANIA
    // dokładamy aliasy ważne TYLKO w kontekście czasu (w konwerterze 'm'=metr, 'g'=gram, więc
    // osobno) + potoczne odmiany PL.
    var _TIME = (function() {
        var t = UNIT_CATS.time || { base: 's', units: { s: 1 } };
        var dur = Object.assign({}, t.units, {
            m: 60, g: 3600,
            godzin: 3600, godzine: 3600,
            minut: 60, minute: 60,
            sekund: 1, sekunde: 1
        });
        var names = Object.keys(dur).sort(function(a, b) { return b.length - a.length; }); // najdłuższe-najpierw
        var nameRe = names.map(function(n) { return n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|');
        // Napis trwania → SEKUNDY (lub null). „2h", „90 min", „300s", „1h30", „1:30", „1:30:20", „1h 5 min 30 s".
        function parseSeconds(str) {
            var s = String(str).trim().toLowerCase().replace(/\s+/g, ' ');
            if (!s) return null;
            var m;
            if ((m = s.match(/^(\d{1,3}):(\d{2})(?::(\d{2}))?$/))) {
                var mm = +m[2], ss = m[3] ? +m[3] : 0;
                if (mm > 59 || ss > 59) return null;
                return (+m[1]) * 3600 + mm * 60 + ss;
            }
            // „Nh M" — godziny + gołe minuty bez jednostki (np. „1h30", „2 godz 15")
            if ((m = s.match(/^(\d+)\s*(?:h|g|godz[a-ząćęłńóśźż]*)\s*(\d+)$/))) {
                return (+m[1]) * 3600 + (+m[2]) * 60;
            }
            var pair = '(\\d+(?:[.,]\\d+)?)\\s*(' + nameRe + ')';
            if (!new RegExp('^(?:' + pair + '\\s*)+$').test(s)) return null;
            var total = 0, re = new RegExp(pair, 'g'), x;
            while ((x = re.exec(s))) {
                var f = dur[x[2]];
                if (f == null) return null;
                total += parseFloat(x[1].replace(',', '.')) * f;
            }
            return total;
        }
        return { units: t.units, base: t.base, parseSeconds: parseSeconds };
    })();
    // Czas trwania → MINUTY (zegar liczy w minutach). Deleguje do wspólnego prymitywu.
    function _parseDuration(str) {
        var sec = _TIME.parseSeconds(str);
        return sec == null ? null : sec / 60;
    }
    function _fmtClock(mins) {
        mins = ((Math.round(mins) % 1440) + 1440) % 1440; // zawijanie przez północ
        var h = Math.floor(mins / 60), mi = mins % 60;
        return (h < 10 ? '0' : '') + h + ':' + (mi < 10 ? '0' : '') + mi;
    }
    function _fmtDuration(mins) {
        mins = Math.round(Math.abs(mins));
        var h = Math.floor(mins / 60), mi = mins % 60;
        if (h && mi) return h + ' h ' + mi + ' min';
        if (h) return h + ' h';
        return mi + ' min';
    }
    // Dokładny czas zegarowy z SEKUNDAMI (HH:MM:SS) — do pokazania, „z czego" zaokrąglono.
    function _fmtClockSec(mins) {
        var totalSec = ((Math.round(mins * 60) % 86400) + 86400) % 86400;
        var h = Math.floor(totalSec / 3600), mi = Math.floor((totalSec % 3600) / 60), s = totalSec % 60;
        var p = function(n) { return (n < 10 ? '0' : '') + n; };
        return p(h) + ':' + p(mi) + ':' + p(s);
    }
    // Czas zegarowy — „17:00 + 3h", „od 9:30 do 17:15", „teraz + 90 min", „17:00 - 9:30".
    // Zwraca kanoniczny fragment wyniku { text, value, kind, exact } albo null (nie-zegar).
    function evalClockExpression(raw) {
        var s = String(raw || '').trim();
        if (!s) return null;
        var low = s.toLowerCase();
        var m;
        // „od HH:MM do HH:MM" → czas trwania (z przeskokiem przez północ)
        if ((m = low.match(/^od\s+(.+?)\s+do\s+(.+)$/))) {
            var a = _parseClockToken(m[1]), b = _parseClockToken(m[2]);
            if (a != null && b != null) {
                var diff = b - a; if (diff < 0) diff += 1440;
                return { text: _fmtDuration(diff), value: diff, kind: 'duration', exact: true };
            }
            return null;
        }
        // „HH:MM - HH:MM" → różnica (oba muszą być zegarem) — przed regułą odejmowania trwania
        if ((m = low.match(/^(\d{1,2}:\d{2}|teraz|now)\s*-\s*(\d{1,2}:\d{2}|teraz|now)$/))) {
            var a2 = _parseClockToken(m[1]), b2 = _parseClockToken(m[2]);
            if (a2 != null && b2 != null) {
                var diff2 = a2 - b2; if (diff2 < 0) diff2 += 1440;
                return { text: _fmtDuration(diff2), value: diff2, kind: 'duration', exact: true };
            }
            return null;
        }
        // „HH:MM + <trwanie>" / „HH:MM - <trwanie>" → nowy czas zegarowy
        if ((m = low.match(/^(\d{1,2}:\d{2}|teraz|now)\s*([+\-])\s*(.+)$/))) {
            var base = _parseClockToken(m[1]);
            var dur = _parseDuration(m[3]);
            if (base != null && dur != null) {
                var res = base + (m[2] === '-' ? -dur : dur);
                // exact=false, gdy sekundy dały ułamek minuty → wyświetlany HH:MM jest zaokrąglony.
                // exactText = pełny HH:MM:SS „z czego" zaokrąglono (sygnał ≈, A2).
                var isExact = Number.isInteger(res);
                return { text: _fmtClock(res), value: null, kind: 'clock', exact: isExact,
                         exactText: isExact ? null : _fmtClockSec(res) };
            }
            return null;
        }
        // „teraz" / „now" samodzielnie → aktualny czas
        if (low === 'teraz' || low === 'now') return { text: _fmtClock(_nowMinutes()), value: null, kind: 'clock', exact: true };
        return null;
    }

    /* ============================================================
       [PL] Podsilnik DAT (drugi najemca smart-parsera). Samowystarczalny:
            zależy WYŁĄCZNIE od MATM0_DATA (PL_MONTHS, PL_WEEKDAYS).
            „za 3 tygodnie", „ile dni do 1.09", „dziś + 90 dni", „1.09 + 2 tyg".
       ============================================================ */
    var _PL_MONTHS = DATA.PL_MONTHS || {};
    var _PL_WEEKDAYS = DATA.PL_WEEKDAYS || [];

    function _today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
    function _validDMY(d, m, y) { return m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1 && y <= 9999; }
    function _fmtDate(d) {
        return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear() + ' (' + _PL_WEEKDAYS[d.getDay()] + ')';
    }
    function _fmtDays(n) { return n + ' ' + (Math.abs(n) === 1 ? 'dzień' : 'dni'); }
    function _isDateUnit(u) {
        // [a-ząćęłńóśźż] zamiast \w — \w nie obejmuje polskich liter (miesiące, miesięcy).
        return /^(dni|dnia|dzie[nń]|tydzie[nń]|tygodni[a-ząćęłńóśźż]*|tyg|miesi[a-ząćęłńóśźż]*|lat[a-ząćęłńóśźż]*|rok[a-ząćęłńóśźż]*|roku)$/i.test(u);
    }
    function _applyDateUnit(d, n, u, sign) {
        n = Math.round(n) * sign;
        u = u.toLowerCase();
        if (/^tyg|^tydzie/.test(u)) d.setDate(d.getDate() + n * 7);
        else if (/^miesi/.test(u)) d.setMonth(d.getMonth() + n);
        else if (/^(lat|rok|roku)/.test(u)) d.setFullYear(d.getFullYear() + n);
        else d.setDate(d.getDate() + n); // dni
    }
    // → { d: Date, hasYear: bool } albo null
    function _parseDateToken(str) {
        var s = String(str).trim().toLowerCase();
        if (/^dzi[sś]$|^dzisiaj$/.test(s)) return { d: _today(), hasYear: true };
        if (s === 'jutro')    { var j = _today(); j.setDate(j.getDate() + 1); return { d: j, hasYear: true }; }
        if (s === 'pojutrze') { var p = _today(); p.setDate(p.getDate() + 2); return { d: p, hasYear: true }; }
        if (s === 'wczoraj')  { var w = _today(); w.setDate(w.getDate() - 1); return { d: w, hasYear: true }; }
        var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); // ISO
        if (m) { var y = +m[1], mo = +m[2], da = +m[3]; if (_validDMY(da, mo, y)) return { d: new Date(y, mo - 1, da), hasYear: true }; return null; }
        m = s.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/); // DD.MM(.YYYY)
        if (m) {
            var d1 = +m[1], m1 = +m[2], y1 = m[3] ? +m[3] : _today().getFullYear();
            if (m[3] && m[3].length === 2) y1 += 2000;
            if (_validDMY(d1, m1, y1)) return { d: new Date(y1, m1 - 1, d1), hasYear: !!m[3] };
            return null;
        }
        m = s.match(/^(\d{1,2})\s+([a-ząćęłńóśźż]+)(?:\s+(\d{2,4}))?$/); // DD miesiąc [RRRR]
        if (m && _PL_MONTHS[m[2]]) {
            var d2 = +m[1], m2 = _PL_MONTHS[m[2]], y2 = m[3] ? +m[3] : _today().getFullYear();
            if (m[3] && m[3].length === 2) y2 += 2000;
            if (_validDMY(d2, m2, y2)) return { d: new Date(y2, m2 - 1, d2), hasYear: !!m[3] };
        }
        return null;
    }
    // PL dzień tygodnia (odmiany / bez diakrytyków) → indeks Date.getDay() (0=niedziela).
    var _WD = [
        { i: 0, re: /^niedziel/ },        // niedziela/niedzielę/niedziel
        { i: 1, re: /^poniedzia[łl]/ },   // poniedziałek/poniedziałku
        { i: 2, re: /^wtork?/ },          // wtorek/wtorku
        { i: 3, re: /^[śs]rod/ },         // środa/środę/sroda
        { i: 4, re: /^czwart/ },          // czwartek/czwartku
        { i: 5, re: /^pi[ąa]t/ },         // piątek/piatek
        { i: 6, re: /^sobot/ }            // sobota/sobotę
    ];
    function _parseWeekday(w) {
        w = String(w).toLowerCase();
        for (var i = 0; i < _WD.length; i++) if (_WD[i].re.test(w)) return _WD[i].i;
        return -1;
    }
    // Następne (sign +1) / poprzednie (sign −1) wystąpienie dnia tygodnia wd względem dziś (ściśle).
    function _weekdayDate(wd, sign) {
        var t = _today();
        var diff = sign > 0 ? ((wd - t.getDay() + 7) % 7) : ((t.getDay() - wd + 7) % 7);
        if (diff === 0) diff = 7; // „najbliższy <dziś-dzień>" = za tydzień
        t.setDate(t.getDate() + sign * diff);
        return t;
    }

    function evalDateExpression(raw) {
        var s = String(raw || '').trim();
        if (!s) return null;
        var low = s.toLowerCase();
        var m;
        // DNI TYGODNIA — „najbliższy/następny/przyszły <wd>" → następne wystąpienie;
        // „poprzedni/ostatni/miniony <wd>" → poprzednie. (PRZED matematyką dat.)
        if ((m = low.match(/^(?:najbli[żz]sz[ayąeę]|nast[eę]pn[ayąeę]|przysz[łl][ayąeę])\s+([a-ząćęłńóśźż]+)\s*$/))) {
            var wdN = _parseWeekday(m[1]);
            if (wdN >= 0) return { text: _fmtDate(_weekdayDate(wdN, 1)), value: null };
        }
        if ((m = low.match(/^(?:poprzedni[aą]?|ostatni[aą]?|minion[ayąeę])\s+([a-ząćęłńóśźż]+)\s*$/))) {
            var wdP = _parseWeekday(m[1]);
            if (wdP >= 0) return { text: _fmtDate(_weekdayDate(wdP, -1)), value: null };
        }
        // „jaki/który dzień [tygodnia] [jest|to|wypada] <data>" → data z nazwą dnia.
        if ((m = low.match(/^(?:jaki|kt[oó]ry)\s+(?:to\s+)?dzie[nń](?:\s+tygodnia)?\s+(?:jest\s+|to\s+|wypada\s+|b[eę]dzie\s+)?(.+)$/))) {
            var dWd = _parseDateToken(m[1].trim());
            if (dWd) return { text: _fmtDate(dWd.d), value: null };
        }
        // „ile dni od A do B"
        if ((m = low.match(/^ile\s+dni\s+od\s+(.+?)\s+do\s+(.+)$/))) {
            var a = _parseDateToken(m[1]), b = _parseDateToken(m[2]);
            if (a && b) { var n = Math.round((b.d - a.d) / 86400000); return { text: _fmtDays(n), value: n }; }
            return null;
        }
        // „ile dni do B" (z przeskokiem na przyszły rok, gdy bez roku i data minęła)
        if ((m = low.match(/^ile\s+dni\s+(?:do|zosta[łl]o\s+do|pozosta[łl]o\s+do)\s+(.+)$/))) {
            var b2 = _parseDateToken(m[1]);
            if (b2) {
                if (!b2.hasYear && b2.d < _today()) b2.d.setFullYear(b2.d.getFullYear() + 1);
                var n2 = Math.round((b2.d - _today()) / 86400000);
                return { text: _fmtDays(n2), value: n2 };
            }
            return null;
        }
        // „za N <jednostka>"
        if ((m = low.match(/^za\s+([\d.,]+)\s+([a-ząćęłńóśźż]+)\s*$/)) && _isDateUnit(m[2])) {
            var d3 = _today(); _applyDateUnit(d3, parseFloat(m[1].replace(',', '.')), m[2], 1);
            return { text: _fmtDate(d3), value: null };
        }
        // „N <jednostka> temu"
        if ((m = low.match(/^([\d.,]+)\s+([a-ząćęłńóśźż]+)\s+temu\s*$/)) && _isDateUnit(m[2])) {
            var d4 = _today(); _applyDateUnit(d4, parseFloat(m[1].replace(',', '.')), m[2], -1);
            return { text: _fmtDate(d4), value: null };
        }
        // „dziś / jutro / wczoraj / pojutrze" samodzielnie
        if ((m = low.match(/^(dzi[sś]|dzisiaj|jutro|pojutrze|wczoraj)\s*$/))) {
            var d6 = _parseDateToken(m[1]); if (d6) return { text: _fmtDate(d6.d), value: null };
        }
        // „<data> + N <jednostka>" / „<data> - N <jednostka>"
        if ((m = low.match(/^(.+?)\s*([+\-])\s*([\d.,]+)\s+([a-ząćęłńóśźż]+)\s*$/)) && _isDateUnit(m[4])) {
            var left = _parseDateToken(m[1]);
            if (left) {
                var d5 = left.d; _applyDateUnit(d5, parseFloat(m[3].replace(',', '.')), m[4], m[2] === '-' ? -1 : 1);
                return { text: _fmtDate(d5), value: null };
            }
        }
        return null;
    }

    /* ============================================================
       [PL] Podsilnik STREF CZASOWYCH — OFFLINE przez Intl.DateTimeFormat (z DST, bez sieci).
            „17:00 w Londynie na Tokio", „która godzina w Tokio".
       ============================================================ */
    // Klucze obejmują częste odmiany PL (miejscownik po „w": Warszawie; biernik po „na": Moskwę).
    var _TZ_CITY = {
        'warszawa': 'Europe/Warsaw', 'warszawie': 'Europe/Warsaw', 'warszawę': 'Europe/Warsaw', 'polska': 'Europe/Warsaw', 'polsce': 'Europe/Warsaw',
        'londyn': 'Europe/London', 'londynie': 'Europe/London', 'london': 'Europe/London',
        'paryż': 'Europe/Paris', 'paryz': 'Europe/Paris', 'paryżu': 'Europe/Paris', 'paryzu': 'Europe/Paris',
        'berlin': 'Europe/Berlin', 'berlinie': 'Europe/Berlin',
        'madryt': 'Europe/Madrid', 'madrycie': 'Europe/Madrid', 'rzym': 'Europe/Rome', 'rzymie': 'Europe/Rome',
        'moskwa': 'Europe/Moscow', 'moskwie': 'Europe/Moscow', 'moskwę': 'Europe/Moscow', 'moscow': 'Europe/Moscow',
        'kijów': 'Europe/Kiev', 'kijow': 'Europe/Kiev', 'kijowie': 'Europe/Kiev',
        'nowy jork': 'America/New_York', 'nowym jorku': 'America/New_York', 'new york': 'America/New_York', 'nyc': 'America/New_York',
        'los angeles': 'America/Los_Angeles', 'la': 'America/Los_Angeles', 'chicago': 'America/Chicago',
        'tokio': 'Asia/Tokyo', 'tokyo': 'Asia/Tokyo',
        'pekin': 'Asia/Shanghai', 'pekinie': 'Asia/Shanghai', 'szanghaj': 'Asia/Shanghai', 'szanghaju': 'Asia/Shanghai', 'shanghai': 'Asia/Shanghai',
        'sydney': 'Australia/Sydney', 'dubaj': 'Asia/Dubai', 'dubaju': 'Asia/Dubai', 'dubai': 'Asia/Dubai',
        'delhi': 'Asia/Kolkata', 'indie': 'Asia/Kolkata', 'indiach': 'Asia/Kolkata',
        'utc': 'UTC', 'gmt': 'UTC'
    };
    function _tzLookup(name) { return _TZ_CITY[String(name).trim().toLowerCase()] || null; }
    function _tzLabel(name) {
        return String(name).trim().split(/\s+/).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
    }
    // Offset strefy (minuty względem UTC) dla danego momentu — uwzględnia DST.
    function _tzOffsetMin(tz, date) {
        try {
            var dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23',
                year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
            var p = {}; dtf.formatToParts(date).forEach(function (x) { p[x.type] = x.value; });
            var asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +(p.second || 0));
            return Math.round((asUTC - date.getTime()) / 60000);
        } catch (e) { return null; }
    }
    function evalTimezoneExpression(raw) {
        var s = String(raw || '').trim(); if (!s) return null;
        var low = s.toLowerCase(); var m;
        // „HH:MM w <A> na/do <B>" — czas zegarowy w strefie A → strefa B.
        if ((m = low.match(/^(\d{1,2}:\d{2})\s+(?:w|we)\s+(.+?)\s+(?:na|do)\s+(.+?)\s*$/))) {
            var tzA = _tzLookup(m[2]), tzB = _tzLookup(m[3]);
            var baseMin = _parseClockToken(m[1]);
            if (tzA == null || tzB == null || baseMin == null) return null;
            var now = new Date();
            var offA = _tzOffsetMin(tzA, now), offB = _tzOffsetMin(tzB, now);
            if (offA == null || offB == null) return null;
            var resMin = baseMin + (offB - offA);
            return { text: _fmtClock(resMin) + ' (' + _tzLabel(m[3]) + ')', value: null, kind: 'clock', exact: true };
        }
        // „która [jest] godzina w <A>" / „czas w <A>" → aktualny czas w strefie A.
        if ((m = low.match(/^(?:kt[oó]ra\s+(?:jest\s+)?godzina|czas|godzina)\s+(?:w|we)\s+(.+?)\s*$/))) {
            var tz = _tzLookup(m[1]); if (tz == null) return null;
            var d = new Date();
            var off = _tzOffsetMin(tz, d); if (off == null) return null;
            var offLocal = -d.getTimezoneOffset();
            var rm = d.getHours() * 60 + d.getMinutes() + (off - offLocal);
            return { text: _fmtClock(rm) + ' (' + _tzLabel(m[1]) + ')', value: null, kind: 'clock', exact: true };
        }
        return null;
    }

    var API = {
        time: _TIME,                       // prymityw czasu (parseSeconds, units, base)
        parseDurationMinutes: _parseDuration,
        evalClockExpression: evalClockExpression,
        evalDateExpression: evalDateExpression,
        evalTimezoneExpression: evalTimezoneExpression,
        isDateUnit: _isDateUnit            // app.js używa go też w rozpoznawaniu tokenów notatnika
    };
    if (typeof window !== 'undefined') window.MATM0_PARSER = API;
    if (typeof self !== 'undefined') self.MATM0_PARSER = API;
})();
