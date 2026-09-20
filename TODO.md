# TODO / Do przemyślenia

## AI — wąska, bezpieczna integracja (pomysł na przyszłość)

**Status:** do przemyślenia, NIE priorytet. Rdzeń liczenia zostaje deterministyczny (parser regułowy + testy baseline).

Zakres — tylko jako *fallback*, gdy parser nic nie rozpozna:

- Malutki model intent-classification (np. Hugging Face `transformers.js` pipeline) tłumaczący
  swobodne zdanie użytkownika na ISTNIEJĄCĄ komendę parsera — z podglądem przed wykonaniem.
- Zasady bezpieczeństwa: opt-in w ustawieniach, lazy-load wag (nie blokuje startu PWA),
  działanie w Web Workerze, model nigdy nie liczy sam — tylko mapuje na komendę.
- Alternatywa bez transformers: Web Speech API do dyktowania wyrażeń.

Powody ostrożności: PWA offline-first, start < 1 s, deterministyczne wyniki — duże wagi
(30–300 MB) i niedeterminizm LLM są sprzeczne z główną wartością aplikacji.

## Parser — luki względem Raycast (tryb Standard)

### Naprawione (v0.99.28)

- [x] `sin(30 deg)` — liczy w stopniach (resolveTrigDegrees przed jednostkami)
- [x] `2,5k zł` — expandNumericShorthands przed resolveCalcCurrency
- [x] `19m + 47%` — wynik w jednostce roboczej (pierwsza wpisana), nie w bazie mm

### Naprawione (v0.99.29)

- [x] Trygonometria odwrotna/hiperboliczna: `asin`, `acos`, `atan`, `sinh`, `cosh`, `tanh`, `cot`, `csc`
      (+ warianty stopniowe `sind`, `cosd`, `tand`, `asind`…).
- [x] Shorthand walutowy: `1k usd`, `usd 1k` (+ `2,5k zł` z v0.99.28).
- [x] Dzień tygodnia + offset: `poniedziałek za 3 tygodnie` (`monday in 3 weeks`).
- [x] Procent upływu okresu: `ile % dnia`, `ile % roku minęło` (`day percentage`, `year %`).
- [x] Różnica procentowa między wartościami: `różnica % między 30 a 90`.
- [x] ISO 8601 Zulu: `2026-03-15T14:30:00Z`.
- [x] Czytelny timespan: `145 min` → „2 h 25 min" (tekst w polu wyniku).

### Naprawione (v1.03)

Poprawność (to, czego silnik NIE liczył albo liczył źle):

- [x] Algebra wymiarowa: `5 km * 5 km` → km² (było „25 km"), `10 m / 2 s` → m/s (było ∅),
      `60 km/h * 2 h` → km (było ∅), `6 kg / 2 m^3` → kg/m³. Moduł `js/quantity-algebra.js`.
- [x] Skracanie jednostek: `10 km / 2 km` = 5, nie „5 km". Też dla walut, również
      krzyżowo: `100 usd / 20 eur` = 4,59 (było „18,14 zł").
- [x] BigInt dla potęg: `2^64` = 18 446 744 073 709 551 616 (było …600000, a `2^64 + 1`
      dawało ten sam wynik co `2^64`).
- [x] `(-8)^(1/3)` i `0/0` → „nieokreślone" (było „∞").
- [x] `2 h * 3` = 6 h (czytelny czas liczył się z sumy literałów wejścia, nie z wyniku).
- [x] Sąsiadujące wielkości (`3 h 20 min`) sklejały się jako cyfry (3 + 0,333 → 30,333).
- [x] Wynik zegarowy bez spacji był grupowany jak liczba: `17:00 + 3h` → „2 000".
- [x] Dane: KB/MB/GB/TB = SI (1000), nowe KiB/MiB/GiB/TiB = IEC (1024).

Parytet z Raycastem:

- [x] Zegar 12 h: `5pm`, `3:45pm`, `12am`; `3:45pm + 5` = +5 godzin.
- [x] Strefy miasto→miasto: `5pm ldn in sf`.
- [x] Czas względny: `za 4 godziny`, `time in 4 hours`, `4 hours ago` (+ dopisek „(jutro)").
- [x] Czas roboczy: `55h in workdays`, `workdays/workhours in 2026` (pn–pt × 8 h, bez świąt).
- [x] Angielskie miesiące i kolejność „miesiąc dzień": `25 Dec`, `August 5`, `days until 25 Dec`.
- [x] `August 5 + 5` = +5 dni (goła liczba przy jednoznacznej dacie).
- [x] Angielskie jednostki czasu (`2 hours in minutes`) i polski miejscownik (`w minutach`).
- [x] `145 mins to timespan` / `145 min czytelnie`.
- [x] PPI po angielsku: `2 inches in px at 72 ppi`.

Wygoda pisania:

- [x] Tolerancja wejścia: końcowe `=`, urwany operator, niedomknięty nawias.
- [x] Brak wyniku pokazuje `—` zamiast mylącego `0` + podpowiedź „Nie rozumiem słowa «…»".

### Naprawione (v1.03.5–v1.03.8) — round-trip wyniku

Silnik nie umiał odczytać tego, co sam wypisał, więc po `=` i po kliknięciu w historię
w polu lądował martwy tekst. Zepsute było 6 z 15 rodzajów wyniku:

- [x] `30.1` → `30.1.2026 (piątek)` → ∅ (opisowy nawias z dniem tygodnia)
- [x] `jutro`, `teraz` (data z godziną nie była obsługiwana jako wejście)
- [x] `17:00 + 3h` → `20:00` → ∅ (gołe HH:MM nie liczyło się wcale)
- [x] `czas w Tokio` → `07:05 (Tokio)` → ∅
- [x] `5 km * 5 km` → `25 km²` → ∅ (indeks górny nie jest nazwą jednostki)
- [x] `6 kg / 2 m^3` → `3 kg/m³` → ∅ (jednostka ze slashem spoza tabeli + wąska spacja U+202F)
- [x] `2 in na px przy 96 ppi` → `192 px` → ∅ (px dostał własną oś, NIE długość)
- [x] Historia: klik wstawiał wynik nawet wtedy, gdy się nie da — teraz lewa połowa
      wiersza wraca do DZIAŁANIA, prawa wstawia WYNIK.
- [x] `test/units-oracle.js` sięgał po nieistniejące `MATM0_DATA.CALC_UNIT_DISPLAY`,
      więc mapowanie etykiety na jednostkę cicho nie działało.

Bramka: `test/readback.js` (53 przypadki) + testy e2e historii i podpowiedzi.

### Znane flaky (NIE od zmian silnika)

- [ ] `test/e2e/notepad-caret.spec.js` pada przy PEŁNYM przebiegu e2e — za każdym razem
      inny test i inne urządzenie, z timeoutem 1,5–3 min. W izolacji 18/18 w 33 s.
      Te czasy mogą znaczyć realne zawieszenie pod obciążeniem, nie tylko kapryśny test.

### Audyt luk (2026-09-20, v1.03.3) — sprawdzone na żywym silniku

**Wzorzec systemowy:** silnik rozumie JEDNO sformułowanie, bliski wariant już nie.
Największa dźwignia jakościowa to warstwa synonimów, nie kolejne regexy.

| działa | nie działa (to samo znaczenie) |
|---|---|
| `od 8:00 do 16:30` | `ile godzin od 8:00 do 16:30` |
| `średnia z 2 4 6` | `średnia 2 4 6` |
| `ile dni do 25.12` | `ile tygodni do 25.12`, `ile godzin do 25.12` |
| `19m + 47%` | `20% z 5 km`, `60% z 2 godzin` |
| `250 zł / 4` | `podziel 250 zł na 4`, `250 zł na 4 osoby` |

**Braki zapisu liczb:** `1e3`, `0x1f`, `0b1010`, `5!`, `sqrt` jako znak, `5^2` jako indeks górny, wartość bezwzględna, `1.000,5`.

**Braki agregacji** (`evalAverage` to gotowy szkielet): suma, min, max, mediana, odchylenie.

**Braki dat:** wiek (`ile mam lat ur. 15.03.1990`), `ostatni dzień miesiąca`, kwartał, tydzień roku, `pierwszy poniedziałek marca`.

**Braki finansowe** (Soulver to ma, my mamy już VAT): rata kredytu, procent składany, brutto→netto UoP, odsetki za okres.

**Braki życiowe:** dzielenie rachunku na osoby (+ napiwek), miary kuchenne (łyżka/szklanka → ml), geometria z tekstu (`pole koła r=5`, `pole 3m x 4m`), materiał na powierzchnię.

### Do rozważenia później

- [x] Piksele przy ppi: `2 in na px przy 96 ppi` (T2-7 · 2026-07-07).
- [ ] Krypto (BTC/ETH) — wymaga innego API kursów (NBP/Frankfurter nie mają).
- [ ] Jednostka × TA SAMA jednostka daje bzdurę z etykietą: `5 zł * 2 zł`, `2 h * 3 h`, `8h * 22 dni`.
      Algebra wymiarowa celowo ich NIE przejmuje (s²/zł² byłyby gorsze). Do decyzji:
      pokazywać pusty wynik + „nie rozumiem”, czy zostawić jak jest.
- [ ] Algebra wymiarowa jest wyłączona w notatniku (tryb „pierwsza jednostka wygrywa").
- [ ] Czas roboczy nie zna świąt — założenie jest dopisane do wyniku, ale kalendarz PL by się przydał.
- [ ] Brak: `1e3`, `0x1f`, `5!`, `1.000,5` (kropka jako separator tysięcy).

Przewagi nad Raycast (utrzymać): BigInt na dużych liczbach całkowitych, VAT/brutto/netto,
koszt trasy/paliwa, dwujęzyczny PL/EN parser, notatnik Soulver-like, stałe-funkcje, offline.
