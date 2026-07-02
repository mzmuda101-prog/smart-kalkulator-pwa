/* =============================================================================
   STROJENIE MOBILE KALKULATORA (szerokość < 640 px)
   ─────────────────────────────────────────────────────────────────────────────
   Po edycji pliku: odśwież stronę (SW cache!) albo w konsoli:
     reapplyCalcLayoutTune()

   Podgląd bez zgadywania:
     previewCurrentCalcLayout()   — co jest TERAZ na ekranie
     previewDisplayCurve()        — wysokość wyświetlacza vs panel
     previewKeypadFontCurve()     — skala fontu klawiszy

   CO DZIAŁA (mobile <640 px):
   ─ displayCurve.points     [wysokość panelu px, wysokość .calc-display px]
   ─ displayCurve.minPx/maxPx — clamp końcowy
   ─ displayCurve.typingBonusPx — dodatkowe px gdy coś wpisane
   ─ exprMinHeight           min. wiersz pola wyrażenia (CSS --calc-expr-min)
   ─ exprResultGap           odstęp expr/wynik w .calc-display
   ─ displayPadY / displayPadX padding wyświetlacza
   ─ resultReserveEmpty      rezerwa na wynik (pusty ekran, JS bounds)
   ─ resultReserveMin        min. rezerwa przy aktywnym wyrażeniu
   ─ resultAnimSlack         zapas pod animację wyniku
   ─ gridGapPx               szczelina siatki klawiszy
   ─ btnRowBase              baza do pomiaru rowScale (font)
   ─ keypadFont.*            font klawiszy (--calc-font-base, --calc-btn-scale, groups)

   NIE DZIAŁA poniżej 640 px szerokości — tam layout desktop (CSS), nie ten plik.

   ============================================================================= */

window.CALC_LAYOUT_TUNE = {

    mobile: {

        displayCurve: {
            heightMode: 'px',
            points: [
                [520, 118],
                [640, 122],
                [740, 128],
                [850, 132],
                [950, 138],
            ],
            minPx: 110,
            maxPx: 160,
            typingBonusPx: 0,
            displayPadEstimate: 24,
        },

        displayPadY: 12,
        displayPadX: 14,
        exprMinHeight: 44,
        exprResultGap: 6,
        resultReserveEmpty: 48,
        resultAnimSlack: 4,
        resultReserveMin: 36,
        gridGapPx: 8,

        btnRowBase: 56,

        keypadFont: {
            baseRem: 1.35,
            globalMul: 1.0,
            scaleMin: 0.88,
            scaleMax: null,
            rowScaleCap: 1.12,
            panelCurve: {
                points: [
                    [520, 0.98],
                    [640, 1.0],
                    [740, 1.02],
                    [850, 1.03],
                    [950, 1.04],
                ],
            },
            rowCurve: {
                points: [
                    [0.85, 0.98],
                    [1.0,  1.0],
                    [1.12, 1.02],
                ],
            },
            groups: {
                fn:       { fontScale: 1.0 },
                number:   { fontScale: 1.05 },
                operator: { fontScale: 1.0 },
                equals:   { fontScale: 1.08 },
                clear:    { fontScale: 1.0 },
            },
        },

        debug: false,
    },
};

function _calcTuneLerpPoints(points, x) {
    if (!points || !points.length) return 1;
    var sorted = points.slice().sort(function(a, b) { return a[0] - b[0]; });
    if (x <= sorted[0][0]) return sorted[0][1];
    var last = sorted[sorted.length - 1];
    if (x >= last[0]) return last[1];
    for (var i = 0; i < sorted.length - 1; i++) {
        var x0 = sorted[i][0], y0 = sorted[i][1];
        var x1 = sorted[i + 1][0], y1 = sorted[i + 1][1];
        if (x >= x0 && x <= x1) {
            var t = (x1 === x0) ? 0 : (x - x0) / (x1 - x0);
            return y0 + t * (y1 - y0);
        }
    }
    return last[1];
}

function _calcDisplayStructuralMin(mobileTune, curve) {
    var t = mobileTune || {};
    var c = curve || {};
    var pad = t.displayPadY != null ? t.displayPadY * 2 : (c.displayPadEstimate != null ? c.displayPadEstimate : 24);
    var expr = t.exprMinHeight != null ? t.exprMinHeight : 32;
    var gap = t.exprResultGap != null ? t.exprResultGap : 6;
    var res = t.resultReserveEmpty != null ? t.resultReserveEmpty : 48;
    return pad + expr + gap + res;
}

function _calcHeightFromCurve(c, panelH) {
    if (!c || !c.points || !c.points.length) return panelH * 0.19;
    var y = _calcTuneLerpPoints(c.points, panelH);
    if (c.heightMode === 'px') return y;
    if (c.heightMode === 'share') return panelH * y;
    if (c.points[0][1] <= 1) return panelH * y;
    return y;
}

window.resolveCalcDisplayBudget = function resolveCalcDisplayBudget(panelH, isTyping, mobileTune) {
    var t = mobileTune || (window.CALC_LAYOUT_TUNE && window.CALC_LAYOUT_TUNE.mobile) || {};
    var c = t.displayCurve || {};
    var raw = _calcHeightFromCurve(c, panelH);
    if (isTyping && c.typingBonusPx) raw += c.typingBonusPx;

    var structural = _calcDisplayStructuralMin(t, c);
    var minPx = Math.max(c.minPx != null ? c.minPx : 108, structural);
    var maxPx = c.maxPx != null ? c.maxPx : 150;
    var height = Math.max(minPx, Math.min(maxPx, Math.round(raw)));

    var limit = 'curve';
    if (height <= minPx + 0.5) limit = 'minPx';
    else if (height >= maxPx - 0.5) limit = 'maxPx';

    var share = panelH > 0 ? Math.round((height / panelH) * 1000) / 1000 : 0;
    return {
        panelH: panelH,
        rawPx: Math.round(raw),
        share: share,
        height: height,
        minPx: minPx,
        maxPx: maxPx,
        structuralMin: structural,
        limit: limit,
    };
};

window.resolveKeypadFontScale = function resolveKeypadFontScale(panelH, rowScale, mobileTune) {
    var t = mobileTune || (window.CALC_LAYOUT_TUNE && window.CALC_LAYOUT_TUNE.mobile) || {};
    var kf = t.keypadFont || {};
    var cap = kf.rowScaleCap != null ? kf.rowScaleCap : 1.12;
    var rowDamped = Math.min(Math.max(rowScale, 0.85), cap);
    var panelM = kf.panelCurve ? _calcTuneLerpPoints(kf.panelCurve.points, panelH) : 1;
    var rowM = kf.rowCurve ? _calcTuneLerpPoints(kf.rowCurve.points, rowDamped) : 1;
    var global = kf.globalMul != null ? kf.globalMul : 1;
    var scale = panelM * rowM * global;
    var lo = kf.scaleMin != null ? kf.scaleMin : 0.88;
    scale = Math.max(lo, scale);
    if (kf.scaleMax != null && kf.scaleMax > 0) scale = Math.min(kf.scaleMax, scale);
    return Math.round(scale * 1000) / 1000;
};

/** [EN] Push tune tokens to .card CSS vars + optional inline display height hint. */
window.applyCalcLayoutTuneTokens = function applyCalcLayoutTuneTokens(card) {
    if (!card) return;
    var t = window.CALC_LAYOUT_TUNE && window.CALC_LAYOUT_TUNE.mobile;
    if (!t) return;
    var kf = t.keypadFont || {};
    var exprMin = t.exprMinHeight != null ? t.exprMinHeight : 44;
    var padY = t.displayPadY != null ? t.displayPadY : 12;
    var padX = t.displayPadX != null ? t.displayPadX : 14;
    card.style.setProperty('--calc-expr-min', exprMin + 'px');
    card.style.setProperty('--calc-display-gap', (t.exprResultGap != null ? t.exprResultGap : 6) + 'px');
    card.style.setProperty('--calc-grid-gap', (t.gridGapPx != null ? t.gridGapPx : 8) + 'px');
    card.style.setProperty('--calc-display-pad-y', padY + 'px');
    card.style.setProperty('--calc-display-pad-x', padX + 'px');
    card.style.setProperty('--calc-font-base', (kf.baseRem != null ? kf.baseRem : 1.35) + 'rem');
    var groups = kf.groups || {};
    ['fn', 'number', 'operator', 'equals', 'clear'].forEach(function(name) {
        var mul = groups[name] && groups[name].fontScale != null ? groups[name].fontScale : 1;
        card.style.setProperty('--calc-g-' + name + '-font', String(mul));
    });
};

window.reapplyCalcLayoutTune = function reapplyCalcLayoutTune() {
    if (window.__matm0 && typeof window.__matm0.fitCalcLayout === 'function') {
        window.__matm0.fitCalcLayout();
    }
    if (window.__matm0 && typeof window.__matm0.fitCalcDisplay === 'function') {
        window.__matm0.fitCalcDisplay();
    }
};

window.previewCalcDisplayCurve = function previewCalcDisplayCurve(from, to, step) {
    var t = window.CALC_LAYOUT_TUNE && window.CALC_LAYOUT_TUNE.mobile;
    from = from != null ? from : 500;
    to = to != null ? to : 960;
    step = step != null ? step : 40;
    var rows = [];
    for (var h = from; h <= to; h += step) {
        var b = resolveCalcDisplayBudget(h, false, t);
        rows.push({
            panelPx: h,
            curvePx: b.rawPx,
            displayPx: b.height,
            limit: b.limit,
            structuralMin: b.structuralMin,
        });
    }
    console.table(rows);
    return rows;
};

window.plotCalcDisplayCurve = function plotCalcDisplayCurve(from, to, width) {
    var t = window.CALC_LAYOUT_TUNE && window.CALC_LAYOUT_TUNE.mobile;
    from = from != null ? from : 500;
    to = to != null ? to : 960;
    width = width != null ? width : 32;
    var c = (t && t.displayCurve) || {};
    var yMin = c.minPx != null ? c.minPx : 100;
    var yMax = c.maxPx != null ? c.maxPx : 160;
    var lines = ['displayCurve (px)', ''];
    for (var h = from; h <= to; h += Math.round((to - from) / 10) || 40) {
        var b = resolveCalcDisplayBudget(h, false, t);
        var n = Math.round((b.height - yMin) / (yMax - yMin) * width);
        lines.push(String(h).padStart(4) + ' |' + '#'.repeat(Math.max(0, Math.min(width, n))).padEnd(width) + '| ' + b.height + 'px (' + b.limit + ')');
    }
    console.log(lines.join('\n'));
    return lines.join('\n');
};

window.previewKeypadFontCurve = function previewKeypadFontCurve(from, to, step) {
    var t = window.CALC_LAYOUT_TUNE && window.CALC_LAYOUT_TUNE.mobile;
    var baseRem = t.keypadFont && t.keypadFont.baseRem != null ? t.keypadFont.baseRem : 1.35;
    var rowBase = t.btnRowBase != null ? t.btnRowBase : 56;
    from = from != null ? from : 500;
    to = to != null ? to : 960;
    step = step != null ? step : 40;
    var rows = [];
    for (var h = from; h <= to; h += step) {
        var rowH = Math.round((h * 0.65) / 5);
        var rowScale = rowH / rowBase;
        var scale = resolveKeypadFontScale(h, rowScale, t);
        rows.push({
            panelPx: h,
            estRowPx: rowH,
            btnScale: scale,
            numberRem: (baseRem * scale * (t.keypadFont.groups.number.fontScale || 1)).toFixed(2),
        });
    }
    console.table(rows);
    return rows;
};

window.previewCurrentCalcLayout = function previewCurrentCalcLayout() {
    var panel = document.getElementById('panel-calculator');
    var card = panel && panel.querySelector('.card');
    var display = card && card.querySelector('.calc-display');
    var btn = document.querySelector('#calcGrid .calc-btn');
    var t = window.CALC_LAYOUT_TUNE && window.CALC_LAYOUT_TUNE.mobile;
    var panelH = panel ? panel.clientHeight : 0;
    var panelW = window.innerWidth;
    var isTyping = !!(document.getElementById('calcExpr') && document.getElementById('calcExpr').value);
    var budget = resolveCalcDisplayBudget(panelH, isTyping, t);
    var rowH = btn ? Math.round(btn.getBoundingClientRect().height) : 0;
    var rowScale = rowH / (t.btnRowBase || 56);
    var btnScale = resolveKeypadFontScale(panelH, rowScale, t);
    var baseRem = t.keypadFont.baseRem != null ? t.keypadFont.baseRem : 1.35;
    var row = {
        viewportW: panelW,
        mobileLayout: panelW < 640,
        panelH: panelH,
        displayBudgetPx: budget.height,
        displayActualPx: display ? display.clientHeight : 0,
        budgetLimit: budget.limit,
        rowH: rowH,
        btnScale: btnScale,
        numberFontRem: (baseRem * btnScale * (t.keypadFont.groups.number.fontScale || 1)).toFixed(2),
    };
    console.table([row]);
    return row;
};

window.CALC_LAYOUT_TUNE.previewDisplayCurve = window.previewCalcDisplayCurve;
window.CALC_LAYOUT_TUNE.plotDisplayCurve = window.plotCalcDisplayCurve;
window.CALC_LAYOUT_TUNE.previewKeypadFont = window.previewKeypadFontCurve;
window.CALC_LAYOUT_TUNE.previewCurrent = window.previewCurrentCalcLayout;
window.CALC_LAYOUT_TUNE.reapply = window.reapplyCalcLayoutTune;
window.CALC_LAYOUT_TUNE.resolveDisplayBudget = window.resolveCalcDisplayBudget;
window.CALC_LAYOUT_TUNE.resolveKeypadFont = window.resolveKeypadFontScale;
