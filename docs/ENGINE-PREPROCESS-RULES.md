# Silnik — kolejność pipeline (`MATM0_PARSER.evaluate`)

Jedno źródło prawdy dla kolejności reguł po ekstrakcji z `app.js` (fazy 1–6).
Implementacja: `js/smart-parser.js` → `evaluate()`. Wiązanie UI: `app.js` → `evalCalcExpression()`.

## Wejście / wyjście

| Warstwa | Funkcja | Zwraca |
|---------|---------|--------|
| Parser | `_PARSER.evaluate(raw, opts)` | plain `EvaluateResult` (bez `STATE`) |
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
| 12 | Normalizacja | `,`→`.`, `×÷−`→`* / -`, whitespace | przed eval |
| 13 | Eval | `MATM0_NUMERIC.compileGraphExpression` | AST + eval |
| 14 | Post-process | skala waluty, `_roundMoney`, `displayFactor`, `MATM0_QTY.chooseUnit`, `formatDurationSeconds`, sygnał `≈` | |

## Blokady / edge case

- **Miks waluta + fizyczna** (bez `firstUnitWins`): pusty wynik `{}`.
- **Własna jednostka bezwymiarowa** (`os.`): nie blokuje waluty.
- **BigInt**: wynik `{ big, bigStr, text }` — `value` null w `makeVal`.
- **Strefy czasowe**: `_stateClear` — app zeruje `STATE.calc.lastResult`.

## Moduły

| Moduł | Odpowiedzialność |
|-------|------------------|
| `js/smart-parser.js` | pipeline, czas, daty, %, waluty, jednostki |
| `js/numeric-eval.js` | BigInt, `compileGraphExpression` |
| `js/money-decimal.js` | grosze (używane przez parser `_roundMoney`) |
| `app.js` | `STATE`, FX fetch, `makeVal`, formatowanie UI, notatnik |

## Test gate

```bash
npm test
# baseline-snapshot.json — diff = 0
```
