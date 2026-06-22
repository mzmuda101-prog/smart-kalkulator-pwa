    (function() {
        'use strict';

        /* ============================================================
           [EN] SPIS TREŚCI app.js — skacz przez Ctrl-F do „[EN] <nazwa>".
           Dane (jednostki, miesiące, waluty) wydzielone do js/data-tables.js;
           definicje komend w command-definitions.js. Reszta to jeden IIFE
           ze wspólnym domknięciem (STATE + helpery) — sekcje:

             FUNDAMENT      Syntax Tokens · App State · DOM References
                            Persistence — LocalStorage · Toast · Haptic'stics
                            Tab Navigation
             KALKULATOR     STANDARD CALCULATOR — Button Layout
                            Calculator Logic (Raycast-style evaluator)
                            Daty i czas · Waluty (NBP) · Calculator History
             INŻYNIERIA     ENGINEERING MODULE — Logic · Event Binding
             POMOC          Help System (Search · Drawer · Command Help)
             WYKRES/GEOM    GRAPH MODULE · GRAPH 2D — Geometry parser
                            SCENA RYSUNKU · ANTY-NAKŁADANIE ETYKIET
             STAŁE          CONSTANTS MODULE (klasyfikator simple/op/expr)
             PWA/UI         Keyboard · Service Worker · Install Prompt
                            Lock body scroll · Canvas Zoom & Pan · Resize
             START          Initialization
             WARSZTAT       Sekcja 1: Powierzchnie i pokrycia (…)
             DEBUG          Expose minimal API (window.__matm0)
           ============================================================ */

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
            // Kursy walut (NBP + Frankfurter, opcjonalnie online — działa offline z cache)
            // source: 'nbp' | 'frankfurter' | 'merge' | 'cache' — co dostarczyło aktualne kursy.
            fx: { rates: null, ts: null, date: null, loading: false, error: null, source: null },
            // Ustawienia użytkownika (waluta domyślna, silnik kursów). Trwałe w localStorage.
            //   defaultCurrency — kod ISO waluty, do której zwijają się gołe sumy walutowe.
            //   fxEngine — 'auto' (NBP priorytet, Frankfurter dla reszty+backup) | 'nbp' | 'frankfurter'.
            //   fxBackup — dla trybów 'nbp'/'frankfurter': gdy główny silnik padnie, dobierz z drugiego.
            //   defaultUnits — domyślna jednostka WYŚWIETLANIA per kategoria fizyczna (np. speed→'km/h').
            //     '' = jednostka bazowa (jak dotąd). Dotyczy tylko gołych sum; jawne „X na Y" wygrywa.
            settings: { defaultCurrency: 'PLN', fxEngine: 'auto', fxBackup: true,
                        defaultUnits: { speed: '', length: '', mass: '', volume: '' },
                        notepadFold: false, // notatnik: zwijaj wyrażenia do wyników (tryb fold)
                        notepadAutoUnit: 'safe' }, // notatnik: auto-jednostki niezdefiniowane — 'safe' | 'full'
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

        // Notatnik (nakładka) [[project_kalkulator_notepad_planning]]
        const notepadBtn = $('#notepadBtn');
        const notepadModal = $('#notepadModal');
        const notepadClose = $('#notepadClose');
        const npBackdrop = $('#npBackdrop');
        const npEditor = $('#npEditor');
        const npTooltip = $('#npTooltip');
        const npListBtn = $('#npListBtn');
        const npFoldBtn = $('#npFoldBtn');
        const npNewBtn = $('#npNewBtn');
        const npTitle = $('#npTitle');
        const npListPanel = $('#npListPanel');
        const npListUl = $('#npListUl');

        // Settings modal
        const settingsBtn = $('#settingsBtn');
        const settingsModal = $('#settingsModal');
        const settingsBackdrop = $('#settingsBackdrop');
        const settingsClose = $('#settingsClose');
        const settingDefaultCurrency = $('#settingDefaultCurrency');
        const settingUnitSelects = Array.prototype.slice.call(document.querySelectorAll('#settingDefaultUnits select[data-unit-cat]'));
        const settingFxBackup = $('#settingFxBackup');
        const settingFxBackupRow = $('#settingFxBackupRow');
        const settingNotepadFold = $('#settingNotepadFold');
        const settingNotepadAutoUnit = $('#settingNotepadAutoUnit');
        const settingsFxStatus = $('#settingsFxStatus');
        const settingsVersion = $('#settingsVersion');
        const settingsCheckUpdate = $('#settingsCheckUpdate');

        // Update banner
        const updateBanner = $('#updateBanner');
        const updateBannerBtn = $('#updateBannerBtn');
        const updateBannerClose = $('#updateBannerClose');

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
        const graphCommandHL = $('#graphCommandHL');
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
        const constUnitDimensionless = $('#constUnitDimensionless');
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
            settings: 'matm0_settings',
            notepad: 'matm0_notepad',     // (legacy: pojedyncza notatka — migrowana do notepads)
            notepads: 'matm0_notepads',   // wiele notatek: { notes:[{id,text,updatedAt}], currentId }
            notepadGlobals: 'matm0_notepad_globals', // zmienne DZIELONE między notatkami (@nazwa)
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
                    if (fxObj && fxObj.rates) { STATE.fx.rates = fxObj.rates; STATE.fx.ts = fxObj.ts; STATE.fx.date = fxObj.date; STATE.fx.source = fxObj.source || 'cache'; }
                }
                const nps = localStorage.getItem(STORAGE_KEYS.notepads);
                if (nps) {
                    const npObj = JSON.parse(nps);
                    if (npObj && Array.isArray(npObj.notes)) {
                        _npNotes = npObj.notes.filter(function(n) { return n && typeof n.id === 'string'; });
                        _npCurrentId = npObj.currentId || (_npNotes[0] && _npNotes[0].id) || null;
                    }
                }
                if (!_npNotes.length) {
                    // Migracja starej pojedynczej notatki (matm0_notepad) → pierwsza notatka tablicy.
                    const npOld = localStorage.getItem(STORAGE_KEYS.notepad);
                    _npNotes = [{ id: _npNewId(), text: npOld != null ? npOld : '', updatedAt: Date.now() }];
                    _npCurrentId = _npNotes[0].id;
                }
                const npg = localStorage.getItem(STORAGE_KEYS.notepadGlobals);
                if (npg) { const go = JSON.parse(npg); if (go && typeof go === 'object') _npGlobals = go; }
                const st = localStorage.getItem(STORAGE_KEYS.settings);
                if (st) {
                    const stObj = JSON.parse(st);
                    if (stObj && typeof stObj === 'object') {
                        if (stObj.defaultCurrency) STATE.settings.defaultCurrency = String(stObj.defaultCurrency).toUpperCase();
                        if (stObj.fxEngine) STATE.settings.fxEngine = stObj.fxEngine;
                        if (typeof stObj.fxBackup === 'boolean') STATE.settings.fxBackup = stObj.fxBackup;
                        if (typeof stObj.notepadFold === 'boolean') STATE.settings.notepadFold = stObj.notepadFold;
                        if (stObj.notepadAutoUnit === 'safe' || stObj.notepadAutoUnit === 'full') STATE.settings.notepadAutoUnit = stObj.notepadAutoUnit;
                        if (stObj.defaultUnits && typeof stObj.defaultUnits === 'object') {
                            Object.keys(STATE.settings.defaultUnits).forEach(function(cat) {
                                if (typeof stObj.defaultUnits[cat] === 'string') STATE.settings.defaultUnits[cat] = stObj.defaultUnits[cat];
                            });
                        }
                    }
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

        function saveSettings() {
            try {
                localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(STATE.settings));
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
            '#settingsBtn',       /* przycisk ustawień */
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
            // [EN] Gdyby user wskoczył w inną zakładkę zanim tło się dogrzało — domknij resztę
            // kawałków OD RAZU (flush), żeby zakładka była kompletna; każde zadanie i tak raz.
            if (tabName !== 'calculator') flushDeferredInit();
            STATE.activeTab = tabName;
            var titles = {
                calculator: 'Kalkulator — Smart Kalkulator',
                komenda:    'Komenda — Smart Kalkulator',
                warsztat:   'Warsztat — Smart Kalkulator',
                constants:  'Moje Stałe — Smart Kalkulator',
            };
            document.title = titles[tabName] || 'Smart Kalkulator';
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
            if (tabName === 'calculator') {
                setTimeout(updatePlaceholderMarquee, 0); // panel widoczny → poprawny pomiar szerokości
            }
        }

        tabBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                switchTab(btn.getAttribute('data-tab'));
            });
        });

        // [EN] Dostosowania układu do SZEROKIEGO ekranu (≥1024px). Robione na starcie i przy
        // przekroczeniu progu media-query (nie ciągle, więc ręczne zmiany usera zostają).
        var _wideMQ = typeof matchMedia === 'function' ? matchMedia('(min-width: 1024px)') : null;
        var _historyHome = null; // pierwotne miejsce szuflady historii (do przywrócenia na wąskim)
        function syncWideLayout() {
            var wide = _wideMQ && _wideMQ.matches;
            // 1) Panel WEJŚCIA komendy domyślnie rozwinięty (sterowanie od razu widoczne obok wykresu).
            var kc = document.getElementById('komendaInputCard');
            if (kc && wide) kc.open = true;
            // 2) Historia jako STAŁY panel boczny kalkulatora (dok) zamiast wysuwanej szuflady.
            //    Przenosimy <aside> do #panel-calculator; CSS .history-drawer w środku panelu robi z niej
            //    statyczny panel. Na wąskim wracamy do bottom-sheet w pierwotnym miejscu.
            var panel = document.getElementById('panel-calculator');
            var drawer = document.getElementById('historyDrawer');
            if (panel && drawer) {
                if (wide && drawer.parentElement !== panel) {
                    _historyHome = { parent: drawer.parentElement, next: drawer.nextSibling };
                    document.body.classList.remove('history-open');
                    panel.appendChild(drawer);
                    drawer.setAttribute('aria-hidden', 'false');
                } else if (!wide && _historyHome && drawer.parentElement === panel) {
                    _historyHome.parent.insertBefore(drawer, _historyHome.next);
                    document.body.classList.remove('history-open');
                    drawer.setAttribute('aria-hidden', 'true');
                }
            }
        }
        if (_wideMQ) {
            syncWideLayout();
            if (_wideMQ.addEventListener) _wideMQ.addEventListener('change', syncWideLayout);
            else if (_wideMQ.addListener) _wideMQ.addListener(syncWideLayout);
        }

        // [EN] Zwijany górny pasek na mobilkach (≤1023px): grip tapem zwija/rozwija; scroll w dół
        // zwija, w górę rozwija. --header-h = zmierzona wysokość rozwiniętego paska (płynne zwijanie).
        // Na desktopie pasek zostaje na stałe (CSS i guard niżej). Odzyskane miejsce idzie do treści.
        var _narrowMQ = typeof matchMedia === 'function' ? matchMedia('(max-width: 1023px)') : null;
        var appHeaderEl = document.querySelector('.app-header');
        var headerGripEl = document.getElementById('headerGrip');
        var panelsEl = document.querySelector('.panels');
        function measureHeaderH() {
            if (!appHeaderEl || document.body.classList.contains('header-collapsed')) return;
            var h = appHeaderEl.getBoundingClientRect().height;
            if (h) document.documentElement.style.setProperty('--header-h', Math.round(h) + 'px');
        }
        function setHeaderCollapsed(on) {
            if (_narrowMQ && !_narrowMQ.matches) on = false; // desktop: zawsze rozwinięty
            document.body.classList.toggle('header-collapsed', !!on);
        }
        if (appHeaderEl) {
            measureHeaderH();
            window.addEventListener('resize', function() {
                if (!document.body.classList.contains('header-collapsed')) measureHeaderH();
                if (_narrowMQ && !_narrowMQ.matches) setHeaderCollapsed(false);
            });
            if (headerGripEl) {
                headerGripEl.addEventListener('click', function() {
                    setHeaderCollapsed(!document.body.classList.contains('header-collapsed'));
                });
            }
            if (panelsEl) {
                var _lastScrollY = 0;
                panelsEl.addEventListener('scroll', function() {
                    if (_narrowMQ && !_narrowMQ.matches) return;
                    var y = panelsEl.scrollTop;
                    if (y > _lastScrollY + 6 && y > 40) setHeaderCollapsed(true);
                    else if (y < _lastScrollY - 6) setHeaderCollapsed(false);
                    _lastScrollY = y;
                }, { passive: true });
            }
        }

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
        // Tablice danych przeniesione do js/data-tables.js (clean look) — czytamy z namespace.
        var CALC_UNIT_CATEGORIES = (window.MATM0_DATA || {}).UNIT_CATEGORIES || {};

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
            // --- Finanse PL: brutto / netto / VAT (domyślna stawka 23%, własna ze znakiem „%" na końcu).
            // „vat" znaczy POPRAWNĄ matematycznie operację, NIE alias 23% (patrz: minus VAT z brutta to
            // ÷1,23, nie ×0,77). Formy:
            //   • „brutto K" = K×(1+stawka),   „netto K" = K÷(1+stawka)   [stawka domyślnie 23%]
            //   • „K - vat"  = usuń VAT (÷),   „K + vat" = dodaj VAT (×)   → „1560 - vat" = 1268,29
            //   • „vat od K" = sama kwota podatku = K×stawka              → „vat od 1000" = 230
            // Stawkę własną podajesz „%" na końcu: „brutto 1000 8%", „1560 - vat 8%", „vat 8% od 1000".
            // Gołe „vat" (alias 23%) USUNIĘTE — eliminuje dwuznaczne „1500 vat". (Użytkownik może i tak
            // zdefiniować własną stałą o nazwie „vat" — rozwija się wcześniej i ją nadpisze.)
            function _vatRate(r) { var v = r != null ? parseFloat(String(r).replace(',', '.')) : 23; return isFinite(v) && v >= 0 ? v : 23; }
            // brutto = netto + VAT (×). „brutto 1000", „brutto 1000 8%", „1000 brutto"
            raw = raw.replace(/\bbrutto\s+([\d.,]+)(?:\s+([\d.,]+)\s*%)?/gi,
                function(_, x, r) { return '(' + x.replace(',', '.') + '*(1+' + _vatRate(r) + '/100))'; });
            raw = raw.replace(/([\d.,]+)\s+brutto\b(?:\s+([\d.,]+)\s*%)?/gi,
                function(_, x, r) { return '(' + x.replace(',', '.') + '*(1+' + _vatRate(r) + '/100))'; });
            // netto = brutto − VAT (÷). „netto 1230", „netto 1230 8%", „1230 netto"
            raw = raw.replace(/\bnetto\s+([\d.,]+)(?:\s+([\d.,]+)\s*%)?/gi,
                function(_, x, r) { return '(' + x.replace(',', '.') + '/(1+' + _vatRate(r) + '/100))'; });
            raw = raw.replace(/([\d.,]+)\s+netto\b(?:\s+([\d.,]+)\s*%)?/gi,
                function(_, x, r) { return '(' + x.replace(',', '.') + '/(1+' + _vatRate(r) + '/100))'; });
            // „K ± vat [r%]" — operator. „-" USUWA VAT (÷1+stawka), „+" DODAJE VAT (×1+stawka).
            // „1560 - vat" = 1560/1,23 = 1268,29; „1000 + vat 8%" = 1080. MUSI iść przed „vat od K".
            raw = raw.replace(/([\d.,]+)\s*([+\-])\s*vat(?:\s+([\d.,]+)\s*%)?/gi,
                function(_, a, op, r) {
                    a = a.replace(',', '.');
                    var f = '(1+' + _vatRate(r) + '/100)';
                    return '(' + a + (op === '-' ? '/' : '*') + f + ')';
                });
            // Sama kwota podatku: „vat od 1000" = 230, „vat 8% od 1000" = 80. Wymaga słowa „od".
            raw = raw.replace(/\bvat(?:\s+([\d.,]+)\s*%)?\s+od\s+([\d.,]+)/gi,
                function(_, r, x) { return '(' + x.replace(',', '.') + '*' + _vatRate(r) + '/100)'; });

            // "dodaj X% do Y"
            raw = raw.replace(/dodaj\s+([\d.,]+)%\s+do\s+([\d.,]+)/gi,
                function(_, p, b) { return '(' + b.replace(',', '.') + '*(1+' + p.replace(',', '.') + '/100))'; });
            // "X% z Y" / "X% of Y"
            raw = raw.replace(/([\d.,]+)%\s+(?:z|of)\s+([\d.,]+)/gi, '($2*$1/100)');
            // "X% od Y" (rabat skrótowy)
            raw = raw.replace(/([\d.,]+)%\s+od\s+([\d.,]+)/gi, '($2*(1-$1/100))');
            // „<wyrażenie> ± N%" — procent liczony OD CAŁEJ lewej bazy (jak w kalkulatorze telefonu i jak
            // „± vat"), o ile po procencie jest granica ADYTYWNA (`+`, `−` lub koniec). Dzięki temu:
            //   • „3*160 + 12%" = 480 + 12%·480 = 537,6 (procent od działania),
            //   • „537 + 12% + 5" = (537+12%) + 5 = 606,44 — procent NIE „gubi się", gdy coś idzie po nim,
            //   • „100 + 10% + 5%" = łańcuch (każdy procent od bieżącej bazy) = 115,5.
            // Iterujemy od LEWEJ (baza bez `%` → zawsze najwcześniejszy procent), aż zniknie. Bazę
            // podstawiamy dwukrotnie — bezpiecznie, bo waluty są już liczbami (resolveCalcCurrency biegnie
            // wcześniej), a własne jednostki bezwymiarowe liczą się tak samo w obu kopiach. Po `×`/`÷`
            // procent ZOSTAJE ułamkiem (`537 + 12%*12` = 537 + 0,12·12) — tam mnożenie przez ułamek jest
            // jednoznaczne; kto chce „(537+12%)·12" daje nawias. [[project_kalkulator_notepad_planning]]
            // UWAGA: baza to `[^%]*[^%\s]` (NIE `\S` na końcu — `\S` łapie też „%" i zjadałoby pierwszy
            // procent w łańcuchu „100+10%+10%", psując wynik). Baza nie może kończyć się na „%" ani spacji.
            var _pctRe = /^([^%]*[^%\s])\s*([+\-])\s*([\d.,]+)%(?=\s*(?:[+\-]|$))/;
            for (var _pctGuard = 0; _pctRe.test(raw) && _pctGuard < 40; _pctGuard++) {
                raw = raw.replace(_pctRe, function(_, base, op, b) {
                    return '(' + base + ')' + op + '((' + base + ')*' + b.replace(',', '.') + '/100)';
                });
            }
            // Samodzielne / pozostałe "N%" (po ×/÷, na początku wyrażenia itp.) → ułamek N/100
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

        // Stała może mieć wartość-LICZBĘ albo wartość-WYRAŻENIE/KOMENDĘ (np. „23%", „5+5*2",
        // „5+5*vat"). Podstawiamy SUROWY tekst wartości: proste (liczba lub „N%") wstawiamy gołe,
        // żeby reguły procentowe/VAT zadziałały (np. vat=„23%" → „100 - 23%”); złożone owijamy w
        // nawias, by zachować kolejność działań (np. c=„5+5*2” → „2*(5+5*2)”). Iterujemy kilka razy,
        // żeby obsłużyć stałą odwołującą się do innej stałej; stabilny wynik kończy pętlę.
        var _CONST_SIMPLE_RE = /^-?[\d.,]+%?$/;
        // Klasyfikacja wartości stałej → jak ją PODSTAWIĆ w wyrażeniu kalkulatora.
        //   • „simple"  — liczba albo „N%" (np. „4,80", „23%"): dosłownie, bez nawiasów.
        //   • „op"      — NIEDOKOŃCZONA operacja: zaczyna się od operatora (× ÷ * / ^ +),
        //                 np. „×5+2%", „*1,23", „+10": podstawiamy DOSŁOWNE (bez nawiasów),
        //                 żeby dopełniało bieżące wyrażenie: „100 marża" → „100×5+2%".
        //   • „expr"    — inne wyrażenie (np. „5+5*2"): owijamy w nawias, by zachować
        //                 kolejność działań (np. „2*stała" → „2*(5+5*2)").
        // Normalizujemy × → *, ÷ → / (operandy z klawiatury i z UI). UWAGA: „-5" to LICZBA
        // (simple), nie operacja — minus wiodący przy gołej liczbie traktujemy jako znak.
        function classifyConstValue(val) {
            var raw = String(val).trim();
            // Stała-FUNKCJA: wartość zawiera zmienną x i kompiluje się jako f(x).
            if (_valueIsFunc(raw)) return { mode: 'func', sub: raw, norm: raw };
            var norm = raw.replace(/×/g, '*').replace(/÷/g, '/');
            if (_CONST_SIMPLE_RE.test(norm)) return { mode: 'simple', sub: norm, norm: norm };
            if (/^[+*/^]/.test(norm) || /^-[^\d.,]/.test(norm)) return { mode: 'op', sub: norm, norm: norm };
            return { mode: 'expr', sub: '(' + norm + ')', norm: norm };
        }
        // ── Stałe-FUNKCJE = funkcje jednej zmiennej x, reużywają compileGraphExpression. BEZ markera „!":
        // SMART, kontekstowo — wartość jest funkcją, gdy zawiera samodzielne „x" ORAZ kompiluje się jako f(x).
        // To czysto oddziela funkcje od snippetów komend („x=120/4" ma x, ale się nie kompiluje → NIE funkcja).
        //   • KALKULATOR (resolveFunctionConstants): „test"=„50-(20x+5)" wywoływalne — „test(3)", „test 3",
        //     „3 test" → fn(3)=-15.
        //   • KOMENDA (resolveCommandConstants): ta sama stała podstawia się DOSŁOWNIE (x = zmienna wykresu),
        //     np. „f(x)=test" → „f(x)=50-(20x+5)".
        // Ciało używa tylko x + funkcji matematycznych (jak graf); „×"/„÷" → „*"/„/". [[project_kalkulator_constants_expressions]]
        function _valueIsFunc(val) {
            var v = String(val == null ? '' : val).trim().replace(/×/g, '*').replace(/÷/g, '/').replace(/\s+/g, '').toLowerCase();
            if (!/(^|[^a-z])x([^a-z]|$)/.test(v)) return false; // musi zawierać SAMODZIELNĄ zmienną x
            try { compileGraphExpression(v); return true; } catch (e) { return false; }
        }
        function _isFuncConst(c) { return !!c && _valueIsFunc(c.value); }
        function _funcConstBody(c) { return String(c.value).trim().replace(/×/g, '*').replace(/÷/g, '/'); }
        // Wywołania stałych-funkcji w KALKULATORZE. Sąsiedztwo („test 3"/„3 test") działa tylko gdy
        // operand jest po JEDNEJ stronie; operand z OBU stron („5 test 3") celowo NIE liczy się
        // (zamiast zgadywać i dać zły wynik) — wtedy użytkownik daje nawiasy „test(3)".
        function resolveFunctionConstants(raw, constants) {
            var funcs = (constants || []).filter(_isFuncConst);
            if (!funcs.length) return String(raw == null ? '' : raw);
            var result = String(raw);
            for (var pass = 0; pass < 5; pass++) {
                var before = result;
                funcs.forEach(function(c) {
                    if (!c.name) return;
                    var fn;
                    try { fn = compileGraphExpression(_funcConstBody(c)); }
                    catch (e) { return; }                       // niepoprawne ciało → pomijamy
                    var nm = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    var B = '(?![\\p{L}\\p{N}_])';              // prawa granica nazwy
                    var ARG = '(-?[\\d.,]+|[\\p{L}\\p{N}_]+)';  // liczba albo nazwa stałej
                    function argNum(s) {
                        if (/^-?[\d.,]+$/.test(s)) { var n = parseFloat(s.replace(',', '.')); return isFinite(n) ? n : null; }
                        var k = constants.filter(function(d) { return !_isFuncConst(d); })
                                         .filter(function(d) { return d.name && d.name.toLowerCase() === s.toLowerCase(); })[0];
                        if (k) { var v = constNumericValue(k); return isFinite(v) ? v : null; }
                        return null;
                    }
                    function out(a) { var v = fn(a); return isFinite(v) ? '(' + v + ')' : null; }
                    // (a) nawiasy: NAME(ARG) — jednoznaczne, zawsze.
                    result = result.replace(new RegExp('(^|[^\\p{L}\\p{N}_])' + nm + B + '\\s*\\(\\s*' + ARG + '\\s*\\)', 'giu'),
                        function(m, pre, arg) { var a = argNum(arg); if (a == null) return m; var r = out(a); return r == null ? m : pre + r; });
                    // (b) PO: <start|operator|(> NAME <sp> ARG — operand tylko z prawej.
                    result = result.replace(new RegExp('(^|[-+*/^(]\\s*)' + nm + B + '\\s+' + ARG, 'giu'),
                        function(m, pre, arg) { var a = argNum(arg); if (a == null) return m; var r = out(a); return r == null ? m : pre + r; });
                    // (c) PRZED: ARG <sp> NAME <end|operator|)> — operand tylko z lewej.
                    result = result.replace(new RegExp('(^|[^\\p{L}\\p{N}_)])' + ARG + '\\s+' + nm + B + '(?=\\s*(?:$|[-+*/^)]))', 'giu'),
                        function(m, pre, arg) { var a = argNum(arg); if (a == null) return m; var r = out(a); return r == null ? m : pre + r; });
                });
                if (result === before) break;
            }
            return result;
        }
        // Jednostka stałej do doklejenia: tylko ROZPOZNANA (CALC_UNITS lub waluta) — inaczej
        // zwracamy null i podstawiamy samą liczbę (żeby nieznana etykieta typu „szt" nie
        // psuła dotąd działającej liczbowej stałej). [[project_kalkulator_constants_expressions]]
        function _knownConstUnit(u) {
            u = String(u || '').trim();
            if (!u) return null;
            var low = u.toLowerCase();
            if (CALC_UNITS[low]) return u;
            if (_currencyTokenMap()[low]) return u;
            return null;
        }
        function resolveCalcConstants(raw, constants) {
            if (!constants || !constants.length) return raw;
            // Stałe-FUNKCJE najpierw: „test 3"/„test(3)" → fn(3). Reszta (zwykłe stałe) niżej.
            var result = resolveFunctionConstants(raw, constants);
            for (var pass = 0; pass < 5; pass++) {
                var before = result;
                constants.forEach(function(c) {
                    if (!c.name || c.kind === 'unit' || _isFuncConst(c)) return; // jednostki/funkcje obsłużone osobno
                    var escaped = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    var val = String(c.value).trim();
                    var info = classifyConstValue(val);
                    var sub = info.sub;
                    // Stała z JEDNOSTKĄ: dla GOŁEJ liczby doklejamy jednostkę, by silnik
                    // jednostek/walut ją podchwycił — „cena"=4,80 zł → „cena*12" = 57,6 zł;
                    // „dł"=120 cm → „dł na m" = 1,2 m. Tylko czyste liczby (operacje/wyrażenia/%
                    // bez jednostki) i tylko rozpoznane jednostki.
                    if (c.unit && info.mode === 'simple' && /^-?[\d.,]+$/.test(info.norm)) {
                        var u = _knownConstUnit(c.unit);
                        if (u) sub = info.norm + ' ' + u;
                    }
                    // Granice słowa ODPORNE NA POLSKIE ZNAKI (\b opiera się tylko na [A-Za-z0-9_],
                    // ucinał nazwy z diakrytykami jak „kwartał”). Klasa liter/cyfr Unicode (\p{L}\p{N}_,
                    // flaga u); lewa granica w grupie (bez lookbehind = szersza zgodność), prawa lookaheadem.
                    var re = new RegExp('(^|[^\\p{L}\\p{N}_])(' + escaped + ')(?![\\p{L}\\p{N}_])', 'giu');
                    result = result.replace(re, function(_m, pre) { return pre + sub; });
                });
                if (result === before) break;
            }
            return result;
        }

        // Regex nazw jednostek — najdłuższe najpierw, żeby „m2" nie złapało się jako „m".
        // Przebudowywalny: własne jednostki użytkownika (stałe kind:'unit') dochodzą po
        // wczytaniu i przy każdej zmianie. [[project_kalkulator_notepad_planning]]
        var _UNIT_NAMES_RE = '';
        function rebuildUnitNamesRe() {
            _UNIT_NAMES_RE = Object.keys(CALC_UNITS)
                .sort(function(a, b) { return b.length - a.length; })
                .map(function(u) { return u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); })
                .join('|');
        }
        // Własne jednostki (wariant A): token bez wartości, BEZ konwersji — każda to OSOBNA
        // kategoria (factor 1), więc tylko sumuje się z samą sobą i jedzie z liczbą; liczbowa
        // stała może ją nieść (jak „zł" przy „cena"). Furtka na B (kompozycja „zł/os.") zostaje
        // na przyszłość. Idempotentne: czyści poprzednio wstrzyknięte i wstrzykuje aktualne.
        function registerCustomUnits() {
            Object.keys(CALC_UNITS).forEach(function(k) {
                if (CALC_UNITS[k] && CALC_UNITS[k].custom) { delete CALC_UNITS[k]; delete CALC_UNIT_DISPLAY[k]; }
            });
            (STATE.constants || []).forEach(function(c) {
                if (!c || c.kind !== 'unit') return;
                var orig = String(c.unit || '').trim();
                var key = orig.toLowerCase();
                if (!key || CALC_UNITS[key]) return; // nie nadpisuj wbudowanej jednostki
                // dimensionless (domyślnie true — istniejące jednostki bez flagi = liczniki):
                // licznik (np. os./szt.) NIE blokuje waluty/innych; wymiarowa (false) trzyma wymiar.
                CALC_UNITS[key] = { cat: 'custom:' + key, factor: 1, base: orig, custom: true, dimensionless: c.dimensionless !== false };
                CALC_UNIT_DISPLAY[key] = orig;
            });
            rebuildUnitNamesRe();
        }
        rebuildUnitNamesRe();

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

            if (!hasUnits) return { expr: expr, unit: null, cat: null, valueInBase: 0 };
            // Domyślna jednostka wyświetlania (ustawienia) — dotyczy TYLKO gołych sum (tu);
            // jawna konwersja „X na Y" wraca wcześniej, więc zawsze wygrywa. displayFactor mówi
            // evalCalcExpression, przez ile podzielić wartość bazową, by pokazać w preferowanej.
            var pref = _preferredDisplayUnit(cat);
            if (pref) return { expr: expr, unit: pref.label, cat: cat, valueInBase: totalBase, displayFactor: pref.factor };
            return { expr: expr, unit: baseUnit, cat: cat, valueInBase: totalBase };
        }

        // Preferowana jednostka WYŚWIETLANIA dla kategorii (z ustawień). Generyczne — działa dla
        // dowolnej kategorii z CALC_UNITS; UI wystawia tylko część. Zwraca { label, factor } albo null.
        function _preferredDisplayUnit(cat) {
            var du = (STATE.settings && STATE.settings.defaultUnits) || {};
            var name = du[cat];
            if (!name) return null;
            var key = String(name).toLowerCase();
            var def = CALC_UNITS[key];
            if (!def || def.cat !== cat) return null; // nieznana/niepasująca → ignoruj (bezpiecznie)
            return { label: CALC_UNIT_DISPLAY[key] || name, factor: def.factor };
        }

        /* ============================================================
           [EN] Daty i czas — „za 3 tygodnie", „ile dni do 1.09", „dziś + 90 dni"
           ============================================================ */
        // _PL_MONTHS / _PL_WEEKDAYS przeniesione do js/data-tables.js (clean look).
        var _PL_MONTHS = (window.MATM0_DATA || {}).PL_MONTHS || {};
        var _PL_WEEKDAYS = (window.MATM0_DATA || {}).PL_WEEKDAYS || [];

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
        // _CUR_ALIAS przeniesione do js/data-tables.js (clean look).
        var _CUR_ALIAS = (window.MATM0_DATA || {}).CUR_ALIAS || {};
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
            // Gołe sumy walutowe zwijają się do waluty DOMYŚLNEJ (ustawienia). PLN zostaje
            // wewnętrzną osią (valueInBase), a wynik dzielimy przez kurs waluty docelowej.
            var def = (STATE.settings && STATE.settings.defaultCurrency) || 'PLN';
            if (def !== 'PLN') {
                var dRate = _currencyRate(def);
                if (dRate == null) return { expr: raw, unit: null, hasCurrency: true, pending: true };
                return { expr: '(' + expr + ')/' + dRate, unit: _currencyDisplay(def), valueInBase: totalPln, hasCurrency: true, pending: false };
            }
            return { expr: expr, unit: 'zł', valueInBase: totalPln, hasCurrency: true, pending: false };
        }

        // ── Dwa silniki kursów ──────────────────────────────────────────
        // Oba normalizują do tej SAMEJ osi co reszta kodu: rates[CODE] = ile PLN
        // za 1 jednostkę waluty (PLN:1). Dzięki temu resolveCalcCurrency jest wspólne.
        //
        //   • NBP (api.nbp.pl, tabela A, kursy średnie) — oficjalny polski kurs.
        //   • Frankfurter (api.frankfurter.app, dane EBC) — szeroki, „europejski".
        //
        // Tryb (STATE.settings.fxEngine):
        //   'auto'        → NBP priorytet dla par z PLN; Frankfurter dopełnia braki
        //                   i jest siatką bezpieczeństwa (merge, NBP wygrywa kolizje).
        //   'nbp'         → tylko NBP.
        //   'frankfurter' → Frankfurter priorytet, NBP jako backup (jak w pomyśle z wycinka).

        // NBP → { rates, date }. rates[CODE] = PLN za 1 jednostkę.
        function _fetchNbp() {
            return fetch('https://api.nbp.pl/api/exchangerates/tables/A?format=json')
                .then(function(r) { if (!r.ok) throw new Error('NBP HTTP ' + r.status); return r.json(); })
                .then(function(data) {
                    var table = data && data[0];
                    if (!table || !table.rates) throw new Error('NBP bad-data');
                    var rates = { PLN: 1 };
                    table.rates.forEach(function(x) { rates[x.code] = x.mid; });
                    return { rates: rates, date: table.effectiveDate || null };
                });
        }
        // Frankfurter → { rates, date }. API zwraca „X za 1 PLN", więc odwracamy na „PLN za 1 X".
        // Kanoniczny host to api.frankfurter.dev (stary api.frankfurter.app bywa niedostępny/bez CORS).
        function _fetchFrankfurter() {
            return fetch('https://api.frankfurter.dev/v1/latest?base=PLN')
                .then(function(r) { if (!r.ok) throw new Error('FR HTTP ' + r.status); return r.json(); })
                .then(function(data) {
                    if (!data || !data.rates) throw new Error('FR bad-data');
                    var rates = { PLN: 1 };
                    Object.keys(data.rates).forEach(function(code) {
                        var v = data.rates[code];
                        if (v > 0) rates[code] = 1 / v; // PLN za 1 jednostkę
                    });
                    return { rates: rates, date: data.date || null };
                });
        }

        function _commitFxRates(rates, date, source) {
            STATE.fx.rates = rates;
            STATE.fx.ts = Date.now();
            STATE.fx.date = date || null;
            STATE.fx.source = source;
            STATE.fx.error = null;
            try { localStorage.setItem(STORAGE_KEYS.fxRates, JSON.stringify({ rates: rates, ts: STATE.fx.ts, date: STATE.fx.date, source: source })); } catch (e) {}
        }

        // Pobranie kursów wg wybranego silnika. Cache + fallback offline.
        function loadFxRates() {
            if (STATE.fx.loading) return;
            if (typeof fetch !== 'function') { STATE.fx.error = 'no-fetch'; return; }
            STATE.fx.loading = true; STATE.fx.error = null;
            var mode = (STATE.settings && STATE.settings.fxEngine) || 'auto';

            function done() {
                STATE.fx.loading = false;
                if (typeof liveEval === 'function') liveEval();
                try { document.dispatchEvent(new CustomEvent('matm0-fx-updated')); } catch (e) {}
            }
            function fail(err) { STATE.fx.error = (err && err.message) || 'fetch-error'; }

            var backup = !(STATE.settings && STATE.settings.fxBackup === false); // domyślnie wł.
            var job;
            if (mode === 'nbp') {
                // NBP główny; gdy padnie i backup wł. — dobierz z Frankfurtera.
                job = _fetchNbp().then(function(n) { _commitFxRates(n.rates, n.date, 'nbp'); });
                if (backup) job = job.catch(function() { return _fetchFrankfurter().then(function(f) { _commitFxRates(f.rates, f.date, 'frankfurter'); }); });
            } else if (mode === 'frankfurter') {
                // Frankfurter główny; gdy padnie i backup wł. — NBP jako koło ratunkowe.
                job = _fetchFrankfurter().then(function(f) { _commitFxRates(f.rates, f.date, 'frankfurter'); });
                if (backup) job = job.catch(function() { return _fetchNbp().then(function(n) { _commitFxRates(n.rates, n.date, 'nbp'); }); });
            } else {
                // auto: oba równolegle, NBP wygrywa kolizje, Frankfurter dopełnia braki.
                job = Promise.allSettled([_fetchNbp(), _fetchFrankfurter()]).then(function(res) {
                    var nbp = res[0].status === 'fulfilled' ? res[0].value : null;
                    var fr  = res[1].status === 'fulfilled' ? res[1].value : null;
                    if (!nbp && !fr) throw new Error('both-failed');
                    if (nbp && fr) {
                        var merged = {};
                        Object.keys(fr.rates).forEach(function(c) { merged[c] = fr.rates[c]; });
                        Object.keys(nbp.rates).forEach(function(c) { merged[c] = nbp.rates[c]; }); // NBP nadpisuje
                        _commitFxRates(merged, nbp.date || fr.date, 'merge');
                    } else if (nbp) {
                        _commitFxRates(nbp.rates, nbp.date, 'nbp');
                    } else {
                        _commitFxRates(fr.rates, fr.date, 'frankfurter');
                    }
                });
            }
            job.catch(fail).then(done);
        }

        // Etykieta źródła kursów do UI (status, modal).
        function fxSourceLabel(src) {
            if (src === 'nbp') return 'NBP';
            if (src === 'frankfurter') return 'Frankfurter (EBC)';
            if (src === 'merge') return 'NBP + Frankfurter';
            if (src === 'cache') return 'cache (offline)';
            return '—';
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
                // Stałe NAJPIERW — ich wartości mogą zawierać „%", „vat", frazy naturalne, które
                // dopiero kolejne etapy (parseNaturalShortcuts) zamienią na właściwą matematykę.
                expr = resolveCalcConstants(expr, STATE.constants);
                // Waluty NAJPIERW (zaraz po stałych, PRZED parserem naturalnym): zamieniamy kwoty
                // walutowe na liczby (wartość w PLN / konwersja „na X") i zapamiętujemy docelową
                // jednostkę. Dzięki temu finanse/procenty/matematyka komponują się z walutą — token
                // waluty już nie blokuje reguł typu „brutto 12 zł", „12 pln - vat", „20% z 100 zł".
                var curRes = resolveCalcCurrency(expr);
                if (curRes.pending) return { value: null, unit: null, error: null, pendingFx: true };
                expr = curRes.expr;
                expr = parseNaturalShortcuts(expr);
                expr = resolveCalcAnswer(expr);
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
                var unitResult = resolveCalcUnits(expr);
                expr = unitResult.expr;
                // Własna jednostka (np. „os.") jest BEZWYMIAROWA — to licznik, nie wymiar fizyczny.
                // Nie kłóci się więc z walutą: „3 os. * 180 zł" = 540 zł (wygrywa ostatnia realna
                // jednostka — tu waluta). Blokujemy tylko miks WALUTY z FIZYCZNĄ jednostką
                // („12 gb − 12 zł"), który nie ma sensu. [[project_kalkulator_notepad_planning]]
                var unitIsCustom = unitResult.cat && String(unitResult.cat).indexOf('custom:') === 0;
                var customKey = unitIsCustom ? String(unitResult.cat).slice('custom:'.length) : null;
                var unitIsDimensionless = customKey && CALC_UNITS[customKey] && CALC_UNITS[customKey].dimensionless;
                if (curRes.hasCurrency && unitResult.unit !== null && !unitIsDimensionless) {
                    return { value: null, unit: null, error: null };
                }
                var unit = curRes.hasCurrency ? curRes.unit : unitResult.unit;
                expr = expr.replace(/,(?=\d)/g, '.');
                expr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
                expr = expr.replace(/\s+/g, '');
                if (!expr) return { value: null, unit: null, error: null };
                var fn = compileGraphExpression(expr);
                var value = fn(0);
                // Wartość policzona jest w jednostkach BAZOWYCH (expr ma podstawione bazy). Jeśli
                // resolveCalcUnits wskazał preferowaną jednostkę wyświetlania, przelicz wartość.
                if (!curRes.hasCurrency && unitResult.displayFactor) value = value / unitResult.displayFactor;
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

        // Placeholder-marquee pola wyrażenia: gdy podpowiedź nie mieści się (wąski ekran),
        // przewijamy ją ping-pongiem (CSS), by dała się odczytać w całości. Pokazujemy TYLKO
        // gdy pole puste; szerokość przewinięcia (--ph-shift) liczymy z realnego przepełnienia.
        var _calcPh = null, _calcPhInner = null;
        function updatePlaceholderMarquee() {
            if (!_calcPh) return;
            var empty = !calcExpr.value;
            _calcPh.classList.toggle('is-visible', empty);
            if (!empty) { _calcPh.classList.remove('is-scrolling'); return; }
            var over = _calcPhInner.offsetWidth - _calcPh.clientWidth;
            if (over > 2) {
                _calcPh.style.setProperty('--ph-shift', over + 'px');
                _calcPh.classList.add('is-scrolling');
            } else {
                _calcPh.classList.remove('is-scrolling');
                _calcPh.style.removeProperty('--ph-shift');
            }
        }
        function setupPlaceholderMarquee() {
            _calcPh = document.getElementById('calcPh');
            if (!_calcPh || !calcExpr) return;
            _calcPhInner = _calcPh.firstElementChild;
            if (calcExpr.parentElement) calcExpr.parentElement.classList.add('has-ph');
            // Zmiana szerokości zmienia zawijanie → przelicz też auto-wysokość pola.
            var onResize = function() { updatePlaceholderMarquee(); autoGrowExpr(); };
            window.addEventListener('resize', onResize);
            window.addEventListener('orientationchange', onResize);
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize).catch(function(){});
            updatePlaceholderMarquee();
            autoGrowExpr();
            setTimeout(onResize, 300); // po ustaleniu layoutu/fontów
        }

        // Auto-wysokość pola wyrażenia (textarea): rośnie z treścią, by długie wyrażenie ZAWIJAŁO
        // się w pionie zamiast przewijać poziomo. Kontener .calc-display ma overflow:hidden i trzyma
        // treść u dołu, więc gdy miejsca brak (rozwinięty nagłówek) ucina się GÓRA (najstarszy fragment),
        // a najnowszy wpisywany tekst zostaje widoczny tuż nad wynikiem. [[project_kalkulator_phone_calc_layout]]
        function autoGrowExpr() {
            if (!calcExpr) return;
            // Pusty: zostaw min-height (1 linia) — natywny placeholder jest długi i zawijałby się,
            // sztucznie pogrubiając puste pole; podpowiedź i tak rysuje nakładka .calc-ph.
            if (!calcExpr.value) { calcExpr.style.height = ''; return; }
            calcExpr.style.height = 'auto';
            calcExpr.style.height = calcExpr.scrollHeight + 'px';
        }

        function liveEval() {
            updatePlaceholderMarquee();
            autoGrowExpr();
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
            renderCalcResult(calcResult.textContent, display);
        }
        // *------------ Logika Animacji pojawiania się liczb/wyrażeń/wyniku* ----------------*
        // [EN] Render wyniku z lekką animacją pojawienia (Samsung-style) TYLKO zmienionej końcówki —
        // animuje się dodany/zmieniony znak, nie cała linijka. Statyczny wspólny prefiks zostaje
        // tekstem, a różnica trafia do ŚWIEŻEGO <span> (nowy element sam odpala animację CSS przy
        // wstawieniu — bez hacka z reflow). Definicja animacji + reduced-motion żyją w styles.css.
        // textContent czytany gdzie indziej (kopiowanie, „=") nadal zwraca pełny wynik.
        function renderCalcResult(prev, next) {
            calcResult.classList.remove('small', 'xsmall');
            if (next.length > 10) calcResult.classList.add('small');
            if (next.length > 14) calcResult.classList.add('xsmall');
            if (next === '' || next === prev) { calcResult.textContent = next; return; }
            // Animujemy DOKŁADNIE te znaki, które się realnie zmieniły. Diff liczymy na RDZENIU
            // (po usunięciu separatorów tysięcy — \s obejmuje też nbsp/wąską spację), bo „1 222"↔„12 222"
            // przesuwa separator i psułby porównanie po pozycjach. Wspólny prefiks rdzeni = część stała;
            // resztę animujemy. Dzięki temu: cały nowy wynik (45×9→405) animuje się w całości,
            // dopisanie cyfry (405→4275) animuje tylko zmienioną końcówkę, a pojedyncza cyfra na końcu
            // (1 222) tylko ją. Skrócenie (backspace) — nic nowego w rdzeniu → bez animacji.
            var pCore = prev.replace(/\s/g, ''), nCore = next.replace(/\s/g, '');
            var c = 0, lim = Math.min(pCore.length, nCore.length);
            while (c < lim && pCore.charAt(c) === nCore.charAt(c)) c++;
            if (c >= nCore.length) { calcResult.textContent = next; return; }
            // przelicz c (liczba niezmienionych znaczących znaków) na pozycję w SFORMATOWANYM next
            var idx = 0, counted = 0;
            while (idx < next.length && counted < c) {
                if (!/\s/.test(next.charAt(idx))) counted++;
                idx++;
            }
            while (idx < next.length && /\s/.test(next.charAt(idx))) idx++; // separator → do części stałej
            calcResult.textContent = next.slice(0, idx);  // statyczna, niezmieniona część
            var span = document.createElement('span');
            span.className = 'calc-result-new';
            span.textContent = next.slice(idx);           // świeży <span> sam odpala animację CSS
            calcResult.appendChild(span);
        }
        // *---------------------------------------------------------------------------------*
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
            var dims = setCanvasHiDPI(_canvas || graphCanvas, ctx);
            var w = dims.w;
            var h = dims.h;
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = '#94a3b8';
            ctx.font = lblFont('600', 16);
            ctx.textAlign = 'center';
            ctx.fillText('⚠️ Nieprawidłowe dane', w / 2, h / 2);
        }

        function drawEngineeringCanvasMulti(L, ms, me, allSeries, origin, _canvas, _ctx) {
            var COLORS = ['#2563eb', '#e11d48', '#16a34a', '#d97706', '#7c3aed', '#0891b2'];
            var ctx = _ctx || graphCtx;
            var dims = setCanvasHiDPI(_canvas || graphCanvas, ctx);
            var W = dims.w;
            var H = dims.h;
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
            ctx.font = lblFont('', 10);
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
                        ctx.font = lblFont('600', 9);
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
                    ctx.font = lblFont('600', 10);
                    ctx.textAlign = 'center';
                    ctx.textBaseline = above ? 'bottom' : 'top';
                    ctx.fillText(formatNum(pt.x !== undefined ? pt.x : pt) + ' ' + unit,
                        px, cy + (above ? -DOT_R - 3 : DOT_R + 3));
                });

                // Legenda — kolorowy punkt + nazwa serii
                var legendX = PAD_L + si * 110;
                ctx.beginPath(); ctx.arc(legendX + 6, 16, 5, 0, Math.PI * 2);
                ctx.fillStyle = color; ctx.fill();
                ctx.fillStyle = '#1e293b'; ctx.font = lblFont('600', 11);
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
            var dims = setCanvasHiDPI(_canvas || graphCanvas, ctx);
            var w = dims.w;
            var h = dims.h;
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
                    ctx.font = lblFont('600', 11);
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
                    ctx.font = lblFont('600', 11);
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
                ctx.font = lblFont('700', 12);
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
                    ctx.font = lblFont('600', 11);
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
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
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
                    ctx.font = lblFont('600', 11);
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
                    ctx.font = lblFont('600', 11);
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
                ctx.font = lblFont('700', 12);
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
                    ctx.font = lblFont('600', 11);
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

                    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
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
            // [EN] Katalog zdolności parsera dla gap-detektora ściągi (display-only — NIE wpływa
            // na właściwe regexy parsera). Każda pozycja ma JEDEN kanoniczny `term`, który musi
            // istnieć w odchudzonej ściądze (command-definitions.js). Dzięki temu sekcja
            // „Parser umie więcej" zostaje pusta, dopóki nie dojdzie naprawdę nieudokumentowana
            // funkcja. Synonimy (step=, every=, kolo=, dia=, kątXY=, hfov=, wys=, tilt= …) wciąż
            // działają w parserze — po prostu nie zaśmiecają ściągi.
            return {
                engineering: [
                    { syntax: 'x=120/4', command: 'x=120/4', description: 'podstawowy podzial osi X.', terms: ['x=120/4'] },
                    { syntax: 'y=L/N', command: 'y=200/5', description: 'podstawowy podzial osi Y.', terms: ['y=200/5'] },
                    { syntax: '120/4', command: '120/4', description: 'skrot bez nazwy osi.', terms: ['120/4'] },
                    { syntax: 'co=20', command: 'x=120 | co=20', description: 'staly odstep.', terms: ['co=20'] },
                    { syntax: 'co=20;30', command: 'x=120 | co=20;30', description: 'naprzemienny odstep: 20, 30, 20, 30...', terms: ['co=20;30'] },
                    { syntax: '@between / @edges / @centered', command: 'x=120/4 | @edges', description: 'tryby rozmieszczenia punktow.', terms: ['edges'] },
                    { syntax: 'm=10/20', command: 'x=120/4 | m=10/20', description: 'margines start/koniec.', terms: ['m=10/20'] },
                    { syntax: '<-10 / ->20', command: 'x=120/4 | <-10 | ->20', description: 'marginesy strzalkami.', terms: ['<-10'] },
                    { syntax: 'ms=10 / me=20', command: 'x=120/4 | ms=10 | me=20', description: 'margines jednostronny.', terms: ['ms=10'] },
                    { syntax: 'origin=50', command: 'x=120/4 | origin=50', description: 'przesuniecie poczatku osi.', terms: ['origin=50'] },
                    { syntax: 'x=30 / y=-2', command: 'y=120/4 | x=30', description: 'przesuniecie serii na drugiej osi.', terms: ['x=30'] },
                    { syntax: 'r=8', command: 'x=120/4 | r=8', description: 'promien punktu.', terms: ['r=8'] },
                    { syntax: 'u=mm', command: 'x=120/4 | u=mm', description: 'jednostka wyniku.', terms: ['u=mm'] },
                    { syntax: 'opis=A', command: 'x=120/4 | opis=A', description: 'nazwa serii.', terms: ['opis='] },
                    { syntax: ';;', command: 'x=120/4 ;; x=120/6 | y=30', description: 'wiele serii.', terms: [';;'] },
                ],
                graph: [
                    { syntax: 'f(x)=x', command: 'f(x)=x^2', description: 'funkcja matematyczna.', terms: ['f(x)='] },
                    { syntax: 'sin cos tan sqrt abs log ln exp', command: 'f(x)=sqrt(abs(x))', description: 'obslugiwane funkcje w wykresach.', terms: ['sin cos tan sqrt abs log ln exp'] },
                    { syntax: 'floor ceil round', command: 'f(x)=floor(x)', description: 'zaokraglenia.', terms: ['floor ceil round'] },
                    { syntax: 'pi / π / e', command: 'f(x)=sin(pi*x)', description: 'stale matematyczne.', terms: ['pi'] },
                    { syntax: 'punkt=150;200', command: 'punkt=150;200 | opis=A', description: 'punkt 2D.', terms: ['punkt=150;200'] },
                    { syntax: 'rect=WxH / prostokat=WxH', command: 'prostokat=400x300', description: 'prostokat 2D.', terms: ['prostokat=400x300'] },
                    { syntax: 'okrąg=R / circle=R', command: 'okrąg=100', description: 'okrag.', terms: ['okrag=r'] },
                    { syntax: 'wielokat=N;R', command: 'wielokat=6;100', description: 'wielokat foremny.', terms: ['wielokat=6;100'] },
                    { syntax: 'ox=50 / oy=50', command: 'rect=200x100 | ox=50 | oy=50', description: 'przesuniecie geometrii.', terms: ['ox=50'] },
                    { syntax: 'siatka=400x300', command: 'siatka=400x300 | co=100x100', description: 'siatka punktow.', terms: ['siatka=400x300'] },
                    { syntax: 'kamera=x;y | kąt=K | zasięg=Z', command: 'kamera=0;0 | kąt=110 | zasięg=15', description: 'pole widzenia 2D.', terms: ['kamera=0;0'] },
                    { syntax: ';;', command: 'f(x)=sin(x) ;; punkt=0;0', description: 'wiele serii na wykresie.', terms: [';;'] },
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
            refreshCmdHL();
            refreshCmdSyntaxHint();
        }

        // [PL] Live podpowiedź składni (jak w Excelu/Google Sheets): w trakcie pisania
        // pokazuje wzór komendy lub aktualnie wpisywanego parametru pod polem. Sygnatury są
        // statyczne (nasze, bezpieczne do wstrzyknięcia) — nie wstawiamy tu tekstu użytkownika.
        var graphCmdSyntaxEl = document.getElementById('graphCmdSyntax');
        var CMD_SIGNATURES = [
            { test: /^f\s*\(|^y\s*=/, head: 'f(x)=', sig: 'f(x)=<b>wyrażenie</b>', desc: 'wykres funkcji. Działa: + − * / ^, sin cos tan sqrt abs log ln exp, stałe π e.' },
            { test: /^(kamera|widok|fov|pole|stozek|sto[zż]ek)/, head: 'kamera', sig: 'kamera=<b>x;y[;z]</b> ,, kąt=<b>H[;V]</b> ,, zasięg=<b>Z</b> ,, [cel=x;y;z | azymut=A[;V] | kierunek=A[;V]] ,, [pochył=P] ,, [na=D1;D2]', desc: 'pole widzenia. z = wysokość, V = pionowy FOV. Skrót pozycyjny: kamera=x;y;z;kąt;zasięg.' },
            { test: /^(siatka|grid)/, head: 'siatka', sig: 'siatka=<b>WxH</b> ,, co=<b>dx x dy</b> ,, [ox= ,, oy=]', desc: 'siatka punktów w polu W×H (dx, dy = odstępy).' },
            { test: /^(rect|prostokat)/, head: 'rect', sig: 'rect=<b>WxH</b> ,, [ox= ,, oy= ,, label=]', desc: 'prostokąt; lewy dolny róg w 0;0.' },
            { test: /^(okrag|kolo|circle|okr[aą]g|ko[lł]o)/, head: 'okrag', sig: 'okrag=<b>R</b> ,, [ox= ,, oy=]', desc: 'okrąg o promieniu R, środek w 0;0.' },
            { test: /^(wielokat|wielok[aą]t|poly|figura)/, head: 'wielokat', sig: 'wielokat=<b>N;R</b>  |  wielokat=<b>x;y/x;y/…</b>', desc: 'foremny (N boków, promień R) lub nieforemny (lista wierzchołków przez /).' },
            { test: /^(trojkat|tr[oó]jk[aą]t|triangle)/, head: 'trojkat', sig: 'trojkat=<b>x;y/x;y/x;y</b>', desc: '3 wierzchołki → boki, kąty, pole, obwód.' },
            { test: /^(pitagoras|pythagoras)/, head: 'pitagoras', sig: 'pitagoras=<b>a;b</b>', desc: 'przyprostokątne a;b → przeciwprostokątna c.' },
            { test: /^(punkt|p)\s*=/, head: 'punkt', sig: 'punkt=<b>x;y</b> ,, [label=T ,, r=P ,, z=H]', desc: 'punkt 2D w (x;y).' },
            { test: /^x\s*\(|^[xy]\s*=/, head: 'oś / podział', sig: '<b>x=L/N</b>  |  x=L ,, co=<b>S</b> ,, [m=A/B ,, @edges ,, u=mm]', desc: 'podział osi: L = długość, N = liczba punktów, co = odstęp.' },
        ];
        var PARAM_ALIASES = {
            hfov: 'kąt', kat: 'kąt', katxy: 'kątxy', kat_poziomy: 'kątxy', 'kąt_poziomy': 'kątxy', kat_poz: 'kątxy', 'kąt_poz': 'kątxy',
            vfov: 'kątz', katz: 'kątz', pion: 'kątz', kat_pionowy: 'kątz', 'kąt_pionowy': 'kątz', kat_pion: 'kątz', 'kąt_pion': 'kątz', fovv: 'kątz', fov_v: 'kątz',
            fov: 'kąt', fov_h: 'kąt', angle: 'kąt',
            range: 'zasięg', zasieg: 'zasięg', tilt: 'pochył', pochyl: 'pochył', pochylenie: 'pochył', spad: 'pochył', 'spąd': 'pochył',
            wys: 'z', wysokosc: 'z', 'wysokość': 'z', h: 'z', target: 'cel', patrz: 'cel', bearing: 'azymut', kompas: 'azymut', dir: 'kierunek', kat_kier: 'kierunek',
            opis: 'label', nazwa: 'label', step: 'co', krok: 'co', every: 'co', odstep: 'co', co_x: 'co', margin: 'm', margines: 'm',
            przy: 'na', odl: 'na', dystans: 'na',
            x0: 'ox', od_x: 'ox', y0: 'oy', od_y: 'oy',
            unit: 'u', jednostka: 'u', dia: 'r', fi: 'r', 'ø': 'r',
            zero: 'origin', offset: 'origin', od: 'origin', ms: 'origin', start: 'origin', me: 'origin', end: 'origin',
        };
        var PARAM_SIGNATURES = {
            'cel':      { sig: 'cel=<b>x;y[;z]</b>', desc: 'wyceluj kamerę w punkt; z = wysokość celu.' },
            'azymut':   { sig: 'azymut=<b>A[;V]</b>', desc: 'A = kompas (0=płn., zgodnie z zegarem), V = pion (+ w górę).' },
            'kierunek': { sig: 'kierunek=<b>A[;V]</b>', desc: 'A = matematyczny (0=prawo, przeciwnie do zegara), V = pion (+ w górę).' },
            'kąt':      { sig: 'kąt=<b>H[;V]</b>', desc: 'H = poziomy FOV, V = pionowy (skrót zamiast kątZ).' },
            'kątxy':    { sig: 'kątXY=<b>H</b>', desc: 'poziomy FOV (płaszczyzna XY).' },
            'kątz':     { sig: 'kątZ=<b>V</b>', desc: 'pionowy FOV (oś Z) — potrzebny do rzutu na ziemię.' },
            'zasięg':   { sig: 'zasięg=<b>Z</b>', desc: 'zasięg widzenia (promień).' },
            'pochył':   { sig: 'pochył=<b>P</b>', desc: 'pochylenie w dół (0=poziomo, 90=prosto w dół).' },
            'na':       { sig: 'na=<b>D1[;D2;D3]</b>', desc: 'poprzeczne linie granic na podanych odległościach.' },
            'z':        { sig: 'z=<b>H</b>', desc: 'wysokość montażu nad ziemią (alias: wys, h).' },
            'co':       { sig: 'co=<b>S</b> | <b>S1;S2</b> | <b>dx x dy</b>', desc: 'odstęp: stały, naprzemienny lub siatka.' },
            'm':        { sig: 'm=<b>A/B</b>', desc: 'margines: A od początku, B od końca.' },
            'label':    { sig: 'label=<b>T</b>', desc: 'podpis serii/figury (opis/nazwa).' },
            'ox':       { sig: 'ox=<b>A</b>', desc: 'przesunięcie figury w poziomie (od 0;0). Alias: x0, od_x.' },
            'oy':       { sig: 'oy=<b>B</b>', desc: 'przesunięcie figury w pionie (od 0;0). Alias: y0, od_y.' },
            'r':        { sig: 'r=<b>P</b>', desc: 'promień kółka punktu / rozmiar znacznika. Alias: dia, fi, ø.' },
            'u':        { sig: 'u=<b>mm | cm | m</b>', desc: 'jednostka pokazywana w wynikach.' },
            'origin':   { sig: 'origin=<b>Z</b>', desc: 'wartość punktu zerowego osi. Alias: zero, offset, od.' },
        };
        // Konteksty: ten sam zapis znaczy co innego zależnie od komendy.
        // (np. w kamerze 'r' = zasięg, gdzie indziej = promień punktu).
        var PARAM_CONTEXT = {
            kamera: { r: 'zasięg', d: 'zasięg', 'długość': 'zasięg', dlugosc: 'zasięg' },
        };
        // Znajduje przedziały [start,end) rozdzielone wzorcem `re` (z zachowaniem offsetów w `text`).
        function splitRanges(text, re) {
            var ranges = [], last = 0, m;
            re.lastIndex = 0;
            while ((m = re.exec(text))) { ranges.push([last, m.index]); last = m.index + m[0].length; }
            ranges.push([last, text.length]);
            return ranges;
        }
        // Który przedział obejmuje kursor (caret); domyślnie ostatni.
        function rangeAtCaret(ranges, caret) {
            for (var i = 0; i < ranges.length; i++) {
                if (caret >= ranges[i][0] && caret <= ranges[i][1]) return { r: ranges[i], i: i };
            }
            return { r: ranges[ranges.length - 1], i: ranges.length - 1 };
        }
        // Sygnatura komendy/parametru — ŚWIADOMA KURSORA: bierze serię (;;) i parametr (,, |),
        // w którym aktualnie stoi caret, a nie zawsze ostatni.
        function cmdSyntaxFor(raw, caret) {
            if (!raw || !raw.trim()) return null;
            if (caret == null || caret < 0 || caret > raw.length) caret = raw.length;
            // 1) seria pod kursorem
            var sr = rangeAtCaret(splitRanges(raw, /;;/g), caret).r;
            var seriesText = raw.slice(sr[0], sr[1]);
            var caretInSeries = caret - sr[0];
            // 2) parametr pod kursorem w tej serii
            var segRanges = splitRanges(seriesText, /,,|\|/g);
            var hit = rangeAtCaret(segRanges, caretInSeries);
            var headSeg = seriesText.slice(segRanges[0][0], segRanges[0][1]).trim().toLowerCase();
            // Komenda-głowa tej serii (do okruszka „komenda › parametr" i fallbacku).
            var cmd = null;
            for (var i = 0; i < CMD_SIGNATURES.length; i++) {
                if (CMD_SIGNATURES[i].test.test(headSeg)) { cmd = CMD_SIGNATURES[i]; break; }
            }
            // 3) caret w dalszym parametrze (nie w głowie) → sygnatura tego parametru
            if (hit.i > 0) {
                var curKey = seriesText.slice(hit.r[0], hit.r[1]).trim().toLowerCase().split('=')[0].trim();
                if (curKey) {
                    // kontekst komendy potrafi przemapować (np. w kamerze r = zasięg)
                    var ctx = cmd && PARAM_CONTEXT[cmd.head];
                    var key = (ctx && ctx[curKey]) || PARAM_ALIASES[curKey] || curKey;
                    var bc = cmd ? cmd.head + ' › ' + key : key;          // okruszek
                    if (PARAM_SIGNATURES[key]) return { head: bc, sig: PARAM_SIGNATURES[key].sig, desc: PARAM_SIGNATURES[key].desc };
                    // nieznany parametr — pokaż komendę z notką, żeby user wiedział, że literówka/brak
                    if (cmd) return { head: cmd.head + ' › ' + curKey, sig: cmd.sig, desc: 'Parametr „' + curKey + '" — nierozpoznany lub bez osobnej podpowiedzi. ' + cmd.desc };
                }
            }
            // 4) inaczej (caret w głowie) → sygnatura komendy
            return cmd;
        }
        function refreshCmdSyntaxHint() {
            if (!graphCmdSyntaxEl) return;
            var info = null;
            try {
                var caret = (document.activeElement === graphCommand) ? graphCommand.selectionStart : null;
                info = cmdSyntaxFor(graphCommand.value, caret);
            } catch (e) { info = null; }
            if (!info) { graphCmdSyntaxEl.hidden = true; graphCmdSyntaxEl.innerHTML = ''; return; }
            // Kontekstowa legenda zapisu — tylko gdy w sygnaturze są symbole, które wymagają wyjaśnienia.
            var leg = [];
            if (/\[/.test(info.sig)) leg.push('[ ] = opcjonalne');
            if (/\|/.test(info.sig)) leg.push('| = albo');
            if (/;/.test(info.sig)) leg.push('; oddziela liczby (przecinek = ułamek)');
            graphCmdSyntaxEl.hidden = false;
            graphCmdSyntaxEl.innerHTML = '<span class="cs-head">' + info.head + '</span>'
                + '<span class="cs-sig">' + info.sig + '</span>'
                + (info.desc ? '<span class="cs-desc">' + info.desc + '</span>' : '')
                + (leg.length ? '<span class="cs-legend">' + leg.join(' · ') + '</span>' : '');
        }

        // [EN] Koloryzacja składni w polu komendy — podświetla separatory (;; serie,
        // ,, oraz | parametry) i znak =, żeby od razu było widać rozgraniczniki. Warstwa
        // .cmd-hl leży pod przezroczystą textareą; tekst budujemy jednym przebiegiem regex
        // (bez ponownego skanowania wstawionego HTML).
        // Podświetla nazwy zdefiniowanych stałych w polu komendy osobnym tokenem .cmd-const,
        // żeby było widać, że „belka"/„vat" są rozpoznane jako Twoje stałe. Działa na już
        // zescapowanym tekście serii; granice słowa odporne na polskie znaki (jak w resolverach).
        function highlightCmdConstants(escSegment) {
            var cs = STATE.constants;
            if (!cs || !cs.length) return escSegment;
            var names = cs.map(function(c) { return c.name; }).filter(Boolean)
                .sort(function(a, b) { return b.length - a.length; })
                .map(function(n) { return n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
            if (!names.length) return escSegment;
            var re = new RegExp('(^|[^\\p{L}\\p{N}_])(' + names.join('|') + ')(?![\\p{L}\\p{N}_])', 'giu');
            return escSegment.replace(re, function(_m, pre, name) {
                return pre + '<span class="cmd-const">' + name + '</span>';
            });
        }

        function refreshCmdHL() {
            if (!graphCommandHL || !graphCommand) return;
            var text = graphCommand.value;
            var esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            var parts = esc.split(/(;;)/);           // [seria0, ';;', seria1, ';;', …]
            var hasMulti = parts.length > 1;         // pas serii tylko gdy jest wiele serii
            var serIdx = 0;
            graphCommandHL.innerHTML = parts.map(function(part) {
                if (part === ';;') return '<span class="sep-series">;;</span>';
                // najpierw stałe (na czystym tekście), potem separatory — kolejność chroni przed
                // wstrzykiwaniem znaczników w już wstawione <span>.
                var inner = highlightCmdConstants(part).replace(/(,,|\|)/g, '<span class="sep">$1</span>');
                var cls = 'ser' + (serIdx % 6) + (hasMulti ? ' band' : '');
                serIdx++;
                return '<span class="' + cls + '">' + inner + '</span>';
            }).join('');
            graphCommandHL.scrollTop = graphCommand.scrollTop;
            graphCommandHL.scrollLeft = graphCommand.scrollLeft;
        }

        graphCommand.addEventListener('input', function() { updateGraphCmdBadge(graphCommand.value.trim()); });
        graphCommand.addEventListener('change', function() { updateGraphCmdBadge(graphCommand.value.trim()); });
        // Ruch kursora (klik, strzałki, zaznaczenie) — odśwież podpowiedź pod aktualną pozycją.
        ['keyup', 'click', 'select', 'focus'].forEach(function(ev) {
            graphCommand.addEventListener(ev, refreshCmdSyntaxHint);
        });
        graphCommand.addEventListener('scroll', function() {
            if (graphCommandHL) { graphCommandHL.scrollTop = graphCommand.scrollTop; graphCommandHL.scrollLeft = graphCommand.scrollLeft; }
        });
        refreshCmdHL();

        /* [PL] Własny uchwyt zmiany wysokości pola komendy — większy cel dotykowy niż
           natywny róg textarei. Pointer Events: jednolicie mysz / dotyk / pióro. */
        (function initCmdResize() {
            var grip = document.getElementById('graphCmdResize');
            if (!grip || !graphCommand) return;
            var startY = 0, startH = 0, active = false;
            function clampH(h) { return Math.max(60, Math.min(h, Math.round(window.innerHeight * 0.6))); }
            function onMove(e) {
                if (!active) return;
                graphCommand.style.height = clampH(startH + (e.clientY - startY)) + 'px';
                if (graphCommandHL) graphCommandHL.scrollTop = graphCommand.scrollTop;
                e.preventDefault();
            }
            function onUp(e) {
                active = false;
                grip.classList.remove('dragging');
                try { grip.releasePointerCapture(e.pointerId); } catch (_) {}
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
            }
            grip.addEventListener('pointerdown', function(e) {
                active = true;
                startY = e.clientY;
                startH = graphCommand.offsetHeight;
                grip.classList.add('dragging');
                try { grip.setPointerCapture(e.pointerId); } catch (_) {}
                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup', onUp);
                e.preventDefault();
            });
            // A11y: strzałki góra/dół zmieniają wysokość, gdy uchwyt ma fokus.
            grip.addEventListener('keydown', function(e) {
                if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
                graphCommand.style.height = clampH(graphCommand.offsetHeight + (e.key === 'ArrowDown' ? 24 : -24)) + 'px';
                if (graphCommandHL) graphCommandHL.scrollTop = graphCommand.scrollTop;
                e.preventDefault();
            });
            // Dwuklik/dwa tapnięcia w uchwyt — reset do wysokości domyślnej.
            grip.addEventListener('dblclick', function() { graphCommand.style.height = ''; });
        })();

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

        // [PL] Rozdziela składowe wartości (współrzędne, listy) po ';'. Średnik jest JEDYNYM
        // separatorem składowych — dzięki temu ',' jest wolny jako przecinek dziesiętny
        // (np. cel=10,5;8 → (10.5, 8); kąt=90;55 → poziom 90, pion 55).
        function splitVals(value) {
            return String(value == null ? '' : value).split(';').map(function(t) { return t.trim(); });
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

        // [EN] Twarda sanityzacja zakresu osi — żadne pole nie może rozwalić renderu:
        // wartości skończone i ograniczone co do wielkości (±1e9), odwrócone min/max
        // automatycznie zamieniane, a rozpiętość nigdy mniejsza niż 1e-6 (żeby mianowniki
        // w worldToScreen nie eksplodowały ani nie dzieliły przez ~0). To fundament,
        // na którym opiera się cała reszta zabezpieczeń.
        var GRAPH_AXIS_LIMIT = 1e9;
        function getGraphBounds() {
            function clampAxis(v, fb) {
                if (!isFinite(v)) return fb;
                return Math.max(-GRAPH_AXIS_LIMIT, Math.min(GRAPH_AXIS_LIMIT, v));
            }
            var xMin = clampAxis(parseGraphNumber(graphXMin.value, -10), -10);
            var xMax = clampAxis(parseGraphNumber(graphXMax.value, 10), 10);
            var yMin = clampAxis(parseGraphNumber(graphYMin.value, -10), -10);
            var yMax = clampAxis(parseGraphNumber(graphYMax.value, 10), 10);
            if (xMin > xMax) { var tx = xMin; xMin = xMax; xMax = tx; }
            if (yMin > yMax) { var ty = yMin; yMin = yMax; yMax = ty; }
            if (xMax - xMin < 1e-6) xMax = xMin + 1e-6;
            if (yMax - yMin < 1e-6) yMax = yMin + 1e-6;
            return { xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax };
        }

        // [EN] Kadr dopasowany do chmury punktów (fit-to-content): bbox + ~12% marginesu.
        // Dla zdegenerowanych przypadków (pojedynczy punkt / zerowa rozpiętość) daje sensowne
        // okno wokół. Zwraca null, gdy brak skończonych punktów.
        function fitBoundsToPoints(points) {
            var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (var i = 0; i < points.length; i++) {
                var p = points[i];
                if (!p || !isFinite(p.x) || !isFinite(p.y)) continue;
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            }
            if (!isFinite(minX)) return null;
            var spanX = maxX - minX, spanY = maxY - minY;
            var padX = spanX > 0 ? spanX * 0.12 : Math.max(1, Math.abs(maxX) * 0.5);
            var padY = spanY > 0 ? spanY * 0.12 : Math.max(1, Math.abs(maxY) * 0.5);
            return { xMin: minX - padX, xMax: maxX + padX, yMin: minY - padY, yMax: maxY + padY };
        }

        // [EN] Zrównuje skalę px/jednostkę na obu osiach (okrąg = okrąg, nie elipsa).
        // Tylko POWIĘKSZA zakres osi o większej skali — nic nie przycina.
        function equalizeGraphAspect() {
            var b = getGraphBounds();
            // [EN] Proporcje liczymy z AKTUALNEGO rozmiaru canvasa (a nie ze starych
            // GRAPH_LOGICAL_W/H sprzed poprzedniego renderu) — inaczej po zmianie rozmiaru
            // (portret/fullscreen/obrót) okrąg robi się elipsą, a stożki/prostokąty się rozciągają.
            var rect = graphCanvas.getBoundingClientRect();
            var cw = Math.round(rect.width) || GRAPH_LOGICAL_W;
            var ch = Math.round(rect.height) || GRAPH_LOGICAL_H;
            var drawW = cw - 2 * GRAPH_PAD;
            var drawH = ch - 2 * GRAPH_PAD;
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
        var GRAPH_LOGICAL_W = 900, GRAPH_LOGICAL_H = 520;
        var graphShowGrid = true;   // pasek narzędzi: siatka wł/wył (osie i liczby zostają)

        // [EN] Etykiety wizualizacji: w viewporcie świata mają STAŁĄ wielkość na ekranie
        // (graphLabelScale=1) — zoom zmienia zakres, nie skaluje bitmapy. Flaga szczegółu
        // steruje gęstością podpisów zależnie od dostępnego miejsca (ekran/mobilka/fullscreen).
        var graphLabelScale = 1;
        var showLabelDetail = true;
        var labelDetailLevel = 1;   // 0 = mniej podpisów (wąsko), 1 = normalnie, 2 = więcej (fullscreen)
        var graphLabelGap = 2;      // wymagany luz między etykietami; większy na małym canvasie = szybsze chowanie
        // Podkładka pod tekstem na canvasie — celowo ledwo widoczna (delikatnie odcina tekst
        // od linii/wypełnień, ale nie „zabrudza" rysunku). Jedno miejsce do regulacji.
        var GRAPH_LABEL_PLATE = 'rgba(255, 255, 255, 0.25)';
        function computeLabelScale() {
            // [EN] Viewport świata: zoom zmienia widoczny zakres i przerysowuje wektorowo,
            // więc 1 px logiczny = 1 px CSS. Etykiety mają STAŁĄ wielkość (graphLabelScale=1)
            // i zawsze są ostre — koniec z dzieleniem fontu przez skalę CSS.
            graphLabelScale = 1;
            var fs = (typeof isGraphFsMode !== 'undefined' && isGraphFsMode);
            var compact = !fs && (typeof window !== 'undefined') &&
                ((window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || window.innerWidth < 620);
            // Poziom szczegółu zależy od dostępnego miejsca (ekran), nie od zoomu:
            // pełny ekran = więcej podpisów, wąsko/mobilka = mniej (mniej tłoku).
            labelDetailLevel = fs ? 2 : (compact ? 0 : 1);
            showLabelDetail = labelDetailLevel >= 1;
            // Mało miejsca (mobilka / mały canvas) → większy wymagany luz, więc etykiety
            // szybciej się chowają zamiast nachodzić. Zoom/fullscreen → mniejszy luz, więcej pokazane.
            var tiny = (GRAPH_LOGICAL_W < 430 || GRAPH_LOGICAL_H < 330);
            graphLabelGap = (!fs && (compact || tiny)) ? 7 : 2;
        }
        function lblFont(weight, px) {
            var size = Math.max(8, Math.round(px * graphLabelScale));
            return (weight ? weight + ' ' : '') + size + 'px ' + getComputedStyle(document.body).fontFamily;
        }

        // [EN] HiDPI/retina: bufor canvasa = logiczny rozmiar × skala (devicePixelRatio
        // z lekkim supersamplingiem), a kontekst skalujemy. Dzięki temu twarde piksele
        // kodu (pad, fonty, grubości linii) pozostają logiczne, a obraz jest ostry —
        // mniej pikselozy, zwłaszcza przy zoomie CSS i dużych liczbach. Limit ×3, by nie
        // tworzyć gigantycznego bufora. Zwraca logiczne wymiary do rysowania.
        function setCanvasHiDPI(canvas, ctx) {
            canvas = canvas || graphCanvas;
            ctx = ctx || graphCtx;
            // [EN] Rozmiar logiczny = realny rozmiar CSS canvasa (responsywny — wypełnia
            // kontener). Gdy element jest ukryty (rect=0), używamy ostatniego znanego /
            // domyślnego, by nie rysować do bufora 0×0.
            var rect = canvas.getBoundingClientRect();
            var logicalW = Math.round(rect.width)  || canvas._logicalW || 900;
            var logicalH = Math.round(rect.height) || canvas._logicalH || 520;
            canvas._logicalW = logicalW;
            canvas._logicalH = logicalH;
            // Trzymaj globalne wymiary rysowania w zgodzie (czytane przez funkcje rysujące).
            if (canvas === graphCanvas) { GRAPH_LOGICAL_W = logicalW; GRAPH_LOGICAL_H = logicalH; }
            // Bufor = rozmiar logiczny × DPR (ostro na retinie). Brak supersamplingu — nie
            // skalujemy już bitmapy CSS, więc nie ma potrzeby nadpróbkowania.
            var dpr = window.devicePixelRatio || 1;
            var scale = Math.min(Math.max(dpr, 1), 2.5);
            // Limit bufora: na bardzo dużych ekranach/fullscreenie nie pozwól, by bok bufora
            // przekroczył 4096 px — inaczej rośnie zużycie pamięci GPU i pojawiają się lagi.
            var maxSide = Math.max(logicalW, logicalH) * scale;
            if (maxSide > 4096) scale *= 4096 / maxSide;
            var W = Math.round(logicalW * scale);
            var H = Math.round(logicalH * scale);
            if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
            ctx.setTransform(scale, 0, 0, scale, 0, 0);
            computeLabelScale();   // skala etykiet aktualna przed każdym malowaniem canvasa
            return { w: logicalW, h: logicalH };
        }

        function drawGraphBase(bounds) {
            var ctx = graphCtx;
            var dims = setCanvasHiDPI(graphCanvas, ctx);
            var w = dims.w;
            var h = dims.h;
            var pad = GRAPH_PAD;
            computeLabelScale();
            resetGraphLabels();   // nowy render → czysty rejestr boksów etykiet (anty-nakładanie)
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
            ctx.font = lblFont('600', 11);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            var xStart = Math.ceil(bounds.xMin / xStep) * xStep;
            for (var x = xStart; x <= bounds.xMax + xStep * 0.25; x += xStep) {
                var xs = graphToScreen(x, 0, bounds, w, h, pad).x;
                if (graphShowGrid) {
                    ctx.beginPath();
                    ctx.moveTo(xs, pad);
                    ctx.lineTo(xs, h - pad);
                    ctx.stroke();
                }
                ctx.fillText(formatNum(x), xs, h - pad + 8);
            }

            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            var yStart = Math.ceil(bounds.yMin / yStep) * yStep;
            for (var y = yStart; y <= bounds.yMax + yStep * 0.25; y += yStep) {
                var ys = graphToScreen(0, y, bounds, w, h, pad).y;
                if (graphShowGrid) {
                    ctx.beginPath();
                    ctx.moveTo(pad, ys);
                    ctx.lineTo(w - pad, ys);
                    ctx.stroke();
                }
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
            var w = GRAPH_LOGICAL_W;
            var h = GRAPH_LOGICAL_H;
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
            var w = GRAPH_LOGICAL_W;
            var h = GRAPH_LOGICAL_H;
            var pad = drawGraphBase(bounds);

            ctx.fillStyle = '#dc2626';
            ctx.strokeStyle = '#991b1b';
            ctx.lineWidth = 2;
            ctx.font = lblFont('700', 12);
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

        // Stała może też trzymać WYRYWEK KOMENDY (np. belka = „x=120/4 ,, @edges"). W komendach
        // podstawiamy DOSŁOWNIE (bez owijania w nawias — inaczej składnia komendy by się rozsypała),
        // z tymi samymi granicami słowa odpornymi na polskie znaki. Iteracja: stała w stałej.
        function resolveCommandConstants(raw, constants) {
            if (!constants || !constants.length) return String(raw || '');
            var result = String(raw || '');
            for (var pass = 0; pass < 5; pass++) {
                var before = result;
                constants.forEach(function(c) {
                    if (!c.name) return;
                    var escaped = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    var re = new RegExp('(^|[^\\p{L}\\p{N}_])(' + escaped + ')(?![\\p{L}\\p{N}_])', 'giu');
                    result = result.replace(re, function(_m, pre) { return pre + String(c.value); });
                });
                if (result === before) break;
            }
            return result;
        }

        function looksLikeCommand(s) {
            if (/,,|;;|@|\|/.test(s)) return true;
            try {
                return parseCommandSeries(s, true).some(function(p) { return p.type === 'geometry' || p.type === 'division'; });
            } catch (e) { return false; }
        }

        function parseCommandSeries(raw, _noConst) {
            // Rozwiń stałe-komendy PRZED podziałem na serie (stała może wstrzyknąć całą serię z „;;").
            // _noConst=true pomija rozwijanie (używane w looksLikeCommand, by uniknąć rekurencji).
            if (!_noConst) raw = resolveCommandConstants(raw, STATE.constants);
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
                var coords = splitVals(parts[0]);
                var x = parseGraphNumber(coords[0], 0);
                var y = parseGraphNumber(coords[1] || '0', 0);
                var label = 'P'; var r = 7; var oz = 0;
                parts.slice(1).forEach(function(p) {
                    var pl = p.toLowerCase();
                    if (/^(label|opis|nazwa)=/.test(pl)) label = p.split('=').slice(1).join('=').trim();
                    if (/^r=/.test(pl)) r = Math.max(2, parseGraphNumber(p.split('=')[1], 7));
                    if (/^(z|wys|wysoko[sść]c?|wysoko[sść][cć]|h)=/.test(pl)) oz = parseGraphNumber(p.split('=')[1], 0);
                });
                return { type: 'punkt', x: x, y: y, label: label, r: r, oz: oz };
            }

            // --- rect=szerokoscxwysokosc | label=... ---
            if (/^rect\s*=/.test(lower) || /^prostokat\s*=/.test(lower)) {
                var body = str.replace(/^[^=]+=/, '').trim();
                var parts = body.split(',,').map(function(s) { return s.trim(); });
                var dims = parts[0].toLowerCase().split('x');
                var w = parseGraphNumber(dims[0], 100);
                var h = parseGraphNumber(dims[1] || dims[0], 100);
                var ox = 0; var oy = 0; var label = ''; var oz = 0;
                parts.slice(1).forEach(function(p) {
                    var pl = p.toLowerCase();
                    if (/^(label|opis|nazwa)=/.test(pl)) label = p.split('=').slice(1).join('=').trim();
                    if (/^(ox|x0|od_x)=/.test(pl)) ox = parseGraphNumber(p.split('=')[1], 0);
                    if (/^(oy|y0|od_y)=/.test(pl)) oy = parseGraphNumber(p.split('=')[1], 0);
                    if (/^(z|wys|wysoko[sść]c?|wysoko[sść][cć]|h)=/.test(pl)) oz = parseGraphNumber(p.split('=')[1], 0);
                });
                return { type: 'rect', w: w, h: h, ox: ox, oy: oy, label: label, oz: oz };
            }

            // --- siatka=szerokoscxwysokosc | co=dxdy | label=... ---
            if (/^(siatka|grid)\s*=/.test(lower)) {
                var body = str.replace(/^[^=]+=/, '').trim();
                var parts = body.split(',,').map(function(s) { return s.trim(); });
                var dims = parts[0].toLowerCase().split('x');
                var w = parseGraphNumber(dims[0], 100);
                var h = parseGraphNumber(dims[1] || dims[0], 100);
                var dx = w; var dy = h; var ox = 0; var oy = 0; var oz = 0;
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
                    if (/^(z|wys|wysoko[sść]c?|wysoko[sść][cć]|h)=/.test(pl)) oz = parseGraphNumber(p.split('=')[1], 0);
                });
                return { type: 'siatka', w: w, h: h, dx: dx, dy: dy, ox: ox, oy: oy, label: label, r: r, oz: oz };
            }

            // --- okrag=R / kolo=R / circle=R [,, ox=... ,, oy=...] ---
            if (/^(okrag|kolo|circle|okr[aą]g|ko[lł]o)\s*=/.test(lower)) {
                var body = str.replace(/^[^=]+=/, '').trim();
                var parts = body.split(',,').map(function(s) { return s.trim(); });
                var r = Math.abs(parseGraphNumber(parts[0], 50));
                var ox = 0; var oy = 0; var label = ''; var oz = 0;
                parts.slice(1).forEach(function(p) {
                    var pl = p.toLowerCase();
                    if (/^(label|opis|nazwa)=/.test(pl)) label = p.split('=').slice(1).join('=').trim();
                    if (/^(ox|x0|od_x)=/.test(pl)) ox = parseGraphNumber(p.split('=')[1], 0);
                    if (/^(oy|y0|od_y)=/.test(pl)) oy = parseGraphNumber(p.split('=')[1], 0);
                    if (/^(z|wys|wysoko[sść]c?|wysoko[sść][cć]|h)=/.test(pl)) oz = parseGraphNumber(p.split('=')[1], 0);
                });
                return { type: 'okrag', r: r, ox: ox, oy: oy, label: label, oz: oz };
            }

            // --- wielokat=N,R (foremny)  LUB  wielokat=x,y/x,y/x,y (nieforemny) ---
            if (/^(wielokat|wielok[aą]t|poly|figura)\s*=/.test(lower)) {
                var body = str.replace(/^[^=]+=/, '').trim();
                var parts = body.split(',,').map(function(s) { return s.trim(); });
                var ox = 0; var oy = 0; var label = ''; var oz = 0;
                parts.slice(1).forEach(function(p) {
                    var pl = p.toLowerCase();
                    if (/^(label|opis|nazwa)=/.test(pl)) label = p.split('=').slice(1).join('=').trim();
                    if (/^(ox|x0|od_x)=/.test(pl)) ox = parseGraphNumber(p.split('=')[1], 0);
                    if (/^(oy|y0|od_y)=/.test(pl)) oy = parseGraphNumber(p.split('=')[1], 0);
                    if (/^(z|wys|wysoko[sść]c?|wysoko[sść][cć]|h)=/.test(pl)) oz = parseGraphNumber(p.split('=')[1], 0);
                });

                // Nieforemny: lista wierzchołków rozdzielona "/" (każdy jako x,y)
                if (parts[0].indexOf('/') !== -1) {
                    var vertices = parts[0].split('/').map(function(v) {
                        var c = splitVals(v);
                        return { x: parseGraphNumber(c[0], 0), y: parseGraphNumber(c[1] || '0', 0) };
                    }).filter(function(v) { return isFinite(v.x) && isFinite(v.y); });
                    if (vertices.length >= 2) {
                        return { type: 'wielokat', vertices: vertices, n: vertices.length, ox: ox, oy: oy, label: label, irregular: true, oz: oz };
                    }
                }

                // Foremny: N boków wpisany w okrąg o promieniu R
                var mainParts = splitVals(parts[0]);
                var n = Math.max(3, Math.round(parseGraphNumber(mainParts[0], 6)));
                var r = Math.abs(parseGraphNumber(mainParts[1] || '100', 100));
                return { type: 'wielokat', n: n, r: r, ox: ox, oy: oy, label: label, oz: oz };
            }

            // --- trojkat=x,y/x,y/x,y — trójkąt z 3 wierzchołków (analiza boków, kątów, pola) ---
            if (/^(trojkat|tr[oó]jk[aą]t|triangle)\s*=/.test(lower)) {
                var body = str.replace(/^[^=]+=/, '').trim();
                var parts = body.split(',,').map(function(s) { return s.trim(); });
                var ox = 0; var oy = 0; var label = ''; var oz = 0;
                parts.slice(1).forEach(function(p) {
                    var pl = p.toLowerCase();
                    if (/^(label|opis|nazwa)=/.test(pl)) label = p.split('=').slice(1).join('=').trim();
                    if (/^(ox|x0|od_x)=/.test(pl)) ox = parseGraphNumber(p.split('=')[1], 0);
                    if (/^(oy|y0|od_y)=/.test(pl)) oy = parseGraphNumber(p.split('=')[1], 0);
                    if (/^(z|wys|wysoko[sść]c?|wysoko[sść][cć]|h)=/.test(pl)) oz = parseGraphNumber(p.split('=')[1], 0);
                });
                var verts = parts[0].split('/').map(function(v) {
                    var c = splitVals(v);
                    return { x: parseGraphNumber(c[0], 0), y: parseGraphNumber(c[1] || '0', 0) };
                }).filter(function(v) { return isFinite(v.x) && isFinite(v.y); });
                if (verts.length !== 3) {
                    return { type: 'trojkat', error: 'Trójkąt wymaga dokładnie 3 wierzchołków (x;y/x;y/x;y).' };
                }
                return { type: 'trojkat', vertices: verts, ox: ox, oy: oy, label: label, oz: oz };
            }

            // --- pitagoras=a,b — trójkąt prostokątny z dwóch przyprostokątnych ---
            if (/^(pitagoras|pythagoras)\s*=/.test(lower)) {
                var body = str.replace(/^[^=]+=/, '').trim();
                var parts = body.split(',,').map(function(s) { return s.trim(); });
                var ox = 0; var oy = 0; var label = ''; var oz = 0;
                parts.slice(1).forEach(function(p) {
                    var pl = p.toLowerCase();
                    if (/^(label|opis|nazwa)=/.test(pl)) label = p.split('=').slice(1).join('=').trim();
                    if (/^(ox|x0|od_x)=/.test(pl)) ox = parseGraphNumber(p.split('=')[1], 0);
                    if (/^(oy|y0|od_y)=/.test(pl)) oy = parseGraphNumber(p.split('=')[1], 0);
                    if (/^(z|wys|wysoko[sść]c?|wysoko[sść][cć]|h)=/.test(pl)) oz = parseGraphNumber(p.split('=')[1], 0);
                });
                var legs = parts[0].split(/[;/]/);
                var a = Math.abs(parseGraphNumber(legs[0], 0));
                var b = Math.abs(parseGraphNumber(legs[1] || '0', 0));
                if (!(a > 0) || !(b > 0)) {
                    return { type: 'trojkat', error: 'Pitagoras wymaga dwóch przyprostokątnych, np. pitagoras=3;4.' };
                }
                // Wierzchołki trójkąta prostokątnego: kąt prosty w (0,0)
                var verts = [
                    { x: 0, y: 0 },
                    { x: a, y: 0 },
                    { x: 0, y: b },
                ];
                return { type: 'trojkat', vertices: verts, ox: ox, oy: oy, label: label, pythagoras: true, oz: oz };
            }

            // --- kamera=x,y / widok / fov / pole widzenia — stożek (wycinek) pola widzenia ---
            // Kierunek: cel=x;y[;z] (patrz w punkt), azymut=A[;V] (kompas: 0°=góra, zgodnie z zegarem),
            // kierunek=A[;V] (matematyczny: 0°=prawo, przeciwnie do zegara). Domyślnie 0° (w prawo).
            // Druga liczba V w azymut/kierunek = pion (dodatni = w górę, ujemny = w dół), analogicznie do z w cel.
            // Separator składowych = ';' (przecinek wolny na ułamki: cel=10,5;8). Skrót: kamera=x;y;z;kąt;zasięg.
            if (/^(kamera|widok|fov|pole[_ ]?widzenia|stozek|sto[zż]ek)\s*=/.test(lower)) {
                var body = str.replace(/^[^=]+=/, '').trim();
                var parts = body.split(',,').map(function(s) { return s.trim(); });
                var posC = splitVals(parts[0].split('/')[0]);
                var ox = parseGraphNumber(posC[0], 0);
                var oy = parseGraphNumber(posC[1] || '0', 0);
                // Skrót pozycyjny: kamera=x;y;z;kąt;zasięg — wysokość (z), kąt poziomy i zasięg
                // można podać od razu w pozycji. Jawne parametry (kąt=, zasięg=, z=) i tak nadpiszą.
                function posNum(i) { return posC[i] != null && posC[i] !== '' ? posC[i] : null; }
                var oz = posNum(2) != null ? Math.abs(parseGraphNumber(posC[2], 0)) : 0;
                var fov = posNum(3) != null ? Math.abs(parseGraphNumber(posC[3], 90)) : 90;
                var range = posNum(4) != null ? Math.abs(parseGraphNumber(posC[4], 10)) : 10;
                var label = '', markDists = [];
                var dirRad = 0, dirMode = 'kierunek', dirValue = 0, targetTxt = null;
                var targetX = null, targetY = null; // punkt celu (do narysowania znacznika „cel")
                var fovV = 0;                 // pionowy FOV (analogicznie do poziomego `kąt`)
                var tilt = null, tiltMode = 'brak'; // pochylenie osi w dół (°), jawne lub z celu
                var dirTilt = null;           // pion z azymut=A,V / kierunek=A,V (down-positive po przeliczeniu z elewacji)
                var targetZ = 0, targetHorizDist = null; // do auto-pochylenia z celu
                parts.slice(1).forEach(function(p) {
                    var pl = p.toLowerCase();
                    var val = p.split('=').slice(1).join('=').trim();
                    if (/^(k[aą]tz|katz|k[aą]t_pion|k[aą]t_pionowy|kat_pion|kat_pionowy|fovv|fov_v|vfov|pion)=/.test(pl)) {
                        fovV = Math.abs(parseGraphNumber(val, 0));
                    } else if (/^(k[aą]t|kat|k[aą]txy|katxy|k[aą]t_poziomy|kat_poziomy|k[aą]t_poz|kat_poz|fov|hfov|fov_h|angle)=/.test(pl)) {
                        // kąt=H lub kąt=H;V — H = kąt poziomy, V (opcjonalnie) = kąt pionowy (jak kątZ=)
                        var kc = splitVals(val);
                        fov = Math.abs(parseGraphNumber(kc[0], 90));
                        if (kc[1] != null && kc[1] !== '') fovV = Math.abs(parseGraphNumber(kc[1], 0));
                    } else if (/^(pochy[lł]|pochylenie|tilt|sp[aą]d|wd[oó][lł])=/.test(pl)) {
                        tilt = parseGraphNumber(val, 0); tiltMode = 'jawny';
                    } else if (/^(z|wys|wysoko[sść]c?|wysoko[sść][cć]|h)=/.test(pl)) {
                        oz = Math.abs(parseGraphNumber(val, 0));
                    } else if (/^(na|przy|odl|dystans)=/.test(pl)) {
                        // na=5 lub na=5;10;15 — jedna lub wiele poprzecznych linii granic FOV.
                        splitVals(val).forEach(function(d) { var n = Math.abs(parseGraphNumber(d, 0)); if (n > 0) markDists.push(n); });
                    } else if (/^(zasi[eę]g|zasieg|range|d[lł]ugo[sś][cć]|r)=/.test(pl)) {
                        range = Math.abs(parseGraphNumber(val, 10));
                    } else if (/^(cel|target|patrz)=/.test(pl)) {
                        var c = splitVals(val);
                        var cx = parseGraphNumber(c[0], 0), cy = parseGraphNumber(c[1] || '0', 0);
                        if (c[2] != null && c[2] !== '') targetZ = parseGraphNumber(c[2], 0);
                        dirRad = Math.atan2(cy - oy, cx - ox); dirMode = 'cel';
                        targetX = cx; targetY = cy;
                        targetHorizDist = Math.hypot(cx - ox, cy - oy);
                        targetTxt = formatNum(cx) + '; ' + formatNum(cy) + (c[2] != null && c[2] !== '' ? '; ' + formatNum(targetZ) : '');
                    } else if (/^(azymut|bearing|kompas)=/.test(pl)) {
                        // azymut=A lub azymut=A;V — A = kierunek poziomy (kompas), V = pion (dodatni = w górę)
                        var av = splitVals(val);
                        dirValue = parseGraphNumber(av[0], 0);
                        dirRad = (90 - dirValue) * Math.PI / 180; dirMode = 'azymut';
                        if (av[1] != null && av[1] !== '') dirTilt = -parseGraphNumber(av[1], 0);
                    } else if (/^(kierunek|dir|kat_kier)=/.test(pl)) {
                        // kierunek=A lub kierunek=A;V — A = kierunek poziomy (matematyczny), V = pion (dodatni = w górę)
                        var kv = splitVals(val);
                        dirValue = parseGraphNumber(kv[0], 0);
                        dirRad = dirValue * Math.PI / 180; dirMode = 'kierunek';
                        if (kv[1] != null && kv[1] !== '') dirTilt = -parseGraphNumber(kv[1], 0);
                    } else if (/^(label|opis|nazwa)=/.test(pl)) {
                        label = val;
                    }
                });
                if (!(fov > 0)) fov = 90;
                if (fov > 360) fov = 360;
                if (!(range > 0)) range = 10;

                // Pochylenie osi w pionie: jawne `pochył` ma pierwszeństwo; w przeciwnym razie
                // policz je z celu na ziemi (kamera nad celem) — θ = atan(Δh / dystans poziomy).
                // Pierwszeństwo: jawny `pochył` > pion z `azymut`/`kierunek` > wyliczony z celu.
                var theta = null; // ° pod poziomem
                if (tiltMode === 'jawny') {
                    theta = tilt;
                } else if (dirTilt != null) {
                    theta = dirTilt; tiltMode = 'jawny';
                } else if (oz > 0 && targetHorizDist != null && targetHorizDist > 1e-9) {
                    theta = Math.atan2(oz - targetZ, targetHorizDist) * 180 / Math.PI;
                    tiltMode = 'cel';
                }

                // Czy pole widzenia w ogóle obejmuje ziemię? theta = pochylenie w dół (°),
                // dodatnie = w dół. Najbardziej „w dół" promień = theta + fovV/2. Gdy nawet on
                // jest nad horyzontem (≤ 0), kamera patrzy w niebo → ZERO pokrycia ziemi.
                // (fovV pominięty ⇒ traktujemy oś jak cienki promień: β=0.)
                var groundVanished = false;
                if (theta != null) {
                    var aBottomDeg = theta + (fovV > 0 ? fovV : 0) / 2;
                    if (aBottomDeg <= 1e-9) groundVanished = true;
                }

                // Footprint (rzut pola widzenia na ziemię) — gdy kamera jest podniesiona,
                // znamy pionowy FOV i choć część kadru patrzy pod horyzont. Inaczej płaski
                // wycinek (gdy brak pochylenia) albo nic (gdy patrzy w górę — groundVanished).
                var footprint = null;
                if (!groundVanished && oz > 0 && theta != null && fovV > 0 && (theta + fovV / 2) > 1e-9) {
                    var fovVr = fovV * Math.PI / 180;
                    var aBottom = theta * Math.PI / 180 + fovVr / 2; // najbardziej stromy promień (bliski brzeg)
                    var aTop = theta * Math.PI / 180 - fovVr / 2;    // najpłytszy promień (daleki brzeg)
                    var dNear = aBottom >= Math.PI / 2 ? 0 : oz / Math.tan(aBottom);
                    if (!(dNear >= 0) || !isFinite(dNear)) dNear = 0;
                    var dFar, farClamped = false;
                    if (aTop <= 1e-6) { dFar = range; farClamped = true; }      // brzeg po horyzont
                    else {
                        dFar = oz / Math.tan(aTop);
                        if (dFar > range) { dFar = range; farClamped = true; }    // ucięte do zasięgu sensora
                    }

                    // Wierny rzut na ziemię (keystone): 4 narożniki stożka widzenia rzutowane na
                    // płaszczyznę z=0 pełną projekcją 3D. Bliski brzeg i daleki (gdy ogranicza go
                    // pionowy kąt) wychodzą prostymi; daleki staje się łukiem tylko gdy ucina go zasięg.
                    var th = theta * Math.PI / 180;
                    var bh = fov * Math.PI / 360, bv = fovVr / 2;
                    var fwd = [Math.cos(dirRad) * Math.cos(th), Math.sin(dirRad) * Math.cos(th), -Math.sin(th)];
                    var uH = [-Math.sin(dirRad), Math.cos(dirRad), 0];          // poziomy bok (oś pozioma obrazu)
                    var vUp = [fwd[1] * uH[2] - fwd[2] * uH[1],                 // oś pionowa obrazu = fwd × uH
                               fwd[2] * uH[0] - fwd[0] * uH[2],
                               fwd[0] * uH[1] - fwd[1] * uH[0]];
                    function groundCorner(sh, sv) {
                        var d0 = fwd[0] + Math.tan(bh) * sh * uH[0] + Math.tan(bv) * sv * vUp[0];
                        var d1 = fwd[1] + Math.tan(bh) * sh * uH[1] + Math.tan(bv) * sv * vUp[1];
                        var d2 = fwd[2] + Math.tan(bh) * sh * uH[2] + Math.tan(bv) * sv * vUp[2];
                        var az = Math.atan2(d1, d0);
                        if (d2 >= -1e-9) {
                            // Promień ponad horyzontem nie sięga ziemi — rzut „przy horyzoncie" na
                            // zasięg. Nie może wypaść ZA kamerę: tniemy azymut do przedniej półsfery
                            // (±90° od kierunku), inaczej kadr za zenitem zawija pokrycie do tyłu.
                            var rel = Math.atan2(Math.sin(az - dirRad), Math.cos(az - dirRad));
                            if (rel > Math.PI / 2) rel = Math.PI / 2;
                            else if (rel < -Math.PI / 2) rel = -Math.PI / 2;
                            var azC = dirRad + rel;
                            return { x: ox + range * Math.cos(azC), y: oy + range * Math.sin(azC), az: azC, clamped: true };
                        }
                        var t = oz / (-d2);
                        var gx = ox + t * d0, gy = oy + t * d1;
                        if (Math.hypot(t * d0, t * d1) > range) return { x: ox + range * Math.cos(az), y: oy + range * Math.sin(az), az: az, clamped: true };
                        return { x: gx, y: gy, az: az, clamped: false };
                    }
                    var nA = groundCorner(-1, -1), nB = groundCorner(1, -1);    // bliski brzeg (dół kadru)
                    var fA = groundCorner(-1, 1), fB = groundCorner(1, 1);      // daleki brzeg (góra kadru)
                    // Daleki brzeg jako wierna krzywa rzutu: próbkujemy górną krawędź kadru (sv=+1)
                    // w poprzek poziomego FOV i rzutujemy każdy promień na ziemię. Punkty obcięte
                    // zasięgiem siadają na okręgu zasięgu (łuk), reszta na prawdziwej krzywej rzutu
                    // (perspektywa wybrzusza brzeg). Jeden łańcuch obsługuje keystone, łuk i mieszane.
                    var FAR_STEPS = 32;
                    var farEdge = [];                                            // od fA (sh=-1) do fB (sh=+1)
                    for (var fe = 0; fe <= FAR_STEPS; fe++) farEdge.push(groundCorner(-1 + 2 * fe / FAR_STEPS, 1));
                    var farArc = fA.clamped || fB.clamped;                       // czy daleki brzeg dotyka zasięgu
                    var nearWidth = Math.hypot(nB.x - nA.x, nB.y - nA.y);
                    var farWidth = Math.hypot(fB.x - fA.x, fB.y - fA.y);
                    // Pole — wzór Gaussa (shoelace) po wiernym wielokącie: bliski brzeg + krzywy daleki.
                    var poly = [nA, nB].concat(farEdge.slice().reverse()), area2 = 0;
                    for (var qi = 0; qi < poly.length; qi++) { var q1 = poly[qi], q2 = poly[(qi + 1) % poly.length]; area2 += q1.x * q2.y - q2.x * q1.y; }

                    footprint = { dNear: dNear, dFar: dFar, farClamped: farClamped,
                                  nA: nA, nB: nB, fA: fA, fB: fB, farEdge: farEdge, farArc: farArc, range: range,
                                  nearWidth: nearWidth, farWidth: farWidth, area: Math.abs(area2) / 2 };
                }

                return { type: 'widok', ox: ox, oy: oy, fov: fov, range: range, dir: dirRad,
                         dirMode: dirMode, dirValue: dirValue, targetTxt: targetTxt, label: label, markDists: markDists,
                         targetX: targetX, targetY: targetY,
                         oz: oz, fovV: fovV, tilt: theta, tiltMode: tiltMode, targetZ: targetZ,
                         footprint: footprint, groundVanished: groundVanished };
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
            lines.push('📷 Pole widzenia (poziom) ' + formatNum(geo.fov) + '° → ' + dirTxt);
            var mountTxt = 'Montaż: (' + formatNum(geo.ox) + ', ' + formatNum(geo.oy) + ')';
            if (geo.oz > 0) mountTxt += ' na wys. ' + formatNum(geo.oz);
            mountTxt += ', zasięg ' + formatNum(geo.range);
            lines.push(mountTxt);

            // Pionowy opis osi (tilt jest down-positive → tekst góra/dół).
            function vAimTxt(tiltDown) {
                if (tiltDown == null) return 'poziomo (0°)';
                var e = -tiltDown; // elewacja: dodatnia = w górę
                if (Math.abs(e) < 1e-9) return 'poziomo (0°)';
                return e > 0 ? formatNum(e) + '° w górę' : formatNum(-e) + '° w dół';
            }

            // Kamera patrzy w górę / nad horyzont — pole widzenia nie sięga ziemi.
            if (geo.groundVanished) {
                lines.push('Pion: ' + vAimTxt(geo.tilt));
                lines.push('⚠️ Pole widzenia nie obejmuje ziemi — brak pokrycia (kamera patrzy w górę).');
                if (geo.oz > 0 && !(geo.fovV > 0))
                    lines.push('ℹ️ Jeśli ma obejmować grunt: zmniejsz kąt w górę albo dodaj kątZ= (pionowy FOV).');
                return lines.join('\n');
            }

            // Tryb przestrzenny: znamy pochylenie i pionowy FOV → wierny trapez na ziemi.
            if (geo.footprint) {
                var f = geo.footprint;
                var pochSrc = geo.tiltMode === 'cel' ? ' (z celu)' : '';
                lines.push('Oś pionowo: ' + vAimTxt(geo.tilt) + pochSrc + ', pionowy FOV ' + formatNum(geo.fovV) + '°');
                lines.push('Pokrycie na ziemi: od ' + formatNum(f.dNear) + ' do ' + formatNum(f.dFar)
                    + (f.farClamped ? ' (ucięte do zasięgu)' : '') + ' — głębokość ' + formatNum(f.dFar - f.dNear));
                if (f.dNear > 0) lines.push('Martwa strefa pod kamerą: 0 – ' + formatNum(f.dNear));
                lines.push('Szerokość pokrycia: bliski brzeg ' + formatNum(f.nearWidth)
                    + ', daleki brzeg ' + formatNum(f.farWidth) + (f.farArc ? ' (łuk zasięgu)' : ''));
                lines.push('Pole pokrycia: ' + formatNum(f.area));
            } else {
                var tiltSet = geo.tilt != null && Math.abs(geo.tilt) > 1e-9;
                if (tiltSet) lines.push('Pion: ' + vAimTxt(geo.tilt));
                if (geo.oz > 0) {
                    if (!(geo.fovV > 0))
                        lines.push('ℹ️ Dodaj kąt_pionowy= (lub kątZ=), by policzyć martwą strefę i rzut na ziemię.');
                    else
                        lines.push('ℹ️ Dodaj cel= na ziemi lub pochył=, by policzyć pokrycie na ziemi.');
                } else if (tiltSet) {
                    lines.push('ℹ️ Pochylenie podane, ale bez z= (wysokość) i kątZ= (pionowy FOV) rzut na ziemię się nie policzy — liczby niżej to płaskie uproszczenie (bez pochylenia).');
                }
                if (geo.fov < 180) {
                    lines.push('Szerokość na wprost (na zasięgu): ' + formatNum(2 * geo.range * Math.tan(rad / 2)));
                }
                lines.push('Pole pokrycia' + (tiltSet ? ' (płasko)' : '') + ': ' + formatNum(0.5 * geo.range * geo.range * rad));
                lines.push('Łuk na zasięgu: ' + formatNum(geo.range * rad));
            }
            if (geo.markDists && geo.markDists.length && geo.fov < 180) {
                geo.markDists.forEach(function(md) {
                    lines.push('Na odległości ' + formatNum(md) + ': szerokość ' + formatNum(2 * md * Math.tan(rad / 2)));
                });
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
                // Kamera patrzy w górę — brak pokrycia ziemi, do zakresu liczy się tylko kamera.
                if (geo.groundVanished) return pts;
                // Tryb przestrzenny — dopasuj zakres do narożników keystone (+ szczyt łuku gdy zasięg).
                if (geo.footprint) {
                    var f = geo.footprint;
                    [f.nA, f.nB, f.fA, f.fB].forEach(function(c) {
                        pts.push({ x: parseFloat(c.x.toFixed(6)), y: parseFloat(c.y.toFixed(6)), r: 0, label: '', _hidden: true });
                    });
                    if (f.farArc) {
                        var amid = (f.fA.az + f.fB.az) / 2;
                        pts.push({ x: parseFloat((geo.ox + f.range * Math.cos(amid)).toFixed(6)),
                                   y: parseFloat((geo.oy + f.range * Math.sin(amid)).toFixed(6)),
                                   r: 0, label: '', _hidden: true });
                    }
                    return pts;
                }
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
            var w = GRAPH_LOGICAL_W;
            var h = GRAPH_LOGICAL_H;
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
                    ctx.font = lblFont('', 11);
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
                        ctx.font = lblFont('600', 10);
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        poly.forEach(function(pt, i) {
                            var nx = poly[(i + 1) % poly.length];
                            var len = Math.hypot(nx.x - pt.x, nx.y - pt.y);
                            var midData = { x: (pt.x + nx.x) / 2, y: (pt.y + nx.y) / 2 };
                            var midScr = graphToScreen(midData.x, midData.y, bounds, w, h, pad);
                            ctx.fillStyle = 'rgba(255,255,255,0.55)';
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
                    ctx.font = lblFont('600', 11);
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    P.forEach(function(pScr, i) {
                        var nScr = P[(i + 1) % 3];
                        var mx = (pScr.x + nScr.x) / 2, my = (pScr.y + nScr.y) / 2;
                        var label = formatNum(analysis.sides[i]);
                        ctx.fillStyle = 'rgba(255,255,255,0.55)';
                        var tw = ctx.measureText(label).width + 6;
                        ctx.fillRect(mx - tw / 2, my - 8, tw, 16);
                        ctx.fillStyle = color;
                        ctx.fillText(label, mx, my);
                    });

                    // Kąty przy wierzchołkach (oraz znacznik kąta prostego)
                    ctx.font = lblFont('600', 10);
                    P.forEach(function(vScr, i) {
                        // przesuń etykietę kąta do środka trójkąta
                        var dx = centroid.x - vScr.x, dy = centroid.y - vScr.y;
                        var d = Math.hypot(dx, dy) || 1;
                        var lx = vScr.x + (dx / d) * 24, ly = vScr.y + (dy / d) * 24;
                        var txt = (analysis.rightVertex === i ? '90°' : formatNum(analysis.angles[i]) + '°');
                        ctx.fillStyle = 'rgba(255,255,255,0.55)';
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
                    // Wymiary — drugorzędne: anty-kolizja, znikają przy tłoku (force:false), wracają przy zoomie.
                    if (showLabelDetail) {
                        var mid = graphToScreen(geo.ox + geo.w / 2, geo.oy, bounds, w, h, pad);
                        drawSmartLabel(ctx, formatNum(geo.w), mid.x, mid.y, { font: lblFont('', 11), fill: color, bg: GRAPH_LABEL_PLATE, gap: 8, key: 'rw' + item.si });
                        var midL = graphToScreen(geo.ox, geo.oy + geo.h / 2, bounds, w, h, pad);
                        drawSmartLabel(ctx, formatNum(geo.h), midL.x, midL.y, { font: lblFont('', 11), fill: color, bg: GRAPH_LABEL_PLATE, gap: 8, key: 'rh' + item.si });
                    }
                }

                // Narysuj pole widzenia (stożek/wycinek)
                if (geo.type === 'widok') {
                    var apex = graphToScreen(geo.ox, geo.oy, bounds, w, h, pad);
                    var half = geo.fov * Math.PI / 360;
                    var steps = 64;
                    var axisLen = geo.range; // dokąd sięga oś kierunku (na ekranie)
                    if (geo.groundVanished) {
                        // Kamera patrzy w górę — pole widzenia nie sięga ziemi. Nie rysujemy
                        // wypełnionego wycinka (byłby fałszem). Tylko krótka oś + marker „brak pokrycia".
                        // Stub ma STAŁĄ długość ekranową (zoom-niezależną), bo zakres zwija się do kamery.
                        var dTip = graphToScreen(geo.ox + Math.cos(geo.dir), geo.oy + Math.sin(geo.dir), bounds, w, h, pad);
                        var ddx = dTip.x - apex.x, ddy = dTip.y - apex.y, dlen = Math.hypot(ddx, ddy) || 1;
                        var skyEnd = { x: apex.x + ddx / dlen * 70, y: apex.y + ddy / dlen * 70 };
                        ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.strokeStyle = color + 'aa';
                        ctx.beginPath(); ctx.moveTo(apex.x, apex.y); ctx.lineTo(skyEnd.x, skyEnd.y); ctx.stroke();
                        ctx.setLineDash([]);
                        var elevUp = geo.tilt != null ? -geo.tilt : 0; // w górę dodatnia
                        var skyTxt = '↑ ' + formatNum(elevUp) + '° w górę — brak pokrycia ziemi';
                        drawSmartLabel(ctx, skyTxt, skyEnd.x, skyEnd.y, { font: lblFont('700', 10), fill: color, bg: GRAPH_LABEL_PLATE, key: 'sky' + item.si });
                    } else if (geo.footprint) {
                        // Wierny keystone: bliski brzeg + boki jako proste; daleki brzeg prosty
                        // (gdy ogranicza go pionowy kąt) albo łuk zasięgu (gdy ucina go zasięg).
                        var f = geo.footprint;
                        function gs(p) { return graphToScreen(p.x, p.y, bounds, w, h, pad); }
                        var sNA = gs(f.nA), sNB = gs(f.nB), sFA = gs(f.fA), sFB = gs(f.fB);
                        ctx.beginPath();
                        ctx.moveTo(sNA.x, sNA.y);
                        ctx.lineTo(sNB.x, sNB.y);        // bliski brzeg (prosty)
                        // bok B + wierny daleki brzeg (krzywa rzutu fB→fA) + bok A; closePath domyka do nA.
                        if (f.farEdge && f.farEdge.length) {
                            for (var fi = f.farEdge.length - 1; fi >= 0; fi--) {
                                var pe = gs(f.farEdge[fi]);
                                ctx.lineTo(pe.x, pe.y);
                            }
                        } else {
                            ctx.lineTo(sFB.x, sFB.y);    // bok B (prosty)
                            ctx.lineTo(sFA.x, sFA.y);    // daleki brzeg (prosty) — awaryjnie
                        }
                        ctx.closePath();                 // bok A z powrotem do bliskiego brzegu
                        ctx.fillStyle = color + '22';
                        ctx.fill();
                        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([]);
                        ctx.stroke();
                        // Martwa strefa pod kamerą — delikatne linie od kamery do narożników bliskiego brzegu.
                        if (f.dNear > 0) {
                            ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.strokeStyle = color + '99';
                            ctx.beginPath();
                            ctx.moveTo(apex.x, apex.y); ctx.lineTo(sNA.x, sNA.y);
                            ctx.moveTo(apex.x, apex.y); ctx.lineTo(sNB.x, sNB.y);
                            ctx.stroke();
                            ctx.setLineDash([]);
                            // Poziom 2 (z bliska) — podpis martwej strefy na bliskim brzegu.
                            if (labelDetailLevel >= 2) {
                                var nm = gs({ x: (f.nA.x + f.nB.x) / 2, y: (f.nA.y + f.nB.y) / 2 });
                                var dzTxt = 'martwa ' + formatNum(Math.round(f.dNear * 10) / 10);
                                drawSmartLabel(ctx, dzTxt, nm.x, nm.y, { font: lblFont('600', 9), fill: color, bg: GRAPH_LABEL_PLATE, key: 'dz' + item.si });
                            }
                        }
                        axisLen = f.dFar;
                    } else {
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
                    }
                    // Oś kierunku (przerywana) — przy „w górę" już narysowana wyżej, nie dubluj.
                    if (!geo.groundVanished) {
                        var axisEnd = graphToScreen(geo.ox + axisLen * Math.cos(geo.dir), geo.oy + axisLen * Math.sin(geo.dir), bounds, w, h, pad);
                        ctx.setLineDash([5, 4]);
                        ctx.lineWidth = 1;
                        ctx.beginPath(); ctx.moveTo(apex.x, apex.y); ctx.lineTo(axisEnd.x, axisEnd.y); ctx.stroke();
                        ctx.setLineDash([]);
                    }
                    // Poprzeczne linie granic FOV na zadanych odległościach (na=5;10;15)
                    if (!geo.groundVanished && geo.markDists && geo.markDists.length && geo.fov < 180) {
                        var uxN = Math.cos(geo.dir), uyN = Math.sin(geo.dir);  // oś
                        var pxu = -uyN, pyu = uxN;                            // prostopadła do osi
                        geo.markDists.forEach(function(md, mi) {
                            var halfW = md * Math.tan(half);
                            var cxD = geo.ox + md * uxN, cyD = geo.oy + md * uyN;
                            var mL = graphToScreen(cxD + halfW * pxu, cyD + halfW * pyu, bounds, w, h, pad);
                            var mR = graphToScreen(cxD - halfW * pxu, cyD - halfW * pyu, bounds, w, h, pad);
                            var mC = graphToScreen(cxD, cyD, bounds, w, h, pad);
                            ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([2, 2]);
                            ctx.beginPath(); ctx.moveTo(mL.x, mL.y); ctx.lineTo(mR.x, mR.y); ctx.stroke();
                            ctx.setLineDash([]);
                            var wTxt = formatNum(2 * halfW) + ' @ ' + formatNum(md);
                            drawSmartLabel(ctx, wTxt, mC.x, mC.y, { font: lblFont('600', 10), fill: color, bg: GRAPH_LABEL_PLATE, key: 'mark' + item.si + '_' + mi });
                        });
                    }
                    // Etykieta kąta — drugorzędna (anty-kolizja, znika przy tłoku, wraca przy zoomie).
                    // Pomijamy gdy „w górę" (brak wycinka — etykietę zastępuje znacznik nieba).
                    if (!geo.groundVanished) {
                        var midA = graphToScreen(geo.ox + axisLen * 0.28 * Math.cos(geo.dir), geo.oy + axisLen * 0.28 * Math.sin(geo.dir), bounds, w, h, pad);
                        var angLabel = formatNum(geo.fov) + '°' + (geo.footprint ? '↔ ' + formatNum(geo.fovV) + '°↕' : '');
                        drawSmartLabel(ctx, angLabel, midA.x, midA.y, { font: lblFont('600', 11), fill: color, bg: GRAPH_LABEL_PLATE, key: 'ang' + item.si });
                    }
                    // Marker kamery (wierzchołek)
                    ctx.beginPath(); ctx.arc(apex.x, apex.y, 6, 0, Math.PI * 2);
                    ctx.fillStyle = color; ctx.fill();
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
                    var camTxt = geo.label || '📷';
                    if (geo.oz > 0) camTxt += ' ↑' + formatNum(geo.oz);
                    // Marker kamery — kluczowy (force:true): zawsze widoczny, odsuwany od innych.
                    drawSmartLabel(ctx, camTxt, apex.x, apex.y, { font: lblFont('700', 10), fill: '#0f172a', bg: GRAPH_LABEL_PLATE, anchorR: 6, gap: 5, force: true, key: 'cam' + item.si });

                    // Znacznik celu — żeby od razu było widać, gdzie kamera celuje (bez zgadywania z siatki).
                    if (geo.targetX != null && geo.targetY != null) {
                        var tp = graphToScreen(geo.targetX, geo.targetY, bounds, w, h, pad);
                        ctx.beginPath(); ctx.arc(tp.x, tp.y, 5, 0, Math.PI * 2);
                        ctx.fillStyle = color; ctx.fill();
                        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
                        var celTxt = 'cel (' + formatNum(geo.targetX) + ', ' + formatNum(geo.targetY)
                            + (geo.targetZ ? ', ' + formatNum(geo.targetZ) : '') + ')';
                        // Cel — drugorzędny (anty-kolizja, znika przy tłoku, wraca przy zoomie).
                        drawSmartLabel(ctx, celTxt, tp.x, tp.y, { font: lblFont('600', 10), fill: color, bg: GRAPH_LABEL_PLATE, anchorR: 5, gap: 4, key: 'cel' + item.si });
                    }
                }

                // Narysuj punkty
                ctx.fillStyle = color;
                ctx.strokeStyle = color === '#2563eb' ? '#1d4ed8' : color;
                ctx.lineWidth = 1.5;
                ctx.font = lblFont('700', 11);
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
                    // Podpis punktu — szuka wolnego miejsca, by nie nakładać się na inne (force=kluczowy).
                    drawSmartLabel(ctx, txt, p.x, p.y, { font: lblFont('700', 10), fill: '#0f172a', anchorR: radius, gap: 3, force: true, key: 'pt' + item.si + '_' + idx });
                    // Plakietka wysokości (oś z) — drugorzędna, pomijana gdy brak miejsca.
                    if (geo.oz && showLabelDetail) {
                        drawSmartLabel(ctx, '▲z=' + formatNum(geo.oz), p.x, p.y, { font: lblFont('600', 9), fill: '#7c3aed', anchorR: radius, gap: 3, key: 'z' + item.si + '_' + idx });
                    }
                    // Poziom 2 (z bliska) — współrzędne, drugorzędne, pomijane przy kolizji.
                    if (labelDetailLevel >= 2 && geo.type === 'punkt') {
                        drawSmartLabel(ctx, '(' + formatNum(pt.x) + ', ' + formatNum(pt.y) + ')', p.x, p.y, { font: lblFont('600', 8), fill: '#64748b', anchorR: radius, gap: 3, key: 'co' + item.si + '_' + idx });
                    }
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

        /* ============================================================
           [EN] SCENA RYSUNKU — rozdzielenie PARSOWANIA od RYSOWANIA.
           updateGraph() parsuje komendę raz i buduje `graphScene` (geometrie,
           podziały, funkcje, legenda). renderGraphScene() rysuje scenę w danym
           zakresie. Dzięki temu zoom/pan tylko przerysowują scenę w nowym
           zakresie (ostro, bez ponownego parsowania i bez auto-dopasowania),
           a dodanie nowego typu rysunku = nowy wpis sceny + gałąź renderu.
           ============================================================ */
        var graphScene = null;
        var graphHome  = null;   // zakres „domowy" (po auto-dopasowaniu) — do resetu i % zoomu
        var graphHiddenSeries = {};   // indeksy serii ukrytych klikiem w legendę
        var graphLegendEl = $('#graphLegend');

        function setGraphHome(b) {
            graphHome = { xMin: b.xMin, xMax: b.xMax, yMin: b.yMin, yMax: b.yMax, spanX: b.xMax - b.xMin };
            updateZoomLabel();
        }
        function updateZoomLabel() {
            if (typeof graphZoomLabel === 'undefined' || !graphZoomLabel) return;
            var b = getGraphBounds();
            var cur = b.xMax - b.xMin;
            var pct = (graphHome && graphHome.spanX > 0 && cur > 0) ? Math.round(graphHome.spanX / cur * 100) : 100;
            graphZoomLabel.textContent = pct + '%';
        }

        // [EN] Nagłówek „Zakres X/Y" liczony z bieżącego zakresu — odświeżany też przy zoom/pan,
        // żeby tekst pod rysunkiem zawsze zgadzał się z tym, co widać.
        function graphRangeHeader(bounds) {
            var xStepRaw = parseFloat(graphXStep && graphXStep.value);
            var yStepRaw = parseFloat(graphYStep && graphYStep.value);
            var xs = (isFinite(xStepRaw) && xStepRaw > 0) ? xStepRaw : niceGridStep(bounds.xMax - bounds.xMin);
            var ys = (isFinite(yStepRaw) && yStepRaw > 0) ? yStepRaw : niceGridStep(bounds.yMax - bounds.yMin);
            return '📊 Zakres X: ' + formatNum(bounds.xMin) + ' → ' + formatNum(bounds.xMax) + '   |   krok: ' + formatNum(xs) + '\n' +
                   '📊 Zakres Y: ' + formatNum(bounds.yMin) + ' → ' + formatNum(bounds.yMax) + '   |   krok: ' + formatNum(ys) + '\n';
        }
        function setGraphResultText(scene, bounds) {
            if (!scene || scene.type !== 'graph' || typeof scene.bodyText !== 'string') return;
            graphResult.textContent = graphRangeHeader(bounds) + '\n' + scene.bodyText;
        }

        /* ============================================================
           [EN] ANTY-NAKŁADANIE ETYKIET — czytelność na pierwszym miejscu.
           Każda etykieta szuka wolnego miejsca wokół swojego punktu (góra/dół/
           bok/skos). Jeśli wszędzie koliduje z już narysowaną etykietą, jest
           pomijana (opts.force=true → mimo wszystko rysuje, dla podpisów
           kluczowych). Rejestr boksów zerujemy na starcie każdego renderu.
           ============================================================ */
        var graphLabelBoxes = [];
        var graphRenderedLabels = [];   // narysowane etykiety tej klatki (do klikania): {x1,y1,x2,y2,key}
        var graphPinnedLabels = {};     // klucze etykiet „przypiętych" — rysują linię do swojej kotwicy
        function resetGraphLabels() { graphLabelBoxes = []; graphRenderedLabels = []; }
        function graphRectsOverlap(a, b, m) {
            m = m || 0;
            return !(a.x2 + m < b.x1 || a.x1 - m > b.x2 || a.y2 + m < b.y1 || a.y1 - m > b.y2);
        }
        function graphRegisterLabelBox(box) { graphLabelBoxes.push(box); }
        // Rysuje `text` blisko (ax, ay), próbując kolejnych pozycji aż znajdzie wolną.
        // opts: { font, fill, anchorR (promień markera), gap, force }. Zwraca true jeśli narysowano.
        function drawSmartLabel(ctx, text, ax, ay, opts) {
            opts = opts || {};
            if (opts.font) ctx.font = opts.font;
            var tw = ctx.measureText(text).width;
            var th = opts.lineHeight || 12;
            var r = opts.anchorR || 0;
            var gap = (opts.gap != null) ? opts.gap : 4;
            var off = r + gap;
            var candidates = [
                { dx: 0,    dy: -off, align: 'center', base: 'bottom' },
                { dx: 0,    dy:  off, align: 'center', base: 'top'    },
                { dx:  off, dy: 0,    align: 'left',   base: 'middle' },
                { dx: -off, dy: 0,    align: 'right',  base: 'middle' },
                { dx:  off, dy: -off, align: 'left',   base: 'bottom' },
                { dx: -off, dy: -off, align: 'right',  base: 'bottom' },
                { dx:  off, dy:  off, align: 'left',   base: 'top'    },
                { dx: -off, dy:  off, align: 'right',  base: 'top'    }
            ];
            function boxFor(c) {
                var cx = ax + c.dx, cy = ay + c.dy, x1, x2, y1, y2;
                if (c.align === 'center') { x1 = cx - tw / 2; x2 = cx + tw / 2; }
                else if (c.align === 'left') { x1 = cx; x2 = cx + tw; }
                else { x1 = cx - tw; x2 = cx; }
                if (c.base === 'bottom') { y1 = cy - th; y2 = cy; }
                else if (c.base === 'top') { y1 = cy; y2 = cy + th; }
                else { y1 = cy - th / 2; y2 = cy + th / 2; }
                return { x1: x1, y1: y1, x2: x2, y2: y2, cx: cx, cy: cy, c: c };
            }
            function paint(box) {
                graphLabelBoxes.push(box);
                var key = opts.key || text;
                var pinned = !!graphPinnedLabels[key];
                var accent = opts.fill || '#475569';
                var bx = box.x1 - 3, by = box.y1 - 2, bw = (box.x2 - box.x1) + 6, bh = (box.y2 - box.y1) + 4;
                // Przypięta etykieta: linia do kotwicy (pod plakietką) + kropka na kotwicy.
                if (pinned) {
                    ctx.save();
                    ctx.strokeStyle = accent; ctx.lineWidth = 1; ctx.setLineDash([3, 2]);
                    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo((box.x1 + box.x2) / 2, (box.y1 + box.y2) / 2); ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.beginPath(); ctx.arc(ax, ay, 2.5, 0, Math.PI * 2); ctx.fillStyle = accent; ctx.fill();
                    ctx.restore();
                }
                if (opts.bg) {   // plakietka pod tekstem — oddziela go od linii i innych etykiet
                    ctx.fillStyle = opts.bg;
                    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 3); ctx.fill(); }
                    else ctx.fillRect(bx, by, bw, bh);
                }
                if (opts.fill) ctx.fillStyle = opts.fill;
                ctx.textAlign = box.c.align; ctx.textBaseline = box.c.base;
                ctx.fillText(text, box.cx, box.cy);
                if (pinned) {   // obwódka — widać, że etykieta jest zaznaczona
                    ctx.save();
                    ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
                    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 3); ctx.stroke(); }
                    else ctx.strokeRect(bx, by, bw, bh);
                    ctx.restore();
                }
                // Rejestr do klikania (najświeższa klatka).
                graphRenderedLabels.push({ x1: box.x1, y1: box.y1, x2: box.x2, y2: box.y2, key: key });
            }
            for (var i = 0; i < candidates.length; i++) {
                var box = boxFor(candidates[i]);
                var hit = false;
                for (var j = 0; j < graphLabelBoxes.length; j++) {
                    if (graphRectsOverlap(box, graphLabelBoxes[j], graphLabelGap)) { hit = true; break; }
                }
                if (!hit) { paint(box); return true; }
            }
            // Brak wolnego miejsca → etykieta się chowa (także „kluczowe" — gdy naprawdę
            // jest za ciasno, zwłaszcza na telefonie). force tylko delikatnie ją ratuje:
            // rysuje na pierwszej pozycji wyłącznie gdy nie nachodzi mocno na inne.
            if (opts.force) {
                var fb = boxFor(candidates[0]);
                var clash = false;
                for (var k = 0; k < graphLabelBoxes.length; k++) {
                    if (graphRectsOverlap(fb, graphLabelBoxes[k], 0)) { clash = true; break; }
                }
                if (!clash) { paint(fb); return true; }
            }
            return false;
        }

        // [EN] Legenda smart jako HTML (lekki UI): zawsze czytelna, zawija się, a klik w chip
        // pokazuje/ukrywa serię (graphHiddenSeries). Nie zasłania rysunku jak legenda na canvasie.
        function renderGraphLegendDOM(legend) {
            if (!graphLegendEl) return;
            if (!legend || !legend.length) { graphLegendEl.hidden = true; graphLegendEl.textContent = ''; return; }
            graphLegendEl.hidden = false;
            graphLegendEl.textContent = '';
            legend.forEach(function(item) {
                var hidden = !!graphHiddenSeries[item.si];
                var chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'legend-chip' + (hidden ? ' is-hidden' : '');
                chip.setAttribute('aria-pressed', hidden ? 'false' : 'true');
                chip.title = hidden ? 'Pokaż serię' : 'Ukryj serię';
                var dot = document.createElement('span');
                dot.className = 'legend-dot';
                dot.style.background = item.color;
                var label = document.createElement('span');
                label.className = 'legend-text';
                label.textContent = item.text;
                chip.appendChild(dot);
                chip.appendChild(label);
                chip.addEventListener('click', function() {
                    graphHiddenSeries[item.si] = !graphHiddenSeries[item.si];
                    redrawGraphView();   // przerysuje canvas i odświeży stan chipów
                });
                graphLegendEl.appendChild(chip);
            });
        }

        function renderGraphScene(scene, bounds) {
            if (!scene || scene.type === 'empty') { drawGraphBase(bounds); updateZoomLabel(); return; }
            if (scene.type === 'engineering') { if (scene.render) scene.render(); return; }

            drawGraphBase(bounds);
            var ctx = graphCtx;
            var w = GRAPH_LOGICAL_W, h = GRAPH_LOGICAL_H, pad = GRAPH_PAD;

            // Filtr widoczności serii (klik w legendę chowa/pokazuje).
            var visibleGeos = (scene.geos || []).filter(function(g) { return !graphHiddenSeries[g.si]; });
            if (visibleGeos.length) drawGeometry(visibleGeos, bounds);

            (scene.divisions || []).forEach(function(item) {
                if (graphHiddenSeries[item.si]) return;
                var pts = item.points, color = item.color, labelPrefix = item.labelPrefix || 'P';
                pts.forEach(function(pt, idx) {
                    var p = graphToScreen(pt.x, pt.y, bounds, w, h, pad);
                    if (p.x < pad || p.x > w - pad || p.y < pad || p.y > h - pad) return;
                    var radius = pt.r || 7;
                    ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
                    ctx.fillStyle = color; ctx.fill();
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
                    drawSmartLabel(ctx, (pt.label || labelPrefix) + (idx + 1), p.x, p.y,
                        { font: lblFont('700', 12), fill: '#0f172a', anchorR: radius, gap: 4, force: true, key: 'div' + item.si + '_' + idx });
                });
            });

            (scene.functions || []).forEach(function(item) {
                if (graphHiddenSeries[item.si]) return;
                var fn;
                try { fn = compileGraphExpression(item.cmd); } catch (e) { return; }
                // Próbki ~1/px, ale z górnym limitem — chroni przed zbędnym kosztem na
                // bardzo szerokim kadrze (4K/fullscreen) i przy wielu funkcjach naraz.
                var samples = Math.min(2400, Math.max(300, w - pad * 2));
                var started = false;
                ctx.strokeStyle = item.color; ctx.lineWidth = 3; ctx.beginPath();
                for (var ii = 0; ii <= samples; ii++) {
                    var xi = bounds.xMin + (ii / samples) * (bounds.xMax - bounds.xMin);
                    var yi;
                    try { yi = fn(xi); } catch (e2) { started = false; continue; }
                    if (!isFinite(yi) || Math.abs(yi) > 1e8) { started = false; continue; }
                    var p = graphToScreen(xi, yi, bounds, w, h, pad);
                    if (!started) { ctx.moveTo(p.x, p.y); started = true; } else { ctx.lineTo(p.x, p.y); }
                }
                ctx.stroke();
            });

            renderGraphLegendDOM(scene.legend);

            updateZoomLabel();
        }

        function updateGraph() {
            var command = graphCommand.value.trim();
            var bounds = getGraphBounds();
            setCommandError('graph', '');
            // Domyślnie kadr wykresu (pion na mobilce); belka 1D ustawi sobie szeroki kadr niżej.
            if (typeof graphContainer !== 'undefined' && graphContainer) graphContainer.classList.remove('scene-eng');
            // Nowa komenda = świeża widoczność serii i odpięte etykiety; legendę pokaże render.
            graphHiddenSeries = {};
            graphPinnedLabels = {};
            if (graphLegendEl) { graphLegendEl.hidden = true; graphLegendEl.textContent = ''; }
            if (typeof updateGraphCmdBadge === 'function') updateGraphCmdBadge(command);
            STATE.graph.command = command;
            STATE.graph.xMin = bounds.xMin;
            STATE.graph.xMax = bounds.xMax;
            STATE.graph.yMin = bounds.yMin;
            STATE.graph.yMax = bounds.yMax;

            if (!command) {
                if (komendaViewCard) komendaViewCard.style.display = '';
                graphScene = { type: 'empty' };
                setGraphHome(bounds);
                drawGraphBase(bounds);
                graphResult.textContent = '';
                return;
            }

            try {
                // --- Wieloseria: wspólny parser komend ---
                var parsedSeries = parseCommandSeries(command);

                // Inteligentny routing: podział 1D → belka drewniana
                if (isEngineeringCommand(parsedSeries)) {
                    graphScene = { type: 'engineering', render: function() { renderAsEngineering(parsedSeries); } };
                    // Szeroki, krótki kadr dla poziomej belki (przed rysowaniem — by rozmiar canvasa był poprawny).
                    if (typeof graphContainer !== 'undefined' && graphContainer) graphContainer.classList.add('scene-eng');
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
                var fitPoints = [];          // punkty do fit-to-content (dopasowanie po pętli)

                parsedSeries.forEach(function(item, si) {
                    var s = item.raw;
                    var color = colors[si % colors.length];

                    // 1. Geometria 2D?
                    if (item.type === 'geometry') {
                        var geo = item.data;
                        if (geo.error) throw new Error(geo.error);
                        var pts = buildGeometryPoints(geo);
                        if (geo.type === 'okrag' || geo.type === 'wielokat' || geo.type === 'trojkat' || geo.type === 'widok') hasProportional = true;
                        allGeos.push({ geo: geo, points: pts, color: color, si: si });
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
                        // Zbierz punkty — fit-to-content nastąpi raz, po całej pętli.
                        for (var gi = 0; gi < pts.length; gi++) fitPoints.push(pts[gi]);
                        return;
                    }

                    // 2. Komenda podziału 1D?
                    if (item.type === 'division') {
                        hasDivision = true;
                        var division = item.data;
                        var pts = buildDivisionPoints(division);
                        allGeos.push({ geo: { type: 'division', division: division }, points: pts, color: color, si: si });
                        resultLines.push(commandSummary(division, pts));
                        // Podziały (belka 1D w trybie wykresu) — punkty też do fit-to-content,
                        // plus zero na osi X, by oś początku była widoczna.
                        for (var di = 0; di < pts.length; di++) fitPoints.push(pts[di]);
                        if (pts.length) fitPoints.push({ x: 0, y: pts[0].y });
                        return;
                    }

                    // 3. Funkcja matematyczna
                    hasFunction = true;
                    fnCommands.push({ cmd: s, color: color, si: si });
                });

                // Fit-to-content: dopasuj kadr do treści OD ZERA (nie zostawiamy zakresu po
                // poprzedniej komendzie). Tylko geometria/podziały; funkcje korzystają z pól
                // „Zakres widoku". Pomijamy przy ręcznej edycji pól (skipBoundsFit).
                if (!skipBoundsFit && fitPoints.length) {
                    var fitB = fitBoundsToPoints(fitPoints);
                    if (fitB) { setGraphBounds(fitB); bounds = getGraphBounds(); }
                }

                // Okrąg/wielokąt — zrównaj skalę osi, żeby koło było okrągłe (nie elipsa)
                if (hasProportional && !skipBoundsFit) {
                    equalizeGraphAspect();
                    bounds = getGraphBounds();
                }

                // Złóż scenę (parse→scene) i wyrenderuj. Zoom/pan przerysują ją
                // bez ponownego parsowania i bez auto-dopasowania zakresu.
                var geosToRender = allGeos.filter(function(item) { return item.geo.type !== 'division'; });
                var divisionsToRender = allGeos.filter(function(item) { return item.geo.type === 'division'; });

                fnCommands.forEach(function(item) {
                    resultLines.push('f(x) = ' + stripFunctionPrefix(item.cmd));
                });

                graphScene = {
                    type: 'graph',
                    proportional: hasProportional,   // okrąg/wielokąt/trójkąt/FOV — wymaga równej skali osi
                    geos: geosToRender,
                    divisions: divisionsToRender.map(function(item) {
                        return {
                            points: item.points,
                            color: item.color,
                            si: item.si,
                            labelPrefix: (item.geo.division && item.geo.division.label) || 'P'
                        };
                    }),
                    functions: fnCommands,
                    legend: (rawSeries.length > 1)
                        ? rawSeries.map(function(s, si) { return { text: s, color: colors[si % colors.length], si: si }; })
                        : null
                };

                bounds = getGraphBounds();
                setGraphHome(bounds);
                graphScene.bodyText = resultLines.join('\n\n') || ('Rysuję: ' + stripFunctionPrefix(command));
                renderGraphScene(graphScene, bounds);
                setGraphResultText(graphScene, bounds);
                recordRecentCommand('graph', command);

            } catch (err) {
                graphScene = { type: 'empty' };
                drawGraphBase(bounds);
                setCommandError('graph', err.message || 'Nieprawidłowa komenda.');
                graphResult.textContent = '⚠️ ' + err.message +
                    '\n\nPrzykłady:\n  f(x)=sin(x)\n  rect=400x300\n  siatka=400x300 | co=100x100\n  punkt=150;200 | label=A\n  x(d)=120/4 | m=10 | y=0';
            }
        }

        // [PL] Po „Uruchom" przewiń płynnie do karty wizualizacji (QoL — od razu widać efekt).
        function scrollToGraph() {
            var card = (graphCanvas && graphCanvas.closest) ? graphCanvas.closest('.card') : null;
            var target = card || document.getElementById('graphContainer') || graphCanvas;
            if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        graphDrawBtn.addEventListener('click', function() {
            updateGraph();
            // poczekaj na układ po narysowaniu, potem przewiń
            requestAnimationFrame(scrollToGraph);
        });
        graphCommand.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                // Otwarte podpowiedzi — Enter wybiera sugestię (obsługuje autouzupełnianie), nie uruchamiaj
                var ac = document.getElementById('graphCommandAC');
                if (ac && ac.classList.contains('open')) return;
                e.preventDefault(); // textarea: nie wstawiaj nowej linii, tylko uruchom
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
        // Liczbowa wartość stałej — liczba wprost albo wynik policzenia wartości-wyrażenia
        // („23%”→0.23, „5+5*2”→15). NaN, gdy nie sprowadza się do liczby poza kontekstem użycia.
        function constNumericValue(c) {
            if (_isFuncConst(c)) return NaN; // funkcja f(x) — nie ma jednej wartości
            if (typeof c.value === 'number') return c.value;
            var r = evalCalcExpression(String(c.value));
            return r && typeof r.value === 'number' && isFinite(r.value) ? r.value : NaN;
        }

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

                // Własna jednostka (kind:'unit') — token bez wartości. Prosty wiersz: nazwa +
                // etykieta + sam kosz (bez quick-calc i „Użyj" — nie ma czego mnożyć).
                if (c.kind === 'unit') {
                    var uInfo = document.createElement('div');
                    uInfo.className = 'info';
                    var uName = document.createElement('div');
                    uName.className = 'name';
                    uName.textContent = c.name || c.unit;
                    var uDet = document.createElement('div');
                    uDet.className = 'detail';
                    uDet.textContent = 'własna jednostka · ' + c.unit + ' · ' + (c.dimensionless !== false ? 'bezwymiarowa' : 'wymiarowa');
                    uInfo.appendChild(uName);
                    uInfo.appendChild(uDet);
                    var uActions = document.createElement('div');
                    uActions.className = 'actions';
                    var uDel = document.createElement('button');
                    uDel.className = 'btn btn-sm btn-danger del-const';
                    uDel.setAttribute('data-idx', idx);
                    uDel.textContent = '🗑️';
                    uActions.appendChild(uDel);
                    li.appendChild(uInfo);
                    li.appendChild(uActions);
                    constList.appendChild(li);
                    return;
                }

                // [EN] Safe DOM creation — no innerHTML, no XSS
                var infoDiv = document.createElement('div');
                infoDiv.className = 'info';
                var nameDiv = document.createElement('div');
                nameDiv.className = 'name';
                nameDiv.textContent = c.name;
                var detailDiv = document.createElement('div');
                detailDiv.className = 'detail';
                var rawVal = String(c.value);
                var isPlainNum = /^-?[\d.,]+$/.test(rawVal);
                var clsInfo = classifyConstValue(rawVal);
                detailDiv.textContent = (isPlainNum ? formatNum(parseFloat(rawVal.replace(',', '.'))) : rawVal)
                    + (c.unit ? ' ' + c.unit : '')
                    + (clsInfo.mode === 'op' ? '  ·  operacja'
                       : clsInfo.mode === 'func' ? '  ·  funkcja f(x)' : '');
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
                var nv0 = constNumericValue(c);
                resultSpan.textContent = '= ' + (isFinite(nv0) ? formatNum(nv0) : rawVal);
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
                        var nv = constNumericValue(STATE.constants[idx]);
                        var result = nv * mult;
                        resultSpan.textContent = isFinite(result)
                            ? '= ' + formatNum(result) + (STATE.constants[idx].unit ? ' ' + STATE.constants[idx].unit : '')
                            : '= ?';
                    }
                });

                constList.addEventListener('click', function(e) {
                    var delBtn = e.target.closest('.del-const');
                    if (delBtn) {
                        var idx = parseInt(delBtn.getAttribute('data-idx'), 10);
                        var name = STATE.constants[idx] ? STATE.constants[idx].name : '';
                        STATE.constants.splice(idx, 1);
                        saveConstants();
                        registerCustomUnits(); // gdy to była własna jednostka — wycofaj z silnika
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
                            var nv = constNumericValue(c);
                            // Stała-FUNKCJA → wstaw „nazwa(" do kalkulatora, kursor w nawiasie (podaj x).
                            if (_isFuncConst(c)) {
                                var insF = c.name + '(';
                                calcExpr.value = insF;
                                switchTab('calculator');
                                calcExpr.focus();
                                calcExpr.setSelectionRange(insF.length, insF.length);
                                showToast('🔢 ' + c.name + '( … ) — podaj x', '');
                                return;
                            }
                            // Stała-KOMENDA (nieliczbowa, wygląda jak komenda) → do pola Komendy,
                            // nie do kalkulatora. Wstawiamy nazwę — rozwinie ją resolveCommandConstants.
                            if (!isFinite(nv) && looksLikeCommand(String(c.value))) {
                                graphCommand.value = c.name;
                                switchTab('komenda');
                                updateGraph();
                                if (typeof updateGraphCmdBadge === 'function') updateGraphCmdBadge(graphCommand.value.trim());
                                showToast('📐 Wstawiono komendę: ' + c.name, 'success');
                                return;
                            }
                            // Mnożnik 1 → wstaw symbolicznie nazwę (rozwinie się na żywo i zostaje czytelna).
                            // Inaczej: iloczyn liczbowy, a gdy wartość niesprowadzalna do liczby — „mult*nazwa".
                            // Stała-OPERACJA (np. „×5+2%") potrzebuje lewego operandu — wstawiamy samą
                            // nazwę (mnożnik nie ma sensu: „2*marża" → „2**5+2” byłoby błędne).
                            var insert, toastVal;
                            var isOpConst = classifyConstValue(String(c.value)).mode === 'op';
                            if (isOpConst || mult === 1) { insert = c.name; toastVal = isFinite(nv) ? formatNum(nv) : c.name; }
                            else if (isFinite(nv)) { insert = String(nv * mult); toastVal = formatNum(nv * mult); }
                            else { insert = String(mult) + '*' + c.name; toastVal = insert; }
                            calcExpr.value = insert;
                            calcExpr.setSelectionRange(calcExpr.value.length, calcExpr.value.length);
                            liveEval();
                            switchTab('calculator');
                            showToast('📊 ' + c.name + ' × ' + mult + ' = ' + toastVal, 'success');
                        }
                    }
                });
            }
        }

        addConstBtn.addEventListener('click', function() {
            var name = constName.value.trim();
            var valueStr = constValue.value.trim();
            var unit = constUnit.value.trim();

            // Własna jednostka (wariant A): PUSTA wartość + podana j.m. → rejestrujemy token jako
            // jednostkę (np. „os."). Nazwa opcjonalna (domyślnie = token). Bez konwersji — jedzie
            // z liczbą i sumuje się z samą sobą. [[project_kalkulator_notepad_planning]]
            if (!valueStr && unit) {
                var uKey = unit.toLowerCase();
                if (CALC_UNITS[uKey] && !CALC_UNITS[uKey].custom) {
                    showToast('⚠️ „' + unit + '" to już wbudowana jednostka', 'error'); return;
                }
                if (STATE.constants.some(function(c) { return c.kind === 'unit' && String(c.unit).toLowerCase() === uKey; })) {
                    showToast('⚠️ Taka jednostka już istnieje', 'error'); return;
                }
                var dimensionless = constUnitDimensionless ? constUnitDimensionless.checked : true;
                STATE.constants.push({ name: name || unit, value: '', unit: unit, kind: 'unit', dimensionless: dimensionless });
                saveConstants();
                registerCustomUnits();
                renderConstants();
                constName.value = ''; constValue.value = ''; constUnit.value = '';
                if (constUnitDimensionless) constUnitDimensionless.checked = true; // reset do domyślnego
                showToast('✅ Dodano jednostkę: ' + unit + (dimensionless ? ' (bezwymiarowa)' : ' (wymiarowa)'), 'success');
                return;
            }

            if (!name) { showToast('⚠️ Podaj nazwę stałej', 'error'); return; }
            if (!valueStr) { showToast('⚠️ Podaj wartość stałej', 'error'); return; }

            // Wartość: liczba ALBO wyrażenie/komenda/operacja („23%", „5+5*2", „5+5*vat",
            // „100 - 23%", „×5+2%"). Akceptujemy, jeśli da się policzyć w bieżącym kontekście
            // albo zawiera „%" (wynik zależny od kontekstu użycia). Zapisujemy SUROWY tekst —
            // rozwija się przy każdym użyciu.
            var cls = classifyConstValue(valueStr);
            var valueOk;
            if (cls.mode === 'func') {
                // Funkcja jednej zmiennej x — _valueIsFunc już potwierdził kompilację jako f(x).
                valueOk = true;
            } else if (cls.mode === 'op') {
                // Niedokończona operacja — sama się nie policzy. Sprawdzamy po doklejeniu
                // operandu (np. „×5+2%" → „1*5+2%"), żeby odrzucić śmieci typu „**5".
                var probeOp = evalCalcExpression('1' + cls.norm);
                valueOk = !!(probeOp && (probeOp.value !== null || probeOp.big)) || /%/.test(valueStr);
            } else {
                var probe = evalCalcExpression(valueStr);
                valueOk = (probe && (probe.value !== null || probe.text != null || probe.big))
                    || /%/.test(valueStr)
                    || looksLikeCommand(valueStr); // wyrywek komendy, np. „x=120/4 ,, @edges"
            }
            if (!valueOk) { showToast('⚠️ Nieprawidłowa wartość, wyrażenie, operacja lub komenda', 'error'); return; }

            STATE.constants.push({ name: name, value: valueStr, unit: unit });
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

        /* ============================================================
           [EN] Graceful PWA update — baner zgody zamiast nagłego reloadu
           ───────────────────────────────────────────────────────────
           Wzorzec: nowy SW czeka (waiting) → pokazujemy baner „Odśwież" →
           klik wysyła skip-waiting → nowy SW przejmuje kontrolę →
           controllerchange przeładowuje stronę DOKŁADNIE RAZ (bez pętli,
           bez gubienia wpisanego wyrażenia w trakcie pisania).
           ============================================================ */
        var swRegistration = null;
        var swRefreshing = false;
        var swWaitingWorker = null;

        function showUpdateBanner(worker) {
            swWaitingWorker = worker || (swRegistration && swRegistration.waiting) || null;
            if (!updateBanner || !swWaitingWorker) return;
            updateBanner.classList.add('is-visible');
            updateBanner.setAttribute('aria-hidden', 'false');
        }
        function hideUpdateBanner() {
            if (!updateBanner) return;
            updateBanner.classList.remove('is-visible');
            updateBanner.setAttribute('aria-hidden', 'true');
        }
        function applyUpdate() {
            if (!swWaitingWorker) { hideUpdateBanner(); return; }
            hideUpdateBanner();
            showToast('🔄 Aktualizuję…', '');
            swWaitingWorker.postMessage({ action: 'skip-waiting' });
            // reload nastąpi w 'controllerchange' (poniżej), gdy nowy SW przejmie kontrolę.
        }
        function checkForUpdates(showFeedback) {
            if (!swRegistration) { if (showFeedback) showToast('Brak aktywnej aktualizacji', ''); return; }
            if (showFeedback) showToast('Sprawdzam aktualizacje…', '');
            swRegistration.update().then(function() {
                // Jeśli nic nie czeka po sprawdzeniu — poinformuj, że jest najnowsza.
                if (showFeedback) setTimeout(function() {
                    if (!(swRegistration && swRegistration.waiting) && !swWaitingWorker)
                        showToast('✅ Masz najnowszą wersję', 'success');
                }, 1200);
            }).catch(function() {});
        }
        window.__checkForUpdates = checkForUpdates;

        if (updateBannerBtn) updateBannerBtn.addEventListener('click', applyUpdate);
        if (updateBannerClose) updateBannerClose.addEventListener('click', hideUpdateBanner);

        if ('serviceWorker' in navigator) {
            // Reload RAZ po przejęciu kontroli przez nowy SW — tylko gdy wcześniej
            // już był jakiś kontroler (czyli to AKTUALIZACJA, nie pierwsza instalacja).
            var swHadController = !!navigator.serviceWorker.controller;
            navigator.serviceWorker.addEventListener('controllerchange', function() {
                if (swRefreshing || !swHadController) return;
                swRefreshing = true;
                window.location.reload();
            });

            window.addEventListener('load', function() {
                if (isDebugOrigin()) {
                    clearLocalServiceWorker().catch(function(err) {
                        console.warn('[EN] Local Service Worker cleanup failed:', err);
                    });
                    return;
                }

                navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' })
                    .then(function(reg) {
                        swRegistration = reg;
                        console.log('[EN] Service Worker registered:', reg.scope);
                        // Update już czeka (np. zainstalowany w innej karcie).
                        if (reg.waiting && navigator.serviceWorker.controller) showUpdateBanner(reg.waiting);
                        // Nowy update w trakcie tej sesji.
                        reg.addEventListener('updatefound', function() {
                            var newWorker = reg.installing;
                            if (!newWorker) return;
                            newWorker.addEventListener('statechange', function() {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    showUpdateBanner(newWorker);
                                }
                            });
                        });
                        checkForUpdates(false); // sprawdź od razu po starcie
                    })
                    .catch(function(err) {
                        console.warn('[EN] Service Worker registration failed:', err);
                    });

                // Auto-sprawdzanie po powrocie do karty (długo otwarte karty też złapią update).
                document.addEventListener('visibilitychange', function() {
                    if (document.visibilityState === 'visible') checkForUpdates(false);
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
           [EN] Settings Modal — domyślna waluta + silnik kursów
           ============================================================ */
        // Lista podpowiadana w selectcie: zawsze popularne + cokolwiek mamy w kursach.
        var COMMON_CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP', 'CHF', 'CZK', 'NOK', 'SEK', 'DKK', 'JPY', 'CAD', 'AUD', 'UAH', 'HUF'];

        function buildCurrencyOptions() {
            if (!settingDefaultCurrency) return;
            var seen = {};
            var codes = [];
            function add(c) { c = String(c).toUpperCase(); if (!seen[c]) { seen[c] = 1; codes.push(c); } }
            COMMON_CURRENCIES.forEach(add);
            var rates = STATE.fx.rates || {};
            Object.keys(rates).forEach(add);
            add(STATE.settings.defaultCurrency); // gdyby ktoś miał egzotyk z poza listy
            // PLN na górze, reszta alfabetycznie.
            codes.sort(function(a, b) {
                if (a === 'PLN') return -1; if (b === 'PLN') return 1;
                return a < b ? -1 : a > b ? 1 : 0;
            });
            settingDefaultCurrency.innerHTML = '';
            codes.forEach(function(c) {
                var opt = document.createElement('option');
                opt.value = c;
                opt.textContent = c === 'PLN' ? 'PLN — zł (domyślnie)' : c;
                settingDefaultCurrency.appendChild(opt);
            });
            settingDefaultCurrency.value = STATE.settings.defaultCurrency;
        }

        // Wypełnia selecty domyślnych jednostek z CALC_UNIT_CATEGORIES (DRY — bez listy w HTML).
        // Pierwsza opcja = „Bazowa (auto)" (''); dalej po jednej pozycji na DISTINCT współczynnik
        // (aliasy typu kn/kt/węzły zwijają się do jednej). Sama baza pomijana (jest jako „auto").
        function buildUnitOptions() {
            if (!settingUnitSelects.length) return;
            settingUnitSelects.forEach(function(sel) {
                var cat = sel.getAttribute('data-unit-cat');
                var def = CALC_UNIT_CATEGORIES[cat];
                if (!def) return;
                sel.innerHTML = '';
                var base = document.createElement('option');
                base.value = '';
                base.textContent = 'Bazowa: ' + def.base + ' (auto)';
                sel.appendChild(base);
                var baseKey = String(def.base).toLowerCase();
                var seenFactor = {};
                Object.keys(def.units).forEach(function(u) {
                    var f = def.units[u];
                    if (seenFactor[f]) return;        // zwiń aliasy o tym samym współczynniku
                    seenFactor[f] = 1;
                    var key = u.toLowerCase();
                    if (key === baseKey) return;       // baza już jest jako „auto"
                    var opt = document.createElement('option');
                    opt.value = key;
                    opt.textContent = CALC_UNIT_DISPLAY[key] || u;
                    sel.appendChild(opt);
                });
                sel.value = (STATE.settings.defaultUnits && STATE.settings.defaultUnits[cat]) || '';
            });
        }

        function updateFxStatusLine() {
            if (!settingsFxStatus) return;
            var msg;
            if (STATE.fx.loading) msg = 'Pobieram kursy…';
            else if (!_fxReady()) msg = STATE.fx.error ? 'Kursy: brak połączenia (offline)' : 'Kursy jeszcze niepobrane';
            else msg = 'Źródło kursów: ' + fxSourceLabel(STATE.fx.source) + (STATE.fx.date ? ' · ' + STATE.fx.date : '');
            settingsFxStatus.textContent = msg;
        }

        // Checkbox zapasowego źródła: w trybie 'auto' backup jest wbudowany (merge), więc N/A.
        function syncFxBackupRow() {
            if (!settingFxBackup) return;
            settingFxBackup.checked = STATE.settings.fxBackup !== false;
            var isAuto = STATE.settings.fxEngine === 'auto';
            settingFxBackup.disabled = isAuto;
            if (settingFxBackupRow) settingFxBackupRow.classList.toggle('is-na', isAuto);
        }

        function openSettings() {
            buildCurrencyOptions();
            buildUnitOptions();
            // Zaznacz aktualny silnik.
            var radios = document.querySelectorAll('#settingFxEngine input[name="fxEngine"]');
            radios.forEach(function(r) { r.checked = (r.value === STATE.settings.fxEngine); });
            syncFxBackupRow();
            if (settingNotepadFold) settingNotepadFold.checked = !!STATE.settings.notepadFold;
            if (settingNotepadAutoUnit) settingNotepadAutoUnit.value = STATE.settings.notepadAutoUnit || 'safe';
            updateFxStatusLine();
            if (settingsVersion) settingsVersion.textContent = 'Wersja ' + (window.APP_VERSION || '—');
            document.body.classList.add('settings-open');
            settingsModal.setAttribute('aria-hidden', 'false');
            settingsBackdrop.setAttribute('aria-hidden', 'false');
            // Kursy mogą być stare/niepobrane — odśwież w tle, by status był aktualny.
            ensureFxRates();
        }
        function closeSettings() {
            document.body.classList.remove('settings-open');
            settingsModal.setAttribute('aria-hidden', 'true');
            settingsBackdrop.setAttribute('aria-hidden', 'true');
        }

        if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
        if (settingsClose) settingsClose.addEventListener('click', closeSettings);
        if (settingsCheckUpdate) settingsCheckUpdate.addEventListener('click', function() {
            if (typeof window.__checkForUpdates === 'function') window.__checkForUpdates(true);
            else showToast('Aktualizacje niedostępne (brak SW)', '');
        });
        if (settingsBackdrop) settingsBackdrop.addEventListener('click', closeSettings);
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && document.body.classList.contains('settings-open')) closeSettings();
        });

        /* ============================================================
           [EN] NOTATNIK (nakładka) — notatnik obliczeniowy Soulver-like:
           każda linia liczy się sama (reużywa evalCalcExpression), wynik na
           marginesie. „Etykieta: działanie" pomija etykietę. Słowo „razem"/
           „suma" = suma SUROWYCH pozycji powyżej (działa też w działaniu:
           „na osobę: razem / 5 os."). Własne jednostki z Fazy 0 działają tu
           tak samo. Stan zapisywany lokalnie (autosave). [[project_kalkulator_notepad_planning]]
           ============================================================ */
        // Etykieta musi zawierać literę (żeby „16:9" nie udawało etykiety); bierzemy część
        // po pierwszym dwukropku jako działanie.
        var _npNotes = [];                             // wiele notatek: [{id, text, updatedAt}]
        var _npCurrentId = null;                       // id aktywnej notatki
        var _npGlobals = {};                           // zmienne DZIELONE między notatkami (@nazwa) — TYLKO notatnik
        var _NP_LABEL_RE = /^([^:]*\p{L}[^:]*):\s*(.+)$/u;
        // „@nazwa: wartość" → zmienna dzielona między wszystkimi notatkami (ale NIE w kalkulatorze).
        var _NP_GLOBAL_RE = /^@\s*([\p{L}][\p{L}\p{N}_]*)\s*:\s*(.+)$/u;
        var _NP_TOTAL_RE = /^(razem|suma|total)$/i;
        function _npFmt(v) { return formatLocaleNumber(v, 10); }

        // ── Auto-jednostki (TYLKO notatnik): nieznany token „liczba + słowo" traktujemy jako
        // jednostkę BEZWYMIAROWĄ na czas liczenia (np. samo wpisane „3 os" → „3 os"). Reużywa
        // maszynerię własnych jednostek (rejestrujemy tymczasowo, po policzeniu usuwamy). Tryb
        // 'safe' (domyślny): proza z dodatkowymi słowami i tak się nie skompiluje → brak wyniku.
        // 'full': dodatkowo zdejmujemy zbłąkane słowa. Standardowy kalkulator tego NIE używa.
        // Stoplista spójników/przyimków — NIE robimy z nich jednostek (chronią „X na Y", frazy).
        var _NP_STOP = { 'na':1,'do':1,'w':1,'z':1,'i':1,'od':1,'to':1,'in':1,'oraz':1,'a':1,'po':1,'za':1,'lub':1,'albo':1,'ile':1,'dni':1 };
        function _npTokenKnown(w) {
            var k = String(w).toLowerCase();
            if (_NP_STOP[k]) return true;
            if (CALC_UNITS[k]) return true;
            if (_currencyTokenMap()[k]) return true;
            if (_NP_TOTAL_RE.test(w)) return true;
            if (_isDateUnit(w)) return true;
            if ((STATE.constants || []).some(function(c) { return c.name && c.name.toLowerCase() === k && c.kind !== 'unit'; })) return true;
            return false;
        }
        // Zarejestruj nieznane „liczba+słowo" tokeny z CAŁEJ notatki jako tymczasowe bezwymiarowe
        // jednostki. Zwraca klucze do późniejszego usunięcia.
        function _npAutoRegister(text, exclude) {
            var re = /(\d[\d.,]*)\s*([\p{L}][\p{L}.]*)/gu, m, added = [];
            while ((m = re.exec(text)) !== null) {
                var w = m[2], k = w.toLowerCase();
                if (CALC_UNITS[k] || _npTokenKnown(w) || (exclude && exclude[k])) continue; // pomiń też zmienne-etykiety
                CALC_UNITS[k] = { cat: 'custom:' + k, factor: 1, base: w, custom: true, dimensionless: true, _auto: true };
                CALC_UNIT_DISPLAY[k] = w;
                added.push(k);
            }
            if (added.length) rebuildUnitNamesRe();
            return added;
        }
        function _npAutoClear(keys) {
            if (!keys || !keys.length) return;
            keys.forEach(function(k) { if (CALC_UNITS[k] && CALC_UNITS[k]._auto) { delete CALC_UNITS[k]; delete CALC_UNIT_DISPLAY[k]; } });
            rebuildUnitNamesRe();
        }
        // 'full': zdejmij zbłąkane słowa (nie-jednostki, nie-stałe) z działania, by proza z odrobiną
        // matematyki dała wynik. Tokeny-jednostki (już rozpoznane/auto) zostają.
        function _npStripProse(expr) {
            return expr.replace(/[\p{L}][\p{L}.]*/gu, function(w) { return _npTokenKnown(w) ? w : ' '; }).replace(/\s+/g, ' ').trim();
        }

        // ── Etykiety-zmienne: jednowyrazowa etykieta („Paliwo: 294") definiuje zmienną
        // (paliwo=294) używalną w KOLEJNYCH liniach („paliwo * 2", „budżet - paliwo"). Top-down.
        // Nazwa = pojedyncze słowo (litery/cyfry/_), nie kolidujące z jednostką/walutą/słowem
        // kluczowym (guard _npTokenKnown). Wartość liczbowa (bez jednostki — jak „razem").
        function _npVarName(label) {
            var s = String(label == null ? '' : label).trim();
            if (!/^[\p{L}][\p{L}\p{N}_]*$/u.test(s)) return null; // tylko pojedyncze słowo
            if (_npTokenKnown(s)) return null;                     // nie nadpisuj jednostek/walut/„razem"
            return s.toLowerCase();
        }
        // Podstaw zmienne w wyrażeniu. fmtFn=null → „(wartość)" do liczenia; podany → sformatowana
        // liczba do dymka. Granice słowa odporne na polskie znaki (jak resolveCalcConstants).
        function _npSubVars(expr, vars, fmtFn) {
            var keys = Object.keys(vars);
            if (!keys.length) return expr;
            keys.sort(function(a, b) { return b.length - a.length; }); // dłuższe najpierw
            var out = expr;
            keys.forEach(function(k) {
                var esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                var re = new RegExp('(^|[^\\p{L}\\p{N}_])(' + esc + ')(?![\\p{L}\\p{N}_])', 'giu');
                out = out.replace(re, function(_m, pre) { return pre + (fmtFn ? fmtFn(vars[k]) : '(' + vars[k] + ')'); });
            });
            return out;
        }
        // Zmienne DZIELONE między notatkami: skanuj WSZYSTKIE notatki po liniach „@nazwa: wartość".
        // Wartość liczona samodzielnie (globalne mogą odwoływać się do wcześniej zebranych globalnych).
        // Obsługuje dodanie/usunięcie — przeliczane od zera. NIE dotyczy kalkulatora standard.
        function _npRebuildGlobals() {
            var g = {};
            _npNotes.forEach(function(note) {
                String(note.text || '').split('\n').forEach(function(l) {
                    var m = String(l).match(_NP_GLOBAL_RE);
                    if (!m) return;
                    var name = m[1].toLowerCase();
                    if (_npTokenKnown(name)) return;        // nie nadpisuj jednostek/walut/słów kluczowych
                    var sub = _npSubVars(m[2].trim(), g);   // globalna może użyć wcześniejszej globalnej
                    try {
                        var r = evalCalcExpression(sub);
                        if (r && typeof r.value === 'number' && isFinite(r.value)) g[name] = r.value;
                    } catch (e) {}
                });
            });
            _npGlobals = g;
        }
        function saveGlobals() {
            try { localStorage.setItem(STORAGE_KEYS.notepadGlobals, JSON.stringify(_npGlobals)); } catch (e) {}
        }

        // Liczy linie + zwraca dane do dymka (resolved = ROZPISANE równanie). Reużywa
        // evalCalcExpression, więc działają jednostki/waluty/daty/stałe/własne jednostki.
        function evalNotepadLines(text) {
            var lines = String(text == null ? '' : text).split('\n');
            var out = [];
            var runningSum = 0; // suma SUROWYCH pozycji (linie, które same nie użyły „razem")
            var items = [];     // wartości surowych pozycji (do rozpisania „razem" w dymku)
            var autoMode = (STATE.settings && STATE.settings.notepadAutoUnit) || 'safe';
            var vars = Object.assign({}, _npGlobals); // globalne (@nazwa) widoczne w KAŻDEJ notatce
            var varNames = {};   // zbiór nazw zmiennych — wykluczamy je z auto-jednostek
            Object.keys(_npGlobals).forEach(function(k) { varNames[k] = 1; });
            lines.forEach(function(l) {
                var t = String(l).trim();
                var gmm = t.match(_NP_GLOBAL_RE);
                if (gmm) { varNames[gmm[1].toLowerCase()] = 1; return; }
                var mm = t.match(_NP_LABEL_RE);
                if (mm) { var vn = _npVarName(mm[1].trim()); if (vn) varNames[vn] = 1; }
            });
            var _autoKeys = _npAutoRegister(String(text == null ? '' : text), varNames);
            try {
            for (var i = 0; i < lines.length; i++) {
                var info = { raw: lines[i], labelPart: '', exprPart: '', text: '', value: null, resolved: '', isItem: false, isTotal: false };
                var line = lines[i].trim();
                if (!line) { out.push(info); continue; }
                var exprPart = line, labelPart = '';
                var gm = line.match(_NP_GLOBAL_RE);    // „@nazwa: …" → zmienna dzielona między notatkami
                var gName = null;
                if (gm) {
                    gName = gm[1].toLowerCase();
                    if (_npTokenKnown(gName)) gName = null; // nie nadpisuj jednostek/walut/słów kluczowych
                    exprPart = gm[2].trim();
                    labelPart = line.slice(0, line.length - exprPart.length);
                }
                var lm = gm ? null : line.match(_NP_LABEL_RE);
                if (lm) { exprPart = lm[2].trim(); labelPart = line.slice(0, line.length - exprPart.length); }
                info.exprPart = exprPart; info.labelPart = labelPart;
                var usedTotal = false;
                var evalStr = exprPart.replace(/\b(razem|suma|total)\b/giu, function() {
                    usedTotal = true; return '(' + runningSum + ')';
                });
                evalStr = _npSubVars(evalStr, vars); // podstaw etykiety-zmienne (z linii powyżej)
                if (autoMode === 'full') evalStr = _npStripProse(evalStr); // zdejmij zbłąkane słowa
                var res = null;
                try { res = evalCalcExpression(evalStr); } catch (e) { res = null; }
                if (res && (res.value !== null || res.text != null || res.big)) {
                    info.text = formatCalcResult(res);
                    // Rozpisane równanie do dymka: czyste „razem" → składniki; „razem" w działaniu
                    // → podstawiona suma; zwykłe → samo działanie (bez etykiety).
                    if (_NP_TOTAL_RE.test(exprPart)) {
                        info.resolved = items.length ? items.map(_npFmt).join(' + ') : exprPart;
                    } else {
                        // rozpisz „razem" i zmienne na liczby (do dymka)
                        var disp = exprPart.replace(/\b(razem|suma|total)\b/giu, _npFmt(runningSum));
                        info.resolved = _npSubVars(disp, vars, _npFmt);
                    }
                    if (typeof res.value === 'number' && isFinite(res.value)) {
                        info.value = res.value;
                        // „razem" i definicje globalne (@nazwa) NIE są pozycjami do sumowania
                        if (usedTotal || gName) { if (usedTotal) info.isTotal = true; }
                        else { runningSum += res.value; items.push(res.value); info.isItem = true; }
                        if (gName) { vars[gName] = res.value; }            // zmienna globalna (też lokalnie poniżej)
                        else { var vn2 = lm ? _npVarName(lm[1].trim()) : null; if (vn2) vars[vn2] = res.value; }
                    } else if (usedTotal) { info.isTotal = true; }
                }
                out.push(info);
            }
            } finally { _npAutoClear(_autoKeys); } // usuń tymczasowe auto-jednostki
            return out;
        }

        // ── Edytor wierszowy: każdy wiersz = natywny <input> (najlepsze odczucie edycji/dotyku)
        // + chip wyniku na końcu linii. Hover/tap chipu → dymek z rozpisanym równaniem. Tryb fold
        // (ustawienie) chowa wyrażenie i pokazuje sam wynik, aż klikniesz wiersz. [[project_kalkulator_notepad_planning]]
        function _npSerialize() {
            if (!npEditor) return '';
            return Array.prototype.map.call(npEditor.querySelectorAll('.np-line'), function(inp) { return inp.value; }).join('\n');
        }
        // Wiersz = <textarea rows=1> (NIE <input>): zawija długie linie zamiast je ucinać i — kluczowe
        // na telefonach — daje na klawiaturze realny klawisz „Enter/↵", a nie „Dalej" (który w <input>
        // przeskakuje fokus i blokował pisanie w kolejnych liniach). Wysokość auto-rośnie do treści.
        function _npMeasure(el) {
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
            // Odróżnij ZAWINIĘTY wiersz (jedna pozycja na kilku liniach) od osobnych „enterów":
            // wieloliniowy wiersz dostaje subtelną lewą listwę, żeby było widać, że to wciąż JEDNA linia.
            var row = el.closest && el.closest('.np-row');
            if (row) {
                var lh = parseFloat(getComputedStyle(el).lineHeight) || 32;
                row.classList.toggle('np-wrapped', el.scrollHeight > lh * 1.4);
            }
        }
        function _npAutoGrow(el) {
            if (!el) return;
            _npMeasure(el);
            // Druga miara po reflow: część mobilnych przeglądarek zwraca tuż po „input" jeszcze STARY
            // scrollHeight (zawinięta linia bywała niewidoczna do następnego zdarzenia/Entera) — rAF to łata.
            requestAnimationFrame(function() { _npMeasure(el); });
        }
        function _npGrowAll() {
            if (!npEditor) return;
            Array.prototype.forEach.call(npEditor.querySelectorAll('.np-line'), _npAutoGrow);
        }
        function _npMakeRow(text) {
            var row = document.createElement('div');
            row.className = 'np-row';
            var input = document.createElement('textarea');
            input.className = 'np-line';
            input.rows = 1;
            input.value = text || '';
            input.autocapitalize = 'off'; input.autocomplete = 'off'; input.spellcheck = false;
            input.setAttribute('enterkeyhint', 'enter'); // mobilna klawiatura: „↵" zamiast „Dalej"
            input.setAttribute('aria-label', 'Linia notatnika');
            var label = document.createElement('span'); // widoczna tylko w trybie fold (zamiast inputu)
            label.className = 'np-label';
            label.setAttribute('aria-hidden', 'true');
            var res = document.createElement('button');
            res.type = 'button';
            res.className = 'np-res';
            res.tabIndex = -1;
            res.style.display = 'none';
            row.appendChild(input);
            row.appendChild(label);
            row.appendChild(res);
            return row;
        }
        function npRecompute() {
            if (!npEditor) return;
            var rows = npEditor.querySelectorAll('.np-row');
            var infos = evalNotepadLines(_npSerialize());
            rows.forEach(function(row, i) {
                var info = infos[i] || {};
                var res = row.querySelector('.np-res');
                var label = row.querySelector('.np-label');
                var has = !!info.text;
                row.classList.toggle('np-has', has);
                row.classList.toggle('np-total', !!info.isTotal);
                res.textContent = has ? info.text : '';
                res.style.display = has ? '' : 'none';
                if (has) {
                    res.dataset.eq = info.resolved || info.exprPart || '';
                    res.setAttribute('aria-label', 'Wynik ' + info.text + (res.dataset.eq ? ', z: ' + res.dataset.eq : ''));
                } else { delete res.dataset.eq; res.removeAttribute('aria-label'); }
                label.textContent = info.labelPart || '';
            });
            npEditor.classList.toggle('np-fold', !!(STATE.settings && STATE.settings.notepadFold));
        }
        function npBuildRows(text) {
            if (!npEditor) return;
            npEditor.replaceChildren();
            var lines = String(text == null ? '' : text).split('\n');
            if (!lines.length) lines = [''];
            lines.forEach(function(l) { npEditor.appendChild(_npMakeRow(l)); });
            var first = npEditor.querySelector('.np-line');
            if (first) first.placeholder = 'Pisz… np. „Nocleg: 3 * 180", potem „razem"   (Enter = nowa linia)';
            npRecompute();
            _npGrowAll();
        }
        // Rozbij wartość zawierającą „\n" na osobne wiersze. Potrzebne na telefonach: część klawiatur
        // (Android) wstawia znak nowej linii zamiast wywołać keydown „Enter" — łapiemy to w „input"
        // i dzielimy wiersz tak samo, jakby naciśnięto Enter. [[project_kalkulator_notepad_planning]]
        function _npSplitNewlines(el) {
            var row = el.closest('.np-row');
            if (!row) return;
            var parts = el.value.split('\n');
            el.value = parts[0];
            var ref = row.nextSibling, lastNew = null;
            for (var i = 1; i < parts.length; i++) {
                var nr = _npMakeRow(parts[i]);
                if (ref) npEditor.insertBefore(nr, ref); else npEditor.appendChild(nr);
                lastNew = nr;
            }
            _npCommit();
            _npGrowAll();
            var focusRow = lastNew || row;
            var fi = focusRow.querySelector('.np-line');
            if (fi) { fi.focus(); fi.setSelectionRange(0, 0); }
        }
        // ── Wiele notatek ─────────────────────────────────────────────
        function _npNewId() { return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
        function _npCurrentNote() {
            var n = _npNotes.filter(function(x) { return x.id === _npCurrentId; })[0];
            if (!n) { n = _npNotes[0]; _npCurrentId = n ? n.id : null; }
            return n || null;
        }
        // Auto-tytuł = pierwsza niepusta linia (jak Apple Notes); fallback „Pusta notatka".
        function _npTitle(note) {
            if (!note) return 'Notatka';
            var first = String(note.text || '').split('\n').map(function(s) { return s.trim(); }).filter(Boolean)[0];
            if (!first) return 'Pusta notatka';
            return first.length > 38 ? first.slice(0, 38) + '…' : first;
        }
        function saveNotepad() {
            try { localStorage.setItem(STORAGE_KEYS.notepads, JSON.stringify({ notes: _npNotes, currentId: _npCurrentId })); }
            catch (e) { showToast('⚠️ Brak miejsca na notatnik', 'error'); }
        }
        function _npStashCurrent() { // zapisz treść z edytora do bieżącej notatki (bez przerysowania)
            var n = _npCurrentNote();
            if (n) { n.text = _npSerialize(); n.updatedAt = Date.now(); }
        }
        function _npCommit() { _npStashCurrent(); _npRebuildGlobals(); saveGlobals(); npRecompute(); npRenderTitle(); saveNotepad(); }
        function npRenderTitle() { if (npTitle) npTitle.textContent = _npTitle(_npCurrentNote()); }
        function _npLoadCurrent() {
            _npRebuildGlobals();   // świeże globalne (@nazwa z innych notatek) jako seed
            var n = _npCurrentNote();
            npBuildRows(n ? n.text : '');
            npRenderTitle();
        }
        function npSwitchNote(id) {
            if (id === _npCurrentId) { npCloseList(); return; }
            _npStashCurrent();              // zachowaj bieżącą zanim przełączysz
            _npCurrentId = id;
            saveNotepad();
            _npLoadCurrent();
            npCloseList();
            var f = npEditor && npEditor.querySelector('.np-line');
            if (f) { f.focus(); var L = f.value.length; f.setSelectionRange(L, L); }
        }
        function npNewNote() {
            _npStashCurrent();
            var n = { id: _npNewId(), text: '', updatedAt: Date.now() };
            _npNotes.unshift(n);
            _npCurrentId = n.id;
            saveNotepad();
            _npLoadCurrent();
            npCloseList();
            var f = npEditor && npEditor.querySelector('.np-line');
            if (f) f.focus();
        }
        function npDeleteNote(id) {
            var wasCurrent = id === _npCurrentId;
            _npNotes = _npNotes.filter(function(x) { return x.id !== id; });
            if (!_npNotes.length) _npNotes = [{ id: _npNewId(), text: '', updatedAt: Date.now() }];
            if (wasCurrent) _npCurrentId = _npNotes[0].id;
            saveNotepad();
            npRenderList();
            if (wasCurrent) _npLoadCurrent();
        }

        // Panel listy notatek (slajd nad edytorem). Każdy wiersz: tytuł + data + kosz.
        function _npFmtWhen(ts) {
            if (!ts) return '';
            var d = new Date(ts);
            var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
            return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        }
        function npRenderList() {
            if (!npListUl) return;
            npListUl.replaceChildren();
            _npNotes.forEach(function(note) {
                var li = document.createElement('li');
                li.className = 'np-note-item' + (note.id === _npCurrentId ? ' is-current' : '');
                li.setAttribute('data-id', note.id);
                var info = document.createElement('button');
                info.type = 'button';
                info.className = 'np-note-open';
                info.setAttribute('data-id', note.id);
                var t = document.createElement('span');
                t.className = 'np-note-title';
                t.textContent = _npTitle(note);
                var when = document.createElement('span');
                when.className = 'np-note-when';
                when.textContent = _npFmtWhen(note.updatedAt);
                info.appendChild(t);
                info.appendChild(when);
                var del = document.createElement('button');
                del.type = 'button';
                del.className = 'np-note-del';
                del.setAttribute('data-id', note.id);
                del.setAttribute('aria-label', 'Usuń notatkę');
                del.textContent = '🗑️';
                li.appendChild(info);
                li.appendChild(del);
                npListUl.appendChild(li);
            });
        }
        function npOpenList() {
            if (!npListPanel) return;
            _npStashCurrent(); saveNotepad();   // świeże tytuły na liście
            npRenderList();
            npListPanel.classList.add('open');
            npListPanel.setAttribute('aria-hidden', 'false');
        }
        function npCloseList() {
            if (!npListPanel) return;
            npListPanel.classList.remove('open');
            npListPanel.setAttribute('aria-hidden', 'true');
        }
        function npToggleList() { if (npListPanel && npListPanel.classList.contains('open')) npCloseList(); else npOpenList(); }

        // Fold (zwijanie wyrażeń do wyników) jako przełącznik on/off W NOTATNIKU — bez wychodzenia
        // do ⚙️. Działa od razu (npRecompute przerysowuje), zsynchronizowany z ustawieniem.
        function updateFoldBtn() {
            if (!npFoldBtn) return;
            var on = !!(STATE.settings && STATE.settings.notepadFold);
            npFoldBtn.classList.toggle('is-on', on);
            npFoldBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
            npFoldBtn.textContent = on ? '⊞' : '⊟';
            npFoldBtn.title = on ? 'Pokaż wyrażenia (rozwiń)' : 'Zwiń wyrażenia do wyników';
            npFoldBtn.setAttribute('aria-label', npFoldBtn.title);
        }
        function npToggleFold() {
            STATE.settings.notepadFold = !STATE.settings.notepadFold;
            saveSettings();
            if (settingNotepadFold) settingNotepadFold.checked = STATE.settings.notepadFold; // sync ⚙️
            updateFoldBtn();
            npRecompute(); // natychmiast, bez zamykania notatnika
        }

        // Dymek z rozpisanym równaniem (hover na desktopie / tap na tablecie).
        var _npTipChip = null;
        function npShowTip(chip) {
            if (!npTooltip || !chip || !chip.dataset.eq) return;
            npTooltip.textContent = chip.dataset.eq;
            npTooltip.style.display = 'block';
            npTooltip.setAttribute('aria-hidden', 'false');
            var r = chip.getBoundingClientRect();
            var tw = npTooltip.offsetWidth, th = npTooltip.offsetHeight;
            var left = Math.min(Math.max(8, r.left + r.width / 2 - tw / 2), window.innerWidth - tw - 8);
            var top = r.top - th - 8;
            if (top < 8) top = r.bottom + 8;
            npTooltip.style.left = left + 'px';
            npTooltip.style.top = top + 'px';
            _npTipChip = chip;
        }
        function npHideTip() {
            if (!npTooltip) return;
            npTooltip.style.display = 'none';
            npTooltip.setAttribute('aria-hidden', 'true');
            _npTipChip = null;
        }
        function npRowKeydown(e) {
            var input = e.target;
            if (!input.classList || !input.classList.contains('np-line')) return;
            var row = input.closest('.np-row');
            if (e.key === 'Enter') {
                e.preventDefault();
                var pos = input.selectionStart != null ? input.selectionStart : input.value.length;
                var left = input.value.slice(0, pos), right = input.value.slice(pos);
                input.value = left;
                var newRow = _npMakeRow(right);
                if (row.nextSibling) npEditor.insertBefore(newRow, row.nextSibling);
                else npEditor.appendChild(newRow);
                _npCommit();
                _npAutoGrow(input);
                var ni = newRow.querySelector('.np-line');
                _npAutoGrow(ni);
                ni.focus(); ni.setSelectionRange(0, 0);
            } else if (e.key === 'Backspace' && input.selectionStart === 0 && input.selectionEnd === 0) {
                var prev = row.previousElementSibling;
                if (prev) {
                    e.preventDefault();
                    var pinp = prev.querySelector('.np-line');
                    var at = pinp.value.length;
                    pinp.value = pinp.value + input.value;
                    npEditor.removeChild(row);
                    _npCommit();
                    _npAutoGrow(pinp);
                    pinp.focus(); pinp.setSelectionRange(at, at);
                }
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                // W wieloliniowym wierszu strzałki przesuwają kursor w jego obrębie; do sąsiedniego
                // wiersza skaczemy dopiero z brzegu pola (góra: kursor na początku, dół: na końcu).
                var goUp = e.key === 'ArrowUp';
                var atStart = input.selectionStart === 0 && input.selectionEnd === 0;
                var atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
                if ((goUp && !atStart) || (!goUp && !atEnd)) return;
                var sib = goUp ? row.previousElementSibling : row.nextElementSibling;
                if (sib) {
                    e.preventDefault();
                    var s = sib.querySelector('.np-line');
                    var col = Math.min(input.selectionStart || 0, s.value.length);
                    s.focus(); s.setSelectionRange(col, col);
                }
            }
        }
        function openNotepad() {
            if (!notepadModal) return;
            document.body.classList.add('notepad-open');
            notepadModal.setAttribute('aria-hidden', 'false');
            if (npBackdrop) npBackdrop.setAttribute('aria-hidden', 'false');
            npCloseList();
            updateFoldBtn();
            _npLoadCurrent();
            npHideTip();
            // Fokus odroczony (po animacji). Guard: jeśli zamknięto w międzyczasie — nie fokusuj
            // ukrytego pola (inaczej aria-hidden + fokus = ostrzeżenie a11y).
            setTimeout(function() {
                if (!document.body.classList.contains('notepad-open')) return;
                var first = npEditor && npEditor.querySelector('.np-line');
                if (first) { first.focus(); var L = first.value.length; first.setSelectionRange(L, L); }
            }, 60);
        }
        function closeNotepad() {
            // KOLEJNOŚĆ KLUCZOWA dla a11y: najpierw fokus POZA modal (do przycisku otwierającego),
            // dopiero potem aria-hidden — inaczej ostrzeżenie „aria-hidden na elemencie z fokusem".
            npHideTip();
            _npStashCurrent(); saveNotepad();   // zapisz bieżącą treść przy wyjściu
            npCloseList();
            var active = document.activeElement;
            if (notepadBtn && typeof notepadBtn.focus === 'function') notepadBtn.focus();
            if (active && notepadModal && notepadModal.contains(document.activeElement)) document.activeElement.blur();
            document.body.classList.remove('notepad-open');
            if (notepadModal) notepadModal.setAttribute('aria-hidden', 'true');
            if (npBackdrop) npBackdrop.setAttribute('aria-hidden', 'true');
        }
        if (notepadBtn) notepadBtn.addEventListener('click', openNotepad);
        if (notepadClose) notepadClose.addEventListener('click', closeNotepad);
        if (npBackdrop) npBackdrop.addEventListener('click', closeNotepad);
        if (npListBtn) npListBtn.addEventListener('click', npToggleList);
        if (npFoldBtn) npFoldBtn.addEventListener('click', npToggleFold);
        if (npNewBtn) npNewBtn.addEventListener('click', npNewNote);
        if (npListPanel) {
            npListPanel.addEventListener('click', function(e) {
                var del = e.target.closest('.np-note-del');
                if (del) {
                    e.stopPropagation();
                    var did = del.getAttribute('data-id');
                    var note = _npNotes.filter(function(x) { return x.id === did; })[0];
                    if (note && (!note.text || !note.text.trim() || window.confirm('Usunąć notatkę „' + _npTitle(note) + '"?'))) npDeleteNote(did);
                    return;
                }
                var open = e.target.closest('.np-note-open');
                if (open) { npSwitchNote(open.getAttribute('data-id')); }
            });
        }
        if (npEditor) {
            npEditor.addEventListener('input', function(e) {
                var el = e.target;
                if (!el.classList || !el.classList.contains('np-line')) return;
                if (el.value.indexOf('\n') !== -1) { _npSplitNewlines(el); return; } // „Enter/Dalej" na mobile
                _npAutoGrow(el);
                _npCommit();
            });
            // Fokus (klik/tab/programowo) na wierszu → dopasuj wysokość (np. po odsłonięciu z trybu fold).
            npEditor.addEventListener('focusin', function(e) {
                if (e.target.classList && e.target.classList.contains('np-line')) _npAutoGrow(e.target);
            });
            // Utrata fokusu: chip wraca do flow → pole WĘŻSZE → tekst może zawinąć się na więcej linii.
            // Bez przeliczenia wysokość zostałaby z szerszego stanu i ucięłaby ostatnią linię (overflow:hidden).
            npEditor.addEventListener('focusout', function(e) {
                if (e.target.classList && e.target.classList.contains('np-line')) _npAutoGrow(e.target);
            });
            npEditor.addEventListener('keydown', npRowKeydown);
            npEditor.addEventListener('click', function(e) {
                var chip = e.target.closest('.np-res');
                if (chip) { e.stopPropagation(); if (_npTipChip === chip) npHideTip(); else npShowTip(chip); return; }
                npHideTip();
                var row = e.target.closest('.np-row'); // klik w wiersz (tryb fold) → edycja
                if (row) { var inp = row.querySelector('.np-line'); if (inp && document.activeElement !== inp) inp.focus(); return; }
                // Klik w PUSTE miejsce edytora (pod ostatnią linią) → kursor w ostatniej linii, jak w
                // Apple Notes; gdy ostatnia linia niepusta, dorzuć świeżą poniżej. [[project_kalkulator_notepad_planning]]
                if (e.target === npEditor) {
                    var lines = npEditor.querySelectorAll('.np-line');
                    var last = lines[lines.length - 1];
                    if (last && last.value.trim() !== '') {
                        var nr = _npMakeRow('');
                        npEditor.appendChild(nr);
                        _npCommit();
                        last = nr.querySelector('.np-line');
                    }
                    if (last) { last.focus(); var L = last.value.length; last.setSelectionRange(L, L); }
                }
            });
            npEditor.addEventListener('mouseover', function(e) { var c = e.target.closest('.np-res'); if (c) npShowTip(c); });
            npEditor.addEventListener('mouseout', function(e) { var c = e.target.closest('.np-res'); if (c) npHideTip(); });
            npEditor.addEventListener('scroll', npHideTip);
        }
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && document.body.classList.contains('notepad-open')) {
                if (npListPanel && npListPanel.classList.contains('open')) { npCloseList(); return; } // najpierw lista
                if (_npTipChip) { npHideTip(); return; }  // potem dymek
                closeNotepad();
            }
        });

        if (settingDefaultCurrency) {
            settingDefaultCurrency.addEventListener('change', function() {
                STATE.settings.defaultCurrency = settingDefaultCurrency.value.toUpperCase();
                saveSettings();
                // Domyślna waluta inna niż PLN może wymagać kursu, którego jeszcze nie mamy.
                ensureFxRates();
                if (typeof liveEval === 'function') liveEval();
                updateFxStatusLine();
            });
        }

        settingUnitSelects.forEach(function(sel) {
            sel.addEventListener('change', function() {
                var cat = sel.getAttribute('data-unit-cat');
                if (!STATE.settings.defaultUnits) STATE.settings.defaultUnits = {};
                STATE.settings.defaultUnits[cat] = sel.value; // '' = bazowa (auto)
                saveSettings();
                if (typeof liveEval === 'function') liveEval();
            });
        });

        var fxEngineRadios = document.querySelectorAll('#settingFxEngine input[name="fxEngine"]');
        fxEngineRadios.forEach(function(radio) {
            radio.addEventListener('change', function() {
                if (!radio.checked) return;
                STATE.settings.fxEngine = radio.value;
                saveSettings();
                syncFxBackupRow();
                // Zmiana silnika = wymuś świeże pobranie z nowego źródła.
                STATE.fx.ts = null;
                updateFxStatusLine();
                loadFxRates();
                showToast('🌍 Silnik kursów: ' + radio.value.toUpperCase(), '');
            });
        });

        if (settingFxBackup) {
            settingFxBackup.addEventListener('change', function() {
                STATE.settings.fxBackup = settingFxBackup.checked;
                saveSettings();
                // Zmiana zapasu może zmienić wynik tylko gdy główny silnik akurat pada —
                // odśwież, by stan był aktualny przy następnej próbie.
                STATE.fx.ts = null;
                loadFxRates();
            });
        }

        if (settingNotepadFold) {
            settingNotepadFold.addEventListener('change', function() {
                STATE.settings.notepadFold = settingNotepadFold.checked;
                saveSettings();
                if (document.body.classList.contains('notepad-open')) npRecompute(); // przerysuj tryb na żywo
            });
        }
        if (settingNotepadAutoUnit) {
            settingNotepadAutoUnit.addEventListener('change', function() {
                STATE.settings.notepadAutoUnit = settingNotepadAutoUnit.value === 'full' ? 'full' : 'safe';
                saveSettings();
                if (document.body.classList.contains('notepad-open')) npRecompute(); // przelicz na żywo
            });
        }

        // Po zakończeniu pobierania kursów odśwież status, jeśli modal otwarty.
        document.addEventListener('matm0-fx-updated', function() {
            if (document.body.classList.contains('settings-open')) { buildCurrencyOptions(); updateFxStatusLine(); }
        });

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
        /* ============================================================
           Zoom & Pan — Komenda canvas (viewport świata)
           Zoom/pan zmieniają widoczny zakres (pola „Zakres widoku") i
           przerysowują scenę wektorowo — bez transformacji CSS bitmapy.
        ============================================================ */
        var graphContainer    = $('#graphContainer');
        var graphCanvasWrapper = $('#graphCanvasWrapper');
        var graphZoomInBtn    = $('#graphZoomInBtn');
        var graphZoomOutBtn   = $('#graphZoomOutBtn');
        var graphZoomResetBtn = $('#graphZoomResetBtn');
        var graphZoomLabel    = $('#graphZoomLabel');
        var graphFsBtn        = $('#graphFsBtn');
        var graphFsExitBtn    = $('#graphFsExitBtn');
        var isGraphFsMode     = false;

        // Limity rozpiętości zakresu — ochrona przed zoomem w nieskończoność i błędami float.
        var GRAPH_MIN_SPAN = 1e-6, GRAPH_MAX_SPAN = 1e9;
        // Czułość zoomu (im bliżej 1, tym łagodniej). Kółko/trackpad: krok na „ząbek".
        // Pinch: tłumienie surowego stosunku odległości palców (0..1, mniej = wolniej).
        var GRAPH_WHEEL_STEP = 1.06;
        var GRAPH_PINCH_SENS = 0.45;

        function graphCanvasSize() {
            var r = graphCanvas.getBoundingClientRect();
            return {
                w: Math.round(r.width)  || graphCanvas._logicalW || GRAPH_LOGICAL_W,
                h: Math.round(r.height) || graphCanvas._logicalH || GRAPH_LOGICAL_H
            };
        }
        // Piksel ekranu (logiczny, w canvasie) → współrzędne świata.
        function graphScreenToWorld(sx, sy) {
            var b = getGraphBounds(), s = graphCanvasSize(), pad = GRAPH_PAD;
            var iw = Math.max(1, s.w - pad * 2), ih = Math.max(1, s.h - pad * 2);
            return {
                x: b.xMin + ((sx - pad) / iw) * (b.xMax - b.xMin),
                y: b.yMin + (((s.h - pad) - sy) / ih) * (b.yMax - b.yMin)
            };
        }
        function setGraphBounds(b) {
            graphXMin.value = formatRawNum(b.xMin);
            graphXMax.value = formatRawNum(b.xMax);
            graphYMin.value = formatRawNum(b.yMin);
            graphYMax.value = formatRawNum(b.yMax);
        }
        function graphSpanOk(b) {
            var sx = b.xMax - b.xMin, sy = b.yMax - b.yMin;
            return sx > GRAPH_MIN_SPAN && sx < GRAPH_MAX_SPAN && sy > GRAPH_MIN_SPAN && sy < GRAPH_MAX_SPAN;
        }

        function redrawGraphView() {
            if (typeof STATE !== 'undefined' && STATE.activeTab && STATE.activeTab !== 'komenda') return;
            var b = getGraphBounds();
            // Bariera bezpieczeństwa: błąd w rysowaniu sceny (np. nietypowe dane) NIE może
            // wywalić interakcji ani zamrozić strony — w razie czego rysujemy samą bazę.
            try {
                renderGraphScene(graphScene, b);
                if (graphScene && graphScene.type === 'graph') setGraphResultText(graphScene, b);
            } catch (e) {
                if (window.console && console.warn) console.warn('[graph] render error:', e);
                try { drawGraphBase(b); } catch (_) {}
            }
        }

        // [EN] Koalescencja renderu do jednej klatki (requestAnimationFrame). Zoom/pan/pinch
        // potrafią wystrzelić dziesiątki zdarzeń na sekundę — bez tego każde robiłoby pełny
        // redraw i ciężka scena by lagowała. Tu wiele zmian w jednej klatce = jeden render
        // (na najświeższym zakresie). Fallback na setTimeout, gdy brak rAF.
        var _graphRedrawPending = false;
        var _graphRAF = (typeof window !== 'undefined' && window.requestAnimationFrame)
            ? window.requestAnimationFrame.bind(window)
            : function(cb) { return setTimeout(cb, 16); };
        function scheduleGraphRedraw() {
            if (_graphRedrawPending) return;
            _graphRedrawPending = true;
            _graphRAF(function() {
                _graphRedrawPending = false;
                redrawGraphView();
            });
        }

        var GraphView = {
            // factor > 1 = przybliż (mniejszy zakres) wokół punktu ekranu (sx, sy w px logicznych canvasa).
            zoomAt: function(sx, sy, factor) {
                if (!isFinite(factor) || factor <= 0) return;
                var b = getGraphBounds(), wpt = graphScreenToWorld(sx, sy);
                var nb = {
                    xMin: wpt.x - (wpt.x - b.xMin) / factor,
                    xMax: wpt.x + (b.xMax - wpt.x) / factor,
                    yMin: wpt.y - (wpt.y - b.yMin) / factor,
                    yMax: wpt.y + (b.yMax - wpt.y) / factor
                };
                if (!graphSpanOk(nb)) return;
                setGraphBounds(nb);
                scheduleGraphRedraw();
            },
            // Przesuń widok o (dxPx, dyPx) w pikselach ekranu — treść podąża za kursorem/palcem.
            panByScreen: function(dxPx, dyPx) {
                if (!isFinite(dxPx) || !isFinite(dyPx)) return;
                var b = getGraphBounds(), s = graphCanvasSize(), pad = GRAPH_PAD;
                var wx = (b.xMax - b.xMin) / Math.max(1, s.w - pad * 2);
                var wy = (b.yMax - b.yMin) / Math.max(1, s.h - pad * 2);
                var dX = -dxPx * wx, dY = dyPx * wy;
                setGraphBounds({ xMin: b.xMin + dX, xMax: b.xMax + dX, yMin: b.yMin + dY, yMax: b.yMax + dY });
                scheduleGraphRedraw();
            }
        };
        // Stub zgodności (dawniej skalował bitmapę przez CSS — teraz viewport renderuje świat).
        function applyGraphTransform() {}

        function graphCanvasCenter() { var s = graphCanvasSize(); return { x: s.w / 2, y: s.h / 2 }; }
        if (graphZoomInBtn)  graphZoomInBtn.addEventListener('click',  function() { var c = graphCanvasCenter(); GraphView.zoomAt(c.x, c.y, 1.25); });
        if (graphZoomOutBtn) graphZoomOutBtn.addEventListener('click', function() { var c = graphCanvasCenter(); GraphView.zoomAt(c.x, c.y, 1 / 1.25); });
        if (graphZoomResetBtn) graphZoomResetBtn.addEventListener('click', function() {
            if (graphHome) { setGraphBounds(graphHome); redrawGraphView(); }
            else { updateGraph(); }
        });

        // Pasek narzędzi: siatka wł/wył + eksport PNG
        var graphGridBtn   = $('#graphGridBtn');
        var graphExportBtn = $('#graphExportBtn');
        if (graphGridBtn) graphGridBtn.addEventListener('click', function() {
            graphShowGrid = !graphShowGrid;
            graphGridBtn.setAttribute('aria-pressed', graphShowGrid ? 'true' : 'false');
            graphGridBtn.classList.toggle('zoom-btn-off', !graphShowGrid);
            redrawGraphView();
        });
        function exportGraphPNG() {
            try {
                var doDownload = function(url) {
                    var a = document.createElement('a');
                    a.href = url;
                    a.download = 'wizualizacja-' + new Date().toISOString().slice(0, 10) + '.png';
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                };
                if (graphCanvas.toBlob) {
                    graphCanvas.toBlob(function(blob) {
                        if (!blob) return;
                        var url = URL.createObjectURL(blob);
                        doDownload(url);
                        setTimeout(function() { URL.revokeObjectURL(url); }, 4000);
                    }, 'image/png');
                } else {
                    doDownload(graphCanvas.toDataURL('image/png'));
                }
                if (typeof showToast === 'function') showToast('⬇ Zapisano PNG', '');
            } catch (e) {
                if (typeof showToast === 'function') showToast('⚠️ Nie udało się zapisać PNG', '');
            }
        }
        if (graphExportBtn) graphExportBtn.addEventListener('click', exportGraphPNG);

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

        // [EN] Kliknięcie (bez przeciągania) w etykietę → przypnij/odepnij ją: rysuje
        // linię łączącą opis z obiektem, którego dotyczy (leader line jak w CAD). Klik w
        // puste miejsce odpina wszystko. Hit-test po `graphRenderedLabels` ostatniej klatki.
        function handleGraphTap(clientX, clientY) {
            var r = graphCanvas.getBoundingClientRect();
            var x = clientX - r.left, y = clientY - r.top;
            for (var i = graphRenderedLabels.length - 1; i >= 0; i--) {
                var L = graphRenderedLabels[i];
                if (x >= L.x1 - 4 && x <= L.x2 + 4 && y >= L.y1 - 3 && y <= L.y2 + 3) {
                    graphPinnedLabels[L.key] = !graphPinnedLabels[L.key];
                    redrawGraphView();
                    return;
                }
            }
            if (Object.keys(graphPinnedLabels).length) { graphPinnedLabels = {}; redrawGraphView(); }
        }

        /* Pan — mysz (1:1 ze światem, bez tłumienia) */
        var isGraphDragging = false;
        var gDragLastX = 0, gDragLastY = 0;
        var gDownX = 0, gDownY = 0;   // pozycja wciśnięcia — do odróżnienia kliknięcia od przeciągnięcia

        if (graphContainer) {
            graphContainer.addEventListener('mousedown', function(e) {
                if (e.button !== 0) return;
                isGraphDragging = true;
                graphContainer.classList.add('dragging');
                gDragLastX = e.clientX; gDragLastY = e.clientY;
                gDownX = e.clientX; gDownY = e.clientY;
                e.preventDefault();
            });
        }
        window.addEventListener('mousemove', function(e) {
            if (!isGraphDragging) return;
            GraphView.panByScreen(e.clientX - gDragLastX, e.clientY - gDragLastY);
            gDragLastX = e.clientX; gDragLastY = e.clientY;
        });
        window.addEventListener('mouseup', function(e) {
            if (!isGraphDragging) return;
            isGraphDragging = false;
            if (graphContainer) graphContainer.classList.remove('dragging');
            // Ledwie ruszony kursor = kliknięcie, nie przeciągnięcie.
            if (Math.abs(e.clientX - gDownX) < 5 && Math.abs(e.clientY - gDownY) < 5) handleGraphTap(e.clientX, e.clientY);
        });

        /* Pan + pinch — dotyk (zoom do środka palców, jednoczesny przesuw) */
        var gPinchLastDist = 0, gPinchLastMidX = 0, gPinchLastMidY = 0;
        var gWasPinch = false;   // czy gest był szczypaniem (wtedy touchend nie jest tapnięciem)

        // [EN] Martwe pasy na krawędziach canvasu (telefon): dotyk zaczęty przy brzegu
        // przewija STRONĘ (do tekstu pod wykresem) zamiast panować wykresem. Robimy to
        // ręcznie (scroll najbliższego scrollowalnego rodzica lub okna), bo touch-action:none
        // na kontenerze blokuje natywne przewijanie nad canvasem.
        var GRAPH_EDGE_BAND = 26;
        var gEdgeScroll = false, gEdgeScroller = null;
        function graphTouchInEdge(clientX, clientY) {
            var r = graphCanvas.getBoundingClientRect();
            var m = GRAPH_EDGE_BAND;
            return clientX < r.left + m || clientX > r.right - m || clientY < r.top + m || clientY > r.bottom - m;
        }
        function graphScrollParent() {
            var node = graphContainer ? graphContainer.parentElement : null;
            while (node && node !== document.body && node !== document.documentElement) {
                var s = getComputedStyle(node);
                if (/(auto|scroll)/.test(s.overflowY) && node.scrollHeight > node.clientHeight + 1) return node;
                node = node.parentElement;
            }
            return null;   // null → przewijamy oknem
        }

        if (graphContainer) {
            graphContainer.addEventListener('touchstart', function(e) {
                if (e.touches.length === 1) {
                    if (e.target.closest('.fs-exit-btn')) return;
                    isGraphDragging = true;
                    gWasPinch = false;
                    // Start przy krawędzi → ten gest przewija stronę, nie panuje wykresem.
                    gEdgeScroll = !isGraphFsMode && graphTouchInEdge(e.touches[0].clientX, e.touches[0].clientY);
                    gEdgeScroller = gEdgeScroll ? graphScrollParent() : null;
                    graphContainer.classList.add('dragging');
                    gDragLastX = e.touches[0].clientX; gDragLastY = e.touches[0].clientY;
                    gDownX = e.touches[0].clientX; gDownY = e.touches[0].clientY;
                    e.preventDefault();
                } else if (e.touches.length === 2) {
                    gEdgeScroll = false;
                    isGraphDragging = false;
                    gWasPinch = true;
                    graphContainer.classList.remove('dragging');
                    var dx = e.touches[1].clientX - e.touches[0].clientX;
                    var dy = e.touches[1].clientY - e.touches[0].clientY;
                    gPinchLastDist = Math.sqrt(dx*dx + dy*dy);
                    gPinchLastMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                    gPinchLastMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                    e.preventDefault();
                }
            }, { passive: false });

            graphContainer.addEventListener('touchmove', function(e) {
                if (e.touches.length === 1 && isGraphDragging) {
                    if (gEdgeScroll) {
                        // Pas krawędziowy → przewiń stronę (treść podąża za palcem).
                        var dyS = e.touches[0].clientY - gDragLastY;
                        if (gEdgeScroller) gEdgeScroller.scrollTop -= dyS; else window.scrollBy(0, -dyS);
                        gDragLastX = e.touches[0].clientX; gDragLastY = e.touches[0].clientY;
                        e.preventDefault();
                        return;
                    }
                    GraphView.panByScreen(e.touches[0].clientX - gDragLastX, e.touches[0].clientY - gDragLastY);
                    gDragLastX = e.touches[0].clientX; gDragLastY = e.touches[0].clientY;
                    e.preventDefault();
                } else if (e.touches.length === 2) {
                    var dx = e.touches[1].clientX - e.touches[0].clientX;
                    var dy = e.touches[1].clientY - e.touches[0].clientY;
                    var dist = Math.sqrt(dx*dx + dy*dy);
                    var midClientX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                    var midClientY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                    var r = graphCanvas.getBoundingClientRect();
                    if (gPinchLastDist > 0 && dist > 0) {
                        // Tłumienie: surowy stosunek odległości palców → łagodniejszy współczynnik.
                        var ratio = dist / gPinchLastDist;
                        var factor = 1 + (ratio - 1) * GRAPH_PINCH_SENS;
                        GraphView.zoomAt(midClientX - r.left, midClientY - r.top, factor);
                    }
                    GraphView.panByScreen(midClientX - gPinchLastMidX, midClientY - gPinchLastMidY);
                    gPinchLastDist = dist; gPinchLastMidX = midClientX; gPinchLastMidY = midClientY;
                    e.preventDefault();
                }
            }, { passive: false });

            graphContainer.addEventListener('touchend', function(e) {
                if (e.touches.length === 0) {
                    isGraphDragging = false;
                    graphContainer.classList.remove('dragging');
                    gPinchLastDist = 0;
                    // Tapnięcie (pojedynczy palec, bez przesunięcia, nie pinch, nie pas krawędzi) → klik w etykietę.
                    var ct = e.changedTouches && e.changedTouches[0];
                    if (ct && !gWasPinch && !gEdgeScroll && Math.abs(ct.clientX - gDownX) < 6 && Math.abs(ct.clientY - gDownY) < 6) {
                        handleGraphTap(ct.clientX, ct.clientY);
                    }
                    gEdgeScroll = false;
                } else if (e.touches.length === 1) {
                    // Z pinch wracamy do przesuwu jednym palcem.
                    isGraphDragging = true;
                    gEdgeScroll = false;
                    gDragLastX = e.touches[0].clientX; gDragLastY = e.touches[0].clientY;
                    gPinchLastDist = 0;
                }
            });

            /* Scroll kółkiem na desktopie — zoom do kursora */
            graphContainer.addEventListener('wheel', function(e) {
                e.preventDefault();
                var r = graphCanvas.getBoundingClientRect();
                var factor = e.deltaY < 0 ? GRAPH_WHEEL_STEP : 1 / GRAPH_WHEEL_STEP;
                GraphView.zoomAt(e.clientX - r.left, e.clientY - r.top, factor);
            }, { passive: false });
        }

        /* ============================================================
           [EN] Handle canvas resize
           ============================================================ */
        function handleCanvasResize() {
            if (STATE.activeTab !== 'komenda') return;
            // Sceny proporcjonalne (okrąg/FOV/wielokąt/trójkąt) muszą przeliczyć równą skalę
            // osi pod nowy rozmiar canvasa — pełny re-render (fit+equalize z aktualnymi
            // wymiarami). Inaczej po obrocie / wejściu w fullscreen proporcje się psują.
            // Pozostałe sceny zachowują bieżący zoom/pan.
            if (graphScene && graphScene.proportional) { updateGraph(); return; }
            if (graphScene && graphScene.type !== 'empty') redrawGraphView();
            else updateGraph();
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
            registerCustomUnits(); // własne jednostki użytkownika rozpoznawalne od razu w kalkulatorze

            // [EN] FAZA 1 — tylko kalkulator standardowy. Stawiamy go natychmiast, żeby był
            // interaktywny od razu po otwarciu PWA (osoba „wpadam policzyć i wypadam" nie czeka
            // na inicjalizację wykresu/Warsztatu/parsera, które są częścią innych zakładek).
            buildCalcButtons();
            calcExpr.addEventListener('input', liveEval);
            calcExpr.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); handleCalcAction('='); }
                if (e.key === 'Escape') { handleCalcAction('AC'); }
            });
            setupPlaceholderMarquee();
            liveEval();
            renderHistory();

            // [EN] FAZA 2 — reszta (wykres, stałe, ostatnie komendy, autouzupełnianie, Warsztat,
            // kreator, badge). Poza krytyczną ścieżką: w bezczynności, a najpóźniej przy pierwszym
            // wejściu w inną zakładkę (switchTab woła runDeferredInit). Główny wątek wolny dla kalkulatora.
            if ('requestIdleCallback' in window) requestIdleCallback(runDeferredInit, { timeout: 400 });
            else setTimeout(runDeferredInit, 0);
        }

        // [EN] Faza 2 „po cichu wstaje" w tle, ale POCIĘTA na kawałki — każdy w osobnym oknie
        // bezczynności (requestIdleCallback), żeby tło rozgrzewało się łagodnie i NIGDY nie zajęło
        // wątku na tyle długo, by spowolnić odczucie kalkulatora standardowego. Klik w inną zakładkę
        // domyka resztę natychmiast (flushDeferredInit). _deferredQueue: null=niewystartowane,
        // []=skończone, [..]=w trakcie sączenia.
        var _deferredQueue = null;
        function runDeferredInit() {
            if (_deferredQueue !== null) return;
            _deferredQueue = [
                function () { updateGraph(); },
                function () { renderConstants(); renderAllRecentCommands(); },
                function () { initAutocomplete(graphCommand, $('#graphCommandAC')); },
                function () { initWarsztat(); },
                function () {
                    updateKreatorModeUI();
                    updateKreatorPreview();
                    if (typeof updateGraphCmdBadge === 'function') updateGraphCmdBadge(graphCommand.value.trim());
                },
            ];
            scheduleDeferredChunk();
        }
        function scheduleDeferredChunk() {
            if (!_deferredQueue || !_deferredQueue.length) return;
            var run = function () {
                if (!_deferredQueue || !_deferredQueue.length) return;
                var task = _deferredQueue.shift();
                try { task(); } catch (e) {}
                scheduleDeferredChunk(); // następny kawałek dopiero w kolejnym oknie bezczynności
            };
            if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 600 });
            else setTimeout(run, 0);
        }
        // [EN] User wszedł w zakładkę zanim tło się dogrzało → dokończ pozostałe kawałki OD RAZU.
        function flushDeferredInit() {
            if (_deferredQueue === null) runDeferredInit();
            while (_deferredQueue && _deferredQueue.length) {
                var task = _deferredQueue.shift();
                try { task(); } catch (e) {}
            }
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
                { name: 'geometria punkt', command: 'punkt=150;200 | label=A', expect: 'geometry' },
                { name: 'kamera pozycyjna + kat HxV', command: 'kamera=0;0;4 | kąt=90;55 | cel=-1,5;10 | zasięg=30', expect: 'geometry' },
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

        // [EN] Auto-testy WIERNOŚCI rzutu x,y,z → x,y dla kamery na wysokości.
        // Każdy przypadek ma ZNANY wynik policzony z geometrii (zamknięta forma), więc
        // udowadnia, że to realna projekcja perspektywiczna, nie schemat. Sprawdzamy też
        // spójność: tekst (dNear/dFar po osi) vs. rysowany wielokąt (narożniki na canvasie).
        function runProjectionSmokeTests() {
            function geoOf(cmd) {
                var parsed = parseCommandSeries(cmd);
                if (!parsed.length || parsed[0].type !== 'geometry') throw new Error('nie sparsowano geometrii');
                return parsed[0].data;
            }
            function near(a, b, tol) { return Math.abs(a - b) <= (tol == null ? 1e-6 : tol); }
            var T = [];

            // A) Zamknięta forma głębokości po osi: oz=10, pochył=45°, pionowy FOV=30°.
            //    dNear = 10/tan(60°) = 5.773503,  dFar = 10/tan(30°) = 17.320508.
            T.push(function() {
                var g = geoOf('kamera=0;0;10 ,, kierunek=0 ,, kąt=60;30 ,, pochył=45 ,, zasięg=100');
                if (!g.footprint) return { name: 'A: footprint istnieje', pass: false };
                var f = g.footprint;
                return { name: 'A: dNear/dFar po osi (zamknięta forma)',
                    pass: !g.groundVanished && near(f.dNear, 10 / Math.tan(60 * Math.PI / 180), 1e-3)
                        && near(f.dFar, 10 / Math.tan(30 * Math.PI / 180), 1e-3) && !f.farClamped,
                    got: 'dNear=' + f.dNear.toFixed(4) + ' dFar=' + f.dFar.toFixed(4) };
            });

            // B) Daleki brzeg ucięty do zasięgu sensora (zasięg=12 < 17.32).
            T.push(function() {
                var g = geoOf('kamera=0;0;10 ,, kierunek=0 ,, kąt=60;30 ,, pochył=45 ,, zasięg=12');
                var f = g.footprint;
                return { name: 'B: daleki brzeg ucięty do zasięgu',
                    pass: !!f && f.farClamped === true && near(f.dFar, 12, 1e-6) && near(f.dNear, 10 / Math.tan(60 * Math.PI / 180), 1e-3),
                    got: f ? 'dFar=' + f.dFar.toFixed(4) + ' clamp=' + f.farClamped : 'brak footprint' };
            });

            // C) Kamera patrzy w GÓRĘ (V=45° w górę) → pole nie sięga ziemi: zero pokrycia.
            T.push(function() {
                var g = geoOf('kamera=0;0;4 ,, kąt=90;30 ,, kierunek=0;45 ,, zasięg=20');
                return { name: 'C: patrzy w górę → znika ziemia',
                    pass: g.groundVanished === true && g.footprint == null,
                    got: 'groundVanished=' + g.groundVanished + ' footprint=' + (g.footprint ? 'jest' : 'null') };
            });

            // D) Pochylenie WYLICZONE z celu: kamera 10 m nad ziemią celuje w punkt 10 m dalej
            //    → θ = atan(10/10) = 45°.
            T.push(function() {
                var g = geoOf('kamera=0;0;10 ,, cel=10;0');
                return { name: 'D: pochył z celu = atan(Δh/dyst) = 45°',
                    pass: g.tilt != null && near(g.tilt, 45, 1e-6),
                    got: 'tilt=' + (g.tilt == null ? 'null' : g.tilt.toFixed(4)) };
            });

            // E) Spójność TEKST vs RYSUNEK + symetria: dla kierunku 0° środek bliskiego brzegu
            //    (narożniki nA,nB rzutowane pełną projekcją 3D) ma x == dNear z opisu, a y symetryczne.
            T.push(function() {
                var g = geoOf('kamera=0;0;10 ,, kierunek=0 ,, kąt=60;30 ,, pochył=45 ,, zasięg=100');
                var f = g.footprint;
                var midX = (f.nA.x + f.nB.x) / 2;
                return { name: 'E: środek rysowanego bliskiego brzegu == dNear (tekst==rysunek)',
                    pass: near(midX, f.dNear, 1e-3) && near(f.nA.x, f.nB.x, 1e-6)
                        && near(f.nA.y, -f.nB.y, 1e-6) && f.dFar > f.dNear,
                    got: 'midX=' + midX.toFixed(4) + ' dNear=' + f.dNear.toFixed(4) + ' nA.y=' + f.nA.y.toFixed(3) };
            });

            // F) Wariant płaski (bez z=): brak rzutu na ziemię (footprint null), płaski wycinek.
            T.push(function() {
                var g = geoOf('kamera=0;0 ,, kierunek=0 ,, kąt=90 ,, zasięg=10');
                return { name: 'F: bez wysokości → płaski wycinek (footprint null)',
                    pass: g.footprint == null && near(g.oz, 0) && !g.groundVanished,
                    got: 'oz=' + g.oz + ' footprint=' + (g.footprint ? 'jest' : 'null') };
            });

            return T.map(function(fn) {
                try { return fn(); } catch (err) { return { name: 'wyjątek', pass: false, error: err.message }; }
            });
        }

        function runCalcSmokeTests() {
            var cases = [
                // długość (zachowane stare zachowanie — baza mm)
                { expr: '2 cm + 5 mm', value: 25, unit: 'mm' },
                { expr: '5 km na mile', value: 3.106856, unit: 'mile', tol: 1e-3 },
                { expr: "5' + 6\"", value: 1676.4, unit: 'mm' },
                { expr: '6 cali na mm', value: 152.4, unit: 'mm' },   // PL formy cala: cal/cale/cali
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
                // prędkość (oś m/s) — tokeny ze slashem łapane jako jeden token
                { expr: '100 km/h na m/s', value: 27.777778, unit: 'm/s', tol: 1e-5 },
                { expr: '10 m/s na km/h', value: 36, unit: 'km/h', tol: 1e-6 },
                { expr: '1 km/s na km/h', value: 3600, unit: 'km/h', tol: 1e-6 },
                { expr: '1 km/h na m/h', value: 1000, unit: 'm/h', tol: 1e-6 },
                { expr: '60 mph na km/h', value: 96.56064, unit: 'km/h', tol: 1e-4 },
                { expr: '100 kph na m/s', value: 27.777778, unit: 'm/s', tol: 1e-5 }, // alias kph=km/h
                { expr: '10 knots na km/h', value: 18.52, unit: 'km/h', tol: 1e-6 },
                { expr: '1 węzeł na km/h', value: 1.852, unit: 'km/h', tol: 1e-6 },
                { expr: '10 kn na m/s', value: 5.144444, unit: 'm/s', tol: 1e-5 },
                { expr: '1 ft/s na cm/s', value: 30.48, unit: 'cm/s', tol: 1e-6 },
                { expr: '36 km/h', value: 10, unit: 'm/s', tol: 1e-9 },               // sumowanie → baza m/s
                { expr: '2 mil na km', value: 3.218688, unit: 'km', tol: 1e-6 },      // regresja: „mil" dalej = mile (długość)
                // miks kategorii → brak konwersji (nie wybucha, po prostu bez wyniku jednostkowego)
                { expr: '2 kg + 3 cm', unit: null },
                { expr: '36 km/h + 5 kg', unit: null },                               // prędkość + masa → miks
                // finanse PL (VAT) — „vat" = poprawna operacja (÷/×1,23), nie alias 23%
                { expr: 'brutto 1000', value: 1230 },              // netto→brutto ×1,23
                { expr: '1000 brutto', value: 1230 },
                { expr: 'brutto 1000 8%', value: 1080 },           // własna stawka 8%
                { expr: 'netto 1230', value: 1000 },               // brutto→netto ÷1,23
                { expr: '1230 netto', value: 1000 },
                { expr: 'netto 1230 8%', value: 1230 / 1.08, tol: 1e-6 },
                { expr: '1560 - vat', value: 1560 / 1.23, tol: 1e-6 }, // usuń VAT z brutta = 1268,29
                { expr: '100 - vat', value: 100 / 1.23, tol: 1e-6 },   // = 81,30 (nie 77!)
                { expr: '50 - vat 20%', value: 50 / 1.2, tol: 1e-6 },  // ÷1,20 = 41,67
                { expr: '1000 + vat', value: 1230 },               // dodaj VAT = ×1,23
                { expr: '50 + vat 20%', value: 60 },               // ×1,20
                { expr: '1000 + vat 8%', value: 1080 },
                { expr: 'vat od 1000', value: 230 },               // sama kwota podatku
                { expr: 'vat 8% od 1000', value: 80 },
                // procent OD bazy + operatory (regresja: procent nie może „gubić się", gdy coś idzie po nim)
                { expr: '537 + 12%', value: 601.44, tol: 1e-6 },        // procent od liczby
                { expr: '3*160 + 12%', value: 537.6, tol: 1e-6 },       // procent od DZIAŁANIA
                { expr: '537 + 12% + 5', value: 606.44, tol: 1e-6 },    // (537+12%) potem +5 — NIE 542,12
                { expr: '537 + 12% - 5', value: 596.44, tol: 1e-6 },
                { expr: '100 + 10% + 10%', value: 121, tol: 1e-6 },     // łańcuch: każdy procent od bieżącej bazy
                { expr: '200 + 10% + 10%', value: 242, tol: 1e-6 },
                { expr: '100 + 10% + 5%', value: 115.5, tol: 1e-6 },
                { expr: '100 + 20 + 10%', value: 132, tol: 1e-6 },      // baza = cała lewa strona (120)
                { expr: '537*12 + 12%', value: 7217.28, tol: 1e-6 },    // procent od iloczynu
                { expr: '537 + 12%*12', value: 538.44, tol: 1e-6 },     // po „×" procent ZOSTAJE ułamkiem
                { expr: '100*50%', value: 50, tol: 1e-6 },              // 50% jako ułamek przy mnożeniu
                { expr: '100/50%', value: 200, tol: 1e-6 },
                { expr: '12%*100', value: 12, tol: 1e-6 },
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
            // Domyślne jednostki wyświetlania (ustawienia) — gołe sumy zwijają się do preferowanej;
            // jawne „X na Y" wygrywa. Zapis/odtworzenie stanu, by nie wpłynąć na inne testy.
            var savedDU = STATE.settings.defaultUnits;
            STATE.settings.defaultUnits = { speed: 'km/h', length: 'm', mass: 'kg', volume: 'l' };
            var duCases = [
                { expr: '36 km/h', value: 36, unit: 'km/h' },          // baza m/s → preferowana km/h (był 10 m/s)
                { expr: '2 m/s + 5 km/h', value: 12.2, unit: 'km/h', tol: 1e-6 }, // (2*3,6)+5
                { expr: '10 m/s na km/h', value: 36, unit: 'km/h' },   // jawne „na" wygrywa (i tak km/h)
                { expr: '100 km/h na m/s', value: 27.777778, unit: 'm/s', tol: 1e-5 }, // jawne „na" → m/s mimo domyślnej km/h
                { expr: '5 m + 200 cm', value: 7, unit: 'm' },         // 7000 mm → 7 m (baza była mm)
                { expr: '2 kg + 300 g', value: 2.3, unit: 'kg' },      // 2300 g → 2,3 kg
                { expr: '500 ml + 1 l', value: 1.5, unit: 'l' },       // 1500 ml → 1,5 l
            ];
            duCases.forEach(function(t) {
                var r = evalCalcExpression(t.expr);
                var pass = r.unit === t.unit && Math.abs(r.value - t.value) <= (t.tol || 1e-9);
                results.push({ expr: t.expr + ' (domyślna jednostka)', pass: pass, got: r.value + ' ' + r.unit });
            });
            // Pusta domyślna (auto) = zachowanie bazowe.
            STATE.settings.defaultUnits = { speed: '', length: '', mass: '', volume: '' };
            var rAuto = evalCalcExpression('36 km/h');
            results.push({ expr: '36 km/h @auto (baza)', pass: rAuto.unit === 'm/s' && Math.abs(rAuto.value - 10) < 1e-9, got: rAuto.value + ' ' + rAuto.unit });
            // Niepasująca jednostka w ustawieniu (np. speed='kg') → ignorowana, baza.
            STATE.settings.defaultUnits = { speed: 'kg', length: '', mass: '', volume: '' };
            var rBad = evalCalcExpression('36 km/h');
            results.push({ expr: "36 km/h @speed='kg' (ignoruje)", pass: rBad.unit === 'm/s' && Math.abs(rBad.value - 10) < 1e-9, got: rBad.value + ' ' + rBad.unit });
            STATE.settings.defaultUnits = savedDU;
            // „ans"/„wynik" — z zapisem i odtworzeniem stanu, by nie zaśmiecić STATE.calc.ans
            var savedAns = STATE.calc.ans;
            STATE.calc.ans = null;
            results.push({ expr: 'ans*2 (bez wyniku)', pass: evalCalcExpression('ans*2').value === null, got: null });
            STATE.calc.ans = 15;
            results.push({ expr: 'ans*2 (ans=15)', pass: evalCalcExpression('ans*2').value === 30, got: evalCalcExpression('ans*2').value });
            results.push({ expr: 'wynik+5 (ans=15)', pass: evalCalcExpression('wynik + 5').value === 20, got: evalCalcExpression('wynik + 5').value });
            STATE.calc.ans = savedAns;
            // Stałe-OPERACJE (niedokończone równania) — podstawianie DOSŁOWNE bez nawiasów.
            // Wstrzykujemy zestaw stałych, sprawdzamy użycie, przywracamy oryginalne.
            var savedConsts = STATE.constants;
            STATE.constants = [
                { name: 'marża',    value: '×5+2',  unit: '' },   // operacja: ×5+2
                { name: 'narzut',   value: '*1,23', unit: '' },   // operacja z przecinkiem
                { name: 'bonus',    value: '+10',   unit: '' },   // operacja: +10
                { name: 'ćwiartka', value: '/4',    unit: '' },   // operacja: /4 (polskie znaki)
                { name: 'marpct',   value: '×5+2%', unit: '' },   // operacja z procentem
                { name: 'ujemna',   value: '-5',    unit: '' },   // LICZBA -5 (nie operacja)
                { name: 'wyr15',    value: '5+5*2', unit: '' },   // wyrażenie (owijane w nawias)
            ];
            var constCases = [
                { expr: '100 marża',   value: 502 },      // 100×5+2
                { expr: '100 narzut',  value: 123 },      // 100*1,23
                { expr: '50 bonus',    value: 60 },       // 50+10
                { expr: '200 ćwiartka', value: 50 },      // 200/4
                { expr: '100 marpct',  value: 510 },      // 100×5 + 2% = 500 + 2%·500 (procent OD bazy)
                { expr: '100 ujemna',  value: 95 },       // 100 -5 — „-5" to LICZBA, podstawiana dosłownie
                { expr: '2*wyr15',     value: 30 },       // 2*(5+5*2) — wyrażenie wciąż w nawiasie
            ];
            constCases.forEach(function(t) {
                try {
                    var v = evalCalcExpression(t.expr).value;
                    results.push({ expr: t.expr + ' (stała-op)', pass: Math.abs(v - t.value) <= 1e-9, got: v });
                } catch (err) {
                    results.push({ expr: t.expr + ' (stała-op)', pass: false, error: err.message });
                }
            });
            // Stałe z JEDNOSTKĄ — jednostka doklejana do podstawienia (luka #1 ToDo pkt 5).
            // Waluty wymagają kursów → mockujemy fx na czas testów (zapis/odtworzenie).
            var savedFx0 = STATE.fx.rates, savedFxTs0 = STATE.fx.ts;
            STATE.fx.rates = { PLN: 1, EUR: 4.30, USD: 3.95 }; STATE.fx.ts = Date.now();
            STATE.constants = [
                { name: 'cena', value: '4,80', unit: 'zł' },   // liczba + waluta
                { name: 'dł',   value: '120',  unit: 'cm' },   // liczba + jednostka długości
                { name: 'sztuk', value: '5',   unit: 'szt' },  // NIEROZPOZNANA jednostka → ignorowana
            ];
            var unitCases = [
                { expr: 'cena * 12',  value: 57.6, unit: 'zł' },   // 4,80 zł × 12 = 57,6 zł
                { expr: 'cena na eur', value: 4.80 / 4.30, unit: 'EUR' }, // konwersja waluty
                { expr: 'dł na m',    value: 1.2,  unit: 'm' },    // 120 cm = 1,2 m
                { expr: 'sztuk * 12', value: 60,   unit: null },   // „szt" ignorowane → czysta liczba
            ];
            unitCases.forEach(function(t) {
                try {
                    var r = evalCalcExpression(t.expr);
                    var pass = Math.abs(r.value - t.value) <= 1e-6 && r.unit === t.unit;
                    results.push({ expr: t.expr + ' (stała-jednostka)', pass: pass, got: r.value + ' ' + r.unit });
                } catch (err) {
                    results.push({ expr: t.expr + ' (stała-jednostka)', pass: false, error: err.message });
                }
            });
            STATE.fx.rates = savedFx0; STATE.fx.ts = savedFxTs0;

            // Własne jednostki (wariant A): token bez wartości — rejestrujemy, jedzie z liczbą,
            // sumuje się z samą sobą, BEZ konwersji; liczbowa stała może ją nieść; nie miesza
            // kategorii. Sprzątamy rejestr po teście. [[project_kalkulator_notepad_planning]]
            var savedConstCU = STATE.constants;
            STATE.constants = [
                { name: 'os.', value: '', unit: 'os.', kind: 'unit' }, // własna jednostka
                { name: 'ludzie', value: '5', unit: 'os.' },           // liczba niosąca własną jednostkę
            ];
            registerCustomUnits();
            var cuCases = [
                { expr: '3 os. + 2 os.', value: 5,  unit: 'os.' }, // sumowanie z samą sobą
                { expr: '10 os. - 4 os.', value: 6, unit: 'os.' },
                { expr: 'ludzie * 2',    value: 10, unit: 'os.' }, // stała niesie własną jednostkę
            ];
            cuCases.forEach(function(t) {
                try {
                    var rcu = evalCalcExpression(t.expr);
                    var passcu = Math.abs(rcu.value - t.value) <= 1e-6 && rcu.unit === t.unit;
                    results.push({ expr: t.expr + ' (własna jednostka)', pass: passcu, got: rcu.value + ' ' + rcu.unit });
                } catch (err) {
                    results.push({ expr: t.expr + ' (własna jednostka)', pass: false, error: err.message });
                }
            });
            try {
                var rMix = evalCalcExpression('3 os. + 2 m'); // miks z jednostką FIZYCZNĄ → brak wyniku jednostkowego
                results.push({ expr: '3 os. + 2 m (miks fizyczny → brak jednostki)', pass: rMix.unit === null, got: String(rMix.unit) });
            } catch (err) { results.push({ expr: '3 os. + 2 m (miks)', pass: false, error: err.message }); }
            // Własna jednostka (bezwymiarowa) × WALUTA: licznik nie blokuje waluty → wygrywa zł.
            var savedFxCU = STATE.fx.rates, savedFxTsCU = STATE.fx.ts;
            STATE.fx.rates = { PLN: 1, EUR: 4.30 }; STATE.fx.ts = Date.now();
            try {
                var rCur = evalCalcExpression('3 os. * 180 zł'); // = 540 zł (os. = licznik)
                results.push({ expr: '3 os. * 180 zł (licznik × waluta = 540 zł)', pass: Math.abs(rCur.value - 540) < 1e-9 && rCur.unit === 'zł', got: rCur.value + ' ' + rCur.unit });
            } catch (err) { results.push({ expr: '3 os. * 180 zł', pass: false, error: err.message }); }
            // Własna jednostka WYMIAROWA (dimensionless:false) — trzyma wymiar, blokuje miks z walutą.
            STATE.constants = [{ name: 'pkt', value: '', unit: 'pkt', kind: 'unit', dimensionless: false }];
            registerCustomUnits();
            try {
                var rDim = evalCalcExpression('3 pkt * 180 zł'); // wymiarowa + waluta → brak wyniku
                results.push({ expr: '3 pkt * 180 zł (wymiarowa + waluta → brak)', pass: rDim.value === null && rDim.unit === null, got: rDim.value + ' ' + rDim.unit });
            } catch (err) { results.push({ expr: '3 pkt * 180 zł', pass: false, error: err.message }); }
            STATE.fx.rates = savedFxCU; STATE.fx.ts = savedFxTsCU;
            STATE.constants = savedConstCU;
            registerCustomUnits(); // sprzątanie: usuń testowe jednostki z CALC_UNITS

            // Notatnik (Faza 1): per-linia, strip etykiety „Etykieta: działanie", słowo „razem"
            // = suma surowych pozycji powyżej (też w działaniu); własna jednostka „os." z Fazy 0.
            var savedConstNP = STATE.constants;
            STATE.constants = [{ name: 'os.', value: '', unit: 'os.', kind: 'unit' }];
            registerCustomUnits();
            var npLines = evalNotepadLines(['Wyjazd w góry', 'Paliwo: 100 + 194', 'Nocleg: 3 * 180', 'razem', 'na osobę: razem / 5 os.', '16:9'].join('\n'));
            var npCases = [
                { label: 'nagłówek bez wyniku', pass: npLines[0].text === '', got: '"' + npLines[0].text + '"' },
                { label: 'Paliwo (strip etykiety) = 294', pass: npLines[1].value === 294, got: npLines[1].text },
                { label: 'Nocleg = 540', pass: npLines[2].value === 540, got: npLines[2].text },
                { label: 'razem = 834 (suma surowych)', pass: npLines[3].value === 834 && npLines[3].isTotal, got: npLines[3].text },
                { label: 'na osobę = razem/5 = 166,8 os.', pass: Math.abs(npLines[4].value - 166.8) < 1e-6 && /os\./.test(npLines[4].text), got: npLines[4].text },
                { label: '16:9 NIE etykieta (brak wyniku)', pass: npLines[5].text === '', got: '"' + npLines[5].text + '"' },
                // resolved = rozpisane równanie do dymka
                { label: 'dymek razem = „294 + 540"', pass: npLines[3].resolved === '294 + 540', got: '"' + npLines[3].resolved + '"' },
                { label: 'dymek na osobę = „834 / 5 os."', pass: npLines[4].resolved === '834 / 5 os.', got: '"' + npLines[4].resolved + '"' },
                { label: 'labelPart Nocleg', pass: /Nocleg/.test(npLines[2].labelPart), got: '"' + npLines[2].labelPart + '"' },
            ];
            npCases.forEach(function(t) { results.push({ expr: 'notatnik: ' + t.label, pass: t.pass, got: t.got }); });
            STATE.constants = savedConstNP;
            registerCustomUnits();

            // Auto-jednostki w notatniku (niezdefiniowany token „liczba+słowo" = bezwymiarowy).
            var savedAUmode = STATE.settings.notepadAutoUnit;
            var savedConstAU = STATE.constants, savedFxAU = STATE.fx.rates, savedFxTsAU = STATE.fx.ts;
            STATE.constants = []; registerCustomUnits();                 // żadnych zdefiniowanych jednostek
            STATE.fx.rates = { PLN: 1, EUR: 4.30 }; STATE.fx.ts = Date.now();
            STATE.settings.notepadAutoUnit = 'safe';
            var auSafe = evalNotepadLines('3 os * 180 zł\n3 koty\nmam 3 koty i biegam');
            results.push({ expr: 'auto-jedn safe: 3 os * 180 zł = 540 zł', pass: Math.abs(auSafe[0].value - 540) < 1e-9 && /540/.test(auSafe[0].text) && /zł/.test(auSafe[0].text), got: auSafe[0].text });
            results.push({ expr: 'auto-jedn safe: 3 koty = „3 koty"', pass: auSafe[1].value === 3 && /koty/.test(auSafe[1].text), got: auSafe[1].text });
            results.push({ expr: 'auto-jedn safe: proza „mam 3 koty i biegam" → brak', pass: auSafe[2].text === '', got: '"' + auSafe[2].text + '"' });
            STATE.settings.notepadAutoUnit = 'full';
            var auFull = evalNotepadLines('mam 3 koty');
            results.push({ expr: 'auto-jedn full: „mam 3 koty" → 3 koty (zdjęte „mam")', pass: auFull[0].value === 3 && /koty/.test(auFull[0].text), got: auFull[0].text });
            STATE.settings.notepadAutoUnit = savedAUmode;
            STATE.fx.rates = savedFxAU; STATE.fx.ts = savedFxTsAU;
            STATE.constants = savedConstAU; registerCustomUnits();

            // Etykiety-zmienne: jednowyrazowa etykieta definiuje zmienną dla kolejnych linii (top-down).
            var vlines = evalNotepadLines(['Paliwo: 100 + 194', 'Podwojone: paliwo * 2', 'Budżet: 5000', 'Zostało: budżet - paliwo', 'Przed: y + 1', 'Y: 10'].join('\n'));
            results.push({ expr: 'zmienne: paliwo=294', pass: vlines[0].value === 294, got: vlines[0].text });
            results.push({ expr: 'zmienne: paliwo*2=588', pass: vlines[1].value === 588, got: vlines[1].text });
            results.push({ expr: 'zmienne: dymek „294 * 2"', pass: vlines[1].resolved === '294 * 2', got: '"' + vlines[1].resolved + '"' });
            results.push({ expr: 'zmienne: budżet-paliwo=4706', pass: vlines[3].value === 4706, got: vlines[3].text });
            results.push({ expr: 'zmienne: odwołanie w przód (y przed def) → brak', pass: vlines[4].text === '', got: '"' + vlines[4].text + '"' });

            // Zmienne GLOBALNE (@nazwa) — dzielone między notatkami, izolacja zmiennych lokalnych.
            var savedGlobals = _npGlobals, savedNotesG = _npNotes;
            // (a) w obrębie jednej notatki: @def + użycie poniżej; @def nie jest pozycją sumy
            _npGlobals = {};
            var gl = evalNotepadLines(['@stawka: 50', 'Koszt: stawka * 3', 'razem'].join('\n'));
            results.push({ expr: 'globalne: @stawka → koszt=150', pass: gl[1].value === 150, got: gl[1].text });
            results.push({ expr: 'globalne: @def nie wlicza się do „razem" (=150)', pass: gl[2].value === 150, got: gl[2].text });
            // (b) cross-notatka: globalna z innej notatki widoczna po seedzie _npGlobals
            _npGlobals = { stawka: 50 };
            var gl2 = evalNotepadLines('Wycena: stawka * 4');
            results.push({ expr: 'globalne: cross-notatka stawka*4=200', pass: gl2[0].value === 200, got: gl2[0].text });
            // (c) izolacja: zmienna LOKALNA nie staje się globalna; @def-y tak
            _npNotes = [{ id: 'a', text: '@stawka: 50\nPaliwo: 100' }, { id: 'b', text: 'Czynsz: 2000' }];
            _npRebuildGlobals();
            results.push({ expr: 'globalne: rebuild zbiera tylko @ (stawka), nie lokalne (paliwo/czynsz)', pass: _npGlobals.stawka === 50 && _npGlobals.paliwo === undefined && _npGlobals.czynsz === undefined, got: JSON.stringify(_npGlobals) });
            _npGlobals = savedGlobals; _npNotes = savedNotesG;

            // Stałe-FUNKCJE f(x) — wywołania w kalkulatorze (test(3)/test 3/3 test), argument-stała,
            // oraz bezpieczne NIE-liczenie form dwuznacznych/bezargumentowych.
            STATE.constants = [
                { name: 'fnt',  value: '50-(20x+5)', unit: '' }, // f(x)=50-(20x+5)
                { name: 'kw',   value: 'x^2',        unit: '' }, // f(x)=x^2
                { name: 'baza', value: '4',          unit: '' }, // zwykła stała = argument
            ];
            var funcCases = [
                { expr: 'fnt(3)',     value: -15 },   // 50-(20*3+5)
                { expr: 'fnt 3',      value: -15 },   // sąsiedztwo po
                { expr: '3 fnt',      value: -15 },   // sąsiedztwo przed
                { expr: '5 + fnt(3)', value: -10 },   // w wyrażeniu
                { expr: 'fnt 3 + 4',  value: -11 },   // arg po, potem +4
                { expr: 'kw(4)',      value: 16 },
                { expr: 'kw 5',       value: 25 },
                { expr: '2*kw(3)',    value: 18 },
                { expr: 'fnt baza',   value: -35 },   // argument = stała (4) → 50-(80+5)
            ];
            funcCases.forEach(function(t) {
                try {
                    var v = evalCalcExpression(t.expr).value;
                    results.push({ expr: t.expr + ' (stała-funkcja)', pass: Math.abs(v - t.value) <= 1e-6, got: v });
                } catch (err) {
                    results.push({ expr: t.expr + ' (stała-funkcja)', pass: false, error: err.message });
                }
            });
            // Formy, które MAJĄ się nie policzyć (bezpieczeństwo): dwuznaczność i brak argumentu.
            ['5 fnt 3', 'fnt'].forEach(function(ex) {
                var v = evalCalcExpression(ex).value;
                results.push({ expr: ex + ' (funkcja: NIE liczy)', pass: v === null || !isFinite(v), got: v });
            });
            STATE.constants = savedConsts;
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
            // Miks waluty z jednostką fizyczną — NIE liczymy na siłę (value i unit = null).
            ['12 gb - 12 zł', '12 zł + 5 kg', '12 zł / 2 kg'].forEach(function(ex) {
                var r = evalCalcExpression(ex);
                results.push({ expr: ex + ' (miks waluta+jednostka: NIE liczy)', pass: r.value === null && r.unit === null, got: r.value + ' ' + r.unit });
            });
            // Waluta KOMPONUJE się z finansami/procentami (waluta liczona PRZED parserem naturalnym).
            var compCases = [
                { expr: '12pln - vat', value: 12 / 1.23, unit: 'zł' },     // VAT z kwoty walutowej (glued token)
                { expr: 'brutto 12pln', value: 12 * 1.23, unit: 'zł' },    // brutto + glued token
                { expr: 'brutto 12 zł', value: 12 * 1.23, unit: 'zł' },    // brutto + token ze spacją
                { expr: 'netto 1230 zł', value: 1000, unit: 'zł' },        // netto na kwocie walutowej
                { expr: '1000 zł + vat', value: 1000 * 1.23, unit: 'zł' }, // dodaj VAT do kwoty walutowej
                { expr: '100 usd - vat', value: (100 * 3.95) / 1.23, unit: 'zł' }, // obca waluta: VAT po przeliczeniu na PLN
                { expr: '20% z 100 zł', value: 20, unit: 'zł' },           // procent z kwoty walutowej
                { expr: 'połowa 100 zł', value: 50, unit: 'zł' },          // ułamek z kwoty walutowej
            ];
            compCases.forEach(function(t) {
                var r = evalCalcExpression(t.expr);
                var pass = t.value === null
                    ? (r.value === null)
                    : (r.unit === t.unit && Math.abs(r.value - t.value) < 1e-6);
                results.push({ expr: t.expr + ' (waluta+operacja)', pass: pass, got: r.value + ' ' + r.unit });
            });
            // Kurs krzyżowy (para bez PLN) — przez pivot PLN: 100 USD → EUR = 100*3,95/4,30.
            var cross = evalCalcExpression('100 usd na eur');
            results.push({ expr: '100 usd na eur (cross)', pass: cross.unit === 'EUR' && Math.abs(cross.value - (100 * 3.95 / 4.30)) < 1e-6, got: cross.value + ' ' + cross.unit });
            // Domyślna waluta — gołe sumy zwijają się do ustawionej waluty (nie PLN).
            var savedDef = STATE.settings.defaultCurrency;
            STATE.settings.defaultCurrency = 'EUR';
            var dc1 = evalCalcExpression('20 eur + 10 eur'); // 30 EUR (129 PLN / 4,30)
            results.push({ expr: '20 eur + 10 eur @EUR (domyślna)', pass: dc1.unit === 'EUR' && Math.abs(dc1.value - 30) < 1e-6, got: dc1.value + ' ' + dc1.unit });
            var dc2 = evalCalcExpression('43 zł'); // 43 PLN / 4,30 = 10 EUR
            results.push({ expr: '43 zł @EUR (domyślna)', pass: dc2.unit === 'EUR' && Math.abs(dc2.value - 10) < 1e-6, got: dc2.value + ' ' + dc2.unit });
            var dc3 = evalCalcExpression('20 eur na zł'); // jawny cel „na zł" WYGRYWA nad domyślną
            results.push({ expr: '20 eur na zł @EUR (jawny cel wygrywa)', pass: dc3.unit === 'zł' && Math.abs(dc3.value - 86) < 1e-9, got: dc3.value + ' ' + dc3.unit });
            STATE.settings.defaultCurrency = 'PLN';
            var dc4 = evalCalcExpression('12 zł + 20 eur'); // z powrotem zł
            results.push({ expr: '12 zł + 20 eur @PLN (domyślna)', pass: dc4.unit === 'zł' && Math.abs(dc4.value - 98) < 1e-9, got: dc4.value + ' ' + dc4.unit });
            STATE.settings.defaultCurrency = savedDef;
            // Etykiety źródeł kursów.
            results.push({ expr: 'fxSourceLabel(merge)', pass: fxSourceLabel('merge') === 'NBP + Frankfurter', got: fxSourceLabel('merge') });
            results.push({ expr: 'fxSourceLabel(frankfurter)', pass: fxSourceLabel('frankfurter') === 'Frankfurter (EBC)', got: fxSourceLabel('frankfurter') });
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
                runProjectionSmokeTests: runProjectionSmokeTests,
                runCalcSmokeTests: runCalcSmokeTests,
                evalCalcExpression: evalCalcExpression,
                evalNotepadLines: evalNotepadLines,
                npRecompute: npRecompute,
                npBuildRows: npBuildRows,
                loadFxRates: loadFxRates,
                resolveCalcCurrency: resolveCalcCurrency,
            };
        }

    })();
