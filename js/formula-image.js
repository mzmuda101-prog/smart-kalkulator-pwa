// @ts-check
(function () {
    'use strict';
    // Obróbka zdjęcia wzoru dla modelu ONNX (kopia preprocess z scripts/formula-onnx/run.py)
    // i dekodowanie tokenów na LaTeX. Czysty JS, bez canvasa: działa w Node i w Workerze.
    // Obraz = { data: Uint8ClampedArray (RGBA), width, height }.

    /** @typedef {{ data: Uint8ClampedArray, width: number, height: number }} Img */

    /** Jasność 0..255 po rozciągnięciu min–max (jak w run.py), dla każdego piksela. */
    function stretched(img) {
        const n = img.width * img.height, g = new Float64Array(n), d = img.data;
        let lo = Infinity, hi = -Infinity;
        for (let i = 0; i < n; i++) {
            const v = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
            g[i] = v; if (v < lo) lo = v; if (v > hi) hi = v;
        }
        if (hi > lo) for (let i = 0; i < n; i++) g[i] = (g[i] - lo) / (hi - lo) * 255;
        return g;
    }

    /**
     * Tło → białe (model zna ciemny druk na białym papierze): tło szacowane w kafelkach (90. centyl każdego kanału,
     * potem maksimum z sąsiadów, interpolacja dwuliniowa), piksel dzielony przez tło (kartka = 255, ciepłe światło też),
     * na koniec łagodne rozciągnięcie liniowe (czarny i biały punkt z centyli jasności). Bez progowania. Czysty skan zostaje bez zmian.
     * @param {Img} img @returns {Img}
     */
    function whitenBackground(img) {
        const { width: w, height: h } = img, out = new Uint8ClampedArray(img.data);
        // ciemny motyw (zrzut ekranu): mediana < 110 i jasny ogon dalej od mediany niż ciemny → najpierw negatyw
        const lh = new Uint32Array(256);
        for (let i = 0; i < w * h; i++) lh[Math.round(out[i * 4] * 0.299 + out[i * 4 + 1] * 0.587 + out[i * 4 + 2] * 0.114)]++;
        const q = (/** @type {number} */ f) => { let v = 0; for (let acc = 0; v < 255 && acc + lh[v] < w * h * f; v++) acc += lh[v]; return v; };
        const med = q(0.5), p1 = q(0.01), p99 = q(0.99);
        // negatyw tylko, gdy jasny ogon jest rzadkim sygnałem (tusz); ciemne zdjęcie kartki ma tusz w ciemnym ogonie
        if (med < 110 && p99 - med > med - p1) for (let i = 0; i < out.length; i++) if ((i & 3) !== 3) out[i] = 255 - out[i];
        const d = new Uint8ClampedArray(out);
        const B = Math.max(8, Math.round(Math.min(w, h) / 3)); // ok. 3 kafelki na wysokość wzoru: tuszu w kafelku zwykle < 10%
        const bw = Math.ceil(w / B), bh = Math.ceil(h / B), step = Math.max(1, Math.floor(B / 24));
        const tile = [0, 1, 2].map(() => new Float32Array(bw * bh)), hist = new Uint32Array(256);
        for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) for (let c = 0; c < 3; c++) {
            hist.fill(0); let n = 0;
            for (let y = by * B; y < Math.min(h, (by + 1) * B); y += step) for (let x = bx * B; x < Math.min(w, (bx + 1) * B); x += step) { hist[d[(y * w + x) * 4 + c]]++; n++; }
            let k = 255, acc = 0;
            while (k > 0 && acc + hist[k] < n * 0.1) acc += hist[k--];
            tile[c][by * bw + bx] = k;
        }
        // kafelek gęsty od tuszu bierze jasność najjaśniejszego sąsiada
        const bg = tile.map((t) => t.map((_, i) => {
            const bx = i % bw, by = (i / bw) | 0; let m = 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                const x = bx + dx, y = by + dy;
                if (x >= 0 && y >= 0 && x < bw && y < bh) m = Math.max(m, t[y * bw + x]);
            }
            return Math.max(32, m);
        }));
        for (let y = 0; y < h; y++) {
            const fy = Math.min(bh - 1, Math.max(0, y / B - 0.5)), y0 = Math.min(Math.floor(fy), Math.max(0, bh - 2)), y1 = Math.min(y0 + 1, bh - 1), ay = fy - y0;
            for (let x = 0; x < w; x++) {
                const fx = Math.min(bw - 1, Math.max(0, x / B - 0.5)), x0 = Math.min(Math.floor(fx), Math.max(0, bw - 2)), x1 = Math.min(x0 + 1, bw - 1), ax = fx - x0;
                const o = (y * w + x) * 4;
                for (let c = 0; c < 3; c++) {
                    const m = bg[c];
                    const b = (m[y0 * bw + x0] * (1 - ax) + m[y0 * bw + x1] * ax) * (1 - ay) + (m[y1 * bw + x0] * (1 - ax) + m[y1 * bw + x1] * ax) * ay;
                    out[o + c] = d[o + c] * 255 / b;
                }
            }
        }
        hist.fill(0);
        for (let i = 0; i < w * h; i++) hist[Math.round(out[i * 4] * 0.299 + out[i * 4 + 1] * 0.587 + out[i * 4 + 2] * 0.114)]++;
        const pct = (/** @type {number} */ q) => { let v = 0, acc = 0; while (v < 255 && acc + hist[v] < w * h * q) acc += hist[v++]; return v; };
        // czarny punkt: 0,5. centyl; biały: 80. centyl (kartka; szum i reszta gradientu), o ile to już jasne tło, nie tusz
        const lo = pct(0.005), pw = pct(0.8), hi = pw >= 180 ? pw : 255;
        if ((lo > 0 || hi < 255) && hi - lo >= 64) for (let i = 0; i < out.length; i++) if ((i & 3) !== 3) out[i] = (out[i] - lo) * 255 / (hi - lo);
        return { data: out, width: w, height: h };
    }

    /**
     * Wybiela skrawki sąsiednich wzorów przy górnej i dolnej krawędzi. Skrawek = pas tuszu od krawędzi nie wyższy niż
     * 25% kadru, oddzielony od reszty pustym pasem (żadnego tuszu w całej szerokości) wysokim na co najmniej 8% kadru.
     * Wykładnik albo indeks granicy przy ciasnej ramce stoi obok nawiasu czy „lim”, więc pustego pasa nie ma i zostaje.
     * Pomiar (scripts/formula-onnx/prep.js): każdy skrawek w zestawie 58 wycinków ma taki pas (>= 10%), treść — nie.
     */
    function trimEdgeBlobs(img) {
        const { width: w, height: h } = img, g = stretched(img);
        const out = { data: new Uint8ClampedArray(img.data), width: w, height: h };
        const ink = new Uint8Array(h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[y * w + x] < 200) { ink[y] = 1; break; }
        const maxSliver = 0.25 * h, minGap = Math.max(3, 0.08 * h);
        /** Pas skrawka od krawędzi (liczba wierszy) albo 0. dir 1 = góra, -1 = dół. */
        const cut = (/** @type {number} */ dir) => {
            const row = (/** @type {number} */ i) => (dir === 1 ? i : h - 1 - i);
            let i = 0;
            while (i < h && ink[row(i)]) i++;
            const a = i;
            while (i < h && !ink[row(i)]) i++;
            return a === 0 || a > maxSliver || i - a < minGap || i >= h ? 0 : a; // brak, za wysoki, pas za wąski albo dalej nic
        };
        let top = cut(1), bot = cut(-1);
        // oba cięcia razem nie mogą zjeść wszystkiego: wtedy jedna strona to sam wzór — zostaje wyższy pas, równe = nic nie tniemy
        let rest = false;
        for (let y = top; y < h - bot && !rest; y++) rest = !!ink[y];
        if (!rest) { if (top > bot) top = 0; else if (bot > top) bot = 0; else top = bot = 0; }
        for (let y = 0; y < top; y++) out.data.fill(255, y * w * 4, (y + 1) * w * 4);
        for (let y = h - bot; y < h; y++) out.data.fill(255, y * w * 4, (y + 1) * w * 4);
        return out;
    }

    /** @param {number} x */ function triangle(x) { x = Math.abs(x); return x < 1 ? 1 - x : 0; }
    /** @param {number} x */ function cubic(x) { // Pillow: a = -0.5
        x = Math.abs(x);
        if (x < 1) return ((1.5 * x - 2.5) * x) * x + 1;
        if (x < 2) return (((-0.5 * x + 2.5) * x) - 4) * x + 2;
        return 0;
    }

    /** Jedna oś resamplingu jak w Pillow (podpora rośnie ze skalą przy zmniejszaniu, wynik zaokrąglony do 0..255). */
    function pass(src, sw, sh, dstLen, horizontal, filter, support) {
        const inLen = horizontal ? sw : sh, scale = inLen / dstLen, fs = Math.max(scale, 1), sup = support * fs;
        const outW = horizontal ? dstLen : sw, outH = horizontal ? sh : dstLen;
        const out = new Uint8ClampedArray(outW * outH);
        const lines = horizontal ? sh : sw;
        for (let o = 0; o < dstLen; o++) {
            const c = (o + 0.5) * scale;
            const lo = Math.max(Math.trunc(c - sup + 0.5), 0), hi = Math.min(Math.trunc(c + sup + 0.5), inLen);
            const wts = [];
            let sum = 0;
            for (let k = lo; k < hi; k++) { const v = filter((k - c + 0.5) / fs); wts.push(v); sum += v; }
            for (let l = 0; l < lines; l++) {
                let acc = 0;
                for (let k = lo; k < hi; k++) acc += wts[k - lo] * src[horizontal ? l * sw + k : k * sw + l];
                acc /= sum;
                out[horizontal ? l * outW + o : o * outW + l] = acc; // Uint8ClampedArray zaokrągla do najbliższej
            }
        }
        return out;
    }

    /** @returns {{ d: Uint8ClampedArray, w: number, h: number }} */
    function resample(d, w, h, nw, nh, filter, support) {
        let cur = d, cw = w, ch = h;
        if (nw !== cw) { cur = pass(cur, cw, ch, nw, true, filter, support); cw = nw; }
        if (nh !== ch) { cur = pass(cur, cw, ch, nh, false, filter, support); ch = nh; }
        return { d: cur, w: cw, h: ch };
    }

    /**
     * Obraz → tensor 1x1xSxS: przycięcie marginesu, krótszy bok do S (bilinear), ograniczenie dłuższego do S
     * (thumbnail, bicubic), wyśrodkowanie na czarnym tle, (v/255 − mean)/std.
     * @param {Img} img @param {{ size?: number, mean?: number, std?: number }} [opt]
     */
    function toTensor(img, opt) {
        const size = (opt && opt.size) || 384, mean = (opt && opt.mean) || 0.7931, std = (opt && opt.std) || 0.1738;
        let { width: w, height: h } = img;
        const gs = stretched(img);
        let x0 = 0, y0 = 0, x1 = w, y1 = h;
        let any = false;
        { let minx = w, miny = h, maxx = -1, maxy = -1;
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (gs[y * w + x] < 200) {
              any = true; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
          }
          if (any) { x0 = minx; y0 = miny; x1 = maxx + 1; y1 = maxy + 1; } }
        const cw = x1 - x0, ch = y1 - y0, g = new Uint8ClampedArray(cw * ch);
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            const i = ((y + y0) * w + x + x0) * 4, p = img.data;
            // wagi „odwrócone” celowo: PaddleX czyta RGB i stosuje cv2 BGR2GRAY na tablicy RGB (jak run.py)
            g[y * cw + x] = p[i] * 0.114 + p[i + 1] * 0.587 + p[i + 2] * 0.299;
        }
        let nw, nh;
        if (cw <= ch) { nw = size; nh = Math.trunc(size * ch / cw); } else { nw = Math.trunc(size * cw / ch); nh = size; }
        let r = resample(g, cw, ch, nw, nh, triangle, 1);
        // thumbnail((size,size)): proporcje zachowane, zaokrąglenie jak w Pillow
        if (r.w > size || r.h > size) {
            const aspect = r.w / r.h;
            let tw = size, th = size;
            const rnd = (/** @type {number} */ n, /** @type {(n:number)=>number} */ key) =>
                Math.max(key(Math.floor(n)) <= key(Math.ceil(n)) ? Math.floor(n) : Math.ceil(n), 1);
            if (size / size >= aspect) tw = rnd(size * aspect, n => Math.abs(aspect - n / size));
            else th = rnd(size / aspect, n => (n === 0 ? 0 : Math.abs(aspect - size / n)));
            r = resample(r.d, r.w, r.h, tw, th, cubic, 2);
        }
        const out = new Float32Array(size * size).fill((0 - mean) / std);
        const ox = ((size - r.w) / 2) | 0, oy = ((size - r.h) / 2) | 0;
        for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) out[(y + oy) * size + x + ox] = (r.d[y * r.w + x] / 255 - mean) / std;
        return out;
    }

    /** Id tokenów (number[], bigint[] lub BigInt64Array) → LaTeX: do pierwszego eosId, bez id < 4, sklejone bez separatora, „Ġ” → spacja. */
    function decodeTokens(ids, vocab, eosId) {
        const eos = eosId === undefined ? 2 : eosId, out = [];
        // onnxruntime-web zwraca int64 jako BigInt
        for (const raw of ids) { const id = Number(raw); if (id === eos) break; if (id > 3) out.push(vocab[id]); }
        return out.join('').replace(/Ġ/g, ' ');
    }

    /** Ostrość: wariancja laplasjanu 3x3 na jasności zmniejszonej kopii (dłuższy bok <= 512). Niska = rozmazane. */
    function blurScore(/** @type {Img} */ img) {
        const k = Math.min(1, 512 / Math.max(img.width, img.height));
        const w = Math.max(3, Math.round(img.width * k)), h = Math.max(3, Math.round(img.height * k)), g = new Float64Array(w * h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { // średnia z komórki źródła
            const x0 = Math.floor(x * img.width / w), x1 = Math.max(x0 + 1, Math.floor((x + 1) * img.width / w));
            const y0 = Math.floor(y * img.height / h), y1 = Math.max(y0 + 1, Math.floor((y + 1) * img.height / h));
            let s = 0, n = 0;
            for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * img.width + xx) * 4; s += 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2]; n++; }
            g[y * w + x] = s / n;
        }
        let sum = 0, sq = 0, n = 0;
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
            const i = y * w + x, l = g[i - 1] + g[i + 1] + g[i - w] + g[i + w] - 4 * g[i];
            sum += l; sq += l * l; n++;
        }
        return sq / n - (sum / n) * (sum / n);
    }

    /** Próg: frac.png ma ok. 4170, z rozmyciem Gaussa sigma=1 ok. 350, sigma=2 ok. 45, sigma=3 ok. 10. */
    const BLUR_MIN = 100;
    const API = { blurScore: blurScore, BLUR_MIN: BLUR_MIN, whitenBackground: whitenBackground, trimEdgeBlobs: trimEdgeBlobs, toTensor: toTensor, decodeTokens: decodeTokens };
    /** @type {any} */ (typeof window !== 'undefined' ? window : globalThis).MATM0_FIMG = API; // w Workerze nie ma window
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
