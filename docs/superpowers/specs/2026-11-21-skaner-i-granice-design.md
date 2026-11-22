# Skaner zadań i granice krok po kroku — projekt (2026-11-21)

Rozwija `docs/SCANNER-PLAN.md` (stan i test modeli z 6.11). Tamten plik zostaje źródłem
wyników testu porównawczego; ten opisuje, CO budujemy i w jakiej kolejności.

## 1. Po co

Mateusz robi zdjęcia:

1. **wydrukowanych zadań z wyższej matematyki** — granice funkcji (często złożone: ułamki
   piętrowe, ułamki w ułamkach, pierwiastki w liczniku i mianowniku), pierwiastki, pochodne,
   całki; prostsze działania też;
2. **notatek pisanych ręcznie** — swoich, kolegi, kogokolwiek.

Źródła są zdjęciami albo plikami PDF (Mateusz trzyma notatki i zadania jako PDF).

Chce dostać rozwiązanie krok po kroku, „jak w Photomacie, ale w stylu tej aplikacji”:
offline, po polsku, z pewnym wynikiem.

Dziś: silnik liczy pochodne, całki i równania krok po kroku (`js/math-calculus.js`,
`js/math-steps.js`), ale **granic nie liczy wcale**, a `uprość sqrt(8)` kończy się
„Jeszcze tego nie rozwiążę”. Skanera nie ma. Sam skaner bez rozbudowy rozwiązywania byłby
bezużyteczny dla głównego zastosowania, więc projekt obejmuje oba.

## 2. Cele, nie-cele, anty-cele

**Cele**
- Granice krok po kroku po polsku, także złożone (patrz 5.2), wpisywane ręcznie i ze zdjęcia.
- Upraszczanie pierwiastków (`√8 = 2√2`, usuwanie niewymierności z mianownika).
- Zdjęcie **albo PDF** wydrukowanego zadania → odczytane działanie w polu → rozwiązanie.
- Zdjęcie pisma (dowolnego) → odczytane działanie do poprawienia → rozwiązanie.
- Aparat na żywo z ramką (jak w Photomacie): wzór ustawiony w prostokącie → odczyt tylko tego,
  co w ramce (decyzja Mateusza 2026-11-21, patrz 5.5).
- „Zapisz do Notatek” z rozwiązania.
- Później: „Sprawdź moje rozwiązanie” (zdjęcie własnych kroków → pierwszy błędny krok).

**Nie-cele (teraz)**
- Przepisywanie całych stron notatek do edytowalnego tekstu (OCR tekstu + układ strony).
- Wykresy, geometria, zadania z treścią („pociąg jedzie…”).
- Szeregi, całki wielokrotne, równania różniczkowe.
- Automatyczne wykrywanie wielu wzorów na całej stronie (PP-OCR detection) — ramkę ustawia
  użytkownik; wraca tylko, jeśli ramka okaże się za mało wygodna.

**Anty-cele (porażka, nawet jeśli „działa”)**
- **Pokazanie błędnego wyniku.** Każdy wynik granicy jest sprawdzany niezależnie (5.3).
  Lepiej „tego jeszcze nie rozwiążę” niż zła liczba.
- **Wysyłanie zdjęć lub zadań do sieci.** Wszystko na urządzeniu; z sieci pobierają się
  tylko pliki modeli, raz, za zgodą, z naszego serwera.
- **Kroki zmyślone przez model językowy.** Model może tylko czytać obraz; liczy zawsze kod.
- **Liczenie bez pokazania, co odczytano.** Odczyt ze zdjęcia zawsze trafia do edytowalnego
  pola przed rozwiązaniem.
- Spowolnienie startu apki: modele i SymPy ładowane leniwie, dopiero przy pierwszym użyciu.

## 3. Ograniczenia

- PWA bez frameworka i bez budowania; nowe pliki z `// @ts-check`.
- Offline-first (README: „działa bez sieci i nic nie wysyła”).
- CSP w `index.html`: `script-src 'self'` — WebAssembly (onnxruntime-web, Pyodide) wymaga
  dodania `'wasm-unsafe-eval'`; `connect-src 'self' …` — modele muszą leżeć na naszym
  serwerze, nie na Hugging Face. `vercel.json`: `Permissions-Policy: camera=()` blokuje
  `getUserMedia` — dla aparatu na żywo zmienić na `camera=(self)` (tylko nasza domena).
- Telefony: Android i iPhone **nowsze niż iPhone 12** (odpowiedź Mateusza) — model ok. 60 MB int8
  mieści się; WebGPU opcjonalnie, WASM jako podstawa. iOS Safari i tak ma ostry limit pamięci kart — wzór: `documents-workbench-pwa`
  (`app/pdf-ocr.js`: 1 wątek na telefonie, `app/local-ai.js`: okno zgody, wybór lżejszego modelu).
- Licencje zgodne z MIT apki: Apache-2.0, MIT, BSD, MPL-2.0 tak; AGPL i NC nie.
- Zasady repo: każda komenda ze smoke-testami w `app.js`, w podpowiedziach, przykładach
  i ściądze; wersja + `npm run sync-version`; bez dopisków o AI w commitach.

## 4. Podejścia (rozważone, wybrane przez Claude za zgodą Mateusza)

Mateusz oddał wybór „jak” („wyjdź z pomysłem”); zaakceptował rekomendacje poniżej.

### 4.1 Czytanie zdjęcia

| | Za | Przeciw | Decyzja |
|---|---|---|---|
| **A. PP-FormulaNet-S (PaddleOCR) w onnxruntime-web** | offline; druk 80–100%, ułamki piętrowe 100% (test 6.11); ok. 60 MB po int8; Apache-2.0 | pismo ok. 50% | **główny** |
| B. Qwen3.5 2B VLM (jak `local-ai.js` w Documents) | lepszy na trudnym piśmie | 1,6 GB, wolny, potrafi zmyślać; inna domena niż Documents, więc drugie pobranie 1,6 GB | **odłożone** (decyzja Claude po recenzji): poprawianie z alternatywami pokrywa pismo; wraca tylko, jeśli etap 4 pokaże, że nie wystarcza |
| C. Chmura (Mathpix itp.) | najlepsza jakość | płatna, wysyła zdjęcia, bez offline | **odrzucone** (anty-cel) |
| Tesseract (jest w Documents) | gotowy | 10% trafień na działaniach, 0% ułamków | tylko ewentualnie do tekstu wokół wzorów, nie teraz |

### 4.2 Rozwiązywanie granic

| | Za | Przeciw | Decyzja |
|---|---|---|---|
| **A. Własne reguły krok po kroku** w `math-calculus.js` | kroki po polsku jak na ćwiczeniach; deterministyczne; korzysta z gotowych pochodnych | najbardziej pokręcone zadania przerosną reguły | **kroki** |
| **B. SymPy w Pyodide** (lokalnie, leniwie, ok. 20–30 MB) | policzy prawie każdą granicę poprawnie (algorytm Gruntza) | brak kroków; start kilka sekund | **sędzia i zapas** |
| C. Model językowy liczy | ładne opisy | błędy i zmyślenia | **odrzucone** (anty-cel) |

**Razem A + B:** reguły dają kroki; SymPy niezależnie potwierdza wynik. Gdy reguły się poddadzą,
apka pokazuje wynik SymPy z jasnym dopiskiem „kroków do tego zadania jeszcze nie umiem”.

## 5. Projekt

### 5.1 Zapis granic (wejście ręczne i z odczytu)

Parser rozumie (PL i EN, zapis z `math-steps.js`):
- `granica (sin(x))/x przy x → 0`, `granica … dla x do 0`, `lim x->0 …`, `lim(x→0) …`
- strony: `x → 0+`, `x → 0-`, `x do 0 z prawej/lewej`
- nieskończoności: `x → ∞`, `x → -∞`, `x do nieskończoności`, `inf`
- ciągi: `lim n→∞ …` (zmienna `n`)
- funkcje: wszystko, co zna `math-calculus.js` (sin, cos, tg, ctg, arc…, ln, log, e^, √, ^ wymierne).

Wynik: liczba dokładna (ułamek, `√2/2`, `e^3`, `π/4`), `+∞`, `-∞` albo „granica nie istnieje”
(z powodem: różne granice jednostronne, oscylacja).

### 5.1b Styl kroków (jak na zajęciach Mateusza)

Notatki z ćwiczeń i wykładu (`Ćw: 17.11.26`, `W: 09.11.26`) pokazują konwencje, które kroki
apki mają naśladować:
- symbol nieoznaczony w nawiasie kwadratowym przy pierwszym znaku równości: `[1^∞]`, `[0/0]`,
  `[∞/∞]`, `[∞ − ∞]`;
- granice typu 1^∞ przez wzór `lim (1 + 1/aₙ)^aₙ = e` (i `(1 + x/aₙ)^aₙ → e^x`), z widocznym
  „dorobieniem” wykładnika `aₙ · (…/aₙ)` i nawiasem kwadratowym `[(1 + 1/aₙ)^aₙ]^(…)`;
- przy x → −∞: `√(x²) = |x| = −x` zapisane wprost;
- wyłączanie najwyższej potęgi przed nawias w liczniku i mianowniku;
- wynik końcowy uproszczony (`e^(-6) = 1/e^6`, `e^(1/2) = √e`).

### 5.2 Reguły krok po kroku (kolejność prób)

Każda reguła dopisuje kroki w tym samym formacie co pochodne (`{label, math}`) i ma test.

1. **Podstawienie** — funkcja ciągła w punkcie → wynik. Rozpoznanie symbolu nieoznaczonego
   (0/0, ∞/∞, ∞−∞, 0·∞, 1^∞, 0^0, ∞^0) i napisanie go wprost w kroku.
2. **Wspólny mianownik / uproszczenie ułamków piętrowych** — ułamek w ułamku sprowadzony do
   jednego ilorazu (to częsty pierwszy krok w trudnych zadaniach Mateusza).
3. **Rozkład na czynniki i skrócenie** — wielomiany (gotowy rozkład z `math-steps.js`).
4. **Mnożenie przez sprzężenie** — różnice z pierwiastkami (`√a − √b`; sześcienne przez
   `a³ − b³ = (a − b)(a² + ab + b²)`; czwartego stopnia przez `a⁴ − b⁴`), w liczniku lub
   mianowniku, także `√a − c` z liczbą.
4b. **Logarytmy**: `log_a f − log_a g = log_a (f/g)`, `k·log_a f = log_a f^k`, potem granica
   argumentu (ciągłość logarytmu).
5. **x → ±∞: wyłączenie najwyższej potęgi** licznika i mianownika (także pod pierwiastkiem:
   `√(x² + x) = |x|·√(1 + 1/x)`, ze znakiem dla −∞).
6. **Granice znane**: `sin u/u → 1`, `(1 + 1/u)^u → e`, `(e^u − 1)/u → 1`, `ln(1+u)/u → 1`,
   `(a^u − 1)/u → ln a`, `((1+u)^k − 1)/u → k` — z podstawieniem `u` widocznym w kroku.
7. **1^∞ przez e**: `lim f^g = e^(lim g·(f − 1))`.
8. **Reguła de l'Hospitala** dla 0/0 i ∞/∞, z pochodnymi z `dExpr` (kroki pochodnych zwinięte),
   najwyżej 3 razy, i tylko gdy wyrażenie się nie komplikuje (miara rozmiaru drzewa).
9. **Jednostronne** — gdy znak mianownika decyduje (`1/x`, `x → 0±`), osobno lewa i prawa;
   różne → „nie istnieje”.

Reguły łączą się rekurencyjnie (np. 2 → 4 → 1). Limit głębokości jak w całkach (`MAX_DEPTH`).

### 5.3 Pewność wyniku (nigdy błędnego)

Każdy wynik reguł przechodzi dwa niezależne sprawdzenia:
1. **liczbowe** (zawsze, też bez SymPy) — wartości funkcji w ciągu punktów zbliżających się do celu (`x0 ± 10⁻ᵏ`,
   dla ∞: `10ᵏ`), z badaniem zbieżności; dla ∞ — monotoniczny wzrost ponad próg;
2. **SymPy** (gdy załadowany) — `sympy.limit` na tym samym wyrażeniu.

Rozstrzygnięcie (decyzja Claude po recenzji — ten sam standard co dziś dla pochodnych i całek):
- reguły + sprawdzenie liczbowe zgodne → kroki + wynik, bez dopisków (SymPy, jeśli jest,
  sprawdza dodatkowo; jego niezgoda → „Jeszcze tego nie rozwiążę”);
- sprawdzenie liczbowe nie rozstrzyga (oscylacja, wolna zbieżność) → pokazujemy tylko wtedy,
  gdy SymPy potwierdza; bez SymPy → „Jeszcze tego nie rozwiążę”;
- reguły się poddały, SymPy zna wynik i liczby go potwierdzają → wynik bez kroków + dopisek;
- niezgoda albo nic → „Jeszcze tego nie rozwiążę” (+ co wiadomo: wartość liczbowa przybliżona,
  oznaczona „≈, niepotwierdzona”).

SymPy: Pyodide + sympy + mpmath z naszego serwera (`/vendor/pyodide/`), w Web Workerze,
ładowane przy pierwszej granicy, której reguły nie rozwiązały, po zgodzie („pobrać ok. 25 MB?”,
jak okno w `local-ai.js`), potem z cache SW. Bez zgody działa wszystko poza zapasem.

### 5.4 Pierwiastki

`uprość √8` → `2√2`; `√12 + √27` → `5√3`; `1/√2` → `√2/2`; `1/(√3 − 1)` → przez sprzężenie;
`√(a²b)` dla liczb. W tym samym module co upraszczanie (`math-steps.js`), te same kroki.

### 5.5 Skaner — przepływ

```
[ pole wyrażenia ........................ (ikona aparatu) ]
     ↓ aparat na żywo (getUserMedia)          ↓ zapas: plik / galeria / PDF
[ podgląd + prostokątna ramka, poza nią przyciemnienie ]   [ gotowy obraz + ta sama ramka ]
     ramka przesuwana i zmieniana uchwytami (ułamek piętrowy jest wysoki)
     podpowiedzi: „za ciemno”, „rozmazane”, „ustaw równo”
     [ Zrób ] → klatka z wideo, wycięta do ramki
     ↓ automatycznie: usunięcie plamek tuszu dotykających brzegu wycinka
       (skrawki sąsiednich wzorów — patrz 5.10)
     ↓
[ lim(x→0) (√(1+x) − 1)/x ]   ← zwykłe pole, edytowalne; niepewne znaki podświetlone,
                                  stuknięcie → 2–3 alternatywy (x/×, 1/7, …)
     ↓ automatycznie, jak przy wpisaniu
[ kroki rozwiązania (jak dziś) ]   [ Zapisz do Notatek ]
```

- **PDF**: wybór pliku przyjmuje też `application/pdf`; strona renderowana do obrazu przez
  pdf.js (jest w `documents-workbench-pwa/lib/pdfjs/`), wybór strony, potem ten sam przepływ.
  Warstwy tekstowej PDF nie używamy do wzorów (z LaTeX-owego PDF wychodzi rozsypany tekst).
- **Obróbka wstępna** w Web Workerze, bez bibliotek: kod z `documents-workbench-pwa/app/photo-import.js`
  (kartka, perspektywa, wybielenie) + kroki z `SCANNER-PLAN.md` §4 (światło, próg, kratka,
  prostowanie, kadr). Dla pisma: wariant bez progowania (test 6.11 pokazał, że próg szkodzi).
- **Ramka zamiast wykrywania wzorów**: jeden wzór na raz, wskazany przez użytkownika.
- **Aparat w przeglądarce — pułapki do zrobienia od razu dobrze**:
  - `<video playsinline muted autoplay>` (bez `playsinline` iPhone otwiera pełny ekran);
  - `facingMode: 'environment'` i prośba o wysoką rozdzielczość (`width: {ideal: 1920}` lub więcej) —
    domyślne 640×480 jest za słabe na indeksy i wykładniki;
  - zrzut klatki przez `<canvas>.drawImage(video)` (Safari nie ma `ImageCapture`); ramkę przeliczać
    z pikseli ekranu na piksele wideo z uwzględnieniem `object-fit: cover`;
  - zatrzymać ścieżki (`track.stop()`) przy wyjściu, schowaniu karty (`visibilitychange`) i po zrobieniu
    zdjęcia — bateria i zielona kropka;
  - zgoda: przy odmowie albo braku aparatu od razu zapas „wybierz plik”; iPhone w trybie aplikacji
    z ekranu głównego potrafi pytać o zgodę ponownie po każdym uruchomieniu — tego nie obejdziemy;
  - latarka (`applyConstraints({advanced:[{torch:true}]})`) tylko tam, gdzie `getCapabilities().torch`
    — na iPhonie zwykle jej nie ma, więc przy „za ciemno” podpowiedź tekstem;
  - uchwyty ramki: `touch-action: none` tylko na uchwytach, cele ≥ 44 px, `:active` zamiast `:hover`,
    `user-select: none`; przycisk „Zrób” nad `env(safe-area-inset-bottom)`, okno na `100dvh`;
  - sprawdzane tylko na prawdziwym telefonie (emulacja w Chrome nie pokaże zgody, ostrości ani pamięci).
- **Pamięć**: podgląd wideo wyłączony przed uruchomieniem modelu (iPhone: wideo + model naraz to ryzyko).
- **Rozpoznanie**: PP-FormulaNet-S → LaTeX → tłumacz LaTeX → składnia parsera
  (`\lim_{x \to 0}`, `\frac`, `\sqrt[n]`, `\cdot`, `\infty`, `\left( \right)` itd.).
  Tłumacz to czysty JS z testami (para LaTeX → oczekiwany zapis).
- **Gdy odczyt jest słaby** (wynik się nie parsuje albo średnia pewność tokenów < progu):
  „Popraw zaznaczone” + prośba o ostrzejsze zdjęcie. Bez drugiego modelu (patrz 4.1 B).
- **Model**: pliki w `/models/` (cache SW), okno zgody z rozmiarem, usuwanie w ustawieniach.
- **Bez sieci po pobraniu.** Zdjęcie nie opuszcza urządzenia.

### 5.5b Gdzie skaner, co zapisuje (decyzje Claude po recenzji)

- **Ikona aparatu tylko w głównym polu kalkulatora** (zasada „bez dubli”: jedna funkcja = jedno
  miejsce). Tryb Zdanie i notatnik jej nie dostają.
- **„Zapisz do Notatek”** dopisuje do bieżącej notatki jedną zwykłą, żywą linię z działaniem
  (np. `granica (sin x)/x przy x → 0`) — ta sama, którą notatnik i tak przelicza. Kroki nie są
  zapisywane (da się je otworzyć z linii). Bez zmiany formatu notatek, więc bez migracji.
- **Pliki modeli** (ONNX ok. 60 MB, detekcja kilka MB, Pyodide + sympy + mpmath ok. 25 MB)
  w repo w `/models/` i `/vendor/pyodide/`, każdy plik < 50 MB (dzielony, gdy trzeba), serwowane
  z tej samej domeny (`connect-src 'self'` bez zmian), cache SW tylko po zgodzie. Limity Vercela
  na pojedynczy plik i wdrożenie sprawdzić na starcie etapu 2; gdy nie przejdzie — osobny
  hosting plików i jawny wpis w `connect-src`.

### 5.6 „Sprawdź moje rozwiązanie” (etap 4)

Zdjęcie kilku linii kroków (`= … = …`) → każda linia odczytana → sprawdzenie, czy kolejne
linie są sobie równe (liczbowo w punktach próbnych; dla granic — czy przekształcenie zachowuje
granicę) → pierwsza niezgodna linia podświetlona z krótkim „tu wynik się zmienia”.

### 5.7 Etapy (każdy wydawany osobno, z testami)

> **Zmiana kolejności (2026-11-21, decyzja Mateusza):** etap 1 wydany (v1.04.87). Dalej:
> **skaner druku (dawny etap 3) → klawiatura do wzorów (nowy, 5.9) → SymPy (dawny etap 2) → pismo → sprawdzanie rozwiązania.**
> Skaner nie zależy od SymPy: odczyt trafia do pola, liczy istniejący silnik.

1. **Granice + pierwiastki, wpisywane ręcznie** (5.1–5.4, bez SymPy). Zestaw testowy:
   **58 zadań z „Granice ciągów i funkcji — zadania na ćwiczenia 2026”** (zestawy 1–9: wielomiany
   przy n → ∞, pierwiastki, różnice pierwiastków 2., 3. i 4. stopnia, logarytmy, 1^∞, x → ±∞,
   0/0 w punkcie) przepisanych do składni parsera, z odpowiedziami policzonymi raz offline
   w SymPy (skrypt w `scripts/`, wynik zapisany w teście). Przykłady z notatek (`Ćw: 17.11.26`
   zad. 6a–f) sprawdzają też styl kroków z 5.1b.
   **Próg wydania: 0 błędnych wyników, ≥ 80% zestawu z krokami.**
2. **SymPy jako sędzia i zapas** (5.3). Ten sam zestaw: **≥ 98% z pewnym wynikiem**
   (z krokami albo bez), 0 błędnych.
3. **Skaner druku** (5.5 bez pisma): ONNX + tłumacz LaTeX + aparat na żywo z ramką (zapas: plik/PDF z ramką).
   Zestaw zdjęć Mateusza (20–30 wydruków). **Próg: ≥ 80% wzorów odczytanych w całości
   bez poprawek.**
4. **Pismo**: wariant obróbki, niepewne znaki, alternatywy, druga próba ✦. Zestaw zdjęć pisma
   (własne i cudze).
5. **Sprawdź moje rozwiązanie** (5.6).

**Szczegółowy plan** obejmuje etapy 1–2; etapy 3–5 jako zarys, rozpisywane po prototypach
z sekcji 7 (decyzja Claude po recenzji).

### 5.9 Klawiatura do wzorów (nowe, 2026-11-21)

Wpisywanie złożonych granic palcem jest męczące; Mateusz chce trybu jak w Photomacie.
Dwie drogi (do decyzji przy projektowaniu tego etapu, po skanerze):
- **szybka:** dodatkowy rząd przycisków wstawiających kawałki zapisu (`lim x→`, `∞`, `√( )`, `∛`, `( )/( )`, `^`, `²`), pole zostaje tekstem;
- **pełna:** edytor 2D (ułamek piętrowy, pierwiastek, wykładnik u góry) — np. biblioteka MathLive (MIT, offline, ok. 1 MB), wynik zamieniany na zapis parsera.
- **Wymaganie Mateusza (2026-11-22, po teście skanera):** zeskanowany wzór wyświetla się w polu graficznie
  (ułamki, pierwiastki, potęgi jak na kartce), nie tylko liniowym tekstem — przemawia za drogą „pełną”.

### 5.8 Dane testowe (odpowiedzi Mateusza)

- Mateusz da zdjęcia: wydruki zadań i notatki (swoje i cudze).
- Pliki już przekazane (lokalnie, poza repo):
  - `~/Library/Mobile Documents/com~apple~CloudDocs/Dokumenty szkoła /Granice ciagow i funkcji
    zadania na cwiczenia 2026.pdf` — wydruk LaTeX, 4 strony, 58 zadań: zestaw etapu 1
    i materiał „druku” do etapu 3 (strony renderowane do obrazów, każdy wzór wycięty osobno);
  - `~/Downloads/6 dokumentów/` — notatki z ćwiczeń i wykładów (pismo z tabletu, rozwiązania
    krokami przez „=”): materiał „pisma” do etapu 4 i wzorzec do „Sprawdź moje rozwiązanie”.
- **W repo zostają tylko przepisane wyrażenia i oczekiwane wyniki.** PDF-y, zdjęcia i wycinki
  pisma leżą w `test/fixtures-local/` dodanym do `.gitignore` (cudze pismo i materiały z zajęć
  nie trafiają do publicznego repo). Test skanera pomija się, gdy folderu nie ma.

### 5.10 Próba techniczna PP-FormulaNet-S (2026-11-21, w toku)

Środowisko poza repo: `~/.venvs/paddle-onnx` (Python 3.12, paddlepaddle 3.3.1, paddle2onnx 2.1,
onnxruntime 1.32). Wycinki: 58 wzorów z PDF-u (200 dpi) w `test/fixtures-local/`.

- **Konwersja** `paddle2onnx` (opset 18): cały model w jednym grafie — koder + pętla dekodera
  (`Loop`) — wejście `x [1,1,384,384]` (szarość, norm. 0.7931/0.1738), wyjście identyfikatory tokenów.
  Słownik tokenów: `inference.yml` → `PostProcess.character_dict.fast_tokenizer_file`.
  **ONNX = Paddle w 58/58** odczytach.
- **Rozmiar**: 309 MB po konwersji. 77 MB to maska 0/1 (50000×384) mnożona przez osadzenia —
  wpieczona w wagi i usunięta → 232 MB, odczyty bez zmian 58/58. Kwantyzacja int8 dekodera
  (`quantize_dynamic`, MatMul + Gather, `EnableSubgraph`) → **99 MB**, 51/58 identycznych
  (5 różnic tylko w zapisie, 1 poprawa, 1 pogorszenie), ok. 0,1 s/wzór na Macu (CPU).
  Dekoder per kanał + wagi Conv jako int8 z `DequantizeLinear` (liczenie w fp32) → **59 MB**.
- **Kadrowanie decyduje**: skrawki sąsiednich wzorów na brzegu wycinka psują odczyt.
  Usunięcie plamek tuszu dotykających górnej/dolnej krawędzi (connected components)
  naprawia prawie wszystkie. Stąd ramka + to czyszczenie w 5.5.
- **Trafienia** (odczyt → prototyp tłumacza LaTeX → to samo zadanie co w `limits-zestaw.json`,
  sprawdzane liczbowo → kalkulator je rozwiązuje):

  | wariant | rozmiar | trafienia |
  |---|---|---|
  | wycinki ze skrawkami, fp32 | 232 MB | 37/58 (64%) |
  | wycinki oczyszczone, fp32 | 232 MB | 52/58 (90%) |
  | int8 per kanał + Conv int8 (Python) | 59 MB | 52/58 (90%) |
  | to samo w onnxruntime-web 1.31.1 (Node i Chrome) | 59 MB | 51/58 (88%) |

  Próg etapu 3 (≥ 80%) spełniony na wydruku z PDF-u; zdjęcia aparatem jeszcze nie badane.
  Każdy odczyt, który dał dobre zadanie, kalkulator rozwiązał. Błędne odczyty kończą się
  błędem tłumacza albo innym wyrażeniem — dlatego odczyt zawsze trafia do pola do sprawdzenia.
- **onnxruntime-web wymaga dwóch poprawek grafu** (Python je tylko ostrzega): usunąć
  zadeklarowane kształty wyjść podgrafów `Loop`/`If` i zamienić stałe w gałęzi „then” `If.3`
  na skalary (zmienna pętli startuje jako skalar). Po tym: Chrome na Macu, 4 wątki —
  wczytanie 0,4 s, **~0,26 s/wzór**; Node 1 wątek ~0,85 s/wzór; pamięć procesu ~0,5–0,6 GB.
- **Wątki**: wielowątkowy WASM wymaga `crossOriginIsolated` (nagłówki COOP/COEP w `vercel.json`);
  bez nich 1 wątek (~3× wolniej). Do decyzji przy etapie 3 (COEP może blokować zasoby z innych domen).
- Skrypty próby (w brudnopisie, do przeniesienia do `scripts/formula-onnx/` przy planie):
  konwersja + odchudzenie + kwantyzacja, poprawki grafu, wycinanie wzorów z PDF, czyszczenie
  brzegów, prototyp tłumacza LaTeX, ocena trafień.
- **Pobieranie**: model 59 MB kompresuje się gzipem do 37 MB. W apce: kawałki `.gz` < 50 MB,
  rozpakowywane w przeglądarce (`DecompressionStream`), każdy kawałek zapisany od razu
  (cache SW / IndexedDB), żeby przerwane pobieranie szło dalej, a nie od zera; pasek postępu w MB.
- **iPhone (Safari 27.2) mierzyć tylko przez HTTPS.** Ta sama strona przez `http://` w sieci
  domowej: JS ok. 14× wolniejszy (test JS 2601 ms vs 184 ms przez HTTPS), brak WebGPU,
  brak `crossOriginIsolated`; model w WASM: wczytanie 103 s, 26–38 s/wzór. Lokalnie: serwer
  HTTPS z własnym certyfikatem (`openssl req -x509 …`, ostrzeżenie Safari do ominięcia).
- **WebGPU** (Chrome na Macu): wymaga wag „int8 + DequantizeLinear” zamiast MatMulInteger
  i zwinięcia stałych (`Range` → stała; ORT `ENABLE_BASIC` z zapisem modelu). Działa, ale
  1,7 s/wzór — wolniej niż WASM (0,26 s), bo pętla dekodera kopiuje dane GPU↔CPU przy każdym znaku.
- **iPhone przez HTTPS (z COOP/COEP → `crossOriginIsolated`, 4 wątki), model 59 MB int8, WASM:**
  pobranie 37 MB (gzip) 7,6 s w sieci domowej, wczytanie 2,6 s, **odczyt 0,39–0,72 s/wzór
  (średnio 0,5 s)** na 58 wzorach; karta nie padła z braku pamięci. Liczby tokenów zgodne z Makiem.
  **Wniosek: próba techniczna zaliczona** — w apce WASM + 4 wątki (nagłówki COOP/COEP
  w `vercel.json` do sprawdzenia z resztą strony), WebGPU niepotrzebne.

### 5.10b Udawane zdjęcia — bramka etapu (2026-11-22)

Pomiar **kodem apki**: `scripts/formula-onnx/app-read.mjs` (Chrome, `MATM0_OCR.read` — ten sam worker,
białe tło, przycinanie i model 59 MB co na telefonie) → `score.js`. Baza: `wzory-przyciete` (58 wycinków
z PDF, 200 dpi, ze skrawkami sąsiadów u góry). Warianty z `prep.js` (psucie) i `crop.py --pad` (luźna
ramka na prawdziwej stronie). Próg etapu: ≥ 80% = 47/58.

| wariant | trafienia | bramka |
|---|---|---|
| wycinek ze strony (bez psucia) | 52/58 (90%) | tak |
| baza `wzory-przyciete` | 50/58 (86%) | tak |
| rozmycie (sigma 1,2 px) | 50/58 | tak |
| szare tło | 49/58 | tak |
| ciepła lampa + winieta | 51/58 | tak |
| cień ręki (do 50% jasności) | 51/58 | tak |
| zdjęcie ekranu (mora, subpiksele) | 49/58 | tak |
| JPEG ok. jakości 35 | 48/58 | tak |
| pod kątem (15% trapez strony, obrót 2,5°) | 49/58 | tak |
| ramka za luźna (puste pole 35%) | 48/58 | tak |
| pod kątem + rozmycie + JPEG | 43/58 (74%) | nie |
| cień + lampa + JPEG | 45/58 (78%) | nie |
| ramka za ciasna (3 px w głąb tuszu) | 42/58 (72%) | nie |
| **ramka +30% wysokości na ciasnej stronie** | **18/58 (31%)** | **nie** |

Wnioski:
- Pojedyncze zakłócenia zdjęcia przechodzą bramkę; spadki dopiero przy kilku naraz i przy złym kadrze.
- **Największa dziura to dwa wzory w ramce.** Na ciasno złożonej stronie ramka o 30% za wysoka łapie
  cały sąsiedni wzór; `trimEdgeBlobs` usuwa tylko plamy dotykające krawędzi, więc model czyta oba
  (30 z 40 pudeł to `\begin{array}` albo dwa „lim”). Propozycja (do decyzji): w workerze podzielić tusz
  na wiersze po pustych pasach i zostawić wiersz najbliżej środka ramki (z progiem przerwy względem
  wysokości znaku, żeby nie rozcinać ułamków).
- Tłumacz LaTeX dostał poprawki na typowe potknięcia modelu przy zdjęciach: głowa granicy
  (`\mathop{lim}`, `\ operatorname\* {l i i}`, `{mathop\mathrm{lim}}`) → `\lim`, resztka etykiety „(b)”
  przed `lim`, podwojony ukośnik (`\\frac`), sklejone `\fracfrac`. Na tych samych odczytach
  (754 = 13 wariantów × 58): dobre 618 → 647, złe wstawiane bez ostrzeżenia 38 → 37, „niepewne” 30 → 9
  (śmieci typu `? f r a c` są teraz zwykłym błędem; zostają prawdziwe pojedyncze znaki jak `n^(?)`).
- `run.py` (Python) daje na tych samych wycinkach ok. 25/58 — jego przygotowanie obrazu odbiega od apki;
  do pomiarów używać `app-read.mjs`. Folder `wzory-czyste` ma obcięte pierwiastki i nawiasy (stare
  przycinanie w Pythonie) — nie nadaje się na bazę.
- **v1.04.94 — wzór najbliżej środka ramki** (`keepCentralLine` w workerze, po `trimEdgeBlobs`): tusz
  dzielony na pasy wierszy; granica między wzorami = pusta przerwa ≥ 15% wysokości wyższego sąsiada
  (min. 4 px; wewnątrz wzoru przerwy 0–3 px, granice 16–31 px); zostaje grupa najbliżej środka spośród
  co najmniej w połowie tak wysokich jak najwyższa. Do tego: resztka etykiety z lewej (`\, ) , , *`),
  filtr śmieci (`(^n`, `*)`, `(,)`) i obca zmienna w granicy (`lim x→3 … r^3`) jako błąd.
  Wyniki: ramka +30% **18 → 37/58**, ramka +60% (trzy wzory) **2 → 36/58**, luźna 48 → 51, baza 50 → 52;
  pod kątem 49 → 47 i po −1 w trzech wariantach (model wrażliwy na zmianę kadru — obrazy po cięciu
  sprawdzone, znika tylko skrawek). Na 870 odczytach (15 wariantów): dobre **618 → 703**, złe wstawiane
  bez ostrzeżenia **38 → 35**, niepewne 30 → 14.
- Prawdziwe zdjęcia z telefonu nadal potrzebne do potwierdzenia (zestaw syntetyczny nie pokaże np.
  odbić światła na błyszczącym papierze ani zagięcia kartki). Później: UniMER-Test jako druga próba.

### 5.11 Na później: odczyt na żywo w ramce (pomysł Mateusza, 2026-11-22)

Cel dalekiego etapu (po piśmie i „Sprawdź moje rozwiązanie”): podgląd aparatu z ramką **czyta
sam, bez „Zrób”** — gdy wzór w ramce jest czytelny, apka go łapie albo pyta „Złapać?”.
- Wykonalne w PWA: odczyt na iPhonie ok. 0,5 s (5.10), więc ok. 1 odczyt/s z klatki podglądu
  w tym samym workerze; złapanie, gdy 2 kolejne odczyty dają ten sam poprawny zapis
  (`latexToExpr` bez błędu) i obraz jest ostry (`blurScore`) i jasny.
- Koszt: bateria i grzanie — odczyt tylko gdy obraz stoi (mała zmiana między klatkami),
  przerwa po kilku nieudanych, wyłączenie przy niskiej baterii / `prefers-reduced-data`.
- Przed decyzją: pomiar zużycia baterii i temperatury na iPhonie w 2–3 min podglądu.

### 5.12 Na później: wzory w krokach — podświetlenie i dymek (pomysł Mateusza, 2026-11-22)

Gdy krok rozwiązania korzysta ze znanego wzoru (podstawówka, liceum, studia — np. a² − b²,
(a + b)², wzór na e, pochodna xⁿ, całka z tablicy), miejsce użycia jest **wyróżnione** i można je
**stuknąć**: dymek pokazuje sam wzór, jedno zdanie „po co tu” i skąd jest (np. „wzór skróconego
mnożenia, szkoła podstawowa”).
- Podstawa już jest: kroki nazywają wzory w etykietach (`'Wzór na e'`, `'a³ − b³ = …'`,
  `'Wzór z tablicy'` w `math-limits.js` / `math-calculus.js`), a dymek na stuknięcie to
  `data-hint-tap` z `js/cursor-hint.js`. Do zrobienia: pole `formula` w kroku
  (`{ id, wzór, poCo, poziom }`), jeden słownik wzorów zamiast tekstu rozsianego po etykietach,
  wyróżnienie w szufladzie kroków (podkreślenie + ikona, nie sam kolor) i dymek.
- Propozycja Claude: **zawsze dostępne, ale dyskretne** (podkreślenie, nie krzykliwy kolor), bez
  osobnego ustawienia „czasami/często/zawsze” — kto nie stuka, ten nie widzi dymka. Ustawienie dopiero,
  gdyby w testach przeszkadzało.
- Dobrze łączy się z 5.9 (wzór w dymku narysowany graficznie, jak na kartce) — robić po nim.
- Testy: każdy wzór ze słownika ma przykład, w którym krok go używa (smoke-test, że dymek ma treść).

## 6. Zostawione wykonawcy

- Dokładna kolejność i warunki prób w 5.2 (poza zasadą: najpierw proste, de l'Hospital później).
- Progi pewności i liczba punktów w sprawdzeniu liczbowym.
- Konwersja PP-FormulaNet-S do ONNX i kwantyzacja (paddle2onnx, int8) — z pomiarem
  trafień przed/po.
- Wygląd okna kadrowania i podświetleń (w stylu obecnego pola i ściągi; skille UI:
  `emil-design-eng`, `mobile-native`, `gestures`).

## 7. Ryzyka do sprawdzenia na początku etapów

- **Pyodide a CSP**: czy wystarczy `'wasm-unsafe-eval'`, czy potrzebne `'unsafe-eval'` —
  sprawdzić w szybkim prototypie przed etapem 2; jeśli potrzebne `'unsafe-eval'`, SymPy działa
  w osobnym Workerze z własną polityką albo odpada (wtedy tylko reguły + liczby).
- **Pamięć iOS**: ONNX (~60 MB) + Pyodide (~25 MB) naraz — nie ładować obu jednocześnie.
- **Pismo cudze**: ~50% to wynik na czcionkach; prawdziwe pismo może być gorsze — dlatego
  poprawianie jest obowiązkowe, nie dodatkiem.
