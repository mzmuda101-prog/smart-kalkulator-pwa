// ============================================================
//  PODRĘCZNIK NA SAFARI (WebKit, dotyk): z content-visibility:auto Safari przestawał
//  rysować panel po przewinięciu, a stuknięcie „Wróć do kroków” trafiało w pusty panel
//  (zrzut Mateusza z iPhone'a, v1.05.30). Pozostałe testy jadą na Chromium.
// ============================================================
const { test, expect, devices } = require('playwright/test');

test.use({ ...devices['iPhone 13'], browserName: 'webkit', serviceWorkers: 'block' });
test.beforeEach(({}, info) => test.skip(info.project.name !== 'mobile', 'jeden przebieg wystarczy'));

test('Safari: kroki → Więcej → przewinięcie do Powiązanych → Wróć do kroków stuknięciem', async ({ page }) => {
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_HANDBOOK && !!window.MATM0_TEX);
  await page.locator('#calcExpr').fill('rozwiąż x^2 - 5x + 6 = 0');
  await page.locator('#calcExplainTip').tap();
  await page.locator('#stepsView .steps-ink [data-formula="delta"]').first().tap();
  await page.locator('#stepsView .steps-pop').getByRole('button', { name: 'Więcej' }).tap();
  const h2 = page.locator('#hbView h2');
  await expect(h2).toHaveText('Delta (wyróżnik)');
  await page.locator('#hbView .hb-related').getByRole('button', { name: 'Wzory na rozwiązania równania kwadratowego' }).tap();
  await expect(h2).toHaveText('Wzory na rozwiązania równania kwadratowego');
  await page.locator('#hbView .hb-back').tap();
  await expect(h2).toHaveText('Delta (wyróżnik)');
  await page.locator('#hbView .hb-back').tap();
  await expect(page.locator('#panel-calculator')).toBeVisible();
  await expect(page.locator('#stepsView .steps-pop')).toBeVisible();
});
