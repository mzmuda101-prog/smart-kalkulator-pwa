// [PL] Poziome przewijanie palcem (zgłoszenie z telefonu 2026-10-19).
// Globalna blokada touchmove w app.js przepuszczała tylko kontenery przewijane w PIONIE,
// więc paski przewijane w bok (przykłady na pustym ekranie, pasek skrótów, chipy podpowiedzi)
// dostawały preventDefault i stały w miejscu. Na myszce/trackpadzie tego nie widać —
// dlatego test wysyła prawdziwe TouchEvent i sprawdza, czy blokada ich NIE zatrzymała.
const { test, expect } = require('playwright/test');
const H = require('./calc-ui.helpers.js');

test.use({ hasTouch: true });

// Zwraca { overflow, prevented } dla gestu touchmove na pierwszym przycisku w kontenerze.
async function probe(page, sel) {
    return page.evaluate((s) => {
        const host = document.querySelector(s);
        if (!host || getComputedStyle(host).display === 'none') return null;
        const target = host.querySelector('button') || host;
        const r = target.getBoundingClientRect();
        const t = new Touch({ identifier: 1, target, clientX: r.x + 5, clientY: r.y + 5 });
        const ev = new TouchEvent('touchmove', { touches: [t], targetTouches: [t], changedTouches: [t], bubbles: true, cancelable: true });
        target.dispatchEvent(ev);
        return { overflow: host.scrollWidth > host.clientWidth + 1, prevented: ev.defaultPrevented };
    }, sel);
}

test.beforeEach(async ({ page }) => {
    await H.waitAppReady(page);
    await H.clearCalc(page);
});

test.afterEach(async ({ page }) => {
    // nie zostawiaj trybu zdania w profilu kolejnych testów
    await page.evaluate(() => { if (document.body.classList.contains('calc-sentence')) document.querySelector('.calc-layout-toggle').click(); });
});

test('pusty ekran: pasek przykładów przewija się palcem', async ({ page }) => {
    const r = await probe(page, '.calc-start');
    test.skip(!r, 'pasek przykładów widoczny tylko < 1024 px');
    expect(r.overflow).toBeTruthy();
    expect(r.prevented).toBe(false);
});

test('tryb zdania: pasek skrótów i chipy podpowiedzi przewijają się palcem', async ({ page }) => {
    await page.evaluate(() => document.querySelector('.calc-layout-toggle').click());
    await expect(page.locator('body')).toHaveClass(/calc-sentence/);
    const bar = await probe(page, '.calc-key-bar');
    expect(bar && bar.overflow).toBeTruthy();
    expect(bar.prevented).toBe(false);

    await page.locator('#calcExpr').fill('dziś');
    await expect(page.locator('.calc-hint-chip').first()).toBeVisible();
    const chips = await probe(page, '.calc-live-hint');
    expect(chips).not.toBeNull();
    // gdy chipy mieszczą się w całości (tablet), nie ma czego przewijać — blokada jest wtedy OK
    if (chips.overflow) expect(chips.prevented).toBe(false);
});

test('blokada nadal działa poza przewijanymi kontenerami (nagłówek)', async ({ page }) => {
    const r = await probe(page, '.app-header');
    expect(r && r.prevented).toBe(true);
});
