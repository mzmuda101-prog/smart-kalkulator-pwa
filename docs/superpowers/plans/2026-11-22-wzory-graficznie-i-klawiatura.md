# Plan: wzory graficznie i klawiatura do wzorów (spec 5.9, 5.12) — do akceptacji Mateusza

Stan: zaakceptowany 2026-11-22 (decyzje niżej); etap 1 wydany w v1.04.95, następny etap 2.

## Cel
1. Wzór (wpisany albo zeskanowany) **widać jak na kartce**: ułamek piętrowy, pierwiastek, potęga u góry, `lim` z `n→∞` pod spodem.
2. Wzór można **poprawić palcem w 2D** na klawiaturze do wzorów, bez pisania `sqrt(…)` i `^(…)`.
3. Później: kroki rozwiązania też graficznie, a użyte wzory szkolne do stuknięcia (5.12).

## Wnioski z filmiku (aplikacja do zdjęć zadań, 22.11)
- Po zdjęciu: karta z wynikiem — wzór narysowany graficznie, **ołówek** do poprawki, pierwszy krok, przycisk „Pokaż etapy”.
- Kadr: podpowiedzi „Upewnij się, że widać cały problem”, „Ustaw ostrość, dopasowując rogi”; po zdjęciu „Anuluj / Rozwiąż”.
- Dwa wzory w ramce → wybrany jeden (u nas od v1.04.94: najbliżej środka).
- Uczciwe „Ups! Nie umiemy jeszcze…” — u nas „Jeszcze tego nie rozwiążę” (już jest).
Bierzemy pomysły na przepływ, nie wygląd tamtej aplikacji.

## Biblioteka: MathLive 0.111.0 (sprawdzone 22.11)
- MIT, bez zależności (od 0.111 bez compute-engine), wydanie 2026-09-30.
- Rozmiar: `mathlive.min.js` 842 KB (226 KB gzip) + czcionki 296 KB (woff2, te same co KaTeX); dźwięki 240 KB — wyłączamy.
- Ma: pole `<math-field>` (edycja 2D), własną klawiaturę ekranową z własnymi układami, `convertLatexToMarkup` (samo rysowanie), LaTeX na wyjściu.
- Kod przejrzany pod kątem sieci: jedyny `fetch` to sprawdzenie adresu własnego skryptu (czcionki/dźwięki obok) — przy plikach u nas wszystko z tej samej domeny. CSP strony (`script-src 'self'`, `style-src 'unsafe-inline'`, `font-src 'self'`) pasuje bez zmian.
- KaTeX 0.19.1 (76 KB gzip) umie tylko rysować — nie bierzemy dwóch bibliotek, MathLive rysuje też sam.
- Ładowanie **leniwe** (dopiero przy pierwszym wzorze), pliki w `js/vendor/mathlive/` z przypiętą wersją, w cache SW → działa offline.

## Jak to ma działać (propozycja)
- **Jedno pole tekstowe zostaje** (komendy po polsku, pieniądze, daty — tam edytor wzorów nie pasuje).
- Gdy w polu jest wzór matematyczny (granica, pochodna, całka, ułamek, pierwiastek), **nad wynikiem pojawia się jego rysunek** (tylko do oglądania).
  Skaner wstawia jak dziś do pola, więc rysunek widać od razu. Bez dubla: rysunek = wygląd tego samego pola.
- **Ołówek przy rysunku** → szuflada z polem 2D (`<math-field>`) i klawiaturą do wzorów → „Gotowe” zapisuje do pola tekstowego.
- Przejścia: zapis pola → LaTeX (nowy `js/expr-to-latex.js`, z drzewa parsera) i LaTeX → zapis pola (istniejący `latexToExpr`).

## Etapy (każdy osobno wydany, z testami)
1. **Rysunek wzoru** — `expr-to-latex.js` + leniwe wczytanie MathLive + rysunek nad wynikiem.
   Test: dla 58 wzorów z `limits-zestaw.json` i przykładów ze ściągi: zapis → LaTeX → `latexToExpr` daje to samo zadanie.
   Pomiar: czas pierwszego rysunku na iPhonie, rozmiar w cache.
2. **Edytor 2D + klawiatura** — szuflada, układ klawiatury po polsku (karty: Podstawowe / Funkcje / Granice i całki:
   `lim`, `∞`, ułamek, `√`, `∛`, potęga, `log`, `sin`…), „Gotowe” → pole tekstowe. Test e2e na telefonie (emulacja + prawdziwy iPhone).
3. **Kroki graficznie + dymki wzorów** (5.12) — kroki rysowane tą samą biblioteką; wzór szkolny podkreślony, stuknięcie → dymek.

## Decyzje Mateusza (2026-11-22)
1. Układ: **rysunek nad wynikiem + ołówek → edytor 2D** (propozycja przyjęta).
2. Klawiatura: **klawiatura wzorów MathLive z naszym układem**; wyglądem docelowo zbliżona do klawiatur
   znanych aplikacji do matematyki (np. ta z filmiku) — przed etapem 2 przejrzeć dostępne układy
   i wybrać najwygodniejszy (może być lepszy niż wzorzec).
3. Kolejność: **najpierw sam rysunek** (etap 1), edytor i klawiatura jako etap 2.

## Pytania do Mateusza (już rozstrzygnięte — zob. wyżej)
1. Układ: rysunek nad wynikiem + ołówek → edytor 2D (propozycja) czy zamiana całego pola na pole wzorów?
2. Klawiatura: klawiatura MathLive z naszym układem (propozycja) czy systemowa + rząd przycisków?
3. Zaczynać od etapu 1 (sam rysunek), czy od razu 1 + 2 razem?

## Etap 1 — jak wyszło (v1.04.95)
- `js/expr-to-latex.js` (drzewo parsera → LaTeX; granice, pochodne, całki, zwykłe wzory z ułamkiem/potęgą/
  pierwiastkiem/funkcją), test `test/expr-to-latex.js`: 58/58 granic z rysunku wraca do tego samego zadania.
- Rysunek: `vendor/mathlive/mathlive-ssr.min.mjs` (sam renderer, 396 KB, 111 KB gzip) + `mathlive-static.css`
  + czcionki; wczytywany leniwie przy pierwszym wzorze, potem z cache SW (offline).
- Miejsce: **po lewej w wierszu wyniku**, nie osobny wiersz nad nim — pozycja absolutna, szerokość = wolne
  miejsce na lewo od wyniku. Pierwsza wersja (zwykły element w wierszu) zabierała szerokość i kod układu
  łamał wynik na dwie linie (`e` / `³`) — złapane testem, poprawione; e2e `formula-drawing.spec.js`
  pilnuje, że układ ekranu i klawiszy jest co do piksela ten sam z rysunkiem i bez.
- Świadome ograniczenia (do etapu 2): bardzo długi wzór, który musiałby spaść poniżej połowy rozmiaru,
  nie jest rysowany (zostaje tekst w polu); tryb „Zdanie” bez rysunku (wynik stoi tam po lewej);
  rysunek `aria-hidden` (ten sam zapis jest w polu, czytnik nie czyta dwa razy).

## Ryzyka
- iPhone: pole 2D i systemowa klawiatura potrafią się gryźć (fokus, przewijanie) — sprawdzić na telefonie w etapie 2.
- 0,5 MB do pobrania przy pierwszym wzorze — mało przy 37 MB modelu skanera, ale offline dopiero po pierwszym użyciu online.
- Rysunek musi pokazywać dokładnie to, co liczy parser (np. `1/2n` = `1/(2n)`?) — rysunek z drzewa parsera, nie z tekstu, więc pokaże prawdziwą kolejność działań (to też pomoc: widać pomyłkę w nawiasach).
