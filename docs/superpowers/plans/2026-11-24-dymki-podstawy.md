# Dymki przy podstawach — plan wykonania

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Każdy krok-przekształcenie ma dymek z regułą (100% w `queries.js`), a nowe rodzaje kroków bez dymku zatrzymuje automatyczna bramka w testach.

**Architecture:** Tabela `STEP_RULES` (dane) i `attachRule` w `js/step-formulas.js`, wołane centralnie na końcu `S.run` dla każdego kroku każdego sposobu. Bramka `test/step-coverage.js` z jawną listą kroków-stwierdzeń i malejącą listą `PENDING` (rodzaje jeszcze bez hasła), która w ostatnim zadaniu ma być pusta. W UI przycisk z książką dla kroków z dymkiem, ale bez koloru `⟦…⟧`.

**Tech Stack:** czysty JS, testy Node, SymPy, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-24-dymki-podstawy-design.md`

## Global Constraints
- Kopia robocza `.worktrees/dymki-podstawy` (gałąź `dymki-podstawy`), symlinki `node_modules` i `scripts/steps-check/.venv`.
- Wynik żadnego zadania się nie zmienia (`node test/results-unchanged.js`).
- Każde nowe hasło: `name`, `tex`, `why`, `level`, `more` z „Skąd wzór:” (od tego, co uczeń zna) i „Skąd nazwa:” (tylko fakty), wiersz indeksu (dział, poziom, słowa, `try`, `expect`, powiązane). `try` musi naprawdę dawać `expect`. Każda równość w prozie przechodzi `npm run check:steps`.
- Hasło musi być prawdziwe dla każdej etykiety, którą obsługuje. Zdanie „dlaczego” ma ≤ 25 słów i nie powtarza dymku (`node test/step-why.js`).
- UI: tokeny kolorów, ikona lucide inline SVG z `currentColor`, cel dotyku ≥ 24×24 px, `aria-label`, `:hover` tylko w `@media (hover: hover)`. Bez emoji.
- Commity w formacie `typ(kalkulator): tytuł po polsku`, z punktami, bez dopisków o AI. Nigdy samego `git stash`. Do sprawdzania silnika plik-skrypt, nie `node -e`. Długie limity czasu.

## Review Focus
1. Etykieta z liczbą lub zmienną w środku („Dzielę obie strony przez 2”, „Skracamy n²”, „Wyłączamy √n przed nawias”): wzorzec ją łapie, a hasło pasuje (test w zad. 1).
2. Krok, który już ma własny `formula`, nie dostaje nadpisanego dymku z tabeli (test w zad. 1).
3. Sposób drugi w przełączniku (`explain.methods[1]`) też dostaje dymki (test w zad. 1).
4. Przycisk z książką nie pojawia się przy kroku z kolorem `⟦…⟧` i nie dubluje dymku (test e2e w zad. 2).
5. Hasło „podstawianie liczby” jest prawdziwe i dla `x = 2`, i dla `n → ∞` (podstawienie granicy), albo to dwa różne hasła (test w zad. 4).

---

### Task 1: Tabela reguł, `attachRule` i bramka pokrycia

**Files:** Modify `js/step-formulas.js` (`STEP_RULES`, `attachRule`, eksport), `js/math-steps.js` (wywołanie w `S.run` na wszystkich `explain.steps` i `explain.methods[*].steps`). Create `test/step-coverage.js` (dopisz do `scripts/run-tests.mjs`).

**Interfaces:**
- Produces: `STEP_RULES: Array<{ re: RegExp, id: string, here?: (step) => string }>`; `attachRule(step) → step` (mutuje i zwraca; nic nie robi, gdy `step.formula` już jest albo etykieta to stwierdzenie); `STATEMENTS: RegExp[]` (lista kroków-stwierdzeń z punktu 2 spec).
- `test/step-coverage.js`: przechodzi przez wszystkie zadania z `queries.js` i wszystkie sposoby. Krok, który nie jest stwierdzeniem, nie ma `formula.id` i nie pasuje do żadnego wzorca z jawnej listy `PENDING` (znormalizowane etykiety jeszcze bez hasła), oznacza błąd. Na końcu wypisuje liczbę rodzajów w `PENDING` i procent pokrycia.

- [ ] **Step 1: Testy, które mają paść.**
  - `attachRule({label:'Redukuję wyrazy podobne', math:'…'})` dostaje id istniejącego hasła albo zostaje bez dymku, jeśli rodzaj jest w `PENDING`. Na tym etapie tabela może mapować tylko na istniejące hasła, np. „Liczę pierwiastek z delty” → `delta`, „Składam całość” → `postac-iloczynowa`, „Rozkład na ułamki proste” → istniejące hasło, jeśli jest.
  - Krok z własnym `formula` zostaje nietknięty.
  - `explain.methods[1].steps` też przechodzi przez `attachRule`.
  - `test/step-coverage.js` jest zielony z pełną listą `PENDING` wygenerowaną z obecnego stanu.
  - Każdy wpis `PENDING` jest naprawdę używany: bramka pada, gdy wpis jest zbędny, żeby lista tylko malała.
- [ ] **Step 2:** Run: `node test/step-coverage.js`. Expected: FAIL przed implementacją.
- [ ] **Step 3:** Implementacja. Mapuj od razu wszystkie rodzaje, które pasują do istniejących haseł.
- [ ] **Step 4:** Run: `node test/step-coverage.js && node test/step-why.js && node test/step-popovers.js && node test/expr-to-latex.js && node test/results-unchanged.js && npm run check:steps`. Expected: PASS. Zapisz w raporcie procent pokrycia przed i po.
- [ ] **Step 5:** Commit `feat(kalkulator): dymki — reguły kroków jako dane i bramka pokrycia`.

### Task 2: Przycisk z książką dla dymku bez koloru

**Files:** Modify `app.js` (`renderStepsView`, `_openStepsPop` lub odpowiednik), `styles.css`. Test: `test/e2e/steps-drawing.spec.js`.

- [ ] **Step 1: Test e2e, który ma paść.** Dla kroku z `formula` i bez `⟦…⟧` (wybierz zadanie, które po zad. 1 ma taki krok, np. „Liczę pierwiastek z delty” w `rozwiąż x^2-5x+6=0`, sposób Delta):
  - w wierszu etykiety jest `button.steps-rule-btn` z `aria-label` zaczynającym się od „Reguła:”;
  - kliknięcie otwiera `.steps-pop` z nazwą hasła, a Esc go zamyka i oddaje fokus przyciskowi;
  - przy kroku z `⟦…⟧` takiego przycisku nie ma;
  - rozmiar przycisku ≥ 24×24 px.
- [ ] **Step 2:** Run: `npx playwright test test/e2e/steps-drawing.spec.js --project=mobile`. Expected: FAIL.
- [ ] **Step 3:** Implementacja. Ikona lucide `book-open` jako inline SVG z `currentColor`, kolor z tokenu akcentu. Dymek ten sam co dziś: pozycja przy przycisku, linijka „W tym zadaniu:” i „W podręczniku ›”.
- [ ] **Step 4:** Run: `npx playwright test test/e2e/steps-drawing.spec.js test/e2e/handbook.spec.js --project=mobile --project=desktop`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(kalkulator): kroki — przycisk reguły dla dymku bez koloru`.

### Task 3: Hasła — równania i przekształcenia algebraiczne

Hasła: wyrazy podobne, przenoszenie na drugą stronę, działanie na obu stronach (dzielenie, mnożenie, zmiana znaku, pierwiastkowanie obu stron, zamiana stron), opuszczanie nawiasów, iloczyn równy zero, sprawdzenie rozwiązania, współczynniki trójmianu, dziedzina (ułamek, pierwiastek, logarytm), wartość bezwzględna (przypadki), równość logarytmów i potęg o tej samej podstawie, jeśli nie ma, rozkład na czynniki pierwsze. Reguły w `STEP_RULES` dla wszystkich etykiet tych rodzajów, a wpisy usunięte z `PENDING`.

- [ ] **Step 1:** Testy: `node test/step-coverage.js` bez tych wpisów w `PENDING` → FAIL; `handbook-data` z nowymi hasłami (try/expect) → FAIL.
- [ ] **Step 2:** Hasła i reguły. Tam, gdzie się da, dodaj `here` (np. przenoszenie: która liczba i z jakim znakiem).
- [ ] **Step 3:** Run: `node test/step-coverage.js && node test/handbook-data.js && node test/step-popovers.js && node test/step-why.js && npm run check:steps && node test/results-unchanged.js`. Expected: PASS.
- [ ] **Step 4:** Commit `feat(kalkulator): dymki — podstawy równań`.

### Task 4: Hasła — granice

Hasła: wyłączanie najwyższej potęgi (i skracanie przez nią), c/nᵏ → 0, podstawianie liczby (x = a) i „podstawienie” przy n → ∞ (rozstrzygnij, czy to jedno hasło, i zapisz decyzję), skracanie wspólnego czynnika (Skracamy (x − a)), granica jednostronna, granica sumy / „Dodajemy granice”, ciągłość logarytmu, „Zapisujemy inaczej” (jeśli da się nazwać regułę; inaczej rodzaj zostaje w `PENDING` z uzasadnieniem i trafia do tabeli skoków). Reguły i `PENDING` jak w zad. 3.

- [ ] Steps 1–4 jak w zad. 3. Dodatkowo `node test/math-limits.js`. Commit `feat(kalkulator): dymki — podstawy granic`.

### Task 5: Hasła — analiza i reszta

Hasła: liniowość pochodnej (stała przed pochodną, mnożenie przez stałą), pochodna złożona („Mnożę przez pochodną środka”, jeśli brak), liniowość całki (stała przed całką, całka sumy, całka stałej), podstawienie w całce i powrót do zmiennej, ułamki proste (wyznaczanie A i B, każdy ułamek daje logarytm), przez części (jeśli brak w regułach), kolejność działań, dodawanie i odejmowanie liczników, skracanie ułamka, procent z liczby, wierzchołek i postać kanoniczna, jeśli brak. Na końcu `PENDING` ma być **pusta**, a bramka sprawdza 100%.

- [ ] Steps 1–4 jak w zad. 3. Dodatkowo `node test/math-calculus.js && node test/math-steps.js`. W bramce zmień `PENDING` na pustą tablicę. Commit `feat(kalkulator): dymki — analiza i reszta, pokrycie 100%`.

### Task 6: Uczeń, przegląd, wydanie

- [ ] **Step 1:** „Słaby uczeń” czyta wszystkie nowe hasła (pytanie „czy wiesz, skąd ten wzór się wziął?”) i po 2 zadania na każde hasło, żeby sprawdzić, czy dymek pasuje do kroku. Uwagi krytyczne napraw z testem, resztę dopisz do tabeli skoków.
- [ ] **Step 2:** Zrzut z telefonu (390×844): krok z przyciskiem książki i otwarty dymek, jasny i ciemny motyw.
- [ ] **Step 3:** Końcowy przegląd całej gałęzi (najmocniejszy model) i jedna tura poprawek.
- [ ] **Step 4:** `version.js` → `v1.05.65`, `npm run sync-version`, `npm run test:predeploy`, `npm run check:steps`.
- [ ] **Step 5:**
  - wiersz v1.05.65 w `HANDOFF-kroki.md`;
  - `HANDOFF-nastepna-rozmowa.md`: następny krok to paczka B sposobów albo 2a-2, do decyzji Mateusza; dopisz zasadę „każdy nowy krok musi przejść `test/step-coverage.js`”;
  - w `AGENTS.md`, sekcja Testy, jedna linia o bramce pokrycia dymków.
- [ ] **Step 6:** Merge ff na main, commit `feat(kalkulator): dymek przy każdym przekształceniu (v1.05.65)`, push.
