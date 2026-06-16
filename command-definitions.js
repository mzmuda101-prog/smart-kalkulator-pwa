(function() {
    'use strict';

    /*
       This file documents commands for the help drawer only.
       The parser in app.js stays authoritative: if the parser supports more than
       this list, the app should still accept it. Keep this file human-editable.
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
                    { syntax: 'x=L {PIPE} co=S', command: 'x=120 {PIPE} co=20', description: 'S = stały odstęp między punktami. Liczbę punktów liczy automatycznie.' },
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
                    { syntax: '{MODE}inside / {MODE}pole', command: 'x=120/4 {PIPE} {MODE}inside', description: 'alias dla @between (punkty wewnątrz pola).' },
                    { syntax: '{MODE}krance / {MODE}krawedzie', command: 'x=120/4 {PIPE} {MODE}krance', description: 'alias dla @edges (punkty na krańcach).' },
                ],
            },
            {
                title: 'Marginesy i przesunięcie osi',
                items: [
                    { syntax: 'm=A/B', command: 'x=120/4 {PIPE} m=10/20', description: 'margines. A = od początku, B = od końca. Skraca pole robocze.' },
                    { syntax: '<-A  ,,  ->B', command: 'x=120/4 {PIPE} <-10 {PIPE} ->20', description: 'strzałkowy zapis marginesów: <-A od początku, ->B od końca.' },
                    { syntax: 'ms=A / start=A / left=A', command: 'x=120/4 {PIPE} ms=10', description: 'ms = margines tylko od początku (A jednostek).' },
                    { syntax: 'me=B / end=B / right=B', command: 'x=120/4 {PIPE} me=20', description: 'me = margines tylko od końca (B jednostek).' },
                    { syntax: 'origin=Z / zero=Z / offset=Z', command: 'x=120/4 {PIPE} origin=50', description: 'Z = wartość punktu zerowego osi. Przydatne gdy mierzysz od środka.' },
                ],
            },
            {
                title: 'Parametry punktów i wyniku',
                items: [
                    { syntax: 'r=P / fi=P / dia=P / ø=P', command: 'x=120/4 {PIPE} fi=8', description: 'P = promień rysowanego kółka punktu (w jednostkach osi).' },
                    { syntax: 'u=mm / u=cm / u=m', command: 'x=120/4 {PIPE} u=mm', description: 'u = jednostka pokazywana w wynikach: mm, cm lub m.' },
                    { syntax: 'label=T / opis=T / nazwa=T', command: 'x=120/4 {PIPE} label=otwory', description: 'T = nazwa serii na legendzie i w wynikach.' },
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
                    { syntax: ',, (lub |)', description: 'łączy parametry jednej figury/komendy: komenda ,, opcja ,, opcja.' },
                    { syntax: ';;', command: 'f(x)=sin(x) {SERIES} f(x)=cos(x)', description: 'rysuje wiele serii jednocześnie, każda innym kolorem.' },
                    { syntax: '/ (w wielokącie)', command: 'wielokat=0,0/100,0/50,80', description: 'rozdziela kolejne wierzchołki wielokąta nieforemnego (każdy jako x,y).' },
                ],
            },
            {
                title: 'Funkcje matematyczne',
                items: [
                    { syntax: 'f(x)=wyrażenie', command: 'f(x)=x^2', description: 'rysuje wykres funkcji zmiennej x.' },
                    { syntax: 'sin(x) / cos(x) / tan(x)', command: 'f(x)=sin(x)', description: 'trygonometria — argument x w radianach.' },
                    { syntax: 'sqrt(x)', command: 'f(x)=sqrt(x)', description: 'sqrt = pierwiastek kwadratowy z x.' },
                    { syntax: 'abs(x)', command: 'f(x)=abs(x)', description: 'abs = wartość bezwzględna (moduł) z x.' },
                    { syntax: 'log(x) / ln(x)', command: 'f(x)=log(x)', description: 'log = logarytm dziesiętny, ln = logarytm naturalny.' },
                    { syntax: 'floor(x) / ceil(x) / round(x)', command: 'f(x)=floor(x)', description: 'floor = w dół, ceil = w górę, round = do najbliższej całości.' },
                    { syntax: 'exp(x)', command: 'f(x)=exp(x)', description: 'exp(x) = e podniesione do potęgi x.' },
                    { syntax: 'x^n', command: 'f(x)=x^3', description: '^ = potęgowanie. n = wykładnik (np. x^3 to x do sześcianu).' },
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
                    { syntax: 'punkt=x,y', command: 'punkt=150,200 {PIPE} label=A {PIPE} r=8', description: 'x = współrzędna pozioma, y = pionowa. r = promień kółka, label = podpis.' },
                    { syntax: 'rect=WxH / prostokat=WxH', command: 'rect=400x300', description: 'W = szerokość, H = wysokość prostokąta (lewy dolny róg w 0,0).' },
                    { syntax: 'okrag=R / kolo=R / circle=R', command: 'okrag=100', description: 'R = promień okręgu. Środek w (0,0), osie zrównane → koło jest okrągłe.' },
                    { syntax: 'wielokat=N,R / poly=N,R', command: 'wielokat=6,100', description: 'foremny. N = liczba boków, R = promień okręgu opisanego.' },
                    { syntax: 'wielokat=x,y/x,y/x,y', command: 'wielokat=0,0/100,0/50,80', description: 'nieforemny. Lista wierzchołków (x,y) rozdzielona /. Pokazuje długości boków, obwód, pole i kąty.' },
                    { syntax: 'siatka=WxH {PIPE} co=dx x dy', command: 'siatka=400x300 {PIPE} co=100x100', description: 'siatka punktów w polu W×H. dx = odstęp poziomy, dy = pionowy.' },
                    { syntax: 'ox=A {PIPE} oy=B', command: 'rect=200x100 {PIPE} ox=50 {PIPE} oy=50', description: 'ox = przesunięcie figury w poziomie, oy = w pionie (od punktu 0,0).' },
                    { syntax: 'r=P {PIPE} label=T', command: 'punkt=0,0 {PIPE} r=10 {PIPE} label=środek', description: 'r = promień kółka punktu, label/opis/nazwa = T = podpis figury.' },
                ],
            },
            {
                title: 'Trójkąty (Pitagoras, kąty)',
                items: [
                    { syntax: 'trojkat=x,y/x,y/x,y', command: 'trojkat=0,0/4,0/0,3', description: 'trójkąt z 3 wierzchołków. Liczy boki, kąty, pole, obwód, wykrywa prostokątny.' },
                    { syntax: 'pitagoras=a,b', command: 'pitagoras=3,4', description: 'a, b = przyprostokątne. Liczy przeciwprostokątną c=√(a²+b²) i rysuje trójkąt prostokątny.' },
                ],
            },
            {
                title: 'Pole widzenia 2D (kamera / czujnik / reflektor)',
                items: [
                    { syntax: 'kamera=x,y {PIPE} kąt=K {PIPE} zasięg=Z', command: 'kamera=0,0 {PIPE} kąt=110 {PIPE} zasięg=15', description: 'rysuje pole widzenia na płasko. x,y = miejsce montażu, K = kąt poziomy (°), Z = zasięg. Aliasy figury: widok=, fov=. Kąt poziomy też: kątXY=, kąt_poziomy=, hfov=.' },
                    { syntax: 'cel=x,y  (lub cel=x,y,z)', command: 'kamera=0,0 {PIPE} kąt=110 {PIPE} zasięg=15 {PIPE} cel=10,8', description: 'kierunek przez wycelowanie w PUNKT (np. brama) — nie musisz liczyć stopni. Rysuje też znacznik celu. Trzecia liczba = wysokość celu (z), np. okno: cel=10,8,2.' },
                    { syntax: 'azymut=A', command: 'kamera=0,0 {PIPE} kąt=90 {PIPE} azymut=135', description: 'kierunek jak na kompasie: 0°=góra (płn.), 90°=prawo, zgodnie z zegarem.' },
                    { syntax: 'kierunek=A', command: 'kamera=0,0 {PIPE} kąt=90 {PIPE} kierunek=45', description: 'kierunek matematyczny: 0°=w prawo (+X), rośnie przeciwnie do zegara.' },
                    { syntax: 'na=D', command: 'kamera=0,0 {PIPE} kąt=110 {PIPE} zasięg=15 {PIPE} na=5', description: 'D = odległość od kamery — rysuje poprzeczną linię granic i podpisuje szerokość pola w tym miejscu.' },
                ],
            },
            {
                title: 'Kamera na wysokości — oś Z (rzut na ziemię)',
                items: [
                    { syntax: 'z=H  (lub kamera=x,y,H)', command: 'kamera=0,0,4 {PIPE} kątXY=105 {PIPE} kątZ=55 {PIPE} zasięg=30 {PIPE} cel=-1.5,10', description: 'H = wysokość montażu nad ziemią. Zamiast płaskiego stożka rysuje REALNY rzut kamery na ziemię (keystone): prosty bliski brzeg, niewypełniona martwa strefa pod kamerą, a daleki brzeg łukiem gdy ucina go zasięg. Aliasy: z=, wys=.' },
                    { syntax: 'kątXY=K  (kąt poziomy)', command: 'kamera=0,0,4 {PIPE} kątXY=105 {PIPE} kątZ=55 {PIPE} cel=-1.5,10 {PIPE} zasięg=30', description: 'kąt widzenia w poziomie (płaszczyzna XY). Aliasy: kąt=, kąt_poziomy=, hfov=.' },
                    { syntax: 'kątZ=V  (kąt pionowy)', command: 'kamera=0,0,4 {PIPE} kątXY=105 {PIPE} kątZ=55 {PIPE} cel=-1.5,10 {PIPE} zasięg=30', description: 'kąt widzenia w pionie (oś Z). Bez niego nie policzymy martwej strefy ani pokrycia na ziemi. Aliasy: kąt_pionowy=, vfov=.' },
                    { syntax: 'pochył=P  (tilt)', command: 'kamera=0,0,4 {PIPE} kątXY=90 {PIPE} kątZ=40 {PIPE} pochył=30 {PIPE} zasięg=25', description: 'pochylenie osi w dół (0=poziomo, 90=prosto w dół). Jeśli pominiesz, a podasz z= i cel= — policzę je sam z geometrii. Aliasy: pochył=, tilt=.' },
                ],
            },
            {
                title: 'Przykłady',
                items: [
                    { syntax: 'trojkat=0,0/4,0/0,3', command: 'trojkat=0,0/4,0/0,3', description: 'trójkąt prostokątny 3-4-5 (kąt prosty przy A).' },
                    { syntax: 'wielokat=0,0/120,0/120,80/40,120', command: 'wielokat=0,0/120,0/120,80/40,120 {PIPE} label=działka', description: 'czworokąt nieforemny — z długościami boków, polem i kątami.' },
                    { syntax: 'okrag=100 {SERIES} wielokat=6,100', command: 'okrag=100 {SERIES} wielokat=6,100', description: 'okrąg i wpisany w niego sześciokąt foremny.' },
                    { syntax: 'kamera=0,0 {PIPE} kąt=110 {PIPE} zasięg=15 {PIPE} cel=12,4 {SERIES} kamera=20,0 {PIPE} kąt=90 {PIPE} zasięg=12 {PIPE} cel=12,4', command: 'kamera=0,0 {PIPE} kąt=110 {PIPE} zasięg=15 {PIPE} cel=12,4 {SERIES} kamera=20,0 {PIPE} kąt=90 {PIPE} zasięg=12 {PIPE} cel=12,4', description: 'dwie kamery celujące w ten sam punkt — widać pokrycie i martwe pola.' },
                    { syntax: 'kamera=0,0,4 {PIPE} kątXY=105 {PIPE} kątZ=55 {PIPE} zasięg=30 {PIPE} cel=-1.5,10', command: 'kamera=0,0,4 {PIPE} kątXY=105 {PIPE} kątZ=55 {PIPE} zasięg=30 {PIPE} cel=-1.5,10', description: 'kamera na budynku (4 m) celująca w punkt na ziemi — rzut na ziemię, martwa strefa i znacznik celu.' },
                ],
            },
        ],
    };
})();
