// [EN] Notepad caret/selection e2e helpers — open modal, seed PUA text, probe visual caret + wrap
const MARK = {
  bold: { o: '\uE000', c: '\uE001' },
  italic: { o: '\uE002', c: '\uE003' },
  underline: { o: '\uE004', c: '\uE005' },
  h1: { o: '\uE013', c: '\uE014' },
  h2: { o: '\uE015', c: '\uE016' },
  h3: { o: '\uE017', c: '\uE018' },
};

/** Long token without spaces — forces soft-wrap in a narrow editor. */
function longWrapToken(n = 48) {
  return 'Ww'.repeat(n); // [EN] wide glyphs — wraps sooner than 'ii'
}

async function waitAppReady(page) {
  await page.goto('index.html', { waitUntil: 'networkidle' });
  await page.waitForSelector('#notepadBtn', { state: 'visible' });
  await page.waitForFunction(() => {
    const splash = document.getElementById('appSplash');
    if (!splash) return true;
    const cs = getComputedStyle(splash);
    return cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0' || splash.hidden;
  }, { timeout: 20_000 }).catch(() => {});
}

async function openNotepad(page) {
  await page.locator('#notepadBtn').click();
  await page.waitForSelector('body.notepad-open textarea.np-text', { state: 'visible' });
  await page.waitForTimeout(80);
}

async function closeNotepad(page) {
  const close = page.locator('#notepadClose');
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.waitForFunction(() => !document.body.classList.contains('notepad-open')).catch(() => {});
}

async function settleLayout(page) {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(80); // [EN] layout settle 50/150/300 — short wait covers first pass
}

async function setNotepadText(page, text) {
  await page.evaluate((t) => {
    const ta = document.querySelector('textarea.np-text');
    if (!ta) throw new Error('np-text missing');
    ta.value = t;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    if (window.__matm0 && typeof window.__matm0.npRecompute === 'function') {
      window.__matm0.npRecompute();
    }
  }, text);
  await settleLayout(page);
}

async function focusCaret(page, start, end) {
  const e = end == null ? start : end;
  await page.evaluate(({ start, end }) => {
    const ta = document.querySelector('textarea.np-text');
    ta.focus();
    ta.setSelectionRange(start, end);
    ta.dispatchEvent(new Event('select', { bubbles: true }));
    ta.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  }, { start, end: e });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
}

async function setFontSize(page, fs) {
  await page.evaluate((v) => {
    if (!window.__matm0) throw new Error('__matm0 missing');
    window.__matm0.state.settings.notepadFontSize = v;
    if (typeof window.__matm0.npSyncFontSize === 'function') {
      window.__matm0.npSyncFontSize();
    } else {
      document.querySelector('.np-editor')?.style.setProperty('--np-font-size', v + 'rem');
      window.__matm0.npRecompute();
    }
  }, fs);
  await settleLayout(page);
}

/**
 * Squeeze text column so long lines soft-wrap.
 * @param {'narrow'|'very-narrow'|'viewport'} mode
 */
async function forceWrapSpace(page, mode = 'narrow') {
  if (mode === 'viewport') {
    await page.setViewportSize({ width: 360, height: 740 });
  }
  await page.evaluate((m) => {
    const ed = document.querySelector('.np-editor');
    const inner = document.querySelector('.np-editor-inner');
    const modal = document.querySelector('.np-modal, #notepadModal, .notepad-modal');
    const width = m === 'very-narrow' ? '140px' : '200px';
    if (ed) {
      ed.style.maxWidth = width;
      ed.style.width = width;
      ed.style.boxSizing = 'border-box';
    }
    if (inner) {
      inner.style.maxWidth = width;
      inner.style.width = '100%';
    }
    // [EN] modal often drives width — clamp the sheet too when present
    if (modal && modal.style) {
      modal.style.maxWidth = m === 'viewport' ? '100%' : '240px';
    }
    if (window.__matm0) {
      window.__matm0.state.settings.notepadGutterHidden = true;
      ed?.classList.add('gutter-hidden');
      inner?.classList.add('gutter-hidden');
      if (typeof window.__matm0.npRecompute === 'function') window.__matm0.npRecompute();
    }
  }, mode);
  await settleLayout(page);
  await page.waitForTimeout(320); // [EN] cover _npScheduleLayoutSettle 50/150/300
}

async function waitUntilLineSoftWrapped(page, lineIdx = 0) {
  await page.waitForFunction((i) => {
    const m = document.querySelectorAll('.np-mirror-line')[i];
    if (!m) return false;
    if (m.classList.contains('np-wrapped')) return true;
    const ta = document.querySelector('textarea.np-text');
    const cs = ta ? getComputedStyle(ta) : null;
    const lh = cs ? (parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 2) : 24;
    return m.getBoundingClientRect().height > lh * 1.35;
  }, lineIdx, { timeout: 4000 });
}

async function resetWrapSpace(page) {
  await page.evaluate(() => {
    const ed = document.querySelector('.np-editor');
    const inner = document.querySelector('.np-editor-inner');
    const modal = document.querySelector('.np-modal, #notepadModal, .notepad-modal');
    if (ed) {
      ed.style.maxWidth = '';
      ed.style.width = '';
      ed.classList.remove('gutter-hidden');
    }
    if (inner) {
      inner.style.maxWidth = '';
      inner.style.width = '';
      inner.classList.remove('gutter-hidden');
    }
    if (modal && modal.style) modal.style.maxWidth = '';
    if (window.__matm0) {
      window.__matm0.state.settings.notepadGutterHidden = false;
      if (typeof window.__matm0.npRecompute === 'function') window.__matm0.npRecompute();
    }
  });
  await settleLayout(page);
}

async function tapAt(page, clientX, clientY) {
  await page.evaluate(({ x, y }) => {
    const ta = document.querySelector('textarea.np-text');
    if (!ta) throw new Error('np-text missing');
    ta.focus();
    const common = { clientX: x, clientY: y, bubbles: true, cancelable: true, button: 0, pointerId: 1, pointerType: 'mouse' };
    ta.dispatchEvent(new PointerEvent('pointerdown', common));
    ta.dispatchEvent(new PointerEvent('pointerup', common));
    ta.dispatchEvent(new MouseEvent('mouseup', common));
  }, { x: clientX, y: clientY });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
}

/** Tap ~middle of Nth visual row inside logical mirror line (0-based visual row). */
async function tapMirrorVisualRow(page, lineIdx, visualRow, xFrac = 0.55) {
  const pt = await page.evaluate(({ lineIdx, visualRow, xFrac }) => {
    const mirror = document.querySelector('.np-mirror');
    const ta = document.querySelector('textarea.np-text');
    const mLine = mirror?.querySelectorAll('.np-mirror-line')[lineIdx];
    if (!mLine || !ta) return null;
    const cs = getComputedStyle(ta);
    const lh = parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize) * 2) || 24;
    const r = mLine.getBoundingClientRect();
    const x = r.left + Math.min(r.width * xFrac, r.width - 4);
    const y = r.top + lh * (visualRow + 0.5);
    return { x, y, lh, height: r.height, wrapped: mLine.classList.contains('np-wrapped') };
  }, { lineIdx, visualRow, xFrac });
  if (!pt) throw new Error('tapMirrorVisualRow: no mirror line');
  await tapAt(page, pt.x, pt.y);
  return pt;
}

async function readCaretState(page) {
  return page.evaluate(() => {
    const ta = document.querySelector('textarea.np-text');
    const vis = document.querySelector('.np-visual-caret');
    const editor = document.querySelector('.np-editor');
    const mirror = document.querySelector('.np-mirror');
    const FMT = window.MATM0_NP_FMT;
    if (!ta) return null;
    const a = ta.selectionStart;
    const b = ta.selectionEnd;
    const prefix = FMT && FMT.displayPrefix ? FMT.displayPrefix(ta.value, a) : ta.value.slice(0, a);
    const editorRect = editor?.getBoundingClientRect();
    const mirrorRect = mirror?.getBoundingClientRect();
    const visHidden = !vis || vis.hidden || getComputedStyle(vis).display === 'none';
    const visLeft = vis && !visHidden ? parseFloat(vis.style.left) : null;
    const visTop = vis && !visHidden ? parseFloat(vis.style.top) : null;
    const visH = vis && !visHidden ? parseFloat(vis.style.height) : null;
    let lineIdx = 0;
    for (let i = 0; i < a && i < ta.value.length; i++) if (ta.value[i] === '\n') lineIdx++;
    const mLine = mirror?.querySelectorAll('.np-mirror-line')[lineIdx];
    const mLineRect = mLine?.getBoundingClientRect();
    const cs = getComputedStyle(ta);
    const lh = parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize) * 2) || 24;
    const lineH = mLineRect ? mLineRect.height : 0;
    const visualRows = lineH > 0 ? Math.max(1, Math.round(lineH / lh)) : 1;
    return {
      value: ta.value,
      selectionStart: a,
      selectionEnd: b,
      collapsed: a === b,
      visualCaretOn: ta.classList.contains('np-visual-caret-on'),
      visualCaretHidden: visHidden,
      visLeft,
      visTop,
      visH,
      displayPrefixLen: prefix.length,
      bufferIndex: a,
      lineIdx,
      fontVar: editor ? getComputedStyle(editor).getPropertyValue('--np-font-size').trim() : '',
      hasH1: !!mirror?.querySelector('.np-h1, .np-mirror-line.np-h1'),
      hasH2: !!mirror?.querySelector('.np-h2, .np-mirror-line.np-h2'),
      hasH3: !!mirror?.querySelector('.np-h3, .np-mirror-line.np-h3'),
      hasBold: !!mirror?.querySelector('.np-fmt-bold'),
      hasItalic: !!mirror?.querySelector('.np-fmt-italic'),
      hasSelHl: !!mirror?.querySelector('.np-sel-hl'),
      lineWrapped: !!(mLine && mLine.classList.contains('np-wrapped')),
      visualRows,
      lineHeightPx: lh,
      editor: editorRect ? { left: editorRect.left, top: editorRect.top, right: editorRect.right, bottom: editorRect.bottom, width: editorRect.width } : null,
      mirror: mirrorRect ? { left: mirrorRect.left, top: mirrorRect.top, right: mirrorRect.right, bottom: mirrorRect.bottom } : null,
      mLine: mLineRect ? { left: mLineRect.left, top: mLineRect.top, right: mLineRect.right, bottom: mLineRect.bottom, height: mLineRect.height } : null,
    };
  });
}

function assertVisualCaretInLine(st, label) {
  const { expect } = require('playwright/test');
  expect(st, label).toBeTruthy();
  expect(st.visualCaretOn, `${label}: visual caret should be on`).toBe(true);
  expect(st.visualCaretHidden, `${label}: overlay visible`).toBe(false);
  expect(st.visLeft, `${label}: left`).toEqual(expect.any(Number));
  expect(st.visTop, `${label}: top`).toEqual(expect.any(Number));
  if (st.mLine && Number.isFinite(st.visLeft) && Number.isFinite(st.visTop)) {
    expect(st.visLeft, `${label}: left in/near line`).toBeGreaterThanOrEqual(st.mLine.left - 4);
    expect(st.visLeft, `${label}: left not past line`).toBeLessThanOrEqual(st.mLine.right + 4);
    expect(st.visTop, `${label}: top near line`).toBeGreaterThanOrEqual(st.mLine.top - 8);
    expect(st.visTop, `${label}: top not below line`).toBeLessThanOrEqual(st.mLine.bottom + 8);
  }
}

function assertSoftWrapped(st, label) {
  const { expect } = require('playwright/test');
  const byClass = !!st.lineWrapped;
  const byRows = (st.visualRows || 0) >= 2;
  const byHeight = !!(st.mLine && st.lineHeightPx && st.mLine.height > st.lineHeightPx * 1.35);
  expect(byClass || byRows || byHeight, `${label}: expected soft-wrap (class=${byClass} rows=${st.visualRows} h=${st.mLine?.height})`).toBe(true);
}

/** Caret Y should land on the expected visual row inside a soft-wrapped line. */
function assertCaretOnVisualRow(st, visualRow, label) {
  const { expect } = require('playwright/test');
  expect(st.mLine, `${label}: mirror line`).toBeTruthy();
  expect(st.visTop, `${label}: visTop`).toEqual(expect.any(Number));
  const rowTop = st.mLine.top + st.lineHeightPx * visualRow;
  const rowBot = rowTop + st.lineHeightPx;
  expect(st.visTop, `${label}: caret on visual row ${visualRow}`).toBeGreaterThanOrEqual(rowTop - 6);
  expect(st.visTop, `${label}: caret on visual row ${visualRow}`).toBeLessThan(rowBot + 6);
}

module.exports = {
  MARK,
  longWrapToken,
  waitAppReady,
  openNotepad,
  closeNotepad,
  settleLayout,
  setNotepadText,
  focusCaret,
  setFontSize,
  forceWrapSpace,
  resetWrapSpace,
  waitUntilLineSoftWrapped,
  tapAt,
  tapMirrorVisualRow,
  readCaretState,
  assertVisualCaretInLine,
  assertSoftWrapped,
  assertCaretOnVisualRow,
};
