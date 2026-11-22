# Raport D: granice krok po kroku po zmianie podkreślenia na kolor

Czytelnik: słaby uczeń (liceum / 1. rok). Dane: `kroki-granice.json`, 67 zadań (indeksy 0–66).
Oznaczenia: `#i` = indeks zadania, `k` = numer kroku (od 0), ⟦…⟧ = fragment w kolorze.

## 1. Podsumowanie

1. **Rachunki są poprawne.** Sprawdziłem ręcznie wszystkie 67 wyników i przekształcenia pośrednie (rozkłady, sprzężenia, wykładniki przy e, stałe). Nie znalazłem żadnego błędu liczbowego.
2. **Największy błąd treści: etykieta „Podstawa dąży do e” (#31–#40, 10 zadań).** Podstawa dąży do 1. Do e dąży kolorowa potęga, a dymek i zdanie why mówią to dobrze. Etykieta przeczy im obu.
3. **Duble są wszędzie i zawsze w tym samym miejscu.** Zdanie why pod krokiem powtarza `dymek.why` w krokach z symbolem nieoznaczonym (65 zadań), ze sprzężeniem (22 zadania), z e (10) i ze znanymi granicami (7). W #60–#66 ta sama myśl („kolorowy ułamek → 1”) stoi trzy razy: why, dymek i etykieta następnego kroku.
4. **Kolor zwykle trafia, ale są 4 typy rozjazdów.** (a) W #25 k1 kolor obejmuje wyrażenie z pierwiastkami, a dymek obiecuje, że „w kolorowym miejscu zostaje wyrażenie bez pierwiastka”. (b) W #25, #30, #53 i #55 kolor pokazuje b²−a² zamiast a²−b², a mianownik ma minusy. (c) W #42–#44 kolorem jest sam wzór √(x²)=|x|, a miejsce jego użycia nie ma koloru. (d) Nawiasy kwadratowe wokół koloru (#31–#40, #60–#66) zderzają się z dymkiem, według którego „nawias kwadratowy pokazuje, co wychodzi po wstawieniu”.
5. **Skoki, w których uczeń się gubi:**
   - Krok „Mnożymy przez sprzężenie” nie pokazuje samego mnożenia.
   - Liczniki po sprowadzeniu do wspólnego mianownika (i różnice przy „dorabianiu jedynki”) pojawiają się bez rachunku.
   - aₙ i wykładnik zewnętrzny przy e biorą się znikąd.
   - Rozkład wielomianu i wstawienie liczby (#46–#57) są podane bez rachunku.
   - Kroki „Zapisujemy inaczej” w #20, #27 i #28 komplikują rachunek zamiast go upraszczać.
6. **Fałszywe lub niepasujące why:**
   - „Upraszczamy … pierwiastki się skasowały” stoi tam, gdzie pierwiastek nadal jest (#23, #25, #55).
   - „W mianowniku nie wychodzi zero” stoi w #52, gdzie mianownika nie ma.
   - W #16–#17 logarytm znika z zapisu na trzy kroki.

Liczba problemów (wzorzec liczony raz): **Duble: 9**, **Kolor vs dymek: 8**, **Zrozumiałość: 18**. Błędy liczbowe: **0**.

---

## 2. Duble

| # | Gdzie | Co jest teraz | Problem | Propozycja |
|---|---|---|---|---|
| D1 | k0 wszystkich zadań z symbolem (wszystkie poza #21 i #59) | why: „…Nie wiadomo, kto wygra, więc przekształcamy.” / „Tego nie da się policzyć od razu, więc najpierw przekształcamy wyrażenie.” Dymek: „…wynik może być dowolny, więc najpierw przekształcamy wyrażenie.” | Why i dymek kończą się tym samym zdaniem. | Why ma mówić tylko o tym konkretnym zadaniu: „Licznik i mianownik rosną bez końca.” (∞/∞), „Licznik i mianownik dążą do 0.” (0/0). Morał „więc przekształcamy” zostaje w dymku. |
| D2 | Kroki „Mnożymy przez sprzężenie”: #18–#25, #43–#45, #52–#55 | why: „Mnożymy przez ten sam nawias z przeciwnym znakiem, żeby pierwiastek zniknął.” Dymek: „Mnożymy różnicę z pierwiastkiem przez ten sam nawias z przeciwnym znakiem…” | To samo zdanie dwa razy. | why: „Mnożymy licznik i mianownik przez √A + √B.” (z konkretnymi wyrażeniami). Ogólna zasada zostaje w dymku. |
| D2b | To samo dla sześcianów i czwartych potęg: #26–#30, #56, #57 | why: „…wzór na różnicę sześcianów: po wymnożeniu pierwiastki znikają.” Dymek: „…a sześcian usuwa ∛.” | Dubel. | why: „Mnożymy przez a² + ab + b², gdzie a = ∛(…), b = ….” |
| D3 | #16 k1, #17 k1 | why: „Różnica logarytmów to logarytm ilorazu, a granicę ilorazu już umiemy policzyć.” Dymek: „Z dwóch logarytmów robimy jeden… jego granicę już umiemy policzyć.” | Dubel. | #16 why: „Zostaje jeden logarytm z ułamkiem w środku.” #17 why: „Najpierw 2 wchodzi do potęgi, potem różnica daje iloraz.” (W #17 why w ogóle pomija regułę k·log.) |
| D4 | #42 k1, #43 k3, #44 k3 | why: „…Pierwiastek nigdy nie daje liczby ujemnej, więc pilnujemy znaku.” Dymek: „Pierwiastek nigdy nie daje liczby ujemnej…” | Dubel. Etykieta „Dla x → −∞” nie zaczyna się od czasownika. | Etykieta: „Pilnujemy znaku dla x → −∞”. why: „x jest ujemne, więc √(x²) to −x, a nie x.” |
| D5 | #38 k1 | why: „Gdy wykładniki są takie same, iloraz potęg to potęga ilorazu…” Dymek: „Gdy licznik i mianownik mają ten sam wykładnik, ułamek potęg to potęga ułamka.” | Dubel. | why: „(n+3) do potęgi 2(n²+6n) to (n+3)² do potęgi n²+6n.” To zdanie wypełnia też skok opisany w Z13. |
| D6 | #31–#40, krok z e | why: „Kolorowa potęga … dąży do e. Stuknij ją…” Dymek: „Podstawa dąży do 1, a wykładnik do nieskończoności (symbol 1^∞)…” | Pierwsze zdanie dymku powtarza why z k0 („Podstawa dąży do 1, a wykładnik do nieskończoności”). | Z dymku usunąć pierwsze zdanie. why: „Wykładnik mnożymy i dzielimy przez aₙ; kolorowa część dąży do e.” |
| D7 | #60–#65 k1–k2, #66 k3–k4 | k1 why: „…kolorowy ułamek dąży do 1.” Dymek: „Kolorowy ułamek zastępujemy jedynką.” k2 etykieta: „Kolorowy ułamek dąży do 1”, k2 why: „Zastępujemy kolorowy ułamek jedynką…” | Ta sama myśl stoi trzy razy w dwóch krokach. | k1 why: „Mnożymy i dzielimy przez 3, żeby pod sinusem i w mianowniku było to samo 3x.” k2 etykieta „Zastępujemy kolor jedynką”, bez why albo why: „Zostaje sama liczba 3.” |
| D8 | #66 k1 i k2 | Ta sama etykieta „Reguła de l'Hospitala”, to samo why i ten sam dymek dwa razy. Why: „Wyszło 0/0 albo ∞/∞…” | Dubel dymku i why. Why nie mówi, co faktycznie wyszło. | k1 why: „Wstawienie 0 daje 0/0.” k2 etykieta „Stosujemy regułę drugi raz”, why: „Znowu wychodzi 0/0.” |
| D9 | #59 k1 i k2 | k1 kończy się „lim = +∞”, k2 „Wynik” powtarza to samo. | Drobny dubel. | W k1 zostawić „licznik → 1, mianownik → 0⁺”. Wynik podać tylko w k2. |

---

## 3. Kolor vs dymek

| # | Gdzie | Co jest teraz | Problem | Propozycja |
|---|---|---|---|---|
| K1 | **#31–#40**, etykieta kroku z e | „Podstawa dąży do e” | **Nieprawda.** Podstawa dąży do 1. Do e dąży kolorowa potęga (1+1/aₙ)^aₙ. Etykieta przeczy dymkowi i k0. | Etykieta: **„Kolorowa potęga dąży do e”**. |
| K2 | #25 k1 | ⟦(√(n⁴+n³) + √(n⁴−n³))² − 4n⁴⟧ | Dymek: „w kolorowym miejscu zostaje zwykłe wyrażenie bez pierwiastka”, a w kolorze są dwa pierwiastki. | Pokazać kolor już po rozwinięciu: ⟦2√(n⁸−n⁶) − 2n⁴⟧. Albo dopisać w why: „Tu zostaje jeszcze jeden pierwiastek, więc sprzężenie zrobimy drugi raz.” |
| K3 | #25 k3, #30 k1, #53 k2, #55 k2 | np. #53: `x − √(x+6) = (⟦x + 6 − x²⟧)/(−x − √(x+6))`, #30: `⟦16n⁴+40n³+1 − 16n⁴⟧/(−8n³ − …)` | Kolor to b² − a², odwrotnie niż we wzorze z dymku (a² − b²). Mianownik dostał minusy, żeby się zgadzało. Rachunek jest poprawny, ale uczeń nie rozpozna wzoru. | Zapis zgodny ze wzorem: #53 `(⟦x² − (x+6)⟧)/(x + √(x+6))`, #30 `(⟦16n⁴ − (16n⁴+40n³+1)⟧)/(8n³ + …)`, #55 `(⟦(x+1)² − (x+7)⟧)/((x+1) + √(x+7))`, #25 `(⟦n⁸ − (n⁸−n⁶)⟧)/(n⁴ + √(n⁸−n⁶))`. Wtedy kroki „Zapisujemy inaczej” w #53 i #55 można usunąć. |
| K4 | #42 k1, #43 k3, #44 k3 | Osobny krok `⟦√(x²)⟧ = |x| = −x` | Kolor stoi na samym wzorze, nie w miejscu użycia. W kroku „Wyłączamy (−x)”, gdzie wzór naprawdę działa, nic nie jest kolorowe. | Połączyć oba kroki: `√(3x²+5) = ⟦√(x²)⟧·√(3 + 5/x²) = (−x)√(3 + 5/x²)` i podpiąć tam dymek. |
| K5 | #64 k1 | ⟦ln(2x + 1)/(2x)⟧ | Dymek: „W logarytmie musi stać 1+u”, a w kolorze jest 2x+1. Słaby uczeń nie zobaczy zgodności. | ⟦ln(1 + 2x)/(2x)⟧ (zachować kolejność z treści zadania). |
| K6 | #47 k1, #38 k1 | #47: x³ − 27 = (x−3)(x²+3x+9) bez koloru i dymku. #38: dymek „potęga ilorazu”, ale użyto też (a^m)^k. | Wzór jest użyty, a dymku brak. W #38 dymek nie obejmuje kroku (n+3)^(2g) = ((n+3)²)^g. | #47: ⟦(x−3)(x²+3x+9)⟧ + dymek „Różnica sześcianów”. #38: dopisać do dymku a^(2g) = (a²)^g albo dać osobny krok. |
| K7 | #31–#40 (`[⟦…⟧]^(…)`), #60–#66 (`[⟦sin(3x)/(3x)⟧] · 3`) | Nawiasy kwadratowe wokół koloru | Dymek z k0 uczy: „Nawias kwadratowy pokazuje, co wychodzi po wstawieniu”. Teraz te same nawiasy oznaczają co innego. To pozostałość po podkreśleniu. | #60–#66: usunąć nawiasy (kolor wystarcza). #31–#40: zamienić na okrągłe. |
| K8 | #26–#30, #56, #57 | Etykieta „Mnożymy przez sprzężenie”, dymek „Różnica sześcianów” / „Różnica czwartych potęg” | Etykieta i dymek mówią o czymś innym. „Sprzężenie” uczeń zna tylko z kwadratów. | Etykieta: „Mnożymy przez a² + ab + b²” (sześciany) / „Mnożymy przez długi nawias” (czwarte potęgi). |

Sprawdzone i zgodne: kolor ⟦∞/∞⟧, ⟦0/0⟧ itd. w k0. Kolor a² − b² przy sprzężeniu w #18–#24, #43–#45, #52 i #54. Kolor (1+1/aₙ)^aₙ w #31–#40. Logarytm w #16–#17. Znane granice w #60–#63 i #65. Ułamek pochodnych w #66.

---

## 4. Zrozumiałość

### Wzorce (powtarzają się w wielu zadaniach)

| # | Gdzie | Co jest teraz | Problem | Propozycja |
|---|---|---|---|---|
| Z1 | Każde „Mnożymy przez sprzężenie” (#18–#30, #43–#45, #52–#57) | `√A − √B = (⟦A − B⟧)/(√A + √B)` | Brak samego mnożenia. Uczeń nie widzi, skąd mianownik ani dlaczego wynik się zgadza. | Dodać linię środkową: `(√A − √B)·(√A + √B)/(√A + √B)`, a potem wynik. |
| Z2 | „Upraszczamy” po sprzężeniu, zwłaszcza #23 k2, #25 k2, #55 k3 | why: „Wymnażamy: tam, gdzie była różnica z pierwiastkiem, pierwiastki się skasowały.” | W tych krokach nadal stoi różnica pierwiastków (√(n+5)−√(n+3), √(n⁸−n⁶), √(x+2)−2), więc zdanie jest fałszywe. W pozostałych krokach pierwiastki zniknęły już w poprzednim kroku, a tutaj tylko odejmujemy. | why: „Odejmujemy: 2n się redukuje, zostaje 4.” (konkretnie). W #23, #25 i #55: „Jeden pierwiastek zniknął, drugą różnicę zrobimy za chwilę.” |
| Z3 | #3 k2, #4 k2, #6 k2, #12 k2, #18 k4 | `→ 1/n → 0`, `→ n² → +∞`, `→ 3125/144 · 1/n → 0`, `→ 1/6 · n^(1/12) → +∞`, `→ √2 · 1/√n → 0` | Pominięte jest skracanie potęg (n³/n⁴ = 1/n) i liczenie stałej. Etykieta „Wyrazy z n w mianowniku dążą do 0” nie pasuje do zapisu „1/n → 0”, który sam ma n w mianowniku. | Dodać krok „Skracamy: n³/n⁴ = 1/n” oraz pokazać stałą, np. `(4·5⁵·1)/(4³·3²) = 3125/144`. |
| Z4 | #16 k2–k4, #17 k2–k4 | `lim n(8 + 1/n)/(n(1 + 6/n))` (bez log) | Logarytm znika z zapisu na trzy kroki. Uczeń myśli, że go zgubiono. | Etykieta k2: „Liczymy granicę pod logarytmem”. Albo zostawić log₂(…) w zapisie każdego kroku. |
| Z5 | „Zapisujemy inaczej”: #20 k1, #27 k1, #28 k1 | #20: `√(4n²+2) = √2√(2n²+1)`, #27: `∛(8n³−4n²) = ∛4∛(2n³−n²)`, #28: `∛(27n³+15n²) = ∛3∛(9n³+5n²)` | Przekształcenie niczemu nie służy i komplikuje dalszy rachunek. Na końcu uczeń musi sam wiedzieć, że 4^(2/3)·2^(2/3) = 4 (#27) albo 3^(2/3)·9^(2/3) = 9 (#28). | Usunąć te kroki. Przy b = ∛(8n³−4n²) wszystkie trzy wyrazy w mianowniku dążą wprost do 4 (#27) albo do 9 (#28). |
| Z6 | #31–#40, „Dorabiamy jedynkę” i krok z e | `(n + 4)/n = 1 + 4/n,  aₙ = n/4`; potem `[…]^(4(n + 5)/n)` | (a) Etykieta to żargon, a jedynka często już jest (#32: `1 + 1/(2n)` bez zmian). (b) Krok 4/n = 1/(n/4) jest pominięty, więc aₙ pojawia się znikąd. (c) Nie wiadomo, skąd wykładnik zewnętrzny. (d) W #36, #39 i #40 różnica licznik − mianownik (15, −3(n−2), 2(3n−2)) jest bez rachunku. | Etykieta: „Zapisujemy podstawę jako 1 + 1/aₙ”. Zapis: `1 + 4/n = 1 + 1/(n/4)`. W kroku z e dodać linię: `n + 5 = (n/4) · 4(n + 5)/n`. W #36 pokazać `(5n + 7) − (5n − 8) = 15`. |
| Z7 | „Rozkładamy na czynniki” #46–#58 | why: „…oba mają nawias (x−a).” | „a” to żargon, a rozkład jest podany bez rachunku. W #51 nawias to (x+1), nie (x−a). | why: „Wyszło 0/0, więc obie części mają nawias (x − 4).” (konkretna liczba, w #51 „(x + 1)”). Dla wielomianów stopnia 3+ dopisać jedną linię „dzielimy przez (x − 2)”. |
| Z8 | „Podstawiamy x = …” #46–#57 | `lim(x→4) (x − 2)/(3x + 2) = 1/7` | Brak wstawionych liczb. Najgorzej w #54 (−11/7), #55 (3/10) i #56 (−1/96 = 1/(32·(−3))). Kroki z n→∞ pokazują „(2 + 0)/(6 + 0)”, więc styl jest niespójny. | `= (4 − 2)/(12 + 2) = 2/14 = 1/7`. W #56: `1/((8 + 8 + 8 + 8)·(−3)) = −1/96`. |
| Z9 | Ułamkowe wykładniki: #12, #26–#30, #56, #57 | `(n³ + 8n²)^(2/3)`, `n^(13/12)` | Słaby uczeń nie wie, że a^(2/3) = ∛(a²). W tym samym zapisie obok stoi ∛. | `∛((n³ + 8n²)²)`. W #12 zamiast n^(5/4) pisać n∜n, tak jak w liczniku n∛n. |
| Z10 | Krok 0 przy x → −∞: #42, #43 | why: „Licznik i mianownik rosną bez końca” / „Oba składniki rosną bez końca” | Przy x → −∞ x i 2x maleją do −∞. | „Licznik dąży do −∞, a mianownik do +∞.” |

### Tabela per zadanie (tylko problemy spoza wzorców albo dodatkowe)

| Zad. (q) | Krok | Co jest teraz | Problem | Propozycja |
|---|---|---|---|---|
| #14 `((n²+5)/(2n+1) − (2n²+1)/(4n+5))` | k1 | `(3n² + 18n + 24)/((2n+1)(4n+5))` | Licznik bez rachunku (Z11). | Linia: `(n²+5)(4n+5) − (2n²+1)(2n+1) = 3n² + 18n + 24`. |
| #15 `((n+3)/(√n+1) − (n+1)/(√n+5))` | k1 | `(4n + 2√n + 14)/…` | Jak wyżej. | Linia: `(n+3)(√n+5) − (n+1)(√n+1)`. |
| #21 `1/(√(n+√n) − √(n−1))` | k0 | brak symbolu, why: „Sprawdzamy, do czego zbliża się wyrażenie…” | W mianowniku jest ∞ − ∞, a krok tego nie mówi. | `[1/(∞ − ∞)]`, why: „W mianowniku jest ∞ − ∞, więc najpierw go przekształcamy.” |
| #23 `(√(n+5)−√(n+3))/(√(4n+9)−√(4n−7))` | k0, k5–k6 | why: „Po wstawieniu wychodzi 0/0”; zapis `8√n((√(1+5/n) + …))` | Przy n→∞ nic się „nie wstawia”, a uczeń widzi ∞ − ∞, nie 0. Podwójne nawiasy „((”. | why: „Licznik i mianownik to różnice, które dążą do 0.” Jedna para nawiasów. |
| #24 `(√(n²+9n) − 2√(n²+1) + √(n²+5n))` | k2–k11 | dwie serie kroków jedna po drugiej | Nie widać, gdzie kończy się pierwsza część, a zaczyna druga. | Etykiety: „Pierwsza różnica: mnożymy przez sprzężenie”, „Druga różnica: …”. |
| #25 `(√(n⁴+n³) + √(n⁴−n³) − 2n²)` | k1 | `√(n⁴+n³) − 2n² + √(n⁴−n³) = …` | Dziwna kolejność. Nie widać, że a = √+√, b = 2n². | Najpierw `a = √(n⁴+n³) + √(n⁴−n³), b = 2n²`, potem `(a − b)`. |
| #28 `(∛(27n³+15n²) − 3n)` | k2–k3 | `3∛3n∛(9n³ + 5n²)` | Czyta się jak ∛(3n). | Po usunięciu Z5: `3n∛(27n³ + 15n²)`. |
| #33 `((n+4)/n)^(n+5)` | k4 | `4n(1 + 5/n)/(n)` | Zbędne nawiasy wokół n. Zbędny krok, bo 4(n+5)/n = 4 + 20/n. | `4 + 20/n → 4`. |
| #37 `((2n+√n)/(2n+7√n))^(2+√n)` | k4 | `−6n(1 + 2/√n)/…` | Rozwinięcie √n(√n + 2) = n + 2√n jest pominięte. | Linia: `√n(√n + 2) = n + 2√n`. |
| #38 `(n+3)^(2n²+12n)/(n²+6n)^(n²+6n)` | k1 | `((n²+6n+9)/(n²+6n))^(n²+6n)` | Skok (Z13): nie widać, że (n+3)^(2(n²+6n)) = ((n+3)²)^(n²+6n). | Linia pośrednia, zob. D5 i K6. |
| #39, #40 | k1 | `1 + (−3(n − 2)/…)`, `1 + 2(3n − 2)/…` | Różnica liczników bez rachunku. | `(n²+2n+7) − (n²+5n+1) = −3n + 6`. |
| #43 `(√(4x²−3x) + 2x)`, x→−∞ | k4–k5 | `−3(−x)/(−(−x)(√(4 − 3/x) + 2))` | Trzy minusy w jednym ułamku. Łatwo się zgubić. | Najpierw `√(4x²−3x) = (−x)√(4 − 3/x)`, potem `3x/(2x + x√(…)) = 3/(2 + √(…))`… z jasnym skróceniem x. |
| #51 `(3x³+8x²+7x+2)/(…)`, x→−1 | k2 | Etykieta „Skracamy (x + 1)” | Skracamy (x+1) dwa razy. | „Skracamy (x + 1)²”. |
| #52 `(x−5)/(3−√(x+4))` | k3, k4 | k3: `−(√(x+4) + 3)` od razu; k4 why: „W mianowniku nie wychodzi zero…” | k3 pomija skrócenie (x−5). W k4 nie ma mianownika. | k3: pokazać `−(x−5)(√(x+4)+3)/(x−5)`. k4 why: „Nie ma już dzielenia przez 0, więc wstawiamy 5: −(3 + 3) = −6.” |
| #53, #54 | k4 / k3 | `−1(x + √(x + 6))…` | „−1(” to zbędna jedynka. | `−(x + √(x + 6))…` |
| #53, #55 | k1 | „Zapisujemy inaczej”, why: „To samo wyrażenie, tylko ułożone tak…” | Ten krok odwraca znak, a K3 i tak odwraca go drugi raz. Why niczego nie mówi. | Po poprawce K3 usunąć krok. Jeśli zostaje, why: „Wyciągamy minus, żeby pierwiastek stał na początku.” |
| #57 `(x²−8x+15)/(∛(3x−1)−2)` | k3 | `1/3((3x − 1)^(2/3) + …)(x − 3)(x − 5)/(x − 3)` | Rysunek może dać 1 nad całym iloczynem. Zapis niejednoznaczny. | `(1/3)·(…)·(x − 3)(x − 5)/(x − 3)` albo wszystko nad kreską z 3 w mianowniku. |
| #65 `(e^x−1)/x` | k1 | `u = x → 0: lim [⟦(e^x − 1)/x⟧] · 1` | „u = x” i „· 1” to puste kroki. | `lim ⟦(e^x − 1)/x⟧ = 1` w jednym kroku. |
| #66 `(x − sin x)/x³` | k2 | `⟦(−(cos(x) − 1)/3)′/(x²)′⟧` | Przeniesienie /3 do licznika bez słowa. Dziwny zapis −(cos x − 1) zamiast 1 − cos x. | k1: `= lim (1 − cos x)/(3x²)`. k2: `= (1/3)·lim ⟦(1 − cos x)′/(x²)′⟧ = (1/3)·lim sin x/(2x)`. |

Pozostałe drobne punkty z liczby 18: Z11 (licznik po wspólnym mianowniku, #14 i #15), Z12 (różnice przy e, #36, #39, #40, ujęte w Z6), Z13 (#38), Z14 (#66), Z15 (#24), Z16 (#21), Z17 (#52), Z18 (#65).

---

## 5. Zadania bez uwag

Bez uwag poza ogólnym dublem D1 (why w k0 powtarza dymek symbolu):

**0, 1, 2, 5, 7, 8, 9, 10, 11, 13, 41**

Wszystkie pozostałe zadania mają co najmniej jedną uwagę z sekcji 2–4.
