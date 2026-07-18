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

test('bold softwrap @kasia tap moves caret', async ({ page }) => {
  const { bold } = NP.MARK;
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
      height: r.height,
      lh,
      visualRows: Math.max(1, Math.round(r.height / lh)),
      valLen: ta.value.length,
    };
  });
  console.log('meta', meta);
  expect(meta.visualRows, 'should soft-wrap').toBeGreaterThanOrEqual(2);

  await page.evaluate(() => {
    const ta = document.querySelector('textarea.np-text');
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  });

  await NP.tapMirrorVisualRow(page, 0, 1, 0.85);
  await NP.settleLayout(page);
  let st = await NP.readCaretState(page);
  console.log('after clean tap', { sel: st.selectionStart, lineIdx: st.lineIdx, end: st.value.length });
  expect(st.selectionStart, 'caret should leave document end').toBeLessThan(st.value.length);
  expect(st.lineIdx, 'should be on first logical line').toBe(0);

  // finger jitter > 8px
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
    return { x: r.left + r.width * 0.7, y: r.top + lh * 1.5 };
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
  console.log('after jitter tap', { sel: st.selectionStart, lineIdx: st.lineIdx, end: st.value.length });
  expect(st.selectionStart, 'jitter>8 should still place caret').toBeLessThan(st.value.length);
});
