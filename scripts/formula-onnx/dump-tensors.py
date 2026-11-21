# Zrzuca RGBA + tensor z run.py:preprocess dla ~10 wycinków (parytet z js/formula-image.js).
# Użycie: ~/.venvs/paddle-onnx/bin/python -I dump-tensors.py <folder_wycinków> <folder_wynikowy> [liczba]
import glob, json, os, sys, types
import numpy as np
from PIL import Image
# preprocess() z run.py bez jego kodu startowego (modele, argv)
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "run.py"), encoding="utf-8").read()
start = src.index("def preprocess"); end = src.index("def decode")
ns = {"np": np, "Image": Image, "ImageOps": __import__("PIL.ImageOps", fromlist=["x"])}
exec(src[start:end], ns)
crops, out = sys.argv[1:3]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 10
os.makedirs(out, exist_ok=True)
files = sorted(glob.glob(f"{crops}/*.png"))
for f in files[:: max(1, len(files) // n)][:n]:
    k = os.path.basename(f)[:-4]
    im = Image.open(f).convert("RGBA")
    open(f"{out}/{k}.rgba", "wb").write(im.tobytes())
    json.dump({"width": im.width, "height": im.height}, open(f"{out}/{k}.json", "w"))
    ns["preprocess"](f).astype(np.float32).tofile(f"{out}/{k}.bin")
    print(k, im.size)
