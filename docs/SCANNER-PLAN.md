# Skaner działań — stan, test porównawczy, plan (2026-11-06)

Etap 3 z planu „Wolfram + skaner” (etapy 1–2: `js/math-steps.js`, `js/math-calculus.js`).
Photomath służy tylko jako inspiracja: testujemy go z zewnątrz (zdjęcie → co pokazuje i jak).
Nie dekompilujemy jego aplikacji ani modelu, bo zabraniają tego jego warunki, tak samo jak przy Wolframie.

## 1. Stan obecny

- **Skanera nie ma.** W kodzie nie ma OCR, modelu ani dostępu do aparatu.
- `vercel.json`: `Permissions-Policy: camera=()` blokuje `getUserMedia` (podgląd na żywo).
  `<input type="file" accept="image/*" capture="environment">` działa mimo to, bo otwiera systemowy aparat i nie podlega tej polityce.
- CSP w `index.html`:
  - `script-src 'self'` bez `'wasm-unsafe-eval'`, więc WebAssembly (onnxruntime-web, tesseract.js) się nie skompiluje;
  - `connect-src` pozwala tylko na `'self'` i API walut, więc model musi leżeć na naszym serwerze, nie na Hugging Face;
  - `worker-src 'self'` jest w porządku.
- Rozwiązywanie jest gotowe: `MATM0_STEPS` sprawdza każdy wynik podstawieniem.
  Skaner musi tylko dostarczyć **wyrażenie do poprawienia**, a nie gotowy wynik.

## 2. Test porównawczy (syntetyczny)

Skrypt: `scripts/ocr-bench/bench.py`.

- **Dane:** 10 działań (m.in. ×, ÷, ·, potęga, √, równanie, przecinek dziesiętny, ułamki piętrowe) w 4 krojach: druk oraz 3 kroje „odręczne” (Bradley Hand, Chalkboard, Marker Felt).
- **3 poziomy zdjęcia:**
  - czysty;
  - telefon: przechył 3,5°, perspektywa, nierówne światło, szum, rozmycie, niższa rozdzielczość;
  - trudne: dodatkowo cień, kratka zeszytu, przechył 6°.
- **Silnik:** Tesseract 5.5, ten sam co w tesseract.js, w trybie jednej linii (`psm 7`), bez i z listą dozwolonych znaków.

| Konfiguracja | Trafienia (całe wyrażenie) | Błąd znaków (CER) |
|---|---|---|
| bez obróbki | 5,8% | 59% |
| bez obróbki + lista znaków | 6,7% | 57% |
| z obróbką | 8,3% | 41% |
| **z obróbką + lista znaków** | **10,0%** | **35%** |

- **Trudne zdjęcia:** bez obróbki CER 100% (nic się nie czyta), z obróbką 33% (druk) i 44% (pismo).
- **Ułamki piętrowe:** 0% w każdej konfiguracji. OCR linii nie zna układu 2D.
- **Typowe błędy:**
  - `×` → `x`, `÷` → `+`, `·` → `-`;
  - potęga znika (`7²` → `72`);
  - `√` znika;
  - w piśmie myli 3/2 i 4/7.

**Wnioski:**

1. **Zwykły OCR tekstu (Tesseract/tesseract.js) się nie nadaje na główny silnik.** Nawet na czystym druku daje ok. 20% trafień, a układu 2D (ułamki, potęgi) nie obsługuje w ogóle.
2. **Obróbka wstępna jest warta zrobienia niezależnie od modelu.** Na trudnych zdjęciach zamienia „nic” w „prawie”. Wchodzą w nią: spłaszczenie światła (dzielenie przez rozmyte tło), próg Otsu, usunięcie kratki, prostowanie wg profilu poziomego, kadr do treści i skala ok. 90 px wysokości.
3. **Potrzebny model do matematyki** (obraz → LaTeX/drzewo), a nie do tekstu.

### 2b. Modele do matematyki (te same zdjęcia, `scripts/ocr-bench/models.py`, CPU Maca)

| Model (z obróbką wstępną) | Druk: czysty / telefon / trudne | Pismo: czysty / telefon / trudne | Ułamki piętrowe | Czas | Rozmiar |
|---|---|---|---|---|---|
| Tesseract 5.5 (+ lista znaków) | 20 / 20 / 10% | 7 / 10 / 7% | 0% | — | ok. 15 MB |
| pix2tex (LaTeX-OCR) | 40 / 80 / 20% | 10 / 13 / 3% | 8% | 250 ms | ok. 116 MB |
| TrOCR small, druk | 20 / 20 / 20% (CER ok. 22%) | 17 / 20 / 17% (CER ok. 29%) | 0% | 100 ms | ok. 250 MB |
| TrOCR small, pismo | 10 / 10 / 10% | 10 / 7 / 3% | 0% | 115 ms | ok. 250 MB |
| **PP-FormulaNet-S (PaddleOCR)** | **90 / 100 / 80%** | **50 / 50 / 40%** | **100%** | 140 ms | ok. 230 MB (fp32) |

- **PP-FormulaNet-S wygrywa wyraźnie.** Czyta ×, ÷, ·, potęgi, √, równania i ułamki piętrowe. Licencja Apache-2.0.
  - Na piśmie myli pojedyncze znaki (`7²` → `y²²`, `6` → `e`). Do tego jest podświetlanie niepewnych znaków i poprawianie wyniku.
- **pix2tex:** dobry tylko na druku. Na piśmie daje LaTeX-owe śmieci.
- **TrOCR:** to OCR tekstu, więc gubi × ÷ i potęgi, a ułamków nie czyta.
- **Obróbka wstępna:** dla PP-FormulaNet podnosi druk na trudnych zdjęciach z 50% do 80% (telefon z 70% do 100%). Na piśmie działa na zero lub lekko na minus, więc dla pisma warto dać modelowi obraz w skali szarości bez progowania i to porównać.

Zostaje do sprawdzenia:

- **Prawdziwe zdjęcia** (20–30: Twoje pismo, zeszyt, tablica, ekran). Kroje „odręczne” to tylko przybliżenie.
- **Wersja w przeglądarce.** Eksport PP-FormulaNet-S do ONNX (paddle2onnx) i kwantyzacja int8 (spodziewane ok. 60 MB). Potem czas w onnxruntime-web (WASM/WebGPU) na telefonie.

## 3. Kandydaci na model (w przeglądarce, lokalnie)

| Model | Licencja | Co umie | Uwagi |
|---|---|---|---|
| **pix2tex / LaTeX-OCR** | MIT | obraz → LaTeX, druk bardzo dobrze | pismo odręczne słabo bez dotrenowania; eksport do ONNX → onnxruntime-web; rząd 100 MB |
| **PaddleOCR: PP-OCR (wykrywanie) + PP-FormulaNet (wzory)** | Apache-2.0 | wykrywanie linii (DB) jest lekkie (kilka MB), wzory → LaTeX | wykrywanie przyda się do kadrowania nawet przy innym modelu; rozmiar modelu wzorów do sprawdzenia |
| **TrOCR** (transformers.js: `trocr-small-*`) | MIT | linia tekstu, druk/pismo | to nie matematyka (gubi 2D); wersje „math” od społeczności mają różne licencje |
| **Texo** | AGPL-3.0 | wzory w przeglądarce, ok. 80 MB | licencja koliduje z MIT (decyzja z 2.11) |
| **VLM na urządzeniu** (Qwen3.5 2B jak `local-ai.js` w Sheet/Docs; Chrome Prompt API z obrazem) | Apache-2.0 / Chrome | czyta działanie ze zdjęcia, także trudne | 1,6 GB pobrania albo tylko Chrome; dobre jako „✦ druga próba” na mocnych urządzeniach |
| Dotrenowanie małego modelu na CROHME/MathWriting | MathWriting: CC BY-NC-SA | pismo odręczne | NC: tylko jeśli apka nie jest komercyjna; dużo pracy |

**Rekomendacja (po teście 2b):**

1. **Model główny: PP-FormulaNet-S** w onnxruntime-web (WASM, WebGPU gdy jest).
   - Wczytywany leniwie, za zgodą, z pliku na naszym serwerze.
   - Wynik w LaTeX tłumaczony na składnię parsera.
2. **Kadrowanie:** wykrywanie linii z PP-OCR (lekkie).
3. **Druga próba ✦:** VLM tylko wtedy, gdy wynik się nie parsuje albo ma niską pewność.

pix2tex odpada (pismo); potwierdzić na prawdziwych zdjęciach.

## 4. Obróbka wstępna (canvas / Web Worker, bez bibliotek)

1. **Prostowanie perspektywy kartki.** Krawędzie (Sobel), największy czworokąt i homografia 4 punktów. Gdy kartki nie widać, ten krok jest pomijany.
2. **Spłaszczenie światła i cienia:** szarość podzielona przez rozmytą szarość (σ ≈ wysokość/12).
3. **Próg.** Otsu na spłaszczonym obrazie, a przy bardzo nierównym świetle Sauvola (lokalne okno).
4. **Odszumianie.** Mediana 3×3 i usunięcie plamek mniejszych niż N px (komponenty spójne).
5. **Usunięcie kratki/linii zeszytu.** Długie, cienkie składowe poziome i pionowe (kreski ułamka są krótkie i zostają).
6. **Prostowanie tekstu:** kąt o maksymalnej wariancji profilu poziomego, ±10°.
7. **Wycięcie wyrażenia.** Ramka z UI, a w niej bbox treści z marginesem. Przy wielu liniach każda osobno (wykrywanie linii) i wybór stuknięciem.
8. **Skala.** Wysokość linii zgodna z wejściem modelu.

W teście kroki 2, 3, 5, 6 i 7 dały CER 100% → 33% na trudnych zdjęciach.

## 5. UX (inspiracja: zachowanie Photomatha obserwowane z zewnątrz + zasady apki)

- **Wejście:** przycisk aparatu w polu wyrażenia.
  - Na start `<input capture>`, bez zmiany nagłówków.
  - Podgląd na żywo (`getUserMedia`) dopiero w drugim kroku; wymaga `camera=(self)`.
- **Kadrowanie:**
  - prostokąt z uchwytami, przeciągany i zmieniany palcem;
  - domyślnie dopasowany do wykrytej linii;
  - podpowiedź „jedno działanie w ramce”.
- **Podpowiedzi przy zdjęciu** (z analizy obrazu, przed rozpoznaniem):
  - „za ciemno”;
  - „rozmazane, przytrzymaj telefon” (wariancja Laplasjanu);
  - „za mało kontrastu”;
  - „ustaw równo”.
- **Poprawianie wyniku:**
  - rozpoznane wyrażenie trafia do zwykłego pola (edytowalne, z ściągą/pomocą jak teraz);
  - niepewne znaki podświetlone (prawdopodobieństwo tokenu z dekodera);
  - stuknięcie w znak daje 2–3 alternatywy (np. `x`/`×`, `1`/`7`).
- **Weryfikacja:** wynik idzie przez `MATM0_STEPS`, jak dziś po wpisaniu. Gdy parser nie rozumie, apka pokazuje „popraw zaznaczone” zamiast błędu.
- **Prywatność:** zdjęcie nie wychodzi z urządzenia. Model pobierany raz, za zgodą, z rozmiarem w oknie (jak `local-ai.js`).

### Jak testować Photomatha z zewnątrz

Te same zdjęcia z pkt 2 i prawdziwe. Notujemy:

- czas do wyniku;
- co robi przy kilku liniach;
- jak wygląda kadrowanie;
- co robi, gdy nie odczyta (prośba o nowe zdjęcie czy edycja);
- jak pokazuje niepewność;
- jak wygląda edycja rozpoznanego wyrażenia.

Porównujemy zachowanie, nie kod.

## 6. Kolejność prac

1. Zebrać zdjęcia (20–30) i dodać je do `bench.py` (katalog z parą `nazwa.jpg` + `nazwa.txt`).
2. ~~Test modeli w Pythonie~~ (zrobione, 2b). Dalej: PP-FormulaNet-S → ONNX int8 → onnxruntime-web, czas i pamięć na telefonie; porównanie obróbki „szarość” i „próg” dla pisma.
3. Obróbka wstępna w Workerze + UI kadrowania i podpowiedzi + `<input capture>` (bez modelu: pole do ręcznej korekty).
4. Model w onnxruntime-web: CSP `'wasm-unsafe-eval'`, model w `/models/` (SW cache), okno zgody.
5. Niepewne tokeny i alternatywy, druga próba ✦ (VLM), podgląd na żywo (`camera=(self)`).
