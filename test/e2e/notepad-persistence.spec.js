// ============================================================
//  NOTATNIK — zapis bez czekania na debounce przy opuszczeniu strony.
// ============================================================
const { test, expect } = require('playwright/test');
const NP = require('./notepad-caret.helpers.js');

test('pagehide zapisuje ostatnią zmianę notatnika od razu', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'jeden przebieg wystarcza do kontraktu zapisu');
  await NP.waitAppReady(page);
  await NP.openNotepad(page);
  await NP.setNotepadText(page, 'Zapis przed zamknięciem: 2x 45 eur');

  const saved = await page.evaluate(() => {
    localStorage.removeItem('matm0_notepads');
    window.dispatchEvent(new Event('pagehide'));
    return JSON.parse(localStorage.getItem('matm0_notepads'));
  });

  const current = saved.notes.find((note) => note.id === saved.currentId);
  expect(current && current.text).toBe('Zapis przed zamknięciem: 2x 45 eur');
});
