# Raport E: kroki „reszta” po zmianie podkreślenia na kolor

Źródło: `kroki-reszta.json` (40 zadań, indeksy od 0). Perspektywa: słaby uczeń (liceum / 1. rok).
Rachunki sprawdziłem ręcznie: **nie znalazłem błędu liczbowego w żadnym wyniku**. Wszystkie problemy dotyczą tego, czy da się nadążyć.

## 1. Podsumowanie

- **Duble są systemowe, nie pojedyncze.** W prawie każdym kroku z dymkiem `why` mówi prawie to samo co `dymek.why` (13 szablonów, ok. 30 miejsc). Przy kolorze widać to bardziej: uczeń czyta zdanie, stuka w kolor i dostaje to samo zdanie drugi raz. Reguła: `why` mówi, **co robimy z tymi liczbami**, a dymek mówi, **jak działa wzór**.
- **Nazwy f/g w pochodnej iloczynu i ilorazu kłócą się z `f(x)`** (zad. 7, 17, 31, 32). „f(x) = x³·sin(x)”, a krok dalej „f = x³”. Najpoważniejszy problem z tej paczki. Trzeba przejść na u/v.
- **Kolor często obejmuje gołą literę wzoru** („⟦f′·g + f·g′⟧”, „⟦u·v − ∫v du⟧”), a nie miejsce, w którym wzór naprawdę użyto. Wtedy ten sam wzór stoi w `math` i w dymku. Kolor powinien leżeć na podstawionej postaci.
- **Brakuje ostatnich rachunków**, czyli dokładnie tego, na czym słaby uczeń się gubi: 25 − 24 w delcie, −(−5) = 5, −cos(π) = 1, 5·3 = 15, upraszczanie licznika ilorazu, A i B w ułamkach prostych, minus razy minus w całce przez części, złożenie wyniku po całkowaniu przez części.
- **Równania nietypowe idą okrężną drogą.** `5 = 2x − 7` daje −2x = −7 − 5 (dwa minusy), `x/2 + 1 = 3` przechodzi przez sztuczny krok (1/2)x i dzielenie przez 1/2, w `x² − 3x = 0` jest martwy krok „współczynniki” i brakuje `x − 3 = 0`.
- **Wspólny mianownik i miejsca zerowe spadają z nieba** (zad. 5, 16, 39 i 4): nie widać, skąd 6 czy 12 ani skąd 2 i 3.

## 2. Duble

### D1. `why` = `dymek.why` (wzorzec, ten sam tekst w obu miejscach)

| Szablon kroku | `why` teraz | Dymek mówi | Miejsca (zad./krok) | Propozycja nowego `why` (dymek zostaje) |
|---|---|---|---|---|
| Liczę deltę | „Delta mówi, ile jest rozwiązań: dodatnia daje dwa, zero jedno, ujemna żadnego.” | to samo | 1/2, 2/3, 12/2, 14/2 | „Wstawiam a, b, c do wzoru na deltę.” Liczbę rozwiązań powiedzieć w następnym kroku („Δ = 1 > 0, więc są dwa rozwiązania”). |
| Liczę dwa rozwiązania | „…Wstawiamy −b, √Δ i 2a do wzoru.” | „wstawiamy −b, √Δ i 2a do wzorów” | 1/4, 2/5, 14/4 | „Δ > 0, więc są dwa rozwiązania: raz odejmuję √Δ, raz dodaję.” Z dymku usunąć zdanie „Delta jest dodatnia, więc…”. |
| Liczę jedno rozwiązanie | „oba wzory dają tę samą liczbę” | to samo | 12/3 | „Δ = 0, więc √Δ = 0 i zostaje tylko −b przez 2a.” |
| Pochodna potęgi | „Wykładnik schodzi przed zmienną, a potęga maleje o 1.” | „Wykładnik schodzi przed x, a nowy wykładnik jest o 1 mniejszy” | 7/2, 8/2, 17/2, 18/2, 29/1, 30/2, 31/2 | Konkretnie dla zadania, np. „Tu n = 3: trójka schodzi, zostaje x².” Przy okazji „potęga maleje” zmienić na „wykładnik maleje”. |
| Tablica pochodnych | „To pochodna podstawowej funkcji, którą znamy na pamięć. Stuknij…” | „Tę pochodną znamy na pamięć z tablicy…” | 7/3, 31/3 | „Pochodna sinusa to cosinus, z tablicy.” Zdanie „Stuknij kolorowy fragment…” wystarczy raz (pierwszy dymek w rozwiązaniu) albo wcale. |
| Pochodna złożona | „Funkcja w funkcji: pochodna zewnętrznej, ze środkiem bez zmian, razy pochodna środka.” | to samo innymi słowami | 18/1, 28/1, 33/1 | Nazwać części: „Zewnątrz jest sin, w środku x². Liczę cos(x²) i mnożę przez (x²)′.” |
| Przez części | Krok 1 why: „Pod całką jest iloczyn. Jeden czynnik różniczkuję (u), drugi całkuję (dv)…” | dymek kroku 2: „Pod całką jest iloczyn. Jedną część (u) różniczkujemy…” | 9/1 i 9/2, 36/1 i 36/2, 37/1 i 37/2 | Krok 1 why ma mówić, **dlaczego taki wybór**: „Za u biorę x, bo jego pochodna to 1 i x znika.” (w 36: „Za u biorę ln(x), bo łatwo go zróżniczkować, a trudno scałkować.”) |
| Tablica całek | „To całka z tablicy: szukamy funkcji, której pochodna daje…” | to samo | 9/3, 34/1, 37/4 | „Pochodna −cos(x) to sin(x), więc całka z sin(x) to −cos(x).” |
| Całka potęgi | „Podnoszę wykładnik o 1 i dzielę przez nowy wykładnik…” | to samo | 10/1, 36/4, 38/3 | „Tu n = 2: wykładnik 3, dzielę przez 3.” |
| Newton-Leibniz | „wynik całki na górnej granicy minus wynik na dolnej” | „Wstawiamy górną granicę b, potem dolną a i odejmujemy.” | 10/3, 34/3 | „Wstawiam 1 i 0 do x³/3 i odejmuję.” |
| Kwadrat sin/cos | „Kwadratu funkcji trygonometrycznej nie całkujemy wprost…” | „Kwadratu sinusa nie umiemy scałkować wprost…” | 20/1, 21/1 | „Po zamianie zostają dwie łatwe całki: z 1/2 i z cos(2x).” |
| Kwadrat sumy | „Kwadrat nawiasu to nawias razy nawias…” | identyczne słowo w słowo | 3/1 | zob. K1 |
| Różnica kwadratów | „Różnicę dwóch kwadratów od razu zapisujemy jako iloczyn…” | identyczne | 13/1, 27/2 | „9 = 3², więc a = x, b = 3.” (w 27: „1 = 1², więc b = 1.”) |

### D2. `why` powtarza etykietę

- **26 / krok 2**: etykieta „Nie ma wyrazu wolnego, więc wyłączam x przed nawias”, why „Każdy wyraz ma niewiadomą, więc wyłączam ją przed nawias.” Propozycja: etykieta „Wyłączam x przed nawias”, why „Oba wyrazy mają x: x² = x·x, 3x = 3·x.”
- **26 / krok 3**: etykieta „Iloczyn jest zerem, gdy zeruje się któryś czynnik”, why „Iloczyn jest zerem tylko wtedy, gdy któryś czynnik jest zerem.” Propozycja: etykieta „Przyrównuję każdy czynnik do zera”, why bez zmian.
- **27 / krok 1**: etykieta „Wyłączam wspólny czynnik przed nawias”, why „Ten sam czynnik jest w każdym wyrazie, więc wyciągam go…” Propozycja: why „x³ = x·x², więc x jest w obu wyrazach.”
- **11 / krok 1**: `math` „√8 = √(4·2) = 2√2”, why „√(4·2) = √4·√2 = 2√2”, czyli ten sam rachunek dwa razy. Propozycja: rachunek przenieść do `math` („√8 = √(4·2) = √4·√2 = 2√2”), why „4 to pełny kwadrat (2·2), więc √4 = 2 wychodzi przed pierwiastek.”

### D3. Kroki mówiące to samo

- **17 / kroki 2 i 3**: oba pokazują „⟦(x)′⟧ = 1”, oba z dymkiem „Pochodna potęgi”, ale etykiety są różne („Liczę pochodną potęgi” i „Liczę pochodną każdego wyrazu”). Uczeń nie wie, który krok to f′, a który g′. Propozycja: „Liczę pochodną licznika: (x)′ = 1” i „Liczę pochodną mianownika: (x + 1)′ = (x)′ + (1)′ = 1 + 0 = 1”.
- **32 / kroki 2 i 3**: dwie identyczne etykiety „Liczę pochodną każdego wyrazu”. Propozycja: „Liczę pochodną licznika” i „Liczę pochodną mianownika”, a w `math` pełna linia: „(x² + 1)′ = ⟦(x²)′⟧ + (1)′ = 2x + 0 = 2x”.
- **6 / kroki 2 i 3**: why „Dalej według kolejności działań.” dwa razy, bez treści. Propozycja: krok 2 „Potęga przed mnożeniem: 7² = 7·7 = 49.”, krok 3 „Zostało tylko mnożenie.”
- **25 / kroki 1 i 3**: „Porządkuję i redukuję wyrazy podobne” i „Redukuję wyrazy podobne”, a w kroku 1 nic się nie redukuje. Zob. R3.
- **Iloczyn i iloraz, krok 1 i dymek kroku 4** (7, 17, 31, 32): krok 1 why „Funkcja to iloczyn dwóch części… Nazywam je f i g” oraz dymek „Funkcja to iloczyn dwóch czynników zależnych od x”. Po zmianie na u/v (P1) why kroku 1 skrócić do „Nazywam części u i v, żeby użyć wzoru.”

## 3. Kolor vs dymek

**K1. 3 / krok 1, kwadrat sumy.** Kolor „⟦x² + x + x + 1⟧” to rachunek „nawias razy nawias”, a dymek pokazuje (a+b)² = a² + 2ab + b². Kolorem nie jest więc żadne miejsce użycia tego wzoru. Propozycja: `math` „(x + 1)² = ⟦x² + 2·x·1 + 1²⟧ = x² + 2x + 1 ⏎ x² + 2x + 1 + 2x”, why „Tu a = x, b = 1.”, a dymek.why o wzorze (bez „nawias razy nawias”). Krok 2 da wtedy x² + 4x + 1 (rachunek się zgadza).

**K2. Kolor na gołym wzorze zamiast na podstawieniu (wzorzec).**
- 7/4 i 31/4: „⟦f′ · g + f · g′⟧ = 3x²·sin(x) + …”
- 17/4 i 32/4: „⟦(f′·g − f·g′)/g²⟧ = …”
- 9/2, 36/2, 37/2: „⟦u · v − ∫ v du⟧ = …”
- 19/1: „⟦∫ 1/(x² + a²) dx⟧ = arctg(x/2)/2”

Litery wzoru stoją w `math` i w `tex` dymku. Kolor powinien obejmować postać z liczbami, np. 7/4: „u′·v + u·v′ = ⟦3x² · sin(x) + x³ · cos(x)⟧” albo samą podstawioną postać bez liter. W 19/1 zapis wyniku nie wygląda jak wzór z dymku (1/a · arctg(x/a)). Propozycja: „a² = 4, a = 2 ⏎ ∫ 1/(x² + 4) dx = ⟦(1/2) · arctg(x/2)⟧”, z tą samą formą w wyniku.

**K3. 29 / krok 1, √x.** Kolor „⟦(√x)′⟧ = 1/(2√x)” z dymkiem potęgi, ale nigdzie nie widać potęgi. Uczeń nie ma czego dopasować do xⁿ. Propozycja: dodać krok „Zapisuję pierwiastek jako potęgę: √x = x^(1/2)”, potem `math` „⟦(x^(1/2))′ = 1/2 · x^(−1/2)⟧ = 1/(2√x)”, why „Tu n = 1/2: 1/2 schodzi, wykładnik 1/2 − 1 = −1/2, a x^(−1/2) = 1/√x.”

**K4. Tożsamości (20/1, 21/1, 22/1): kolor za wąski.** Kolor leży tylko na „⟦sin²(x)⟧”, a użyty wzór to cała równość „sin²(x) = (1 − cos(2x))/2”. Kolor powinien objąć prawą stronę (to, co wstawiamy): „sin²(x) = ⟦(1 − cos(2x))/2⟧”. Do tego w tej samej linii stoi od razu wynik całki (zob. C5).

**K5. 17/3 i 32/3, kolor na (x)′ w kroku o mianowniku.** Kolor jest tylko na części sumy, a krok liczy pochodną całego (x + 1). Po poprawce z D3 kolor zostaje na (x)′, ale linia musi pokazywać całą sumę. Dla (x)′ = 1 warto dopisać „x = x¹: (x¹)′ = 1·x⁰ = 1”, bo inaczej „wykładnik schodzi” nic nie mówi przy braku wykładnika.

**K6. Kroki z „wzorem” bez dymku i bez koloru (brakujące dymki):**
- 35/1–2, ułamki proste i ∫1/(x − a) = ln|x − a|: brak dymku, a to najtrudniejszy krok w paczce.
- 38/1, podstawienie: brak dymku z „dt = t′ dx”.
- 26/3, „iloczyn = 0 ⇔ któryś czynnik = 0”: wzór stoi w etykiecie, a powinien być w dymku z kolorem na „x = 0 lub x − 3 = 0”.
- 8/1, 30/1, 36/3, 37/3, 38/2, „stała przed pochodną/całką”: opcjonalny dymek „(c·f)′ = c·f′”.
- 4/1, miejsca zerowe: brak rachunku i dymku (zob. R5).

**K7. Dymki z treścią niepasującą do kroku:**
- „Tablica pochodnych” (7/3, 31/3), dymek.why „Stała daje 0.”: w tych krokach stałej nie ma.
- „Wzory na rozwiązania” (1/4, 2/5, 14/4): kolor jest na podstawionych liczbach, ale „5” nie przypomina „−b” (zob. R1).

## 4. Zrozumiałość per dział

### Równania (i rozkład)

**R1. Delta i rozwiązania bez pośrednich rachunków (wzorzec): 1, 2, 12, 14.**
- Delta: „Δ = ⟦(−5)² − 4 · 1 · 6⟧ = 1” powinno mieć „= 25 − 24 = 1”. W 12: „= 16 − 16 = 0”, w 14: „= 4 + 4 = 8” (tu pułapka: −4·1·(−1) = +4).
- Rozwiązania: „x₁ = ⟦(5 − 1)/(2 · 1)⟧”, a skąd 5? Propozycja: „x₁ = ⟦(−(−5) − 1)/(2·1)⟧ = 4/2 = 2”, z why „−b = −(−5) = 5”. W 12/3: „x₀ = ⟦−(−4)/(2·1)⟧ = 4/2 = 2”.
- √Δ: „√Δ = 1” zmienić na „√Δ = √1 = 1”. W 14/3: „√Δ = √8 = √(4·2) = 2√2”.
- 14/4: „(2 − 2√2)/2 = 1 − √2” to skok przy skracaniu. Dopisać „= 2(1 − √2)/2 = 1 − √2”.

**R2. 24, `5 = 2x − 7`.** Krok 1 „−2x = −7 − 5” daje dwa minusy i dzielenie przez −2. Propozycja: krok „Zamieniam strony: 2x − 7 = 5” (why „Równość działa w obie strony, a x wygodniej mieć po lewej.”), potem „2x = 5 + 7”, „2x = 12”, „x = 12/2 = 6”.

**R3. 25, `x/2 + 1 = 3`.** Krok 1 „(1/2)x + 1 = 3” niczego nie zmienia, ma błędną etykietę („redukuję”) i prowadzi do dzielenia przez 1/2, które słaby uczeń źle liczy. Propozycja: usunąć krok 1; „x/2 = 3 − 1”, „x/2 = 2”, krok „Mnożę obie strony przez 2: x = 2 · 2 = 4”, why „x/2 to x podzielone przez 2, więc mnożenie przez 2 cofa dzielenie.”

**R4. 26, `x² − 3x = 0`.**
- Krok 1 „Odczytuję współczynniki a = 1, b = −3, c = 0” to martwy krok, bo delta potem nie pada. Usunąć albo zamienić na „c = 0, więc zamiast delty wyłączam x”.
- Krok 3 „x = 0 lub x = 3” nie pokazuje drugiego czynnika. Propozycja `math`: „x = 0 lub x − 3 = 0 ⏎ x = 0 lub x = 3”.

**R5. 4, `rozłóż x² − 5x + 6`.** „x₁ = 2, x₂ = 3” bez żadnego rachunku. Propozycja: wstawić te same kroki delty co w zad. 1 albo krótko: „Szukam dwóch liczb: razem dają 5, pomnożone 6 → 2 i 3”. W kroku 2 dopisać „a = 1, więc przed nawiasami nic nie piszę”, bo dymek mówi o a.

**R6. 2, `x³ − 6x² + 11x − 6 = 0`.**
- Krok 1: dzielniki nie są wypisane, a Q(x) = x² − 5x + 6 pojawia się bez dzielenia. Propozycja: rozbić na „Dzielniki −6: ±1, ±2, ±3, ±6”, „W(1) = 1 − 6 + 11 − 6 = 0” i „Dzielę W(x) przez (x − 1): x² − 5x + 6” (schemat Hornera lub pisemne dzielenie, choćby jedna linia).
- Między krokiem 1 a 2 brakuje przejścia: „x − 1 = 0 → x = 1; dalej rozwiązuję x² − 5x + 6 = 0”. Bez tego „a = 1, b = −5, c = 6” wygląda na wzięte z innego zadania.

**R7. 15, `x² = 9`** (drobne): „x = ±3” lepiej zapisać jako „x = √9 = 3 lub x = −√9 = −3”.

### Ułamki i upraszczanie

**U1. Skąd wspólny mianownik (wzorzec): 5/1, 16/1, 39/1.** Etykieta „…do wspólnego mianownika 12”, a why mówi tylko, że trzeba. Propozycja: why konkretne, np. 16: „Szukam najmniejszej liczby, którą dzielą 4 i 6: 4, 8, **12**. Mnożę 3/4 przez 3, a 1/6 przez 2.” W 5: „2·3 = 6 dzieli się przez 2 i 3.” W 39: „wielokrotności 6: 6, **12**, a 12 dzieli się przez 4.”

**U2. Dodawanie liczników (5/2, 16/2, 39/2).** `math` to sam wynik „5/6”. Propozycja: „3/6 + 2/6 = (3 + 2)/6 = 5/6”. Why „…dodajemy albo odejmujemy…” zmienić na konkretne słowo zależnie od działania. W 39 dodatkowo można dopisać „13/12 = 1 1/12” (ulepszenie).

**U3. 6.** Zob. D3 (puste why).

**U4. 3 i 11.** Zob. K1 i D2.

### Pochodne

**P1. f/g zamiast u/v (7, 17, 31, 32), Major.** „f(x) = x³·sin(x)”, potem „f = x³”, potem „f′ = 3x²”, a wynik to znowu „f′(x) = …”. Ta sama litera oznacza w jednym rozwiązaniu dwie różne rzeczy. Propozycja: „u = x³, v = sin(x)”, „u′ = 3x², v′ = cos(x)”, dymek tex `(u\cdot v)'=u'\cdot v+u\cdot v'` oraz `\left(\frac{u}{v}\right)'=\frac{u'v-uv'}{v^{2}}`. Etykiety kroków 2–3: „Liczę u′” i „Liczę v′” zamiast „Liczę pochodną potęgi” i „Korzystam z tablicy”.

**P2. Wynik w innej kolejności niż rachunek (7, 31, też 18).** Krok 4 daje „3x²·sin(x) + x³·cos(x)”, a Wynik „x³·cos(x) + 3x²·sin(x)”. Uczeń myśli, że to inny wynik. Trzeba zachować kolejność z rachunku. W 18 dopisać ostatnią linię „cos(x²) · 2x = 2x · cos(x²)”.

**P3. Licznik ilorazu bez uproszczenia (17/4, 32/4).**
- 17: „(1·(x + 1) − x·1)/(x + 1)² = 1/(x + 1)²” rozbić na „= (x + 1 − x)/(x + 1)² = 1/(x + 1)²”.
- 32: „(2x·(x − 1) − (x² + 1)·1)/(x − 1)² = (x² − 2x − 1)/(x − 1)²” rozbić na „= (2x² − 2x − x² − 1)/(x − 1)² = (x² − 2x − 1)/(x − 1)²”, z why „Uwaga na minus przed nawiasem: zmienia znak obu wyrazów.” (Rachunek sprawdzony, zgadza się.)

**P4. Łańcuchowa bez ostatniego mnożenia (28, 33, 18).**
- 28: krok 3 „f′(x) = 15(3x + 1)⁴” bez „5(3x + 1)⁴ · 3 = 15(3x + 1)⁴”. Dodać krok „Mnożę: 5 · 3 = 15”. Dodatkowo w kroku 1 why powinno nazwać zewnętrzną: „Zewnątrz jest potęga 5: (t⁵)′ = 5t⁴, w środku 3x + 1.” Etykieta kroku 2: „Liczę pochodną środka”.
- 33: brak „1/(x² + 1) · 2x = 2x/(x² + 1)” i brak informacji, że (ln t)′ = 1/t. Dodać do why kroku 1: „Zewnątrz jest ln, a (ln t)′ = 1/t.”
- 18: zob. P2. W why kroku 1 dopisać „(sin t)′ = cos t”.

**P5. Ostatnie mnożenie przy stałej (8, 30), drobne.** „f′(t) = 2at” i „f′(x) = 15x²” bez „a · 2t” i „5 · 3x²”. Dodać jedną linię „5 · 3x² = 15x²” przed wynikiem.

**P6. √x (29).** Zob. K3.

### Całki

**C1. F(b), F(a) niewyliczone (10/3, 34/3).**
- 10: „⟦F(1) − F(0)⟧ = 1/3 − 0” zmienić na „= 1³/3 − 0³/3 = 1/3 − 0 = 1/3”.
- 34: „⟦F(π) − F(0)⟧ = 1 − (−1)”: słaby uczeń nie wie, skąd 1, skoro F = −cos. Propozycja: „= (−cos(π)) − (−cos(0)) = (−(−1)) − (−1) = 1 + 1 = 2”, z why „cos(π) = −1, cos(0) = 1.” (Wynik 2 poprawny.)

**C2. Ułamki proste bez A i B (35), Critical dla zrozumienia.** „(−1/2)/(x + 1) + (1/2)/(x − 1)” pojawia się znikąd, a krok 2 podaje nawiasy w odwrotnej kolejności. Propozycja:
1. „Rozkładam mianownik: x² − 1 = (x − 1)(x + 1)” (dymek różnica kwadratów).
2. „Zapisuję ułamki proste: 1/((x − 1)(x + 1)) = A/(x − 1) + B/(x + 1)”.
3. „Mnożę przez mianownik: 1 = A(x + 1) + B(x − 1)”.
4. „Wstawiam x = 1: 1 = 2A, A = 1/2 ⏎ Wstawiam x = −1: 1 = −2B, B = −1/2”.
5. „Całkuję każdy ułamek: ∫ 1/(x − a) dx = ln|x − a|” (dymek).

Kolejność (x − 1), (x + 1) trzymać wszędzie tak samo. (Wynik sprawdzony, zgadza się.)

**C3. Podwójny minus przez części (37/2–5).** „−x·cos(x) − ∫ −cos(x) dx”, potem „−1·∫cos(x) dx”, potem „−sin(x)”, a w sprawdzeniu nagle „sin(x) − x·cos(x)”. Zamiana „− (−sin)” na „+ sin” nigdzie nie pada. Propozycja: w kroku 2 od razu „= −x·cos(x) + ∫ cos(x) dx”, why „Minus razy minus daje plus.”; usunąć kroki 3 i 5 (wyłączanie −1); dodać krok „Składam wynik: −x·cos(x) + sin(x)”.

**C4. Brak złożenia wyniku po przez części (9, 36, 37).** Po policzeniu małej całki od razu idzie Sprawdzenie, a całości nikt nie zapisał. Dodać krok „Składam wynik”: w 9 „x·e^x − e^x”, w 36 „x²·ln(x)/2 − x²/4”. W 36/2 dopisać też uproszczenie v·du: „∫ x²/2 · 1/x dx = ∫ x/2 dx”, bo bez tego „x/2” jest skokiem.

**C5. Tożsamości: całka w jednej linii (20, 21).** „…, ∫ sin²(x) dx = x/2 − sin(2x)/4”: brakuje ∫ cos(2x) dx = sin(2x)/2. Propozycja: osobny krok „Całkuję każdą część: ∫ 1/2 dx = x/2, ∫ cos(2x)/2 dx = sin(2x)/4”, z why „cos(2x) ma w środku 2x, więc dzielę przez 2.” W 22 analogicznie: „∫ 1/cos²(x) dx = tg(x), ∫ 1 dx = x”.

**C6. Podstawienie bez dx = dt/2 (38/1).** „dt = 2 dx ⏎ ∫ (2x + 1)³ dx = ∫ t³/2 dt”: skąd /2? Propozycja: „dt = 2 dx, więc dx = dt/2 ⏎ ∫ t³ · dt/2 = ∫ t³/2 dt”.

**C7. Arctg (19).** Zob. K2: zapis „arctg(x/2)/2” zamienić na „(1/2)·arctg(x/2)”, tak żeby przypominał 1/a we wzorze.

## 5. Zadania bez uwag

- **0** `rozwiąż 3(x - 2) = x + 4`
- **23** `rozwiąż 2x + 3 = 11`

Prawie czyste (tylko wzorzec dubla why/dymek): **13** `rozłóż x^2 - 9`, **27** `rozłóż x^3 - x` (plus D2).

## Liczba problemów

| Kategoria | Liczba (wzorce / pojedyncze) |
|---|---|
| Duble | 22 (D1: 13 wzorców w ok. 30 miejscach; D2: 4; D3: 5) |
| Kolor vs dymek | 7 (K1–K7) |
| Zrozumiałość: równania i rozkład | 7 (R1–R7) |
| Zrozumiałość: ułamki i upraszczanie | 4 (U1–U4, z czego U3 i U4 odsyłają do D3, K1, D2) |
| Zrozumiałość: pochodne | 6 (P1–P6) |
| Zrozumiałość: całki | 7 (C1–C7) |
| Błędy liczbowe | 0 |
