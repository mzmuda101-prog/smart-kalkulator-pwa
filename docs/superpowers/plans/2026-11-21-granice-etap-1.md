# Granice krok po kroku (etap 1) — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Silnik liczy granice ciągów i funkcji krok po kroku po polsku (styl zajęć Mateusza) i upraszcza pierwiastki; 58 zadań z ćwiczeń: 0 błędnych wyników, ≥ 80% z krokami.

**Architecture:** Nowy moduł `js/math-limits.js` (`MATM0_LIMITS`) korzysta z wyrażeń i pochodnych z `js/math-calculus.js` (wystawionych jako `MATM0_CALC._core`) i rejestruje się w `MATM0_STEPS` jak dziś pochodne. Reguły przekształcają wyrażenie i dopisują kroki; każdy wynik przechodzi niezależne sprawdzenie liczbowe w wysokiej precyzji (decimal.js). Niezgoda albo brak reguły → „Jeszcze tego nie rozwiążę”.

**Tech Stack:** czysty JavaScript (IIFE, `window.*` + `module.exports`), decimal.js (już w `js/vendor/`), testy Node (`node test/…`), fast-check, Playwright; SymPy tylko jako narzędzie deweloperskie do odpowiedzi wzorcowych (lokalne venv, nie zależność apki).

**Spec:** `docs/superpowers/specs/2026-11-21-skaner-i-granice-design.md` (sekcje 5.1, 5.1b, 5.2, 5.3 bez SymPy, 5.4, 5.7 etap 1, 5.8)

## Global Constraints

- Bez frameworka i bez budowania; nowe pliki zaczynają się od `// @ts-check`; wzorzec modułu jak `js/math-calculus.js` (IIFE, `window.MATM0_X = API`, `module.exports = API`).
- Offline; żadnych nowych zależności uruchomieniowych (decimal.js już jest: `js/vendor/decimal.js`, w Node `require('decimal.js')`).
- **Nigdy błędny wynik:** każdy wynik granicy zgodny ze sprawdzeniem liczbowym (Decimal, precyzja ≥ 60 cyfr); inaczej tekst `Jeszcze tego nie rozwiążę` (stała `UNSUPPORTED` z `math-steps.js`).
- Styl kroków (spec 5.1b): symbol nieoznaczony w nawiasie kwadratowym przy pierwszym „=” (`[∞/∞]`, `[0/0]`, `[∞ − ∞]`, `[1^∞]`); wzór `lim (1 + 1/aₙ)^aₙ = e`; przy x → −∞ krok `√(x²) = |x| = −x`; wynik uproszczony (`e^(−6)` → `1/e⁶`, `e^(1/2)` → `√e`, `e^(−1)` → `1/e`).
- Kroki w formacie `{ label, math }`, wynik przez `K.done('Granica', text, value, steps)` (jak pochodne); `value`: liczba, `Infinity`/`-Infinity`, albo `null` dla „granica nie istnieje”.
- Zasady repo (`AGENTS.md`): każda nowa komenda ma smoke-testy w runnerze `app.js` (`{expr, value, tol}` z komentarzem), wpis w podpowiedziach (`js/hint-rules.js` `KNOWN_COMMANDS`) i w ściądze (`command-definitions.js`); każdy przykład ze ściągi daje obiecany wynik.
- Wydanie: `APP_VERSION` +1 w `version.js`, potem `npm run sync-version`; commit `typ(kalkulator): tytuł po polsku (vX.YY.ZZ)` + punkty „- …”; **bez** `Co-Authored-By` i bez emoji.
- `npm test` uruchamia `scripts/run-tests.mjs` — nowy test dopisać tam, nie łańcuchem `&&`.

## Review Focus

1. **Pisanie na żywo** — `STEPS.run` leci przy każdym znaku; niedokończone `granica (x^2+1` ma szybko zwrócić `null`, a żadne z 58 zadań nie może liczyć się dłużej niż 300 ms (zawieszona karta to porażka). Test w Task 3 i budżet czasu w Task 11.
2. **Dziedzina w sprawdzeniu liczbowym** — `√(4n − 7)`, `ln` ujemnego, `√(x⁴ − 12)` blisko −2: próbki poza dziedziną mają być pomijane, nie wywracać sprawdzenia ani dawać NaN jako „zgodne”. Test w Task 2.
3. **Znak przy x → −∞ i pierwiastkach parzystych** — `√(x²) = −x`; zły znak to zły wynik. Testy 7b, 7c, 7d, 7e w zestawie (Task 4/6) plus jawny test, że `x/√(3x²+5)` przy +∞ i −∞ daje przeciwne znaki.
4. **Wklejony unicode** z PDF/notatek: `→`, `−`, `∞`, `²`, `³`, `√`, `∛`, `∜`, `n→∞` bez spacji, `lim_{x\to 0}`. Test wariantów zapisu w Task 3.
5. **Odczyt własnego wyniku po „=”** — `1/e⁶`, `√3/3`, `+∞`, `e⁴`, `granica nie istnieje` wraca do pola; liczbowe wyniki mają się dać policzyć dalej, tekstowe nie mogą dawać błędu. Test w `test/readback.js` w Task 11.

---

## Pliki

- Create `js/math-limits.js` — wykrywanie komendy, reguły, sprawdzenie liczbowe, formatowanie wyniku.
- Create `test/math-limits.js` — testy jednostkowe + zestaw 58 zadań z progiem pokrycia.
- Create `test/limits-zestaw.json` — 58 zadań (zapis parsera) z odpowiedzią wzorcową (tekst SymPy + wartość liczbowa).
- Create `scripts/limits-reference/reference.py` — liczy odpowiedzi wzorcowe w SymPy (narzędzie dev).
- Modify `js/math-steps.js` — tokeny `∛`, `∜`, `cbrt(`, `log_b`/`logb`, `|…|` nie; `registerLimits`; upraszczanie pierwiastków liczbowych.
- Modify `js/math-calculus.js` — eksport `_core` (bez zmiany zachowania); funkcja `logb` w `evalAtom`/`show`/`dExpr`.
- Modify `index.html`, `sw.js`, `test/_bootstrap.js`, `scripts/run-tests.mjs` — wpięcie modułu.
- Modify `app.js` (runner smoke), `js/hint-rules.js`, `command-definitions.js`, `test/readback.js`, `version.js`, `.gitignore`.

---

### Task 1: Zestaw 58 zadań i odpowiedzi wzorcowe

**Files:**
- Create: `test/limits-zestaw.json`, `scripts/limits-reference/reference.py`, `test/math-limits.js` (sam szkielet zestawu)
- Modify: `.gitignore` (dopisz `test/fixtures-local/` i `scripts/limits-reference/.venv/`), `scripts/run-tests.mjs` (dopisz `'test/math-limits.js'`)

**Interfaces:**
- Produces: `test/limits-zestaw.json` = tablica `{ id: "1a", input: string, sympy: string, value: number | "inf" | "-inf" }`; `input` to pełna komenda, np. `"lim n→∞ (2n+1)/(6n+5)"`.

- [ ] **Step 1: Zapisz zadania** do `test/limits-zestaw.json` (pole `input`; `sympy` i `value` puste). Przepisane ze zbioru (zapis parsera; `∛`/`∜` = pierwiastek 3./4. stopnia, `log_2` = log o podstawie 2):

| id | input |
|---|---|
| 1a | `lim n→∞ (2n+1)/(6n+5)` |
| 1b | `lim n→∞ (n^2+3n+4)/(2n^2+5n+1)` |
| 1c | `lim n→∞ (8n^5+2n^3+n^2+3)/(4n^5+3n^4+7n+5)` |
| 1d | `lim n→∞ (n^3+4n^2+n+6)/(n^4+3n^3+2n+7)` |
| 1e | `lim n→∞ (n^5+3n^4+5n^2+4)/(n^3+2n^2+3n+1)` |
| 1f | `lim n→∞ ((3n+1)^2(4n+5))/((2n+3)^2(3n+4))` |
| 1g | `lim n→∞ ((2n^2+3)^2(5n+2)^5(n+6))/((4n^3+5)^3(3n+7)^2)` |
| 2a | `lim n→∞ (sqrt(n+3)+5)/(sqrt(4n+1)+3sqrt(n)+7)` |
| 2b | `lim n→∞ (sqrt(n)+7)/(sqrt(9n+2)+sqrt(n+8)+4)` |
| 2c | `lim n→∞ (4n+1)/(3n+sqrt(4n^2+3)+5)` |
| 2d | `lim n→∞ (n+sqrt(n)+3)/(sqrt(4n^2+3)+3n+2sqrt(n)+4)` |
| 2e | `lim n→∞ (sqrt(9n^3+7)+2n+3sqrt(n)+1)/(n sqrt(n)+5n+6sqrt(n)+3)` |
| 2f | `lim n→∞ (5n+∛(n^4+1)+3∜(n)+2)/(3sqrt(2n^2+7)+2n+6∜(n^5+3)+3sqrt(n)+6)` |
| 3a | `lim n→∞ (n^3-5n^2)` |
| 3b | `lim n→∞ ((n^2+5)/(2n+1)-(2n^2+1)/(4n+5))` |
| 3c | `lim n→∞ ((n+3)/(sqrt(n)+1)-(n+1)/(sqrt(n)+5))` |
| 3d | `lim n→∞ (log_2(8n+1)-log_2(n+6))` |
| 3e | `lim n→∞ (log_4(2n^2+3)-2log_4(4n+5))` |
| 4a | `lim n→∞ (sqrt(2n+5)-sqrt(2n+1))` |
| 4b | `lim n→∞ (sqrt(3n^2+17n)-sqrt(3n^2+5n))` |
| 4c | `lim n→∞ n(sqrt(4n^2+7)-sqrt(4n^2+2))` |
| 4d | `lim n→∞ 1/(sqrt(n+sqrt(n))-sqrt(n-1))` |
| 4e | `lim n→∞ sqrt(n)/(sqrt(n^2+7n sqrt(n)+4)-sqrt(n^2+3n sqrt(n)+1))` |
| 4f | `lim n→∞ (sqrt(n+5)-sqrt(n+3))/(sqrt(4n+9)-sqrt(4n-7))` |
| 4g | `lim n→∞ (sqrt(n^2+9n)-2sqrt(n^2+1)+sqrt(n^2+5n))` |
| 4h | `lim n→∞ (sqrt(n^4+n^3)+sqrt(n^4-n^3)-2n^2)` |
| 5a | `lim n→∞ (∛(n^3+8n^2)-∛(n^3+2n^2))` |
| 5b | `lim n→∞ (∛(8n^3+5n^2)-∛(8n^3-4n^2))` |
| 5c | `lim n→∞ (∛(27n^3+15n^2)-3n)` |
| 5d | `lim n→∞ (∜(n^4+7n^3)-∜(n^4-n^3))` |
| 5e | `lim n→∞ (2n-∜(16n^4+40n^3+1))` |
| 6a | `lim n→∞ (1-1/n)^n` |
| 6b | `lim n→∞ (1+1/(2n))^n` |
| 6c | `lim n→∞ ((n+4)/n)^(n+5)` |
| 6d | `lim n→∞ (n/(n+3))^(2n)` |
| 6e | `lim n→∞ (1-1/n^2)^n` |
| 6f | `lim n→∞ ((5n+7)/(5n-8))^n` |
| 6g | `lim n→∞ ((2n+sqrt(n))/(2n+7sqrt(n)))^(2+sqrt(n))` |
| 6h | `lim n→∞ (n+3)^(2n^2+12n)/(n^2+6n)^(n^2+6n)` |
| 6i | `lim n→∞ ((n^2+2n+7)/(n^2+5n+1))^(2n-1)` |
| 6j | `lim n→∞ ((3n^2+4n+1)/(3n^2-2n+5))^(4n+3)` |
| 7a | `lim x→∞ x/sqrt(3x^2+5)` |
| 7b | `lim x→-∞ x/sqrt(3x^2+5)` |
| 7c | `lim x→-∞ (sqrt(4x^2-3x)+2x)` |
| 7d | `lim x→-∞ (sqrt(8x^2+x)-sqrt(8x^2-5x))` |
| 7e | `lim x→-∞ sqrt(7-2x)(sqrt(15-8x)-sqrt(3-8x))` |
| 8a | `lim x→4 (x^2-6x+8)/(3x^2-10x-8)` |
| 8b | `lim x→3 (2x^2-5x-3)/(x^3-27)` |
| 8c | `lim x→2 (x^4-13x^2+36)/(x^3-2x^2+x-2)` |
| 8d | `lim x→2 (x^3+3x^2-6x-8)/(2x^3+x^2-7x-6)` |
| 8e | `lim x→1 (x^4-3x^2+4x-2)/(3x^5+4x^3+x^2-8)` |
| 8f | `lim x→-1 (3x^3+8x^2+7x+2)/(2x^4+4x^3-3x^2-10x-5)` |
| 9a | `lim x→5 (x-5)/(3-sqrt(x+4))` |
| 9b | `lim x→3 (x^2-5x+6)/(sqrt(x+6)-x)` |
| 9c | `lim x→-2 (x^3-x+6)/(sqrt(x^4-12)+x)` |
| 9d | `lim x→2 (2-sqrt(x+2))/(sqrt(x+7)-x-1)` |
| 9e | `lim x→1 (∜(x+15)-2)/(x^2-5x+4)` |
| 9f | `lim x→3 (x^2-8x+15)/(∛(3x-1)-2)` |

- [ ] **Step 2: Napisz `scripts/limits-reference/reference.py`**: czyta `test/limits-zestaw.json`, zamienia `input` na SymPy (`sqrt`, `∛u` → `cbrt(u)`, `∜u` → `root(u,4)`, `log_b(u)` → `log(u,b)`, niejawne mnożenie przez `parse_expr(..., transformations=standard+implicit_multiplication)`), liczy `limit(expr, v, a)` (a = `oo`/`-oo`/liczba), zapisuje `sympy = str(wynik)` i `value = float(wynik)` albo `"inf"`/`"-inf"`. Uruchomienie: `python3 -m venv scripts/limits-reference/.venv && scripts/limits-reference/.venv/bin/pip install sympy && scripts/limits-reference/.venv/bin/python scripts/limits-reference/reference.py`.

- [ ] **Step 3: Uruchom skrypt i sprawdź kilka wartości ręcznie.** Oczekiwane m.in.: 1a = `1/3`, 1e = `oo`, 6d = `exp(-6)`, 6f = `exp(3)`, 6h = `exp(9)`, 7a = `sqrt(3)/3`, 7b = `-sqrt(3)/3`, 3a = `oo`. Każde pole `value` wypełnione; jeśli SymPy zwróci `AccumBounds`/`nan`, zatrzymaj się i zgłoś (żadne z 58 tego nie powinno dać).

- [ ] **Step 4: Szkielet `test/math-limits.js`** w stylu `test/math-calculus.js` (`ok(name, cond, got)`, licznik, `process.exit`). Część „zestaw”: dla każdego zadania `r = S.run(input)`; `wrong` gdy `r && r.text !== NOPE && !zgodne(r.value, value)` (tolerancja względna 1e-9; `inf` ↔ `Infinity`); `withSteps` gdy `r.explain && r.explain.steps.length >= 2`. Wypisz `zestaw: withSteps/58 z krokami, wrong błędnych` i listę niepokrytych id. Bramka: `wrong === 0` zawsze; próg pokrycia ze stałej `MIN_COVERED = 0` (Task 11 podnosi do 47).

- [ ] **Step 5: Uruchom** `node test/math-limits.js` — Expected: `zestaw: 0/58 z krokami, 0 błędnych`, exit 0 (moduł jeszcze nie istnieje, `S.run` zwraca `null`).

- [ ] **Step 6: Commit** `test(kalkulator): zestaw 58 granic z ćwiczeń z odpowiedziami wzorcowymi`.

---

### Task 2: Parser pierwiastków n-tego stopnia i logarytmów, sprawdzenie liczbowe w wysokiej precyzji

**Files:**
- Modify: `js/math-steps.js` (tokenizer), `js/math-calculus.js` (eksport `_core`, funkcja `logb`)
- Create: `js/math-limits.js` (na razie tylko `numericLimit`)
- Test: `test/math-limits.js`

**Interfaces:**
- Produces (z `math-calculus.js`): `MATM0_CALC._core = { fromAst, show, paren, evalExpr, dExpr, cAdd, cSub, cNeg, cMul, cPow, cExp, cFn, num, variable, atomExpr, hasVar, isNumber, numberOf, mapExpr, expandExpr, polyCoefs, polyExpr, E_CONST }` — istniejące funkcje, bez zmian zachowania.
- Produces (z `math-limits.js`): `numericLimit(e, v, target) -> { kind: 'num', value: number } | { kind: 'inf', sign: 1 | -1 } | null`; `target = { at: number | 'inf' | '-inf', side: 0 | 1 | -1 }`. `null` = nie rozstrzyga.
- Produces: atom `{ k: 'fn', f: 'logb', base: R, a: expr }` (log o podstawie wymiernej).

- [ ] **Step 1: Testy (failing)** w `test/math-limits.js`:
  - `S._core.parse('∛(x+1)')` i `S._core.parse('cbrt(x+1)')` → po `fromAst` to `(x + 1)^(1/3)`; `∜x` → `x^(1/4)`;
  - `S.run('pochodna ∛x')` → `'f′(x) = 1/(3∛x²)'` albo inny zapis — test sprawdza tylko, że nie jest `null`/NOPE, i że `S.run('pochodna log_2(x)')` daje wynik zgodny liczbowo z `1/(x·ln 2)` w x = 3;
  - `numericLimit` dla `(2n+1)/(6n+5)`, n → ∞ → `{kind:'num', value≈1/3}`; dla `sqrt(n^4+n^3)+sqrt(n^4-n^3)-2n^2` → `≈ -1/4` (wymaga precyzji Decimal — w float wynik się rozsypuje); dla `n^3-5n^2` → `{kind:'inf', sign:1}`; dla `sin(1/x)`, x → 0 → `null`; dla `sqrt(4n-7)` przy próbkach poza dziedziną — brak wyjątku.
- [ ] **Step 2: Uruchom** `node test/math-limits.js` — Expected: FAIL (brak tokenów, brak `_core`, brak modułu).
- [ ] **Step 3: Tokenizer** w `math-steps.js`: `∛`/`cbrt` → potęga `1/3`, `∜` → `1/4` (jako węzeł `{k:'pow', a, b:{k:'num', v:R(1,n)}}`), `log_(\d+)` i `log(\d+)` przed `FN_RE` → `{t:'fn', v:'logb', base}`; `fromAst` mapuje `logb` na atom `logb`. W `math-calculus.js`: `evalAtom` (`ln u / ln b`), `show` (`log₂(…)`), `dFactor` (`1/(u·ln b)·u′`).
- [ ] **Step 4: `numericLimit`** w `math-limits.js`: wartość wyrażenia w Decimal (precyzja 80; własny `evalDec` lustrzany do `evalExpr`, `NaN` dla poza dziedziną). Próbki: dla ∞ `t = 10^k`, k = 6, 9, 12, 15, 18; dla punktu `a ± 10^-k`, k = 8…20 (strona wg `side`, obie gdy 0 i muszą się zgadzać). Zbieżne gdy ostatnie trzy różnią się względnie < 1e-6 → `num`; monotonicznie rosnące moduły ponad 1e8 ze stałym znakiem → `inf`; reszta `null`. Wartość `num` zaokrąglona do 1e-12 względnie.
- [ ] **Step 5: Uruchom** `node test/math-limits.js && node test/math-steps.js && node test/math-calculus.js` — Expected: PASS wszystkich.
- [ ] **Step 6: Commit** `feat(kalkulator): pierwiastki n-tego stopnia, log o podstawie i sprawdzenie granicy w wysokiej precyzji`.

---

### Task 3: Komenda „granica”, podstawienie i bramka pewności — wpięcie w apkę

**Files:**
- Modify: `js/math-limits.js`, `js/math-steps.js` (`registerLimits`, `run` pyta najpierw `_limits.detect`), `index.html` (skrypt `js/math-limits.js` po `math-calculus.js`), `sw.js` (lista plików), `test/_bootstrap.js` (load po calculus)
- Test: `test/math-limits.js`

**Interfaces:**
- Produces: `MATM0_LIMITS = { detect(raw) -> { src, v, target } | null, run(d) -> wynik K.done | unsupported }`.
- Produces (wewnętrzne, dla Task 4–9): `limitOf(e, v, target, log, depth) -> Answer` gdzie `Answer = { kind:'num', e: expr } | { kind:'inf', sign } | { kind:'dne', why: string }`, rzuca `NotSupported`, gdy żadna reguła nie pasuje; `RULES` = tablica `{ name, test(e, v, target), apply(e, v, target, log, depth) -> Answer }` próbowana po kolei; `formatAnswer(Answer) -> { text, value }`; `indeterminate(e, v, target) -> '0/0' | '∞/∞' | '∞ − ∞' | '0·∞' | '1^∞' | '0^0' | '∞^0' | null`.

- [ ] **Step 1: Testy (failing):**
  - wykrywanie (wszystkie → ten sam `{v, target}`): `granica x^2+1 przy x → 2`, `granica x^2+1 przy x do 2`, `granica x^2+1 dla x→2`, `lim x->2 x^2+1`, `lim(x→2) x^2+1`, `lim_{x\to 2} x^2+1`, `limit x^2+1 as x->2`; strony `x → 0+`, `x do 0 z prawej`, `x → 0-`; nieskończoności `x → ∞`, `x→+∞`, `x → -∞`, `x → −∞`, `x do nieskończoności`, `n→inf`;
  - `text('granica x^2+1 przy x → 2') === '5'`; pierwszy krok zawiera `lim` i `= 5`; `text('lim x→0 cos(x)') === '1'`;
  - bramka: reguła testowa zwracająca zły wynik (wstrzyknięta przez `_test.pushRule`) → `NOPE`;
  - niedokończone: `S.run('granica (x^2+1')` → `null`; `S.run('granica')` → `null`; czas `S.run` dla `lim n→∞ ((2n^2+3)^2(5n+2)^5(n+6))/((4n^3+5)^3(3n+7)^2)` < 300 ms;
  - `formatAnswer`: `e^(−6)` → `1/e⁶`, `e^(1/2)` → `√e`, `e^(−1)` → `1/e`, `e^4` → `e⁴`, `√3/3` zostaje, `+∞` → text `+∞`, value `Infinity`; `dne` → text `granica nie istnieje`, value `null`.
- [ ] **Step 2: Uruchom** — Expected: FAIL.
- [ ] **Step 3: Implementacja**: `detect` na `K.fold` (też `−`→`-`, `→`/`->`/`\to`/`do`/`as`; `∞`/`inf`/`nieskonczonosc[ia]`), `run` = parsuj → `limitOf` → `formatAnswer` → `numericLimit` musi się zgadzać (tolerancja względna 1e-8; `inf` ze znakiem); niezgoda albo `numericLimit === null` → `unsupported()`. Pierwsza reguła `substitution`: wyrażenie określone i skończone w punkcie (Decimal) i `indeterminate === null` → wartość dokładna przez podstawienie `mapExpr`. Rejestracja: `STEPS.registerLimits(API)`; w `math-steps.run` przed `_calculus.detect`.
- [ ] **Step 4: Uruchom** `node test/math-limits.js && node test/math-steps.js && node test/math-calculus.js && node test/smoke-node.js` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(kalkulator): komenda granica — wykrywanie zapisu, podstawienie i sprawdzenie wyniku`.

---

### Task 4: Nieskończoność — wyłączanie najwyższej potęgi (zestawy 1, 2, 3a, 7a–b)

**Files:** Modify `js/math-limits.js`; Test `test/math-limits.js`

**Interfaces:**
- Consumes: `limitOf`, `RULES`, `indeterminate`, `_core`.
- Produces: `leading(e, v, sign) -> { c: expr, p: R } | null` — człon dominujący `c·v^p` przy v → ±∞ (dla sumy pod pierwiastkiem: `(Σ)^(1/k)` → `c^(1/k)·v^(p/k)`, przy v → −∞ i parzystym k: `|v|^(p/k)`), używane też w Task 6–7.

- [ ] **Step 1: Testy (failing):** zadania 1a–1g, 2a–2f, 3a, 7a, 7b z zestawu przechodzą (tekst zgodny z SymPy po `formatAnswer`, np. 1a `1/3`, 1d `0`, 1e `+∞`, 7a `√3/3`, 7b `−√3/3`); kroki 1b: pierwszy `math` kończy się `[∞/∞]`, jest krok z etykietą `Wyłączamy n² przed nawias`; 7b ma krok z `√(x²) = |x| = −x`.
- [ ] **Step 2: Uruchom** — Expected: FAIL.
- [ ] **Step 3: Reguła `dominantPower`**: dla ilorazu przy ∞ — wyłącz najwyższą potęgę licznika i mianownika (krok z wyrażeniem po wyłączeniu), składniki → 0 (krok), wynik ze współczynników i różnicy potęg (`+∞`/`−∞`/`0`/liczba). Dla wielomianu/sumy bez ilorazu (3a) — wyłącz najwyższą potęgę, `∞ · c`.
- [ ] **Step 4: Uruchom** `node test/math-limits.js` — Expected: PASS testów Task 4, `wrong = 0`.
- [ ] **Step 5: Commit** `feat(kalkulator): granice w nieskończoności przez wyłączenie najwyższej potęgi`.

---

### Task 5: Wspólny mianownik i logarytmy (3b–3e, ułamki piętrowe)

**Files:** Modify `js/math-limits.js`; Test `test/math-limits.js`

- [ ] **Step 1: Testy (failing):** 3b, 3c, 3d, 3e z zestawu; dodatkowo ułamek piętrowy `lim x→0 (1/(x+1) - 1)/x` = `-1` z krokiem `Sprowadzamy do wspólnego mianownika`; 3d ma krok z `log₂((8n + 1)/(n + 6))`.
- [ ] **Step 2: Uruchom** — Expected: FAIL.
- [ ] **Step 3: Reguły** `commonDenominator` (różnica/suma ilorazów lub ułamek w ułamku przy `[∞ − ∞]` albo `[0/0]` → jeden iloraz, potem `limitOf` rekurencyjnie) i `logCombine` (`log_b f − log_b g` → `log_b(f/g)`, `k·log_b f` → `log_b f^k`, potem granica argumentu i ciągłość logarytmu; argument → +∞ daje `+∞`).
- [ ] **Step 4: Uruchom** — Expected: PASS, `wrong = 0`.
- [ ] **Step 5: Commit** `feat(kalkulator): granice — wspólny mianownik i logarytmy`.

---

### Task 6: Sprzężenie — różnice pierwiastków 2., 3. i 4. stopnia (4a–4h, 5a–5e, 7c–7e)

**Files:** Modify `js/math-limits.js`; Test `test/math-limits.js`

- [ ] **Step 1: Testy (failing):** zadania 4a–4h, 5a–5e, 7c, 7d, 7e z zestawu; kroki 4a: etykieta `Mnożymy przez sprzężenie` i wyrażenie `(2n + 5 − (2n + 1))/(√(2n + 5) + √(2n + 1))`; 5a: etykieta zawiera `a³ − b³ = (a − b)(a² + ab + b²)`; 5d: `a⁴ − b⁴`.
- [ ] **Step 2: Uruchom** — Expected: FAIL.
- [ ] **Step 3: Reguła `conjugate`**: składnik postaci `A − B` (także `A + B` przy przeciwnych znakach, oraz `A − c·v`) gdzie A lub B to `(·)^(1/k)`, k ∈ {2, 3, 4}, przy `[∞ − ∞]` lub `[0/0]` (gdy różnica w liczniku albo mianowniku) → `(Aᵏ − Bᵏ)/Σ_{i} A^{k−1−i}B^i`; rozwiń licznik (`expandExpr`), potem `limitOf` (zwykle `dominantPower`). Przy 4g (trzy pierwiastki) najpierw rozbij na dwie różnice `(√a − √c) + (√b − √c)` z `c = n² + 1`, krok z etykietą `Rozbijamy na dwie różnice`.
- [ ] **Step 4: Uruchom** — Expected: PASS, `wrong = 0`.
- [ ] **Step 5: Commit** `feat(kalkulator): granice — mnożenie przez sprzężenie, także pierwiastki 3. i 4. stopnia`.

---

### Task 7: Granice typu 1^∞ przez liczbę e (6a–6j)

**Files:** Modify `js/math-limits.js`; Test `test/math-limits.js`

- [ ] **Step 1: Testy (failing):** 6a–6j z zestawu (6a `1/e`, 6b `√e`, 6c `e⁴`, 6d `1/e⁶`, 6e `1`, 6f `e³`, 6h `e⁹`); kroki 6d: pierwszy `math` zawiera `[1^∞]`, jest krok z `(1 + 1/aₙ)^aₙ → e` (etykieta `Wzór na e`) i krok z `aₙ = ` oraz wykładnik końcowy `−6`.
- [ ] **Step 2: Uruchom** — Expected: FAIL.
- [ ] **Step 3: Reguła `eLimit`**: `f^g` z `f → 1`, `g → ±∞` → zapisz `f = 1 + 1/aₙ` gdzie `aₙ = 1/(f − 1)` (krok „dorabiamy 1”: `f − 1` uproszczone do jednego ilorazu), potem `[(1 + 1/aₙ)^aₙ]^(g/aₙ)` i `e^(lim g·(f − 1))` z granicą wykładnika przez `limitOf`. Iloraz potęg o wspólnym wykładniku (6h): krok `aᵍ/bᵍ = (a/b)ᵍ` po sprowadzeniu wykładników (`(n+3)^(2(n²+6n)) = ((n+3)²)^(n²+6n)`).
- [ ] **Step 4: Uruchom** — Expected: PASS, `wrong = 0`.
- [ ] **Step 5: Commit** `feat(kalkulator): granice typu 1^∞ przez liczbę e, w stylu zajęć`.

---

### Task 8: Punkt skończony 0/0 — rozkład wielomianów i pierwiastki (8a–8f, 9a–9f)

**Files:** Modify `js/math-limits.js` (korzysta z `rationalRoot`/`deflate` — wystaw je w `STEPS._core`); Test `test/math-limits.js`

- [ ] **Step 1: Testy (failing):** 8a–8f, 9a–9f z zestawu; kroki 8a: pierwszy `math` z `[0/0]`, krok `Rozkładamy na czynniki` z `(x − 4)(x − 2)/((x − 4)(3x + 2))`, krok `Skracamy (x − 4)`; 9e: etykieta sprzężenia dla `∜` (`a⁴ − b⁴`).
- [ ] **Step 2: Uruchom** — Expected: FAIL.
- [ ] **Step 3: Reguły** `factorCancel` (licznik i mianownik wielomianowe, oba = 0 w `a` → podziel przez `(x − a)` schematem Hornera, powtarzaj, potem `substitution`) i `conjugate` z Task 6 przy `[0/0]` w punkcie (z rozkładem po sprzężeniu). Kolejność w `RULES`: `substitution`, `commonDenominator`, `factorCancel`, `conjugate`, `dominantPower`, `logCombine`, `eLimit`, potem Task 9.
- [ ] **Step 4: Uruchom** — Expected: PASS, `wrong = 0`.
- [ ] **Step 5: Commit** `feat(kalkulator): granice w punkcie — rozkład na czynniki i sprzężenie`.

---

### Task 9: Granice znane, jednostronne, de l'Hospital, „nie istnieje”

**Files:** Modify `js/math-limits.js`; Test `test/math-limits.js`

- [ ] **Step 1: Testy (failing):** `lim x→0 sin(x)/x` = `1`; `lim x→0 sin(3x)/x` = `3` z krokiem `sin u/u → 1` i `u = 3x`; `lim x→0 (e^x-1)/x` = `1`; `lim x→0 ln(1+2x)/x` = `2`; `lim x→0 (1+x)^(1/x)` = `e`; `lim x→0 (x - sin(x))/x^3` = `1/6` przez de l'Hospitala (etykieta `Reguła de l'Hospitala`, ≤ 3 razy); `lim x→0+ 1/x` = `+∞`; `lim x→0- 1/x` = `−∞`; `lim x→0 1/x` → `granica nie istnieje` z krokiem pokazującym obie granice jednostronne; `lim x→0 sin(1/x)` → NOPE (sprawdzenie liczbowe nie rozstrzyga).
- [ ] **Step 2: Uruchom** — Expected: FAIL.
- [ ] **Step 3: Reguły** `knownLimits` (tabela ze spec 5.2 p. 6, dopasowanie `u` z widocznym podstawieniem), `oneSided` (mianownik → 0 ze stałym znakiem licznika: znak po stronie; dla `side = 0` obie strony → równe albo `dne`), `lHospital` (dla `[0/0]` i `[∞/∞]`, pochodne przez `dExpr` z krokami zwiniętymi do jednej linii; przerwij, gdy rozmiar wyrażenia rośnie dwa razy z rzędu).
- [ ] **Step 4: Uruchom** — Expected: PASS, `wrong = 0`.
- [ ] **Step 5: Commit** `feat(kalkulator): granice znane, jednostronne i reguła de l'Hospitala`.

---

### Task 10: Upraszczanie pierwiastków liczbowych (spec 5.4)

**Files:** Modify `js/math-steps.js` (ścieżka `uprość`/`arithmetic` dla wyrażeń bez zmiennych z `sqrt`); Test `test/math-steps.js`

- [ ] **Step 1: Testy (failing)** w `test/math-steps.js`: `uprość √8` → `2√2`; `uprość sqrt(12) + sqrt(27)` → `5√3`; `uprość 1/√2` → `√2/2`; `uprość 1/(√3 - 1)` → `(√3 + 1)/2` z krokiem `Usuwamy niewymierność z mianownika`; `uprość √(4·18)` → `6√2`; `uprość √7` → `√7` (bez zmian, bez błędu).
- [ ] **Step 2: Uruchom** `node test/math-steps.js` — Expected: FAIL.
- [ ] **Step 3: Implementacja**: liczby postaci `Σ qᵢ·√tᵢ` (t bezkwadratowe; mapa t → wymierne), wyciąganie kwadratów z rozkładu na czynniki, dzielenie przez `a + b√t` przez sprzężenie; wynik sprawdzony liczbowo jak dziś.
- [ ] **Step 4: Uruchom** `node test/math-steps.js && node test/math-calculus.js` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(kalkulator): upraszczanie pierwiastków i usuwanie niewymierności z mianownika`.

---

### Task 11: Wydanie — ściąga, podpowiedzi, smoke-testy, próg pokrycia

**Files:** Modify `test/math-limits.js` (`MIN_COVERED = 47`), `app.js` (runner smoke: blok granic), `js/hint-rules.js`, `command-definitions.js` (sekcja „Równania i algebra — krok po kroku”), `test/readback.js`, `version.js`, `index.html`/`sw.js` (przez `npm run sync-version`)

- [ ] **Step 1: Testy:** `MIN_COVERED = 47` (≥ 80% z 58) i budżet czasu: każde zadanie < 300 ms (najwolniejsze wypisane); smoke w `app.js`: `{ expr: 'lim x→4 (x^2-6x+8)/(3x^2-10x-8)', value: 2/14, tol: 1e-9 }` (komentarz: rozkład 0/0), `{ expr: 'lim n→∞ (2n+1)/(6n+5)', value: 1/3, tol: 1e-9 }`, `{ expr: 'lim n→∞ (n/(n+3))^(2n)', value: Math.exp(-6), tol: 1e-12 }`, `{ expr: 'uprość √8', value: 2*Math.SQRT2, tol: 1e-9 }`; readback: `1/e⁶`, `√3/3`, `e⁴` wracają jako liczby, `+∞` i `granica nie istnieje` nie wywracają parsera.
- [ ] **Step 2: Uruchom** `node test/math-limits.js` — jeśli pokrycie < 47, wróć do reguł zadań z listy niepokrytych (nie obniżaj progu).
- [ ] **Step 3: Ściąga i podpowiedzi**: w `command-definitions.js` pozycje `granica … przy x → a` (`command: 'granica (x^2-6x+8)/(3x^2-10x-8) przy x → 4'`), `lim n→∞ …` (`'lim n→∞ (n/(n+3))^(2n)'`), `granica jednostronna` (`'lim x→0+ 1/x'`), `uprość √a` (`'uprość √8'`); te same komendy w `KNOWN_COMMANDS`. Każdy przykład zwraca wynik (sprawdź `node -e` z `_bootstrap`).
- [ ] **Step 4: Wersja**: `APP_VERSION` +1 w `version.js`, `npm run sync-version`.
- [ ] **Step 5: Pełna weryfikacja**: `npm test` → `WSZYSTKIE ZESTAWY: N/N PASS`; `npm run test:e2e` → 0 failed.
- [ ] **Step 6: Commit** `feat(kalkulator): granice ciągów i funkcji krok po kroku (vX.YY.ZZ)` z punktami: zakres reguł, wynik zestawu (`K/58 z krokami, 0 błędnych`), ściąga i podpowiedzi.
