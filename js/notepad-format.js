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

    var HEADING = [ // [EN] wrap zaznaczenia — pary PUA jak B/I (bez glifu na początku linii)
        { id: 'h1', act: 'heading-1', level: 1, label: 'H1', title: 'Nagłówek 1', open: '\uE013', close: '\uE014', cls: 'np-h1', menu: false, heading: true },
        { id: 'h2', act: 'heading-2', level: 2, label: 'H2', title: 'Nagłówek 2', open: '\uE015', close: '\uE016', cls: 'np-h2', menu: false, heading: true },
        { id: 'h3', act: 'heading-3', level: 3, label: 'H3', title: 'Nagłówek 3', open: '\uE017', close: '\uE018', cls: 'np-h3', menu: false, heading: true }
    ];
    var _LEGACY_LINE_HEADING = { '\uE010': 1, '\uE011': 2, '\uE012': 3 }; // [EN] stary model linii → migracja przy load

    var _ALIGN_PREFIX = { left: '', center: '< ', right: '> ', justify: '| ' };

    var _byAct = {};
    INLINE.forEach(function (f) { _byAct[f.act] = f; });
    HEADING.forEach(function (f) { _byAct[f.act] = f; });
    LINE.forEach(function (f) { _byAct[f.act] = f; });
    FONT.forEach(function (f) { _byAct[f.act] = f; });

    function _escRe(ch) { return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    function _scanOrder() {
        return INLINE.concat(HEADING).slice().sort(function (a, b) { return b.open.length - a.open.length; });
    }

    function _markerCharSet() {
        var set = {};
        _scanOrder().forEach(function (f) { set[f.open] = 1; set[f.close] = 1; });
        Object.keys(_LEGACY_LINE_HEADING).forEach(function (k) { set[k] = 1; });
        return set;
    }
    function _isMarkerChar(ch) { return !!_markerCharSet()[String(ch || '')]; }

    function _parseAlignRaw(s) {
        if (s.startsWith('> ')) return { align: 'right', rest: s.slice(2) };
        if (s.startsWith('< ')) return { align: 'center', rest: s.slice(2) };
        if (s.startsWith('| ')) return { align: 'justify', rest: s.slice(2) };
        return { align: 'left', rest: s };
    }

    function migrateLineHeadingMarkers(t) { // [EN] stary jednoznakowy H na początku linii → wrap całego body
        return String(t || '').split('\n').map(function (line) {
            var a = _parseAlignRaw(line);
            var lv = _LEGACY_LINE_HEADING[a.rest.charAt(0)];
            if (!lv) return line;
            var fmt = HEADING[lv - 1];
            var body = a.rest.slice(1);
            return (_ALIGN_PREFIX[a.align] || '') + fmt.open + body + fmt.close;
        }).join('\n');
    }

    function headingByLevel(level) {
        var lv = level | 0;
        if (lv < 1 || lv > 3) return null;
        return HEADING[lv - 1];
    }

    function headingLevelLabel(level) {
        if (level === 1) return 'H1';
        if (level === 2) return 'H2';
        if (level === 3) return 'H3';
        return 'T';
    }

    function stripHeadingsFromText(s) {
        var t = String(s || '');
        HEADING.forEach(function (h) {
            var re = new RegExp(_escRe(h.open) + '([^' + _escRe(h.close) + '\\n]*)' + _escRe(h.close), 'g');
            t = t.replace(re, '$1');
        });
        return t;
    }

    function selectionHeadingLevel(val, start, end) {
        if (start == null || end == null || start >= end) return 0;
        var regions = listRegions(String(val || ''));
        var hit = null;
        regions.forEach(function (r) {
            if (!r.fmt || !r.fmt.heading) return;
            if (r.uStart <= start && r.uEnd >= end) {
                if (!hit || (r.uEnd - r.uStart) < (hit.uEnd - hit.uStart)) hit = r;
            }
        });
        return hit ? hit.fmt.level : 0;
    }

    function applyHeadingToRange(val, start, end, level) {
        val = String(val || '');
        start = Math.max(0, Math.min(start == null ? 0 : start, val.length));
        end = Math.max(start, Math.min(end == null ? start : end, val.length));
        if (end > start) { // [EN] rozszerz na cały wrap H — inaczej T zostawia sieroty PUA
            var box = { start: start, end: end };
            listRegions(val).forEach(function (r) {
                if (!r.fmt || !r.fmt.heading) return;
                if (r.innerEnd <= box.start || r.innerStart >= box.end) return;
                box.start = Math.min(box.start, r.uStart);
                box.end = Math.max(box.end, r.uEnd);
            });
            start = box.start;
            end = box.end;
        }
        var slice = val.slice(start, end);
        var inner = stripHeadingsFromText(slice);
        var lv = Math.max(0, Math.min(3, level == null ? 0 : (level | 0)));
        var text = inner;
        var selStart = start;
        var selEnd = start + inner.length;
        if (lv > 0) {
            var h = HEADING[lv - 1];
            text = h.open + inner + h.close;
            selStart = start + h.open.length;
            selEnd = selStart + inner.length;
        }
        return { start: start, end: end, text: text, selStart: selStart, selEnd: selEnd };
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

    // [EN] Legacy MD italic _x_ — only at word boundaries so p_Michal_Aga / @p_robert stay intact
    function _legacyItalicRe() {
        return /(^|[^\p{L}\p{N}_])_([^_\n]{2,})_(?=[^\p{L}\p{N}_]|$)/gu;
    }
    function _stripLegacyItalic(t) {
        return String(t || '').replace(_legacyItalicRe(), '$1$2');
    }
    function _migrateLegacyItalic(t) {
        return String(t || '').replace(_legacyItalicRe(), function (_, pre, inner) {
            return pre + INLINE[1].open + inner + INLINE[1].close;
        });
    }

    function stripMarkers(s) {
        var t = String(s || '');
        HEADING.forEach(function (h) {
            var re = new RegExp(_escRe(h.open) + '([^' + _escRe(h.close) + '\\n]*)' + _escRe(h.close), 'g');
            t = t.replace(re, '$1');
        });
        INLINE.forEach(function (f) {
            var re = new RegExp(_escRe(f.open) + '([^' + _escRe(f.close) + '\\n]+)' + _escRe(f.close), 'g');
            t = t.replace(re, '$1');
        });
        t = t.replace(/\*\*([^*\n]+)\*\*/g, '$1');
        t = t.replace(/__([^_\n]+)__/g, '$1');
        t = t.replace(/~~([^~\n]+)~~/g, '$1');
        t = t.replace(/::([^:\n]+)::/g, '$1');
        t = _stripLegacyItalic(t);
        return t.replace(/\u200B/g, '');
    }

    function migrateLegacyMarkers(s) { // [EN] ** → znaki toolbar przy ładowaniu notatki
        var t = String(s || '');
        if (t.indexOf('\u200B') >= 0) t = t.split('\u200B').join('*');
        t = t.replace(/\*\*([^*\n]+)\*\*/g, function (_, inner) { return INLINE[0].open + inner + INLINE[0].close; });
        t = t.replace(/__([^_\n]+)__/g, function (_, inner) { return INLINE[2].open + inner + INLINE[2].close; });
        t = t.replace(/~~([^~\n]+)~~/g, function (_, inner) { return INLINE[3].open + inner + INLINE[3].close; });
        t = t.replace(/::([^:\n]+)::/g, function (_, inner) { return INLINE[4].open + inner + INLINE[4].close; });
        t = _migrateLegacyItalic(t);
        return migrateLineHeadingMarkers(t);
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
        items.push(['heading-slot', headingLevelLabel(lvl), 'Nagłówek — przesuń w pionie']);
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
            var pc = s.indexOf(f.close, i);
            if (pc >= 0 && pc < next) next = pc;
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
            if (_isMarkerChar(s[i])) { i++; continue; } // [EN] orphan close/PUA — zero width, no tofu in mirror
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
        var s = stripMarkers(String(line || '').trim());
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

    function displayPrefix(val, bufEnd) { // [EN] tekst wizualny przed kursorem — markery (także zagnieżdżone H+B/I) = 0 szerokości
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
                    else if (bufEnd <= innerEnd) {
                        // [EN] caret w środku wrapa — rekurencja, nie raw slice (inaczej Bo/H w out)
                        out += displayPrefix(val.slice(innerStart, bufEnd), bufEnd - innerStart);
                        i = bufEnd;
                    } else if (bufEnd <= uEnd) {
                        out += displayPrefix(val.slice(innerStart, innerEnd), innerEnd - innerStart);
                        i = bufEnd;
                    } else {
                        out += displayPrefix(val.slice(innerStart, innerEnd), innerEnd - innerStart);
                        i = uEnd;
                    }
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
        var s = migrateLineHeadingMarkers(collapseEmptyMarkers(String(val || '')));
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
        headingByLevel: headingByLevel,
        headingLevelLabel: headingLevelLabel,
        selectionHeadingLevel: selectionHeadingLevel,
        applyHeadingToRange: applyHeadingToRange,
        migrateLineHeadingMarkers: migrateLineHeadingMarkers,
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
