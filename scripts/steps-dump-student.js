// @ts-check
// Zrzut kroków dla agenta „słaby uczeń” (docs/superpowers/agents/slaby-uczen.md).
// Użycie: node scripts/steps-dump-student.js <granice|rownania|analiza|reszta|all> <plik.json>
// Zapis: [{ id, q, title, method, steps: [{ k, label, why, math, formula?, horner? }] }]
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.join(__dirname, '..');
const S = require(path.join(root, 'js', 'math-steps.js'));
require(path.join(root, 'js', 'math-calculus.js'));
require(path.join(root, 'js', 'math-limits.js'));
const { whyFor } = require(path.join(root, 'js', 'step-why.js'));
const { FORMULAS } = require(path.join(root, 'js', 'step-formulas.js'));
const queries = require('./steps-check/queries.js');

const SECTIONS = ['granice', 'rownania', 'analiza', 'reszta'];
const [section, outFile] = process.argv.slice(2);
if (!outFile || (section !== 'all' && !SECTIONS.includes(section))) {
    console.error('Użycie: node scripts/steps-dump-student.js <granice|rownania|analiza|reszta|all> <plik.json>');
    process.exit(2);
}

/** @param {string} title */
const sectionOf = (title) => /^Granica/.test(title) ? 'granice'
    : /^(Równanie|Nierówność|Układ równań)/.test(title) ? 'rownania'
        : /^(Pochodna|Całka)/.test(title) ? 'analiza' : 'reszta';

/** tabelka Hornera jako 3 wiersze tekstu z podpisem @param {{r: string, top: string[], mid: string[], bot: string[]}} h @param {string} [name] */
function hornerText(h, name) {
    const w = Math.max(...[...h.top, ...h.mid, ...h.bot].map(x => x.length));
    const row = (/** @type {string[]} */ a) => a.map(x => x.padStart(w)).join(' ');
    return (name ? name + ': ' : '') + 'r = ' + h.r + '\n' + row(h.top) + '\n' + row(h.mid) + '\n' + row(h.bot);
}

const out = [];
const counter = { granice: 0, rownania: 0, analiza: 0, reszta: 0 };
for (const q of queries) {
    let r; try { r = S.run(q); } catch { continue; }
    if (!r || !r.explain || !r.explain.steps) continue;
    const sec = sectionOf(r.explain.title);
    if (section !== 'all' && sec !== section) continue;
    const methods = r.explain.methods || [r.explain];
    for (const m of methods) {
        const steps = m.steps.map((/** @type {any} */ s, /** @type {number} */ k) => {
            /** @type {any} */
            const o = { k: k + 1, label: s.label, why: whyFor(s, r.explain.title, m, k) || '', math: s.math };
            if (s.formula && FORMULAS[s.formula.id]) {
                const f = FORMULAS[s.formula.id];
                o.formula = { name: f.name, tex: f.tex, why: f.why, here: s.formula.here || '' };
            }
            if (s.horner) o.horner = (Array.isArray(s.horner) ? s.horner : [s.horner]).map((/** @type {any} */ h) => hornerText(h, h.name));
            return o;
        });
        out.push({ id: sec[0] + String(++counter[/** @type {'granice'} */ (sec)]).padStart(3, '0'), q, title: r.explain.title, method: m.label || null, steps });
    }
}
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
assert(out.length > 0 && out.every(t => t.steps.every((/** @type {any} */ s) => typeof s.why === 'string')));
console.log('zadań:', out.length, ' kroków:', out.reduce((a, t) => a + t.steps.length, 0));
