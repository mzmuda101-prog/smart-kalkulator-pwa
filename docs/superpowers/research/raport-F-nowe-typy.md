# Raport F: nowe typy kroków (oczami słabego ucznia)

Dane: `kroki-nowe.json`, 42 rozwiązania (numery niżej to indeks 0–41 w pliku).
Przeliczyłem ręcznie każdy wynik i każdy krok: przedziały, znaki nierówności, dziedziny, wykładniki, logarytmy, układy i sprawdzenia.

## 1. Podsumowanie

- **Wszystkie 42 wyniki końcowe są poprawne.** Żaden krok nie ma błędu rachunkowego: każda liczba w `math` się zgadza, każde sprawdzenie L = P naprawdę wychodzi, a nawiasy przedziałów (otwarty albo ⟨ ⟩) pasują do znaku <, ≤, >, ≥.
- **Jest 1 fałszywe zdanie matematyczne**: #6, krok 6, `why` mówi „znak zmienia się wyłącznie w tym jednym punkcie”. Przy (x−2)² znak nigdzie się nie zmienia. Wyrażenie tylko dotyka zera w x = 2.
- **Dziedzina w logarytmach (#28–#32) ma 3 błędy logiczne**:
  - W #28 i #30 ta sama linia jest wypisana dwa razy („x > 0 ¶ x > 0”).
  - Zbioru D nigdzie nie zapisano, a potem kroki piszą „x ∈ D”.
  - W #32 dziedzina jest pusta (x > 5 i x < 1), a rozwiązanie liczy dalej, jakby nie była.
- **5 zdań `why` nie pasuje do kroku** (wzorce W1–W4 niżej):
  - Przy dzieleniu nierówności przez liczbę dodatnią `why` mówi „nie zmieniam równania” (#0).
  - Przy minusie przed nawiasem i przy mnożeniu nawiasu przez nawias pojawia się „mnożę liczbę przed nawiasem” (#8, #14, #20).
  - W #10 jest „niewiadoma jest podzielona przez liczbę”, a tam jest pomnożona przez 13/3.
  - W #27 etykieta brzmi „Logarytmuję obie strony”, a krok korzysta z definicji logarytmu.
- **Największe skoki dla słabego ucznia**:
  - −b pojawia się w ułamku bez komentarza (5 zamiast −(−5)).
  - 1/8 zmienia się w 2^(−3) bez wyjaśnienia.
  - W #41 dzielenie wielomianu (Horner) jest pominięte.
  - Skracanie 30/45 → 2/3 i 18/12 → 3/2 dzieje się bez pokazania, przez co skracam.
  - W #4 z −x² + 1 = 0 od razu wychodzi x² = 1.
- **Główne braki względem szkoły i Photomatha**: nie ma szkicu paraboli ani osi z zaznaczonym przedziałem. Nie ma też zdania, czy końce przedziału należą do zbioru. Sprawdzenie raz jest, raz go nie ma (nie ma go w logarytmach, #26 i #27).

**Liczby**: błędy matematyczne w wynikach 0; fałszywe zdania lub błędy logiczne 4 (#6, dublowana linia w #28/#30, brak D w #28–#31, pusta D w #32); niepasujące `why` lub etykiety 5; skoki lub brakujące kroki 9; duble lub zbędne kroki 4 wzorce; braki szkolne 7. Bez uwag: 8 zadań.

## 2. Błędy matematyczne

Żaden wynik końcowy nie jest błędny. Błędy dotyczą treści kroków:

| # | q | Krok | Cytat | Problem | Propozycja |
|---|---|---|---|---|---|
| M1 | `x^2 - 4x + 4 > 0` (#6) | 6, `why` | „parabola tylko dotyka osi, więc znak zmienia się wyłącznie w tym jednym punkcie” | Zdanie jest fałszywe. (x−2)² ≥ 0 wszędzie, więc znak się nie zmienia, a w x = 2 wartość wynosi 0. Uczeń wywnioskuje, że po drugiej stronie 2 jest „minus”. | `why`: „Ramiona w górę, parabola dotyka osi w x = 2. Wszędzie indziej jest nad osią, czyli dodatnia.” (16 słów) |
| M2 | `log_2(x) = 3` (#28), `log(x) = 2` (#30) | 2, `math` | „x > 0 ¶ x > 0” | Ta sama linia jest dwa razy, bo warunek i jego rozwiązanie są identyczne. Wygląda jak błąd programu. | Gdy warunek jest już rozwiązany, wypisać go raz: „x > 0 ¶ D = (0, +∞)”. |
| M3 | #28, #29, #30, #31 | 2 i krok „Sprawdzam dziedzinę” | „x = 8 ∈ D” | D nigdzie nie zostało zapisane. W wymiernych (#18–#21) jest „D = ℝ \ {…}”, tu nie ma. W #31 brakuje też części wspólnej: x > −3 i x > 0 daje D = (0, +∞). | Ostatnia linia kroku 2 zawsze „D = …”. Dla #29 „D = (1/2, +∞)”, dla #31 „x > −3 i x > 0 ¶ D = (0, +∞)”. |
| M4 | `log_2(x-5) = log_2(1-x)` (#32) | 2–7 | „x > 5 ¶ x < 1”, potem liczenie x = 3 i „x = 3 ∉ D” | Dziedzina jest pusta. Szkoła kończy w tym miejscu: „D = ∅, więc równanie nie ma rozwiązań”. Liczenie dalej sugeruje, że mogło wyjść coś dobrego. Odrzucanie x = 3 jest poprawne, ale to 5 zbędnych kroków. | Krok 2: „x > 5 i x < 1 ¶ D = ∅”. Krok 3 „Odpowiedź: brak rozwiązań”, `why`: „Żadna liczba nie jest jednocześnie większa od 5 i mniejsza od 1.” Ewentualnie zostawić obecną drogę jako sprawdzenie. |

## 3. Zrozumiałość per typ

### Wzorce (opisane raz)

- **W1. `why` przy dzieleniu nierówności mówi o równaniu.** #0, krok 4: „Dzieląc obie strony przez tę samą liczbę, nie zmieniam równania.” W nierówności właśnie o to chodzi: znak zostaje, bo liczba jest dodatnia. Kontrast z #1 (przez −2 znak się odwraca) uczniowi umyka.
  Propozycja `why`: „Dzielę przez liczbę dodatnią, więc znak nierówności zostaje bez zmian.” Etykieta: „Dzielę przez 2 (znak zostaje)”.
- **W2. „Mnożę liczbę przed nawiasem przez każdy wyraz” tam, gdzie nie ma liczby.**
  - #8 i #14, krok 4: przed nawiasem stoi sam minus. Propozycja `why`: „Minus przed nawiasem zmienia znak każdego wyrazu w środku.”
  - #20, krok 4: tu nawias mnoży się przez nawias. Propozycja `why`: „Każdy wyraz pierwszego nawiasu mnożę przez każdy wyraz drugiego.” Do tego dymek ze wzorem (a+b)(c+d) = ac+ad+bc+bd albo (a−b)².
- **W3. −b pojawia się bez komentarza** (#3, #6, #7, #40, #41). W `math` stoi „(5 − 1)/(2 · 1)”, a dymek pokazuje −b. Słaby uczeń nie wie, skąd 5, skoro b = −5.
  Propozycja: zapisać „x₁ = (−(−5) − 1)/(2 · 1) = (5 − 1)/2 = 2”. Można też wstawić osobną linię „−b = 5”.
- **W4. „x = 2 / 3 = 2/3”** (#14 krok 8, #15 krok 3, #18 krok 5, #26 krok 4). Ułamek rysowany jest jak na kartce, więc obie strony wyglądają tak samo: „x = ⅔ = ⅔”. W #15 nawet źródło ma „x = 2/3 = 2/3”.
  Propozycja: gdy iloraz się nie skraca, pisać samo „x = 2/3”.
- **W5. Mieszanie osób.** Większość tekstów jest w pierwszej osobie („Dzielę”, „Wstawiam”). Część jest w liczbie mnogiej: „Wyciągamy spod pierwiastka” (#7), „wstawiamy” (dymek), „dodajemy albo odejmujemy” (#35).
  Propozycja: wszędzie pierwsza osoba pojedyncza.

### Nierówności (#0–#7)

- **#4 `-x^2 + 1 > 0`, krok 3.** Etykieta „Przenoszę liczbę na prawo”, a math od razu „x² = 1”. Przeniesienie daje −x² = −1, potem trzeba pomnożyć przez −1. To dwa ruchy w jednym.
  Propozycja: krok „−x² = −1”, potem „Mnożę przez −1: x² = 1”.
- **#5, krok 2.** `why`: „z postaci „coś = 0” łatwo odczytać współczynniki”. Tu jest „coś > 0”.
  Propozycja: „Po prawej zostaje 0. Wtedy wystarczy sprawdzić, gdzie lewa strona jest dodatnia.”
- **#2–#7, krok „Odczytuję znak z paraboli”.** Math to tylko „a = 1 > 0”, a uczeń ma sobie wyobrazić parabolę. To najważniejszy moment zadania, a nie ma obrazka (zob. sekcja 5).
- **#1 i #3, krok „Odpowiedź”.** Nie wiadomo, dlaczego nawias jest ⟨, a nie (.
  Propozycja: `why` „Znak ≥ obejmuje równość, więc −3 też jest rozwiązaniem. Stąd nawias domknięty.” (13 słów)
- **#2 `x^2 - 4 < 0`.** Poprawnie, ale w szkole często od razu zapisuje się (x − 2)(x + 2) < 0. To mogłaby być druga metoda, jak w układach.
- **#7.** Przybliżenia mają różną dokładność: „≈ −0,414214” ma 6 cyfr, „≈ 2,41421” ma 5 cyfr znaczących. Ujednolicić, na przykład do −0,41 i 2,41.

### Układy równań (#8–#17)

- **#10 [Podstawianie], krok 2.** Z „2x + 3y = 12” od razu wychodzi „y = 4 − (2/3)x”. Brakuje kroków „3y = 12 − 2x” i „dzielę przez 3”. Wyznaczanie y przy współczynniku 3 wprowadza ułamki. Nauczyciel wyznaczyłby niewiadomą bez ułamka albo przynajmniej pokazał dzielenie.
  Propozycja: dodać krok „3y = 12 − 2x”. Na przyszłość wybierać niewiadomą ze współczynnikiem ±1, jeśli taka jest.
- **#10, krok 8.** `why`: „Niewiadoma jest podzielona przez liczbę, więc mnożenie obu stron cofa to dzielenie.” Tu x jest pomnożone przez 13/3.
  Propozycja: etykieta „Dzielę obie strony przez 13/3”, `why` „Dzielenie przez ułamek to mnożenie przez jego odwrotność, czyli przez 3/13.”
- **#15, kroki 4–6.** „2 · 2/3 + y = 1”, potem od razu „y = 1 − 4/3”. Mnożenie 2 · 2/3 = 4/3 nie jest pokazane. Dalej „Redukuję wyrazy podobne” daje y = −1/3, a to jest odejmowanie ułamków (3/3 − 4/3).
  Propozycja: „2 · 2/3 = 4/3” w kroku 4. W kroku 6 math „y = 3/3 − 4/3 = −1/3”, etykieta „Odejmuję ułamki”.
- **#16 `x + y = 1, x + y = 2`, krok 2.** Math „(x + y) = 1 · (x + y)” jest dla ucznia tautologią i nic nie mówi. Krok 3 „2 ≠ 1 · 1” też jest dziwny.
  Propozycja w stylu szkolnym: „Odejmuję równania stronami: 0 = 1. Sprzeczność.” `why`: „Ta sama suma x + y nie może być jednocześnie równa 1 i 2.” Odpowiedź: „Układ sprzeczny, brak rozwiązań”.
- **#17, odpowiedź.** W szkole pada nazwa „układ nieoznaczony”, a rozwiązania zapisuje się jako pary {(x, 1 − x): x ∈ ℝ}. Zostawić „y = −x + 1”, ale dodać nazwę.
- **#12 i #13, krok 3.** Etykieta „Mnożę drugie przez 2” jest OK. W #13 krok 7 „Przenoszę liczby na prawo” daje „−2y = −6”, a przenoszona jest szóstka z x = 6. Dla ucznia to zrozumiałe.

### Równania wymierne (#18–#21)

- **#20, krok 4.** Wzorzec W2. Do tego krok 6 ma etykietę „Przenoszę x na lewo, liczby na prawo”, a przenoszony jest też x², który się znosi. Uczeń się zdziwi, że x² zniknął.
  Propozycja: osobny krok „Odejmuję x² od obu stron: 4x + 3 = −2x + 1”, `why` „x² jest po obu stronach, więc się znosi.”
- **#20, krok 3.** „Mnożę na krzyż” jest OK. Brakuje dopisku, że wolno to zrobić, bo oba mianowniki są ≠ 0 (z dziedziny).
- **#21, krok 5.** Math „x = −1 ∈ D ¶ x = 1 ∉ D” jest dobry. `why` mówi o jednej liczbie: „Ta liczba nie należy”, a pokazane są dwie.
  Propozycja: „1 zeruje mianownik, więc odpada. Zostaje −1.”
- **#18–#20** są czytelne. Sprawdzenie L = P jest bardzo dobre.

### Wykładnicze (#22–#27)

- **#25 `2^x = 1/8`, krok 2.** „1/8 = 2^(−3)” to dla słabego ucznia największy skok.
  Propozycja: math „1/8 = 1/2³ = ⟦2^(−3)⟧” z dymkiem „a^(−n) = 1/aⁿ”.
- **#24 i #26, krok 2.** „(2²)^x = 2^(2x)”: potęga potęgi bez dymka. Dodać ⟦…⟧ z dymkiem „(a^m)^n = a^(m·n)”.
- **#22 i #23, krok 2.** Ani „8 = 2 · 2 · 2 = 2³”, ani „27 = 3 · 3 · 3” nie są pokazane. Dopisać, bo to jedna linia.
- **#27 `2^x = 5`.**
  - Etykieta „Logarytmuję obie strony”, a math od razu daje „x = log₂(5)”, czyli definicję logarytmu. Propozycja: etykieta „Zapisuję wykładnik logarytmem”, dymek z definicją logarytmu (jak w #28).
  - Brakuje kroku zamiany podstawy „log₂5 = log 5 / log 2 ≈ 2,32”, który uczeń zrobi na zwykłym kalkulatorze.
  - Brakuje sprawdzenia „2^2,32 ≈ 5”.
- **#26 i #27** nie mają sprawdzenia, choć #22–#25 je mają (zob. Duble i porządek).
- **`why` kroku „Zapisuję obie strony jako potęgi”** („wystarczy porównać wykładniki”) opisuje następny krok, nie ten.
  Propozycja: „Zapisuję 8 jako potęgę dwójki, żeby obie strony miały tę samą podstawę.”

### Logarytmiczne (#28–#32)

- Błędy M2–M4 opisane są w sekcji 2.
- **#30 `log(x) = 2`.** Nigdzie nie pada, że log bez podstawy to podstawa 10. Krok 3 pokazuje 10², a uczeń nie wie, skąd dziesiątka.
  Propozycja: `why` „Log bez podstawy oznacza log₁₀, więc x = 10².”
- **#31, krok 6.** „Zmieniam znak obu stron” jest poprawne. Krótsze byłoby od razu „x = 3”, przenosząc 2x na prawo: „3 = 2x − x”. To drobiazg.
- **#28–#32** nie mają podstawienia do równania. Szkoła i Photomath sprawdzają na przykład „log₂8 = 3, bo 2³ = 8”. Same „x ∈ D” nie wystarcza.

### Ułamki (#33–#35)

- **#33, krok 2.** „30/45 = 2/3” bez pokazania, przez co skracam (przez 15). Szkoła skraca przed mnożeniem, na krzyż: 3 z 9 i 5 z 10.
  Propozycja: osobny krok „Skracam przez 15: 30/45 = 2/3” albo „Skracam na krzyż”.
- **#34.** Ten sam problem: „18/12 = 3/2”, skrócone przez 6 bez pokazania.
- **#35** jest czytelne. Zastrzeżenie tylko o mieszanie osób (W5).

### Równania (#36–#41)

- **#38 `x/2 + 1 = 3`, krok 2.** x/2 cicho zmienia się w (1/2)x. Krok 4 mówi „podzielona przez liczbę”, a math pokazuje „(1/2)x”. Zostawić x/2 = 2 w całym rozwiązaniu.
- **#40 `rozłóż x^2 - 5x + 6`.**
  - `why` kroków 2–3 mówią o „postaci ax² + bx + c = 0” i „tym równaniu”, a to jest wyrażenie.
  - Krok 5 ma etykietę „Liczę dwa rozwiązania”. Lepiej „Liczę miejsca zerowe”.
  - Brakuje sprawdzenia przez wymnożenie: (x − 2)(x − 3) = x² − 5x + 6.
- **#41, krok 2.** „W(1) = 0, więc W(x) = (x − 1)(x² − 5x + 6)”: dzielenie wielomianu jest całkowicie pominięte. Szkoła pokazuje schemat Hornera albo dzielenie pisemne.
  Propozycja: osobny krok „Dzielę W(x) przez (x − 1) schematem Hornera” z tabelką współczynników 1 | −6 | 11 | −6 → 1 | −5 | 6 | 0.

## 4. Duble i porządek kroków

1. **„Przenoszę…”, a potem „Redukuję wyrazy podobne”** (prawie każde liniowe zadanie, na przykład #0, #8, #23, #29). „2x > 7 − 3”, a w następnym kroku „2x > 4”. Dla słabego ucznia to OK, ale wydłuża rozwiązanie.
   Propozycja: dla liczb połączyć w jeden krok „2x > 7 − 3 = 4”. Osobny krok zostawić, gdy redukowane są niewiadome.
2. **#12 [Podstawianie], kroki 2–3.** „Porządkuję równania: x − 2y = 0”, a w następnym kroku „Wyznaczam x: x = 2y”, czyli wraca do pierwotnego zapisu. Krok 2 jest zbędny w tej metodzie, bo x jest już wyznaczony. Usunąć krok 2 w wersji z podstawianiem.
3. **#8, #10, #14, kroki 5–7.** „Porządkuję i redukuję wyrazy podobne”, potem „Przenoszę”, potem znowu „Redukuję wyrazy podobne”. Etykieta kroku 5 brzmi tak samo jak kroku 7, co myli. Krok 5 nazwać „Dodaję x do x: 2x − 5 = 1”.
4. **Wzorzec W4** (x = 2/3 = 2/3) i **M2** (x > 0 ¶ x > 0) to duble widoczne na ekranie.
5. **Niespójne sprawdzenie.**

   | Jest sprawdzenie | Nie ma sprawdzenia |
   |---|---|
   | #8–#15 (układy), #18–#21 (wymierne), #22–#25 (wykładnicze), #37–#39, #41 | #26, #27, #28–#32 (logarytmy), #0–#7 (nierówności), #40 |

   Ujednolicić. W nierównościach sprawdzeniem może być punkt testowy, na przykład „x = 0: 0 − 4 < 0 ✓”.

## 5. Braki względem szkoły i Photomatha

1. **Szkic paraboli** w każdej nierówności kwadratowej (#2–#7). Szkoła zawsze go rysuje: oś, miejsca zerowe, ramiona i zakreślona część nad albo pod osią. Photomath pokazuje wykres. To największy brak, bo krok „a = 1 > 0” jest bez niego abstrakcyjny.
2. **Oś liczbowa z zaznaczonym przedziałem** w nierównościach liniowych (#0, #1): kółko pełne albo puste i strzałka.
3. **Nazwy typów układów** (#16, #17): „oznaczony”, „sprzeczny”, „nieoznaczony”, a obok opcjonalnie interpretacja „proste równoległe” albo „ta sama prosta” z mini-wykresem.
4. **Część wspólna warunków dziedziny** (#31, #32), zapisana jako D = … albo D = ∅.
5. **Dymki brakujących praw potęg**: a^(−n) = 1/aⁿ, (a^m)^n = a^(mn) i a^x = a^y ⇔ x = y.
6. **Schemat Hornera** w #41 i **skracanie ułamków** w #33 i #34. Oba to osobne, widoczne kroki w zeszycie.
7. **Druga metoda tam, gdzie szkoła jej używa**:
   - postać iloczynowa przy x² − 4 < 0 (#2);
   - skracanie na krzyż przy mnożeniu i dzieleniu ułamków (#33, #34);
   - zamiana podstawy logarytmu dla wyniku na kalkulatorze (#27).

## 6. Zadania bez uwag

- #9 `x + y = 5, x - y = 1` [Przeciwne współczynniki]
- #11 `2x + 3y = 12; 3x - 2y = 5` [Przeciwne współczynniki]
- #13 `x = 2y, x + y = 9` [Przeciwne współczynniki]
- #19 `(x+1)/(x-2) = 3`
- #23 `3^(x+1) = 27` (poza drobnym brakiem „27 = 3³” z sekcji 3)
- #36 `x=52+65`
- #37 `5 = 2x - 7`
- #39 `x^2 - 3x = 0`

Pozostałe zadania mają wyłącznie uwagi z wzorców W1–W5 albo z sekcji 3.
