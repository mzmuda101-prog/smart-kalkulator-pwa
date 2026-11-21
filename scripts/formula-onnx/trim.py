# Usuwa plamki tuszu dotykające górnej lub dolnej krawędzi wycinka (skrawki sąsiednich wzorów).
import glob, os, sys, cv2, numpy as np
src, dst = sys.argv[1:3]
for f in sorted(glob.glob(f"{src}/[1-9]*.png")):
    im = cv2.imread(f); g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    n, lab, st, _ = cv2.connectedComponentsWithStats((g < 200).astype(np.uint8), 8)
    h = g.shape[0]
    for i in range(1, n):
        y, hh = st[i, cv2.CC_STAT_TOP], st[i, cv2.CC_STAT_HEIGHT]
        if y == 0 or y + hh >= h: im[lab == i] = 255
    cv2.imwrite(os.path.join(dst, os.path.basename(f)), im)
