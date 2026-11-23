# Podręcznik (zakładka wiedzy) — projekt

Stan: zaakceptowany przez Mateusza 2026-11-23 (z dopiskiem o przejściu z kroków), apka v1.05.27.
Kontekst: `docs/superpowers/HANDOFF-podrecznik.md`.

## Po co
Mateusz chce **dobrej zakładki wiedzy**, a nie zbioru przypadkowych rzeczy. Docelowo ma obejmować **wszystkie
tematy**. Dziś 37 wzorów żyje tylko w dymkach przy krokach rozwiązania i nie da się ich przejrzeć ani znaleźć
samodzielnie. Warunek bezwzględny: **wszystko poprawne matematycznie**.

## Decyzje Mateusza
- Cel końcowy to **osobny ekran „Podręcznik”**.
- Dymki w krokach też można ulepszyć, ale to osobna praca, poza tym projektem.
- Mateusz dopuścił przejście od razu na podręcznik zamiast etapu „zakładka Wiedza w ściądze”.

## Podejścia
| | Na czym polega | Za | Przeciw |
|---|---|---|---|
| A | Przełącznik „Komendy / Wiedza” w szufladzie ściągi | mało kodu, bez nowego miejsca w menu | wąsko; po przejściu na podręcznik zostaje do wyrzucenia albo robi się dubel |
| **B (wybrane)** | Osobny ekran „Podręcznik” | dużo miejsca, docelowy kształt od razu | więcej pracy niż A |
| C | Tylko lepsze dymki + wyszukiwarka ściągi znajduje wzory | najmniej pracy | brak spisu działów, to nie jest zakładka wiedzy |

**Dlaczego od razu B (moja decyzja, w ramach zgody Mateusza):** A byłoby etapem do wyrzucenia. Gdyby po przejściu
na podręcznik zostało w ściądze, byłby dubel (zasada: jedna funkcja = jedno miejsce). Pierwsza wersja B ma ten
sam zakres co A, tylko na własnym ekranie, więc kosztuje niewiele więcej.

## Cele (pierwsza wersja)
1. Nowa zakładka **„Podręcznik”** obok Standard / Komenda / Warsztat / Moje Stałe. Na telefonie jest pozycją
   w arkuszu „Narzędzia”, który jest telefonową wersją tego samego paska, więc to nie dubel.
2. Ekran startowy: **wyszukiwarka** u góry i pod nią **lista działów** z liczbą haseł.
3. Dział: lista haseł (nazwa + mały rysunek wzoru + znaczek poziomu).
4. Hasło: nazwa, rysunek wzoru, „po co”, „Więcej” (te same treści co dziś w dymku), poziom, przycisk
   **„Spróbuj”** i **„Powiązane”** (linki do innych haseł).
5. „Spróbuj” wpisuje przykład do kalkulatora (Standard) i przełącza na niego. Wynik i kroki pojawiają się
   tak jak po ręcznym wpisaniu (ten sam mechanizm co klik w przykład ze ściągi: `calcExpr.value`, `liveEval()`,
   `switchTab('calculator')`).
6. Brakujące hasła dla typów zadań, które apka już rozwiązuje: nierówność kwadratowa (znak z paraboli),
   układ równań (podstawianie, przeciwne współczynniki), wartość bezwzględna, wartości sin/cos/tg z tablicy
   i okresowość, procent z liczby / zmiana o procent, NWD i NWW.
7. Uporządkowane poziomy: trzy wartości do znaczka przy haśle. *(Moja decyzja: w pierwszej wersji nie ma
   filtra po poziomie, jest tylko znaczek. Filtr można dodać później, a dane będą już gotowe.)*
8. **Płynne przejście z kroków do podręcznika i z powrotem** (dopisek Mateusza przy akceptacji, zob. niżej).

## Poza zakresem (nie teraz)
- Rozdziały do czytania po kolei (tekst ciągły, ćwiczenia). Format danych ma to później udźwignąć.
- Zmiany w dymkach przy krokach (osobna praca Mateusza). Wyjątek: dymki czytają te same dane, więc po
  przeniesieniu danych muszą działać tak jak dziś.
- Quizy, postępy nauki, treści z sieci.
- Ściąga zostaje ściągą komend i nie dostaje haseł wiedzy.

## Czego nie wolno (porażka, nawet jeśli działa)
- Błąd matematyczny w haśle, w przykładzie albo w „Spróbuj”, który daje inny wynik niż obiecany.
- Hasło bez działu, bez poziomu albo bez przykładu, czyli „przypadkowa rzecz”.
- Druga kopia tych samych treści: dymki i podręcznik muszą czytać jedno źródło.

## Dane (jedno źródło)
Rozszerzamy obecne wpisy w `js/step-formulas.js` (`window.MATM0_FORMULAS.FORMULAS`) zamiast tworzyć nowy plik.
Nowe pola każdego hasła:

| pole | znaczenie |
|---|---|
| `dzial` | id działu (lista działów z kolejnością i nazwą w tym samym pliku, np. `DZIALY`) |
| `poziom` | `'lp'` liceum podstawa, `'lr'` liceum rozszerzenie, `'st'` studia; *moja decyzja:* najniższy poziom, na którym uczeń poznaje ten wzór (np. tablica pochodnych → `'lr'`, a „e^x, ln x: studia” zostaje w zdaniu `level`) |
| `keywords` | słowa do wyszukiwarki (np. „delta, wyróżnik, równanie kwadratowe”) |
| `try` | przykład w postaci, którą kalkulator naprawdę rozwiązuje z krokami; wpisy z pętli (`tgu`, `arcsinu`, `arctgu`) dostają każdy swój `try` zamiast kopii z `sinu` |
| `expect` | *moja decyzja:* wynik, który apka ma pokazać dla `try`, jako tekst (np. „x = 2 lub x = 3”, przedział, para); test porównuje go z wyświetlanym wynikiem, więc działa też dla zbiorów i par, a nie tylko dla jednej liczby |
| `related` | id innych haseł |

Obecne pole `level` zostaje jako zdanie pod hasłem (np. „Liceum: wzory skróconego mnożenia; w granicach:
studia”), bo niesie informację, której `poziom` nie ma.

Hasło może istnieć tylko w podręczniku, czyli nie musi być użyte w żadnym kroku. Wpis musi mieć treść,
a jeśli krok wskazuje `formula: { id }`, to taki wpis musi istnieć. Test `test/expr-to-latex.js` trzeba
odpowiednio zmienić.

Wpisy generowane w pętli (np. `'Granica ' + name + ' u przez u'`, wiersz ok. 343) dostają te same pola.

`shortcut:` jeden plik wczytywany od razu. Przy ok. 40–60 hasłach to kilkadziesiąt KB. Gdy plik przekroczy
ok. 150 KB albo ok. 150 haseł, dzielimy go na `js/kb/<dział>.js` wczytywane leniwie. Format hasła się przy
tym nie zmienia.

## Działy na start (propozycja, kolejność jak w szkole)
1. Liczby i procenty: procenty, NWD/NWW
2. Wyrażenia algebraiczne: wzory skróconego mnożenia, różnica sześcianów i czwartych potęg, pierwiastek z kwadratu
3. Równania i nierówności: delta, wzory na pierwiastki, rozkład, Bezout, nierówność kwadratowa, układy,
   wartość bezwzględna, równania z pierwiastkiem
4. Funkcje: wierzchołek paraboli, postać iloczynowa
5. Potęgi i logarytmy: definicja logarytmu, różnica logarytmów, potęga ilorazu
6. Trygonometria: tożsamości (sin², cos², tg²), wartości z tablicy
7. Granice: liczba e, sprzężenie, granice specjalne, symbole nieoznaczone
8. Pochodne: potęga, iloczyn, iloraz, złożona, tablica
9. Całki: potęga, tablica, arctg, przez części, Newton-Leibniz

Działy bez haseł się nie wyświetlają.

## Z kroków do podręcznika i z powrotem
Mateusz: z kroku ma się dać „zobaczyć więcej w podręczniku” i wrócić, płynnie, tak jak dziś działa „Więcej”.

- „Więcej” w dymku otwiera **to samo hasło w podręczniku** zamiast osobnego widoku w szufladzie. Obecny widok
  „Więcej” (`_openStepsMore`) znika, bo byłby dublem hasła.
- Na haśle otwartym z kroków jest u góry „‹ Wróć do kroków”. Wraca do kalkulatora, otwiera szufladę kroków
  w tym samym miejscu przewijania, z tym samym sposobem (przełącznik `explain.methods`) i z otwartym dymkiem,
  z fokusem na nim. To, co dziś robi `_closeStepsMore`.
- Z hasła można iść dalej w „Powiązane”. „Wróć” cofa się po kolei (stos: hasło → poprzednie hasło → kroki),
  więc zawsze da się trafić z powrotem do kroków.
- Ruch: krótkie przejście (wjazd hasła z boku, powrót w odwrotną stronę, 200–300 ms, tokeny ruchu apki);
  przy `prefers-reduced-motion` samo przenikanie albo natychmiast. Na szerokim ekranie (szuflada obok
  kalkulatora) wykonawca dobiera ruch tak, żeby nie było skoku układu.
- Przycisk wstecz telefonu / przeglądarki na haśle otwartym z kroków działa jak „Wróć do kroków”, jeśli apka
  już obsługuje wstecz dla szuflad; jeśli nie, nie dokładamy tego w tym projekcie.
- e2e: kroki → dymek → „Więcej” → hasło → „Powiązane” → Wróć → Wróć → kroki w tym samym miejscu, dymek otwarty.

## Ekran (szkic, telefon 390 px)
```
┌ Podręcznik ─────────────────┐
│ [Szukaj: delta, sinus, %…]  │
│ Liczby i procenty         2 │
│ Wyrażenia algebraiczne    5 │
│ Równania i nierówności   10 │
│ …                           │
└─────────────────────────────┘
  dział → hasło:
┌ ‹ Równania i nierówności ───┐
│ Delta (wyróżnik)   [liceum] │
│   Δ = b² − 4ac              │
│ Po co: …                    │
│ Więcej: …                   │
│ [ Spróbuj: x²−5x+6=0 ]      │
│ Powiązane: Wzory na…, Postać│
└─────────────────────────────┘
```
- Wyszukiwarka filtruje od razu, bez polskich znaków (`MATM0_PL_FOLD.foldLower`). Szuka po nazwie, słowach
  kluczowych i dziale. Wyniki pokazuje płasko, z nazwą działu przy każdym.
- Rysunki wzorów: MathLive przez istniejące `_loadFormulaLib()`, zdania z `$…$` przez `_stepsRich`. Bez
  biblioteki (offline bez cache) zostaje tekst, tak jak w krokach.
- Nawigacja wewnątrz ekranu: start → dział → hasło, przycisk „‹ Wróć” na każdym poziomie. Przełączenie
  zakładki i powrót zostawia ostatni widok.
- Poziom jako napis-znaczek („liceum”, „rozszerzenie”, „studia”), nie sam kolor.

## Poprawność treści
- Nowe treści pisane według skilli `deep-explain` i `bottom-up` (zrozumiale dla ucznia liceum),
  `term-origins` tylko jako krótki dodatek tam, gdzie pomaga.
- Każde `try`: test sprawdza, że kalkulator daje wynik bez błędu, ma kroki, a wyświetlony wynik zgadza się
  z `expect`.
- Każda równość liczbowa w `why`/`more` nowych haseł przechodzi przez bramkę SymPy (`npm run check:steps`).
  Trzeba ją rozszerzyć o teksty haseł: dopisać do `scripts/steps-check/dump.js` jawną listę równości
  z haseł albo wyciągać `$… = …$`. Sposób wybiera wykonawca, ale **żadna nowa równość nie wchodzi bez
  sprawdzenia**.
- Po napisaniu treści agent „słaby uczeń” czyta hasła i zgłasza niejasności (sposób z HANDOFF-kroki.md).

## Testy i wydanie
- Node (`test/`): spójność danych: każde hasło ma `dzial` z listy, `poziom` z trzech wartości, `tex`, `why`,
  `try`; `related` wskazuje istniejące id; brak dubli nazw.
- Smoke `try` w runnerze w `app.js` (zgodnie z AGENTS.md: `{expr, value/tol}` z komentarzem).
- e2e Playwright: otwórz Podręcznik → szukaj „delta” → otwórz hasło → „Spróbuj” → kalkulator ma wyrażenie
  i wynik. Zrzut 390×844 i szeroki ekran, jasny i ciemny motyw.
- Dostępność: zakładka w istniejącym `role="tablist"`, lista działów i haseł jako przyciski/linki
  z fokusem, „Wróć” przenosi fokus, cele ≥ 44 px.
- Wydanie: `APP_VERSION` +1 (większy etap, więc pasuje okrągła v1.05.30), `npm run sync-version`, nowy plik
  w `sw.js`, jeśli jakiś powstanie. Podział na kilka wydań (np. najpierw ekran z obecnymi hasłami, potem
  nowe hasła) to decyzja wykonawcy.

## Zostawione wykonawcy
Nazwa i ikona zakładki (proponuję `Podręcznik` z ikoną w stylu lucide `graduation-cap`, bo `i-book` ma już
Ściąga), dokładny wygląd listy i hasła w tokenach apki, gdzie w `app.js` lub w osobnym module (`// @ts-check`)
leży kod ekranu, kolejność wydań.
