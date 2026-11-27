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
    const SPRZ_NUM = 'Ta różnica z pierwiastkiem daje zero po wstawieniu liczby. ' + SAME;
    /** czy rozwiązanie idzie sposobem „Wzór skrócony” (krok z wzorem e-skrocony) @param {Ctx} c */
    const isShortcut = (c) => c.steps.some(x => !!x.formula && x.formula.id === 'e-skrocony');
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

    /** @typedef {{atInf: boolean, prev: Step | null, next: Step | null, steps: Step[]}} Ctx kontekst: granica w ±∞? kroki obok */
    /** @type {[RegExp, string | ((s: Step, title: string, c: Ctx) => string | null)][]} */
    const RULES = [
        // ── stwierdzenia: bez zdania (ta sama lista co STATEMENTS[0] w js/step-formulas.js; test/step-coverage.js pilnuje zgodności) ──
        [/^(Wynik|Odpowiedź|Liczby|Liczba|Równanie|Równanie trygonometryczne|Układ równań|Nierówność|Funkcja|Całka|Działanie|Wyrażenie|Wynik w przybliżeniu)$/, ''],
        // ── granice ──
        [/^Granica$/, (s, _t, c) => {
            const m = /\s\s\[⟦?([^\]⟧]+)⟧?\](?:\n.*)*$/.exec(s.math);
            if (m && TAG[m[1]]) return (s.formula ? TAG_SHORT : TAG)[m[1]];
            if (c.next && /^Zapisujemy podstawę jako 1 \+ 1\/aₙ/.test(c.next.label)) return TAG['1^∞']; // [EN] silnik nie zawsze nazywa 1^∞ (próg)
            // [EN] bez symbolu nie obiecujemy „nic nie przeszkadza” — silnik nie każdy kłopot nazywa (np. 0 · ∞)
            return 'Sprawdzamy, do czego zbliża się wyrażenie, gdy zmienna zbliża się do celu.';
        }],
        [/^Wyłączam liczbę spod pierwiastka$/, 'Wyrazy pod pierwiastkiem mają wspólny dzielnik, więc rozbijam pierwiastek na dwa, nawet gdy ten dzielnik nie jest kwadratem.'],
        // [EN] kolejność w mianowniku pod sprzężenie: (a − b)(a + b) = a² − b²
        [/^Wyłączam minus przed ułamek$/, (_s, _t, c) => c.next && /sprzężenie/.test(c.next.label)
            ? 'Odwracam kolejność w mianowniku, bo zaraz pomnożę przez sprzężenie: $(a-b)(a+b)=a^{2}-b^{2}$. Stąd minus z przodu.'
            : 'Zmieniam znak na dole, żeby pierwszy wyraz stał tam z plusem. Minus idzie na przód.'],
        [/^Wyłączam minus przed ułamek i skracam$/, 'Minus z mianownika idzie przed ułamek, a wspólny czynnik z góry i z dołu się skraca.'],
        [/^Wyłączam liczbę przed nawias$/, 'Wspólną liczbę wyłączam przed nawias, żeby było widać, który czynnik da się potem skrócić.'],
        [/^Wyłączam liczbę ujemną przed nawias$/, 'Wyłączam liczbę z minusem, żeby w nawiasie $x$ stał na początku, tak jak na dole. Wtedy ten nawias da się skrócić.'],
        [/^Wyłączam liczbę przed nawias i zmieniam znaki$/, 'Wyłączam liczbę i zmieniam znak na górze i na dole, żeby w obu miejscach $x$ stał na początku. Wtedy widać wspólny czynnik.'],
        [/^Zmieniam znak licznika i mianownika$/, (_s, _t, c) => c.next && /sprzężenie/.test(c.next.label)
            ? 'Zmieniam znak na górze i na dole, bo zaraz pomnożę przez sprzężenie: $(a-b)(a+b)=a^{2}-b^{2}$. Dwa minusy się znoszą.'
            : 'Zmieniam znak na górze i na dole. Dwa minusy się znoszą, więc ułamek ma tę samą wartość.'],
        [/^Przenoszę minus do (mianownika|licznika)$/, 'Minus sprzed ułamka chowam w jednej jego części, żeby dalej liczyć bez minusa z przodu.'],
        [/^Zapisuję to samo inaczej$/, 'Zapisuję ułamek w postaci, od której liczą kolejne kroki. Wartość się nie zmienia.'],
        [/^Podstawiamy \w → /, 'Zostały same ułamki ze zmienną na dole, więc od razu wstawiamy 0 za każdy z nich.'],
        [/^Podstawiamy /, (s) => /\//.test(s.math.replace(/^lim\([^)]*\)/, '')) ? 'W mianowniku nie wychodzi zero, więc wystarczy wstawić liczbę.'
            : 'Pozostał zwykły rachunek: za zmienną idzie liczba z granicy.'],
        [/^Wyrazy z \w w mianowniku dążą do 0$/, s => /[+−]∞$/.test(s.math)
            ? 'Ułamki znikają, ale zostaje potęga zmiennej, która rośnie bez końca, więc wynik to nieskończoność.'
            : /1\/.*→ 0$/.test(s.math) ? 'Z całości zostaje jedynka dzielona przez zmienną, czyli coś bliskiego zeru.'
                : 'Każdy taki ułamek ma już granicę 0, więc zostają same liczby.'],
        [/^Wyłączamy najwyższe potęgi/, 'Góra i dół mają różne potęgi, więc każdą wyciągamy osobno.'],
        [/^Wyłączamy .* przed nawias$/, 'Dzięki temu w nawiasie zostają liczby i ułamki, w których zmienna stoi na dole.'],
        [/^Skracamy \(/, (_s, _t, c) => c.atInf ? 'Po skróceniu zostają same składniki, w których zmienna stoi na dole.'
            : 'Ten nawias zerował licznik i mianownik naraz, stąd bierze się symbol $\\frac{0}{0}$. Po skróceniu wystarczy wstawić liczbę.'],
        [/^Skracamy /, 'Po skróceniu zostają same składniki, w których zmienna stoi na dole.'],
        [/^Wyłączam minus przed nawias$/, 'Wyłączamy minus, żeby nawias wyglądał tak samo jak w drugiej części ułamka. Wtedy da się go skrócić, a minus zostaje przed całością.'],
        [/^Zastrzegam dziedzinę$/, 'Przez zero nie wolno dzielić, więc pierwotny mianownik nie może być zerem. To zastrzeżenie zostaje także po skróceniu.'],
        [/^Skracam /, (_s, _t, c) => 'Ten sam nawias jest na górze i na dole, więc zostaje z nich tylko jedynka.'
            + (c.steps.some(x => x.label === 'Zastrzegam dziedzinę') ? ' Wynik dotyczy tylko x z zastrzeżenia.' : '')],
        [/^Mnożymy przez sprzężenie$/, (s, _t, c) => {
            const id = s.formula && s.formula.id;
            if (id === 'roznica-szescianow' || id === 'roznica-czwartych') return (id === 'roznica-szescianow' ? 'Tu stoją pierwiastki $\\sqrt[3]{\\ }$. ' : 'Tu stoją pierwiastki $\\sqrt[4]{\\ }$. ') + SAME;
            return c.atInf ? SPRZ_INF : SPRZ_NUM;
        }],
        [/^Wyciągamy \w spod pierwiastka$/, 'Pod pierwiastkiem wyłączam najwyższą potęgę zmiennej, a jej pierwiastek wychodzi przed znak pierwiastka.'],
        [/^Wyłączamy potęgę \w z każdego nawiasu$/, 'Każdy nawias ma swoją najwyższą potęgę. Wyciągam ją z każdego osobno i dodaję wykładniki, żeby wiedzieć, co skrócić.'],
        [/^Dzielimy potęgi: odejmujemy wykładniki$/, 'Każdy wyraz dzielę przez najwyższą potęgę. Przy dzieleniu potęg tej samej liczby wykładniki się odejmuje, także ułamkowe.'],
        [/^Redukujemy wyrazy podobne$/, 'Pierwiastek podniesiony do swojej potęgi znika, więc w liczniku zostaje zwykłe odejmowanie.'],
        [/^Wstawiamy do granicy$/, 'Zamiast różnicy z pierwiastkami wpisuję ułamek z poprzedniego kroku. Wartość jest ta sama.'],
        [/^Dzielimy przez ułamek$/, 'Ułamek stoi w mianowniku, więc odwracam go i mnożę. Tak łatwiej zobaczyć, co się skraca.'],
        [/^Mnożymy ułamki$/, 'Łączę dwa ułamki w jeden, a liczby od razu skracam.'],
        [/^Upraszczamy( licznik)?$/, (_s, _t, c) => c.prev && /sprzężenie/.test(c.prev.label)
            ? 'Wymnażamy: tam, gdzie była różnica z pierwiastkiem, pierwiastki się skasowały.'
            : 'Wymnażamy i zbieramy podobne wyrazy, żeby wyrażenie było krótsze.'],
        [/^Rozkładamy na czynniki$/, (_s, _t, c) => {
            const m = c.next && /^Skracamy \((.+)\)[⁰¹²³⁴⁵⁶⁷⁸⁹]*$/.exec(c.next.label);
            const br = m && '(' + m[1].replace(/ − /g, '-').replace(/ \+ /g, '+') + ')';
            return 'Wyszło $\\frac{0}{0}$, więc i licznik, i mianownik mają nawias $' + (br || '(x-a)') + '$. Wyciągamy go, żeby potem skrócić.';
        }],
        [/^Dzielimy schematem Hornera$/, (s) => {
            const r = s.horner && s.horner[0] && s.horner[0].r;
            if (r == null) return 'Dzielimy licznik i mianownik przez nawias, który się w nich powtarza.';
            const sgn = r.startsWith('−') ? '+' + r.slice(1) : '-' + r;
            return 'Liczba $' + r.replace('−', '-') + '$ zeruje licznik i mianownik, więc oba dzielą się przez $' + (r === '0' ? 'x' : '(x' + sgn + ')') + '$.';
        }],
        [/^Zapisujemy podstawę jako 1 \+ 1\/aₙ$/, s => /^r = /m.test(s.math)
            ? 'Wzór na $e$ wymaga postaci $1+\\frac{1}{a_{n}}$ i $a_{n}$ w potędze. Wykładnik dzielimy przez $a_{n}$: wynik $r$ to reszta wykładnika.'
            : 'Wzór na $e$ wymaga postaci $1+\\frac{1}{\\text{coś}}$, a w potędze tego samego „coś”. Przerabiamy podstawę na ten kształt.'],
        [/^Kolorowa potęga dąży do e$/, 'W nawiasie jest $1+\\frac{1}{a_{n}}$, a nad nim to samo $a_{n}$. Resztę wykładnika liczymy osobno.'],
        [/^Granica wykładnika$/, (_s, _t, c) => isShortcut(c)
            ? 'Wzór skrócony daje $e$ do potęgi $\\lim g\\cdot(f-1)$, więc liczymy właśnie tę granicę.'
            : 'Środek nawiasu daje $e$. Zostaje policzyć, do czego dąży potęga nad nawiasem.'],
        [/^Składamy wynik$/, (s, _t, c) => {
            // [EN] czynnik i wykładnik odczytane z samego kroku („5 · e^(−1) = 5/e”), żeby zdanie mówiło dokładnie to, co widać
            const m = /^(?:(.+?) · )?e(?:\^\((.+?)\)|([⁰¹²³⁴⁵⁶⁷⁸⁹]+))?(?: = |$)/.exec(s.math);
            const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹', raw = m ? (m[2] || (m[3] ? [...m[3]].map(d => SUP.indexOf(d)).join('') : '1')) : null;
            const x = raw && raw.replace(/−/g, '-').replace(/^(-?)(\d+)\/(\d+)$/, '$1\\frac{$2}{$3}'), k = m && m[1] && m[1].replace(/−/g, '-');
            const OLD = 'Znamy już granicę wykładnika, więc składam odpowiedź jako $e$ z tą liczbą w potędze.';
            if (!x) return OLD;
            const ep = x === '1' ? 'e' : 'e^{' + x + '}';
            if (isShortcut(c)) return 'Wykładnik dąży do $' + x + '$, więc granica potęgi to $' + ep + '$.';
            return k ? 'Stały czynnik $' + k + '$ zostaje przed granicą, a potęga daje $' + ep + '$, więc wynik to $' + k + '\\cdot ' + ep + '$.' : OLD;
        }],
        [/^Potęga e$/, 'Liczba $e$ do coraz większej potęgi rośnie bez końca, a do coraz bardziej ujemnej spada do 0.'],
        [/^Dla \w → −∞$/, (s) => /√\(.²\)/.test(s.math) ? 'Tu zmienna jest ujemna, więc wyciągając ją spod pierwiastka, piszemy przed nim minus.'
            : 'To przygotowanie do następnego kroku: tam przed nawias trafi $\\sqrt{-x}$.'],
        [/^Korzystamy ze znanej granicy$/, 'Dopasowujemy wyrażenie do kształtu ze wzoru, nie zmieniając jego wartości.'],
        [/^Kolorowy ułamek dąży do 1$/, 'Kolorowa część wyrażenia dąży do 1, więc w iloczynie zostaje sama reszta.'],
        [/^Reguła de l'Hospitala$/, (_s, _t, c) => c.prev && /^Reguła de l'Hospitala$/.test(c.prev.label)
            ? 'Po pierwszym razie znowu wychodzi symbol nieoznaczony, więc stosujemy regułę drugi raz.'
            // [EN] zdanie „da się już policzyć” tylko wtedy, gdy następny krok to podstawienie
            : c.next && /^(Wyłączamy|Wyciągamy|Dla \w → )/.test(c.next.label) ? 'Po regule znowu wychodzi $\\frac{\\infty}{\\infty}$, więc dalej liczymy jak przy granicy w nieskończoności: wyłączamy najwyższą potęgę.'
            : c.next && !/^(Podstawiamy|Wynik)/.test(c.next.label) ? 'Po pochodnych ułamek nadal daje symbol nieoznaczony, więc przekształcamy go dalej.'
            : 'Pochodne licznika i mianownika są prostsze od nich samych i ich ułamek da się już policzyć.'],
        [/^Sprowadzamy do wspólnego mianownika$/, 'Ułamki można dodać albo odjąć dopiero wtedy, gdy mają ten sam mianownik.'],
        [/^Zapisujemy oba wykładniki tak samo$/, 'Przerabiamy potęgi tak, żeby góra i dół ułamka miały nad sobą to samo.'],
        [/^Rozbijamy na dwie różnice$/, 'Dzielimy wyrażenie na dwie części, z których każda jest zwykłą różnicą pierwiastków.'],
        [/^Dodajemy granice$/, 'Obie granice już mamy, zostaje działanie na dwóch liczbach.'],
        [/^Łączymy logarytmy/, 'Zamiast dwóch logarytmów zostaje jeden, z ułamkiem w środku.'],
        [/^Każdy ułamek daje logarytm$/, 'Każdą część liczymy osobno, a potem dodajemy logarytmy.'],
        [/^Logarytm jest ciągły$/, 'Ułamek pod logarytmem ma już granicę, więc liczymy samą wartość logarytmu.'],
        [/^Logarytm rośnie bez ograniczeń$/, 'To, co jest w logarytmie, rośnie bez końca, więc logarytm też rośnie bez końca.'],
        [/^Granica jednostronna/, 'Mianownik dąży do 0, a licznik nie. Dzielimy przez coraz mniejszą liczbę, więc wynik rośnie bez końca; znak zależy od strony.'],
        [/^Granice jednostronne są różne$/, 'Z lewej strony wychodzi co innego niż z prawej, więc jednej granicy nie ma.'],
        [/^Usuwamy niewymierność z mianownika$/, 'Wynik zapisujemy bez pierwiastka w mianowniku, tak jak w szkole.'],
        // ── równania ──
        [/^Opuszczam nawiasy$/, (s) => /\)\(/.test(s.math) || /\)²/.test(s.math) ? 'Każdy wyraz jednego nawiasu mnożę przez każdy wyraz drugiego.'
            : 'Bez nawiasów widać, które wyrazy są podobne, i można je potem zebrać.'],
        [/^Przenoszę (\w|liczby|liczbę) /, 'Chcę mieć niewiadomą po jednej stronie, a liczby po drugiej. Przeniesiony wyraz zmienia znak.'],
        [/^Przenoszę wszystko na lewą stronę$/, 'Po prawej zostaje 0, a z postaci „coś = 0” łatwo odczytać współczynniki.'],
        [/^Porządkuję i redukuję wyrazy podobne$/, 'Porządkuję wyrazy: te z niewiadomą razem, liczby razem.'],
        [/^Redukuję wyrazy podobne$/, 'Dodaję wyrazy tego samego rodzaju: niewiadome z niewiadomymi, liczby z liczbami.'],
        [/^Skracam ułamek$/, 'Licznik i mianownik dzielą się przez tę samą liczbę, więc ułamek zapisuję prościej.'],
        [/^Dzielę obie strony przez /, (_s, title) => title === 'Nierówność'
            ? 'Dzielę przez liczbę dodatnią, więc znak nierówności zostaje bez zmian.'
            : 'Przy niewiadomej stoi jeszcze liczba, a po tym kroku niewiadoma zostaje sama i widać wynik.'],
        [/^Sprawdzenie$/, (_s, title) => /Całka/.test(title)
            ? 'Różniczkuję wynik: jeśli wróci funkcja spod całki, to rachunek jest dobry.'
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
        [/^Zmieniam znak obu stron$/, 'Po lewej jest niewiadoma z minusem, a szukam jej bez minusa.'],
        [/^Dzielę przez .* i odwracam znak$/, 'Przy niewiadomej stoi minus, więc razem z dzieleniem obracam też znak.'],
        [/^Odczytuję znak z paraboli$/, (s) => {
            const p = s.parabola;
            if (!p) return 'Znak trójmianu zależy od tego, czy ramiona paraboli idą w górę, czy w dół.';
            const arms = p.up ? 'Ramiona paraboli idą w górę' : 'Ramiona paraboli idą w dół';
            if (!p.roots) return arms + ', a parabola nie przecina osi, więc znak jest wszędzie ten sam.';
            if (p.roots === 1) return arms + ' i parabola tylko dotyka osi: poza tym punktem jest wszędzie ' + (p.up ? 'nad osią (dodatnia).' : 'pod osią (ujemna).');
            const sign = p.between === p.up ? 'ujemne' : 'dodatnie';
            return arms + ': wartości ' + sign + ' są ' + (p.between ? 'między miejscami zerowymi.' : 'na zewnątrz miejsc zerowych.');
        }],
        [/^Porządkuję równania$/, 'Ustawiam oba równania tak samo: niewiadome po lewej w tej samej kolejności, liczba po prawej.'],
        [/^Podstawiam do (pierwszego|drugiego) równania$/, 'Zamiast tej litery wpisuję to, co wyszło w poprzednim kroku.'],
        [/^Wstawiam \w = .* do (pierwszego|drugiego) równania$/, 'Znam już jedną niewiadomą, więc z dowolnego równania wyliczę drugą.'],
        [/^Wstawiam \w = [^ ]+$/, 'Policzoną liczbę wstawiam do wyrażenia wyznaczonego na początku i dostaję drugą wartość.'],
        [/^Mnożę (pierwsze|drugie) przez/, 'Chcę, żeby przy jednej niewiadomej stały przeciwne liczby. Wtedy po dodaniu równań ta niewiadoma zniknie.'],
        [/^Dodaję równania stronami$/, 'Lewą stronę dodaję do lewej, prawą do prawej. Przeciwne wyrazy się znoszą i zostaje jedna niewiadoma.'],
        [/^Lewe strony są proporcjonalne$/, 'Drugie równanie po lewej to pierwsze pomnożone przez liczbę, więc oba opisują tę samą prostą albo proste równoległe.'],
        [/^Prawe strony też/, 'Oba równania mówią to samo, więc każda para liczb spełniająca jedno spełnia też drugie.'],
        [/^Prawe strony nie/, 'Te same lewe strony nie mogą dać różnych wyników, więc żadna para liczb nie spełni obu równań.'],
        [/^Rozbijam na dwa przypadki$/, (s) => / lub /.test(s.math) && /[<>≤≥]/.test(s.math)
            ? 'Wartość bezwzględna jest duża, gdy liczba w środku jest daleko od zera: albo bardzo ujemna, albo bardzo dodatnia.'
            : 'Wartość bezwzględna to odległość od zera, więc w środku może stać liczba dodatnia albo ujemna.'],
        [/^Rozwiązuję oba przypadki$/, 'Każdy przypadek to zwykłe równanie liniowe; oba wyniki są rozwiązaniami.'],
        [/^Zamieniam na podwójną nierówność$/, 'Odległość od zera mniejsza niż liczba oznacza, że wnętrze leży między tą liczbą ze znakiem minus i plus.'],
        [/^Rozwiązuję podwójną nierówność$/, 'Te same działania wykonuję na wszystkich trzech częściach naraz.'],
        [/^Wartość bezwzględna nie jest ujemna$/, 'Odległość od zera nigdy nie jest ujemna, a to rozstrzyga nierówność bez liczenia.'],
        [/^Wartość bezwzględna jest zerem tylko dla zera$/, 'Odległość od zera wynosi zero tylko wtedy, gdy wnętrze jest zerem.'],
        [/^Wartość bezwzględna jest dodatnia poza zerem$/, 'Odległość od zera jest dodatnia wszędzie, poza punktem, w którym wnętrze jest zerem.'],
        [/^Pierwiastek nie jest ujemny$/, 'Pierwiastek kwadratowy nigdy nie daje liczby ujemnej, więc równanie nie ma rozwiązań.'],
        [/^Podnoszę obie strony do kwadratu$/, 'Lewa i prawa część są równe, więc po podniesieniu do potęgi 2 nadal będą równe.'],
        [/^Odrzucam fałszywe rozwiązanie$/, 'Ta liczba spełnia równanie po podniesieniu do kwadratu, ale w oryginale pierwiastek równałby się liczbie ujemnej.'],
        [/^Sprawdzam rozwiązania$/, 'Wstawiam każdą liczbę do równania z pierwiastkiem: lewa i prawa strona wychodzą równe.'],
        [/^(Sinus|Cosinus) przyjmuje wartości od −1 do 1$/, 'Ta liczba leży poza przedziałem od −1 do 1, więc żaden kąt jej nie daje.'],
        [/^Odczytuję kąt z tablicy$/, 'Szukam kąta, dla którego funkcja daje tę wartość. Takie kąty warto znać na pamięć.'],
        [/^Zapisuję wszystkie rozwiązania$/, (s) => / lub /.test(s.math)
            ? 'Wykres powtarza się co $2\\pi$, a w każdym okresie ta wartość pojawia się dwa razy.'
            : /[+=] ⟦?kπ/.test(s.math) ? 'Ta wartość powtarza się co $\\pi$, więc do kąta dodaję dowolną wielokrotność $\\pi$.'
                : 'Wykres powtarza się co $2\\pi$, więc do kąta dodaję dowolną wielokrotność $2\\pi$.'],
        [/^Wyliczam \w$/, 'Dzielę każdą serię przez liczbę przy niewiadomej; okres też się dzieli.'],
        [/^Rozkładam na czynniki pierwsze$/, 'Dzielę każdą liczbę przez najmniejsze liczby pierwsze, aż zostanie 1. Wtedy widać, z czego się składa.'],
        [/^Mnożę wspólne czynniki$/, 'Biorę czynniki, które są w każdej liczbie, tyle razy, ile występują najmniej. Ich iloczyn dzieli wszystkie liczby.'],
        [/^Mnożę czynniki w najwyższej potędze$/, 'Biorę każdy czynnik tyle razy, ile najwięcej występuje. Ten iloczyn dzieli się przez każdą z liczb.'],
        [/^Nie ma wspólnych czynników$/, 'Liczby nie mają wspólnego czynnika pierwszego, więc jedynym wspólnym dzielnikiem jest 1.'],
        [/^Liczę p$/, 'Wstawiam $a$ i $b$ z tej funkcji; $p$ to pierwsza współrzędna wierzchołka.'],
        [/^Liczę q$/, 'Wstawiam $p$ za $x$ do wzoru i liczę drugą współrzędną wierzchołka.'],
        [/^Zapisuję postać kanoniczną$/, 'Postać $a(x-p)^{2}+q$ od razu pokazuje wierzchołek i to, czy parabola idzie w górę, czy w dół.'],
        [/^Zamieniam procent na ułamek$/, 'Liczę, ile to setnych: liczbę procentów dzielę przez 100.'],
        [/^Mnożę ułamek przez liczbę$/, 'Ułamek z poprzedniego kroku mówi, jaką część tej liczby bierzemy.'],
        [/^Liczę procent z liczby$/, 'Najpierw sprawdzam, ile to jest ten procent z liczby.'],
        [/^Dodaję procent do liczby$/, 'Do wyjściowej kwoty dokładam część policzoną przed chwilą.'],
        [/^Odejmuję procent od liczby$/, 'Od wyjściowej kwoty zabieram część policzoną przed chwilą.'],
        [/^Zapisuję część jako ułamek$/, 'Część dzielona przez całość mówi, jaki to kawałek całości.'],
        [/^Zamieniam ułamek na procent$/, 'Ułamek razy 100% daje procent: ile setnych części całości to jest.'],
        [/^Zamieniam strony$/, 'Równość działa w obie strony, a niewiadomą wygodniej mieć po lewej.'],
        [/^Zapisuję ułamek przy x jako liczbę razy x$/, 'Przy $x$ widać wtedy jedną liczbę, przez którą potem podzielę albo pomnożę obie strony.'],
        [/^Liczę prawą stronę$/, 'Lewa strona się nie zmienia, więc liczę tylko prawą stronę.'],
        [/^Upraszczam lewą stronę$/, 'Prawa strona się nie zmienia, a lewą zapisuję krócej: to ta sama wartość.'],
        [/^Upraszczam obie strony$/, 'Liczę to, co da się policzyć po obu stronach, żeby zostało krótkie równanie.'],
        [/^Mnożę obie strony przez /, (s) => /przez .*[a-z(]/.test(s.label)
            ? 'Po pomnożeniu niewiadoma wychodzi z dołu ułamka, a liczby spoza dziedziny odrzucę na końcu.'
            : 'Mnożę przez odwrotność liczby stojącej przy niewiadomej, żeby niewiadoma została sama.'],
        [/^Wyznaczam dziedzinę$/, (s) => / ≥ 0/.test(s.math) ? 'Pierwiastek kwadratowy liczymy tylko z liczb nieujemnych i sam nie jest ujemny.'
            : / > 0/.test(s.math) ? 'Logarytm istnieje tylko dla liczb dodatnich, więc argument musi być większy od zera.'
            : 'Przez zero dzielić nie wolno, więc wykluczam liczby, które zerują mianownik.'],
        [/^Zapisuję obie strony jako potęgi /, 'Szukam jednej liczby, której potęgami da się zapisać obie liczby z tego zadania.'],
        [/^Liczę wykładnik ze wzoru skróconego$/, 'Podstawa $f$ jest prawie jedynką, więc o wyniku decyduje $g$ razy $(f-1)$, a nie sam wykładnik.'],
        [/^Porównuję wykładniki$/, 'Na dole po obu stronach stoi teraz ta sama liczba, więc wystarczy przyrównać to, co na górze.'],
        [/^Zapisuję wykładnik jako logarytm$/, 'Prawej strony nie zamienię na potęgę z prostym wykładnikiem, więc wynik zostaje w postaci logarytmu.'],
        [/^Porównuję argumenty logarytmów$/, 'Logarytmy o tej samej podstawie są równe tylko wtedy, gdy równe są liczby pod nimi.'],
        [/^Korzystam z definicji logarytmu$/, 'Pozbywam się logarytmu: zostaje zwykłe równanie, które umiem rozwiązać.'],
        [/^Mnożę na krzyż$/, 'Dwa ułamki są równe, gdy licznik pierwszego razy mianownik drugiego daje to samo co na odwrót.'],
        [/^Sprawdzam dziedzinę$/, 'Rozwiązanie musi należeć do dziedziny, inaczej wyjściowe równanie nie miałoby dla niego sensu.'],
        [/^Odrzucam rozwiązanie spoza dziedziny$/, 'Ta liczba nie należy do dziedziny, więc wyjściowe równanie nie ma dla niej sensu.'],
        [/^Dzielę schematem Hornera$/, (s, _t, c) => {
            const br = / w (liczniku|mianowniku)$/.test(s.label) && !(c.prev && /^Szukam pierwiastka/.test(c.prev.label)) && /: \(([^)]*)\)⟧/.exec(s.math);
            // [EN] w granicy pierwiastek znamy z 0/0 — bez szukania wśród dzielników
            return br ? 'Wstawienie dało $\\frac{0}{0}$, więc ten wielomian zeruje się w tym punkcie i dzieli się przez $(' + br[1].replace(/ − /g, '-').replace(/ \+ /g, '+') + ')$.'
                : 'Wiem już, że nawias z tym pierwiastkiem dzieli wielomian, więc liczę, co zostaje po podzieleniu.';
        }],
        [/^Zapisuję iloczyn$/, 'Wielomian to dzielnik razy wynik dzielenia, więc rozpisuję go na dwa nawiasy.'],
        [/^Szukam dwóch liczb o sumie/, 'Sprawdzam pary dzielników wyrazu wolnego, aż zgodzi się też suma.'],
        [/^Szukam pierwiastka/, (s) => /dzielniki/.test(s.math) ? 'Całkowity pierwiastek takiego wielomianu musi dzielić liczbę bez $x$, więc sprawdzam jej dzielniki, aż któryś da 0.' : 'Szukam liczby, dla której wielomian daje 0. Wtedy nawias z tą liczbą dzieli wielomian.'],
        [/^Nie ma pierwiastków wymiernych/, 'Żaden dzielnik wyrazu wolnego nie zeruje wielomianu, więc prościej go nie rozłożymy.'],
        [/^Wyłączam wspólny czynnik/, (s, _t, c) => s.formula ? (c.steps.indexOf(s) <= 1 ? 'Zaczynam od tego, bo po wyjęciu wspólnej części w nawiasie zostaje prostsze wyrażenie.'
            : 'Wszystkie wyrazy tego wielomianu mają wspólną część; po jej wyjęciu w nawiasie zostaje prostsze wyrażenie.')
            : 'Ten sam czynnik jest w każdym wyrazie, więc wyciągam go przed nawias.'],
        // ── rozkład jak w szkole ──
        [/^Zwijam kwadrat (sumy|różnicy)$/, 'Sprawdzam, czy pierwszy i ostatni wyraz to kwadraty i czy środkowy pasuje; jeśli tak, wystarczy jeden nawias.'],
        [/^Rozkładam (różnicę|sumę) sześcianów$/, 'Liczbę zapisuję jako trzecią potęgę, więc od razu widzę, co wstawić za $a$ i $b$.'],
        [/^Grupuję wyrazy w pary$/, 'Patrzę na pierwsze dwa i ostatnie dwa wyrazy osobno: po wyjęciu z nich czegoś zostaje ten sam nawias.'],
        [/^Wyłączam wspólny nawias$/, 'Oba składniki mają ten sam nawias, więc wyciągam go przed nawias jak zwykłą liczbę.'],
        [/^Podstawiam [tu] w miejsce /, 'Tu największa potęga to podwojona środkowa, więc po zamianie zostaje trójmian, który już umiem rozłożyć.'],
        [/^Wracam do [a-z]$/, 'Zamiast litery pomocniczej wpisuję z powrotem potęgę, bo wynik ma być zapisany przez wyjściową zmienną.'],
        [/^Wciągam liczbę do nawiasu$/, 'Zamiast ułamka w nawiasie wolę liczby całkowite, bo tak zapisuje się czynniki.'],
        [/^Porządkuję czynniki$/, (s) => {
            const [l, r] = s.math.split(' = '), lead = (/** @type {string} */ t) => (/^[^(a-z]*/.exec(t) || [''])[0];
            return r !== undefined && lead(l) !== lead(r) ? 'Liczby z nawiasów wyjmuję przed iloczyn i ustawiam nawiasy w stałej kolejności.'
                : 'To ten sam iloczyn, tylko nawiasy ustawiam w stałej kolejności, jak w wyniku.';
        }],
        [/^Odkładam minus$/, 'Liczby pierwsze są dodatnie, więc rozkładam liczbę bez minusa, a minus dopisuję przed wynik.'],
        [/^Dzielę przez kolejne liczby pierwsze$/, 'Dzielę przez najmniejszą liczbę pierwszą, przez którą się da, aż zostanie 1.'],
        [/^Zbieram czynniki pierwsze$/, 'Liczby, przez które dzieliłem, dają razem wyjściową liczbę; powtórzone zapisuję jako potęgę.'],
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
            : 'Z tego, co zostało w wyrażeniu, najpierw liczę to, co stoi wyżej w kolejności działań.'],
        [/^Dzielę licznik przez mianownik$/, 'Licznik jest za wysoki na rozkład, więc najpierw wyciągam z niego całość, a zostaje reszta nad tym samym mianownikiem.'],
        [/^Wyciągam kwadrat spod pierwiastka$/, 'Z pełnego kwadratu pierwiastek jest dokładny: $\\sqrt{4\\cdot 2}=\\sqrt{4}\\cdot\\sqrt{2}=2\\sqrt{2}$.'],
        [/^Liczę pierwiastek$/, 'Szukam liczby, która podniesiona do kwadratu da liczbę pod pierwiastkiem.'],
        [/^Wymnażam nawiasy$/, 'Mnożę każdy wyraz z jednego nawiasu przez każdy wyraz z drugiego.'],

        // ── pochodne ──
        [/^Rozpoznaję iloczyn$/, 'Nazywam obie części literami $u$ i $v$, żeby potem łatwo wstawić je do wzoru.'],
        [/^Rozpoznaję iloraz$/, 'Funkcja to ułamek: licznik nazywam $u$, mianownik $v$, żeby użyć wzoru na pochodną ilorazu.'],
        [/^Wstawiam do wzoru$/, 'Mam już $u$, $v$ i ich pochodne. Wstawiam je do wzoru w tej samej kolejności co we wzorze.'],
        [/^Liczę pochodną złożoną$/, 'W środku nie stoi samo $x$, tylko dłuższe wyrażenie, więc sama tablica nie wystarczy.'],
        [/^Liczę pochodną każdego wyrazu$|^Rozbijam na sumę pochodnych$/, 'Pochodną sumy liczymy wyraz po wyrazie, a pochodna stałej to 0.'],
        [/^Stała zostaje przed pochodną$/, 'Czynnik bez zmiennej, po której liczę pochodną, odsuwam na bok. Inna litera też jest takim czynnikiem.'],
        [/^Mnożę przez pochodną środka$/, 'Kończę wzór na funkcję złożoną: wstawiam policzoną pochodną środka i mnożę.'],
        [/^Mnożę przez stałą$/, 'Na koniec dokładam odsunięty czynnik do gotowego wyniku.'],
        [/^Liczę pochodną potęgi$/, (s) => {
            const n = powerOf(s.math, POW);
            if (!n) return 'Wykładnik schodzi przed zmienną, a potęga maleje o 1.';
            if (n[0] === n[1]) return 'Tu $n=1$, bo $x=x^{1}$, a $x^{0}=1$.';
            return 'Tu $n=' + texRat(n[0], n[1]) + '$, a nowy wykładnik to $' + texRat(n[0] - n[1], n[1]) + '$.';
        }],
        [/^Korzystam z tablicy pochodnych$/, 'Pod funkcją stoi samo $x$, więc nic więcej nie trzeba liczyć.'],
        [/^Wstawiam policzoną całkę$/, 'Mała całka jest już policzona, więc wstawiam ją na jej miejsce we wzorze.'],
        [/^Całkuję każdą część$/, (s) => /cos\(2/.test(s.math) ? 'W $\\cos 2x$ jest w środku $2x$, więc całkując, dzielę jeszcze przez 2.' : 'Obie części są w tablicy całek, więc wyniki od razu przepisuję.'],
        [/^Składam całość$/, 'Zbieram nawiasy z poprzednich kroków w jeden iloczyn: to rozkład całego wyrażenia.'],
        [/^Składam wynik$/, 'Wstawiam policzone części do wzoru i zapisuję całość.'],
        // ── całki ──
        [/^Całka sumy/, 'Całkę sumy liczymy jako sumę całek każdego składnika.'],
        [/^Stałą wyłączam przed całkę$/, 'Czynnik liczbowy odsuwam na bok, a całkuję samo wyrażenie z $x$.'],
        [/^Mnożę przez wyłączoną stałą$/, 'Na końcu mnożę wynik przez liczbę, którą wcześniej wyłączyłem przed całkę.'],
        [/^Całkuję stałą$/, 'Całka z liczby $k$ to $k\\cdot x$, bo $(k\\cdot x)^{\\prime}=k$.'],
        [/^Całkuję przez części$/, 'Wybieram $u$ tak, żeby po zróżniczkowaniu się uprościło, a $dv$ tak, żeby łatwo je scałkować.'],
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
        [/^Rozkładam mianownik$/, 'Najpierw rozkładam mianownik na nawiasy, bo od nich zależą ułamki, na które rozbijemy całą całkę.'],
        [/^Zapisuję ułamki proste$/, 'Szukam liczb $A$ i $B$. Mnożę obie strony przez mianownik, żeby pozbyć się ułamków.'],
        [/^Wyznaczam A i B$/, 'Biorę miejsca zerowe mianownika, bo przy nich w równaniu zostaje tylko jedna niewiadoma.'],
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
        const ctx = { atInf: !!head && /∞/.test(head[1]), prev: k > 0 ? all[k - 1] : null, next: k >= 0 && k + 1 < all.length ? all[k + 1] : null, steps: all };
        const label = step.label.replace(/ w (liczniku|mianowniku)$/, ''); // [EN] rozkład szkolny w granicy: ten sam krok, tylko podpisana strona ułamka
        for (const [re, why] of RULES) {
            if (!re.test(label)) continue;
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
