# Raport B: granice z e, znane granice, de l'Hospital, granice w punkcie

Zakres: zestaw 6a–6j, 7a–7e, 8a–8f, 9a–9f, „dodatkowe”: `lim x→0 sin(3x)/x`, `lim x→0 (e^x-1)/x`, ściąga: `lim x→0+ 1/x`.
Źródło: kroki-wszystkie.json (cytaty dokładne) + js/math-limits.js (numery linii z bieżącego pliku).
W danych NIE MA przykładu z `ln(1+u)/u` ani z logarytmami (reguła `logCombine`) — o nich piszę tylko na podstawie kodu.

Wszystkie wyniki liczbowe w zadaniach poniżej sprawdziłem ręcznie — są poprawne. Problemy dotyczą tylko zrozumiałości.

---

## Problemy wspólne (dotyczą wielu zadań)

### W1. Pierwszy krok: symbol w nawiasie bez wyjaśnienia
Wszystkie zadania, krok 1, np. 8a: `[Granica]  lim(x→4) (x² − 6x + 8)/(3x² − 10x − 8)  [0/0]`, 6a: `[1^∞]`.
- Problem: słaby uczeń nie wie, że `[0/0]` to nie liczba, tylko „co wychodzi po wstawieniu”. Nie wie też, czemu to w ogóle ważne.
- Propozycja: etykieta **„Sprawdzamy, co wychodzi po wstawieniu x = 4”**; symbol w ⟦…⟧ z `formula: {id: 'nieoznaczone'}`.
- Dlaczego (dla ucznia): „Wychodzi 0/0, a tego nie da się policzyć od razu. Trzeba najpierw przekształcić wyrażenie.”
- Dla ∞: „Sprawdzamy, co dzieje się dla bardzo dużych n”.

### W2. Pierwszy krok pokazuje inne wyrażenie niż wpisał uczeń
- 9a: wpisane `(x-5)/(3-sqrt(x+4))`, krok 1: `lim(x→5) −(x − 5)/(√(x + 4) − 3)`.
- 9b: wpisane `(x^2-5x+6)/(sqrt(x+6)-x)`, krok 1: `−(x² − 5x + 6)/(x − √(x + 6))`.
- 7c: wpisane `sqrt(4x^2-3x)+2x`, krok 1: `(2x + √(4x² − 3x))`.
- 5b/5c (poza zakresem, ten sam mechanizm): `∛4∛(2n³ − n²)` zamiast `∛(8n³−4n²)`.
- Problem: uczeń widzi „nie moje zadanie”, a zmiana znaku dzieje się bez słowa.
- Propozycja: krok 1 = zapis ucznia. Jeśli silnik zmienia znak, osobny krok **„Wyciągamy minus przed ułamek”**, dlaczego: „3 − √(x+4) = −(√(x+4) − 3); tak łatwiej dobrać sprzężenie.”

### W3. Wzory zapisane tekstem z klawiatury w etykiecie
- `Mnożymy przez sprzężenie: a³ − b³ = (a − b)(a² + ab + b²)` (9f, 5a–5c), `a⁴ − b⁴ = …` (9e, 5d, 5e)
- `Sprowadzamy do wspólnego wykładnika: aᵍ/bᵍ = (a/b)ᵍ` (6h)
- `Granica znana: sin u/u → 1` (sin(3x)/x)
- w kodzie: `Łączymy logarytmy: log f − log g = log(f/g), k·log f = log fᵏ` (math-limits.js:578)
- Propozycja: etykieta krótka po polsku, wzór do słownika (podkreślenie ⟦…⟧ + dymek), tak jak już działa „e”.

### W4. „Podstawiamy x = a” bez rachunku
8a krok 4: `lim(x→4) (x − 2)/(3x + 2) = 1/7` — przeskok od wzoru do 1/7.
- Propozycja: math `(4 − 2)/(3·4 + 2) = 2/14 = 1/7`; etykieta **„Wstawiamy x = 4”**; dlaczego: „Po skróceniu mianownik nie jest już zerem, więc wystarczy wstawić liczbę.”
- Dotyczy 8a–8f, 9a–9f, (e^x−1)/x krok 3.

---

## Grupa 6: liczba e i [1^∞]

### 6a `lim n→∞ (1-1/n)^n`
| krok | jest | problem | propozycja |
|---|---|---|---|
| 1 | `[1^∞]` | symbol bez wyjaśnienia | W1; dlaczego: „Podstawa dąży do 1, wykładnik do ∞. Wynik nie musi być 1 — trzeba liczyć.” |
| 2 | `[Dorabiamy jedynkę]  1 − 1/n = 1 + 1/(−n),  aₙ = −n` | „Dorabiamy” sugeruje dodawanie czegoś, a jedynka już jest; aₙ spada z nieba | etykieta: **„Zapisujemy podstawę jako 1 + 1/aₙ”**; math: `1 − 1/n = 1 + 1/(−n),  aₙ = −n → −∞`; dlaczego: „Wzór na e działa tylko dla postaci (1 + 1/aₙ)^aₙ, więc szukamy aₙ.” |
| 3 | `[Podstawa dąży do e] … [⟦(1 + 1/(−n))^(−n)⟧]^(−1) = e^(−1)` | OK, ale niewidoczne, skąd wykładnik −1 | etykieta: **„Dopasowujemy wykładnik do aₙ”**; dlaczego: „n = (−n)·(−1), więc (…)^n = [(…)^(−n)]^(−1); podkreślone → e.” |
| 4 | `Wynik … = 1/e` | brak e^(−1) = 1/e (drobne) | można dopisać w kroku 3: `= e^(−1) = 1/e` |

### 6b `(1+1/(2n))^n`
- Krok 2: `[Dorabiamy jedynkę]  1 + 1/(2n),  aₙ = 2n` — krok pusty (nic się nie zmienia). Propozycja: etykieta **„Podstawa ma już postać 1 + 1/aₙ”**, math `aₙ = 2n → ∞`. Albo scalić z krokiem 3.
- Krok 3: `[⟦(1 + 1/(2n))^(2n)⟧]^(1/2) = e^(1/2)` — dopisać `= √e` (Wynik pokazuje √e bez przejścia).

### 6c `((n+4)/n)^(n+5)`
| krok | jest | problem | propozycja |
|---|---|---|---|
| 2 | `(n + 4)/n = 1 + 4/n,  aₙ = n/4` | skok: czemu aₙ = n/4, skoro widać 4/n? | math: `1 + 4/n = 1 + 1/(n/4),  aₙ = n/4`; dlaczego: „4/n to to samo co 1/(n/4), a wzór potrzebuje jedynki w liczniku.” |
| 3 | `[⟦(1 + 4/n)^(n/4)⟧]^(4(n + 5)/n)` | etykieta „Podstawa dąży do e” obiecuje e, a w math nie ma „= e”; nie wiadomo, skąd nowy wykładnik | etykieta: **„Wstawiamy aₙ do wykładnika”**; dlaczego: „Mnożymy wykładnik przez aₙ i dzielimy przez aₙ: n + 5 = (n/4)·4(n+5)/n. Podkreślona część → e.” |
| 4 | `[Granica wykładnika]  lim 4(n + 5)/n` | OK | **„Liczymy granicę reszty wykładnika”** |
| 5 | `4n(1 + 5/n)/(n)` | zbędny nawias `(n)` | formatowanie: `/n` |
| 7 | `[Wyrazy z n w mianowniku dążą do 0]  → 4` | OK | — |
| 8 | `[Wykładnik]  → 4` | **powtórzenie kroku 7** | usunąć; w zamian **„Składamy wynik”**, math `e^4` (patrz 6d) |

### 6d `(n/(n+3))^(2n)` (to samo w ściądze)
| krok | jest | problem | propozycja |
|---|---|---|---|
| 2 | `n/(n + 3) = 1 + (−3/(n + 3)),  aₙ = −(n + 3)/3` | dwa skoki: skąd −3/(n+3) i skąd aₙ jako odwrotność | math w dwóch linijkach: `n/(n+3) = (n + 3 − 3)/(n + 3) = 1 − 3/(n + 3)` oraz `1/aₙ = −3/(n + 3), więc aₙ = −(n + 3)/3`; dlaczego: „Dodajemy i odejmujemy 3 w liczniku, żeby wyłonić jedynkę.” Zapis `1 + (−3/(n+3))` zamienić na `1 − 3/(n+3)`. |
| 3 | `[⟦…⟧]^(−6n/(n + 3))` | wykładnik −6n/(n+3) bez wyjaśnienia | jak 6c krok 3: „2n = aₙ · (2n/aₙ) = aₙ · (−6n/(n+3))” |
| 7 | `→ −6` | — | — |
| 8 | `[Wykładnik]  → −6` | **powtórzenie** | usunąć; zastąpić **„Składamy wynik”** `e^(−6) = 1/e⁶`; dlaczego: „Podkreślona część dąży do e, wykładnik do −6, więc całość do e⁻⁶.” |
| 9 | `= 1/e⁶` | brak przejścia e⁻⁶ → 1/e⁶ | załatwia nowy krok 8 |

### 6e `(1-1/n^2)^n`
| krok | jest | problem | propozycja |
|---|---|---|---|
| 5 | `[Wyłączamy najwyższe potęgi przed nawias]  lim(n→∞) −1/(n)` | krok pusty — nic nie wyłączono | usunąć |
| 6 | `[Wyrazy z n w mianowniku dążą do 0]  → −1 · 1/n → 0` | dziwny zapis „−1 · 1/n” | etykieta **„1/n dąży do 0”**, math `−1/n → 0` |
| 7 | `[Wykładnik]  → 0` | powtórzenie | usunąć; **„Składamy wynik”** `e^0 = 1`; dlaczego: „Każda liczba (oprócz 0) do potęgi 0 daje 1.” |
| — | — | brak w ogóle e⁰ = 1, a Wynik to 1 | j.w. |

### 6f `((5n+7)/(5n-8))^n`
- Krok 2: `(5n + 7)/(5n − 8) = 1 + 15/(5n − 8)` — brak rachunku. math: `(5n − 8 + 15)/(5n − 8) = 1 + 15/(5n − 8)`, potem `aₙ = (5n − 8)/15`.
- Krok 8 `[Wykładnik]  → 3` = powtórzenie kroku 7; zamienić na `e^3`.

### 6g `((2n+sqrt(n))/(2n+7sqrt(n)))^(2+sqrt(n))`
- Krok 1: **brak symbolu `[1^∞]`** (w 6a–6f jest). Uczeń nie wie, czemu tu wzór na e. Przyczyna: `indeterminate` (math-limits.js:963) liczy granicę podstawy z tolerancją 1e-9, a podstawa zbiega wolno (1 − 3/√n); `eLimit.test` (722) ma już luźniejszy próg — użyć tego samego.
- Krok 2: `1 + (−6√n/(2n + 7√n))` — j.w. pokazać `(2n + 7√n − 6√n)/(2n + 7√n)`.
- Krok 5: `[Wyłączamy n przed nawias]  −6n(1 + 2/√n)/(n(2 + 7/√n))` — skok: licznik to −6√n(√n + 2), a „n” powstaje z √n·√n. Dlaczego: „√n · √n = n.”
- Krok 8 powtórzenie (jak wyżej).

### 6h `(n+3)^(2n^2+12n)/(n^2+6n)^(n^2+6n)`
| krok | jest | problem | propozycja |
|---|---|---|---|
| 1 | `[∞/∞]` | formalnie tak, ale to nie podpowiada metody | zostawić, ale w kroku 2 dopisać, że wychodzi [1^∞] |
| 2 | `[Sprowadzamy do wspólnego wykładnika: aᵍ/bᵍ = (a/b)ᵍ]  ((n² + 6n + 9)/(n² + 6n))^(n² + 6n)` | wzór w etykiecie; ukryty krok (n+3)^(2(n²+6n)) = ((n+3)²)^(n²+6n) | etykieta **„Zapisujemy oba wykładniki tak samo”**; math: `(n + 3)^(2(n² + 6n)) = ((n + 3)²)^(n² + 6n) = (n² + 6n + 9)^(n² + 6n)`, potem iloraz; dlaczego: „2n² + 12n = 2(n² + 6n), a potęgi o tym samym wykładniku można podzielić pod jednym wykładnikiem.” |
| 3 | `Dorabiamy jedynkę … aₙ = (n² + 6n)/9` | jak 6a | jak 6a |

### 6i, 6j
- Krok 2: bez rachunku odejmowania (6i: `1 + (−3(n − 2)/(n² + 5n + 1))`; 6j: `1 + 2(3n − 2)/(3n² − 2n + 5)`). Pokazać różnicę liczników: 6i `(n² + 2n + 7) − (n² + 5n + 1) = −3n + 6 = −3(n − 2)`; 6j `(3n² + 4n + 1) − (3n² − 2n + 5) = 6n − 4 = 2(3n − 2)` (sprawdzone).
- aₙ jako ułamek piętrowy: wystarczy „aₙ = odwrotność tego ułamka”; dlaczego: „Wzór chce 1/aₙ, więc aₙ to ułamek odwrócony.”
- Krok 8 powtórzenie.

---

## Znane granice i de l'Hospital

### `lim x→0 sin(3x)/x`
| krok | jest | problem | propozycja |
|---|---|---|---|
| 1 | `[0/0]` | W1 | W1 |
| 2 | `[Granica znana: sin u/u → 1]  u = 3x → 0:  lim(x→0) [sin(3x)/(3x)] · 3` | wzór tekstem w etykiecie; „u” bez wyjaśnienia; nie widać, że mnożymy i dzielimy przez 3 | etykieta **„Mnożymy i dzielimy przez 3”**; math: `sin(3x)/x = ⟦sin(3x)/(3x)⟧ · 3` z `formula: {id: 'sinu'}`; dlaczego: „Pod sinusem jest 3x, więc w mianowniku też potrzebujemy 3x — wtedy działa wzór.” |
| 3 | `[Nawias kwadratowy → 1]  lim(x→0) 3` | „nawias kwadratowy” to opis wyglądu, nie matematyki | etykieta **„Podkreślony ułamek dąży do 1”**; math `→ 1 · 3 = 3`. Krok 4 (Wynik) zostaje. |

### `lim x→0 (e^x-1)/x`
| krok | jest | problem | propozycja |
|---|---|---|---|
| 2 | `[Reguła de l'Hospitala]  lim(x→0) (e^x − 1)′/(x)′ = lim(x→0) e^x` | (a) brak powodu (0/0); (b) nie pokazano pochodnych osobno; (c) **merytorycznie**: to jest znana granica (eᵘ−1)/u → 1; liczenie jej de l'Hospitalem to błędne koło (wzór (eˣ)′ = eˣ wyprowadza się właśnie z tej granicy) — nauczyciel może nie uznać | **lepiej**: użyć reguły znanej granicy: etykieta **„Rozpoznajemy znaną granicę”**, math `⟦(e^x − 1)/x⟧ → 1`, `formula: {id: 'eu'}`. Jeśli zostaje de l'Hospital: etykieta **„Liczymy osobno pochodne licznika i mianownika”**, math `(e^x − 1)′ = e^x,  (x)′ = 1`, potem `lim e^x/1`; dlaczego: „Wyszło 0/0, a wtedy granica ułamka = granica ilorazu pochodnych (reguła de l'Hospitala).” |
| 3 | `[Podstawiamy x = 0]  lim(x→0) e^x = 1` | brak `e^0` | math `e^0 = 1` |

Uwaga do silnika: `knownLimits` stoi w RULES przed `lHospital` (math-limits.js:940), a mimo to wygrał de l'Hospital. Najpewniej licznik `e^x − 1` jest zwinięty w jeden czynnik typu `sum` (math-calculus.js:69), a `knownPart` (math-limits.js:847–861) sprawdza tylko `x.length === 2`. Nie uruchamiałem silnika (zakaz) — to hipoteza z czytania kodu; do potwierdzenia testem.

### Reguła de l'Hospitala ogólnie (math-limits.js:936)
- Etykieta zawsze ta sama, bez powodu. Propozycja: `"Liczymy pochodne licznika i mianownika (reguła de l'Hospitala, bo " + ind + ")"` albo krótsza etykieta + ⟦⟧ z id `lhospital` na zapisie `f′/g′`.
- Pokazywać pochodne w osobnej linijce, żeby uczeń nie pomylił z pochodną ilorazu (częsty błąd).

### Logarytmy (tylko kod, brak przykładów w danych)
- 578: `Łączymy logarytmy: log f − log g = log(f/g), k·log f = log fᵏ` → **„Łączymy logarytmy w jeden”**, wzór do słownika (id `log-suma`); dlaczego: „Różnica logarytmów to logarytm ilorazu, a ilorazu umiemy policzyć granicę.”
- 590: `Logarytm jest ciągły` → **„Wstawiamy granicę do logarytmu”**; dlaczego: „Logarytm nie ma skoków, więc wystarczy policzyć granicę tego, co jest w środku.”
- 582: `Logarytm rośnie bez ograniczeń` → OK, dopisać math `ln(→ +∞) → +∞`.

---

## Granice jednostronne i nieskończone

### `lim x→0+ 1/x` (ściąga)
| krok | jest | problem | propozycja |
|---|---|---|---|
| 1 | brak symbolu | uczeń nie widzi, że to „1 przez prawie zero” | dopisać `[1/0⁺]` |
| 2 | `[Granica jednostronna 0⁺]  licznik → 1, mianownik → 0⁺,  lim(x→0⁺) 1/x = +∞` | „0⁺” nie wyjaśnione; brak „dlaczego +∞” | etykieta **„Patrzymy tuż na prawo od 0”**; math `licznik → 1, mianownik → 0⁺ (mała liczba dodatnia)`; dlaczego: „Dzielimy 1 przez coraz mniejszą liczbę dodatnią: 1/0,01 = 100, 1/0,001 = 1000 — wynik rośnie bez końca.” |

Gdy obie strony się różnią (math-limits.js:913, „Granice jednostronne są różne”) — dopisać dlaczego: „Z lewej wychodzi −∞, z prawej +∞, więc jednej granicy nie ma.”

### Zestaw 7 (x → ±∞)
- 7a krok 4: `→ √3/3` — skok: z `1/√(3 + 5/x²)` od razu √3/3. math: `→ 1/√3 = √3/3`; dlaczego: „5/x² → 0, a 1/√3 zapisujemy bez pierwiastka w mianowniku.” (Dotyczy też 7d `→ −3√2/4`: `−6/(2√8) = −6/(4√2) = −3√2/4`, sprawdzone.)
- 7b krok 2: `[Dla x → −∞]  √(x²) = |x| = −x` — brak dlaczego. Etykieta **„x jest ujemne, więc √(x²) = −x”**; dlaczego: „Pierwiastek daje liczbę dodatnią, np. x = −5: √25 = 5 = −(−5).”
- 7b krok 3: `−(−x)/((−x)√(3 + 5/x²))` — licznik `x` zapisany jako `−(−x)` bez słowa. Dlaczego: „x = −(−x); wyłączamy dodatnią liczbę −x, tę samą co w mianowniku.”
- 7c krok 3: `[Upraszczamy licznik]  3x/(2x − √(4x² − 3x))` — po cichu zmieniono znaki licznika i mianownika (było −3x/(√… − 2x)). Pokazać albo nie odwracać.
- 7c krok 6: `−3/(−(√(4 − 3/x) + 2))` — dwa minusy niezredukowane; dopisać `= 3/(√(4 − 3/x) + 2)`.
- 7e krok 1: brak symbolu (to [∞ · 0]); `indeterminate` (963) nie zna `∞·0`.
- 7e krok 4: `√(x²) = |x| = −x` — nie pasuje do tego, co dalej się dzieje (krok 5 wyciąga `(−x)^(1/2)`). Zamienić na **„Dla x → −∞ liczba −x jest dodatnia”**, math `√(−2x + 7) = √(−x) · √(2 − 7/x)`.
- 7e krok 5: `(−x)^(1/2)` → pisać `√(−x)` (zapis z klawiatury).
- 7a–7e „Wyrazy z x w mianowniku dążą do 0” — OK, ale przy x→−∞ warto „(x ujemne, ale bardzo duże co do wartości)”.

---

## Granice w punkcie skończonym

### Zestaw 8 (rozkład na czynniki)
| krok | jest | problem | propozycja |
|---|---|---|---|
| 2 | `[Rozkładamy na czynniki]  (x − 4)(x − 2)/((x − 4)(3x + 2))` | brak dlaczego: skąd pewność, że jest (x − 4)? | etykieta **„Wyłączamy wspólny czynnik (x − 4)”**; dlaczego: „x = 4 zeruje licznik i mianownik, więc oba dzielą się przez (x − 4).” (opcjonalnie dymek `bezout`) |
| 3 | `[Skracamy (x − 4)]` | OK; dlaczego: „x tylko zbliża się do 4, więc x − 4 ≠ 0 i wolno skrócić.” | — |
| 4 | `= 1/7` | W4 | `(4 − 2)/(3·4 + 2) = 2/14 = 1/7` |

- 8c krok 2: `(x − 2)(x³ + 2x² − 9x − 18)` — dla słabego ucznia skąd ten sześcian? Dopisać „dzielimy wielomian przez (x − 2) (schemat Hornera)”.
- 8f kroki 2–3: `(x + 1)(x + 1)(3x + 2)/((x + 1)(x + 1)(2x² − 5))`, potem `[Skracamy (x + 1)]` — skrócono **dwa razy**, etykieta mówi raz. Etykieta: **„Skracamy (x + 1)²”** (math-limits.js:836, wykładnik = M).

### Zestaw 9 (sprzężenie)
| zadanie/krok | jest | problem | propozycja |
|---|---|---|---|
| 9a k2 | `[Mnożymy przez sprzężenie]  √(x + 4) − 3 = (x + 4 − 9)/(√(x + 4) + 3)` | „sprzężenie” to żargon; nie wiadomo czym mnożymy | etykieta **„Mnożymy licznik i mianownik przez √(x + 4) + 3”**; dlaczego: „Ze wzoru (a − b)(a + b) = a² − b² pierwiastek znika.” ⟦…⟧ + id `sprzezenie` |
| 9a k3 | `[Upraszczamy licznik]  lim(x→5) −(√(x + 4) + 3)` | etykieta fałszywa: uproszczono mianownik i po cichu skrócono (x − 5) | dwa kroki: „x + 4 − 9 = x − 5” i **„Skracamy (x − 5)”** |
| 9b k3 | `[Upraszczamy licznik]  −(x + √(x + 6)) · (x² − 5x + 6)/(x² − x − 6)` | j.w. (zmienił się mianownik) | **„Porządkujemy ułamek”** albo „Upraszczamy mianownik” |
| 9b k4, 9c k4 | `−1(x + √(x + 6))…` | zapis „−1(” | `−(x + √(x + 6))…` |
| 9c k2 | `x + √(x⁴ − 12) = (x⁴ − 12 − x²)/(−x + √(x⁴ − 12))` | przestawione składniki, trudne do śledzenia | pokazać `(√(x⁴ − 12) + x)(√(x⁴ − 12) − x) = x⁴ − 12 − x²` |
| 9d | dwa razy „Mnożymy przez sprzężenie” | uczeń nie wie, czemu drugi raz | etykieta drugiego: **„Teraz pozbywamy się pierwiastka z licznika”** |
| 9e k2, 9f k2 | `Mnożymy przez sprzężenie: a⁴ − b⁴ = …` | wzór tekstem, „sprzężenie” dla pierwiastka 3. i 4. stopnia to rozszerzenie pojęcia | **„Uzupełniamy do wzoru a⁴ − b⁴”** + dymek `roznica-poteg` |
| 9f k4 | `1/3((3x − 1)^(2/3) + …)(x − 3)(x − 5)/(x − 3)` | „1/3(…)” czytelne jak 1/(3(…)) | `(1/3)·(…)` albo przenieść 3 do mianownika |
| 9e/9f | `(x + 15)^(3/4)`, `(3x − 1)^(2/3)` | zapis z klawiatury | `∜((x + 15)³)`, `∛((3x − 1)²)` (lub w rysunku LaTeX) |

---

## Propozycje wpisów do słownika (js/step-formulas.js)

Ton i budowa jak wpis `e`. Sprawdziłem liczby w „Więcej”.

```js
sinu: {
    name: 'Granica sin u przez u',
    tex: '\\frac{\\sin u}{u}\\to 1\\quad\\text{gdy } u\\to 0',
    why: 'Pod sinusem i w mianowniku musi stać to samo $u$, które dąży do 0. Dlatego czasem mnożymy i dzielimy przez liczbę, '
        + 'np. $\\frac{\\sin 3x}{x}=\\frac{\\sin 3x}{3x}\\cdot 3$. Podkreślony ułamek zastępujemy jedynką.',
    level: 'Studia: analiza matematyczna, granice funkcji',
    more: [
        'Dla małych kątów sinus jest prawie równy samemu kątowi: $\\sin 0{,}1\\approx 0{,}09983$, więc $\\frac{\\sin 0{,}1}{0{,}1}\\approx 0{,}998$.',
        'Wzór działa tylko dla kąta w radianach. W stopniach granica wynosiłaby $\\frac{\\pi}{180}$.',
        'Tak samo działają $\\frac{\\operatorname{tg} u}{u}\\to 1$, $\\frac{\\arcsin u}{u}\\to 1$ i $\\frac{\\operatorname{arctg} u}{u}\\to 1$.',
    ],
},
ln1u: {
    name: 'Granica ln(1 + u) przez u',
    tex: '\\frac{\\ln(1+u)}{u}\\to 1\\quad\\text{gdy } u\\to 0',
    why: 'W logarytmie musi stać $1+u$, a w mianowniku to samo $u$, które dąży do 0. Podkreślony ułamek zastępujemy jedynką.',
    level: 'Studia: analiza matematyczna, granice funkcji',
    more: [
        'Przykład: $\\frac{\\ln 1{,}01}{0{,}01}\\approx 0{,}995$. Im mniejsze $u$, tym bliżej 1.',
        'Skąd to? $\\frac{\\ln(1+u)}{u}=\\ln\\left(1+u\\right)^{\\frac{1}{u}}$, a $\\left(1+u\\right)^{\\frac{1}{u}}\\to e$ (wzór na $e$ z $a=\\frac{1}{u}$). Zostaje $\\ln e=1$.',
        'Często trzeba najpierw zobaczyć $u$: w $\\ln x$ przy $x\\to 1$ mamy $u=x-1$.',
    ],
},
eu: {
    name: 'Granica (eᵘ − 1) przez u',
    tex: '\\frac{e^{u}-1}{u}\\to 1\\quad\\text{gdy } u\\to 0',
    why: 'W wykładniku i w mianowniku musi stać to samo $u$, które dąży do 0. Podkreślony ułamek zastępujemy jedynką.',
    level: 'Studia: analiza matematyczna, granice funkcji',
    more: [
        'Przykład: $\\frac{e^{0{,}01}-1}{0{,}01}\\approx 1{,}005$.',
        'To jest nachylenie wykresu $y=e^{x}$ w punkcie $x=0$. Dlatego $(e^{x})\'=e^{x}$ — ten wzór wynika właśnie z tej granicy.',
        'Ogólniej $\\frac{a^{u}-1}{u}\\to\\ln a$; dla $a=e$ wychodzi $\\ln e=1$.',
    ],
},
lhospital: {
    name: "Reguła de l'Hospitala",
    tex: '\\lim\\frac{f(x)}{g(x)}=\\lim\\frac{f\'(x)}{g\'(x)}\\quad\\text{gdy wychodzi }\\left[\\tfrac{0}{0}\\right]\\text{ albo }\\left[\\tfrac{\\infty}{\\infty}\\right]',
    why: 'Wstawienie dało $\\left[\\frac{0}{0}\\right]$ albo $\\left[\\frac{\\infty}{\\infty}\\right]$. Wtedy liczymy osobno pochodną licznika i osobno pochodną mianownika i szukamy granicy ich ilorazu.',
    level: 'Studia: analiza matematyczna, pochodne',
    more: [
        'To nie jest pochodna ilorazu! Liczymy $f\'$ i $g\'$ osobno, bez wzoru $\\left(\\frac{f}{g}\\right)\'$.',
        'Działa tylko dla $\\left[\\frac{0}{0}\\right]$ i $\\left[\\frac{\\infty}{\\infty}\\right]$. Dla $\\frac{1}{0}$ albo $\\frac{2}{3}$ daje zły wynik.',
        'Jeśli granica $\\frac{f\'}{g\'}$ nie istnieje, reguła nic nie mówi: $\\frac{x+\\sin x}{x}\\to 1$ przy $x\\to\\infty$, a $\\frac{1+\\cos x}{1}$ nie ma granicy.',
    ],
},
nieoznaczone: {
    name: 'Symbole nieoznaczone',
    tex: '\\left[\\tfrac{0}{0}\\right],\\ \\left[\\tfrac{\\infty}{\\infty}\\right],\\ [\\infty-\\infty],\\ [0\\cdot\\infty],\\ [1^{\\infty}],\\ [\\infty^{0}],\\ [0^{0}]',
    why: 'Nawias kwadratowy pokazuje, co wychodzi po wstawieniu. To nie jest liczba: wynik może być dowolny, '
        + 'więc najpierw przekształcamy wyrażenie, a dopiero potem liczymy granicę.',
    level: 'Liceum (rozszerzenie) i studia: granice',
    more: [
        'Wszystkie trzy dają $\\left[\\frac{0}{0}\\right]$ przy $x\\to 0^{+}$, a wyniki są różne: $\\frac{x}{x}\\to 1$, $\\frac{x^{2}}{x}\\to 0$, $\\frac{x}{x^{2}}\\to+\\infty$.',
        'Nie są nieoznaczone np. $\\left[\\frac{1}{0^{+}}\\right]=+\\infty$, $\\left[\\frac{5}{\\infty}\\right]=0$, $[\\infty+\\infty]=\\infty$ — tu wynik od razu wiadomo.',
        '$[1^{\\infty}]$ też jest nieoznaczony: podstawa bliska 1, ale wykładnik ogromny. Pomaga wzór na $e$.',
    ],
},
```

Dodatkowe (opcjonalne, bo pojawiają się w zakresie): `sprzezenie` — $(a-b)(a+b)=a^{2}-b^{2}$, why: „mnożymy przez sumę, żeby pierwiastek zniknął”; `roznica-poteg` — $a^{3}-b^{3}=(a-b)(a^{2}+ab+b^{2})$ i $a^{4}-b^{4}$; `bezout` — „jeśli $W(a)=0$, to $W(x)$ dzieli się przez $(x-a)$”, poziom: liceum.

Merytoryka sprawdzona: radiany w sin u/u; uzasadnienie ln przez e poprawne (ciągłość ln); $(a^u−1)/u → \ln a$ poprawne; kontrprzykład do de l'Hospitala poprawny (granica 1 istnieje, $1+\cos x$ oscyluje); przykłady 0/0 poprawne dla $x\to0^{+}$.

---

## (1) Ogólne reguły pisania kroków

1. Etykieta zaczyna się od czasownika i mówi CO robimy: „Wyłączamy…”, „Skracamy…”, „Wstawiamy…”. Bez opisu wyglądu („Nawias kwadratowy → 1”).
2. W etykiecie żadnych wzorów zapisanych z klawiatury (`aᵍ/bᵍ`, `sin u/u → 1`, `^(1/2)`). Wzór idzie do słownika i do ⟦…⟧.
3. Każda nowa litera (aₙ, u) jest przedstawiona: „aₙ = −n → −∞”, „u = 3x → 0”.
4. Żaden krok nie może powtarzać poprzedniego (np. `→ −6` dwa razy) ani nic nie zmieniać (6e krok 5, 6b krok 2).
5. Między zapisem a wynikiem pokazujemy rachunek, gdy da się go zmieścić w jednej linii: `(4 − 2)/(3·4 + 2) = 1/7`, `e^(−6) = 1/e⁶`, `1/√3 = √3/3`.
6. Etykieta musi zgadzać się z tym, co się stało (9a „Upraszczamy licznik”, a zmienił się mianownik i coś skrócono; 8f skrócono 2 razy).
7. Każdy symbol nieoznaczony ma ⟦…⟧ z dymkiem; każde użycie reguły (de l'Hospital) mówi, dlaczego wolno (0/0 lub ∞/∞).
8. Krok 1 pokazuje dokładnie to, co wpisał uczeń. Przekształcenie znaku to osobny, nazwany krok.
9. Ostatni krok przed „Wynik” składa wynik z części (e^L, 1·3, e⁰ = 1) — Wynik nie może zawierać nowej rzeczy.
10. Minusy redukujemy od razu (`−3/(−(…))` → `3/(…)`, `−1(` → `−(`).

## (2) Zmiany w silniku — od największego zysku

1. **Usunąć powtórzony „Wykładnik → L” i dodać „Składamy wynik: e^L = …”** — js/math-limits.js:757 (warunek `!single`) i 744–756. Dotyczy 6c, 6d, 6e, 6f, 6g, 6i, 6j i ściągi. W miejsce linii 757: `line(log, 'Składamy wynik', 'e^(' + L + ') = ' + show(wynik))`; tak samo dla stałego wykładnika (740: dopisać `= wynik` gdy różny od e^(…)).
2. **„Dorabiamy jedynkę” → „Zapisujemy podstawę jako 1 + 1/aₙ” z rachunkiem i „aₙ → ±∞”** — math-limits.js:735 (+ 728–734: pokazać `(P − Q + Q)/Q`, zapis `1 − k/…` zamiast `1 + (−k/…)`). 6a–6j.
3. **Krok 3 grupy 6 wyjaśnia wykładnik**: etykieta „Wstawiamy aₙ do wykładnika”, math `g = aₙ · (g/aₙ)` — math-limits.js:740.
4. **Pierwszy krok: etykieta „Sprawdzamy, co wychodzi po wstawieniu”, symbol w ⟦…⟧ z id `nieoznaczone`, zapis ucznia zamiast postaci kanonicznej** — math-limits.js:996 (`limOf(d.v, d.target, e)` → tekst z `d.src`/AST). Plus `indeterminate` (963–986): ten sam próg co `eLimit.test` (722) dla 6g, dodać `∞·0` (7e) i `1/0⁺` (granica jednostronna).
5. **Znane granice przez słownik**: math-limits.js:845 (KNOWN_FN → id wzorów), 877 (etykieta „Mnożymy i dzielimy przez …” / „Rozpoznajemy znaną granicę”, ułamek w ⟦…⟧, `formula: {id}`), 878 („Podkreślony ułamek dąży do 1”, math `→ 1 · rest`). Plus dodać 5 wpisów do js/step-formulas.js:9.
6. **(e^x − 1)/x przez znaną granicę, nie de l'Hospitala** — `knownPart` math-limits.js:847–861 powinien rozpakować czynnik `{k: 'sum'}` (powstaje w math-calculus.js:69). Hipoteza z kodu, do potwierdzenia testem.
7. **De l'Hospital z powodem i z pochodnymi osobno** — math-limits.js:936: etykieta z `ind`, osobna linia `f′ = …, g′ = …`, ⟦…⟧ z id `lhospital`.
8. **Sprzężenie: etykieta mówi, przez co mnożymy; „Upraszczamy licznik” tylko gdy to prawda; skrócenie jako osobny krok** — math-limits.js:643–646 (CONJ_LABEL bez wzorów), 659, 671. Dotyczy 9a–9f, 7c–7e.
9. **„Podstawiamy” z rachunkiem** — math-limits.js:307: pokazać `substitute(e, v, pt)` przed `fold` (`(4 − 2)/(3·4 + 2) = 1/7`), etykieta „Wstawiamy x = a”.
10. **Rozkład na czynniki: wykładnik krotności i formatowanie** — math-limits.js:834–836: `Skracamy (x + 1)²` gdy M > 1 (8f); `coef` „−1”/„1/3” → „−”/„(1/3)·” (9b, 9c, 9f).
11. **Granica jednostronna z wyjaśnieniem 0⁺** — math-limits.js:907, 913: etykieta „Patrzymy tuż na prawo od a”, math z dopiskiem „mała liczba dodatnia”.
12. **dominantPower: pusty krok i x → −∞** — math-limits.js:474 (nie logować, gdy nic nie wyłączono: 6e krok 5), 469 (etykieta „x jest ujemne, więc √(x²) = −x”; w 7e zamiast tego „−x > 0”), 480 (pokazać `1/√3 = √3/3` przed `rationalize`), 485 (`−1 · 1/n → 0` → `−1/n → 0`).
13. **Logarytmy** — math-limits.js:578, 590: etykiety bez wzorów, „Wstawiamy granicę do logarytmu”.
14. Formatowanie potęg ułamkowych `(…)^(2/3)`, `(−x)^(1/2)` jako pierwiastki — w `C.show` (math-calculus.js), dotyczy 5a–5e, 7e, 9e, 9f.
