# Przekazanie: kroki rozwiązania zrozumiałe — stan na 2026-11-23, v1.05.26

Dla nowej rozmowy. Najpierw: `AGENTS.md`, `../ZASADY-AGENTOW.md`, plan `docs/superpowers/plans/2026-11-22-kroki-zrozumiale.md`
(etapy 3b–3f, decyzje Mateusza, co zostało), raporty agentów `docs/superpowers/research/raport-{A,B,C}-*.md`.
Starsze przekazanie: `docs/superpowers/HANDOFF-wzory.md` (rysunek wzoru, klawiatura „Wzory”).

## Wydane dziś (main, Vercel)
| wersja | co |
|---|---|
| v1.05.05 | kroki rysowane jak na kartce (`stepToLatex` w `js/expr-to-latex.js`), wzór na e w dymku zamiast osobnego kroku |
| v1.05.06 | 3b: krok 1 i „Wynik” jak wpisano (`astText`), bez kroków w kółko („Podstawiamy n → ∞”), podstawienie `(2 + 0)/(6 + 0)` |
| v1.05.07 | 3c: zdanie „dlaczego” pod każdym krokiem (`js/step-why.js`, kontekst: ±∞ czy liczba, krok obok) |
| v1.05.08–10 | większy rysunek wzoru; okienko wyżej (domyślnie „zawsze”, tylko telefon ≥ 700 px wys.); 2 rzędy przykładów na pustym ekranie |
| v1.05.09 | 3d: wzory granic w dymkach (`js/step-formulas.js`), symbol `[0/0]` do stuknięcia |
| v1.05.11 | 3e-1: równania (przeniesienie, sprawdzenie z podstawieniem, Δ), rozkład, ułamki |
| v1.05.12 | 3e-2: pochodne (iloczyn/iloraz „Wstawiam do wzoru”) i całki (granice, tożsamości, a = 2) |
| v1.05.13 | 3f: bez minusa na początku sumy, `n√n`, symbol `[0 · ∞]` |
| v1.05.14 | 5b/5c uproszczone (3/4, 5/9), 4f bez podwójnej kreski, 6e bez pustego kroku; **kolor zamiast podkreślenia** |
| v1.05.15 | raporty D/E: „dlaczego” mówi o zadaniu, dymek o regule (bramka dubli w `test/step-why.js`); pochodne u/v, `u′ =`/`v′ =` w krokach, √x i 1/x jako potęga (też w całce), „Mnożę przez pochodną środka/stałą”, licznik ilorazu wymnożony, wynik w kolejności z rachunku; kolor na podstawieniu (iloczyn, iloraz, tożsamości); „Kolorowa potęga dąży do e”; bez `[ ]` wokół koloru |
| v1.05.16 | całki (raport E): F(b), F(a) z wstawieniem (`−cos(π) − (−cos(0))`), ułamki proste z A i B, przez części bez podwójnego minusa + „Wstawiam policzoną całkę”, tożsamość i „Całkuję każdą część” osobno, `dx = dt/2`, `1/2 · arctg(x/2)`, reszta z dzielenia w nawiasach |
| v1.05.17 | równania (raport E, R1–R6 + zrzut `x=52+65`): „Liczę prawą stronę” bez sprawdzenia, „Zamieniam strony”, mnożenie przy ułamku, „Zmieniam znak obu stron”, `x − 3 = 0`, Δ z `25 − 24`, `√1`, `4/2`, rozkład z delty, Bezout z dzielnikami i przejściem do drugiego czynnika |
| v1.05.18 | przytrzymanie „=” wstawia znak = (obie klawiatury, `MATM0_FKEYS.EQ`); „=” liczy przy puszczeniu, nie przy wciśnięciu |
| v1.05.19 | **sposoby**: 0/0 przy x → liczba ma drugi sposób de l'Hospital (`explain.methods`, `_prefer`/`_first` w `math-limits.js`), przełącznik `settings-seg` nad krokami; de l'Hospital pokazuje same pochodne przed uproszczeniem; bramki (rysunek, „dlaczego”, SymPy) sprawdzają każdy sposób |
| v1.05.20 | ułamki: **błąd `3/5 : 9/10` = 1/150 naprawiony** (po „:” i „·” liczba/liczba to jeden ułamek, `colon` w drzewie, rysunek `{:}`); mnożenie i dzielenie ułamków po szkolnemu, dodawanie liczników z rachunkiem, „dlaczego” przy wspólnym mianowniku z liczbami (`step.dens`) |
| v1.05.21 | **nierówności** liniowe i kwadratowe (`solveInequality` w `math-steps.js`): odwracanie znaku przy ujemnej, miejsca zerowe + „Odczytuję znak z paraboli”, przedziały ⟨ ⟩, ∪, ℝ, ∅, ℝ \\ {a}; bezpiecznik w punktach próbnych; rysunek zbiorów (`setTex` w `expr-to-latex.js`); wpis w ściądze |
| v1.05.22 | **układy równań 2×2** (`solveSystem`): dwa sposoby (podstawianie, przeciwne współczynniki) w przełączniku, sprzeczny i nieoznaczony, sprawdzenie w obu równaniach, wynik liczony wzorami Cramera i porównany z krokami; separator „, ” albo „;” |
| v1.05.23 | **równania wymierne** (`solveRational`): dziedzina, mnożenie przez mianownik / na krzyż, rozwiązanie istniejącym silnikiem, odrzucanie spoza dziedziny (∉ D); strona = jeden ułamek albo wielomian |
| v1.05.24 | **wykładnicze i logarytmiczne** (`solveExpLog`): wspólna podstawa (4^x = 2^(x+3), 2^x = 1/8), logarytm gdy jej brak (2^x = 5), log z dziedziną i definicją (dymek `definicja-logarytmu`), log = log; `show()` rysuje funkcje; bramka: `log` bez podstawy = log₁₀ |
| v1.05.25 | **wartość bezwzględna** (`solveAbs`, `absInequality`: przypadki, podwójna nierówność) i **pierwiastek** (`solveRadical`: kwadrat, odrzucanie fałszywych); parser `|…|`; raport F: dziedzina logarytmu z D i częścią wspólną, pusta D kończy, zdania przy pierwiastku podwójnym / dzieleniu nierówności / nawiasach |
| v1.05.26 | **trygonometryczne** (`solveTrig`): sin/cos/tg(p·x) = wartość z tablicy, serie z okresem, k ∈ ℤ, |a| > 1 → brak; rysunek: tg/ctg/arctg (polska szkoła, w całej apce), ℤ; `√2` bez nawiasu |

## Jak to działa (mapa)
- Krok = `{ label, math, formula?: { id } }`. Fragment w `⟦…⟧` = miejsce użycia wzoru: rysowany kolorem akcentu,
  stuknięcie → dymek (`_openStepsPop` w `app.js`), „Więcej” → widok z „Wróć”. Wzory: `js/step-formulas.js` (≈ 40 wpisów).
- „Dlaczego”: `js/step-why.js` — reguły po nazwie kroku + kontekst; kroki-stwierdzenia (Wynik, Równanie…) bez zdania.
- Rysunek kroku: `stepToLatex(math, fid)` dzieli tekst na kawałki („ = ”, „ → ”, „, ”…), każdy przez parser → LaTeX;
  `'\n'` = nowa linia kroku. Silniki: `js/math-limits.js` (`line(log, label, math, formula)`), `js/math-calculus.js`, `js/math-steps.js`.

## Testy-bramki (pilnują jakości kroków)
- `test/expr-to-latex.js`: ~515 kroków (58 granic + ściąga + dodatkowe) bez zapisu z klawiatury; każdy wpis słownika użyty w kroku.
- `test/step-why.js`: każdy krok z przekształceniem ma zdanie ≤ 25 słów.
- `test/math-{limits,steps,calculus}.js`: sekcje „3b”–„3f” (kolejność, podstawienia, etykiety bez wzorów, dymki).
- e2e `test/e2e/steps-drawing.spec.js`, `formula-drawing.spec.js`.

- **Bramka SymPy** `npm run check:steps` (2026-11-23): 377 równości z 771 kroków sprawdzonych, 0 fałszywych; auto-test łapie fałsz.
  Nie jest w `npm test` (wymaga venv, ~1 min) — uruchamiaj po zmianach kroków. Pokrycie: `check.py -v`.

## Sposób pracy, który się sprawdził
TDD (test czerwony → kod), potem **agent „słaby uczeń”** czyta kroki (JSON z kroków + `why`) i zgłasza błędy zapisu,
skoki, niepasujące zdania; poprawki; zrzut z telefonu (Playwright 390×844); wydanie po „wysyłaj” Mateusza.
Skrypt do zrzutu kroków do JSON: wzór w `HANDOFF` niżej (pliki w scratchpadzie znikają między rozmowami).

## Do zrobienia — kolejność uzgodniona z Mateuszem: równania (pkt 2), potem podręcznik ze ściągi (zakładka „Wzory”, treść z `deep-explain`/`bottom-up`, przykłady przez bramkę SymPy)

### Lista (raporty `research/raport-D-granice-kolor.md`, `raport-E-reszta-kolor.md`; zrobione w v1.05.15 pominięte)
1. Całki: zrobione w v1.05.16; zostało `∫ x²/2 · 1/x dx = ∫ x/2 dx` w przez części (C4) i `x² + 2x + 5` w arctg (wzór z `x + 1`).
2. Równania: zrobione w v1.05.17; zostało dzielenie W(x) przez (x − r) pokazane (Horner) i U1/U2 (wspólny mianownik).
3. Ułamki: zrobione w v1.05.20 (U1, U2). Kwadrat sumy w postaci wzoru (K1 w E) — zostało.
4. Granice (raport D): sprzężenie w kolejności a² − b² (K3), `√(x²)` w miejscu użycia (K4), `ln(1 + 2x)` (K5), dymek różnicy sześcianów
   przy rozkładzie (K6), etykieta „sprzężenie” przy sześcianach (K8), „pierwiastki się skasowały” tam, gdzie pierwiastek został,
   oraz skoki z sekcji 4 raportu D.
4b. **Sposoby** — zrobione dla 0/0 przy x → liczba (8a–9f). Dalej: ∞/∞ (wyłączanie potęgi / de l'Hospital), krok „Zapisujemy inaczej” zbędny w sposobie de l'Hospitala.
4c. **Więcej wyjaśnienia w stylu Photomath** przy nauce granic (Mateusz): łączy się z pkt 5 i z podręcznikiem.
5. Kolorowanie tego, co się zmieniło w kroku (jak Photomath) — Mateusz: później.
6. Starsze otwarte: `TODO.md` (luka `lim (2/n)^n`, skaner, edytor 2D).

## Plan „jak Photomath” — nowe typy zadań (Mateusz 2026-11-23: „do wszystkiego matematycznego”)
Przegląd: rachunki, ułamki, potęgi, pierwiastki, wielomiany, rozkład, pochodne, całki, granice — są. Brakuje (kolejność propozycji,
od najczęstszych w szkole):
1. Nierówności — ZROBIONE v1.05.21 (liniowe, kwadratowe). Później: szkic paraboli z zaznaczonym zbiorem (Photomath), wymierne `1/x > 2`.
2. Układy równań 2×2 — ZROBIONE v1.05.22. Później: klamra układu na rysunku, 3×3, sposób graficzny.
3. Równania wymierne — ZROBIONE v1.05.23 (strona = jeden ułamek). Zostało: suma ułamków `1/x + 1/(x+1) = 1` (wspólny mianownik), upraszczanie `(x² − 1)/(x − 1)`, nierówności wymierne.
4. Wykładnicze i logarytmiczne — ZROBIONE v1.05.24. Zostało: `3·2^x = 24`, `2^(x+1) = 5`, podstawienie t = 2^x, `ln`, suma logarytmów.
5. Wartość bezwzględna i pierwiastek — ZROBIONE v1.05.25 (|A| = c, |A| ≷ c, √A = B). Zostało: |A| = |B|, |A| = B, √A + √B = c.
6. Trygonometryczne — ZROBIONE v1.05.26 (wartości z tablicy). Zostało: sin x = 0,3 (arcsin), sin x = cos x, kwadratowe w sinusie, przedział ⟨0, 2π⟩, okrąg jednostkowy na rysunku.
7. Procenty krok po kroku, NWD/NWW, funkcja kwadratowa (wierzchołek, postać kanoniczna).
Każdy nowy typ: TDD + bramka SymPy (`npm run check:steps`, dopisać przykłady do `EXTRA` w `scripts/steps-check/dump.js`) + agent „słaby uczeń”.

- Bramka SymPy w równaniach i układach sprawdza też równania po drodze: każde musi być spełnione przez odpowiedź
  (`answers`/`satisfied` w `check.py`; przy kilku pierwiastkach — przez któryś). Nierówności: tylko rachunki na liczbach.

### Z raportu F (`research/raport-F-nowe-typy.md`), do zrobienia
- Szkic paraboli / oś z zaznaczonym przedziałem w nierównościach (Photomath) — rysunek ma być wierny (zasada canvas).
- Skracanie ułamków pokazane (30/45 = 2/3 przez NWD), schemat Hornera przy Bezout, −b = 5 przy wzorach na x.
- 1/8 = 2^(−3) z wyjaśnieniem (dymek: prawa potęg), log bez podstawy = log₁₀ w zdaniu.
- „Sprzeczny” / „nieoznaczony” po nazwie w układach; sprawdzenie zawsze na końcu (logarytmy, nierówności — punkt próbny).
- Osobne „Redukuję” po „Przenoszę” tylko gdy coś się redukuje.

## Pułapki
- **Nie sprawdzaj silnika przez `node -e`** (decimal.js) — skrypt w pliku, `require` modułów z `js/`, na końcu `process.exit(0)`.
- Zrzut kroków (`kroki.json` dla agenta): `const S=require('./js/math-steps.js'); require('./js/math-calculus.js'); require('./js/math-limits.js');
  const W=require('./js/step-why.js'); const r=S.run(q); r.explain.steps.map((s,i)=>({label:s.label, why:W.whyFor(s,r.explain.title,r.explain,i), math:s.math}))`.
- Zmiana domyślnego ustawienia = migracja ze znacznikiem (`calcFormulaRoomDefaultV2` jako wzór).
- Zmiany w `show()` (math-calculus) działają w całym silniku — po nich pełne `npm test` i porównanie wyników zestawu.
- 5 błędów `npm run check` w `js/math-limits.js` są stare.
- Commity bez dopisków o AI; po zmianie wersji `npm run sync-version`; Mateusz pozwolił (2026-11-22) wysyłać bez pytania po zielonych testach — pytaj tylko przy ryzykownych zmianach (dane, migracje).
