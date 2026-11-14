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

  test('komenda dokończona ponownie (dzi → dzis) pokazuje wynik z animacją', async ({ page }) => {
    const ex = page.locator('#calcExpr');
    await ex.pressSequentially('dzis', { delay: 120 });
    await page.waitForTimeout(500);
    await ex.press('Backspace');
    await page.waitForTimeout(400);
    await expect(page.locator('#calcResult')).toHaveText('—');
    const anim = page.evaluate(() => new Promise((res) => {
      const r = document.getElementById('calcResult');
      const mo = new MutationObserver(() => {
        if (r.textContent !== '—') { mo.disconnect(); res(r.querySelectorAll('.calc-result-new').length); }
      });
      mo.observe(r, { childList: true, subtree: true });
    }));
    await ex.press('s');
    expect(await anim, 'wynik po „—” wraca bez animacji').toBeGreaterThan(0);
  });
});

test('tryb „Zdanie” z klawiaturą: lista podpowiedzi kończy się nad paskiem skrótów', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'pasek skrótów pływa tylko na telefonie');
  await NP.waitAppReady(page);
  await page.evaluate(() => {
    const cb = document.getElementById('settingStandardAutocomplete'); // lista jest domyślnie wyłączona
    cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true }));
    window.__calcKeyBarForce = true;
    document.querySelector('.calc-layout-toggle').click();
  });
  // niski widoczny obszar jak przy klawiaturze iPhone'a: pasek skrótów ląduje wysoko
  await page.setViewportSize({ width: 390, height: 420 });
  await page.locator('#calcExpr').focus();
  await page.locator('#calcExpr').pressSequentially('dzi', { delay: 60 });
  await page.waitForSelector('#calcExprAC.open');
  await page.waitForTimeout(250);
  const st = await page.evaluate(() => {
    const dd = document.getElementById('calcExprAC');
    const kb = document.getElementById('calcKeyBar');
    return { ddBottom: dd.getBoundingClientRect().bottom, kbTop: kb.getBoundingClientRect().top,
             floating: kb.classList.contains('is-floating'), scrolls: dd.scrollHeight > dd.clientHeight };
  });
  expect(st.floating).toBe(true);
  expect(st.ddBottom).toBeLessThanOrEqual(st.kbTop);
});

test('telefon, klawisze: podpowiedzi to klikalne chipy w panelu, nie dymek nad kartą', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'kontrakt dotyczy ekranika nad klawiaturą');
  await NP.waitAppReady(page);
  await page.locator('#calcExpr').fill('dzis');
  await page.waitForTimeout(700);
  const st = await page.evaluate(() => {
    const h = document.getElementById('calcLiveHint');
    const hb = h.getBoundingClientRect();
    const d = h.closest('.calc-display').getBoundingClientRect();
    const rg = document.createRange(); rg.selectNodeContents(document.getElementById('calcResult'));
    const rb = rg.getBoundingClientRect();
    const overlapsResult = !(hb.bottom <= rb.top || hb.top >= rb.bottom || hb.right <= rb.left || hb.left >= rb.right);
    return { visible: !h.hidden && getComputedStyle(h).visibility !== 'hidden', chips: h.querySelectorAll('button').length,
             inPanel: hb.top >= d.top && hb.bottom <= d.bottom, overlapsResult, bubble: !!document.querySelector('.cursor-hint.is-visible') };
  });
  expect(st.visible).toBe(true);
  expect(st.chips).toBeGreaterThan(0);
  expect(st.inPanel).toBe(true);
  expect(st.overlapsResult).toBe(false);
  expect(st.bubble).toBe(false);
  // stuknięcie chipa dopisuje fragment do wyrażenia
  await page.locator('#calcLiveHint button').first().click();
  await expect(page.locator('#calcExpr')).not.toHaveValue('dzis');
});

// [PL] Zgłoszenie z iPhone'a (kilka razy): w trybie „Zdanie” pole stoi tuż nad paskiem skrótów (historia nad nim),
// pod polem nie ma miejsca — lista podpowiedzi lądowała pod paskiem i klawiaturą. Ma się otworzyć NAD polem.
test('tryb „Zdanie”: pole tuż nad paskiem skrótów — lista podpowiedzi otwiera się nad polem', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'pasek skrótów pływa tylko na telefonie');
  await NP.waitAppReady(page);
  await page.evaluate(() => {
    const cb = document.getElementById('settingStandardAutocomplete');
    cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true }));
    window.__calcKeyBarForce = true;
    document.querySelector('.calc-layout-toggle').click();
  });
  await page.locator('#calcExpr').focus();
  await page.evaluate(() => { document.body.style.paddingTop = '200px'; }); // „historia obliczeń” nad polem
  await page.waitForTimeout(300); // pasek skrótów ustawia się w rAF
  // „klawiatura” zabiera dół ekranu tak, że pasek skrótów staje tuż pod polem (jak na zrzucie z iPhone'a)
  const geo = await page.evaluate(() => ({
    wrapBottom: document.getElementById('calcExpr').parentElement.getBoundingClientRect().bottom,
    kbH: document.getElementById('calcKeyBar').offsetHeight || 52,
  }));
  await page.setViewportSize({ width: 390, height: Math.round(geo.wrapBottom + 6 + geo.kbH) });
  await page.waitForTimeout(300);
  await page.locator('#calcExpr').pressSequentially('dzi', { delay: 60 });
  await page.waitForSelector('#calcExprAC.open');
  await page.waitForTimeout(250);
  const st = await page.evaluate(() => {
    const dd = document.getElementById('calcExprAC').getBoundingClientRect();
    const wrap = document.getElementById('calcExpr').parentElement.getBoundingClientRect();
    const kb = document.getElementById('calcKeyBar').getBoundingClientRect();
    const hit = document.elementFromPoint(dd.left + dd.width / 2, dd.top + Math.min(30, dd.height / 2));
    return { ddTop: dd.top, ddBottom: dd.bottom, ddH: dd.height, wrapTop: wrap.top, wrapBottom: wrap.bottom, kbTop: kb.top,
             visible: !!(hit && hit.closest('#calcExprAC')) };
  });
  expect(st.visible, 'lista ma prostokąt, ale nic jej nie widać (przycięta albo zasłonięta)').toBe(true);
  expect(st.wrapBottom, 'przygotowanie: pole ma stać tuż nad paskiem').toBeGreaterThan(st.kbTop - 40);
  expect(st.wrapBottom, 'przygotowanie: pole nie może być pod paskiem').toBeLessThanOrEqual(st.kbTop);
  expect(st.ddBottom, 'lista wchodzi pod pasek skrótów').toBeLessThanOrEqual(st.kbTop);
  expect(st.ddBottom, 'lista ma być nad polem').toBeLessThanOrEqual(st.wrapTop + 1);
  expect(st.ddTop).toBeGreaterThanOrEqual(0);
  expect(st.ddH, 'lista za niska, by z niej korzystać').toBeGreaterThan(80);
  // wybór z listy nad polem działa i lista wraca na swoje miejsce
  await page.locator('#calcExprAC .autocomplete-item').first().dispatchEvent('mousedown');
  await expect(page.locator('#calcExpr')).not.toHaveValue('dzi');
  expect(await page.evaluate(() => document.getElementById('calcExprAC').classList.contains('open'))).toBe(false);
});
