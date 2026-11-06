# Test porównawczy OCR działań (skaner, 2026-11-06): syntetyczne „zdjęcia” (druk + kroje odręczne,
# 3 poziomy: czysty / telefon / cień+kratka+przechył) → Tesseract 5 (silnik tesseract.js),
# bez obróbki i z obróbką wstępną (spłaszczenie światła, Otsu, usunięcie kratki, prostowanie,
# kadr, skala). Uruchom: python3 -I scripts/ocr-bench/bench.py (Pillow + numpy + tesseract w PATH).
# Wyniki: docs/SCANNER-PLAN.md.
import json, math, os, random, subprocess, sys, tempfile, unicodedata
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

# Wyniki i obrazy: katalog OCR_BENCH_OUT (domyślnie katalog tymczasowy systemu — nie do repo)
OUT = os.environ.get("OCR_BENCH_OUT") or os.path.join(tempfile.gettempdir(), "kalkulator-ocr-bench")
os.makedirs(OUT, exist_ok=True)
random.seed(7); np.random.seed(7)

EXPRS = [
    ("2 + 3 × 4", "2+3*4"), ("12 ÷ 4 − 1", "12/4-1"), ("(3 + 5) · 2", "(3+5)*2"),
    ("7² − 10", "7^2-10"), ("3x + 5 = 11", "3x+5=11"), ("√16 + 2", "sqrt16+2"),
    ("x² − 5x + 6 = 0", "x^2-5x+6=0"), ("0,25 · 48", "0.25*48"), ("2/3 + 1/6", "2/3+1/6"),
    ("FRAC", "2/3+1/6"),  # ułamki piętrowe (2D) — prawdziwy test dla OCR linii
]
FONTS = {
    "druk": "/System/Library/Fonts/Helvetica.ttc",
    "pismo-bradley": "/System/Library/Fonts/Supplemental/Bradley Hand Bold.ttf",
    "pismo-chalk": "/System/Library/Fonts/Supplemental/ChalkboardSE.ttc",
    "pismo-marker": "/System/Library/Fonts/MarkerFelt.ttc",
}

def render(expr, font_path, size=64):
    f = ImageFont.truetype(font_path, size)
    if expr == "FRAC":  # stacked fractions
        img = Image.new("L", (620, 240), 255); d = ImageDraw.Draw(img)
        def frac(x, a, b):
            wa = d.textlength(a, font=f); wb = d.textlength(b, font=f); w = max(wa, wb) + 16
            d.text((x + (w - wa) / 2, 20), a, font=f, fill=0); d.line((x, 112, x + w, 112), fill=0, width=5)
            d.text((x + (w - wb) / 2, 122), b, font=f, fill=0); return x + w
        x = frac(30, "2", "3"); d.text((x + 20, 70), "+", font=f, fill=0); x = frac(x + 80, "1", "6")
        return img
    w = int(ImageDraw.Draw(Image.new("L", (1, 1))).textlength(expr, font=f)) + 80
    img = Image.new("L", (w, size * 2 + 20), 255)
    ImageDraw.Draw(img).text((40, size // 2), expr, font=f, fill=0)
    return img

def perspective(img, k):
    w, h = img.size
    dx, dy = w * k, h * k * 1.5
    src = [(0, 0), (w, 0), (w, h), (0, h)]
    dst = [(dx, dy), (w - dx * 0.3, 0), (w, h), (dx * 0.5, h - dy * 0.4)]
    # coefficients mapping dst->src for PIL
    A = []; B = []
    for (x, y), (u, v) in zip(dst, src):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]; B += [u, v]
    c = np.linalg.solve(np.array(A, float), np.array(B, float))
    return img.transform((w, h), Image.PERSPECTIVE, tuple(c), Image.BICUBIC, fillcolor=255)

def photo(img, level):
    """level 0: clean, 1: phone photo, 2: hard (shadow, tilt, blur, noise, lines)"""
    if level == 0: return img.convert("L")
    w, h = img.size
    pad = 60
    canvas = Image.new("L", (w + 2 * pad, h + 2 * pad), 255); canvas.paste(img, (pad, pad))
    if level >= 2:  # notebook lines
        d = ImageDraw.Draw(canvas)
        for y in range(10, canvas.size[1], 38): d.line((0, y, canvas.size[0], y), fill=205, width=2)
    canvas = canvas.rotate(3.5 if level == 1 else -6, resample=Image.BICUBIC, expand=True, fillcolor=255)
    canvas = perspective(canvas, 0.04 if level == 1 else 0.09)
    a = np.asarray(canvas, float)
    H, W = a.shape
    yy, xx = np.mgrid[0:H, 0:W]
    paper = 235 - 25 * (xx / W) - (40 if level >= 2 else 10) * (yy / H)      # uneven light
    if level >= 2: paper -= 55 * np.exp(-((xx - W * 0.7) ** 2) / (2 * (W * 0.18) ** 2))  # shadow band
    ink = 60 if level == 1 else 85                                             # pencil-ish contrast
    a = paper * (a / 255) + ink * (1 - a / 255)
    a += np.random.normal(0, 6 if level == 1 else 12, a.shape)
    out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    out = out.filter(ImageFilter.GaussianBlur(0.9 if level == 1 else 1.6))
    return out.resize((int(out.width * 0.7), int(out.height * 0.7)), Image.BILINEAR)  # lower resolution

# ── preprocessing (the browser pipeline we would build in JS/canvas) ──
def otsu(a):
    hist = np.bincount(a.ravel(), minlength=256).astype(float); p = hist / hist.sum()
    om = np.cumsum(p); mu = np.cumsum(p * np.arange(256)); mt = mu[-1]
    sb = (mt * om - mu) ** 2 / (om * (1 - om) + 1e-9); return int(np.argmax(sb))

def preprocess(img):
    g = np.asarray(img.convert("L"), float)
    bg = np.asarray(img.convert("L").filter(ImageFilter.GaussianBlur(max(8, img.height // 12))), float)
    flat = np.clip(g / (bg + 1e-6) * 255, 0, 255).astype(np.uint8)            # flatten light/shadow
    t = otsu(flat); bw = (flat < min(t, 200)).astype(np.uint8)                 # ink = 1
    # remove long thin horizontal lines (notebook ruling): rows where ink spans most of the width thinly
    rowfrac = bw.mean(1)
    for y in np.where(rowfrac > 0.55)[0]: bw[y, :] = 0
    # deskew by projection-profile variance
    best, ba = -1, 0
    im = Image.fromarray(bw * 255)
    for ang in np.arange(-10, 10.5, 0.5):
        r = np.asarray(im.rotate(ang, resample=Image.NEAREST, fillcolor=0), float)
        v = r.sum(1).var()
        if v > best: best, ba = v, ang
    bw = np.asarray(im.rotate(ba, resample=Image.BICUBIC, fillcolor=0)) > 127
    # crop to content (drop specks: rows/cols with very little ink)
    ys = np.where(bw.sum(1) > 1)[0]; xs = np.where(bw.sum(0) > 1)[0]
    if len(ys) and len(xs): bw = bw[max(0, ys[0] - 4): ys[-1] + 5, max(0, xs[0] - 4): xs[-1] + 5]
    out = Image.fromarray(np.where(bw, 0, 255).astype(np.uint8))
    s = 90 / max(1, out.height) if out.height < 90 else 1                     # ~90 px text height
    out = out.resize((max(1, int(out.width * s)), max(1, int(out.height * s))), Image.LANCZOS)
    return ImageOps.expand(out, 24, fill=255), ba

WL = "0123456789+-=()x.,/*^%√×÷·−²"
def tess(img, psm, whitelist):
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f: img.save(f.name)
    args = ["tesseract", f.name, "stdout", "--psm", str(psm), "-l", "eng"]
    if whitelist: args += ["-c", f"tessedit_char_whitelist={WL}"]
    r = subprocess.run(args, capture_output=True, text=True); os.unlink(f.name)
    return r.stdout.strip().replace("\n", " ")

def norm(s):
    s = unicodedata.normalize("NFKC", s)
    for a, b in [("×", "*"), ("·", "*"), ("÷", "/"), ("−", "-"), ("–", "-"), ("—", "-"), ("√", "sqrt"), ("²", "^2"), (",", "."), (" ", ""), ("X", "x")]:
        s = s.replace(a, b)
    return s

def cer(a, b):
    d = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        prev, d[0] = d[0], i
        for j, cb in enumerate(b, 1):
            prev, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, prev + (ca != cb))
    return d[len(b)] / max(1, len(b))

rows = []
os.makedirs(os.path.join(OUT, "img"), exist_ok=True)
for style, fp in FONTS.items():
    for ei, (expr, gold) in enumerate(EXPRS):
        base = render(expr, fp)
        for level in (0, 1, 2):
            ph = photo(base, level)
            name = f"{style}-{ei}-L{level}"
            ph.save(os.path.join(OUT, "img", name + ".png"))
            pre, ang = preprocess(ph)
            if ei in (0, 8, 9) and level == 2: pre.save(os.path.join(OUT, "img", name + "-pre.png"))
            for variant, im in (("surowe", ph), ("obróbka", pre)):
                for cfg, psm, wl in (("psm7", 7, False), ("psm7+lista", 7, True)):
                    txt = tess(im, psm, wl)
                    rows.append(dict(style=style, expr=ei, level=level, variant=variant, cfg=cfg, out=txt, ok=norm(txt) == gold, cer=cer(norm(txt), gold)))
json.dump(rows, open(os.path.join(OUT, "results.json"), "w"), ensure_ascii=False, indent=0)

# summary
def agg(filt):
    r = [x for x in rows if filt(x)]
    return f"{100 * sum(x['ok'] for x in r) / len(r):5.1f}% trafień, CER {100 * sum(x['cer'] for x in r) / len(r):5.1f}%" if r else "—"
print("Tesseract 5.5 (silnik tesseract.js), 4 kroje × 10 działań × 3 poziomy zdjęcia")
for variant in ("surowe", "obróbka"):
    for cfg in ("psm7", "psm7+lista"):
        print(f"\n[{variant} / {cfg}]  razem: {agg(lambda x: x['variant'] == variant and x['cfg'] == cfg)}")
        for level, lab in ((0, "czysty skan"), (1, "zdjęcie telefonem"), (2, "trudne: cień, kratka, przechył")):
            print(f"   {lab:32s} druk: {agg(lambda x: x['variant'] == variant and x['cfg'] == cfg and x['level'] == level and x['style'] == 'druk')} | pismo: {agg(lambda x: x['variant'] == variant and x['cfg'] == cfg and x['level'] == level and x['style'] != 'druk')}")
print("\nUłamki piętrowe (2D), najlepsza konfiguracja:", agg(lambda x: x['expr'] == 9 and x['variant'] == 'obróbka' and x['cfg'] == 'psm7+lista'))
print("Przykłady (obróbka, psm7+lista, poziom 1):")
for x in rows:
    if x['variant'] == 'obróbka' and x['cfg'] == 'psm7+lista' and x['level'] == 1 and x['style'] in ('druk', 'pismo-bradley'):
        print(f"   {x['style']:14s} {EXPRS[x['expr']][0]:18s} → {x['out']!r:24s} {'✓' if x['ok'] else '✗'}")
