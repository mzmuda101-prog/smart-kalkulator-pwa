/* [EN] Theme bootstrap — runs BEFORE CSS paint so splash/first frame doesn't flash
   light background in dark mode. External file (not inline) so CSP can stay
   script-src 'self'. Loaded synchronously in <head> before the stylesheet. */
(function () {
    try {
        var pref = localStorage.getItem('matm0_theme');
        var dark = pref === 'dark' || (pref !== 'light' &&
            window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (dark) document.documentElement.setAttribute('data-theme', 'dark');
    } catch (e) {}
})();
