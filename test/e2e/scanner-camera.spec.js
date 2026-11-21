// Aparat na żywo w oknie skanera (js/scanner.js). Osobny plik: fałszywa kamera Chromium wymaga launchOptions na poziomie pliku.
const { test, expect } = require('playwright/test');
const fs = require('fs'), path = require('path');
const FRAC_EXPR = 'lim n→∞ (2n+1)/(6n+5)';
const fixtureBuf = (name) => fs.readFileSync(path.join(__dirname, '../fixtures/formulas', name + '.png'));
async function openScanner(page) {
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_OCR && !!window.loadScanner);
  await page.getByRole('button', { name: 'Odczytaj wzór ze zdjęcia' }).click();
  return { dlg: page.locator('dialog.scanner-dialog') };
}

// ============================================================
//  Aparat na żywo: fałszywa kamera Chromium gra frac.y4m (frac.png na białym tle 640x360)
// ============================================================
const Y4M = path.resolve(__dirname, '../fixtures/formulas/frac.y4m');
// Ramka obejmująca cały wzór w klatce 640x360 (ułamki klatki: wzór 376x172 na środku).
const FRAME_ON_FORMULA = [0.19, 0.24, 0.62, 0.52];

test.use({
  serviceWorkers: 'block',
  // launchOptions nie wolno ustawić w describe (wymusza nowy worker), dlatego osobny plik
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${Y4M}`] },
});
test.describe('aparat na żywo', () => {
  test.beforeEach(async ({ page }) => {
    // zapisuje każdy strumień, żeby sprawdzić, że ścieżki naprawdę stoją
    await page.addInitScript(() => {
      const md = navigator.mediaDevices, orig = md.getUserMedia.bind(md);
      window.__streams = [];
      md.getUserMedia = async (c) => { const s = await orig(c); window.__streams.push(s); return s; };
    });
  });
  const live = (page) => page.evaluate(() => window.__streams.flatMap((s) => s.getTracks()).filter((t) => t.readyState === 'live').length);
  async function openCamera(page) {
    const o = await openScanner(page);
    await expect(page.getByRole('button', { name: 'Zrób', exact: true })).toBeEnabled();
    return o;
  }

  test('podgląd gra, ramka jest na scenie, ścieżka żywa; Escape zatrzymuje ścieżki', async ({ page }) => {
    const { dlg } = await openCamera(page);
    const v = page.locator('.scanner-stage video');
    await expect(v).toBeVisible();
    await expect.poll(() => v.evaluate((e) => e.readyState >= 2 && !e.paused && e.videoWidth)).toBe(640);
    expect(await live(page)).toBe(1);
    const stage = await page.locator('.scanner-stage').boundingBox(), f = await page.locator('.scanner-frame').boundingBox();
    expect(f.x).toBeGreaterThanOrEqual(stage.x); expect(f.x + f.width).toBeLessThanOrEqual(stage.x + stage.width + 1);
    expect(f.y).toBeGreaterThanOrEqual(stage.y); expect(f.y + f.height).toBeLessThanOrEqual(stage.y + stage.height + 1);
    expect(Math.abs(f.width / stage.width - 0.8)).toBeLessThan(0.02);
    expect(Math.abs(f.height / stage.height - 0.25)).toBeLessThan(0.02);
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();
    expect(await live(page)).toBe(0);
  });

  test('„Zrób”: ścieżki stoją przed odczytem, wycinek ma proporcje ramki mimo przycięcia cover', async ({ page }) => {
    await openCamera(page);
    await page.evaluate(() => {
      window.__seen = null;
      MATM0_OCR.read = async (img) => { window.__seen = { w: img.width, h: img.height, live: window.__streams.flatMap((s) => s.getTracks()).filter((t) => t.readyState === 'live').length }; return { latex: '', expr: '', ms: 1 }; };
    });
    const f = await page.locator('.scanner-frame').boundingBox();
    await page.getByRole('button', { name: 'Zrób', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.__seen)).not.toBeNull();
    const seen = await page.evaluate(() => window.__seen);
    expect(seen.live).toBe(0);
    expect(Math.abs(seen.w / seen.h / (f.width / f.height) - 1)).toBeLessThan(0.03);
    // odczyt nic nie dał: okno zostaje na zrobionym zdjęciu, można zrobić ponownie
    await expect(page.locator('.scanner-error')).toBeVisible();
    await expect(page.locator('.scanner-stage video')).toBeHidden();
    await page.getByRole('button', { name: 'Zrób ponownie' }).click();
    await expect(page.getByRole('button', { name: 'Zrób', exact: true })).toBeEnabled();
    expect(await live(page)).toBe(1);
  });

  test('„Zrób” na rozmazanym kadrze: podpowiedź, ale odczyt i tak leci', async ({ page }) => {
    await openCamera(page);
    await page.evaluate(() => {
      MATM0_FIMG.blurScore = () => 1;
      window.__read = 0; MATM0_OCR.read = async () => { window.__read++; return { latex: '', expr: '1+1', ms: 1 }; };
    });
    await page.getByRole('button', { name: 'Zrób', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.__read)).toBe(1);
    await expect(page.locator('#calcExpr')).toHaveValue('1+1');
  });

  test('za ciemno: podpowiedź w pasku, znika po rozjaśnieniu', async ({ page }) => {
    await page.addInitScript(() => {
      const g = CanvasRenderingContext2D.prototype.getImageData;
      window.__dark = true;
      CanvasRenderingContext2D.prototype.getImageData = function (x, y, w, h) {
        if (w === 64 && h === 36 && window.__dark) { const d = new ImageData(w, h); for (let i = 3; i < d.data.length; i += 4) d.data[i] = 255; return d; }
        return g.call(this, x, y, w, h);
      };
    });
    await openCamera(page);
    const hint = page.locator('.scanner-hint');
    await expect(hint).toHaveText('Za ciemno — włącz światło');
    await expect(hint).toHaveAttribute('aria-live', 'polite');
    await page.evaluate(() => { window.__dark = false; });
    await expect(hint).toBeHidden();
  });

  test('visibilitychange: ukryta karta zatrzymuje ścieżki, powrót wznawia jeden strumień', async ({ page }) => {
    await openCamera(page);
    const vis = (s) => page.evaluate((s) => { Object.defineProperty(document, 'visibilityState', { get: () => s, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, s);
    await vis('hidden');
    await expect.poll(() => live(page)).toBe(0);
    await vis('visible');
    await expect(page.getByRole('button', { name: 'Zrób', exact: true })).toBeEnabled();
    expect(await live(page)).toBe(1);
  });

  test('odczyt frac z kamery: wartość trafia do pola, ścieżki zatrzymane', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'model testujemy raz');
    test.setTimeout(180_000);
    const { dlg } = await openCamera(page);
    await page.evaluate((f) => MATM0_SCANNER._setFrame(...f), FRAME_ON_FORMULA);
    await page.getByRole('button', { name: 'Zrób', exact: true }).click();
    await page.locator('dialog.model-dialog').getByRole('button', { name: 'Pobierz' }).click();
    await expect(dlg).toBeHidden({ timeout: 90_000 });
    await expect(page.locator('#calcExpr')).toHaveValue(FRAC_EXPR);
    expect(await live(page)).toBe(0);
  });

  test('odmowa dostępu: widok zapasowy w czasie krótszym niż 2 s, przycisk otwiera wybór pliku', async ({ page }) => {
    // Nadpisanie getUserMedia (NotAllowedError) jest deterministyczne; flagi Chromium i uprawnienia kontekstu zachowują się różnie w trybie headless.
    await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('x', 'NotAllowedError')); });
    await page.goto('index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.loadScanner);
    const t0 = Date.now();
    await page.getByRole('button', { name: 'Odczytaj wzór ze zdjęcia' }).click();
    const dlg = page.locator('dialog.scanner-dialog');
    await expect(dlg).toContainText('Nie mam dostępu do aparatu.', { timeout: 2000 });
    expect(Date.now() - t0).toBeLessThan(2000);
    const pick = dlg.getByRole('button', { name: 'Wybierz zdjęcie lub PDF' });
    await expect(pick).toBeVisible();
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), pick.click()]);
    await chooser.setFiles({ name: 'w.png', mimeType: 'image/png', buffer: fixtureBuf('frac') });
    await expect(page.locator('.scanner-frame')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Odczytaj', exact: true })).toBeEnabled();
  });

  test('„Wybierz zdjęcie” z podglądu przełącza na plik i zatrzymuje kamerę', async ({ page }) => {
    await openCamera(page);
    await page.locator('dialog.scanner-dialog input[type=file]').setInputFiles({ name: 'w.png', mimeType: 'image/png', buffer: fixtureBuf('frac') });
    await expect(page.locator('.scanner-stage canvas')).toBeVisible();
    await expect(page.locator('.scanner-stage video')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Zrób', exact: true })).toBeHidden();
    expect(await live(page)).toBe(0);
  });
});
