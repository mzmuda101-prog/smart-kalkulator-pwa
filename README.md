# Smart Kalkulator

PWA do codziennych i technicznych obliczen: standardowy kalkulator, podzialy inzynierskie, wykresy, prosta geometria 2D i wlasne stale.

## Funkcje

- Standardowy kalkulator z historia, procentami w stylu kalkulatorow mobilnych i kopiowaniem przez przytrzymanie wyniku.
- Inzynieria: podzial dlugosci na punkty, marginesy, os X/Y, stale odstepy, wiele serii.
- Wykresy: funkcje `f(x)`, podzialy na osi, punkty, prostokaty i siatki 2D.
- PWA: instalacja na ekranie glownym, cache offline na produkcji, czyszczenie lokalnego cache podczas debugowania.

## Przyklady komend

Inzynieria i podzialy:

```text
x=120/4 | m=10/10 | @edges
x=120 | co=20 | opis=otwory
y=200/5 | @edges | x=30
x=120/4 ;; x=120/6 | y=30
```

Wykresy i geometria:

```text
f(x)=sin(x)
f(x)=x^2-4 ;; f(x)=cos(x)
punkt=150,200 | label=A | r=8
rect=400x300 | ox=50 | oy=50
siatka=400x300 | co=100x100 | label=P
```

## Debug parsera

W konsoli przegladarki:

```js
window.__matm0.runParserSmokeTests()
window.__matm0.parseCommandSeries('x=120 | co=20 ;; punkt=60,0')
window.__matm0.getHelpCoverageReport()
```

## Edycja sciagi

Sciaga komend jest w pliku `command-definitions.js`. Ten plik opisuje tylko UI i dokumentacje; parser w `app.js` nadal decyduje, jakie komendy aplikacja realnie obsluguje. Jesli parser umie cos, czego nie ma w sciadze, aplikacja pokazuje to w sekcji `Parser umie wiecej`.

## Wersjonowanie

Jedno źródło prawdy: `version.js` → `APP_VERSION` (cache SW, napis w ustawieniach).

Do v99 bumpuj po prostu: `v94` → `v95` → … → `v99`.

**Przy kolejnym wydaniu po v99 nie używaj `v100`** — wpisz `v1.00` (reset numeracji, jak sensowna „1.0”). Szczegóły i notatka na przyszłość są w komentarzu na górze `version.js`.

## Dokumentacja wewnętrzna

- [`docs/ENGINE-STRATEGY.md`](docs/ENGINE-STRATEGY.md) — strategia silnika (edytor, parser, eksport; cherry-pick z CM6/math.js/marked)
- [`ROADMAP-QOL.md`](ROADMAP-QOL.md) — roadmap QoL (notatnik Tier 6 itd.)

## Live demo

https://kalkulator-by-matm0.vercel.app
