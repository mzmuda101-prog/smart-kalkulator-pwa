# Przekazanie: skaner druku (następny krok) — stan na 2026-11-21

Dla nowej rozmowy / agenta. Najpierw przeczytaj `AGENTS.md`, `../ZASADY-AGENTOW.md`
i projekt `docs/superpowers/specs/2026-11-21-skaner-i-granice-design.md` (szczególnie 5.5, 5.7, 5.9, 7).

## Co jest zrobione
- Etap 1 (granice krok po kroku + upraszczanie pierwiastków) wydany w **v1.04.87**, wypchnięty na GitHub.
  Kod: `js/math-limits.js`, testy `test/math-limits.js` (zestaw 58 zadań, 0 błędnych, 58/58 z krokami).
- Odłożone drobiazgi granic: `TODO.md` → „Granice — odłożone drobiazgi”.

## Decyzja Mateusza (kolejność)
Skaner wydruków → klawiatura do wzorów (5.9) → SymPy → pismo → „Sprawdź moje rozwiązanie”.

## Następny krok: próba techniczna skanera (przed szczegółowym planem — spec 5.7/7)
Cel: czy PP-FormulaNet-S da się uruchomić w przeglądarce i jak czyta wydruki Mateusza.
1. Środowisko: model jest w `~/.paddlex/official_models/PP-FormulaNet-S` (format Paddle, ~227 MB),
   ale **brak środowiska z paddlepaddle/paddleocr** (stare venv zniknęło; systemowy Python to 3.15 —
   paddle może nie mieć kół dla 3.15, użyj Pythona 3.11/3.12, np. z Homebrew, w osobnym venv poza repo).
2. Konwersja: paddle2onnx → ONNX, potem kwantyzacja int8 (cel ok. 60 MB); pomiar trafień przed/po.
3. Uruchomienie w onnxruntime-web (Node, potem przeglądarka/telefon): czas, pamięć.
4. Test na wydrukach: `~/Library/Mobile Documents/com~apple~CloudDocs/Dokumenty szkoła /Granice ciagow i funkcji zadania na cwiczenia 2026.pdf`
   (4 strony, 58 wzorów — odpowiedzi i zapis parsera są w `test/limits-zestaw.json`). Strony renderować do
   obrazów, każdy wzór wyciąć osobno. Materiały lokalne trzymać w `test/fixtures-local/` (w .gitignore).
5. Tłumacz LaTeX → zapis parsera (czysty JS z testami: `\lim_{n\to\infty}`, `\frac`, `\sqrt[n]`, `\cdot`, `\infty`, `\left( \right)`);
   punkt wyjścia: `latex_to_expr` w `scripts/ocr-bench/models.py`.

## Ograniczenia do pamiętania
- CSP w `index.html`: trzeba dodać `'wasm-unsafe-eval'` do `script-src`; `connect-src 'self'` — modele z naszej domeny, pliki < 50 MB.
- Aparat: `<input type="file" accept="image/*,application/pdf" capture>` działa mimo `Permissions-Policy: camera=()` (vercel.json).
- Gotowe do przeniesienia z `documents-workbench-pwa`: `app/photo-import.js` (kartka, perspektywa, wybielanie), `lib/pdfjs/` (PDF → obraz).
- Zdjęcie nie wychodzi z telefonu; model pobierany raz, za zgodą, z rozmiarem w oknie (wzór: `local-ai.js` w Documents).

## Sposób pracy, który się sprawdził
Projekt → plan (`docs/superpowers/plans/`) → praca na osobnej gałęzi/worktree → TDD → przeglądy kontrolne
recenzenta (opus) → końcowy przegląd → połączenie z main. Commity bez dopisków o AI, wersja +1 i `npm run sync-version`.
