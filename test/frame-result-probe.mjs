#!/usr/bin/env node
/** [EN] Frame-by-frame probe: typing 1 + nineteen 0s in Standard mode, sampling #calcResult. */
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:7811/smart-kalkulator-pwa/';
const DIGITS = '1' + '0'.repeat(19); // 10000000000000000000
const FRAMES_PER_STEP = 12;

function sampleResult() {
  const el = document.getElementById('calcResult');
  const expr = document.getElementById('calcExpr');
  const row = el?.closest('.calc-result-row');
  const display = el?.closest('.calc-display');
  if (!el) return { error: 'no calcResult' };
  const cs = getComputedStyle(el);
  const card = el.closest('.card');
  const rect = el.getBoundingClientRect();
  const rowRect = row?.getBoundingClientRect();
  return {
    expr: expr?.value ?? '',
    text: el.textContent ?? '',
    innerHTML: el.innerHTML.slice(0, 200),
    childCount: el.childNodes.length,
    hasAnimSpan: !!el.querySelector('.calc-result-new'),
    classes: el.className,
    fontSize: cs.fontSize,
    inlineFontSize: el.style.fontSize || null,
    lineHeight: cs.lineHeight,
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    offsetWidth: el.offsetWidth,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    rectH: Math.round(rect.height * 10) / 10,
    rectW: Math.round(rect.width * 10) / 10,
    rowW: rowRect ? Math.round(rowRect.width * 10) / 10 : null,
    displayH: display ? Math.round(display.getBoundingClientRect().height * 10) / 10 : null,
    cssResultFont: card ? getComputedStyle(card).getPropertyValue('--calc-result-font').trim() : null,
    wrapLines: display?.classList.contains('calc-result-wrap-2') ? 2 : 1,
    displayClasses: display?.className ?? '',
  };
}

async function pressDigit(page, digit) {
  const sel = `.calc-btn[data-action="${digit}"]`;
  await page.locator(sel).dispatchEvent('pointerdown', { button: 0, bubbles: true });
}

async function sampleFrames(page, n) {
  return page.evaluate(
    async ({ frameCount, sampleFn }) => {
      const sample = new Function(`return (${sampleFn})()`);
      const out = [];
      function waitFrame() {
        return new Promise((r) => requestAnimationFrame(() => r()));
      }
      for (let i = 0; i < frameCount; i++) {
        await waitFrame();
        out.push({ frame: i, ...sample() });
      }
      return out;
    },
    { frameCount: n, sampleFn: sampleResult.toString() }
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#calcResult');
  // [EN] Standard tab should be default; ensure calculator panel visible
  await page.locator('[data-tab="calculator"]').click();
  await pressDigit(page, 'AC');
  await page.waitForTimeout(100);

  const report = [];

  for (let step = 0; step < DIGITS.length; step++) {
    const digit = DIGITS[step];
    const valueBefore = await page.evaluate(() => document.getElementById('calcExpr')?.value ?? '');
    await pressDigit(page, digit);
    const frames = await sampleFrames(page, FRAMES_PER_STEP);
    const expected = DIGITS.slice(0, step + 1);
    report.push({
      step: step + 1,
      digit,
      expectedExpr: expected,
      exprAfter: frames[frames.length - 1]?.expr ?? '',
      frames,
    });
  }

  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
