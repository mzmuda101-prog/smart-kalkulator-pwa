// @ts-check
// Worker odczytu wzoru (moduł ES): onnxruntime-web + model FormulaNet. Nie dotyka DOM-u.
// Wiadomości: {type:'init', parts:ArrayBuffer[]} -> {type:'ready'}; {type:'read', id, img, debug?} -> {id, result}|{id, error}.
import * as ort from '../vendor/onnxruntime-web/ort.wasm.min.mjs';

/** @type {Promise<any>|null} */
let ready = null;

async function init(/** @type {ArrayBuffer[]} */ parts) {
    // pliki IIFE z js/ przypinają się do globalThis, gdy nie ma window
    await Promise.all([import('./formula-image.js'), import('./latex-to-expr.js')]);
    const base = new URL('../models/formulanet-s/', import.meta.url).href;
    const [manifest, vocab] = await Promise.all([
        fetch(base + 'manifest.json').then(r => r.json()),
        fetch(base + 'vocab.json').then(r => r.json()),
    ]);
    ort.env.logLevel = 'error';
    ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
    // pełny adres od położenia tego modułu (działa też, gdy apka nie leży w korzeniu domeny)
    ort.env.wasm.wasmPaths = new URL('../vendor/onnxruntime-web/', import.meta.url).href;
    const buf = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0));
    let off = 0;
    for (const p of parts) { buf.set(new Uint8Array(p), off); off += p.byteLength; }
    const session = await ort.InferenceSession.create(buf, { executionProviders: ['wasm'] });
    return { session, manifest, vocab };
}

self.onmessage = async (/** @type {MessageEvent} */ e) => {
    const m = e.data;
    try {
        if (m.type === 'init') {
            ready = init(m.parts);
            await ready;
            self.postMessage({ type: 'ready' });
        } else if (m.type === 'read') {
            if (!ready) throw new Error('model nie jest wczytany');
            const { session, manifest, vocab } = await ready;
            const t0 = performance.now();
            const g = /** @type {any} */ (globalThis);
            // tu, nie na stronie: wątek główny wolny. Najpierw białe tło (na szarym tle przycinanie brało całe tło za tusz).
            const img = g.MATM0_FIMG.trimEdgeBlobs(g.MATM0_FIMG.whitenBackground(m.img));
            const x = g.MATM0_FIMG.toTensor(img, { size: manifest.inputShape[2], mean: manifest.mean, std: manifest.std });
            const out = await session.run({ [manifest.input]: new ort.Tensor('float32', x, manifest.inputShape) });
            const latex = g.MATM0_FIMG.decodeTokens(out[session.outputNames[0]].data, vocab, manifest.eosId);
            const conv = g.MATM0_LATEX.latexToExpr(latex);
            const result = { latex, ...conv, ms: Math.round(performance.now() - t0) };
            if (m.debug) self.postMessage({ id: m.id, result: { ...result, img } }, { transfer: [img.data.buffer] }); // ?debug=1: obraz, który widział model
            else self.postMessage({ id: m.id, result });
        }
    } catch (err) {
        self.postMessage({ id: m.id, error: String(err && /** @type {Error} */ (err).message || err) });
    }
};
