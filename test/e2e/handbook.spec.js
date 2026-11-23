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
  const status = page.locator('#hbStatus'); // jeden stały obszar „status”: czytnik ekranu ogłasza każdą zmianę
  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toContainText('hasło');
  await page.locator('#hbSearch').fill('zzzz');
  await expect(status).toContainText('Nic nie pasuje do „zzzz”');
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

async function stepsMore(page, expr, fid) {
  await page.locator('#calcExpr').fill(expr);
  await page.locator('#calcExplainTip').click();
  await page.locator('#stepsView .steps-ink [data-formula="' + fid + '"]').first().click();
  await page.locator('#stepsView .steps-pop').getByRole('button', { name: /W podręczniku/ }).click();
}

test('z kroków: Powiązane tam i z powrotem, Wróć ×3 kończy na krokach z dymkiem', async ({ page }) => {
  await boot(page);
  await page.waitForFunction(() => !!window.MATM0_TEX);
  await stepsMore(page, 'rozwiąż x^2 - 5x + 6 = 0', 'delta');
  const h2 = page.locator('#hbView h2');
  await expect(h2).toHaveText('Delta (wyróżnik)');
  await page.locator('#hbView .hb-related').getByRole('button', { name: 'Wzory na rozwiązania równania kwadratowego' }).click();
  await expect(h2).toHaveText('Wzory na rozwiązania równania kwadratowego');
  await page.locator('#hbView .hb-related').getByRole('button', { name: 'Delta (wyróżnik)' }).click();
  await expect(h2).toHaveText('Delta (wyróżnik)');
  await page.locator('#hbView .hb-back').click();
  await expect(h2).toHaveText('Wzory na rozwiązania równania kwadratowego');
  await page.locator('#hbView .hb-back').click();
  await expect(h2).toHaveText('Delta (wyróżnik)');
  await expect(page.locator('#hbView .hb-back')).toContainText('Wróć do kroków');
  await page.locator('#hbView .hb-back').click();
  await expect(page.locator('#stepsView .steps-pop')).toBeVisible();
  await expect(page.locator('#stepsView .steps-pop')).toContainText('Delta');
});

test('z kroków: po zmianie wyrażenia nie ma „Wróć do kroków”', async ({ page }) => {
  await boot(page);
  await page.waitForFunction(() => !!window.MATM0_TEX);
  await stepsMore(page, 'rozwiąż x^2 - 5x + 6 = 0', 'delta');
  await expect(page.locator('#hbView .hb-back')).toContainText('Wróć do kroków');
  const calc = page.locator('.tab-btn[data-tab="calculator"]:visible, #bottomNav [data-nav="calc"]:visible').first();
  await calc.click();
  await page.locator('#calcExpr').fill('2+2');
  await openHandbook(page);
  await expect(page.locator('#hbView h2')).toHaveText('Delta (wyróżnik)');
  await expect(page.locator('#hbView')).not.toContainText('Wróć do kroków');
});

test('z kroków klawiaturą: Wróć do kroków oddaje fokus wzorowi, Esc wraca do przycisku kroków', async ({ page }) => {
  await boot(page);
  await page.waitForFunction(() => !!window.MATM0_TEX);
  await page.locator('#calcExpr').fill('rozwiąż x^2 - 5x + 6 = 0');
  await page.locator('#calcExplainTip').focus();
  await page.keyboard.press('Enter');
  await page.locator('#stepsView .steps-ink [data-formula="delta"]').first().click();
  const more = page.locator('#stepsView .steps-pop').getByRole('button', { name: /W podręczniku/ });
  await more.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#hbView .hb-back')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#stepsView .steps-pop')).toBeVisible();
  await page.waitForTimeout(100); // po klatce animacji szuflada nie może przejąć fokusu
  await expect(page.locator('#stepsView .steps-formula-sr[data-formula="delta"]').first()).toBeFocused();
  await page.keyboard.press('Escape'); // pierwsze Esc zamyka dymek
  await expect(page.locator('#stepsView .steps-pop')).toHaveCount(0);
  await page.keyboard.press('Escape'); // drugie zamyka kroki
  await expect(page.locator('#calcExplainTip')).toBeFocused();
});
