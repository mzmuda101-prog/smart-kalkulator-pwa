// ============================================================
//  STRAŻNIK UKŁADU — dwie rzeczy, które realnie się zepsuły.
//
//  1) PASEK ZAKŁADEK ROZPYCHAŁ STRONĘ.
//     .tab-nav było flexem bez overflow-x, a .tab-btn ma white-space:nowrap,
//     więc 4 zakładki nie mieściły się na telefonach ≤390px i cały dokument
//     dostawał scroll poziomy ("Moje Stałe" ucięte przy krawędzi).
//     Zmierzone przed fixem: 320px → body.scrollWidth 368 (48px poza ekran),
//     360 → 368, 390 → 397.
//     Niezmiennik: dokument NIGDY nie przewija się w poziomie; nadmiar zakładek
//     idzie w scroll SAMEGO paska, a aktywna zakładka jest w całości widoczna.
//
//  2) KLAWIATURA CHOWAŁA SIĘ POD ZGIĘCIEM NA LAPTOPIE.
//     scrollOverflow.wideBelowPx=220 + wideBelowShare=0.12 z założenia wypychały
//     kartę pod viewport. Na 1440x900: dolna krawędź "=" na 972px, rząd
//     Historia/Ściąga na 1032px — trzeba było przewijać, żeby wcisnąć "=".
//     Niezmiennik: na typowym laptopie cała karta (z "=" i rzędem narzędzi)
//     mieści się bez przewijania.
//     Furtka: przy naprawdę niskim oknie scroll WOLNO włączyć — wtedy pilnujemy
//     tylko tego, żeby klawisze nie zeszły poniżej sensownego rozmiaru.
//
//  Uruchom:  npx playwright test layout-guard
// ============================================================
const { test, expect } = require('playwright/test');
const H = require('./calc-ui.helpers.js');

const MIN_BTN_PX = 40; // poniżej tego klawiatura przestaje być klikalna

test.describe.configure({ mode: 'serial' });

test('dokument nie przewija się w poziomie (żaden viewport)', async ({ page }) => {
    for (const [w, h] of [[320, 720], [360, 740], [390, 844], [430, 932], [768, 1024], [1280, 800]]) {
        await page.setViewportSize({ width: w, height: h });
        await H.waitAppReady(page);
        const m = await page.evaluate(() => ({
            bodyScrollW: document.body.scrollWidth,
            docW: document.documentElement.clientWidth,
            navScrollW: document.querySelector('.tab-nav').scrollWidth,
            navClientW: document.querySelector('.tab-nav').clientWidth,
        }));
        expect(m.bodyScrollW, `${w}x${h}: strona przewija się w poziomie`).toBeLessThanOrEqual(m.docW + 1);
        // gdy zakładki się nie mieszczą, nadmiar MUSI być w scrollu paska
        if (m.navScrollW > m.navClientW + 1) {
            expect(m.navScrollW, `${w}x${h}: pasek nie ma własnego scrolla`).toBeGreaterThan(m.navClientW);
        }
    }
});

test('aktywna zakładka zawsze w całości widoczna w pasku', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await H.waitAppReady(page);
    for (const tab of ['calculator', 'komenda', 'warsztat', 'constants']) {
        await page.click(`.tab-btn[data-tab="${tab}"]`);
        await page.waitForTimeout(450); // scrollIntoView smooth
        const ok = await page.evaluate(() => {
            const nav = document.querySelector('.tab-nav');
            const act = nav.querySelector('.tab-btn.active');
            const n = nav.getBoundingClientRect(), a = act.getBoundingClientRect();
            return a.left >= n.left - 1 && a.right <= n.right + 1;
        });
        expect(ok, `zakładka "${tab}" nie mieści się w widocznej części paska`).toBeTruthy();
    }
});

test('wygaszenie krawędzi tylko wtedy, gdy jest co przewinąć', async ({ page }) => {
    // szeroko — wszystko się mieści, maski nie zakładamy w ogóle
    await page.setViewportSize({ width: 1280, height: 800 });
    await H.waitAppReady(page);
    let cls = await page.getAttribute('.tab-nav', 'class');
    expect(cls).not.toContain('can-scroll-start');
    expect(cls).not.toContain('can-scroll-end');

    // wąsko — jest co przewinąć w prawo, więc prawa krawędź gaśnie
    await page.setViewportSize({ width: 320, height: 720 });
    await H.waitAppReady(page);
    cls = await page.getAttribute('.tab-nav', 'class');
    expect(cls).toContain('can-scroll-end');
    expect(cls).not.toContain('can-scroll-start'); // start paska — nic w lewo
});

test('klawiatura kalkulatora mieści się na laptopie bez przewijania', async ({ page }) => {
    for (const [w, h] of [[1024, 768], [1280, 800], [1366, 768], [1440, 900], [1920, 1080]]) {
        await page.setViewportSize({ width: w, height: h });
        await H.waitAppReady(page);
        const m = await page.evaluate(() => {
            // ≥1024 rząd .calc-tools jest ukryty — Ściąga siedzi wtedy w karcie przykładów
            const tools = document.querySelector('.calc-tools');
            const help = tools.getClientRects().length ? tools : document.getElementById('calcHelpOpenWide');
            return {
                toolsB: help.getBoundingClientRect().bottom,
                eqB: document.querySelector('.calc-btn--equals').getBoundingClientRect().bottom,
                vh: window.innerHeight,
            };
        });
        expect(m.eqB, `${w}x${h}: "=" pod zgięciem`).toBeLessThanOrEqual(m.vh);
        expect(m.toolsB, `${w}x${h}: Ściąga pod zgięciem`).toBeLessThanOrEqual(m.vh);
    }
});

test('niskie okno — wolno przewijać, ale klawisze zostają klikalne', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await H.waitAppReady(page);
    const btnH = await page.evaluate(
        () => document.querySelector('.calc-btn--number').getBoundingClientRect().height
    );
    expect(btnH, 'klawisze ścisnięte poniżej progu klikalności').toBeGreaterThanOrEqual(MIN_BTN_PX);
});

test('przykłady na szerokim ekranie liczą się po kliknięciu', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await H.waitAppReady(page);
    await expect(page.locator('#calcExamples')).toBeVisible();
    const chip = page.locator('.calc-example-chip').first();
    const expr = await chip.getAttribute('data-expr');
    await chip.click();
    await page.waitForTimeout(500);
    expect(await page.inputValue('#calcExpr')).toBe(expr);
    const res = (await page.textContent('#calcResult')).trim();
    expect(res, `przykład "${expr}" nie policzył się`).not.toBe('');
    expect(res).not.toBe('—');
});

// ============================================================
//  SZEROKI EKRAN (2026-10-01) — zmierzone przed fixem:
//  1280x720 klawisze 111x38 (rząd samej „Ściągi" zjadał ~60 px),
//  2560x1440 karta sztywno 520 px (20% ekranu), klawisze 111x135,
//  Historia 272 px wysokości niezależnie od okna.
// ============================================================
test('szeroki ekran: bez scrolla, klawisze sensowne, Historia do dołu karty', async ({ page }) => {
    for (const [w, h] of [[1280, 720], [1366, 768], [1440, 900], [1920, 1080], [2560, 1440]]) {
        await page.setViewportSize({ width: w, height: h });
        await H.waitAppReady(page);
        await page.waitForTimeout(300);
        const m = await page.evaluate(() => {
            const pn = document.querySelector('.panels');
            const key = document.querySelector('.calc-btn--number').getBoundingClientRect();
            const card = document.querySelector('#panel-calculator > .card').getBoundingClientRect();
            const ex = document.getElementById('calcExamples').getBoundingClientRect();
            return {
                panScroll: pn.scrollHeight - pn.clientHeight,
                keyW: key.width, keyH: key.height,
                cardB: card.bottom, exB: ex.bottom,
            };
        });
        expect(m.panScroll, `${w}x${h}: panel przewija się o ${m.panScroll}px`).toBeLessThanOrEqual(1);
        expect(m.keyH, `${w}x${h}: klawisze za niskie`).toBeGreaterThanOrEqual(48);
        expect(m.keyH / m.keyW, `${w}x${h}: klawisz wyraźnie wyższy niż szerszy`).toBeLessThanOrEqual(1.1);
        expect(Math.abs(m.exB - m.cardB), `${w}x${h}: prawa kolumna nie kończy się z kartą`).toBeLessThanOrEqual(16);
    }
});

test('szeroki ekran: długa Historia przewija się w sobie, nie stronę', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('index.html');
    await page.evaluate(() => {
        const a = [];
        for (let i = 0; i < 40; i++) a.push({ text: `${i}+${i} = ${2 * i}`, pinned: false });
        localStorage.setItem('matm0_calc_history', JSON.stringify(a));
    });
    await H.waitAppReady(page);
    const m = await page.evaluate(() => {
        const pn = document.querySelector('.panels');
        const l = document.getElementById('historyList');
        return { panScroll: pn.scrollHeight - pn.clientHeight, listScroll: l.scrollHeight - l.clientHeight };
    });
    expect(m.panScroll, 'Historia rozepchnęła stronę').toBeLessThanOrEqual(1);
    expect(m.listScroll, 'lista Historii powinna mieć własny scroll').toBeGreaterThan(0);
});

test('szeroki ekran: Ściąga z karty przykładów otwiera pomoc', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await H.waitAppReady(page);
    await expect(page.locator('.calc-tools')).toBeHidden();
    await page.click('#calcHelpOpenWide');
    await expect(page.locator('body')).toHaveClass(/help-open/);
});
