# Smart Kalkulator — instrukcje dla agentów AI

PWA: kalkulator z językiem naturalnym (polski/angielski), jednostkami, pieniędzmi, datami i notatnikiem.
Czysty JavaScript + HTML + CSS, bez frameworka i bez budowania.

## Zanim zaczniesz
- Zapytaj użytkownika o jego ToDo i zestaw je z planem, zanim zaczniesz kodować.
- W tym folderze może równolegle pracować inna sesja lub agent. Najpierw `git status` i `git log -3`.

## Mapa
- `index.html` — wejście i ściąga (sekcje `.help-section`, przykłady `p.help-command[data-command]`).
- `app.js` — główna logika i runnery testów `window.__matm0` (`runCalcSmokeTests`, `runParserSmokeTests`,
  `runProjectionSmokeTests`); `command-definitions.js` — komendy i ściąga inżynierii/wykresów.
- `js/` — moduły (parser `smart-parser.js`, jednostki, pieniądze `money-decimal.js`, notatnik…).
- `version.js` — `APP_VERSION`; `sw.js` — service worker; `test/` — testy Node; `test/e2e/` — Playwright.

## Uruchomienie
- `npm run dev` → http://127.0.0.1:3000

## Testy
- `node test/smoke-node.js` — szybki test prawdziwego kodu bez przeglądarki (0 = OK).
- `npm test` — runner `scripts/run-tests.mjs` (strażnicy wydania idą pierwsi; nie zamieniaj na łańcuch `&&`).
- `npm run test:e2e` — Playwright.
- `npm run check:steps` — SymPy sprawdza każde „=” w krokach (po zmianach w krokach, przed wydaniem;
  pierwsze uruchomienie: `scripts/steps-check/README.md`).
- Każdą nową/rozbudowaną komendę: dopisz smoke-testy do runnerów w `app.js` (`{expr, value/unit/tol}`
  z komentarzem), wepnij w podpowiedzi i przykłady, i zaktualizuj ściągę — każdy przykład ze ściągi
  musi naprawdę dawać obiecany wynik.
- Zmiana domyślnego ustawienia = jednorazowa migracja ze znacznikiem (wzór: `test/settings-migration.js`).

## Wydanie
- Podbij `APP_VERSION` w `version.js` (+1, większy etap → okrągła …0/…5), potem **zawsze**
  `npm run sync-version` (inaczej telefony nie dostaną „Odśwież”). `npm run test:predeploy` = sync + testy.
- Przed podaniem tekstu commita sprawdź `git log -3` — jeśli ten numer już poszedł, podbij wersję.
- Commit: `typ(kalkulator): krótki tytuł po polsku (vX.YY.ZZ)`, potem punkty „- …”.

## Zasady UI (skrót; pełne: `../.claude/rules/`)
- `maximum-scale` w viewport jest celowe — nie zgłaszaj tego jako błędu dostępności.
- Każde `:hover` w `@media (hover: hover)`; podpowiedzi przez `data-hint` (`js/cursor-hint.js`).
- Rysunek na canvasie ma być wierny sam w sobie (realna symulacja, nie ozdobnik).
- Bez emoji w UI, kodzie i commitach.

## Sprawdzanie kodu
- `npm run check` — TypeScript sprawdza pliki z `// @ts-check` na górze (bez zmiany budowania).
  Nowe pliki zaczynaj od `// @ts-check`.
- `npm run lint` — Biome, tylko reguły na prawdziwe błędy.
