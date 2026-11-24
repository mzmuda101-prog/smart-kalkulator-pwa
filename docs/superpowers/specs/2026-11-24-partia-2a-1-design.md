# Partia 2a-1: granice — wzory z e i reguły (projekt)

Stan: zatwierdzony przez Mateusza 2026-11-24 („tak, lecimy od 2a-1”): podział partii 2 na 2a-1, 2a-2, 2b, 2c; zasady
z tabeli `docs/superpowers/research/skoki-tabela.md`. Apka v1.05.50 → v1.05.55.

## Po co
Uwagi z przeglądu „słabego ucznia” (tabela skoków): fałszywe zdania i skoki w granicach z e (1^∞), w symbolu
nieoznaczonym, w schemacie Hornera i w regule de l'Hospitala z pierwiastkiem. Fałsz szkodzi bardziej niż brak rachunku.

## Zakres (wiersze tabeli)
| wiersz | co zmieniamy |
|---|---|
| S1, S26 | „dlaczego” w sposobie „Wzór skrócony” mówi prawdę: podstawa dąży do 1; wynik to e do potęgi lim g·(f − 1) z liczbą z zadania; przy stałym czynniku (5(1+1/n)^n) zdanie o czynniku przed granicą |
| S21 | „dlaczego” przy kroku ze wzorem mówi, czemu liczymy g·(f − 1); dymek dostaje „W tym zadaniu:” (f = …, g = …) |
| S16 | etykieta „Dorabiamy jedynkę” → „Zapisujemy podstawę jako 1 + 1/aₙ”; pokazane 4/n = 1/(n/4) |
| S20 | rozbicie wykładnika na aₙ · (reszta) pokazane, np. n = (−n) · (−1) |
| S22 | różnica licznik − mianownik pokazana: (5n + 7) − (5n − 8) = 15 |
| S11 | krok 1 z symbolem nieoznaczonym przy x → liczba pokazuje podstawienie, z którego wyszło 0/0; dymek „Symbol nieoznaczony” ma „W tym zadaniu:” |
| S18 | dymek „Schemat Hornera” ma „W tym zadaniu:” z rachunkiem pierwszej kolumny (np. „r = 2: 1; 0 + 2 · 1 = 2; …; reszta 0”) — granice i równania |
| S25 | de l'Hospital: pochodna pierwiastka z wielomianu pokazana regułą łańcuchową (1/(2√(…)) · (…)′) |

## Decyzje (moje, do zmiany przez Mateusza)
- Nazwa sposobu „Wzór skrócony” zostaje (wybrał ją Mateusz w etapie 1 sposobów); S21 naprawiamy zdaniem i dymkiem, nie nazwą.
- Krok 1 (S11) dostaje drugą linię z podstawieniem zamiast osobnego kroku — liczba kroków decyduje o domyślnym sposobie.

## Czego nie wolno
- Zdanie „dlaczego” > 25 słów albo powtarzające dymek (`test/step-why.js`); równość, której nie przepuści SymPy (`npm run check:steps`).
- Zmiana wyniku którejkolwiek granicy z zestawu.

## Testy
Każdy wiersz: test, który najpierw pada (Node `test/math-limits.js`, `test/step-why.js`, `test/step-popovers.js`);
na koniec „słaby uczeń” czyta zmienione zadania, SymPy, pełne testy, zrzut z telefonu, wydanie v1.05.55, stan wierszy „zrobione v1.05.55”.
