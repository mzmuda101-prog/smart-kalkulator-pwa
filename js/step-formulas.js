// @ts-check
(function () {
    'use strict';
    // Słownik wzorów użytych w krokach (spec 5.12). Krok wskazuje wzór polem `formula: { id }`,
    // a fragment, w którym wzór działa, jest w jego tekście w ⟦…⟧ (wyróżniony kolorem, do stuknięcia).
    // tex — rysunek wzoru; why — „po co tu”; level — skąd jest; more — dłuższe wyjaśnienie.
    // W why/more kawałki między $…$ to LaTeX (rysowany jak na kartce, bez zapisu z klawiatury).
    /** @type {Record<string, {name: string, tex: string, why: string, level: string, more: string[], dzial?: string, poziom?: 'lp'|'lr'|'st', keywords?: string[], try?: string, expect?: string, related?: string[]}>} */
    const FORMULAS = {
        e: {
            name: 'Wzór na liczbę e',
            tex: '\\left(1+\\frac{1}{a_{n}}\\right)^{a_{n}}\\to e\\quad\\text{gdy } a_{n}\\to\\pm\\infty',
            why: 'Podstawa dąży do 1, a wykładnik do nieskończoności (symbol $1^{\\infty}$). Zapisujemy podstawę jako '
                + '$1+\\frac{1}{a_{n}}$, a kolorową potęgę zastępujemy przez $e$.',
            level: 'Studia: analiza matematyczna, granice ciągów',
            more: [
                'Skąd ta liczba: z procentu składanego. Wkładamy 1 zł na 100% rocznie. Gdy odsetki dopisuje się raz na rok, po roku jest 2 zł. Gdy dwa razy, po pół roku dochodzi połowa, potem połowa od większej kwoty: $\\left(1+\\frac{1}{2}\\right)^{2}=2{,}25$. Przy $n$ dopisaniach mamy $\\left(1+\\frac{1}{n}\\right)^{n}$, a im częściej, tym bliżej jest liczba $e$, której ta kwota nigdy nie przekroczy.',
                'Liczba $e\\approx 2{,}71828$ to granica $\\left(1+\\frac{1}{n}\\right)^{n}$ przy $n\\to\\infty$. Tak się ją często definiuje.',
                'Dla $n=10$ wychodzi około 2,594, dla $n=100$ około 2,705, a dla $n=1000$ około 2,717. Wartości rosną i zbliżają się do $e$.',
                'Dlaczego nie 1? Podstawa jest tylko trochę większa (albo mniejsza) od 1, ale podnosimy ją do coraz większej potęgi. '
                    + 'Te dwa efekty się równoważą, dlatego $1^{\\infty}$ to symbol nieoznaczony: wynik zależy od tego, jak szybko każda część dąży do swojej granicy.',
                'Wzór działa dla każdego ciągu $a_{n}$, który dąży do $+\\infty$ albo do $-\\infty$, nie tylko dla $n$. Na przykład '
                    + '$\\left(1-\\frac{1}{n}\\right)^{n}=\\left[\\left(1+\\frac{1}{-n}\\right)^{-n}\\right]^{-1}$, czyli $a_{n}=-n$, '
                    + 'więc granica to $e^{-1}=\\frac{1}{e}$.',
                'Skąd nazwa: Jakob Bernoulli w 1683 roku, licząc właśnie procent składany, zauważył, że kwota rośnie do jakiejś granicy między 2 a 3. Oznaczenie $e$ wprowadził Leonhard Euler w pierwszej połowie XVIII wieku. To, że litera pochodzi od jego nazwiska, jest raczej legendą, bo sam tego nigdzie nie tłumaczył.',
            ],
        },
        sprzezenie: {
            name: 'Sprzężenie: wzór na różnicę kwadratów',
            tex: '(a-b)(a+b)=a^{2}-b^{2}',
            why: 'Mnożymy różnicę z pierwiastkiem przez ten sam nawias z przeciwnym znakiem. Podniesione do kwadratu pierwiastki znikają, '
                + 'a w kolorowym miejscu zostaje zwykłe wyrażenie bez pierwiastka.',
            level: 'Liceum: wzory skróconego mnożenia; w granicach: studia',
            more: [
                'Przykład: $\\left(\\sqrt{x+4}-3\\right)\\left(\\sqrt{x+4}+3\\right)=(x+4)-9=x-5$. Pierwiastka już nie ma.',
                'Żeby nie zmienić wartości, mnożymy i licznik, i mianownik przez ten sam nawias. To tak, jakbyśmy mnożyli przez 1.',
                'Przy $n\\to\\infty$ różnica pierwiastków daje $\\infty-\\infty$, a po sprzężeniu w mianowniku stoi suma, która już nie sprawia kłopotu.',
                'Skąd wzór: mnożymy każdy wyraz przez każdy: $(a-b)(a+b)=a\\cdot a+a\\cdot b-b\\cdot a-b\\cdot b$. Środkowe wyrazy się znoszą i zostaje $a^{2}-b^{2}$. Gdy $a$ albo $b$ jest pierwiastkiem, każdy nawias go zawiera, a iloczyn już nie, bo pierwiastek trafia do kwadratu.',
                'Skąd nazwa: łacińskie „coniugare” (od „con” i „iugum”, czyli wspólne jarzmo) znaczy „sprzęgać, łączyć w parę”. Wyrażenia $a-b$ i $a+b$ tworzą właśnie taką parę.',
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
        'suma-szescianow': {
            name: 'Suma sześcianów',
            tex: 'a^{3}+b^{3}=(a+b)\\left(a^{2}-ab+b^{2}\\right)',
            why: 'Sumę dwóch sześcianów zapisujemy jako nawias z sumą razy nawias, w którym środkowy wyraz ma minus.',
            level: 'Liceum, zakres rozszerzony: wzory skróconego mnożenia',
            more: [
                'Skąd wzór: wymnażamy prawą stronę, każdy wyraz pierwszego nawiasu przez każdy wyraz drugiego. Wychodzi $a^{3}-a^{2}b+ab^{2}+a^{2}b-ab^{2}+b^{3}$. Wyrazy $-a^{2}b$ i $+a^{2}b$ się znoszą, tak samo $+ab^{2}$ i $-ab^{2}$. Zostaje $a^{3}+b^{3}$, czyli lewa strona.',
                'Przykład: $x^{3}+8=x^{3}+2^{3}=(x+2)(x^{2}-2x+4)$. Tu $a=x$, a $b=2$, bo $2^{3}=8$.',
                'Znaki: w pierwszym nawiasie stoi ten sam znak co między sześcianami, a w drugim środkowy wyraz ma znak przeciwny. Drugi nawias nie ma miejsc zerowych (jego delta jest ujemna), więc dalej się nie rozkłada.',
                'Skąd nazwa: sześcian liczby to jej trzecia potęga, bo tyle wynosi objętość sześcianu o krawędzi $a$: $a\\cdot a\\cdot a=a^{3}$.',
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
            why: 'Różnica logarytmów o tej samej podstawie to logarytm ilorazu. Granicę ułamka już umiemy policzyć.',
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
        'potega-iloczynu': {
            name: 'Potęga iloczynu, mnożenie i dzielenie potęg',
            tex: '(ab)^{k}=a^{k}b^{k},\\qquad n^{p}\\cdot n^{q}=n^{p+q},\\qquad \\frac{n^{p}}{n^{q}}=n^{p-q}',
            why: 'Iloczyn podnosimy do potęgi, podnosząc każdy czynnik osobno. Potęgi tej samej liczby mnożymy, dodając wykładniki.',
            level: 'Szkoła podstawowa i liceum: potęgi',
            more: [
                'Przykład: $(2n^{2}+3)^{2}=\\left(n^{2}\\left(2+\\frac{3}{n^{2}}\\right)\\right)^{2}=n^{4}\\left(2+\\frac{3}{n^{2}}\\right)^{2}$, bo $(n^{2})^{2}=n^{4}$.',
                'Przykład: $n^{4}\\cdot n^{5}\\cdot n=n^{4+5+1}=n^{10}$.',
                'Dzielenie: $\\frac{3n^{1/4}}{n^{4/3}}=\\frac{3}{n^{4/3-1/4}}=\\frac{3}{n^{13/12}}$, bo $\\frac{4}{3}-\\frac{1}{4}=\\frac{16-3}{12}$.',
                'Skąd wzór: $(ab)^{2}=ab\\cdot ab=a\\cdot a\\cdot b\\cdot b=a^{2}b^{2}$; kolejność mnożenia nie ma znaczenia.',
            ],
        },
        sinu: {
            name: 'Granica sin u przez u',
            tex: '\\frac{\\sin u}{u}\\to 1\\quad\\text{gdy } u\\to 0',
            why: 'Pod sinusem i w mianowniku musi stać to samo $u$, które dąży do 0. Dlatego czasem mnożymy i dzielimy przez liczbę, '
                + 'np. $\\frac{\\sin 3x}{x}=\\frac{\\sin 3x}{3x}\\cdot 3$. Kolorowy ułamek zastępujemy jedynką.',
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
            why: 'W logarytmie musi stać $1+u$, a w mianowniku to samo $u$, które dąży do 0. Kolorowy ułamek zastępujemy jedynką.',
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
            why: 'W wykładniku i w mianowniku musi stać to samo $u$, które dąży do 0. Kolorowy ułamek zastępujemy jedynką.',
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
        delta: {
            name: 'Delta (wyróżnik)',
            tex: '\\Delta=b^{2}-4ac',
            why: 'Równanie ma postać $ax^{2}+bx+c=0$. Liczba $\\Delta$ mówi, ile ma rozwiązań: $\\Delta>0$ dwa, $\\Delta=0$ jedno, $\\Delta<0$ żadnego.',
            level: 'Liceum, zakres podstawowy: funkcja kwadratowa',
            more: [
                'Skąd wzór: dopełniamy do kwadratu. Na przykładzie $x^{2}+6x+5=0$: ponieważ $x^{2}+6x=(x+3)^{2}-9$, równanie to $(x+3)^{2}=4$. W ogólnym równaniu dzielimy przez $a$: $x^{2}+\\frac{b}{a}x+\\frac{c}{a}=0$, i tak samo dopełniamy: $x^{2}+\\frac{b}{a}x=\\left(x+\\frac{b}{2a}\\right)^{2}-\\frac{b^{2}}{4a^{2}}$. Po przeniesieniu wychodzi $\\left(x+\\frac{b}{2a}\\right)^{2}=\\frac{b^{2}-4ac}{4a^{2}}$. Lewa strona to kwadrat, więc nie bywa ujemna, a mianownik $4a^{2}$ jest dodatni. O wszystkim decyduje licznik $b^{2}-4ac$, i to właśnie jest $\\Delta$.',
                'Co z tego wynika: gdy $\\Delta<0$, kwadrat musiałby być ujemny, więc rozwiązań nie ma. Gdy $\\Delta=0$, kwadrat jest zerem i rozwiązanie jest jedno. Gdy $\\Delta>0$, kwadrat ma dwa pierwiastki, dodatni i ujemny. W przykładzie $\\Delta=36-20=16$, więc $x+3=2$ albo $x+3=-2$, czyli $x=-1$ albo $x=-5$.',
                'Delta to część wzoru na rozwiązania, która stoi pod pierwiastkiem. Dlatego jej znak decyduje o wszystkim: z liczby ujemnej pierwiastka nie policzymy.',
                'Na wykresie: $\\Delta>0$ znaczy, że parabola przecina oś $x$ w dwóch miejscach, $\\Delta=0$ że dotyka jej w jednym, $\\Delta<0$ że nie dotyka wcale.',
                'Uwaga na nawias: przy $b=-5$ liczymy $(-5)^{2}=25$, a nie $-5^{2}=-25$.',
                'Skąd nazwa: angielskie słowo „discriminant” (po polsku wyróżnik) wprowadził w 1851 roku James Joseph Sylvester. Łacińskie „discriminare” znaczy „rozróżniać”, a ta liczba rozróżnia przypadki: dwa, jedno albo zero rozwiązań.',
            ],
        },
        'wzory-x12': {
            name: 'Wzory na rozwiązania równania kwadratowego',
            tex: 'x_{1}=\\frac{-b-\\sqrt{\\Delta}}{2a},\\quad x_{2}=\\frac{-b+\\sqrt{\\Delta}}{2a}',
            why: 'Delta jest dodatnia, więc wstawiamy $-b$, $\\sqrt{\\Delta}$ i $2a$ do wzorów. Raz z minusem, raz z plusem przed pierwiastkiem.',
            level: 'Liceum, zakres podstawowy: funkcja kwadratowa',
            more: [
                'Skąd wzór: z dopełnienia do kwadratu (zobacz hasło o delcie) mamy $\\left(x+\\frac{b}{2a}\\right)^{2}=\\frac{\\Delta}{4a^{2}}$. Pierwiastkujemy obie strony, pamiętając o dwóch znakach: $x+\\frac{b}{2a}=\\pm\\frac{\\sqrt{\\Delta}}{2a}$. Przenosimy $\\frac{b}{2a}$ na prawo i dostajemy oba wzory naraz. Gdy $a<0$, pierwiastek z $4a^{2}$ to $-2a$, a nie $2a$, ale znak $\\pm$ i tak obejmuje oba przypadki, więc wzór się nie zmienia. Pierwiastkować wolno tylko przy $\\Delta\\ge 0$.',
                'Zapis $-b$ znaczy „liczba przeciwna do $b$”. Gdy $b=-5$, to $-b=5$.',
                'Mianownik to $2a$, czyli dwa razy liczba przy $x^{2}$, a nie samo 2.',
                'Wzory biorą się z dopełnienia do kwadratu: $ax^{2}+bx+c=0$ przekształca się do $\\left(x+\\frac{b}{2a}\\right)^{2}=\\frac{\\Delta}{4a^{2}}$, a potem pierwiastkujemy obie strony.',
            ],
        },
        'wzor-x0': {
            name: 'Jedno rozwiązanie, gdy delta jest zerem',
            tex: 'x_{0}=\\frac{-b}{2a}',
            why: 'Przy $\\Delta=0$ pierwiastek z delty to 0, więc oba wzory dają tę samą liczbę.',
            level: 'Liceum, zakres podstawowy: funkcja kwadratowa',
            more: ['Na wykresie to wierzchołek paraboli, który leży dokładnie na osi $x$.'],
        },
        bezout: {
            name: 'Pierwiastek wielomianu daje nawias',
            tex: 'W(r)=0\\ \\Rightarrow\\ W(x)=(x-r)\\cdot Q(x)',
            why: 'Jeśli liczba $r$ zeruje wielomian, to wielomian dzieli się przez $(x-r)$ bez reszty. Zostaje wielomian o stopień niższy.',
            level: 'Liceum, zakres rozszerzony: wielomiany (twierdzenie Bézouta)',
            more: [
                'Pierwiastka całkowitego szukamy wśród dzielników wyrazu wolnego: dla $x^{3}-6x^{2}+11x-6$ to $\\pm 1$, $\\pm 2$, $\\pm 3$, $\\pm 6$.',
                'Dzielenie robimy schematem Hornera albo zwykłym dzieleniem pisemnym wielomianów.',
            ],
        },
        'roznica-kwadratow': {
            name: 'Różnica kwadratów',
            tex: 'a^{2}-b^{2}=(a-b)(a+b)',
            why: 'Różnicę dwóch kwadratów od razu zapisujemy jako iloczyn dwóch nawiasów.',
            level: 'Liceum: wzory skróconego mnożenia',
            more: ['Przykład: $x^{2}-9=x^{2}-3^{2}=(x-3)(x+3)$.'],
        },
        'wylaczanie-przed-nawias': {
            name: 'Wyłączanie wspólnego czynnika przed nawias',
            tex: 'ab+ac=a(b+c)',
            why: 'Jeśli każdy składnik sumy ma ten sam czynnik, wypisujemy go raz przed nawiasem, a w nawiasie zostawiamy resztę.',
            level: 'Liceum: rozkład wielomianów na czynniki',
            more: [
                'Skąd wzór: znasz mnożenie nawiasu przez liczbę, np. $a(b+c)=ab+ac$ (każdy składnik w nawiasie mnożymy przez $a$). Tutaj czytamy ten sam zapis od prawej do lewej: skoro $ab$ i $ac$ mają wspólne $a$, to $ab+ac=a(b+c)$. Sprawdzasz, mnożąc z powrotem.',
                'Przykład: $x^{3}-x=x\\cdot x^{2}-x\\cdot 1=x(x^{2}-1)$. W nawiasie stoi różnica kwadratów, więc rozkładamy dalej: $x(x^{2}-1)=x(x-1)(x+1)$.',
                'Co wyłączać: największą wspólną liczbę i najniższą potęgę $x$, która występuje w każdym składniku. Zacznij od tego kroku, bo zostaje prostszy nawias.',
                'Skąd nazwa: czynnik „wyłączamy” ze składników sumy i stawiamy przed nawiasem.',
            ],
        },
        'grupowanie-wyrazow': {
            name: 'Grupowanie wyrazów',
            tex: 'ax+ay+bx+by=(a+b)(x+y)',
            why: 'Gdy wspólnego czynnika nie mają wszystkie wyrazy, łączymy je w pary. Z każdej pary wyłączamy czynnik tak, żeby w nawiasach zostało to samo.',
            level: 'Liceum: rozkład wielomianów na czynniki',
            more: [
                'Skąd wzór: z pierwszej pary wyłączamy $a$, z drugiej $b$: $ax+ay+bx+by=a(x+y)+b(x+y)$. Teraz oba składniki mają wspólny czynnik $(x+y)$, więc wyłączamy go przed nawias (tak samo jak przy wspólnej liczbie) i dostajemy $(a+b)(x+y)$.',
                'Przykład: $x^{3}-2x^{2}+x-2=x^{2}(x-2)+1\\cdot(x-2)=(x-2)(x^{2}+1)$. Parę $x^{3}-2x^{2}$ i parę $x-2$ dobieramy tak, żeby po wyłączeniu w obu nawiasach stało $(x-2)$.',
                'Jeśli nawiasy wychodzą różne, spróbuj innego podziału na pary albo innego znaku wyłączanego czynnika (np. $-1$ zamiast $1$).',
                'Skąd nazwa: wyrazy grupujemy, czyli łączymy w pary, a dopiero potem wyłączamy.',
            ],
        },
        'podstawienie-t': {
            name: 'Podstawienie t = x² (równanie dwukwadratowe)',
            tex: 'ax^{4}+bx^{2}+c=0,\\quad t=x^{2}\\ \\Rightarrow\\ at^{2}+bt+c=0',
            why: 'Gdy w równaniu są tylko $x^{4}$, $x^{2}$ i liczba, podstawiamy $t=x^{2}$. Wychodzi zwykłe równanie kwadratowe względem $t$.',
            level: 'Liceum, zakres rozszerzony: równania wielomianowe',
            more: [
                'Skąd wzór: $x^{4}=(x^{2})^{2}$, czyli $x^{4}=t^{2}$, gdy $t=x^{2}$. Wtedy $x^{4}-5x^{2}+4$ zapisujemy jako $t^{2}-5t+4$. To równanie kwadratowe $t^{2}-5t+4=0$, które rozwiązujesz deltą albo sumą i iloczynem.',
                'Przykład: $x^{4}-5x^{2}+4=0$. Podstawiamy $t=x^{2}$ i mamy $t^{2}-5t+4=0$, stąd $t=1$ albo $t=4$. Wracamy do $x$: $x^{2}=1$ daje $x=-1$ lub $x=1$, a $x^{2}=4$ daje $x=-2$ lub $x=2$.',
                'Uwaga: $t=x^{2}$ nie może być ujemne. Jeśli któreś $t$ wyjdzie ujemne, z niego nie ma rozwiązań rzeczywistych. Pamiętaj o powrocie do $x$: rozwiązania $t$ to jeszcze nie rozwiązania równania.',
                'Skąd nazwa: takie równanie nazywa się dwukwadratowe, bo $x^{4}$ to kwadrat kwadratu, $(x^{2})^{2}$, więc jest to równanie kwadratowe dwa razy. Litera $t$ to tylko oznaczenie, może być dowolna.',
            ],
        },
        'postac-iloczynowa': {
            name: 'Postać iloczynowa',
            tex: 'ax^{2}+bx+c=a(x-x_{1})(x-x_{2})',
            why: 'Każde miejsce zerowe $x_{1}$, $x_{2}$ daje nawias $(x-x_{1})$. Przed nawiasami stoi liczba $a$ przy $x^{2}$.',
            level: 'Liceum, zakres podstawowy: funkcja kwadratowa',
            more: ['Sprawdzenie: po wymnożeniu nawiasów wraca wyrażenie z początku, np. $(x-2)(x-3)=x^{2}-5x+6$.'],
        },
        'kwadrat-sumy': {
            name: 'Kwadrat sumy',
            tex: '(a+b)^{2}=a^{2}+2ab+b^{2}',
            why: 'Kwadrat nawiasu to nawias razy nawias: każdy wyraz pierwszego mnożymy przez każdy wyraz drugiego.',
            level: 'Szkoła podstawowa i liceum: wzory skróconego mnożenia',
            more: ['Najczęstszy błąd: $(x+1)^{2}$ to nie $x^{2}+1$. Brakuje środka $2\\cdot x\\cdot 1=2x$.'],
        },
        'kwadrat-roznicy': {
            name: 'Kwadrat różnicy',
            tex: '(a-b)^{2}=a^{2}-2ab+b^{2}',
            why: 'Kwadrat nawiasu z minusem: oba kwadraty są z plusem, a minus dostaje tylko środkowy, podwojony iloczyn.',
            level: 'Szkoła podstawowa i liceum: wzory skróconego mnożenia',
            more: [
                'Skąd wzór: kwadrat to nawias razy nawias, $(a-b)^{2}=(a-b)(a-b)$. Mnożymy każdy wyraz przez każdy: $a\\cdot a-a\\cdot b-b\\cdot a+b\\cdot b$. Środkowe $-a\\cdot b$ i $-b\\cdot a$ to ten sam wyraz $-ab$, bo kolejność mnożenia nie ma znaczenia. Razem dają $-2ab$, więc wychodzi $a^{2}-2ab+b^{2}$.',
                'Przykład: $x^{2}-6x+9=x^{2}-2\\cdot x\\cdot 3+3^{2}=(x-3)^{2}$. Tu $a=x$, a $b=3$.',
                'Najczęstszy błąd: $(x-3)^{2}$ to nie $x^{2}-9$. Brakuje środka $-2\\cdot x\\cdot 3=-6x$, a $3^{2}$ dodajemy, nie odejmujemy.',
                'Przy rozkładzie: gdy pierwszy i ostatni wyraz trójmianu są kwadratami, sprawdź środek. Jeśli to minus ich podwojony iloczyn, trójmian jest kwadratem różnicy i ma jedno miejsce zerowe.',
                'Skąd nazwa: to kwadrat, czyli druga potęga, różnicy dwóch wyrażeń $a-b$.',
            ],
        },
        'pochodna-potegi': {
            name: 'Pochodna potęgi',
            tex: '\\left(x^{n}\\right)^{\\prime}=n\\cdot x^{n-1}',
            why: 'Wykładnik schodzi przed $x$, a nowy wykładnik jest o 1 mniejszy, np. $\\left(x^{3}\\right)^{\\prime}=3x^{2}$.',
            level: 'Liceum, zakres rozszerzony: rachunek różniczkowy',
            more: [
                'Szczególne przypadki: $(x)^{\\prime}=1$, bo $x=x^{1}$ i $1\\cdot x^{0}=1$; pochodna stałej to $0$.',
                'Wzór działa też dla wykładników ujemnych i ułamkowych, np. $\\left(\\frac{1}{x}\\right)^{\\prime}=\\left(x^{-1}\\right)^{\\prime}=-x^{-2}$.',
                'Stała przy potędze zostaje: $\\left(5x^{2}\\right)^{\\prime}=5\\cdot 2x=10x$.',
            ],
        },
        'pochodna-iloczynu': {
            name: 'Pochodna iloczynu',
            tex: '(u\\cdot v)^{\\prime}=u^{\\prime}\\cdot v+u\\cdot v^{\\prime}',
            why: 'Funkcja to iloczyn dwóch czynników zależnych od $x$. Pochodna to: pochodna pierwszego razy drugi plus pierwszy razy pochodna drugiego.',
            level: 'Liceum, zakres rozszerzony: rachunek różniczkowy',
            more: [
                'Skąd wzór: z pola prostokąta o bokach $u$ i $v$. Gdy boki urosną o małe kawałki $\\Delta u$ i $\\Delta v$, pole urośnie o dwa paski i mały róg: $(u+\\Delta u)(v+\\Delta v)-uv=v\\,\\Delta u+u\\,\\Delta v+\\Delta u\\,\\Delta v$. Dzielimy przez przyrost $\\Delta x$: dostajemy $v\\frac{\\Delta u}{\\Delta x}+u\\frac{\\Delta v}{\\Delta x}+\\frac{\\Delta u}{\\Delta x}\\Delta v$. Pierwsze dwa ułamki dążą do $u^{\\prime}$ i $v^{\\prime}$. W rogu $\\frac{\\Delta u}{\\Delta x}$ dąży do $u^{\\prime}$, a $\\Delta v$ do zera, więc cały róg znika. Zostają dwa paski, czyli $u^{\\prime}v+uv^{\\prime}$.',
                'To nie jest $u^{\\prime}\\cdot v^{\\prime}$. Na przykład $(x\\cdot x)^{\\prime}=\\left(x^{2}\\right)^{\\prime}=2x$, a $1\\cdot 1=1$.',
                'Kolejność składników nie zmienia wyniku, ale łatwiej sprawdzać, gdy trzymamy się wzoru.',
            ],
        },
        'pochodna-ilorazu': {
            name: 'Pochodna ilorazu',
            tex: '\\left(\\frac{u}{v}\\right)^{\\prime}=\\frac{u^{\\prime}\\cdot v-u\\cdot v^{\\prime}}{v^{2}}',
            why: 'Licznik $u$ i mianownik $v$ zależą od $x$. Wstawiamy $u$, $v$, $u^{\\prime}$ i $v^{\\prime}$ do wzoru.',
            level: 'Liceum, zakres rozszerzony: pochodne funkcji wymiernych',
            more: [
                'W liczniku jest minus, więc kolejność ma znaczenie: najpierw $u^{\\prime}\\cdot v$, potem odejmujemy $u\\cdot v^{\\prime}$.',
                'Mianownik to $v$ do kwadratu. Zwykle zostawiamy go w nawiasie, np. $(x+1)^{2}$, bez wymnażania.',
            ],
        },
        'pochodna-zlozona': {
            name: 'Pochodna funkcji złożonej',
            tex: '\\left(f(g(x))\\right)^{\\prime}=f^{\\prime}(g(x))\\cdot g^{\\prime}(x)',
            why: 'W środku funkcji siedzi inne wyrażenie, np. $\\sin\\left(x^{2}\\right)$. Liczymy pochodną zewnętrznej (środek bez zmian) i mnożymy przez pochodną środka.',
            level: 'Studia: analiza matematyczna (w liceum zwykle poza programem)',
            more: [
                'Najczęstszy błąd: zapomnieć o pochodnej środka. $\\left(\\sin\\left(x^{2}\\right)\\right)^{\\prime}=\\cos\\left(x^{2}\\right)\\cdot 2x$, a nie samo $\\cos\\left(x^{2}\\right)$.',
                'Tak samo z potęgą nawiasu: $\\left((3x+1)^{5}\\right)^{\\prime}=5(3x+1)^{4}\\cdot 3$.',
            ],
        },
        'tablica-pochodnych': {
            name: 'Tablica pochodnych',
            tex: '(\\sin x)^{\\prime}=\\cos x,\\ (\\cos x)^{\\prime}=-\\sin x,\\ \\left(e^{x}\\right)^{\\prime}=e^{x},\\ (\\ln x)^{\\prime}=\\frac{1}{x}',
            why: 'Pochodne podstawowych funkcji (sinus, cosinus, $e^{x}$, logarytm) bierzemy z tablicy. Warto je pamiętać.',
            level: 'Potęgi: liceum rozszerzenie. Funkcje trygonometryczne, $e^{x}$, $\\ln x$: studia',
            more: [
                'Dalsze: $(\\operatorname{tg}x)^{\\prime}=\\frac{1}{\\cos^{2}x}$, $\\left(a^{x}\\right)^{\\prime}=a^{x}\\ln a$, $(\\operatorname{arctg}x)^{\\prime}=\\frac{1}{1+x^{2}}$.',
                'Uwaga na znak przy cosinusie: pochodna cosinusa jest ujemna.',
            ],
        },
        'calka-potegi': {
            name: 'Całka potęgi',
            tex: '\\int x^{n}\\,dx=\\frac{x^{n+1}}{n+1}\\quad (n\\ne -1)',
            why: 'Podnosimy wykładnik o 1 i dzielimy przez nowy wykładnik, np. $\\int x^{2}\\,dx=\\frac{x^{3}}{3}$.',
            level: 'Studia: analiza matematyczna',
            more: [
                'To działanie odwrotne do pochodnej potęgi: $\\left(\\frac{x^{3}}{3}\\right)^{\\prime}=x^{2}$.',
                'Całka z samej liczby to wzór dla $n=0$: $\\int 5\\,dx=5x$, bo $5=5\\cdot x^{0}$ i $(5x)^{\\prime}=5$.',
                'Dla $n=-1$ wzór dzieliłby przez zero, dlatego $\\int\\frac{1}{x}\\,dx=\\ln|x|$ jest osobnym wzorem.',
            ],
        },
        'tablica-calek': {
            name: 'Tablica całek',
            tex: '\\int e^{x}dx=e^{x},\\ \\int\\frac{1}{x}dx=\\ln|x|,\\ \\int\\sin x\\,dx=-\\cos x,\\ \\int\\cos x\\,dx=\\sin x',
            why: 'Tę całkę znamy na pamięć. To pochodne z tablicy czytane od tyłu: szukamy funkcji, której pochodna daje to, co pod całką.',
            level: 'Studia: analiza matematyczna',
            more: [
                'Każdy wynik można sprawdzić, licząc pochodną, np. $(-\\cos x)^{\\prime}=\\sin x$.',
                'Przy $\\frac{1}{x}$ jest wartość bezwzględna, bo logarytm jest określony tylko dla liczb dodatnich.',
                'Do wyniku całki nieoznaczonej dopisujemy $+C$.',
            ],
        },
        'calka-arctg': {
            name: 'Całka z arcus tangensem',
            tex: '\\int\\frac{1}{x^{2}+a^{2}}\\,dx=\\frac{1}{a}\\operatorname{arctg}\\frac{x}{a}',
            why: 'Pod całką jest jedynka przez $x^{2}$ plus liczba. Zapisujemy tę liczbę jako $a^{2}$ i wstawiamy $a$ do wzoru.',
            level: 'Studia: analiza matematyczna',
            more: ['Przykład: $4=2^{2}$, więc $\\int\\frac{1}{x^{2}+4}\\,dx=\\frac{1}{2}\\operatorname{arctg}\\frac{x}{2}$.'],
        },
        'przez-czesci': {
            name: 'Całkowanie przez części',
            tex: '\\int u\\,dv=u\\cdot v-\\int v\\,du',
            why: 'Pod całką jest iloczyn. Jedną część ($u$) różniczkujemy, drugą ($dv$) całkujemy, tak żeby nowa całka $\\int v\\,du$ była prostsza.',
            level: 'Studia: analiza matematyczna',
            more: [
                'Skąd wzór: z pochodnej iloczynu. Całka z pochodnej daje z powrotem samą funkcję (stałą $C$ dopisujemy na końcu). Z $(uv)^{\\prime}=u^{\\prime}v+uv^{\\prime}$ po scałkowaniu obu stron wychodzi $uv=\\int u^{\\prime}v\\,dx+\\int uv^{\\prime}\\,dx$. Przenosimy jedną całkę na drugą stronę: $\\int uv^{\\prime}\\,dx=uv-\\int u^{\\prime}v\\,dx$. To ten sam wzór co wyżej, bo $dv$ to krótszy zapis $v^{\\prime}\\,dx$, a $du$ to $u^{\\prime}\\,dx$.',
                'Za $u$ wybieramy to, co po zróżniczkowaniu się upraszcza: logarytm, potem potęgę $x$. Za $dv$ to, co łatwo scałkować: $e^{x}$, $\\sin x$, $\\cos x$.',
                '$du$ to pochodna $u$ razy $dx$, a $v$ to całka z $dv$ (bez $+C$).',
                'Wzór wynika z pochodnej iloczynu: $(uv)^{\\prime}=u^{\\prime}v+uv^{\\prime}$, po scałkowaniu obu stron.',
            ],
        },
        'newton-leibniz': {
            name: 'Wzór Newtona-Leibniza',
            tex: '\\int_{a}^{b}f(x)\\,dx=F(b)-F(a)',
            why: '$F$ to wynik całki bez granic. Wstawiamy górną granicę $b$, potem dolną $a$ i odejmujemy.',
            level: 'Studia: analiza matematyczna',
            more: [
                'Wynik to liczba, nie funkcja, więc $+C$ nie dopisujemy: i tak by się odjęło.',
                'Gdy $f\\ge 0$, wynik to pole pod wykresem $f$ między $x=a$ a $x=b$.',
                'Kolejność ma znaczenie: zawsze górna minus dolna.',
            ],
        },
        'sin-kwadrat': {
            name: 'Sinus do kwadratu',
            tex: '\\sin^{2}x=\\frac{1-\\cos 2x}{2}',
            why: 'Kwadratu sinusa nie umiemy scałkować wprost. Zamieniamy go na wyrażenie bez kwadratu, które jest w tablicy.',
            level: 'Liceum rozszerzenie: trygonometria; całka: studia',
            more: ['Wzór wynika z $\\cos 2x=1-2\\sin^{2}x$. Całka z $\\cos 2x$ to $\\frac{\\sin 2x}{2}$, stąd w wyniku $\\frac{\\sin 2x}{4}$.'],
        },
        'cos-kwadrat': {
            name: 'Cosinus do kwadratu',
            tex: '\\cos^{2}x=\\frac{1+\\cos 2x}{2}',
            why: 'Kwadratu cosinusa nie umiemy scałkować wprost. Zamieniamy go na wyrażenie bez kwadratu, które jest w tablicy.',
            level: 'Liceum rozszerzenie: trygonometria; całka: studia',
            more: ['Wzór wynika z $\\cos 2x=2\\cos^{2}x-1$.'],
        },
        wierzcholek: {
            name: 'Wierzchołek paraboli',
            tex: 'p=\\frac{-b}{2a},\\quad q=f(p)',
            why: 'Parabola jest symetryczna, a oś symetrii przechodzi przez $x=\\frac{-b}{2a}$. Tam leży wierzchołek; jego wysokość to wartość funkcji w tym punkcie.',
            level: 'Liceum: funkcja kwadratowa',
            more: [
                'Postać kanoniczna $f(x)=a(x-p)^{2}+q$ od razu pokazuje wierzchołek $W=(p,q)$.',
                'Gdy $a>0$, wierzchołek to najniższy punkt paraboli (minimum), a gdy $a<0$ — najwyższy (maksimum).',
                'Drugą współrzędną można też policzyć wzorem $q=\\frac{-\\Delta}{4a}$.',
            ],
        },
        'definicja-logarytmu': {
            name: 'Definicja logarytmu',
            tex: '\\log_{a} b=c\\iff a^{c}=b',
            why: 'Logarytm odpowiada na pytanie: do jakiej potęgi trzeba podnieść podstawę $a$, żeby dostać $b$.',
            level: 'Liceum: logarytmy',
            more: [
                'Na przykład $\\log_{2} 8=3$, bo $2^{3}=8$, a $\\log_{10} 100=2$, bo $10^{2}=100$.',
                'Podstawa $a$ jest dodatnia i różna od 1, a liczba $b$ pod logarytmem musi być dodatnia. Dlatego w równaniach z logarytmem zaczynamy od dziedziny.',
                'Zapis $\\log b$ bez podstawy to logarytm dziesiętny, czyli $a=10$.',
                'Skąd nazwa: słowo „logarytm” ułożył John Napier, który w 1614 roku opublikował pierwsze tablice logarytmów. Złożył je z greckich słów „logos” (tu: stosunek) i „arithmos” (liczba).',
            ],
        },
        'tg-kwadrat': {
            name: 'Tangens do kwadratu',
            tex: '\\operatorname{tg}^{2}x=\\frac{1}{\\cos^{2}x}-1',
            why: 'Zamieniamy $\\operatorname{tg}^{2}x$ na dwie całki z tablicy: $\\frac{1}{\\cos^{2}x}$ daje $\\operatorname{tg}x$, a $1$ daje $x$.',
            level: 'Liceum rozszerzenie: trygonometria; całka: studia',
            more: ['Wzór wynika z $\\sin^{2}x+\\cos^{2}x=1$, po podzieleniu przez $\\cos^{2}x$.'],
        },
        'nierownosc-kwadratowa': {
            name: 'Nierówność kwadratowa: znak z paraboli',
            tex: 'ax^{2}+bx+c<0\\iff x_{1}<x<x_{2}\\quad(a>0)',
            why: 'Najpierw szukamy miejsc zerowych, bo tylko w nich trójmian może zmienić znak. Potem z kształtu paraboli odczytujemy, gdzie leży pod osią, a gdzie nad nią.',
            level: 'Liceum, zakres podstawowy: funkcja kwadratowa',
            more: [
                'Przykład: $x^{2}-4<0$. Miejsca zerowe to $-2$ i $2$. Współczynnik przy $x^{2}$ jest dodatni, więc ramiona paraboli idą w górę i pod osią leży tylko kawałek między miejscami zerowymi: $x\\in(-2,2)$.',
                'Sprawdzenie jedną liczbą ze środka: $0^{2}-4=-4$, a to mniej od zera, więc ten kawałek naprawdę spełnia nierówność.',
                'Gdy przy $x^{2}$ stoi liczba ujemna, parabola jest odwrócona i znaki się zamieniają: pod osią leżą oba boki, a nie środek.',
                'Przy znaku $\\le$ albo $\\ge$ miejsca zerowe też należą do rozwiązania, więc przedział jest domknięty, np. $\\langle -2,2\\rangle$.',
                'Gdy $\\Delta<0$, parabola nie przecina osi. Przy dodatnim współczynniku przy $x^{2}$ leży cała nad osią, więc nierówność „mniejsze od zera” nie ma wtedy rozwiązań.',
            ],
        },
        'znak-trojmianu': {
            name: 'Znak trójmianu bez dwóch miejsc zerowych',
            tex: '\\Delta<0:\\ ax^{2}+bx+c\\ \\text{ma znak } a,\\quad \\Delta=0:\\ ax^{2}+bx+c=a(x-x_{0})^{2}',
            why: 'Trójmian może zmienić znak tylko tam, gdzie jest zerem. Przy $\\Delta<0$ takiego miejsca brak, więc wszędzie ma znak liczby $a$. Przy $\\Delta=0$ jest zerem tylko w $x_{0}$, a poza nim ma znak $a$.',
            level: 'Liceum, zakres podstawowy: funkcja kwadratowa',
            more: [
                'Przykład: $x^{2}+1>0$. Równanie $x^{2}+1=0$ nie ma rozwiązań, a $a=1>0$, więc parabola leży cała nad osią: $x\\in\\mathbb{R}$.',
                'Przykład: $x^{2}-4x+4>0$. Tu $\\Delta=0$ i $x^{2}-4x+4=(x-2)^{2}$, a kwadrat jest dodatni wszędzie poza $x=2$: $x\\in\\mathbb{R}\\setminus\\{2\\}$.',
                'Przy $a<0$ jest odwrotnie: parabola leży pod osią, np. $-x^{2}+2x-5<0$ dla każdego $x$.',
            ],
        },
        'liczba-przeciwna': {
            name: 'Liczba przeciwna do ujemnej',
            tex: 'x<0\\implies -x>0',
            why: 'Minus przed liczbą ujemną daje liczbę dodatnią. Dlatego przy $x\\to-\\infty$ pod pierwiastek wstawiamy $-x$, a nie $x$: pierwiastek z liczby ujemnej nie istnieje.',
            level: 'Szkoła podstawowa: liczby ujemne; liceum: granice',
            more: [
                'Przykład: $x=-9$, wtedy $-x=9>0$ i $\\sqrt{-x}=3$.',
                'Przy granicy $x\\to-\\infty$: $1-x=(-x)\\left(1-\\frac{1}{x}\\right)$, a oba czynniki są dodatnie, więc pierwiastek z $1-x$ to iloczyn pierwiastków z $-x$ i z $1-\\frac{1}{x}$.',
            ],
        },
        'uklad-podstawianie': {
            name: 'Układ równań: metoda podstawiania',
            tex: '2x+y=7\\;\\Rightarrow\\;y=7-2x',
            why: 'Z jednego równania wyznaczamy jedną niewiadomą i wstawiamy ją do drugiego. Zostaje zwykłe równanie z jedną niewiadomą, które już umiemy rozwiązać.',
            level: 'Liceum, zakres podstawowy: układy równań liniowych',
            more: [
                'Przykład: $2x+y=7$ i $x-y=2$. Z pierwszego równania $y=7-2x$. Wstawiamy do drugiego: $x-(7-2x)=2$, czyli $3x-7=2$, więc $x=3$, a potem $y=7-2\\cdot 3=1$.',
                'Najwygodniej wyznaczać tę niewiadomą, przy której stoi jedynka, bo wtedy nie pojawiają się ułamki.',
                'Sprawdzamy w obu równaniach: $2\\cdot 3+1=7$ i $3-1=2$. Sprawdzenie w jednym równaniu nie wystarczy, bo para liczb musi spełniać oba naraz.',
            ],
        },
        'uklad-przeciwne': {
            name: 'Układ równań: metoda przeciwnych współczynników',
            tex: '(2x+y)+(x-y)=7+2\\;\\Rightarrow\\;3x=9',
            why: 'Dodajemy równania stronami tak, żeby jedna niewiadoma się skróciła. Działa od razu, gdy przy tej niewiadomej stoją liczby przeciwne, np. $1$ przy $y$ w jednym równaniu i $-1$ przy $-y$ w drugim.',
            level: 'Liceum, zakres podstawowy: układy równań liniowych',
            more: [
                'Przykład: $2x+y=7$ i $x-y=2$. Po dodaniu stronami $y$ i $-y$ się skracają: $3x=9$, więc $x=3$. Potem z $x-y=2$ dostajemy $y=1$.',
                'Gdy współczynniki nie są przeciwne, najpierw mnożymy jedno równanie przez liczbę. Przy $x+2y=5$ i $3x+y=5$ mnożymy pierwsze przez $-3$ i dostajemy $-3x-6y=-15$, które z drugim skraca $x$.',
                'Mnożenie obu stron równania przez tę samą liczbę różną od zera nie zmienia jego rozwiązań, dlatego wolno tak robić.',
            ],
        },
        'wartosc-bezwzgledna': {
            name: 'Wartość bezwzględna',
            tex: '\\left|x-a\\right|<r\\iff a-r<x<a+r',
            why: '$\\left|x-a\\right|$ to odległość liczby $x$ od liczby $a$ na osi. Nierówność $\\left|x-a\\right|<r$ (dla dodatniego $r$) mówi więc, że $x$ leży bliżej niż $r$ od punktu $a$. Równanie $\\left|x-a\\right|=r$ daje dwa punkty, $a-r$ i $a+r$, a $\\left|x-a\\right|>r$ to dwa kawałki osi: dalej niż $r$ w lewo albo w prawo.',
            level: 'Liceum, zakres podstawowy: liczby rzeczywiste',
            more: [
                'Przykład: $\\left|x-2\\right|<3$. Liczby odległe od 2 o mniej niż 3 leżą między $2-3=-1$ a $2+3=5$, czyli $x\\in(-1,5)$.',
                'Równanie $\\left|x-2\\right|=3$ ma dwa rozwiązania, bo odległość 3 od punktu 2 mają dwie liczby: $-1$ i $5$.',
                'Dla liczby nieujemnej wartość bezwzględna to ta sama liczba, a dla ujemnej liczba przeciwna, np. $\\left|-7\\right|=7$ i $\\left|7\\right|=7$. Dlatego nigdy nie jest ujemna.',
                'Uwaga: $\\left|x-2\\right|>3$ to liczby dalej niż 3 od punktu 2, czyli dwa kawałki: $x<-1$ albo $x>5$.',
            ],
        },
        'wartosci-trygonometryczne': {
            name: 'Wartości funkcji trygonometrycznych z tablicy',
            tex: '\\sin\\frac{\\pi}{6}=\\frac{1}{2},\\quad\\cos\\frac{\\pi}{3}=\\frac{1}{2},\\quad\\operatorname{tg}\\frac{\\pi}{4}=1',
            why: 'Dla kątów $\\frac{\\pi}{6}$, $\\frac{\\pi}{4}$ i $\\frac{\\pi}{3}$ wartości sinusa, cosinusa i tangensa są dokładne i warto je znać. Równanie takie jak $\\sin x=\\frac{1}{2}$ zaczynamy od znalezienia takiego kąta.',
            level: 'Liceum, zakres podstawowy: trygonometria',
            more: [
                'W stopniach $\\frac{\\pi}{6}$ to 30°, $\\frac{\\pi}{4}$ to 45°, a $\\frac{\\pi}{3}$ to 60°. Sinusy tych kątów to $\\frac{1}{2}$, $\\frac{\\sqrt{2}}{2}$ i $\\frac{\\sqrt{3}}{2}$, a cosinusy to te same liczby w odwrotnej kolejności.',
                'Skąd $\\sin\\frac{\\pi}{6}=\\frac{1}{2}$? Trójkąt równoboczny o boku 2 dzielimy wysokością na pół. Wysokość dzieli kąt 60° na dwa kąty po 30° i podstawę na dwa odcinki po 1. Sinus to przyprostokątna naprzeciw kąta podzielona przez przeciwprostokątną, więc sinus 30° to 1 przez 2.',
                'Tangens to iloraz sinusa przez cosinus, więc $\\operatorname{tg}\\frac{\\pi}{4}=\\frac{\\sin\\frac{\\pi}{4}}{\\cos\\frac{\\pi}{4}}=1$, bo sinus i cosinus kąta 45° są równe.',
                'Przycisk „Spróbuj” pokaże wszystkie rozwiązania, także $\\frac{5\\pi}{6}$ i serie z $k$. Skąd się biorą, wyjaśnia hasło o okresowości.',
            ],
        },
        okresowosc: {
            name: 'Okresowość: wszystkie rozwiązania równania trygonometrycznego',
            tex: '\\sin(x+2\\pi)=\\sin x,\\quad\\operatorname{tg}(x+\\pi)=\\operatorname{tg}x',
            why: 'Sinus i cosinus powtarzają wartości co $2\\pi$, a tangens co $\\pi$. Dlatego równanie trygonometryczne ma nieskończenie wiele rozwiązań i zapisujemy je z $k\\in\\mathbb{Z}$.',
            level: 'Liceum, zakres podstawowy: trygonometria; równania: rozszerzenie',
            more: [
                'Przykład: $\\operatorname{tg}x=1$. Jeden kąt znamy z tablicy: $\\frac{\\pi}{4}$. Tangens powtarza się co $\\pi$, więc wszystkie rozwiązania to $x=\\frac{\\pi}{4}+k\\pi$, gdzie $k$ to dowolna liczba całkowita.',
                'Sprawdzenie dla $k=1$: $\\frac{\\pi}{4}+\\pi=\\frac{5\\pi}{4}$, a $\\operatorname{tg}\\frac{5\\pi}{4}=1$.',
                'Przy sinusie są zwykle dwie serie, bo każdą wartość między $-1$ a $1$ (bez nich) sinus przyjmuje w jednym okresie dwa razy. Dla $\\sin x=\\frac{1}{2}$ to $x=\\frac{\\pi}{6}+2k\\pi$ albo $x=\\frac{5\\pi}{6}+2k\\pi$, bo $\\sin\\frac{5\\pi}{6}=\\sin\\left(\\pi-\\frac{\\pi}{6}\\right)=\\frac{1}{2}$. Na okręgu jednostkowym kąty $x$ i $\\pi-x$ leżą symetrycznie względem osi pionowej, więc mają tę samą wysokość, czyli ten sam sinus.',
            ],
        },
        'procent-z-liczby': {
            name: 'Procent z liczby',
            tex: 'p\\%\\text{ z }B=\\frac{p}{100}\\cdot B',
            why: 'Procent to setna część, więc $p$ procent to $\\frac{p}{100}$. Żeby policzyć procent z liczby, mnożymy ją przez ten ułamek.',
            level: 'Szkoła podstawowa i liceum: procenty',
            more: [
                'Przykład: 20% ze 150 to $\\frac{20}{100}\\cdot 150=30$.',
                'Odwrotne pytanie, ile procent stanowi 30 ze 120: dzielimy część przez całość i mnożymy przez 100, czyli $\\frac{30}{120}\\cdot 100=25$, więc 25%.',
                'Uwaga na słowo „z”: 20% ze 150 i 150% z 20 dają tę samą liczbę 30, bo mnożenie jest przemienne, ale opisują różne sytuacje.',
            ],
        },
        'zmiana-o-procent': {
            name: 'Zmiana o procent: podwyżka i obniżka',
            tex: 'B\\cdot\\left(1+\\frac{p}{100}\\right)\\quad\\text{i}\\quad B\\cdot\\left(1-\\frac{p}{100}\\right)',
            why: 'Podwyżka o $p$ procent to cała kwota plus $p$ procent z niej, więc mnożymy przez $1+\\frac{p}{100}$. Obniżka to mnożenie przez $1-\\frac{p}{100}$.',
            level: 'Szkoła podstawowa i liceum: procenty',
            more: [
                'Przykład: 150 zł podrożało o 20%. Mnożymy przez $1+\\frac{20}{100}=1{,}2$: $150\\cdot 1{,}2=180$, czyli 180 zł.',
                'Obniżka o 20% to mnożenie przez $0{,}8$: $150\\cdot 0{,}8=120$, czyli 120 zł.',
                'Podwyżka o 20%, a potem obniżka o 20% nie wraca do ceny wyjściowej: $150\\cdot 1{,}2\\cdot 0{,}8=144$, bo obniżka liczy się już od wyższej ceny.',
            ],
        },
        'e-skrocony': {
            name: 'Wzór skrócony dla symbolu 1^∞',
            tex: '\\lim f^{g}=e^{\\lim g\\cdot(f-1)}\\quad\\text{gdy } f\\to 1,\\ g\\to\\pm\\infty',
            why: 'Zamiast dorabiać jedynkę, od razu liczymy granicę wykładnika $g\\cdot(f-1)$. Wynik to $e$ podniesione do tej granicy.',
            level: 'Studia: analiza matematyczna, granice ciągów i funkcji',
            more: [
                'Skąd wzór: zapisujemy podstawę jako $f=1+(f-1)$ i, gdy $f\\ne 1$, oznaczamy $a=\\frac{1}{f-1}$, czyli $f=1+\\frac{1}{a}$. Wtedy $f^{g}=\\left[\\left(1+\\frac{1}{a}\\right)^{a}\\right]^{\\frac{g}{a}}$. Nawias kwadratowy dąży do $e$ (wzór na liczbę e), a wykładnik $\\frac{g}{a}$ to właśnie $g\\cdot(f-1)$.',
                'Przykład: $\\left(1+\\frac{2}{n}\\right)^{n}$. Tu $f-1=\\frac{2}{n}$, więc $g\\cdot(f-1)=n\\cdot\\frac{2}{n}=2$ i granica to $e^{2}$.',
                'To ten sam wynik co przy dorabianiu jedynki, tylko bez szukania $a_{n}$. Wzór przydaje się właśnie przy symbolu $1^{\\infty}$: podstawa dąży do 1, a wykładnik do nieskończoności. Przy innych granicach zwykle wystarczy podstawić liczby.',
            ],
        },
        'wzory-viete': {
            name: 'Wzory Viète\'a: suma i iloczyn rozwiązań',
            tex: 'x_{1}+x_{2}=-\\frac{b}{a},\\quad x_{1}\\cdot x_{2}=\\frac{c}{a}',
            why: 'Gdy rozwiązania są całkowite, można je odgadnąć bez delty: to dwie liczby o znanej sumie i znanym iloczynie.',
            level: 'Liceum, zakres rozszerzony: funkcja kwadratowa',
            more: [
                'Skąd wzór: z postaci iloczynowej. Dla $a=1$ mamy $(x-x_{1})(x-x_{2})=x^{2}-(x_{1}+x_{2})x+x_{1}x_{2}$. Porównujemy z $x^{2}+bx+c$: przy $x$ stoi $-(x_{1}+x_{2})$, czyli $b=-(x_{1}+x_{2})$, a po zmianie znaku $x_{1}+x_{2}=-b$. Wyraz wolny $x_{1}x_{2}$ to $c$. Gdy $a\\ne 1$, dzielimy całe równanie przez $a$ i dostajemy $x^{2}+\\frac{b}{a}x+\\frac{c}{a}=0$, stąd we wzorze dzielenie przez $a$.',
                'Przykład: $x^{2}-5x+6=0$. Szukamy liczb o sumie 5 i iloczynie 6. To 2 i 3, bo $2+3=5$ i $2\\cdot 3=6$, więc rozwiązania to $x=2$ i $x=3$.',
                'Jak szukać: zaczynamy od iloczynu, bo par dzielników jest mało. Przy iloczynie ujemnym liczby mają różne znaki, przy dodatnim ten sam znak co suma.',
                'Gdy liczb nie da się łatwo odgadnąć (np. rozwiązania są niewymierne), wracamy do delty, która działa zawsze.',
                'Skąd nazwa: od François Viète\'a, francuskiego matematyka z XVI wieku, który jako jeden z pierwszych zapisywał równania literami zamiast słowami.',
            ],
        },
        'schemat-hornera': {
            name: 'Schemat Hornera',
            tex: 'W(x)=(x-r)\\cdot Q(x)+W(r)',
            why: 'To dzielenie wielomianu przez $(x-r)$ samymi mnożeniami i dodawaniami. Ostatnia liczba to reszta, a pozostałe to współczynniki wyniku.',
            level: 'Liceum, zakres rozszerzony: wielomiany',
            more: [
                'Jak liczyć: w górnym wierszu piszemy współczynniki wielomianu, a po lewej $r$. Pierwszy współczynnik spisujemy w dół. Potem w kółko: liczbę z dołu mnożymy przez $r$, wynik wpisujemy po skosie pod następny współczynnik i dodajemy w pionie.',
                'Przykład: $x^{3}-6x^{2}+11x-6$ przez $(x-1)$. Spisujemy 1. Dalej $1\\cdot 1=1$ i $-6+1=-5$, potem $-5\\cdot 1=-5$ i $11+(-5)=6$, na końcu $6\\cdot 1=6$ i $-6+6=0$. Wynik ma stopień o jeden niższy, więc dolne liczby bez ostatniej (1, −5, 6) to współczynniki przy $x^{2}$, $x$ i wyraz wolny, czyli $x^{2}-5x+6$. Ostatnia liczba, 0, to reszta.',
                'Skąd to działa: to zwykłe dzielenie pisemne wielomianów, w którym zostawiamy same współczynniki i nie przepisujemy liter. Dlaczego reszta to $W(r)$: wstawiamy $x=r$ do $W(x)=(x-r)\\cdot Q(x)+R$. Nawias $(r-r)$ daje 0, więc zostaje $W(r)=R$. Dlatego zero na końcu potwierdza, że $r$ jest pierwiastkiem.',
                'Skąd nazwa: od Williama George\'a Hornera, angielskiego matematyka, który opisał ten sposób w 1819 roku. Wcześniej, w 1804 roku, opisał go Paolo Ruffini, a w Chinach znał go już w XIII wieku Qin Jiushao.',
            ],
        },
        'odwracanie-znaku': {
            name: 'Dzielenie nierówności przez liczbę ujemną',
            tex: '-2x\\ge 6\\;\\Rightarrow\\;x\\le\\frac{6}{-2}',
            why: 'Mnożenie albo dzielenie obu stron nierówności przez liczbę ujemną odwraca jej znak. Przy liczbie dodatniej znak zostaje.',
            level: 'Liceum, zakres podstawowy: nierówności liniowe',
            more: [
                'Dlaczego: $2<3$ jest prawdą, ale po pomnożeniu obu stron przez $-1$ wychodzi $-2$ i $-3$, a $-2$ jest większe od $-3$. Kolejność na osi się odwraca, więc i znak musi się odwrócić.',
                'Przykład: $5-2x\\ge 11$. Odejmujemy 5 od obu stron: $-2x\\ge 6$. Dzielimy przez $-2$ i odwracamy znak: $x\\le -3$.',
                'Sprawdzenie dwiema liczbami: $x=-4$ daje $5-2\\cdot(-4)=13$, a $13\\ge 11$ (pasuje), za to $x=0$ daje $5\\ge 11$ (nie pasuje). Zgadza się to z $x\\le -3$.',
                'Typowy błąd: dzielimy przez $-2$ i zostawiamy $\\ge$. Wtedy wychodzi $x\\ge -3$, czyli prawie same złe liczby, np. $x=0$, dla którego nierówność jest fałszywa.',
            ],
        },
        'rownanie-wymierne': {
            name: 'Równanie wymierne: mnożenie przez mianownik',
            tex: '\\frac{W(x)}{Q(x)}=c\\;\\Rightarrow\\;W(x)=c\\cdot Q(x),\\quad Q(x)\\ne 0',
            why: 'Mnożymy obie strony przez mianownik, żeby pozbyć się ułamka. Wolno to zrobić tylko tam, gdzie mianownik nie jest zerem, dlatego najpierw wyznaczamy dziedzinę.',
            level: 'Liceum, zakres rozszerzony: wyrażenia wymierne',
            more: [
                'Przykład: $\\frac{x+1}{x-2}=3$. Dziedzina: $x\\ne 2$. Mnożymy przez $x-2$: $x+1=3(x-2)$, czyli $x+1=3x-6$. Przenosimy: $7=2x$, więc $x=\\frac{7}{2}$.',
                'Na końcu sprawdzamy, czy wynik należy do dziedziny. Tu $\\frac{7}{2}\\ne 2$, więc wynik zostaje. Gdyby wyszło $x=2$, trzeba by go odrzucić, bo przez zero się nie dzieli.',
                'Sprawdzenie: $\\frac{\\frac{7}{2}+1}{\\frac{7}{2}-2}=\\frac{\\frac{9}{2}}{\\frac{3}{2}}=3$.',
            ],
        },
        'rownosc-poteg': {
            name: 'Równość potęg o tej samej podstawie',
            tex: 'a^{m}=a^{n}\\;\\Rightarrow\\;m=n\\quad(a>0,\\ a\\ne 1)',
            why: 'Gdy obie strony są potęgami tej samej podstawy, równe są też wykładniki. Dlatego najpierw zapisujemy obie strony przy wspólnej podstawie.',
            level: 'Liceum, zakres podstawowy: potęgi; równania wykładnicze: rozszerzenie',
            more: [
                'Przykład: $4^{x}=2^{x+3}$. Ponieważ $4=2^{2}$, lewa strona to $2^{2x}$. Mamy $2^{2x}=2^{x+3}$, więc $2x=x+3$ i $x=3$.',
                'Sprawdzenie: $4^{3}=64$ i $2^{3+3}=64$.',
                'Warunek $a\\ne 1$ jest ważny: $1^{2}=1^{5}$, a wykładniki są różne. Dla $a=1$ każda potęga daje 1, więc porównywanie wykładników nic nie mówi.',
            ],
        },
        'rownanie-z-pierwiastkiem': {
            name: 'Równanie z pierwiastkiem: podnoszenie do kwadratu',
            tex: '\\sqrt{A}=B\\;\\Rightarrow\\;A=B^{2},\\quad B\\ge 0',
            why: 'Podnosimy obie strony do kwadratu, żeby pozbyć się pierwiastka. Kwadrat może jednak dodać fałszywe rozwiązania, więc każde trzeba na końcu sprawdzić.',
            level: 'Liceum, zakres rozszerzony: równania',
            more: [
                'Skąd fałszywe rozwiązania: $2\\ne -2$, ale po podniesieniu do kwadratu obie strony dają 4. Kwadrat „zapomina” znak, więc z równania $A=B^{2}$ wychodzą też liczby, dla których $B$ jest ujemne.',
                'Przykład: $\\sqrt{x+3}=x-3$. Po podniesieniu do kwadratu $x+3=(x-3)^{2}$. Wymnażamy: $x+3=x^{2}-6x+9$, czyli $x^{2}-7x+6=0$, a stąd $(x-1)(x-6)=0$, więc $x=1$ albo $x=6$.',
                'Sprawdzenie: dla $x=6$ jest $\\sqrt{9}=3$ i $6-3=3$, zgadza się. Dla $x=1$ prawa strona to $1-3=-2$, a pierwiastek nie bywa ujemny, więc $x=1$ odrzucamy. To samo mówi warunek z wzoru: prawa strona $x-3$ musi być nieujemna, czyli $x\\ge 3$.',
            ],
        },
        'wspolny-mianownik': {
            name: 'Wspólny mianownik',
            tex: '\\frac{a}{b}\\pm\\frac{c}{d}=\\frac{a\\cdot d\\pm c\\cdot b}{b\\cdot d}',
            why: 'Dodawać i odejmować można tylko ułamki o tym samym mianowniku. Rozszerzamy więc oba ułamki tak, żeby mianowniki się zrównały.',
            level: 'Szkoła podstawowa: ułamki zwykłe',
            more: [
                'Przykład: $\\frac{3}{4}-\\frac{1}{6}$. Najmniejszy wspólny mianownik to 12, czyli NWW liczb 4 i 6. Rozszerzamy: $\\frac{3}{4}=\\frac{9}{12}$ i $\\frac{1}{6}=\\frac{2}{12}$.',
                'Prosty wzór z góry daje mianownik $4\\cdot 6=24$: $\\frac{18-4}{24}=\\frac{14}{24}=\\frac{7}{12}$. NWW daje ten sam wynik na mniejszych liczbach. Teraz z dwunastymi: odejmujemy same liczniki: $\\frac{9}{12}-\\frac{2}{12}=\\frac{7}{12}$. Mianownik zostaje, bo to wciąż te same dwunaste części.',
                'Typowy błąd: odejmowanie licznika od licznika i mianownika od mianownika. Wyszłoby $\\frac{3-1}{4-6}=-1$, a od $\\frac{3}{4}$ odejmujemy mniej niż $\\frac{3}{4}$, więc wynik nie może być ujemny.',
            ],
        },
        'mnozenie-ulamkow': {
            name: 'Mnożenie ułamków',
            tex: '\\frac{a}{b}\\cdot\\frac{c}{d}=\\frac{a\\cdot c}{b\\cdot d}',
            why: 'Ułamki mnożymy „licznik razy licznik, mianownik razy mianownik”. Wspólny mianownik nie jest tu potrzebny.',
            level: 'Szkoła podstawowa: ułamki zwykłe',
            more: [
                'Przykład: $\\frac{2}{3}\\cdot\\frac{9}{4}=\\frac{2\\cdot 9}{3\\cdot 4}=\\frac{18}{12}=\\frac{3}{2}$ (na końcu licznik i mianownik dzielimy przez 6).',
                'Dlaczego tak: $\\frac{2}{3}$ z $\\frac{9}{4}$ to dwie trzecie tej liczby. Dzielimy ją na 3 części (mianownik rośnie 3 razy) i bierzemy 2 takie części (licznik rośnie 2 razy).',
                'Można skracać przed mnożeniem: 9 i 3 dzielą się przez 3, a 2 i 4 przez 2. Zostaje $\\frac{1\\cdot 3}{1\\cdot 2}=\\frac{3}{2}$, ten sam wynik na mniejszych liczbach.',
            ],
        },
        'dzielenie-ulamkow': {
            name: 'Dzielenie ułamków',
            tex: '\\frac{a}{b}:\\frac{c}{d}=\\frac{a}{b}\\cdot\\frac{d}{c}',
            why: 'Dzielenie przez ułamek zamieniamy na mnożenie przez jego odwrotność, czyli ułamek z zamienionym licznikiem i mianownikiem.',
            level: 'Szkoła podstawowa: ułamki zwykłe',
            more: [
                'Przykład: $\\frac{3}{5}:\\frac{9}{10}=\\frac{3}{5}\\cdot\\frac{10}{9}=\\frac{30}{45}=\\frac{2}{3}$.',
                'Dlaczego odwrotność: podzielić $\\frac{3}{5}$ przez $\\frac{9}{10}$ to znaleźć liczbę, która razy $\\frac{9}{10}$ daje $\\frac{3}{5}$. Mnożenie przez $\\frac{10}{9}$ znosi mnożenie przez $\\frac{9}{10}$, bo $\\frac{9}{10}\\cdot\\frac{10}{9}=1$.',
                'Sprawdzenie: $\\frac{2}{3}\\cdot\\frac{9}{10}=\\frac{18}{30}=\\frac{3}{5}$, czyli wynik razy dzielnik daje dzielną.',
            ],
        },
        'nwd-nww': {
            name: 'NWD i NWW',
            tex: '\\operatorname{NWD}(a,b)\\cdot\\operatorname{NWW}(a,b)=a\\cdot b',
            why: 'NWD to największa liczba, która dzieli obie liczby, a NWW to najmniejsza liczba, którą obie dzielą. Obie odczytujemy z rozkładu na czynniki pierwsze.',
            level: 'Szkoła podstawowa i liceum: podzielność',
            more: [
                'Przykład: $12=2\\cdot 2\\cdot 3$ i $18=2\\cdot 3\\cdot 3$. Wspólne czynniki to 2 i 3, więc NWD to $2\\cdot 3=6$. Czynnik, który się powtarza, NWD bierze tyle razy, ile jest go w liczbie, gdzie występuje rzadziej.',
                'NWW bierze każdy czynnik tyle razy, ile razy występuje tam, gdzie jest go najwięcej: $2\\cdot 2\\cdot 3\\cdot 3=36$.',
                'Sprawdzenie wzorem z góry: $6\\cdot 36=216$ i $12\\cdot 18=216$.',
                'Do czego się przydają: NWD skraca ułamki: licznik i mianownik dzielimy przez 6, więc $\\frac{12}{18}=\\frac{2}{3}$, a NWW to najmniejszy wspólny mianownik przy dodawaniu ułamków.',
            ],
        },
        // ── podstawy równań (spec 2026-11-24-dymki-podstawy): hasła dla kroków z tabeli STEP_RULES ──
        'wyrazy-podobne': {
            name: 'Redukcja wyrazów podobnych',
            tex: 'ax+bx=(a+b)x',
            why: 'Wyrazy podobne mają tę samą część z literą, np. $3x$ i $-x$, albo są samymi liczbami. Zostawiamy literę, a liczby stojące przed nią sumujemy.',
            level: 'Szkoła podstawowa i liceum: wyrażenia algebraiczne',
            more: [
                'Przykład: $3x-x+4+6=2x+10$. Iksy dają $3x-x=2x$, a liczby $4+6=10$.',
                'Skąd wzór: $3x$ to $x+x+x$, a $2x$ to $x+x$. Razem jest pięć iksów, czyli $3x+2x=5x$. W ogólnym zapisie to $ax+bx=(a+b)x$: wyłączamy $x$ przed nawias.',
                'Uwaga: $x$ i $x^{2}$ nie są podobne. W $x^{2}+3x$ nic nie zredukujemy, bo to różne potęgi.',
                'Skąd nazwa: wyrazy są „podobne”, bo różnią się tylko liczbą z przodu. „Redukować” znaczy tu zmniejszać: z kilku wyrazów zostaje jeden.',
            ],
        },
        'opuszczanie-nawiasow': {
            name: 'Opuszczanie nawiasów',
            tex: 'a(b+c)=ab+ac,\\qquad -(b-c)=-b+c',
            why: 'Czynnik sprzed nawiasu trafia do każdego wyrazu w środku. Sam minus przed nawiasem działa jak $-1$: odwraca znak każdego wyrazu.',
            level: 'Szkoła podstawowa i liceum: wyrażenia algebraiczne',
            more: [
                'Przykład: $3(x-2)=3x-6$, bo $3\\cdot x=3x$ i $3\\cdot(-2)=-6$.',
                'Minus przed nawiasem: $2x+2-(x-3)=2x+2-x+3$. Liczba $-3$ w nawiasie zmieniła się na $+3$. Skąd to: minus to mnożenie przez $-1$, więc $-(b-c)=-1\\cdot b+(-1)\\cdot(-c)=-b+c$.',
                'Nawias razy nawias: każdy wyraz pierwszego mnożymy przez każdy wyraz drugiego, np. $(x+1)(x+3)=x^{2}+3x+x+3$.',
                'Kwadrat nawiasu to nawias razy ten sam nawias: $(a-b)^{2}=(a-b)(a-b)$, np. $(x-3)^{2}=x^{2}-3x-3x+9$.',
                'Skąd wzór: $3(x-2)$ to trzy razy ten sam nawias, czyli $(x-2)+(x-2)+(x-2)$. Zbieramy trzy iksy i trzy razy $-2$: wychodzi $3x-6$. Tak samo $a(b+c)$ to $a$ razy cała suma, więc każdy składnik bierzemy $a$ razy.',
                'Skąd nazwa: nawias „opuszczamy”, czyli przestajemy go pisać, bo po wymnożeniu nie jest już potrzebny.',
            ],
        },
        przenoszenie: {
            name: 'Przenoszenie wyrazu na drugą stronę',
            tex: 'a+b=c\\iff a=c-b',
            why: 'Wyraz, który przechodzi na drugą stronę równania albo nierówności, zmienia znak: plus na minus, minus na plus.',
            level: 'Szkoła podstawowa i liceum: równania liniowe',
            more: [
                'Przykład: w $4x+1=x+7$ przenosimy $x$ na lewo, a $1$ na prawo: $4x-x=7-1$, czyli $3x=6$.',
                'Skąd wzór: równanie jest jak waga w równowadze. Gdy od obu stron odejmiemy to samo, równowaga zostaje. Z $a+b=c$ po odjęciu $b$ od obu stron mamy $a+b-b=c-b$, czyli $a=c-b$. Wyraz $b$ zniknął z lewej i pojawił się po prawej z minusem. Przenoszenie to skrót tego odejmowania (albo dodawania).',
                'W nierówności działa to tak samo, a znak nierówności się nie zmienia, np. $5-2x\\ge 11$ daje $-2x\\ge 11-5$.',
                'Przenieść wszystko na lewą stronę to przenieść każdy wyraz z prawej. Po prawej zostaje $0$.',
                'Skąd nazwa: wyraz „przenosimy” z jednej strony znaku równości na drugą. Naprawdę dodajemy albo odejmujemy go po obu stronach.',
            ],
        },
        'obie-strony': {
            name: 'To samo działanie po obu stronach',
            tex: 'a=b\\iff a\\cdot c=b\\cdot c\\iff\\frac{a}{c}=\\frac{b}{c}\\quad(c\\neq 0)',
            why: 'Mnożenie albo dzielenie obu stron przez tę samą liczbę różną od zera, zmiana znaku obu stron i zamiana stron nie zmieniają rozwiązań równania. W nierówności liczba ujemna odwraca znak nierówności.',
            level: 'Szkoła podstawowa i liceum: równania liniowe',
            more: [
                'Przykład: z $3x=6$ po podzieleniu obu stron przez 3 mamy $x=2$. Przy $\\frac{2}{3}x=4$ mnożymy obie strony przez odwrotność, czyli $\\frac{3}{2}$, i mamy $x=6$.',
                'Zmiana znaku obu stron to mnożenie przez $-1$: z $-x=4$ dostajemy $x=-4$.',
                'Zamiana stron: $a=b$ znaczy to samo co $b=a$, więc $5=2x-7$ to to samo równanie co $2x-7=5$.',
                'W nierówności dzielenie przez liczbę dodatnią zostawia znak nierówności, a przez ujemną go odwraca (hasło o dzieleniu nierówności przez liczbę ujemną).',
                'Skąd wzór: znów waga w równowadze. Gdy obie szalki podwoimy albo zmniejszymy o połowę, dalej się równoważą. Zera nie wolno użyć: przez zero się nie dzieli, a po mnożeniu przez zero mamy $0=0$ dla każdej liczby i tracimy całe równanie.',
                'Skąd nazwa: działanie wykonujemy na „obu stronach” znaku równości, lewej i prawej.',
            ],
        },
        'pierwiastkowanie-obu-stron': {
            name: 'Pierwiastkowanie obu stron równania',
            tex: 'x^{2}=a\\iff x=\\sqrt{a}\\ \\text{lub}\\ x=-\\sqrt{a}\\quad(a\\ge 0)',
            why: 'Z $x^{2}=a$ wynika $x=\\sqrt{a}$ albo $x=-\\sqrt{a}$. Zapis $\\pm$ łączy oba rozwiązania w jeden.',
            level: 'Liceum: równania kwadratowe',
            more: [
                'Przykład: z $x^{2}=9$ mamy $x=3$ albo $x=-3$, bo $3^{2}=9$ i $(-3)^{2}=9$.',
                'Gdy $a<0$, rozwiązań nie ma, bo kwadrat nie bywa ujemny. Gdy $a=0$, jest jedno: $x=0$.',
                'Skąd wzór: $x^{2}=9$ to $x^{2}-9=0$, czyli $(x-3)(x+3)=0$ z różnicy kwadratów. Iloczyn jest zerem, gdy któryś nawias jest zerem, więc $x=3$ albo $x=-3$. Sam pierwiastek $\\sqrt{9}=3$ daje tylko liczbę dodatnią, dlatego ujemną trzeba dopisać.',
                'Skąd nazwa: z obu stron bierzemy pierwiastek kwadratowy. Łacińska nazwa pierwiastka, radix, znaczy „korzeń”.',
            ],
        },
        'iloczyn-rowny-zero': {
            name: 'Iloczyn równy zero',
            tex: 'a\\cdot b=0\\iff a=0\\ \\text{lub}\\ b=0',
            why: 'Gdy po lewej stoją pomnożone czynniki, a po prawej zero, każdy czynnik przyrównujemy do zera osobno. Z jednego trudnego równania robi się kilka prostych.',
            level: 'Liceum: równania kwadratowe i wielomianowe',
            more: [
                'Przykład: $x(x-3)=0$. Albo $x=0$, albo $x-3=0$, czyli $x=3$.',
                'Skąd wzór: jeśli $a$ nie jest zerem, dzielimy obie strony $a\\cdot b=0$ przez $a$ i zostaje $b=0$. Czyli gdy pierwszy czynnik nie jest zerem, zerem musi być drugi. Dwie liczby różne od zera zawsze dają iloczyn różny od zera.',
                'Uwaga: działa tylko dla zera. Z $(x-1)(x-2)=6$ nie wynika, że któryś nawias to 6, bo 6 można dostać z wielu iloczynów.',
                'Skąd nazwa: „przyrównać do zera” to napisać, że wyrażenie równa się zero.',
            ],
        },
        sprawdzenie: {
            name: 'Sprawdzenie rozwiązania',
            tex: 'L(x_{0})=P(x_{0})',
            why: 'Rachunek mógł mieć pomyłkę. Wynik podstawiamy do wyjściowego zapisu i porównujemy lewą stronę z prawą; mają wyjść równe.',
            level: 'Szkoła podstawowa i liceum: równania',
            more: [
                'Przykład: $5=2x-7$ daje $x=6$. Lewa strona to $5$, a prawa $2\\cdot 6-7=5$. Wyszło to samo, więc $x=6$ jest dobre.',
                'W układzie równań wstawiamy obie liczby do każdego równania, np. $x=3$ i $y=2$ do $x+y=5$: $3+2=5$.',
                'Sprawdzenie wyłapuje fałszywe rozwiązania, które pojawiają się po podnoszeniu do kwadratu albo po mnożeniu przez wyrażenie z $x$.',
                'Skąd wzór: rozwiązanie równania to z definicji liczba, dla której obie strony są równe. Sprawdzenie robi dokładnie to, co mówi definicja.',
                'Skąd nazwa: L i P to skróty od „lewa strona” i „prawa strona”.',
            ],
        },
        'wspolczynniki-trojmianu': {
            name: 'Współczynniki trójmianu kwadratowego',
            tex: 'ax^{2}+bx+c,\\quad a\\neq 0',
            why: '$a$ to liczba przy $x^{2}$, $b$ przy $x$, a $c$ to wyraz wolny, czyli sama liczba. Każdą bierzemy razem z jej znakiem.',
            level: 'Liceum: funkcja kwadratowa',
            more: [
                'Przykład: w $x^{2}-5x+6$ jest $a=1$, $b=-5$ i $c=6$. Przy $x^{2}$ nie widać liczby, bo $1\\cdot x^{2}$ piszemy krótko jako $x^{2}$.',
                'Gdy wyrazu brak, jego współczynnik to 0: w $x^{2}-9$ jest $b=0$.',
                'Najpierw porządkujemy: wszystko na jedną stronę, od najwyższej potęgi. W $-x^{2}+7x-6=0$ jest $a=-1$, $b=7$ i $c=-6$.',
                'Skąd wzór: każdy trójmian kwadratowy składa się z $x^{2}$, z $x$ i z liczby, a przy każdym stoi jakaś liczba. Litery $a$, $b$, $c$ to tylko nazwy tych liczb, dzięki którym wzory na deltę i rozwiązania działają dla każdego równania.',
                'Skąd nazwa: „trójmian”, bo składa się z trzech jednomianów, a „wyraz wolny”, bo stoi bez $x$. „Współczynnik” to liczba stojąca przy potędze $x$: współtworzy z nią wyraz, bo jest z nią pomnożona, np. w $-5x$ współczynnik to $-5$.',
            ],
        },
        dziedzina: {
            name: 'Dziedzina równania',
            tex: '\\frac{1}{w}:\\ w\\neq 0,\\qquad\\sqrt{w}:\\ w\\ge 0,\\qquad\\log_{a}w:\\ w>0',
            why: 'Dziedzina to liczby, które w ogóle można wstawić do zadania. Wyznaczamy ją na początku, a rozwiązanie spoza niej na końcu odrzucamy.',
            level: 'Liceum: równania wymierne, z pierwiastkiem i logarytmiczne',
            more: [
                'Ułamek: mianownik nie może być zerem. W $\\frac{1}{x}=2$ wykluczamy $x=0$, więc $D=\\mathbb{R}\\setminus\\{0\\}$.',
                'Pierwiastek kwadratowy: liczba pod nim nie może być ujemna. W $\\sqrt{x+3}$ żądamy $x+3\\ge 0$, czyli $x\\ge -3$. Gdy pierwiastek równa się wyrażeniu z $x$, jak w $\\sqrt{x+3}=x-3$, to prawa strona też nie może być ujemna: $x-3\\ge 0$, bo pierwiastek kwadratowy nigdy nie jest ujemny.',
                'Logarytm: liczba pod nim musi być dodatnia. W $\\log_{3}(2x-1)$ żądamy $2x-1>0$, czyli $x>\\frac{1}{2}$.',
                'Na końcu sprawdzamy, czy rozwiązanie należy do dziedziny. Liczbę spoza niej odrzucamy, nawet jeśli wyszła z rachunku. Przy skracaniu ułamka zastrzeżenie zostaje: $\\frac{x^{2}-1}{x-1}$ to $x+1$ tylko dla $x\\neq 1$.',
                'Skąd wzór: każdy warunek bierze się z definicji. Dzielenie przez zero nie ma wyniku, bo żadna liczba razy 0 nie daje na przykład 2. Pierwiastek kwadratowy z $w$ to liczba nieujemna, której kwadrat daje $w$, a kwadrat nie bywa ujemny. Logarytm $\\log_{3}w$ to wykładnik, do którego podnosimy 3, żeby dostać $w$, a potęga liczby 3 jest zawsze dodatnia.',
                'Skąd nazwa: „dziedzina” to obszar, w którym coś obowiązuje. Tu to zbiór liczb, dla których zadanie ma sens. Oznaczamy ją literą $D$.',
            ],
        },
        'rownosc-logarytmow': {
            name: 'Równość logarytmów o tej samej podstawie',
            tex: '\\log_{a}u=\\log_{a}w\\iff u=w\\quad(u>0,\\ w>0)',
            why: 'Gdy po obu stronach stoi logarytm o jednej podstawie, przyrównujemy to, co jest pod logarytmami, i zostaje zwykłe równanie.',
            level: 'Liceum: logarytmy',
            more: [
                'Przykład: $\\log_{2}(x+3)=\\log_{2}(2x)$, więc $x+3=2x$, czyli $x=3$. Dziedzina: $x+3>0$ i $2x>0$, więc $x=3$ pasuje.',
                'Skąd wzór: z definicji logarytmu $a^{\\log_{a}u}=u$. Jeśli $\\log_{a}u$ i $\\log_{a}w$ to ta sama liczba, to podnosząc $a$ do tej liczby, dostajemy z jednej strony $u$, a z drugiej $w$. Czyli $u=w$.',
                'Dlatego najpierw dziedzina: pod logarytmem mogą stać tylko liczby dodatnie, a po przyrównaniu argumentów ten warunek znika z zapisu.',
                'Skąd nazwa: liczbę pod logarytmem nazywamy jego argumentem, stąd „porównuję argumenty logarytmów”.',
            ],
        },
        'czynniki-pierwsze': {
            name: 'Rozkład liczby na czynniki pierwsze',
            tex: '84=2^{2}\\cdot 3\\cdot 7',
            why: 'Liczba pierwsza jest większa od 1 i bez reszty da się ją podzielić tylko przez 1 i przez nią samą. Każdą liczbę naturalną większą od 1 zapisujemy jako iloczyn takich liczb na jeden sposób (nie licząc kolejności).',
            level: 'Szkoła podstawowa: podzielność',
            more: [
                'Przykład: 84 dzielimy przez 2 i mamy 42, potem 42 przez 2 i mamy 21, 21 przez 3 i mamy 7, a 7 przez 7 i mamy 1. Dzielniki to 2, 2, 3 i 7, więc $84=2\\cdot 2\\cdot 3\\cdot 7=2^{2}\\cdot 3\\cdot 7$.',
                'Liczbę ujemną rozkładamy bez minusa, a minus dopisujemy na początku: $-84=-2^{2}\\cdot 3\\cdot 7$.',
                'Skąd wzór: dzielimy przez najmniejszą liczbę pierwszą, która dzieli to, co zostało, aż dojdziemy do 1. Każdy iloraz jest mniejszy od poprzedniego, więc rachunek się kończy, a wszystkie dzielniki pomnożone razem dają z powrotem wyjściową liczbę.',
                'Do czego się przydaje: z rozkładu odczytujemy NWD i NWW, a ułamki skraca się łatwiej.',
                'Skąd nazwa: „czynnik” to liczba, którą mnożymy w iloczynie. „Liczba pierwsza” to tłumaczenie łacińskiego numerus primus.',
            ],
        },
        'skladanie-rozkladu': {
            name: 'Rozkład wielomianu na czynniki',
            tex: 'x^{4}-1=(x-1)(x+1)(x^{2}+1)',
            why: 'Każdy rozłożony nawias zastępujemy jego rozkładem. Czynnik kwadratowy zostaje w całości, gdy nie ma miejsc zerowych ($\\Delta<0$) albo ma tylko niewymierne i dalszy rozkład nie jest w zadaniu potrzebny.',
            level: 'Liceum, zakres rozszerzony: wielomiany',
            more: [
                'Przykład: $x^{6}-64=(x^{3}-8)(x^{3}+8)$. Potem $x^{3}-8=(x-2)(x^{2}+2x+4)$ i $x^{3}+8=(x+2)(x^{2}-2x+4)$. Składamy: $x^{6}-64=(x-2)(x+2)(x^{2}-2x+4)(x^{2}+2x+4)$.',
                'Nawias $x^{2}+2x+4$ ma deltę $4-16=-12$, czyli ujemną, więc nie ma miejsc zerowych i zostaje w iloczynie.',
                'Przykład z granicy: $2x^{4}+4x^{3}-3x^{2}-10x-5=(x+1)^{2}(2x^{2}-5)$. Nawias $2x^{2}-5$ ma deltę $0+40=40$, więc miejsca zerowe ma, ale niewymierne ($\\pm\\sqrt{2{,}5}$). Po skróceniu $(x+1)^{2}$ nie jest już potrzebny, więc zostaje w całości.',
                'Skąd wzór: każdy krok rozkładu zamienia jeden nawias na iloczyn, który jest mu równy. Wstawienie równego w miejsce równego nie zmienia wartości, więc na końcu cały iloczyn równa się wyjściowemu wielomianowi. Sprawdzamy, wymnażając.',
                'Skąd nazwa: „czynniki” to wyrażenia, które mnożymy, a „rozkład na czynniki” to zapis wielomianu jako iloczynu.',
            ],
        },
        // ── podstawy granic (spec 2026-11-24-dymki-podstawy, zadanie 4) ──
        'granica-najwyzsza-potega': {
            name: 'Wyłączenie najwyższej potęgi w granicy',
            tex: '\\frac{a\\,n^{k}+\\dots}{b\\,n^{k}+\\dots}=\\frac{n^{k}\\left(a+\\dots\\right)}{n^{k}\\left(b+\\dots\\right)}=\\frac{a+\\dots}{b+\\dots}',
            why: 'Przy zmiennej rosnącej bez końca o wyniku decyduje wyraz, który rośnie najszybciej. Wyciągamy go przed nawias z góry i z dołu ułamka, skracamy, a reszta ma postać $\\frac{c}{n}$ i dąży do 0.',
            level: 'Liceum (rozszerzenie) i studia: granice ciągów i funkcji',
            more: [
                'Przykład: $\\frac{2n+1}{6n+5}=\\frac{n\\left(2+\\frac{1}{n}\\right)}{n\\left(6+\\frac{5}{n}\\right)}=\\frac{2+\\frac{1}{n}}{6+\\frac{5}{n}}\\to\\frac{2}{6}=\\frac{1}{3}$.',
                'Przy pierwiastkach „najwyższa” znaczy „rosnąca najszybciej”. W $\\sqrt{n}+7$ wygrywa $\\sqrt{n}$: wyłączamy go i zostaje $1+\\frac{7}{\\sqrt{n}}$.',
                'Przy $x\\to-\\infty$ często wyłączamy $-x$ zamiast $x$, bo $-x$ jest dodatnie, a dla ujemnego $x$ pierwiastek kwadratowy z $x^{2}$ to właśnie $-x$.',
                'Co wychodzi na końcu: gdy wyższa potęga stoi w mianowniku, granica to 0. Gdy potęgi są równe, granica to iloraz współczynników, jak w przykładzie. Gdy wyższa stoi w liczniku, po skróceniu zostaje potęga zmiennej i granica to $+\\infty$ albo $-\\infty$: przy $n\\to\\infty$ znak daje iloraz współczynników przy najwyższych potęgach, dodatni daje $+\\infty$, ujemny $-\\infty$ (hasło o granicach podstawowych).',
                'Skąd wzór: ten sam czynnik w liczniku i mianowniku można skrócić, bo nie jest zerem. Wyłączenie potęgi to dzielenie każdego wyrazu przez nią: z $2n+1$ robi się $n\\left(2+\\frac{1}{n}\\right)$, bo $n\\cdot 2=2n$ i $n\\cdot\\frac{1}{n}=1$. Wartość się nie zmienia, zmienia się zapis, w którym widać, co dąży do 0.',
                'Skąd nazwa: „wyłączamy przed nawias” to wyciągnięcie wspólnego czynnika przed nawias. „Najwyższa potęga” to ta z największym wykładnikiem.',
            ],
        },
        'granice-podstawowe': {
            name: 'Granice podstawowe w nieskończoności',
            tex: '\\lim_{n\\to\\infty}\\frac{c}{n^{k}}=0,\\qquad\\lim_{n\\to\\infty}n^{k}=+\\infty\\quad(k>0)',
            why: 'Dzielenie stałej przez coraz większą wartość daje wyniki bliskie 0. Potęga zmiennej z dodatnim wykładnikiem nie ma górnej granicy.',
            level: 'Liceum (rozszerzenie) i studia: granice ciągów i funkcji',
            more: [
                'Przykład: $\\frac{5}{n}$, $\\frac{3}{n^{2}}$ i $\\frac{1}{\\sqrt{n}}$ dążą do 0. Dla $n=1000$ mamy $\\frac{5}{n}=0{,}005$, a dla $n=1000000$ już $0{,}000005$.',
                'To samo przy $x\\to\\infty$ i $x\\to-\\infty$: $\\frac{c}{x^{k}}$ zbliża się do 0, a przy $x\\to-\\infty$ wartości mogą być ujemne.',
                'Potęga z dodatnim wykładnikiem rośnie bez końca, np. $n^{2}\\to+\\infty$ i $\\sqrt{n}\\to+\\infty$. Gdy po skróceniu w liczniku zostaje potęga zmiennej, wynik granicy to $+\\infty$.',
                'Uwaga: wzór dotyczy ułamka, w którym licznik jest stałą. Ułamek $\\frac{n}{n}$ nie dąży do 0, bo licznik też rośnie, dlatego najpierw wyłączamy potęgę i skracamy.',
                'Skąd wzór: chcemy, żeby $\\frac{c}{n}$ było mniejsze od $\\frac{1}{1000}$. Dla $c=5$ wystarczy $n>5000$, bo wtedy $\\frac{5}{n}<\\frac{1}{1000}$. Tak samo da się zejść poniżej każdej, nawet bardzo małej liczby, a właśnie to znaczy „granica 0”. Dla $\\frac{1}{\\sqrt{n}}$ rozumowanie jest takie samo: jest mniejsze od $\\frac{1}{1000}$, gdy $n>1000000$.',
                'Skąd nazwa: „dąży do” znaczy „zbliża się coraz bardziej”. „Granica” to liczba, do której wyrazy się zbliżają.',
            ],
        },
        'granica-ciaglosc': {
            name: 'Granica funkcji ciągłej: wstawiamy liczbę',
            tex: '\\lim_{x\\to a}f(x)=f(a)',
            why: 'Gdy wyrażenie ma w punkcie $a$ wartość i w jego pobliżu nie robi skoków, granica to właśnie ta wartość. Wystarczy wstawić $a$ za $x$.',
            level: 'Liceum (rozszerzenie) i studia: granice funkcji',
            more: [
                'Przykład: $\\lim_{x\\to 4}\\frac{x-2}{3x+2}=\\frac{4-2}{3\\cdot 4+2}=\\frac{2}{14}=\\frac{1}{7}$. Mianownik dla $x=4$ to 14, nie 0, więc wstawianie jest bezpieczne.',
                'Kiedy to działa: wielomiany, ułamki z mianownikiem różnym od 0 w tym punkcie, pierwiastki z liczb dodatnich, $\\sin x$ i $\\cos x$.',
                'Gdy wstawienie daje $\\frac{0}{0}$ (hasło o symbolu nieoznaczonym), najpierw przekształcamy i skracamy, a dopiero potem wstawiamy.',
                'Skąd wzór: funkcja jest ciągła w punkcie $a$, gdy jej wykres nie ma tam skoku ani dziury. Wtedy $x$ zbliżające się do $a$ daje wartości $f(x)$ zbliżające się do $f(a)$, a to jest dokładnie zapis $\\lim_{x\\to a}f(x)=f(a)$.',
                'Skąd nazwa: „ciągła” to taka, której wykres w tym miejscu da się narysować jednym pociągnięciem, bez odrywania ołówka.',
            ],
        },
        'skracanie-czynnika-w-granicy': {
            name: 'Skracanie czynnika w granicy',
            tex: '\\lim_{x\\to a}\\frac{(x-a)\\,g(x)}{(x-a)\\,h(x)}=\\lim_{x\\to a}\\frac{g(x)}{h(x)}',
            why: 'Wspólny nawias w liczniku i mianowniku skracamy. W granicy wolno, bo $x$ tylko zbliża się do $a$ i go nie osiąga, więc $x-a$ nie jest zerem.',
            level: 'Liceum (rozszerzenie) i studia: granice funkcji',
            more: [
                'Przykład: przy $x\\to 4$ mamy $\\frac{x^{2}-6x+8}{3x^{2}-10x-8}=\\frac{(x-4)(x-2)}{(x-4)(3x+2)}=\\frac{x-2}{3x+2}\\to\\frac{2}{14}=\\frac{1}{7}$.',
                'Obie funkcje, przed skróceniem i po, mają te same wartości wszędzie oprócz $x=4$, gdzie pierwsza nie istnieje. Granica pyta tylko o to, co dzieje się blisko 4, a nie w samym 4, dlatego granice są takie same.',
                'Skracamy czynnik (całość pomnożoną przez resztę), a nie składnik sumy: z $\\frac{x+3}{x}$ nic nie skrócimy.',
                'Skąd wzór: $\\frac{A\\cdot g}{A\\cdot h}=\\frac{A}{A}\\cdot\\frac{g}{h}$, a $\\frac{A}{A}=1$, gdy $A\\neq 0$. Dla $x\\neq a$ nawias $x-a$ nie jest zerem, więc skracanie jest dozwolone dla wszystkich $x$ blisko $a$.',
                'Skąd nazwa: „skracać” to dzielić licznik i mianownik przez to samo. Zapis robi się krótszy, a wartość zostaje ta sama.',
            ],
        },
        'granica-jednostronna': {
            name: 'Granica jednostronna',
            tex: '\\lim_{x\\to a^{+}}f(x)\\ \\ (x>a),\\qquad\\lim_{x\\to a^{-}}f(x)\\ \\ (x<a)',
            why: 'Do $a$ można dojść z dwóch stron. Plus przy $a$ znaczy „z prawej”: $x$ jest trochę większe od $a$. Minus znaczy „z lewej”: $x$ jest trochę mniejsze.',
            level: 'Liceum (rozszerzenie) i studia: granice funkcji',
            more: [
                'Przykład: $\\lim_{x\\to 0^{+}}\\frac{1}{x}=+\\infty$. Dla $x=0{,}1$ wychodzi 10, dla $x=0{,}001$ wychodzi 1000, a dla $x>0$ wynik jest zawsze dodatni.',
                'Z lewej strony, dla $x=-0{,}001$, wychodzi $-1000$, więc $\\lim_{x\\to 0^{-}}\\frac{1}{x}=-\\infty$. Obie granice jednostronne są różne, więc zwykła granica $\\lim_{x\\to 0}\\frac{1}{x}$ nie istnieje.',
                'Zwykła granica istnieje wtedy, gdy obie jednostronne istnieją i są równe.',
                'Skąd wzór: na osi liczbowej do $a$ można dojść od dołu albo od góry. Znak przy $a$ to tylko etykieta mówiąca, którą drogę wybraliśmy. To nie jest liczba $a+1$ ani $a-1$.',
                'Skąd nazwa: granica „jednostronna”, bo $x$ zbliża się do $a$ tylko z jednej strony.',
            ],
        },
        'granica-sumy': {
            name: 'Granica sumy i różnicy',
            tex: '\\lim\\left(f\\pm g\\right)=\\lim f\\pm\\lim g',
            why: 'Gdy każdy składnik ma skończoną granicę, granica sumy to suma granic, a różnicy to różnica granic. Wolno więc liczyć składniki oddzielnie.',
            level: 'Liceum (rozszerzenie) i studia: granice ciągów i funkcji',
            more: [
                'Przykład: $\\sqrt{n^{2}+9n}-2\\sqrt{n^{2}+1}+\\sqrt{n^{2}+5n}$ to $\\left(\\sqrt{n^{2}+9n}-\\sqrt{n^{2}+1}\\right)+\\left(\\sqrt{n^{2}+5n}-\\sqrt{n^{2}+1}\\right)$. Granice tych dwóch różnic to $\\frac{9}{2}$ i $\\frac{5}{2}$, więc całość dąży do $\\frac{9}{2}+\\frac{5}{2}=7$.',
                'Uwaga: wolno tylko wtedy, gdy każda część ma skończoną granicę. W $n-n$ obie części rosną bez końca i wzór nic nie mówi, to symbol $\\left[\\infty-\\infty\\right]$.',
                'Skąd wzór: gdy $f$ jest bardzo blisko $A$, a $g$ bardzo blisko $B$, to $f+g$ jest bardzo blisko $A+B$. Na przykład $f=4{,}99$ (blisko 5) i $g=2{,}51$ (blisko 2,5) dają $7{,}5$, czyli blisko $5+2{,}5$.',
                'Skąd nazwa: to granica policzona z sumy (albo z różnicy), z podziałem na granice składników.',
            ],
        },
        'ciaglosc-logarytmu': {
            name: 'Granica logarytmu',
            tex: '\\lim\\log_{a}f(x)=\\log_{a}\\left(\\lim f(x)\\right)\\quad\\text{gdy}\\ \\lim f(x)>0',
            why: 'Logarytm jest funkcją bez skoków, o ile argument jest dodatni. Dlatego szukamy, do czego dąży argument, i dopiero ten wynik logarytmujemy.',
            level: 'Liceum (rozszerzenie) i studia: granice',
            more: [
                'Przykład: $\\log_{2}(8n+1)-\\log_{2}(n+6)=\\log_{2}\\frac{8n+1}{n+6}$. Ułamek dąży do 8, więc granica to $\\log_{2}8=3$, bo $2^{3}=8$.',
                'Uwaga: wzór wymaga granicy dodatniej i skończonej. Gdy w środku jest coraz bliżej 0 (z dodatnich wartości), logarytm dąży do $-\\infty$, a gdy rośnie bez końca, do $+\\infty$.',
                'Skąd wzór: wykres $y=\\log_{a}x$ dla $x>0$ to gładka krzywa bez dziur i skoków. Gdy $f(x)$ zbliża się do liczby $L>0$, punkt wykresu zbliża się do punktu $(L,\\log_{a}L)$, więc wartość logarytmu zbliża się do $\\log_{a}L$.',
                'Skąd nazwa: to szczególny przypadek ciągłości (hasło o granicy funkcji ciągłej): funkcję nazywamy ciągłą, gdy jej wykres da się narysować bez odrywania ołówka.',
            ],
        },
        'sprawdzenie-calki': {
            name: 'Sprawdzenie całki pochodną',
            tex: '\\left(F(x)\\right)^{\\prime}=f(x)',
            why: 'Całka to działanie odwrotne do pochodnej. Dlatego wynik całkowania można sprawdzić: liczymy jego pochodną i patrzymy, czy wraca funkcja spod całki.',
            level: 'Liceum (rozszerzenie) i studia: całki',
            more: [
                'Przykład: $\\int x^{2}\\,dx=\\frac{x^{3}}{3}$. Pochodna wyniku to $\\left(\\frac{x^{3}}{3}\\right)^{\\prime}=\\frac{3x^{2}}{3}=x^{2}$, czyli dokładnie to, co było pod całką. Gdy wychodzi to samo, wynik jest dobry.',
                'Stałą $C$ pomijamy, bo pochodna liczby to $0$ i $C$ po zróżniczkowaniu znika.',
                'Skąd wzór: całka nieoznaczona z $f$ to z definicji funkcja $F$, której pochodna równa się $f$. Sprawdzenie robi dokładnie to, co mówi definicja.',
                'Skąd nazwa: $F$ nazywamy funkcją pierwotną, bo od niej „zaczynamy”: jej pochodna daje $f$.',
            ],
        },
        'liniowosc-pochodnej': {
            name: 'Liczba przy pochodnej',
            tex: '\\left(c\\cdot f(x)\\right)^{\\prime}=c\\cdot f^{\\prime}(x)',
            why: 'Liczba, która mnoży funkcję, nie bierze udziału w różniczkowaniu. Zostaje przed pochodną, a pochodną liczymy tylko z samej funkcji. Na końcu mnożymy.',
            level: 'Liceum (rozszerzenie) i studia: pochodne',
            more: [
                'Przykład: $\\left(5x^{3}\\right)^{\\prime}=5\\cdot\\left(x^{3}\\right)^{\\prime}=5\\cdot 3x^{2}=15x^{2}$.',
                'Skąd wzór: wykres $5f$ to wykres $f$ rozciągnięty 5 razy w pionie. Rozciągnięcie w pionie zwiększa nachylenie wykresu w każdym punkcie tyle samo razy, a pochodna to właśnie nachylenie. Dlatego pochodna też jest 5 razy większa.',
                'Podobnie dla sumy: $(f+g)^{\\prime}=f^{\\prime}+g^{\\prime}$, czyli różniczkujemy każdy składnik osobno.',
                'Stałą jest też każda litera inna niż zmienna, po której liczymy pochodną: po $t$ mamy $\\left(a t^{2}\\right)^{\\prime}=a\\cdot\\left(t^{2}\\right)^{\\prime}=2at$.',
                'Skąd nazwa: liczbę $c$ w takim miejscu nazywa się stałą, bo przy różniczkowaniu po $x$ się nie zmienia. Wzór mówi, że stała „zostaje przed pochodną”.',
            ],
        },
        'liniowosc-calki': {
            name: 'Liczba przed całką i całka sumy',
            tex: '\\int c\\,f(x)\\,dx=c\\int f(x)\\,dx,\\qquad\\int\\left(f+g\\right)dx=\\int f\\,dx+\\int g\\,dx',
            why: 'Liczbę mnożącą funkcję wyłączamy przed całkę, a całkę z sumy liczymy jako sumę całek z każdego składnika. Dzięki temu trudną całkę dzielimy na proste, znane z tablicy.',
            level: 'Liceum (rozszerzenie) i studia: całki',
            more: [
                'Przykład: $\\int(2x+1)\\,dx=\\int 2x\\,dx+\\int 1\\,dx=2\\int x\\,dx+x=x^{2}+x$.',
                'Po policzeniu mnożymy wynik z powrotem przez wyłączoną liczbę: $2\\cdot\\frac{x^{2}}{2}=x^{2}$.',
                'Uwaga: tak wolno tylko z liczbą. Funkcji z $x$ przed całkę wyłączyć nie można, np. $\\int x\\cdot e^{x}\\,dx$ nie jest równe $x\\int e^{x}\\,dx$.',
                'Skąd wzór: całkowanie jest odwrotne do różniczkowania, a tam obowiązują takie same zasady: $(c\\,f)^{\\prime}=c\\,f^{\\prime}$ i $(f+g)^{\\prime}=f^{\\prime}+g^{\\prime}$. Czytane od tyłu dają dokładnie powyższy wzór.',
                'Skąd nazwa: własność „rozdzielności” względem sumy i stałej matematycy nazywają liniowością. W krokach mówimy po prostu: wyłączamy stałą, całka sumy to suma całek.',
            ],
        },
        'ulamki-proste': {
            name: 'Rozkład na ułamki proste',
            tex: '\\frac{px+q}{(x-a)(x-b)}=\\frac{A}{x-a}+\\frac{B}{x-b}',
            why: 'Ułamek z rozłożonym mianownikiem zapisujemy jako sumę prostych ułamków. Każdy prosty ułamek całkujemy osobno i daje logarytm. Liczby $A$ i $B$ wyznaczamy, wstawiając miejsca zerowe mianownika.',
            level: 'Liceum (rozszerzenie) i studia: całki',
            more: [
                'Przykład: $\\frac{1}{x^{2}-1}=\\frac{1}{(x+1)(x-1)}=\\frac{A}{x+1}+\\frac{B}{x-1}$. Mnożymy przez mianownik: $1=A(x-1)+B(x+1)$.',
                'Wyznaczamy $A$ i $B$: dla $x=1$ znika pierwszy składnik i zostaje $1=2B$, czyli $B=\\frac{1}{2}$. Dla $x=-1$ znika drugi i $1=-2A$, czyli $A=-\\frac{1}{2}$.',
                'Każdy ułamek $\\frac{A}{x-a}$ całkujemy jak $\\frac{1}{x}$: wychodzi $A\\cdot\\ln|x-a|$.',
                'Skąd wzór: to odwrócone dodawanie ułamków. Dodając $\\frac{A}{x+1}+\\frac{B}{x-1}$ sprowadzamy do wspólnego mianownika $(x+1)(x-1)$, więc licznik to $A(x-1)+B(x+1)$. Szukamy takich $A$ i $B$, żeby licznik wyszedł taki, jak w zadaniu.',
                'Skąd nazwa: „proste” ułamki mają w mianowniku tylko jeden nawias z $x$, więc umiemy je całkować.',
            ],
        },
        'podstawienie-w-calce': {
            name: 'Całka przez podstawienie',
            tex: '\\int f\\left(g(x)\\right)g^{\\prime}(x)\\,dx=\\int f(t)\\,dt,\\quad t=g(x)',
            why: 'Gdy pod całką jest wyrażenie złożone, oznaczamy je nową literą $t$. Całka robi się prostsza. Po policzeniu wracamy do $x$, podstawiając za $t$ to, co oznaczaliśmy.',
            level: 'Liceum (rozszerzenie) i studia: całki',
            more: [
                'Przykład: $\\int(2x+1)^{3}\\,dx$. Podstawiamy $t=2x+1$. Wtedy $dt=2\\,dx$, czyli $dx=\\frac{dt}{2}$, i mamy $\\int\\frac{t^{3}}{2}\\,dt=\\frac{t^{4}}{8}$.',
                'Wracamy do zmiennej: za $t$ wstawiamy $2x+1$ i wychodzi $\\frac{(2x+1)^{4}}{8}+C$. Bez powrotu odpowiedź byłaby w złej literze.',
                'Skąd wzór: to pochodna funkcji złożonej czytana od tyłu. $\\left(F(g(x))\\right)^{\\prime}=F^{\\prime}(g(x))\\,g^{\\prime}(x)$, więc funkcja pod całką z dodatkowym $g^{\\prime}(x)$ ma całkę $F(g(x))$. Zapis $dt=g^{\\prime}(x)\\,dx$ pilnuje tego dodatkowego czynnika.',
                'Skąd nazwa: w całce „podstawiamy” nową zmienną w miejsce wyrażenia.',
            ],
        },
        'kolejnosc-dzialan': {
            name: 'Kolejność działań',
            tex: '(\\ )\\ \\to\\ a^{n}\\ \\to\\ \\cdot,\\ :\\ \\to\\ +,\\ -',
            why: 'Najpierw liczymy w nawiasach, potem potęgi, potem mnożenie i dzielenie, a na końcu dodawanie i odejmowanie. Każdy krok wykonuje jedno działanie z początku tej listy.',
            level: 'Szkoła podstawowa: działania',
            more: [
                'Przykład: $2\\cdot(3+4)^{2}$. Najpierw nawias: $3+4=7$. Potem potęga: $7^{2}=49$. Na końcu mnożenie: $2\\cdot 49=98$.',
                'Typowy błąd: $2+3\\cdot 4$ to $14$, a nie $20$, bo mnożenie wykonujemy przed dodawaniem.',
                'Działania tego samego rzędu, np. mnożenie i dzielenie, liczymy od lewej do prawej: $6:2\\cdot 3=3\\cdot 3=9$.',
                'Skąd wzór: mnożenie to skrócony zapis dodawania, np. $4\\cdot 3=4+4+4$. Skoro mnożenie jest „skrótem” dodawań, to w wyrażeniu $2+4\\cdot 3$ całe $4\\cdot 3$ jest jedną liczbą i trzeba je wyliczyć jako pierwsze. Potęga to z kolei skrót mnożenia, więc jest przed nim.',
                'Skąd nazwa: to umowa, którą wszyscy stosują, żeby ten sam zapis dawał każdemu ten sam wynik.',
            ],
        },
        'skracanie-ulamka': {
            name: 'Skracanie ułamka',
            tex: '\\frac{a\\cdot k}{b\\cdot k}=\\frac{a}{b}\\quad(k\\neq 0)',
            why: 'Gdy licznik i mianownik mają ten sam czynnik, dzielimy przez niego oba. Ułamek ma wtedy tę samą wartość, a zapis jest krótszy. W wyrażeniu z $x$ trzeba pilnować, żeby skracany nawias nie był zerem.',
            level: 'Szkoła podstawowa i liceum: ułamki',
            more: [
                'Przykład z liczbami: $\\frac{9}{6}=\\frac{3\\cdot 3}{2\\cdot 3}=\\frac{3}{2}$.',
                'Przykład z $x$: $\\frac{(2x-1)(2x+1)}{2x-1}=2x+1$, ale tylko dla $x\\neq\\frac{1}{2}$, bo wtedy $2x-1=0$ i przez zero dzielić nie wolno. Dlatego krok dopisuje „dla $x\\neq\\dots$”.',
                'Skracać można tylko czynniki, czyli to, co jest pomnożone. W $\\frac{x+2}{2}$ nie wolno „skrócić” dwójek, bo $x+2$ to suma.',
                'Skąd wzór: $\\frac{a\\cdot k}{b\\cdot k}=\\frac{a}{b}\\cdot\\frac{k}{k}=\\frac{a}{b}\\cdot 1$. Ułamek $\\frac{k}{k}$ to jedynka, a mnożenie przez jeden niczego nie zmienia.',
                'Skąd nazwa: ułamek „skracamy”, bo licznik i mianownik stają się mniejsze, krótsze w zapisie.',
            ],
        },
        'dzielenie-z-reszta': {
            name: 'Dzielenie licznika przez mianownik',
            tex: '\\frac{P(x)}{Q(x)}=W(x)+\\frac{R(x)}{Q(x)}',
            why: 'Gdy stopień licznika nie jest mniejszy od stopnia mianownika, najpierw dzielimy wielomiany. Wychodzi część całkowita i reszta, a reszta ma już niższy stopień, więc da się ją rozłożyć na ułamki proste.',
            level: 'Liceum (rozszerzenie) i studia: całki',
            more: [
                'Przykład: $\\frac{x^{3}}{x^{2}-1}$. Dzielimy: $x^{3}=x\\cdot(x^{2}-1)+x$, więc $\\frac{x^{3}}{x^{2}-1}=x+\\frac{x}{x^{2}-1}$. Całość to $x$, a reszta to $x$.',
                'Całość całkujemy od razu ($\\int x\\,dx=\\frac{x^{2}}{2}$), a ułamek z resztą rozkładamy dalej na ułamki proste.',
                'Skąd wzór: tak samo jak przy liczbach. $7:2$ to $3$ i reszta $1$, czyli $\\frac{7}{2}=3+\\frac{1}{2}$. Wielomiany dzielimy tak samo, zapisując $P=W\\cdot Q+R$ i dzieląc obie strony przez $Q$.',
                'Skąd nazwa: „całość” to część całkowita ułamka, tak jak w $3\\frac{1}{2}$, a „reszta” to to, co zostaje po dzieleniu.',
            ],
        },
        'pierwiastek-iloczynu': {
            name: 'Liczba spod pierwiastka przed pierwiastek',
            tex: '\\sqrt{a\\cdot b}=\\sqrt{a}\\cdot\\sqrt{b}\\quad(a,b\\ge 0)',
            why: 'Pierwiastek z iloczynu to iloczyn pierwiastków, więc każdy czynnik można wyciągnąć osobno. Gdy czynnik jest kwadratem liczby, wychodzi jako liczba, np. $\\sqrt{8}=2\\sqrt{2}$. Gdy nie jest, zostaje osobnym pierwiastkiem, np. $\\sqrt{4n^{2}+2}=\\sqrt{2}\\cdot\\sqrt{2n^{2}+1}$.',
            level: 'Szkoła podstawowa i liceum: pierwiastki',
            more: [
                'Przykład: $\\sqrt{8}=\\sqrt{4\\cdot 2}=\\sqrt{4}\\cdot\\sqrt{2}=2\\sqrt{2}$. Szukamy największego kwadratu, który dzieli liczbę pod pierwiastkiem.',
                'Pierwiastek z delty upraszczamy tak samo: $\\sqrt{8}=2\\sqrt{2}$, więc rozwiązania mają prostszy zapis.',
                'Dla pierwiastka trzeciego stopnia działa to samo: $\\sqrt[3]{54}=\\sqrt[3]{27\\cdot 2}=3\\sqrt[3]{2}$.',
                'Czynnik nie musi być kwadratem: $4n^{2}+2=2(2n^{2}+1)$, więc $\\sqrt{4n^{2}+2}=\\sqrt{2}\\cdot\\sqrt{2n^{2}+1}$. Pod pierwiastkiem zostają mniejsze liczby, a wartość się nie zmienia.',
                'Uwaga: tak wolno tylko z iloczynem. $\\sqrt{a+b}$ nie jest równe $\\sqrt{a}+\\sqrt{b}$.',
                'Skąd wzór: sprawdzamy, podnosząc do kwadratu. $\\left(\\sqrt{a}\\cdot\\sqrt{b}\\right)^{2}=\\left(\\sqrt{a}\\right)^{2}\\cdot\\left(\\sqrt{b}\\right)^{2}=a\\cdot b$, więc $\\sqrt{a}\\cdot\\sqrt{b}$ to nieujemna liczba, której kwadrat to $ab$, czyli właśnie $\\sqrt{ab}$.',
                'Skąd nazwa: liczbę „wyłączamy” albo „wyciągamy” spod znaku pierwiastka na zewnątrz.',
            ],
        },
        'wciaganie-do-nawiasu': {
            name: 'Wciąganie liczby do nawiasu',
            tex: 'k\\left(x+\\frac{p}{k}\\right)=kx+p',
            why: 'Gdy w nawiasie stoi ułamek, liczbę sprzed nawiasu mnożymy przez ułamek i nawias robi się bez ułamków. Wartość całego wyrażenia się nie zmienia.',
            level: 'Liceum: wyrażenia algebraiczne',
            more: [
                'Przykład: $2\\left(x-\\frac{1}{2}\\right)=(2x-1)$, bo $2\\cdot x=2x$, a $2\\cdot\\frac{1}{2}=1$.',
                'Przy mianowniku $3\\left(x+\\frac{2}{3}\\right)=(3x+2)$. Trójka „wchodzi” do nawiasu i skraca się z mianownikiem.',
                'Skąd wzór: to opuszczanie nawiasów od końca. $k\\left(x+\\frac{p}{k}\\right)=k\\cdot x+k\\cdot\\frac{p}{k}=kx+p$.',
                'Skąd nazwa: liczbę, która stała przed nawiasem, „wciągamy” do środka.',
            ],
        },
        'znak-ulamka': {
            name: 'Znak minus w ułamku',
            tex: '\\frac{a}{b}=-\\frac{a}{-b}=\\frac{-a}{-b}=-\\frac{-a}{b}',
            why: 'Zmiana znaku licznika i mianownika naraz nie zmienia wartości ułamka, a zmiana znaku tylko jednego z nich daje minus przed ułamkiem. Dzięki temu w mianowniku stawiamy wyrazy w kolejności, której potrzebuje następny krok, np. mnożenie przez sprzężenie: $(a-b)(a+b)=a^{2}-b^{2}$.',
            level: 'Liceum: ułamki i granice',
            more: [
                'Przykład: $\\frac{3}{-2}=-\\frac{3}{2}$ oraz $\\frac{-3}{-2}=\\frac{3}{2}$.',
                'Przykład z granicy: $\\frac{x-5}{3-\\sqrt{x+4}}=-\\frac{x-5}{\\sqrt{x+4}-3}$. W mianowniku zamieniliśmy kolejność na $\\sqrt{x+4}-3$, a minus wylądował przed ułamkiem.',
                'Skąd wzór: zmiana znaku wszystkich wyrazów to mnożenie przez $-1$. Ułamek $\\frac{-1}{-1}$ to jedynka, więc mnożenie licznika i mianownika przez $-1$ niczego nie zmienia: $\\frac{a}{b}=\\frac{a\\cdot(-1)}{b\\cdot(-1)}=\\frac{-a}{-b}$.',
                'Skąd nazwa: to po prostu przepisanie minusa w inne miejsce ułamka.',
            ],
        },
        'liczba-przy-x': {
            name: 'Ułamek przy niewiadomej',
            tex: '\\frac{ax}{b}=\\frac{a}{b}\\cdot x',
            why: 'Ułamek, w którym licznik ma $x$, można zapisać jako liczbę razy $x$. Liczba przy $x$ to współczynnik, który potem dzielimy lub mnożymy po obu stronach.',
            level: 'Szkoła podstawowa i liceum: równania liniowe',
            more: [
                'Przykład: $\\frac{2x}{3}=4$ to to samo co $\\frac{2}{3}x=4$. Współczynnik przy $x$ to $\\frac{2}{3}$.',
                'Dalej mnożymy obie strony przez odwrotność współczynnika, czyli $\\frac{3}{2}$, i dostajemy $x=6$.',
                'Skąd wzór: $\\frac{2x}{3}$ to dwa iksy podzielone na trzy części, czyli $2\\cdot x:3=\\frac{2}{3}\\cdot x$. Kolejność mnożenia nie ma znaczenia.',
                'Skąd nazwa: liczbę stojącą przy niewiadomej nazywamy współczynnikiem.',
            ],
        },
    };
    // tg, arcsin, arctg: ten sam pomysł co sin u/u, inny wzór w dymku
    for (const [id, fn, name] of [['tgu', '\\operatorname{tg}', 'tg'], ['arcsinu', '\\arcsin', 'arcsin'], ['arctgu', '\\operatorname{arctg}', 'arctg']]) {
        FORMULAS[id] = Object.assign({}, FORMULAS.sinu, {
            name: 'Granica ' + name + ' u przez u',
            tex: '\\frac{' + fn + ' u}{u}\\to 1\\quad\\text{gdy } u\\to 0',
            why: 'Pod funkcją i w mianowniku musi stać to samo $u$, które dąży do 0. Kolorowy ułamek zastępujemy jedynką.',
        });
    }

    // Podręcznik (spec 2026-11-23-podrecznik-design.md): działy w kolejności jak w szkole.
    const DZIALY = [
        { id: 'liczby', name: 'Liczby i procenty' },
        { id: 'wyrazenia', name: 'Wyrażenia algebraiczne' },
        { id: 'rownania', name: 'Równania i nierówności' },
        { id: 'funkcje', name: 'Funkcje' },
        { id: 'potegi-log', name: 'Potęgi i logarytmy' },
        { id: 'trygonometria', name: 'Trygonometria' },
        { id: 'granice', name: 'Granice' },
        { id: 'pochodne', name: 'Pochodne' },
        { id: 'calki', name: 'Całki' },
    ];
    // id: [dział, poziom (najniższy, na którym uczeń poznaje wzór), słowa do wyszukiwarki, „Spróbuj”, obiecany wynik, powiązane]
    /** @type {Record<string, [string, 'lp'|'lr'|'st', string[], string, string, string[]]>} */
    const HANDBOOK = {
        e: ['granice', 'st', ['liczba e', 'jeden do nieskończoności', 'granica ciągu'], 'lim n→∞ (1-1/n)^n', '1/e', ['nieoznaczone', 'ln1u', 'potega-ilorazu', 'e-skrocony']],
        sprzezenie: ['granice', 'lp', ['sprzężenie', 'mnożenie przez sprzężenie', 'nieskończoność minus nieskończoność', 'pierwiastki'], 'lim n→∞ (sqrt(2n+5)-sqrt(2n+1))', '0', ['roznica-kwadratow', 'roznica-szescianow', 'nieoznaczone']],
        'roznica-szescianow': ['wyrazenia', 'lr', ['sześciany', 'pierwiastek trzeciego stopnia', 'wzory skróconego mnożenia'], 'lim n→∞ (∛(n^3+8n^2)-∛(n^3+2n^2))', '2', ['sprzezenie', 'roznica-czwartych', 'suma-szescianow']],
        'suma-szescianow': ['wyrazenia', 'lr', ['suma sześcianów', 'sześciany', 'wzory skróconego mnożenia', 'rozkład na czynniki'], 'rozłóż x^3 + 8', '(x + 2)(x² − 2x + 4)', ['roznica-szescianow', 'wylaczanie-przed-nawias', 'delta']],
        'roznica-czwartych': ['wyrazenia', 'st', ['czwarte potęgi', 'pierwiastek czwartego stopnia'], 'lim n→∞ (∜(n^4+7n^3)-∜(n^4-n^3))', '2', ['roznica-szescianow', 'sprzezenie']],
        'pierwiastek-z-kwadratu': ['wyrazenia', 'lp', ['wartość bezwzględna', 'moduł', 'pierwiastek z kwadratu'], 'lim x→-∞ x/sqrt(3x^2+5)', '−√3/3', ['sprzezenie', 'wartosc-bezwzgledna']],
        'log-iloraz': ['potegi-log', 'lp', ['logarytm ilorazu', 'różnica logarytmów', 'log'], 'lim n→∞ (log_2(8n+1)-log_2(n+6))', '3', ['definicja-logarytmu']],
        'potega-iloczynu': ['potegi-log', 'lp', ['potęga iloczynu', 'mnożenie potęg', 'dodawanie wykładników', 'nawias do potęgi'], 'lim n→∞ ((3n+1)^2(4n+5))/((2n+3)^2(3n+4))', '3', ['potega-ilorazu', 'granica-najwyzsza-potega']],
        'potega-ilorazu': ['potegi-log', 'lp', ['potęga ilorazu', 'potęga ułamka', 'działania na potęgach'], 'lim n→∞ (n+3)^(2n^2+12n)/(n^2+6n)^(n^2+6n)', 'e⁹', ['e']],
        sinu: ['granice', 'st', ['sinus', 'granica specjalna', 'sin x przez x'], 'lim x→0 sin(3x)/x', '3', ['tgu', 'arcsinu', 'arctgu', 'lhospital']],
        ln1u: ['granice', 'st', ['logarytm naturalny', 'granica specjalna', 'ln'], 'lim x→0 ln(1+2x)/x', '2', ['eu', 'e']],
        eu: ['granice', 'st', ['funkcja wykładnicza', 'granica specjalna', 'e do x'], 'lim x→0 (e^x-1)/x', '1', ['ln1u', 'e']],
        lhospital: ['granice', 'st', ['de l\'Hospital', 'reguła de l\'Hospitala', 'zero przez zero', 'pochodne'], 'lim x→0 sin(3x)/x', '3', ['nieoznaczone', 'sinu', 'tablica-pochodnych']],
        nieoznaczone: ['granice', 'st', ['symbol nieoznaczony', 'zero przez zero', 'nieskończoność przez nieskończoność'], 'lim x→0 sin(3x)/x', '3', ['lhospital', 'e', 'sprzezenie']],
        delta: ['rownania', 'lp', ['delta', 'wyróżnik', 'równanie kwadratowe', 'trójmian'], 'rozwiąż x^2 - 5x + 6 = 0', 'x₁ = 2, x₂ = 3', ['wzory-x12', 'wzor-x0', 'postac-iloczynowa', 'nierownosc-kwadratowa', 'wzory-viete']],
        'wzory-x12': ['rownania', 'lp', ['pierwiastki trójmianu', 'miejsca zerowe', 'równanie kwadratowe', 'x1 x2'], 'rozwiąż x^2 - 2x - 1 = 0', 'x₁ = 1 − √2, x₂ = 1 + √2', ['delta', 'wzor-x0', 'postac-iloczynowa']],
        'wzor-x0': ['rownania', 'lp', ['pierwiastek podwójny', 'delta równa zero', 'jedno rozwiązanie'], 'rozwiąż x^2 - 4x + 4 = 0', 'x = 2', ['delta', 'wzory-x12', 'kwadrat-sumy']],
        bezout: ['rownania', 'lr', ['twierdzenie Bezouta', 'wielomian', 'pierwiastek wielomianu', 'dzielniki wyrazu wolnego'], 'rozwiąż x^3-6x^2+11x-6=0', 'x₁ = 1, x₂ = 2, x₃ = 3', ['postac-iloczynowa', 'delta', 'schemat-hornera']],
        'roznica-kwadratow': ['wyrazenia', 'lp', ['różnica kwadratów', 'wzory skróconego mnożenia', 'rozkład na czynniki'], 'rozłóż x^2 - 9', '(x − 3)(x + 3)', ['kwadrat-sumy', 'sprzezenie', 'postac-iloczynowa']],
        'wylaczanie-przed-nawias': ['wyrazenia', 'lp', ['wyłączanie przed nawias', 'wspólny czynnik', 'rozkład na czynniki'], 'rozłóż x^3-x', 'x(x − 1)(x + 1)', ['grupowanie-wyrazow', 'roznica-kwadratow', 'postac-iloczynowa']],
        'grupowanie-wyrazow': ['wyrazenia', 'lp', ['grupowanie wyrazów', 'grupowanie', 'rozkład na czynniki', 'wielomian czterowyrazowy'], 'rozłóż x^3-2x^2+x-2', '(x − 2)(x² + 1)', ['wylaczanie-przed-nawias', 'roznica-kwadratow', 'bezout']],
        'podstawienie-t': ['rownania', 'lr', ['podstawienie t', 'równanie dwukwadratowe', 'x do czwartej', 'zamiana zmiennej'], 'rozwiąż x^4-5x^2+4=0', 'x₁ = −2, x₂ = −1, x₃ = 1, x₄ = 2', ['delta', 'wzory-viete', 'postac-iloczynowa']],
        'postac-iloczynowa': ['funkcje', 'lp', ['postać iloczynowa', 'rozkład trójmianu', 'funkcja kwadratowa', 'miejsca zerowe'], 'rozłóż x^2 - 5x + 6', '(x − 2)(x − 3)', ['delta', 'wzory-x12', 'wierzcholek']],
        'kwadrat-sumy': ['wyrazenia', 'lp', ['kwadrat sumy', 'wzory skróconego mnożenia', 'nawias do kwadratu'], 'kroki (x+3)^2', 'x² + 6x + 9', ['roznica-kwadratow', 'wzor-x0', 'kwadrat-roznicy']],
        'kwadrat-roznicy': ['wyrazenia', 'lp', ['kwadrat różnicy', 'wzory skróconego mnożenia', 'nawias do kwadratu', 'rozkład na czynniki'], 'rozłóż x^2 - 6x + 9', '(x − 3)²', ['kwadrat-sumy', 'roznica-kwadratow', 'wzor-x0']],
        'pochodna-potegi': ['pochodne', 'lr', ['pochodna potęgi', 'pochodna x do n', 'różniczkowanie'], 'pochodna 5x^3', 'f′(x) = 15x²', ['tablica-pochodnych', 'pochodna-iloczynu', 'calka-potegi']],
        'pochodna-iloczynu': ['pochodne', 'lr', ['pochodna iloczynu', 'iloczyn funkcji', 'różniczkowanie'], 'pochodna x^2*e^x', 'f′(x) = 2x · e^x + x² · e^x', ['pochodna-ilorazu', 'pochodna-potegi', 'przez-czesci']],
        'pochodna-ilorazu': ['pochodne', 'lr', ['pochodna ilorazu', 'pochodna ułamka', 'różniczkowanie'], 'pochodna x/(x+1)', 'f′(x) = 1/(x + 1)²', ['pochodna-iloczynu', 'pochodna-potegi']],
        'pochodna-zlozona': ['pochodne', 'st', ['pochodna funkcji złożonej', 'pochodna wewnętrzna', 'reguła łańcuchowa'], 'pochodna sin(x^2)', 'f′(x) = 2x · cos(x²)', ['tablica-pochodnych', 'pochodna-iloczynu']],
        'tablica-pochodnych': ['pochodne', 'lr', ['tablica pochodnych', 'pochodne funkcji elementarnych', 'sin', 'cos', 'ln', 'e do x'], 'pochodna ln(x^2+1)', 'f′(x) = 2x/(x² + 1)', ['pochodna-potegi', 'pochodna-zlozona', 'tablica-calek']],
        'calka-potegi': ['calki', 'st', ['całka potęgi', 'całka x do n', 'funkcja pierwotna'], 'całka x^2 od 0 do 1', '1/3', ['tablica-calek', 'pochodna-potegi', 'newton-leibniz']],
        'tablica-calek': ['calki', 'st', ['tablica całek', 'całki elementarne', 'funkcja pierwotna'], 'całka sin(x) od 0 do π', '2', ['calka-potegi', 'tablica-pochodnych', 'przez-czesci']],
        'calka-arctg': ['calki', 'st', ['arcus tangens', 'arctg', 'całka wymierna'], 'całka 1/(x^2+4)', 'arctg(x/2)/2 + C', ['tablica-calek']],
        'przez-czesci': ['calki', 'st', ['całkowanie przez części', 'całka iloczynu'], 'całka x*sin(x)', 'sin(x) − x · cos(x) + C', ['pochodna-iloczynu', 'tablica-calek']],
        'newton-leibniz': ['calki', 'st', ['całka oznaczona', 'Newton-Leibniz', 'pole pod wykresem', 'granice całkowania'], 'całka 1/x od 1 do e', '1', ['calka-potegi', 'tablica-calek']],
        'sin-kwadrat': ['trygonometria', 'lr', ['sinus do kwadratu', 'cosinus podwojonego kąta', 'tożsamości trygonometryczne'], 'całka sin(x)^2', 'x/2 − sin(2x)/4 + C', ['cos-kwadrat', 'tg-kwadrat']],
        'cos-kwadrat': ['trygonometria', 'lr', ['cosinus do kwadratu', 'cosinus podwojonego kąta', 'tożsamości trygonometryczne'], 'całka cos(x)^2', 'x/2 + sin(2x)/4 + C', ['sin-kwadrat', 'tg-kwadrat']],
        wierzcholek: ['funkcje', 'lp', ['wierzchołek paraboli', 'postać kanoniczna', 'funkcja kwadratowa', 'p q'], 'wierzchołek x^2 - 4x + 3', 'W = (2, −1)', ['postac-iloczynowa', 'delta', 'nierownosc-kwadratowa']],
        'definicja-logarytmu': ['potegi-log', 'lp', ['logarytm', 'definicja logarytmu', 'log', 'podstawa logarytmu'], 'rozwiąż log(x) = 2', 'x = 100', ['log-iloraz']],
        'tg-kwadrat': ['trygonometria', 'lr', ['tangens do kwadratu', 'jedynka trygonometryczna', 'tożsamości trygonometryczne'], 'całka tan(x)^2', 'tg(x) − x + C', ['sin-kwadrat', 'cos-kwadrat']],
        tgu: ['granice', 'st', ['tangens', 'granica specjalna', 'tg x przez x'], 'lim x→0 tan(2x)/x', '2', ['sinu', 'arctgu']],
        arcsinu: ['granice', 'st', ['arcus sinus', 'granica specjalna', 'arcsin'], 'lim x→0 arcsin(2x)/x', '2', ['sinu', 'arctgu']],
        arctgu: ['granice', 'st', ['arcus tangens', 'granica specjalna', 'arctg'], 'lim x→0 arctg(3x)/x', '3', ['tgu', 'arcsinu', 'calka-arctg']],
        'liczba-przeciwna': ['granice', 'lr', ['liczba przeciwna', 'minus x', 'x do minus nieskończoności', 'pierwiastek z −x'], 'lim x→-∞ sqrt(1-x)/sqrt(4-x)', '1', ['pierwiastek-z-kwadratu', 'granica-najwyzsza-potega', 'pierwiastek-iloczynu']],
        'znak-trojmianu': ['rownania', 'lp', ['delta ujemna', 'brak miejsc zerowych', 'znak trójmianu', 'parabola nad osią'], 'rozwiąż x^2 + 1 > 0', 'x ∈ ℝ', ['nierownosc-kwadratowa', 'delta', 'wzor-x0']],
        'nierownosc-kwadratowa': ['rownania', 'lp', ['nierówność kwadratowa', 'parabola', 'znak trójmianu', 'przedział'], 'rozwiąż x^2 - 4 < 0', 'x ∈ (−2, 2)', ['delta', 'wzory-x12', 'wierzcholek', 'odwracanie-znaku']],
        'uklad-podstawianie': ['rownania', 'lp', ['układ równań', 'metoda podstawiania', 'dwie niewiadome'], 'rozwiąż 2x + y = 7, x - y = 2', 'x = 3, y = 1', ['uklad-przeciwne']],
        'uklad-przeciwne': ['rownania', 'lp', ['układ równań', 'przeciwne współczynniki', 'metoda dodawania', 'dodawanie stronami'], 'rozwiąż 2x + y = 7, x - y = 2', 'x = 3, y = 1', ['uklad-podstawianie']],
        'wartosc-bezwzgledna': ['rownania', 'lp', ['wartość bezwzględna', 'moduł', 'odległość na osi'], 'rozwiąż |x-2| < 3', 'x ∈ (−1, 5)', ['pierwiastek-z-kwadratu', 'nierownosc-kwadratowa']],
        'wartosci-trygonometryczne': ['trygonometria', 'lp', ['sinus', 'cosinus', 'tangens', 'wartości z tablicy', 'kąty 30 45 60'], 'rozwiąż sin(x) = 1/2', 'x = π/6 + 2kπ lub x = 5π/6 + 2kπ, k ∈ ℤ', ['okresowosc', 'sin-kwadrat']],
        okresowosc: ['trygonometria', 'lp', ['okres', 'okresowość', 'k całkowite', 'seria rozwiązań', 'równanie trygonometryczne'], 'rozwiąż tg(x) = 1', 'x = π/4 + kπ, k ∈ ℤ', ['wartosci-trygonometryczne']],
        'procent-z-liczby': ['liczby', 'lp', ['procent', 'procent z liczby', 'ile procent', 'część całości'], 'kroki 20% z 150', '30', ['zmiana-o-procent']],
        'zmiana-o-procent': ['liczby', 'lp', ['podwyżka', 'obniżka', 'zmiana o procent', 'rabat', 'VAT'], 'kroki 150 + 20%', '180', ['procent-z-liczby']],
        'e-skrocony': ['granice', 'st', ['wzór skrócony', 'jeden do nieskończoności', 'liczba e', 'granica potęgi'], 'lim n→∞ (1+2/n)^n', 'e²', ['e', 'nieoznaczone']],
        'wzory-viete': ['rownania', 'lr', ['wzory Viète\'a', 'Viete', 'suma i iloczyn', 'odgadywanie rozwiązań'], 'rozwiąż x^2 - 5x + 6 = 0', 'x₁ = 2, x₂ = 3', ['delta', 'postac-iloczynowa']],
        'schemat-hornera': ['rownania', 'lr', ['schemat Hornera', 'dzielenie wielomianu', 'wielomian', 'reszta z dzielenia'], 'rozwiąż x^3-6x^2+11x-6=0', 'x₁ = 1, x₂ = 2, x₃ = 3', ['bezout', 'postac-iloczynowa']],
        'odwracanie-znaku': ['rownania', 'lp', ['odwracanie znaku', 'nierówność liniowa', 'dzielenie przez liczbę ujemną', 'znak nierówności'], 'rozwiąż 5 - 2x ≥ 11', 'x ∈ (−∞, −3⟩', ['nierownosc-kwadratowa']],
        'rownanie-wymierne': ['rownania', 'lr', ['równanie wymierne', 'mianownik', 'dziedzina', 'ułamek z x'], 'rozwiąż (x+1)/(x-2) = 3', 'x = 7/2', ['wspolny-mianownik', 'rownanie-z-pierwiastkiem']],
        'rownosc-poteg': ['potegi-log', 'lp', ['równanie wykładnicze', 'wspólna podstawa', 'porównanie wykładników', 'potęgi'], 'rozwiąż 4^x = 2^(x+3)', 'x = 3', ['definicja-logarytmu', 'potega-ilorazu']],
        'rownanie-z-pierwiastkiem': ['rownania', 'lr', ['równanie z pierwiastkiem', 'równanie niewymierne', 'podnoszenie do kwadratu', 'fałszywe rozwiązanie'], 'rozwiąż √(x+3) = x - 3', 'x = 6', ['pierwiastek-z-kwadratu', 'delta']],
        'wspolny-mianownik': ['liczby', 'lp', ['wspólny mianownik', 'dodawanie ułamków', 'odejmowanie ułamków', 'rozszerzanie ułamka'], 'kroki 3/4 - 1/6', '7/12', ['mnozenie-ulamkow', 'dzielenie-ulamkow', 'nwd-nww']],
        'mnozenie-ulamkow': ['liczby', 'lp', ['mnożenie ułamków', 'ułamki zwykłe', 'skracanie'], 'kroki 2/3 * 9/4', '3/2', ['dzielenie-ulamkow', 'wspolny-mianownik']],
        'dzielenie-ulamkow': ['liczby', 'lp', ['dzielenie ułamków', 'odwrotność', 'ułamki zwykłe'], 'kroki 3/5 : 9/10', '2/3', ['mnozenie-ulamkow', 'wspolny-mianownik']],
        'nwd-nww': ['liczby', 'lp', ['NWD', 'NWW', 'największy wspólny dzielnik', 'najmniejsza wspólna wielokrotność', 'czynniki pierwsze'], 'nwd(12, 18)', '6', ['wspolny-mianownik', 'czynniki-pierwsze']],
        'wyrazy-podobne': ['wyrazenia', 'lp', ['wyrazy podobne', 'redukcja', 'upraszczanie', 'porządkowanie'], 'kroki 2(x+3) - (x-1)', 'x + 7', ['opuszczanie-nawiasow', 'przenoszenie']],
        'opuszczanie-nawiasow': ['wyrazenia', 'lp', ['opuszczanie nawiasów', 'mnożenie nawiasu', 'minus przed nawiasem', 'wymnażanie'], 'rozwiąż 2(x+1) - (x-3) = 8', 'x = 3', ['wyrazy-podobne', 'wylaczanie-przed-nawias', 'kwadrat-sumy']],
        przenoszenie: ['rownania', 'lp', ['przenoszenie', 'druga strona', 'zmiana znaku', 'równanie liniowe'], 'rozwiąż 4x + 1 = x + 7', 'x = 2', ['obie-strony', 'wyrazy-podobne']],
        'obie-strony': ['rownania', 'lp', ['obie strony', 'dzielenie obu stron', 'mnożenie obu stron', 'zamiana stron', 'równanie liniowe'], 'rozwiąż 7 = 3 - x', 'x = −4', ['przenoszenie', 'odwracanie-znaku', 'pierwiastkowanie-obu-stron']],
        'pierwiastkowanie-obu-stron': ['rownania', 'lp', ['pierwiastkowanie', 'plus minus', 'x kwadrat równa się', 'dwa rozwiązania'], 'rozwiąż x^2 = 9', 'x₁ = −3, x₂ = 3', ['iloczyn-rowny-zero', 'roznica-kwadratow', 'obie-strony']],
        'iloczyn-rowny-zero': ['rownania', 'lp', ['iloczyn równy zero', 'przyrównanie do zera', 'czynniki', 'postać iloczynowa'], 'rozwiąż x^2 - 3x = 0', 'x₁ = 0, x₂ = 3', ['wylaczanie-przed-nawias', 'postac-iloczynowa', 'skladanie-rozkladu']],
        sprawdzenie: ['rownania', 'lp', ['sprawdzenie', 'lewa i prawa strona', 'L P', 'fałszywe rozwiązanie'], 'rozwiąż 5 = 2x - 7', 'x = 6', ['dziedzina', 'rownanie-z-pierwiastkiem']],
        'wspolczynniki-trojmianu': ['funkcje', 'lp', ['współczynniki', 'trójmian kwadratowy', 'a b c', 'wyraz wolny'], 'rozwiąż x^2 - 2x - 1 = 0', 'x₁ = 1 − √2, x₂ = 1 + √2', ['delta', 'wzory-x12', 'wierzcholek']],
        dziedzina: ['rownania', 'lp', ['dziedzina', 'mianownik różny od zera', 'założenia', 'zastrzeżenie'], 'rozwiąż 1/x = 2', 'x = 1/2', ['rownanie-wymierne', 'rownosc-logarytmow', 'rownanie-z-pierwiastkiem', 'sprawdzenie']],
        'rownosc-logarytmow': ['potegi-log', 'lp', ['równanie logarytmiczne', 'równość logarytmów', 'argument logarytmu', 'ta sama podstawa'], 'rozwiąż log_2(x+3) = log_2(2x)', 'x = 3', ['definicja-logarytmu', 'rownosc-poteg', 'dziedzina']],
        'czynniki-pierwsze': ['liczby', 'lp', ['czynniki pierwsze', 'liczby pierwsze', 'rozkład liczby', 'dzielniki'], 'rozłóż 84', '2² · 3 · 7', ['nwd-nww']],
        'skladanie-rozkladu': ['wyrazenia', 'lr', ['rozkład wielomianu', 'czynniki', 'wielomian', 'postać iloczynowa'], 'rozłóż x^6 - 64', '(x − 2)(x + 2)(x² − 2x + 4)(x² + 2x + 4)', ['postac-iloczynowa', 'roznica-kwadratow', 'suma-szescianow', 'roznica-szescianow']],
        'granica-najwyzsza-potega': ['granice', 'lr', ['granica w nieskończoności', 'najwyższa potęga', 'wyłączanie najwyższej potęgi', 'iloraz wielomianów', 'skracanie n'], 'lim n→∞ (2n+1)/(6n+5)', '1/3', ['granice-podstawowe', 'wylaczanie-przed-nawias', 'nieoznaczone']],
        'granice-podstawowe': ['granice', 'lr', ['granice podstawowe', 'jeden przez n', 'dąży do zera', 'liczba przez nieskończoność', 'potęga rośnie bez końca'], 'lim n→∞ (n^2+3n+4)/(2n^2+5n+1)', '1/2', ['granica-najwyzsza-potega', 'nieoznaczone']],
        'granica-ciaglosc': ['granice', 'lr', ['podstawianie liczby', 'granica funkcji ciągłej', 'wstawiamy liczbę', 'granica w punkcie', 'ciągłość'], 'lim x→2 (x^2+1)/(x+1)', '5/3', ['nieoznaczone', 'skracanie-czynnika-w-granicy', 'ciaglosc-logarytmu']],
        'skracanie-czynnika-w-granicy': ['granice', 'lr', ['skracanie w granicy', 'zero przez zero', 'wspólny czynnik', 'x różne od a'], 'lim x→4 (x^2-6x+8)/(3x^2-10x-8)', '1/7', ['nieoznaczone', 'granica-ciaglosc', 'skladanie-rozkladu', 'wylaczanie-przed-nawias']],
        'granica-jednostronna': ['granice', 'lr', ['granica jednostronna', 'z prawej', 'z lewej', 'zero plus', 'jeden przez zero'], 'lim x→0+ 1/x', '+∞', ['nieoznaczone', 'granice-podstawowe']],
        'granica-sumy': ['granice', 'lr', ['granica sumy', 'granica różnicy', 'suma granic', 'rozbijanie na części'], 'lim n→∞ (sqrt(n^2+9n)-2sqrt(n^2+1)+sqrt(n^2+5n))', '7', ['sprzezenie', 'nieoznaczone', 'granice-podstawowe']],
        'ciaglosc-logarytmu': ['granice', 'lr', ['granica logarytmu', 'logarytm jest ciągły', 'logarytm z granicy'], 'lim n→∞ (log_2(8n+1)-log_2(n+6))', '3', ['granica-ciaglosc', 'definicja-logarytmu', 'granice-podstawowe']],
        'sprawdzenie-calki': ['calki', 'st', ['sprawdzenie całki', 'pochodna wyniku', 'funkcja pierwotna'], 'całka x^2', 'x³/3 + C', ['calka-potegi', 'pochodna-potegi', 'sprawdzenie']],
        'liniowosc-pochodnej': ['pochodne', 'lr', ['stała przed pochodną', 'pochodna sumy', 'liczba przy funkcji', 'różniczkowanie'], 'pochodna 5x^3', 'f′(x) = 15x²', ['pochodna-potegi', 'tablica-pochodnych', 'liniowosc-calki']],
        'liniowosc-calki': ['calki', 'st', ['stała przed całką', 'całka sumy', 'liniowość całki', 'rozbijanie całki'], 'całka 2x+1 od 1 do 3', '10', ['calka-potegi', 'tablica-calek', 'liniowosc-pochodnej']],
        'ulamki-proste': ['calki', 'st', ['ułamki proste', 'całka wymierna', 'rozkład ułamka', 'A i B'], 'całka 1/(x^2-1)', 'ln|x − 1|/2 − ln|x + 1|/2 + C', ['tablica-calek', 'dzielenie-z-reszta', 'skladanie-rozkladu']],
        'podstawienie-w-calce': ['calki', 'st', ['podstawienie', 'całka przez podstawienie', 'nowa zmienna', 'wracam do x'], 'całka (2x+1)^3', '(2x + 1)⁴/8 + C', ['pochodna-zlozona', 'liniowosc-calki', 'tablica-calek']],
        'kolejnosc-dzialan': ['liczby', 'lp', ['kolejność działań', 'nawias najpierw', 'potęga przed mnożeniem', 'mnożenie przed dodawaniem'], 'kroki 2 * (3 + 4)^2', '98', ['wspolny-mianownik', 'mnozenie-ulamkow']],
        'skracanie-ulamka': ['wyrazenia', 'lp', ['skracanie ułamka', 'skracanie wyrażenia', 'wspólny czynnik', 'dla x różnego od'], 'uprość (4x^2-1)/(2x-1)', '2x + 1 (dla x ≠ 1/2)', ['nwd-nww', 'roznica-kwadratow', 'skracanie-czynnika-w-granicy']],
        'dzielenie-z-reszta': ['calki', 'st', ['dzielenie wielomianów', 'całość i reszta', 'całka wymierna', 'stopień licznika'], 'całka x^3/(x^2-1)', 'x²/2 + ln|x + 1|/2 + ln|x − 1|/2 + C', ['ulamki-proste', 'schemat-hornera']],
        'pierwiastek-iloczynu': ['wyrazenia', 'lp', ['pierwiastek z iloczynu', 'wyłączanie spod pierwiastka', 'upraszczanie pierwiastka', 'pierwiastek z delty'], 'uprość √8', '2√2', ['delta', 'sprzezenie', 'pierwiastek-z-kwadratu']],
        'wciaganie-do-nawiasu': ['wyrazenia', 'lp', ['wciąganie liczby do nawiasu', 'ułamek w nawiasie', 'postać iloczynowa'], 'rozłóż 2x^2 - 3x + 1', '(2x − 1)(x − 1)', ['opuszczanie-nawiasow', 'postac-iloczynowa']],
        'znak-ulamka': ['wyrazenia', 'lp', ['minus w ułamku', 'zmiana znaku ułamka', 'minus przed ułamek', 'licznik i mianownik'], 'lim x→5 (x-5)/(3-sqrt(x+4))', '−6', ['skracanie-ulamka', 'sprzezenie', 'obie-strony']],
        'liczba-przy-x': ['rownania', 'lp', ['współczynnik przy x', 'ułamek przy x', 'równanie z ułamkiem'], 'rozwiąż 2x/3 = 4', 'x = 6', ['obie-strony', 'przenoszenie', 'wyrazy-podobne']],
    };
    for (const [id, [dzial, poziom, keywords, tryExpr, expect, related]] of Object.entries(HANDBOOK)) {
        if (FORMULAS[id]) Object.assign(FORMULAS[id], { dzial: dzial, poziom: poziom, keywords: keywords, try: tryExpr, expect: expect, related: related });
    }

    /** krok jest w granicy przy zmiennej dążącej do ±∞
     * @param {Step} step */
    function atInf(step) { return /→\s*[−-]?∞/.test(step.math); }

    /** prawa strona ostatniego „=” to iloczyn samych czynników liniowych: liczba, x, (x − 2), (x + 1)²
     * @param {Step} step */
    function allLinear(step) {
        const rhs = step.math.split(' = ').pop() || '';
        const groups = rhs.match(/\([^()]*\)/g) || [];
        return groups.every(g => !/[²³⁴⁵⁶⁷⁸⁹^]/.test(g)) && /^[−-]?[\d,]*x?$/.test(rhs.replace(/\([^()]*\)[²³⁴⁵⁶⁷⁸⁹]*/g, '').trim());
    }

    // Reguły kroków jako dane (spec 2026-11-24-dymki-podstawy): etykieta kroku → hasło słownika.
    // Krok, który sam ustawił `formula` (z kolorem ⟦…⟧ w miejscu użycia), ma pierwszeństwo przed tabelą.
    // Hasło musi być prawdziwe dla każdej etykiety, którą łapie wzorzec. `here` (opcjonalne) = funkcja od kroku,
    // `when` (opcjonalne) = warunek na krok, gdy sama etykieta nie wystarcza. Dymek z tabeli dostaje `fromRule: true`.
    /** @typedef {{label: string, math: string, formula?: {id: string, here?: string, fromRule?: boolean}}} Step */
    /** @type {Array<{re: RegExp, id: string, here?: (step: Step) => string, when?: (step: Step) => boolean}>} */
    const STEP_RULES = [
        { re: /^Liczę pierwiastek z delty$/, id: 'delta' },
        { re: /^Składam całość( w (liczniku|mianowniku))?$/, id: 'postac-iloczynowa', when: allLinear }, // [EN] z czynnikiem kwadratowym (x² + 1) hasło by kłamało
        { re: /^Składam całość( w (liczniku|mianowniku))?$/, id: 'skladanie-rozkladu' }, // [EN] reszta: czynnik kwadratowy zostaje
        { re: /^Wyłączam [a-z] przed nawias$/, id: 'wylaczanie-przed-nawias' },
        { re: /^(Zapisuję część jako ułamek|Mnożę ułamek przez liczbę|Liczę procent z liczby)$/, id: 'procent-z-liczby' },
        { re: /^(Najpierw nawias: )?(dodaję|odejmuję|Dodaję|Odejmuję) liczniki$/, id: 'wspolny-mianownik' },
        { re: /^Sprowadzamy do wspólnego mianownika$/, id: 'wspolny-mianownik' },
        { re: /^Rozkładam na czynniki pierwsze$/, id: 'nwd-nww' }, // [EN] tylko w NWD/NWW (rozkład liczby ma inne etykiety)
        { re: /^(Liczę q|Zapisuję postać kanoniczną)$/, id: 'wierzcholek' },
        { re: /^Rozpoznaję iloczyn$/, id: 'pochodna-iloczynu' },
        { re: /^Rozpoznaję iloraz$/, id: 'pochodna-ilorazu' },
        { re: /^Mnożę przez pochodną środka$/, id: 'pochodna-zlozona' },
        { re: /^(Całkuję przez części|Wstawiam policzoną całkę)$/, id: 'przez-czesci' },
        { re: /^Zapisujemy podstawę jako 1 \+ 1\/aₙ$/, id: 'e' },
        { re: /^Zapisuję obie strony jako potęgi /, id: 'rownosc-poteg' },
        { re: /^(Odrzucam fałszywe rozwiązanie|Sprawdzam rozwiązania)$/, id: 'rownanie-z-pierwiastkiem' }, // [EN] tylko po podniesieniu do kwadratu
        { re: /^Wartość bezwzględna jest zerem tylko dla zera$/, id: 'wartosc-bezwzgledna' },
        // układ: sposób „Podstawianie” wstawia bez „do …”, sposób „Przeciwne współczynniki” — „do pierwszego/drugiego równania”
        { re: /^(Wyznaczam [a-z] z (pierwszego|drugiego) równania|Wstawiam [a-z] = \S+)$/, id: 'uklad-podstawianie' },
        { re: /^(Mnożę (pierwsze|drugie) przez .+|Wstawiam [a-z] = \S+ do (pierwszego|drugiego) równania)$/, id: 'uklad-przeciwne' },
        // podstawy równań (zadanie 3)
        { re: /^(Redukuję|Porządkuję i redukuję) wyrazy podobne$/, id: 'wyrazy-podobne' },
        { re: /^Opuszczam nawiasy$/, id: 'opuszczanie-nawiasow' },
        { re: /^Przenoszę ([a-z] na lewo(, liczby na prawo)?|liczby na prawo|liczbę na prawo|wszystko na lewą stronę)$/, id: 'przenoszenie' },
        // [EN] tylko przez liczbę: mnożenie przez wyrażenie z x ma własne hasło (rownanie-wymierne) od silnika
        { re: /^(Dzielę|Mnożę) obie strony przez [−-]?\d[\d,/]*$/, id: 'obie-strony', here: s => 'c = ' + s.label.replace(/^.* przez /, '') },
        { re: /^(Zmieniam znak obu stron|Zamieniam strony)$/, id: 'obie-strony' },
        { re: /^Pierwiastkuję obie strony/, id: 'pierwiastkowanie-obu-stron' },
        { re: /^Przyrównuję każdy czynnik do zera$/, id: 'iloczyn-rowny-zero' },
        // [EN] sprawdzenie całki to pochodna wyniku (znak ′), nie wstawianie liczby
        { re: /^Sprawdzenie$/, id: 'sprawdzenie', when: s => !/′/.test(s.math) },
        { re: /^Odczytuję współczynniki( w (liczniku|mianowniku))?$/, id: 'wspolczynniki-trojmianu' },
        { re: /^(Wyznaczam|Sprawdzam|Zastrzegam) dziedzinę$|^Odrzucam rozwiązanie spoza dziedziny$/, id: 'dziedzina' },
        { re: /^Rozwiązuję oba przypadki$/, id: 'wartosc-bezwzgledna' }, // [EN] tylko po „Rozbijam na dwa przypadki” przy |…|
        { re: /^Porównuję argumenty logarytmów$/, id: 'rownosc-logarytmow' },
        { re: /^(Odkładam minus|Dzielę przez kolejne liczby pierwsze|Zbieram czynniki pierwsze)$/, id: 'czynniki-pierwsze' },
        // podstawy granic (zadanie 4). „Podstawiamy n → ∞” i „Wyrazy z n …” to jedno hasło (granice-podstawowe): oba kroki robią to samo,
        // wstawiają granice c/nᵏ → 0 i nᵏ → +∞; „Podstawiamy x = a” to inny fakt (ciągłość), więc osobne hasło.
        { re: /^(Wyłączamy .+ przed nawias|Skracamy .+)$/, id: 'granica-najwyzsza-potega', when: atInf }, // [EN] w ±∞; „Skracamy (x − a)” z punktu niżej
        { re: /^Skracamy \(.+\)[²³⁴⁵⁶⁷⁸⁹]?$/, id: 'skracanie-czynnika-w-granicy', when: s => !atInf(s), here: s => 'czynnik = ' + s.label.replace(/^Skracamy /, '') },
        { re: /^(Wyrazy z [a-z] w mianowniku dążą do 0|Podstawiamy [a-z] → ∞)$/, id: 'granice-podstawowe' },
        { re: /^Podstawiamy [a-z] = /, id: 'granica-ciaglosc', when: s => /^lim\(/.test(s.math), here: s => 'a = ' + s.label.replace(/^Podstawiamy [a-z] = /, '') },
        { re: /^Granica jednostronna .+[⁺⁻]$/, id: 'granica-jednostronna' },
        { re: /^(Rozbijamy na dwie różnice|Dodajemy granice)$/, id: 'granica-sumy' },
        { re: /^Logarytm jest ciągły$/, id: 'ciaglosc-logarytmu' },
        // analiza i reszta (zadanie 5)
        { re: /^Liczę pierwiastek z delty (w liczniku|w mianowniku)$/, id: 'delta' },
        { re: /^(Upraszczam pierwiastek z delty|Wyciągam kwadrat spod pierwiastka|Wyłączam liczbę spod pierwiastka)$/, id: 'pierwiastek-iloczynu' },
        { re: /^Wciągam liczbę do nawiasu( w (liczniku|mianowniku))?$/, id: 'wciaganie-do-nawiasu' },
        { re: /^(Wyłączam liczbę przed nawias( i zmieniam znaki)?|Wyłączam liczbę ujemną przed nawias)$/, id: 'wylaczanie-przed-nawias' },
        { re: /^(Wyłączam minus przed ułamek( i skracam)?|Zmieniam znak licznika i mianownika|Przenoszę minus do (mianownika|licznika))$/, id: 'znak-ulamka' },
        { re: /^Rozkładamy na czynniki$/, id: 'skladanie-rozkladu' },
        { re: /^Rozkładam mianownik$/, id: 'skladanie-rozkladu' },
        { re: /^Szukam pierwiastka wśród dzielników( w (liczniku|mianowniku))?$/, id: 'bezout' },
        { re: /^Dla [a-z] → −∞$/, id: 'pierwiastek-z-kwadratu', when: s => /√\(.²\)/.test(s.math) },
        { re: /^Dla [a-z] → −∞$/, id: 'liczba-przeciwna', when: s => /< 0, więc −. > 0/.test(s.math) },
        { re: /^(Stała zostaje przed pochodną|Mnożę przez stałą)$/, id: 'liniowosc-pochodnej' },
        { re: /^(Stałą wyłączam przed całkę|Mnożę przez wyłączoną stałą|Całka sumy to suma całek|Całkuję każdą część)$/, id: 'liniowosc-calki' },
        { re: /^Całkuję stałą$/, id: 'calka-potegi' },
        { re: /^(Zapisuję ułamki proste|Wyznaczam A i B|Rozkład na ułamki proste|Każdy ułamek daje logarytm)$/, id: 'ulamki-proste' },
        { re: /^Dzielę licznik przez mianownik$/, id: 'dzielenie-z-reszta' },
        // [EN] tylko całki: te etykiety wypisuje wyłącznie js/math-calculus.js
        { re: /^(Podstawienie: [a-z] = .+|Wracam do zmiennej [a-z])$/, id: 'podstawienie-w-calce' },
        { re: /^Sprawdzenie$/, id: 'sprawdzenie-calki', when: s => /′/.test(s.math) },
        { re: /^(Najpierw nawias: (dodaję|odejmuję|mnożę|dzielę|potęguję)|Dodaję|Odejmuję|Mnożę|Dzielę|Potęguję|Liczę prawą stronę|Upraszczam lewą stronę|Upraszczam obie strony)$/, id: 'kolejnosc-dzialan' },
        { re: /^Skracam (ułamek|\(.+\))$/, id: 'skracanie-ulamka' },
        // [EN] „Szukam miejsc zerowych” i „Odczytuję znak z paraboli” dostają hasło od silnika (zależy od liczby miejsc zerowych)
        { re: /^Brak miejsc zerowych$/, id: 'znak-trojmianu' },
        { re: /^Granice jednostronne są różne$/, id: 'granica-jednostronna' },
        { re: /^Wyłączam wspólny czynnik przed nawias$/, id: 'wylaczanie-przed-nawias' },
        { re: /^Delta ujemna: brak rozwiązań$/, id: 'delta' },
        { re: /^Zmienna się skróciła, a zostało zdanie (fałszywe|prawdziwe)$/, id: 'wyrazy-podobne' },
        { re: /^Wartość bezwzględna nie jest ujemna$/, id: 'wartosc-bezwzgledna' },
        // [EN] układ zależny: jedno równanie to drugie pomnożone przez liczbę
        { re: /^(Lewe strony są proporcjonalne|Prawe strony też — to jedno równanie)$/, id: 'obie-strony' },
        { re: /^Wymnażam nawiasy$/, id: 'opuszczanie-nawiasow' },
        { re: /^Redukujemy wyrazy podobne w liczniku$/, id: 'wyrazy-podobne' },
        { re: /^Mnożymy ułamki$/, id: 'mnozenie-ulamkow' },
        { re: /^Rozwiązuję podwójną nierówność$/, id: 'wartosc-bezwzgledna' },
        { re: /^Kwadrat nie może być ujemny$/, id: 'pierwiastkowanie-obu-stron' },
        { re: /^Porządkuję równania$/, id: 'przenoszenie' },
        { re: /^Wyliczam [a-z]$/, id: 'okresowosc' },
        { re: /^Zapisuję ułamek przy x jako liczbę razy x$/, id: 'liczba-przy-x' },
    ];
    // Kroki-stwierdzenia: bez dymku z założenia (spec, cel 2). Lista ma być krótka; każde dopisanie z uzasadnieniem.
    // „Granica” bez symbolu nieoznaczonego: krok z symbolem ma już formula „nieoznaczone” od silnika.
    // Pierwsza pozycja = stwierdzenia bez zdania „dlaczego” w js/step-why.js (zgodność pilnuje test/step-coverage.js).
    /** @type {RegExp[]} */
    const STATEMENTS = [
        /^(Wynik|Odpowiedź|Równanie|Równanie trygonometryczne|Wyrażenie|Funkcja|Całka|Układ równań|Nierówność|Działanie|Liczba|Liczby|Wynik w przybliżeniu)$/,
        /^Granica$/,
    ];
    /** ustawia `step.formula = { id }` z tabeli, gdy krok go nie ma i nie jest stwierdzeniem; mutuje i zwraca krok
     * @param {Step} step */
    function attachRule(step) {
        if (!step || step.formula || STATEMENTS.some(re => re.test(step.label))) return step;
        const rule = STEP_RULES.find(r => r.re.test(step.label) && (!r.when || r.when(step)));
        if (!rule) return step;
        step.formula = { id: rule.id, fromRule: true };
        if (rule.here) step.formula.here = rule.here(step);
        return step;
    }

    const API = { FORMULAS: FORMULAS, DZIALY: DZIALY, STEP_RULES: STEP_RULES, STATEMENTS: STATEMENTS, attachRule: attachRule };
    const g = /** @type {any} */ (typeof window !== 'undefined' ? window : globalThis);
    g.MATM0_FORMULAS = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
