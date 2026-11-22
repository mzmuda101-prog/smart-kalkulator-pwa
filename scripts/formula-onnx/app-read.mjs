// Odczyt folderu wycinków KODEM APKI: Chrome + MATM0_OCR.read (worker, białe tło, przycinanie, ten sam model).
// Wynik w formacie run.py ({ id: { onnx: latex } }), więc ocenia go score.js.
// Użycie: node scripts/formula-onnx/app-read.mjs <folder> <wynik.json> [<folder2> <wynik2.json> …]
// Potrzebny serwer z COOP/COEP: npm run dev (port 3000) albo CALC_URL=http://127.0.0.1:PORT/.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const pairs = process.argv.slice(2);
if (!pairs.length || pairs.length % 2) { console.error('Użycie: app-read.mjs <folder> <wynik.json> [...]'); process.exit(2); }
const base = process.env.CALC_URL || 'http://127.0.0.1:3000/';

const browser = await chromium.launch();
const page = await (await browser.newContext({ serviceWorkers: 'block' })).newPage();
await page.goto(base + 'index.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.MATM0_OCR && !!window.MATM0_MODELS);
if (!(await page.evaluate(() => crossOriginIsolated))) console.warn('uwaga: brak crossOriginIsolated — 1 wątek, wolniej');
// zgoda na pobranie modelu: okno pojawia się przy pierwszym odczycie
await page.evaluate(() => { window.__first = MATM0_MODELS.ensure('formulanet-s').then(() => 'ok', (e) => e.message); });
const consent = page.locator('dialog.model-dialog').getByRole('button', { name: 'Pobierz' });
if (await consent.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false)) await consent.click(); // model już w cache = bez okna
const got = await page.evaluate(() => window.__first);
if (got !== 'ok') throw new Error('model: ' + got);

for (let p = 0; p < pairs.length; p += 2) {
    const [dir, out] = [pairs[p], pairs[p + 1]];
    const res = {};
    for (const f of fs.readdirSync(dir).filter((n) => /^[1-9].*\.(png|jpe?g)$/i.test(n)).sort()) {
        const b64 = fs.readFileSync(path.join(dir, f)).toString('base64');
        const mime = /png$/i.test(f) ? 'image/png' : 'image/jpeg';
        const r = await page.evaluate(async ([s, m]) => {
            const bytes = Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0)); // bez fetch(data:) — CSP strony go blokuje
            const bmp = await createImageBitmap(new Blob([bytes], { type: m }));
            const ctx = /** @type {OffscreenCanvasRenderingContext2D} */ (new OffscreenCanvas(bmp.width, bmp.height).getContext('2d'));
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, bmp.width, bmp.height); ctx.drawImage(bmp, 0, 0);
            const d = ctx.getImageData(0, 0, bmp.width, bmp.height);
            try { const x = await MATM0_OCR.read({ data: d.data, width: d.width, height: d.height }); return { onnx: x.latex, ms: x.ms }; }
            catch (e) { return { onnx: '', failed: String(e && e.message || e) }; }
        }, [b64, mime]);
        res[f.replace(/\.[a-z]+$/i, '')] = r;
    }
    fs.writeFileSync(out, JSON.stringify(res, null, 1));
    console.log(path.basename(dir) + ': ' + Object.keys(res).length + ' wzorów → ' + out);
}
await browser.close();
