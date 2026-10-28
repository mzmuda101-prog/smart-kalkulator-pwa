// ============================================================
//  STRAŻNIK: wejście w Notatki z PUSTĄ notatką na telefonie.
//
//  Było (nagranie z iPhone'a, 2026-10-28): openNotepad fokusował pustą notatkę
//  z setTimeout(60). iOS przy takim fokusie (poza gestem) NIE wysuwa klawiatury,
//  ale _syncKbOpen włączał kb-open już od samego fokusu → znikał dolny pasek,
//  podpowiedź w polu i „Przykład: wyjazd”. Został pusty ekran bez wyjścia.
//
//  Niezmiennik: po wejściu w Notatki na dotyku pole NIE ma fokusu, kb-open nie
//  jest ustawione, dolny pasek i „Przykład: wyjazd” są widoczne; „Licz” wraca.
//
//  Uruchom:  npx playwright test notepad-empty-open --project=mobile
// ============================================================
const { test, expect } = require('playwright/test');
const NP = require('./notepad-caret.helpers.js');

test.describe.configure({ mode: 'serial' });

test('pusta notatka na telefonie: bez fokusu, pasek i „Przykład” widoczne', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'ekran Notatek z dolnym paskiem jest tylko na telefonie');
  await NP.waitAppReady(page);
  const notesTab = page.locator('#bottomNav [data-nav="notes"]');
  const calcTab = page.locator('#bottomNav [data-nav="calc"]');

  // Pusta notatka: „+” (nowa), potem wyjście do „Licz” i powrót — jak użytkownik.
  await notesTab.click();
  await page.locator('#npNewBtn').click();
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await page.waitForTimeout(120);
  await calcTab.click();
  await page.waitForFunction(() => !document.body.classList.contains('notepad-open'));

  await notesTab.click();
  await page.waitForSelector('body.notepad-open textarea.np-text', { state: 'visible' });
  await page.waitForTimeout(300); // dawny fokus szedł po 60 ms + animacja

  const st = await page.evaluate(() => {
    const ta = document.querySelector('textarea.np-text');
    return {
      value: ta.value,
      focused: document.activeElement === ta,
      kbOpen: document.body.classList.contains('kb-open'),
      placeholder: !!ta.getAttribute('placeholder'),
    };
  });
  expect(st.value, 'notatka ma być pusta').toBe('');
  expect(st.focused, 'pole nie może dostać fokusu samo').toBe(false);
  expect(st.kbOpen, 'bez klawiatury nie ma kb-open').toBe(false);
  expect(st.placeholder).toBe(true);
  await expect(page.locator('#bottomNav')).toBeVisible();
  await expect(page.locator('#npLearnExampleBtn')).toBeVisible();

  // Wyjście działa bez żadnych sztuczek (blur).
  await calcTab.click();
  await page.waitForFunction(() => !document.body.classList.contains('notepad-open'));
});
