# Dymki w krokach: wszędzie i z liczbami z zadania — projekt

Stan: projekt do akceptacji Mateusza, 2026-11-23, apka v1.05.31.

## Po co
Mateusz: „głównie to, że w wielu zadaniach ich nie ma”, a do tego drobne ulepszenia. Dymek (kolorowy
fragment kroku → stuknięcie → wzór i „po co” → hasło w podręczniku) jest dziś tylko w granicach,
pochodnych, całkach i równaniach kwadratowych. Uczeń rozwiązujący nierówność, układ, procenty albo
ułamki nie dostaje żadnego wyjaśnienia reguły. Warunek bez zmian: **wszystko poprawne matematycznie**.

## Decyzje Mateusza
- Podejście **A**: kolorowy fragment w kroku, jak dziś (nie ikonka przy nazwie kroku).
- **Linijka z liczbami z zadania** w dymku wchodzi teraz.

## Podejścia
| | Na czym polega | Za | Przeciw |
|---|---|---|---|
| **A (wybrane)** | Silnik oznacza w kroku `⟦…⟧` i `formula: { id }` | jeden sposób w całej apce, dymek przy właściwym rachunku | trzeba ruszyć każdy silnik |
| B | Ikonka „i” przy nazwie kroku, tabela nazwa → hasło | szybko | dwa sposoby otwierania dymku, brak koloru przy rachunku |
| C | Tylko część typów | najmniej pracy | nie zamyka luki |

## Cele
1. **Każdy typ zadania ma co najmniej jeden dymek.** Miejsca (moja propozycja; fragment w `⟦…⟧`):

| typ | krok | hasło | fragment w kolorze |
|---|---|---|---|
| nierówność kwadratowa | Odczytuję znak z paraboli | `nierownosc-kwadratowa` | `a = 1 > 0` |
| nierówność liniowa | Dzielę przez −2 i odwracam znak | **nowe** `odwracanie-znaku` | `6/(−2)` z odwróconym znakiem: cały zapis `x ≤ 6/(−2)` |
| układ, podstawianie | Podstawiam do drugiego równania | `uklad-podstawianie` | `x − (7 − 2x)` |
| układ, przeciwne współczynniki | Dodaję równania stronami | `uklad-przeciwne` | `3x = 9` |
| równanie wymierne | Mnożę obie strony przez (x − 2) | **nowe** `rownanie-wymierne` | `3(x − 2)` |
| wykładnicze, wspólna podstawa | Porównuję wykładniki | **nowe** `rownosc-poteg` | `2x = x + 3` |
| wykładnicze, bez wspólnej podstawy | Zapisuję wykładnik jako logarytm | `definicja-logarytmu` | `log₂(5)` |
| wartość bezwzględna (nierówność) | Zamieniam na podwójną nierówność | `wartosc-bezwzgledna` | `−3 < x − 2 < 3` |
| wartość bezwzględna (równanie) | Rozbijam na dwa przypadki | `wartosc-bezwzgledna` | `x − 2 = 3 lub x − 2 = −3` |
| trygonometryczne | Odczytuję kąt z tablicy | `wartosci-trygonometryczne` | `sin(π/6) = 1/2` |
| trygonometryczne | Zapisuję wszystkie rozwiązania | `okresowosc` | `2kπ` (albo `kπ` dla tg) |
| równanie z pierwiastkiem | Podnoszę obie strony do kwadratu | **nowe** `rownanie-z-pierwiastkiem` | `(x − 3)²` |
| NWD / NWW | Mnożę wspólne czynniki / w najwyższej potędze | `nwd-nww` | `2 · 3` / `2 · 2 · 3` |
| procent z liczby | Zamieniam procent na ułamek | `procent-z-liczby` | `20/100` |
| podwyżka / obniżka | Dodaję (odejmuję) procent | `zmiana-o-procent` | `150 + 30` |
| ile procent | Zamieniam ułamek na procent | `procent-z-liczby` | `1/4 · 100%` |
| ułamki: dodawanie, odejmowanie | Sprowadzam do wspólnego mianownika | **nowe** `wspolny-mianownik` | rozszerzone ułamki |
| ułamki: mnożenie | Mnożę ułamki | **nowe** `mnozenie-ulamkow` | `(2 · 9)/(3 · 4)` |
| ułamki: dzielenie | Dzielę ułamki | **nowe** `dzielenie-ulamkow` | `3/5 · 10/9` |

Dokładny fragment może się różnić, jeśli rysunek kroku wymaga innego podziału. Ważne, żeby kolor stał
na rachunku, w którym reguła działa.

*Moja decyzja:* „każdy typ” = wiersze tej tabeli. Proste równania liniowe, zwykłe działania i upraszczanie
pierwiastków nie dostają dymku: ich kroki to pojedyncze ruchy (przeniesienie, redukcja), które tłumaczy
zdanie „dlaczego”. Przykład NWW w tabeli dotyczy `nww(4, 6)`.
*Moja decyzja:* „150 + 30” przy podwyżce zostaje — hasło mówi w „po co”, że podwyżka to „cała kwota plus
p procent z niej”, więc kolor stoi na tej regule; mnożenie przez 1,2 jest w haśle jako drugi sposób.

2. **Linijka z liczbami z zadania.** Krok może dać `formula: { id, here }`, gdzie `here` to tekst w zapisie
kroku (np. `a = 1, b = −5, c = 6`). Dymek pokazuje go pod wzorem jako „W tym zadaniu:” + rysunek
(`stepToLatex`, jak kroki). Bez `here` dymek wygląda jak dziś. `here` dostają przynajmniej:

| hasło | `here` |
|---|---|
| `delta`, `wzor-x0` | `a = …, b = …, c = …` |
| `wzory-x12` | `a = …, b = …, Δ = …` |
| `wierzcholek` | `a = …, b = …` |
| `nierownosc-kwadratowa` | miejsca zerowe i `a` |
| `wartosc-bezwzgledna` | `a = …, r = …` dla `|x − a|` (dla `|2x + 1|` itp. tylko gdy da się uczciwie podać; inaczej bez `here`) |
| `definicja-logarytmu` | podstawa i liczba logarytmowana |
| `rownosc-poteg` | wspólna podstawa |
| `procent-z-liczby`, `zmiana-o-procent` | `p = …, B = …` |
| `pochodna-iloczynu`, `pochodna-ilorazu` | `f = …, g = …` (już są jako u, v w krokach — te same nazwy co we wzorze hasła) |
| `przez-czesci` | `u = …, v′ = …` |

Nazwy liter w `here` muszą być te same co we wzorze `tex` hasła, inaczej linijka nic nie tłumaczy.
*Moja decyzja:* nie zmieniamy `tex` haseł pod `here`; to `here` bierze litery z `tex` (iloczyn i iloraz: `u`, `v`;
przez części: litery z jego `tex`; nierówność kwadratowa: `a` z `tex` oraz miejsca zerowe `x₁`, `x₂`).
Gdy litera wzoru jest w tym kroku niewiadomą (np. „ile procent” — szukamy `p`), krok nie dostaje `here`.
*Moja decyzja:* `here` pokazujemy także wtedy, gdy wcześniejszy krok wypisał te liczby (np. „Odczytuję
współczynniki”), bo w dymku stoi przy wzorze z literami — to jest jego cała rola. Pomijamy je tylko, gdy
ten sam krok już pokazuje `litera = liczba` (np. „Rozpoznaję iloczyn: u = …, v = …”).

3. **Nowe hasła** (te same zasady co w podręczniku: `try`, `expect`, dział, poziom, SymPy, „słaby uczeń”):
`odwracanie-znaku`, `rownanie-wymierne`, `rownosc-poteg`, `rownanie-z-pierwiastkiem`, `wspolny-mianownik`,
`mnozenie-ulamkow`, `dzielenie-ulamkow`.

4. **Drobne ulepszenia dymku:**
- przycisk „Więcej” → „W podręczniku ›” (prowadzi do hasła; z podręcznikiem z v1.05.30 to już nie „więcej tekstu”);
  *moja decyzja:* pokazywany przy każdym dymku, także gdy hasło nie ma akapitów `more` — każde hasło jest w podręczniku;
- Esc zamyka otwarty dymek i oddaje fokus na fragment wzoru.

## Poza zakresem
- Kolorowanie tego, co się zmieniło w kroku (Photomath) — osobno, Mateusz: później.
- Nowe typy zadań i trudniejsze postacie istniejących.
- Dymki dla każdego kroku (np. „Przenoszę liczby na prawo”): dymek jest dla reguły wartej wyjaśnienia,
  nie dla każdego ruchu. Zdanie „dlaczego” pod krokiem zostaje jak jest.

## Czego nie wolno
- Linijka `here` z liczbami, które nie pasują do zadania albo do liter wzoru.
- Kolor na fragmencie, w którym reguła nie działa.
- Dubel: zdanie „dlaczego” pod krokiem nie powtarza treści dymku (bramka `test/step-why.js`).

## Testy
- Nowy test: po jednym zadaniu na każdy typ z tabeli celu 1 ma co najmniej jeden krok z `formula`.
- Istniejące bramki muszą zostać zielone: `test/expr-to-latex.js` (fragment `⟦…⟧` ma wpis i jest narysowany),
  `test/step-why.js`, `test/math-steps.js`, `npm run check:steps` (SymPy; `⟦⟧` nie może psuć sprawdzania).
- `here`: test w Node sprawdza dla przykładów z celu 2, że `here` istnieje i ma oczekiwany tekst
  (np. `rozwiąż x^2 - 5x + 6 = 0` → delta: `a = 1, b = −5, c = 6`).
- e2e: dymek z `here` pokazuje „W tym zadaniu”, przycisk „W podręczniku” otwiera hasło (istniejące testy
  przejścia z v1.05.30 zmieniają nazwę przycisku), Esc zamyka dymek. Jeden test na WebKit (dotyk).
- Wydanie: jedna wersja na całość albo po typach — decyzja wykonawcy; numer zgodnie z AGENTS.md.

## Zostawione wykonawcy
Dokładne fragmenty w kolorze, kolejność silników, wygląd linijki „W tym zadaniu” w tokenach apki,
treść nowych haseł (według skilli `deep-explain` i `bottom-up`, sprawdzona SymPy i „słabym uczniem”).
