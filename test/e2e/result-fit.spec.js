// ============================================================
//  PANEL WYNIKU — dopasowanie bez ucinania i bez przeskoków (2026-11-14).
//  Regresje z audytu klatka po klatce: sonda szerokości mierzyła innym krojem
//  (cs.font pusty przy tabular-nums), więc wynik przez ~250 ms wystawał, a potem
//  skakał fontem; tryb „Zdanie” ucinał długie wyrażenie; „≈” stał na lewym brzegu.
// ============================================================
const { test, expect } = require('playwright/test');
const NP = require('./notepad-caret.helpers.js');

// Nagrywa każdą klatkę przez `ms` po wpisaniu znaku: wystawanie treści poza ramkę wyniku i font.
async function typeAndRecord(page, key, ms = 650) {
  const rec = page.evaluate((dur) => new Promise((res) => {
    const r = document.getElementById('calcResult');
    const frames = []; const t0 = performance.now();
    (function tick() {
      const box = r.getBoundingClientRect();
      const rg = document.createRange(); rg.selectNodeContents(r);
      let over = 0;
      for (const x of rg.getClientRects()) if (x.width) over = Math.max(over, x.right - box.right, box.left - x.left);
      frames.push({ t: r.textContent, fs: parseFloat(getComputedStyle(r).fontSize), over });
      if (performance.now() - t0 < dur) requestAnimationFrame(tick); else res(frames);
    })();
  }), ms);
  await page.keyboard.type(key);
  return rec;
}

async function setExpr(page, text) {
  await page.locator('#calcExpr').fill(text);
  await page.waitForTimeout(700);
  await page.locator('#calcExpr').press('End');
}

test.describe('panel wyniku na telefonie', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'kontrakt dotyczy wąskiego ekranika nad klawiaturą');
    await NP.waitAppReady(page);
  });

  test('dopisanie cyfry: wynik od pierwszej klatki mieści się w ramce i nie skacze fontem', async ({ page }) => {
    for (const [start, key] of [['1234567,89', '1'], ['12345678901', '2'], ['2^10', '0']]) {
      await setExpr(page, start);
      const frames = await typeAndRecord(page, key);
      const fin = frames[frames.length - 1];
      const withFinal = frames.filter((f) => f.t === fin.t);
      expect(Math.max(...withFinal.map((f) => f.over)), `${start}${key}: wystaje poza ramkę`).toBeLessThanOrEqual(1);
      const sizes = [...new Set(withFinal.map((f) => Math.round(f.fs * 2) / 2))];
      expect(sizes.length, `${start}${key}: font zmieniał się po wyrenderowaniu (${sizes.join(' → ')})`).toBe(1);
    }
  });

  test('średnio długa liczba zostaje w jednej linii zamiast łamać się na dwie krótkie', async ({ page }) => {
    await setExpr(page, '1234567,891011');
    const st = await page.evaluate(() => {
      const r = document.getElementById('calcResult');
      return { lines: r.textContent.split('\n').length, fs: parseFloat(getComputedStyle(r).fontSize) };
    });
    expect(st.lines).toBe(1);
    expect(st.fs).toBeGreaterThan(24);
  });

  test('odstęp tysięcy w 2 liniach taki sam jak w 1 linii', async ({ page }) => {
    const sepW = async () => page.evaluate(() => {
      const s = document.querySelector('#calcResult .num-grp-sep');
      const r = document.getElementById('calcResult');
      return s ? s.getBoundingClientRect().width / parseFloat(getComputedStyle(r).fontSize) : null;
    });
    await setExpr(page, '1234567');
    const one = await sepW();
    await setExpr(page, '123456789*987654321*12345');
    const two = await sepW();
    expect(await page.evaluate(() => document.getElementById('calcResult').textContent.includes('\n'))).toBe(true);
    expect(Math.abs(two - one)).toBeLessThan(0.05);
  });

  test('„≈” stoi tuż przy liczbie, nie na lewym brzegu', async ({ page }) => {
    await setExpr(page, '1/7');
    const gap = await page.evaluate(() => {
      const a = document.getElementById('calcApprox').getBoundingClientRect();
      const rg = document.createRange(); rg.selectNodeContents(document.getElementById('calcResult'));
      return rg.getBoundingClientRect().left - a.right;
    });
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(20);
  });

  test('tryb „Zdanie”: długie wyrażenie przy 2-liniowym wyniku nie jest ucięte', async ({ page }) => {
    await page.evaluate(() => document.querySelector('.calc-layout-toggle').click());
    await page.waitForTimeout(300);
    await page.locator('#calcExpr').pressSequentially('1234567890123456789012345678', { delay: 10 });
    await page.waitForTimeout(700);
    const st = await page.evaluate(() => {
      const x = document.getElementById('calcExpr');
      return { sh: x.scrollHeight, ch: x.clientHeight, top: x.scrollTop, wrapped: document.getElementById('calcResult').textContent.includes('\n') };
    });
    expect(st.wrapped).toBe(true);
    expect(st.sh).toBeLessThanOrEqual(st.ch + 1);
    expect(st.top).toBe(0);
  });
});
