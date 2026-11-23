# Przekazanie: podręcznik (zakładka wiedzy) — stan na 2026-11-23, v1.05.30

Dla nowej rozmowy. Najpierw: `AGENTS.md`, `../ZASADY-AGENTOW.md`, potem ten plik.
Projekt: `docs/superpowers/specs/2026-11-23-podrecznik-design.md`, plan: `docs/superpowers/plans/2026-11-23-podrecznik.md`.

## Co jest (v1.05.30)
- Zakładka **Podręcznik** (na telefonie w „Narzędziach”): start z liczbą haseł, 9 działów, hasło z rysunkiem wzoru,
  „po co”, akapitami, poziomem (liceum / rozszerzenie / studia), „Spróbuj” (wpisuje przykład do kalkulatora)
  i „Powiązane”. Wyszukiwarka bez polskich znaków, jeden obszar `#hbStatus` dla czytnika ekranu.
- **Z kroków:** „Więcej” w dymku otwiera to samo hasło; „Wróć do kroków” przywraca miejsce, sposób, dymek i fokus.
  Po zmianie wyrażenia stare kroki nie wracają. Stary widok „Więcej” w szufladzie usunięty.
- **Dane (jedno źródło):** `js/step-formulas.js` — wpisy `FORMULAS` + `DZIALY` + tabela `HANDBOOK`
  (dział, poziom, słowa, `try`, `expect`, powiązane). Logika: `js/handbook.js` (`chapters`, `entries`, `search`, `get`).
  Ekran: `app.js` (`hbShow`, `hbBack`, `hbTry`, `hbOpenFromSteps`, `hbReturnToSteps`), style `.hb-*`.
- 46 haseł, w tym nowe: nierówność kwadratowa, układy (podstawianie, przeciwne współczynniki), wartość bezwzględna,
  wartości trygonometryczne, okresowość, procent z liczby, zmiana o procent, NWD i NWW.

## Bramki
- `test/handbook-data.js`: każdy `try` daje dokładnie `expect`, dział, poziom, powiązane, brak zgubionych ukośników w LaTeX.
- `test/handbook.js`: wyszukiwanie i spis. e2e: `test/e2e/handbook.spec.js`, `steps-drawing.spec.js`.
- `npm run check:steps`: SymPy sprawdza też kroki każdego `try` i równości `$… = …$` z haseł; nie do sprawdzenia → `SKIP_PROSE` w `scripts/steps-check/dump.js` z powodem.

## Nowe hasło — jak dodać
1. Wpis w `FORMULAS` (`name`, `tex`, `why`, `level`, `more`) i wiersz w `HANDBOOK`.
2. `try` w postaci jawnej komendy („rozwiąż …”, „pochodna …”, „lim …”, „kroki …”), `expect` = tekst wyniku po sprawdzeniu poprawności.
3. `node test/handbook-data.js`, `npm run check:steps`, potem agent „słaby uczeń” czyta hasło.

## Dalej (pomysły, bez decyzji)
- Ulepszenie dymków w krokach (Mateusz: osobna praca).
- Filtr po poziomie (dane już są), rozdziały do czytania po kolei.
- Odłożone drobiazgi z przeglądu: wzór główny hasła bez tekstu dla czytnika ekranu; po nieudanym wczytaniu MathLive
  offline brak ponownej próby do przeładowania strony.
- Wstecz telefonu nie wraca do kroków (apka nie obsługuje historii przeglądarki w szufladach).
- Przy 150+ hasłach podzielić dane na `js/kb/<dział>.js` wczytywane leniwie (format bez zmian).
- Znany stary błąd: `npm run check` zgłasza typy w `js/math-limits.js` i `js/step-why.js` (był przed podręcznikiem).
