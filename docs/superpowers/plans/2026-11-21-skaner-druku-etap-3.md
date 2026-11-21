# Skaner druku (etap 3) — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ikona aparatu przy głównym polu kalkulatora: aparat na żywo z ramką (zapas: zdjęcie z galerii albo strona PDF z tą samą ramką) → PP-FormulaNet-S w przeglądarce → odczytane działanie trafia do pola i liczy się jak wpisane. Offline po jednorazowym pobraniu modelu za zgodą.

**Architecture:** Model ONNX (59 MB, int8) leży w repo jako kawałki `.gz` w `models/formulanet-s/` i jest pobierany przez `js/model-store.js` do Cache Storage (osobny cache, przeżywa aktualizacje apki). Odczyt liczy Web Worker `js/formula-ocr-worker.js` (onnxruntime-web 1.31.1, WASM, do 4 wątków przy `crossOriginIsolated`). Obróbka obrazu i dekodowanie tokenów to czyste funkcje w `js/formula-image.js`, tłumaczenie LaTeX → zapis parsera w `js/latex-to-expr.js`. Interfejs (`js/scanner.js`) daje ramkę na obrazie: na żywo z `getUserMedia` albo na nieruchomym obrazie (plik/PDF).

**Tech Stack:** czysty JS bez budowania (IIFE / moduły ES w workerze), onnxruntime-web 1.31.1 (`ort.wasm.min.mjs` + `ort-wasm-simd-threaded.{mjs,wasm}`), pdf.js z `../documents-workbench-pwa/lib/pdfjs/`, `DecompressionStream('gzip')`, Cache Storage, testy Node + Playwright. Narzędzia dev: `~/.venvs/paddle-onnx` (Python 3.12) i skrypty `scripts/formula-onnx/`.

**Spec:** `docs/superpowers/specs/2026-11-21-skaner-i-granice-design.md` (5.5, 5.5b, 5.7 etap 3, 5.10 — wyniki próby technicznej)

## Global Constraints

- Bez frameworka i budowania; nowe pliki JS zaczynają się od `// @ts-check`; moduły strony jak `js/math-calculus.js` (IIFE, `window.MATM0_X`, `module.exports` dla Node).
- **Zdjęcie nie opuszcza urządzenia**; z sieci tylko pliki modelu i silnika, z naszej domeny (`connect-src 'self'` bez nowych domen), raz, po zgodzie z rozmiarem w oknie („Pobrać model do odczytu wzorów? 37 MB”).
- **Odczyt zawsze trafia do edytowalnego pola** przed liczeniem; nieudane tłumaczenie → komunikat, nigdy śmieci w polu.
- Model i silnik ładowane leniwie — dopiero po stuknięciu ikony aparatu; start apki bez zmian.
- Każdy plik w repo < 50 MB.
- Mierzenie na iPhonie tylko przez HTTPS (przez `http` Safari liczy ok. 14× wolniej — spec 5.10).
- UI: każde `:hover` w `@media (hover: hover)`; cele dotyku ≥ 44 px; `:active` dla dotyku; bez emoji; ikony lucide w sprite `index.html` (`<symbol id="i-…">`), wstawiane przez `_uiIcon` w `app.js`.
- **Bez dubli**: ikona aparatu tylko w głównym polu (`#calcExpr`); „Zapisz do Notatek” = istniejący przycisk „Do notatnika” przy pozycji historii (`app.js` ~4364, `appendToNotepad`) — nie dodajemy drugiego.
- Wydanie: `APP_VERSION` +1 w `version.js`, potem `npm run sync-version`; commit `typ(kalkulator): tytuł po polsku (vX.YY.ZZ)` + punkty „- …”; bez `Co-Authored-By`, bez emoji. Nowe testy Node dopisać do `SUITES` w `scripts/run-tests.mjs`.

## Review Focus

1. **Aktualizacja apki kasuje model** — `sw.js` w `activate` usuwa każdy cache ≠ `CACHE_NAME`; po podbiciu wersji użytkownik musiałby pobierać 37 MB od nowa. Cache `matm0-models-v1` ma przetrwać. Test w Task 4.
2. **Przerwane pobieranie** (sieć pada w połowie, zamknięta karta) — kolejne podejście pobiera tylko brakujące kawałki; uszkodzony kawałek (zła suma SHA-256) jest odrzucany, a nie wczytywany do silnika. Test w Task 4.
3. **COOP/COEP psują coś, co dziś działa** — kursy walut (fetch do `api.nbp.pl`, `api.frankfurter.dev`), ikony, czcionki, instalacja PWA. Test w Task 5.
4. **Odmowa aparatu / brak aparatu / komputer bez kamery** — od razu zapas „Wybierz zdjęcie lub PDF”, bez martwego ekranu. Test w Task 7.
5. **Odczyt-śmieć** (`\begin{array}`, niedomknięte nawiasy, pusty wynik) — pole zostaje nietknięte, komunikat „Nie odczytałem wzoru. Ustaw ramkę ciaśniej wokół jednego wzoru.”. Test w Task 6.

---

## Pliki

- Create `scripts/formula-onnx/build-model.sh` — cała ścieżka: paddle2onnx → `shrink.py` (per_channel) → `convq.py` → `fixshapes.py` → kawałki `.gz` + `manifest.json` + `vocab.json`.
- Create `models/formulanet-s/{manifest.json,vocab.json,model.onnx.part0.gz…}`.
- Create `vendor/onnxruntime-web/{ort.wasm.min.mjs,ort-wasm-simd-threaded.mjs,ort-wasm-simd-threaded.wasm,LICENSE}` (1.31.1).
- Create `vendor/pdfjs/{pdf.min.mjs,pdf.worker.min.mjs,LICENSE}` (z `../documents-workbench-pwa/lib/pdfjs/`).
- Create `js/latex-to-expr.js`, `js/formula-image.js`, `js/model-store.js`, `js/formula-ocr-worker.js`, `js/scanner.js`.
- Create testy: `test/latex-to-expr.js`, `test/formula-image.js`, `test/formula-model-manifest.js`, `test/e2e/scanner.spec.js`; fixtury `test/fixtures/formulas/*.png` (własne rendery, nie materiały z zajęć), `test/fixtures/formula-ocr-outputs.json`.
- Modify `index.html` (CSP, ikona, sprite `i-camera`, skrypty), `vercel.json`, `sw.js`, `styles.css`, `app.js` (podpięcie ikony), `scripts/run-tests.mjs`, `version.js`.

---

### Task 1: Model i silnik w repo

**Files:**
- Create: `scripts/formula-onnx/build-model.sh`, `models/formulanet-s/*`, `vendor/onnxruntime-web/*`
- Test: `test/formula-model-manifest.js`

**Interfaces:**
- Produces: `models/formulanet-s/manifest.json` =
  `{ "name": "formulanet-s", "version": 1, "bytes": <suma rozpakowanych>, "gzBytes": <suma .gz>, "parts": [{ "file": "model.onnx.part0.gz", "gzBytes": n, "bytes": n, "sha256": "<hex rozpakowanego>" }, …], "input": "x", "inputShape": [1,1,384,384], "mean": 0.7931, "std": 0.1738, "eosId": 2, "firstTextId": 4 }`.
  `vocab.json` = tablica `string[]`, indeks = id tokenu (z `inference.yml` → `fast_tokenizer_file`: `model.vocab` + `added_tokens`).

- [ ] **Step 1: Test `test/formula-model-manifest.js`** — dla każdego kawałka: plik istnieje, rozmiar = `gzBytes`, < 50 MB; po `zlib.gunzipSync` rozmiar = `bytes` i SHA-256 = `sha256`; suma = `manifest.bytes`; `vocab.length === 50000`, `vocab[2] === '</s>'`; istnieją trzy pliki `vendor/onnxruntime-web/` i `LICENSE`.
- [ ] **Step 2: Uruchom** `node test/formula-model-manifest.js` → FAIL (brak plików).
- [ ] **Step 3: `build-model.sh <katalog_wyjścia>`** — łączy kroki z `scripts/formula-onnx/README.md` (shrink z `per_channel=True`, convq, fixshapes); dzieli ONNX na kawałki po 10 000 000 B, każdy `gzip -6`, liczy sumy i zapisuje manifest i vocab (krótki skrypt Python w tym samym folderze). Uruchom do `models/formulanet-s/`. Skopiuj `onnxruntime-web@1.31.1` (`npm pack onnxruntime-web@1.31.1` w katalogu tymczasowym) — tylko trzy pliki + LICENSE.
- [ ] **Step 4: Uruchom test** → PASS. Dopisz do `SUITES`.
- [ ] **Step 5: Sprawdź Vercel**: wypchnij gałąź (po zgodzie Mateusza — to wysyłka na zewnątrz), na podglądzie `curl -sI <podgląd>/models/formulanet-s/model.onnx.part0.gz` → 200 i `content-length` = `gzBytes`; `…/vendor/onnxruntime-web/ort-wasm-simd-threaded.wasm` → 200, `content-type: application/wasm`. Jeśli limit pliku/wdrożenia nie przejdzie — stop i decyzja z Mateuszem (spec 5.5b).
- [ ] **Step 6: Commit** `feat(kalkulator): model odczytu wzorów i silnik ONNX w repo`.

### Task 2: Tłumacz LaTeX → zapis parsera

**Files:**
- Create: `js/latex-to-expr.js` (przeniesiony z `scripts/formula-onnx/latex-to-expr.js`), `test/latex-to-expr.js`, `test/fixtures/formula-ocr-outputs.json`

**Interfaces:**
- Produces: `MATM0_LATEX.latexToExpr(latex: string): { expr: string } | { error: string }` (`window.MATM0_LATEX`, `module.exports`).

- [ ] **Step 1: Testy par** (asercje `expr` dokładnie):
  - `\lim_{n\to\infty}\frac{2n+1}{6n+5}` → `lim n→∞ (2n+1)/(6n+5)`
  - `\operatorname* { l i m } _ { x \to - \infty } \frac{x}{\sqrt{3x^{2}+5}}` → `lim x→-∞ x/sqrt(3x^2+5)`
  - `\lim_{n\to\infty}\left(1+\frac{1}{2n}\right)^{n}` → `lim n→∞ (1+1/(2n))^n`
  - `\sqrt[3]{n^{3}+8n^{2}}` → `∛(n^3+8n^2)`; `\sqrt[4]{x+15}` → `∜(x+15)`; `\sqrt[5]{x}` → `(x)^(1/5)`
  - `\log_{2}(8n+1)` i `\log{_{4}}(2n^{2}+3)` → `log_2(8n+1)`, `log_4(2n^2+3)`
  - `n\cdot\left(\sqrt{4n^{2}+7}\right)` → `n*(sqrt(4n^2+7))`; końcowe `,`/`.`/`^` usuwane
  - błąd (obiekt z `error`): `\begin{array}{l}x\end{array}`, `\frac{1}{`, `\lim_{n\to\infty}\left(\frac{n}{n+3}\right` (nawiasy), `""`.
- [ ] **Step 2: Test zestawu**: `test/fixtures/formula-ocr-outputs.json` = odczyty modelu 59 MB z próby (`{ id: latex }`, 58 pozycji — skopiuj z wyników `run.py`; to teksty LaTeX, nie obrazy). Dla każdego: tłumaczenie → `lim v→a body` zgodne z `test/limits-zestaw.json` (ta sama zmienna i cel, wartości ciała równe w punktach z `scripts/formula-onnx/score.js`, pomijając punkty poza dziedziną w obu, min. 3 porównania). **Próg: ≥ 51/58** i każde trafienie rozwiązuje `MATM0_STEPS.run` (≠ `Jeszcze tego nie rozwiążę`).
- [ ] **Step 3: Uruchom** `node test/latex-to-expr.js` → FAIL.
- [ ] **Step 4: Przenieś prototyp** do `js/latex-to-expr.js` we wzorcu IIFE; popraw go tylko tyle, by przeszły testy.
- [ ] **Step 5: PASS**, `npm run check`, dopisz do `SUITES`, commit `feat(kalkulator): tłumacz LaTeX na zapis kalkulatora`.

### Task 3: Obróbka obrazu i dekodowanie tokenów

**Files:**
- Create: `js/formula-image.js`, `test/formula-image.js`

**Interfaces:**
- Produces (`window.MATM0_FIMG`, `module.exports`; obraz = `{ data: Uint8ClampedArray /*RGBA*/, width, height }`):
  - `trimEdgeBlobs(img) → img` — wybiela spójne plamy tuszu (8-sąsiedztwo, próg jasności < 200 po rozciągnięciu min–max), które dotykają górnej lub dolnej krawędzi;
  - `toTensor(img, { size: 384, mean: 0.7931, std: 0.1738 }) → Float32Array(384*384)` — przycięcie marginesu (piksele < 200 po rozciągnięciu), skala krótszego boku do 384 z ograniczeniem dłuższego do 384 (jak `thumbnail`), wyśrodkowanie na **czarnym** tle, `(v/255 − mean)/std` (kopia `preprocess` z `scripts/formula-onnx/run.py`);
  - `decodeTokens(ids: number[], vocab: string[]) → string` — do pierwszego `eosId` (2), pomija id < 4, skleja tokeny bez separatora, `Ġ` → spacja.

- [ ] **Step 1: Testy** na syntetycznych obrazach budowanych w teście:
  - `trimEdgeBlobs`: biały 100×40, czarny prostokąt 10×5 przy górnej krawędzi i 10×10 w środku → górny wybielony, środkowy zostaje;
  - `toTensor`: obraz 768×192 z czarnym prostokątem → długość 147456; wartość w rogu (pole dopełnienia) = `(0 − 0.7931)/0.1738` ±1e-5; jasny piksel = `(1 − 0.7931)/0.1738` ±1e-3;
  - `decodeTokens([0,0,82,2646,2,99], vocab)` → zaczyna się od `\operatorname` i kończy przed `2`;
  - jeśli istnieje `test/fixtures-local/tensors/` (lokalnie, poza gitem: surowe RGBA i tensory z `run.py`) — różnica `toTensor` vs Python: średnia |Δ| < 0.02; inaczej test pomija ten krok z komunikatem.
- [ ] **Step 2: FAIL → Step 3: implementacja → Step 4: PASS**, `npm run check`, `SUITES`, commit `feat(kalkulator): obróbka zdjęcia wzoru i dekodowanie odczytu`.

### Task 4: Pobieranie modelu za zgodą (model-store) i service worker

**Files:**
- Create: `js/model-store.js`
- Modify: `sw.js`, `index.html` (skrypt), `styles.css` (okno)
- Test: `test/e2e/scanner.spec.js` (część „model”)

**Interfaces:**
- Consumes: manifest z Task 1.
- Produces `window.MATM0_MODELS`:
  - `status(name) → Promise<{ ready: boolean, haveBytes: number, gzBytes: number }>`;
  - `ensure(name, { onProgress(gotGzBytes, totalGzBytes) }) → Promise<ArrayBuffer[]>` — pyta o zgodę, jeśli `!ready` (okno `<dialog>`: tytuł „Odczyt wzorów ze zdjęć”, tekst „Pobrać model do odczytu wzorów? 37 MB, jednorazowo. Zdjęcia nie opuszczają telefonu.”, przyciski „Pobierz” / „Nie teraz”); odmowa → `Error('declined')`;
  - `remove(name) → Promise<void>`.
- Cache: `caches.open('matm0-models-v1')`, klucz = URL kawałka, wartość = **rozpakowane** bajty (`DecompressionStream('gzip')`) zapisane dopiero po zgodności SHA-256 (`crypto.subtle.digest`). Istniejące kawałki nie są pobierane ponownie.

- [ ] **Step 1: e2e** (projekt `desktop`, serwer testowy): (a) pierwsze `ensure` pokazuje okno z „37 MB”; „Nie teraz” → `declined`, nic w cache; (b) „Pobierz” → `onProgress` rośnie do `gzBytes`, `status().ready === true`; (c) przerwij: `page.route` zwraca 500 dla `part3` → błąd, ale `part0–2` są w cache; po zdjęciu blokady `ensure` pobiera tylko `part3…` (licz żądania w `page.on('request')`); (d) `page.route` podmienia `part1` na złe bajty → błąd sumy, `part1` nie trafia do cache; (e) symulacja nowej wersji SW (`postMessage` + `caches.keys()` po `activate` z innym `CACHE_NAME`) → `matm0-models-v1` istnieje dalej.
- [ ] **Step 2: FAIL → Step 3**: `model-store.js`; w `sw.js`: `activate` nie usuwa nazw zaczynających się od `matm0-models-`; `fetch` dla ścieżek `/models/` i `/vendor/onnxruntime-web/` → czysta sieć (bez SWR — model zarządza stroną, a 15 MB wasm nie trafia do cache apki przy każdym wejściu); `ort-wasm-simd-threaded.wasm` i `.mjs` dopisane do cache modeli przez `ensure` (silnik też offline).
- [ ] **Step 4: PASS**, commit `feat(kalkulator): pobieranie modelu za zgodą, z wznawianiem`.

### Task 5: Worker odczytu i nagłówki

**Files:**
- Create: `js/formula-ocr-worker.js` (moduł ES), `test/fixtures/formulas/{frac.png,sqrt-lim.png,power.png}` + skrypt `scripts/formula-onnx/render-fixtures.py` (matplotlib mathtext, 200 dpi, czarny na białym)
- Modify: `index.html` (CSP: `script-src 'self' 'wasm-unsafe-eval'`; `worker-src 'self' blob:`), `vercel.json` (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`, `Permissions-Policy: camera=(self), microphone=(), geolocation=()`), `playwright.config.js` (serwer testowy z tymi nagłówkami — zamiana `python3 -m http.server` na mały `scripts/dev-server.mjs` z nagłówkami jak `scripts/formula-onnx/web/serve.mjs`; `npm run dev` też na nim)
- Test: `test/e2e/scanner.spec.js` (część „worker”), istniejące e2e kursów walut

**Interfaces:**
- Consumes: `MATM0_MODELS.ensure`, `MATM0_FIMG.toTensor/decodeTokens`, `MATM0_LATEX.latexToExpr`.
- Produces: `window.MATM0_OCR.read(img) → Promise<{ latex: string, expr?: string, error?: string, ms: number }>` (strona; tworzy worker leniwie przy pierwszym wywołaniu). Worker: `ort.env.wasm.numThreads = crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency) : 1`, `wasmPaths` = `/vendor/onnxruntime-web/`, sesja z bufora złożonego z kawałków (`executionProviders: ['wasm']`), wejście `x [1,1,384,384]`.

- [ ] **Step 1: e2e**: `MATM0_OCR.read` na trzech fixturach → `expr` równe oczekiwanym (zapisane w teście po pierwszym uruchomieniu modelu w Pythonie: `run.py` na tych plikach); `ms < 3000` na desktopie; `crossOriginIsolated === true` na serwerze testowym. Regresja nagłówków: istniejący test kursów walut przechodzi; strona ładuje się bez błędów CSP/COEP w konsoli (`page.on('console')` bez `Cross-Origin-Embedder-Policy` i `Content Security Policy`).
- [ ] **Step 2: FAIL → Step 3: implementacja → Step 4: PASS** + cały `npm run test:e2e`, commit `feat(kalkulator): odczyt wzoru w workerze (onnxruntime-web)`.

### Task 6: Ramka na nieruchomym obrazie (zdjęcie z galerii)

**Files:**
- Create: `js/scanner.js`
- Modify: `index.html` (przycisk w `.calc-expr-wrap` z `<svg><use href="#i-camera">`, `aria-label="Odczytaj wzór ze zdjęcia"`; `<symbol id="i-camera">` z lucide `camera`), `styles.css`, `app.js` (podpięcie)
- Test: `test/e2e/scanner.spec.js` (część „ramka”)

**Interfaces:**
- Consumes: `MATM0_OCR.read`, `MATM0_FIMG.trimEdgeBlobs`.
- Produces: `MATM0_SCANNER.open({ source: 'camera' | 'file' })`; `MATM0_SCANNER.cropToImage(sourceCanvas, frameRectInSourcePx) → img`.
- Zachowanie: pełnoekranowy `<dialog>` (`100dvh`, przycisk akcji nad `env(safe-area-inset-bottom)`); obraz `object-fit: contain`; ramka z przyciemnieniem poza nią, 4 uchwyty w rogach (cel 44 px, `touch-action: none` tylko na uchwytach i ramce, przesuwanie całej ramki palcem), domyślnie 80% szerokości × 25% wysokości, środek; „Odczytaj” → `cropToImage` (przeliczenie z pikseli ekranu na piksele źródła) → `trimEdgeBlobs` → `read`. Sukces: `#calcExpr.value = expr`, `dispatchEvent(new Event('input', { bubbles: true }))`, zamknięcie okna. Błąd tłumacza: okno zostaje, komunikat „Nie odczytałem wzoru. Ustaw ramkę ciaśniej wokół jednego wzoru.”, pole nietknięte. W trakcie odczytu przycisk ma pełną siłę i spinner (`aria-busy="true"`), nie wygląd „wyłączony”. Podświetlanie niepewnych znaków i alternatywy — etap 4 (pismo), nie tutaj.

- [ ] **Step 1: e2e** (`mobile` i `desktop`): ikona widoczna w polu, cel ≥ 44×44; `setInputFiles` z `frac.png` → ramka → „Odczytaj” → `#calcExpr` = oczekiwane `expr`, wynik kalkulatora liczy się; przeciąganie uchwytu zmienia rozmiar ramki (sprawdź `getBoundingClientRect`); obraz-śmieć (szum) → komunikat, `#calcExpr` bez zmian; Escape zamyka okno i wraca fokus na ikonę.
- [ ] **Step 2: FAIL → Step 3: implementacja → Step 4: PASS**, commit `feat(kalkulator): odczyt wzoru ze zdjęcia z ramką`.

### Task 7: Aparat na żywo

**Files:**
- Modify: `js/scanner.js`, `styles.css`
- Test: `test/e2e/scanner.spec.js` (część „aparat”; projekt z `launchOptions.args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture=test/fixtures/formulas/frac.y4m']`, `frac.y4m` generowany z `frac.png` przez `ffmpeg` w `render-fixtures.py`)

**Interfaces:**
- Consumes: Task 6 (`cropToImage`, przepływ odczytu).
- Zachowanie (spec 5.5, pułapki): `<video playsinline muted autoplay>`; `getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })`; „Zrób” → klatka przez `canvas.drawImage(video)` → **zatrzymanie wszystkich ścieżek przed** `read` (pamięć iPhone'a) → ramka przeliczona z `object-fit: cover`; ścieżki zatrzymane też przy zamknięciu okna i `visibilitychange` → `hidden`; latarka tylko gdy `track.getCapabilities().torch`; podpowiedź „Za ciemno — włącz światło” gdy średnia jasność klatki < 60/255 (sprawdzane co 500 ms); po „Zrób” podpowiedź „Rozmazane — przytrzymaj telefon nieruchomo” gdy wariancja laplasjanu wycinka jest poniżej progu (`blurScore(img)` w `js/formula-image.js`; próg dobrany tak, by `frac.png` rozmyty Gaussem σ=3 go wyzwalał, a ostry nie — test jednostkowy w `test/formula-image.js`). „Ustaw równo” — dopiero gdy test zdjęć (Task 9) pokaże, że krzywe kadry psują odczyt. Odmowa / brak `mediaDevices` / błąd → widok zapasowy z przyciskiem „Wybierz zdjęcie lub PDF” (Task 6).

- [ ] **Step 1: e2e**: z fałszywą kamerą: podgląd gra, „Zrób” → `#calcExpr` = `expr` z `frac.png`, po odczycie `video.srcObject` bez aktywnych ścieżek; bez zgody (`permissions: []` + brak `--use-fake-ui…`) → widok zapasowy w < 2 s; zamknięcie okna zatrzymuje ścieżki.
- [ ] **Step 2: FAIL → Step 3 → Step 4: PASS**, commit `feat(kalkulator): aparat na żywo z ramką`.

### Task 8: Strona PDF jako obraz

**Files:**
- Create: `vendor/pdfjs/*` (kopiuj `pdf.min.mjs`, `pdf.worker.min.mjs`, `LICENSE` z `../documents-workbench-pwa/lib/pdfjs/`)
- Modify: `js/scanner.js`, `sw.js` (`/vendor/pdfjs/` — czysta sieć jak model, ładowane leniwie)
- Test: `test/e2e/scanner.spec.js` (część „PDF”; `test/fixtures/formulas/two-pages.pdf` z `render-fixtures.py`: 2 strony, na 2. wzór `frac`)

**Interfaces:**
- Wybór pliku przyjmuje `accept="image/*,application/pdf"`; PDF → lista miniatur stron (renderowane przy 0,3×, przyciski z „Strona N”) → wybrana strona renderowana do canvasa przy 2× (dłuższy bok ≤ 3000 px) → ta sama ramka co w Task 6. Warstwy tekstowej PDF nie używamy.

- [ ] **Step 1: e2e**: `two-pages.pdf` → 2 miniatury → „Strona 2” → ramka na wzorze → `#calcExpr` = `expr`.
- [ ] **Step 2: FAIL → Step 3 → Step 4: PASS**, commit `feat(kalkulator): odczyt wzoru ze strony PDF`.

### Task 9: Ściąga, ustawienia, wydanie i test na zdjęciach

**Files:**
- Modify: `index.html` (sekcja ściągi „Zdjęcie wzoru”: jedno zdanie + kroki; w ustawieniach wiersz „Model odczytu wzorów: 59 MB — Usuń”, wywołuje `MATM0_MODELS.remove`), `version.js`, `sw.js` (`ASSETS_TO_CACHE`: nowe `js/*.js`, bez modelu i vendorów)
- Test: `npm test`, `npm run test:e2e`, `test/help-bilingual.js` (jeśli wymaga EN dla nowej sekcji)

- [ ] **Step 1**: Ściąga i ustawienia; testy ściągi przechodzą.
- [ ] **Step 2**: `APP_VERSION` +1, `npm run sync-version`, `npm run test:predeploy` → 0 błędów.
- [ ] **Step 3: Telefon (z Mateuszem)**: podgląd Vercela (HTTPS) na iPhonie: pobranie modelu z oknem i paskiem, odczyt wzoru z wydruku aparatem < 2 s, po zamknięciu i ponownym otwarciu apki w trybie samolotowym odczyt działa (offline).
- [ ] **Step 4: Zestaw zdjęć**: Mateusz robi 20–30 zdjęć wydruków (lokalnie w `test/fixtures-local/zdjecia/`); `scripts/formula-onnx/score.js` w wariancie na zdjęciach → **próg etapu: ≥ 80% wzorów odczytanych w całości bez poprawek** (spec 5.7). Wynik dopisany do spec 5.10. Poniżej progu: przed wydaniem dołożyć do `cropToImage` wybielanie tła i prostowanie z `../documents-workbench-pwa/app/photo-import.js` (`whiten`, `findPage`/`warp`) i zmierzyć ponownie.
- [ ] **Step 5: Commit** `feat(kalkulator): skaner wzorów z druku (vX.YY.ZZ)` z punktami zmian.
