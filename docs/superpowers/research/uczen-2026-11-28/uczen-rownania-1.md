# Słaby uczeń — równania, część 1 (e001–e058)

Wejście: `scripts/steps-check/kroki-uczen-rownania-1.json` (58 zadań).
Uwagi o tym samym braku są zgłoszone raz, z listą zadań, w których się powtarza (kolumna id).

## Uwagi

| id | dział | zadanie (q) | krok k | kategoria | ważność | cytat | czego brakuje | propozycja zapisu |
|---|---|---|---|---|---|---|---|---|
| e019 | równania | 2x + y - z = 8, -3x - y + 2z = -11, -2x + y + 2z = -3 | 2–3 | skok | krytyczna | `2 · II + 3 · I:  y + z = 2` / `III + I:  2y + z = 5` / `III − 2 · II:  −z = 1` | Trzeba w głowie pomnożyć dwa równania (po 4 wyrazy), dodać je wyraz po wyrazie i zobaczyć, że x znika. Nie widać ani pomnożonych równań, ani dodawania. | `2 · II: −6x − 2y + 4z = −22`; `3 · I: 6x + 3y − 3z = 24`; `dodaję: (−6x + 6x) + (−2y + 3y) + (4z − 3z) = −22 + 24  →  y + z = 2`; `III + I: (−2x + 2x) + (y + y) + (2z − z) = −3 + 8  →  2y + z = 5`; `(2y + z) − 2(y + z) = 5 − 2 · 2  →  2y + z − 2y − 2z = 1  →  −z = 1` |
| e043 | równania | 2x+1=2x+1 | 2 | dlaczego-falszywe | krytyczna | `0 = 0` z „dlaczego”: `Po uproszczeniu zostało zdanie fałszywe, więc żadna liczba nie spełnia równania.` | Zdanie mówi odwrotność tego, co widać: 0 = 0 jest prawdą, więc każda liczba jest rozwiązaniem. Uczeń wyniesie fałszywy wniosek. | why: `Zostało zdanie prawdziwe, więc każda liczba spełnia równanie.`; dodać krok Odpowiedź: `x ∈ ℝ (nieskończenie wiele rozwiązań)` |
| e001, e002, e003, e004, e005, e006, e007, e010, e019, e021, e022, e023, e024, e051, e054, e055, e056, e057 | równania | np. x^3 - 6x^2 + 11x - 6 = 0 | Sprawdzenie | skok | powazna | `L = 3³ − 6 · 3² + 11 · 3 − 6 = 0`; `L = 2² − 5 · 2 + 6 = 0`; `L = 3(5 − 2) = 9`; `P = 2^(3 + 3) = 64`; `L = ((7/2) + 1)/((7/2) − 2) = (9/2)/(3/2) = 3`; `−3 · 2 − 3 + 2 · (−1) = −11 ✓` | Po wstawieniu liczby od razu stoi wynik; wartości częściowe (potęgi, iloczyny) trzeba liczyć w głowie. Najgorzej przy sześcianach (e004, e005). | `L = 3³ − 6 · 3² + 11 · 3 − 6 = 27 − 54 + 33 − 6 = 0`; `L = 2² − 5 · 2 + 6 = 4 − 10 + 6 = 0`; `L = 3(5 − 2) = 3 · 3 = 9`; `P = 2^(3 + 3) = 2⁶ = 64`; `(9/2)/(3/2) = 9/2 · 2/3 = 3`; `−6 − 3 − 2 = −11`; `√(6 + 3) = √9 = 3` (e010) |
| e009 | równania | \|x - 2\| < 3 | 3 | skok | powazna | `−1 < x < 5` | Z `−3 < x − 2 < 3` trzeba dodać 2 do trzech części; nie widać, co dodaję ani rachunków −3 + 2 i 3 + 2. | `−3 + 2 < x − 2 + 2 < 3 + 2  →  −1 < x < 5` |
| e025, e026, e027, e029 | równania | np. tg(x)^2 = 3 | odczyt z tablicy | skok | powazna | `⟦sin(−π/6)⟧ = −1/2`, `⟦cos(π)⟧ = −1`, `⟦tg(π/3)⟧ = √3`, `⟦cos(π/2)⟧ = 0`, `⟦cos(0)⟧ = 1` | Dymek „Wartości funkcji trygonometrycznych z tablicy” pokazuje tylko sin π/6, sin/cos π/4, cos π/3, tg π/4. Tych wartości (ujemny kąt, π, π/2, 0, tg π/3) w nim nie ma, więc muszę je zgadywać. | `here`: `sin(−π/6) = −sin(π/6) = −1/2`; `tg(π/3) = sin(π/3)/cos(π/3) = (√3/2)/(1/2) = √3`; `cos(π) = −1, cos(π/2) = 0, cos(0) = 1 (punkt na okręgu jednostkowym)`; dopisać te wiersze do `tex` dymku |
| e029 | równania | cos(x)^2 - cos(x) = 0 | 8 | dlaczego-falszywe | powazna | `x = π/2 + ⟦kπ⟧` z „dlaczego”: `Ta wartość powtarza się co $\pi$` | Dymek mówi, że cosinus powtarza się co 2π. Skąd okres π dla cos x = 0, nie wiadomo; brakuje drugiego kąta −π/2. | `cos(π/2) = 0 i cos(−π/2) = 0`; `x = π/2 + 2kπ lub x = −π/2 + 2kπ`; `−π/2 = π/2 − π, więc razem: x = π/2 + kπ` |
| e013 | równania | x + y = 5, x - y = 1 (Przeciwne współczynniki) | 2 | skok | powazna | `⟦2x⟧ = ⟦6⟧` | Samo dodawanie stronami jest ukryte: nie widać, że y − y = 0. | `(x + y) + (x − y) = 5 + 1  →  x + x + y − y = 6  →  2x = 6` |
| e014 | równania | x + y = 5, x - y = 1 (Wyznaczniki) | 3 | skok | powazna | `Wy = 1 · 1 − 1 · 5 = 1 − 5 = −4` z pustym `here` | Nie widzę tabelki, którą kolumnę zastąpiono i skąd te liczby; przy Wy łatwo pomylić kolejność. | `Wx = \|5  1; 1  −1\| = 5 · (−1) − 1 · 1`; `Wy = \|1  5; 1  1\| = 1 · 1 − 1 · 5`; `here`: `a₁ = 1, b₁ = 1, c₁ = 5, a₂ = 1, b₂ = −1, c₂ = 1` |
| e031 | równania | 1/x < 2 | 4 | skok | powazna | `(1 − 2x)/x < 0` | Nie widać, że 2 trzeba zapisać jako 2x/x. Dymek pokazuje wzór dla dwóch ułamków, a tu jest liczba. | `1/x − 2 = 1/x − 2x/x = (1 − 2x)/x` |
| e032 | równania | (x+3)/(x-1) ≤ 1 | 4 | skok | powazna | `(x + 3 − (x − 1))/(x − 1) ≤ 0` / `4/(x − 1) ≤ 0` | Ukryte: 1 = (x − 1)/(x − 1) oraz opuszczenie nawiasu z minusem i redukcja. | `(x + 3)/(x − 1) − (x − 1)/(x − 1) = (x + 3 − x + 1)/(x − 1) = 4/(x − 1)` |
| e018, e020 | równania | x + y + z = 6, x - y + z = 2, x + y - z = 0 | 2 (e018); 3–4 (e020) | skok | powazna | `II − I:  −2y = −4`, `III − I:  −2z = −6`; `III − I:  y − z = −1`, `III − II:  −2z = −4` | Odejmowanie równań wyraz po wyrazie jest w głowie (3 wyrazy plus prawa strona). | `II − I: (x − y + z) − (x + y + z) = 2 − 6  →  −2y = −4`; `III − I: (x + y) − (x + z) = 1 − 2  →  y − z = −1`; `(y − z) − (y + z) = −1 − 3  →  −2z = −4` |
| e019 | równania | 2x + y - z = 8, ... | 2 | dlaczego-falszywe | powazna | `Od równań odejmuję pierwsze pomnożone przez taką liczbę` przy `2 · II + 3 · I` | Tu mnożę też drugie równanie i dodaję, nie odejmuję. Nie widać, skąd 2 i 3. | why: `Przy x stoją −3 i 2; 2 · (−3) + 3 · 2 = 0, więc biorę 2 · II + 3 · I i x znika.` |
| e021, e022, e024 | równania | 4^x - 3*2^x + 2 = 0 | 2–3 | skok | powazna | `4^x = ⟦(2^x)²⟧`, `⟦t² − 3t + 2 = 0⟧` | Skąd 4^x = (2^x)², nie widać. Nie widać też równania przed zamianą na t. | `4^x = (2²)^x = 2^(2x) = (2^x)²`; `(2^x)² − 3 · 2^x + 2 = 0  →  t² − 3t + 2 = 0`; e024: `9^x = (3²)^x = 3^(2x) = (3^x)²` |
| e023 | równania | 2^(x+1) + 2^x = 12 | 2–3 | skok | powazna | `2^(x + 1) = ⟦2 · 2^x⟧`, `⟦3t = 12⟧` | Ukryte prawo a^(m+n) = a^m · a^n i dodanie 2t + t. | `2^(x + 1) = 2^x · 2¹ = 2 · 2^x`; `2t + t = 12  →  3t = 12` |
| e040 | równania | x^3=8 (Rozkład) | 3 | dlaczego-falszywe | powazna | dymek „Różnica sześcianów”: `Przy pierwiastkach trzeciego stopnia kwadrat nie wystarczy. Mnożymy przez $a^{2}+ab+b^{2}$ ... a sześcian usuwa $\sqrt[3]{\ }$.` | Dymek opisuje usuwanie pierwiastka z mianownika, a tutaj nie ma pierwiastka. Do kroku nie pasuje. | dymek why: `Różnicę sześcianów zapisujemy jako iloczyn (a − b)(a² + ab + b²).`; here: `a = x, b = 2: (x − 2)(x² + x · 2 + 2²) = (x − 2)(x² + 2x + 4)` |
| e040, e041 | równania | x^3=8 | 7 / 9 | nieczytelne | powazna | label `Delta ujemna: brak rozwiązań`, math `brak rozwiązań rzeczywistych`, why `więc równanie nie ma rozwiązań` | Brzmi to tak, jakby całe równanie nie miało rozwiązań, a odpowiedź to x = 2. Chodzi tylko o drugi nawias. | label: `Ten nawias nie daje rozwiązań`; math: `x² + 2x + 4 = 0: Δ < 0, brak rozwiązań; zostaje x = 2` |
| e042, e043 | równania | 2x+1=2x+3 | 2 | skok | powazna | `−2 = 0`; `0 = 0` | Nie widać przeniesienia ani skrócenia 2x − 2x. | `2x − 2x = 3 − 1  →  0 = 2 (fałsz)`; `2x − 2x = 1 − 1  →  0 = 0 (prawda)` |
| e045 | równania | 2x+4y=6, x+2y=3 | 4 | skok | powazna | `Nieskończenie wiele rozwiązań: y = −(1/2)x + 3/2` | Wzór na y pojawia się bez rachunku. | `x + 2y = 3  →  2y = 3 − x  →  y = (3 − x)/2 = −(1/2)x + 3/2` |
| e052 | równania | x^2 - 2x - 1 = 0 | 5 | skok | powazna | `⟦(2 − 2√2) / (2 · 1)⟧ = 1 − √2` | Ukryte dzielenie każdego wyrazu licznika przez 2. | `(2 − 2√2)/2 = 2/2 − 2√2/2 = 1 − √2` |
| e002, e005, e015, e021, e024, e025, e050, e051, e052 | równania | x^2 - 5x + 6 = 0 | rozwiązania z delty | skok | drobna | `x₁ = ⟦(5 − 1) / (2 · 1)⟧`, `x₀ = ⟦4 / (2 · 1)⟧` | We wzorze jest −b, a w kroku od razu 5; −(−5) = 5 robię w głowie. | `x₁ = (−(−5) − √1)/(2 · 1) = (5 − 1)/2 = 4/2 = 2` |
| e010, e022, e025, e026, e049, e052 | równania | 4^x + 2^x - 6 = 0 | delta | skok | drobna | `Δ = ⟦1² − 4 · 1 · (−6)⟧ = 1 + 24 = 25`; `7² − 4 · (−1) · (−6) = 49 − 24` | Znak iloczynu z dwiema liczbami ujemnymi i zamianę „minus minus” trzeba ustalić w głowie. | `4 · 1 · (−6) = −24, więc 1 − (−24) = 1 + 24 = 25`; `4 · (−1) · (−6) = 24, więc 49 − 24 = 25` |
| e010 | równania | √(x + 3) = x - 3 | 4 | skok | drobna | `x + 3 = x² − 3x − 3x + 9` z dymkiem „Opuszczanie nawiasów” `a(b+c)=ab+ac` | Dymek nie mówi, jak rozpisać kwadrat nawiasu. | `(x − 3)² = (x − 3)(x − 3) = x² − 3x − 3x + 9` |
| e011, e025 | równania | sin(x) = 1/2 | 3 / 10 | skok | drobna | `π − π/6 = 5π/6`; `π − (−π/6) = 7π/6` | Ukryte sprowadzenie π do szóstych. | `π − π/6 = 6π/6 − π/6 = 5π/6`; `π − (−π/6) = 6π/6 + π/6 = 7π/6` |
| e025, e026 | równania | 2sin(x)^2 - sin(x) - 1 = 0 | 12 / 10 | skok | drobna | `x = π/2 + ⟦2kπ⟧` z „dlaczego” `Wykres powtarza się co $2\pi$` | Wcześniej była reguła α i π − α (sin) lub α i −α (cos); nie widać, czemu tu jest jedna seria. | `π − π/2 = π/2 (ten sam kąt), więc jedna seria`; e026: `−π = π − 2π (ta sama seria)` |
| e027 | równania | tg(x)^2 = 3 | 2 | dlaczego-falszywe | drobna | `t = tg(x)` z „dlaczego” `a warunek mówi, jakie wartości ta litera może mieć` | Warunku nie ma. Brakuje też dziedziny tangensa. | `t = tg(x), t dowolne (tangens przyjmuje każdą wartość); x ≠ π/2 + kπ` |
| e015, e033, e036, e038, e039, e032 | równania | x^2 - 5x + 6 >= 0 | Odpowiedź | skok | drobna | `x ∈ (−∞, 2⟩ ∪ ⟨3, +∞)`; e032: `x ∈ (−∞, 1)` przy `≤` | Nie widać, dlaczego końce są domknięte, a w e032 otwarte mimo ≤. | `≥ 0, więc miejsca zerowe 2 i 3 też należą do wyniku`; e032: `4/(x − 1) nigdy nie jest 0, a 1 ∉ D, więc nawias otwarty` |
| e016, e017, e030, e031, e033, e034, e035, e036, e037, e038, e039 | równania | (x - 1)(x - 2)(x + 3) > 0 | Odpowiedź | skok | drobna | `(−∞, −3): −,  (−3, 1): +,  (1, 2): −,  (2, +∞): +` → `x ∈ (−3, 1) ∪ (2, +∞)` | Nie jest powiedziane, że biorę przedziały z „+” (przy > 0) albo z „−” (przy < 0). | `> 0, więc biorę przedziały ze znakiem +: (−3, 1) i (2, +∞)` |
| e031, e032, e040, e041 | równania | 1/x < 2 | 3 / 2 | dlaczego-falszywe | drobna | `Po prawej zostaje 0, a z postaci „coś = 0” łatwo odczytać współczynniki.` | To nierówność albo krok przed rozkładem: żadnych współczynników tu się nie odczytuje. | why: `Po prawej zostaje 0, więc wystarczy zbadać znak (albo rozłożyć) lewą stronę.` |
| e031 | równania | 1/x < 2 | 6 | skok | drobna | `x = 1/2` | Nie widać rozwiązania −2x + 1 = 0. | `−2x + 1 = 0  →  −2x = −1  →  x = 1/2` |
| e038 | równania | (x^2+4)(x-1) ≤ 0 | 2 | dlaczego-falszywe | drobna | `x² + 4 > 0 dla każdego x` z „dlaczego” `Każdy nawias jest zerem w jednym punkcie` | x² + 4 nigdy nie jest zerem, więc zdanie temu przeczy; brak też uzasadnienia. | `x² ≥ 0, więc x² + 4 ≥ 4 > 0`; why: `Nawias x − 1 jest zerem w x = 1, a x² + 4 jest zawsze dodatni i nie zmienia znaku.` |
| e018, e019, e020 | równania | układy 3×3 | Sprawdzenie | dlaczego-falszywe | drobna | `Wstawiam obie liczby do obu równań` | Są trzy liczby i trzy równania. | `Wstawiam x, y, z do wszystkich trzech równań: każde musi wyjść prawdziwe.` |
| e019, e020 | równania | układy 3×3 | 3–4 | nieczytelne | drobna | `III − 2 · II:  −z = 1` (II i III to już nowe równania z kroku 2) | Numery II i III raz oznaczają równania wyjściowe, a raz nowe, i łatwo je pomylić. | `III′ − 2 · II′: (2y + z) − 2(y + z) = 5 − 4`, z opisem `II′: y + z = 2, III′: 2y + z = 5` |
| e020 | równania | y+z=3, x+z=2, x+y=1 | 2 | dlaczego-falszywe | drobna | `Na górę daję równanie z najprostszą liczbą przy pierwszej niewiadomej, żeby odejmować bez ułamków.` | Prawdziwy powód: w pierwszym równaniu w ogóle nie ma x. | why: `W pierwszym równaniu nie ma x, więc na górę daję równanie z x.` |
| e018, e019, e020 | równania | układy 3×3 | dymek Gaussa | zargon | drobna | `b_{2}^{\prime}y+c_{2}^{\prime}z=d_{2}^{\prime}`, `c_{3}^{\prime\prime}` | Znaczki ′ i ″ nie są nigdzie wyjaśnione. | dymek why: `Kreska (b′) oznacza liczbę, która zmieniła się po odjęciu równań.` |
| e022, e023 | równania | 4^x + 2^x - 6 = 0 | Wracam do x | dlaczego-falszywe | drobna | `rozwiązuję każde równanie osobno` przy `⟦2^x⟧ = 2` | Zostało tylko jedno równanie. | why: `Litera pomocnicza to nie wynik. Wpisuję z powrotem 2^x i rozwiązuję to równanie.` |
| e021, e024, e025, e026, e027, e029 | równania | 4^x - 3*2^x + 2 = 0 | kroki po „Wracam do x” | nieczytelne | drobna | label `Zapisuję obie strony jako potęgi 2` (dwa razy), `Odczytuję kąt z tablicy` (dwa razy) | Nie widać, która gałąź jest teraz rozwiązywana. | label: `Rozwiązuję 2^x = 1`, potem `Rozwiązuję 2^x = 2` |
| e021, e022, e024, e025, e026 | równania | 9^x - 4*3^x + 3 = 0 | rozwiązania z delty | nieczytelne | drobna | why `i tak dostaję $x_{1}$ oraz $x_{2}$` przy `t₁ = …` | Liczę t, a tekst mówi o x. | why: `… i tak dostaję t₁ oraz t₂.` |
| e025, e026, e027, e028, e029 | równania | 2sin(x)^2 - sin(x) - 1 = 0 | 1–2 | nieczytelne | drobna | `2sin(x)² − sin(x) − 1 = 0` | Zapis sin(x)² wygląda jak sin(x²). | `2(sin x)² − sin x − 1 = 0  →  2t² − t − 1 = 0` |
| e026 | równania | 2cos(x)^2 + cos(x) = 1 | 2 | skok | drobna | `⟦2t² + t − 1 = 0⟧` | Przeniesienie 1 na lewo jest ukryte. | `2t² + t = 1  →  2t² + t − 1 = 0` |
| e041 | równania | x^3=8 (Horner) | 3–4 | skok | drobna | `W(2) = 8 − 8 = 0`; tabelka `1  0  0 −8` | „Sprawdzam dzielniki, aż któryś da 0”, ale nie widać W(1). Nie wiadomo też, skąd zera w tabelce. | `W(1) = 1 − 8 = −7 ≠ 0`, `W(2) = 2³ − 8 = 0`; `x³ − 8 = x³ + 0x² + 0x − 8` |
| e042, e043 | równania | 2x+1=2x+3 | koniec | skok | drobna | (brak kroku Odpowiedź) | Zadanie kończy się zdaniem bez odpowiedzi. | e042: `Odpowiedź: brak rozwiązań`; e043: `Odpowiedź: x ∈ ℝ` |
| e044 | równania | \|x\|=-1 | 2 | dlaczego-falszywe | drobna | `a to rozstrzyga nierówność bez liczenia` | To równanie, nie nierówność. | why: `Odległość od zera nigdy nie jest ujemna, więc |x| nie może równać się −1.` |
| e046 | równania | sqrt(x)=3 | 2 | nieczytelne | drobna | `x ≥ 0` / `x ≥ 0` | Ten sam warunek dwa razy; drugi powinien dotyczyć prawej strony (3 ≥ 0). | `x ≥ 0 (pod pierwiastkiem); 3 ≥ 0 (prawa strona, zawsze)` |
| e048, e049 | równania | x^2+1>0 | 4–6 | skok | drobna | `x² + 1 ≠ 0`; `a = −1 < 0` → `x ∈ ℝ` | Nie widać, czemu x² = −1 nie ma rozwiązań i czemu stąd wychodzi cała oś. | `x² ≥ 0, a −1 < 0, więc x² = −1 nie ma rozwiązań`; `parabola cała pod osią, więc −x² + 2x − 5 < 0 dla każdego x` |
| e056 | równania | x/2 + 1 = 3 | 2 | nieczytelne | drobna | `x/2 = (1/2)x` pod etykietą `Przenoszę liczby na prawo` | Przepisanie zapisu siedzi w kroku o przenoszeniu. | osobny krok: `Zapisuję x/2 jako (1/2)x` |
| e007 | równania | 4^x = 2^(x+3) | 2 | dlaczego-falszywe | drobna | dymek `a^{m}=a^{n}\Rightarrow m=n` przy `(2²)^x = 2^(2x)` | Dymek mówi o innym prawie niż krok. | dymek: `(a^m)^n = a^(m·n)`, here: `(2²)^x = 2^(2·x)` |
| e003, e004, e035 | równania | x^2 - 5x + 6 = 0 (Suma i iloczyn) | Viète | skok | drobna | `1 · 6 = 6 … 2 · 3 = 6, 2 + 3 = 5` | Nie wiadomo, czemu pomijam pary ujemne (−1, −6), (−2, −3). | `iloczyn 6 > 0 i suma 5 > 0, więc obie liczby dodatnie` |
| e004, e005 | równania | x^3 - 6x^2 + 11x - 6 = 0 | 2–4 | nieczytelne | drobna | metoda `Rozkład na czynniki` vs `Schemat Hornera` | Kroki 2–4 są identyczne, różni się tylko koniec (Viète albo delta), więc nazwy sposobów mylą. | nazwy: `Horner + suma i iloczyn` / `Horner + delta` |

### Interaktywność (każde zadanie)

| id | dział | zadanie (q) | krok k | kategoria | ważność | cytat | czego brakuje | propozycja zapisu |
|---|---|---|---|---|---|---|---|---|
| e001 | równania | 3(x - 2) = x + 4 | 6 | interaktywnosc | drobna | `L = 3(5 − 2) = 9` | stuknięcie wyniku: rachunek | `3 · 3 = 9` |
| e002 | równania | x^2 - 5x + 6 = 0 (Delta) | 5, 6 | interaktywnosc | drobna | `⟦(5 − 1) / (2 · 1)⟧` | stuknięcie 5: skąd −b | `−(−5) = 5`; w sprawdzeniu `4 − 10 + 6` |
| e003 | równania | x^2 - 5x + 6 = 0 (Suma i iloczyn) | 2 | interaktywnosc | drobna | `2 · 3 = 6, 2 + 3 = 5` | stuknięcie: lista wszystkich par | `(1,6), (2,3), (−1,−6), (−2,−3)` |
| e004 | równania | x^3 - 6x^2 + 11x - 6 = 0 (Rozkład) | 2, 9 | interaktywnosc | drobna | `W(1) = 1 − 6 + 11 − 6 = 0` | stuknięcie W(1): podstawienie; sprawdzenie: potęgi | `1³ − 6·1² + 11·1 − 6`; `27 − 54 + 33 − 6` |
| e005 | równania | x^3 - 6x^2 + 11x - 6 = 0 (Horner) | 9, 10 | interaktywnosc | drobna | `⟦(5 − 1) / (2 · 1)⟧` | stuknięcie: −b i wartości w sprawdzeniu | `−(−5) = 5` |
| e006 | równania | (x + 1)/(x - 2) = 3 | 9 | interaktywnosc | drobna | `(9/2)/(3/2) = 3` | stuknięcie: dzielenie ułamków | `9/2 · 2/3 = 3` |
| e007 | równania | 4^x = 2^(x+3) | 2, 6 | interaktywnosc | drobna | `(2²)^x` | stuknięcie: potęga potęgi; `2⁶ = 64` | `(a^m)^n = a^(mn)` |
| e008 | równania | log_3(2x-1) = 2 | 3 | interaktywnosc | drobna | `⟦3²⟧` | stuknięcie: definicja logarytmu z liczbami | `log₃(9) = 2, bo 3² = 9` |
| e009 | równania | \|x - 2\| < 3 | 3 | interaktywnosc | drobna | `−1 < x < 5` | stuknięcie: dodanie 2 do trzech części | `−3 + 2 < x < 3 + 2` |
| e010 | równania | √(x + 3) = x - 3 | 4, 8 | interaktywnosc | drobna | `x² − 3x − 3x + 9` | stuknięcie: mnożenie nawiasów; znak iloczynu w delcie | `(x − 3)(x − 3)`; `4·(−1)·(−6) = 24` |
| e011 | równania | sin(x) = 1/2 | 2, 3 | interaktywnosc | drobna | `⟦sin(π/6)⟧` | stuknięcie: okrąg z kątem π/6 i π − π/6 | `6π/6 − π/6` |
| e012 | równania | x + y = 5, x - y = 1 (Podstawianie) | 3 | interaktywnosc | drobna | `⟦x − (5 − x)⟧` | stuknięcie: co podstawiono za y | `y = 5 − x` |
| e013 | równania | x + y = 5, x - y = 1 (Przeciwne) | 2 | interaktywnosc | drobna | `⟦2x⟧ = ⟦6⟧` | stuknięcie 2x: dodawanie stronami | `(x + y) + (x − y) = 5 + 1` |
| e014 | równania | x + y = 5, x - y = 1 (Wyznaczniki) | 2, 3 | interaktywnosc | drobna | `Wx = 5 · (−1) − 1 · 1` | stuknięcie: tabelka 2×2 z zaznaczonymi przekątnymi | `\|5 1; 1 −1\|` |
| e015 | równania | x^2 - 5x + 6 >= 0 | 7 | interaktywnosc | drobna | `a = ⟦1⟧ > 0` | stuknięcie: szkic paraboli z zaznaczonymi przedziałami | wykres z 2 i 3 |
| e016 | równania | (x - 1)(x - 2)(x + 3) > 0 | 3 | interaktywnosc | drobna | `(−∞, −3): −` | stuknięcie: rysunek wężyka | wężyk przez −3, 1, 2 |
| e017 | równania | (x - 1)/(x + 2) > 0 | 5 | interaktywnosc | drobna | `(−2, 1): −` | stuknięcie: wężyk z kółkiem pustym w −2 | wężyk |
| e018 | równania | x + y + z = 6, ... | 2 | interaktywnosc | drobna | `II − I:  −2y = −4` | stuknięcie: odejmowanie wyraz po wyrazie | `(x − y + z) − (x + y + z)` |
| e019 | równania | 2x + y - z = 8, ... | 2, 3 | interaktywnosc | drobna | `2 · II + 3 · I` | stuknięcie: pomnożone równania i suma | `−6x − 2y + 4z = −22` |
| e020 | równania | y+z=3, x+z=2, x+y=1 | 3, 4 | interaktywnosc | drobna | `III − I:  y − z = −1` | stuknięcie: odejmowanie | `(x + y) − (x + z) = 1 − 2` |
| e021 | równania | 4^x - 3*2^x + 2 = 0 | 2 | interaktywnosc | drobna | `4^x = ⟦(2^x)²⟧` | stuknięcie: wyprowadzenie | `(2²)^x = 2^(2x) = (2^x)²` |
| e022 | równania | 4^x + 2^x - 6 = 0 | 2, 5 | interaktywnosc | drobna | `1 + 24` | stuknięcie: znak −4·1·(−6) | `−(−24) = +24` |
| e023 | równania | 2^(x+1) + 2^x = 12 | 2, 3 | interaktywnosc | drobna | `⟦3t = 12⟧` | stuknięcie: `2t + t` | `2^x · 2¹` |
| e024 | równania | 9^x - 4*3^x + 3 = 0 | 2 | interaktywnosc | drobna | `9^x = ⟦(3^x)²⟧` | stuknięcie: wyprowadzenie | `(3²)^x = (3^x)²` |
| e025 | równania | 2sin(x)^2 - sin(x) - 1 = 0 | 9 | interaktywnosc | drobna | `⟦sin(−π/6)⟧` | stuknięcie: sin(−α) = −sin α na okręgu | `−sin(π/6)` |
| e026 | równania | 2cos(x)^2 + cos(x) = 1 | 9 | interaktywnosc | drobna | `⟦cos(π)⟧` | stuknięcie: punkt π na okręgu | `(−1, 0)` |
| e027 | równania | tg(x)^2 = 3 | 7 | interaktywnosc | drobna | `⟦tg(π/3)⟧` | stuknięcie: tg = sin/cos | `(√3/2)/(1/2)` |
| e028 | równania | sin(x)^2 = 4 | 4 | interaktywnosc | drobna | `t = 2 > 1, odpada` | stuknięcie: wykres sinusa z poziomem 2 | wykres |
| e029 | równania | cos(x)^2 - cos(x) = 0 | 8 | interaktywnosc | drobna | `x = π/2 + ⟦kπ⟧` | stuknięcie: dwa zera cos na okręgu | `π/2, −π/2` |
| e030 | równania | (x-1)/(x+2) > 0 | 5 | interaktywnosc | drobna | jak e017 | wężyk | wężyk |
| e031 | równania | 1/x < 2 | 4 | interaktywnosc | drobna | `(1 − 2x)/x` | stuknięcie: `2 = 2x/x` | `1/x − 2x/x` |
| e032 | równania | (x+3)/(x-1) ≤ 1 | 4 | interaktywnosc | drobna | `4/(x − 1)` | stuknięcie: `1 = (x−1)/(x−1)` | rozpis licznika |
| e033 | równania | (x^2-4)/(x-3) ≥ 0 | 6 | interaktywnosc | drobna | `(−2, 2): +` | wężyk z kółkami pełnymi/pustymi | wężyk |
| e034 | równania | (x-1)(x-2)(x+3) > 0 | 3 | interaktywnosc | drobna | jak e016 | wężyk | wężyk |
| e035 | równania | x^3-6x^2+11x-6 > 0 | 9 | interaktywnosc | drobna | `(1, 2): +` | wężyk | wężyk |
| e036 | równania | (x-1)^2(x+2) ≥ 0 | 3 | interaktywnosc | drobna | `1 (podwójne)` | wężyk z odbiciem w 1 | wężyk |
| e037 | równania | x^3 - x < 0 | 6 | interaktywnosc | drobna | `(−1, 0): +` | wężyk | wężyk |
| e038 | równania | (x^2+4)(x-1) ≤ 0 | 2 | interaktywnosc | drobna | `x² + 4 > 0` | stuknięcie: `x² ≥ 0 → x² + 4 ≥ 4` | rozpis |
| e039 | równania | -2(x-1)(x+3)(x-5) ≥ 0 | 3 | interaktywnosc | drobna | `a = −2 < 0` | wężyk zaczynający się pod osią | wężyk |
| e040 | równania | x^3=8 (Rozkład) | 3 | interaktywnosc | drobna | `⟦(x − 2)(x² + 2x + 4)⟧` | stuknięcie: podstawienie a = x, b = 2 | `x² + x·2 + 2²` |
| e041 | równania | x^3=8 (Horner) | 3 | interaktywnosc | drobna | `W(2) = 8 − 8` | stuknięcie: W(1) i inne sprawdzone dzielniki | `W(1) = −7` |
| e042 | równania | 2x+1=2x+3 | 2 | interaktywnosc | drobna | `−2 = 0` | stuknięcie: skrócenie 2x | `2x − 2x = 3 − 1` |
| e043 | równania | 2x+1=2x+1 | 2 | interaktywnosc | drobna | `0 = 0` | stuknięcie: skrócenie | `2x − 2x = 1 − 1` |
| e044 | równania | \|x\|=-1 | 2 | interaktywnosc | drobna | `\|x\| ≥ 0` | oś z odległością od zera | rysunek osi |
| e045 | równania | 2x+4y=6, x+2y=3 | 4 | interaktywnosc | drobna | `y = −(1/2)x + 3/2` | stuknięcie: wyznaczenie y; rysunek jednej prostej | `2y = 3 − x` |
| e046 | równania | sqrt(x)=3 | 3 | interaktywnosc | drobna | `⟦3²⟧` | (wystarczy dymek) | — |
| e047 | równania | x+0=4 | 2 | interaktywnosc | drobna | `x = 4` | (nic ukrytego) | — |
| e048 | równania | x^2+1>0 | 4 | interaktywnosc | drobna | `x² + 1 ≠ 0` | szkic paraboli nad osią | wykres |
| e049 | równania | -x^2+2x-5<0 | 6 | interaktywnosc | drobna | `a = −1 < 0` | szkic paraboli pod osią | wykres |
| e050 | równania | x^2-4x+4>0 | 6 | interaktywnosc | drobna | `a = 1 > 0` | szkic paraboli dotykającej osi w 2 | wykres |
| e051 | równania | x^2 - 4x + 4 = 0 | 4 | interaktywnosc | drobna | `⟦4 / (2 · 1)⟧` | stuknięcie: `−(−4) = 4` | rozpis |
| e052 | równania | x^2 - 2x - 1 = 0 | 5 | interaktywnosc | drobna | `= 1 − √2` | stuknięcie: dzielenie wyrazów licznika | `2/2 − 2√2/2` |
| e053 | równania | x^2 = 9 | 2 | interaktywnosc | drobna | `x = ±3` | (wystarczy dymek) | — |
| e054 | równania | 2x + 3 = 11 | 5 | interaktywnosc | drobna | `L = 2 · 4 + 3 = 11` | stuknięcie: `8 + 3` | rozpis |
| e055 | równania | 5 = 2x - 7 | 6 | interaktywnosc | drobna | `L = 2 · 6 − 7 = 5` | stuknięcie: `12 − 7` | rozpis |
| e056 | równania | x/2 + 1 = 3 | 5 | interaktywnosc | drobna | `L = 4/2 + 1 = 3` | stuknięcie: `2 + 1` | rozpis |
| e057 | równania | x^2 - 3x = 0 | 4 | interaktywnosc | drobna | `L = 3² − 3 · 3 = 0` | stuknięcie: `9 − 9` | rozpis |
| e058 | równania | x^2 + 1 = 0 | 3 | interaktywnosc | drobna | `brak rozwiązań rzeczywistych` | (wystarczy „dlaczego”) | — |

## Pytanie obowiązkowe: „Czy umiałbym rozwiązać podobne zadanie sam, tylko z tych kroków?”

- e001: tak, każdy krok to jedno działanie.
- e002: tak, ale −(−5) = 5 muszę sam zauważyć.
- e003: tak, choć nie wiem, kiedy szukać par ujemnych.
- e004: tak, tabelka Hornera wszystko pokazuje; sprawdzenie liczyłbym w głowie.
- e005: tak, jak w e004.
- e006: tak, kroki są drobne.
- e007: tak, choć prawo potęgi potęgi znam tylko z „dlaczego”.
- e008: tak, dymek z definicją logarytmu wystarcza.
- e009: raczej tak, ale nie widzę, że do wszystkich części dodaję 2.
- e010: tak, ale kwadrat nawiasu musiałbym wiedzieć sam.
- e011: tak, dla kątów z tablicy w dymku.
- e012: tak.
- e013: nie, nie widać, jak „dodać równania stronami”.
- e014: nie, bez tabelki nie wiem, które liczby wziąć do Wy.
- e015: tak, ale nie wiem, kiedy domknąć nawias.
- e016: tak, zasada wężyka jest w „dlaczego”, ale rysunku brak.
- e017: tak.
- e018: nie, odejmowania równań nie widać.
- e019: nie, nie wiem, skąd mnożniki 2 i 3 ani jak liczyć kombinację.
- e020: nie, jak w e018.
- e021: nie, nie widzę, skąd 4^x = (2^x)².
- e022: nie, jak w e021.
- e023: nie, nie wiem, czemu 2^(x+1) = 2 · 2^x.
- e024: nie, jak w e021.
- e025: nie, sin(−π/6) i sin(π/2) nie ma w tablicy z dymku.
- e026: nie, brak cos(π) w tablicy.
- e027: nie, brak tg(π/3) w tablicy.
- e028: tak, odrzucenie jest dobrze wyjaśnione.
- e029: nie, nie wiem, skąd okres π dla cos x = 0.
- e030: tak (jak e017).
- e031: nie, nie wiem, jak sprowadzić 2 do mianownika x.
- e032: nie, jak w e031.
- e033: tak, ale domknięcie przedziałów zgaduję.
- e034: tak (jak e016).
- e035: tak, Horner i Viète są pokazane.
- e036: tak, zdanie o podwójnym zerze tłumaczy wężyk.
- e037: tak.
- e038: tak, choć nie wiem, skąd pewność, że x² + 4 > 0.
- e039: tak.
- e040: raczej nie, dymek tłumaczy coś innego, a „brak rozwiązań” myli.
- e041: tak, tabelka Hornera jest, choć zera w niej zgaduję.
- e042: tak, ale bez kroku skracania zrobiłbym to na wyczucie.
- e043: nie, „dlaczego” mówi, że rozwiązań nie ma.
- e044: tak.
- e045: raczej nie, nie wiem, skąd wzór na y.
- e046: tak.
- e047: tak.
- e048: tak, choć powód braku miejsc zerowych muszę znać sam.
- e049: tak.
- e050: tak.
- e051: tak.
- e052: nie, nie widać, jak (2 − 2√2)/2 daje 1 − √2.
- e053: tak.
- e054: tak.
- e055: tak.
- e056: tak.
- e057: tak.
- e058: tak.

## Podsumowanie

- Uwagi (bez interaktywności): krytyczne 2, poważne 17, drobne 30; interaktywność: 58 wierszy (po jednym na zadanie).
- Zadania bez uwag (poza interaktywnością): 5 (e008, e012, e047, e053, e058).
- „Nie” w pytaniu obowiązkowym: 19 z 58 zadań (w tym 3 „raczej nie”).
