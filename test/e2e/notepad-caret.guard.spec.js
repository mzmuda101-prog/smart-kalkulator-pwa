// [EN] Strażnik samych helperów, nie apki.
//
// Historia: notepad-caret.spec.js był flaky TYLKO przy pełnym `npm run test:e2e` —
// za każdym razem inny test i inny projekt, przebiegi kończyły się po 1.5 min / 3.0 min
// (czyli dokładnie timeout testu i timeout + afterEach) BEZ żadnej diagnozy.
// Przyczyna: helpery czekały bez limitu — `locator.click()` bez `actionTimeout`
// i `page.evaluate(new Promise(r => requestAnimationFrame(r)))`, które nie ma timeoutu
// w ogóle. Każda zadyszka strony zamieniała się w zawis, a nie w błąd.
//
// Te dwa testy pilnują, że tak już nie jest: zatrzymany kompozytor i zasłonięty
// przycisk muszą polec SZYBKO i z nazwą przyczyny.
const { test, expect } = require('playwright/test');
const NP = require('./notepad-caret.helpers.js');

// Meta-test — wystarczy jeden projekt, w pozostałych tylko kosztowałby czas.
// (Modyfikator plikowy `test.skip(fn)` nie dostaje testInfo — stąd skip w beforeEach.)
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'meta-test helperów — tylko desktop');
});

test('zatrzymany rAF → waitFrames pada w kilka sekund z diagnozą (nie zawisa)', async ({ page }) => {
  await NP.waitAppReady(page);
  await NP.openNotepad(page);

  // Symulacja zamrożonego kompozytora: rAF przestaje wołać callbacki.
  await page.evaluate(() => { window.requestAnimationFrame = function () { return 0; }; });

  const t0 = Date.now();
  const err = await NP.waitFrames(page, 2, 'test-stall').then(() => null, (e) => e);
  const dt = Date.now() - t0;

  expect(err, 'waitFrames powinien rzucić, a nie wisieć').toBeTruthy();
  expect(err.message).toContain('brak 2 klatek rAF');
  expect(err.message, 'diagnoza ma odróżniać stojące rAF od zablokowanego wątku').toMatch(/timery: \d+ tyknięć/);
  expect(dt, `padło po ${dt} ms — musi zmieścić się grubo poniżej timeoutu testu`).toBeLessThan(20_000);
});

test('zasłonięty przycisk → openNotepad nazywa winowajcę (nie zawisa na click)', async ({ page }) => {
  await NP.waitAppReady(page);
  // Nakładka jak splash, który nie zdążył zniknąć: przezroczysta, ale łapie kliknięcia.
  await page.evaluate(() => {
    const veil = document.createElement('div');
    veil.id = 'e2eVeil';
    veil.style.cssText = 'position:fixed;inset:0;z-index:99999;opacity:0;';
    document.body.appendChild(veil);
  });

  const t0 = Date.now();
  const err = await NP.openNotepad(page).then(() => null, (e) => e);
  const dt = Date.now() - t0;

  expect(err, 'openNotepad powinien rzucić, a nie wisieć').toBeTruthy();
  expect(err.message).toContain('#notepadBtn jest zasłonięty przez');
  expect(err.message).toContain('e2eVeil');
  expect(dt, `padło po ${dt} ms`).toBeLessThan(30_000);
});
