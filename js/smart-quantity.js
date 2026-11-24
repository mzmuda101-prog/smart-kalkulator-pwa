// @ts-check
/* ============================================================
   [PL] smart-quantity — FUNDAMENT „typowanej wielkości" (KROK 3, etap 1).
   [EN] Typed-quantity core for the smart calculator's unified engine.

   CEL: jeden kanoniczny typ wartości (Quantity) + ALGEBRA OPERATORÓW PO TYPACH.
   Dziś reguły typu „12:30 + 300s", „5 km + 300 m", „537 + 12%" są rozsiane po
   regexach w app.js. Tu zbieramy je w JEDNYM miejscu, jako czyste reguły na typach
   — żeby wynik wynikał „z definicji typów", a nie z kolejnego regexa.

   STATUS: moduł SAMODZIELNY i CZYSTY (bez STATE, bez DOM, bez sieci). Zależy tylko
   od MATM0_DATA.UNIT_CATEGORIES (tablice współczynników). NIE jest jeszcze wpięty w
   live (evalCalcExpression) — to fundament pod ewolucyjne wpinanie etapami, zero
   regresji teraz. Testy: test/quantity.js.

   MODEL (Quantity):
     { kind, value, dim, unit }
     - kind: 'number' | 'percent' | 'physical' | 'duration' | 'money' | 'clock'
             | 'date' | 'invalid'
     - value: magnituda w JEDNOSTKACH KANONICZNYCH:
         number  → liczba; percent → liczba procentu (12 dla „12%");
         physical→ wartość w BAZIE wymiaru (np. mm dla length); duration→ sekundy;
         money   → kwota w swojej walucie; clock → minuty doby (0..1439);
         date    → znacznik czasu ms (Date.getTime()).
     - dim:  dla physical = 'length'|'mass'|'volume'|'data'|'area'|'angle'|'speed';
             dla duration = 'time'; inaczej null.
     - unit: preferowana jednostka WYŚWIETLANIA / kod waluty (lub null).

   Nieprawidłowe złożenia → Quantity {kind:'invalid', reason}. Konwersja walut między
   różnymi walutami wymaga kursów (poza tym czystym modułem) → reason:'needs-rate'.
   ============================================================ */
(function () {
    'use strict';

    var DATA = (typeof window !== 'undefined' && window.MATM0_DATA) || {};
    var UNIT_CATEGORIES = DATA.UNIT_CATEGORIES || {};

    // ── Odwrotny indeks jednostek: token jednostki → { dim, factor } (do bazy wymiaru).
    //    Budowany raz; „najdłuższe-najpierw" nieistotne (lookup po dokładnym kluczu).
    var UNIT_INDEX = (function () {
        var idx = {};
        Object.keys(UNIT_CATEGORIES).forEach(function (dim) {
            var cat = UNIT_CATEGORIES[dim];
            Object.keys(cat.units || {}).forEach(function (u) {
                // Pierwsze wystąpienie wygrywa (kolizji nazw między wymiarami brak w danych).
                if (!(u in idx)) idx[u] = { dim: dim, factor: cat.units[u] };
            });
        });
        return idx;
    })();

    function unitInfo(unit) { return unit == null ? null : (UNIT_INDEX[String(unit)] || null); }
    function baseUnitOf(dim) { return (UNIT_CATEGORIES[dim] || {}).base || null; }

    // ── Fabryki ────────────────────────────────────────────────────────────────
    function invalid(reason) { return { kind: 'invalid', value: null, dim: null, unit: null, reason: reason || 'incompatible' }; }
    function num(v) { return { kind: 'number', value: v, dim: null, unit: null }; }
    function percent(p) { return { kind: 'percent', value: p, dim: null, unit: null }; }
    function money(v, currency) { return { kind: 'money', value: v, dim: null, unit: currency || null }; }
    function clock(mins) { return { kind: 'clock', value: ((Math.round(mins) % 1440) + 1440) % 1440, dim: null, unit: null }; }
    function date(ms) { return { kind: 'date', value: (ms instanceof Date ? ms.getTime() : ms), dim: null, unit: null }; }

    // duration: zawsze w SEKUNDACH (baza 'time'); unit = preferowana jednostka wyświetlania.
    function duration(seconds, unit) { return { kind: 'duration', value: seconds, dim: 'time', unit: unit || null }; }

    // physical: podajesz wartość + jednostkę; przeliczamy do BAZY wymiaru i zapamiętujemy
    // jednostkę jako preferencję wyświetlania. Nieznana jednostka → invalid.
    function physical(value, unit) {
        var info = unitInfo(unit);
        if (!info) return invalid('unknown-unit');
        // czas to też UNIT_CATEGORIES, ale semantycznie traktujemy go jak duration.
        if (info.dim === 'time') return duration(value * info.factor, unit);
        return { kind: 'physical', value: value * info.factor, dim: info.dim, unit: unit };
    }

    // Wartość kanoniczną tego samego wymiaru/kindu z nową magnitudą (zachowuje dim/unit).
    function rebase(q, newValue) {
        if (q.kind === 'physical') return { kind: 'physical', value: newValue, dim: q.dim, unit: q.unit };
        if (q.kind === 'duration') return duration(newValue, q.unit);
        if (q.kind === 'money') return money(newValue, q.unit);
        if (q.kind === 'percent') return percent(newValue);
        if (q.kind === 'number') return num(newValue);
        return invalid('cannot-rebase');
    }

    function isInvalid(q) { return !q || q.kind === 'invalid'; }
    function isQuantity(q) { return !!q && typeof q === 'object' && typeof q.kind === 'string'; }

    // ── Konwersja / wyświetlanie ────────────────────────────────────────────────
    // toDisplay: kanoniczna baza → { value, unit } w preferowanej (lub zadanej) jednostce.
    function toDisplay(q, targetUnit) {
        if (isInvalid(q)) return null;
        if (q.kind === 'physical' || q.kind === 'duration') {
            var unit = targetUnit || q.unit;
            var info = unitInfo(unit);
            if (!info) return { value: q.value, unit: baseUnitOf(q.dim) }; // brak jednostki → baza
            return { value: q.value / info.factor, unit: unit };
        }
        if (q.kind === 'money') return { value: q.value, unit: q.unit };
        if (q.kind === 'percent') return { value: q.value, unit: '%' };
        return { value: q.value, unit: q.unit };
    }

    // ── AUTODOBÓR czytelnej jednostki (opcja „Czytelnie" w ustawieniach) ─────────
    // Dla każdego wymiaru: drabinka „ładnych" jednostek (kanoniczne metryczne, bez aliasów).
    // Reguła „awansuj póki czytelnie": wspinamy się po drabince TAK DŁUGO, jak każda
    // kolejna jednostka daje wartość |·| ≥ 1 ORAZ nadal czytelną (≤ 2 miejsca po przecinku).
    // Pierwszy „brzydki" szczebel (≥ 3 cyfry po przecinku, np. 1008 m → 1,008 km) ZATRZYMUJE
    // awans i zostajemy na poprzednim, czytelnym szczeblu (1008 m). Dzięki temu:
    //   5 300 000 mm → 5,3 km, 1500 mm → 1,5 m, 500 mm → 50 cm,  ale  1 008 000 mm → 1008 m
    //   (a nie mylące „1,008 km", które wygląda jak 1008 km). Brak drabinki / value 0 → pierwszy.
    var NICE_UNITS = {
        length: ['mm', 'cm', 'm', 'km'],
        mass: ['mg', 'g', 'kg', 't'],
        volume: ['ml', 'l', 'm3'],
        area: ['mm2', 'cm2', 'm2', 'ar', 'ha', 'km2'],
        time: ['s', 'min', 'h', 'doba', 'tydzien', 'rok'],
        data: ['B', 'KB', 'MB', 'GB', 'TB'],
        speed: ['m/s', 'km/h'],
        angle: ['deg']
    };
    // „Czytelna" wartość = bez nadmiaru cyfr po przecinku (≤ 2). Awans na większą jednostkę,
    // który robi z liczby coś z 3+ miejscami (1008 m → 1,008 km), uznajemy za nieczytelny.
    function isCleanDisplay(v) {
        var r = Math.round(v * 100) / 100;
        return Math.abs(v - r) <= Math.abs(v) * 1e-9 + 1e-12;
    }
    function chooseUnit(dim, baseValue) {
        var ladder = NICE_UNITS[dim];
        if (!ladder || !ladder.length) return null;
        var abs = Math.abs(baseValue);
        if (!(abs > 0)) return ladder[0];
        var best = ladder[0], bestDisp = abs / ((unitInfo(best) || { factor: 1 }).factor);
        for (var i = 0; i < ladder.length; i++) {
            var info = unitInfo(ladder[i]);
            if (!info) continue;
            var disp = abs / info.factor;
            if (disp < 1) break;                 // drabinka rośnie → poniżej 1 nie awansujemy
            // awans psułby czytelność → zostań niżej (12345 m, 1008 g); ALE nie na olbrzymiej
            // albo już i tak „brzydkiej” liczbie: 1 lb = 453,59 g, nie 453 592,37 mg;
            // 10 km / 3 = 3333,33 m, nie 3 333 333,33 mm; 100 lb = 45,36 kg, nie 45 359,237 g
            var stuck = bestDisp >= 100000 || (bestDisp >= 10000 && !isCleanDisplay(bestDisp));
            if (i > 0 && !isCleanDisplay(disp) && !stuck) break;
            best = ladder[i]; bestDisp = disp;
        }
        return best;
    }
    // toDisplay z autodoborem jednostki (dla physical/duration). Reszta jak toDisplay.
    function autoDisplay(q) {
        if (isInvalid(q)) return null;
        if (q.kind === 'physical' || q.kind === 'duration') {
            var dim = q.kind === 'duration' ? 'time' : q.dim;
            var u = chooseUnit(dim, q.value);
            return u ? toDisplay(q, u) : toDisplay(q);
        }
        return toDisplay(q);
    }

    // convert („A na B"): physical/duration → ta sama oś (inny wymiar = invalid);
    // money między walutami = needs-rate (kursy poza tym modułem).
    function convert(q, targetUnit) {
        if (isInvalid(q)) return q;
        if (q.kind === 'physical' || q.kind === 'duration') {
            var info = unitInfo(targetUnit);
            if (!info) return invalid('unknown-unit');
            var myDim = q.kind === 'duration' ? 'time' : q.dim;
            if (info.dim !== myDim) return invalid('dim-mismatch');
            // wartość zostaje kanoniczna (baza); zmieniamy tylko preferowaną jednostkę.
            if (q.kind === 'duration') return duration(q.value, targetUnit);
            return { kind: 'physical', value: q.value, dim: q.dim, unit: targetUnit };
        }
        if (q.kind === 'money') return invalid('needs-rate');
        return invalid('incompatible');
    }

    // ── Skalowanie magnitudy (mnożnik bezwymiarowy) ─────────────────────────────
    function scale(q, factor) {
        switch (q.kind) {
            case 'number': return num(q.value * factor);
            case 'percent': return percent(q.value * factor);
            case 'physical': return { kind: 'physical', value: q.value * factor, dim: q.dim, unit: q.unit };
            case 'duration': return duration(q.value * factor, q.unit);
            case 'money': return money(q.value * factor, q.unit);
            // clock/date to PUNKTY w czasie — skalowanie nie ma sensu.
            default: return invalid('cannot-scale');
        }
    }

    // ── Dodawanie / odejmowanie (sign: +1 | -1) ─────────────────────────────────
    // Reguła procentu (kluczowa): „A ± p%" = A ± A·(p/100) — procent OD lewej strony
    // (akumulatora). Dlatego „100 + 10% + 10%" = 121. Procent po prawej modyfikuje lewą.
    function addSub(a, b, sign) {
        if (isInvalid(a)) return a;
        if (isInvalid(b)) return b;

        // X ± p%  → skaluj X o (1 ± p/100), zachowując typ X
        if (b.kind === 'percent' && a.kind !== 'percent') {
            return rebase(a, a.value + sign * a.value * (b.value / 100));
        }
        if (a.kind === 'percent' && b.kind === 'percent') return percent(a.value + sign * b.value);
        // p% ± X (X nie-procent) — niejednoznaczne; nie zgadujemy.
        if (a.kind === 'percent') return invalid('percent-left');

        // number ± number
        if (a.kind === 'number' && b.kind === 'number') return num(a.value + sign * b.value);

        // physical ± physical (ten sam wymiar)
        if (a.kind === 'physical' && b.kind === 'physical') {
            if (a.dim !== b.dim) return invalid('dim-mismatch');
            return { kind: 'physical', value: a.value + sign * b.value, dim: a.dim, unit: a.unit };
        }
        // duration ± duration
        if (a.kind === 'duration' && b.kind === 'duration') return duration(a.value + sign * b.value, a.unit);

        // money ± money (ta sama waluta; różne → kursy)
        if (a.kind === 'money' && b.kind === 'money') {
            if (a.unit !== b.unit) return invalid('needs-rate');
            return money(a.value + sign * b.value, a.unit);
        }

        // clock + duration → clock ; clock − duration → clock (zawijanie doby w fabryce clock)
        if (a.kind === 'clock' && b.kind === 'duration') return clock(a.value + sign * (b.value / 60));
        // duration + clock → clock (tylko dodawanie ma sens)
        if (a.kind === 'duration' && b.kind === 'clock' && sign > 0) return clock(b.value + a.value / 60);
        // clock − clock → duration (różnica, zawinięta nieujemnie w obrębie doby)
        if (a.kind === 'clock' && b.kind === 'clock' && sign < 0) {
            var d = a.value - b.value; if (d < 0) d += 1440;
            return duration(d * 60);
        }

        // date + duration → date ; date − duration → date (duration w sekundach → ms)
        if (a.kind === 'date' && b.kind === 'duration') return date(a.value + sign * b.value * 1000);
        // date ± number → number dni
        if (a.kind === 'date' && b.kind === 'number') return date(a.value + sign * b.value * 86400000);
        // date − date → duration (różnica w sekundach; dni = /86400)
        if (a.kind === 'date' && b.kind === 'date' && sign < 0) return duration((a.value - b.value) / 1000);

        return invalid('incompatible');
    }

    function add(a, b) { return addSub(a, b, 1); }
    function sub(a, b) { return addSub(a, b, -1); }

    // ── Mnożenie / dzielenie ────────────────────────────────────────────────────
    // Jedna strona skalarna → skalowanie. Procent działa jak skalar-ułamek.
    // Ten sam wymiar ÷ ten sam wymiar → liczba (stosunek). Wymiar × wymiar (jednostki
    // złożone) NIE wspierane (jeszcze) → invalid. Punkty czasu (clock/date) → invalid.
    function mul(a, b) {
        if (isInvalid(a)) return a;
        if (isInvalid(b)) return b;
        if (b.kind === 'percent') return scale(a, b.value / 100);   // X · p%  = X·(p/100)
        if (a.kind === 'percent') return scale(b, a.value / 100);   // p% · X  = X·(p/100)
        if (a.kind === 'number') return scale(b, a.value);
        if (b.kind === 'number') return scale(a, b.value);
        return invalid('no-compound-units');
    }

    function div(a, b) {
        if (isInvalid(a)) return a;
        if (isInvalid(b)) return b;
        if (b.kind === 'percent') return scale(a, 100 / b.value);   // X / p% = X / (p/100)
        if (a.kind === 'percent' && b.kind === 'number') return percent(a.value / b.value);
        if (b.kind === 'number') return scale(a, 1 / b.value);      // X / liczba
        // ten sam wymiar ÷ ten sam wymiar → bezwymiarowy stosunek (liczba)
        if (a.kind === 'physical' && b.kind === 'physical' && a.dim === b.dim) return num(a.value / b.value);
        if (a.kind === 'duration' && b.kind === 'duration') return num(a.value / b.value);
        if (a.kind === 'money' && b.kind === 'money' && a.unit === b.unit) return num(a.value / b.value);
        if (a.kind === 'number' && b.kind !== 'number') return invalid('reciprocal-dim'); // 1/długość itp.
        return invalid('incompatible');
    }

    // „od A do B" → różnica jako duration (clock/date) lub physical/number (reszta) = sub(b,a).
    function range(a, b) { return sub(b, a); }

    var API = {
        // fabryki
        num: num, percent: percent, physical: physical, duration: duration,
        money: money, clock: clock, date: date, invalid: invalid,
        // operatory
        add: add, sub: sub, mul: mul, div: div, scale: scale, convert: convert, range: range,
        // pomocnicze
        toDisplay: toDisplay, autoDisplay: autoDisplay, chooseUnit: chooseUnit,
        unitInfo: unitInfo, baseUnitOf: baseUnitOf,
        isInvalid: isInvalid, isQuantity: isQuantity,
        _UNIT_INDEX: UNIT_INDEX, _NICE_UNITS: NICE_UNITS
    };

    if (typeof window !== 'undefined') window.MATM0_QTY = API;
    if (typeof self !== 'undefined') self.MATM0_QTY = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API; // testy w Node
})();
