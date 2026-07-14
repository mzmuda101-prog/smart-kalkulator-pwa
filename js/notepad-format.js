/* ============================================================
   [EN] Notepad format — toolbar-only (B/I/U/S/◆). Private-use markers; no ** typing.
   ============================================================ */
(function () {
    'use strict';

    // [EN] Jednoznakowe markery — tylko toolbar; użytkownik ich nie wpisuje
    var INLINE = [
        { id: 'bold', act: 'bold', label: 'B', title: 'Pogrubienie', open: '\uE000', close: '\uE001', cls: 'np-fmt-bold', menu: true, kb: false },
        { id: 'italic', act: 'italic', label: 'I', title: 'Kursywa', open: '\uE002', close: '\uE003', cls: 'np-fmt-italic', menu: true, kb: false },
        { id: 'underline', act: 'underline', label: 'U', title: 'Podkreślenie', open: '\uE004', close: '\uE005', cls: 'np-fmt-underline', menu: true, kb: false },
        { id: 'strike', act: 'strike', label: 'S', title: 'Przekreślenie', open: '\uE006', close: '\uE007', cls: 'np-fmt-strike', menu: true, kb: false },
        { id: 'accent', act: 'accent', label: '◆', title: 'Akcent kolorystyczny', open: '\uE008', close: '\uE009', cls: 'np-fmt-accent', menu: true, kb: false }
    ];

    var LINE = [
        { id: 'align-left', act: 'align-left', label: '◀', title: 'Do lewej', mode: 'left', panelMenu: true, kb: true, selectionMenu: false },
        { id: 'align-center', act: 'align-center', label: '≡', title: 'Do środka', mode: 'center', panelMenu: true, kb: true, selectionMenu: false },
        { id: 'align-right', act: 'align-right', label: '▶', title: 'Do prawej', mode: 'right', panelMenu: true, kb: true, selectionMenu: false },
        { id: 'align-justify', act: 'align-justify', label: '⊞', title: 'Justuj', mode: 'justify', panelMenu: true, kb: true, selectionMenu: false }
    ];

    var FONT = [
        { id: 'font-down', act: 'font-down', label: 'A−', title: 'Mniejsza czcionka', panelMenu: true, kb: true },
        { id: 'font-up', act: 'font-up', label: 'A+', title: 'Większa czcionka', panelMenu: true, kb: true },
        { id: 'font-reset', act: 'font-reset', label: '↺', title: 'Domyślna czcionka', panelMenu: true, kb: true }
    ];

    var HEADING = [ // [EN] line-level PUA — jeden znak na początku body (po prefixie wyrównania)
        { level: 1, marker: '\uE010', cls: 'np-h1', label: 'H1', title: 'Nagłówek 1' },
        { level: 2, marker: '\uE011', cls: 'np-h2', label: 'H2', title: 'Nagłówek 2' },
        { level: 3, marker: '\uE012', cls: 'np-h3', label: 'H3', title: 'Nagłówek 3' }
    ];
    var _HEADING_BY_MARKER = {};
    HEADING.forEach(function (h) { _HEADING_BY_MARKER[h.marker] = h; });

    var _ALIGN_PREFIX = { left: '', center: '< ', right: '> ', justify: '| ' };

    var _byAct = {};
    INLINE.forEach(function (f) { _byAct[f.act] = f; });
    LINE.forEach(function (f) { _byAct[f.act] = f; });
    FONT.forEach(function (f) { _byAct[f.act] = f; });

    function _escRe(ch) { return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    function _scanOrder() {
        return INLINE.slice().sort(function (a, b) { return b.open.length - a.open.length; });
    }

    function _markerCharSet() {
        var set = {};
        INLINE.forEach(function (f) { set[f.open] = 1; set[f.close] = 1; });
        HEADING.forEach(function (h) { set[h.marker] = 1; });
        return set;
    }
    function _isMarkerChar(ch) { return !!_markerCharSet()[String(ch || '')]; }

    function _parseAlignRaw(s) { // [EN] prefix wyrównania — jak w notepad-engine
        if (s.startsWith('> ')) return { align: 'right', rest: s.slice(2) };
        if (s.startsWith('< ')) return { align: 'center', rest: s.slice(2) };
        if (s.startsWith('| ')) return { align: 'justify', rest: s.slice(2) };
        return { align: 'left', rest: s };
    }

    function parseLineHeading(rawLine) { // [EN] align + H1/H2/H3 + czyste body do mirror/eval
        var a = _parseAlignRaw(String(rawLine || ''));
        var level = 0, body = a.rest;
        var head = _HEADING_BY_MARKER[body.charAt(0)];
        if (head) { level = head.level; body = body.slice(1); }
        return { align: a.align, level: level, body: body, prefixLen: a.rest.length - body.length };
    }

    function applyLineHeading(rawLine, level) {
        var p = parseLineHeading(rawLine);
        var lv = Math.max(0, Math.min(3, level == null ? 0 : (level | 0)));
        var marker = lv === 1 ? HEADING[0].marker : lv === 2 ? HEADING[1].marker : lv === 3 ? HEADING[2].marker : '';
        return (_ALIGN_PREFIX[p.align] || '') + marker + p.body;
    }

    function headingLevelLabel(level) {
        if (level === 1) return 'H1';
        if (level === 2) return 'H2';
        if (level === 3) return 'H3';
        return 'T';
    }

    function headingClass(level) {
        if (level === 1) return 'np-h1';
        if (level === 2) return 'np-h2';
        if (level === 3) return 'np-h3';
        return '';
    }

    function collapseEmptyMarkers(val) { // [EN] usuń puste pary po Backspace — zapobiega „prostokątom" w mirrorze
        var s = String(val || '');
        var order = _scanOrder();
        var changed = true;
        while (changed) {
            changed = false;
            for (var fi = 0; fi < order.length; fi++) {
                var o = order[fi].open, c = order[fi].close;
                var re = new RegExp(_escRe(o) + _escRe(c), 'g');
                var next = s.replace(re, function () { changed = true; return ''; });
                if (next !== s) { s = next; changed = true; }
            }
        }
        return s;
    }

    function stripMarkers(s) {
        var t = String(s || '');
        t = t.replace(/^[\uE010\uE011\uE012]/, ''); // [EN] nagłówek linii — niewidoczny w eksporcie
        INLINE.forEach(function (f) {
            var re = new RegExp(_escRe(f.open) + '([^' + _escRe(f.close) + '\\n]+)' + _escRe(f.close), 'g');
            t = t.replace(re, '$1');
        });
        t = t.replace(/\*\*([^*\n]+)\*\*/g, '$1');
        t = t.replace(/__([^_\n]+)__/g, '$1');
        t = t.replace(/~~([^~\n]+)~~/g, '$1');
        t = t.replace(/::([^:\n]+)::/g, '$1');
        t = t.replace(/_([^_\n]{2,})_/g, '$1');
        return t.replace(/\u200B/g, '');
    }

    function migrateLegacyMarkers(s) { // [EN] ** → znaki toolbar przy ładowaniu notatki
        var t = String(s || '');
        if (t.indexOf('\u200B') >= 0) t = t.split('\u200B').join('*');
        t = t.replace(/\*\*([^*\n]+)\*\*/g, function (_, inner) { return INLINE[0].open + inner + INLINE[0].close; });
        t = t.replace(/__([^_\n]+)__/g, function (_, inner) { return INLINE[2].open + inner + INLINE[2].close; });
        t = t.replace(/~~([^~\n]+)~~/g, function (_, inner) { return INLINE[3].open + inner + INLINE[3].close; });
        t = t.replace(/::([^:\n]+)::/g, function (_, inner) { return INLINE[4].open + inner + INLINE[4].close; });
        t = t.replace(/_([^_\n]{2,})_/g, function (_, inner) { return INLINE[1].open + inner + INLINE[1].close; });
        return t;
    }

    function wrapByAct(act) {
        var f = _byAct[act];
        return f ? { open: f.open, close: f.close } : null;
    }

    function selectionMenuItems(ctx) {
        var items = INLINE.filter(function (f) { return f.menu; }).map(function (f) {
            return [f.act, f.label, f.title];
        });
        var lvl = ctx && ctx.headingLevel != null ? ctx.headingLevel : 0;
        items.push(['heading-slot', headingLevelLabel(lvl), 'Nagłówek — dotknij lub przewiń']);
        return items;
    }

    function panelMenuItems() {
        var items = [];
        LINE.filter(function (f) { return f.panelMenu; }).forEach(function (f) { items.push([f.act, f.label, f.title]); });
        FONT.filter(function (f) { return f.panelMenu; }).forEach(function (f) { items.push([f.act, f.label, f.title]); });
        return items;
    }

    function kbBarSpecs() {
        var specs = [];
        var lineKb = LINE.filter(function (f) { return f.kb; });
        var fontKb = FONT.filter(function (f) { return f.kb; });
        if (lineKb.length) lineKb.forEach(function (f) { specs.push([f.act, f.label, f.title]); });
        if (fontKb.length) {
            if (specs.length) specs.push(['sep']);
            fontKb.forEach(function (f) { specs.push([f.act, f.label, f.title]); });
        }
        return specs;
    }

    function kbInlineItems() { return []; }

    function _nextPlainEnd(s, i, order) {
        var next = s.length;
        order.forEach(function (f) {
            var p = s.indexOf(f.open, i);
            if (p >= 0 && p < next) next = p;
        });
        return next;
    }

    function fillMirror(container, text, ctx, base, api) {
        if (base == null) container.replaceChildren();
        if (!text) return;
        var s = text, i = 0;
        var order = _scanOrder();
        function pushPlain(end) {
            if (end > i) api.pushSpan(container, s.slice(i, end), '', base + i, base + end, ctx);
            i = end;
        }
        while (i < s.length) {
            var prev = i, matched = false;
            for (var fi = 0; fi < order.length; fi++) {
                var fmt = order[fi];
                var o = fmt.open, c = fmt.close, oLen = o.length, cLen = c.length;
                if (!s.startsWith(o, i)) continue;
                var end = s.indexOf(c, i + oLen);
                if (end > i) {
                    pushPlain(i);
                    var innerStart = i + oLen, innerEnd = end;
                    var inner = s.slice(innerStart, innerEnd);
                    if (inner) {
                        var wrap = document.createElement('span');
                        if (fmt.cls) wrap.className = fmt.cls;
                        container.appendChild(wrap);
                        fillMirror(wrap, inner, ctx, base + innerStart, api); // [EN] nested B+I+U — recurse, not flat inner
                    }
                    i = innerEnd + cLen;
                    matched = true;
                    break;
                }
                i += oLen; // [EN] orphan open — skip, don't leak PUA into mirror
                matched = true;
                break;
            }
            if (matched) continue;
            pushPlain(_nextPlainEnd(s, i, order));
            if (i === prev) i++;
        }
    }

    function listRegions(val) {
        var regions = [];
        var order = _scanOrder();
        function scan(s, base) {
            var i = 0;
            while (i < s.length) {
                var matched = false;
                for (var fi = 0; fi < order.length; fi++) {
                    var fmt = order[fi], o = fmt.open, c = fmt.close, oLen = o.length, cLen = c.length;
                    if (!s.startsWith(o, i)) continue;
                    var closeAt = s.indexOf(c, i + oLen);
                    if (closeAt <= i) { i += oLen; matched = true; break; }
                    var innerStart = base + i + oLen;
                    var innerEnd = base + closeAt;
                    regions.push({
                        fmt: fmt, open: o, close: c,
                        uStart: base + i, innerStart: innerStart, innerEnd: innerEnd, uEnd: innerEnd + cLen
                    });
                    scan(s.slice(i + oLen, closeAt), innerStart);
                    i = closeAt + cLen;
                    matched = true;
                    break;
                }
                if (!matched) i++;
            }
        }
        scan(String(val || ''), 0);
        return regions;
    }

    function normalizeSelectionRange(val, start, end) {
        if (start == null || end == null || start === end) return { start: start, end: end, changed: false };
        var a = Math.min(start, end), b = Math.max(start, end);
        var regions = listRegions(val);
        if (!regions.length) return { start: a, end: b, changed: false };
        var changed = false;
        var outer = null;
        regions.forEach(function (r) {
            if (a <= r.uStart && b >= r.uEnd && (!outer || (r.uEnd - r.uStart) > (outer.uEnd - outer.uStart))) outer = r;
        });
        if (outer) { a = outer.innerStart; b = outer.innerEnd; changed = true; }
        else {
            regions.forEach(function (r) {
                if (a <= r.uStart && b > r.innerEnd && b <= r.uEnd) { a = r.innerStart; b = r.innerEnd; changed = true; }
            });
            regions.forEach(function (r) {
                if (a > r.uStart && a < r.innerStart) { a = r.innerStart; changed = true; }
                else if (a > r.innerEnd && a < r.uEnd) { a = r.innerEnd; changed = true; }
                if (b > r.innerEnd && b < r.uEnd) { b = r.innerEnd; changed = true; }
                else if (b > r.uStart && b < r.innerStart) { b = r.innerStart; changed = true; }
            });
        }
        if (a >= b) return { start: start, end: end, changed: false };
        return { start: a, end: b, changed: changed };
    }

    function partialUnwrap(val, start, end, open, close) { // [EN] subset inside one region — split, don't drop whole wrap
        if (start == null || end == null || start >= end) return null;
        var regions = listRegions(val).filter(function (r) { return r.open === open && r.close === close; });
        var target = null;
        regions.forEach(function (r) {
            if (start >= r.innerStart && end <= r.innerEnd && (start > r.innerStart || end < r.innerEnd)) {
                if (!target || (r.uEnd - r.uStart) < (target.uEnd - target.uStart)) target = r;
            }
        });
        if (!target) return null;
        var before = val.slice(target.innerStart, start);
        var mid = val.slice(start, end);
        var after = val.slice(end, target.innerEnd);
        var parts = [];
        if (before) parts.push(open + before + close);
        parts.push(mid);
        if (after) parts.push(open + after + close);
        return { uStart: target.uStart, uEnd: target.uEnd, text: parts.join('') };
    }

    function plainDisplayText(line) { // [EN] tytuł / lista — bez markerów i prefixów wyrównania
        var p = parseLineHeading(line);
        var s = stripMarkers(p.body.trim());
        if (s.startsWith('> ')) s = s.slice(2);
        else if (s.startsWith('< ')) s = s.slice(2);
        else if (s.startsWith('| ')) s = s.slice(2);
        return s.trim();
    }

    function markerEnvelope(val, start, end, open, close) {
        var oLen = open.length, cLen = close.length;
        var sel = val.slice(start, end);
        if (sel.length >= oLen + cLen && sel.startsWith(open) && sel.endsWith(close)) {
            return { wrapped: true, uStart: start, uEnd: end, inner: sel.slice(oLen, sel.length - cLen) };
        }
        if (sel.startsWith(open)) {
            var bodyStart = start + oLen;
            var closeAt = val.indexOf(close, bodyStart);
            if (closeAt >= 0) {
                return { wrapped: true, uStart: start, uEnd: closeAt + cLen, inner: val.slice(bodyStart, closeAt) };
            }
        }
        var hasOpenBefore = start >= oLen && val.slice(start - oLen, start) === open;
        if (hasOpenBefore) {
            var uStart = start - oLen, uEnd = end;
            if (end + cLen <= val.length && val.slice(end, end + cLen) === close) uEnd = end + cLen;
            else {
                var found = val.indexOf(close, end);
                if (found >= 0) uEnd = found + cLen;
            }
            var chunk = val.slice(uStart, uEnd);
            if (chunk.startsWith(open) && chunk.endsWith(close)) {
                return { wrapped: true, uStart: uStart, uEnd: uEnd, inner: chunk.slice(oLen, chunk.length - cLen) };
            }
        }
        return { wrapped: false, uStart: start, uEnd: end, inner: sel };
    }

    function displayPrefix(val, bufEnd) { // [EN] tekst wizualny przed kursorem — markery toolbar bez szerokości w mirrorze
        val = String(val || '');
        bufEnd = Math.max(0, Math.min(bufEnd, val.length));
        if (!bufEnd) return '';
        var order = _scanOrder();
        var out = '', i = 0;
        while (i < bufEnd) {
            var matched = false;
            for (var fi = 0; fi < order.length && !matched; fi++) {
                var fmt = order[fi], o = fmt.open, c = fmt.close, oLen = o.length, cLen = c.length;
                if (!val.startsWith(o, i)) continue;
                var closeAt = val.indexOf(c, i + oLen);
                if (closeAt > i) {
                    var innerStart = i + oLen, innerEnd = closeAt, uEnd = closeAt + cLen;
                    if (bufEnd <= innerStart) { i = bufEnd; }
                    else if (bufEnd <= innerEnd) { out += val.slice(innerStart, bufEnd); i = bufEnd; }
                    else if (bufEnd <= uEnd) { out += val.slice(innerStart, innerEnd); i = bufEnd; }
                    else { out += val.slice(innerStart, innerEnd); i = uEnd; }
                    matched = true;
                } else {
                    if (bufEnd <= i + oLen) { i = bufEnd; }
                    else { i += oLen; } // [EN] unclosed open — zero width in caret mirror
                    matched = true;
                }
            }
            if (!matched) {
                if (_isMarkerChar(val[i])) { i++; continue; } // [EN] orphan close — invisible in mirror
                out += val[i];
                i++;
            }
        }
        return out;
    }

    function sanitizeLoadedMarkers(val) { // [EN] tylko przy wczytaniu notatki — usuń sierocę PUA z zapisanego bufora
        var s = collapseEmptyMarkers(String(val || ''));
        var regions = listRegions(s);
        if (!regions.length) return s;
        var keep = new Array(s.length);
        for (var k = 0; k < keep.length; k++) keep[k] = false;
        regions.forEach(function (r) {
            for (var i = r.uStart; i < r.uEnd; i++) keep[i] = true;
        });
        var out = '';
        for (var j = 0; j < s.length; j++) {
            var ch = s[j];
            if (_isMarkerChar(ch) && !keep[j]) continue;
            out += ch;
        }
        return out;
    }

    function exportPlainText(val) { // [EN] kopiuj/wklej — bez niewidocznych markerów toolbar
        return stripMarkers(String(val || ''));
    }

    var API = {
        inline: INLINE,
        line: LINE,
        font: FONT,
        heading: HEADING,
        parseLineHeading: parseLineHeading,
        applyLineHeading: applyLineHeading,
        headingLevelLabel: headingLevelLabel,
        headingClass: headingClass,
        stripMarkers: stripMarkers,
        collapseEmptyMarkers: collapseEmptyMarkers,
        sanitizeLoadedMarkers: sanitizeLoadedMarkers,
        exportPlainText: exportPlainText,
        migrateLegacyMarkers: migrateLegacyMarkers,
        fillMirror: fillMirror,
        wrapByAct: wrapByAct,
        selectionMenuItems: selectionMenuItems,
        panelMenuItems: panelMenuItems,
        kbInlineItems: kbInlineItems,
        kbBarSpecs: kbBarSpecs,
        listRegions: listRegions,
        normalizeSelectionRange: normalizeSelectionRange,
        partialUnwrap: partialUnwrap,
        plainDisplayText: plainDisplayText,
        markerEnvelope: markerEnvelope,
        displayPrefix: displayPrefix
    };

    if (typeof window !== 'undefined') window.MATM0_NP_FMT = API;
    if (typeof self !== 'undefined') self.MATM0_NP_FMT = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
