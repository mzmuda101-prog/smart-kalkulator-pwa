// @ts-check
(function () {
    'use strict';
    // „Dlaczego” pod każdym krokiem (plan kroków, etap 3c). Jedno zdanie dla ucznia, który słabo zna matematykę:
    // nie CO robimy (to mówi etykieta), tylko PO CO. Teksty z raportów agentów (docs/superpowers/research).
    // Reguła: [wzorzec etykiety, zdanie | (krok, tytuł) => zdanie, tytuł zadania (opcjonalnie)].
    // Kawałki między $…$ to LaTeX (rysowane jak na kartce). Kroki-stwierdzenia (Wynik, Równanie…) — bez zdania.

    /** @typedef {{label: string, math: string, formula?: {id: string}}} Step */
    // [EN] sprzężenie = ten sam nawias z przeciwnym znakiem (raz suma, raz różnica); powód zależy od celu granicy
    // [EN] bez powtarzania wzoru — wzór jest w dymku pod kolorowym fragmentem (bez dubli)
    // [EN] przy kroku z dymkiem: zdanie mówi o tym zadaniu, dymek o regule (test/step-why.js pilnuje dubli)
    const SAME = 'Licznik i mianownik mnożymy przez to samo, więc wartość ułamka się nie zmienia.';
    const SPRZ_INF = 'Tu wychodzi $\\infty-\\infty$. ' + SAME;
    const SPRZ_NUM = 'Wstawienie liczby daje zero w mianowniku. ' + SAME;
    /** @type {Record<string, string>} */
    const TAG = {
        '0/0': 'Po wstawieniu wychodzi $\\frac{0}{0}$. Tego nie da się policzyć od razu, więc najpierw przekształcamy wyrażenie.',
        '∞/∞': 'Licznik i mianownik rosną bez końca ($\\frac{\\infty}{\\infty}$). Nie wiadomo, kto wygra, więc przekształcamy.',
        '∞ − ∞': 'Oba składniki rosną bez końca ($\\infty-\\infty$). Wynik może być jakikolwiek, więc przekształcamy.',
        '1^∞': 'Podstawa dąży do 1, a wykładnik do nieskończoności ($1^{\\infty}$). Wynik nie musi być 1, liczymy ze wzoru na $e$.',
        '0 · ∞': 'Jedna część dąży do 0, druga rośnie bez końca ($0\\cdot\\infty$). Nie wiadomo, kto wygra, więc przekształcamy.',
    };

    // [EN] krótsze opisy symbolu, gdy krok ma dymek „Symbol nieoznaczony” (morał „więc przekształcamy” jest w dymku)
    /** @type {Record<string, string>} */
    const TAG_SHORT = {
        '0/0': 'Licznik i mianownik zbliżają się do 0 ($\\frac{0}{0}$).',
        '∞/∞': 'Licznik i mianownik rosną bez końca ($\\frac{\\infty}{\\infty}$).',
        '∞ − ∞': 'Oba składniki rosną bez końca ($\\infty-\\infty$).',
        '1^∞': 'Podstawa zbliża się do 1, a wykładnik rośnie bez końca ($1^{\\infty}$).',
        '0 · ∞': 'Jedna część zbliża się do 0, a druga rośnie bez końca ($0\\cdot\\infty$).',
    };
    const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    /** wykładnik potęgi z kroku: (x³)′ → [3, 1], (x^(−1/2))′ → [−1, 2], (x)′ → [1, 1]; null, gdy nie widać @param {string} m @param {RegExp} re */
    function powerOf(m, re) {
        const hit = re.exec(m);
        if (!hit) return null;
        const e = hit[1] || '';
        if (!e) return [1, 1];
        if (e[0] !== '^') return [+[...e].map(ch => SUP.indexOf(ch)).join(''), 1];
        const f = /^\^\((−?)(\d+)(?:\/(\d+))?\)$/.exec(e);
        return f ? [(f[1] ? -1 : 1) * +f[2], f[3] ? +f[3] : 1] : null;
    }
    /** @param {number} p @param {number} q */
    const texRat = (p, q) => q === 1 ? String(p) : (p < 0 ? '-' : '') + '\\frac{' + Math.abs(p) + '}{' + q + '}';
    const POW = /⟦\([a-z](\^\([^)]*\)|[⁰¹²³⁴⁵⁶⁷⁸⁹]*)\)′⟧/, INT_POW = /⟦∫ [a-z](\^\([^)]*\)|[⁰¹²³⁴⁵⁶⁷⁸⁹]*) d[a-z]⟧/;

    /** @typedef {{atInf: boolean, prev: Step | null, next: Step | null}} Ctx kontekst: granica w ±∞? kroki obok */
    /** @type {[RegExp, string | ((s: Step, title: string, c: Ctx) => string | null)][]} */
    const RULES = [
        // ── stwierdzenia: bez zdania ──
        [/^(Wynik|Odpowiedź|Równanie|Układ równań|Nierówność|Funkcja|Całka|Działanie|Wyrażenie|Wynik w przybliżeniu)$/, ''],
        // ── granice ──
        [/^Granica$/, (s, _t, c) => {
            const m = /\s\s\[⟦?([^\]⟧]+)⟧?\]$/.exec(s.math);
            if (m && TAG[m[1]]) return (s.formula ? TAG_SHORT : TAG)[m[1]];
            if (c.next && /^Dorabiamy jedynkę/.test(c.next.label)) return TAG['1^∞']; // [EN] silnik nie zawsze nazywa 1^∞ (próg)
            // [EN] bez symbolu nie obiecujemy „nic nie przeszkadza” — silnik nie każdy kłopot nazywa (np. 0 · ∞)
            return 'Sprawdzamy, do czego zbliża się wyrażenie, gdy zmienna zbliża się do celu.';
        }],
        [/^Zapisujemy inaczej$/, 'To samo wyrażenie, tylko ułożone tak, żeby dało się je dalej przekształcać.'],
        [/^Podstawiamy \w → /, 'Liczba dzielona przez coraz większą wartość jest prawie zerem. Nic innego nie przeszkadza, więc od razu wstawiamy 0.'],
        [/^Podstawiamy /, (s) => /\//.test(s.math.replace(/^lim\([^)]*\)/, '')) ? 'W mianowniku nie wychodzi zero, więc wystarczy wstawić liczbę.'
            : 'Nic już nie przeszkadza: wyrażenie ma sens w tym punkcie, więc wstawiamy liczbę.'],
        [/^Wyrazy z \w w mianowniku dążą do 0$/, s => /[+−]∞$/.test(s.math)
            ? 'Ułamki znikają, ale zostaje potęga zmiennej, która rośnie bez końca, więc wynik to nieskończoność.'
            : /1\/.*→ 0$/.test(s.math) ? 'Zostaje 1 przez coś, co rośnie bez końca, więc całość dąży do 0.'
                : 'Liczba podzielona przez coraz większą wartość staje się prawie zerem, więc w jej miejsce wstawiamy 0.'],
        [/^Wyłączamy najwyższe potęgi/, 'Patrzymy, która część rośnie najszybciej, bo to ona decyduje o wyniku.'],
        [/^Wyłączamy .* przed nawias$/, 'Wyciągamy część, która rośnie najszybciej. W nawiasach zostają liczby i ułamki, które za chwilę znikną.'],
        [/^Skracamy \(/, (_s, _t, c) => c.atInf ? 'To samo stoi w liczniku i w mianowniku, więc się skraca.'
            : 'Ten sam nawias jest w liczniku i mianowniku. Zmienna tylko zbliża się do celu, więc nawias nie jest zerem i wolno skrócić.'],
        [/^Skracamy /, 'To samo stoi w liczniku i w mianowniku, więc się skraca.'],
        [/^Mnożymy przez sprzężenie$/, (s, _t, c) => {
            const id = s.formula && s.formula.id;
            if (id === 'roznica-szescianow' || id === 'roznica-czwartych') return (id === 'roznica-szescianow' ? 'Tu stoją pierwiastki $\\sqrt[3]{\\ }$. ' : 'Tu stoją pierwiastki $\\sqrt[4]{\\ }$. ') + SAME;
            return c.atInf ? SPRZ_INF : SPRZ_NUM;
        }],
        [/^Upraszczamy( licznik)?$/, (_s, _t, c) => c.prev && /sprzężenie/.test(c.prev.label)
            ? 'Wymnażamy: tam, gdzie była różnica z pierwiastkiem, pierwiastki się skasowały.'
            : 'Wymnażamy i zbieramy podobne wyrazy, żeby wyrażenie było krótsze.'],
        [/^Rozkładamy na czynniki$/, 'Wyszło $\\frac{0}{0}$, więc i licznik, i mianownik mają nawias $(x-a)$. Wyciągamy go, żeby potem skrócić.'],
        [/^Dorabiamy jedynkę$/, 'Wzór na $e$ wymaga postaci $1+\\frac{1}{\\text{coś}}$, a w potędze tego samego „coś”. Przerabiamy podstawę na ten kształt.'],
        [/^Kolorowa potęga dąży do e$/, 'W nawiasie jest $1+\\frac{1}{a_{n}}$, a nad nim to samo $a_{n}$. Resztę wykładnika liczymy osobno.'],
        [/^Granica wykładnika$/, 'Środek nawiasu daje $e$. Zostaje policzyć, do czego dąży potęga nad nawiasem.'],
        [/^Składamy wynik$/, 'Podstawa dąży do $e$, a wykładnik do liczby z poprzedniego kroku, więc całość dąży do $e$ do tej potęgi.'],
        [/^Potęga e$/, 'Liczba $e$ do coraz większej potęgi rośnie bez końca, a do coraz bardziej ujemnej spada do 0.'],
        [/^Dla \w → −∞$/, 'Tu zmienna jest ujemna, więc wyciągając ją spod pierwiastka, piszemy przed nim minus.'],
        [/^Korzystamy ze znanej granicy$/, 'Dopasowujemy wyrażenie do kształtu ze wzoru, nie zmieniając jego wartości.'],
        [/^Kolorowy ułamek dąży do 1$/, 'Zastępujemy kolorowy ułamek jedynką i zostaje prostsze wyrażenie.'],
        [/^Reguła de l'Hospitala$/, (_s, _t, c) => c.prev && /^Reguła de l'Hospitala$/.test(c.prev.label)
            ? 'Po pierwszym razie znowu wychodzi symbol nieoznaczony, więc stosujemy regułę drugi raz.'
            : 'Pochodne licznika i mianownika są prostsze od nich samych i ich ułamek da się już policzyć.'],
        [/^Sprowadzamy do wspólnego mianownika$/, 'Ułamki można dodać albo odjąć dopiero wtedy, gdy mają ten sam mianownik.'],
        [/^Zapisujemy oba wykładniki tak samo$/, 'Przerabiamy potęgi tak, żeby góra i dół ułamka miały nad sobą to samo.'],
        [/^Rozbijamy na dwie różnice$/, 'Dzielimy wyrażenie na dwie części, z których każda jest zwykłą różnicą pierwiastków.'],
        [/^Dodajemy granice$/, 'Obie części mają skończone granice, więc granica sumy to suma granic.'],
        [/^Łączymy logarytmy/, 'Zamiast dwóch logarytmów zostaje jeden, z ułamkiem w środku.'],
        [/^Każdy ułamek daje logarytm$/, 'Każdą część liczymy osobno, a potem dodajemy logarytmy.'],
        [/^Logarytm jest ciągły$/, 'Logarytm nie ma skoków, więc liczymy granicę tego, co w środku, i wstawiamy ją do logarytmu.'],
        [/^Logarytm rośnie bez ograniczeń$/, 'To, co jest w logarytmie, rośnie bez końca, więc logarytm też rośnie bez końca.'],
        [/^Granica jednostronna/, 'Mianownik dąży do 0, a licznik nie. Dzielimy przez coraz mniejszą liczbę, więc wynik rośnie bez końca; znak zależy od strony.'],
        [/^Granice jednostronne są różne$/, 'Z lewej strony wychodzi co innego niż z prawej, więc jednej granicy nie ma.'],
        [/^Usuwamy niewymierność z mianownika$/, 'Wynik zapisujemy bez pierwiastka w mianowniku, tak jak w szkole.'],
        // ── równania ──
        [/^Opuszczam nawiasy$/, 'Mnożę liczbę przed nawiasem przez każdy wyraz w nawiasie.'],
        [/^Przenoszę (\w|liczby|liczbę) /, 'Chcę mieć niewiadomą po jednej stronie, a liczby po drugiej. Przeniesiony wyraz zmienia znak.'],
        [/^Przenoszę wszystko na lewą stronę$/, 'Po prawej zostaje 0, a z postaci „coś = 0” łatwo odczytać współczynniki.'],
        [/^Porządkuję i redukuję wyrazy podobne$/, 'Porządkuję wyrazy: te z niewiadomą razem, liczby razem.'],
        [/^Redukuję wyrazy podobne$/, 'Dodaję wyrazy tego samego rodzaju: niewiadome z niewiadomymi, liczby z liczbami.'],
        [/^Skracam ułamek$/, 'Licznik i mianownik dzielą się przez tę samą liczbę, więc ułamek zapisuję prościej.'],
        [/^Dzielę obie strony przez /, 'Chcę, żeby niewiadoma została sama. Dzieląc obie strony przez tę samą liczbę, nie zmieniam równania.'],
        [/^Sprawdzenie$/, (_s, title) => /Całka/.test(title)
            ? 'Pochodna wyniku musi dać funkcję spod całki. Wtedy wiemy, że całka jest dobra.'
            : /Układ/.test(title) ? 'Wstawiam obie liczby do obu równań: każde musi wyjść prawdziwe.'
                : 'Wstawiam wynik do równania: lewa strona (L) i prawa (P) muszą dać to samo.'],
        [/^Odczytuję współczynniki$/, 'Wzory na deltę i rozwiązania potrzebują liczb $a$, $b$, $c$ z postaci $ax^{2}+bx+c=0$.'],
        [/^Liczę deltę$/, 'Wstawiam $a$, $b$, $c$ z tego równania do wzoru na deltę.'],
        [/^Upraszczam pierwiastek z delty$/, 'Wyciągamy spod pierwiastka pełny kwadrat, żeby wynik był prostszy.'],
        [/^Liczę pierwiastek z delty$/, 'Pierwiastek z delty wchodzi do wzoru na rozwiązania.'],
        [/^Liczę dwa rozwiązania$/, 'Wstawiam liczby: raz odejmuję $\\sqrt{\\Delta}$, raz dodaję, i tak dostaję $x_{1}$ oraz $x_{2}$.'],
        [/^Liczę jedno rozwiązanie$/, 'Tu $\\Delta=0$, więc zostaje tylko $-b$ podzielone przez $2a$.'],
        [/^Delta ujemna/, 'Delta jest ujemna, a pierwiastka z liczby ujemnej nie ma, więc równanie nie ma rozwiązań.'],
        [/^Szukam miejsc zerowych$/, (_s, title) => title === 'Nierówność'
            ? 'Miejsca zerowe dzielą oś na części, w których wyrażenie nie zmienia znaku.'
            : 'Miejsca zerowe to liczby, dla których wyrażenie jest zerem. Z nich zbudujemy nawiasy.'],
        [/^Brak miejsc zerowych$/, 'Wyrażenie nigdy nie jest zerem, więc wykres nie przecina osi.'],
        [/^Zapisuję postać iloczynową$/, 'Mam już rozwiązania z poprzedniego kroku, więc składam z nich wynik.'],
        [/^Rozkładam różnicę kwadratów$/, 'Oba wyrazy są kwadratami, więc od razu widać, co wstawić do wzoru.'],
        [/^Rozpisuję kwadrat sumy$/, 'Po rozpisaniu nawiasu można zredukować wyrazy podobne.'],
        [/^Δ < 0, więc dopełniam/, 'Delta jest ujemna, więc wyrażenia nie da się rozłożyć. Zapisujemy je jako kwadrat plus liczba.'],
        [/^Δ = /, (s) => s.formula ? 'Wstawiam $a$, $b$, $c$ do wzoru na deltę.' : 'Delta mówi, ile jest rozwiązań: dodatnia daje dwa, zero jedno, ujemna żadnego.'],
        [/^Kwadrat nie może być ujemny$/, 'Każda liczba podniesiona do kwadratu daje wynik dodatni albo zero.'],
        [/^Pierwiastkuję obie strony/, 'Dwie liczby dają ten sam kwadrat: dodatnia i ujemna, np. $3^{2}=(-3)^{2}=9$.'],
        [/^Nie ma wyrazu z /, 'Niewiadoma występuje tylko w kwadracie, więc zostawiamy ją samą po jednej stronie.'],
        [/^Wyłączam \w przed nawias$/, 'Nie ma wyrazu bez niewiadomej, więc każdy wyraz dzieli się przez nią.'],
        [/^Przyrównuję każdy czynnik do zera$/, 'Iloczyn jest zerem tylko wtedy, gdy któryś czynnik jest zerem.'],
        [/^Zmieniam znak obu stron$/, 'Mnożę obie strony przez $-1$, więc obie zmieniają znak.'],
        [/^Dzielę przez .* i odwracam znak$/, 'Dzielenie obu stron przez liczbę ujemną odwraca znak nierówności, np. $2>1$, ale $-2<-1$.'],
        [/^Odczytuję znak z paraboli$/, (s) => {
            const p = s.parabola;
            if (!p) return 'Znak trójmianu zależy od tego, czy ramiona paraboli idą w górę, czy w dół.';
            const arms = p.up ? 'Ramiona paraboli idą w górę' : 'Ramiona paraboli idą w dół';
            if (!p.roots) return arms + ', a parabola nie przecina osi, więc znak jest wszędzie ten sam.';
            if (p.roots === 1) return arms + ' i parabola tylko dotyka osi, więc znak zmienia się wyłącznie w tym jednym punkcie.';
            const sign = p.between === p.up ? 'ujemne' : 'dodatnie';
            return arms + ': wartości ' + sign + ' są ' + (p.between ? 'między miejscami zerowymi.' : 'na zewnątrz miejsc zerowych.');
        }],
        [/^Porządkuję równania$/, 'Ustawiam oba równania tak samo: niewiadome po lewej w tej samej kolejności, liczba po prawej.'],
        [/^Podstawiam do (pierwszego|drugiego) równania$/, 'W miejsce wyznaczonej niewiadomej wpisuję jej wyrażenie. Zostaje równanie z jedną niewiadomą.'],
        [/^Wstawiam \w = .* do (pierwszego|drugiego) równania$/, 'Znam już jedną niewiadomą, więc z dowolnego równania wyliczę drugą.'],
        [/^Wstawiam \w = [^ ]+$/, 'Znam już jedną niewiadomą, więc wstawiam ją do wyrażenia na drugą.'],
        [/^Mnożę (pierwsze|drugie) przez/, 'Chcę, żeby przy jednej niewiadomej stały przeciwne liczby. Wtedy po dodaniu równań ta niewiadoma zniknie.'],
        [/^Dodaję równania stronami$/, 'Lewą stronę dodaję do lewej, prawą do prawej. Przeciwne wyrazy się znoszą i zostaje jedna niewiadoma.'],
        [/^Lewe strony są proporcjonalne$/, 'Drugie równanie po lewej to pierwsze pomnożone przez liczbę, więc oba opisują tę samą prostą albo proste równoległe.'],
        [/^Prawe strony też/, 'Oba równania mówią to samo, więc każda para liczb spełniająca jedno spełnia też drugie.'],
        [/^Prawe strony nie/, 'Te same lewe strony nie mogą dać różnych wyników, więc żadna para liczb nie spełni obu równań.'],
        [/^Zamieniam strony$/, 'Równość działa w obie strony, a niewiadomą wygodniej mieć po lewej.'],
        [/^Liczę prawą stronę$/, 'Po lewej jest już sama niewiadoma, więc wystarczy policzyć prawą stronę.'],
        [/^Mnożę obie strony przez /, (s) => /przez .*[a-z(]/.test(s.label)
            ? 'Mianownik nie jest zerem (to daje dziedzina), więc mnożę przez niego obie strony i ułamek znika.'
            : 'Niewiadoma jest podzielona przez liczbę, więc mnożenie obu stron cofa to dzielenie.'],
        [/^Wyznaczam dziedzinę$/, 'Przez zero dzielić nie wolno, więc wykluczam liczby, które zerują mianownik.'],
        [/^Mnożę na krzyż$/, 'Dwa ułamki są równe, gdy licznik pierwszego razy mianownik drugiego daje to samo co na odwrót.'],
        [/^Sprawdzam dziedzinę$/, 'Rozwiązanie nie może zerować mianownika, więc sprawdzam, czy należy do dziedziny.'],
        [/^Odrzucam rozwiązanie spoza dziedziny$/, 'Ta liczba zeruje mianownik pierwotnego równania, więc nie jest rozwiązaniem.'],
        [/^Szukam pierwiastka/, 'Sprawdzam dzielniki liczby bez $x$. Jeśli któryś daje 0, mam rozwiązanie $r$ i nawias $(x-r)$.'],
        [/^Nie ma pierwiastków wymiernych/, 'Żaden dzielnik wyrazu wolnego nie zeruje wielomianu, więc prościej go nie rozłożymy.'],
        [/^Wyłączam wspólny czynnik/, 'Ten sam czynnik jest w każdym wyrazie, więc wyciągam go przed nawias.'],
        [/^Nie ma wspólnego czynnika/, 'Żaden czynnik nie powtarza się we wszystkich wyrazach.'],
        [/^Zmienna się skróciła/, 'Po uproszczeniu zostało zdanie fałszywe, więc żadna liczba nie spełnia równania.'],
        [/^Brak rozwiązań$/, 'Żadna liczba nie spełnia równania.'],
        [/^Wyznaczam (?!A i B$)/, 'Chcę mieć tę niewiadomą samą po jednej stronie.'],
        [/^Mianownik jest kwadratem$/, 'Kwadrat nie jest ujemny, więc wystarczy sprawdzić, kiedy jest zerem.'],
        [/^Zmiana znaku$|^Zmieniam znak$/, 'Minus przed liczbą zmienia jej znak na przeciwny.'],
        // ── ułamki i kolejność działań ──
        [/^Sprowadzam do wspólnego mianownika/, (s) => s.dens
            ? '$' + s.dens[2] + '$ to najmniejsza liczba, którą dzielą $' + s.dens[0] + '$ i $' + s.dens[1] + '$, więc rozszerzam do niej oba ułamki.'
            : 'Dodawać i odejmować można tylko ułamki o tym samym mianowniku.'],
        [/^Mnożę ułamki$/, 'Licznik mnożę przez licznik, a mianownik przez mianownik.'],
        [/^Dzielę ułamki$/, 'Dzielenie przez ułamek to mnożenie przez jego odwrotność: licznik i mianownik zamieniają się miejscami.'],
        [/liczniki$/, 'Mianowniki są już równe, więc dodajemy albo odejmujemy tylko liczniki, a mianownik przepisujemy.'],
        [/^(Dodaję|Odejmuję|Mnożę|Dzielę|Potęguję)$|^Najpierw nawias/, (_s, _t, c) => c.prev && /^(Dodaję|Odejmuję|Mnożę|Dzielę|Potęguję)$|^Najpierw nawias/.test(c.prev.label)
            ? 'Dalej według kolejności działań.'
            : 'Kolejność działań: najpierw nawiasy, potem potęgi, mnożenie i dzielenie, na końcu dodawanie i odejmowanie.'],
        [/^Dzielę licznik przez mianownik$/, 'Ułamek to dzielenie, więc dzielę licznik przez mianownik.'],
        [/^Wyciągam kwadrat spod pierwiastka$/, 'Z pełnego kwadratu pierwiastek jest dokładny: $\\sqrt{4\\cdot 2}=\\sqrt{4}\\cdot\\sqrt{2}=2\\sqrt{2}$.'],
        [/^Liczę pierwiastek$/, 'Szukam liczby, która podniesiona do kwadratu da liczbę pod pierwiastkiem.'],
        [/^Wymnażam nawiasy$/, 'Mnożę każdy wyraz z jednego nawiasu przez każdy wyraz z drugiego.'],

        // ── pochodne ──
        [/^Rozpoznaję iloczyn$/, 'Funkcja to iloczyn dwóch części zależnych od $x$. Nazywam je $u$ i $v$, żeby użyć wzoru na pochodną iloczynu.'],
        [/^Rozpoznaję iloraz$/, 'Funkcja to ułamek: licznik nazywam $u$, mianownik $v$, żeby użyć wzoru na pochodną ilorazu.'],
        [/^Wstawiam do wzoru$/, 'Mam już $u$, $v$ i ich pochodne. Wstawiam je do wzoru w tej samej kolejności co we wzorze.'],
        [/^Liczę pochodną złożoną$/, 'W środku nie stoi samo $x$, tylko dłuższe wyrażenie, więc sama tablica nie wystarczy.'],
        [/^Liczę pochodną każdego wyrazu$|^Rozbijam na sumę pochodnych$/, 'Pochodną sumy liczymy wyraz po wyrazie, a pochodna stałej to 0.'],
        [/^Stała zostaje przed pochodną$/, 'Liczba przed funkcją nie zmienia się przy liczeniu pochodnej, zostaje jako mnożnik.'],
        [/^Mnożę przez pochodną środka$/, 'Kończę wzór na funkcję złożoną: wstawiam policzoną pochodną środka i mnożę.'],
        [/^Mnożę przez stałą$/, 'Liczba, która została przed pochodną, mnoży teraz wynik.'],
        [/^Liczę pochodną potęgi$/, (s) => {
            const n = powerOf(s.math, POW);
            if (!n) return 'Wykładnik schodzi przed zmienną, a potęga maleje o 1.';
            if (n[0] === n[1]) return 'Tu $n=1$, bo $x=x^{1}$, a $x^{0}=1$.';
            return 'Tu $n=' + texRat(n[0], n[1]) + '$, a nowy wykładnik to $' + texRat(n[0] - n[1], n[1]) + '$.';
        }],
        [/^Korzystam z tablicy pochodnych$/, 'Pod funkcją stoi samo $x$, więc nic więcej nie trzeba liczyć.'],
        [/^Wstawiam policzoną całkę$/, 'Mała całka jest już policzona, więc wstawiam ją na jej miejsce we wzorze.'],
        [/^Całkuję każdą część$/, (s) => /cos\(2/.test(s.math) ? 'W $\\cos 2x$ jest w środku $2x$, więc całkując, dzielę jeszcze przez 2.' : 'Obie części są w tablicy całek, więc wyniki od razu przepisuję.'],
        [/^Składam całość$/, 'Dopisuję czynnik, który wcześniej wyłączyłem przed nawias.'],
        [/^Składam wynik$/, 'Wstawiam policzone części do wzoru i zapisuję całość.'],
        // ── całki ──
        [/^Całka sumy/, 'Całkę sumy liczymy jako sumę całek każdego składnika.'],
        [/^Stałą wyłączam przed całkę$/, 'Liczba przed funkcją nie zmienia się przy całkowaniu, zostaje jako mnożnik.'],
        [/^Mnożę przez wyłączoną stałą$/, 'Na końcu mnożę wynik przez liczbę, którą wcześniej wyłączyłem przed całkę.'],
        [/^Całkuję stałą$/, 'Całka z liczby $k$ to $k\\cdot x$, bo $(k\\cdot x)^{\\prime}=k$.'],
        [/^Całkuję przez części$/, 'Pod całką jest iloczyn. Jeden czynnik różniczkuję ($u$), drugi całkuję ($dv$), żeby powstała prostsza całka.'],
        [/^Podstawiam do wzoru$/, 'Wstawiamy $u$, $v$ i $du$ do wzoru na całkowanie przez części.'],
        [/^Podstawienie: /, 'Zastępujemy wnętrze jedną literą, żeby całka wyglądała jak wzór z tablicy.'],
        [/^Wracam do zmiennej /, 'Na końcu zamieniamy literę pomocniczą z powrotem na wyrażenie z początku.'],
        [/^Całkuję potęgę$/, (s) => {
            const n = powerOf(s.math, INT_POW);
            if (!n) return 'To odwrotność pochodnej potęgi.';
            const m = texRat(n[0] + n[1], n[1]);
            const x = (/⟦∫ ([a-z])/.exec(s.math) || ['', 'x'])[1];
            return 'Tu $n=' + texRat(n[0], n[1]) + '$, więc w wyniku jest $' + x + '^{' + m + '}$ i dzielenie przez $' + m + '$.';
        }],
        [/^Korzystam z tablicy całek$/, 'Ta funkcja jest w tablicy całek, więc wynik od razu przepisuję.'],
        [/^Korzystam z tożsamości$/, (s) => s.formula && s.formula.id === 'tg-kwadrat'
            ? 'Po zamianie nie ma już kwadratu tangensa, a obie części umiemy scałkować.'
            : 'Po zamianie zostają dwie łatwe całki: ze stałej i z $\\cos 2x$.'],
        [/^Rozkładam mianownik$/, 'Mianownik ma dwa miejsca zerowe, więc rozkłada się na dwa nawiasy; każdy da osobny, prostszy ułamek.'],
        [/^Zapisuję ułamki proste$/, 'Szukam liczb $A$ i $B$. Mnożę obie strony przez mianownik, żeby pozbyć się ułamków.'],
        [/^Wyznaczam A i B$/, 'Wstawiam miejsca zerowe mianownika: wtedy jeden nawias jest zerem i zostaje tylko jedna niewiadoma.'],
        [/^Rozkład na ułamki proste$/, 'Dzielimy ułamek na prostsze części, z których każdą umiemy scałkować.'],
        [/^Liczę F\(b\) − F\(a\)$/, 'Najpierw górna granica, potem dolna; kolejność jest ważna, bo odejmujemy.'],
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
