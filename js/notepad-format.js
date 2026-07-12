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

    var _byAct = {};
    INLINE.forEach(function (f) { _byAct[f.act] = f; });
    LINE.forEach(function (f) { _byAct[f.act] = f; });
    FONT.forEach(function (f) { _byAct[f.act] = f; });

    function _escRe(ch) { return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    function _scanOrder() {
        return INLINE.slice().sort(function (a, b) { return b.open.length - a.open.length; });
    }

    function stripMarkers(s) {
        var t = String(s || '');
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

    function selectionMenuItems() {
        return INLINE.filter(function (f) { return f.menu; }).map(function (f) {
            return [f.act, f.label, f.title];
        });
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
                    api.pushSpan(container, s.slice(innerStart, innerEnd), fmt.cls, base + innerStart, base + innerEnd, ctx);
                    i = innerEnd + cLen;
                    matched = true;
                    break;
                }
                i += oLen;
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
                    var take = Math.min(oLen, bufEnd - i);
                    out += val.slice(i, i + take);
                    i += take;
                    matched = true;
                }
            }
            if (!matched) { out += val[i]; i++; }
        }
        return out;
    }

    var API = {
        inline: INLINE,
        line: LINE,
        font: FONT,
        stripMarkers: stripMarkers,
        migrateLegacyMarkers: migrateLegacyMarkers,
        fillMirror: fillMirror,
        wrapByAct: wrapByAct,
        selectionMenuItems: selectionMenuItems,
        panelMenuItems: panelMenuItems,
        kbInlineItems: kbInlineItems,
        kbBarSpecs: kbBarSpecs,
        listRegions: listRegions,
        normalizeSelectionRange: normalizeSelectionRange,
        markerEnvelope: markerEnvelope,
        displayPrefix: displayPrefix
    };

    if (typeof window !== 'undefined') window.MATM0_NP_FMT = API;
    if (typeof self !== 'undefined') self.MATM0_NP_FMT = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
