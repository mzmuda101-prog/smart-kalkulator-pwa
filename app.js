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
        function expandHelpCommand(s) { // [EN] syntax tokens first, then HELP_DEFAULTS placeholders
            var filled = window.fillHelpDefaults ? window.fillHelpDefaults(expandTokens(s)) : expandTokens(s);
            return filled;
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
            //   defaultUnits — domyślna jednostka WYŚWIETLANIA per kategoria; '__auto__' = czytelny autodobór.
            settings: { defaultCurrency: 'PLN', fxEngine: 'auto', fxBackup: true,
                        defaultUnits: { speed: '__auto__', length: '__auto__', mass: '__auto__', volume: '__auto__',
                                      time: '__auto__', area: '__auto__', data: '__auto__', angle: '' },
                        notepadFold: false, // notatnik: zwijaj wyrażenia do wyników (tryb fold)
                        notepadAutoUnit: 'safe', // notatnik: auto-jednostki niezdefiniowane — 'safe' | 'full'
                        notepadUnitMix: 'strict', // notatnik: miks jednostek — 'strict' | 'first'
                        notepadSumUnit: 'off', // notatnik: jednostka przy razem/suma — 'off' | 'inherit'
                        notepadGutterHidden: false, // notatnik: panel chipów schowany (T6-3)
                        notepadFontSize: 1, // notatnik: rozmiar czcionki 0.85–1.25 (T6-1)
                        unitProfile: 'default', // T2-10: preset domyślnych jednostek
                        standardLiveHint: false, // T4-17: chipy pod polem Standard
                        standardAutocomplete: false, // T4-16: lista podpowiedzi Standard
                        suggestOnEmpty: false, // T4-19: fuzzy gdy brak wyniku
                        currencyCompactSymbols: true }, // T4-20: $ € zamiast kodów ISO
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
        const calcExprAC = $('#calcExprAC');
        const calcLiveHint = $('#calcLiveHint');
        const calcEmptySuggest = $('#calcEmptySuggest');
        const calcResult = $('#calcResult');
        const calcApprox = $('#calcApprox');
        const calcGrid = $('#calcGrid');
        const historyList = $('#historyList');
        const historySearch = $('#historySearch');
        const clearHistoryBtn = $('#clearHistory');
        const openHistoryBtn = $('#openHistory');
        const closeHistoryBtn = $('#closeHistory');
        const historyBackdrop = $('#historyBackdrop');
        const historyDrawer = $('#historyDrawer');
        const historyCount = $('#historyCount');
        const cacheRefreshBtn = $('#cacheRefreshBtn');
        const installAppBtn = $('#installAppBtn');

        // Notatnik (nakładka) [[project_kalkulator_notepad_planning]]
        const notepadBtn = $('#notepadBtn');
        const notepadModal = $('#notepadModal');
        const notepadClose = $('#notepadClose');
        const npBackdrop = $('#npBackdrop');
        const npEditor = $('#npEditor');
        const npListBtn = $('#npListBtn');
        const npFoldBtn = $('#npFoldBtn');
        const npNewBtn = $('#npNewBtn');
        const npExportBtn = $('#npExportBtn');
        const npExportMenu = $('#npExportMenu');
        const npTemplateList = $('#npTemplateList');
        const npLearnExampleBtn = $('#npLearnExampleBtn');
        const npHelpOpen = $('#npHelpOpen');
        const npTitleBtn = $('#npTitleBtn');
        const npTitleInput = $('#npTitleInput');
        const npListPanel = $('#npListPanel');
        const npListUl = $('#npListUl');
        const npListSearch = $('#npListSearch');
        const npVarsPanel = $('#npVarsPanel');
        const npVarsToggle = $('#npVarsToggle');
        const npVarsGlobal = $('#npVarsGlobal');
        const npVarsLocal = $('#npVarsLocal');
        const npVarsGlobalChips = $('#npVarsGlobalChips');
        const npVarsLocalChips = $('#npVarsLocalChips');

        // Settings modal
        const settingsBtn = $('#settingsBtn');
        const settingsModal = $('#settingsModal');
        const settingsBackdrop = $('#settingsBackdrop');
        const settingsClose = $('#settingsClose');
        const settingDefaultCurrency = $('#settingDefaultCurrency');
        const settingUnitProfile = $('#settingUnitProfile');
        const settingStandardLiveHint = $('#settingStandardLiveHint');
        const settingStandardAutocomplete = $('#settingStandardAutocomplete');
        const settingSuggestOnEmpty = $('#settingSuggestOnEmpty');
        const settingCurrencyCompactSymbols = $('#settingCurrencyCompactSymbols');
        const settingUnitSelects = Array.prototype.slice.call(document.querySelectorAll('#settingDefaultUnits select[data-unit-cat]'));
        const settingFxBackup = $('#settingFxBackup');
        const settingFxBackupRow = $('#settingFxBackupRow');
        const settingNotepadFold = $('#settingNotepadFold');
        const settingNotepadAutoUnit = $('#settingNotepadAutoUnit');
        const settingNotepadUnitMix = $('#settingNotepadUnitMix');
        const settingNotepadSumUnit = $('#settingNotepadSumUnit');
        const settingNotepadFontSize = $('#settingNotepadFontSize');
        const settingNotepadFontReset = $('#settingNotepadFontReset');
        const settingNotepadFontVal = $('#settingNotepadFontVal');
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
        const commandHelpClose = $('#commandHelpClose');
        const commandHelpBackdrop = $('#commandHelpBackdrop');
        const commandHelpDrawer = $('#commandHelpDrawer');
        const commandHelpTitle = $('#commandHelpTitle');
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
                if (h) STATE.history = JSON.parse(h).map(_histNormalize).filter(function(it) { return it.text; });
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
                if (Object.prototype.hasOwnProperty.call(STATE.recentCommands, 'engineering')) delete STATE.recentCommands.engineering;
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
                var _npSeenIds = {};
                _npNotes = _npNotes.filter(function(n) {
                    if (!n || typeof n.id !== 'string' || _npSeenIds[n.id]) return false;
                    _npSeenIds[n.id] = 1;
                    return true;
                });
                if (!_npNotes.length) {
                    _npNotes = [{ id: _npNewId(), text: '', updatedAt: Date.now() }];
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
                        if (stObj.notepadUnitMix === 'strict' || stObj.notepadUnitMix === 'first') STATE.settings.notepadUnitMix = stObj.notepadUnitMix;
                        if (stObj.notepadSumUnit === 'off' || stObj.notepadSumUnit === 'inherit') STATE.settings.notepadSumUnit = stObj.notepadSumUnit;
                        if (typeof stObj.notepadGutterHidden === 'boolean') STATE.settings.notepadGutterHidden = stObj.notepadGutterHidden;
                        if (typeof stObj.notepadFontSize === 'number' && isFinite(stObj.notepadFontSize)) STATE.settings.notepadFontSize = stObj.notepadFontSize;
                        if (stObj.defaultUnits && typeof stObj.defaultUnits === 'object') {
                            Object.keys(STATE.settings.defaultUnits).forEach(function(cat) {
                                if (typeof stObj.defaultUnits[cat] === 'string') STATE.settings.defaultUnits[cat] = stObj.defaultUnits[cat];
                            });
                        }
                        if (stObj.unitProfile === 'default' || stObj.unitProfile === 'build' || stObj.unitProfile === 'it' || stObj.unitProfile === 'travel' || stObj.unitProfile === 'custom') {
                            STATE.settings.unitProfile = stObj.unitProfile;
                        }
                        if (typeof stObj.standardLiveHint === 'boolean') STATE.settings.standardLiveHint = stObj.standardLiveHint;
                        if (typeof stObj.standardAutocomplete === 'boolean') STATE.settings.standardAutocomplete = stObj.standardAutocomplete;
                        if (typeof stObj.suggestOnEmpty === 'boolean') STATE.settings.suggestOnEmpty = stObj.suggestOnEmpty;
                        if (typeof stObj.currencyCompactSymbols === 'boolean') STATE.settings.currencyCompactSymbols = stObj.currencyCompactSymbols;
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
            // Haptyka TYLKO przy znaczących zdarzeniach: potwierdzenie (sukces) i błąd.
            // Neutralne info ('') nie wibruje — żeby nie była natrętna. Cyfry/operatory
            // mają już natywny feedback systemu, więc tu ich celowo nie dublujemy.
            if (type === 'success') hapticTap(12);
            else if (type === 'error') hapticTap([0, 28, 50, 28]);
        }

        // Wzór wibracji jako sygnał dotykowy — łagodny, opcjonalny. Akceptuje liczbę
        // (ms) lub wzór (tablica). Respektuje „ogranicz ruch/animacje" (dostępność).
        var _prefersReducedMotion = window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        function hapticTap(pattern) {
            if (_prefersReducedMotion) return;
            if (navigator.vibrate) {
                navigator.vibrate(pattern == null ? 15 : pattern);
            }
        }

        /* ============================================================
           [EN] Tryb ciemny. Atrybut [data-theme="dark"] na <html> ustawia już
           wczesny skrypt inline w <head> (anty-FOUC) — tu tylko: synchronizacja
           ikony przycisku, przełączanie, zapis wyboru i kolor paska przeglądarki.
           Klucz 'matm0_theme': 'dark' | 'light' | brak = auto (śledzi system).
           ============================================================ */
        var THEME_PREF_KEY = 'matm0_theme';
        var THEME_META_COLOR = { light: '#2563eb', dark: '#0e1217' };
        function isDarkTheme() {
            return document.documentElement.getAttribute('data-theme') === 'dark';
        }
        function applyTheme(dark, persist) {
            document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
            var btn = $('#themeToggleBtn');
            if (btn) {
                // Pokazujemy ikonę DOCELOWĄ (co zrobi tap): w ciemnym → słońce (włącz jasny).
                btn.textContent = dark ? '☀️' : '🌙';
                btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
                btn.title = dark ? 'Tryb jasny' : 'Tryb ciemny';
                btn.setAttribute('aria-label', 'Przełącz na ' + (dark ? 'tryb jasny' : 'tryb ciemny'));
            }
            var meta = document.getElementById('metaThemeColor');
            if (meta) meta.setAttribute('content', dark ? THEME_META_COLOR.dark : THEME_META_COLOR.light);
            if (persist) {
                try { localStorage.setItem(THEME_PREF_KEY, dark ? 'dark' : 'light'); } catch (e) {}
            }
        }
        function initTheme() {
            // Inline-skrypt już ustawił atrybut; tu dociągamy ikonę/meta do realnego stanu.
            applyTheme(isDarkTheme(), false);
            var btn = $('#themeToggleBtn');
            if (btn) btn.addEventListener('click', function() {
                applyTheme(!isDarkTheme(), true);   // ręczny wybór = zapamiętaj
                hapticTap(12);
            });
            // Bez ręcznego wyboru śledź zmianę motywu systemu na żywo.
            if (window.matchMedia) {
                var mq = window.matchMedia('(prefers-color-scheme: dark)');
                var onSys = function(e) {
                    var pref = null;
                    try { pref = localStorage.getItem(THEME_PREF_KEY); } catch (e2) {}
                    if (pref !== 'dark' && pref !== 'light') applyTheme(e.matches, false);
                };
                if (mq.addEventListener) mq.addEventListener('change', onSys);
                else if (mq.addListener) mq.addListener(onSys);
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
                maximumFractionDigits: maxDigits == null ? 6 : maxDigits,
                useGrouping: true,
            });
        }
        function _roundMoney(n) { // [EN] grosze — decimal.js when loaded, else float fallback
            var M = (typeof window !== 'undefined' && window.MATM0_MONEY) || null;
            if (M && typeof M.roundMoney === 'function') return M.roundMoney(n);
            if (!isFinite(n)) return n;
            return Math.round(n * 100) / 100;
        }
        // [EN] Tight display gaps — CSS clip inside fixed-width spans; copy via textContent unchanged.
        function _needsTightMarkup(text) { return !!text && /[\u00a0 \u202f]/.test(String(text)); }
        function _htmlTightResult(text) {
            var out = '';
            var s = String(text);
            for (var i = 0; i < s.length; i++) {
                var ch = s.charAt(i);
                if (ch === '\u00a0') out += '<span class="num-grp-sep">\u00a0</span>';
                else if (ch === '\u202f' || ch === ' ') {
                    var prev = i > 0 ? s.charAt(i - 1) : '';
                    var next = i < s.length - 1 ? s.charAt(i + 1) : '';
                    var cls = (prev === '=' || next === '=') ? 'eq-sep' : 'txt-sep'; // [EN] tighter gap around =
                    out += '<span class="' + cls + '">' + ch + '</span>';
                } else out += ch;
            }
            return out;
        }
        function _appendResultMarkup(el, plain) {
            if (!el || !plain) return;
            var parts = String(plain).split('\n');
            parts.forEach(function(line, i) {
                if (i > 0) el.appendChild(document.createTextNode('\n'));
                if (!_needsTightMarkup(line)) el.appendChild(document.createTextNode(line));
                else {
                    var wrap = document.createElement('span');
                    wrap.innerHTML = _htmlTightResult(line); // [EN] tight seps — copy via textContent still works
                    while (wrap.firstChild) el.appendChild(wrap.firstChild);
                }
            });
        }
        function _formattedIdxForCoreCount(text, coreCount) {
            var idx = 0, counted = 0;
            while (idx < text.length && counted < coreCount) {
                if (!/\s/.test(text.charAt(idx))) counted++;
                idx++;
            }
            while (idx < text.length && /\s/.test(text.charAt(idx))) idx++;
            return idx;
        }
        function _setResultMarkup(el, plain) {
            if (!el) return;
            el.textContent = '';
            if (plain) _appendResultMarkup(el, plain);
        }
        function _appendAnimatedDigits(parent, text) {
            if (!parent || !text) return;
            var s = String(text);
            for (var i = 0; i < s.length; i++) {
                var ch = s.charAt(i);
                if (ch === '\n') { parent.appendChild(document.createTextNode('\n')); continue; }
                if (ch === '\u00a0' || ch === '\u202f' || ch === ' ') {
                    var sep = document.createElement('span');
                    var prevCh = i > 0 ? s.charAt(i - 1) : '';
                    var nextCh = i < s.length - 1 ? s.charAt(i + 1) : '';
                    sep.className = ch === '\u00a0' ? 'num-grp-sep'
                        : ((prevCh === '=' || nextCh === '=') ? 'eq-sep' : 'txt-sep');
                    if (ch === '\u00a0') sep.innerHTML = '\u00a0'; else sep.textContent = ch;
                    parent.appendChild(sep);
                    continue;
                }
                var span = document.createElement('span');
                span.className = 'calc-result-new'; // [EN] jeden span na cyfrę — Samsung-style
                span.textContent = ch;
                parent.appendChild(span);
            }
            _markResultAnim();
        }

        /* ============================================================
           [EN] Haptic'stics — Selective Vibration on Interactions
           ============================================================ */

        /* ---- Haptyka: tylko przy kliknięciu, nie przy scrollowaniu ---- */
        /* Lista elementów które NIE wibrują (niezależnie od kliknięcia) */
        var NO_HAPTIC = [
            '.zoom-btn',          /* przyciski zoom na canvasie */
            '.sign-toggle',       /* przycisk ± przy polach marginesów */
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
           [EN] Calc keypad — Samsung-style press glow (pointer origin)
           ============================================================ */
        var _pressedCalcBtn = null;
        function _setCalcBtnPressed(btn, on) {
            if (!btn) return;
            btn.classList.toggle('is-pressed', !!on);
        }
        function _clearCalcBtnPress() {
            if (_pressedCalcBtn) {
                _setCalcBtnPressed(_pressedCalcBtn, false);
                _pressedCalcBtn = null;
            }
        }
        function _spawnCalcBtnGlow(btn, clientX, clientY) {
            if (!btn || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            var rect = btn.getBoundingClientRect();
            if (rect.width < 4 || rect.height < 4) return;
            var glow = document.createElement('span');
            glow.className = 'calc-btn-glow';
            glow.setAttribute('aria-hidden', 'true');
            glow.style.left = (clientX - rect.left) + 'px';
            glow.style.top = (clientY - rect.top) + 'px';
            if (btn.classList.contains('calc-btn--equals')) glow.dataset.kind = 'equals';
            else if (btn.classList.contains('calc-btn--operator')) glow.dataset.kind = 'operator';
            else if (btn.classList.contains('clear') || btn.classList.contains('calc-btn--clear')) glow.dataset.kind = 'clear';
            else if (btn.classList.contains('calc-btn--fn')) glow.dataset.kind = 'fn';
            btn.appendChild(glow);
            glow.addEventListener('animationend', function() { glow.remove(); }, { once: true });
        }
        function _bindCalcBtnPressFeedback(grid) {
            if (!grid || grid.dataset.pressFxBound) return;
            grid.dataset.pressFxBound = '1';
            grid.addEventListener('pointerdown', function(e) {
                if (e.button !== undefined && e.button !== 0) return;
                var btn = e.target.closest('.calc-btn');
                if (!btn || !grid.contains(btn)) return;
                _clearCalcBtnPress();
                _pressedCalcBtn = btn;
                _setCalcBtnPressed(btn, true);
                _spawnCalcBtnGlow(btn, e.clientX, e.clientY);
            }, { passive: true });
            ['pointerup', 'pointercancel'].forEach(function(ev) {
                grid.addEventListener(ev, _clearCalcBtnPress, { passive: true });
            });
            document.addEventListener('pointerup', _clearCalcBtnPress, { passive: true }); // [EN] release poza gridem
        }

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
                setTimeout(function() {
                    _calcBtnScale = 1;
                    updatePlaceholderMarquee();
                    fitCalcLayout();
                    fitCalcDisplay();
                }, 0);
            } else {
                document.body.classList.remove('calc-panel-active');
                document.body.classList.remove('calc-split-active');
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
        // Guard: zwijanie/rozwijanie belki reflowuje treść → odpala scroll-eventy, które
        // BEZ tej blokady napędzały pętlę (belka „nie wie" czy się otworzyć czy zamknąć =
        // shuttering przy stykowych pozycjach). Po zmianie stanu ignorujemy scroll na czas
        // tranzycji (0.28s + bufor), żeby reflow nie przełączał belki z powrotem.
        var _headerAnimating = false, _headerAnimTimer = 0;
        function setHeaderCollapsed(on) {
            if (_narrowMQ && !_narrowMQ.matches) on = false; // desktop: zawsze rozwinięty
            on = !!on;
            if (document.body.classList.contains('header-collapsed') === on) return; // bez zmiany → nie ruszaj
            document.body.classList.toggle('header-collapsed', on);
            _headerAnimating = true;
            clearTimeout(_headerAnimTimer);
            _headerAnimTimer = setTimeout(function() {
                _headerAnimating = false;
                if (STATE.activeTab === 'calculator') {
                    _calcBtnScale = 1;
                    fitCalcLayout();
                    fitCalcDisplay();
                }
            }, 360);
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
                    if (_headerAnimating) return;      // pomiń reflow-scroll w trakcie tranzycji
                    var y = panelsEl.scrollTop;
                    var dy = y - _lastScrollY;
                    // Histereza: zwiń dopiero po wyraźnym ruchu w dół poniżej progu; rozwiń tylko
                    // przy ruchu w górę blisko szczytu — między progami jest martwa strefa, więc
                    // drobny jitter na „stykowej" pozycji już nie przełącza belki.
                    if (dy > 8 && y > 48) setHeaderCollapsed(true);
                    else if (dy < -8) setHeaderCollapsed(false);
                    _lastScrollY = y;
                }, { passive: true });
            }
        }

        // [EN] Most bezpiecznego dołu (safe-area). env(safe-area-inset-bottom) bywa chwilowo 0
        // zaraz po PROGRAMOWYM reloadzie (po „Odśwież" z banera aktualizacji) — zanim chrome PWA
        // zaraportuje inserty. Skutek: dolne przyciski/obwódka kalkulatora minimalnie wchodzą pod
        // belkę nawigacji, a wyjście+wejście do apki to naprawia (resize re-mierzy inset). Tu robimy
        // to automatycznie: mierzymy realny inset SONDĄ i zapisujemy do --safe-bottom (inline na
        // <html> wygrywa z :root env), re-mierząc po każdym sygnale ustabilizowania widoku oraz w
        // kilku opóźnionych klatkach po starcie. Rotacja/klawiatura też trafiają (resize/vv/orient).
        (function setupSafeBottomSync() {
            var probe = document.createElement('div');
            probe.setAttribute('aria-hidden', 'true');
            probe.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;' +
                'height:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none;z-index:-1;';
            document.body.appendChild(probe);
            var _lastSB = -1;
            function syncSafeBottom() {
                var h = Math.round(probe.getBoundingClientRect().height * 100) / 100;
                if (h === _lastSB) return;                 // bez zmiany → nie dotykaj layoutu
                _lastSB = h;
                document.documentElement.style.setProperty('--safe-bottom', h + 'px');
            }
            ['resize', 'orientationchange', 'pageshow'].forEach(function(ev) {
                window.addEventListener(ev, syncSafeBottom, { passive: true });
            });
            document.addEventListener('visibilitychange', function() {
                if (document.visibilityState === 'visible') syncSafeBottom();
            });
            if (window.visualViewport) window.visualViewport.addEventListener('resize', syncSafeBottom, { passive: true });
            // Opóźnione próby — inset bywa 0 przez 1-2 klatki po reloadzie; re-pomiar wymusza repaint.
            requestAnimationFrame(function() { requestAnimationFrame(syncSafeBottom); });
            setTimeout(syncSafeBottom, 150);
            setTimeout(syncSafeBottom, 500);
            setTimeout(syncSafeBottom, 1200);
            syncSafeBottom();
        })();

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
            // Grid jest STATYCZNY w HTML (maluje się przy pierwszym paint, jeszcze przed app.js).
            // Tu tylko podpinamy JEDEN delegowany listener zamiast 20 osobnych. Fallback: gdyby grid
            // był pusty (stary cache HTML), odtwórz przyciski z danych calcButtons (źródło zapasowe).
            if (!calcGrid.querySelector('.calc-btn')) {
                calcButtons.forEach(function(row) {
                    for (var i = 0; i < row.length; i += 2) {
                        var btn = document.createElement('button');
                        btn.className = 'calc-btn calc-btn--' + row[i + 1];
                        btn.textContent = row[i];
                        btn.setAttribute('data-action', row[i]);
                        calcGrid.appendChild(btn);
                    }
                });
            }
            calcGrid.addEventListener('pointerdown', function(e) {
                if (e.button !== undefined && e.button !== 0) return;
                var btn = e.target.closest('.calc-btn');
                if (btn && calcGrid.contains(btn)) handleCalcAction(btn.getAttribute('data-action'));
            });
            _bindCalcBtnPressFeedback(calcGrid); // [EN] press + halo — osobny listener (passive, bez blokowania akcji)
        }

        /* ============================================================
           [EN] Calculator Logic — Raycast-style expression evaluator
           ============================================================ */

        // ── Jednostki konwersji (kategorie) ─────────────────────────
        // factor = ile jednostek bazowych kategorii mieści się w 1 tej jednostce.
        // Temperatura jest skalą afiniczną (offset) → osobna obsługa niżej.
        // Tablice danych przeniesione do js/data-tables.js (clean look) — czytamy z namespace.
        var CALC_UNIT_CATEGORIES = (window.MATM0_DATA || {}).UNIT_CATEGORIES || {};
        var _PARSER = (typeof window !== 'undefined' && window.MATM0_PARSER) || {}; // [EN] single parser handle for units + currency + time
        var _NUMERIC = (typeof window !== 'undefined' && window.MATM0_NUMERIC) || {}; // [EN] faza 3 — BigInt + compileExpression
        function tryBigIntCalc(raw) { return _NUMERIC.tryBigIntCalc(raw); }
        function groupBigIntStr(str) { return _NUMERIC.groupBigIntStr(str); }
        function compileGraphExpression(raw) { return _NUMERIC.compileGraphExpression(raw); }
        function stripFunctionPrefix(raw) { return _NUMERIC.stripFunctionPrefix(raw); }
        var _unitRegistry = _PARSER.buildUnitRegistry(CALC_UNIT_CATEGORIES);

        // Płaska mapa: nazwa jednostki (lowercase) → { cat, factor, base }
        var CALC_UNITS = _unitRegistry.units || {};
        var CALC_UNIT_DISPLAY = _unitRegistry.display || {}; // lowercase → oryginalna pisownia (np. „mb" → „MB")

        // PL: odmiana jednostek słownych w wyniku (1 stopa · 2 stopy · 5 stóp).
        function inflectDisplayUnit(value, unit) {
            if (unit == null || unit === '') return unit;
            var data = window.MATM0_DATA || {};
            var inflect = data.inflectUnit || data.plInflectUnit;
            return typeof inflect === 'function' ? inflect(value, unit) : unit;
        }

        // [EN] Preprocess — faza 1 ekstrakcji (logika w js/smart-parser.js)
        function expandNumericShorthands(raw) {
            return _PARSER.expandNumericShorthands(raw);
        }
        function expandCurrencyShorthands(raw) {
            return _PARSER.expandCurrencyShorthands(raw, { fxRates: (STATE.fx && STATE.fx.rates) || {} });
        }
        function resolveTrigDegrees(raw) {
            return _PARSER.resolveTrigDegrees(raw);
        }
        function _plFold(s) { // [EN] PL diacritics → ASCII before NL regex (MATM0_PL_FOLD)
            var F = (typeof window !== 'undefined' && window.MATM0_PL_FOLD) || null;
            return F && F.foldLower ? F.foldLower(s) : String(s || '').toLowerCase();
        }
        function parseNaturalShortcuts(raw) {
            return _PARSER.parseNaturalShortcuts(raw);
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
        // [EN] Strip currency tokens to bare numbers — notepad first-unit mode when physical wins
        function _stripCurrencyAmounts(raw) {
            var tokenRe = _currencyTokenRe();
            if (!tokenRe) return raw;
            var amountRe = new RegExp('([\\d.,]+)\\s*(' + tokenRe + ')(?![a-ząćęłńóśźż0-9])', 'gi');
            var revAmountRe = new RegExp('\\b(' + tokenRe + ')\\s*([\\d.,]+)(?![a-ząćęłńóśźż0-9])', 'gi');
            var out = String(raw || '').replace(amountRe, '$1');
            return out.replace(revAmountRe, '$2');
        }
        // [EN] Strip physical unit labels — notepad first-unit mode when currency wins
        function _stripPhysicalUnits(raw) {
            if (!_UNIT_NAMES_RE) return raw;
            var unitRe = new RegExp('([\\d.,]+)\\s*(' + _UNIT_NAMES_RE + ')(?![A-Za-z0-9])', 'gi');
            return String(raw || '').replace(unitRe, '$1');
        }
        function resolveCalcUnits(raw, opts) {
            opts = opts || {};
            return _PARSER.resolveUnitsExpression(raw, {
                firstUnitWins: !!opts.firstUnitWins,
                unitDefs: CALC_UNITS,
                unitDisplay: CALC_UNIT_DISPLAY,
                unitNamesRe: _UNIT_NAMES_RE,
                defaultUnits: (STATE.settings && STATE.settings.defaultUnits) || {},
            });
        }

        // Preferowana jednostka WYŚWIETLANIA dla kategorii (z ustawień). Generyczne — działa dla
        // dowolnej kategorii z CALC_UNITS; UI wystawia tylko część. Zwraca { label, factor } albo null.
        function _preferredDisplayUnit(cat) {
            var du = (STATE.settings && STATE.settings.defaultUnits) || {};
            var name = du[cat];
            if (!name || name === '__auto__') return null; // [EN] __auto__ handled separately (chooseUnit / readable time)
            var key = String(name).toLowerCase();
            var def = CALC_UNITS[key];
            if (!def || def.cat !== cat) return null; // nieznana/niepasująca → ignoruj (bezpiecznie)
            return { label: CALC_UNIT_DISPLAY[key] || name, factor: def.factor };
        }

        /* ============================================================
           [EN] Czas zegarowy + DATY — wydzielone do modułu js/smart-parser.js
           (window.MATM0_PARSER). Pkt 2 kierunku „typowanego silnika": kolejni najemcy
           smart-parsera (czas, teraz daty). Tu tylko cienkie wiązanie.
           „za 3 tygodnie", „ile dni do 1.09", „dziś + 90 dni" → evalDateExpression.
           ============================================================ */
        var evalClockExpression = _PARSER.evalClockExpression;
        var evalDateExpression = _PARSER.evalDateExpression;
        var evalPeriodPercentage = _PARSER.evalPeriodPercentage;
        var evalPercentQuery = _PARSER.evalPercentQuery;
        var evalPercentOfPercent = _PARSER.evalPercentOfPercent;
        var evalPercentDifference = _PARSER.evalPercentDifference;
        function evalPercentBaseQuery(raw) {
            return _PARSER.evalPercentBaseQuery(raw, {
                fxRates: (STATE.fx && STATE.fx.rates) || {},
                currencyCompactSymbols: !(STATE.settings && STATE.settings.currencyCompactSymbols === false),
            });
        }
        function _applyParserCalcResult(r) { // [EN] plain parser result → STATE + makeVal
            if (!r) return null;
            STATE.calc.lastResult = r.value;
            STATE.calc.lastUnit = r.unit != null ? r.unit : null;
            return makeVal(r);
        }
        function classifyConstValue(val) { return _PARSER.classifyConstValue(val); }
        function _valueIsFunc(val) { return _PARSER.valueIsFunc(val); }
        function _isFuncConst(c) { return _PARSER.isFuncConst(c); }
        function _funcConstBody(c) { return _PARSER.funcConstBody(c); }
        function _knownConstUnit(u) {
            return _PARSER.knownConstUnit(u, {
                unitDefs: CALC_UNITS,
                fxRates: (STATE.fx && STATE.fx.rates) || {},
            });
        }
        function _parserConstOpts(constants) {
            return {
                constants: constants != null ? constants : STATE.constants,
                unitDefs: CALC_UNITS,
                fxRates: (STATE.fx && STATE.fx.rates) || {},
                evalConstNumeric: _evalConstNumeric,
            };
        }
        function _evalConstNumeric(c) { // [EN] callback for func-const args — stays in app (uses full eval)
            if (_isFuncConst(c)) return NaN;
            if (typeof c.value === 'number') return c.value;
            var r = evalCalcExpression(String(c.value));
            return r && typeof r.value === 'number' && isFinite(r.value) ? r.value : NaN;
        }
        function resolveCalcAnswer(raw) { return _PARSER.resolveCalcAnswer(raw, STATE.calc.ans); }
        function resolveCalcConstants(raw, constants) { return _PARSER.resolveCalcConstants(raw, _parserConstOpts(constants)); }
        function evalRouteCost(raw) { return _applyParserCalcResult(_PARSER.evalRouteCost(raw)); }
        var formatDurationSeconds = _PARSER.formatDurationSeconds;
        var evalTimezoneExpression = _PARSER.evalTimezoneExpression;
        var _isDateUnit = _PARSER.isDateUnit;

        /* ============================================================
           [EN] Waluty — „12 zł + 20 eur", „20 eur na zł" (kursy NBP, offline z cache)
           ============================================================ */
        // Aliasy → kod ISO. Kody z NBP (np. CZK) dochodzą dynamicznie z pobranych kursów.
        // UWAGA: NIE mapujemy „funt" na GBP — „funt" to już jednostka masy.
        var FX_TTL_MS = 6 * 3600 * 1000; // 6 h — po tym czasie odśwież w tle

        function _currencyTokenMap() {
            return _PARSER.currencyTokenMap((STATE.fx && STATE.fx.rates) || {});
        }
        function _currencyDisplay(code) {
            return _PARSER.currencyDisplay(code, {
                currencyCompactSymbols: !(STATE.settings && STATE.settings.currencyCompactSymbols === false),
            });
        }
        function _fxReady() { return STATE.fx.rates && Object.keys(STATE.fx.rates).length > 1; }
        function _fxFresh() { return STATE.fx.ts && (Date.now() - STATE.fx.ts) < FX_TTL_MS; }

        function _currencyTokenRe() {
            return _PARSER.currencyTokenRe(_currencyTokenMap());
        }
        function _inputHasCurrency(raw) {
            return _PARSER.hasCurrencyInInput(raw, { fxRates: (STATE.fx && STATE.fx.rates) || {} });
        }

        function resolveCalcCurrency(raw) {
            return _PARSER.resolveCurrencyExpression(raw, {
                fxRates: (STATE.fx && STATE.fx.rates) || {},
                fxReady: _fxReady(),
                defaultCurrency: (STATE.settings && STATE.settings.defaultCurrency) || 'PLN',
                currencyCompactSymbols: !(STATE.settings && STATE.settings.currencyCompactSymbols === false),
            });
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
            STATE.fx.lastTry = Date.now(); // [EN] Throttle anchor — ensureFxRates skips retry right after failure
            var mode = (STATE.settings && STATE.settings.fxEngine) || 'auto';

            function done() {
                STATE.fx.loading = false;
                // [EN] Defer liveEval — sync chain loadFx→done→liveEval→loadFx zatyka wątek (np. 50eur bez cache).
                try { document.dispatchEvent(new CustomEvent('matm0-fx-updated')); } catch (e) {}
                requestAnimationFrame(function() {
                    if (typeof liveEval === 'function') liveEval();
                });
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
        function _formatFxDatePl(iso) { // [EN] NBP/Frankfurter ISO → DD.MM.YYYY for PL UI
            if (!iso) return '';
            var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
            return m ? (m[3] + '.' + m[2] + '.' + m[1]) : String(iso);
        }
        function formatFxMeta() { // [EN] FX source + date for ≈ hint (cursor-hint)
            if (!_fxReady()) return '';
            var src = fxSourceLabel(STATE.fx.source);
            var date = _formatFxDatePl(STATE.fx.date);
            return src + (date ? ' · ' + date : '');
        }
        function _fxMetaForResult(res, rawExpr) {
            if (!res || res.pendingFx) return '';
            if (res.value === null && res.text == null) return '';
            if (res.kind !== 'money' && !_inputHasCurrency(rawExpr)) return '';
            return formatFxMeta();
        }
        // Pobierz gdy trzeba: brak kursów lub przeterminowane (i nie trwa już pobieranie).
        var FX_RETRY_MS = 10 * 1000; // [EN] Po nieudanym fetchu nie ponawiaj częściej niż co 10 s (anty-pętla przy offline/CSP)
        function ensureFxRates() {
            if (STATE.fx.loading) return;
            if (_fxReady() && _fxFresh()) return;
            if (STATE.fx.error && STATE.fx.lastTry && (Date.now() - STATE.fx.lastTry) < FX_RETRY_MS) return;
            loadFxRates();
        }

        // ── Limity wpisywania (jak zaawansowane kalkulatory: Samsung ~15, tu więcej dzięki BigInt) ──
        var CALC_MAX_DIGITS_BIGINT = 30; // [EN] +, −, ×, () — dokładna ścieżka BigInt
        var CALC_MAX_DIGITS_FLOAT = 15;  // [EN] float / jednostki — sensowna precyzja JS
        var CALC_MAX_EXPR_CHARS = 240;   // [EN] całe wyrażenie (wklejka, historia)
        function _calcExprBigEligible(val) {
            return /^[\s0-9+\-*()×−]+$/.test(val) && /\d/.test(val);
        }
        function _calcMaxDigitsPerRun(val) {
            return _calcExprBigEligible(val) ? CALC_MAX_DIGITS_BIGINT : CALC_MAX_DIGITS_FLOAT;
        }
        function _calcDigitRunBounds(val, idx) {
            var start = Math.max(0, Math.min(idx, val.length - 1));
            if (!val.length || !/\d/.test(val.charAt(start))) {
                start = Math.min(idx, val.length);
                var end0 = start;
                while (start > 0 && /\d/.test(val.charAt(start - 1))) start--;
                while (end0 < val.length && /\d/.test(val.charAt(end0))) end0++;
                return { start: start, end: end0, len: end0 - start };
            }
            var end = start + 1;
            while (start > 0 && /\d/.test(val.charAt(start - 1))) start--;
            while (end < val.length && /\d/.test(val.charAt(end))) end++;
            return { start: start, end: end, len: end - start };
        }
        function clampCalcExprInput(val) {
            if (!val) return val;
            var maxD = _calcMaxDigitsPerRun(val);
            var re = new RegExp('\\d{' + (maxD + 1) + ',}', 'g');
            var out = val.replace(re, function(run) { return run.slice(0, maxD); });
            if (out.length > CALC_MAX_EXPR_CHARS) out = out.slice(0, CALC_MAX_EXPR_CHARS);
            return out;
        }
        function _calcWouldExceedDigitLimit(val, start, end, ch) {
            if (!/^\d$/.test(ch)) return false;
            var next = val.slice(0, start) + ch + val.slice(end);
            if (next.length > CALC_MAX_EXPR_CHARS) return true;
            var run = _calcDigitRunBounds(next, start + ch.length - 1);
            return run.len > _calcMaxDigitsPerRun(next);
        }

        // ── Kanoniczny WYNIK silnika (pkt 1: spójność modelu wartości) ──
        // JEDEN kształt produkowany przez wszystkie ścieżki evalCalcExpression. Nadzbiór dawnych
        // kluczy (value/unit/text/error + przelotki pendingFx/big/bigStr), żeby NIC u callerów nie
        // pękło. Dokłada:
        //   • kind  — typ wartości: number | duration | clock | date | money | physical | null
        //   • exact — czy wyświetlana forma jest DOKŁADNA (false = stratne zaokrąglenie; baza pod
        //             sygnał „≈", [[A2]]). UWAGA: czyszczenie szumu float (toPrecision) zostaje exact.
        // Docelowo to zalążek „typowanej wielkości" — patrz project_kalkulator_unified_engine_direction.
        function makeVal(o) {
            o = o || {};
            return {
                value: o.value == null ? null : o.value,
                unit: o.unit == null ? null : o.unit,
                text: o.text == null ? null : o.text,
                error: o.error == null ? null : o.error,
                kind: o.kind || null,
                exact: o.exact !== false,
                exactText: o.exactText != null ? o.exactText : null,  // dokładna wartość „z czego" zaokrąglono (≈)
                preciseValue: o.preciseValue != null ? o.preciseValue : null, // [EN] przed zaokr. waluty do groszy — hint ≈
                pendingFx: !!o.pendingFx,
                big: !!o.big,
                bigStr: o.bigStr != null ? o.bigStr : null
            };
        }
        function evalCalcExpression(raw, opts) {
            opts = opts || {};
            var firstUnitWins = !!opts.firstUnitWins;
            var original = String(raw || '').trim();
            if (!original) return makeVal({});
            // Najpierw czas zegarowy („17:00 + 3h", „od 9:30 do 17:15") — krócej niż daty, ma własne tokeny.
            var clockRes = evalClockExpression(original);
            if (clockRes) {
                STATE.calc.lastResult = clockRes.value;
                STATE.calc.lastUnit = null;
                return makeVal({ value: clockRes.value, text: clockRes.text, kind: clockRes.kind || 'clock', exact: clockRes.exact, exactText: clockRes.exactText });
            }
            // Strefy czasowe („17:00 w Londynie na Tokio", „która godzina w Tokio") — po zegarze.
            var tzRes = evalTimezoneExpression(original);
            if (tzRes) {
                STATE.calc.lastResult = null; STATE.calc.lastUnit = null;
                return makeVal({ value: tzRes.value, text: tzRes.text, kind: tzRes.kind || 'clock', exact: tzRes.exact !== false });
            }
            // Najpierw daty/czas — zanim „dni"/„za" trafią do matematyki/jednostek.
            var dateRes = evalDateExpression(original);
            if (dateRes) {
                STATE.calc.lastResult = dateRes.value;
                STATE.calc.lastUnit = null;
                return makeVal({ value: dateRes.value, text: dateRes.text, kind: 'date' });
            }
            // „ile % stanowi A z B" / „A z B to ile %" — kierunek ODWROTNY do „X% z Y" (wynik = procent).
            var pctBaseQ = _applyParserCalcResult(evalPercentBaseQuery(original));
            if (pctBaseQ) return pctBaseQ;
            var pctOfPct = _applyParserCalcResult(evalPercentOfPercent(original));
            if (pctOfPct) return pctOfPct;
            var pctQ = _applyParserCalcResult(evalPercentQuery(original));
            if (pctQ) return pctQ;
            var pctDiffQ = _applyParserCalcResult(evalPercentDifference(original));
            if (pctDiffQ) return pctDiffQ;
            var periodPctQ = _applyParserCalcResult(evalPeriodPercentage(original));
            if (periodPctQ) return periodPctQ;
            // Koszt trasy / paliwa: dystans + spalanie l/100km + cena zł/l → koszt (+ litry w dymku).
            var routeQ = evalRouteCost(original);
            if (routeQ) return routeQ;
            try {
                var expr = original;
                // Stałe NAJPIERW — ich wartości mogą zawierać „%", „vat", frazy naturalne, które
                // dopiero kolejne etapy (parseNaturalShortcuts) zamienią na właściwą matematykę.
                expr = resolveCalcConstants(expr, STATE.constants);
                expr = expandNumericShorthands(expr); // [EN] k/tys przed tokenami walut („2,5k zł")
                expr = expandCurrencyShorthands(expr); // [EN] „usd 1k" przed resolveCalcCurrency
                var unitMix = firstUnitWins ? _PARSER.analyzeUnitMix(expr, {
                    fxRates: (STATE.fx && STATE.fx.rates) || {},
                    unitDefs: CALC_UNITS,
                    unitNamesRe: _UNIT_NAMES_RE,
                }) : null;
                var unitHits = (unitMix && unitMix.hits) || [];
                var useFirstWins = !!(firstUnitWins && unitMix && unitMix.needsFirstWins);
                var firstHit = useFirstWins && unitHits.length ? unitHits[0] : null;
                if (useFirstWins && firstHit && firstHit.kind === 'physical' && !firstHit.dimensionless) {
                    expr = _stripCurrencyAmounts(expr); // [EN] physical first — currency tokens become bare numbers
                }
                // Waluty NAJPIERW (zaraz po stałych, PRZED parserem naturalnym): zamieniamy kwoty
                // walutowe na liczby (wartość w PLN / konwersja „na X") i zapamiętujemy docelową
                // jednostkę. Dzięki temu finanse/procenty/matematyka komponują się z walutą — token
                // waluty już nie blokuje reguł typu „brutto 12 zł", „12 pln - vat", „20% z 100 zł".
                var curRes = resolveCalcCurrency(expr);
                if (curRes.pending) return makeVal({ pendingFx: true });
                expr = curRes.expr;
                if (useFirstWins && firstHit && firstHit.kind === 'currency') {
                    expr = _stripPhysicalUnits(expr); // [EN] currency first — physical tokens become bare numbers
                }
                expr = parseNaturalShortcuts(expr);
                expr = resolveCalcAnswer(expr);
                expr = resolveTrigDegrees(expr); // [EN] sin(30 deg) → radiany, zanim jednostki zdejmą „deg"
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
                        return makeVal({ big: true, bigStr: bigStr, text: groupBigIntStr(bigStr), kind: 'number' });
                    }
                }
                var unitResult = resolveCalcUnits(expr, useFirstWins ? { firstUnitWins: true } : null);
                expr = unitResult.expr;
                // Własna jednostka (np. „os.") jest BEZWYMIAROWA — to licznik, nie wymiar fizyczny.
                // Nie kłóci się więc z walutą: „3 os. * 180 zł" = 540 zł (wygrywa ostatnia realna
                // jednostka — tu waluta). Blokujemy tylko miks WALUTY z FIZYCZNĄ jednostką
                // („12 gb − 12 zł"), który nie ma sensu. [[project_kalkulator_notepad_planning]]
                var unitIsCustom = unitResult.cat && String(unitResult.cat).indexOf('custom:') === 0;
                var customKey = unitIsCustom ? String(unitResult.cat).slice('custom:'.length) : null;
                var unitIsDimensionless = customKey && CALC_UNITS[customKey] && CALC_UNITS[customKey].dimensionless;
                if (curRes.hasCurrency && unitResult.unit !== null && !unitIsDimensionless && !useFirstWins) {
                    return makeVal({});
                }
                var unit = curRes.hasCurrency ? curRes.unit : unitResult.unit;
                if (opts.keepWorkCurrency && curRes.hasCurrency && curRes.workCode) unit = _currencyDisplay(curRes.workCode);
                expr = expr.replace(/,(?=\d)/g, '.');
                expr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
                expr = expr.replace(/\s+/g, '');
                if (!expr) return makeVal({});
                var fn = compileGraphExpression(expr);
                var value = fn(0);
                // resolveCalcUnits liczy w JEDNOSTCE ROBOCZEJ (etykieta jedzie z wynikiem) →
                // mnożymy z powrotem na bazę. Dla + − / pojedynczej jednostki = bez zmian; dla
                // × ÷ naprawia wymiar wg modelu „jednostka jako etykieta" (10 km/2 km = 5 km).
                if (!curRes.hasCurrency && unitResult.workFactor) value = value * unitResult.workFactor;
                // Waluty: wynik policzony w walucie roboczej → skala do domyślnej (po vat/%).
                if (curRes.hasCurrency && curRes.curMul && isFinite(value) && !opts.keepWorkCurrency) value = value * curRes.curMul;
                // Waluty: zaokrąglij do 2 miejsc (grosze); preciseValue = przed zaokr. — hint ≈ pokazuje kurs.
                var preciseValue = null;
                if (curRes.hasCurrency && isFinite(value)) {
                    preciseValue = value;
                    value = _roundMoney(value);
                }
                var valueBase = value; // [EN] Wartość w jednostce bazowej kategorii — dla __auto__ (przed displayFactor).
                // Wartość jest teraz BAZOWA. Jeśli resolveCalcUnits wskazał preferowaną jednostkę
                // wyświetlania (ustawienia), przelicz wartość.
                if (!curRes.hasCurrency && unitResult.displayFactor) value = value / unitResult.displayFactor;
                // Autodobór czytelnej jednostki — ustawienie „Czytelnie (auto)" per kategoria
                // ('__auto__'). Domyślnie kategorie = '' (baza), więc to nie rusza baseline.
                // Wybór jednostki liczymy z wartości BAZOWEJ (MATM0_QTY.chooseUnit), nie roboczej.
                var _QTY = (typeof window !== 'undefined' && window.MATM0_QTY) || null;
                // Autodobór liczbowy (chooseUnit) — poza czasem; czas __auto__ = format czytelny h/min/dni.
                var _autoMode = (STATE.settings.defaultUnits || {})[unitResult.cat] === '__auto__';
                if (!curRes.hasCurrency && unitResult.cat && isFinite(valueBase) && _QTY &&
                    _autoMode && unitResult.cat !== 'time' && !unitResult.explicitConvert &&
                    Math.abs(valueBase) > 0) { // [EN] 0 zostaje w jednostce roboczej (np. 12 km − 12 km → 0 km)
                    var _autoU = _QTY.chooseUnit(unitResult.cat, valueBase);
                    var _autoInfo = _autoU && _QTY.unitInfo(_autoU);
                    if (_autoInfo) { value = valueBase / _autoInfo.factor; unit = CALC_UNIT_DISPLAY[_autoU] || _autoU; }
                }
                if (!isFinite(value)) return makeVal({ value: Infinity, unit: unit, error: '∞', kind: 'number' });
                // Dokładne liczby całkowite do MAX_SAFE_INTEGER (16 cyfr) zostaw bez
                // zaokrąglania; tylko ułamki/duże floaty tnij do 15 cyfr znaczących,
                // by ukryć szum zmiennoprzecinkowy (np. 0,1+0,2).
                if (Math.abs(value) < 1e308 && value !== 0 &&
                    !(Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER)) {
                    value = parseFloat(value.toPrecision(15));
                }
                if (unit) unit = inflectDisplayUnit(value, unit);
                STATE.calc.lastResult = value;
                STATE.calc.lastUnit = unit;
                // kind: waluta→money, fizyczna jednostka→physical, inaczej czysta liczba.
                var valKind = curRes.hasCurrency ? 'money' : (unitResult.cat ? (unitResult.cat === 'time' ? 'duration' : 'physical') : 'number');
                // Czytelny czas: tryb '' lub __auto__ (nie jawna konwersja „na X", nie sztywna jednostka z ⚙️).
                var _timeDu = (STATE.settings.defaultUnits || {}).time;
                var readableTime = null;
                if (!curRes.hasCurrency && unitResult.cat === 'time' && !unitResult.explicitConvert &&
                    (_timeDu === '' || _timeDu === '__auto__') && !_preferredDisplayUnit('time') &&
                    isFinite(unitResult.valueInBase) && typeof formatDurationSeconds === 'function') {
                    readableTime = formatDurationSeconds(unitResult.valueInBase);
                }
                // OGÓLNY sygnał ≈: gdy wyświetlenie (6 miejsc po przecinku, jak formatCalcResult)
                // gubi realne cyfry → wynik PRZYBLIŻONY (np. 1/3, √2, waluta z wieloma groszami).
                // NIE dotyczy czyszczenia szumu float — to już wyczyszczone wyżej (round-trip = dokładny).
                var approxNum = false, exactNumText = null;
                if (isFinite(value) && !Number.isInteger(value)) {
                    var disp6 = Number(value.toFixed(6));
                    if (Math.abs(value - disp6) > Math.abs(value) * 1e-12) {
                        approxNum = true;
                        exactNumText = formatLocaleNumber(value, 15) + (unit ? ' ' + unit : '');
                    }
                }
                return makeVal({ value: value, unit: unit, text: readableTime, kind: valKind, exact: !approxNum, exactText: exactNumText, preciseValue: preciseValue });
            } catch (err) {
                return makeVal({});
            }
        }

        function formatCalcResult(res) {
            if (!res) return '';
            if (res.text != null) return res.text; // wynik daty/czasu
            if (res.value === null) return '';
            if (res.error === '∞') return '∞';
            var str = formatLocaleNumber(res.value, 6);
            if (res.unit) str += ' ' + inflectDisplayUnit(res.value, res.unit);
            return str;
        }
        function _calcEqualsExprText(res) { // [EN] pole po = — sama liczba (+ j.m.), nie 100%= ani daty tekstowe z display
            if (!res || res.pendingFx) return null;
            if (res.big) return res.text || res.bigStr || null;
            if (res.value === null || res.error === '∞') {
                if (res.text == null) return null;
                return String(res.text).replace(/\n/g, ' ').trim();
            }
            var str = formatLocaleNumber(res.value, 6);
            if (res.unit) str += '\u202f' + inflectDisplayUnit(res.value, res.unit);
            return str.replace(/\n/g, ' ').trim();
        }
        function _formatFxHintValue(v, unit) { // [EN] 6 miejsc — precyzja kursu, bez szumu float i bez groszy z ekranu
            if (!isFinite(v)) return null;
            var cleaned = parseFloat(Number(v).toPrecision(12));
            var str = formatLocaleNumber(cleaned, 6);
            str = str.replace(/(\,\d*?)0+$/, '$1').replace(/\,$/, ''); // obetnij końcowe zera po przecinku
            if (unit) str += '\u202f' + inflectDisplayUnit(cleaned, unit);
            return str;
        }
        function _hintResultText(res) { // [EN] Dolna linia dymka ≈ — kurs dokładny, nie zaokr. do 2 miejsc
            if (!res) return null;
            if (res.text != null) return res.text;
            if (res.preciseValue != null && isFinite(res.preciseValue)) {
                return _formatFxHintValue(res.preciseValue, res.unit);
            }
            if (res.exactText) return res.exactText;
            if (res.value === null || !isFinite(res.value)) return null;
            if (res.kind === 'money') return _formatFxHintValue(res.value, res.unit);
            var str = formatLocaleNumber(res.value, 10);
            if (res.unit) str += '\u202f' + inflectDisplayUnit(res.value, res.unit);
            return str;
        }
        function buildCopyFormats(res, expr) { // [EN] long-press copy on result row
            if (!res || res.pendingFx) return null;
            if (res.text != null) {
                var ex0 = String(expr || '').trim();
                return { withUnit: res.text, expression: ex0 ? (ex0 + ' = ' + res.text) : res.text };
            }
            if (res.value === null || res.error === '∞') return null;
            var display = formatCalcResult(res);
            var ex = String(expr || '').trim();
            return { withUnit: display, expression: ex ? (ex + ' = ' + display) : ('= ' + display) };
        }
        var _lastCopyFormats = null;
        var _emptySuggestTimer = null;
        var _liveHintBubbleTimer = null;
        var _calcAssistBubbleKind = null; // [EN] 'live' | 'fuzzy' — mobile cursor-hint assist
        var _assistLayoutRaf = 0;

        function _calcAssistWide() { // [EN] desktop assist UI (chips + AC dropdown) ≥600px
            var vv = window.visualViewport;
            return vv ? vv.width >= 600 : window.innerWidth >= 600;
        }

        function _calcAssistAnchor() {
            return calcExpr ? calcExpr.closest('.calc-expr-wrap') : null;
        }

        function _hideCalcAssistBubble() {
            if (typeof _npHintCtl !== 'undefined' && _npHintCtl && _npHintCtl.hideHint) _npHintCtl.hideHint();
            _calcAssistBubbleKind = null;
        }

        function _cancelLiveHintBubble() {
            clearTimeout(_liveHintBubbleTimer);
            _liveHintBubbleTimer = null;
        }

        function _calcAssistExtraPx() { // T4-17/19 — dodatkowa wysokość display przy hint/suggest (tylko desktop)
            if (!_calcAssistWide()) return 0;
            var px = 0;
            if (calcLiveHint && !calcLiveHint.hidden) px += Math.max(28, calcLiveHint.offsetHeight || 0);
            if (calcEmptySuggest && !calcEmptySuggest.hidden) px += Math.max(20, calcEmptySuggest.offsetHeight || 0);
            return px;
        }

        function _scheduleAssistLayout() { // [EN] reflow display budget after assist rows show/hide
            if (!_calcAssistWide()) return;
            if (!(STATE.settings && (STATE.settings.standardLiveHint || STATE.settings.suggestOnEmpty))) return;
            if (!_usesCalcFlexSplit()) return;
            if (_assistLayoutRaf) cancelAnimationFrame(_assistLayoutRaf);
            _assistLayoutRaf = requestAnimationFrame(function () {
                _assistLayoutRaf = 0;
                fitCalcLayout();
            });
        }

        function updateCalcLiveHint() {
            _cancelLiveHintBubble();
            if (!calcLiveHint) return;
            if (!(STATE.settings && STATE.settings.standardLiveHint)) {
                calcLiveHint.hidden = true;
                if (_calcAssistBubbleKind === 'live') _hideCalcAssistBubble();
                _scheduleAssistLayout();
                return;
            }
            var HINT = window.MATM0_HINT;
            if (!HINT || typeof HINT.getLiveHints !== 'function') {
                calcLiveHint.hidden = true;
                if (_calcAssistBubbleKind === 'live') _hideCalcAssistBubble();
                _scheduleAssistLayout();
                return;
            }
            var chips = HINT.getLiveHints(calcExpr ? calcExpr.value : '');

            if (!_calcAssistWide()) { // T4-17 mobile — dymek cursor-hint zamiast chipów w gridzie
                calcLiveHint.hidden = true;
                calcLiveHint.replaceChildren();
                _scheduleAssistLayout();
                if (!chips.length || _calcAssistBubbleKind === 'fuzzy') {
                    if (_calcAssistBubbleKind === 'live') _hideCalcAssistBubble();
                    return;
                }
                var anchor = _calcAssistAnchor();
                var exprSnap = calcExpr ? calcExpr.value : '';
                _liveHintBubbleTimer = setTimeout(function () {
                    _liveHintBubbleTimer = null;
                    if (_calcAssistWide()) return;
                    if (!(STATE.settings && STATE.settings.standardLiveHint)) return;
                    if (!calcExpr || calcExpr.value !== exprSnap) return;
                    if (_calcAssistBubbleKind === 'fuzzy') return;
                    var chipsNow = HINT.getLiveHints(calcExpr.value);
                    if (!chipsNow.length) return;
                    if (typeof _npHintCtl === 'undefined' || !_npHintCtl || !_npHintCtl.showProgrammatic || !anchor) return;
                    var txt = chipsNow.map(function (c) { return c.label || c; }).join(' · ');
                    _calcAssistBubbleKind = 'live';
                    _npHintCtl.showProgrammatic({
                        anchorEl: anchor,
                        text: txt,
                        hintClass: 'calc-assist-hint',
                        durationMs: 5000,
                        autoHide: true,
                        fade: true
                    });
                }, 400);
                return;
            }

            if (_calcAssistBubbleKind) _hideCalcAssistBubble();
            if (!chips.length) { calcLiveHint.hidden = true; calcLiveHint.replaceChildren(); _scheduleAssistLayout(); return; }
            calcLiveHint.replaceChildren();
            chips.forEach(function (c) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'calc-hint-chip';
                btn.textContent = c.label || c;
                btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
                btn.addEventListener('click', function () {
                    if (!calcExpr) return;
                    insertAtCursor(calcExpr, c.insert != null ? c.insert : (' ' + c));
                    liveEval();
                });
                calcLiveHint.appendChild(btn);
            });
            calcLiveHint.hidden = false;
            _scheduleAssistLayout();
        }

        function updateCalcEmptySuggest(res) {
            if (!calcEmptySuggest) return;
            clearTimeout(_emptySuggestTimer);
            if (!(STATE.settings && STATE.settings.suggestOnEmpty) || !calcExpr || !calcExpr.value.trim()) {
                calcEmptySuggest.hidden = true;
                if (_calcAssistBubbleKind === 'fuzzy') _hideCalcAssistBubble();
                _scheduleAssistLayout();
                return;
            }
            if (!res || res.value !== null || res.text != null || res.pendingFx) {
                calcEmptySuggest.hidden = true;
                if (_calcAssistBubbleKind === 'fuzzy') _hideCalcAssistBubble();
                _scheduleAssistLayout();
                return;
            }
            var exprSnap = calcExpr.value;
            _emptySuggestTimer = setTimeout(function () {
                if (!calcExpr || calcExpr.value !== exprSnap) return;
                var HINT = window.MATM0_HINT;
                var sug = HINT && typeof HINT.fuzzySuggest === 'function' ? HINT.fuzzySuggest(exprSnap) : null;

                if (!_calcAssistWide()) { // T4-19 mobile — kotwiczony dymek zamiast wiersza w gridzie
                    calcEmptySuggest.hidden = true;
                    _scheduleAssistLayout();
                    if (!sug) {
                        if (_calcAssistBubbleKind === 'fuzzy') _hideCalcAssistBubble();
                        return;
                    }
                    _cancelLiveHintBubble(); // [EN] fuzzy wins — cancel pending live-hint debounce
                    var anchor = _calcAssistAnchor();
                    if (typeof _npHintCtl === 'undefined' || !_npHintCtl || !_npHintCtl.showProgrammatic || !anchor) return;
                    if (_calcAssistBubbleKind === 'live') _hideCalcAssistBubble();
                    _calcAssistBubbleKind = 'fuzzy';
                    _npHintCtl.showProgrammatic({
                        anchorEl: anchor,
                        text: 'Czy chodziło o: ' + sug + '?',
                        hintClass: 'calc-assist-hint is-fuzzy',
                        durationMs: 6000,
                        autoHide: true,
                        fade: true,
                        onTap: function () {
                            calcExpr.value = sug;
                            _calcAssistBubbleKind = null;
                            liveEval();
                        }
                    });
                    return;
                }

                if (!sug) { calcEmptySuggest.hidden = true; _scheduleAssistLayout(); return; }
                _cancelLiveHintBubble(); // [EN] fuzzy wins on desktop too
                if (_calcAssistBubbleKind === 'live') _hideCalcAssistBubble();
                calcEmptySuggest.replaceChildren();
                var txt = document.createTextNode('Czy chodziło o: ');
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'calc-suggest-btn';
                var code = document.createElement('code');
                code.textContent = sug;
                btn.appendChild(code);
                btn.addEventListener('click', function () {
                    calcExpr.value = sug;
                    liveEval();
                });
                calcEmptySuggest.appendChild(txt);
                calcEmptySuggest.appendChild(btn);
                calcEmptySuggest.appendChild(document.createTextNode('?'));
                calcEmptySuggest.hidden = false;
                _scheduleAssistLayout();
            }, 300);
        }

        function insertAtCursor(input, text) {
            var focused = document.activeElement === input;
            var start = focused && input.selectionStart != null ? input.selectionStart : input.value.length;
            var end   = focused && input.selectionEnd   != null ? input.selectionEnd   : input.value.length;
            input.value = input.value.slice(0, start) + text + input.value.slice(end);
            try { input.setSelectionRange(start + text.length, start + text.length); } catch(e) {}
        }
        function _insertCalcExprText(text) {
            var wasFocused = document.activeElement === calcExpr; // [EN] pad nie focusuje — inaczej mobile otwiera klawiaturę co tap
            insertAtCursor(calcExpr, text);
            if (!wasFocused && calcExpr && document.activeElement === calcExpr) calcExpr.blur(); // [EN] fallback gdy platforma sama da focus
            liveEval();
        }

        // Placeholder: na wąsko — marquee; gdy jest miejsce w pionie — zawijanie (2 linie, wyrównane do prawej).
        var _calcPh = null, _calcPhInner = null, _calcPhWrapProbe = null;
        function updatePlaceholderMarquee() {
            if (!_calcPh || !_calcPhInner) return;
            var wrap = calcExpr && calcExpr.parentElement;
            var empty = !calcExpr.value;
            _calcPh.classList.toggle('is-visible', empty);
            _calcPh.classList.remove('is-scrolling', 'is-wrapped');
            _calcPh.style.removeProperty('--ph-shift');
            if (!empty) {
                if (wrap) wrap.style.minHeight = '';
                return;
            }
            var phWidth = _calcPh.clientWidth;
            if (phWidth <= 0) return;
            if (!_calcPhWrapProbe) {
                _calcPhWrapProbe = document.createElement('span');
                _calcPhWrapProbe.setAttribute('aria-hidden', 'true');
                _calcPhWrapProbe.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:normal;text-align:right;';
                _calcPh.appendChild(_calcPhWrapProbe);
            }
            _calcPhWrapProbe.style.width = phWidth + 'px';
            _calcPhWrapProbe.style.font = getComputedStyle(_calcPh).font;
            _calcPhWrapProbe.style.lineHeight = getComputedStyle(_calcPh).lineHeight;
            _calcPhWrapProbe.textContent = _calcPhInner.textContent;
            var wrappedH = _calcPhWrapProbe.offsetHeight;
            var lineH = _calcPhInner.offsetHeight || wrappedH;
            var needH = Math.max(lineH, wrappedH);
            if (wrap) wrap.style.minHeight = needH + 'px';
            var over = _calcPhInner.offsetWidth - phWidth;
            if (over > 2 && wrappedH <= needH + 1) {
                _calcPh.classList.add('is-wrapped');
                return;
            }
            if (over > 2) {
                _calcPh.style.setProperty('--ph-shift', over + 'px');
                _calcPh.classList.add('is-scrolling');
            }
        }
        function setupPlaceholderMarquee() {
            _calcPh = document.getElementById('calcPh');
            if (!_calcPh || !calcExpr) return;
            _calcPhInner = _calcPh.firstElementChild;
            if (calcExpr.parentElement) calcExpr.parentElement.classList.add('has-ph');
            // Zmiana szerokości zmienia zawijanie → przelicz też auto-wysokość pola.
            var _calcResizeRaf = 0;
            var onResize = function() {
                if (_calcResizeRaf) return; // [EN] Coalesce RO + resize — jeden fitCalcLayout na klatkę
                _calcResizeRaf = requestAnimationFrame(function() {
                    _calcResizeRaf = 0;
                    _calcBtnScale = 1;
                    updatePlaceholderMarquee();
                    fitCalcLayout();
                });
            };
            var onExprFocusChange = function() {
                fitCalcDisplay();
            };
            window.addEventListener('resize', onResize);
            window.addEventListener('orientationchange', onResize);
            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', onResize);
            }
            calcExpr.addEventListener('focus', onExprFocusChange);
            calcExpr.addEventListener('blur', function() {
                setTimeout(onExprFocusChange, 120);
            });
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize).catch(function(){});
            var calcDisplay = calcExpr.closest('.calc-display');
            var calcPanel = document.getElementById('panel-calculator');
            if (calcDisplay && typeof ResizeObserver !== 'undefined') {
                var ro = new ResizeObserver(function() { onResize(); });
                ro.observe(calcDisplay);
                if (calcGrid) ro.observe(calcGrid);
                if (calcPanel) ro.observe(calcPanel); // zwinięcie belki zmienia wysokość panelu
            }
            updatePlaceholderMarquee();
            autoGrowExpr();
            setTimeout(onResize, 300); // po ustaleniu layoutu/fontów
        }

        function autoGrowExpr() { fitCalcDisplay(); } // alias — starsze wywołania

        function _calcDisplayPad(display) {
            if (!display) return 0;
            var cs = getComputedStyle(display);
            return (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
        }
        function _calcIsEmpty() {
            return !calcExpr || !calcExpr.value;
        }
        function _calcDisplayInnerH(display) {
            if (!display) return 0;
            return Math.max(0, display.clientHeight - _calcDisplayPad(display));
        }
        function _calcResultReserve(display, resultRow) {
            var t = getCalcLayoutTune();
            var gap = t.exprResultGap != null ? t.exprResultGap : 6;
            var rh = _calcResultStableRowPx(); // [EN] bazowy font × linie — bez yo-yo przy shrink / separatorze
            if (_calcIsEmpty()) {
                if (t.resultReserveEmpty != null) return t.resultReserveEmpty;
                var slackE = t.resultAnimSlackEmpty != null ? t.resultAnimSlackEmpty : 0;
                return rh + gap + slackE;
            }
            if (t.resultReserveActive != null) return t.resultReserveActive;
            var slack = t.resultAnimSlack != null ? t.resultAnimSlack : 4;
            var minR = t.resultReserveMin != null ? t.resultReserveMin : 36;
            return Math.max(minR, rh) + gap + slack;
        }
        // [EN] Wysokość wiersza — malowana w DOM (inline shrink), nie sztywno 2× base font
        function _calcResultStableRowPx() {
            if (calcResult) {
                var painted = _calcResultPaintedHeight();
                if (painted > 0) return painted;
            }
            var fs = _calcResultBaseFontPx();
            if (calcResult) {
                var inlineFs = parseFloat(calcResult.style.fontSize);
                if (isFinite(inlineFs) && inlineFs > 0) fs = inlineFs;
            }
            return _calcResultStableLinePx(fs) * (_calcResultWrapLines || 1);
        }
        function _syncResultRowStable(display) {
            if (!display) return;
            display.style.setProperty('--calc-result-row-min', _calcResultStableRowPx() + 'px');
        }
        // [EN] Stable row height when JS fitted inline font — avoids reserve yo-yo during CSS transition
        function _calcResultStableLinePx(fsPx) {
            if (calcResult && (_calcResultWrapLines || 1) > 1) {
                var lh = parseFloat(getComputedStyle(calcResult).lineHeight);
                if (isFinite(lh) && lh > 2) return Math.ceil(lh);
            }
            var fs = fsPx;
            if (!isFinite(fs) || fs <= 0) {
                if (!calcResult) return 44;
                fs = parseFloat(getComputedStyle(calcResult).fontSize) || 40;
            }
            var mul = (calcResult && (_calcResultWrapLines || 1) > 1) ? _wrapResultLineMul() : 1.1;
            return Math.ceil(fs * mul);
        }
        function _calcResultRowHeight() {
            if (!calcResult) return 0;
            var inlineFs = parseFloat(calcResult.style.fontSize);
            if (isFinite(inlineFs) && inlineFs > 0) {
                return _calcResultStableLinePx(inlineFs) * (_calcResultWrapLines || 1);
            }
            var row = calcResult.closest('.calc-result-row');
            return Math.max(calcResult.offsetHeight || 0, row ? row.offsetHeight : 0);
        }
        function _calcResultPaintedHeight() {
            if (!calcResult) return 0;
            var inlineFs = parseFloat(calcResult.style.fontSize);
            if (isFinite(inlineFs) && inlineFs > 0) {
                return _calcResultStableLinePx(inlineFs) * (_calcResultWrapLines || 1);
            }
            return Math.ceil(calcResult.getBoundingClientRect().height || calcResult.offsetHeight || 0);
        }
        function _applyResultFontPx(px) {
            if (!calcResult || !isFinite(px)) return;
            calcResult.style.fontSize = px + 'px';
            calcResult.style.removeProperty('min-height');
            if (calcApprox && !calcApprox.hidden) { // [EN] scale ≈ with result — keeps vertical center on all viewports
                calcApprox.style.fontSize = Math.max(13, Math.round(px * 0.58)) + 'px';
            }
        }
        function _syncResultReserve(display, resultRow) {
            if (!display || !calcResult) return;
            _syncResultRowStable(display);
            var rh = _calcResultStableRowPx();
            display.style.setProperty('--calc-result-reserve', rh > 0 ? (rh + 'px') : 'auto');
        }
        // [EN] 2-line result: bez powiększania ekranika — expr 1–2 linie @ mniejszym fontcie
        function _syncResultWrapLayout(display) {
            if (!display) return;
            var t = getCalcLayoutTune();
            var df = _displayFontTune();
            var lines = _calcResultWrapLines || 1;
            var card = display.closest('.card');
            display.classList.toggle('calc-result-wrap', lines > 1);
            if (card) card.classList.toggle('calc-result-wrap', lines > 1);
            if (lines > 1 && calcResult) {
                var padBottom = t.resultWrapPadBottom != null ? t.resultWrapPadBottom : 6;
                var wrapExprRem = df.resultWrapExprRem != null ? df.resultWrapExprRem : 1.05;
                var wrapExprMinRem = df.resultWrapExprMinRem != null ? df.resultWrapExprMinRem : 0.82;
                var exprMaxLines = df.resultWrapExprMaxLines != null ? df.resultWrapExprMaxLines : 2;
                var rootFs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
                var linePx = Math.ceil(wrapExprRem * rootFs * 1.3);
                display.style.paddingBottom = padBottom + 'px';
                display.style.setProperty('--calc-expr-font', wrapExprRem + 'rem');
                display.style.setProperty('--calc-expr-min-rem', wrapExprMinRem + 'rem');
                display.style.setProperty('--calc-expr-wrap-lines', String(exprMaxLines));
                display.style.setProperty('--calc-expr-max-h', (linePx * exprMaxLines) + 'px');
                display.style.setProperty('--calc-expr-min', Math.min(t.exprMinHeight != null ? t.exprMinHeight : 44, linePx) + 'px');
                _syncResultRowStable(display);
            } else {
                display.style.removeProperty('padding-bottom');
                display.style.removeProperty('--calc-expr-font');
                display.style.removeProperty('--calc-expr-min-rem');
                display.style.removeProperty('--calc-expr-wrap-lines');
                display.style.removeProperty('--calc-expr-max-h');
                display.style.removeProperty('--calc-expr-min');
            }
            _syncResultReserve(display, null);
        }
        function _calcResultWrapLinePx() {
            if (!calcResult) return _calcResultLineHeightPx();
            var lines = _calcResultWrapLines || 1;
            if (lines > 1 && calcResult.offsetHeight > 0) return Math.ceil(calcResult.offsetHeight / lines);
            return _calcResultLineHeightPx();
        }
        function _calcWrappedDisplayMinH(display) {
            if (!display || !calcResult || (_calcResultWrapLines || 1) <= 1) return 0;
            var wrap = calcExpr && calcExpr.parentElement;
            if (!wrap) return 0;
            var t = getCalcLayoutTune();
            var gap = t.exprResultGap != null ? t.exprResultGap : 6;
            var padTop = t.displayPadY != null ? t.displayPadY : 12;
            var padBottom = t.resultWrapPadBottom != null ? t.resultWrapPadBottom : 6;
            var exprMin = t.resultWrapExprMinPx != null ? t.resultWrapExprMinPx : 28;
            var resultH = _calcResultPaintedHeight();
            if (resultH < 8) resultH = _calcResultWrapLinePx() * (_calcResultWrapLines || 2);
            return padTop + padBottom + Math.max(wrap.offsetHeight || 0, exprMin) + gap + resultH;
        }
        function _setCalcPanelScroll(on) {
            document.body.classList.toggle('calc-panel-scroll', !!on);
        }
        function _calcPanelScrollNeeded(t, availDetail, budget, wrapMin) {
            if (!_isCalcMobileLayout()) return false;
            var c = (t.displayCurve || {}).scrollOverflow || {};
            if (c.enabled) return true;
            var visible = availDetail && availDetail.visibleH > 0 ? availDetail.visibleH : 0;
            var compact = c.compactViewportPx != null ? c.compactViewportPx : 500;
            if (visible > 0 && visible < compact) return true;
            if (wrapMin > 0 && budget) {
                var df = t.displayFont || {};
                var internalWrap = df.resultWrapMaxExtraLines === 0; // [EN] wrap w budżecie — bez scrolla całego panelu
                if (!internalWrap) {
                    var cap = (budget.maxPx || 160) + (budget.wrapExtraPx || 0);
                    if (wrapMin > cap + 4) return true;
                }
            }
            return false;
        }
        function _syncExprFieldToWrap(wrap) {
            if (!calcExpr || !wrap) return 0;
            calcExpr.style.width = '100%';
            if (!_usesCalcFlexSplit()) {
                calcExpr.style.height = '';
                calcExpr.style.maxHeight = '';
                return Math.max(wrap.clientHeight, wrap.scrollHeight, 28);
            }
            calcExpr.style.height = '100%';
            calcExpr.style.maxHeight = '100%';
            return wrap.clientHeight || 0;
        }
        // [EN] Pusty ekran: budżet placeholdera. Aktywny: grid przydziela wiersz — bez sztucznego max.
        function _syncExprWrapBounds(display, resultRow) {
            var wrap = calcExpr && calcExpr.parentElement;
            if (!display || !wrap) return 0;
            if (!_usesCalcFlexSplit()) {
                wrap.style.minHeight = '';
                wrap.style.maxHeight = '';
                return _calcExprMaxH(display, resultRow, wrap);
            }
            var t = getCalcLayoutTune();
            if (!_calcIsEmpty()) {
                wrap.style.minHeight = '';
                wrap.style.maxHeight = '';
                return _calcExprMaxH(display, resultRow, wrap);
            }
            var innerH = _calcDisplayInnerH(display);
            var reserve = _calcResultReserve(display, resultRow);
            var boost = t.exprBudgetBoost != null ? t.exprBudgetBoost : 0;
            var exprMin = t.exprMinHeight != null ? t.exprMinHeight : 28;
            var maxH = Math.max(exprMin, innerH - reserve + boost);
            if (_isCalcMobileLayout() && wrap.clientHeight >= exprMin) maxH = Math.max(maxH, wrap.clientHeight);
            wrap.style.maxHeight = maxH + 'px';
            wrap.style.minHeight = '';
            if (t.debug) {
                console.log('[calc-expr-bounds]', { innerH: innerH, reserve: reserve, maxH: maxH, empty: true });
            }
            return maxH;
        }
        // [EN] Active: mobile grid row height; desktop uses display budget (not current wrap — avoids ~28px trap).
        function _calcExprMaxH(display, resultRow, wrap) {
            var t = getCalcLayoutTune();
            var boost = t.exprBudgetBoost != null ? t.exprBudgetBoost : 0;
            var exprMin = t.exprMinHeight != null ? t.exprMinHeight : 28;
            var innerH = _calcDisplayInnerH(display);
            var reserve = _calcResultReserve(display, resultRow);
            var budget = Math.max(exprMin, innerH - reserve + boost);
            if (_usesCalcFlexSplit() && wrap && wrap.clientHeight >= exprMin) return Math.max(budget, wrap.clientHeight);
            return budget;
        }
        // [EN] Last resort: wynik wyszedł poza .calc-display — zmniejsz textarea.
        function _clampResultInDisplay() {
            if (!calcExpr || !calcResult) return false;
            var display = calcExpr.closest('.calc-display');
            var resultRow = display && display.querySelector('.calc-result-row');
            if (!display || !resultRow) return false;
            var dr = display.getBoundingClientRect();
            var rr = resultRow.getBoundingClientRect();
            if (rr.bottom <= dr.bottom + 1) return false;
            var over = Math.ceil(rr.bottom - dr.bottom) + 2;
            var wrap = calcExpr.parentElement;
            if (wrap && wrap.clientHeight > 22) {
                wrap.style.maxHeight = Math.max(22, wrap.clientHeight - over) + 'px';
            }
            var maxH = _syncExprFieldToWrap(wrap);
            if (!maxH) return false;
            var h = maxH;
            calcExpr.classList.toggle('is-clipped', calcExpr.scrollHeight > h + 1);
            calcExpr.scrollTop = calcExpr.scrollHeight - h;
            return true;
        }
        // [EN] Expr height: mieści się w wyświetlaczu; nadmiar ucinany od góry, wynik zawsze w boxie.
        function fitCalcExpr() {
            if (!calcExpr) return;
            var display = calcExpr.closest('.calc-display');
            var resultRow = display && display.querySelector('.calc-result-row');
            var wrap = calcExpr.parentElement;
            var wrapMode = (_calcResultWrapLines || 1) > 1;
            if (!wrapMode) {
                calcExpr.style.fontSize = '';
                calcExpr.style.maxHeight = '';
                if (_calcPh) _calcPh.style.fontSize = '';
            }
            calcExpr.classList.remove('is-clipped');
            if (display && resultRow) {
                _syncResultReserve(display, resultRow);
                _syncExprWrapBounds(display, resultRow);
            }
            var maxExprH = _syncExprFieldToWrap(wrap);
            var df = _displayFontTune();
            var wrapMaxH = wrapMode ? parseFloat(getComputedStyle(display || calcExpr).getPropertyValue('--calc-expr-max-h')) : 0;
            if (wrapMode && isFinite(wrapMaxH) && wrapMaxH > 0) maxExprH = Math.min(maxExprH || wrapMaxH, wrapMaxH);
            if (!maxExprH) {
                calcExpr.style.height = '';
                calcExpr.style.maxHeight = '';
                calcExpr.style.width = '';
                return;
            }
            if (!calcExpr.value) return;
            var fs = df.exprRem != null ? df.exprRem : 1.25;
            if (wrapMode && df.resultWrapExprRem != null) fs = df.resultWrapExprRem;
            var minFs = wrapMode
                ? (df.resultWrapExprMinRem != null ? df.resultWrapExprMinRem : 0.82)
                : (df.exprMinRem != null ? df.exprMinRem : (_isCalcMobileLayout() ? 1 : 0.9));
            var minPx = df.exprMinPx != null ? df.exprMinPx : 16;
            calcExpr.style.maxHeight = maxExprH + 'px';
            var sh = calcExpr.scrollHeight;
            while (sh > maxExprH + 1 && fs > minFs) {
                fs = Math.round((fs - 0.04) * 100) / 100;
                calcExpr.style.fontSize = fs + 'rem';
                if (_calcPh) _calcPh.style.fontSize = fs + 'rem';
                sh = calcExpr.scrollHeight;
            }
            if (parseFloat(calcExpr.style.fontSize) * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) < minPx) {
                calcExpr.style.fontSize = minPx + 'px'; // [EN] iOS — bez zoomu przy focus
                if (_calcPh) _calcPh.style.fontSize = minPx + 'px';
            }
            var clipped = calcExpr.scrollHeight > maxExprH + 1;
            calcExpr.classList.toggle('is-clipped', clipped);
            var atEnd = document.activeElement === calcExpr
                && calcExpr.selectionStart != null
                && calcExpr.selectionStart >= calcExpr.value.length;
            calcExpr.scrollTop = (clipped || atEnd) ? calcExpr.scrollHeight - maxExprH : 0;
        }
        var _calcFitProbe = null;
        var _calcFitProbeWrap = null; // [EN] probe w .calc-result-wrap — inline sep ma inną szerokość niż inline-block
        var _calcResultWrapLines = 1;
        var _calcWrapStableFontPx = 0; // [EN] cache — stabilny font w trybie 2 linii (bez tańca)
        var _calcWrapBudgetKey = '';
        var _calcResultFitPending = 0; // [EN] Bounded rAF retries when result row width not ready yet
        var _calcResultTargetDisplay = ''; // [EN] latest formatted result — fit renders markup from this
        var _calcFitTargetKey = ''; // [EN] ten sam target w trakcie anim — pomiń drugi fit z fitCalcLayout
        var _resultAnimUntil = 0; // [EN] calcCharIn ~200ms — finalize nie może skasować .calc-result-new wcześniej
        var _resultFitFinalizeTimer = null;
        var _RESULT_FIT_SLACK = 4; // [EN] safety px — probe/tight-seps underestimate vs live DOM clip
        var _RESULT_PROBE_FUDGE = 3; // [EN] tight-sep spans są szersze w DOM niż w probe — wcześniejszy shrink/wrap
        function _markResultAnim() { _resultAnimUntil = Date.now() + 240; } // [EN] margines ponad anim 200ms w CSS
        function _resultAnimActive() { return Date.now() < _resultAnimUntil; }
        function _scheduleResultFinalize(row, flat, floorPx, basePx) {
            clearTimeout(_resultFitFinalizeTimer);
            _resultFitFinalizeTimer = setTimeout(function() {
                _resultFitFinalizeTimer = null;
                _finalizeResultFit(row, flat, floorPx, basePx, _calcResultFullText());
            }, 240);
        }
        function _resultCoreLen(flat) { // [EN] cyfry/znaki bez separatorów — decyzja wrap vs 1 linia
            return String(flat || '').replace(/[\s\u00a0\u202f\n]/g, '').length;
        }
        function _calcResultFullText() {
            return calcResult ? (calcResult.textContent || '') : '';
        }
        function _calcResultMaxWidth(row) {
            if (!row) return 0;
            var maxW = row.clientWidth;
            var gap = 6;
            if (calcApprox && !calcApprox.hidden) maxW -= calcApprox.offsetWidth + gap;
            if (calcResult && calcResult.clientWidth > 0) maxW = Math.min(maxW, calcResult.clientWidth);
            return Math.max(0, maxW - _RESULT_FIT_SLACK);
        }
        // [EN] Measure one result line width (probe — bez skracania fontu).
        function _useWrapResultProbe(text, wrapProbe) {
            if (wrapProbe === true) return true;
            if (wrapProbe === false) return false;
            if ((_calcResultWrapLines || 1) > 1) return true;
            if (String(text || '').indexOf('\n') >= 0) return true;
            var disp = calcResult && calcResult.closest('.calc-display');
            return !!(disp && disp.classList.contains('calc-result-wrap'));
        }
        function _measureCalcResultWidth(text, fontSizePx, row, wrapProbe) {
            if (!calcResult || !row) return 0;
            var cs = getComputedStyle(calcResult);
            var inWrap = _useWrapResultProbe(text, wrapProbe);
            var probeEl;
            if (inWrap) {
                if (!_calcFitProbeWrap || !_calcFitProbeWrap.isConnected) {
                    _calcFitProbeWrap = document.createElement('div');
                    _calcFitProbeWrap.className = 'calc-display calc-result-wrap';
                    _calcFitProbeWrap.setAttribute('aria-hidden', 'true');
                    _calcFitProbeWrap.style.cssText = 'position:absolute;left:-9999px;top:0;opacity:0;pointer-events:none;';
                    var inner = document.createElement('span');
                    inner.className = 'calc-result-probe';
                    inner.style.whiteSpace = 'nowrap';
                    _calcFitProbeWrap.appendChild(inner);
                    document.body.appendChild(_calcFitProbeWrap);
                }
                probeEl = _calcFitProbeWrap.querySelector('.calc-result-probe');
            } else {
                if (!_calcFitProbe || !_calcFitProbe.isConnected) { // [EN] renderCalcResult textContent='' orphanuje probe → w=0, brak wrap
                    _calcFitProbe = document.createElement('span');
                    _calcFitProbe.setAttribute('aria-hidden', 'true');
                    _calcFitProbe.style.cssText = 'position:absolute;left:-9999px;top:0;opacity:0;white-space:nowrap;pointer-events:none;';
                    document.body.appendChild(_calcFitProbe); // [EN] poza .calc-result — probe nie psuje textContent
                }
                probeEl = _calcFitProbe;
            }
            probeEl.style.font = cs.font;
            probeEl.style.fontSize = fontSizePx != null ? (fontSizePx + 'px') : cs.fontSize;
            probeEl.style.letterSpacing = cs.letterSpacing;
            if (_needsTightMarkup(text)) probeEl.innerHTML = _htmlTightResult(text);
            else probeEl.textContent = text;
            return probeEl.offsetWidth;
        }
        function _calcResultLineHeightPx() {
            if (!calcResult) return 44;
            var cs = getComputedStyle(calcResult);
            var fs = parseFloat(cs.fontSize) || 40;
            var lh = parseFloat(cs.lineHeight);
            if (!isFinite(lh) || lh < 2) lh = fs * 1.1;
            return Math.ceil(lh);
        }
        function _displayFontTune() {
            var t = getCalcLayoutTune();
            return t.displayFont || {};
        }
        function _wrapResultLineMul() { // [EN] leading 2 linii wyniku — tune resultWrapLineHeight
            var df = _displayFontTune();
            return df.resultWrapLineHeight != null ? df.resultWrapLineHeight : 1;
        }
        function _wrapExprBudgetPx(t) { // [EN] min. wys. paska wpisywania gdy wynik ma 2 linie
            t = t || getCalcLayoutTune();
            var df = _displayFontTune();
            var min = t.exprMinHeight != null ? t.exprMinHeight : 28;
            if (t.resultWrapExprMinPx != null) min = Math.max(min, t.resultWrapExprMinPx);
            var rootFs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
            var wrapMinRem = df.resultWrapExprMinRem != null ? df.resultWrapExprMinRem : 0.82;
            min = Math.max(min, Math.ceil(wrapMinRem * rootFs * 1.2));
            return min;
        }
        function _assistRowsPx(display) { // [EN] chipy/suggest w desktop grid (wiersze 2 i 4)
            if (!_calcAssistWide()) return 0;
            var gap = getCalcLayoutTune().exprResultGap != null ? getCalcLayoutTune().exprResultGap : 6;
            var px = 0;
            if (calcLiveHint && !calcLiveHint.hidden) px += Math.max(28, calcLiveHint.offsetHeight || 0) + gap;
            if (calcEmptySuggest && !calcEmptySuggest.hidden) px += Math.max(20, calcEmptySuggest.offsetHeight || 0);
            return px;
        }
        function _displayRowGapsPx() { // [EN] CSS grid gap między wierszami ekranika (hidden też liczą szczelinę)
            var gap = getCalcLayoutTune().exprResultGap != null ? getCalcLayoutTune().exprResultGap : 6;
            if (_isCalcMobileLayout()) return gap; // mobile: 2 wiersze → 1 szczelina
            return gap * 3; // desktop/tablet: 4 wiersze → 3 szczeliny
        }
        function _wrapBudgetKey(display) { // [EN] klucz budżetu — recompute stable font tylko gdy się zmieni
            if (!display) return '';
            return [
                Math.round(_calcDisplayInnerH(display)),
                _wrapExprBudgetPx(),
                _displayRowGapsPx(),
                _assistRowsPx(display),
                window.innerWidth | 0,
            ].join(':');
        }
        function _wrapMaxResultPx(display) {
            var innerH = _calcDisplayInnerH(display);
            return Math.max(28, innerH - _wrapExprBudgetPx() - _displayRowGapsPx() - _assistRowsPx(display));
        }
        function _clearWrapStableFont() {
            _calcWrapStableFontPx = 0;
            _calcWrapBudgetKey = '';
        }
        function _computeWrapStableFontPx(display, maxResultH, floorPx, basePx) {
            var df = _displayFontTune();
            var rootFs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
            var prefPx = df.resultWrapFontRem != null ? df.resultWrapFontRem * rootFs : 0;
            var hi = prefPx > 0 ? Math.min(basePx, prefPx) : basePx;
            var lo = floorPx;
            var lines = _calcResultWrapLines || 2;
            var mul = _wrapResultLineMul();
            var best = lo;
            while (hi - lo > 0.35) {
                var mid = (lo + hi) / 2;
                if (Math.ceil(mid * mul) * lines <= maxResultH + 0.5) { best = mid; lo = mid; }
                else hi = mid;
            }
            return Math.round(best * 100) / 100;
        }
        function _getWrapStableFontPx(display) {
            var key = _wrapBudgetKey(display);
            if (_calcWrapBudgetKey === key && _calcWrapStableFontPx > 0) return _calcWrapStableFontPx;
            var maxResultH = _wrapMaxResultPx(display);
            _calcWrapStableFontPx = _computeWrapStableFontPx(display, maxResultH, _calcResultFloorPx(), _calcResultBaseFontPx());
            _calcWrapBudgetKey = key;
            return _calcWrapStableFontPx;
        }
        function _applyWrapStableFont(display) { // [EN] jeden stabilny rozmiar w wrap — bez skoków co cyfrę
            if (!display || !calcResult || (_calcResultWrapLines || 1) <= 1) return 0;
            var stablePx = _getWrapStableFontPx(display);
            var curFs = parseFloat(calcResult.style.fontSize);
            if (!isFinite(curFs) || curFs <= 0) curFs = _calcResultBaseFontPx();
            if (Math.abs(curFs - stablePx) > 0.4) _applyResultFontPx(stablePx);
            else if (Math.abs(stablePx - _calcResultBaseFontPx()) < 0.5) calcResult.style.removeProperty('font-size');
            _syncResultRowStable(display);
            return stablePx;
        }
        function _applyResultFontFromLayout(layout, basePx) { // [EN] wrap → stable cap; 1 linia → layout.fontPx
            if (!calcResult || !layout) return;
            var wrapLines = layout.wrapLines != null ? layout.wrapLines : (_calcResultWrapLines || 1);
            if (wrapLines > 1) {
                var disp = calcResult.closest('.calc-display');
                if (disp) _applyWrapStableFont(disp);
                return;
            }
            if (layout.fontPx >= basePx - 0.5) calcResult.style.removeProperty('font-size');
            else _applyResultFontPx(layout.fontPx);
        }
        // [EN] Niski ekranik + wrap 2 linii — stabilny font wyniku, expr zachowuje minimum
        function _rebalanceWrapDisplayBudget(display) {
            if (!display || !calcResult || !calcExpr || (_calcResultWrapLines || 1) <= 1) {
                _clearWrapStableFont();
                return;
            }
            _applyWrapStableFont(display);
        }
        // [EN] Max 2 lines at thousand groups; never a 3rd row — shrink font only if both rows overflow.
        function _resultMaxLines() {
            var df = _displayFontTune();
            return df.resultWrapMaxLines != null ? df.resultWrapMaxLines : 2;
        }
        // [EN] Prefer semantic split at '=' — label (100%=) on top, value below (Samsung-style).
        function _trySplitResultAtEquals(text, maxW, row, fontSizePx) {
            var s = String(text || '');
            var eq = s.indexOf('=');
            if (eq < 0) return null;
            var l1 = s.slice(0, eq + 1).replace(/[\s\u00a0\u202f]+$/g, '');
            var l2 = s.slice(eq + 1).replace(/^[\s\u00a0\u202f]+/g, '');
            if (!l1 || !l2) return null;
            if (!_calcResultOverflows(maxW, row, l1, fontSizePx, true, true)
                && !_calcResultOverflows(maxW, row, l2, fontSizePx, true, true)) return [l1, l2];
            return null;
        }
        function _resultHorizOverflows(row) {
            if (!calcResult) return false;
            row = row || calcResult.closest('.calc-result-row');
            var maxW = _calcResultMaxWidth(row);
            if (maxW <= 0) return calcResult.scrollWidth > calcResult.clientWidth + 1;
            var fs = parseFloat(calcResult.style.fontSize);
            if (!isFinite(fs) || fs <= 0) fs = _calcResultBaseFontPx();
            var wrapLines = _calcResultWrapLines || 1;
            var text = _calcResultFullText();
            if (wrapLines > 1) { // [EN] pre-line — scrollWidth kłamie; każda linia osobno
                var lines = text.split('\n');
                for (var i = 0; i < lines.length; i++) {
                    var ln = lines[i].replace(/[\s\u00a0\u202f]+$/g, '').replace(/^[\s\u00a0\u202f]+/g, '');
                    if (ln && _measureCalcResultWidth(ln, fs, row, true) + _RESULT_PROBE_FUDGE > maxW) return true;
                }
                return false;
            }
            if (calcResult.scrollWidth > calcResult.clientWidth + 1) return true;
            var line = text.replace(/\n/g, ' ').trim();
            if (line && _measureCalcResultWidth(line, fs, row) + _RESULT_PROBE_FUDGE > maxW) return true;
            return false;
        }
        function _splitChunkTwoLines(text, maxW, row, fontSizePx) { // [EN] wrap w jednym tokenie — gdy brak separatorów tysięcy
            var s = String(text || '').trim();
            if (!s) return [''];
            if (!_calcResultOverflows(maxW, row, s, fontSizePx, true)) return [s];
            var cuts = [];
            for (var c = 1; c < s.length; c++) {
                if (/\s/.test(s.charAt(c - 1)) || /\s/.test(s.charAt(c))) cuts.push(c);
            }
            if (!cuts.length) for (var d = 1; d < s.length; d++) cuts.push(d);
            var best = null, bestW1 = 0;
            for (var ci = 0; ci < cuts.length; ci++) {
                var cut = cuts[ci];
                var l1 = s.slice(0, cut).replace(/[\s\u00a0\u202f]+$/g, '');
                var l2 = s.slice(cut).replace(/^[\s\u00a0\u202f]+/g, '');
                if (!l1 || !l2) continue;
                if (_calcResultOverflows(maxW, row, l1, fontSizePx, true, true)) break;
                if (_calcResultOverflows(maxW, row, l2, fontSizePx, true, true)) continue;
                var w1 = _measureCalcResultWidth(l1, fontSizePx, row, true);
                if (w1 >= bestW1) { bestW1 = w1; best = [l1, l2]; }
            }
            if (best) return best;
            var splitAt = 1;
            for (var j = 1; j < s.length; j++) {
                var head = s.slice(0, j).replace(/[\s\u00a0\u202f]+$/g, '');
                if (head && !_calcResultOverflows(maxW, row, head, fontSizePx, true, true)) splitAt = j;
                else break;
            }
            splitAt = Math.min(Math.max(1, splitAt), s.length - 1);
            return [s.slice(0, splitAt).replace(/[\s\u00a0\u202f]+$/g, ''), s.slice(splitAt).replace(/^[\s\u00a0\u202f]+/g, '')];
        }
        function _wrapCalcResultLines(text, maxW, row, maxLines, fontSizePx) {
            maxLines = maxLines != null ? maxLines : _resultMaxLines();
            if (!text || maxW <= 0) return [''];
            if (maxLines > 1) {
                var eqSplit = _trySplitResultAtEquals(text, maxW, row, fontSizePx);
                if (eqSplit) return eqSplit;
            }
            // [EN] Split at thousand-group boundaries (space or NBSP between groups).
            var tokens = String(text).trim().split(/[ \t\r\n\u00a0\u202f]+/).filter(Boolean);
            if (!tokens.length) return [''];
            var full = tokens.join('\u00a0');
            if (!_calcResultOverflows(maxW, row, full, fontSizePx, true)) return [full]; // [EN] conservative — spójne z _resolveResultLayout (wrap dopiero gdy nie mieści się @ base)
            if (maxLines <= 1) return [full];
            if (tokens.length === 1) return _splitChunkTwoLines(full, maxW, row, fontSizePx); // [EN] brak grup — split w tokenie, nie shrink 1 linii
            var best = null, bestW1 = 0; // [EN] maks. cyfr w linii 1 zanim wrap — wynik do prawej krawędzi
            for (var i = 1; i < tokens.length; i++) {
                var l1 = tokens.slice(0, i).join('\u00a0');
                var l2 = tokens.slice(i).join('\u00a0');
                if (_calcResultOverflows(maxW, row, l1, fontSizePx, true, true)) break; // [EN] wrap probe — inline sep w live DOM
                if (_calcResultOverflows(maxW, row, l2, fontSizePx, true, true)) continue;
                var w1 = _measureCalcResultWidth(l1, fontSizePx, row, true);
                if (w1 >= bestW1) { bestW1 = w1; best = [l1, l2]; }
            }
            if (best) return best;
            var splitAt = 1;
            for (var j = 1; j < tokens.length; j++) {
                var head = tokens.slice(0, j).join('\u00a0');
                if (!_calcResultOverflows(maxW, row, head, fontSizePx, true, true)) splitAt = j;
                else break;
            }
            if (splitAt >= tokens.length) splitAt = tokens.length - 1;
            return [tokens.slice(0, splitAt).join('\u00a0'), tokens.slice(splitAt).join('\u00a0')];
        }
        function _calcResultFloorPx() {
            var df = _displayFontTune();
            var rootFs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
            var minRem = df.resultShrinkMinRem != null ? df.resultShrinkMinRem : 1.2;
            return Math.max(12, rootFs * minRem); // [EN] jeden próg — bez drugiego „hard min"
        }
        function _calcResultBaseFontPx() {
            var rootFs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
            var df = _displayFontTune();
            var rem = df.resultRem != null ? df.resultRem : (_isCalcMobileLayout() ? 2.5 : 3);
            var card = calcResult && calcResult.closest('.card');
            if (card) {
                var cssRem = parseFloat(getComputedStyle(card).getPropertyValue('--calc-result-font'));
                if (isFinite(cssRem) && cssRem > 0) rem = cssRem;
            }
            return rem * rootFs;
        }
        function _isDefaultResultFlat(flat) {
            var core = String(flat || '').replace(/[\s\u00a0\u202f]/g, '');
            return !core || core === '0';
        }
        function _resetCalcResultFont() {
            _clearWrapStableFont();
            if (!calcResult) return;
            calcResult.style.removeProperty('font-size');
            calcResult.style.removeProperty('min-height');
            calcResult.style.removeProperty('white-space');
            if (calcApprox) calcApprox.style.removeProperty('font-size');
            var disp = calcResult.closest('.calc-display');
            if (disp) _syncResultRowStable(disp);
        }
        function _syncResultWhiteSpace() {
            if (!calcResult) return;
            // [EN] pre — tylko jawne \n (2 linie); pre-line owija spacje → mignięcie 3. linii przed shrink
            calcResult.style.whiteSpace = (_calcResultWrapLines || 1) > 1 ? 'pre' : 'nowrap';
        }
        function _normalizeResultFlat(flat) { // [EN] fit mierzy jak DOM — surowe cyfry bez spacji zaniżają probe vs groupBigIntStr
            var s = String(flat || '').replace(/\n/g, ' ').trim();
            if (!s || /[ \t\u00a0\u202f]/.test(s)) return s;
            if (/[,.]\d/.test(s)) return s; // [EN] ułamek dziesiętny — nie zdejmuj przecinka (0,0486 ≠ 00486)
            var core = s.replace(/[^\d-]/g, '');
            if (/^-?\d+$/.test(core) && core.replace('-', '').length >= 4) return groupBigIntStr(core);
            return s;
        }
        function _joinCalcResultFlat(flat) {
            var tokens = String(flat || '').trim().split(/[ \t\r\n\u00a0\u202f]+/).filter(Boolean);
            return tokens.length ? tokens.join('\u00a0') : String(flat || '');
        }
        function _calcResultOverflows(maxW, row, text, fontSizePx, conservative, wrapProbe) {
            if (!text || maxW <= 0) return false;
            var w = _measureCalcResultWidth(text, fontSizePx, row, wrapProbe);
            return conservative ? w + _RESULT_PROBE_FUDGE > maxW : w > maxW;
        }
        function _linesOverflow(maxW, row, lines, fontSizePx) {
            for (var i = 0; i < lines.length; i++) {
                if (_calcResultOverflows(maxW, row, lines[i], fontSizePx, true, true)) return true;
            }
            return false;
        }
        // [EN] Largest font in [floor, base] — probe (scrollWidth lies when overflow:hidden).
        function _largestResultFontForLine(maxW, floorPx, basePx, line, row) {
            if (!_calcResultOverflows(maxW, row, line, basePx)) {
                calcResult.style.removeProperty('font-size');
                calcResult.style.removeProperty('min-height');
                return basePx;
            }
            var lo = floorPx, hi = basePx, best = floorPx;
            while (hi - lo > 0.35) {
                var mid = (lo + hi) / 2;
                if (_calcResultOverflows(maxW, row, line, mid)) hi = mid;
                else { best = mid; lo = mid; }
            }
            _applyResultFontPx(best);
            return best;
        }
        function _largestResultFontForLines(maxW, floorPx, basePx, lines, row) {
            if (!_linesOverflow(maxW, row, lines, basePx)) {
                calcResult.style.removeProperty('font-size');
                calcResult.style.removeProperty('min-height');
                return basePx;
            }
            var lo = floorPx, hi = basePx, best = floorPx;
            while (hi - lo > 0.35) {
                var mid = (lo + hi) / 2;
                if (_linesOverflow(maxW, row, lines, mid)) hi = mid;
                else { best = mid; lo = mid; }
            }
            _applyResultFontPx(best);
            return best;
        }
        // [EN] Po renderze 2 linii — shrink dopóki któraś linia overflow (tight probe); stabilizuje odstęp 15+ cyfr
        function _shrinkWrapUntilLinesFit(row, floorPx, basePx, markupText) {
            if ((_calcResultWrapLines || 1) <= 1 || !calcResult || !row) return basePx;
            var maxW = _calcResultMaxWidth(row);
            if (maxW <= 0) return basePx;
            var src = markupText != null ? String(markupText) : _calcResultFullText();
            var parts = src.split('\n');
            if (parts.length < 2) return basePx;
            var disp = calcResult.closest('.calc-display');
            var stablePx = disp ? _getWrapStableFontPx(disp) : basePx;
            var fs = parseFloat(calcResult.style.fontSize);
            if (!isFinite(fs) || fs <= 0) fs = stablePx;
            if (fs > stablePx + 0.35) { fs = stablePx; _applyResultFontPx(fs); }
            while (fs > floorPx + 0.35) {
                var ok = true;
                for (var i = 0; i < parts.length; i++) {
                    var ln = parts[i].replace(/[\s\u00a0\u202f]+$/g, '').replace(/^[\s\u00a0\u202f]+/g, '');
                    if (ln && _calcResultOverflows(maxW, row, ln, fs, true, true)) { ok = false; break; }
                }
                if (ok) break;
                fs = Math.round((fs - 0.5) * 100) / 100;
                _applyResultFontPx(fs);
            }
            if (fs >= stablePx - 0.5) _applyResultFontPx(stablePx);
            if (disp) _syncResultRowStable(disp);
            return fs;
        }
        function _resolveResultLayout(flat, maxW, row, floorPx, basePx) {
            // [EN] 1) base font + 1 linia jeśli się mieści; 2) base + wrap 2 linie; 3) shrink dopiero gdy 2 linie @ base overflow (3. rząd)
            var line = _joinCalcResultFlat(flat);
            var maxLines = _resultMaxLines();
            var liveWrap = (_calcResultWrapLines || 1) > 1;
            calcResult.style.removeProperty('font-size');
            if (!liveWrap && !_resultAnimActive()) { // [EN] nowrap reset w trakcie wrap anim psuje calcCharInWrap
                _calcResultWrapLines = 1;
                _syncResultWhiteSpace();
            }
            if (!_calcResultOverflows(maxW, row, line, basePx, true)) { // [EN] conservative — jak tight-sep szersze w DOM, idziemy w wrap zamiast shrink 1 linii
                return { targetMarkup: line, wrapLines: 1, fontPx: basePx };
            }
            if (maxLines <= 1) {
                var fsOnly = _largestResultFontForLine(maxW, floorPx, basePx, line, row);
                return { targetMarkup: line, wrapLines: 1, fontPx: fsOnly };
            }
            var eqSplit = _trySplitResultAtEquals(flat, maxW, row, basePx);
            var wrapped = eqSplit || _wrapCalcResultLines(flat, maxW, row, maxLines, basePx);
            if (wrapped.length <= 1) wrapped = _splitChunkTwoLines(line, maxW, row, basePx); // [EN] ostatnia szansa na 2 linie @ base
            if (wrapped.length <= 1) {
                var fsFallback = _largestResultFontForLine(maxW, floorPx, basePx, line, row);
                return { targetMarkup: line, wrapLines: 1, fontPx: fsFallback };
            }
            if (!_linesOverflow(maxW, row, wrapped, basePx)) {
                return { targetMarkup: wrapped.join('\n'), wrapLines: wrapped.length, fontPx: basePx };
            }
            calcResult.style.removeProperty('font-size');
            var fsMulti = _largestResultFontForLines(maxW, floorPx, basePx, wrapped, row); // [EN] 2 linie @ base overflow → shrink (nigdy 3. linia)
            return { targetMarkup: wrapped.join('\n'), wrapLines: wrapped.length, fontPx: fsMulti };
        }
        function _clearResultAnimClasses() {
            if (!calcResult) return;
            calcResult.querySelectorAll('.calc-result-new').forEach(function(el) { el.classList.remove('calc-result-new'); });
        }
        function _syncResultFontToBox(row, floorPx, basePx) {
            if (!calcResult) return;
            row = row || calcResult.closest('.calc-result-row');
            if ((_calcResultWrapLines || 1) <= 1 && _resultMaxLines() > 1) { // [EN] najpierw wrap @ base — sync nie shrinkuje 1 linii
                var dispSkip = calcResult.closest('.calc-display');
                if (dispSkip) _syncResultRowStable(dispSkip);
                return;
            }
            var disp = calcResult.closest('.calc-display');
            var capPx = basePx;
            if ((_calcResultWrapLines || 1) > 1 && disp) capPx = _getWrapStableFontPx(disp);
            var fs = parseFloat(calcResult.style.fontSize);
            if (!isFinite(fs) || fs <= 0) fs = capPx;
            var guard = 0;
            while (guard++ < 80 && fs > floorPx && _resultHorizOverflows(row)) { // [EN] getBoundingClientRect — overflow:hidden kłamie scrollWidth
                fs -= 0.45;
                calcResult.style.fontSize = fs + 'px';
            }
            guard = 0;
            while (guard++ < 80 && fs < capPx - 0.35 && !_resultHorizOverflows(row)) { // [EN] wrap — nie odtwarzaj base, tylko stable cap
                var tryFs = Math.min(capPx, Math.round((fs + 0.5) * 100) / 100);
                calcResult.style.fontSize = tryFs + 'px';
                if (_resultHorizOverflows(row)) { calcResult.style.fontSize = fs + 'px'; break; }
                fs = tryFs;
            }
            if ((_calcResultWrapLines || 1) <= 1 && fs >= basePx - 0.5) calcResult.style.removeProperty('font-size');
            else if ((_calcResultWrapLines || 1) > 1 && fs >= capPx - 0.5) _applyResultFontPx(capPx);
            if (disp) _syncResultRowStable(disp);
        }
        function _finalizeResultFit(row, flat, floorPx, basePx, prevRendered) {
            if (!calcResult || !row) return;
            if (_resultAnimActive()) { // [EN] nie przerywaj calcCharIn — font sync + shrink wrap na gotowym DOM
                if ((_calcResultWrapLines || 1) > 1) {
                    _syncResultFontToBox(row, floorPx, basePx);
                    _shrinkWrapUntilLinesFit(row, floorPx, basePx);
                }
                return;
            }
            if (_calcResultWrapLines === 1 && _resultMaxLines() > 1) { // [EN] wrap @ base zanim sync zmniejszy 1 linię
                calcResult.style.removeProperty('font-size');
                if (_resultHorizOverflows(row)) {
                    var maxWPre = _calcResultMaxWidth(row);
                    var layoutPre = _resolveResultLayout(flat, maxWPre, row, floorPx, basePx);
                    if (layoutPre.wrapLines > 1) {
                        _calcResultWrapLines = layoutPre.wrapLines;
                        _syncResultWhiteSpace();
                        _applyResultFontFromLayout(layoutPre, basePx);
                        _applyResultMarkupFromFit(_calcResultFullText(), layoutPre.targetMarkup);
                        _syncResultWhiteSpace();
                        var dispPre = calcResult.closest('.calc-display');
                        if (dispPre) _syncResultWrapLayout(dispPre);
                    }
                }
            }
            _syncResultFontToBox(row, floorPx, basePx);
            if ((_calcResultWrapLines || 1) > 1) _shrinkWrapUntilLinesFit(row, floorPx, basePx);
            if (!_resultHorizOverflows(row)) return;
            if (_calcResultWrapLines === 1 && _resultMaxLines() > 1) { // [EN] sync zmniejszył 1 linię — najpierw wrap @ base, nie dalszy shrink
                var maxW2 = _calcResultMaxWidth(row);
                var layout2 = _resolveResultLayout(flat, maxW2, row, floorPx, basePx);
                if (layout2.wrapLines > 1) {
                    _calcResultWrapLines = layout2.wrapLines;
                    _syncResultWhiteSpace();
                    _applyResultFontFromLayout(layout2, basePx);
                    _applyResultMarkupFromFit(_calcResultFullText(), layout2.targetMarkup);
                    _syncResultWhiteSpace();
                    var disp2 = calcResult.closest('.calc-display');
                    if (disp2) _syncResultWrapLayout(disp2);
                    _syncResultFontToBox(row, floorPx, basePx);
                    if (!_resultHorizOverflows(row)) return;
                }
            }
            _forceResultToFit(row, flat, _calcResultMaxWidth(row), floorPx, basePx, prevRendered || _calcResultFullText());
            _syncResultFontToBox(row, floorPx, basePx);
            _clearResultAnimClasses(); // [EN] po fit — animacja już minęła; kolejny klawisz znów diff
        }
        function _forceResultToFit(row, flat, maxW, floorPx, basePx, prevRendered) {
            if (!calcResult || !row || calcResult.querySelector('.calc-result-new')) return;
            if (!_resultHorizOverflows(row)) return;
            var layout = _resolveResultLayout(flat, maxW, row, floorPx, basePx);
            _calcResultWrapLines = layout.wrapLines;
            _syncResultWhiteSpace();
            _applyResultFontFromLayout(layout, basePx);
            if (layout.targetMarkup.replace(/\n/g, ' ') !== _joinCalcResultFlat(flat) || layout.wrapLines > 1) {
                _applyResultMarkupFromFit(_calcResultFullText(), layout.targetMarkup);
                _syncResultWhiteSpace();
            }
            var disp = calcResult.closest('.calc-display');
            if (disp) {
                if (layout.wrapLines > 1) _syncResultWrapLayout(disp);
                else _syncResultRowStable(disp);
            }
        }
        function fitCalcResultSize() {
            if (!calcResult) return;
            calcResult.classList.remove('small', 'xsmall', 'xxsmall');
            var row = calcResult.closest('.calc-result-row');
            if (!row) return;
            var flatSrcEarly = _calcResultTargetDisplay ?? _calcResultFullText();
            var fitKeyEarly = String(flatSrcEarly) + '|' + (_calcResultWrapLines || 1);
            if (_resultAnimActive() && fitKeyEarly === _calcFitTargetKey) return; // [EN] fitCalcLayout rAF — nie resetuj wrap/nowrap
            var maxW = _calcResultMaxWidth(row);
            if (maxW <= 0) {
                if (_calcResultFitPending < 12) {
                    _calcResultFitPending++;
                    requestAnimationFrame(fitCalcResultSize);
                    return;
                }
                var disp = calcResult.closest('.calc-display');
                maxW = Math.max(0, (disp && disp.clientWidth) || row.clientWidth || 280);
                if (maxW <= 0) return;
            }
            _calcResultFitPending = 0;
            var prevLines = _calcResultWrapLines;
            var basePx = _calcResultBaseFontPx();
            var floorPx = _calcResultFloorPx();
            var flatSrc = _calcResultTargetDisplay ?? _calcResultFullText(); // [EN] '' = brak wyniku (nieprawidłowe wyrażenie), nie fallback na stary DOM
            var flat = _normalizeResultFlat(String(flatSrc).replace(/\n/g, ' ').trim());
            var prevRendered = _calcResultFullText(); // [EN] stan sprzed tego fit — jeden render z animacją
            if (_isDefaultResultFlat(flat)) {
                _resetCalcResultFont();
                _calcResultWrapLines = 1;
                _syncResultWhiteSpace();
                calcResult.classList.remove('small', 'xsmall', 'xxsmall');
                _setResultMarkup(calcResult, '0'); // [EN] AC / puste pole — wynik też na 0, nie stary wynik
                var disp0 = calcResult.closest('.calc-display');
                if (disp0) _syncResultWrapLayout(disp0);
                return;
            }
            var layout = _resolveResultLayout(flat, maxW, row, floorPx, basePx);
            var targetMarkup = layout.targetMarkup;
            _calcResultWrapLines = layout.wrapLines;
            _syncResultWhiteSpace();
            if (_calcResultWrapLines > 1) {
                var dispEarly = calcResult.closest('.calc-display');
                if (dispEarly) _syncResultWrapLayout(dispEarly);
            }
            _applyResultFontFromLayout(layout, basePx);
            if (_calcResultWrapLines > 1) _shrinkWrapUntilLinesFit(row, floorPx, basePx, targetMarkup); // [EN] shrink przed DOM — bez mignięcia 3. linii
            _applyResultMarkupFromFit(prevRendered, targetMarkup);
            _syncResultWhiteSpace();
            if (_calcResultWrapLines > 1) _shrinkWrapUntilLinesFit(row, floorPx, basePx);
            if (!calcResult.querySelector('.calc-result-new')) _finalizeResultFit(row, flat, floorPx, basePx, prevRendered);
            _forceResultToFit(row, flat, maxW, floorPx, basePx, prevRendered);
            var fitRow = row, fitFlat = flat, fitPrev = prevRendered;
            requestAnimationFrame(function() { // [EN] po layout — dopasowanie na żywym DOM (1 i 2 linie)
                requestAnimationFrame(function() {
                    if (_resultAnimActive()) return; // [EN] anim trwa — pass robi setTimeout
                    _finalizeResultFit(fitRow, fitFlat, floorPx, basePx, fitPrev);
                });
            });
            _scheduleResultFinalize(fitRow, fitFlat, floorPx, basePx);
            if (_calcResultWrapLines !== prevLines) {
                _clearWrapStableFont();
                fitCalcLayout();
            }
            var dispFit = calcResult.closest('.calc-display');
            if (dispFit) _syncResultRowStable(dispFit);
            _calcFitTargetKey = String(_calcResultTargetDisplay ?? flatSrc) + '|' + (_calcResultWrapLines || 1);
        }
        // [EN] Sync result + expr — jeden przebieg fit na żywo DOM.
        function fitCalcDisplay() {
            fitCalcResultSize();
            var display = calcExpr && calcExpr.closest('.calc-display');
            fitCalcExpr();
            if (display) {
                _syncResultRowStable(display);
                _syncResultWrapLayout(display);
                _rebalanceWrapDisplayBudget(display); // [EN] niski budżet + 2 linie — expr przed wynikiem
                fitCalcExpr();
                _syncResultRowStable(display);
            }
            updatePlaceholderMarquee();
            _clampResultInDisplay();
        }
        // [EN] Mobile layout — values in js/calc-layout-tune.js (CALC_LAYOUT_TUNE.mobile).
        var _calcBtnScale = 1;
        var _calcWasEmpty = true;
        function _isCalcMobileLayout() {
            return window.innerWidth < 640;
        }
        function _usesCalcFlexSplit() {
            return document.body.classList.contains('calc-panel-active')
                || document.body.classList.contains('calc-split-active');
        }
        function getCalcLayoutTune() {
            if (typeof window.getCalcLayoutTuneSection === 'function') {
                return window.getCalcLayoutTuneSection();
            }
            var root = window.CALC_LAYOUT_TUNE;
            if (!root) return {};
            return window.innerWidth < 640 ? (root.mobile || {}) : (root.desktop || root.mobile || {});
        }
        function applyCalcLayoutTune(card) {
            if (typeof window.applyCalcLayoutTuneTokens === 'function') {
                window.applyCalcLayoutTuneTokens(card, getCalcLayoutTune());
            }
        }
        function _syncKeypadFontScale(card, panelH) {
            if (!calcGrid || !card || !_usesCalcFlexSplit()) return;
            var t = getCalcLayoutTune();
            var base = t.btnRowBase != null ? t.btnRowBase : 56;
            var btn = calcGrid.querySelector('.calc-btn');
            if (!btn) return;
            var rowH = btn.getBoundingClientRect().height;
            if (rowH < 8) return;
            var rowScale = rowH / base;
            var scale = typeof window.resolveKeypadFontScale === 'function'
                ? window.resolveKeypadFontScale(panelH || 640, rowScale, t)
                : rowScale;
            _calcBtnScale = scale;
            card.style.setProperty('--calc-btn-scale', String(scale));
            applyCalcLayoutTune(card);
        }
        function _clearCalcLayoutInline(card, display) {
            document.body.classList.remove('calc-panel-active');
            document.body.classList.remove('calc-split-active');
            _setCalcPanelScroll(false);
            if (!card || !display) return;
            card.style.removeProperty('--calc-btn-scale');
            card.style.removeProperty('--calc-font-base');
            card.style.removeProperty('--calc-card-min-h');
            ['fn', 'number', 'operator', 'equals', 'clear'].forEach(function(n) {
                card.style.removeProperty('--calc-g-' + n + '-font');
            });
            display.style.removeProperty('max-height');
            display.style.removeProperty('min-height');
            display.style.removeProperty('height');
            display.style.removeProperty('flex');
            if (calcGrid) {
                calcGrid.style.removeProperty('flex');
                calcGrid.style.removeProperty('min-height');
            }
            card.style.removeProperty('--calc-expr-min');
            card.style.removeProperty('--calc-display-gap');
            card.style.removeProperty('--calc-grid-gap');
            card.style.removeProperty('--calc-display-pad-y');
            card.style.removeProperty('--calc-display-pad-x');
            card.style.removeProperty('--calc-expr-font');
            card.style.removeProperty('--calc-expr-min-rem');
            card.style.removeProperty('--calc-expr-min-px');
            card.style.removeProperty('--calc-result-font');
            card.style.removeProperty('--calc-approx-font');
            _calcBtnScale = 1;
        }
        function fitCalcLayout() {
            var panel = document.getElementById('panel-calculator');
            if (!panel || !calcGrid) return;
            var card = panel.querySelector('.card');
            var display = card && card.querySelector('.calc-display');
            if (!card || !display) return;
            document.body.classList.remove('calc-expr-focused');
            calcGrid.style.removeProperty('display');
            if (!panel.classList.contains('active')) {
                _clearCalcLayoutInline(card, display);
                requestAnimationFrame(function() { fitCalcDisplay(); });
                return;
            }
            var t = getCalcLayoutTune();
            var useSplit = t.flexSplit !== false;
            if (!useSplit) {
                _clearCalcLayoutInline(card, display);
                requestAnimationFrame(function() { fitCalcDisplay(); });
                return;
            }
            var isMobile = _isCalcMobileLayout();
            document.body.classList.toggle('calc-panel-active', isMobile);
            document.body.classList.toggle('calc-split-active', !isMobile);
            applyCalcLayoutTune(card);
            var availDetail = typeof window.resolveCalcAvailHeightDetail === 'function'
                ? window.resolveCalcAvailHeightDetail(panel, card, t)
                : { height: panel.clientHeight, visibleH: panel.clientHeight };
            var availH = availDetail.height;
            if (availH < 120) return;
            var isEmpty = !calcExpr || !calcExpr.value;
            var budget = typeof window.resolveCalcDisplayBudget === 'function'
                ? window.resolveCalcDisplayBudget(availH, !isEmpty, t, {
                    resultExtraLines: Math.max(0, (_calcResultWrapLines || 1) - 1),
                    resultLinePx: _calcResultWrapLinePx(),
                })
                : { height: 120, maxPx: 160, wrapExtraPx: 0 };
            var wrapMin = (_calcResultWrapLines || 1) > 1 ? _calcWrappedDisplayMinH(display) : 0;
            var needScroll = _calcPanelScrollNeeded(t, availDetail, budget, wrapMin);
            _setCalcPanelScroll(needScroll);
            if (needScroll) {
                card.style.setProperty('--calc-card-min-h', (availDetail.visibleH || availH) + 'px');
                card.style.height = 'auto';
            } else {
                card.style.height = '';
                card.style.setProperty('--calc-card-min-h', availH + 'px');
            }
            var displayH = budget.height + _calcAssistExtraPx();
            // [EN] wrap 2 linii — realokacja w środku ekranika, bez podbijania wysokości displayH
            display.style.flex = '0 0 auto';
            display.style.height = displayH + 'px';
            display.style.minHeight = displayH + 'px';
            display.style.maxHeight = displayH + 'px';
            calcGrid.style.flex = needScroll ? '0 0 auto' : '1 1 auto';
            var scrollC = (t.displayCurve || {}).scrollOverflow || {};
            calcGrid.style.minHeight = needScroll ? ((scrollC.keypadMinPx != null ? scrollC.keypadMinPx : 280) + 'px') : '0';
            if (t.debug) {
                console.log('[calc-layout]', {
                    section: isMobile ? 'mobile' : 'desktop',
                    empty: isEmpty, displayH: displayH, share: budget.sharePct, limit: budget.limit,
                    availH: availH, scroll: needScroll, wrapMin: wrapMin,
                });
            }
            requestAnimationFrame(function() {
                _syncKeypadFontScale(card, availH);
                if (_resultAnimActive()) { // [EN] po wrap — layout refit po animacji, nie w trakcie
                    setTimeout(function() { fitCalcDisplay(); }, 280);
                } else fitCalcDisplay();
            });
        }

        function liveEval() {
            var empty = !calcExpr.value;
            _calcWasEmpty = empty;
            if (empty) {
                _calcResultWrapLines = 1;
                _resetCalcResultFont();
                if (calcExpr) calcExpr.style.removeProperty('font-size');
                if (_calcPh) _calcPh.style.removeProperty('font-size');
                var dispE = calcExpr && calcExpr.closest('.calc-display');
                if (dispE) _syncResultWrapLayout(dispE);
            }
            updatePlaceholderMarquee();
            // fitCalcLayout poza zmianą pusty/aktywny tylko przy resize/zakładce (unika skakania UI).
            // Wyrażenia z samych liczb całkowitych i +,−,×,() liczymy BigInt-em (dokładnie,
            // do CALC_MAX_DIGITS_BIGINT cyfr). Pozostałe idą przez float — krótszy limit cyfr.
            var rawVal = calcExpr.value;
            var clamped = clampCalcExprInput(rawVal);
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
                calcResult.classList.remove('small', 'xsmall', 'xxsmall');
                calcResult.classList.add('small');
                _lastCopyFormats = null;
                fitCalcDisplay();
                _setApproxMark(false, null, null);
                updateCalcLiveHint();
                updateCalcEmptySuggest(res);
                return;
            }
            // Mamy kursy, ale warto odświeżyć w tle, gdy stare (wynik z cache pokazujemy od razu).
            if (calcExpr.value && _fxReady() && !_fxFresh() && _inputHasCurrency(calcExpr.value)) ensureFxRates();
            var hasResult = res.value !== null || res.text != null;
            var display = hasResult ? formatCalcResult(res) : (calcExpr.value === '' ? '0' : '');
            _calcResultTargetDisplay = display;
            var fxMeta = _fxMetaForResult(res, calcExpr.value);
            _lastCopyFormats = buildCopyFormats(res, calcExpr.value);
            _setApproxMark(hasResult && (res.exact === false || fxMeta), res, fxMeta);
            fitCalcDisplay();
            updateCalcLiveHint();
            updateCalcEmptySuggest(res);
        }
        // Znacznik „≈" — kurs (góra) + pełna wartość (dół) w cursor-hint via /|. [[A2]]
        function _setApproxMark(on, res, fxMeta) {
            if (!calcApprox) return;
            var show = !!on || !!fxMeta;
            if (show) {
                var hintParts = [];
                if (fxMeta) hintParts.push('Kurs: ' + fxMeta);
                var exactLine = _hintResultText(res);
                if (exactLine) hintParts.push(exactLine);
                calcApprox.dataset.eq = hintParts.join('/|');
                calcApprox.dataset.hintClass = 'calc-eq';
                if (exactLine) calcApprox.dataset.exact = exactLine; else delete calcApprox.dataset.exact;
                calcApprox.setAttribute('aria-label', fxMeta ? 'Kurs i dokładna wartość — dotknij' : 'Dokładna wartość — dotknij');
                calcApprox.hidden = false;
            } else {
                calcApprox.hidden = true;
                delete calcApprox.dataset.eq;
                delete calcApprox.dataset.exact;
                delete calcApprox.dataset.hintClass;
                calcApprox.style.removeProperty('font-size');
            }
        }
        // *------------ Logika Animacji pojawiania się liczb/wyrażeń/wyniku* ----------------*
        // [EN] Render wyniku z lekką animacją pojawienia (Samsung-style) TYLKO zmienionej końcówki —
        // animuje się dodany/zmieniony znak, nie cała linijka. Statyczny wspólny prefiks zostaje
        // tekstem, a różnica trafia do ŚWIEŻEGO <span> (nowy element sam odpala animację CSS przy
        // wstawieniu — bez hacka z reflow). Definicja animacji + reduced-motion żyją w styles.css.
        // textContent czytany gdzie indziej (kopiowanie, „=") nadal zwraca pełny wynik.
        function _applyResultMarkupFromFit(prev, next) { // [EN] zawsze diff+anim — finalize nie nadpisuje _setResultMarkup
            if (next === '' || next === prev) return;
            renderCalcResult(prev, next);
        }
        function renderCalcResult(prev, next) {
            if (next === '') {
                _setResultMarkup(calcResult, next);
                return;
            }
            if (next === prev) return; // [EN] drugi fit — nie kasuj świeżych spanów animacji
            var prevNL = prev.indexOf('\n') >= 0;
            var nextNL = next.indexOf('\n') >= 0;
            if (nextNL && !prevNL) { // [EN] wrap 1→2 linie — diff końcówki by zignorował \n (np. 12→13 cyfr)
                if (_calcResultFullText().replace(/\s/g, '') === next.replace(/\s/g, '') && _calcResultFullText().indexOf('\n') >= 0) return;
                var nlAt = next.indexOf('\n');
                calcResult.textContent = '';
                _appendResultMarkup(calcResult, next.slice(0, nlAt));
                calcResult.appendChild(document.createTextNode('\n'));
                _appendAnimatedDigits(calcResult, next.slice(nlAt + 1));
                return;
            }
            // [EN] Diff on digit core (ignore sep shuffles); animate each new digit — also with tight markup
            var pCore = prev.replace(/\s/g, ''), nCore = next.replace(/\s/g, '');
            var c = 0, lim = Math.min(pCore.length, nCore.length);
            while (c < lim && pCore.charAt(c) === nCore.charAt(c)) c++;
            if (c >= nCore.length) {
                // [EN] liveEval single-line format — nie zwijaj 2 wierszy przed fit
                if (!nextNL && prevNL && pCore === nCore) return;
                // [EN] samo złamanie 1→2 wiersz — animuj każdą cyfrę drugiej linii
                if (!prevNL && nextNL && pCore === nCore) {
                    var nlIdx = next.indexOf('\n');
                    calcResult.textContent = '';
                    _appendResultMarkup(calcResult, next.slice(0, nlIdx));
                    calcResult.appendChild(document.createTextNode('\n'));
                    _appendAnimatedDigits(calcResult, next.slice(nlIdx + 1));
                    return;
                }
                _setResultMarkup(calcResult, next);
                return;
            }
            var splitIdx = _formattedIdxForCoreCount(next, c);
            var prefix = next.slice(0, splitIdx);
            var suffix = next.slice(splitIdx);
            calcResult.textContent = '';
            _appendResultMarkup(calcResult, prefix);
            _appendAnimatedDigits(calcResult, suffix);
        }
        // *---------------------------------------------------------------------------------*
        function handleCalcAction(action) {
            var expr = calcExpr.value;

            if ((action >= '0' && action <= '9') || action === '.') {
                if (action >= '0' && action <= '9') {
                    var focusedD = document.activeElement === calcExpr;
                    var sd = focusedD && calcExpr.selectionStart != null ? calcExpr.selectionStart : calcExpr.value.length;
                    var ed = focusedD && calcExpr.selectionEnd != null ? calcExpr.selectionEnd : calcExpr.value.length;
                    if (_calcWouldExceedDigitLimit(calcExpr.value, sd, ed, action)) return;
                }
                _insertCalcExprText(action);
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
                _insertCalcExprText(canClose ? ')' : '(');
                return;
            }

            if (action === '%') {
                // [EN] Insert literal '%' — parseNaturalShortcuts already implements the Samsung
                // semantics („100+10%" = 110, łańcuch „100+10%+5%" = 115,5) POPRAWNIE. Wcześniejsze
                // rozwijanie w tym miejscu dublowało tę logikę z błędem (baza bez nawiasów → „210,5"),
                // psuło drugi tap % i zawsze przeskakiwało kursor na koniec.
                _insertCalcExprText('%');
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
                _insertCalcExprText(action);
                return;
            }

            if (action === '=') {
                var res = evalCalcExpression(expr);
                if (!expr.trim()) return;
                // Duża liczba całkowita (BigInt) — grouped text w polu (nie surowy bigStr)
                if (res.big) {
                    addHistory(expr + ' = ' + res.text);
                    STATE.calc.ans = res.bigStr;
                    calcExpr.value = _calcEqualsExprText(res) || res.text;
                    calcExpr.setSelectionRange(calcExpr.value.length, calcExpr.value.length);
                    liveEval();
                    return;
                }
                // Wynik daty/czasu / tekst — historia + wynik w polu gdy da się go sensownie wpisać
                if (res.text != null) {
                    addHistory(expr + ' = ' + res.text);
                    if (res.value !== null) STATE.calc.ans = res.value;
                    var txtAns = _calcEqualsExprText(res);
                    if (txtAns) {
                        calcExpr.value = txtAns;
                        calcExpr.setSelectionRange(calcExpr.value.length, calcExpr.value.length);
                    }
                    liveEval();
                    return;
                }
                if (res.value !== null) {
                    var ansText = _calcEqualsExprText(res);
                    addHistory(expr + ' = ' + formatCalcResult(res));
                    STATE.calc.ans = res.value;
                    if (ansText) {
                        calcExpr.value = ansText;
                        calcExpr.setSelectionRange(calcExpr.value.length, calcExpr.value.length);
                    }
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
            if (_lastCopyFormats && _lastCopyFormats.withUnit) return _lastCopyFormats.withUnit;
            if (STATE.calc.lastResult !== null) return String(STATE.calc.lastResult);
            var res = evalCalcExpression(calcExpr.value);
            var fm = buildCopyFormats(res, calcExpr.value);
            if (fm) return fm.withUnit;
            if (res.text != null) return res.text;
            return res.value !== null ? String(res.value) : calcExpr.value;
        });

        bindLongPressCopy(calcApprox, function() {
            if (calcApprox.dataset.exact) return calcApprox.dataset.exact;
            if (STATE.calc.lastResult !== null) return String(STATE.calc.lastResult);
            return calcResult.textContent.trim();
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
        // Pozycja historii to obiekt {text, pinned}. Stare wpisy (czyste stringi) migrują w locie.
        function _histNormalize(item) {
            if (typeof item === 'string') return { text: item, pinned: false };
            return { text: (item && item.text) || '', pinned: !!(item && item.pinned) };
        }
        // Przypięte NIE liczą się do limitu i nigdy nie wypadają; trzymamy 50 najnowszych nieprzypiętych.
        function _histEnforceCap() {
            var kept = 0;
            STATE.history = STATE.history.filter(function(it) {
                if (it.pinned) return true;
                kept++;
                return kept <= 50;
            });
        }
        function addHistory(entry) {
            STATE.history.unshift({ text: entry, pinned: false });
            _histEnforceCap();
            saveHistory();
            renderHistory();
            invalidateStdACSuggestions();
        }

        var _historyQuery = '';
        function _histEmptyState(icon, msg) {
            var li = document.createElement('li');
            li.className = 'empty-state';
            var iconDiv = document.createElement('div');
            iconDiv.className = 'icon';
            iconDiv.textContent = icon;
            var p = document.createElement('p');
            p.textContent = msg;
            li.appendChild(iconDiv);
            li.appendChild(p);
            return li;
        }

        function renderHistory() {
            if (historyCount) historyCount.textContent = String(STATE.history.length);
            historyList.replaceChildren();
            if (STATE.history.length === 0) {
                historyList.appendChild(_histEmptyState('📝', 'Brak historii — zacznij liczyć!'));
                return;
            }
            // Przypięte na górze (zachowując kolejność), reszta poniżej; potem filtr szukania.
            var pinned = STATE.history.filter(function(it) { return it.pinned; });
            var rest = STATE.history.filter(function(it) { return !it.pinned; });
            var ordered = pinned.concat(rest);
            var q = _historyQuery || '';
            if (q) ordered = ordered.filter(function(it) { return it.text.toLowerCase().indexOf(q) !== -1; });
            if (ordered.length === 0) {
                historyList.appendChild(_histEmptyState('🔍', 'Brak wyników dla „' + _historyQuery + '"'));
                return;
            }
            ordered.forEach(function(item) {
                var li = document.createElement('li');
                li.className = 'history-item' + (item.pinned ? ' is-pinned' : '');
                var parts = item.text.split(' = ');
                var exprPart = parts[0] || item.text;
                var resultPart = parts.length > 1 ? parts.slice(1).join(' = ') : '';

                // Warstwa treści, która zjeżdża w lewo przy swipe (pod nią czerwone „Usuń").
                var content = document.createElement('div');
                content.className = 'history-item-content';
                // [EN] Safe DOM creation — no innerHTML, no XSS
                var spanExpr = document.createElement('span');
                spanExpr.className = 'expr';
                spanExpr.textContent = exprPart;
                var spanResult = document.createElement('span');
                spanResult.className = 'result';
                spanResult.textContent = resultPart;

                // Akcje pozycji: przypnij + kopiuj. stopPropagation, by nie odpalić reuse na klik wiersza.
                var actions = document.createElement('div');
                actions.className = 'history-item-actions';
                var pinBtn = document.createElement('button');
                pinBtn.type = 'button';
                pinBtn.className = 'history-item-btn hist-pin';
                pinBtn.textContent = '📌';
                pinBtn.title = item.pinned ? 'Odepnij' : 'Przypnij';
                pinBtn.setAttribute('aria-label', item.pinned ? 'Odepnij' : 'Przypnij');
                pinBtn.setAttribute('aria-pressed', item.pinned ? 'true' : 'false');
                pinBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    item.pinned = !item.pinned;
                    _histEnforceCap();
                    saveHistory();
                    renderHistory();
                });
                var copyBtn = document.createElement('button');
                copyBtn.type = 'button';
                copyBtn.className = 'history-item-btn hist-copy';
                copyBtn.textContent = '⧉';
                copyBtn.title = 'Kopiuj';
                copyBtn.setAttribute('aria-label', 'Kopiuj pozycję');
                copyBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    copyText(item.text).then(function() { showToast('Skopiowano', 'success'); })
                        .catch(function() { showToast('Nie udało się skopiować', 'error'); });
                });
                var npBtn = document.createElement('button');
                npBtn.type = 'button';
                npBtn.className = 'history-item-btn hist-notepad';
                npBtn.textContent = '📝';
                npBtn.title = 'Do notatnika';
                npBtn.setAttribute('aria-label', 'Wyślij do notatnika');
                npBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    appendToNotepad(exprPart.trim(), { open: true, focus: true });
                });
                actions.appendChild(pinBtn);
                actions.appendChild(copyBtn);
                actions.appendChild(npBtn);

                content.appendChild(spanExpr);
                content.appendChild(spanResult);
                content.appendChild(actions);

                // Czerwony przycisk „Usuń" odsłaniany swipe'em w lewo (siedzi POD warstwą treści).
                var delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.className = 'history-item-delete';
                delBtn.textContent = 'Usuń';
                delBtn.title = 'Usuń wpis';
                delBtn.setAttribute('aria-label', 'Usuń wpis');
                delBtn.tabIndex = -1;

                // Nakładka potwierdzenia („mały ekranik": Usunąć? Anuluj / Usuń) — chroni przed przypadkiem.
                var confirm = document.createElement('div');
                confirm.className = 'history-item-confirm';
                var confirmMsg = document.createElement('span');
                confirmMsg.className = 'history-item-confirm-msg';
                confirmMsg.textContent = 'Usunąć wpis?';
                var noBtn = document.createElement('button');
                noBtn.type = 'button';
                noBtn.className = 'history-confirm-btn no';
                noBtn.textContent = 'Anuluj';
                noBtn.setAttribute('aria-label', 'Anuluj usuwanie');
                var yesBtn = document.createElement('button');
                yesBtn.type = 'button';
                yesBtn.className = 'history-confirm-btn yes';
                yesBtn.textContent = 'Usuń';
                yesBtn.setAttribute('aria-label', 'Potwierdź usunięcie');
                confirm.appendChild(confirmMsg);
                confirm.appendChild(noBtn);
                confirm.appendChild(yesBtn);

                li.appendChild(delBtn);
                li.appendChild(content);
                li.appendChild(confirm);

                bindLongPressCopy(content, function() { return item.text; });
                content.addEventListener('click', function() {
                    if (content.dataset.longPressed === 'true') {
                        delete content.dataset.longPressed;
                        return;
                    }
                    if (li._swipeHandled) return;                       // świeży swipe — nie traktuj jako klik
                    if (li._swipeJustOpened && (Date.now() - li._swipeJustOpened) < 400) return; // [EN] tap right after swipe ≠ close
                    if (li.classList.contains('swiped') || li.classList.contains('confirming')) {
                        _histSwipeClose(li, content);                  // odsłonięte → klik chowa, nie przywraca
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
                delBtn.addEventListener('pointerdown', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!li.classList.contains('swiped') && !li.classList.contains('swiping')) return;
                    li.classList.add('confirming');
                    hapticTap(15);
                    _histArmConfirmAutoClose(li, content);
                });
                noBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    _histSwipeClose(li, content);
                });
                yesBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var idx = STATE.history.indexOf(item);
                    if (idx !== -1) { STATE.history.splice(idx, 1); saveHistory(); }
                    hapticTap(30);
                    renderHistory();
                    showToast('🗑️ Usunięto wpis', '');
                });
                _bindHistorySwipe(li, content);
                historyList.appendChild(li);
            });
        }

        // ── Swipe-to-delete dla wpisu historii ──────────────────────────────
        // Treść jedzie w lewo, odsłaniając „Usuń"; klik „Usuń" pokazuje nakładkę potwierdzenia.
        // Pionowy scroll listy zostaje natywny (touch-action: pan-y); poziomy gest przejmujemy.
        var _HIST_SWIPE_OPEN = -84;     // px odsłonięcia przycisku „Usuń"
        var _histConfirmTimer = null;
        function _histSetX(content, x, animate) {
            content.style.transition = animate ? '' : 'none';
            content.style.transform = x ? ('translateX(' + x + 'px)') : '';
        }
        function _histSwipeClose(li, content) {
            li.classList.remove('swiped', 'swiping', 'confirming');
            if (_histConfirmTimer) { clearTimeout(_histConfirmTimer); _histConfirmTimer = null; }
            _histSetX(content, 0, true);
        }
        function _histSwipeOpen(li, content, markFresh) {
            li.classList.remove('swiping');
            li.classList.add('swiped');
            _histSetX(content, _HIST_SWIPE_OPEN, true);
            if (markFresh) li._swipeJustOpened = Date.now();
        }
        function _histArmConfirmAutoClose(li, content) {
            if (_histConfirmTimer) clearTimeout(_histConfirmTimer);
            _histConfirmTimer = setTimeout(function() { _histSwipeClose(li, content); }, 5000);
        }
        function _bindHistorySwipe(li, content) {
            var delBtn = li.querySelector('.history-item-delete');
            var startX = 0, startY = 0, dragging = false, decided = false, horizontal = false, curX = 0;
            function _openConfirmFromRelease(e) {
                if (!delBtn || li.classList.contains('confirming')) return;
                var rect = delBtn.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    li.classList.add('confirming');
                    hapticTap(15);
                    _histArmConfirmAutoClose(li, content);
                }
            }
            content.addEventListener('pointerdown', function(e) {
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                startX = e.clientX; startY = e.clientY;
                dragging = true; decided = false; horizontal = false;
                curX = li.classList.contains('swiped') ? _HIST_SWIPE_OPEN : 0;
            });
            content.addEventListener('pointermove', function(e) {
                if (!dragging) return;
                var dx = e.clientX - startX, dy = e.clientY - startY;
                if (!decided) {
                    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;   // za mały ruch — czekaj
                    decided = true;
                    horizontal = Math.abs(dx) > Math.abs(dy);
                    if (horizontal) {
                        // Przejmujemy gest: ubij długie-przytrzymanie-kopiuj (nasłuchuje 'pointerleave').
                        try { content.dispatchEvent(new Event('pointerleave')); } catch (_) {}
                        try { content.setPointerCapture(e.pointerId); } catch (_) {}
                        li.classList.remove('confirming');
                        li.classList.add('swiping'); // odsłoń „Usuń" dopiero TERAZ (w spoczynku ukryty — bez prześwitu)
                    }
                }
                if (!horizontal) return;        // gest pionowy → zostaw natywnemu scrollowi
                e.preventDefault();
                var base = li.classList.contains('swiped') ? _HIST_SWIPE_OPEN : 0;
                var x = base + dx;
                if (x > 0) x = 0;                                       // tylko w lewo
                if (x < _HIST_SWIPE_OPEN - 24) x = _HIST_SWIPE_OPEN - 24; // lekki opór za progiem
                curX = x;
                _histSetX(content, x, false);
            });
            function settle(e) {
                if (!dragging) return;
                dragging = false;
                if (!horizontal) return;
                li._swipeHandled = true;                                // zablokuj klik-reuse tuż po swipe
                setTimeout(function() { li._swipeHandled = false; }, 60);
                if (curX <= _HIST_SWIPE_OPEN / 2) {
                    _histSwipeOpen(li, content, true);
                    if (e) _openConfirmFromRelease(e);                  // [EN] release on „Usuń" = confirm in one gesture
                } else _histSwipeClose(li, content);
            }
            content.addEventListener('pointerup', settle);
            content.addEventListener('pointercancel', function(e) {
                if (!dragging) return;
                dragging = false;
                if (horizontal) {
                    if (curX <= _HIST_SWIPE_OPEN / 2) {
                        _histSwipeOpen(li, content, true);
                        if (e) _openConfirmFromRelease(e);
                    } else _histSwipeClose(li, content);
                }
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
            var hadPins = STATE.history.some(function(it) { return it.pinned; });
            STATE.history = STATE.history.filter(function(it) { return it.pinned; }); // przypięte zostają
            saveHistory();
            renderHistory();
            showToast(hadPins ? '🗑️ Wyczyszczono (przypięte zostają)' : '🗑️ Historia wyczyszczona', '');
        });
        if (historySearch) {
            historySearch.addEventListener('input', function() {
                _historyQuery = historySearch.value.trim().toLowerCase();
                renderHistory();
            });
        }

        if (openHistoryBtn) openHistoryBtn.addEventListener('click', openHistoryDrawer);
        if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', closeHistoryDrawer);
        if (historyBackdrop) historyBackdrop.addEventListener('click', closeHistoryDrawer);
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && document.body.classList.contains('history-open')) {
                closeHistoryDrawer();
            }
            if (e.key === 'Escape' && document.body.classList.contains('help-open')) {
                closeCommandHelp();
                e.preventDefault();
                e.stopImmediatePropagation(); // [EN] don't close notepad on same Esc
            }
        });

        function escapeHTML(str) {
            var div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        function getCommandErrorEl() {
            return graphCommandError;
        }

        function setCommandError(message) {
            var el = getCommandErrorEl();
            if (!el) return;
            el.textContent = message || '';
        }

        function recordRecentCommand(command) {
            var value = String(command || '').trim();
            if (!value) return;
            if (!STATE.recentCommands) STATE.recentCommands = { graph: [] };
            var list = STATE.recentCommands.graph || [];
            list = [value].concat(list.filter(function(item) { return item !== value; })).slice(0, 6);
            STATE.recentCommands.graph = list;
            saveRecentCommands();
            renderRecentCommands();
        }

        function renderRecentCommands() {
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
            renderRecentCommands();
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

        /* ============================================================
           [EN] Canvas theme tokens — engineering + graph drawing
           ============================================================ */
        var GRAPH_LABEL_PLATE = 'rgba(255, 255, 255, 0.25)';
        var GRAPH_SERIES_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2'];
        var ENGINEERING_SERIES_COLORS = ['#2563eb', '#e11d48', '#16a34a', '#d97706', '#7c3aed', '#0891b2'];
        var ENGINEERING_THEME_COLORS = {
            warningText: '#94a3b8',
            panelBg: '#ffffff',
            helperGrid: 'rgba(226,232,240,0.7)',
            axisGuide: '#cbd5e1',
            board: '#e8d5b7',
            boardStroke: '#b8956a',
            marginFill: 'rgba(100, 116, 139, 0.3)',
            marginDash: '#94a3b8',
            marginLabel: '#d97706',
            marginWarn: 'rgba(251,191,36,0.12)',
            marginWarnStroke: '#fbbf24',
            hole: '#dc2626',
            holeStroke: '#991b1b',
            dim: '#475569',
            label: '#0f172a',
            chipText: '#1e293b',
            shadowSoft: 'rgba(0,0,0,0.06)',
            woodGrain: 'rgba(184, 149, 106, 0.25)',
            alignGuide: 'rgba(148, 163, 184, 0.4)',
            alignGuideStrong: 'rgba(148, 163, 184, 0.5)',
            holeCenter: '#fff',
            labelPlate: 'rgba(255, 255, 255, 0.55)'
        };
        var GRAPH_THEME_DEFAULTS = {
            paper: '#f8fafc',
            grid: '#e2e8f0',
            axisText: '#64748b',
            axisStroke: '#475569',
            pointFill: '#dc2626',
            pointStroke: '#991b1b',
            pointLabel: '#0f172a',
            labelPlate: 'rgba(255,255,255,0.55)',
            alert: '#dc2626'
        };
        var GRAPH_THEME_COLORS = Object.assign({}, GRAPH_THEME_DEFAULTS);
        function refreshGraphThemeColors() { // [EN] read CSS vars with hard fallbacks (light/dark)
            if (typeof window === 'undefined' || !window.getComputedStyle || !document || !document.documentElement) return;
            var rootStyles = window.getComputedStyle(document.documentElement);
            function _readVar(name, fallback) {
                var v = rootStyles.getPropertyValue(name);
                v = v ? String(v).trim() : '';
                return v || fallback;
            }
            GRAPH_THEME_COLORS.paper = _readVar('--graph-canvas-paper', GRAPH_THEME_DEFAULTS.paper);
            GRAPH_THEME_COLORS.grid = _readVar('--graph-canvas-grid', GRAPH_THEME_DEFAULTS.grid);
            GRAPH_THEME_COLORS.axisText = _readVar('--graph-canvas-axis-text', GRAPH_THEME_DEFAULTS.axisText);
            GRAPH_THEME_COLORS.axisStroke = _readVar('--graph-canvas-axis-stroke', GRAPH_THEME_DEFAULTS.axisStroke);
            GRAPH_THEME_COLORS.pointFill = _readVar('--graph-canvas-point-fill', GRAPH_THEME_DEFAULTS.pointFill);
            GRAPH_THEME_COLORS.pointStroke = _readVar('--graph-canvas-point-stroke', GRAPH_THEME_DEFAULTS.pointStroke);
            GRAPH_THEME_COLORS.pointLabel = _readVar('--graph-canvas-point-label', GRAPH_THEME_DEFAULTS.pointLabel);
            GRAPH_THEME_COLORS.labelPlate = _readVar('--graph-canvas-label-plate', GRAPH_THEME_DEFAULTS.labelPlate);
            GRAPH_THEME_COLORS.alert = _readVar('--graph-canvas-alert', GRAPH_THEME_DEFAULTS.alert);
            GRAPH_LABEL_PLATE = _readVar('--graph-canvas-smart-label-bg', GRAPH_LABEL_PLATE);
        }

        function drawEmptyCanvas(_canvas, _ctx) {
            refreshGraphThemeColors();
            var ctx = _ctx || graphCtx;
            var dims = setCanvasHiDPI(_canvas || graphCanvas, ctx);
            var w = dims.w;
            var h = dims.h;
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = ENGINEERING_THEME_COLORS.warningText;
            ctx.font = lblFont('600', 16);
            ctx.textAlign = 'center';
            ctx.fillText('⚠️ Nieprawidłowe dane', w / 2, h / 2);
        }

        function drawEngineeringCanvasMulti(L, ms, me, allSeries, origin, _canvas, _ctx) {
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
            function ptVal(p) { return (p && p.x !== undefined) ? p.x : p; }

            // Tło
            ctx.fillStyle = ENGINEERING_THEME_COLORS.panelBg;
            ctx.fillRect(0, 0, W, H);

            // Delikatna siatka pomocnicza
            ctx.strokeStyle = ENGINEERING_THEME_COLORS.helperGrid;
            ctx.lineWidth = 1;
            var nLines = 8;
            for (var gi = 0; gi <= nLines; gi++) {
                var gx = PAD_L + (gi / nLines) * drawW;
                ctx.beginPath(); ctx.moveTo(gx, PAD_T); ctx.lineTo(gx, H - PAD_B); ctx.stroke();
            }

            // Linia bazowa (oś)
            var axisY = PAD_T + (H - PAD_T - PAD_B) / 2;
            ctx.strokeStyle = ENGINEERING_THEME_COLORS.axisGuide; ctx.lineWidth = 1; ctx.setLineDash([]);
            ctx.beginPath(); ctx.moveTo(PAD_L, axisY); ctx.lineTo(PAD_L + drawW, axisY); ctx.stroke();

            // Belka — wąski prostokąt z zaokrąglonymi końcami
            var beamH = 14;
            var beamY = axisY - beamH / 2;
            ctx.fillStyle = ENGINEERING_THEME_COLORS.board;
            ctx.strokeStyle = ENGINEERING_THEME_COLORS.boardStroke;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(PAD_L, beamY, drawW, beamH, 3);
            ctx.fill(); ctx.stroke();

            // Etykiety 0 i L pod belką
            ctx.fillStyle = ENGINEERING_THEME_COLORS.warningText;
            ctx.font = lblFont('', 10);
            ctx.textBaseline = 'top'; ctx.textAlign = 'center';
            ctx.fillText('0', PAD_L, axisY + beamH / 2 + 4);
            ctx.fillText(formatNum(L) + ' ' + unit, PAD_L + drawW, axisY + beamH / 2 + 4);

            // Marginesy — półprzezroczyste strefy
            if (ms > 0) {
                var msX = toX(ms);
                ctx.fillStyle = ENGINEERING_THEME_COLORS.marginWarn;
                ctx.fillRect(PAD_L, beamY, msX - PAD_L, beamH);
                ctx.strokeStyle = ENGINEERING_THEME_COLORS.marginWarnStroke; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
                ctx.beginPath(); ctx.moveTo(msX, PAD_T - 4); ctx.lineTo(msX, H - PAD_B + 4); ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = ENGINEERING_THEME_COLORS.marginLabel; ctx.font = 'bold 10px ' + getComputedStyle(document.body).fontFamily;
                ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                ctx.fillText(formatNum(ms), (PAD_L + msX) / 2, beamY - 2);
            }
            if (me > 0) {
                var meX = toX(L - me);
                ctx.fillStyle = ENGINEERING_THEME_COLORS.marginWarn;
                ctx.fillRect(meX, beamY, PAD_L + drawW - meX, beamH);
                ctx.strokeStyle = ENGINEERING_THEME_COLORS.marginWarnStroke; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
                ctx.beginPath(); ctx.moveTo(meX, PAD_T - 4); ctx.lineTo(meX, H - PAD_B + 4); ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = ENGINEERING_THEME_COLORS.marginLabel; ctx.font = 'bold 10px ' + getComputedStyle(document.body).fontFamily;
                ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                ctx.fillText(formatNum(me), (meX + PAD_L + drawW) / 2, beamY - 2);
            }

            // Serie — każda nad/pod osią na przemian
            var DOT_R = 11;
            allSeries.forEach(function(series, si) {
                var color = ENGINEERING_SERIES_COLORS[si % ENGINEERING_SERIES_COLORS.length];
                var above = si % 2 === 0;
                var rowOffset = above ? -(DOT_R + beamH / 2 + 10) : (DOT_R + beamH / 2 + 10);
                var pts = series.points;

                // Linie odstępów między sąsiednimi punktami (pod/nad belką)
                if (pts.length > 1) {
                    var spacingY = axisY + rowOffset + (above ? -DOT_R - 8 : DOT_R + 8);
                    for (var pi = 0; pi < pts.length - 1; pi++) {
                        var p1 = ptVal(pts[pi]);
                        var p2 = ptVal(pts[pi + 1]);
                        var x1 = toX(p1);
                        var x2 = toX(p2);
                        var gap = p2 - p1;
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
                    var pVal = ptVal(pt);
                    var px = toX(pVal);
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
                    ctx.strokeStyle = ENGINEERING_THEME_COLORS.holeCenter; ctx.lineWidth = 2;
                    ctx.stroke();

                    // Numer wewnątrz kółka
                    ctx.fillStyle = ENGINEERING_THEME_COLORS.holeCenter;
                    ctx.font = 'bold ' + (DOT_R > 9 ? '11' : '9') + 'px ' + getComputedStyle(document.body).fontFamily;
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(pi + 1, px, cy);

                    // Wartość pozycji pod/nad kółkiem
                    ctx.fillStyle = ENGINEERING_THEME_COLORS.label;
                    ctx.font = lblFont('600', 10);
                    ctx.textAlign = 'center';
                    ctx.textBaseline = above ? 'bottom' : 'top';
                    ctx.fillText(formatNum(pVal) + ' ' + unit,
                        px, cy + (above ? -DOT_R - 3 : DOT_R + 3));
                });

                // Legenda — kolorowy punkt + nazwa serii
                var legendX = PAD_L + si * 110;
                ctx.beginPath(); ctx.arc(legendX + 6, 16, 5, 0, Math.PI * 2);
                ctx.fillStyle = color; ctx.fill();
                ctx.fillStyle = ENGINEERING_THEME_COLORS.chipText; ctx.font = lblFont('600', 11);
                ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                ctx.fillText(series.label || ('Seria ' + (si + 1)), legendX + 14, 16);
            });

            // Wymiar całkowitej długości — strzałka na górze
            var dimY = PAD_T - 22;
            ctx.strokeStyle = ENGINEERING_THEME_COLORS.dim; ctx.lineWidth = 1; ctx.setLineDash([]);
            ctx.beginPath(); ctx.moveTo(PAD_L, dimY); ctx.lineTo(PAD_L + drawW, dimY); ctx.stroke();
            drawArrow(ctx, PAD_L, dimY, 'left');
            drawArrow(ctx, PAD_L + drawW, dimY, 'right');
            ctx.fillStyle = ENGINEERING_THEME_COLORS.label; ctx.font = 'bold 12px ' + getComputedStyle(document.body).fontFamily;
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
                ctx.fillStyle = ENGINEERING_THEME_COLORS.shadowSoft;
                ctx.beginPath();
                ctx.roundRect(boardLeft + 3, boardTop + 3, boardWidth, boardThickness, 6);
                ctx.fill();

                // [EN] Board body
                ctx.fillStyle = ENGINEERING_THEME_COLORS.board;
                ctx.strokeStyle = ENGINEERING_THEME_COLORS.boardStroke;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(boardLeft, boardTop, boardWidth, boardThickness, 6);
                ctx.fill();
                ctx.stroke();

                // [EN] Wood grain lines (subtle)
                ctx.strokeStyle = ENGINEERING_THEME_COLORS.woodGrain;
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
                    ctx.fillStyle = ENGINEERING_THEME_COLORS.marginFill;
                    ctx.fillRect(boardLeft, boardTop, msX - boardLeft, boardThickness);
                    // [EN] Margin label
                    ctx.fillStyle = ENGINEERING_THEME_COLORS.dim;
                    ctx.font = lblFont('600', 11);
                    ctx.textAlign = 'center';
                    ctx.fillText(formatNum(marginStart) + ' ' + unit, boardLeft + (msX - boardLeft) / 2, boardTop - 10);
                    // [EN] Dashed line at margin end
                    ctx.setLineDash([4, 3]);
                    ctx.strokeStyle = ENGINEERING_THEME_COLORS.marginDash;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(msX, boardTop - 15);
                    ctx.lineTo(msX, boardBottom + 15);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
                if (marginEnd > 0) {
                    var meX = boardRight - (marginEnd / totalLength) * boardWidth;
                    ctx.fillStyle = ENGINEERING_THEME_COLORS.marginFill;
                    ctx.fillRect(meX, boardTop, boardRight - meX, boardThickness);
                    ctx.fillStyle = ENGINEERING_THEME_COLORS.dim;
                    ctx.font = lblFont('600', 11);
                    ctx.textAlign = 'center';
                    ctx.fillText(formatNum(marginEnd) + ' ' + unit, meX + (boardRight - meX) / 2, boardTop - 10);
                    ctx.setLineDash([4, 3]);
                    ctx.strokeStyle = ENGINEERING_THEME_COLORS.marginDash;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(meX, boardTop - 15);
                    ctx.lineTo(meX, boardBottom + 15);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                // [EN] Dimension line above board
                ctx.strokeStyle = ENGINEERING_THEME_COLORS.dim;
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
                ctx.fillStyle = ENGINEERING_THEME_COLORS.label;
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
                    ctx.strokeStyle = ENGINEERING_THEME_COLORS.alignGuide;
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(x, boardMidY);
                    ctx.lineTo(x, boardTop - 20);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // [EN] Hole
                    var holeRadius = 7;
                    ctx.fillStyle = ENGINEERING_THEME_COLORS.hole;
                    ctx.strokeStyle = ENGINEERING_THEME_COLORS.holeStroke;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(x, boardMidY, holeRadius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    // [EN] Hole center dot
                    ctx.fillStyle = ENGINEERING_THEME_COLORS.holeCenter;
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
                    ctx.fillStyle = ENGINEERING_THEME_COLORS.labelPlate;
                    ctx.fillRect(x - textWidth / 2 - 2, labelY - 10, textWidth + 4, 16);
                    ctx.fillStyle = ENGINEERING_THEME_COLORS.label;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(labelText + ' ' + unit, x, labelY - 2);

                    // [EN] Small tick on dimension line
                    ctx.strokeStyle = ENGINEERING_THEME_COLORS.dim;
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
                ctx.fillStyle = ENGINEERING_THEME_COLORS.shadowSoft;
                ctx.beginPath();
                ctx.roundRect(boardLeftV + 3, boardTopV + 3, boardThicknessV, boardHeightV, 6);
                ctx.fill();

                // [EN] Board body
                ctx.fillStyle = ENGINEERING_THEME_COLORS.board;
                ctx.strokeStyle = ENGINEERING_THEME_COLORS.boardStroke;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(boardLeftV, boardTopV, boardThicknessV, boardHeightV, 6);
                ctx.fill();
                ctx.stroke();

                // [EN] Wood grain (vertical)
                ctx.strokeStyle = ENGINEERING_THEME_COLORS.woodGrain;
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
                    ctx.fillStyle = ENGINEERING_THEME_COLORS.marginFill;
                    ctx.fillRect(boardLeftV, boardTopV, boardThicknessV, msY - boardTopV);
                    ctx.fillStyle = ENGINEERING_THEME_COLORS.dim;
                    ctx.font = lblFont('600', 11);
                    ctx.textAlign = 'right';
                    ctx.fillText(formatNum(marginStart) + ' ' + unit, boardLeftV - 12, boardTopV + (msY - boardTopV) / 2 + 4);
                    ctx.setLineDash([4, 3]);
                    ctx.strokeStyle = ENGINEERING_THEME_COLORS.marginDash;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(boardLeftV - 18, msY);
                    ctx.lineTo(boardRightV + 18, msY);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
                if (marginEnd > 0) {
                    var meY = boardBottomV - (marginEnd / totalLength) * boardHeightV;
                    ctx.fillStyle = ENGINEERING_THEME_COLORS.marginFill;
                    ctx.fillRect(boardLeftV, meY, boardThicknessV, boardBottomV - meY);
                    ctx.fillStyle = ENGINEERING_THEME_COLORS.dim;
                    ctx.font = lblFont('600', 11);
                    ctx.textAlign = 'right';
                    ctx.fillText(formatNum(marginEnd) + ' ' + unit, boardLeftV - 12, meY + (boardBottomV - meY) / 2 + 4);
                    ctx.setLineDash([4, 3]);
                    ctx.strokeStyle = ENGINEERING_THEME_COLORS.marginDash;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(boardLeftV - 18, meY);
                    ctx.lineTo(boardRightV + 18, meY);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                // [EN] Dimension line to the right
                var dimX = boardRightV + 35;
                ctx.strokeStyle = ENGINEERING_THEME_COLORS.dim;
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
                ctx.fillStyle = ENGINEERING_THEME_COLORS.label;
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
                    ctx.strokeStyle = ENGINEERING_THEME_COLORS.alignGuide;
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(boardMidX, y);
                    ctx.lineTo(boardRightV + 20, y);
                    ctx.stroke();
                    ctx.setLineDash([]);

                    // [EN] Hole
                    var holeRadius = 7;
                    ctx.fillStyle = ENGINEERING_THEME_COLORS.hole;
                    ctx.strokeStyle = ENGINEERING_THEME_COLORS.holeStroke;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(boardMidX, y, holeRadius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = ENGINEERING_THEME_COLORS.holeCenter;
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
                    ctx.strokeStyle = ENGINEERING_THEME_COLORS.alignGuideStrong;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(boardRightV + 20, y);
                    ctx.lineTo(labelX - 4, y);
                    ctx.stroke();

                    ctx.fillStyle = ENGINEERING_THEME_COLORS.labelPlate;
                    ctx.fillRect(labelX - 4, labelYCenter - 8, ctx.measureText(labelText + ' ' + unit).width + 10, 16);
                    ctx.fillStyle = ENGINEERING_THEME_COLORS.label;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(labelText + ' ' + unit, labelX + 1, labelYCenter);
                });
            }
        }

        /* [EN] Helper: draw small arrowheads */
        function drawArrow(ctx, x, y, direction) {
            ctx.fillStyle = ENGINEERING_THEME_COLORS.dim;
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

        var _HELP_DRAWER_TITLES = { calculator: 'Ściąga — kalkulator', notepad: 'Ściąga — notatnik', komenda: 'Ściąga — komenda', graph: 'Ściąga — komenda' };

        function openCommandHelp() {
            document.body.classList.add('help-open');
            if (commandHelpDrawer) commandHelpDrawer.setAttribute('aria-hidden', 'false');
            if (commandHelpTitle) commandHelpTitle.textContent = _HELP_DRAWER_TITLES[activeCommandTarget] || 'Ściąga komend';

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
            // na właściwe regexy parsera). Każda pozycja ma JEDEN kanoniczny `term` (symboliczny),
            // który musi istnieć w ściądze (command-definitions.js). Dzięki temu sekcja
            // „Parser umie więcej" zostaje pusta, dopóki nie dojdzie naprawdę nieudokumentowana
            // funkcja. Synonimy (step=, every=, kolo=, dia=, kątXY=, hfov=, wys=, tilt= …) wciąż
            // działają w parserze — po prostu nie zaśmiecają ściągi.
            return {
                engineering: [
                    { syntax: 'x=L/N', command: 'x={L}/{N}', description: 'podstawowy podzial osi X.', terms: ['x=L/N'] },
                    { syntax: 'y=L/N', command: 'y={Ly}/{Ny}', description: 'podstawowy podzial osi Y.', terms: ['y=L/N'] },
                    { syntax: 'L/N', command: '{L}/{N}', description: 'skrot bez nazwy osi.', terms: ['L/N'] },
                    { syntax: 'co=S', command: 'x={L} | co={S}', description: 'staly odstep.', terms: ['co=S'] },
                    { syntax: 'co=S1;S2', command: 'x={L} | co={S1};{S2}', description: 'naprzemienny odstep.', terms: ['co=S1;S2'] },
                    { syntax: '@between / @edges / @centered', command: 'x={L}/{N} | @edges', description: 'tryby rozmieszczenia punktow.', terms: ['edges'] },
                    { syntax: 'm=A/B', command: 'x={L}/{N} | m={A}/{B}', description: 'margines start/koniec.', terms: ['m=A/B'] },
                    { syntax: '<-A / ->B', command: 'x={L}/{N} | <-{A} | ->{B}', description: 'marginesy strzalkami.', terms: ['<-A'] },
                    { syntax: 'ms=A / me=B', command: 'x={L}/{N} | ms={A} | me={B}', description: 'margines jednostronny.', terms: ['ms=A'] },
                    { syntax: 'origin=Z', command: 'x={L}/{N} | origin={O}', description: 'przesuniecie poczatku osi.', terms: ['origin=Z'] },
                    { syntax: 'x=D / y=D', command: 'y={Ly}/{Ny} | x={D}', description: 'przesuniecie serii na drugiej osi.', terms: ['x=D'] },
                    { syntax: 'r=P', command: 'x={L}/{N} | r={P}', description: 'promien punktu.', terms: ['r=P'] },
                    { syntax: 'u=mm', command: 'x={L}/{N} | u=mm', description: 'jednostka wyniku.', terms: ['u=mm'] },
                    { syntax: 'opis=T', command: 'x={L}/{N} | opis={T}', description: 'nazwa serii.', terms: ['opis=T'] },
                    { syntax: ';;', command: 'x={L}/{N} ;; x={L2}/{N2} | y={D}', description: 'wiele serii.', terms: [';;'] },
                ],
                graph: [
                    { syntax: 'f(x)=wyrażenie', command: 'f(x)=x^2', description: 'funkcja matematyczna.', terms: ['f(x)='] },
                    { syntax: 'sin cos tan sqrt abs log ln exp', command: 'f(x)=sqrt(abs(x))', description: 'obslugiwane funkcje w wykresach.', terms: ['sin cos tan sqrt abs log ln exp'] },
                    { syntax: 'asin acos atan sinh cosh tanh cot csc', command: 'f(x)=asin(x)', description: 'odwrotna i hiperboliczna trygonometria w wykresach.', terms: ['asin acos atan sinh cosh tanh'] },
                    { syntax: 'floor ceil round', command: 'f(x)=floor(x)', description: 'zaokraglenia.', terms: ['floor ceil round'] },
                    { syntax: 'pi / π / e', command: 'f(x)=sin(pi*x)', description: 'stale matematyczne.', terms: ['pi'] },
                    { syntax: 'punkt=x;y', command: 'punkt={Xp};{Yp} | opis=A', description: 'punkt 2D.', terms: ['punkt=x;y'] },
                    { syntax: 'rect=WxH / prostokat=WxH', command: 'prostokat={W}x{H}', description: 'prostokat 2D.', terms: ['prostokat=WxH'] },
                    { syntax: 'okrąg=R / circle=R', command: 'okrąg={R}', description: 'okrag.', terms: ['okrąg=R'] },
                    { syntax: 'wielokat=N;R', command: 'wielokat={Ns};{R}', description: 'wielokat foremny.', terms: ['wielokat=N;R'] },
                    { syntax: 'ox=A / oy=B', command: 'rect={W}x{H} | ox={Ox} | oy={Oy}', description: 'przesuniecie geometrii.', terms: ['ox=A'] },
                    { syntax: 'siatka=WxH', command: 'siatka={W}x{H} | co={dx}x{dy}', description: 'siatka punktow.', terms: ['siatka=WxH'] },
                    { syntax: 'kamera=x;y | kąt=K | zasięg=Z', command: 'kamera={Xp};{Yp} | kąt={K} | zasięg={Zr}', description: 'pole widzenia 2D.', terms: ['kamera=x;y'] },
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
                    chunks.push(item.syntax || '', item.command || '', item.yields || '', item.description || '');
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
            if (item.prose) {
                var proseRow = document.createElement('p');
                proseRow.innerHTML = item.prose;
                return proseRow;
            }

            var row = document.createElement('p');
            if (item.command) {
                row.className = 'help-command';
                row.setAttribute('data-command', expandHelpCommand(item.command));
                row.title = 'Kliknij, aby wstawić komendę';
            }

            var syntaxText = expandTokens(item.syntax || item.command || '');
            if (item.syntaxAlt) {
                var pair = document.createElement('span');
                pair.className = 'help-pair';
                var codes = [syntaxText].concat(Array.isArray(item.syntaxAlt) ? item.syntaxAlt : [item.syntaxAlt]);
                codes.forEach(function(text, i) {
                    if (i > 0) {
                        var sep = document.createElement('span');
                        sep.className = 'help-sep';
                        sep.textContent = '·';
                        pair.appendChild(sep);
                    }
                    var code = document.createElement('code');
                    code.textContent = text;
                    pair.appendChild(code);
                });
                row.appendChild(pair);
            } else if (syntaxText) {
                var codeEl = document.createElement('code');
                codeEl.textContent = syntaxText;
                row.appendChild(codeEl);
            }

            if (item.yields) {
                var yieldsWrap = document.createElement('span');
                yieldsWrap.className = 'help-yields';
                yieldsWrap.appendChild(document.createTextNode('→ '));
                var yieldsCode = document.createElement('code');
                yieldsCode.textContent = item.yields;
                yieldsWrap.appendChild(yieldsCode);
                row.appendChild(yieldsWrap);
            }

            if (item.description) {
                var descSpan = document.createElement('span');
                descSpan.className = 'help-desc';
                descSpan.textContent = item.description;
                row.appendChild(descSpan);
            }
            return row;
        }

        function renderCommandHelpDefinitions() {
            var definitions = window.MATM0_COMMAND_DEFINITIONS;
            if (!definitions) return;

            var allMissing = [];
            var lastGapSection = null;

            ['calculator', 'engineering', 'graph'].forEach(function(helpType) {
                var helpSection = document.querySelector('.help-section[data-help="' + helpType + '"]');
                var groups = definitions[helpType];
                if (!helpSection || !Array.isArray(groups)) return;

                helpSection.replaceChildren();
                groups.forEach(function(group) {
                    if (group.langNote) {
                        var note = document.createElement('p');
                        note.className = 'help-lang-note';
                        note.innerHTML = group.langNote;
                        helpSection.appendChild(note);
                        return;
                    }

                    var section = document.createElement('section');
                    if (group.title) {
                        var title = document.createElement('h4');
                        title.textContent = group.title;
                        section.appendChild(title);
                    }
                    if (group.intro) {
                        var intro = document.createElement('p');
                        intro.innerHTML = group.intro;
                        section.appendChild(intro);
                    }
                    (group.items || []).forEach(function(item) {
                        section.appendChild(createHelpCommandRow(item));
                    });
                    helpSection.appendChild(section);
                });

                if (helpType === 'engineering' || helpType === 'graph') {
                    var missing = getMissingHelpCapabilities(helpType);
                    allMissing = allMissing.concat(missing);
                    lastGapSection = helpSection;
                }
            });

            if (allMissing.length && lastGapSection) {
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
                lastGapSection.appendChild(missingSection);
            }
        }

        function escapeRegExp(text) {
            return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        /* ============================================================
           [EN] Help System
        ============================================================ */

        var _helpSystemReady = false;
        function initHelpSystem() {
            if (_helpSystemReady) return;
            _helpSystemReady = true;
            renderCommandHelpDefinitions();
            invalidateStdACSuggestions(); // T4-16 — ściąga doładowana po deferred init

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

                    document.querySelectorAll('.help-section').forEach(function(section) {
                        if (section.style.display === 'none') return; // [EN] search only active cheat sheet
                        section.querySelectorAll('p').forEach(function(item) {

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

                });

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

                    } else if (activeCommandTarget === 'notepad') {

                        setupNpEditor();
                        _npStashCurrent();
                        if (npBody) {
                            var cur = npBody.value;
                            var ins = command;
                            var needNl = cur.length > 0 && !cur.endsWith('\n');
                            npBody.value = needNl ? (cur + '\n' + ins) : (cur ? cur + ins : ins);
                            _npCommit();
                            npBody.focus();
                            var L = npBody.value.length;
                            try { npBody.setSelectionRange(L, L); } catch (e) {}
                        }

                    }

                    closeCommandHelp();

                    showToast('⚡ Wstawiono', 'success');

                });

            });

        }

        function ensureHelpSystem() { initHelpSystem(); } // [EN] idempotent — heavy help init deferred off critical path

        var calcHelpOpen = $('#calcHelpOpen');
        if (calcHelpOpen) {
            calcHelpOpen.addEventListener('click', function() {
                ensureHelpSystem();
                activeCommandTarget = 'calculator';
                openCommandHelp();
            });
        }
        var graphCommandHelpOpen = $('#graphCommandHelpOpen');
        if (graphCommandHelpOpen) {
            graphCommandHelpOpen.addEventListener('click', function() {
                ensureHelpSystem();
                activeCommandTarget = 'komenda';
                openCommandHelp();
            });
        }
        if (npHelpOpen) {
            npHelpOpen.addEventListener('click', function() {
                ensureHelpSystem();
                activeCommandTarget = 'notepad';
                npCloseList();
                openCommandHelp();
            });
        }
        if (commandHelpClose) commandHelpClose.addEventListener('click', closeCommandHelp);
        if (commandHelpBackdrop) commandHelpBackdrop.addEventListener('click', closeCommandHelp);

        function bindCalcExampleChips() {
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
        }

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
            { test: /^(kamera|widok|fov|pole|stozek|sto[zż]ek)/, head: 'kamera', sig: 'kamera=<b>x;y[;z]</b> ,, kąt=<b>H[;V]</b> ,, zasięg=<b>Z</b> ,, [cel=x;y;z | azymut=A[;V] | kierunek=A[;V] | krawędźL=x;y | krawędźP=x;y] ,, [pochył=P] ,, [na=D1;D2]', desc: 'pole widzenia. z = wysokość, V = pionowy FOV. Skrót pozycyjny: kamera=x;y;z;kąt;zasięg. Kąt z optyki: ogniskowa= + matryca=.' },
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
            krawedzl: 'krawędźL', 'krawędźl': 'krawędźL', lewy: 'krawędźL', lewa: 'krawędźL', brzegl: 'krawędźL', rogl: 'krawędźL', left: 'krawędźL', edgel: 'krawędźL',
            krawedzp: 'krawędźP', 'krawędźp': 'krawędźP', prawy: 'krawędźP', prawa: 'krawędźP', brzegp: 'krawędźP', rogp: 'krawędźP', right: 'krawędźP', edger: 'krawędźP',
            ognisk: 'ogniskowa', ogn: 'ogniskowa', focal: 'ogniskowa', matrica: 'matryca', sensor: 'matryca', przetwornik: 'matryca', ccd: 'matryca', cmos: 'matryca',
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
            'krawędźL': { sig: 'krawędźL=<b>x;y</b>', desc: 'przypnij LEWY brzeg FOV do punktu (alias edgeL). Płasko: dolicza oś. Z z= i kąt=H;V: traktuje punkt jak bliski narożnik na ziemi i wylicza azymut, pochył ORAZ cel= (pokazany na rysunku).' },
            'krawędźP': { sig: 'krawędźP=<b>x;y</b>', desc: 'przypnij PRAWY brzeg FOV do punktu (alias edgeR). Płasko: dolicza oś. Z z= i kąt=H;V: traktuje punkt jak bliski narożnik na ziemi i wylicza azymut, pochył ORAZ cel= (pokazany na rysunku).' },
            'ogniskowa': { sig: 'ogniskowa=<b>mm</b>', desc: 'kąt z optyki: w parze z matryca= liczy FOV = 2·atan(wymiar/(2·f)). Bez matryca= zakłada pełną klatkę 36×24.' },
            'matryca': { sig: 'matryca=<b>W[;H]</b>', desc: 'wymiary matrycy w mm (szer.;wys.) do trybu „z ogniskowej". Alias: sensor, przetwornik.' },
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
            refreshGraphThemeColors();
            var ctx = graphCtx;
            var dims = setCanvasHiDPI(graphCanvas, ctx);
            var w = dims.w;
            var h = dims.h;
            var pad = GRAPH_PAD;
            computeLabelScale();
            resetGraphLabels();   // nowy render → czysty rejestr boksów etykiet (anty-nakładanie)
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = GRAPH_THEME_COLORS.paper;
            ctx.fillRect(0, 0, w, h);

            var xStepCustom = graphXStep ? parseFloat(graphXStep.value) : NaN;
            var yStepCustom = graphYStep ? parseFloat(graphYStep.value) : NaN;
            var xStep = (isFinite(xStepCustom) && xStepCustom > 0) ? xStepCustom : niceGridStep(bounds.xMax - bounds.xMin);
            var yStep = (isFinite(yStepCustom) && yStepCustom > 0) ? yStepCustom : niceGridStep(bounds.yMax - bounds.yMin);

            ctx.lineWidth = 1;
            ctx.strokeStyle = GRAPH_THEME_COLORS.grid;
            ctx.fillStyle = GRAPH_THEME_COLORS.axisText;
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

            ctx.strokeStyle = GRAPH_THEME_COLORS.axisStroke;
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

            ctx.strokeStyle = GRAPH_SERIES_COLORS[0];
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

            ctx.fillStyle = GRAPH_THEME_COLORS.pointFill;
            ctx.strokeStyle = GRAPH_THEME_COLORS.pointStroke;
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
                ctx.fillStyle = GRAPH_THEME_COLORS.pointLabel;
                ctx.fillText((pt.label || labelPrefix || 'P') + (idx + 1), p.x, p.y - radius - 5);
                ctx.fillStyle = GRAPH_THEME_COLORS.pointFill;
            });
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
                var fovExplicit = posNum(3) != null;   // czy kąt poziomy podano jawnie (blokuje wyliczenie z ogniskowej)
                var rangeExplicit = posNum(4) != null; // czy zasięg podano jawnie (inaczej można go wziąć z krawędzi)
                var label = '', markDists = [];
                var dirRad = 0, dirMode = 'kierunek', dirValue = 0, targetTxt = null;
                var targetX = null, targetY = null; // punkt celu (do narysowania znacznika „cel")
                var fovV = 0;                 // pionowy FOV (analogicznie do poziomego `kąt`)
                var tilt = null, tiltMode = 'brak'; // pochylenie osi w dół (°), jawne lub z celu
                var dirTilt = null;           // pion z azymut=A,V / kierunek=A,V (down-positive po przeliczeniu z elewacji)
                var targetZ = 0, targetHorizDist = null; // do auto-pochylenia z celu
                var edgeX = null, edgeY = null, edgeSide = null; // krawędźL=/krawędźP= — przypnij jeden brzeg FOV do punktu
                var edgeSolvedTilt = null, edgeCelX = null, edgeCelY = null; // tryb 3D: rozwiązany pochył + wyliczony cel osi na ziemi
                var focal = 0, sensorW = 0, sensorH = 0;         // tryb „z ogniskowej": kąt z ogniskowej (mm) i matrycy (mm)
                parts.slice(1).forEach(function(p) {
                    var pl = p.toLowerCase();
                    var val = p.split('=').slice(1).join('=').trim();
                    if (/^(k[aą]tz|katz|k[aą]t_pion|k[aą]t_pionowy|kat_pion|kat_pionowy|fovv|fov_v|vfov|pion)=/.test(pl)) {
                        fovV = Math.abs(parseGraphNumber(val, 0));
                    } else if (/^(k[aą]t|kat|k[aą]txy|katxy|k[aą]t_poziomy|kat_poziomy|k[aą]t_poz|kat_poz|fov|hfov|fov_h|angle)=/.test(pl)) {
                        // kąt=H lub kąt=H;V — H = kąt poziomy, V (opcjonalnie) = kąt pionowy (jak kątZ=)
                        var kc = splitVals(val);
                        fov = Math.abs(parseGraphNumber(kc[0], 90)); fovExplicit = true;
                        if (kc[1] != null && kc[1] !== '') fovV = Math.abs(parseGraphNumber(kc[1], 0));
                    } else if (/^(pochy[lł]|pochylenie|tilt|sp[aą]d|wd[oó][lł])=/.test(pl)) {
                        tilt = parseGraphNumber(val, 0); tiltMode = 'jawny';
                    } else if (/^(z|wys|wysoko[sść]c?|wysoko[sść][cć]|h)=/.test(pl)) {
                        oz = Math.abs(parseGraphNumber(val, 0));
                    } else if (/^(na|przy|odl|dystans)=/.test(pl)) {
                        // na=5 lub na=5;10;15 — jedna lub wiele poprzecznych linii granic FOV.
                        splitVals(val).forEach(function(d) { var n = Math.abs(parseGraphNumber(d, 0)); if (n > 0) markDists.push(n); });
                    } else if (/^(zasi[eę]g|zasieg|range|d[lł]ugo[sś][cć]|r)=/.test(pl)) {
                        range = Math.abs(parseGraphNumber(val, 10)); rangeExplicit = true;
                    } else if (/^(ognisk\w*|focal|f_?mm|ogn)=/.test(pl)) {
                        // ogniskowa= (mm) — w parze z matryca= policzymy kąt: 2·atan(wymiar/(2·f)).
                        focal = Math.abs(parseGraphNumber(val, 0));
                    } else if (/^(matryca|matrica|sensor|przetwornik|ccd|cmos)=/.test(pl)) {
                        // matryca=W lub matryca=W;H — szerokość;wysokość matrycy w mm (do trybu „z ogniskowej").
                        var mv = splitVals(val);
                        sensorW = Math.abs(parseGraphNumber(mv[0], 0));
                        if (mv[1] != null && mv[1] !== '') sensorH = Math.abs(parseGraphNumber(mv[1], 0));
                    } else if (/^(kraw[eę]d[zź][_ ]?l|krawedzl|lewy|lewa|brzeg[_ ]?l|brzegl|rog[_ ]?l|rogl|edge[_ ]?l|left)=/.test(pl)) {
                        // krawędźL=x;y — przypnij LEWY brzeg FOV do punktu (oś = brzeg − kąt/2).
                        var el = splitVals(val);
                        edgeX = parseGraphNumber(el[0], 0); edgeY = parseGraphNumber(el[1] || '0', 0); edgeSide = 'L';
                    } else if (/^(kraw[eę]d[zź][_ ]?p|krawedzp|prawy|prawa|brzeg[_ ]?p|brzegp|rog[_ ]?p|rogp|edge[_ ]?r|right)=/.test(pl)) {
                        // krawędźP=x;y — przypnij PRAWY brzeg FOV do punktu (oś = brzeg + kąt/2).
                        var er = splitVals(val);
                        edgeX = parseGraphNumber(er[0], 0); edgeY = parseGraphNumber(er[1] || '0', 0); edgeSide = 'P';
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

                // Tryb „z ogniskowej": jeśli nie podano kąta jawnie, policz poziomy (i pionowy)
                // FOV z ogniskowej i wymiarów matrycy: FOV = 2·atan(wymiar / (2·ogniskowa)).
                // Bez matryca= zakładamy pełną klatkę 36×24 mm (i tak to sygnalizujemy w opisie).
                var fovFromLens = false;
                if (focal > 0 && !fovExplicit) {
                    var haveSensor = sensorW > 0;
                    var swMm = haveSensor ? sensorW : 36;
                    var shMm = sensorH > 0 ? sensorH : (haveSensor ? 0 : 24);
                    fov = 2 * Math.atan(swMm / (2 * focal)) * 180 / Math.PI;
                    if (shMm > 0 && !(fovV > 0)) fovV = 2 * Math.atan(shMm / (2 * focal)) * 180 / Math.PI;
                    fovFromLens = true;
                }

                if (!(fov > 0)) fov = 90;
                if (fov > 360) fov = 360;
                if (!(range > 0)) range = 10;

                // krawędźL=/krawędźP= — przypnij jeden brzeg pola widzenia do punktu na canvasie.
                // DWA tryby:
                //  • płaski (z=0 lub brak pionowego FOV): brzeg = azymut poziomy; oś = brzeg ∓ kąt/2
                //    (L: −, P: +, bo cone rozpina się symetrycznie ±kąt/2 wokół osi, CCW dodatnio).
                //  • 3D (z>0 i pionowy FOV>0): punkt to realny BLISKI narożnik pokrycia na ziemi.
                //    Mając wysokość h, poziomy H i pionowy V, rozwiązujemy azymut φ i pochył θ
                //    tak, by promień narożnika (sh=±1, sv=−1=dół) trafił dokładnie w ten punkt
                //    (2 równania = x,y; 2 niewiadome = φ,θ). Z orientacji liczymy CEL (oś na ziemi).
                // Strona: krawędźL = +uH (CCW, sh=+1), krawędźP = −uH (CW, sh=−1) — spójnie z płaskim.
                if (edgeSide && edgeX != null) {
                    var sh3d = edgeSide === 'L' ? 1 : -1;
                    var pose = (oz > 0 && fovV > 0) ? solveEdgePose(ox, oy, oz, fov, fovV, edgeX, edgeY, sh3d) : null;
                    dirMode = 'krawędź';
                    if (pose) {
                        dirRad = pose.phi;
                        dirValue = ((dirRad * 180 / Math.PI) % 360 + 360) % 360;
                        edgeSolvedTilt = pose.th * 180 / Math.PI; // pochył (w dół dodatni), °
                        if (pose.th > 1e-6) { // oś patrzy w dół → trafia w ziemię = wyliczony cel
                            edgeCelX = ox + oz * Math.cos(pose.phi) / Math.tan(pose.th);
                            edgeCelY = oy + oz * Math.sin(pose.phi) / Math.tan(pose.th);
                        }
                        if (!rangeExplicit) { // domyślny zasięg tak, by footprint (do celu) był widoczny
                            var dCel = edgeCelX != null ? Math.hypot(edgeCelX - ox, edgeCelY - oy) : Math.hypot(edgeX - ox, edgeY - oy);
                            if (dCel > 1e-9) range = dCel * 1.4;
                        }
                    } else { // płaski: azymut z brzegu, oś = brzeg ∓ kąt/2
                        var halfFovR = (fov * Math.PI / 180) / 2;
                        var edgeAng = Math.atan2(edgeY - oy, edgeX - ox);
                        dirRad = edgeSide === 'L' ? edgeAng - halfFovR : edgeAng + halfFovR;
                        dirValue = ((dirRad * 180 / Math.PI) % 360 + 360) % 360;
                        if (!rangeExplicit) { var edgeDist = Math.hypot(edgeX - ox, edgeY - oy); if (edgeDist > 1e-9) range = edgeDist; }
                    }
                    targetX = edgeX; targetY = edgeY; // marker w przypiętym brzegu (rysowany jak „cel", podpis „brzeg L/P")
                }

                // Pochylenie osi w pionie: jawne `pochył` ma pierwszeństwo; w przeciwnym razie
                // policz je z celu na ziemi (kamera nad celem) — θ = atan(Δh / dystans poziomy).
                // Pierwszeństwo: jawny `pochył` > pion z `azymut`/`kierunek` > wyliczony z celu.
                var theta = null; // ° pod poziomem
                if (tiltMode === 'jawny') {
                    theta = tilt;
                } else if (dirTilt != null) {
                    theta = dirTilt; tiltMode = 'jawny';
                } else if (edgeSolvedTilt != null) {
                    theta = edgeSolvedTilt; tiltMode = 'krawędź'; // pochył rozwiązany z przypiętego narożnika
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
                    var dFar, farClamped = false, farHorizon = false;
                    if (aTop <= 1e-6) { dFar = range; farClamped = true; farHorizon = true; } // górny promień ≥ poziom → brzeg po horyzont (cięty zasięgiem)
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

                    footprint = { dNear: dNear, dFar: dFar, farClamped: farClamped, farHorizon: farHorizon,
                                  nA: nA, nB: nB, fA: fA, fB: fB, farEdge: farEdge, farArc: farArc, range: range,
                                  nearWidth: nearWidth, farWidth: farWidth, area: Math.abs(area2) / 2 };
                }

                return { type: 'widok', ox: ox, oy: oy, fov: fov, range: range, dir: dirRad,
                         dirMode: dirMode, dirValue: dirValue, targetTxt: targetTxt, label: label, markDists: markDists,
                         targetX: targetX, targetY: targetY, edgeSide: edgeSide,
                         celCalcX: edgeCelX, celCalcY: edgeCelY, // wyliczony cel osi (3D edge) — TYLKO do rysunku/opisu
                         fovFromLens: fovFromLens, focal: focal, sensorW: sensorW, sensorH: sensorH,
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

        // [EN] Rozwiązuje orientację kamery (azymut φ, pochył θ) tak, by BLISKI narożnik kadru
        // (poziomy znak sh, pionowy sv=−1 = dół) trafił dokładnie w punkt na ziemi (ex,ey).
        // Mając wysokość h oraz poziomy/pionowy FOV (fov,fovV) to 2 równania (x,y) na 2 niewiadome.
        // Newton 2D z numerycznym Jakobianem. Zwraca null, gdy nie zbiega albo narożnik wypada
        // nad horyzont (brak realnego rozwiązania — wtedy świadomie NIE udajemy wyniku).
        // Wektory fwd/uH/vUp i znaki IDENTYCZNE jak w rzucie footprintu, więc rozwiązany narożnik
        // pokrywa się 1:1 z rysowanym narożnikiem pokrycia.
        function solveEdgePose(ox, oy, h, fov, fovV, ex, ey, sh) {
            var bh = fov * Math.PI / 360, bv = fovV * Math.PI / 360;
            var tex = ex - ox, tey = ey - oy;
            function cornerGround(phi, th) {
                var cph = Math.cos(phi), sph = Math.sin(phi), cth = Math.cos(th), sth = Math.sin(th);
                var fwd = [cph * cth, sph * cth, -sth];
                var uH = [-sph, cph, 0];
                var vUp = [fwd[1] * uH[2] - fwd[2] * uH[1], fwd[2] * uH[0] - fwd[0] * uH[2], fwd[0] * uH[1] - fwd[1] * uH[0]];
                var d0 = fwd[0] + Math.tan(bh) * sh * uH[0] - Math.tan(bv) * vUp[0]; // sv = −1 (dolny narożnik)
                var d1 = fwd[1] + Math.tan(bh) * sh * uH[1] - Math.tan(bv) * vUp[1];
                var d2 = fwd[2] + Math.tan(bh) * sh * uH[2] - Math.tan(bv) * vUp[2];
                if (d2 >= -1e-9) return null;              // promień nad horyzontem — nie dotyka ziemi
                var t = h / (-d2);
                return [t * d0, t * d1];
            }
            var horiz = Math.hypot(tex, tey) || 1e-6;
            var phi = Math.atan2(tey, tex);               // start: oś mniej-więcej ku punktowi
            var th = Math.atan2(h, horiz);
            for (var it = 0; it < 80; it++) {
                var g = cornerGround(phi, th);
                if (!g) { th += 0.05; if (th > Math.PI / 2 - 1e-4) th = Math.PI / 2 - 1e-4; continue; }
                var rx = g[0] - tex, ry = g[1] - tey;
                if (Math.abs(rx) < 1e-10 && Math.abs(ry) < 1e-10) break;
                var eps = 1e-6;
                var gp = cornerGround(phi + eps, th), gt = cornerGround(phi, th + eps);
                if (!gp || !gt) { th -= 0.02; continue; }
                var j00 = (gp[0] - g[0]) / eps, j01 = (gt[0] - g[0]) / eps;
                var j10 = (gp[1] - g[1]) / eps, j11 = (gt[1] - g[1]) / eps;
                var det = j00 * j11 - j01 * j10;
                if (Math.abs(det) < 1e-14) break;
                phi -= (j11 * rx - j01 * ry) / det;
                th -= (-j10 * rx + j00 * ry) / det;
                if (th > Math.PI / 2 - 1e-4) th = Math.PI / 2 - 1e-4;
                if (th < -Math.PI / 2 + 1e-4) th = -Math.PI / 2 + 1e-4;
            }
            var gF = cornerGround(phi, th);
            if (!gF || Math.hypot(gF[0] - tex, gF[1] - tey) > 1e-3) return null;
            return { phi: phi, th: th };
        }

        // [EN] Opis pola widzenia (stożka/wycinka) — kąt, kierunek, szerokość pokrycia, pole, łuk.
        function describeFov(geo) {
            var rad = geo.fov * Math.PI / 180;
            var dirTxt;
            if (geo.dirMode === 'cel') dirTxt = 'cel (' + geo.targetTxt + ')';
            else if (geo.dirMode === 'azymut') dirTxt = 'azymut ' + formatNum(geo.dirValue) + '°';
            else if (geo.dirMode === 'krawędź') dirTxt = 'brzeg ' + (geo.edgeSide === 'L' ? 'lewy' : 'prawy')
                + ' (' + formatNum(geo.targetX) + ', ' + formatNum(geo.targetY) + ') → oś ' + formatNum(geo.dirValue) + '°';
            else dirTxt = 'kierunek ' + formatNum(geo.dirValue) + '°';
            var lines = [];
            var fovTxt = formatNum(geo.fov) + '°';
            if (geo.fovFromLens) fovTxt += ' (z ogniskowej ' + formatNum(geo.focal) + ' mm'
                + (geo.sensorW > 0 ? ', matryca ' + formatNum(geo.sensorW) + (geo.sensorH > 0 ? '×' + formatNum(geo.sensorH) : '') + ' mm' : ', pełna klatka 36×24 mm')
                + ')';
            lines.push('📷 Pole widzenia (poziom) ' + fovTxt + ' → ' + dirTxt);
            var mountTxt = 'Montaż: (' + formatNum(geo.ox) + ', ' + formatNum(geo.oy) + ')';
            if (geo.oz > 0) mountTxt += ' na wys. ' + formatNum(geo.oz);
            mountTxt += ', zasięg ' + formatNum(geo.range);
            lines.push(mountTxt);
            // Tryb krawędź 3D: parser rozwiązał orientację z przypiętego narożnika → pokaż wyliczony cel.
            if (geo.dirMode === 'krawędź' && geo.celCalcX != null)
                lines.push('🎯 Wyliczony cel (oś na ziemi): (' + formatNum(geo.celCalcX) + ', ' + formatNum(geo.celCalcY) + ')');

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
                    + (f.farClamped ? (f.farHorizon ? ' (do horyzontu, ucięte zasięgiem)' : ' (ucięte do zasięgu)') : '') + ' — głębokość ' + formatNum(f.dFar - f.dNear));
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
            var colors = GRAPH_SERIES_COLORS;

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
                            ctx.fillStyle = GRAPH_THEME_COLORS.labelPlate;
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
                        ctx.fillStyle = GRAPH_THEME_COLORS.labelPlate;
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
                        ctx.fillStyle = GRAPH_THEME_COLORS.labelPlate;
                        var tw = ctx.measureText(txt).width + 6;
                        ctx.fillRect(lx - tw / 2, ly - 7, tw, 14);
                        ctx.fillStyle = analysis.rightVertex === i ? GRAPH_THEME_COLORS.alert : GRAPH_THEME_COLORS.axisStroke;
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
                    drawSmartLabel(ctx, camTxt, apex.x, apex.y, { font: lblFont('700', 10), fill: GRAPH_THEME_COLORS.pointLabel, bg: GRAPH_LABEL_PLATE, anchorR: 6, gap: 5, force: true, key: 'cam' + item.si });

                    // Znacznik celu — żeby od razu było widać, gdzie kamera celuje (bez zgadywania z siatki).
                    if (geo.targetX != null && geo.targetY != null) {
                        var tp = graphToScreen(geo.targetX, geo.targetY, bounds, w, h, pad);
                        ctx.beginPath(); ctx.arc(tp.x, tp.y, 5, 0, Math.PI * 2);
                        ctx.fillStyle = color; ctx.fill();
                        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
                        var celTxt = (geo.dirMode === 'krawędź')
                            ? ('brzeg ' + (geo.edgeSide === 'L' ? 'L' : 'P') + ' (' + formatNum(geo.targetX) + ', ' + formatNum(geo.targetY) + ')')
                            : ('cel (' + formatNum(geo.targetX) + ', ' + formatNum(geo.targetY)
                                + (geo.targetZ ? ', ' + formatNum(geo.targetZ) : '') + ')');
                        // Cel/brzeg — drugorzędny (anty-kolizja, znika przy tłoku, wraca przy zoomie).
                        drawSmartLabel(ctx, celTxt, tp.x, tp.y, { font: lblFont('600', 10), fill: color, bg: GRAPH_LABEL_PLATE, anchorR: 5, gap: 4, key: 'cel' + item.si });
                    }

                    // Wyliczony CEL osi (tryb krawędź 3D) — kropka + współrzędne, dokładnie jak gdy
                    // cel= podano w komendzie. Liczony przez parser z orientacji, NIE wpisywany do pola.
                    if (geo.celCalcX != null && geo.celCalcY != null) {
                        var cp = graphToScreen(geo.celCalcX, geo.celCalcY, bounds, w, h, pad);
                        ctx.beginPath(); ctx.arc(cp.x, cp.y, 5, 0, Math.PI * 2);
                        ctx.fillStyle = color; ctx.fill();
                        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
                        drawSmartLabel(ctx, 'cel (' + formatNum(geo.celCalcX) + ', ' + formatNum(geo.celCalcY) + ')',
                            cp.x, cp.y, { font: lblFont('600', 10), fill: color, bg: GRAPH_LABEL_PLATE, anchorR: 5, gap: 4, key: 'celc' + item.si });
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
                    drawSmartLabel(ctx, txt, p.x, p.y, { font: lblFont('700', 10), fill: GRAPH_THEME_COLORS.pointLabel, anchorR: radius, gap: 3, force: true, key: 'pt' + item.si + '_' + idx });
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
                var accent = opts.fill || GRAPH_THEME_COLORS.axisStroke;
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
                        { font: lblFont('700', 12), fill: GRAPH_THEME_COLORS.pointLabel, anchorR: radius, gap: 4, force: true, key: 'div' + item.si + '_' + idx });
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
            setCommandError('');
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
                    recordRecentCommand(command);
                    return;
                }

                // Wykres / geometria → pokaż Zakres widoku
                if (komendaViewCard) komendaViewCard.style.display = '';

                var rawSeries = parsedSeries.map(function(item) { return item.raw; });

                // Zbierz wszystkie punkty i geometrie ze wszystkich serii
                var allGeos = [];
                var resultLines = [];
                var colors = GRAPH_SERIES_COLORS;
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
                recordRecentCommand(command);

            } catch (err) {
                graphScene = { type: 'empty' };
                drawGraphBase(bounds);
                setCommandError(err.message || 'Nieprawidłowa komenda.');
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
            if (key === 'Enter') { handleCalcAction('='); e.preventDefault(); return; }
            if (key === '=') { _insertCalcExprText('='); e.preventDefault(); return; } // [EN] klawiatura — wpisz =, nie evaluate
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
        var swSoftUpdateVersion = null; // [EN] nowsza wersja na serwerze bez waiting SW (sam version.js się zmienił)

        function fetchRemoteAppVersion() {
            return fetch('./version.js?_v=' + Date.now(), { cache: 'no-store' })
                .then(function(r) { return r.ok ? r.text() : ''; })
                .then(function(text) {
                    var m = text && text.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
                    return m ? m[1] : null;
                })
                .catch(function() { return null; });
        }
        function getCachedAppVersions() {
            if (!('caches' in window)) return Promise.resolve([]);
            return caches.keys().then(function(keys) {
                return keys
                    .filter(function(k) { return k.indexOf('matm0-calc-') === 0; })
                    .map(function(k) { return k.replace(/^matm0-calc-/, ''); });
            });
        }
        function newestVersionLabel(labels) {
            if (!labels || !labels.length) return null;
            var cmp = typeof compareAppVersions === 'function' ? compareAppVersions : null;
            var best = labels[0];
            if (!cmp) return best;
            for (var i = 1; i < labels.length; i++) {
                if (cmp(labels[i], best) > 0) best = labels[i];
            }
            return best;
        }
        function showUpdateBanner(worker, remoteVer) {
            swWaitingWorker = worker || (swRegistration && swRegistration.waiting) || null;
            swSoftUpdateVersion = (!swWaitingWorker && remoteVer) ? remoteVer : null;
            if (!updateBanner || (!swWaitingWorker && !swSoftUpdateVersion)) return;
            updateBanner.classList.add('is-visible');
            updateBanner.setAttribute('aria-hidden', 'false');
            var label = updateBanner.querySelector('.update-banner-text');
            var verLabel = remoteVer || swSoftUpdateVersion;
            if (label && verLabel) label.textContent = '🔄 Dostępna wersja ' + verLabel;
            else if (label) fetchRemoteAppVersion().then(function(ver) {
                if (label && ver) label.textContent = '🔄 Dostępna wersja ' + ver;
            });
        }
        function hideUpdateBanner() {
            if (!updateBanner) return;
            updateBanner.classList.remove('is-visible');
            updateBanner.setAttribute('aria-hidden', 'true');
            swSoftUpdateVersion = null;
        }
        function purgeAppCaches() { // [EN] wyczyść Cache Storage przed przeładowaniem po update
            if (!('caches' in window)) return Promise.resolve();
            return caches.keys().then(function(keys) {
                return Promise.all(keys.map(function(k) { return caches.delete(k); }));
            });
        }
        function hardReloadApp() { // [EN] pełny reload z cache-bust — SWR nie odda starego app.js
            var path = window.location.pathname || './';
            var hash = window.location.hash || '';
            var bust = '_sw=' + Date.now();
            var search = window.location.search || '';
            var url = path + (search ? search + '&' + bust : '?' + bust) + hash;
            window.location.replace(url);
        }
        var swApplyReloadTimer = null;
        function applyUpdate() {
            if (!swWaitingWorker && !swSoftUpdateVersion) { hideUpdateBanner(); return; }
            hideUpdateBanner();
            showToast('🔄 Aktualizuję…', '');
            swRefreshing = true;
            if (swApplyReloadTimer) { clearTimeout(swApplyReloadTimer); swApplyReloadTimer = null; }
            if (swWaitingWorker) {
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({ action: 'purge-caches' });
                }
                function postSkip() { swWaitingWorker.postMessage({ action: 'skip-waiting' }); }
                purgeAppCaches().then(postSkip).catch(postSkip);
                swApplyReloadTimer = setTimeout(function() {
                    if (!swRefreshing) return;
                    purgeAppCaches().finally(hardReloadApp);
                }, 3500);
                return;
            }
            // [EN] soft update — serwer ma nowszą wersję, ale SW jeszcze nie przeszedł w waiting
            purgeAppCaches().then(function() {
                if (swRegistration) return swRegistration.unregister();
            }).catch(function() {}).finally(hardReloadApp);
        }
        function resolveUpdateNotice(remoteVer, installedVer, showFeedback) {
            var localVer = window.APP_VERSION || 'v0';
            var cmp = typeof compareAppVersions === 'function' ? compareAppVersions : null;
            var serverNewer = remoteVer && cmp && cmp(remoteVer, localVer) > 0;
            var cacheStale = remoteVer && cmp && cmp(remoteVer, installedVer) > 0;
            if (!navigator.serviceWorker.controller) return false;
            if (swRegistration && swRegistration.waiting) {
                showUpdateBanner(swRegistration.waiting, remoteVer);
                if (showFeedback) showToast('🔄 Dostępna wersja ' + (remoteVer || installedVer), '');
                return true;
            }
            if (serverNewer || cacheStale) {
                showUpdateBanner(null, remoteVer);
                if (showFeedback) showToast('🔄 Dostępna wersja ' + (remoteVer || ''), '');
                return true;
            }
            return false;
        }
        function checkForUpdates(showFeedback) {
            if (!swRegistration) { if (showFeedback) showToast('Brak aktywnej aktualizacji', ''); return; }
            if (showFeedback) showToast('Sprawdzam aktualizacje…', '');
            var localVer = window.APP_VERSION || 'v0';
            Promise.all([
                swRegistration.update(),
                fetchRemoteAppVersion(),
                getCachedAppVersions()
            ]).then(function(results) {
                var remoteVer = results[1];
                var cacheVers = results[2];
                var installedVer = newestVersionLabel(cacheVers) || localVer;
                if (resolveUpdateNotice(remoteVer, installedVer, showFeedback)) return;
                var attempts = 0;
                function pollForWaiting() {
                    if (resolveUpdateNotice(remoteVer, installedVer, showFeedback)) return;
                    if (attempts++ < 6) { setTimeout(pollForWaiting, 400); return; }
                    if (showFeedback) showToast('✅ Masz najnowszą wersję (' + localVer + ')', 'success');
                }
                pollForWaiting();
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
                if (!swHadController || !swRefreshing) return;
                if (swApplyReloadTimer) { clearTimeout(swApplyReloadTimer); swApplyReloadTimer = null; }
                purgeAppCaches().finally(hardReloadApp);
            });
            navigator.serviceWorker.addEventListener('message', function(event) {
                if (!event.data || event.data.action !== 'sw-updated' || !swHadController || !swRefreshing) return;
                if (swApplyReloadTimer) { clearTimeout(swApplyReloadTimer); swApplyReloadTimer = null; }
                purgeAppCaches().finally(hardReloadApp);
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
                        if (reg.waiting && navigator.serviceWorker.controller) showUpdateBanner(reg.waiting, null);
                        // Nowy update w trakcie tej sesji.
                        reg.addEventListener('updatefound', function() {
                            var newWorker = reg.installing;
                            if (!newWorker) return;
                            newWorker.addEventListener('statechange', function() {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    fetchRemoteAppVersion().then(function(ver) {
                                        showUpdateBanner(newWorker, ver);
                                    });
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
        // Kategorie z sensownym autodoborem (drabinka ≥2 sensowne stopnie). Kąt: tylko deg — pomijamy.
        var _AUTO_UNIT_CATS = { speed: 1, length: 1, mass: 1, volume: 1, time: 1, area: 1, data: 1 };

        // T2-10 — presety domyślnych jednostek (⚙️); „custom" = ręczna edycja selectów.
        var _UNIT_PROFILE_PRESETS = {
            default: { speed: '__auto__', length: '__auto__', mass: '__auto__', volume: '__auto__', time: '__auto__', area: '__auto__', data: '__auto__', angle: '' },
            build: { speed: 'km/h', length: 'm', mass: 'kg', volume: 'l', time: 'h', area: 'm2', data: '__auto__', angle: '' },
            it: { speed: '__auto__', length: '__auto__', mass: '__auto__', volume: '__auto__', time: '__auto__', area: '__auto__', data: 'gb', angle: '' },
            travel: { speed: 'km/h', length: 'km', mass: '__auto__', volume: 'l', time: 'h', area: '__auto__', data: '__auto__', angle: '' }
        };

        function _unitsMatchProfile(units, preset) { // [EN] Compare current defaultUnits with a preset map
            return Object.keys(preset).every(function(cat) {
                return (units[cat] || '') === (preset[cat] || '');
            });
        }

        function _detectUnitProfile() { // [EN] Infer profile id from saved defaultUnits (fallback when unitProfile missing)
            var du = STATE.settings.defaultUnits || {};
            var keys = Object.keys(_UNIT_PROFILE_PRESETS);
            for (var i = 0; i < keys.length; i++) {
                if (_unitsMatchProfile(du, _UNIT_PROFILE_PRESETS[keys[i]])) return keys[i];
            }
            return 'custom';
        }

        function applyUnitProfile(profileId, opts) { // T2-10 — nadpisz defaultUnits presetem (bez „custom")
            opts = opts || {};
            if (profileId === 'custom' || !_UNIT_PROFILE_PRESETS[profileId]) return;
            var preset = _UNIT_PROFILE_PRESETS[profileId];
            if (!STATE.settings.defaultUnits) STATE.settings.defaultUnits = {};
            Object.keys(preset).forEach(function(cat) { STATE.settings.defaultUnits[cat] = preset[cat]; });
            STATE.settings.unitProfile = profileId;
            if (!opts.silent) saveSettings();
        }

        function syncUnitProfileSelect() {
            if (!settingUnitProfile) return;
            var prof = STATE.settings.unitProfile;
            if (prof !== 'custom' && !_UNIT_PROFILE_PRESETS[prof]) prof = _detectUnitProfile();
            if (prof !== 'custom' && prof !== STATE.settings.unitProfile) STATE.settings.unitProfile = prof;
            settingUnitProfile.value = prof === 'custom' || _UNIT_PROFILE_PRESETS[prof] ? prof : 'custom';
        }

        function buildUnitOptions() {
            if (!settingUnitSelects.length) return;
            settingUnitSelects.forEach(function(sel) {
                var cat = sel.getAttribute('data-unit-cat');
                var def = CALC_UNIT_CATEGORIES[cat];
                if (!def) return;
                sel.innerHTML = '';
                var base = document.createElement('option');
                base.value = '';
                base.textContent = 'Jednostka robocza (pierwsza wpisana)';
                sel.appendChild(base);
                if (_AUTO_UNIT_CATS[cat]) {
                    var autoOpt = document.createElement('option');
                    autoOpt.value = '__auto__';
                    autoOpt.textContent = 'Czytelnie (auto-dobór)';
                    sel.appendChild(autoOpt);
                }
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
            syncUnitProfileSelect();
            buildUnitOptions();
            // Zaznacz aktualny silnik.
            var radios = document.querySelectorAll('#settingFxEngine input[name="fxEngine"]');
            radios.forEach(function(r) { r.checked = (r.value === STATE.settings.fxEngine); });
            syncFxBackupRow();
            syncFoldSetting(STATE.settings.notepadFold);
            if (settingNotepadAutoUnit) settingNotepadAutoUnit.value = STATE.settings.notepadAutoUnit || 'safe';
            if (settingNotepadUnitMix) settingNotepadUnitMix.value = STATE.settings.notepadUnitMix || 'strict';
            if (settingNotepadSumUnit) settingNotepadSumUnit.value = STATE.settings.notepadSumUnit || 'off';
            if (settingStandardLiveHint) settingStandardLiveHint.checked = !!STATE.settings.standardLiveHint;
            if (settingStandardAutocomplete) settingStandardAutocomplete.checked = !!STATE.settings.standardAutocomplete;
            if (settingSuggestOnEmpty) settingSuggestOnEmpty.checked = !!STATE.settings.suggestOnEmpty;
            if (settingCurrencyCompactSymbols) settingCurrencyCompactSymbols.checked = STATE.settings.currencyCompactSymbols !== false;
            _npSyncFontSize(true);
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
        // T3-13 — wbudowane szablony (surowy tekst notatki)
        var _NP_TEMPLATES = [
            { id: 'przyklad-jednostki', title: 'Przykład: wyjazd', learn: true, text: 'Nocleg: 115pln×10os\npaliwo: 5,60pln×100km\nrazem(usd)\ntest: @razem × 2.5\ntest2: @test na pln\n' },
            { id: 'remont', title: 'Remont', text: 'Farba: \nGips: \nTaśma: \nRazem\n' },
            { id: 'wyjazd', title: 'Wyjazd', text: 'Dystans km: \nSpalanie l/100: \nPaliwo l: \nKoszt: \nRazem\n' },
            { id: 'faktura', title: 'Faktura VAT', text: 'Netto: \nVAT 23%: \nBrutto: \n' }
        ];
        var _NP_WS_LABELS = { // T1-2 — etykiety wyników Warsztatu przy wysyłce do notatnika
            wsAreaResult: 'Pole netto', wsCovResult: 'Pokrycie', wsVolResult: 'Objętość',
            wsGridResult: 'Siatka', wsSlResult: 'Nachylenie', wsPyResult: 'Piramida',
            wsFovResult: 'FOV', wsFovNeedResult: 'FOV potrzebny', wsElResult: 'Przewód',
            wsEnResult: 'Energia', wsVdResult: 'Spadek napięcia', wsConvResult: 'Konwersja'
        };
        var npBody = null, npMirror = null, npGutter = null, npFoldLayer = null, npWrapLayer = null, npEditorInner = null; // [EN] jedno pole — zaznaczanie wielu linii
        function appendToNotepad(lineOrLines, opts) { // T1-2 — dopisz linię(e) do aktywnej notatki
            opts = opts || {};
            var lines = (Array.isArray(lineOrLines) ? lineOrLines : [lineOrLines])
                .map(function(l) { return String(l == null ? '' : l).trim(); }).filter(Boolean);
            if (!lines.length) return false;
            if (!_npNotes.length) {
                _npNotes = [{ id: _npNewId(), text: '', updatedAt: Date.now() }];
                _npCurrentId = _npNotes[0].id;
            }
            var notepadOpen = document.body.classList.contains('notepad-open');
            if (notepadOpen) {
                setupNpEditor();
                _npStashCurrent();
                var curOpen = npBody.value;
                var addOpen = lines.join('\n');
                npBody.value = curOpen ? (curOpen.replace(/\n$/, '') + '\n' + addOpen) : addOpen;
                _npCommit();
                if (opts.focus !== false) {
                    npBody.focus();
                    var L = npBody.value.length;
                    try { npBody.setSelectionRange(L, L); } catch (e) {}
                    requestAnimationFrame(function() { try { npBody.scrollIntoView({ block: 'nearest' }); } catch (e2) {} });
                }
            } else {
                var n = _npCurrentNote();
                if (!n) { npNewNote(); n = _npCurrentNote(); }
                var cur = String(n.text || '');
                var add = lines.join('\n');
                n.text = cur ? (cur.replace(/\n$/, '') + '\n' + add) : add;
                n.updatedAt = Date.now();
                flushNotepadPersist();
            }
            if (opts.open) openNotepad();
            if (!opts.silent) showToast('📝 Dodano do notatnika', 'success');
            return true;
        }
        function _npExportBody(format) { // T3-14 — surowy tekst wszystkich notatek
            _npStashCurrent();
            if (format === 'md') {
                return _npNotes.map(function(n) {
                    return '## ' + _npTitleFull(n) + '\n\n' + String(n.text || '').trim();
                }).join('\n\n');
            }
            return _npNotes.map(function(n, i) {
                var head = '--- ' + _npTitleFull(n) + ' ---';
                return (i ? '\n\n' : '') + head + '\n' + String(n.text || '');
            }).join('');
        }
        function _npExportFilename(format) {
            var d = new Date();
            var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
            var stamp = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
            return 'notatnik-' + stamp + (format === 'md' ? '.md' : '.txt');
        }
        function npExport(format) { // T3-14 — .txt / .md / share
            var fmt = format === 'md' ? 'md' : 'txt';
            var body = _npExportBody(fmt);
            if (!body.trim()) { showToast('⚠️ Notatnik jest pusty', 'error'); return; }
            var fname = _npExportFilename(fmt);
            var mime = fmt === 'md' ? 'text/markdown' : 'text/plain';
            function downloadFallback() {
                try {
                    var blob = new Blob([body], { type: mime + ';charset=utf-8' });
                    var url = URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = url; a.download = fname; a.rel = 'noopener';
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    showToast('⬇ Zapisano ' + fname, 'success');
                } catch (e) { showToast('⚠️ Nie udało się zapisać', 'error'); }
            }
            if (format === 'share' && typeof navigator.share === 'function') {
                var shared = false;
                if (typeof File !== 'undefined' && navigator.canShare) {
                    try {
                        var file = new File([body], fname, { type: mime + ';charset=utf-8' });
                        if (navigator.canShare({ files: [file] })) {
                            navigator.share({ files: [file], title: 'Notatnik Smart Kalkulator' }).then(function() {
                                showToast('📤 Udostępniono', 'success');
                            }).catch(function(err) {
                                if (err && err.name !== 'AbortError') downloadFallback();
                            });
                            shared = true;
                        }
                    } catch (e) {}
                }
                if (!shared) {
                    navigator.share({ title: 'Notatnik', text: body }).then(function() {
                        showToast('📤 Udostępniono', 'success');
                    }).catch(function(err) {
                        if (err && err.name !== 'AbortError') downloadFallback();
                    });
                }
                return;
            }
            downloadFallback();
        }
        function npNewFromTemplate(tplId) { // T3-13
            var tpl = _NP_TEMPLATES.filter(function(t) { return t.id === tplId; })[0];
            if (!tpl) return;
            var prevId = _npCurrentId;
            _npCancelPersistTimer();
            _npStashToNote(prevId);
            var n = { id: _npNewId(), text: tpl.text, updatedAt: Date.now() };
            _npNotes.unshift(n);
            _npCurrentId = n.id;
            flushNotepadPersist(true);
            _npLoadCurrent();
            npRenderList();
            npCloseList();
            if (!document.body.classList.contains('notepad-open')) openNotepad();
            showToast('📝 ' + tpl.title, 'success');
        }
        function npInsertLearnExample() { // [EN] fill empty note or spawn new one from learn template
            var tpl = _NP_TEMPLATES.filter(function(t) { return t.id === 'przyklad-jednostki'; })[0];
            if (!tpl) return;
            _npStashCurrent();
            var cur = _npCurrentNote();
            if (cur && !String(cur.text || '').trim()) {
                cur.text = tpl.text;
                cur.updatedAt = Date.now();
                flushNotepadPersist(true);
                _npLoadCurrent();
                npCloseList();
                if (!document.body.classList.contains('notepad-open')) openNotepad();
                showToast('📎 Wstawiono przykład', 'success');
                return;
            }
            npNewFromTemplate('przyklad-jednostki');
        }
        function npRenderTemplates() {
            if (!npTemplateList) return;
            npTemplateList.replaceChildren();
            _NP_TEMPLATES.forEach(function(tpl) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'np-template-btn';
                btn.setAttribute('data-tpl', tpl.id);
                btn.setAttribute('role', 'listitem');
                btn.textContent = tpl.title;
                npTemplateList.appendChild(btn);
            });
        }
        var _NP_LABEL_RE = /^([^:]*\p{L}[^:]*):\s*(.+)$/u;
        // „@nazwa: wartość" → zmienna dzielona między wszystkimi notatkami (ale NIE w kalkulatorze).
        var _NP_GLOBAL_RE = /^@\s*([\p{L}][\p{L}\p{N}_]*)\s*:\s*(.+)$/u;
        var _NP_TOTAL_RE = /^(razem|suma|total)$/i;
        var _NP_SUBTOTAL_RE = /^(subtotal|półsuma|podsuma)$/i;
        var _NP_FMT = (typeof window !== 'undefined' && window.MATM0_NP_FMT) || null;
        var _NP_SECTION_RE = /^-{3,}\s*$/;
        var _NP_ALIGN_MAP = { left: '', center: '< ', right: '> ', justify: '| ' }; // T6-4 — prefixy wyrównania linii
        function _npParseAlign(line) { // T6-4 — strip prefix przed ewaluacją / renderem mirror
            var s = String(line || '');
            if (s.startsWith('> ')) return { align: 'right', body: s.slice(2) };
            if (s.startsWith('< ')) return { align: 'center', body: s.slice(2) };
            if (s.startsWith('| ')) return { align: 'justify', body: s.slice(2) };
            return { align: 'left', body: s };
        }
        function _npStripFormatMarkers(s) { // T6-5/6 — delegacja do rejestru formatów
            if (_NP_FMT && typeof _NP_FMT.stripMarkers === 'function') return _NP_FMT.stripMarkers(s);
            var t = String(s || '');
            t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
            t = t.replace(/__([^_]+)__/g, '$1');
            t = t.replace(/_([^_\n]+)_/g, '$1');
            return t;
        }
        function _npPrepareLine(raw) {
            var a = _npParseAlign(String(raw || '').trim());
            return { align: a.align, body: a.body, evalText: _npStripFormatMarkers(a.body) };
        }
        function _npFmtRegionVisible(r0, r1, ctx) { // T6-5 — Obsidian Live Preview: markery tylko przy kursorze/zaznaczeniu w regionie
            if (!ctx) return false;
            var selA = ctx.selStart, selB = ctx.selEnd, caret = ctx.caret;
            if (selA != null && selB != null && selA !== selB) {
                if (!(selB <= r0 || selA >= r1)) return true;
            }
            if (caret != null && caret >= r0 && caret <= r1) return true;
            return false;
        }
        function _npLineActive(ctx) { // [EN] kursor/zaznaczenie w bieżącej linii — prefix wyrównania też wtedy
            if (!ctx) return false;
            var ls = ctx.lineStart, le = ctx.lineEnd;
            if (ctx.caret != null && ctx.caret >= ls && ctx.caret <= le) return true;
            if (ctx.selStart != null && ctx.selEnd != null && ctx.selStart !== ctx.selEnd) {
                if (!(ctx.selEnd <= ls || ctx.selStart >= le)) return true;
            }
            return false;
        }
        function _npPushMirrorSpan(container, text, className, g0, g1, ctx) { // [EN] split selection highlight on mirror
            if (!text) return;
            var selA = ctx && ctx.selStart != null ? ctx.selStart : -1;
            var selB = ctx && ctx.selEnd != null ? ctx.selEnd : -1;
            if (selA === selB || selB <= g0 || selA >= g1) {
                var sp = document.createElement('span');
                if (className) sp.className = className;
                sp.textContent = text;
                container.appendChild(sp);
                return;
            }
            var chunks = [
                { a: g0, b: Math.min(g1, selA), hl: false },
                { a: Math.max(g0, selA), b: Math.min(g1, selB), hl: true },
                { a: Math.max(g0, selB), b: g1, hl: false }
            ];
            chunks.forEach(function(c) {
                if (c.a >= c.b) return;
                var sp = document.createElement('span');
                sp.className = (className || '') + (c.hl ? ' np-sel-hl' : '');
                sp.textContent = text.slice(c.a - g0, c.b - g0);
                container.appendChild(sp);
            });
        }
        function _npPushMirrorGhost(container, text, g0, g1, ctx, regionStart, regionEnd) {
            if (!text) return;
            if (!_npFmtRegionVisible(regionStart, regionEnd, ctx)) return; // [EN] brak DOM = brak miejsca (Obsidian)
            _npPushMirrorSpan(container, text, 'np-fmt-ghost', g0, g1, ctx);
        }
        function _npFillMirrorFormatted(container, text, ctx, globalOff) { // T6-5/6 — mirror via MATM0_NP_FMT
            if (_NP_FMT && typeof _NP_FMT.fillMirror === 'function') {
                _NP_FMT.fillMirror(container, text, ctx, globalOff, {
                    pushSpan: _npPushMirrorSpan,
                    pushGhost: _npPushMirrorGhost,
                    lineActive: _npLineActive
                });
                return;
            }
            if (globalOff == null) container.replaceChildren();
            if (!text) return;
            var base = globalOff || 0;
            var s = text, i = 0;
            function gPos() { return base + i; }
            function pushPlain(end) {
                if (end > i) _npPushMirrorSpan(container, s.slice(i, end), '', base + i, base + end, ctx);
                i = end;
            }
            while (i < s.length) {
                var prev = i;
                if (s.startsWith('**', i)) {
                    var eb = s.indexOf('**', i + 2);
                    if (eb > i) {
                        var reg0 = base + i, reg1 = base + eb + 2;
                        pushPlain(i);
                        _npPushMirrorGhost(container, '**', gPos(), gPos() + 2, ctx, reg0, reg1);
                        i += 2;
                        _npPushMirrorSpan(container, s.slice(i, eb), 'np-fmt-bold', base + i, base + eb, ctx);
                        i = eb;
                        _npPushMirrorGhost(container, '**', gPos(), gPos() + 2, ctx, reg0, reg1);
                        i += 2;
                        continue;
                    }
                    if (_npLineActive(ctx)) pushPlain(i + 2);
                    else i += 2;
                    continue;
                }
                if (s.startsWith('__', i)) {
                    var eu = s.indexOf('__', i + 2);
                    if (eu > i) {
                        var regU0 = base + i, regU1 = base + eu + 2;
                        pushPlain(i);
                        _npPushMirrorGhost(container, '__', gPos(), gPos() + 2, ctx, regU0, regU1);
                        i += 2;
                        _npPushMirrorSpan(container, s.slice(i, eu), 'np-fmt-underline', base + i, base + eu, ctx);
                        i = eu;
                        _npPushMirrorGhost(container, '__', gPos(), gPos() + 2, ctx, regU0, regU1);
                        i += 2;
                        continue;
                    }
                    if (_npLineActive(ctx)) pushPlain(i + 2);
                    else i += 2;
                    continue;
                }
                if (s[i] === '_' && s[i + 1] !== '_') {
                    var ei = s.indexOf('_', i + 1);
                    if (ei > i) {
                        var regI0 = base + i, regI1 = base + ei + 1;
                        pushPlain(i);
                        _npPushMirrorGhost(container, '_', gPos(), gPos() + 1, ctx, regI0, regI1);
                        i += 1;
                        _npPushMirrorSpan(container, s.slice(i, ei), 'np-fmt-italic', base + i, base + ei, ctx);
                        i = ei;
                        _npPushMirrorGhost(container, '_', gPos(), gPos() + 1, ctx, regI0, regI1);
                        i += 1;
                        continue;
                    }
                    if (_npLineActive(ctx)) pushPlain(i + 1);
                    else i += 1;
                    continue;
                }
                var next = s.length;
                var p1 = s.indexOf('**', i); if (p1 >= 0 && p1 < next) next = p1;
                var p2 = s.indexOf('__', i); if (p2 >= 0 && p2 < next) next = p2;
                var p3 = s.indexOf('_', i); if (p3 >= 0 && p3 < next) next = p3;
                pushPlain(next);
                if (i === prev) { i++; }
            }
        }
        function _npMirrorCtxForLine(lineIdx, lines) {
            var lineStart = 0, li = 0;
            for (; li < lineIdx && li < lines.length; li++) lineStart += lines[li].length + 1;
            var lineText = lines[lineIdx] != null ? lines[lineIdx] : '';
            var prep = _npPrepareLine(lineText);
            var bodyStart = lineText.indexOf(prep.body);
            if (bodyStart < 0) bodyStart = 0;
            var selStart = npBody && npBody.selectionStart != null ? npBody.selectionStart : 0;
            var selEnd = npBody && npBody.selectionEnd != null ? npBody.selectionEnd : selStart;
            return {
                selStart: selStart,
                selEnd: selEnd,
                caret: selStart,
                lineStart: lineStart,
                lineEnd: lineStart + lineText.length,
                bodyStart: lineStart + bodyStart,
                bodyText: prep.body,
                prefixText: lineText.slice(0, bodyStart),
                align: prep.align
            };
        }
        function _npFillMirrorLine(container, lineText, ctx) {
            container.replaceChildren();
            if (!lineText) { container.appendChild(document.createTextNode('\u00a0')); return; }
            var pfx = ctx.prefixText || '';
            if (pfx && _npLineActive(ctx)) {
                _npPushMirrorSpan(container, pfx, 'np-fmt-ghost', ctx.lineStart, ctx.lineStart + pfx.length, ctx);
            }
            if (ctx.bodyText.length) _npFillMirrorFormatted(container, ctx.bodyText, ctx, ctx.bodyStart);
            else container.appendChild(document.createTextNode('\u00a0'));
        }
        function _npRefreshMirrorFmt() { // [EN] tylko mirror — bez eval/gutter (szybkie zaznaczenie)
            if (!npBody || !npMirror || !document.body.classList.contains('notepad-open')) return;
            var lines = npBody.value.split('\n');
            var mirrorLines = npMirror.querySelectorAll('.np-mirror-line');
            lines.forEach(function(line, i) {
                var md = mirrorLines[i];
                if (!md) return;
                var mctx = _npMirrorCtxForLine(i, lines);
                md.className = 'np-mirror-line np-align-' + mctx.align;
                _npFillMirrorLine(md, line, mctx);
            });
        }
        var _NP_SUM_WORDS_RE = /\b(razem|suma|total|subtotal|półsuma|podsuma)\b/giu;
        // [EN] Sum keywords with optional manual unit — razem(zł), półsuma (cm)
        var _NP_SUM_UNIT_LINE_RE = /^(razem|suma|total|subtotal|półsuma|podsuma)\s*(?:\(\s*([\p{L}][\p{L}.]*)\s*\))?$/iu;
        var _NP_SUM_MANUAL_UNIT_RE = /\b(razem|suma|total|subtotal|półsuma|podsuma)\s*\(\s*([\p{L}][\p{L}.]*)\s*\)/giu;
        var _npListQuery = '';
        function _npReplaceSumWords(str, replacer) { // [EN] fresh regex — global lastIndex nie psuje kolejnych replace
            return String(str || '').replace(/\b(razem|suma|total|subtotal|półsuma|podsuma)(\s*(?:\(\s*[\p{L}][\p{L}.]*\s*\))?)/giu, replacer);
        }
        function _npLooksLikeMath(s) { // [EN] heuristic — math attempt vs prose header
            return /[\d+\-×÷*/%=()]/.test(s) || _NP_SUM_WORDS_RE.test(s);
        }
        function _npFmt(v) { return formatLocaleNumber(v, 10); }
        function _npEvalOpts() { // [EN] notepad-only eval flags from settings
            var opts = { keepWorkCurrency: true }; // [EN] @var z USD zostaje w USD, nie w domyślnym zł
            if ((STATE.settings && STATE.settings.notepadUnitMix) === 'first') opts.firstUnitWins = true;
            return opts;
        }
        function _npEval(expr) { return evalCalcExpression(expr, _npEvalOpts()); }
        function _npParseSumLine(exprPart) { // [EN] pure razem / razem(zł) / półsuma(cm)
            var m = String(exprPart || '').trim().match(_NP_SUM_UNIT_LINE_RE);
            if (!m) return null;
            return { keyword: m[1], manualUnit: m[2] ? m[2].trim() : null };
        }
        function _npNormalizeSumUnit(raw) { // [EN] usd→USD, zł→zł, warzyw→warzyw
            if (!raw) return null;
            var s = String(raw).trim();
            if (!s) return null;
            var k = s.toLowerCase();
            if (_currencyTokenMap()[k]) return _currencyDisplay(_currencyTokenMap()[k]);
            if (CALC_UNITS[k]) return CALC_UNIT_DISPLAY[k] || s;
            return s;
        }
        function _npInferSumUnit(units) { // [EN] inherit only when every item shares the same unit
            if (!units || !units.length) return null;
            var seen = null, hasNull = false, hasUnit = false;
            for (var i = 0; i < units.length; i++) {
                var u = units[i];
                if (!u) { hasNull = true; continue; }
                hasUnit = true;
                if (seen === null) seen = u;
                else if (seen !== u) return null;
            }
            if (hasNull && hasUnit) return null; // np. 100 zł + 50 (bez jednostki)
            return seen;
        }
        function _npManualSumUnitFromExpr(exprPart) { // [EN] razem(zł) embedded in longer expr
            var m = String(exprPart || '').match(/\b(razem|suma|total|subtotal|półsuma|podsuma)\s*\(\s*([\p{L}][\p{L}.]*)\s*\)/iu);
            return m && m[2] ? _npNormalizeSumUnit(m[2]) : null;
        }
        function _npSumUnitForLine(exprPart, itemUnits) { // [EN] manual (…) beats setting inherit
            var parsed = _npParseSumLine(exprPart);
            if (parsed && parsed.manualUnit) return _npNormalizeSumUnit(parsed.manualUnit);
            if (parsed && (STATE.settings && STATE.settings.notepadSumUnit) === 'inherit') return _npInferSumUnit(itemUnits);
            return null;
        }
        function _npFormatWithUnit(value, unit) {
            if (!unit) return formatLocaleNumber(value, 6);
            return formatLocaleNumber(value, 6) + '\u202f' + inflectDisplayUnit(value, unit);
        }
        function _npVarUnitLabel(u) { // [EN] known or auto/custom token for @substitution
            if (!u) return null;
            var known = _knownConstUnit(u);
            if (known) return known;
            var k = String(u).toLowerCase();
            if (CALC_UNIT_DISPLAY[k]) return CALC_UNIT_DISPLAY[k];
            return String(u).trim() || null;
        }
        function _npAutoRegisterSumUnits(text) { // [EN] razem(warzyw) → temp dimensionless unit
            var added = [];
            var re = _NP_SUM_MANUAL_UNIT_RE;
            var s = String(text || ''), m;
            re.lastIndex = 0;
            while ((m = re.exec(s)) !== null) {
                var w = m[2], k = w.toLowerCase();
                if (CALC_UNITS[k] || _npTokenKnown(w) || _currencyTokenMap()[k]) continue;
                CALC_UNITS[k] = { cat: 'custom:' + k, factor: 1, base: w, custom: true, dimensionless: true, _auto: true };
                CALC_UNIT_DISPLAY[k] = w;
                added.push(k);
            }
            if (added.length) rebuildUnitNamesRe();
            return added;
        }

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

        // ── Etykiety-zmienne: „Paliwo: 294" definiuje paliwo; odwołanie TYLKO przez @paliwo (bez @ = brak podst.).
        function _npVarName(label) {
            var s = String(label == null ? '' : label).trim();
            if (!/^[\p{L}][\p{L}\p{N}_]*$/u.test(s)) return null; // tylko pojedyncze słowo
            var k = s.toLowerCase();
            if (_NP_STOP[k]) return null; // spójniki — nie zmienne
            if (CALC_UNITS[k] || _currencyTokenMap()[k]) return null;
            if (_isDateUnit(s)) return null;
            if ((STATE.constants || []).some(function(c) { return c.name && c.name.toLowerCase() === k && c.kind !== 'unit'; })) return null;
            return k; // suma/półsuma/razem jako etykieta — OK (definicja, nie przypadkowe trafienie w tekście)
        }
        // Podstaw @nazwa → wartość (tylko jawny prefiks @ — unika kolizji z prozą i słowami kluczowymi).
        function _npSubVars(expr, vars, fmtFn, units) {
            var keys = Object.keys(vars);
            if (!keys.length) return expr;
            keys.sort(function(a, b) { return b.length - a.length; }); // dłuższe najpierw
            var out = expr;
            keys.forEach(function(k) {
                var esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                var re = new RegExp('@' + esc + '(?![\\p{L}\\p{N}_])', 'giu');
                var u = units && units[k] ? _npVarUnitLabel(units[k]) : null;
                out = out.replace(re, function() {
                    if (fmtFn) return fmtFn(vars[k]) + (u ? ' ' + u : '');
                    return '(' + vars[k] + (u ? ' ' + u : '') + ')';
                });
            });
            return out;
        }
        function _npSumKeywordVarName(exprPart, usedTotal) { // półsuma/razem/suma jako zmienna w panelu
            if (!usedTotal) return null;
            var parsed = _npParseSumLine(exprPart);
            if (parsed) return parsed.keyword.toLowerCase();
            var ep = String(exprPart || '').trim();
            if (!_NP_TOTAL_RE.test(ep) && !_NP_SUBTOTAL_RE.test(ep)) return null;
            if (!/^[\p{L}][\p{L}\p{N}_]*$/u.test(ep)) return null;
            return ep.toLowerCase();
        }
        function _npAssignVar(vars, varUnits, name, value, unit) {
            if (!name || typeof value !== 'number' || !isFinite(value)) return;
            vars[name] = value;
            varUnits[name] = unit || null;
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
                        var r = evalCalcExpression(sub, _npEvalOpts());
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
            var itemUnits = []; // jednostki pozycji — do dziedziczenia przy razem/suma
            var autoMode = (STATE.settings && STATE.settings.notepadAutoUnit) || 'safe';
            var vars = Object.assign({}, _npGlobals); // globalne (@nazwa) widoczne w KAŻDEJ notatce
            var varUnits = {};   // jednostka skojarzona ze zmienną (np. „Nocleg: 500 zł" → nocleg niesie „zł")
            var varNames = {};   // zbiór nazw zmiennych — wykluczamy je z auto-jednostek
            Object.keys(_npGlobals).forEach(function(k) { varNames[k] = 1; });
            lines.forEach(function(l) {
                var t = _npPrepareLine(l).evalText;
                var gmm = t.match(_NP_GLOBAL_RE);
                if (gmm) { varNames[gmm[1].toLowerCase()] = 1; return; }
                var mm = t.match(_NP_LABEL_RE);
                if (mm) { var vn = _npVarName(mm[1].trim()); if (vn) varNames[vn] = 1; }
            });
            var _autoKeys = _npAutoRegister(String(text == null ? '' : text), varNames);
            var _sumUnitKeys = _npAutoRegisterSumUnits(String(text == null ? '' : text));
            if (_sumUnitKeys.length) _autoKeys = _autoKeys.concat(_sumUnitKeys);
            try {
            for (var i = 0; i < lines.length; i++) {
                var info = { raw: lines[i], labelPart: '', exprPart: '', text: '', value: null, resolved: '', isItem: false, isTotal: false, isSubtotal: false, isSection: false, align: 'left' };
                var prep = _npPrepareLine(lines[i]);
                info.align = prep.align;
                var line = prep.evalText;
                if (!line) { out.push(info); continue; }
                if (_NP_SECTION_RE.test(line)) {
                    info.isSection = true;
                    info.exprPart = line;
                    runningSum = 0;
                    items = [];
                    itemUnits = [];
                    out.push(info);
                    continue;
                }
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
                var sumLine = _npParseSumLine(exprPart);
                var sumUnitHint = sumLine ? _npSumUnitForLine(exprPart, itemUnits) : null;
                var evalStr = _npSubVars(exprPart, vars, null, varUnits); // @nazwa PRZED słowami sumy (inaczej @suma → kolizja z „suma")
                evalStr = _npReplaceSumWords(evalStr, function(m, kw) {
                    usedTotal = true;
                    if (_NP_SUBTOTAL_RE.test(kw)) info.isSubtotal = true;
                    else if (_NP_TOTAL_RE.test(kw)) info.isTotal = true;
                    return '(' + runningSum + ')';
                });
                if (autoMode === 'full') evalStr = _npStripProse(evalStr); // zdejmij zbłąkane słowa
                var res = null;
                try { res = _npEval(evalStr); } catch (e) { res = null; }
                if (res && (res.value !== null || res.text != null || res.big)) {
                    var outUnit = sumLine ? (sumUnitHint || res.unit || null) : (res.unit || null);
                    info.text = outUnit && typeof res.value === 'number' && isFinite(res.value)
                        ? _npFormatWithUnit(res.value, outUnit) : formatCalcResult(res);
                    // Rozpisane równanie do dymka: czyste „razem" → składniki; „razem" w działaniu
                    // → podstawiona suma; zwykłe → samo działanie (bez etykiety).
                    if (sumLine || _NP_TOTAL_RE.test(exprPart) || _NP_SUBTOTAL_RE.test(exprPart)) {
                        info.resolved = items.length ? items.map(_npFmt).join(' + ') : exprPart;
                    } else {
                        var disp = _npSubVars(exprPart, vars, _npFmt, varUnits);
                        disp = _npReplaceSumWords(disp, function(m, kw, suffix) {
                            return _NP_SUBTOTAL_RE.test(kw) || _NP_TOTAL_RE.test(kw) ? _npFmt(runningSum) + (suffix || '') : m;
                        });
                        info.resolved = disp;
                    }
                    if (typeof res.value === 'number' && isFinite(res.value)) {
                        info.value = res.value;
                        // „razem" i definicje globalne (@nazwa) NIE są pozycjami do sumowania
                        if (usedTotal || gName) { /* isTotal/isSubtotal ustawione w replace słów sumy */ }
                        else { runningSum += res.value; items.push(res.value); itemUnits.push(res.unit || null); info.isItem = true; }
                        var assignUnit = sumLine ? outUnit : (res.unit || null);
                        if (gName) _npAssignVar(vars, varUnits, gName, res.value, assignUnit);
                        else {
                            var vn2 = lm ? _npVarName(lm[1].trim()) : null;
                            if (vn2) _npAssignVar(vars, varUnits, vn2, res.value, assignUnit);
                            var sk = _npSumKeywordVarName(exprPart, usedTotal);
                            if (sk && sk !== vn2) _npAssignVar(vars, varUnits, sk, res.value, assignUnit);
                        }
                    } else if (usedTotal && !info.isSubtotal) { info.isTotal = true; }
                }
                out.push(info);
            }
            } finally { _npAutoClear(_autoKeys); } // usuń tymczasowe auto-jednostki
            return out;
        }
        function _npListVars(text) { // [EN] vars in scope after full pass — panel T3-12
            var lines = String(text == null ? '' : text).split('\n');
            var globals = Object.assign({}, _npGlobals);
            var locals = {};
            var localUnits = {};
            var varNames = {};
            Object.keys(globals).forEach(function(k) { varNames[k] = 1; });
            lines.forEach(function(l) {
                var t = _npPrepareLine(l).evalText;
                var gmm = t.match(_NP_GLOBAL_RE);
                if (gmm) { varNames[gmm[1].toLowerCase()] = 1; return; }
                var mm = t.match(_NP_LABEL_RE);
                if (mm) { var vn = _npVarName(mm[1].trim()); if (vn) varNames[vn] = 1; }
            });
            var autoMode = (STATE.settings && STATE.settings.notepadAutoUnit) || 'safe';
            var _autoKeys = _npAutoRegister(String(text == null ? '' : text), varNames);
            var _sumUnitKeys = _npAutoRegisterSumUnits(String(text == null ? '' : text));
            if (_sumUnitKeys.length) _autoKeys = _autoKeys.concat(_sumUnitKeys);
            try {
                var vars = Object.assign({}, globals);
                var varUnits = {};
                var runningSum = 0;
                var itemUnits = [];
                for (var i = 0; i < lines.length; i++) {
                    var prepL = _npPrepareLine(lines[i]);
                    var line = prepL.evalText;
                    if (!line) continue;
                    if (_NP_SECTION_RE.test(line)) { runningSum = 0; itemUnits = []; continue; }
                    var exprPart = line, gName = null;
                    var gm = line.match(_NP_GLOBAL_RE);
                    if (gm) {
                        gName = gm[1].toLowerCase();
                        if (_npTokenKnown(gName)) gName = null;
                        exprPart = gm[2].trim();
                    }
                    var lm = gm ? null : line.match(_NP_LABEL_RE);
                    if (lm) exprPart = lm[2].trim();
                    var usedTotal = false;
                    var sumLine = _npParseSumLine(exprPart);
                    var sumUnitHint = sumLine ? _npSumUnitForLine(exprPart, itemUnits) : null;
                    var evalStr = _npSubVars(exprPart, vars, null, varUnits);
                    evalStr = _npReplaceSumWords(evalStr, function() { usedTotal = true; return '(' + runningSum + ')'; });
                    if (autoMode === 'full') evalStr = _npStripProse(evalStr);
                    try {
                        var res = _npEval(evalStr);
                        if (res && typeof res.value === 'number' && isFinite(res.value)) {
                            var assignUnit = sumLine ? (sumUnitHint || res.unit || null) : (res.unit || null);
                            if (!usedTotal && !gName) { runningSum += res.value; itemUnits.push(res.unit || null); }
                            if (gName) {
                                globals[gName] = res.value; vars[gName] = res.value; varUnits[gName] = assignUnit;
                            } else {
                                var vn2 = lm ? _npVarName(lm[1].trim()) : null;
                                if (vn2) { locals[vn2] = res.value; localUnits[vn2] = assignUnit; vars[vn2] = res.value; varUnits[vn2] = assignUnit; }
                                var sk = _npSumKeywordVarName(exprPart, usedTotal);
                                if (sk && sk !== vn2) { locals[sk] = res.value; localUnits[sk] = assignUnit; vars[sk] = res.value; varUnits[sk] = assignUnit; }
                            }
                        }
                    } catch (e) {}
                }
            } finally { _npAutoClear(_autoKeys); }
            return { globals: globals, locals: locals, localUnits: localUnits, globalUnits: {} };
        }
        function _npLineKind(info, lineTrim) {
            if (info.isSection) return 'section';
            if (info.isSubtotal) return 'subtotal';
            if (info.isTotal) return 'total';
            if (info.text) return 'calc';
            if (!lineTrim) return 'empty';
            if (info.exprPart && _npLooksLikeMath(info.exprPart)) return 'warn';
            return 'header';
        }

        // ── Edytor: jedno textarea (zaznaczanie wielu linii) + gutter z wynikami per linia [[project_kalkulator_notepad_planning]]
        function setupNpEditor() {
            if (!npEditor || npBody) return;
            npEditor.replaceChildren();
            var inner = document.createElement('div');
            inner.className = 'np-editor-inner';
            npEditorInner = inner;
            npMirror = document.createElement('div');
            npMirror.className = 'np-mirror';
            npMirror.setAttribute('aria-hidden', 'true');
            npFoldLayer = document.createElement('div');
            npFoldLayer.className = 'np-fold-layer';
            npFoldLayer.setAttribute('aria-hidden', 'true');
            npWrapLayer = document.createElement('div');
            npWrapLayer.className = 'np-wrap-layer';
            npWrapLayer.setAttribute('aria-hidden', 'true');
            npBody = document.createElement('textarea');
            npBody.className = 'np-text'; // [EN] not .np-body — that class is the modal shell in index.html
            npBody.setAttribute('aria-label', 'Notatnik');
            npBody.setAttribute('enterkeyhint', 'enter');
            npBody.setAttribute('placeholder', 'Pisz… np. „Nocleg: 3 * 180", potem „razem"   (Enter = nowa linia)');
            npBody.spellcheck = false;
            npBody.autocapitalize = 'off';
            npBody.autocomplete = 'off';
            npBody.rows = 1;
            npGutter = document.createElement('div');
            npGutter.className = 'np-gutter';
            inner.appendChild(npMirror);
            inner.appendChild(npWrapLayer);
            inner.appendChild(npFoldLayer);
            inner.appendChild(npBody);
            inner.appendChild(npGutter);
            npEditor.appendChild(inner);
            npBody.addEventListener('input', function() { _npCommit(); });
            npBody.addEventListener('select', function() { _npRefreshMirrorFmt(); });
            npBody.addEventListener('keyup', function() { _npRefreshMirrorFmt(); });
            npBody.addEventListener('mouseup', function() { _npRefreshMirrorFmt(); });
            document.addEventListener('selectionchange', function() {
                if (document.activeElement === npBody) _npRefreshMirrorFmt();
            });
            npEditor.addEventListener('scroll', function() { _npSyncEditorScroll(); npHideTip(); });
            npBody.addEventListener('focus', function() {
                if (npEditor) npEditor.classList.add('np-editing');
                _npSyncKbBar();
                requestAnimationFrame(function() { try { npBody.scrollIntoView({ block: 'nearest' }); } catch (_) {} });
            });
            npBody.addEventListener('blur', function() {
                if (npEditor) npEditor.classList.remove('np-editing');
                _npSyncKbBar();
            });
            npFoldLayer.addEventListener('click', function(e) {
                var row = e.target.closest('[data-np-line]');
                if (row) _npFocusLine(parseInt(row.getAttribute('data-np-line'), 10));
            });
            window.addEventListener('resize', function() {
                if (npBody && document.body.classList.contains('notepad-open')) npRecompute();
            });
            _npBindGutterPanelSwipe();
            _npSyncGutterHidden();
            _npSyncFontSize(true);
            _npBindPanelCtx(npEditor);
            if (npGutter) _npBindPanelCtx(npGutter);
            _npBindTextCtx(npBody);
        }
        function _npSyncGutterHidden() {
            var hidden = !!(STATE.settings && STATE.settings.notepadGutterHidden);
            if (npEditorInner) npEditorInner.classList.toggle('gutter-hidden', hidden);
            if (npEditor) npEditor.classList.toggle('gutter-hidden', hidden);
            _npSetGutterDragOffset(0);
            _npSetGutterDragPreview(false);
        }
        function _npSetGutterDragPreview(on) {
            if (!npEditorInner) return;
            npEditorInner.classList.toggle('gutter-drag-preview', !!on);
        }
        function _npSetGutterDragOffset(px) {
            if (!npEditorInner) return;
            var v = Math.round(Number(px) || 0);
            npEditorInner.style.setProperty('--np-gutter-drag-x', v + 'px');
        }
        function _npMeasureGutterWidth() {
            if (!npGutter) return 96;
            var w = Math.ceil(npGutter.getBoundingClientRect().width || npGutter.offsetWidth || 0);
            if (w > 24) return w;
            return 96;
        }
        function _npClampFontSize(v) {
            v = parseFloat(v);
            if (!isFinite(v)) return 1;
            return Math.round(Math.max(0.85, Math.min(1.25, v)) * 20) / 20; // [EN] step 0.05
        }
        function _npSyncFontSize(skipRecompute) {
            var fs = _npClampFontSize((STATE.settings && STATE.settings.notepadFontSize) || 1);
            STATE.settings.notepadFontSize = fs;
            if (npEditor) npEditor.style.setProperty('--np-font-size', fs + 'rem');
            if (settingNotepadFontSize) settingNotepadFontSize.value = String(fs);
            if (settingNotepadFontVal) settingNotepadFontVal.textContent = Math.round(fs * 100) + '%';
            if (!skipRecompute && npBody && document.body.classList.contains('notepad-open')) npRecompute();
        }
        function _npLineIndexAt(pos) {
            if (!npBody) return 0;
            var val = npBody.value, line = 0;
            for (var i = 0; i < pos && i < val.length; i++) if (val[i] === '\n') line++;
            return line;
        }
        function _npLineBounds(lineIdx) {
            if (!npBody) return { start: 0, end: 0, text: '' };
            var parts = npBody.value.split('\n');
            var start = 0;
            for (var i = 0; i < lineIdx && i < parts.length; i++) start += parts[i].length + 1;
            var text = parts[lineIdx] != null ? parts[lineIdx] : '';
            return { start: start, end: start + text.length, text: text };
        }
        function _npReplaceRange(start, end, insert) {
            if (!npBody) return;
            var val = npBody.value;
            npBody.value = val.slice(0, start) + insert + val.slice(end);
            _npCommit();
        }
        function _npWrapSelection(open, close) { // T6-5 — owijanie zaznaczenia markerami (toggle)
            if (!npBody) return;
            var start = npBody.selectionStart, end = npBody.selectionEnd;
            if (start === end) return;
            var val = npBody.value, sel = val.slice(start, end);
            var oLen = open.length, cLen = close.length;
            if (sel.startsWith(open) && sel.endsWith(close)) {
                _npReplaceRange(start, end, sel.slice(oLen, sel.length - cLen));
                try { npBody.setSelectionRange(start, end - oLen - cLen); } catch (_) {}
            } else if (start >= oLen && end + cLen <= val.length
                && val.slice(start - oLen, start) === open
                && val.slice(end, end + cLen) === close) { // [EN] zaznaczenie w środku **tekst** — zdejmij otoczkę
                _npReplaceRange(start - oLen, end + cLen, sel);
                try { npBody.setSelectionRange(start - oLen, end - oLen); } catch (_) {}
            } else {
                _npReplaceRange(start, end, open + sel + close);
                try { npBody.setSelectionRange(start + oLen, end + oLen); } catch (_) {}
            }
            npBody.focus();
        }
        function _npSetLineAlign(mode) { // T6-4 — prefix bieżącej linii (tap ten sam = wyłącz)
            if (!npBody) return;
            var lineIdx = _npLineIndexAt(npBody.selectionStart);
            var b = _npLineBounds(lineIdx);
            var prep = _npParseAlign(b.text);
            var body = prep.body;
            var newLine = (prep.align === mode) ? body : ((_NP_ALIGN_MAP[mode] || '') + body);
            _npReplaceRange(b.start, b.end, newLine);
            var caret = b.start + newLine.length;
            try { npBody.setSelectionRange(caret, caret); } catch (_) {}
            npBody.focus();
        }
        function _npFontStep(delta) {
            STATE.settings.notepadFontSize = _npClampFontSize((STATE.settings.notepadFontSize || 1) + delta);
            saveSettings();
            _npSyncFontSize();
            hapticTap(10);
        }
        function _npFontResetKb() {
            STATE.settings.notepadFontSize = 1;
            saveSettings();
            _npSyncFontSize();
            hapticTap(12);
        }
        function _npRunEditorAction(act) {
            if (!act) return;
            var wrap = _NP_FMT && _NP_FMT.wrapByAct(act);
            if (wrap) { _npWrapSelection(wrap.open, wrap.close); return; }
            if (act === 'align-left') _npSetLineAlign('left');
            else if (act === 'align-center') _npSetLineAlign('center');
            else if (act === 'align-right') _npSetLineAlign('right');
            else if (act === 'align-justify') _npSetLineAlign('justify');
            else if (act === 'font-down') _npFontStep(-0.05);
            else if (act === 'font-up') _npFontStep(0.05);
            else if (act === 'font-reset') _npFontResetKb();
        }
        var npKbBar = null;
        function _npEnsureKbBar() { // T6-KB — pasek nad klawiaturą (tablety)
            if (npKbBar) return;
            npKbBar = document.createElement('div');
            npKbBar.className = 'np-kb-bar';
            npKbBar.setAttribute('role', 'toolbar');
            npKbBar.setAttribute('aria-label', 'Formatowanie notatnika');
            npKbBar.hidden = true;
            var specs = (_NP_FMT && typeof _NP_FMT.kbBarSpecs === 'function' ? _NP_FMT.kbBarSpecs() : (
                (_NP_FMT && typeof _NP_FMT.kbInlineItems === 'function' ? _NP_FMT.kbInlineItems() : [
                    ['bold', 'B', 'Pogrubienie'], ['italic', 'I', 'Kursywa'], ['underline', 'U', 'Podkreślenie']
                ]).concat([
                    ['sep'],
                    ['align-left', '◀', 'Wyrównaj do lewej'], ['align-center', '≡', 'Wyśrodkuj'], ['align-right', '▶', 'Wyrównaj do prawej'], ['align-justify', '⊞', 'Wyjustuj'],
                    ['sep'],
                    ['font-down', 'A−', 'Mniejsza czcionka'], ['font-up', 'A+', 'Większa czcionka'], ['font-reset', '↺', 'Domyślna czcionka']
                ])
            ));
            specs.forEach(function(sp) {
                if (sp[0] === 'sep') {
                    var sep = document.createElement('span');
                    sep.className = 'np-kb-sep';
                    sep.setAttribute('aria-hidden', 'true');
                    npKbBar.appendChild(sep);
                    return;
                }
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'np-kb-btn';
                btn.setAttribute('data-np-act', sp[0]);
                btn.textContent = sp[1];
                btn.title = sp[2];
                btn.setAttribute('aria-label', sp[2]);
                btn.addEventListener('pointerdown', function(e) { e.preventDefault(); }); // [EN] nie zabieraj fokusu z textarea
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    _npRunEditorAction(sp[0]);
                });
                npKbBar.appendChild(btn);
            });
            document.body.appendChild(npKbBar);
        }
        function _npSyncKbBar() {
            _npEnsureKbBar();
            if (!npKbBar || !document.body.classList.contains('notepad-open')) {
                if (npKbBar) npKbBar.hidden = true;
                return;
            }
            var vv = window.visualViewport;
            var wide = vv ? vv.width >= 600 : window.innerWidth >= 600;
            var focused = document.activeElement === npBody;
            var kbOpen = vv && vv.height < window.innerHeight * 0.75;
            var show = wide && focused && kbOpen;
            npKbBar.hidden = !show;
            if (!show) return;
            var bottom = window.innerHeight - vv.offsetTop - vv.height;
            npKbBar.style.bottom = Math.max(0, bottom) + 'px';
            npKbBar.style.left = vv.offsetLeft + 'px';
            npKbBar.style.width = vv.width + 'px';
        }
        var npCtxMenu = null;
        function _npHideCtxMenu() {
            if (npCtxMenu) npCtxMenu.hidden = true;
        }
        function _npIsCoarsePointer() { // [EN] touch — long-press + double-tap; natywne menu obok naszego
            return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
        }
        var _npCaretMirror = null;
        function _npEnsureCaretMirror() { // [EN] off-screen clone for textarea caret/selection coords
            if (_npCaretMirror) return _npCaretMirror;
            _npCaretMirror = document.createElement('div');
            _npCaretMirror.setAttribute('aria-hidden', 'true');
            _npCaretMirror.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre-wrap;word-wrap:break-word;overflow:hidden;';
            document.body.appendChild(_npCaretMirror);
            return _npCaretMirror;
        }
        function _npSyncCaretMirrorStyle(ta, div) {
            var cs = getComputedStyle(ta);
            ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'textTransform',
                'wordSpacing', 'textIndent', 'boxSizing', 'borderLeftWidth', 'borderRightWidth',
                'borderTopWidth', 'borderBottomWidth', 'paddingLeft', 'paddingRight', 'paddingTop',
                'paddingBottom', 'lineHeight'].forEach(function(p) { div.style[p] = cs[p]; });
            div.style.width = ta.clientWidth + 'px';
        }
        function _npCaretClientRect(ta, index) {
            if (!ta) return null;
            var div = _npEnsureCaretMirror();
            _npSyncCaretMirrorStyle(ta, div);
            var val = String(ta.value || '');
            var i = Math.max(0, Math.min(index == null ? 0 : index, val.length));
            div.textContent = val.substring(0, i);
            var span = document.createElement('span');
            span.textContent = val.substring(i, i + 1) || '\u200b';
            div.appendChild(span);
            var taRect = ta.getBoundingClientRect();
            return {
                left: taRect.left + span.offsetLeft - ta.scrollLeft,
                top: taRect.top + span.offsetTop - ta.scrollTop,
                right: taRect.left + span.offsetLeft + span.offsetWidth - ta.scrollLeft,
                bottom: taRect.top + span.offsetTop + span.offsetHeight - ta.scrollTop
            };
        }
        function _npSelectionClientRect(ta) {
            if (!ta || ta.selectionStart == null || ta.selectionEnd == null) return null;
            var a = Math.min(ta.selectionStart, ta.selectionEnd);
            var b = Math.max(ta.selectionStart, ta.selectionEnd);
            if (a === b) return null;
            var r0 = _npCaretClientRect(ta, a);
            var r1 = _npCaretClientRect(ta, b);
            if (!r0 || !r1) return null;
            return {
                left: Math.min(r0.left, r1.left),
                top: Math.min(r0.top, r1.top),
                right: Math.max(r0.right, r1.right),
                bottom: Math.max(r0.bottom, r1.bottom)
            };
        }
        function _npCtxPointForSelection(fallbackX, fallbackY) {
            var rect = _npSelectionClientRect(npBody);
            if (!rect) return { x: fallbackX, y: fallbackY - 48 };
            var menuW = 160, menuH = 44;
            if (_npIsCoarsePointer()) {
                // [EN] iOS/Android callout is OS-owned (usually above selection) — park B/I/U aside
                var x = rect.right + 12;
                var y = rect.top + Math.max(0, (rect.bottom - rect.top - menuH) / 2);
                if (x + menuW > window.innerWidth - 8) x = Math.max(8, rect.left - menuW - 12);
                if (y + menuH > window.innerHeight - 8) y = Math.max(8, rect.bottom + 12);
                return { x: x, y: y };
            }
            return { x: rect.left, y: rect.top - 48 };
        }
        function _npCtxPointForPanel(fallbackX, fallbackY) {
            if (_npIsCoarsePointer()) return { x: fallbackX, y: fallbackY + 12 };
            return { x: fallbackX, y: fallbackY - 48 };
        }
        function _npBindLongPress(el, onHold, opts) {
            if (!el || el._npLongPressBound) return;
            el._npLongPressBound = true;
            opts = opts || {};
            var holdMs = opts.holdMs != null ? opts.holdMs : 520;
            var movePx = opts.movePx != null ? opts.movePx : 10;
            var timer = null, sx = 0, sy = 0;
            function clearT() { if (timer) clearTimeout(timer); timer = null; }
            el.addEventListener('pointerdown', function(e) {
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                if (typeof opts.allow === 'function' && !opts.allow(e)) return;
                clearT();
                sx = e.clientX; sy = e.clientY;
                timer = setTimeout(function() {
                    timer = null;
                    if (typeof opts.validate === 'function' && !opts.validate()) return;
                    hapticTap(18);
                    onHold(sx, sy);
                }, holdMs);
            });
            el.addEventListener('pointermove', function(e) {
                if (!timer) return;
                if (Math.abs(e.clientX - sx) > movePx || Math.abs(e.clientY - sy) > movePx) clearT();
            });
            ['pointerup', 'pointercancel', 'pointerleave'].forEach(function(ev) {
                el.addEventListener(ev, clearT);
            });
        }
        function _npBindDoubleTap(el, onTap, opts) {
            if (!el || el._npDblTapBound) return;
            el._npDblTapBound = true;
            opts = opts || {};
            var windowMs = opts.windowMs != null ? opts.windowMs : 380;
            var movePx = opts.movePx != null ? opts.movePx : 20;
            var lastTap = 0, lastX = 0, lastY = 0, lastKey = '';
            var downX = 0, downY = 0;
            function tapKey() {
                if (opts.selectionKey && npBody) return String(npBody.selectionStart) + ':' + String(npBody.selectionEnd);
                return '';
            }
            el.addEventListener('pointerdown', function(e) {
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                downX = e.clientX; downY = e.clientY;
            });
            el.addEventListener('pointerup', function(e) {
                if (!_npIsCoarsePointer()) return;
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                if (Math.abs(e.clientX - downX) > movePx || Math.abs(e.clientY - downY) > movePx) return;
                if (typeof opts.allow === 'function' && !opts.allow(e)) return;
                var now = Date.now();
                var key = tapKey();
                if (now - lastTap < windowMs && key === lastKey) {
                    lastTap = 0; lastKey = '';
                    hapticTap(18);
                    onTap(e);
                    return;
                }
                lastTap = now;
                lastX = e.clientX; lastY = e.clientY;
                lastKey = key;
            });
        }
        function _npEnsureCtxMenu() { // T6-CTX — long-press + double-tap (mobile) / long-press + PPM (desktop)
            if (npCtxMenu) return;
            npCtxMenu = document.createElement('div');
            npCtxMenu.className = 'np-ctx-menu';
            npCtxMenu.hidden = true;
            npCtxMenu.setAttribute('role', 'menu');
            document.body.appendChild(npCtxMenu);
            document.addEventListener('pointerdown', function(e) {
                if (!npCtxMenu || npCtxMenu.hidden) return;
                if (!npCtxMenu.contains(e.target)) _npHideCtxMenu();
            });
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') _npHideCtxMenu();
            });
        }
        function _npShowCtxMenu(x, y, acts) {
            _npEnsureCtxMenu();
            if (!npCtxMenu || !acts.length) return;
            npCtxMenu.replaceChildren();
            acts.forEach(function(sp) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'np-ctx-btn';
                btn.setAttribute('role', 'menuitem');
                btn.setAttribute('data-np-act', sp[0]);
                btn.textContent = sp[1];
                btn.title = sp[2] || sp[1];
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    _npRunEditorAction(sp[0]);
                    _npHideCtxMenu();
                });
                npCtxMenu.appendChild(btn);
            });
            npCtxMenu.hidden = false;
            npCtxMenu.style.left = '0';
            npCtxMenu.style.top = '0';
            var rect = npCtxMenu.getBoundingClientRect();
            var vw = window.innerWidth, vh = window.innerHeight;
            var left = Math.min(Math.max(8, x), vw - rect.width - 8);
            var top = Math.min(Math.max(8, y), vh - rect.height - 8);
            npCtxMenu.style.left = left + 'px';
            npCtxMenu.style.top = top + 'px';
        }
        function _npCtxActsForPanel() {
            if (_NP_FMT && typeof _NP_FMT.panelMenuItems === 'function') return _NP_FMT.panelMenuItems();
            return [
                ['align-left', '◀', 'Lewo'], ['align-center', '≡', 'Środek'], ['align-right', '▶', 'Prawo'], ['align-justify', '⊞', 'Justuj'],
                ['font-down', 'A−', ''], ['font-up', 'A+', ''], ['font-reset', '↺', 'Reset czcionki']
            ];
        }
        function _npSelectionIsSingleLine() { // [EN] same line index for caret/selection ends — Faza B align in fmt menu
            if (!npBody) return false;
            var start = npBody.selectionStart, end = npBody.selectionEnd;
            if (start == null || end == null) return false;
            return _npLineIndexAt(start) === _npLineIndexAt(end);
        }
        function _npCtxActsForSelection() { // T6-CTX — formatowanie zaznaczenia (rejestr MATM0_NP_FMT)
            if (_NP_FMT && typeof _NP_FMT.selectionMenuItems === 'function') {
                return _NP_FMT.selectionMenuItems({ singleLine: _npSelectionIsSingleLine() });
            }
            return [
                ['bold', 'B', 'Pogrubienie'], ['italic', 'I', 'Kursywa'], ['underline', 'U', 'Podkreślenie']
            ];
        }
        function _npHasTextSelection() {
            if (!npBody) return false;
            var start = npBody.selectionStart, end = npBody.selectionEnd;
            return start != null && end != null && start !== end;
        }
        function _npBindTextCtx(el) { // T6-CTX — mobile: long-press + double-tap; desktop: long-press / PPM
            if (!el || el._npTextCtxBound) return;
            el._npTextCtxBound = true;
            function showFmtMenu(fx, fy) {
                if (!_npHasTextSelection()) return;
                var pt = _npCtxPointForSelection(fx, fy);
                _npShowCtxMenu(pt.x, pt.y, _npCtxActsForSelection());
            }
            _npBindDoubleTap(el, function(e) { showFmtMenu(e.clientX, e.clientY); }, {
                selectionKey: true,
                allow: function() { return _npHasTextSelection(); }
            });
            _npBindLongPress(el, showFmtMenu, {
                holdMs: 560,
                validate: _npHasTextSelection
            });
            el.addEventListener('contextmenu', function(e) {
                if (_npIsCoarsePointer()) return; // [EN] pozycja natywnego menu = OS; nie blokuj na mobile
                if (!_npHasTextSelection()) return;
                e.preventDefault();
                var pt = _npCtxPointForSelection(e.clientX, e.clientY);
                _npShowCtxMenu(pt.x, pt.y, _npCtxActsForSelection());
            });
        }
        function _npBindPanelCtx(el) { // T6-CTX — long-press + double-tap (mobile) / long-press + PPM (desktop)
            if (!el || el._npPanelCtxBound) return;
            el._npPanelCtxBound = true;
            function isTextTarget(node) {
                return !!(node && node.closest && node.closest('.np-text, textarea.np-text'));
            }
            function panelAllowed(e) {
                if (isTextTarget(e.target)) return false;
                if (e.target.closest('.np-res') || e.target.closest('.np-kb-bar')) return false;
                return true;
            }
            function showPanelMenu(fx, fy) {
                var pt = _npCtxPointForPanel(fx, fy);
                _npShowCtxMenu(pt.x, pt.y, _npCtxActsForPanel());
            }
            _npBindDoubleTap(el, function(e) {
                if (!panelAllowed(e)) return;
                showPanelMenu(e.clientX, e.clientY);
            }, { allow: panelAllowed });
            _npBindLongPress(el, showPanelMenu, {
                holdMs: 500,
                allow: panelAllowed
            });
            el.addEventListener('contextmenu', function(e) {
                if (_npIsCoarsePointer()) return;
                if (isTextTarget(e.target) || e.target.closest('.np-res')) return;
                e.preventDefault();
                var pt = _npCtxPointForPanel(e.clientX, e.clientY);
                _npShowCtxMenu(pt.x, pt.y, _npCtxActsForPanel());
            });
        }
        var _npGutterPanelSwipeBound = false;
        function _npBindGutterPanelSwipe() {
            if (!npGutter || !npEditor || _npGutterPanelSwipeBound) return;
            _npGutterPanelSwipeBound = true;
            var _NP_GUTTER_HIDE = 44;
            var _NP_GUTTER_EDGE = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ? 34 : 28;
            var gStartX = 0, gStartY = 0, gDrag = false, gDecided = false, gHoriz = false;
            npGutter.addEventListener('pointerdown', function(e) {
                if (STATE.settings.notepadGutterHidden) return;
                gStartX = e.clientX; gStartY = e.clientY;
                gDrag = true; gDecided = false; gHoriz = false;
            });
            npGutter.addEventListener('pointermove', function(e) {
                if (!gDrag || STATE.settings.notepadGutterHidden) return;
                var dx = e.clientX - gStartX, dy = e.clientY - gStartY;
                if (!gDecided) {
                    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                    gDecided = true;
                    gHoriz = Math.abs(dx) > Math.abs(dy);
                    if (!gHoriz || dx < 0) { gDrag = false; return; } // [EN] only right swipe hides panel
                }
                if (!gHoriz) return;
                _npSetGutterDragOffset(Math.max(0, dx));
                if (dx >= _NP_GUTTER_HIDE) {
                    gDrag = false;
                    STATE.settings.notepadGutterHidden = true;
                    saveSettings();
                    _npSyncGutterHidden();
                    hapticTap(20);
                }
            });
            ['pointerup', 'pointercancel', 'pointerleave'].forEach(function(ev) {
                npGutter.addEventListener(ev, function() {
                    gDrag = false;
                    _npSetGutterDragOffset(0);
                });
            });
            var sStartX = 0, sDrag = false, sDecided = false, sHoriz = false;
            var sWidth = 96;
            npEditor.addEventListener('pointerdown', function(e) {
                if (!STATE.settings.notepadGutterHidden) return;
                if (e.target.closest('.np-res')) return;
                var rect = npEditor.getBoundingClientRect();
                if (e.clientX < rect.right - _NP_GUTTER_EDGE) return;
                sStartX = e.clientX;
                sWidth = _npMeasureGutterWidth();
                if (npEditorInner) npEditorInner.style.setProperty('--np-gutter-preview-width', sWidth + 'px');
                _npSetGutterDragPreview(true);
                _npSetGutterDragOffset(sWidth);
                sDrag = true; sDecided = false; sHoriz = false;
            });
            npEditor.addEventListener('pointermove', function(e) {
                if (!sDrag || !STATE.settings.notepadGutterHidden) return;
                var dx = e.clientX - sStartX;
                if (!sDecided) {
                    if (Math.abs(dx) < 8) return;
                    sDecided = true;
                    sHoriz = true;
                    if (dx > 0) { sDrag = false; return; } // [EN] only left swipe reveals panel
                }
                if (!sHoriz) return;
                _npSetGutterDragOffset(Math.max(0, sWidth + dx));
                if (dx <= -_NP_GUTTER_HIDE) {
                    sDrag = false;
                    STATE.settings.notepadGutterHidden = false;
                    saveSettings();
                    _npSyncGutterHidden();
                    hapticTap(15);
                }
            });
            ['pointerup', 'pointercancel'].forEach(function(ev) {
                npEditor.addEventListener(ev, function() {
                    sDrag = false;
                    _npSetGutterDragPreview(false);
                    _npSetGutterDragOffset(0);
                });
            });
        }
        function _npSerialize() {
            return npBody ? npBody.value : '';
        }
        function _npFocusLine(idx) {
            if (!npBody || !isFinite(idx)) return;
            var parts = npBody.value.split('\n');
            var pos = 0;
            for (var i = 0; i < idx && i < parts.length; i++) pos += parts[i].length + 1;
            npBody.focus();
            try { npBody.setSelectionRange(pos, pos); } catch (e) {}
        }
        function _npSyncEditorScroll() {
            if (!npEditor) return;
            var st = npEditor.scrollTop;
            if (npMirror) npMirror.scrollTop = st;
            if (npWrapLayer) npWrapLayer.scrollTop = st;
            if (npFoldLayer) npFoldLayer.scrollTop = st;
            if (npGutter) npGutter.scrollTop = st;
        }
        function _npMakeResChip(info, kind) {
            var res = document.createElement('button');
            res.type = 'button';
            res.className = 'np-res';
            res.tabIndex = -1;
            res.setAttribute('data-hint', '');
            res.setAttribute('data-hint-from', 'data-eq');
            res.setAttribute('data-hint-anchor', 'element');
            res.setAttribute('data-hint-touch', 'on');
            res.setAttribute('data-hint-tap', '');
            res.setAttribute('data-hint-fade', '');
            res.setAttribute('data-hint-class', 'np-eq');
            if (kind === 'warn') {
                res.textContent = '—';
                res.classList.add('np-res-warn');
            } else if (kind === 'calc' || kind === 'total' || kind === 'subtotal') {
                if (_needsTightMarkup(info.text)) _setResultMarkup(res, info.text);
                else res.textContent = info.text;
                res.dataset.eq = info.resolved || info.exprPart || '';
                res.setAttribute('aria-label', 'Wynik ' + info.text + (res.dataset.eq ? ', z: ' + res.dataset.eq : ''));
            }
            return res;
        }
        function _npLineHeightPx() {
            if (!npMirror) return 32;
            var cs = getComputedStyle(npMirror);
            var lh = parseFloat(cs.lineHeight);
            if (!isFinite(lh) || lh <= 0) lh = (parseFloat(cs.fontSize) || 16) * 2;
            return lh;
        }
        // [EN] Soft-wrap only — Enter = new logical line without a wrap bar.
        function _npIsSoftWrapped(el, lineH) {
            return (el && (el.offsetHeight || 0) > lineH * 1.35);
        }
        function _npRenderEditorChrome(lines, infos) {
            if (!npBody || !npMirror || !npGutter || !npFoldLayer || !npWrapLayer) return;
            var folded = !!(STATE.settings && STATE.settings.notepadFold);
            npMirror.replaceChildren();
            npWrapLayer.replaceChildren();
            npGutter.replaceChildren();
            npFoldLayer.replaceChildren();
            if (!lines.length) lines = [''];
            lines.forEach(function(line, i) {
                var mctx = _npMirrorCtxForLine(i, lines);
                var md = document.createElement('div');
                md.className = 'np-mirror-line np-align-' + mctx.align;
                _npFillMirrorLine(md, line, mctx);
                npMirror.appendChild(md);
            });
            var lineH = _npLineHeightPx();
            var mirrorLines = npMirror.querySelectorAll('.np-mirror-line');
            mirrorLines.forEach(function(md, i) {
                var h = md.offsetHeight || 32;
                var wrapped = _npIsSoftWrapped(md, lineH);
                var wrapSlot = document.createElement('div');
                wrapSlot.className = 'np-wrap-line' + (wrapped ? ' np-wrapped' : '');
                wrapSlot.style.height = h + 'px';
                wrapSlot.style.minHeight = h + 'px';
                if (wrapped) {
                    var bar = document.createElement('span');
                    bar.className = 'np-wrap-bar';
                    bar.setAttribute('aria-hidden', 'true');
                    wrapSlot.appendChild(bar);
                }
                npWrapLayer.appendChild(wrapSlot);
                var info = infos[i] || {};
                var lineTrim = String((info.raw != null ? info.raw : lines[i]) || '').trim();
                var kind = _npLineKind(info, lineTrim);
                var gWrap = document.createElement('div');
                gWrap.className = 'np-gutter-wrap' + (wrapped ? ' np-wrapped' : '');
                gWrap.style.height = h + 'px';
                gWrap.style.minHeight = h + 'px';
                var gRow = document.createElement('div');
                gRow.className = 'np-gutter-row np-' + kind + (kind === 'calc' || kind === 'total' || kind === 'subtotal' ? ' np-has' : '') + (kind === 'warn' ? ' np-warn' : '');
                var hasChip = kind === 'calc' || kind === 'total' || kind === 'subtotal' || kind === 'warn';
                if (hasChip) gRow.appendChild(_npMakeResChip(info, kind));
                gWrap.appendChild(gRow);
                npGutter.appendChild(gWrap);
                if (folded) {
                    var fRow = document.createElement('button');
                    fRow.type = 'button';
                    fRow.className = 'np-fold-row';
                    fRow.setAttribute('data-np-line', String(i));
                    fRow.style.height = h + 'px';
                    fRow.style.minHeight = h + 'px';
                    var labelTxt = (info.labelPart && info.labelPart.replace(/:\s*$/, '').trim()) || lineTrim;
                    if (kind === 'section') labelTxt = '— — —';
                    fRow.textContent = labelTxt || '\u00a0';
                    npFoldLayer.appendChild(fRow);
                }
            });
            npBody.style.height = 'auto';
            npBody.style.height = Math.max(npMirror.scrollHeight, 48) + 'px';
            _npSyncEditorScroll();
        }
        function npRecompute() {
            if (!npBody) return;
            var text = npBody.value;
            var lines = text.split('\n');
            var infos = evalNotepadLines(text);
            _npRenderEditorChrome(lines, infos);
            if (npEditor) npEditor.classList.toggle('np-fold', !!(STATE.settings && STATE.settings.notepadFold));
            _npSyncGutterHidden();
            npBindHints();
            npRenderVarsPanel();
        }
        function npBuildRows(text) {
            setupNpEditor();
            if (!npBody) return;
            npBody.value = String(text == null ? '' : text);
            npRecompute();
        }
        function npRenderVarsPanel() {
            if (!npVarsPanel) return;
            var data = _npListVars(_npSerialize());
            var gKeys = Object.keys(data.globals || {}).sort();
            var lKeys = Object.keys(data.locals || {}).sort();
            var hasAny = gKeys.length || lKeys.length;
            npVarsPanel.hidden = !hasAny;
            if (!hasAny) return;
            function fillChips(container, keys, map, units) {
                if (!container) return;
                container.replaceChildren();
                keys.forEach(function(k) {
                    var btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'np-var-chip';
                    btn.setAttribute('data-var', k);
                    var val = map[k];
                    var u = units && units[k] ? (' ' + units[k]) : '';
                    btn.appendChild(document.createTextNode('@' + k + ' '));
                    var sm = document.createElement('small');
                    sm.textContent = _npFmt(val) + u;
                    btn.appendChild(sm);
                    btn.addEventListener('click', function() { _npInsertVarName(k); });
                    container.appendChild(btn);
                });
            }
            if (npVarsGlobal) npVarsGlobal.hidden = !gKeys.length;
            if (npVarsLocal) npVarsLocal.hidden = !lKeys.length;
            fillChips(npVarsGlobalChips, gKeys, data.globals, {});
            fillChips(npVarsLocalChips, lKeys, data.locals, data.localUnits);
        }
        function _npInsertVarName(name) {
            if (!npBody) return;
            var token = '@' + String(name || '').replace(/^@+/, '');
            var start = npBody.selectionStart != null ? npBody.selectionStart : npBody.value.length;
            var end = npBody.selectionEnd != null ? npBody.selectionEnd : start;
            var v = npBody.value;
            npBody.value = v.slice(0, start) + token + v.slice(end);
            var pos = start + token.length;
            try { npBody.focus(); npBody.setSelectionRange(pos, pos); } catch (e) {}
            _npCommit();
        }
        // ── Wiele notatek ─────────────────────────────────────────────
        function _npNewId() { return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
        function _npNoteById(id) {
            if (!id) return null;
            return _npNotes.filter(function(x) { return x.id === id; })[0] || null;
        }
        function _npCurrentNote() {
            var n = _npNoteById(_npCurrentId);
            if (!n) { n = _npNotes[0]; _npCurrentId = n ? n.id : null; }
            return n || null;
        }
        // Auto-tytuł = pierwsza niepusta linia (jak Apple Notes); fallback „Pusta notatka".
        function _npTitle(note) {
            if (!note) return 'Notatka';
            if (note.title && String(note.title).trim()) {
                var ct = String(note.title).trim();
                return ct.length > 38 ? ct.slice(0, 38) + '…' : ct;
            }
            var first = String(note.text || '').split('\n').map(function(s) { return s.trim(); }).filter(Boolean)[0];
            if (!first) return 'Pusta notatka';
            return first.length > 38 ? first.slice(0, 38) + '…' : first;
        }
        function _npTitleFull(note) {
            if (!note) return 'Notatka';
            if (note.title && String(note.title).trim()) return String(note.title).trim();
            return _npTitle(note);
        }
        function saveNotepad() {
            try { localStorage.setItem(STORAGE_KEYS.notepads, JSON.stringify({ notes: _npNotes, currentId: _npCurrentId })); }
            catch (e) { showToast('⚠️ Brak miejsca na notatnik', 'error'); }
        }
        var _npPersistTimer = null;
        function _npCancelPersistTimer() {
            if (_npPersistTimer) { clearTimeout(_npPersistTimer); _npPersistTimer = null; }
        }
        function scheduleNotepadPersist() { // [EN] Debounce localStorage — npRecompute stays sync on each keystroke
            _npCancelPersistTimer();
            _npPersistTimer = setTimeout(function() {
                _npPersistTimer = null;
                _npStashCurrent();
                saveGlobals();
                saveNotepad();
            }, 450);
        }
        function flushNotepadPersist(skipStash) { // [EN] skipStash=true after _npCurrentId change — editor still shows previous note
            _npCancelPersistTimer();
            if (!skipStash) _npStashCurrent();
            saveGlobals();
            saveNotepad();
        }
        function _npStashToNote(noteId) { // [EN] explicit id — safe before _npCurrentId changes
            var n = noteId ? _npNoteById(noteId) : _npCurrentNote();
            if (!n || !npEditor) return;
            if (!document.body.classList.contains('notepad-open')) return; // [EN] closed overlay — keep stored text (Node tests + append)
            n.text = _npSerialize(); n.updatedAt = Date.now();
        }
        function _npStashCurrent() { _npStashToNote(_npCurrentId); } // zapisz treść z edytora do bieżącej notatki (bez przerysowania)
        function _npCommit() { _npStashCurrent(); _npRebuildGlobals(); npRecompute(); npRenderTitle(); scheduleNotepadPersist(); }
        function npRenderTitle() {
            var note = _npCurrentNote();
            var t = _npTitleFull(note);
            if (npTitleBtn) { npTitleBtn.textContent = t; npTitleBtn.hidden = false; }
            if (npTitleInput && document.activeElement !== npTitleInput) {
                npTitleInput.value = note && note.title ? note.title : t;
                npTitleInput.hidden = true;
            }
        }
        function _npBeginTitleEdit() {
            var note = _npCurrentNote();
            if (!npTitleInput || !npTitleBtn) return;
            npTitleBtn.hidden = true;
            npTitleInput.hidden = false;
            npTitleInput.value = (note && note.title) ? note.title : _npTitleFull(note);
            npTitleInput.focus();
            npTitleInput.select();
        }
        function _npFinishTitleEdit(save) {
            if (!npTitleInput || !npTitleBtn) return;
            var note = _npCurrentNote();
            if (save && note) {
                var v = String(npTitleInput.value || '').trim();
                note.title = v || undefined;
                if (!note.title) delete note.title;
                note.updatedAt = Date.now();
                flushNotepadPersist();
                npRenderList();
            }
            npTitleInput.hidden = true;
            npTitleBtn.hidden = false;
            npRenderTitle();
        }
        function _npLoadCurrent() {
            _npRebuildGlobals();   // świeże globalne (@nazwa z innych notatek) jako seed
            var n = _npCurrentNote();
            npBuildRows(n ? n.text : '');
            npRenderTitle();
        }
        function _npReloadFromStorage() { // [EN] other tab saved notepads — sync model + editor if open
            try {
                var raw = localStorage.getItem(STORAGE_KEYS.notepads);
                if (!raw) return;
                var obj = JSON.parse(raw);
                if (!obj || !Array.isArray(obj.notes)) return;
                var seen = {};
                _npNotes = obj.notes.filter(function(n) {
                    if (!n || typeof n.id !== 'string' || seen[n.id]) return false;
                    seen[n.id] = 1;
                    return true;
                });
                if (!_npNotes.length) return;
                var nextId = _npNoteById(obj.currentId) ? obj.currentId : _npNotes[0].id;
                var idChanged = nextId !== _npCurrentId;
                _npCurrentId = nextId;
                if (document.body.classList.contains('notepad-open')) _npLoadCurrent();
                else if (idChanged) npRenderTitle();
                if (npListPanel && npListPanel.classList.contains('open')) npRenderList();
            } catch (e) {}
        }
        function npSwitchNote(id) {
            if (id === _npCurrentId) { npCloseList(); return; }
            var prevId = _npCurrentId;
            _npCancelPersistTimer();
            _npStashToNote(prevId);         // [EN] zawsze do poprzedniej — nie polegaj na _npCurrentId
            _npCurrentId = id;
            flushNotepadPersist(true);      // [EN] nie stashuj — textarea ma jeszcze treść poprzedniej notatki
            _npLoadCurrent();
            npRenderList();
            npCloseList();
            var f = npBody;
            if (f) { f.focus(); var L = f.value.length; try { f.setSelectionRange(L, L); } catch (_) {} }
        }
        function npNewNote() {
            var prevId = _npCurrentId;
            _npCancelPersistTimer();
            _npStashToNote(prevId);
            var n = { id: _npNewId(), text: '', updatedAt: Date.now() };
            _npNotes.unshift(n);
            _npCurrentId = n.id;
            flushNotepadPersist(true);
            _npLoadCurrent();
            npRenderList();
            npCloseList();
            if (npBody) npBody.focus();
        }
        function npDeleteNote(id) {
            var wasCurrent = id === _npCurrentId;
            _npNotes = _npNotes.filter(function(x) { return x.id !== id; });
            if (!_npNotes.length) _npNotes = [{ id: _npNewId(), text: '', updatedAt: Date.now() }];
            if (wasCurrent) {
                _npCurrentId = _npNotes[0].id;
                flushNotepadPersist(true);
                _npLoadCurrent();
            } else {
                flushNotepadPersist();
            }
            npRenderList();
        }

        // Panel listy notatek (slajd nad edytorem). Swipe w lewo → potwierdzenie (jak historia).
        function _npFmtWhen(ts) {
            if (!ts) return '';
            var d = new Date(ts);
            var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
            return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        }
        var _NP_NOTE_SWIPE_OPEN = -84;
        var _npNoteConfirmTimer = null;
        function _npNoteSetX(content, x, animate) {
            content.style.transition = animate ? '' : 'none';
            content.style.transform = x ? ('translateX(' + x + 'px)') : '';
        }
        function _npNoteSwipeClose(li, content) {
            li.classList.remove('swiped', 'swiping', 'confirming');
            if (_npNoteConfirmTimer) { clearTimeout(_npNoteConfirmTimer); _npNoteConfirmTimer = null; }
            _npNoteSetX(content, 0, true);
        }
        function _npNoteSwipeOpen(li, content, markFresh) {
            li.classList.remove('swiping');
            li.classList.add('swiped');
            _npNoteSetX(content, _NP_NOTE_SWIPE_OPEN, true);
            if (markFresh) li._swipeJustOpened = Date.now();
        }
        function _npNoteArmConfirmAutoClose(li, content) {
            if (_npNoteConfirmTimer) clearTimeout(_npNoteConfirmTimer);
            _npNoteConfirmTimer = setTimeout(function() { _npNoteSwipeClose(li, content); }, 5000);
        }
        function _bindNpNoteSwipe(li, content, note) {
            var delBtn = li.querySelector('.np-note-delete');
            var startX = 0, startY = 0, dragging = false, decided = false, horizontal = false, curX = 0;
            function _openConfirmFromRelease(e) {
                if (!delBtn || li.classList.contains('confirming')) return;
                var rect = delBtn.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    li.classList.add('confirming');
                    hapticTap(15);
                    _npNoteArmConfirmAutoClose(li, content);
                }
            }
            if (delBtn) {
                delBtn.addEventListener('pointerdown', function(e) {
                    e.preventDefault(); e.stopPropagation();
                    if (!li.classList.contains('swiped') && !li.classList.contains('swiping')) return;
                    li.classList.add('confirming');
                    hapticTap(15);
                    _npNoteArmConfirmAutoClose(li, content);
                });
            }
            var noBtn = li.querySelector('.np-note-confirm .history-confirm-btn.no');
            var yesBtn = li.querySelector('.np-note-confirm .history-confirm-btn.yes');
            if (noBtn) noBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                _npNoteSwipeClose(li, content);
            });
            if (yesBtn) yesBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                hapticTap(30);
                npDeleteNote(note.id);
                showToast('🗑️ Usunięto notatkę', '');
            });
            content.addEventListener('click', function() {
                if (li._swipeHandled) return;
                if (li._swipeJustOpened && (Date.now() - li._swipeJustOpened) < 400) return;
                if (li.classList.contains('swiped') || li.classList.contains('confirming')) {
                    _npNoteSwipeClose(li, content);
                    return;
                }
                npSwitchNote(note.id);
            });
            content.addEventListener('pointerdown', function(e) {
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                startX = e.clientX; startY = e.clientY;
                dragging = true; decided = false; horizontal = false;
                curX = li.classList.contains('swiped') ? _NP_NOTE_SWIPE_OPEN : 0;
            });
            content.addEventListener('pointermove', function(e) {
                if (!dragging) return;
                var dx = e.clientX - startX, dy = e.clientY - startY;
                if (!decided) {
                    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                    decided = true;
                    horizontal = Math.abs(dx) > Math.abs(dy);
                    if (horizontal) {
                        try { content.setPointerCapture(e.pointerId); } catch (_) {}
                        li.classList.remove('confirming');
                        li.classList.add('swiping');
                    }
                }
                if (!horizontal) return;
                e.preventDefault();
                var base = li.classList.contains('swiped') ? _NP_NOTE_SWIPE_OPEN : 0;
                var x = base + dx;
                if (x > 0) x = 0;
                if (x < _NP_NOTE_SWIPE_OPEN - 24) x = _NP_NOTE_SWIPE_OPEN - 24;
                curX = x;
                _npNoteSetX(content, x, false);
            });
            function settle(e) {
                if (!dragging) return;
                dragging = false;
                if (!horizontal) return;
                li._swipeHandled = true;
                setTimeout(function() { li._swipeHandled = false; }, 60);
                if (curX <= _NP_NOTE_SWIPE_OPEN / 2) {
                    _npNoteSwipeOpen(li, content, true);
                    if (e) _openConfirmFromRelease(e);
                } else _npNoteSwipeClose(li, content);
            }
            content.addEventListener('pointerup', settle);
            content.addEventListener('pointercancel', function(e) {
                if (!dragging) return;
                dragging = false;
                if (horizontal) {
                    if (curX <= _NP_NOTE_SWIPE_OPEN / 2) {
                        _npNoteSwipeOpen(li, content, true);
                        if (e) _openConfirmFromRelease(e);
                    } else _npNoteSwipeClose(li, content);
                }
            });
        }
        function npRenderList() {
            if (!npListUl) return;
            npListUl.replaceChildren();
            var q = (_npListQuery || '').trim().toLowerCase();
            var sorted = _npNotes.slice().sort(function(a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
            if (q) {
                sorted = sorted.filter(function(note) {
                    var hay = (_npTitleFull(note) + '\n' + String(note.text || '')).toLowerCase();
                    return hay.indexOf(q) !== -1;
                });
            }
            if (!sorted.length && q) {
                var empty = document.createElement('li');
                empty.className = 'np-list-empty';
                empty.textContent = 'Brak wyników dla „' + _npListQuery + '"';
                npListUl.appendChild(empty);
                return;
            }
            sorted.forEach(function(note) {
                var li = document.createElement('li');
                li.className = 'np-note-item' + (note.id === _npCurrentId ? ' is-current' : '');
                li.setAttribute('data-id', note.id);
                var delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.className = 'np-note-delete';
                delBtn.textContent = 'Usuń';
                delBtn.title = 'Usuń notatkę';
                delBtn.setAttribute('aria-label', 'Usuń notatkę');
                delBtn.tabIndex = -1;
                var content = document.createElement('div');
                content.className = 'np-note-content';
                var t = document.createElement('span');
                t.className = 'np-note-title';
                t.textContent = _npTitle(note);
                var when = document.createElement('span');
                when.className = 'np-note-when';
                when.textContent = _npFmtWhen(note.updatedAt);
                content.appendChild(t);
                content.appendChild(when);
                var confirm = document.createElement('div');
                confirm.className = 'np-note-confirm';
                var confirmMsg = document.createElement('span');
                confirmMsg.className = 'np-note-confirm-msg';
                confirmMsg.textContent = 'Usunąć notatkę?';
                var noBtn = document.createElement('button');
                noBtn.type = 'button';
                noBtn.className = 'history-confirm-btn no';
                noBtn.textContent = 'Anuluj';
                noBtn.setAttribute('aria-label', 'Anuluj usuwanie notatki');
                var yesBtn = document.createElement('button');
                yesBtn.type = 'button';
                yesBtn.className = 'history-confirm-btn yes';
                yesBtn.textContent = 'Usuń';
                yesBtn.setAttribute('aria-label', 'Potwierdź usunięcie notatki');
                confirm.appendChild(confirmMsg);
                confirm.appendChild(noBtn);
                confirm.appendChild(yesBtn);
                li.appendChild(delBtn);
                li.appendChild(content);
                li.appendChild(confirm);
                _bindNpNoteSwipe(li, content, note);
                npListUl.appendChild(li);
            });
        }
        function npOpenList() {
            if (!npListPanel) return;
            _npStashCurrent(); flushNotepadPersist();
            npRenderTemplates();
            npRenderList();
            npListPanel.classList.add('open');
            npListPanel.setAttribute('aria-hidden', 'false');
            if ('inert' in npListPanel) npListPanel.inert = false;
            if (npListBtn) { // [EN] open list button
                npListBtn.classList.add('is-open');
                npListBtn.setAttribute('aria-expanded', 'true');
            }
        }
        function npCloseList(preferFocus) {
            if (!npListPanel) return;
            var active = document.activeElement;
            if (active && npListPanel.contains(active)) {
                var target = preferFocus || npListBtn || notepadClose;
                if (target && typeof target.focus === 'function') target.focus();
            }
            npListPanel.classList.remove('open');
            npListPanel.setAttribute('aria-hidden', 'true');
            if ('inert' in npListPanel) npListPanel.inert = true;
            if (npListBtn) { // [EN] open list button
                npListBtn.classList.remove('is-open');
                npListBtn.setAttribute('aria-expanded', 'false');
            }
        }
        function npToggleList() { if (npListPanel && npListPanel.classList.contains('open')) npCloseList(); else npOpenList(); }

        // Fold (zwijanie wyrażeń do wyników) jako przełącznik on/off W NOTATNIKU — bez wychodzenia
        // do ⚙️. Działa od razu (npRecompute przerysowuje), zsynchronizowany z ustawieniem.
        // Odbij stan fold na segmentowym przełączniku w ⚙️ (Wył/Wł).
        function syncFoldSetting(on) {
            if (!settingNotepadFold) return;
            var btns = settingNotepadFold.querySelectorAll('.settings-seg-btn');
            btns.forEach(function(b) {
                var sel = (b.dataset.val === 'on') === !!on;
                b.classList.toggle('active', sel);
                b.setAttribute('aria-pressed', sel ? 'true' : 'false');
            });
        }
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
            syncFoldSetting(STATE.settings.notepadFold); // sync ⚙️
            updateFoldBtn();
            npRecompute(); // natychmiast, bez zamykania notatnika
        }

        // Dymek z rozpisanym równaniem obsługuje silnik cursor-hint (js/cursor-hint.js):
        // hover (desktop, kotwica nad chipem), tap = zerknięcie, przytrzymanie = trzymaj.
        // Chipy .np-res same noszą atrybuty data-hint-* (patrz _npMakeResChip). Wiążemy je LOKALNIE
        // po każdym przeliczeniu wierszy (idempotentnie — silnik pomija już-podpięte), zamiast
        // globalnego MutationObserver na body — kalkulator ma za dużo zmian DOM przy pisaniu.
        var _npHintCtl = (window.MateuszCursorHint && window.MateuszCursorHint.createCursorHintController)
            ? window.MateuszCursorHint.createCursorHintController({
                cursorHint: document.getElementById('cursorHint'),
                prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
                getFallbackHint: function() { return ''; }
            })
            : null;
        function npBindHints() { if (_npHintCtl && npEditor) _npHintCtl.setupCursorHint(npEditor.querySelectorAll('.np-res')); }
        if (_npHintCtl && calcApprox) _npHintCtl.setupCursorHint([calcApprox]); // dymek dokładnej wartości przy ≈
        function npHideTip() { if (_npHintCtl && _npHintCtl.hideHint) _npHintCtl.hideHint(); }
        // Klawiatura ekranowa na telefonie zasłaniałaby dolne wiersze (nakładka jest fixed/inset:0,
        // więc rośnie pod klawiaturę). Kurczymy nakładkę do OBSZARU WIDOCZNEGO (visualViewport) —
        // tak jak natywny notatnik: pisana linia zawsze nad klawiaturą. Brak API = no-op (desktop OK).
        var _npVVBound = false;
        function _npSyncViewport() {
            if (!notepadModal || !document.body.classList.contains('notepad-open')) return;
            var vv = window.visualViewport;
            if (!vv) return;
            notepadModal.style.top = vv.offsetTop + 'px';
            notepadModal.style.height = vv.height + 'px';
            notepadModal.style.bottom = 'auto';     // bez tego top+bottom:0 zignorowałyby height
            _npSyncKbBar();
        }
        function _npClearViewport() {
            if (!notepadModal) return;
            notepadModal.style.top = '';
            notepadModal.style.height = '';
            notepadModal.style.bottom = '';
        }
        function _npBindViewport() {
            var vv = window.visualViewport;
            if (!vv || _npVVBound) return;
            vv.addEventListener('resize', _npSyncViewport);
            vv.addEventListener('scroll', _npSyncViewport);
            _npVVBound = true;
            _npSyncViewport();
        }
        function _npUnbindViewport() {
            var vv = window.visualViewport;
            if (vv && _npVVBound) {
                vv.removeEventListener('resize', _npSyncViewport);
                vv.removeEventListener('scroll', _npSyncViewport);
            }
            _npVVBound = false;
            _npClearViewport();
            if (npKbBar) npKbBar.hidden = true;
            _npHideCtxMenu();
        }
        function openNotepad() {
            if (!notepadModal) return;
            document.body.classList.add('notepad-open');
            notepadModal.setAttribute('aria-hidden', 'false');
            if (npBackdrop) npBackdrop.setAttribute('aria-hidden', 'false');
            npCloseList();
            updateFoldBtn();
            _npLoadCurrent();
            _npSyncGutterHidden();
            npHideTip();
            _npBindViewport();   // kurcz nakładkę do obszaru nad klawiaturą (telefon)
            // Fokus odroczony (po animacji). Guard: jeśli zamknięto w międzyczasie — nie fokusuj
            // ukrytego pola (inaczej aria-hidden + fokus = ostrzeżenie a11y).
            setTimeout(function() {
                if (!document.body.classList.contains('notepad-open')) return;
                if (npBody) { npBody.focus(); var L = npBody.value.length; try { npBody.setSelectionRange(L, L); } catch (_) {} }
            }, 60);
        }
        function closeNotepad() {
            // KOLEJNOŚĆ KLUCZOWA dla a11y: najpierw fokus POZA modal (do przycisku otwierającego),
            // dopiero potem aria-hidden — inaczej ostrzeżenie „aria-hidden na elemencie z fokusem".
            npHideTip();
            _npUnbindViewport();   // przywróć pełną wysokość nakładki
            _npStashCurrent(); flushNotepadPersist();   // zapisz bieżącą treść przy wyjściu
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
        if (npListPanel && 'inert' in npListPanel) npListPanel.inert = true; // [EN] a11y — no focus trap when panel closed
        if (npFoldBtn) npFoldBtn.addEventListener('click', npToggleFold);
        if (npTitleBtn) npTitleBtn.addEventListener('click', _npBeginTitleEdit);
        if (npTitleInput) {
            npTitleInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') { e.preventDefault(); _npFinishTitleEdit(true); }
                if (e.key === 'Escape') { e.preventDefault(); _npFinishTitleEdit(false); }
            });
            npTitleInput.addEventListener('blur', function() { _npFinishTitleEdit(true); });
        }
        if (npListSearch) {
            npListSearch.addEventListener('input', function() {
                _npListQuery = npListSearch.value;
                npRenderList();
            });
        }
        if (npVarsToggle) {
            npVarsToggle.addEventListener('click', function() {
                var open = npVarsToggle.getAttribute('aria-expanded') !== 'false';
                npVarsToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
            });
        }
        if (npNewBtn) npNewBtn.addEventListener('click', npNewNote);
        if (npLearnExampleBtn) npLearnExampleBtn.addEventListener('click', npInsertLearnExample);
        window.addEventListener('storage', function(e) { // [EN] sync notepads when another tab writes localStorage
            if (!e || e.storageArea !== localStorage || e.key !== STORAGE_KEYS.notepads) return;
            _npReloadFromStorage();
        });
        if (npTemplateList) {
            npTemplateList.addEventListener('click', function(e) {
                var btn = e.target.closest('.np-template-btn');
                if (btn) npNewFromTemplate(btn.getAttribute('data-tpl'));
            });
        }
        function setupNpExportMenu() { // T3-14
            if (!npExportBtn || !npExportMenu) return;
            function closeExp() { npExportMenu.hidden = true; npExportBtn.setAttribute('aria-expanded', 'false'); }
            npExportBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (npExportMenu.hidden) { npExportMenu.hidden = false; npExportBtn.setAttribute('aria-expanded', 'true'); }
                else closeExp();
            });
            npExportMenu.querySelectorAll('[data-export]').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    npExport(btn.getAttribute('data-export'));
                    closeExp();
                });
            });
            document.addEventListener('click', function(e) {
                if (npExportMenu.hidden) return;
                if (npExportMenu.contains(e.target) || e.target === npExportBtn) return;
                closeExp();
            });
            document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeExp(); });
        }
        setupNpExportMenu();
        function bindLongPressNotepad(el, getLine) { // T1-2 — Warsztat: przytrzymaj → do notatnika
            if (!el) return;
            var timer = null, fired = false;
            function clearTimer() { if (timer) clearTimeout(timer); timer = null; }
            el.addEventListener('pointerdown', function() {
                fired = false;
                clearTimer();
                timer = setTimeout(function() {
                    var line = getLine ? getLine() : el.textContent.trim();
                    if (!line) return;
                    fired = true;
                    el.dataset.longPressed = 'true';
                    hapticTap(35);
                    appendToNotepad(line, { open: true, focus: true });
                }, 650);
            });
            ['pointerup', 'pointercancel', 'pointerleave'].forEach(function(ev) {
                el.addEventListener(ev, clearTimer);
            });
            el.addEventListener('click', function(e) {
                if (!fired && el.dataset.longPressed !== 'true') return;
                if (fired) { e.preventDefault(); e.stopPropagation(); }
                setTimeout(function() { delete el.dataset.longPressed; fired = false; }, 0);
            }, true);
        }
        if (npEditor) {
            npEditor.addEventListener('click', function(e) {
                if (e.target.closest('.np-res')) { e.stopPropagation(); return; }
                npHideTip();
            });
        }
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && document.body.classList.contains('notepad-open')) {
                if (npListPanel && npListPanel.classList.contains('open')) { npCloseList(); return; } // najpierw lista
                var ch = document.getElementById('cursorHint');
                if (ch && ch.classList.contains('is-visible')) { npHideTip(); return; }  // potem dymek
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

        if (settingUnitProfile) {
            settingUnitProfile.addEventListener('change', function() {
                var pid = settingUnitProfile.value;
                if (pid === 'custom') {
                    STATE.settings.unitProfile = 'custom';
                    saveSettings();
                    return;
                }
                applyUnitProfile(pid);
                buildUnitOptions();
                if (typeof liveEval === 'function') liveEval();
            });
        }

        settingUnitSelects.forEach(function(sel) {
            sel.addEventListener('change', function() {
                var cat = sel.getAttribute('data-unit-cat');
                if (!STATE.settings.defaultUnits) STATE.settings.defaultUnits = {};
                STATE.settings.defaultUnits[cat] = sel.value; // '' = bazowa (auto)
                STATE.settings.unitProfile = 'custom'; // T2-10 — ręczna zmiana → profil własny
                syncUnitProfileSelect();
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

        function _bindAssistSetting(el, key, onChange) {
            if (!el) return;
            el.addEventListener('change', function () {
                STATE.settings[key] = el.type === 'checkbox' ? el.checked : el.value;
                saveSettings();
                if (typeof onChange === 'function') onChange();
            });
        }
        _bindAssistSetting(settingStandardLiveHint, 'standardLiveHint', function () { updateCalcLiveHint(); });
        _bindAssistSetting(settingStandardAutocomplete, 'standardAutocomplete');
        _bindAssistSetting(settingSuggestOnEmpty, 'suggestOnEmpty', function () { liveEval(); });
        _bindAssistSetting(settingCurrencyCompactSymbols, 'currencyCompactSymbols', function () { liveEval(); });

        if (settingNotepadFold) {
            settingNotepadFold.addEventListener('click', function(e) {
                var btn = e.target.closest('.settings-seg-btn');
                if (!btn) return;
                STATE.settings.notepadFold = btn.dataset.val === 'on';
                saveSettings();
                syncFoldSetting(STATE.settings.notepadFold);
                updateFoldBtn(); // zsynchronizuj też przycisk ⊟/⊞ w nagłówku notatnika
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
        if (settingNotepadUnitMix) {
            settingNotepadUnitMix.addEventListener('change', function() {
                STATE.settings.notepadUnitMix = settingNotepadUnitMix.value === 'first' ? 'first' : 'strict';
                saveSettings();
                if (document.body.classList.contains('notepad-open')) npRecompute();
            });
        }
        if (settingNotepadSumUnit) {
            settingNotepadSumUnit.addEventListener('change', function() {
                STATE.settings.notepadSumUnit = settingNotepadSumUnit.value === 'inherit' ? 'inherit' : 'off';
                saveSettings();
                if (document.body.classList.contains('notepad-open')) npRecompute();
            });
        }
        if (settingNotepadFontSize) {
            settingNotepadFontSize.addEventListener('input', function() {
                STATE.settings.notepadFontSize = _npClampFontSize(settingNotepadFontSize.value);
                saveSettings();
                _npSyncFontSize();
            });
        }
        if (settingNotepadFontReset) {
            settingNotepadFontReset.addEventListener('click', function() {
                STATE.settings.notepadFontSize = 1;
                saveSettings();
                _npSyncFontSize();
                hapticTap(12);
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
            if (isStandaloneMode() || !installAppBtn) return; // [EN] let browser banner show if no custom UI
            e.preventDefault(); // [EN] custom install via header button — Chrome may log dev info until prompt()
            deferredPrompt = e;
            updateInstallButton();
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
                list.push({ syntax: expandTokens(syntax), description: description || '', command: command ? expandHelpCommand(command) : null });
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

        /* T4-16 — autocomplete Standard (historia + znane komendy + ściąga) */
        var _stdAcSuggestions = null;
        function buildStdACSuggestions() {
            var seen = {}, list = [];
            function add(syntax, description) {
                var key = String(syntax).toLowerCase().replace(/\s+/g, '');
                if (!key || seen[key]) return;
                seen[key] = true;
                list.push({ syntax: syntax, description: description || '' });
            }
            var HINT = window.MATM0_HINT;
            if (HINT && HINT.KNOWN_COMMANDS) HINT.KNOWN_COMMANDS.forEach(function (c) { add(c, ''); });
            (STATE.history || []).forEach(function (h) {
                if (!h || !h.text) return;
                var expr = String(h.text).split('=')[0].trim();
                if (expr) add(expr, 'historia');
            });
            document.querySelectorAll('.help-command[data-command]').forEach(function (el) {
                add(el.getAttribute('data-command'), 'ściąga');
            });
            return list;
        }
        function getStdACSuggestions() {
            if (!_stdAcSuggestions) _stdAcSuggestions = buildStdACSuggestions();
            return _stdAcSuggestions;
        }
        function invalidateStdACSuggestions() { _stdAcSuggestions = null; }

        function stdAcQueryFromInput(val) {
            var HINT = window.MATM0_HINT;
            if (HINT && typeof HINT.lastToken === 'function') return HINT.lastToken(val).toLowerCase();
            var m = String(val || '').trim().match(/([^\s]+)\s*$/);
            return m ? m[1].toLowerCase() : '';
        }

        function acFilterStdSuggestions(query) {
            if (!query || query.length < 1) return [];
            var foldFn = (window.MATM0_PL_FOLD && window.MATM0_PL_FOLD.foldLower) ||
                function (x) { return String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); };
            var q = foldFn(query);
            var results = [];
            getStdACSuggestions().forEach(function (s) {
                var synLower = foldFn(s.syntax);
                var descLower = foldFn(s.description || '');
                if (synLower.startsWith(q)) results.unshift(s);
                else if (synLower.includes(q)) results.push(s);
                else if (descLower.includes(q) && results.length < 8) results.push(s);
            });
            return results.slice(0, 7);
        }

        function initCalcAutocomplete(inputEl, dropdownEl) {
            if (!inputEl || !dropdownEl) return;
            var activeIdx = -1;
            function closeAC() { dropdownEl.classList.remove('open'); activeIdx = -1; }
            function openAC(items) {
                dropdownEl.replaceChildren();
                activeIdx = -1;
                items.forEach(function (item) {
                    var row = document.createElement('div');
                    row.className = 'autocomplete-item';
                    row.setAttribute('role', 'option');
                    var code = document.createElement('code');
                    code.textContent = item.syntax;
                    row.appendChild(code);
                    if (item.description) {
                        var desc = document.createElement('span');
                        desc.className = 'ac-desc';
                        desc.textContent = item.description;
                        row.appendChild(desc);
                    }
                    row.addEventListener('mousedown', function (e) {
                        e.preventDefault();
                        var val = inputEl.value;
                        var query = stdAcQueryFromInput(val);
                        if (query && val.slice(-query.length).toLowerCase() === query) {
                            inputEl.value = val.slice(0, val.length - query.length) + item.syntax;
                        } else {
                            inputEl.value = val + (val && !/\s$/.test(val) ? ' ' : '') + item.syntax;
                        }
                        inputEl.focus();
                        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                        closeAC();
                    });
                    dropdownEl.appendChild(row);
                });
                dropdownEl.classList.add('open');
            }
            function setActiveItem(idx) {
                var rows = dropdownEl.querySelectorAll('.autocomplete-item');
                rows.forEach(function (r) { r.classList.remove('active'); });
                if (idx >= 0 && idx < rows.length) { rows[idx].classList.add('active'); rows[idx].scrollIntoView({ block: 'nearest' }); }
                activeIdx = idx;
            }
            inputEl.addEventListener('input', function () {
                if (!_calcAssistWide()) { closeAC(); return; } // T4-16 — AC tylko na szerokim ekranie
                if (!(STATE.settings && STATE.settings.standardAutocomplete)) { closeAC(); return; }
                var query = stdAcQueryFromInput(inputEl.value);
                if (!query || query.length < 1) { closeAC(); return; }
                var matches = acFilterStdSuggestions(query);
                if (!matches.length) { closeAC(); return; }
                openAC(matches);
            });
            inputEl.addEventListener('keydown', function (e) {
                if (!dropdownEl.classList.contains('open')) return;
                var rows = dropdownEl.querySelectorAll('.autocomplete-item');
                if (e.key === 'ArrowDown') { e.preventDefault(); setActiveItem(Math.min(activeIdx + 1, rows.length - 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveItem(Math.max(activeIdx - 1, 0)); }
                else if (e.key === 'Enter' || e.key === 'Tab') {
                    if (activeIdx >= 0 && rows[activeIdx]) { e.preventDefault(); rows[activeIdx].dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); }
                    else closeAC();
                } else if (e.key === 'Escape') closeAC();
            });
            inputEl.addEventListener('blur', function () { setTimeout(closeAC, 150); });
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


            // [EN] Tap wyniku = kopiuj; przytrzymaj = do notatnika (T1-2)
            ['#wsAreaResult', '#wsCovResult', '#wsVolResult', '#wsGridResult', '#wsSlResult', '#wsPyResult', '#wsFovResult', '#wsFovNeedResult', '#wsElResult', '#wsEnResult', '#wsVdResult', '#wsConvResult'].forEach(function(sel) {
                var el = $(sel);
                if (!el) return;
                el.addEventListener('click', function(e) {
                    if (el.dataset.longPressed === 'true') { delete el.dataset.longPressed; return; }
                    var t = el.textContent.trim();
                    if (!t || t.indexOf('Podaj') === 0) return;
                    copyText(t).then(function() { showToast('📋 Skopiowano', 'success'); }).catch(function() {});
                });
                bindLongPressNotepad(el, function() {
                    var t = el.textContent.trim();
                    if (!t || t.indexOf('Podaj') === 0) return '';
                    var lbl = _NP_WS_LABELS[el.id] || 'Wynik';
                    return lbl + ': ' + t.replace(/\s+/g, ' ');
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

        // Ekran ładowania (logo) — chowamy gdy kalkulator gotowy, ale z minimalnym czasem
        // pokazania, by nie mignął przy szybkim (cache'owanym) starcie. Po fade usuwamy z układu
        // (hidden) → zero kosztu i zero przechwytywania dotyku. Tylko transform/opacity (GPU).
        function hideSplash() {
            var el = document.getElementById('appSplash');
            if (!el || el.hidden) return;
            var MIN_SHOW = 450;
            var go = function () {
                el.classList.add('is-hiding');
                var done = function () { el.hidden = true; };
                el.addEventListener('transitionend', done, { once: true });
                setTimeout(done, 700); // fallback gdyby transitionend nie przyszedł
            };
            var elapsed = (window.performance && performance.now) ? performance.now() : MIN_SHOW;
            if (elapsed >= MIN_SHOW) go(); else setTimeout(go, MIN_SHOW - elapsed);
        }

        function init() {
            /* [EN] Wrap graph canvas for CSS zoom/pan */
            var graphFsExitEl = $('#graphFsExitBtn');
            if (graphFsExitEl && graphContainer) graphContainer.appendChild(graphFsExitEl);

            loadFromStorage();
            if (STATE.settings.unitProfile !== 'custom') STATE.settings.unitProfile = _detectUnitProfile(); // T2-10 — sync etykiety z defaultUnits
            initTheme(); // tryb ciemny: synchronizuj ikonę przełącznika + podłącz reakcje
            registerCustomUnits(); // własne jednostki użytkownika rozpoznawalne od razu w kalkulatorze

            // [EN] FAZA 1 — tylko kalkulator standardowy. Stawiamy go natychmiast, żeby był
            // interaktywny od razu po otwarciu PWA (osoba „wpadam policzyć i wypadam" nie czeka
            // na inicjalizację wykresu/Warsztatu/parsera, które są częścią innych zakładek).
            buildCalcButtons();
            bindCalcExampleChips(); // [EN] chips on calc panel — sync in phase 1 (not deferred with help DOM)
            calcExpr.addEventListener('input', liveEval);
            calcExpr.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && e.shiftKey) return; // [EN] Shift+Enter — nowa linia w wyrażeniu
                if (calcExprAC && calcExprAC.classList.contains('open') && (e.key === 'Enter' || e.key === 'Tab')) return; // [EN] AC wybiera sugestię
                if (e.key === 'Enter') { e.preventDefault(); handleCalcAction('='); return; } // [EN] Enter = oblicz
                if (e.key === '=') { e.preventDefault(); _insertCalcExprText('='); return; } // [EN] „100%=20" — literal =, nie 100%→1
                if (e.key === 'Escape') { handleCalcAction('AC'); }
            });
            setupPlaceholderMarquee();
            initCalcAutocomplete(calcExpr, calcExprAC);
            function _onCalcAssistViewport() { // [EN] przełącz mobile bubble ↔ desktop chips przy resize
                if (_calcAssistWide()) _hideCalcAssistBubble();
                else if (calcExprAC) calcExprAC.classList.remove('open');
                liveEval();
            }
            window.addEventListener('resize', _onCalcAssistViewport);
            if (window.visualViewport) window.visualViewport.addEventListener('resize', _onCalcAssistViewport);
            liveEval();
            requestAnimationFrame(function() { fitCalcLayout(); fitCalcDisplay(); }); // [EN] budżet ekranika od razu — bez skoku przy 1→2 linii wyniku
            renderHistory();
            hideSplash(); // kalkulator gotowy → zgaś ekran ładowania (z minimalnym czasem pokazu)

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
                function () { ensureHelpSystem(); }, // [EN] help DOM/search/commands — off critical path (open buttons call ensureHelpSystem lazily)
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
            el.setAttribute('data-command', expandHelpCommand(el.getAttribute('data-command')));
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

            // G) krawędźP — przypięcie PRAWEGO brzegu w (10;0) przy kąt=90: oś = brzeg + 45° = 45°,
            //    zasięg = odległość do punktu = 10 (bo zasięg= nie podany).
            T.push(function() {
                var g = geoOf('kamera=0;0 ,, kąt=90 ,, krawędźP=10;0');
                var degDir = ((g.dir * 180 / Math.PI) % 360 + 360) % 360;
                return { name: 'G: krawędźP=10;0 @kąt90 → oś 45°, zasięg 10',
                    pass: g.dirMode === 'krawędź' && g.edgeSide === 'P' && near(degDir, 45, 1e-6) && near(g.range, 10, 1e-6),
                    got: 'oś=' + degDir.toFixed(3) + '° zasięg=' + g.range.toFixed(3) + ' tryb=' + g.dirMode };
            });

            // H) krawędźL — LEWY brzeg w (0;10) przy kąt=90: oś = brzeg − 45° = 90 − 45 = 45°.
            //    Ten sam stożek co w G (środek 45°, rozpięty 0…90°), tylko przypięty drugą krawędzią.
            T.push(function() {
                var g = geoOf('kamera=0;0 ,, kąt=90 ,, krawędźL=0;10');
                var degDir = ((g.dir * 180 / Math.PI) % 360 + 360) % 360;
                return { name: 'H: krawędźL=0;10 @kąt90 → oś 45°',
                    pass: g.dirMode === 'krawędź' && g.edgeSide === 'L' && near(degDir, 45, 1e-6) && near(g.range, 10, 1e-6),
                    got: 'oś=' + degDir.toFixed(3) + '° zasięg=' + g.range.toFixed(3) };
            });

            // I) „z ogniskowej": ogniskowa=50, matryca=36;24 → poziomy FOV = 2·atan(36/100),
            //    pionowy FOV = 2·atan(24/100). Jawny zasięg ma zostać nietknięty przez tryb optyki.
            T.push(function() {
                var g = geoOf('kamera=0;0 ,, ogniskowa=50 ,, matryca=36;24 ,, zasięg=25');
                var expH = 2 * Math.atan(36 / (2 * 50)) * 180 / Math.PI;
                var expV = 2 * Math.atan(24 / (2 * 50)) * 180 / Math.PI;
                return { name: 'I: kąt z ogniskowej 50 mm + matryca 36×24',
                    pass: g.fovFromLens === true && near(g.fov, expH, 1e-4) && near(g.fovV, expV, 1e-4) && near(g.range, 25, 1e-9),
                    got: 'fov=' + g.fov.toFixed(3) + ' (oczek. ' + expH.toFixed(3) + ') fovV=' + g.fovV.toFixed(3) };
            });

            // J) Etykieta „do horyzontu": górny promień kadru ≥ poziom (pochył 10° < pionowy FOV/2 = 15°)
            //    → daleki brzeg sięga horyzontu i jest ucięty zasięgiem (farHorizon).
            T.push(function() {
                var g = geoOf('kamera=0;0;10 ,, kierunek=0 ,, kąt=60;30 ,, pochył=10 ,, zasięg=100');
                var f = g.footprint;
                return { name: 'J: daleki brzeg do horyzontu (farHorizon)',
                    pass: !!f && f.farHorizon === true && f.farClamped === true && near(f.dFar, 100, 1e-6) && !g.groundVanished,
                    got: f ? 'farHorizon=' + f.farHorizon + ' dFar=' + f.dFar.toFixed(3) : 'brak footprint' };
            });

            // K) Tryb krawędź 3D (round-trip): bierzemy znaną pozę (azymut 0°, pochył 30°), czytamy
            //    jej BLISKI-LEWY narożnik na ziemi, podajemy go jako krawędźL — solver MUSI odzyskać
            //    pochył 30°, oś 0° i wyliczyć cel = trafienie osi w ziemię = 10/tan(30°) = 17,3205.
            T.push(function() {
                var pl = function(n) { return n.toFixed(5).replace('.', ','); };
                var base = geoOf('kamera=0;0;10 ,, kierunek=0 ,, kąt=60;40 ,, pochył=30 ,, zasięg=300');
                if (!base.footprint) return { name: 'K: 3D edge round-trip', pass: false, got: 'brak base footprint' };
                var nb = base.footprint.nB; // bliski-lewy narożnik (sh=+1)
                var g = geoOf('kamera=0;0;10 ,, kąt=60;40 ,, krawędźL=' + pl(nb.x) + ';' + pl(nb.y));
                var degDir = ((g.dir * 180 / Math.PI) % 360 + 360) % 360;
                var dDir = Math.min(degDir, 360 - degDir); // odległość kątowa od 0°
                var celExp = 10 / Math.tan(30 * Math.PI / 180);
                var celOK = g.celCalcX != null && near(g.celCalcX, celExp, 1e-2) && near(g.celCalcY, 0, 1e-2);
                return { name: 'K: krawędźL 3D odzyskuje pochył/azymut/cel z narożnika',
                    pass: g.dirMode === 'krawędź' && g.tilt != null && near(g.tilt, 30, 1e-2) && near(dDir, 0, 1e-2) && celOK,
                    got: 'tilt=' + (g.tilt == null ? 'null' : g.tilt.toFixed(3)) + ' oś=' + degDir.toFixed(3)
                        + ' cel=(' + (g.celCalcX == null ? '—' : g.celCalcX.toFixed(3)) + ',' + (g.celCalcY == null ? '—' : g.celCalcY.toFixed(3)) + ')' };
            });

            return T.map(function(fn) {
                try { return fn(); } catch (err) { return { name: 'wyjątek', pass: false, error: err.message }; }
            });
        }

        function runCalcSmokeTests() {
            function _smokeCurUnit(code) { // T4-20 — oczekiwana etykieta waluty w smoke
                if (code === 'PLN') return 'zł';
                var SYM = (window.MATM0_DATA || {}).CUR_DISPLAY_SYM || {};
                if (STATE.settings.currencyCompactSymbols !== false && SYM[code]) return SYM[code];
                return code;
            }
            function _smokeCurInText(text, code) {
                var u = _smokeCurUnit(code);
                if (u.length <= 2) return text.indexOf(u) >= 0 || new RegExp(code, 'i').test(text);
                return new RegExp(u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(text);
            }
            var cases = [
                // długość — domyślnie __auto__ (czytelny autodobór); Raycast-style konwersje jawne
                { expr: '2 cm + 5 mm', value: 2.5, unit: 'cm' },
                { expr: '5 km na mile', value: 3.106856, unit: 'mile', tol: 1e-3 },
                { expr: "5' + 6\"", value: 167.64, unit: 'cm' }, // 5 ft 6 in → 1676,4 mm → 167,64 cm
                { expr: '6 cali na mm', value: 152.4, unit: 'mm' },   // PL formy cala: cal/cale/cali
                // masa
                { expr: '2 kg + 300 g', value: 2.3, unit: 'kg' },
                { expr: '5 funtow na kg', value: 2.267962, unit: 'kg', tol: 1e-4 },
                // czas
                { expr: '90 min na h', value: 1.5, unit: 'h' },
                { expr: '2 h + 30 min', value: 2.5, unit: 'h' },   // @auto: text „2 h 30 min", value nadal 2,5 h
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
                { expr: '36 km/h', value: 36, unit: 'km/h', tol: 1e-9 },               // jednostka robocza km/h
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
                { expr: 'gross 1000', value: 1230 },
                { expr: 'net 1230', value: 1000 },
                { expr: 'tax on 1000', value: 230 },
                { expr: '1560 - tax', value: 1560 / 1.23, tol: 1e-6 },
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
                // „ile %" — kierunek ODWROTNY (wynik = procent, unit '%')
                { expr: 'ile % stanowi 25 z 200', value: 12.5, tol: 1e-6, unit: '%' },
                { expr: '25 z 200 stanowi ile %', value: 12.5, tol: 1e-6, unit: '%' },
                { expr: 'jaki procent stanowi 25 z 200', value: 12.5, tol: 1e-6, unit: '%' },
                { expr: '150 z 20%', value: 30, tol: 1e-6 },
                { expr: 'napiwek 15% na 42', value: 48.3, tol: 1e-6 },
                { expr: 'odejmij 20% od 150', value: 120, tol: 1e-6 },
                { expr: '300 połowa', value: 150 },
                { expr: '3 do 5 proporcja', value: 0.6, tol: 1e-6 },
                { expr: 'ile procent to 25 z 200', value: 12.5, tol: 1e-6, unit: '%' },
                { expr: '25 z 200 to ile %', value: 12.5, tol: 1e-6, unit: '%' },
                { expr: '25 to ile % z 200', value: 12.5, tol: 1e-6, unit: '%' },
                { expr: 'ile % stanowi 50 z 50', value: 100, tol: 1e-6, unit: '%' },
                // baza procentowa — znasz X% = Y, szukasz Z% (domyślnie 100%)
                { expr: '8,5% to 20, ile 100%', value: 20 * 100 / 8.5, tol: 1e-6 },
                { expr: '8,5%=20;100%', value: 20 * 100 / 8.5, tol: 1e-6 },
                { expr: '8,5%=20', value: 20 * 100 / 8.5, tol: 1e-6 },
                { expr: '8,5% to 20, ile 50%', value: 20 * 50 / 8.5, tol: 1e-6 },
                { expr: '8,5%=20;50%', value: 20 * 50 / 8.5, tol: 1e-6 },
                { expr: 'ile to 50% gdy 8,5% to 20', value: 20 * 50 / 8.5, tol: 1e-6 },
                { expr: '20 is 8.5% of what', value: 20 * 100 / 8.5, tol: 1e-6 },
                { expr: 'what is 50% if 8.5% is 20', value: 20 * 50 / 8.5, tol: 1e-6 },
                { expr: 'ile to 100% gdy 8,5% to 20', value: 20 * 100 / 8.5, tol: 1e-6 },
                { expr: '8,5% to 80pln', value: Math.round(80 * 100 / 8.5 * 100) / 100, unit: 'zł' },
                { expr: '80pln to 8,5%', value: Math.round(80 * 100 / 8.5 * 100) / 100, unit: 'zł' },
                { expr: '80pln=8,5%', value: Math.round(80 * 100 / 8.5 * 100) / 100, unit: 'zł' },
                { expr: '20pln to 8,5%', value: Math.round(20 * 100 / 8.5 * 100) / 100, unit: 'zł' },
                { expr: 'ile to 50% gdy 20pln to 8,5%', value: Math.round(20 * 50 / 8.5 * 100) / 100, unit: 'zł' },
                { expr: '8,5% to 80 pln, ile 50%', value: Math.round(80 * 50 / 8.5 * 100) / 100, unit: 'zł' },
                { expr: '80 pln to 8,5% z czego', value: Math.round(80 * 100 / 8.5 * 100) / 100, unit: 'zł' },
                { expr: '20% z 100', value: 20, tol: 1e-6 },            // FORWARD nadal liczba (nie %)
                { expr: '89% z 6%', value: 5.34, tol: 1e-6, unit: '%' },
                { expr: '89% of 6%', value: 5.34, tol: 1e-6, unit: '%' },
                { expr: '81%*6%', value: 0.0486, tol: 1e-6 },
                // daty — deterministyczny zakres
                { expr: 'ile dni od 1.01.2026 do 1.02.2026', value: 31 },
                // koszt trasy/paliwa (deterministyczny): 300/100·7=21 l · 6,50 = 136,50 zł
                { expr: 'koszt trasy 300 km 7 l/100km 6,50 zł/l', value: 136.5, tol: 1e-6, unit: 'zł' },
                { expr: 'paliwo na 100 km 8 l/100 7 zł/l', value: 56, tol: 1e-6, unit: 'zł' },
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
            // Dni tygodnia (kotwice) — wynik zależy od „dziś", więc sprawdzamy POPRAWNY DZIEŃ
            // (tekst zawiera właściwą nazwę), nie konkretną datę. Deterministyczne mimo dnia uruchomienia.
            function wdText(expr) { try { var r = evalCalcExpression(expr); return r && r.text || ''; } catch (e) { return 'ERR'; } }
            results.push({ expr: 'najbliższy poniedziałek → poniedziałek', pass: /poniedzia[łl]ek/.test(wdText('najbliższy poniedziałek')), got: wdText('najbliższy poniedziałek') });
            results.push({ expr: 'następna środa → środa', pass: /środa/.test(wdText('następna środa')), got: wdText('następna środa') });
            results.push({ expr: 'poprzedni piątek → piątek', pass: /pi[ąa]tek/.test(wdText('poprzedni piątek')), got: wdText('poprzedni piątek') });
            results.push({ expr: 'który dzień tygodnia 25.12.2026 → piątek', pass: /25\.12\.2026.*pi[ąa]tek/.test(wdText('który dzień tygodnia 25.12.2026')), got: wdText('który dzień tygodnia 25.12.2026') });
            // Strefy czasowe — offset Londyn↔Tokio zależy od DST (8h lato / 9h zima), więc nie
            // sprawdzamy konkretnej godziny; sprawdzamy format HH:MM + etykietę strefy docelowej.
            results.push({ expr: '17:00 w Londynie na Tokio → HH:MM (Tokio)', pass: /^\d{2}:\d{2} \(Tokio\)$/.test(wdText('17:00 w Londynie na Tokio')), got: wdText('17:00 w Londynie na Tokio') });
            results.push({ expr: 'która godzina w Tokio → HH:MM (Tokio)', pass: /^\d{2}:\d{2} \(Tokio\)$/.test(wdText('która godzina w Tokio')), got: wdText('która godzina w Tokio') });
            // Domyślne jednostki wyświetlania (ustawienia) — gołe sumy zwijają się do preferowanej;
            // jawne „X na Y" wygrywa. Zapis/odtworzenie stanu, by nie wpłynąć na inne testy.
            var savedDU = STATE.settings.defaultUnits;
            STATE.settings.defaultUnits = { speed: 'km/h', length: 'm', mass: 'kg', volume: 'l', time: 'h' };
            var duCases = [
                { expr: '36 km/h', value: 36, unit: 'km/h' },          // baza m/s → preferowana km/h (był 10 m/s)
                { expr: '2 m/s + 5 km/h', value: 12.2, unit: 'km/h', tol: 1e-6 }, // (2*3,6)+5
                { expr: '10 m/s na km/h', value: 36, unit: 'km/h' },   // jawne „na" wygrywa (i tak km/h)
                { expr: '100 km/h na m/s', value: 27.777778, unit: 'm/s', tol: 1e-5 }, // jawne „na" → m/s mimo domyślnej km/h
                { expr: '5 m + 200 cm', value: 7, unit: 'm' },         // 7000 mm → 7 m (baza była mm)
                { expr: '2 kg + 300 g', value: 2.3, unit: 'kg' },      // 2300 g → 2,3 kg
                { expr: '500 ml + 1 l', value: 1.5, unit: 'l' },       // 1500 ml → 1,5 l
                { expr: '5h', value: 5, unit: 'h' },                   // czas: goła suma w domyślnej (h) zamiast „18000 s"
                { expr: '90 min', value: 1.5, unit: 'h' },             // 5400 s → 1,5 h
                { expr: '300 s na min', value: 5, unit: 'min' },       // jawne „na" wygrywa
            ];
            duCases.forEach(function(t) {
                var r = evalCalcExpression(t.expr);
                var pass = r.unit === t.unit && Math.abs(r.value - t.value) <= (t.tol || 1e-9);
                results.push({ expr: t.expr + ' (domyślna jednostka)', pass: pass, got: r.value + ' ' + r.unit });
            });
            // Pusta domyślna = jednostka robocza (pierwsza wpisana), nie baza kategorii.
            STATE.settings.defaultUnits = { speed: '', length: '', mass: '', volume: '', time: '', area: '', data: '', angle: '' };
            var rAuto = evalCalcExpression('36 km/h');
            results.push({ expr: '36 km/h @auto (robocza)', pass: rAuto.unit === 'km/h' && Math.abs(rAuto.value - 36) < 1e-9, got: rAuto.value + ' ' + rAuto.unit });
            var rFtIn = evalCalcExpression("5' + 6\"");
            results.push({ expr: "5' + 6\" @robocza (feet)", pass: rFtIn.unit === 'feet' && Math.abs(rFtIn.value - 5.5) < 1e-9, got: rFtIn.value + ' ' + rFtIn.unit });
            var rTimeAuto = evalCalcExpression('5h');
            results.push({ expr: '5h @time:robocza (h)', pass: rTimeAuto.unit === 'h' && rTimeAuto.value === 5, got: rTimeAuto.value + ' ' + rTimeAuto.unit });
            // Niepasująca jednostka w ustawieniu (np. speed='kg') → ignorowana, jednostka robocza.
            STATE.settings.defaultUnits = { speed: 'kg', length: '', mass: '', volume: '' };
            var rBad = evalCalcExpression('36 km/h');
            results.push({ expr: "36 km/h @speed='kg' (ignoruje)", pass: rBad.unit === 'km/h' && Math.abs(rBad.value - 36) < 1e-9, got: rBad.value + ' ' + rBad.unit });
            STATE.settings.defaultUnits = savedDU;
            // T2-10 — profil budowy: jawne m (nie auto-km); 108m+900m = 1008 m
            (function() {
                var savedProf = STATE.settings.unitProfile;
                var savedDU3 = STATE.settings.defaultUnits;
                applyUnitProfile('build', { silent: true });
                var rBuild = evalCalcExpression('108m+900m');
                results.push({ expr: 'T2-10 build 108m+900m', pass: rBuild.unit === 'm' && Math.abs(rBuild.value - 1008) < 1e-9, got: rBuild.value + ' ' + rBuild.unit });
                var rBuildKm = evalCalcExpression('1000m');
                results.push({ expr: 'T2-10 build 1000m stays m', pass: rBuildKm.unit === 'm' && Math.abs(rBuildKm.value - 1000) < 1e-9, got: rBuildKm.value + ' ' + rBuildKm.unit });
                applyUnitProfile('it', { silent: true });
                var rIt = evalCalcExpression('2GB+512MB');
                results.push({ expr: 'T2-10 it 2GB+512MB', pass: rIt.unit === 'GB' && Math.abs(rIt.value - 2.5) < 1e-6, got: rIt.value + ' ' + rIt.unit });
                STATE.settings.unitProfile = savedProf;
                STATE.settings.defaultUnits = savedDU3;
            })();
            // T2-7 — konwersja PPI (px przy zadanym DPI)
            [
                { expr: '2 in na px przy 96 ppi', value: 192, unit: 'px' },
                { expr: '10 cal na px @ 72 ppi', value: 720, unit: 'px' },
                { expr: '2.54 cm na px przy 96 ppi', value: 96, unit: 'px', tol: 1e-6 }
            ].forEach(function(t) {
                var r = evalCalcExpression(t.expr);
                var pass = r.unit === t.unit && Math.abs(r.value - t.value) <= (t.tol || 1e-9);
                results.push({ expr: 'T2-7 ' + t.expr, pass: pass, got: r.value + ' ' + r.unit });
            });
            // Faza D — podpowiedzi i symbole walut
            var Hsm = window.MATM0_HINT;
            var hDzis = Hsm && Hsm.getLiveHints('dziś') || [];
            results.push({ expr: 'T4-17 dziś hint', pass: hDzis.some(function (c) { return String(c.label || c).indexOf('90 dni') >= 0; }), got: hDzis.length ? (hDzis[0].label || hDzis[0]) : 'brak' });
            results.push({ expr: 'T4-19 fuzzy tokjo', pass: Hsm && Hsm.fuzzySuggest('czas w tokjo') === 'czas w Tokio', got: Hsm && Hsm.fuzzySuggest('czas w tokjo') });
            var stdAc = acFilterStdSuggestions('czas');
            results.push({ expr: 'T4-16 ac czas', pass: stdAc.length > 0 && stdAc.some(function (s) { return /czas/i.test(s.syntax); }), got: stdAc.length });
            (function () {
                var savedFxD = STATE.fx.rates, savedFxTs = STATE.fx.ts, savedCompact = STATE.settings.currencyCompactSymbols;
                var savedDefD = STATE.settings.defaultCurrency;
                STATE.fx.rates = { PLN: 1, USD: 3.95, EUR: 4.3 };
                STATE.fx.ts = Date.now();
                STATE.settings.defaultCurrency = 'USD';
                STATE.settings.currencyCompactSymbols = true;
                var rSym = evalCalcExpression('20 usd + 10 usd');
                results.push({ expr: 'T4-20 30 usd $', pass: rSym.unit === '$' && Math.abs(rSym.value - 30) < 1e-9, got: rSym.value + ' ' + rSym.unit });
                STATE.settings.currencyCompactSymbols = false;
                var rIso = evalCalcExpression('20 usd + 10 usd');
                results.push({ expr: 'T4-20 30 usd ISO', pass: rIso.unit === 'USD', got: rIso.unit });
                STATE.fx.rates = savedFxD; STATE.fx.ts = savedFxTs;
                STATE.settings.currencyCompactSymbols = savedCompact;
                STATE.settings.defaultCurrency = savedDefD;
            })();
            // REGRESJE jednostek (2026-06-27):
            //  1) Autodobór NIE awansuje do większej jednostki, gdy psuje to czytelność:
            //     „108 m + 900 m" = 1008 m (NIE mylące „1,008 km" wyglądające jak 1008 km).
            //  2) Sumy jednostek o dużym rozstępie skali nie wstrzykują notacji 1e-… do
            //     wyrażenia (parser brał „e" za stałą Eulera): „1 ha + 1 mm²" = 10000,000001 m².
            (function() {
                var savedDU2 = STATE.settings.defaultUnits;
                STATE.settings.defaultUnits = { length: '__auto__', mass: '__auto__', volume: '__auto__', area: '', data: '', time: '', speed: '' };
                var autoCases = [
                    { expr: '108m+900m', value: 1008, unit: 'm' },
                    { expr: '999m+10m', value: 1009, unit: 'm' },
                    { expr: '1000m', value: 1, unit: 'km' },
                    { expr: '500m+600m', value: 1.1, unit: 'km' },
                    { expr: '5km+300m', value: 5.3, unit: 'km' },
                    { expr: '1008g', value: 1008, unit: 'g' },
                ];
                autoCases.forEach(function(t) {
                    var r = evalCalcExpression(t.expr);
                    results.push({ expr: t.expr + ' (autodobór czytelny)', pass: r.unit === t.unit && Math.abs(r.value - t.value) <= 1e-9, got: r.value + ' ' + r.unit });
                });
                STATE.settings.defaultUnits = { length: '', mass: '', volume: '', area: '', data: '', time: '', speed: '' };
                var sciCases = [
                    { expr: '1ha+1mm2', value: 1.0000000001, unit: 'ha' },
                    { expr: '1km+1mm', value: 1.000001, unit: 'km' },
                    { expr: '1t+1mg', value: 1.000000001, unit: 't' },
                    { expr: '1GB+1B', value: 1.00000000093132, unit: 'GB' },
                    { expr: '1000km+1mm', value: 1000.000001, unit: 'km' },
                ];
                sciCases.forEach(function(t) {
                    var r = evalCalcExpression(t.expr);
                    var pass = Math.abs(r.value - t.value) <= Math.max(1e-6, Math.abs(t.value) * 1e-9);
                    if (t.unit) pass = pass && r.unit === t.unit;
                    results.push({ expr: t.expr + ' (bez 1e-… → Euler)', pass: pass, got: r.value + ' ' + r.unit });
                });
                STATE.settings.defaultUnits = savedDU2;
            })();
            // „ans"/„wynik" — z zapisem i odtworzeniem stanu, by nie zaśmiecić STATE.calc.ans
            var savedAns = STATE.calc.ans;
            STATE.calc.ans = null;
            results.push({ expr: 'ans*2 (bez wyniku)', pass: evalCalcExpression('ans*2').value === null, got: null });
            STATE.calc.ans = 15;
            results.push({ expr: 'ans*2 (ans=15)', pass: evalCalcExpression('ans*2').value === 30, got: evalCalcExpression('ans*2').value });
            results.push({ expr: 'wynik+5 (ans=15)', pass: evalCalcExpression('wynik + 5').value === 20, got: evalCalcExpression('wynik + 5').value });
            STATE.calc.ans = savedAns;
            // Czas zegarowy
            [
                { expr: '17:00 + 3h', text: '20:00' },
                { expr: '17:00 + 90 min', text: '18:30' },
                { expr: '9:30 + 1h30', text: '11:00' },
                { expr: '23:00 + 3h', text: '02:00' },        // zawijanie przez północ
                { expr: '08:15 - 45 min', text: '07:30' },
                { expr: 'od 9:30 do 17:15', text: '7 h 45 min' },
                { expr: 'od 22:00 do 6:00', text: '8 h' },     // nocna zmiana (przez północ)
                { expr: '17:00 - 9:30', text: '7 h 30 min' },  // różnica dwóch zegarów
                { expr: '10:00 + 2:30', text: '12:30' },       // trwanie w formacie H:MM
                { expr: '12:30 + 300s', text: '12:35' },       // sekundy (300 s = 5 min)
                { expr: '12:00 + 1h 120 s', text: '13:02' },   // złożone h+s (120 s = 2 min)
                { expr: '10:00 + 1:30:00', text: '11:30' }     // trwanie H:MM:SS
            ].forEach(function(t) {
                try {
                    var rc = evalCalcExpression(t.expr);
                    results.push({ expr: t.expr + ' (zegar)', pass: rc.text === t.text, got: rc.text });
                } catch (err) { results.push({ expr: t.expr + ' (zegar)', pass: false, error: err.message }); }
            });
            // Czas: „16:9" to proporcja, NIE zegar (1-cyfrowe minuty) → zegar zwraca null
            results.push({ expr: '16:9 nie jest zegarem', pass: evalClockExpression('16:9') === null, got: String(evalClockExpression('16:9')) });
            // Kanoniczny model wartości (pkt 1): kind + exact na różnych ścieżkach
            [
                { expr: '2+2', kind: 'number', exact: true },
                { expr: '5 km + 300 m', kind: 'physical', exact: true },
                { expr: '17:00 + 3h', kind: 'clock', exact: true },
                { expr: '15:00 + 30s', kind: 'clock', exact: false },   // 30 s → ułamek minuty → zaokrąglone
                { expr: 'od 9:30 do 17:15', kind: 'duration', exact: true },
                { expr: 'za 3 dni', kind: 'date', exact: true },
                { expr: '1/3', kind: 'number', exact: false },          // długi ułamek ucięty na wyświetlaniu
                { expr: '10/4', kind: 'number', exact: true },          // 2,5 — krótki, dokładny
                { expr: '0,1 + 0,2', kind: 'number', exact: true }      // szum float wyczyszczony → NIE ≈
            ].forEach(function(t) {
                try {
                    var rv = evalCalcExpression(t.expr);
                    var ok = rv.kind === t.kind && rv.exact === t.exact && rv.hasOwnProperty('value') && rv.hasOwnProperty('unit');
                    results.push({ expr: t.expr + ' (kind/exact)', pass: ok, got: rv.kind + '/' + rv.exact });
                } catch (err) { results.push({ expr: t.expr + ' (kind/exact)', pass: false, error: err.message }); }
            });
            // ≈ niesie dokładniejszą wartość (exactText) tam, gdzie zaokrąglamy
            results.push({ expr: '15:30 + 40s → exactText 15:30:40', pass: evalCalcExpression('15:30 + 40s').exactText === '15:30:40', got: evalCalcExpression('15:30 + 40s').exactText });
            results.push({ expr: '1/3 → exactText ustawiony', pass: !!evalCalcExpression('1/3').exactText, got: evalCalcExpression('1/3').exactText });
            results.push({ expr: '10/4 → brak exactText (dokładny)', pass: evalCalcExpression('10/4').exactText === null, got: String(evalCalcExpression('10/4').exactText) });
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
                { expr: 'cena na eur', value: Math.round(4.80 / 4.30 * 100) / 100, unit: _smokeCurUnit('EUR') }, // konwersja waluty (grosze: 2 miejsca)
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

            // Notatnik: miks jednostek — strict (jak kalkulator) vs first (pierwsza jednostka wygrywa)
            var savedMix = STATE.settings.notepadUnitMix;
            var savedFxMix = STATE.fx.rates, savedFxTsMix = STATE.fx.ts;
            STATE.fx.rates = { PLN: 1, EUR: 4.30 }; STATE.fx.ts = Date.now();
            STATE.settings.notepadUnitMix = 'strict';
            var mixStrict = evalNotepadLines('10 pln × 5 km');
            results.push({ expr: 'unit-mix strict: 10 pln × 5 km → brak', pass: mixStrict[0].text === '', got: '"' + mixStrict[0].text + '"' });
            results.push({ expr: 'unit-mix calc strict bez zmian', pass: evalCalcExpression('10 pln × 5 km').value === null, got: evalCalcExpression('10 pln × 5 km').value });
            STATE.settings.notepadUnitMix = 'first';
            var mixFirst = evalNotepadLines('10 pln × 5 km');
            results.push({ expr: 'unit-mix first: 10 pln × 5 km = 50', pass: mixFirst[0].value === 50 && /zł|pln/i.test(mixFirst[0].text), got: mixFirst[0].text });
            var mixFirstKm = evalNotepadLines('5 km × 10 pln');
            results.push({ expr: 'unit-mix first: 5 km × 10 pln = 50 km', pass: mixFirstKm[0].value === 50 && /km/i.test(mixFirstKm[0].text), got: mixFirstKm[0].text });
            STATE.settings.notepadUnitMix = savedMix;
            STATE.fx.rates = savedFxMix; STATE.fx.ts = savedFxTsMix;

            // Notatnik: jednostka przy razem — inherit / ręczna razem(zł)
            var savedSumU = STATE.settings.notepadSumUnit;
            STATE.settings.notepadUnitMix = 'first';
            STATE.settings.notepadSumUnit = 'off';
            var sumOff = evalNotepadLines('Nocleg: 110pln×10os\npaliwo: 5,60pln×100km\nrazem');
            results.push({ expr: 'sum-unit off: razem bez zł', pass: sumOff[2].value === 1660 && !/zł|pln/i.test(sumOff[2].text), got: sumOff[2].text });
            STATE.settings.notepadSumUnit = 'inherit';
            var sumInh = evalNotepadLines('Nocleg: 110pln×10os\npaliwo: 5,60pln×100km\nrazem');
            results.push({ expr: 'sum-unit inherit: razem = 1660 zł', pass: sumInh[2].value === 1660 && /zł/i.test(sumInh[2].text), got: sumInh[2].text });
            var sumMan = evalNotepadLines('A: 100 zł\nB: 50 zł\nrazem(usd)');
            results.push({ expr: 'sum-unit manual razem(usd)', pass: sumMan[2].value === 150 && _smokeCurInText(sumMan[2].text, 'USD'), got: sumMan[2].text });
            var sumMix = evalNotepadLines('A: 100 zł\nB: 50\nrazem');
            results.push({ expr: 'sum-unit inherit mixed units → brak zł', pass: sumMix[2].value === 150 && !/zł/i.test(sumMix[2].text), got: sumMix[2].text });
            var sumVar = evalNotepadLines('A: 100 zł\nB: 50 zł\nrazem\ntest: @razem × 2');
            results.push({ expr: 'sum-unit @razem×2 z dziedziczonym zł', pass: sumVar[3].value === 300 && /zł/i.test(sumVar[3].text), got: sumVar[3].text });
            var savedFxUsd = STATE.fx.rates, savedFxTsUsd = STATE.fx.ts;
            STATE.fx.rates = { PLN: 1, USD: 4.0 }; STATE.fx.ts = Date.now();
            var usdLines = evalNotepadLines('A: 100 usd\nrazem(usd)\nT: @razem × 2\nC: @razem na zł');
            STATE.fx.rates = savedFxUsd; STATE.fx.ts = savedFxTsUsd;
            results.push({ expr: 'sum-unit @razem×2 z ręcznym USD', pass: usdLines[2].value === 200 && _smokeCurInText(usdLines[2].text, 'USD'), got: usdLines[2].text });
            results.push({ expr: 'sum-unit @razem na zł (jawna konwersja)', pass: usdLines[3].value === 400 && /zł/i.test(usdLines[3].text), got: usdLines[3].text });
            STATE.settings.notepadSumUnit = savedSumU;

            // Etykiety-zmienne: odwołanie przez @nazwa (bez @ = brak podstawienia).
            var vlines = evalNotepadLines(['Paliwo: 100 + 194', 'Podwojone: @paliwo * 2', 'Budżet: 5000', 'Zostało: @budżet - @paliwo', 'Przed: @y + 1', 'Y: 10'].join('\n'));
            results.push({ expr: 'zmienne: paliwo=294', pass: vlines[0].value === 294, got: vlines[0].text });
            results.push({ expr: 'zmienne: @paliwo*2=588', pass: vlines[1].value === 588, got: vlines[1].text });
            results.push({ expr: 'zmienne: dymek „294 * 2"', pass: vlines[1].resolved === '294 * 2', got: '"' + vlines[1].resolved + '"' });
            results.push({ expr: 'zmienne: @budżet-@paliwo=4706', pass: vlines[3].value === 4706, got: vlines[3].text });
            results.push({ expr: 'zmienne: odwołanie w przód (@y przed def) → brak', pass: vlines[4].text === '', got: '"' + vlines[4].text + '"' });
            results.push({ expr: 'zmienne: bare paliwo nie podstawia', pass: evalNotepadLines('Paliwo: 100\nX: paliwo * 2')[1].text === '', got: 'blocked' });

            // Zmienne GLOBALNE (@nazwa) — dzielone między notatkami, izolacja zmiennych lokalnych.
            var savedGlobals = _npGlobals, savedNotesG = _npNotes;
            // (a) w obrębie jednej notatki: @def + użycie poniżej; @def nie jest pozycją sumy
            _npGlobals = {};
            var gl = evalNotepadLines(['@stawka: 50', 'Koszt: @stawka * 3', 'razem'].join('\n'));
            results.push({ expr: 'globalne: @stawka → koszt=150', pass: gl[1].value === 150, got: gl[1].text });
            results.push({ expr: 'globalne: @def nie wlicza się do „razem" (=150)', pass: gl[2].value === 150, got: gl[2].text });
            // (b) cross-notatka: globalna z innej notatki widoczna po seedzie _npGlobals
            _npGlobals = { stawka: 50 };
            var gl2 = evalNotepadLines('Wycena: @stawka * 4');
            results.push({ expr: 'globalne: cross-notatka @stawka*4=200', pass: gl2[0].value === 200, got: gl2[0].text });
            // (c) izolacja: zmienna LOKALNA nie staje się globalna; @def-y tak
            _npNotes = [{ id: 'a', text: '@stawka: 50\nPaliwo: 100' }, { id: 'b', text: 'Czynsz: 2000' }];
            _npRebuildGlobals();
            results.push({ expr: 'globalne: rebuild zbiera tylko @ (stawka), nie lokalne (paliwo/czynsz)', pass: _npGlobals.stawka === 50 && _npGlobals.paliwo === undefined && _npGlobals.czynsz === undefined, got: JSON.stringify(_npGlobals) });
            _npGlobals = savedGlobals; _npNotes = savedNotesG;

            var secLines = evalNotepadLines('A: 10\nB: 20\n---\nC: 5\nrazem');
            results.push({ expr: 'sekcja --- reset sumy (razem=5)', pass: secLines[4].value === 5, got: secLines[4].value });
            results.push({ expr: 'sekcja --- flag', pass: secLines[2].isSection === true, got: secLines[2].isSection });
            var subLines = evalNotepadLines('X: 100\nY: 50\npółsuma');
            results.push({ expr: 'półsuma = 150', pass: subLines[2].value === 150 && subLines[2].isSubtotal, got: subLines[2].text });
            var sumVars = _npListVars('Farba: 120\nGips: 80\npółsuma\nsuma: suma');
            results.push({ expr: 'półsuma/suma w panelu zmiennych', pass: sumVars.locals.półsuma === 200 && sumVars.locals.suma === 200, got: JSON.stringify(sumVars.locals) });
            var montLines = evalNotepadLines('Farba: 120\nGips: 80\npółsuma\nsuma: suma\n---\nMontaż: @gips + @półsuma + @suma');
            results.push({ expr: 'Montaż: @gips+@półsuma+@suma=480', pass: montLines[5].value === 480, got: montLines[5].text });
            results.push({ expr: '_npTitle custom', pass: _npTitle({ id: 't', text: 'foo', title: 'Moja notatka' }) === 'Moja notatka', got: _npTitle({ id: 't', text: 'foo', title: 'Moja notatka' }) });

            // T1-2 — append nie psuje evalNotepadLines
            var savedNotesB = JSON.parse(JSON.stringify(_npNotes)), savedIdB = _npCurrentId;
            _npNotes = [{ id: 'tappend', text: '2+2', updatedAt: Date.now() }];
            _npCurrentId = 'tappend';
            appendToNotepad('3+3', { open: false, focus: false, silent: true });
            var noteApp = _npCurrentNote();
            var appendOk = noteApp && noteApp.text.indexOf('3+3') >= 0 &&
                evalNotepadLines(noteApp.text).some(function(x) { return x.value === 6; });
            results.push({ expr: 'T1-2 appendToNotepad', pass: appendOk, got: noteApp ? noteApp.text : null });
            _npNotes = savedNotesB; _npCurrentId = savedIdB;
            // Przełączanie notatek — treść docelowej nie może zostać nadpisana przez poprzednią
            var savedNotesSw = JSON.parse(JSON.stringify(_npNotes)), savedIdSw = _npCurrentId;
            var hadNotepadOpen = document.body.classList.contains('notepad-open');
            _npNotes = [
                { id: 'sw-a', text: 'Treść notatki A', updatedAt: 1 },
                { id: 'sw-b', text: 'Treść notatki B', updatedAt: 2 }
            ];
            _npCurrentId = 'sw-a';
            document.body.classList.add('notepad-open');
            setupNpEditor();
            npBuildRows('Treść notatki A');
            npSwitchNote('sw-b');
            var noteA = _npNotes.filter(function(x) { return x.id === 'sw-a'; })[0];
            var noteB = _npNotes.filter(function(x) { return x.id === 'sw-b'; })[0];
            var switchOk = _npCurrentId === 'sw-b' && noteA && noteB &&
                noteA.text === 'Treść notatki A' && noteB.text === 'Treść notatki B' &&
                npBody && npBody.value === 'Treść notatki B';
            if (!hadNotepadOpen) document.body.classList.remove('notepad-open');
            _npNotes = savedNotesSw; _npCurrentId = savedIdSw;
            results.push({ expr: 'npSwitchNote nie nadpisuje docelowej', pass: switchOk, got: switchOk ? 'ok' : JSON.stringify({ a: noteA && noteA.text, b: noteB && noteB.text, ed: npBody && npBody.value }) });
            // Debounce persist — szybka nowa notatka nie może wlać starej treści do świeżej
            var savedNotesDb = JSON.parse(JSON.stringify(_npNotes)), savedIdDb = _npCurrentId;
            var hadOpenDb = document.body.classList.contains('notepad-open');
            _npNotes = [{ id: 'db-a', text: 'DEB_A', updatedAt: 1 }];
            _npCurrentId = 'db-a';
            document.body.classList.add('notepad-open');
            setupNpEditor();
            npBuildRows('DEB_A_EDIT');
            scheduleNotepadPersist();
            npNewNote();
            var dbA = _npNotes.filter(function(x) { return x.id === 'db-a'; })[0];
            var dbNew = _npCurrentNote();
            var debounceOk = dbA && dbA.text === 'DEB_A_EDIT' && dbNew && dbNew.text === '';
            if (!hadOpenDb) document.body.classList.remove('notepad-open');
            _npNotes = savedNotesDb; _npCurrentId = savedIdDb;
            results.push({ expr: 'npNewNote + debounce persist', pass: debounceOk, got: debounceOk ? 'ok' : JSON.stringify({ a: dbA && dbA.text, n: dbNew && dbNew.text }) });
            // T3-14 — eksport Markdown
            var savedNotesE = JSON.parse(JSON.stringify(_npNotes)), savedIdE = _npCurrentId;
            _npNotes = [{ id: 'e1', text: 'Netto: 100\nVAT: 23', updatedAt: Date.now() }];
            _npCurrentId = 'e1';
            var mdOut = _npExportBody('md');
            results.push({ expr: 'T3-14 _npExportBody(md)', pass: mdOut.indexOf('## ') === 0 && mdOut.indexOf('Netto') > 0, got: mdOut.slice(0, 48) });
            _npNotes = savedNotesE; _npCurrentId = savedIdE;
            // T3-13 — szablon faktury ma „Razem" / linie VAT
            var tplVat = _NP_TEMPLATES.filter(function(t) { return t.id === 'faktura'; })[0];
            results.push({ expr: 'T3-13 szablon faktura', pass: !!(tplVat && tplVat.text.indexOf('VAT') >= 0), got: tplVat && tplVat.title });
            // T6-2 — usunięcie wiersza (symulacja splice) nie psuje evalNotepadLines
            var t6lines = 'A: 10\nB: 20\nrazem'.split('\n');
            t6lines.splice(1, 1);
            var t6eval = evalNotepadLines(t6lines.join('\n'));
            results.push({ expr: 'T6-2 delete line eval', pass: t6eval[1] && t6eval[1].value === 10, got: t6eval[1] && t6eval[1].value });
            // T6-2 — npDeleteNote zostawia co najmniej jedną notatkę
            var savedNotesT6 = JSON.parse(JSON.stringify(_npNotes)), savedIdT6 = _npCurrentId;
            _npNotes = [{ id: 'n1', text: 'x', updatedAt: 1 }, { id: 'n2', text: 'y', updatedAt: 2 }];
            _npCurrentId = 'n1';
            npDeleteNote('n1');
            var t6delOk = _npNotes.length >= 1 && _npCurrentId === 'n2';
            _npNotes = savedNotesT6; _npCurrentId = savedIdT6;
            results.push({ expr: 'T6-2 npDeleteNote', pass: t6delOk, got: t6delOk ? 'ok' : 'fail' });
            // T6-3 — ustawienie gutter hidden (domyślnie widoczny)
            var savedGutterT6 = STATE.settings.notepadGutterHidden;
            STATE.settings.notepadGutterHidden = true;
            var t63set = STATE.settings.notepadGutterHidden === true;
            STATE.settings.notepadGutterHidden = savedGutterT6;
            results.push({ expr: 'T6-3 notepadGutterHidden', pass: t63set && savedGutterT6 !== true, got: t63set ? 'ok' : 'fail' });
            // T6-1 — clamp rozmiaru czcionki
            results.push({ expr: 'T6-1 font clamp 1.15', pass: _npClampFontSize(1.15) === 1.15, got: _npClampFontSize(1.15) });
            results.push({ expr: 'T6-1 font clamp max', pass: _npClampFontSize(9) === 1.25, got: _npClampFontSize(9) });
            // T6-4 — prefix wyrównania nie psuje liczenia
            var t64 = evalNotepadLines('> 100+200');
            results.push({ expr: 'T6-4 align right sum', pass: t64[0] && t64[0].value === 300, got: t64[0] && t64[0].value });
            // T6-5 — markery formatowania strip przed eval
            var t65 = evalNotepadLines('**2+2**');
            results.push({ expr: 'T6-5 bold eval', pass: t65[0] && t65[0].value === 4, got: t65[0] && t65[0].value });
            var t65i = evalNotepadLines('_3*3_');
            results.push({ expr: 'T6-5 italic eval', pass: t65i[0] && t65i[0].value === 9, got: t65i[0] && t65i[0].value });
            var t65u = evalNotepadLines('__10+5__');
            results.push({ expr: 'T6-5 underline eval', pass: t65u[0] && t65u[0].value === 15, got: t65u[0] && t65u[0].value });
            var t65m = evalNotepadLines('> **Nocleg:** 3 * 180');
            results.push({ expr: 'T6-5 align+bold eval', pass: t65m[0] && t65m[0].value === 540, got: t65m[0] && t65m[0].value });
            var t66s = evalNotepadLines('~~2+2~~');
            results.push({ expr: 'T6-6 strike eval', pass: t66s[0] && t66s[0].value === 4, got: t66s[0] && t66s[0].value });
            var t66a = evalNotepadLines('::10+5::');
            results.push({ expr: 'T6-6 accent eval', pass: t66a[0] && t66a[0].value === 15, got: t66a[0] && t66a[0].value });
            // T6-5 mirror — niedomknięte markery nie mogą zapętlić renderu (lag przy wpisywaniu *)
            (function() {
                var cases = ['**', '**otwarte', '__', '_kurs', '~~', '::otw'];
                for (var ci = 0; ci < cases.length; ci++) {
                    var el = document.createElement('div');
                    var t0 = Date.now();
                    _npFillMirrorFormatted(el, cases[ci], null);
                    var ms = Date.now() - t0;
                    results.push({ expr: 'T6-5 mirror open "' + cases[ci] + '"', pass: ms < 80, got: ms + 'ms' });
                }
                var el2 = document.createElement('div');
                t0 = Date.now();
                _npFillMirrorFormatted(el2, '**bold**', { selStart: 2, selEnd: 6, caret: 2 }, 0);
                ms = Date.now() - t0;
                results.push({ expr: 'T6-5 mirror paired **', pass: ms < 80, got: ms + 'ms' });
            })();
            (function() { // T6-5 — toggle B na zaznaczeniu w środku **tekst** → tekst, nie ****tekst****
                var sample = '**hmm**', a = 2, b = 5, o = '**', c = '**', ol = 2, cl = 2;
                var unwrapped = sample;
                if (a >= ol && b + cl <= sample.length && sample.slice(a - ol, a) === o && sample.slice(b, b + cl) === c) {
                    unwrapped = sample.slice(0, a - ol) + sample.slice(a, b) + sample.slice(b + cl);
                }
                results.push({ expr: 'T6-5 unwrap inner bold', pass: unwrapped === 'hmm', got: unwrapped });
            })();

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
            // regresja: kompaktowe zapisy i godziny na „dziś" (wcześniej zwracały null)
            function rdKind(ex) { try { var r = evalCalcExpression(ex); return r && r.kind || ''; } catch (e) { return 'ERR'; } }
            ['dziś + 90 dni', 'dzis+5dni', 'dzis-2dni', 'dziś + 20h', 'dzis + 20h', 'za3tygodnie', '3dnitemu'].forEach(function(ex) {
                var rd = evalCalcExpression(ex);
                results.push({ expr: ex + ' (data/kompakt)', pass: rd && rd.kind === 'date' && !!rd.text, got: rd && rd.text });
            });
            // „teraz" — format DD.M.RR HH:MM (dzień tyg.) — zależy od bieżącego momentu
            results.push({ expr: 'teraz → DD.M.RR HH:MM (dzień)', pass: /^\d+\.\d+\.\d{2} \d{2}:\d{2} \(.+\)$/.test(wdText('teraz')), got: wdText('teraz') });
            results.push({ expr: 'teraz - 2 dni (data)', pass: rdKind('teraz - 2 dni') === 'date' && !!wdText('teraz - 2 dni'), got: wdText('teraz - 2 dni') });
            // waluty — z zamockowanymi kursami (zapis/odtworzenie stanu fx)
            var savedFx = STATE.fx.rates, savedFxTs = STATE.fx.ts;
            STATE.fx.rates = { PLN: 1, EUR: 4.30, USD: 3.95 }; STATE.fx.ts = Date.now();
            results.push({ expr: '12 zł + 20 eur', pass: Math.abs(evalCalcExpression('12 zł + 20 eur').value - 98) < 1e-9, got: evalCalcExpression('12 zł + 20 eur').value });
            results.push({ expr: '20 eur na zł', pass: Math.abs(evalCalcExpression('20 eur na zł').value - 86) < 1e-9, got: evalCalcExpression('20 eur na zł').value });
            var cUnit = evalCalcExpression('100 zł na eur');
            results.push({ expr: '100 zł na eur (jednostka)', pass: cUnit.unit === _smokeCurUnit('EUR') && Math.abs(cUnit.value - Math.round(100 / 4.30 * 100) / 100) < 1e-6, got: cUnit.value + ' ' + cUnit.unit });
            // Miks waluty z jednostką fizyczną — NIE liczymy na siłę (value i unit = null).
            ['12 gb - 12 zł', '12 zł + 5 kg', '12 zł / 2 kg'].forEach(function(ex) {
                var r = evalCalcExpression(ex);
                results.push({ expr: ex + ' (miks waluta+jednostka: NIE liczy)', pass: r.value === null && r.unit === null, got: r.value + ' ' + r.unit });
            });
            // Waluta KOMPONUJE się z finansami/procentami (waluta liczona PRZED parserem naturalnym).
            var compCases = [
                { expr: '12pln - vat', value: Math.round(12 / 1.23 * 100) / 100, unit: 'zł' },     // VAT z kwoty walutowej (glued token)
                { expr: 'brutto 12pln', value: 12 * 1.23, unit: 'zł' },    // brutto + glued token
                { expr: 'brutto 12 zł', value: 12 * 1.23, unit: 'zł' },    // brutto + token ze spacją
                { expr: 'netto 1230 zł', value: 1000, unit: 'zł' },        // netto na kwocie walutowej
                { expr: '1000 zł + vat', value: 1000 * 1.23, unit: 'zł' }, // dodaj VAT do kwoty walutowej
                { expr: '100 usd - vat', value: Math.round((100 * 3.95) / 1.23 * 100) / 100, unit: 'zł' }, // obca waluta: VAT po przeliczeniu na PLN
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
            results.push({ expr: '100 usd na eur (cross)', pass: cross.unit === _smokeCurUnit('EUR') && Math.abs(cross.value - Math.round(100 * 3.95 / 4.30 * 100) / 100) < 1e-6, got: cross.value + ' ' + cross.unit });
            results.push({ expr: '100 usd na eur preciseValue', pass: cross.preciseValue != null && Math.abs(cross.preciseValue - cross.value) > 1e-4, got: cross.preciseValue });
            // Domyślna waluta — gołe sumy zwijają się do ustawionej waluty (nie PLN).
            var savedDef = STATE.settings.defaultCurrency;
            STATE.settings.defaultCurrency = 'EUR';
            var dc1 = evalCalcExpression('20 eur + 10 eur'); // 30 EUR (129 PLN / 4,30)
            results.push({ expr: '20 eur + 10 eur @EUR (domyślna)', pass: dc1.unit === _smokeCurUnit('EUR') && Math.abs(dc1.value - 30) < 1e-6, got: dc1.value + ' ' + dc1.unit });
            var dc2 = evalCalcExpression('43 zł'); // 43 PLN / 4,30 = 10 EUR
            results.push({ expr: '43 zł @EUR (domyślna)', pass: dc2.unit === _smokeCurUnit('EUR') && Math.abs(dc2.value - 10) < 1e-6, got: dc2.value + ' ' + dc2.unit });
            var dc3 = evalCalcExpression('20 eur na zł'); // jawny cel „na zł" WYGRYWA nad domyślną
            results.push({ expr: '20 eur na zł @EUR (jawny cel wygrywa)', pass: dc3.unit === 'zł' && Math.abs(dc3.value - 86) < 1e-9, got: dc3.value + ' ' + dc3.unit });
            STATE.settings.defaultCurrency = 'PLN';
            var dc4 = evalCalcExpression('12 zł + 20 eur'); // z powrotem zł
            results.push({ expr: '12 zł + 20 eur @PLN (domyślna)', pass: dc4.unit === 'zł' && Math.abs(dc4.value - 98) < 1e-9, got: dc4.value + ' ' + dc4.unit });
            STATE.settings.defaultCurrency = savedDef;
            // Etykiety źródeł kursów.
            results.push({ expr: 'fxSourceLabel(merge)', pass: fxSourceLabel('merge') === 'NBP + Frankfurter', got: fxSourceLabel('merge') });
            results.push({ expr: 'fxSourceLabel(frankfurter)', pass: fxSourceLabel('frankfurter') === 'Frankfurter (EBC)', got: fxSourceLabel('frankfurter') });
            // T1-4 — meta kursu (źródło + data) pod wynikiem walutowym
            var savedFxDate = STATE.fx.date, savedFxSrc = STATE.fx.source;
            STATE.fx.date = '2026-07-06'; STATE.fx.source = 'nbp';
            results.push({ expr: 'formatFxMeta(nbp+date)', pass: formatFxMeta() === 'NBP · 06.07.2026', got: formatFxMeta() });
            STATE.fx.date = savedFxDate; STATE.fx.source = savedFxSrc;
            // T1-3 — formaty kopiowania wyniku
            var cf = buildCopyFormats(evalCalcExpression('20 eur na zł'), '20 eur na zł');
            results.push({ expr: 'buildCopyFormats(20 eur na zł).expression', pass: cf && cf.expression.indexOf('20 eur na zł = ') === 0 && cf.withUnit.indexOf('zł') >= 0, got: cf && cf.expression });
            results.push({ expr: 'buildCopyFormats(20 eur na zł).withUnit', pass: cf && /^\d/.test(cf.withUnit), got: cf && cf.withUnit });
            // regresja Raycast-style (07.2026): stopnie w trig, k+waluta, jednostka robocza
            var sDeg = evalCalcExpression('sin(30 deg)');
            results.push({ expr: 'sin(30 deg)', pass: Math.abs(sDeg.value - 0.5) < 1e-9 && !sDeg.unit, got: sDeg.value + ' ' + sDeg.unit });
            var sKzl = evalCalcExpression('2,5k zł');
            results.push({ expr: '2,5k zł', pass: sKzl.unit === 'zł' && Math.abs(sKzl.value - 2500) < 1e-6, got: sKzl.value + ' ' + sKzl.unit });
            var sPctU = evalCalcExpression('19m + 47%');
            results.push({ expr: '19m + 47%', pass: sPctU.unit === 'm' && Math.abs(sPctU.value - 27.93) < 1e-6, got: sPctU.value + ' ' + sPctU.unit });
            // Raycast luki (07.2026 v0.99.29): trig rozszerzony, waluta k, daty, procent okresu, timespan
            var aSin = evalCalcExpression('asin(0.5)');
            results.push({ expr: 'asin(0.5)', pass: Math.abs(aSin.value - Math.PI / 6) < 1e-9, got: aSin.value });
            var sInd = evalCalcExpression('sind(30)');
            results.push({ expr: 'sind(30)', pass: Math.abs(sInd.value - 0.5) < 1e-9, got: sInd.value });
            var usdK = evalCalcExpression('1k usd');
            results.push({ expr: '1k usd', pass: usdK.unit === 'zł' && Math.abs(usdK.value - 3950) < 1e-6, got: usdK.value + ' ' + usdK.unit });
            var usdK2 = evalCalcExpression('usd 1k');
            results.push({ expr: 'usd 1k', pass: usdK2.unit === 'zł' && Math.abs(usdK2.value - 3950) < 1e-6, got: usdK2.value + ' ' + usdK2.unit });
            var pctDiff = evalCalcExpression('różnica % między 30 a 90');
            results.push({ expr: 'różnica % między 30 a 90', pass: pctDiff.unit === '%' && Math.abs(pctDiff.value - 200) < 1e-6, got: pctDiff.value + ' ' + pctDiff.unit });
            var pctDiffEn = evalCalcExpression('percent difference between 30 and 90');
            results.push({ expr: 'percent difference between 30 and 90', pass: pctDiffEn.unit === '%' && Math.abs(pctDiffEn.value - 200) < 1e-6, got: pctDiffEn.value + ' ' + pctDiffEn.unit });
            var pctDiffZ = evalCalcExpression('z 8 na 5 to ile %');
            results.push({ expr: 'z 8 na 5 to ile %', pass: pctDiffZ.unit === '%' && Math.abs(pctDiffZ.value - (-37.5)) < 1e-6, got: pctDiffZ.value + ' ' + pctDiffZ.unit });
            var pctDiffOd = evalCalcExpression('od 8 do 5 o ile procent');
            results.push({ expr: 'od 8 do 5 o ile procent', pass: pctDiffOd.unit === '%' && Math.abs(pctDiffOd.value - (-37.5)) < 1e-6, got: pctDiffOd.value + ' ' + pctDiffOd.unit });
            var plFoldDiff = evalCalcExpression('roznica % miedzy 8 a 5');
            results.push({ expr: 'roznica % miedzy 8 a 5', pass: plFoldDiff.unit === '%' && Math.abs(plFoldDiff.value - (-37.5)) < 1e-6, got: plFoldDiff.value + ' ' + plFoldDiff.unit });
            var plFoldDisc = evalCalcExpression('20% znizki na 150');
            results.push({ expr: '20% znizki na 150', pass: plFoldDisc.value === 120, got: plFoldDisc.value });
            var plFoldHalf = evalCalcExpression('polowa 100');
            results.push({ expr: 'polowa 100', pass: plFoldHalf.value === 50, got: plFoldHalf.value });
            var savedTRead = STATE.settings.defaultUnits.time;
            STATE.settings.defaultUnits.time = '__auto__';
            var dur145 = evalCalcExpression('145 min');
            results.push({ expr: '145 min (czytelny @auto)', pass: dur145.text === '2 h 25 min', got: dur145.text });
            var dur1000h = evalCalcExpression('1000h');
            results.push({ expr: '1000h (@auto → tyg+dni+h)', pass: dur1000h.text === '5 tyg 6 dni 16 h', got: dur1000h.text });
            var dur1000min = evalCalcExpression('1000min');
            results.push({ expr: '1000min (@auto → h+min)', pass: dur1000min.text === '16 h 40 min', got: dur1000min.text });
            STATE.settings.defaultUnits.time = savedTRead;
            var conv800s = evalCalcExpression('800min na s');
            results.push({ expr: '800min na s (jawna → s, nie readable)', pass: conv800s.unit === 's' && conv800s.value === 48000 && conv800s.text == null, got: conv800s.value + ' ' + conv800s.unit + ' text=' + conv800s.text });
            var savedDUtime = STATE.settings.defaultUnits.time;
            STATE.settings.defaultUnits.time = 's';
            var dur145s = evalCalcExpression('145 min');
            results.push({ expr: '145 min @default s (liczba, nie readable)', pass: dur145s.unit === 's' && dur145s.value === 8700 && dur145s.text == null, got: dur145s.value + ' ' + dur145s.unit });
            STATE.settings.defaultUnits.time = savedDUtime;
            var _parser = (typeof window !== 'undefined' && window.MATM0_PARSER) || null;
            if (_parser && _parser.setTodayForTests) {
                _parser.setTodayForTests(new Date(2026, 6, 1));
                var wdOff = evalCalcExpression('poniedziałek za 3 tygodnie');
                results.push({ expr: 'poniedziałek za 3 tygodnie', pass: /27\.7\.2026.*poniedzia[łl]ek/.test(wdOff.text || ''), got: wdOff.text });
                _parser.setNowForTests(new Date(2026, 6, 1, 12, 0, 0));
                var dayPct = evalCalcExpression('ile % dnia');
                results.push({ expr: 'ile % dnia @ południe', pass: dayPct.unit === '%' && Math.abs(dayPct.value - 50) < 0.5, got: dayPct.value + ' ' + dayPct.unit });
                _parser.clearTodayForTests();
                _parser.clearNowForTests();
            }
            var isoRes = evalCalcExpression('2026-03-15T14:30:00Z');
            results.push({ expr: '2026-03-15T14:30:00Z (ISO Zulu)', pass: isoRes.kind === 'date' && /15\.3\.(2026|26)/.test(isoRes.text || ''), got: isoRes.text });
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
                fitCalcLayout: fitCalcLayout,
                fitCalcDisplay: fitCalcDisplay,
                calcLayoutTune: function() { return window.CALC_LAYOUT_TUNE; },
                getCalcLayoutTune: getCalcLayoutTune,
                reapplyCalcTune: window.reapplyCalcLayoutTune,
                previewCurrentCalcLayout: window.previewCurrentCalcLayout,
                resolveAvailHeight: window.resolveCalcAvailHeight,
                resolveAvailHeightDetail: window.resolveCalcAvailHeightDetail,
                previewDisplayCurve: window.previewCalcDisplayCurve,
                plotDisplayCurve: window.plotCalcDisplayCurve,
                previewKeypadFontCurve: window.previewKeypadFontCurve,
                resolveDisplayBudget: window.resolveCalcDisplayBudget,
                resolveKeypadFontScale: window.resolveKeypadFontScale,
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
                formatFxMeta: formatFxMeta,
                buildCopyFormats: buildCopyFormats,
                appendToNotepad: appendToNotepad,
                npExport: npExport,
                getLiveHints: function (expr) { var H = window.MATM0_HINT; return H && H.getLiveHints ? H.getLiveHints(expr) : []; },
                fuzzySuggest: function (expr) { var H = window.MATM0_HINT; return H && H.fuzzySuggest ? H.fuzzySuggest(expr) : null; },
                acFilterStdSuggestions: acFilterStdSuggestions,
            };
        }

    })();
