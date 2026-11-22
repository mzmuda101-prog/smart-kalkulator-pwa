# Plan: wzory graficznie i klawiatura do wzorów (spec 5.9, 5.12) — do akceptacji Mateusza

Stan: zaakceptowany 2026-11-22 (decyzje niżej); etap 1 wydany w v1.04.95, następny etap 2.

## Cel
1. Wzór (wpisany albo zeskanowany) **widać jak na kartce**: ułamek piętrowy, pierwiastek, potęga u góry, `lim` z `n→∞` pod spodem.
2. Wzór można **poprawić palcem w 2D** na klawiaturze do wzorów, bez pisania `sqrt(…)` i `^(…)`.
3. Później: kroki rozwiązania też graficznie, a użyte wzory szkolne do stuknięcia (5.12).

## Wnioski z filmiku (aplikacja do zdjęć zadań, 22.11)
- Po zdjęciu: karta z wynikiem — wzór narysowany graficznie, **ołówek** do poprawki, pierwszy krok, przycisk „Pokaż etapy”.
- Kadr: podpowiedzi „Upewnij się, że widać cały problem”, „Ustaw ostrość, dopasowując rogi”; po zdjęciu „Anuluj / Rozwiąż”.
- Dwa wzory w ramce → wybrany jeden (u nas od v1.04.94: najbliżej środka).
- Uczciwe „Ups! Nie umiemy jeszcze…” — u nas „Jeszcze tego nie rozwiążę” (już jest).
Bierzemy pomysły na przepływ, nie wygląd tamtej aplikacji.

## Biblioteka: MathLive 0.111.0 (sprawdzone 22.11)
- MIT, bez zależności (od 0.111 bez compute-engine), wydanie 2026-09-30.
- Rozmiar: `mathlive.min.js` 842 KB (226 KB gzip) + czcionki 296 KB (woff2, te same co KaTeX); dźwięki 240 KB — wyłączamy.
- Ma: pole `<math-field>` (edycja 2D), własną klawiaturę ekranową z własnymi układami, `convertLatexToMarkup` (samo rysowanie), LaTeX na wyjściu.
- Kod przejrzany pod kątem sieci: jedyny `fetch` to sprawdzenie adresu własnego skryptu (czcionki/dźwięki obok) — przy plikach u nas wszystko z tej samej domeny. CSP strony (`script-src 'self'`, `style-src 'unsafe-inline'`, `font-src 'self'`) pasuje bez zmian.
- KaTeX 0.19.1 (76 KB gzip) umie tylko rysować — nie bierzemy dwóch bibliotek, MathLive rysuje też sam.
- Ładowanie **leniwe** (dopiero przy pierwszym wzorze), pliki w `js/vendor/mathlive/` z przypiętą wersją, w cache SW → działa offline.

## Jak to ma działać (propozycja)
- **Jedno pole tekstowe zostaje** (komendy po polsku, pieniądze, daty — tam edytor wzorów nie pasuje).
- Gdy w polu jest wzór matematyczny (granica, pochodna, całka, ułamek, pierwiastek), **nad wynikiem pojawia się jego rysunek** (tylko do oglądania).
  Skaner wstawia jak dziś do pola, więc rysunek widać od razu. Bez dubla: rysunek = wygląd tego samego pola.
- **Ołówek przy rysunku** → szuflada z polem 2D (`<math-field>`) i klawiaturą do wzorów → „Gotowe” zapisuje do pola tekstowego.
- Przejścia: zapis pola → LaTeX (nowy `js/expr-to-latex.js`, z drzewa parsera) i LaTeX → zapis pola (istniejący `latexToExpr`).

## Etapy (każdy osobno wydany, z testami)
1. **Rysunek wzoru** — `expr-to-latex.js` + leniwe wczytanie MathLive + rysunek nad wynikiem.
   Test: dla 58 wzorów z `limits-zestaw.json` i przykładów ze ściągi: zapis → LaTeX → `latexToExpr` daje to samo zadanie.
   Pomiar: czas pierwszego rysunku na iPhonie, rozmiar w cache.
2. **Edytor 2D + klawiatura** — szuflada, układ klawiatury po polsku (karty: Podstawowe / Funkcje / Granice i całki:
   `lim`, `∞`, ułamek, `√`, `∛`, potęga, `log`, `sin`…), „Gotowe” → pole tekstowe. Test e2e na telefonie (emulacja + prawdziwy iPhone).
3. **Kroki graficznie + dymki wzorów** (spec 5.12) — wymagania Mateusza (2026-11-22):
   - **każdy krok i wynik rysowany jak na kartce** — nigdzie `sqrt(…)`, `^(…)`, `/` z klawiatury
     (szuflada kroków, rozpisanie na komputerze, dymki); kroki dostają LaTeX z drzewa obok tekstu;
   - **bez osobnego kroku „użyto wzoru”** — fragment, w którym wzór działa, jest podkreślony w swoim kroku;
   - **stuknięcie** → dymek (wzór, „po co tu”, poziom szkoły); dłuższe wyjaśnienie → „Więcej” → osobny widok
     z przyciskiem „Wróć” do tego samego miejsca;
   - test: żaden krok z zestawu 58 granic i ze ściągi nie zawiera `sqrt(` ani `^(` w tym, co widać.

## Decyzje Mateusza (2026-11-22)
1. Układ: **rysunek nad wynikiem + ołówek → edytor 2D** (propozycja przyjęta).
2. Klawiatura: **klawiatura wzorów MathLive z naszym układem**; wyglądem docelowo zbliżona do klawiatur
   znanych aplikacji do matematyki (np. ta z filmiku) — przed etapem 2 przejrzeć dostępne układy
   i wybrać najwygodniejszy (może być lepszy niż wzorzec).
3. Kolejność: **najpierw sam rysunek** (etap 1), edytor i klawiatura jako etap 2.

## Pytania do Mateusza (już rozstrzygnięte — zob. wyżej)
1. Układ: rysunek nad wynikiem + ołówek → edytor 2D (propozycja) czy zamiana całego pola na pole wzorów?
2. Klawiatura: klawiatura MathLive z naszym układem (propozycja) czy systemowa + rząd przycisków?
3. Zaczynać od etapu 1 (sam rysunek), czy od razu 1 + 2 razem?

## Pomysł Mateusza do rozważenia przed etapem 2 (2026-11-22, „głośno myślę”)
Zostawić obecną klawiaturę kalkulatora i dać **przełącznik w tym samym miejscu**: „Kalkulator” ↔ „Wzory”
(klawiatura do nauki). Bez dubla — jedno miejsce na klawisze, dwa układy.
Propozycja Claude (do decyzji):
- Klawiatura „Wzory” jako **nasza własna siatka w miejscu obecnej** (ten sam rozmiar, styl, haptyka), nie klawiatura
  MathLive wysuwana od dołu — mniej ryzyka z fokusem i klawiaturą systemową na iPhonie, spójny wygląd apki.
  Klawisze wstawiają gotowe kawałki do pola (`lim x→`, `∞`, ułamek, `√`, `∛`, potęga, `log`, `sin`, `x`, `n`…),
  a rysunek z etapu 1 pokazuje na żywo, jak to wygląda na kartce. Cyfry zostają w obu układach.
- Przełącznik: jeden klawisz/segment w dolnym rzędzie (tam, gdzie „Historia / Zdanie / Ściąga”), stan zapamiętany.
- Edytor 2D (ołówek przy rysunku) zostaje jako dodatek do poprawiania długich wzorów — może później niż klawiatura.
- Układ klawiszy „Wzory”: przejrzeć znane aplikacje do matematyki i zrobić własny, nie kopię.

## Klawiatura „Wzory” — projekt (Mateusz zaakceptował kierunek 2026-11-22: rzadsze rzeczy pod przytrzymaniem)
Siatka 5×5 w miejscu obecnej klawiatury, przełącznik „Kalkulator | Wzory” w dolnym rzędzie (stan zapamiętany).

```
lim   7  8  9  ÷
∞     4  5  6  ×
a/b   1  2  3  −
√     0  ,  x  +
xⁿ    (  )  n  ⌫        + karta „Funkcje”
```
Przytrzymanie (dymek z wariantami nad klawiszem, przesunięcie palcem i puszczenie = wybór):
- `lim` → `lim n→∞`, `lim x→0`, `lim x→0⁺`, `lim x→0⁻`, `lim x→a`
- `∞` → `−∞`, `e`, `π`;  `√` → `∛`, `∜`;  `xⁿ` → `x²`, `x³`, `x⁻¹`, `eˣ`
- `( )` → `|x|`;  `x` → `y`, `t`;  `n` → `k`, `m`;  `×` → `n!`;  `÷` → `mod`
Karta „Funkcje”: `sin cos tg ctg`, `arcsin arccos arctg`, `ln log log₂`, `|x|`, `n!`, `e`, `π`, `pochodna`, `całka`, `rozwiąż`, `=`.
Zasady: przytrzymanie to skrót — **każdy wariant jest też na karcie „Funkcje”** (nic dostępnego tylko
przytrzymaniem: odkrywalność, czytnik ekranu, klawiatura fizyczna). Klawisz z wariantami ma mały znaczek
w rogu. Cele ≥ 44 px, bez zaznaczania tekstu przy przytrzymaniu (`user-select:none`, `-webkit-touch-callout:none`).
Wzorce: znane aplikacje do matematyki (siatka 4–5 kolumn; Seneca: tylko potrzebne klawisze) — własny układ, nie kopia.

**Decyzje 2b (Mateusz, 2026-11-22):** 6 kolumn × 5 rzędów (wysokość klawiatury bez zmian), przełącznik
w dolnym rzędzie (na komputerze w nagłówku, jak „Tryb zdania”). Układ:
```
lim   ∞    ( )   f(x)  ⌫    AC
a/b   √    7     8     9    ÷
xⁿ    x²   4     5     6    ×
x     n    1     2     3    −
e     π    0     ,     =    +
```
Znaczki przytrzymania (pomysł Mateusza): 1 wariant → mały wyszarzony znak w prawym górnym rogu;
2 krótkie warianty (≤ 2 znaki) → lewy i prawy górny róg; 3+ albo długie → `⋯` w prawym górnym rogu.
Bez dolnych rogów (kciuk, tłok). Przy pierwszym włączeniu „Wzorów” jednorazowa podpowiedź o przytrzymaniu.
Wstawianie liniowe (pad nie stawia kursora w polu): `√` → `sqrt(`, domyka sprytne `( )`;
`a/b` zamyka otwarty nawias i otwiera mianownik (`(5n+7` → `(5n+7)/(`).

**Etap 2b wydany w v1.05.00**: `js/formula-keys.js` (dane, znaczki, wstawki; test `test/formula-keys.js` — każdy
klawisz i wariant liczy się w silniku), obsługa w `app.js` (`renderCalcKeys`, przytrzymanie 380 ms z dymkiem:
przesunięcie palca i puszczenie = wybór, puszczenie bez wyboru = dymek zostaje do stuknięcia), przełącznik
`.calc-keys-toggle` (dolny rząd + nagłówek), ustawienie `calcKeys`, jednorazowa podpowiedź, e2e `formula-keys.spec.js`.
Po drodze: „Historia” na telefonie (≤ 430 px) jako ikona + licznik (4 przyciski w rzędzie ucinały napis);
karta „Funkcje” z symbolami `f′`, `∫`, `x=?` zamiast długich słów; dymek zawija warianty zamiast przewijać;
Enter/Spacja na klawiszach „Wzory” obsłużone przed globalnym skrótem Enter = „=”.
Do sprawdzenia na iPhonie: przytrzymanie palcem (czas 380 ms, brak menu systemowego), klawisze 49 px przy 390 px.

**Poprawki po teście Mateusza na iPhonie (v1.05.01–02):**
- dymek: puszczenie poza dymkiem i klawiszem zamyka go (puszczenie na dymku/klawiszu zostawia do stuknięcia);
- układ **5 kolumn × 6 rzędów** (klawisze prawie kwadratowe; 6 kolumn wyglądało na „rozciągnięte”):
```
lim   ∞     x     xⁿ    √
a/b   ( )   f(x)  ⌫     AC
x²    7     8     9     ÷
e     4     5     6     ×
π     1     2     3     −
→     0     .     =     +
```
- **jeden klawisz zmiennej**: pokazuje literę z wpisanej granicy (`lim n→…` → `n`, „przy t → 0” → `t`),
  pozostałe (`x n y t k m a b`) pod przytrzymaniem;
- `lim` → wariant **„lim x→ …”** wstawia `lim x→` i stawia kursor w polu (klawiatura telefonu — własny punkt);
- sprytne `( )` zamyka nawias także po zmiennej, `∞`, `π`, `!` (wcześniej tylko po cyfrze i `)`);
- na komputerze 6 rzędów mimo reguły `calc-split-active` (5 rzędów) — inaczej ostatni rząd był ściśnięty.
Inspiracje: Photomath (warianty pod przytrzymaniem, kropka w rogu), GeoGebra (karty 123 / f(x) / ABC).

**Warunek przed klawiaturą — silnik musi rozumieć każdy klawisz** (sprawdzone 22.11 w zwykłym liczeniu,
poza granicami/krokami): nie działają `tg`, `ctg`, `arctg` (działa tylko `tan`, `atan`), `|−3|`, `5!`,
`log_2(8)`, `cos²(0)`, `10 mod 3`. Etap 2a: dodać je do silnika ze smoke-testami i ściągą, potem klawiatura (2b).
**Etap 2a wydany w v1.04.96**: wszystkie powyższe działają w zwykłym liczeniu i na wykresach
(`js/numeric-eval.js`; `cos²(x)` w `js/smart-parser.js` przed regułą jednostek `m² → m2`), 15 smoke-testów,
6 wpisów w ściądze. Znane ograniczenie: zagnieżdżone `||a|−|b||` — wtedy `abs(…)`.

## Etap 1 — jak wyszło (v1.04.95)
- `js/expr-to-latex.js` (drzewo parsera → LaTeX; granice, pochodne, całki, zwykłe wzory z ułamkiem/potęgą/
  pierwiastkiem/funkcją), test `test/expr-to-latex.js`: 58/58 granic z rysunku wraca do tego samego zadania.
- Rysunek: `vendor/mathlive/mathlive-ssr.min.mjs` (sam renderer, 396 KB, 111 KB gzip) + `mathlive-static.css`
  + czcionki; wczytywany leniwie przy pierwszym wzorze, potem z cache SW (offline).
- Miejsce: **po lewej w wierszu wyniku**, nie osobny wiersz nad nim — pozycja absolutna, szerokość = wolne
  miejsce na lewo od wyniku. Pierwsza wersja (zwykły element w wierszu) zabierała szerokość i kod układu
  łamał wynik na dwie linie (`e` / `³`) — złapane testem, poprawione; e2e `formula-drawing.spec.js`
  pilnuje, że układ ekranu i klawiszy jest co do piksela ten sam z rysunkiem i bez.
- Świadome ograniczenia (do etapu 2): bardzo długi wzór, który musiałby spaść poniżej połowy rozmiaru,
  nie jest rysowany (zostaje tekst w polu); tryb „Zdanie” bez rysunku (wynik stoi tam po lewej);
  rysunek `aria-hidden` (ten sam zapis jest w polu, czytnik nie czyta dwa razy).

## Ryzyka
- iPhone: pole 2D i systemowa klawiatura potrafią się gryźć (fokus, przewijanie) — sprawdzić na telefonie w etapie 2.
- 0,5 MB do pobrania przy pierwszym wzorze — mało przy 37 MB modelu skanera, ale offline dopiero po pierwszym użyciu online.
- Rysunek musi pokazywać dokładnie to, co liczy parser (np. `1/2n` = `1/(2n)`?) — rysunek z drzewa parsera, nie z tekstu, więc pokaże prawdziwą kolejność działań (to też pomoc: widać pomyłkę w nawiasach).

## Etap 3 — pierwszy przykład (2026-11-22, czeka na zrzut/akceptację Mateusza, niewydane)
- **Rysowanie kroków jednym konwerterem**: `stepToLatex` w `js/expr-to-latex.js` dzieli tekst kroku na kawałki
  („ = ”, „ → ”, „, ”, „: ”, „ ≈ ”) i każdy puszcza przez parser → to samo drzewo co rysunek obok wyniku. Nie trzeba
  było przepisywać ~60 miejsc w `math-limits/calculus/steps`. Zna też `lim(n→∞)`, `[…]`, `|…|`, `aₙ`, `x₁`, `n¹⁰`,
  `log₄(`, `f′(t)`, `F(1)`, `∫ … dx`, `dx`, `0⁺`, `+∞`, `Δ`, `L`/`P`. Słowa zostają tekstem.
  Kawałki zawijają się między „=” jak na kartce; przecinek zostaje przy wzorze.
- **Bez kroku „Wzór na e”**: krok „Podstawa dąży do e”, fragment `⟦…⟧` + `formula: { id: 'e' }`; stały wykładnik
  dopisany w tym samym kroku (`= e^(−1)`), bez osobnego „Wykładnik”.
- **Słownik**: `js/step-formulas.js` (`name, tex, why, level, more`; w zdaniach wzory w `$…$`, rysowane).
- **Szuflada** (`renderStepsView` w `app.js`): rysunek `aria-hidden` + zapis dla czytnika; podkreślenie przerywane
  w kolorze akcentu; stuknięcie → dymek pod krokiem ze strzałką do fragmentu; „Więcej” → widok z „Wróć do kroków”
  (to samo miejsce, dymek otwarty, fokus wraca). Klawiatura: niewidoczny przycisk, fokus rysuje obwódkę na fragmencie.
- Testy: `test/expr-to-latex.js` — 454 kroki (58 granic + przykłady ściągi) bez `sqrt(`, `^(`, `/` w tekście;
  każdy wzór ze słownika użyty w kroku; e2e `test/e2e/steps-drawing.spec.js`.
- **Zostało (po akceptacji)**: etykiety kroków nadal mają wzory tekstem („Wzór: (xⁿ)′ = n·xⁿ⁻¹”,
  „(−b ∓ √Δ) / 2a”, „Granica znana: sin u/u → 1”) — zamienić je na podkreślone fragmenty + wpisy w słowniku
  (a² − b², sprzężenie a³ − b³, pochodne i całki z tablicy, Δ, de l'Hospital).

## Kontekst od Mateusza (2026-11-22): klawiatury Casio fx-991CEX i fx-991CW
Zdjęcia z sieci, jako inspiracja (nie kopia) do klawiatury „Wzory”. **Zasada (Mateusz):** Casio miał trudniej,
bo klawisze są fizyczne i stałe, więc wszystko musiało się zmieścić w jednym mądrym układzie. U nas to ekran
(telefon, komputer): klawiatura może się zmieniać (karty, układ zależny od tego, co wpisujesz, dymki), więc
bierzemy pomysły, nie ograniczenia. **Lekka inspiracja** — nie przesadzać, nie przerabiać klawiatury pod Casio.
Co ewentualnie warto z nich wziąć:
- **Druga funkcja nad klawiszem, kolorem** (SHIFT żółty, ALPHA czerwony): to samo co nasze znaczki w rogach
  pod przytrzymaniem. Casio pokazuje je stale i czytelnie, więc warto sprawdzić, czy nasze znaczki nie są za blade.
- **Klawisze-szablony z pustymi kratkami**: `■/■` (ułamek), `√■`, `x■`, `log■□`, `∫■`, `d/dx■`. Na klawiszu widać,
  co powstanie i gdzie wpiszesz liczby. Pasuje do edytora 2D (ołówek przy rysunku, później).
- **S⇔D**: jeden klawisz przełącza wynik dokładny i dziesiętny (`1/e` ↔ `0,3679`). U nas jest „≈” w dymku, więc
  do rozważenia jako stuknięcie w wynik.
- **Ans**, osobny **(−)** dla minusa przed liczbą, **x⁻¹**, **x!**, **Abs**, **×10ˣ**: w większości już u nas
  (pod przytrzymaniem albo na karcie „Funkcje”).
- fx-991CW: mniej klawiszy, a więcej w menu (CATALOG, TOOLS, FUNCTION), okrągłe klawisze cyfr. To ten sam kierunek
  co nasza karta „Funkcje”.
