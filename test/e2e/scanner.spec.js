// ============================================================
//  SKANER — pobieranie modelu odczytu wzorów za zgodą (js/model-store.js)
// ============================================================
const { test, expect } = require('playwright/test');

const NAME = 'formulanet-s';
const ENSURE = (n) => `window.__got = []; MATM0_MODELS.ensure('${n}', { onProgress: (g, t) => window.__got.push([g, t]) })
    .then(p => ({ ok: p.length })).catch(e => ({ err: e.message }))`;

async function open(page) {
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_MODELS);
  await page.evaluate(() => MATM0_MODELS.remove('formulanet-s'));
}
const partReqs = (reqs) => reqs.filter((u) => /model\.onnx\.part\d\.gz$/.test(u)).map((u) => u.match(/part\d/)[0]);

test.describe('model: pobieranie za zgodą', () => {
  // page.route nie widzi żądań wykonanych przez service worker, więc go blokujemy.
  test.use({ serviceWorkers: 'block' });
  test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name !== 'desktop', 'model testujemy raz'));

  test('(a) odmowa: okno z 37 MB, „Nie teraz” → declined, cache pusty', async ({ page }) => {
    await open(page);
    const result = page.evaluate(ENSURE(NAME));
    const dlg = page.locator('dialog.model-dialog');
    await expect(dlg).toBeVisible();
    await expect(dlg).toContainText('Odczyt wzorów ze zdjęć');
    await expect(dlg).toContainText('37 MB');
    await dlg.getByRole('button', { name: 'Nie teraz' }).click();
    expect(await result).toEqual({ err: 'declined' });
    await expect(dlg).toHaveCount(0);
    const st = await page.evaluate(() => MATM0_MODELS.status('formulanet-s'));
    expect(st.ready).toBe(false);
    expect(st.haveBytes).toBe(0);
  });

  test('(b) zgoda: postęp rośnie do gzBytes, status.ready', async ({ page }) => {
    await open(page);
    const result = page.evaluate(ENSURE(NAME));
    await page.locator('dialog.model-dialog').getByRole('button', { name: 'Pobierz' }).click();
    await expect(page.locator('dialog.model-dialog')).toHaveCount(0, { timeout: 60_000 });
    expect((await result).ok).toBe(6);
    const got = await page.evaluate(() => window.__got);
    const total = got[0][1];
    expect(got[got.length - 1][0]).toBe(total);
    for (let i = 1; i < got.length; i++) expect(got[i][0]).toBeGreaterThanOrEqual(got[i - 1][0]);
    const st = await page.evaluate(() => MATM0_MODELS.status('formulanet-s'));
    expect(st).toMatchObject({ ready: true, haveBytes: total, gzBytes: total });
    // gotowy model: bez okna, bez sieci
    const again = await page.evaluate(ENSURE(NAME));
    expect(again.ok).toBe(6);
    await expect(page.locator('dialog.model-dialog')).toHaveCount(0);
  });

  test('(c) przerwanie: part3 = 500, part0-2 w cache, ponowienie bierze tylko brakujące', async ({ page }) => {
    await open(page);
    const reqs = [];
    page.on('request', (r) => reqs.push(r.url()));
    await page.route('**/model.onnx.part3.gz', (r) => r.fulfill({ status: 500, body: 'x' }));
    const result = page.evaluate(ENSURE(NAME));
    const dlg = page.locator('dialog.model-dialog');
    await dlg.getByRole('button', { name: 'Pobierz' }).click();
    await expect(dlg).toContainText('Nie udało się pobrać');
    await expect(dlg.getByRole('button', { name: 'Spróbuj ponownie' })).toBeVisible();
    const cached = await page.evaluate(async () => {
      const c = await caches.open('matm0-models-v1');
      return (await c.keys()).map((r) => r.url.split('/').pop());
    });
    expect(cached).toEqual(expect.arrayContaining(['model.onnx.part0.gz', 'model.onnx.part1.gz', 'model.onnx.part2.gz']));
    expect(cached).not.toContain('model.onnx.part3.gz');

    await page.unroute('**/model.onnx.part3.gz');
    reqs.length = 0;
    await dlg.getByRole('button', { name: 'Spróbuj ponownie' }).click();
    await expect(dlg).toHaveCount(0, { timeout: 60_000 });
    expect((await result).ok).toBe(6);
    expect(partReqs(reqs)).toEqual(['part3', 'part4', 'part5']);
  });

  test('(d) złe bajty: błąd sumy, part1 nie trafia do cache', async ({ page }) => {
    await open(page);
    await page.route('**/model.onnx.part1.gz', async (r) => {
      const zlib = require('zlib');
      await r.fulfill({ status: 200, body: zlib.gzipSync(Buffer.from('to nie jest model')) });
    });
    const result = page.evaluate(ENSURE(NAME));
    const dlg = page.locator('dialog.model-dialog');
    await dlg.getByRole('button', { name: 'Pobierz' }).click();
    await expect(dlg).toContainText('Suma kontrolna');
    await dlg.getByRole('button', { name: 'Zamknij' }).click();
    expect((await result).err).toContain('Suma kontrolna');
    const cached = await page.evaluate(async () => (await (await caches.open('matm0-models-v1')).keys()).map((r) => r.url.split('/').pop()));
    expect(cached).toContain('model.onnx.part0.gz');
    expect(cached).not.toContain('model.onnx.part1.gz');
  });
});

test('(e) offline: po pobraniu SW oddaje model i silnik z cache modeli', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'model testujemy raz');
  await open(page);
  // na localhost apka sama wyrejestrowuje SW, więc rejestrujemy go ręcznie
  await page.evaluate(async () => { await navigator.serviceWorker.register('sw.js'); await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const result = page.evaluate(ENSURE(NAME));
  await page.locator('dialog.model-dialog').getByRole('button', { name: 'Pobierz' }).click();
  expect((await result).ok).toBe(6);
  await context.setOffline(true);
  const sizes = await page.evaluate(async () => {
    const a = await fetch('models/formulanet-s/model.onnx.part0.gz');
    const b = await fetch('vendor/onnxruntime-web/ort-wasm-simd-threaded.wasm');
    return [(await a.arrayBuffer()).byteLength, (await b.arrayBuffer()).byteLength];
  });
  expect(sizes[0]).toBe(10_000_000); // rozpakowany kawałek
  expect(sizes[1]).toBeGreaterThan(1_000_000);
  // model w cache apki nie ląduje
  const appCaches = await page.evaluate(async () => {
    const out = [];
    for (const k of await caches.keys()) if (k.startsWith('matm0-calc-')) out.push(...(await (await caches.open(k)).keys()).map((r) => r.url));
    return out;
  });
  expect(appCaches.filter((u) => /\/models\/|onnxruntime/.test(u))).toEqual([]);
});
