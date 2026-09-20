// [EN] E2E UI — klawiatura, długie wyniki cyfra-po-cyfra, dziwne wyrażenia, layout multi-viewport
const { test, expect } = require('playwright/test');
const cases = require('./smoke-cases.data.js');
const H = require('./calc-ui.helpers.js');

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
    await H.waitAppReady(page);
    await H.clearCalc(page);
});

test('apka startuje — Standard, wynik i wyrażenie widoczne', async ({ page }) => {
    const st = await H.readResultState(page);
    expect(st.text.replace(/\s/g, '')).toMatch(/^0$/);
    await expect(page.locator('#calcExpr')).toBeVisible();
    await expect(page.locator('#calcResult')).toBeVisible();
    expect(st.bodyPanel || st.bodySplit).toBeTruthy();
});

test('cyfry po kolei (22×9) — max 2 linie wyniku, bez clipu ekranika', async ({ page }) => {
    const digits = '9'.repeat(22);
    const log = await H.typeDigitsSequentially(page, digits, 60);
    H.assertMaxTwoLines(log, '22×9');
    H.assertNoDisplayClip(log.filter((e) => e.phase === 'after'), '22×9');
    H.assertWrapUsesPre(log.filter((e) => e.hasWrapClass), '22×9');

    const last = log[log.length - 1];
    expect(last.hasWrapClass || last.logicalLines >= 2).toBeTruthy();
    expect(last.expr.replace(/\s/g, '').length).toBe(22);
});

test('cyfry po kolei (1 + 19 zer) — wynik rośnie, bez błędu UI', async ({ page }) => {
    const digits = '1' + '0'.repeat(19);
    const log = await H.typeDigitsSequentially(page, digits, 50);
    H.assertMaxTwoLines(log, 'bigint typing');
    const last = log[log.length - 1];
    expect(last.expr).toBe(digits);
    expect(last.text.replace(/[\s\u00a0]/g, '')).toMatch(/^10000000000000000000$/);
});

test('wrap — stabilny font po wejściu w 2 linie (kolejne cyfry)', async ({ page }) => {
    const log = await H.typeDigitsSequentially(page, '9'.repeat(18), 55);
    const wrapStart = log.findIndex((e) => e.phase === 'after' && (e.hasWrapClass || e.logicalLines > 1));
    expect(wrapStart, 'powinien wejść w wrap przy długim wyniku').toBeGreaterThan(-1);
    const wrapStep = log[wrapStart].step;
    const fonts = H.uniqueFontSizesAfterWrap(log, wrapStep + 3);
    expect(fonts.length, `font skacze w wrap: ${fonts.join(', ')}`).toBeLessThanOrEqual(2);
});

test('wyrażenia standard — silnik vs UI (subset smoke)', async ({ page }) => {
    for (const c of cases.standard) {
        await H.setExpression(page, c.expr);
        const evalRes = await H.evalExpr(page, c.expr);
        const st = await H.readResultState(page);
        expect(evalRes, `eval null: ${c.expr}`).not.toBeNull();
        expect(evalRes.value, `value null: ${c.expr}`).not.toBeNull();
        const tol = c.tol ?? 1e-6;
        expect(Math.abs(evalRes.value - c.value), `${c.expr} value`).toBeLessThanOrEqual(tol);
        expect(st.text.length, `${c.expr} pusty wynik w DOM`).toBeGreaterThan(0);
        expect(st.displayBottom).toBeGreaterThan(0);
    }
});

test('dziwne wyrażenia — brak crashu, sensowny stan UI', async ({ page }) => {
    for (const c of cases.weird) {
        await H.setExpression(page, c.expr);
        const evalRes = await H.evalExpr(page, c.expr);
        const st = await H.readResultState(page);
        if (c.expectResultText != null) {
            expect(st.text.replace(/\s/g, ''), c.expr).toBe(c.expectResultText);
            continue;
        }
        if (c.noNumeric) {
            expect(evalRes?.value, `${c.expr} nie powinno dawać liczby`).toBeNull();
            continue;
        }
        if (c.allowInfinity) {
            expect(Number.isFinite(evalRes?.value) || evalRes?.error, c.expr).toBeTruthy();
            continue;
        }
        if (c.value != null) {
            const tol = c.tol ?? 1e-6;
            expect(Math.abs((evalRes?.value ?? NaN) - c.value)).toBeLessThanOrEqual(tol);
        }
        H.assertMaxTwoLines([st], c.expr);
    }
});

test('klawisz po klawiszu — łańcuchy keypad (% i działania)', async ({ page }) => {
    for (const chain of cases.keypadChains) {
        await H.clearCalc(page);
        for (const tap of chain.taps) await H.tapKey(page, tap);
        await H.waitResultStable(page);
        const st = await H.readResultState(page);
        const evalRes = await H.evalExpr(page, st.expr);
        expect(evalRes?.value, `keypad ${chain.taps.join('')}`).not.toBeNull();
        expect(Math.abs(evalRes.value - chain.expectValue)).toBeLessThanOrEqual(1e-6);
    }
});

test('pad nie otwiera focusu expr — brak mignięcia klawiatury (mobile)', async ({ page }, testInfo) => {
    test.skip(!['mobile', 'tablet'].includes(testInfo.project.name), 'regresja mobile/tablet');
    await page.locator('#calcExpr').evaluate((el) => el.blur());
    await page.waitForTimeout(80);
    await H.tapKey(page, '7');
    await H.waitResultStable(page);
    const activeId = await page.evaluate(() => document.activeElement && document.activeElement.id);
    expect(activeId, 'tap pada nie powinien zostawiać focus na calcExpr').not.toBe('calcExpr');
    const st = await H.readResultState(page);
    expect(st.expr).toBe('7');
});

test('pad z aktywnym polem — wstawia w pozycji kursora', async ({ page }) => {
    const field = page.locator('#calcExpr');
    await field.click();
    await field.fill('12');
    await field.dispatchEvent('input', { bubbles: true });
    await field.evaluate((el) => { el.focus(); el.setSelectionRange(1, 1); });
    await H.tapKey(page, '9');
    await H.waitResultStable(page);
    const st = await H.readResultState(page);
    expect(st.expr.replace(/\s/g, '')).toBe('192');
});

test('⌫ i AC — edycja i reset', async ({ page }) => {
    await H.typeDigitsSequentially(page, '12345', 40);
    await H.tapKey(page, '⌫');
    await H.waitResultStable(page);
    let st = await H.readResultState(page);
    expect(st.expr).toBe('1234');
    await H.tapKey(page, 'AC');
    await H.waitResultStable(page);
    st = await H.readResultState(page);
    expect(st.expr).toBe('');
    expect(st.text.replace(/\s/g, '')).toBe('0');
});

test('resize viewport w trakcie długiego wyniku — nadal max 2 linie', async ({ page }) => {
    await H.typeDigitsSequentially(page, '9'.repeat(16), 40);
    await page.setViewportSize({ width: 390, height: 844 });
    await H.waitResultStable(page, { timeoutMs: 600 });
    let st = await H.readResultState(page);
    H.assertMaxTwoLines([st], 'po resize mobile');
    await page.setViewportSize({ width: 1280, height: 720 });
    await H.waitResultStable(page, { timeoutMs: 600 });
    await H.typeDigitsSequentially(page, '99', 40);
    const st2 = await H.readResultState(page);
    H.assertMaxTwoLines([st2], 'po resize desktop-low');
});

test('in-app runCalcSmokeTests — PASS w przeglądarce', async ({ page }) => {
    const res = await page.evaluate(() => {
        if (!window.__matm0?.runCalcSmokeTests) return { error: 'brak API' };
        const rows = window.__matm0.runCalcSmokeTests();
        const fail = rows.filter((r) => !r.pass);
        return { total: rows.length, fail: fail.length, samples: fail.slice(0, 5) };
    });
    expect(res.error).toBeUndefined();
    expect(res.fail, JSON.stringify(res.samples, null, 2)).toBe(0);
    expect(res.total).toBeGreaterThan(50);
});

test.describe('desktop-only', () => {
    test.beforeEach(async ({ }, testInfo) => {
        test.skip(!['desktop', 'desktop-low'].includes(testInfo.project.name), 'tylko desktop');
    });

    test('historia zadokowana + długi wynik — max 2 linie, expr nie znika', async ({ page }) => {
        await H.openHistoryIfDesktop(page);
        const log = await H.typeDigitsSequentially(page, '9'.repeat(20), 55);
        H.assertMaxTwoLines(log, 'historia+długi wynik');
        const after = log.filter((e) => e.phase === 'after' && e.step >= 14);
        H.assertNoDisplayClip(after, 'historia+długi wynik');
        const minExpr = Math.min(...after.map((e) => e.exprH).filter((h) => h > 0));
        expect(minExpr, 'expr zbyt niski przy wąskiej karcie').toBeGreaterThanOrEqual(20);
    });
});

// [EN] Regresja: podpowiedź „Nie rozumiem…" MUSI zniknąć, gdy wyrażenie zaczyna się
// liczyć. Na mobile jest to dymek cursor-hint z własnym autoHide 6 s — gdy rodzaj
// 'unknown' wypadnie z listy chowanych, komunikat wisi nad POPRAWNYM wynikiem.
test('mobile: „Nie rozumiem…" znika, gdy wyrażenie zaczyna się liczyć', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'dymek assist tylko przy <600px');
    await H.clearCalc(page);

    const visibleHint = () => page.evaluate(() => {
        const n = [...document.querySelectorAll('.cursor-hint')].find((x) => {
            const cs = getComputedStyle(x);
            return cs.display !== 'none' && cs.visibility !== 'hidden'
                && Number(cs.opacity) > 0.5 && x.textContent.trim();
        });
        return n ? n.textContent.trim() : null;
    });
    const setExpr = (v) => page.evaluate((val) => {
        const el = document.getElementById('calcExpr');
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }, v);

    await setExpr('100 u');
    await page.waitForFunction(() => [...document.querySelectorAll('.cursor-hint')]
        .some((x) => /Nie rozumiem/.test(x.textContent || '') && Number(getComputedStyle(x).opacity) > 0.5),
    { timeout: 4000 });

    await setExpr('100 usd');
    // 1,2 s z zapasem na fade (0,14 s) — ale ZNACZNIE poniżej autoHide dymka (6 s)
    await page.waitForTimeout(1200);
    expect(await visibleHint(), 'stara podpowiedź wisi nad policzonym wynikiem').toBeNull();
});

// [EN] Regresja czasów podpowiedzi. Jeden debounce 300 ms dla wszystkiego oznaczał,
// że przy normalnym tempie pisania (~220 ms/znak) timer resetował się przy każdym
// znaku i podpowiedź „czy chodziło o…" nie pojawiała się NIGDY — tylko przy
// przypadkowej pauzie. Podpowiedź DO KLIKNIĘCIA ma się mieścić między znakami,
// a nieklikalne „Nie rozumiem…" ma NIE przerywać pisania.
test('podpowiedzi: klikalna zdąża w trakcie pisania, „Nie rozumiem" czeka na pauzę', async ({ page }) => {
    await H.clearCalc(page);

    const readHint = () => page.evaluate(() => {
        const bubble = [...document.querySelectorAll('.cursor-hint')]
            .find((x) => Number(getComputedStyle(x).opacity) > 0.5 && x.textContent.trim());
        if (bubble) return bubble.textContent.trim();
        const row = document.getElementById('calcEmptySuggest');
        return row && !row.hidden ? row.textContent.trim() : null;
    });
    const setExpr = (v) => page.evaluate((val) => {
        const el = document.getElementById('calcExpr');
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }, v);

    // 1) pisanie „100 usd" znak po znaku w normalnym tempie — klikalna podpowiedź MUSI zdążyć
    const seen = [];
    for (const step of ['1', '10', '100', '100 ', '100 u', '100 us']) {
        await setExpr(step);
        await page.waitForTimeout(220);
        const h = await readHint();
        if (h) seen.push(h);
    }
    expect(seen.join(' | '), 'klikalna podpowiedź nie zdążyła przy 220 ms/znak').toContain('Czy chodziło o');
    expect(seen.join(' | '), '„Nie rozumiem" przerwało pisanie').not.toContain('Nie rozumiem');

    // 2) gdy człowiek UTKNIE (przestaje pisać) — „Nie rozumiem…" ma się jednak pokazać
    await H.clearCalc(page);
    await setExpr('abcdef');
    await page.waitForFunction(() => {
        const all = [...document.querySelectorAll('.cursor-hint')]
            .filter((x) => Number(getComputedStyle(x).opacity) > 0.5)
            .map((x) => x.textContent || '');
        const row = document.getElementById('calcEmptySuggest');
        if (row && !row.hidden) all.push(row.textContent || '');
        return all.some((t) => /Nie rozumiem/.test(t));
    }, { timeout: 3000 });
});
