# Przekazanie: wzory graficznie, klawiatura „Wzory”, skaner — stan na 2026-11-22 (wieczór)

Dla nowej rozmowy. Najpierw: `AGENTS.md`, `../ZASADY-AGENTOW.md`, plan
`docs/superpowers/plans/2026-11-22-wzory-graficznie-i-klawiatura.md` (decyzje Mateusza, układ klawiatury,
etap 3), spec `docs/superpowers/specs/2026-11-21-skaner-i-granice-design.md` §5.10b (pomiar zdjęć), §5.12
(wzory w krokach). Starsze przekazanie skanera: `docs/superpowers/HANDOFF-skaner.md`.

## Wydane dziś (main, Vercel)
| wersja | co |
|---|---|
| v1.04.92 | skaner: nieznany znak → „?” + „Wstaw i popraw”; kroki `(1 − 1/n)^n`; „dziś za 3 tygodnie” |
| v1.04.93 | tłumacz LaTeX odporny na potknięcia modelu; pomiar „udawanych zdjęć” (`scripts/formula-onnx/app-read.mjs`) |
| v1.04.94 | skaner: wzór najbliżej środka ramki (`keepCentralLine`), ramka +30%: 18 → 37/58 |
| v1.04.95 | wzór narysowany jak na kartce obok wyniku (`js/expr-to-latex.js` + `vendor/mathlive` renderer) |
| v1.04.96 | silnik: `tg ctg arctg`, `|x|`, `n!`, `log_2(x)`, `sin²(x)`, `mod` |
| v1.05.00–02 | klawiatura „Wzory” (`js/formula-keys.js`): przełącznik w dolnym rzędzie, 5×6, karta „Funkcje”, przytrzymanie ze znaczkami w rogach, klawisz zmiennej z litery granicy, „lim x→ …” z kursorem w polu |

## Czeka na Mateusza (test na iPhonie — jeszcze nie zrobiony)
- rysunek wzoru obok wyniku (też po skanie), ciemny motyw, offline po pierwszym użyciu;
- klawiatura „Wzory”: przytrzymanie (380 ms, brak menu systemowego), klawisz zmiennej → `n` po `lim n→∞`,
  „lim x→ …” otwiera klawiaturę iPhone'a, wygoda układu 5×6;
- skaner: „Wstaw i popraw” zaznacza `?`.

## Następny krok: etap 3 (plan, punkt 3; spec §5.12) — Mateusz zaakceptował kierunek
1. **Każdy krok i wynik rysowany jak na kartce** — nigdzie `sqrt(…)`, `^(…)`, `/` z klawiatury (szuflada kroków
   `renderStepsView` w `app.js`, rozpisanie na komputerze, dymki). Kroki budują tekst (`C.show`, `limHead`
   w `js/math-limits.js` / `js/math-calculus.js` / `js/math-steps.js`) — dać im drugie wyjście LaTeX z tego
   samego drzewa i rysować rendererem z v1.04.95 (`_loadFormulaLib` w `app.js`).
2. **Bez osobnego kroku „użyto wzoru”** (np. „Wzór na e”) — fragment podkreślony w kroku, w którym działa;
   **stuknięcie** → dymek (wzór narysowany, „po co tu”, poziom szkoły); dłuższe → „Więcej” → widok z „Wróć”.
3. Zasada pracy: **najpierw jeden przykład** (`lim n→∞ (1 − 1/n)^n`) i zrzut dla Mateusza, potem reszta.
4. Test: żaden krok z zestawu 58 granic (`test/limits-zestaw.json`) i ze ściągi nie pokazuje `sqrt(` ani `^(`.

## Inne otwarte (TODO.md)
- luka silnika: `lim n→∞ (2/n)^n` = 0 („Jeszcze tego nie rozwiążę”);
- skaner: ramka za ciasna (42/58), prawdziwe zdjęcia z telefonu; drobiazgi skanera z v1.04.91;
- edytor 2D (ołówek przy rysunku) — opcjonalnie później, po klawiaturze.

## Pułapki poznane dziś (oszczędzą czas)
- **Nie sprawdzaj silnika przez `node -e`**: tworzy globalne `module`, `decimal.js` się nie rejestruje
  i granice liczą bzdury (fałszywe „lim x→0+ 1/x = 0”). Pisz skrypt do pliku z `require('test/_bootstrap.js')`
  i kończ `process.exit(0)` (bootstrap trzyma timery).
- Pomiar OCR: **tylko `app-read.mjs`** (kod apki w Chrome); `run.py` przygotowuje obraz inaczej (~25/58).
  Bazą są `test/fixtures-local/wzory-przyciete`; `wzory-czyste` mają obcięte pierwiastki.
- Układ kalkulatora układa się do ~3 s po starcie (komputer) — testy geometrii czekają na 3 zgodne pomiary.
- Na komputerze `body.calc-split-active` ustawia 5 rzędów klawiatury wyższym selektorem — nadpisywać tym samym.
- Elementy w wierszu wyniku muszą być **poza przepływem** (pozycja absolutna), inaczej kod układu łamie wynik.
- 5 błędów `npm run check` w `js/math-limits.js` jest starych — nie są od tych zmian.
- Commity bez dopisków o AI; po zmianie wersji zawsze `npm run sync-version` (robi to `npm run test:predeploy`).
