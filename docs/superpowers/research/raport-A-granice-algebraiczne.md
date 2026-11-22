# Raport A: granice algebraiczne, zrozumiałość kroków

Zakres: zestaw 1a–5e, ściąga (x→4 rozkład 0/0, x→−∞ x/√(3x²+5)), dodatkowe ((1−1/n)², √(7−2x)(…)).
Źródło kroków: `kroki-wszystkie.json`. Kod: `js/math-limits.js`, wyświetlanie: `js/math-calculus.js`.
Silnika nie uruchamiałem. Wszystkie wyniki liczbowe w danych są poprawne. Chodzi tylko o to, czy uczeń rozumie kroki.

---

## 1. Dwa zadania obowiązkowe

### 1.1 `lim n→∞ (1-1/n)^2` (dodatkowe), wynik 1

Kroki z JSON:
1. Granica :: lim(n→∞) (−1 + 1/n)²
2. Sprowadzamy do wspólnego mianownika :: −1 + 1/n = (−n + 1)/n
3. Upraszczamy :: lim(n→∞) (n − 1)²/n²
4. Wyłączamy n² przed nawias :: lim(n→∞) n²(1 − 1/n)²/(n²)
5. Skracamy n² :: lim(n→∞) (1 − 1/n)²
6. Wyrazy z n w mianowniku dążą do 0 :: → 1
7. Wynik :: lim(n→∞) (−1 + 1/n)² = 1

Problemy:
- **Krok 1 i 7: zmieniony zapis zadania.** Użytkownik wpisał (1 − 1/n)², a widzi (−1 + 1/n)². Matematycznie to samo (kwadrat), ale słaby uczeń pomyśli, że aplikacja źle przepisała zadanie. Przyczyna w silniku (patrz 5.1): `run()` buduje wyrażenie `C.fromAst` (math-limits.js:990) **przed** `C.setVar(d.v)` (math-limits.js:991), więc przy budowaniu sortowanie wyrazów zna zmienną z poprzedniego zadania (domyślnie `x`), `asTerm` (math-calculus.js:62) widzi minus na pierwszym wyrazie i wyciąga go przed nawias.
- **Kroki 2–5: kręcenie się w kółko.** Wspólny mianownik, potem wyłączenie n², potem skrócenie daje (1 − 1/n)², czyli dokładnie to, co wpisał użytkownik. Cztery kroki pracy bez postępu. Uczeń wyciągnie wniosek, że matematyka to przepisywanie w kółko.
- **Krok 4: zapis „/(n²)”** z nawiasem przy jednym czynniku i licznik „n²(1 − 1/n)²” (n² wyciągnięte z kwadratu bez słowa, że (n−1)² = n²(1 − 1/n)²).
- **Brak symbolu nieoznaczonego w kroku 1**, bo go nie ma: to granica określona, wystarczy wstawić.

Propozycja (całość zamiast kroków 2–6):
| # | Etykieta | Wzór | Dlaczego (dla ucznia) |
|---|---|---|---|
| 1 | Zapisujemy granicę | lim(n→∞) (1 − 1/n)² | bez tagu: tu nie ma symbolu nieoznaczonego |
| 2 | Wstawiamy 1/n → 0 | ⟦1/n → 0⟧, więc (1 − 0)² = 1 | „Gdy n rośnie, 1/n robi się coraz mniejsze, więc w nawiasie zostaje 1.” |
| 3 | Wynik | lim(n→∞) (1 − 1/n)² = 1 | |

Kroki 2–5 obecne: **usunąć**. Wzór ⟦1/n → 0⟧ podpiąć pod wpis `c-przez-n` (sekcja 4).

### 1.2 `lim x→-∞ sqrt(7-2x)(sqrt(15-8x)-sqrt(3-8x))` (dodatkowe), wynik 3

Kroki z JSON:
1. Granica :: lim(x→−∞) √(−2x + 7) · (√(−8x + 15) − √(−8x + 3))
2. Mnożymy przez sprzężenie :: √(−8x + 15) − √(−8x + 3) = (−8x + 15 − (−8x + 3))/(√(−8x + 15) + √(−8x + 3))
3. Upraszczamy licznik :: lim(x→−∞) 12√(−2x + 7)/(√(−8x + 15) + √(−8x + 3))
4. Dla x → −∞ :: √(x²) = |x| = −x
5. Wyłączamy (−x)^(1/2) przed nawias :: lim(x→−∞) 12(−x)^(1/2)√(2 − 7/x)/((−x)^(1/2)(√(8 − 15/x) + √(8 − 3/x)))
6. Skracamy (−x)^(1/2) :: lim(x→−∞) 12√(2 − 7/x)/(√(8 − 15/x) + √(8 − 3/x))
7. Wyrazy z x w mianowniku dążą do 0 :: → 3
8. Wynik :: …

Problemy:
- **Krok 1: zmieniona kolejność** (−2x + 7 zamiast 7 − 2x, −8x + 15 zamiast 15 − 8x). Sortowanie malejąco po potędze x w `sortedTerms` (math-calculus.js:215). Uczeń szuka „swojego” zadania i go nie poznaje.
- **Krok 1: brak tagu [∞ · 0].** Właśnie to jest powód całej pracy; `indeterminate()` (math-limits.js:~950) nie rozpoznaje iloczynu ∞ · 0 (to samo w 4c).
- **Krok 2: „sprzężenie” bez celu.** Uczeń nie wie, co to słowo znaczy ani po co mnożyć. Brakuje też widocznego „mnożymy licznik i mianownik przez sumę”: od razu pokazany jest wynik wzoru.
- **Krok 4: nie ten wzór.** Pokazuje √(x²) = |x| = −x, a w zadaniu nigdzie nie ma x² pod pierwiastkiem. Potrzebny fakt to: „x jest ujemne, więc −x jest dodatnie i można wyciągnąć √(−x)”. Linia jest emitowana zawsze, gdy x → −∞ i jest parzysty pierwiastek (`hasEvenRoot`, math-limits.js:469), bez sprawdzenia, czy pod pierwiastkiem jest x².
- **Krok 5 i 6: zapis z klawiatury w etykiecie:** „(−x)^(1/2)”. W tym samym zadaniu zapis zmienia się trzy razy: √(x²), |x|, (−x)^(1/2). Przyczyna: `uText` (math-limits.js:~423) dla ujemnego kierunku pisze `'^(' + K.fmt(p) + ')'`.
- **Krok 5: skok** −2x + 7 = (−x)(2 − 7/x) niepokazany; minus w „2 − 7/x” bierze się z dzielenia przez −x, czego nikt nie mówi.
- **Krok 7:** „→ 3” bez pokazania 12√2/(√8 + √8) = 12√2/(4√2) = 3.

Propozycja:
| # | Etykieta | Wzór | Dlaczego | Akcja |
|---|---|---|---|---|
| 1 | Zapisujemy granicę | lim(x→−∞) √(7 − 2x) · (√(15 − 8x) − √(3 − 8x))  [∞ · 0] | „Pierwszy czynnik rośnie, różnica maleje do 0. Nie wiadomo, kto wygra, trzeba przekształcić.” | zmienić |
| 2 | Pozbywamy się różnicy pierwiastków | √(15 − 8x) − √(3 − 8x) = ⟦(15 − 8x − (3 − 8x))/(√(15 − 8x) + √(3 − 8x))⟧ | „Ze wzoru a² − b² = (a − b)(a + b) różnica pierwiastków zamienia się w zwykłe liczby.” | etykieta + wzór `sprzezenie` |
| 3 | Odejmujemy w liczniku | lim(x→−∞) 12√(7 − 2x)/(√(15 − 8x) + √(3 − 8x)) | „x się zniosło: 15 − 3 = 12.” | etykieta |
| 4 | Pamiętamy, że x jest ujemne | x < 0, więc −x > 0 | „Pod pierwiastkiem wyciągamy tylko liczbę dodatnią, dlatego −x, a nie x.” | zastąpić obecny krok 4 |
| 5 | Wyłączamy √(−x) przed nawias | 7 − 2x = (−x)(2 − 7/x), więc √(7 − 2x) = √(−x)·√(2 − 7/x) (pokaz dla licznika, potem całość) | „Tak samo jak n w granicach ciągów, tylko z −x, bo to ono rośnie.” | etykieta bez ^( ) |
| 6 | Skracamy √(−x) | … | | etykieta |
| 7 | Wstawiamy 1/x → 0 | 12√2/(√8 + √8) = 12√2/(4√2) = 3 | „Ułamki z x w mianowniku znikają, zostają same liczby.” | pokazać rachunek |

---

## 2. Problemy wspólne dla całej grupy (dotyczą wielu zadań naraz)

### 2.1 Krok 1 „Granica” + tag [∞/∞], [∞ − ∞], [0/0] bez wyjaśnienia
Wszystkie zadania. Tag jest żargonem; słaby uczeń nie wie, że to znaczy „jeszcze nie wiadomo, trzeba coś przekształcić”.
- Etykieta: **„Zapisujemy granicę”**.
- Dlaczego (zależne od tagu, jedno zdanie pod wzorem albo w dymku tagu):
  - [∞/∞]: „Licznik i mianownik rosną bez końca. Od razu nie widać wyniku, więc przekształcamy.”
  - [∞ − ∞]: „Odejmujemy dwie coraz większe liczby. Wynik może być dowolny, więc przekształcamy.”
  - [0/0]: „Po wstawieniu wychodzi 0/0, a tego nie wolno policzyć. Szukamy wspólnego czynnika.”
  - [∞ · 0]: „Jeden czynnik rośnie, drugi maleje do 0. Trzeba sprawdzić, który szybciej.”
- Brak tagu, choć jest symbol: 4c (∞·0), 4d (1/(∞ − ∞)), 4f (0/0 albo (∞−∞)/(∞−∞)), √(7−2x)(…). Najprostsze: tag [∞ · 0] dla iloczynu i tag dla różnicy w mianowniku; 4f prawdopodobnie przez próg 1e-9 w `kindOf` (1/√n maleje za wolno w próbce liczbowej).

### 2.2 „Wyłączamy n przed nawias” bez celu
1a–2f, 3b–3e, 4a–5e. Uczeń nie wie, po co.
- Etykieta: **„Wyłączamy n² przed nawias”** (zostaje), dlaczego: „Wyciągamy najszybciej rosnącą potęgę, żeby w nawiasie zostały liczby i ułamki, które znikają.”
- Dla par z różnymi potęgami (1d, 1e, 1g, 2f, 3a): etykieta „Wyłączamy najwyższe potęgi przed nawias” jest OK, ale **brakuje kroku skracania potęg**: w 1d od n³/n⁴ od razu „→ 1/n → 0”. Dodać krok „Skracamy: n³/n⁴ = 1/n” (dlaczego: „W mianowniku jest wyższa potęga, więc zostaje 1/n.”).

### 2.3 „Wyrazy z n w mianowniku dążą do 0” + sam wynik
Wszystkie z wyłączaniem. Wzór to tylko „→ 1/3”; uczeń nie widzi, skąd 1/3.
- Etykieta: **„Wstawiamy 1/n → 0”** (krótsza, czasownik).
- Wzór: pokazać podstawienie, np. 1a: „(2 + 0)/(6 + 0) = 1/3”, 2c: „(4 + 0)/(√4 + 3 + 0) = 4/5”, 4b: „12/(√3 + √3) = 12/(2√3) = 2√3”.
- Dlaczego: „Liczba podzielona przez coraz większe n staje się prawie zerem.”
- Szczególnie mylące, gdy zostaje potęga, a etykieta mówi tylko o „dążą do 0”:
  - 1d „→ 1/n → 0”, 1e „→ n² → +∞”, 1g „→ 3125/144 · 1/n → 0”, 2f „→ 1/6 · n^(1/12) → +∞”, 3a „→ n³ → +∞”, 4a „→ √2 · 1/√n → 0”.
  - Propozycja: etykieta **„Patrzymy, co zostaje”**, wzór np. 3a „n³ · (1 − 0) → +∞”, 1d „(1/n) · 1 → 0”. Dlaczego: „Nawias dąży do liczby, a potęga przed nim rośnie (albo maleje), więc ona decyduje.”

### 2.4 Zmieniona kolejność wyrazów i czynników
Wyświetlanie sortuje malejąco po potędze (math-calculus.js:215 `sortedTerms`), czynniki po rodzaju (math-calculus.js:40).
- 2a: wpisane √(4n+1) + 3√n + 7, pokazane 3√n + √(4n + 1) + 7.
- 2d, 2e, 2f: licznik i mianownik przestawione; 2e: „n sqrt(n)” pokazane jako n^(3/2).
- 1g: mianownik (4n³+5)³(3n+7)² pokazany jako (3n + 7)² · (4n³ + 5)³.
- 4h: −2n² na początku; 5c: −3n na początku; √(7−2x): −2x + 7.
Propozycja: krok 1 i krok „Wynik” zawsze w zapisie użytkownika (z AST, nie z postaci kanonicznej). W krokach pośrednich zachować kolejność z wejścia tam, gdzie to możliwe (sortować tylko przy wyłączaniu potęgi).

### 2.5 Silnik zmienia samo zadanie (wyciąga liczbę spod pierwiastka)
- 4c: √(4n²+2) pokazane od kroku 1 jako „√2√(2n² + 1)”.
- 5b: ∛(8n³−4n²) jako „∛4∛(2n³ − n²)”.
- 5c: ∛(27n³+15n²) jako „∛3∛(9n³ + 5n²)”.
Przyczyna: `asTerm` wyciąga wspólny dzielnik przed nawias, `cPow` (math-calculus.js:71–89) zostawia go jako osobny pierwiastek liczby. Uczeń nie rozpozna zadania. Propozycja: nie wyciągać wspólnego dzielnika spod pierwiastka (albo tylko, gdy jest pełną potęgą, jak 4 pod √).

### 2.6 Wynik nieuproszczony (5b, 5c)
- 5b: „9/(2∛2 · ∛4 + 2^(2/3) · 4^(2/3) + 4)” to 9/12 = **3/4**.
- 5c: „15/(3∛3 · ∛9 + 3^(2/3) · 9^(2/3) + 9)” to 15/27 = **5/9**.
Dla ucznia to wygląda, jakby kalkulator nie umiał skończyć. Plus zapis ^(2/3). Propozycja: przed `formatAnswer` scalać pierwiastki liczb (∛a·∛b = ∛(ab), a^(2/3)·b^(2/3) = (ab)^(2/3)) i wyciągać pełne potęgi (∛8 = 2). Krok 6 pokazać jako „9/(4 + 4 + 4) = 9/12 = 3/4” z dlaczego: „∛2·∛4 = ∛8 = 2.”

### 2.7 Zapis z klawiatury w etykietach i wzorach
- Etykiety: „Wyłączamy n^(3/2) przed nawias”, „Skracamy n^(3/2)” (2e, 4e), „Wyłączamy (−x)^(1/2)…” (dodatkowe).
  Propozycja: „Wyłączamy n√n przed nawias”, „Skracamy n√n”, „Wyłączamy √(−x) przed nawias”. Etykieta to zwykły tekst, nie jest rysowana jak wzór, więc nie może zawierać ^( ).
- Wzory: (n³ + 8n²)^(2/3), (1 + 8/n)^(2/3), n^(13/12), (16 + …)^(3/4) (5a–5e, 2f). Jeśli rysownik rysuje to jako potęgę ułamkową, jest poprawnie, ale dla ucznia ∛((n³+8n²)²) jest bardziej czytelne. Do decyzji po sprawdzeniu w aplikacji.

### 2.8 Wzór wpisany w etykietę zamiast w słownik
- 5a–5c: „Mnożymy przez sprzężenie: a³ − b³ = (a − b)(a² + ab + b²)”.
- 5d–5e: „…: a⁴ − b⁴ = (a − b)(a³ + a²b + ab² + b³)”.
- 3d, 3e: „Łączymy logarytmy: log f − log g = log(f/g), k·log f = log fᵏ” (w 3d druga część niepotrzebna).
Etykiety za długie na telefon. Propozycja: etykieta krótka + ⟦…⟧ we wzorze + wpis w słowniku (sekcja 4).

---

## 3. Problemy w pojedynczych zadaniach

| Zadanie | Krok | Co jest niezrozumiałe | Propozycja: etykieta / dlaczego / akcja |
|---|---|---|---|
| 1f | 2 | n³ wyłączone z (3n+1)²(4n+5) bez słowa, że n² bierze się z kwadratu | Etykieta „Wyłączamy n z każdego nawiasu”. Dlaczego: „(3n + 1)² = n²(3 + 1/n)², a z (4n + 5) wychodzi jeszcze jedno n, razem n³.” |
| 1g | 2–3 | n¹⁰/n¹¹ bez skrócenia, od razu „3125/144 · 1/n” (3125 = 5⁵, 144 = 4³·… nie wiadomo skąd) | Dodać krok „Skracamy: n¹⁰/n¹¹ = 1/n”, potem „Wstawiamy 1/n → 0: (2²·5⁵·1)/(3²·4³) · 1/n → 0”. Dlaczego: „Stopień mianownika jest większy, więc całość dąży do 0.” |
| 2e | 1–2 | „n sqrt(n)” zamienione na n^(3/2) | W etykiecie i wzorze pisać n√n. Dlaczego przy wyłączaniu: „√(9n³) = n√n·√9, więc największe jest n√n.” |
| 2f | 2–3 | Bardzo długi wzór, potęgi n^(4/3), n^(5/4), n^(13/12), n^(1/12): skok nie do śledzenia | Etykieta „Porównujemy najwyższe potęgi”. Wzór: licznik ~ n^(4/3) (z ∛(n⁴)), mianownik ~ 6n^(5/4) (z ∜(n⁵)); 4/3 > 5/4, więc → +∞. Dlaczego: „Wygrywa ta część, w której n ma większą potęgę.” Krok 2 można skrócić do porównania. |
| 3b | 2 | Licznik 3n² + 18n + 24 pojawia się bez rachunku | Pokazać ((n² + 5)(4n + 5) − (2n² + 1)(2n + 1))/((2n + 1)(4n + 5)), potem osobny krok „Wymnażamy i redukujemy w liczniku”. Dlaczego: „Odejmujemy ułamki tak jak 1/2 − 1/3: najpierw wspólny mianownik.” Wzór ⟦…⟧ `wspolny-mianownik`. |
| 3b, 3c | 3 | Wyłączana jest też liczba: 3n²(…), 2n(2 + 1/√n + 7/n); dziwne (3c: 4n + 2√n + 14 = 2n(2 + …)) | Wyłączać tylko potęgę n: n(4 + 2/√n + 14/n). Mniej rzeczy naraz. |
| 3c | 2 | jak 3b: licznik bez rachunku | jak 3b |
| 3d, 3e | 3–5 | Po kroku 2 znika log₂: „lim n(8+1/n)/(n(1+6/n))” bez logarytmu. Uczeń gubi wątek | Etykieta „Liczymy granicę pod logarytmem”, wzór z log₂ wokół albo dopisek. Dlaczego: „Logarytm nie przeszkadza, liczymy najpierw to, co w środku.” |
| 3d, 3e | 6 | „Logarytm jest ciągły” to żargon | Etykieta „Wstawiamy wynik do logarytmu”, wzór „log₂ 8 = 3”. Dlaczego: „log₂ 8 = 3, bo 2³ = 8.” (3e: „log₄(1/8) = −3/2, bo 4^(−3/2) = 1/8.”) |
| 3e | 2 | „2 · log₄(4n + 5)” znika do kwadratu bez wyjaśnienia | Wzór ⟦⟧ `log-potega` (k·log f = log fᵏ). Dlaczego: „Liczba przed logarytmem wchodzi jako potęga do środka.” |
| 4a–5e | 2 | „Mnożymy przez sprzężenie” bez celu, bez pokazania mnożenia | Etykieta „Pozbywamy się różnicy pierwiastków”. Dlaczego: „Mnożymy przez sumę tych samych pierwiastków: ze wzoru a² − b² pierwiastki znikają.” Wzór ⟦⟧ `sprzezenie`. Opcjonalnie wcześniej jeden krok z widocznym „· (√A + √B)/(√A + √B)”. |
| 4a | 4–5 | Brak skracania, „→ √2 · 1/√n → 0” | Etykieta „Patrzymy, co zostaje”, wzór „4/(√n · 2√2) → 0”. Dlaczego: „Stała dzielona przez rosnące √n daje 0.” |
| 4c | 1 | √(4n²+2) pokazane jako √2√(2n² + 1); brak tagu [∞ · 0] | patrz 2.5 i 2.1 |
| 4d, 4e | 3 | Etykieta „Upraszczamy licznik”, a różnica była w mianowniku; ułamek się odwrócił (4d: (√(n + √n) + √(n − 1))/(√n + 1)) bez słowa | Etykieta „Odejmujemy w mianowniku i odwracamy ułamek”. Dlaczego: „1 podzielone przez ułamek to ten ułamek odwrócony.” W kodzie: etykieta zależna od `hit.up` (math-limits.js:671). |
| 4f | 3, 5–7 | Zapis „… · (…)/16”, potem „1/8√n(…)/(√n(…))” (czyta się 1/(8√n)), w kroku 7 podwójna kreska „(…)/8/(…)” | Pokazywać jeden ułamek: (√(4n + 9) + √(4n − 7))/(8(√(n + 5) + √(n + 3))). Dlaczego (krok 2–5): „Są dwie różnice pierwiastków, więc sprzężenie robimy dwa razy: w mianowniku i w liczniku.” Usterka rysunku do naprawy w `pulledText`/`quotientText` (stała przed ułamkiem). |
| 4g | 2 | „Rozbijamy na dwie różnice”, nie wiadomo po co | Etykieta bez zmian. Dlaczego: „Dzielimy 2√(n² + 1) na dwa takie same pierwiastki, wtedy każda para to zwykła różnica pierwiastków.” Pokazać −2√(n²+1) = −√(n²+1) − √(n²+1). |
| 4h | 2–5 | Najtrudniejsze zadanie, a kroki najbardziej skrótowe: (√a + √b)² rozwinięte bez pokazania; w kroku 4 znaki odwrócone: „(n⁸ − n⁶ − n⁸)/(−n⁴ − √(n⁸ − n⁶))” (ujemny mianownik) | Krok 3: pokazać „(√(n⁴ + n³) + √(n⁴ − n³))² = 2n⁴ + 2√(n⁸ − n⁶)”, wzór ⟦⟧ `kwadrat-sumy`. Krok 4: zachować kolejność a = n⁴, b = √(…), wtedy (n⁸ − (n⁸ − n⁶))/(n⁴ + √(n⁸ − n⁶)) = n⁶/(…), bez minusów. Dlaczego: „Wciąż mamy różnicę, więc sprzężenie jeszcze raz.” |
| 5a–5e | 2 | Mianownik (a² + ab + b²) pojawia się gotowy, z ^(2/3), bez nazwania a i b | Dopisać „a = ∛(n³ + 8n²), b = ∛(n³ + 2n²)” przed wzorem. Etykieta „Pozbywamy się różnicy pierwiastków sześciennych”, ⟦⟧ `roznica-szescianow`. Dlaczego: „Dla ∛ zamiast a² − b² używamy a³ − b³, bo sześcian usuwa pierwiastek sześcienny.” |
| 5c, 5e | 2 | Odwrócona kolejność: przy 5e (2n − ∜…) licznik „16n⁴ + 40n³ + 1 − 16n⁴”, mianownik ujemny „−8n³ − …” | a = wyraz pierwszy w zapisie użytkownika (2n), b = pierwiastek. Wtedy licznik 16n⁴ − (16n⁴ + 40n³ + 1) = −(40n³ + 1), mianownik dodatni. Kod: `conjPair` (math-limits.js:~620) dla jednego pierwiastka ustawia zawsze A = pierwiastek. |
| ściąga x→4 | 2 | „Rozkładamy na czynniki” bez skąd: (x − 4)(x − 2) i (x − 4)(3x + 2) | Dlaczego: „0/0 przy x = 4 znaczy, że x = 4 jest pierwiastkiem licznika i mianownika, więc oba dzielą się przez (x − 4).” Wzór ⟦⟧ `postac-iloczynowa`. Ewentualnie pod spodem: „x² − 6x + 8: pierwiastki 2 i 4”. |
| ściąga x→4 | 4 | „Podstawiamy x = 4” i od razu 1/7 | Wzór „(4 − 2)/(3·4 + 2) = 2/14 = 1/7”. |
| ściąga x/√(3x²+5) | 2–3 | √(x²) = |x| = −x bez „dlaczego”; „−(−x)/((−x)√…)” wygląda na błąd | Etykieta „Pamiętamy, że x jest ujemne”. Dlaczego: „√(x²) jest zawsze dodatnie, a x ujemne, więc √(x²) = −x.” ⟦⟧ `pierwiastek-z-kwadratu`. Krok 3: dopisać „x = −(−x)”, dlaczego: „Piszemy x jako −(−x), żeby skrócić z √(x²) = −x.” |
| 1a–5e | Wynik | Powtarza całe zadanie w postaci przestawionej (np. 4h, 5c) | Zapis użytkownika (2.4). |

---

## 4. Wzory do słownika (`js/step-formulas.js`, podkreślenie + dymek)

| id | Nazwa | Rysunek (tex) | Po co tu (why) | Poziom | Zadania |
|---|---|---|---|---|---|
| `sprzezenie` | Wzór skróconego mnożenia a² − b² (sprzężenie) | \sqrt{A}-\sqrt{B}=\frac{A-B}{\sqrt{A}+\sqrt{B}} | Różnica pierwiastków daje ∞ − ∞. Mnożymy przez sumę, bo (a − b)(a + b) = a² − b², i pierwiastki znikają. | Liceum (wzory skróconego mnożenia), stosowanie w granicach: studia | 4a–4h, √(7−2x)(…) |
| `roznica-szescianow` | Różnica sześcianów | a^3-b^3=(a-b)(a^2+ab+b^2) | Dla pierwiastków sześciennych: sześcian usuwa ∛, a w mianowniku zostaje suma, która nie daje ∞ − ∞. | Liceum (rozszerzenie) | 5a–5c |
| `roznica-czwartych` | Różnica czwartych potęg | a^4-b^4=(a-b)(a^3+a^2b+ab^2+b^3) | To samo co wyżej dla ∜. | Studia | 5d, 5e |
| `pierwiastek-z-kwadratu` | Pierwiastek z kwadratu to wartość bezwzględna | \sqrt{x^2}=\lvert x\rvert | Gdy x → −∞, x jest ujemne, więc |x| = −x. Bez tego wynik miałby zły znak. | Liceum | ściąga x/√(3x²+5) |
| `c-przez-n` | Stała przez coraz większą liczbę | \frac{c}{n^p}\to 0 \text{ gdy } n\to\infty,\ p>0 | To podstawa każdej granicy w nieskończoności: po wyłączeniu potęgi te ułamki znikają. | Liceum (rozszerzenie: ciągi), studia | prawie wszystkie (krok „Wstawiamy 1/n → 0”) |
| `wspolny-mianownik` | Odejmowanie ułamków | \frac{a}{b}-\frac{c}{d}=\frac{ad-bc}{bd} | Różnicę dwóch ułamków zamieniamy na jeden, żeby móc wyłączyć potęgę. | Szkoła podstawowa | 3b, 3c |
| `log-iloraz` | Różnica logarytmów | \log_a f-\log_a g=\log_a\frac{f}{g} | Z dwóch rosnących logarytmów robimy jeden, a w środku zostaje zwykła granica ułamka. | Liceum | 3d, 3e |
| `log-potega` | Liczba przed logarytmem | k\log_a f=\log_a f^k | Żeby różnica miała postać log − log, liczbę przed logarytmem przenosimy do potęgi. | Liceum | 3e |
| `postac-iloczynowa` | Postać iloczynowa trójmianu | ax^2+bx+c=a(x-x_1)(x-x_2) | Wynik 0/0 mówi, że x = 4 jest pierwiastkiem, więc (x − 4) da się skrócić. | Liceum | ściąga x→4 |
| `kwadrat-sumy` | Kwadrat sumy | (a+b)^2=a^2+2ab+b^2 | Potrzebny w 4h, gdzie podnosimy do kwadratu sumę dwóch pierwiastków. | Szkoła podstawowa / liceum | 4h |

Bez wpisu: „wyłączanie przed nawias” i „skracanie” to czynności, nie wzory; wystarczy zdanie „dlaczego”.

---

## 5. Wnioski

### 5.1 Ogólne reguły pisania kroków
1. Krok 1 i „Wynik” zawsze w zapisie użytkownika: ta sama kolejność wyrazów, te same liczby pod pierwiastkiem, bez zmiany znaku.
2. Etykieta zaczyna się czasownikiem, mieści się w jednej linii telefonu (do ok. 40 znaków), bez wzorów i bez zapisu z klawiatury (^( ), sqrt, ^(1/2)). Wzór idzie do ⟦…⟧ i słownika.
3. Każdy krok z przekształceniem ma jedno zdanie „dlaczego” (do 20 słów), mówiące, czemu to robimy, a nie tylko co.
4. Tag symbolu nieoznaczonego zawsze z wyjaśnieniem po ludzku („nie wiadomo, kto wygra”).
5. Krok przejścia do liczby pokazuje podstawienie (2 + 0)/(6 + 0) = 1/3, nie samo „→ 1/3”.
6. Gdy wynik zależy od potęgi, która zostaje, pokazać ją z nawiasem → liczba („n³ · (1 − 0) → +∞”), a etykieta mówi „Patrzymy, co zostaje”.
7. Nie robić kroków, które wracają do punktu wyjścia. Jeśli granica jest określona (brak symbolu nieoznaczonego), od razu wstawić.
8. Jeden zapis jednej rzeczy w całym zadaniu (√(−x), nie raz |x|, raz (−x)^(1/2)).
9. Etykieta musi pasować do tego, co się stało (nie „Upraszczamy licznik”, gdy zmienił się mianownik i ułamek się odwrócił).
10. Wynik końcowy uproszczony do najprostszej postaci (3/4, nie 9/(2∛2·∛4 + …)).
11. Przy sprzężeniu i a³ − b³ nazwać a i b przed użyciem wzoru i trzymać kolejność z zadania, żeby nie powstawały ujemne mianowniki.
12. Przy x → −∞ powiedzieć wprost „x jest ujemne, więc −x > 0”, a √(x²) = |x| pokazywać tylko, gdy pod pierwiastkiem naprawdę jest x².

### 5.2 Zmiany w silniku (od największego zysku)
1. **Zapis użytkownika w kroku 1 i „Wynik”, i poprawna zmienna przy budowaniu wyrażenia.** math-limits.js:990–991: `C.setVar(d.v)` przenieść **przed** `C.fromAst(ast)` (teraz sortowanie przy budowaniu używa zmiennej z poprzedniego zadania; prawdopodobna przyczyna (1 − 1/n)² → (−1 + 1/n)², do potwierdzenia testem). Krok 1 (math-limits.js:996) i „Wynik” (math-limits.js:1002) pisać z AST w kolejności użytkownika, nie przez `limOf(…, e)`. Dotyczy wszystkich zadań.
2. **Nowa reguła „wstaw od razu” na początku RULES** (math-limits.js:941): gdy cel to ±∞, `indeterminate()` zwraca null i wyrażenie po zamianie każdego c/vᵖ (p > 0) na 0 nie ma zmiennej, emitować jeden krok „Wstawiamy 1/n → 0” z podstawieniem. Usuwa kółko w (1 − 1/n)². `commonDenominator` (math-limits.js:516) nie powinien się włączać dla wyrażeń określonych.
3. **Krok „Wyrazy z n w mianowniku dążą do 0” z podstawieniem** (math-limits.js:480 i 485): budować tekst z `N.rest`, `D.rest` z vᵖ zamienionymi na 0 („(2 + 0)/(6 + 0) = 1/3”), a dla q ≠ 0 dodać krok „Skracamy: n³/n⁴ = 1/n” i etykietę „Patrzymy, co zostaje”.
4. **Pole „dlaczego” w kroku.** `line(log, label, math)` (math-limits.js:271) rozszerzyć o opcjonalne `why` (i `formula`), zamiast doklejać `log[log.length−1].formula` jak w math-limits.js:742. Renderer dostaje jedno zdanie pod etykietą.
5. **Nie wyciągać liczby spod pierwiastka w zapisie zadania** (math-calculus.js:62–89, `asTerm` + `cPow`): √(4n²+2) ma zostać √(4n² + 2), nie √2√(2n² + 1) (4c, 5b, 5c).
6. **Upraszczanie wyniku z pierwiastkami liczb** przed `formatAnswer` (math-limits.js:~1001, `rationalize`): łączyć ∛a·∛b, a^(2/3)·b^(2/3), wyciągać pełne potęgi. 5b → 3/4, 5c → 5/9.
7. **Sprzężenie: krótka etykieta + ⟦⟧ + wpisy w słowniku** (math-limits.js:643 `CONJ_LABEL`, 659): etykiety „Pozbywamy się różnicy pierwiastków”, `formula: { id: 'sprzezenie' | 'roznica-szescianow' | 'roznica-czwartych' }`, nazwać a i b. Dodać wpisy w js/step-formulas.js:9.
8. **Kolejność a i b w sprzężeniu wg zapisu** (math-limits.js:~628 `conjPair`, gałąź `roots.length === 1`): A = wyraz stojący pierwszy w zadaniu. Usuwa ujemne mianowniki w 4h (krok 4) i 5c/5e.
9. **x → −∞: zamiast √(x²) = |x| = −x zawsze** (math-limits.js:469): gdy pod pierwiastkiem jest stopień 2 w x, zostawić z ⟦⟧ `pierwiastek-z-kwadratu`; w innych przypadkach krok „Pamiętamy, że x jest ujemne: −x > 0”.
10. **`uText` bez ^( )** (math-limits.js:~423): p = 1/2 → „√(−x)”, p = 1/3 → „∛(−x)”, p = 3/2 → „n√n” (także dla dodatniego kierunku, który idzie przez `C.show`, gdzie `supFrac` daje ^(3/2), math-calculus.js:223).
11. **Etykieta po sprzężeniu zależna od miejsca różnicy** (math-limits.js:671): `hit.up === false` → „Odejmujemy w mianowniku i odwracamy ułamek”.
12. **Tagi symboli** w `indeterminate()` (math-limits.js:~950): dodać [∞ · 0] dla iloczynu (4c, √(7−2x)(…)); sprawdzić próg 1e-9 w `kindOf`, przez który 4f nie dostaje [0/0].
13. **Wspólny mianownik z rachunkiem** (math-limits.js:526): najpierw pokazać (a·d − c·b)/(b·d), potem osobny krok „Wymnażamy i redukujemy”; `wspolny-mianownik` w słowniku.
14. **Logarytmy** (math-limits.js:578, 590): krótka etykieta „Łączymy logarytmy” + ⟦⟧ `log-iloraz`/`log-potega`; kroki wewnętrzne oznaczyć „pod logarytmem”; „Logarytm jest ciągły” → „Wstawiamy wynik do logarytmu: log₂ 8 = 3”.
15. **Wyłączanie samej potęgi, bez liczby** (math-limits.js:448 `pulledText`, gałąź `x.rest.length === 1 && c ≠ 1`): n(4 + 2/√n + 14/n) zamiast 2n(2 + …) (3c); oraz zapis 4f bez „1/8√n(…)” i „…/8/(…)”.
16. **Rozkład na czynniki z uzasadnieniem** (math-limits.js:834–836) i podstawienie z rachunkiem (math-limits.js:307: pokazać (4 − 2)/(3·4 + 2)).

Nie sprawdzone: jak renderer rysuje ^(2/3) we wzorze (może już ładnie), oraz hipoteza z punktu 5.2.1 (kolejność setVar), bo nie uruchamiałem silnika.
