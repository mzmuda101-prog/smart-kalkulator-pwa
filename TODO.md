# TODO / Do przemyślenia

## AI — wąska, bezpieczna integracja (pomysł na przyszłość)

**Status:** do przemyślenia, NIE priorytet. Rdzeń liczenia zostaje deterministyczny (parser regułowy + testy baseline).

Zakres — tylko jako *fallback*, gdy parser nic nie rozpozna:

- Malutki model intent-classification (np. Hugging Face `transformers.js` pipeline) tłumaczący
  swobodne zdanie użytkownika na ISTNIEJĄCĄ komendę parsera — z podglądem przed wykonaniem.
- Zasady bezpieczeństwa: opt-in w ustawieniach, lazy-load wag (nie blokuje startu PWA),
  działanie w Web Workerze, model nigdy nie liczy sam — tylko mapuje na komendę.
- Alternatywa bez transformers: Web Speech API do dyktowania wyrażeń.

Powody ostrożności: PWA offline-first, start < 1 s, deterministyczne wyniki — duże wagi
(30–300 MB) i niedeterminizm LLM są sprzeczne z główną wartością aplikacji.

## Parser — luki względem Raycast (tryb Standard)

### Naprawione (v0.99.28)

- [x] `sin(30 deg)` — liczy w stopniach (resolveTrigDegrees przed jednostkami)
- [x] `2,5k zł` — expandNumericShorthands przed resolveCalcCurrency
- [x] `19m + 47%` — wynik w jednostce roboczej (pierwsza wpisana), nie w bazie mm

### Naprawione (v0.99.29)

- [x] Trygonometria odwrotna/hiperboliczna: `asin`, `acos`, `atan`, `sinh`, `cosh`, `tanh`, `cot`, `csc`
      (+ warianty stopniowe `sind`, `cosd`, `tand`, `asind`…).
- [x] Shorthand walutowy: `1k usd`, `usd 1k` (+ `2,5k zł` z v0.99.28).
- [x] Dzień tygodnia + offset: `poniedziałek za 3 tygodnie` (`monday in 3 weeks`).
- [x] Procent upływu okresu: `ile % dnia`, `ile % roku minęło` (`day percentage`, `year %`).
- [x] Różnica procentowa między wartościami: `różnica % między 30 a 90`.
- [x] ISO 8601 Zulu: `2026-03-15T14:30:00Z`.
- [x] Czytelny timespan: `145 min` → „2 h 25 min" (tekst w polu wyniku).

### Do rozważenia później

- [x] Piksele przy ppi: `2 in na px przy 96 ppi` (T2-7 · 2026-07-07).
- [ ] Krypto (BTC/ETH) — wymaga innego API kursów (NBP/Frankfurter nie mają).

Przewagi nad Raycast (utrzymać): BigInt na dużych liczbach całkowitych, VAT/brutto/netto,
koszt trasy/paliwa, dwujęzyczny PL/EN parser, notatnik Soulver-like, stałe-funkcje, offline.
