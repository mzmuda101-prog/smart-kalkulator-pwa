// @ts-check
/* ============================================================
   [EN] Polish diacritics → ASCII for NL engine matching (mobile bez ą/ę/ć…).
   Used by parseNaturalShortcuts, percent/date queries, autocomplete filter.
   ============================================================ */
(function () {
    'use strict';

    var PAIRS = 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ|acelnoszzACELNOSZZ'.split('|');

    function fold(s) {
        var t = String(s || ''), from = PAIRS[0], to = PAIRS[1], i;
        for (i = 0; i < from.length; i++) t = t.split(from.charAt(i)).join(to.charAt(i));
        return t;
    }

    function foldLower(s) { return fold(String(s || '').toLowerCase()); }

    var API = { fold: fold, foldLower: foldLower };

    if (typeof window !== 'undefined') window.MATM0_PL_FOLD = API;
    if (typeof self !== 'undefined') self.MATM0_PL_FOLD = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
