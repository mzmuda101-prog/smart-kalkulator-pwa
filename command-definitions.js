(function() {
    'use strict';

    /*
       This file documents commands for the help drawer only.
       The parser in app.js stays authoritative: it still accepts many more aliases
       than are listed here (np. widok=/fov= dla kamery, kolo= dla okręgu, kątXY=,
       hfov=, wys=, tilt= …). Ściąga celowo pokazuje JEDNĄ kanoniczną nazwę po polsku
       i jedną po angielsku na każdy koncept — reszta synonimów działa, ale nie zaśmieca
       ściągi. Keep this file human-editable.

       WZORZEC (jak w zaawansowanych kalkulatorach — HP 48G, TI-Nspire):
       - syntax = zapis symboliczny (x=L/N, punkt=x;y) — to widzi user
       - command = szablon z {PLACEHOLDER} — po kliknięciu wstawiane są HELP_DEFAULTS
       - yields = co kalkulator policzy (wzór lub typ wyniku) — wyświetlane jako → …
       - sekcja „Przykłady" na końcu = jedyne miejsce z konkretnymi liczbami
    */

    var RESERVED = { PIPE: 1, SERIES: 1, MODE: 1 };

    window.HELP_DEFAULTS = {
        /* engineering */
        L: 120, Ly: 200, N: 4, Ny: 5,
        S: 20, S1: 20, S2: 30,
        A0: 0, Af: 120,
        A: 10, B: 20,
        O: 50, P: 8, D: 30, T: 'otwory',
        L2: 120, N2: 6,
        /* graph — współrzędne i wymiary */
        Xp: 150, Yp: 200, Xc: 10, Yc: 8, Xd: '-1,5', Yd: 10,
        W: 400, H: 300, R: 100,
        Ns: 6, dx: 100, dy: 100,
        Ox: 50, Oy: 50,
        K: 110, V: 55, Zr: 15, Hz: 4,
        Az: 135, Kd: 90, Tlt: 30,
        F: 50, Mw: 36, Mh: 24,
        D1: 5, D2: 10, D3: 15,
        a: 3, b: 4,
        /* notatnik — przykłady klikalne */
        stawka: 50, nocleg: 3, cena: 180,
        paliwo: '5,60', km: 100, mnoznik: 2.5,
        /* kalkulator Standard */
        Ca: 5, Cb: 3, Cc: 2, pow: 10, sqrtN: 144, deg: 30,
        pct: 20, base: 150, pctAdd: 10, addBase: 150, pctOf: 6,
        pctOff: 20, offBase: 150, pctMarkup: 15, markupBase: 200,
        pctTip: 15, tipBase: 42,
        partA: 25, partB: 200, diffA: 30, diffB: 90,
        fracPct: '8,5', partVal: 20, targetPct: 100, halfPct: 50,
        partCur: 80, net: 1000, gross: 1230, vatCustom: 8, grossRm: 1560,
        lenVal: 120, lenUnit: 'cm', mixA: 5, mixB: 200,
        kgA: 2, gB: 300, timeMin: 90, tempC: 20,
        distKm: 300, fuel: 7, fuelPrice: '6,50',
        plnAmt: 12, eurAmt: 20, usdAmt: 50,
        offsetDays: 2, offsetWeeks: 3, offsetHours: 20, offsetDur: 3,
        qtyK: 10, multK: 4.5,
    };

    window.fillHelpDefaults = function(s) {
        if (!s || s.indexOf('{') === -1) return s;
        return s.replace(/\{([A-Za-z0-9_]+)\}/g, function(_, key) {
            if (RESERVED[key]) return '{' + key + '}';
            var val = window.HELP_DEFAULTS[key];
            return val !== undefined ? String(val) : '{' + key + '}';
        });
    };

    window.MATM0_COMMAND_DEFINITIONS = {
        calculator: [
            {
                langNote: 'Każda komenda: <strong>PL</strong> · <strong>EN</strong>. <code>→</code> pokazuje, <strong>co kalkulator policzy</strong> (wzór lub typ wyniku). Klik wstawia wersję PL.',
            },
            {
                title: 'Legenda symboli',
                items: [
                    { syntax: 'a, b, c — operandy', description: 'dowolne liczby w działaniu.' },
                    { syntax: 'P — procent (%)', description: 'wartość procentowa (np. 20% z bazy B).' },
                    { syntax: 'B — baza', description: 'kwota lub wielkość, od której liczysz procent.' },
                    { syntax: 'n — wykładnik', description: 'potęga: a^n.' },
                    { syntax: 'N — pod pierwiastkiem', description: 'sqrt(N), pierwiastek z N.' },
                ],
            },
            {
                title: 'Podstawy',
                items: [
                    { syntax: '(a+b)*c', command: '({Ca}+{Cb})*{Cc}', yields: '(a+b)×c', description: 'nawiasy, kolejność działań' },
                    { syntax: 'a^n', command: '2^{pow}', yields: 'aⁿ', description: 'potęgowanie' },
                    { syntax: 'a do potęgi n', syntaxAlt: 'a to the power n', command: '2 do potegi {pow}', yields: 'aⁿ', description: 'potęga słownie' },
                    { syntax: 'sqrt(N)', command: 'sqrt({sqrtN})', yields: '√N', description: 'pierwiastek kwadratowy' },
                    { syntax: 'pierwiastek z N', syntaxAlt: 'square root of N', command: 'pierwiastek z {sqrtN}', yields: '√N', description: 'pierwiastek słownie' },
                    { syntax: 'sin(pi/4)', command: 'sin(pi/4)', yields: 'sin(kąt w rad)', description: 'trygonometria — radiany' },
                    { syntax: 'sin(P deg)', syntaxAlt: 'sin(P°)', command: 'sin({deg} deg)', yields: 'sin(P°)', description: 'kąt w stopniach w nawiasie' },
                    { syntax: 'sind(P)', syntaxAlt: ['cosd(60)'], command: 'sind({deg})', yields: 'sin(P°)', description: 'warianty stopniowe (tand, asind…)' },
                    { syntax: 'asin(x)', syntaxAlt: ['acos(0)', 'atan(1)'], command: 'asin(0.5)', yields: 'kąt z sin/cos/tan', description: 'odwrotna trygonometria' },
                    { syntax: 'sinh(1)', syntaxAlt: ['cosh(0)', 'tanh(1)', 'cot(45)', 'csc(90)'], command: 'sinh(1)', yields: 'funkcja hiperboliczna / cot / csc', description: 'rozszerzona trygonometria' },
                ],
            },
            {
                title: 'Procenty',
                intro: 'Cztery kierunki: <strong>% z kwoty</strong> (<code>P% z B</code>), <strong>% z %</strong> (<code>P% z Q%</code>), <strong>jaki % to A z B</strong> (<code>ile % stanowi…</code>), <strong>znasz ułamek → szukasz reszty</strong> (<code>P% to A, ile 100%</code>). Szukaj linii <code>→</code> — tam widać typ wyniku.',
                items: [
                    { syntax: 'P% z B', syntaxAlt: 'P% of B', command: '{pct}% z {base}', yields: 'P% × B', description: 'też słowo: procent' },
                    { syntax: 'P% z Q%', syntaxAlt: 'P% of Q%', command: '{pct}% z {pctOf}%', yields: 'P% × Q% ÷ 100', description: 'procent z procenta (składany %)' },
                    { syntax: 'B + P%', command: '{addBase} + {pctAdd}%', yields: 'B + (P% × B)', description: 'dolicza procent do bazy' },
                    { syntax: 'a*b + P%', command: '3*160 + 12%', yields: 'wynik działania + (P% × wynik)', description: 'procent od całego wyrażenia' },
                    { syntax: 'P% rabatu na B', syntaxAlt: 'P% off B', command: '{pctOff}% rabatu na {offBase}', yields: 'B − (P% × B)', description: 'cena po rabacie' },
                    { syntax: 'P% narzutu na B', syntaxAlt: 'P% markup on B', command: '{pctMarkup}% narzutu na {markupBase}', yields: 'B + (P% × B)', description: 'cena po narzucie' },
                    { syntax: 'dodaj P% do B', syntaxAlt: 'add P% to B', command: 'dodaj {pctMarkup}% do {markupBase}', yields: 'B + (P% × B)', description: 'to samo, słownie' },
                    { syntax: 'P% napiwek na B', syntaxAlt: 'P% tip on B', command: '{pctTip}% napiwek na {tipBase}', yields: 'B + (P% × B)', description: 'rachunek z napiwkiem' },
                    { syntax: 'ile % stanowi A z B', syntaxAlt: 'what percent is A of B', command: 'ile % stanowi {partA} z {partB}', yields: 'A ÷ B × 100%', description: 'jaki procent A stanowi z B' },
                    { syntax: 'A z B to ile %', syntaxAlt: 'A of B is what percent', command: '{partA} z {partB} to ile %', yields: 'A ÷ B × 100%', description: 'to samo, inna kolejność słów' },
                    { syntax: 'A z B ile to %', syntaxAlt: 'A of B is what percent', command: '5,99 z 9,99 ile to procent', yields: 'A ÷ B × 100%', description: 'alias: „ile to procent" zamiast „ile procent"' },
                    { syntax: 'różnica % między A a B', syntaxAlt: 'percent difference between A and B', command: 'różnica % między {diffA} a {diffB}', yields: '|B−A| ÷ min(A,B) × 100%', description: 'wzrost lub spadek w %' },
                    { syntax: 'z A na B to ile %', syntaxAlt: 'from A to B is what percent', command: 'z 8 na 5 to ile %', yields: '(B−A) ÷ A × 100%', description: 'zmiana względem punktu startowego' },
                    { syntax: 'ile % dnia', syntaxAlt: 'day percentage', command: 'ile % dnia', yields: '% doby, która już minęła', description: 'zależy od aktualnej godziny' },
                    { syntax: 'ile % roku minęło', syntaxAlt: 'year percentage', command: 'ile % roku minęło', yields: '% roku kalendarzowego do teraz', description: 'od 1 stycznia' },
                    { prose: '<strong>Znasz tylko ułamek</strong> (np. P% = A) — szukasz <em>całości</em> albo <em>innego procentu</em> tej samej bazy:' },
                    { syntax: 'P%=A', syntaxAlt: 'P%=A', command: '{fracPct}%={partVal}', yields: '100% = A ÷ P × 100', description: 'skrót; bez celu = całość (100%)' },
                    { syntax: 'A to P%', syntaxAlt: 'A is P%', command: '{partVal}pln to {fracPct}%', yields: '100% = A ÷ P × 100', description: 'A jest P% czegoś — liczy całość' },
                    { syntax: 'P% to A, ile 100%', syntaxAlt: 'A is P% of what', command: '{fracPct}% to {partVal}, ile 100%', yields: '100% = A ÷ P × 100', description: 'to samo, słownie (PL)' },
                    { syntax: 'A to P% z czego', syntaxAlt: 'A is P% of what', command: '{partVal} to {fracPct}% z czego', yields: '100% = A ÷ P × 100', description: 'odwrotna kolejność słów (PL)' },
                    { syntax: 'P% to A, ile T%', syntaxAlt: 'what is T% if P% is A', command: '{fracPct}% to {partVal}, ile {halfPct}%', yields: 'T% = A ÷ P × T', description: 'dowolny cel procentowy (np. połowa)' },
                    { syntax: 'P%=A;T%', syntaxAlt: 'P%=A;T%', command: '{fracPct}%={partVal};{halfPct}%', yields: 'T% = A ÷ P × T', description: 'skrót z celem po średniku' },
                    { syntax: 'P% to A waluta', syntaxAlt: 'A currency is P% of what', command: '{fracPct}% to {partCur}pln', yields: '100% w walucie = A ÷ P × 100', description: 'z zaokrągleniem do 2 miejsc' },
                ],
            },
            {
                title: 'Finanse — VAT (domyślnie 23%, własna stawka z % na końcu)',
                items: [
                    { syntax: 'brutto B', syntaxAlt: 'gross B', command: 'brutto {net}', yields: 'B × 1,23 (netto → brutto)', description: 'B = kwota netto' },
                    { syntax: 'netto B', syntaxAlt: 'net B', command: 'netto {gross}', yields: 'B ÷ 1,23 (brutto → netto)', description: 'B = kwota brutto' },
                    { syntax: 'brutto B P%', syntaxAlt: 'gross B P%', command: 'brutto {net} {vatCustom}%', yields: 'B × (1 + P/100)', description: 'własna stawka VAT' },
                    { syntax: 'netto B P%', syntaxAlt: 'net B P%', command: 'netto {gross} {vatCustom}%', yields: 'B ÷ (1 + P/100)', description: 'brutto → netto przy stawce P' },
                    { syntax: 'B - vat', syntaxAlt: 'B - tax', command: '{grossRm} - vat', yields: 'B ÷ 1,23', description: 'usuń VAT 23% z brutta' },
                    { syntax: 'B + vat', syntaxAlt: 'B + tax', command: '{net} + vat', yields: 'B × 1,23', description: 'dodaj VAT 23% do netta' },
                    { syntax: 'B - vat P%', syntaxAlt: 'B - tax P%', command: '{grossRm} - vat {vatCustom}%', yields: 'B ÷ (1 + P/100)', description: 'usuń VAT o stawce P' },
                    { syntax: 'vat od B', syntaxAlt: 'tax on B', command: 'vat od {net}', yields: 'B × 0,23 (sama kwota VAT)', description: 'tylko podatek, nie brutto' },
                    { syntax: 'vat P% od B', syntaxAlt: 'tax P% on B', command: 'vat {vatCustom}% od {net}', yields: 'B × P/100', description: 'kwota VAT przy stawce P' },
                    { prose: '„minus VAT" to <strong>÷1,23</strong> (nie −23%) — bo VAT liczy się od netta. Samo słowo <code>vat</code> (bez <code>+</code>/<code>−</code> albo „od") nic nie policzy.' },
                ],
            },
            {
                title: 'Moje Stałe — własne nazwy (zakładka 📊)',
                items: [
                    { prose: 'Definiujesz w <strong>📊 Moje Stałe</strong>, potem używasz nazwą wprost w działaniu (działają polskie znaki, np. <code>kwartał</code>).' },
                    { syntax: 'k × NAZWA', command: '10 * DESKA', yields: 'k × wartość_stałej', description: 'podstawia zapisaną wartość (liczbę, % lub wyrażenie)' },
                    { prose: '<strong>Z jednostką:</strong> <code>cena</code> = <code>4,80 zł</code> → <code>cena * 12</code> = 57,6 zł (jednostka zostaje); <code>dł</code> = <code>120 cm</code> → <code>dł na m</code> = 1,2 m.' },
                    { prose: '<strong>Własna jednostka:</strong> dodaj samą <code>j.m.</code> bez wartości (np. <code>os.</code>) — potem jedzie z liczbą i sumuje się z samą sobą: <code>3 os. + 2 os.</code> = 5 os.' },
                    { prose: '<strong>Bezwymiarowa vs wymiarowa</strong> (checkbox przy dodawaniu): bezwymiarowa nie kłóci się z walutą — wygrywa „realna" jednostka: <code>3 os. × 180 zł</code> = 540 zł. Wymiarowa blokuje mieszanie (jak <code>kg</code> + <code>zł</code>).' },
                    { prose: '<strong>Operacja</strong> — wartość zaczyna się od operatora (<code>× ÷ * / + ^</code>): <code>marża</code> = <code>×5+2</code> → <code>100 marża</code> = 502.' },
                    { prose: '<strong>Funkcja</strong> — gdy wartość stałej zawiera <code>x</code>, stała staje się wzorem. <code>stała(k)</code> w nawiasach (najpewniejsze); <code>stała k</code> lub <code>k stała</code> krótko. Operand z obu stron (<code>5 stała 3</code>) celowo nie liczy — użyj nawiasów.' },
                ],
            },
            {
                title: 'Jednostki — konwersja',
                items: [
                    { prose: 'Konwersja: <code>na</code> / <code>do</code> / <code>in</code> / <code>to</code> — np. <code>a jedn. na jedn.</code>' },
                    { syntax: 'L jedn. na jedn.', syntaxAlt: 'L unit to unit', command: '{lenVal}{lenUnit} na mm', yields: 'L w docelowej jednostce', description: 'np. cm → mm' },
                    { syntax: 'a jedn. + b jedn.', command: '{mixA}m + {mixB}cm', yields: 'suma w jednostce roboczej', description: 'pierwsza wpisana jednostka wygrywa' },
                    { syntax: 'a ft + b in na cm', syntaxAlt: 'a ft + b in to cm', command: '10ft + 6in na cm', yields: 'suma w cm', description: 'stopy + cale → centymetry' },
                ],
            },
            {
                title: 'Jednostki — przykłady',
                items: [
                    { syntax: 'L in na px przy PPI', syntaxAlt: 'L cal na px @ DPI', command: '2 in na px przy 96 ppi', yields: 'L × PPI pikseli', description: 'ekran lub druk' },
                    { syntax: 'a kg + b g', command: '{kgA} kg + {gB} g', yields: 'suma w kg (lub pierwszej jedn.)', description: 'mieszanie mas' },
                    { syntax: 'L stóp na m', syntaxAlt: '1 stopa', command: '5 stóp na m', yields: 'L w metrach + odmiana PL', description: 'symbole kg/km bez odmiany' },
                    { syntax: 'L m + P%', command: '19m + 47%', yields: 'L + (P% × L) w m', description: 'procent od bazy w tej samej jednostce' },
                    { syntax: 'T min na h', syntaxAlt: 'T min to h', command: '{timeMin} min na h', yields: 'T w godzinach (ułamek)', description: 'jawna konwersja' },
                    { syntax: 'T min', command: '145 min', yields: 'format czytelny (np. 2 h 25 min)', description: 'auto-dobór jednostek czasu' },
                    { syntax: 'T h', syntaxAlt: 'T godz', command: '1000h', yields: 'format czytelny (np. 41 dni 16 h)', description: 'auto-dobór dni + godzin' },
                    { syntax: 'T min na s', syntaxAlt: 'T min to s', command: '800min na s', yields: 'T × 60 sekund', description: 'surowa konwersja, nie format czytelny' },
                    { syntax: 'a h + b min', command: '2 h + 30 min', yields: 'suma w formacie czytelnym', description: 'np. 2 h 30 min' },
                    { syntax: 'T C na F', syntaxAlt: 'T C to F', command: '{tempC} C na F', yields: 'T°F = T°C × 9/5 + 32', description: 'temperatura' },
                    { syntax: 'a GB na MB', syntaxAlt: 'a GB to MB', command: '2 GB na MB', yields: 'a × 1024 MB', description: 'dane binarnie' },
                    { syntax: 'V km/h na m/s', syntaxAlt: 'V km/h to m/s', command: '100 km/h na m/s', yields: 'V ÷ 3,6 m/s', description: 'prędkość' },
                ],
            },
            {
                title: 'Skróty liczbowe i ułamki',
                items: [
                    { syntax: 'aK', syntaxAlt: 'ak', command: '{qtyK}K * {multK}', yields: 'a × 1000 × mnożnik', description: 'K = tysiąc' },
                    { syntax: 'a tys', syntaxAlt: 'a k', command: '2.5 tys * 12', yields: 'a × 1000 × mnożnik', description: 'tysiące słownie' },
                    { syntax: 'a k waluta', syntaxAlt: ['1k usd', 'usd 1k'], command: '2,5k zł', yields: 'a × 1000 w walucie', description: 'k + waluta, oba kierunki' },
                    { syntax: 'a mln', syntaxAlt: 'a million', command: '1.5 mln / 12', yields: 'a × 1 000 000 ÷ dzielnik', description: 'miliony' },
                    { syntax: 'połowa B', syntaxAlt: 'half of B', command: 'połowa 300', yields: 'B ÷ 2', description: 'połowa bazy' },
                    { syntax: 'trzecia B', syntaxAlt: 'a third of B', command: 'trzecia 120', yields: 'B ÷ 3', description: 'jedna trzecia' },
                    { syntax: 'proporcja a do b', syntaxAlt: 'ratio of a to b', command: 'proporcja 3 do 5', yields: 'a ÷ b', description: 'stosunek a:b' },
                    { syntax: 'średnia z a b c', syntaxAlt: 'average of a b c', command: 'średnia z 10 15 20 35 40', yields: '(a+b+c+…) ÷ n', description: 'średnia arytmetyczna listy liczb' },
                ],
            },
            {
                title: 'Duże liczby całkowite',
                items: [
                    { prose: 'Dodawanie, odejmowanie i mnożenie liczb całkowitych liczy się <strong>dokładnie</strong>, bez zaokrąglania — nawet bardzo długie.' },
                    { syntax: '99999999999999999 + 1', command: '99999999999999999+1', yields: 'dokładna suma (bez zaokrągleń)', description: 'precyzja całkowita' },
                    { syntax: '123456789012345678 × 1000', command: '123456789012345678*1000', yields: 'dokładny iloczyn', description: 'precyzja całkowita' },
                ],
            },
            {
                title: 'Poprzedni wynik',
                items: [
                    { prose: 'Po <code>=</code> wynik wraca do pola — licz dalej.' },
                    { syntax: 'ans * k', syntaxAlt: 'wynik * k', command: 'ans * 2', yields: 'ostatni_wynik × k', description: 'ans = poprzedni wynik z pola' },
                ],
            },
            {
                title: 'Daty i czas',
                items: [
                    { syntax: 'teraz', syntaxAlt: ['now', 'czas', 'time'], command: 'teraz', yields: 'data + godzina + dzień tygodnia', description: 'bieżący moment' },
                    { syntax: 'dziś', syntaxAlt: 'today', command: 'dziś', yields: 'dzisiejsza data', description: 'kotwica od północy' },
                    { syntax: 'dziś + T h', syntaxAlt: 'today + T h', command: 'dziś + {offsetHours}h', yields: 'data po przesunięciu (pokazuje dzień)', description: 'liczy od bieżącej godziny' },
                    { syntax: 'teraz - N dni', syntaxAlt: 'now - N days', command: 'teraz - {offsetDays} dni', yields: 'moment ± offset', description: 'też: h, godz, min' },
                    { syntax: 'za N tygodni', syntaxAlt: 'in N weeks', command: 'za {offsetWeeks} tygodnie', yields: 'data za N tygodni od dziś', description: 'przyszłość względna' },
                    { syntax: 'N dni temu', syntaxAlt: 'N days ago', command: '{offsetDays} dni temu', yields: 'data sprzed N dni', description: 'przeszłość względna' },
                    { syntax: 'ile dni do data', syntaxAlt: 'how many days until date', command: 'ile dni do 1.09', yields: 'liczba dni do podanej daty', description: 'odliczanie' },
                    { syntax: 'dziś + N dni', syntaxAlt: 'today + N days', command: 'dziś + 90 dni', yields: 'data za N dni', description: 'przesunięcie daty' },
                    { syntax: 'ile dni od … do …', syntaxAlt: 'how many days from … to …', command: 'ile dni od 1.01.2026 do 1.02.2026', yields: 'różnica w dniach kalendarzowych', description: 'między dwiema datami' },
                    { syntax: 'GG:MM + T h', command: '17:00 + {offsetDur}h', yields: 'godzina po dodaniu czasu', description: 'zegar + trwanie' },
                    { syntax: 'od GG:MM do GG:MM', syntaxAlt: 'from HH:MM to HH:MM', command: 'od 9:30 do 17:15', yields: 'czas trwania / różnica', description: 'między godzinami' },
                    { syntax: 'najbliższy dzień', syntaxAlt: 'next weekday', command: 'najbliższy poniedziałek', yields: 'data najbliższego dnia tygodnia', description: 'np. poniedziałek' },
                    { syntax: 'dzień za N tygodni', syntaxAlt: 'weekday in N weeks', command: 'poniedziałek za {offsetWeeks} tygodnie', yields: 'data: dzień + offset', description: 'dzień tygodnia w przyszłości' },
                    { syntax: 'ISO 8601', command: '2026-03-15T14:30:00Z', yields: 'data lokalna z UTC', description: 'format ISO' },
                    { syntax: 'który dzień tygodnia data', syntaxAlt: 'what day is date', command: 'który dzień tygodnia 25.12.2026', yields: 'nazwa dnia tygodnia', description: 'dla podanej daty' },
                    { syntax: 'czas w MIEŚCIE', syntaxAlt: ['time in CITY', 'teraz NYC', 'teraz w Tokio'], command: 'time in Kyoto', yields: 'aktualna godzina w strefie miasta', description: 'Raycast-style' },
                    { syntax: 'GG:MM w A na B', syntaxAlt: 'HH:MM in A to B', command: '17:00 w Londynie na Tokio', yields: 'ta sama chwila w innej strefie', description: 'konwersja stref czasowych' },
                    { syntax: 'która godzina w MIEŚCIE', syntaxAlt: 'what time in CITY', command: 'która godzina w Tokio', yields: 'aktualna godzina w strefie miasta', description: 'synonim czas w… / time in…' },
                    { prose: 'Tokeny względne: <code>jutro</code>/<code>tomorrow</code>, <code>wczoraj</code>/<code>yesterday</code>' },
                ],
            },
            {
                title: 'Koszt trasy / paliwo ⛽',
                items: [
                    { prose: 'Potrzebne trzy liczby: <strong>dystans (km)</strong>, <strong>spalanie (l/100)</strong>, <strong>cena (zł/l)</strong> — kolejność i słowa dowolne.' },
                    { syntax: 'koszt trasy D km S l/100km C zł/l', command: 'koszt trasy {distKm} km {fuel} l/100km {fuelPrice} zł/l', yields: 'D × S/100 × C zł', description: 'koszt paliwa na trasie' },
                    { syntax: 'paliwo na D km przy S l/100 i C zł/l', syntaxAlt: 'fuel for D km at S l/100 and C zł/l', command: 'paliwo na 420 km przy 6 l/100 i 6,29 zł/l', yields: 'D × S/100 × C zł', description: 'to samo — słowa PL/EN opcjonalne' },
                ],
            },
            {
                title: 'Waluty (NBP + Frankfurter)',
                items: [
                    { prose: 'Wymaga internetu przy pierwszym użyciu; potem offline z cache. Walutę możesz też podać w <strong>bazie procentowej</strong> (<code>P% to A zł</code>).' },
                    { syntax: 'a zł + b eur', command: '{plnAmt} zł + {eurAmt} eur', yields: 'suma w walucie domyślnej kalkulatora', description: 'przelicza eur → zł' },
                    { syntax: 'b eur na zł', syntaxAlt: 'b eur to PLN', command: '{eurAmt} eur na zł', yields: 'b × kurs eur→zł', description: 'konwersja waluty' },
                    { syntax: 'b usd na eur', syntaxAlt: 'b usd to eur', command: '{usdAmt} usd na eur', yields: 'b × kurs usd→eur', description: 'między walutami' },
                ],
            },
        ],
        engineering: [
            {
                title: 'Legenda symboli',
                intro: '<code>→</code> przy komendzie = co zobaczysz po uruchomieniu (punkty na osi, wymiary, serie).',
                items: [
                    { syntax: 'L — długość pola', description: 'np. belka, oś, zakres do podziału.' },
                    { syntax: 'N — liczba punktów', description: 'ile punktów (otworów, słupów, podziałów).' },
                    { syntax: 'S — odstęp (co=)', description: 'stały krok między punktami; parser sam liczy N.' },
                    { syntax: 'A / B — marginesy', description: 'A = od początku, B = od końca pola.' },
                    { syntax: 'Z — origin (początek osi)', description: 'przesunięcie punktu zerowego. (EN: offset)' },
                    { syntax: 'D — przesunięcie serii', description: 'odsuwa całą serię na drugiej osi (x=D lub y=D).' },
                    { syntax: 'P — promień punktu', description: 'rozmiar kółka rysowanego na wykresie (r=P).' },
                    { syntax: 'T — opis serii', description: 'podpis na legendzie (opis=T, EN: label=T).' },
                ],
            },
            {
                title: 'Jak budować komendy — separatory',
                items: [
                    { syntax: ',, (lub |)', description: 'łączy parametry w jednej serii: długość ,, tryb ,, opcja.' },
                    { syntax: ';;', command: 'x={L}/{N} {SERIES} x={L2}/{N2} {PIPE} y={D}', yields: 'dwie serie punktów, różne kolory', description: 'rozdziela serie — każda rysowana osobno.' },
                ],
            },
            {
                title: 'Podstawowa składnia',
                items: [
                    { syntax: 'x=L/N', command: 'x={L}/{N}', yields: 'N punktów na osi X co L/N', description: 'L = długość pola, N = liczba punktów.' },
                    { syntax: 'y=L/N', command: 'y={Ly}/{Ny}', yields: 'N punktów na osi Y co L/N', description: 'L = długość, N = liczba punktów (pionowo).' },
                    { syntax: 'L/N', command: '{L}/{N}', yields: 'N punktów (skrót osi X)', description: 'skrót bez nazwy osi — zakłada oś X.' },
                    { syntax: 'x=L {PIPE} co=S', command: 'x={L} {PIPE} co={S}', yields: 'punkty co odstęp S na dł. L', description: 'S = stały odstęp; parser sam liczy N. (EN: step=S)' },
                    { syntax: 'x=L {PIPE} co=S1;S2', command: 'x={L} {PIPE} co={S1};{S2}', yields: 'punkty co S1, S2, S1, S2…', description: 'naprzemienne odstępy; cykl się powtarza.' },
                    { syntax: 'od A do B co S', command: 'od {A0} do {Af} co {S}', yields: 'punkty od A do B co S', description: 'naturalny zapis: A = start, B = koniec, S = odstęp.' },
                ],
            },
            {
                title: 'Tryby rozmieszczenia (@)',
                items: [
                    { syntax: '{MODE}between', command: 'x={L}/{N} {PIPE} {MODE}between', yields: 'N punktów równo wewnątrz pola', description: 'nie dotykają krańców (domyślny).' },
                    { syntax: '{MODE}edges', command: 'x={L}/{N} {PIPE} {MODE}edges', yields: 'pierwszy i ostatni punkt na krańcach', description: 'krawędzie pola.' },
                    { syntax: '{MODE}centered', command: 'x={L}/{N} {PIPE} {MODE}centered', yields: 'seria wyśrodkowana względem 0', description: 'cała oś przesunięta symetrycznie.' },
                ],
            },
            {
                title: 'Marginesy i przesunięcie osi',
                items: [
                    { syntax: 'm=A/B', command: 'x={L}/{N} {PIPE} m={A}/{B}', yields: 'punkty w polu skróconym o A i B', description: 'A = od początku, B = od końca.' },
                    { syntax: '<-A  ,,  ->B', command: 'x={L}/{N} {PIPE} <-{A} {PIPE} ->{B}', yields: 'to samo co m=A/B', description: 'strzałkowy zapis marginesów.' },
                    { syntax: 'ms=A  ,,  me=B', command: 'x={L}/{N} {PIPE} ms={A} {PIPE} me={B}', yields: 'margines jednostronny (start i/lub koniec)', description: 'ms = od początku, me = od końca.' },
                    { syntax: 'origin=Z', command: 'x={L}/{N} {PIPE} origin={O}', yields: 'oś z zerem w punkcie Z', description: 'przydatne gdy mierzysz od środka. (EN: offset=Z)' },
                ],
            },
            {
                title: 'Parametry punktów i wyniku',
                items: [
                    { syntax: 'r=P', command: 'x={L}/{N} {PIPE} r={P}', yields: 'punkty jako kółka promienia P', description: 'rozmiar znacznika na wykresie.' },
                    { syntax: 'u=mm / u=cm / u=m', command: 'x={L}/{N} {PIPE} u=mm', yields: 'współrzędne i odstępy w mm/cm/m', description: 'jednostka w wynikach i na osi.' },
                    { syntax: 'opis=T', command: 'x={L}/{N} {PIPE} opis={T}', yields: 'seria z podpisem T na legendzie', description: 'EN: label=T' },
                    { syntax: 'x=D / y=D', command: 'y={Ly}/{Ny} {PIPE} x={D}', yields: 'seria Y przesunięta na pozycji X=D', description: 'odsunięcie całej serii na drugiej osi.' },
                ],
            },
            {
                title: 'Przykłady (konkretne liczby)',
                items: [
                    { syntax: 'x=L/N {PIPE} m=A/A {PIPE} @edges {PIPE} u=mm', command: 'x=120/4 {PIPE} m=10/10 {PIPE} {MODE}edges {PIPE} u=mm', yields: '4 pkt na krańcach, margines 10, wynik w mm', description: 'L=120, N=4, A=10.' },
                    { syntax: 'x=L/N {SERIES} x=L/N {PIPE} y=D', command: 'x=120/4 {SERIES} x=120/6 {PIPE} y=30', yields: 'dwie serie punktów na jednym rysunku', description: 'różne kolory, niezależne osie.' },
                ],
            },
        ],
        graph: [
            {
                title: 'Legenda symboli',
                intro: '<code>→</code> przy komendzie = co narysuje / policzy parser (figura, wykres, wymiary, kamera).',
                items: [
                    { syntax: 'x;y — współrzędne', description: 'pozioma x, pionowa y; rozdziel średnikiem (;). Przecinek = ułamek dziesiętny (10,5 = 10.5).' },
                    { syntax: 'W × H — wymiary', description: 'szerokość W, wysokość H (prostokąt, siatka, matryca).' },
                    { syntax: 'R — promień', description: 'okrąg, wielokąt foremny (wielokat=N;R).' },
                    { syntax: 'N — liczba boków', description: 'wielokąt foremny (np. N=6 → sześciokąt).' },
                    { syntax: 'K — kąt poziomy (°)', description: 'pole widzenia w poziomie (kąt=K lub kąt=K;V).' },
                    { syntax: 'V — kąt pionowy (°)', description: 'pole widzenia w pionie — skrót w kąt=K;V lub osobno kątZ=V.' },
                    { syntax: 'Z — zasięg', description: 'maksymalna odległość widzenia / stożka.' },
                    { syntax: 'H — wysokość montażu (z)', description: 'kamera nad ziemią; włącza rzut keystone na ziemię.' },
                ],
            },
            {
                title: 'Jak budować komendy — separatory',
                items: [
                    { syntax: 'Zapis w podpowiedziach: [ ] = opcjonalne, | = albo', description: 'W ściądze i w live-podpowiedzi nad polem: kwadratowe nawiasy [ ] oznaczają część OPCJONALNĄ (możesz pominąć), a kreska | oznacza ALBO (jedna z opcji). Np. azymut=A[;V] → V możesz dodać lub nie; cel=x;y | azymut=A → użyj celu ALBO azymutu.' },
                    { syntax: '; (średnik)', command: 'punkt={Xp},{Yp};{Yc}', yields: 'wartość ze składowymi x;y;z', description: 'rozdziela składowe: x;y;z. Przecinek = ułamek (10,5 = 10.5).' },
                    { syntax: ',, (lub |)', description: 'łączy parametry jednej figury/komendy: komenda ,, opcja ,, opcja.' },
                    { syntax: ';;', command: 'f(x)=sin(x) {SERIES} f(x)=cos(x)', yields: 'kilka wykresów/figur, różne kolory', description: 'rysuje wiele serii jednocześnie.' },
                    { syntax: '/ (w wielokącie)', command: 'wielokat=0;0/{W};0/{W};{H}', yields: 'wielokąt z listy wierzchołków', description: 'rozdziela kolejne wierzchołki (każdy jako x;y).' },
                ],
            },
            {
                title: 'Funkcje matematyczne',
                items: [
                    { syntax: 'f(x)=wyrażenie', command: 'f(x)=x^2', yields: 'wykres funkcji y=f(x)', description: 'rysuje wykres zmiennej x. ^ = potęgowanie (x^3 = x³).' },
                    { syntax: 'sin cos tan sqrt abs log ln exp', command: 'f(x)=sqrt(abs(x))', yields: 'wykres z tryg./log./exp', description: 'sin/cos/tan w radianach, sqrt, abs, log, ln, exp(x).' },
                    { syntax: 'asin acos atan sinh cosh tanh cot csc', command: 'f(x)=asin(x)', yields: 'wykres z odwrotną tryg./hiperbol.', description: 'asin/acos/atan, sinh/cosh/tanh, cot/csc.' },
                    { syntax: 'floor ceil round', command: 'f(x)=floor(x)', yields: 'wykres z zaokrągleniem w dół/górę', description: 'floor = w dół, ceil = w górę, round = do najbliższej całości.' },
                ],
            },
            {
                title: 'Stałe matematyczne',
                items: [
                    { syntax: 'pi / π', command: 'f(x)=sin(pi*x)', yields: 'wykres z π w wyrażeniu', description: 'pi ≈ 3.14159 (stosunek obwodu do średnicy).' },
                    { syntax: 'e', command: 'f(x)=e^x', yields: 'wykres wykładniczy eˣ', description: 'e ≈ 2.71828 (podstawa ln).' },
                ],
            },
            {
                title: 'Geometria 2D — co oznacza każdy symbol',
                items: [
                    { syntax: 'punkt=x;y', command: 'punkt={Xp};{Yp} {PIPE} opis=A {PIPE} r={P}', yields: 'punkt w (x;y) + opcjonalny opis', description: 'x = pozioma, y = pionowa (rozdziel ;).' },
                    { syntax: 'rect=WxH / prostokat=WxH', command: 'prostokat={W}x{H}', yields: 'prostokąt W×H + wymiary', description: 'lewy dolny róg w 0;0.' },
                    { syntax: 'okrąg=R / circle=R', command: 'okrąg={R}', yields: 'okrąg promienia R', description: 'środek w (0;0), osie zrównane → koło okrągłe.' },
                    { syntax: 'wielokat=N;R / poly=N;R', command: 'wielokat={Ns};{R}', yields: 'wielokąt foremny N boków', description: 'N = liczba boków, R = promień okręgu opisanego.' },
                    { syntax: 'wielokat=x;y/x;y/x;y', command: 'wielokat=0;0/{W};0/{W};{H}', yields: 'wielokąt + boki, obwód, pole, kąty', description: 'nieforemny — lista wierzchołków rozdzielona /.' },
                    { syntax: 'siatka=WxH {PIPE} co=dx x dy', command: 'siatka={W}x{H} {PIPE} co={dx}x{dy}', yields: 'siatka punktów co dx×dy', description: 'pole W×H, dx = odstęp poziomy, dy = pionowy.' },
                    { syntax: 'ox=A {PIPE} oy=B', command: 'rect={W}x{H} {PIPE} ox={Ox} {PIPE} oy={Oy}', yields: 'figura przesunięta o (ox, oy)', description: 'ox = poziomo, oy = pionowo od 0;0.' },
                ],
            },
            {
                title: 'Trójkąty (Pitagoras, kąty)',
                items: [
                    { syntax: 'trojkat=x;y/x;y/x;y', command: 'trojkat=0;0/{b};0/0;{a}', yields: 'trójkąt + boki, kąty, pole, obwód', description: '3 wierzchołki; wykrywa prostokątny.' },
                    { syntax: 'pitagoras=a;b', command: 'pitagoras={a};{b}', yields: 'c=√(a²+b²) + trójkąt prostokątny', description: 'a; b = przyprostokątne.' },
                ],
            },
            {
                title: 'Pole widzenia 2D (kamera / czujnik / reflektor)',
                items: [
                    { syntax: 'kamera=x;y {PIPE} kąt=K {PIPE} zasięg=Z', command: 'kamera={Xp};{Yp} {PIPE} kąt={K} {PIPE} zasięg={Zr}', yields: 'stożek widzenia 2D + zasięg Z', description: 'x;y = montaż, K = kąt poziomy (°), Z = zasięg.' },
                    { syntax: 'kamera=x;y;H;K;Z (skrót)', command: 'kamera=0;0;{Hz};{Kd};{Zr} {PIPE} cel={Xc};{Yc}', yields: 'stożek + opcjonalny cel', description: 'SKRÓT pozycyjny: montaż, H, K, Z w jednym ciągu. Jawne kąt=/zasięg= nadpisują.' },
                    { syntax: 'kąt=K  (lub kąt=K;V)', command: 'kamera=0;0;{Hz} {PIPE} kąt={K};{V} {PIPE} zasięg={Zr} {PIPE} cel={Xd};{Yd}', yields: 'stożek z FOV poziomym K i pionowym V', description: 'V (po ;) = kąt pionowy — skrót zamiast kątZ=.' },
                    { syntax: 'cel=x;y  (lub cel=x;y;H)', command: 'kamera={Xp};{Yp} {PIPE} kąt={K} {PIPE} zasięg={Zr} {PIPE} cel={Xc};{Yc}', yields: 'stożek wycelowany w punkt + znacznik celu', description: 'kierunek bez liczenia stopni. Trzecia liczba = wysokość celu (H).' },
                    { syntax: 'azymut=A  (lub azymut=A;V)', command: 'kamera=0;0;{Hz} {PIPE} kąt={Kd};{V} {PIPE} azymut={Az};-30 {PIPE} zasięg={Zr}', yields: 'stożek wg kompasu (0°=płn.) + V pionowo', description: '90°=prawo, zgodnie z zegarem. V: + w górę, − w dół.' },
                    { syntax: 'kierunek=A  (lub kierunek=A;V)', command: 'kamera=0;0;{Hz} {PIPE} kąt={Kd};{V} {PIPE} kierunek={Kd};-30 {PIPE} zasięg={Zr}', yields: 'stożek wg osi matematycznej (0°=+X)', description: 'rośnie przeciwnie do zegara. V: + w górę, − w dół.' },
                    { syntax: 'krawędźL=x;y  /  krawędźP=x;y  (= edgeL / edgeR)', command: 'kamera={Xp};{Yp} {PIPE} kąt={Kd} {PIPE} krawędźP={Xc};0', yields: 'stożek z brzegiem L/P na punkcie', description: 'parser sam ustawia oś i zasięg. Alias: edgeL / edgeR.' },
                    { syntax: 'krawędźL/P z wysokością → wyliczony cel=', command: 'kamera=0;0;6 {PIPE} kąt=70;45 {PIPE} krawędźL=8;7', yields: 'cel osi wyliczony z geometrii 3D', description: 'z H i FOV pionowym punkt = bliski narożnik pokrycia na ziemi.' },
                    { syntax: 'ogniskowa=F  {PIPE} matryca=W[;H]', command: 'kamera=0;0;{Hz} {PIPE} ogniskowa={F} {PIPE} matryca={Mw};{Mh} {PIPE} zasięg={Zr} {PIPE} cel=20;0', yields: 'FOV z ogniskowej F + matrycy mm', description: 'FOV=2·atan(wymiar/(2F)). Bez matryca= → 36×24 mm. kąt= ma pierwszeństwo.' },
                    { syntax: 'na=D  (lub na=D1;D2;D3)', command: 'kamera={Xp};{Yp} {PIPE} kąt={K} {PIPE} zasięg={Zr} {PIPE} na={D1};{D2};{D3}', yields: 'linie szerokości pola na odległości D', description: 'po ; wiele odległości = kilka stref naraz.' },
                ],
            },
            {
                title: 'Kamera na wysokości — oś Z (rzut na ziemię)',
                items: [
                    { syntax: 'z=H  (lub kamera=x;y;H)', command: 'kamera=0;0;{Hz} {PIPE} kąt={K};{V} {PIPE} zasięg={Zr} {PIPE} cel={Xd};{Yd}', yields: 'rzut keystone kamery na ziemię', description: 'H = wysokość montażu; martwa strefa + daleki brzeg łukiem przy zasięgu.' },
                    { syntax: 'kątZ=V  (kąt pionowy)', command: 'kamera=0;0;{Hz} {PIPE} kąt={K} {PIPE} kątZ={V} {PIPE} cel={Xd};{Yd} {PIPE} zasięg={Zr}', yields: 'pokrycie na ziemi z FOV pionowym V', description: 'bez V nie ma martwej strefy. Skrót: kąt=K;V.' },
                    { syntax: 'pochył=P  (tilt)', command: 'kamera=0;0;{Hz} {PIPE} kąt={Kd};40 {PIPE} pochył={Tlt} {PIPE} zasięg=25', yields: 'nachylenie osi P° + martwa strefa', description: '0=poziomo, 90=w dół. Z z= i cel= parser może policzyć sam.' },
                ],
            },
            {
                title: 'Przykłady (konkretne liczby)',
                items: [
                    { syntax: 'trojkat=0;0/4;0/0;3', command: 'trojkat=0;0/4;0/0;3', yields: 'trójkąt 3-4-5 (kąt prosty przy A)', description: 'klasyczny pitagoras.' },
                    { syntax: 'wielokat=0;0/120;0/120;80/40;120', command: 'wielokat=0;0/120;0/120;80/40;120 {PIPE} opis=działka', yields: 'czworokąt + boki, pole, kąty', description: 'nieforemny działka.' },
                    { syntax: 'okrąg=R {SERIES} wielokat=N;R', command: 'okrąg=100 {SERIES} wielokat=6;100', yields: 'okrąg + wpisany sześciokąt', description: 'R=100, N=6.' },
                    { syntax: 'kamera=x;y {PIPE} kąt=K {PIPE} zasięg=Z {PIPE} cel=x;y', command: 'kamera=0;0 {PIPE} kąt=110 {PIPE} zasięg=15 {PIPE} cel=12;4 {SERIES} kamera=20;0 {PIPE} kąt=90 {PIPE} zasięg=12 {PIPE} cel=12;4', yields: 'dwie kamery → ten sam cel, pokrycie', description: 'widać martwe pola i nakładanie.' },
                    { syntax: 'kamera=x;y;H {PIPE} kąt=K;V {PIPE} zasięg=Z {PIPE} cel=x;y', command: 'kamera=0;0;4 {PIPE} kąt=105;55 {PIPE} zasięg=30 {PIPE} cel=-1,5;10', yields: 'kamera na H m + rzut na ziemię', description: 'przecinek = ułamek dziesiętny.' },
                    { syntax: 'kamera=x;y {PIPE} kąt=K {PIPE} krawędźP=x;y', command: 'kamera=0;0 {PIPE} kąt=80 {PIPE} krawędźP=12;3', yields: 'prawy brzeg pola w (12;3)', description: 'parser sam ustawia oś i zasięg.' },
                ],
            },
            {
                title: 'Moje Stałe w komendach',
                items: [
                    { syntax: 'nazwa_stałej', command: 'belka', yields: 'pełna komenda z rozwiniętej stałej', description: 'Nazwa z Moje Stałe → podstawia fragment komendy. Np. belka = x=L/N ,, @edges.' },
                    { syntax: 'f(x)=nazwa_wzoru', command: 'f(x)=wzor', yields: 'wykres wzoru ze stałej', description: 'Stała-funkcja (np. wzor=50-(20x+5)) → rysuje wzór; w kalkulatorze wzor(3) liczy liczbę.' },
                ],
            },
        ],
    };
})();
