/* ============================================================
   [EN] Notepad format registry — INLINE (B/I/U/…) + LINE (align) metadata.
   Markers stay plain-text; mirror + strip live here. app.js wires UI + handlers.
   Roadmap: docs/NOTEPAD-FORMAT-PLAN.md (Faza B = align w menu zaznaczenia).
   ============================================================ */
(function () {
    'use strict';

    // [EN] Inline = wrap selection; add row → menu + kb + strip + mirror auto via registry
    var INLINE = [
        { id: 'bold', act: 'bold', label: 'B', title: 'Pogrubienie', open: '**', close: '**', cls: 'np-fmt-bold', menu: true, kb: true },
        { id: 'italic', act: 'italic', label: 'I', title: 'Kursywa', open: '_', close: '_', cls: 'np-fmt-italic', menu: true, kb: true },
        { id: 'underline', act: 'underline', label: 'U', title: 'Podkreślenie', open: '__', close: '__', cls: 'np-fmt-underline', menu: true, kb: true },
        { id: 'strike', act: 'strike', label: 'S', title: 'Przekreślenie', open: '~~', close: '~~', cls: 'np-fmt-strike', menu: true, kb: true },
        { id: 'accent', act: 'accent', label: '◆', title: 'Akcent kolorystyczny', open: '::', close: '::', cls: 'np-fmt-accent', menu: true, kb: true }
    ];

    // [EN] Line-level formats (prefix before body) — handlers stay in app.js (_npSetLineAlign)
    // selectionMenu: false until Faza B align-in-selection works reliably (docs/NOTEPAD-FORMAT-PLAN.md)
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

    function _scanOrder() {
        return INLINE.slice().sort(function (a, b) { return b.open.length - a.open.length; });
    }

    function stripMarkers(s) {
        var t = String(s || '');
        t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
        t = t.replace(/__([^_]+)__/g, '$1');
        t = t.replace(/~~([^~]+)~~/g, '$1');
        t = t.replace(/::([^:\n]+)::/g, '$1');
        t = t.replace(/_([^_\n]+)_/g, '$1');
        return t;
    }

    function wrapByAct(act) {
        var f = _byAct[act];
        return f ? { open: f.open, close: f.close } : null;
    }

    function selectionMenuItems(opts) {
        opts = opts || {};
        var items = INLINE.filter(function (f) { return f.menu; }).map(function (f) {
            return [f.act, f.label, f.title];
        });
        if (opts.singleLine) {
            LINE.filter(function (f) { return f.selectionMenu; }).forEach(function (f) {
                items.push([f.act, f.label, f.title]);
            });
        }
        return items;
    }

    function panelMenuItems() {
        var items = [];
        LINE.filter(function (f) { return f.panelMenu; }).forEach(function (f) {
            items.push([f.act, f.label, f.title]);
        });
        FONT.filter(function (f) { return f.panelMenu; }).forEach(function (f) {
            items.push([f.act, f.label, f.title]);
        });
        return items;
    }

    function kbBarSpecs() {
        var specs = kbInlineItems();
        var lineKb = LINE.filter(function (f) { return f.kb; });
        var fontKb = FONT.filter(function (f) { return f.kb; });
        if (lineKb.length) {
            specs.push(['sep']);
            lineKb.forEach(function (f) { specs.push([f.act, f.label, f.title]); });
        }
        if (fontKb.length) {
            specs.push(['sep']);
            fontKb.forEach(function (f) { specs.push([f.act, f.label, f.title]); });
        }
        return specs;
    }

    function kbInlineItems() {
        return INLINE.filter(function (f) { return f.kb; }).map(function (f) {
            return [f.act, f.label, f.title];
        });
    }

    function _nextPlainEnd(s, i, order) {
        var next = s.length;
        order.forEach(function (f) {
            var p = s.indexOf(f.open, i);
            if (p >= 0 && p < next) next = p;
        });
        if (s.charAt(i) !== '_' && s.indexOf('_', i) >= 0) {
            var p = s.indexOf('_', i);
            if (p >= 0 && p < next && s.charAt(p + 1) !== '_') next = p;
        }
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
                if (end > i) { // [EN] zamknięta klamra — tylko treść w mirrorze, markery bez miejsca
                    pushPlain(i);
                    var innerStart = i + oLen, innerEnd = end;
                    api.pushSpan(container, s.slice(innerStart, innerEnd), fmt.cls, base + innerStart, base + innerEnd, ctx);
                    i = innerEnd + cLen;
                    matched = true;
                    break;
                }
                if (api.lineActive(ctx)) pushPlain(i + oLen); // [EN] otwarta klamra — ** jak zwykłe znaki
                else i += oLen;
                matched = true;
                break;
            }
            if (matched) continue;
            pushPlain(_nextPlainEnd(s, i, order));
            if (i === prev) i++;
        }
    }

    function listRegions(val) { // [EN] sparowane regiony inline — do snap zaznaczenia poza markery
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

    function normalizeSelectionRange(val, start, end) { // [EN] zaznaczenie = treść, nie ** / __ / ~~ / ::
        if (start == null || end == null || start === end) return { start: start, end: end, changed: false };
        var a = Math.min(start, end), b = Math.max(start, end);
        var regions = listRegions(val);
        if (!regions.length) return { start: a, end: b, changed: false };
        var changed = false;
        var outer = null;
        regions.forEach(function(r) {
            if (a <= r.uStart && b >= r.uEnd && (!outer || (r.uEnd - r.uStart) > (outer.uEnd - outer.uStart))) outer = r;
        });
        if (outer) { a = outer.innerStart; b = outer.innerEnd; changed = true; }
        else {
            regions.forEach(function(r) {
                if (a <= r.uStart && b > r.innerEnd && b <= r.uEnd) { a = r.innerStart; b = r.innerEnd; changed = true; }
            });
            regions.forEach(function(r) {
                if (a > r.uStart && a < r.innerStart) { a = r.innerStart; changed = true; }
                else if (a > r.innerEnd && a < r.uEnd) { a = r.innerEnd; changed = true; }
                if (b > r.innerEnd && b < r.uEnd) { b = r.innerEnd; changed = true; }
                else if (b > r.uStart && b < r.innerStart) { b = r.innerStart; changed = true; }
            });
        }
        if (a >= b) return { start: start, end: end, changed: false };
        return { start: a, end: b, changed: changed };
    }

    function markerEnvelope(val, start, end, open, close) { // [EN] toggle — rozpoznaj otoczkę bez dokładania ****
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

    function displayPrefix(val, bufEnd) { // [EN] tekst wizualny przed kursorem — zamknięte markery bez szerokości
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
                    if (bufEnd <= innerStart) { i = bufEnd; } // [EN] zamknięte — markery bez miejsca (jak mirror)
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
