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
                marginStart: 0,
                marginEnd: 0,
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

        // Engineering
        const engLength = $('#engLength');
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
            var num = parseFloat(str);
            if (isNaN(num)) return str;
            // [EN] If integer, don't show decimal point
            if (Number.isInteger(num) && Math.abs(num) < 1e15) return String(num);
            // [EN] Use up to 10 decimal places, strip trailing zeros
            var formatted = num.toPrecision(12);
            return String(parseFloat(formatted));
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
                li.addEventListener('click', function() {
                    // [EN] Reuse history result as current input
                    if (resultPart) {
                        STATE.calc.currentInput = resultPart;
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
            var L = parseFloat(engLength.value) || 0;
            var n = parseInt(engCount.value, 10) || 0;
            var fixedSpacing = parseFloat(engSpacing.value) || 0;
            var ms = parseFloat(engMarginStart.value) || 0;
            var me = parseFloat(engMarginEnd.value) || 0;
            var mode = STATE.eng.mode;

            STATE.eng.length = L;
            STATE.eng.count = n;
            STATE.eng.spacing = fixedSpacing;
            STATE.eng.marginStart = ms;
            STATE.eng.marginEnd = me;

            if (L <= 0 || (mode !== 'fixed' && n <= 0)) {
                engResult.textContent = '⚠️ Wprowadź prawidłową długość i liczbę kołków.';
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
            var positions = placement.positions;

            // [EN] Build result text
            var unit = getUnitLabel();
            var resultText = '📏 Długość: ' + formatNum(L) + ' ' + unit + '\n';
            resultText += '⚙️ Tryb: ' + getPlacementModeLabel(mode) + '\n';
            resultText += '📌 Liczba kołków: ' + positions.length + (mode === 'fixed' ? ' (wyliczona z odstępu)' : '') + '\n';
            resultText += '📐 Odstęp między środkami: ' + formatNum(step) + ' ' + unit + '\n';
            if (ms > 0 || me > 0) {
                resultText += '↔️ Marginesy: ' + formatNum(ms) + ' / ' + formatNum(me) + ' ' + unit + '\n';
            }
            resultText += '\n📍 Pozycje kołków:\n';
            positions.forEach(function(pos, idx) {
                resultText += '  Kołek ' + (idx + 1) + ': ' + formatNum(pos) + ' ' + unit + '\n';
            });

            engResult.textContent = resultText;
            drawEngineeringCanvas(L, ms, me, positions, positions.length, step);
        }

        function calculatePegPositions(totalLength, count, marginStart, marginEnd, fixedSpacing, mode) {
            var usableLength = totalLength - marginStart - marginEnd;
            var positions = [];
            var step = 0;

            if (mode === 'fixed') {
                if (fixedSpacing <= 0) {
                    return { error: '⚠️ Podaj dodatni stały odstęp między kołkami.' };
                }
                var start = marginStart;
                var end = totalLength - marginEnd;
                var safety = 0;
                for (var pos = start; pos <= end + 1e-9 && safety < 100; pos += fixedSpacing) {
                    positions.push(parseFloat(pos.toFixed(6)));
                    safety++;
                }
                if (positions.length === 0) {
                    return { error: '⚠️ Stały odstęp nie mieści żadnego kołka w zadanym polu.' };
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
            return String(formatted);
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

        function drawEngineeringCanvas(totalLength, marginStart, marginEnd, positions, count, step) {
            var ctx = engCtx;
            var w = engCanvas.width;
            var h = engCanvas.height;
            ctx.clearRect(0, 0, w, h);

            var isHorizontal = STATE.eng.axis === 'X';
            var unit = getUnitLabel();

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
                    var x = boardLeft + (pos / totalLength) * boardWidth;

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
                    var y = boardTopV + (pos / totalLength) * boardHeightV;

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
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
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
           [EN] Handle canvas resize for HiDPI
           ============================================================ */
        function handleCanvasResize() {
            var container = engCanvas.parentElement;
            var displayWidth = container.clientWidth;
            if (displayWidth < 300) displayWidth = 300;
            // [EN] Keep internal resolution fixed; CSS handles scaling
            // [EN] Redraw to match new display size
            if (STATE.activeTab === 'engineering') {
                updateEngineering();
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
            loadFromStorage();
            buildCalcButtons();
            updateCalcDisplay();
            renderHistory();
            updateEngineering();
            renderConstants();

            // [EN] Load saved engineering values
            engLength.value = STATE.eng.length;
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
                renderConstants: renderConstants,
                renderHistory: renderHistory,
            };
        }

    })();
