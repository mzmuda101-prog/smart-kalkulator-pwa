// Czy layout notatnika ZMIENIA się jeszcze PO tym, jak settleLayout() uzna go za gotowy?
// settleLayout = 2×rAF + 80 ms, a apka planuje przeliczenia na 50/150/300 ms (_npScheduleLayoutSettle).
const { chromium } = require('playwright');
const PORT = process.env.PORT || 7931;
const BASE = `http://127.0.0.1:${PORT}/`;
const CPU = Number(process.env.CPU || 1);
const H1O = '', H1C = '', BO = '', BC = '';

async function snap(page) {
  return page.evaluate(() => {
    const mLine = document.querySelector('.np-mirror-line');
    if (!mLine) return null;
    const walker = document.createTreeWalker(mLine, NodeFilter.SHOW_TEXT);
    const tn = walker.nextNode();
    const range = document.createRange();
    range.setStart(tn, 2); range.collapse(true);
    const r = range.getBoundingClientRect();
    const lr = mLine.getBoundingClientRect();
    return { caretX: +r.left.toFixed(2), caretY: +((r.top + r.bottom) / 2).toFixed(2),
             lineTop: +lr.top.toFixed(2), lineH: +lr.height.toFixed(2) };
  });
}

(async () => {
  const browser = await chromium.launch();
  for (const [label, vp] of [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: vp, locale: 'pl-PL' });
    const page = await ctx.newPage();
    if (CPU > 1) {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    }
    await page.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
    await page.waitForSelector('#notepadBtn', { state: 'visible' });
    await page.waitForTimeout(2000);
    await page.locator('#notepadBtn').click();
    await page.waitForSelector('body.notepad-open textarea.np-text', { state: 'visible' });
    await page.waitForTimeout(300);

    await page.evaluate(({ t }) => {
      const ta = document.querySelector('textarea.np-text');
      ta.value = t;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      window.__matm0.npRecompute();
    }, { t: H1O + BO + 'kasia' + BC + H1C });

    // dokładnie to, co robi settleLayout(): 2×rAF + 80 ms
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.waitForTimeout(80);
    const at80 = await snap(page);
    const marks = [];
    for (const ms of [70, 100, 150, 200, 500]) {
      await page.waitForTimeout(ms);
      marks.push({ ms, ...(await snap(page)) });
    }
    const drift = marks.filter((m) => at80 && (Math.abs(m.caretX - at80.caretX) > 0.5 || Math.abs(m.caretY - at80.caretY) > 0.5));
    console.log(`\n[${label}] CPU×${CPU}`);
    console.log('  po settleLayout (80 ms):', JSON.stringify(at80));
    marks.forEach((m) => console.log(`  +${m.ms}ms →`, JSON.stringify(m)));
    console.log(drift.length ? `  ⚠️  LAYOUT JESZCZE SIĘ RUSZA po settleLayout (${drift.length} próbek)` : '  ✅ stabilny po settleLayout');
    await ctx.close();
  }
  await browser.close();
})();
