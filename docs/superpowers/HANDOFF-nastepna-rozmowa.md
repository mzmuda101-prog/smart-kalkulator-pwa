# Zacznij tutaj — przekazanie do nowej rozmowy (2026-11-27, v1.05.65)

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

## Zrobione (2026-11-27, v1.05.76–77): wnioski ze zrzutów Mateusza
- 1/0: „Nie dzielimy przez 0” + chipy 0⁺: +∞ / 0⁻: −∞ (granice z krokami); 0/0 zostaje „nieokreślone”.
- Granice ∞/∞: nowy sposób „Dzielenie przez najwyższą potęgę” (szkolny, z zeszytu: [1/0⁺] = +∞) jako dodatkowa opcja,
  krok 1 pokazuje granice licznika i mianownika, ostatni krok ma n⁴/n³ = n.
- Na później (etap „interaktywność”): odtwarzacz kroków jak w innej aplikacji (jeden krok naraz, „Dalej”, zmiana
  podświetlona względem poprzedniego kroku). Do decyzji: znak dzielenia w ładnym zapisie (pole „1÷0”, zapis „1:0”).

## Zrobione (2026-11-27, v1.05.75): partia 2b (pochodne i całki)
- 12 wierszy (S4, S5, S17, S30, S34, S36, S37, S40, S45, S46, S47, S55), plan: `docs/superpowers/plans/2026-11-27-partia-2b.md`.
- Reguła łańcuchowa z nazwanym u, wykładniki ułamkowe policzone, sprawdzenie całki z rachunkiem pochodnej,
  ułamki proste z A i B wstawionymi, przez części z du, v i v · du, sin²/cos² i arctg bez skrótów.
- Naprawione przy okazji: pochodna iloczynu ze stałą miała fałszywą równość; rdzeń wypisywał (√3)² jako √3
  (pochodna arctg(x/√3) pokazywała x²/√3); bramka SymPy czyta \sin x jako sinus jednej litery.

## Zrobione (2026-11-27, v1.05.70): partia 2a-2 (granice algebraiczne)
- 15 wierszy tabeli skoków (S3, S6–S10, S12–S15, S23, S24, S27, S28, S32), plan: `docs/superpowers/plans/2026-11-27-partia-2a-2.md`.
- Sprzężenie krok po kroku (linia środkowa, licznik osobno, dzielenie przez ułamek, skracanie), wartości częściowe
  na końcu (√4 = 2, 4/16, usuwanie niewymierności), wyciąganie spod pierwiastka, wspólny mianownik z wymnożeniem,
  potęgi z każdego nawiasu, wykładniki ułamkowe, x → −∞ ze znakiem. Nowe hasło potega-iloczynu.
- S9: rozbicie na dwie różnice odrzucone (części osobno → ±∞), zostaje sprzężenie z nazwanym −2.
- Nie zrobione: przegląd „słabego ucznia” na nowych krokach (warto przy następnej partii granic).

## Zrobione (2026-11-27, v1.05.65): etap „dymki przy podstawach”
- Tabela reguł `STEP_RULES` + bramka `test/step-coverage.js` (100% kroków, także zadania rzucające wyjątek
  i migawka `test/fixtures/step-rules-labels.json` — szeroki wzorzec, który złapie nową etykietę, widać w teście;
  odświeżenie: `UPDATE=1 node test/step-coverage.js`), przycisk z książką, nowe hasła (m.in. znak-trojmianu, liczba-przeciwna).
- Tura poprawek po przeglądzie: prawdziwe nazwy kroków (liczone, nie zgadywane), uwagi słabego ucznia o skokach
  w `skoki-tabela.md` (S118, S119 i uzupełnione S5, S17, S43, S47).
- Pomysł Mateusza na później (2026-11-27): „naukowy/smart” bez osobnego trybu: przełącznik albo rozpoznawanie
  poleceń wpisanych na klawiaturze kalkulatora (albo jedno i drugie). Najpierw przeanalizować najlepsze kalkulatory
  naukowe (funkcje, zapis i format wyników), potem projekt (brainstorming) i decyzja Mateusza.
- Pomysł Mateusza na później: „rozumienie zdań” (np. `100m w 5 min to ile km/h`; silnik liczy `100 m / 5 min to km/h`) — osobny etap, uzgodnić z sesją od parsera.

## Następny krok (do decyzji Mateusza)
- Zrobione: partia 2a-1 (v1.05.55), paczka A sposobów (v1.05.60), partia 2a-2 (v1.05.70), partia 2b (v1.05.75).
- Do wyboru: **partia 2c** (równania i reszta: S2 krytyczne, S19, S33…) albo **paczka B sposobów**
  z `docs/superpowers/research/sposoby-katalog.md`. Potem paczki C–E, etap 4, „interaktywność”.
- Zasady: domyślnie najkrótszy sposób, w przełączniku drugi szkolny (pamięć: methods-order).

## Jak pracowaliśmy (sprawdziło się)
- brainstorming → krótki projekt w `docs/superpowers/specs/` → akceptacja → plan w `docs/superpowers/plans/` → wykonanie po kolei agentami z recenzentem po każdym zadaniu (kopia robocza `.worktrees/<nazwa>`, symlinki `node_modules` i `scripts/steps-check/.venv`), na końcu przegląd całości mocnym modelem.
- Po zmianach kroków: `npm run check:steps` (SymPy) i agent „słaby uczeń” na zmienionych zadaniach.
- Wydanie: `APP_VERSION` w `version.js`, `npm run sync-version`, `npm run test:predeploy` (~6 min), commit, push na main (Mateusz pozwolił po zielonych testach).
