# Słaby uczeń: granice, część 2 (g073–g144, 72 zadania)

Źródło: `scripts/steps-check/kroki-uczen-granice-2.json`. Matematyki nie oceniam (robi to SymPy).

## Tabela uwag

| id | dział | zadanie (q) | krok k | kategoria | ważność | cytat | czego brakuje | propozycja zapisu |
|---|---|---|---|---|---|---|---|---|
| g083 | granice | lim x→-2 (x^3-x+6)/(sqrt(x^4-12)+x), de l'Hospital | 2 | nieczytelne | krytyczna | `lim(x→−2) −(x − √(x⁴ − 12)) · (x³ − x + 6)/(x⁴ − x² − 12)` | Krok wkleja wynik ze sposobu „Sprzężenie” (mnożenia przez sprzężenie nie było w tym sposobie), a krok 3 i tak liczy pochodne z wyjściowego ułamka `(x³ − x + 6)′/(x + √(x⁴ − 12))′`. Nie wiem, skąd to wyrażenie ani po co. | Usunąć krok 2 z tego sposobu (krok 3 zaczyna się od `lim(x→−2) (x³ − x + 6)/(√(x⁴ − 12) + x)`). |
| g089 | granice | lim x→3 (x^2-8x+15)/(∛(3x-1)-2), de l'Hospital | 2 | nieczytelne | krytyczna | `lim(x→3) ((3x − 1)^(2/3) + 2∛(3x − 1) + 4) · (x² − 8x + 15)/(3(x − 3))` | Ten sam błąd co g083: wyrażenie z mnożenia przez sprzężenie, którego w tym sposobie nie było; krok 3 wraca do ułamka wyjściowego. | Usunąć krok 2; krok 3 zaczyna od `lim(x→3) (x² − 8x + 15)/(∛(3x − 1) − 2)`. |
| g085 | granice | lim x→2 (2-sqrt(x+2))/(sqrt(x+7)-x-1), de l'Hospital | 3 | skok | krytyczna | `= lim(x→2) (1/(2√(x + 2)))/(1 − 1/(2√(x + 7)))` `= lim(x→2) −1/((1/√(x + 7) − 2) · √(x + 2))` | Nie odtworzę, skąd minus i `1/√(x+7) − 2`: ukryte mnożenie licznika i mianownika przez `−2√(x+2)` naraz. | `= (1/(2√(x+2))) · (−2)/((1 − 1/(2√(x+7))) · (−2)) = (−1/√(x+2))/(1/√(x+7) − 2) = −1/((1/√(x+7) − 2) · √(x+2))` |
| g081 | granice | lim x→3 (x^2-5x+6)/(sqrt(x+6)-x), de l'Hospital | 3 | skok | powazna | `= lim(x→3) (5 − 2x)/(1 − 1/(2√(x + 6)))` `= lim(x→3) 2(2x − 5)/(1/√(x + 6) − 2)` | Ukryte mnożenie licznika i mianownika przez `−2`. | `= (5 − 2x) · (−2)/((1 − 1/(2√(x+6))) · (−2)) = (4x − 10)/(1/√(x+6) − 2) = 2(2x − 5)/(1/√(x+6) − 2)` |
| g079, g081, g083, g085, g087, g089, g097, g099, g101, g103, g105, g107, g109, g111, g112, g113 | granice | sposoby de l'Hospital z pierwiastkiem, sin, tg, arcsin, arctg, ln, eˣ | 2 lub 3 | zargon | powazna | np. `(1/(2√(x + 4)) · (x + 4)′)`, `(3 · cos(3x))/(1)`, `(2/cos²(2x))/(1)`, `(2/√(1 − 4x²))/(1)`, `(3/(9x² + 1))/(1)`, `1/(4(x + 15)^(3/4))` | Uczeń zna pochodne wielomianów, ale nie wzory na pochodną √, ∜, ∛, sin, tg, arcsin, arctg, ln, eˣ ani pochodną funkcji złożonej; dymek przy kroku to tylko ogólna reguła de l'Hospitala. W trygonometrycznych brakuje też rozpisania „pochodna zewnętrzna razy wewnętrzna”. | Przy kroku pokazać wzór i jego użycie, np. `(sin(3x))′ = cos(3x) · (3x)′ = cos(3x) · 3`; `(√u)′ = 1/(2√u) · u′`; `(arcsin u)′ = u′/√(1 − u²)` z `u = 2x`, `u² = 4x²`; `(∜u)′ = (u^(1/4))′ = (1/4) · u^(−3/4) · u′`. |
| g073, g076 | granice | de l'Hospital, wielomiany 3–5 wyrazów | 2 | skok | drobna | `= lim(x→1) (4x³ − 6x + 4)/(15x⁴ + 12x² + 2x)` | Pochodna kilku wyrazów naraz, bez rozpisania wyraz po wyrazie. | `(x⁴)′ − 3(x²)′ + 4(x)′ − (2)′ = 4x³ − 3 · 2x + 4 · 1 − 0 = 4x³ − 6x + 4` |
| g076, g112, g113 | granice | de l'Hospital stosowany drugi raz / dalsze przekształcenia | 2 | dlaczego-falszywe | powazna | `Po pochodnych ułamek nadal daje symbol nieoznaczony, więc przekształcamy go dalej.` | Zdanie twierdzi, że znów jest 0/0, ale nigdzie nie wstawiono liczby do pochodnych. | g076: `9 · (−1)² + 16 · (−1) + 7 = 9 − 16 + 7 = 0`, `8 · (−1)³ + 12 · (−1)² − 6 · (−1) − 10 = −8 + 12 + 6 − 10 = 0`; g112: `1 − cos(0) = 1 − 1 = 0`, `3 · 0² = 0` |
| g112, g113 | granice | lim x→0 (x - sin(x))/x^3 | 3 | skok | powazna | `lim(x→0) ⟦(−(cos(x) − 1)/3)′/(x²)′⟧` | Trójka z mianownika `3x²` po cichu przeszła do licznika przed różniczkowaniem. | `−(cos x − 1)/(3x²) = (1/3) · (1 − cos x)/x²`, potem `(1/3) · (1 − cos x)′/(x²)′ = (1/3) · sin x/(2x)` |
| g112, g113 | granice | lim x→0 (x - sin(x))/x^3 | całe | nieczytelne | drobna | `"method": "de l'Hospital"` (g112 i g113 identyczne) | To samo zadanie i ten sam sposób dwa razy; uczeń nie wie, czym się różnią. | Usunąć duplikat albo dać drugiemu sposobowi inną drogę (np. znana granica `(1 − cos x)/x² → 1/2`). |
| g076 | granice | lim x→-1 (3x^3+...)/(2x^4+...), de l'Hospital | 11 | skok | powazna | `lim(x→−1) (1/2)(9x + 7)(x + 1)/((x + 1)(4x² + 2x − 5))` | Skąd `1/2`: dwójka z kroku 2 (`2(4x³ + …)`) przeskoczyła przed ułamek bez słowa. | `(9x + 7)(x + 1)/(2(x + 1)(4x² + 2x − 5)) = (1/2) · (9x + 7)(x + 1)/((x + 1)(4x² + 2x − 5))` |
| g088, g122, g124, g130, g132, g136 | granice | ułamek z liczbą wyłączoną w mianowniku | 4 lub 9 | skok | drobna | `lim(x→3) (1/2)(x − 3)(x + 3)/(x − 3)`, `lim(x→1) (3/2)(x − 1)(x + 1)/(x − 1)`, `lim(x→−0,5) (1/3)x(2x + 1)/(2x + 1)` | Liczba z mianownika `2(x − 3)` / `3(2x + 1)` przechodzi przed ułamek jako `1/2`, `3/2`, `1/3` bez zapisu. | `(x − 3)(x + 3)/(2(x − 3)) = (1/2) · (x − 3)(x + 3)/(x − 3)` |
| g138 | granice | lim x→-0.5 (2x^2+x)/(6x+3), Horner | 4–5 | nieczytelne | powazna | `lim(x→−0,5) (2/3)x(x + 1/2)/(2(x + 1/2))` → `lim(x→−0,5) x/3` | Mieszanka: `2/3` przed ułamkiem i jeszcze `2` w mianowniku; skrócenie `(2/3)/2 = 1/3` ukryte. | `2x(x + 1/2)/(3 · 2(x + 1/2)) = 2x/6 = x/3` |
| g141 | granice | lim x→-0.5 (6x+3)/(4x^2-1), Horner | 4–5 | skok | powazna | `lim(x→−0,5) 6(x + 1/2)/((x + 1/2)(4x − 2))` → `3/(2x − 1)` | `6` to `3 · 2` (3 z kroku 2, 2 z Hornera), nie zapisane; potem ukryte dzielenie przez 2. | `3(2x + 1) = 3 · 2(x + 1/2) = 6(x + 1/2)`; `6/(4x − 2) = 6/(2(2x − 1)) = 3/(2x − 1)` |
| g135 | granice | lim x→0.5 (4x^2-4x+1)/(2x^2-x), Horner | 4 | skok | powazna | `lim(x→0,5) 4(x − 1/2)²/(2x(x − 1/2))` → `lim(x→0,5) (2x − 1)/x` | Po skróceniu zostaje `4(x − 1/2)/(2x)`; skrócenie 4/2 i wciągnięcie 2 do nawiasu naraz. | `4(x − 1/2)/(2x) = 2(x − 1/2)/x = (2x − 1)/x` |
| g127, g091, g141 | granice | Horner/de l'Hospital, wspólny dzielnik 2 | 4 / 2 / 5 | skok | drobna | `lim(x→0,5) (x − 1/2)(2x + 2)/((x − 1/2)(4x + 2))` → `(x + 1)/(2x + 1)`; `(2x − 6)/(6x − 10)` → `(x − 3)/(3x − 5)` | Ukryte dzielenie licznika i mianownika przez 2. | `(2x + 2)/(4x + 2) = 2(x + 1)/(2(2x + 1)) = (x + 1)/(2x + 1)` |
| g131, g123, g137 | granice | de l'Hospital po wyłączeniu liczby | 3 | skok | drobna | `⟦(3(x² − 1)/2)′/(x − 1)′⟧ = lim(x→1) (3x)/(1)` | Liczba z mianownika przeniesiona do licznika i pochodna `3/2 · 2x = 3x` naraz. | `(3(x² − 1)/2)′ = (3/2) · 2x = 3x` |
| g086, g088 | granice | ∜ / ∛ przez sprzężenie | 2 | skok | powazna | `∜(x + 15) − 2 = (⟦x + 15 − 16⟧)/((x + 15)^(3/4) + 2√(x + 15) + 4∜(x + 15) + 8)` | Nie widać samego mnożenia `(a − b)(a³ + a²b + ab² + b³)` ani że `a⁴ = x + 15`, `b⁴ = 16`; także `a²b = 2√(x+15)` wymaga `(∜u)² = √u`. | `(a − b)(a³ + a²b + ab² + b³) = a⁴ − b⁴`, `a⁴ = (∜(x + 15))⁴ = x + 15`, `b⁴ = 2⁴ = 16`, `a² = (∜(x+15))² = √(x+15)` |
| g086, g088, g089 | granice | potęga ułamkowa liczby | 10 / 11 / 4 | skok | powazna | `16^(3/4) + 2 · √16 + 4 · ∜16 + 8) · (1 − 4)) = 1/((8 + 8 + 8 + 8)`, `2 · 8^(2/3) · (3 − 4) = 8 · (3 − 4)` | `16^(3/4) = 8` i `8^(2/3) = 4` podane bez rachunku. | `16^(3/4) = (∜16)³ = 2³ = 8`; `8^(2/3) = (∛8)² = 2² = 4`, `2 · 4 = 8` |
| g099, g098 | granice | lim x→-∞ sqrt(2-7x)/sqrt(8-15x) | 7 / 6 | skok | powazna | `= 7√15/(15(√7)) = √15 · √7/15` | Ukryte `7/√7 = √7` (g099) i usuwanie niewymierności `√7/√15 = √7 · √15/15` (g098). Zapis `√15 · √7/15` czyta się dziwnie. | `7/√7 = 7√7/7 = √7`; `√7/√15 = √7 · √15/(√15 · √15) = √105/15` |
| g094, g095 | granice | lim x→0 1/x, lim x→3 x/(x-3) | 2–3 | skok | powazna | `licznik → 3, mianownik → 0⁻` | Nie widać, dlaczego mianownik jest ujemny z lewej; „dlaczego” mówi tylko „znak zależy od strony”. | `x < 3 ⇒ x − 3 < 0`, np. `x = 2,99: 2,99 − 3 = −0,01`, `3/(−0,01) = −300` |
| g094, g095 | granice | jw. | 4 | nieczytelne | drobna | `lim(x→0⁻) = −∞,  lim(x→0⁺) = +∞` | Granica bez wyrażenia, którego dotyczy. | `lim(x→0⁻) 1/x = −∞,  lim(x→0⁺) 1/x = +∞` |
| g100, g102, g104, g106, g108, g110 | granice | znane granice sin, tg, arcsin, arctg, ln, e | 2 | skok | drobna | `u = 3x → 0:  lim(x→0) ⟦sin(3x)/(3x)⟧ · 3` | Nie widać pomnożenia i podzielenia przez 3. | `sin(3x)/x = sin(3x)/x · 3/3 = sin(3x)/(3x) · 3` |
| g108 | granice | lim x→0 ln(1+2x)/x | 2 | nieczytelne | drobna | `⟦ln(2x + 1)/(2x)⟧` | Wzór w dymku to `ln(1 + u)`, a krok przestawia na `2x + 1`; trudniej dopasować. | `ln(1 + 2x)/(2x) · 2` |
| g078, g080, g082, g084 | granice | sprzężenie z pierwiastkiem kwadratowym | 3 (i 7 w g084) | skok | drobna | `(√(x + 4) − 3)(√(x + 4) + 3)/(√(x + 4) + 3) = (⟦x + 4 − 9⟧)` | Pominięty środkowy zapis `a² − b²`. | `(√(x + 4))² − 3² = x + 4 − 9` |
| g084 | granice | lim x→2 (2-sqrt(x+2))/(sqrt(x+7)-x-1) | 3 | skok | drobna | `x − √(x + 7) + 1 = (x − √(x + 7) + 1)((x + 1) + √(x + 7))` | Nie widać, że wyraz `x + 1` traktujemy jako `a`. | `x − √(x + 7) + 1 = (x + 1) − √(x + 7)`, `a = x + 1`, `b = √(x + 7)` |
| g084, g086 | granice | mnożenie ułamków | 10 / 5 | dlaczego-falszywe | drobna | `Łączę dwa ułamki w jeden, a liczby od razu skracam.` | Żadna liczba się tu nie skraca. | `Łączę dwa ułamki w jeden: licznik razy licznik, mianownik razy mianownik.` |
| g088, g122, g130, g136 | granice | podstawianie bez ułamka | 11 / 6 | dlaczego-falszywe | drobna | `W mianowniku nie wychodzi zero, więc wystarczy wstawić liczbę.` przy `(1/2)(x + 3)`, `(3/2)(x + 1)`, `(1/3)x` | Po skróceniu nie ma już mianownika z x. | `Pozostał zwykły rachunek: za zmienną idzie liczba z granicy.` |
| g077 | granice | lim x→-1 (...), Horner | 4 | nieczytelne | drobna | `Skracamy (x + 1)` przy `(x + 1)²/(x + 1)²`, dymek `czynnik = (x + 1)` | Skraca się kwadrat, a tytuł i dymek mówią o jednym nawiasie. | `Skracamy (x + 1)²` |
| g075, g076 | granice | postać iloczynowa z ułamkowym pierwiastkiem | 8 / 7 | skok | drobna | `3x² + 5x + 2 = 3⟦(x + 2/3)(x + 1)⟧` | Znak w nawiasie: `x − x₂ = x − (−2/3)`. | `a(x − x₁)(x − x₂) = 3(x − (−1))(x − (−2/3)) = 3(x + 1)(x + 2/3)` (to samo w g090 k8, g125 k6) |
| g082, g083 | granice | lim x→-2 (x^3-x+6)/... | 1 | skok | drobna | `(−2)³ − (−2) + 6 = −8 − (−2) + 6 = 0` | Zmiana `− (−2)` na `+ 2` i suma naraz. | `= −8 + 2 + 6 = 0` |
| g125, g126, g127, g133, g134, g135, g136, g137, g138 | granice | x → ±0,5 | 1 | skok | drobna | `2 · (1/2)² + 1/2 − 1 = 1/2 + 1/2 − 1 = 0` | `2 · 1/4` liczone w głowie. | `2 · 1/4 + 1/2 − 1 = 1/2 + 1/2 − 1 = 0` |
| g081, g085 | granice | podstawienie z `1/3 − 2` | 4 | skok | drobna | `2 · (6 − 5)/(1/3 − 2) = 2 · 1/(−5/3)` | Odejmowanie ułamków bez sprowadzenia do wspólnego mianownika. | `1/3 − 2 = 1/3 − 6/3 = −5/3` |
| g083 | granice | jw. | 4 | skok | drobna | `(3 · (−2)² − 1)/(2 · (−2)³/√4 + 1) = (12 − 1)/(−8 + 1)` | `2 · (−8)/2 = −8` naraz. | `2 · (−8)/2 + 1 = −16/2 + 1 = −8 + 1` |
| g082 | granice | jw. | 17 | skok | drobna | `−(−44)/(−28) = −11/7` | Znaki i skrócenie przez 4 naraz. | `= 44/(−28) = −44/28 = −11/7` |
| g103 | granice | lim x→0 tan(2x)/x | 3 | skok | drobna | `2/cos²(0) = 2` | `cos 0 = 1` ukryte. | `2/cos²(0) = 2/1² = 2` |
| g137 | granice | lim x→-0.5 (2x^2+x)/(6x+3) | 4 | skok | drobna | `2 · (−1/2)/3 + 1/6 = −1/3 + 1/6 = −1/6` | Dwa działania naraz przed `−1/3`, i odejmowanie ułamków. | `2 · (−1/2) = −1`, `−1/3 + 1/6 = −2/6 + 1/6 = −1/6` |
| g140 | granice | lim x→-0.5 (6x+3)/(4x^2-1) | 4 | skok | drobna | `3/(4 · (−1/2)) = −3/2` | `4 · (−1/2) = −2` w głowie. | `3/(4 · (−1/2)) = 3/(−2) = −3/2` |
| g097, g099 | granice | de l'Hospital przy x → −∞ | 2 | skok | drobna | `= lim(x→−∞) (−1/(2√(1 − x)))/(−1/(2√(4 − x)))` `= lim(x→−∞) √(4 − x)/√(1 − x)` | Dzielenie ułamków i skrócenie minusów oraz dwójek naraz. | `= (−1/(2√(1 − x))) · (2√(4 − x)/(−1)) = √(4 − x)/√(1 − x)` |
| g096, g097, g098, g099 | granice | wyciąganie √(−x) | 3–4 | skok | drobna | `√(1 − x) = √((−x)(1 − 1/x))` | Brak sprawdzenia mnożeniem, że nawias daje z powrotem `1 − x`. | `(−x)(1 − 1/x) = −x + x/x = −x + 1` |
| g089 | granice | jw. | 3 | skok | drobna | `= lim(x→3) (2x − 8)/(1/(3x − 1)^(2/3))` `= lim(x→3) 2(3x − 1)^(2/3) · (x − 4)` | Dzielenie przez ułamek i wyłączenie 2 naraz. | `(2x − 8) · (3x − 1)^(2/3) = 2(x − 4) · (3x − 1)^(2/3)` |
| g115 | granice | lim n→∞ 5(1+1/n)^n | 1, 3 | dlaczego-falszywe | drobna | `Resztę wykładnika liczymy osobno.`; w kroku 1 brak `[⟦1^∞⟧]` | Reszty wykładnika tu nie ma (wykładnik to dokładnie `n`); w kroku 1 brak znacznika, o którym mówi „dlaczego”. | k1: `lim(n→∞) 5(1 + 1/n)^n  [⟦1^∞⟧]`; k3: `W nawiasie jest 1 + 1/n, a w potędze to samo n.` |
| g142 | granice | lim n→∞ (1+2/n)^n | 3 | skok | drobna | `lim(n→∞) (⟦(1 + 1/(n/2))^(n/2)⟧)² = e²` | Prawo potęgi `aⁿ = (a^(n/2))²` nie zapisane. | `(1 + 2/n)^n = (1 + 1/(n/2))^((n/2) · 2) = ((1 + 1/(n/2))^(n/2))²` |
| g073 | granice | interaktywność | 2 | interaktywnosc | drobna | `(4x³ − 6x + 4)` | Stuknięcie pochodnej pokazuje rozpisanie wyraz po wyrazie. | – |
| g074 | granice | interaktywność | 3 | interaktywnosc | drobna | `(x − 1)(x³ + x² − 2x + 2)` | Stuknięcie nawiasu pokazuje tabelkę Hornera z kroku 2. | – |
| g075 | granice | interaktywność | 9, 15 | interaktywnosc | drobna | `3(x + 1)²(x + 2/3)` | Stuknięcie pokazuje, z których kroków pochodzi każdy nawias. | – |
| g076 | granice | interaktywność | 11 | interaktywnosc | drobna | `(1/2)` | Stuknięcie `1/2` pokazuje dwójkę wyjętą w kroku 2. | – |
| g077 | granice | interaktywność | 3 | interaktywnosc | drobna | `(x + 1)²` | Stuknięcie kwadratu pokazuje dwie tabelki Hornera. | – |
| g078 | granice | interaktywność | 3 | interaktywnosc | drobna | `x + 4 − 9` | Stuknięcie pokazuje `(√(x+4))² − 3²`. | – |
| g079 | granice | interaktywność | 3 | interaktywnosc | drobna | `1/(2√(x + 4))` | Stuknięcie pokazuje wzór `(√u)′ = u′/(2√u)`. | – |
| g080 | granice | interaktywność | 13 | interaktywnosc | drobna | `−6/5` | Stuknięcie wyniku pokazuje podstawienie czynnik po czynniku. | – |
| g081 | granice | interaktywność | 3 | interaktywnosc | drobna | `2(2x − 5)/(1/√(x + 6) − 2)` | Stuknięcie pokazuje mnożenie przez `−2`. | – |
| g082 | granice | interaktywność | 9, 13 | interaktywnosc | drobna | `t² − t − 12`, `(x − 2)(x + 2)` | Stuknięcie `t` pokazuje `t = x²`; stuknięcie iloczynu sprawdzenie mnożeniem. | – |
| g083 | granice | interaktywność | 3 | interaktywnosc | drobna | `4x³` | Stuknięcie pokazuje `(x⁴ − 12)′ = 4x³` i wzór na pochodną √. | – |
| g084 | granice | interaktywność | 3, 7 | interaktywnosc | drobna | `(x + 1)² − (x + 7)` | Stuknięcie pokazuje wybór `a = x + 1`, `b = √(x+7)`. | – |
| g085 | granice | interaktywność | 3 | interaktywnosc | drobna | `−1/((1/√(x + 7) − 2) · √(x + 2))` | Stuknięcie pokazuje mnożenie przez `−2√(x+2)`. | – |
| g086 | granice | interaktywność | 2, 10 | interaktywnosc | drobna | `(x + 15)^(3/4)`, `16^(3/4)` | Stuknięcie potęgi pokazuje `(∜16)³ = 8`; stuknięcie mianownika pełne mnożenie `(a − b)(a³ + …)`. | – |
| g087 | granice | interaktywność | 2 | interaktywnosc | drobna | `1/(4(x + 15)^(3/4))` | Stuknięcie pokazuje `(u^(1/4))′ = (1/4)u^(−3/4)`. | – |
| g088 | granice | interaktywność | 2, 11 | interaktywnosc | drobna | `8^(2/3)` | Stuknięcie pokazuje `(∛8)² = 4`. | – |
| g089 | granice | interaktywność | 3 | interaktywnosc | drobna | `1/(3(3x − 1)^(2/3))` | Stuknięcie pokazuje wzór na pochodną ∛. | – |
| g090 | granice | interaktywność | 8 | interaktywnosc | drobna | `3(x + 2/3)(x − 4)` | Stuknięcie pokazuje `x − x₁ = x − (−2/3)`. | – |
| g091 | granice | interaktywność | 2 | interaktywnosc | drobna | `(x − 3)/(3x − 5)` | Stuknięcie pokazuje skrócenie przez 2. | – |
| g092 | granice | interaktywność | 3 | interaktywnosc | drobna | `(x − 4)(x − 2)` | Stuknięcie pokazuje tabelkę Hornera. | – |
| g093 | granice | interaktywność | 2 | interaktywnosc | drobna | `+∞` | Stuknięcie pokazuje tabelkę `x = 0,1; 0,01; 0,001 → 10; 100; 1000`. | – |
| g094 | granice | interaktywność | 2 | interaktywnosc | drobna | `0⁻` | Stuknięcie pokazuje `x = −0,01 → 1/x = −100`. | – |
| g095 | granice | interaktywność | 2 | interaktywnosc | drobna | `0⁻` | Stuknięcie pokazuje `x = 2,99 → x − 3 = −0,01`. | – |
| g096 | granice | interaktywność | 3 | interaktywnosc | drobna | `√((−x)(1 − 1/x))` | Stuknięcie pokazuje sprawdzenie mnożeniem. | – |
| g097 | granice | interaktywność | 2 | interaktywnosc | drobna | `√(4 − x)/√(1 − x)` | Stuknięcie pokazuje dzielenie ułamków. | – |
| g098 | granice | interaktywność | 6 | interaktywnosc | drobna | `√15 · √7/15` | Stuknięcie pokazuje usuwanie niewymierności. | – |
| g099 | granice | interaktywność | 7 | interaktywnosc | drobna | `7√15/(15(√7))` | Stuknięcie pokazuje `7/√7 = √7`. | – |
| g100 | granice | interaktywność | 2 | interaktywnosc | drobna | `· 3` | Stuknięcie trójki pokazuje `· 3/3`. | – |
| g101 | granice | interaktywność | 2 | interaktywnosc | drobna | `3 · cos(3x)` | Stuknięcie pokazuje `cos(3x) · (3x)′`. | – |
| g102 | granice | interaktywność | 2 | interaktywnosc | drobna | `· 2` | Stuknięcie pokazuje `· 2/2`. | – |
| g103 | granice | interaktywność | 2 | interaktywnosc | drobna | `2/cos²(2x)` | Stuknięcie pokazuje `(tg u)′ = u′/cos²u`. | – |
| g104 | granice | interaktywność | 2 | interaktywnosc | drobna | `· 2` | Stuknięcie pokazuje `· 2/2`. | – |
| g105 | granice | interaktywność | 2 | interaktywnosc | drobna | `2/√(1 − 4x²)` | Stuknięcie pokazuje `(arcsin u)′` i `u² = 4x²`. | – |
| g106 | granice | interaktywność | 2 | interaktywnosc | drobna | `· 3` | Stuknięcie pokazuje `· 3/3`. | – |
| g107 | granice | interaktywność | 2 | interaktywnosc | drobna | `3/(9x² + 1)` | Stuknięcie pokazuje `(arctg u)′ = u′/(1 + u²)`. | – |
| g108 | granice | interaktywność | 2 | interaktywnosc | drobna | `· 2` | Stuknięcie pokazuje `· 2/2`. | – |
| g109 | granice | interaktywność | 2 | interaktywnosc | drobna | `2/(2x + 1)` | Stuknięcie pokazuje `(ln u)′ = u′/u`. | – |
| g110 | granice | interaktywność | 2 | interaktywnosc | drobna | `· 1` | Stuknięcie wyjaśnia, że `u = x`, więc nic nie trzeba dopasowywać. | – |
| g111 | granice | interaktywność | 2 | interaktywnosc | drobna | `(e^x)` | Stuknięcie pokazuje `(eˣ)′ = eˣ`. | – |
| g112 | granice | interaktywność | 2–3 | interaktywnosc | drobna | `(1 − cos(x))/(3x²)` | Stuknięcie pokazuje wstawienie 0 (znowu 0/0). | – |
| g113 | granice | interaktywność | 2–3 | interaktywnosc | drobna | jak g112 | jak g112. | – |
| g114 | granice | interaktywność | 2 | interaktywnosc | drobna | `1/n → 0` | Stuknięcie pokazuje `n = 1000 → 1/n = 0,001`. | – |
| g115 | granice | interaktywność | 3 | interaktywnosc | drobna | `(1 + 1/n)^n` | Stuknięcie pokazuje przybliżenia `n = 10, 100 → 2,59; 2,70`. | – |
| g116 | granice | interaktywność | 3 | interaktywnosc | drobna | `(x − 2)(x + 2)` | Stuknięcie pokazuje sprawdzenie mnożeniem. | – |
| g117 | granice | interaktywność | 3 | interaktywnosc | drobna | `(3)/(2x)` | Stuknięcie pokazuje pochodne wyraz po wyrazie. | – |
| g118 | granice | interaktywność | 4 | interaktywnosc | drobna | `(x − 2)(x + 2)` | Stuknięcie nawiasu pokazuje tabelkę Hornera. | – |
| g119 | granice | interaktywność | 3 | interaktywnosc | drobna | `(x − 3)(x + 3)` | Stuknięcie pokazuje sprawdzenie mnożeniem. | – |
| g120 | granice | interaktywność | 3 | interaktywnosc | drobna | `1/x` | Stuknięcie pokazuje skrócenie `2/(2x)`. | – |
| g121 | granice | interaktywność | 4 | interaktywnosc | drobna | `(x − 3)(x + 3)` | Stuknięcie nawiasu pokazuje tabelkę Hornera. | – |
| g122 | granice | interaktywność | 4 | interaktywnosc | drobna | `(1/2)` | Stuknięcie pokazuje, skąd `1/2`. | – |
| g123 | granice | interaktywność | 3 | interaktywnosc | drobna | `((x² − 9)/2)′` | Stuknięcie pokazuje `(1/2) · 2x = x`. | – |
| g124 | granice | interaktywność | 4 | interaktywnosc | drobna | `(1/2)` | Stuknięcie pokazuje, skąd `1/2`. | – |
| g125 | granice | interaktywność | 1 | interaktywnosc | drobna | `1/2 + 1/2 − 1` | Stuknięcie pokazuje `2 · 1/4 = 1/2`. | – |
| g126 | granice | interaktywność | 2 | interaktywnosc | drobna | `(4x + 1)/(8x)` | Stuknięcie pokazuje pochodne wyraz po wyrazie. | – |
| g127 | granice | interaktywność | 4 | interaktywnosc | drobna | `(x + 1)/(2x + 1)` | Stuknięcie pokazuje skrócenie przez 2. | – |
| g128 | granice | interaktywność | 3 | interaktywnosc | drobna | `(x⁴ + x³ + x² + x + 1)` | Stuknięcie pokazuje tabelkę Hornera. | – |
| g129 | granice | interaktywność | 2 | interaktywnosc | drobna | `5x⁴` | Stuknięcie pokazuje `(xⁿ)′ = n·xⁿ⁻¹`. | – |
| g130 | granice | interaktywność | 4 | interaktywnosc | drobna | `(3/2)` | Stuknięcie pokazuje, skąd `3/2`. | – |
| g131 | granice | interaktywność | 3 | interaktywnosc | drobna | `(3x)` | Stuknięcie pokazuje `(3/2) · 2x`. | – |
| g132 | granice | interaktywność | 4 | interaktywnosc | drobna | `(3/2)` | Stuknięcie pokazuje, skąd `3/2`. | – |
| g133 | granice | interaktywność | 2 | interaktywnosc | drobna | `(2x − 1)²` | Stuknięcie pokazuje sprawdzenie `(2x − 1)² = 4x² − 4x + 1`. | – |
| g134 | granice | interaktywność | 3 | interaktywnosc | drobna | `0` | Stuknięcie wyniku pokazuje podstawienie. | – |
| g135 | granice | interaktywność | 4 | interaktywnosc | drobna | `(2x − 1)/x` | Stuknięcie pokazuje `4(x − 1/2)/(2x) = (2x − 1)/x`. | – |
| g136 | granice | interaktywność | 4 | interaktywnosc | drobna | `(1/3)` | Stuknięcie pokazuje, skąd `1/3`. | – |
| g137 | granice | interaktywność | 3 | interaktywnosc | drobna | `(2x/3 + 1/6)` | Stuknięcie pokazuje dzielenie przez 2. | – |
| g138 | granice | interaktywność | 4 | interaktywnosc | drobna | `(2/3)` | Stuknięcie pokazuje skrócenie `2x/(3 · 2)`. | – |
| g139 | granice | interaktywność | 3 | interaktywnosc | drobna | `(2x − 1)(2x + 1)` | Stuknięcie pokazuje sprawdzenie mnożeniem. | – |
| g140 | granice | interaktywność | 3 | interaktywnosc | drobna | `3/(4x)` | Stuknięcie pokazuje skrócenie `6/(8x)`. | – |
| g141 | granice | interaktywność | 4 | interaktywnosc | drobna | `6(x + 1/2)` | Stuknięcie szóstki pokazuje `3 · 2`. | – |
| g142 | granice | interaktywność | 3 | interaktywnosc | drobna | `)²` | Stuknięcie potęgi pokazuje `n = (n/2) · 2`. | – |
| g143 | granice | interaktywność | 2 | interaktywnosc | drobna | `n · (2/n)` | Stuknięcie pokazuje skrócenie `n` z `n`. | – |
| g144 | granice | interaktywność | 2 | interaktywnosc | drobna | `5/3` | Stuknięcie wyniku pokazuje podstawienie (już widoczne). | – |

## Pytanie obowiązkowe: „Czy umiałbym rozwiązać podobne zadanie sam, tylko z tych kroków?”

- g073: tak, ale pochodne wielomianu musiałbym rozpisać sam.
- g074: tak, tabelki Hornera i podstawienie są pełne.
- g075: tak, długie, ale każdy rozkład ma tabelkę lub deltę.
- g076: nie, nie wiem, skąd `1/2` w kroku 11 i dlaczego po pochodnych znów jest 0/0.
- g077: tak, dwie tabelki Hornera pokazują kwadrat nawiasu.
- g078: tak, sprzężenie i skracanie są czytelne.
- g079: nie, nie znam wzoru na pochodną pierwiastka.
- g080: tak, Viète z próbami par jest pełny.
- g081: nie, ukryte mnożenie przez −2 i pochodna √ bez wzoru.
- g082: tak, choć ostatnie podstawienie jest gęste.
- g083: nie, krok 2 wkleja wyrażenie z innego sposobu.
- g084: tak, z trudem: dwa sprzężenia i wybór `a = x + 1`.
- g085: nie, ostatnie przekształcenie w kroku 3 jest niemożliwe do odtworzenia.
- g086: tak, z dymkiem wzoru, ale `16^(3/4) = 8` musiałbym zgadnąć.
- g087: nie, nie znam pochodnej ∜.
- g088: tak, z dymkiem, ale `8^(2/3) = 4` bez rachunku.
- g089: nie, krok 2 z innego sposobu i pochodna ∛ bez wzoru.
- g090: tak, delta i Viète są pełne.
- g091: tak, pochodne wielomianów są proste.
- g092: tak, tabelki Hornera są pełne.
- g093: tak, ale bez przykładowych liczb przyjmuję „+∞” na wiarę.
- g094: nie, nie wiem, skąd znak minus z lewej.
- g095: nie, brak `x − 3 < 0` dla `x < 3`.
- g096: tak, wyciąganie √(−x) jest pokazane.
- g097: tak, z trudem, wymaga pochodnej √.
- g098: tak, poza końcowym `√15 · √7/15`.
- g099: nie, pochodna √ bez wzoru i ukryte `7/√7 = √7`.
- g100: tak, wzór z dymka wystarczy.
- g101: nie, nie znam pochodnej sin i funkcji złożonej.
- g102: tak, wzór z dymka wystarczy.
- g103: nie, nie znam pochodnej tg.
- g104: tak, wzór z dymka wystarczy.
- g105: nie, nie znam pochodnej arcsin.
- g106: tak, wzór z dymka wystarczy.
- g107: nie, nie znam pochodnej arctg.
- g108: tak, wzór z dymka wystarczy.
- g109: nie, nie znam pochodnej ln.
- g110: tak, to dokładnie wzór z dymka.
- g111: tak, jeśli wiem, że `(eˣ)′ = eˣ`; tu nikt tego nie mówi.
- g112: nie, pochodne sin/cos bez wzorów i trójka przesunięta po cichu.
- g113: nie, jak g112.
- g114: tak, proste.
- g115: tak, wzór na e z dymka.
- g116: tak, pełne.
- g117: tak, pełne.
- g118: tak, pełne.
- g119: tak, pełne.
- g120: tak, pełne.
- g121: tak, pełne.
- g122: tak, poza cichym `1/2`.
- g123: tak, z drobnym domysłem przy `/2`.
- g124: tak, poza cichym `1/2`.
- g125: tak, delta pełna.
- g126: tak, pochodne wielomianów.
- g127: tak, poza ukrytym dzieleniem przez 2.
- g128: tak, tabelka Hornera pełna.
- g129: tak, pochodna `x⁵` prosta.
- g130: tak, poza cichym `3/2`.
- g131: tak, z drobnym domysłem przy `3/2 · 2x`.
- g132: tak, poza cichym `3/2`.
- g133: tak, wzór skróconego mnożenia rozpisany.
- g134: tak, pochodne wielomianów.
- g135: tak, z trudem przy skróceniu `4(x − 1/2)/(2x)`.
- g136: tak, poza cichym `1/3`.
- g137: tak, z drobnymi rachunkami ułamków.
- g138: nie, zapis `(2/3)x(…)/(2(…))` → `x/3` jest nieczytelny.
- g139: tak, pełne.
- g140: tak, proste.
- g141: tak, z trudem: skąd `6` muszę zgadnąć.
- g142: tak, `n = (n/2) · 2` jest pokazane.
- g143: tak, wzór skrócony z dymka.
- g144: tak, proste.

## Zadania bez uwag (poza interaktywnością)

16 zadań: g074, g090, g092, g093, g114, g116, g117, g118, g119, g120, g121, g128, g129, g139, g143, g144.

## Liczba uwag (bez wierszy interaktywnosc)

- krytyczne: 3 (g083 k2, g089 k2, g085 k3)
- poważne: 12 wierszy (część obejmuje wiele zadań)
- drobne: 27 wierszy
- interaktywnosc: 72 wiersze (po jednym na zadanie)
