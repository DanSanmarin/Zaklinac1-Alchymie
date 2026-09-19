# -*- coding: utf-8 -*-
"""Sestaví jediný offline HTML soubor z částí v src/ a dat v data/."""
import json, os, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT  = os.path.join(os.path.dirname(ROOT), "Zaklinac-Alchymie.html")

def read(p):
    return open(os.path.join(ROOT, p), encoding="utf-8").read()

css   = read("src/style.css")
body  = read("src/body.html")
app   = read("src/app.js")
data  = json.load(open(os.path.join(ROOT, "data/data.json"), encoding="utf-8"))
icons = json.load(open(os.path.join(ROOT, "data/icons_b64.json"), encoding="utf-8"))

def js(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

html = """<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Zaklínač – Alchymistická příručka</title>
<meta name="description" content="Kompletní offline příručka alchymie ze hry Zaklínač (2007) v češtině.">
<link rel="icon" href="data:image/svg+xml,%s">
<style>
%s
</style>
</head>
<body>
%s
<script>
window.DATA=%s;
window.ICONS=%s;
</script>
<script>
%s
</script>
</body>
</html>
""" % (
    "%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2064%2064'%3E%3Cpath%20d='M14%2010L22%2026L18%2046L32%2056L46%2046L42%2026L50%2010L38%2018L32%2014L26%2018Z'%20fill='none'%20stroke='%23c9a227'%20stroke-width='4'/%3E%3C/svg%3E",
    css, body, js(data), js(icons), app
)

open(OUT, "w", encoding="utf-8").write(html)
print("Zapsáno:", OUT)
print("Velikost: %.2f MB" % (os.path.getsize(OUT) / 1048576.0))
print("Ingrediencí: %d | elixírů: %d | olejů: %d | petard: %d | ikon: %d"
      % (len(data["ingredients"]), len(data["potions"]), len(data["oils"]), len(data["bombs"]), len(icons)))
