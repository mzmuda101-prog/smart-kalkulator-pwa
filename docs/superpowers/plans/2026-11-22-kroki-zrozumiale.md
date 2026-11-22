# Plan: kroki zrozumiałe dla każdego (etap 3, ciąg dalszy) — do akceptacji Mateusza

Stan: propozycja z 2026-11-22. Źródło: test Mateusza na iPhonie (v1.05.05) i trzy raporty agentów w
`docs/superpowers/research/raport-{A,B,C}-*.md` (85 zadań, 508 kroków: 58 granic, ściąga, dodatkowe).

## Co mówi Mateusz
Kroki liczą dobrze, ale nie tłumaczą. Ma być tak, żeby nawet ktoś słaby z matematyki rozumiał, **co** się
dzieje w każdym kroku i **dlaczego**. Styl Photomatha jako inspiracja, nie kopia.

## Co znaleźli agenci (wszystkie wyniki są poprawne — problem to zrozumiałość)
1. **Kroki w kółko.** `lim (1 − 1/n)²`: wspólny mianownik → wyłączenie n² → skrócenie → to samo co na
   początku. Wystarczy jeden krok: „1/n → 0, więc (1 − 0)² = 1”.
2. **Krok 1 nie pokazuje tego, co wpisałeś.** `(1 − 1/n)²` → `(−1 + 1/n)²`, `7 − 2x` → `−2x + 7`,
   `√(4n² + 2)` → `√2·√(2n² + 1)`. Potwierdzone: silnik buduje wyrażenie, zanim wie, która litera jest
   zmienną (`math-limits.js:990`), i porządkuje wyrazy po swojemu.
3. **Brak „dlaczego”.** Sprzężenie, „Dorabiamy jedynkę”, aₙ, de l'Hospital, symbole `[0/0]`, `[1^∞]`
   — pojawiają się bez słowa, po co.
4. **Skoki.** „Wyrazy z n w mianowniku dążą do 0 → 1/3” bez pokazania (2 + 0)/(6 + 0); „Składam wynik”
   w pochodnej iloczynu bez wstawienia do wzoru; `3x − 6 = x + 4` → `2x = 10` bez przeniesienia.
5. **Powtórki i etykiety nie na temat.** „→ −6”, a zaraz „Wykładnik → −6”; „Upraszczamy licznik”, gdy zmienił
   się mianownik; „Wyłączamy (−x)^(1/2)” — zapis z klawiatury w etykiecie.
6. **Wzory w etykietach** („Wzór: (xⁿ)′ = n·xⁿ⁻¹”, „(−b ∓ √Δ) / 2a”) zamiast podkreślenia z dymkiem.
7. **Błędne koło:** `(eˣ − 1)/x` liczone de l'Hospitalem (czyli pochodną eˣ, która sama wynika z tej granicy).
   Potwierdzone uruchomieniem.

## Zasady pisania kroków (wspólne z trzech raportów)
1. Krok 1 i „Wynik” w zapisie użytkownika (ta sama kolejność, te same liczby).
2. Etykieta: czasownik na początku, jedna linia na telefonie, bez wzorów i bez `^(`, `sqrt`.
3. Każde przekształcenie ma jedno zdanie „dlaczego” (do ~20 słów, prosto).
4. Pokazujemy podstawienie, nie sam wynik: `(2 + 0)/(6 + 0) = 1/3`.
5. Żadnych kroków okrężnych ani powtórzonych; najpierw próbujemy po prostu wstawić.
6. Jedna rzecz = jeden zapis w całym zadaniu (`√(−x)`, nie raz `|x|`, raz `(−x)^(1/2)`).
7. Etykieta pasuje do tego, co się stało.
8. Znany wzór = podkreślony fragment + dymek (słownik), nie tekst w etykiecie.
9. Symbol nieoznaczony z wyjaśnieniem po ludzku („nie wiadomo, kto wygra”).

## Etapy (każdy osobno wydany, z testami; po każdym agent „słaby uczeń” czyta nowe kroki jeszcze raz)
- **3b — silnik: bez kółek i z zapisem użytkownika** (największy zysk, mało UI):
  zmienna przed budowaniem wyrażenia; krok 1 i „Wynik” z zapisu użytkownika; reguła „wstaw od razu”,
  gdy granica jest określona; podstawienie zamiast samego „→ wynik”; bez powtórzonego „Wykładnik”, z krokiem
  `e⁻⁶ = 1/e⁶`; `(eˣ − 1)/x` znaną granicą; `uText` bez `^(1/2)` (→ `√(−x)`).
- **3c — „dlaczego” pod każdym krokiem**: pole `why` w kroku, jedno zdanie pod etykietą w szufladzie;
  symbole `[0/0]` itd. z dymkiem „co to znaczy”. Teksty z raportów (są gotowe dla większości kroków).
- **3d — wzory ze słownika zamiast etykiet**: ~27 wpisów zaproponowanych przez agentów (sprzężenie,
  a³ − b³, |x|, sin u/u, ln(1 + u)/u, (eᵘ − 1)/u, de l'Hospital, Δ, wzory na x₁ x₂, pochodna potęgi, iloczynu,
  ilorazu, złożonej, tablice, przez części, Newton-Leibniz, wspólny mianownik…). Etykiety krótkie.
- **3e — równania, pochodne, całki**: przeniesienie wyrazów, sprawdzenie z podstawieniem („Lewa strona:
  3·(5 − 2) = 9”), wstawienie do wzoru iloczynu/ilorazu z nazwanymi f′ i g′, stała przy pochodnej, granice
  całki w pierwszym kroku.
- **3f — drobne w silniku**: wynik uproszczony (5b → 3/4, 5c → 5/9), nie wyciągać liczby spod pierwiastka,
  kolejność a i b w sprzężeniu jak w zadaniu, wspólny mianownik z rachunkiem.

## Pytania do Mateusza (z propozycją Claude)
1. **„Dlaczego” widoczne zawsze czy pod stuknięciem?** Propozycja: **zawsze widoczne**, jedno krótkie zdanie
   szarym drukiem pod etykietą — skoro celem jest „każdy zrozumie”, nie chowamy tego. Dłuższe wyjaśnienia
   zostają w dymkach wzorów („Więcej”).
2. **Wyróżnianie kolorem tego, co się zmieniło w kroku (jak w Photomathie)** — teraz czy później?
   Propozycja: **później** (po 3b–3d): wymaga śledzenia zmian w drzewie wzoru, a 3b–3d dają więcej za mniej.
3. **Kolejność**: zaczynamy od **3b** (silnik), potem 3c, 3d, 3e, 3f. Propozycja: tak.
4. **Poziomy szkolne w dymkach** (np. „Liceum, rozszerzenie”) agenci podali z pamięci podstawy programowej
   2017/2018 — zostawiamy tak i poprawiamy, gdy ktoś zauważy różnicę? Propozycja: tak.

## Decyzje Mateusza (2026-11-22)
Wszystkie propozycje przyjęte: „dlaczego” zawsze widoczne; kolorowanie zmian później; start od 3b; poziomy szkolne z pamięci.

## 3b — zrobione (v1.05.06)
- Krok 1 i „Wynik” z drzewa wpisanego zapisu (`astText` w `math-limits.js`), zmienna ustawiana przed budowaniem wyrażenia.
- „Zapisujemy inaczej”, gdy silnik liczy inną postać niż wpisana (znak, liczba spod pierwiastka) — tylko gdy to więcej
  niż kolejność wyrazów (6 zadań: 4c, 5b, 5c, 9a, 9b, 9d).
- „Podstawiamy n → ∞”, gdy granica nie jest nieoznaczona (`quickPlug`); „dąży do 0” z podstawieniem `(2 + 0)/(6 + 0)`.
- Granice z e: „Składamy wynik: e^(−6) = 1/e⁶” zamiast powtórzonego wykładnika; współczynnik przed potęgą poprawnie.
- `√(−x)` zamiast `(−x)^(1/2)`; `x < 0, więc −x > 0` zamiast `√(x²) = |x|`, gdy nie ma x²; `(eˣ − 1)/x` znaną granicą.
- Po przeglądzie: rysowanie odporne na jeden zły krok, spóźnione wczytanie biblioteki nie podmienia widoku.
- Agent „słaby uczeń”: 50 zmienionych zadań, 44 lepiej, 6 regresji naprawionych krokiem „Zapisujemy inaczej”.
- Zostaje na 3f: kolejność wyrazów w krokach środkowych (`−8x + 15`), nazwa „Wyłączamy n√n” a we wzorze `n^(3/2)`,
  zapis `…/8/(…)` w 4f, wyniki 5b i 5c nieuproszczone, zbędne kroki w 6e.

## 3c — zrobione (v1.05.07)
- `js/step-why.js`: jedno zdanie „dlaczego” dobierane po nazwie kroku i kontekście (granica w ±∞ czy w liczbie,
  krok poprzedni/następny); kroki-stwierdzenia (Wynik, Równanie…) bez zdania. Wzory w zdaniach w `$…$`, rysowane.
- Symbole `[0/0]`, `[∞/∞]`, `[∞ − ∞]`, `[1^∞]` wyjaśnione w zdaniu kroku 1 (osobny dymek niepotrzebny).
- Szuflada: zdanie szarym drukiem pod etykietą; etykieta pogrubiona w pełnym kolorze (wcześniej `--text-muted`,
  za mały kontrast i słabsza od zdania pod nią).
- Etykieta „Upraszczamy licznik” → „Upraszczamy” (pierwiastki znikały też z mianownika).
- Test `test/step-why.js`: 418 kroków (zestaw, ściąga, dodatkowe) — każdy ma zdanie, ≤ 25 słów, bez zapisu z klawiatury.
- Agent „słaby uczeń” przeczytał zdania: 7 niepasujących dopasowań poprawionych warunkami, 5 trudnych zdań uproszczonych.
- Zostaje: `[∞ · 0]` silnik nie nazywa (zdanie neutralne), „Wzór z tablicy” bez nazwy wzoru — w 3d dymki ze słownika.
