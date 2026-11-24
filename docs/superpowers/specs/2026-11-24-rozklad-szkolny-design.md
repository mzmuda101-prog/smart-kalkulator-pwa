# Rozkład jak w szkole (paczka A sposobów) — projekt

Stan: kierunek zatwierdzony przez Mateusza 2026-11-24 („możemy lecieć ze startem, jak proponujesz”; „domyślnie sposób
najkrótszy, a zaraz obok na drugim miejscu szkolny lub studyjny”). Apka v1.05.55. Katalog: `docs/superpowers/research/sposoby-katalog.md`.

## Po co
Apka rozkłada wielomiany jedną drogą: w granicach 0/0 zawsze schematem Hornera, w `rozłóż` trójmian deltą,
a `rozwiąż x³ − x = 0` w ogóle się nie rozwiązuje. Szkoła rozkłada w ustalonej kolejności i uczeń ma zobaczyć tę drogę.
Horner zostaje, ale jako ostatnia deska ratunku albo osobny sposób w przełączniku.

## Podejścia (moja decyzja — Mateusz mówił o efekcie, nie o budowie)
| | Na czym polega | Za | Przeciw |
|---|---|---|---|
| **Wspólna funkcja rozkładu (wybrane)** | jedna funkcja `schoolFactor` w `js/math-steps.js` (wystawiona w `_core`, jak `hornerHere`), używana przez granice, `rozwiąż`, `rozłóż`, `uprość` | ta sama droga wszędzie, jeden zestaw testów | duża funkcja w już dużym pliku |
| Osobny plik `js/factor-school.js` | to samo w nowym module | czytelniej | nowy plik = wpis w `index.html`, liście service workera i odcisku wersji; ryzyko przy wydaniu |
| Poprawki w każdym miejscu osobno | trzy kopie logiki | szybko na start | rozjazdy, trzy razy testy |

## Cele
1. **`schoolFactor(coefs, v, ctx)`** → `{ steps, factors, used }` albo `null` (gdy nic się nie da). Kolejność prób jak na lekcji:
   1. wyłączenie wspólnego czynnika przed nawias (liczba i potęga zmiennej): `x³ − x = x(x² − 1)`;
   2. wzory skróconego mnożenia czytane wstecz: a² − b² (także `4x² − 9`), (a ± b)², a³ ± b³;
   3. trójmian: suma i iloczyn (Viète), gdy a = 1 i pierwiastki całkowite; w przeciwnym razie delta;
   4. grupowanie przy czterech wyrazach: `x³ − 2x² + x − 2 = x²(x − 2) + (x − 2) = (x − 2)(x² + 1)`;
   5. podstawienie t = x² (i t = x³) przy wielomianie dwukwadratowym: `x⁴ − 13x² + 36 → (x² − 4)(x² − 9) → (x − 2)(x + 2)(x − 3)(x + 3)`;
   6. schemat Hornera (jak dziś), gdy nic wcześniej nie pasuje i jest pierwiastek wymierny.
   Funkcja działa rekurencyjnie: każdy powstały czynnik stopnia ≥ 2 przechodzi przez tę samą listę. `used` mówi, z czego skorzystano (do etykiety sposobu i do testów).
   Każdy krok ma etykietę z czasownikiem, dymek (`formula.id`) i, gdzie się da, `formula.here`.
2. **Granice 0/0 (x → liczba):** sposób „Rozkład na czynniki” idzie drogą szkolną. Gdy szkolna droga nie użyła Hornera,
   a Horner da się zastosować, w przełączniku jest też „Schemat Hornera” (dzisiejsze kroki). De l'Hospital zostaje.
3. **`rozwiąż` wielomian stopnia ≥ 3:** sposób „Rozkład na czynniki” (szkolny) i „Schemat Hornera” (dzisiejszy), gdy się różnią.
   `rozwiąż x³ − x = 0` i `rozwiąż x⁴ − 5x² + 4 = 0` mają rozwiązanie z krokami.
4. **`rozłóż`:** droga szkolna (trójmian przez sumę i iloczyn zamiast delty, gdy pierwiastki są całkowite; wzory skróconego mnożenia
   bez obchodzenia przez pierwiastki). `rozłóż 84` → rozkład na czynniki pierwsze z krokami (funkcja `primeFactors` już jest).
5. **`uprość` ułamka wielomianów:** `uprość (x^2-4)/(x+2)` → rozkład licznika i mianownika, skrócenie, wynik `x − 2` z zastrzeżeniem `x ≠ −2`.
6. **Kolejność w przełączniku:** najpierw najkrótszy sposób (on jest też domyślny — zasada bez zmian), potem szkolny („Rozkład na czynniki”),
   potem pozostałe w kolejności silnika. Dotyczy wszystkich zadań z przełącznikiem.

## Poza zakresem
Paczki B–E z katalogu (nierówności „wężykiem”, Cramer/Gauss, granice aⁿ, trzy ciągi, procenty, NWD Euklidesem, analiza).
Przełącznik „delta / suma i iloczyn” w `rozłóż` (w `rozwiąż` już jest).

## Czego nie wolno
- Zmiana wyniku jakiegokolwiek zadania z zestawu, ściągi i `EXTRA` (porównanie tekstu wyniku przed i po).
- Krok bez „dlaczego” albo „dlaczego” powtarzające dymek; równość, której nie przepuści SymPy.
- Nowy dymek (`formula.id`) bez pełnego hasła w podręczniku (zasady z `docs/superpowers/HANDOFF-podrecznik.md`:
  „skąd wzór”, „skąd nazwa”, spróbuj/oczekiwany wynik, SymPy, „słaby uczeń”).
- Sposób w przełączniku, który daje inny wynik niż pierwszy.

## Testy
- Node: `schoolFactor` na zestawie przypadków (każdy z kroków 1–6, rekurencja, `null`), granice: `lim x→2 (x^2-4)/(x^2-5x+6)` —
  sposoby [de l'Hospital, Rozkład na czynniki, …] z rozkładem przez a² − b² i sumę i iloczyn; ekran ze zrzutu Mateusza
  `lim x→2 (x^4-13x^2+36)/(x^3-2x^2+x-2)` — podstawienie t = x² i grupowanie; `rozwiąż x^3-x=0`, `rozwiąż x^4-5x^2+4=0`,
  `rozłóż x^2-5x+6` (suma i iloczyn), `rozłóż 4x^2-9`, `rozłóż 84`, `uprość (x^2-4)/(x+2)`.
- Bramka: wyniki wszystkich zadań z `scripts/steps-check/queries.js` bez zmian (poza tymi, które dziś dają „Jeszcze tego nie rozwiążę”).
- e2e: kolejność przycisków w przełączniku (najkrótszy pierwszy, potem „Rozkład na czynniki”).
- `npm run check:steps`, „słaby uczeń” na nowych krokach, zrzut z telefonu.

## Rozstrzygnięcia (moje, po przeglądzie projektu)
- **Tekst wyniku się nie zmienia.** Zmieniają się kroki pośrednie, ale końcowy wynik `rozłóż`, `rozwiąż` i granic zostaje
  bajt w bajt (postać i kolejność czynników z dzisiejszego `factorize`: ten sam sort i format na końcowej liście czynników).
  Wyjątek: zadania, które dziś dają „Jeszcze tego nie rozwiążę”.
- **`uprość` ułamka:** dziś brak wyniku, więc nowy wynik ma postać `x − 2 (dla x ≠ −2)`. Zastrzeżenie należy do wyniku,
  bo bez niego równość jest fałszywa w x = −2.
- **Granice:** obie strony rozkładamy w pełni drogą szkolną (tak pisze się w zeszycie), potem skracamy (x − a).
  Jedna reguła `factorCancel` z trybem (`'school'` domyślnie, `'horner'` dla sposobu „Schemat Hornera”), wybieranym
  tak samo jak dziś `_prefer` przy de l'Hospitalu. „Schemat Hornera” trafia do przełącznika tylko wtedy, gdy jego kroki różnią się od szkolnych.

## Zostawione budowniczemu
Dokładne etykiety kroków; czy grupowanie próbować też przy 6 wyrazach (nie wymagane); nazwy nowych haseł podręcznika
(potrzebne co najmniej: grupowanie wyrazów, podstawienie t = x², wyłączanie przed nawias, jeśli nie ma).
