/* =============================================================================
   STROJENIE KALKULATORA — js/calc-layout-tune.js
   ─────────────────────────────────────────────────────────────────────────────
   Po edycji: odśwież (SW!) albo  reapplyCalcLayoutTune()

   PODZIAŁ EKRAN vs KLAWISZE — displayCurve (mobile + desktop):
   ─ share / points / minPx·maxPx     — wysokość .calc-display (budżet z krzywej)
   ─ typingBonusShare / typingBonusPx — gdy coś wpisane
   ─ scrollOverflow (desktop)         — karta może wystawać pod viewport (.panels scroll)
   ─ scrollOverflow (mobile)          — auto calc-panel-scroll gdy za ciasno:
       compactViewportPx              — visibleH < próg → scroll zamiast ściskania UI
       keypadMinPx                    — min. wys. klawiatury w trybie scroll
       enabled                        — wymusza scroll zawsze (debug)
   ─ scrollOverflow.belowPx / belowShare / maxBelowPx — tylko desktop
   ─ scrollOverflow.viewportBottomGapPx / cardMinPx / cardMaxPx

   WYNIK — displayFont + root (resultWrap*):
   ─ resultRem + resultShrinkMinRem   — bazowy font i JEDYNY próg min (binary search
                                        na probe; bez drugiego „hard min")
   ─ resultWrapMaxLines               — max 2 linie (grupy tysięcy), potem shrink
   ─ resultWrapMaxExtraLines          — +px wys. ekraniku w budżecie przy 2. linii
   ─ resultWrapPadBottom (root)       — mniejszy padding-bottom ekranika przy 2 liniach
   ─ resultWrapExprMinPx (root)       — niższy --calc-expr-min przy 2 liniach (więcej
                                        miejsca na wynik; ekranik rośnie w dół)

   ODSTĘPY W WYNIKU — resultGaps (wspólne mobile + desktop):
   ─ mode ('em' | 'percent')            — sposób edycji (resultGapsMode)
   ─ em: numGroupEm, textEm             — bezpośrednio w em
   ─ percent: numGroupPct, textPct      — 100 = domyślna spacja; 92 = 8% wężej
   ─ baselineEm (percent)               — szerokość „100%" w em (domyślnie 0.28)
   Po edycji: reapplyCalcLayoutTune() — od razu widać w polu wyniku.

   Sekcje:  mobile (<640 px)  |  desktop (≥640 px, flexSplit: true)

   Po edycji w konsoli:
     CALC_LAYOUT_TUNE.mobile.displayCurve.maxPx = 170
     CALC_LAYOUT_TUNE.mobile.resultWrapPadBottom = 8
     CALC_LAYOUT_TUNE.resultGaps.mode = 'percent'
     CALC_LAYOUT_TUNE.resultGaps.numGroupPct = 92
     CALC_LAYOUT_TUNE.resultGaps.textPct = 95
     reapplyCalcLayoutTune()
     previewCurrentCalcLayout()

   Podgląd:
     previewCurrentCalcLayout()   — budgetLimit, panelScroll, displayActualPx
     previewDisplayCurve()
     previewKeypadFontCurve()

   FONTY (3 osobne ścieżki — NIE mieszają się):
   ─ displayFont.exprRem          — wpisywany tekst + placeholder
   ─ displayFont.resultRem        — wynik (przed dopasowaniem)
   ─ displayFont.resultShrinkMinRem / resultWrapMaxLines — patrz WYNIK wyżej
   ─ keypadFont.baseRem + groups  — TYLKO etykiety na przyciskach klawiatury

   =============================================================================
   NOTATKA: edytuję głównie displayCurve + displayFont + keypadFont + resultWrap*.
   Jak zmiana „nic nie robi” → previewCurrentCalcLayout() i patrz budgetLimit.
   Realne telefony (≥568px wys.) zwykle bez calc-panel-scroll.
   ============================================================================= */

window.CALC_LAYOUT_TUNE = {

    /* Odstępy w polu wyniku / notatniku.
       mode 'em' → numGroupEm / textEm (bezpośrednio).
       mode 'percent' → numGroupPct / textPct; 100% = baselineEm (= domyślna spacja). */
    resultGaps: {
        mode: 'percent',  // 'em' | 'percent'  (alias w docs: resultGapsMode)
        baselineEm: 0.28, // [percent] szerokość spacji przy 100%
        numGroupPct: 70,  // [percent] grupy tysięcy: 1 234 567 (~89% ≈ to było 0.25em)
        textPct: 85,      // [percent] tekst/czas: 16 h 40 min (~93% ≈ to było 0.26em)
        numGroupEm: 0.25, // [em] gdy mode === 'em'
        textEm: 0.26,     // [em] gdy mode === 'em'
    },

    /* ── MOBILE: szerokość okna < 640 px ── */
    mobile: {
        flexSplit: true, // false = stary layout CSS, bez % podziału
        availHeightMode: 'panel', // wys. panelu = referencja (nie viewport)

        displayCurve: {
            heightMode: 'share', // 'share' = % | 'px' = konkretne px w points
            share: 0.19, // PROSTY KNOB: 0.19 = 19% wys. karty → ekranik (reszta klawisze)
            points: [ // krzywa zamiast share → ustaw share: null i edytuj tu
                [520, 0.21],
                [640, 0.19],
                [740, 0.17],
                [850, 0.15],
                [950, 0.13],
            ],
            minShare: 0.12, // dolna granica % — poniżej tego nie schodzi
            maxShare: 0.26, // górna granica % — powyżej nie idzie (zostaw klawisze)
            minPx: 110, // min. wys. .calc-display — sensowne minimum (nie optymalizujemy pod <500px viewport)
            maxPx: 160, // górna granica ekraniku bez scrolla; powyżej → body.calc-panel-scroll
            typingBonusShare: 0, // +% wys. karty gdy coś wpisane (np. 0.02)
            typingBonusPx: 0, // albo +px na sztywno zamiast share
            displayPadEstimate: 24, // używane w min. strukturalnym (pad+expr+wynik)
            scrollOverflow: {
                // Poniżej compactViewportPx — scroll palcem zamiast ściskania klawiatury do zera.
                // Realne telefony (SE 568+, standard 667+) zwykle bez scrolla.
                enabled: false, // wymuszone gdy visibleH < compactViewportPx lub wynik > maxPx
                compactViewportPx: 500, // widoczna wys. panelu — próg „ekstremalnie mały"
                keypadMinPx: 280, // min. wys. klawiatury gdy scroll aktywny
                belowPx: 0,
                belowShare: 0,
                maxBelowPx: 0,
                viewportBottomGapPx: 16,
                cardMinPx: 280,
                cardMaxPx: 720,
            },
        },

        displayPadY: 12, // padding góra/dół ekranika; dół przy 2 liniach → resultWrapPadBottom
        displayPadX: 14,
        exprMinHeight: 44, // min. miejsce na „Lub wpisz wyrażenie…”
        exprResultGap: 6, // odstęp między polem a wynikiem
        resultReserveEmpty: 48, // rezerwa na „0” gdy pusto
        resultAnimSlack: 4, // zapas w _calcResultReserve (expr max-height)
        resultReserveMin: 36, // min. rezerwa wyniku gdy coś wpisane (budżet expr)
        resultWrapPadBottom: 6, // padding-bottom .calc-display gdy wynik ma 2 linie
        resultWrapExprMinPx: 28, // --calc-expr-min na display gdy 2 linie (domyślnie 44)
        gridGapPx: 8, // szczelina między klawiszami
        cardPadEstimate: 28, // fallback gdy brak viewportBottomGapPx
        btnRowBase: 56, // odniesienie do skali fontu (nie wys. rzędu!)

        /* Fonty EKRANIKA — osobno od keypadFont (przyciski klawiatury). */
        displayFont: {
            exprRem: 1.25, // wpisywany tekst + placeholder „Lub wpisz…”
            exprMinRem: 1, // dolna granica shrinku expr (mobile: nie poniżej exprMinPx)
            exprMinPx: 16, // próg iOS — focus bez zoomu WebKit
            resultRem: 2.5, // bazowy rozmiar wyniku (CSS --calc-result-font)
            resultShrinkMinRem: 1.2, // dolna granica fontu wyniku (probe binary search)
            resultWrapMaxLines: 2, // max linii; najpierw shrink 1 linia, potem wrap
            resultWrapMaxExtraLines: 1, // +1× linePx do budżetu wys. ekraniku (resolveCalcDisplayBudget)
            approxRem: 1.6, // znacznik „≈"
        },

        keypadFont: {
            baseRem: 1.35, // bazowy rozmiar na klawiszu
            globalMul: 1.0, // master: 1.1 = +10% wszystkich klawiszy
            scaleMin: 0.88,
            scaleMax: null, // null = bez górnego limitu; 1.08 jak za duże
            rowScaleCap: 1.12,
            panelCurve: { // lekki tweak fontu wg wysokości panelu
                points: [[520, 0.98], [640, 1.0], [740, 1.02], [850, 1.03], [950, 1.04]],
            },
            rowCurve: { // drobna korekta wg wys. rzędu (nie mnożymy 1:1!)
                points: [[0.85, 0.98], [1.0, 1.0], [1.12, 1.02]],
            },
            groups: { // mnożnik per typ przycisku (po baseRem * btnScale)
                fn:       { fontScale: 1.0 },
                number:   { fontScale: 1.05 },
                operator: { fontScale: 1.0 },
                equals:   { fontScale: 1.08 },
                clear:    { fontScale: 1.0 }, // AC — klasa .clear
            },
        },

        debug: false, // true → logi [calc-layout] w konsoli
    },

    /* ── DESKTOP / TABLET: szerokość ≥ 640 px ── */
    desktop: {
        flexSplit: true,
        availHeightMode: 'viewport', // liczę od viewportu (nie od panelu)

        displayCurve: {
            heightMode: 'share',
            share: 0.22, // trochę więcej ekranu niż mobile — tu edytuję najczęściej
            points: [ // share: null → wtedy liczy z points
                [600, 0.24],
                [800, 0.22],
                [1000, 0.20],
                [1200, 0.18],
            ],
            minShare: 0.14,
            maxShare: 0.32,
            minPx: 100,
            maxPx: 240, // budżet ekraniku; przy 2 liniach fitCalcLayout może podbić do wrapMin
            typingBonusShare: 0.012, // odrobinę więcej ekranu jak coś wpisuję
            typingBonusPx: 0,
            displayPadEstimate: 40,
            scrollOverflow: {
                // .panels ma scroll — karta może wystawać pod dół ekranu
                enabled: true, // false → wszystko musi się zmieścić bez scrolla
                belowPx: 100, // +100 px pod viewport (najprostszy knob)
                belowShare: 0, // alternatywa: 0.06 = 6% wys. okna (bierze max z belowPx)
                maxBelowPx: 140, // nie wystawaj bardziej niż tyle
                viewportBottomGapPx: 8, // luz nad dołem ekranu (mniej = więcej miejsca)
                cardMinPx: 360, // min. wys. referencyjna całej karty
                cardMaxPx: 960, // max. wys. karty
            },
        },

        displayPadY: 20, // padding góra/dół; przy 2 liniach dół → resultWrapPadBottom
        displayPadX: 22,
        exprMinHeight: 40,
        exprResultGap: 6,
        resultReserveEmpty: 52,
        resultAnimSlack: 4,
        resultReserveMin: 40,
        resultWrapPadBottom: 8, // padding-bottom ekranika przy 2 liniach wyniku
        resultWrapExprMinPx: 32, // --calc-expr-min na display przy 2 liniach
        gridGapPx: 10,
        cardPadEstimate: 24,
        btnRowBase: 62, // desktop: większe odniesienie niż mobile

        displayFont: {
            exprRem: 1.25,
            exprMinRem: 0.9, // desktop może lekko zmniejszyć expr przy overflow
            exprMinPx: 16,
            resultRem: 3, // desktop: większy wynik niż mobile (2.5)
            resultShrinkMinRem: 1.25, // dolna granica fontu wyniku (probe binary search)
            resultWrapMaxLines: 2,
            resultWrapMaxExtraLines: 1, // +linePx w budżecie przy drugiej linii
            approxRem: 1.6,
        },

        keypadFont: {
            baseRem: 1.35,
            globalMul: 1.0,
            scaleMin: 0.92,
            scaleMax: 1.06, // desktop ma twardszy limit — bez skoków przy 640px
            rowScaleCap: 1.08,
            panelCurve: {
                points: [[600, 0.98], [900, 1.0], [1200, 1.02]],
            },
            rowCurve: {
                points: [[0.9, 0.98], [1.0, 1.0], [1.08, 1.02]],
            },
            groups: {
                fn:       { fontScale: 1.0 },
                number:   { fontScale: 1.0 },
                operator: { fontScale: 1.0 },
                equals:   { fontScale: 1.04 },
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

window.getCalcLayoutTuneSection = function getCalcLayoutTuneSection() {
    var r = window.CALC_LAYOUT_TUNE;
    if (!r) return {};
    return window.innerWidth < 640 ? (r.mobile || {}) : (r.desktop || r.mobile || {});
};

// czytam scrollOverflow z displayCurve (stare klucze na rootzie też działają — legacy)
function _calcScrollOverflowOpts(tune) {
    var t = tune || {};
    var c = t.displayCurve || {};
    var s = c.scrollOverflow || {};
    function pick(key, legacy, fb) {
        if (s[key] != null) return s[key];
        if (c[legacy] != null) return c[legacy];
        if (t[legacy] != null) return t[legacy];
        return fb;
    }
    return {
        enabled: pick('enabled', 'allowScrollOverflow', false),
        compactViewportPx: s.compactViewportPx != null ? s.compactViewportPx : 500,
        keypadMinPx: s.keypadMinPx != null ? s.keypadMinPx : 280,
        belowPx: pick('belowPx', 'scrollOverflowPx', 0),
        belowShare: pick('belowShare', 'scrollOverflowShare', 0),
        maxBelowPx: pick('maxBelowPx', 'scrollOverflowMaxPx', 0),
        viewportBottomGapPx: pick('viewportBottomGapPx', 'viewportBottomGapPx', null),
        cardMinPx: pick('cardMinPx', 'availMinPx', 300),
        cardMaxPx: pick('cardMaxPx', 'availMaxPx', 2000),
    };
}

function _calcDisplayStructuralMin(tune, curve) {
    // minimalna sensowna wys. wyświetlacza — jak share da mniej, wygrywa to
    var t = tune || {};
    var c = curve || {};
    var pad = t.displayPadY != null ? t.displayPadY * 2 : (c.displayPadEstimate != null ? c.displayPadEstimate : 24);
    var expr = t.exprMinHeight != null ? t.exprMinHeight : 32;
    var gap = t.exprResultGap != null ? t.exprResultGap : 6;
    var res = t.resultReserveEmpty != null ? t.resultReserveEmpty : 48;
    return pad + expr + gap + res;
}

function _calcHeightFromCurve(c, panelH) {
    if (!c || panelH <= 0) return panelH * 0.2;
    var shareVal = null;
    if (c.heightMode === 'share') {
        if (c.share != null) shareVal = c.share;
        else if (c.points && c.points.length) shareVal = _calcTuneLerpPoints(c.points, panelH);
        else shareVal = 0.2;
        if (c.minShare != null) shareVal = Math.max(c.minShare, shareVal);
        if (c.maxShare != null) shareVal = Math.min(c.maxShare, shareVal);
        return panelH * shareVal;
    }
    if (c.heightMode === 'px') {
        if (c.points && c.points.length) return _calcTuneLerpPoints(c.points, panelH);
        return c.share != null ? c.share : 120;
    }
    var y = c.points && c.points.length ? _calcTuneLerpPoints(c.points, panelH) : 0.2;
    if (y <= 1) return panelH * y;
    return y;
}

window.resolveCalcDisplayBudget = function resolveCalcDisplayBudget(panelH, isTyping, tune, wrapOpts) {
    tune = tune || window.getCalcLayoutTuneSection();
    wrapOpts = wrapOpts || {};
    var c = tune.displayCurve || {};
    var raw = _calcHeightFromCurve(c, panelH);
    if (isTyping) {
        if (c.typingBonusShare) raw += panelH * c.typingBonusShare;
        if (c.typingBonusPx) raw += c.typingBonusPx;
    }

    var structural = _calcDisplayStructuralMin(tune, c);
    var minPx = Math.max(c.minPx != null ? c.minPx : 108, structural);
    var maxPx = c.maxPx != null ? c.maxPx : 200;
    var height = Math.max(minPx, Math.min(maxPx, Math.round(raw)));

    var extraLines = Math.max(0, wrapOpts.resultExtraLines || 0);
    var df = tune.displayFont || {};
    var maxExtra = df.resultWrapMaxExtraLines != null ? df.resultWrapMaxExtraLines
        : (tune.resultWrapMaxExtraLines != null ? tune.resultWrapMaxExtraLines : 1);
    extraLines = Math.min(extraLines, maxExtra);
    var linePx = wrapOpts.resultLinePx || 0;
    var wrapExtraPx = extraLines * linePx;
    if (wrapExtraPx > 0) {
        height += wrapExtraPx;
        if (c.maxShare != null && panelH > 0) height = Math.min(Math.round(panelH * c.maxShare), height);
    }

    var limit = 'curve'; // previewCurrentCalcLayout() pokaże co limituje: minPx | maxPx | curve | wrap
    if (wrapExtraPx > 0 && c.maxShare != null && panelH > 0 && height >= Math.round(panelH * c.maxShare) - 0.5) limit = 'wrap';
    else if (height <= minPx + 0.5) limit = 'minPx';
    else if (height >= maxPx - 0.5 && wrapExtraPx <= 0) limit = 'maxPx';

    var share = panelH > 0 ? Math.round((height / panelH) * 1000) / 1000 : 0;
    return {
        panelH: panelH,
        rawPx: Math.round(raw),
        share: share,
        sharePct: Math.round(share * 1000) / 10 + '%',
        height: height,
        minPx: minPx,
        maxPx: maxPx,
        structuralMin: structural,
        wrapExtraPx: wrapExtraPx,
        resultLines: extraLines + 1,
        limit: limit,
        heightMode: c.heightMode || 'share',
    };
};

window.resolveKeypadFontScale = function resolveKeypadFontScale(panelH, rowScale, tune) {
    tune = tune || window.getCalcLayoutTuneSection();
    var kf = tune.keypadFont || {};
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

/** wys. referencyjna karty = widoczne + ewentualne wystawanie (desktop scroll) */
function _resolveCalcAvailHeightDetail(panel, card, tune) {
    tune = tune || window.getCalcLayoutTuneSection();
    var isDesktop = window.innerWidth >= 640;
    var mode = tune.availHeightMode || (isDesktop ? 'viewport' : 'panel');
    if (mode === 'panel' && panel && panel.clientHeight >= 120) {
        return {
            height: panel.clientHeight,
            visibleH: panel.clientHeight,
            overflowPx: 0,
            mode: 'panel',
            allowScrollOverflow: false,
        };
    }
    if (!card) {
        return { height: 480, visibleH: 480, overflowPx: 0, mode: mode, allowScrollOverflow: false };
    }
    var scroll = _calcScrollOverflowOpts(tune);
    var vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    var top = card.getBoundingClientRect().top;
    var tools = card.querySelector('.calc-tools');
    var toolsH = tools ? tools.getBoundingClientRect().height + 8 : 48;
    var bottomGap = scroll.viewportBottomGapPx != null ? scroll.viewportBottomGapPx
        : (tune.cardPadEstimate != null ? tune.cardPadEstimate : 16);
    var visibleH = Math.round(vh - top - toolsH - bottomGap);
    var height = visibleH;
    var overflowPx = 0;
    var allowOverflow = !!scroll.enabled && isDesktop;
    if (allowOverflow) {
        overflowPx = scroll.belowPx != null ? scroll.belowPx : 0;
        if (scroll.belowShare != null && scroll.belowShare > 0) {
            overflowPx = Math.max(overflowPx, Math.round(vh * scroll.belowShare));
        }
        if (scroll.maxBelowPx != null && scroll.maxBelowPx > 0) {
            overflowPx = Math.min(overflowPx, scroll.maxBelowPx);
        }
        height += overflowPx;
    }
    var lo = scroll.cardMinPx != null ? scroll.cardMinPx : 300;
    var hi = scroll.cardMaxPx != null ? scroll.cardMaxPx : 2000;
    height = Math.max(lo, Math.min(hi, height));
    return {
        height: height,
        visibleH: Math.max(lo, visibleH),
        overflowPx: allowOverflow ? Math.max(0, height - Math.max(lo, visibleH)) : 0,
        mode: mode,
        allowScrollOverflow: allowOverflow,
        viewportH: Math.round(vh),
    };
}

/** [EN] Available height for display/keypad split (panel, viewport, or viewport+overflow). */
window.resolveCalcAvailHeight = function resolveCalcAvailHeight(panel, card, tune) {
    return _resolveCalcAvailHeightDetail(panel, card, tune).height;
};

window.resolveCalcAvailHeightDetail = function resolveCalcAvailHeightDetail(panel, card, tune) {
    return _resolveCalcAvailHeightDetail(panel, card, tune);
};

/** resultGaps.mode 'em' | 'percent' → { mode, numGroupEm, textEm, … } dla CSS tokenów. */
function _resolveResultGaps(gaps) {
    gaps = gaps || {};
    var mode = String(gaps.mode || 'percent').toLowerCase();
    if (mode === 'em') {
        return {
            mode: 'em',
            numGroupEm: gaps.numGroupEm != null ? gaps.numGroupEm : 0.25,
            textEm: gaps.textEm != null ? gaps.textEm : 0.26,
        };
    }
    var base = gaps.baselineEm != null ? gaps.baselineEm : 0.28;
    var numPct = gaps.numGroupPct != null ? gaps.numGroupPct : 89;
    var txtPct = gaps.textPct != null ? gaps.textPct : 93;
    function pctToEm(pct) { return Math.round(base * pct / 100 * 1000) / 1000; }
    return {
        mode: 'percent',
        baselineEm: base,
        numGroupPct: numPct,
        textPct: txtPct,
        numGroupEm: pctToEm(numPct),
        textEm: pctToEm(txtPct),
    };
}
window.resolveResultGaps = function resolveResultGaps(gaps) {
    return _resolveResultGaps(gaps || (window.CALC_LAYOUT_TUNE && window.CALC_LAYOUT_TUNE.resultGaps));
};

window.applyCalcLayoutTuneTokens = function applyCalcLayoutTuneTokens(card, tune) {
    tune = tune || window.getCalcLayoutTuneSection();
    var resolved = _resolveResultGaps((window.CALC_LAYOUT_TUNE && window.CALC_LAYOUT_TUNE.resultGaps) || {});
    var root = document.documentElement;
    root.style.setProperty('--calc-num-grp-sep', resolved.numGroupEm + 'em');
    root.style.setProperty('--calc-txt-sep', resolved.textEm + 'em');
    if (!card) return;
    var kf = tune.keypadFont || {};
    var df = tune.displayFont || {};
    var exprMin = tune.exprMinHeight != null ? tune.exprMinHeight : 44;
    var padY = tune.displayPadY != null ? tune.displayPadY : 12;
    var padX = tune.displayPadX != null ? tune.displayPadX : 14;
    card.style.setProperty('--calc-expr-min', exprMin + 'px');
    card.style.setProperty('--calc-display-gap', (tune.exprResultGap != null ? tune.exprResultGap : 6) + 'px');
    card.style.setProperty('--calc-grid-gap', (tune.gridGapPx != null ? tune.gridGapPx : 8) + 'px');
    card.style.setProperty('--calc-display-pad-y', padY + 'px');
    card.style.setProperty('--calc-display-pad-x', padX + 'px');
    card.style.setProperty('--calc-expr-font', (df.exprRem != null ? df.exprRem : 1.25) + 'rem');
    card.style.setProperty('--calc-expr-min-rem', (df.exprMinRem != null ? df.exprMinRem : 1) + 'rem');
    card.style.setProperty('--calc-expr-min-px', (df.exprMinPx != null ? df.exprMinPx : 16) + 'px');
    card.style.setProperty('--calc-result-font', (df.resultRem != null ? df.resultRem : 2.5) + 'rem');
    card.style.setProperty('--calc-approx-font', (df.approxRem != null ? df.approxRem : 1.6) + 'rem');
    card.style.setProperty('--calc-font-base', (kf.baseRem != null ? kf.baseRem : 1.35) + 'rem');
    var groups = kf.groups || {};
    ['fn', 'number', 'operator', 'equals', 'clear'].forEach(function(name) {
        var mul = groups[name] && groups[name].fontScale != null ? groups[name].fontScale : 1;
        card.style.setProperty('--calc-g-' + name + '-font', String(mul));
    });
};

window.reapplyCalcLayoutTune = function reapplyCalcLayoutTune() {
    // wołam po każdej edycji w konsoli — bez pełnego reloadu
    if (window.__matm0 && typeof window.__matm0.fitCalcLayout === 'function') window.__matm0.fitCalcLayout();
    if (window.__matm0 && typeof window.__matm0.fitCalcDisplay === 'function') window.__matm0.fitCalcDisplay();
};

window.previewCalcDisplayCurve = function previewCalcDisplayCurve(from, to, step, section) {
    var t = section === 'desktop'
        ? (window.CALC_LAYOUT_TUNE && window.CALC_LAYOUT_TUNE.desktop)
        : section === 'mobile'
            ? (window.CALC_LAYOUT_TUNE && window.CALC_LAYOUT_TUNE.mobile)
            : window.getCalcLayoutTuneSection();
    from = from != null ? from : 500;
    to = to != null ? to : 960;
    step = step != null ? step : 40;
    var rows = [];
    for (var h = from; h <= to; h += step) {
        var b = resolveCalcDisplayBudget(h, false, t);
        rows.push({
            panelPx: h,
            mode: b.heightMode,
            curvePx: b.rawPx,
            displayPx: b.height,
            share: b.sharePct,
            limit: b.limit,
        });
    }
    console.table(rows);
    return rows;
};

window.plotCalcDisplayCurve = function plotCalcDisplayCurve(from, to, width, section) {
    var t = section === 'desktop'
        ? (window.CALC_LAYOUT_TUNE && window.CALC_LAYOUT_TUNE.desktop)
        : section === 'mobile'
            ? (window.CALC_LAYOUT_TUNE && window.CALC_LAYOUT_TUNE.mobile)
            : window.getCalcLayoutTuneSection();
    from = from != null ? from : 500;
    to = to != null ? to : 960;
    width = width != null ? width : 32;
    var c = (t && t.displayCurve) || {};
    var yMin = c.minPx != null ? c.minPx : 100;
    var yMax = c.maxPx != null ? c.maxPx : 200;
    var lines = ['displayCurve (' + (c.heightMode || 'share') + ')', ''];
    for (var h = from; h <= to; h += Math.round((to - from) / 10) || 40) {
        var b = resolveCalcDisplayBudget(h, false, t);
        var n = Math.round((b.height - yMin) / (yMax - yMin) * width);
        lines.push(String(h).padStart(4) + ' |' + '#'.repeat(Math.max(0, Math.min(width, n))).padEnd(width)
            + '| ' + b.height + 'px ' + b.sharePct + ' (' + b.limit + ')');
    }
    console.log(lines.join('\n'));
    return lines.join('\n');
};

window.previewKeypadFontCurve = function previewKeypadFontCurve(from, to, step, section) {
    var t = section === 'desktop'
        ? (window.CALC_LAYOUT_TUNE && window.CALC_LAYOUT_TUNE.desktop)
        : section === 'mobile'
            ? (window.CALC_LAYOUT_TUNE && window.CALC_LAYOUT_TUNE.mobile)
            : window.getCalcLayoutTuneSection();
    var baseRem = t.keypadFont && t.keypadFont.baseRem != null ? t.keypadFont.baseRem : 1.35;
    var rowBase = t.btnRowBase != null ? t.btnRowBase : 56;
    from = from != null ? from : 500;
    to = to != null ? to : 960;
    step = step != null ? step : 40;
    var rows = [];
    for (var h = from; h <= to; h += step) {
        var rowH = Math.round((h * 0.65) / 5);
        var scale = resolveKeypadFontScale(h, rowH / rowBase, t);
        rows.push({
            panelPx: h,
            estRowPx: rowH,
            btnScale: scale,
            numberRem: (baseRem * scale * ((t.keypadFont.groups && t.keypadFont.groups.number.fontScale) || 1)).toFixed(2),
        });
    }
    console.table(rows);
    return rows;
};

window.previewCurrentCalcLayout = function previewCurrentCalcLayout() {
    // to moja „tablica stanu” — najpierw tu patrzę jak coś wygląda źle
    var panel = document.getElementById('panel-calculator');
    var card = panel && panel.querySelector('.card');
    var display = card && card.querySelector('.calc-display');
    var btn = document.querySelector('#calcGrid .calc-btn');
    var t = window.getCalcLayoutTuneSection();
    var section = window.innerWidth < 640 ? 'mobile' : 'desktop';
    var availDetail = window.resolveCalcAvailHeightDetail
        ? window.resolveCalcAvailHeightDetail(panel, card, t)
        : { height: window.resolveCalcAvailHeight(panel, card, t), visibleH: 0, overflowPx: 0 };
    var availH = availDetail.height;
    var calcResultEl = document.getElementById('calcResult');
    var isTyping = !!(document.getElementById('calcExpr') && document.getElementById('calcExpr').value);
    var wrapLines = calcResultEl && calcResultEl.textContent
        ? (calcResultEl.textContent.match(/\n/g) || []).length + 1
        : 1;
    var budget = resolveCalcDisplayBudget(availH, isTyping, t, {
        resultExtraLines: Math.max(0, wrapLines - 1),
        resultLinePx: display && display.clientHeight > 0 && wrapLines > 1
            ? Math.ceil(display.clientHeight / wrapLines) : 0,
    });
    var rowH = btn ? Math.round(btn.getBoundingClientRect().height) : 0;
    var btnScale = resolveKeypadFontScale(availH, rowH / (t.btnRowBase || 56), t);
    var baseRem = t.keypadFont && t.keypadFont.baseRem != null ? t.keypadFont.baseRem : 1.35;
    var cardH = card ? card.clientHeight : 0;
    var gapResolved = _resolveResultGaps((window.CALC_LAYOUT_TUNE && window.CALC_LAYOUT_TUNE.resultGaps) || {});
    var gapCfg = (window.CALC_LAYOUT_TUNE && window.CALC_LAYOUT_TUNE.resultGaps) || {};
    var row = {
        section: section,
        viewportW: window.innerWidth,
        availH: availH,
        visibleInViewportH: availDetail.visibleH,
        scrollOverflowPx: availDetail.overflowPx,
        scrollOverflowOn: availDetail.allowScrollOverflow,
        panelScroll: document.body.classList.contains('calc-panel-scroll'),
        resultLines: wrapLines,
        cardActualPx: cardH,
        cardBelowFoldPx: Math.max(0, cardH - availDetail.visibleH),
        displayShare: budget.sharePct,
        displayBudgetPx: budget.height,
        displayActualPx: display ? display.clientHeight : 0,
        keypadShare: budget.panelH > 0 ? Math.round((1 - budget.share) * 1000) / 10 + '%' : '—',
        budgetLimit: budget.limit,
        rowH: rowH,
        btnScale: btnScale,
        numberFontRem: (baseRem * btnScale * ((t.keypadFont.groups && t.keypadFont.groups.number.fontScale) || 1)).toFixed(2),
        exprFontRem: (t.displayFont && t.displayFont.exprRem != null ? t.displayFont.exprRem : 1.25),
        resultFontRem: (t.displayFont && t.displayFont.resultRem != null ? t.displayFont.resultRem : 2.5),
        resultGapsMode: gapResolved.mode,
        numGroupGapEm: gapResolved.numGroupEm,
        textGapEm: gapResolved.textEm,
        numGroupGapPct: gapCfg.numGroupPct,
        textGapPct: gapCfg.textPct,
    };
    console.table([row]);
    return row;
};

window.CALC_LAYOUT_TUNE.getDisplayFont = function getDisplayFontTune(section) {
    var t = section === 'desktop'
        ? (window.CALC_LAYOUT_TUNE && window.CALC_LAYOUT_TUNE.desktop)
        : section === 'mobile'
            ? (window.CALC_LAYOUT_TUNE && window.CALC_LAYOUT_TUNE.mobile)
            : window.getCalcLayoutTuneSection();
    return (t && t.displayFont) || {};
};
window.CALC_LAYOUT_TUNE.previewDisplayCurve = window.previewCalcDisplayCurve;
window.CALC_LAYOUT_TUNE.plotDisplayCurve = window.plotCalcDisplayCurve;
window.CALC_LAYOUT_TUNE.previewKeypadFont = window.previewKeypadFontCurve;
window.CALC_LAYOUT_TUNE.previewCurrent = window.previewCurrentCalcLayout;
window.CALC_LAYOUT_TUNE.reapply = window.reapplyCalcLayoutTune;
window.CALC_LAYOUT_TUNE.getSection = window.getCalcLayoutTuneSection;
window.CALC_LAYOUT_TUNE.resolveDisplayBudget = window.resolveCalcDisplayBudget;
window.CALC_LAYOUT_TUNE.resolveKeypadFont = window.resolveKeypadFontScale;
window.CALC_LAYOUT_TUNE.resolveAvailHeight = window.resolveCalcAvailHeight;
window.CALC_LAYOUT_TUNE.resolveAvailHeightDetail = window.resolveCalcAvailHeightDetail;
window.CALC_LAYOUT_TUNE.scrollOverflowOpts = _calcScrollOverflowOpts;
window.CALC_LAYOUT_TUNE.resolveResultGaps = window.resolveResultGaps;

(function _initResultGapTokens() {
    if (typeof document === 'undefined') return;
    window.applyCalcLayoutTuneTokens(null);
})();
