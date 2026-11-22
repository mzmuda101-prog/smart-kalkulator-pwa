# Przekazanie: skaner i poprawki po teście — stan na 2026-11-22

Dla nowej rozmowy / agenta. Najpierw przeczytaj `AGENTS.md`, `../ZASADY-AGENTOW.md`,
projekt `docs/superpowers/specs/2026-11-21-skaner-i-granice-design.md` (5.5, 5.9, 5.10, 5.11)
i plan `docs/superpowers/plans/2026-11-21-skaner-druku-etap-3.md`.

## Stan
- **Skaner wzorów z druku wydany w v1.04.91** (`main`, Vercel produkcja). Gałąź `feat/skaner-druku`
  scalona fast-forward. Stary katalog roboczy `../smart-kalkulator-pwa-skaner` można usunąć
  (`git worktree remove --force ../smart-kalkulator-pwa-skaner`) — nowa praca na nowej gałęzi z `main`.
- Test Mateusza na iPhonie (22.11, rano): podgląd aparatu wypełnia okno; `lim n→∞ (1−1/n)^n` zeskanowane
  i policzone (1/e, kroki). Kolejność etapów: skaner → klawiatura do wzorów (5.9) → SymPy → pismo → „Sprawdź rozwiązanie”.

## Postęp 22.11 (po południu)
- Zadania 1–3 wydane w v1.04.92.
- Zadanie 4 zrobione (spec §5.10b): pojedyncze zakłócenia zdjęcia przechodzą bramkę 80%;
  dziury: dwa wzory w ramce (18/58), ciasna ramka (42/58), kilka zakłóceń naraz (43–45/58).
  Tłumacz LaTeX odporniejszy na potknięcia modelu (nowe testy w `test/latex-to-expr.js`).
  v1.04.94: wzór najbliżej środka ramki (ramka +30%: 18 → 37/58).
- Zadanie 5: plan `docs/superpowers/plans/2026-11-22-wzory-graficznie-i-klawiatura.md` zaakceptowany;
  etap 1 (rysunek wzoru w wierszu wyniku, MathLive) wydany w v1.04.95. Następne: etap 2 (edytor 2D +
  klawiatura wzorów; przed nim przejrzeć układy klawiatur — Mateusz chce wyglądu jak w znanych apkach).

## ToDo uzgodnione z Mateuszem (w tej kolejności)
1. **Skaner: jeden zły znak nie odrzuca całego wzoru.** Przypadek: wzór (f) `lim ((5n+7)/(5n−8))^n` zdjęty
   z ekranu → model czyta minus jako `\|` (`\frac{5n+7}{5n \| 8}`), tłumacz zwraca błąd → „Nie odczytałem…
   ustaw ramkę ciaśniej” (mylące — ramka była dobra). Zrobić: nieznany znak/komenda w `js/latex-to-expr.js`
   → `?` w zapisie (np. `lim n→∞ ((5n+7)/(5n ? 8))^n`), w oknie skanera komunikat „Odczytałem z niepewnym
   miejscem” + przycisk „Wstaw i popraw” → pole z zaznaczonym `?` (nic do pola bez stuknięcia; reguła spec:
   nigdy śmieci w polu bez zgody). Tłumacz nadal zwraca `error` przy nawiasach/`\begin{array}` itp.
   Wycinek do testu: zrzut z telefonu, ramka na (f); `?debug=1` pokazuje surowy LaTeX.
2. **Kroki granicy `(1 − 1/n)^n`** (`js/math-limits.js`): krok 2 „Dorabiamy jedynkę” pokazuje `1 − 1/n = 1 − 1/n`
   zamiast `1 − 1/n = 1 + 1/(−n)`; krok 3 („Wzór na e”) ucięty — długi zapis nie zawija się w okienku kroków.
   Kroki 4–5 („Granica wykładnika lim −1”, „Wykładnik → −1”) dublują się — rozważyć jeden krok.
3. **„dziś za 3 tygodnie” / „dzis za 3 tygodnie” → „Nie rozumiem”**, a podpowiedź-chip pod „dzis”
   sama dopisuje „za 3 tygodnie”. Obsłużyć jako datę za 3 tygodnie od dziś (oba zapisy, z „ś” i bez);
   sprawdzić, czy inne chipy po „dziś” nie prowadzą do nieobsługiwanych zapisów. Smoke-testy w `app.js`.
4. **Zestaw „udawanych zdjęć”** (bramka etapu ≥ 80%): z 58 wzorów PDF (`test/fixtures-local/`) wersje:
   perspektywa, rozmycie, nierówne światło/cień, ciepłe światło, zdjęcie ekranu (mora), JPEG, ramka za
   ciasna/luźna/z sąsiadem. Narzędzia: `scripts/formula-onnx/prep.js` (kod apki), `run.py`, `score.js`.
   Obecnie (/58): czyste 52, szare 49, lampa 51, ciasna ramka 40 (49/51 to górna granica).
   Wynik do spec 5.10. Później: UniMER-Test jako druga próba.
5. **Klawiatura do wzorów (spec 5.9)** — następny etap; wymaganie od Mateusza: **zeskanowany wzór
   wyświetla się graficznie** (ułamki, pierwiastki, potęgi jak na kartce), nie tylko tekstem.

Mediana: zgłoszenie wyjaśnione — wyniki poprawne (mediana nie zmienia się, gdy rośnie największa liczba).

## Decyzje podjęte w etapie 3 bez pytania (do wglądu Mateusza)
- Testy telefonu tylko przez HTTPS (przez `http` Safari ~14× wolniej).
- Zgoda na pobranie pokazuje prawdziwą sumę 52,9 MB (plan mówił 37 MB — bez silnika).
- Model w cache `matm0-models-v1`, cache-first w SW; przeżywa aktualizację i „Wyczyść cache” (usuwanie w Ustawieniach).
- Worker z modelem kończony 60 s po zamknięciu skanera; limit startu i odczytu 60 s.
- Domyślna ramka: całe zdjęcie, gdy obraz niski lub szeroki (≥ 1,9:1); inaczej pas 80% × 25%.
- Białe tło przed odczytem (zamiast czekać na wynik < 80%); tryb diagnostyczny tylko pod `?debug=1`.
- Negatyw tylko dla ciemnego motywu; wycinek > 50% tuszu może zostać odwrócony (akceptowane).
- Zamiast 30 zdjęć Mateusza — syntetyczny zestaw z PDF (decyzja wspólna).
- Odłożone drobiazgi skanera: `TODO.md` → „Skaner — odłożone drobiazgi”.

## Ograniczenia do pamiętania
- iPhone mierzyć **tylko przez HTTPS**; serwer testowy z COOP/COEP: `npm run dev` (`scripts/dev-server.mjs`).
- Środowisko Pythona do modelu: `~/.venvs/paddle-onnx` (Python 3.12); budowa modelu: `scripts/formula-onnx/README.md`.
- Wersja +1 i `npm run sync-version` przy każdym wydaniu; commity bez dopisków o AI.

## Sposób pracy, który się sprawdził
Projekt → plan (`docs/superpowers/plans/`) → osobna gałąź/worktree → zadanie po zadaniu z recenzją
każdego (subagent-driven) → końcowy przegląd całej gałęzi → test na telefonie → połączenie z main.
