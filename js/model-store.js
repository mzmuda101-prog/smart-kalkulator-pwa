// @ts-check
/* ============================================================
   [PL] Model odczytu wzorów: pobranie za zgodą, cache offline, wznawianie.
   [EN] Lazy: nic nie robi, dopóki ktoś nie wywoła status/ensure/remove.
   Kawałki są zapisane ROZPAKOWANE (klucz = URL .gz) po zgodności SHA-256.
   ============================================================ */
(function () {
    'use strict';

    // Nazwa w version.js (MODELS_CACHE): zmiana modelu albo wersji onnxruntime-web wymaga jej podbicia.
    const CACHE = /** @type {any} */ (window).MODELS_CACHE;
    // Typ z sieci (albo z rozszerzenia) + COEP: silnik wykonuje te pliki jako moduł i workery wątków,
    // a z pustym MIME albo bez COEP przeglądarka je odrzuca. Content-Encoding nigdy (bajty są już surowe).
    const TYPES = /** @type {Record<string,string>} */ ({ mjs: 'text/javascript', wasm: 'application/wasm', json: 'application/json' });
    const stored = (/** @type {Blob} */ body, /** @type {string} */ url, /** @type {string|null} */ type) => new Response(body, {
        headers: { 'Content-Type': type || TYPES[url.split('.').pop() || ''] || 'application/octet-stream', 'Cross-Origin-Embedder-Policy': 'require-corp' },
    });
    /** @type {Record<string, Promise<ArrayBuffer[]>>} */
    const running = {};

    const modelUrl = (/** @type {string} */ name, /** @type {string} */ file) =>
        new URL('models/' + name + '/' + file, document.baseURI).href;
    /** Pliki dodatkowe z manifestu (vocab + silnik): ścieżki od korzenia strony. */
    const extraUrls = (/** @type {any} */ m) =>
        (m.extras || []).map((/** @type {any} */ e) => new URL(e.url, document.baseURI).href);

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
        for (const e of m.extras || []) {
            if (await cache.match(new URL(e.url, document.baseURI).href)) have += e.bytes; else all = false;
        }
        return { ready: all, haveBytes: have, gzBytes: m.gzBytes, downloadBytes: m.downloadBytes };
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
        return { blob: new Blob(chunks), type: res.headers.get('Content-Type') };
    }

    /** @param {string} name @param {(got:number,total:number)=>void} onProgress */
    async function download(name, onProgress) {
        const { cache, manifest } = await loadManifest(name);
        const total = manifest.downloadBytes;
        let got = 0;
        for (const p of manifest.parts) {
            const url = modelUrl(name, p.file);
            if (await cache.match(url)) { got += p.gzBytes; continue; }
            onProgress(got, total);
            const gz = (await fetchGz(url, n => onProgress(got += n, total))).blob;
            got = got - gz.size + p.gzBytes;
            // serwer mógł sam rozpakować (Content-Encoding: gzip) — wtedy to już surowe bajty, SHA rozstrzyga
            const head = new Uint8Array(await gz.slice(0, 2).arrayBuffer());
            const gzipped = head[0] === 0x1f && head[1] === 0x8b;
            const raw = await new Response(gzipped ? gz.stream().pipeThrough(new DecompressionStream('gzip')) : gz).arrayBuffer();
            const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', raw)))
                .map(b => b.toString(16).padStart(2, '0')).join('');
            if (hash !== p.sha256) throw new Error('Suma kontrolna się nie zgadza: ' + p.file);
            await cache.put(url, new Response(raw));
            onProgress(got, total);
        }
        // vocab i silnik: bez sumy (serwuje je to samo źródło co apkę), as-is
        for (const e of manifest.extras || []) {
            const u = new URL(e.url, document.baseURI).href;
            if (await cache.match(u)) { got += e.bytes; continue; }
            const { blob, type } = await fetchGz(u, n => onProgress(got += n, total));
            got = got - blob.size + e.bytes;
            await cache.put(u, stored(blob, u, type));
            onProgress(got, total);
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
    function askAndDownload(/** @type {string} */ name, /** @type {any} */ opts, /** @type {number} */ totalBytes) {
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
            const msg = el('p', 'model-dialog-text', 'Pobrać model do odczytu wzorów? ' + mb(totalBytes) + ' MB, jednorazowo. Zdjęcia nie opuszczają telefonu.');
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
                try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) {}
                if (typeof caches === 'undefined' || typeof DecompressionStream === 'undefined') {
                    lastError = new Error('Ta przeglądarka nie obsługuje pobierania modelu. Zaktualizuj system lub przeglądarkę.');
                    msg.textContent = lastError.message;
                    ok.hidden = true; no.textContent = 'Zamknij';
                    return;
                }
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
            // dotknięcie własnego paddingu dialogu też ma target === dlg: liczy się tylko punkt poza ramką
            const outside = (/** @type {MouseEvent} */ e) => {
                const r = dlg.getBoundingClientRect();
                return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
            };
            dlg.addEventListener('cancel', e => { e.preventDefault(); if (!busy) finish(lastError || new Error('declined')); });
            dlg.addEventListener('click', e => { if (!busy && e.target === dlg && outside(e)) finish(lastError || new Error('declined')); });
            dlg.addEventListener('close', () => { if (!settled) finish(new Error('declined')); });
            document.body.appendChild(dlg);
            dlg.showModal();
        });
    }

    /** @param {string} name @param {{onProgress?:(got:number,total:number)=>void}=} opts */
    function ensure(name, opts) {
        if (running[name]) return running[name];
        const p = (async () => {
            if (!(await status(name)).ready) {
                const { manifest } = await loadManifest(name);
                await askAndDownload(name, opts, manifest.downloadBytes);
            }
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
        if (mres) {
            const m = await mres.json();
            for (const p of m.parts) await cache.delete(modelUrl(name, p.file));
            for (const u of extraUrls(m)) await cache.delete(u);
        }
        await cache.delete(modelUrl(name, 'manifest.json'));
    }

    /** @type {any} */ (window).MATM0_MODELS = { status, ensure, remove };
})();
