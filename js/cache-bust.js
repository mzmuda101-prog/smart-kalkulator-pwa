/* [EN] Asset cache bust after force refresh — CSP-safe (no inline scripts). */
(function (global) {
    var stamp = '';
    try { stamp = global.sessionStorage.getItem('matm0_asset_bust') || ''; } catch (e) {}
    if (!stamp) return;

    var script = global.document && global.document.currentScript;
    var phase = script && script.getAttribute('data-phase');

    function appendBust(url) {
        if (!url || /^https?:\/\//i.test(url)) return url;
        return url + (url.indexOf('?') === -1 ? '?' : '&') + '_bust=' + stamp;
    }

    if (phase === 'head') {
        var css = global.document.getElementById('matm0MainCss');
        if (css) css.setAttribute('href', appendBust(css.getAttribute('href') || 'styles.css'));
        return;
    }

    if (phase === 'defer') {
        try { global.sessionStorage.removeItem('matm0_asset_bust'); } catch (e) {}
        var nodes = global.document.querySelectorAll('script[src]');
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            if (el === script) continue;
            var src = el.getAttribute('src');
            if (src) el.setAttribute('src', appendBust(src));
        }
    }
})(typeof window !== 'undefined' ? window : self);
