(function() {
    'use strict';

    /*
       This file documents commands for the help drawer only.
       The parser in app.js stays authoritative: it still accepts many more aliases
       than are listed here (np. widok=/fov= dla kamery, kolo= dla okręgu, kątXY=,
       hfov=, wys=, tilt= …). Ściąga celowo pokazuje JEDNĄ kanoniczną nazwę po polsku
       i jedną po angielsku na każdy koncept — reszta synonimów działa, ale nie zaśmieca
       ściągi. Keep this file human-editable.
    */
    window.MATM0_COMMAND_DEFINITIONS = {
        engineering: [
            {
                title: 'Jak budować komendy — separatory',
                items: [
                    { syntax: ',, (lub |)', description: 'łączy parametry w jednej serii: długość ,, tryb ,, opcja.' },
                    { syntax: ';;', command: 'x=120/4 {SERIES} x=120/6 {PIPE} y=30', description: 'rozdziela serie — każda rysowana osobno, innym kolorem.' },
                ],
            },
            {
                title: 'Podstawowa składnia',
                items: [
                    { syntax: 'x=L/N', command: 'x=120/4', description: 'oś X. L = długość pola, N = liczba punktów. Np. 120/4 → długość 120, 4 punkty.' },
                    { syntax: 'y=L/N', command: 'y=200/5', description: 'oś Y. L = długość, N = liczba punktów (pionowo).' },
                    { syntax: 'L/N', command: '120/4', description: 'skrót bez nazwy osi — zakłada oś X.' },
                    { syntax: 'x=L {PIPE} co=S', command: 'x=120 {PIPE} co=20', description: 'S = stały odstęp między punktami. Liczbę punktów liczy automatycznie. (EN: step=S)' },
                    { syntax: 'x=L {PIPE} co=S1;S2', command: 'x=120 {PIPE} co=20;30', description: 'naprzemienne odstępy: 20, 30, 20, 30… Po średniku dowolnie wiele wartości (cykl się powtarza).' },
                    { syntax: 'od A do B co S', command: 'od 0 do 120 co 20', description: 'naturalny zapis: A = start, B = koniec, S = odstęp.' },
                ],
            },
            {
                title: 'Tryby rozmieszczenia (@)',
                items: [
                    { syntax: '{MODE}between', command: 'x=120/4 {PIPE} {MODE}between', description: 'punkty równomiernie wewnątrz — nie dotykają krańców (domyślny).' },
                    { syntax: '{MODE}edges', command: 'x=120/4 {PIPE} {MODE}edges', description: 'pierwszy i ostatni punkt lądują na samych krańcach pola.' },
                    { syntax: '{MODE}centered', command: 'x=120/4 {PIPE} {MODE}centered', description: 'cała seria wyśrodkowana względem zera.' },
                ],
            },
            {
                title: 'Marginesy i przesunięcie osi',
                items: [
                    { syntax: 'm=A/B', command: 'x=120/4 {PIPE} m=10/20', description: 'margines. A = od początku, B = od końca. Skraca pole robocze.' },
                    { syntax: '<-A  ,,  ->B', command: 'x=120/4 {PIPE} <-10 {PIPE} ->20', description: 'strzałkowy zapis marginesów: <-A od początku, ->B od końca.' },
                    { syntax: 'ms=A  ,,  me=B', command: 'x=120/4 {PIPE} ms=10 {PIPE} me=20', description: 'margines jednostronny: ms = tylko od początku, me = tylko od końca.' },
                    { syntax: 'origin=Z', command: 'x=120/4 {PIPE} origin=50', description: 'Z = wartość punktu zerowego osi. Przydatne gdy mierzysz od środka. (EN: offset=Z)' },
                ],
            },
            {
                title: 'Parametry punktów i wyniku',
                items: [
                    { syntax: 'r=P', command: 'x=120/4 {PIPE} r=8', description: 'P = promień rysowanego kółka punktu (w jednostkach osi).' },
                    { syntax: 'u=mm / u=cm / u=m', command: 'x=120/4 {PIPE} u=mm', description: 'u = jednostka pokazywana w wynikach: mm, cm lub m.' },
                    { syntax: 'opis=T', command: 'x=120/4 {PIPE} opis=otwory', description: 'T = nazwa serii na legendzie i w wynikach. (EN: label=T)' },
                    { syntax: 'x=D / y=D', command: 'y=120/4 {PIPE} x=30', description: 'D = przesunięcie całej serii na drugiej osi (tu seria Y przesunięta na X=30).' },
                ],
            },
            {
                title: 'Przykłady',
                items: [
                    { syntax: 'x=120/4 {PIPE} m=10/10 {PIPE} {MODE}edges {PIPE} u=mm', command: 'x=120/4 {PIPE} m=10/10 {PIPE} {MODE}edges {PIPE} u=mm', description: '4 pkt na krańcach z równymi marginesami, wynik w mm.' },
                    { syntax: 'x=120/4 {SERIES} x=120/6 {PIPE} y=30', command: 'x=120/4 {SERIES} x=120/6 {PIPE} y=30', description: 'dwie niezależne serie na tym samym obrazku.' },
                ],
            },
        ],
        graph: [
            {
                title: 'Jak budować komendy — separatory',
                items: [
                    { syntax: 'Zapis w podpowiedziach: [ ] = opcjonalne, | = albo', description: 'W ściądze i w live-podpowiedzi nad polem: kwadratowe nawiasy [ ] oznaczają część OPCJONALNĄ (możesz pominąć), a kreska | oznacza ALBO (jedna z opcji). Np. azymut=A[;V] → V możesz dodać lub nie; cel=x;y | azymut=A → użyj celu ALBO azymutu.' },
                    { syntax: '; (średnik)', command: 'punkt=10,5;8', description: 'rozdziela składowe wartości: x;y;z. Dzięki temu przecinek jest wolny na UŁAMKI — np. 10,5 znaczy 10.5 (działa też 10.5). Przykład: punkt=10,5;8 → x=10.5, y=8.' },
                    { syntax: ',, (lub |)', description: 'łączy parametry jednej figury/komendy: komenda ,, opcja ,, opcja.' },
                    { syntax: ';;', command: 'f(x)=sin(x) {SERIES} f(x)=cos(x)', description: 'rysuje wiele serii jednocześnie, każda innym kolorem.' },
                    { syntax: '/ (w wielokącie)', command: 'wielokat=0;0/100;0/50;80', description: 'rozdziela kolejne wierzchołki wielokąta nieforemnego (każdy jako x;y).' },
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
                    { syntax: 'punkt=x;y', command: 'punkt=150;200 {PIPE} opis=A {PIPE} r=8', description: 'x = współrzędna pozioma, y = pionowa (rozdziel ;). r = promień kółka, opis = podpis.' },
                    { syntax: 'rect=WxH / prostokat=WxH', command: 'prostokat=400x300', description: 'W = szerokość, H = wysokość prostokąta (lewy dolny róg w 0;0).' },
                    { syntax: 'okrąg=R / circle=R', command: 'okrąg=100', description: 'R = promień okręgu. Środek w (0;0), osie zrównane → koło jest okrągłe.' },
                    { syntax: 'wielokat=N;R / poly=N;R', command: 'wielokat=6;100', description: 'foremny. N = liczba boków, R = promień okręgu opisanego.' },
                    { syntax: 'wielokat=x;y/x;y/x;y', command: 'wielokat=0;0/100;0/50;80', description: 'nieforemny. Lista wierzchołków (x;y) rozdzielona /. Pokazuje długości boków, obwód, pole i kąty.' },
                    { syntax: 'siatka=WxH {PIPE} co=dx x dy', command: 'siatka=400x300 {PIPE} co=100x100', description: 'siatka punktów w polu W×H. dx = odstęp poziomy, dy = pionowy.' },
                    { syntax: 'ox=A {PIPE} oy=B', command: 'rect=200x100 {PIPE} ox=50 {PIPE} oy=50', description: 'ox = przesunięcie figury w poziomie, oy = w pionie (od punktu 0;0).' },
                ],
            },
            {
                title: 'Trójkąty (Pitagoras, kąty)',
                items: [
                    { syntax: 'trojkat=x;y/x;y/x;y', command: 'trojkat=0;0/4;0/0;3', description: 'trójkąt z 3 wierzchołków. Liczy boki, kąty, pole, obwód, wykrywa prostokątny.' },
                    { syntax: 'pitagoras=a;b', command: 'pitagoras=3;4', description: 'a; b = przyprostokątne. Liczy przeciwprostokątną c=√(a²+b²) i rysuje trójkąt prostokątny.' },
                ],
            },
            {
                title: 'Pole widzenia 2D (kamera / czujnik / reflektor)',
                items: [
                    { syntax: 'kamera=x;y {PIPE} kąt=K {PIPE} zasięg=Z', command: 'kamera=0;0 {PIPE} kąt=110 {PIPE} zasięg=15', description: 'rysuje pole widzenia na płasko. x;y = miejsce montażu, K = kąt poziomy (°), Z = zasięg.' },
                    { syntax: 'kamera=x;y;z;kąt;zasięg (skrót)', command: 'kamera=0;0;4;90;30 {PIPE} cel=10;8', description: 'SKRÓT pozycyjny: jednym ciągiem podajesz montaż x;y, wysokość z, kąt poziomy i zasięg. Jawne parametry (kąt=, zasięg=, z=) i tak nadpisują pozycyjne.' },
                    { syntax: 'kąt=H  (lub kąt=H;V)', command: 'kamera=0;0;4 {PIPE} kąt=105;55 {PIPE} zasięg=30 {PIPE} cel=-1,5;10', description: 'H = kąt poziomy (°). Druga liczba V (po ;) = kąt PIONOWY — skrót zamiast osobnego kątZ=. Czyli kąt=105;55 ≡ kąt poziomy 105 ,, kąt pionowy 55.' },
                    { syntax: 'cel=x;y  (lub cel=x;y;z)', command: 'kamera=0;0 {PIPE} kąt=110 {PIPE} zasięg=15 {PIPE} cel=10;8', description: 'kierunek przez wycelowanie w PUNKT (np. brama) — nie musisz liczyć stopni. Rysuje też znacznik celu. Trzecia liczba = wysokość celu (z), np. okno: cel=10;8;2.' },
                    { syntax: 'azymut=A  (lub azymut=A;V)', command: 'kamera=0;0;4 {PIPE} kąt=90;55 {PIPE} azymut=135;-30 {PIPE} zasięg=30', description: 'kierunek jak na kompasie: 0°=góra (płn.), 90°=prawo, zgodnie z zegarem. Druga liczba V (po ;) = pion: dodatnia patrzy w górę, ujemna w dół (np. azymut=135;-20 = 20° w dół). Realnie: gdy oś idzie w górę, pokrycie ziemi maleje, a powyżej horyzontu znika.' },
                    { syntax: 'kierunek=A  (lub kierunek=A;V)', command: 'kamera=0;0;4 {PIPE} kąt=90;55 {PIPE} kierunek=90;-30 {PIPE} zasięg=30', description: 'kierunek matematyczny: 0°=w prawo (+X), rośnie przeciwnie do zegara. Druga liczba V (po ;) = pion: dodatnia w górę, ujemna w dół (np. kierunek=45;15 = 15° w górę).' },
                    { syntax: 'krawędźL=x;y  /  krawędźP=x;y  (= edgeL / edgeR)', command: 'kamera=0;0 {PIPE} kąt=90 {PIPE} krawędźP=10;0', description: 'celuj przez KRANIEC widoku: podajesz, gdzie ma trafić jeden brzeg pola (L = lewy, P = prawy), a oś i ułożenie stożka dolicza parser. Zasięg = odległość do tego punktu, o ile nie podasz zasięg=. Idealne, gdy znasz realną granicę kadru (róg ogrodzenia, brama), nie stopnie. Alias angielski: edgeL / edgeR.' },
                    { syntax: 'krawędźL/P z wysokością → wyliczony cel=', command: 'kamera=0;0;6 {PIPE} kąt=70;45 {PIPE} krawędźL=8;7', description: 'gdy dodasz wysokość z= i pionowy FOV (kąt=H;V), punkt traktowany jest jak realny BLISKI narożnik pokrycia na ziemi: parser rozwiązuje azymut i pochył, a z nich liczy CEL osi (kropka „cel (x, y)" pokazywana na rysunku — nie wpisuje się do pola komendy).' },
                    { syntax: 'ogniskowa=mm  {PIPE} matryca=W[;H]', command: 'kamera=0;0;4 {PIPE} ogniskowa=50 {PIPE} matryca=36;24 {PIPE} zasięg=30 {PIPE} cel=20;0', description: 'kąt z OPTYKI zamiast ze stopni: FOV = 2·atan(wymiar/(2·ogniskowa)). matryca=W;H w mm (poziomy z W, pionowy z H). Bez matryca= zakładamy pełną klatkę 36×24 mm. Jawny kąt= ma pierwszeństwo.' },
                    { syntax: 'na=D  (lub na=D1;D2;D3)', command: 'kamera=0;0 {PIPE} kąt=110 {PIPE} zasięg=15 {PIPE} na=5;10;15', description: 'D = odległość od kamery — rysuje poprzeczną linię granic i podpisuje szerokość pola. Po ; podaj wiele odległości (na=5;10;15), by oznaczyć kilka stref naraz.' },
                ],
            },
            {
                title: 'Kamera na wysokości — oś Z (rzut na ziemię)',
                items: [
                    { syntax: 'z=H  (lub kamera=x;y;H)', command: 'kamera=0;0;4 {PIPE} kąt=105;55 {PIPE} zasięg=30 {PIPE} cel=-1,5;10', description: 'H = wysokość montażu nad ziemią. Zamiast płaskiego stożka rysuje REALNY rzut kamery na ziemię (keystone): prosty bliski brzeg, niewypełniona martwa strefa pod kamerą, a daleki brzeg łukiem gdy ucina go zasięg.' },
                    { syntax: 'kątZ=V  (kąt pionowy)', command: 'kamera=0;0;4 {PIPE} kąt=105 {PIPE} kątZ=55 {PIPE} cel=-1,5;10 {PIPE} zasięg=30', description: 'kąt widzenia w pionie (oś Z). Bez niego nie policzymy martwej strefy ani pokrycia na ziemi. Skrót obu naraz: kąt=105;55.' },
                    { syntax: 'pochył=P  (tilt)', command: 'kamera=0;0;4 {PIPE} kąt=90;40 {PIPE} pochył=30 {PIPE} zasięg=25', description: 'pochylenie osi w dół (0=poziomo, 90=prosto w dół) — tu liczba dodatnia patrzy W DÓŁ (przeciwnie niż V w azymut/kierunek, gdzie dodatnia = w górę). Jeśli pominiesz, a podasz z= i cel= — policzę je sam z geometrii.' },
                ],
            },
            {
                title: 'Przykłady',
                items: [
                    { syntax: 'trojkat=0;0/4;0/0;3', command: 'trojkat=0;0/4;0/0;3', description: 'trójkąt prostokątny 3-4-5 (kąt prosty przy A).' },
                    { syntax: 'wielokat=0;0/120;0/120;80/40;120', command: 'wielokat=0;0/120;0/120;80/40;120 {PIPE} opis=działka', description: 'czworokąt nieforemny — z długościami boków, polem i kątami.' },
                    { syntax: 'okrąg=100 {SERIES} wielokat=6;100', command: 'okrąg=100 {SERIES} wielokat=6;100', description: 'okrąg i wpisany w niego sześciokąt foremny.' },
                    { syntax: 'kamera=0;0 {PIPE} kąt=110 {PIPE} zasięg=15 {PIPE} cel=12;4 {SERIES} kamera=20;0 {PIPE} kąt=90 {PIPE} zasięg=12 {PIPE} cel=12;4', command: 'kamera=0;0 {PIPE} kąt=110 {PIPE} zasięg=15 {PIPE} cel=12;4 {SERIES} kamera=20;0 {PIPE} kąt=90 {PIPE} zasięg=12 {PIPE} cel=12;4', description: 'dwie kamery celujące w ten sam punkt — widać pokrycie i martwe pola.' },
                    { syntax: 'kamera=0;0;4 {PIPE} kąt=105;55 {PIPE} zasięg=30 {PIPE} cel=-1,5;10', command: 'kamera=0;0;4 {PIPE} kąt=105;55 {PIPE} zasięg=30 {PIPE} cel=-1,5;10', description: 'kamera na budynku (4 m) celująca w punkt na ziemi — rzut na ziemię, martwa strefa i znacznik celu. Uwaga: -1,5 = -1.5 (przecinek dziesiętny).' },
                    { syntax: 'kamera=0;0 {PIPE} kąt=80 {PIPE} krawędźP=12;3', command: 'kamera=0;0 {PIPE} kąt=80 {PIPE} krawędźP=12;3', description: 'celowanie krańcem: prawy brzeg pola ma trafić w (12;3) — parser sam ustawia oś i zasięg (= odległość do punktu).' },
                ],
            },
        ],
    };
})();
