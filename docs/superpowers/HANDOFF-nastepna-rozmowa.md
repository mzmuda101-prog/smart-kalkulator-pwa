# Zacznij tutaj — przekazanie do nowej rozmowy (2026-11-24, v1.05.60)

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

## W TOKU (2026-11-27): etap „dymki przy podstawach”
- Gałąź `dymki-podstawy`, kopia robocza `.worktrees/dymki-podstawy` (HEAD 6bdb2f0, na origin/main v1.05.63). Zrobione: tabela reguł
  `STEP_RULES` + bramka `test/step-coverage.js` (100% kroków w `queries.js`), przycisk z książką, 31 nowych haseł.
- Zostało: tura poprawek z końcowego przeglądu i ucznia — lista 9 punktów w
  `.worktrees/dymki-podstawy/.superpowers/sdd/2026-11-24-dymki-podstawy/final-fixes.md` (dziennik: `progress.md` obok),
  potem krótki przegląd, rebase na origin/main, wydanie v1.05.65 (lub wyżej, jeśli main poszedł dalej).
- Pomysł Mateusza na później: „rozumienie zdań” (np. `100m w 5 min to ile km/h`; silnik liczy `100 m / 5 min to km/h`) — osobny etap, uzgodnić z sesją od parsera.

## Następny krok (do decyzji Mateusza)
- Zrobione: partia 2a-1 (v1.05.55), rozkład jak w szkole = paczka A sposobów (v1.05.60).
- Do wyboru: **paczka B sposobów** z `docs/superpowers/research/sposoby-katalog.md` (nierówności „wężykiem”, Cramer/Gauss,
  podstawienie t w wykładniczych/trygonometrycznych) albo **partia 2a-2** z `docs/superpowers/research/skoki-tabela.md`
  (granice algebraiczne: sprzężenie, wspólny mianownik, wykładniki ułamkowe). Potem 2b, 2c, paczki C–E, etap 4, „interaktywność”.
- Zasady: domyślnie najkrótszy sposób, w przełączniku drugi szkolny (pamięć: methods-order).

## Jak pracowaliśmy (sprawdziło się)
- brainstorming → krótki projekt w `docs/superpowers/specs/` → akceptacja → plan w `docs/superpowers/plans/` → wykonanie po kolei agentami z recenzentem po każdym zadaniu (kopia robocza `.worktrees/<nazwa>`, symlinki `node_modules` i `scripts/steps-check/.venv`), na końcu przegląd całości mocnym modelem.
- Po zmianach kroków: `npm run check:steps` (SymPy) i agent „słaby uczeń” na zmienionych zadaniach.
- Wydanie: `APP_VERSION` w `version.js`, `npm run sync-version`, `npm run test:predeploy` (~6 min), commit, push na main (Mateusz pozwolił po zielonych testach).
