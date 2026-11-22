# Raport C: równania, ułamki, pochodne, całki — zrozumiałość kroków

Zakres: zadania #58–#68, #73, #78–#84 z `kroki-wszystkie.json` (bez granic). Pracowałem tylko na czytanie, nic w repo nie zmieniłem.
Rachunki w krokach są poprawne. Problemy dotyczą tego, czy słaby uczeń rozumie, co się dzieje i dlaczego.

Format propozycji: **etykieta** (krótka, czasownik na początku) / **dlaczego** (jedno zdanie, do pokazania pod etykietą albo w dymku) / **⟦…⟧** (co podkreślić i który wpis słownika).

---

## 1. Przegląd problemów według zadań

### #58 `rozwiąż 3(x - 2) = x + 4` → x = 5

| Krok | Teraz | Problem | Propozycja |
|---|---|---|---|
| 3 | „Wyrazy z x przenoszę na lewą stronę, liczby na prawą (zmieniam znak)” → `2x = 10` | Etykieta za długa. Skok od `3x − 6 = x + 4` do `2x = 10` ukrywa dwie operacje: przeniesienie i redukcję. Słaby uczeń nie wie, skąd 10. | **Przenoszę x na lewo, liczby na prawo** / dlaczego: „Wyraz przeniesiony na drugą stronę zmienia znak, bo to to samo, co odjąć go od obu stron.” / math dwuliniowe: `⟦3x − x = 4 + 6⟧` i `2x = 10`; ⟦⟧ id `przenoszenie`. |
| 4 | „Dzielę obie strony przez 2” | Dobra etykieta, brak celu. | Bez zmian etykiety; dlaczego: „Chcę, żeby x zostało samo.” |
| 5 | „Sprawdzenie” → `x = 5: L = 9, P = 9 ✓` | Nie wiadomo, co to L i P, i skąd 9. Nie widać podstawienia. | **Sprawdzam wynik** / dlaczego: „Wstawiam x = 5 do równania; obie strony muszą dać to samo.” / math: `L = 3(5 − 2) = 9`, `P = 5 + 4 = 9 ✓`. Przy pierwszym użyciu pisać „lewa strona” / „prawa strona” zamiast L/P albo dodać dymek. |

### #78 `rozwiąż 2x + 3 = 11` → x = 4
Krok 2: ta sama długa etykieta co w #58. Tu nie ma x po prawej, więc „Wyrazy z x przenoszę na lewą stronę” jest nieprawdą o tym zadaniu — przenosi się tylko 3.
Propozycja: **Przenoszę 3 na prawą stronę** / dlaczego: „Po przeniesieniu znak się zmienia: +3 po lewej to −3 po prawej.” / math `2x = ⟦11 − 3⟧ = 8`. Krok 4 „Sprawdzenie” jak w #58: `L = 2 · 4 + 3 = 11`, `P = 11 ✓`.

### #79 `rozwiąż x^2 = 9` → x₁ = −3, x₂ = 3
Krok 2: „Pierwiastkuję obie strony (są dwa znaki)” — „są dwa znaki” jest niejasne.
Propozycja: **Pierwiastkuję obie strony** / dlaczego: „Dwie liczby dają w kwadracie 9: 3 i −3, bo (−3)² = 9.” / math `x = ⟦±√9⟧ = ±3`; ⟦⟧ id `pierwiastek-kwadratu` (opcjonalnie, można bez wpisu).

### #59 `rozwiąż x^2 - 5x + 6 = 0` → x₁ = 2, x₂ = 3

| Krok | Teraz | Problem | Propozycja |
|---|---|---|---|
| 2 | „Odczytuję współczynniki” → `a = 1, b = −5, c = 6` | Dobrze. Brak informacji, po co. | dlaczego: „Wzór na deltę i rozwiązania potrzebuje liczb a, b, c z postaci ax² + bx + c = 0.” |
| 3 | „Liczę wyróżnik: Δ = b² − 4ac” | Wzór w etykiecie. Słowo „wyróżnik” w szkole pada rzadziej niż „delta”. | **Liczę deltę** / dlaczego: „Delta mówi, ile jest rozwiązań: dodatnia — dwa, zero — jedno, ujemna — brak.” / math `Δ = ⟦(−5)² − 4 · 1 · 6⟧ = 1`; id `delta`. |
| 4 | „Pierwiastek z wyróżnika” → `√Δ = 1` | Rzeczownik zamiast czynności; brak celu. | **Liczę pierwiastek z delty** / dlaczego: „√Δ wchodzi do wzoru na x₁ i x₂.” |
| 5 | „Δ > 0, więc są dwa rozwiązania: (−b ∓ √Δ) / 2a” → `x₁ = (5 − 1) / 2 = 2` | Etykieta to całe zdanie plus wzór. Znak „∓” jest nietypowy (w szkole: osobno x₁ z minusem, x₂ z plusem). W math nie widać, skąd 5 (−b = −(−5)) ani skąd 2 (2a = 2 · 1). | **Liczę dwa rozwiązania** / dlaczego: „Δ > 0, więc są dwa rozwiązania; −b = 5, a 2a = 2.” / math `x₁ = ⟦(5 − 1) / (2 · 1)⟧ = 2`, `x₂ = ⟦(5 + 1) / (2 · 1)⟧ = 3`; id `pierwiastki-kwadratowego`. |
| 6 | „Sprawdzenie” → `x = 2: L = 0, P = 0 ✓` | „L = 0” nic nie mówi — nie widać, że wstawiono 2. | **Sprawdzam wynik** / math `2² − 5 · 2 + 6 = 0 ✓`, `3² − 5 · 3 + 6 = 0 ✓`. Gdy prawa strona to 0, pomijać „P = 0”. |

Kod gałęzi Δ = 0 (math-steps.js:513) ma ten sam problem: „Δ = 0, więc jest jedno rozwiązanie: x₀ = −b / 2a” → **Liczę jedyne rozwiązanie** / „Δ = 0, więc jest jedno rozwiązanie.” / ⟦−b / 2a z liczbami⟧, id `pierwiastki-kwadratowego`.
Gałąź Δ < 0 (math-steps.js:508): „Δ < 0, więc parabola nie przecina osi” — dobre, ale uczeń bez wykresu nie wie, czemu parabola. Lepiej: **Kończę: brak rozwiązań** / „Δ < 0, a pierwiastka z liczby ujemnej nie liczymy.”

### #60 `rozwiąż x^3 - 6x^2 + 11x - 6 = 0` → 1, 2, 3

| Krok | Teraz | Problem | Propozycja |
|---|---|---|---|
| 2 | „Szukam pierwiastka wśród dzielników wyrazu wolnego i dzielę wielomian przez (x − 1)” → `x = 1 pasuje, zostaje: x² − 5x + 6 = 0` | Etykieta ma 12 słów i dwie czynności. Nie widać listy dzielników ani sprawdzenia W(1) = 0. „Zostaje” myli — w rzeczywistości `(x − 1)(x² − 5x + 6) = 0`. Merytorycznie: silnik (`rationalRoot`, math-steps.js:431) szuka pierwiastków p/q, a etykieta mówi tylko o dzielnikach wyrazu wolnego — przy współczynniku wiodącym ≠ 1 (np. 2x³ …) etykieta będzie nieprawdziwa. | Rozbić na dwa kroki: (a) **Zgaduję pierwiastek** / dlaczego: „Pierwiastek całkowity musi dzielić wyraz wolny, więc sprawdzam dzielniki 6.” / math `dzielniki 6: ±1, ±2, ±3, ±6` i `W(1) = 1 − 6 + 11 − 6 = 0 ✓`; id `dzielniki-wyrazu-wolnego`. Przy a ≠ 1: „Pierwiastek wymierny to p/q: p dzieli wyraz wolny, q dzieli współczynnik przy najwyższej potędze.” (b) **Dzielę wielomian przez (x − 1)** / dlaczego: „Skoro 1 jest pierwiastkiem, wielomian dzieli się przez (x − 1) bez reszty.” / math `⟦x³ − 6x² + 11x − 6 = (x − 1)(x² − 5x + 6)⟧`; id `bezout`. |
| 3–6 | jak w #59 | jak w #59 | Dodać przed krokiem 3 krótkie przejście **Rozwiązuję drugi nawias** / „Iloczyn jest zerem, gdy któryś czynnik jest zerem.” |
| 7 | „Sprawdzenie” `x = 1: L = 0, P = 0 ✓` | jak w #59 | jak w #59. |

### #61 `uprość (x + 1)^2 + 2x` → x² + 4x + 1
Krok 2: „Opuszczam nawiasy” → `x² + x + x + 1 + 2x`. Uczeń nie wie, skąd z `(x + 1)²` wzięło się `x² + x + x + 1`. To wzór skróconego mnożenia, a nie „opuszczenie nawiasu”.
Propozycja: **Rozpisuję kwadrat sumy** / dlaczego: „Kwadrat nawiasu to nawias razy nawias: (x + 1)(x + 1).” / math `⟦x² + 2 · x · 1 + 1⟧ + 2x` (albo obecna wersja z `x + x`, ale podkreślona); id `kwadrat-sumy`.
Krok 3 „Redukuję wyrazy podobne” — dobre; dlaczego: „Dodaję wyrazy z tym samym x: 2x + 2x = 4x.”

### #62 `rozłóż x^2 - 5x + 6` → (x − 2)(x − 3)
Krok 2: „Pierwiastki wielomianu dają czynniki (x − pierwiastek)” — jedyny krok; nie widać, jakie są pierwiastki ani skąd.
Propozycja: dodać krok **Szukam miejsc zerowych** (Δ = 1, x₁ = 2, x₂ = 3 — jak w #59, krócej) i potem **Zapisuję postać iloczynową** / dlaczego: „Każde miejsce zerowe r daje nawias (x − r).” / math `⟦1 · (x − 2)(x − 3)⟧` (pokazywać a tylko gdy ≠ 1); id `postac-iloczynowa`.

### #63 `kroki 1/2 + 1/3` → 5/6 i #80 `kroki 3/4 - 1/6` → 7/12

| Krok | Teraz | Problem | Propozycja |
|---|---|---|---|
| 2 | „Sprowadzam do wspólnego mianownika 6” → `3/6 + 2/6` | Nie widać, skąd 3 i 2 (rozszerzanie ułamka). Nie wiadomo, czemu 6 (a w #80 czemu 12, a nie 24). | **Sprowadzam do mianownika 6** / dlaczego: „Dodawać można tylko części tej samej wielkości; 6 to najmniejsza liczba podzielna przez 2 i 3.” / math `⟦1·3/(2·3)⟧ + ⟦1·2/(3·2)⟧ = 3/6 + 2/6`; id `wspolny-mianownik`. |
| 3 | „Dodawanie” / „Odejmowanie” | Rzeczownik; nie mówi, że dodajemy tylko liczniki. | **Dodaję liczniki** / **Odejmuję liczniki** / dlaczego: „Mianownik zostaje, bo części są tej samej wielkości.” |
| 4 | „Wynik w przybliżeniu” `5/6 ≈ 0,833333` | Dobre. Można zostawić. | **Zamieniam na ułamek dziesiętny** (opcjonalnie). |

### #64 `2 * (3 + 4)^2 krok po kroku` → 98
„Najpierw nawias: dodawanie”, „Potęgowanie”, „Mnożenie” — poprawne, ale rzeczowniki i brak „dlaczego w tej kolejności”.
Propozycja: **Liczę nawias** / „Nawias zawsze pierwszy.”; **Potęguję** / „Potęga idzie przed mnożeniem.”; **Mnożę**. Wpis słownika `kolejnosc-dzialan` (opcjonalny). Dotyczy `OP_LABEL` (math-steps.js:782) — zamienić na formy czasownikowe: Dodaję, Odejmuję, Mnożę, Dzielę, Potęguję, Zmieniam znak, Liczę pierwiastek.

### #73 `uprość √8` → 2√2
Krok 2 „Wyciągam kwadrat spod pierwiastka” → `√8 = √(4·2) = 2√2` — dobre. Dodać dlaczego: „8 = 4 · 2, a z 4 pierwiastek jest dokładny: √4 = 2.” ⟦√(4·2) = √4 · √2⟧ (warto pokazać ten pośredni zapis), id `pierwiastek-iloczynu`.

### #65 `pochodna x^3 * sin(x)` → x³ · cos(x) + 3x² · sin(x)

| Krok | Teraz | Problem | Propozycja |
|---|---|---|---|
| 2 | „Pochodna iloczynu: (f·g)′ = f′g + fg′” → `f = x³ / g = sin(x)` | Wzór w etykiecie, a w math samo nazwanie f i g — nie wiadomo, po co. | **Rozpoznaję iloczyn** / dlaczego: „Funkcja to x³ razy sin(x), więc liczę pochodną każdego czynnika osobno i składam wzorem.” / math `f = x³, g = sin(x)`. (Wzór podkreślić dopiero w kroku 5, gdzie działa.) |
| 3 | „Wzór: (xⁿ)′ = n·xⁿ⁻¹” → `(x³)′ = 3x²` | Wzór w etykiecie; nie widać, że to f′. | **Liczę f′** / dlaczego: „Wykładnik schodzi przed x, a potęga maleje o 1.” / math `f′ = ⟦(x³)′ = 3x²⟧`; id `pochodna-potegi`. |
| 4 | „Wzór z tablicy” → `(sin(x))′ = cos(x)` | Uczeń nie wie, jaka tablica i który wzór. | **Liczę g′** / dlaczego: „To wzór z tablicy pochodnych: pochodna sinusa to cosinus.” / math `g′ = ⟦(sin(x))′ = cos(x)⟧`; id `tablica-pochodnych`. |
| 5 | „Składam wynik” → `x³ · cos(x) + 3x² · sin(x)` | Nie widać podstawienia do wzoru. Kolejność odwrócona względem wzoru f′g + fg′ (silnik sortuje składniki), co myli. | **Wstawiam do wzoru** / dlaczego: „Pochodna iloczynu: pochodna pierwszego razy drugi plus pierwszy razy pochodna drugiego.” / math `⟦3x² · sin(x) + x³ · cos(x)⟧`; id `pochodna-iloczynu`. Zachować kolejność z wzoru. |

### #66 `pochodna a * t^2 po t` → 2at
Kroki: „Funkcja”, „Wzór: (xⁿ)′ = n·xⁿ⁻¹” → `(t²)′ = 2t`, „Wynik” `2at`.
Problemy: (1) w etykiecie jest x, a zmienną jest t; (2) nie ma kroku, że a jest stałą i zostaje — z `2t` nagle robi się `2at`. Kod pomija krok „Stała zostaje przed pochodną”, gdy czynnik to sama zmienna (math-calculus.js:394, warunek `moving[0].b.k !== 'var'`).
Propozycja: jeden krok **Wyłączam stałą a** / dlaczego: „Liczę po t, więc a to zwykła liczba i zostaje przed pochodną.” / math `(a · t²)′ = a · ⟦(t²)′⟧ = a · 2t = 2at`; id `pochodna-potegi`. Etykiety nie piszą wzoru, więc problem x vs t znika sam.

### #81 `pochodna sin(x^2)` → 2x · cos(x²)

| Krok | Teraz | Problem | Propozycja |
|---|---|---|---|
| 2 | „Pochodna złożona: zewnętrzna razy wewnętrzna” → `(sin(x²))′ = cos(x²) · (x²)′` | Nie wiadomo, która funkcja jest zewnętrzna, a która wewnętrzna. | **Rozpoznaję funkcję złożoną** / dlaczego: „Na zewnątrz jest sin(□), w środku x²; liczę pochodną zewnętrznej i mnożę przez pochodną środka.” / math `⟦(sin(x²))′ = cos(x²) · (x²)′⟧`; id `pochodna-zlozona`. |
| 3 | „Wzór: (xⁿ)′ = n·xⁿ⁻¹” → `(x²)′ = 2x` | Wzór w etykiecie. | **Liczę pochodną środka** / math `⟦(x²)′ = 2x⟧`; id `pochodna-potegi`. |
| 4 | „Wynik” `2x · cos(x²)` | Brak kroku składania; kolejność czynników odwrócona bez słowa. | Dodać **Składam wynik** / dlaczego: „Mnożę: cos(x²) · 2x; liczbę z x zwykle piszemy z przodu.” / math `cos(x²) · 2x = 2x · cos(x²)`. |

### #82 `pochodna x/(x+1)` → 1/(x + 1)²

| Krok | Teraz | Problem | Propozycja |
|---|---|---|---|
| 2 | „Pochodna ilorazu: (f/g)′ = (f′g − fg′) / g²” → `f = x / g = x + 1` | Wzór w etykiecie. | **Rozpoznaję iloraz** / dlaczego: „Licznik i mianownik zależą od x, więc liczę je osobno i składam wzorem.” / math `f = x, g = x + 1`. |
| 3 | „Wzór: (xⁿ)′ = n·xⁿ⁻¹” → `(x)′ = 1` | Nie widać, że to f′. | **Liczę f′** / math `f′ = ⟦(x)′ = 1⟧`. |
| 4 | „Liczę każdy składnik: (xⁿ)′ = n·xⁿ⁻¹, a stałe dają 0” → `(x)′ = 1 / (1)′ = 0` | Najsłabszy krok w tym zbiorze: druga linia powtarza `(x)′ = 1` z kroku 3, nie widać, że to g′, i brakuje sumy `g′ = 1 + 0 = 1`. | **Liczę g′** / dlaczego: „Pochodna sumy to suma pochodnych; stała ma pochodną 0.” / math `g′ = (x)′ + (1)′ = 1 + 0 = 1`; id `tablica-pochodnych`. |
| 5 | „Składam wynik” → `1/(x + 1)²` | Brak podstawienia — od f′, g′ prosto do wyniku. To serce zadania. | **Wstawiam do wzoru** / dlaczego: „Pochodna ilorazu: (f′g − fg′) przez g do kwadratu.” / math `⟦(1 · (x + 1) − x · 1) / (x + 1)²⟧ = 1/(x + 1)²`; id `pochodna-ilorazu`. Ewentualnie druga linia `= (x + 1 − x)/(x + 1)²`. |

### #67 `całka x * e^x` → x · eˣ − eˣ + C

| Krok | Teraz | Problem | Propozycja |
|---|---|---|---|
| 2 | „Całkowanie przez części: ∫ u dv = u·v − ∫ v du” → `u = x, dv = e^x dx / du = 1 dx, v = e^x` | Wzór w etykiecie. Brak powodu, czemu u = x (a nie eˣ). Nie widać, skąd du i v (du to pochodna, v to całka). | Rozbić: (a) **Wybieram u i dv** / dlaczego: „Za u biorę x, bo po zróżniczkowaniu staje się prostsze (1), a eˣ łatwo scałkować.” / math `u = x, dv = eˣ dx`. (b) **Liczę du i v** / dlaczego: „du to pochodna u, v to całka z dv.” / math `du = (x)′ dx = dx`, `v = ∫ eˣ dx = eˣ`. |
| 3 | „Podstawiam do wzoru” → `x · e^x − ∫ e^x dx` | Etykieta dobra, brak podkreślenia. | Bez zmian etykiety; math `⟦x · eˣ − ∫ eˣ dx⟧`; id `przez-czesci`. |
| 4 | „Wzór: ∫ eˣ dx = eˣ” | Wzór w etykiecie. | **Liczę ostatnią całkę** / dlaczego: „eˣ jest jedyną funkcją, której całka to ona sama.” / math `⟦∫ eˣ dx = eˣ⟧`; id `tablica-calek`. |
| 5 | „Sprawdzenie” `(x · e^x − e^x)′ = x · e^x ✓` | Dobry pomysł, ale uczeń nie wie, czemu się różniczkuje. | **Sprawdzam pochodną** / dlaczego: „Całka jest dobra, jeśli jej pochodna daje funkcję spod całki.” |
| 6 | „Wynik” `… + C` | C nigdzie nie objaśnione. | dlaczego: „+C, bo stała znika przy różniczkowaniu, więc może być dowolna.” |

### #68 `całka x^2 od 0 do 1` → 1/3

| Krok | Teraz | Problem | Propozycja |
|---|---|---|---|
| 1 | „Całka” → `∫ x² dx` | Brak granic 0 i 1 — uczeń widzi inne zadanie niż wpisał. Kod: math-calculus.js:772 zawsze `integralText(e, v)`. | math `∫₀¹ x² dx`. |
| 2 | „Wzór: ∫ xⁿ dx = xⁿ⁺¹/(n + 1)” → `∫ x² dx = x³/3` | Wzór w etykiecie; brak celu. | **Szukam funkcji pierwotnej F** / dlaczego: „Najpierw liczę całkę bez granic; podnoszę potęgę o 1 i dzielę przez nową potęgę.” / math `F(x) = ⟦∫ x² dx = x³/3⟧`; id `calka-potegi`. |
| 3 | „Sprawdzenie” `(x³/3)′ = x² ✓` | jak w #67. | **Sprawdzam pochodną**. |
| 4 | „Wzór Newtona-Leibniza: F(b) − F(a)” → `F(x) = x³/3 / F(1) − F(0) = 1/3 − 0` | Wzór w etykiecie; F, a, b nie są objaśnione; `F(x) = x³/3` powtarza krok 2. | **Wstawiam granice** / dlaczego: „Całka od 0 do 1 to wartość F na górnej granicy minus na dolnej.” / math `⟦F(1) − F(0)⟧ = 1³/3 − 0³/3 = 1/3`; id `newton-leibniz`. |

### #83 `całka 1/(x^2+4)` → arctg(x/2)/2 + C
Krok 2: „Wzór: ∫ 1/(x² + a²) dx = (1/a)·arctg(x/a)” → `arctg(x/2)/2`. Nie widać, że a = 2 (4 = 2²) ani lewej strony całki (inne kroki tablicowe ją mają, ten nie — math-calculus.js:692 wypisuje sam wynik).
Propozycja: **Zapisuję 4 jako 2²** / math `∫ 1/(x² + 2²) dx`; potem **Używam wzoru z arctg** / dlaczego: „Mianownik ma postać x² + a², tu a = 2.” / math `⟦∫ 1/(x² + 2²) dx = (1/2) · arctg(x/2)⟧`; id `calka-arctg` (albo w `tablica-calek`).

### #84 `całka sin(x)^2` → x/2 − sin(2x)/4 + C
Krok 2: „Tożsamość: sin²(x) = (1 − cos(2x))/2” → od razu `∫ sin²(x) dx = x/2 − sin(2x)/4`. Ukryte są dwa kroki: rozbicie na dwie całki i całka z cos(2x) = sin(2x)/2 (skąd ta /2, a w końcu /4).
Propozycja: (a) **Zamieniam sin² na cosinus podwojonego kąta** / dlaczego: „sin² nie ma prostej całki, a cos(2x) ma.” / math `⟦sin²(x) = (1 − cos(2x))/2⟧`; id `sin-kwadrat`. (b) **Całkuję każdą część** / math `∫ 1/2 dx − (1/2)∫ cos(2x) dx = x/2 − (1/2) · sin(2x)/2` / dlaczego: „Całka z cos(2x) to sin(2x)/2: dzielę przez 2, bo pochodna sin(2x) daje dodatkowe 2.” (c) **Porządkuję** `= x/2 − sin(2x)/4`.

---

## 2. Proponowane wpisy do słownika (js/step-formulas.js)

Format jak we wpisie `e`. Poziomy według polskiej podstawy programowej (szkoła podstawowa 2017, liceum 2018). Uwaga: wzory skróconego mnożenia i deltę umieszczam w liceum (zakres podstawowy); pochodne funkcji wymiernych, iloczynu i ilorazu — liceum rozszerzenie; pochodne funkcji trygonometrycznych, wykładniczych i funkcji złożonej oraz całki — studia (w liceum ich nie ma, poza ewentualnymi wyjątkami w niektórych programach — warto, żeby nauczyciel to potwierdził).

```js
delta: {
    name: 'Delta (wyróżnik)',
    tex: '\\Delta = b^{2} - 4ac',
    why: 'Równanie ma postać $ax^{2}+bx+c=0$. Liczba $\\Delta$ mówi, ile ma rozwiązań: '
        + '$\\Delta>0$ — dwa, $\\Delta=0$ — jedno, $\\Delta<0$ — żadnego.',
    level: 'Liceum, zakres podstawowy: funkcja kwadratowa',
    more: [
        'Delta to część wzoru na rozwiązania, która stoi pod pierwiastkiem. Dlatego jej znak decyduje o wszystkim: z liczby ujemnej pierwiastka nie policzymy.',
        'Na wykresie: $\\Delta>0$ znaczy, że parabola przecina oś $x$ w dwóch miejscach, $\\Delta=0$ — dotyka jej w jednym, $\\Delta<0$ — nie dotyka wcale.',
        'Uwaga na nawias: przy $b=-5$ liczymy $(-5)^{2}=25$, a nie $-5^{2}=-25$.',
    ],
},
'pierwiastki-kwadratowego': {
    name: 'Wzory na rozwiązania równania kwadratowego',
    tex: 'x_{1}=\\frac{-b-\\sqrt{\\Delta}}{2a},\\quad x_{2}=\\frac{-b+\\sqrt{\\Delta}}{2a}',
    why: 'Mamy już $\\Delta>0$, więc wstawiamy $a$, $b$ i $\\sqrt{\\Delta}$ do wzorów. Gdy $\\Delta=0$, oba wzory dają to samo: $x_{0}=\\frac{-b}{2a}$.',
    level: 'Liceum, zakres podstawowy: funkcja kwadratowa',
    more: [
        'Zapis $-b$ znaczy „liczba przeciwna do $b$”. Gdy $b=-5$, to $-b=5$.',
        'Mianownik to $2a$, czyli dwa razy liczba przy $x^{2}$, a nie tylko 2.',
        'Wzory biorą się z dopełnienia do kwadratu: $ax^{2}+bx+c=0$ przekształca się do $\\left(x+\\frac{b}{2a}\\right)^{2}=\\frac{\\Delta}{4a^{2}}$, a potem pierwiastkuje obie strony.',
    ],
},
'pochodna-potegi': {
    name: 'Pochodna potęgi',
    tex: '\\left(x^{n}\\right)\' = n\\cdot x^{n-1}',
    why: 'Wykładnik schodzi przed $x$, a nowy wykładnik jest o 1 mniejszy, np. $(x^{3})\'=3x^{2}$.',
    level: 'Liceum, zakres rozszerzony: rachunek różniczkowy',
    more: [
        'Szczególne przypadki: $(x)\'=1$, bo $x=x^{1}$ i $1\\cdot x^{0}=1$; pochodna stałej to $0$.',
        'Wzór działa też dla wykładników ujemnych i ułamkowych, np. $\\left(\\frac{1}{x}\\right)\'=(x^{-1})\'=-x^{-2}$ i $(\\sqrt{x})\'=\\frac{1}{2\\sqrt{x}}$.',
        'Stała przy potędze zostaje: $(5x^{2})\'=5\\cdot 2x=10x$.',
    ],
},
'pochodna-iloczynu': {
    name: 'Pochodna iloczynu',
    tex: '(f\\cdot g)\' = f\'\\cdot g + f\\cdot g\'',
    why: 'Funkcja to iloczyn dwóch czynników zależnych od $x$. Pochodna to: pochodna pierwszego razy drugi plus pierwszy razy pochodna drugiego.',
    level: 'Liceum, zakres rozszerzony: rachunek różniczkowy',
    more: [
        'To nie jest $f\'\\cdot g\'$. Na przykład $(x\\cdot x)\'=(x^{2})\'=2x$, a $1\\cdot 1=1$.',
        'Kolejność składników nie ma znaczenia, bo dodawanie jest przemienne, ale łatwiej sprawdzać, gdy trzymamy się wzoru.',
    ],
},
'pochodna-ilorazu': {
    name: 'Pochodna ilorazu',
    tex: '\\left(\\frac{f}{g}\\right)\' = \\frac{f\'\\cdot g - f\\cdot g\'}{g^{2}}',
    why: 'Licznik $f$ i mianownik $g$ zależą od $x$. Wstawiamy $f$, $g$, $f\'$ i $g\'$ do wzoru.',
    level: 'Liceum, zakres rozszerzony: pochodne funkcji wymiernych',
    more: [
        'W liczniku jest minus, więc kolejność ma znaczenie: najpierw $f\'\\cdot g$, potem odejmujemy $f\\cdot g\'$.',
        'Mianownik to $g$ do kwadratu. Zwykle zostawiamy go w nawiasie, np. $(x+1)^{2}$, bez wymnażania.',
        'Gdy w liczniku jest sama liczba, łatwiej zapisać ją jako potęgę ujemną, np. $\\frac{3}{x}=3x^{-1}$.',
    ],
},
'pochodna-zlozona': {
    name: 'Pochodna funkcji złożonej',
    tex: '\\left(f(g(x))\\right)\' = f\'(g(x))\\cdot g\'(x)',
    why: 'W środku funkcji siedzi inne wyrażenie, np. $\\sin(x^{2})$. Liczymy pochodną zewnętrznej (środek zostaje bez zmian) i mnożymy przez pochodną środka.',
    level: 'Studia: analiza matematyczna (w liceum zwykle poza programem)',
    more: [
        'Najczęstszy błąd: zapomnieć o mnożeniu przez pochodną środka. $(\\sin(x^{2}))\'$ to $\\cos(x^{2})\\cdot 2x$, a nie samo $\\cos(x^{2})$.',
        'Tak samo z potęgą nawiasu: $\\left((3x+1)^{5}\\right)\'=5(3x+1)^{4}\\cdot 3$.',
        'Nazywa się to też regułą łańcuchową: przy kilku warstwach mnożymy pochodne wszystkich warstw.',
    ],
},
'tablica-pochodnych': {
    name: 'Tablica pochodnych',
    tex: '(c)\'=0,\\ (\\sin x)\'=\\cos x,\\ (\\cos x)\'=-\\sin x,\\ (e^{x})\'=e^{x},\\ (\\ln x)\'=\\frac{1}{x}',
    why: 'Tę pochodną znamy na pamięć z tablicy. Najczęstsze: $(\\sin x)\'=\\cos x$, $(\\cos x)\'=-\\sin x$, $(e^{x})\'=e^{x}$, $(\\ln x)\'=\\frac{1}{x}$, a stała daje $0$.',
    level: 'Stała i potęgi: liceum rozszerzenie. Funkcje trygonometryczne, $e^{x}$, $\\ln x$: studia',
    more: [
        'Dalsze: $(\\operatorname{tg}x)\'=\\frac{1}{\\cos^{2}x}$, $(a^{x})\'=a^{x}\\ln a$, $(\\operatorname{arctg}x)\'=\\frac{1}{1+x^{2}}$.',
        'Uwaga na znak przy cosinusie: pochodna cosinusa jest ujemna.',
        'Pochodna sumy to suma pochodnych: każdy składnik liczymy osobno.',
    ],
},
'tablica-calek': {
    name: 'Tablica całek',
    tex: '\\int e^{x}dx=e^{x},\\ \\int\\frac{1}{x}dx=\\ln|x|,\\ \\int\\sin x\\,dx=-\\cos x,\\ \\int\\cos x\\,dx=\\sin x',
    why: 'Tę całkę znamy na pamięć. To pochodne z tablicy czytane od tyłu: szukamy funkcji, której pochodna daje to, co pod całką.',
    level: 'Studia: analiza matematyczna',
    more: [
        'Każdy wynik można sprawdzić różniczkując go, np. $(-\\cos x)\'=\\sin x$.',
        'Przy $\\frac{1}{x}$ jest wartość bezwzględna, bo logarytm jest określony tylko dla liczb dodatnich, a $\\frac{1}{x}$ także dla ujemnych.',
        'Do wyniku całki nieoznaczonej dopisujemy $+C$.',
    ],
},
'calka-potegi': {
    name: 'Całka potęgi',
    tex: '\\int x^{n}\\,dx = \\frac{x^{n+1}}{n+1}\\quad (n\\ne -1)',
    why: 'Podnosimy wykładnik o 1 i dzielimy przez nowy wykładnik, np. $\\int x^{2}dx=\\frac{x^{3}}{3}$.',
    level: 'Studia: analiza matematyczna',
    more: [
        'To działanie odwrotne do pochodnej potęgi: $\\left(\\frac{x^{3}}{3}\\right)\'=x^{2}$.',
        'Dla $n=-1$ wzór dzieliłby przez zero, dlatego $\\int\\frac{1}{x}dx=\\ln|x|$ jest osobnym wzorem.',
    ],
},
'przez-czesci': {
    name: 'Całkowanie przez części',
    tex: '\\int u\\,dv = u\\cdot v - \\int v\\,du',
    why: 'Pod całką jest iloczyn. Jedną część ($u$) różniczkujemy, drugą ($dv$) całkujemy, tak żeby nowa całka $\\int v\\,du$ była prostsza.',
    level: 'Studia: analiza matematyczna',
    more: [
        'Za $u$ wybieramy to, co po zróżniczkowaniu się upraszcza: logarytm, potem potęgę $x$. Za $dv$ to, co łatwo scałkować: $e^{x}$, $\\sin x$, $\\cos x$.',
        '$du$ to pochodna $u$ razy $dx$, a $v$ to całka z $dv$ (bez $+C$).',
        'Wzór wynika z pochodnej iloczynu: $(uv)\'=u\'v+uv\'$, po scałkowaniu obu stron.',
    ],
},
'newton-leibniz': {
    name: 'Wzór Newtona-Leibniza',
    tex: '\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)',
    why: '$F$ to wynik całki bez granic (funkcja pierwotna). Wstawiamy górną granicę $b$, potem dolną $a$ i odejmujemy.',
    level: 'Studia: analiza matematyczna',
    more: [
        'Wynik to liczba, nie funkcja, więc $+C$ nie dopisujemy: i tak by się odjęło.',
        'Gdy $f\\ge 0$, wynik to pole pod wykresem $f$ między $x=a$ a $x=b$.',
        'Kolejność ma znaczenie: zawsze górna minus dolna.',
    ],
},
'wspolny-mianownik': {
    name: 'Wspólny mianownik',
    tex: '\\frac{a}{b}+\\frac{c}{d} = \\frac{a\\cdot k}{b\\cdot k}+\\frac{c\\cdot m}{d\\cdot m}',
    why: 'Dodawać i odejmować można tylko ułamki o tym samym mianowniku. Rozszerzamy każdy ułamek, mnożąc licznik i mianownik przez tę samą liczbę.',
    level: 'Szkoła podstawowa: ułamki zwykłe',
    more: [
        'Rozszerzenie nie zmienia wartości: $\\frac{1}{2}=\\frac{3}{6}$, bo pomnożyliśmy górę i dół przez 3.',
        'Najwygodniej wziąć najmniejszą wspólną wielokrotność mianowników, np. dla 4 i 6 to 12, a nie 24.',
        'Po sprowadzeniu dodajemy same liczniki, a mianownik zostaje.',
    ],
},
```

Wpisy dodatkowe (krótsze, opcjonalne, potrzebne do propozycji wyżej): `przenoszenie` (podstawówka: równania liniowe), `dzielniki-wyrazu-wolnego` (liceum rozszerzenie: pierwiastki całkowite i wymierne wielomianu, z p/q w „Więcej”), `bezout` (liceum rozszerzenie: twierdzenie Bézouta), `postac-iloczynowa` (liceum podstawa), `kwadrat-sumy` (liceum podstawa: wzory skróconego mnożenia), `pierwiastek-iloczynu` (podstawówka kl. 7–8), `sin-kwadrat` (wzór na cos 2x: liceum rozszerzenie; całka: studia), `calka-arctg` (studia).

Sprawdzenie merytoryczne obecnych etykiet: wszystkie wzory w etykietach są poprawne. Dwie nieścisłości: (1) „(−b ∓ √Δ) / 2a” — znak ∓ jest poprawny matematycznie, ale nietypowy w szkole; (2) etykieta „Szukam pierwiastka wśród dzielników wyrazu wolnego” jest prawdziwa tylko przy współczynniku wiodącym 1, a silnik stosuje twierdzenie o p/q.

---

## 3. Ogólne reguły pisania kroków

1. Etykieta zaczyna się od czasownika w 1. osobie („Liczę”, „Wstawiam”, „Dzielę”), ma najwyżej 5–6 słów i nie zawiera wzoru.
2. Wzór nie siedzi w etykiecie. Podkreślamy ⟦…⟧ ten fragment math, w którym wzór działa z liczbami tego zadania, i dajemy `formula: { id }`.
3. Każdy krok ma jedno zdanie „dlaczego” (do ~20 słów): po co ten krok, a nie tylko co robi.
4. Jeden krok = jedna czynność. Przeniesienie i redukcja, zgadywanie pierwiastka i dzielenie, wybór u/dv i liczenie du/v — to osobne kroki.
5. Pokazujemy podstawienie, zanim pokażemy wynik: `(1 · (x + 1) − x · 1)/(x + 1)²`, a nie od razu `1/(x + 1)²`.
6. Nazwy pomocnicze (f, g, u, dv, F, L, P, a, b, c) muszą być objaśnione przy pierwszym użyciu i potem użyte („f′ = …”, „g′ = …”), inaczej są szumem.
7. Kolejność w math trzyma się kolejności ze wzoru; przestawianie czynników to osobna, nazwana czynność.
8. Krok nie może przeczyć zadaniu: nie piszemy „wyrazy z x przenoszę”, gdy przenosi się tylko liczbę, ani „po x”, gdy zmienna to t.
9. Sprawdzenie pokazuje wstawienie liczby, a nie same wartości L i P.
10. Pierwszy krok pokazuje zadanie dokładnie tak, jak je wpisano (z granicami całki, ze zmienną).
11. Bez nazw-etykiet typu „Dodawanie”, „Wzór z tablicy”, „Pierwiastek z wyróżnika” — zawsze co robię i z czym.

---

## 4. Zmiany w silniku — od największego zysku dla zrozumienia

| # | Zmiana | Miejsce |
|---|---|---|
| 1 | Pochodna iloczynu/ilorazu: krok „Wstawiam do wzoru” z podstawieniem `f′·g + f·g′` / `(f′g − fg′)/g²` na liczbach zamiast gołego „Składam wynik”; zachować kolejność ze wzoru. | math-calculus.js:403–416 (`dTerm`, `line(log, 'Składam wynik', …)` w 415) |
| 2 | Nazwać f′ i g′ w krokach („f′ = …”, „g′ = …”); dla g będącego sumą pokazać `g′ = 1 + 0 = 1` zamiast powtarzać `(x)′ = 1` z „Liczę każdy składnik”. | math-calculus.js:381, 406, 411 (wywołania `dExpr(top/head…)` dostają log bez prefiksu) |
| 3 | Przenieść wzory z etykiet do ⟦…⟧ + `formula: {id}` (mechanizm już jest, wzorzec w math-limits.js:739–742) i dodać wpisy słownika z sekcji 2. | math-steps.js:502, 513, 522, 534, 712, 751; math-calculus.js:381, 405, 410, 420, 421, 429, 435, 513–548, 631, 692, 793; js/step-formulas.js |
| 4 | Równanie liniowe: pośredni krok `3x − x = 4 + 6` przed `2x = 10`; krótka etykieta, która nie kłamie, gdy x jest tylko po jednej stronie. | math-steps.js:591–594 |
| 5 | Sprawdzenie: pokazywać wstawienie (`3(5 − 2) = 9`), a przy prawej stronie 0 samą lewą stronę; zamienić L/P na pełne słowa albo dymek. | math-steps.js:641–648 |
| 6 | Δ i wzory na x: pokazać `2 · 1` w mianowniku i `−b = 5`; zamienić etykiety na „Liczę deltę” / „Liczę dwa rozwiązania”. | math-steps.js:501–537 |
| 7 | Wielomian 3. stopnia: rozbić na „Zgaduję pierwiastek” (lista dzielników, W(r) = 0) i „Dzielę przez (x − r)” z zapisem iloczynowym; poprawić etykietę na p/q, gdy współczynnik wiodący ≠ 1. | math-steps.js:546–556 (`solveDegree`), 431 (`rationalRoot`) |
| 8 | Całka przez części: rozbić na „Wybieram u i dv” (z powodem wyboru — reguła jest już w kodzie: logs > polys > waves) i „Liczę du i v”. | math-calculus.js:611–636 (`byParts`, `line` w 631) |
| 9 | Całka oznaczona: pokazać granice w pierwszym kroku; krok N-L z `F(1) − F(0) = 1³/3 − 0³/3`, bez powtórzenia `F(x) = …`. | math-calculus.js:772 i 792–796 |
| 10 | Stała przy pochodnej: pokazywać „Wyłączam stałą” także gdy czynnik to sama zmienna (`a · t²`). | math-calculus.js:393–396 (warunek `moving[0].b.k !== 'var'`) |
| 11 | Pochodna złożona: w etykiecie/dlaczego nazwać funkcję zewnętrzną i wewnętrzną; dodać krok składania przy przestawieniu czynników. | math-calculus.js:418–424 (`chain`), 433–437 |
| 12 | Ułamki: pokazać rozszerzanie (`1·3/(2·3)`), etykiety „Dodaję liczniki”; `OP_LABEL` na czasowniki. | math-steps.js:782, 923–935 |
| 13 | Rozkład na czynniki: krok z miejscami zerowymi przed postacią iloczynową. | math-steps.js:748–752 |
| 14 | `(x + 1)²`: etykieta „Rozpisuję kwadrat sumy” zamiast „Opuszczam nawiasy”, gdy w wyrażeniu jest potęga nawiasu. | math-steps.js:668–671 (`simplify`) |
| 15 | sin²/cos²: rozbić krok tożsamości na tożsamość + dwie całki (z wyjaśnieniem /2 przy cos(2x)). | math-calculus.js:533–537 |
| 16 | arctg: pokazać `4 = 2²` i lewą stronę całki w math (jak w `table`). | math-calculus.js:679–692 |

Ograniczenia: nie uruchamiałem silnika (zgodnie z poleceniem), więc nowe zapisy math są propozycją do sprawdzenia testami. Poziomy szkolne podałem z pamięci podstawy programowej 2017/2018 — pochodna funkcji złożonej i pochodne funkcji trygonometrycznych warto potwierdzić u nauczyciela.
