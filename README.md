# Zaklínač – Alchymistická příručka

Offline HTML příručka alchymie k první hře *Zaklínač* (2007), v českém znění hry.

**Výsledek:** `../Zaklinac-Alchymie.html` – jediný soubor, stačí otevřít v prohlížeči.
Funguje bez internetu, ikony i data jsou zabudované uvnitř.

## Co obsahuje

| Sekce | Obsah |
|---|---|
| Základy | mechanika: substance, dominanty, toxicita, základy (alkohol / tuk / prach), co odemyká co |
| Elixíry | 21 receptů s účinkem, trváním, toxicitou a doporučeným složením |
| Oleje | 9 nátěrů na meč |
| Petardy | 5 bomb |
| Ingredience | 73 přísad – filtry, řazení, evidence vlastní zásoby |
| Bestiář | co spadne z které nestvůry + přehled rostlin a minerálů, u každé bestie potřebná kniha |
| Knihy | 39 herbářů, bestiářů, svitků a příruček – co odemykají, kolik stojí, koupit / najít / odměna |
| Kombinace | 24 sestav ve 4 kategoriích – pořadí pití, toxicita na stupnici 0–100, volba dominanty, klik otevře souhrn co nasbírat a koho zabít |
| Plánovač | naklikáš recepty → co uvařit s dominantou, nákupní a sběrný list, ceny, základy |

U každého receptu se dopočítává konkrétní složení: varianta „ze sběru a lovu“,
„nejlevnější nákup“ a pro elixíry všechny tři dominanty (albedo / nigredo / rubedo).
Vlastní zásoba se ukládá do `localStorage` prohlížeče.

Toxicita se počítá ve skutečných herních bodech (nízká 10–14, střední 15–20, vysoká 21–25,
velmi vysoká 26–30; nad 50 vedlejší účinky, na 100 smrt), takže plán i sestava ukazují
reálné rozpětí a upozorní, kdy se vyplatí proložit pití meditací.

**Ovládání detailu:** najetím myší na přísadu nebo recept vyskočí tooltip se složením,
způsobem získání a cenou. Proklikem se otevře plný detail a v hlavičce zásuvky přibude
šipka zpět (nebo `Backspace` / `Alt+←`), takže se vracíš tam, odkud jsi přišel.
Zavírá se křížkem, `Esc` nebo kliknutím vedle.

Barvy substancí v textu odpovídají barvám herních ikon – hodnoty vypočítá `src/colors.py`
přímo z pixelů ikon a ručně se přepíšou do `:root` ve `style.css`.

Knihy jsou provázané se zbytkem: u přísady vidíš, který herbář či bestiář ji odemyká,
u receptu, ze kterého svitku pochází, a u sestavy i plánu dostaneš nejmenší sadu knih,
která pokryje všechno potřebné.

**Bez spoilerů:** unikátní přísady z bossů, mutagenní elixíry z nich a příběhové knihy
jsou záměrně vynechané; spoilerové položky se nezobrazují ani v obsahu jinak užitečných knih.

## Struktura

```
src/parse.py    wikitext -> data/data.json
src/books.py    stránky knih -> seznam knih v data.json
src/sources.py  doplní „z čeho co padá“ a způsob získání
src/build.py    složí src/* + data/* do jednoho HTML
src/style.css   vzhled
src/body.html   kostra stránky
src/app.js      logika (výpočet složení, filtry, plánovač)
data/           data.json + icons_b64.json (ikony jako data URI)
```

## Přestavba

```bash
python src/build.py
```

`parse.py` a `sources.py` se pouštějí jen při obnově dat z wiki – jejich vstupem
jsou stažené wikitexty, ne tento repozitář.

## Zdroje dat

České názvy, popisy, receptury, ceny a ikony pocházejí z české
[Zaklínač Wiki](https://zaklinac.fandom.com) (stránky *Přísady*, *Elixíry*, *Oleje*,
*Petardy*, *Alkohol*, *Substance*, *Alchymie v Zaklínači*). Doporučené sestavy
v sekci Kombinace jsou vlastní doporučení postavená na těchto datech.
