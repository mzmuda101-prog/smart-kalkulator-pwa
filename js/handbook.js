// @ts-check
(function () {
    'use strict';
    // Podręcznik: spis działów, hasła w dziale i wyszukiwanie. Dane: js/step-formulas.js (te same co dymki w krokach).
    const g = /** @type {any} */ (typeof window !== 'undefined' ? window : globalThis);
    // [EN] w Node test wczytuje step-formulas.js i ustawia globalThis.MATM0_PL_FOLD przed tym plikiem
    const data = () => g.MATM0_FORMULAS || { FORMULAS: {}, DZIALY: [] };
    const fold = (/** @type {string} */ s) => (g.MATM0_PL_FOLD ? g.MATM0_PL_FOLD.foldLower(s) : String(s || '').toLowerCase());
    const chapterName = (/** @type {string} */ id) => {
        const d = data().DZIALY.find((/** @type {{id: string}} */ x) => x.id === id);
        return d ? d.name : '';
    };

    function chapters() {
        const all = Object.values(data().FORMULAS);
        return data().DZIALY
            .map((/** @type {{id: string, name: string}} */ d) => ({ id: d.id, name: d.name, count: all.filter(f => f.dzial === d.id).length }))
            .filter((/** @type {{count: number}} */ c) => c.count > 0);
    }

    function entries(/** @type {string} */ dzialId) {
        return Object.entries(data().FORMULAS).filter(([, f]) => f.dzial === dzialId).map(([id, entry]) => ({ id: id, entry: entry }));
    }

    function search(/** @type {string} */ query) {
        const words = fold(query).split(/\s+/).filter(Boolean);
        if (!words.length) return [];
        const hits = [];
        for (const [id, entry] of Object.entries(data().FORMULAS)) {
            const chapter = chapterName(entry.dzial);
            const name = fold(entry.name);
            const all = [name, fold((entry.keywords || []).join(' ')), fold(chapter)].join(' ');
            if (!words.every(w => all.includes(w))) continue;
            hits.push({ id: id, entry: entry, chapter: chapter, rank: words.every(w => name.includes(w)) ? 0 : 1 });
        }
        return hits.sort((a, b) => a.rank - b.rank).map(({ id, entry, chapter }) => ({ id: id, entry: entry, chapter: chapter }));
    }

    function get(/** @type {string} */ id) {
        const entry = Object.prototype.hasOwnProperty.call(data().FORMULAS, id) ? data().FORMULAS[id] : null;
        return entry ? { id: id, entry: entry, chapter: chapterName(entry.dzial) } : null;
    }

    const API = { chapters: chapters, entries: entries, search: search, get: get };
    g.MATM0_HANDBOOK = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
