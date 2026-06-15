    (function() {
        'use strict';

        /* ============================================================
            [EN] Syntax Tokens
            ============================================================ */
        var SYNTAX = { PIPE: ',,', SERIES: ';;', MODE: '@' };
        function expandTokens(s) {
            return s.replace(/\{PIPE\}/g, SYNTAX.PIPE).replace(/\{SERIES\}/g, SYNTAX.SERIES).replace(/\{MODE\}/g, SYNTAX.MODE);
        }

        /* ============================================================
           [EN] App State
           ============================================================ */
        const STATE = {
            activeTab: 'calculator',
            // Calculator
            calc: {
                lastResult: null,
                lastUnit: null,
                ans: null, // ostatni ZATWIERDZONY wynik (=) — dla słowa „ans"/„wynik"
            },
            // Kursy walut (NBP, opcjonalnie online — działa offline z cache)
            fx: { rates: null, ts: null, date: null, loading: false, error: null },
            // Komenda tab (merged Engineering + Graph)
            eng: { unit: 'cm', axis: 'X', mode: 'between' }, // used by drawEngineeringCanvas
            graph: {
                command: '',
                xMin: -10,
                xMax: 10,
                yMin: -10,
                yMax: 10,
            },
            // Constants
            constants: [],
            // History
            history: [],
            recentCommands: {
                graph: [], // unified (was: engineering + graph)
            },
        };

        /* ============================================================
           [EN] DOM References
           ============================================================ */
        const $ = (sel) => document.querySelector(sel);
        const $$ = (sel) => document.querySelectorAll(sel);

        // Tabs
        const tabBtns = $$('.tab-btn');
        const panels = {
            calculator: $('#panel-calculator'),
            komenda:    $('#panel-komenda'),
            warsztat:   $('#panel-warsztat'),
            constants:  $('#panel-constants'),
        };

        // Calculator
        const calcExpr = $('#calcExpr');
        const calcResult = $('#calcResult');
        const calcGrid = $('#calcGrid');
        const historyList = $('#historyList');
        const clearHistoryBtn = $('#clearHistory');
        const openHistoryBtn = $('#openHistory');
        const closeHistoryBtn = $('#closeHistory');
        const historyBackdrop = $('#historyBackdrop');
        const historyDrawer = $('#historyDrawer');
        const historyCount = $('#historyCount');
        const cacheRefreshBtn = $('#cacheRefreshBtn');
        const installAppBtn = $('#installAppBtn');
        const orientationBtn = $('#orientationBtn');

        // Kreator (form fields in Komenda tab)
        const engLength = $('#engLength');
        const engOrigin = $('#engOrigin');
        const engCount = $('#engCount');
        const engSpacing = $('#engSpacing');
        const engMarginStart = $('#engMarginStart');
        const engMarginEnd = $('#engMarginEnd');
        const unitToggle = $('#unitToggle');
        const axisToggle = $('#axisToggle');
        const spacingModeToggle = $('#spacingModeToggle');
        const fixedSpacingGroup = $('#fixedSpacingGroup');

        // Help drawer
        const commandHelpOpen = null; // removed — help opens via graphCommandHelpOpen
        const commandHelpClose = $('#commandHelpClose');
        const commandHelpBackdrop = $('#commandHelpBackdrop');
        const commandHelpDrawer = $('#commandHelpDrawer');
        const helpSearch = $('#helpSearch');
        let activeCommandTarget = 'graph';

        // Komenda canvas & UI
        const graphCommand = $('#graphCommand');
        const graphCommandError = $('#graphCommandError');
        const graphRecentCommands = $('#graphRecentCommands');
        const graphCmdModeBadge = $('#graphCmdModeBadge');
        const graphXMin = $('#graphXMin');
        const graphXMax = $('#graphXMax');
        const graphYMin = $('#graphYMin');
        const graphYMax = $('#graphYMax');
        const graphXStep = $('#graphXStep');
        const graphYStep = $('#graphYStep');
        const graphDrawBtn = $('#graphDrawBtn');
        const graphCanvas = $('#graphCanvas');
        const graphCtx = graphCanvas.getContext('2d');
        const graphResult = $('#graphResult');
        const komendaViewCard = $('#komendaViewCard');

        // Constants
        const constName = $('#constName');
        const constValue = $('#constValue');
        const constUnit = $('#constUnit');
        const constList = $('#constList');
        const addConstBtn = $('#addConstBtn');

        // Toast
        const toast = $('#toast');

        /* ============================================================
           [EN] Persistence — LocalStorage
           ============================================================ */
        const STORAGE_KEYS = {
            history: 'matm0_calc_history',
            constants: 'matm0_calc_constants',
            recentCommands: 'matm0_recent_commands',
            fxRates: 'matm0_fx_rates',
        };

        function loadFromStorage() {
            try {
                const h = localStorage.getItem(STORAGE_KEYS.history);
                if (h) STATE.history = JSON.parse(h);
                const c = localStorage.getItem(STORAGE_KEYS.constants);
                if (c) STATE.constants = JSON.parse(c);
                const r = localStorage.getItem(STORAGE_KEYS.recentCommands);
                if (r) STATE.recentCommands = JSON.parse(r);
                // Migrate old engineering+graph split into unified graph list
                if (!STATE.recentCommands) STATE.recentCommands = {};
                if (!Array.isArray(STATE.recentCommands.graph)) {
                    var old = [].concat(STATE.recentCommands.engineering || [], STATE.recentCommands.graph || []);
                    STATE.recentCommands.graph = old.slice(0, 6);
                }
                const fx = localStorage.getItem(STORAGE_KEYS.fxRates);
                if (fx) {
                    const fxObj = JSON.parse(fx);
                    if (fxObj && fxObj.rates) { STATE.fx.rates = fxObj.rates; STATE.fx.ts = fxObj.ts; STATE.fx.date = fxObj.date; }
                }
            } catch (e) {
                STATE.history = [];
                STATE.constants = [];
                STATE.recentCommands = { graph: [] };
            }
        }

        function saveHistory() {
            try {
                localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(STATE.history));
            } catch (e) {
                showToast('⚠️ Brak miejsca — wyczyść historię', 'error');
            }
        }

        function saveConstants() {
            try {
                localStorage.setItem(STORAGE_KEYS.constants, JSON.stringify(STATE.constants));
            } catch (e) {
                showToast('⚠️ Brak miejsca na stałe', 'error');
            }
        }

        function saveRecentCommands() {
            try {
                localStorage.setItem(STORAGE_KEYS.recentCommands, JSON.stringify(STATE.recentCommands));
            } catch (e) {}
        }

        /* ============================================================
           [EN] Toast Notification
           ============================================================ */
        let toastTimer = null;
        function showToast(message, type) {
            if (toastTimer) clearTimeout(toastTimer);
            toast.textContent = message;
            toast.className = 'toast ' + (type || '');
            // [EN] Force reflow to restart animation
            void toast.offsetWidth;
            toast.classList.add('show');
            toastTimer = setTimeout(function() {
                toast.classList.remove('show');
                toastTimer = null;
            }, 2000);
        }

        function hapticTap(strength) {
            if (navigator.vibrate) {
                navigator.vibrate(strength || 15);
            }
        }

        function copyText(text) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                return navigator.clipboard.writeText(text);
            }
            return new Promise(function(resolve, reject) {
                var textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    resolve();
                } catch (err) {
                    document.body.removeChild(textarea);
                    reject(err);
                }
            });
        }

        function normalizeNumberText(text) {
            return String(text || '').replace(/\s/g, '').replace(',', '.');
        }

        function formatLocaleNumber(num, maxDigits) {
            if (!isFinite(num)) return String(num);
            // Dokładne liczby całkowite (≤ MAX_SAFE_INTEGER) pokaż w pełni (16 cyfr);
            // ułamki/duże floaty zaokrąglij do 15 cyfr znaczących (ukrycie szumu).
            var rounded = (Number.isInteger(num) && Math.abs(num) <= Number.MAX_SAFE_INTEGER)
                ? num
                : (Math.abs(num) < 1e308 ? parseFloat(num.toPrecision(15)) : num);
            return rounded.toLocaleString('pl-PL', {
                maximumFractionDigits: maxDigits == null ? 10 : maxDigits,
                useGrouping: true,
            });
        }

        /* ============================================================
           [EN] Haptic'stics — Selective Vibration on Interactions
           ============================================================ */

        /* ---- Haptyka: tylko przy kliknięciu, nie przy scrollowaniu ---- */
        /* Lista elementów które NIE wibrują (niezależnie od kliknięcia) */
        var NO_HAPTIC = [
            '.zoom-btn',          /* przyciski zoom na canvasie */
            '.sign-toggle',       /* przycisk ± przy polach marginesów */
            '#orientationBtn',    /* przycisk orientacji ekranu */
            '#cacheRefreshBtn',   /* przycisk odświeżania cache */
            '#installAppBtn',     /* przycisk instalacji PWA */
            '.no-haptic',         /* klasa-parasol — dodaj ją w HTML do dowolnego buttona */
        ];

        var _hapticDown = null;

        document.addEventListener('pointerdown', function(e) {
            /* Sprawdź czy element jest na liście wykluczeń */
            var skip = NO_HAPTIC.some(function(sel) { return !!e.target.closest(sel); });
            if (skip) return;

            /* Sprawdź czy element w ogóle powinien wibrować */
            if (!e.target.closest('button, .history-item, .calc-result, input[type="button"]')) return;

            /* Zapamiętaj pozycję palca/kursora */
            _hapticDown = { x: e.clientX, y: e.clientY };
        }, { passive: true });

        document.addEventListener('pointerup', function(e) {
            if (!_hapticDown) return;
            /* Sprawdź czy palec się nie przesunął (czyli to był scroll, nie klik) */
            var dx = Math.abs(e.clientX - _hapticDown.x);
            var dy = Math.abs(e.clientY - _hapticDown.y);
            var czyScroll = (dx > 8 || dy > 8); /* próg 8px */
            if (!czyScroll) {
                hapticTap(15); /* wibruj tylko przy prawdziwym kliknięciu */
            }
            _hapticDown = null;
        }, { passive: true });

        document.addEventListener('pointercancel', function() {
            /* Przeglądarka anulowała touch (np. zaczął się scroll strony) */
            _hapticDown = null;
        }, { passive: true });
        /* ============================================================
           [EN] Tab Navigation
           ============================================================ */
        function switchTab(tabName) {
            STATE.activeTab = tabName;
            var titles = {
                calculator: 'Kalkulator — Matm0',
                komenda:    'Komenda — Matm0',
                warsztat:   'Warsztat — Matm0',
                constants:  'Moje Stałe — Matm0',
            };
            document.title = titles[tabName] || 'Kalkulator by Matm0';
            tabBtns.forEach(function(btn) {
                var isActive = btn.getAttribute('data-tab') === tabName;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });
            Object.keys(panels).forEach(function(key) {
                panels[key].classList.toggle('active', key === tabName);
            });
            if (tabName === 'komenda') {
                setTimeout(function() { updateGraph(); }, 50);
            }
            if (tabName === 'constants') {
                renderConstants();
            }
        }

        tabBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                switchTab(btn.getAttribute('data-tab'));
            });
        });

        /* ============================================================
           [EN] STANDARD CALCULATOR — Button Layout
           ============================================================ */
        const calcButtons = [
            ['AC', 'fn clear', '()', 'fn', '%', 'fn', '÷', 'operator'],
            ['7', 'number', '8', 'number', '9', 'number', '×', 'operator'],
            ['4', 'number', '5', 'number', '6', 'number', '−', 'operator'],
            ['1', 'number', '2', 'number', '3', 'number', '+', 'operator'],
            ['0', 'number', '.', 'number', '⌫', 'fn', '=', 'equals'],
        ];

        function buildCalcButtons() {
            calcGrid.replaceChildren();
            calcButtons.forEach(function(row) {
                for (var i = 0; i < row.length; i += 2) {
                    var label = row[i];
                    var type = row[i + 1];
                    var btn = document.createElement('button');
                    btn.className = 'calc-btn calc-btn--' + type;
                    if (type === 'clear') btn.className += ' calc-btn--clear';
                    btn.textContent = label;
                    btn.setAttribute('data-action', label);
                    btn.addEventListener('pointerdown', function(e) {
                        if (e.button !== undefined && e.button !== 0) return;
                        handleCalcAction(e.currentTarget.getAttribute('data-action'));
                    });
                    calcGrid.appendChild(btn);
                }
            });
        }

        /* ============================================================
           [EN] Calculator Logic — Raycast-style expression evaluator
           ============================================================ */

        // ── Jednostki konwersji (kategorie) ─────────────────────────
        // factor = ile jednostek bazowych kategorii mieści się w 1 tej jednostce.
        // Temperatura jest skalą afiniczną (offset) → osobna obsługa niżej.
        var CALC_UNIT_CATEGORIES = {
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

        // Płaska mapa: nazwa jednostki (lowercase) → { cat, factor, base }
        var CALC_UNITS = {};
        var CALC_UNIT_DISPLAY = {}; // lowercase → oryginalna pisownia (np. „mb" → „MB")
        Object.keys(CALC_UNIT_CATEGORIES).forEach(function(cat) {
            var def = CALC_UNIT_CATEGORIES[cat];
            Object.keys(def.units).forEach(function(u) {
                var key = u.toLowerCase();
                CALC_UNITS[key] = { cat: cat, factor: def.units[u], base: def.base };
                if (!CALC_UNIT_DISPLAY[key]) CALC_UNIT_DISPLAY[key] = u;
            });
        });

        function parseNaturalShortcuts(raw) {
            // --- Normalizacja: "10 procent" → "10%" (przed resztą) ---
            raw = raw.replace(/([\d.,]+)\s+procent[a-z]*/gi, function(_, n) { return n + '%'; });

            // --- Normalizacja skrótów liczbowych: tys / mln ---
            raw = raw.replace(/([\d.,]+)\s*(?:tys\.?|tysi[aą]c[a-z]*)\b/gi,
                function(_, n) { return '(' + n.replace(',', '.') + '*1000)'; });
            raw = raw.replace(/([\d.,]+)\s*(?:mln\.?|milion[a-z]*)\b/gi,
                function(_, n) { return '(' + n.replace(',', '.') + '*1000000)'; });
            // K notation (angielski): 10K → 10000
            raw = raw.replace(/([\d.,]+)\s*[kK](?!\w)/g,
                function(_, n) { return '(' + n.replace(',', '.') + '*1000)'; });

            // --- Ułamki PL + EN ---
            raw = raw.replace(/\bpo[łl]owa\s+([\d.,]+)/gi,        '($1/2)');  // połowa / polowa
            raw = raw.replace(/\bpó[łl]\s+([\d.,]+)/gi,           '($1/2)');  // pół / pol
            raw = raw.replace(/\bpol\s+([\d.,]+)/gi,               '($1/2)');  // pol
            raw = raw.replace(/\bjedna\s+trzecia\s+([\d.,]+)/gi,   '($1/3)');
            raw = raw.replace(/\btrzecia\s+([\d.,]+)/gi,           '($1/3)');
            raw = raw.replace(/\bjedna\s+czwarta\s+([\d.,]+)/gi,   '($1/4)');
            raw = raw.replace(/\bczwarta\s+([\d.,]+)/gi,           '($1/4)');

            // --- Matematyka naturalna PL + EN ---
            raw = raw.replace(/(?:square\s+root\s+of|pierwiastek\s+(?:kwadratowy\s+)?z)\s+([\d.,]+)/gi,
                function(_, n) { return 'sqrt(' + n.replace(',', '.') + ')'; });
            raw = raw.replace(/(?:cube\s+root\s+of|pierwiastek\s+sze[sś]cienny\s+z)\s+([\d.,]+)/gi,
                function(_, n) { return '(' + n.replace(',', '.') + '^(1/3))'; });
            raw = raw.replace(/([\d.,]+)\s+(?:power|do\s+pot[eę]gi|podniesiony\s+do\s+pot[eę]gi)\s+([\d.,]+)/gi,
                function(_, b, e) { return '(' + b.replace(',', '.') + '^' + e.replace(',', '.') + ')'; });

            // --- Proporcja / ratio ---
            raw = raw.replace(/(?:ratio\s+of|proporcja|stosunek)\s+([\d.,]+)\s+(?:to|do)\s+([\d.,]+)/gi,
                function(_, a, b) { return '(' + a.replace(',', '.') + '/' + b.replace(',', '.') + ')'; });

            // --- Procenty (od najbardziej szczegółowych) ---
            // napiwek / tip
            raw = raw.replace(/([\d.,]+)%\s+(?:tip|napiwek)\s+(?:on|na)\s+([\d.,]+)/gi,
                function(_, p, b) { return '(' + b.replace(',', '.') + '*(1+' + p.replace(',', '.') + '/100))'; });
            // rabat / zniżka / off
            raw = raw.replace(/([\d.,]+)%\s+(?:off|rabat[u]?|zni[zż]k[aię]?)\s+(?:na|od|z|on)?\s*([\d.,]+)/gi,
                function(_, p, b) { return '(' + b.replace(',', '.') + '*(1-' + p.replace(',', '.') + '/100))'; });
            // narzut / marża / markup
            raw = raw.replace(/([\d.,]+)%\s+(?:narzut[u]?|mar[zż][ae]?|markup)\s+(?:na|od|do|on)?\s*([\d.,]+)/gi,
                function(_, p, b) { return '(' + b.replace(',', '.') + '*(1+' + p.replace(',', '.') + '/100))'; });
            // --- Finanse PL: brutto / netto / VAT (domyślny VAT 23%, opcjonalna własna stawka) ---
            // Kolejność: brutto/netto najpierw, by „skonsumowały" swoje końcowe „vat N%",
            // zanim ogólna reguła VAT spróbuje je złapać.
            function _vatRate(r) { var v = r != null ? parseFloat(String(r).replace(',', '.')) : 23; return isFinite(v) && v >= 0 ? v : 23; }
            // brutto = netto + VAT. „brutto 1000", „brutto 1000 vat 8%", „1000 brutto"
            raw = raw.replace(/\bbrutto\s+([\d.,]+)(?:\s+(?:z\s+)?vat\s+([\d.,]+)%?)?/gi,
                function(_, x, r) { return '(' + x.replace(',', '.') + '*(1+' + _vatRate(r) + '/100))'; });
            raw = raw.replace(/([\d.,]+)\s+brutto\b(?:\s+(?:z\s+)?vat\s+([\d.,]+)%?)?/gi,
                function(_, x, r) { return '(' + x.replace(',', '.') + '*(1+' + _vatRate(r) + '/100))'; });
            // netto = brutto − VAT. „netto 1230", „netto 1080 vat 8%", „1230 netto"
            raw = raw.replace(/\bnetto\s+([\d.,]+)(?:\s+(?:z\s+)?vat\s+([\d.,]+)%?)?/gi,
                function(_, x, r) { return '(' + x.replace(',', '.') + '/(1+' + _vatRate(r) + '/100))'; });
            raw = raw.replace(/([\d.,]+)\s+netto\b(?:\s+(?:z\s+)?vat\s+([\d.,]+)%?)?/gi,
                function(_, x, r) { return '(' + x.replace(',', '.') + '/(1+' + _vatRate(r) + '/100))'; });
            // sama kwota VAT od netto. „vat od 1000", „vat 1000", „vat 8% od 1000"
            raw = raw.replace(/\bvat\s+(?:([\d.,]+)%\s+)?(?:od\s+|z\s+)?([\d.,]+)/gi,
                function(_, r, x) { return '(' + x.replace(',', '.') + '*' + _vatRate(r) + '/100)'; });

            // "dodaj X% do Y"
            raw = raw.replace(/dodaj\s+([\d.,]+)%\s+do\s+([\d.,]+)/gi,
                function(_, p, b) { return '(' + b.replace(',', '.') + '*(1+' + p.replace(',', '.') + '/100))'; });
            // "X% z Y" / "X% of Y"
            raw = raw.replace(/([\d.,]+)%\s+(?:z|of)\s+([\d.,]+)/gi, '($2*$1/100)');
            // "X% od Y" (rabat skrótowy)
            raw = raw.replace(/([\d.,]+)%\s+od\s+([\d.,]+)/gi, '($2*(1-$1/100))');
            // Samsung-style "A + B%" (prosta jednocyfrowa forma)
            raw = raw.replace(/^([\d.,]+)\s*([+\-])\s*([\d.,]+)%\s*$/, function(_, a, op, b) {
                return a.replace(',', '.') + op + '(' + a.replace(',', '.') + '*' + b.replace(',', '.') + '/100)';
            });
            // Samodzielne "N%"
            raw = raw.replace(/([\d.,]+)%/g, '($1/100)');

            return raw;
        }

        // „ans" / „wynik" / „poprzedni" → ostatni zatwierdzony wynik (STATE.calc.ans).
        // Gdy brak zatwierdzonego wyniku — zostawiamy słowo, więc wyrażenie po prostu
        // nie da rezultatu (zamiast cichego podstawienia 0).
        function resolveCalcAnswer(raw) {
            if (STATE.calc.ans === null || !isFinite(STATE.calc.ans)) return raw;
            return raw.replace(/\b(?:ans|wynik|poprzedni)\b/gi, '(' + String(STATE.calc.ans) + ')');
        }

        function resolveCalcConstants(raw, constants) {
            if (!constants || !constants.length) return raw;
            var result = raw;
            constants.forEach(function(c) {
                if (!c.name) return;
                var escaped = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                result = result.replace(new RegExp('\\b' + escaped + '\\b', 'gi'), String(c.value));
            });
            return result;
        }

        // Regex nazw jednostek — najdłuższe najpierw, żeby „m2" nie złapało się jako „m".
        var _UNIT_NAMES_RE = Object.keys(CALC_UNITS)
            .sort(function(a, b) { return b.length - a.length; })
            .map(function(u) { return u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); })
            .join('|');

        // ── Temperatura (skala afiniczna) — tylko jawna konwersja „X na Y" ──
        function _tempCanon(s) {
            s = String(s).toLowerCase();
            if (s.charAt(0) === 'c') return 'C';
            if (s.charAt(0) === 'f') return 'F';
            if (s.charAt(0) === 'k') return 'K';
            return null;
        }
        function _tempConvert(value, from, to) {
            var c; // najpierw na Celsjusza
            if (from === 'C') c = value;
            else if (from === 'F') c = (value - 32) * 5 / 9;
            else c = value - 273.15; // K
            if (to === 'C') return c;
            if (to === 'F') return c * 9 / 5 + 32;
            return c + 273.15; // K
        }
        var _tempConvertRe = /^\s*(-?[\d.,]+)\s*°?\s*(c|celsjus\w*|f|fahrenheit\w*|k|kelwin\w*)\s+(?:na|do|in|to|w)\s+°?\s*(c|celsjus\w*|f|fahrenheit\w*|k|kelwin\w*)\s*$/i;

        function resolveCalcUnits(raw) {
            // 0) Temperatura — wyłącznie jawna konwersja „X na Y" (offset, nie da się sumować)
            var tMatch = raw.match(_tempConvertRe);
            if (tMatch) {
                var tFrom = _tempCanon(tMatch[2]);
                var tTo = _tempCanon(tMatch[3]);
                var tVal = parseFloat(tMatch[1].replace(',', '.'));
                if (tFrom && tTo && isFinite(tVal)) {
                    var tOut = _tempConvert(tVal, tFrom, tTo);
                    return { expr: String(tOut), unit: tTo === 'K' ? 'K' : '°' + tTo, cat: 'temperature', valueInBase: tOut };
                }
            }

            // 1) Jawna konwersja „EXPR na|do|in|to|w UNIT"
            var convertRe = new RegExp('^(.+?)\\s+(?:na|do|in|to|w)\\s+(' + _UNIT_NAMES_RE + ')\\s*$', 'i');
            var naMatch = raw.match(convertRe);
            if (naMatch) {
                var inner = resolveCalcUnits(naMatch[1].trim());
                var targetDef = CALC_UNITS[naMatch[2].toLowerCase()];
                if (inner.unit !== null && targetDef && inner.cat === targetDef.cat) {
                    var converted = inner.valueInBase / targetDef.factor;
                    var targetKey = naMatch[2].toLowerCase();
                    return { expr: String(converted), unit: CALC_UNIT_DISPLAY[targetKey] || targetKey, cat: targetDef.cat, valueInBase: inner.valueInBase };
                }
            }

            // 2) Sumowanie jednostek tej samej kategorii (pierwsza napotkana wyznacza kategorię)
            var totalBase = 0;
            var cat = null;
            var baseUnit = null;
            var hasUnits = false;
            var mixed = false; // wykryto jednostki z różnych kategorii (np. kg + cm)
            var expr = raw;

            // Notacja stóp (N') i cali (N") — zawsze długość
            expr = expr.replace(/([\d.,]+)\s*'/g, function(_, n) {
                if (cat && cat !== 'length') { mixed = true; return _; }
                hasUnits = true; cat = 'length'; baseUnit = 'mm';
                var base = parseFloat(n.replace(',', '.')) * 304.8;
                totalBase += base;
                return String(base);
            });
            expr = expr.replace(/([\d.,]+)\s*"/g, function(_, n) {
                if (cat && cat !== 'length') { mixed = true; return _; }
                hasUnits = true; cat = 'length'; baseUnit = 'mm';
                var base = parseFloat(n.replace(',', '.')) * 25.4;
                totalBase += base;
                return String(base);
            });

            // Nazwane jednostki. Lookahead (?![A-Za-z0-9]) zamiast \b — obsługuje też „°".
            var unitRe = new RegExp('([\\d.,]+)\\s*(' + _UNIT_NAMES_RE + ')(?![A-Za-z0-9])', 'gi');
            expr = expr.replace(unitRe, function(m, numStr, unit) {
                var def = CALC_UNITS[unit.toLowerCase()];
                if (!def) return m;
                if (cat && def.cat !== cat) { mixed = true; return m; } // miks kategorii
                cat = def.cat; baseUnit = def.base; hasUnits = true;
                var base = parseFloat(numStr.replace(',', '.')) * def.factor;
                totalBase += base;
                return String(base);
            });

            // Miks kategorii (kg + cm) nie ma sensu → zwróć surowiec bez wyniku jednostkowego.
            if (mixed) return { expr: raw, unit: null, cat: null, valueInBase: 0 };

            return { expr: expr, unit: hasUnits ? baseUnit : null, cat: cat, valueInBase: totalBase };
        }

        /* ============================================================
           [EN] Daty i czas — „za 3 tygodnie", „ile dni do 1.09", „dziś + 90 dni"
           ============================================================ */
        var _PL_MONTHS = {
            stycznia:1, styczen:1, 'styczeń':1, lutego:2, luty:2, marca:3, marzec:3,
            kwietnia:4, kwiecien:4, 'kwiecień':4, maja:5, maj:5, czerwca:6, czerwiec:6,
            lipca:7, lipiec:7, sierpnia:8, sierpien:8, 'sierpień':8,
            wrzesnia:9, 'września':9, wrzesien:9, 'wrzesień':9,
            pazdziernika:10, 'października':10, pazdziernik:10, 'październik':10,
            listopada:11, listopad:11, grudnia:12, grudzien:12, 'grudzień':12,
        };
        var _PL_WEEKDAYS = ['niedziela','poniedziałek','wtorek','środa','czwartek','piątek','sobota'];

        function _today() { var d = new Date(); d.setHours(0,0,0,0); return d; }
        function _validDMY(d, m, y) { return m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1 && y <= 9999; }
        function _fmtDate(d) {
            return d.getDate() + '.' + (d.getMonth()+1) + '.' + d.getFullYear() + ' (' + _PL_WEEKDAYS[d.getDay()] + ')';
        }
        function _fmtDays(n) { return n + ' ' + (Math.abs(n) === 1 ? 'dzień' : 'dni'); }
        function _isDateUnit(u) {
            // [a-ząćęłńóśźż] zamiast \w — \w nie obejmuje polskich liter (miesiące, miesięcy).
            return /^(dni|dnia|dzie[nń]|tydzie[nń]|tygodni[a-ząćęłńóśźż]*|tyg|miesi[a-ząćęłńóśźż]*|lat[a-ząćęłńóśźż]*|rok[a-ząćęłńóśźż]*|roku)$/i.test(u);
        }
        function _applyDateUnit(d, n, u, sign) {
            n = Math.round(n) * sign;
            u = u.toLowerCase();
            if (/^tyg|^tydzie/.test(u)) d.setDate(d.getDate() + n*7);
            else if (/^miesi/.test(u)) d.setMonth(d.getMonth() + n);
            else if (/^(lat|rok|roku)/.test(u)) d.setFullYear(d.getFullYear() + n);
            else d.setDate(d.getDate() + n); // dni
        }
        // → { d: Date, hasYear: bool } albo null
        function _parseDateToken(str) {
            var s = String(str).trim().toLowerCase();
            if (/^dzi[sś]$|^dzisiaj$/.test(s)) return { d: _today(), hasYear: true };
            if (s === 'jutro')    { var j = _today(); j.setDate(j.getDate()+1); return { d: j, hasYear: true }; }
            if (s === 'pojutrze') { var p = _today(); p.setDate(p.getDate()+2); return { d: p, hasYear: true }; }
            if (s === 'wczoraj')  { var w = _today(); w.setDate(w.getDate()-1); return { d: w, hasYear: true }; }
            var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); // ISO
            if (m) { var y=+m[1], mo=+m[2], da=+m[3]; if (_validDMY(da,mo,y)) return { d: new Date(y,mo-1,da), hasYear: true }; return null; }
            m = s.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/); // DD.MM(.YYYY)
            if (m) {
                var d1=+m[1], m1=+m[2], y1 = m[3] ? +m[3] : _today().getFullYear();
                if (m[3] && m[3].length === 2) y1 += 2000;
                if (_validDMY(d1,m1,y1)) return { d: new Date(y1,m1-1,d1), hasYear: !!m[3] };
                return null;
            }
            m = s.match(/^(\d{1,2})\s+([a-ząćęłńóśźż]+)(?:\s+(\d{2,4}))?$/); // DD miesiąc [RRRR]
            if (m && _PL_MONTHS[m[2]]) {
                var d2=+m[1], m2=_PL_MONTHS[m[2]], y2 = m[3] ? +m[3] : _today().getFullYear();
                if (m[3] && m[3].length === 2) y2 += 2000;
                if (_validDMY(d2,m2,y2)) return { d: new Date(y2,m2-1,d2), hasYear: !!m[3] };
            }
            return null;
        }

        function evalDateExpression(raw) {
            var s = String(raw || '').trim();
            if (!s) return null;
            var low = s.toLowerCase();
            var m;
            // „ile dni od A do B"
            if ((m = low.match(/^ile\s+dni\s+od\s+(.+?)\s+do\s+(.+)$/))) {
                var a = _parseDateToken(m[1]), b = _parseDateToken(m[2]);
                if (a && b) { var n = Math.round((b.d - a.d)/86400000); return { text: _fmtDays(n), value: n }; }
                return null;
            }
            // „ile dni do B" (z przeskokiem na przyszły rok, gdy bez roku i data minęła)
            if ((m = low.match(/^ile\s+dni\s+(?:do|zosta[łl]o\s+do|pozosta[łl]o\s+do)\s+(.+)$/))) {
                var b2 = _parseDateToken(m[1]);
                if (b2) {
                    if (!b2.hasYear && b2.d < _today()) b2.d.setFullYear(b2.d.getFullYear()+1);
                    var n2 = Math.round((b2.d - _today())/86400000);
                    return { text: _fmtDays(n2), value: n2 };
                }
                return null;
            }
            // „za N <jednostka>"
            if ((m = low.match(/^za\s+([\d.,]+)\s+([a-ząćęłńóśźż]+)\s*$/)) && _isDateUnit(m[2])) {
                var d3 = _today(); _applyDateUnit(d3, parseFloat(m[1].replace(',','.')), m[2], 1);
                return { text: _fmtDate(d3), value: null };
            }
            // „N <jednostka> temu"
            if ((m = low.match(/^([\d.,]+)\s+([a-ząćęłńóśźż]+)\s+temu\s*$/)) && _isDateUnit(m[2])) {
                var d4 = _today(); _applyDateUnit(d4, parseFloat(m[1].replace(',','.')), m[2], -1);
                return { text: _fmtDate(d4), value: null };
            }
            // „dziś / jutro / wczoraj / pojutrze" samodzielnie
            if ((m = low.match(/^(dzi[sś]|dzisiaj|jutro|pojutrze|wczoraj)\s*$/))) {
                var d6 = _parseDateToken(m[1]); if (d6) return { text: _fmtDate(d6.d), value: null };
            }
            // „<data> + N <jednostka>" / „<data> - N <jednostka>"
            if ((m = low.match(/^(.+?)\s*([+\-])\s*([\d.,]+)\s+([a-ząćęłńóśźż]+)\s*$/)) && _isDateUnit(m[4])) {
                var left = _parseDateToken(m[1]);
                if (left) {
                    var d5 = left.d; _applyDateUnit(d5, parseFloat(m[3].replace(',','.')), m[4], m[2]==='-'?-1:1);
                    return { text: _fmtDate(d5), value: null };
                }
            }
            return null;
        }

        /* ============================================================
           [EN] Waluty — „12 zł + 20 eur", „20 eur na zł" (kursy NBP, offline z cache)
           ============================================================ */
        // Aliasy → kod ISO. Kody z NBP (np. CZK) dochodzą dynamicznie z pobranych kursów.
        // UWAGA: NIE mapujemy „funt" na GBP — „funt" to już jednostka masy.
        var _CUR_ALIAS = {
            'zł': 'PLN', 'zl': 'PLN', 'pln': 'PLN', 'złoty': 'PLN', 'złotych': 'PLN', 'zloty': 'PLN', 'zlotych': 'PLN',
            '€': 'EUR', 'euro': 'EUR', 'eur': 'EUR',
            '$': 'USD', 'usd': 'USD', 'dolar': 'USD', 'dolary': 'USD', 'dolarow': 'USD', 'dolarów': 'USD',
            '£': 'GBP', 'gbp': 'GBP',
            'chf': 'CHF', 'frank': 'CHF', 'franki': 'CHF',
        };
        var FX_TTL_MS = 6 * 3600 * 1000; // 6 h — po tym czasie odśwież w tle

        function _currencyTokenMap() {
            var map = {};
            Object.keys(_CUR_ALIAS).forEach(function(k) { map[k] = _CUR_ALIAS[k]; });
            var rates = STATE.fx.rates || {};
            Object.keys(rates).forEach(function(code) { map[code.toLowerCase()] = code; });
            return map;
        }
        function _currencyRate(code) {
            if (code === 'PLN') return 1;
            var rates = STATE.fx.rates || {};
            return rates[code] != null ? rates[code] : null; // PLN za 1 jednostkę
        }
        function _currencyDisplay(code) { return code === 'PLN' ? 'zł' : code; }
        function _fxReady() { return STATE.fx.rates && Object.keys(STATE.fx.rates).length > 1; }
        function _fxFresh() { return STATE.fx.ts && (Date.now() - STATE.fx.ts) < FX_TTL_MS; }

        function _currencyTokenRe() {
            var map = _currencyTokenMap();
            return Object.keys(map)
                .sort(function(a, b) { return b.length - a.length; })
                .map(function(t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); })
                .join('|');
        }
        function _inputHasCurrency(raw) {
            var re = new RegExp('([\\d.,]+)\\s*(' + _currencyTokenRe() + ')(?![a-ząćęłńóśźż0-9])', 'i');
            return re.test(String(raw || ''));
        }

        // Zwraca { expr, unit, valueInBase(PLN), hasCurrency, pending } analogicznie do resolveCalcUnits.
        function resolveCalcCurrency(raw) {
            var map = _currencyTokenMap();
            var tokenRe = _currencyTokenRe();
            if (!tokenRe) return { expr: raw, unit: null, hasCurrency: false, pending: false };

            // 1) Konwersja „EXPR na <waluta>"
            var convRe = new RegExp('^(.+?)\\s+(?:na|do|in|to|w)\\s+(' + tokenRe + ')(?![a-ząćęłńóśźż0-9])\\s*$', 'i');
            var cm = raw.match(convRe);
            if (cm) {
                var targetCode = map[cm[2].toLowerCase()];
                var inner = resolveCalcCurrency(cm[1].trim());
                if (inner.hasCurrency) {
                    var tRate = _currencyRate(targetCode);
                    if (inner.pending || !_fxReady() || tRate == null) {
                        return { expr: raw, unit: null, hasCurrency: true, pending: true };
                    }
                    var converted = inner.valueInBase / tRate;
                    return { expr: String(converted), unit: _currencyDisplay(targetCode), valueInBase: inner.valueInBase, hasCurrency: true, pending: false };
                }
            }

            // 2) Sumowanie kwot walutowych → PLN
            var totalPln = 0, hasCurrency = false, pending = false;
            var amountRe = new RegExp('([\\d.,]+)\\s*(' + tokenRe + ')(?![a-ząćęłńóśźż0-9])', 'gi');
            var expr = raw.replace(amountRe, function(m, num, tok) {
                hasCurrency = true;
                var code = map[tok.toLowerCase()];
                var rate = _currencyRate(code);
                if (!_fxReady() || rate == null) { pending = true; return m; }
                var pln = parseFloat(num.replace(',', '.')) * rate;
                totalPln += pln;
                return String(pln);
            });
            if (!hasCurrency) return { expr: raw, unit: null, hasCurrency: false, pending: false };
            if (pending) return { expr: raw, unit: null, hasCurrency: true, pending: true };
            return { expr: expr, unit: 'zł', valueInBase: totalPln, hasCurrency: true, pending: false };
        }

        // Pobranie kursów z NBP (tabela A, kursy średnie). Cache + fallback offline.
        function loadFxRates() {
            if (STATE.fx.loading) return;
            if (typeof fetch !== 'function') { STATE.fx.error = 'no-fetch'; return; }
            STATE.fx.loading = true; STATE.fx.error = null;
            fetch('https://api.nbp.pl/api/exchangerates/tables/A?format=json')
                .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
                .then(function(data) {
                    var table = data && data[0];
                    if (!table || !table.rates) throw new Error('bad-data');
                    var rates = { PLN: 1 };
                    table.rates.forEach(function(x) { rates[x.code] = x.mid; });
                    STATE.fx.rates = rates;
                    STATE.fx.ts = Date.now();
                    STATE.fx.date = table.effectiveDate || null;
                    STATE.fx.error = null;
                    try { localStorage.setItem(STORAGE_KEYS.fxRates, JSON.stringify({ rates: rates, ts: STATE.fx.ts, date: STATE.fx.date })); } catch (e) {}
                })
                .catch(function(err) { STATE.fx.error = (err && err.message) || 'fetch-error'; })
                .then(function() { STATE.fx.loading = false; if (typeof liveEval === 'function') liveEval(); });
        }
        // Pobierz gdy trzeba: brak kursów lub przeterminowane (i nie trwa już pobieranie).
        function ensureFxRates() {
            if (STATE.fx.loading) return;
            if (_fxReady() && _fxFresh()) return;
            loadFxRates();
        }

        // ── Dokładne liczenie na DUŻYCH liczbach całkowitych (BigInt) ──
        // Obsługuje +, −, × i nawiasy na liczbach całkowitych o DOWOLNEJ długości.
        // Zwraca string z cyframi wyniku albo null, gdy wyrażenie się nie kwalifikuje
        // (ułamki, dzielenie, jednostki, funkcje → null, leci zwykłą ścieżką float).
        function tryBigIntCalc(raw) {
            var s = String(raw == null ? '' : raw)
                .replace(/×/g, '*')
                .replace(/−/g, '-')
                .replace(/\s+/g, '');
            if (!s) return null;
            if (!/^[0-9+\-*()]+$/.test(s)) return null; // brak kropki/przecinka, „/”, liter
            if (!/[0-9]/.test(s)) return null;
            var i = 0;
            function peek() { return s.charAt(i); }
            function parseExpr() {
                var v = parseTerm();
                while (peek() === '+' || peek() === '-') {
                    var op = s.charAt(i++);
                    var r = parseTerm();
                    v = op === '+' ? v + r : v - r;
                }
                return v;
            }
            function parseTerm() {
                var v = parseFactor();
                while (peek() === '*') { i++; v = v * parseFactor(); }
                return v;
            }
            function parseFactor() {
                var c = peek();
                if (c === '+') { i++; return parseFactor(); }
                if (c === '-') { i++; return -parseFactor(); }
                if (c === '(') {
                    i++;
                    var v = parseExpr();
                    if (peek() !== ')') throw new Error('paren');
                    i++;
                    return v;
                }
                var start = i;
                while (i < s.length && s.charAt(i) >= '0' && s.charAt(i) <= '9') i++;
                if (i === start) throw new Error('num');
                return BigInt(s.slice(start, i));
            }
            try {
                var result = parseExpr();
                if (i !== s.length) return null; // niedoparsowane resztki
                return result.toString();
            } catch (e) {
                return null;
            }
        }

        // Grupowanie tysięcy dla stringa liczby całkowitej (jak pl-PL: spacją niełamliwą).
        function groupBigIntStr(str) {
            var neg = str.charAt(0) === '-';
            var d = neg ? str.slice(1) : str;
            d = d.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
            return (neg ? '-' : '') + d;
        }

        function evalCalcExpression(raw) {
            var original = String(raw || '').trim();
            if (!original) return { value: null, unit: null, error: null };
            // Najpierw daty/czas — zanim „dni"/„za" trafią do matematyki/jednostek.
            var dateRes = evalDateExpression(original);
            if (dateRes) {
                STATE.calc.lastResult = dateRes.value;
                STATE.calc.lastUnit = null;
                return { value: dateRes.value, unit: null, text: dateRes.text, error: null };
            }
            try {
                var expr = original;
                expr = parseNaturalShortcuts(expr);
                expr = resolveCalcAnswer(expr);
                expr = resolveCalcConstants(expr, STATE.constants);
                // Duże liczby całkowite (+, −, ×): licz dokładnie BigInt-em, ale TYLKO gdy
                // to potrzebne (liczba/wynik > 15 cyfr) — krótkie działania idą zwykłą
                // ścieżką float, żeby zachować dotychczasowe formatowanie i testy.
                var bigStr = tryBigIntCalc(expr);
                if (bigStr !== null) {
                    var bigNeeded = /\d{16,}/.test(expr.replace(/\s+/g, '')) ||
                                    bigStr.replace('-', '').length > 15;
                    if (bigNeeded) {
                        STATE.calc.lastResult = bigStr;
                        STATE.calc.lastUnit = null;
                        return { value: null, unit: null, error: null,
                                 big: true, bigStr: bigStr, text: groupBigIntStr(bigStr) };
                    }
                }
                // Waluty (przed jednostkami): zamienia kwoty walutowe na PLN / robi konwersję.
                var curRes = resolveCalcCurrency(expr);
                if (curRes.pending) return { value: null, unit: null, error: null, pendingFx: true };
                expr = curRes.expr;
                var unitResult = resolveCalcUnits(expr);
                expr = unitResult.expr;
                var unit = curRes.hasCurrency ? curRes.unit : unitResult.unit;
                expr = expr.replace(/,(?=\d)/g, '.');
                expr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
                expr = expr.replace(/\s+/g, '');
                if (!expr) return { value: null, unit: null, error: null };
                var fn = compileGraphExpression(expr);
                var value = fn(0);
                if (!isFinite(value)) return { value: Infinity, unit: unit, error: '∞' };
                // Dokładne liczby całkowite do MAX_SAFE_INTEGER (16 cyfr) zostaw bez
                // zaokrąglania; tylko ułamki/duże floaty tnij do 15 cyfr znaczących,
                // by ukryć szum zmiennoprzecinkowy (np. 0,1+0,2).
                if (Math.abs(value) < 1e308 && value !== 0 &&
                    !(Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER)) {
                    value = parseFloat(value.toPrecision(15));
                }
                STATE.calc.lastResult = value;
                STATE.calc.lastUnit = unit;
                return { value: value, unit: unit, error: null };
            } catch (err) {
                return { value: null, unit: null, error: null };
            }
        }

        function formatCalcResult(res) {
            if (!res) return '';
            if (res.text != null) return res.text; // wynik daty/czasu
            if (res.value === null) return '';
            if (res.error === '∞') return '∞';
            var str = formatLocaleNumber(res.value, 10);
            if (res.unit) str += ' ' + res.unit;
            return str;
        }

        function insertAtCursor(input, text) {
            var focused = document.activeElement === input;
            var start = focused && input.selectionStart != null ? input.selectionStart : input.value.length;
            var end   = focused && input.selectionEnd   != null ? input.selectionEnd   : input.value.length;
            input.value = input.value.slice(0, start) + text + input.value.slice(end);
            try { input.setSelectionRange(start + text.length, start + text.length); } catch(e) {}
        }

        function liveEval() {
            // Wyrażenia z samych liczb całkowitych i +,−,×,() liczymy BigInt-em (dokładnie,
            // dowolna długość) — NIE obcinamy ich. Pozostałe (ułamki/dzielenie/funkcje) idą
            // przez float: tam liczba > 16 cyfr przekracza dokładność JS, więc tniemy nadmiar.
            var rawVal = calcExpr.value;
            var bigEligible = /^[\s0-9+\-*()×−]+$/.test(rawVal) && /\d/.test(rawVal);
            var clamped = bigEligible
                ? rawVal
                : rawVal.replace(/\d{17,}/g, function(run) { return run.slice(0, 16); });
            if (clamped !== calcExpr.value) {
                var atEnd = calcExpr.selectionStart >= calcExpr.value.length;
                calcExpr.value = clamped;
                if (atEnd) { try { calcExpr.setSelectionRange(clamped.length, clamped.length); } catch (e) {} }
            }
            var res = evalCalcExpression(calcExpr.value);
            // Waluty: kursów brak/przeterminowane — pobierz i pokaż status zamiast wyniku.
            if (res.pendingFx) {
                ensureFxRates();
                calcResult.textContent = STATE.fx.error && !_fxReady() ? 'Kursy: brak połączenia' : 'Pobieram kursy…';
                calcResult.classList.remove('small', 'xsmall');
                calcResult.classList.add('small');
                return;
            }
            // Mamy kursy, ale warto odświeżyć w tle, gdy stare (wynik z cache pokazujemy od razu).
            if (calcExpr.value && _fxReady() && !_fxFresh() && _inputHasCurrency(calcExpr.value)) ensureFxRates();
            var hasResult = res.value !== null || res.text != null;
            var display = hasResult ? formatCalcResult(res) : (calcExpr.value === '' ? '0' : '');
            calcResult.textContent = display;
            calcResult.classList.remove('small', 'xsmall');
            if (display.length > 10) calcResult.classList.add('small');
            if (display.length > 14) calcResult.classList.add('xsmall');
        }

        function handleCalcAction(action) {
            var expr = calcExpr.value;

            if ((action >= '0' && action <= '9') || action === '.') {
                insertAtCursor(calcExpr, action);
                liveEval();
                return;
            }

            // Smart „()" jak w Samsungu: domknij nawias, gdy jest co domknąć i poprzedni
            // znak to liczba / ) / „.", w przeciwnym razie otwórz nowy.
            if (action === '()') {
                var focused = document.activeElement === calcExpr;
                var pos = focused && calcExpr.selectionStart != null ? calcExpr.selectionStart : calcExpr.value.length;
                var before = calcExpr.value.slice(0, pos);
                var opens = (before.match(/\(/g) || []).length;
                var closes = (before.match(/\)/g) || []).length;
                var prev = before.slice(-1);
                var canClose = opens > closes && /[\d.)]/.test(prev);
                insertAtCursor(calcExpr, canClose ? ')' : '(');
                liveEval();
                return;
            }

            if (action === '%') {
                var trimmed = expr.trim();
                // Samsung-style: detect BASE [+|-] NUMBER at the end of expression
                var addSubM = trimmed.match(/^([\s\S]+?)([+\-−])([\d.,]+)\s*$/);
                if (addSubM) {
                    var baseE = addSubM[1];
                    var opE   = addSubM[2];
                    var pctE  = addSubM[3].replace(',', '.');
                    // A + B → A + (A * B/100)
                    calcExpr.value = baseE + opE + '(' + baseE + '*' + pctE + '/100)';
                } else if (/^[\d.,]+$/.test(trimmed)) {
                    // Standalone number: 25 → (25/100)
                    calcExpr.value = '(' + trimmed.replace(',', '.') + '/100)';
                } else {
                    insertAtCursor(calcExpr, '%');
                }
                calcExpr.setSelectionRange(calcExpr.value.length, calcExpr.value.length);
                liveEval();
                return;
            }

            if (action === '⌫') {
                var focused = document.activeElement === calcExpr;
                var s = focused ? calcExpr.selectionStart : expr.length;
                var eb = focused ? calcExpr.selectionEnd : expr.length;
                if (s !== eb) {
                    calcExpr.value = expr.slice(0, s) + expr.slice(eb);
                    try { calcExpr.setSelectionRange(s, s); } catch(e) {}
                } else if (s > 0) {
                    calcExpr.value = expr.slice(0, s - 1) + expr.slice(s);
                    try { calcExpr.setSelectionRange(s - 1, s - 1); } catch(e) {}
                }
                liveEval();
                return;
            }

            if (action === 'AC') {
                calcExpr.value = '';
                STATE.calc.lastResult = null;
                STATE.calc.lastUnit = null;
                STATE.calc.ans = null;
                liveEval();
                return;
            }

            if (action === '+' || action === '−' || action === '×' || action === '÷') {
                insertAtCursor(calcExpr, action);
                liveEval();
                return;
            }

            if (action === '=') {
                var res = evalCalcExpression(expr);
                // Duża liczba całkowita (BigInt) — wstaw pełne cyfry z powrotem do pola,
                // żeby można było liczyć dalej (i zapamiętaj jako „ans” dokładnie).
                if (res.big && expr.trim()) {
                    addHistory(expr + ' = ' + res.text);
                    STATE.calc.ans = res.bigStr;
                    calcExpr.value = res.bigStr;
                    calcExpr.setSelectionRange(calcExpr.value.length, calcExpr.value.length);
                    liveEval();
                    return;
                }
                // Wynik daty/czasu (tekst) — dodaj do historii, zostaw wpisane wyrażenie.
                if (res.text != null && expr.trim()) {
                    addHistory(expr + ' = ' + res.text);
                    if (res.value !== null) STATE.calc.ans = res.value;
                    liveEval();
                    return;
                }
                if (res.value !== null && expr.trim()) {
                    addHistory(expr + ' = ' + formatCalcResult(res));
                    STATE.calc.ans = res.value; // zapamiętaj jako „ans" do kolejnego wyrażenia
                    calcExpr.value = formatRawNum(res.value);
                    calcExpr.setSelectionRange(calcExpr.value.length, calcExpr.value.length);
                    liveEval();
                }
                return;
            }
        }

        function formatNumber(str) {
            var num = parseFloat(normalizeNumberText(str));
            if (isNaN(num)) return str;
            return formatLocaleNumber(num, 10);
        }

        function updateCalcDisplay() {
            liveEval();
        }

        function bindLongPressCopy(el, getText) {
            if (!el) return;
            var timer = null;
            var copied = false;
            function clearTimer() {
                if (timer) clearTimeout(timer);
                timer = null;
            }
            el.addEventListener('pointerdown', function() {
                copied = false;
                clearTimer();
                timer = setTimeout(function() {
                    var text = getText ? getText() : el.textContent.trim();
                    if (!text) return;
                    copied = true;
                    el.dataset.longPressed = 'true';
                    hapticTap(35);
                    copyText(text).then(function() {
                        showToast('Skopiowano', 'success');
                    }).catch(function() {
                        showToast('Nie udało się skopiować', 'error');
                    });
                }, 550);
            });
            ['pointerup', 'pointercancel', 'pointerleave'].forEach(function(eventName) {
                el.addEventListener(eventName, clearTimer);
            });
            el.addEventListener('click', function(e) {
                if (!copied && el.dataset.longPressed !== 'true') return;
                e.preventDefault();
                e.stopPropagation();
                setTimeout(function() {
                    delete el.dataset.longPressed;
                    copied = false;
                }, 0);
            }, true);
        }

        bindLongPressCopy(calcResult, function() {
            if (STATE.calc.lastResult !== null) return String(STATE.calc.lastResult);
            var res = evalCalcExpression(calcExpr.value);
            if (res.text != null) return res.text; // sformatowana data
            return res.value !== null ? String(res.value) : calcExpr.value;
        });

        function bindCopyBox(el) {
            bindLongPressCopy(el, function() {
                var text = el.textContent.trim();
                if (!text) return;
                return text;
            });
        }
        bindCopyBox(graphResult);

        /* ============================================================
           [EN] Calculator History
           ============================================================ */
        function addHistory(entry) {
            STATE.history.unshift(entry);
            if (STATE.history.length > 50) {
                STATE.history = STATE.history.slice(0, 50);
            }
            saveHistory();
            renderHistory();
        }

        function renderHistory() {
            if (historyCount) {
                historyCount.textContent = String(STATE.history.length);
            }
            if (STATE.history.length === 0) {
                // [EN] Safe DOM creation — no innerHTML, no XSS
                var emptyLi = document.createElement('li');
                emptyLi.className = 'empty-state';
                var iconDiv = document.createElement('div');
                iconDiv.className = 'icon';
                iconDiv.textContent = '📝';
                var emptyP = document.createElement('p');
                emptyP.textContent = 'Brak historii — zacznij liczyć!';
                emptyLi.appendChild(iconDiv);
                emptyLi.appendChild(emptyP);
                historyList.replaceChildren();
                historyList.appendChild(emptyLi);
                return;
            }
            historyList.replaceChildren();
            STATE.history.forEach(function(item, idx) {
                var li = document.createElement('li');
                li.className = 'history-item';
                var parts = item.split(' = ');
                var exprPart = parts[0] || item;
                var resultPart = parts[1] || '';
                // [EN] Safe DOM creation — no innerHTML, no XSS
                var spanExpr = document.createElement('span');
                spanExpr.className = 'expr';
                spanExpr.textContent = exprPart;
                var spanResult = document.createElement('span');
                spanResult.className = 'result';
                spanResult.textContent = resultPart;
                li.appendChild(spanExpr);
                li.appendChild(spanResult);
                bindLongPressCopy(li, function() {
                    return item;
                });
                li.addEventListener('click', function() {
                    if (li.dataset.longPressed === 'true') {
                        delete li.dataset.longPressed;
                        return;
                    }
                    // [EN] Reuse history result as current input
                    if (resultPart) {
                        var reusedNorm = normalizeNumberText(resultPart);
                        calcExpr.value = reusedNorm;
                        var reusedNum = parseFloat(reusedNorm);
                        // Duża liczba całkowita: trzymaj dokładny string (nie float, by nie zgubić cyfr).
                        if (/^-?\d+$/.test(reusedNorm) && reusedNorm.replace('-', '').length > 15) {
                            STATE.calc.ans = reusedNorm;
                        } else if (isFinite(reusedNum)) {
                            STATE.calc.ans = reusedNum;
                        }
                        calcExpr.setSelectionRange(calcExpr.value.length, calcExpr.value.length);
                        liveEval();
                        switchTab('calculator');
                        closeHistoryDrawer();
                        showToast('📋 Przywrócono wynik', 'success');
                    }
                });
                historyList.appendChild(li);
            });
        }

        function openHistoryDrawer() {
            document.body.classList.add('history-open');
            if (historyDrawer) historyDrawer.setAttribute('aria-hidden', 'false');
            if (openHistoryBtn) openHistoryBtn.setAttribute('aria-expanded', 'true');
        }

        function closeHistoryDrawer() {
            document.body.classList.remove('history-open');
            if (historyDrawer) historyDrawer.setAttribute('aria-hidden', 'true');
            if (openHistoryBtn) openHistoryBtn.setAttribute('aria-expanded', 'false');
        }

        clearHistoryBtn.addEventListener('click', function() {
            STATE.history = [];
            saveHistory();
            renderHistory();
            showToast('🗑️ Historia wyczyszczona', '');
        });

        if (openHistoryBtn) openHistoryBtn.addEventListener('click', openHistoryDrawer);
        if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', closeHistoryDrawer);
        if (historyBackdrop) historyBackdrop.addEventListener('click', closeHistoryDrawer);
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && document.body.classList.contains('history-open')) {
                closeHistoryDrawer();
            }
            if (e.key === 'Escape' && document.body.classList.contains('help-open')) {
                closeCommandHelp();
            }
        });

        function escapeHTML(str) {
            var div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        function getCommandErrorEl(target) {
            return graphCommandError;
        }

        function setCommandError(target, message) {
            var el = getCommandErrorEl(target);
            if (!el) return;
            el.textContent = message || '';
        }

        function recordRecentCommand(target, command) {
            var value = String(command || '').trim();
            if (!value) return;
            if (!STATE.recentCommands) STATE.recentCommands = { engineering: [], graph: [] };
            var list = STATE.recentCommands[target] || [];
            list = [value].concat(list.filter(function(item) { return item !== value; })).slice(0, 6);
            STATE.recentCommands[target] = list;
            saveRecentCommands();
            renderRecentCommands(target);
        }

        function renderRecentCommands(target) {
            var box = graphRecentCommands;
            if (!box) return;
            var list = (STATE.recentCommands && STATE.recentCommands.graph) || [];
            box.replaceChildren();
            box.classList.toggle('has-items', list.length > 0);
            list.forEach(function(command) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'recent-command-btn no-haptic';
                btn.textContent = command;
                btn.title = command;
                btn.addEventListener('click', function() {
                    graphCommand.value = command;
                    if (typeof updateGraphCmdBadge === 'function') updateGraphCmdBadge(command);
                    updateGraph();
                });
                box.appendChild(btn);
            });
        }

        function renderAllRecentCommands() {
            renderRecentCommands('graph');
        }

        /* ============================================================
           [EN] ENGINEERING MODULE — Logic
           ============================================================ */
        function getUnitMultiplier() {
            switch (STATE.eng.unit) {
                case 'mm': return 1;
                case 'cm': return 10;
                case 'm': return 1000;
                default: return 10;
            }
        }

        function getUnitLabel() {
            return STATE.eng.unit;
        }

        // [EN] Zamienia "20" lub "20;30" na tablicę dodatnich odstępów (naprzemiennych).
        function parseSpacingList(value) {
            return String(value == null ? '' : value)
                .split(';')
                .map(function (s) { return parseGraphNumber(s, NaN); })
                .filter(function (n) { return isFinite(n) && n > 0; });
        }

        function calculatePegPositions(totalLength, count, marginStart, marginEnd, fixedSpacing, mode) {
            var usableLength = totalLength - marginStart - marginEnd;
            var positions = [];
            var step = 0;

            if (mode === 'fixed') {
                // fixedSpacing może być liczbą (stały odstęp) lub tablicą (naprzemienny: x, y, x, y…)
                var spacings = (Array.isArray(fixedSpacing) ? fixedSpacing : [fixedSpacing]).filter(function (s) { return s > 0; });
                if (!spacings.length) {
                    return { error: '⚠️ Podaj dodatni stały odstęp między podziałami.' };
                }
                var start = marginStart;
                var end = totalLength - marginEnd;
                var safety = 0, idx = 0;
                for (var pos = start; pos <= end + 1e-9 && safety < 500; safety++) {
                    positions.push(parseFloat(pos.toFixed(6)));
                    pos += spacings[idx % spacings.length];
                    idx++;
                }
                if (positions.length === 0) {
                    return { error: '⚠️ Stały odstęp nie mieści żadnego podziału w zadanym polu.' };
                }
                return { positions: positions, step: spacings.length === 1 ? spacings[0] : spacings.slice() };
            }

            if (mode === 'edges') {
                if (count === 1) {
                    positions.push(marginStart + usableLength / 2);
                    return { positions: positions, step: usableLength };
                }
                step = usableLength / (count - 1);
                for (var i = 0; i < count; i++) {
                    positions.push(marginStart + step * i);
                }
                return { positions: positions, step: step };
            }

            step = usableLength / (count + 1);
            for (var j = 1; j <= count; j++) {
                positions.push(marginStart + step * j);
            }
            return { positions: positions, step: step };
        }

        function getPlacementModeLabel(mode) {
            switch (mode) {
                case 'edges': return 'pierwszy i ostatni na granicach pola';
                case 'fixed': return 'stały odstęp od marginesu startowego';
                default: return 'równo wewnątrz pola';
            }
        }

        function formatNum(val) {
            var num = Number(val);
            if (!isFinite(num)) return '0';
            if (num === 0) return '0';
            // [EN] Smart formatting: remove trailing zeros but keep reasonable precision
            var formatted = parseFloat(num.toFixed(6));
            return formatLocaleNumber(formatted, 6);
        }

        function formatRawNum(val) {
            var num = Number(val);
            if (!isFinite(num)) return '0';
            if (num === 0) return '0';
            return String(parseFloat(num.toFixed(6)));
        }

        function drawEmptyCanvas(_canvas, _ctx) {
            var ctx = _ctx || graphCtx;
            var w = (_canvas || graphCanvas).width;
            var h = (_canvas || graphCanvas).height;
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '600 16px ' + getComputedStyle(document.body).fontFamily;
            ctx.textAlign = 'center';
            ctx.fillText('⚠️ Nieprawidłowe dane', w / 2, h / 2);
        }

        function drawEngineeringCanvasMulti(L, ms, me, allSeries, origin, _canvas, _ctx) {
            var COLORS = ['#2563eb', '#e11d48', '#16a34a', '#d97706', '#7c3aed', '#0891b2'];
            var ctx = _ctx || graphCtx;
            var W = (_canvas || graphCanvas).width;
            var H = (_canvas || graphCanvas).height;
            ctx.clearRect(0, 0, W, H);

            var PAD_L = 56, PAD_R = 36, PAD_T = 52, PAD_B = 48;
            var drawW = W - PAD_L - PAD_R;
            var unit = getUnitLabel();
            var displayL = L + (origin || 0);
            var scale = drawW / Math.max(displayL, 1);
            function toX(pos) { return PAD_L + (pos - (origin || 0)) * scale; }

            // Tło
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, W, H);

            // Delikatna siatka pomocnicza
            ctx.strokeStyle = 'rgba(226,232,240,0.7)';
            ctx.lineWidth = 1;
            var nLines = 8;
            for (var gi = 0; gi <= nLines; gi++) {
                var gx = PAD_L + (gi / nLines) * drawW;
                ctx.beginPath(); ctx.moveTo(gx, PAD_T); ctx.lineTo(gx, H - PAD_B); ctx.stroke();
            }

            // Linia bazowa (oś)
            var axisY = PAD_T + (H - PAD_T - PAD_B) / 2;
            ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1; ctx.setLineDash([]);
            ctx.beginPath(); ctx.moveTo(PAD_L, axisY); ctx.lineTo(PAD_L + drawW, axisY); ctx.stroke();

            // Belka — wąski prostokąt z zaokrąglonymi końcami
            var beamH = 14;
            var beamY = axisY - beamH / 2;
            ctx.fillStyle = '#e8d5b7';
            ctx.strokeStyle = '#b8956a';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(PAD_L, beamY, drawW, beamH, 3);
            ctx.fill(); ctx.stroke();

            // Etykiety 0 i L pod belką
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px ' + getComputedStyle(document.body).fontFamily;
            ctx.textBaseline = 'top'; ctx.textAlign = 'center';
            ctx.fillText('0', PAD_L, axisY + beamH / 2 + 4);
            ctx.fillText(formatNum(L) + ' ' + unit, PAD_L + drawW, axisY + beamH / 2 + 4);

            // Marginesy — półprzezroczyste strefy
            if (ms > 0) {
                var msX = toX(ms);
                ctx.fillStyle = 'rgba(251,191,36,0.12)';
                ctx.fillRect(PAD_L, beamY, msX - PAD_L, beamH);
                ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
                ctx.beginPath(); ctx.moveTo(msX, PAD_T - 4); ctx.lineTo(msX, H - PAD_B + 4); ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = '#d97706'; ctx.font = 'bold 10px ' + getComputedStyle(document.body).fontFamily;
                ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                ctx.fillText(formatNum(ms), (PAD_L + msX) / 2, beamY - 2);
            }
            if (me > 0) {
                var meX = toX(L - me);
                ctx.fillStyle = 'rgba(251,191,36,0.12)';
                ctx.fillRect(meX, beamY, PAD_L + drawW - meX, beamH);
                ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
                ctx.beginPath(); ctx.moveTo(meX, PAD_T - 4); ctx.lineTo(meX, H - PAD_B + 4); ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = '#d97706'; ctx.font = 'bold 10px ' + getComputedStyle(document.body).fontFamily;
                ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                ctx.fillText(formatNum(me), (meX + PAD_L + drawW) / 2, beamY - 2);
            }

            // Serie — każda nad/pod osią na przemian
            var DOT_R = 11;
            allSeries.forEach(function(series, si) {
                var color = COLORS[si % COLORS.length];
                var above = si % 2 === 0;
                var rowOffset = above ? -(DOT_R + beamH / 2 + 10) : (DOT_R + beamH / 2 + 10);
                var pts = series.points;

                // Linie odstępów między sąsiednimi punktami (pod/nad belką)
                if (pts.length > 1) {
                    var spacingY = axisY + rowOffset + (above ? -DOT_R - 8 : DOT_R + 8);
                    for (var pi = 0; pi < pts.length - 1; pi++) {
                        var x1 = toX(pts[pi].x !== undefined ? pts[pi].x : pts[pi]);
                        var x2 = toX(pts[pi + 1].x !== undefined ? pts[pi + 1].x : pts[pi + 1]);
                        var gap = (pts[pi + 1].x !== undefined ? pts[pi + 1].x : pts[pi + 1]) -
                                  (pts[pi].x !== undefined ? pts[pi].x : pts[pi]);
                        var midX = (x1 + x2) / 2;

                        // Linia z grotikami
                        ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.setLineDash([]);
                        ctx.beginPath(); ctx.moveTo(x1 + 2, spacingY); ctx.lineTo(x2 - 2, spacingY); ctx.stroke();
                        // Małe grotki
                        ctx.fillStyle = color;
                        ctx.beginPath(); ctx.moveTo(x1 + 2, spacingY); ctx.lineTo(x1 + 7, spacingY - 3); ctx.lineTo(x1 + 7, spacingY + 3); ctx.closePath(); ctx.fill();
                        ctx.beginPath(); ctx.moveTo(x2 - 2, spacingY); ctx.lineTo(x2 - 7, spacingY - 3); ctx.lineTo(x2 - 7, spacingY + 3); ctx.closePath(); ctx.fill();
                        // Etykieta odstępu
                        ctx.fillStyle = color;
                        ctx.font = '600 9px ' + getComputedStyle(document.body).fontFamily;
                        ctx.textAlign = 'center'; ctx.textBaseline = above ? 'bottom' : 'top';
                        ctx.fillText(formatNum(gap), midX, spacingY + (above ? -2 : 2));
                    }
                }

                // Pionowe kreski na belkę + numerowane kółka
                pts.forEach(function(pt, pi) {
                    var px = toX(pt.x !== undefined ? pt.x : pt);
                    var cy = axisY + rowOffset;

                    // Pionowa kreska łącząca kółko z belką
                    ctx.strokeStyle = color + '88'; ctx.lineWidth = 1.5; ctx.setLineDash([]);
                    ctx.beginPath();
                    ctx.moveTo(px, above ? cy + DOT_R : cy - DOT_R);
                    ctx.lineTo(px, above ? axisY - beamH / 2 : axisY + beamH / 2);
                    ctx.stroke();

                    // Wypełnione kółko z numerem
                    ctx.beginPath();
                    ctx.arc(px, cy, DOT_R, 0, Math.PI * 2);
                    ctx.fillStyle = color;
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
                    ctx.stroke();

                    // Numer wewnątrz kółka
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold ' + (DOT_R > 9 ? '11' : '9') + 'px ' + getComputedStyle(document.body).fontFamily;
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(pi + 1, px, cy);

                    // Wartość pozycji pod/nad kółkiem
                    ctx.fillStyle = '#0f172a';
                    ctx.font = '600 10px ' + getComputedStyle(document.body).fontFamily;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = above ? 'bottom' : 'top';
                    ctx.fillText(formatNum(pt.x !== undefined ? pt.x : pt) + ' ' + unit,
                        px, cy + (above ? -DOT_R - 3 : DOT_R + 3));
                });

                // Legenda — kolorowy punkt + nazwa serii
                var legendX = PAD_L + si * 110;
                ctx.beginPath(); ctx.arc(legendX + 6, 16, 5, 0, Math.PI * 2);
                ctx.fillStyle = color; ctx.fill();
                ctx.fillStyle = '#1e293b'; ctx.font = '600 11px ' + getComputedStyle(document.body).fontFamily;
                ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                ctx.fillText(series.label || ('Seria ' + (si + 1)), legendX + 14, 16);
            });

            // Wymiar całkowitej długości — strzałka na górze
            var dimY = PAD_T - 22;
            ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.setLineDash([]);
            ctx.beginPath(); ctx.moveTo(PAD_L, dimY); ctx.lineTo(PAD_L + drawW, dimY); ctx.stroke();
            drawArrow(ctx, PAD_L, dimY, 'left');
            drawArrow(ctx, PAD_L + drawW, dimY, 'right');
            ctx.fillStyle = '#0f172a'; ctx.font = 'bold 12px ' + getComputedStyle(document.body).fontFamily;
            ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
            ctx.fillText(formatNum(L) + ' ' + unit, PAD_L + drawW / 2, dimY - 3);
        }

        function drawEngineeringCanvas(totalLength, marginStart, marginEnd, positions, count, step, origin, _canvas, _ctx) {
            var ctx = _ctx || graphCtx;
            var w = (_canvas || graphCanvas).width;
            var h = (_canvas || graphCanvas).height;
            ctx.clearRect(0, 0, w, h);

            var isHorizontal = STATE.eng.axis === 'X';
            var unit = getUnitLabel();
            origin = origin || 0;

            // [EN] Layout constants
            var boardColor = '#e8d5b7';
            var boardStroke = '#b8956a';
            var holeColor = '#dc2626';
            var holeStroke = '#991b1b';
            var dimColor = '#475569';
            var labelColor = '#0f172a';
            var marginColor = 'rgba(100, 116, 139, 0.3)';

            if (isHorizontal) {
                // ================================================================
                // [EN] HORIZONTAL LAYOUT
                // ================================================================
                var boardLeft = 110;
                var boardRight = w - 50;
                var boardWidth = boardRight - boardLeft;
                var boardThickness = 70;
                var boardTop = h / 2 - boardThickness / 2;
                var boardBottom = boardTop + boardThickness;
                var boardMidY = h / 2;

                // [EN] Board shadow
                ctx.fillStyle = 'rgba(0,0,0,0.06)';
                ctx.beginPath();
                ctx.roundRect(boardLeft + 3, boardTop + 3, boardWidth, boardThickness, 6);
                ctx.fill();

                // [EN] Board body
                ctx.fillStyle = boardColor;
                ctx.strokeStyle = boardStroke;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(boardLeft, boardTop, boardWidth, boardThickness, 6);
                ctx.fill();
                ctx.stroke();

                // [EN] Wood grain lines (subtle)
                ctx.strokeStyle = 'rgba(184, 149, 106, 0.25)';
                ctx.lineWidth = 0.5;
                for (var gy = boardTop + 8; gy < boardBottom; gy += 7) {
                    ctx.beginPath();
                    ctx.moveTo(boardLeft + 4, gy);
                    ctx.lineTo(boardRight - 4, gy + ((Math.sin(gy * 0.3) * 2)));
                    ctx.stroke();
                }

                // [EN] Margin shading
                if (marginStart > 0) {
                    var msX = boardLeft + (marginStart / totalLength) * boardWidth;
                    ctx.fillStyle = marginColor;
                    ctx.fillRect(boardLeft, boardTop, msX - boardLeft, boardThickness);
                    // [EN] Margin label
                    ctx.fillStyle = dimColor;
                    ctx.font = '600 11px ' + getComputedStyle(document.body).fontFamily;
                    ctx.textAlign = 'center';
                    ctx.fillText(formatNum(marginStart) + ' ' + unit, boardLeft + (msX - boardLeft) / 2, boardTop - 10);
                    // [EN] Dashed line at margin end
                    ctx.setLineDash([4, 3]);
                    ctx.strokeStyle = '#94a3b8';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(msX, boardTop - 15);
                    ctx.lineTo(msX, boardBottom + 15);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
                if (marginEnd > 0) {
                    var meX = boardRight - (marginEnd / totalLength) * boardWidth;
                    ctx.fillStyle = marginColor;
                    ctx.fillRect(meX, boardTop, boardRight - meX, boardThickness);
                    ctx.fillStyle = dimColor;
                    ctx.font = '600 11px ' + getComputedStyle(document.body).fontFamily;
                    ctx.textAlign = 'center';
                    ctx.fillText(formatNum(marginEnd) + ' ' + unit, meX + (boardRight - meX) / 2, boardTop - 10);
                    ctx.setLineDash([4, 3]);
                    ctx.strokeStyle = '#94a3b8';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(meX, boardTop - 15);
                    ctx.lineTo(meX, boardBottom + 15);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                // [EN] Dimension line above board
                ctx.strokeStyle = dimColor;
                ctx.lineWidth = 1;
                ctx.setLineDash([]);
                var dimY = boardTop - 30;
                ctx.beginPath();
                ctx.moveTo(boardLeft, dimY);
                ctx.lineTo(boardRight, dimY);
                ctx.stroke();
                // [EN] Arrows
                drawArrow(ctx, boardLeft, dimY, 'left');
                drawArrow(ctx, boardRight, dimY, 'right');
                // [EN] Total length label above dimension line
                ctx.fillStyle = labelColor;
                ctx.font = '700 12px ' + getComputedStyle(document.body).fontFamily;
                ctx.textAlign = 'center';
                ctx.fillText(formatNum(totalLength) + ' ' + unit, (boardLeft + boardRight) / 2, dimY - 10);

                // [EN] Draw holes with smart labels
                var labelRows = [
                    boardTop - 50, // Row 1 (further above)
                    boardTop - 68, // Row 2 (even further)
                ];
                var prevLabelEnd = [boardLeft - 999, boardLeft - 999]; // [EN] Track where last label in each row ends

                positions.forEach(function(pos, idx) {
                    var localPos = pos - origin;
                    var x = boardLeft + (localPos / totalLength) * boardWidth;

                    // [EN] Dashed alignment line from hole to top
                    ctx.setLineDash([2, 4]);
                    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(x, boardMidY);
                    ctx.lineTo(x, boardTop - 20);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // [EN] Hole
                    var holeRadius = 7;
                    ctx.fillStyle = holeColor;
                    ctx.strokeStyle = holeStroke;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(x, boardMidY, holeRadius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    // [EN] Hole center dot
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(x, boardMidY, 1.5, 0, Math.PI * 2);
                    ctx.fill();

                    // [EN] Label text
                    var labelText = formatNum(pos);
                    ctx.font = '600 11px ' + getComputedStyle(document.body).fontFamily;
                    var textWidth = ctx.measureText(labelText + ' ' + unit).width + 8;

                    // [EN] Pick best row to avoid overlap
                    var rowIdx = 0;
                    if (x - textWidth / 2 < prevLabelEnd[0] + 4) {
                        rowIdx = 1;
                        if (x - textWidth / 2 < prevLabelEnd[1] + 4) {
                            rowIdx = 0; // [EN] Fallback — slight overlap is acceptable
                        }
                    }

                    var labelY = labelRows[rowIdx];
                    prevLabelEnd[rowIdx] = x + textWidth / 2;

                    // [EN] Label background (semi-transparent for readability)
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                    ctx.fillRect(x - textWidth / 2 - 2, labelY - 10, textWidth + 4, 16);
                    ctx.fillStyle = labelColor;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(labelText + ' ' + unit, x, labelY - 2);

                    // [EN] Small tick on dimension line
                    ctx.strokeStyle = dimColor;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x, dimY - 4);
                    ctx.lineTo(x, dimY + 4);
                    ctx.stroke();
                });

            } else {
                // ================================================================
                // [EN] VERTICAL LAYOUT
                // ================================================================
                var boardTopV = 55;
                var boardBottomV = h - 30;
                var boardHeightV = boardBottomV - boardTopV;
                var boardThicknessV = 70;
                var boardLeftV = w / 2 - boardThicknessV / 2;
                var boardRightV = boardLeftV + boardThicknessV;
                var boardMidX = w / 2;

                // [EN] Board shadow
                ctx.fillStyle = 'rgba(0,0,0,0.06)';
                ctx.beginPath();
                ctx.roundRect(boardLeftV + 3, boardTopV + 3, boardThicknessV, boardHeightV, 6);
                ctx.fill();

                // [EN] Board body
                ctx.fillStyle = boardColor;
                ctx.strokeStyle = boardStroke;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(boardLeftV, boardTopV, boardThicknessV, boardHeightV, 6);
                ctx.fill();
                ctx.stroke();

                // [EN] Wood grain (vertical)
                ctx.strokeStyle = 'rgba(184, 149, 106, 0.25)';
                ctx.lineWidth = 0.5;
                for (var gx = boardLeftV + 8; gx < boardRightV; gx += 7) {
                    ctx.beginPath();
                    ctx.moveTo(gx, boardTopV + 4);
                    ctx.lineTo(gx + ((Math.sin(gx * 0.3) * 2)), boardBottomV - 4);
                    ctx.stroke();
                }

                // [EN] Margin shading
                if (marginStart > 0) {
                    var msY = boardTopV + (marginStart / totalLength) * boardHeightV;
                    ctx.fillStyle = marginColor;
                    ctx.fillRect(boardLeftV, boardTopV, boardThicknessV, msY - boardTopV);
                    ctx.fillStyle = dimColor;
                    ctx.font = '600 11px ' + getComputedStyle(document.body).fontFamily;
                    ctx.textAlign = 'right';
                    ctx.fillText(formatNum(marginStart) + ' ' + unit, boardLeftV - 12, boardTopV + (msY - boardTopV) / 2 + 4);
                    ctx.setLineDash([4, 3]);
                    ctx.strokeStyle = '#94a3b8';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(boardLeftV - 18, msY);
                    ctx.lineTo(boardRightV + 18, msY);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
                if (marginEnd > 0) {
                    var meY = boardBottomV - (marginEnd / totalLength) * boardHeightV;
                    ctx.fillStyle = marginColor;
                    ctx.fillRect(boardLeftV, meY, boardThicknessV, boardBottomV - meY);
                    ctx.fillStyle = dimColor;
                    ctx.font = '600 11px ' + getComputedStyle(document.body).fontFamily;
                    ctx.textAlign = 'right';
                    ctx.fillText(formatNum(marginEnd) + ' ' + unit, boardLeftV - 12, meY + (boardBottomV - meY) / 2 + 4);
                    ctx.setLineDash([4, 3]);
                    ctx.strokeStyle = '#94a3b8';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(boardLeftV - 18, meY);
                    ctx.lineTo(boardRightV + 18, meY);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                // [EN] Dimension line to the right
                var dimX = boardRightV + 35;
                ctx.strokeStyle = dimColor;
                ctx.lineWidth = 1;
                ctx.setLineDash([]);
                ctx.beginPath();
                ctx.moveTo(dimX, boardTopV);
                ctx.lineTo(dimX, boardBottomV);
                ctx.stroke();
                drawArrow(ctx, dimX, boardTopV, 'up');
                drawArrow(ctx, dimX, boardBottomV, 'down');
                // [EN] Total length label
                ctx.save();
                ctx.fillStyle = labelColor;
                ctx.font = '700 12px ' + getComputedStyle(document.body).fontFamily;
                ctx.textAlign = 'left';
                ctx.translate(dimX + 12, (boardTopV + boardBottomV) / 2);
                ctx.rotate(0);
                ctx.fillText(formatNum(totalLength) + ' ' + unit, 0, 4);
                ctx.restore();

                // [EN] Draw holes with smart labels
                var labelColsX = [
                    boardRightV + 55, // Col 1
                    boardRightV + 78, // Col 2
                ];
                var prevLabelBottom = [-999, -999];

                positions.forEach(function(pos, idx) {
                    var localPosV = pos - origin;
                    var y = boardTopV + (localPosV / totalLength) * boardHeightV;

                    // [EN] Dashed alignment line
                    ctx.setLineDash([2, 4]);
                    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(boardMidX, y);
                    ctx.lineTo(boardRightV + 20, y);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // [EN] Hole
                    var holeRadius = 7;
                    ctx.fillStyle = holeColor;
                    ctx.strokeStyle = holeStroke;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(boardMidX, y, holeRadius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(boardMidX, y, 1.5, 0, Math.PI * 2);
                    ctx.fill();

                    // [EN] Label
                    var labelText = formatNum(pos);
                    ctx.font = '600 11px ' + getComputedStyle(document.body).fontFamily;
                    var textHeight = 14;
                    var labelYCenter = y;

                    var colIdx = 0;
                    if (labelYCenter - textHeight / 2 < prevLabelBottom[0] + 4) {
                        colIdx = 1;
                        if (labelYCenter - textHeight / 2 < prevLabelBottom[1] + 4) {
                            colIdx = 0;
                        }
                    }

                    var labelX = labelColsX[colIdx];
                    prevLabelBottom[colIdx] = labelYCenter + textHeight / 2;

                    // [EN] Connector line from hole to label
                    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(boardRightV + 20, y);
                    ctx.lineTo(labelX - 4, y);
                    ctx.stroke();

                    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                    ctx.fillRect(labelX - 4, labelYCenter - 8, ctx.measureText(labelText + ' ' + unit).width + 10, 16);
                    ctx.fillStyle = labelColor;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(labelText + ' ' + unit, labelX + 1, labelYCenter);
                });
            }
        }

        /* [EN] Helper: draw small arrowheads */
        function drawArrow(ctx, x, y, direction) {
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            var s = 5;
            switch (direction) {
                case 'left':
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + s, y - s / 2);
                    ctx.lineTo(x + s, y + s / 2);
                    break;
                case 'right':
                    ctx.moveTo(x, y);
                    ctx.lineTo(x - s, y - s / 2);
                    ctx.lineTo(x - s, y + s / 2);
                    break;
                case 'up':
                    ctx.moveTo(x, y);
                    ctx.lineTo(x - s / 2, y + s);
                    ctx.lineTo(x + s / 2, y + s);
                    break;
                case 'down':
                    ctx.moveTo(x, y);
                    ctx.lineTo(x - s / 2, y - s);
                    ctx.lineTo(x + s / 2, y - s);
                    break;
            }
            ctx.closePath();
            ctx.fill();
        }

        /* [EN] Polyfill roundRect if not supported */
        if (!CanvasRenderingContext2D.prototype.roundRect) {
            CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
                if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
                this.beginPath();
                this.moveTo(x + r.tl, y);
                this.lineTo(x + w - r.tr, y);
                this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
                this.lineTo(x + w, y + h - r.br);
                this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
                this.lineTo(x + r.bl, y + h);
                this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
                this.lineTo(x, y + r.tl);
                this.quadraticCurveTo(x, y, x + r.tl, y);
                this.closePath();
            };
        }

        /* ============================================================
           [EN] Engineering — Event Binding
           ============================================================ */
        /* ============================================================
           Kreator — generuje komendę z formularza i uruchamia updateGraph
           ============================================================ */
        function updateKreatorModeUI() {
            var isFixed = STATE.eng.mode === 'fixed';
            if (fixedSpacingGroup) fixedSpacingGroup.classList.toggle('active', isFixed);
            if (engCount) engCount.disabled = isFixed;
        }

        /* Mini diagram — aktualizuje się natychmiast przy każdej zmianie pola */
        function updateKreatorPreview() {
            var preview = $('#kreatorPreview');
            var infoEl  = $('#kreatorPreviewInfo');
            if (!preview) return;

            var length  = parseFloat(normalizeNumberText(engLength  ? engLength.value  : '120')) || 120;
            var count   = parseInt(engCount ? engCount.value : '4', 10) || 4;
            var ms      = parseFloat(normalizeNumberText(engMarginStart ? engMarginStart.value : '0')) || 0;
            var me      = parseFloat(normalizeNumberText(engMarginEnd   ? engMarginEnd.value   : '0')) || 0;
            var spacingList = parseSpacingList(engSpacing ? engSpacing.value : '20');
            var spacingArg = spacingList.length ? (spacingList.length === 1 ? spacingList[0] : spacingList) : 20;
            var mode    = STATE.eng.mode || 'between';
            var unit    = STATE.eng.unit || 'cm';

            var placement = calculatePegPositions(length, count, ms, me, spacingArg, mode);
            preview.classList.toggle('kreator-preview--error', !!placement.error);

            while (preview.firstChild) preview.removeChild(preview.firstChild);

            if (placement.error || !placement.positions || !placement.positions.length) {
                if (infoEl) infoEl.textContent = '⚠️ Sprawdź wartości';
                return;
            }

            var positions = placement.positions;

            // Belka
            var beam = document.createElement('div');
            beam.className = 'kreator-preview-beam';
            preview.appendChild(beam);

            // Marginesy
            if (ms > 0) {
                var msEl = document.createElement('div');
                msEl.className = 'kreator-preview-margin';
                msEl.style.left  = '0';
                msEl.style.width = Math.min(100, (ms / length) * 100) + '%';
                preview.appendChild(msEl);
            }
            if (me > 0) {
                var meEl = document.createElement('div');
                meEl.className = 'kreator-preview-margin';
                meEl.style.right = '0';
                meEl.style.width = Math.min(100, (me / length) * 100) + '%';
                preview.appendChild(meEl);
            }

            // Kropki
            positions.forEach(function(pos) {
                var dot = document.createElement('div');
                dot.className = 'kreator-preview-dot';
                dot.style.left = Math.max(0, Math.min(100, (pos / length) * 100)) + '%';
                preview.appendChild(dot);
            });

            // Info: "4 punkty · co 30 cm"
            if (infoEl) {
                var n = positions.length;
                var step = placement.step;
                var stepStr = Array.isArray(step) ? step.map(function (s) { return formatNum(s); }).join('/') : formatNum(step);
                var nStr = n + (n === 1 ? ' punkt' : n < 5 ? ' punkty' : ' punktów');
                infoEl.textContent = nStr + '  ·  co ' + stepStr + ' ' + unit;
            }
        }

        function generateCommandFromForm() {
            var length  = parseFloat(normalizeNumberText(engLength  ? engLength.value  : '120')) || 120;
            var count   = parseInt(engCount ? engCount.value : '4', 10) || 4;
            var origin  = parseFloat(normalizeNumberText(engOrigin  ? engOrigin.value  : '0'))  || 0;
            var ms      = parseFloat(normalizeNumberText(engMarginStart ? engMarginStart.value : '0')) || 0;
            var me      = parseFloat(normalizeNumberText(engMarginEnd   ? engMarginEnd.value   : '0')) || 0;
            var spacingList = parseSpacingList(engSpacing ? engSpacing.value : '20');
            if (!spacingList.length) spacingList = [20];
            var axis    = STATE.eng.axis || 'X';
            var mode    = STATE.eng.mode || 'between';
            var unit    = STATE.eng.unit || 'cm';

            var axisKey = axis.toLowerCase() === 'y' ? 'y' : 'x';
            var parts = [axisKey + '=' + formatRawNum(length) + '/' + count];
            if (ms > 0 || me > 0) parts.push('m=' + formatRawNum(ms) + '/' + formatRawNum(me));
            if (origin !== 0) parts.push('origin=' + formatRawNum(origin));
            if (mode === 'edges') parts.push('@edges');
            else if (mode === 'fixed') parts.push('co=' + spacingList.map(function (s) { return formatRawNum(s); }).join(';'));
            parts.push('u=' + unit);

            var cmd = parts.join(' ,, ');
            if (graphCommand) {
                graphCommand.value = cmd;
                if (typeof updateGraphCmdBadge === 'function') updateGraphCmdBadge(cmd);
            }
            // [EN] Kreator żyje teraz w zakładce Warsztat — pokaż wynik na canvasie w Komendzie
            switchTab('komenda');
            updateGraph();
            // Przewiń do canvasu na mobile
            var canvas = $('#graphContainer');
            if (canvas) canvas.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Kreator: zmiany pól → tylko mini preview (NIE canvas główny)
        [engLength, engOrigin, engCount, engSpacing, engMarginStart, engMarginEnd].forEach(function(el) {
            if (el) el.addEventListener('input', updateKreatorPreview);
        });

        if (unitToggle) {
            unitToggle.addEventListener('click', function(e) {
                var btn = e.target.closest('.unit-btn');
                if (!btn) return;
                unitToggle.querySelectorAll('.unit-btn').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                STATE.eng.unit = btn.getAttribute('data-unit');
                updateKreatorPreview();
            });
        }

        if (axisToggle) {
            axisToggle.addEventListener('click', function(e) {
                var btn = e.target.closest('.axis-btn');
                if (!btn) return;
                axisToggle.querySelectorAll('.axis-btn').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                STATE.eng.axis = btn.getAttribute('data-axis');
                updateKreatorPreview();
            });
        }

        if (spacingModeToggle) {
            spacingModeToggle.addEventListener('click', function(e) {
                var btn = e.target.closest('.mode-btn');
                if (!btn) return;
                spacingModeToggle.querySelectorAll('.mode-btn').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                STATE.eng.mode = btn.getAttribute('data-mode');
                updateKreatorModeUI();
                updateKreatorPreview();
            });
        }

        // Przycisk "Wynik" → dopiero teraz aktualizuje główny canvas
        var kreatorApplyBtn = $('#kreatorApplyBtn');
        if (kreatorApplyBtn) {
            kreatorApplyBtn.addEventListener('click', generateCommandFromForm);
        }

        function openCommandHelp() {
            document.body.classList.add('help-open');
            if (commandHelpDrawer) commandHelpDrawer.setAttribute('aria-hidden', 'false');

            document.querySelectorAll('.help-section').forEach(function(section) {
                var type = section.getAttribute('data-help');
                var visible;
                if (activeCommandTarget === 'komenda') {
                    // Komenda tab: show engineering + graph sections
                    visible = (type === 'engineering' || type === 'graph');
                } else {
                    visible = (type === activeCommandTarget);
                }
                section.style.display = visible ? 'block' : 'none';
            });
        }

        function closeCommandHelp() {
            document.body.classList.remove('help-open');
            if (commandHelpDrawer) {
                // Blur focused element inside drawer before hiding — prevents aria-hidden warning
                var focused = commandHelpDrawer.querySelector(':focus');
                if (focused) focused.blur();
                commandHelpDrawer.setAttribute('aria-hidden', 'true');
            }
            if (helpSearch) {
                helpSearch.value = '';

                document.querySelectorAll('.help-section p').forEach(function(item) {
                    item.style.display = '';
                });
            }
        }

        function getParserCapabilities() {
            return {
                engineering: [
                    { syntax: 'x=120/4', command: 'x=120/4', description: 'podstawowy podzial osi X.', terms: ['x=120/4'] },
                    { syntax: 'y=120/4', command: 'y=120/4', description: 'podstawowy podzial osi Y.', terms: ['y=120/4'] },
                    { syntax: '120/4', command: '120/4', description: 'skrot bez nazwy osi.', terms: ['120/4'] },
                    { syntax: 'co=20 / step=20 / every=20 / odstep=20', command: 'x=120 | co=20', description: 'staly odstep.', terms: ['co=20', 'step=20', 'every=20', 'odstep=20'] },
                    { syntax: 'co=20;30', command: 'x=120 | co=20;30', description: 'naprzemienny odstep: 20, 30, 20, 30... (dowolnie wiele wartosci po ;).', terms: ['co=20;30', 'naprzemienny', 'alternating'] },
                    { syntax: '@every:20', command: 'x=120 | @every:20', description: 'staly odstep z prefiksem @.', terms: ['@every:20'] },
                    { syntax: '@between / @inside / @pole / @center / @srodek', command: 'x=120/4 | @inside', description: 'punkty wewnatrz pola.', terms: ['@between', '@inside', '@pole', '@center', '@srodek'] },
                    { syntax: '@edges / @krance / @krawedzie', command: 'x=120/4 | @edges', description: 'punkty na krancach.', terms: ['@edges', '@krance', '@krawedzie'] },
                    { syntax: 'm=10/20 / margin=10/20 / margines=10/20', command: 'x=120/4 | m=10/20', description: 'margines start/koniec.', terms: ['m=10/20', 'margin=10/20', 'margines=10/20'] },
                    { syntax: '<-10 / ->20', command: 'x=120/4 | <-10 | ->20', description: 'marginesy strzalkami.', terms: ['<-10', '->20'] },
                    { syntax: 'ms=10 / start=10 / left=10 / dol=10', command: 'x=120/4 | dol=10', description: 'margines poczatkowy.', terms: ['ms=10', 'start=10', 'left=10', 'dol=10'] },
                    { syntax: 'me=20 / end=20 / right=20 / gora=20', command: 'x=120/4 | gora=20', description: 'margines koncowy.', terms: ['me=20', 'end=20', 'right=20', 'gora=20'] },
                    { syntax: 'origin=50 / zero=50 / offset=50 / od=50', command: 'x=120/4 | od=50', description: 'przesuniecie poczatku osi.', terms: ['origin=50', 'zero=50', 'offset=50', 'od=50'] },
                    { syntax: 'axis=x / os=y', command: '120/4 | os=y', description: 'jawny wybor osi.', terms: ['axis=x', 'os=y'] },
                    { syntax: 'x=30 / y=-2', command: 'y=120/4 | x=30', description: 'przesuniecie serii na drugiej osi.', terms: ['x=30', 'y=-2'] },
                    { syntax: 'r=5 / dia=5 / fi=5 / ø=5', command: 'x=120/4 | fi=5', description: 'promien punktu.', terms: ['r=5', 'dia=5', 'fi=5', 'ø=5'] },
                    { syntax: 'u=mm / unit=mm / jednostka=mm', command: 'x=120/4 | jednostka=mm', description: 'jednostka wyniku.', terms: ['u=mm', 'unit=mm', 'jednostka=mm'] },
                    { syntax: 'label=A / opis=A / nazwa=A', command: 'x=120/4 | nazwa=A', description: 'nazwa serii.', terms: ['label=a', 'opis=a', 'nazwa=a'] },
                    { syntax: ';;', command: 'x=120/4 ;; x=120/6 | y=30', description: 'wiele serii.', terms: [';;'] },
                ],
                graph: [
                    { syntax: 'f(x)=x / y=x', command: 'f(x)=x', description: 'funkcja matematyczna.', terms: ['f(x)=x', 'y=x'] },
                    { syntax: 'sin cos tan sqrt abs log ln exp floor ceil round', command: 'f(x)=sqrt(abs(x))', description: 'obslugiwane funkcje w wykresach.', terms: ['sin', 'cos', 'tan', 'sqrt', 'abs', 'log', 'ln', 'exp', 'floor', 'ceil', 'round'] },
                    { syntax: 'pi / π / e', command: 'f(x)=sin(pi*x)', description: 'stale matematyczne.', terms: ['pi', 'π', 'e'] },
                    { syntax: 'podziel 120 na 4', command: 'podziel 120 na 4', description: 'naturalny zapis podzialu.', terms: ['podziel 120 na 4'] },
                    { syntax: 'od 0 do 120 co 20', command: 'od 0 do 120 co 20', description: 'naturalny zapis stalego odstepu.', terms: ['od 0 do 120 co 20'] },
                    { syntax: 'punkt=150,200 / p=150,200', command: 'p=150,200 | label=A', description: 'punkt 2D.', terms: ['punkt=150,200', 'p=150,200'] },
                    { syntax: 'rect=400x300 / prostokat=400x300', command: 'prostokat=400x300', description: 'prostokat 2D.', terms: ['rect=400x300', 'prostokat=400x300'] },
                    { syntax: 'ox=50 / oy=50 / x0=50 / y0=50 / od_x=50 / od_y=50', command: 'rect=400x300 | x0=50 | y0=50', description: 'przesuniecie geometrii.', terms: ['ox=50', 'oy=50', 'x0=50', 'y0=50', 'od_x=50', 'od_y=50'] },
                    { syntax: 'siatka=400x300 / grid=400x300', command: 'grid=400x300 | co=100x100', description: 'siatka punktow.', terms: ['siatka=400x300', 'grid=400x300'] },
                    { syntax: 'co=100x100 / krok=100x100 / co_x=100x100', command: 'siatka=400x300 | krok=100x100', description: 'odstep siatki.', terms: ['co=100x100', 'krok=100x100', 'co_x=100x100'] },
                    { syntax: ';;', command: 'f(x)=sin(x) ;; punkt=0,0', description: 'wiele serii na wykresie.', terms: [';;'] },
                ],
            };
        }

        function normalizeHelpText(text) {
            return String(text || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function definitionSearchText(groups) {
            var chunks = [];
            (groups || []).forEach(function(group) {
                (group.items || []).forEach(function(item) {
                    chunks.push(item.syntax || '', item.command || '', item.description || '');
                });
            });
            return normalizeHelpText(chunks.join(' | '));
        }

        function getMissingHelpCapabilities(target) {
            var definitions = window.MATM0_COMMAND_DEFINITIONS || {};
            var capabilities = getParserCapabilities()[target] || [];
            var text = definitionSearchText(definitions[target] || []);
            return capabilities.filter(function(capability) {
                var terms = capability.terms || [capability.syntax];
                return terms.some(function(term) {
                    return text.indexOf(normalizeHelpText(term)) === -1;
                });
            });
        }

        function createHelpCommandRow(item) {
            var row = document.createElement('p');
            if (item.command) {
                row.className = 'help-command';
                row.setAttribute('data-command', expandTokens(item.command));
                row.title = 'Kliknij, aby wstawić komendę';
            }

            var code = document.createElement('code');
            code.textContent = expandTokens(item.syntax || item.command || '');
            row.appendChild(code);

            if (item.description) {
                row.appendChild(document.createTextNode(' ' + item.description));
            }
            return row;
        }

        function renderCommandHelpDefinitions() {
            var definitions = window.MATM0_COMMAND_DEFINITIONS;
            if (!definitions) return;

            var allMissing = [];
            var lastSection = null;

            ['engineering', 'graph'].forEach(function(helpType) {
                var helpSection = document.querySelector('.help-section[data-help="' + helpType + '"]');
                var groups = definitions[helpType];
                if (!helpSection || !Array.isArray(groups)) return;

                helpSection.replaceChildren();
                groups.forEach(function(group) {
                    var section = document.createElement('section');
                    var title = document.createElement('h4');
                    title.textContent = group.title;
                    section.appendChild(title);
                    (group.items || []).forEach(function(item) {
                        section.appendChild(createHelpCommandRow(item));
                    });
                    helpSection.appendChild(section);
                });

                // Collect all missing capabilities — render ONE combined section at the end
                var missing = getMissingHelpCapabilities(helpType);
                allMissing = allMissing.concat(missing);
                lastSection = helpSection;
            });

            if (allMissing.length && lastSection) {
                var missingSection = document.createElement('section');
                missingSection.className = 'parser-gap-section';
                var missingTitle = document.createElement('h4');
                missingTitle.textContent = 'Parser umie więcej';
                missingSection.appendChild(missingTitle);
                var intro = document.createElement('p');
                intro.className = 'parser-gap-note';
                intro.textContent = 'Wpisy wykryte przez parser, nieujęte jeszcze w głównej ściądze. Lista pomocnicza — nie ograniczenie silnika.';
                missingSection.appendChild(intro);
                allMissing.forEach(function(item) {
                    missingSection.appendChild(createHelpCommandRow(item));
                });
                lastSection.appendChild(missingSection);
            }
        }

        function escapeRegExp(text) {
            return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        /* ============================================================
           [EN] Help System
        ============================================================ */

        function initHelpSystem() {
            renderCommandHelpDefinitions();

            /* ---- Cache original help HTML for safe highlighting ---- */
            document.querySelectorAll('.help-section p').forEach(function(item) {

                item.dataset.originalHtml = item.innerHTML;

            });

            /* ============================================================
               [EN] Help Search
            ============================================================ */

            if (helpSearch) {

                helpSearch.addEventListener('input', function() {

                    var query = helpSearch.value
                        .trim()
                        .toLowerCase();

                    document.querySelectorAll('.help-section p').forEach(function(item) {

                        var originalHtml = item.dataset.originalHtml || item.innerHTML;

                        var originalText = item.textContent;

                        var text = originalText.toLowerCase();

                        var match = text.includes(query);

                        item.style.display =
                            match
                                ? ''
                                : 'none';

                        if (!query) {

                            item.innerHTML = originalHtml;

                            return;

                        }

                        if (match) {

                            var regex = new RegExp('(' + escapeRegExp(query) + ')', 'gi');

                            item.innerHTML =
                                originalHtml.replace(
                                    regex,
                                    '<span class="help-highlight">$1</span>'
                                );

                        }

                    });

                });

            }

            /* ============================================================
               [EN] Help Drawer Open / Close
            ============================================================ */

            if (commandHelpOpen) {
                commandHelpOpen.addEventListener('click', function() {

                    activeCommandTarget = 'engineering';

                    openCommandHelp();

                });
            }

            var calcHelpOpen = $('#calcHelpOpen');
            if (calcHelpOpen) {
                calcHelpOpen.addEventListener('click', function() {
                    activeCommandTarget = 'calculator';
                    openCommandHelp();
                });
            }

            // Calculator example chips → fill calcExpr and evaluate
            document.querySelectorAll('.calc-example-chip').forEach(function(chip) {
                chip.addEventListener('click', function() {
                    var expr = chip.getAttribute('data-expr') || '';
                    if (!expr) return;
                    calcExpr.value = expr;
                    calcExpr.setSelectionRange(expr.length, expr.length);
                    liveEval();
                    calcExpr.focus();
                });
            });

            var graphCommandHelpOpen = $('#graphCommandHelpOpen');

            if (graphCommandHelpOpen) {
                graphCommandHelpOpen.addEventListener('click', function() {
                    activeCommandTarget = 'komenda';
                    openCommandHelp();
                });
            }

            if (commandHelpClose) {
                commandHelpClose.addEventListener('click', closeCommandHelp);
            }

            if (commandHelpBackdrop) {
                commandHelpBackdrop.addEventListener('click', closeCommandHelp);
            }

            /* ============================================================
               [EN] Command Help — Click To Apply
            ============================================================ */

            document.querySelectorAll('.help-command').forEach(function(item) {

                item.addEventListener('click', function() {

                    var command = item.getAttribute('data-command');

                    if (!command) return;

                    if (activeCommandTarget === 'komenda' || activeCommandTarget === 'graph') {

                        graphCommand.value = command;
                        if (typeof updateGraphCmdBadge === 'function') updateGraphCmdBadge(command);
                        updateGraph();

                    } else if (activeCommandTarget === 'calculator') {

                        calcExpr.value = command;
                        calcExpr.setSelectionRange(command.length, command.length);
                        liveEval();
                        switchTab('calculator');

                    }

                    closeCommandHelp();

                    showToast('⚡ Wstawiono', 'success');

                });

            });

        }

        initHelpSystem();
        var graphCmdModeLabel = graphCmdModeBadge ? graphCmdModeBadge.querySelector('.mode-label') : null;

        function graphModeLabelFromParsed(parsed) {
            if (!parsed || !parsed.length) return 'Tryb: pusty';
            if (parsed.length > 1) return 'Tryb: wieloseria ' + parsed.length + '×';
            switch (parsed[0].type) {
                case 'geometry': return 'Tryb: geometria 2D';
                case 'division': return 'Tryb: podział osi';
                default: return 'Tryb: funkcja';
            }
        }

        function updateGraphCmdBadge(raw) {
            var active = false;
            var label = 'Tryb: pusty';
            if (raw.length > 0) {
                try {
                    var parsed = parseCommandSeries(raw);
                    active = parsed.length > 0;
                    label = graphModeLabelFromParsed(parsed);
                } catch(e) {
                    active = false;
                    label = 'Tryb: komenda niekompletna…';
                }
            }
            graphCommand.classList.toggle('cmd-active', active);
            if (graphCmdModeBadge) graphCmdModeBadge.classList.toggle('cmd-active', active);
            if (graphCmdModeLabel) graphCmdModeLabel.textContent = label;
        }

        graphCommand.addEventListener('input', function() { updateGraphCmdBadge(graphCommand.value.trim()); });
        graphCommand.addEventListener('change', function() { updateGraphCmdBadge(graphCommand.value.trim()); });

        /* [EN] Sign toggle buttons for margin inputs */
        document.addEventListener('click', function(e) {
            var btn = e.target.closest('.sign-toggle');
            if (!btn) return;
            var targetId = btn.getAttribute('data-target');
            var input = document.getElementById(targetId);
            if (!input) return;
            /* [EN] Toggle sign: tap ± to quickly swap between positive and negative */
            var raw = input.value.trim();
            if (raw === '' || raw === '-') {
                input.value = '0';
            } else if (raw.charAt(0) === '-') {
                input.value = raw.slice(1);
            } else {
                input.value = '-' + raw;
            }
            /* [EN] Trigger input event so updateEngineering() fires */
            input.dispatchEvent(new Event('input', { bubbles: true }));
            /* [EN] Refocus the input so user can keep typing */
            input.focus();
        });

        /* ============================================================
           [EN] GRAPH MODULE — functions, commands, and easy X division
           ============================================================ */
        function parseGraphNumber(value, fallback) {
            var n = parseFloat(normalizeNumberText(value));
            return isFinite(n) ? n : fallback;
        }

        function stripFunctionPrefix(raw) {
            return String(raw || '')
                .trim()
                .replace(/^f\s*\(\s*x\s*\)\s*=/i, '')
                .replace(/^y\s*=/i, '');
        }

        function insertImplicitMultiplication(expr) {
            var names = '(x|pi|e|sin|cos|tan|sqrt|abs|log|ln|exp|floor|ceil|round)';
            expr = expr.replace(new RegExp('(\\d|\\)|x|pi|e)(?=' + names + '|\\()', 'g'), '$1*');
            expr = expr.replace(new RegExp('(\\))(?=(\\d|' + names + '))', 'g'), '$1*');
            return expr;
        }

        function compileGraphExpression(raw) {
            var expr = stripFunctionPrefix(raw).toLowerCase();
            expr = expr.replace(/π/g, 'pi');
            expr = expr.replace(/(\d),(\d)/g, '$1.$2');
            expr = expr.replace(/\s+/g, '');
            expr = insertImplicitMultiplication(expr);

            var allowedNames = {
                x: true,
                pi: true,
                e: true,
                sin: true,
                cos: true,
                tan: true,
                sqrt: true,
                abs: true,
                log: true,
                ln: true,
                exp: true,
                floor: true,
                ceil: true,
                round: true,
            };

            var names = expr.match(/[a-z]+/g) || [];
            for (var i = 0; i < names.length; i++) {
                if (!Object.prototype.hasOwnProperty.call(allowedNames, names[i])) {
                    throw new Error('Nieznana nazwa: ' + names[i]);
                }
            }

            if (!/^[0-9a-z+\-*/^().]+$/.test(expr)) {
                throw new Error('Użyj tylko liczb, x, nawiasów, operatorów i prostych funkcji.');
            }

            var tokens = tokenizeExpression(expr);
            var pos = 0;

            function tokenizeExpression(input) {
                var t = [];
                var idx = 0;
                while (idx < input.length) {
                    var ch = input[idx];
                    if (/\s/.test(ch)) {
                        idx++;
                        continue;
                    }
                    if (/[0-9.]/.test(ch)) {
                        var match = input.slice(idx).match(/^[0-9]*\.?[0-9]+/);
                        if (!match) throw new Error('Nieprawidłowa liczba w wyrażeniu.');
                        t.push({ type: 'number', value: parseFloat(match[0]) });
                        idx += match[0].length;
                        continue;
                    }
                    if (/[a-z]/.test(ch)) {
                        var match = input.slice(idx).match(/^[a-z]+/);
                        t.push({ type: 'name', value: match[0] });
                        idx += match[0].length;
                        continue;
                    }
                    if ('+-*/^()'.indexOf(ch) !== -1) {
                        t.push({ type: ch === '(' || ch === ')' ? 'paren' : 'operator', value: ch });
                        idx++;
                        continue;
                    }
                    throw new Error('Nieprawidłowy znak: ' + ch);
                }
                return t;
            }

            function peek() {
                return tokens[pos];
            }

            function consume() {
                return tokens[pos++];
            }

            function parseExpression() {
                var value = parseTerm();
                while (peek() && peek().type === 'operator' && (peek().value === '+' || peek().value === '-')) {
                    var op = consume().value;
                    var rhs = parseTerm();
                    value = op === '+' ? value + rhs : value - rhs;
                }
                return value;
            }

            function parseTerm() {
                var value = parseFactor();
                while (peek() && peek().type === 'operator' && (peek().value === '*' || peek().value === '/')) {
                    var op = consume().value;
                    var rhs = parseFactor();
                    value = op === '*' ? value * rhs : value / rhs;
                }
                return value;
            }

            function parseFactor() {
                var value = parseUnary();
                while (peek() && peek().type === 'operator' && peek().value === '^') {
                    consume();
                    var rhs = parseFactor();
                    value = Math.pow(value, rhs);
                }
                return value;
            }

            function parseUnary() {
                if (peek() && peek().type === 'operator' && (peek().value === '+' || peek().value === '-')) {
                    var op = consume().value;
                    var value = parseUnary();
                    return op === '-' ? -value : value;
                }
                return parsePrimary();
            }

            function parsePrimary() {
                var token = peek();
                if (!token) {
                    throw new Error('Nieprawidłowe wyrażenie.');
                }
                if (token.type === 'number') {
                    consume();
                    return token.value;
                }
                if (token.type === 'name') {
                    consume();
                    if (token.value === 'x') {
                        return currentX;
                    }
                    if (token.value === 'pi') {
                        return Math.PI;
                    }
                    if (token.value === 'e') {
                        return Math.E;
                    }
                    if (peek() && peek().type === 'paren' && peek().value === '(') {
                        consume();
                        var arg = parseExpression();
                        if (!peek() || peek().type !== 'paren' || peek().value !== ')') {
                            throw new Error('Brak nawiasu kończącego.');
                        }
                        consume();
                        return evaluateFunction(token.value, arg);
                    }
                    throw new Error('Funkcja ' + token.value + ' wymaga nawiasów.');
                }
                if (token.type === 'paren' && token.value === '(') {
                    consume();
                    var value = parseExpression();
                    if (!peek() || peek().type !== 'paren' || peek().value !== ')') {
                        throw new Error('Brak nawiasu kończącego.');
                    }
                    consume();
                    return value;
                }
                throw new Error('Nieprawidłowe wyrażenie.');
            }

            function evaluateFunction(name, arg) {
                switch (name) {
                    case 'sin': return Math.sin(arg);
                    case 'cos': return Math.cos(arg);
                    case 'tan': return Math.tan(arg);
                    case 'sqrt': return Math.sqrt(arg);
                    case 'abs': return Math.abs(arg);
                    case 'log': return Math.log10(arg);
                    case 'ln': return Math.log(arg);
                    case 'exp': return Math.exp(arg);
                    case 'floor': return Math.floor(arg);
                    case 'ceil': return Math.ceil(arg);
                    case 'round': return Math.round(arg);
                    default: throw new Error('Nieznana funkcja: ' + name);
                }
            }

            var currentX = 0;

            return function(x) {
            currentX = x;
            pos = 0;
            var result = parseExpression();
                if (pos < tokens.length) {
                    throw new Error('Nieprawidłowe wyrażenie.');
                }
                return result;
            };
        }

        function getGraphBounds() {
            var xMin = parseGraphNumber(graphXMin.value, -10);
            var xMax = parseGraphNumber(graphXMax.value, 10);
            var yMin = parseGraphNumber(graphYMin.value, -10);
            var yMax = parseGraphNumber(graphYMax.value, 10);
            if (xMin === xMax) xMax = xMin + 1;
            if (yMin === yMax) yMax = yMin + 1;
            if (xMin > xMax) { var tx = xMin; xMin = xMax; xMax = tx; }
            if (yMin > yMax) { var ty = yMin; yMin = yMax; yMax = ty; }
            return { xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax };
        }

        // [EN] Zrównuje skalę px/jednostkę na obu osiach (okrąg = okrąg, nie elipsa).
        // Tylko POWIĘKSZA zakres osi o większej skali — nic nie przycina.
        function equalizeGraphAspect() {
            var b = getGraphBounds();
            var drawW = graphCanvas.width - 2 * GRAPH_PAD;
            var drawH = graphCanvas.height - 2 * GRAPH_PAD;
            if (drawW <= 0 || drawH <= 0) return;
            var xRange = b.xMax - b.xMin;
            var yRange = b.yMax - b.yMin;
            if (xRange <= 0 || yRange <= 0) return;
            var xScale = drawW / xRange;
            var yScale = drawH / yRange;
            var target = Math.min(xScale, yScale);
            var needX = drawW / target;
            var needY = drawH / target;
            if (needX > xRange + 1e-9) {
                var cx = (b.xMin + b.xMax) / 2;
                graphXMin.value = formatRawNum(cx - needX / 2);
                graphXMax.value = formatRawNum(cx + needX / 2);
            }
            if (needY > yRange + 1e-9) {
                var cy = (b.yMin + b.yMax) / 2;
                graphYMin.value = formatRawNum(cy - needY / 2);
                graphYMax.value = formatRawNum(cy + needY / 2);
            }
        }

        function graphToScreen(x, y, bounds, w, h, pad) {
            var sx = pad + ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * (w - pad * 2);
            var sy = h - pad - ((y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * (h - pad * 2);
            return { x: sx, y: sy };
        }

        function niceGridStep(range) {
            var raw = range / 8;
            var pow = Math.pow(10, Math.floor(Math.log10(raw || 1)));
            var normalized = raw / pow;
            if (normalized >= 5) return 5 * pow;
            if (normalized >= 2) return 2 * pow;
            return pow;
        }

        var GRAPH_PAD = 46;

        function drawGraphBase(bounds) {
            var ctx = graphCtx;
            var w = graphCanvas.width;
            var h = graphCanvas.height;
            var pad = GRAPH_PAD;
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, w, h);

            var xStepCustom = graphXStep ? parseFloat(graphXStep.value) : NaN;
            var yStepCustom = graphYStep ? parseFloat(graphYStep.value) : NaN;
            var xStep = (isFinite(xStepCustom) && xStepCustom > 0) ? xStepCustom : niceGridStep(bounds.xMax - bounds.xMin);
            var yStep = (isFinite(yStepCustom) && yStepCustom > 0) ? yStepCustom : niceGridStep(bounds.yMax - bounds.yMin);

            ctx.lineWidth = 1;
            ctx.strokeStyle = '#e2e8f0';
            ctx.fillStyle = '#64748b';
            ctx.font = '600 11px ' + getComputedStyle(document.body).fontFamily;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            var xStart = Math.ceil(bounds.xMin / xStep) * xStep;
            for (var x = xStart; x <= bounds.xMax + xStep * 0.25; x += xStep) {
                var xs = graphToScreen(x, 0, bounds, w, h, pad).x;
                ctx.beginPath();
                ctx.moveTo(xs, pad);
                ctx.lineTo(xs, h - pad);
                ctx.stroke();
                ctx.fillText(formatNum(x), xs, h - pad + 8);
            }

            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            var yStart = Math.ceil(bounds.yMin / yStep) * yStep;
            for (var y = yStart; y <= bounds.yMax + yStep * 0.25; y += yStep) {
                var ys = graphToScreen(0, y, bounds, w, h, pad).y;
                ctx.beginPath();
                ctx.moveTo(pad, ys);
                ctx.lineTo(w - pad, ys);
                ctx.stroke();
                ctx.fillText(formatNum(y), pad - 8, ys);
            }

            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2;
            if (bounds.yMin <= 0 && bounds.yMax >= 0) {
                var axisY = graphToScreen(0, 0, bounds, w, h, pad).y;
                ctx.beginPath();
                ctx.moveTo(pad, axisY);
                ctx.lineTo(w - pad, axisY);
                ctx.stroke();
            }
            if (bounds.xMin <= 0 && bounds.xMax >= 0) {
                var axisX = graphToScreen(0, 0, bounds, w, h, pad).x;
                ctx.beginPath();
                ctx.moveTo(axisX, pad);
                ctx.lineTo(axisX, h - pad);
                ctx.stroke();
            }

            return pad;
        }

        function drawFunction(command, bounds) {
            var fn = compileGraphExpression(command);
            var ctx = graphCtx;
            var w = graphCanvas.width;
            var h = graphCanvas.height;
            var pad = drawGraphBase(bounds);
            var started = false;
            var samples = Math.max(300, w - pad * 2);
            var validCount = 0;

            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 3;
            ctx.beginPath();

            for (var i = 0; i <= samples; i++) {
                var x = bounds.xMin + (i / samples) * (bounds.xMax - bounds.xMin);
                var y = fn(x);
                if (!isFinite(y) || Math.abs(y) > 1e8) {
                    started = false;
                    continue;
                }
                var p = graphToScreen(x, y, bounds, w, h, pad);
                if (!started) {
                    ctx.moveTo(p.x, p.y);
                    started = true;
                } else {
                    ctx.lineTo(p.x, p.y);
                }
                validCount++;
            }
            ctx.stroke();
            return validCount;
        }

        function drawPoints(points, bounds, labelPrefix) {
            var ctx = graphCtx;
            var w = graphCanvas.width;
            var h = graphCanvas.height;
            var pad = drawGraphBase(bounds);

            ctx.fillStyle = '#dc2626';
            ctx.strokeStyle = '#991b1b';
            ctx.lineWidth = 2;
            ctx.font = '700 12px ' + getComputedStyle(document.body).fontFamily;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';

            points.forEach(function(pt, idx) {
                var p = graphToScreen(pt.x, pt.y, bounds, w, h, pad);
                if (p.x < pad || p.x > w - pad || p.y < pad || p.y > h - pad) return;
                var radius = pt.r || 7;
                ctx.beginPath();
                ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#0f172a';
                ctx.fillText((pt.label || labelPrefix || 'P') + (idx + 1), p.x, p.y - radius - 5);
                ctx.fillStyle = '#dc2626';
            });
        }

        function parseMultiSeriesCommand(raw) {
            var parsed = parseCommandSeries(raw);
            if (!parsed.length) return null;
            var configs = [];
            for (var i = 0; i < parsed.length; i++) {
                if (parsed[i].type !== 'division' || !parsed[i].data.axis) return null;
                configs.push(parsed[i].data);
            }
            return configs;
        }

        function splitCommandSeries(raw) {
            return String(raw || '')
                .split(/\s*;;\s*|\n+/)
                .map(function(s) { return s.trim(); })
                .filter(Boolean);
        }

        function parseCommandSeries(raw) {
            var series = splitCommandSeries(raw);
            return series.map(function(item) {
                var geo = parseGeometryCommand(item);
                if (geo) return { type: 'geometry', raw: item, data: geo };

                var division = parseDivisionCommand(item);
                if (division) return { type: 'division', raw: item, data: division };

                return { type: 'function', raw: item, data: item };
            });
        }

        function parsePipeCommand(command) {
            var raw = String(command || '').trim();
            if (raw.indexOf('|') === -1 && raw.indexOf(',,') === -1 && !/^(?:[xy]\s*(?:\(|[:=])|\d)/i.test(raw)) return null;

            var parts = raw.split(/\s*(?:,,|\|)\s*/).map(function(part) { return part.trim(); }).filter(Boolean);
            var head = parts.shift() || '';
            var headMatch = head.match(/^(?:([xy])\s*(?:\(\s*([^)]+)\s*\))?\s*[:=]\s*)?(-?\d+(?:[.,]\d+)?)(?:\s*\/\s*(\d+))?/i);
            if (!headMatch) return null;

            var config = {
                axis: (headMatch[1] || 'x').toUpperCase(),
                name: (headMatch[2] || 'd').trim(),
                length: parseGraphNumber(headMatch[3], 0),
                count: parseInt(headMatch[4] || '0', 10),
                marginStart: 0,
                marginEnd: 0,
                mode: 'between',
                spacing: 0,
                spacings: null,
                x: 0,
                y: 0,
                r: 7,
                label: 'P',
                unit: null,
                origin: 0,
            };

            parts.forEach(function(part) {
                var p = part.trim();
                var lower = p.toLowerCase();
                var simple = lower.normalize ? lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : lower;
                simple = simple.replace(/^\./, '@');
                var num;

                if (/^<-\s*/.test(simple)) {
                    num = parseGraphNumber(p.replace(/^<-\s*/, ''), 0);
                    config.marginStart = num;
                    return;
                }
                if (/^->\s*/.test(simple)) {
                    num = parseGraphNumber(p.replace(/^->\s*/, ''), 0);
                    config.marginEnd = num;
                    return;
                }
                if (/^(m|margin|margines)\s*=/.test(simple)) {
                    var marginRaw = p.split('=')[1] || '0';
                    var marginParts = marginRaw.split(/[/:]/);
                    config.marginStart = parseGraphNumber(marginParts[0], 0);
                    config.marginEnd = parseGraphNumber(marginParts.length > 1 ? marginParts[1] : marginParts[0], config.marginStart);
                    return;
                }
                if (/^(ms|start|left|dol)\s*=/.test(simple)) {
                    config.marginStart = parseGraphNumber(p.split('=')[1], 0);
                    return;
                }
                if (/^(me|end|right|gora)\s*=/.test(simple)) {
                    config.marginEnd = parseGraphNumber(p.split('=')[1], 0);
                    return;
                }
                if (simple === '@edges' || simple === '@krance' || simple === '@krawedzie') {
                    config.mode = 'edges';
                    return;
                }
                if (simple === '@between' || simple === '@inside' || simple === '@pole' || simple === '@center' || simple === '@srodek') {
                    config.mode = 'between';
                    return;
                }
                if (simple.indexOf('@every:') === 0) {
                    config.mode = 'fixed';
                    config.spacings = parseSpacingList(p.split(':').slice(1).join(':'));
                    config.spacing = config.spacings[0] || 0;
                    return;
                }
                if (/^(co|step|every|odstep)\s*=/.test(simple)) {
                    config.mode = 'fixed';
                    config.spacings = parseSpacingList(p.split('=').slice(1).join('='));
                    config.spacing = config.spacings[0] || 0;
                    return;
                }
                if (/^(origin|zero|offset|od)\s*=/.test(simple)) {
                    config.origin = parseGraphNumber(p.split('=')[1], 0);
                    return;
                }
                if (simple === '@centered' || simple === '@center' || simple === '@srodek') {
                    config.origin = -config.length / 2;
                    return;
                }
                if (simple.indexOf('axis=') === 0 || simple.indexOf('os=') === 0) {
                    var axisVal = simple.split('=')[1];
                    if (axisVal === 'x' || axisVal === 'y') config.axis = axisVal.toUpperCase();
                    return;
                }
                if (simple.indexOf('y=') === 0) {
                    config.y = parseGraphNumber(p.slice(2), 0);
                    return;
                }
                if (simple.indexOf('x=') === 0) {
                    config.x = parseGraphNumber(p.slice(2), 0);
                    return;
                }
                if (simple.indexOf('r=') === 0 || simple.indexOf('dia=') === 0 || simple.indexOf('fi=') === 0 || simple.indexOf('ø=') === 0) {
                    config.r = Math.max(2, parseGraphNumber(p.split('=')[1], 7));
                    return;
                }
                if (simple.indexOf('u=') === 0 || simple.indexOf('unit=') === 0 || simple.indexOf('jednostka=') === 0) {
                    var unit = p.split('=')[1].trim();
                    if (unit === 'mm' || unit === 'cm' || unit === 'm') config.unit = unit;
                    return;
                }
                if (simple.indexOf('label=') === 0 || simple.indexOf('opis=') === 0 || simple.indexOf('nazwa=') === 0) {
                    config.label = p.split('=').slice(1).join('=').trim() || 'P';
                }
            });

            if (config.length <= 0) {
                throw new Error('Komenda wymaga dodatniej długości, np. x=120/4 albo x=120 | co=20.');
            }
            if (config.mode === 'fixed') {
                if (config.spacing <= 0) {
                    throw new Error('Dla stałego odstępu dopisz co=20 albo @every:20.');
                }
                if (config.count <= 0) config.count = 1;
            } else if (config.count <= 0) {
                throw new Error('Dopisz liczbę punktów, np. x=120/4.');
            }
            return config;
        }

        function pointsFromPipeCommand(config) {
            /* Poprawka @every — jeśli podano stały odstęp a count=0, oblicz count automatycznie */
            if (config.mode === 'fixed' && config.spacing > 0 && config.count <= 0) {
                var usable = config.length - config.marginStart - config.marginEnd;
                config.count = Math.max(1, Math.floor(usable / config.spacing) + 1);
            }
            var placement = calculatePegPositions(
                config.length,
                config.count,
                config.marginStart,
                config.marginEnd,
                (config.spacings && config.spacings.length > 1) ? config.spacings : config.spacing,
                config.mode
            );
            if (placement.error) throw new Error(placement.error.replace('⚠️ ', ''));
            return placement.positions.map(function(pos) {
                var shifted = pos + (config.origin || 0);
                if (config.axis === 'Y') {
                    return { x: config.x, y: shifted, r: config.r, label: config.label };
                }
                return { x: shifted, y: config.y, r: config.r, label: config.label };
            });
        }

        function commandSummary(config, points) {
            var axisName = config.axis === 'Y' ? 'Y' : 'X';
            return 'Komenda: oś ' + axisName +
                '\nTryb: ' + getPlacementModeLabel(config.mode) +
                '\nPoczątek osi: ' + formatNum(config.origin || 0) +
                '\nDługość: ' + formatNum(config.length) +
                '\nPunkty: ' + points.length;
        }

        /* ============================================================
        [EN] GRAPH 2D — Geometry command parser
        Rozpoznaje: punkt=, rect=, siatka=
        ============================================================ */
        function parseGeometryCommand(raw) {
            var str = String(raw || '').trim();
            var lower = str.toLowerCase();

            // --- punkt=x,y | label=... | r=... ---
            if (/^punkt\s*=\s*-?[\d.]/.test(lower) || /^p\s*=\s*-?[\d.]/.test(lower)) {
                var body = str.replace(/^[^=]+=/, '').trim();
                var parts = body.split(',,').map(function(s) { return s.trim(); });
                var coords = parts[0].split(',');
                var x = parseGraphNumber(coords[0], 0);
                var y = parseGraphNumber(coords[1] || '0', 0);
                var label = 'P'; var r = 7;
                parts.slice(1).forEach(function(p) {
                    var pl = p.toLowerCase();
                    if (/^(label|opis|nazwa)=/.test(pl)) label = p.split('=').slice(1).join('=').trim();
                    if (/^r=/.test(pl)) r = Math.max(2, parseGraphNumber(p.split('=')[1], 7));
                });
                return { type: 'punkt', x: x, y: y, label: label, r: r };
            }

            // --- rect=szerokoscxwysokosc | label=... ---
            if (/^rect\s*=/.test(lower) || /^prostokat\s*=/.test(lower)) {
                var body = str.replace(/^[^=]+=/, '').trim();
                var parts = body.split(',,').map(function(s) { return s.trim(); });
                var dims = parts[0].toLowerCase().split('x');
                var w = parseGraphNumber(dims[0], 100);
                var h = parseGraphNumber(dims[1] || dims[0], 100);
                var ox = 0; var oy = 0; var label = '';
                parts.slice(1).forEach(function(p) {
                    var pl = p.toLowerCase();
                    if (/^(label|opis|nazwa)=/.test(pl)) label = p.split('=').slice(1).join('=').trim();
                    if (/^(ox|x0|od_x)=/.test(pl)) ox = parseGraphNumber(p.split('=')[1], 0);
                    if (/^(oy|y0|od_y)=/.test(pl)) oy = parseGraphNumber(p.split('=')[1], 0);
                });
                return { type: 'rect', w: w, h: h, ox: ox, oy: oy, label: label };
            }

            // --- siatka=szerokoscxwysokosc | co=dxdy | label=... ---
            if (/^(siatka|grid)\s*=/.test(lower)) {
                var body = str.replace(/^[^=]+=/, '').trim();
                var parts = body.split(',,').map(function(s) { return s.trim(); });
                var dims = parts[0].toLowerCase().split('x');
                var w = parseGraphNumber(dims[0], 100);
                var h = parseGraphNumber(dims[1] || dims[0], 100);
                var dx = w; var dy = h; var ox = 0; var oy = 0;
                var label = 'P'; var r = 7;
                parts.slice(1).forEach(function(p) {
                    var pl = p.toLowerCase();
                    if (/^(co|step|krok|co_x)=/.test(pl)) {
                        var coVal = p.split('=')[1].toLowerCase().split('x');
                        dx = parseGraphNumber(coVal[0], w);
                        dy = parseGraphNumber(coVal[1] || coVal[0], h);
                    }
                    if (/^(label|opis|nazwa)=/.test(pl)) label = p.split('=').slice(1).join('=').trim();
                    if (/^(ox|x0)=/.test(pl)) ox = parseGraphNumber(p.split('=')[1], 0);
                    if (/^(oy|y0)=/.test(pl)) oy = parseGraphNumber(p.split('=')[1], 0);
                    if (/^r=/.test(pl)) r = Math.max(2, parseGraphNumber(p.split('=')[1], 7));
                });
                return { type: 'siatka', w: w, h: h, dx: dx, dy: dy, ox: ox, oy: oy, label: label, r: r };
            }

            // --- okrag=R / kolo=R / circle=R [,, ox=... ,, oy=...] ---
            if (/^(okrag|kolo|circle|okr[aą]g|ko[lł]o)\s*=/.test(lower)) {
                var body = str.replace(/^[^=]+=/, '').trim();
                var parts = body.split(',,').map(function(s) { return s.trim(); });
                var r = Math.abs(parseGraphNumber(parts[0], 50));
                var ox = 0; var oy = 0; var label = '';
                parts.slice(1).forEach(function(p) {
                    var pl = p.toLowerCase();
                    if (/^(label|opis|nazwa)=/.test(pl)) label = p.split('=').slice(1).join('=').trim();
                    if (/^(ox|x0|od_x)=/.test(pl)) ox = parseGraphNumber(p.split('=')[1], 0);
                    if (/^(oy|y0|od_y)=/.test(pl)) oy = parseGraphNumber(p.split('=')[1], 0);
                });
                return { type: 'okrag', r: r, ox: ox, oy: oy, label: label };
            }

            // --- wielokat=N,R (foremny)  LUB  wielokat=x,y/x,y/x,y (nieforemny) ---
            if (/^(wielokat|wielok[aą]t|poly|figura)\s*=/.test(lower)) {
                var body = str.replace(/^[^=]+=/, '').trim();
                var parts = body.split(',,').map(function(s) { return s.trim(); });
                var ox = 0; var oy = 0; var label = '';
                parts.slice(1).forEach(function(p) {
                    var pl = p.toLowerCase();
                    if (/^(label|opis|nazwa)=/.test(pl)) label = p.split('=').slice(1).join('=').trim();
                    if (/^(ox|x0|od_x)=/.test(pl)) ox = parseGraphNumber(p.split('=')[1], 0);
                    if (/^(oy|y0|od_y)=/.test(pl)) oy = parseGraphNumber(p.split('=')[1], 0);
                });

                // Nieforemny: lista wierzchołków rozdzielona "/" (każdy jako x,y)
                if (parts[0].indexOf('/') !== -1) {
                    var vertices = parts[0].split('/').map(function(v) {
                        var c = v.trim().split(',');
                        return { x: parseGraphNumber(c[0], 0), y: parseGraphNumber(c[1] || '0', 0) };
                    }).filter(function(v) { return isFinite(v.x) && isFinite(v.y); });
                    if (vertices.length >= 2) {
                        return { type: 'wielokat', vertices: vertices, n: vertices.length, ox: ox, oy: oy, label: label, irregular: true };
                    }
                }

                // Foremny: N boków wpisany w okrąg o promieniu R
                var mainParts = parts[0].split(',');
                var n = Math.max(3, Math.round(parseGraphNumber(mainParts[0], 6)));
                var r = Math.abs(parseGraphNumber(mainParts[1] || '100', 100));
                return { type: 'wielokat', n: n, r: r, ox: ox, oy: oy, label: label };
            }

            // --- trojkat=x,y/x,y/x,y — trójkąt z 3 wierzchołków (analiza boków, kątów, pola) ---
            if (/^(trojkat|tr[oó]jk[aą]t|triangle)\s*=/.test(lower)) {
                var body = str.replace(/^[^=]+=/, '').trim();
                var parts = body.split(',,').map(function(s) { return s.trim(); });
                var ox = 0; var oy = 0; var label = '';
                parts.slice(1).forEach(function(p) {
                    var pl = p.toLowerCase();
                    if (/^(label|opis|nazwa)=/.test(pl)) label = p.split('=').slice(1).join('=').trim();
                    if (/^(ox|x0|od_x)=/.test(pl)) ox = parseGraphNumber(p.split('=')[1], 0);
                    if (/^(oy|y0|od_y)=/.test(pl)) oy = parseGraphNumber(p.split('=')[1], 0);
                });
                var verts = parts[0].split('/').map(function(v) {
                    var c = v.trim().split(',');
                    return { x: parseGraphNumber(c[0], 0), y: parseGraphNumber(c[1] || '0', 0) };
                }).filter(function(v) { return isFinite(v.x) && isFinite(v.y); });
                if (verts.length !== 3) {
                    return { type: 'trojkat', error: 'Trójkąt wymaga dokładnie 3 wierzchołków (x,y/x,y/x,y).' };
                }
                return { type: 'trojkat', vertices: verts, ox: ox, oy: oy, label: label };
            }

            // --- pitagoras=a,b — trójkąt prostokątny z dwóch przyprostokątnych ---
            if (/^(pitagoras|pythagoras)\s*=/.test(lower)) {
                var body = str.replace(/^[^=]+=/, '').trim();
                var parts = body.split(',,').map(function(s) { return s.trim(); });
                var ox = 0; var oy = 0; var label = '';
                parts.slice(1).forEach(function(p) {
                    var pl = p.toLowerCase();
                    if (/^(label|opis|nazwa)=/.test(pl)) label = p.split('=').slice(1).join('=').trim();
                    if (/^(ox|x0|od_x)=/.test(pl)) ox = parseGraphNumber(p.split('=')[1], 0);
                    if (/^(oy|y0|od_y)=/.test(pl)) oy = parseGraphNumber(p.split('=')[1], 0);
                });
                var legs = parts[0].split(/[,/]/);
                var a = Math.abs(parseGraphNumber(legs[0], 0));
                var b = Math.abs(parseGraphNumber(legs[1] || '0', 0));
                if (!(a > 0) || !(b > 0)) {
                    return { type: 'trojkat', error: 'Pitagoras wymaga dwóch przyprostokątnych, np. pitagoras=3,4.' };
                }
                // Wierzchołki trójkąta prostokątnego: kąt prosty w (0,0)
                var verts = [
                    { x: 0, y: 0 },
                    { x: a, y: 0 },
                    { x: 0, y: b },
                ];
                return { type: 'trojkat', vertices: verts, ox: ox, oy: oy, label: label, pythagoras: true };
            }

            // --- kamera=x,y / widok / fov / pole widzenia — stożek (wycinek) pola widzenia ---
            // Kierunek: cel=x,y (patrz w punkt), azymut=A (kompas: 0°=góra, zgodnie z zegarem),
            // kierunek=A (matematyczny: 0°=prawo, przeciwnie do zegara). Domyślnie 0° (w prawo).
            if (/^(kamera|widok|fov|pole[_ ]?widzenia|stozek|sto[zż]ek)\s*=/.test(lower)) {
                var body = str.replace(/^[^=]+=/, '').trim();
                var parts = body.split(',,').map(function(s) { return s.trim(); });
                var posC = parts[0].split('/')[0].split(',');
                var ox = parseGraphNumber(posC[0], 0);
                var oy = parseGraphNumber(posC[1] || '0', 0);
                var fov = 90, range = 10, label = '', markDist = 0;
                var dirRad = 0, dirMode = 'kierunek', dirValue = 0, targetTxt = null;
                parts.slice(1).forEach(function(p) {
                    var pl = p.toLowerCase();
                    var val = p.split('=').slice(1).join('=').trim();
                    if (/^(k[aą]t|kat|fov|angle)=/.test(pl)) {
                        fov = Math.abs(parseGraphNumber(val, 90));
                    } else if (/^(na|przy|odl|dystans)=/.test(pl)) {
                        markDist = Math.abs(parseGraphNumber(val, 0));
                    } else if (/^(zasi[eę]g|zasieg|range|d[lł]ugo[sś][cć]|r)=/.test(pl)) {
                        range = Math.abs(parseGraphNumber(val, 10));
                    } else if (/^(cel|target|patrz)=/.test(pl)) {
                        var c = val.split(',');
                        var cx = parseGraphNumber(c[0], 0), cy = parseGraphNumber(c[1] || '0', 0);
                        dirRad = Math.atan2(cy - oy, cx - ox); dirMode = 'cel';
                        targetTxt = formatNum(cx) + ', ' + formatNum(cy);
                    } else if (/^(azymut|bearing|kompas)=/.test(pl)) {
                        dirValue = parseGraphNumber(val, 0);
                        dirRad = (90 - dirValue) * Math.PI / 180; dirMode = 'azymut';
                    } else if (/^(kierunek|dir|kat_kier)=/.test(pl)) {
                        dirValue = parseGraphNumber(val, 0);
                        dirRad = dirValue * Math.PI / 180; dirMode = 'kierunek';
                    } else if (/^(label|opis|nazwa)=/.test(pl)) {
                        label = val;
                    }
                });
                if (!(fov > 0)) fov = 90;
                if (fov > 360) fov = 360;
                if (!(range > 0)) range = 10;
                return { type: 'widok', ox: ox, oy: oy, fov: fov, range: range, dir: dirRad,
                         dirMode: dirMode, dirValue: dirValue, targetTxt: targetTxt, label: label, markDist: markDist };
            }

            return null;
        }

        // [EN] Pomiary wielokąta z listy wierzchołków (zamknięty): boki, obwód, pole, kąty wewn.
        function analyzePolygon(pts) {
            var n = pts.length;
            var sides = [];      // długości boków (bok i = od wierzchołka i do i+1)
            var perimeter = 0;
            for (var i = 0; i < n; i++) {
                var p1 = pts[i];
                var p2 = pts[(i + 1) % n];
                var len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                sides.push(len);
                perimeter += len;
            }
            // Pole — wzór Gaussa (shoelace), wartość bezwzględna
            var area2 = 0;
            for (var i = 0; i < n; i++) {
                var p1 = pts[i];
                var p2 = pts[(i + 1) % n];
                area2 += p1.x * p2.y - p2.x * p1.y;
            }
            var area = Math.abs(area2) / 2;
            // Kąty wewnętrzne przy każdym wierzchołku
            var angles = [];
            for (var i = 0; i < n; i++) {
                var prev = pts[(i - 1 + n) % n];
                var cur = pts[i];
                var next = pts[(i + 1) % n];
                var ux = prev.x - cur.x, uy = prev.y - cur.y;
                var wx = next.x - cur.x, wy = next.y - cur.y;
                var dot = ux * wx + uy * wy;
                var mag = Math.hypot(ux, uy) * Math.hypot(wx, wy);
                var ang = mag > 0 ? Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180 / Math.PI : 0;
                angles.push(ang);
            }
            // Wykrycie kąta prostego (najbliżej 90°)
            var rightVertex = -1;
            for (var i = 0; i < n; i++) {
                if (Math.abs(angles[i] - 90) < 0.5) { rightVertex = i; break; }
            }
            return { sides: sides, perimeter: perimeter, area: area, angles: angles, rightVertex: rightVertex };
        }

        // [EN] Tekstowe podsumowanie trójkąta (boki, kąty, pole, Pitagoras)
        function describeTriangle(pts, isPythagoras) {
            if (pts.length !== 3) return 'Trójkąt wymaga 3 wierzchołków.';
            var a = analyzePolygon(pts);
            var V = ['A', 'B', 'C'];
            var sideNames = ['AB', 'BC', 'CA'];
            var lines = [];
            lines.push('🔺 Trójkąt ABC');
            lines.push('Wierzchołki: A(' + formatNum(pts[0].x) + ',' + formatNum(pts[0].y) + ') '
                + 'B(' + formatNum(pts[1].x) + ',' + formatNum(pts[1].y) + ') '
                + 'C(' + formatNum(pts[2].x) + ',' + formatNum(pts[2].y) + ')');
            lines.push('Boki: ' + sideNames.map(function(nm, i) { return nm + '=' + formatNum(a.sides[i]); }).join(', '));
            lines.push('Kąty: ' + V.map(function(v, i) {
                return v + '=' + (a.rightVertex === i ? '90' : formatNum(a.angles[i])) + '°';
            }).join(', '));
            lines.push('Obwód: ' + formatNum(a.perimeter) + '   Pole: ' + formatNum(a.area));
            if (a.rightVertex >= 0) {
                // przeciwprostokątna = bok naprzeciw kąta prostego
                var hypLen = a.sides[(a.rightVertex + 1) % 3];
                lines.push('✓ Prostokątny (kąt prosty przy ' + V[a.rightVertex] + '). Przeciwprostokątna = ' + formatNum(hypLen));
            }
            if (isPythagoras) {
                var legs = a.sides.slice().sort(function(x, y) { return x - y; });
                lines.push('Pitagoras: ' + formatNum(legs[0]) + '² + ' + formatNum(legs[1]) + '² = ' + formatNum(legs[2]) + '²');
            }
            return lines.join('\n');
        }

        // [EN] Tekstowe podsumowanie wielokąta nieforemnego (boki, obwód, pole, kąty)
        function describeIrregularPolygon(pts) {
            var n = pts.length;
            var a = analyzePolygon(pts);
            var lines = [];
            lines.push('🔷 Wielokąt nieforemny (' + n + ' wierzch.)');
            lines.push('Obwód: ' + formatNum(a.perimeter) + '   Pole: ' + formatNum(a.area));
            lines.push('Boki: ' + a.sides.map(function(s) { return formatNum(s); }).join(', '));
            lines.push('Kąty: ' + a.angles.map(function(ang) { return formatNum(ang) + '°'; }).join(', '));
            return lines.join('\n');
        }

        // [EN] Opis pola widzenia (stożka/wycinka) — kąt, kierunek, szerokość pokrycia, pole, łuk.
        function describeFov(geo) {
            var rad = geo.fov * Math.PI / 180;
            var dirTxt;
            if (geo.dirMode === 'cel') dirTxt = 'cel (' + geo.targetTxt + ')';
            else if (geo.dirMode === 'azymut') dirTxt = 'azymut ' + formatNum(geo.dirValue) + '°';
            else dirTxt = 'kierunek ' + formatNum(geo.dirValue) + '°';
            var lines = [];
            lines.push('📷 Pole widzenia ' + formatNum(geo.fov) + '° → ' + dirTxt);
            lines.push('Montaż: (' + formatNum(geo.ox) + ', ' + formatNum(geo.oy) + '), zasięg ' + formatNum(geo.range));
            if (geo.fov < 180) {
                lines.push('Szerokość na wprost (na zasięgu): ' + formatNum(2 * geo.range * Math.tan(rad / 2)));
            }
            lines.push('Pole pokrycia: ' + formatNum(0.5 * geo.range * geo.range * rad));
            lines.push('Łuk na zasięgu: ' + formatNum(geo.range * rad));
            if (geo.markDist > 0 && geo.fov < 180) {
                lines.push('Na odległości ' + formatNum(geo.markDist) + ': szerokość ' + formatNum(2 * geo.markDist * Math.tan(rad / 2)));
            }
            return lines.join('\n');
        }

        function buildGeometryPoints(geo) {
            if (geo.type === 'punkt') {
                return [{ x: geo.x, y: geo.y, r: geo.r, label: geo.label }];
            }
            if (geo.type === 'rect') {
                // Cztery rogi prostokąta
                return [
                    { x: geo.ox,          y: geo.oy,          r: 5, label: geo.label || 'A' },
                    { x: geo.ox + geo.w,  y: geo.oy,          r: 5, label: geo.label || 'B' },
                    { x: geo.ox + geo.w,  y: geo.oy + geo.h,  r: 5, label: geo.label || 'C' },
                    { x: geo.ox,          y: geo.oy + geo.h,  r: 5, label: geo.label || 'D' },
                ];
            }
            if (geo.type === 'okrag') {
                // 4 punkty skrajne (tylko do dopasowania zakresu osi — nie rysowane) + środek
                var pts = [
                    { x: geo.ox + geo.r, y: geo.oy, r: 0, label: '', _hidden: true },
                    { x: geo.ox - geo.r, y: geo.oy, r: 0, label: '', _hidden: true },
                    { x: geo.ox, y: geo.oy + geo.r, r: 0, label: '', _hidden: true },
                    { x: geo.ox, y: geo.oy - geo.r, r: 0, label: '', _hidden: true },
                    { x: geo.ox, y: geo.oy, r: 5, label: geo.label || 'O' },
                ];
                return pts;
            }
            if (geo.type === 'trojkat') {
                if (geo.error || !geo.vertices) return [];
                return geo.vertices.map(function(v, i) {
                    return {
                        x: parseFloat((geo.ox + v.x).toFixed(6)),
                        y: parseFloat((geo.oy + v.y).toFixed(6)),
                        r: 5,
                        label: 'ABC'.charAt(i) || String.fromCharCode(65 + i),
                    };
                });
            }
            if (geo.type === 'wielokat' && geo.vertices) {
                // Nieforemny — wierzchołki podane jawnie (+ ewentualne przesunięcie ox/oy)
                return geo.vertices.map(function(v, i) {
                    return {
                        x: parseFloat((geo.ox + v.x).toFixed(6)),
                        y: parseFloat((geo.oy + v.y).toFixed(6)),
                        r: 5,
                        label: geo.label || String.fromCharCode(65 + (i % 26)),
                    };
                });
            }
            if (geo.type === 'wielokat') {
                var pts = [];
                for (var i = 0; i < geo.n; i++) {
                    var angle = (2 * Math.PI * i) / geo.n - Math.PI / 2;
                    pts.push({
                        x: parseFloat((geo.ox + geo.r * Math.cos(angle)).toFixed(6)),
                        y: parseFloat((geo.oy + geo.r * Math.sin(angle)).toFixed(6)),
                        r: 5,
                        label: geo.label || String.fromCharCode(65 + (i % 26)),
                    });
                }
                return pts;
            }
            if (geo.type === 'siatka') {
                var pts = [];
                var ix = 0;
                for (var x = geo.ox; x <= geo.ox + geo.w + 1e-9; x += geo.dx) {
                    var iy = 0;
                    for (var y = geo.oy; y <= geo.oy + geo.h + 1e-9; y += geo.dy) {
                        pts.push({ x: parseFloat(x.toFixed(6)), y: parseFloat(y.toFixed(6)), r: geo.r, label: geo.label || 'P', _ix: ix, _iy: iy });
                        iy++;
                    }
                    ix++;
                }
                return pts;
            }
            if (geo.type === 'widok') {
                // Punkty tylko do dopasowania zakresu (wierzchołek + próbki łuku) — rysowane osobno.
                var pts = [{ x: geo.ox, y: geo.oy, r: 0, label: '', _hidden: true }];
                var half = geo.fov * Math.PI / 360;
                var steps = 12;
                for (var i = 0; i <= steps; i++) {
                    var a = geo.dir - half + (2 * half) * i / steps;
                    pts.push({
                        x: parseFloat((geo.ox + geo.range * Math.cos(a)).toFixed(6)),
                        y: parseFloat((geo.oy + geo.range * Math.sin(a)).toFixed(6)),
                        r: 0, label: '', _hidden: true,
                    });
                }
                return pts;
            }
            return [];
        }

        function drawGeometry(geos, bounds) {
            // geos = tablica obiektów { geo, points, color }
            var ctx = graphCtx;
            var w = graphCanvas.width;
            var h = graphCanvas.height;
            var pad = drawGraphBase(bounds);
            var colors = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2'];

            geos.forEach(function(item, si) {
                var geo = item.geo;
                var points = item.points;
                var color = item.color || colors[si % colors.length];

                // Narysuj okrąg
                if (geo.type === 'okrag') {
                    var center = graphToScreen(geo.ox, geo.oy, bounds, w, h, pad);
                    var edgeX = graphToScreen(geo.ox + geo.r, geo.oy, bounds, w, h, pad);
                    var edgeY = graphToScreen(geo.ox, geo.oy + geo.r, bounds, w, h, pad);
                    // Osobny promień w pikselach dla X i Y — skale osi mogą się różnić,
                    // więc koło w danych rysujemy jako elipsę na ekranie (nie ucina się w Y)
                    var screenRx = Math.abs(edgeX.x - center.x);
                    var screenRy = Math.abs(edgeY.y - center.y);
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2;
                    ctx.setLineDash([]);
                    ctx.beginPath();
                    ctx.ellipse(center.x, center.y, screenRx, screenRy, 0, 0, Math.PI * 2);
                    ctx.stroke();
                    // Promień — linia + etykieta
                    ctx.setLineDash([4, 3]);
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(center.x, center.y);
                    ctx.lineTo(center.x + screenRx, center.y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.fillStyle = color;
                    ctx.font = '11px ' + getComputedStyle(document.body).fontFamily;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText('r=' + formatNum(geo.r), center.x + screenRx / 2, center.y - 4);
                }

                // Narysuj wielokąt jako zamkniętą linię
                if (geo.type === 'wielokat') {
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2;
                    ctx.setLineDash([]);
                    ctx.beginPath();
                    points.slice(0, geo.n).forEach(function(pt, i) {
                        var p = graphToScreen(pt.x, pt.y, bounds, w, h, pad);
                        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
                    });
                    ctx.closePath();
                    ctx.stroke();
                    // Nieforemny: podpisz długość każdego boku w jego środku
                    if (geo.vertices) {
                        var poly = points.slice(0, geo.n);
                        ctx.fillStyle = color;
                        ctx.font = '600 10px ' + getComputedStyle(document.body).fontFamily;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        poly.forEach(function(pt, i) {
                            var nx = poly[(i + 1) % poly.length];
                            var len = Math.hypot(nx.x - pt.x, nx.y - pt.y);
                            var midData = { x: (pt.x + nx.x) / 2, y: (pt.y + nx.y) / 2 };
                            var midScr = graphToScreen(midData.x, midData.y, bounds, w, h, pad);
                            ctx.fillStyle = 'rgba(255,255,255,0.85)';
                            var tw = ctx.measureText(formatNum(len)).width + 6;
                            ctx.fillRect(midScr.x - tw / 2, midScr.y - 7, tw, 14);
                            ctx.fillStyle = color;
                            ctx.fillText(formatNum(len), midScr.x, midScr.y);
                        });
                    }
                }

                // Narysuj trójkąt — boki z długościami + kąty przy wierzchołkach
                if (geo.type === 'trojkat' && points.length === 3) {
                    var P = points.map(function(pt) { return graphToScreen(pt.x, pt.y, bounds, w, h, pad); });
                    // Wypełnienie + obrys
                    ctx.fillStyle = color + '1a';
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2;
                    ctx.setLineDash([]);
                    ctx.beginPath();
                    ctx.moveTo(P[0].x, P[0].y);
                    ctx.lineTo(P[1].x, P[1].y);
                    ctx.lineTo(P[2].x, P[2].y);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    var analysis = analyzePolygon(points);
                    var centroid = {
                        x: (P[0].x + P[1].x + P[2].x) / 3,
                        y: (P[0].y + P[1].y + P[2].y) / 3,
                    };

                    // Długości boków w środkach
                    ctx.font = '600 11px ' + getComputedStyle(document.body).fontFamily;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    P.forEach(function(pScr, i) {
                        var nScr = P[(i + 1) % 3];
                        var mx = (pScr.x + nScr.x) / 2, my = (pScr.y + nScr.y) / 2;
                        var label = formatNum(analysis.sides[i]);
                        ctx.fillStyle = 'rgba(255,255,255,0.88)';
                        var tw = ctx.measureText(label).width + 6;
                        ctx.fillRect(mx - tw / 2, my - 8, tw, 16);
                        ctx.fillStyle = color;
                        ctx.fillText(label, mx, my);
                    });

                    // Kąty przy wierzchołkach (oraz znacznik kąta prostego)
                    ctx.font = '600 10px ' + getComputedStyle(document.body).fontFamily;
                    P.forEach(function(vScr, i) {
                        // przesuń etykietę kąta do środka trójkąta
                        var dx = centroid.x - vScr.x, dy = centroid.y - vScr.y;
                        var d = Math.hypot(dx, dy) || 1;
                        var lx = vScr.x + (dx / d) * 24, ly = vScr.y + (dy / d) * 24;
                        var txt = (analysis.rightVertex === i ? '90°' : formatNum(analysis.angles[i]) + '°');
                        ctx.fillStyle = 'rgba(255,255,255,0.88)';
                        var tw = ctx.measureText(txt).width + 6;
                        ctx.fillRect(lx - tw / 2, ly - 7, tw, 14);
                        ctx.fillStyle = analysis.rightVertex === i ? '#dc2626' : '#475569';
                        ctx.fillText(txt, lx, ly);
                    });
                }

                // Narysuj prostokąt jako linię
                if (geo.type === 'rect') {
                    var corners = points;
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2;
                    ctx.setLineDash([6, 3]);
                    ctx.beginPath();
                    var first = graphToScreen(corners[0].x, corners[0].y, bounds, w, h, pad);
                    ctx.moveTo(first.x, first.y);
                    [1, 2, 3, 0].forEach(function(i) {
                        var p = graphToScreen(corners[i].x, corners[i].y, bounds, w, h, pad);
                        ctx.lineTo(p.x, p.y);
                    });
                    ctx.closePath();
                    ctx.stroke();
                    ctx.setLineDash([]);
                    // Wymiary
                    ctx.fillStyle = color;
                    ctx.font = '11px ' + getComputedStyle(document.body).fontFamily;
                    ctx.textAlign = 'center';
                    var mid = graphToScreen(geo.ox + geo.w / 2, geo.oy, bounds, w, h, pad);
                    ctx.fillText(formatNum(geo.w), mid.x, mid.y - 10);
                    var midL = graphToScreen(geo.ox, geo.oy + geo.h / 2, bounds, w, h, pad);
                    ctx.textAlign = 'right';
                    ctx.fillText(formatNum(geo.h), midL.x - 8, midL.y + 4);
                }

                // Narysuj pole widzenia (stożek/wycinek)
                if (geo.type === 'widok') {
                    var apex = graphToScreen(geo.ox, geo.oy, bounds, w, h, pad);
                    var half = geo.fov * Math.PI / 360;
                    var steps = 64;
                    // Wypełniony wycinek (wierzchołek → łuk → wierzchołek)
                    ctx.beginPath();
                    ctx.moveTo(apex.x, apex.y);
                    for (var i = 0; i <= steps; i++) {
                        var a = geo.dir - half + (2 * half) * i / steps;
                        var pd = graphToScreen(geo.ox + geo.range * Math.cos(a), geo.oy + geo.range * Math.sin(a), bounds, w, h, pad);
                        ctx.lineTo(pd.x, pd.y);
                    }
                    ctx.closePath();
                    ctx.fillStyle = color + '22';
                    ctx.fill();
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2;
                    ctx.setLineDash([]);
                    ctx.stroke();
                    // Oś kierunku (przerywana)
                    var axisEnd = graphToScreen(geo.ox + geo.range * Math.cos(geo.dir), geo.oy + geo.range * Math.sin(geo.dir), bounds, w, h, pad);
                    ctx.setLineDash([5, 4]);
                    ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(apex.x, apex.y); ctx.lineTo(axisEnd.x, axisEnd.y); ctx.stroke();
                    ctx.setLineDash([]);
                    // Poprzeczna linia granic FOV na zadanej odległości (na=...)
                    if (geo.markDist > 0 && geo.fov < 180) {
                        var halfW = geo.markDist * Math.tan(half);
                        var ux = Math.cos(geo.dir), uy = Math.sin(geo.dir);   // oś
                        var pxu = -uy, pyu = ux;                              // prostopadła do osi
                        var cxD = geo.ox + geo.markDist * ux, cyD = geo.oy + geo.markDist * uy;
                        var mL = graphToScreen(cxD + halfW * pxu, cyD + halfW * pyu, bounds, w, h, pad);
                        var mR = graphToScreen(cxD - halfW * pxu, cyD - halfW * pyu, bounds, w, h, pad);
                        var mC = graphToScreen(cxD, cyD, bounds, w, h, pad);
                        ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([2, 2]);
                        ctx.beginPath(); ctx.moveTo(mL.x, mL.y); ctx.lineTo(mR.x, mR.y); ctx.stroke();
                        ctx.setLineDash([]);
                        var wTxt = formatNum(2 * halfW) + ' @ ' + formatNum(geo.markDist);
                        ctx.font = '600 10px ' + getComputedStyle(document.body).fontFamily;
                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        var twW = ctx.measureText(wTxt).width + 6;
                        ctx.fillStyle = 'rgba(255,255,255,0.85)';
                        ctx.fillRect(mC.x - twW / 2, mC.y - 8, twW, 16);
                        ctx.fillStyle = color;
                        ctx.fillText(wTxt, mC.x, mC.y);
                    }
                    // Etykieta kąta przy wierzchołku
                    var midA = graphToScreen(geo.ox + geo.range * 0.34 * Math.cos(geo.dir), geo.oy + geo.range * 0.34 * Math.sin(geo.dir), bounds, w, h, pad);
                    ctx.font = '600 11px ' + getComputedStyle(document.body).fontFamily;
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    var angLabel = formatNum(geo.fov) + '°';
                    var twA = ctx.measureText(angLabel).width + 6;
                    ctx.fillStyle = 'rgba(255,255,255,0.85)';
                    ctx.fillRect(midA.x - twA / 2, midA.y - 8, twA, 16);
                    ctx.fillStyle = color;
                    ctx.fillText(angLabel, midA.x, midA.y);
                    // Marker kamery (wierzchołek)
                    ctx.beginPath(); ctx.arc(apex.x, apex.y, 6, 0, Math.PI * 2);
                    ctx.fillStyle = color; ctx.fill();
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
                    ctx.fillStyle = '#0f172a';
                    ctx.font = '700 10px ' + getComputedStyle(document.body).fontFamily;
                    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                    ctx.fillText(geo.label || '📷', apex.x, apex.y - 9);
                }

                // Narysuj punkty
                ctx.fillStyle = color;
                ctx.strokeStyle = color === '#2563eb' ? '#1d4ed8' : color;
                ctx.lineWidth = 1.5;
                ctx.font = '700 11px ' + getComputedStyle(document.body).fontFamily;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';

                points.forEach(function(pt, idx) {
                    if (pt._hidden) return;
                    var p = graphToScreen(pt.x, pt.y, bounds, w, h, pad);
                    if (p.x < pad - 10 || p.x > w - pad + 10 || p.y < pad - 10 || p.y > h - pad + 10) return;
                    var radius = pt.r || 6;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
                    ctx.stroke();
                    ctx.fillStyle = color;
                    // Dla siatki — pokaż indeks; dla trójkąta czyste A/B/C; dla reszty label+numer
                    var txt;
                    if (geo.type === 'siatka') {
                        txt = (pt.label || 'P') + '(' + pt._ix + ',' + pt._iy + ')';
                    } else if (geo.type === 'trojkat') {
                        txt = pt.label || 'P';
                    } else {
                        txt = (pt.label || 'P') + (points.length > 1 ? (idx + 1) : '');
                    }
                    ctx.fillStyle = '#0f172a';
                    ctx.font = '700 10px ' + getComputedStyle(document.body).fontFamily;
                    ctx.fillText(txt, p.x, p.y - radius - 3);
                    ctx.fillStyle = color;
                });
            });
        }


        function parseDivisionCommand(command) {
            var pipe = parsePipeCommand(command);
            if (pipe) return pipe;

            var text = String(command || '').toLowerCase().replace(/,/g, '.');
            var yMatch = text.match(/\by\s*=\s*(-?\d+(?:\.\d+)?)/);
            var y = yMatch ? parseFloat(yMatch[1]) : 0;

            var fixed = text.match(/od\s+(-?\d+(?:\.\d+)?)\s+do\s+(-?\d+(?:\.\d+)?)\s+co\s+(\d+(?:\.\d+)?)/);
            if (fixed) {
                var startVal = parseFloat(fixed[1]);
                var endVal = parseFloat(fixed[2]);
                var spacingVal = parseFloat(fixed[3]);
                // Use Math.ceil to ensure the last division is included and avoid zero count
                var countVal = Math.max(1, Math.ceil((endVal - startVal) / spacingVal));
                return {
                    start: startVal,
                    length: endVal - startVal,
                    spacing: spacingVal,
                    count: countVal,
                    mode: 'fixed',
                    y: y,
                };
            }

            var split = text.match(/podziel\s+(\d+(?:\.\d+)?)\s+na\s+(\d+)/);
            if (!split) return null;

            var mode = 'between';
            if (text.indexOf('kranc') !== -1 || text.indexOf('krańc') !== -1 || text.indexOf('od kraw') !== -1) mode = 'edges';
            if (text.indexOf('co ') !== -1 || text.indexOf('staly') !== -1 || text.indexOf('stały') !== -1) mode = 'fixed';

            var spacingMatch = text.match(/\bco\s+(\d+(?:\.\d+)?)/);
            return {
                start: 0,
                length: parseFloat(split[1]),
                count: parseInt(split[2], 10),
                spacing: spacingMatch ? parseFloat(spacingMatch[1]) : 0,
                mode: mode,
                y: y,
            };
        }

        function buildDivisionPoints(config) {
            if (config.axis) {
                return pointsFromPipeCommand(config);
            }
            var length = Math.abs(config.length || 0);
            var start = config.start || 0;
            var y = config.y || 0;
            var positions;

            if (config.mode === 'fixed') {
                var spacing = config.spacing || 20;
                var placement = calculatePegPositions(length, 1, 0, 0, spacing, 'fixed');
                if (placement.error) throw new Error(placement.error.replace('⚠️ ', ''));
                positions = placement.positions;
            } else {
                var count = config.count || 1;
                var placement2 = calculatePegPositions(length, count, 0, 0, 0, config.mode || 'between');
                if (placement2.error) throw new Error(placement2.error.replace('⚠️ ', ''));
                positions = placement2.positions;
            }

            return positions.map(function(pos) {
                return { x: start + pos, y: y };
            });
        }

        function isEngineeringCommand(parsedSeries) {
            return parsedSeries.length > 0 &&
                   parsedSeries.every(function(s) { return s.type === 'division' && s.data && s.data.axis; });
        }

        function renderAsEngineering(parsedSeries) {
            if (komendaViewCard) komendaViewCard.style.display = 'none';

            var cfg = parsedSeries[0].data;
            var L  = cfg.length;
            var ms = cfg.marginStart || 0;
            var me = cfg.marginEnd   || 0;
            var n  = cfg.count;
            var spacing = (cfg.spacings && cfg.spacings.length > 1) ? cfg.spacings : (cfg.spacing || 0);
            var mode   = cfg.mode || 'between';
            var origin = cfg.origin || 0;
            var unit   = cfg.unit   || STATE.eng.unit || 'cm';

            STATE.eng.axis = cfg.axis || 'X';
            STATE.eng.unit = unit;

            if (L <= 0) {
                drawEmptyCanvas();
                graphResult.textContent = '⚠️ Podaj dodatnią długość.';
                return;
            }

            if (parsedSeries.length > 1) {
                var allSeries = [];
                parsedSeries.forEach(function(item) {
                    try {
                        var pts = pointsFromPipeCommand(item.data);
                        allSeries.push({ points: pts, label: item.data.label || 'P', r: item.data.r });
                    } catch(e) {}
                });
                drawEngineeringCanvasMulti(L, ms, me, allSeries, origin);
            } else {
                var placement = calculatePegPositions(L, n, ms, me, spacing, mode);
                if (placement.error) {
                    drawEmptyCanvas();
                    graphResult.textContent = placement.error;
                    return;
                }
                var positions = placement.positions.map(function(p) { return p + origin; });
                drawEngineeringCanvas(L, ms, me, positions, positions.length, placement.step, origin);
            }

            var unit2 = unit;
            var placement2 = calculatePegPositions(L, n, ms, me, spacing, mode);
            var step2 = placement2.step || 0;
            var step2Str = Array.isArray(step2) ? step2.map(function (s) { return formatNum(s); }).join('/') : formatNum(step2);
            var positions2 = (placement2.positions || []).map(function(p) { return p + origin; });
            var txt = '📏 ' + formatNum(L) + ' ' + unit2;
            if (ms > 0 || me > 0) txt += '  ↔ marginesy: ' + formatNum(ms) + '/' + formatNum(me) + ' ' + unit2;
            txt += '\n📐 Odstęp: ' + step2Str + (Array.isArray(step2) ? ' (naprzemiennie)' : '') + ' ' + unit2;
            txt += '\n\n📍 Pozycje:\n';
            positions2.forEach(function(pos, i) {
                txt += '  ' + (i + 1) + ': ' + formatNum(pos) + ' ' + unit2 + '\n';
            });
            graphResult.textContent = txt;
        }

        // [EN] Gdy true, updateGraph NIE auto-dopasowuje zakresu osi —
        // ustawiane przy ręcznej edycji pól "Zakres widoku", żeby ich nie nadpisywać.
        var skipBoundsFit = false;

        function updateGraph() {
            var command = graphCommand.value.trim();
            var bounds = getGraphBounds();
            setCommandError('graph', '');
            if (typeof updateGraphCmdBadge === 'function') updateGraphCmdBadge(command);
            STATE.graph.command = command;
            STATE.graph.xMin = bounds.xMin;
            STATE.graph.xMax = bounds.xMax;
            STATE.graph.yMin = bounds.yMin;
            STATE.graph.yMax = bounds.yMax;

            if (!command) {
                if (komendaViewCard) komendaViewCard.style.display = '';
                drawGraphBase(bounds);
                graphResult.textContent = '';
                return;
            }

            try {
                // --- Wieloseria: wspólny parser komend ---
                var parsedSeries = parseCommandSeries(command);

                // Inteligentny routing: podział 1D → belka drewniana
                if (isEngineeringCommand(parsedSeries)) {
                    renderAsEngineering(parsedSeries);
                    recordRecentCommand('graph', command);
                    return;
                }

                // Wykres / geometria → pokaż Zakres widoku
                if (komendaViewCard) komendaViewCard.style.display = '';

                var rawSeries = parsedSeries.map(function(item) { return item.raw; });

                // Zbierz wszystkie punkty i geometrie ze wszystkich serii
                var allGeos = [];
                var resultLines = [];
                var colors = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2'];
                var hasDivision = false;
                var hasFunction = false;
                var hasProportional = false; // okrąg/wielokąt — wymaga równej skali osi
                var fnCommands = [];

                parsedSeries.forEach(function(item, si) {
                    var s = item.raw;
                    var color = colors[si % colors.length];

                    // 1. Geometria 2D?
                    if (item.type === 'geometry') {
                        var geo = item.data;
                        if (geo.error) throw new Error(geo.error);
                        var pts = buildGeometryPoints(geo);
                        if (geo.type === 'okrag' || geo.type === 'wielokat' || geo.type === 'trojkat' || geo.type === 'widok') hasProportional = true;
                        allGeos.push({ geo: geo, points: pts, color: color });
                        var summary;
                        if (geo.type === 'rect') {
                            summary = 'Prostokąt ' + formatNum(geo.w) + '×' + formatNum(geo.h);
                        } else if (geo.type === 'siatka') {
                            summary = 'Siatka ' + formatNum(geo.w) + '×' + formatNum(geo.h) + ', co ' + formatNum(geo.dx) + '×' + formatNum(geo.dy) + ' (' + pts.length + ' pkt)';
                        } else if (geo.type === 'okrag') {
                            summary = 'Okrąg r=' + formatNum(geo.r) + ', środek (' + formatNum(geo.ox) + ', ' + formatNum(geo.oy) + ')';
                        } else if (geo.type === 'trojkat') {
                            summary = describeTriangle(pts, geo.pythagoras);
                        } else if (geo.type === 'wielokat' && geo.irregular) {
                            summary = describeIrregularPolygon(pts);
                        } else if (geo.type === 'wielokat') {
                            summary = 'Wielokąt foremny ' + geo.n + '-boczny, r=' + formatNum(geo.r) + ', środek (' + formatNum(geo.ox) + ', ' + formatNum(geo.oy) + ')';
                        } else if (geo.type === 'widok') {
                            summary = describeFov(geo);
                        } else {
                            summary = 'Punkt (' + formatNum(geo.x) + ', ' + formatNum(geo.y) + ')';
                        }
                        resultLines.push(summary);
                        // Dopasuj bounds (pomiń przy ręcznej edycji pól zakresu)
                        if (!skipBoundsFit) {
                            pts.forEach(function(pt) {
                                if (pt.x < bounds.xMin) { graphXMin.value = formatRawNum(pt.x - Math.abs(pt.x * 0.1) - 1); }
                                if (pt.x > bounds.xMax) { graphXMax.value = formatRawNum(pt.x + Math.abs(pt.x * 0.1) + 1); }
                                if (pt.y < bounds.yMin) { graphYMin.value = formatRawNum(pt.y - Math.abs(pt.y * 0.1) - 1); }
                                if (pt.y > bounds.yMax) { graphYMax.value = formatRawNum(pt.y + Math.abs(pt.y * 0.1) + 1); }
                            });
                            bounds = getGraphBounds();
                        }
                        return;
                    }

                    // 2. Komenda podziału 1D?
                    if (item.type === 'division') {
                        hasDivision = true;
                        var division = item.data;
                        var pts = buildDivisionPoints(division);
                        allGeos.push({ geo: { type: 'division', division: division }, points: pts, color: color });
                        resultLines.push(commandSummary(division, pts));
                        if (pts.length && !skipBoundsFit) {
                            var pxArr = pts.map(function(p) { return p.x; });
                            var pyArr = pts.map(function(p) { return p.y; });
                            var minX = Math.min.apply(Math, pxArr); var maxX = Math.max.apply(Math, pxArr);
                            var minY = Math.min.apply(Math, pyArr); var maxY = Math.max.apply(Math, pyArr);
                            if (minX < bounds.xMin || maxX > bounds.xMax) {
                                graphXMin.value = formatRawNum(Math.min(0, minX));
                                graphXMax.value = formatRawNum(maxX + Math.max(1, (maxX - minX) * 0.08));
                            }
                            if (minY <= bounds.yMin || maxY >= bounds.yMax) {
                                graphYMin.value = formatRawNum(minY - 4);
                                graphYMax.value = formatRawNum(maxY + 4);
                            }
                            bounds = getGraphBounds();
                        }
                        return;
                    }

                    // 3. Funkcja matematyczna
                    hasFunction = true;
                    fnCommands.push({ cmd: s, color: color });
                });

                // Okrąg/wielokąt — zrównaj skalę osi, żeby koło było okrągłe (nie elipsa)
                if (hasProportional && !skipBoundsFit) {
                    equalizeGraphAspect();
                    bounds = getGraphBounds();
                }

                // Rysuj bazę i geometrię
                drawGraphBase(bounds);

                // Rysuj geometrie (rect, siatka, punkt, division)
                var geosToRender = allGeos.filter(function(item) { return item.geo.type !== 'division'; });
                var divisionsToRender = allGeos.filter(function(item) { return item.geo.type === 'division'; });

                if (geosToRender.length > 0) {
                    drawGeometry(geosToRender, bounds);
                }

                divisionsToRender.forEach(function(item) {
                    var pts = item.points;
                    var color = item.color;
                    var labelPrefix = item.geo.division.label || 'P';
                    // Rysuj punkty ręcznie z danym kolorem
                    var ctx = graphCtx;
                    var w = graphCanvas.width; var h = graphCanvas.height;
                    var pad = 46;
                    ctx.font = '700 12px ' + getComputedStyle(document.body).fontFamily;
                    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                    pts.forEach(function(pt, idx) {
                        var p = graphToScreen(pt.x, pt.y, bounds, w, h, pad);
                        if (p.x < pad || p.x > w - pad || p.y < pad || p.y > h - pad) return;
                        var radius = pt.r || 7;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
                        ctx.fillStyle = color; ctx.fill();
                        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
                        ctx.fillStyle = '#0f172a';
                        ctx.fillText((pt.label || labelPrefix) + (idx + 1), p.x, p.y - radius - 5);
                    });
                });

                // Rysuj funkcje (każda innym kolorem)
                fnCommands.forEach(function(item) {
                    // Rysuj funkcję BEZ czyszczenia canvasa (drawGraphBase już wywołane wyżej)
                    var fn = compileGraphExpression(item.cmd);
                    var ctx = graphCtx;
                    var w = graphCanvas.width;
                    var h = graphCanvas.height;
                    var pad = 46;
                    var samples = Math.max(300, w - pad * 2);
                    var started = false;
                    ctx.strokeStyle = item.color;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    for (var ii = 0; ii <= samples; ii++) {
                        var xi = bounds.xMin + (ii / samples) * (bounds.xMax - bounds.xMin);
                        var yi = fn(xi);
                        if (!isFinite(yi) || Math.abs(yi) > 1e8) { started = false; continue; }
                        var p = graphToScreen(xi, yi, bounds, w, h, pad);
                        if (!started) { ctx.moveTo(p.x, p.y); started = true; } else { ctx.lineTo(p.x, p.y); }
                    }
                    ctx.stroke();
                    resultLines.push('f(x) = ' + stripFunctionPrefix(item.cmd));
                });

                // Legenda jeśli wieloseria
                if (rawSeries.length > 1) {
                    var ctx = graphCtx;
                    var pad = 46;
                    rawSeries.forEach(function(s, si) {
                        var color = colors[si % colors.length];
                        var legendX = pad + 8 + si * 100;
                        var legendY = 18;
                        ctx.fillStyle = color;
                        ctx.beginPath(); ctx.arc(legendX, legendY, 5, 0, Math.PI * 2); ctx.fill();
                        ctx.fillStyle = '#1e293b';
                        ctx.font = '11px ' + getComputedStyle(document.body).fontFamily;
                        ctx.textAlign = 'left';
                        ctx.fillText(s.length > 14 ? s.slice(0, 14) + '…' : s, legendX + 9, legendY + 4);
                    });
                }

                var bounds2 = getGraphBounds();
                var xStepRaw = parseFloat(graphXStep && graphXStep.value);
                var yStepRaw = parseFloat(graphYStep && graphYStep.value);
                var xStepInfo = (isFinite(xStepRaw) && xStepRaw > 0) ? xStepRaw : niceGridStep(bounds2.xMax - bounds2.xMin);
                var yStepInfo = (isFinite(yStepRaw) && yStepRaw > 0) ? yStepRaw : niceGridStep(bounds2.yMax - bounds2.yMin);

                var infoHeader = '📊 Zakres X: ' + formatNum(bounds2.xMin) + ' → ' + formatNum(bounds2.xMax) +
                    '   |   krok: ' + formatNum(xStepInfo) + '\n' +
                    '📊 Zakres Y: ' + formatNum(bounds2.yMin) + ' → ' + formatNum(bounds2.yMax) +
                    '   |   krok: ' + formatNum(yStepInfo) + '\n';

                graphResult.textContent = infoHeader + '\n' + (resultLines.join('\n\n') ||
                    'Rysuję: ' + stripFunctionPrefix(command));
                recordRecentCommand('graph', command);

            } catch (err) {
                drawGraphBase(bounds);
                setCommandError('graph', err.message || 'Nieprawidłowa komenda.');
                graphResult.textContent = '⚠️ ' + err.message +
                    '\n\nPrzykłady:\n  f(x)=sin(x)\n  rect=400x300\n  siatka=400x300 | co=100x100\n  punkt=150,200 | label=A\n  x(d)=120/4 | m=10 | y=0';
            }
        }

        graphDrawBtn.addEventListener('click', updateGraph);
        graphCommand.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                updateGraph();
            }
        });
        [graphXMin, graphXMax, graphYMin, graphYMax, graphXStep, graphYStep].forEach(function(input) {
            if (input) input.addEventListener('input', function() {
                // [EN] Ręczna zmiana zakresu — nie pozwól auto-dopasowaniu nadpisać wpisanej wartości
                skipBoundsFit = true;
                try { updateGraph(); } finally { skipBoundsFit = false; }
            });
        });
        document.addEventListener('click', function(e) {
            var chip = e.target.closest('.example-chip');
            if (!chip) return;
            var command = chip.getAttribute('data-command') || '';
            graphCommand.value = command;
            if (typeof updateGraphCmdBadge === 'function') updateGraphCmdBadge(command);
            updateGraph();
        });

        /* ============================================================
           [EN] CONSTANTS MODULE
           ============================================================ */
        function renderConstants() {
            if (STATE.constants.length === 0) {
                // [EN] Safe DOM creation — no innerHTML, no XSS
                var emptyLi = document.createElement('li');
                emptyLi.className = 'empty-state';
                var iconDiv = document.createElement('div');
                iconDiv.className = 'icon';
                iconDiv.textContent = '📭';
                var emptyP = document.createElement('p');
                emptyP.textContent = 'Brak zdefiniowanych stałych';
                emptyLi.appendChild(iconDiv);
                emptyLi.appendChild(emptyP);
                constList.replaceChildren();
                constList.appendChild(emptyLi);
                return;
            }

            constList.replaceChildren();
            STATE.constants.forEach(function(c, idx) {
                var li = document.createElement('li');
                li.className = 'const-item';
                // [EN] Safe DOM creation — no innerHTML, no XSS
                var infoDiv = document.createElement('div');
                infoDiv.className = 'info';
                var nameDiv = document.createElement('div');
                nameDiv.className = 'name';
                nameDiv.textContent = c.name;
                var detailDiv = document.createElement('div');
                detailDiv.className = 'detail';
                detailDiv.textContent = formatNum(c.value) + ' ' + (c.unit || '');
                infoDiv.appendChild(nameDiv);
                infoDiv.appendChild(detailDiv);

                var actionsDiv = document.createElement('div');
                actionsDiv.className = 'actions';
                var useBtn = document.createElement('button');
                useBtn.className = 'btn btn-sm btn-primary use-const';
                useBtn.setAttribute('data-idx', idx);
                useBtn.textContent = '🔢 Użyj';
                var delBtn = document.createElement('button');
                delBtn.className = 'btn btn-sm btn-danger del-const';
                delBtn.setAttribute('data-idx', idx);
                delBtn.textContent = '🗑️';
                actionsDiv.appendChild(useBtn);
                actionsDiv.appendChild(delBtn);

                li.appendChild(infoDiv);
                li.appendChild(actionsDiv);

                // [EN] Quick-calc row
                var quickDiv = document.createElement('div');
                quickDiv.className = 'quick-calc';
                // [EN] Safe DOM creation — no innerHTML, no XSS
                var multLabel = document.createElement('span');
                multLabel.style.fontSize = '0.75rem';
                multLabel.style.color = 'var(--text-muted)';
                multLabel.textContent = 'Pomnóż przez:';
                var multInput = document.createElement('input');
                multInput.type = 'number';
                multInput.className = 'quick-mult';
                multInput.value = '1';
                multInput.step = 'any';
                multInput.inputMode = 'decimal';
                multInput.setAttribute('aria-label', 'Mnożnik');
                var resultSpan = document.createElement('span');
                resultSpan.className = 'quick-result';
                resultSpan.id = 'quickResult' + idx;
                resultSpan.textContent = '= ' + formatNum(c.value);
                quickDiv.appendChild(multLabel);
                quickDiv.appendChild(multInput);
                quickDiv.appendChild(resultSpan);
                li.appendChild(quickDiv);

                constList.appendChild(li);
            });

            if (!constList.dataset.bound) {
                constList.dataset.bound = 'true';
                // [EN] Quick-calc events — use event delegation once
                constList.addEventListener('input', function(e) {
                    var input = e.target.closest('.quick-mult');
                    if (!input) return;
                    var li = input.closest('.const-item');
                    var useBtn = li.querySelector('.use-const');
                    var idx = parseInt(useBtn.getAttribute('data-idx'), 10);
                    var mult = parseFloat(input.value) || 1;
                    var resultSpan = li.querySelector('.quick-result');
                    if (resultSpan && STATE.constants[idx]) {
                        var result = STATE.constants[idx].value * mult;
                        resultSpan.textContent = '= ' + formatNum(result) + ' ' + (STATE.constants[idx].unit || '');
                    }
                });

                constList.addEventListener('click', function(e) {
                    var delBtn = e.target.closest('.del-const');
                    if (delBtn) {
                        var idx = parseInt(delBtn.getAttribute('data-idx'), 10);
                        var name = STATE.constants[idx] ? STATE.constants[idx].name : '';
                        STATE.constants.splice(idx, 1);
                        saveConstants();
                        renderConstants();
                        showToast('🗑️ Usunięto: ' + (name || 'stałą'), '');
                        return;
                    }

                    var useBtn = e.target.closest('.use-const');
                    if (useBtn) {
                        var idx2 = parseInt(useBtn.getAttribute('data-idx'), 10);
                        var c = STATE.constants[idx2];
                        if (c) {
                            var li = useBtn.closest('.const-item');
                            var multInput = li.querySelector('.quick-mult');
                            var mult = parseFloat(multInput.value) || 1;
                            var finalVal = c.value * mult;
                            calcExpr.value = String(finalVal);
                            calcExpr.setSelectionRange(calcExpr.value.length, calcExpr.value.length);
                            liveEval();
                            switchTab('calculator');
                            showToast('📊 ' + c.name + ' × ' + mult + ' = ' + formatNum(finalVal), 'success');
                        }
                    }
                });
            }
        }

        addConstBtn.addEventListener('click', function() {
            var name = constName.value.trim();
            var valueStr = constValue.value.trim();
            var unit = constUnit.value.trim();

            if (!name) { showToast('⚠️ Podaj nazwę stałej', 'error'); return; }
            if (!valueStr) { showToast('⚠️ Podaj wartość stałej', 'error'); return; }

            var value = parseFloat(valueStr);
            if (isNaN(value)) { showToast('⚠️ Nieprawidłowa wartość', 'error'); return; }

            STATE.constants.push({ name: name, value: value, unit: unit });
            saveConstants();
            renderConstants();
            constName.value = '';
            constValue.value = '';
            constUnit.value = '';
            showToast('✅ Dodano: ' + name, 'success');
        });

        /* ============================================================
           [EN] Keyboard Support for Calculator
           ============================================================ */
        document.addEventListener('keydown', function(e) {
            if (STATE.activeTab !== 'calculator') return;
            // [EN] Ignore if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

            var key = e.key;
            if (key >= '0' && key <= '9') { handleCalcAction(key); return; }
            if (key === '.') { handleCalcAction('.'); return; }
            if (key === '+') { handleCalcAction('+'); e.preventDefault(); return; }
            if (key === '-') { handleCalcAction('−'); e.preventDefault(); return; }
            if (key === '*') { handleCalcAction('×'); e.preventDefault(); return; }
            if (key === '/') { handleCalcAction('÷'); e.preventDefault(); return; }
            if (key === 'Enter' || key === '=') { handleCalcAction('='); e.preventDefault(); return; }
            if (key === 'Escape' || key === 'c' || key === 'C') { handleCalcAction('AC'); return; }
            if (key === 'Backspace') { handleCalcAction('⌫'); e.preventDefault(); return; }
            if (key === '%') { handleCalcAction('%'); return; }
        });

        /* ============================================================
           [EN] PWA — Service Worker Registration
           ============================================================ */
        function isDebugOrigin() {
            var host = window.location.hostname;
            return (
                window.location.protocol !== 'https:' ||
                host === 'localhost' ||
                host === '127.0.0.1' ||
                host === '0.0.0.0' ||
                host === '::1'
            );
        }

        function clearLocalServiceWorker() {
            var cleanupKey = 'matm0_dev_sw_cleanup_done';
            var tasks = [];

            if ('serviceWorker' in navigator) {
                tasks.push(
                    navigator.serviceWorker.getRegistrations().then(function(registrations) {
                        return Promise.all(registrations.map(function(reg) {
                            return reg.unregister();
                        }));
                    })
                );
            }

            if ('caches' in window) {
                tasks.push(
                    caches.keys().then(function(names) {
                        return Promise.all(names.map(function(name) {
                            if (name.indexOf('matm0-calc') === 0) {
                                return caches.delete(name);
                            }
                            return Promise.resolve(false);
                        }));
                    })
                );
            }

            return Promise.all(tasks).then(function() {
                if (navigator.serviceWorker && navigator.serviceWorker.controller && !sessionStorage.getItem(cleanupKey)) {
                    sessionStorage.setItem(cleanupKey, 'true');
                    window.location.replace(window.location.pathname + '?dev-cache-clear=' + Date.now());
                }
            });
        }

        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
                if (isDebugOrigin()) {
                    clearLocalServiceWorker().catch(function(err) {
                        console.warn('[EN] Local Service Worker cleanup failed:', err);
                    });
                    return;
                }

                navigator.serviceWorker.register('sw.js', { scope: './' })
                    .then(function(reg) {
                        console.log('[EN] Service Worker registered:', reg.scope);
                        // [EN] If there's a waiting worker (update pending), notify user
                        if (reg.waiting) {
                            showToast('🔄 Aktualizacja gotowa — kliknij 🔄', 'success');
                        }
                        // [EN] Listen for new SW updates
                        reg.addEventListener('updatefound', function() {
                            var newWorker = reg.installing;
                            if (!newWorker) return;
                            newWorker.addEventListener('statechange', function() {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    showToast('🔄 Aktualizacja gotowa — kliknij 🔄', 'success');
                                }
                            });
                        });
                    })
                    .catch(function(err) {
                        console.warn('[EN] Service Worker registration failed:', err);
                    });

                // [EN] Listen for messages from Service Worker (sw-updated notification)
                navigator.serviceWorker.addEventListener('message', function(event) {
                    if (event.data && event.data.action === 'sw-updated') {
                        console.log('[EN] SW updated — refreshing page');
                        window.location.reload();
                    }
                });
            });

        }

        // [EN] Cache Refresh Button — works regardless of SW presence
        //     Purges caches, unregisters SW, and hard reloads
        if (cacheRefreshBtn) {
            cacheRefreshBtn.addEventListener('click', function() {
                cacheRefreshBtn.classList.add('spinning');
                showToast('🔄 Czyszczenie cache…', '');

                function forceReload() {
                    setTimeout(function() {
                        window.location.reload(true);
                    }, 300);
                }

                // [EN] Try to purge via SW if available
                if ('serviceWorker' in navigator) {
                    if (navigator.serviceWorker.controller) {
                        navigator.serviceWorker.controller.postMessage({ action: 'purge-caches' });
                        navigator.serviceWorker.controller.postMessage({ action: 'skip-waiting' });
                    }
                    navigator.serviceWorker.getRegistrations().then(function(registrations) {
                        var unregisterPromises = registrations.map(function(reg) {
                            return reg.unregister();
                        });
                        return Promise.all(unregisterPromises);
                    }).then(function() {
                        // [EN] Nuke Cache Storage directly as a backup
                        if ('caches' in window) {
                            return caches.keys().then(function(names) {
                                return Promise.all(names.map(function(name) {
                                    return caches.delete(name);
                                }));
                            });
                        }
                    }).then(forceReload);
                } else {
                    // [EN] No SW — just clear regular caches and reload
                    if ('caches' in window) {
                        caches.keys().then(function(names) {
                            return Promise.all(names.map(function(name) {
                                return caches.delete(name);
                            }));
                        }).then(forceReload);
                    } else {
                        forceReload();
                    }
                }
            });
        }

        /* ============================================================
           [EN] PWA — Install Prompt (deferred)
           ============================================================ */
        var deferredPrompt = null;
        function isStandaloneMode() {
            return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        }

        function updateInstallButton() {
            if (!installAppBtn) return;
            installAppBtn.hidden = isStandaloneMode() || !deferredPrompt;
        }

        window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            deferredPrompt = e;
            updateInstallButton();
            // [EN] Show a subtle hint after 3 seconds
            setTimeout(function() {
                if (deferredPrompt) {
                    showToast('📲 Możesz zainstalować aplikację z przycisku w nagłówku', 'success');
                }
            }, 3000);
        });

        window.addEventListener('appinstalled', function() {
            deferredPrompt = null;
            updateInstallButton();
            showToast('✅ Aplikacja zainstalowana', 'success');
        });

        if (installAppBtn) {
            installAppBtn.addEventListener('click', function() {
                if (!deferredPrompt) {
                    showToast('W Samsung Internet użyj menu ⋮ i wybierz Dodaj do ekranu głównego', '');
                    return;
                }
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(function(choice) {
                    if (choice.outcome === 'accepted') {
                        showToast('✅ Instalowanie aplikacji', 'success');
                    }
                    deferredPrompt = null;
                    updateInstallButton();
                });
            });
            updateInstallButton();
        }

        /* ============================================================
           [EN] Lock body scroll on touch devices (PWA)
               Allow scroll only inside scrollable containers
           ============================================================ */
        document.addEventListener('touchmove', function(e) {
            /* [EN] Find the closest scrollable ancestor, if any */
            var el = e.target;
            while (el && el !== document.body) {
                var style = window.getComputedStyle(el);
                var overflowY = style.overflowY;
                var isScrollable = (
                    overflowY === 'auto' ||
                    overflowY === 'scroll' ||
                    overflowY === 'overlay'
                );
                if (isScrollable && el.scrollHeight > el.clientHeight) {
                    /* [EN] Container is scrollable — let the event through */
                    return;
                }
                el = el.parentElement;
            }
            /* [EN] No scrollable container found — block the scroll */
            e.preventDefault();
        }, { passive: false });

        /* ============================================================
           [EN] Canvas Zoom & Pan — shared utilities + Komenda canvas
           ============================================================ */
        function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
        var PAN_DAMPING   = 0.46;
        var PINCH_DAMPING = 0.46;
        var WHEEL_ZOOM_IN  = 1.0241;
        var WHEEL_ZOOM_OUT = 0.97614;

        function dampScale(startScale, rawScale, minScale, maxScale) {
            return clamp(startScale + (rawScale - startScale) * PINCH_DAMPING, minScale, maxScale);
        }

        /* ============================================================
           Zoom & Pan — Komenda canvas
        ============================================================ */
        var graphZoomState = {
            scale: 1, offsetX: 0, offsetY: 0,
            minScale: 0.25, maxScale: 4, step: 0.15,
        };

        var graphContainer   = $('#graphContainer');
        var graphCanvasWrapper = $('#graphCanvasWrapper');
        var graphZoomInBtn   = $('#graphZoomInBtn');
        var graphZoomOutBtn  = $('#graphZoomOutBtn');
        var graphZoomResetBtn = $('#graphZoomResetBtn');
        var graphZoomLabel   = $('#graphZoomLabel');
        var graphFsBtn       = $('#graphFsBtn');
        var graphFsExitBtn   = $('#graphFsExitBtn');
        var isGraphFsMode    = false;

        function applyGraphTransform(animate) {
            if (!graphCanvasWrapper || !graphContainer) return;
            var w = graphContainer.clientWidth;
            var h = graphContainer.clientHeight;
            var cw = graphCanvas.width  * graphZoomState.scale;
            var ch = graphCanvas.height * graphZoomState.scale;
            graphZoomState.offsetX = clamp(graphZoomState.offsetX, -cw + Math.min(w * 0.3, 80), w - Math.min(w * 0.3, 80));
            graphZoomState.offsetY = clamp(graphZoomState.offsetY, -ch + Math.min(h * 0.3, 60), h - Math.min(h * 0.3, 60));
            if (animate) {
                graphCanvasWrapper.classList.add('animating');
                clearTimeout(graphCanvasWrapper._animTimer);
                graphCanvasWrapper._animTimer = setTimeout(function() {
                    graphCanvasWrapper.classList.remove('animating');
                }, 260);
            } else {
                graphCanvasWrapper.classList.remove('animating');
            }
            graphCanvasWrapper.style.transform =
                'translate(' + graphZoomState.offsetX.toFixed(2) + 'px, ' +
                            graphZoomState.offsetY.toFixed(2) + 'px) ' +
                'scale(' + graphZoomState.scale.toFixed(4) + ')';
            if (graphZoomLabel) graphZoomLabel.textContent = Math.round(graphZoomState.scale * 100) + '%';
        }

        if (graphZoomInBtn)   graphZoomInBtn.addEventListener('click',   function() {
            graphZoomState.scale = clamp(graphZoomState.scale + graphZoomState.step, graphZoomState.minScale, graphZoomState.maxScale);
            applyGraphTransform(true);
        });
        if (graphZoomOutBtn)  graphZoomOutBtn.addEventListener('click',  function() {
            graphZoomState.scale = clamp(graphZoomState.scale - graphZoomState.step, graphZoomState.minScale, graphZoomState.maxScale);
            applyGraphTransform(true);
        });
        if (graphZoomResetBtn) graphZoomResetBtn.addEventListener('click', function() {
            graphZoomState.scale = 1; graphZoomState.offsetX = 0; graphZoomState.offsetY = 0;
            applyGraphTransform(true);
        });

        /* Pełny ekran */
        function enterGraphFs() {
            if (!graphContainer) return;
            graphContainer.classList.add('fs-mode');
            isGraphFsMode = true;
            if (graphFsBtn) graphFsBtn.style.display = 'none';
            if (graphContainer.requestFullscreen) graphContainer.requestFullscreen().catch(function(){});
            if (screen.orientation && typeof screen.orientation.lock === 'function') {
                screen.orientation.lock('landscape').catch(function() {});
            }
            setTimeout(function() { updateGraph(); }, 80);
            showToast('⛶ Pełny ekran — naciśnij ✕ żeby wyjść', '');
        }
        function exitGraphFs() {
            if (!graphContainer) return;
            graphContainer.classList.remove('fs-mode');
            isGraphFsMode = false;
            if (graphFsBtn) graphFsBtn.style.display = '';
            if (document.fullscreenElement) document.exitFullscreen().catch(function(){});
            if (screen.orientation && typeof screen.orientation.unlock === 'function') {
                screen.orientation.unlock();
            }
            setTimeout(function() { updateGraph(); }, 80);
        }
        if (graphFsBtn)     graphFsBtn.addEventListener('click',     enterGraphFs);
        if (graphFsExitBtn) graphFsExitBtn.addEventListener('click', exitGraphFs);
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && isGraphFsMode) exitGraphFs();
        });

        /* Pan — mysz */
        var isGraphDragging = false;
        var gDragStartX = 0, gDragStartY = 0, gDragOffX = 0, gDragOffY = 0;

        if (graphContainer) {
            graphContainer.addEventListener('mousedown', function(e) {
                if (e.button !== 0) return;
                isGraphDragging = true;
                graphContainer.classList.add('dragging');
                gDragStartX = e.clientX; gDragStartY = e.clientY;
                gDragOffX = graphZoomState.offsetX; gDragOffY = graphZoomState.offsetY;
                e.preventDefault();
            });
        }
        window.addEventListener('mousemove', function(e) {
            if (!isGraphDragging) return;
            graphZoomState.offsetX = gDragOffX + (e.clientX - gDragStartX) * PAN_DAMPING;
            graphZoomState.offsetY = gDragOffY + (e.clientY - gDragStartY) * PAN_DAMPING;
            applyGraphTransform(false);
        });
        window.addEventListener('mouseup', function() {
            if (!isGraphDragging) return;
            isGraphDragging = false;
            if (graphContainer) graphContainer.classList.remove('dragging');
        });

        /* Pan + pinch — dotyk */
        var gTouchId = null, gTouchStartDist = 0, gTouchStartScale = 1;
        var gPinchMidX = 0, gPinchMidY = 0, gPinchOffX = 0, gPinchOffY = 0, gPinchScale = 1;

        if (graphContainer) {
            graphContainer.addEventListener('touchstart', function(e) {
                if (e.touches.length === 1) {
                    if (e.target.closest('.fs-exit-btn')) return;
                    isGraphDragging = true;
                    graphContainer.classList.add('dragging');
                    gDragStartX = e.touches[0].clientX; gDragStartY = e.touches[0].clientY;
                    gDragOffX = graphZoomState.offsetX;  gDragOffY = graphZoomState.offsetY;
                    gTouchId = e.touches[0].identifier;
                    e.preventDefault();
                } else if (e.touches.length === 2) {
                    isGraphDragging = false;
                    graphContainer.classList.remove('dragging');
                    var dx = e.touches[1].clientX - e.touches[0].clientX;
                    var dy = e.touches[1].clientY - e.touches[0].clientY;
                    gTouchStartDist  = Math.sqrt(dx*dx + dy*dy);
                    gTouchStartScale = graphZoomState.scale;
                    gPinchScale      = graphZoomState.scale;
                    gPinchMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                    gPinchMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                    gPinchOffX = graphZoomState.offsetX; gPinchOffY = graphZoomState.offsetY;
                    gTouchId = null;
                }
            }, { passive: false });

            graphContainer.addEventListener('touchmove', function(e) {
                if (e.touches.length === 1 && isGraphDragging) {
                    graphZoomState.offsetX = gDragOffX + (e.touches[0].clientX - gDragStartX) * PAN_DAMPING;
                    graphZoomState.offsetY = gDragOffY + (e.touches[0].clientY - gDragStartY) * PAN_DAMPING;
                    applyGraphTransform(false);
                    e.preventDefault();
                } else if (e.touches.length === 2) {
                    var dx   = e.touches[1].clientX - e.touches[0].clientX;
                    var dy   = e.touches[1].clientY - e.touches[0].clientY;
                    var dist = Math.sqrt(dx*dx + dy*dy);
                    if (gTouchStartDist > 0) {
                        var rawScale   = gTouchStartScale * (dist / gTouchStartDist);
                        var newScale   = dampScale(gTouchStartScale, rawScale, graphZoomState.minScale, graphZoomState.maxScale);
                        var scaleRatio = newScale / gPinchScale;
                        graphZoomState.offsetX = gPinchMidX - scaleRatio * (gPinchMidX - gPinchOffX);
                        graphZoomState.offsetY = gPinchMidY - scaleRatio * (gPinchMidY - gPinchOffY);
                        graphZoomState.scale   = newScale;
                        gPinchScale = newScale;
                        gPinchOffX  = graphZoomState.offsetX; gPinchOffY = graphZoomState.offsetY;
                        applyGraphTransform(false);
                    }
                    e.preventDefault();
                }
            }, { passive: false });

            graphContainer.addEventListener('touchend', function(e) {
                var found = false;
                for (var i = 0; i < e.touches.length; i++) {
                    if (e.touches[i].identifier === gTouchId) { found = true; break; }
                }
                if (!found) {
                    isGraphDragging = false;
                    graphContainer.classList.remove('dragging');
                    gTouchId = null; gTouchStartDist = 0;
                }
            });

            /* Scroll kółkiem na desktopie */
            graphContainer.addEventListener('wheel', function(e) {
                e.preventDefault();
                var rect     = graphContainer.getBoundingClientRect();
                var mx       = e.clientX - rect.left;
                var my       = e.clientY - rect.top;
                var oldScale = graphZoomState.scale;
                var newScale = clamp(oldScale * (e.deltaY < 0 ? WHEEL_ZOOM_IN : WHEEL_ZOOM_OUT), graphZoomState.minScale, graphZoomState.maxScale);
                var ratio    = newScale / oldScale;
                graphZoomState.offsetX = mx - ratio * (mx - graphZoomState.offsetX);
                graphZoomState.offsetY = my - ratio * (my - graphZoomState.offsetY);
                graphZoomState.scale   = newScale;
                applyGraphTransform(false);
            }, { passive: false });
        }

        /* ============================================================
           [EN] Handle canvas resize
           ============================================================ */
        function handleCanvasResize() {
            if (STATE.activeTab === 'komenda') {
                updateGraph();
            }
        }

        window.addEventListener('resize', function() {
            clearTimeout(window._resizeTimer);
            window._resizeTimer = setTimeout(handleCanvasResize, 200);
        });

        /* ============================================================
           [EN] Initialization
           ============================================================ */
        /* ============================================================
           Autocomplete — Raycast-style suggestion dropdown
        ============================================================ */
        function buildACSuggestions() {
            var seen = {};
            var list = [];
            function add(syntax, description, command) {
                var key = String(syntax).toLowerCase().replace(/\s+/g, '');
                if (seen[key]) return;
                seen[key] = true;
                list.push({ syntax: expandTokens(syntax), description: description || '', command: command ? expandTokens(command) : null });
            }

            var caps = getParserCapabilities();
            ['engineering', 'graph'].forEach(function(k) {
                (caps[k] || []).forEach(function(c) { add(c.syntax, c.description, c.command); });
            });

            var defs = window.MATM0_COMMAND_DEFINITIONS || {};
            ['engineering', 'graph'].forEach(function(k) {
                (defs[k] || []).forEach(function(group) {
                    (group.items || []).forEach(function(item) {
                        add(item.syntax, item.description, item.command);
                    });
                });
            });
            return list;
        }

        var _acSuggestions = null;
        function getACSuggestions() {
            if (!_acSuggestions) _acSuggestions = buildACSuggestions();
            return _acSuggestions;
        }

        function acQueryFromInput(val) {
            // Extract the last segment after ;; or the last parameter after ,,
            var parts = val.split(';;');
            var lastSeries = parts[parts.length - 1];
            var params = lastSeries.split(',,');
            var lastParam = params[params.length - 1].trim();
            return lastParam.toLowerCase();
        }

        function acFilterSuggestions(query) {
            if (!query || query.length < 1) return [];
            var sug = getACSuggestions();
            var q = query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
            var results = [];
            sug.forEach(function(s) {
                var synLower = s.syntax.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
                var descLower = s.description.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
                // Prioritise: starts-with > contains in syntax > contains in description
                if (synLower.startsWith(q)) { results.unshift(s); }
                else if (synLower.includes(q)) { results.push(s); }
                else if (descLower.includes(q) && results.length < 8) { results.push(s); }
            });
            return results.slice(0, 7);
        }

        function initAutocomplete(inputEl, dropdownEl) {
            if (!inputEl || !dropdownEl) return;
            var activeIdx = -1;

            function closeAC() {
                dropdownEl.classList.remove('open');
                activeIdx = -1;
            }

            function openAC(items) {
                dropdownEl.replaceChildren();
                activeIdx = -1;
                items.forEach(function(item) {
                    var row = document.createElement('div');
                    row.className = 'autocomplete-item';
                    row.setAttribute('role', 'option');
                    var code = document.createElement('code');
                    code.textContent = item.syntax;
                    var desc = document.createElement('span');
                    desc.className = 'ac-desc';
                    desc.textContent = item.description;
                    row.appendChild(code);
                    row.appendChild(desc);

                    row.addEventListener('mousedown', function(e) {
                        e.preventDefault();
                        insertACSuggestion(item);
                        closeAC();
                    });
                    dropdownEl.appendChild(row);
                });
                dropdownEl.classList.add('open');
            }

            function insertACSuggestion(item) {
                var val = inputEl.value;
                var seriesParts = val.split(';;');
                var lastSeries = seriesParts[seriesParts.length - 1];
                var paramParts = lastSeries.split(',,');
                // Replace last param with selected command (or syntax if no command)
                var toInsert = item.command || item.syntax;
                paramParts[paramParts.length - 1] = ' ' + toInsert;
                seriesParts[seriesParts.length - 1] = paramParts.join(',,');
                inputEl.value = seriesParts.join(';;');
                inputEl.focus();
                // Trigger live update
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            }

            function setActiveItem(idx) {
                var rows = dropdownEl.querySelectorAll('.autocomplete-item');
                rows.forEach(function(r) { r.classList.remove('active'); });
                if (idx >= 0 && idx < rows.length) {
                    rows[idx].classList.add('active');
                    rows[idx].scrollIntoView({ block: 'nearest' });
                }
                activeIdx = idx;
            }

            inputEl.addEventListener('input', function() {
                var query = acQueryFromInput(inputEl.value);
                if (!query) { closeAC(); return; }
                var matches = acFilterSuggestions(query);
                if (!matches.length) { closeAC(); return; }
                openAC(matches);
            });

            inputEl.addEventListener('keydown', function(e) {
                if (!dropdownEl.classList.contains('open')) return;
                var rows = dropdownEl.querySelectorAll('.autocomplete-item');
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveItem(Math.min(activeIdx + 1, rows.length - 1));
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveItem(Math.max(activeIdx - 1, 0));
                } else if (e.key === 'Enter' || e.key === 'Tab') {
                    if (activeIdx >= 0 && rows[activeIdx]) {
                        e.preventDefault();
                        rows[activeIdx].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                    } else {
                        closeAC();
                    }
                } else if (e.key === 'Escape') {
                    closeAC();
                }
            });

            inputEl.addEventListener('blur', function() {
                // Small delay so mousedown on item fires first
                setTimeout(closeAC, 150);
            });

            document.addEventListener('click', function(e) {
                if (!dropdownEl.contains(e.target) && e.target !== inputEl) closeAC();
            });
        }

        /* ============================================================
           [EN] WARSZTAT — Sekcja 1: Powierzchnie i pokrycia
           Generic engine: licz pole figury, potem ile materiału je pokryje.
           ============================================================ */
        function initWarsztat() {
            var panel = $('#panel-warsztat');
            if (!panel) return;

            var wsState = {
                shape: 'rect', dimUnit: 'm', covMode: 'perUnit',
                volShape: 'box', volDimUnit: 'm',
                gridUnit: 'cm', gridMode: 'count',
                slMode: 'dims', pyMode: 'legs',
                elMode: 'UI', vdMat: 'cu', vdPhase: '1', convCat: 'length',
            };

            // [EN] Liczba z pola — pusty/niepoprawny zwraca fallback
            function num(sel, fallback) {
                var el = $(sel);
                if (!el) return fallback;
                var v = parseFloat(normalizeNumberText(el.value));
                return isFinite(v) ? v : fallback;
            }

            // [EN] Współczynnik zamiany wymiaru na metry
            function dimToMeters() { return wsState.dimUnit === 'cm' ? 0.01 : 1; }

            /* ---- Generyczny przełącznik (unit-toggle) ---- */
            function bindToggle(toggleSel, dataAttr, onPick) {
                var toggle = $(toggleSel);
                if (!toggle) return;
                toggle.addEventListener('click', function(e) {
                    var btn = e.target.closest('.unit-btn');
                    if (!btn) return;
                    toggle.querySelectorAll('.unit-btn').forEach(function(b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                    onPick(btn.getAttribute(dataAttr));
                });
            }

            /* ---- Tool 1A: Pole powierzchni ---- */
            function rawArea() {
                var k = dimToMeters();
                if (wsState.shape === 'rect') {
                    var w = num('#wsRectW', 0) * k, h = num('#wsRectH', 0) * k;
                    return { area: w * h, ok: w > 0 && h > 0 };
                }
                if (wsState.shape === 'circle') {
                    var d = num('#wsCircleD', 0) * k, r = d / 2;
                    return { area: Math.PI * r * r, ok: d > 0 };
                }
                // triangle
                var base = num('#wsTriBase', 0) * k, th = num('#wsTriH', 0) * k;
                return { area: 0.5 * base * th, ok: base > 0 && th > 0 };
            }

            function netArea() {
                var ra = rawArea();
                var count = num('#wsAreaCount', 1) || 1;
                var subtract = num('#wsAreaSubtract', 0) || 0;
                var net = Math.max(0, ra.area * count - subtract);
                return { net: net, single: ra.area, ok: ra.ok, count: count, subtract: subtract };
            }

            function renderArea() {
                var el = $('#wsAreaResult');
                var r = netArea();
                if (!r.ok) { el.textContent = 'Podaj wymiary…'; return; }
                var lines = [];
                lines.push('Pole: ' + formatNum(r.net) + ' m²');
                if (r.count !== 1 || r.subtract) {
                    lines.push('(1 szt.: ' + formatNum(r.single) + ' m² × ' + formatNum(r.count) +
                        (r.subtract ? ' − ' + formatNum(r.subtract) + ' m²' : '') + ')');
                }
                lines.push(formatNum(r.net * 10000) + ' cm²');
                el.textContent = lines.join('\n');
            }

            /* ---- Tool 1B: Ilość materiału (pokrycie) ---- */
            function updateCovRateLabel() {
                var lab = $('#wsCovRateLabel');
                if (lab) lab.textContent = wsState.covMode === 'perArea' ? 'Zużycie (jedn./m²)' : 'Wydajność (m²/jedn.)';
            }

            function renderCoverage() {
                var el = $('#wsCovResult');
                var area = num('#wsCovArea', 0);
                var rate = num('#wsCovRate', 0);
                if (!(area > 0) || !(rate > 0)) { el.textContent = 'Podaj pole i wydajność…'; return; }

                var base = wsState.covMode === 'perArea' ? area * rate : area / rate;
                var layers = num('#wsCovLayers', 1) || 1;
                var waste = num('#wsCovWaste', 0) || 0;
                var qty = base * layers * (1 + waste / 100);
                var unit = ($('#wsCovUnit').value || 'szt.').trim() || 'szt.';

                var lines = [];
                lines.push('Potrzeba: ' + formatNum(qty) + ' ' + unit);
                if (layers !== 1 || waste) {
                    lines.push('(' + formatNum(base) + ' bazowo × ' + formatNum(layers) + ' warstw' +
                        (waste ? ' +' + formatNum(waste) + '%' : '') + ')');
                }

                var perPack = num('#wsCovPerPack', 0);
                var packs = null;
                if (perPack > 0) {
                    packs = Math.ceil(qty / perPack);
                    lines.push('Opakowania: ' + packs + ' szt. (po ' + formatNum(perPack) + ' ' + unit + ')');
                }

                var price = num('#wsCovPrice', 0);
                if (price > 0 && packs != null) {
                    lines.push('Koszt: ' + formatNum(packs * price) + ' zł');
                } else if (price > 0) {
                    lines.push('Koszt: podaj „na opakowanie", by policzyć liczbę paczek');
                }
                el.textContent = lines.join('\n');
            }

            /* ---- Tool 2A: Objętość ---- */
            function volDimToMeters() { return wsState.volDimUnit === 'cm' ? 0.01 : 1; }

            function rawVolume() {
                var k = volDimToMeters();
                if (wsState.volShape === 'box') {
                    var l = num('#wsVolL', 0) * k, w = num('#wsVolW', 0) * k, d = num('#wsVolD', 0) * k;
                    return { vol: l * w * d, ok: l > 0 && w > 0 && d > 0 };
                }
                if (wsState.volShape === 'cylinder') {
                    var dia = num('#wsVolDia', 0) * k, h = num('#wsVolH', 0) * k, r = dia / 2;
                    return { vol: Math.PI * r * r * h, ok: dia > 0 && h > 0 };
                }
                // areaThick: pole w m², grubość w cm (stałe)
                var area = num('#wsVolArea', 0), thick = num('#wsVolThick', 0) * 0.01;
                return { vol: area * thick, ok: area > 0 && thick > 0 };
            }

            function totalVolume() {
                var rv = rawVolume();
                var count = num('#wsVolCount', 1) || 1;
                return { total: rv.vol * count, single: rv.vol, ok: rv.ok, count: count };
            }

            function renderVolume() {
                var el = $('#wsVolResult');
                var r = totalVolume();
                if (!r.ok) { el.textContent = 'Podaj wymiary…'; return; }
                var lines = [];
                lines.push('Objętość: ' + formatNum(r.total) + ' m³');
                if (r.count !== 1) lines.push('(1 szt.: ' + formatNum(r.single) + ' m³ × ' + formatNum(r.count) + ')');
                lines.push(formatNum(r.total * 1000) + ' litrów');
                el.textContent = lines.join('\n');
            }

            /* ---- Tool 3B: Siatka punktów (2D) ---- */
            function renderGrid() {
                var el = $('#wsGridResult');
                var unit = wsState.gridUnit;
                var W = num('#wsGridW', 0), H = num('#wsGridH', 0);
                if (!(W > 0) || !(H > 0)) { el.textContent = 'Podaj wymiary pola…'; return; }

                var cols, rows, dx, dy, lines = [];
                if (wsState.gridMode === 'spacing') {
                    dx = num('#wsGridDx', 0); dy = num('#wsGridDy', 0);
                    if (!(dx > 0) || !(dy > 0)) { el.textContent = 'Podaj odstępy dx i dy…'; return; }
                    cols = Math.floor(W / dx + 1e-9) + 1;
                    rows = Math.floor(H / dy + 1e-9) + 1;
                    lines.push('Punktów: ' + (cols * rows) + ' (' + cols + ' × ' + rows + ')');
                    lines.push('Odstęp: ' + formatNum(dx) + ' × ' + formatNum(dy) + ' ' + unit);
                    var lx = W - (cols - 1) * dx, ly = H - (rows - 1) * dy;
                    if (lx > 1e-6 || ly > 1e-6) lines.push('Zapas: X=' + formatNum(lx) + ', Y=' + formatNum(ly) + ' ' + unit);
                } else {
                    cols = Math.max(1, Math.round(num('#wsGridCols', 1) || 1));
                    rows = Math.max(1, Math.round(num('#wsGridRows', 1) || 1));
                    dx = cols > 1 ? W / (cols - 1) : 0;
                    dy = rows > 1 ? H / (rows - 1) : 0;
                    lines.push('Punktów: ' + (cols * rows) + ' (' + cols + ' × ' + rows + ')');
                    lines.push('Odstęp: dx=' + formatNum(dx) + ' × dy=' + formatNum(dy) + ' ' + unit);
                }
                el.textContent = lines.join('\n');
            }

            /* ---- Tool 4A: Spadek / nachylenie ---- */
            function updateSlVarLabel() {
                var lab = $('#wsSlVarLabel'), inp = $('#wsSlVar');
                if (!lab) return;
                if (wsState.slMode === 'percent') { lab.textContent = 'Spadek (%)'; if (inp) inp.placeholder = 'np. 2'; }
                else if (wsState.slMode === 'deg') { lab.textContent = 'Kąt (°)'; if (inp) inp.placeholder = 'np. 30'; }
                else { lab.textContent = 'Różnica wysokości'; if (inp) inp.placeholder = 'np. 15'; }
            }

            function renderSlope() {
                var el = $('#wsSlResult');
                var L = num('#wsSlLength', NaN);
                var v = num('#wsSlVar', NaN);
                if (!(L > 0) || isNaN(v)) { el.textContent = 'Podaj wartości…'; return; }

                var pct, ang, H;
                if (wsState.slMode === 'percent') { pct = v; ang = Math.atan(pct / 100); H = L * pct / 100; }
                else if (wsState.slMode === 'deg') { ang = v * Math.PI / 180; pct = Math.tan(ang) * 100; H = L * Math.tan(ang); }
                else { H = v; ang = Math.atan2(H, L); pct = H / L * 100; }

                var angDeg = ang * 180 / Math.PI;
                var skos = Math.sqrt(L * L + H * H);
                var lines = [];
                lines.push('Spadek: ' + formatNum(pct) + ' %');
                lines.push('Kąt: ' + formatNum(angDeg) + ' °');
                lines.push(Math.abs(H) > 1e-9 ? 'Stosunek: 1 : ' + formatNum(Math.abs(L / H)) : 'Stosunek: płasko');
                lines.push('Różnica wysokości: ' + formatNum(H));
                lines.push('Długość skosu: ' + formatNum(skos));
                el.textContent = lines.join('\n');
            }

            /* ---- Tool 4B: Kąt prosty (Pitagoras) ---- */
            function updatePyLabels() {
                var la = $('#wsPyALabel'), lb = $('#wsPyBLabel'), ia = $('#wsPyA'), ib = $('#wsPyB');
                if (!la) return;
                if (wsState.pyMode === 'leg') {
                    la.textContent = 'Przeciwprostokątna c'; if (ia) ia.placeholder = 'np. 5';
                    lb.textContent = 'Znane ramię a'; if (ib) ib.placeholder = 'np. 3';
                } else {
                    la.textContent = 'Bok a'; if (ia) ia.placeholder = 'np. 3';
                    lb.textContent = 'Bok b'; if (ib) ib.placeholder = 'np. 4';
                }
            }

            function renderPy() {
                var el = $('#wsPyResult');
                var a = num('#wsPyA', NaN), b = num('#wsPyB', NaN);
                if (wsState.pyMode === 'leg') {
                    if (!(a > 0) || !(b > 0)) { el.textContent = 'Podaj przeciwprostokątną i ramię…'; return; }
                    if (a <= b) { el.textContent = '⚠️ Przeciwprostokątna musi być większa od ramienia'; return; }
                    el.textContent = 'Brakujące ramię: ' + formatNum(Math.sqrt(a * a - b * b));
                } else {
                    if (!(a > 0) || !(b > 0)) { el.textContent = 'Podaj boki…'; return; }
                    el.textContent = 'Przeciwprostokątna (przekątna): ' + formatNum(Math.sqrt(a * a + b * b));
                }
            }

            /* ---- Tool 4C: Pole widzenia (kamera / czujnik / reflektor) ---- */
            function renderFov() {
                var el = $('#wsFovResult');
                var ang = num('#wsFovAngle', NaN), r = num('#wsFovRange', NaN);
                var az = num('#wsFovAzimuth', NaN);
                updateFovPreview(ang, isFinite(az) ? az : 0);
                if (ang > 0 && r > 0) {
                    var rad = Math.min(ang, 360) * Math.PI / 180;
                    var lines = [];
                    if (ang < 180) {
                        lines.push('Szerokość na wprost (na zasięgu ' + formatNum(r) + '): ' + formatNum(2 * r * Math.tan(rad / 2)));
                    } else {
                        lines.push('Kąt ≥ 180° — brak „szerokości na wprost" (widok dookolny).');
                    }
                    lines.push('Pole pokrycia: ' + formatNum(0.5 * r * r * rad));
                    lines.push('Łuk na zasięgu: ' + formatNum(r * rad));
                    if (isFinite(az)) {
                        lines.push('Kierunek: azymut ' + formatNum(az) + '°');
                        if (ang < 360) {
                            var norm360 = function (d) { d = d % 360; return d < 0 ? d + 360 : d; };
                            lines.push('Azymut rogów: lewy ' + formatNum(norm360(az - ang / 2)) + '°, prawy ' + formatNum(norm360(az + ang / 2)) + '°');
                        }
                    }
                    el.textContent = lines.join('\n');
                } else {
                    el.textContent = 'Podaj kąt i zasięg…';
                }
                // Dobór kąta (odwrotnie): szerokość + odległość → potrzebny kąt widzenia.
                var nEl = $('#wsFovNeedResult');
                if (nEl) {
                    var nw = num('#wsFovNeedWidth', NaN), nd = num('#wsFovNeedDist', NaN);
                    if (nw > 0 && nd > 0) {
                        var need = 2 * Math.atan2(nw / 2, nd) * 180 / Math.PI;
                        nEl.textContent = 'Potrzebny kąt widzenia: ≈ ' + formatNum(need) + '°' +
                            '\n(by z ' + formatNum(nd) + ' objąć szerokość ' + formatNum(nw) + ')';
                    } else {
                        nEl.textContent = 'Podaj szerokość i odległość…';
                    }
                }
            }

            // Mini-podgląd: klin o danym kącie, wierzchołek na środku, obrócony wg azymutu (kompas).
            function updateFovPreview(ang, azimuth) {
                var path = $('#wsFovWedge');
                if (!path) return;
                if (!(ang > 0)) { path.setAttribute('d', ''); return; }
                var capped = Math.min(ang, 360);
                var cx = 80, cy = 50, R = 38;
                var half = capped * Math.PI / 360;
                // 0° = góra (płn.); azymut rośnie zgodnie z zegarem (ekran: oś Y w dół)
                var base = (-90 + (azimuth || 0)) * Math.PI / 180;
                var a1 = base - half, a2 = base + half;
                var p1x = (cx + R * Math.cos(a1)).toFixed(2), p1y = (cy + R * Math.sin(a1)).toFixed(2);
                var p2x = (cx + R * Math.cos(a2)).toFixed(2), p2y = (cy + R * Math.sin(a2)).toFixed(2);
                var largeArc = capped > 180 ? 1 : 0;
                path.setAttribute('d', 'M' + cx + ',' + cy + ' L' + p1x + ',' + p1y +
                    ' A' + R + ',' + R + ' 0 ' + largeArc + ' 1 ' + p2x + ',' + p2y + ' Z');
            }

            /* ---- Tool 5A: Moc / prąd / napięcie (Ohm) ---- */
            function updateElLabels() {
                var la = $('#wsElALabel'), lb = $('#wsElBLabel'), ia = $('#wsElA'), ib = $('#wsElB');
                if (!la) return;
                if (wsState.elMode === 'PU') { la.textContent = 'Moc (W)'; ia.placeholder = 'np. 2000'; lb.textContent = 'Napięcie (V)'; ib.placeholder = 'np. 230'; }
                else if (wsState.elMode === 'PI') { la.textContent = 'Moc (W)'; ia.placeholder = 'np. 2000'; lb.textContent = 'Prąd (A)'; ib.placeholder = 'np. 10'; }
                else { la.textContent = 'Napięcie (V)'; ia.placeholder = 'np. 230'; lb.textContent = 'Prąd (A)'; ib.placeholder = 'np. 10'; }
            }

            function renderEl() {
                var el = $('#wsElResult');
                var a = num('#wsElA', NaN), b = num('#wsElB', NaN);
                if (!(a > 0) || !(b > 0)) { el.textContent = 'Podaj wartości…'; return; }
                var U, I, P;
                if (wsState.elMode === 'PU') { P = a; U = b; I = U !== 0 ? P / U : 0; }
                else if (wsState.elMode === 'PI') { P = a; I = b; U = I !== 0 ? P / I : 0; }
                else { U = a; I = b; P = U * I; }
                var R = I > 0 ? U / I : null;
                var lines = [
                    'Napięcie: ' + formatNum(U) + ' V',
                    'Prąd: ' + formatNum(I) + ' A',
                    'Moc: ' + formatNum(P) + ' W',
                ];
                if (R != null) lines.push('Opór: ' + formatNum(R) + ' Ω');
                el.textContent = lines.join('\n');
            }

            /* ---- Tool 5B: Koszt energii ---- */
            function renderEnergy() {
                var el = $('#wsEnResult');
                var power = num('#wsEnPower', 0), hours = num('#wsEnHours', 0), days = num('#wsEnDays', 0);
                if (!(power > 0) || !(hours > 0) || !(days > 0)) { el.textContent = 'Podaj moc i czas…'; return; }
                var kwh = power / 1000 * hours * days;
                var lines = ['Zużycie: ' + formatNum(kwh) + ' kWh'];
                var price = num('#wsEnPrice', 0);
                if (price > 0) lines.push('Koszt: ' + formatNum(kwh * price) + ' zł');
                el.textContent = lines.join('\n');
            }

            /* ---- Tool 5C: Spadek napięcia na kablu ---- */
            function renderVd() {
                var el = $('#wsVdResult');
                var L = num('#wsVdLen', 0), I = num('#wsVdCurrent', 0), S = num('#wsVdSection', 0), U = num('#wsVdVoltage', 230);
                if (!(L > 0) || !(I > 0) || !(S > 0)) { el.textContent = 'Podaj dane kabla…'; return; }
                var rho = wsState.vdMat === 'al' ? 0.0282 : 0.0175; // Ω·mm²/m
                var factor = wsState.vdPhase === '3' ? Math.sqrt(3) : 2;
                var dU = factor * L * I * rho / S;
                var lines = ['Spadek napięcia: ' + formatNum(dU) + ' V'];
                if (U > 0) lines.push('Spadek: ' + formatNum(dU / U * 100) + ' %');
                el.textContent = lines.join('\n');
            }

            /* ---- Tool 6A: Przelicznik jednostek ---- */
            var WS_UNITS = {
                length: { units: { 'mm': 0.001, 'cm': 0.01, 'm': 1, 'km': 1000, 'cal': 0.0254, 'stopa': 0.3048 }, def: ['m', 'cm'] },
                area:   { units: { 'mm²': 1e-6, 'cm²': 1e-4, 'm²': 1, 'ar': 100, 'ha': 10000, 'km²': 1e6 }, def: ['m²', 'cm²'] },
                volume: { units: { 'ml': 0.001, 'l': 1, 'cm³': 0.001, 'm³': 1000 }, def: ['m³', 'l'] },
                weight: { units: { 'g': 0.001, 'kg': 1, 't': 1000 }, def: ['kg', 'g'] },
            };

            function populateConvSelects() {
                var cat = WS_UNITS[wsState.convCat];
                var fromSel = $('#wsConvFrom'), toSel = $('#wsConvTo');
                if (!fromSel || !toSel) return;
                fromSel.replaceChildren();
                toSel.replaceChildren();
                Object.keys(cat.units).forEach(function(u) {
                    var o1 = document.createElement('option'); o1.value = u; o1.textContent = u; fromSel.appendChild(o1);
                    var o2 = document.createElement('option'); o2.value = u; o2.textContent = u; toSel.appendChild(o2);
                });
                fromSel.value = cat.def[0];
                toSel.value = cat.def[1];
            }

            function renderConv() {
                var el = $('#wsConvResult');
                var v = num('#wsConvValue', NaN);
                if (isNaN(v)) { el.textContent = 'Podaj wartość…'; return; }
                var units = WS_UNITS[wsState.convCat].units;
                var from = $('#wsConvFrom').value, to = $('#wsConvTo').value;
                if (!(from in units) || !(to in units)) { el.textContent = 'Podaj wartość…'; return; }
                var result = v * units[from] / units[to];
                el.textContent = formatNum(v) + ' ' + from + ' = ' + formatNum(result) + ' ' + to;
            }

            /* ---- Tool 6B: Zaokrąglenie do opakowań ---- */
            function renderAll() { renderArea(); renderCoverage(); renderVolume(); renderGrid(); renderSlope(); renderPy(); renderFov(); renderEl(); renderEnergy(); renderVd(); renderConv(); }

            /* ---- Pokaż pola właściwe dla kształtu ---- */
            function applyShapeVisibility() {
                panel.querySelectorAll('[data-shape-fields]').forEach(function(box) {
                    box.hidden = box.getAttribute('data-shape-fields') !== wsState.shape;
                });
            }

            function applyVolShapeVisibility() {
                panel.querySelectorAll('[data-volshape-fields]').forEach(function(box) {
                    box.hidden = box.getAttribute('data-volshape-fields') !== wsState.volShape;
                });
                // [EN] „Pole × grubość" nie używa jednostki wymiarów (pole=m², grubość=cm)
                var dimGroup = $('#wsVolDimUnitGroup');
                if (dimGroup) dimGroup.hidden = wsState.volShape === 'areaThick';
            }

            function applyGridModeVisibility() {
                var countGroup = $('#wsGridCountGroup'), spacingGroup = $('#wsGridSpacingGroup');
                if (countGroup) countGroup.hidden = wsState.gridMode === 'spacing';
                if (spacingGroup) spacingGroup.hidden = wsState.gridMode !== 'spacing';
            }

            /* ---- Wiązania ---- */
            bindToggle('#wsShapeToggle', 'data-shape', function(v) { wsState.shape = v; applyShapeVisibility(); renderArea(); });
            bindToggle('#wsDimUnitToggle', 'data-dimunit', function(v) { wsState.dimUnit = v; renderArea(); });
            bindToggle('#wsCovModeToggle', 'data-covmode', function(v) { wsState.covMode = v; updateCovRateLabel(); renderCoverage(); });
            bindToggle('#wsVolShapeToggle', 'data-volshape', function(v) { wsState.volShape = v; applyVolShapeVisibility(); renderVolume(); });
            bindToggle('#wsVolDimUnitToggle', 'data-voldimunit', function(v) { wsState.volDimUnit = v; renderVolume(); });
            bindToggle('#wsGridUnitToggle', 'data-gridunit', function(v) { wsState.gridUnit = v; renderGrid(); });
            bindToggle('#wsGridModeToggle', 'data-gridmode', function(v) { wsState.gridMode = v; applyGridModeVisibility(); renderGrid(); });
            bindToggle('#wsSlModeToggle', 'data-slmode', function(v) { wsState.slMode = v; updateSlVarLabel(); renderSlope(); });
            bindToggle('#wsPyModeToggle', 'data-pymode', function(v) { wsState.pyMode = v; updatePyLabels(); renderPy(); });
            bindToggle('#wsElModeToggle', 'data-elmode', function(v) { wsState.elMode = v; updateElLabels(); renderEl(); });
            bindToggle('#wsVdMatToggle', 'data-vdmat', function(v) { wsState.vdMat = v; renderVd(); });
            bindToggle('#wsVdPhaseToggle', 'data-vdphase', function(v) {
                wsState.vdPhase = v;
                var volt = $('#wsVdVoltage'); if (volt) volt.value = v === '3' ? '400' : '230';
                renderVd();
            });
            bindToggle('#wsConvCatToggle', 'data-convcat', function(v) { wsState.convCat = v; populateConvSelects(); renderConv(); });
            var convFrom = $('#wsConvFrom'), convTo = $('#wsConvTo');
            if (convFrom) convFrom.addEventListener('change', renderConv);
            if (convTo) convTo.addEventListener('change', renderConv);

            panel.addEventListener('input', function(e) {
                if (!e.target.matches('input')) return;
                renderAll();
            });

            var toCov = $('#wsAreaToCoverageBtn');
            if (toCov) toCov.addEventListener('click', function() {
                var r = netArea();
                if (!r.ok) { showToast('⚠️ Najpierw podaj wymiary', 'error'); return; }
                $('#wsCovArea').value = formatRawNum(r.net);
                renderCoverage();
                $('#wsCovArea').scrollIntoView({ behavior: 'smooth', block: 'center' });
                showToast('▽ Przeniesiono pole: ' + formatNum(r.net) + ' m²', 'success');
            });


            // [EN] Tap wyniku = kopiuj (jak w eng-result)
            ['#wsAreaResult', '#wsCovResult', '#wsVolResult', '#wsGridResult', '#wsSlResult', '#wsPyResult', '#wsFovResult', '#wsFovNeedResult', '#wsElResult', '#wsEnResult', '#wsVdResult', '#wsConvResult'].forEach(function(sel) {
                var el = $(sel);
                if (el) el.addEventListener('click', function() {
                    var t = el.textContent.trim();
                    if (!t || t.indexOf('Podaj') === 0) return;
                    copyText(t).then(function() { showToast('📋 Skopiowano', 'success'); }).catch(function() {});
                });
            });

            applyShapeVisibility();
            applyVolShapeVisibility();
            applyGridModeVisibility();
            updateCovRateLabel();
            updateSlVarLabel();
            updatePyLabels();
            updateElLabels();
            populateConvSelects();
            renderAll();
        }

        function init() {
            /* [EN] Wrap graph canvas for CSS zoom/pan */
            var graphFsExitEl = $('#graphFsExitBtn');
            if (graphFsExitEl && graphContainer) graphContainer.appendChild(graphFsExitEl);

            loadFromStorage();
            buildCalcButtons();
            calcExpr.addEventListener('input', liveEval);
            calcExpr.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); handleCalcAction('='); }
                if (e.key === 'Escape') { handleCalcAction('AC'); }
            });
            liveEval();
            renderHistory();
            updateGraph();
            renderConstants();
            renderAllRecentCommands();
            initAutocomplete(graphCommand, $('#graphCommandAC'));
            initWarsztat();

            // Inicjalizacja kreatora
            updateKreatorModeUI();
            updateKreatorPreview();
            if (typeof updateGraphCmdBadge === 'function') updateGraphCmdBadge(graphCommand.value.trim());
        }

        init();

        document.querySelectorAll('[data-command]').forEach(function(el) {
            el.setAttribute('data-command', expandTokens(el.getAttribute('data-command')));
        });

        function runParserSmokeTests() {
            var cases = [
                { name: 'podzial z liczba punktow', command: 'x=120/4 | m=10/10 | @edges', expect: 'division' },
                { name: 'podzial staly bez /liczby', command: 'x=120 | co=20 | opis=otwory', expect: 'division' },
                { name: 'wieloseria', command: 'x=120/4 ;; x=120/6 | y=30', expectCount: 2 },
                { name: 'geometria punkt', command: 'punkt=150,200 | label=A', expect: 'geometry' },
                { name: 'geometria siatka', command: 'siatka=400x300 | co=100x100', expect: 'geometry' },
                { name: 'funkcja sinus', command: 'f(x)=sin(x)', expect: 'function' },
            ];
            return cases.map(function(test) {
                try {
                    var parsed = parseCommandSeries(test.command);
                    var pass = !!parsed.length;
                    if (test.expect) pass = pass && parsed[0].type === test.expect;
                    if (test.expectCount) pass = pass && parsed.length === test.expectCount;
                    if (test.command === 'f(x)=sin(x)') {
                        var y = compileGraphExpression(test.command)(Math.PI / 2);
                        pass = pass && Math.abs(y - 1) < 1e-9;
                    }
                    return { name: test.name, pass: pass, parsed: parsed };
                } catch (err) {
                    return { name: test.name, pass: false, error: err.message };
                }
            });
        }

        function runCalcSmokeTests() {
            var cases = [
                // długość (zachowane stare zachowanie — baza mm)
                { expr: '2 cm + 5 mm', value: 25, unit: 'mm' },
                { expr: '5 km na mile', value: 3.106856, unit: 'mile', tol: 1e-3 },
                { expr: "5' + 6\"", value: 1676.4, unit: 'mm' },
                // masa
                { expr: '2 kg + 300 g', value: 2300, unit: 'g' },
                { expr: '5 funtow na kg', value: 2.267962, unit: 'kg', tol: 1e-4 },
                // czas
                { expr: '90 min na h', value: 1.5, unit: 'h' },
                { expr: '2 h + 30 min', value: 9000, unit: 's' },
                // temperatura (offset)
                { expr: '20 C na F', value: 68, unit: '°F' },
                { expr: '100 C na K', value: 373.15, unit: 'K' },
                { expr: '32 F na C', value: 0, unit: '°C' },
                // dane (binarnie)
                { expr: '2 GB na MB', value: 2048, unit: 'MB' },
                // objętość
                { expr: '1.5 l na ml', value: 1500, unit: 'ml' },
                // pole
                { expr: '2 ha na m2', value: 20000, unit: 'm2' },
                // kąt
                { expr: '180 deg na rad', value: Math.PI, unit: 'rad', tol: 1e-6 },
                // miks kategorii → brak konwersji (nie wybucha, po prostu bez wyniku jednostkowego)
                { expr: '2 kg + 3 cm', unit: null },
                // finanse PL (VAT)
                { expr: 'brutto 1000', value: 1230 },
                { expr: '1000 brutto', value: 1230 },
                { expr: 'netto 1230', value: 1000 },
                { expr: 'vat od 1000', value: 230 },
                { expr: 'brutto 1000 vat 8%', value: 1080 },
                { expr: 'vat 8% od 1000', value: 80 },
                // daty — deterministyczny zakres
                { expr: 'ile dni od 1.01.2026 do 1.02.2026', value: 31 },
            ];
            var results = cases.map(function(test) {
                try {
                    var res = evalCalcExpression(test.expr);
                    var pass = true;
                    if (test.value != null) pass = pass && Math.abs(res.value - test.value) <= (test.tol || 1e-9);
                    if (test.hasOwnProperty('unit')) pass = pass && res.unit === test.unit;
                    return { expr: test.expr, pass: pass, got: res.value, unit: res.unit };
                } catch (err) {
                    return { expr: test.expr, pass: false, error: err.message };
                }
            });
            // „ans"/„wynik" — z zapisem i odtworzeniem stanu, by nie zaśmiecić STATE.calc.ans
            var savedAns = STATE.calc.ans;
            STATE.calc.ans = null;
            results.push({ expr: 'ans*2 (bez wyniku)', pass: evalCalcExpression('ans*2').value === null, got: null });
            STATE.calc.ans = 15;
            results.push({ expr: 'ans*2 (ans=15)', pass: evalCalcExpression('ans*2').value === 30, got: evalCalcExpression('ans*2').value });
            results.push({ expr: 'wynik+5 (ans=15)', pass: evalCalcExpression('wynik + 5').value === 20, got: evalCalcExpression('wynik + 5').value });
            STATE.calc.ans = savedAns;
            // BigInt — dokładne duże liczby całkowite (+, −, ×)
            results.push({ expr: '99999999999999999+1 (BigInt)', pass: evalCalcExpression('99999999999999999+1').bigStr === '100000000000000000', got: evalCalcExpression('99999999999999999+1').bigStr });
            results.push({ expr: '123456789012345678+876543210987654322 (BigInt)', pass: evalCalcExpression('123456789012345678+876543210987654322').bigStr === '1000000000000000000', got: evalCalcExpression('123456789012345678+876543210987654322').bigStr });
            results.push({ expr: '10000000000000000-9999999999999999 (BigInt)', pass: evalCalcExpression('10000000000000000-9999999999999999').bigStr === '1', got: evalCalcExpression('10000000000000000-9999999999999999').bigStr });
            results.push({ expr: '99999999999*99999999999 (BigInt)', pass: evalCalcExpression('99999999999*99999999999').bigStr === '9999999999800000000001', got: evalCalcExpression('99999999999*99999999999').bigStr });
            results.push({ expr: '2+2 (zostaje float)', pass: evalCalcExpression('2+2').value === 4 && !evalCalcExpression('2+2').big, got: evalCalcExpression('2+2').value });
            // daty względne — sprawdzamy tylko, że zwracają sformatowaną datę (zależą od „dziś")
            results.push({ expr: 'za 3 tygodnie (data)', pass: !!evalCalcExpression('za 3 tygodnie').text, got: evalCalcExpression('za 3 tygodnie').text });
            results.push({ expr: 'jutro (data)', pass: !!evalCalcExpression('jutro').text, got: evalCalcExpression('jutro').text });
            results.push({ expr: 'ile dni do 1.09 (liczba)', pass: typeof evalCalcExpression('ile dni do 1.09').value === 'number', got: evalCalcExpression('ile dni do 1.09').text });
            // waluty — z zamockowanymi kursami (zapis/odtworzenie stanu fx)
            var savedFx = STATE.fx.rates, savedFxTs = STATE.fx.ts;
            STATE.fx.rates = { PLN: 1, EUR: 4.30, USD: 3.95 }; STATE.fx.ts = Date.now();
            results.push({ expr: '12 zł + 20 eur', pass: Math.abs(evalCalcExpression('12 zł + 20 eur').value - 98) < 1e-9, got: evalCalcExpression('12 zł + 20 eur').value });
            results.push({ expr: '20 eur na zł', pass: Math.abs(evalCalcExpression('20 eur na zł').value - 86) < 1e-9, got: evalCalcExpression('20 eur na zł').value });
            var cUnit = evalCalcExpression('100 zł na eur');
            results.push({ expr: '100 zł na eur (jednostka)', pass: cUnit.unit === 'EUR' && Math.abs(cUnit.value - 23.255813953) < 1e-6, got: cUnit.value + ' ' + cUnit.unit });
            STATE.fx.rates = savedFx; STATE.fx.ts = savedFxTs;
            return results;
        }

        function getHelpCoverageReport() {
            return {
                engineering: getMissingHelpCapabilities('engineering'),
                graph: getMissingHelpCapabilities('graph'),
            };
        }

        /* ============================================================
           [EN] Expose minimal API for debugging
           ============================================================ */
        if (typeof window !== 'undefined') {
            window.__matm0 = {
                state: STATE,
                switchTab: switchTab,
                updateGraph: updateGraph,
                renderConstants: renderConstants,
                renderHistory: renderHistory,
                parseCommandSeries: parseCommandSeries,
                getParserCapabilities: getParserCapabilities,
                getHelpCoverageReport: getHelpCoverageReport,
                runParserSmokeTests: runParserSmokeTests,
                runCalcSmokeTests: runCalcSmokeTests,
                evalCalcExpression: evalCalcExpression,
                loadFxRates: loadFxRates,
                resolveCalcCurrency: resolveCalcCurrency,
            };
        }

    })();
