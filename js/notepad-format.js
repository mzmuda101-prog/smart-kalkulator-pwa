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
    // Faza B: selectionMenuItems({ singleLine }) will append LINE when cursor in one line
    var LINE = [
        { id: 'align-left', act: 'align-left', label: '◀', title: 'Do lewej', mode: 'left', panelMenu: true, kb: true, selectionMenu: true },
        { id: 'align-center', act: 'align-center', label: '≡', title: 'Do środka', mode: 'center', panelMenu: true, kb: true, selectionMenu: true },
        { id: 'align-right', act: 'align-right', label: '▶', title: 'Do prawej', mode: 'right', panelMenu: true, kb: true, selectionMenu: true },
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
        function gPos() { return base + i; }
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
                    var reg0 = base + i, reg1 = base + end + cLen;
                    pushPlain(i);
                    api.pushGhost(container, o, gPos(), gPos() + oLen, ctx, reg0, reg1);
                    i += oLen;
                    api.pushSpan(container, s.slice(i, end), fmt.cls, base + i, base + end, ctx);
                    i = end;
                    api.pushGhost(container, c, gPos(), gPos() + cLen, ctx, reg0, reg1);
                    i += cLen;
                    matched = true;
                    break;
                }
                if (api.lineActive(ctx)) pushPlain(i + oLen);
                else i += oLen;
                matched = true;
                break;
            }
            if (matched) continue;
            pushPlain(_nextPlainEnd(s, i, order));
            if (i === prev) i++;
        }
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
        kbBarSpecs: kbBarSpecs
    };

    if (typeof window !== 'undefined') window.MATM0_NP_FMT = API;
    if (typeof self !== 'undefined') self.MATM0_NP_FMT = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
