# Podręcznik — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Osobna zakładka „Podręcznik” z działami, hasłami, wyszukiwarką, „Spróbuj” i „Powiązane”, do której
„Więcej” z kroków przechodzi płynnie i z której „Wróć do kroków” wraca w to samo miejsce.

**Architecture:** Dane haseł zostają w `js/step-formulas.js` (jedno źródło dla dymków i podręcznika) i dostają
pola `dzial`, `poziom`, `keywords`, `try`, `expect`, `related` oraz listę `DZIALY`. Czyste funkcje (lista działów,
hasła w dziale, wyszukiwanie) idą do nowego `js/handbook.js` (testowalne w Node). Rysowanie ekranu i nawigacja
są w `app.js`, bo korzystają z `_loadFormulaLib`, `_stepsRich`, `switchTab` i szuflady kroków.

**Tech Stack:** czysty JS (bez budowania), MathLive (już ładowany leniwie), testy Node + Playwright, bramka SymPy.

**Spec:** `docs/superpowers/specs/2026-11-23-podrecznik-design.md`

## Global Constraints
- Nowe pliki JS zaczynają się od `// @ts-check`; `npm run check` i `npm run lint` zielone.
- Bez emoji w UI, kodzie, testach i commitach; ikony jako `<symbol>` w `index.html` (styl lucide, `currentColor`).
- Każde `:hover` tylko w `@media (hover: hover)`; kolory, odstępy i czasy ruchu tylko z tokenów w `styles.css`.
- Ruch 200–300 ms, `prefers-reduced-motion` → przenikanie albo bez ruchu.
- Cele dotykowe ≥ 44 px; poziom hasła jako napis („liceum”, „rozszerzenie”, „studia”), nie sam kolor.
- `poziom` ∈ `'lp' | 'lr' | 'st'` = najniższy poziom, na którym uczeń poznaje wzór.
- Każdy `try` przechodzi przez `MATM0_STEPS.run` (jawna komenda: „rozwiąż …”, „pochodna …”, „lim …”, „kroki …”) i daje
  `text === expect`.
- Commit: `typ(kalkulator): tytuł po polsku (vX.YY.ZZ)` + punkty „- …”, **bez** linii `Co-Authored-By` (zasada Mateusza).
- W pierwszej wersji nie ma filtra po poziomie ani linku z ściągi do podręcznika.

## Review Focus
1. Wyszukiwanie bez polskich znaków i wielkimi literami („rozniczka”, „DELTA”) znajduje hasło; brak wyników →
   pusty stan z podpowiedzią, nie pusta lista → Task 2 i Task 3.
2. „Wróć do kroków” po tym, jak użytkownik w międzyczasie zmienił wyrażenie w kalkulatorze: stare kroki nie wracają,
   przycisk znika → Task 4.
3. Offline bez MathLive w cache: hasło pokazuje tekst `tex`/zdania zamiast pustych pól → Task 3.
4. Wąski ekran 382 px i długa nazwa hasła: bez poziomego przewijania strony → Task 3.
5. Pętla „Powiązane” A → B → A → Wróć ×3 cofa się po kolei i kończy na krokach, nie gubi stosu → Task 4.

---

### Task 1: Dane haseł i test spójności

**Files:**
- Modify: `js/step-formulas.js` (każdy wpis + `DZIALY` + eksport)
- Create: `test/handbook-data.js`
- Modify: `test/expr-to-latex.js:95-96` (wpis nie musi być użyty w kroku)
- Modify: `scripts/run-tests.mjs` (dopisać `test/handbook-data.js` po `test/expr-to-latex.js`)

**Interfaces:**
- Produces: `MATM0_FORMULAS = { FORMULAS, DZIALY }`;
  `DZIALY: Array<{ id: string, name: string }>` w kolejności z projektu
  (`liczby`, `wyrazenia`, `rownania`, `funkcje`, `potegi-log`, `trygonometria`, `granice`, `pochodne`, `calki`);
  wpis: `{ name, tex, why, level, more[], dzial, poziom: 'lp'|'lr'|'st', keywords: string[], try: string,
  expect: string, related: string[] }`. Wpisy z pętli (`tgu`, `arcsinu`, `arctgu`) mają własne `try`/`expect`/`keywords`.

- [ ] **Step 1: Napisz `test/handbook-data.js`** (styl `ok(name, cond, got)` jak w `test/math-steps.js`; wymaga
  `math-steps.js`, `math-calculus.js`, `math-limits.js`, potem `step-formulas.js`). Dla każdego `[id, f]`:
  - `dzial` jest w `DZIALY`, `poziom` ∈ trzech wartości, `name`/`tex`/`why`/`try`/`expect` niepuste, `keywords.length ≥ 1`;
  - każde `related` istnieje i ≠ `id`;
  - nazwy haseł bez dubli;
  - `const r = S.run(f.try)`: `r && r.explain && r.explain.steps.length > 0 && r.text === f.expect` (wypisz `r.text` przy błędzie);
  - na końcu `process.exit(fail ? 1 : 0)`.
- [ ] **Step 2: Uruchom** `node test/handbook-data.js` → FAIL (brak pól).
- [ ] **Step 3: Uzupełnij dane** w `js/step-formulas.js`: `DZIALY`, pola dla 37 wpisów (przydział do działów jak
  w projekcie, sekcja „Działy na start”). `expect` przepisz z wyniku `S.run(try).text` **dopiero po sprawdzeniu ręcznie
  albo w SymPy, że wynik jest poprawny**.
- [ ] **Step 4: Zmień `test/expr-to-latex.js:95-96`**: zamiast „każdy wpis użyty w kroku” sprawdzaj, że każde `fid`
  z kroków istnieje w `FORMULAS` (to już robi linia 88) i że każdy wpis ma treść.
- [ ] **Step 5: Uruchom** `node test/handbook-data.js && node test/expr-to-latex.js && node test/math-steps.js` → PASS.
- [ ] **Step 6: Commit** `feat(kalkulator): dane haseł podręcznika (działy, poziomy, przykłady)`.

### Task 2: `js/handbook.js` — działy, hasła, wyszukiwanie

**Files:**
- Create: `js/handbook.js`
- Create: `test/handbook.js` (+ dopisać do `scripts/run-tests.mjs`)
- Modify: `index.html` (`<script defer src="js/handbook.js?v=…">` po `step-formulas.js`), `sw.js` (lista plików, obok `./js/step-formulas.js`)

**Interfaces:**
- Consumes: `MATM0_FORMULAS` (Task 1), `MATM0_PL_FOLD.foldLower`.
- Produces: `window.MATM0_HANDBOOK` (i `module.exports`) z:
  - `chapters(): Array<{ id, name, count }>` — tylko działy z ≥ 1 hasłem, w kolejności `DZIALY`;
  - `entries(dzialId: string): Array<{ id, entry }>` — w kolejności wpisów w pliku;
  - `search(query: string): Array<{ id, entry, chapter: string }>` — po złożeniu (`foldLower`) nazwy, `keywords`
    i nazwy działu; wszystkie słowa zapytania muszą wystąpić; trafienie w nazwie przed trafieniem w `keywords`;
    puste zapytanie → `[]`;
  - `get(id: string): { id, entry, chapter } | null`.

- [ ] **Step 1: Test** `test/handbook.js`: `chapters()` nie zwraca działu bez haseł i suma `count` = liczba wpisów;
  `search('delta')[0].id === 'delta'`; `search('DELTA')` i `search('wyroznik')` znajdują `delta`;
  `search('pochodna iloczynu')[0].id` to hasło pochodnej iloczynu; `search('')` i `search('zzzz')` → `[]`;
  `get('nie-ma') === null`.
- [ ] **Step 2: Uruchom** `node test/handbook.js` → FAIL (moduł nie istnieje).
- [ ] **Step 3: Napisz `js/handbook.js`** według interfejsu (wzór eksportu jak w `js/pl-fold.js`).
- [ ] **Step 4: Uruchom** `node test/handbook.js` i `node test/sw-cache-keep.js` → PASS.
- [ ] **Step 5: Commit** `feat(kalkulator): wyszukiwanie i spis działów podręcznika`.

### Task 3: Ekran „Podręcznik”

**Files:**
- Modify: `index.html` — przycisk `.tab-btn[data-tab="podrecznik"]` po „Moje Stałe” (ikona `i-graduation`, nowy
  `<symbol>`), pozycja `.tools-sheet-item[data-tab="podrecznik"]` (`<small>wzory, działy, przykłady</small>`),
  `<section id="panel-podrecznik" class="panel" role="tabpanel">` z `<input type="search" id="hbSearch">`
  i `<div id="hbView">`.
- Modify: `app.js` — `panels.podrecznik`, tytuł w `switchTab` (`'Podręcznik — Smart Kalkulator'`), funkcje ekranu (niżej).
- Modify: `styles.css` — style `.hb-*` z tokenów.
- Create: `test/e2e/handbook.spec.js`

**Interfaces:**
- Consumes: `MATM0_HANDBOOK` (Task 2), `_loadFormulaLib()`, `_stepsRich(el, ml, text)`, `switchTab`, `calcExpr`, `liveEval`.
- Produces (w `app.js`, używa Task 4):
  - `_hbStack: Array<{ view: 'home'|'chapter'|'entry', id?: string }>`;
  - `hbShow(view: 'home'|'chapter'|'entry', id?: string, opts?: { push?: boolean }): void` — rysuje widok w `#hbView`;
  - `hbBack(): void` — zdejmuje ze stosu i rysuje poprzedni; na `home` nic nie robi;
  - `hbTry(id: string): void` — `calcExpr.value = entry.try`, kursor na końcu, `liveEval()`, `switchTab('calculator')`
    (jak klik w przykład ze ściągi, `app.js` ok. 6454).
- Widok hasła: `h2` nazwa, rysunek `tex` (MathLive albo tekst `tex` w `<code>`, gdy biblioteki brak), „po co” (`why`),
  akapity `more`, znaczek poziomu, zdanie `level`, przycisk „Spróbuj: <try>”, lista „Powiązane” (przyciski).
- Pusty wynik szukania: „Nic nie pasuje do „<zapytanie>”. Spróbuj innego słowa, np. delta, pochodna, procent.”

- [ ] **Step 1: e2e** `test/e2e/handbook.spec.js` (`serviceWorkers: 'block'`, 390×844):
  - klik `.tab-btn[data-tab="podrecznik"]` (na telefonie przez „Narzędzia”) → widać listę działów z liczbami;
  - klik „Równania i nierówności” → lista haseł; klik „Delta (wyróżnik)” → `h2` ma tę nazwę, fokus na `h2`;
  - „Wróć” → lista działu; jeszcze raz → start;
  - wpisz `wyroznik` w `#hbSearch` → wynik „Delta (wyróżnik)”; wpisz `zzzz` → tekst „Nic nie pasuje”;
  - w haśle klik „Spróbuj” → aktywna zakładka `calculator`, `#calcExpr` ma `try`, `#calcResult` niepusty;
  - przy 382 px na haśle z najdłuższą nazwą: `document.documentElement.scrollWidth <= innerWidth`;
  - z zablokowanym `**/mathlive*` hasło pokazuje `tex` jako tekst.
- [ ] **Step 2: Uruchom** `npx playwright test test/e2e/handbook.spec.js` → FAIL.
- [ ] **Step 3: Zbuduj zakładkę, panel i funkcje** `hbShow`/`hbBack`/`hbTry` według interfejsu; wyszukiwanie
  na `input` pokazuje płaską listę z nazwą działu przy każdym wyniku, wyczyszczenie pola wraca do ostatniego widoku
  ze stosu. Przejście między widokami: wjazd z boku 240 ms `ease-out`, powrót odwrotnie, reduced-motion → bez ruchu.
- [ ] **Step 4: Uruchom** e2e z Step 1 i `npx playwright test test/e2e/calc-ui.spec.js test/e2e/layout-guard.spec.js` → PASS.
- [ ] **Step 5: Zrzuty** 390×844 i 1280×800, jasny i ciemny motyw; przejrzyj skillami `emil-design-eng`
  i `mobile-native`, popraw, co zgłoszą.
- [ ] **Step 6: Commit** `feat(kalkulator): zakładka Podręcznik — działy, hasła, wyszukiwarka, Spróbuj`.

### Task 4: Z kroków do hasła i z powrotem

**Files:**
- Modify: `app.js` — `_openStepsMore` (ok. 6006) i `_closeStepsMore` zastąpione przejściem do podręcznika;
  klik `[data-formula-more]` (ok. 6045) woła `hbOpenFromSteps(id)`.
- Modify: `test/e2e/steps-drawing.spec.js:39-44`.
- Modify: `test/e2e/handbook.spec.js`.

**Interfaces:**
- Consumes: `hbShow`, `hbBack`, `_hbStack` (Task 3), `openStepsView`/`closeCommandHelp`, `_stepsScroller()`.
- Produces:
  - `_hbFromSteps: { list: Node, scroll: number, id: string, expr: string } | null` — zapamiętana lista kroków
    (ten sam węzeł DOM, z otwartym dymkiem i wybranym sposobem), przewinięcie i `calcExpr.value` z chwili wyjścia;
  - `hbOpenFromSteps(id: string): void` — zapisuje `_hbFromSteps`, zamyka szufladę, `switchTab('podrecznik')`,
    stos = `[home, chapter(entry.dzial), entry(id)]`, na górze hasła przycisk „‹ Wróć do kroków”;
  - `hbReturnToSteps(): void` — `switchTab('calculator')`, otwiera szufladę jak `openStepsView`, ale wstawia
    zapamiętany `list` zamiast renderować, przywraca `scroll`, fokus na `.steps-formula-sr` w otwartym dymku
    (logika dzisiejszego `_closeStepsMore`); czyści `_hbFromSteps`.
  - „Wróć” na haśle otwartym z kroków: jeśli stos ma pod sobą inne hasło (z „Powiązane”) → `hbBack()`; jeśli to
    hasło, od którego weszliśmy → `hbReturnToSteps()`.
  - Wstecz telefonu: `grep -n popstate app.js`. Jeśli szuflady już obsługują wstecz przez historię, wstecz na haśle
    otwartym z kroków działa jak „Wróć”. Jeśli nie, pomiń (projekt: nie dokładamy).
  - Przycisk „Wróć do kroków” jest widoczny tylko, gdy `_hbFromSteps && calcExpr.value === _hbFromSteps.expr`;
    inaczej `_hbFromSteps = null`.

- [ ] **Step 1: Zmień e2e** `steps-drawing.spec.js:39-44`: po „Więcej” aktywna zakładka `podrecznik`, `h2` „Wzór na
  liczbę e”, przycisk „Wróć do kroków” ma fokus; klik → `steps` ma 4 elementy, `pop` widoczny, przewinięcie jak przed.
- [ ] **Step 2: Dopisz do `handbook.spec.js`**: kroki → „Więcej” → „Powiązane” (pierwsze) → „Powiązane” z powrotem
  do pierwszego hasła → Wróć ×3 → kroki z otwartym dymkiem; oraz: „Więcej” → przełącz na Standard → zmień
  `#calcExpr` → wróć do Podręcznika → brak „Wróć do kroków”.
- [ ] **Step 3: Uruchom** oba spec → FAIL.
- [ ] **Step 4: Zaimplementuj** według interfejsu; usuń `_openStepsMore`, `_closeStepsMore` i style `.steps-more*`,
  których już nic nie używa (`grep` przed usunięciem).
- [ ] **Step 5: Uruchom** `npx playwright test test/e2e/steps-drawing.spec.js test/e2e/handbook.spec.js test/e2e/formula-drawing.spec.js` → PASS.
- [ ] **Step 6: Commit** `feat(kalkulator): Więcej z kroków otwiera hasło w podręczniku, Wróć do kroków`.

### Task 5: Bramka SymPy dla haseł

**Files:**
- Modify: `scripts/steps-check/dump.js`
- Modify: `scripts/steps-check/README.md` (jedno zdanie o hasłach)

**Interfaces:**
- Consumes: `FORMULAS` (Task 1).
- Produces: w `steps.json` (1) kroki każdego `try` (dopisać `Object.values(FORMULAS).map(f => f.try)` do `queries`);
  (2) dla każdego hasła po jednym zadaniu `{ q: 'hasło ' + id, title: 'Hasło', steps: [{ label: 'tekst', math: frag,
  lines: [[lewa, '=' + prawa, …]] }] }` z każdego fragmentu `$…$` w `why`/`more` zawierającego `=` na najwyższym
  poziomie i bez `\to`, `\approx`, `\text`; podział po `=` poza nawiasami `{}`.
  `SKIP_PROSE: Record<string, string>` (fragment → powód) dla fragmentów, których SymPy nie ma jak sprawdzić.

- [ ] **Step 1: Dopisz tymczasowo** do `more` jednego wpisu fałsz `$2+2=5$`, uruchom `npm run check:steps` → bramka
  zgłasza „hasło …” jako fałszywe. Usuń fałsz.
- [ ] **Step 2: Zaimplementuj** zrzut według interfejsu.
- [ ] **Step 3: Uruchom** `npm run check:steps` → 0 fałszywych; `python3 scripts/steps-check/check.py -v` →
  każdy pominięty fragment haseł jest w `SKIP_PROSE` (dopisz z powodem albo przeredaguj zdanie).
- [ ] **Step 4: Commit** `test(kalkulator): bramka SymPy sprawdza przykłady i równości w hasłach`.

### Task 6: Nowe hasła

**Files:**
- Modify: `js/step-formulas.js`
- Modify: `app.js` (runner smoke: po jednym `{ expr: try, value… }` dla każdego nowego hasła z wynikiem liczbowym, z komentarzem)

**Interfaces:**
- Consumes: format z Task 1, bramka z Task 5.
- Produces: hasła o id: `nierownosc-kwadratowa`, `uklad-podstawianie`, `uklad-przeciwne`, `wartosc-bezwzgledna`,
  `wartosci-trygonometryczne`, `okresowosc`, `procent-z-liczby`, `zmiana-o-procent`, `nwd-nww`, `postac-iloczynowa`
  (jeśli `postac-iloczynowa` już jest, tylko dopisz pola). Każde z `try` z działającym przykładem
  (np. `rozwiąż x^2 - 4 < 0`, `rozwiąż 2x + y = 1, x - y = 1`, `rozwiąż |x-2| < 3`, `rozwiąż sin(x) = 1/2`,
  `kroki 20% z 150`, `kroki 150 + 20%`, `nwd(12, 18)`) i `related` w obie strony.

- [ ] **Step 1: Napisz treści** według skilli `deep-explain` i `bottom-up` (poziom ucznia liceum, `why` ≤ 2 zdania,
  `more` 2–4 akapity, jeden przykład liczbowy); `term-origins` tylko jako jedno zdanie tam, gdzie pomaga.
- [ ] **Step 2: Uruchom** `node test/handbook-data.js && node test/handbook.js && npm run check:steps` → PASS, 0 fałszywych.
- [ ] **Step 3: Agent „słaby uczeń”** (świeży subagent) czyta JSON nowych haseł i zgłasza niejasności, skoki i błędy;
  popraw i powtórz Step 2.
- [ ] **Step 4: Commit** `feat(kalkulator): hasła podręcznika — nierówności, układy, wartość bezwzględna, trygonometria, procenty, NWD/NWW`.

### Task 7: Wydanie

**Files:**
- Modify: `version.js` (`APP_VERSION` → `1.05.30`), pliki ruszane przez `npm run sync-version`
- Modify: `docs/superpowers/HANDOFF-podrecznik.md` (stan: zbudowane, co dalej: dymki, filtr poziomu, rozdziały)

- [ ] **Step 1: Sprawdź** `git log -3`; jeśli `1.05.30` już jest, weź następny numer.
- [ ] **Step 2: Uruchom** `npm run test:predeploy && npm run check && npm run lint && npm run test:e2e` → wszystko PASS.
- [ ] **Step 3: Zrzut z telefonu** (390×844): start, dział, hasło, kroki → hasło → kroki.
- [ ] **Step 4: Commit i push** `feat(kalkulator): Podręcznik — zakładka wiedzy (v1.05.30)` z punktami „- …”
  (zgodnie z ustaleniem Mateusza wolno wysłać po zielonych testach).
