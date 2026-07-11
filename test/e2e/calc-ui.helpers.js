// [EN] Playwright helpers — pointerdown jak klawiatura PWA, stabilizacja layoutu wyniku
const { expect } = require('playwright/test');

async function waitAppReady(page) {
    await page.goto('index.html', { waitUntil: 'networkidle' });
    await page.waitForSelector('#calcResult', { state: 'visible' });
    await page.waitForFunction(() => {
        const splash = document.getElementById('appSplash');
        if (!splash) return true;
        const cs = getComputedStyle(splash);
        return cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0' || splash.hidden;
    }, { timeout: 20_000 }).catch(() => {});
    const tab = page.locator('[data-tab="calculator"]');
    if (await tab.count()) await tab.click();
    await page.waitForSelector('#panel-calculator.active, #panel-calculator.panel.active', { timeout: 5000 }).catch(() => {});
}

async function tapKey(page, action) {
    await page.evaluate((act) => {
        const btn = document.querySelector('.calc-btn[data-action="' + act.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
        if (!btn) throw new Error('calc button not found: ' + act);
        btn.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
    }, action);
    await page.waitForTimeout(10);
}

async function waitResultStable(page, opts = {}) {
    const timeoutMs = opts.timeoutMs ?? 450;
    const stableFrames = opts.stableFrames ?? 3;
    await page.evaluate(({ timeoutMs, stableFrames }) => new Promise((resolve) => {
        const el = document.getElementById('calcResult');
        let last = '';
        let stable = 0;
        const deadline = performance.now() + timeoutMs;
        function tick() {
            if (!el) { resolve(); return; }
            const cs = getComputedStyle(el);
            const display = el.closest('.calc-display');
            const key = [
                el.textContent,
                cs.fontSize,
                el.style.fontSize || '',
                el.clientHeight,
                display?.className || '',
            ].join('|');
            stable = key === last ? stable + 1 : 0;
            last = key;
            if (stable >= stableFrames || performance.now() >= deadline) resolve();
            else requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }), { timeoutMs, stableFrames });
}

async function readResultState(page) {
    return page.evaluate(() => {
        const el = document.getElementById('calcResult');
        const expr = document.getElementById('calcExpr');
        const exprEl = document.querySelector('.calc-expression');
        const row = el?.closest('.calc-result-row');
        const display = el?.closest('.calc-display');
        const cs = el ? getComputedStyle(el) : null;
        const fs = parseFloat(cs?.fontSize) || 16;
        const lh = parseFloat(cs?.lineHeight);
        const lineH = Number.isFinite(lh) && lh > 2 ? lh : fs * 1.1;
        const rect = el?.getBoundingClientRect();
        const displayRect = display?.getBoundingClientRect();
        const rowRect = row?.getBoundingClientRect();
        const text = el?.textContent ?? '';
        const logicalLines = text ? text.split('\n').length : 0;
        return {
            expr: expr?.value ?? '',
            text,
            logicalLines,
            fontSize: cs?.fontSize ?? '',
            inlineFontSize: el?.style.fontSize || null,
            whiteSpace: cs?.whiteSpace ?? '',
            hasWrapClass: display?.classList.contains('calc-result-wrap') ?? false,
            visualLines: lineH > 0 && rect ? Math.max(1, Math.round(rect.height / lineH)) : 0,
            scrollHeight: el?.scrollHeight ?? 0,
            clientHeight: el?.clientHeight ?? 0,
            exprH: exprEl?.offsetHeight ?? 0,
            displayH: display?.clientHeight ?? 0,
            rowBottom: rowRect?.bottom ?? 0,
            displayBottom: displayRect?.bottom ?? 0,
            overflowX: el ? el.scrollWidth > el.clientWidth + 1 : false,
            hasAnim: !!el?.querySelector('.calc-result-new'),
            bodySplit: document.body.classList.contains('calc-split-active'),
            bodyPanel: document.body.classList.contains('calc-panel-active'),
        };
    });
}

async function clearCalc(page) {
    await tapKey(page, 'AC');
    await waitResultStable(page);
}

async function typeDigitsSequentially(page, digits, delayMs = 70) {
    const log = [];
    for (let i = 0; i < digits.length; i++) {
        const ch = digits[i];
        await tapKey(page, ch);
        await page.waitForTimeout(20);
        log.push({ step: i + 1, digit: ch, phase: 'sync', ...(await readResultState(page)) });
        await waitResultStable(page);
        log.push({ step: i + 1, digit: ch, phase: 'after', ...(await readResultState(page)) });
        if (delayMs > 20) await page.waitForTimeout(delayMs - 20);
    }
    return log;
}

async function setExpression(page, expr) {
    const field = page.locator('#calcExpr');
    await field.click();
    await field.fill(expr);
    await field.dispatchEvent('input', { bubbles: true });
    await waitResultStable(page);
}

async function evalExpr(page, expr) {
    return page.evaluate((e) => {
        if (!window.__matm0 || typeof window.__matm0.evalCalcExpression !== 'function') return null;
        return window.__matm0.evalCalcExpression(e);
    }, expr);
}

async function openHistoryIfDesktop(page) {
    const histBtn = page.locator('button').filter({ hasText: /Historia/i }).first();
    if (await histBtn.isVisible().catch(() => false)) {
        await histBtn.click();
        await page.waitForTimeout(300);
        return true;
    }
    return false;
}

function assertMaxTwoLines(entries, label) {
    const bad = entries.filter((e) => e.visualLines > 2 || e.logicalLines > 2);
    expect(bad, `${label}: wykryto >2 linie w wyniku`).toEqual([]);
}

function assertNoDisplayClip(entries, label) {
    const clipped = entries.filter((e) => e.rowBottom > e.displayBottom + 3);
    expect(clipped, `${label}: wynik wystaje poza ekranik`).toEqual([]);
}

function assertWrapUsesPre(entries, label) {
    const wrapEntries = entries.filter((e) => e.hasWrapClass || e.logicalLines > 1);
    const wrongWs = wrapEntries.filter((e) => e.whiteSpace !== 'pre');
    expect(wrongWs, `${label}: wrap powinien używać white-space:pre`).toEqual([]);
}

function uniqueFontSizesAfterWrap(log, fromStep) {
    const after = log.filter((e) => e.phase === 'after' && e.step >= fromStep && (e.hasWrapClass || e.logicalLines > 1));
    return [...new Set(after.map((e) => e.fontSize))];
}

module.exports = {
    waitAppReady,
    tapKey,
    waitResultStable,
    readResultState,
    clearCalc,
    typeDigitsSequentially,
    setExpression,
    evalExpr,
    openHistoryIfDesktop,
    assertMaxTwoLines,
    assertNoDisplayClip,
    assertWrapUsesPre,
    uniqueFontSizesAfterWrap,
};
