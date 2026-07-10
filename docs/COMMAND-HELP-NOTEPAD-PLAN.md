# Plan ściągi notatnika — migracja do `command-definitions.js`

> **Status:** zaplanowane · **nie implementować teraz**  
> **Powiązane:** `command-definitions.js`, `index.html` (sekcja `data-help="notepad"`), `README.md`

---

## Cel

Przenieść ściągę **Notatnik** na ten sam model co Kalkulator / Inżynieria / Graf:

| Pole | Rola |
|------|------|
| `syntax` | wzorzec symboliczny (`Etykieta: a × b`, `@nazwa: wartość`) |
| `yields` | co policzy linia (`wynik wyrażenia`, `zmienna w notatniku`) |
| `command` | szablon `{PLACEHOLDER}` + `HELP_DEFAULTS` po kliknięciu |
| **Przykłady** | jedyne miejsce z twardymi liczbami (np. wyjazd, paliwo) |

---

## Stan obecny (2026-07)

- `calculator`, `engineering`, `graph` → render z JS (`renderCommandHelpDefinitions`)
- `notepad` → **statyczny HTML** w `index.html`, częściowo symboliczny (`{nocleg}`, `@nazwa`)
- Brak sekcji `notepad` w `command-definitions.js`
- Brak `yields` i wspólnej legendy `→` w notatniku

**Świadoma decyzja:** notatnik zostaje w HTML do czasu osobnej iteracji — unikamy mieszania ze ściągą parsera/komend.

---

## Zakres migracji (gdy będzie czas)

1. Dodać `notepad: [...]` do `command-definitions.js` z grupami:
   - Legenda symboli (`@`, `=`, etykiety, linie-notatnik)
   - Składnia linii (`wyrażenie`, `etykieta: wyrażenie`, `@zmienna`)
   - Zmienne i odwołania (`@nazwa` w innej linii)
   - Eksport / share (jeśli dotyczy ściągi)
   - **Przykłady (konkretne liczby)** — wyjazd, paliwo, mnożnik
2. Rozszerzyć `renderCommandHelpDefinitions()` o `'notepad'` (jak pozostałe sekcje)
3. W `index.html` zamienić treść `.help-section[data-help="notepad"]` na placeholder ładowania
4. Uzupełnić `HELP_DEFAULTS` o placeholdery notatnika (`{nocleg}`, `{paliwo}`, `{mnoznik}`…)
5. Dodać `intro` w legendzie: `→` = co pojawi się w wyniku linii / panelu notatnika

---

## Czego NIE mieszać

- Formatowanie inline/linii (`notepad-format.js`, `NOTEPAD-FORMAT-PLAN.md`) — osobny tor
- Silnik eval (`ENGINE-STRATEGY.md`) — osobny tor
- Nie duplikować przykładów wyjazdu w dwóch miejscach po migracji

---

## Kryteria „done"

- [ ] Sekcja `notepad` w `command-definitions.js`
- [ ] Render JS + placeholder w HTML
- [ ] Wszystkie pozycje z `command` mają `yields`
- [ ] Jedna sekcja „Przykłady" z konkretnymi liczbami
- [ ] README zaktualizowany (notepad w liście sekcji)

---

*Autor: Mateusz Zmuda · 2026-07-11*
