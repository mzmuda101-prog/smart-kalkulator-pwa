# Zacznij tutaj — przekazanie do nowej rozmowy (2026-11-24, v1.05.50)

Na start przywitaj się krótko, powiedz, co przeczytałeś, i zaproponuj następny krok (lista niżej). Kod zaczynaj dopiero po decyzji Mateusza.

## Przeczytaj po kolei
1. `AGENTS.md` i `../ZASADY-AGENTOW.md` (prosto, po polsku, git tłumaczyć, bez dopisków o AI w commitach).
2. **`docs/superpowers/research/skoki-tabela.md`** — jedyna lista dalszej pracy nad krokami (skoki, fałszywe „dlaczego”, żargon, pomysły na interaktywność, propozycja partii). Naprawa wiersza = zmiana stanu w tym samym commicie, z testem.
3. `docs/superpowers/agents/slaby-uczen.md` — stałe polecenie agenta „słaby uczeń”; zrzut: `node scripts/steps-dump-student.js <granice|rownania|analiza|reszta|all> <plik.json>`.
4. `docs/superpowers/HANDOFF-kroki.md` — tabela wydań kroków, mapa kodu, pułapki.

## Co zrobiono (v1.05.50, main)
- Mateusz (zrzut granicy `lim x→2 (x⁴−13x²+36)/(x³−2x²+x−2)`): rozkład bez rachunku i „Podstawiamy x = 2” od razu z wynikiem. Okazało się, że raport D zgłosił to dzień wcześniej i nikt nie naprawił — stąd tabela uwag ze stanem.
- Granice: podstawienie pokazuje rachunek poziomami (bramka w testach: każde „Podstawiamy” z rachunkiem, bez gołych liczb ujemnych); krok „Dzielimy schematem Hornera” z tabelkami przed rozkładem (bramka: każdy rozkład ma Hornera).
- Przegląd całego silnika: 224 zadania, 4 działy + stare raporty C, D, E → 91 uwag (10 krytycznych), 14 wzorców lekkiej interaktywności.

## Następny krok (propozycja do Mateusza)
- **Partia 2 z tabeli** (sekcja „Partie”): 2a granice (krytyczne S1, S3, S6–S10), 2b analiza (S4, S5…), 2c równania i reszta (S2 — ułamki…).
- Potem: etap 4 (długie wzory; test z `shortcut` w `test/e2e/steps-drawing.spec.js`), etap „interaktywność” z sekcji tabeli (zasada w pamięci: gdzie się prosi o lekką interaktywność, można dodać przy okazji).

## Jak pracowaliśmy (sprawdziło się)
- brainstorming → krótki projekt w `docs/superpowers/specs/` → akceptacja → plan w `docs/superpowers/plans/` → wykonanie po kolei agentami z recenzentem po każdym zadaniu (kopia robocza `.worktrees/<nazwa>`, symlinki `node_modules` i `scripts/steps-check/.venv`), na końcu przegląd całości mocnym modelem.
- Po zmianach kroków: `npm run check:steps` (SymPy) i agent „słaby uczeń” na zmienionych zadaniach.
- Wydanie: `APP_VERSION` w `version.js`, `npm run sync-version`, `npm run test:predeploy` (~6 min), commit, push na main (Mateusz pozwolił po zielonych testach).
