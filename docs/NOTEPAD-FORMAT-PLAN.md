# Plan formatowania notatnika — `MATM0_NP_FMT`

> **Status:** plan rozszerzeń · **2026-07-10**  
> **Implementacja:** `js/notepad-format.js` · wiązanie UI w `app.js`  
> **Zasada:** plain text + markery (jak Obsidian) — **nie** Lexical/rich-text DOM.

---

## 1. Dwa poziomy formatowania

| Poziom | Zakres | Mechanizm | Przykład |
|--------|--------|-----------|----------|
| **Inline** | zaznaczony fragment | owijanie markerami | `**bold**`, `~~strike~~`, `::accent::` |
| **Linia** | cała linia kursora | prefix przed treścią | `< ` środek, `> ` prawo, `\| ` justuj |

Inline i linia **nie mieszają się w jednym tokenie** — inna semantyka, inny strip przed eval.

---

## 2. Stan obecny (2026-07-10)

### Inline ✅ (rejestr `INLINE`)

| Act | Marker | Menu zaznaczenia | Pasek tablet |
|-----|--------|------------------|--------------|
| bold | `**` | ✅ | ✅ |
| italic | `_` | ✅ | ✅ |
| underline | `__` | ✅ | ✅ |
| strike | `~~` | ✅ | ✅ |
| accent | `::` | ✅ | ✅ |

### Linia ✅ (logika w `app.js`, prefixy T6-4)

| Act | Prefix | Efekt CSS |
|-----|--------|-----------|
| align-left | *(brak)* | domyślne — **lewo** |
| align-center | `< ` | środek |
| align-right | `> ` | prawo |
| align-justify | `\| ` | justuj |

**Gdzie dziś w UI:** long-press / double-tap na **tle panelu**, pasek tabletu, PPM desktop — **nie** w menu przy zaznaczeniu tekstu.

### Font linii ✅ (T6-1)

- `A−` / `A+` / `↺` — globalny `--np-font-size` (nie per-linia).

---

## 3. Faza A — zrobione

- [x] Rejestr `INLINE` w `notepad-format.js`
- [x] `stripMarkers` + `fillMirror` z jednego miejsca
- [x] Menu B/I/U/S/◆ z rejestru
- [x] Smoke T6-5 / T6-6

---

## 4. Faza B — wyrównanie w opcji formatowania

**Cel:** użytkownik ustawia **lewo / środek / prawo** z tego samego „miejsca co formatowanie”, bez szukania pustego tła panelu.

**Status:** częściowo wdrożone (rejestr `LINE`, menu zaznaczenia jednoliniowe, panel + kb z rejestru). Do dopracowania: aktywny stan przycisku, testy dedykowane.

### 4.1 Rejestr `LINE` (obok `INLINE`)

Przenieść metadane wyrównania do `notepad-format.js`:

```javascript
var LINE = [
  { id: 'align-left',   act: 'align-left',   label: '◀', title: 'Do lewej',   mode: 'left',   toggle: true },
  { id: 'align-center', act: 'align-center', label: '≡', title: 'Do środka',  mode: 'center', toggle: true },
  { id: 'align-right',  act: 'align-right',  label: '▶', title: 'Do prawej',  mode: 'right',  toggle: true },
  { id: 'align-justify', act: 'align-justify', label: '⊞', title: 'Justuj', mode: 'justify', toggle: true }
];
```

Implementacja akcji zostaje w `app.js` (`_npSetLineAlign`) — rejestr tylko **opisuje UI i mapowanie act → mode**.

### 4.2 Kiedy pokazywać wyrównanie w menu

| Kontekst | Zawartość menu |
|----------|----------------|
| Zaznaczenie **w jednej linii** | `B I U S ◆` + **separator** + `◀ ≡ ▶ ⊞` |
| Zaznaczenie wielolinijkowe | tylko inline (align = per-linia → niejednoznaczne) |
| Long-press na tle panelu | align + font (jak dziś) |
| Pasek tabletu | inline + align + font (jak dziś, specs z rejestru) |

**Reguła:** `selectionMenuItems({ singleLine: true })` dokleja `LINE` — wykrywanie: `selectionStart` i `selectionEnd` w tej samej linii (`_npLineIndexAt`).

### 4.3 Zachowanie toggle (bez zmian semantyki)

- Tap **◀** gdy linia już lewa → bez zmian (lub explicit reset prefixu).
- Tap **≡** gdy już środek → **zdejmij** prefix `< ` (powrót do lewa).
- To samo co dziś `_npSetLineAlign` — rejestr nie zmienia logiki, tylko **skąd** wołamy akcję.

### 4.4 Wizualna informacja zwrotna (opcjonalnie, później)

- Aktywny przycisk wyrównania w menu: klasa `.np-ctx-btn.is-active` gdy `prep.align === mode`.
- W mirrorze prefix `< ` / `> ` już jest ghost przy kursorze (T6-5).

### 4.5 Testy akceptacji Fazy B

- [x] Menu przy zaznaczeniu jednej linii zawiera ◀≡▶ (bez ⊞ w menu zaznaczenia)
- [x] Menu przy zaznaczeniu 2+ linii **nie** zawiera align
- [x] `> 100+200` nadal = 300 (smoke T6-4)
- [ ] Toggle wizualny: aktywny przycisk gdy linia ma dany prefix
- [ ] Mobile: long-press na zaznaczeniu — smoke manualny obok natywnego Kopiuj/Wytnij

### 4.6 Effort

| Zadanie | Effort |
|---------|--------|
| Rejestr `LINE` + `kbPanelItems()` | S |
| `selectionMenuItems(singleLine)` | M |
| Aktywny stan przycisku | S |
| Smoke + 1 test Playwright opcjonalnie | S |

---

## 5. Faza C — później (nie teraz)

| Pomysł | Uwagi |
|--------|-------|
| Więcej kolorów (`!!warn!!`, `++ok++`) | paleta z CSS vars, jak T6-6 accent |
| Wyrównanie **wielu linii** naraz | apply align do każdej linii w zaznaczeniu |
| Per-linia font-size | inny model niż globalny `--np-font-size` |
| Lexical / CM6 | tylko przy zmianie produktu na dokument — patrz ENGINE-STRATEGY |

---

## 6. Jak dodać nowy format (ściąga)

**Inline:** jeden wiersz w `INLINE` + klasa w `styles.css` + wpis w `stripMarkers` / kolejność skanowania (dłuższe tokeny pierwsze).

**Linia:** wiersz w `LINE` + handler w `_npRunEditorAction` (jeśli nowy typ) + smoke na prefix nie psujący eval.

---

## Powiązane

- `docs/ENGINE-STRATEGY.md` — dlaczego nie Lexical
- `docs/ENGINE-EXTRACTION-PLAN.md` — silnik eval (osobny tor)
- `ROADMAP-QOL.md` — T6-4, T6-CTX, T6-6

---

*Autor: Mateusz Zmuda · 2026-07-10*
