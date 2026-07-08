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
    var CUR_ALIAS = DATA.CUR_ALIAS || {};
    var CUR_DISPLAY_SYM = DATA.CUR_DISPLAY_SYM || {};
    // [EN] Build flat unit registry from category tables (shared by app.js + parser tenants).
    function buildUnitRegistry(unitCategories) {
        var cats = unitCategories || {};
        var units = {};
        var display = {};
        Object.keys(cats).forEach(function(cat) {
            var def = cats[cat];
            if (!def || !def.units) return;
            Object.keys(def.units).forEach(function(u) {
                var key = String(u).toLowerCase();
                units[key] = { cat: cat, factor: def.units[u], base: def.base };
                if (!display[key]) display[key] = u;
            });
        });
        return { categories: cats, units: units, display: display };
    }
    function _currencyTokenMap(fxRates) {
        var map = {};
        Object.keys(CUR_ALIAS).forEach(function(k) { map[k] = CUR_ALIAS[k]; });
        var rates = fxRates || {};
        Object.keys(rates).forEach(function(code) { map[code.toLowerCase()] = code; });
        return map;
    }
    function _currencyTokenRe(map) {
        return Object.keys(map || {})
            .sort(function(a, b) { return b.length - a.length; })
            .map(function(t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); })
            .join('|');
    }
    function _currencyRate(code, fxRates) {
        if (code === 'PLN') return 1;
        var rates = fxRates || {};
        return rates[code] != null ? rates[code] : null; // [EN] PLN for 1 unit
    }
    function _currencyDisplay(code, options) {
        if (!code) return code;
        if (code === 'PLN') return 'zł';
        var compact = !(options && options.currencyCompactSymbols === false);
        if (compact && CUR_DISPLAY_SYM[code]) return CUR_DISPLAY_SYM[code];
        return code;
    }
    function _needsFxTable(code) { return code && code !== 'PLN'; } // [EN] PLN always equals 1
    function hasCurrencyInInput(raw, options) {
        var opts = options || {};
        var map = _currencyTokenMap(opts.fxRates || {});
        var tokenRe = _currencyTokenRe(map);
        if (!tokenRe) return false;
        var re = new RegExp('([\\d.,]+)\\s*(' + tokenRe + ')(?![a-ząćęłńóśźż0-9])', 'i');
        return re.test(String(raw || ''));
    }
    function resolveCurrencyExpression(raw, options) {
        var opts = options || {};
        var fxRates = opts.fxRates || {};
        var fxReady = !!opts.fxReady;
        var defaultCurrency = opts.defaultCurrency || 'PLN';
        var map = _currencyTokenMap(fxRates);
        var tokenRe = _currencyTokenRe(map);
        if (!tokenRe) return { expr: raw, unit: null, hasCurrency: false, pending: false };

        // [EN] Conversion form: "EXPR to <currency>".
        var convRe = new RegExp('^(.+?)\\s+(?:na|do|in|to|w)\\s+(' + tokenRe + ')(?![a-ząćęłńóśźż0-9])\\s*$', 'i');
        var cm = String(raw || '').match(convRe);
        if (cm) {
            var targetCode = map[cm[2].toLowerCase()];
            var inner = resolveCurrencyExpression(cm[1].trim(), opts);
            if (inner.hasCurrency) {
                var tRate = _currencyRate(targetCode, fxRates);
                if (inner.pending || tRate == null || (_needsFxTable(targetCode) && !fxReady)) {
                    return { expr: raw, unit: null, hasCurrency: true, pending: true };
                }
                var converted = inner.valueInBase / tRate;
                return { expr: String(converted), unit: _currencyDisplay(targetCode, opts), valueInBase: inner.valueInBase, hasCurrency: true, pending: false };
            }
        }

        // [EN] Currency amounts become values in first encountered working currency.
        var totalPln = 0, hasCurrency = false, pending = false, workRate = null, workCode = null;
        var amountRe = new RegExp('([\\d.,]+)\\s*(' + tokenRe + ')(?![a-ząćęłńóśźż0-9])', 'gi');
        var revAmountRe = new RegExp('\\b(' + tokenRe + ')\\s*([\\d.,]+)(?![a-ząćęłńóśźż0-9])', 'gi');
        var expr = String(raw || '').replace(amountRe, function(m, num, tok) {
            hasCurrency = true;
            var code = map[tok.toLowerCase()];
            var rate = _currencyRate(code, fxRates);
            if (rate == null || (_needsFxTable(code) && !fxReady)) { pending = true; return m; }
            if (workRate == null) { workRate = rate; workCode = code; }
            var n = parseFloat(String(num).replace(',', '.'));
            totalPln += n * rate;
            return String(n * rate / workRate);
        });
        expr = expr.replace(revAmountRe, function(m, tok, num) {
            hasCurrency = true;
            var code = map[tok.toLowerCase()];
            var rate = _currencyRate(code, fxRates);
            if (rate == null || (_needsFxTable(code) && !fxReady)) { pending = true; return m; }
            if (workRate == null) { workRate = rate; workCode = code; }
            var n = parseFloat(String(num).replace(',', '.'));
            totalPln += n * rate;
            return String(n * rate / workRate);
        });
        if (!hasCurrency) return { expr: raw, unit: null, hasCurrency: false, pending: false };
        if (pending) return { expr: raw, unit: null, hasCurrency: true, pending: true };

        var defRate = _currencyRate(defaultCurrency, fxRates);
        if (defRate == null) return { expr: raw, unit: null, hasCurrency: true, pending: true };
        return {
            expr: expr,
            unit: _currencyDisplay(defaultCurrency, opts),
            valueInBase: totalPln,
            hasCurrency: true,
            pending: false,
            curMul: workRate / defRate,
            workCode: workCode
        };
    }
    function resolveUnitsExpression(raw, options) {
        var opts = options || {};
        var unitDefs = opts.unitDefs || {};
        var unitDisplay = opts.unitDisplay || {};
        var defaultUnits = opts.defaultUnits || {};
        var firstUnitWins = !!opts.firstUnitWins;
        var unitNamesRe = opts.unitNamesRe || Object.keys(unitDefs)
            .sort(function(a, b) { return b.length - a.length; })
            .map(function(u) { return String(u).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); })
            .join('|');
        function _plainNum(x) {
            if (!isFinite(x)) return '0';
            var s = String(x);
            if (s.indexOf('e') === -1 && s.indexOf('E') === -1) return s;
            var neg = x < 0, es = Math.abs(x).toExponential();
            var m = es.match(/^(\d)(?:\.(\d+))?e([+-]\d+)$/);
            if (!m) return s;
            var digits = m[1] + (m[2] || ''), exp = parseInt(m[3], 10), pointPos = 1 + exp, out;
            if (pointPos <= 0) out = '0.' + '0'.repeat(-pointPos) + digits;
            else if (pointPos >= digits.length) out = digits + '0'.repeat(pointPos - digits.length);
            else out = digits.slice(0, pointPos) + '.' + digits.slice(pointPos);
            return (neg ? '-' : '') + out;
        }
        function _prefDisplay(cat) {
            var name = defaultUnits[cat];
            if (!name || name === '__auto__') return null;
            var key = String(name).toLowerCase();
            var def = unitDefs[key];
            if (!def || def.cat !== cat) return null;
            return { label: unitDisplay[key] || name, factor: def.factor };
        }
        function _tempCanon(s) {
            s = String(s).toLowerCase();
            if (s.charAt(0) === 'c') return 'C';
            if (s.charAt(0) === 'f') return 'F';
            if (s.charAt(0) === 'k') return 'K';
            return null;
        }
        function _tempConvert(value, from, to) {
            var c;
            if (from === 'C') c = value;
            else if (from === 'F') c = (value - 32) * 5 / 9;
            else c = value - 273.15;
            if (to === 'C') return c;
            if (to === 'F') return c * 9 / 5 + 32;
            return c + 273.15;
        }
        var tempRe = /^\s*(-?[\d.,]+)\s*°?\s*(c|celsjus\w*|f|fahrenheit\w*|k|kelwin\w*)\s+(?:na|do|in|to|w)\s+°?\s*(c|celsjus\w*|f|fahrenheit\w*|k|kelwin\w*)\s*$/i;

        var tMatch = String(raw || '').match(tempRe);
        if (tMatch) {
            var tFrom = _tempCanon(tMatch[2]);
            var tTo = _tempCanon(tMatch[3]);
            var tVal = parseFloat(tMatch[1].replace(',', '.'));
            if (tFrom && tTo && isFinite(tVal)) {
                var tOut = _tempConvert(tVal, tFrom, tTo);
                return { expr: String(tOut), unit: tTo === 'K' ? 'K' : '°' + tTo, cat: 'temperature', valueInBase: tOut };
            }
        }

        var ppiMatch = String(raw || '').match(/^(.+?)\s+(?:na|do|in|to|w)\s+px\s+(?:przy|@)\s+([\d.,]+)\s*(?:ppi|dpi)\s*$/i);
        if (ppiMatch) {
            var innerPpi = resolveUnitsExpression(ppiMatch[1].trim(), opts);
            var ppiVal = parseFloat(ppiMatch[2].replace(',', '.'));
            if (innerPpi.cat === 'length' && isFinite(ppiVal) && ppiVal > 0 && isFinite(innerPpi.valueInBase)) {
                var pxOut = (innerPpi.valueInBase / 25.4) * ppiVal;
                return { expr: _plainNum(pxOut), unit: 'px', cat: 'length', valueInBase: innerPpi.valueInBase, workFactor: 1, explicitConvert: true };
            }
        }

        var convertRe = new RegExp('^(.+?)\\s+(?:na|do|in|to|w)\\s+(' + unitNamesRe + ')\\s*$', 'i');
        var naMatch = String(raw || '').match(convertRe);
        if (naMatch) {
            var inner = resolveUnitsExpression(naMatch[1].trim(), opts);
            var targetDef = unitDefs[naMatch[2].toLowerCase()];
            if (inner.unit !== null && targetDef && inner.cat === targetDef.cat) {
                var converted = inner.valueInBase / targetDef.factor;
                var targetKey = naMatch[2].toLowerCase();
                return { expr: String(converted), unit: unitDisplay[targetKey] || targetKey, cat: targetDef.cat, valueInBase: inner.valueInBase, explicitConvert: true };
            }
        }

        var totalBase = 0, workFactor = null, workUnitLabel = null, cat = null, baseUnit = null, hasUnits = false, mixed = false;
        var expr = String(raw || '');
        function _emitUnit(numStr, factor, catName, base, unitKey) {
            if (workFactor == null) {
                workFactor = factor;
                var uk = String(unitKey || base).toLowerCase();
                workUnitLabel = unitDisplay[uk] || unitKey || base;
            }
            cat = catName; baseUnit = base; hasUnits = true;
            var n = parseFloat(String(numStr).replace(',', '.'));
            totalBase += n * factor;
            return _plainNum(n * factor / workFactor);
        }
        expr = expr.replace(/([\d.,]+)\s*'/g, function(_, n) {
            if (cat && cat !== 'length') { mixed = true; return _; }
            return _emitUnit(n, 304.8, 'length', 'mm', 'ft');
        });
        expr = expr.replace(/([\d.,]+)\s*"/g, function(_, n) {
            if (cat && cat !== 'length') { mixed = true; return _; }
            return _emitUnit(n, 25.4, 'length', 'mm', 'in');
        });
        var unitRe = new RegExp('([\\d.,]+)\\s*(' + unitNamesRe + ')(?![A-Za-z0-9])', 'gi');
        expr = expr.replace(unitRe, function(m, numStr, unit) {
            var def = unitDefs[unit.toLowerCase()];
            if (!def) return m;
            if (cat && def.cat !== cat) {
                if (firstUnitWins) {
                    var n = parseFloat(String(numStr).replace(',', '.'));
                    return isFinite(n) ? _plainNum(n) : m;
                }
                mixed = true; return m;
            }
            return _emitUnit(numStr, def.factor, def.cat, def.base, unit);
        });
        if (mixed && !firstUnitWins) return { expr: raw, unit: null, cat: null, valueInBase: 0, workFactor: 1 };
        if (!hasUnits) return { expr: expr, unit: null, cat: null, valueInBase: 0, workFactor: 1 };
        var pref = _prefDisplay(cat);
        if (pref) return { expr: expr, unit: pref.label, cat: cat, valueInBase: totalBase, displayFactor: pref.factor, workFactor: workFactor };
        if (workUnitLabel && workFactor) return { expr: expr, unit: workUnitLabel, cat: cat, valueInBase: totalBase, displayFactor: workFactor, workFactor: workFactor };
        return { expr: expr, unit: baseUnit, cat: cat, valueInBase: totalBase, workFactor: workFactor };
    }

    function _nowMinutes() { var d = _now(); return d.getHours() * 60 + d.getMinutes(); }
    // Token zegara → minuty doby (0..1439) lub null. Akceptuje HH:MM (nie „teraz" — to datetime w evalDateExpression).
    function _parseClockToken(str) {
        var s = String(str).trim().toLowerCase();
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
    // [EN] Long spans: days/weeks/years — „1000 h" → „41 dni 16 h", not „1000 h".
    function _fmtDurationLong(mins) {
        mins = Math.round(Math.abs(mins));
        if (mins < 60) return mins + ' min';
        var parts = [];
        var DOBA = 1440, TYG = 10080, ROK = 525960; // [EN] factors from MATM0_DATA time base (s→min)
        if (mins >= ROK) {
            var y = Math.floor(mins / ROK);
            mins -= y * ROK;
            parts.push(y + ' ' + (y === 1 ? 'rok' : (y >= 2 && y <= 4 ? 'lata' : 'lat')));
        }
        if (mins >= TYG) {
            var w = Math.floor(mins / TYG);
            mins -= w * TYG;
            parts.push(w + ' tyg');
        }
        if (mins >= DOBA) {
            var d = Math.floor(mins / DOBA);
            mins -= d * DOBA;
            parts.push(d + ' ' + (d === 1 ? 'doba' : 'dni'));
        }
        if (mins >= 60) {
            var hr = Math.floor(mins / 60);
            mins -= hr * 60;
            if (hr) parts.push(hr + ' h');
        }
        if (mins > 0) parts.push(mins + ' min');
        return parts.length ? parts.join(' ') : '0 min';
    }
    // [EN] Seconds → czytelny timespan; krótkie → h+min, długie → dni/tyg/lata.
    function formatDurationSeconds(sec) {
        sec = Math.round(Math.abs(sec));
        if (sec < 60) return sec + ' s';
        var mins = sec / 60;
        return mins >= 1440 ? _fmtDurationLong(mins) : _fmtDuration(mins);
    }
    // Dokładny czas zegarowy z SEKUNDAMI (HH:MM:SS) — do pokazania, „z czego" zaokrąglono.
    function _fmtClockSec(mins) {
        var totalSec = ((Math.round(mins * 60) % 86400) + 86400) % 86400;
        var h = Math.floor(totalSec / 3600), mi = Math.floor((totalSec % 3600) / 60), s = totalSec % 60;
        var p = function(n) { return (n < 10 ? '0' : '') + n; };
        return p(h) + ':' + p(mi) + ':' + p(s);
    }
    // Czas zegarowy — „17:00 + 3h", „od 9:30 do 17:15", „17:00 - 9:30". „teraz" → evalDateExpression.
    function evalClockExpression(raw) {
        var s = String(raw || '').trim();
        if (!s) return null;
        var low = s.toLowerCase();
        var m;
        // „od HH:MM do HH:MM" / „from HH:MM to HH:MM" / „between A and B" → czas trwania
        if ((m = low.match(/^(?:od|from)\s+(.+?)\s+(?:do|to)\s+(.+)$/))) {
            var a = _parseClockToken(m[1]), b = _parseClockToken(m[2]);
            if (a != null && b != null) {
                var diff = b - a; if (diff < 0) diff += 1440;
                return { text: _fmtDuration(diff), value: diff, kind: 'duration', exact: true };
            }
            return null;
        }
        if ((m = low.match(/^(?:pomi[eę]dzy|mi[eę]dzy|between)\s+(.+?)\s+(?:a|and)\s+(.+)$/))) {
            var ab = _parseClockToken(m[1]), bb = _parseClockToken(m[2]);
            if (ab != null && bb != null) {
                var diffB = bb - ab; if (diffB < 0) diffB += 1440;
                return { text: _fmtDuration(diffB), value: diffB, kind: 'duration', exact: true };
            }
            return null;
        }
        if ((m = low.match(/^(?:od|from)\s+(.+?)\s+(?:until|aż\s+do)\s+(.+)$/))) {
            var au = _parseClockToken(m[1]), bu = _parseClockToken(m[2]);
            if (au != null && bu != null) {
                var diffU = bu - au; if (diffU < 0) diffU += 1440;
                return { text: _fmtDuration(diffU), value: diffU, kind: 'duration', exact: true };
            }
            return null;
        }
        // „HH:MM - HH:MM" / „HH:MM to HH:MM" → różnica
        if ((m = low.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/))) {
            var a2 = _parseClockToken(m[1]), b2 = _parseClockToken(m[2]);
            if (a2 != null && b2 != null) {
                var diff2 = a2 - b2; if (diff2 < 0) diff2 += 1440;
                return { text: _fmtDuration(diff2), value: diff2, kind: 'duration', exact: true };
            }
            return null;
        }
        if ((m = low.match(/^(\d{1,2}:\d{2})\s+to\s+(\d{1,2}:\d{2})$/))) {
            var a3 = _parseClockToken(m[1]), b3 = _parseClockToken(m[2]);
            if (a3 != null && b3 != null) {
                var diff3 = b3 - a3; if (diff3 < 0) diff3 += 1440;
                return { text: _fmtDuration(diff3), value: diff3, kind: 'duration', exact: true };
            }
            return null;
        }
        // „HH:MM + <trwanie>" / „HH:MM - <trwanie>" → nowy czas zegarowy
        if ((m = low.match(/^(\d{1,2}:\d{2})\s*([+\-])\s*(.+)$/))) {
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
        return null;
    }

    /* ============================================================
       [PL] Podsilnik DAT (drugi najemca smart-parsera). Samowystarczalny:
            zależy WYŁĄCZNIE od MATM0_DATA (PL_MONTHS, PL_WEEKDAYS).
            „za 3 tygodnie", „ile dni do 1.09", „dziś + 90 dni", „1.09 + 2 tyg".
       ============================================================ */
    var _PL_MONTHS = DATA.PL_MONTHS || {};
    var _PL_WEEKDAYS = DATA.PL_WEEKDAYS || [];

    var _todayOverride = null; // [EN] test hook — pin „today" for deterministic date tests
    var _nowOverride = null;   // [EN] test hook — pin „teraz" (full datetime)
    function _now() {
        if (_nowOverride) return new Date(_nowOverride.getTime());
        return new Date();
    }
    function _today() {
        if (_todayOverride) return new Date(_todayOverride.getTime());
        var d = new Date(); d.setHours(0, 0, 0, 0); return d;
    }
    function _validDMY(d, m, y) { return m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1 && y <= 9999; }
    function _fmtDate(d) {
        return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear() + ' (' + _PL_WEEKDAYS[d.getDay()] + ')';
    }
    // „teraz" i wyniki z godziną — krótki format: 1.7.26 14:35 (środa)
    function _fmtNow(d) {
        var y = d.getFullYear() % 100;
        var p = function(n) { return (n < 10 ? '0' : '') + n; };
        return d.getDate() + '.' + (d.getMonth() + 1) + '.' + p(y) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
            + ' (' + _PL_WEEKDAYS[d.getDay()] + ')';
    }
    // Data z godziną (pełny rok + dzień tygodnia) — offset czasowy na dacie bez „teraz".
    function _fmtDateTime(d) {
        var h = d.getHours(), mi = d.getMinutes();
        var p = function(n) { return (n < 10 ? '0' : '') + n; };
        return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + p(h) + ':' + p(mi)
            + ' (' + _PL_WEEKDAYS[d.getDay()] + ')';
    }
    function _fmtDateResult(d, moment) {
        if (moment) return _fmtNow(d);
        return (d.getHours() || d.getMinutes() || d.getSeconds()) ? _fmtDateTime(d) : _fmtDate(d);
    }
    function _fmtDays(n) { return n + ' ' + (Math.abs(n) === 1 ? 'dzień' : 'dni'); }
    function _isDateUnit(u) {
        // [a-ząćęłńóśźż] zamiast \w — \w nie obejmuje polskich liter (miesiące, miesięcy).
        return /^(dni|dnia|dzie[nń]|tydzie[nń]|tygodni[a-ząćęłńóśźż]*|tyg|miesi[a-ząćęłńóśźż]*|lat[a-ząćęłńóśźż]*|rok[a-ząćęłńóśźż]*|roku|days?|weeks?|months?|years?)$/i.test(u);
    }
    function _applyDateUnit(d, n, u, sign) {
        n = Math.round(n) * sign;
        u = u.toLowerCase();
        // Konstruktor Date(y,m,d) — unika przesunięć DST przy setDate/setMonth (regresja 1.01+90dni).
        var y = d.getFullYear(), mo = d.getMonth(), da = d.getDate();
        if (/^tyg|^tydzie|^week/.test(u)) da += n * 7;
        else if (/^miesi|^month/.test(u)) mo += n;
        else if (/^(lat|rok|roku|year)/.test(u)) y += n;
        else da += n;
        d.setTime(new Date(y, mo, da).getTime());
    }
    // Kalendarz na pełnym momencie („teraz") — zachowuje godzinę (setDate, nie konstruktor).
    function _applyDateUnitKeepTime(d, n, u, sign) {
        n = Math.round(n) * sign;
        u = u.toLowerCase();
        if (/^tyg|^tydzie|^week/.test(u)) d.setDate(d.getDate() + n * 7);
        else if (/^miesi|^month/.test(u)) d.setMonth(d.getMonth() + n);
        else if (/^(lat|rok|roku|year)/.test(u)) d.setFullYear(d.getFullYear() + n);
        else d.setDate(d.getDate() + n);
    }
    // Prawa strona „+/- offsetu" daty: „5dni", „5 dni", „20h", „1h30" (spacje opcjonalne).
    function _parseDateOffsetOperand(str) {
        var raw = String(str || '').trim();
        if (!raw) return null;
        var low = raw.toLowerCase();
        // Kalendarz PRZED parseSeconds — „dni"/„tyg" są też w UNIT_CATS.time (86400 s).
        var m = low.match(/^([\d.,]+)\s*([a-ząćęłńóśźż]+)$/);
        if (m && _isDateUnit(m[2])) return { amount: parseFloat(m[1].replace(',', '.')), dateUnit: m[2] };
        var sec = _TIME.parseSeconds(raw);
        if (sec != null) return { seconds: sec };
        return null;
    }
    function _applyDateOffset(d, offset, sign, keepTime) {
        if (offset.seconds != null) d.setTime(d.getTime() + sign * offset.seconds * 1000);
        else if (offset.dateUnit != null) {
            if (keepTime) _applyDateUnitKeepTime(d, offset.amount, offset.dateUnit, sign);
            else _applyDateUnit(d, offset.amount, offset.dateUnit, sign);
        }
    }
    // Kotwica względna (dziś/jutro/…) + offset czasowy: licz od bieżącej godziny, pokaż sam dzień.
    function _blendNowClock(d) {
        var n = _now();
        d.setHours(n.getHours(), n.getMinutes(), n.getSeconds(), n.getMilliseconds());
    }
    function _resolveDateOffsetResult(anchor, offset, sign) {
        var d = new Date(anchor.d.getTime());
        if (anchor.relDay && offset.seconds != null) _blendNowClock(d); // jak „teraz", ale bez godziny w wyniku
        _applyDateOffset(d, offset, sign, !!anchor.moment);
        if (anchor.relDay && offset.seconds != null) return _fmtDate(d);
        return _fmtDateResult(d, !!anchor.moment);
    }
    // → { d: Date, hasYear: bool, moment?: bool, relDay?: bool } albo null. moment=true → kotwica z godziną („teraz").
    function _parseDateToken(str) {
        var s = String(str).trim().toLowerCase();
        if (s === 'teraz' || s === 'now' || s === 'czas' || s === 'time') return { d: _now(), hasYear: true, moment: true };
        if (/^dzi[sś]$|^dzisiaj$|^today$/.test(s)) return { d: _today(), hasYear: true, relDay: true };
        if (s === 'jutro' || s === 'tomorrow')    { var j = _today(); j.setDate(j.getDate() + 1); return { d: j, hasYear: true, relDay: true }; }
        if (s === 'pojutrze') { var p = _today(); p.setDate(p.getDate() + 2); return { d: p, hasYear: true, relDay: true }; }
        if (s === 'wczoraj' || s === 'yesterday')  { var w = _today(); w.setDate(w.getDate() - 1); return { d: w, hasYear: true, relDay: true }; }
        var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); // ISO date
        if (m) { var y = +m[1], mo = +m[2], da = +m[3]; if (_validDMY(da, mo, y)) return { d: new Date(y, mo - 1, da), hasYear: true }; return null; }
        // ISO 8601 Zulu: 2026-03-15T14:30:00Z
        m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})t(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?z$/);
        if (m) {
            var yZ = +m[1], moZ = +m[2], daZ = +m[3], hZ = +m[4], miZ = +m[5], sZ = +(m[6] || 0);
            if (_validDMY(daZ, moZ, yZ) && hZ <= 23 && miZ <= 59 && sZ <= 59) {
                return { d: new Date(Date.UTC(yZ, moZ - 1, daZ, hZ, miZ, sZ)), hasYear: true, moment: true };
            }
            return null;
        }
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
        { i: 0, re: /^niedziel|^sunday/ },
        { i: 1, re: /^poniedzia[łl]|^mon(day)?/ },
        { i: 2, re: /^wtork?|^tue(s(day)?)?/ },
        { i: 3, re: /^[śs]rod|^wed(nesday)?/ },
        { i: 4, re: /^czwart|^thu(rs(day)?)?/ },
        { i: 5, re: /^pi[ąa]t|^fri(day)?/ },
        { i: 6, re: /^sobot|^sat(urday)?/ }
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
        // DNI TYGODNIA — PL: najbliższy/następny; EN: next/nearest; wstecz: poprzedni/last
        if ((m = low.match(/^(?:najbli[żz]sz[ayąeę]|nast[eę]pn[ayąeę]|przysz[łl][ayąeę]|next|nearest)\s+([a-ząćęłńóśźż]+)\s*$/))) {
            var wdN = _parseWeekday(m[1]);
            if (wdN >= 0) return { text: _fmtDate(_weekdayDate(wdN, 1)), value: null };
        }
        if ((m = low.match(/^(?:poprzedni[aą]?|ostatni[aą]?|minion[ayąeę]|last|previous)\s+([a-ząćęłńóśźż]+)\s*$/))) {
            var wdP = _parseWeekday(m[1]);
            if (wdP >= 0) return { text: _fmtDate(_weekdayDate(wdP, -1)), value: null };
        }
        // Dzień tygodnia + offset: „poniedziałek za 3 tygodnie" / „monday in 3 weeks"
        if ((m = low.match(/^([a-ząćęłńóśźż]+)\s+(?:za|in)\s*([\d.,]+)\s*([a-ząćęłńóśźż]+)\s*$/))) {
            var wdOff = _parseWeekday(m[1]);
            if (wdOff >= 0 && _isDateUnit(m[3])) {
                var dWdOff = _today();
                _applyDateUnit(dWdOff, parseFloat(m[2].replace(',', '.')), m[3], 1);
                var diffWd = (wdOff - dWdOff.getDay() + 7) % 7;
                dWdOff.setDate(dWdOff.getDate() + diffWd);
                return { text: _fmtDate(dWdOff), value: null };
            }
        }
        // „jaki/który/which/what day … <data>"
        if ((m = low.match(/^(?:jaki|kt[oó]ry|which|what)\s+(?:to\s+)?(?:day(?:\s+of\s+week)?|dzie[nń](?:\s+tygodnia)?)\s+(?:jest\s+|is\s+|to\s+|wypada\s+|b[eę]dzie\s+)?(.+)$/))) {
            var dWd = _parseDateToken(m[1].trim());
            if (dWd) return { text: _fmtDate(dWd.d), value: null };
        }
        // „ile dni od A do B" / „how many days from A to B"
        if ((m = low.match(/^(?:ile\s+dni|how\s+many\s+days)\s+(?:od|from)\s+(.+?)\s+(?:do|to)\s+(.+)$/))) {
            var a = _parseDateToken(m[1]), b = _parseDateToken(m[2]);
            if (a && b) { var n = Math.round((b.d - a.d) / 86400000); return { text: _fmtDays(n), value: n }; }
            return null;
        }
        // „ile dni do B" / „how many days until B" / „ile dni od dziś do B"
        if ((m = low.match(/^(?:ile\s+dni|how\s+many\s+days)\s+(?:(?:od|from)\s+(?:dzi[sś]|dzisiaj|today|teraz|now|czas|time)\s+)?(?:(?:do|zosta[łl]o\s+do|pozosta[łl]o\s+do)|(?:until|to|left\s+to))\s+(.+)$/))) {
            var b2 = _parseDateToken(m[1]);
            if (b2) {
                if (!b2.hasYear && b2.d < _today()) b2.d.setFullYear(b2.d.getFullYear() + 1);
                var n2 = Math.round((b2.d - _today()) / 86400000);
                return { text: _fmtDays(n2), value: n2 };
            }
            return null;
        }
        // „za N …" / „in N …"
        if ((m = low.match(/^(?:za|in)\s*([\d.,]+)\s*([a-ząćęłńóśźż]+)\s*$/)) && _isDateUnit(m[2])) {
            var d3 = _today(); _applyDateUnit(d3, parseFloat(m[1].replace(',', '.')), m[2], 1);
            return { text: _fmtDate(d3), value: null };
        }
        // „N … temu" / „N … ago"
        if ((m = low.match(/^([\d.,]+)\s*([a-ząćęłńóśźż]+)\s*(?:temu|ago)\s*$/)) && _isDateUnit(m[2])) {
            var d4 = _today(); _applyDateUnit(d4, parseFloat(m[1].replace(',', '.')), m[2], -1);
            return { text: _fmtDate(d4), value: null };
        }
        // „dziś / teraz / czas / time …" samodzielnie
        if ((m = low.match(/^(teraz|now|czas|time|dzi[sś]|dzisiaj|today|jutro|tomorrow|pojutrze|wczoraj|yesterday)\s*$/))) {
            var d6 = _parseDateToken(m[1]);
            if (d6) return { text: d6.moment ? _fmtNow(d6.d) : _fmtDate(d6.d), value: null };
        }
        // „90 dni + dziś" / „3 weeks + today" — offset przed kotwicą
        if ((m = low.match(/^([\d.,]+)\s*([a-ząćęłńóśźż]+)\s*\+\s*(teraz|now|czas|time|dzi[sś]|dzisiaj|today|jutro|tomorrow|pojutrze|wczoraj|yesterday)\s*$/))) {
            var offRev = _parseDateOffsetOperand(m[1] + ' ' + m[2]);
            var anch = _parseDateToken(m[3]);
            if (offRev && anch) {
                return { text: _resolveDateOffsetResult(anch, offRev, 1), value: null };
            }
        }
        // „<data> + offset" / „<data> - offset" — dni/tyg/mies + trwania czasowe (20h, 90min)
        if ((m = low.match(/^(.+?)\s*([+\-])\s*(.+)$/))) {
            var left = _parseDateToken(m[1].trim());
            var offset = _parseDateOffsetOperand(m[3].trim());
            if (left && offset) {
                return { text: _resolveDateOffsetResult(left, offset, m[2] === '-' ? -1 : 1), value: null };
            }
        }
        // Samodzielny token daty/czasu (ISO Zulu, DD.MM.YYYY, …)
        var dAlone = _parseDateToken(s);
        if (dAlone) return { text: _fmtDateResult(dAlone.d, !!dAlone.moment), value: null };
        return null;
    }

    // Procent upływu okresu: „ile % dnia", „ile % roku minęło", „day percentage".
    function evalPeriodPercentage(raw) {
        var s = String(raw || '').trim().toLowerCase();
        if (!s) return null;
        var now = _now();
        var pct, label;
        if (/^(?:ile\s+%\s+dni[aą]|ile\s+procent\s+dni[aą]|day\s+percentage|what\s+percent\s+of\s+the\s+day|what\s+%\s+of\s+the\s+day)\s*$/.test(s)) {
            var dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            var dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
            pct = (now - dayStart) / (dayEnd - dayStart) * 100;
            label = 'dnia';
        } else if (/^(?:ile\s+%\s+roku(?:\s+min[eę][łl]o)?|ile\s+procent\s+roku(?:\s+min[eę][łl]o)?|year\s+percentage|year\s+%|what\s+percent\s+of\s+the\s+year|what\s+%\s+of\s+the\s+year)\s*$/.test(s)) {
            var yearStart = new Date(now.getFullYear(), 0, 1);
            var yearEnd = new Date(now.getFullYear() + 1, 0, 1);
            pct = (now - yearStart) / (yearEnd - yearStart) * 100;
            label = 'roku';
        } else return null;
        if (!isFinite(pct)) return null;
        pct = parseFloat(pct.toPrecision(12));
        return { value: pct, unit: '%', kind: 'percent', label: label };
    }

    /* ============================================================
       [PL] Podsilnik STREF CZASOWYCH — OFFLINE przez Intl (z DST, bez sieci).
            Raycast-style: „time in Tokyo", „czas w Kioto", „5pm ldn in sf" (zegar).
            Skróty miast w _TZ_CITY; pre pozycje: w / we / in / w/in.
       ============================================================ */
    var _TZ_PREP = '(?:w\\/in|w|we|in)'; // [EN] PL „w" + EN „in" (+ opcjonalnie „w/in")
    var _TZ_CITY = {
        'warszawa': 'Europe/Warsaw', 'warszawie': 'Europe/Warsaw', 'warszawę': 'Europe/Warsaw',
        'warsaw': 'Europe/Warsaw', 'polska': 'Europe/Warsaw', 'polsce': 'Europe/Warsaw', 'pl': 'Europe/Warsaw',
        'kraków': 'Europe/Warsaw', 'krakow': 'Europe/Warsaw', 'krakowie': 'Europe/Warsaw',
        'gdańsk': 'Europe/Warsaw', 'gdansk': 'Europe/Warsaw', 'gdańsku': 'Europe/Warsaw', 'gdn': 'Europe/Warsaw',
        'wrocław': 'Europe/Warsaw', 'wroclaw': 'Europe/Warsaw', 'wrocławiu': 'Europe/Warsaw', 'wro': 'Europe/Warsaw',
        'poznań': 'Europe/Warsaw', 'poznan': 'Europe/Warsaw', 'poznaniu': 'Europe/Warsaw', 'poz': 'Europe/Warsaw',
        'łódź': 'Europe/Warsaw', 'lodz': 'Europe/Warsaw', 'łodzi': 'Europe/Warsaw',
        'katowice': 'Europe/Warsaw', 'katowicach': 'Europe/Warsaw', 'ktw': 'Europe/Warsaw',
        'szczecin': 'Europe/Warsaw', 'szczecinie': 'Europe/Warsaw', 'szz': 'Europe/Warsaw',
        'lublin': 'Europe/Warsaw', 'lublinie': 'Europe/Warsaw', 'luq': 'Europe/Warsaw',
        'londyn': 'Europe/London', 'londynie': 'Europe/London', 'london': 'Europe/London', 'ldn': 'Europe/London',
        'heathrow': 'Europe/London', 'lhr': 'Europe/London', 'lgw': 'Europe/London', 'stansted': 'Europe/London', 'stn': 'Europe/London',
        'paryż': 'Europe/Paris', 'paryz': 'Europe/Paris', 'paryżu': 'Europe/Paris', 'paryzu': 'Europe/Paris', 'paris': 'Europe/Paris',
        'cdg': 'Europe/Paris', 'ory': 'Europe/Paris',
        'berlin': 'Europe/Berlin', 'berlinie': 'Europe/Berlin', 'txl': 'Europe/Berlin', 'ber': 'Europe/Berlin',
        'frankfurt': 'Europe/Berlin', 'frankfurcie': 'Europe/Berlin', 'fra': 'Europe/Berlin',
        'monachium': 'Europe/Berlin', 'monachiumie': 'Europe/Berlin', 'münchen': 'Europe/Berlin', 'munich': 'Europe/Berlin', 'muc': 'Europe/Berlin',
        'hamburg': 'Europe/Berlin', 'hamburgu': 'Europe/Berlin', 'ham': 'Europe/Berlin',
        'amsterdam': 'Europe/Amsterdam', 'amsterdamie': 'Europe/Amsterdam', 'ams': 'Europe/Amsterdam',
        'madryt': 'Europe/Madrid', 'madrycie': 'Europe/Madrid', 'madrid': 'Europe/Madrid', 'mad': 'Europe/Madrid',
        'barcelona': 'Europe/Madrid', 'barcelonie': 'Europe/Madrid', 'bcn': 'Europe/Madrid',
        'rzym': 'Europe/Rome', 'rzymie': 'Europe/Rome', 'rome': 'Europe/Rome', 'fco': 'Europe/Rome',
        'mediolan': 'Europe/Rome', 'mediolanie': 'Europe/Rome', 'milan': 'Europe/Rome', 'mxp': 'Europe/Rome',
        'wiedeń': 'Europe/Vienna', 'wiedniu': 'Europe/Vienna', 'wien': 'Europe/Vienna', 'vienna': 'Europe/Vienna', 'vie': 'Europe/Vienna',
        'praga': 'Europe/Prague', 'pradze': 'Europe/Prague', 'prague': 'Europe/Prague', 'prg': 'Europe/Prague',
        'bruksela': 'Europe/Brussels', 'brukseli': 'Europe/Brussels', 'brussels': 'Europe/Brussels', 'bru': 'Europe/Brussels',
        'zurych': 'Europe/Zurich', 'zurychu': 'Europe/Zurich', 'zurich': 'Europe/Zurich', 'zrh': 'Europe/Zurich',
        'kopenhaga': 'Europe/Copenhagen', 'kopenhadze': 'Europe/Copenhagen', 'copenhagen': 'Europe/Copenhagen', 'cph': 'Europe/Copenhagen',
        'sztokholm': 'Europe/Stockholm', 'stockholm': 'Europe/Stockholm', 'arn': 'Europe/Stockholm',
        'oslo': 'Europe/Oslo', 'osl': 'Europe/Oslo',
        'helsinki': 'Europe/Helsinki', 'helsinku': 'Europe/Helsinki', 'hel': 'Europe/Helsinki',
        'ateny': 'Europe/Athens', 'atenach': 'Europe/Athens', 'athens': 'Europe/Athens', 'ath': 'Europe/Athens',
        'moskwa': 'Europe/Moscow', 'moskwie': 'Europe/Moscow', 'moskwę': 'Europe/Moscow', 'moscow': 'Europe/Moscow', 'svo': 'Europe/Moscow',
        'kijów': 'Europe/Kiev', 'kijow': 'Europe/Kiev', 'kijowie': 'Europe/Kiev', 'kyiv': 'Europe/Kiev', 'iev': 'Europe/Kiev',
        'stambuł': 'Europe/Istanbul', 'stambule': 'Europe/Istanbul', 'istanbul': 'Europe/Istanbul', 'ist': 'Europe/Istanbul',
        'nowy jork': 'America/New_York', 'nowym jorku': 'America/New_York', 'new york': 'America/New_York',
        'nyc': 'America/New_York', 'jfk': 'America/New_York', 'ewr': 'America/New_York', 'lga': 'America/New_York',
        'miami': 'America/New_York', 'mia': 'America/New_York', 'boston': 'America/New_York', 'bos': 'America/New_York',
        'los angeles': 'America/Los_Angeles', 'la': 'America/Los_Angeles', 'lax': 'America/Los_Angeles',
        'san francisco': 'America/Los_Angeles', 'sf': 'America/Los_Angeles', 'sfo': 'America/Los_Angeles',
        'seattle': 'America/Los_Angeles', 'sea': 'America/Los_Angeles',
        'chicago': 'America/Chicago', 'ord': 'America/Chicago',
        'denver': 'America/Denver', 'den': 'America/Denver',
        'toronto': 'America/Toronto', 'yyz': 'America/Toronto',
        'vancouver': 'America/Vancouver', 'yvr': 'America/Vancouver',
        'mexico city': 'America/Mexico_City', 'mex': 'America/Mexico_City',
        'são paulo': 'America/Sao_Paulo', 'sao paulo': 'America/Sao_Paulo', 'gru': 'America/Sao_Paulo',
        'buenos aires': 'America/Argentina/Buenos_Aires', 'eze': 'America/Argentina/Buenos_Aires',
        'tokio': 'Asia/Tokyo', 'tokyo': 'Asia/Tokyo', 'kioto': 'Asia/Tokyo', 'kyoto': 'Asia/Tokyo', 'nrt': 'Asia/Tokyo', 'hnd': 'Asia/Tokyo',
        'pekin': 'Asia/Shanghai', 'pekinie': 'Asia/Shanghai', 'beijing': 'Asia/Shanghai', 'pek': 'Asia/Shanghai',
        'szanghaj': 'Asia/Shanghai', 'szanghaju': 'Asia/Shanghai', 'shanghai': 'Asia/Shanghai', 'pvg': 'Asia/Shanghai',
        'hong kong': 'Asia/Hong_Kong', 'hkg': 'Asia/Hong_Kong',
        'singapur': 'Asia/Singapore', 'singapore': 'Asia/Singapore', 'sin': 'Asia/Singapore',
        'seul': 'Asia/Seoul', 'seoul': 'Asia/Seoul', 'icn': 'Asia/Seoul',
        'bangkok': 'Asia/Bangkok', 'bkk': 'Asia/Bangkok',
        'mumbai': 'Asia/Kolkata', 'bom': 'Asia/Kolkata',
        'delhi': 'Asia/Kolkata', 'indie': 'Asia/Kolkata', 'indiach': 'Asia/Kolkata', 'del': 'Asia/Kolkata',
        'sydney': 'Australia/Sydney', 'syd': 'Australia/Sydney',
        'melbourne': 'Australia/Melbourne', 'mel': 'Australia/Melbourne',
        'dubaj': 'Asia/Dubai', 'dubaju': 'Asia/Dubai', 'dubai': 'Asia/Dubai', 'dxb': 'Asia/Dubai',
        'doha': 'Asia/Qatar', 'doh': 'Asia/Qatar',
        'utc': 'UTC', 'gmt': 'UTC', 'zulu': 'UTC'
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
    function _tzNowInCity(cityRaw) {
        var tz = _tzLookup(cityRaw); if (tz == null) return null;
        var d = new Date();
        var off = _tzOffsetMin(tz, d); if (off == null) return null;
        var offLocal = -d.getTimezoneOffset();
        var rm = d.getHours() * 60 + d.getMinutes() + (off - offLocal);
        return { text: _fmtClock(rm) + ' (' + _tzLabel(cityRaw) + ')', value: null, kind: 'clock', exact: true };
    }
    function evalTimezoneExpression(raw) {
        var s = String(raw || '').trim(); if (!s) return null;
        var low = s.toLowerCase(); var m;
        // „HH:MM w <A> na/do <B>" / „HH:MM in <A> to <B>"
        if ((m = low.match(new RegExp('^(\\d{1,2}:\\d{2})\\s+' + _TZ_PREP + '\\s+(.+?)\\s+(?:na|do|to)\\s+(.+?)\\s*$')))) {
            var tzA = _tzLookup(m[2]), tzB = _tzLookup(m[3]);
            var baseMin = _parseClockToken(m[1]);
            if (tzA == null || tzB == null || baseMin == null) return null;
            var now = new Date();
            var offA = _tzOffsetMin(tzA, now), offB = _tzOffsetMin(tzB, now);
            if (offA == null || offB == null) return null;
            var resMin = baseMin + (offB - offA);
            return { text: _fmtClock(resMin) + ' (' + _tzLabel(m[3]) + ')', value: null, kind: 'clock', exact: true };
        }
        // „teraz NYC" / „teraz w Tokio" / „now in Kyoto" — skrót bez „czas w"/„time in"
        if ((m = low.match(new RegExp('^(?:teraz|now|czas|time)\\s+(?:' + _TZ_PREP + '\\s+)?(.+?)\\s*$')))) {
            var tzSh = _tzNowInCity(m[1]); if (tzSh) return tzSh;
        }
        // „czas w <A>" / „time in <A>" / „która godzina w <A>" (Raycast-style)
        if ((m = low.match(new RegExp('^(?:(?:kt[oó]ra\\s+(?:jest\\s+)?godzina|czas|godzina)|(?:what(?:\'s|\\s+is)?\\s+(?:the\\s+)?time|what\\s+time|time))\\s+' + _TZ_PREP + '\\s+(.+?)\\s*$')))) {
            var tzFull = _tzNowInCity(m[1]); if (tzFull) return tzFull;
        }
        return null;
    }

    var API = {
        buildUnitRegistry: buildUnitRegistry,
        resolveCurrencyExpression: resolveCurrencyExpression,
        currencyTokenMap: _currencyTokenMap,
        currencyTokenRe: _currencyTokenRe,
        currencyDisplay: _currencyDisplay,
        hasCurrencyInInput: hasCurrencyInInput,
        resolveUnitsExpression: resolveUnitsExpression,
        time: _TIME,                       // prymityw czasu (parseSeconds, units, base)
        parseDurationMinutes: _parseDuration,
        evalClockExpression: evalClockExpression,
        evalDateExpression: evalDateExpression,
        evalPeriodPercentage: evalPeriodPercentage,
        formatDurationSeconds: formatDurationSeconds,
        evalTimezoneExpression: evalTimezoneExpression,
        isDateUnit: _isDateUnit,           // app.js używa go też w rozpoznawaniu tokenów notatnika
        setTodayForTests: function(d) { _todayOverride = d ? new Date(d.getTime()) : null; },
        clearTodayForTests: function() { _todayOverride = null; },
        setNowForTests: function(d) { _nowOverride = d ? new Date(d.getTime()) : null; },
        clearNowForTests: function() { _nowOverride = null; }
    };
    if (typeof window !== 'undefined') window.MATM0_PARSER = API;
    if (typeof self !== 'undefined') self.MATM0_PARSER = API;
})();
