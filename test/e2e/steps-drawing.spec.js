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
  await page.locator('#stepsView .steps-methods').getByRole('button', { name: 'Dorabianie jedynki' }).click(); // domyślnie najkrótszy: wzór skrócony
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

  await pop.getByRole('button', { name: /W podręczniku/ }).click(); // „Więcej” = to samo hasło w podręczniku
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
  await page.locator('#stepsView .steps-methods').getByRole('button', { name: 'Sprzężenie' }).click(); // domyślnie najkrótszy: de l'Hospital
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
  // domyślnie najkrótszy sposób (spec 2026-11-23-sposoby-design.md): tu de l'Hospital
  await expect(ways.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#stepsView .steps-label').nth(1)).toContainText("Reguła de l'Hospitala");
  await ways.first().click();
  await expect(page.locator('#stepsView .steps-label').nth(1)).toContainText('Dzielimy schematem Hornera');
  await expect(page.locator('#stepsView .steps-label').nth(2)).toContainText('Rozkładamy na czynniki');
  await expect(page.locator('#stepsView .steps-horner')).toHaveCount(2);
  await expect(ways.first()).toHaveAttribute('aria-pressed', 'true');
  await expect(ways.first()).toBeFocused();
  await expect(page.locator('#stepsView .steps-item.is-final')).toContainText('1');
  // jedno rozwiązanie — bez przełącznika
  await page.keyboard.press('Escape');
  await page.locator('#calcExpr').fill('lim x→2 (x+1)/(x+3)');
  await page.locator('#calcExplainTip').click();
  await expect(page.locator('#stepsView .steps-item').first()).toBeVisible();
  await expect(page.locator('#stepsView .steps-methods')).toHaveCount(0);
});

test('dymek: liczby z zadania, przycisk „W podręczniku”, Esc zamyka dymek, nie szufladę', async ({ page }) => {
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_TEX && !!window.MATM0_FORMULAS);
  await page.locator('#calcExpr').fill('rozwiąż 2x^2 - 10x + 12 = 0');
  await page.locator('#calcExplainTip').click();
  await page.locator('#stepsView .steps-ink [data-formula="delta"]').first().click();
  const pop = page.locator('#stepsView .steps-pop');
  await expect(pop.locator('.steps-pop-here')).toContainText('W tym zadaniu');
  await expect(pop.locator('.steps-pop-here .ML__latex, .steps-pop-here .ML__base').first()).toBeAttached(); // narysowane, nie tekst
  await expect(pop.locator('.steps-pop-here .steps-sr')).toHaveText('a = 2, b = −10, c = 12'); // czytnik ekranu: liczby jako tekst
  await expect(pop.getByRole('button', { name: /W podręczniku/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(pop).toHaveCount(0);
  await expect(page.locator('#commandHelpDrawer')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#stepsView .steps-formula-sr[data-formula="delta"]').first()).toBeFocused();
});

test('sposoby: domyślnie najkrótszy (1^∞ → wzór skrócony, układ → przeciwne współczynniki), drugi w przełączniku', async ({ page }) => {
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_TEX);
  const open = async (q) => {
    await page.locator('#calcExpr').fill(q);
    await page.locator('#calcExplainTip').click();
    await expect(page.locator('#stepsView .steps-methods')).toBeVisible();
  };
  await open('lim n→∞ ((3n^2+4n+1)/(3n^2-2n+5))^(4n+3)');
  await expect(page.locator('#stepsView .steps-methods .active')).toHaveText('Wzór skrócony');
  await expect(page.locator('#stepsView .steps-label', { hasText: 'Liczę wykładnik ze wzoru skróconego' })).toHaveCount(1);
  await page.locator('#stepsView .steps-methods').getByRole('button', { name: 'Dorabianie jedynki' }).click();
  await expect(page.locator('#stepsView .steps-label', { hasText: 'Dorabiamy jedynkę' })).toHaveCount(1);
  await page.keyboard.press('Escape');
  await open('rozwiąż 2x + y = 7, x - y = 2');
  await expect(page.locator('#stepsView .steps-methods .active')).toHaveText('Przeciwne współczynniki');
});

test('schemat Hornera: tabelka pod krokiem (współczynniki, iloczyny po skosie, sumy), suma i iloczyn domyślnie', async ({ page }) => {
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_TEX);
  await page.locator('#calcExpr').fill('rozwiąż x^3 - 6x^2 + 11x - 6 = 0');
  await page.locator('#calcExplainTip').click();
  const t = page.locator('#stepsView .steps-horner');
  await expect(t).toHaveCount(1);
  await expect(t).toHaveAttribute('aria-label', /Schemat Hornera/);
  const rows = t.locator('tr');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0).locator('td')).toHaveText(['', '1', '−6', '11', '−6']);
  await expect(rows.nth(1).locator('td')).toHaveText(['1', '', '1', '−5', '6']);
  await expect(rows.nth(2).locator('td')).toHaveText(['', '1', '−5', '6', '0']);
  await expect(rows.nth(1).locator('svg')).toHaveCount(3); // strzałka po skosie przy każdym iloczynie
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over).toBeLessThanOrEqual(0);
  await page.keyboard.press('Escape');
  await page.locator('#calcExpr').fill('rozwiąż x^2 - 5x + 6 = 0');
  await page.locator('#calcExplainTip').click();
  await expect(page.locator('#stepsView .steps-methods .active')).toHaveText('Suma i iloczyn');
});

test('schemat Hornera stopnia 5 na wąskim ekranie: tabelka przewija się w swoim pudełku, strona nie', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_TEX);
  await page.locator('#calcExpr').fill('rozwiąż x^5-15x^4+85x^3-225x^2+274x-120=0');
  await page.locator('#calcExplainTip').click();
  const box = page.locator('#stepsView .steps-horner-wrap').first();
  await expect(box).toBeVisible();
  const r = await box.evaluate((el) => ({ ox: getComputedStyle(el).overflowX, fits: el.getBoundingClientRect().right <= el.closest('.steps-item').getBoundingClientRect().right + 0.5, scrolls: el.scrollWidth > el.clientWidth }));
  expect(r.ox).toBe('auto');
  expect(r.fits).toBe(true); // tabelka nie wychodzi poza kartę, przewija się w swoim pudełku
  expect(r.scrolls).toBe(true); // shortcut: długi zapis dzielenia nad tabelką wciąż rozpycha kartę — etap 4 (długie wzory)
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over).toBeLessThanOrEqual(0);
  await expect(page.locator('#stepsView .steps-horner-name').first()).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#stepsView .steps-horner').first()).toHaveAttribute('aria-label', /iloraz .*; reszta 0/);
});

test('granica 0/0: dwie tabelki Hornera z podpisami, mieszczą się na 360 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_TEX);
  await page.locator('#calcExpr').fill('lim x→2 (x^4-13x^2+36)/(x^3-2x^2+x-2)');
  await page.locator('#calcExplainTip').click();
  await page.locator('#stepsView .steps-methods .settings-seg-btn', { hasText: 'Rozkład na czynniki' }).click(); // domyślnie najkrótszy sposób
  await expect(page.locator('#stepsView .steps-horner')).toHaveCount(2);
  await expect(page.locator('#stepsView .steps-horner-name')).toHaveText(['Licznik', 'Mianownik']);
  await expect(page.locator('#stepsView .steps-horner').first()).toHaveAttribute('aria-label', /^Licznik: Schemat Hornera dla r = 2/);
  const fits = await page.locator('#stepsView .steps-horner-wrap').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().right <= el.closest('.steps-item').getBoundingClientRect().right + 0.5));
  expect(fits).toEqual([true, true]);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over).toBeLessThanOrEqual(0);
});
