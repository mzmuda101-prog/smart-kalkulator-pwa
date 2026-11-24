# Zacznij tutaj — przekazanie do nowej rozmowy (2026-11-24, v1.05.45)

Poprzednia rozmowa skończyła się, bo kontekst się kurczył. Mateusz robi teraz dłuższą przerwę:
**nie zaczynaj kodu, dopóki on nie napisze, co dalej.** Na start przywitaj się krótko, powiedz, co przeczytałeś,
i zaproponuj następny krok (lista niżej).

## Przeczytaj po kolei
1. `AGENTS.md` i `../ZASADY-AGENTOW.md` (zasady pracy z Mateuszem: prosto, po polsku, git tłumaczyć, bez dopisków o AI w commitach).
2. `docs/superpowers/HANDOFF-kroki.md` — tabela wydań kroków (do v1.05.45), mapa kodu kroków, lista odłożonych rzeczy.
3. `docs/superpowers/HANDOFF-podrecznik.md` — podręcznik (zakładka wiedzy), jak dodać hasło, „słaby uczeń”.
4. Specyfikacje z tej rozmowy w `docs/superpowers/specs/`: `2026-11-23-podrecznik-design.md`,
   `2026-11-23-dymki-design.md`, `2026-11-23-sposoby-design.md` (etapy sposobów).

## Co zrobiono w tej rozmowie (main, wszystko wysłane)
| wersja | co |
|---|---|
| v1.05.30–31 | Podręcznik: zakładka z działami, hasłami, wyszukiwarką, „Spróbuj”, „Powiązane”; „Więcej” z kroków → hasło → „Wróć do kroków”; poprawka pustego ekranu na iPhonie (content-visibility w Safari) |
| v1.05.35 | Dymki we wszystkich typach zadań, linijka „W tym zadaniu:” (`formula.here`), „W podręczniku ›”, Esc |
| v1.05.36 | Hasła: „Skąd wzór” (bottom-up) i „Skąd nazwa” (term-origins); naprawiony filtr bramki SymPy |
| v1.05.40 | Sposoby: domyślnie najkrótszy; 1^∞ — „Wzór skrócony”; ∞/∞ (funkcje x) — de l'Hospital |
| v1.05.45 | Równanie kwadratowe — „Suma i iloczyn” (Viète); wielomiany — schemat Hornera jako tabelka |

## Następny krok (propozycja do Mateusza)
- **Etap 4 sposobów: czytelność długich wzorów** — łamanie „aₙ = …”, za mały wykładnik (zrzut Mateusza z granicą
  ((3n²+4n+1)/(3n²−2n+5))^(4n+3)), długi zapis dzielenia nad tabelką Hornera przy stopniu 5 rozpycha kartę
  (test z `shortcut` w `test/e2e/steps-drawing.spec.js`).
- Potem: sposoby wewnątrz zagnieżdżonych rozwiązań, dopełnienie do kwadratu jako sposób, stare błędy
  z listy „Odłożone” w `HANDOFF-kroki.md`.

## Jak pracowaliśmy (sprawdziło się)
- Skille: `superpowers:brainstorming` → krótki projekt w `docs/superpowers/specs/` → akceptacja → plan → wykonanie
  w osobnej kopii roboczej (`.worktrees/<nazwa>`, symlinki `node_modules` i `scripts/steps-check/.venv`),
  TDD (test najpierw ma paść), na końcu świeży recenzent (subagent), poprawki z testem, wydanie.
- Treść haseł: zasady `deep-explain`/`bottom-up`/`term-origins`, każda równość przez `npm run check:steps`,
  potem agent „słaby uczeń” (pytanie: „czy wiesz, skąd ten wzór się wziął?”). JSON dla niego ma podwojone ukośniki — uprzedź go.
- Wstawianie tekstu z LaTeX do `js/step-formulas.js`: z pliku albo surowymi napisami Pythona (`r'...'`) — inaczej giną ukośniki.
- Wydanie: `APP_VERSION` w `version.js` (+1, etap → okrągła), `npm run test:predeploy` (~6 min), commit, push na main
  (Mateusz pozwolił wysyłać po zielonych testach bez pytania).
