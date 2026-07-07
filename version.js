/* ============================================================
   [EN] APP VERSION — single source of truth for app version.
   Bump ONLY here. Read by Service Worker (importScripts) AND page (index.html).
   Builds cache name and settings UI label.
   Scheme: 'v0.96' (major.minor) — after v99 use 'v1.00', not 'v100'.
   Legacy 'v95' (no dot) maps to 0.95 for comparison.
   ============================================================ */

var APP_VERSION = 'v0.99.66';

/* [EN] Parse version label → comparable tuple [major, minor, patch]. */
function parseAppVersion(label) {
    var s = String(label || '').trim().replace(/^v/i, '');
    if (/^\d+\.\d+/.test(s)) {
        var parts = s.split('.');
        return {
            major: parseInt(parts[0], 10) || 0,
            minor: parseInt(parts[1], 10) || 0,
            patch: parseInt(parts[2], 10) || 0
        };
    }
    var legacy = parseInt(s, 10);
    if (!isFinite(legacy)) legacy = 0;
    return { major: 0, minor: legacy, patch: 0 }; // v95 → 0.95.0
}

/* [EN] Compare versions: negative if a<b, 0 if equal, positive if a>b. */
function compareAppVersions(a, b) {
    var pa = parseAppVersion(a), pb = parseAppVersion(b);
    var keys = ['major', 'minor', 'patch'];
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (pa[k] !== pb[k]) return pa[k] - pb[k];
    }
    return 0;
}

function formatAppVersion(label) {
    return String(label || '').trim() || 'v?';
}

/* Udostępnij w obu światach: SW (self) i okno przeglądarki (window). */
if (typeof self !== 'undefined') {
    self.APP_VERSION = APP_VERSION;
    self.parseAppVersion = parseAppVersion;
    self.compareAppVersions = compareAppVersions;
    self.formatAppVersion = formatAppVersion;
}
if (typeof window !== 'undefined') {
    window.APP_VERSION = APP_VERSION;
    window.parseAppVersion = parseAppVersion;
    window.compareAppVersions = compareAppVersions;
    window.formatAppVersion = formatAppVersion;
}
