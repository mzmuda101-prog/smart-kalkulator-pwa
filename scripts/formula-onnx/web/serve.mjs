// Serwer testowy z COOP/COEP (wielowątkowy WASM wymaga crossOriginIsolated).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.join(path.dirname(new URL(import.meta.url).pathname), 'www');
const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm', '.onnx': 'application/octet-stream', '.bin': 'application/octet-stream' };
http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  if (!p.startsWith(root) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream',
    'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' });
  fs.createReadStream(p).pipe(res);
}).listen(8765, '0.0.0.0', () => console.log('http://0.0.0.0:8765'));
