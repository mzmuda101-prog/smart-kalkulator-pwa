# Próba techniczna: PP-FormulaNet-S w Paddle (wzorzec) i w ONNX na wycinkach wzorów.
# Użycie: python -I run.py <onnx> <folder_wycinków> <wynik.json> [paddle]
import glob, json, os, sys, time
import numpy as np, yaml
from PIL import Image, ImageOps
import onnxruntime as ort
from tokenizers import Tokenizer

MODEL_DIR = os.path.expanduser("~/.paddlex/official_models/PP-FormulaNet-S")
onnx_path, crops, out_json = sys.argv[1:4]
use_paddle = "paddle" in sys.argv[4:]

cfg = yaml.safe_load(open(f"{MODEL_DIR}/inference.yml"))
tok_json = os.path.join(os.path.dirname(out_json), "tokenizer.json")
json.dump(cfg["PostProcess"]["character_dict"]["fast_tokenizer_file"], open(tok_json, "w"))
tok = Tokenizer.from_file(tok_json)

def preprocess(path, size=384):
    # = UniMERNetImgDecode + UniMERNetTestTransform + UniMERNetImageFormat (PaddleX)
    img = Image.open(path).convert("RGB")
    g = np.array(img.convert("L")).astype(np.float64)
    lo, hi = g.min(), g.max()
    if hi > lo:
        ys, xs = np.nonzero((g - lo) / (hi - lo) * 255 < 200)
        img = img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    w, h = img.size
    if w <= h: nw, nh = size, int(size * h / w)
    else: nw, nh = int(size * w / h), size
    img = img.resize((nw, nh), resample=Image.BILINEAR)
    img.thumbnail((size, size))
    dw, dh = size - img.width, size - img.height
    img = ImageOps.expand(img, (dw // 2, dh // 2, dw - dw // 2, dh - dh // 2))  # czarne pole, jak w PaddleX
    a = np.array(img).astype(np.float32) / 255.0
    a = (a - 0.7931) / 0.1738
    gray = a[..., 0] * 0.114 + a[..., 1] * 0.587 + a[..., 2] * 0.299  # cv2 BGR2GRAY na tablicy RGB
    return gray[None, None].astype(np.float32)

def decode(ids):
    ids = list(ids)
    if 2 in ids: ids = ids[: ids.index(2) + 1]
    return tok.decode(ids, skip_special_tokens=True)

so = ort.SessionOptions(); so.log_severity_level = 3
sess = ort.InferenceSession(onnx_path, so, providers=["CPUExecutionProvider"])
paddle_model = None
if use_paddle:
    from paddleocr import FormulaRecognition
    paddle_model = FormulaRecognition(model_name="PP-FormulaNet-S")

res = {}
for f in sorted(glob.glob(f"{crops}/[1-9]*.png")):
    k = os.path.basename(f)[:-4]
    x = preprocess(f)
    t0 = time.time(); ids = sess.run(None, {"x": x})[0][0]; dt = time.time() - t0
    r = {"onnx": decode(ids), "onnx_s": round(dt, 2), "tokens": int(len(ids))}
    if paddle_model:
        t0 = time.time(); r["paddle"] = paddle_model.predict(f)[0]["rec_formula"]; r["paddle_s"] = round(time.time() - t0, 2)
    res[k] = r
    print(k, r["onnx_s"], r["onnx"], "" if not paddle_model else ("== paddle" if r["paddle"].replace(" ", "") == r["onnx"].replace(" ", "") else "!= " + r["paddle"]), flush=True)
json.dump(res, open(out_json, "w"), ensure_ascii=False, indent=1)
