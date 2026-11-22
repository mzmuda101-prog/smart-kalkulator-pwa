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

const geoOf = (page) => page.evaluate(() => {
  const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return [Math.round(b.top), Math.round(b.height)]; };
  return { disp: r('.card .calc-display'), grid: r('#calcGrid'), wrap: document.querySelector('.card .calc-display').classList.contains('calc-result-wrap'), sw: document.documentElement.scrollWidth, iw: innerWidth };
});
const setRoom = (page, on) => page.evaluate((v) => { const el = document.getElementById('settingCalcFormulaRoom'); el.checked = v; el.dispatchEvent(new Event('change')); }, on);
const roomMax = (page) => page.evaluate(() => innerWidth >= 640 || innerHeight < 700 ? 0 : innerHeight >= 780 ? 56 : 40);
// wzorzec układu: ten sam zapis bez rysunku
async function bezRysunku(page, q) {
  await setRoom(page, false); // tryb „dopasuj” — „zawsze” jest domyślne od v1.05.10
  await type(page, q);
  await page.evaluate(() => { window.MATM0_TEX = null; });
  await type(page, q + ' ');
  await page.waitForTimeout(400);
  const g = await geoOf(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_TEX);
  await setRoom(page, false);
  return g;
}

test('płaski wzór nie zmienia układu: wynik bez zawijania, klawisze w miejscu', async ({ page }) => {
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_TEX);
  const q = 'lim n→∞ (2n+1)/(6n+5)';
  const bez = await bezRysunku(page, q);
  await type(page, q + ' ');
  await expect(formula(page)).toBeVisible();
  await page.waitForTimeout(600);
  const z = await geoOf(page);
  expect(z.wrap).toBe(false);
  expect(z.disp).toEqual(bez.disp);
  expect(z.grid).toEqual(bez.grid);
  expect(z.sw).toBeLessThanOrEqual(z.iw);
});

test('wysoki wzór: okienko rośnie najwyżej o 56 px, klawisze oddają miejsce, rysunek bez zmniejszania', async ({ page }) => {
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_TEX);
  if (await roomMax(page) === 0) test.skip(); // tablet, komputer, niski telefon — bez dopłaty miejsca
  const q = 'lim n→∞ ((5n+7)/(5n-8))^n';
  const bez = await bezRysunku(page, q);
  await type(page, q + ' ');
  await expect(formula(page)).toBeVisible();
  await page.waitForTimeout(600); // płynne rośnięcie 200 ms + układ
  const z = await geoOf(page);
  const grow = z.disp[1] - bez.disp[1];
  expect(grow).toBeGreaterThan(0);
  expect(grow).toBeLessThanOrEqual(await roomMax(page));
  expect(z.grid[0] + z.grid[1]).toBe(bez.grid[0] + bez.grid[1]); // dół klawiatury w miejscu — klawisze tylko niższe
  expect(z.wrap).toBe(false);
  expect(z.sw).toBeLessThanOrEqual(z.iw);
  await expect(page.locator('#calcResult')).toHaveText('e³');
  const scale = await page.locator('.calc-formula-ink').evaluate(el => +getComputedStyle(el).getPropertyValue('--fx-scale'));
  if (await page.evaluate(() => innerWidth < 640)) expect(scale).toBeGreaterThanOrEqual(0.95); // próg 4 px przeciw bujaniu okienka
  // rysunek kończy się przed wynikiem i „Kroki”
  const [f, tip] = await Promise.all([formula(page).boundingBox(), page.locator('#calcExplainTip').boundingBox()]);
  expect(f.x + f.width).toBeLessThanOrEqual(tip.x);
  // wzór usunięty → okienko wraca
  await type(page, '2+2');
  await page.waitForTimeout(600);
  expect((await geoOf(page)).disp[1]).toBe(bez.disp[1]);
});

test('ustawienie „Zawsze więcej miejsca na wzór” (domyślnie włączone): okienko stale wyższe', async ({ page }) => {
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_TEX);
  await type(page, '2+2');
  await page.waitForTimeout(600);
  const z = await geoOf(page);
  await setRoom(page, false);
  await page.waitForTimeout(600);
  const bez = await geoOf(page);
  expect(z.disp[1] - bez.disp[1]).toBe(await roomMax(page));
  expect(z.wrap).toBe(false);
  await setRoom(page, true);
  await page.waitForTimeout(600);
  expect((await geoOf(page)).disp[1]).toBe(z.disp[1]);
});

test('pusty ekran z miejscem na wzór: przykłady w dwóch rzędach, nic nie ucięte', async ({ page }) => {
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  if (await page.evaluate(() => innerWidth >= 1024)) test.skip(); // komputer ma panel „Spróbuj”
  if (await roomMax(page) < 40) test.skip(); // niski ekran: mało miejsca, jeden przewijany rząd (jak dawniej)
  await type(page, '');
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    const st = document.querySelector('#calcStart'), b = st.getBoundingClientRect();
    const chips = [...st.querySelectorAll('.calc-start-chip')].map(c => c.getBoundingClientRect()).filter(c => c.top < b.bottom - 0.5);
    return { rows: new Set(chips.map(c => Math.round(c.top))).size, cut: chips.filter(c => c.bottom > b.bottom + 0.5 || c.right > b.right + 0.5).length };
  });
  expect(r.rows).toBe(2);
  expect(r.cut).toBe(0);
});
