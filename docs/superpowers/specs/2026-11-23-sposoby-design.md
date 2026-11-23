# Sposoby rozwiązania: domyślnie najkrótszy, więcej sposobów w granicach — projekt (etap 1)

Stan: zaakceptowany przez Mateusza 2026-11-23 („wybierz tak, jak proponujesz”), apka v1.05.36.

## Po co
Mateusz (po zrzucie granicy typu 1^∞): ta sama granica da się policzyć różnymi drogami; chce, żeby jak w Photomath
można było wybrać drogę, a apka sama pokazywała „obiektywnie najlepszą”: najczęściej używaną, z najmniejszą liczbą
wzorów do pamiętania albo najkrótszą. Docelowo „przy wszystkim”, ale etapami.

## Podejścia (z rozmowy)
| | Na czym polega | Za | Przeciw |
|---|---|---|---|
| **Najkrótszy (wybrane)** | domyślnie sposób z najmniejszą liczbą kroków, inne w przełączniku | mierzalne, ta sama zasada wszędzie | szkolny sposób nie zawsze pierwszy |
| Szkolny | domyślnie sposób „jak na lekcji”, skrócony w przełączniku | bezpieczniej na kolokwium | trzeba ręcznie ustalać, który jest szkolny |

## Kolejność etapów (moja propozycja)
1. **Ten projekt:** zasada „domyślnie najkrótszy” dla wszystkich sposobów w apce; w granicach nowe sposoby:
   1^∞ — „Wzór skrócony” `lim f^g = e^(lim g·(f − 1))` obok „dorabiania jedynki”; ∞/∞ — de l'Hospital obok
   wyłączania najwyższej potęgi.
2. Sposoby w innych typach zadań (np. równanie kwadratowe: delta albo rozkład).
3. Schemat Hornera jako rysowana tabelka ze strzałkami (HTML/CSS, bez kanwasu).
4. Czytelność długich wzorów (łamanie „aₙ = …”, mały wykładnik).

## Cele (etap 1)
- Przy otwarciu kroków z kilkoma sposobami domyślnie zaznaczony jest ten z najmniejszą liczbą kroków (remis →
  kolejność silnika). Dotyczy też istniejących: 0/0 (rozkład / de l'Hospital) i układów równań.
- 1^∞: drugi sposób „Wzór skrócony”: krok „Odejmuję 1 od podstawy”, krok ze wzorem w kolorze (dymek, nowe hasło
  `e-skrocony` w podręczniku z „skąd wzór”), granica wykładnika, składamy wynik. Wynik musi być ten sam co
  w pierwszym sposobie (sprawdzane jak przy de l'Hospitalu) — inaczej drugiego sposobu nie ma.
- ∞/∞: drugi sposób de l'Hospital, gdy pierwszy był inny (np. najwyższa potęga), z tym samym sprawdzeniem wyniku.

## Poza zakresem
Etapy 2–4; sposoby dla 0 · ∞, ∞ − ∞ itp.; wybór „szkolny/najkrótszy” w ustawieniach.

## Czego nie wolno
- Drugi sposób z innym wynikiem niż pierwszy (bramka: ten sam tekst wyniku i zgodność z liczeniem numerycznym).
- Krok bez „dlaczego” albo „dlaczego” powtarzające dymek (bramki `test/step-why.js`).
- Równość w krokach, której nie przepuści SymPy (`npm run check:steps` sprawdza każdy sposób).

## Testy
- Node: `rozwiąż`/`lim` z 1^∞ i ∞/∞ mają 2 sposoby, wynik równy; wzór skrócony ma dymek `e-skrocony`.
- e2e: kroki `lim n→∞ ((3n^2+4n+1)/(3n^2-2n+5))^(4n+3)` otwierają się na „Wzór skrócony” (krótszy), przełącznik
  pokazuje oba; układ `2x + y = 7, x - y = 2` otwiera się na krótszym sposobie.

## Etap 2+3 (Mateusz 2026-11-24: „połączyć etap drugi z trzecim”)
- Równanie kwadratowe z a = 1, b ≠ 0, c ≠ 0 i dwoma różnymi całkowitymi rozwiązaniami: drugi sposób „Suma i iloczyn”
  (wzory Viète'a): krok „Szukam dwóch liczb o sumie −b i iloczynie c” z odgadniętą parą, postać iloczynowa,
  przyrównanie czynników do zera, to samo sprawdzenie i odpowiedź. Delta zostaje pierwszym sposobem silnika;
  domyślny wybiera zasada „najkrótszy”.
- Równania stopnia ≥ 3 (twierdzenie Bezouta): krok dzielenia pokazany schematem Hornera — rysowana tabelka
  (współczynniki, iloczyny po skosie ze strzałką, sumy pod kreską; po lewej pierwiastek r), w kolejności:
  szukam pierwiastka → dzielę schematem Hornera → zapisuję iloczyn (dymek Bezouta).
- Nowe hasła: `wzory-viete`, `schemat-hornera` (skąd wzór, skąd nazwa, try/expect, SymPy, „słaby uczeń”).
- Tekst kroku z dzieleniem: `(W) : (x − r) = Q`, żeby SymPy sprawdzał wynik dzielenia; tabelka to dodatkowe pole
  kroku `horner` rysowane w HTML (bez kanwasu), z opisem dla czytnika ekranu.
