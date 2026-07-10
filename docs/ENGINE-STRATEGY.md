# Strategia silnika — Smart Kalkulator PWA

> **Status:** notatka architektoniczna · **2026-07-10**  
> **Zasada nadrzędna:** nie podmieniać działających parserów/feature’ów bez powodu — **pożyczaj wzorce i moduły** od najlepszych silników, rozwijaj własny rdzeń.

---

## Filozofia: „cherry-pick”, nie „big bang rewrite”

Nasz produkt to **kalkulator-notatnik** (Soulver-like + polskie jednostki + `@zmienne` + linie), nie ogólny edytor dokumentów ani CAS.

| ✅ Robimy | ❌ Unikamy |
|-----------|------------|
| Wzorce UX/API od liderów (Obsidian, CM6) | Pełna migracja na CM6/Lexical „bo modne” |
| Moduły tam, gdzie nie mamy domeny (decimal, export MD) | math.js zamiast `smart-parser.js` |
| Własny silnik tam, gdzie mamy przewagę | Duplikowanie tego, co już działa |

**Inspiracja topowa + implementacja lekka** — udowodnione w notatniku (textarea + mirror, Live Preview jak Obsidian).

---

## 1. Edytor / Live Preview

**Obecny stan:** własny stack — `textarea` + `.np-mirror` + markery inline + tryb „przy kursorze” (Obsidian Live Preview).

| Biblioteka | Rola | Kiedy rozważyć |
|------------|------|----------------|
| **[CodeMirror 6](https://codemirror.net/)** | Edytor + dekoracje (Live Preview, undo, mapowanie kursora) | Składnia wieloblokowa, zaawansowany undo, pluginy ([codemirror-live-markdown](https://github.com/blueberrycongee/codemirror-live-markdown)) |
| **[Lexical](https://lexical.dev/)** (Meta) | Rich-text, React-friendly | Gdy produkt = dokument, nie kalkulator-linii |
| **[ProseMirror](https://prosemirror.net/)** / **[TipTap](https://tiptap.dev/)** | RTE / Notion-like | Rich text jako core — **nie** dla obecnej wizji |
| **[markdown-it](https://github.com/markdown-it/markdown-it)** / **[micromark](https://github.com/micromark/micromark)** | Parse MD (render, nie edycja) | Podgląd statyczny, pipeline transformacji |

**Decyzja:** zostajemy przy textarea+mirror, dopóki notatnik = linie + eval. CM6 — dopiero przy wyraźnej potrzebie (np. highlight składni, bloki kodu).

---

## 2. Kalkulator / parser wyrażeń

**Obecny stan:** `js/smart-parser.js`, `evalCalcExpression`, `evalNotepadLines` — domena PL, jednostki, `razem`, `@globalne`, waluty.

| Biblioteka | Rola | Kiedy rozważyć |
|------------|------|----------------|
| **[math.js](https://mathjs.org/)** | Wyrażenia, macierze, jednostki ogólne | **Nie** jako zamiennik — konflikt z polską domeną; ewentualnie **wycinek** (macierze, funkcje) za adapterem |
| **[decimal.js](https://github.com/MikeMcl/decimal.js/)** | Precyzja dziesiętna (pieniądze) | Minimalnie, gdy regresje `0.1 + 0.2` lub zaokrąglenia VAT |
| **[expr-eval](https://github.com/silentmatt/expr-eval)** | Prosty parser | Raczej nie — mniej niż nasz parser |

**Decyzja:** **math.js jako wzorcownia inżynierska** — patrzymy pod maskę (architektura, testy, edge case’y), **nie** importujemy jako silnik. Rozwijaj `smart-parser` — to przewaga produktu.

### math.js — co studiować, czego nie wdrażać

| ✅ Ucz się / przenoś wzorce do `smart-parser` | ❌ Nie kopiuj / nie podmieniaj |
|-----------------------------------------------|--------------------------------|
| Pipeline: tokenizacja → AST → eval → wynik | Pełny system jednostek SI |
| Jawne typy wyniku (liczba, jednostka, waluta, błąd) | Macierze, complex, symbolic (dopóki niepotrzebne) |
| Testy: property-based, oracle, regresje edge case’ów | API `evaluate(string)` jako jedyne wejście |
| Rejestr funkcji/stałych (scope) — analogia do `@globalne`, `STATE.constants` | Zamiana `smart-parser.js` na math.js |
| Jak radzą sobie z: pustym wyrażeniem, `-`, overflow, kolejnością operatorów | Duplikowanie PL domeny (`razem`, etykiety linii) |

### Workflow przy bugu / nowej funkcji eval

```
1. Sprawdź, jak math.js to rozwiązuje (kod + testy w ich repo)
2. Zdecyduj: ta sama semantyka co math.js, czy nasza domena (PL/jednostki/linie)?
3. Dopisz test u nas (smoke / property / oracle)
4. Implementuj w smart-parser — bez dodawania math.js do package.json
```

**Co „kopiować” od math.js (wzorce, nie kod 1:1):**
- warstwa tokenizacji → AST → eval
- jawne typy wyniku (liczba, jednostka, błąd)
- property-based / oracle testy (już częściowo: `test/property.js`, `units-oracle.js`)
- lista regresji edge case’ów inspirowana ich testami — implementacja własna

---

## 3. Markdown — eksport i share

**Obecny stan:** surowy tekst z markerami `**`, `_`, `__` w `.txt` / `.md`.

| Biblioteka | Rola |
|------------|------|
| **[marked](https://marked.js.org/)** | MD → HTML (share, druk, podgląd) |
| **[remark](https://github.com/remarkjs/remark)** + unified | Pipeline MD (parse → transform → stringify) — gdy potrzeba własnych reguł eksportu |

**Decyzja:** `marked` (lub lekki własny renderer) **tylko na ścieżce eksportu** — edytor zostaje plain + mirror.

---

## 4. API zewnętrzne (web / PWA)

| API / lib | Użycie |
|-----------|--------|
| NBP / Frankfurter | Kursy walut ✅ (już w apce) |
| [Desmos API](https://www.desmos.com/api) | Wykresy z komendy / notatnika |
| Web Share API | Share notatek ✅ |
| IndexedDB / [idb-keyval](https://github.com/jakearchibald/idb-keyval) | Notatki > limit localStorage (~5 MB) |
| [Floating UI](https://floating-ui.com/) | Menu kontekstowe, dymki (opcjonalnie) |
| Comlink + Web Worker | Ciężki eval / długie notatki (opcjonalnie) |

---

## 5. Mapa decyzji (quick reference)

```
Notatnik edycja     → własny textarea+mirror (wzór: Obsidian/CM6 Live Preview)
Notatnik eksport    → marked / remark (opcjonalnie)
Parser kalkulatora  → smart-parser (rozwijaj; math.js = wzorcownia pod maską, NIE dependency)
Precyzja pieniędzy  → decimal.js (minimalnie, punktowo)
Rich text           → NIE (Lexical/TipTap) — chyba że zmiana produktu
Pełny edytor kodu   → CM6 — tylko przy upgrade UX edytora
Storage             → localStorage → IndexedDB gdy urośnie
```

---

## 6. Kolejność upgrade’ów (sugerowana)

1. **decimal.js** — punktowo w eval walut/VAT (mały diff, duży zysk stabilności)
2. **marked** — eksport `.md` / share HTML (zero wpływu na edytor)
3. **IndexedDB** — gdy notatki blisko limitu storage
4. **Wzorce CM6** — kolejne polish notatnika (undo, bloki) bez pełnej migracji
5. **CM6** — dopiero gdy edytor ma być „mini-IDE”, nie kalkulator-linii

---

## Powiązane pliki

| Plik | Zawartość |
|------|-----------|
| `app.js` | `_np*`, `evalNotepadLines`, mirror Live Preview |
| `js/smart-parser.js` | Parser wyrażeń |
| `docs/ENGINE-EXTRACTION-PLAN.md` | Plan migracji pozostałej logiki eval z app.js → parser (fazy 1–6) |
| `ROADMAP-QOL.md` | Tier 6 notatnik UX |
| `test/*.js` | Smoke, property, oracle |

---

*Autor notatki: sesja architektoniczna 2026-07-10 · ostatnia aktualizacja: doprecyzowanie math.js jako wzorcowni (nie zamiennik)*
