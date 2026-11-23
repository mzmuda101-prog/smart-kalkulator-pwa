# Przekazanie: podręcznik (zakładka wiedzy) — stan na 2026-11-23, v1.05.27

Dla nowej rozmowy. Najpierw: `AGENTS.md`, `../ZASADY-AGENTOW.md`, potem ten plik.
Stan kroków rozwiązań i lista otwartych rzeczy: `docs/superpowers/HANDOFF-kroki.md`.

## Gdzie jesteśmy
Brainstorming podręcznika (skill `superpowers:brainstorming`) dopiero się zaczął — nic nie jest zbudowane.
Kolejne kroki według skilla: podejścia (2–3, z rekomendacją) → Mateusz wybiera → projekt w
`docs/superpowers/specs/2026-11-2x-podrecznik-design.md` → akceptacja → `superpowers:writing-plans` → kod.

## Co powiedział Mateusz (jego słowa, sens)
- Podręcznik ma być **dobrą zakładką wiedzy**, a nie zbiorem przypadkowych rzeczy.
- **Docelowo do wszystkich tematów** („w przyszłości do wszystkiego”) — struktura musi to udźwignąć
  (dużo działów, dużo haseł), choć na start wystarczy to, co już jest.
- Wcześniej (2026-11-23): dymek z „Więcej” to dobry kierunek, „taki trochę podręcznik”; **warunek: wszystko
  poprawne matematycznie**. Do treści użyć skilli `deep-explain` i `bottom-up` (oraz `motivate-learning`,
  `term-origins` jako dodatek); każdy przykład liczbowy przez bramkę SymPy (`npm run check:steps`).
- Wcześniej zaproponowałem (bez decyzji Mateusza): zakładka „Wzory” w ściądze zamiast nowego miejsca w menu
  (zasada bez dubli), poziom liceum + 1. rok studiów.
- **Pytanie bez odpowiedzi**: w jakiej sytuacji najczęściej sięga — nauka działu po kolei (rozdziały)
  czy szukanie wzoru w trakcie zadania (wyszukiwarka). Zapytać ponownie, jeśli nie wynika z „zakładki wiedzy”.

## Co już jest w kodzie (do ponownego użycia)
- `js/step-formulas.js`: 37 wpisów `{ name, tex, why, level, more[] }`; `$…$` w tekstach = LaTeX.
  Test `test/expr-to-latex.js` wymaga, by każdy wpis był użyty w jakimś kroku i miał treść.
- Widok „Więcej” z „Wróć”: `_openStepsMore(id)` w `app.js` (szuflada kroków, `#stepsView`), rysunek przez
  `_loadFormulaLib()` (MathLive) i `_stepsRich` (zdania z `$…$`).
- Ściąga: `#commandHelpDrawer`, sekcje `.help-section[data-help=calculator|notepad|engineering|graph]`,
  wyszukiwarka `#helpSearch`; komendy w `command-definitions.js`.
- Do uporządkowania: pole `level` jest niespójne („Potęgi” przy tablicy pochodnych, różne zapisy
  „Liceum rozszerzenie” / „zakres rozszerzony”) — przyda się jako podział na poziomy.
- Brak haseł dla nowych typów zadań (nierówności, układy, trygonometria, procenty, NWD/NWW).

## Pomysły do rozważenia przy podejściach (moje, nie decyzje)
- Hasło = obecny wpis + dział + słowa kluczowe + przykład „Spróbuj” (wpisuje zadanie do kalkulatora,
  wynik i kroki już są) + powiązane hasła.
- Rozwój do „wszystkiego”: dane haseł w osobnym pliku/folderze (np. `js/kb/…`), ładowane leniwie,
  żeby apka nie puchła; ten sam format dla dymków w krokach i dla podręcznika (jedno źródło).
- Wyszukiwarka po nazwie, słowach kluczowych i zapisie wzoru; podział: dział → poziom.

## Inne otwarte (skrót — pełna lista w HANDOFF-kroki.md)
Kolorowanie zmian w kroku (Photomath), długie wzory czytelne (TODO.md), trudniejsze postacie nowych typów
zadań, uwagi z raportów D/E/F, szkic paraboli / okrąg jednostkowy, luki granic i skaner z TODO.md.
