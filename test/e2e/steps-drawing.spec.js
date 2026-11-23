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

  // „dlaczego” pod każdym krokiem poza „Wynik” (plan kroków 3c), wzory w zdaniu narysowane
  await expect(page.locator('#stepsView .steps-why')).toHaveCount(3);
  await expect(page.locator('#stepsView .steps-item').first().locator('.steps-why')).toContainText('zbliża się do 1');
  await expect(page.locator('#stepsView .steps-why .steps-tex .ML__latex, #stepsView .steps-why .steps-tex .ML__base').first()).toBeAttached();
  await expect(page.locator('#stepsView .steps-item.is-final .steps-why')).toHaveCount(0);

  const hit = page.locator('#stepsView .steps-ink [data-formula="e"]');
  await expect(hit).toHaveCount(1);
  await hit.click();
  const pop = page.locator('#stepsView .steps-pop');
  await expect(pop).toBeVisible();
  await expect(pop).toContainText('Wzór na liczbę e');
  await expect(page.locator('#stepsView .steps-formula-sr[data-formula="e"]')).toHaveAttribute('aria-expanded', 'true');

  await pop.getByRole('button', { name: 'Więcej' }).click(); // „Więcej” = to samo hasło w podręczniku
  await expect(page.locator('#panel-podrecznik')).toBeVisible();
  await expect(page.locator('#hbView h2')).toHaveText('Wzór na liczbę e');
  await expect(page.locator('#hbView .hb-back')).toBeFocused();
  await expect(page.locator('#hbView .hb-back')).toContainText('Wróć do kroków');
  await page.locator('#hbView .hb-back').click();
  await expect(steps).toHaveCount(4);
  await expect(pop).toBeVisible(); // wracamy do tego samego miejsca, dymek dalej otwarty
  await expect(page.locator('#stepsView .steps-formula-sr[data-formula="e"]')).toBeFocused();

  await hit.click(); // drugie stuknięcie zamyka
  await expect(pop).toHaveCount(0);
});

test('„dlaczego” zależy od kroku obok: po sprzężeniu mówi o pierwiastkach', async ({ page }) => {
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_TEX && !!window.MATM0_WHY);
  await page.locator('#calcExpr').fill('lim x→5 (x-5)/(3-sqrt(x+4))');
  await page.locator('#calcExplainTip').click();
  const item = page.locator('#stepsView .steps-item', { has: page.locator('.steps-label', { hasText: 'Upraszczamy' }) });
  await expect(item.locator('.steps-why')).toContainText('pierwiastki się skasowały');
});

test('klawiatura: Tab do wzoru, Enter otwiera dymek', async ({ page }) => {
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_TEX && !!window.MATM0_FORMULAS);
  await page.locator('#calcExpr').fill('lim n→∞ (1 + 1/n)^n');
  await page.locator('#calcExplainTip').click();
  const btn = page.locator('#stepsView .steps-formula-sr[data-formula="e"]');
  await btn.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#stepsView .steps-pop')).toBeVisible();
});

test('sposoby: 0/0 — rozkład albo de l\'Hospital, przełącznik nad krokami', async ({ page }) => {
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_TEX && !!window.MATM0_FORMULAS);
  await page.locator('#calcExpr').fill('lim x→4 (x^2-6x+8)/(3x^2-10x-8)');
  await page.locator('#calcExplainTip').click();
  const ways = page.locator('#stepsView .steps-methods .settings-seg-btn');
  await expect(ways).toHaveText(['Rozkład na czynniki', "de l'Hospital"]);
  await expect(ways.first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#stepsView .steps-label').nth(1)).toContainText('Rozkładamy na czynniki');
  await ways.nth(1).click();
  await expect(page.locator('#stepsView .steps-label').nth(1)).toContainText("Reguła de l'Hospitala");
  await expect(ways.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(ways.nth(1)).toBeFocused();
  await expect(page.locator('#stepsView .steps-item.is-final')).toContainText('1');
  // jedno rozwiązanie — bez przełącznika
  await page.keyboard.press('Escape');
  await page.locator('#calcExpr').fill('lim n→∞ (2n+1)/(6n+5)');
  await page.locator('#calcExplainTip').click();
  await expect(page.locator('#stepsView .steps-item').first()).toBeVisible();
  await expect(page.locator('#stepsView .steps-methods')).toHaveCount(0);
});
