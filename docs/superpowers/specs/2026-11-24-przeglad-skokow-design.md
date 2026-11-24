# Przegląd skoków w krokach + lepszy „słaby uczeń” — projekt

Stan: zaakceptowany kierunek (Mateusz 2026-11-24: „ok no to lecimy”, sposób 3), apka v1.05.45.

## Po co
Mateusz na dwóch zrzutach z granicy `lim x→2 (x⁴−13x²+36)/(x³−2x²+x−2)`:
- krok „Rozkładamy na czynniki” podaje gotowe (x − 2)(x³ + 2x² − 9x − 18), choć silnik liczy to schematem Hornera
  (`js/math-limits.js` `factorCancel`), tylko tego nie pokazuje;
- krok „Podstawiamy x = 2” pisze od razu „= −4”, bez wstawionych liczb — „aż się prosiło o podstawienie”.

Oba skoki zgłosił już raport D (2026-11-23, uwagi Z7, Z8) i nikt ich nie naprawił. Mateusz: to poważny błąd,
trzeba sprawdzić cały silnik, a agenta „słaby uczeń” ulepszyć, żeby więcej łapał. Do tego zasada:
gdzie się prosi o **lekką interaktywność**, można ją dodać; osobny etap „interaktywność” później.

Dwie przyczyny: (1) agent dostaje za każdym razem inne polecenie, (2) jego uwagi nie trafiają na listę ze stanem,
więc giną między etapami.

## Podejścia (z rozmowy)
| | Na czym polega | Za | Przeciw |
|---|---|---|---|
| Tylko przegląd | agenci czytają wszystkie kroki, raport | szybko | dziury wracają |
| Tylko bramki | testy na znane wzorce | pilnują na stałe | łapią tylko znane |
| **Przegląd + bramki (wybrane)** | stałe polecenie agenta, tabela uwag ze stanem, każda naprawa z testem-bramką | nic nie ginie, nie wraca | więcej pracy na start |

## Cele
1. **Stałe polecenie agenta** w `docs/superpowers/agents/slaby-uczen.md`. Uczeń: liceum, zna działania na liczbach,
   potęgi, ułamki; NIE zna rzeczy, których krok nie pokazuje. Metoda: dla każdego kroku odtwórz go ołówkiem tylko z
   tego, co widać w poprzednim kroku, tym kroku, zdaniu „dlaczego” i dymku. Spisz, co musiał policzyć w głowie.
   Więcej niż jedno proste działanie (jedno mnożenie, jedno dodawanie, jedno skrócenie) = **skok**.
   Kategorie uwag: skok, fałszywe/niepasujące „dlaczego”, żargon, zapis nieczytelny (długi wzór), **miejsce na
   lekką interaktywność**. Uwaga ma: id zadania, numer kroku, cytat, co brakuje, propozycję (konkretny zapis).
   Uprzedzenie o podwojonych ukośnikach w JSON.
2. **Zrzut wszystkich kroków** do JSON jednym skryptem w repo (`scripts/steps-dump-student.js`, oparty o listę
   zadań z `scripts/steps-check/dump.js`: zestaw granic + ściąga + `EXTRA`), z `why` i dymkiem — bez haseł podręcznika.
3. **Przegląd** całego zrzutu (ok. 210 zadań) agentami podzielonymi na działy (granice; równania/nierówności/układy;
   pochodne/całki; reszta). Do tego stare niezałatwione uwagi o skokach z raportów C, D, E (sprawdzone, czy nadal są).
4. **Jedna tabela uwag** `docs/superpowers/research/skoki-tabela.md`: id, dział, zadanie, krok, kategoria, ważność
   (krytyczna = uczeń nie odtworzy kroku / poważna / drobna / interaktywność), stan (do zrobienia / zrobione vX /
   odrzucone + powód). To jedyne źródło prawdy; przekazania do nowej rozmowy na nią wskazują.
5. **Partia 1 napraw** (w tym projekcie): granice przy x → liczba
   - „Podstawiamy x = a”: wstawione liczby i rachunek, np. `(2³ + 2·2² − 9·2 − 18)/(2² + 1) = (8 + 8 − 18 − 18)/(4 + 1) = −20/5 = −4`;
     dla funkcji (sin, ln, √…) co najmniej zapis z wstawioną liczbą przed wartością;
   - „Rozkładamy na czynniki”: dzielenie licznika i mianownika schematem Hornera pokazane tabelką (pole kroku
     `horner`, rysowane już przez `_stepsHorner` w `app.js`), także przy pierwiastku wielokrotnym;
   - każda z bramką w testach (test najpierw pada).
6. Dalsze partie: osobne cykle z tej samej tabeli (ten projekt ich nie rozpisuje).

## Poza zakresem
- Etap 4 (długie wzory) — po partii 1; Horner i rozpisane podstawienie i tak wydłużą wzory.
- Etap „interaktywność” — osobny projekt, budowany z uwag kategorii „interaktywność” z tabeli. W partii 1 można
  dodać lekką interaktywność tylko, jeśli jest prosta i oczywista (np. tabelka Hornera zwijana) — inaczej do tabeli.
- Nowe sposoby rozwiązania (np. podstawienie t = x² dla x⁴ − 13x² + 36).

## Czego nie wolno
- Krok z rachunkiem, którego nie przepuści SymPy (`npm run check:steps` sprawdza każde „=”).
- Uwaga zamknięta bez testu, który pilnuje, że skok nie wróci (wyjątek: uwaga odrzucona z powodem).
- Rozpisanie, które samo staje się nowym skokiem albo dublem „dlaczego” (bramki `test/step-why.js`).
- Lekka interaktywność, bez której znika coś ważnego (treść musi być widoczna lub wyraźnie oznaczona).

## Testy
- Node (`test/math-limits.js`): każdy krok „Podstawiamy x = a” zawiera wstawioną liczbę a w miejscu zmiennej
  przed wynikiem; każdy krok „Rozkładamy na czynniki” ma tuż przed sobą krok „Dzielimy schematem Hornera” z tabelkami (licznik, mianownik) zgodnymi
  z wynikiem rozkładu; zadanie ze zrzutu daje `(8 + 8 − 18 − 18)/(4 + 1)`.
- e2e: kroki granicy ze zrzutu pokazują tabelki Hornera i mieszczą się na 390 px (przewijanie w swoim pudełku, jak w równaniach).
- `npm run check:steps` po zmianach; potem agent „słaby uczeń” (nowe polecenie) czyta granice z partii 1.

## Rozstrzygnięcia (moje decyzje po przeglądzie projektu — Mateusz może zmienić)
- **Zakres partii 1:** tylko dwie nazwane naprawy + zdanie „dlaczego” przy „Rozkładamy” (żargon „(x − a)”, raport D Z7 —
  ma mówić o konkretnym nawiasie, np. „(x − 2)”, „(x + 1)”). Wszystko inne z przeglądu → tabela, dalsze partie.
- **Kolejność:** przegląd (cele 1–4) i partia 1 idą równolegle — obie naprawy są już znane. Tabela dostaje je od razu
  jako wiersze „zrobione”.
- **Horner w granicy:** osobny krok „Dzielimy schematem Hornera” tuż przed „Rozkładamy na czynniki” (ta sama kolejność
  co w równaniach: najpierw dzielenie, potem iloczyn). Pole `horner` może być obiektem (jak dziś) albo listą tabelek;
  `_stepsHorner` rysuje listę jedna pod drugą z podpisem „licznik” / „mianownik”. Pierwiastek wielokrotny = kolejna
  tabelka (dzielimy wynik jeszcze raz). Równania bez zmian (obiekt nadal działa). Test: każdy „Rozkładamy na czynniki”
  ma tuż przed sobą krok z `horner`, a dzielenia zgadzają się z rozkładem.
- **„Podstawiamy x = a” — wszystkie:** każdy krok tej reguły (także po de l'Hospitalu, po sprzężeniu, granice
  jednostronne) pokazuje wyrażenie z poprzedniego kroku z wstawioną liczbą, potem wartości, potem wynik.
  Wielomiany/ułamki: rachunek jak w przykładzie; funkcje: `sin(2·0)/…` → wartość. Bramka obejmuje wszystkie.
- **Zrzut dla ucznia:** etykieta, zapis, „dlaczego”, dymek wzoru (`FORMULAS[id]` + `formula.here`) i tabelki `horner`
  jako tekst. Bez `data-hint` (to podpowiedzi interfejsu, nie treść kroku).

## Zostawione budowniczemu
- Dokładny zapis podstawienia przy wyrażeniach nie-wielomianowych.
- Podział zadań między agentów.
