/* ============================================================
   [EN] Money math helper — decimal.js wrapper (NOT the main parser).
   Point precision for VAT, FX rounding, percent-with-currency paths.
   ============================================================ */
(function () {
    'use strict';

    var D = typeof Decimal !== 'undefined' ? Decimal : null;

    function _parse(n) {
        if (n == null || n === '') return null;
        if (typeof n === 'number') return isFinite(n) ? n : null;
        var s = String(n).trim().replace(/\s/g, '').replace(',', '.');
        if (!s || s === '-' || s === '.') return null;
        var v = parseFloat(s);
        return isFinite(v) ? v : null;
    }

    function _dec(n) {
        if (!D) return null;
        var v = _parse(n);
        if (v == null) return null;
        try { return new D(v); } catch (e) { return null; }
    }

    function roundMoney(n) {
        var v = _parse(n);
        if (v == null) return v;
        if (!D) return Math.round(v * 100) / 100;
        return _dec(v).toDecimalPlaces(2, D.ROUND_HALF_UP).toNumber();
    }

    function vatNetFromBrutto(brutto, ratePct) {
        var b = _dec(brutto), r = _dec(ratePct != null ? ratePct : 23);
        if (!b || !r) return _parse(brutto);
        if (!D) return roundMoney(_parse(brutto) / (1 + _parse(ratePct != null ? ratePct : 23) / 100));
        return b.div(new D(1).plus(r.div(100))).toNumber();
    }

    function vatBruttoFromNet(net, ratePct) {
        var n = _dec(net), r = _dec(ratePct != null ? ratePct : 23);
        if (!n || !r) return _parse(net);
        if (!D) return roundMoney(_parse(net) * (1 + _parse(ratePct != null ? ratePct : 23) / 100));
        return n.times(new D(1).plus(r.div(100))).toNumber();
    }

    function vatTax(amount, ratePct) {
        var a = _dec(amount), r = _dec(ratePct != null ? ratePct : 23);
        if (!a || !r) return _parse(amount);
        if (!D) return roundMoney(_parse(amount) * _parse(ratePct != null ? ratePct : 23) / 100);
        return a.times(r.div(100)).toNumber();
    }

    function pctOf(base, pct) {
        var b = _dec(base), p = _dec(pct);
        if (!b || !p) return null;
        if (!D) return _parse(base) * _parse(pct) / 100;
        return b.times(p.div(100)).toNumber();
    }

    function scaleMoney(value, factor) {
        var v = _dec(value), f = _dec(factor);
        if (!v || !f) return _parse(value);
        if (!D) return _parse(value) * _parse(factor);
        return v.times(f).toNumber();
    }

    var API = {
        roundMoney: roundMoney,
        vatNetFromBrutto: vatNetFromBrutto,
        vatBruttoFromNet: vatBruttoFromNet,
        vatTax: vatTax,
        pctOf: pctOf,
        scaleMoney: scaleMoney,
        available: !!D
    };

    if (typeof window !== 'undefined') window.MATM0_MONEY = API;
    if (typeof self !== 'undefined') self.MATM0_MONEY = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
