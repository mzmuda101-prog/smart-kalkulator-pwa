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

    /** Wybiela plamy tuszu (8-sąsiedztwo) dotykające górnej lub dolnej krawędzi (skrawki sąsiednich wzorów). */
    function trimEdgeBlobs(img) {
        const { width: w, height: h } = img, g = stretched(img);
        const out = { data: new Uint8ClampedArray(img.data), width: w, height: h };
        const seen = new Uint8Array(w * h), stack = [];
        for (let s = 0; s < w * h; s++) {
            if (seen[s] || g[s] >= 200) continue;
            const comp = []; let touch = false;
            seen[s] = 1; stack.push(s);
            while (stack.length) {
                const p = /** @type {number} */ (stack.pop()), y = (p / w) | 0, x = p - y * w;
                comp.push(p);
                if (y === 0 || y === h - 1) touch = true;
                for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx, ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                    const q = ny * w + nx;
                    if (!seen[q] && g[q] < 200) { seen[q] = 1; stack.push(q); }
                }
            }
            if (touch) for (const p of comp) { const i = p * 4; out.data[i] = out.data[i + 1] = out.data[i + 2] = 255; }
        }
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
    const API = { blurScore: blurScore, BLUR_MIN: BLUR_MIN, trimEdgeBlobs: trimEdgeBlobs, toTensor: toTensor, decodeTokens: decodeTokens };
    /** @type {any} */ (typeof window !== 'undefined' ? window : globalThis).MATM0_FIMG = API; // w Workerze nie ma window
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
