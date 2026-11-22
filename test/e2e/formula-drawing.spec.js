// ============================================================
//  RYSUNEK WZORU (spec 5.9, etap 1): wzór w wierszu wyniku jak na kartce
//  — pojawia się dla wzorów, nie dla prostych działań i pieniędzy,
//  — nie zmienia układu (wynik się nie zawija, klawisze się nie ruszają).
// ============================================================
const { test, expect } = require('playwright/test');

test.use({ serviceWorkers: 'block' });

async function type(page, q) {
  await page.locator('#calcExpr').fill(q);
  await page.waitForTimeout(300);
}
const formula = (page) => page.locator('#calcFormula');

test('wzór rysowany, proste działanie i pieniądze bez rysunku', async ({ page }) => {
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_TEX);
  await type(page, 'lim x→0 sin x/x');
  await expect(formula(page)).toBeVisible();
  await expect(formula(page).locator('.ML__latex, .ML__base').first()).toBeAttached();
  await expect(formula(page)).toHaveAttribute('aria-hidden', 'true'); // ten sam zapis co pole — czytnik nie czyta dwa razy
  for (const q of ['2+2', '100 zł + 23% vat', '']) {
    await type(page, q);
    await expect(formula(page)).toBeHidden();
  }
});

test('rysunek nie zmienia układu: wynik bez zawijania, klawisze w miejscu', async ({ page }) => {
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_TEX);
  const geo = () => page.evaluate(() => {
    const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return [Math.round(b.top), Math.round(b.height)]; };
    return { disp: r('.card .calc-display'), grid: r('#calcGrid'), wrap: document.querySelector('.card .calc-display').classList.contains('calc-result-wrap'), sw: document.documentElement.scrollWidth, iw: innerWidth };
  });
  await type(page, 'lim n→∞ ((5n+7)/(5n-8))^n');
  await page.evaluate(() => { window.MATM0_TEX = null; }); // ten sam wzór bez rysunku — wzorzec układu
  await type(page, 'lim n→∞ ((5n+7)/(5n-8))^n ');
  const bez = await geo();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_TEX);
  await type(page, 'lim n→∞ ((5n+7)/(5n-8))^n ');
  await expect(formula(page)).toBeVisible();
  await page.waitForTimeout(400);
  const z = await geo();
  expect(z.wrap).toBe(false);
  expect(z.disp).toEqual(bez.disp);
  expect(z.grid).toEqual(bez.grid);
  expect(z.sw).toBeLessThanOrEqual(z.iw);
  await expect(page.locator('#calcResult')).toHaveText('e³');
  // rysunek kończy się przed wynikiem i „Kroki”
  const [f, tip] = await Promise.all([formula(page).boundingBox(), page.locator('#calcExplainTip').boundingBox()]);
  expect(f.x + f.width).toBeLessThanOrEqual(tip.x);
});
