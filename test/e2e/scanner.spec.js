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

  test('(a) odmowa: okno z rozmiarem pobrania, „Nie teraz” → declined, cache pusty', async ({ page }) => {
    await open(page);
    const result = page.evaluate(ENSURE(NAME));
    const dlg = page.locator('dialog.model-dialog');
    await expect(dlg).toBeVisible();
    await expect(dlg).toContainText('Odczyt wzorów ze zdjęć');
    const mbText = await page.evaluate(async () => {
      const m = await (await fetch('models/formulanet-s/manifest.json')).json();
      return (m.downloadBytes / 1e6).toFixed(1).replace('.', ',') + ' MB';
    });
    expect(mbText).toBe('52,9 MB');
    await expect(dlg).toContainText('Pobrać model do odczytu wzorów? ' + mbText + ', jednorazowo.');
    await dlg.getByRole('button', { name: 'Nie teraz' }).click();
    expect(await result).toEqual({ err: 'declined' });
    await expect(dlg).toHaveCount(0);
    const st = await page.evaluate(() => MATM0_MODELS.status('formulanet-s'));
    expect(st.ready).toBe(false);
    expect(st.haveBytes).toBe(0);
  });

  test('(b) zgoda: postęp rośnie do downloadBytes, status.ready', async ({ page }) => {
    await open(page);
    const result = page.evaluate(ENSURE(NAME));
    await page.locator('dialog.model-dialog').getByRole('button', { name: 'Pobierz' }).click();
    await expect(page.locator('dialog.model-dialog')).toHaveCount(0, { timeout: 60_000 });
    expect((await result).ok).toBe(6);
    const got = await page.evaluate(() => window.__got);
    const total = await page.evaluate(async () => (await (await fetch('models/formulanet-s/manifest.json')).json()).downloadBytes);
    expect(got[0][1]).toBe(total);
    expect(got[got.length - 1][0]).toBe(total);
    for (let i = 1; i < got.length; i++) expect(got[i][0]).toBeGreaterThanOrEqual(got[i - 1][0]);
    const st = await page.evaluate(() => MATM0_MODELS.status('formulanet-s'));
    expect(st).toMatchObject({ ready: true, haveBytes: 37428903, gzBytes: 37428903 });
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

  test('klik w padding okna nie zamyka, klik poza ramką tak', async ({ page }) => {
    await open(page);
    const result = page.evaluate(ENSURE(NAME));
    const dlg = page.locator('dialog.model-dialog');
    await expect(dlg).toBeVisible();
    await dlg.click({ position: { x: 4, y: 4 } });
    await expect(dlg).toBeVisible();
    await page.mouse.click(2, 2); // poza ramką (dialog jest wyśrodkowany)
    expect(await result).toEqual({ err: 'declined' });
  });

  test('serwer sam rozpakował part0 (Content-Encoding): ensure nadal działa', async ({ page }) => {
    await open(page);
    await page.route('**/model.onnx.part0.gz', async (r) => {
      const res = await r.fetch();
      await r.fulfill({ status: 200, body: require('zlib').gunzipSync(await res.body()) });
    });
    const result = page.evaluate(ENSURE(NAME));
    await page.locator('dialog.model-dialog').getByRole('button', { name: 'Pobierz' }).click();
    await expect(page.locator('dialog.model-dialog')).toHaveCount(0, { timeout: 60_000 });
    expect((await result).ok).toBe(6);
  });

  test('brak DecompressionStream: komunikat w oknie, bez ponawiania', async ({ page }) => {
    await page.addInitScript(() => { delete window.DecompressionStream; });
    await open(page);
    const result = page.evaluate(ENSURE(NAME));
    const dlg = page.locator('dialog.model-dialog');
    await dlg.getByRole('button', { name: 'Pobierz' }).click();
    await expect(dlg).toContainText('Ta przeglądarka nie obsługuje pobierania modelu. Zaktualizuj system lub przeglądarkę.');
    await expect(dlg.getByRole('button', { name: 'Spróbuj ponownie' })).toHaveCount(0);
    await dlg.getByRole('button', { name: 'Zamknij' }).click();
    expect((await result).err).toContain('nie obsługuje');
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

// Wartości oczekiwane = run.py (ONNX w Pythonie) + latexToExpr na tych samych PNG.
const FIXTURES = [
  ['frac', 'lim n→∞ (2n+1)/(6n+5)'],
  ['sqrt-lim', 'lim x→5 (x-5)/(3-sqrt(x+4))'],
  ['power', 'lim n→∞ (1+1/(2n))^n'],
];

test.describe('odczyt wzoru w workerze', () => {
  test.use({ serviceWorkers: 'block' });
  test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name !== 'desktop', 'model testujemy raz'));

  test('MATM0_OCR.read czyta trzy wzory, strona jest crossOriginIsolated, konsola bez błędów COEP/CSP', async ({ page }) => {
    test.setTimeout(180_000);
    const errors = [];
    page.on('console', (m) => { if (/Cross-Origin-Embedder-Policy|Content Security Policy/i.test(m.text())) errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    await open(page);
    expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
    const readFixture = (name) => page.evaluate(async (n) => {
      const bmp = await createImageBitmap(await (await fetch(`test/fixtures/formulas/${n}.png`)).blob());
      const ctx = new OffscreenCanvas(bmp.width, bmp.height).getContext('2d');
      ctx.drawImage(bmp, 0, 0);
      const d = ctx.getImageData(0, 0, bmp.width, bmp.height);
      return MATM0_OCR.read({ data: d.data, width: d.width, height: d.height });
    }, name);
    const first = readFixture(FIXTURES[0][0]);
    await page.locator('dialog.model-dialog').getByRole('button', { name: 'Pobierz' }).click();
    const times = [];
    let res = await first;
    for (const [i, [name, expr]] of FIXTURES.entries()) {
      if (i) res = await readFixture(name);
      expect(res.error, name).toBeUndefined();
      expect(res.expr, name).toBe(expr);
      times.push(`${name}=${res.ms}ms`);
      if (i) expect(res.ms).toBeLessThan(3000); // pierwszy odczyt może liczyć rozgrzewkę
    }
    console.log('odczyt:', times.join(' '));
    expect(errors).toEqual([]);
  });

  test('nieudany start workera nie zostawia workera; ponowna próba działa', async ({ page }) => {
    test.setTimeout(120_000);
    await open(page);
    const engine = '**/js/formula-ocr-worker.js';
    await page.route(engine, (r) => r.fulfill({ status: 404, body: '' }));
    const img = () => page.evaluate(async () => {
      const bmp = await createImageBitmap(await (await fetch('test/fixtures/formulas/frac.png')).blob());
      const ctx = new OffscreenCanvas(bmp.width, bmp.height).getContext('2d');
      ctx.drawImage(bmp, 0, 0);
      const d = ctx.getImageData(0, 0, bmp.width, bmp.height);
      return MATM0_OCR.read({ data: d.data, width: d.width, height: d.height }).then((r) => ({ expr: r.expr }), (e) => ({ err: e.message }));
    });
    const first = img();
    await page.locator('dialog.model-dialog').getByRole('button', { name: 'Pobierz' }).click();
    expect((await first).err).toBeTruthy();
    expect(await page.evaluate(() => MATM0_OCR._workers())).toBe(0);
    await page.unroute(engine);
    expect((await img()).expr).toBe(FIXTURES[0][1]);
    expect(await page.evaluate(() => MATM0_OCR._workers())).toBe(1);
  });

  test('odmowa zgody: read odrzuca się z „declined”', async ({ page }) => {
    await open(page);
    const result = page.evaluate(() => MATM0_OCR.read({ data: new Uint8ClampedArray(16), width: 2, height: 2 }).then(() => 'ok', (e) => e.message));
    await page.locator('dialog.model-dialog').getByRole('button', { name: 'Nie teraz' }).click();
    expect(await result).toBe('declined');
  });
});

// ============================================================
//  Ramka na zdjęciu: ikona w polu, okno, odczyt do #calcExpr
// ============================================================
const FRAC = `test/fixtures/formulas/frac.png`;
const fixtureBuf = (name) => require('fs').readFileSync(require('path').join(__dirname, '../fixtures/formulas', name + '.png'));

async function openScanner(page) {
  await page.goto('index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.MATM0_OCR && !!window.loadScanner);
  const icon = page.getByRole('button', { name: 'Odczytaj wzór ze zdjęcia' });
  await icon.click();
  return { icon, dlg: page.locator('dialog.scanner-dialog') };
}
async function pickFile(page, buffer) {
  await page.locator('dialog.scanner-dialog input[type=file]').setInputFiles({ name: 'w.png', mimeType: 'image/png', buffer });
  await expect(page.locator('.scanner-frame')).toBeVisible();
}

test.describe('ramka na zdjęciu', () => {
  test.use({ serviceWorkers: 'block' });

  test('ikona w polu ma cel co najmniej 44x44, Escape zamyka okno i oddaje fokus ikonie', async ({ page }) => {
    const { icon, dlg } = await openScanner(page);
    await expect(dlg).toBeVisible();
    await expect(dlg).toContainText('Ustaw ramkę na jednym wzorze');
    const box = await icon.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();
    await expect(icon).toBeFocused();
  });

  test('przeciągnięcie uchwytu zmienia rozmiar ramki, przeciągnięcie ramki ją przesuwa, ramka zostaje na obrazie', async ({ page }) => {
    const { dlg } = await openScanner(page);
    await pickFile(page, fixtureBuf('frac'));
    const frame = page.locator('.scanner-frame');
    const before = await frame.boundingBox();
    const h = await page.locator('.scanner-handle[data-corner="se"]').boundingBox();
    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
    await page.mouse.down();
    await page.mouse.move(h.x + h.width / 2 - 40, h.y + h.height / 2 - 6, { steps: 4 });
    await page.mouse.up();
    const after = await frame.boundingBox();
    expect(after.width).toBeLessThan(before.width - 30);
    expect(after.height).toBeLessThan(before.height);
    expect(after.x).toBeCloseTo(before.x, 0);
    // przesunięcie całej ramki
    const c = { x: after.x + after.width / 2, y: after.y + after.height / 2 };
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.move(c.x + 15, c.y + 5, { steps: 3 });
    await page.mouse.up();
    const moved = await frame.boundingBox();
    expect(moved.x).toBeGreaterThan(after.x + 10);
    // strzałka przesuwa ramkę o 8 px
    await frame.focus();
    await page.keyboard.press('ArrowLeft');
    const kb = await frame.boundingBox();
    expect(Math.round(moved.x - kb.x)).toBe(8);
    // poza obrazem: ciągnięcie w skrajny róg nie wypycha ramki
    await page.mouse.move(moved.x + 5, moved.y + 5);
    await page.mouse.down();
    await page.mouse.move(2000, 2000, { steps: 3 });
    await page.mouse.up();
    const img = await page.locator('.scanner-stage canvas').boundingBox();
    const out = await frame.boundingBox();
    expect(out.x + out.width).toBeLessThanOrEqual(img.x + img.width + 1);
    expect(out.y + out.height).toBeLessThanOrEqual(img.y + img.height + 1);
  });

  test('obraz-śmieć: komunikat, pole bez zmian, okno zostaje; „Odczytaj” nie jest wyłączone w trakcie', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'model testujemy raz');
    test.setTimeout(180_000);
    await page.goto('index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.loadScanner);
    await page.locator('#calcExpr').fill('2+2');
    await page.getByRole('button', { name: 'Odczytaj wzór ze zdjęcia' }).click();
    const noise = await page.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 240; c.height = 120;
      const x = c.getContext('2d'); const d = x.createImageData(240, 120);
      for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
      x.putImageData(d, 0, 0);
      const b = await new Promise((r) => c.toBlob(r, 'image/png'));
      return Array.from(new Uint8Array(await b.arrayBuffer()));
    });
    await pickFile(page, Buffer.from(noise));
    const read = page.getByRole('button', { name: 'Odczytaj', exact: true });
    await read.click();
    await page.locator('dialog.model-dialog').getByRole('button', { name: 'Pobierz' }).click();
    await expect(read).toHaveAttribute('aria-busy', 'true');
    await expect(read).toBeEnabled();
    await expect(page.locator('.scanner-error')).toContainText('Nie odczytałem wzoru. Ustaw ramkę ciaśniej wokół jednego wzoru.', { timeout: 90_000 });
    await expect(page.locator('dialog.scanner-dialog')).toBeVisible();
    await expect(page.locator('#calcExpr')).toHaveValue('2+2');
  });

  test('odczyt frac.png: wartość trafia do pola i wynik się liczy', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'model testujemy raz');
    test.setTimeout(180_000);
    const { dlg } = await openScanner(page);
    await pickFile(page, fixtureBuf('frac'));
    // domyślna ramka: krótki obraz z jednym wzorem dostaje go w całości
    await page.getByRole('button', { name: 'Odczytaj', exact: true }).click();
    await page.locator('dialog.model-dialog').getByRole('button', { name: 'Pobierz' }).click();
    await expect(dlg).toBeHidden({ timeout: 90_000 });
    await expect(page.locator('#calcExpr')).toHaveValue(FIXTURES[0][1]);
    await expect(page.locator('#calcResult')).not.toHaveText('0');
    await expect(page.getByRole('button', { name: 'Odczytaj wzór ze zdjęcia' })).toBeFocused();
  });

  test('odmowa zgody zamyka okno po cichu, pole bez zmian', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'model testujemy raz');
    await page.goto('index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.loadScanner);
    await page.evaluate(() => MATM0_MODELS.remove('formulanet-s'));
    await page.getByRole('button', { name: 'Odczytaj wzór ze zdjęcia' }).click();
    await pickFile(page, fixtureBuf('frac'));
    await page.getByRole('button', { name: 'Odczytaj', exact: true }).click();
    await page.locator('dialog.model-dialog').getByRole('button', { name: 'Nie teraz' }).click();
    await expect(page.locator('dialog.scanner-dialog')).toBeHidden();
    await expect(page.locator('#calcExpr')).toHaveValue('');
  });

  test('cropToImage: przycina w pikselach źródła i zmniejsza dłuższy bok do 2000', async ({ page }) => {
    await page.goto('index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.loadScanner);
    const r = await page.evaluate(async () => {
      await loadScanner();
      const c = document.createElement('canvas'); c.width = 4000; c.height = 1000;
      const x = c.getContext('2d'); x.fillStyle = '#00f'; x.fillRect(0, 0, 4000, 1000); x.fillStyle = '#f00'; x.fillRect(0, 0, 1000, 1000);
      const a = MATM0_SCANNER.cropToImage(c, { x: 0, y: 0, w: 1000, h: 500 });
      const b = MATM0_SCANNER.cropToImage(c, { x: 1000, y: 0, w: 4000, h: 1000 });
      return [a.width, a.height, a.data[0], a.data[2], b.width, b.height, b.data[0] < 30, b.data[2] > 225];
    });
    expect(r).toEqual([1000, 500, 255, 0, 2000, 667, true, true]);
  });

  test('„Zmień zdjęcie” w trakcie odczytu: przycisk wraca do normy, nowy odczyt działa', async ({ page }) => {
    const { dlg } = await openScanner(page);
    await page.evaluate(() => { window.MATM0_OCR.read = () => new Promise(() => {}); }); // odczyt nigdy się nie kończy
    await pickFile(page, fixtureBuf('frac'));
    const read = page.getByRole('button', { name: 'Odczytaj', exact: true });
    await read.click();
    await expect(read).toHaveAttribute('aria-busy', 'true');
    await page.getByRole('button', { name: 'Zmień zdjęcie' }).click({ trial: true });
    await page.locator('dialog.scanner-dialog input[type=file]').setInputFiles({ name: 'w.png', mimeType: 'image/png', buffer: fixtureBuf('power') });
    await expect(read).not.toHaveAttribute('aria-busy', 'true');
    await expect(read).toBeEnabled();
    await page.evaluate(() => { window.MATM0_OCR.read = async () => ({ latex: '', expr: '1+1', ms: 1 }); });
    await read.click();
    await expect(dlg).toBeHidden();
    await expect(page.locator('#calcExpr')).toHaveValue('1+1');
  });
});

// ============================================================
//  Strona PDF jako obraz: miniatury -> strona -> ta sama ramka co przy zdjęciu
// ============================================================
const PDF = require('fs').readFileSync(require('path').join(__dirname, '../fixtures/formulas/two-pages.pdf'));
const FRAME_ON_PDF_FORMULA = [0.12, 0.43, 0.76, 0.14]; // formuła na środku A4; cała strona nie mieści się w regule „krótki obraz”
async function pickPdf(page, buffer = PDF, name = 'zadania.pdf') {
  await page.locator('dialog.scanner-dialog input[type=file]').setInputFiles({ name, mimeType: 'application/pdf', buffer });
}

test.describe('strona PDF', () => {
  test.use({ serviceWorkers: 'block' });

  test('pdf.js ładuje się dopiero przy PDF-ie; miniatury, „Strona 2”, „Inna strona”, uszkodzony plik', async ({ page }) => {
    const reqs = [];
    page.on('request', (r) => reqs.push(r.url()));
    const { dlg } = await openScanner(page);
    expect(reqs.filter((u) => /\/vendor\/pdfjs\//.test(u))).toEqual([]);
    expect(await dlg.locator('input[type=file]').getAttribute('accept')).toBe('image/*,application/pdf');

    // uszkodzony PDF: komunikat, żadnej ramki
    await pickPdf(page, Buffer.from('to nie jest pdf'));
    await expect(page.locator('.scanner-error')).toHaveText('Nie mogę otworzyć tego PDF-u.');
    await expect(page.locator('.scanner-frame')).toBeHidden();

    await pickPdf(page);
    await expect(dlg.getByRole('heading', { name: 'Wybierz stronę' })).toBeVisible();
    const thumbs = dlg.locator('.scanner-page');
    await expect(thumbs).toHaveCount(2);
    await expect(thumbs.nth(1)).toHaveText('Strona 2');
    for (const t of await thumbs.all()) expect((await t.boundingBox()).height).toBeGreaterThanOrEqual(44);
    // miniatura faktycznie narysowana (nie biała): jest w niej czarny piksel
    await expect.poll(() => thumbs.nth(0).locator('canvas').evaluate((c) => c.width > 0 && Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data).some((v, i) => i % 4 === 0 && v < 100))).toBe(true);

    await dlg.getByRole('button', { name: 'Strona 2' }).click();
    await expect(page.locator('.scanner-frame')).toBeVisible();
    await expect(dlg.getByRole('heading', { name: 'Ustaw ramkę na jednym wzorze' })).toBeVisible();
    await expect(dlg.locator('.scanner-page')).toHaveCount(0);
    const size = await page.evaluate(() => { const c = document.querySelector('.scanner-stage > canvas'); return [c.width, c.height]; });
    expect(Math.max(...size)).toBeLessThanOrEqual(3000);
    expect(Math.max(...size)).toBeGreaterThan(1600); // A4 = 842 pt, przy 2x ok. 1684 px
    expect(reqs.some((u) => /\/vendor\/pdfjs\/pdf\.min\.mjs/.test(u))).toBe(true);

    await dlg.getByRole('button', { name: 'Inna strona' }).click();
    await expect(dlg.locator('.scanner-page')).toHaveCount(2);
    await expect(page.locator('.scanner-frame')).toBeHidden();
    await expect(dlg.getByRole('button', { name: 'Odczytaj', exact: true })).toBeHidden();
  });

  test('odczyt wzoru ze strony 2 PDF-u: wartość trafia do pola', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'model testujemy raz');
    test.setTimeout(180_000);
    const { dlg } = await openScanner(page);
    await pickPdf(page);
    await dlg.getByRole('button', { name: 'Strona 2' }).click();
    await expect(page.locator('.scanner-frame')).toBeVisible();
    await page.evaluate((f) => MATM0_SCANNER._setFrame(...f), FRAME_ON_PDF_FORMULA);
    await page.getByRole('button', { name: 'Odczytaj', exact: true }).click();
    await page.locator('dialog.model-dialog').getByRole('button', { name: 'Pobierz' }).click();
    await expect(dlg).toBeHidden({ timeout: 90_000 });
    await expect(page.locator('#calcExpr')).toHaveValue(FIXTURES[0][1]);
  });

  test('podwójne kliknięcie miniatury: jedna strona na scenie, odczyt działa', async ({ page }) => {
    const { dlg } = await openScanner(page);
    await page.evaluate(() => { window.MATM0_OCR.read = async () => ({ latex: '', expr: '3+3', ms: 1 }); });
    await pickPdf(page);
    await dlg.getByRole('button', { name: 'Strona 2' }).evaluate((b) => { b.click(); b.click(); }); // dwa tapy w jednym takcie
    await expect(page.locator('.scanner-frame')).toBeVisible();
    await expect(dlg.locator('.scanner-page')).toHaveCount(0);
    await expect(page.locator('.scanner-stage > canvas:not([hidden])')).toHaveCount(1);
    await dlg.getByRole('button', { name: 'Odczytaj', exact: true }).click();
    await expect(dlg).toBeHidden();
    await expect(page.locator('#calcExpr')).toHaveValue('3+3');
  });

  test('PDF z jedną stroną: bez listy, bez „Inna strona”, od razu ramka', async ({ page }) => {
    const { dlg } = await openScanner(page);
    await pickPdf(page, require('fs').readFileSync(require('path').join(__dirname, '../fixtures/formulas/one-page.pdf')), 'jedna.pdf');
    await expect(page.locator('.scanner-frame')).toBeVisible();
    await expect(dlg.locator('.scanner-page')).toHaveCount(0);
    await expect(dlg.getByRole('button', { name: 'Inna strona' })).toBeHidden();
    await expect(dlg.getByRole('heading', { name: 'Ustaw ramkę na jednym wzorze' })).toBeVisible();
    await expect(page.locator('.scanner-stage > canvas:not([hidden])')).toHaveCount(1);
  });
});
