# Smart Kalkulator

PWA do codziennych i technicznych obliczen: standardowy kalkulator, podzialy inzynierskie, wykresy, prosta geometria 2D i wlasne stale.

## Funkcje

- Standardowy kalkulator z historia, procentami w stylu kalkulatorow mobilnych i kopiowaniem przez przytrzymanie wyniku.
- Inzynieria: podzial dlugosci na punkty, marginesy, os X/Y, stale odstepy, wiele serii.
- Wykresy: funkcje `f(x)`, podzialy na osi, punkty, prostokaty i siatki 2D.
- PWA: instalacja na ekranie glownym, cache offline na produkcji, czyszczenie lokalnego cache podczas debugowania.

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
