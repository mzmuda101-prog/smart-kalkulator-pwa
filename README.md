# Smart Kalkulator

**Kalkulator, ktory rozumie zdania. Offline, po polsku.**

`100 zl + 23% vat` · `ile dni do 25.12` · `czas w Tokio` · `od 8:00 do 16:30` · `2 kg na lb`

PWA do obliczen codziennych i technicznych. Rdzen jest deterministyczny (parser regulowy
+ testy baseline), dziala bez sieci i nic nie wysyla na zewnatrz.

## Funkcje

- **Rozwiazania krok po kroku** — `rozwiaz x^2 - 5x + 6 = 0`, `uprosc`, `rozloz`, `kroki 1/2 + 1/3`: rownania (takze przez delte), rozklad na czynniki i rachunki na dokladnych ulamkach; kazdy wynik rownania jest sprawdzany przez podstawienie.
- **Pochodne i calki krok po kroku** — `pochodna x^3 * sin(x)`, `calka x * e^x`, `calka x^2 od 0 do 1`: reguly iloczynu, ilorazu i lancuchowa, podstawienie, calkowanie przez czesci, ulamki proste; kazdy wynik jest sprawdzany numerycznie.
- **Parser zdan (PL/EN)** — jednostki i algebra wymiarowa (`5 km * 5 km` → km²), waluty
  (NBP + Frankfurter), VAT/brutto/netto, daty, strefy czasowe, czas roboczy, BigInt na
  duzych liczbach calkowitych.
- **Codzienne pytania (jak w Raycaście)** — `15% napiwku od 80 zł`, `23% vat w 123 zł`, `25% rabatu od 60 zł na 3 osoby`,
  `ile dni do końca miesiąca`, `tydzień 44 2026`, `ile do 17:00`, `czas w Tokio + 4`, `16:00 CET na UTC`,
  `round(23,456; 1)`, `max(2 h 30 min; 200 min)`, `3,3 do najbliższej ćwiartki`, `1,75 jako ułamek`, `255 na hex`,
  `5:00 min/km na km/h`, `1 TB przy 100 Mbps`, `prędkość światła w km/s`, `a4 na hz`, `masa molowa C6H12O6`.
- **Notatnik obliczeniowy** (Soulver-like) — zmienne, etykiety, szablony, eksport.
- Standardowy kalkulator z historia, procentami w stylu kalkulatorow mobilnych i
  kopiowaniem przez przytrzymanie wyniku.
- Inzynieria: podzial dlugosci na punkty, marginesy, os X/Y, stale odstepy, wiele serii.
- Wykresy: funkcje `f(x)`, podzialy na osi, punkty, prostokaty i siatki 2D.
- Warsztat: przeliczniki do remontu, ogrodu i prac domowych.
- PWA: instalacja na ekranie glownym, cache offline na produkcji, czyszczenie lokalnego
  cache podczas debugowania.

Pole wyrazenia rotuje przykladami tego, co silnik potrafi — kazdy z nich jest pilnowany
przez `test/placeholder-examples.js`, zeby placeholder nigdy nie obiecywal funkcji,
ktorej parser nie policzy.

## Przyklady komend

Inzynieria i podzialy (wzorzec symboliczny — klik wstawia domyslne L=120, N=4):

```text
x=L/N | m=A/B | @edges
x=L | co=S | opis=T
y=L/N | @edges | x=D
x=L/N ;; x=L/N | y=D
```

Wykresy i geometria (wzorzec symboliczny — klik wstawia domyslne W=400, H=300, R=100):

```text
f(x)=sin(x)
f(x)=x^2-4 ;; f(x)=cos(x)
punkt=x;y | opis=A | r=P
prostokat=WxH | ox=A | oy=B
siatka=WxH | co=dx x dy
```

## Debug parsera

W konsoli przegladarki:

```js
window.__matm0.runParserSmokeTests()
window.__matm0.parseCommandSeries('x=120 | co=20 ;; punkt=60,0')
window.__matm0.getHelpCoverageReport()
```

## Edycja sciagi

Sciaga komend jest w pliku `command-definitions.js` (sekcje: `calculator`, `engineering`, `graph`). **Notatnik** — ten sam model zaplanowany, na razie statyczny HTML; patrz [`docs/COMMAND-HELP-NOTEPAD-PLAN.md`](docs/COMMAND-HELP-NOTEPAD-PLAN.md). Wzorzec jak w zaawansowanych kalkulatorach (HP 48G, TI-Nspire):

- **syntax** — zapis symboliczny (`x=L/N`, `punkt=x;y`, `kąt=K`) — to widzi uzytkownik
- **yields** — co kalkulator policzy (`P% × B`, `100% = A ÷ P × 100`) — wzór lub typ wyniku, w UI jako `→`
- **command** — szablon z `{PLACEHOLDER}` — po kliknieciu wstawiane sa wartosci z `HELP_DEFAULTS`
- **Przykłady** — jedyne miejsce z konkretnymi liczbami (pitagoras 3;4, dzialka 120×80)

Zmiana domyslnych wartosci: edytuj `HELP_DEFAULTS` na gorze pliku — cala sciaga sie aktualizuje.

Parser w `app.js` nadal decyduje, jakie komendy aplikacja realnie obsluguje. Jesli parser umie cos, czego nie ma w sciadze, aplikacja pokazuje to w sekcji `Parser umie wiecej`.

## Wersjonowanie

Jedno źródło prawdy: `version.js` → `APP_VERSION` (cache SW, napis w ustawieniach).

Po bumpie wersji uruchom **`npm run sync-version`** — wpisuje `SW_FINGERPRINT` do `sw.js` (przeglądarka instaluje nowy SW tylko gdy plik `sw.js` się zmieni).

Do v99 bumpuj po prostu: `v94` → `v95` → … → `v99`.

**Przy kolejnym wydaniu po v99 nie używaj `v100`** — wpisz `v1.00` (reset numeracji, jak sensowna „1.0”). Szczegóły i notatka na przyszłość są w komentarzu na górze `version.js`.

## Dokumentacja wewnętrzna

- [`docs/ENGINE-STRATEGY.md`](docs/ENGINE-STRATEGY.md) — strategia silnika (edytor, parser, eksport; cherry-pick z CM6/math.js/marked)
- [`docs/COMMAND-HELP-NOTEPAD-PLAN.md`](docs/COMMAND-HELP-NOTEPAD-PLAN.md) — plan migracji ściągi notatnika (zaplanowane)
- [`ROADMAP-QOL.md`](ROADMAP-QOL.md) — roadmap QoL (notatnik Tier 6 itd.)

## Live demo

https://kalkulator-by-matm0.vercel.app
