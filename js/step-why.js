// @ts-check
(function () {
    'use strict';
    // „Dlaczego” pod każdym krokiem (plan kroków, etap 3c). Jedno zdanie dla ucznia, który słabo zna matematykę:
    // nie CO robimy (to mówi etykieta), tylko PO CO. Teksty z raportów agentów (docs/superpowers/research).
    // Reguła: [wzorzec etykiety, zdanie | (krok, tytuł) => zdanie, tytuł zadania (opcjonalnie)].
    // Kawałki między $…$ to LaTeX (rysowane jak na kartce). Kroki-stwierdzenia (Wynik, Równanie…) — bez zdania.

    /** @typedef {{label: string, math: string}} Step */
    // [EN] sprzężenie = ten sam nawias z przeciwnym znakiem (raz suma, raz różnica); powód zależy od celu granicy
    const SPRZ_INF = 'Różnica z pierwiastkiem daje $\\infty-\\infty$. Mnożymy przez ten sam nawias z przeciwnym znakiem, bo $(a-b)(a+b)=a^{2}-b^{2}$ i pierwiastek znika.';
    const SPRZ_NUM = 'Pierwiastek nie pozwala skrócić. Mnożymy przez ten sam nawias z przeciwnym znakiem, bo $(a-b)(a+b)=a^{2}-b^{2}$ i pierwiastek znika.';
    /** @type {Record<string, string>} */
    const TAG = {
        '0/0': 'Po wstawieniu wychodzi $\\frac{0}{0}$. Tego nie da się policzyć od razu, więc najpierw przekształcamy wyrażenie.',
        '∞/∞': 'Licznik i mianownik rosną bez końca ($\\frac{\\infty}{\\infty}$). Nie wiadomo, kto wygra, więc przekształcamy.',
        '∞ − ∞': 'Oba składniki rosną bez końca ($\\infty-\\infty$). Wynik może być jakikolwiek, więc przekształcamy.',
        '1^∞': 'Podstawa dąży do 1, a wykładnik do nieskończoności ($1^{\\infty}$). Wynik nie musi być 1, liczymy ze wzoru na $e$.',
        '0 · ∞': 'Jedna część dąży do 0, druga rośnie bez końca ($0\\cdot\\infty$). Nie wiadomo, kto wygra, więc przekształcamy.',
    };

    /** @typedef {{atInf: boolean, prev: Step | null, next: Step | null}} Ctx kontekst: granica w ±∞? kroki obok */
    /** @type {[RegExp, string | ((s: Step, title: string, c: Ctx) => string | null)][]} */
    const RULES = [
        // ── stwierdzenia: bez zdania ──
        [/^(Wynik|Odpowiedź|Równanie|Funkcja|Całka|Działanie|Wyrażenie|Wynik w przybliżeniu)$/, ''],
        // ── granice ──
        [/^Granica$/, (s, _t, c) => {
            const m = /\s\s\[([^\]]+)\]$/.exec(s.math);
            if (m && TAG[m[1]]) return TAG[m[1]];
            if (c.next && /^Dorabiamy jedynkę/.test(c.next.label)) return TAG['1^∞']; // [EN] silnik nie zawsze nazywa 1^∞ (próg)
            // [EN] bez symbolu nie obiecujemy „nic nie przeszkadza” — silnik nie każdy kłopot nazywa (np. 0 · ∞)
            return 'Sprawdzamy, do czego zbliża się wyrażenie, gdy zmienna zbliża się do celu.';
        }],
        [/^Zapisujemy inaczej$/, 'To samo wyrażenie, tylko ułożone tak, żeby dało się je dalej przekształcać.'],
        [/^Podstawiamy \w → /, 'Liczba dzielona przez coraz większą wartość jest prawie zerem. Nic innego nie przeszkadza, więc od razu wstawiamy 0.'],
        [/^Podstawiamy /, 'W mianowniku nie wychodzi zero, więc wystarczy wstawić liczbę.'],
        [/^Wyrazy z \w w mianowniku dążą do 0$/, s => /[+−]∞$/.test(s.math)
            ? 'Ułamki znikają, ale zostaje potęga zmiennej, która rośnie bez końca, więc wynik to nieskończoność.'
            : /1\/.*→ 0$/.test(s.math) ? 'Zostaje 1 przez coś, co rośnie bez końca, więc całość dąży do 0.'
                : 'Liczba podzielona przez coraz większą wartość staje się prawie zerem, więc w jej miejsce wstawiamy 0.'],
        [/^Wyłączamy najwyższe potęgi/, 'Patrzymy, która część rośnie najszybciej, bo to ona decyduje o wyniku.'],
        [/^Wyłączamy .* przed nawias$/, 'Wyciągamy część, która rośnie najszybciej. W nawiasach zostają liczby i ułamki, które za chwilę znikną.'],
        [/^Skracamy \(/, (_s, _t, c) => c.atInf ? 'To samo stoi w liczniku i w mianowniku, więc się skraca.'
            : 'Ten sam nawias jest w liczniku i mianowniku. Zmienna tylko zbliża się do celu, więc nawias nie jest zerem i wolno skrócić.'],
        [/^Skracamy /, 'To samo stoi w liczniku i w mianowniku, więc się skraca.'],
        [/^Mnożymy przez sprzężenie: a³/, 'Przy pierwiastkach trzeciego stopnia pomaga wzór $a^{3}-b^{3}=(a-b)(a^{2}+ab+b^{2})$: po wymnożeniu pierwiastki znikają.'],
        [/^Mnożymy przez sprzężenie: a⁴/, 'Przy pierwiastkach czwartego stopnia pomaga wzór na $a^{4}-b^{4}$: po wymnożeniu pierwiastki znikają.'],
        [/^Mnożymy przez sprzężenie$/, (_s, _t, c) => c.atInf ? SPRZ_INF : SPRZ_NUM],
        [/^Upraszczamy( licznik)?$/, (_s, _t, c) => c.prev && /sprzężenie/.test(c.prev.label)
            ? 'Wymnażamy: tam, gdzie była różnica z pierwiastkiem, pierwiastki się skasowały.'
            : 'Wymnażamy i zbieramy podobne wyrazy, żeby wyrażenie było krótsze.'],
        [/^Rozkładamy na czynniki$/, 'Wyszło $\\frac{0}{0}$, więc i licznik, i mianownik mają nawias $(x-a)$. Wyciągamy go, żeby potem skrócić.'],
        [/^Dorabiamy jedynkę$/, 'Wzór na $e$ wymaga postaci $1+\\frac{1}{\\text{coś}}$, a w potędze tego samego „coś”. Przerabiamy podstawę na ten kształt.'],
        [/^Podstawa dąży do e$/, 'Podkreślona potęga ma dokładnie kształt ze wzoru, więc dąży do $e$. Stuknij ją, żeby zobaczyć wzór.'],
        [/^Granica wykładnika$/, 'Środek nawiasu daje $e$. Zostaje policzyć, do czego dąży potęga nad nawiasem.'],
        [/^Składamy wynik$/, 'Podstawa dąży do $e$, a wykładnik do liczby z poprzedniego kroku, więc całość dąży do $e$ do tej potęgi.'],
        [/^Potęga e$/, 'Liczba $e$ do coraz większej potęgi rośnie bez końca, a do coraz bardziej ujemnej spada do 0.'],
        [/^Dla \w → −∞$/, 'Gdy zmienna dąży do $-\\infty$, jest ujemna. Pierwiastek nigdy nie daje liczby ujemnej, więc pilnujemy znaku.'],
        [/^Granica znana/, 'To znany wynik: gdy $u\\to 0$, ten ułamek dąży do 1. Dopasowujemy wyrażenie do tego kształtu.'],
        [/^Nawias kwadratowy → 1$/, 'Nawias kwadratowy to znana granica, więc zastępujemy go jedynką.'],
        [/^Reguła de l'Hospitala$/, 'Wyszło $\\frac{0}{0}$ albo $\\frac{\\infty}{\\infty}$, więc wolno zamiast ułamka liczyć ułamek pochodnych licznika i mianownika.'],
        [/^Sprowadzamy do wspólnego mianownika$/, 'Ułamki można dodać albo odjąć dopiero wtedy, gdy mają ten sam mianownik.'],
        [/^Sprowadzamy do wspólnego wykładnika/, 'Gdy wykładniki są takie same, iloraz potęg to potęga ilorazu, a granicę ilorazu już umiemy policzyć.'],
        [/^Rozbijamy na dwie różnice$/, 'Dzielimy wyrażenie na dwie części, z których każda jest zwykłą różnicą pierwiastków.'],
        [/^Dodajemy granice$/, 'Obie części mają skończone granice, więc granica sumy to suma granic.'],
        [/^Łączymy logarytmy/, 'Różnica logarytmów to logarytm ilorazu, a granicę ilorazu już umiemy policzyć.'],
        [/^Każdy ułamek daje logarytm$/, 'Każdą część liczymy osobno, a potem dodajemy logarytmy.'],
        [/^Logarytm jest ciągły$/, 'Logarytm nie ma skoków, więc liczymy granicę tego, co w środku, i wstawiamy ją do logarytmu.'],
        [/^Logarytm rośnie bez ograniczeń$/, 'To, co jest w logarytmie, rośnie bez końca, więc logarytm też rośnie bez końca.'],
        [/^Granica jednostronna/, 'Mianownik dąży do 0, a licznik nie. Dzielimy przez coraz mniejszą liczbę, więc wynik rośnie bez końca; znak zależy od strony.'],
        [/^Granice jednostronne są różne$/, 'Z lewej strony wychodzi co innego niż z prawej, więc jednej granicy nie ma.'],
        [/^Usuwamy niewymierność z mianownika$/, 'Wynik zapisujemy bez pierwiastka w mianowniku, tak jak w szkole.'],
        // ── równania ──
        [/^Opuszczam nawiasy$/, 'Mnożę każdy wyraz przed nawiasem przez każdy wyraz w nawiasie. Kwadrat nawiasu to nawias razy nawias.'],
        [/^Wyrazy z \w przenoszę/, 'Chcę mieć niewiadomą po jednej stronie, a liczby po drugiej. Przeniesiony wyraz zmienia znak.'],
        [/^Przenoszę wszystko na lewą stronę$/, 'Po prawej zostaje 0, a z postaci „coś = 0” łatwo odczytać współczynniki.'],
        [/^Porządkuję i redukuję wyrazy podobne$|^Redukuję wyrazy podobne$/, 'Dodaję wyrazy, które mają tę samą potęgę niewiadomej.'],
        [/^Dzielę obie strony przez /, 'Chcę, żeby niewiadoma została sama. Dzieląc obie strony przez tę samą liczbę, nie zmieniam równania.'],
        [/^Sprawdzenie$/, (_s, title) => /Całka/.test(title)
            ? 'Pochodna wyniku musi dać funkcję spod całki. Wtedy wiemy, że całka jest dobra.'
            : 'Wstawiam wynik do równania: lewa strona (L) i prawa (P) muszą dać to samo.'],
        [/^Odczytuję współczynniki$/, 'Wzory na deltę i rozwiązania potrzebują liczb $a$, $b$, $c$ z postaci $ax^{2}+bx+c=0$.'],
        [/^Liczę wyróżnik/, 'Delta mówi, ile jest rozwiązań: dodatnia daje dwa, zero jedno, ujemna żadnego.'],
        [/^Pierwiastek z wyróżnika upraszczam$/, 'Wyciągamy spod pierwiastka pełny kwadrat, żeby wynik był prostszy.'],
        [/^Pierwiastek z wyróżnika$/, 'Pierwiastek z delty wchodzi do wzoru na rozwiązania.'],
        [/^Δ > 0/, 'Delta jest dodatnia, więc są dwa rozwiązania. Wstawiamy $-b$, $\\sqrt{\\Delta}$ i $2a$ do wzoru.'],
        [/^Δ = 0/, 'Delta jest zerem, więc jest jedno rozwiązanie: wierzchołek paraboli leży na osi.'],
        [/^Δ < 0, więc parabola/, 'Delta jest ujemna, a pierwiastka z liczby ujemnej nie ma, więc równanie nie ma rozwiązań.'],
        [/^Δ < 0, więc dopełniam/, 'Delta jest ujemna, więc wyrażenia nie da się rozłożyć. Zapisujemy je jako kwadrat plus liczba.'],
        [/^Δ = /, 'Delta mówi, ile jest rozwiązań: dodatnia daje dwa, zero jedno, ujemna żadnego.'],
        [/^Kwadrat nie może być ujemny$/, 'Każda liczba podniesiona do kwadratu daje wynik dodatni albo zero.'],
        [/^Pierwiastkuję obie strony/, 'Dwie liczby dają ten sam kwadrat: dodatnia i ujemna, np. $3^{2}=(-3)^{2}=9$.'],
        [/^Nie ma wyrazu z /, 'Niewiadoma występuje tylko w kwadracie, więc zostawiamy ją samą po jednej stronie.'],
        [/^Nie ma wyrazu wolnego/, 'Każdy wyraz ma niewiadomą, więc wyłączam ją przed nawias.'],
        [/^Iloczyn jest zerem/, 'Iloczyn jest zerem tylko wtedy, gdy któryś czynnik jest zerem.'],
        [/^Szukam pierwiastka/, 'Sprawdzam dzielniki liczby bez $x$. Jeśli któryś daje 0, mam rozwiązanie $r$ i nawias $(x-r)$.'],
        [/^Pierwiastki wielomianu dają czynniki/, 'Każde miejsce zerowe $r$ daje nawias $(x-r)$.'],
        [/^Nie ma pierwiastków wymiernych/, 'Żaden dzielnik wyrazu wolnego nie zeruje wielomianu, więc prościej go nie rozłożymy.'],
        [/^Wyłączam wspólny czynnik/, 'Ten sam czynnik jest w każdym wyrazie, więc wyciągam go przed nawias.'],
        [/^Nie ma wspólnego czynnika/, 'Żaden czynnik nie powtarza się we wszystkich wyrazach.'],
        [/^Zmienna się skróciła/, 'Po uproszczeniu zostało zdanie fałszywe, więc żadna liczba nie spełnia równania.'],
        [/^Brak rozwiązań$/, 'Żadna liczba nie spełnia równania.'],
        [/^Wyznaczam /, 'Chcę mieć tę niewiadomą samą po jednej stronie.'],
        [/^Mianownik jest kwadratem$/, 'Kwadrat nie jest ujemny, więc wystarczy sprawdzić, kiedy jest zerem.'],
        [/^Zmiana znaku$/, 'Mnożę obie strony przez $-1$, żeby niewiadoma miała znak plus.'],
        // ── ułamki i kolejność działań ──
        [/^Sprowadzam do wspólnego mianownika/, 'Dodawać i odejmować można tylko ułamki o tym samym mianowniku.'],
        [/^Dodawanie$|^Odejmowanie$/, 'Mianowniki są już równe, więc dodajemy albo odejmujemy tylko liczniki, a mianownik przepisujemy.'],
        [/^Mnożenie$|^Dzielenie$|^Potęgowanie$|^Najpierw nawias/, 'Kolejność działań: najpierw nawiasy, potem potęgi, mnożenie i dzielenie, na końcu dodawanie i odejmowanie.'],
        [/^Dzielę licznik przez mianownik$/, 'Ułamek to dzielenie, więc dzielę licznik przez mianownik.'],
        [/^Wyciągam kwadrat spod pierwiastka$/, 'Z pełnego kwadratu pierwiastek jest dokładny: $\\sqrt{4\\cdot 2}=\\sqrt{4}\\cdot\\sqrt{2}=2\\sqrt{2}$.'],
        [/^Pierwiastek$/, 'Szukam liczby, która podniesiona do kwadratu da liczbę pod pierwiastkiem.'],
        [/^Wymnażam nawiasy$/, 'Mnożę każdy wyraz z jednego nawiasu przez każdy wyraz z drugiego.'],
        [/^Różnica kwadratów/, 'Wzór $a^{2}-b^{2}=(a-b)(a+b)$ zamienia różnicę kwadratów na iloczyn.'],
        // ── pochodne ──
        [/^Pochodna iloczynu/, 'Funkcja to iloczyn, więc liczę pochodną każdego czynnika osobno i składam je wzorem.'],
        [/^Pochodna ilorazu/, 'Funkcja to ułamek, więc używam wzoru na pochodną ilorazu.'],
        [/^Pochodna złożona/, 'Funkcja w funkcji: pochodna zewnętrznej, ze środkiem bez zmian, razy pochodna środka.'],
        [/^Pochodna sumy|^Liczę każdy składnik/, 'Liczę pochodną każdego wyrazu osobno, a pochodna stałej to 0.'],
        [/^Stała zostaje przed pochodną$/, 'Liczba przed funkcją nie zmienia się przy liczeniu pochodnej, zostaje jako mnożnik.'],
        [/^Wzór: \(xⁿ\)′/, 'Wykładnik schodzi przed zmienną, a potęga maleje o 1.'],
        [/^Wzór z tablicy$/, 'To podstawowy wzór z tablic, który warto pamiętać.'],
        [/^Składam wynik$|^Składam całość$/, 'Wstawiam policzone części do wzoru i zapisuję całość.'],
        // ── całki ──
        [/^Całka sumy/, 'Całkę sumy liczymy jako sumę całek każdego składnika.'],
        [/^Stałą wyłączam przed całkę$|^Stała: /, 'Liczba przed funkcją nie zmienia się przy całkowaniu, zostaje jako mnożnik.'],
        [/^Całkowanie przez części/, 'Całka iloczynu: jeden czynnik różniczkujemy ($u$), drugi całkujemy ($dv$), żeby powstała prostsza całka.'],
        [/^Podstawiam do wzoru$/, 'Wstawiamy $u$, $v$ i $du$ do wzoru na całkowanie przez części.'],
        [/^Podstawienie: /, 'Zastępujemy wnętrze jedną literą, żeby całka wyglądała jak wzór z tablicy.'],
        [/^Wracam do zmiennej /, 'Na końcu zamieniamy literę pomocniczą z powrotem na wyrażenie z początku.'],
        [/^Wzór: ∫/, 'To całka z tablicy: odwracamy znaną pochodną.'],
        [/^Tożsamość: /, 'Zamieniamy potęgę funkcji trygonometrycznej na wyrażenie bez potęgi, które łatwo scałkować.'],
        [/^Rozkład na ułamki proste$/, 'Dzielimy ułamek na prostsze części, z których każdą umiemy scałkować.'],
        [/^Wzór Newtona-Leibniza/, 'Całka oznaczona to różnica funkcji pierwotnej na końcu i na początku przedziału.'],
    ];

    /**
     * @param {Step} step @param {string} [title] tytuł zadania (Granica, Pochodna, Całka…)
     * @param {{steps: Step[]}} [explain] całe rozwiązanie — kontekst (granica w ±∞, kroki obok) @param {number} [i] numer kroku
     * @returns {string} '' = bez zdania
     */
    function whyFor(step, title, explain, i) {
        const all = explain && explain.steps || [], k = i == null ? all.indexOf(step) : i;
        const head = /lim\(\w→([^)]*)\)/.exec(all[0] ? all[0].math : step.math);
        /** @type {Ctx} */
        const ctx = { atInf: !!head && /∞/.test(head[1]), prev: k > 0 ? all[k - 1] : null, next: k >= 0 && k + 1 < all.length ? all[k + 1] : null };
        for (const [re, why] of RULES) {
            if (!re.test(step.label)) continue;
            const out = typeof why === 'function' ? why(step, title || '', ctx) : why;
            return out || '';
        }
        return '';
    }
    /** czy etykieta to krok-stwierdzenie (bez zdania „dlaczego”) @param {string} label */
    const isStatement = (label) => RULES[0][0].test(label);

    const API = { whyFor: whyFor, isStatement: isStatement, TAG: TAG };
    const g = /** @type {any} */ (typeof window !== 'undefined' ? window : globalThis);
    g.MATM0_WHY = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
