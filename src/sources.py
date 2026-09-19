# -*- coding: utf-8 -*-
import json, re
d = json.load(open("data.json", encoding="utf-8"))

# (nominative, [regex forms]) — pořadí je důležité (delší/specifičtější první)
MON = [
 ("Kikimoří bojovnice", r"kikimoř\w*\s+bojovnic\w*"),
 ("Kikimora", r"kikimor\w*"),
 ("Alghúl", r"alghúl\w*"),
 ("Ghúl", r"(?<![a-zá-ž])ghúl\w*"),
 ("Utopenec", r"utopen\w*"),
 ("Topivec", r"topiv\w*"),
 ("Polednice", r"polednic\w*"),
 ("Půlnočnice", r"půlnočnic\w*"),
 ("Přelud", r"přelud\w*"),
 ("Barghest", r"barghest\w*"),
 ("Ifrít", r"ifrít\w*"),
 ("Echinops", r"echinops\w*"),
 ("Archespora", r"archespor\w*"),
 ("Pes", r"(?<![a-zá-ž])ps[ůyaie]\w*|(?<![a-zá-ž])pes(?![a-zá-ž])"),
 ("Vlk", r"(?<![a-zá-ž])vlk\w*"),
 ("Ohař", r"ohař\w*"),
 ("Mutant", r"mutant\w*"),
 ("Alpa", r"(?<![a-zá-ž])alp[ay]?(?![a-zá-ž])"),
 ("Bruxa", r"(?<![a-zá-ž])brux\w*"),
 ("Fleder", r"fleder\w*"),
 ("Garkain", r"garkain\w*"),
 ("Wyverna", r"wyvern\w*"),
 ("Nekrofág", r"nekrofág\w*"),
 ("Graveir", r"graveir\w*"),
 ("Požíračka", r"požírač\w*"),
 ("Rybolidé (vodníci)", r"rybolid\w*"),
 ("Kurolišek", r"kurolišk\w*|kurolišek"),
 ("Bazilišek", r"baziliš\w*"),
 ("Bloedzuiger", r"bloedzuiger\w*"),
 ("Skolopendromorf", r"skolopendromorf\w*"),
]

for ing in d["ingredients"]:
    txt = ing["d"]
    found, rest = [], txt
    for name, rx in MON:
        if re.search(rx, rest, flags=re.I):
            found.append(name)
            rest = re.sub(rx, " ", rest, flags=re.I)
    ing["mon"] = found
    low = txt.lower()
    if "lze pouze koupit" in low:      ing["how"] = "koupit"
    elif "nelze získat" in low:        ing["how"] = "nelze"
    elif found:                        ing["how"] = "loot"
    elif ing["kind"] == "rostlinná":   ing["how"] = "sběr"
    else:                              ing["how"] = "koupit"

beasts = {}
for ing in d["ingredients"]:
    for m in ing["mon"]:
        beasts.setdefault(m, []).append(ing["n"])
d["beasts"] = {k: sorted(set(v)) for k, v in sorted(beasts.items())}

json.dump(d, open("data.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for k, v in d["beasts"].items(): print(k, "->", ", ".join(v))
print()
print({i["n"]: i["how"] for i in d["ingredients"] if i["how"] in ("koupit","nelze")})
