// @ts-check
// Strona: MATM0_OCR.read(img) -> Promise<{latex, expr?, error?, ms}>. Worker powstaje leniwie, raz.
(function () {
    'use strict';
    /** @type {Worker|null} */ let worker = null;
    /** @type {Promise<Worker>|null} */ let starting = null;
    let seq = 0;
    // odczyt, start workera (bez okna zgody) i bezczynność po zamknięciu skanera; testy mogą je skrócić
    const T = { read: 60000, init: 60000, idle: 60000 };
    /** @type {ReturnType<typeof setTimeout>|undefined} */ let idleTimer;
    let liveWorkers = 0; // do testów: ile workerów żyje
    /** @type {Map<number,{resolve:(v:any)=>void,reject:(e:Error)=>void}>} */
    const pending = new Map();

    function reset(/** @type {Error} */ err) {
        if (worker) { worker.terminate(); liveWorkers--; }
        worker = starting = null;
        pending.forEach(p => p.reject(err));
        pending.clear();
    }

    function start() {
        if (!starting) starting = (async () => {
            const parts = await /** @type {any} */ (window).MATM0_MODELS.ensure('formulanet-s'); // może pokazać zgodę; odmowa = Error('declined')
            const w = new Worker('js/formula-ocr-worker.js', { type: 'module' });
            liveWorkers++;
            /** @type {ReturnType<typeof setTimeout>|undefined} */ let t;
            try { await new Promise((resolve, reject) => {
                t = setTimeout(() => reject(new Error('timeout')), T.init); // zawieszony start nie blokuje kolejnych odczytów
                w.onmessage = (/** @type {MessageEvent} */ e) => {
                    if (e.data.type === 'ready') resolve(undefined);
                    else if (e.data.error) reject(new Error(e.data.error));
                };
                w.onerror = ev => reject(new Error(ev.message || 'worker'));
                w.postMessage({ type: 'init', parts }, parts); // transfer: bez kopii (pamięć iOS)
            }); } catch (e) { w.terminate(); liveWorkers--; throw e; } finally { clearTimeout(t); }
            w.onmessage = (/** @type {MessageEvent} */ e) => {
                const p = pending.get(e.data.id);
                if (!p) return;
                pending.delete(e.data.id);
                if (e.data.error) p.reject(new Error(e.data.error)); else p.resolve(e.data.result);
            };
            w.onmessageerror = () => reset(new Error('Worker odczytu: błąd wiadomości'));
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
            const timer = setTimeout(() => reset(new Error('timeout')), T.read);
            pending.set(id, { resolve: v => { clearTimeout(timer); resolve(v); }, reject: e => { clearTimeout(timer); reject(e); } });
            w.postMessage({ type: 'read', id, img }, [img.data.buffer]);
        });
    }

    /** Skaner otwarty: worker zostaje. */
    function keep() { clearTimeout(idleTimer); }
    /** Skaner zamknięty: po T.idle worker (model w pamięci WASM) znika; następny odczyt uruchomi go od nowa. */
    function idle() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(function tick() {
            if (pending.size || (starting && !worker)) { idleTimer = setTimeout(tick, T.idle); return; } // trwa odczyt albo start
            if (worker) reset(new Error('idle'));
        }, T.idle);
    }

    /** @type {any} */ (window).MATM0_OCR = { read, keep, idle, _workers: () => liveWorkers, _t: T };
})();
