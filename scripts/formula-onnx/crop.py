# Wycina każdy wzór (a), (b)… z PDF-u zadań do osobnego PNG (200 dpi), bez etykiety.
import re, sys, pymupdf
pdf, out = sys.argv[1], sys.argv[2]
cy = lambda r: (r.y0 + r.y1) / 2
n = 0
for page in pymupdf.open(pdf):
    words = [(pymupdf.Rect(w[:4]), w[4]) for w in page.get_text("words")]
    heads = [(r, t[:-1]) for r, t in words if re.fullmatch(r"\d+\.", t) and r.x0 < 70]
    head_y = [cy(h) for h, _ in heads]
    labels = [(r, t[1]) for r, t in words if re.fullmatch(r"\([a-z]\)", t) and r.x0 < 100]
    is_head_line = lambda r: any(abs(cy(r) - y) < 5 for y in head_y)
    footer = page.rect.y1 - 25  # numer strony leży ok. 772–784 pt
    items = [r for r, t in words if not is_head_line(r) and r.y1 < footer and r.x0 > 95]
    items += [p["rect"] for p in page.get_drawings() if p["rect"].x0 > 95 and p["rect"].y1 < footer]
    for lr, letter in labels:
        sec = max((t for h, t in heads if h.y0 < lr.y0), key=int, default="?")
        box = None; mine = []
        for r in items:
            near = min(labels, key=lambda o: abs(cy(r) - cy(o[0])))[0]
            crosses = any(min(cy(r), cy(lr)) < y < max(cy(r), cy(lr)) for y in head_y)
            if near is lr and not crosses:
                box = r if box is None else box | r
                mine.append(r)
        if box is None:
            continue
        n += 1
        clip = box + (-4, -4, 4, 4)
        pix = page.get_pixmap(dpi=200, clip=clip)
        if "--clean" in sys.argv:  # wybiel wszystko poza prostokątami tego wzoru (skrawki sąsiadów)
            from PIL import Image, ImageDraw
            im = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            mask = Image.new("L", im.size, 0); dr = ImageDraw.Draw(mask); k = 200 / 72
            for r in mine:
                dr.rectangle([(r.x0 - clip.x0 - 1) * k, (r.y0 - clip.y0 - 1) * k, (r.x1 - clip.x0 + 1) * k, (r.y1 - clip.y0 + 1) * k], fill=255)
            Image.composite(im, Image.new("RGB", im.size, "white"), mask).save(f"{out}/{sec}{letter}.png")
        else:
            pix.save(f"{out}/{sec}{letter}.png")
print(n)
