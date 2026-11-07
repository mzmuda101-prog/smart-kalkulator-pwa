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

  const bounds = await page.evaluate(() => {
    const toast = document.getElementById('toast').getBoundingClientRect();
    const nav = document.getElementById('bottomNav').getBoundingClientRect();
    return { toastBottom: toast.bottom, navTop: nav.top };
  });
  expect(bounds.toastBottom).toBeLessThanOrEqual(bounds.navTop - 12);
});
