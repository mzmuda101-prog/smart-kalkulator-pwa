// @ts-check
/* ============================================================
   [PL] Model odczytu wzorów: pobranie za zgodą, cache offline, wznawianie.
   [EN] Lazy: nic nie robi, dopóki ktoś nie wywoła status/ensure/remove.
   Kawałki są zapisane ROZPAKOWANE (klucz = URL .gz) po zgodności SHA-256.
   ============================================================ */
(function () {
    'use strict';

    const CACHE = 'matm0-models-v1';
    const ENGINE = ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'];
    /** @type {Record<string, Promise<ArrayBuffer[]>>} */
    const running = {};

    const modelUrl = (/** @type {string} */ name, /** @type {string} */ file) =>
        new URL('models/' + name + '/' + file, document.baseURI).href;
    const engineUrl = (/** @type {string} */ file) =>
        new URL('vendor/onnxruntime-web/' + file, document.baseURI).href;

    /** @param {string} name */
    async function loadManifest(name) {
        const cache = await caches.open(CACHE);
        const url = modelUrl(name, 'manifest.json');
        let res = await cache.match(url);
        if (!res) {
            const net = await fetch(url);
            if (!net.ok) throw new Error('manifest: HTTP ' + net.status);
            await cache.put(url, net.clone());
            res = net;
        }
        return { cache, manifest: await res.json() };
    }

    /** @param {string} name */
    async function status(name) {
        const cache = await caches.open(CACHE);
        const mres = await cache.match(modelUrl(name, 'manifest.json'));
        if (!mres) return { ready: false, haveBytes: 0, gzBytes: 0 };
        const m = await mres.json();
        let have = 0, all = true;
        for (const p of m.parts) {
            if (await cache.match(modelUrl(name, p.file))) have += p.gzBytes; else all = false;
        }
        for (const u of [modelUrl(name, 'vocab.json')].concat(ENGINE.map(engineUrl))) {
            if (!(await cache.match(u))) all = false;
        }
        return { ready: all, haveBytes: have, gzBytes: m.gzBytes };
    }

    /** Pobiera url do cache (jak jest), zwraca bajty odebrane z sieci przez onChunk. */
    async function fetchGz(/** @type {string} */ url, /** @type {(n:number)=>void} */ onChunk) {
        const res = await fetch(url);
        if (!res.ok || !res.body) throw new Error('HTTP ' + res.status + ' (' + url.split('/').pop() + ')');
        const chunks = [], reader = res.body.getReader();
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            onChunk(value.length);
        }
        return new Blob(chunks);
    }

    /** @param {string} name @param {(got:number,total:number)=>void} onProgress */
    async function download(name, onProgress) {
        const { cache, manifest } = await loadManifest(name);
        let got = 0;
        for (const p of manifest.parts) {
            const url = modelUrl(name, p.file);
            if (await cache.match(url)) { got += p.gzBytes; continue; }
            onProgress(got, manifest.gzBytes);
            const gz = await fetchGz(url, n => onProgress(got += n, manifest.gzBytes));
            got = got - gz.size + p.gzBytes;
            const raw = await new Response(gz.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
            const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', raw)))
                .map(b => b.toString(16).padStart(2, '0')).join('');
            if (hash !== p.sha256) throw new Error('Suma kontrolna się nie zgadza: ' + p.file);
            await cache.put(url, new Response(raw));
            onProgress(got, manifest.gzBytes);
        }
        // małe pliki i silnik: bez sumy (serwuje je to samo źródło co apkę), as-is
        for (const u of [modelUrl(name, 'vocab.json')].concat(ENGINE.map(engineUrl))) {
            if (await cache.match(u)) continue;
            const res = await fetch(u);
            if (!res.ok) throw new Error('HTTP ' + res.status + ' (' + u.split('/').pop() + ')');
            await cache.put(u, res);
        }
        return manifest;
    }

    async function readParts(/** @type {string} */ name) {
        const { cache, manifest } = await loadManifest(name);
        return Promise.all(manifest.parts.map(async (/** @type {any} */ p) =>
            /** @type {Response} */ (await cache.match(modelUrl(name, p.file))).arrayBuffer()));
    }

    const mb = (/** @type {number} */ n) => (n / 1e6).toFixed(1).replace('.', ',');

    /** Okno zgody + postęp. Resolve po pobraniu; reject('declined') albo błąd pobierania. */
    function askAndDownload(/** @type {string} */ name, /** @type {any} */ opts) {
        return new Promise((resolve, reject) => {
            const dlg = document.createElement('dialog');
            dlg.className = 'model-dialog';
            dlg.setAttribute('aria-labelledby', 'modelDlgTitle');
            const el = (/** @type {string} */ tag, /** @type {string} */ cls, /** @type {string} */ text = '') => {
                const n = /** @type {any} */ (document.createElement(tag));
                n.className = cls;
                n.textContent = text;
                return n;
            };
            const title = el('h2', 'model-dialog-title', 'Odczyt wzorów ze zdjęć');
            title.id = 'modelDlgTitle';
            const msg = el('p', 'model-dialog-text', 'Pobrać model do odczytu wzorów? 37 MB, jednorazowo. Zdjęcia nie opuszczają telefonu.');
            const bar = document.createElement('progress');
            bar.className = 'model-dialog-bar';
            bar.max = 1; bar.value = 0; bar.hidden = true;
            const info = el('p', 'model-dialog-info');
            info.setAttribute('aria-live', 'polite');
            const ok = el('button', 'model-dialog-btn primary', 'Pobierz');
            const no = el('button', 'model-dialog-btn', 'Nie teraz');
            ok.type = no.type = 'button';
            const row = el('div', 'model-dialog-actions');
            row.append(no, ok);
            dlg.append(title, msg, bar, info, row);

            let busy = false, lastError = /** @type {Error|null} */ (null), settled = false;
            const finish = (/** @type {Error|null} */ err) => {
                settled = true;
                dlg.close();
                dlg.remove();
                if (err) reject(err); else resolve(undefined);
            };
            const start = () => {
                busy = true; lastError = null;
                ok.hidden = no.hidden = true;
                bar.hidden = false; info.textContent = '';
                msg.textContent = 'Pobieranie modelu…';
                download(name, (got, total) => {
                    bar.value = total ? got / total : 0;
                    info.textContent = mb(got) + ' z ' + mb(total) + ' MB';
                    if (opts && opts.onProgress) opts.onProgress(got, total);
                }).then(() => finish(null), (/** @type {any} */ e) => {
                    busy = false; lastError = e instanceof Error ? e : new Error(String(e));
                    msg.textContent = 'Nie udało się pobrać modelu: ' + lastError.message + '. Pobrane kawałki zostały zapisane.';
                    ok.textContent = 'Spróbuj ponownie';
                    ok.hidden = no.hidden = false;
                    no.textContent = 'Zamknij';
                });
            };
            ok.addEventListener('click', start);
            no.addEventListener('click', () => finish(lastError || new Error('declined')));
            dlg.addEventListener('cancel', e => { e.preventDefault(); if (!busy) finish(lastError || new Error('declined')); });
            dlg.addEventListener('click', e => { if (e.target === dlg && !busy) finish(lastError || new Error('declined')); });
            dlg.addEventListener('close', () => { if (!settled) finish(new Error('declined')); });
            document.body.appendChild(dlg);
            dlg.showModal();
        });
    }

    /** @param {string} name @param {{onProgress?:(got:number,total:number)=>void}=} opts */
    function ensure(name, opts) {
        if (running[name]) return running[name];
        const p = (async () => {
            if (!(await status(name)).ready) await askAndDownload(name, opts);
            return readParts(name);
        })();
        running[name] = p;
        const clear = () => { delete running[name]; };
        p.then(clear, clear);
        return p;
    }

    /** @param {string} name */
    async function remove(name) {
        const cache = await caches.open(CACHE);
        const mres = await cache.match(modelUrl(name, 'manifest.json'));
        const files = ['manifest.json', 'vocab.json'];
        if (mres) for (const p of (await mres.json()).parts) files.push(p.file);
        for (const f of files) await cache.delete(modelUrl(name, f));
        for (const f of ENGINE) await cache.delete(engineUrl(f));
    }

    /** @type {any} */ (window).MATM0_MODELS = { status, ensure, remove };
})();
