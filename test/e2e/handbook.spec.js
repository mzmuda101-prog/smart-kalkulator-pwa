// ============================================================
//  PODRĘCZNIK (spec 2026-11-23-podrecznik-design.md): zakładka z działami, hasłami,
//  wyszukiwarką, „Spróbuj” i „Powiązane”; „Więcej” z kroków otwiera hasło, „Wróć do kroków” wraca.
// ============================================================
const { test, expect } = require('playwright/test');

test.use({ serviceWorkers: 'block' });

async function openHandbook(page) {
  const tab = page.locator('.tab-btn[data-tab="podrecznik"]');
  if (await tab.isVisible()) { await tab.click(); return; }
  await page.locator('#bottomNav [data-nav="tools"]').click();
  await page.locator('#toolsSheet .tools-sheet-item[data-tab="podrecznik"]').click();
}
async function boot(page) {
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_HANDBOOK && !!window.MATM0_FORMULAS);
}

test('spis działów → dział → hasło → Wróć ×2', async ({ page }) => {
  await boot(page);
  await openHandbook(page);
  const view = page.locator('#hbView');
  await expect(page.locator('#panel-podrecznik')).toBeVisible();
  const chapter = view.getByRole('button', { name: /Równania i nierówności/ });
  await expect(chapter).toContainText(/\d/);
  await chapter.click();
  await view.getByRole('button', { name: /Delta \(wyróżnik\)/ }).click();
  await expect(view.locator('h2')).toHaveText('Delta (wyróżnik)');
  await expect(view.locator('h2')).toBeFocused();
  await expect(view.locator('.hb-level')).toHaveText('liceum');
  await view.locator('.hb-back').click();
  await expect(view.getByRole('button', { name: /Delta \(wyróżnik\)/ })).toBeVisible();
  await view.locator('.hb-back').click();
  await expect(view.getByRole('button', { name: /Równania i nierówności/ })).toBeVisible();
  await expect(view.locator('.hb-back')).toHaveCount(0);
});

test('wyszukiwanie bez polskich znaków i pusty wynik', async ({ page }) => {
  await boot(page);
  await openHandbook(page);
  await page.locator('#hbSearch').fill('wyroznik');
  await expect(page.locator('#hbView').getByRole('button', { name: /Delta \(wyróżnik\)/ })).toBeVisible();
  await expect(page.locator('#hbView')).toContainText('Równania i nierówności');
  await page.locator('#hbSearch').fill('zzzz');
  await expect(page.locator('#hbView')).toContainText('Nic nie pasuje do „zzzz”');
  await page.locator('#hbSearch').fill('');
  await expect(page.locator('#hbView').getByRole('button', { name: /Granice/ })).toBeVisible();
});

test('Spróbuj wpisuje przykład do kalkulatora', async ({ page }) => {
  await boot(page);
  await openHandbook(page);
  await page.locator('#hbSearch').fill('delta');
  await page.locator('#hbView').getByRole('button', { name: /Delta \(wyróżnik\)/ }).click();
  await page.locator('#hbView .hb-try').click();
  await expect(page.locator('#panel-calculator')).toBeVisible();
  await expect(page.locator('#calcExpr')).toHaveValue('rozwiąż x^2 - 5x + 6 = 0');
  await expect(page.locator('#calcResult')).not.toBeEmpty();
});

test('Powiązane prowadzi do innego hasła', async ({ page }) => {
  await boot(page);
  await openHandbook(page);
  await page.locator('#hbSearch').fill('delta');
  await page.locator('#hbView').getByRole('button', { name: /Delta \(wyróżnik\)/ }).click();
  await page.locator('#hbView .hb-related').getByRole('button').first().click();
  await expect(page.locator('#hbView h2')).toHaveText('Wzory na rozwiązania równania kwadratowego');
  await page.locator('#hbView .hb-back').click();
  await expect(page.locator('#hbView h2')).toHaveText('Delta (wyróżnik)');
});

test('wąski ekran: hasło bez poziomego przewijania', async ({ page }) => {
  await page.setViewportSize({ width: 382, height: 800 });
  await boot(page);
  await openHandbook(page);
  await page.locator('#hbSearch').fill('sprzezenie');
  await page.locator('#hbView').getByRole('button', { name: /Sprzężenie/ }).click();
  await expect(page.locator('#hbView h2')).toBeVisible();
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over).toBeLessThanOrEqual(0);
});

test('bez MathLive hasło pokazuje wzór jako tekst', async ({ page }) => {
  await page.route(/mathlive/i, (r) => r.abort());
  await boot(page);
  await openHandbook(page);
  await page.locator('#hbSearch').fill('delta');
  await page.locator('#hbView').getByRole('button', { name: /Delta \(wyróżnik\)/ }).click();
  await expect(page.locator('#hbView .hb-tex')).toContainText('b^{2}');
});
