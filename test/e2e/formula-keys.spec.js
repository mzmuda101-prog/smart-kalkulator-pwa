// ============================================================
//  KLAWIATURA „WZORY” (plan 2026-11-22, etap 2b): przełącznik, wpisywanie, przytrzymanie, karta „Funkcje”.
// ============================================================
const { test, expect } = require('playwright/test');

test.use({ serviceWorkers: 'block' });

const key = (page, label) => page.locator('#calcGrid .calc-btn', {
  has: page.locator('.calc-btn-label', { hasText: new RegExp('^' + label.replace(/[()^$+*?.|\\[\]{}]/g, '\\$&') + '$') }),
}).first();
const toggle = (page) => page.locator('.calc-keys-toggle:visible').first();
async function open(page) {
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_FKEYS && !!document.querySelector('.calc-keys-toggle'));
}
const gridBox = (page) => page.evaluate(() => { const r = document.getElementById('calcGrid').getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)]; });

test('przełącznik: Wzory ↔ Liczby, ta sama wysokość, wybór zapamiętany', async ({ page }) => {
  await open(page);
  await expect.poll(async () => { const a = await gridBox(page); await page.waitForTimeout(150); return JSON.stringify(a) === JSON.stringify(await gridBox(page)); }).toBe(true); // strona się ułożyła
  const before = await gridBox(page);
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(key(page, 'lim')).toBeVisible();
  expect(await gridBox(page)).toEqual(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(key(page, 'lim')).toBeVisible(); // ustawienie przeżyło odświeżenie
  await toggle(page).click();
  await expect(key(page, 'lim')).toHaveCount(0);
  await expect(page.locator('#calcGrid .calc-btn[data-action="%"]')).toBeVisible(); // wraca zwykła klawiatura
});

test('wzór samymi klawiszami: lim n→∞ (2n+1)/(6n+5) = 1/3', async ({ page }) => {
  await open(page);
  await toggle(page).click();
  for (const l of ['lim', '( )', '2', 'n', '+', '1', 'a/b', '6', 'n', '+', '5', '( )']) await key(page, l).click();
  await expect(page.locator('#calcExpr')).toHaveValue('lim n→∞ (2n+1)/(6n+5)');
  await expect(page.locator('#calcResult')).toHaveText('1/3');
});

test('przytrzymanie: przesunięcie na wariant wstawia go; puszczenie bez wyboru zostawia dymek do stuknięcia', async ({ page }) => {
  await open(page);
  await toggle(page).click();
  const sq = await key(page, '√').boundingBox();
  await page.mouse.move(sq.x + sq.width / 2, sq.y + sq.height / 2);
  await page.mouse.down();
  await expect(page.locator('.calc-alt-pop')).toBeVisible();
  const cube = await page.locator('.calc-alt-opt', { hasText: '∛' }).boundingBox();
  await page.mouse.move(cube.x + cube.width / 2, cube.y + cube.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect(page.locator('#calcExpr')).toHaveValue('∛(');
  await expect(page.locator('.calc-alt-pop')).toHaveCount(0);
  // krótkie stuknięcie klawisza z wariantami = główny znak
  await key(page, '√').click();
  await expect(page.locator('#calcExpr')).toHaveValue('∛(sqrt(');
  // przytrzymanie i puszczenie w miejscu: dymek zostaje, wariant da się stuknąć
  const x = await key(page, 'x').boundingBox();
  await page.mouse.move(x.x + x.width / 2, x.y + x.height / 2);
  await page.mouse.down(); await page.waitForTimeout(500); await page.mouse.up();
  await expect(page.locator('.calc-alt-pop')).toBeVisible();
  await page.locator('.calc-alt-opt', { hasText: /^t$/ }).click();
  await expect(page.locator('#calcExpr')).toHaveValue('∛(sqrt(t');
  await expect(page.locator('.calc-alt-pop')).toHaveCount(0);
});

test('znaczki w rogach, karta „Funkcje”, powrót „123”, klawiatura fizyczna', async ({ page }) => {
  await open(page);
  await toggle(page).click();
  await expect(key(page, 'x').locator('.calc-btn-alt--tl')).toHaveText('y');
  await expect(key(page, 'x').locator('.calc-btn-alt--tr')).toHaveText('t');
  await expect(key(page, 'lim').locator('.calc-btn-alt--tr')).toHaveText('⋯');
  await expect(key(page, 'x')).toHaveAttribute('aria-label', /przytrzymaj: y, t/);
  await key(page, 'f(x)').click();
  await expect(key(page, 'arcsin')).toBeVisible();
  await key(page, '123').click(); // powrót na kartę wzorów
  await expect(key(page, 'lim')).toBeVisible();
  await key(page, 'f(x)').click();
  await key(page, 'tg').focus();
  await page.keyboard.press('Enter'); // Enter na klawiszu = stuknięcie
  await expect(page.locator('#calcExpr')).toHaveValue('tg(');
});

test('tryb „Zdanie” chowa przełącznik', async ({ page }) => {
  await open(page);
  await page.evaluate(() => document.querySelector('.calc-layout-toggle').click());
  await expect(page.locator('.calc-keys-toggle:visible')).toHaveCount(0);
});
