# PP-FormulaNet-S → ONNX dla przeglądarki (próba techniczna, 2026-11-21)

Wyniki i wnioski: `docs/superpowers/specs/2026-11-21-skaner-i-granice-design.md` §5.10.
Środowisko: `~/.venvs/paddle-onnx` (Python 3.12: paddlepaddle, paddle2onnx, onnx, onnxruntime,
pymupdf, tokenizers, opencv-contrib-python). Uruchamiać przez `python -I`.

Kolejność:
1. `paddle2onnx --model_dir ~/.paddlex/official_models/PP-FormulaNet-S --model_filename inference.json
   --params_filename inference.pdiparams --save_file fn.onnx --opset_version 17`
2. `shrink.py fn.onnx fns` — wpieka maskę osadzeń, stałe → inicjalizatory, int8 dekodera
   (`per_channel=True`).
3. `convq.py fns_int8.onnx fns_int8c.onnx` — wagi Conv jako int8 + DequantizeLinear (≈ 59 MB).
4. `fixshapes.py wej.onnx wyj.onnx` — poprawki kształtów wymagane przez onnxruntime-web.

Test na wydruku (pliki w `test/fixtures-local/`, poza gitem):
- `crop.py <pdf> <folder>` — każdy wzór (a), (b)… do PNG; `trim.py <z> <do>` — usuwa skrawki z brzegów.
- `run.py <onnx> <folder> <wynik.json> [paddle]` — odczyt (i porównanie z Paddle); zapisuje też `tokenizer.json`.
- `node score.js <repo> <wynik.json> [-v]` — trafienia względem `test/limits-zestaw.json`.
- Tłumacz LaTeX → zapis parsera: `js/latex-to-expr.js` (ten sam, którego używa apka; `score.js` go wczytuje).
- `web/` — pomiar w onnxruntime-web: `bench.mjs` (Node), `serve.mjs` + `index.html` (przeglądarka, COOP/COEP);
  `web/` potrzebuje obok `model.onnx`, `ort/` (pliki z `onnxruntime-web/dist`) i `x/*.bin` (tensory z `run.py`).
- **Telefon tylko przez HTTPS** (`serve-https.mjs`, port 8766; przez `http` Safari liczy ok. 14× wolniej).
  Certyfikat obok skryptu: `openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 7
  -subj "/CN=<IP Maca>" -addext "subjectAltName=IP:<IP Maca>"`. Model w kawałkach `.gz` w `www/parts/`.
- `wq.py` — wariant pod WebGPU (int8 + DequantizeLinear); niepotrzebny, WASM na iPhonie wystarcza.
