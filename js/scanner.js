// @ts-check
// Skaner wzoru: okno pełnoekranowe z ramką na obrazie. "Źródło" (dziś: nieruchomy obraz na canvasie;
// później: kamera, strona PDF) daje canvas do przycięcia — ramka, przycinanie i odczyt są wspólne.
(function () {
    'use strict';
    const win = /** @type {any} */ (window);
    const MIN_W = 48, MIN_H = 24, MAX_SIDE = 2000, MAX_DISPLAY = 4096;
    const DEF = { x: 0.1, y: 0.375, w: 0.8, h: 0.25 }; // awaryjnie; właściwa ramka: defaultFrame()
    const PAD = 22; // połowa uchwytu: uchwyt na krawędzi obrazu nie wychodzi poza scenę
    const CORNERS = ['nw', 'ne', 'sw', 'se'];
    const CORNER_PL = { nw: 'lewy górny', ne: 'prawy górny', sw: 'lewy dolny', se: 'prawy dolny' };

    /** @typedef {{ data: Uint8ClampedArray, width: number, height: number }} Img */

    /** Przycina canvas do prostokąta w pikselach źródła (RGBA). Dłuższy bok > 2000 px zmniejsza.
     * @param {HTMLCanvasElement|OffscreenCanvas} src @param {{x:number,y:number,w:number,h:number}} r @returns {Img} */
    function cropToImage(src, r) {
        const x = Math.max(0, Math.round(r.x)), y = Math.max(0, Math.round(r.y));
        const w = Math.max(1, Math.min(src.width - x, Math.round(r.w))), h = Math.max(1, Math.min(src.height - y, Math.round(r.h)));
        const k = Math.min(1, MAX_SIDE / Math.max(w, h));
        const tw = Math.max(1, Math.round(w * k)), th = Math.max(1, Math.round(h * k));
        const c = document.createElement('canvas'); c.width = tw; c.height = th;
        const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d', { willReadFrequently: true }));
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, tw, th); // przezroczystość = białe tło
        ctx.drawImage(src, x, y, w, h, 0, 0, tw, th);
        const d = ctx.getImageData(0, 0, tw, th);
        return { data: d.data, width: tw, height: th };
    }

    /** @param {string} tag @param {string} [cls] @param {string} [text] */
    function el(tag, cls, text) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text) e.textContent = text;
        return e;
    }
    const icon = (/** @type {string} */ id) => `<svg class="ui-icon" aria-hidden="true"><use href="#${id}"/></svg>`;

    /** @type {null | ReturnType<typeof build>} */ let ui = null;

    function build() {
        const dlg = /** @type {HTMLDialogElement} */ (el('dialog', 'scanner-dialog'));
        dlg.setAttribute('aria-labelledby', 'scannerTitle');
        const head = el('div', 'scanner-head');
        const title = el('h2', 'scanner-title', 'Ustaw ramkę na jednym wzorze'); title.id = 'scannerTitle';
        const close = /** @type {HTMLButtonElement} */ (el('button', 'scanner-close')); close.type = 'button';
        close.setAttribute('aria-label', 'Zamknij'); close.innerHTML = icon('i-x');
        head.append(title, close);

        const stage = el('div', 'scanner-stage');
        const empty = el('div', 'scanner-empty');
        const emptyText = el('p', 'scanner-empty-text', 'Wybierz zdjęcie z jednym wydrukowanym wzorem. Potem ustawisz ramkę na wzorze.');
        const pick = /** @type {HTMLButtonElement} */ (el('button', 'scanner-btn primary', 'Wybierz zdjęcie')); pick.type = 'button';
        empty.append(emptyText, pick);
        const canvas = document.createElement('canvas'); canvas.hidden = true;
        canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Wybrane zdjęcie');
        const frame = el('div', 'scanner-frame'); frame.hidden = true; frame.tabIndex = 0;
        frame.setAttribute('role', 'group');
        frame.setAttribute('aria-label', 'Ramka odczytu. Strzałki przesuwają, z Shift o więcej.');
        const handles = CORNERS.map((c) => {
            const h = /** @type {HTMLButtonElement} */ (el('button', 'scanner-handle')); h.type = 'button';
            h.dataset.corner = c; h.setAttribute('aria-label', 'Rozmiar ramki, ' + CORNER_PL[/** @type {'nw'} */ (c)] + ' róg');
            h.innerHTML = '<span class="scanner-knob"></span>';
            frame.append(h); return h;
        });
        stage.append(empty, canvas, frame);

        const error = el('p', 'scanner-error'); error.hidden = true; error.setAttribute('role', 'alert');
        const bar = el('div', 'scanner-bar');
        const again = /** @type {HTMLButtonElement} */ (el('button', 'scanner-btn', 'Zmień zdjęcie')); again.type = 'button'; again.hidden = true;
        const read = /** @type {HTMLButtonElement} */ (el('button', 'scanner-btn primary')); read.type = 'button';
        read.innerHTML = '<span class="scanner-spinner" aria-hidden="true"></span><span class="scanner-btn-label">Odczytaj</span>';
        read.disabled = true;
        bar.append(again, read);
        const input = /** @type {HTMLInputElement} */ (el('input')); input.type = 'file'; input.accept = 'image/*'; input.hidden = true;
        dlg.append(head, stage, error, bar, input);
        document.body.append(dlg);
        return { dlg, close, stage, empty, canvas, frame, handles, error, again, read, pick, input };
    }

    /** Sprawdza jednorazowo, że dialog zbudowany; reszta stanu żyje w open(). */
    function open(/** @type {{source?: 'camera'|'file'}} */ opts) {
        opts = opts || {};
        if (!ui) { ui = build(); wire(ui); }
        const u = ui;
        const opener = /** @type {HTMLElement|null} */ (document.activeElement);
        st.opener = opener && opener !== document.body ? opener : document.querySelector('.calc-scan-btn');
        resetUi(u);
        if (!u.dlg.open) u.dlg.showModal();
        u.pick.focus();
    }

    /** Stan jednego otwarcia. Ramka znormalizowana (0..1) do widocznego obrazu, więc przeżywa zmianę rozmiaru okna. */
    const st = {
        /** @type {HTMLElement|null} */ opener: null,
        /** @type {{ el: HTMLCanvasElement, width: number, height: number, snapshot: () => HTMLCanvasElement }|null} */ source: null,
        f: { ...DEF },
        busy: false,
        token: 0, // ładowanie pliku
        readId: 0, // odczyt: wynik zastępczego odczytu jest pomijany
    };

    function resetUi(/** @type {NonNullable<typeof ui>} */ u) {
        st.token++; st.readId++; st.busy = false; st.source = null;
        u.canvas.hidden = true; u.frame.hidden = true; u.empty.hidden = false; u.again.hidden = true;
        u.read.disabled = true; clearBusy(u);
        u.error.hidden = true; u.input.value = '';
    }

    function clearBusy(/** @type {NonNullable<typeof ui>} */ u) {
        st.busy = false; u.read.removeAttribute('aria-busy'); u.read.classList.remove('is-busy');
    }

    /** Domyślna ramka: 80% x 25% sceny, na środku, przecięta z widocznym obrazem (krótki obraz dostaje cały). */
    function defaultFrame(/** @type {NonNullable<typeof ui>} */ u) {
        const s = u.stage.getBoundingClientRect(), c = content(u);
        const fw = 0.8 * s.width, fh = 0.25 * s.height;
        let x0 = (s.width - fw) / 2, x1 = x0 + fw, y0 = (s.height - fh) / 2, y1 = y0 + fh;
        // Obraz niższy niż ramka albo szeroki pasek (>= 1,9:1, szerszy niż każde zdjęcie) to już przycięty wzór: bierz cały, nie obcinaj.
        if (c.h <= fh || c.w / c.h >= 1.9) { x0 = c.x; x1 = c.x + c.w; y0 = c.y; y1 = c.y + c.h; }
        x0 = Math.max(x0, c.x); x1 = Math.min(x1, c.x + c.w); y0 = Math.max(y0, c.y); y1 = Math.min(y1, c.y + c.h);
        return { x: (x0 - c.x) / c.w, y: (y0 - c.y) / c.h, w: (x1 - x0) / c.w, h: (y1 - y0) / c.h };
    }

    /** Prostokąt widocznego obrazu w pikselach sceny (object-fit: contain, więc z marginesami). */
    function content(/** @type {NonNullable<typeof ui>} */ u) {
        const s = u.stage.getBoundingClientRect(), src = st.source;
        if (!src) return { x: 0, y: 0, w: s.width, h: s.height, left: s.left, top: s.top };
        const k = Math.min((s.width - 2 * PAD) / src.width, (s.height - 2 * PAD) / src.height);
        const w = src.width * k, h = src.height * k, x = (s.width - w) / 2, y = (s.height - h) / 2;
        return { x, y, w, h, left: s.left, top: s.top };
    }

    function layout(/** @type {NonNullable<typeof ui>} */ u) {
        const c = content(u), f = st.f;
        Object.assign(u.canvas.style, { left: c.x + 'px', top: c.y + 'px', width: c.w + 'px', height: c.h + 'px' });
        Object.assign(u.frame.style, { left: c.x + f.x * c.w + 'px', top: c.y + f.y * c.h + 'px', width: f.w * c.w + 'px', height: f.h * c.h + 'px' });
    }

    /** @param {{x:number,y:number,w:number,h:number}} f @param {{w:number,h:number}} c */
    function clampFrame(f, c) {
        const mw = Math.min(1, MIN_W / c.w), mh = Math.min(1, MIN_H / c.h);
        f.w = Math.min(1, Math.max(mw, f.w)); f.h = Math.min(1, Math.max(mh, f.h));
        f.x = Math.min(1 - f.w, Math.max(0, f.x)); f.y = Math.min(1 - f.h, Math.max(0, f.y));
    }

    /** Przesuwa narożnik (dx, dy w px sceny); przeciwległy zostaje. */
    function dragCorner(/** @type {NonNullable<typeof ui>} */ u, /** @type {string} */ corner, /** @type {typeof st.f} */ start, dx, dy) {
        const c = content(u), west = corner[1] === 'w', north = corner[0] === 'n';
        const fx = dx / c.w, fy = dy / c.h, mw = Math.min(1, MIN_W / c.w), mh = Math.min(1, MIN_H / c.h);
        let x0 = start.x, x1 = start.x + start.w, y0 = start.y, y1 = start.y + start.h;
        if (west) x0 = Math.min(x1 - mw, Math.max(0, x0 + fx)); else x1 = Math.max(x0 + mw, Math.min(1, x1 + fx));
        if (north) y0 = Math.min(y1 - mh, Math.max(0, y0 + fy)); else y1 = Math.max(y0 + mh, Math.min(1, y1 + fy));
        st.f = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
        layout(u);
    }

    function moveFrame(/** @type {NonNullable<typeof ui>} */ u, /** @type {typeof st.f} */ start, dx, dy) {
        const c = content(u);
        st.f = { ...start, x: start.x + dx / c.w, y: start.y + dy / c.h };
        clampFrame(st.f, c); layout(u);
    }

    /** @param {File} file */
    async function loadFile(file) {
        const u = /** @type {NonNullable<typeof ui>} */ (ui);
        const my = ++st.token;
        let bmp;
        try {
            try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } // zdjęcia z telefonu nie leżą na boku
            catch { bmp = await createImageBitmap(file); }
        } catch {
            if (my === st.token) showError(u, 'Nie mogę otworzyć tego pliku. Wybierz zdjęcie (JPG lub PNG).');
            return;
        }
        if (my !== st.token) { bmp.close(); return; }
        const k = Math.min(1, MAX_DISPLAY / Math.max(bmp.width, bmp.height));
        u.canvas.width = Math.max(1, Math.round(bmp.width * k)); u.canvas.height = Math.max(1, Math.round(bmp.height * k));
        const ctx = /** @type {CanvasRenderingContext2D} */ (u.canvas.getContext('2d'));
        ctx.drawImage(bmp, 0, 0, u.canvas.width, u.canvas.height);
        bmp.close();
        useSource(u, { el: u.canvas, width: u.canvas.width, height: u.canvas.height, snapshot: () => u.canvas });
    }

    /** Wspólne wejście dla każdego źródła (zdjęcie, później kamera i PDF). */
    function useSource(/** @type {NonNullable<typeof ui>} */ u, /** @type {NonNullable<typeof st.source>} */ src) {
        st.source = src; st.readId++; clearBusy(u);
        u.error.hidden = true; u.empty.hidden = true; u.canvas.hidden = false; u.frame.hidden = false; u.again.hidden = false;
        u.read.disabled = false;
        st.f = defaultFrame(u);
        layout(u);
        u.frame.focus({ preventScroll: true });
    }

    function showError(/** @type {NonNullable<typeof ui>} */ u, /** @type {string} */ msg) {
        u.error.textContent = msg; u.error.hidden = false;
    }

    function closeDlg(/** @type {NonNullable<typeof ui>} */ u) {
        st.token++; st.readId++; clearBusy(u);
        if (u.dlg.open) u.dlg.close();
        const o = st.opener; if (o && o.isConnected) o.focus();
    }

    async function doRead(/** @type {NonNullable<typeof ui>} */ u) {
        if (st.busy || !st.source) return;
        const my = ++st.readId;
        st.busy = true; u.error.hidden = true;
        u.read.setAttribute('aria-busy', 'true'); u.read.classList.add('is-busy');
        const done = () => { if (my !== st.readId) return false; clearBusy(u); return true; }; // spóźniony odczyt nie rusza nowego stanu
        try {
            const src = st.source.snapshot(), f = st.f;
            // ramka znormalizowana do widocznego obrazu = ułamek pikseli źródła (letterboxing już odjęty w content())
            const crop = cropToImage(src, { x: f.x * src.width, y: f.y * src.height, w: f.w * src.width, h: f.h * src.height });
            const res = await win.MATM0_OCR.read(win.MATM0_FIMG.trimEdgeBlobs(crop));
            if (!done()) return;
            if (res && res.expr && !res.error) {
                const field = /** @type {HTMLTextAreaElement|null} */ (document.getElementById('calcExpr'));
                if (field) { field.value = res.expr; field.dispatchEvent(new Event('input', { bubbles: true })); }
                closeDlg(u);
            } else showError(u, 'Nie odczytałem wzoru. Ustaw ramkę ciaśniej wokół jednego wzoru.');
        } catch (e) {
            if (!done()) return;
            const m = e && /** @type {Error} */ (e).message;
            if (m === 'declined') closeDlg(u);
            else if (m === 'timeout') showError(u, 'Odczyt trwa za długo. Spróbuj z mniejszą ramką.');
            else showError(u, 'Nie odczytałem wzoru. Ustaw ramkę ciaśniej wokół jednego wzoru.');
        }
    }

    function wire(/** @type {NonNullable<typeof ui>} */ u) {
        u.close.addEventListener('click', () => closeDlg(u));
        u.dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeDlg(u); }); // Escape
        u.dlg.addEventListener('close', () => { st.token++; });
        const choose = () => u.input.click();
        u.pick.addEventListener('click', choose); u.again.addEventListener('click', choose);
        u.input.addEventListener('change', () => { const f = u.input.files && u.input.files[0]; if (f) loadFile(f); });
        u.read.addEventListener('click', () => doRead(u));
        new ResizeObserver(() => { if (st.source) layout(u); }).observe(u.stage);

        // Przeciąganie: ramka = przesunięcie, uchwyt = zmiana rozmiaru. touch-action: none tylko tu.
        /** @type {null | { id: number, x: number, y: number, start: typeof st.f, corner: string|null }} */ let drag = null;
        u.frame.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            const h = /** @type {HTMLElement} */ (e.target).closest('.scanner-handle');
            drag = { id: e.pointerId, x: e.clientX, y: e.clientY, start: { ...st.f }, corner: h ? /** @type {HTMLElement} */ (h).dataset.corner || null : null };
            u.frame.setPointerCapture(e.pointerId);
            e.preventDefault();
        });
        u.frame.addEventListener('pointermove', (e) => {
            if (!drag || e.pointerId !== drag.id) return;
            const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
            if (drag.corner) dragCorner(u, drag.corner, drag.start, dx, dy); else moveFrame(u, drag.start, dx, dy);
        });
        const end = (/** @type {PointerEvent} */ e) => { if (drag && e.pointerId === drag.id) drag = null; };
        u.frame.addEventListener('pointerup', end); u.frame.addEventListener('pointercancel', end);

        // Klawiatura: strzałki przesuwają ramkę (uchwyt: jego narożnik) o 8 px, z Shift o 32 px.
        u.frame.addEventListener('keydown', (e) => {
            const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[/** @type {'ArrowLeft'} */ (e.key)];
            if (!d) return;
            e.preventDefault();
            const step = e.shiftKey ? 32 : 8, h = /** @type {HTMLElement} */ (e.target).closest('.scanner-handle');
            const start = { ...st.f };
            if (h) dragCorner(u, /** @type {HTMLElement} */ (h).dataset.corner || 'se', start, d[0] * step, d[1] * step);
            else moveFrame(u, start, d[0] * step, d[1] * step);
        });
    }

    win.MATM0_SCANNER = {
        open, cropToImage,
        /** Tylko do testów: ramka w ułamkach widocznego obrazu. */
        _setFrame(/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ w, /** @type {number} */ h) {
            if (!ui) return; st.f = { x, y, w, h }; layout(ui);
        },
    };
})();
