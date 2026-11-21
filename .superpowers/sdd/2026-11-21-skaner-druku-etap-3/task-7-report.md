# Task 7: Aparat na żywo — raport

Commit: `feat(kalkulator): aparat na żywo z ramką` (bez Co-Authored-By, APP_VERSION bez zmian).

## RED / GREEN
- RED: `test/e2e/scanner-camera.spec.js` (8 testów) padał na desktopie 8/8 (brak przycisku „Zrób”). Test jednostkowy blurScore: bez implementacji `blurScore` jest undefined.
- GREEN: kamera desktop+mobile 15 passed / 1 skipped (odczyt z modelem tylko desktop). `node test/formula-image.js` 24 OK. `npm test` 31/31. `npm run test:e2e` całość: 296 passed, 168 skipped, 0 failed (3,8 min). `npm run lint` czysty; `npm run check` ma tylko stare błędy w js/math-limits.js (nic w scanner.js / formula-image.js).

## Blur
`blurScore` = wariancja laplasjanu 3x3 na jasności kopii (dłuższy bok <= 512, średnia z komórek). `BLUR_MIN = 100`.
frac.png ostry: 4167; Gauss sigma=1: 352; sigma=2: 45; sigma=3: 10. Test: ostry > 100, sigma=3 < 100, odstęp > 10x. Test dekoduje PNG sam (zlib + unfilter) i rozmywa separowalnym Gaussem, bez bibliotek.

## Mapowanie cover
`content()` dla źródła `cover:true`: k = max(scena.w / video.w, scena.h / video.h), więc wyświetlany prostokąt wideo jest większy od sceny i wycentrowany (x, y ujemne). Ramka dalej jest w ułamkach wyświetlanego prostokąta (czyli ułamków klatki), więc `cropToImage` bez zmian. Dozwolony zakres ramki to nowe pola `x0,x1,y0,y1` w `content()`: dla contain 0..1, dla cover widoczna scena z PAD ((PAD - x)/w ... (s.w - PAD - x)/w). `clampFrame` i `dragCorner` używają tych granic zamiast 0..1. Domyślna ramka kamery: 80% x 25% sceny, bez reguły „cały obraz”. Po „Zrób” ramka (ułamki) zostaje i ten sam wycinek klatki trafia do odczytu; test sprawdza, że proporcje wycinka równają się proporcjom ramki na ekranie (desktop i mobile, tolerancja 3%).

## Decyzje i odstępstwa
- e2e w osobnym pliku `test/e2e/scanner-camera.spec.js`: Playwright zabrania `launchOptions` w describe, a plik-poziom `test.use` jest czystszy niż nowy projekt. Flagi: fake-ui, fake-device, `--use-file-for-fake-video-capture=<frac.y4m>`.
- `frac.y4m` to 640x360, 1 s, 5 kl./s (1,7 MB), nie 1280x720 2 s (27 MB za duże do repo). Generuje go `render-fixtures.py` (ffmpeg). Odczyt z modelem w teście ustawia ramkę przez `_setFrame` (domyślna 80%x25% nie obejmuje całego wzoru w kadrze).
- Odmowa: test nadpisuje `navigator.mediaDevices.getUserMedia` (NotAllowedError) przez `addInitScript`: deterministyczne, flagi i uprawnienia kontekstu w headless bywają różne. Widok zapasowy < 2 s zmierzony w teście.
- Ścieżki zatrzymane weryfikuje wrapper getUserMedia w `addInitScript` zapisujący strumienie (readyState tracków), bo `srcObject` jest zerowany.
- Za ciemno testowane przez podmianę `getImageData` dla próbki 64x36; rozmazanie przez stub `MATM0_FIMG.blurScore`.
- app.js: ikona otwiera `MATM0_SCANNER.open()` (kamera); `open({source:'file'})` nadal daje stary pusty widok z wyborem pliku.
- Śledzenie strumieni: `camId` unieważnia spóźnione `getUserMedia` (zamknięcie, zmiana trybu, visibilitychange); `stopCamera` wołane przy zamknięciu okna, evencie `close`, resecie, wczytaniu pliku, „Zrób”, hidden.

## Screenshoty (mobile, iPhone 13, fałszywa kamera)
- .superpowers/sdd/2026-11-21-skaner-druku-etap-3/shots/task7-camera-light.png
- .superpowers/sdd/2026-11-21-skaner-druku-etap-3/shots/task7-camera-dark.png

## Uwagi
- Latarka (`torch`) i prawdziwe zachowanie iOS (pamięć, visibilitychange) niesprawdzone na urządzeniu; fałszywa kamera nie ma capabilities.torch.
- Na telefonie w pionie widok cover pokazuje wąski wycinek klatki 16:9; ramka jest ograniczona do widocznej sceny.

## Fix round 1
- Obrót: zdarzenie `resize` wideo aktualizuje wymiary źródła i resetuje ramkę (defaultFrame); ResizeObserver dla cover robi `clampFrame` przed `layout`. Nowy e2e: zmiana viewportu na obrócony, ramka w obrębie sceny, wycinek ma proporcje ramki. Uwaga: fałszywa kamera nie zmienia wymiarów strumienia, więc test pokrywa ścieżkę ResizeObserver, a nie zdarzenie `resize` wideo.
- `frac.y4m`: jedna klatka (`-frames:v 1`), 345 664 B (było 1,7 MB); `*.y4m binary` w .gitattributes.
- `track` `ended`: gdy okno otwarte i tryb podglądu, `startCamera`.
- Czekanie na metadane kończy się też na `emptied` (stopCamera zeruje srcObject).
- Komendy: `npx playwright test test/e2e/scanner-camera.spec.js test/e2e/scanner.spec.js` → 63 passed, 45 skipped; `npm test` → 31/31 PASS.
