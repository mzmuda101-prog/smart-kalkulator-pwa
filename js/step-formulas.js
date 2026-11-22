// @ts-check
(function () {
    'use strict';
    // Słownik wzorów użytych w krokach (spec 5.12). Krok wskazuje wzór polem `formula: { id }`,
    // a fragment, w którym wzór działa, jest w jego tekście w ⟦…⟧ (podkreślony, do stuknięcia).
    // tex — rysunek wzoru; why — „po co tu”; level — skąd jest; more — dłuższe wyjaśnienie.
    // W why/more kawałki między $…$ to LaTeX (rysowany jak na kartce, bez zapisu z klawiatury).
    /** @type {Record<string, {name: string, tex: string, why: string, level: string, more: string[]}>} */
    const FORMULAS = {
        e: {
            name: 'Wzór na liczbę e',
            tex: '\\left(1+\\frac{1}{a_{n}}\\right)^{a_{n}}\\to e\\quad\\text{gdy } a_{n}\\to\\pm\\infty',
            why: 'Podstawa dąży do 1, a wykładnik do nieskończoności (symbol $1^{\\infty}$). Zapisujemy podstawę jako '
                + '$1+\\frac{1}{a_{n}}$, a podkreśloną potęgę zastępujemy przez $e$.',
            level: 'Studia: analiza matematyczna, granice ciągów',
            more: [
                'Liczba $e\\approx 2{,}71828$ to granica $\\left(1+\\frac{1}{n}\\right)^{n}$ przy $n\\to\\infty$. Tak się ją często definiuje.',
                'Dla $n=10$ wychodzi około 2,594, dla $n=100$ około 2,705, a dla $n=1000$ około 2,717. Wartości rosną i zbliżają się do $e$.',
                'Dlaczego nie 1? Podstawa jest tylko trochę większa (albo mniejsza) od 1, ale podnosimy ją do coraz większej potęgi. '
                    + 'Te dwa efekty się równoważą, dlatego $1^{\\infty}$ to symbol nieoznaczony: wynik zależy od tego, jak szybko każda część dąży do swojej granicy.',
                'Wzór działa dla każdego ciągu $a_{n}$, który dąży do $+\\infty$ albo do $-\\infty$, nie tylko dla $n$. Na przykład '
                    + '$\\left(1-\\frac{1}{n}\\right)^{n}=\\left[\\left(1+\\frac{1}{-n}\\right)^{-n}\\right]^{-1}$, czyli $a_{n}=-n$, '
                    + 'więc granica to $e^{-1}=\\frac{1}{e}$.',
            ],
        },
        sprzezenie: {
            name: 'Sprzężenie: wzór na różnicę kwadratów',
            tex: '(a-b)(a+b)=a^{2}-b^{2}',
            why: 'Mnożymy różnicę z pierwiastkiem przez ten sam nawias z przeciwnym znakiem. Podniesione do kwadratu pierwiastki znikają, '
                + 'a w podkreślonym miejscu zostaje zwykłe wyrażenie bez pierwiastka.',
            level: 'Liceum: wzory skróconego mnożenia; w granicach: studia',
            more: [
                'Przykład: $\\left(\\sqrt{x+4}-3\\right)\\left(\\sqrt{x+4}+3\\right)=(x+4)-9=x-5$. Pierwiastka już nie ma.',
                'Żeby nie zmienić wartości, mnożymy i licznik, i mianownik przez ten sam nawias. To tak, jakbyśmy mnożyli przez 1.',
                'Przy $n\\to\\infty$ różnica pierwiastków daje $\\infty-\\infty$, a po sprzężeniu w mianowniku stoi suma, która już nie sprawia kłopotu.',
            ],
        },
        'roznica-szescianow': {
            name: 'Różnica sześcianów',
            tex: 'a^{3}-b^{3}=(a-b)\\left(a^{2}+ab+b^{2}\\right)',
            why: 'Przy pierwiastkach trzeciego stopnia kwadrat nie wystarczy. Mnożymy przez $a^{2}+ab+b^{2}$, żeby powstało $a^{3}-b^{3}$, a sześcian usuwa $\\sqrt[3]{\\ }$.',
            level: 'Liceum (rozszerzenie); w granicach: studia',
            more: [
                'Tu $a$ i $b$ to dwa pierwiastki sześcienne z zadania, np. $a=\\sqrt[3]{n^{3}+8n^{2}}$.',
                'W mianowniku zostaje suma $a^{2}+ab+b^{2}$, która rośnie i nie daje już $\\infty-\\infty$.',
            ],
        },
        'roznica-czwartych': {
            name: 'Różnica czwartych potęg',
            tex: 'a^{4}-b^{4}=(a-b)\\left(a^{3}+a^{2}b+ab^{2}+b^{3}\\right)',
            why: 'Przy pierwiastkach czwartego stopnia mnożymy przez długi nawias, żeby powstało $a^{4}-b^{4}$. Czwarta potęga usuwa $\\sqrt[4]{\\ }$.',
            level: 'Studia: analiza matematyczna',
            more: ['To ten sam pomysł co przy różnicy kwadratów i sześcianów: dobieramy mnożnik tak, żeby pierwiastek zniknął.'],
        },
        'pierwiastek-z-kwadratu': {
            name: 'Pierwiastek z kwadratu',
            tex: '\\sqrt{x^{2}}=\\left|x\\right|',
            why: 'Pierwiastek nigdy nie daje liczby ujemnej, więc z kwadratu wychodzi wartość bezwzględna. Gdy $x\\to-\\infty$, $x$ jest ujemne i $\\left|x\\right|=-x$.',
            level: 'Liceum',
            more: [
                'Przykład: $x=-5$. Wtedy $\\sqrt{(-5)^{2}}=\\sqrt{25}=5$, czyli $-x$, a nie $x$.',
                'Bez tego wynik granicy przy $x\\to-\\infty$ miałby zły znak.',
            ],
        },
        'log-iloraz': {
            name: 'Różnica logarytmów',
            tex: '\\log_{a}f-\\log_{a}g=\\log_{a}\\frac{f}{g},\\quad k\\log_{a}f=\\log_{a}f^{k}',
            why: 'Z dwóch logarytmów robimy jeden. W środku zostaje ułamek, a jego granicę już umiemy policzyć.',
            level: 'Liceum: logarytmy',
            more: ['Liczba przed logarytmem wchodzi do środka jako potęga: $2\\log_{4}(4n+5)=\\log_{4}(4n+5)^{2}$.'],
        },
        'potega-ilorazu': {
            name: 'Potęga ilorazu',
            tex: '\\frac{a^{g}}{b^{g}}=\\left(\\frac{a}{b}\\right)^{g}',
            why: 'Gdy licznik i mianownik mają ten sam wykładnik, ułamek potęg to potęga ułamka. Wtedy widać postać $1^{\\infty}$ i wzór na $e$.',
            level: 'Szkoła podstawowa i liceum: potęgi',
            more: ['Czasem trzeba najpierw zapisać wykładnik inaczej, np. $(n+3)^{2g}=\\left((n+3)^{2}\\right)^{g}$.'],
        },
        sinu: {
            name: 'Granica sin u przez u',
            tex: '\\frac{\\sin u}{u}\\to 1\\quad\\text{gdy } u\\to 0',
            why: 'Pod sinusem i w mianowniku musi stać to samo $u$, które dąży do 0. Dlatego czasem mnożymy i dzielimy przez liczbę, '
                + 'np. $\\frac{\\sin 3x}{x}=\\frac{\\sin 3x}{3x}\\cdot 3$. Podkreślony ułamek zastępujemy jedynką.',
            level: 'Studia: analiza matematyczna, granice funkcji',
            more: [
                'Dla małych kątów sinus jest prawie równy samemu kątowi: $\\sin 0{,}1\\approx 0{,}09983$, więc $\\frac{\\sin 0{,}1}{0{,}1}\\approx 0{,}998$.',
                'Wzór działa tylko dla kąta w radianach. W stopniach granica wynosiłaby $\\frac{\\pi}{180}$.',
                'Tak samo działają $\\frac{\\operatorname{tg} u}{u}\\to 1$, $\\frac{\\arcsin u}{u}\\to 1$ i $\\frac{\\operatorname{arctg} u}{u}\\to 1$.',
            ],
        },
        ln1u: {
            name: 'Granica ln(1 + u) przez u',
            tex: '\\frac{\\ln(1+u)}{u}\\to 1\\quad\\text{gdy } u\\to 0',
            why: 'W logarytmie musi stać $1+u$, a w mianowniku to samo $u$, które dąży do 0. Podkreślony ułamek zastępujemy jedynką.',
            level: 'Studia: analiza matematyczna, granice funkcji',
            more: [
                'Przykład: $\\frac{\\ln 1{,}01}{0{,}01}\\approx 0{,}995$. Im mniejsze $u$, tym bliżej 1.',
                'Skąd to? $\\frac{\\ln(1+u)}{u}=\\ln\\left(1+u\\right)^{\\frac{1}{u}}$, a $\\left(1+u\\right)^{\\frac{1}{u}}\\to e$. Zostaje $\\ln e=1$.',
                'Często trzeba najpierw zobaczyć $u$: w $\\ln x$ przy $x\\to 1$ mamy $u=x-1$.',
            ],
        },
        eu: {
            name: 'Granica (eᵘ − 1) przez u',
            tex: '\\frac{e^{u}-1}{u}\\to 1\\quad\\text{gdy } u\\to 0',
            why: 'W wykładniku i w mianowniku musi stać to samo $u$, które dąży do 0. Podkreślony ułamek zastępujemy jedynką.',
            level: 'Studia: analiza matematyczna, granice funkcji',
            more: [
                'Przykład: $\\frac{e^{0{,}01}-1}{0{,}01}\\approx 1{,}005$.',
                'To nachylenie wykresu $y=e^{x}$ w punkcie $x=0$. Wzór $(e^{x})^{\\prime}=e^{x}$ wynika właśnie z tej granicy.',
                'Ogólniej $\\frac{a^{u}-1}{u}\\to\\ln a$; dla $a=e$ wychodzi $\\ln e=1$.',
            ],
        },
        lhospital: {
            name: "Reguła de l'Hospitala",
            tex: '\\lim\\frac{f}{g}=\\lim\\frac{f^{\\prime}}{g^{\\prime}}\\quad\\text{gdy wychodzi }\\left[\\frac{0}{0}\\right]\\text{ albo }\\left[\\frac{\\infty}{\\infty}\\right]',
            why: 'Wstawienie dało $\\left[\\frac{0}{0}\\right]$ albo $\\left[\\frac{\\infty}{\\infty}\\right]$. Wtedy liczymy osobno pochodną licznika i osobno pochodną mianownika.',
            level: 'Studia: analiza matematyczna, pochodne',
            more: [
                'To nie jest pochodna ilorazu! Liczymy $f^{\\prime}$ i $g^{\\prime}$ osobno, bez wzoru na $\\left(\\frac{f}{g}\\right)^{\\prime}$.',
                'Działa tylko dla $\\left[\\frac{0}{0}\\right]$ i $\\left[\\frac{\\infty}{\\infty}\\right]$. Dla $\\frac{1}{0}$ albo $\\frac{2}{3}$ dałaby zły wynik.',
                'Jeśli granica $\\frac{f^{\\prime}}{g^{\\prime}}$ nie istnieje, reguła nic nie mówi: $\\frac{x+\\sin x}{x}\\to 1$ przy $x\\to\\infty$, a $\\frac{1+\\cos x}{1}$ granicy nie ma.',
            ],
        },
        nieoznaczone: {
            name: 'Symbol nieoznaczony',
            tex: '\\left[\\frac{0}{0}\\right],\\ \\left[\\frac{\\infty}{\\infty}\\right],\\ \\left[\\infty-\\infty\\right],\\ \\left[0\\cdot\\infty\\right],\\ \\left[1^{\\infty}\\right]',
            why: 'Nawias kwadratowy pokazuje, co wychodzi po wstawieniu. To nie jest liczba: wynik może być dowolny, więc najpierw przekształcamy wyrażenie.',
            level: 'Liceum (rozszerzenie) i studia: granice',
            more: [
                'Wszystkie trzy dają $\\left[\\frac{0}{0}\\right]$ przy $x\\to 0^{+}$, a wyniki są różne: $\\frac{x}{x}\\to 1$, $\\frac{x^{2}}{x}\\to 0$, $\\frac{x}{x^{2}}\\to+\\infty$.',
                'Nieoznaczone nie są np. $\\left[\\frac{1}{0^{+}}\\right]=+\\infty$ i $\\left[\\frac{5}{\\infty}\\right]=0$: tu wynik od razu wiadomo.',
                '$\\left[1^{\\infty}\\right]$ też jest nieoznaczony: podstawa bliska 1, ale wykładnik ogromny. Pomaga wzór na $e$.',
            ],
        },
    };
    // tg, arcsin, arctg: ten sam pomysł co sin u/u, inny wzór w dymku
    for (const [id, fn, name] of [['tgu', '\\operatorname{tg}', 'tg'], ['arcsinu', '\\arcsin', 'arcsin'], ['arctgu', '\\operatorname{arctg}', 'arctg']]) {
        FORMULAS[id] = Object.assign({}, FORMULAS.sinu, {
            name: 'Granica ' + name + ' u przez u',
            tex: '\\frac{' + fn + ' u}{u}\\to 1\\quad\\text{gdy } u\\to 0',
            why: 'Pod funkcją i w mianowniku musi stać to samo $u$, które dąży do 0. Podkreślony ułamek zastępujemy jedynką.',
        });
    }

    const API = { FORMULAS: FORMULAS };
    const g = /** @type {any} */ (typeof window !== 'undefined' ? window : globalThis);
    g.MATM0_FORMULAS = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
