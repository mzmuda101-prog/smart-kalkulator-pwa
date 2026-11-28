# Słaby uczeń — granice, część 1 (g001–g072)

Źródło: `scripts/steps-check/kroki-uczen-granice-1.json` (72 zadania). Matematyki nie oceniałem (robi to SymPy).
Powtarzające się braki zgłaszam raz, w kolumnie id wypisuję wszystkie zadania, w których występują.

Podsumowanie: **2 krytyczne, 16 poważnych, 39 drobnych** (bez wierszy `interaktywnosc`, których jest 72: po jednym na zadanie).
Zadania bez żadnej uwagi poza `interaktywnosc`: **10** (g001, g010, g011, g012, g016, g035, g037, g039, g043, g053).

## Uwagi

| id | dział | zadanie (q) | krok k | kategoria | ważność | cytat | czego brakuje | propozycja zapisu |
|---|---|---|---|---|---|---|---|---|
| g015 | granice | lim n→∞ (5n+∛(n^4+1)+3∜(n)+2)/(3sqrt(2n^2+7)+2n+6∜(n^5+3)+3sqrt(n)+6) | 5 | skok | krytyczna | `→ 1/6 · n^(1/12) → +∞` | Nie widać wstawienia zer ani skąd 1/6; nie widać, że n^(4/3)/n^(5/4) daje n^(1/12) w tym miejscu. | `→ n^(4/3)/n^(5/4) · (∛(1 + 0) + 0 + 0 + 0)/(6∜(1 + 0) + 0 + 0 + 0 + 0) = n^(1/12) · 1/6 → +∞` |
| g048 | granice | lim n→∞ (n+3)^(2n^2+12n)/(n^2+6n)^(n^2+6n) | 2 | skok | krytyczna | `lim(n→∞) ⟦((n² + 6n + 9)/(n² + 6n))^(n² + 6n)⟧` | Nie wiem, skąd n² + 6n + 9 i skąd wykładnik n² + 6n w liczniku: ukryte 2n² + 12n = 2(n² + 6n), potęga potęgi i (n + 3)². | `2n² + 12n = 2(n² + 6n); (n + 3)^(2(n² + 6n)) = ((n + 3)²)^(n² + 6n) = (n² + 6n + 9)^(n² + 6n)` |
| g009 | granice | lim n→∞ ((2n^2+3)^2(5n+2)^5(n+6))/((4n^3+5)^3(3n+7)^2) | 4 | skok | powazna | `1/n · 1 · 2² · 5⁵/(3² · 4³) = 1/n · 12500/576 = 3125/144 · 1/n` | Potęgi, iloczyny i skrócenie przez 4 naraz. | `2² · 5⁵ = 4 · 3125 = 12500, 3² · 4³ = 9 · 64 = 576, 12500/576 = (4 · 3125)/(4 · 144) = 3125/144` |
| g015 | granice | (jak wyżej) | 3 | skok | powazna | `3√(2 + 7/n²)/∜n` | Wyraz 3n√(…) podzielony przez n^(5/4) nie jest rozpisany ani tu, ani w kroku 4. | `3n√(2 + 7/n²)/n^(5/4) = 3√(2 + 7/n²)/n^(5/4 − 1) = 3√(2 + 7/n²)/n^(1/4)` |
| g017, g018 | granice | lim n→∞ ((n^2+5)/(2n+1)-(2n^2+1)/(4n+5)) | 2 | skok | powazna | `(4n³ + 5n² + 20n + 25 − (4n³ + 2n² + 2n + 1))/… = (3n² + 18n + 24)/…` | Mnożenie nawiasów i opuszczenie nawiasu po minusie zrobione w głowie. | `(n² + 5)(4n + 5) = n² · 4n + n² · 5 + 5 · 4n + 5 · 5 = 4n³ + 5n² + 20n + 25; … − (4n³ + 2n² + 2n + 1) = 4n³ − 4n³ + 5n² − 2n² + 20n − 2n + 25 − 1 = 3n² + 18n + 24` |
| g019, g020 | granice | lim n→∞ (log_2(8n+1)-log_2(n+6)) | 3, 4, 5 | nieczytelne | powazna | `lim(n→∞) n(8 + 1/n)/(n(1 + 6/n))` | Logarytm znika z zapisu bez słowa; wygląda, jakby liczyć inną granicę. | `lim(n→∞) log₂(n(8 + 1/n)/(n(1 + 6/n)))` albo tytuł kroku „Liczę granicę ułamka pod logarytmem: (8n + 1)/(n + 6)” |
| g020 | granice | lim n→∞ (log_4(2n^2+3)-2log_4(4n+5)) | 6 | skok | powazna | `→ log₄(1/8) = −3/2` | Nie umiem odgadnąć, że 4 do −3/2 daje 1/8. | `1/8 = 2⁻³ = (4^(1/2))⁻³ = 4^(−3/2), więc log₄(1/8) = −3/2` |
| g028 | granice | lim n→∞ (sqrt(n^4+n^3)+sqrt(n^4-n^3)-2n^2) | 2 | skok | powazna | `(√(n⁴ + n³) − 2n² + √(n⁴ − n³))(2n² + (√(n⁴ + n³) + √(n⁴ − n³)))` | Nie powiedziano, co jest a, a co b we wzorze (a − b)(a + b); trzeba samemu zgrupować dwa pierwiastki. | `a = √(n⁴ + n³) + √(n⁴ − n³), b = 2n²: (a − b)(a + b) = a² − b² = (√(n⁴ + n³) + √(n⁴ − n³))² − 4n⁴` |
| g028 | granice | (jak wyżej) | 3 | skok | powazna | `= (n⁴ + n³) + 2√(n⁸ − n⁶) + (n⁴ − n³) − 4n⁴` | Kwadrat sumy i iloczyn pierwiastków zrobione w głowie. | `(√(n⁴ + n³) + √(n⁴ − n³))² = (n⁴ + n³) + 2√(n⁴ + n³) · √(n⁴ − n³) + (n⁴ − n³); √(n⁴ + n³) · √(n⁴ − n³) = √((n⁴)² − (n³)²) = √(n⁸ − n⁶)` |
| g028 | granice | (jak wyżej) | 3 | dlaczego-falszywe | powazna | `Pierwiastek podniesiony do swojej potęgi znika, więc w liczniku zostaje zwykłe odejmowanie.` | W wyniku zostaje pierwiastek 2√(n⁸ − n⁶), więc zdanie przeczy krokowi. | why: `Podnoszę sumę do kwadratu wzorem (a + b)² = a² + 2ab + b²; kwadraty pierwiastków znikają, a iloczyn 2ab zostaje pod pierwiastkiem.` |
| g029, g030, g031, g032 | granice | lim n→∞ (∛(n^3+8n^2)-∛(n^3+2n^2)) | 2 (g031: 3) | skok | powazna | `ab = ∛(n⁶ + 10n⁵ + 16n⁴)` | Iloczyn wielomianów pod pierwiastkiem wymnożony w głowie (g030: `ab = ∛4∛(16n⁶ + 2n⁵ − 5n⁴)`, g032: `a²b = √(n⁴ + 7n³) · ∜(n⁴ − n³)`). | `ab = ∛((n³ + 8n²)(n³ + 2n²)) = ∛(n⁶ + 2n⁵ + 8n⁵ + 16n⁴) = ∛(n⁶ + 10n⁵ + 16n⁴)` |
| g029, g030, g031, g032, g033 | granice | lim n→∞ (∛(n^3+8n^2)-∛(n^3+2n^2)) | 6 (g030: 7, g031: 7, g032: 6, g033: 7) | skok | powazna | `n²((1 + 8/n)^(2/3) + …` | Krok „Wyciągamy n spod pierwiastka” rozpisuje tylko ab; wyłączenie n z potęg ^(2/3) i ^(3/4) jest w głowie. | `(n³ + 8n²)^(2/3) = (n³(1 + 8/n))^(2/3) = (n³)^(2/3) · (1 + 8/n)^(2/3) = n²(1 + 8/n)^(2/3)` |
| g033, g030, g031 | granice | lim n→∞ (2n-∜(16n^4+40n^3+1)) | 9 | skok | powazna | `(4∜16 + 2√16 + 16^(3/4) + 8) = −(40 + 0)/(8 + 8 + 8 + 8)` | Trzy wartości pierwiastków i potęg ułamkowych naraz (g030: `8^(2/3)`, `∛64`; g031: `27^(2/3)`). | `4∜16 = 4 · 2 = 8, 2√16 = 2 · 4 = 8, 16^(3/4) = (∜16)³ = 2³ = 8` |
| g045, g047, g050, g052, g041 | granice | lim n→∞ ((5n+7)/(5n-8))^n | 2 | skok | powazna | `⟦n · ((5n + 7)/(5n − 8) − 1)⟧ = n · (15/(5n − 8))` | Odjęcie 1 od ułamka zrobione w głowie (g050: `−3(n − 2)/(n² + 5n + 1)`, z wyłączeniem −3). | `(5n + 7)/(5n − 8) − 1 = (5n + 7 − (5n − 8))/(5n − 8) = 15/(5n − 8)` |
| g046, g047 | granice | lim n→∞ ((2n+sqrt(n))/(2n+7sqrt(n)))^(2+sqrt(n)) | 5 (g047: 4) | skok | powazna | `lim(n→∞) −6n(1 + 2/√n)/(n(2 + 7/√n))` | √n · √n = n i 2√n/n = 2/√n zrobione w głowie. | `−6√n(√n + 2) = −6(n + 2√n) = −6n(1 + 2√n/n) = −6n(1 + 2/√n)` |
| g054, g056 | granice | lim x→∞ x/sqrt(3x^2+5) (de l'Hospital) | 2 | zargon | powazna | `(1)/(1/(2√(3x² + 5)) · (3x² + 5)′)` | Pochodna pierwiastka z funkcji wewnętrznej bez dymku; tego nie znam. | dymek: `(√u)′ = 1/(2√u) · u′; u = 3x² + 5, u′ = 6x` |
| g057 | granice | lim x→-∞ (sqrt(4x^2-3x)+2x) | 9 | skok | powazna | `lim(x→−∞) −3(−x)/(−(−x)(√(4 − 3/x) + 2))` | Wyłączenie −(−x) z mianownika zrobione w głowie. | `2x − √(4x² − 3x) = −2(−x) − (−x)√(4 − 3/x) = −(−x)(2 + √(4 − 3/x))` |
| g058, g059 | granice | lim x→-∞ (sqrt(8x^2+x)-sqrt(8x^2-5x)) | 10 (g059: 9) | skok | powazna | `−6/(2√8) = −6/(4√2) = −3√2/4` | √8 = 2√2, skrócenie i usunięcie pierwiastka z mianownika naraz. | `√8 = √(4 · 2) = 2√2; −6/(4√2) = −3/(2√2) = −3√2/(2√2 · √2) = −3√2/4` |
| g002–g007, g009, g014, g015, g025, g028 | granice | lim n→∞ (8n^5+2n^3+n^2+3)/(4n^5+3n^4+7n+5) | 2 | skok | drobna | `n⁵(8 + 2/n² + 1/n³ + 3/n⁵)` | Dzielenie każdego wyrazu przez n⁵ w głowie (g005/g007: dzielenie przez n⁴ / n⁵). | `8n⁵ + 2n³ + n² + 3 = n⁵(8n⁵/n⁵ + 2n³/n⁵ + n²/n⁵ + 3/n⁵) = n⁵(8 + 2/n² + 1/n³ + 3/n⁵)` |
| g008 | granice | lim n→∞ ((3n+1)^2(4n+5))/((2n+3)^2(3n+4)) | 5 | skok | drobna | `3² · 4/(2² · 3) = 36/12` | Dwa iloczyny z potęgami naraz. | `3² · 4/(2² · 3) = (9 · 4)/(4 · 3) = 36/12 = 3` |
| g009 | granice | (jak wyżej) | 2, 3 | nieczytelne | drobna | `(3n + 7)²(4n³ + 5)³ = …` | Kolejność czynników zmieniona względem polecenia, w kroku 3 `(1 + 6/n)` przeskakuje na początek; trudno porównać. | `(4n³ + 5)³(3n + 7)² = (n³(4 + 5/n³))³ · (n(3 + 7/n))² = n⁹(4 + 5/n³)³ · n²(3 + 7/n)² = n¹¹(4 + 5/n³)³(3 + 7/n)²` |
| g013, g014, g015, g018, g046, g047 | granice | lim n→∞ (n+sqrt(n)+3)/(sqrt(4n^2+3)+3n+2sqrt(n)+4) | 4 | nieczytelne | drobna | `n^(1/2)/n = 1/n^(1 − 1/2) = 1/n^(1/2)` | Krok tłumaczy dzielenie potęg dopiero po kroku, który już użył wyniku (krok 3 ma `1/√n`). | w kroku 3: `√n/n = n^(1/2)/n¹ = 1/n^(1 − 1/2) = 1/√n` |
| g013, g014, g015, g018, g046, g047 | granice | (jak wyżej) | 4 | zargon | drobna | `n^(1/2)` | Zapis n^(1/2) pojawia się bez połączenia z √n z poprzednich kroków. | `√n = n^(1/2), więc √n/n = n^(1/2)/n = 1/n^(1/2) = 1/√n` |
| g015 | granice | (jak wyżej) | 2 | skok | drobna | `∛(n⁴(1 + 1/n⁴)) = n∛n · ∛(1 + 1/n⁴)`, `n^(5/4)∜(1 + 3/n⁵)` | ∛n⁴ = n∛n w głowie; dwa różne zapisy tej samej rzeczy (n∛n i n^(5/4)). | `∛n⁴ = ∛(n³ · n) = n∛n = n^(4/3); ∜n⁵ = ∜(n⁴ · n) = n∜n = n^(5/4)` |
| g015 | granice | (jak wyżej) | 4 | skok | drobna | `3/n^(4/3 − 1/4) = 3/n^(13/12)`, `n^(4/3 − 5/4) = n^(1/12)` | Odejmowanie ułamków w wykładniku w głowie. | `4/3 − 1/4 = 16/12 − 3/12 = 13/12; 4/3 − 5/4 = 16/12 − 15/12 = 1/12` |
| g017, g018 | granice | (jak wyżej) | 4 | skok | drobna | `lim(n→∞) 3n²(1 + 6/n + 8/n²)/…` | Wyłączenie 3 (g018: 2) przed nawias niewidoczne. | `3n² + 18n + 24 = 3(n² + 6n + 8) = 3n²(1 + 6/n + 8/n²)` |
| g019 | granice | lim n→∞ (log_2(8n+1)-log_2(n+6)) | 6 | skok | drobna | `→ log₂(8) = 3` | Brak pokazania 8 jako potęgi 2. | `log₂(8) = log₂(2³) = 3` |
| g021–g033, g057, g058, g059 | granice | lim n→∞ (sqrt(2n+5)-sqrt(2n+1)) | 3 | dlaczego-falszywe | drobna | `Pierwiastek podniesiony do swojej potęgi znika, więc w liczniku zostaje zwykłe odejmowanie.` | Pierwiastek zniknął już w poprzednim kroku; tu jest tylko opuszczenie nawiasu po minusie, które też nie jest rozpisane. | why: `Opuszczam nawias po minusie, zmieniając znaki w środku.`; math: `2n + 5 − (2n + 1) = 2n + 5 − 2n − 1 = 4` |
| g021, g022, g027, g029–g033, g057, g058 | granice | lim n→∞ (sqrt(2n+5)-sqrt(2n+1)) | 2 | nieczytelne | drobna | `Licznik i mianownik mnożymy przez to samo, więc wartość ułamka się nie zmienia.` | Wyrażenie nie jest ułamkiem; nie wiem, gdzie jest licznik. | `√(2n + 5) − √(2n + 1) = (√(2n + 5) − √(2n + 1))/1 · (√(2n + 5) + √(2n + 1))/(√(2n + 5) + √(2n + 1))` |
| g021 | granice | lim n→∞ (sqrt(2n+5)-sqrt(2n+1)) | 6 | dlaczego-falszywe | drobna | `Góra i dół mają różne potęgi, więc każdą wyciągamy osobno.` | Na górze jest sama liczba 4, nic się nie wyciąga. | why: `Licznik to liczba 4, więc √n wyłączam tylko z mianownika.` |
| g023 | granice | lim n→∞ n(sqrt(4n^2+7)-sqrt(4n^2+2)) | 2 | nieczytelne | drobna | `n(√(4n² + 7) − √2√(2n² + 1))` | Objazd przez √2 niczego nie upraszcza i myli w kroku 3. | `(√(4n² + 7) − √(4n² + 2))(√(4n² + 7) + √(4n² + 2)) = 4n² + 7 − (4n² + 2) = 5` |
| g024 | granice | lim n→∞ 1/(sqrt(n+sqrt(n))-sqrt(n-1)) | 1 | nieczytelne | drobna | `Sprawdzamy, do czego zbliża się wyrażenie, gdy zmienna zbliża się do celu.` | Brak symbolu; nie widać, czemu w ogóle mnożyć przez sprzężenie. | `√(n + √n) → +∞, √(n − 1) → +∞, mianownik: [∞ − ∞]` |
| g025 | granice | lim n→∞ sqrt(n)/(sqrt(n^2+7n sqrt(n)+4)-sqrt(n^2+3n sqrt(n)+1)) | 7 | skok | drobna | `lim(n→∞) n√n(√(1 + 7/√n + 4/n²) + …` | √n razy n√(…) daje n√n: niewidoczne. | `√n(n√(1 + 7/√n + 4/n²) + n√(1 + 3/√n + 1/n²)) = n√n(√(1 + 7/√n + 4/n²) + √(1 + 3/√n + 1/n²))` |
| g026 | granice | lim n→∞ (sqrt(n+5)-sqrt(n+3))/(sqrt(4n+9)-sqrt(4n-7)) | 1, 2 | skok | drobna | `[⟦0/0⟧]` a w kroku 2 `Tu wychodzi $\infty-\infty$.` | Nie widać, czemu licznik i mianownik dążą do 0; kłóci się z „∞ − ∞”. | `√(n + 5) − √(n + 3) → [∞ − ∞], √(4n + 9) − √(4n − 7) → [∞ − ∞]` |
| g026 | granice | (jak wyżej) | 9 | skok | drobna | `lim(n→∞) (√(4n + 9) + √(4n − 7))/(8(√(n + 5) + √(n + 3)))` | Mnożenie ułamków i skrócenie 2/16 naraz. | `(…)/16 · 2/(…) = 2(…)/(16(…)) = (…)/(8(…))` |
| g027, g028 | granice | lim n→∞ (sqrt(n^2+9n)-2sqrt(n^2+1)+sqrt(n^2+5n)) | 1 | dlaczego-falszywe | drobna | `Oba składniki uciekają do nieskończoności` | Składniki są trzy. | `√(n² + 9n) → +∞, 2√(n² + 1) → +∞, √(n² + 5n) → +∞: [∞ − ∞ + ∞]` |
| g027 | granice | (jak wyżej) | 2 | skok | drobna | `[(√(n² + 9n) − √(n² + 1)) + (√(n² + 5n) − √(n² + 1))]` | Rozbicie −2√ na dwa razy −√ niewidoczne. | `−2√(n² + 1) = −√(n² + 1) − √(n² + 1)` |
| g028 | granice | (jak wyżej) | 5 | dlaczego-falszywe | drobna | `żeby w nawiasie $x$ stał na początku, tak jak na dole` | W zadaniu nie ma x, a na dole nie ma takiego nawiasu. | why: `Wyłączam −2, żeby dostać różnicę n⁴ − √(n⁸ − n⁶), którą znów pomnożę przez sprzężenie.` |
| g028 | granice | (jak wyżej) | 9 | dlaczego-falszywe | drobna | `Łączę dwa ułamki w jeden, a liczby od razu skracam.` | Nic się tu nie skraca. | why: `Łączę dwa ułamki w jeden: licznik razy licznik, mianownik razy mianownik.` |
| g029–g033 | granice | lim n→∞ (∛(n^3+8n^2)-∛(n^3+2n^2)) | 2 | zargon | drobna | `a² = (n³ + 8n²)^(2/3)` | Potęga ułamkowa zamiast kwadratu pierwiastka bez wyjaśnienia. | `a² = (∛(n³ + 8n²))² = ∛((n³ + 8n²)²) = (n³ + 8n²)^(2/3)` |
| g023, g030, g031 | granice | lim n→∞ (∛(8n^3+5n^2)-∛(8n^3-4n^2)) | 2 | dlaczego-falszywe | drobna | `nawet gdy ten dzielnik nie jest kwadratem` | Przy ∛ chodzi o sześcian; wyłączenia wspólnego dzielnika nie widać. | `8n³ − 4n² = 4(2n³ − n²), więc ∛(8n³ − 4n²) = ∛4 · ∛(2n³ − n²)` |
| g031, g033 | granice | lim n→∞ (2n-∜(16n^4+40n^3+1)) | 2 | skok | drobna | `(⟦16n⁴ − (16n⁴ + 40n³ + 1)⟧)` | a⁴ = (2n)⁴ = 16n⁴ w głowie (g031: a³ i b³). | `a⁴ − b⁴ = (2n)⁴ − (16n⁴ + 40n³ + 1) = 16n⁴ − (16n⁴ + 40n³ + 1)` |
| g033 | granice | (jak wyżej) | 5 | dlaczego-falszywe | drobna | `Zmieniam znak na dole, żeby pierwszy wyraz stał tam z plusem.` | Minus wychodzi z licznika, nie z mianownika. | why: `Wyłączam minus z licznika i stawiam go przed ułamkiem.`; math: `−40n³ − 1 = −(40n³ + 1)` |
| g038, g040, g044, g046, g048, g049, g051 | granice | lim n→∞ ((5n+7)/(5n-8))^n (Dorabianie jedynki) | 2 | skok | drobna | `(5n + 7)/(5n − 8) = 1 + 15/(5n − 8)` | Nie widać, czemu ułamek to 1 plus różnica przez mianownik. | `(5n + 7)/(5n − 8) = ((5n − 8) + 15)/(5n − 8) = 1 + 15/(5n − 8)` |
| g038, g040, g044, g046, g049, g051 | granice | (jak wyżej) | 2 | skok | drobna | `r = n/((5n − 8)/15) = 15n/(5n − 8)` | Dzielenie przez ułamek w głowie. | `n : (5n − 8)/15 = n · 15/(5n − 8) = 15n/(5n − 8)` |
| g034, g036, g038, g040, g042, g044, g046, g048, g049, g051 | granice | (jak wyżej) | 3 | zargon | drobna | `(⟦(1 + 15/(5n − 8))^((5n − 8)/15)⟧)^(15n/(5n − 8))` | Potęga potęgi bez wzoru; nie widać, że to wciąż to samo co (…)^n. | `((1 + 1/aₙ)^(aₙ))^r = (1 + 1/aₙ)^(aₙ · r) = (1 + 15/(5n − 8))^n` |
| g054, g056 | granice | lim x→∞ x/sqrt(3x^2+5) (de l'Hospital) | 4–6 | nieczytelne | drobna | `x√(3 + 5/x²)/(3x(1))`, `3(−x)(−1)` | Dziwne „(1)” w mianowniku. | `lim(x→∞) x√(3 + 5/x²)/(3x)` |
| g055–g058 | granice | lim x→-∞ x/sqrt(3x^2+5) | 3 | skok | drobna | `√((−x)²(3 + 5/x²))` | Zamiana x² na (−x)² bez słowa. | `3x² + 5 = x²(3 + 5/x²) = (−x)²(3 + 5/x²), bo x² = (−x)²` |
| g057 | granice | lim x→-∞ (sqrt(4x^2-3x)+2x) | 5 | dlaczego-falszywe | drobna | `Minus sprzed ułamka chowam w jednej jego części` | Przed ułamkiem nie ma minusa; minus jest w liczniku. | `−3x/(√(4x² − 3x) − 2x) = 3x/(−(√(4x² − 3x) − 2x)) = 3x/(2x − √(4x² − 3x))` |
| g059 | granice | lim x→-∞ sqrt(7-2x)(sqrt(15-8x)-sqrt(3-8x)) | 6 | skok | drobna | `√(7 − 2x) = √((−x)(2 − 7/x))` | Wyłączenie liczby ujemnej (−x) i znak przy 7/x w głowie. | `7 − 2x = (−x) · 2 + (−x) · (7/(−x)) = (−x)(2 − 7/x)` |
| g060, g062, g063, g065, g066, g068, g069, g071, g072 | granice | lim x→4 (x^2-6x+8)/(3x^2-10x-8) | 10 (g062: 3) | dlaczego-falszywe | drobna | dymek `x^{4}-1=(x-1)(x+1)(x^{2}+1)` i `Czynnik kwadratowy zostaje w całości, gdy nie ma miejsc zerowych` | Dymek mówi o innym wielomianie i nie pasuje do kroku; pole `here` puste. | here: `x² − 6x + 8 = (x − 2)(x − 4), 3x² − 10x − 8 = (3x + 2)(x − 4)` |
| g060, g063, g069 | granice | lim x→4 (x^2-6x+8)/(3x^2-10x-8) | 7 (g063: 5, g069: 14) | skok | drobna | `x₁ = ⟦(10 − 14) / (2 · 3)⟧` | −b = −(−10) = 10 w głowie. | `x₁ = (−(−10) − 14)/(2 · 3) = (10 − 14)/6 = −4/6 = −2/3` |
| g061 | granice | lim x→4 (x^2-6x+8)/(3x^2-10x-8) (de l'Hospital) | 2 | skok | drobna | `= lim(x→4) (x − 3)/(3x − 5)` | Skrócenie przez 2 niewidoczne. | `(2x − 6)/(6x − 10) = 2(x − 3)/(2(3x − 5)) = (x − 3)/(3x − 5)` |
| g061, g064, g067, g070 | granice | lim x→3 (2x^2-5x-3)/(x^3-27) (de l'Hospital) | 2 | skok | drobna | `= lim(x→3) (4x − 5)/(3x²)` | Pochodna wielomianu podana od razu, bez wzoru na pochodną potęgi. | dymek: `(xᵏ)′ = k · xᵏ⁻¹`; math: `(2x² − 5x − 3)′ = 2 · 2x − 5 · 1 − 0 = 4x − 5` |
| g064 | granice | (jak wyżej) | 3 | skok | drobna | `(12 − 5)/27` | 3 · 3² = 27 w głowie. | `(4 · 3 − 5)/(3 · 3²) = (12 − 5)/(3 · 9) = 7/27` |
| g069 | granice | lim x→2 (x^3+3x^2-6x-8)/(2x^3+x^2-7x-6) | 2, 8 | skok | drobna | `W(−1) = −1 + 3 + 6 − 8 = 0`, `W(−1) = −2 + 1 + 7 − 6 = 0` | Brak wstawionych liczb; w mianowniku brak listy dzielników. | `W(−1) = (−1)³ + 3 · (−1)² − 6 · (−1) − 8 = −1 + 3 + 6 − 8 = 0`; mianownik: `dzielniki −6: ±1, ±2, ±3, ±6; W(−1) = 2 · (−1)³ + (−1)² − 7 · (−1) − 6 = −2 + 1 + 7 − 6 = 0` |
| g069 | granice | (jak wyżej) | 19 | nieczytelne | drobna | `lim(x→2) (x + 1)(x + 4)/((x + 1)(2x + 3))` | Wspólny nawias (x + 1) zostaje nieskrócony i wraca w podstawianiu. | `= lim(x→2) (x + 4)/(2x + 3) = (2 + 4)/(2 · 2 + 3) = 6/7` |

### Interaktywność (po jednym wierszu na zadanie)

Wspólne dla prawie wszystkich zadań: pola `here` dymków „Wyłączenie najwyższej potęgi”, „Granice podstawowe”, „Sprzężenie”, „Redukcja”, „Wzór na liczbę e” są puste, więc stuknięcie w dymek nie pokazuje liczb z tego zadania. Poniżej, co jeszcze mogłoby odsłonić lekkie stuknięcie.

| id | dział | zadanie (q) | krok k | kategoria | ważność | cytat | czego brakuje | propozycja zapisu |
|---|---|---|---|---|---|---|---|---|
| g001 | granice | lim n→∞ (2n+1)/(6n+5) | 2, 4 | interaktywnosc | drobna | `n(2 + 1/n)` | Stuknięcie nawiasu: dzielenie wyrazów. | `2n + 1 = n(2n/n + 1/n)`; stuknięcie `2/6`: `2/6 = 1/3` |
| g002 | granice | lim n→∞ (n^2+3n+4)/(2n^2+5n+1) | 2 | interaktywnosc | drobna | `n²(1 + 3/n + 4/n²)` | Stuknięcie nawiasu: dzielenie przez n². | `3n/n² = 3/n, 4/n² = 4/n²` |
| g003 | granice | lim n→∞ (8n^5+...)/(4n^5+...) | 2 | interaktywnosc | drobna | `n⁵(8 + 2/n² + …)` | Stuknięcie nawiasu: dzielenie przez n⁵. | `2n³/n⁵ = 2/n², n²/n⁵ = 1/n³` |
| g004 | granice | lim n→∞ (n^3+…)/(n^4+…) (Najwyższa potęga) | 3 | interaktywnosc | drobna | `n³/n⁴ · …` | Stuknięcie `1/n`: dzielenie potęg. | `n³/n⁴ = 1/n^(4 − 3) = 1/n` |
| g005 | granice | (Dzielenie przez najwyższą potęgę) | 2 | interaktywnosc | drobna | `(1/n + 4/n² + …)` | Stuknięcie ułamka: każdy wyraz podzielony przez n⁴. | `n³/n⁴ = 1/n, 4n²/n⁴ = 4/n²` |
| g006 | granice | lim n→∞ (n^5+…)/(n^3+…) (Najwyższa potęga) | 3 | interaktywnosc | drobna | `n⁵/n³ … = n²` | Stuknięcie `n²`: odejmowanie wykładników. | `n⁵/n³ = n^(5 − 3) = n²` |
| g007 | granice | (Dzielenie przez najwyższą potęgę) | 3 | interaktywnosc | drobna | `[1/0⁺]` | Stuknięcie `0⁺`: definicja (dodatnie, coraz bliżej 0). | `1/n² > 0 dla każdego n, więc mianownik → 0 od strony dodatniej` |
| g008 | granice | lim n→∞ ((3n+1)^2(4n+5))/… | 2, 5 | interaktywnosc | drobna | `n²(3 + 1/n)² · n(4 + 5/n)`, `36/12` | Stuknięcie n³: dodawanie wykładników; stuknięcie 36/12: iloczyny. | `n² · n = n^(2 + 1) = n³`; `9 · 4 = 36, 4 · 3 = 12` |
| g009 | granice | lim n→∞ ((2n^2+3)^2(5n+2)^5(n+6))/… | 2, 4 | interaktywnosc | drobna | `n¹⁰`, `12500/576` | Stuknięcie n¹⁰: 4 + 5 + 1; stuknięcie ułamka: potęgi liczb. | `n⁴ · n⁵ · n = n^(4 + 5 + 1) = n¹⁰`; `5⁵ = 3125, 4³ = 64` |
| g010 | granice | lim n→∞ (sqrt(n+3)+5)/(…) | 3 | interaktywnosc | drobna | `3 + 7/√n` | Stuknięcie: skąd 3 i 7/√n. | `3√n/√n = 3, 7/√n` |
| g011 | granice | lim n→∞ (sqrt(n)+7)/(…) | 3 | interaktywnosc | drobna | `(1 + 7/√n)` | Stuknięcie: dzielenie przez √n. | `√n/√n = 1, 7/√n` |
| g012 | granice | lim n→∞ (4n+1)/(3n+sqrt(4n^2+3)+5) | 3 | interaktywnosc | drobna | `n(√(4 + 3/n²) + 3 + 5/n)` | Stuknięcie: przestawienie wyrazów. | `3n + n√(4 + 3/n²) + 5 = n(√(4 + 3/n²) + 3 + 5/n)` |
| g013 | granice | lim n→∞ (n+sqrt(n)+3)/(…) | 3 | interaktywnosc | drobna | `1/√n` | Stuknięcie `1/√n` mogłoby pokazać krok 4 w miejscu użycia. | `√n/n = 1/√n` |
| g014 | granice | lim n→∞ (sqrt(9n^3+7)+…)/(n sqrt(n)+…) | 2, 3 | interaktywnosc | drobna | `n√n · √(9 + 7/n³)` | Stuknięcie: √n³ = n√n. | `√n³ = √(n² · n) = n√n` |
| g015 | granice | lim n→∞ (5n+∛(n^4+1)+…)/(…) | 3, 5 | interaktywnosc | drobna | `1/6 · n^(1/12)` | Stuknięcie 1/6: wstawienie zer; stuknięcie n^(1/12): odejmowanie wykładników. | `16/12 − 15/12 = 1/12` |
| g016 | granice | lim n→∞ (n^3-5n^2) | 2 | interaktywnosc | drobna | `n³(1 − 5/n)` | Stuknięcie: 5n²/n³. | `5n²/n³ = 5/n` |
| g017 | granice | lim n→∞ ((n^2+5)/(2n+1)-…) | 2 | interaktywnosc | drobna | `4n³ + 5n² + 20n + 25` | Stuknięcie: mnożenie nawiasów. | `(n² + 5)(4n + 5) = 4n³ + 5n² + 20n + 25` rozpisane |
| g018 | granice | lim n→∞ ((n+3)/(sqrt(n)+1)-…) | 2 | interaktywnosc | drobna | `n√n + 5n + 3√n + 15` | Stuknięcie: mnożenie nawiasów. | `n · √n + n · 5 + 3 · √n + 3 · 5` |
| g019 | granice | lim n→∞ (log_2(8n+1)-log_2(n+6)) | 6 | interaktywnosc | drobna | `log₂(8) = 3` | Stuknięcie: definicja logarytmu. | `2³ = 8` |
| g020 | granice | lim n→∞ (log_4(2n^2+3)-2log_4(4n+5)) | 2, 6 | interaktywnosc | drobna | `log₄((2n² + 3)/(4n + 5)²)`, `−3/2` | Stuknięcie: 2log = log kwadratu; −3/2 jako potęga. | `2log₄(4n + 5) = log₄(4n + 5)²`; `4^(−3/2) = 1/8` |
| g021 | granice | lim n→∞ (sqrt(2n+5)-sqrt(2n+1)) | 7 | interaktywnosc | drobna | `4/(2√2)` | Stuknięcie: usuwanie pierwiastka z mianownika. | `2/√2 = 2√2/2 = √2` |
| g022 | granice | lim n→∞ (sqrt(3n^2+17n)-sqrt(3n^2+5n)) | 8 | interaktywnosc | drobna | `6/√3 = 6√3/(√3 · √3)` | Stuknięcie: √3 · √3 = 3. | `6√3/3 = 2√3` |
| g023 | granice | lim n→∞ n(sqrt(4n^2+7)-sqrt(4n^2+2)) | 2 | interaktywnosc | drobna | `√2√(2n² + 1)` | Stuknięcie: wyłączenie 2. | `4n² + 2 = 2(2n² + 1)` |
| g024 | granice | lim n→∞ 1/(sqrt(n+sqrt(n))-sqrt(n-1)) | 6 | interaktywnosc | drobna | `√(n(1 + 1/√n))` | Stuknięcie: √n/n = 1/√n. | `n + √n = n(1 + √n/n) = n(1 + 1/√n)` |
| g025 | granice | lim n→∞ sqrt(n)/(…) | 6 | interaktywnosc | drobna | `7/√n` | Stuknięcie: 7n√n/n². | `7n√n/n² = 7√n/n = 7/√n` |
| g026 | granice | lim n→∞ (sqrt(n+5)-sqrt(n+3))/(…) | 1 | interaktywnosc | drobna | `[⟦0/0⟧]` | Stuknięcie symbolu: dlaczego licznik → 0. | `√(n + 5) − √(n + 3) = 2/(√(n + 5) + √(n + 3)) → 0` |
| g027 | granice | lim n→∞ (sqrt(n^2+9n)-2sqrt(n^2+1)+sqrt(n^2+5n)) | 2 | interaktywnosc | drobna | `[(…) + (…)]` | Stuknięcie: rozbicie −2√. | `−2√(n² + 1) = −√(n² + 1) − √(n² + 1)` |
| g028 | granice | lim n→∞ (sqrt(n^4+n^3)+sqrt(n^4-n^3)-2n^2) | 3 | interaktywnosc | drobna | `2√(n⁸ − n⁶)` | Stuknięcie: iloczyn pierwiastków. | `√(n⁴ + n³) · √(n⁴ − n³) = √(n⁸ − n⁶)` |
| g029 | granice | lim n→∞ (∛(n^3+8n^2)-∛(n^3+2n^2)) | 2 | interaktywnosc | drobna | `ab = ∛(n⁶ + 10n⁵ + 16n⁴)` | Stuknięcie ab: mnożenie pod pierwiastkiem. | `(n³ + 8n²)(n³ + 2n²) = n⁶ + 10n⁵ + 16n⁴` |
| g030 | granice | lim n→∞ (∛(8n^3+5n^2)-∛(8n^3-4n^2)) | 9 | interaktywnosc | drobna | `8^(2/3)` | Stuknięcie: wartość potęgi ułamkowej. | `8^(2/3) = (∛8)² = 2² = 4` |
| g031 | granice | lim n→∞ (∛(27n^3+15n^2)-3n) | 9 | interaktywnosc | drobna | `27^(2/3)` | Stuknięcie: wartość potęgi ułamkowej. | `27^(2/3) = (∛27)² = 3² = 9` |
| g032 | granice | lim n→∞ (∜(n^4+7n^3)-∜(n^4-n^3)) | 2 | interaktywnosc | drobna | `a²b = √(n⁴ + 7n³) · ∜(n⁴ − n³)` | Stuknięcie a²: kwadrat pierwiastka czwartego stopnia. | `(∜u)² = √u` |
| g033 | granice | lim n→∞ (2n-∜(16n^4+40n^3+1)) | 9 | interaktywnosc | drobna | `16^(3/4)` | Stuknięcie: wartość potęgi ułamkowej. | `16^(3/4) = (∜16)³ = 2³ = 8` |
| g034 | granice | lim n→∞ (1-1/n)^n (Dorabianie jedynki) | 3 | interaktywnosc | drobna | `(…)^(−1)` | Stuknięcie: potęga potęgi. | `((1 + 1/(−n))^(−n))^(−1) = (1 + 1/(−n))^n` |
| g035 | granice | lim n→∞ (1-1/n)^n (Wzór skrócony) | 3 | interaktywnosc | drobna | `e^(−1) = 1/e` | Stuknięcie: potęga ujemna. | `a⁻¹ = 1/a` |
| g036 | granice | lim n→∞ (1+1/(2n))^n (Dorabianie jedynki) | 3 | interaktywnosc | drobna | `e^(1/2) = √e` | Stuknięcie: potęga 1/2. | `a^(1/2) = √a` |
| g037 | granice | (Wzór skrócony) | 2 | interaktywnosc | drobna | `n · (1/(2n)) = 1/2` | Stuknięcie: skracanie n. | `n/(2n) = 1/2` |
| g038 | granice | lim n→∞ ((n+4)/n)^(n+5) (Dorabianie jedynki) | 2 | interaktywnosc | drobna | `r = (n + 5)/(n/4)` | Stuknięcie r: dzielenie przez ułamek. | `(n + 5) · 4/n` |
| g039 | granice | (Wzór skrócony) | 2 | interaktywnosc | drobna | `((n + 4)/n − 1)` | Stuknięcie: odjęcie 1. | `(n + 4 − n)/n = 4/n` |
| g040 | granice | lim n→∞ (n/(n+3))^(2n) (Dorabianie jedynki) | 2 | interaktywnosc | drobna | `1 + (−3/(n + 3))` | Stuknięcie: dorobienie jedynki. | `n/(n + 3) = ((n + 3) − 3)/(n + 3)` |
| g041 | granice | (Wzór skrócony) | 2 | interaktywnosc | drobna | `2n · (−3/(n + 3))` | Stuknięcie: f − 1. | `n/(n + 3) − 1 = (n − (n + 3))/(n + 3) = −3/(n + 3)` |
| g042 | granice | lim n→∞ (1-1/n^2)^n (Dorabianie jedynki) | 6 | interaktywnosc | drobna | `e⁰ = 1` | Stuknięcie: potęga zerowa. | `a⁰ = 1` |
| g043 | granice | (Wzór skrócony) | 2 | interaktywnosc | drobna | `n · (−1/n²) = −1/n` | Stuknięcie: skrócenie n. | `n/n² = 1/n` |
| g044 | granice | lim n→∞ ((5n+7)/(5n-8))^n (Dorabianie jedynki) | 2 | interaktywnosc | drobna | `r = n/((5n − 8)/15)` | Stuknięcie r: dzielenie przez ułamek. | `n · 15/(5n − 8)` |
| g045 | granice | (Wzór skrócony) | 2 | interaktywnosc | drobna | `15/(5n − 8)` | Stuknięcie: f − 1 na wspólnym mianowniku. | `(5n + 7 − 5n + 8)/(5n − 8)` |
| g046 | granice | lim n→∞ ((2n+sqrt(n))/(2n+7sqrt(n)))^(2+sqrt(n)) (Dorabianie jedynki) | 5 | interaktywnosc | drobna | `−6n(1 + 2/√n)` | Stuknięcie: √n · √n. | `√n · √n = n` |
| g047 | granice | (Wzór skrócony) | 2 | interaktywnosc | drobna | `−6√n/(2n + 7√n)` | Stuknięcie: f − 1. | `(2n + √n − 2n − 7√n)/(2n + 7√n) = −6√n/(2n + 7√n)` |
| g048 | granice | lim n→∞ (n+3)^(2n^2+12n)/(n^2+6n)^(n^2+6n) | 2 | interaktywnosc | drobna | `(n² + 6n + 9)` | Stuknięcie: kwadrat sumy i podwojony wykładnik. | `(n + 3)² = n² + 6n + 9` |
| g049 | granice | lim n→∞ ((n^2+2n+7)/(n^2+5n+1))^(2n-1) (Dorabianie jedynki) | 2 | interaktywnosc | drobna | `−3n + 6 = −3(n − 2)` | Stuknięcie: różnica nawiasów. | `n² − n² + 2n − 5n + 7 − 1` |
| g050 | granice | (Wzór skrócony) | 2 | interaktywnosc | drobna | `−3(n − 2)/(n² + 5n + 1)` | Stuknięcie: f − 1. | `(n² + 2n + 7 − (n² + 5n + 1))/(n² + 5n + 1)` |
| g051 | granice | lim n→∞ ((3n^2+4n+1)/(3n^2-2n+5))^(4n+3) (Dorabianie jedynki) | 2 | interaktywnosc | drobna | `6n − 4 = 2(3n − 2)` | Stuknięcie: różnica nawiasów. | `4n − (−2n) = 6n, 1 − 5 = −4` |
| g052 | granice | (Wzór skrócony) | 2 | interaktywnosc | drobna | `2(3n − 2)/(3n² − 2n + 5)` | Stuknięcie: f − 1. | `(3n² + 4n + 1 − (3n² − 2n + 5))/(3n² − 2n + 5)` |
| g053 | granice | lim x→∞ x/sqrt(3x^2+5) (Najwyższa potęga) | 5 | interaktywnosc | drobna | `√3/(√3 · √3)` | Stuknięcie: usuwanie pierwiastka z mianownika. | `1/√3 = (1 · √3)/(√3 · √3) = √3/3` |
| g054 | granice | (de l'Hospital) | 2 | interaktywnosc | drobna | `1/(2√(3x² + 5)) · (3x² + 5)′` | Stuknięcie: wzór na pochodną pierwiastka. | `(√u)′ = u′/(2√u)` |
| g055 | granice | lim x→-∞ x/sqrt(3x^2+5) (Najwyższa potęga) | 3 | interaktywnosc | drobna | `(−x)√(3 + 5/x²)` | Stuknięcie: x² = (−x)². | `x² = (−x)²` |
| g056 | granice | (de l'Hospital) | 6 | interaktywnosc | drobna | `3(−x)(−1)` | Stuknięcie: skąd (−1). | `3x = 3 · (−1) · (−x)` |
| g057 | granice | lim x→-∞ (sqrt(4x^2-3x)+2x) | 9 | interaktywnosc | drobna | `−(−x)(√(4 − 3/x) + 2)` | Stuknięcie: wyłączenie −(−x). | `2x − (−x)√(…) = −2(−x) − (−x)√(…)` |
| g058 | granice | lim x→-∞ (sqrt(8x^2+x)-sqrt(8x^2-5x)) | 10 | interaktywnosc | drobna | `−6/(4√2)` | Stuknięcie: √8 = 2√2. | `√8 = √(4 · 2) = 2√2` |
| g059 | granice | lim x→-∞ sqrt(7-2x)(sqrt(15-8x)-sqrt(3-8x)) | 6 | interaktywnosc | drobna | `√((−x)(2 − 7/x))` | Stuknięcie: sprawdzenie mnożeniem. | `(−x)(2 − 7/x) = −2x + 7` |
| g060 | granice | lim x→4 (x^2-6x+8)/(3x^2-10x-8) (Rozkład) | 8 | interaktywnosc | drobna | `3⟦(x + 2/3)(x − 4)⟧` | Stuknięcie: sprawdzenie mnożeniem. | `(3x + 2)(x − 4) = 3x² − 12x + 2x − 8 = 3x² − 10x − 8` |
| g061 | granice | (de l'Hospital) | 2 | interaktywnosc | drobna | `(2x − 6)/(6x − 10)` | Stuknięcie: pochodne wyraz po wyrazie. | `(x²)′ = 2x, (−6x)′ = −6, (8)′ = 0` |
| g062 | granice | (Schemat Hornera) | 3 | interaktywnosc | drobna | `(x − 4)(x − 2)` | Stuknięcie nawiasu: tabelka Hornera z kroku 2. | tabelka `1 −6 8 / 4 −8 / 1 −2 0` przy nawiasie |
| g063 | granice | lim x→3 (2x^2-5x-3)/(x^3-27) (Różnica sześcianów) | 8 | interaktywnosc | drobna | `(x − 3)(x² + 3x + 9)` | Stuknięcie: sprawdzenie mnożeniem. | `(x − 3)(x² + 3x + 9) = x³ + 3x² + 9x − 3x² − 9x − 27 = x³ − 27` |
| g064 | granice | (de l'Hospital) | 2 | interaktywnosc | drobna | `(4x − 5)/(3x²)` | Stuknięcie: pochodne wyraz po wyrazie. | `(2x²)′ = 4x, (x³)′ = 3x², (−27)′ = 0` |
| g065 | granice | (Schemat Hornera) | 3 | interaktywnosc | drobna | `(x − 3)(x² + 3x + 9)` | Stuknięcie nawiasu: tabelka Hornera. | tabelka `1 0 0 −27 / 3 9 27 / 1 3 9 0` przy nawiasie |
| g066 | granice | lim x→2 (x^4-13x^2+36)/(x^3-2x^2+x-2) (Rozkład) | 8 | interaktywnosc | drobna | `(x − 2)(x + 2)(x − 3)(x + 3)` | Stuknięcie: droga przez t. | `t = x²: (t − 4)(t − 9)` |
| g067 | granice | (de l'Hospital) | 2 | interaktywnosc | drobna | `(4x³ − 26x)/(3x² − 4x + 1)` | Stuknięcie: pochodne wyraz po wyrazie. | `(x⁴)′ = 4x³, (−13x²)′ = −26x` |
| g068 | granice | (Schemat Hornera) | 3 | interaktywnosc | drobna | `(x − 2)(x³ + 2x² − 9x − 18)` | Stuknięcie nawiasu: tabelka Hornera. | tabelka licznika przy nawiasie |
| g069 | granice | lim x→2 (x^3+3x^2-6x-8)/(2x^3+x^2-7x-6) (Rozkład) | 2, 8 | interaktywnosc | drobna | `W(−1) = …` | Stuknięcie W(−1): wstawione liczby. | `(−1)³ + 3 · (−1)² − 6 · (−1) − 8` |
| g070 | granice | (de l'Hospital) | 2 | interaktywnosc | drobna | `(3x² + 6x − 6)/(6x² + 2x − 7)` | Stuknięcie: pochodne wyraz po wyrazie. | `(x³)′ = 3x², (3x²)′ = 6x, (−6x)′ = −6` |
| g071 | granice | (Schemat Hornera) | 3 | interaktywnosc | drobna | `(x − 2)(x² + 5x + 4)` | Stuknięcie nawiasu: tabelka Hornera. | tabelka licznika przy nawiasie |
| g072 | granice | lim x→1 (x^4-3x^2+4x-2)/(3x^5+4x^3+x^2-8) | 3, 5 | interaktywnosc | drobna | `(x − 1)(x³ + x² − 2x + 2)` | Stuknięcie nawiasu: tabelka Hornera z kroku obok. | tabelka `1 0 −3 4 −2 / 1 1 −2 2 / 1 1 −2 2 0` przy nawiasie |

## Pytanie obowiązkowe: „Czy umiałbym rozwiązać podobne zadanie sam, tylko z tych kroków?”

- g001: tak — każdy krok jest prosty, a dymki wyjaśniają, po co wyłączam n.
- g002: tak — ten sam schemat co g001, dzielenie przez n² jest łatwe.
- g003: tak — schemat ten sam, choć dzielenie wyrazów przez n⁵ robię w głowie.
- g004: tak — widać, że zostaje 1/n, i umiem to powtórzyć.
- g005: tak — dzielenie przez n⁴ jest pokazane dla całości, każdy wyraz zrobię sam.
- g006: tak — odejmowanie wykładników jest proste.
- g007: tak — zapis [1/0⁺] i „dlaczego” mówią, czemu wychodzi +∞.
- g008: tak — rozbicie nawiasów z potęgami jest rozpisane, brakuje tylko liczenia 36/12.
- g009: nie do końca — schemat zrozumiem, ale skok 12500/576 → 3125/144 zatrzymałby mnie przy podobnych liczbach.
- g010: tak — pierwiastki są rozpisane krok po kroku.
- g011: tak — jak g010.
- g012: tak — wyciągnięcie n spod pierwiastka jest pokazane.
- g013: tak — choć wyjaśnienie 1/√n przychodzi krok za późno.
- g014: tak — √n³ = n√n trzeba zgadnąć, reszta jest rozpisana.
- g015: nie — ostatni krok podaje 1/6 i n^(1/12) bez rachunku, a jeden wyraz mianownika nie jest rozpisany.
- g016: tak — bardzo krótko i jasno.
- g017: nie do końca — wymnażanie nawiasów i odejmowanie są w jednym kroku, sam bym się pomylił.
- g018: nie do końca — jak g017, mnożenie z √n zrobione naraz.
- g019: tak — ale musiałbym się domyślić, że kroki 3–5 dzieją się pod logarytmem.
- g020: nie — log₄(1/8) = −3/2 nie umiem odtworzyć bez pokazania potęgi.
- g021: tak — sprzężenie jest rozpisane, a dymek podaje wzór.
- g022: tak — jak g021.
- g023: tak — choć objazd przez √2 jest zbędny i mnie myli.
- g024: tak — kroki są drobne, brakuje tylko symbolu na starcie.
- g025: tak — długie, ale każdy krok idzie po kolei.
- g026: tak — dwa sprzężenia są rozpisane; tylko 0/0 na starcie nie jest uzasadnione.
- g027: tak — rozbicie na dwie różnice da się powtórzyć.
- g028: nie — nie wiem, co jest a i b w sprzężeniu, a kwadrat sumy pierwiastków jest w głowie.
- g029: nie do końca — wzór a²+ab+b² jest w dymku, ale iloczyn pod ∛ i wyłączenie n² z potęg ^(2/3) robię na domysł.
- g030: nie do końca — jak g029, do tego niejasny objazd przez ∛4.
- g031: nie do końca — jak g030, a 27^(2/3) = 9 trzeba wiedzieć.
- g032: nie do końca — długi nawias jest w dymku, ale wyłączenie n³ z potęg ^(3/4) jest ukryte.
- g033: nie do końca — wartości 4∜16, 2√16, 16^(3/4) podane naraz.
- g034: tak — postać 1 + 1/aₙ jest pokazana jawnie.
- g035: tak — wzór skrócony jest w dymku i rachunek jest krótki.
- g036: tak — r = 1/2 jest policzone.
- g037: tak — jedna linia, wszystko widać.
- g038: tak — dorobienie jedynki ma pokazaną różnicę licznika i mianownika.
- g039: tak — f − 1 = 4/n łatwo sprawdzić.
- g040: tak — z drobnym domysłem przy dzieleniu przez ułamek.
- g041: tak — choć f − 1 liczę w głowie.
- g042: tak — wykładnik −1/n jest prosty.
- g043: tak — jedna linia.
- g044: tak — różnica 15 jest pokazana.
- g045: nie do końca — f − 1 = 15/(5n − 8) jest podane bez wspólnego mianownika.
- g046: nie do końca — wyłączenie n z −6√n(√n + 2) jest ukryte.
- g047: nie do końca — f − 1 i wyłączenie n naraz w głowie.
- g048: nie — nie wiem, skąd w liczniku n² + 6n + 9 i ten sam wykładnik.
- g049: tak — długie, ale różnica i wyłączenie −3 są pokazane.
- g050: nie do końca — f − 1 = −3(n − 2)/(…) bez rachunku.
- g051: tak — jak g049.
- g052: nie do końca — jak g050.
- g053: tak — krótkie i kompletne.
- g054: nie — nie znam pochodnej pierwiastka z funkcji, a dymek jej nie podaje.
- g055: tak — dymki o |x| i o −x tłumaczą znak.
- g056: nie — jak g054, pochodna pierwiastka bez wzoru.
- g057: nie do końca — wyłączenie −(−x) z mianownika jest ukryte, a „dlaczego” przy minusie nie pasuje.
- g058: nie do końca — wynik −3√2/4 wymaga kilku działań naraz.
- g059: tak — z drobnym domysłem przy wyłączaniu (−x).
- g060: tak — Viète, delta i postać iloczynowa są rozpisane.
- g061: tak — o ile znam pochodną wielomianu.
- g062: tak — tabelka Hornera jest w kroku.
- g063: tak — delta i wzór na różnicę sześcianów są pokazane.
- g064: tak — o ile znam pochodną wielomianu.
- g065: tak — tabelka Hornera jest w kroku.
- g066: tak — podstawienie t i różnice kwadratów są rozpisane.
- g067: tak — o ile znam pochodną wielomianu.
- g068: tak — tabelka Hornera jest w kroku.
- g069: tak — długie, ale każdy rozkład ma tabelkę albo deltę.
- g070: tak — o ile znam pochodną wielomianu.
- g071: tak — tabelka Hornera jest w kroku.
- g072: tak — obie tabelki Hornera są pokazane.

Liczba zadań bez uwag (poza `interaktywnosc`): **10**.
