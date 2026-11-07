// ============================================================
//  QoL — motyw systemowy (K4) i „Cofnij” w dymku po usunięciu (K6/K7).
// ============================================================
const { test, expect } = require('playwright/test');
const NP = require('./notepad-caret.helpers.js');

// Na desktopie historia jest zadokowana obok kalkulatora — przycisk bywa ukryty.
async function openHistory(page) {
  const btn = page.locator('#openHistory');
  if (await btn.isVisible().catch(() => false)) await btn.click();
}

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'kontrakt logiki — jeden przebieg wystarcza');
});

test('motyw: Systemowy usuwa ręczny wybór i znów śledzi system', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await NP.waitAppReady(page);
  await page.locator('#themeToggleBtn').click(); // ciemny → ręcznie jasny
  expect(await page.evaluate(() => localStorage.getItem('matm0_theme'))).toBe('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingTheme [data-val="light"]')).toHaveClass(/active/);
  await page.locator('#settingTheme [data-val="auto"]').click();
  expect(await page.evaluate(() => localStorage.getItem('matm0_theme'))).toBeNull();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#settingTheme [data-val="auto"]')).toHaveClass(/active/);

  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('historia: Wyczyść → Cofnij przywraca wpisy, pusta lista = przycisk nieaktywny', async ({ page }) => {
  await NP.waitAppReady(page);
  for (const expr of ['1 + 1', '2 + 2']) {
    await page.locator('#calcExpr').fill(expr);
    await page.locator('#calcExpr').press('Enter');
  }
  await openHistory(page);
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('matm0_calc_history')).length);
  expect(before).toBeGreaterThanOrEqual(2);

  await page.locator('#clearHistory').click();
  await expect(page.locator('#clearHistory')).toBeDisabled();
  await page.locator('#toast.show .toast-action').click();
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('matm0_calc_history')).length);
  expect(after).toBe(before);
  await expect(page.locator('#clearHistory')).toBeEnabled();
});

test('historia: usunięty wpis wraca na swoje miejsce po Cofnij', async ({ page }) => {
  await NP.waitAppReady(page);
  for (const expr of ['3 + 3', '4 + 4', '5 + 5']) {
    await page.locator('#calcExpr').fill(expr);
    await page.locator('#calcExpr').press('Enter');
  }
  await openHistory(page);
  const exprs = () => page.evaluate(() =>
    JSON.parse(localStorage.getItem('matm0_calc_history')).map((it) => it.text));
  const original = await exprs();
  // Potwierdzenie usunięcia siedzi pod warstwą swipe — wywołujemy je bezpośrednio.
  await page.evaluate(() => document.querySelectorAll('.history-item .history-confirm-btn.yes')[1].click());
  expect((await exprs()).length).toBe(original.length - 1);
  await page.locator('#toast.show .toast-action').click();
  expect(await exprs()).toEqual(original);
});

test('notatnik: usunięcie jedynej notatki → Cofnij przywraca ją bez pustej zastępczej', async ({ page }) => {
  await NP.waitAppReady(page);
  await NP.openNotepad(page);
  await NP.setNotepadText(page, 'Notatka do przywrócenia: 2 + 2');
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.locator('#npListBtn').click();
  await page.evaluate(() => document.querySelector('.np-note-item .history-confirm-btn.yes').click());
  await page.locator('#toast.show .toast-action').click();

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('matm0_notepads')));
  expect(saved.notes.length).toBe(1);
  const current = saved.notes.find((n) => n.id === saved.currentId);
  expect(current && current.text).toBe('Notatka do przywrócenia: 2 + 2');
});

// ── K8 — AC/Esc nie kasują bezpowrotnie wpisanego działania ──
const LONG_EXPR = '1250 zł + 23% vat - 120 zł';

test('pole: Esc czyści, a ⌘/Ctrl+Z przywraca tekst', async ({ page }) => {
  await NP.waitAppReady(page);
  const field = page.locator('#calcExpr');
  await field.click();
  await page.keyboard.type(LONG_EXPR);
  await page.keyboard.press('Escape');
  await expect(field).toHaveValue('');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(field).toHaveValue(LONG_EXPR);
});

test('pad: AC przy dłuższym działaniu → Cofnij w dymku, krótkie czyści po cichu', async ({ page }) => {
  await NP.waitAppReady(page);
  const field = page.locator('#calcExpr');
  const setUnfocused = (v) => page.evaluate((val) => {
    const el = document.getElementById('calcExpr');
    el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.blur();
  }, v);
  const ac = page.locator('#calcGrid [data-action="AC"]');

  await setUnfocused(LONG_EXPR);
  await ac.click();
  await expect(field).toHaveValue('');
  await page.locator('#toast.show .toast-action').click();
  await expect(field).toHaveValue(LONG_EXPR);

  await setUnfocused('2 + 2');
  await page.evaluate(() => document.getElementById('toast').classList.remove('show'));
  await ac.click();
  await expect(field).toHaveValue('');
  await expect(page.locator('#toast.show')).toHaveCount(0);
});

// ── K9 — ↑/↓ przeglądają historię jak w terminalu ──
test('pole: ↑/↓ przywołują poprzednie działania i wracają do szkicu', async ({ page }) => {
  await NP.waitAppReady(page);
  const field = page.locator('#calcExpr');
  for (const expr of ['7 + 1', '9 + 1']) {
    await field.fill(expr);
    await field.press('Enter');
  }
  await field.press('Escape');
  await page.keyboard.type('12');
  await field.press('ArrowUp');
  await expect(field).toHaveValue('9 + 1');
  await field.press('ArrowUp');
  await expect(field).toHaveValue('7 + 1');
  await field.press('ArrowDown');
  await expect(field).toHaveValue('9 + 1');
  await field.press('ArrowDown');
  await expect(field).toHaveValue('12');
});
