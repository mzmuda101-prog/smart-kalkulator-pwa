# Test modeli rozpoznawania działań na tych samych „zdjęciach” co bench.py (Tesseract):
# pix2tex (LaTeX-OCR), TrOCR small printed / handwritten (Microsoft), opcjonalnie PaddleOCR.
# Każdy model: obraz surowy i po obróbce wstępnej (ta sama funkcja preprocess co w bench.py).
# Uruchom: python -I scripts/ocr-bench/models.py [pix2tex trocr-p trocr-h paddle]  (najpierw bench.py)
import json, os, re, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, "bench.py"), encoding="utf8").read()
exec(src[: src.index("rows = []")])  # EXPRS, FONTS, preprocess, norm, cer, OUT…
from PIL import Image

def latex_to_expr(s):
    s = s.strip().strip("$")
    s = re.sub(r"\\(left|right|displaystyle|mathrm|textstyle|,|;|!|quad)", "", s)
    for _ in range(4):
        s = re.sub(r"\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}", r"\1/\2", s)
        s = re.sub(r"\\sqrt\s*\{([^{}]*)\}", r"sqrt\1", s)
        s = re.sub(r"\^\s*\{([^{}]*)\}", r"^\1", s)
        s = re.sub(r"\{([^{}]*)\}", r"\1", s)
    for a, b in [(r"\times", "*"), (r"\cdot", "*"), (r"\div", "/"), (r"\sqrt", "sqrt"), ("\\", "")]:
        s = s.replace(a, b)
    return s

MODELS = {}
def m_pix2tex():
    from pix2tex.cli import LatexOCR
    m = LatexOCR()
    return lambda im: latex_to_expr(m(im.convert("RGB")))
def m_trocr(name):
    def make():
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel
        p = TrOCRProcessor.from_pretrained(name); m = VisionEncoderDecoderModel.from_pretrained(name)
        def run(im):
            px = p(images=im.convert("RGB"), return_tensors="pt").pixel_values
            return p.batch_decode(m.generate(px, max_new_tokens=40), skip_special_tokens=True)[0]
        return run
    return make
def m_paddle():
    from paddleocr import FormulaRecognition
    m = FormulaRecognition(model_name="PP-FormulaNet-S")
    def run(im):
        path = os.path.join(OUT, "_paddle.png"); im.convert("RGB").save(path)
        res = m.predict(path)
        return latex_to_expr(res[0]["rec_formula"] if res else "")
    return run
MODELS = {"pix2tex": m_pix2tex, "trocr-p": m_trocr("microsoft/trocr-small-printed"), "trocr-h": m_trocr("microsoft/trocr-small-handwritten"), "paddle": m_paddle}

want = sys.argv[1:] or ["pix2tex", "trocr-p", "trocr-h"]
rows = []
for mname in want:
    try:
        t0 = time.time(); run = MODELS[mname](); load = time.time() - t0
    except Exception as e:
        print(f"{mname}: nie udało się wczytać ({e})"); continue
    times = []
    for style in FONTS:
        for ei, (expr, gold) in enumerate(EXPRS):
            for level in (0, 1, 2):
                ph = Image.open(os.path.join(OUT, "img", f"{style}-{ei}-L{level}.png"))
                pre, _ = preprocess(ph)
                for variant, im in (("surowe", ph), ("obróbka", pre)):
                    t = time.time()
                    try: out = run(im)
                    except Exception as e: out = f"ERR {e}"
                    times.append(time.time() - t)
                    n = norm(out)
                    rows.append(dict(model=mname, style=style, expr=ei, level=level, variant=variant, out=out, ok=n == gold, cer=cer(n, gold)))
    print(f"{mname}: wczytanie {load:.1f} s, mediana {sorted(times)[len(times)//2]*1000:.0f} ms/obraz (CPU Mac)")
json.dump(rows, open(os.path.join(OUT, "models.json"), "w"), ensure_ascii=False, indent=0)

def agg(f):
    r = [x for x in rows if f(x)]
    return f"{100*sum(x['ok'] for x in r)/len(r):5.1f}% / CER {100*sum(min(1, x['cer']) for x in r)/len(r):5.1f}%" if r else "—"
for mname in want:
    print(f"\n== {mname}  (trafienia / błąd znaków)")
    for variant in ("surowe", "obróbka"):
        print(f"  [{variant}] razem {agg(lambda x: x['model']==mname and x['variant']==variant)}")
        for lv, lab in ((0, "czysty"), (1, "telefon"), (2, "trudne")):
            print(f"     {lab:8s} druk {agg(lambda x: x['model']==mname and x['variant']==variant and x['level']==lv and x['style']=='druk')} | pismo {agg(lambda x: x['model']==mname and x['variant']==variant and x['level']==lv and x['style']!='druk')}")
    print(f"  ułamki piętrowe (obróbka): {agg(lambda x: x['model']==mname and x['variant']=='obróbka' and x['expr']==9)}")
    for x in rows:
        if x['model']==mname and x['variant']=='obróbka' and x['level']==1 and x['style'] in ('druk','pismo-bradley'):
            print(f"     {x['style']:14s} {EXPRS[x['expr']][0]:16s} → {x['out'][:40]!r} {'✓' if x['ok'] else '✗'}")
