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
        engineering: [
            {
                title: 'Legenda symboli',
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
                    { syntax: ';;', command: 'x={L}/{N} {SERIES} x={L2}/{N2} {PIPE} y={D}', description: 'rozdziela serie — każda rysowana osobno, innym kolorem.' },
                ],
            },
            {
                title: 'Podstawowa składnia',
                items: [
                    { syntax: 'x=L/N', command: 'x={L}/{N}', description: 'oś X. L = długość pola, N = liczba punktów.' },
                    { syntax: 'y=L/N', command: 'y={Ly}/{Ny}', description: 'oś Y. L = długość, N = liczba punktów (pionowo).' },
                    { syntax: 'L/N', command: '{L}/{N}', description: 'skrót bez nazwy osi — zakłada oś X.' },
                    { syntax: 'x=L {PIPE} co=S', command: 'x={L} {PIPE} co={S}', description: 'S = stały odstęp między punktami. Liczbę punktów liczy automatycznie. (EN: step=S)' },
                    { syntax: 'x=L {PIPE} co=S1;S2', command: 'x={L} {PIPE} co={S1};{S2}', description: 'naprzemienne odstępy: S1, S2, S1, S2… Po średniku dowolnie wiele wartości (cykl się powtarza).' },
                    { syntax: 'od A do B co S', command: 'od {A0} do {Af} co {S}', description: 'naturalny zapis: A = start, B = koniec, S = odstęp.' },
                ],
            },
            {
                title: 'Tryby rozmieszczenia (@)',
                items: [
                    { syntax: '{MODE}between', command: 'x={L}/{N} {PIPE} {MODE}between', description: 'punkty równomiernie wewnątrz — nie dotykają krańców (domyślny).' },
                    { syntax: '{MODE}edges', command: 'x={L}/{N} {PIPE} {MODE}edges', description: 'pierwszy i ostatni punkt lądują na samych krańcach pola.' },
                    { syntax: '{MODE}centered', command: 'x={L}/{N} {PIPE} {MODE}centered', description: 'cała seria wyśrodkowana względem zera.' },
                ],
            },
            {
                title: 'Marginesy i przesunięcie osi',
                items: [
                    { syntax: 'm=A/B', command: 'x={L}/{N} {PIPE} m={A}/{B}', description: 'margines. A = od początku, B = od końca. Skraca pole robocze.' },
                    { syntax: '<-A  ,,  ->B', command: 'x={L}/{N} {PIPE} <-{A} {PIPE} ->{B}', description: 'strzałkowy zapis marginesów: <-A od początku, ->B od końca.' },
                    { syntax: 'ms=A  ,,  me=B', command: 'x={L}/{N} {PIPE} ms={A} {PIPE} me={B}', description: 'margines jednostronny: ms = tylko od początku, me = tylko od końca.' },
                    { syntax: 'origin=Z', command: 'x={L}/{N} {PIPE} origin={O}', description: 'Z = wartość punktu zerowego osi. Przydatne gdy mierzysz od środka. (EN: offset=Z)' },
                ],
            },
            {
                title: 'Parametry punktów i wyniku',
                items: [
                    { syntax: 'r=P', command: 'x={L}/{N} {PIPE} r={P}', description: 'P = promień rysowanego kółka punktu (w jednostkach osi).' },
                    { syntax: 'u=mm / u=cm / u=m', command: 'x={L}/{N} {PIPE} u=mm', description: 'u = jednostka pokazywana w wynikach: mm, cm lub m.' },
                    { syntax: 'opis=T', command: 'x={L}/{N} {PIPE} opis={T}', description: 'T = nazwa serii na legendzie i w wynikach. (EN: label=T)' },
                    { syntax: 'x=D / y=D', command: 'y={Ly}/{Ny} {PIPE} x={D}', description: 'D = przesunięcie całej serii na drugiej osi (tu seria Y przesunięta na X=D).' },
                ],
            },
            {
                title: 'Przykłady (konkretne liczby)',
                items: [
                    { syntax: 'x=L/N {PIPE} m=A/A {PIPE} @edges {PIPE} u=mm', command: 'x=120/4 {PIPE} m=10/10 {PIPE} {MODE}edges {PIPE} u=mm', description: 'N pkt na krańcach z równymi marginesami, wynik w mm (L=120, N=4, A=10).' },
                    { syntax: 'x=L/N {SERIES} x=L/N {PIPE} y=D', command: 'x=120/4 {SERIES} x=120/6 {PIPE} y=30', description: 'dwie niezależne serie na tym samym obrazku.' },
                ],
            },
        ],
        graph: [
            {
                title: 'Legenda symboli',
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
                    { syntax: '; (średnik)', command: 'punkt={Xp},{Yp};{Yc}', description: 'rozdziela składowe wartości: x;y;z. Dzięki temu przecinek jest wolny na UŁAMKI — np. x,y znaczy x.y (działa też kropka).' },
                    { syntax: ',, (lub |)', description: 'łączy parametry jednej figury/komendy: komenda ,, opcja ,, opcja.' },
                    { syntax: ';;', command: 'f(x)=sin(x) {SERIES} f(x)=cos(x)', description: 'rysuje wiele serii jednocześnie, każda innym kolorem.' },
                    { syntax: '/ (w wielokącie)', command: 'wielokat=0;0/{W};0/{W};{H}', description: 'rozdziela kolejne wierzchołki wielokąta nieforemnego (każdy jako x;y).' },
                ],
            },
            {
                title: 'Funkcje matematyczne',
                items: [
                    { syntax: 'f(x)=wyrażenie', command: 'f(x)=x^2', description: 'rysuje wykres funkcji zmiennej x. ^ = potęgowanie (x^3 = x³).' },
                    { syntax: 'sin cos tan sqrt abs log ln exp', command: 'f(x)=sqrt(abs(x))', description: 'sin/cos/tan w radianach, sqrt = pierwiastek, abs = moduł, log = log dziesiętny, ln = naturalny, exp(x) = eˣ.' },
                    { syntax: 'asin acos atan sinh cosh tanh cot csc', command: 'f(x)=asin(x)', description: 'asin/acos/atan = odwrotna trygonometria, sinh/cosh/tanh = hiperboliczne, cot/csc = cotangens/cosecans.' },
                    { syntax: 'floor ceil round', command: 'f(x)=floor(x)', description: 'floor = w dół, ceil = w górę, round = do najbliższej całości.' },
                ],
            },
            {
                title: 'Stałe matematyczne',
                items: [
                    { syntax: 'pi / π', command: 'f(x)=sin(pi*x)', description: 'pi = liczba π ≈ 3.14159 (stosunek obwodu do średnicy).' },
                    { syntax: 'e', command: 'f(x)=e^x', description: 'e = liczba Eulera ≈ 2.71828 (podstawa logarytmu naturalnego).' },
                ],
            },
            {
                title: 'Geometria 2D — co oznacza każdy symbol',
                items: [
                    { syntax: 'punkt=x;y', command: 'punkt={Xp};{Yp} {PIPE} opis=A {PIPE} r={P}', description: 'x = współrzędna pozioma, y = pionowa (rozdziel ;). r = promień kółka, opis = podpis.' },
                    { syntax: 'rect=WxH / prostokat=WxH', command: 'prostokat={W}x{H}', description: 'W = szerokość, H = wysokość prostokąta (lewy dolny róg w 0;0).' },
                    { syntax: 'okrąg=R / circle=R', command: 'okrąg={R}', description: 'R = promień okręgu. Środek w (0;0), osie zrównane → koło jest okrągłe.' },
                    { syntax: 'wielokat=N;R / poly=N;R', command: 'wielokat={Ns};{R}', description: 'foremny. N = liczba boków, R = promień okręgu opisanego.' },
                    { syntax: 'wielokat=x;y/x;y/x;y', command: 'wielokat=0;0/{W};0/{W};{H}', description: 'nieforemny. Lista wierzchołków (x;y) rozdzielona /. Pokazuje długości boków, obwód, pole i kąty.' },
                    { syntax: 'siatka=WxH {PIPE} co=dx x dy', command: 'siatka={W}x{H} {PIPE} co={dx}x{dy}', description: 'siatka punktów w polu W×H. dx = odstęp poziomy, dy = pionowy.' },
                    { syntax: 'ox=A {PIPE} oy=B', command: 'rect={W}x{H} {PIPE} ox={Ox} {PIPE} oy={Oy}', description: 'ox = przesunięcie figury w poziomie, oy = w pionie (od punktu 0;0).' },
                ],
            },
            {
                title: 'Trójkąty (Pitagoras, kąty)',
                items: [
                    { syntax: 'trojkat=x;y/x;y/x;y', command: 'trojkat=0;0/{b};0/0;{a}', description: 'trójkąt z 3 wierzchołków. Liczy boki, kąty, pole, obwód, wykrywa prostokątny.' },
                    { syntax: 'pitagoras=a;b', command: 'pitagoras={a};{b}', description: 'a; b = przyprostokątne. Liczy przeciwprostokątną c=√(a²+b²) i rysuje trójkąt prostokątny.' },
                ],
            },
            {
                title: 'Pole widzenia 2D (kamera / czujnik / reflektor)',
                items: [
                    { syntax: 'kamera=x;y {PIPE} kąt=K {PIPE} zasięg=Z', command: 'kamera={Xp};{Yp} {PIPE} kąt={K} {PIPE} zasięg={Zr}', description: 'rysuje pole widzenia na płasko. x;y = miejsce montażu, K = kąt poziomy (°), Z = zasięg.' },
                    { syntax: 'kamera=x;y;H;K;Z (skrót)', command: 'kamera=0;0;{Hz};{Kd};{Zr} {PIPE} cel={Xc};{Yc}', description: 'SKRÓT pozycyjny: jednym ciągiem podajesz montaż x;y, wysokość H, kąt poziomy K i zasięg Z. Jawne parametry (kąt=, zasięg=, z=) i tak nadpisują pozycyjne.' },
                    { syntax: 'kąt=K  (lub kąt=K;V)', command: 'kamera=0;0;{Hz} {PIPE} kąt={K};{V} {PIPE} zasięg={Zr} {PIPE} cel={Xd};{Yd}', description: 'K = kąt poziomy (°). V (po ;) = kąt PIONOWY — skrót zamiast osobnego kątZ=. Czyli kąt=K;V ≡ kąt poziomy K ,, kąt pionowy V.' },
                    { syntax: 'cel=x;y  (lub cel=x;y;H)', command: 'kamera={Xp};{Yp} {PIPE} kąt={K} {PIPE} zasięg={Zr} {PIPE} cel={Xc};{Yc}', description: 'kierunek przez wycelowanie w PUNKT — nie musisz liczyć stopni. Rysuje też znacznik celu. Trzecia liczba = wysokość celu (H), np. okno: cel=x;y;H.' },
                    { syntax: 'azymut=A  (lub azymut=A;V)', command: 'kamera=0;0;{Hz} {PIPE} kąt={Kd};{V} {PIPE} azymut={Az};-30 {PIPE} zasięg={Zr}', description: 'kierunek jak na kompasie: 0°=góra (płn.), 90°=prawo, zgodnie z zegarem. V (po ;) = pion: dodatnia patrzy w górę, ujemna w dół.' },
                    { syntax: 'kierunek=A  (lub kierunek=A;V)', command: 'kamera=0;0;{Hz} {PIPE} kąt={Kd};{V} {PIPE} kierunek={Kd};-30 {PIPE} zasięg={Zr}', description: 'kierunek matematyczny: 0°=w prawo (+X), rośnie przeciwnie do zegara. V (po ;) = pion: dodatnia w górę, ujemna w dół.' },
                    { syntax: 'krawędźL=x;y  /  krawędźP=x;y  (= edgeL / edgeR)', command: 'kamera={Xp};{Yp} {PIPE} kąt={Kd} {PIPE} krawędźP={Xc};0', description: 'celuj przez KRANIEC widoku: podajesz, gdzie ma trafić jeden brzeg pola (L = lewy, P = prawy), a oś i ułożenie stożka dolicza parser. Zasięg = odległość do punktu, o ile nie podasz zasięg=. Alias angielski: edgeL / edgeR.' },
                    { syntax: 'krawędźL/P z wysokością → wyliczony cel=', command: 'kamera=0;0;6 {PIPE} kąt=70;45 {PIPE} krawędźL=8;7', description: 'gdy dodasz wysokość H i pionowy FOV (kąt=K;V), punkt traktowany jest jak realny BLISKI narożnik pokrycia na ziemi: parser rozwiązuje azymut i pochył, a z nich liczy CEL osi.' },
                    { syntax: 'ogniskowa=F  {PIPE} matryca=W[;H]', command: 'kamera=0;0;{Hz} {PIPE} ogniskowa={F} {PIPE} matryca={Mw};{Mh} {PIPE} zasięg={Zr} {PIPE} cel=20;0', description: 'kąt z OPTYKI zamiast ze stopni: FOV = 2·atan(wymiar/(2·ogniskowa)). matryca=W;H w mm. Bez matryca= zakładamy pełną klatkę 36×24 mm. Jawny kąt= ma pierwszeństwo.' },
                    { syntax: 'na=D  (lub na=D1;D2;D3)', command: 'kamera={Xp};{Yp} {PIPE} kąt={K} {PIPE} zasięg={Zr} {PIPE} na={D1};{D2};{D3}', description: 'D = odległość od kamery — rysuje poprzeczną linię granic i podpisuje szerokość pola. Po ; podaj wiele odległości, by oznaczyć kilka stref naraz.' },
                ],
            },
            {
                title: 'Kamera na wysokości — oś Z (rzut na ziemię)',
                items: [
                    { syntax: 'z=H  (lub kamera=x;y;H)', command: 'kamera=0;0;{Hz} {PIPE} kąt={K};{V} {PIPE} zasięg={Zr} {PIPE} cel={Xd};{Yd}', description: 'H = wysokość montażu nad ziemią. Zamiast płaskiego stożka rysuje REALNY rzut kamery na ziemię (keystone): prosty bliski brzeg, niewypełniona martwa strefa pod kamerą, a daleki brzeg łukiem gdy ucina go zasięg.' },
                    { syntax: 'kątZ=V  (kąt pionowy)', command: 'kamera=0;0;{Hz} {PIPE} kąt={K} {PIPE} kątZ={V} {PIPE} cel={Xd};{Yd} {PIPE} zasięg={Zr}', description: 'kąt widzenia w pionie (oś Z). Bez niego nie policzymy martwej strefy ani pokrycia na ziemi. Skrót obu naraz: kąt=K;V.' },
                    { syntax: 'pochył=P  (tilt)', command: 'kamera=0;0;{Hz} {PIPE} kąt={Kd};40 {PIPE} pochył={Tlt} {PIPE} zasięg=25', description: 'pochylenie osi w dół (0=poziomo, 90=prosto w dół) — liczba dodatnia patrzy W DÓŁ (przeciwnie niż V w azymut/kierunek, gdzie dodatnia = w górę). Jeśli pominiesz, a podasz z= i cel= — policzę je sam z geometrii.' },
                ],
            },
            {
                title: 'Przykłady (konkretne liczby)',
                items: [
                    { syntax: 'trojkat=0;0/4;0/0;3', command: 'trojkat=0;0/4;0/0;3', description: 'trójkąt prostokątny 3-4-5 (kąt prosty przy A) — klasyczny pitagoras.' },
                    { syntax: 'wielokat=0;0/120;0/120;80/40;120', command: 'wielokat=0;0/120;0/120;80/40;120 {PIPE} opis=działka', description: 'czworokąt nieforemny — z długościami boków, polem i kątami.' },
                    { syntax: 'okrąg=R {SERIES} wielokat=N;R', command: 'okrąg=100 {SERIES} wielokat=6;100', description: 'okrąg i wpisany w niego sześciokąt foremny (R=100, N=6).' },
                    { syntax: 'kamera=x;y {PIPE} kąt=K {PIPE} zasięg=Z {PIPE} cel=x;y', command: 'kamera=0;0 {PIPE} kąt=110 {PIPE} zasięg=15 {PIPE} cel=12;4 {SERIES} kamera=20;0 {PIPE} kąt=90 {PIPE} zasięg=12 {PIPE} cel=12;4', description: 'dwie kamery celujące w ten sam punkt — widać pokrycie i martwe pola.' },
                    { syntax: 'kamera=x;y;H {PIPE} kąt=K;V {PIPE} zasięg=Z {PIPE} cel=x;y', command: 'kamera=0;0;4 {PIPE} kąt=105;55 {PIPE} zasięg=30 {PIPE} cel=-1,5;10', description: 'kamera na budynku (H=4 m) celująca w punkt na ziemi — rzut, martwa strefa i znacznik celu. Uwaga: przecinek = ułamek dziesiętny.' },
                    { syntax: 'kamera=x;y {PIPE} kąt=K {PIPE} krawędźP=x;y', command: 'kamera=0;0 {PIPE} kąt=80 {PIPE} krawędźP=12;3', description: 'celowanie krańcem: prawy brzeg pola ma trafić w (12;3) — parser sam ustawia oś i zasięg.' },
                ],
            },
            {
                title: 'Moje Stałe w komendach',
                items: [
                    { syntax: 'nazwa_stałej', command: 'belka', description: 'Nazwa stałej (z zakładki Moje Stałe) podstawia wartość dosłownie jako fragment komendy. Np. belka = x=L/N ,, @edges → wpisz belka, rozwinie się w pełną komendę.' },
                    { syntax: 'f(x)=nazwa_wzoru', command: 'f(x)=wzor', description: 'Stała-funkcja (np. wzor = 50-(20x+5)) → f(x)=wzor rysuje wzór (x = zmienna wykresu). W kalkulatorze ta sama stała wywołuje się (wzor(3) = liczba); w komendzie podstawia wzór do rysowania.' },
                ],
            },
        ],
    };
})();
