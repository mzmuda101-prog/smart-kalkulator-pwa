const { test, expect } = require('playwright/test');
const NP = require('./notepad-caret.helpers.js');

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await NP.waitAppReady(page);
  await NP.openNotepad(page);
});

test.afterEach(async ({ page }) => {
  await NP.resetWrapSpace(page).catch(() => {});
  await NP.closeNotepad(page).catch(() => {});
});

test('bold softwrap @Robert tap stays on wrapped line (not nadwyżka)', async ({ page }) => {
  const { bold } = NP.MARK;
  // jak na telefonie: soft-wrap w środku @michal_aga, potem osobna linia nadwyżka
  const line1 = bold.o + 'paragony_razem:' + bold.c + '@michal_aga+@Robert+@mateusz+@kasia';
  const body = line1 + '\n' + bold.o + 'nadwyżka:' + bold.c + '800pln-\n@paragony_razem';
  await NP.forceWrapSpace(page, 'narrow');
  await NP.setNotepadText(page, body);
  await NP.settleLayout(page);

  const meta = await page.evaluate(() => {
    const ta = document.querySelector('textarea.np-text');
    const mLine = document.querySelectorAll('.np-mirror-line')[0];
    const r = mLine.getBoundingClientRect();
    const cs = getComputedStyle(ta);
    const lh = parseFloat(cs.lineHeight) || 24;
    return {
      visualRows: Math.max(1, Math.round(r.height / lh)),
      plain: window.MATM0_NP_FMT.stripMarkers(ta.value),
    };
  });
  expect(meta.visualRows, 'first line should soft-wrap').toBeGreaterThanOrEqual(2);

  await page.evaluate(() => {
    const ta = document.querySelector('textarea.np-text');
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  });

  // Tap 2. wiersz wizualny — okolice @Robert (nie koniec linii)
  await NP.tapMirrorVisualRow(page, 0, 1, 0.35);
  await NP.settleLayout(page);
  let st = await NP.readCaretState(page);
  const around = st.value.slice(Math.max(0, st.selectionStart - 10), st.selectionStart + 10);
  expect(st.lineIdx, 'must stay on logical line 0, not nadwyżka').toBe(0);
  expect(around.toLowerCase(), 'caret near Robert/mateusz wrap').toMatch(/robert|mateusz|michal|kasia|\+/i);
  expect(st.selectionStart).toBeLessThan(st.value.indexOf('nadwyżka') === -1
    ? st.value.length
    : st.value.indexOf('\n'));

  // jitter touch > 8px (telefon)
  await page.evaluate(() => {
    const ta = document.querySelector('textarea.np-text');
    ta.setSelectionRange(ta.value.length, ta.value.length);
  });
  const pt = await page.evaluate(() => {
    const mLine = document.querySelectorAll('.np-mirror-line')[0];
    const ta = document.querySelector('textarea.np-text');
    const cs = getComputedStyle(ta);
    const lh = parseFloat(cs.lineHeight) || 24;
    const r = mLine.getBoundingClientRect();
    return { x: r.left + r.width * 0.4, y: r.top + lh * 1.5 };
  });
  await page.evaluate(({ x, y }) => {
    const ta = document.querySelector('textarea.np-text');
    ta.focus();
    const down = { clientX: x, clientY: y, bubbles: true, cancelable: true, button: 0, pointerId: 1, pointerType: 'touch' };
    const up = { clientX: x + 14, clientY: y + 6, bubbles: true, cancelable: true, button: 0, pointerId: 1, pointerType: 'touch' };
    ta.dispatchEvent(new PointerEvent('pointerdown', down));
    ta.dispatchEvent(new PointerEvent('pointerup', up));
    ta.dispatchEvent(new MouseEvent('mouseup', up));
  }, pt);
  await NP.settleLayout(page);
  st = await NP.readCaretState(page);
  expect(st.lineIdx, 'jitter tap still on wrapped line').toBe(0);
});
