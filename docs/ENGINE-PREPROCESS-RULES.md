# Silnik — kolejność pipeline (`MATM0_PARSER.evaluate`)

Jedno źródło prawdy dla kolejności reguł po ekstrakcji z `app.js` (fazy 1–6).
Implementacja: `js/smart-parser.js` → `evaluate()`. Wiązanie UI: `app.js` → `evalCalcExpression()`.

## Wejście / wyjście

| Warstwa | Funkcja | Zwraca |
|---------|---------|--------|
| Parser | `_PARSER.evaluate(raw, opts)` | plain `EvaluateResult` (bez `STATE`) |
| Parser (rdzeń) | `_evaluateCore(raw, opts)` | to samo, ale BEZ warstwy synonimów |
| App | `evalCalcExpression(raw, opts)` | `makeVal(r)` + sync `STATE.calc` |

`opts` (zbierane w `_parserEvaluateOpts`): `fxRates`, `fxReady`, `defaultCurrency`, `currencyCompactSymbols`, `constants`, `lastAnswer`, `evalConstNumeric`, `unitDefs`, `unitDisplay`, `unitNamesRe`, `defaultUnits`, `firstUnitWins`, `keepWorkCurrency`.

## Routery domenowe (early return)

Kolejność ma znaczenie — pierwsze dopasowanie wygrywa.

| # | Router | Przykład |
|---|--------|----------|
| 1 | `evalClockExpression` | `17:00 + 3h`, `od 9:30 do 17:15` |
| 2 | `evalTimezoneExpression` | `która godzina w Tokio` |
| 3 | `evalDateExpression` | `za 3 tygodnie`, `ile dni do 1.09` |
| 4 | `evalPercentBaseQuery` | `ile % stanowi 50 z 200` |
| 5 | `evalPercentOfPercent` | `6% z 81%` |
| 6 | `evalPercentQuery` | `20% z 100` |
| 7 | `evalPercentDifference` | `różnica % między A a B` |
| 8 | `evalPeriodPercentage` | procent okresowy (VAT/rok) |
| 9 | `evalRouteCost` | `500 km, 7 l/100, 6 zł/l` |
| 10 | `evalTimespanExpression` | `145 mins to timespan`, `145 min czytelnie` |
| 11 | `evalWorkTime` | `55h in workdays`, `workhours in 2026` |

Kolejność świadoma: `evalClockExpression` przed `evalDateExpression`, bo „za 4 godziny" to
GODZINA, a „za 3 tygodnie" to DATA — router zegara przepuszcza dalej wszystko, co ma
jednostkę datową (`_isDateUnit`).

## Pipeline wyrażenia numerycznego

| # | Etap | Funkcja | Uwagi |
|---|------|---------|-------|
| 1 | Stałe użytkownika | `resolveCalcConstants` | przed `%`, `vat`, NL |
| 2 | Skróty liczbowe | `expandNumericShorthands` | `2,5k`, `tys` — **przed** walutą |
| 3 | Skróty walutowe | `expandCurrencyShorthands` | `usd 1k` — **przed** `resolveCurrencyExpression` |
| 4 | Analiza miks jednostek | `analyzeUnitMix` | tylko `firstUnitWins` (notatnik) |
| 5 | Strip walut / fizycznych | `_stripCurrencyAmounts` / `_stripPhysicalUnits` | tryb first-unit-wins |
| 6 | Waluty | `resolveCurrencyExpression` | `pending` → `{ pendingFx: true }` |
| 7 | Język naturalny | `parseNaturalShortcuts` | brutto/netto, VAT, „z", procenty NL |
| 8 | Ostatnia odpowiedź | `resolveCalcAnswer` | `ans`, `#` |
| 9 | Trygonometria | `resolveTrigDegrees` | `sin(30 deg)` → radiany |
| 10 | BigInt | `MATM0_NUMERIC.tryBigIntCalc` | tylko gdy >15 cyfr |
| 11 | Jednostki | `resolveUnitsExpression` | konwersje, miks, `__auto__` |
| 11b | **Algebra wymiarowa** | `_tryQuantityAlgebra` → `MATM0_QALG` | `5 km * 5 km` → km²; wchodzi TYLKO gdy stara ścieżka nie dała jednostki albo jej kategoria ma inny wymiar |
| 12 | Normalizacja | `,`→`.`, `×÷−`→`* / -`, whitespace | przed eval |
| 13 | Eval | `MATM0_NUMERIC.compileGraphExpression` | AST + eval |
| 14 | Post-process | skala waluty, `_roundMoney`, `displayFactor`, `MATM0_QTY.chooseUnit`, `formatDurationSeconds`, sygnał `≈` | |

## Wejście tolerowane (`_tolerateInput`)

Przed routerami normalizujemy to, co człowiek pisze na kartce i w trakcie pisania:
końcowe `=`, urwany operator na końcu, niedomknięty nawias. Wcześniej każde z nich
kończyło się pustym wynikiem, czyli mylącym „0" na ekranie.

## Silnik czyta własny wynik (`_readBackOwnOutput`)

Po `=` wynik wraca do pola wyrażenia, a z historii można go kliknąć — więc **to, co
wypisujemy, musimy umieć odczytać z powrotem**. Bez tego użytkownik dostawał w polu
martwy tekst i wynik `—`.

`_tolerateInput` woła `_readBackOwnOutput`, które:
- zamienia indeks górny: przy jednostce na cyfrę (`km²` → `km2`), przy liczbie na
  potęgę (`5²` → `5^2`),
- zdejmuje KOŃCOWY nawias opisowy, ale **tylko** gdy w środku jest dzień tygodnia
  (`(piątek)`) albo znane miasto (`(Tokio)`, `(SF)`). `(2+3)` i `(x)` zostają nietknięte.

Uzupełniająco czytelne stały się też: gołe `HH:MM` (`20:00`), data z godziną
(`21.9.26 00:10`), jednostka złożona ze slashem spoza tabeli (`kg/m³`), `px`
(własna oś `pixel` — NIE długość, bo zależy od PPI) oraz wąska spacja
nierozdzielająca w liczbach (U+202F) w tokenizerze algebry.

Bramka: `test/readback.js` — dla każdego rodzaju wyniku bierze DOKŁADNIE ten tekst,
który po `=` ląduje w polu (`__matm0.calcEqualsExprText`), i wymaga, by dało się go
policzyć ponownie.

## Warstwa synonimów (`js/synonyms.js`)

Audyt 2026-09-20: silnik rozumiał JEDNO sformułowanie, a bliski wariant o tym samym
znaczeniu już nie — `od 8:00 do 16:30` ✓ / `ile godzin od 8:00 do 16:30` ∅. Dla
użytkownika to nie wygląda jak brak funkcji, tylko jak **losowa awaria**.

**Kontrakt — tylko fallback.** Warstwa nie dokłada się do pipeline'u. `evaluate()` woła
najpierw `_evaluateCore()` i sięga po synonimy **wyłącznie** gdy rdzeń zwrócił pustkę
(`_isEmptyResult`: brak `value`, `text`, `big`, bez `pendingFx` i bez `error`).
Sprawdzone przed wdrożeniem: wszystkie luki z audytu dawały ∅, a nie zły wynik — więc
przepisanie nie ma jak zmienić żadnego istniejącego wyniku. To ten sam kontrakt co przy
algebrze wymiarowej: *wchodzi tylko tam, gdzie stara ścieżka milczała albo się myliła*.

Rekurencja jest odcięta flagą `opts.__noSynonyms` — forma kanoniczna liczy się już
wyłącznie rdzeniem.

### Dwa rodzaje reguł

| Rodzaj | Działanie | Przykład |
|--------|-----------|----------|
| Przepisanie | sformułowanie → forma kanoniczna | `podziel 250 zł na 4` → `250 zł / 4` |
| Przepisanie + konwersja | liczymy formę kanoniczną, a jej WYNIK przepuszczamy przez konwersję | `ile tygodni do 25.12` → `ile dni do 25.12` (87) → `87 dni w tygodniach` |

Drugi rodzaj składa dwie **już przetestowane** zdolności silnika zamiast dublować logikę
dat czy zegara. Wymaga znajomości jednostki bazowej formy kanonicznej (`fromUnit`):
zakres zegarowy zwraca minuty, odliczanie do daty — dni.

**Gdy konwersja się nie uda, warstwa MILCZY** (nie oddaje formy kanonicznej).
`ile miesięcy do 25.12` odpowiedziane jako `87 dni` byłoby odpowiedzią na INNE pytanie;
apka ma ścieżkę „Nie rozumiem…", a cichy zły wynik jest gorszy niż brak wyniku.

### Zakres

Pokryte: pytajnik przy zakresie zegarowym, odliczanie do daty w dowolnej jednostce
czasu, procent z wielkości (`20% z 5 km` — jednostka przeżywa), dzielenie opisowe
(rachunek na osoby), średnia bez przyimka `z`.

**Poza zakresem świadomie:** `suma`/`min`/`max`/`mediana` to NOWE funkcje, nie synonimy —
nie da się ich przepisać na coś, co silnik już umie.

Bramka: `test/synonyms.js` — trzy sekcje, z czego druga jest ważniejsza od pierwszej:
*działa* / *nie ukradła* (wyrażenia sprzed warstwy dają identyczny wynik) / *nie zgaduje*.
Dodatkowo test wymusza zakotwiczenie każdej reguły (`^…$`).

## Algebra wymiarowa (`js/quantity-algebra.js`)

Stary pipeline przepisuje STRING: wycina jednostkę, liczy gołe liczby, jednostkę dokleja
na końcu. Działa przy `+`/`−`, ale przy `×`/`÷` wymiar wyparowuje. `MATM0_QALG` liczy to
samo wyrażenie na wartości z wektorem wymiaru i dobiera jednostkę z wyniku.

**Reguła pierwszeństwa:** stara ścieżka wygrywa, gdy zwróciła jednostkę, a jej kategoria
ma TEN SAM wymiar co algebra. Dzięki temu wszystkie dotąd poprawne wyniki idą ogranaą
ścieżką (baseline bez dryfu), a algebra wchodzi tylko tam, gdzie tamta milczała lub się myliła.

**Bail-outy** (→ stara ścieżka): sąsiedztwo bez operatora (`3 h 20 min` = suma, nie iloczyn),
sam wymiar odwrotny (`100 / 4 km` = 25 km, nie 25 m⁻¹), temperatura (skala z offsetem),
jednostki `custom:`, nazwy funkcji i stałych.

Waluty mają w algebrze osobną oś `C` z kursem jako przelicznikiem — służy WYŁĄCZNIE do
wykrycia skrócenia (`100 usd / 20 eur` = 4,59). Kwoty liczy dalej `resolveCurrencyExpression`.

## Blokady / edge case

- **Miks waluta + fizyczna** (bez `firstUnitWins`): pusty wynik `{}`.
- **Własna jednostka bezwymiarowa** (`os.`): nie blokuje waluty.
- **BigInt**: wynik `{ big, bigStr, text }` — `value` null w `makeVal`.
- **Strefy czasowe**: `_stateClear` — app zeruje `STATE.calc.lastResult`.

## Moduły

| Moduł | Odpowiedzialność |
|-------|------------------|
| `js/smart-parser.js` | pipeline, czas, daty, %, waluty, jednostki, czas roboczy |
| `js/quantity-algebra.js` | algebra wymiarowa (× ÷ składają wymiar) |
| `js/synonyms.js` | warstwa synonimów — fallback, przepisuje sformułowania na formy kanoniczne |
| `js/numeric-eval.js` | BigInt, `compileGraphExpression` |
| `js/money-decimal.js` | grosze (używane przez parser `_roundMoney`) |
| `app.js` | `STATE`, FX fetch, `makeVal`, formatowanie UI, notatnik |

## Test gate

```bash
npm test
# baseline-snapshot.json — diff = 0
```
