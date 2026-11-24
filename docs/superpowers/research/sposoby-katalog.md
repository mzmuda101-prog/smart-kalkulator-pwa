# Katalog sposobów rozwiązania: co apka ma, czego brakuje (2026-11-24, v1.05.55)

Zebrane przez czterech agentów (granice, równania, analiza, reszta) na prośbę Mateusza: „mądrze” dodać brakujące
sposoby szkolne (liceum, P/R) i studenckie. Wyniki przykładów w tabelach agenci liczyli w głowie — przed wdrożeniem
każdy sprawdza SymPy (`npm run check:steps`). Kolumna „szkoła domyślnie?” = apka idzie dziś inną drogą niż lekcja.

## Wspólny wątek: rozkład jak w szkole
Ten sam brak wraca w trzech działach: granice 0/0 (zawsze Horner), `rozwiąż` (x³ − x = 0 → brak wyniku, x⁴ − 5x² + 4
przez Hornera), `rozłóż` (trójmian deltą, wzory skróconego mnożenia przez pierwiastki). Szkolna kolejność:
wyłączenie przed nawias → wzory skróconego mnożenia → suma i iloczyn / delta → grupowanie → podstawienie t = x² →
Horner (ostatnia deska ratunku). Jeden wspólny moduł rozkładu obsłuży wszystkie trzy miejsca.

## Braki, które nie są „innym sposobem”, tylko dziurą (apka pisze „Jeszcze tego nie rozwiążę”)
granice: 3ⁿ − 2ⁿ, 2ⁿ/n!, n!/nⁿ, x²/eˣ, sin(n)/n, ⁿ√n, x·sin(1/x), (2ⁿ + 3ⁿ)^(1/n);
równania: x³ − x = 0, układ 3×3; reszta: `uprość (x²−4)/(x+2)`, liczby mieszane `1 1/2 + 2 1/3`;
analiza: pochodna xˣ (pochodna logarytmiczna), sin³x, sin⁴x, sin2x·cos x, x√(x+1), 1/(x(x+1)²), 1/(x³+x), 1/(x²+1)²,
eˣ·sin x, 1/sin x, 1/(1+cos x).


---

<!-- dział: granice -->
### Granice: katalog sposobów (n→∞, x→a, x→±∞, jednostronne)

Sprawdzone silnikiem (`S.run`) i w `js/math-limits.js`. Dziś reguły (RULES): dominantPower, commonDenominator, logCombine, conjugate, splitPairs, eLimit, eShortcut, sameExponent, factorCancel, knownLimits, oneSided, lHospital.

### 1. Co jest dziś

- Ciąg/funkcja wymierna, x→±∞ lub n→∞ -> najwyższa potęga (przełącznik: "Najwyższa potęga"; dla x→∞ drugi sposób "de l'Hospital").
- Różnica ułamków -> wspólny mianownik ("Wspólny mianownik"); różnica logarytmów -> łączenie logarytmów.
- Różnica pierwiastków (2., 3., 4. stopnia) -> sprzężenie / różnica sześcianów / czwartych potęg ("Sprzężenie"); także 0/0 przy x→a (drugi sposób "de l'Hospital").
- 1^∞ -> dorabianie jedynki (e) ("Dorabianie jedynki") obok wzoru skróconego ("Wzór skrócony").
- 0/0 przy x→a (wielomiany) -> WYŁĄCZNIE schemat Hornera + skracanie ("Rozkład na czynniki"; drugi sposób "de l'Hospital"). Silnik nie ma innej drogi rozkładu.
- sin x / x, ln(1+x)/x, (1-cos x)/x^2 itp. -> "Znana granica" (kolorowy ułamek dąży do 1) albo de l'Hospital.
- Mianownik -> 0, licznik c≠0 -> granice jednostronne (znak mianownika), zapis `x→a⁺/⁻`.
- Nieznane/nieobsługiwane (zwraca null, bez wyniku): a^n (`3^n-2^n`, `2^n+3^n`), silnia (`2^n/n!`, `n!/n^n`), `n^(1/n)`, `x^2/e^x`, `sin(n)/n`, `x·sin(1/x)`, sumy `1+2+...+n`, `(2^n+3^n)^(1/n)`. To luka pokrycia, nie tylko sposobów.

### 2. Czego brakuje

| typ zadania | sposób | poziom | kiedy | przykład z wynikiem | domyślna w szkole? | trudność + dlaczego |
|---|---|---|---|---|---|---|
| 0/0, x→a, trójmian kwadratowy | rozkład przez Viète'a / deltę i x1,x2 | szkoła P+R | licznik lub mianownik to trójmian z pierwiastkiem a | lim x→3 (x²-5x+6)/(x²-9) = 1/6 | TAK - a apka daje Horner | mała: pierwiastek a znany, drugi z Viète'a |
| 0/0, x→a | wzory skróconego mnożenia (a²-b², a³-b³, a⁴-b⁴) | szkoła P+R | różnica kwadratów/sześcianów/n-tych potęg w liczniku lub mianowniku | lim x→1 (x⁴-1)/(x²-1) = 2 | TAK - apka daje Horner | mała: rozpoznanie wzoru, krok "Wzór" przed skracaniem |
| 0/0, x→a | wyłączanie wspólnego czynnika / grupowanie | szkoła P+R | wielomian 3.+ stopnia z grupami | lim x→2 (x³-2x²+x-2)/(x-2) = 5 | TAK (grupowanie x²(x-2)+(x-2)) | średnia: wykrycie grup |
| 0/0, x→a | podstawienie t = x² (dwukwadratowe) | szkoła R | x⁴ i x² w wielomianie: x⁴-13x²+36 | lim x→2 (x⁴-13x²+36)/(x³-2x²+x-2) = -4 (po rozkładzie (x+2)(x²-9)/(x²+1)) | TAK | mała: rozkład wg t, potem różnica kwadratów |
| x→a, a^n | granice typu a^n / ciągi geometryczne: dziel przez największą podstawę | szkoła R | sumy/ilorazy a^n, b^n | lim n→∞ (3ⁿ-2ⁿ)/(3ⁿ+2ⁿ) = 1 | TAK - dziś brak (null) | mała: dominantPower dla podstaw wykładniczych, (q)ⁿ→0 dla \|q\|<1 |
| n→∞, pierwiastek n-tego stopnia | twierdzenie o trzech ciągach (szkolne: ogranicz z góry i z dołu) | szkoła R + studia | (a^n+b^n)^(1/n), n^(1/n) wymaga innych | lim n→∞ (2ⁿ+3ⁿ)^(1/n) = 3 | TAK (R) | średnia: dobór oszacowania, szablon tylko dla sum k potęg |
| ograniczone x sinus | ograniczony × zbieżny do 0 (sin n / n, cos n / n²) | szkoła R + studia | jeden czynnik ograniczony, drugi → 0 | lim n→∞ sin(n)/n = 0 | TAK (R) | mała-średnia: wykrycie czynnika sin/cos/arctan |
| x→0, 0/0 trygonometria | jawne podstawienie t = ax | szkoła R + studia | argument ≠ x (silnik wynik daje, ale bez pokazania t) | lim x→0 sin(3x)/sin(5x) = 3/5 | TAK (R) | mała: dziś działa przez knownLimits, brak kroku z t |
| 0/0 z cos | tożsamości trygonometryczne (1-cos x = 2sin²(x/2), tg=sin/cos) | szkoła R | 1-cos(ax), tg-sin | lim x→0 (1-cos(2x))/x² = 2 | TAK (R) - apka daje de l'Hospital | średnia: przepis przekształceń trygonometrycznych |
| x→0, 0/0 | rozwinięcia Taylora/Maclaurina | studia | e^x, sin x, ln(1+x), (1+x)^α, wyższe rzędy | lim x→0 (tan x - sin x)/x³ = 1/2 | NIE (studia) | duża: potrzebne bezpieczne rozwinięcia i rzędy O(x^k); jedna droga zamiast 3x Hospital |
| x→0, 0/0 | podstawowe równoważności asymptotyczne (sin x ~ x, ln(1+x) ~ x) | studia | iloczyny/ilorazy bez różnic | lim x→0 (e^{3x}-1)/ln(1+2x) = 3/2 | NIE | mała-średnia: tylko dla czynników, nie dla sum (pułapka) |
| 1^∞ i x→a, a=0 | podstawienie zmiennej t = 1/x (x→∞ ↔ t→0⁺), potem znana granica | szkoła R + studia | (1+1/x)^x, x sin(1/x) | lim x→∞ x·sin(1/x) = 1 | TAK (R) | mała: zamiana, dalej knownLimits |
| ln(1+u)^v, 1^∞ przy x→a | logarytmowanie: lim f^g = exp(lim g·ln f) | studia | 0⁰, ∞⁰, 1^∞ ogólnie | lim x→0⁺ x^x = 1 | NIE | średnia: łańcuch logarytmu + Hospital |
| ciągi z silnią/wykładnicze | kryterium d'Alemberta (a_{n+1}/a_n) | szkoła R + studia | silnia, a^n/n! | lim n→∞ 2ⁿ/n! = 0 | TAK (studia) | średnia: dziś brak w ogóle (null) |
| ciągi ilorazowe ∞/∞ | twierdzenie Stolza | studia | suma/iloraz typu (1+...+n)/n² | lim n→∞ (1+2+...+n)/n² = 1/2 | NIE | duża: rozpoznanie sum, typ ciągu monotonicznego |
| sumy skończone | wzór na sumę (arytmetyczna/geometryczna) + granica | szkoła R | 1+2+...+n | lim n→∞ (1+2+...+n)/n² = 1/2 | TAK | mała: wzór n(n+1)/2 i dominantPower |
| ciąg rekurencyjny | granica z równania g = f(g) po wykazaniu monotoniczności i ograniczenia | szkoła R + studia | a_{n+1} = f(a_n), zbieżność z góry znana | a₁=1, a_{n+1}=√(2+a_n): granica = 2 | TAK (R rozszerzony) | duża: wymaga dowodu zbieżności |
| x→∞ funkcje elementarne | porównanie rzędów wzrostu (x^k ≪ e^x ≪ x!, ln x ≪ x^a) | szkoła R + studia | x^k/e^x, ln x/x | lim x→∞ x²/eˣ = 0 | NIE | mała: tabela hierarchii; dziś null |
| ciągłość / wartość bezwzględna | rozbicie na granice jednostronne dla \|x\|, funkcji kawałkami | szkoła R | \|x\|/x przy x→0 | lim x→0⁻ \|x\|/x = -1, lim x→0⁺ = 1, granica nie istnieje | TAK | mała: rozbicie na dwie strony i "nie istnieje" |
| 1/0 przy x→a | tabelka znaków / granice jednostronne z rozkładu | szkoła R | mianownik z dwoma pierwiastkami | lim x→2⁺ 1/(x²-4) = +∞ | TAK | mała: rozszerzenie oneSided o rozkład mianownika |

### 3. Top 5

1. Rozkład trójmianu i wzory skróconego mnożenia zamiast Hornera w 0/0 - to droga domyślna w szkole, a apka daje tylko schemat Hornera; mały koszt, największy zysk dla ucznia.
2. Granice a^n (dzielenie przez największą podstawę, q^n→0) - dziś brak wyniku (null) w typowym zadaniu maturalnym, mała zmiana w dominantPower.
3. Ograniczony × zbieżny do 0 oraz twierdzenie o trzech ciągach dla (a^n+b^n)^(1/n) - klasyka rozszerzenia, dziś brak wyniku.
4. Tożsamości trygonometryczne i podstawienie t=ax dla sin/cos/tg - szkoła daje to zamiast de l'Hospitala (którego liceum nie uczy).
5. Rzędy wzrostu i silnia/d'Alembert (x²/eˣ, 2ⁿ/n!) - najczęstsze zadania studenckie bez żadnego wyniku; potem rozwinięcia Taylora jako druga droga zamiast kilku Hospitali.

---

<!-- dział: rownania -->
### Katalog sposobów: RÓWNANIA, NIERÓWNOŚCI, UKŁADY

Źródło: `js/math-steps.js` (solveEquation, solveQuadratic, solveDegree, solveInequality, absInequality, solveSystem, solveTrig, solveAbs, solveRadical, solveExpLog, solveRational), sprawdzone `MATM0_STEPS.run("rozwiąż …")`.

### 1. Co jest dziś

Z przełącznikiem (`explain.methods`):
- równanie kwadratowe z całkowitym rozkładem: **Delta** / **Suma i iloczyn** (Viète; tylko gdy pierwiastki wymierne i trójmian dobrze się rozkłada);
- układ 2x2 liniowy: **Podstawianie** / **Przeciwne współczynniki**.

Bez przełącznika (silnik wybiera jedną drogę):
- liniowe (jedna niewiadoma, z nawiasami, ułamkami): przenoszenie, redukcja, dzielenie (ułamki: mnożenie przez odwrotność, nie przez NWW);
- kwadratowe: ax²+c=0 (pierwiastkowanie), ax²+bx=0 (wyłączanie przed nawias), pełny trójmian przez deltę; wynik z pierwiastkiem upraszczanym;
- stopień 3 i 4: twierdzenie o pierwiastkach wymiernych + schemat Hornera, potem kwadrat; x⁴=16 i x⁴−5x²+4 idą tym samym Hornerem;
- nierówność liniowa; kwadratowa (miejsca zerowe deltą + odczyt znaku z paraboli); |A|<c, |A|>c (podwójna nierówność, dwa przypadki);
- |A|=c; równanie z pierwiastkiem √A=B (dziedzina, kwadrat, odrzucenie fałszywych);
- wykładnicze (te same podstawy, a^x=b przez logarytm), logarytmiczne (dziedzina, porównanie argumentów, definicja logarytmu, jeden logarytm po każdej stronie lub log=liczba);
- wymierne (dziedzina, mnożenie przez mianownik/na krzyż, sprawdzenie dziedziny);
- trygonometryczne: sin/cos/tan(ax+b)=liczba z tablicy, serie rozwiązań kπ;
- układ 2x2 liniowy z wykryciem sprzeczności (proporcjonalne lewe strony).

Wprost NIEobsługiwane (Jeszcze tego nie rozwiążę / null): x³−x=0 i x³−3x²+2x=0 (brak wyrazu wolnego, pierwiastek 0), każda nierówność stopnia ≥3, nierówność wymierna (1/x<2, (x−1)/(x+2)>0), nierówność wykładnicza/logarytmiczna/z pierwiastkiem, |A|=|B|, dwie wartości bezwzględne, podstawienie t (4^x−3·2^x+2, x⁶−7x³−8, 2sin²x−sin x−1), sin x=cos x, równanie z sumą logarytmów, 3^(x+1)−3^x=18, dwa pierwiastki naraz, wymierne z sumą ułamków (x/(x−1)+1/(x+1)=1), układ 3x3 (zwraca null), układ z równaniem kwadratowym.

### 2. Czego brakuje

| typ zadania | sposób | poziom | kiedy się stosuje | przykład z wynikiem | domyślna w szkole? | trudność w silniku |
|---|---|---|---|---|---|---|
| wielomian bez wyrazu wolnego | wyłączanie x (lub xᵏ) przed nawias, potem reszta | P | a_k=0 dla najniższych potęg | x³−3x²+2x=0 → x(x−1)(x−2): 0, 1, 2 | TAK; dziś błąd „Jeszcze tego nie rozwiążę” | mała: dopisać wyłączenie przed nawias w solveDegree (jest w kwadratowym) |
| wielomian 3-4 st., wyrazy parami | grupowanie wyrazów | P | cztery wyrazy, współczynniki w proporcji (a/b=c/d) | x³−2x²−x+2=0 → x²(x−2)−(x−2)=(x−2)(x−1)(x+1): −1, 1, 2 | TAK; apka idzie Hornerem | średnia: wykryć grupowanie, kroki jak w zeszycie |
| wielomian dwumianowy xⁿ±aⁿ | wzory skróconego mnożenia: różnica/suma kwadratów, sześcianów | P | xⁿ=a, n=2,3,4 z a doskonałą potęgą | x³+8=0 → (x+2)(x²−2x+4): x=−2; x⁴−16=(x²−4)(x²+4): ±2 | TAK; apka Hornerem + delta ujemna | mała: jest „różnica kwadratów” w factorize, dodać do solveDegree |
| dwukwadratowe i trójmianowe w xᵏ | podstawienie t=xᵏ (t=x², x³, x⁴) | P/R | ax^{2k}+bx^k+c=0 | x⁴−5x²+4=0: t²−5t+4=0, t=1 lub 4: x=±1, ±2; x⁶−7x³−8=0: t=8 lub −1: x=2, −1 | TAK; apka Hornerem (dla x⁶ nic) | średnia: podstawienie, wynik, powrót; t<0 odrzuca dla parzystych |
| wykładnicze kwadratowe | podstawienie t=aˣ, t>0 | R | 4ˣ−3·2ˣ+2, 9ˣ−4·3ˣ−45 | 4ˣ−3·2ˣ+2=0: t=2ˣ>0, t=1 lub 2: x=0, 1 | TAK (R); apka: błąd | średnia: ten sam mechanizm t; dopisać warunek t>0 |
| wykładnicze z różnymi wykładnikami | wyłączenie aˣ przed nawias | P/R | 3^(x+1)−3^x, 2^(x+2)+2^x | 3^(x+1)−3^x=18 → 3ˣ(3−1)=18, 3ˣ=9: x=2 | TAK; apka: błąd | średnia: rozbić a^(x+k)=aᵏ·aˣ i zebrać |
| trygonometryczne kwadratowe i jedna funkcja | podstawienie t=sin x (lub cos x), |t|≤1 | R | a·sin²x+b·sin x+c=0; jedynka trygonometryczna | 2sin²x−sin x−1=0: t=1 lub −1/2: x=π/2+2kπ, −π/6+2kπ, 7π/6+2kπ | TAK (R); apka: błąd | średnia: t jak wyżej, potem solveTrig na każde t |
| trygonometryczne sin x=cos x | dzielenie przez cos x → tg; lub wzór sin a=sin b | R | sin x=cos x, sin x=sin 2x | sin x=cos x → tg x=1: x=π/4+kπ | TAK; apka: błąd | mała do średniej: dwa wzory na sin a=sin b / cos a=cos b |
| |A|=|B| | podniesienie do kwadratu lub rozbicie na dwa równania A=B, A=−B | P | obie strony z modułem | |x−1|=|x+2| → (x−1)²=(x+2)² → x=−1/2 | TAK; apka: błąd | mała: A=B lub A=−B, reszta w liniowym |
| kilka wartości bezwzględnych | przedziały (punkty zerowe), znaki w każdym przedziale, sprawdzenie | R | |A|+|B|=c, |A|−|B|<c | |x−1|+|x+2|=5: x<−2: −2x−1=5, x=−3; [−2,1): 3=5 sprzeczne; ≥1: 2x+1=5, x=2; odp. −3, 2 | TAK (R); apka: błąd | duża: system przedziałów, scalanie wyniku; dla nierówności też |
| nierówność wielomianowa st. ≥3 | rozkład na czynniki + siatka znaków (wężyk) | P/R | wielomian rozkładalny na czynniki liniowe/kwadratowe ujemnej delty | (x−1)(x−2)(x+3)>0 → x∈(−3,1)∪(2,∞); x³−6x²+11x−6>0 → (1,2)∪(3,∞) | TAK; apka: błąd | średnia: miejsca zerowe z solveDegree + wężyk; krotności (parzysta: odbicie), bezpiecznik jest |
| nierówność wymierna | przeniesienie na jedną stronę, wspólny mianownik, iloczyn zamiast ilorazu, wężyk, wyrzucenie z dziedziny | P/R | f/g ⋛ 0 po sprowadzeniu | 1/x<2 → (1−2x)/x<0 → x∈(−∞,0)∪(1/2,∞); (x−1)/(x+2)>0 → (−∞,−2)∪(1,∞) | TAK; apka: błąd | średnia: ten sam wężyk co wyżej, ostre/nieostre w mianowniku |
| nierówności wykładnicze | zapis jako potęgi tej samej podstawy, porównanie wykładników (zwrot zależy od a>1 lub 0<a<1) | P/R | aᶠ ⋛ aᵍ | 2ˣ>8 → x>3; (1/2)ˣ>8 → x<−3 | TAK; apka: błąd | mała: istnieje solveExpLog, dodać odwrócenie znaku dla a<1 |
| nierówności logarytmiczne | dziedzina, porównanie argumentów, odwrócenie dla 0<a<1, część wspólna z dziedziną | R | logₐ f ⋛ logₐ g lub z liczbą | log₂x>3 → x>8; log₂(x−1)<3 → 1<x<9 | TAK (R); apka: błąd | średnia: dziedzina + przecięcie przedziałów |
| nierówność z pierwiastkiem | √A<B: A≥0, B>0, A<B²; √A>B: dwa przypadki (B<0 lub B≥0, A>B²) | R | | √x<3 → x∈⟨0,9); √(x+3)>x−3 → ⟨−3,6) | TAK (R); apka: błąd | średnia do dużej: rozbicie na przypadki i część wspólna |
| równanie z dwoma pierwiastkami | izolacja jednego, kwadrat, powtórzenie | R | √A+√B=c | √x+√(x+1)=3 → √(x+1)=3−√x, x+1=9−6√x+x, √x=4/3, x=16/9 | TAK (R); apka: błąd | średnia: dwa przejścia, sprawdzenie |
| równanie wymierne z sumą ułamków | wspólny mianownik (NWW), mnożenie przez NWW, redukcja; potem dziedzina | P/R | suma dwóch ułamków po jednej stronie | x/(x−1)+1/(x+1)=1 → x(x+1)+(x−1)=x²−1 → 2x=0, x=0 | TAK; apka: błąd | średnia: wykorzystać fracOf, rozszerzyć o sumę |
| liniowe z ułamkami | mnożenie obu stron przez NWW mianowników na starcie | P | x/2+x/3=5 → 3x+2x=30 → x=6 | TAK; apka redukuje do (5/6)x=5 i mnoży przez 6/5 | mała: krok „Mnożę przez NWW” zamiast mnożenia przez odwrotność; inny sposób, bo uczeń tak robi |
| kwadratowe | dopełnienie do kwadratu | P/R | każdy trójmian (zwłaszcza b parzyste) | x²+4x+1=0 → (x+2)²=3 → x=−2±√3 | częściowo (wzór na postać kanoniczną w P); jako 3. sposób przełącznika | mała: jest postać kanoniczna w vertex(); dodać do methods |
| kwadratowe | postać iloczynowa przez grupowanie 6x²+bx+c lub metoda rozbicia środkowego wyrazu | P | a≠1, pierwiastki wymierne | 2x²−3x−2=0 → 2x²−4x+x−2=(x−2)(2x+1): 2, −1/2 | pół-domyślna (liceum uczy rozbicia) | średnia: szukanie pary |
| układ 2x2 liniowy | wyznaczniki, wzory Cramera (W, Wx, Wy) | R/studia | W≠0 | 2x+3y=7, x−y=1 → W=−5, Wx=−10, Wy=−5: x=2, y=1 | TAK (R: wyznaczniki są w programie) | mała: tylko arytmetyka, w solveSystem są współczynniki |
| układ 2x2 liniowy | metoda graficzna (przecięcie prostych) | P | zawsze | x+y=5, x−y=1 → proste przecinają się w (3,2) | TAK (P: pytanie o przecięcie) | średnia: wykres dwóch prostych, jest canvas wykresów |
| układ 3x3 liniowy | metoda Gaussa (eliminacja, schodkowa); Cramer | R/studia | 3 niewiadome | x+y+z=6, x−y+z=2, x+y−z=0 → (1,2,3) | TAK (R); apka: null | średnia do dużej: eliminacja krok po kroku, przypadki niejednoznaczne/sprzeczne (rząd) |
| układ z równaniem kwadratowym | podstawienie liniowego do kwadratowego | P/R | x+y=7, x²+y²=25 | y=7−x, 2x²−14x+24=0: (3,4) i (4,3) | TAK (R); apka: błąd | średnia: podstawienie + solveQuadratic na jednej zmiennej, dwa rozwiązania |
| układ nieoznaczony i niejednoznaczny | rząd macierzy (Kronecker-Capelli), rozwiązanie z parametrem | studia | liniowe zależne | x+y=2, 2x+2y=4 → nieskończenie wiele: (t, 2−t) | studia | duża: dziś tylko „sprzeczny”, brak przypadku zależnego i parametru |
| równania przestępne | metoda bisekcji lub Newtona (przybliżenie) | studia | brak rozwiązania algebraicznego | x=cos x → x≈0,7391 | studia | duża: wymaga numeryki z krokami |

Liczba wierszy: 25.

### 3. Top 5 dla tego działu

1. **Wyłączanie przed nawias dla wielomianów (x³−x=0, x³−3x²+2x=0)**: dziś zwykła szkolna rzecz kończy się „Jeszcze tego nie rozwiążę”, a poprawka jest mała.
2. **Podstawienie t (dwukwadratowe x⁴−5x²+4, x⁶−7x³−8, 4ˣ−3·2ˣ+2, 2sin²x−sin x−1)**: jeden mechanizm domyka cztery typy, w szkole to droga domyślna, a apka daje Horner albo błąd.
3. **Nierówności wielomianowe i wymierne z siatką znaków (wężykiem)**: bardzo częste na maturze (P i R), dziś w ogóle brak, a miejsca zerowe silnik już liczy.
4. **Rozkład wielomianu: wzory skróconego mnożenia i grupowanie** (zamiast Hornera): w szkole droga domyślna, mała do średniej trudność, lepiej uczy niż bezmyślne dzielniki.
5. **Układ 3x3 (Gauss) i wyznaczniki Cramera dla 2x2 jako druga metoda w przełączniku**: Cramer prawie za darmo, Gauss domyka lukę „null” i jest rdzeniem algebry na studiach.

Pozostałe wygrane po drodze: |A|=|B| (mała), nierówności wykładnicze (mała), liniowe z NWW na starcie (mała).

---

<!-- dział: analiza -->
### Katalog sposobów: pochodne i całki

### 1. Co jest dziś
Brak przełącznika `explain.methods` w tym dziale: silnik wybiera jedną drogę. Sprawdzone uruchomieniem `S.run(...)` (js/math-calculus.js).

Pochodne (`dExpr`/`dTerm`/`dFactor`/`chain`):
- suma: pochodna każdego wyrazu (tablica pochodnych, wzór potęgi), stała przed pochodną;
- iloczyn: wzór (uv)' (`Rozpoznaję iloczyn` -> `Wstawiam do wzoru`);
- iloraz: wzór (u/v)' (`Rozpoznaję iloraz`); potęga ujemna w iloczynie też trafia tu;
- funkcja złożona: `Liczę pochodną złożoną` + `Mnożę przez pochodną środka` (sin, cos, tg, ctg, ln, log, logb, arcsin, arccos, arctg, e^u, a^u, (u)^n);
- NIE ma: pochodnej funkcji x^x i f(x)^g(x) (rzuca NotSupported), z definicji, logarytmicznej, parametrycznej/uwikłanej, sh/ch.

Całki (`integCore`, kolejność prób: tablica, podstawienie, ułamki, części, rozwinięcie):
- suma całek, stała przed całkę, wymnożenie nawiasów;
- tablica: potęga, 1/x, e^x, a^x, sin, cos, tg, ctg, 1/cos², 1/sin², sin², cos², tg², sqrt(k-x²), 1/sqrt(1-x²), 1/sqrt(x²+a);
- podstawienie t = g(x), gdy g' jest w całce (kandydaci z wnętrza funkcji, nawiasów, wykładników);
- ułamki wymierne: dzielenie wielomianów, mianownik z dwoma pierwiastkami (A, B przez wstawianie pierwiastków), kwadrat, Delta < 0 (dopełnienie do kwadratu, arctg);
- przez części (x^n·e^x, x·sin x, ln x, x^n·ln x ...);
- oznaczona: F(b) − F(a) (Newton-Leibniz); zawsze krok `Sprawdzenie` (pochodna wyniku = funkcja podcałkowa).
- Nie działają (sprawdzone, brak kroków): sin³x, sin⁴x, 1/(x(x+1)²), 1/(x³+x), 1/(x²+1)², e^x·sin x, 1/sin x, 1/(1+cos x), x·sqrt(x+1), sin(2x)·cos x.

### 2. Czego brakuje

| typ zadania | sposób | poziom | kiedy się stosuje | przykład z wynikiem | domyślna w szkole? | trudność w silniku |
|---|---|---|---|---|---|---|
| pochodna | z definicji (granica ilorazu różnicowego) | P/R/studia | zawsze; pokazuje skąd wzór; zadania "oblicz z definicji" | f=x², f'(a)=lim (x²−a²)/(x−a)=lim (x+a)=2a | tak, gdy polecenie mówi "z definicji" | średnia: rozwiń f(x+h)−f(x), skróć h, granica h->0 (jest silnik granic) |
| pochodna | logarytmiczna | studia (R: x^x) | f(x)^g(x) lub długi iloczyn/iloraz potęg | (x^x)'=x^x(ln x+1) | tak, jedyna droga dla x^x | średnia: ln obu stron, (ln f)'=f'/f, powrót; obecnie wyjątek NotSupported |
| pochodna | uproszczenie przed różniczkowaniem | P/R | iloraz, w którym licznik dzieli się przez mianownik, lub wzór skróconego mnożenia | ((x²−1)/(x−1))'=(x+1)'=1 | tak, nauczyciel pyta "czy da się uprościć" | mała: skróć wielomiany (jest dzielenie z całek) i wywołaj dExpr |
| pochodna | iloraz jako iloczyn z potęgą −1 | R/studia | gdy mianownik prosty (x^n, a^x), unika wzoru na iloraz | (sin x/x)'=(sin x·x⁻¹)'=cos x/x − sin x/x² | nie (szkoła: wzór ilorazu); studia często | mała: zapis f·g⁻¹ i wzór iloczynu |
| pochodna | funkcje hiperboliczne i ich odwrotności | studia | sh, ch, th w zadaniach z analizy | (sh x·ch x)'=ch²x+sh²x=ch 2x | nie | mała do średniej: nowe wiersze tablicy |
| pochodna | uwikłana i parametryczna | R/studia | F(x,y)=0 lub x(t), y(t) | x²+y²=1: y'=−x/y | R tylko ewentualnie | duża: nowy typ wejścia, zmienna zależna |
| całka | podstawienie dla potęg trygonometrycznych nieparzystych (sin³x = sin x(1−cos²x)) | R/studia | sin^n lub cos^n, n nieparzyste | ∫sin³x dx = −cos x + cos³x/3 + C | tak (R) | średnia: wydziel jeden czynnik, tożsamość 1, podstawienie t = cos x (jest) |
| całka | wzory redukcyjne / obniżanie stopnia dla parzystych potęg | R/studia | sin⁴x, cos⁴x, sin²x·cos²x | ∫sin⁴x dx = 3x/8 − sin2x/4 + sin4x/32 + C | tak (R) | średnia: wielokrotne cos 2x, tożsamość już jest dla n=2 |
| całka | iloczyn funkcji trygonometrycznych -> suma (wzory na sin·cos) | R/studia | sin ax·cos bx, sin ax·sin bx | ∫sin2x·cos x dx = −cos3x/6 − cos x/2 + C | tak | mała do średniej: tożsamość i dwie całki z tablicy |
| całka | podstawienie, gdy w całce zostaje x (x = t − a) | R/studia | x·sqrt(x+1), x/(x+1)³ | ∫x√(x+1) dx = (2/5)(x+1)^(5/2) − (2/3)(x+1)^(3/2) + C | tak (R) | średnia: podstaw x = t−1, wymnóż, całka sumy; obecna `substitution` wymaga g' w całce |
| całka | ułamki proste: mianownik z pierwiastkiem wielokrotnym i 3+ czynniki | R/studia | 1/(x(x+1)²), 1/(x³+x) | ∫dx/(x(x+1)²) = ln\|x\| − ln\|x+1\| + 1/(x+1) + C | tak | duża: układ równań na A, B, C (metoda współczynników), obecnie tylko 2 pierwiastki |
| całka | ułamki proste przez porównanie współczynników (zamiast wstawiania pierwiastków) | R/studia | mianownik z czynnikiem nierozkładalnym | 1/(x³+x)=1/x − x/(x²+1) | tak, jedna z dwóch dróg | średnia: wspólne dla wielu zadań, układ liniowy |
| całka | licznik jako pochodna mianownika (ln\|g\|) i rozbicie (2x+3)/(x²+3x+1) | P/R | licznik = c·g' + stała | ∫(2x+3)/(x²+3x+5) dx = ln(x²+3x+5) + C | tak (rozpoznanie pochodnej wewnętrznej) | mała: dziś zadziała przez podstawienie, ale bez nazwy "rozpoznaję pochodną" i bez rozbicia na ln + arctg |
| całka | przez części z zapętleniem | studia | e^x·sin x, sin x·cos 2x | ∫e^x sin x dx = e^x(sin x − cos x)/2 + C | tak (studia) | średnia: wykryć powtórzenie całki, rozwiązać równanie na I |
| całka | podstawienia trygonometryczne | studia | sqrt(a²−x²), sqrt(a²+x²), sqrt(x²−a²) z innym środkiem | ∫dx/(x²+1)² = x/(2(x²+1)) + arctg(x)/2 + C | tak (studia) | duża: podstawienie x = a·sin t, wracanie przez trójkąt |
| całka | całka z 1/(x²+a²)^n przez wzór rekurencyjny | studia | n ≥ 2 | j.w., n=2 | tak | średnia: jeden wzór redukcyjny |
| całka | podstawienie uniwersalne t = tg(x/2) | studia | wymierna funkcja sin, cos: 1/(1+cos x), 1/sin x | ∫dx/sin x = ln\|tg(x/2)\| + C | tak (ostatnia deska) | średnia: wzory sin = 2t/(1+t²), potem ułamki proste |
| całka | podstawienia Eulera | studia | sqrt(ax²+bx+c) w mianowniku | ∫dx/sqrt(x²+1) = ln(x+sqrt(x²+1)) + C | rzadko, studia | duża: algebra na pierwiastku, potem ułamki |
| całka | całkowanie przez rozpoznanie pochodnej wewnętrznej (f'/f, f'·f^n, bez nazwy t) | P/R | całka wprost z postaci g'(x)·F(g(x)) | ∫2x·cos(x²) dx = sin(x²) + C | tak: uczniowie zapisują bez t | mała: silnik już podstawia t, tylko inny zapis kroku; ma wartość dydaktyczną niewielką |
| całka oznaczona | zmiana granic przy podstawieniu (bez powrotu do x) | R/studia | całka oznaczona z podstawieniem | ∫₀¹ 2x·e^(x²) dx: t=x², [e^t]₀¹ = e − 1 | tak (R) | mała do średniej: dziś robi powrót do x |
| całka oznaczona | pole z symetrii (funkcja parzysta/nieparzysta) | R/studia | granice −a..a | ∫₋₂² x³ dx = 0 | tak, jeśli widać | mała: sprawdź parzystość, skróć |
| całka | tożsamości trygonometryczne przed całkowaniem (1+cos 2x, 1/(1+cos x)=1/(2cos²(x/2))) | R | wyrażenia z 1 ± cos x | ∫dx/(1+cos x) = tg(x/2) + C | tak | mała do średniej |
| całka | całkowanie niewłaściwe (granica z całki) | studia | granica nieskończona/osobliwość | ∫₁^∞ dx/x² = 1 | tak | duża: łączy całki z granicami |
| całka | sprawdzenie przez różniczkowanie | P/R/studia | zawsze | (x³/3)' = x² | tak | jest już (krok `Sprawdzenie`); brak tylko pokazanych kroków pochodnej |

Wiersze: 25.

### 3. Top 5 dla tego działu
1. Pochodna z definicji (iloraz różnicowy): to osobny, częsty typ zadania w liceum rozszerzonym i na 1. roku, a silnik granic już istnieje.
2. Całki z potęg trygonometrycznych (sin³x, sin⁴x) i iloczyn sin·cos -> suma: dziś brak kroków, a to rutyna R i kolokwiów, średni koszt.
3. Podstawienie z pozostałym x (x·sqrt(x+1)): klasyk R, całka dziś wcale nie działa, a koszt średni.
4. Pochodna logarytmiczna (x^x): jedyna droga dla tego typu, dziś błąd; reguła jest krótka.
5. Ułamki proste z czynnikiem wielokrotnym i trzema czynnikami (współczynniki nieoznaczone): najczęstsza porażka silnika na studiach, ale koszt duży, więc dopiero na końcu.

---

<!-- dział: reszta -->
### Katalog sposobów: dział RESZTA (ułamki, kolejność działań, upraszczanie, pierwiastki, rozkład, NWD/NWW, procenty, funkcja kwadratowa)

Sprawdzone silnikiem (`S.run`) i w kodzie `js/math-steps.js` (factorize ~1466, arithmetic ~1712, gcdLcm ~1826, vertex ~1857, percentSteps ~1883).

### 1. Co jest dziś

- **Ułamki + − (kroki)**: wspólny mianownik = NWW mianowników („Sprowadzam do wspólnego mianownika 12”, rozszerzanie widoczne), dodaję liczniki, skracam. Bez przełącznika.
- **Ułamki · i : (kroki)**: mnożę liczniki i mianowniki; dzielenie przez mnożenie przez odwrotność. Bez przełącznika. Ułamek dziesiętny + zwykły działa (0,25+1/3 = 7/12).
- **Kolejność działań**: kroki „Najpierw nawias → Mnożę → Dzielę → Odejmuję”, potęgi. Jedna droga.
- **Pierwiastki**: „Wyciągam kwadrat spod pierwiastka” (√72 = 6√2), dodawanie pierwiastków podobnych (√8+√18 = 5√2), usuwanie niewymierności (3/√2, 1/(√3−1) przez sprzężenie). Jedna droga.
- **Upraszczanie wyrażeń**: opuszczanie nawiasów, kwadrat sumy, redukcja wyrazów podobnych ((a+b)³ działa). Ułamki algebraiczne ((x²−4)/(x+2)): „Jeszcze tego nie rozwiążę”.
- **Rozkład („rozłóż”)**: wyłączanie wspólnego czynnika; różnica kwadratów tylko dla x² − k² (współczynnik 1); trójmian = **delta → miejsca zerowe → postać iloczynowa**; wielomiany stopnia ≥3 = szukanie pierwiastka wymiernego + deflacja (x³−1, x³+8, x⁴−16, x⁴−5x²+4 idą tą samą drogą „miejsca zerowe”). Wielomiany wielu zmiennych: „bez zmian” (a²−b², ax+ay+bx+by). Liczba całkowita: `rozłóż 84` zwraca 84 bez kroków. Przełącznika brak.
- **NWD / NWW**: jedna droga, rozkład na czynniki pierwsze (min/max potęg), bezpiecznik Euklidesem w tle (niewidoczny). Bez przełącznika.
- **Procenty**: P% z B (procent → ułamek → mnożę), B ± P% (liczę część, dodaję/odejmuję), „ile procent A z B” (ułamek · 100%). Jedna droga każdy.
- **Wierzchołek**: tylko wzór p = −b/2a, q = f(p), potem postać kanoniczna. Bez przełącznika.
- **Równanie kwadratowe** (poza działem, ale dotyczy trójmianu): przełącznik „Delta” / „Suma i iloczyn” — istnieje tylko w `rozwiąż`, nie w `rozłóż`.

### 2. Czego brakuje

| typ zadania | sposób | poziom | kiedy się stosuje | przykład z wynikiem | czy w szkole „domyślna”? | trudność w silniku |
|---|---|---|---|---|---|---|
| liczba całkowita | rozkład na czynniki pierwsze (komenda `rozłóż 84`) | P | zawsze, n ≥ 2 | 84 = 2² · 3 · 7 | TAK; apka zwraca „84” bez kroków | mała: `primeFactors` już jest w gcdLcm, dopisać gałąź w factorize + zapis z potęgami |
| trójmian x²+bx+c | Viète („dwie liczby o sumie −b i iloczynie c”) w `rozłóż`, z przełącznikiem Delta / Suma i iloczyn | P/R | a = 1, c ma mało dzielników całkowitych; Δ kwadrat liczby | x²−5x+6 = (x−2)(x−3), bo −2−3 = −5, (−2)(−3) = 6 | TAK dla a=1 (dla a≠1 delta); apka idzie deltą | mała: kod „Suma i iloczyn” jest w solveQuadratic (~1106), przepiąć do factorize jako `methods` |
| trójmian ax²+bx+c, a≠1 | grupowanie / rozbicie środkowego wyrazu | P/R | szukam p+q = b, p·q = a·c (całkowite) | 2x²+7x+3 = 2x²+6x+x+3 = 2x(x+3)+(x+3) = (2x+1)(x+3) | często (starsze podręczniki, korepetycje); apka daje 2(x+1/2)(x+3), czyli nie ten zapis | średnia: wyszukiwanie pary + dwa wyłączenia + przepisanie na (2x+1) |
| dwumian a²x²−b² (a≠1) i wielu zmiennych | wzór a²−b² = (a−b)(a+b) z a = 2x | P | oba wyrazy to kwadraty (też z literami) | 4x²−9 = (2x−3)(2x+3); a²−b² = (a−b)(a+b) | TAK, domyślna; apka: 4(x−3/2)(x+3/2) przez miejsca zerowe, a dla a²−b² „bez zmian” | średnia: wykrycie kwadratów z współczynnikami i literami, rozkład wielu zmiennych |
| trójmian-kwadrat | wzór (a±b)² czytany wstecz | P | pierwszy i ostatni wyraz kwadraty, środek = ±2ab | 4x²+12x+9 = (2x+3)² | TAK; apka: delta = 0, zapis 4(x+3/2)² | mała: warunek przy wzorze skróconego mnożenia |
| suma / różnica sześcianów | a³±b³ = (a±b)(a²∓ab+b²) | P/R | dwa sześciany | x³+8 = (x+2)(x²−2x+4) | TAK (tablice); apka: miejsce zerowe −2 + dzielenie | mała: wykrycie sześcianów + gotowy wzór |
| wielomian z 4 wyrazami | grupowanie wyrazów (po dwa) | P/R | para par ze wspólnym czynnikiem | x³+2x²−9x−18 = x²(x+2)−9(x+2) = (x+2)(x−3)(x+3); ax+ay+bx+by = (a+b)(x+y) | TAK dla stopnia 3 z „ładnymi” współczynnikami; apka: pierwiastki lub „bez zmian” | średnia: sprawdzanie podziałów na pary, rozkład wielu zmiennych |
| wielomian dwukwadratowy | podstawienie t = x² | R | postać ax⁴+bx²+c | x⁴−5x²+4: t²−5t+4 = (t−1)(t−4) = (x²−1)(x²−4) = (x−1)(x+1)(x−2)(x+2) | TAK; apka: pierwiastki wymierne jeden po drugim | mała-średnia: wykrycie postaci + rozkład w t i powrót |
| ułamek algebraiczny | skracanie: rozkład licznika i mianownika + dziedzina | P/R | licznik i mianownik się rozkładają | (x²−4)/(x+2) = (x−2)(x+2)/(x+2) = x−2, x ≠ −2 | TAK; apka: „Jeszcze tego nie rozwiążę” | średnia: factorize jest, brak węzła ułamka w simplify + dziedzina |
| ułamki zwykłe + − | iloczyn mianowników (bez szukania NWW) + skrócenie na końcu | P | zawsze (mianowniki względnie pierwsze: to samo co NWW) | 1/6+1/4 = (4+6)/24 = 10/24 = 5/12 | NIE (domyślnie NWW), ale to droga słabszego ucznia i krok „skracam” jest wtedy widoczny | mała: dodać `methods` obok istniejącego rozszerzania |
| liczby mieszane | zamiana na niewłaściwe LUB osobno całości i ułamki | P | zapis „1 1/2” | 1 1/2 + 2 1/3 = 3/2+7/3 = 9/6+14/6 = 23/6 = 3 5/6; albo 3 + (1/2+1/3) = 3 5/6 | TAK (klasa 5–6); apka: brak wyniku, zapis nie jest rozpoznany | średnia: parser („1 1/2”, spacja) + wynik jako liczba mieszana |
| NWD | algorytm Euklidesa (reszty z dzielenia) | P/R/studia | zawsze; konieczne przy dużych liczbach | NWD(48,36): 48 = 1·36+12; 36 = 3·12+0 → 12 | R/studia TAK; w P rozkład; apka pokazuje tylko czynniki | mała: `gcd` jest, dopisać kroki; `methods` „Czynniki pierwsze”/„Euklides” |
| NWW | NWW = a·b / NWD | P/R | dwie liczby (dla trzech i więcej iteracyjnie) | NWW(12,18) = 12·18/6 = 36 | TAK w LO (po Euklidesie); apka: max potęg | mała: po NWD jedno dzielenie |
| NWD (studia) | rozszerzony Euklides: NWD = s·a + t·b | studia | algebra 1. roku, odwrotność modulo | NWD(48,36)=12 = 1·48 − 1·36 | NIE (studia) | średnia: tabela współczynników wstecz |
| procent z liczby | proporcja (krzyżowo) | P | zawsze | 20% z 150: 100%–150, 20%–x, x = 20·150/100 = 30 | TAK (gimnazjum/podstawówka), często pierwsza; apka: procent → ułamek | mała: trzy kroki, `methods` |
| zmiana o procent | mnożnik (1 ± p) | P/R | B ± P% | 150+20% = 150·1,2 = 180; 150−20% = 150·0,8 = 120 | TAK w LO (potem na potęgach przy procencie składanym); apka: liczy część i dodaje | mała: nowy ciąg 2 kroków |
| ile procent | proporcja: A to x% z B | P | zawsze | 30 z 150: 150–100%, 30–x, x = 30·100/150 = 20% | TAK; apka: ułamek · 100% | mała |
| zmiana procentowa | (nowa − stara)/stara · 100% (wzrost/spadek) | P/R | dwie wartości, „o ile procent wzrosła/zmalała” | z 150 do 180: (180−150)/150 = 0,2 = 20% | TAK; apka: brak wzorca wejścia | mała-średnia: nowy regex wejścia + zdanie wyniku |
| procent odwrotny | równanie z mnożnikiem: x·(1 ± p) = K | P/R | znamy cenę po zmianie | po podwyżce o 20% jest 180; x·1,2 = 180, x = 150 (lub 120%–180, 100%–x) | TAK (zadanie tekstowe z matury); apka: brak | średnia: parsowanie zadania, brak formatu wejścia |
| procent składany | K·(1 ± p)ⁿ | P/R | stałe oprocentowanie przez n okresów | 1000 zł, 5%, 3 lata: 1000·1,05³ = 1157,625 ≈ 1157,63 | TAK (R); apka liczy 1000*1,05^3 bez opisanej drogi | średnia: nowy wzorzec wejścia; mnożenie i potęga już działają |
| wierzchołek | dopełnienie do kwadratu | P/R/studia | zawsze; ważne dla całek i krzywych | x²−4x+3 = (x²−4x+4)−4+3 = (x−2)²−1, W = (2, −1) | część klas i na studiach; w LO domyślnie wzory p,q; apka: tylko wzory | średnia: kroki (wyciągnij a, połowa b, dodaj i odejmij kwadrat) |
| wierzchołek | średnia miejsc zerowych p = (x₁+x₂)/2 | P/R | Δ ≥ 0 (czytelnie, gdy pierwiastki wymierne) | x²−5x+6: x₁=2, x₂=3, p = 5/2, q = f(5/2) = −1/4 | TAK jako skrót (symetria względem osi); apka nie pokazuje | mała: solveQuadratic jest, dodać `methods` |
| wierzchołek | z pochodnej f′(x) = 2ax+b = 0 | R/studia | zawsze | x²−4x+3: f′ = 2x−4 = 0, x = 2, q = −1 | NIE w liceum, TAK na studiach; wynik ten sam co wzory, droga inna | mała: pochodna wielomianu już w math-calculus |
| pierwiastek | rozkład liczby podpierwiastkowej na czynniki pierwsze | P | dla dużych liczb (√72) | √72 = √(2³·3²) = 3·2√2 = 6√2 | równorzędna z „największym kwadratem”, uczniowie często tak liczą; apka: największy kwadrat | mała: `primeFactors` gotowe |

Wiersze w tabeli: 24.

Uwagi pomocnicze: apka ma wzory skróconego mnożenia w `uprość` (kwadrat sumy, sześcian sumy), ale nie czyta ich wstecz w `rozłóż` poza x²−k²; `uprość 4x^2+12x+9` zwraca bez zmian (to poprawne, to nie uproszczenie).

### 3. Top 5 dla tego działu

1. Rozkład trójmianu przez Viète / grupowanie w `rozłóż` — najczęstsze zadanie z liceum, szkolna droga, kod „Suma i iloczyn” już jest w `rozwiąż`.
2. Wzory skróconego mnożenia czytane wstecz w `rozłóż` (a²−b² z a≠1 i z literami, (a±b)², a³±b³) — domyślna droga w szkole, apka daje obejście przez pierwiastki lub „bez zmian”.
3. `rozłóż 84` na czynniki pierwsze — dziś zero kroków, `primeFactors` już istnieje (najtańszy zysk).
4. Procenty: proporcja i mnożnik (1 ± p) jako `methods` oraz zmiana procentowa/procent odwrotny — to dwie szkolne drogi, których apka nie pokazuje.
5. NWD przez Euklidesa + NWW = ab/NWD jako przełącznik z czynnikami pierwszymi — mało kodu, ważne w LO i na studiach.
