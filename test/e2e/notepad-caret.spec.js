// [EN] E2E — kursor / zaznaczenie / font / soft-wrap w notatniku
const { test, expect } = require('playwright/test');
const NP = require('./notepad-caret.helpers.js');

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await NP.waitAppReady(page);
  await NP.openNotepad(page);
});

test.afterEach(async ({ page }) => {
  await NP.resetWrapSpace(page).catch(() => {});
  await NP.setFontSize(page, 1).catch(() => {});
  await NP.closeNotepad(page).catch(() => {});
});

// ── Bez zawijania ──────────────────────────────────────────────────────────

test('H1+bold kasia — klik po „a” kasuje „a”', async ({ page }) => {
  const { h1, bold } = NP.MARK;
  const word = 'kasia';
  await NP.setNotepadText(page, h1.o + bold.o + word + bold.c + h1.c);
  await NP.settleLayout(page);

  const pt = await page.evaluate(() => {
    const mLine = document.querySelector('.np-mirror-line');
    const walker = document.createTreeWalker(mLine, NodeFilter.SHOW_TEXT);
    const textNode = walker.nextNode();
    const range = document.createRange();
    range.setStart(textNode, 2); // po „ka"
    range.collapse(true);
    const r = range.getBoundingClientRect();
    return { x: r.left + 0.5, y: (r.top + r.bottom) / 2 };
  });

  await NP.tapAt(page, pt.x, pt.y);
  let st = await NP.readCaretState(page);
  // H + B + k + a → index 4
  expect(st.selectionStart, 'H1>bold after first a').toBe(4);
  expect(st.value[st.selectionStart - 1]).toBe('a');

  await page.keyboard.press('Backspace');
  await NP.settleLayout(page);
  const plain = await page.evaluate(() => window.MATM0_NP_FMT.stripMarkers(document.querySelector('textarea.np-text').value));
  expect(plain).toBe('ksia');
});

test('H1+italic kasia — klik po „a” kasuje „a”', async ({ page }) => {
  const { h1, italic } = NP.MARK;
  await NP.setNotepadText(page, h1.o + italic.o + 'kasia' + italic.c + h1.c);
  await NP.settleLayout(page);
  const pt = await page.evaluate(() => {
    const mLine = document.querySelector('.np-mirror-line');
    const walker = document.createTreeWalker(mLine, NodeFilter.SHOW_TEXT);
    const textNode = walker.nextNode();
    const range = document.createRange();
    range.setStart(textNode, 2);
    range.collapse(true);
    const r = range.getBoundingClientRect();
    return { x: r.left + 0.5, y: (r.top + r.bottom) / 2 };
  });
  await NP.tapAt(page, pt.x, pt.y);
  expect((await NP.readCaretState(page)).selectionStart).toBe(4);
  await page.keyboard.press('Backspace');
  const plain = await page.evaluate(() => window.MATM0_NP_FMT.stripMarkers(document.querySelector('textarea.np-text').value));
  expect(plain).toBe('ksia');
});

test('H1 kasia — klik po pierwszej „a” kasuje „a” (nie s/i)', async ({ page }) => {
  const { h1 } = NP.MARK;
  const word = 'kasia';
  await NP.setNotepadText(page, h1.o + word + h1.c);
  await NP.settleLayout(page);

  // Pozycja glyfu zaraz za pierwszą „a” (indeks wizualny 2)
  const pt = await page.evaluate(() => {
    const mLine = document.querySelector('.np-mirror-line');
    const walker = document.createTreeWalker(mLine, NodeFilter.SHOW_TEXT);
    const textNode = walker.nextNode();
    const range = document.createRange();
    range.setStart(textNode, 2);
    range.collapse(true);
    const r = range.getBoundingClientRect();
    return { x: r.left + 0.5, y: (r.top + r.bottom) / 2 };
  });

  // Dowód regresji: metryki textarea w tym X wskazywałyby zły indeks (≥4 → kasuje s/i)
  const taGuess = await page.evaluate(({ x }) => {
    const ta = document.querySelector('textarea.np-text');
    const FMT = window.MATM0_NP_FMT;
    const cs = getComputedStyle(ta);
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;left:-9999px;white-space:pre-wrap;font:${cs.font};width:${ta.clientWidth}px;padding:${cs.padding}`;
    document.body.appendChild(probe);
    const taRect = ta.getBoundingClientRect();
    let best = 0, bestD = Infinity;
    for (let i = 0; i <= ta.value.length; i++) {
      probe.textContent = '';
      probe.appendChild(document.createTextNode(FMT.displayPrefix(ta.value, i)));
      const zw = document.createElement('span'); zw.textContent = '\u200b'; probe.appendChild(zw);
      const d = Math.abs(taRect.left + zw.offsetLeft - x);
      if (d < bestD) { bestD = d; best = i; }
    }
    probe.remove();
    return best;
  }, pt);
  expect(taGuess, 'textarea metrics should MIS-hit (≥4) — precondition of bug').toBeGreaterThanOrEqual(4);

  await NP.tapAt(page, pt.x, pt.y);
  let st = await NP.readCaretState(page);
  expect(st.selectionStart, 'mirror hit-test after first a').toBe(3);
  expect(st.value[st.selectionStart - 1]).toBe('a');

  await page.keyboard.press('Backspace');
  await NP.settleLayout(page);
  st = await NP.readCaretState(page);
  const plain = await page.evaluate(() => window.MATM0_NP_FMT.stripMarkers(document.querySelector('textarea.np-text').value));
  expect(plain, 'should delete the first a → ksia').toBe('ksia');
});


test('H1 — visual caret włączony i w pudełku linii', async ({ page }) => {
  const { h1 } = NP.MARK;
  const text = h1.o + 'Naglowek' + h1.c;
  await NP.setNotepadText(page, text);
  await NP.focusCaret(page, 1 + 3);
  const st = await NP.readCaretState(page);
  expect(st.hasH1).toBe(true);
  expect(st.displayPrefixLen).toBeLessThan(st.bufferIndex);
  NP.assertVisualCaretInLine(st, 'H1 mid');
});

test('H2 i H3 — overlay przy kursorze w inner', async ({ page }) => {
  const { h2, h3 } = NP.MARK;
  await NP.setNotepadText(page, h2.o + 'Dwa' + h2.c + '\n' + h3.o + 'Trzy' + h3.c);
  await NP.focusCaret(page, 1 + 1);
  let st = await NP.readCaretState(page);
  expect(st.hasH2).toBe(true);
  NP.assertVisualCaretInLine(st, 'H2');

  const h3Start = (h2.o + 'Dwa' + h2.c + '\n').length;
  await NP.focusCaret(page, h3Start + 1 + 2);
  st = await NP.readCaretState(page);
  expect(st.hasH3).toBe(true);
  NP.assertVisualCaretInLine(st, 'H3');
});

test('bold + italic — prefix krótszy, caret OK', async ({ page }) => {
  const { bold, italic } = NP.MARK;
  const text = 'x' + bold.o + 'yyy' + bold.c + italic.o + 'zz' + italic.c;
  await NP.setNotepadText(page, text);
  await NP.focusCaret(page, 1 + 1 + 1);
  let st = await NP.readCaretState(page);
  expect(st.hasBold).toBe(true);
  expect(st.displayPrefixLen).toBeLessThan(st.bufferIndex);
  NP.assertVisualCaretInLine(st, 'bold');

  const italIdx = ('x' + bold.o + 'yyy' + bold.c).length + 1 + 1;
  await NP.focusCaret(page, italIdx);
  st = await NP.readCaretState(page);
  expect(st.hasItalic).toBe(true);
  NP.assertVisualCaretInLine(st, 'italic');
});

test('zaznaczenie w H1 — highlight w mirrorze, bez overlay (range)', async ({ page }) => {
  const { h1 } = NP.MARK;
  const text = h1.o + 'Naglowek' + h1.c;
  await NP.setNotepadText(page, text);
  await NP.focusCaret(page, 1, 1 + 8);
  const st = await NP.readCaretState(page);
  expect(st.collapsed).toBe(false);
  expect(st.visualCaretOn).toBe(false);
  expect(st.hasSelHl).toBe(true);
});

test('font 80% i 130% — H1 caret nadal w linii', async ({ page }) => {
  const { h1 } = NP.MARK;
  const text = h1.o + 'DuzyTytul' + h1.c;
  await NP.setNotepadText(page, text);

  for (const fs of [0.8, 1.3]) {
    await NP.setFontSize(page, fs);
    await NP.focusCaret(page, 1 + 4);
    const st = await NP.readCaretState(page);
    expect(st.fontVar, `font ${fs}`).toMatch(new RegExp(String(fs).replace('.', '\\.')));
    NP.assertVisualCaretInLine(st, `H1 @ ${fs}rem`);
  }
});

test('przełączenie plain ↔ H1 — overlay on/off', async ({ page }) => {
  const { h1 } = NP.MARK;
  await NP.setNotepadText(page, 'plain\n' + h1.o + 'Head' + h1.c);
  await NP.focusCaret(page, 2);
  let st = await NP.readCaretState(page);
  expect(st.visualCaretOn).toBe(false);

  const headIdx = ('plain\n').length + 1 + 2;
  await NP.focusCaret(page, headIdx);
  st = await NP.readCaretState(page);
  NP.assertVisualCaretInLine(st, 'switch to H1');
});

test('wstawienie @zmiennej — caret zaraz za tokenem', async ({ page }) => {
  await NP.setNotepadText(page, 'paliwo: 100\n');
  await NP.focusCaret(page, 'paliwo: 100\n'.length);
  await page.evaluate(() => {
    const ta = document.querySelector('textarea.np-text');
    const start = ta.selectionStart;
    const token = '@paliwo';
    ta.value = ta.value.slice(0, start) + token + ta.value.slice(ta.selectionEnd);
    const pos = start + token.length;
    ta.setSelectionRange(pos, pos);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    window.__matm0.npRecompute();
  });
  await NP.settleLayout(page);
  const st = await NP.readCaretState(page);
  expect(st.value).toContain('@paliwo');
  expect(st.selectionStart).toBe(st.value.indexOf('@paliwo') + '@paliwo'.length);
});

// ── Soft-wrap (mało miejsca) ───────────────────────────────────────────────

test('wrap: długa plain linia — np-wrapped + ≥2 wiersze wizualne', async ({ page }) => {
  await NP.forceWrapSpace(page, 'narrow');
  const body = NP.longWrapToken(40);
  await NP.setNotepadText(page, body);
  await NP.waitUntilLineSoftWrapped(page, 0);
  await NP.focusCaret(page, Math.floor(body.length / 2));
  const st = await NP.readCaretState(page);
  NP.assertSoftWrapped(st, 'plain wrap');
});

test('wrap: H1 na długim tytule — caret w linii zawiniętej', async ({ page }) => {
  const { h1 } = NP.MARK;
  await NP.forceWrapSpace(page, 'narrow');
  const inner = NP.longWrapToken(36);
  await NP.setNotepadText(page, h1.o + inner + h1.c);
  await NP.waitUntilLineSoftWrapped(page, 0);
  await NP.focusCaret(page, 1 + Math.floor(inner.length * 0.6));
  const st = await NP.readCaretState(page);
  expect(st.hasH1).toBe(true);
  NP.assertSoftWrapped(st, 'H1 wrap');
  NP.assertVisualCaretInLine(st, 'H1 wrapped mid');
});

test('wrap: H2/H3 + bardzo wąska kolumna', async ({ page }) => {
  const { h2, h3 } = NP.MARK;
  await NP.forceWrapSpace(page, 'very-narrow');
  const a = NP.longWrapToken(30);
  const b = NP.longWrapToken(28);
  await NP.setNotepadText(page, h2.o + a + h2.c + '\n' + h3.o + b + h3.c);
  await NP.waitUntilLineSoftWrapped(page, 0);
  await NP.focusCaret(page, 1 + 10);
  let st = await NP.readCaretState(page);
  NP.assertSoftWrapped(st, 'H2 wrapped');
  NP.assertVisualCaretInLine(st, 'H2 wrapped');

  const h3Start = (h2.o + a + h2.c + '\n').length;
  await NP.focusCaret(page, h3Start + 1 + 8);
  st = await NP.readCaretState(page);
  expect(st.hasH3).toBe(true);
  NP.assertSoftWrapped(st, 'H3 wrapped');
  NP.assertVisualCaretInLine(st, 'H3 wrapped');
});

test('wrap: bold na długim fragmencie — overlay w pudełku', async ({ page }) => {
  const { bold } = NP.MARK;
  await NP.forceWrapSpace(page, 'narrow');
  const inner = NP.longWrapToken(34);
  await NP.setNotepadText(page, bold.o + inner + bold.c);
  await NP.waitUntilLineSoftWrapped(page, 0);
  await NP.focusCaret(page, 1 + Math.floor(inner.length * 0.7));
  const st = await NP.readCaretState(page);
  expect(st.hasBold).toBe(true);
  NP.assertSoftWrapped(st, 'bold wrap');
  NP.assertVisualCaretInLine(st, 'bold wrapped');
});

test('wrap: font 130% jeszcze ciaśniej — H1 caret OK', async ({ page }) => {
  const { h1 } = NP.MARK;
  await NP.forceWrapSpace(page, 'narrow');
  await NP.setFontSize(page, 1.3);
  const inner = NP.longWrapToken(28);
  await NP.setNotepadText(page, h1.o + inner + h1.c);
  await NP.waitUntilLineSoftWrapped(page, 0);
  await NP.focusCaret(page, 1 + Math.floor(inner.length * 0.5));
  const st = await NP.readCaretState(page);
  NP.assertSoftWrapped(st, 'H1 wrap @1.3');
  NP.assertVisualCaretInLine(st, 'H1 wrap @1.3rem');
});

test('wrap: tap w 2. wiersz wizualny H1 — caret na tym wierszu', async ({ page }) => {
  const { h1 } = NP.MARK;
  await NP.forceWrapSpace(page, 'narrow');
  const inner = NP.longWrapToken(40);
  await NP.setNotepadText(page, h1.o + inner + h1.c);
  await NP.waitUntilLineSoftWrapped(page, 0);
  await NP.focusCaret(page, 1);
  let st = await NP.readCaretState(page);
  NP.assertSoftWrapped(st, 'before tap');
  expect(st.visualRows).toBeGreaterThanOrEqual(2);

  await NP.tapMirrorVisualRow(page, 0, 1, 0.5);
  st = await NP.readCaretState(page);
  expect(st.collapsed).toBe(true);
  expect(st.selectionStart).toBeGreaterThan(1);
  if (st.visualCaretOn) {
    NP.assertVisualCaretInLine(st, 'tap row1 H1');
    NP.assertCaretOnVisualRow(st, 1, 'tap row1 H1');
  } else {
    expect(st.selectionStart).toBeGreaterThanOrEqual(1);
    expect(st.selectionStart).toBeLessThan(1 + inner.length);
  }
});

test('wrap: zaznaczenie zakresu na zawiniętym H1 — sel-hl', async ({ page }) => {
  const { h1 } = NP.MARK;
  await NP.forceWrapSpace(page, 'narrow');
  const inner = NP.longWrapToken(36);
  await NP.setNotepadText(page, h1.o + inner + h1.c);
  await NP.waitUntilLineSoftWrapped(page, 0);
  await NP.focusCaret(page, 1 + 5, 1 + Math.floor(inner.length * 0.8));
  const st = await NP.readCaretState(page);
  expect(st.collapsed).toBe(false);
  NP.assertSoftWrapped(st, 'sel wrap');
  expect(st.hasSelHl).toBe(true);
  expect(st.visualCaretOn).toBe(false);
});

test('wrap: viewport mobilny 360px — długa linia się zawija', async ({ page }) => {
  await NP.forceWrapSpace(page, 'viewport');
  const body = NP.longWrapToken(50);
  await NP.setNotepadText(page, body);
  await NP.waitUntilLineSoftWrapped(page, 0);
  await NP.focusCaret(page, 20);
  const st = await NP.readCaretState(page);
  expect(st.editor.width, 'narrow viewport editor').toBeLessThan(400);
  NP.assertSoftWrapped(st, 'viewport wrap');
});
