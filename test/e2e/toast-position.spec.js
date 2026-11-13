// ============================================================
//  DYMKI NA TELEFONIE — nie mogą zasłaniać dolnej nawigacji.
// ============================================================
const { test, expect } = require('playwright/test');
const NP = require('./notepad-caret.helpers.js');

test('dymek kopiowania mieści się nad dolnym paskiem', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'kontrakt dotyczy dolnej nawigacji telefonu');
  await NP.waitAppReady(page);
  await page.locator('#calcExpr').fill('2 + 2');
  await page.locator('#calcExpr').press('Enter');
  // Na telefonie przycisk „Kopiuj” nie jest stale widoczny — ten sam toast
  // uruchamia zwykłe stuknięcie wyniku.
  await page.locator('#calcResult').click();
  await page.waitForSelector('#toast.show');

  // Mierzymy po wysunięciu: w trakcie animacji dymek jest jeszcze niżej.
  const gap = () => page.evaluate(() => {
    const toast = document.getElementById('toast').getBoundingClientRect();
    const nav = document.getElementById('bottomNav').getBoundingClientRect();
    return Math.round(nav.top - toast.bottom);
  });
  // 16 px nad paskiem — nie mniej (zasłania), ale też nie ~116 (stary błąd pomiaru).
  await expect.poll(gap).toBeGreaterThanOrEqual(12);
  expect(await gap()).toBeLessThanOrEqual(24);
});

// Regresja z iPhone'a: pomiar pozycji przy schowanym dymku liczył też translateY
// chowania, więc pusty dymek stawał nad paskiem jako czarna pigułka.
test('schowany dymek jest niewidoczny po zmianie rozmiaru okna', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'kontrakt dotyczy dolnej nawigacji telefonu');
  await NP.waitAppReady(page);
  const vp = page.viewportSize();
  await page.setViewportSize({ width: vp.width, height: vp.height - 40 });
  await page.waitForTimeout(100);
  const st = await page.evaluate(() => {
    const t = document.getElementById('toast');
    return { visibility: getComputedStyle(t).visibility, top: t.getBoundingClientRect().top,
             navTop: document.getElementById('bottomNav').getBoundingClientRect().top };
  });
  expect(st.visibility).toBe('hidden');
  expect(st.top).toBeGreaterThan(st.navTop);
});
