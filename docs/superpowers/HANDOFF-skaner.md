# Przekazanie: skaner druku — stan na 2026-11-22 (noc)

Dla nowej rozmowy / agenta. Najpierw przeczytaj `AGENTS.md`, `../ZASADY-AGENTOW.md`,
projekt `docs/superpowers/specs/2026-11-21-skaner-i-granice-design.md` (5.5, 5.10, 5.11)
i plan `docs/superpowers/plans/2026-11-21-skaner-druku-etap-3.md`.

## Decyzja Mateusza (kolejność)
Skaner wydruków → klawiatura do wzorów (5.9) → SymPy → pismo → „Sprawdź moje rozwiązanie”.

## Gdzie jest praca
- Gałąź **`feat/skaner-druku`** (wypchnięta na GitHub), osobny katalog roboczy
  `../smart-kalkulator-pwa-skaner` (git worktree). `main` nietknięty (v1.04.87).
- Podgląd Vercela (HTTPS, wymaga logowania do Vercela):
  `https://kalkulator-by-matm0-git-feat-893bfa-mateuszs-projects-ff80359a.vercel.app`
- Rejestr postępu z wszystkimi decyzjami i odłożonymi drobiazgami (poza gitem):
  `../smart-kalkulator-pwa-skaner/.superpowers/sdd/2026-11-21-skaner-druku-etap-3/progress.md`.

## Co jest zrobione
- Plan etapu 3: wszystkie 9 kroków, każdy po recenzji; końcowy przegląd całej gałęzi + poprawki
  (silnik w cache z nagłówkami, model przeżywa aktualizację, limity czasu, offline).
- Pierwszy test na iPhonie (00:11) → poprawki: podgląd kamery rysowany na canvasie (iOS pokazywał
  go pomniejszonego), białe tło przed odczytem, ostrożniejsze przycinanie krawędzi, tryb `?debug=1`.
  Wyniki na zestawie 58 wzorów (/58): czyste 52, szare tło 49, lampa 51, ciasna ramka 40.
- Wersja w gałęzi: v1.04.90 (jeszcze niewydana).

## Następne kroki
1. Jeśli recenzja poprawek z telefonu („phone-fix” w rejestrze) zostawiła uwagi — poprawić je.
2. **Zestaw „udawanych zdjęć”** (decyzja Mateusza zamiast 30 ręcznych zdjęć): z 58 wzorów PDF
   (`test/fixtures-local/`, rendery 200 dpi) wersje: perspektywa, rozmycie, nierówne światło/cień,
   ciepłe światło, zdjęcie ekranu (mora), JPEG, niedokładna ramka (za ciasno/luźno/z sąsiadem).
   Skrypt w `scripts/formula-onnx/` (bazy: `scripts/ocr-bench/bench.py` → `photo`, `perspective`;
   `scripts/formula-onnx/prep.js` przepuszcza przez kod apki). Bramka etapu: ≥ 80% bez poprawek.
   Wynik dopisać do spec 5.10.
3. Podbić wersję w gałęzi (+1) i `npm run sync-version`, żeby telefony dostały poprawki; krótki test
   Mateusza na iPhonie (podgląd kamery wypełnia okno, odczyt druku, tryb samolotowy po 2. wizycie).
4. Połączenie z `main` — **zapytać Mateusza przed scaleniem** (`superpowers:finishing-a-development-branch`).

## Później
- UniMER-Test (część zdjęć ekranu) jako druga próba; notatki pisane z `~/Downloads/6 dokumentów/` → etap 4.
- Odczyt na żywo w ramce bez „Zrób” — spec 5.11.
- Cała apka: offline działa dopiero po 2. wizycie online (SWR bez `ignoreSearch`, `?v=`) — do TODO.

## Ograniczenia do pamiętania
- iPhone mierzyć **tylko przez HTTPS** (przez `http` Safari liczy ~14× wolniej, brak WebGPU i wątków).
- Środowisko Pythona do modelu: `~/.venvs/paddle-onnx` (Python 3.12); budowa modelu: `scripts/formula-onnx/README.md`.
- Zdjęcie nie wychodzi z telefonu; model pobierany raz, za zgodą (52,9 MB).

## Sposób pracy, który się sprawdził
Projekt → plan (`docs/superpowers/plans/`) → osobna gałąź/worktree → zadanie po zadaniu z recenzją
każdego → końcowy przegląd → test na telefonie → połączenie z main. Commity bez dopisków o AI,
wersja +1 i `npm run sync-version`.
