# Przegląd skoków w krokach + partia 1 (granice) — plan wykonania

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kroki granic pokazują rachunek przy podstawianiu i dzielenie schematem Hornera. Stałe polecenie dla agenta „słaby uczeń” przegląda cały silnik, a wynik trafia do jednej tabeli uwag ze stanem.

**Architecture:** Silnik granic (`js/math-limits.js`) dopisuje rachunek do kroku `substitution` i nowy krok przed „Rozkładamy na czynniki” z polem `horner`, które może być listą. `app.js` rysuje taką listę tabelek. Osobno powstają: skrypt zrzutu kroków dla ucznia, polecenie agenta w repo, tabela uwag. Przegląd (zadania 4–5) idzie równolegle z naprawami (zadania 1–3).

**Tech Stack:** czysty JS (bez budowania), testy Node (`test/*.js`), Playwright (`test/e2e`), bramka SymPy (`npm run check:steps`).

**Spec:** `docs/superpowers/specs/2026-11-24-przeglad-skokow-design.md`

## Global Constraints
- Praca w kopii roboczej `.worktrees/przeglad-skokow` (gałąź `przeglad-skokow`), symlinki `node_modules` i `scripts/steps-check/.venv` z głównego folderu.
- TDD: test najpierw ma paść. Testy silnika: `node test/math-limits.js` (0 = OK).
- Każde „=” w krokach przechodzi `npm run check:steps`. Zdanie „dlaczego” ≤ 25 słów i nie powtarza dymku (`node test/step-why.js`).
- Każdy krok rysuje się bez zapisu z klawiatury (`node test/expr-to-latex.js`).
- Bez emoji. Nowe pliki JS zaczynają się od `// @ts-check`.
- Commity: `typ(kalkulator): krótki tytuł po polsku`, punkty „- …”, bez dopisków o AI.
- Wydanie: `APP_VERSION` w `version.js` → `1.05.50`, `npm run sync-version`, `npm run test:predeploy`, push na main.

## Review Focus
1. Punkt ujemny: `lim x→-1 (x^3+1)/(x+1)` → podstawienie z nawiasami `(−1)²` i `− (−1)`, wynik 3 (test w zad. 1).
2. Pierwiastek podwójny: `lim x→1 (x^3-3x+2)/(x^2-2x+1)` → dwie tabelki dla licznika i dwie dla mianownika, wynik 3 (test w zad. 2).
3. Punkt ułamkowy: `lim x→1/2 (2x^2+x-1)/(2x-1)` → ułamek w nawiasie `2 · (1/2)`, wynik 3/2 (test w zad. 1).
4. Funkcja, nie wielomian (de l'Hospital przy `lim x→0 sin(3x)/x`): krok „Podstawiamy” pokazuje wstawione 0 w środku funkcji przed wartością (test w zad. 1).
5. Wąski ekran 360 px: dwie tabelki Hornera w jednym kroku nie wychodzą poza kartę ani stronę (test e2e w zad. 3).

---

### Task 1: Rachunek w kroku „Podstawiamy x = a”

**Files:**
- Modify: `js/math-limits.js` (reguła `substitution`, ok. linii 355–376)
- Test: `test/math-limits.js` (nowa sekcja „Partia 1: podstawienie” przed końcowym `console.log`)

**Interfaces:**
- Produces: `plugSteps(e, v, t, at)` w `js/math-limits.js` zwraca `string[]`, czyli kolejne zapisy po „=” bez wyniku końcowego (może być pusty). Krok ma postać `limOf(v, t, e) + ' = ' + [...plugSteps, C.show(at)].join(' = ')`, z usuniętymi sąsiednimi duplikatami.

- [ ] **Step 1: Napisz testy, które mają paść**

```js
// ── Partia 1 (spec 2026-11-24-przeglad-skokow): podstawienie z rachunkiem ──
{
    const steps = q => { const r = S.run(q); return r && r.explain ? r.explain.steps : []; };
    const sub = (st, v) => st.find(x => new RegExp('^Podstawiamy ' + v + ' = ').test(x.label));
    const s1 = sub(steps('lim x→2 (x^4-13x^2+36)/(x^3-2x^2+x-2)'), 'x');
    ok('P1: wstawione liczby', !!s1 && /\(2³ \+ 2 ?· ?2² − 9 ?· ?2 − 18\)\/\(2² \+ 1\)/.test(s1.math), s1 && s1.math);
    ok('P1: wartości wyrazów', !!s1 && s1.math.includes('(8 + 8 − 18 − 18)/(4 + 1)') && /−20\/5 = −4$/.test(s1.math), s1 && s1.math);
    const s2 = sub(steps('lim x→-1 (x^3+1)/(x+1)'), 'x');
    ok('P1: ujemny punkt w nawiasie', !!s2 && s2.math.includes('(−1)²') && s2.math.includes('− (−1)') && /= 3$/.test(s2.math), s2 && s2.math);
    const s3 = sub(steps('lim x→1/2 (2x^2+x-1)/(2x-1)'), 'x');
    ok('P1: punkt ułamkowy w nawiasie', !!s3 && /\(1\/2\)/.test(s3.math) && /= 3\/2$/.test(s3.math), s3 && s3.math);
    const hop = S.run('lim x→0 sin(3x)/x').explain.methods.find(m => /Hospital/.test(m.label));
    const s4 = hop && sub(hop.steps, 'x');
    ok('P1: funkcja — wstawione 0 przed wartością', !!s4 && /3 ?· ?0/.test(s4.math) && /= 3$/.test(s4.math), s4 && s4.math);
    // bramka: każdy krok „Podstawiamy x = a” w zestawie i ściądze — po pierwszym „=” bez zmiennej, z rachunkiem
    const bad = [];
    for (const z of ZESTAW) {
        const r = S.run(z.input); if (!r || !r.explain) continue;
        for (const m of r.explain.methods || [r.explain]) for (const st of m.steps) {
            const mm = /^Podstawiamy (\w) = /.exec(st.label); if (!mm) continue;
            const rhs = st.math.split(' = ').slice(1);
            const body = st.math.split(' = ')[0].replace(/^lim\([^)]*\) /, '');
            if (!rhs.length || new RegExp('(^|[^a-z])' + mm[1] + '([^a-z]|$)').test(rhs[0]) || (rhs.length < 2 && body !== mm[1])) bad.push(z.input + ' :: ' + st.math); // sam wynik bez rachunku = skok
        }
    }
    ok('P1: bramka — każde „Podstawiamy” z rachunkiem', bad.length === 0, bad.slice(0, 5));
}
```

- [ ] **Step 2: Uruchom i sprawdź, że pada**

Run: `node test/math-limits.js`
Expected: FAIL na `P1: wstawione liczby`, `P1: wartości wyrazów` i pozostałych P1.

- [ ] **Step 3: Zaimplementuj `plugSteps(e, v, t, at)` i użyj jej w `substitution`**

Pracuje na AST z `K.parse(C.show(e))`, tak jak `plugInfinity`/`astText`. Poziomy, każdy dodany tylko wtedy, gdy różni się od poprzedniego:
(1) zmienna zamieniona na liczbę punktu (`pointExpr(t)`), z nawiasem, gdy liczba jest ujemna albo ułamkowa i stoi pod potęgą, po minusie albo w iloczynie;
(2) każdy jednomian albo potęga bez dodawania w środku zastąpiony wartością (dokładną, `K.fmt`), a argument funkcji policzony, jeśli jest liczbą;
(3) każda suma, np. licznik i mianownik osobno, policzona do jednej liczby. Ułamek zostaje nieskrócony (`−20/5`).
Wynik końcowy pozostaje `C.show(at)`. Gdy na którymś poziomie nie da się policzyć dokładnie (np. `sin(3·0)` → `sin(0)`), poprzestań na poprzednim poziomie. Wymagane jest co najmniej (1).

- [ ] **Step 4: Uruchom testy**

Run: `node test/math-limits.js && node test/expr-to-latex.js && node test/step-why.js`
Expected: PASS. Jeśli `step-why` zgłosi „W mianowniku nie wychodzi zero” przy kroku bez mianownika (raport D), popraw regułę w `js/step-why.js:64`, żeby patrzyła na `/` w części przed pierwszym „ = ”.

- [ ] **Step 5: Bramka SymPy**

Run: `npm run check:steps`
Expected: `0 fałszywych`. Liczba sprawdzonych równości rośnie względem 377.

- [ ] **Step 6: Commit**

```bash
git add js/math-limits.js js/step-why.js test/math-limits.js
git commit -m "fix(kalkulator): granice — podstawienie z wstawionymi liczbami" -m "- krok Podstawiamy x = a pokazuje wstawione liczby, wartości i ułamek przed wynikiem
- bramka: każde podstawienie w zestawie ma rachunek"
```

### Task 2: Krok „Dzielimy schematem Hornera” w granicach

**Files:**
- Modify: `js/math-limits.js` (`line()` ok. 336, `factorCancel.apply` ok. 922–950)
- Modify: `js/step-why.js` (reguła `Rozkładamy na czynniki` l. 83, nowa reguła `Dzielimy schematem Hornera`)
- Test: `test/math-limits.js` (sekcja „Partia 1: Horner”)

**Interfaces:**
- Consumes: kształt tabelki z `js/math-steps.js:624`: `{ r, top, mid, bot }` (napisy, współczynniki malejąco, `mid[0] === ''`).
- Produces: krok `{ label: 'Dzielimy schematem Hornera', math, formula: { id: 'schemat-hornera' }, horner: Array<{ name: 'licznik'|'mianownik', r, top, mid, bot }> }` stojący tuż przed „Rozkładamy na czynniki”. `line(log, label, math, formula, extra)`: `extra` jest scalane do kroku (`Object.assign`).

- [ ] **Step 1: Napisz testy, które mają paść**

```js
// ── Partia 1: Horner w granicy ──
{
    const steps = q => S.run(q).explain.steps;
    const st = steps('lim x→2 (x^4-13x^2+36)/(x^3-2x^2+x-2)');
    const i = st.findIndex(x => x.label === 'Rozkładamy na czynniki');
    const h = st[i - 1];
    ok('P1H: krok Hornera tuż przed rozkładem', !!h && h.label === 'Dzielimy schematem Hornera' && h.formula && h.formula.id === 'schemat-hornera', st.map(x => x.label));
    ok('P1H: dwie tabelki, licznik i mianownik', !!h && Array.isArray(h.horner) && h.horner.map(x => x.name).join() === 'licznik,mianownik', h && h.horner);
    ok('P1H: licznik 1 0 −13 0 36 przez 2', !!h && JSON.stringify(h.horner[0].top) === JSON.stringify(['1', '0', '−13', '0', '36']) && JSON.stringify(h.horner[0].bot) === JSON.stringify(['1', '2', '−9', '−18', '0']) && h.horner[0].r === '2', h && h.horner[0]);
    ok('P1H: zapis dzielenia', !!h && h.math.includes('(x⁴ − 13x² + 36) : (x − 2) = x³ + 2x² − 9x − 18') && h.math.includes('(x³ − 2x² + x − 2) : (x − 2) = x² + 1'), h && h.math);
    const d = steps('lim x→1 (x^3-3x+2)/(x^2-2x+1)');
    const hd = d[d.findIndex(x => x.label === 'Rozkładamy na czynniki') - 1];
    ok('P1H: pierwiastek podwójny — po dwie tabelki', !!hd && hd.horner.length === 4 && hd.horner.map(x => x.name).join() === 'licznik,licznik,mianownik,mianownik', hd && hd.horner);
    ok('P1H: wynik bez zmian', /= 3$/.test(d[d.length - 1].math), d[d.length - 1].math);
    // bramka: każdy „Rozkładamy na czynniki” w zestawie ma tuż przed sobą krok z tabelkami, reszta 0
    const bad = [];
    for (const z of ZESTAW) {
        const r = S.run(z.input); if (!r || !r.explain) continue;
        for (const m of r.explain.methods || [r.explain]) m.steps.forEach((s, k) => {
            if (s.label !== 'Rozkładamy na czynniki') return;
            const p = m.steps[k - 1];
            if (!p || !Array.isArray(p.horner) || !p.horner.length || p.horner.some(t => t.bot[t.bot.length - 1] !== '0')) bad.push(z.input);
        });
    }
    ok('P1H: bramka — każdy rozkład ma Hornera', bad.length === 0, bad);
}
```

Dopisz do `test/step-why.js` asercję, że why kroku „Rozkładamy na czynniki” dla zadania ze zrzutu zawiera `(x-2)` (zapis LaTeX zdania) i nie zawiera `(x-a)`.

- [ ] **Step 2: Uruchom i sprawdź, że pada**

Run: `node test/math-limits.js; node test/step-why.js`
Expected: FAIL na `P1H:*` i na nowej asercji why.

- [ ] **Step 3: Zaimplementuj**

W `factorCancel.apply` przy każdym `deflateBy` zapisz tabelkę: `top` to `c` malejąco, `mid[k] = a·bot[k−1]`, `bot` to sumy, wszystko przez `K.fmt`. `name` zależy od znaku wykładnika czynnika. Linia `math` dla każdego dzielenia ma postać `(W) : (x − a) = Q`, linie łączy `'\n'`, a pierwsze dzielenie stoi w `⟦…⟧`, jak w równaniach. Wyślij ją przez `line(log, 'Dzielimy schematem Hornera', math, 'schemat-hornera', { horner: tables })` przed „Rozkładamy”.
`step-why.js`:
- „Rozkładamy na czynniki”: nawias weź z etykiety następnego kroku (`c.next.label`, „Skracamy (x − 2)”). Zdanie: „Wyszło $\frac{0}{0}$, więc i licznik, i mianownik mają nawias $(x-2)$. Wyciągamy go, żeby potem skrócić.” Bez następnego kroku zostaje dotychczasowe zdanie.
- „Dzielimy schematem Hornera”: zdanie o tym zadaniu, które nie powtarza dymku, np. „Liczba $2$ zeruje licznik i mianownik, więc oba dzielą się przez $(x-2)$.” (nawias i liczba z `s.horner[0].r`).

- [ ] **Step 4: Uruchom testy**

Run: `node test/math-limits.js && node test/step-why.js && node test/expr-to-latex.js && node test/step-popovers.js && npm run check:steps`
Expected: PASS, SymPy `0 fałszywych`.

- [ ] **Step 5: Commit**

```bash
git add js/math-limits.js js/step-why.js test/math-limits.js test/step-why.js
git commit -m "feat(kalkulator): granice — dzielenie schematem Hornera przed rozkładem" -m "- krok z tabelkami dla licznika i mianownika (także pierwiastek podwójny)
- zdanie przy rozkładzie mówi o konkretnym nawiasie"
```

### Task 3: Rysowanie listy tabelek Hornera

**Files:**
- Modify: `app.js` (`_stepsHorner` ok. 5962, wstawianie ok. 6304)
- Modify: arkusz ze stylem `.steps-horner-wrap` (znajdź: `grep -rn "steps-horner-wrap" *.css css/ 2>/dev/null`)
- Test: `test/e2e/steps-drawing.spec.js`

**Interfaces:**
- Consumes: `step.horner`, czyli obiekt (równania) albo `Array<{name, r, top, mid, bot}>` (granice, zad. 2).

- [ ] **Step 1: Napisz test e2e, który ma paść**

`test('granica 0/0: dwie tabelki Hornera z podpisami, mieszczą się na 360 px', …)`: viewport 360×780, wpisz `lim x→2 (x^4-13x^2+36)/(x^3-2x^2+x-2)`, kliknij `#calcExplainTip`. Oczekuj:
- `#stepsView .steps-horner` ma 2 elementy;
- podpisy `.steps-horner-name` mają tekst `['Licznik', 'Mianownik']`;
- pierwsza tabelka ma `aria-label` pasujący do `/^Licznik: Schemat Hornera dla r = 2/`;
- każda `.steps-horner-wrap` mieści się w `.steps-item` (jak w teście stopnia 5);
- `document.documentElement.scrollWidth - innerWidth <= 0`.

Istniejący test równań (jedna tabelka, bez podpisu) nadal przechodzi.

- [ ] **Step 2: Uruchom i sprawdź, że pada**

Run: `npx playwright test test/e2e/steps-drawing.spec.js`
Expected: FAIL w nowym teście (dziś rysuje się 0 tabelek, bo `_stepsHorner` dostaje tablicę).

- [ ] **Step 3: Zaimplementuj**

`[].concat(step.horner)`. Dla każdej tabelki z `name`: podpis `p.steps-horner-name` (wielka litera) nad tabelką i prefiks `Name: ` w `aria-label`. Każda tabelka dostaje własny `steps-horner-wrap`, żeby przewijała się osobno. Odstęp między tabelkami weź z istniejącego tokenu odstępu (`--space-2` lub ten, którego używa `.steps-item`). Bez nowych kolorów.

- [ ] **Step 4: Uruchom testy**

Run: `npx playwright test test/e2e/steps-drawing.spec.js test/e2e/formula-drawing.spec.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app.js test/e2e/steps-drawing.spec.js <plik css>
git commit -m "feat(kalkulator): kroki — kilka tabelek Hornera w jednym kroku" -m "- podpis licznik/mianownik, opis dla czytnika, każda tabelka przewija się osobno"
```

### Task 4: Polecenie „słabego ucznia” i zrzut kroków dla niego (równolegle z 1–3)

**Files:**
- Create: `docs/superpowers/agents/slaby-uczen.md`
- Create: `scripts/steps-check/queries.js` (lista zadań wyjęta z `dump.js`)
- Modify: `scripts/steps-check/dump.js` (używa `queries.js`, wynik bez zmian)
- Create: `scripts/steps-dump-student.js`
- Modify: `.gitignore` (`scripts/steps-check/kroki-uczen*.json`)

**Interfaces:**
- Produces: `require('./queries.js')` → `string[]`, czyli zadania z zestawu, ściągi, `EXTRA` i „Spróbuj” z podręcznika, w tej samej kolejności co dziś.
- Produces: `node scripts/steps-dump-student.js <dział|all> <plik.json>`. Dział to `granice` | `rownania` (tytuły Równanie*, Nierówność, Układ równań) | `analiza` (Pochodna, Całka*) | `reszta`. Zapisuje `[{ id, q, title, method, steps: [{ k, label, why, math, formula?: { name, tex, why, here }, horner?: string[] }] }]`, gdzie `horner` to tabelka jako 3 wiersze tekstu z podpisem.

- [ ] **Step 1: Test zgodności wyniku `dump.js`**

Przed zmianą: `node scripts/steps-check/dump.js && shasum scripts/steps-check/steps.json > <scratchpad>/przed.sha` (`<scratchpad>` = katalog tymczasowy sesji).

- [ ] **Step 2: Wyjmij `queries.js`, przepnij `dump.js`, porównaj sumę**

Run: `node scripts/steps-check/dump.js && shasum -c <scratchpad>/przed.sha`
Expected: `OK`.

- [ ] **Step 3: Napisz `steps-dump-student.js`**

`why` liczy `require('../js/step-why.js').whyFor(s, title, explain, k)`, a `formula` pochodzi z `FORMULAS[s.formula.id]` (`name`, `tex`, `why`) plus `s.formula.here`. Dla przypomnienia agentowi: w JSON ukośniki LaTeX są podwojone.
Self-check na końcu skryptu: `assert(out.length > 0 && out.every(t => t.steps.every(s => typeof s.why === 'string')))`.

Run: `node scripts/steps-dump-student.js granice <scratchpad>/g.json && node -e "const j=require('<scratchpad>/g.json');console.log(j.length, j.some(t=>t.steps.some(s=>s.horner)))"`
Expected: liczba > 80 i `true` (po zad. 2; przed nim `false`).

- [ ] **Step 4: Napisz polecenie `docs/superpowers/agents/slaby-uczen.md`**

Musi zawierać:
- **Kim jest:** uczeń liceum (podstawa plus trochę rozszerzenia). Umie działania na liczbach, ułamki, potęgi, nawiasy. Nie zna niczego, czego krok, „dlaczego” albo dymek nie pokazuje.
- **Metoda:** dla każdego kroku odtwórz go ołówkiem tylko z poprzedniego kroku, tego kroku, „dlaczego”, dymku i tabelki. Wypisz rachunki zrobione w głowie. Więcej niż jedno proste działanie to SKOK.
- **Kategorie:** skok | dlaczego-falszywe | zargon | nieczytelne | interaktywnosc. Do kategorii `interaktywnosc` należy lekkie stuknięcie, które pokazałoby rachunek albo wyjaśnienie, bez chowania czegoś ważnego.
- **Ważność:** krytyczna (nie odtworzę kroku) | powazna | drobna.
- **Format wyjścia:** wiersze tabeli `| id | dział | zadanie (q) | krok k | kategoria | ważność | cytat | czego brakuje | propozycja zapisu |`. Propozycja to konkretny zapis, nie „dodać wyjaśnienie”.
- **Zasady:** nie oceniaj poprawności matematyki (robi to SymPy); każda uwaga z cytatem; ukośniki w JSON są podwojone.
- **Obowiązkowe pytanie na koniec każdego zadania:** „Czy umiałbym rozwiązać podobne zadanie sam, tylko z tych kroków?”

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/agents/slaby-uczen.md scripts/steps-check/queries.js scripts/steps-check/dump.js scripts/steps-dump-student.js .gitignore
git commit -m "docs(kalkulator): stałe polecenie agenta słaby uczeń i zrzut kroków dla niego"
```

### Task 5: Przegląd całego silnika i tabela uwag (po zad. 4, równolegle z 1–3)

**Files:**
- Create: `docs/superpowers/research/skoki-tabela.md`

- [ ] **Step 1: Zrzuty działów** — `node scripts/steps-dump-student.js <dział> <scratchpad>/<dział>.json` dla 4 działów.
- [ ] **Step 2: Czterech agentów równolegle** (general-purpose). Każdy dostaje polecenie z `docs/superpowers/agents/slaby-uczen.md` i ścieżkę do swojego JSON, a zwraca wiersze tabeli.
- [ ] **Step 3: Stare uwagi.** Z raportów C, D, E (`docs/superpowers/research/raport-{C,D,E}-*.md`) wypisz uwagi o skokach i zrozumiałości. Każdą sprawdź na bieżącym zrzucie: jeśli nadal występuje, trafia do tabeli z odnośnikiem (np. „D-Z1”); jeśli nie, pomiń.
- [ ] **Step 4: Złóż tabelę.** Nagłówek: data, wersja, liczba zadań. Kolumny: `| id | dział | zadanie | krok | kategoria | ważność | co brakuje | propozycja | stan |`. Duplikaty łącz (wzorzec liczony raz, lista zadań w kolumnie). Kolejność: krytyczna → poważna → drobna → interaktywność. Wiersze partii 1 (D-Z7, D-Z8, zrzuty Mateusza) mają stan `zrobione v1.05.50`.
- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/research/skoki-tabela.md
git commit -m "docs(kalkulator): tabela skoków w krokach — przegląd całego silnika"
```

### Task 6: Sprawdzenie partii 1 uczniem, wydanie, przekazanie

**Files:**
- Modify: `version.js` (`1.05.50`), `docs/superpowers/HANDOFF-kroki.md` (wiersz v1.05.50), `docs/superpowers/HANDOFF-nastepna-rozmowa.md`

- [ ] **Step 1:** Zrzut działu `granice` po zad. 1–3. Agent „słaby uczeń” czyta tylko zadania z krokiem „Podstawiamy x =” lub „Dzielimy schematem Hornera”. Uwagi typu `krytyczna` przy tych krokach napraw (z testem) przed wydaniem, resztę dopisz do tabeli.
- [ ] **Step 2:** Zrzut z telefonu (Playwright 390×844) granicy ze zrzutu Mateusza. Sprawdź wzrokiem tabelki i rachunek.
- [ ] **Step 3:** `version.js` → `1.05.50`, potem `npm run test:predeploy`. Expected: wszystko zielone. Uruchom też `npm run check:steps`.
- [ ] **Step 4:** Przekazania: wiersz v1.05.50 w `HANDOFF-kroki.md`. `HANDOFF-nastepna-rozmowa.md` wskazuje `skoki-tabela.md` jako listę dalszej pracy, a następne kroki to: partia 2 z tabeli, etap 4 (długie wzory), etap „interaktywność”.
- [ ] **Step 5:** Scal gałąź do main, commit `feat(kalkulator): podstawienie z rachunkiem, Horner w granicach, przegląd skoków (v1.05.50)`, push.
