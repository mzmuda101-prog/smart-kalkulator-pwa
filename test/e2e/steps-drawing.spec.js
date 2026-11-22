// ============================================================
//  KROKI JAK NA KARTCE (spec 5.12, etap 3): szuflada kroków rysuje każdy krok,
//  krok „Wzór na e” zniknął — wzór jest podkreślony w kroku, w którym działa,
//  stuknięcie → dymek, „Więcej” → widok, „Wróć” → to samo miejsce w krokach.
// ============================================================
const { test, expect } = require('playwright/test');

test.use({ serviceWorkers: 'block' });

test('lim n→∞ (1 − 1/n)^n: kroki narysowane, wzór na e w dymku i w „Więcej”', async ({ page }) => {
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_TEX && !!window.MATM0_FORMULAS);
  await page.locator('#calcExpr').fill('lim n→∞ (1 - 1/n)^n');
  await page.locator('#calcExplainTip').click();
  const steps = page.locator('#stepsView .steps-item');
  await expect(steps).toHaveCount(4);
  await expect(page.locator('#stepsView .steps-ink.is-drawn')).toHaveCount(4);
  // to, co widać, nie ma zapisu z klawiatury
  const visible = await page.locator('#stepsView .steps-ink').allInnerTexts();
  for (const t of visible) expect(t).not.toMatch(/sqrt\(|\^\(/);
  await expect(page.locator('#stepsView .steps-label', { hasText: 'Wzór na e' })).toHaveCount(0);
  // czytnik ekranu dostaje zapis kroku, rysunek jest ukryty
  await expect(page.locator('#stepsView .steps-ink').first()).toHaveAttribute('aria-hidden', 'true');

  const hit = page.locator('#stepsView .steps-ink [data-formula="e"]');
  await expect(hit).toHaveCount(1);
  await hit.click();
  const pop = page.locator('#stepsView .steps-pop');
  await expect(pop).toBeVisible();
  await expect(pop).toContainText('Wzór na liczbę e');
  await expect(page.locator('#stepsView .steps-formula-sr')).toHaveAttribute('aria-expanded', 'true');

  await pop.getByRole('button', { name: 'Więcej' }).click();
  await expect(page.locator('#stepsView .steps-more')).toBeVisible();
  await expect(page.locator('.steps-back')).toBeFocused();
  await page.locator('.steps-back').click();
  await expect(steps).toHaveCount(4);
  await expect(pop).toBeVisible(); // wracamy do tego samego miejsca, dymek dalej otwarty

  await hit.click(); // drugie stuknięcie zamyka
  await expect(pop).toHaveCount(0);
});

test('klawiatura: Tab do wzoru, Enter otwiera dymek', async ({ page }) => {
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_TEX && !!window.MATM0_FORMULAS);
  await page.locator('#calcExpr').fill('lim n→∞ (1 + 1/n)^n');
  await page.locator('#calcExplainTip').click();
  const btn = page.locator('#stepsView .steps-formula-sr');
  await btn.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#stepsView .steps-pop')).toBeVisible();
});
