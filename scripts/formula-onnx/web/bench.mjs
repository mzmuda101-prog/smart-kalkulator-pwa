// onnxruntime-web (WASM) w Node: czas wczytania, czas odczytu, pamięć, zgodność tokenów z Pythonem.
import * as ort from 'onnxruntime-web';
import fs from 'node:fs';
const threads = +(process.argv[2] || 1);
ort.env.wasm.numThreads = threads;
const py = JSON.parse(fs.readFileSync('../fns-int8pcc.json', 'utf8'));
const tok = JSON.parse(fs.readFileSync('../tokenizer.json', 'utf8'));
const vocab = Object.fromEntries(Object.entries(tok.model.vocab).map(([k, v]) => [v, k]));
for (const a of tok.added_tokens) vocab[a.id] = a.content;
const decode = ids => { const out = []; for (const id of ids) { if (id === 2) break; if (id > 3) out.push(vocab[id]); } return out.join('').replace(/Ġ/g, ' '); };
let t0 = performance.now();
const sess = await ort.InferenceSession.create(fs.readFileSync('model.onnx'), { executionProviders: ['wasm'] });
console.log('wątki', threads, 'wczytanie', Math.round(performance.now() - t0), 'ms, RSS', Math.round(process.memoryUsage().rss / 1e6), 'MB');
let same = 0, n = 0, tot = 0; const res = {};
for (const f of fs.readdirSync('x').sort()) {
  const id = f.slice(0, -4);
  const x = new Float32Array(fs.readFileSync('x/' + f).buffer.slice(0));
  t0 = performance.now();
  const r = await sess.run({ x: new ort.Tensor('float32', x, [1, 1, 384, 384]) });
  tot += performance.now() - t0; n++;
  const ids = Array.from(r[sess.outputNames[0]].data, Number);
  const txt = decode(ids); res[id] = { onnx: txt };
  const norm = s => s.replace(/\s+/g, '');
  if (norm(txt) === norm(py[id].onnx)) same++; else console.log('różnica', id, txt.slice(0, 80), '|', py[id].onnx.slice(0, 80));
}
fs.writeFileSync('../web.json', JSON.stringify(res, null, 1));
console.log(`zgodne z Pythonem ${same}/${n}, średnio ${Math.round(tot / n)} ms/wzór, RSS ${Math.round(process.memoryUsage().rss / 1e6)} MB`);
