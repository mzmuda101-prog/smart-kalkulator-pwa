/* ============================================================
   [EN] Matm0 Calc — czyste tablice danych (no-DOM, no-logic).
   Wydzielone z app.js dla porządku ("clean look"). Ładowane PRZED app.js;
   app.js czyta je przez window.MATM0_DATA (wzorzec jak MATM0_COMMAND_DEFINITIONS).
   Brak zależności od reszty aplikacji — bezpieczne do testów w izolacji.
   ============================================================ */
(function () {
    'use strict';

    // Jednostki konwersji: kategoria → { base, units: { nazwa → współczynnik do base } }.
    var UNIT_CATEGORIES = {
        length: { base: 'mm', units: {
            mm: 1, cm: 10, dm: 100, m: 1000, km: 1000000,
            'in': 25.4, inch: 25.4, inches: 25.4, cal: 25.4, cale: 25.4,
            ft: 304.8, feet: 304.8, foot: 304.8, stopa: 304.8, stopy: 304.8,
            yd: 914.4, yard: 914.4, yards: 914.4, jard: 914.4, jardy: 914.4,
            mila: 1609344, mile: 1609344, mil: 1609344,
        } },
        mass: { base: 'g', units: {
            mg: 0.001, g: 1, dag: 10, dkg: 10, deko: 10, kg: 1000,
            t: 1000000, tona: 1000000, tony: 1000000, ton: 1000000,
            lb: 453.59237, lbs: 453.59237, funt: 453.59237, funty: 453.59237, funtow: 453.59237,
            oz: 28.349523, uncja: 28.349523, uncje: 28.349523,
        } },
        time: { base: 's', units: {
            ms: 0.001, s: 1, sek: 1, sekunda: 1, sekundy: 1,
            min: 60, minuta: 60, minuty: 60,
            h: 3600, godz: 3600, godzina: 3600, godziny: 3600,
            doba: 86400, dzien: 86400, dni: 86400,
            tydzien: 604800, tyg: 604800, week: 604800,
            rok: 31557600, lata: 31557600, lat: 31557600, year: 31557600,
        } },
        volume: { base: 'ml', units: {
            ml: 1, cl: 10, dl: 100, l: 1000, litr: 1000, litry: 1000, litrow: 1000,
            hl: 100000, m3: 1000000,
            gal: 3785.411784, galon: 3785.411784, gallon: 3785.411784,
        } },
        data: { base: 'B', units: {
            // KB/MB/… traktowane binarnie (1024). Bity pominięte celowo —
            // flaga „i" w regexie nie odróżnia b od B.
            B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776, PB: 1125899906842624,
        } },
        area: { base: 'm2', units: {
            mm2: 0.000001, cm2: 0.0001, dm2: 0.01, m2: 1, ar: 100, ha: 10000, km2: 1000000,
        } },
        angle: { base: 'deg', units: {
            deg: 1, '°': 1, stopnie: 1, stopni: 1,
            rad: 180 / Math.PI, radian: 180 / Math.PI, radiany: 180 / Math.PI,
            grad: 0.9, gon: 0.9,
        } },
    };

    // Polskie nazwy miesięcy (mianownik + dopełniacz, z/bez diakrytyków) → numer.
    var PL_MONTHS = {
        stycznia:1, styczen:1, 'styczeń':1, lutego:2, luty:2, marca:3, marzec:3,
        kwietnia:4, kwiecien:4, 'kwiecień':4, maja:5, maj:5, czerwca:6, czerwiec:6,
        lipca:7, lipiec:7, sierpnia:8, sierpien:8, 'sierpień':8,
        wrzesnia:9, 'września':9, wrzesien:9, 'wrzesień':9,
        pazdziernika:10, 'października':10, pazdziernik:10, 'październik':10,
        listopada:11, listopad:11, grudnia:12, grudzien:12, 'grudzień':12,
    };

    // Dni tygodnia wg Date.getDay() (0 = niedziela).
    var PL_WEEKDAYS = ['niedziela','poniedziałek','wtorek','środa','czwartek','piątek','sobota'];

    // Aliasy walut (token wpisany przez usera → kod ISO).
    var CUR_ALIAS = {
        'zł': 'PLN', 'zl': 'PLN', 'pln': 'PLN', 'złoty': 'PLN', 'złotych': 'PLN', 'zloty': 'PLN', 'zlotych': 'PLN',
        '€': 'EUR', 'euro': 'EUR', 'eur': 'EUR',
        '$': 'USD', 'usd': 'USD', 'dolar': 'USD', 'dolary': 'USD', 'dolarow': 'USD', 'dolarów': 'USD',
        '£': 'GBP', 'gbp': 'GBP',
        'chf': 'CHF', 'frank': 'CHF', 'franki': 'CHF',
    };

    var DATA = {
        UNIT_CATEGORIES: UNIT_CATEGORIES,
        PL_MONTHS: PL_MONTHS,
        PL_WEEKDAYS: PL_WEEKDAYS,
        CUR_ALIAS: CUR_ALIAS,
    };

    if (typeof window !== 'undefined') window.MATM0_DATA = DATA;
    if (typeof module !== 'undefined' && module.exports) module.exports = DATA; // testy w Node
})();
