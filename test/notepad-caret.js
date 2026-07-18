// ============================================================
//  NOTEPAD CARET / FORMAT CONTRACT — semantyka bez DOM.
//  displayPrefix, H1–H3, selection snap, legacy italic vs _w_nazwach.
//  Uruchom: npm run test:notepad-caret
// ============================================================
'use strict';

const FMT = require('../js/notepad-format.js');

const H1 = { o: '\uE013', c: '\uE014' };
const H2 = { o: '\uE015', c: '\uE016' };
const B = { o: '\uE000', c: '\uE001' };
const I = { o: '\uE002', c: '\uE003' };

let pass = 0;
let fail = 0;
const fails = [];

function check(tag, ok, detail) {
  if (ok) pass++;
  else {
    fail++;
    fails.push({ tag, detail });
  }
}

// ── displayPrefix: markery = zerowa szerokość wizualna ─────────────────────
(function () {
  const plain = 'abc';
  check('prefix plain full', FMT.displayPrefix(plain, 3) === 'abc');
  check('prefix plain mid', FMT.displayPrefix(plain, 1) === 'a');

  const h1 = H1.o + 'Tytul' + H1.c;
  check('prefix H1 before open', FMT.displayPrefix(h1, 0) === '');
  check('prefix H1 after open', FMT.displayPrefix(h1, 1) === '');
  check('prefix H1 mid inner', FMT.displayPrefix(h1, 1 + 2) === 'Ty'); // open(1) + 'Ty'
  check('prefix H1 full visual', FMT.displayPrefix(h1, h1.length) === 'Tytul');
  check('prefix H1 len < buf at end', FMT.displayPrefix(h1, h1.length).length < h1.length);

  const bold = B.o + 'x' + B.c + 'y';
  check('prefix bold+plain', FMT.displayPrefix(bold, bold.length) === 'xy');
})();

// ── applyHeadingToRange: caret ląduje na inner ─────────────────────────────
(function () {
  const patched = FMT.applyHeadingToRange('Hello', 0, 5, 1);
  check('H1 wrap text', patched.text === H1.o + 'Hello' + H1.c);
  check('H1 selStart inner', patched.selStart === 1);
  check('H1 selEnd inner', patched.selEnd === 1 + 5);

  const h2 = FMT.applyHeadingToRange('Hello', 0, 5, 2);
  check('H2 wrap', h2.text === H2.o + 'Hello' + H2.c);

  const clear = FMT.applyHeadingToRange(H1.o + 'Hello' + H1.c, 1, 6, 0);
  check('H1 → plain', clear.text === 'Hello' && clear.selStart === 0);
})();

// ── normalizeSelectionRange: nie łapie markerów ────────────────────────────
(function () {
  const val = B.o + 'abc' + B.c;
  // zaznacz cały wrap włącznie z markerami → snap do inner
  const full = FMT.normalizeSelectionRange(val, 0, val.length);
  check('snap full outer→inner', full.changed === true && full.start === 1 && full.end === 4);

  const mid = FMT.normalizeSelectionRange(val, 2, 3);
  check('snap mid unchanged', mid.changed === false && mid.start === 2 && mid.end === 3);

  // start na open (0), end w inner — nie jest „pełnym outer", więc nie zawsze snappuje;
  // pełny outer (0..uEnd) jest kanoniczną ścieżką snapu.
  const fromOpen = FMT.normalizeSelectionRange(val, 0, 3);
  check('from open partial', fromOpen.start === 0 && fromOpen.end === 3);
})();

// ── legacy italic nie zjada podkreśleń w identyfikatorach ──────────────────
(function () {
  const id = 'p_Michal_Aga: @p_robert+@p_mateusz';
  check('strip keeps underscores in ids', FMT.stripMarkers(id) === id);

  const italic = 'ala _kot_ ma';
  check('strip still removes word-boundary italic', FMT.stripMarkers(italic) === 'ala kot ma');

  const migId = FMT.migrateLegacyMarkers('p_Michal_Aga');
  check('migrate keeps id underscores', migId === 'p_Michal_Aga');
})();

// ── visual-caret heuristic (jak _npNeedsVisualCaret) ───────────────────────
(function () {
  function needsVisual(val, index) {
    return FMT.displayPrefix(val, index).length !== index;
  }
  const h1 = H1.o + 'Abc' + H1.c;
  // index w środku inner = 1(open)+1 = 2 → prefix 'A' len 1 ≠ 2
  check('needsVisual inside H1', needsVisual(h1, 2) === true);
  check('needsVisual plain', needsVisual('Abc', 2) === false);
  const bold = 'x' + B.o + 'y' + B.c;
  check('needsVisual after bold open', needsVisual(bold, 2) === true);
})();

console.log('\n=== NOTEPAD CARET: ' + (pass + fail) + ' checks, ' + fail + ' FAIL ===');
if (fails.length) {
  fails.forEach((f) => console.log('  ✗', f.tag, f.detail != null ? f.detail : ''));
  process.exit(1);
}
process.exit(0);
