// @ts-check
// Strona: MATM0_OCR.read(img) -> Promise<{latex, expr?, error?, ms}>. Worker powstaje leniwie, raz.
(function () {
    'use strict';
    /** @type {Worker|null} */ let worker = null;
    /** @type {Promise<Worker>|null} */ let starting = null;
    let seq = 0;
    /** @type {Map<number,{resolve:(v:any)=>void,reject:(e:Error)=>void}>} */
    const pending = new Map();

    function reset(/** @type {Error} */ err) {
        if (worker) worker.terminate();
        worker = starting = null;
        pending.forEach(p => p.reject(err));
        pending.clear();
    }

    function start() {
        if (!starting) starting = (async () => {
            const parts = await /** @type {any} */ (window).MATM0_MODELS.ensure('formulanet-s'); // może pokazać zgodę; odmowa = Error('declined')
            const w = new Worker('js/formula-ocr-worker.js', { type: 'module' });
            await new Promise((resolve, reject) => {
                w.onmessage = (/** @type {MessageEvent} */ e) => {
                    if (e.data.type === 'ready') resolve(undefined);
                    else if (e.data.error) reject(new Error(e.data.error));
                };
                w.onerror = ev => reject(new Error(ev.message || 'worker'));
                w.postMessage({ type: 'init', parts }, parts); // transfer: bez kopii (pamięć iOS)
            });
            w.onmessage = (/** @type {MessageEvent} */ e) => {
                const p = pending.get(e.data.id);
                if (!p) return;
                pending.delete(e.data.id);
                if (e.data.error) p.reject(new Error(e.data.error)); else p.resolve(e.data.result);
            };
            w.onerror = () => reset(new Error('Worker odczytu przestał działać'));
            worker = w;
            return w;
        })().catch(err => { starting = null; throw err; });
        return starting;
    }

    /** @param {{data: Uint8ClampedArray, width: number, height: number}} img */
    async function read(img) {
        const w = await start();
        return new Promise((resolve, reject) => {
            const id = ++seq;
            pending.set(id, { resolve, reject });
            w.postMessage({ type: 'read', id, img }, [img.data.buffer]);
        });
    }

    /** @type {any} */ (window).MATM0_OCR = { read };
})();
