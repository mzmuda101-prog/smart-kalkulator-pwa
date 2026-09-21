// [EN] Notepad caret/selection e2e helpers — open modal, seed PUA text, probe visual caret + wrap
//
// ZASADA CZEKANIA (po debugowaniu flaka „tylko przy pełnym przebiegu"):
// żaden helper nie czeka na sztywny timeout ani na sygnał bez limitu czasu.
//  • czekamy na WARUNEK (layout ułożony, przycisk nie zasłonięty, pole ma fokus),
//  • każde czekanie ma twardy limit i własny komunikat — zawieszona strona ma
//    polec w kilka sekund z diagnozą, a nie zjeść 90 s timeoutu testu i kolejne
//    90 s w afterEach (stąd brały się przebiegi „fail po 3.0m”),
//  • pollujemy na setTimeout (`polling`), nie na requestAnimationFrame — gdy
//    kompozytor stanie, timery nadal tykają i dostajemy diagnozę zamiast zawisu.
const MARK = {
  bold: { o: '', c: '' },
  italic: { o: '', c: '' },
  underline: { o: '', c: '' },
  h1: { o: '', c: '' },
  h2: { o: '', c: '' },
  h3: { o: '', c: '' },
};

const T = {
  ready: 20_000,   // [EN] start apki (splash + pierwszy paint)
  action: 15_000,  // [EN] pojedyncze kliknięcie / pojawienie się elementu
  frames: 8_000,   // [EN] kilka klatek rAF — z zapasem na obciążoną maszynę
  layout: 8_000,   // [EN] mirror + gutter przestają się ruszać
};

/** Long token without spaces — forces soft-wrap in a narrow editor. */
function longWrapToken(n = 48) {
  return 'Ww'.repeat(n); // [EN] wide glyphs — wraps sooner than 'ii'
}

/* ── Diagnostyka strony ─────────────────────────────────────────────────────
   Bije w dwóch niezależnych rytmach: rAF (kompozytor) i setInterval (timery).
   Gdy coś się zawiesi, różnica między nimi mówi CO stanęło. */
function _diagInitScript() {
  if (window.__e2eDiag) return;
  const d = { rafFrames: 0, rafLastTs: 0, rafMaxGapMs: 0, timerTicks: 0, errors: [] };
  window.__e2eDiag = d;
  const beat = (ts) => {
    if (d.rafLastTs) {
      const gap = ts - d.rafLastTs;
      if (gap > d.rafMaxGapMs) d.rafMaxGapMs = gap;
    }
    d.rafLastTs = ts;
    d.rafFrames += 1;
    requestAnimationFrame(beat);
  };
  requestAnimationFrame(beat);
  setInterval(() => { d.timerTicks += 1; }, 100);
  window.addEventListener('error', (e) => { d.errors.push(String((e && e.message) || e)); });
  window.addEventListener('unhandledrejection', (e) => { d.errors.push('rejection: ' + String(e && e.reason)); });
}

/** Odczyt diagnostyki z limitem — jeśli page.evaluate nie wraca, główny wątek stoi. */
async function _readDiag(page, ms = 3000) {
  let timer;
  const probe = page.evaluate(() => ({
    rafFrames: window.__e2eDiag ? window.__e2eDiag.rafFrames : -1,
    rafMaxGapMs: window.__e2eDiag ? Math.round(window.__e2eDiag.rafMaxGapMs) : -1,
    timerTicks: window.__e2eDiag ? window.__e2eDiag.timerTicks : -1,
    errors: window.__e2eDiag ? window.__e2eDiag.errors.slice(-3) : [],
    visibility: document.visibilityState,
    notepadOpen: document.body.classList.contains('notepad-open'),
  })).catch((err) => ({ evalError: String((err && err.message) || err) }));
  const guard = new Promise((r) => { timer = setTimeout(() => r(null), ms); });
  const out = await Promise.race([probe, guard]);
  clearTimeout(timer);
  return out;
}

async function describeStall(page) {
  const d = await _readDiag(page);
  if (!d) return 'główny wątek strony NIE ODPOWIADA (page.evaluate nie wrócił) — pętla/blokada w JS';
  if (d.evalError) return `page.evaluate padło: ${d.evalError}`;
  const errs = d.errors && d.errors.length ? d.errors.join(' | ') : 'brak';
  return `rAF: ${d.rafFrames} klatek (max przerwa ${d.rafMaxGapMs} ms), timery: ${d.timerTicks} tyknięć, `
    + `visibility=${d.visibility}, notepad-open=${d.notepadOpen}, błędy JS: ${errs}`;
}

/** Czeka na N klatek rAF — ale z limitem i pollingiem na timerze, nie na rAF. */
async function waitFrames(page, frames = 2, label = 'waitFrames') {
  await page.evaluate((n) => {
    window.__e2eFrames = { left: n, done: false };
    const step = () => {
      const s = window.__e2eFrames;
      s.left -= 1;
      if (s.left <= 0) { s.done = true; return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, frames);
  try {
    await page.waitForFunction(
      () => !!(window.__e2eFrames && window.__e2eFrames.done),
      null,
      { timeout: T.frames, polling: 50 },
    );
  } catch (_) {
    throw new Error(`${label}: brak ${frames} klatek rAF w ${T.frames} ms — ${await describeStall(page)}`);
  }
}

/**
 * Czeka aż notatnik SKOŃCZY układać layout.
 * Źródło prawdy: licznik z apki (`npLayoutState().pending` — settle 50/150/300 ms
 * + ewentualne dopasowania rAF). Gdy apka go nie udostępnia (starsza wersja),
 * spadamy na „geometria mirrora nie zmieniła się od X ms".
 */
async function waitLayoutSettled(page, label = 'waitLayoutSettled') {
  await page.evaluate(() => { window.__e2eSettle = null; window.__e2eSig = null; });
  try {
    await page.waitForFunction(() => {
      const now = performance.now();
      const api = window.__matm0;
      if (api && typeof api.npLayoutState === 'function') {
        // Nie wystarczy jedno trafienie w pending===0: w trakcie animacji szerokości
        // kolumny (.np-editor-inner ma transition 0.25 s) ResizeObserver dokłada nowe
        // dopasowanie co klatkę, a między nimi licznik na moment spada do zera.
        // Dlatego wymagamy 60 ms CIĄGŁEJ ciszy (4–7 klatek z rzędu) — tyle nie trafi się,
        // dopóki layout naprawdę się rusza, a nie dokłada sekund do całego przebiegu.
        const st = window.__e2eSettle || (window.__e2eSettle = { since: 0 });
        if (api.npLayoutState().pending !== 0) { st.since = 0; return false; }
        if (!st.since) { st.since = now; return false; }
        return now - st.since >= 60;
      }
      // Fallback dla apki bez npLayoutState: geometria mirrora nie zmienia się od 340 ms
      // (czyli po ostatnim przebiegu settle, który apka planuje na 300 ms).
      const mirror = document.querySelector('.np-mirror');
      if (!mirror) return true;
      const sig = Array.from(mirror.querySelectorAll('.np-mirror-line')).map((l) => {
        const r = l.getBoundingClientRect();
        return `${Math.round(r.top * 100)}/${Math.round(r.height * 100)}/${Math.round(r.width * 100)}/${l.className}`;
      }).join('|');
      const st = window.__e2eSig || (window.__e2eSig = { sig: null, since: 0 });
      if (sig !== st.sig) { st.sig = sig; st.since = now; return false; }
      return now - st.since >= 340;
    }, null, { timeout: T.layout, polling: 25 });
  } catch (_) {
    throw new Error(`${label}: layout notatnika nie uspokoił się w ${T.layout} ms — ${await describeStall(page)}`);
  }
}

async function waitAppReady(page) {
  await page.addInitScript(_diagInitScript);
  await page.goto('index.html', { waitUntil: 'networkidle' });
  await page.waitForSelector('#notepadBtn', { state: 'visible', timeout: T.ready });
  // Splash ma position:fixed; inset:0; z-index:10000 i znika dopiero na transitionend
  // (`el.hidden = true`). Przy opacity:0 NADAL łapie kliknięcia, więc czekamy na
  // realne usunięcie z układu, a nie tylko na przezroczystość — i NIE połykamy
  // timeoutu: splash, który nie znika, to błąd, a nie coś do przemilczenia.
  await page.waitForFunction(() => {
    const splash = document.getElementById('appSplash');
    if (!splash) return true;
    const cs = getComputedStyle(splash);
    return splash.hidden || cs.display === 'none' || cs.visibility === 'hidden';
  }, null, { timeout: T.ready, polling: 50 }).catch(async () => {
    throw new Error(`waitAppReady: #appSplash nie zniknął w ${T.ready} ms — ${await describeStall(page)}`);
  });
}

/** Czeka aż w środek elementu trafi wskaźnik (nic go nie zasłania) — z nazwą winowajcy w błędzie. */
async function waitHittable(page, selector, label) {
  try {
    await page.waitForFunction((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!top && (top === el || el.contains(top));
    }, selector, { timeout: T.action, polling: 50 });
  } catch (_) {
    const who = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return '(brak elementu)';
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!top) return '(elementFromPoint → null)';
      const cs = getComputedStyle(top);
      return `<${top.tagName.toLowerCase()}${top.id ? '#' + top.id : ''}${top.className ? '.' + String(top.className).split(/\s+/).join('.') : ''}> `
        + `z-index=${cs.zIndex} opacity=${cs.opacity} display=${cs.display}`;
    }, selector).catch((err) => `(nie udało się odczytać: ${err.message})`);
    throw new Error(`${label}: ${selector} jest zasłonięty przez ${who} — ${await describeStall(page)}`);
  }
}

async function openNotepad(page) {
  await waitHittable(page, '#notepadBtn', 'openNotepad');
  await page.locator('#notepadBtn').click({ timeout: T.action });
  try {
    await page.waitForSelector('body.notepad-open textarea.np-text', { state: 'visible', timeout: T.action });
  } catch (_) {
    // Klik doszedł, ale notatnika nie ma. Rozróżniamy trzy różne awarie:
    // brak klasy `notepad-open` (handler nie zadziałał), klasa jest a textarei nie
    // (setupNpEditor nie doszedł — np. wyjątek w _npLoadCurrent), albo textarea
    // istnieje, lecz ma zerowe pudełko (modal jeszcze niewidoczny).
    const why = await page.evaluate(() => {
      const ta = document.querySelector('textarea.np-text');
      const modal = document.getElementById('notepadModal');
      const r = ta && ta.getBoundingClientRect();
      return {
        bodyClasses: document.body.className || '(brak)',
        hasModal: !!modal,
        modalAriaHidden: modal ? modal.getAttribute('aria-hidden') : null,
        hasTextarea: !!ta,
        textareaBox: r ? Math.round(r.width) + 'x' + Math.round(r.height) : null,
        hasApi: !!window.__matm0,
        jsErrors: window.__e2eDiag ? window.__e2eDiag.errors.slice(-3) : [],
      };
    }).catch((err) => ({ evalError: String((err && err.message) || err) }));
    throw new Error(`openNotepad: klik przeszedł, ale notatnik nie otworzył się w ${T.action} ms — `
      + `${JSON.stringify(why)} — ${await describeStall(page)}`);
  }
  // Gotowość = mirror wyrenderowany i pole ma fokus (openNotepad fokusuje po 60 ms),
  // czyli dokładnie to, na co poprzednio czekał sztywny `waitForTimeout(80)`.
  try {
    await page.waitForFunction(() => {
      const ta = document.querySelector('textarea.np-text');
      return !!ta && document.activeElement === ta && !!document.querySelector('.np-mirror-line');
    }, null, { timeout: T.action, polling: 25 });
  } catch (_) {
    throw new Error(`openNotepad: notatnik otwarty, ale pole nie dostało fokusu / mirror pusty — ${await describeStall(page)}`);
  }
  await waitLayoutSettled(page, 'openNotepad');
}

async function closeNotepad(page) {
  const close = page.locator('#notepadClose');
  if (await close.isVisible().catch(() => false)) {
    await close.click({ timeout: T.action }).catch(() => {});
  }
  await page.waitForFunction(
    () => !document.body.classList.contains('notepad-open'),
    null,
    { timeout: T.action, polling: 50 },
  ).catch(() => {});
}

async function settleLayout(page) {
  await waitFrames(page, 2, 'settleLayout');
  await waitLayoutSettled(page, 'settleLayout');
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
  await waitFrames(page, 1, 'focusCaret');
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
  // [EN] .np-editor-inner ma transition na grid-template-columns (0.25 s) — szerokość
  // kolumny tekstu jedzie przez ~250 ms, więc wrap ustala się dopiero po niej.
  // Czekamy na warunek (layout stoi), nie na sztywne 320 ms.
  await settleLayout(page);
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
  }, lineIdx, { timeout: 4000, polling: 30 });
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
  await waitFrames(page, 1, 'tapAt');
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
  waitFrames,
  waitLayoutSettled,
  waitHittable,
  describeStall,
};
