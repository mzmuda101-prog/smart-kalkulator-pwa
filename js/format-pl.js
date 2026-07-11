/* ============================================================
   [PL] Formatowanie PL — liczby i odmiana jednostek w wyniku.
   [EN] Shared by app.js (UI) and smart-parser.js (routery % / route cost).
   ============================================================ */
(function () {
    'use strict';

    function _data() {
        return (typeof window !== 'undefined' && window.MATM0_DATA) ||
            (typeof self !== 'undefined' && self.MATM0_DATA) || {};
    }

    function formatLocaleNumber(num, maxDigits) {
        if (!isFinite(num)) return String(num);
        var rounded = (Number.isInteger(num) && Math.abs(num) <= Number.MAX_SAFE_INTEGER)
            ? num
            : (Math.abs(num) < 1e308 ? parseFloat(num.toPrecision(15)) : num);
        return rounded.toLocaleString('pl-PL', {
            maximumFractionDigits: maxDigits == null ? 6 : maxDigits,
            useGrouping: true,
        });
    }

    function inflectDisplayUnit(value, unit) {
        if (unit == null || unit === '') return unit;
        var data = _data();
        var inflect = data.inflectUnit || data.plInflectUnit;
        return typeof inflect === 'function' ? inflect(value, unit) : unit;
    }

    var API = {
        formatLocaleNumber: formatLocaleNumber,
        inflectDisplayUnit: inflectDisplayUnit,
    };

    if (typeof window !== 'undefined') window.MATM0_FMT = API;
    if (typeof self !== 'undefined') self.MATM0_FMT = API;
})();
