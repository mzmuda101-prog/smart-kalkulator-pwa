// @ts-check
// Skaner wzoru: okno pełnoekranowe z ramką na obrazie. "Źródło" (nieruchomy obraz na canvasie albo podgląd
// z kamery albo wybrana strona PDF) daje canvas do przycięcia — ramka, przycinanie i odczyt są wspólne.
(function () {
    'use strict';
    const win = /** @type {any} */ (window);
    const MIN_W = 48, MIN_H = 24, MAX_SIDE = 2000, MAX_DISPLAY = 4096;
    const DEF = { x: 0.1, y: 0.375, w: 0.8, h: 0.25 }; // awaryjnie; właściwa ramka: defaultFrame()
    const PDF_SCALE = 2, PDF_MAX_SIDE = 3000, THUMB_SCALE = 0.3; // strona PDF: 2x, dłuższy bok <= 3000 px; miniatura 0,3x
    const DARK_MEAN = 60; // średnia jasność klatki (0..255) poniżej tego = „za ciemno”
    const PAD = 22; // połowa uchwytu: uchwyt na krawędzi obrazu nie wychodzi poza scenę
    const CORNERS = ['nw', 'ne', 'sw', 'se'];
    const DEBUG = new URLSearchParams(location.search).get('debug') === '1'; // diagnostyka odczytu tylko z ?debug=1
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
        const pages = el('div', 'scanner-pages'); pages.hidden = true; pages.setAttribute('role', 'group'); pages.setAttribute('aria-label', 'Strony PDF');
        const empty = el('div', 'scanner-empty');
        const emptyText = el('p', 'scanner-empty-text', 'Wybierz zdjęcie z jednym wydrukowanym wzorem. Potem ustawisz ramkę na wzorze.');
        const pick = /** @type {HTMLButtonElement} */ (el('button', 'scanner-btn primary', 'Wybierz zdjęcie')); pick.type = 'button';
        empty.append(emptyText, pick);
        const video = /** @type {HTMLVideoElement} */ (el('video')); video.hidden = true;
        video.playsInline = true; video.muted = true; video.autoplay = true; video.setAttribute('aria-label', 'Podgląd z aparatu');
        // Podgląd na żywo rysujemy sami na canvasie (cover liczony w JS): WebKit na iOS dopasowuje warstwę wideo z kamery
        // do NIEobróconej klatki i pokazuje ją pomniejszoną na środku, niezależnie od object-fit. <video> gra pod spodem.
        const preview = document.createElement('canvas'); preview.className = 'scanner-preview'; preview.hidden = true; preview.setAttribute('aria-hidden', 'true');
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
        const hint = el('p', 'scanner-hint'); hint.hidden = true; hint.setAttribute('aria-live', 'polite');
        const torch = /** @type {HTMLButtonElement} */ (el('button', 'scanner-torch', 'Latarka')); torch.type = 'button'; torch.hidden = true;
        torch.setAttribute('aria-pressed', 'false');
        stage.append(empty, video, canvas, preview, frame, hint, torch, pages);

        const error = el('p', 'scanner-error'); error.hidden = true; error.setAttribute('role', 'alert');
        /** @type {null | { box: HTMLElement, out: HTMLElement, save: HTMLButtonElement }} */ let debug = null;
        if (DEBUG) {
            const box = el('div', 'scanner-debug'); box.hidden = true;
            const out = el('pre', 'scanner-debug-out');
            const save = /** @type {HTMLButtonElement} */ (el('button', 'scanner-btn', 'Zapisz wycinek')); save.type = 'button';
            box.append(out, save); debug = { box, out, save };
        }
        const bar = el('div', 'scanner-bar');
        const again = /** @type {HTMLButtonElement} */ (el('button', 'scanner-btn', 'Zmień zdjęcie')); again.type = 'button'; again.hidden = true;
        const read = /** @type {HTMLButtonElement} */ (el('button', 'scanner-btn primary')); read.type = 'button';
        read.innerHTML = '<span class="scanner-spinner" aria-hidden="true"></span><span class="scanner-btn-label">Odczytaj</span>';
        read.disabled = true;
        const shoot = /** @type {HTMLButtonElement} */ (el('button', 'scanner-btn primary', 'Zrób')); shoot.type = 'button'; shoot.hidden = true;
        const gallery = /** @type {HTMLButtonElement} */ (el('button', 'scanner-btn', 'Wybierz zdjęcie lub PDF')); gallery.type = 'button'; gallery.hidden = true;
        const otherPage = /** @type {HTMLButtonElement} */ (el('button', 'scanner-btn', 'Inna strona')); otherPage.type = 'button'; otherPage.hidden = true;
        bar.append(gallery, otherPage, again, shoot, read);
        const input = /** @type {HTMLInputElement} */ (el('input')); input.type = 'file'; input.accept = 'image/*,application/pdf'; input.hidden = true;
        dlg.append(head, stage, error, ...(debug ? [debug.box] : []), bar, input);
        document.body.append(dlg);
        return { dlg, title, pages, otherPage, close, stage, empty, emptyText, video, preview, debug, hint, torch, shoot, gallery, canvas, frame, handles, error, again, read, pick, input };
    }

    /** Sprawdza jednorazowo, że dialog zbudowany; reszta stanu żyje w open(). */
    function open(/** @type {{source?: 'camera'|'file'}} */ opts) {
        opts = opts || {};
        if (!ui) { ui = build(); wire(ui); }
        const u = ui;
        const opener = /** @type {HTMLElement|null} */ (document.activeElement);
        st.opener = opener && opener !== document.body ? opener : document.querySelector('.calc-scan-btn');
        resetUi(u);
        if (win.MATM0_OCR) win.MATM0_OCR.keep();
        if (!u.dlg.open) u.dlg.showModal();
        if (opts.source !== 'file' && win.navigator.mediaDevices && win.navigator.mediaDevices.getUserMedia) startCamera(u);
        else showFallback(u, opts.source === 'file' ? 'Wybierz zdjęcie z jednym wydrukowanym wzorem. Potem ustawisz ramkę na wzorze.' : undefined);
    }

    /** Stan jednego otwarcia. Ramka znormalizowana (0..1) do widocznego obrazu, więc przeżywa zmianę rozmiaru okna. */
    const st = {
        /** @type {HTMLElement|null} */ opener: null,
        /** @type {{ el: HTMLCanvasElement|HTMLVideoElement, width: number, height: number, cover?: boolean, snapshot: () => HTMLCanvasElement }|null} */ source: null,
        f: { ...DEF },
        busy: false,
        /** @type {any} */ pdf: null, // otwarty dokument PDF (żyje, dopóki okno albo wybór innego pliku go nie zwolni)
        picking: false, // na scenie lista miniatur stron
        /** @type {IntersectionObserver|null} */ thumbs: null,
        /** @type {any[]} */ tasks: [], // rendery miniatur
        /** @type {{ task: any, canvas: HTMLCanvasElement }|null} */ pickTask: null, // render wybranej strony (2x)
        token: 0, // ładowanie pliku
        readId: 0, // odczyt: wynik zastępczego odczytu jest pomijany
        /** @type {'camera'|'file'|'fallback'} */ mode: 'fallback',
        shot: false, // w trybie kamery: na scenie stoi zrobione zdjęcie, nie podgląd
        camId: 0, // start kamery: spóźniony strumień po zamknięciu/zmianie trybu jest zatrzymywany
        /** @type {MediaStream|null} */ stream: null,
        /** @type {ReturnType<typeof setInterval>|null} */ timer: null,
        raf: 0, // pętla rysowania podglądu
        torchOn: false,
        hintKind: '',
    };

    function resetUi(/** @type {NonNullable<typeof ui>} */ u) {
        st.token++; st.readId++; st.busy = false; st.source = null; st.shot = false;
        leavePdf(u); stopCamera(u); setHint(u, '');
        u.canvas.hidden = true; u.video.hidden = true; u.frame.hidden = true; u.empty.hidden = true;
        u.read.disabled = true; clearBusy(u);
        u.error.hidden = true; u.input.value = '';
        if (u.debug) u.debug.box.hidden = true;
        setMode(u, 'fallback'); u.empty.hidden = true;
    }

    /** Przyciski paska zależą od trybu i od tego, czy na scenie stoi zrobione zdjęcie. */
    function setMode(/** @type {NonNullable<typeof ui>} */ u, /** @type {typeof st.mode} */ mode) {
        st.mode = mode;
        const cam = mode === 'camera', live = cam && !st.shot;
        u.shoot.hidden = !live; u.gallery.hidden = !cam;
        u.again.hidden = !(mode === 'file' || (cam && st.shot));
        u.again.textContent = cam ? 'Zrób ponownie' : st.pdf ? 'Zmień plik' : 'Zmień zdjęcie';
        u.read.hidden = st.picking || !(mode === 'file' || (cam && st.shot));
        u.otherPage.hidden = !(mode === 'file' && st.pdf && st.pdf.numPages > 1 && !st.picking);
    }

    function setHint(/** @type {NonNullable<typeof ui>} */ u, /** @type {string} */ text, kind = '') {
        u.hint.textContent = text; u.hint.hidden = !text; st.hintKind = text ? kind : '';
    }

    /** Brak kamery albo odmowa: komunikat i wybór pliku. */
    function showFallback(/** @type {NonNullable<typeof ui>} */ u, /** @type {string} */ msg = 'Nie mam dostępu do aparatu.') {
        stopCamera(u); setMode(u, 'fallback');
        u.video.hidden = true; u.canvas.hidden = true; u.frame.hidden = true;
        u.emptyText.textContent = msg;
        u.pick.textContent = 'Wybierz zdjęcie lub PDF';
        u.empty.hidden = false; u.pick.focus();
    }

    function stopCamera(/** @type {NonNullable<typeof ui>} */ u) {
        st.camId++;
        if (st.timer) { clearInterval(st.timer); st.timer = null; }
        cancelAnimationFrame(st.raf); st.raf = 0; u.preview.hidden = true;
        if (st.stream) { st.stream.getTracks().forEach((t) => t.stop()); st.stream = null; }
        u.video.srcObject = null; u.torch.hidden = true; st.torchOn = false; u.torch.setAttribute('aria-pressed', 'false');
    }

    async function startCamera(/** @type {NonNullable<typeof ui>} */ u) {
        stopCamera(u); // nigdy dwóch strumieni naraz
        leavePdf(u);
        const my = st.camId;
        st.shot = false; st.source = null; u.error.hidden = true; u.empty.hidden = true; u.canvas.hidden = true; u.frame.hidden = true;
        setHint(u, ''); setMode(u, 'camera'); u.shoot.disabled = true;
        const md = win.navigator.mediaDevices;
        try {
            let s;
            try { s = await md.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }); }
            catch (e) { if (e && /** @type {Error} */ (e).name === 'OverconstrainedError') s = await md.getUserMedia({ video: true, audio: false }); else throw e; }
            if (my !== st.camId) { s.getTracks().forEach((t) => t.stop()); return; }
            st.stream = s; u.video.srcObject = s;
            if (!u.video.videoWidth) { // zamknięcie w trakcie startu (srcObject = null) wysyła „emptied”, więc obietnica nie wisi
                await new Promise((ok) => { const done = () => { u.video.removeEventListener('loadedmetadata', done); u.video.removeEventListener('emptied', done); ok(null); }; u.video.addEventListener('loadedmetadata', done); u.video.addEventListener('emptied', done); });
            }
            if (my !== st.camId) return;
            await u.video.play().catch(() => {});
            if (my !== st.camId) return;
            const v = u.video;
            useSource(u, { el: v, width: v.videoWidth, height: v.videoHeight, cover: true, snapshot: () => u.canvas });
            const pctx2 = /** @type {CanvasRenderingContext2D} */ (u.preview.getContext('2d'));
            const draw = () => {
                if (my !== st.camId) return;
                st.raf = requestAnimationFrame(draw);
                if (st.source?.el !== v || v.readyState < 2) return;
                syncVideo(u); // iOS potrafi zmienić wymiary (obrót) bez zdarzenia „resize”
                const c = content(u), k = u.preview.width / Math.max(1, c.sw);
                pctx2.drawImage(v, c.x * k, c.y * k, c.w * k, c.h * k);
            };
            draw();
            const track = s.getVideoTracks()[0], caps = track && track.getCapabilities && track.getCapabilities();
            // system zabrał kamerę (np. inna aplikacja): w trybie podglądu wznów, inaczej ignoruj
            if (track) track.addEventListener('ended', () => { if (my === st.camId && u.dlg.open && st.mode === 'camera' && !st.shot) startCamera(u); });
            u.torch.hidden = !(caps && /** @type {any} */ (caps).torch);
            u.shoot.disabled = false; u.shoot.focus();
            const probe = document.createElement('canvas'); probe.width = 64; probe.height = 36;
            const pctx = /** @type {CanvasRenderingContext2D} */ (probe.getContext('2d', { willReadFrequently: true }));
            st.timer = setInterval(() => {
                if (st.source?.el !== u.video) return;
                pctx.drawImage(u.video, 0, 0, 64, 36);
                const d = pctx.getImageData(0, 0, 64, 36).data; let sum = 0;
                for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                if (sum / (d.length / 4) < DARK_MEAN) setHint(u, 'Za ciemno — włącz światło', 'dark');
                else if (st.hintKind === 'dark') setHint(u, '');
            }, 500);
        } catch {
            if (my === st.camId) showFallback(u); // odmowa, brak urządzenia, zajęta kamera, błąd: wybór pliku
        }
    }

    /** Zrób: klatka do canvasa, kamera stoi PRZED odczytem (pamięć iPhone'a), ramka zostaje na tym samym kawałku obrazu. */
    function shoot(/** @type {NonNullable<typeof ui>} */ u) {
        const v = u.video;
        if (st.mode !== 'camera' || st.shot || st.source?.el !== v || !v.videoWidth) return;
        const k = Math.min(1, MAX_DISPLAY / Math.max(v.videoWidth, v.videoHeight));
        u.canvas.width = Math.max(1, Math.round(v.videoWidth * k)); u.canvas.height = Math.max(1, Math.round(v.videoHeight * k));
        /** @type {CanvasRenderingContext2D} */ (u.canvas.getContext('2d')).drawImage(v, 0, 0, u.canvas.width, u.canvas.height);
        const f = { ...st.f };
        stopCamera(u); st.shot = true; setHint(u, ''); setMode(u, 'camera');
        useSource(u, { el: u.canvas, width: u.canvas.width, height: u.canvas.height, snapshot: () => u.canvas });
        st.f = f; layout(u); // frakcje obrazu: ten sam wycinek, choć scena pokazuje teraz całe zdjęcie
        doRead(u, true);
    }

    function clearBusy(/** @type {NonNullable<typeof ui>} */ u) {
        st.busy = false; u.read.removeAttribute('aria-busy'); u.read.classList.remove('is-busy');
    }

    /** Domyślna ramka: 80% x 25% sceny, na środku, przecięta z widocznym obrazem (krótki obraz dostaje cały). */
    function defaultFrame(/** @type {NonNullable<typeof ui>} */ u) {
        const s = u.stage.getBoundingClientRect(), c = content(u);
        const fw = 0.8 * s.width, fh = 0.25 * s.height;
        let x0 = (s.width - fw) / 2, x1 = x0 + fw, y0 = (s.height - fh) / 2, y1 = y0 + fh;
        if (st.source && st.source.cover) { // kamera: sama ramka 80% x 25% sceny, bez reguły „cały obraz”
            return { x: (x0 - c.x) / c.w, y: (y0 - c.y) / c.h, w: fw / c.w, h: fh / c.h };
        }
        // Obraz niższy niż ramka albo szeroki pasek (>= 1,9:1, szerszy niż każde zdjęcie) to już przycięty wzór: bierz cały, nie obcinaj.
        if (c.h <= fh || c.w / c.h >= 1.9) { x0 = c.x; x1 = c.x + c.w; y0 = c.y; y1 = c.y + c.h; }
        x0 = Math.max(x0, c.x); x1 = Math.min(x1, c.x + c.w); y0 = Math.max(y0, c.y); y1 = Math.min(y1, c.y + c.h);
        return { x: (x0 - c.x) / c.w, y: (y0 - c.y) / c.h, w: (x1 - x0) / c.w, h: (y1 - y0) / c.h };
    }

    /** Prostokąt widocznego obrazu w pikselach sceny (object-fit: contain, więc z marginesami). */
    function content(/** @type {NonNullable<typeof ui>} */ u) {
        const s = u.stage.getBoundingClientRect(), src = st.source;
        if (!src) return { x: 0, y: 0, w: s.width, h: s.height, left: s.left, top: s.top, sw: s.width, sh: s.height, x0: 0, x1: 1, y0: 0, y1: 1 };
        // contain (zdjęcie): obraz w całości, z marginesami. cover (kamera): obraz większy od sceny, przycięty z boków albo z góry i dołu.
        const k = src.cover ? Math.max(s.width / src.width, s.height / src.height) : Math.min((s.width - 2 * PAD) / src.width, (s.height - 2 * PAD) / src.height);
        const w = src.width * k, h = src.height * k, x = (s.width - w) / 2, y = (s.height - h) / 2;
        // dozwolony zakres ramki (ułamki obrazu): cały obraz dla contain, widoczna scena z PAD dla cover
        const lim = src.cover
            ? { x0: (PAD - x) / w, x1: (s.width - PAD - x) / w, y0: (PAD - y) / h, y1: (s.height - PAD - y) / h }
            : { x0: 0, x1: 1, y0: 0, y1: 1 };
        return { x, y, w, h, left: s.left, top: s.top, sw: s.width, sh: s.height, ...lim };
    }

    /** Obrót telefonu zamienia wymiary strumienia: nowy kształt klatki, więc ramka od nowa. Wymiary zawsze bieżące z <video>. */
    function syncVideo(/** @type {NonNullable<typeof ui>} */ u) {
        const v = u.video, src = st.source;
        if (!src || src.el !== v || !v.videoWidth || (src.width === v.videoWidth && src.height === v.videoHeight)) return;
        src.width = v.videoWidth; src.height = v.videoHeight;
        st.f = defaultFrame(u); layout(u);
    }

    function layout(/** @type {NonNullable<typeof ui>} */ u) {
        const c = content(u), f = st.f;
        Object.assign(/** @type {HTMLElement} */ (st.source ? st.source.el : u.canvas).style, { left: c.x + 'px', top: c.y + 'px', width: c.w + 'px', height: c.h + 'px' });
        if (st.source && st.source.cover) { // podgląd = cała scena; bufor w pikselach ekranu (najwyżej 2x)
            Object.assign(u.preview.style, { left: '0px', top: '0px', width: c.sw + 'px', height: c.sh + 'px' });
            const dpr = Math.min(2, window.devicePixelRatio || 1), pw = Math.max(1, Math.round(c.sw * dpr)), ph = Math.max(1, Math.round(c.sh * dpr));
            if (u.preview.width !== pw || u.preview.height !== ph) { u.preview.width = pw; u.preview.height = ph; }
        }
        Object.assign(u.frame.style, { left: c.x + f.x * c.w + 'px', top: c.y + f.y * c.h + 'px', width: f.w * c.w + 'px', height: f.h * c.h + 'px' });
    }

    /** @param {{x:number,y:number,w:number,h:number}} f @param {{w:number,h:number,x0:number,x1:number,y0:number,y1:number}} c */
    function clampFrame(f, c) {
        const mw = Math.min(1, MIN_W / c.w), mh = Math.min(1, MIN_H / c.h);
        f.w = Math.min(c.x1 - c.x0, Math.max(mw, f.w)); f.h = Math.min(c.y1 - c.y0, Math.max(mh, f.h));
        f.x = Math.min(c.x1 - f.w, Math.max(c.x0, f.x)); f.y = Math.min(c.y1 - f.h, Math.max(c.y0, f.y));
    }

    /** Przesuwa narożnik (dx, dy w px sceny); przeciwległy zostaje. */
    function dragCorner(/** @type {NonNullable<typeof ui>} */ u, /** @type {string} */ corner, /** @type {typeof st.f} */ start, dx, dy) {
        const c = content(u), west = corner[1] === 'w', north = corner[0] === 'n';
        const fx = dx / c.w, fy = dy / c.h, mw = Math.min(1, MIN_W / c.w), mh = Math.min(1, MIN_H / c.h);
        let x0 = start.x, x1 = start.x + start.w, y0 = start.y, y1 = start.y + start.h;
        if (west) x0 = Math.min(x1 - mw, Math.max(c.x0, x0 + fx)); else x1 = Math.max(x0 + mw, Math.min(c.x1, x1 + fx));
        if (north) y0 = Math.min(y1 - mh, Math.max(c.y0, y0 + fy)); else y1 = Math.max(y0 + mh, Math.min(c.y1, y1 + fy));
        st.f = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
        layout(u);
    }

    function moveFrame(/** @type {NonNullable<typeof ui>} */ u, /** @type {typeof st.f} */ start, dx, dy) {
        const c = content(u);
        st.f = { ...start, x: start.x + dx / c.w, y: start.y + dy / c.h };
        clampFrame(st.f, c); layout(u);
    }

    const isPdf = (/** @type {File} */ f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);

    /** Miniatury: odłącz obserwatora, przerwij ich rendery, zwolnij canvasy. */
    function releaseThumbs(/** @type {NonNullable<typeof ui>} */ u) {
        if (st.thumbs) { st.thumbs.disconnect(); st.thumbs = null; }
        st.tasks.forEach((t) => { try { t.cancel(); } catch {} }); st.tasks = [];
        u.pages.querySelectorAll('canvas').forEach((c) => { c.width = c.height = 0; });
        u.pages.replaceChildren(); u.pages.inert = false;
    }

    function cancelPick() {
        const t = st.pickTask; st.pickTask = null;
        if (t) { try { t.task.cancel(); } catch {} t.canvas.width = t.canvas.height = 0; }
    }

    /** Zwalnia PDF: dokument, zadania renderu, miniatury (canvasy). */
    function leavePdf(/** @type {NonNullable<typeof ui>} */ u) {
        cancelPick(); releaseThumbs(u);
        u.pages.hidden = true; st.picking = false;
        u.title.textContent = 'Ustaw ramkę na jednym wzorze';
        const d = st.pdf; st.pdf = null;
        if (d) d.loadingTask.destroy().catch(() => {});
    }

    let pdfjs = null;
    /** pdf.js ładuje się dopiero przy pierwszym PDF-ie, nie przy starcie ani otwarciu skanera. */
    function loadPdfjs() {
        if (!pdfjs) pdfjs = import(/** @type {string} */ (new URL('vendor/pdfjs/pdf.min.mjs', document.baseURI).href)).then((m) => {
            m.GlobalWorkerOptions.workerSrc = new URL('vendor/pdfjs/pdf.worker.min.mjs', document.baseURI).href;
            return m;
        }, (e) => { pdfjs = null; throw e; });
        return pdfjs;
    }

    /** @param {File} file */
    async function loadPdf(file) {
        const u = /** @type {NonNullable<typeof ui>} */ (ui);
        const my = ++st.token;
        let doc, task;
        try {
            const lib = await loadPdfjs();
            task = lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, useSystemFonts: true });
            doc = await task.promise;
        } catch {
            if (task) task.destroy().catch(() => {});
            if (my === st.token) showError(u, 'Nie mogę otworzyć tego PDF-u.');
            return;
        }
        if (my !== st.token) { doc.loadingTask.destroy().catch(() => {}); return; }
        leavePdf(u); stopCamera(u); st.shot = false; st.source = null; setHint(u, ''); u.video.hidden = true; st.pdf = doc;
        if (doc.numPages === 1) { pickPage(u, 1); return; }
        showPicker(u);
    }

    /** Lista miniatur: każda strona renderuje się dopiero, gdy wjedzie w widok (PDF może mieć 100+ stron). */
    function showPicker(/** @type {NonNullable<typeof ui>} */ u) {
        const doc = st.pdf; if (!doc) return;
        st.picking = true; st.source = null; st.readId++; clearBusy(u);
        u.canvas.hidden = true; u.frame.hidden = true; u.empty.hidden = true; u.error.hidden = true; u.read.disabled = true;
        u.title.textContent = 'Wybierz stronę';
        u.pages.replaceChildren();
        const frag = document.createDocumentFragment();
        for (let n = 1; n <= doc.numPages; n++) {
            const b = /** @type {HTMLButtonElement} */ (el('button', 'scanner-page')); b.type = 'button'; b.dataset.page = String(n);
            b.setAttribute('aria-label', 'Strona ' + n);
            b.append(document.createElement('canvas'), el('span', 'scanner-page-label', 'Strona ' + n));
            frag.append(b);
        }
        u.pages.append(frag); u.pages.hidden = false; u.pages.scrollTop = 0;
        setMode(u, 'file');
        st.thumbs = new IntersectionObserver((entries) => {
            for (const e of entries) if (e.isIntersecting) { st.thumbs?.unobserve(e.target); renderThumb(doc, /** @type {HTMLElement} */ (e.target)); }
        }, { root: u.pages, rootMargin: '200px' });
        u.pages.querySelectorAll('.scanner-page').forEach((b) => st.thumbs?.observe(b));
        /** @type {HTMLElement|null} */ (u.pages.firstElementChild)?.focus({ preventScroll: true });
    }

    async function renderThumb(/** @type {any} */ doc, /** @type {HTMLElement} */ btn) {
        let task;
        try {
            const page = await doc.getPage(Number(btn.dataset.page));
            if (st.pdf !== doc) return;
            const vp = page.getViewport({ scale: THUMB_SCALE }), c = /** @type {HTMLCanvasElement} */ (btn.querySelector('canvas'));
            c.width = Math.round(vp.width); c.height = Math.round(vp.height);
            task = page.render({ canvas: c, viewport: vp, background: '#fff' });
            st.tasks.push(task);
            await task.promise;
        } catch { /* anulowane przy zamknięciu albo uszkodzona strona: miniatura zostaje pusta, numer widać */ }
        finally { if (task) st.tasks = st.tasks.filter((t) => t !== task); }
    }

    /** Wybrana strona: 2x (dłuższy bok <= 3000 px) na canvasie, dalej jak zdjęcie. Jeden render naraz: lista jest inert, dopóki trwa. */
    async function pickPage(/** @type {NonNullable<typeof ui>} */ u, /** @type {number} */ n, /** @type {HTMLElement|null} */ btn = null) {
        const doc = st.pdf; if (!doc) return;
        cancelPick();
        const my = ++st.token;
        u.pages.inert = true;
        if (btn) { btn.classList.add('is-busy'); btn.setAttribute('aria-busy', 'true'); }
        const c = document.createElement('canvas'); let ok = false;
        try {
            const page = await doc.getPage(n), base = page.getViewport({ scale: 1 });
            if (my !== st.token || st.pdf !== doc) return;
            const vp = page.getViewport({ scale: Math.min(PDF_SCALE, PDF_MAX_SIDE / Math.max(base.width, base.height)) });
            c.width = Math.round(vp.width); c.height = Math.round(vp.height);
            const task = page.render({ canvas: c, viewport: vp, background: '#fff' });
            st.pickTask = { task, canvas: c };
            await task.promise;
            if (my !== st.token || st.pdf !== doc) return;
            u.canvas.width = c.width; u.canvas.height = c.height;
            /** @type {CanvasRenderingContext2D} */ (u.canvas.getContext('2d')).drawImage(c, 0, 0);
            ok = true;
        } catch {
            if (my === st.token && st.pdf === doc) {
                showError(u, 'Nie mogę otworzyć tego PDF-u.');
                u.pages.inert = false; if (btn) { btn.classList.remove('is-busy'); btn.removeAttribute('aria-busy'); }
            }
            return;
        } finally {
            c.width = c.height = 0;
            if (st.pickTask && st.pickTask.canvas === c) st.pickTask = null;
        }
        if (!ok) return;
        releaseThumbs(u); u.pages.hidden = true; st.picking = false;
        u.title.textContent = 'Ustaw ramkę na jednym wzorze';
        setMode(u, 'file');
        useSource(u, { el: u.canvas, width: u.canvas.width, height: u.canvas.height, snapshot: () => u.canvas });
    }

    /** @param {File} file */
    async function loadFile(file) {
        if (isPdf(file)) return loadPdf(file);
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
        leavePdf(u); stopCamera(u); st.shot = false; setHint(u, ''); setMode(u, 'file'); u.video.hidden = true;
        useSource(u, { el: u.canvas, width: u.canvas.width, height: u.canvas.height, snapshot: () => u.canvas });
    }

    /** Wspólne wejście dla każdego źródła (zdjęcie, później kamera i PDF). */
    function useSource(/** @type {NonNullable<typeof ui>} */ u, /** @type {NonNullable<typeof st.source>} */ src) {
        st.source = src; st.readId++; clearBusy(u);
        u.error.hidden = true; u.empty.hidden = true; u.canvas.hidden = src.el !== u.canvas; u.video.hidden = u.preview.hidden = src.el !== u.video; u.frame.hidden = false;
        u.read.disabled = false;
        st.f = defaultFrame(u);
        layout(u);
        if (st.mode !== 'camera' || st.shot) u.frame.focus({ preventScroll: true });
    }

    function showError(/** @type {NonNullable<typeof ui>} */ u, /** @type {string} */ msg) {
        u.error.textContent = msg; u.error.hidden = false;
    }

    function closeDlg(/** @type {NonNullable<typeof ui>} */ u) {
        st.token++; st.readId++; clearBusy(u); stopCamera(u); leavePdf(u);
        if (u.dlg.open) u.dlg.close();
        const o = st.opener; if (o && o.isConnected) o.focus();
    }

    async function doRead(/** @type {NonNullable<typeof ui>} */ u, /** @type {boolean} */ checkBlur = false) {
        if (st.busy || !st.source) return;
        const my = ++st.readId;
        st.busy = true; u.error.hidden = true;
        u.read.setAttribute('aria-busy', 'true'); u.read.classList.add('is-busy');
        const done = () => { if (my !== st.readId) return false; clearBusy(u); return true; }; // spóźniony odczyt nie rusza nowego stanu
        try {
            const src = st.source.snapshot(), f = st.f;
            // ramka znormalizowana do widocznego obrazu = ułamek pikseli źródła (letterboxing już odjęty w content())
            const crop = cropToImage(src, { x: f.x * src.width, y: f.y * src.height, w: f.w * src.width, h: f.h * src.height });
            if (checkBlur && win.MATM0_FIMG.blurScore(crop) < win.MATM0_FIMG.BLUR_MIN) setHint(u, 'Rozmazane — przytrzymaj telefon nieruchomo', 'blur');
            const res = await win.MATM0_OCR.read(crop, { debug: DEBUG }); // białe tło i skrawki: w workerze
            if (!done()) return;
            if (u.debug) showDebug(u.debug, res);
            if (res && res.expr && !res.error) {
                const field = /** @type {HTMLTextAreaElement|null} */ (document.getElementById('calcExpr'));
                if (field) { field.value = res.expr; field.dispatchEvent(new Event('input', { bubbles: true })); }
                if (!u.debug) closeDlg(u); // diagnostyka: okno zostaje, żeby było widać odczyt
            } else showError(u, 'Nie odczytałem wzoru. Ustaw ramkę ciaśniej wokół jednego wzoru.');
        } catch (e) {
            if (!done()) return;
            const m = e && /** @type {Error} */ (e).message;
            if (m === 'declined') closeDlg(u);
            else if (m === 'timeout') showError(u, 'Odczyt trwa za długo. Spróbuj z mniejszą ramką.');
            else showError(u, 'Nie udało się uruchomić odczytu. Sprawdź połączenie i spróbuj ponownie.'); // pobieranie, offline, worker, silnik
        }
    }

    /** ?debug=1: surowy LaTeX, wynik tłumacza, czas i zapis obrazu, który dostał model (po białym tle i przycięciu). */
    function showDebug(/** @type {NonNullable<NonNullable<typeof ui>['debug']>} */ d, /** @type {any} */ res) {
        d.out.textContent = 'LaTeX: ' + (res && res.latex || '(pusto)') + '\n'
            + (res && res.error ? 'Tłumacz: błąd — ' + res.error : 'Tłumacz: ' + (res && res.expr || '(pusto)')) + '\n'
            + 'Czas: ' + (res && res.ms) + ' ms';
        d.box.hidden = false;
        const img = res && res.img;
        d.save.hidden = !img;
        d.save.onclick = img ? () => {
            const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
            /** @type {CanvasRenderingContext2D} */ (c.getContext('2d')).putImageData(new ImageData(img.data, img.width, img.height), 0, 0);
            c.toBlob((b) => {
                if (!b) return;
                const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'wycinek-' + Date.now() + '.png';
                document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            }, 'image/png');
        } : null;
    }

    function wire(/** @type {NonNullable<typeof ui>} */ u) {
        u.close.addEventListener('click', () => closeDlg(u));
        u.dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeDlg(u); }); // Escape
        u.dlg.addEventListener('close', () => { st.token++; stopCamera(u); leavePdf(u); if (win.MATM0_OCR) win.MATM0_OCR.idle(); });
        const choose = () => u.input.click();
        u.pick.addEventListener('click', choose); u.gallery.addEventListener('click', choose);
        u.again.addEventListener('click', () => { if (st.mode === 'camera') startCamera(u); else choose(); });
        u.shoot.addEventListener('click', () => shoot(u));
        u.otherPage.addEventListener('click', () => showPicker(u));
        u.pages.addEventListener('click', (e) => {
            const b = /** @type {HTMLElement} */ (e.target).closest('.scanner-page');
            if (b && !u.pages.inert) pickPage(u, Number(/** @type {HTMLElement} */ (b).dataset.page), /** @type {HTMLElement} */ (b));
        });
        u.torch.addEventListener('click', async () => {
            const track = st.stream && st.stream.getVideoTracks()[0]; if (!track) return;
            const on = !st.torchOn;
            try { await track.applyConstraints({ advanced: [/** @type {any} */ ({ torch: on })] }); st.torchOn = on; u.torch.setAttribute('aria-pressed', String(on)); } catch {}
        });
        // Ukryta karta: kamera stoi (bateria, pamięć); po powrocie wraca podgląd, o ile okno nadal czeka na kadr.
        document.addEventListener('visibilitychange', () => {
            if (!u.dlg.open || st.mode !== 'camera' || st.shot) return;
            if (document.visibilityState === 'hidden') { stopCamera(u); st.source = null; u.frame.hidden = true; u.shoot.disabled = true; }
            else if (!st.stream) startCamera(u);
        });
        u.input.addEventListener('change', () => { const f = u.input.files && u.input.files[0]; if (f) loadFile(f); });
        u.read.addEventListener('click', () => doRead(u));
        new ResizeObserver(() => {
            if (!st.source) return;
            if (st.source.cover) clampFrame(st.f, content(u)); // obrót: scena ma inny kształt, ramka musi zostać w widocznej części
            layout(u);
        }).observe(u.stage);
        u.video.addEventListener('resize', () => syncVideo(u));
        u.video.addEventListener('loadedmetadata', () => syncVideo(u));

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
