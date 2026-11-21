// Warianty wycinków do pomiaru: psucie (zdjęcie) i obróbka z js/formula-image.js (ten sam kod, co w apce).
// Użycie: node prep.js <folder_z> <folder_do> <op,op,...>
//   tight  — przycięcie 3 px W GŁĄB tuszu z góry i z dołu (wykładniki/indeksy dotykają krawędzi)
//   dega   — szare tło (jasność 0,45 → 0,7 od lewej do prawej), tusz ok. 15, lekki szum
//   degb   — ciepłe światło lampy (R 0,95, G 0,82, B 0,6) z winietą
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
    whiten: F.whitenBackground,
    trim: F.trimEdgeBlobs,
};

fs.mkdirSync(dst, { recursive: true });
for (const f of fs.readdirSync(src).filter((n) => n.endsWith('.png')).sort()) {
    seed = 1 + [...f].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) % 100000; // ten sam szum dla tego samego pliku
    let img = readPng(fs.readFileSync(path.join(src, f)));
    for (const o of ops) img = OPS[o](img);
    fs.writeFileSync(path.join(dst, f), writePng(img));
}
