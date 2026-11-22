# Przekazanie: kroki rozwiązania zrozumiałe — stan na 2026-11-23, v1.05.16

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

## Sposób pracy, który się sprawdził
TDD (test czerwony → kod), potem **agent „słaby uczeń”** czyta kroki (JSON z kroków + `why`) i zgłasza błędy zapisu,
skoki, niepasujące zdania; poprawki; zrzut z telefonu (Playwright 390×844); wydanie po „wysyłaj” Mateusza.
Skrypt do zrzutu kroków do JSON: wzór w `HANDOFF` niżej (pliki w scratchpadzie znikają między rozmowami).

## Do zrobienia (raporty `research/raport-D-granice-kolor.md`, `raport-E-reszta-kolor.md`; zrobione w v1.05.15 pominięte)
1. Całki: zrobione w v1.05.16; zostało `∫ x²/2 · 1/x dx = ∫ x/2 dx` w przez części (C4) i `x² + 2x + 5` w arctg (wzór z `x + 1`).
2. Równania: Δ z `25 − 24` i `−(−5)` (R1); `5 = 2x − 7` zamiana stron (R2); `x/2 + 1 = 3` mnożenie przez 2 (R3);
   `x² − 3x = 0` bez martwego kroku, z `x − 3 = 0` (R4); rozkład z rachunkiem miejsc zerowych (R5); Bezout z dzielnikami i dzieleniem (R6).
3. Ułamki: skąd wspólny mianownik i dodawanie liczników z rachunkiem (U1, U2); kwadrat sumy w postaci wzoru (K1 w E).
4. Granice (raport D): sprzężenie w kolejności a² − b² (K3), `√(x²)` w miejscu użycia (K4), `ln(1 + 2x)` (K5), dymek różnicy sześcianów
   przy rozkładzie (K6), etykieta „sprzężenie” przy sześcianach (K8), „pierwiastki się skasowały” tam, gdzie pierwiastek został,
   oraz skoki z sekcji 4 raportu D.
5. Kolorowanie tego, co się zmieniło w kroku (jak Photomath) — Mateusz: później.
6. Starsze otwarte: `TODO.md` (luka `lim (2/n)^n`, skaner, edytor 2D).

## Pułapki
- **Nie sprawdzaj silnika przez `node -e`** (decimal.js) — skrypt w pliku, `require` modułów z `js/`, na końcu `process.exit(0)`.
- Zrzut kroków (`kroki.json` dla agenta): `const S=require('./js/math-steps.js'); require('./js/math-calculus.js'); require('./js/math-limits.js');
  const W=require('./js/step-why.js'); const r=S.run(q); r.explain.steps.map((s,i)=>({label:s.label, why:W.whyFor(s,r.explain.title,r.explain,i), math:s.math}))`.
- Zmiana domyślnego ustawienia = migracja ze znacznikiem (`calcFormulaRoomDefaultV2` jako wzór).
- Zmiany w `show()` (math-calculus) działają w całym silniku — po nich pełne `npm test` i porównanie wyników zestawu.
- 5 błędów `npm run check` w `js/math-limits.js` są stare.
- Commity bez dopisków o AI; po zmianie wersji `npm run sync-version`; Mateusz pozwolił (2026-11-22) wysyłać bez pytania po zielonych testach — pytaj tylko przy ryzykownych zmianach (dane, migracje).
