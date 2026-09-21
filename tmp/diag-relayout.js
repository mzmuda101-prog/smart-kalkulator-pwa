// Diagnostyka: czy _npLayoutLineChrome wpada w niekończącą się pętlę rAF?
// Mierzymy: bicie rAF, liczbę klatek z relayoutem, czy strona jest "visible".
const { chromium } = require('playwright');

const PORT = process.env.PORT || 7931;
const BASE = `http://127.0.0.1:${PORT}/`;

const MARK = { h1: { o: '', c: '' } };

function longWrapToken(n = 40) { return 'Ww'.repeat(n); }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'pl-PL' });
  const page = await ctx.newPage();

  await page.addInitScript(() => {
    window.__diag = { rafCount: 0, rafMaxGap: 0, lastRaf: 0, timerCount: 0, started: Date.now() };
    const beat = (t) => {
      if (window.__diag.lastRaf) {
        const gap = t - window.__diag.lastRaf;
        if (gap > window.__diag.rafMaxGap) window.__diag.rafMaxGap = gap;
      }
      window.__diag.lastRaf = t;
      window.__diag.rafCount++;
      requestAnimationFrame(beat);
    };
    requestAnimationFrame(beat);
    setInterval(() => { window.__diag.timerCount++; }, 100);
  });

  await page.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
  await page.waitForSelector('#notepadBtn', { state: 'visible' });
  await page.waitForTimeout(1500);

  // policz wywołania _npLayoutLineChrome — owijamy przez patch na rAF? Nie mamy dostępu.
  // Zamiast tego: liczymy przebudowy guttera przez MutationObserver.
  await page.evaluate(() => {
    window.__gutterMut = 0;
    const g = document.querySelector('.np-gutter');
    if (g) new MutationObserver((m) => { window.__gutterMut += m.length; }).observe(g, { childList: true });
  });

  await page.locator('#notepadBtn').click();
  await page.waitForSelector('body.notepad-open textarea.np-text', { state: 'visible' });
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    window.__gutterMut = 0;
    const g = document.querySelector('.np-gutter');
    if (g) new MutationObserver((m) => { window.__gutterMut += m.length; }).observe(g, { childList: true });
  });

  // forceWrapSpace('narrow')
  await page.evaluate(() => {
    const ed = document.querySelector('.np-editor');
    const inner = document.querySelector('.np-editor-inner');
    const modal = document.querySelector('.np-modal, #notepadModal, .notepad-modal');
    const width = '200px';
    if (ed) { ed.style.maxWidth = width; ed.style.width = width; ed.style.boxSizing = 'border-box'; }
    if (inner) { inner.style.maxWidth = width; inner.style.width = '100%'; }
    if (modal && modal.style) modal.style.maxWidth = '240px';
    if (window.__matm0) {
      window.__matm0.state.settings.notepadGutterHidden = true;
      ed?.classList.add('gutter-hidden');
      inner?.classList.add('gutter-hidden');
      window.__matm0.npRecompute();
    }
  });
  await page.waitForTimeout(500);

  const inner = MARK.h1.o + longWrapToken(40) + MARK.h1.c;
  await page.evaluate((t) => {
    const ta = document.querySelector('textarea.np-text');
    ta.value = t;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    window.__matm0.npRecompute();
  }, inner);

  const samples = [];
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(1000);
    samples.push(await page.evaluate(() => ({
      t: Date.now() - window.__diag.started,
      raf: window.__diag.rafCount,
      rafMaxGap: Math.round(window.__diag.rafMaxGap),
      timers: window.__diag.timerCount,
      gutterMut: window.__gutterMut,
      vis: document.visibilityState,
    })));
  }
  console.log(JSON.stringify(samples, null, 2));

  let prev = null;
  for (const s of samples) {
    if (prev) {
      console.log(`Δ1s: rAF=${s.raf - prev.raf} klatek, gutterMutacje=${s.gutterMut - prev.gutterMut}, timery=${s.timers - prev.timers}, vis=${s.vis}`);
    }
    prev = s;
  }

  await browser.close();
})();
