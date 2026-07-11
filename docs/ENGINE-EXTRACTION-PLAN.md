# Plan ekstrakcji silnika → `smart-parser.js`

> **Status:** plan architektoniczny · **2026-07-10**  
> **Cel:** bezpiecznie przenieść pozostałe ~35–40% logiki eval z `app.js` do modułu parsera,  
> żeby później łatwiej rozwijać, testować i rozumieć silnik — **bez big-bang rewrite**.  
> **Powiązane:** [`ENGINE-STRATEGY.md`](ENGINE-STRATEGY.md) · `ROADMAP-QOL.md` (T5)

---

## 1. Zasady (nie negocjujemy)

| ✅ Robimy | ❌ Unikamy |
|-----------|------------|
| Migracja **fazami** — jeden tenant na PR | Przenoszenie całego `evalCalcExpression` naraz |
| **Test gate** po każdej fazie (`npm test`, baseline) | Zmiana semantyki „przy okazji" |
| `app.js` = cienkie wiązanie + UI + `STATE` | Parser wołający DOM / `STATE` bez adaptera |
| math.js / oracle tylko w testach | math.js w bundle PWA |
| Dokumentacja API w nagłówku `MATM0_PARSER` | Duplikacja `compileGraphExpression` bez planu |

**Wzorzec tenantów** (już działa): `smart-parser.js` eksportuje funkcje czyste; `app.js` podaje `opts` (kursy, jednostki, ustawienia).

---

## 2. Mapa stanu obecnego (~2026-07-10)

### Już w `js/smart-parser.js` (`MATM0_PARSER`) — ~60–65%

| Tenant | Funkcje |
|--------|---------|
| Jednostki | `buildUnitRegistry`, `resolveUnitsExpression`, `analyzeUnitMix` |
| Waluty | `resolveCurrencyExpression`, `hasCurrencyInInput`, token map/re |
| Czas | `_TIME`, `evalClockExpression`, `formatDurationSeconds` |
| Daty | `evalDateExpression`, `evalPeriodPercentage` |
| Strefy | `evalTimezoneExpression` |
| Test hooks | `setTodayForTests`, `setNowForTests` |

### Nadal w `app.js` — ~35–40% (kolejność migracji poniżej)

| Blok | Linie (orient.) | Złożoność | Uwagi |
|------|-----------------|-----------|-------|
| `parseNaturalShortcuts` | ~880–1018 | **L** | VAT, %, ułamki PL/EN, skróty — serce domeny |
| `expandNumericShorthands`, `expandCurrencyShorthands` | ~830–846 | S | przed walutą |
| `resolveTrigDegrees` | ~849–878 | S | przed compile |
| `evalPercentQuery` / `Difference` / `BaseQuery` | ~1539–1678 | M | osobne ścieżki query |
| `evalRouteCost` | ~1679–1692 | S | domena PL (paliwo) |
| `tryBigIntCalc` | ~1443–1490 | M | ścieżka dokładna int |
| `compileGraphExpression` (kalkulator) | ~4968+ | M | **duplikat** z modułem wykresów |
| `evalCalcExpression` (orkiestrator) | ~1694–1860 | L | koordynuje wszystko + `makeVal` |
| `resolveCalcAnswer`, stałe, `resolveFunctionConstants` | rozproszone | M | `@globalne`, `ans` |
| FX fetch (`_fetchNbp`, `_commitFxRates`) | ~1279+ | — | **zostaje w app.js** (sieć) |

### Osobno (nie do parsera kalkulatora)

- `evalNotepadLines`, `_np*` — warstwa notatnika (woła `evalCalcExpression`)
- `compileGraphExpression` / wykresy / komendy — osobny pipeline; docelowo **wspólny moduł numeryczny**

---

## 3. Architektura docelowa

```
┌─────────────────────────────────────────────────────────────┐
│  app.js                                                     │
│  STATE · UI · FX fetch · makeVal · formatCalcResult         │
│  evalCalcExpression() → 1 wywołanie MATM0_PARSER.evaluate() │
└───────────────────────────┬─────────────────────────────────┘
                            │ opts: fx, units, settings, money
┌───────────────────────────▼─────────────────────────────────┐
│  js/smart-parser.js  (MATM0_PARSER)                         │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────────────┐ │
│  │ preprocess  │→│ query routers│→│ numeric eval        │ │
│  │ shortcuts   │ │ % VAT date   │ │ BigInt + compile    │ │
│  └─────────────┘ └──────────────┘ └─────────────────────┘ │
│  ┌─────────────┐ ┌──────────────┐                           │
│  │ units       │ │ currency     │  (już są)                │
│  └─────────────┘ └──────────────┘                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  js/money-decimal.js (MATM0_MONEY) — zaokrąglenia / VAT     │
└─────────────────────────────────────────────────────────────┘
```

**Docelowe API** (propozycja — rozszerzać ewolucyjnie):

```javascript
MATM0_PARSER.evaluate(raw, {
  fxRates, fxReady, defaultCurrency,
  unitDefs, unitDisplay, defaultUnits,
  constants,              // @globalne, ans
  money: MATM0_MONEY,     // opcjonalnie
  firstUnitWins: false,
});
// → { value, unit, kind, exact, text, ... }  // bez mutacji STATE
```

`app.js` po migracji: ustawia `STATE.calc.lastResult` z wyniku — **jedyna** mutacja globalna.

---

## 4. Fazy migracji (kolejność + kryteria akceptacji)

### Faza 0 — Fundament ✅ (zrobione)

- [x] Jednostki, waluty, czas, daty, TZ w `smart-parser.js`
- [x] `MATM0_MONEY` + `decimal.js` (grosze)
- [x] Oracle: `units-oracle.js`, `money-oracle.js` (mathjs devDep)

---

### Faza 1 — Preprocess (skróty języka naturalnego)

**Przenieść:** `expandNumericShorthands`, `expandCurrencyShorthands`, `resolveTrigDegrees`, `parseNaturalShortcuts`.

| | |
|---|---|
| **Effort** | L (największy plik reguł) |
| **Ryzyko** | Średnie — regresje VAT/% |
| **Testy** | smoke VAT/%, `money-oracle`, `property.js` (%), baseline |
| **Technika** | Jedna funkcja `preprocessExpression(raw, opts)` w parserze; `app.js` deleguje 1:1 |

**Kryterium:** `evalCalcExpression` w app woła `_PARSER.preprocessExpression` — zero zmian wyników baseline.

---

### Faza 2 — Router zapytań procentowych

**Przenieść:** `evalPercentQuery`, `evalPercentDifference`, `evalPercentBaseQuery`.

| | |
|---|---|
| **Effort** | M |
| **Ryzyko** | Niskie–średnie |
| **Testy** | smoke sekcja „ile %", „baza procentowa", `money-oracle` |

**Kryterium:** osobny `tryEvalPercentFamily(raw, opts)` zwraca wynik lub `null` (kontynuuj pipeline).

---

### Faza 3 — Moduł numeryczny (wspólny)

**Przenieść:** `tryBigIntCalc`, `insertImplicitMultiplication`, `compileGraphExpression` (wersja kalkulatora).

| | |
|---|---|
| **Effort** | M |
| **Ryzyko** | Średnie — duplikat z wykresem |
| **Testy** | smoke, `property.js`, BigInt w smoke |

**Technika:** `js/numeric-eval.js` importowany przez parser **i** moduł wykresów (jeden plik, dwa konsumenty).

**Kryterium:** jeden `compileExpression(expr) → fn`, bez kopii w `app.js`.

---

### Faza 4 — Zapytania domenowe + stałe

**Przenieść:** `evalRouteCost`, `resolveCalcAnswer`, `resolveCalcConstants`, `resolveFunctionConstants`.

| | |
|---|---|
| **Effort** | M |
| **Ryzyko** | Niskie |
| **Testy** | smoke route cost, stałe, `ans` |

**Kryterium:** `constants` i `lastAnswer` przekazywane w `opts`, nie czytane z closure.

---

### Faza 5 — Orkiestrator `evaluate()`

**Przenieść:** logikę pipeline'u z `evalCalcExpression` (bez `makeVal` / formatowania UI).

| | |
|---|---|
| **Effort** | L |
| **Ryzyko** | Wysokie — dotyka wszystkiego |
| **Testy** | **pełne** `npm test` + porównanie `baseline-snapshot.json` |

**Kryterium:**

```javascript
// app.js — docelowy kształt
function evalCalcExpression(raw, opts) {
  var r = _PARSER.evaluate(raw, _parserOpts(opts));
  if (r && r.value != null) STATE.calc.lastResult = r.value;
  return makeVal(r);
}
```

---

### Faza 6 — Porządki i dokumentacja ✅

- Tabela reguł preprocess: [`ENGINE-PREPROCESS-RULES.md`](./ENGINE-PREPROCESS-RULES.md)
- Usunięto martwe delegacje z `app.js` (preprocess, routery %, strip, resolveCalcUnits…)
- JSDoc `@typedef EvaluateResult` w `smart-parser.js`

---

## 5. Co **zawsze** zostaje w `app.js`

| Obszar | Dlaczego |
|--------|----------|
| `STATE`, `localStorage`, ustawienia | stan aplikacji |
| `_fetchNbp`, Frankfurter, `STATE.fx` | sieć + cache PWA |
| `makeVal`, `formatCalcResult`, `formatLocaleNumber` | prezentacja UI |
| Notatnik `_np*`, historia, UI kalkulatora | warstwa produktu |
| Service Worker, theme | infrastruktura PWA |
| `runCalcSmokeTests` runner | może zostać; woła publiczne API |

---

## 6. Strategia testów przy każdej fazie

```
1. Przed PR:     npm test (wszystko)
2. Po przeniesieniu: diff baseline-snapshot — zero zmian
3. Nowe reguły:  dopisać do smoke + ewent. oracle
4. % / VAT:      money-oracle + property
5. Jednostki:    units-oracle (bez zmian przy preprocess)
```

**mathjs** — tylko jako niezależny tor w `test/money-oracle.js`; wzorce architektury (pipeline, typy) studiuj pod maską, nie importuj do runtime.

---

## 7. Szacunek effort (orientacyjny)

| Faza | Effort | Zależności |
|------|--------|------------|
| 1 Preprocess | L | — |
| 2 Procenty | M | po 1 (VAT w preprocess) |
| 3 Numeric | M | równolegle z 2 możliwe |
| 4 Domena + stałe | M | po 3 |
| 5 Orkiestrator | L | po 1–4 |
| 6 Porządki | S | po 5 |

**Razem:** ~3–5 sesji focus (bez regresji), zgodnie z T5 w roadmapie.

---

## 8. Status (2026-07)

**Ekstrakcja zakończona** (fazy 1–6). Kolejne zmiany silnika → `smart-parser.js` + test gate.

Opcjonalnie na przyszłość: `smart-parser.d.ts` dla TypeScript consumerów.

---

## Author

Mateusz Zmuda · plan sesji 2026-07-10
