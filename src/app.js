/* ===== Zaklínač – Alchymistická příručka ===== */
(function () {
"use strict";

/* ---------- konstanty ---------- */
const SUBS = {
  vi:{n:"Vitriol",   ic:"Substances_Small_Vitriol",    d:"Základ ostrých, leptavých a zrychlujících účinků. Nejběžnější substance ve hře – najdeš ji v bejlí, houbách i v ghúlech."},
  re:{n:"Rebis",     ic:"Substances_Small_Rebis",      d:"Substance rovnováhy a regenerace. Nosí ji mrtvolné a nekrofágní přísady i měsíční minerály."},
  ae:{n:"Aether",    ic:"Substances_Small_Aether",     d:"Substance ducha a energie. Bývá v mozcích, peřích a v jemných květech."},
  qu:{n:"Quebrith",  ic:"Substances_Small_Quebrith",   d:"Substance odolnosti a kostí. Kost, morek, dráp, kořen mandragory."},
  hy:{n:"Hydragenum",ic:"Substances_Small_Hydragenum", d:"Substance proměny a vody. Ektoplasma, šlachy, mutageny, vzácné destiláty."},
  ve:{n:"Vermilion", ic:"Substances_Small_Vermilion",  d:"Substance ohně a jedu. Jedové váčky, toxin, fosfor, hořlaviny."}
};
const SEC = {
  al:{n:"Albedo", ic:"Substances_Small_Albedo", d:"Snižuje toxicitu o jeden stupeň.", dur:"1 hodina",
      c:"Bílá cesta – sníží toxicitu tohoto elixíru i všech, které do sebe naliješ během následující hodiny. Sama se nesčítá, druhé albedo už nic nepřidá."},
  ni:{n:"Nigredo", ic:"Substances_Small_Nigredo", d:"Zvyšuje způsobovaná zranění o 20 %.", dur:"4 hodiny",
      c:"Černá cesta – tichý bonus k poškození ke všemu, co už máš vypité."},
  ru:{n:"Rubedo", ic:"Substances_Small_Rubedo", d:"Urychluje regeneraci vitality.", dur:"4 hodiny",
      c:"Červená cesta – hodí se do dlouhých výprav, kde není kde meditovat."}
};
const TOXN = {"Žádná":0,"Nízká":1,"Střední":2,"Vysoká":3,"Velmi vysoká":4};
const TOXD = ["bez toxicity","lehká zátěž","střední zátěž","těžká zátěž","na hraně smrti"];
/* Skutečné hodnoty ze hry, na stupnici 0–100: nad 50 vedlejší účinky, na 100 smrt. */
const TOXR = {"Žádná":[0,0],"Nízká":[10,14],"Střední":[15,20],"Vysoká":[21,25],"Velmi vysoká":[26,30]};
const TOXORDER = ["Žádná","Nízká","Střední","Vysoká","Velmi vysoká"];
const toxDown = t => TOXORDER[Math.max(0, TOXORDER.indexOf(t) - 1)] || "Žádná";
function sumTox(list){                       /* list = pole názvů toxicity */
  return list.reduce((a,t)=>{ const r = TOXR[t] || [0,0]; return [a[0]+r[0], a[1]+r[1]]; }, [0,0]);
}
const fmtTox = r => (r[0]===r[1] ? String(r[0]) : r[0]+"–"+r[1]);
function toxClass(r){ return r[1] >= 100 ? "red" : r[1] > 50 ? "gold" : "green"; }
function toxWord(r){
  if (r[1] >= 100) return "smrtelné – tolik do sebe nedostaneš";
  if (r[1] > 50)   return "přes 50 začnou vedlejší účinky";
  if (r[1] > 35)   return "bezpečné, ale rezerva už je malá";
  return "bezpečně pod hranicí vedlejších účinků";
}

const D = window.DATA, IC = window.ICONS;
const $ = (s,r) => (r||document).querySelector(s);
const $$ = (s,r) => Array.prototype.slice.call((r||document).querySelectorAll(s));
const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const norm = s => String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");

/* Ikony jedou přes CSS třídy – každý obrázek je v dokumentu jen jednou,
   takže se stovky ikon v seznamech nepromítnou do velikosti DOMu. */
function injectIconCSS(){
  const rules = [];
  for (const k in IC) rules.push(".ic-"+k+"{background-image:url("+IC[k]+")}");
  const st = document.createElement("style");
  st.textContent = rules.join("\n");
  document.head.appendChild(st);
}
function img(name, cls) {
  if (!IC[name]) return '<span class="ico '+(cls||"s")+'"></span>';
  return '<span class="ico '+(cls||"s")+' ic-'+name+'" role="img"></span>';
}
function subChip(code, withName) {
  if (!code) return '<span class="muted tiny">—</span>';
  const s = SUBS[code] || SEC[code];
  return '<span class="sub-chip s-'+code+'" title="'+esc(s.n)+'">'+img(s.ic,"xs")+(withName!==false?'<b>'+esc(s.n)+'</b>':'')+'</span>';
}
function formulaHTML(f) {
  return '<span class="formula">'+f.map(c=>'<span title="'+esc(SUBS[c].n)+'">'+img(SUBS[c].ic,"s")+'</span>').join("")+'</span>';
}
function toxPips(tox) {
  const v = TOXN[tox] != null ? TOXN[tox] : 0;
  const r = TOXR[tox] || [0,0];
  let h = '<span class="tox'+(v>=4?" t4":"")+'" title="Toxicita '+esc(tox||"—")+' = '+fmtTox(r)+' ze 100">';
  for (let i=0;i<4;i++) h += '<i class="'+(i<v?"on":"")+'"></i>';
  return h+'</span>';
}
const cost = i => (i.buy==null ? 999 : i.buy);
const money = n => n.toLocaleString("cs-CZ")+" ořechů";

/* ---------- indexy ---------- */
const ING = D.ingredients.filter(i=>true);
const byName = {}; ING.forEach(i=>byName[i.n]=i);
const byPrim = {}; ING.forEach(i=>{ (byPrim[i.p]=byPrim[i.p]||[]).push(i); });
const usable = i => i.how !== "nelze";

const RECIPES = []
  .concat(D.potions.map(p=>Object.assign({},p,{kind:"elixir"})))
  .concat(D.oils.map(p=>Object.assign({},p,{kind:"olej"})))
  .concat(D.bombs.map(p=>Object.assign({},p,{kind:"petarda"})));
const recByName = {}; RECIPES.forEach(r=>recByName[r.n]=r);

function counts(f){ const c={}; f.forEach(s=>c[s]=(c[s]||0)+1); return c; }

/* základ podle počtu ingrediencí */
function baseInfo(rec){
  const n = rec.f.length;
  if (rec.kind === "elixir") {
    if (n<=3) return {t:"Slabý alkohol a lepší", d:"Stačí kterákoli kořalka za 20 ořechů (Temerská žitná, Místní pepřovka…).", slots:n};
    if (n===4) return {t:"Kvalitní alkohol", d:"Temerský či Trpasličí špiritus, Slivovice, Višňovka s lihem, Zerrikánský špiritus.", slots:n};
    return {t:"Vysoce kvalitní alkohol", d:"Alkahest, Azoth, Pelyňkovka, Kořalka z mandragory, Špiritus s wyverní krví – nebo vlastní Bílý racek.", slots:n};
  }
  if (rec.kind === "olej") {
    if (n<=4) return {t:"Jakýkoli tuk", d:"Husí sádlo, Lůj, Psí sádlo, Medvědí sádlo, Alchymistická pasta.", slots:n};
    return {t:"Tuk na 5 ingrediencí", d:"Psí sádlo (nejlevnější), Medvědí sádlo nebo Alchymistická pasta.", slots:n};
  }
  if (n<=4) return {t:"Jakýkoli prach", d:"Salnytr, Černý prášek, Zerrikánská směs, Alchymistický prášek.", slots:n};
  return {t:"Prach na 5 ingrediencí", d:"Zerrikánská směs nebo Alchymistický prášek.", slots:n};
}

/* výběr konkrétních ingrediencí pro recept */
function pick(f, opts){
  opts = opts || {};
  const c = counts(f), out = [];
  for (const s in c){
    let cand = (byPrim[s]||[]).filter(usable);
    if (opts.dom) cand = cand.filter(i=>i.s===opts.dom);
    if (opts.buyable) cand = cand.filter(i=>i.buy>0);
    if (opts.only) cand = cand.filter(opts.only);
    if (!cand.length) return null;
    cand = cand.slice().sort((a,b)=>(opts.rank?opts.rank(a)-opts.rank(b):0) || cost(a)-cost(b) || a.n.localeCompare(b.n,"cs"));
    out.push({ing:cand[0], q:c[s], sub:s, alts:cand});
  }
  out.sort((a,b)=>b.q-a.q || a.ing.n.localeCompare(b.ing.n,"cs"));
  return out;
}
const comboCost = list => list.reduce((t,x)=>t + (x.ing.buy==null?0:x.ing.buy)*x.q, 0);
/* Nákupní cena 0 znamená „zboží bez hodnoty" – takovou věc u obchodníka nekoupíš,
   musíš si pro ni dojít. Proto se sběr a nákup řadí každý podle jiného klíče. */
const gatherRank = i => (i.how==="sběr" ? 0 : i.how==="loot" ? 1 : 3);

/* ---------- inventář ---------- */
const LS = "zaklinac-alchymie-v1";
let INV = {};
try { INV = JSON.parse(localStorage.getItem(LS)||"{}") || {}; } catch(e){ INV = {}; }
const saveInv = () => { try{ localStorage.setItem(LS, JSON.stringify(INV)); }catch(e){} };
const invOf = n => INV[n]|0;

/* ================= UI: záložky ================= */
const VIEWS = [
  {id:"zaklady",   t:"Základy"},
  {id:"elixiry",   t:"Elixíry",     c:D.potions.length},
  {id:"oleje",     t:"Oleje",       c:D.oils.length},
  {id:"petardy",   t:"Petardy",     c:D.bombs.length},
  {id:"ingredience",t:"Ingredience",c:ING.length},
  {id:"bestiar",   t:"Bestiář"},
  {id:"knihy",     t:"Knihy",       c:(D.books||[]).length},
  {id:"kombinace", t:"Kombinace"},
  {id:"planovac",  t:"Plánovač"}
];
let CUR = "zaklady";
function buildTabs(){
  $("#tabs").innerHTML = VIEWS.map(v=>'<button data-v="'+v.id+'">'+esc(v.t)+(v.c?'<span class="cnt">'+v.c+'</span>':'')+'</button>').join("");
  $$("#tabs button").forEach(b=>b.onclick=()=>go(b.dataset.v));
}
function go(id){
  CUR = id;
  $$("#tabs button").forEach(b=>b.classList.toggle("on", b.dataset.v===id));
  $$("section.view").forEach(s=>s.classList.toggle("on", s.id==="v-"+id));
  location.hash = id;
  window.scrollTo(0,0);
  syncWikiMenu();
  applySearch();
}

/* ================= ODKAZ NA WIKI ================= */
const WIKI = "https://zaklinac.fandom.com/";
const wikiUrl = pg => WIKI + "wiki/" + encodeURIComponent(pg.replace(/ /g, "_"));
/* hledání nikdy neskončí na neexistující stránce, na rozdíl od přímého odkazu */
const wikiFind = q => WIKI + "wiki/Special:Search?query=" + encodeURIComponent(q) + "&scope=internal";
const WIKITABS = [
  {v:"zaklady",     t:"Alchymie v Zaklínači", p:"Alchymie v Zaklínači"},
  {v:"elixiry",     t:"Elixíry",              p:"Elixíry"},
  {v:"oleje",       t:"Oleje",                p:"Oleje"},
  {v:"petardy",     t:"Petardy",              p:"Petardy"},
  {v:"ingredience", t:"Přísady",              p:"Přísady"},
  {v:"bestiar",     t:"Nestvůry",             p:"Nestvůry"},
  {v:"knihy",       t:"Knihy ve hře",         p:"Knihy ve hře"}
];
const WIKIMORE = [
  {t:"Substance",        p:"Substance"},
  {t:"Alkohol",          p:"Alkohol"},
  {t:"Toxicita",         p:"Toxicita"},
  {t:"Meditace",         p:"Meditace"},
  {t:"Zaklínač (PC hra)",p:"Zaklínač (PC hra)"}
];
function renderWikiMenu(){
  const m = $("#wiki-menu"); if (!m) return;
  const a = l => '<a href="'+wikiUrl(l.p)+'" target="_blank" rel="noopener"'+
    (l.v?' data-v="'+l.v+'"':'')+'>'+esc(l.t)+'</a>';
  m.innerHTML = '<div class="wm-h">Česká Zaklínač Wiki &ndash; zdroj dat</div>'+
    WIKITABS.map(a).join("") + '<hr>' + WIKIMORE.map(a).join("");
  syncWikiMenu();
}
function syncWikiMenu(){
  $$("#wiki-menu a[data-v]").forEach(x=>x.classList.toggle("cur", x.dataset.v===CUR));
}
function initWiki(){
  renderWikiMenu();
  const btn = $("#wiki-btn"), menu = $("#wiki-menu");
  if (!btn || !menu) return;
  const close = ()=>{ menu.classList.remove("on"); btn.classList.remove("on"); btn.setAttribute("aria-expanded","false"); };
  btn.onclick = e=>{
    e.stopPropagation();
    const open = !menu.classList.contains("on");
    menu.classList.toggle("on", open); btn.classList.toggle("on", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  };
  document.addEventListener("click", e=>{ if (!e.target.closest || !e.target.closest(".wikibox")) close(); });
  document.addEventListener("keydown", e=>{ if (e.key==="Escape") close(); });
}
/* výška lepící hlavičky – ať se pod ni schová i záhlaví tabulky */
function setHeaderVar(){
  const h = $("header.top");
  if (h && document.documentElement && document.documentElement.style)
    document.documentElement.style.setProperty("--hh", (h.offsetHeight || 0) + "px");
}

/* ================= ZÁKLADY ================= */
function renderBasics(){
  $("#prim-subs").innerHTML = Object.keys(SUBS).map(k=>{
    const n = ING.filter(i=>i.p===k).length;
    return '<div class="panel tight"><h3 class="s-'+k+'" style="display:flex;align-items:center;gap:8px">'+img(SUBS[k].ic,"m")+esc(SUBS[k].n)+'</h3>'+
      '<p class="small muted" style="margin:0 0 8px">'+esc(SUBS[k].d)+'</p>'+
      '<span class="badge">'+n+' ingrediencí</span></div>';
  }).join("");

  $("#sec-subs").innerHTML = Object.keys(SEC).map(k=>{
    const n = ING.filter(i=>i.s===k).length;
    return '<div class="panel tight"><h3 class="s-'+k+'" style="display:flex;align-items:center;gap:8px">'+img(SEC[k].ic,"m")+esc(SEC[k].n)+'</h3>'+
      '<p class="small" style="margin:0 0 6px"><b>'+esc(SEC[k].d)+'</b> <span class="badge">'+esc(SEC[k].dur)+'</span></p>'+
      '<p class="small muted" style="margin:0 0 8px">'+esc(SEC[k].c)+'</p>'+
      '<span class="badge">'+n+' ingrediencí</span></div>';
  }).join("");

  $("#tox-scale").innerHTML = TOXORDER.map(k=>
    '<tr><td style="width:34%">'+esc(k)+'</td><td>'+toxPips(k)+'</td>'+
    '<td class="num" style="width:74px">'+fmtTox(TOXR[k])+'</td>'+
    '<td class="muted small">'+esc(TOXD[TOXN[k]])+'</td></tr>').join("");

  const cats = [["alkohol","Alkohol – pro elixíry"],["tuk","Tuk – pro oleje"],["prach","Výbušný prach – pro petardy"]];
  $("#bases-box").innerHTML = cats.map(([c,label])=>{
    const rows = D.bases.filter(b=>b.cat===c).map(b=>
      '<tr><td style="width:44px">'+img(b.icon,"m")+'</td><td>'+esc(b.n)+'</td>'+
      '<td><span class="badge gold">'+(b.slots||"?")+' ingrediencí</span></td>'+
      '<td class="muted small">'+esc(b.tier==="Tuk"||b.tier==="Prach"?"":b.tier)+'</td>'+
      '<td class="num">'+(b.buy==null?"—":b.buy)+'</td></tr>').join("");
    return '<h3 style="margin-top:16px">'+esc(label)+'</h3><div class="tblwrap"><table>'+
      '<thead><tr><th></th><th>Název</th><th>Kapacita</th><th>Kvalita</th><th style="text-align:right">Nákup</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  }).join("");
}

/* ================= KARTY RECEPTŮ ================= */
function recCard(r){
  const tox = r.kind==="elixir" ? toxPips(r.tox) : '<span class="badge green">bez toxicity</span>';
  const bi = baseInfo(r);
  return '<div class="card" data-rec="'+esc(r.n)+'" data-search="'+esc(norm(r.n+" "+r.e))+'">'+
    '<div class="hd">'+img(r.icon,"f")+'<div style="flex:1"><div class="nm">'+esc(r.n)+'</div>'+formulaHTML(r.f)+'</div></div>'+
    '<div class="fx">'+esc(r.e)+'</div>'+
    '<div class="row"><span class="badge">'+esc(bi.t)+'</span>'+tox+'</div>'+
    (r.kind==="elixir"?'<div class="row tiny muted"><span>'+esc(r.dur)+'</span><span>'+domBadges(r)+'</span></div>':'')+
    '</div>';
}
function domBadges(r){
  if (r.kind!=="elixir") return "";
  return Object.keys(SEC).map(k=> pick(r.f,{dom:k}) ? '<span title="Dosažitelná dominanta '+esc(SEC[k].n)+'">'+img(SEC[k].ic,"xs")+'</span>' : '').join("");
}
function renderList(id, arr){
  $("#list-"+id).innerHTML = arr.map(recCard).join("");
  $$("#list-"+id+" .card").forEach(c=>c.onclick=()=>openRec(recByName[c.dataset.rec]));
}

/* filtry pro elixíry / oleje */
let fElix = {tox:null, slots:null, dom:null};
function renderElixFilters(){
  const box = $("#f-elixiry");
  const toxKeys = Object.keys(TOXN);
  box.innerHTML =
    '<span class="tiny muted" style="letter-spacing:.1em;text-transform:uppercase">Toxicita</span>'+
    toxKeys.map(k=>'<button class="chip" data-f="tox" data-v="'+esc(k)+'">'+esc(k)+'</button>').join("")+
    '<span class="tiny muted" style="margin-left:10px;letter-spacing:.1em;text-transform:uppercase">Základ</span>'+
    [[3,"3 ingredience"],[4,"4 ingredience"],[5,"5 ingrediencí"]].map(([v,t])=>'<button class="chip" data-f="slots" data-v="'+v+'">'+t+'</button>').join("")+
    '<span class="tiny muted" style="margin-left:10px;letter-spacing:.1em;text-transform:uppercase">Dominanta</span>'+
    Object.keys(SEC).map(k=>'<button class="chip" data-f="dom" data-v="'+k+'">'+img(SEC[k].ic,"xs")+esc(SEC[k].n)+'</button>').join("");
  $$("#f-elixiry .chip").forEach(b=>b.onclick=()=>{
    const f=b.dataset.f, v=b.dataset.v;
    const val = (f==="slots") ? +v : v;
    fElix[f] = (fElix[f]===val) ? null : val;
    $$("#f-elixiry .chip").forEach(x=>x.classList.toggle("on", fElix[x.dataset.f]=== (x.dataset.f==="slots"?+x.dataset.v:x.dataset.v)));
    drawElix();
  });
}
function drawElix(){
  let a = D.potions.map(p=>Object.assign({},p,{kind:"elixir"}));
  if (fElix.tox) a = a.filter(p=>p.tox===fElix.tox);
  if (fElix.slots) a = a.filter(p=>p.f.length===fElix.slots);
  if (fElix.dom) a = a.filter(p=>!!pick(p.f,{dom:fElix.dom}));
  a.sort((x,y)=>(TOXN[x.tox]-TOXN[y.tox]) || x.f.length-y.f.length || x.n.localeCompare(y.n,"cs"));
  renderList("elixiry", a);
  applySearch();
}
function renderOilFilters(){
  const box = $("#f-oleje");
  box.innerHTML = '<span class="tiny muted" style="letter-spacing:.1em;text-transform:uppercase">Zaměření</span>'+
    [["nestvůry","proti nestvůrám"],["lidem","proti lidem"],["meč","vylepšení meče"]].map(([v,t])=>'<button class="chip" data-v="'+v+'">'+t+'</button>').join("");
  let cur=null;
  $$("#f-oleje .chip").forEach(b=>b.onclick=()=>{
    cur = (cur===b.dataset.v)?null:b.dataset.v;
    $$("#f-oleje .chip").forEach(x=>x.classList.toggle("on", x.dataset.v===cur));
    let a = D.oils.map(o=>Object.assign({},o,{kind:"olej"}));
    if (cur==="lidem") a = a.filter(o=>/lidem/.test(o.e));
    if (cur==="nestvůry") a = a.filter(o=>/zvyšuje zranění/i.test(o.e));
    if (cur==="meč") a = a.filter(o=>/meč/i.test(o.e) && !/zvyšuje zranění/i.test(o.e));
    renderList("oleje", a); applySearch();
  });
}

/* ================= DETAIL RECEPTU ================= */
function ingLine(x){
  const i = x.ing, have = invOf(i.n);
  return '<div class="ing-line"><span class="q">'+x.q+'&times;</span>'+img(i.icon,"s")+
    '<span class="nm" style="cursor:pointer" data-ing="'+esc(i.n)+'">'+esc(i.n)+'</span>'+
    (i.s?subChip(i.s,false):'')+
    (have?'<span class="badge green tiny">máš '+have+'</span>':'')+
    '<span class="pr">'+(i.buy==null?"":i.buy+" oř./ks")+'</span></div>';
}
function comboBlock(title, list, note, cls, mode){
  if (!list) return '<div class="combo dead"><div class="ch"><span class="t">'+title+'</span><span class="badge red">nelze složit</span></div>'+
    '<div class="small muted">'+esc(note||"Pro některou z potřebných substancí neexistuje vhodná ingredience.")+'</div></div>';
  let badge;
  if (mode === "buy") badge = '<span class="badge gold">'+money(comboCost(list))+'</span>';
  else {
    const buyCnt = list.filter(x=>x.ing.how==="koupit").reduce((s,x)=>s+x.q,0);
    badge = buyCnt
      ? '<span class="badge">'+buyCnt+'&times; dokoupit</span>'
      : '<span class="badge green">vše nasbíráš sám</span>';
  }
  return '<div class="combo '+(cls||"")+'"><div class="ch"><span class="t">'+title+'</span>'+badge+
    (note?'<span class="small muted">'+esc(note)+'</span>':'')+'</div>'+
    list.map(ingLine).join("")+'</div>';
}
/* Historie zásuvky – proklik na ingredienci nesmí zahodit, odkud jsi přišel. */
let STACK = [];
function drawerHead(icon, title, sub){
  const back = STACK.length > 1
    ? '<button class="xbtn back" id="drawer-back" title="Zpět na '+esc(STACK[STACK.length-2].label)+'">&#8592;</button>'
    : '';
  $("#drawer-h").innerHTML = back + img(icon,"f")+
    '<div style="min-width:0"><div class="dtitle">'+esc(title)+'</div>'+
    '<div class="tiny muted">'+sub+'</div></div>'+
    '<span class="dh-actions">'+
      '<a class="xbtn" href="'+wikiFind(title)+'" target="_blank" rel="noopener" '+
        'title="Najít „'+esc(title)+'“ na české Zaklínač Wiki">'+
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+
        '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg></a>'+
      '<button class="xbtn" id="drawer-close">&times;</button>'+
    '</span>';
  const b = $("#drawer-back"); if (b) b.onclick = drawerBack;
  $("#drawer-close").onclick = window.__closeDrawer;
}
function drawerBack(){
  STACK.pop();
  const e = STACK[STACK.length-1];
  if (!e) return window.__closeDrawer();
  if (e.t === "rec") openRec(recByName[e.k], true);
  else if (e.t === "lo") openLoadout(e.k, true);
  else if (e.t === "book") openBook(e.k, true);
  else openIng(e.k, true);
}

function openRec(r, back){
  if (!r) return;
  if (!back) STACK.push({t:"rec", k:r.n, label:r.n});
  const bi = baseInfo(r);
  const kindLabel = {elixir:"Elixír",olej:"Olej",petarda:"Petarda"}[r.kind];
  drawerHead(r.icon, r.n, kindLabel+' &middot; '+r.f.length+' ingrediencí');

  let h = '<dl class="kv">';
  h += '<dt>Účinek</dt><dd>'+esc(r.e)+'</dd>';
  if (r.kind==="elixir"){
    h += '<dt>Trvání</dt><dd>'+esc(r.dur)+'</dd>';
    h += '<dt>Toxicita</dt><dd>'+toxPips(r.tox)+' <span class="muted small">'+esc(r.tox)+'</span></dd>';
  }
  h += '<dt>Složení</dt><dd>'+formulaHTML(r.f)+' <span class="muted small">'+r.f.map(c=>SUBS[c].n).join(" + ")+'</span></dd>';
  h += '<dt>Základ</dt><dd><b>'+esc(bi.t)+'</b><div class="muted small">'+esc(bi.d)+'</div></dd>';
  const rb = bookByRec[r.n] || [];
  h += '<dt>Recept z</dt><dd>'+(rb.length
    ? rb.map(bookLink).join(" ")
    : '<span class="muted small">zdroj receptu wiki neuvádí</span>')+'</dd>';
  h += '</dl><hr class="orn">';

  h += '<h3>Doporučené složení</h3>';
  const gather = pick(r.f,{rank:gatherRank});
  const cheap  = pick(r.f,{buyable:true});
  h += comboBlock("Ze sběru a lovu", gather, "Co si nasbíráš sám cestou.", "best", "gather");
  if (cheap && JSON.stringify(cheap.map(x=>x.ing.n)) !== JSON.stringify(gather.map(x=>x.ing.n)))
    h += comboBlock("Nejlevnější nákup", cheap, "Když to chceš mít hned od alchymisty.", "", "buy");

  if (r.kind==="elixir"){
    h += '<h3 style="margin-top:16px">Dominanty</h3>';
    h += '<p class="small muted" style="margin-top:-4px">Celý elixír musí být ze stejné sekundární substance. Pak dostaneš bonus navíc.</p>';
    Object.keys(SEC).forEach(k=>{
      const l = pick(r.f,{dom:k, rank:gatherRank});
      h += comboBlock(SEC[k].n+" &ndash; "+SEC[k].d.toLowerCase().replace(/\.$/,""), l, null);
    });
  } else {
    h += '<div class="note">U olejů a petard sekundární substance nic nedělají &ndash; ber prostě to nejlevnější, co máš po ruce.</div>';
  }

  h += '<hr class="orn"><h3>Co se vejde do každého slotu</h3>';
  const c = counts(r.f);
  Object.keys(c).forEach(s=>{
    const list = (byPrim[s]||[]).slice().sort((a,b)=>gatherRank(a)-gatherRank(b) || cost(a)-cost(b));
    h += '<div class="combo"><div class="ch">'+img(SUBS[s].ic,"s")+'<span class="t s-'+s+'">'+esc(SUBS[s].n)+'</span>'+
      '<span class="badge">'+c[s]+'&times; potřeba</span><span class="badge">'+list.length+' možností</span></div>'+
      '<div style="display:flex;flex-wrap:wrap;gap:6px">'+
      list.map(i=>'<span class="pill" data-ing="'+esc(i.n)+'" title="'+esc(i.d)+'">'+img(i.icon,"s")+esc(i.n)+
        (i.s?subChip(i.s,false):"")+(i.how==="nelze"?'<span class="badge red tiny">nelze získat</span>':"")+'</span>').join("")+
      '</div></div>';
  });

  openDrawer(h);
}

/* ================= DETAIL INGREDIENCE ================= */
function openIng(name, back){
  const i = byName[name]; if (!i) return;
  if (!back) STACK.push({t:"ing", k:i.n, label:i.n});
  drawerHead(i.icon, i.n, esc(i.kind)+' přísada');
  let h = '<dl class="kv">';
  h += '<dt>Popis</dt><dd>'+esc(i.d)+'</dd>';
  h += '<dt>Substance</dt><dd>'+subChip(i.p)+' '+(i.s?subChip(i.s):'<span class="muted small">bez sekundární</span>')+'</dd>';
  h += '<dt>Získání</dt><dd>'+esc(HOWTXT[i.how])+'</dd>';
  if (i.mon && i.mon.length) h += '<dt>Padá z</dt><dd>'+i.mon.map(m=>'<span class="badge">'+esc(m)+'</span>').join(" ")+'</dd>';
  h += '<dt>Cena</dt><dd>nákup '+(i.buy==null?"—":i.buy)+' &middot; prodej '+(i.sell==null?"—":i.sell)+'</dd>';
  h += '<dt>Zásoba</dt><dd id="ing-ctr"></dd>';
  if (i.how==="loot" || i.how==="sběr"){
    const bl = bookByIng[i.n] || [];
    h += '<dt>Odemyká</dt><dd>'+(bl.length
      ? bl.map(bookLink).join(" ")
      : '<span class="muted small">kniha k této přísadě není v datech wiki</span>')+'</dd>';
  }
  h += '</dl><hr class="orn">';

  const uses = RECIPES.filter(r=>r.f.indexOf(i.p)>=0);
  h += '<h3>Kde se hodí</h3><p class="small muted" style="margin-top:-4px">Recepty, které potřebují '+esc(SUBS[i.p].n)+
       (i.s?'. Tučně ty, u kterých si s ní můžeš vzít dominantu <b>'+esc(SEC[i.s].n)+'</b>.':'.')+'</p>';
  ["elixir","olej","petarda"].forEach(k=>{
    const list = uses.filter(r=>r.kind===k);
    if (!list.length) return;
    h += '<div class="combo"><div class="ch"><span class="t">'+({elixir:"Elixíry",olej:"Oleje",petarda:"Petardy"}[k])+'</span></div>'+
      '<div style="display:flex;flex-wrap:wrap;gap:6px">'+list.map(r=>{
        const dom = i.s && r.kind==="elixir" && pick(r.f,{dom:i.s});
        return '<span class="pill" data-rec="'+esc(r.n)+'">'+img(r.icon,"s")+(dom?'<b>'+esc(r.n)+'</b>':esc(r.n))+
          ' <span class="tiny muted">'+r.f.filter(x=>x===i.p).length+'&times;</span></span>';
      }).join("")+'</div></div>';
  });
  openDrawer(h);
  const box = $("#ing-ctr"); if (box) box.appendChild(counterEl(i.n, ()=>{ drawIng(); }));
}

function counterEl(name, after){
  const w = document.createElement("span"); w.className="ctr";
  const mk=(t,d)=>{const b=document.createElement("button");b.textContent=t;b.onclick=e=>{e.stopPropagation();
    INV[name]=Math.max(0,(INV[name]|0)+d); if(!INV[name]) delete INV[name]; saveInv(); s.textContent=invOf(name); after&&after();};return b;};
  const s=document.createElement("span"); s.textContent=invOf(name);
  w.appendChild(mk("−",-1)); w.appendChild(s); w.appendChild(mk("+",1));
  return w;
}

/* ================= TOOLTIPY ================= */
const HOWTXT = {loot:"Z mrtvol nestvůr", "sběr":"Sběr v terénu", koupit:"Koupit u obchodníka", nelze:"Ve hře nelze získat"};
let tipEl = null, tipTimer = null;

function tipIngHTML(i){
  const have = invOf(i.n);
  return '<div class="tip-h">'+img(i.icon,"m")+'<div><b>'+esc(i.n)+'</b>'+
    '<div class="tiny muted">'+esc(i.kind)+' přísada</div></div></div>'+
    '<div class="tip-subs">'+subChip(i.p)+(i.s?subChip(i.s):'<span class="muted tiny">bez sekundární</span>')+'</div>'+
    '<div class="tip-d">'+esc(i.d)+'</div>'+
    '<div class="tip-f"><span>'+esc(HOWTXT[i.how])+'</span>'+
      (i.buy!=null?'<span>nákup '+i.buy+' / prodej '+(i.sell==null?"—":i.sell)+'</span>':'')+
      (have?'<span class="ok">v zásobě: '+have+'</span>':'')+'</div>'+
    ((i.mon&&i.mon.length)?'<div class="tip-f"><span>padá z: '+esc(i.mon.join(", "))+'</span></div>':'');
}
function tipRecHTML(r){
  const bi = baseInfo(r);
  return '<div class="tip-h">'+img(r.icon,"m")+'<div><b>'+esc(r.n)+'</b>'+
    '<div class="tiny muted">'+({elixir:"Elixír",olej:"Olej",petarda:"Petarda"}[r.kind])+'</div></div></div>'+
    '<div class="tip-subs">'+formulaHTML(r.f)+'</div>'+
    '<div class="tip-d">'+esc(r.e)+'</div>'+
    '<div class="tip-f"><span>'+esc(bi.t)+'</span>'+
      (r.kind==="elixir"?'<span>'+esc(r.dur)+'</span><span>toxicita '+esc(r.tox).toLowerCase()+'</span>':'')+'</div>';
}
function tipBookHTML(b){
  const parts = [];
  if (b.ing.length) parts.push(b.ing.length+" přísad");
  if (b.rec.length) parts.push(b.rec.length+" receptů");
  if (b.mon.length) parts.push(b.mon.length+" nestvůr");
  return '<div class="tip-h">'+img(b.icon,"m")+'<div><b>'+esc(b.n)+'</b>'+
    '<div class="tiny muted">'+esc(b.kind)+'</div></div></div>'+
    '<div class="tip-d">'+esc(b.d)+'</div>'+
    (parts.length?'<div class="tip-subs"><span class="badge gold">'+parts.join(" + ")+'</span></div>':'')+
    '<div class="tip-f"><span>'+HOWBOOK.filter(h=>b.how[h[0]]).map(h=>h[1]).join(" / ").replace(/^$/,"způsob zisku neznámý")+'</span>'+
    (b.buy!=null?'<span>'+b.buy+' orenů</span>':'')+
    (b.vendors.length?'<span>'+esc(b.vendors.join(", "))+'</span>':'')+'</div>';
}
function showTip(html, x, y){
  if (!tipEl){ tipEl = document.createElement("div"); tipEl.className = "tip"; document.body.appendChild(tipEl); }
  tipEl.innerHTML = html;
  tipEl.style.left = "-9999px"; tipEl.style.top = "0";
  tipEl.style.display = "block";
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  let left = x + 16, top = y + 16;
  if (left + w > window.innerWidth - 10) left = Math.max(10, x - w - 16);
  if (top + h > window.innerHeight - 10) top = Math.max(10, y - h - 16);
  tipEl.style.left = left + "px";
  tipEl.style.top = top + "px";
}
function hideTip(){ if (tipEl) tipEl.style.display = "none"; clearTimeout(tipTimer); }
/* Karty a řádky tabulky mají všechno viditelné rovnou – tam by tooltip jen otravoval. */
const tipTarget = el => el && el.closest ? el.closest("[data-ing],[data-rec],[data-book]") : null;
const tipSkip = t => !t || t.tagName === "TR" || t.classList.contains("card");
function initTips(){
  document.addEventListener("mouseover", e=>{
    const t = tipTarget(e.target);
    clearTimeout(tipTimer);
    if (tipSkip(t)){ hideTip(); return; }
    const ing = t.dataset.ing ? byName[t.dataset.ing] : null;
    const rec = t.dataset.rec ? recByName[t.dataset.rec] : null;
    const bk  = t.dataset.book ? bookByName[t.dataset.book] : null;
    if (!ing && !rec && !bk){ hideTip(); return; }
    const x = e.clientX, y = e.clientY;
    const html = ing ? tipIngHTML(ing) : rec ? tipRecHTML(rec) : tipBookHTML(bk);
    tipTimer = setTimeout(()=>showTip(html, x, y), 130);
  });
  document.addEventListener("mouseout", e=>{
    const t = tipTarget(e.target);
    if (!t) return;
    /* přejezd mezi potomky téhož prvku tooltip nezhasíná */
    if (e.relatedTarget && t.contains(e.relatedTarget)) return;
    hideTip();
  });
  window.addEventListener("scroll", hideTip, true);
  document.addEventListener("click", hideTip);
}

/* ================= DRAWER ================= */
function openDrawer(html){
  $("#drawer-b").innerHTML = html;
  $("#drawer").classList.add("on"); $("#drawer-bg").classList.add("on");
  $$("#drawer [data-ing]").forEach(e=>e.onclick=()=>openIng(e.dataset.ing));
  $$("#drawer [data-rec]").forEach(e=>e.onclick=()=>openRec(recByName[e.dataset.rec]));
  $$("#drawer [data-book]").forEach(e=>e.onclick=()=>openBook(e.dataset.book));
  $("#drawer").scrollTop = 0;
}
window.__closeDrawer = function(){
  $("#drawer").classList.remove("on"); $("#drawer-bg").classList.remove("on");
  hideTip(); STACK = [];
};

/* ================= INGREDIENCE ================= */
let fIng = {kind:null, p:null, s:null, how:null, mine:false};
let sortIng = {k:"n", dir:1};
function renderIngFilters(){
  const b = $("#f-ingredience");
  b.innerHTML =
    ["rostlinná","živočišná","minerální"].map(k=>'<button class="chip" data-f="kind" data-v="'+k+'">'+k+'</button>').join("")+
    '<span style="width:12px"></span>'+
    Object.keys(SUBS).map(k=>'<button class="chip" data-f="p" data-v="'+k+'">'+img(SUBS[k].ic,"xs")+SUBS[k].n+'</button>').join("")+
    '<span style="width:12px"></span>'+
    Object.keys(SEC).map(k=>'<button class="chip" data-f="s" data-v="'+k+'">'+img(SEC[k].ic,"xs")+SEC[k].n+'</button>').join("")+
    '<span style="width:12px"></span>'+
    [["loot","z nestvůr"],["sběr","sběr"],["koupit","koupit"]].map(([v,t])=>'<button class="chip" data-f="how" data-v="'+v+'">'+t+'</button>').join("")+
    '<button class="chip" data-f="mine" data-v="1">jen co mám</button>';
  $$("#f-ingredience .chip").forEach(x=>x.onclick=()=>{
    const f=x.dataset.f;
    if (f==="mine") fIng.mine = !fIng.mine;
    else fIng[f] = fIng[f]===x.dataset.v ? null : x.dataset.v;
    $$("#f-ingredience .chip").forEach(y=>{
      const yf=y.dataset.f;
      y.classList.toggle("on", yf==="mine" ? fIng.mine : fIng[yf]===y.dataset.v);
    });
    drawIng();
  });
}
function drawIng(){
  const cols = [["","",""],["n","Název",""],["p","I",""],["s","II",""],["kind","Typ",""],["how","Získání",""],["buy","Nákup","num"],["sell","Prodej","num"],["inv","Zásoba",""]];
  $("#tbl-ing thead").innerHTML = "<tr>"+cols.map((c,idx)=>'<th data-k="'+c[0]+'">'+c[1]+(sortIng.k===c[0]?(sortIng.dir>0?" ▲":" ▼"):"")+'</th>').join("")+"</tr>";
  let a = ING.slice();
  if (fIng.kind) a=a.filter(i=>i.kind===fIng.kind);
  if (fIng.p) a=a.filter(i=>i.p===fIng.p);
  if (fIng.s) a=a.filter(i=>i.s===fIng.s);
  if (fIng.how) a=a.filter(i=>i.how===fIng.how);
  if (fIng.mine) a=a.filter(i=>invOf(i.n)>0);
  const k=sortIng.k, dir=sortIng.dir;
  a.sort((x,y)=>{
    let vx,vy;
    if(k==="inv"){vx=invOf(x.n);vy=invOf(y.n);}
    else if(k==="buy"||k==="sell"){vx=x[k]==null?-1:x[k];vy=y[k]==null?-1:y[k];}
    else {vx=norm(x[k]||"zzz");vy=norm(y[k]||"zzz");}
    return (vx<vy?-1:vx>vy?1:0)*dir || x.n.localeCompare(y.n,"cs");
  });
  const HOW={loot:"nestvůry",'sběr':"sběr",koupit:"koupit",nelze:"nelze získat"};
  $("#tbl-ing tbody").innerHTML = a.map(i=>
    '<tr data-ing="'+esc(i.n)+'" class="'+(invOf(i.n)?"has":"")+'" data-search="'+esc(norm(i.n+" "+i.d+" "+(i.mon||[]).join(" ")))+'">'+
    '<td style="width:38px">'+img(i.icon,"m")+'</td>'+
    '<td><b>'+esc(i.n)+'</b><div class="tiny muted">'+esc(i.d.length>70?i.d.slice(0,68)+"…":i.d)+'</div></td>'+
    '<td>'+subChip(i.p)+'</td><td>'+subChip(i.s)+'</td>'+
    '<td class="small muted">'+esc(i.kind)+'</td>'+
    '<td class="small">'+esc(HOW[i.how])+'</td>'+
    '<td class="num">'+(i.buy==null?"—":i.buy)+'</td><td class="num">'+(i.sell==null?"—":i.sell)+'</td>'+
    '<td data-ctr="'+esc(i.n)+'"></td></tr>').join("") || '<tr><td colspan="9" class="empty">Nic neodpovídá filtru.</td></tr>';
  $$("#tbl-ing [data-ctr]").forEach(td=>{
    const tr = td.parentNode;
    td.appendChild(counterEl(td.dataset.ctr, ()=>{
      tr.classList.toggle("has", invOf(td.dataset.ctr)>0);
      updInvSum(); drawPlan();
    }));
  });
  $$("#tbl-ing tbody tr[data-ing]").forEach(tr=>tr.onclick=e=>{ if(!e.target.closest(".ctr")) openIng(tr.dataset.ing); });
  $$("#tbl-ing thead th").forEach(th=>th.onclick=()=>{
    const k2=th.dataset.k; if(!k2) return;
    if (sortIng.k===k2) sortIng.dir*=-1; else {sortIng.k=k2; sortIng.dir=1;}
    drawIng();
  });
  updInvSum(); applySearch();
}
function updInvSum(){
  const n = Object.keys(INV).length, t = Object.keys(INV).reduce((s,k)=>s+INV[k],0);
  $("#inv-sum").textContent = n ? ("Zapsáno "+t+" kusů ve "+n+" druzích.") : "Zatím nic zapsáno.";
}

/* ================= BESTIÁŘ ================= */
function renderBestiary(){
  $("#beasts").innerHTML = Object.keys(D.beasts).map(m=>{
    const bl = booksNeeded(D.beasts[m], []).books.map(x=>x.b);
    return '<div class="beast" data-search="'+esc(norm(m+" "+D.beasts[m].join(" ")))+'"><h4>'+esc(m)+'</h4>'+
    '<div style="display:flex;flex-wrap:wrap;gap:6px">'+D.beasts[m].map(n=>{
      const i=byName[n];
      return '<span class="pill" data-ing="'+esc(n)+'">'+img(i.icon,"s")+esc(n)+subChip(i.p,false)+'</span>';
    }).join("")+'</div>'+
    (bl.length?'<div class="tiny muted" style="margin-top:7px">Musíš znát: '+
      bl.map(b=>'<b data-book="'+esc(b.n)+'" style="cursor:pointer">'+esc(b.n)+'</b>').join(", ")+'</div>':'')+
    '</div>';
  }).join("");
  const grp = (sel, arr) => {
    $(sel).innerHTML = arr.map(i=>
      '<div class="beast" data-search="'+esc(norm(i.n+" "+i.d))+'"><h4 style="display:flex;align-items:center;gap:8px">'+img(i.icon,"m")+esc(i.n)+'</h4>'+
      '<div class="small muted" style="margin-bottom:7px">'+esc(i.d)+'</div>'+
      '<div style="display:flex;gap:6px;align-items:center">'+subChip(i.p)+(i.s?subChip(i.s):"")+
      '<span class="pill" data-ing="'+esc(i.n)+'" style="margin-left:auto">detail</span></div></div>').join("");
  };
  grp("#plants", ING.filter(i=>i.kind==="rostlinná"));
  grp("#minerals", ING.filter(i=>i.kind==="minerální"));
  $$("#v-bestiar [data-ing]").forEach(e=>e.onclick=()=>openIng(e.dataset.ing));
  $$("#v-bestiar [data-book]").forEach(e=>e.onclick=()=>openBook(e.dataset.book));
}

/* ================= KNIHY ================= */
const BOOKS = D.books || [];
const bookByName = {}; BOOKS.forEach(b=>bookByName[b.n]=b);
const bookByIng = {}, bookByRec = {}, bookByMon = {};
BOOKS.forEach(b=>{
  b.ing.forEach(i=>(bookByIng[i]=bookByIng[i]||[]).push(b));
  b.rec.forEach(r=>(bookByRec[r]=bookByRec[r]||[]).push(b));
  b.mon.forEach(m=>(bookByMon[m]=bookByMon[m]||[]).push(b));
});
const HOWBOOK = [["buy","koupit"],["find","najít"],["reward","odměna"]];
function howBadges(b){
  const on = HOWBOOK.filter(h=>b.how[h[0]]);
  if (!on.length) return '<span class="badge">způsob zisku neznámý</span>';
  return on.map(h=>'<span class="badge '+(h[0]==="buy"?"gold":h[0]==="reward"?"green":"")+'">'+h[1]+'</span>').join(" ");
}
function bookLink(b){ return '<span class="pill" data-book="'+esc(b.n)+'">'+img(b.icon,"s")+esc(b.n)+'</span>'; }

/* nejmenší rozumná sada knih, která pokryje daný seznam přísad a receptů */
function booksNeeded(ings, recs){
  const need = new Set();
  (ings||[]).forEach(n=>{ const i=byName[n]; if (i && (i.how==="loot"||i.how==="sběr")) need.add("i:"+n); });
  (recs||[]).forEach(n=>need.add("r:"+n));
  const out = [], unknown = [];
  let pool = BOOKS.slice();
  while (need.size){
    let best = null, bestHit = [];
    pool.forEach(b=>{
      const hit = b.ing.filter(x=>need.has("i:"+x)).map(x=>"i:"+x)
        .concat(b.rec.filter(x=>need.has("r:"+x)).map(x=>"r:"+x));
      if (hit.length > bestHit.length) { best = b; bestHit = hit; }
    });
    if (!best || !bestHit.length) break;
    bestHit.forEach(k=>need.delete(k));
    out.push({b:best, covers:bestHit.length});
    pool = pool.filter(b=>b!==best);
  }
  need.forEach(k=>unknown.push(k.slice(2)));
  return {books:out, unknown};
}
function booksNeededHTML(ings, recs, title){
  const r = booksNeeded(ings, recs);
  if (!r.books.length && !r.unknown.length) return "";
  let h = '<h3 style="margin-top:18px">'+esc(title||"Knihy, které k tomu potřebuješ")+'</h3>';
  h += '<div style="display:flex;flex-wrap:wrap;gap:6px">'+
    r.books.map(x=>'<span class="pill" data-book="'+esc(x.b.n)+'">'+img(x.b.icon,"s")+esc(x.b.n)+
      ' <span class="tiny muted">'+x.covers+'&times;</span></span>').join("")+'</div>';
  if (r.unknown.length) h += '<div class="tiny muted" style="margin-top:6px">Ke zbytku ('+
    r.unknown.map(esc).join(", ")+') česká wiki knihu neuvádí &ndash; buď ji odemyká něco jiného, nebo v jejích datech chybí.</div>';
  return h;
}

let fBook = {kind:null, how:null};
function renderBooks(){
  const kinds = [];
  BOOKS.forEach(b=>{ if (kinds.indexOf(b.kind)<0) kinds.push(b.kind); });
  $("#f-knihy").innerHTML =
    '<span class="tiny muted" style="letter-spacing:.1em;text-transform:uppercase">Druh</span>'+
    kinds.map(k=>'<button class="chip" data-f="kind" data-v="'+esc(k)+'">'+esc(k)+'</button>').join("")+
    '<span style="width:12px"></span>'+
    '<span class="tiny muted" style="letter-spacing:.1em;text-transform:uppercase">Jak sehnat</span>'+
    HOWBOOK.map(h=>'<button class="chip" data-f="how" data-v="'+h[0]+'">'+h[1]+'</button>').join("");
  $$("#f-knihy .chip").forEach(x=>x.onclick=()=>{
    const f=x.dataset.f;
    fBook[f] = fBook[f]===x.dataset.v ? null : x.dataset.v;
    $$("#f-knihy .chip").forEach(y=>y.classList.toggle("on", fBook[y.dataset.f]===y.dataset.v));
    drawBooks();
  });
  drawBooks();
}
function drawBooks(){
  let a = BOOKS.slice();
  if (fBook.kind) a = a.filter(b=>b.kind===fBook.kind);
  if (fBook.how)  a = a.filter(b=>b.how[fBook.how]);
  a.sort((x,y)=>x.kind.localeCompare(y.kind,"cs") || x.n.localeCompare(y.n,"cs"));
  $("#list-knihy").innerHTML = a.map(b=>{
    const unlocks = [];
    if (b.ing.length) unlocks.push(b.ing.length+" přísad");
    if (b.rec.length) unlocks.push(b.rec.length+" receptů");
    if (b.mon.length) unlocks.push(b.mon.length+" nestvůr");
    return '<div class="card" data-book="'+esc(b.n)+'" data-search="'+esc(norm(b.n+" "+b.d+" "+b.kind+" "+b.ing.join(" ")+" "+b.rec.join(" ")+" "+b.mon.join(" ")))+'">'+
      '<div class="hd">'+img(b.icon,"f")+'<div style="flex:1"><div class="nm">'+esc(b.n)+'</div>'+
        '<div class="tiny muted">'+esc(b.kind)+(b.buy!=null?' &middot; '+b.buy+' orenů':'')+'</div></div></div>'+
      '<div class="fx">'+esc(b.d.length>120?b.d.slice(0,118)+"…":b.d)+'</div>'+
      '<div class="row">'+howBadges(b)+(unlocks.length?'<span class="badge gold">'+unlocks.join(" + ")+'</span>':'')+'</div>'+
    '</div>';
  }).join("") || '<div class="empty">Nic neodpovídá filtru.</div>';
  $$("#list-knihy .card").forEach(c=>c.onclick=()=>openBook(c.dataset.book));
  applySearch();
}

function openBook(name, back){
  const b = bookByName[name]; if (!b) return;
  if (!back) STACK.push({t:"book", k:b.n, label:b.n});
  drawerHead(b.icon, b.n, esc(b.kind));
  let h = '<div class="small" style="margin-bottom:12px">'+esc(b.d)+'</div>';
  h += '<dl class="kv">';
  h += '<dt>Jak sehnat</dt><dd>'+howBadges(b)+
       (b.vendors.length?'<div class="small muted" style="margin-top:4px">Prodává: '+b.vendors.map(esc).join(", ")+'</div>':'')+'</dd>';
  h += '<dt>Cena</dt><dd>'+(b.buy==null?"—":"nákup "+b.buy+" &middot; prodej "+(b.sell==null?"—":b.sell))+'</dd>';
  if (b.rej) h += '<dt>Zápis</dt><dd class="small">'+esc(b.rej)+'</dd>';
  h += '</dl>';

  if (b.mon.length) h += '<hr class="orn"><h3>Doplní do bestiáře</h3><div style="display:flex;flex-wrap:wrap;gap:6px">'+
    b.mon.map(m=>'<span class="badge">'+esc(m)+'</span>').join("")+'</div>';

  if (b.ing.length){
    h += '<hr class="orn"><h3>Odemkne sběr těchto přísad</h3><div style="display:flex;flex-wrap:wrap;gap:6px">'+
      b.ing.map(n=>{ const i=byName[n]; return '<span class="pill" data-ing="'+esc(n)+'">'+img(i.icon,"s")+esc(n)+subChip(i.p,false)+'</span>'; }).join("")+'</div>';
    /* co z toho dokážeš namíchat */
    const subs = {}; b.ing.forEach(n=>subs[byName[n].p]=1);
    const doable = RECIPES.filter(r=>r.f.every(s=>subs[s]));
    if (doable.length) h += '<div class="small muted" style="margin-top:8px">Samotné přísady z této knihy pokryjí celý recept na: '+
      doable.map(r=>'<b data-rec="'+esc(r.n)+'" style="cursor:pointer">'+esc(r.n)+'</b>').join(", ")+'.</div>';
  }

  if (b.rec.length) h += '<hr class="orn"><h3>Naučí recepty</h3>'+
    b.rec.map(n=>{ const r=recByName[n];
      return '<div class="ing-line"><span class="q"></span>'+img(r.icon,"s")+
        '<span class="nm" style="cursor:pointer" data-rec="'+esc(n)+'">'+esc(n)+'</span>'+
        formulaHTML(r.f)+(r.kind==="elixir"?toxPips(r.tox):'')+'</div>'; }).join("");

  openDrawer(h);
}

/* ================= KOMBINACE ================= */
const LOADOUTS = [
  /* --- podle protivníka --- */
  {c:"Podle protivníka", n:"Nekrofágové a hřbitovy", d:"Ghúlové, alghúlové, graveiři, utopenci a topivci – nejčastější práce v celé hře.",
   items:["Olej proti nekrofágům","Vlaštovka","Blizzard"],
   tip:"Suroviny na olej ti spadnou přímo z toho, co zabíjíš – Bílý ocet i Ghúlí krev nesou Vitriol. Olej je dvojnásobné zranění zadarmo, bez kapky toxicity."},
  {c:"Podle protivníka", n:"Upíři", d:"Fledeři, garkaini, alpy, bruxy.",
   items:["Olej proti upírům","Černá krev","Argentia"],
   tip:"Černá krev otráví toho, kdo se z tebe napije – proti upírům je to čistý zisk. Argentia jde jen na stříbrný meč, na oceli ho jen otupíš."},
  {c:"Podle protivníka", n:"Přeludy a duchové", d:"Barghesti, polednice, půlnočnice, přeludy – vše, co nemá pořádné tělo.",
   items:["Olej proti přeludům","Argentia","Vrba"],
   tip:"Vrba dělá z Geralta nepovalitelný sloup. Proti věcem, které tě srážejí k zemi, je to cennější než víc poškození."},
  {c:"Podle protivníka", n:"Insektoidi", d:"Kikimory, kikimoří bojovnice, skolopendromorfové.",
   items:["Olej proti insektoidům","Svlačec","Vlha"],
   tip:"Svlačec drží kyseliny, Vlha jedy. Když nevíš, co na tebe soupeř lije, vem oba – oba jsou jen střední toxicita."},
  {c:"Podle protivníka", n:"Ornitosauři", d:"Wyverny, kurolišci, bazilišci.",
   items:["Olej proti ornitosaurům","Vlha","Blizzard"],
   tip:"Tahle havěť je rychlá a jedovatá. Blizzard na reflexy tu udělá větší rozdíl než čistý přírůstek zranění."},
  {c:"Podle protivníka", n:"Lidé a bandité", d:"Oleje na lidi jsou levné a extrémně účinné – žádný z nich nefunguje na nestvůry.",
   items:["Hnědý olej","Blizzard","Samum"],
   tip:"Crinfridský olej a Jed oběšencův dělají totéž jinou cestou. Vyber podle toho, jakých substancí máš zrovna přebytek."},

  /* --- podle stylu hry --- */
  {c:"Podle protivníka", n:"Tvrdé cíle mezi lidmi", d:"Když jeden protivník vydrží víc než celá banda – žoldák ve zbroji, šermíř, fanatik.",
   items:["Jed oběšencův","Crinfridský olej","Vlk"],
   tip:"Tři lidské oleje útočí každý jinudy: Jed oběšencův otravou, Crinfridský bolestí, Hnědý olej krvácením. Na nestvůry nefunguje ani jeden – vyber podle toho, jakých substancí máš přebytek."},

  {c:"Podle stylu hry", n:"Základní bojová trojka", d:"Univerzální sestava na běžný boj – víc přežiješ, víc trefíš, rychleji se dobiješ.",
   items:["Vlk","Vlaštovka","Blizzard"],
   tip:"Vlk drží 8 hodin, tak ho vypij hned. Blizzard má jen 20 minut – ten až když už vidíš, do čeho jdeš."},
  {c:"Podle stylu hry", n:"Řezník – maximum poškození", d:"Když potřebuješ něco sundat rychle a je ti jedno, že to bude bolet.",
   items:["Vlk","Hrom","Rosomák"],
   tip:"Hrom ti zhorší úhyby a krytí o 50 % – ber ho jen když víš, že soupeře zabiješ dřív než on tebe. Nejtěžší sestava v příručce, bez albedového otvíráku ji skoro nemá smysl míchat."},
  {c:"Podle stylu hry", n:"Znamení a magie", d:"Pro styl hry přes Aard, Igni a spol.",
   items:["Mariborský les","Petriho filtr","Puštík"],
   tip:"Petriho filtr má velmi vysokou toxicitu – ať je to jediný těžký elixír v sestavě. Mariborský les a Puštík se o energii postarají společně."},
  {c:"Podle stylu hry", n:"Tank – přežít cokoli", d:"Dvojnásobné životy, jejich rychlá obnova a trest pro každého, kdo tě sekne.",
   items:["Ťuhýk","Úplněk","Vlaštovka"],
   tip:"Úplněk zdvojnásobí maximum životů, ale nedoplní je – po vypití se ještě nech uzdravit, jinak z toho máš jen prázdnou nádrž."},
  {c:"Podle stylu hry", n:"Odveta", d:"Nechat protivníka, ať se zraní sám. Funguje skvěle proti přesile, která se na tebe lepí.",
   items:["Ťuhýk","Černá krev","Vrba"],
   tip:"Obojí je pasivní zranění, které běží i když jen kryješ. Vrba k tomu zajistí, že tě ta přesila neudrží na zemi."},

  /* --- podle hrozby --- */
  {c:"Podle hrozby", n:"Proti jedu", d:"Když tě soupeř otravuje a ukazatel vitality klesá i po boji.",
   items:["Vlha","Vlaštovka"],
   tip:"Vlha nejen že dá 70% odolnost, ale rovnou neutralizuje probíhající otravu. Nemusíš ji pít dopředu – stačí meditace a náprava."},
  {c:"Podle hrozby", n:"Proti kyselině", d:"Kyselinové jedy leptají vitalitu i skrz zbroj.",
   items:["Svlačec","Vlaštovka"],
   tip:"Svlačec je jen tři ingredience, takže ho zvládneš i ve slabé kořalce. Vyplatí se mít pár kusů do zásoby."},
  {c:"Podle hrozby", n:"Proti krvácení", d:"Když po střetu odcházíš s otevřenou ranou.",
   items:["Polibek","Vlaštovka"],
   tip:"Polibek probíhající krvácení rovnou zastaví, takže funguje i jako záchrana po boji, ne jen jako příprava."},
  {c:"Podle hrozby", n:"Proti srážení k zemi", d:"Nejhorší, co tě může potkat – ležíš a nemůžeš nic.",
   items:["Vrba","Blizzard"],
   tip:"Vrba dává stoprocentní imunitu, ne procenta odolnosti. Zato má vysokou toxicitu, tak ať jde do sestavy s albedem."},
  {c:"Podle hrozby", n:"Neviditelní a skrytí", d:"Na věci, které nevidíš – ať už proto, že jsou v temnotě, nebo že se schovaly.",
   items:["Odvar de Vries","Kočka"],
   tip:"Odvar de Vries drží jen hodinu, takže ho pij až na místě. Kočka vydrží 8 hodin a hodí se úplně vždycky."},

  /* --- průzkum a servis --- */
  {c:"Průzkum a servis", n:"Průzkum a noční práce", d:"Levné, dlouhé a skoro neškodné. Tohle můžeš mít vypité prakticky pořád.",
   items:["Kočka","Puštík"],
   tip:"Kočka je jediný způsob, jak něco vidět v naprosté tmě – bez ní se v jeskyních a hrobkách jen tápe."},
  {c:"Průzkum a servis", n:"Levný rozjezd", d:"Sestava, na kterou máš suroviny prakticky hned a nemusíš nic kupovat.",
   items:["Vlaštovka","Kočka","Bílý racek"],
   tip:"Bílý racek nahradí nejdražší kořalku. Vyplatí se ho vařit do zásoby vždycky, když máš Vitriol a Rebis nazbyt."},
  {c:"Průzkum a servis", n:"Nulová toxicita", d:"Všechno, co ti pomůže, aniž bys do sebe lil jed. Ideální, když už máš ukazatel toxinů nahoře.",
   items:["Olej proti nekrofágům","Argentia","Samum"],
   tip:"Oleje ani petardy toxicitu nemají vůbec. Když se blížíš ke stovce, tohle je jediné vylepšení, které si ještě můžeš dovolit."},
  {c:"Průzkum a servis", n:"Nouzová lékárnička", d:"Pro chvíle, kdy se výprava zvrtne a ty potřebuješ vstát z podlahy.",
   items:["Lektvar Raffarda Bílého","Vlaštovka","Bílý med"],
   tip:"Raffardův lektvar má okamžitý účinek a vysokou toxicitu – nosí se jako obvaz, ne jako buff. Pít ho ale stejně musíš při meditaci, takže si k ní musíš najít chvíli."},

  {c:"Průzkum a servis", n:"Detox a náprava", d:"Nouzová brzda, když jsi to s elixíry přehnal, nebo po nepovedeném pití.",
   items:["Bílý med","Ženské slzy"],
   tip:"Bílý med smaže toxicitu i všechny účinky elixírů – tedy i ty, za které jsi zaplatil. Ber ho až když meditace nestačí."},
  {c:"Průzkum a servis", n:"Petardy na přesilu", d:"Když je jich moc a nestojí za to se s nimi mlátit poctivě.",
   items:["Samum","Zerrikánské Slunce","Král a královna"],
   tip:"Výrobu petard odemyká až stříbrný talent, tedy minimálně 15. úroveň. Geralt je vůči omráčení i oslepení z vlastních petard imunní."},
  {c:"Průzkum a servis", n:"Oheň a hnízda", d:"Na ničení hnízd a na všechno, co hoří.",
   items:["Dračí sen","Ďáblova pecka"],
   tip:"Dračí sen sám o sobě jen vypustí mrak plynu – teprve Igni z toho udělá výbuch. Ďáblova pecka je otrava plošně, Geralt je vůči ní imunní."}
];

const isLong = r => /Dlouhá/.test(r.dur||"");
/* Albedo sráží toxicitu jen tomu, co vypiješ PO něm – samo na sebe nepůsobí.
   Který z dlouhých elixírů dostane albedo, na součtu nic nemění (každý další
   dostane −1 tak jako tak); důležité je jen to, že jde první a že je dlouhý,
   aby dominanta držela po celou dobu. */
const isInstant = r => /Okamžitá/.test(r.dur||"");
/* Albedo sráží o stupeň i ten elixír, ve kterém samo je, a všechno vypité
   během následující hodiny – bez ohledu na to, jakou dominantu mají ostatní. */
function toxWithAlbedo(recs){
  return sumTox(recs.map(r=>toxDown(r.tox)));
}
function drinkPlan(recs){
  const other = recs.filter(r=>r.kind!=="elixir");
  const honey = recs.filter(r=>r.n==="Bílý med");
  const real  = recs.filter(r=>r.kind==="elixir" && r.n!=="Bílý med");
  const timed = real.filter(r=>!isInstant(r));      /* buffy, které se pijí dopředu */
  const shot  = real.filter(isInstant);             /* okamžitý účinek – až když je potřeba */
  const steps = [];
  const tox = sumTox(real.map(r=>r.tox));
  let toxAlb = null, opener = null;

  if (timed.length >= 2){
    const pool = timed.filter(isLong).length ? timed.filter(isLong) : timed;
    opener = pool.slice().sort((a,b)=>(TOXN[a.tox]||0)-(TOXN[b.tox]||0) || a.n.localeCompare(b.n,"cs"))[0];
    const rest = real.filter(r=>r!==opener);
    toxAlb = toxWithAlbedo(real);
    const restLong = rest.filter(r=>isLong(r)), restShort = rest.filter(r=>!isLong(r) && !isInstant(r));
    steps.push(recLink(opener)+' &ndash; uvař na '+img(SEC.al.ic,"xs")+'<span class="s-al"><b>albedo</b></span> a vypij ho '+
      '<b>jako první</b>. Sníží toxicitu sobě i všemu, co do sebe naliješ během následující hodiny.'+
      (pool.length>1?' <span class="muted tiny">(Který z dlouhých to bude, je jedno – důležité je jen pořadí.)</span>':''));
    if (restLong.length) steps.push('Hned po něm ty těžké a dlouhé: '+
      restLong.map(r=>recLink(r)+' '+toxPips(r.tox)).join(", ")+
      ' <span class="muted">&ndash; každý z nich může mít vlastní dominantu, klidně všechny nigredo nebo rubedo. Okno albeda je ale jen hodina, tak to vypij na jedno posezení.</span>');
    if (restShort.length) steps.push('Až těsně před bojem to krátké: '+
      restShort.map(r=>recLink(r)+' <span class="muted tiny">('+esc(r.dur)+')</span>').join(", ")+
      ' <span class="muted">&ndash; jinak vyprchá dřív, než se k něčemu dostaneš.</span>');
  } else if (timed.length === 1){
    toxAlb = toxWithAlbedo(timed);
    steps.push(recLink(timed[0])+' '+toxPips(timed[0].tox)+
      ' <span class="muted">&ndash; jediný průběžný elixír v sestavě. Na albedu si srazí vlastní toxicitu o stupeň, na nigredu nebo rubedu z něj místo toho máš bojový bonus. Vyber podle toho, jak vysoko máš ukazatel toxinů.</span>');
  }
  if (shot.length) steps.push('Nech si v zásobě na horší časy: '+
    shot.map(r=>recLink(r)+' '+toxPips(r.tox)).join(", ")+
    ' <span class="muted">&ndash; účinek je okamžitý, takže nemá smysl pít je dopředu. Až budeš zle, sedni si k meditaci a teprve pak.</span>');
  if (other.length) steps.push('<span class="muted">'+other.map(recLink).join(", ")+
    ' &ndash; nanes na meč, resp. si naplň rychlé sloty. Do těla nejdou a toxicitu nemají, takže je připrav kdykoli.</span>');
  if (honey.length) steps.push('<span class="muted">'+recLink(honey[0])+
    ' nech až do nouze &ndash; smaže toxicitu, ale i všechny účinky, které sis natahal.</span>');
  return {steps, tox, toxAlb, opener};
}
const recLink = r => '<b data-rec="'+esc(r.n)+'">'+esc(r.n)+'</b>';

/* Dominantu si nese každý elixír zvlášť, takže je můžeš mít všechny.
   Otvírák vaříme na albedo kvůli toxicitě, zbytku dáš, co se ti k sestavě hodí. */
const LO_DOM = {};
const loDom = l => LO_DOM[l.n] || l.dom2 || "ni";
function loadoutEntries(l){
  const recs = l.items.map(n=>recByName[n]).filter(Boolean);
  const op = drinkPlan(recs).opener;
  const d2 = loDom(l);
  return recs.map(r=>({r, q:1,
    pref: r.kind!=="elixir" ? "loot" : (op && r===op) ? "al" : d2}));
}

function renderLoadouts(){
  const cats = [];
  LOADOUTS.forEach(l=>{ if (cats.indexOf(l.c)<0) cats.push(l.c); });
  $("#loadouts").innerHTML = cats.map(c=>
    '<h3 class="cat-head">'+esc(c)+'</h3>'+
    '<div class="grid g2">'+LOADOUTS.filter(l=>l.c===c).map(l=>{
      const recs = l.items.map(n=>recByName[n]).filter(Boolean);
      const p = drinkPlan(recs);
      const t = p.toxAlb || p.tox;
      return '<div class="loadout" data-lo="'+esc(l.n)+'" data-search="'+esc(norm(l.n+" "+l.c+" "+l.d+" "+l.items.join(" ")))+'">'+
        '<h3>'+esc(l.n)+'</h3><div class="small muted">'+esc(l.d)+'</div>'+
        '<div class="lbl">Co uvařit</div>'+
        '<div class="items">'+recs.map(r=>'<span class="pill" data-rec="'+esc(r.n)+'">'+img(r.icon,"m")+esc(r.n)+'</span>').join("")+'</div>'+
        '<div class="lbl">Pořadí pití</div>'+
        '<ol class="order">'+p.steps.map(s=>'<li>'+s+'</li>').join("")+'</ol>'+
        '<div class="small" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">'+
          '<span class="badge '+toxClass(t)+'" title="Toxicita na stupnici 0–100. Nad 50 se projeví vedlejší účinky, na 100 Geralt umírá.">toxicita '+
            (p.toxAlb ? fmtTox(p.tox)+' &rarr; '+fmtTox(p.toxAlb)+' s albedem' : fmtTox(p.tox))+' ze 100</span>'+
          '<span class="muted tiny">'+esc(toxWord(t))+'</span>'+
        '</div>'+
        '<div class="note small">'+esc(l.tip)+'</div>'+
        '<button class="btn sm" data-lo-open="'+esc(l.n)+'">Co na to nasbírat &rarr;</button>'+
      '</div>';
    }).join("")+'</div>').join("");

  $$("#loadouts [data-rec]").forEach(e=>e.onclick=ev=>{ ev.stopPropagation(); openRec(recByName[e.dataset.rec]); });
  $$("#loadouts [data-lo-open]").forEach(e=>e.onclick=ev=>{ ev.stopPropagation(); openLoadout(e.dataset.loOpen); });
  $$("#loadouts [data-lo]").forEach(e=>e.onclick=()=>openLoadout(e.dataset.lo));
}

/* souhrn sestavy v zásuvce: co uvařit, co nasbírat, koho kvůli tomu zabít */
function openLoadout(name, back){
  const l = LOADOUTS.filter(x=>x.n===name)[0]; if (!l) return;
  if (!back) STACK.push({t:"lo", k:l.n, label:l.n});
  const recs = l.items.map(n=>recByName[n]).filter(Boolean);
  const p = drinkPlan(recs);
  const agg = aggregate(loadoutEntries(l), false);
  drawerHead(recs[0] ? recs[0].icon : "", l.n, esc(l.c)+' &middot; '+recs.length+' směsí');

  let h = '<div class="small" style="margin-bottom:12px">'+esc(l.d)+'</div>';
  const t = p.toxAlb || p.tox;
  h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">'+
    '<span class="badge '+toxClass(t)+'" title="'+esc(toxWord(t))+'">toxicita '+
      (p.toxAlb ? fmtTox(p.tox)+' &rarr; '+fmtTox(p.toxAlb)+' s albedem' : fmtTox(p.tox))+' ze 100</span>'+
    '<span class="badge">'+agg.rows.length+' druhů přísad</span>'+
    '<span class="badge '+(agg.total?"":"green")+'">'+(agg.total?("dokoupit za ~"+money(agg.total)):"máš všechno")+'</span></div>';

  h += '<h3>Pořadí pití</h3><ol class="order">'+p.steps.map(s=>'<li>'+s+'</li>').join("")+'</ol>';

  const nElix = recs.filter(r=>r.kind==="elixir" && r.n!=="Bílý med").length;
  if (nElix > 1){
    const d2 = loDom(l);
    h += '<hr class="orn"><h3>Dominanta pro zbytek</h3>'+
      '<p class="small muted" style="margin-top:-4px">Otvírák jede na albedo kvůli toxicitě. Ostatní elixíry si nesou dominantu každý sám za sebe, takže je můžeš mít všechny naráz &ndash; vyber, co se ti k téhle práci hodí.</p>'+
      '<div class="filters" style="margin-bottom:6px">'+Object.keys(SEC).map(k=>
        '<button class="chip'+(k===d2?" on":"")+'" data-dom2="'+k+'">'+img(SEC[k].ic,"xs")+esc(SEC[k].n)+'</button>').join("")+'</div>'+
      '<div class="domline s-'+d2+'">'+img(SEC[d2].ic,"s")+'<span><b>'+esc(SEC[d2].n)+'</b> &middot; '+
        esc(SEC[d2].d.replace(/\.$/,""))+' <span class="muted">('+esc(SEC[d2].dur)+')</span></span></div>'+
      (d2==="al"?'<div class="tiny muted">Druhé albedo už toxicitu dál nesrazí &ndash; efekt se sám se sebou nesčítá. Má smysl jen když nechceš platit za jiné přísady.</div>':'');
  }

  h += '<hr class="orn"><h3>Co uvařit a z čeho</h3>';
  h += agg.chosen.map(c=>
    '<div class="combo best">'+
      '<div class="ch">'+img(c.r.icon,"m")+'<span class="t" data-rec="'+esc(c.r.n)+'" style="cursor:pointer">'+esc(c.r.n)+'</span>'+
        (c.r.kind==="elixir" ? toxPips(c.r.tox)+'<span class="tiny muted">'+esc(c.r.dur)+'</span>'
                             : '<span class="badge green">bez toxicity</span>')+'</div>'+
      '<div class="small" style="margin:-2px 0 8px">'+esc(c.r.e)+'</div>'+
      domLine(c.r, c.dom)+
      c.list.map(ingLine).join("")+
      '<div class="tiny muted" style="margin-top:6px">Základ: '+esc(baseInfo(c.r).t)+'</div>'+
    '</div>').join("");

  h += '<hr class="orn"><h3>Co všechno nasbírat</h3>'+ planTable(agg.rows);
  h += basesList(agg.bases);
  h += monsList(agg.mons, "Koho kvůli tomu zabít");
  const plants = agg.rows.filter(r=>r.i.how==="sběr");
  if (plants.length) h += '<h3 style="margin-top:18px">Co nasbírat mezi bylinami</h3><div style="display:flex;flex-wrap:wrap;gap:6px">'+
    plants.map(r=>'<span class="pill" data-ing="'+esc(r.i.n)+'">'+img(r.i.icon,"s")+esc(r.i.n)+' <span class="tiny muted">'+r.need+'&times;</span></span>').join("")+'</div>';
  const shops = agg.rows.filter(r=>r.i.how==="koupit");
  if (shops.length) h += '<h3 style="margin-top:18px">Co koupit u alchymisty</h3><div style="display:flex;flex-wrap:wrap;gap:6px">'+
    shops.map(r=>'<span class="pill" data-ing="'+esc(r.i.n)+'">'+img(r.i.icon,"s")+esc(r.i.n)+' <span class="tiny muted">'+r.need+'&times;</span></span>').join("")+'</div>';

  h += booksNeededHTML(agg.rows.map(x=>x.i.n), recs.map(x=>x.n));
  h += '<div class="note small" style="margin-top:16px">'+esc(l.tip)+'</div>';
  h += '<div style="margin-top:16px"><button class="btn" id="lo-to-plan">Načíst do plánovače</button></div>';
  openDrawer(h);
  $$("#drawer [data-dom2]").forEach(e=>e.onclick=()=>{ LO_DOM[l.n] = e.dataset.dom2; openLoadout(l.n, true); });
  const b = $("#lo-to-plan");
  if (b) b.onclick = ()=>{
    PLAN = {}; l.items.forEach(n=>{ if (recByName[n]) PLAN[n] = (PLAN[n]||0)+1; });
    window.__closeDrawer(); renderPlanner(); go("planovac");
  };
}

/* ================= PLÁNOVAČ ================= */
let PLAN = {}, planPref = "loot";
const PREFS = {
  loot:  {t:"Co posbírám",       d:"Přednost mají byliny a to, co spadne z nestvůr – nejmíň se u toho utrácí."},
  cheap: {t:"Nejlevnější nákup", d:"Vybere nejlacinější přísady, které jde u alchymisty opravdu koupit."},
  al:    {t:"Albedo"}, ni:{t:"Nigredo"}, ru:{t:"Rubedo"}
};
function prefDesc(k){
  if (PREFS[k].d) return '<b>'+esc(PREFS[k].t)+'.</b> '+esc(PREFS[k].d)+' Dominanta se aktivuje jen náhodou.';
  return img(SEC[k].ic,"s")+' <b>Dominanta '+esc(SEC[k].n)+': '+esc(SEC[k].d.replace(/\.$/,""))+'.</b> '+
    'Všechny přísady elixíru ponesou '+esc(SEC[k].n.toLowerCase())+', jinak by se bonus nespustil. '+
    'U olejů a petard se sekundární substance neuplatní, tam beru to, co nejsnáz seženeš.';
}
/* dominanta vznikne jen tehdy, když ji nese úplně každá přísada */
function domOf(list){
  const s = list[0].ing.s;
  return (s && list.every(x=>x.ing.s===s)) ? s : null;
}
function planFor(r, pref){
  pref = pref || planPref;
  let list, forced = false;
  if (pref === "cheap") list = pick(r.f,{buyable:true});
  else if (pref === "loot" || r.kind !== "elixir") list = pick(r.f,{rank:gatherRank});
  else {
    list = pick(r.f,{dom:pref, rank:gatherRank});
    if (!list){ list = pick(r.f,{rank:gatherRank}); forced = true; }
  }
  return {list, dom: r.kind==="elixir" ? domOf(list) : null, forced};
}
function domLine(r, dom){
  if (r.kind !== "elixir")
    return '<div class="domline none">Olej ani petarda z dominanty nic nemá – sekundární substance se tu neuplatní.</div>';
  if (!dom)
    return '<div class="domline none">Bez dominanty – přísady nesdílejí stejnou sekundární substanci.</div>';
  return '<div class="domline s-'+dom+'">'+img(SEC[dom].ic,"s")+'<span><b>Dominanta '+esc(SEC[dom].n)+'</b> &middot; '+
    esc(SEC[dom].d.replace(/\.$/,""))+'</span></div>';
}

/* ---------- sdílené sčítání (plánovač i souhrn sestavy) ---------- */
function aggregate(entries, monsFromMissingOnly){
  const need = {}, bases = {}, warn = [], chosen = [];
  entries.forEach(e=>{
    const p = planFor(e.r, e.pref);
    if (p.forced) warn.push(e.r.n);
    p.list.forEach(x=>{ need[x.ing.n] = (need[x.ing.n]||0) + x.q*e.q; });
    bases[baseInfo(e.r).t] = (bases[baseInfo(e.r).t]||0) + e.q;
    chosen.push({r:e.r, q:e.q, list:p.list, dom:p.dom});
  });
  chosen.sort((a,b)=>a.r.kind.localeCompare(b.r.kind) || a.r.n.localeCompare(b.r.n,"cs"));
  const rows = Object.keys(need).sort((a,b)=>a.localeCompare(b,"cs")).map(n=>{
    const i = byName[n], have = invOf(n), miss = Math.max(0, need[n]-have);
    return {i, need:need[n], have, miss, cost:(i.buy==null?0:i.buy)*miss};
  });
  const mons = {};
  rows.filter(r=>r.i.how==="loot" && (!monsFromMissingOnly || r.miss>0))
      .forEach(r=>(r.i.mon||[]).forEach(m=>(mons[m]=mons[m]||[]).push(r.i.n)));
  return {chosen, rows, bases, warn, mons, total: rows.reduce((s,r)=>s+r.cost,0)};
}
function planTable(rows){
  return '<div class="tblwrap"><table><thead><tr><th></th><th>Přísada</th>'+
    '<th style="text-align:right">Potřeba</th><th style="text-align:right">Máš</th>'+
    '<th style="text-align:right">Chybí</th><th style="text-align:right">Cena</th></tr></thead><tbody>'+
    rows.map(r=>'<tr class="'+(r.miss?"":"has")+'" data-ing="'+esc(r.i.n)+'" style="cursor:pointer">'+
      '<td style="width:34px">'+img(r.i.icon,"s")+'</td>'+
      '<td>'+esc(r.i.n)+' '+subChip(r.i.p,false)+(r.i.s?subChip(r.i.s,false):"")+
        '<div class="tiny muted">'+esc(r.i.how==="loot"?("z: "+(r.i.mon||[]).slice(0,3).join(", ")):r.i.how==="sběr"?"sběr v terénu":"koupit")+'</div></td>'+
      '<td class="num">'+r.need+'</td><td class="num">'+r.have+'</td>'+
      '<td class="num" style="color:'+(r.miss?"var(--blood-lite)":"var(--ok)")+'">'+r.miss+'</td>'+
      '<td class="num">'+(r.cost?r.cost:"—")+'</td></tr>').join("")+'</tbody></table></div>';
}
function basesList(bases){
  return '<h3 style="margin-top:18px">Základy, které si obstarej</h3><ul class="clean small">'+
    Object.keys(bases).map(b=>'<li>&bull; <b>'+esc(b)+'</b> &mdash; '+bases[b]+'&times;</li>').join("")+'</ul>';
}
function monsList(mons, title){
  const keys = Object.keys(mons).sort((a,b)=>a.localeCompare(b,"cs"));
  if (!keys.length) return "";
  return '<h3 style="margin-top:18px">'+esc(title)+'</h3><div style="display:flex;flex-wrap:wrap;gap:6px">'+
    keys.map(m=>'<span class="pill" title="'+esc(mons[m].join(", "))+'">'+esc(m)+
      ' <span class="tiny muted">'+mons[m].length+'</span></span>').join("")+'</div>';
}

/* ---------- vlastní plánovač ---------- */
function renderPlanner(){
  $("#plan-pref").innerHTML =
    '<span class="tiny muted" style="letter-spacing:.1em;text-transform:uppercase">Preferuj</span>'+
    Object.keys(PREFS).map(k=>'<button class="chip'+(k===planPref?" on":"")+'" data-v="'+k+'">'+
      (SEC[k]?img(SEC[k].ic,"xs"):"")+esc(PREFS[k].t)+'</button>').join("");
  $$("#plan-pref .chip").forEach(b=>b.onclick=()=>{
    planPref = b.dataset.v;
    $$("#plan-pref .chip").forEach(x=>x.classList.toggle("on", x.dataset.v===planPref));
    $("#plan-pref-desc").innerHTML = prefDesc(planPref);
    drawPlan();
  });
  $("#plan-pref-desc").innerHTML = prefDesc(planPref);

  $("#plan-picker").innerHTML = ["elixir","olej","petarda"].map(k=>{
    const list = RECIPES.filter(r=>r.kind===k);
    return '<h4 style="margin:16px 0 6px;color:var(--gold)">'+({elixir:"Elixíry",olej:"Oleje",petarda:"Petardy"}[k])+'</h4>'+
      '<div class="tblwrap"><table><tbody>'+list.map(r=>
        '<tr><td style="width:36px">'+img(r.icon,"m")+'</td>'+
        '<td data-rec="'+esc(r.n)+'" style="cursor:pointer"><b>'+esc(r.n)+'</b>'+
          '<div class="tiny muted">'+esc(r.e.length>78 ? r.e.slice(0,76)+"…" : r.e)+'</div></td>'+
        '<td style="width:78px">'+formulaHTML(r.f)+
          (r.kind==="elixir"?'<div style="margin-top:4px">'+toxPips(r.tox)+'</div>':'')+'</td>'+
        '<td style="width:88px" data-pl="'+esc(r.n)+'"></td></tr>').join("")+'</tbody></table></div>';
  }).join("");
  $$("#plan-picker [data-pl]").forEach(td=>{
    const n=td.dataset.pl, w=document.createElement("span"); w.className="ctr";
    const s=document.createElement("span"); s.textContent=PLAN[n]|0;
    const mk=(t,d)=>{const b=document.createElement("button");b.textContent=t;b.onclick=()=>{
      PLAN[n]=Math.max(0,(PLAN[n]|0)+d); if(!PLAN[n]) delete PLAN[n]; s.textContent=PLAN[n]|0; drawPlan();};return b;};
    w.appendChild(mk("−",-1)); w.appendChild(s); w.appendChild(mk("+",1)); td.appendChild(w);
  });
  $$("#plan-picker [data-rec]").forEach(e=>e.onclick=()=>openRec(recByName[e.dataset.rec]));
  drawPlan();
}

function drawPlan(){
  const box = $("#plan-out"); if (!box) return;
  const keys = Object.keys(PLAN);
  if (!keys.length){
    box.innerHTML = '<h3>Co uvaříš</h3><div class="empty">Vyber vlevo, co chceš namíchat.<br>'+
      'Nebo si v záložce <b>Kombinace</b> načti hotovou sestavu.</div>';
    return;
  }
  const agg = aggregate(keys.map(n=>({r:recByName[n], q:PLAN[n]})), true);
  const elix = agg.chosen.filter(c=>c.r.kind==="elixir");
  const expand = f => { const out=[]; elix.forEach(c=>{ for(let i=0;i<c.q;i++) out.push(f(c)); }); return out; };
  const toxSum = sumTox(expand(c=>c.r.tox));
  const anyAlbedo = elix.some(c=>c.dom==="al");
  const toxAlb = anyAlbedo ? sumTox(expand(c=>toxDown(c.r.tox))) : null;

  let h = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">'+
    '<span class="badge gold">'+keys.reduce((s,k)=>s+PLAN[k],0)+' směsí</span>'+
    '<span class="badge">'+agg.rows.length+' druhů přísad</span>'+
    (toxSum[1]?'<span class="badge '+toxClass(toxAlb||toxSum)+'" title="'+esc(toxWord(toxAlb||toxSum))+'">toxicita '+
      (toxAlb?fmtTox(toxSum)+' &rarr; '+fmtTox(toxAlb):fmtTox(toxSum))+' ze 100</span>':'')+
    '<span class="badge '+(agg.total?"":"green")+'">'+(agg.total?("dokoupit za ~"+money(agg.total)):"máš všechno")+'</span></div>';

  if (agg.warn.length) h += '<div class="note warn small">Zvolenou dominantu se u těchto receptů nepodařilo složit, vzal jsem nejdostupnější přísady: <b>'+agg.warn.map(esc).join(", ")+'</b>.</div>';
  if (toxAlb) h += '<div class="note small">V plánu máš elixír s dominantou <b>albedo</b>. Vypij ho jako první a o stupeň klesne toxicita jemu i všemu, co do sebe naliješ po něm &ndash; odtud '+fmtTox(toxAlb)+' místo '+fmtTox(toxSum)+'. Okno je ale jen hodina, takže to stihni na jedno posezení.</div>';
  if ((toxAlb||toxSum)[1] > 50) h += '<div class="note warn small">Přes 50 bodů toxicity se objeví vedlejší účinky. Nemusíš ale škrtat: vypij první dávku, <b>hodinu medituj</b> (toxicita se vynuluje) a teprve pak dopij zbytek &ndash; osmihodinové elixíry ti meditaci přežijí.</div>';

  h += '<h3>Co uvaříš</h3>';
  h += agg.chosen.map(c=>
    '<div class="combo best">'+
      '<div class="ch">'+img(c.r.icon,"m")+
        '<span class="t" data-rec="'+esc(c.r.n)+'" style="cursor:pointer">'+esc(c.r.n)+(c.q>1?' &times;'+c.q:'')+'</span>'+
        (c.r.kind==="elixir" ? toxPips(c.r.tox)+'<span class="tiny muted">'+esc(c.r.dur)+'</span>'
                             : '<span class="badge green">bez toxicity</span>')+'</div>'+
      '<div class="small" style="margin:-2px 0 8px">'+esc(c.r.e)+'</div>'+
      domLine(c.r, c.dom)+
      c.list.map(ingLine).join("")+
      '<div class="tiny muted" style="margin-top:6px">Základ: '+esc(baseInfo(c.r).t)+'</div>'+
    '</div>').join("");

  h += '<h3 style="margin-top:18px">Nákupní a sběrný list</h3>'+ planTable(agg.rows);
  h += basesList(agg.bases);
  h += monsList(agg.mons, "Koho kvůli tomu zabít");
  h += booksNeededHTML(agg.rows.map(x=>x.i.n), agg.chosen.map(c=>c.r.n));
  h += '<div style="margin-top:16px"><button class="btn sm" id="plan-reset">Vyprázdnit plán</button></div>';
  box.innerHTML = h;
  $$("#plan-out [data-ing]").forEach(e=>e.onclick=()=>openIng(e.dataset.ing));
  $$("#plan-out [data-rec]").forEach(e=>e.onclick=()=>openRec(recByName[e.dataset.rec]));
  $$("#plan-out [data-book]").forEach(e=>e.onclick=()=>openBook(e.dataset.book));
  const rb = $("#plan-reset"); if (rb) rb.onclick=()=>{ PLAN={}; renderPlanner(); };
}

/* ================= HLEDÁNÍ ================= */
function countMatches(viewId, q){
  const sec = $("#v-"+viewId); if (!sec) return 0;
  return $$("[data-search]", sec).filter(n=>n.dataset.search.indexOf(q)>=0).length;
}
function applySearch(){
  const q = norm($("#q").value.trim());
  const sec = $("#v-"+CUR);
  if (!q) VIEWS.forEach(v=>{ const s=$("#v-"+v.id); if(s) $$("[data-search]", s).forEach(n=>n.style.display=""); });
  else if (sec) $$("[data-search]", sec).forEach(n=>{
    n.style.display = n.dataset.search.indexOf(q)>=0 ? "" : "none";
  });

  /* Hledá se v aktivní záložce; jinde jen ukážeme, kolik toho tam čeká. */
  const hint = $("#q-hint");
  if (!q){ hint.className = "qhint"; hint.innerHTML = ""; return; }
  const here = sec ? countMatches(CUR, q) : 0;
  const other = VIEWS.filter(v=>v.id!==CUR).map(v=>({v, n:countMatches(v.id, q)})).filter(x=>x.n>0);
  if (!other.length && here) { hint.className = "qhint"; hint.innerHTML = ""; return; }
  hint.className = "qhint on";
  hint.innerHTML = '<span>'+(here ? here+"× zde" : "Tady nic &ndash; zkus jinde")+'</span>'+
    other.map(x=>'<button class="chip" data-go="'+x.v.id+'">'+esc(x.v.t)+' <b>'+x.n+'</b></button>').join("");
  $$("#q-hint [data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
}

/* ================= START ================= */
function init(){
  injectIconCSS();
  buildTabs();
  renderBasics();
  renderElixFilters(); drawElix();
  renderOilFilters(); renderList("oleje", D.oils.map(o=>Object.assign({},o,{kind:"olej"})));
  renderList("petardy", D.bombs.map(o=>Object.assign({},o,{kind:"petarda"})));
  renderIngFilters(); drawIng();
  renderBestiary();
  renderBooks();
  renderLoadouts();
  renderPlanner();

  initTips();
  initWiki();
  setHeaderVar();
  window.addEventListener("resize", setHeaderVar);
  $("#q").addEventListener("input", applySearch);
  $("#drawer-bg").onclick = window.__closeDrawer;
  document.addEventListener("keydown", e=>{
    if (e.key==="Escape") window.__closeDrawer();
    if ((e.key==="Backspace" || (e.altKey && e.key==="ArrowLeft")) && STACK.length>1
        && document.activeElement!==$("#q")){ e.preventDefault(); drawerBack(); }
    if (e.key==="/" && document.activeElement!==$("#q")){ e.preventDefault(); $("#q").focus(); }
  });
  $("#inv-clear").onclick = ()=>{ if(confirm("Opravdu vynulovat zapsanou zásobu?")){ INV={}; saveInv(); drawIng(); drawPlan(); } };

  const h = (location.hash||"").replace("#","");
  go(VIEWS.some(v=>v.id===h) ? h : "zaklady");
}
document.addEventListener("DOMContentLoaded", init);
})();
