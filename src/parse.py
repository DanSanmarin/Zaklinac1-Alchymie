# -*- coding: utf-8 -*-
import re, json

SUB = {"Vitriol":"vi","Rebis":"re","Aether":"ae","Quebrith":"qu","Hydragenum":"hy","Vermilion":"ve",
       "Albedo":"al","Nigredo":"ni","Rubedo":"ru"}

def clean(s):
    s = re.sub(r"\[\[(?:Image|image|File|Soubor):[^\]]*\]\]", "", s)
    s = re.sub(r"<span[^>]*>.*?</span>", "", s, flags=re.S)
    s = re.sub(r"\[\[([^\]|]*)\|([^\]]*)\]\]", r"\2", s)
    s = re.sub(r"\[\[([^\]]*)\]\]", r"\1", s)
    s = s.replace("'''","").replace("''","")
    s = s.replace("{{oren}}","orenů")
    s = re.sub(r"\s+"," ",s)
    return s.strip(" |")

def icon_of(cell):
    m = re.search(r"\[\[(?:Image|image|File|Soubor):([^|\]]+)", cell)
    return m.group(1).strip().replace(" ","_")[:-4] if m else None

def name_of(cell):
    m = re.search(r"\[\[([^\]|]*)\|([^\]]*)\]\]", cell)
    if m: return m.group(2).strip()
    m = re.search(r"\[\[([^\]]*)\]\]", cell)
    if m: return m.group(1).strip()
    return clean(cell)

def subs_in(cell):
    out=[]
    for m in re.finditer(r"Substances_Small_(\w+)\.png", cell.replace(" ","_")):
        k=m.group(1).capitalize()
        if k in SUB: out.append(SUB[k])
    return out

def rows(table):
    # split a wikitable body into rows
    body = table.split("\n|-",1)[1] if "\n|-" in table else table
    return [r for r in re.split(r"\n\|-[^\n]*\n", "\n|-\n"+body) if r.strip()]

def cells(row):
    # cells separated by || or newline-leading |
    parts=[]
    for line in row.split("\n"):
        line=line.strip()
        if line.startswith("!") or line.startswith("{|") or line.startswith("|}"): continue
        if line.startswith("|"):
            line=line[1:]
            parts.extend(line.split("||"))
        elif parts:
            parts[-1]+=" "+line
    return parts

def get_section(text, heading_re, stop="\n== "):
    m=re.search(heading_re, text)
    if not m: return ""
    rest=text[m.end():]
    i=rest.find(stop)
    return rest[:i] if i>0 else rest

def tables(text):
    return re.findall(r"\{\|.*?\n\|\}", text, flags=re.S)

R=lambda f: open(f,encoding="utf-8").read()

data={}

# ---------- INGREDIENTS ----------
pri = R("wt_Přísady.txt")
ing=[]
for kind, hre in [("rostlinná", r"=== Rostlinné přísady ==="),
                  ("živočišná", r"=== Živočišné přísady ==="),
                  ("minerální", r"=== Minerální přísady ===")]:
    sec = get_section(pri, hre, "\n=== ")
    t = tables(sec)[0]
    for row in rows(t):
        c = cells(row)
        if len(c) < 5: continue
        ic = icon_of(c[0])
        if not ic: continue
        nm = name_of(c[1])
        p = subs_in(c[2]); s = subs_in(c[3])
        desc = clean(c[4])
        prices = re.findall(r"'''(\d+)'''", " ".join(c[5:]))
        ing.append({"n":nm,"icon":ic,"p":p[0] if p else None,"s":s[0] if s else None,
                    "d":desc,"kind":kind,
                    "buy":int(prices[0]) if len(prices)>0 else None,
                    "sell":int(prices[1]) if len(prices)>1 else None})
data["ingredients"]=ing

# ---------- POTIONS ----------
el = R("W_Elixíry.txt")
sec = get_section(el, r"=== \[\[Image:Journal potion\.png\|Elixíry - přehled\]\] Přehled elixírů ===", "\n=== ")
pot=[]
for row in rows(tables(sec)[0]):
    c=cells(row)
    if len(c)<4: continue
    ic=icon_of(c[0])
    if not ic: continue
    pot.append({"n":name_of(c[1]),"icon":ic,"f":subs_in(c[2]),"e":clean(c[3]),
                "dur":clean(c[4]) if len(c)>4 else "","tox":clean(c[5]) if len(c)>5 else ""})
data["potions"]=pot

# ---------- OILS ----------
ol = R("W_Oleje.txt")
sec = get_section(ol, r"=== Nátěry na meč ===", "\n== ")
oils=[]
for row in rows(tables(sec)[0]):
    c=cells(row)
    if len(c)<4: continue
    ic=icon_of(c[0])
    if not ic: continue
    oils.append({"n":name_of(c[1]),"icon":ic,"f":subs_in(c[2]),"e":clean(c[3])})
data["oils"]=oils

# ---------- BOMBS ----------
pe = R("W_Petardy.txt")
sec = get_section(pe, r"=== Bomby ===", "\n== ")
bombs=[]
for row in rows(tables(sec)[0]):
    c=cells(row)
    if len(c)<4: continue
    ic=icon_of(c[0])
    if not ic: continue
    bombs.append({"n":name_of(c[1]),"icon":ic,"f":subs_in(c[2]),"e":clean(c[3])})
data["bombs"]=bombs

# ---------- BASES ----------
alc = R("W_Alkohol.txt")
bases=[]
for tier,hre,slots,price in [("Slabý alkohol", r"=== Slabý alkohol ===",3,20),
                             ("Kvalitní alkohol", r"=== Kvalitní alkohol ===",4,30),
                             ("Vysoce kvalitní alkohol", r"=== Vysoce kvalitní alkohol ===",5,50)]:
    sec=get_section(alc,hre,"\n=== ")
    for row in rows(tables(sec)[0]):
        c=cells(row)
        if len(c)<3: continue
        ic=icon_of(c[0])
        if not ic: continue
        bases.append({"n":clean(c[1]),"icon":ic,"d":clean(c[2]),"tier":tier,"slots":slots,"buy":price,"cat":"alkohol"})
bases.append({"n":"Bílý racek","icon":"Potion_White_Gull","d":"Zaklínačský halucinogen vlastní výroby; slouží jako alkohol nejvyšší kvality.","tier":"Vlastní výroba","slots":5,"buy":None,"cat":"alkohol"})

olsec=get_section(ol, r"=== Příprava ===", "\n=== ")
for row in rows(tables(olsec)[0]):
    c=cells(row)
    ic=icon_of(c[0]) if c else None
    if not ic: continue
    sl=re.search(r"(\d)\s*ingredienc", " ".join(c))
    pr=re.findall(r"'''(\d+)'''"," ".join(c))
    bases.append({"n":clean(c[1]),"icon":ic,"d":"","tier":"Tuk","slots":int(sl.group(1)) if sl else None,
                  "buy":int(pr[-2]) if len(pr)>=2 else None,"cat":"tuk"})

pesec=get_section(pe, r"=== Výbušný prach ===", "\n=== ")
for row in rows(tables(pesec)[0]):
    c=cells(row)
    ic=icon_of(c[0]) if c else None
    if not ic: continue
    sl=re.search(r"(\d)\s*ingredienc", " ".join(c))
    pr=re.findall(r"'''(\d+)'''"," ".join(c))
    bases.append({"n":clean(c[1]),"icon":ic,"d":"","tier":"Prach","slots":int(sl.group(1)) if sl else None,
                  "buy":int(pr[-2]) if len(pr)>=2 else None,"cat":"prach"})
data["bases"]=bases

json.dump(data, open("data.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)
for k,v in data.items(): print(k, len(v))
