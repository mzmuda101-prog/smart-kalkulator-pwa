// ============================================================
//  STRAŻNIK GEOMETRII NOTATNIKA (2026-10-01)
//
//  Notatnik = przezroczysta <textarea> nad sformatowanym podglądem (.np-mirror).
//  Telefon (iOS/Android) stawia kursor, kasuje i zaznacza wg METRYK TEXTAREA,
//  a użytkownik widzi PODGLĄD. Każda różnica geometrii między nimi = kursor
//  „gdzie indziej", Backspace kasuje nie ten znak / nie tę linię.
//
//  Zmierzone przed fixem (390 px):
//   • H1 miało 1.34× font → w podglądzie łamało się na 3 wiersze, w textarea
//     na 2 → każda linia niżej przesunięta o 32 px (o cały wiersz),
//   • znaczniki formatowania (PUA U+E000–E01F) miały w textarea pełną
//     szerokość znaku (9,64 px), w podglądzie 0 → na pogrubionej linii kursor
//     1–2 znaki obok.
//
//  Niezmiennik: dla KAŻDEJ linii i KAŻDEJ pozycji kursora textarea i podgląd
//  dają ten sam punkt (±1 px). Jak ten test pęknie — nie łatać hit-testu
//  w JS, tylko przywrócić identyczną geometrię warstw.
// ============================================================
const { test, expect } = require('playwright/test');
const NP = require('./notepad-caret.helpers.js');

const { h1, h2, h3, bold, italic, underline } = NP.MARK;

const TEXT = [
    h1.o + 'Wyjazd w góry na długi weekend majowy z rodziną i psem' + h1.c,
    'Nocleg: 3 * 180',
    bold.o + 'Paliwo' + bold.c + ': 100 + 194',
    h2.o + 'Jedzenie i drobne wydatki po drodze nad morze' + h2.c,
    'Obiad: ' + italic.o + '4 osoby' + italic.c + ' × 45',
    h3.o + 'Bilety' + h3.c + ' i ' + underline.o + 'atrakcje' + underline.c,
    'Kolejka: 2 * 35',
    h1.o + 'Podsumowanie' + h1.c,
    'razem',
].join('\n');

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
    await NP.waitAppReady(page);
    await NP.openNotepad(page);
});

test.afterEach(async ({ page }) => {
    await NP.setFontSize(page, 1).catch(() => {});
    await NP.closeNotepad(page).catch(() => {});
});

async function measure(page) {
    return page.evaluate(async () => {
        await document.fonts.ready;
        const ta = document.querySelector('textarea.np-text');
        const lines = ta.value.split('\n');
        const cs = getComputedStyle(ta);
        const taRect = ta.getBoundingClientRect();
        // klon textarea: ten sam font (z NpMarkers), szerokość, padding, łamanie
        const probe = document.createElement('div');
        for (const k of ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing',
            'paddingLeft', 'paddingRight', 'paddingTop', 'whiteSpace', 'overflowWrap', 'wordBreak', 'boxSizing']) {
            probe.style[k] = cs[k];
        }
        probe.style.position = 'absolute';
        probe.style.visibility = 'hidden';
        probe.style.left = '-9999px';
        probe.style.width = ta.clientWidth + 'px';
        document.body.appendChild(probe);
        // pozycja znaku value[idx] w klonie: span wokół TEGO znaku w pełnym tekście
        // (wstawka typu ZWSP sama byłaby miejscem łamania i fałszowała wynik)
        const taChar = (idx) => {
            probe.textContent = '';
            probe.append(ta.value.slice(0, idx));
            const sp = document.createElement('span');
            sp.textContent = ta.value[idx];
            probe.append(sp);
            probe.append(ta.value.slice(idx + 1));
            const rr = sp.getClientRects();
            const pr = probe.getBoundingClientRect();
            const last = rr[rr.length - 1];
            return { x: taRect.left + (last.right - pr.left), y: taRect.top + (last.top - pr.top) };
        };
        const mLines = Array.from(document.querySelectorAll('.np-mirror-line'));
        const bad = [];
        let lineStart = 0;
        let dy0 = null;
        lines.forEach((raw, li) => {
            const ml = mLines[li];
            if (!ml) { bad.push(`linia ${li}: brak w podglądzie`); return; }
            // indeksy (w całym buforze) widocznych znaków tej linii
            const after = [];
            for (let i = 0; i < raw.length; i++) {
                if (!/[\uE000-\uE01F]/.test(raw[i])) after.push(lineStart + i);
            }
            // lewe krawędzie widocznych znaków w podglądzie (+ prawa ostatniego)
            const mx = [];
            const w = document.createTreeWalker(ml, NodeFilter.SHOW_TEXT);
            let n;
            while ((n = w.nextNode())) {
                for (let i = 0; i < n.length; i++) {
                    const r = document.createRange();
                    r.setStart(n, i); r.setEnd(n, i + 1);
                    const rr = r.getClientRects();
                    const last = rr[rr.length - 1];
                    if (last) mx.push({ right: last.right, top: last.top });
                }
            }
            if (raw.length && mx.length !== after.length) {
                bad.push(`linia ${li}: podgląd ma ${mx.length} znaków, bufor ${after.length}`);
                lineStart += raw.length + 1;
                return;
            }
            for (let k = 0; k < after.length; k++) {
                const p = taChar(after[k]);
                const m = mx[k];
                // wiersz: stała różnica top (półinterlinia) — liczymy względem 1. pomiaru
                const dy = p.y - m.top;
                if (dy0 == null) dy0 = dy;
                if (Math.abs(p.x - m.right) > 1.5 || Math.abs(dy - dy0) > 1.5) {
                    bad.push(`linia ${li} znak ${k} („${raw.replace(/[\uE000-\uE01F]/g, '')[k]}"): textarea x=${p.x.toFixed(1)} y=${(p.y - dy0).toFixed(1)} vs podgląd x=${m.right.toFixed(1)} y=${m.top.toFixed(1)}`);
                    break; // jedna rozbieżność na linię wystarczy
                }
            }
            lineStart += raw.length + 1;
        });
        probe.remove();
        const mirH = document.querySelector('.np-mirror').getBoundingClientRect().height;
        return { bad, taH: taRect.height, mirH };
    });
}

for (const [label, w, h] of [['telefon 390', 390, 844], ['telefon 360', 360, 740], ['tablet 820', 820, 1180], ['laptop 1440', 1440, 900]]) {
    test(`geometria textarea ≡ podgląd: ${label}`, async ({ page }) => {
        await page.setViewportSize({ width: w, height: h });
        await NP.setNotepadText(page, TEXT);
        for (const fs of [1, 0.8, 1.3]) {
            await NP.setFontSize(page, fs);
            await NP.settleLayout(page);
            const m = await measure(page);
            expect(m.bad, `font ${fs * 100}%: rozjazd warstw`).toEqual([]);
            expect(Math.abs(m.taH - m.mirH), `font ${fs * 100}%: wysokość textarea ≠ podgląd`).toBeLessThanOrEqual(1);
        }
    });
}

test('znacznik formatowania ma zerową szerokość w foncie notatnika', async ({ page }) => {
    const w = await page.evaluate(async () => {
        await document.fonts.load('16px NpMarkers', '\uE000');
        const ta = document.querySelector('textarea.np-text');
        const s = document.createElement('span');
        s.style.cssText = 'position:absolute;white-space:pre;visibility:hidden';
        s.style.font = getComputedStyle(ta).font;
        document.body.appendChild(s);
        const out = {};
        for (const [k, t] of [['a', 'a'], ['aMa', 'a\uE000a'], ['aa', 'aa'], ['H1', '\uE013\uE014']]) {
            s.textContent = t;
            out[k] = s.getBoundingClientRect().width;
        }
        s.remove();
        return out;
    });
    expect(w.H1, 'para znaczników H1 zajmuje miejsce').toBeLessThan(0.5);
    expect(Math.abs(w.aMa - w.aa), 'znacznik między literami zajmuje miejsce').toBeLessThan(0.5);
});
