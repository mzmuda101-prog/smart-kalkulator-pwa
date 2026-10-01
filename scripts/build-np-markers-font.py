"""
Czcionka-cień dla znaczników formatowania notatnika (U+E000–U+E01F).

Notatnik = przezroczysta <textarea> nad sformatowanym podglądem (.np-mirror).
Znaczniki B/I/U/H1… to znaki z Private Use Area; podgląd ich nie rysuje,
ale textarea rysowała je w fontcie zastępczym o PEŁNEJ szerokości znaku
(9,64 px przy 16 px) → natywny kursor iOS/Androida stał 1–2 znaki obok
tego, co widać, a Backspace kasował nie ten znak.

Ta czcionka ma dla tych kodów puste glify o zerowej szerokości, więc
textarea i podgląd mają identyczną geometrię. Ładowana przez @font-face
z unicode-range — dotyka WYŁĄCZNIE znaczników.

Uruchom: python3 scripts/build-np-markers-font.py
"""
import os
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'fonts', 'np-markers.woff')
CODEPOINTS = list(range(0xE000, 0xE020))

names = ['.notdef'] + ['uni%04X' % cp for cp in CODEPOINTS]
fb = FontBuilder(1000, isTTF=True)
fb.setupGlyphOrder(names)
fb.setupCharacterMap({cp: 'uni%04X' % cp for cp in CODEPOINTS})
empty = TTGlyphPen(None).glyph()
fb.setupGlyf({n: empty for n in names})
fb.setupHorizontalMetrics({n: (0, 0) for n in names})
fb.setupHorizontalHeader(ascent=800, descent=-200)
fb.setupNameTable({'familyName': 'NpMarkers', 'styleName': 'Regular'})
fb.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
fb.setupPost()
fb.font.flavor = 'woff'
fb.save(OUT)
print('OK', os.path.abspath(OUT), os.path.getsize(OUT), 'B')
