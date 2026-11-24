# Rozkład jak w szkole (paczka A) — plan wykonania

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jedna funkcja rozkładu wielomianu po szkolnemu, używana przez granice 0/0, `rozwiąż`, `rozłóż` i `uprość`. Horner zostaje jako ostatnia deska ratunku i jako osobny sposób w przełączniku. Przełącznik: najpierw najkrótszy sposób, potem szkolny.

**Architecture:** `schoolFactor` siedzi w `js/math-steps.js` i jest wystawiona w `_core`, jak `hornerHere`. Granice (`js/math-limits.js` `factorCancel`) dostają tryb `'school' | 'horner'`, wybierany tym samym mechanizmem co dziś `_prefer`. Nowe dymki to nowe hasła w `js/step-formulas.js`. Kolejność przycisków ustawia `app.js` `renderStepsView`.

**Tech Stack:** czysty JS, testy Node, SymPy (`npm run check:steps`), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-24-rozklad-szkolny-design.md`

## Global Constraints
- Kopia robocza `.worktrees/rozklad-szkolny` (gałąź `rozklad-szkolny`), symlinki `node_modules` i `scripts/steps-check/.venv`.
- Tekst wyniku (`S.run(q).text`) każdego zadania z `scripts/steps-check/queries.js` się nie zmienia, chyba że dziś to „Jeszcze tego nie rozwiążę”. Pilnuje tego bramka z zadania 1.
- Sposób w przełączniku musi dać ten sam wynik co pierwszy sposób.
- Każde „=” przechodzi `npm run check:steps`. Zdanie „dlaczego” ma ≤ 25 słów i nie powtarza dymku (`node test/step-why.js`). Każdy krok rysuje się bez zapisu z klawiatury (`node test/expr-to-latex.js`). Każdy `formula.id` ma hasło (`node test/handbook-data.js`, `node test/step-popovers.js`).
- Bez emoji. Commity w formacie `typ(kalkulator): tytuł po polsku`, z punktami, bez dopisków o AI. Nowe pliki JS zaczynają się od `// @ts-check`.
- Do sprawdzania silnika używaj pliku-skryptu, nie `node -e`. Nigdy nie używaj samego `git stash`. Komputer bywa obciążony, więc dawaj długie limity czasu.
- Domyślny sposób to nadal najkrótszy (app.js `openStepsView`, bez zmian).

## Review Focus
1. Wielomian bez pierwiastków wymiernych (`rozłóż x^2+x+1`) daje ten sam wynik co dziś, a `schoolFactor` zwraca `null` albo kroki bez fałszu (test w zad. 2).
2. Ułamkowy współczynnik prowadzący (`rozłóż 2x^2-3x+1` → (2x − 1)(x − 1)): Viète się nie odpala, idzie delta, a wynik jest bez zmian (test w zad. 2).
3. Pierwiastek wielokrotny w granicy (`lim x→1 (x^3-3x+2)/(x^2-2x+1)` → 3): drogi szkolna i Horner dają ten sam wynik (test w zad. 4).
4. Dwukwadratowy bez pierwiastków wymiernych po t (`rozwiąż x^4-3x^2+1=0`): wynik jak dziś, bez fałszywego „rozkładu” (test w zad. 3).
5. Mianownik zeruje się w innym punkcie niż granica (`uprość (x^2-4)/(x+2)` i `uprość x/(x^2-x)`): zastrzeżenie wymienia wszystkie wykluczone wartości (test w zad. 5).

---

### Task 1: Bramka „wyniki bez zmian” i hasła podręcznika

**Files:** Create `test/results-unchanged.js`, `test/fixtures/results-base.json`. Modify `js/step-formulas.js` (3 nowe hasła), `scripts/run-tests.mjs` (dopisz nowy test do listy, wzorem istniejących).

**Interfaces:**
- Produces: hasła `wylaczanie-przed-nawias`, `grupowanie-wyrazow`, `podstawienie-t` w `FORMULAS` (pola jak `roznica-kwadratow`: `name`, `tex`, `why`, `level`, `more` z „Skąd wzór:” i „Skąd nazwa:”, wpis w indeksie haseł z działem, słowami, `try`/`expect` i powiązanymi).
- Produces: `test/results-unchanged.js`. Porównuje `S.run(q).text` dla wszystkich `require('../scripts/steps-check/queries.js')` z `results-base.json`. Różnica jest dozwolona tylko tam, gdzie w bazie stoi „Jeszcze tego nie rozwiążę” albo `null`.

- [ ] **Step 1:** Wygeneruj `results-base.json` na obecnym kodzie, jednorazowym skryptem w scratchpadzie (nie w repo). Format: `{ [q]: text|null }`. Zapisz w commicie, ile jest zadań.
- [ ] **Step 2:** Napisz `test/results-unchanged.js`. Run: `node test/results-unchanged.js`. Expected: `0 różnic`.
- [ ] **Step 3:** Hasła. `try` haseł:
  - `wylaczanie-przed-nawias`: `rozłóż x^3-x`, expect `x(x − 1)(x + 1)`, wynik jak dziś;
  - `grupowanie-wyrazow`: `rozłóż x^3-2x^2+x-2`, expect z dzisiejszego wyniku tego zadania;
  - `podstawienie-t`: `rozwiąż x^4-5x^2+4=0`, expect `x₁ = −2, x₂ = −1, x₃ = 1, x₄ = 2` (sprawdź dokładny zapis po zad. 3 i popraw expect w tym samym commicie zad. 3).

  Jeśli `try` jeszcze nie działa (zad. 3), test haseł ma to wiedzieć: wzorem istniejących, `handbook-data` sprawdza try/expect, więc tymczasowo zostaw `try` hasła `podstawienie-t` na zadaniu, które działa już dziś, i popraw je w zad. 3.

  Treść: „Skąd wzór” w duchu skilla `bottom-up` (od czegoś, co uczeń umie), a „Skąd nazwa” w duchu `term-origins` (tylko pewne fakty). Każda równość z haseł przechodzi `npm run check:steps`.
- [ ] **Step 4:** Run: `node test/handbook-data.js && node test/step-popovers.js && npm run check:steps && node test/results-unchanged.js`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(kalkulator): bramka „wyniki bez zmian” i hasła: wyłączanie przed nawias, grupowanie, podstawienie t`.

### Task 2: `schoolFactor` i `rozłóż` po szkolnemu

**Files:** Modify `js/math-steps.js` (nowa `schoolFactor`, `factorize` ok. l. 1467 jej używa, `_core.schoolFactor`). Test: nowy plik `test/school-factor.js` (dopisz do `scripts/run-tests.mjs`) i `test/math-steps.js`.

**Interfaces:**
- Produces: `schoolFactor(c: Rational[], v: string, ctx: {dec?: boolean}) → { steps: Step[], factors: Array<{ c: Rational[], n: number }>, lead: Rational, used: string[] } | null`.
  - `c` to współczynniki rosnąco, w tym samym typie co w `factorize`/`solveDegree`.
  - `factors` to czynniki nierozkładalne dalej (liniowe albo bez pierwiastków wymiernych) z krotnością `n`.
  - `used` to podzbiór `['wspolny', 'roznica-kwadratow', 'kwadrat-sumy', 'kwadrat-roznicy', 'roznica-szescianow', 'suma-szescianow', 'viete', 'delta', 'grupowanie', 'podstawienie-t', 'horner']`.
  - `null`, gdy wielomian jest stopnia < 2 albo nic nie da się rozłożyć.
- Kolejność prób i rekurencja: punkty 1–6 z sekcji „Cele” w spec. Każdy krok ma `formula.id` z istniejących haseł (`roznica-kwadratow`, `kwadrat-sumy`, `roznica-szescianow`, `wzory-viete`, `delta`, `schemat-hornera`, `postac-iloczynowa`) albo z zad. 1.

- [ ] **Step 1: Testy, które mają paść** (`test/school-factor.js`). Wywołuj przez `S._core.schoolFactor` i funkcję pomocniczą, która zamienia wielomian z tekstu na `c`; użyj tej, której używa `factorize`. Dla każdego przypadku sprawdź `used`, iloczyn `factors` (rozwinięty) równy wejściu i że żaden krok nie zawiera „Horner”, chyba że `used` ma `horner`:
  - `x^3-x` → used ⊇ ['wspolny', 'roznica-kwadratow'];
  - `4x^2-9` → ['roznica-kwadratow'], krok zawiera `(2x)² − 3²`;
  - `x^2-6x+9` → ['kwadrat-roznicy'];
  - `x^3-8` → ['roznica-szescianow'];
  - `x^2-5x+6` → ['viete'];
  - `2x^2-3x+1` → ['delta'];
  - `x^3-2x^2+x-2` → ['grupowanie'];
  - `x^4-13x^2+36` → ['podstawienie-t', 'roznica-kwadratow'] i 4 czynniki liniowe;
  - `x^3-6x^2+11x-6` → ['horner', …];
  - `x^2+x+1` → `null` albo `factors` = jeden czynnik stopnia 2.
  - `rozłóż x^2-5x+6`: kroki zawierają „sumie” i „iloczynie” (Viète), wynik bez zmian.
  - `rozłóż 84`: wynik `2² · 3 · 7` (sprawdź dokładny zapis istniejącej `primeFactors`/NWD i użyj tego samego), z krokiem dzielenia.
- [ ] **Step 2:** Run: `node test/school-factor.js`. Expected: FAIL.
- [ ] **Step 3: Implementacja.** `factorize` bierze kroki z `schoolFactor`, a końcowy wynik składa tym samym sortem i formatem co dziś (`groups`, `leadText`), żeby tekst wyniku się nie zmienił. `rozłóż <liczba całkowita ≥ 2>` daje kroki z dzieleniem przez kolejne liczby pierwsze.
- [ ] **Step 4:** Run: `node test/school-factor.js && node test/math-steps.js && node test/results-unchanged.js && node test/step-why.js && node test/expr-to-latex.js && node test/step-popovers.js && npm run check:steps`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(kalkulator): rozkład jak w szkole — wspólna funkcja i rozłóż`.

### Task 3: `rozwiąż` wielomian stopnia ≥ 3 — sposób szkolny i Horner

**Files:** Modify `js/math-steps.js` (`solveDegree` ok. l. 598 i miejsce, gdzie powstaje `explain` dla równań wielomianowych). Testy w `test/math-steps.js`.

**Interfaces:**
- Consumes: `schoolFactor` (zad. 2).
- Produces: `explain.methods = [{ label: 'Rozkład na czynniki', steps }, { label: 'Schemat Hornera', steps }]`, gdy oba się różnią. Gdy szkolna droga to sam Horner, jest jeden sposób bez przełącznika.

- [ ] **Step 1: Testy, które mają paść.**
  - `rozwiąż x^3-x=0` ma wynik z pierwiastkami −1, 0, 1 (zapis jak przy innych równaniach), krok z `wylaczanie-przed-nawias`;
  - `rozwiąż x^4-5x^2+4=0` ma 4 pierwiastki ±1, ±2, krok z `podstawienie-t`;
  - `rozwiąż x^3-6x^2+11x-6=0`: wynik bez zmian (z bazy), a sposoby to `['Rozkład na czynniki', 'Schemat Hornera']` albo jeden sposób, jeśli są identyczne. Zapisz, który przypadek wyszedł;
  - `rozwiąż x^4-3x^2+1=0`: wynik bez zmian;
  - oba sposoby mają ten sam ostatni krok;
  - popraw `try`/`expect` hasła `podstawienie-t` z zad. 1 na `rozwiąż x^4-5x^2+4=0`.
- [ ] **Step 2:** Run: `node test/math-steps.js`. Expected: FAIL.
- [ ] **Step 3: Implementacja** wzorem `res.explain.methods` dla delty i Viète (ok. l. 1112).
- [ ] **Step 4:** Run jak w zad. 2, plus `node test/handbook-data.js`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(kalkulator): równania wielomianowe — rozkład jak w szkole obok Hornera`.

### Task 4: Granice 0/0 — rozkład szkolny i Horner jako osobny sposób

**Files:** Modify `js/math-limits.js` (`factorCancel` ok. l. 1060–1130, blok sposobów ok. l. 1385–1400, `METHOD`). Testy w `test/math-limits.js`.

**Interfaces:**
- Consumes: `S._core.schoolFactor` (zad. 2) i istniejący krok Hornera z tabelkami (`hornerHere`).
- Produces: sposoby 0/0 przy x → liczba: `['Rozkład na czynniki', "de l'Hospital", 'Schemat Hornera']` w kolejności silnika (przełącznik sortuje zad. 6). „Schemat Hornera” jest tylko wtedy, gdy jego kroki różnią się od szkolnych. Tryb reguły: `factorCancel` czyta zmienną modułu `_factorMode` (`'school'` domyślnie), ustawianą jak `_prefer`.

- [ ] **Step 1: Testy, które mają paść.**
  - `lim x→2 (x^2-4)/(x^2-5x+6)`: sposób „Rozkład na czynniki” ma krok z `roznica-kwadratow` i krok z `wzory-viete`, bez kroku „Dzielimy schematem Hornera”; jest sposób „Schemat Hornera” z tabelkami; wynik −4 we wszystkich sposobach;
  - `lim x→2 (x^4-13x^2+36)/(x^3-2x^2+x-2)`: szkolny ma `podstawienie-t` i `grupowanie-wyrazow`, wynik −4;
  - `lim x→1 (x^3-3x+2)/(x^2-2x+1)`: wynik 3 w każdym sposobie;
  - stare bramki P1H (każdy rozkład ma przed sobą Hornera) dostosuj: dotyczą tylko sposobu „Schemat Hornera”;
  - `node test/results-unchanged.js` zielony.
- [ ] **Step 2:** Run: `node test/math-limits.js`. Expected: FAIL.
- [ ] **Step 3: Implementacja.** Postać skrócona po rozkładzie ma być ta sama w obu trybach, żeby dalsze kroki (skracanie, podstawienie) i wynik się zgadzały.
- [ ] **Step 4:** Run: `node test/math-limits.js && node test/results-unchanged.js && node test/step-why.js && node test/expr-to-latex.js && node test/step-popovers.js && npm run check:steps && npx playwright test test/e2e/steps-drawing.spec.js --project=mobile`. Expected: PASS. E2e oczekujące na drugim miejscu kroku „Dzielimy schematem Hornera” przestaw na sposób „Schemat Hornera”.
- [ ] **Step 5:** Commit `feat(kalkulator): granice 0/0 — rozkład jak w szkole, Horner jako osobny sposób`.

### Task 5: `uprość` ułamka wielomianów

**Files:** Modify `js/math-steps.js` (`simplify` ok. l. 1439). Testy w `test/math-steps.js`.

- [ ] **Step 1: Testy, które mają paść.**
  - `uprość (x^2-4)/(x+2)` → wynik dokładnie `x − 2 (dla x ≠ −2)`, kroki: rozkład licznika (różnica kwadratów), skrócenie `(x + 2)`;
  - `uprość x/(x^2-x)` → wynik `1/(x − 1) (dla x ≠ 0, x ≠ 1)`;
  - `uprość (x^2+1)/(x+1)` → bez fałszu: wynik jak dziś (z bazy) albo „Jeszcze tego nie rozwiążę”, jeśli tak jest dziś;
  - wszystkie istniejące `uprość` z bazy bez zmian.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implementacja: licznik i mianownik przez `schoolFactor`, wspólne czynniki skrócone, a zastrzeżenie wymienia wszystkie miejsca zerowe pierwotnego mianownika (wymierne). Gdy mianownik ma niewymierne miejsca zerowe, nie rozwiązuj (zostaje stare zachowanie).
- [ ] **Step 4:** Run jak w zad. 2. Expected: PASS.
- [ ] **Step 5:** Commit `feat(kalkulator): upraszczanie ułamka wielomianów przez rozkład`.

### Task 6: Kolejność w przełączniku

**Files:** Modify `app.js` (`renderStepsView` ok. l. 6320). Test: `test/e2e/steps-drawing.spec.js`.

- [ ] **Step 1: Test e2e, który ma paść.** Dla `lim x→2 (x^2-4)/(x^2-5x+6)` przyciski `.steps-methods .settings-seg-btn` mają kolejność: najpierw sposób z najmniejszą liczbą kroków (i on jest `aria-pressed=true`), drugi „Rozkład na czynniki”, potem reszta. Dla `lim x→4 (x^2-6x+8)/(3x^2-10x-8)` tak samo. Istniejący test „sposoby: 0/0” dostosuj.
- [ ] **Step 2:** Run: `npx playwright test test/e2e/steps-drawing.spec.js --project=mobile` → FAIL.
- [ ] **Step 3: Implementacja.** Kolejność wyświetlania: najkrótszy, potem „Rozkład na czynniki” (jeśli jest i nie jest najkrótszy), potem pozostałe w kolejności silnika. Bez zmiany `explain.methods` w silniku i bez zmiany zasady domyślnego wyboru.
- [ ] **Step 4:** Run: `npx playwright test test/e2e/steps-drawing.spec.js test/e2e/handbook.spec.js --project=mobile`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(kalkulator): przełącznik sposobów — najkrótszy pierwszy, szkolny drugi`.

### Task 7: Uczeń, przegląd, wydanie

- [ ] **Step 1:** „Słaby uczeń” (`docs/superpowers/agents/slaby-uczen.md`) czyta nowe kroki: `rozłóż` (zad. 2), `rozwiąż` (zad. 3), granice 0/0 ze sposobem szkolnym (zad. 4), `uprość` (zad. 5), a także 3 nowe hasła z pytaniem „czy wiesz, skąd ten wzór się wziął?”. Uwagi krytyczne napraw z testem, resztę dopisz do `docs/superpowers/research/skoki-tabela.md`.
- [ ] **Step 2:** Zrzut z telefonu (390×844): `lim x→2 (x^4-13x^2+36)/(x^3-2x^2+x-2)` (sposób szkolny), `rozwiąż x^4-5x^2+4=0`, `uprość (x^2-4)/(x+2)`.
- [ ] **Step 3:** Końcowy przegląd całej gałęzi (najmocniejszy model) i jedna tura poprawek.
- [ ] **Step 4:** `version.js` → `v1.05.60`, `npm run sync-version`, `npm run test:predeploy`, `npm run check:steps`. Expected: zielone.
- [ ] **Step 5:**
  - wiersz v1.05.60 w `docs/superpowers/HANDOFF-kroki.md`;
  - w `HANDOFF-nastepna-rozmowa.md` następny krok: paczka B sposobów (z katalogu `docs/superpowers/research/sposoby-katalog.md`) albo 2a-2 z tabeli skoków, do decyzji Mateusza;
  - w tabeli skoków wpis „rozkład jak w szkole” w stanie `zrobione v1.05.60`.
- [ ] **Step 6:** Merge ff na main, commit `feat(kalkulator): rozkład jak w szkole w granicach, równaniach i rozkładzie (v1.05.60)`, push.
