// @ts-check
// Serwer deweloperski i testowy: statyczny, z COOP/COEP (wielowątkowy WASM wymaga crossOriginIsolated).
// Użycie: node scripts/dev-server.mjs [port]   (domyślnie 3000, tylko 127.0.0.1)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const port = Number(process.argv[2] || process.env.PORT) || 3000;
const types = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
    '.wasm': 'application/wasm', '.gz': 'application/gzip', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

http.createServer((req, res) => {
    const head = {
        'Cache-Control': 'no-store',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
    };
    let rel;
    try { rel = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname); } catch { res.writeHead(400, head); return res.end(); }
    let p = path.join(root, rel);
    if (p !== root && !p.startsWith(root + path.sep)) { res.writeHead(403, head); return res.end(); }
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
    if (!fs.existsSync(p)) { res.writeHead(404, head); return res.end('Not found'); }
    res.writeHead(200, { ...head, 'Content-Type': types[path.extname(p)] || 'application/octet-stream', 'Content-Length': fs.statSync(p).size });
    fs.createReadStream(p).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}`));
