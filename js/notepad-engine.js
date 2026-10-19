/* ============================================================
   [EN] Notepad line-eval engine — razem/suma, @vars, auto-units, labels.
   Extracted from app.js; wire via MATM0_NP_ENGINE.createEngine(deps).
   ============================================================ */
(function () {
    'use strict';

    var LINE_THRESHOLD = 120;

    var _NP_LABEL_RE = /^([^:]*\p{L}[^:]*):\s*(.+)$/u;
    var _NP_GLOBAL_RE = /^@\s*([\p{L}][\p{L}\p{N}_]*)\s*:\s*(.+)$/u;
    var _NP_TOTAL_RE = /^(razem|suma|total)$/i;
    var _NP_SUBTOTAL_RE = /^(subtotal|półsuma|podsuma)$/i;
    var _NP_SECTION_RE = /^-{3,}\s*$/;
    var _NP_SUM_UNIT_LINE_RE = /^(razem|suma|total|subtotal|półsuma|podsuma)\s*(?:\(\s*([\p{L}][\p{L}.]*)\s*\))?$/iu;
    var _NP_SUM_MANUAL_UNIT_RE = /\b(razem|suma|total|subtotal|półsuma|podsuma)\s*\(\s*([\p{L}][\p{L}.]*)\s*\)/giu;
    // Faza 2 smart notatek: sekcje, suma całej notatki, pozycje na minus.
    var _NP_HEADING_MARK_RE = /^[\uE013\uE015\uE017]/;                 // nagłówek H1–H3 z paska formatowania
    var _NP_HASH_HEADING_RE = /^#{1,3}\s+\S/;                           // „# Transport”
    var _NP_LABEL_ONLY_RE = /^[^:\d]*\p{L}[^:\d]*:\s*$/u;               // „Transport:” (etykieta bez wartości)
    var _NP_GRAND_RE = /^(suma\s+wszystkiego|razem\s+wszystko|suma\s+ca[łl]o[śs]ci|[łl][ąa]cznie|og[óo][łl]em)$/i;
    // granica słowa po literach Unicode — „\b” w JS nie widzi „ł” jako litery („łącznie / 4” nie łapało)
    var _NP_GRAND_WORDS_RE = /(^|[^\p{L}\p{N}_])(suma\s+wszystkiego|razem\s+wszystko|suma\s+ca[łl]o[śs]ci|[łl][ąa]cznie|og[óo][łl]em)(?![\p{L}\p{N}_])/giu;
    // Linia zaczynająca się od tych słów ODEJMUJE się od sumy („Zaliczka od Ani 200 zł” → −200 zł w razem).
    var _NP_MINUS_RE = /^(zaliczk|zadat|wp[łl]at|wp[łl]acon|zap[łl]acon|op[łl]acon|rabat|zni[żz]k|upust|opust|zwrot|odlicz|minus|bon\b|kupon|dofinans|refundac|sp[łl]at)/i;
    var _NP_STOP = { 'na': 1, 'do': 1, 'w': 1, 'z': 1, 'i': 1, 'od': 1, 'to': 1, 'in': 1, 'oraz': 1, 'a': 1, 'po': 1, 'za': 1, 'lub': 1, 'albo': 1, 'ile': 1, 'dni': 1 };

    function createEngine(deps) {
        var CALC_UNITS = deps.calcUnits;
        var CALC_UNIT_DISPLAY = deps.calcUnitDisplay;
        var evalCalc = deps.evalCalc;
        var formatCalcResult = deps.formatCalcResult;
        var formatLocaleNumber = deps.formatLocaleNumber;
        var inflectDisplayUnit = deps.inflectDisplayUnit;
        var currencyTokenMap = deps.currencyTokenMap;
        var currencyDisplay = deps.currencyDisplay;
        var knownConstUnit = deps.knownConstUnit;
        var isDateUnit = deps.isDateUnit;
        var rebuildUnitNamesRe = deps.rebuildUnitNamesRe;
        function _npFmtReg() { // [EN] MATM0_NP_FMT registry — nie mylić z _npFmt(val) liczbowym
            return (typeof window !== 'undefined' && window.MATM0_NP_FMT) ||
                (typeof self !== 'undefined' && self.MATM0_NP_FMT) || null;
        }
        function _depSettings() { return deps.settings || {}; }
        function _depConstants() { return deps.constants || []; }
        function _depGlobals() { return deps.globals || {}; }

        function _npParseAlign(line) { // T6-4 — strip prefix przed ewaluacją / renderem mirror
            var s = String(line || '');
            if (s.startsWith('> ')) return { align: 'right', body: s.slice(2) };
            if (s.startsWith('< ')) return { align: 'center', body: s.slice(2) };
            if (s.startsWith('| ')) return { align: 'justify', body: s.slice(2) };
            return { align: 'left', body: s };
        }

        function _npStripFormatMarkers(s) { // T6-5/6 — delegacja do rejestru formatów
            var FMT = _npFmtReg();
            if (FMT && typeof FMT.stripMarkers === 'function') return FMT.stripMarkers(s);
            var t = String(s || '');
            t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
            t = t.replace(/__([^_]+)__/g, '$1');
            t = t.replace(/~~([^~]+)~~/g, '$1');
            t = t.replace(/::([^:\n]+)::/g, '$1');
            // [EN] word-boundary italic — nie zjadaj p_foo_bar / @p_name
            t = t.replace(/(^|[^\p{L}\p{N}_])_([^_\n]{2,})_(?=[^\p{L}\p{N}_]|$)/gu, '$1$2');
            return t;
        }

        function prepareLine(raw) {
            var a = _npParseAlign(String(raw || '').trim());
            return { align: a.align, body: a.body, evalText: _npStripFormatMarkers(a.body) };
        }

        function _npReplaceSumWords(str, replacer) { // [EN] fresh regex — global lastIndex nie psuje kolejnych replace
            return String(str || '').replace(/\b(razem|suma|total|subtotal|półsuma|podsuma)(\s*(?:\(\s*[\p{L}][\p{L}.]*\s*\))?)/giu, replacer);
        }

        function _npFmt(v) { return formatLocaleNumber(v, 10); }

        function _npEvalOpts() { // [EN] notepad-only eval flags from settings
            var opts = { keepWorkCurrency: true }; // [EN] @var z USD zostaje w USD, nie w domyślnym zł
            if (_depSettings().notepadUnitMix === 'first') opts.firstUnitWins = true;
            return opts;
        }

        function _npEval(expr) { return evalCalc(expr, _npEvalOpts()); }

        function _npParseSumLine(exprPart) { // [EN] pure razem / razem(zł) / półsuma(cm)
            var m = String(exprPart || '').trim().match(_NP_SUM_UNIT_LINE_RE);
            if (!m) return null;
            return { keyword: m[1], manualUnit: m[2] ? m[2].trim() : null };
        }

        function _npNormalizeSumUnit(raw) { // [EN] usd→USD, zł→zł, warzyw→warzyw
            if (!raw) return null;
            var s = String(raw).trim();
            if (!s) return null;
            var k = s.toLowerCase();
            if (currencyTokenMap()[k]) return currencyDisplay(currencyTokenMap()[k]);
            if (CALC_UNITS[k]) return CALC_UNIT_DISPLAY[k] || s;
            return s;
        }

        function _npInferSumUnit(units) { // [EN] inherit only when every item shares the same unit
            if (!units || !units.length) return null;
            var seen = null, hasNull = false, hasUnit = false;
            for (var i = 0; i < units.length; i++) {
                var u = units[i];
                if (!u) { hasNull = true; continue; }
                hasUnit = true;
                if (seen === null) seen = u;
                else if (seen !== u) return null;
            }
            if (hasNull && hasUnit) return null; // np. 100 zł + 50 (bez jednostki)
            return seen;
        }

        function _npSumUnitForLine(exprPart, itemUnits) { // [EN] manual (…) beats setting inherit
            var parsed = _npParseSumLine(exprPart);
            if (parsed && parsed.manualUnit) return _npNormalizeSumUnit(parsed.manualUnit);
            if (parsed && _depSettings().notepadSumUnit === 'inherit') return _npInferSumUnit(itemUnits);
            return null;
        }

        function _npIsCurrencyUnit(unit) { // [EN] zł / EUR / $ — zawsze format XX,XX
            if (!unit) return false;
            var s = String(unit).trim();
            if (!s) return false;
            var map = currencyTokenMap();
            if (map[s.toLowerCase()]) return true;
            var upper = s.toUpperCase();
            var codes = {};
            Object.keys(map).forEach(function (tok) { codes[map[tok]] = true; });
            if (codes[upper]) return true;
            for (var code in codes) {
                if (currencyDisplay(code) === s) return true;
            }
            return false;
        }

        function _npFormatMoneyOrNum(value, unit) {
            var F = (typeof self !== 'undefined' && self.MATM0_FMT) ||
                (typeof window !== 'undefined' && window.MATM0_FMT) || {};
            if (_npIsCurrencyUnit(unit)) {
                if (F.formatMoneyNumber) return F.formatMoneyNumber(value);
                return formatLocaleNumber(value, 2, 2);
            }
            return formatLocaleNumber(value, 6);
        }

        function _npFormatWithUnit(value, unit) {
            var numStr = _npFormatMoneyOrNum(value, unit);
            if (!unit) return numStr;
            return numStr + '\u202f' + inflectDisplayUnit(value, unit);
        }

        function _npVarUnitLabel(u) { // [EN] known or auto/custom token for @substitution
            if (!u) return null;
            var known = knownConstUnit(u);
            if (known) return known;
            var k = String(u).toLowerCase();
            if (CALC_UNIT_DISPLAY[k]) return CALC_UNIT_DISPLAY[k];
            return String(u).trim() || null;
        }

        function _npAutoRegisterSumUnits(text) { // [EN] razem(warzyw) → temp dimensionless unit
            var added = [];
            var re = _NP_SUM_MANUAL_UNIT_RE;
            var s = String(text || ''), m;
            re.lastIndex = 0;
            while ((m = re.exec(s)) !== null) {
                var w = m[2], k = w.toLowerCase();
                if (CALC_UNITS[k] || _npTokenKnown(w) || currencyTokenMap()[k]) continue;
                CALC_UNITS[k] = { cat: 'custom:' + k, factor: 1, base: w, custom: true, dimensionless: true, _auto: true };
                CALC_UNIT_DISPLAY[k] = w;
                added.push(k);
            }
            if (added.length) rebuildUnitNamesRe();
            return added;
        }

        function _npTokenKnown(w) {
            var k = String(w).toLowerCase();
            if (_NP_STOP[k]) return true;
            if (CALC_UNITS[k]) return true;
            if (currencyTokenMap()[k]) return true;
            if (_NP_TOTAL_RE.test(w)) return true;
            if (isDateUnit(w)) return true;
            if (_depConstants().some(function (c) { return c.name && c.name.toLowerCase() === k && c.kind !== 'unit'; })) return true;
            return false;
        }

        function _npAutoRegister(text, exclude) {
            var re = /(\d[\d.,]*)\s*([\p{L}][\p{L}.]*)/gu, m, added = [];
            while ((m = re.exec(text)) !== null) {
                var w = m[2], k = w.toLowerCase();
                if (CALC_UNITS[k] || _npTokenKnown(w) || (exclude && exclude[k])) continue; // pomiń też zmienne-etykiety
                CALC_UNITS[k] = { cat: 'custom:' + k, factor: 1, base: w, custom: true, dimensionless: true, _auto: true };
                CALC_UNIT_DISPLAY[k] = w;
                added.push(k);
            }
            if (added.length) rebuildUnitNamesRe();
            return added;
        }

        function _npAutoClear(keys) {
            if (!keys || !keys.length) return;
            keys.forEach(function (k) { if (CALC_UNITS[k] && CALC_UNITS[k]._auto) { delete CALC_UNITS[k]; delete CALC_UNIT_DISPLAY[k]; } });
            rebuildUnitNamesRe();
        }

        function _npStripProse(expr) {
            return expr.replace(/[\p{L}][\p{L}.]*/gu, function (w) { return _npTokenKnown(w) ? w : ' '; }).replace(/\s+/g, ' ').trim();
        }

        function _npVarName(label) {
            var s = String(label == null ? '' : label).trim();
            if (!/^[\p{L}][\p{L}\p{N}_]*$/u.test(s)) return null; // tylko pojedyncze słowo
            var k = s.toLowerCase();
            if (_NP_STOP[k]) return null; // spójniki — nie zmienne
            if (CALC_UNITS[k] || currencyTokenMap()[k]) return null;
            if (isDateUnit(s)) return null;
            if (_depConstants().some(function (c) { return c.name && c.name.toLowerCase() === k && c.kind !== 'unit'; })) return null;
            return k; // suma/półsuma/razem jako etykieta — OK (definicja, nie przypadkowe trafienie w tekście)
        }

        function _npSubVars(expr, vars, fmtFn, units) {
            var keys = Object.keys(vars);
            if (!keys.length) return expr;
            keys.sort(function (a, b) { return b.length - a.length; }); // dłuższe najpierw
            var out = expr;
            keys.forEach(function (k) {
                var esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                var re = new RegExp('@' + esc + '(?![\\p{L}\\p{N}_])', 'giu');
                var u = units && units[k] ? _npVarUnitLabel(units[k]) : null;
                out = out.replace(re, function () {
                    if (fmtFn) return fmtFn(vars[k]) + (u ? ' ' + u : '');
                    return '(' + vars[k] + (u ? ' ' + u : '') + ')';
                });
            });
            return out;
        }

        function _npSumKeywordVarName(exprPart, usedTotal) { // półsuma/razem/suma jako zmienna w panelu
            if (!usedTotal) return null;
            var parsed = _npParseSumLine(exprPart);
            if (parsed) return parsed.keyword.toLowerCase();
            var ep = String(exprPart || '').trim();
            if (!_NP_TOTAL_RE.test(ep) && !_NP_SUBTOTAL_RE.test(ep)) return null;
            if (!/^[\p{L}][\p{L}\p{N}_]*$/u.test(ep)) return null;
            return ep.toLowerCase();
        }

        function _npAssignVar(vars, varUnits, name, value, unit) {
            if (!name || typeof value !== 'number' || !isFinite(value)) return;
            vars[name] = value;
            varUnits[name] = unit || null;
        }

        /* ── SMART LINIA (faza 1 trybu smart notatek) ─────────────────────────────
           Uruchamiane WYŁĄCZNIE, gdy zwykłe liczenie linii dało pustkę — każda linia,
           która liczyła się wcześniej, liczy się dokładnie tak samo (jak warstwa synonimów).
           Kandydaci, w kolejności:
             1. nazwy z wcześniejszych etykiet bez „@” („nocleg * 2”),
             2. zdanie z „po / razy / przez / x / za” → iloczyn ilości
                („4 osoby po 60 zł przez 3 dni” → 4 × 60 zł × 3),
             3. jedna kwota w zdaniu („Zaliczka od Ani 200 zł” → 200 zł).
           Zwykłe słowa bez jednostki („spotkanie o 15”) NIE dają wyniku — cichy zły wynik
           jest gorszy niż brak wyniku. */
        function _npFold(s) {
            return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');
        }
        function _npIsCurrencyTok(u) { return !!(u && currencyTokenMap()[String(u).toLowerCase()]); }
        function _npIsRealUnit(u) { // wbudowana / zdefiniowana jednostka — NIE auto-licznik z notatnika („4 osoby”)
            if (!u) return false;
            var k = String(u).toLowerCase();
            if (_npIsCurrencyTok(k)) return true;
            return !!(CALC_UNITS[k] && !CALC_UNITS[k]._auto);
        }
        var _NP_QTY_RE = /(\d+(?:[.,]\d+)?)(?:\s*([\p{L}$€£][\p{L}.²³]*))?/gu;
        function _npQuantities(s) {
            var out = [], m, re = new RegExp(_NP_QTY_RE.source, 'gu');
            while ((m = re.exec(s)) !== null) {
                var before = s.slice(0, m.index).trim().split(/\s+/).pop() || '';
                var unit = m[2] ? m[2].replace(/\.$/, '') : '';
                out.push({ num: m[1], unit: unit, prevWord: _npFold(before) });
            }
            return out;
        }
        function _npBareVarSubst(s, vars, varUnits) {
            var used = [];
            var foldMap = {};
            Object.keys(vars).forEach(function (k) { foldMap[_npFold(k)] = k; });
            if (!Object.keys(foldMap).length) return null;
            var out = String(s).replace(/(^|[^@\p{L}\p{N}_])([\p{L}][\p{L}\p{N}_]*)/gu, function (m0, pre, word) {
                var key = foldMap[_npFold(word)];
                if (!key || _npTokenKnown(word)) return m0;
                if (used.indexOf(key) < 0) used.push(key);
                var u = varUnits && varUnits[key] ? _npVarUnitLabel(varUnits[key]) : null;
                return pre + '(' + vars[key] + (u ? ' ' + u : '') + ')';
            });
            return used.length ? { expr: out, vars: used } : null;
        }
        function _npPhraseCandidate(s) {
            var t = String(s);
            if (/[+*\/×÷=^]|\d\s*-\s*\d|\d:\d/.test(t)) return null;      // to już działanie albo godzina — nie zgadujemy
            var f = _npFold(t);
            var qs = _npQuantities(t);
            if (!qs.length) return null;
            if (/(^|\s)(po|razy|przez|x|×|za)(\s|$)/.test(f) && qs.length >= 2) {
                var parts = qs.map(function (q) {
                    var keep = _npIsCurrencyTok(q.unit) ||
                        ((q.prevWord === 'po' || q.prevWord === 'za') && _npIsRealUnit(q.unit));
                    return q.num.replace(',', '.') + (keep && q.unit ? ' ' + q.unit : '');
                });
                return { expr: parts.join(' * '), kind: 'iloczyn' };
            }
            if (qs.length === 1 && _npIsRealUnit(qs[0].unit)) {
                return { expr: qs[0].num.replace(',', '.') + ' ' + qs[0].unit, kind: 'kwota' };
            }
            return null;
        }
        function _npSmartEval(evalStr, vars, varUnits) {
            var tries = [];
            var bare = _npBareVarSubst(evalStr, vars, varUnits);
            if (bare) tries.push({ expr: bare.expr, kind: 'zmienne', vars: bare.vars });
            // Zdanie liczymy z ORYGINAŁU, nie z podstawionych zmiennych: „paliwo po 6,50 zł za litr”
            // przy zmiennej paliwo=100 dałoby 100 × 6,50 zł — nazwa w zdaniu to słowo, nie liczba.
            var ph = _npPhraseCandidate(evalStr);
            if (ph) tries.push({ expr: ph.expr, kind: ph.kind, vars: [] });
            for (var i = 0; i < tries.length; i++) {
                var r = null;
                try { r = _npEval(tries[i].expr); } catch (e) { r = null; }
                if (r && (r.value !== null || r.text != null || r.big)) return { res: r, smart: tries[i] };
            }
            return null;
        }
        function _npPrettySmart(expr) {
            return String(expr).replace(/\s*\*\s*/g, ' × ').replace(/\((-?[\d.]+)(\s+[^)]+)?\)/g, function (m, n, u) {
                return _npFmt(parseFloat(n)) + (u || '');
            }).replace(/(\d)\.(\d)/g, '$1,$2'); // zapis polski: 12,50 zł
        }

        function evalLines(text) {
            var lines = String(text == null ? '' : text).split('\n');
            var out = [];
            var runningSum = 0; // suma SUROWYCH pozycji (linie, które same nie użyły „razem")
            var items = [];     // wartości surowych pozycji (do rozpisania „razem" w dymku)
            var itemUnits = []; // jednostki pozycji — do dziedziczenia przy razem/suma
            var skipped = [];   // numery linii z liczbami, które NIE dały wyniku (od ostatniej sekcji) — „razem” je pomija
            var grandSum = 0, grandItems = [], grandUnits = [], grandSkipped = []; // cała notatka („suma wszystkiego”)
            var sectionName = '';
            var autoMode = _depSettings().notepadAutoUnit || 'safe';
            var globals = _depGlobals();
            var vars = Object.assign({}, globals); // globalne (@nazwa) widoczne w KAŻDEJ notatce
            var varUnits = {};   // jednostka skojarzona ze zmienną (np. „Nocleg: 500 zł" → nocleg niesie „zł")
            var varNames = {};   // zbiór nazw zmiennych — wykluczamy je z auto-jednostek
            Object.keys(globals).forEach(function (k) { varNames[k] = 1; });
            lines.forEach(function (l) {
                var t = prepareLine(l).evalText;
                var gmm = t.match(_NP_GLOBAL_RE);
                if (gmm) { varNames[gmm[1].toLowerCase()] = 1; return; }
                var mm = t.match(_NP_LABEL_RE);
                if (mm) { var vn = _npVarName(mm[1].trim()); if (vn) varNames[vn] = 1; }
            });
            var _autoKeys = _npAutoRegister(String(text == null ? '' : text), varNames);
            var _sumUnitKeys = _npAutoRegisterSumUnits(String(text == null ? '' : text));
            if (_sumUnitKeys.length) _autoKeys = _autoKeys.concat(_sumUnitKeys);
            try {
                for (var i = 0; i < lines.length; i++) {
                    var info = { raw: lines[i], labelPart: '', exprPart: '', text: '', value: null, resolved: '', isItem: false, isTotal: false, isSubtotal: false, isSection: false, align: 'left' };
                    var prep = prepareLine(lines[i]);
                    info.align = prep.align;
                    var line = prep.evalText;
                    if (!line) { out.push(info); continue; }
                    var rawTrim = String(lines[i]).trim();
                    // nagłówek z paska (H1–H3) zostaje działaniem, jeśli ma cyfry („2+2” jako H2 nadal się liczy)
                    var isHeading = !_NP_SECTION_RE.test(line) && (
                        (_NP_HEADING_MARK_RE.test(_npParseAlign(rawTrim).body) && !/\d/.test(line)) || _NP_HASH_HEADING_RE.test(line) ||
                        (_NP_LABEL_ONLY_RE.test(line) && !_NP_GLOBAL_RE.test(line)));
                    if (isHeading) {
                        // Nagłówek otwiera sekcję: „razem” niżej liczy tylko tę sekcję (jak „---”, ale z nazwą).
                        info.isSection = true;
                        info.isHeading = true;
                        sectionName = line.replace(/^#{1,3}\s+/, '').replace(/:\s*$/, '').trim();
                        info.sectionName = sectionName;
                        info.exprPart = line;
                        runningSum = 0;
                        items = [];
                        itemUnits = [];
                        skipped = [];
                        out.push(info);
                        continue;
                    }
                    if (_NP_SECTION_RE.test(line)) {
                        info.isSection = true;
                        info.exprPart = line;
                        runningSum = 0;
                        items = [];
                        itemUnits = [];
                        skipped = [];
                        out.push(info);
                        continue;
                    }
                    var exprPart = line, labelPart = '';
                    var gm = line.match(_NP_GLOBAL_RE);    // „@nazwa: …" → zmienna dzielona między notatkami
                    var gName = null;
                    if (gm) {
                        gName = gm[1].toLowerCase();
                        if (_npTokenKnown(gName)) gName = null; // nie nadpisuj jednostek/walut/słów kluczowych
                        exprPart = gm[2].trim();
                        labelPart = line.slice(0, line.length - exprPart.length);
                    }
                    var lm = gm ? null : line.match(_NP_LABEL_RE);
                    if (lm) { exprPart = lm[2].trim(); labelPart = line.slice(0, line.length - exprPart.length); }
                    info.exprPart = exprPart; info.labelPart = labelPart;
                    var usedTotal = false;
                    var sumLine = _npParseSumLine(exprPart);
                    var sumUnitHint = sumLine ? _npSumUnitForLine(exprPart, itemUnits) : null;
                    var evalStr = _npSubVars(exprPart, vars, null, varUnits); // @nazwa PRZED słowami sumy (inaczej @suma → kolizja z „suma")
                    // „razem” w działaniu niesie jednostkę pozycji („razem / 4” → 180 zł, nie 180),
                    // gdy wszystkie mają tę samą (ustawienie „Dziedzicz”, domyślne od v1.04.24).
                    var sumInUnit = _depSettings().notepadSumUnit === 'inherit' ? _npInferSumUnit(itemUnits) : null;
                    var isGrandLine = _NP_GRAND_RE.test(exprPart.trim());
                    if (isGrandLine || _NP_GRAND_WORDS_RE.test(evalStr)) {
                        _NP_GRAND_WORDS_RE.lastIndex = 0;
                        var grandUnit = _depSettings().notepadSumUnit === 'inherit' ? _npInferSumUnit(grandUnits) : null;
                        evalStr = evalStr.replace(_NP_GRAND_WORDS_RE, function (m0, pre) {
                            usedTotal = true;
                            info.isTotal = true;
                            info.isGrand = true;
                            return pre + '(' + grandSum + (grandUnit && !isGrandLine ? ' ' + grandUnit : '') + ')';
                        });
                        if (grandSkipped.length) info.sumSkipped = grandSkipped.slice();
                        if (isGrandLine) { sumUnitHint = grandUnit; sumLine = sumLine || { keyword: 'łącznie', manualUnit: null }; }
                    }
                    _NP_GRAND_WORDS_RE.lastIndex = 0;
                    evalStr = _npReplaceSumWords(evalStr, function (m, kw, suffix) {
                        usedTotal = true;
                        if (_NP_SUBTOTAL_RE.test(kw)) info.isSubtotal = true;
                        else if (_NP_TOTAL_RE.test(kw)) info.isTotal = true;
                        var explicit = suffix && /\(/.test(suffix);
                        return '(' + runningSum + (sumInUnit && !explicit && !sumLine ? ' ' + sumInUnit : '') + ')';
                    });
                    if (usedTotal && skipped.length) { info.sumSkipped = skipped.slice(); }
                    if (autoMode === 'full') evalStr = _npStripProse(evalStr); // zdejmij zbłąkane słowa
                    var res = null;
                    try { res = _npEval(evalStr); } catch (e) { res = null; }
                    if (res && res.pendingFx) info.pendingFx = true; // czeka na kursy — app.js je pobierze i przeliczy
                    var smartHit = null;
                    if (!(res && (res.value !== null || res.text != null || res.big)) && !info.pendingFx && !usedTotal) {
                        smartHit = _npSmartEval(evalStr, vars, varUnits);
                        if (smartHit) {
                            res = smartHit.res;
                            info.smart = smartHit.smart.kind;
                            if (smartHit.smart.vars && smartHit.smart.vars.length) info.bareVars = smartHit.smart.vars.slice();
                            if (res.pendingFx) { info.pendingFx = true; res = null; smartHit = null; }
                        }
                    }
                    if (res && (res.value !== null || res.text != null || res.big)) {
                        var outUnit = sumLine ? (sumUnitHint || res.unit || null) : (res.unit || null);
                        info.text = outUnit && typeof res.value === 'number' && isFinite(res.value)
                            ? _npFormatWithUnit(res.value, outUnit) : formatCalcResult(res);
                        if (info.isGrand && isGrandLine) {
                            info.resolved = grandItems.length ? 'Cała notatka: ' + grandItems.map(_npFmt).join(' + ').replace(/\+ -/g, '− ') : exprPart;
                        } else if (sumLine || _NP_TOTAL_RE.test(exprPart) || _NP_SUBTOTAL_RE.test(exprPart)) {
                            info.resolved = items.length ? items.map(_npFmt).join(' + ').replace(/\+ -/g, '− ') : exprPart;
                        } else {
                            var disp = _npSubVars(exprPart, vars, _npFmt, varUnits);
                            disp = _npReplaceSumWords(disp, function (m, kw, suffix) {
                                return _NP_SUBTOTAL_RE.test(kw) || _NP_TOTAL_RE.test(kw) ? _npFmt(runningSum) + (suffix || '') : m;
                            });
                            info.resolved = smartHit ? ('Zrozumiałem jako: ' + _npPrettySmart(smartHit.smart.expr)) : disp;
                        }
                        if (typeof res.value === 'number' && isFinite(res.value)) {
                            info.value = res.value;
                            if (usedTotal || gName) { /* isTotal/isSubtotal ustawione w replace słów sumy */ }
                            else {
                                // „Zaliczka / rabat / zwrot … 200 zł” — kwota odejmuje się od sumy (wartość linii zostaje dodatnia,
                                // UI pokazuje „− 200 zł”). Jawny znak („-200 zł”, „+200 zł”) wygrywa.
                                var signWord = (labelPart || exprPart).trim();
                                var contrib = res.value;
                                if (_NP_MINUS_RE.test(signWord) && res.value > 0 && !/^[+\-−]/.test(exprPart.trim())) {
                                    contrib = -res.value;
                                    info.negated = true;
                                }
                                runningSum += contrib; items.push(contrib); itemUnits.push(res.unit || null); info.isItem = true;
                                grandSum += contrib; grandItems.push(contrib); grandUnits.push(res.unit || null);
                            }
                            var assignUnit = sumLine ? outUnit : (res.unit || null);
                            if (gName) _npAssignVar(vars, varUnits, gName, res.value, assignUnit);
                            else {
                                var vn2 = lm ? _npVarName(lm[1].trim()) : null;
                                if (vn2) _npAssignVar(vars, varUnits, vn2, res.value, assignUnit);
                                var sk = _npSumKeywordVarName(exprPart, usedTotal);
                                if (sk && sk !== vn2) _npAssignVar(vars, varUnits, sk, res.value, assignUnit);
                            }
                        } else if (usedTotal && !info.isSubtotal) { info.isTotal = true; }
                    } else if (!usedTotal && !gName && /\d/.test(exprPart)) {
                        skipped.push(i + 1); // linia z liczbą bez wyniku — „razem” ją pominie (ostrzeżenie w UI)
                        grandSkipped.push(i + 1);
                    }
                    if (sectionName) info.sectionName = sectionName;
                    out.push(info);
                }
            } finally { _npAutoClear(_autoKeys); } // usuń tymczasowe auto-jednostki
            return out;
        }

        function listVars(text) { // [EN] vars in scope after full pass — panel T3-12
            var lines = String(text == null ? '' : text).split('\n');
            var globalsCopy = Object.assign({}, _depGlobals());
            var locals = {};
            var localUnits = {};
            var varNames = {};
            Object.keys(globalsCopy).forEach(function (k) { varNames[k] = 1; });
            lines.forEach(function (l) {
                var t = prepareLine(l).evalText;
                var gmm = t.match(_NP_GLOBAL_RE);
                if (gmm) { varNames[gmm[1].toLowerCase()] = 1; return; }
                var mm = t.match(_NP_LABEL_RE);
                if (mm) { var vn = _npVarName(mm[1].trim()); if (vn) varNames[vn] = 1; }
            });
            var autoMode = _depSettings().notepadAutoUnit || 'safe';
            var _autoKeys = _npAutoRegister(String(text == null ? '' : text), varNames);
            var _sumUnitKeys = _npAutoRegisterSumUnits(String(text == null ? '' : text));
            if (_sumUnitKeys.length) _autoKeys = _autoKeys.concat(_sumUnitKeys);
            try {
                var vars = Object.assign({}, globalsCopy);
                var varUnits = {};
                var runningSum = 0;
                var itemUnits = [];
                for (var i = 0; i < lines.length; i++) {
                    var prepL = prepareLine(lines[i]);
                    var line = prepL.evalText;
                    if (!line) continue;
                    if (_NP_SECTION_RE.test(line)) { runningSum = 0; itemUnits = []; continue; }
                    if ((_NP_HEADING_MARK_RE.test(_npParseAlign(String(lines[i]).trim()).body) && !/\d/.test(line)) || _NP_HASH_HEADING_RE.test(line) ||
                        (_NP_LABEL_ONLY_RE.test(line) && !_NP_GLOBAL_RE.test(line))) { runningSum = 0; itemUnits = []; continue; }
                    var exprPart = line, gName = null;
                    var gm = line.match(_NP_GLOBAL_RE);
                    if (gm) {
                        gName = gm[1].toLowerCase();
                        if (_npTokenKnown(gName)) gName = null;
                        exprPart = gm[2].trim();
                    }
                    var lm = gm ? null : line.match(_NP_LABEL_RE);
                    if (lm) exprPart = lm[2].trim();
                    var usedTotal = false;
                    var sumLine = _npParseSumLine(exprPart);
                    var sumUnitHint = sumLine ? _npSumUnitForLine(exprPart, itemUnits) : null;
                    var evalStr = _npSubVars(exprPart, vars, null, varUnits);
                    evalStr = _npReplaceSumWords(evalStr, function () { usedTotal = true; return '(' + runningSum + ')'; });
                    if (autoMode === 'full') evalStr = _npStripProse(evalStr);
                    try {
                        var res = _npEval(evalStr);
                        if (res && typeof res.value === 'number' && isFinite(res.value)) {
                            var assignUnit = sumLine ? (sumUnitHint || res.unit || null) : (res.unit || null);
                            if (!usedTotal && !gName) {
                                var lmS = line.match(_NP_LABEL_RE);
                                var neg = _NP_MINUS_RE.test(((lmS ? lmS[1] : exprPart) || '').trim()) && res.value > 0 && !/^[+\-−]/.test(exprPart.trim());
                                runningSum += neg ? -res.value : res.value; itemUnits.push(res.unit || null);
                            }
                            if (gName) {
                                globalsCopy[gName] = res.value; vars[gName] = res.value; varUnits[gName] = assignUnit;
                            } else {
                                var vn2 = lm ? _npVarName(lm[1].trim()) : null;
                                if (vn2) { locals[vn2] = res.value; localUnits[vn2] = assignUnit; vars[vn2] = res.value; varUnits[vn2] = assignUnit; }
                                var sk = _npSumKeywordVarName(exprPart, usedTotal);
                                if (sk && sk !== vn2) { locals[sk] = res.value; localUnits[sk] = assignUnit; vars[sk] = res.value; varUnits[sk] = assignUnit; }
                            }
                        }
                    } catch (e) {}
                }
            } finally { _npAutoClear(_autoKeys); }
            return { globals: globalsCopy, locals: locals, localUnits: localUnits, globalUnits: {} };
        }

        function rebuildGlobals(notes) { // [EN] @nazwa z wszystkich notatek — seed dla evalLines
            var g = {};
            (notes || []).forEach(function (note) {
                String(note.text || '').split('\n').forEach(function (l) {
                    var m = String(l).match(_NP_GLOBAL_RE);
                    if (!m) return;
                    var name = m[1].toLowerCase();
                    if (_npTokenKnown(name)) return;
                    var sub = _npSubVars(m[2].trim(), g);
                    try {
                        var r = _npEval(sub);
                        if (r && typeof r.value === 'number' && isFinite(r.value)) g[name] = r.value;
                    } catch (e) {}
                });
            });
            return g;
        }

        return { evalLines: evalLines, listVars: listVars, prepareLine: prepareLine, rebuildGlobals: rebuildGlobals };
    }

    var API = { createEngine: createEngine, LINE_THRESHOLD: LINE_THRESHOLD };
    if (typeof window !== 'undefined') window.MATM0_NP_ENGINE = API;
    if (typeof self !== 'undefined') self.MATM0_NP_ENGINE = API;
})();
