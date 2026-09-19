# -*- coding: utf-8 -*-
"""Odečte barvy substancí přímo z herních ikon, aby text v příručce
odpovídal tomu, co hráč vidí ve hře. Vstupem je složka se staženými ikonami
(Substances_Small_*.png). Výstup se ručně přepíše do :root ve style.css."""
import colorsys, sys, os
from PIL import Image

NAMES = ["Vitriol","Rebis","Aether","Quebrith","Hydragenum","Vermilion",
         "Albedo","Nigredo","Rubedo"]
KEY = {"Vitriol":"vi","Rebis":"re","Aether":"ae","Quebrith":"qu",
       "Hydragenum":"hy","Vermilion":"ve","Albedo":"al","Nigredo":"ni","Rubedo":"ru"}

src = sys.argv[1] if len(sys.argv) > 1 else "icons"

for n in NAMES:
    im = Image.open(os.path.join(src, "Substances_Small_%s.png" % n)).convert("RGBA")
    px = [p for p in im.getdata() if p[3] > 140]
    # nejsytější a nejjasnější pixely nesou barvu symbolu, ne rámečku
    scored = sorted(((s * v, r, g, b)
                     for r, g, b, a in px
                     for _, s, v in [colorsys.rgb_to_hsv(r/255, g/255, b/255)]),
                    reverse=True)
    top = scored[:max(8, len(scored)//8)]
    R, G, B = (sum(t[i] for t in top)/len(top) for i in (1, 2, 3))
    h, s, v = colorsys.rgb_to_hsv(R/255, G/255, B/255)
    # zesvětlit na čitelnost proti tmavému pozadí příručky
    r2, g2, b2 = colorsys.hsv_to_rgb(h, min(s, 0.72), max(v, 0.80))
    print("--%s:#%02x%02x%02x;   /* %s, ve hře #%02x%02x%02x */"
          % (KEY[n], int(r2*255), int(g2*255), int(b2*255), n, int(R), int(G), int(B)))
