    (function() {
        'use strict';

        /* ============================================================
           [EN] App State
           ============================================================ */
        const STATE = {
            activeTab: 'calculator',
            // Calculator
            calc: {
                currentInput: '0',
                previousInput: '',
                operator: null,
                shouldResetDisplay: false,
                expression: '',
                lastResult: null,
            },
            // Engineering
            eng: {
                unit: 'cm',
                axis: 'X',
                mode: 'between',
                length: 100,
                count: 3,
                spacing: 20,
                origin: 0,
                marginStart: 0,
                marginEnd: 0,
            },
            graph: {
                command: 'f(x)=sin(x)',
                xMin: -10,
                xMax: 10,
                yMin: -10,
                yMax: 10,
                divideMode: 'between',
            },
            // Constants
            constants: [],
            // History
            history: [],
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
            engineering: $('#panel-engineering'),
            graph: $('#panel-graph'),
            constants: $('#panel-constants'),
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

        // Engineering
        const engLength = $('#engLength');
        const engOrigin = $('#engOrigin');
        const engCount = $('#engCount');
        const engSpacing = $('#engSpacing');
        const engMarginStart = $('#engMarginStart');
        const engMarginEnd = $('#engMarginEnd');
        const engCanvas = $('#engCanvas');
        const engCtx = engCanvas.getContext('2d');
        const engResult = $('#engResult');
        const unitToggle = $('#unitToggle');
        const axisToggle = $('#axisToggle');
        const spacingModeToggle = $('#spacingModeToggle');
        const fixedSpacingGroup = $('#fixedSpacingGroup');
        const engCommand = $('#engCommand');
        const engApplyCommandBtn = $('#engApplyCommandBtn');
        const commandHelpOpen = $('#commandHelpOpen');
        const commandHelpClose = $('#commandHelpClose');
        const commandHelpBackdrop = $('#commandHelpBackdrop');
        const commandHelpDrawer = $('#commandHelpDrawer');
        // Zoom / Pan
        const canvasContainer = $('#canvasContainer');
        const zoomInBtn = $('#zoomInBtn');
        const zoomOutBtn = $('#zoomOutBtn');
        const zoomResetBtn = $('#zoomResetBtn');
        const zoomLabel = $('#zoomLabel');
        // [EN] canvasWrapper is created dynamically on init
        let canvasWrapper = null;

        // Graph
        const graphCommand = $('#graphCommand');
        const graphXMin = $('#graphXMin');
        const graphXMax = $('#graphXMax');
        const graphYMin = $('#graphYMin');
        const graphYMax = $('#graphYMax');
        const graphDrawBtn = $('#graphDrawBtn');
        const graphCanvas = $('#graphCanvas');
        const graphCtx = graphCanvas.getContext('2d');
        const graphResult = $('#graphResult');
        const graphDivideLength = $('#graphDivideLength');
        const graphDivideCount = $('#graphDivideCount');
        const graphDivideMode = $('#graphDivideMode');
        const graphDivideStartMargin = $('#graphDivideStartMargin');
        const graphDivideEndMargin = $('#graphDivideEndMargin');
        const graphDivideSpacing = $('#graphDivideSpacing');
        const graphDivideY = $('#graphDivideY');
        const graphBuildDivideBtn = $('#graphBuildDivideBtn');

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
        };

        function loadFromStorage() {
            try {
                const h = localStorage.getItem(STORAGE_KEYS.history);
                if (h) STATE.history = JSON.parse(h);
                const c = localStorage.getItem(STORAGE_KEYS.constants);
                if (c) STATE.constants = JSON.parse(c);
            } catch (e) {
                // [EN] Corrupted data — reset silently
                STATE.history = [];
                STATE.constants = [];
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
            var rounded = Math.abs(num) < 1e308 ? parseFloat(num.toPrecision(12)) : num;
            return rounded.toLocaleString('pl-PL', {
                maximumFractionDigits: maxDigits == null ? 10 : maxDigits,
                useGrouping: true,
            });
        }

        document.addEventListener('pointerdown', function(e) {
            if (e.target.closest('button, .history-item, .calc-result, input[type="button"]')) {
                hapticTap(15);
            }
        }, { passive: true });

        /* ============================================================
           [EN] Tab Navigation
           ============================================================ */
        function switchTab(tabName) {
            STATE.activeTab = tabName;
            tabBtns.forEach(function(btn) {
                var isActive = btn.getAttribute('data-tab') === tabName;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });
            Object.keys(panels).forEach(function(key) {
                panels[key].classList.toggle('active', key === tabName);
            });
            if (tabName === 'engineering') {
                // [EN] Redraw canvas on tab switch (handles any layout shifts)
                setTimeout(function() { updateEngineering(); }, 50);
            }
            if (tabName === 'graph') {
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
            ['AC', 'fn clear', '±', 'fn', '%', 'fn', '÷', 'operator'],
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
                    btn.addEventListener('click', function(e) {
                        handleCalcAction(e.currentTarget.getAttribute('data-action'));
                    });
                    calcGrid.appendChild(btn);
                }
            });
        }

        /* ============================================================
           [EN] Calculator Logic
           ============================================================ */
        function handleCalcAction(action) {
            var c = STATE.calc;

            if (action >= '0' && action <= '9') {
                if (c.shouldResetDisplay) {
                    c.currentInput = '';
                    c.shouldResetDisplay = false;
                }
                if (c.currentInput === '0') {
                    c.currentInput = action;
                } else {
                    c.currentInput += action;
                }
                updateCalcDisplay();
                return;
            }

            if (action === '.') {
                if (c.shouldResetDisplay) {
                    c.currentInput = '0';
                    c.shouldResetDisplay = false;
                }
                if (c.currentInput.indexOf('.') === -1) {
                    c.currentInput += '.';
                }
                updateCalcDisplay();
                return;
            }

            if (action === '±') {
                if (c.currentInput !== '0' && c.currentInput !== '') {
                    if (c.currentInput.charAt(0) === '-') {
                        c.currentInput = c.currentInput.slice(1);
                    } else {
                        c.currentInput = '-' + c.currentInput;
                    }
                }
                updateCalcDisplay();
                return;
            }

            if (action === '%') {
                var val = parseFloat(c.currentInput) || 0;
                c.currentInput = String(val / 100);
                updateCalcDisplay();
                return;
            }

            if (action === '⌫') {
                if (c.currentInput.length > 1) {
                    c.currentInput = c.currentInput.slice(0, -1);
                } else {
                    c.currentInput = '0';
                }
                if (c.currentInput === '-') c.currentInput = '0';
                updateCalcDisplay();
                return;
            }

            if (action === 'AC') {
                c.currentInput = '0';
                c.previousInput = '';
                c.operator = null;
                c.shouldResetDisplay = false;
                c.expression = '';
                c.lastResult = null;
                updateCalcDisplay();
                return;
            }

            // Operators: + − × ÷
            if (action === '+' || action === '−' || action === '×' || action === '÷') {
                if (c.operator && !c.shouldResetDisplay && c.previousInput !== '') {
                    // [EN] Chain operations — compute previous first
                    var result = computeResult();
                    c.previousInput = result;
                    c.expression = formatNumber(result) + ' ' + action + ' ';
                } else {
                    c.previousInput = c.currentInput;
                    c.expression = formatNumber(c.currentInput) + ' ' + action + ' ';
                }
                c.operator = action;
                c.shouldResetDisplay = true;
                updateCalcDisplay();
                return;
            }

            // Equals
            if (action === '=') {
                if (c.operator && c.previousInput !== '') {
                    var exprText = c.expression + formatNumber(c.currentInput);
                    var result = computeResult();
                    addHistory(exprText + ' = ' + formatNumber(result));
                    c.expression = '';
                    c.currentInput = result;
                    c.previousInput = '';
                    c.operator = null;
                    c.shouldResetDisplay = true;
                    c.lastResult = result;
                    updateCalcDisplay();
                }
                return;
            }
        }

        function computeResult() {
            var c = STATE.calc;
            var a = parseFloat(c.previousInput) || 0;
            var b = parseFloat(c.currentInput) || 0;
            var result;
            switch (c.operator) {
                case '+': result = a + b; break;
                case '−': result = a - b; break;
                case '×': result = a * b; break;
                case '÷':
                    if (b === 0) {
                        showToast('⚠️ Nie dziel przez zero!', 'error');
                        return '0';
                    }
                    result = a / b;
                    break;
                default: result = b;
            }
            // [EN] Avoid floating-point artifacts: round to 12 significant digits
            if (Math.abs(result) < 1e308) {
                result = parseFloat(result.toPrecision(12));
            }
            return String(result);
        }

        function formatNumber(str) {
            var num = parseFloat(normalizeNumberText(str));
            if (isNaN(num)) return str;
            return formatLocaleNumber(num, 10);
        }

        function updateCalcDisplay() {
            var c = STATE.calc;
            calcExpr.textContent = c.expression;
            var display = c.shouldResetDisplay && c.operator ? formatNumber(c.previousInput) : formatNumber(c.currentInput);

            // [EN] Auto-size: reduce font for long numbers
            calcResult.textContent = display;
            calcResult.classList.remove('small', 'xsmall');
            if (display.length > 10) {
                calcResult.classList.add('small');
            }
            if (display.length > 14) {
                calcResult.classList.add('xsmall');
            }
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
            var raw = STATE.calc.shouldResetDisplay && STATE.calc.operator ? STATE.calc.previousInput : STATE.calc.currentInput;
            return normalizeNumberText(raw);
        });

        function bindCopyBox(el) {
            bindLongPressCopy(el, function() {
                var text = el.textContent.trim();
                if (!text) return;
                return text;
            });
        }
        bindCopyBox(engResult);
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
                        STATE.calc.currentInput = normalizeNumberText(resultPart);
                        STATE.calc.shouldResetDisplay = true;
                        STATE.calc.operator = null;
                        STATE.calc.previousInput = '';
                        STATE.calc.expression = '';
                        updateCalcDisplay();
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

        function updateEngineering() {
            var L = parseFloat(normalizeNumberText(engLength.value)) || 0;
            var origin = parseFloat(normalizeNumberText(engOrigin.value)) || 0;
            var n = parseInt(engCount.value, 10) || 0;
            var fixedSpacing = parseFloat(normalizeNumberText(engSpacing.value)) || 0;
            var ms = parseFloat(normalizeNumberText(engMarginStart.value)) || 0;
            var me = parseFloat(normalizeNumberText(engMarginEnd.value)) || 0;
            var mode = STATE.eng.mode;

            STATE.eng.length = L;
            STATE.eng.count = n;
            STATE.eng.spacing = fixedSpacing;
            STATE.eng.origin = origin;
            STATE.eng.marginStart = ms;
            STATE.eng.marginEnd = me;

            if (L <= 0 || (mode !== 'fixed' && n <= 0)) {
                engResult.textContent = '⚠️ Wprowadź prawidłową długość i liczbę podziału.';
                drawEmptyCanvas();
                return;
            }

            var usableLength = L - ms - me;
            if (usableLength <= 0) {
                engResult.textContent = '⚠️ Marginesy przekraczają długość całkowitą. Zmniejsz marginesy.';
                drawEmptyCanvas();
                return;
            }

            var placement = calculatePegPositions(L, n, ms, me, fixedSpacing, mode);
            if (placement.error) {
                engResult.textContent = placement.error;
                drawEmptyCanvas();
                return;
            }
            var step = placement.step;
            var positions = placement.positions.map(function(pos) { return pos + origin; });

            // [EN] Build result text
            var unit = getUnitLabel();
            var resultText = '📏 Długość: ' + formatNum(L) + ' ' + unit + '\n';
            resultText += '🎯 Początek osi: ' + formatNum(origin) + ' ' + unit + '\n';
            resultText += '⚙️ Tryb: ' + getPlacementModeLabel(mode) + '\n';
            resultText += '📌 Liczba podziałów: ' + positions.length + (mode === 'fixed' ? ' (wyliczona z odstępu)' : '') + '\n';
            resultText += '📐 Odstęp między środkami: ' + formatNum(step) + ' ' + unit + '\n';
            if (ms > 0 || me > 0) {
                resultText += '↔️ Marginesy: ' + formatNum(ms) + ' / ' + formatNum(me) + ' ' + unit + '\n';
            }
            resultText += '\n📍 Pozycje podziałów:\n';
            positions.forEach(function(pos, idx) {
                resultText += '  Podział ' + (idx + 1) + ': ' + formatNum(pos) + ' ' + unit + '\n';
            });

            engResult.textContent = resultText;
            drawEngineeringCanvas(L, ms, me, positions, positions.length, step, origin);
        }

        function calculatePegPositions(totalLength, count, marginStart, marginEnd, fixedSpacing, mode) {
            var usableLength = totalLength - marginStart - marginEnd;
            var positions = [];
            var step = 0;

            if (mode === 'fixed') {
                if (fixedSpacing <= 0) {
                    return { error: '⚠️ Podaj dodatni stały odstęp między podziałami.' };
                }
                var start = marginStart;
                var end = totalLength - marginEnd;
                var safety = 0;
                for (var pos = start; pos <= end + 1e-9 && safety < 100; pos += fixedSpacing) {
                    positions.push(parseFloat(pos.toFixed(6)));
                    safety++;
                }
                if (positions.length === 0) {
                    return { error: '⚠️ Stały odstęp nie mieści żadnego podziału w zadanym polu.' };
                }
                return { positions: positions, step: fixedSpacing };
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
            if (val === 0) return '0';
            // [EN] Smart formatting: remove trailing zeros but keep reasonable precision
            var formatted = parseFloat(val.toFixed(6));
            return formatLocaleNumber(formatted, 6);
        }

        function formatRawNum(val) {
            if (val === 0) return '0';
            return String(parseFloat(Number(val).toFixed(6)));
        }

        function drawEmptyCanvas() {
            var ctx = engCtx;
            var w = engCanvas.width;
            var h = engCanvas.height;
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '600 16px ' + getComputedStyle(document.body).fontFamily;
            ctx.textAlign = 'center';
            ctx.fillText('⚠️ Nieprawidłowe dane — popraw wartości powyżej', w / 2, h / 2);
        }

        function drawEngineeringCanvas(totalLength, marginStart, marginEnd, positions, count, step, origin) {
            var ctx = engCtx;
            var w = engCanvas.width;
            var h = engCanvas.height;
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
        engLength.addEventListener('input', updateEngineering);
        engOrigin.addEventListener('input', updateEngineering);
        engCount.addEventListener('input', updateEngineering);
        engSpacing.addEventListener('input', updateEngineering);
        engMarginStart.addEventListener('input', updateEngineering);
        engMarginEnd.addEventListener('input', updateEngineering);

        unitToggle.addEventListener('click', function(e) {
            var btn = e.target.closest('.unit-btn');
            if (!btn) return;
            unitToggle.querySelectorAll('.unit-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            STATE.eng.unit = btn.getAttribute('data-unit');
            updateEngineering();
        });

        axisToggle.addEventListener('click', function(e) {
            var btn = e.target.closest('.axis-btn');
            if (!btn) return;
            axisToggle.querySelectorAll('.axis-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            STATE.eng.axis = btn.getAttribute('data-axis');
            updateEngineering();
            showToast('Widok: ' + (STATE.eng.axis === 'X' ? 'Poziomy ⬌' : 'Pionowy ⬍'), '');
        });

        function updateSpacingModeUI() {
            var isFixed = STATE.eng.mode === 'fixed';
            if (fixedSpacingGroup) fixedSpacingGroup.classList.toggle('active', isFixed);
            if (engCount) engCount.disabled = isFixed;
        }

        spacingModeToggle.addEventListener('click', function(e) {
            var btn = e.target.closest('.mode-btn');
            if (!btn) return;
            spacingModeToggle.querySelectorAll('.mode-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            STATE.eng.mode = btn.getAttribute('data-mode');
            updateSpacingModeUI();
            updateEngineering();
        });

        function setToggleActive(container, selector, attr, value) {
            if (!container) return;
            container.querySelectorAll(selector).forEach(function(btn) {
                btn.classList.toggle('active', btn.getAttribute(attr) === value);
            });
        }

        function applyEngineeringCommand(raw) {
            try {
                var config = parsePipeCommand(raw);
                if (!config) {
                    showToast('Komenda: np. x(d)=120/4 | <-10 | ->10 | @edges', 'error');
                    return;
                }
                engLength.value = formatRawNum(config.length);
                engOrigin.value = formatRawNum(config.origin || 0);
                engCount.value = String(config.count);
                engSpacing.value = formatRawNum(config.spacing || (config.length / Math.max(1, config.count)));
                engMarginStart.value = formatRawNum(config.marginStart);
                engMarginEnd.value = formatRawNum(config.marginEnd);
                STATE.eng.axis = config.axis;
                STATE.eng.mode = config.mode;
                if (config.unit) {
                    STATE.eng.unit = config.unit;
                    setToggleActive(unitToggle, '.unit-btn', 'data-unit', config.unit);
                }
                setToggleActive(axisToggle, '.axis-btn', 'data-axis', config.axis);
                setToggleActive(spacingModeToggle, '.mode-btn', 'data-mode', config.mode);
                updateSpacingModeUI();
                updateEngineering();
                showToast('Komenda ustawiona', 'success');
            } catch (err) {
                showToast(err.message || 'Nieprawidłowa komenda', 'error');
            }
        }

        if (engApplyCommandBtn) {
            engApplyCommandBtn.addEventListener('click', function() {
                applyEngineeringCommand(engCommand.value);
            });
        }
        if (engCommand) {
            engCommand.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    applyEngineeringCommand(engCommand.value);
                }
            });
        }

        function openCommandHelp() {
            document.body.classList.add('help-open');
            if (commandHelpDrawer) commandHelpDrawer.setAttribute('aria-hidden', 'false');
        }

        function closeCommandHelp() {
            document.body.classList.remove('help-open');
            if (commandHelpDrawer) commandHelpDrawer.setAttribute('aria-hidden', 'true');
        }

        if (commandHelpOpen) commandHelpOpen.addEventListener('click', openCommandHelp);
        if (commandHelpClose) commandHelpClose.addEventListener('click', closeCommandHelp);
        if (commandHelpBackdrop) commandHelpBackdrop.addEventListener('click', closeCommandHelp);

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
                        return x;
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

            return function(x) {
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

        function drawGraphBase(bounds) {
            var ctx = graphCtx;
            var w = graphCanvas.width;
            var h = graphCanvas.height;
            var pad = 46;
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, w, h);

            var xStep = niceGridStep(bounds.xMax - bounds.xMin);
            var yStep = niceGridStep(bounds.yMax - bounds.yMin);

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

        function parsePipeCommand(command) {
            var raw = String(command || '').trim();
            if (raw.indexOf('|') === -1 && !/^(?:[xy]\s*(?:\(|[:=])|\d)/i.test(raw)) return null;

            var parts = raw.split('|').map(function(part) { return part.trim(); }).filter(Boolean);
            var head = parts.shift() || '';
            var headMatch = head.match(/^(?:([xy])\s*(?:\(\s*([^)]+)\s*\))?\s*[:=]\s*)?(-?\d+(?:[.,]\d+)?)\s*\/\s*(\d+)/i);
            if (!headMatch) return null;

            var config = {
                axis: (headMatch[1] || 'x').toUpperCase(),
                name: (headMatch[2] || 'd').trim(),
                length: parseGraphNumber(headMatch[3], 0),
                count: parseInt(headMatch[4], 10),
                marginStart: 0,
                marginEnd: 0,
                mode: 'between',
                spacing: 0,
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
                    config.spacing = parseGraphNumber(p.split(':')[1], 0);
                    return;
                }
                if (/^(co|step|every|odstep)\s*=/.test(simple)) {
                    config.mode = 'fixed';
                    config.spacing = parseGraphNumber(p.split('=')[1], 0);
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

            if (config.length <= 0 || config.count <= 0) {
                throw new Error('Komenda wymaga dodatniej długości i liczby punktów, np. x(d)=120/4.');
            }
            return config;
        }

        function pointsFromPipeCommand(config) {
            var placement = calculatePegPositions(
                config.length,
                config.count,
                config.marginStart,
                config.marginEnd,
                config.spacing,
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

        function parseDivisionCommand(command) {
            var pipe = parsePipeCommand(command);
            if (pipe) return pipe;

            var text = String(command || '').toLowerCase().replace(/,/g, '.');
            var yMatch = text.match(/\by\s*=\s*(-?\d+(?:\.\d+)?)/);
            var y = yMatch ? parseFloat(yMatch[1]) : 0;

            var fixed = text.match(/od\s+(-?\d+(?:\.\d+)?)\s+do\s+(-?\d+(?:\.\d+)?)\s+co\s+(\d+(?:\.\d+)?)/);
            if (fixed) {
                return {
                    start: parseFloat(fixed[1]),
                    length: parseFloat(fixed[2]) - parseFloat(fixed[1]),
                    spacing: parseFloat(fixed[3]),
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
                var spacing = config.spacing || parseGraphNumber(graphDivideSpacing.value, 0);
                var placement = calculatePegPositions(length, 1, 0, 0, spacing, 'fixed');
                if (placement.error) throw new Error(placement.error.replace('⚠️ ', ''));
                positions = placement.positions;
            } else {
                var count = config.count || parseInt(graphDivideCount.value, 10) || 1;
                var placement2 = calculatePegPositions(length, count, 0, 0, 0, config.mode || 'between');
                if (placement2.error) throw new Error(placement2.error.replace('⚠️ ', ''));
                positions = placement2.positions;
            }

            return positions.map(function(pos) {
                return { x: start + pos, y: y };
            });
        }

        function updateGraph() {
            var command = graphCommand.value.trim();
            var bounds = getGraphBounds();
            STATE.graph.command = command;
            STATE.graph.xMin = bounds.xMin;
            STATE.graph.xMax = bounds.xMax;
            STATE.graph.yMin = bounds.yMin;
            STATE.graph.yMax = bounds.yMax;

            try {
                var division = parseDivisionCommand(command);
                if (division) {
                    var points = buildDivisionPoints(division);
                    if (points.length) {
                        var px = points.map(function(p) { return p.x; });
                        var py = points.map(function(p) { return p.y; });
                        var minX = Math.min.apply(Math, px);
                        var maxX = Math.max.apply(Math, px);
                        var minY = Math.min.apply(Math, py);
                        var maxY = Math.max.apply(Math, py);
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
                    drawPoints(points, bounds, division.label || 'P');
                    graphResult.textContent = (division.axis ? commandSummary(division, points) + '\n\n' : 'Punkty:\n') + points.map(function(p, idx) {
                        return (p.label || 'P') + (idx + 1) + '=(' + formatNum(p.x) + ', ' + formatNum(p.y) + ')';
                    }).join('\n');
                    return;
                }

                var validCount = drawFunction(command, bounds);
                graphResult.textContent = 'Rysuję: ' + stripFunctionPrefix(command) + '\nZakres X: ' + formatNum(bounds.xMin) + ' do ' + formatNum(bounds.xMax) + '\nPróbki poprawne: ' + validCount;
            } catch (err) {
                drawGraphBase(bounds);
                graphResult.textContent = '⚠️ ' + err.message + '\nPrzykłady: f(x)=sin(x), f(x)=x^2-4, x(d)=120/4 | <-10 | ->10 | @edges | y=-1';
            }
        }

        function buildGraphDivisionFromForm() {
            var active = graphDivideMode.querySelector('.mode-btn.active');
            var mode = active ? active.getAttribute('data-mode') : 'between';
            var length = parseGraphNumber(graphDivideLength.value, 120);
            var count = parseInt(graphDivideCount.value, 10) || 1;
            var ms = parseGraphNumber(graphDivideStartMargin.value, 0);
            var me = parseGraphNumber(graphDivideEndMargin.value, 0);
            var spacing = parseGraphNumber(graphDivideSpacing.value, 20);
            var y = parseGraphNumber(graphDivideY.value, -1);
            var placement = calculatePegPositions(length, count, ms, me, spacing, mode);

            if (placement.error) {
                graphResult.textContent = placement.error;
                return;
            }

            var points = placement.positions.map(function(pos) {
                return { x: pos, y: y };
            });
            graphCommand.value = 'x(d)=' + formatRawNum(length) + '/' + count +
                ' | <-' + formatRawNum(ms) +
                ' | ->' + formatRawNum(me) +
                ' | y=' + formatRawNum(y) +
                (mode === 'fixed' ? ' | @every:' + formatRawNum(spacing) : (mode === 'edges' ? ' | @edges' : ' | @between')) +
                ' | label=P';

            var bounds = getGraphBounds();
            if (length > bounds.xMax || 0 < bounds.xMin) {
                graphXMin.value = '0';
                graphXMax.value = formatRawNum(length);
                bounds = getGraphBounds();
            }
            if (y <= bounds.yMin || y >= bounds.yMax) {
                graphYMin.value = formatRawNum(y - 5);
                graphYMax.value = formatRawNum(y + 5);
                bounds = getGraphBounds();
            }
            drawPoints(points, bounds, 'P');
            graphResult.textContent = 'Punkty z kreatora:\n' + points.map(function(p, idx) {
                return 'P' + (idx + 1) + '=(' + formatNum(p.x) + ', ' + formatNum(p.y) + ')';
            }).join('\n');
        }

        graphDrawBtn.addEventListener('click', updateGraph);
        graphCommand.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                updateGraph();
            }
        });
        [graphXMin, graphXMax, graphYMin, graphYMax].forEach(function(input) {
            input.addEventListener('input', updateGraph);
        });
        document.addEventListener('click', function(e) {
            var chip = e.target.closest('.example-chip');
            if (!chip) return;
            var command = chip.getAttribute('data-command') || '';
            if (chip.classList.contains('eng-command-chip')) {
                engCommand.value = command;
                applyEngineeringCommand(command);
                return;
            }
            graphCommand.value = command;
            updateGraph();
        });
        graphDivideMode.addEventListener('click', function(e) {
            var btn = e.target.closest('.mode-btn');
            if (!btn) return;
            graphDivideMode.querySelectorAll('.mode-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            STATE.graph.divideMode = btn.getAttribute('data-mode');
        });
        graphBuildDivideBtn.addEventListener('click', buildGraphDivisionFromForm);

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
                            STATE.calc.currentInput = String(finalVal);
                            STATE.calc.shouldResetDisplay = true;
                            STATE.calc.operator = null;
                            STATE.calc.previousInput = '';
                            STATE.calc.expression = '';
                            updateCalcDisplay();
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
           [EN] Manual Orientation Mode
           Browser support varies; lock works best in installed PWA.
           ============================================================ */
        var orientationModes = ['auto', 'landscape', 'portrait'];
        var orientationModeIndex = 0;

        function setOrientationButton(mode) {
            if (!orientationBtn) return;
            var label;
            var icon;
            if (mode === 'landscape') {
                label = 'Tryb orientacji: poziomy';
                icon = '▭';
            } else if (mode === 'portrait') {
                label = 'Tryb orientacji: pionowy';
                icon = '▯';
            } else {
                label = 'Tryb orientacji: automatyczny';
                icon = 'Auto';
            }
            orientationBtn.textContent = icon;
            orientationBtn.setAttribute('aria-label', label);
            orientationBtn.setAttribute('title', label.replace('Tryb orientacji: ', 'Orientacja: '));
            orientationBtn.classList.toggle('active', mode !== 'auto');
        }

        function lockOrientation(mode) {
            if (!screen.orientation || typeof screen.orientation.lock !== 'function') {
                return Promise.reject(new Error('Ta przeglądarka nie pozwala blokować orientacji.'));
            }
            if (mode === 'auto') {
                if (typeof screen.orientation.unlock === 'function') {
                    screen.orientation.unlock();
                }
                return Promise.resolve();
            }
            return screen.orientation.lock(mode === 'landscape' ? 'landscape' : 'portrait-primary');
        }

        if (orientationBtn) {
            setOrientationButton('auto');
            orientationBtn.addEventListener('click', function() {
                orientationModeIndex = (orientationModeIndex + 1) % orientationModes.length;
                var mode = orientationModes[orientationModeIndex];
                setOrientationButton(mode);
                lockOrientation(mode).then(function() {
                    if (mode === 'auto') {
                        showToast('Orientacja: automatyczna', 'success');
                    } else {
                        showToast('Orientacja: ' + (mode === 'landscape' ? 'pozioma' : 'pionowa'), 'success');
                    }
                }).catch(function() {
                    showToast('Ta przeglądarka blokuje zmianę orientacji poza PWA/fullscreen', 'error');
                });
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
           [EN] Canvas Zoom & Pan
               Zoom: CSS scale via transform on wrapper
               Pan: CSS translate via transform on wrapper
               Canvas always renders at native 900×450
           ============================================================ */
        var zoomState = {
            scale: 1,
            offsetX: 0,
            offsetY: 0,
            minScale: 0.25,
            maxScale: 4,
            step: 0.25, // [EN] Zoom step per button click
        };

        function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

        function applyTransform(animate) {
            if (!canvasWrapper) return;
            /* [EN] Clamp offset so canvas stays reachable */
            var w = canvasContainer.clientWidth;
            var h = canvasContainer.clientHeight;
            var cw = engCanvas.width * zoomState.scale; // [EN] Scaled canvas width
            var ch = engCanvas.height * zoomState.scale; // [EN] Scaled canvas height

            /* [EN] Don't let the image fully escape the viewport */
            zoomState.offsetX = clamp(zoomState.offsetX, -cw + Math.min(w * 0.3, 80), w - Math.min(w * 0.3, 80));
            zoomState.offsetY = clamp(zoomState.offsetY, -ch + Math.min(h * 0.3, 60), h - Math.min(h * 0.3, 60));

            if (animate) {
                canvasWrapper.classList.add('animating');
                /* [EN] Remove class after transition ends so subsequent drags are instant */
                clearTimeout(canvasWrapper._animTimer);
                canvasWrapper._animTimer = setTimeout(function() {
                    canvasWrapper.classList.remove('animating');
                }, 260);
            } else {
                canvasWrapper.classList.remove('animating');
            }

            canvasWrapper.style.transform =
                'translate(' + zoomState.offsetX.toFixed(2) + 'px, ' + zoomState.offsetY.toFixed(2) + 'px) ' +
                'scale(' + zoomState.scale.toFixed(4) + ')';

            updateZoomLabel();
        }

        function updateZoomLabel() {
            if (zoomLabel) {
                zoomLabel.textContent = String(Math.round(zoomState.scale * 100)) + '%';
            }
        }

        function zoomIn() {
            zoomState.scale = clamp(zoomState.scale + zoomState.step, zoomState.minScale, zoomState.maxScale);
            applyTransform(true);
        }

        function zoomOut() {
            zoomState.scale = clamp(zoomState.scale - zoomState.step, zoomState.minScale, zoomState.maxScale);
            applyTransform(true);
        }

        function zoomReset() {
            zoomState.scale = 1;
            zoomState.offsetX = 0;
            zoomState.offsetY = 0;
            applyTransform(true);
        }

        /* [EN] Zoom button events */
        if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn);
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut);
        if (zoomResetBtn) zoomResetBtn.addEventListener('click', zoomReset);

        /* ============================================================
           [EN] Pan — Mouse Drag on canvas container
           ============================================================ */
        var isDragging = false;
        var dragStartX = 0;
        var dragStartY = 0;
        var dragOffX = 0;
        var dragOffY = 0;

        canvasContainer.addEventListener('mousedown', function(e) {
            /* [EN] Only start drag on left button, skip zoom buttons etc. */
            if (e.button !== 0) return;
            isDragging = true;
            canvasContainer.classList.add('dragging');
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            dragOffX = zoomState.offsetX;
            dragOffY = zoomState.offsetY;
            e.preventDefault();
        });

        window.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            zoomState.offsetX = dragOffX + (e.clientX - dragStartX);
            zoomState.offsetY = dragOffY + (e.clientY - dragStartY);
            applyTransform(false);
        });

        window.addEventListener('mouseup', function() {
            if (!isDragging) return;
            isDragging = false;
            canvasContainer.classList.remove('dragging');
        });

        /* ============================================================
           [EN] Pan — Touch drag on canvas container
           ============================================================ */
        var touchId = null;
        var touchStartDist = 0;
        var touchStartScale = 1;
        var pinchMidX = 0;
        var pinchMidY = 0;
        var pinchOffX = 0;
        var pinchOffY = 0;
        var pinchScale = 1;

        canvasContainer.addEventListener('touchstart', function(e) {
            if (e.touches.length === 1) {
                /* [EN] Single finger — pan */
                isDragging = true;
                canvasContainer.classList.add('dragging');
                dragStartX = e.touches[0].clientX;
                dragStartY = e.touches[0].clientY;
                dragOffX = zoomState.offsetX;
                dragOffY = zoomState.offsetY;
                touchId = e.touches[0].identifier;
                /* [EN] Stop swipe gesture from scrolling panels */
                e.preventDefault();
            } else if (e.touches.length === 2) {
                /* [EN] Two fingers — pinch zoom */
                isDragging = false;
                canvasContainer.classList.remove('dragging');
                var dx = e.touches[1].clientX - e.touches[0].clientX;
                var dy = e.touches[1].clientY - e.touches[0].clientY;
                touchStartDist = Math.sqrt(dx * dx + dy * dy);
                touchStartScale = zoomState.scale;
                pinchScale = zoomState.scale;
                /* [EN] Midpoint of the two touches — zoom around this point */
                pinchMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                pinchMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                pinchOffX = zoomState.offsetX;
                pinchOffY = zoomState.offsetY;
                touchId = null;
            }
        }, { passive: false });

        canvasContainer.addEventListener('touchmove', function(e) {
            if (e.touches.length === 1 && isDragging) {
                zoomState.offsetX = dragOffX + (e.touches[0].clientX - dragStartX);
                zoomState.offsetY = dragOffY + (e.touches[0].clientY - dragStartY);
                applyTransform(false);
                e.preventDefault();
            } else if (e.touches.length === 2) {
                var dx = e.touches[1].clientX - e.touches[0].clientX;
                var dy = e.touches[1].clientY - e.touches[0].clientY;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (touchStartDist > 0) {
                    var newScale = clamp(touchStartScale * (dist / touchStartDist), zoomState.minScale, zoomState.maxScale);
                    /* [EN] Zoom around the pinch center point */
                    var scaleRatio = newScale / pinchScale;
                    zoomState.offsetX = pinchMidX - scaleRatio * (pinchMidX - pinchOffX);
                    zoomState.offsetY = pinchMidY - scaleRatio * (pinchMidY - pinchOffY);
                    zoomState.scale = newScale;
                    pinchScale = newScale;
                    pinchOffX = zoomState.offsetX;
                    pinchOffY = zoomState.offsetY;
                    applyTransform(false);
                }
                e.preventDefault();
            }
        }, { passive: false });

        canvasContainer.addEventListener('touchend', function(e) {
            /* [EN] Check if our tracked touch ended */
            var found = false;
            for (var i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === touchId) { found = true; break; }
            }
            if (!found) {
                isDragging = false;
                canvasContainer.classList.remove('dragging');
                touchId = null;
                touchStartDist = 0;
            }
        });

        /* [EN] Wheel zoom on desktop */
        canvasContainer.addEventListener('wheel', function(e) {
            /* [EN] Only zoom when not inside a scrollable panel (let normal scroll pass) */
            e.preventDefault();
            var rect = canvasContainer.getBoundingClientRect();
            /* [EN] Mouse position relative to canvas container */
            var mx = e.clientX - rect.left;
            var my = e.clientY - rect.top;
            /* [EN] Point under cursor in canvas coordinate space */
            var oldScale = zoomState.scale;
            var newScale = clamp(
                oldScale * (e.deltaY < 0 ? 1.1 : 0.9),
                zoomState.minScale,
                zoomState.maxScale
            );
            /* [EN] Adjust offset so the point under cursor stays put */
            var ratio = newScale / oldScale;
            zoomState.offsetX = mx - ratio * (mx - zoomState.offsetX);
            zoomState.offsetY = my - ratio * (my - zoomState.offsetY);
            zoomState.scale = newScale;
            applyTransform(false);
        }, { passive: false });

        /* ============================================================
           [EN] Handle canvas resize for HiDPI
           ============================================================ */
        function handleCanvasResize() {
            if (STATE.activeTab === 'engineering') {
                updateEngineering();
            }
            if (STATE.activeTab === 'graph') {
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
        function init() {
            /* [EN] Wrap canvas for CSS zoom/pan */
            canvasWrapper = document.createElement('div');
            canvasWrapper.className = 'canvas-wrapper';
            engCanvas.parentNode.insertBefore(canvasWrapper, engCanvas);
            canvasWrapper.appendChild(engCanvas);

            loadFromStorage();
            buildCalcButtons();
            updateCalcDisplay();
            renderHistory();
            updateEngineering();
            updateGraph();
            renderConstants();

            // [EN] Load saved engineering values
            engLength.value = STATE.eng.length;
            engOrigin.value = STATE.eng.origin;
            engCount.value = STATE.eng.count;
            engSpacing.value = STATE.eng.spacing;
            engMarginStart.value = STATE.eng.marginStart;
            engMarginEnd.value = STATE.eng.marginEnd;
            updateSpacingModeUI();
        }

        init();

        /* ============================================================
           [EN] Expose minimal API for debugging
           ============================================================ */
        if (typeof window !== 'undefined') {
            window.__matm0 = {
                state: STATE,
                switchTab: switchTab,
                updateEngineering: updateEngineering,
                updateGraph: updateGraph,
                renderConstants: renderConstants,
                renderHistory: renderHistory,
            };
        }

    })();
