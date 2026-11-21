# Rysuje wzory testowe skanera (mathtext, 200 dpi, czarny na białym) do test/fixtures/formulas/.
# Użycie: python -I render-fixtures.py
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
plt.rcParams["mathtext.fontset"] = "cm"  # krój jak w LaTeX-u, bliżej wydruku

FORMULAS = {
    "frac": r"\lim_{n\to\infty}\frac{2n+1}{6n+5}",
    "sqrt-lim": r"\lim_{x\to 5}\frac{x-5}{3-\sqrt{x+4}}",
    "power": r"\lim_{n\to\infty}\left(1+\frac{1}{2n}\right)^{n}",
}
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "test", "fixtures", "formulas")
os.makedirs(out, exist_ok=True)
for name, tex in FORMULAS.items():
    fig = plt.figure(figsize=(1, 1), dpi=200, facecolor="white")
    fig.text(0, 0, f"${tex}$", fontsize=28, color="black")
    fig.savefig(os.path.join(out, name + ".png"), dpi=200, bbox_inches="tight", pad_inches=0.15, facecolor="white")
    plt.close(fig)

# frac.y4m: fałszywa kamera Chromium (--use-file-for-fake-video-capture). frac.png na białym tle 640x360, 1 klatka (Chromium zapętla; mały plik w repo)
import shutil, subprocess
if shutil.which("ffmpeg"):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", os.path.join(out, "frac.png"), "-frames:v", "1",
                    "-vf", "pad=640:360:(ow-iw)/2:(oh-ih)/2:white,format=yuv420p", os.path.join(out, "frac.y4m")], check=True)

# two-pages.pdf: 2 strony A4 do testu wyboru strony PDF. Strona 1: zwykły tekst, strona 2: wzór frac na środku, dużo większy niż na zdjęciu.
from matplotlib.backends.backend_pdf import PdfPages
with PdfPages(os.path.join(out, "two-pages.pdf")) as pdf:
    for body, size in (("Zadanie domowe. Strona pierwsza bez wzoru.", 14), (f"${FORMULAS['frac']}$", 56)):
        fig = plt.figure(figsize=(8.27, 11.69), facecolor="white")
        fig.text(0.5, 0.5, body, fontsize=size, color="black", ha="center", va="center")
        pdf.savefig(fig, facecolor="white")
        plt.close(fig)

# one-page.pdf: jedna strona A4 z samym wzorem (picker pomijany).
with PdfPages(os.path.join(out, "one-page.pdf")) as pdf:
    fig = plt.figure(figsize=(8.27, 11.69), facecolor="white")
    fig.text(0.5, 0.5, f"${FORMULAS['frac']}$", fontsize=56, color="black", ha="center", va="center")
    pdf.savefig(fig, facecolor="white")
    plt.close(fig)
