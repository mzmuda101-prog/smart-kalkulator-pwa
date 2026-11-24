# Dymki przy podstawach — każdy krok-przekształcenie z dymkiem (projekt)

Stan: kierunek od Mateusza 2026-11-24 („fajnie by było 100% pokryte i żeby silnik sam pilnował przy nowych krokach”,
„rób dalej”). Apka v1.05.60. Zasady: pamięć `bubbles-full-coverage`, `engine-design-approach`.

## Po co
Pomiar na v1.05.60: 1866 kroków z 471 zadań, 190 rodzajów kroków, z czego 130 rodzajów nigdy nie ma dymku. Przy
każdym przekształceniu uczeń ma mieć co stuknąć, czyli regułę z przykładem i „W tym zadaniu:”. Dotyczy też najprostszych,
szkolnych przekształceń: redukcji wyrazów podobnych, przenoszenia na drugą stronę, skracania, opuszczania nawiasów,
dziedziny, podstawiania i stałej przed całką.

## Podejścia (moja decyzja — Mateusz opisał cel, nie budowę)
| | Na czym polega | Za | Przeciw |
|---|---|---|---|
| **Reguły jako dane + bramka (wybrane)** | jedna tabela `STEP_RULES` (wzorzec etykiety → id hasła) stosowana centralnie do każdego kroku, który nie ma własnego `formula`; test-bramka: każdy krok-przekształcenie ma dymek, wyjątki to jawna, krótka lista kroków-stwierdzeń | nowe kroki są pilnowane automatycznie; jedno miejsce do rozbudowy | etykiety muszą być stabilne (bramka to wyłapie) |
| Dymek dopisywany w każdym silniku przy tworzeniu kroku | silniki same ustawiają `formula` | precyzyjny kolor w miejscu użycia | rozrzucone po kodzie, łatwo zapomnieć; brak automatu |
| Tylko więcej haseł, bez bramki | ręczne dopisywanie | szybko | za pół roku znów 36% |

Silnik może dalej sam ustawić `formula` (z kolorem `⟦…⟧` w miejscu użycia) — to ma pierwszeństwo przed tabelą.

## Cele
1. **`STEP_RULES`** w `js/step-formulas.js` (obok słownika; dane, nie logika) i funkcja `attachRule(step)`, wołana raz
   na końcu `S.run` dla każdego kroku każdego sposobu (granice, równania, analiza, reszta). Ustawia `step.formula = { id }`
   tylko gdy krok go nie ma. `here` z tabeli opcjonalnie (funkcja od kroku), gdy da się wyczytać liczby z zadania.
2. **Lista kroków-stwierdzeń** (bez dymku z założenia): `Wynik`, `Odpowiedź`, `Równanie`, `Wyrażenie`, `Funkcja`, `Całka`,
   `Układ równań`, `Nierówność`, `Działanie`, `Liczba`, `Liczby`, `Wynik w przybliżeniu`, `Granica` bez symbolu nieoznaczonego.
   Lista jest jawna w teście i ma być krótka. Każde dopisanie do niej wymaga uzasadnienia w komentarzu.
3. **Bramka `test/step-coverage.js`**: dla wszystkich zadań z `scripts/steps-check/queries.js` (każdy sposób) każdy krok,
   który nie jest stwierdzeniem, ma `formula.id` istniejące w słowniku. Test wypisuje brakujące rodzaje kroków.
   Wchodzi do `scripts/run-tests.mjs`, więc nowy rodzaj kroku bez dymku nie przejdzie testów.
4. **Nowe hasła**, około 20–25, każde w standardzie podręcznika: „Skąd wzór”, „Skąd nazwa” (tylko fakty), spróbuj/oczekiwany wynik,
   SymPy, „słaby uczeń”. Grupują rodzaje kroków, np. jedno hasło „przenoszenie na drugą stronę” obsłuży
   „Przenoszę liczby na prawo”, „Przenoszę x na lewo…”, „Przenoszę wszystko na lewą stronę”. Lista robocza (do domknięcia
   w planie): wyrazy podobne, przenoszenie na drugą stronę, działanie na obu stronach (dzielenie/mnożenie/zmiana znaku/
   pierwiastkowanie), opuszczanie nawiasów, skracanie (ułamka i przez wspólny czynnik), wyłączanie najwyższej potęgi,
   c/nᵏ → 0, podstawianie liczby, dziedzina (ułamek, pierwiastek, logarytm), iloczyn równy zero, sprawdzenie rozwiązania,
   współczynniki trójmianu, rozkład na czynniki pierwsze, liniowość całki (stała przed całką, całka sumy), liniowość pochodnej,
   pochodna złożona (środek), podstawienie w całce, ułamki proste, układ równań: podstawianie i przeciwne współczynniki (są),
   wartość bezwzględna, równość logarytmów, granica jednostronna. Istniejące hasła używamy, gdzie pasują
   (np. „Liczę pierwiastek z delty” → `delta`, „Składam całość” → `postac-iloczynowa`).
5. **Stuknięcie bez koloru**: krok z dymkiem z tabeli zwykle nie ma fragmentu `⟦…⟧`. Wtedy w wierszu etykiety pojawia się
   mały przycisk z ikoną książki (lucide `book-open`, inline SVG, token koloru akcentu, cel dotyku ≥ 24×24 px, `aria-label`
   „Reguła: <nazwa hasła>”), który otwiera ten sam dymek. Krok z `⟦…⟧` działa jak dziś (bez dodatkowej ikony).
6. **Pokrycie po etapie: 100% kroków-przekształceń** w zestawie `queries.js` (mierzone bramką).

## Poza zakresem
Nowe kolory `⟦…⟧` w miejscu użycia dla starych kroków (można później). Zmiana treści kroków (to robią partie skoków).
Strony-inspiracje (Gauthmath, QuickMath) — przejrzeć przy etapie „interaktywność”.

## Czego nie wolno
- Dymek, który mówi coś innego niż krok (hasło musi pasować do każdej etykiety, którą obsługuje — sprawdza „słaby uczeń”).
- Zdanie „dlaczego” powtarzające dymek (bramka `test/step-why.js` — teraz obejmie więcej kroków).
- Zmiana wyniku jakiegokolwiek zadania (`test/results-unchanged.js`).
- Emoji; kolory spoza tokenów; `:hover` poza `@media (hover: hover)`.

## Testy
`test/step-coverage.js` (100%), `node test/step-popovers.js`, `node test/handbook-data.js`, `node test/step-why.js`,
`npm run check:steps` (prosa haseł), e2e: przycisk z książką otwiera dymek (klawiatura, Esc, czytnik), zrzut 390 px.

## Zostawione budowniczemu
Dokładne wzorce etykiet i podział na hasła; które hasła dostają `here`; kolejność dopisywania haseł (najczęstsze najpierw).
