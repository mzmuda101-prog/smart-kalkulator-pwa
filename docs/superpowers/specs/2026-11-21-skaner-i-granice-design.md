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
- Kilka wzorów na zdjęciu → wybór stuknięciem.
- „Zapisz do Notatek” z rozwiązania.
- Później: „Sprawdź moje rozwiązanie” (zdjęcie własnych kroków → pierwszy błędny krok).

**Nie-cele (teraz)**
- Przepisywanie całych stron notatek do edytowalnego tekstu (OCR tekstu + układ strony).
- Wykresy, geometria, zadania z treścią („pociąg jedzie…”).
- Szeregi, całki wielokrotne, równania różniczkowe.
- Podgląd aparatu na żywo w pierwszej wersji (najpierw systemowy aparat przez `<input capture>`).

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
  `getUserMedia`, ale nie `<input type="file" capture>`.
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
     ↓ systemowy aparat albo plik (<input type="file" accept="image/*" capture>)
[ zdjęcie + ramka kadrowania (uchwyty, palcem) ]
     wykryte wzory obrysowane → stuknięcie wybiera jeden
     podpowiedzi: „za ciemno”, „rozmazane”, „ustaw równo” (przed rozpoznaniem)
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
- **Wykrywanie wzorów na stronie**: PP-OCR detection (lekki, kilka MB) — ramki wokół linii/wzorów.
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
3. **Skaner druku** (5.5 bez pisma): ONNX + tłumacz LaTeX + kadrowanie + wybór wzoru.
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
