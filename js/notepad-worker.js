/* ============================================================
   [EN] Notepad eval worker — off-main-thread for long notes (P6)
   importScripts stack mirrors index.html order before notepad-engine.
   ============================================================ */
'use strict';

importScripts(
    'vendor/decimal.js',
    'money-decimal.js',
    'numeric-eval.js',
    'data-tables.js',
    'format-pl.js',
    'pl-fold.js',
    'smart-parser.js',
    'smart-quantity.js',
    'notepad-format.js',
    'notepad-engine.js'
);

var _PARSER = self.MATM0_PARSER;
var _FMT = self.MATM0_FMT;

function makeVal(o) { // [EN] same shape as app.js — worker has no STATE sync
    o = o || {};
    return {
        value: o.value == null ? null : o.value,
        unit: o.unit == null ? null : o.unit,
        text: o.text == null ? null : o.text,
        error: o.error == null ? null : o.error,
        kind: o.kind || null,
        exact: o.exact !== false,
        exactText: o.exactText != null ? o.exactText : null,
        preciseValue: o.preciseValue != null ? o.preciseValue : null,
        pendingFx: !!o.pendingFx,
        big: !!o.big,
        bigStr: o.bigStr != null ? o.bigStr : null,
    };
}

function rebuildUnitNamesRe(units) {
    return Object.keys(units || {})
        .sort(function (a, b) { return b.length - a.length; })
        .map(function (u) { return u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); })
        .join('|');
}

function createDeps(ctx) {
    var CALC_UNITS = JSON.parse(JSON.stringify(ctx.calcUnits || {}));
    var CALC_UNIT_DISPLAY = Object.assign({}, ctx.calcUnitDisplay || {});
    var unitNamesRe = ctx.unitNamesRe || rebuildUnitNamesRe(CALC_UNITS);
    var globalsObj = ctx.globals || {};

    function parserOpts(extra) {
        extra = extra || {};
        return {
            firstUnitWins: !!extra.firstUnitWins,
            keepWorkCurrency: !!extra.keepWorkCurrency,
            fxRates: ctx.fxRates || {},
            fxReady: !!ctx.fxReady,
            defaultCurrency: ctx.defaultCurrency || 'PLN',
            currencyCompactSymbols: ctx.currencyCompactSymbols !== false,
            constants: ctx.constants || [],
            lastAnswer: ctx.lastAnswer,
            evalConstNumeric: function (c) {
                if (!c || _PARSER.isFuncConst(c)) return NaN;
                if (typeof c.value === 'number') return c.value;
                var r = evalCalc(String(c.value));
                return r && typeof r.value === 'number' && isFinite(r.value) ? r.value : NaN;
            },
            unitDefs: CALC_UNITS,
            unitDisplay: CALC_UNIT_DISPLAY,
            unitNamesRe: unitNamesRe,
            defaultUnits: ctx.defaultUnits || {},
        };
    }

    function evalCalc(raw, extra) {
        var r = _PARSER.evaluate(String(raw || '').trim(), parserOpts(extra));
        return makeVal(r || {});
    }

    function formatCalcResult(res) {
        if (!res) return '';
        if (res.text != null) return res.text;
        if (res.value === null) return '';
        if (res.error === '∞') return '∞';
        var str = _FMT.formatLocaleNumber(res.value, 6);
        if (res.unit) str += '\u202f' + _FMT.inflectDisplayUnit(res.value, res.unit);
        return str;
    }

    return {
        get globals() { return globalsObj; },
        get settings() { return ctx.settings || {}; },
        get constants() { return ctx.constants || []; },
        calcUnits: CALC_UNITS,
        calcUnitDisplay: CALC_UNIT_DISPLAY,
        evalCalc: evalCalc,
        formatCalcResult: formatCalcResult,
        formatLocaleNumber: _FMT.formatLocaleNumber,
        inflectDisplayUnit: _FMT.inflectDisplayUnit,
        currencyTokenMap: function () { return _PARSER.currencyTokenMap(ctx.fxRates || {}); },
        currencyDisplay: function (code) {
            return _PARSER.currencyDisplay(code, {
                currencyCompactSymbols: ctx.currencyCompactSymbols !== false,
            });
        },
        knownConstUnit: function (u) {
            return _PARSER.knownConstUnit(u, { unitDefs: CALC_UNITS, fxRates: ctx.fxRates || {} });
        },
        isDateUnit: _PARSER.isDateUnit,
        rebuildUnitNamesRe: function () { unitNamesRe = rebuildUnitNamesRe(CALC_UNITS); },
    };
}

self.onmessage = function (e) {
    var msg = e.data || {};
    if (msg.type !== 'eval') return;
    try {
        var engine = self.MATM0_NP_ENGINE.createEngine(createDeps(msg.ctx || {}));
        var infos = engine.evalLines(msg.text || '');
        self.postMessage({ type: 'eval', id: msg.id, ok: true, infos: infos });
    } catch (err) {
        self.postMessage({
            type: 'eval',
            id: msg.id,
            ok: false,
            error: String(err && err.message ? err.message : err),
        });
    }
};
