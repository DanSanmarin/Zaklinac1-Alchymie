# -*- coding: utf-8 -*-
"""Z wikitextu stránek knih vytáhne, co kniha odemyká, kolik stojí a jak se dá sehnat."""
import json, re

raw  = json.load(open("books_raw.json", encoding="utf-8"))
data = json.load(open("data.json", encoding="utf-8"))
ING  = {i["n"] for i in data["ingredients"]}
REC  = {r["n"] for r in data["potions"] + data["oils"] + data["bombs"]}

# unikátní přísady, mutagenní elixíry a bossové = spoilery
SPOIL_ING = {"Oko chiméry","Stopa podsvětí","Obsidiánové srdce golema","Srst vlkodlaka",
             "Nerv kikimoří královny","Dagonův sliz","Srdce strigy","Kostějovo srdce",
             "Koščejovo srdce","Zeuglí jed"}
SPOIL_MON = {"Zeugl","Kostěj","Koščej","Striga","Chiméra","Golem","Vlkodlak",
             "Kikimoří královna","Bestie","Dagon"}
ALIAS = {"Bryonie":"Posed bílý", "Naezanské soli":"Naezanské soli"}
SPOIL_TITLE = {
 "Berengarovy poznámky ohledně Bestie","Odčarování strigy","Chiméra (kniha)","Ostritův zápisník",
 "Dopis pro Yennefer","Lařin dar","Legenda o Laře Dorren","Ithlinino proroctví (kniha)",
 "Starší krev (kniha)","Poslední přání (ve hře)","Babiččin památník","Oživení neoživeného",
 "Dagonova míza (svitek)","Duch golema (svitek)","Duše pekelného psa (svitek)","Hněv kikimory (svitek)",
 "Kostějova podstata (svitek)","Svěžest zeugla (svitek)","Vlkodlačí hněv (svitek)",
 "Vytrvalost strigy (svitek)","Zrak chiméry (svitek)","Feainnewedd (kniha)","Cesta, z níž není návratu (kniha)",
}

def clean(s):
    s = re.sub(r"\[\[(?:Image|image|File|Soubor):[^\]]*\]\]", "", s)
    s = re.sub(r"\[\[([^\]|]*)\|([^\]]*)\]\]", r"\2", s)
    s = re.sub(r"\[\[([^\]]*)\]\]", r"\1", s)
    s = s.replace("'''", "").replace("''", "")
    s = re.sub(r"<br\s*/?>", " ", s)
    s = re.sub(r"<[^>]+>", "", s)
    return re.sub(r"\s+", " ", s).strip()

def entries(text, labels):
    """odkazy pod nadpisem '''Label''': – ať už jako odrážky, nebo inline za dvojtečkou"""
    for lab in labels:
        m = re.search(r"'''\s*"+lab+r"\s*:?\s*'''\s*:?", text)
        if not m: continue
        rest = text[m.end():]
        links = lambda s: [(g[1] or g[0]).strip()
                           for g in re.findall(r"\[\[([^\]|]*)(?:\|([^\]]*))?\]\]", s)]
        first = rest.split("\n")[0].strip()
        # inline varianta: '''Ingredience''': [[A]], [[B]] – vše na jednom řádku, ne odrážky
        if first and not first.startswith("*") and "[[" in first:
            head = re.split(r"<br\s*/?>", first, maxsplit=1)[0]
            return links(head)
        # odrážková varianta
        out = []
        for line in rest.split("\n"):
            line = line.strip()
            if not line: continue
            if line.startswith("*"):
                out += links(line)[:1]
            elif out or line.startswith("'''") or line.startswith("=="): break
        if out: return out
    return []

def section(text, *names):
    for n in names:
        m = re.search(r"==\s*"+n+r"[^=]*==\s*\n(.*?)(?=\n==|\Z)", text, re.S)
        if m: return m.group(1)
    return ""

KIND = {"Books_Generic_wolf_motif":"Bestiář", "Books_Generic_leaf_motif":"Herbář",
        "Books_Generic_other":"Příručka", "Books_Generic_quest_item":"Příběhový",
        "Scrolls_generic_icon_blue":"Svitek s recepty", "Scrolls_generic_icon_red":"Svitek s recepty",
        "Scrolls_generic_icon":"Svitek s recepty"}

books, skipped = [], []
for title, t in sorted(raw.items(), key=lambda x: x[0]):
    game = t.split("== {{hra}} ==",1)[1] if "== {{hra}} ==" in t else t
    im = re.search(r"\[\[(?:Image|image|File|Soubor):([^|\]]+)", game) or re.search(r"\[\[(?:Image|image|File|Soubor):([^|\]]+)", t)
    icon = im.group(1).strip().replace(" ","_")[:-4] if im else None
    kind = KIND.get(icon or "", "Příručka")

    mon = entries(game, ["Bestiář"])
    ing = entries(game, ["Ingredience"])
    rec = entries(game, ["Recepty","Receptury"])
    rejm = re.search(r"'''Rejstřík'''\s*:?\s*([^\n]*)", game)
    rej = clean(rejm.group(1)) if rejm else ""

    desc = ""
    dm = re.search(r"\|\s*'''''[^']+'''''.*?\n+(.*?)\n\|\}", game, re.S)
    if dm: desc = clean(dm.group(1))
    if not desc:
        dm = re.search(r"\|\}\s*\n+([^\n=]+)", game)
        if dm: desc = clean(dm.group(1))

    cena = re.search(r"\{\{[Cc]ena\|(\d+)\|(\d+)\}\}", game)
    buy  = int(cena.group(1)) if cena else None
    sell = int(cena.group(2)) if cena else None

    lok = section(game, "Lokace", "Poznámky")
    low = clean(lok).lower()
    VENDORS = [("Antikvarista","antikvarist"), ("Knihkupec","knihkupec"), ("Bylinkář","bylinkář"),
               ("Kalkstein","kalkstein"), ("Poustevník","poustevník"), ("Abigail","abigail"),
               ("Hostinský","hostinsk"), ("Druidi","druid"), ("Léčitelka","léčitelk")]
    vend = [name for name, key in VENDORS if key in low]
    how = {"buy":   bool(vend) or bool(re.search(r"obchod|trh|kupec|prodává|koupit", low)),
           "find":  bool(re.search(r"bedn|kufr|skříň|truhl|sklep|police|regál|sud|na zemi|chat|dům|domě|krypt|vrak|hrob|tábor", low)),
           "reward":bool(re.search(r"odměn|za úkol|darem|dá ti|dá mu|dá geralt|dostane|výměnou", low))}

    # spoilerové položky z obsahu knihy vypustíme, knihu samotnou kvůli nim nezahazujeme
    ing = [ALIAS.get(i, i) for i in ing]
    ing = [i for i in ing if i in ING]
    rec = [r for r in rec if r in REC]
    mon = [m for m in mon if m not in SPOIL_MON]
    useful = bool(ing or rec) or bool(re.search(r"substanc|alchym|toxic", rej, re.I))
    row = dict(n=title, icon=icon, kind=kind, d=desc, buy=buy, sell=sell, mon=mon, ing=ing,
               rec=rec, rej=rej, how=how, vendors=vend)
    if title in SPOIL_TITLE: skipped.append((title,"spoiler")); continue
    if not useful:           skipped.append((title,"lore")); continue
    books.append(row)

json.dump(books, open("books.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)
print("použito:", len(books), "| spoiler:", sum(1 for _,w in skipped if w=="spoiler"), "| jen lore:", sum(1 for _,w in skipped if w=="lore"))
print("neznámé ingredience:", sorted({i for b in books for i in b["ing"] if i not in ING}))
print("neznámé recepty:", sorted({r for b in books for r in b["rec"] if r not in REC}))
print()
for b in books:
    print("%-34s %-16s %4s  b%d f%d r%d  mon:%d ing:%d rec:%d  %s" % (
        b["n"][:34], b["kind"], b["buy"], b["how"]["buy"], b["how"]["find"], b["how"]["reward"],
        len(b["mon"]), len(b["ing"]), len(b["rec"]), (b["d"] or "")[:40]))
