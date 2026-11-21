// Serwer testowy z COOP/COEP (wielowątkowy WASM wymaga crossOriginIsolated).
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
const root = path.join(path.dirname(new URL(import.meta.url).pathname), 'www');
const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm', '.onnx': 'application/octet-stream', '.bin': 'application/octet-stream' };
https.createServer({ key: fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'key.pem')), cert: fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'cert.pem')) }, (req, res) => {
  console.log(new Date().toISOString().slice(11, 19), req.socket.remoteAddress, req.url);
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  if (!p.startsWith(root) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Length': fs.statSync(p).size, 'Cache-Control': 'no-store', 'Content-Type': types[path.extname(p)] || 'application/octet-stream',
    'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' });
  fs.createReadStream(p).pipe(res);
}).listen(8766, '0.0.0.0', () => console.log('https://0.0.0.0:8766'));
