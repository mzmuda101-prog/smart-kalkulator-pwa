/* ============================================================
   [PL] smart-parser — wydzielany silnik wyrażeń smart-kalkulatora.
   [EN] smart-parser — the smart-calculator expression engine, being
        extracted out of app.js (pkt 2 kierunku „typowanego silnika”,
        patrz project_kalkulator_unified_engine_direction).

   PIERWSZY NAJEMCA: podsilnik CZASU (prymityw `_TIME` + zegar).
   Samowystarczalny — zależy WYŁĄCZNIE od window.MATM0_DATA (tabela jednostek).
   Wystawia window.MATM0_PARSER. app.js konsumuje go jako cienkie wiązanie.
   Kolejne podsilniki (daty/waluty/jednostki) dochodzą tu ewolucyjnie.
   Preprocess (faza 1): expandNumeric/CurrencyShorthands, parseNaturalShortcuts, resolveTrigDegrees.
   Routery procentowe (faza 2): evalPercentQuery/Difference/BaseQuery/OfPercent — plain result, bez STATE.
   Stałe + ans + route cost (faza 4): resolveCalcConstants/Answer, evalRouteCost — opts z app.
   Orkiestrator evaluate (faza 5): pełny pipeline eval — plain result, bez STATE/makeVal.
   Pipeline reguły: docs/ENGINE-PREPROCESS-RULES.md
   ============================================================ */
(function() {
    'use strict';
    var DATA = (typeof window !== 'undefined' && window.MATM0_DATA) || {};
    function _numeric() { // [EN] lazy — numeric-eval loads before smart-parser in index.html
        return (typeof window !== 'undefined' && window.MATM0_NUMERIC) ||
            (typeof self !== 'undefined' && self.MATM0_NUMERIC) || {};
    }
    function _plFold(s) { // [EN] shared PL diacritics fold — MATM0_PL_FOLD loaded before this file
        var F = (typeof window !== 'undefined' && window.MATM0_PL_FOLD) ||
            (typeof self !== 'undefined' && self.MATM0_PL_FOLD);
        return F && F.foldLower ? F.foldLower(s) : String(s || '').toLowerCase();
    }
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
    function _fmt() { // [EN] lazy — format-pl.js loads before smart-parser
        return (typeof window !== 'undefined' && window.MATM0_FMT) ||
            (typeof self !== 'undefined' && self.MATM0_FMT) || {};
    }
    function _formatLocaleNumber(num, maxDigits) {
        var F = _fmt();
        if (F.formatLocaleNumber) return F.formatLocaleNumber(num, maxDigits);
        if (!isFinite(num)) return String(num);
        return String(num);
    }
    function _roundMoney(n) { // [EN] grosze — decimal.js when loaded, else float fallback
        var M = (typeof window !== 'undefined' && window.MATM0_MONEY) ||
            (typeof self !== 'undefined' && self.MATM0_MONEY) || null;
        if (M && typeof M.roundMoney === 'function') return M.roundMoney(n);
        if (!isFinite(n)) return n;
        return Math.round(n * 100) / 100;
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
    function analyzeUnitMix(raw, options) {
        var opts = options || {};
        var unitDefs = opts.unitDefs || {};
        var unitNamesRe = opts.unitNamesRe || Object.keys(unitDefs)
            .sort(function(a, b) { return b.length - a.length; })
            .map(function(u) { return String(u).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); })
            .join('|');
        var tokenRe = _currencyTokenRe(_currencyTokenMap(opts.fxRates || {}));
        var hits = [];
        var s = String(raw || '');
        var m;
        if (tokenRe) {
            var amountRe = new RegExp('([\\d.,]+)\\s*(' + tokenRe + ')(?![a-ząćęłńóśźż0-9])', 'gi');
            while ((m = amountRe.exec(s)) !== null) hits.push({ idx: m.index, kind: 'currency' });
            var revAmountRe = new RegExp('\\b(' + tokenRe + ')\\s*([\\d.,]+)(?![a-ząćęłńóśźż0-9])', 'gi');
            while ((m = revAmountRe.exec(s)) !== null) hits.push({ idx: m.index, kind: 'currency' });
        }
        if (unitNamesRe) {
            var unitRe = new RegExp('([\\d.,]+)\\s*(' + unitNamesRe + ')(?![A-Za-z0-9])', 'gi');
            while ((m = unitRe.exec(s)) !== null) {
                var def = unitDefs[m[2].toLowerCase()];
                if (!def) continue;
                hits.push({ idx: m.index, kind: 'physical', cat: def.cat, dimensionless: !!(def.custom && def.dimensionless) });
            }
        }
        hits.sort(function(a, b) { return a.idx - b.idx; });
        var hasCur = false, hasDimPhys = false, physCats = {};
        hits.forEach(function(h) {
            if (h.kind === 'currency') hasCur = true;
            else if (h.kind === 'physical' && !h.dimensionless) { hasDimPhys = true; physCats[h.cat] = 1; }
        });
        return {
            hits: hits,
            needsFirstWins: (hasCur && hasDimPhys) || Object.keys(physCats).length > 1
        };
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
        u = _plFold(u);
        // [a-z] po fold — mobile często bez ą/ę/ć; fold w _plFold przed dopasowaniem.
        return /^(dni|dnia|dzien|tydzien|tygodni[a-z]*|tyg|miesi[a-z]*|lat[a-z]*|rok[a-z]*|roku|days?|weeks?|months?|years?)$/i.test(u);
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
        var low = _plFold(raw);
        var m = low.match(/^([\d.,]+)\s*([a-z]+)$/);
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
        var s = _plFold(str);
        if (s === 'teraz' || s === 'now' || s === 'czas' || s === 'time') return { d: _now(), hasYear: true, moment: true };
        if (/^dzis$|^dzisiaj$|^today$/.test(s)) return { d: _today(), hasYear: true, relDay: true };
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
        m = s.match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{2,4}))?$/); // DD miesiąc [RRRR]
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
        w = _plFold(w);
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
        var low = _plFold(s);
        var m;
        // DNI TYGODNIA — PL: najbliższy/następny; EN: next/nearest; wstecz: poprzedni/last
        if ((m = low.match(/^(?:najblizsz[a-z]*|nastepn[a-z]*|przyszl[a-z]*|next|nearest)\s+([a-z]+)\s*$/))) {
            var wdN = _parseWeekday(m[1]);
            if (wdN >= 0) return { text: _fmtDate(_weekdayDate(wdN, 1)), value: null };
        }
        if ((m = low.match(/^(?:poprzedni[a-z]*|ostatni[a-z]*|minion[a-z]*|last|previous)\s+([a-z]+)\s*$/))) {
            var wdP = _parseWeekday(m[1]);
            if (wdP >= 0) return { text: _fmtDate(_weekdayDate(wdP, -1)), value: null };
        }
        // Dzień tygodnia + offset: „poniedziałek za 3 tygodnie" / „monday in 3 weeks"
        if ((m = low.match(/^([a-z]+)\s+(?:za|in)\s*([\d.,]+)\s*([a-z]+)\s*$/))) {
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
        if ((m = low.match(/^(?:jaki|ktory|which|what)\s+(?:to\s+)?(?:day(?:\s+of\s+week)?|dzien(?:\s+tygodnia)?)\s+(?:jest\s+|is\s+|to\s+|wypada\s+|bedzie\s+)?(.+)$/))) {
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
        if ((m = low.match(/^(?:ile\s+dni|how\s+many\s+days)\s+(?:(?:od|from)\s+(?:dzis|dzisiaj|today|teraz|now|czas|time)\s+)?(?:(?:do|zostalo\s+do|pozostalo\s+do)|(?:until|to|left\s+to))\s+(.+)$/))) {
            var b2 = _parseDateToken(m[1]);
            if (b2) {
                if (!b2.hasYear && b2.d < _today()) b2.d.setFullYear(b2.d.getFullYear() + 1);
                var n2 = Math.round((b2.d - _today()) / 86400000);
                return { text: _fmtDays(n2), value: n2 };
            }
            return null;
        }
        // „za N …" / „in N …"
        if ((m = low.match(/^(?:za|in)\s*([\d.,]+)\s*([a-z]+)\s*$/)) && _isDateUnit(m[2])) {
            var d3 = _today(); _applyDateUnit(d3, parseFloat(m[1].replace(',', '.')), m[2], 1);
            return { text: _fmtDate(d3), value: null };
        }
        // „N … temu" / „N … ago"
        if ((m = low.match(/^([\d.,]+)\s*([a-z]+)\s*(?:temu|ago)\s*$/)) && _isDateUnit(m[2])) {
            var d4 = _today(); _applyDateUnit(d4, parseFloat(m[1].replace(',', '.')), m[2], -1);
            return { text: _fmtDate(d4), value: null };
        }
        // „dziś / teraz / czas / time …" samodzielnie
        if ((m = low.match(/^(teraz|now|czas|time|dzis|dzisiaj|today|jutro|tomorrow|pojutrze|wczoraj|yesterday)\s*$/))) {
            var d6 = _parseDateToken(m[1]);
            if (d6) return { text: d6.moment ? _fmtNow(d6.d) : _fmtDate(d6.d), value: null };
        }
        // „90 dni + dziś" / „3 weeks + today" — offset przed kotwicą
        if ((m = low.match(/^([\d.,]+)\s*([a-z]+)\s*\+\s*(teraz|now|czas|time|dzis|dzisiaj|today|jutro|tomorrow|pojutrze|wczoraj|yesterday)\s*$/))) {
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
        var s = _plFold(raw).trim();
        if (!s) return null;
        var now = _now();
        var pct, label;
        if (/^(?:ile\s+%\s+dni[a-z]*|ile\s+procent\s+dni[a-z]*|day\s+percentage|what\s+percent\s+of\s+the\s+day|what\s+%\s+of\s+the\s+day)\s*$/.test(s)) {
            var dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            var dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
            pct = (now - dayStart) / (dayEnd - dayStart) * 100;
            label = 'dnia';
        } else if (/^(?:ile\s+%\s+roku(?:\s+min[a-z]+)?|ile\s+procent\s+roku(?:\s+min[a-z]+)?|year\s+percentage|year\s+%|what\s+percent\s+of\s+the\s+year|what\s+%\s+of\s+the\s+year)\s*$/.test(s)) {
            var yearStart = new Date(now.getFullYear(), 0, 1);
            var yearEnd = new Date(now.getFullYear() + 1, 0, 1);
            pct = (now - yearStart) / (yearEnd - yearStart) * 100;
            label = 'roku';
        } else return null;
        if (!isFinite(pct)) return null;
        pct = parseFloat(pct.toPrecision(12));
        return { value: pct, unit: '%', kind: 'percent', label: label };
    }

    // „ile %" — kierunek odwrotny do „X% z Y": A/B·100 → unit '%'.
    function _pctResult(p) {
        var v = p;
        if (isFinite(v) && v !== 0 && !(Number.isInteger(v) && Math.abs(v) <= Number.MAX_SAFE_INTEGER)) v = parseFloat(v.toPrecision(15));
        var approx = false, ex = null;
        if (isFinite(v) && !Number.isInteger(v)) {
            var d = Number(v.toFixed(10));
            if (Math.abs(v - d) > Math.abs(v) * 1e-12) { approx = true; ex = _formatLocaleNumber(v, 15) + '%'; }
        }
        return { value: v, unit: '%', kind: 'percent', exact: !approx, exactText: ex };
    }
    function _pctFrac(aStr, bStr) {
        var a = parseFloat(String(aStr).replace(',', '.')), b = parseFloat(String(bStr).replace(',', '.'));
        if (!isFinite(a) || !isFinite(b) || b === 0) return null;
        return _pctResult(a / b * 100);
    }
    function evalPercentQuery(raw) {
        var s = _plFold(raw).trim();
        if (!s || (s.indexOf('%') === -1 && s.indexOf('procent') === -1 && s.indexOf('percent') === -1)) return null;
        var P = '([\\d.,]+)', PCT = '(?:%|procent[a-z]*|percent)';
        var m;
        if (s.indexOf('ile') !== -1 && (m = s.match(new RegExp('^ile\\s+' + PCT + '\\s+(?:to\\s+|stanowi\\s+)?' + P + '\\s+z\\s+' + P + '\\s*$')))) {
            return _pctFrac(m[1], m[2]);
        }
        if ((m = s.match(new RegExp('^' + P + '\\s+z\\s+' + P + '\\s+to\\s+ile\\s+' + PCT + '\\s*$')))) {
            return _pctFrac(m[1], m[2]);
        }
        if ((m = s.match(new RegExp('^' + P + '\\s+(?:to\\s+ile\\s+' + PCT + '\\s+z|is\\s+what\\s+' + PCT + '\\s+of)\\s+' + P + '\\s*$')))) {
            return _pctFrac(m[1], m[2]);
        }
        if ((m = s.match(new RegExp('^what\\s+' + PCT + '\\s+is\\s+' + P + '\\s+of\\s+' + P + '\\s*$')))) {
            return _pctFrac(m[1], m[2]);
        }
        if ((m = s.match(new RegExp('^' + P + '\\s+of\\s+' + P + '\\s+is\\s+what\\s+' + PCT + '\\s*$')))) {
            return _pctFrac(m[1], m[2]);
        }
        if ((m = s.match(new RegExp('^' + P + '\\s+z\\s+' + P + '\\s+(?:stanowi\\s+)?(?:to\\s+)?ile\\s+' + PCT + '\\s*$')))) {
            return _pctFrac(m[1], m[2]);
        }
        if ((m = s.match(new RegExp('^jaki\\s+(?:procent[a-z]*|' + PCT + ')\\s+(?:stanowi\\s+|to\\s+)?' + P + '\\s+z\\s+' + P + '\\s*$')))) {
            return _pctFrac(m[1], m[2]);
        }
        return null;
    }
    // „P% z Q%" — procent z procenta (= P×Q/100 w punktach procentowych).
    function evalPercentOfPercent(raw) {
        var s = _plFold(raw).trim();
        if (!s || s.indexOf('%') === -1) return null;
        var P = '([\\d.,]+)', PCT = '(?:%|procent[a-z]*|percent)';
        var m = s.match(new RegExp('^' + P + PCT + '\\s+(?:z|of)\\s+' + P + PCT + '\\s*$'));
        if (!m) return null;
        var p = parseFloat(String(m[1]).replace(',', '.'));
        var q = parseFloat(String(m[2]).replace(',', '.'));
        if (!isFinite(p) || !isFinite(q)) return null;
        return _pctResult(p * q / 100);
    }
    // Różnica procentowa: (B−A)/A·100 — Raycast-style.
    function _pctDiff(aStr, bStr) {
        var a = parseFloat(String(aStr).replace(',', '.')), b = parseFloat(String(bStr).replace(',', '.'));
        if (!isFinite(a) || !isFinite(b) || a === 0) return null;
        return _pctResult((b - a) / a * 100);
    }
    function evalPercentDifference(raw) {
        var s = _plFold(raw).trim();
        if (!s || !/(%|procent|percent|roznica|difference|change|ile\s+(?:%|procent|percent))/i.test(s)) return null;
        var P = '([\\d.,]+)', PCT = '(?:%|procent[a-z]*|percent)';
        var m;
        if ((m = s.match(new RegExp('^(?:roznica|percent\\s+(?:difference|change))\\s*(?:%|procent[a-z]*)?\\s*(?:miedzy|between|from)\\s+' + P + '\\s+(?:a|and|to)\\s+' + P + '\\s*$')))) {
            return _pctDiff(m[1], m[2]);
        }
        if ((m = s.match(new RegExp('^(?:z|od)\\s+' + P + '\\s+(?:na|do)\\s+' + P + '\\s+(?:to\\s+|o\\s+)?ile\\s+' + PCT + '\\s*$')))) {
            return _pctDiff(m[1], m[2]);
        }
        if ((m = s.match(new RegExp('^' + P + '\\s+(?:to|na|→)\\s+' + P + '\\s+(?:percent\\s+)?(?:difference|change|roznica)\\s*$')))) {
            return _pctDiff(m[1], m[2]);
        }
        if ((m = s.match(new RegExp('^from\\s+' + P + '\\s+to\\s+' + P + '\\s+(?:is\\s+)?what\\s+' + PCT + '\\s*$')))) {
            return _pctDiff(m[1], m[2]);
        }
        return null;
    }
    // „Baza procentowa" — znasz ułamek (X% = Y), szukasz innej części całości.
    function _pctBaseCurrencyUnit(tok, options) {
        if (!tok) return null;
        var map = _currencyTokenMap((options && options.fxRates) || {});
        var code = map[String(tok).toLowerCase()];
        return code ? _currencyDisplay(code, options) : null;
    }
    function _pctBaseResult(pctStr, valStr, targetPctStr, currencyTok, options) {
        var pct = parseFloat(String(pctStr).replace(',', '.'));
        var val = parseFloat(String(valStr).replace(',', '.'));
        var target = targetPctStr != null && targetPctStr !== ''
            ? parseFloat(String(targetPctStr).replace(',', '.')) : 100;
        if (!isFinite(pct) || !isFinite(val) || !isFinite(target) || pct === 0) return null;
        var raw = val * target / pct;
        if (isFinite(raw) && raw !== 0 && !(Number.isInteger(raw) && Math.abs(raw) <= Number.MAX_SAFE_INTEGER)) {
            raw = parseFloat(raw.toPrecision(15));
        }
        var unit = _pctBaseCurrencyUnit(currencyTok, options);
        var isMoney = !!unit;
        var result = isMoney ? _roundMoney(raw) : parseFloat(raw.toPrecision(12));
        var approx = false, ex = null;
        if (isMoney && Math.abs(raw - result) > 0.0045) {
            approx = true; ex = _formatLocaleNumber(raw, 15) + '\u202f' + unit;
        } else if (!isMoney && isFinite(raw) && !Number.isInteger(raw)) {
            var d = Number(raw.toFixed(6));
            if (Math.abs(raw - d) > Math.abs(raw) * 1e-9) { approx = true; ex = _formatLocaleNumber(raw, 15); }
        }
        var tgtLabel = _formatLocaleNumber(target, Number.isInteger(target) ? undefined : 6);
        var valLabel = _formatLocaleNumber(result, isMoney ? 2 : 6);
        var suffix = unit ? '\u202f' + unit : '';
        return {
            value: result, unit: unit, kind: isMoney ? 'money' : 'number', exact: !approx, exactText: ex,
            text: tgtLabel + '%=' + valLabel + suffix // [EN] tight '=' — wrap splits label/value on 2 lines
        };
    }
    function evalPercentBaseQuery(raw, options) {
        var opts = options || {};
        var s = _plFold(raw).trim();
        if (!s || (s.indexOf('%') === -1 && s.indexOf('procent') === -1 && s.indexOf('percent') === -1)) return null;
        s = s.replace(/→|->/g, ';').replace(/\s+/g, ' ').trim();
        var P = '([\\d.,]+)', PC = '([\\d.,]+)\\s*(?:%|procent[a-z]*|percent)';
        var curTok = _currencyTokenRe(_currencyTokenMap(opts.fxRates || {}));
        var PV = curTok
            ? P + '(?:\\s*(' + curTok + ')(?![a-ząćęłńóśźż0-9]))?'
            : P;
        var m;
        if ((m = s.match(new RegExp('^' + PC + '\\s*(?:=|to|jest|is)\\s*' + PV + '(?:\\s*;\\s*([\\d.,]+)\\s*%\\s*(?:=)?\\s*\\??)?\\s*$', 'i')))) {
            return _pctBaseResult(m[1], m[2], m[4], m[3], opts);
        }
        if ((m = s.match(new RegExp('^' + PV + '\\s*=\\s*' + PC + '(?:\\s*;\\s*([\\d.,]+)\\s*%\\s*(?:=)?\\s*\\??)?\\s*$', 'i')))) {
            return _pctBaseResult(m[3], m[1], m[4], m[2], opts);
        }
        if ((m = s.match(new RegExp('^' + PV + '\\s+(?:to|jest|is)\\s+' + PC + '(?:\\s*[,;]\\s*|\\s+)(?:ile\\s+|what\\s+is\\s+)?([\\d.,]+)\\s*%\\s*$', 'i')))) {
            return _pctBaseResult(m[3], m[1], m[4], m[2], opts);
        }
        if ((m = s.match(new RegExp('^' + PV + '\\s+(?:to|jest|is)\\s+' + PC + '\\s*$', 'i')))) {
            return _pctBaseResult(m[3], m[1], 100, m[2], opts);
        }
        if ((m = s.match(new RegExp('^' + PV + '\\s+(?:(?:is|to)\\s+)?' + PC + '\\s+(?:of\\s+what|z\\s+czego)\\s*$', 'i')))) {
            return _pctBaseResult(m[3], m[1], 100, m[2], opts);
        }
        if ((m = s.match(new RegExp('^(?:ile\\s+(?:to|wynosi)\\s+|what\\s+is\\s+)?([\\d.,]+)\\s*%\\s+(?:gdy|jak|if)\\s+' + PC + '\\s+(?:to|jest|is|=)\\s*' + PV + '\\s*$', 'i')))) {
            return _pctBaseResult(m[2], m[3], m[1], m[4], opts);
        }
        if ((m = s.match(new RegExp('^(?:ile\\s+(?:to|wynosi)\\s+|what\\s+is\\s+)?([\\d.,]+)\\s*%\\s+(?:gdy|jak|if)\\s+' + PV + '\\s+(?:to|jest|is)\\s+' + PC + '\\s*$', 'i')))) {
            return _pctBaseResult(m[4], m[2], m[1], m[3], opts);
        }
        if ((m = s.match(new RegExp('^' + PC + '\\s+(?:to|jest|is)\\s*' + PV + '(?:\\s*[,;]\\s*|\\s+)(?:ile\\s+|what\\s+is\\s+)?([\\d.,]+)\\s*%\\s*$', 'i')))) {
            return _pctBaseResult(m[1], m[2], m[4], m[3], opts);
        }
        return null;
    }

    // ── Stałe + ans + koszt trasy (faza 4) ──
    var _CONST_SIMPLE_RE = /^-?[\d.,]+%?$/;
    function valueIsFunc(val) {
        var v = String(val == null ? '' : val).trim().replace(/×/g, '*').replace(/÷/g, '/').replace(/\s+/g, '').toLowerCase();
        if (!/(^|[^a-z])x([^a-z]|$)/.test(v)) return false;
        try { _numeric().compileGraphExpression(v); return true; } catch (e) { return false; }
    }
    function isFuncConst(c) { return !!c && valueIsFunc(c.value); }
    function funcConstBody(c) { return String(c.value).trim().replace(/×/g, '*').replace(/÷/g, '/'); }
    function classifyConstValue(val) {
        var raw = String(val).trim();
        if (valueIsFunc(raw)) return { mode: 'func', sub: raw, norm: raw };
        var norm = raw.replace(/×/g, '*').replace(/÷/g, '/');
        if (_CONST_SIMPLE_RE.test(norm)) return { mode: 'simple', sub: norm, norm: norm };
        if (/^[+*/^]/.test(norm) || /^-[^\d.,]/.test(norm)) return { mode: 'op', sub: norm, norm: norm };
        return { mode: 'expr', sub: '(' + norm + ')', norm: norm };
    }
    function knownConstUnit(u, options) {
        u = String(u || '').trim();
        if (!u) return null;
        var low = u.toLowerCase();
        var unitDefs = (options && options.unitDefs) || {};
        if (unitDefs[low]) return u;
        var map = _currencyTokenMap((options && options.fxRates) || {});
        if (map[low]) return u;
        return null;
    }
    function resolveCalcAnswer(raw, lastAnswer) {
        if (lastAnswer === null || !isFinite(lastAnswer)) return raw;
        return String(raw == null ? '' : raw).replace(/\b(?:ans|wynik|poprzedni|ostatni|last|previous)\b/gi, '(' + String(lastAnswer) + ')');
    }
    function resolveFunctionConstants(raw, options) {
        var opts = options || {};
        var constants = opts.constants || [];
        var evalConstNumeric = opts.evalConstNumeric;
        var funcs = constants.filter(isFuncConst);
        if (!funcs.length) return String(raw == null ? '' : raw);
        var result = String(raw);
        for (var pass = 0; pass < 5; pass++) {
            var before = result;
            funcs.forEach(function(c) {
                if (!c.name) return;
                var fn;
                try { fn = _numeric().compileGraphExpression(funcConstBody(c)); }
                catch (e) { return; }
                var nm = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                var B = '(?![\\p{L}\\p{N}_])';
                var ARG = '(-?[\\d.,]+|[\\p{L}\\p{N}_]+)';
                function argNum(s) {
                    if (/^-?[\d.,]+$/.test(s)) { var n = parseFloat(s.replace(',', '.')); return isFinite(n) ? n : null; }
                    var k = constants.filter(function(d) { return !isFuncConst(d); })
                        .filter(function(d) { return d.name && d.name.toLowerCase() === s.toLowerCase(); })[0];
                    if (k && typeof evalConstNumeric === 'function') {
                        var v = evalConstNumeric(k);
                        return isFinite(v) ? v : null;
                    }
                    return null;
                }
                function out(a) { var v = fn(a); return isFinite(v) ? '(' + v + ')' : null; }
                result = result.replace(new RegExp('(^|[^\\p{L}\\p{N}_])' + nm + B + '\\s*\\(\\s*' + ARG + '\\s*\\)', 'giu'),
                    function(m, pre, arg) { var a = argNum(arg); if (a == null) return m; var r = out(a); return r == null ? m : pre + r; });
                result = result.replace(new RegExp('(^|[-+*/^(]\\s*)' + nm + B + '\\s+' + ARG, 'giu'),
                    function(m, pre, arg) { var a = argNum(arg); if (a == null) return m; var r = out(a); return r == null ? m : pre + r; });
                result = result.replace(new RegExp('(^|[^\\p{L}\\p{N}_)])' + ARG + '\\s+' + nm + B + '(?=\\s*(?:$|[-+*/^)]))', 'giu'),
                    function(m, pre, arg) { var a = argNum(arg); if (a == null) return m; var r = out(a); return r == null ? m : pre + r; });
            });
            if (result === before) break;
        }
        return result;
    }
    function resolveCalcConstants(raw, options) {
        var opts = options || {};
        var constants = opts.constants || [];
        if (!constants.length) return raw;
        var result = resolveFunctionConstants(raw, opts);
        for (var pass = 0; pass < 5; pass++) {
            var before = result;
            constants.forEach(function(c) {
                if (!c.name || c.kind === 'unit' || isFuncConst(c)) return;
                var escaped = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                var val = String(c.value).trim();
                var info = classifyConstValue(val);
                var sub = info.sub;
                if (c.unit && info.mode === 'simple' && /^-?[\d.,]+$/.test(info.norm)) {
                    var u = knownConstUnit(c.unit, opts);
                    if (u) sub = info.norm + ' ' + u;
                }
                var re = new RegExp('(^|[^\\p{L}\\p{N}_])(' + escaped + ')(?![\\p{L}\\p{N}_])', 'giu');
                result = result.replace(re, function(_m, pre) { return pre + sub; });
            });
            if (result === before) break;
        }
        return result;
    }
    function evalRouteCost(raw) {
        var s = _plFold(raw).replace(',', ',');
        if (!s) return null;
        var dist = s.match(/([\d.,]+)\s*km\b/);
        var cons = s.match(/([\d.,]+)\s*l(?:itr[a-z]*)?\s*\/?\s*(?:(?:na|per)\s*)?100/);
        var price = s.match(/([\d.,]+)\s*(?:zł|zl|pln)\s*\/?\s*(?:l\b|litr[a-z]*)/);
        if (!dist || !cons || !price) return null;
        var D = parseFloat(dist[1].replace(',', '.'));
        var C = parseFloat(cons[1].replace(',', '.'));
        var P = parseFloat(price[1].replace(',', '.'));
        if (!isFinite(D) || !isFinite(C) || !isFinite(P)) return null;
        var liters = D / 100 * C;
        var cost = liters * P;
        return {
            value: cost, unit: 'zł', kind: 'money',
            text: _formatLocaleNumber(cost, 2) + ' zł (paliwo: ' + _formatLocaleNumber(liters, 2) + ' l)'
        };
    }

    /* ============================================================
       [PL] Podsilnik STREF CZASOWYCH — OFFLINE przez Intl (z DST, bez sieci).
            Raycast-style: „time in Tokyo", „czas w Kioto", „5pm ldn in sf" (zegar).
            Skróty miast w MATM0_DATA.TZ_CITY; pre pozycje: w / we / in / w/in.
       ============================================================ */
    var _TZ_PREP = '(?:w\\/in|w|we|in)'; // [EN] PL „w" + EN „in" (+ opcjonalnie „w/in")
    var _TZ_CITY = DATA.TZ_CITY || {}; // [EN] alias → IANA tz; tablica w js/data-tables.js
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

    // ── Preprocess (faza 1 ekstrakcji) — skróty PL/EN, VAT, %, trig ──
    // [EN] plain decimal string — no exponential notation (shorthands + units)
    function _plainDecimalStr(x) {
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
    // [EN] tys/mln/k → liczby PRZED resolveCalcCurrency („2,5k zł" musi stać się „2500 zł")
    function expandNumericShorthands(raw) {
        raw = raw.replace(/([\d.,]+)\s*(?:tys\.?|tysi[aą]c[a-z]*)\b/gi,
            function(_, n) { return _plainDecimalStr(parseFloat(n.replace(',', '.')) * 1000); });
        raw = raw.replace(/([\d.,]+)\s*(?:mln\.?|milion[a-z]*)\b/gi,
            function(_, n) { return _plainDecimalStr(parseFloat(n.replace(',', '.')) * 1000000); });
        raw = raw.replace(/([\d.,]+)[kK](?![a-zA-Ząćęłńóśźż0-9])/g,
            function(_, n) { return _plainDecimalStr(parseFloat(n.replace(',', '.')) * 1000); });
        return raw;
    }
    // [EN] Waluta przed k: „usd 1k" → „usd 1000" (opts.fxRates — token map jak w resolveCurrency)
    function expandCurrencyShorthands(raw, options) {
        var opts = options || {};
        var tokenRe = _currencyTokenRe(_currencyTokenMap(opts.fxRates || {}));
        if (!tokenRe) return raw;
        return raw.replace(new RegExp('\\b(' + tokenRe + ')\\s*([\\d.,]+)[kK](?![a-zA-Ząćęłńóśźż0-9])', 'gi'),
            function(_, tok, n) { return tok + ' ' + _plainDecimalStr(parseFloat(n.replace(',', '.')) * 1000); });
    }
    function resolveTrigDegrees(raw) {
        raw = String(raw);
        raw = raw.replace(
            /\b(asind|acosd|atand)\s*\(\s*([^()]+?)\s*\)/gi,
            function(_, fn, inner) {
                var core = fn.replace(/d$/i, '');
                return '(' + core + '(' + inner.trim().replace(/,/g, '.') + ')*180/pi)';
            });
        raw = raw.replace(
            /\b(sind|cosd|tand)\s*\(\s*([^()]+?)\s*\)/gi,
            function(_, fn, inner) {
                var core = fn.replace(/d$/i, '');
                return core + '(' + inner.trim().replace(/,/g, '.') + '*pi/180)';
            });
        raw = raw.replace(
            /\b(sin|cos|tan|asin|acos|atan)\s*\(\s*([^()]+?)\s*\)/gi,
            function(match, fn, inner) {
                var dm = inner.trim().match(/^([\d.,]+)\s*(?:deg|°|stopni(?:e|a|ach)?)\s*$/i);
                if (!dm) return match;
                var deg = parseFloat(dm[1].replace(',', '.'));
                if (!isFinite(deg)) return match;
                var rad = deg + '*pi/180';
                if (/^a/.test(fn)) return '(' + fn + '(' + rad + ')*180/pi)';
                return fn + '(' + rad + ')';
            });
        return raw;
    }
    function parseNaturalShortcuts(raw) {
        raw = _plFold(raw);
        raw = raw.replace(/−/g, '-');
        raw = raw.replace(/([\d.,]+)\s+procent[a-z]*/gi, function(_, n) { return n + '%'; });
        raw = raw.replace(/\bpo[łl]owa\s+([\d.,]+)/gi,        '($1/2)');
        raw = raw.replace(/\bpó[łl]\s+([\d.,]+)/gi,           '($1/2)');
        raw = raw.replace(/\bpol\s+([\d.,]+)/gi,               '($1/2)');
        raw = raw.replace(/\bjedna\s+trzecia\s+([\d.,]+)/gi,   '($1/3)');
        raw = raw.replace(/\btrzecia\s+([\d.,]+)/gi,           '($1/3)');
        raw = raw.replace(/\bjedna\s+czwarta\s+([\d.,]+)/gi,   '($1/4)');
        raw = raw.replace(/\bczwarta\s+([\d.,]+)/gi,           '($1/4)');
        raw = raw.replace(/\bhalf\s+of\s+([\d.,]+)/gi,        '($1/2)');
        raw = raw.replace(/\bone\s+third\s+of\s+([\d.,]+)/gi, '($1/3)');
        raw = raw.replace(/\ba\s+third\s+of\s+([\d.,]+)/gi,   '($1/3)');
        raw = raw.replace(/\bone\s+fourth\s+of\s+([\d.,]+)/gi,'($1/4)');
        raw = raw.replace(/\ba\s+fourth\s+of\s+([\d.,]+)/gi,  '($1/4)');
        raw = raw.replace(/\b([\d.,]+)\s+(?:po[łl]owa|pó[łl]|pol)\b/gi, '($1/2)');
        raw = raw.replace(/\b([\d.,]+)\s+half\b/gi, '($1/2)');
        raw = raw.replace(/\b([\d.,]+)\s+(?:trzecia|third)\b/gi, '($1/3)');
        raw = raw.replace(/\b([\d.,]+)\s+(?:czwarta|fourth)\b/gi, '($1/4)');
        raw = raw.replace(/(?:square\s+root\s+of|pierwiastek\s+(?:kwadratowy\s+)?z)\s+([\d.,]+)/gi,
            function(_, n) { return 'sqrt(' + n.replace(',', '.') + ')'; });
        raw = raw.replace(/(?:cube\s+root\s+of|pierwiastek\s+sze[sś]cienny\s+z)\s+([\d.,]+)/gi,
            function(_, n) { return '(' + n.replace(',', '.') + '^(1/3))'; });
        raw = raw.replace(/([\d.,]+)\s+(?:power|do\s+pot[eę]gi|podniesiony\s+do\s+pot[eę]gi)\s+([\d.,]+)/gi,
            function(_, b, e) { return '(' + b.replace(',', '.') + '^' + e.replace(',', '.') + ')'; });
        raw = raw.replace(/pot[eę]gi\s+([\d.,]+)\s+z\s+([\d.,]+)/gi,
            function(_, e, b) { return '(' + b.replace(',', '.') + '^' + e.replace(',', '.') + ')'; });
        raw = raw.replace(/([\d.,]+)\s+raised\s+to\s+(?:the\s+)?power\s+([\d.,]+)/gi,
            function(_, b, e) { return '(' + b.replace(',', '.') + '^' + e.replace(',', '.') + ')'; });
        raw = raw.replace(/(?:ratio\s+of|proporcja|stosunek)\s+([\d.,]+)\s+(?:to|do)\s+([\d.,]+)/gi,
            function(_, a, b) { return '(' + a.replace(',', '.') + '/' + b.replace(',', '.') + ')'; });
        raw = raw.replace(/([\d.,]+)\s+(?:to|do)\s+([\d.,]+)\s+(?:proporcja|stosunek|ratio)/gi,
            function(_, a, b) { return '(' + a.replace(',', '.') + '/' + b.replace(',', '.') + ')'; });
        raw = raw.replace(/([\d.,]+)%\s+(?:tip|napiwek)\s+(?:on|na)\s+([\d.,]+)/gi,
            function(_, p, b) { return '(' + b.replace(',', '.') + '*(1+' + p.replace(',', '.') + '/100))'; });
        raw = raw.replace(/\b(?:tip|napiwek)\s+([\d.,]+)%\s+(?:on|na)\s+([\d.,]+)/gi,
            function(_, p, b) { return '(' + b.replace(',', '.') + '*(1+' + p.replace(',', '.') + '/100))'; });
        raw = raw.replace(/([\d.,]+)%\s+(?:off|rabat[u]?|zni[zż]k[aię]?)\s+(?:na|od|z|on)?\s*([\d.,]+)/gi,
            function(_, p, b) { return '(' + b.replace(',', '.') + '*(1-' + p.replace(',', '.') + '/100))'; });
        raw = raw.replace(/\b(?:off|rabat[u]?|zni[zż]k[aię]?)\s+([\d.,]+)%\s+(?:na|od|z|on)?\s*([\d.,]+)/gi,
            function(_, p, b) { return '(' + b.replace(',', '.') + '*(1-' + p.replace(',', '.') + '/100))'; });
        raw = raw.replace(/([\d.,]+)%\s+(?:narzut[u]?|mar[zż][ae]?|markup)\s+(?:na|od|do|on)?\s*([\d.,]+)/gi,
            function(_, p, b) { return '(' + b.replace(',', '.') + '*(1+' + p.replace(',', '.') + '/100))'; });
        raw = raw.replace(/\b(?:narzut[u]?|mar[zż][ae]?|markup)\s+([\d.,]+)%\s+(?:na|od|do|on)?\s*([\d.,]+)/gi,
            function(_, p, b) { return '(' + b.replace(',', '.') + '*(1+' + p.replace(',', '.') + '/100))'; });
        function _vatRate(r) { var v = r != null ? parseFloat(String(r).replace(',', '.')) : 23; return isFinite(v) && v >= 0 ? v : 23; }
        function _vatBrutto(x, r) { return '(' + x.replace(',', '.') + '*(1+' + _vatRate(r) + '/100))'; }
        function _vatNetto(x, r) { return '(' + x.replace(',', '.') + '/(1+' + _vatRate(r) + '/100))'; }
        raw = raw.replace(/\b(?:brutto|gross)\s+([\d.,]+)(?:\s+([\d.,]+)\s*%)?/gi,
            function(_, x, r) { return _vatBrutto(x, r); });
        raw = raw.replace(/([\d.,]+)\s+(?:brutto|gross)\b(?:\s+([\d.,]+)\s*%)?/gi,
            function(_, x, r) { return _vatBrutto(x, r); });
        raw = raw.replace(/\b(?:netto|net)\s+([\d.,]+)(?:\s+([\d.,]+)\s*%)?/gi,
            function(_, x, r) { return _vatNetto(x, r); });
        raw = raw.replace(/([\d.,]+)\s+(?:netto|net)\b(?:\s+([\d.,]+)\s*%)?/gi,
            function(_, x, r) { return _vatNetto(x, r); });
        raw = raw.replace(/([\d.,]+)\s*([+\-])\s*(?:vat|tax)(?:\s+([\d.,]+)\s*%)?/gi,
            function(_, a, op, r) {
                a = a.replace(',', '.');
                var f = '(1+' + _vatRate(r) + '/100)';
                return '(' + a + (op === '-' ? '/' : '*') + f + ')';
            });
        raw = raw.replace(/\b(?:vat|tax)(?:\s+([\d.,]+)\s*%)?\s+(?:od|from|of|on)\s+([\d.,]+)/gi,
            function(_, r, x) { return '(' + x.replace(',', '.') + '*' + _vatRate(r) + '/100)'; });
        raw = raw.replace(/([\d.,]+)\s+(?:vat|tax)(?:\s+([\d.,]+)\s*%)?\s+(?:od|from|of|on)\b/gi,
            function(_, x, r) { return '(' + x.replace(',', '.') + '*' + _vatRate(r) + '/100)'; });
        raw = raw.replace(/dodaj\s+([\d.,]+)%\s+do\s+([\d.,]+)/gi,
            function(_, p, b) { return '(' + b.replace(',', '.') + '*(1+' + p.replace(',', '.') + '/100))'; });
        raw = raw.replace(/add\s+([\d.,]+)%\s+to\s+([\d.,]+)/gi,
            function(_, p, b) { return '(' + b.replace(',', '.') + '*(1+' + p.replace(',', '.') + '/100))'; });
        raw = raw.replace(/odejmij\s+([\d.,]+)%\s+od\s+([\d.,]+)/gi,
            function(_, p, b) { return '(' + b.replace(',', '.') + '*(1-' + p.replace(',', '.') + '/100))'; });
        raw = raw.replace(/subtract\s+([\d.,]+)%\s+from\s+([\d.,]+)/gi,
            function(_, p, b) { return '(' + b.replace(',', '.') + '*(1-' + p.replace(',', '.') + '/100))'; });
        raw = raw.replace(/([\d.,]+)\s*\+\s*dodaj\s+([\d.,]+)%/gi,
            function(_, b, p) { return '(' + b.replace(',', '.') + '*(1+' + p.replace(',', '.') + '/100))'; });
        raw = raw.replace(/([\d.,]+)\s*\+\s*add\s+([\d.,]+)%/gi,
            function(_, b, p) { return '(' + b.replace(',', '.') + '*(1+' + p.replace(',', '.') + '/100))'; });
        raw = raw.replace(/([\d.,]+)%\s+(?:z|of)\s+([\d.,]+)%/gi,
            function(_, p, q) { return '(' + p.replace(',', '.') + '*' + q.replace(',', '.') + '/100)'; });
        raw = raw.replace(/([\d.,]+)%\s+(?:z|of)\s+([\d.,]+)/gi, '($2*$1/100)');
        raw = raw.replace(/([\d.,]+)\s+(?:z|of)\s+([\d.,]+)%/gi, '($1*$2/100)');
        raw = raw.replace(/([\d.,]+)%\s+od\s+([\d.,]+)/gi, '($2*(1-$1/100))');
        var _pctRe = /^([^%]*[^%\s])\s*([+\-])\s*([\d.,]+)%(?=\s*(?:[+\-]|$))/;
        for (var _pctGuard = 0; _pctRe.test(raw) && _pctGuard < 40; _pctGuard++) {
            raw = raw.replace(_pctRe, function(_, base, op, b) {
                return '(' + base + ')' + op + '((' + base + ')*' + b.replace(',', '.') + '/100)';
            });
        }
        raw = raw.replace(/([\d.,]+)%/g, '($1/100)');
        return raw;
    }
    // [EN] strip helpers — notepad first-unit mode (faza 5, wcześniej app.js)
    function _stripCurrencyAmounts(raw, fxRates) {
        var tokenRe = _currencyTokenRe(_currencyTokenMap(fxRates || {}));
        if (!tokenRe) return raw;
        var amountRe = new RegExp('([\\d.,]+)\\s*(' + tokenRe + ')(?![a-ząćęłńóśźż0-9])', 'gi');
        var revAmountRe = new RegExp('\\b(' + tokenRe + ')\\s*([\\d.,]+)(?![a-ząćęłńóśźż0-9])', 'gi');
        var out = String(raw || '').replace(amountRe, '$1');
        return out.replace(revAmountRe, '$2');
    }
    function _stripPhysicalUnits(raw, unitNamesRe) {
        if (!unitNamesRe) return raw;
        var unitRe = new RegExp('([\\d.,]+)\\s*(' + unitNamesRe + ')(?![A-Za-z0-9])', 'gi');
        return String(raw || '').replace(unitRe, '$1');
    }
    function _preferredDisplayUnit(cat, opts) {
        var du = (opts && opts.defaultUnits) || {};
        var unitDefs = (opts && opts.unitDefs) || {};
        var unitDisplay = (opts && opts.unitDisplay) || {};
        var name = du[cat];
        if (!name || name === '__auto__') return null;
        var key = String(name).toLowerCase();
        var def = unitDefs[key];
        if (!def || def.cat !== cat) return null;
        return { label: unitDisplay[key] || name, factor: def.factor };
    }
    function _inflectDisplayUnit(value, unit) {
        var F = _fmt();
        if (F.inflectDisplayUnit) return F.inflectDisplayUnit(value, unit);
        return unit;
    }
    // [EN] faza 5 — orkiestrator pipeline evalCalcExpression (plain object, bez STATE)
    /** @typedef {Object} EvaluateResult
     *  @property {number|null} [value] wynik liczbowy (null gdy brak / bigint-only)
     *  @property {string|null} [unit] etykieta jednostki wyświetlanej
     *  @property {string|null} [text] tekst daty/czasu/czytelny czas (override formatCalcResult)
     *  @property {string|null} [error] np. '∞'
     *  @property {'number'|'duration'|'clock'|'date'|'money'|'physical'|null} [kind]
     *  @property {boolean} [exact=false] false → UI pokazuje ≈
     *  @property {string|null} [exactText] dokładna forma dla hintu ≈
     *  @property {number|null} [preciseValue] przed zaokr. waluty (hint kursu FX)
     *  @property {boolean} [pendingFx] czeka na kursy — app zwraca makeVal({ pendingFx: true })
     *  @property {boolean} [big] ścieżka BigInt (>15 cyfr)
     *  @property {string|null} [bigStr] surowy wynik BigInt
     *  @property {boolean} [_stateClear] wewnętrzne — TZ: app zeruje STATE.calc.lastResult
     *  @property {string} [_debugCode] tylko opts.debug — kod przyczyny pustego wyniku
     *  @property {string|null} [_debugDetail] tylko opts.debug — szczegół (np. message wyjątku) */
    /** @param {string} raw wyrażenie użytkownika
     *  @param {Object} [options] fxRates, fxReady, constants, lastAnswer, unitDefs, …, debug
     *  @returns {EvaluateResult} plain object — app opakowuje makeVal() */
    function _dbgFail(opts, code, detail) { // [EN] opts.debug → diagnostyka zamiast cichego {}
        if (!opts || !opts.debug) return {};
        return { _debugCode: code, _debugDetail: detail != null ? String(detail) : null };
    }
    function evaluate(raw, options) {
        var opts = options || {};
        var firstUnitWins = !!opts.firstUnitWins;
        var original = String(raw || '').trim();
        if (!original) return _dbgFail(opts, 'empty_input');
        var fxRates = opts.fxRates || {};
        var currencyOpts = {
            fxRates: fxRates,
            fxReady: !!opts.fxReady,
            defaultCurrency: opts.defaultCurrency || 'PLN',
            currencyCompactSymbols: opts.currencyCompactSymbols !== false,
        };
        var constOpts = {
            constants: opts.constants,
            unitDefs: opts.unitDefs || {},
            fxRates: fxRates,
            evalConstNumeric: opts.evalConstNumeric,
        };
        var unitOpts = {
            firstUnitWins: firstUnitWins,
            unitDefs: opts.unitDefs || {},
            unitDisplay: opts.unitDisplay || {},
            unitNamesRe: opts.unitNamesRe || '',
            defaultUnits: opts.defaultUnits || {},
        };
        var clockRes = evalClockExpression(original);
        if (clockRes) {
            return { value: clockRes.value, text: clockRes.text, kind: clockRes.kind || 'clock', exact: clockRes.exact, exactText: clockRes.exactText };
        }
        var tzRes = evalTimezoneExpression(original);
        if (tzRes) {
            return { value: tzRes.value, text: tzRes.text, kind: tzRes.kind || 'clock', exact: tzRes.exact !== false, _stateClear: true };
        }
        var dateRes = evalDateExpression(original);
        if (dateRes) {
            return { value: dateRes.value, text: dateRes.text, kind: 'date' };
        }
        var pctBaseQ = evalPercentBaseQuery(original, currencyOpts);
        if (pctBaseQ) return pctBaseQ;
        var pctOfPct = evalPercentOfPercent(original);
        if (pctOfPct) return pctOfPct;
        var pctQ = evalPercentQuery(original);
        if (pctQ) return pctQ;
        var pctDiffQ = evalPercentDifference(original);
        if (pctDiffQ) return pctDiffQ;
        var periodPctQ = evalPeriodPercentage(original);
        if (periodPctQ) return periodPctQ;
        var routeQ = evalRouteCost(original);
        if (routeQ) return routeQ;
        try {
            var expr = original;
            expr = resolveCalcConstants(expr, constOpts);
            expr = expandNumericShorthands(expr);
            expr = expandCurrencyShorthands(expr, { fxRates: fxRates });
            var unitMix = firstUnitWins ? analyzeUnitMix(expr, {
                fxRates: fxRates,
                unitDefs: unitOpts.unitDefs,
                unitNamesRe: unitOpts.unitNamesRe,
            }) : null;
            var unitHits = (unitMix && unitMix.hits) || [];
            var useFirstWins = !!(firstUnitWins && unitMix && unitMix.needsFirstWins);
            var firstHit = useFirstWins && unitHits.length ? unitHits[0] : null;
            if (useFirstWins && firstHit && firstHit.kind === 'physical' && !firstHit.dimensionless) {
                expr = _stripCurrencyAmounts(expr, fxRates);
            }
            var curRes = resolveCurrencyExpression(expr, currencyOpts);
            if (curRes.pending) return { pendingFx: true };
            expr = curRes.expr;
            if (useFirstWins && firstHit && firstHit.kind === 'currency') {
                expr = _stripPhysicalUnits(expr, unitOpts.unitNamesRe);
            }
            expr = parseNaturalShortcuts(expr);
            expr = resolveCalcAnswer(expr, opts.lastAnswer);
            expr = resolveTrigDegrees(expr);
            var _NUM = _numeric();
            var bigStr = _NUM.tryBigIntCalc ? _NUM.tryBigIntCalc(expr) : null;
            if (bigStr !== null) {
                var bigNeeded = /\d{16,}/.test(expr.replace(/\s+/g, '')) ||
                    bigStr.replace('-', '').length > 15;
                if (bigNeeded) {
                    return {
                        big: true, bigStr: bigStr,
                        text: _NUM.groupBigIntStr ? _NUM.groupBigIntStr(bigStr) : bigStr,
                        kind: 'number',
                    };
                }
            }
            var unitResult = resolveUnitsExpression(expr, unitOpts);
            expr = unitResult.expr;
            var unitDefs = unitOpts.unitDefs;
            var unitIsCustom = unitResult.cat && String(unitResult.cat).indexOf('custom:') === 0;
            var customKey = unitIsCustom ? String(unitResult.cat).slice('custom:'.length) : null;
            var unitIsDimensionless = customKey && unitDefs[customKey] && unitDefs[customKey].dimensionless;
            if (curRes.hasCurrency && unitResult.unit !== null && !unitIsDimensionless && !useFirstWins) {
                return _dbgFail(opts, 'unit_mix', 'currency+physical without firstUnitWins');
            }
            var unit = curRes.hasCurrency ? curRes.unit : unitResult.unit;
            if (opts.keepWorkCurrency && curRes.hasCurrency && curRes.workCode) {
                unit = _currencyDisplay(curRes.workCode, { currencyCompactSymbols: currencyOpts.currencyCompactSymbols });
            }
            expr = expr.replace(/,(?=\d)/g, '.');
            expr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
            expr = expr.replace(/\s+/g, '');
            if (!expr) return _dbgFail(opts, 'empty_expr');
            var fn = _NUM.compileGraphExpression ? _NUM.compileGraphExpression(expr) : null;
            if (!fn) return _dbgFail(opts, 'no_numeric', 'MATM0_NUMERIC.compileGraphExpression missing');
            var value = fn(0);
            if (!curRes.hasCurrency && unitResult.workFactor) value = value * unitResult.workFactor;
            if (curRes.hasCurrency && curRes.curMul && isFinite(value) && !opts.keepWorkCurrency) value = value * curRes.curMul;
            var preciseValue = null;
            if (curRes.hasCurrency && isFinite(value)) {
                preciseValue = value;
                value = _roundMoney(value);
            }
            var valueBase = value;
            if (!curRes.hasCurrency && unitResult.displayFactor) value = value / unitResult.displayFactor;
            var _QTY = (typeof window !== 'undefined' && window.MATM0_QTY) ||
                (typeof self !== 'undefined' && self.MATM0_QTY) || null;
            var _autoMode = (opts.defaultUnits || {})[unitResult.cat] === '__auto__';
            if (!curRes.hasCurrency && unitResult.cat && isFinite(valueBase) && _QTY &&
                _autoMode && unitResult.cat !== 'time' && !unitResult.explicitConvert &&
                Math.abs(valueBase) > 0) {
                var _autoU = _QTY.chooseUnit(unitResult.cat, valueBase);
                var _autoInfo = _autoU && _QTY.unitInfo ? _QTY.unitInfo(_autoU) : null;
                if (_autoInfo) {
                    value = valueBase / _autoInfo.factor;
                    unit = (opts.unitDisplay || {})[_autoU] || _autoU;
                }
            }
            if (!isFinite(value)) return { value: Infinity, unit: unit, error: '∞', kind: 'number' };
            if (Math.abs(value) < 1e308 && value !== 0 &&
                !(Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER)) {
                value = parseFloat(value.toPrecision(15));
            }
            if (unit) unit = _inflectDisplayUnit(value, unit);
            var valKind = curRes.hasCurrency ? 'money' : (unitResult.cat ? (unitResult.cat === 'time' ? 'duration' : 'physical') : 'number');
            var _timeDu = (opts.defaultUnits || {}).time;
            var readableTime = null;
            if (!curRes.hasCurrency && unitResult.cat === 'time' && !unitResult.explicitConvert &&
                (_timeDu === '' || _timeDu === '__auto__') && !_preferredDisplayUnit('time', opts) &&
                isFinite(unitResult.valueInBase) && typeof formatDurationSeconds === 'function') {
                readableTime = formatDurationSeconds(unitResult.valueInBase);
            }
            var approxNum = false, exactNumText = null;
            if (isFinite(value) && !Number.isInteger(value)) {
                var disp6 = Number(value.toFixed(6));
                if (Math.abs(value - disp6) > Math.abs(value) * 1e-12) {
                    approxNum = true;
                    exactNumText = _formatLocaleNumber(value, 15) + (unit ? ' ' + unit : '');
                }
            }
            return {
                value: value, unit: unit, text: readableTime, kind: valKind,
                exact: !approxNum, exactText: exactNumText, preciseValue: preciseValue,
            };
        } catch (err) {
            return _dbgFail(opts, 'parse_error', err && err.message);
        }
    }
    // [EN] przed walutą: k/tys + „usd 1k"; po walucie: NL + trig (app.js woła w dwóch miejscach pipeline)
    function preprocessShorthands(raw, options) {
        return expandCurrencyShorthands(expandNumericShorthands(raw), options);
    }
    function preprocessNatural(raw) {
        return resolveTrigDegrees(parseNaturalShortcuts(raw));
    }

    var API = {
        buildUnitRegistry: buildUnitRegistry,
        resolveCurrencyExpression: resolveCurrencyExpression,
        currencyTokenMap: _currencyTokenMap,
        currencyTokenRe: _currencyTokenRe,
        currencyDisplay: _currencyDisplay,
        hasCurrencyInInput: hasCurrencyInInput,
        resolveUnitsExpression: resolveUnitsExpression,
        analyzeUnitMix: analyzeUnitMix,
        time: _TIME,                       // prymityw czasu (parseSeconds, units, base)
        parseDurationMinutes: _parseDuration,
        evalClockExpression: evalClockExpression,
        evalDateExpression: evalDateExpression,
        evalPeriodPercentage: evalPeriodPercentage,
        evalPercentQuery: evalPercentQuery,
        evalPercentOfPercent: evalPercentOfPercent,
        evalPercentDifference: evalPercentDifference,
        evalPercentBaseQuery: evalPercentBaseQuery,
        classifyConstValue: classifyConstValue,
        valueIsFunc: valueIsFunc,
        isFuncConst: isFuncConst,
        funcConstBody: funcConstBody,
        knownConstUnit: knownConstUnit,
        resolveCalcAnswer: resolveCalcAnswer,
        resolveCalcConstants: resolveCalcConstants,
        resolveFunctionConstants: resolveFunctionConstants,
        evalRouteCost: evalRouteCost,
        evaluate: evaluate,
        formatDurationSeconds: formatDurationSeconds,
        evalTimezoneExpression: evalTimezoneExpression,
        isDateUnit: _isDateUnit,           // app.js używa go też w rozpoznawaniu tokenów notatnika
        plainDecimalStr: _plainDecimalStr,
        expandNumericShorthands: expandNumericShorthands,
        expandCurrencyShorthands: expandCurrencyShorthands,
        parseNaturalShortcuts: parseNaturalShortcuts,
        resolveTrigDegrees: resolveTrigDegrees,
        preprocessShorthands: preprocessShorthands,
        preprocessNatural: preprocessNatural,
        setTodayForTests: function(d) { _todayOverride = d ? new Date(d.getTime()) : null; },
        clearTodayForTests: function() { _todayOverride = null; },
        setNowForTests: function(d) { _nowOverride = d ? new Date(d.getTime()) : null; },
        clearNowForTests: function() { _nowOverride = null; }
    };
    if (typeof window !== 'undefined') window.MATM0_PARSER = API;
    if (typeof self !== 'undefined') self.MATM0_PARSER = API;
})();
