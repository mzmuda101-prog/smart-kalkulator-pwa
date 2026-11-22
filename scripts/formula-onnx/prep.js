// Warianty wycinków do pomiaru: psucie (zdjęcie) i obróbka z js/formula-image.js (ten sam kod, co w apce).
// Użycie: node prep.js <folder_z> <folder_do> <op,op,...>
//   tight  — przycięcie 3 px W GŁĄB tuszu z góry i z dołu (wykładniki/indeksy dotykają krawędzi)
//   dega   — szare tło (jasność 0,45 → 0,7 od lewej do prawej), tusz ok. 15, lekki szum
//   degb   — ciepłe światło lampy (R 0,95, G 0,82, B 0,6) z winietą
//   persp  — zdjęcie pod kątem: strona węższa u góry o 15% (PERSP_K), obrót 2,5° (PERSP_DEG), białe pole dookoła
//   blur   — rozmycie (Gauss, sigma 1,2 px — drżąca ręka / ostrość obok)
//   shadow — nierówne światło: cień ręki/telefonu (miękka ukośna plama, jasność do 0,5) + spadek w rogu
//   screen — zdjęcie ekranu: szare tło, mora (prążki), siatka subpikseli RGB, lekkie rozmycie
//   jpeg   — kompresja JPEG ok. jakości 35 (bloki 8×8, kwantyzacja DCT jasności i koloru)
//   loose  — ramka za luźna: 35% pustego pola z każdej strony
//   (ramka z sąsiadem: nie tu — prawdziwa strona, crop.py --pad=0.3)
//   whiten — whitenBackground; trim — trimEdgeBlobs (kolejność jak w argumencie)
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const F = require(path.join(__dirname, '../../js/formula-image.js'));
const [src, dst, opsArg] = process.argv.slice(2);
const ops = (opsArg || '').split(',').filter(Boolean);

function readPng(buf) { // 8-bit, typ 0/2/4/6, bez przeplotu
    let p = 8, idat = [], w = 0, h = 0, type = 0;
    while (p < buf.length) {
        const l = buf.readUInt32BE(p), t = buf.toString('ascii', p + 4, p + 8);
        if (t === 'IHDR') { w = buf.readUInt32BE(p + 8); h = buf.readUInt32BE(p + 12); type = buf[p + 17]; }
        if (t === 'IDAT') idat.push(buf.slice(p + 8, p + 8 + l));
        p += 12 + l;
    }
    const bp = { 0: 1, 2: 3, 4: 2, 6: 4 }[type], st = w * bp, raw = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(h * st);
    for (let y = 0; y < h; y++) {
        const f = raw[y * (st + 1)];
        for (let x = 0; x < st; x++) {
            const v = raw[y * (st + 1) + 1 + x], a = x >= bp ? px[y * st + x - bp] : 0, b = y ? px[(y - 1) * st + x] : 0, c = x >= bp && y ? px[(y - 1) * st + x - bp] : 0;
            const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
            px[y * st + x] = (f === 0 ? v : f === 1 ? v + a : f === 2 ? v + b : f === 3 ? v + ((a + b) >> 1) : v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
        }
    }
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
        const q = i * bp, g = type === 0 || type === 4;
        data[i * 4] = px[q]; data[i * 4 + 1] = g ? px[q] : px[q + 1]; data[i * 4 + 2] = g ? px[q] : px[q + 2]; data[i * 4 + 3] = 255;
    }
    return { data, width: w, height: h };
}
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(t, d) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); }
function writePng(img) {
    const { width: w, height: h, data } = img, raw = Buffer.alloc(h * (w * 3 + 1));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) raw[y * (w * 3 + 1) + 1 + x * 3 + c] = data[(y * w + x) * 4 + c];
    const ih = Buffer.alloc(13); ih.writeUInt32BE(w); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

let seed = 1;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
const luma = (d, i) => d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;

// próbka dwuliniowa (poza obrazem = biel)
function sample(d, w, h, x, y, o, oi) {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    for (let c = 0; c < 3; c++) {
        const g = (xx, yy) => (xx < 0 || yy < 0 || xx >= w || yy >= h ? 255 : d[(yy * w + xx) * 4 + c]);
        o[oi + c] = (g(x0, y0) * (1 - fx) + g(x0 + 1, y0) * fx) * (1 - fy) + (g(x0, y0 + 1) * (1 - fx) + g(x0 + 1, y0 + 1) * fx) * fy;
    }
    o[oi + 3] = 255;
}
function gaussBlur(img, sigma) {
    const { width: w, height: h } = img, r = Math.ceil(3 * sigma), k = [];
    for (let i = -r; i <= r; i++) k.push(Math.exp(-(i * i) / (2 * sigma * sigma)));
    const sum = k.reduce((a, b) => a + b, 0), src = img.data, tmp = new Float32Array(w * h * 4), o = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) {
        let v = 0; for (let i = -r; i <= r; i++) v += k[i + r] * src[(y * w + Math.min(w - 1, Math.max(0, x + i))) * 4 + c];
        tmp[(y * w + x) * 4 + c] = v / sum;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) {
        let v = 0; for (let i = -r; i <= r; i++) v += k[i + r] * tmp[(Math.min(h - 1, Math.max(0, y + i)) * w + x) * 4 + c];
        o[(y * w + x) * 4 + c] = v / sum;
    }
    return { data: o, width: w, height: h };
}
// shortcut: JPEG bez kodera — YCbCr, DCT 8×8, kwantyzacja tablicami z normy (jakość q), bez podpróbkowania koloru; wystarcza do artefaktów blokowych
const QY = [16,11,10,16,24,40,51,61,12,12,14,19,26,58,60,55,14,13,16,24,40,57,69,56,14,17,22,29,51,87,80,62,18,22,37,56,68,109,103,77,24,35,55,64,81,104,113,92,49,64,78,87,103,121,120,101,72,92,95,98,112,100,103,99];
const QC = [17,18,24,47,99,99,99,99,18,21,26,66,99,99,99,99,24,26,56,99,99,99,99,99,47,66,99,99,99,99,99,99].concat(Array(32).fill(99));
function jpegish(img, q) {
    const { width: w, height: h, data: d } = img, sc = q < 50 ? 5000 / q : 200 - 2 * q;
    const tab = (T) => T.map((v) => Math.max(1, Math.floor((v * sc + 50) / 100)));
    const tY = tab(QY), tC = tab(QC), cos = [];
    for (let x = 0; x < 8; x++) for (let u = 0; u < 8; u++) cos[x * 8 + u] = Math.cos((2 * x + 1) * u * Math.PI / 16);
    const C = (u) => (u ? 1 : Math.SQRT1_2);
    const ch = [new Float32Array(w * h), new Float32Array(w * h), new Float32Array(w * h)];
    for (let i = 0; i < w * h; i++) {
        const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
        ch[0][i] = 0.299 * r + 0.587 * g + 0.114 * b - 128; ch[1][i] = -0.1687 * r - 0.3313 * g + 0.5 * b; ch[2][i] = 0.5 * r - 0.4187 * g - 0.0813 * b;
    }
    const blk = new Float32Array(64), co = new Float32Array(64);
    ch.forEach((P, pi) => {
        const T = pi ? tC : tY;
        for (let by = 0; by < h; by += 8) for (let bx = 0; bx < w; bx += 8) {
            for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) blk[y * 8 + x] = P[Math.min(h - 1, by + y) * w + Math.min(w - 1, bx + x)];
            for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) {
                let s = 0; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) s += blk[y * 8 + x] * cos[x * 8 + u] * cos[y * 8 + v];
                const f = 0.25 * C(u) * C(v) * s, qq = T[v * 8 + u]; co[v * 8 + u] = Math.round(f / qq) * qq;
            }
            for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
                if (by + y >= h || bx + x >= w) continue;
                let s = 0; for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) s += C(u) * C(v) * co[v * 8 + u] * cos[x * 8 + u] * cos[y * 8 + v];
                P[(by + y) * w + bx + x] = 0.25 * s;
            }
        }
    });
    const o = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
        const Y = ch[0][i] + 128, cb = ch[1][i], cr = ch[2][i];
        o[i * 4] = Y + 1.402 * cr; o[i * 4 + 1] = Y - 0.34414 * cb - 0.71414 * cr; o[i * 4 + 2] = Y + 1.772 * cb; o[i * 4 + 3] = 255;
    }
    return { data: o, width: w, height: h };
}

const OPS = {
    tight(img) {
        const { width: w, height: h, data: d } = img; let y0 = h, y1 = -1;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (luma(d, (y * w + x) * 4) < 200) { if (y < y0) y0 = y; y1 = y; }
        if (y1 - y0 < 12) return img;
        const a = y0 + 3, b = y1 - 3, nh = b - a + 1;
        return { data: d.slice(a * w * 4, (b + 1) * w * 4), width: w, height: nh };
    },
    dega(img) {
        const { width: w, height: h } = img, d = new Uint8ClampedArray(img.data);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const bg = 255 * (0.45 + 0.25 * x / Math.max(1, w - 1)), n = 4 * gauss();
            for (let c = 0; c < 3; c++) { const i = (y * w + x) * 4 + c, t = d[i] / 255; d[i] = 15 * (1 - t) + bg * t + n; }
        }
        return { data: d, width: w, height: h };
    },
    degb(img) {
        const { width: w, height: h } = img, d = new Uint8ClampedArray(img.data), k = [0.95, 0.82, 0.6];
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const r = Math.hypot((x - w / 2) / w, (y - h / 2) / h), v = 1 - 0.3 * r, n = 3 * gauss();
            for (let c = 0; c < 3; c++) { const i = (y * w + x) * 4 + c; d[i] = d[i] * k[c] * v + n; }
        }
        return { data: d, width: w, height: h };
    },
    persp(img) {
        const { width: w, height: h, data: d } = img, pad = Math.round(0.08 * Math.max(w, h));
        const W2 = w + 2 * pad, H2 = h + 2 * pad, o = new Uint8ClampedArray(W2 * H2 * 4).fill(255);
        // zwężenie strony (domyślnie 15%) rozkłada się na jej wysokość (A4 przy 200 dpi ≈ 2340 px), nie na jeden wzór
        const k = +(process.env.PERSP_K ?? 0.15) * h / 2340;
        const a = +(process.env.PERSP_DEG ?? 2.5) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), cx = w / 2, cy = h / 2;
        for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
            // odwrotnie: obrót wstecz, potem zdjęcie zwężenia (góra 0,9 szerokości)
            let u = x - pad - cx, v = y - pad - cy;
            const ru = u * ca + v * sa, rv = -u * sa + v * ca;
            const s = 1 - k * (0.5 - rv / h);
            sample(d, w, h, ru / s + cx, rv + cy, o, (y * W2 + x) * 4);
        }
        return { data: o, width: W2, height: H2 };
    },
    blur: (img) => gaussBlur(img, 1.2),
    shadow(img) {
        const { width: w, height: h } = img, d = new Uint8ClampedArray(img.data);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const t = (x / w) * 0.8 + (y / h) * 0.6 - 0.85; // ukośna granica cienia
            const sh = 1 - 0.5 / (1 + Math.exp(-t * 14)); // miękki brzeg
            const corner = 1 - 0.15 * Math.hypot(x / w, y / h) / Math.SQRT2, n = 3 * gauss();
            for (let c = 0; c < 3; c++) { const i = (y * w + x) * 4 + c; d[i] = d[i] * sh * corner + n; }
        }
        return { data: d, width: w, height: h };
    },
    screen(img) {
        const { width: w, height: h } = img, d = new Uint8ClampedArray(img.data);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const moire = 1 + 0.09 * Math.sin(2 * Math.PI * (x * 0.093 + y * 0.031)) * Math.sin(2 * Math.PI * (x * 0.011 - y * 0.087));
            for (let c = 0; c < 3; c++) {
                const i = (y * w + x) * 4 + c, t = d[i] / 255, sub = x % 3 === c ? 1.06 : 0.97;
                d[i] = (30 * (1 - t) + 232 * t) * moire * sub + 3 * gauss();
            }
        }
        return gaussBlur({ data: d, width: w, height: h }, 0.6);
    },
    jpeg: (img) => jpegish(img, 35),
    loose(img) {
        const { width: w, height: h, data: d } = img, px = Math.round(0.35 * w), py = Math.round(0.35 * h);
        const W2 = w + 2 * px, H2 = h + 2 * py, o = new Uint8ClampedArray(W2 * H2 * 4).fill(255);
        for (let y = 0; y < h; y++) o.set(d.subarray(y * w * 4, (y + 1) * w * 4), ((y + py) * W2 + px) * 4);
        return { data: o, width: W2, height: H2 };
    },
    whiten: F.whitenBackground,
    trim: F.trimEdgeBlobs,
};

fs.mkdirSync(dst, { recursive: true });
for (const f of fs.readdirSync(src).filter((n) => n.endsWith('.png')).sort()) {
    seed = 1 + [...f].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) % 100000; // ten sam szum dla tego samego pliku
    let img = readPng(fs.readFileSync(path.join(src, f)));
    for (const o of ops) { if (!OPS[o]) throw new Error('nieznana operacja: ' + o); img = OPS[o](img); }
    fs.writeFileSync(path.join(dst, f), writePng(img));
}
