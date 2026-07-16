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

        function evalLines(text) {
            var lines = String(text == null ? '' : text).split('\n');
            var out = [];
            var runningSum = 0; // suma SUROWYCH pozycji (linie, które same nie użyły „razem")
            var items = [];     // wartości surowych pozycji (do rozpisania „razem" w dymku)
            var itemUnits = []; // jednostki pozycji — do dziedziczenia przy razem/suma
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
                    if (_NP_SECTION_RE.test(line)) {
                        info.isSection = true;
                        info.exprPart = line;
                        runningSum = 0;
                        items = [];
                        itemUnits = [];
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
                    evalStr = _npReplaceSumWords(evalStr, function (m, kw) {
                        usedTotal = true;
                        if (_NP_SUBTOTAL_RE.test(kw)) info.isSubtotal = true;
                        else if (_NP_TOTAL_RE.test(kw)) info.isTotal = true;
                        return '(' + runningSum + ')';
                    });
                    if (autoMode === 'full') evalStr = _npStripProse(evalStr); // zdejmij zbłąkane słowa
                    var res = null;
                    try { res = _npEval(evalStr); } catch (e) { res = null; }
                    if (res && (res.value !== null || res.text != null || res.big)) {
                        var outUnit = sumLine ? (sumUnitHint || res.unit || null) : (res.unit || null);
                        info.text = outUnit && typeof res.value === 'number' && isFinite(res.value)
                            ? _npFormatWithUnit(res.value, outUnit) : formatCalcResult(res);
                        if (sumLine || _NP_TOTAL_RE.test(exprPart) || _NP_SUBTOTAL_RE.test(exprPart)) {
                            info.resolved = items.length ? items.map(_npFmt).join(' + ') : exprPart;
                        } else {
                            var disp = _npSubVars(exprPart, vars, _npFmt, varUnits);
                            disp = _npReplaceSumWords(disp, function (m, kw, suffix) {
                                return _NP_SUBTOTAL_RE.test(kw) || _NP_TOTAL_RE.test(kw) ? _npFmt(runningSum) + (suffix || '') : m;
                            });
                            info.resolved = disp;
                        }
                        if (typeof res.value === 'number' && isFinite(res.value)) {
                            info.value = res.value;
                            if (usedTotal || gName) { /* isTotal/isSubtotal ustawione w replace słów sumy */ }
                            else { runningSum += res.value; items.push(res.value); itemUnits.push(res.unit || null); info.isItem = true; }
                            var assignUnit = sumLine ? outUnit : (res.unit || null);
                            if (gName) _npAssignVar(vars, varUnits, gName, res.value, assignUnit);
                            else {
                                var vn2 = lm ? _npVarName(lm[1].trim()) : null;
                                if (vn2) _npAssignVar(vars, varUnits, vn2, res.value, assignUnit);
                                var sk = _npSumKeywordVarName(exprPart, usedTotal);
                                if (sk && sk !== vn2) _npAssignVar(vars, varUnits, sk, res.value, assignUnit);
                            }
                        } else if (usedTotal && !info.isSubtotal) { info.isTotal = true; }
                    }
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
                            if (!usedTotal && !gName) { runningSum += res.value; itemUnits.push(res.unit || null); }
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
