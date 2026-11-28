# Słaby uczeń — równania, część 2 (e059–e116, 58 zadań)

Źródło: `scripts/steps-check/kroki-uczen-rownania-2.json`. Powtarzające się braki zgłoszone raz, z listą zadań.

## Uwagi (bez interaktywności)

| id | dział | zadanie (q) | krok k | kategoria | ważność | cytat | czego brakuje | propozycja zapisu |
|---|---|---|---|---|---|---|---|---|
| e059 (też e061, e062, e063, e064, e066, e068, e088, e090, e100, e104, e105, e106, e107, e115, e116) | równania | rozwiąż x^3 - x = 0 | 6 (Sprawdzenie; w innych: ostatni krok przed Odpowiedzią) | skok | powazna | `L = (−1)³ − (−1) = 0`; e061: `L = (−2)⁴ − 5 · (−2)² + 4 = 0`; e104: `L = 3³ − 6 · 3² + 11 · 3 − 6 = 0`; e115: `L = 2(3 + 1) − (3 − 3) = 8`; e090: `L = 3^(2 + 1) = 27`; e100: `√(2 · 5 − 1) = 3` | Sprawdzenie skacze od wstawionych liczb do wyniku, bez wartości częściowych (reguła 1). Wyjątek dobry: e063/e064 dla x = 3/2. | `L = (−1)³ − (−1) = −1 + 1 = 0`; `L = (−2)⁴ − 5 · (−2)² + 4 = 16 − 5 · 4 + 4 = 16 − 20 + 4 = 0`; `L = 3³ − 6 · 3² + 11 · 3 − 6 = 27 − 54 + 33 − 6 = 0`; `L = 2 · 4 − 0 = 8`; `L = 3^(2 + 1) = 3³ = 27`; `√(2 · 5 − 1) = √(10 − 1) = √9 = 3` |
| e073 (też e074, e075, e079, e080, e081, e082, e083, e084, e109, e110, e111, e112, e113, e114) | równania | rozwiąż 2x + 3y = 12; 3x - 2y = 5 | 10 (Sprawdzenie układu) | skok | powazna (przy ułamkach e079–e081), drobna (reszta) | `2 · 3 + 3 · 2 = 12 ✓`; e079: `2 · (2/3) + (−1/3) = 1 ✓`; e082: `3 · 1 − 2 = 1 ✓` | Lewa strona liczona w głowie (2–3 działania, przy ułamkach wspólny mianownik). | `2 · 3 + 3 · 2 = 6 + 6 = 12 ✓`; `2 · (2/3) + (−1/3) = 4/3 − 1/3 = 3/3 = 1 ✓`; `(2/3) − (−1/3) = 2/3 + 1/3 = 3/3 = 1 ✓`; `3 · 1 − 2 = 3 − 2 = 1 ✓` |
| e074 (też e077, e080, e083, e110, e113) | równania | rozwiąż 2x + 3y = 12; 3x - 2y = 5 (przeciwne współczynniki) | 3 (Dodaję równania stronami) | skok | powazna | `⟦13x⟧ = ⟦39⟧`; e080: `⟦3x⟧ = ⟦2⟧`; e113: `⟦3x⟧ = ⟦9⟧` | Dodawanie stronami podane od razu wynikiem; nie widać, że y się znosi ani ile daje suma liczb. | `(4x + 9x) + (6y − 6y) = 24 + 15` → `13x + 0 = 39` → `13x = 39`; e080: `(2x + x) + (y − y) = 1 + 1` → `3x = 2` |
| e075 (też e078, e081, e084, e111, e114) | równania | rozwiąż 2x + 3y = 12; 3x - 2y = 5 (wyznaczniki) | 2–3 (Liczę W, Wx, Wy) | nieczytelne | powazna | why: `Tak samo mnożę po przekątnych, tylko jedną kolumnę wymieniam na wyrazy wolne.`; math: `Wy = 2 · 5 − 3 · 12` | Nie ma tabelki 2×2, więc „przekątne” i „kolumna” nic mi nie pokazują; nie wiem, skąd w Wy jest `2 · 5`, a nie `3 · 12` na pierwszym miejscu. Słowo „wyznacznik” też niewyjaśnione w kroku. | `W = \|2  3\| \|3 −2\| = 2 · (−2) − 3 · 3`; `Wx = \|12  3\| \|5 −2\|` (kolumnę x: 2, 3 zastępuję 12, 5) `= 12 · (−2) − 5 · 3`; `Wy = \|2 12\| \|3  5\| = 2 · 5 − 3 · 12` |
| e064 (też e072, e105) | równania | rozwiąż 2x^3 - 3x^2 - 2x + 3 = 0 (Horner) | 9 (Liczę dwa rozwiązania) | skok | powazna (e072), drobna (e064, e105) | `x₁ = ⟦(1 − 5) / (2 · 2)⟧`; e072: `x₁ = ⟦(2 − 2√2) / (2 · 1)⟧ = 1 − √2`; e105: `x₁ = ⟦(5 − 1) / (2 · 1)⟧` | Nie widać −b = −(−1) = 1; w e072 dodatkowo skrócenie przez 2 obu wyrazów licznika naraz. | `x₁ = (−(−1) − 5)/(2 · 2) = (1 − 5)/4 = −4/4 = −1`; e072: `x₁ = (−(−2) − 2√2)/(2 · 1) = (2 − 2√2)/2 = 2(1 − √2)/2 = 1 − √2` |
| e073 | równania | rozwiąż 2x + 3y = 12; 3x - 2y = 5 (podstawianie) | 2 | skok | krytyczna | `y = 4 − (2/3)x` | Z `2x + 3y = 12` od razu wynik z ułamkiem: przeniesienie 2x i dzielenie przez 3 obu wyrazów w głowie. | `3y = 12 − 2x` → `y = (12 − 2x)/3 = 12/3 − (2/3)x = 4 − (2/3)x` |
| e073 | równania | jw. | 4–5 | skok | powazna | `3x − 8 + (4/3)x = 5` → `(13/3)x − 8 = 5` | Mnożenie `−2 · (−(2/3)x)` i dodanie `3x + (4/3)x` z sprowadzeniem do wspólnego mianownika w głowie. | `−2 · 4 = −8, −2 · (−(2/3)x) = (4/3)x`; `3x + (4/3)x = (9/3)x + (4/3)x = (13/3)x` |
| e073 (też e066, e079, e080) | równania | jw. | 8–9 (e066 k3, e079 k9, e080 k4–k6) | skok | drobna (e066, e073), powazna (e079, e080) | `x = 13 · 3/13 = 3`; `y = 4 − (2/3) · 3 = 2`; e066: `x = 4 · 3/2 = 6`; e079: `y = 1 − 2 · (2/3) = −1/3`; e080: `y = 1 − 4/3` → `y = −1/3` | Mnożenie przez ułamek i odejmowanie ułamków bez wartości pośrednich. | `13 · 3/13 = 39/13 = 3`; `(2/3) · 3 = 6/3 = 2, 4 − 2 = 2`; `4 · 3/2 = 12/2 = 6`; `2 · (2/3) = 4/3, 1 − 4/3 = 3/3 − 4/3 = −1/3` |
| e063 | równania | rozwiąż 2x^3 - 3x^2 - 2x + 3 = 0 (rozkład) | 6 | skok | powazna | `x − 3/2 = 0 lub x − 1 = 0 lub x + 1 = 0` | W iloczynie był nawias `(2x − 3)`, a tu nagle `x − 3/2`; nie widać dzielenia przez 2. | `2x − 3 = 0 → 2x = 3 → x = 3/2 lub x − 1 = 0 lub x + 1 = 0` |
| e063 | równania | jw. | 2 | skok | drobna | `(2x³ − 3x²) − (2x − 3)` | Minus przed nawiasem zmienia znak `+3` na `−3`; nie pokazano. | `− 2x + 3 = −(2x − 3)` |
| e064 | równania | rozwiąż 2x^3 - 3x^2 - 2x + 3 = 0 (Horner) | 2 | skok | drobna | `W(1) = 2 − 3 − 2 + 3 = 0` (bez listy dzielników, why inne niż w e062) | Nie wiem, skąd wziąłem 1; w e062/e104 lista dzielników jest. | `dzielniki 3: ±1, ±3` → `W(1) = 2 · 1³ − 3 · 1² − 2 · 1 + 3 = 2 − 3 − 2 + 3 = 0` |
| e068 | równania | rozwiąż 2x^2 - 6x = 0 | 2–3 | dlaczego-falszywe | drobna | label `Wyłączam x przed nawias`, math `2x(x − 3) = 0`; k3 `x = 0 lub x − 3 = 0` | Wyłączono 2x, nie x (dymek bez `here`); w k3 z `2x = 0` od razu `x = 0`. | `2x² − 6x = 2x · x − 2x · 3 = 2x(x − 3)`; `2x = 0 → x = 0 lub x − 3 = 0` |
| e072 | równania | rozwiąż x^2 - 2x - 1 < 0 | 6 | nieczytelne | drobna | `= 1 − √2 ≈ −0,414214` | Przybliżenie z 6 miejscami bez wyjaśnienia, po co (do osi liczbowej). | `1 − √2 ≈ 1 − 1,41 = −0,41` |
| e076 | równania | rozwiąż x = 2y, x + y = 9 (podstawianie) | 2–3 | nieczytelne | drobna | k2 `x − 2y = 0`, k3 `x = 2y` | Przestawiam równanie, a krok dalej wracam do tego samego zapisu co w poleceniu; krok k2 zbędny w tym sposobie. | pominąć k2 w podstawianiu: od razu `x = 2y` (już wyznaczone) |
| e080 | równania | rozwiąż 2x + y = 1, x - y = 1 (przeciwne) | 3 | nieczytelne | drobna | `x = 2/3 = 2/3` | Ta sama liczba dwa razy, wygląda na błąd. | `x = 2/3` |
| e087 | równania | rozwiąż (x+3)/(x-1) = (x-1)/(x+1) | 8 | skok | drobna | `x = −2 / 6 = −1/3` | Skracanie ułamka bez pokazania wspólnego dzielnika. | `−2/6 = −(2 : 2)/(6 : 2) = −1/3` |
| e092 | równania | rozwiąż 9^x = 27 | 2 | skok | drobna | `(3²)^x = 3³` | Brak zapisu `9 = 3²` (dla 27 jest `27 = 3³`). | `9 = 3², 27 = 3³` → `(3²)^x = 3³` → `3^(2 · x) = 3³` |
| e095 | równania | rozwiąż log_2(x+3) = log_2(2x) | 2 | skok | drobna | `x > −3 ... x > 0 ... D = (0, +∞)` | Nie widać, że bierzemy część wspólną dwóch warunków (w e099 why to mówi). | `x > −3 i x > 0 → część wspólna: x > 0` |
| e096 | równania | rozwiąż \|x-2\| = 3 | 3 | skok | powazna | `x = 5 lub x = −1` | Dwa równania rozwiązane naraz, bez przeniesienia −2. | `x − 2 = 3 → x = 3 + 2 = 5 lub x − 2 = −3 → x = −3 + 2 = −1` |
| e096 (też e098) | równania | jw. | 2 (dymek) | zargon | drobna | formula here: `a = 2, r = 3` | Litera `r` bez objaśnienia w kroku. | `a = 2 (środek), r = 3 (odległość)` |
| e098 | równania | rozwiąż \|x-2\| < 3 | 3 | skok | powazna | `−1 < x < 5` | Nie widać, że do wszystkich trzech części dodaję 2 (why mówi tylko „te same działania”). | `−3 + 2 < x − 2 + 2 < 3 + 2` → `−1 < x < 5` |
| e099 (też e100) | równania | rozwiąż √(x+3) = x - 3 | 3 | dlaczego-falszywe | drobna | `Lewa i prawa część są równe, więc po podniesieniu do potęgi 2 nadal będą równe.` | Zdanie prawdziwe tylko w jedną stronę; uczeń nie wie, że po kwadracie mogą dojść fałszywe rozwiązania (wyjaśnia to dopiero k11). | why: `Równe liczby mają równe kwadraty, ale nie odwrotnie: (−3)² = 3², dlatego na końcu sprawdzam wynik.` |
| e101 (też e102, e103) | równania | rozwiąż cos(x) = sqrt(2)/2 | 2 | zargon | powazna | `⟦cos(π/4)⟧ = √2/2`, label `Odczytuję kąt z tablicy` | Tablicy nie ma na ekranie; kąt w radianach bez stopni — słaby uczeń zna 45°, 30°. | `cos 45° = √2/2, 45° = π/4`; e103: `sin 30° = 1/2, 30° = π/6` |
| e103 | równania | rozwiąż sin(2x) = 1/2 | 4 | skok | powazna | `x = π/12 + kπ lub x = 5π/12 + kπ` | Dzielenie obu wyrazów serii przez 2 w głowie. | `x = (π/6) : 2 + (2kπ) : 2 = π/12 + kπ lub x = (5π/6) : 2 + (2kπ) : 2 = 5π/12 + kπ` |
| e108 | równania | rozwiąż x^2 + 1 > 0 | 4 | dlaczego-falszywe | drobna | math `x² + 1 ≠ 0`, why `Wyrażenie nigdy nie jest zerem, więc wykres nie przecina osi.` | Nie mówi, dlaczego `x² = −1` jest niemożliwe (w e060 k10 jest „kwadrat nie może być ujemny”). | `x² ≥ 0, więc x² = −1 nie ma rozwiązań → x² + 1 ≠ 0` |
| e115 | równania | rozwiąż 2(x+1) - (x-3) = 8 | 3 | skok | drobna | `2x + 2 − x + 3 = 8` → `x + 5 = 8` | Dwie redukcje naraz. | `(2x − x) + (2 + 3) = 8 → x + 5 = 8` |

## Interaktywność (każde zadanie)

| id | dział | zadanie (q) | krok k | kategoria | ważność | cytat | czego brakuje | propozycja zapisu |
|---|---|---|---|---|---|---|---|---|
| e059 | równania | rozwiąż x^3 - x = 0 | 6 | interaktywnosc | drobna | `L = (−1)³ − (−1) = 0` | stuknięcie L pokazuje wartości częściowe | `= −1 + 1 = 0` |
| e060 | równania | rozwiąż x^4 + x^2 - 6 = 0 | 4, 8 | interaktywnosc | drobna | `⟦(t − 2)(t + 3)⟧`, `x = ±√2` | stuknięcie nawiasu: mnożenie sprawdzające; stuknięcie ±√2: `(√2)² = 2` | `(t − 2)(t + 3) = t² + 3t − 2t − 6 = t² + t − 6` |
| e061 | równania | rozwiąż x^4 - 5x^2 + 4 = 0 (rozkład) | 4, 10 | interaktywnosc | drobna | `⟦(t − 1)(t − 4)⟧`, `L = (−2)⁴ − ...` | stuknięcie: mnożenie nawiasów; stuknięcie L: `16 − 20 + 4` | `(t − 1)(t − 4) = t² − 5t + 4` |
| e062 | równania | rozwiąż x^4 - 5x^2 + 4 = 0 (Horner) | 2, 12 | interaktywnosc | drobna | `dzielniki 4: ±1, ±2, ±4` | stuknięcie listy: które dzielniki sprawdzono i z jakim wynikiem | `W(−1) = 1 − 5 + 4 = 0` |
| e063 | równania | rozwiąż 2x^3 - 3x^2 - 2x + 3 = 0 (rozkład) | 6 | interaktywnosc | drobna | `x − 3/2 = 0` | stuknięcie: przejście z `2x − 3 = 0` | `2x = 3 → x = 3/2` |
| e064 | równania | rozwiąż 2x^3 - 3x^2 - 2x + 3 = 0 (Horner) | 9 | interaktywnosc | drobna | `⟦(1 − 5) / (2 · 2)⟧` | stuknięcie: wzór z wstawionym −b | `(−(−1) − 5)/(2 · 2)` |
| e065 | równania | rozwiąż x=52+65 | 2 | interaktywnosc | drobna | `x = 117` | stuknięcie: dodawanie pisemne | `52 + 65 = 50 + 60 + 2 + 5 = 117` |
| e066 | równania | rozwiąż 2x/3 = 4 | 3 | interaktywnosc | drobna | `x = 4 · 3/2 = 6` | stuknięcie: wartość pośrednia | `= 12/2 = 6` |
| e067 | równania | rozwiąż 7 = 3 - x | 3 | interaktywnosc | drobna | `−x = 7 − 3` | stuknięcie: które wyrazy przeszły i z jakim znakiem | `3 → −3 po prawej` |
| e068 | równania | rozwiąż 2x^2 - 6x = 0 | 2 | interaktywnosc | drobna | `2x(x − 3) = 0` | stuknięcie: sprawdzenie mnożeniem | `2x · x − 2x · 3 = 2x² − 6x` |
| e069 | równania | rozwiąż 5 - 2x ≥ 11 | 4 | interaktywnosc | drobna | `x ≤ ⟦6/(−2)⟧` | stuknięcie znaku ≤: przykład, czemu znak się odwraca | `2 > 1, ale −2 < −1` |
| e070 | równania | rozwiąż x^2 + 2 > 2x | 7 | interaktywnosc | drobna | `a = 1 > 0` | stuknięcie: szkic paraboli nad osią | `parabola w całości nad osią → > 0 dla każdego x` |
| e071 | równania | rozwiąż x^2 - 4 < 0 | 5 | interaktywnosc | drobna | `a = ⟦1⟧ > 0` | stuknięcie: oś z −2, 2 i znakami | `+ (−2) − (2) +` |
| e072 | równania | rozwiąż x^2 - 2x - 1 < 0 | 6 | interaktywnosc | drobna | `= 1 − √2 ≈ −0,414214` | stuknięcie: skracanie przez 2 | `(2 − 2√2)/2 = 2(1 − √2)/2` |
| e073 | równania | rozwiąż 2x + 3y = 12; 3x - 2y = 5 (podstawianie) | 2 | interaktywnosc | drobna | `y = 4 − (2/3)x` | stuknięcie: pełne wyznaczanie y | `3y = 12 − 2x → y = (12 − 2x)/3` |
| e074 | równania | jw. (przeciwne) | 3 | interaktywnosc | drobna | `⟦13x⟧ = ⟦39⟧` | stuknięcie 13x/39: dodawanie słupkiem | `4x + 9x = 13x, 24 + 15 = 39` |
| e075 | równania | jw. (wyznaczniki) | 2–3 | interaktywnosc | drobna | `W = 2 · (−2) − 3 · 3` | stuknięcie W: tabelka 2×2 z zaznaczonymi przekątnymi | `\|2 3; 3 −2\|` |
| e076 | równania | rozwiąż x = 2y, x + y = 9 (podstawianie) | 4 | interaktywnosc | drobna | `⟦2y + y⟧ = 9` | stuknięcie: zamiana x na 2y zaznaczona | `x + y → (2y) + y` |
| e077 | równania | jw. (przeciwne) | 4 | interaktywnosc | drobna | `⟦3x⟧ = ⟦18⟧` | stuknięcie: dodawanie stronami | `x + 2x = 3x, −2y + 2y = 0, 0 + 18 = 18` |
| e078 | równania | jw. (wyznaczniki) | 3–4 | interaktywnosc | drobna | `Wx = 0 · 1 − 9 · (−2)` | stuknięcie Wx: tabelka z kolumną wyrazów wolnych | `\|0 −2; 9 1\|` |
| e079 | równania | rozwiąż 2x + y = 1, x - y = 1 (podstawianie) | 9 | interaktywnosc | drobna | `y = 1 − 2 · (2/3) = −1/3` | stuknięcie: wspólny mianownik | `= 3/3 − 4/3 = −1/3` |
| e080 | równania | jw. (przeciwne) | 2, 6 | interaktywnosc | drobna | `⟦3x⟧ = ⟦2⟧`, `y = −1/3` | stuknięcie: dodawanie stronami; odejmowanie ułamków | `2x + x = 3x, y − y = 0, 1 + 1 = 2` |
| e081 | równania | jw. (wyznaczniki) | 2–3 | interaktywnosc | drobna | `W = 2 · (−1) − 1 · 1` | stuknięcie: tabelka 2×2 | `\|2 1; 1 −1\|` |
| e082 | równania | rozwiąż 3x - y = 1, -x + 2y = 3 (podstawianie) | 2 | interaktywnosc | drobna | `y = 3x − 1` | stuknięcie: przeniesienie i zmiana znaku | `−y = 1 − 3x → y = 3x − 1` |
| e083 | równania | jw. (przeciwne) | 3 | interaktywnosc | drobna | `⟦5x⟧ = ⟦5⟧` | stuknięcie: dodawanie stronami | `6x − x = 5x, −2y + 2y = 0, 2 + 3 = 5` |
| e084 | równania | jw. (wyznaczniki) | 3 | interaktywnosc | drobna | `Wy = 3 · 3 − (−1) · 1` | stuknięcie Wy: tabelka | `\|3 1; −1 3\|` |
| e085 | równania | rozwiąż 1/x = 2 | 3 | interaktywnosc | drobna | `1 = ⟦2x⟧` | stuknięcie: obie strony razy x | `(1/x) · x = 1, 2 · x = 2x` |
| e086 | równania | rozwiąż (x+1)/(x-2) = 3 | 9 | interaktywnosc | drobna | `(9/2)/(3/2) = 3` | stuknięcie: dzielenie ułamków | `(9/2) · (2/3) = 18/6 = 3` |
| e087 | równania | rozwiąż (x+3)/(x-1) = (x-1)/(x+1) | 3 | interaktywnosc | drobna | `⟦(x + 3)(x + 1)⟧ = ⟦(x − 1)(x − 1)⟧` | stuknięcie: strzałki „na krzyż” | `licznik L · mianownik P = licznik P · mianownik L` |
| e088 | równania | rozwiąż x^2/(x-1) = 1/(x-1) | 6 | interaktywnosc | drobna | `(−1)²/((−1) − 1) = −1/2` | stuknięcie: wartości częściowe | `= 1/(−2) = −1/2` |
| e089 | równania | rozwiąż 2^x = 8 | 2 | interaktywnosc | drobna | `8 = 2³` | stuknięcie: `2 · 2 · 2` | `2³ = 2 · 2 · 2 = 8` |
| e090 | równania | rozwiąż 3^(x+1) = 27 | 6 | interaktywnosc | drobna | `L = 3^(2 + 1) = 27` | stuknięcie: wartość pośrednia | `= 3³ = 27` |
| e091 | równania | rozwiąż 2^x = 1/8 | 4 | interaktywnosc | drobna | `L = 2^(−3) = 1/8` | stuknięcie: potęga ujemna | `2^(−3) = 1/2³ = 1/8` |
| e092 | równania | rozwiąż 9^x = 27 | 2 | interaktywnosc | drobna | `(3²)^x = 3³` | stuknięcie: `9 = 3²` i mnożenie wykładników | `(3²)^x = 3^(2 · x)` |
| e093 | równania | rozwiąż log_2(x) = 3 | 3 | interaktywnosc | drobna | `x = ⟦2³⟧ = 8` | stuknięcie: definicja z wstawionymi liczbami | `log₂ x = 3 ⇔ 2³ = x` |
| e094 | równania | rozwiąż log(x) = 2 | 3 | interaktywnosc | drobna | `x = ⟦10²⟧ = 100` | stuknięcie: definicja z liczbami | `log₁₀ x = 2 ⇔ 10² = x` |
| e095 | równania | rozwiąż log_2(x+3) = log_2(2x) | 2 | interaktywnosc | drobna | `D = (0, +∞)` | stuknięcie D: oś z dwoma przedziałami i częścią wspólną | `(−3, +∞) ∩ (0, +∞) = (0, +∞)` |
| e096 | równania | rozwiąż \|x-2\| = 3 | 3 | interaktywnosc | drobna | `x = 5 lub x = −1` | stuknięcie: rozwiązanie każdego przypadku | `x = 3 + 2, x = −3 + 2` |
| e097 | równania | rozwiąż \|2x+1\| = 0 | 4 | interaktywnosc | drobna | `x = −1/2` | stuknięcie: dzielenie | `x = −1 : 2 = −1/2` |
| e098 | równania | rozwiąż \|x-2\| < 3 | 3 | interaktywnosc | drobna | `−1 < x < 5` | stuknięcie: +2 do trzech części | `−3 + 2 < x < 3 + 2` |
| e099 | równania | rozwiąż √(x+3) = x - 3 | 4 | interaktywnosc | drobna | `x² − 3x − 3x + 9` | stuknięcie: wzór skróconego mnożenia z a, b | `(a − b)² = a² − 2ab + b², a = x, b = 3` |
| e100 | równania | rozwiąż sqrt(2x-1) = 3 | 7 | interaktywnosc | drobna | `√(2 · 5 − 1) = 3` | stuknięcie: wartości pośrednie | `= √9 = 3` |
| e101 | równania | rozwiąż cos(x) = sqrt(2)/2 | 2 | interaktywnosc | drobna | `⟦cos(π/4)⟧ = √2/2` | stuknięcie: tabelka sin/cos dla 30°, 45°, 60° | `cos 45° = √2/2` |
| e102 | równania | rozwiąż tg(x) = 1 | 2 | interaktywnosc | drobna | `⟦tg(π/4)⟧ = 1` | stuknięcie: tabelka tg | `tg 45° = 1` |
| e103 | równania | rozwiąż sin(2x) = 1/2 | 4 | interaktywnosc | drobna | `x = π/12 + kπ` | stuknięcie: dzielenie serii przez 2 | `(π/6) : 2 = π/12, 2kπ : 2 = kπ` |
| e104 | równania | rozwiąż x^3-6x^2+11x-6=0 (rozkład) | 9 | interaktywnosc | drobna | `L = 2³ − 6 · 2² + 11 · 2 − 6 = 0` | stuknięcie L: wartości częściowe | `= 8 − 24 + 22 − 6 = 0` |
| e105 | równania | jw. (Horner) | 9 | interaktywnosc | drobna | `⟦(5 − 1) / (2 · 1)⟧` | stuknięcie: −b | `−(−5) = 5` |
| e106 | równania | rozwiąż x^4-5x^2+4=0 (rozkład) | 10 | interaktywnosc | drobna | `L = 2⁴ − 5 · 2² + 4 = 0` | stuknięcie L: wartości częściowe | `= 16 − 20 + 4 = 0` |
| e107 | równania | jw. (Horner) | 6 | interaktywnosc | drobna | `W(−1) = −1 + 1 + 4 − 4 = 0` | stuknięcie: podstawienie przed potęgami | `(−1)³ + (−1)² − 4 · (−1) − 4` |
| e108 | równania | rozwiąż x^2 + 1 > 0 | 4 | interaktywnosc | drobna | `x² + 1 ≠ 0` | stuknięcie: „kwadrat nie jest ujemny” | `x² ≥ 0 > −1` |
| e109 | równania | rozwiąż 2x + 3y = 7, x - y = 1 (podstawianie) | 10 | interaktywnosc | drobna | `2 · 2 + 3 · 1 = 7 ✓` | stuknięcie: wartości częściowe | `4 + 3 = 7` |
| e110 | równania | jw. (przeciwne) | 3 | interaktywnosc | drobna | `⟦5x⟧ = ⟦10⟧` | stuknięcie: dodawanie stronami | `2x + 3x = 5x, 3y − 3y = 0, 7 + 3 = 10` |
| e111 | równania | jw. (wyznaczniki) | 3 | interaktywnosc | drobna | `Wx = 7 · (−1) − 1 · 3` | stuknięcie: tabelka 2×2 | `\|7 3; 1 −1\|` |
| e112 | równania | rozwiąż 2x + y = 7, x - y = 2 (podstawianie) | 9 | interaktywnosc | drobna | `y = 7 − 2 · 3 = 1` | stuknięcie: wartość pośrednia | `= 7 − 6 = 1` |
| e113 | równania | jw. (przeciwne) | 2 | interaktywnosc | drobna | `⟦3x⟧ = ⟦9⟧` | stuknięcie: dodawanie stronami | `2x + x = 3x, y − y = 0, 7 + 2 = 9` |
| e114 | równania | jw. (wyznaczniki) | 3 | interaktywnosc | drobna | `Wy = 2 · 2 − 1 · 7` | stuknięcie: tabelka 2×2 | `\|2 7; 1 2\|` |
| e115 | równania | rozwiąż 2(x+1) - (x-3) = 8 | 2 | interaktywnosc | drobna | `2x + 2 − x + 3 = 8` | stuknięcie: znak przed nawiasem | `−(x − 3) = −x + 3` |
| e116 | równania | rozwiąż 4x + 1 = x + 7 | 5 | interaktywnosc | drobna | `L = 4 · 2 + 1 = 9` | stuknięcie: wartość pośrednia | `= 8 + 1 = 9` |

## Pytanie obowiązkowe: „Czy umiałbym rozwiązać podobne zadanie sam, tylko z tych kroków?”

- e059: tak — wyłączenie x i różnica kwadratów są pokazane z dymkami.
- e060: tak — podstawienie t i szukanie pary liczb rozpisane krok po kroku.
- e061: tak — jak e060 plus dwie różnice kwadratów.
- e062: tak — tabelka Hornera i W(r) z liczbami są na ekranie.
- e063: tak, z trudem — grupowanie widać, ale przejście z `2x − 3` na `x − 3/2` muszę zgadnąć.
- e064: tak — Horner i delta rozpisane; brakuje tylko listy dzielników.
- e065: tak — samo dodawanie.
- e066: tak — mnożenie przez odwrotność wyjaśnione.
- e067: tak — każdy ruch osobno.
- e068: tak, z trudem — nie widzę, czemu wyłączam 2x, a nie x.
- e069: tak — odwrócenie znaku nazwane w kroku.
- e070: tak — delta i wniosek z paraboli są.
- e071: tak — miejsca zerowe i znak z paraboli.
- e072: tak, z trudem — skrócenie `(2 − 2√2)/2` muszę zrobić sam.
- e073: nie — wyznaczenie y z ułamkiem i dodawanie `3x + (4/3)x` są w głowie.
- e074: tak — mnożenie równań pokazane, tylko dodawanie stronami robię sam.
- e075: nie — bez tabelki 2×2 nie ustawię Wx i Wy dla innego układu.
- e076: tak — proste podstawienie.
- e077: tak — jak e074.
- e078: nie — jak e075, nie wiem, która liczba idzie gdzie.
- e079: tak, z trudem — odejmowanie ułamków ukryte.
- e080: tak, z trudem — ułamki i dodawanie stronami ukryte.
- e081: nie — jak e075.
- e082: tak — wszystko rozpisane.
- e083: tak — jak e074.
- e084: nie — jak e075.
- e085: tak — dziedzina i mnożenie przez x jasne.
- e086: tak — każdy krok osobno.
- e087: tak — mnożenie na krzyż wyjaśnione w why.
- e088: tak — odrzucenie x = 1 z dziedziny pokazane.
- e089: tak — ta sama podstawa, porównanie wykładników.
- e090: tak — jak e089.
- e091: tak — potęga ujemna wyjaśniona w why.
- e092: tak, z trudem — brakuje `9 = 3²`.
- e093: tak — definicja logarytmu z liczbami.
- e094: tak — jak e093, z log₁₀.
- e095: tak — porównanie argumentów jasne.
- e096: tak — dwa przypadki widać, choć rachunek jest w głowie.
- e097: tak — proste.
- e098: tak, z trudem — nie widzę, co dodaję do trzech części.
- e099: tak — dziedzina, kwadrat, delta i odrzucenie rozpisane.
- e100: tak — proste.
- e101: nie — dla innej wartości nie wiem, skąd wziąć kąt (brak tablicy na ekranie).
- e102: nie — jak e101.
- e103: nie — kąt z tablicy i dzielenie serii przez 2 w głowie.
- e104: tak — Horner i para liczb rozpisane.
- e105: tak — Horner i delta.
- e106: tak — jak e061.
- e107: tak — jak e062.
- e108: tak — krótko, ale wniosek oczywisty.
- e109: tak — wszystko rozpisane.
- e110: tak — jak e074.
- e111: nie — jak e075.
- e112: tak — wszystko rozpisane.
- e113: tak — jak e074.
- e114: nie — jak e075.
- e115: tak — opuszczanie nawiasów z dymkiem.
- e116: tak — proste.

## Podsumowanie

- Uwagi (bez interaktywności): 26 wierszy; krytyczne: 1 (e073 k2), poważne: 12, drobne: 13.
- Interaktywność: 58 wierszy (po jednym na zadanie).
- Zadania bez uwag (poza interaktywnością): 12 — e060, e065, e067, e069, e070, e071, e085, e086, e089, e093, e094, e097.
