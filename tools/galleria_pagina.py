# La pagina delle schermate, dai dati di tools/galleria.py: python3 tools/galleria_pagina.py <cartella della galleria>
import html, json, os, sys

OUT = sys.argv[1]
dati = json.load(open(os.path.join(OUT, "dati.json")))
e = html.escape
GIORNO = {1: "Il primo giorno", 2: "Il secondo giorno", 3: "Il terzo giorno"}

def figura(s, i):
    notte = '<span class="tag tag-notte">Notte</span>' if s["notte"] else ""
    return f'''<figure class="scena" data-i="{i}">
  <button class="apri" type="button" aria-label="Apri: {e(s["stanza"])}, {e(s["chi"])}">
    <img src="s/{s["f"]}" data-gioco="s/{s["f"]}" data-originale="o/{s["f"]}" width="1600" height="900" loading="lazy" decoding="async" alt="{e(s["stanza"])}: {e(s["chi"])}">
  </button>
  <figcaption><span class="chi">{e(s["chi"])}</span>{notte}<span class="file">{e(s["src"])}</span></figcaption>
</figure>'''

def primo(p, i):
    return f'''<figure class="primo" data-p="{i}">
  <button class="apri" type="button" aria-label="Apri: {e(p["chi"])}">
    <img src="p/{p["f"]}" data-gioco="p/{p["f"]}" data-originale="q/{p["f"]}" width="960" height="540" loading="lazy" decoding="async" alt="{e(p["chi"])}">
  </button>
  <figcaption>{e(p["chi"])}</figcaption>
</figure>'''

sezioni, indice = [], []
for c in dati["case"]:
    scene = [(i, s) for i, s in enumerate(dati["scene"]) if s["casa"] == c["id"]]
    primi = [(i, p) for i, p in enumerate(dati["primi"]) if p["casa"] == c["id"]]
    giorni = sorted({s["giorno"] for _, s in scene})
    indice.append(f'<a class="chip" href="#{c["id"]}"><b>{c["n"]}</b><span>{e(c["famiglia"])}</span></a>')
    corpo = []
    for g in giorni:
        stanze = []
        for _, s in scene:
            if s["giorno"] == g and s["stanza"] not in stanze:
                stanze.append(s["stanza"])
        blocchi = []
        for st in stanze:
            qui = [(i, s) for i, s in scene if s["giorno"] == g and s["stanza"] == st]
            nota = f'<span class="conta">{len(qui)} versioni</span>' if len(qui) > 1 else ""
            blocchi.append(f'''<div class="stanza">
  <h4>{e(st)}{nota}</h4>
  <div class="scene{' una' if len(qui) == 1 else ''}">
{chr(10).join(figura(s, i) for i, s in qui)}
  </div>
</div>''')
        pp = [(i, p) for i, p in primi if p["giorno"] == g]
        if pp:
            blocchi.append(f'''<details class="primi">
  <summary><span class="tag tag-esame">Esame</span> I primi piani <span class="conta">{len(pp)}</span></summary>
  <div class="griglia-primi">
{chr(10).join(primo(p, i) for i, p in pp)}
  </div>
</details>''')
        corpo.append(f'''<section class="giorno" aria-label="{e(GIORNO[g])}">
  <h3><span class="g">Giorno {g}</span></h3>
  {chr(10).join(blocchi)}
</section>''')
    nscene = len(scene)
    sezioni.append(f'''<article class="casa" id="{c["id"]}">
  <header class="testa-casa">
    <p class="numero" aria-hidden="true">{c["n"]}</p>
    <div>
      <h2>Casa {c["n"]} <span>· {e(c["famiglia"])}</span></h2>
      <p class="via">{e(c["via"])} · filtro {e(c["tono"])} · {nscene} {"scena" if nscene == 1 else "scene"}</p>
    </div>
  </header>
  {chr(10).join(corpo)}
</article>''')

voci = [dict(i=i, f=s["f"], t=f'Casa {next(c["n"] for c in dati["case"] if c["id"] == s["casa"])} · Giorno {s["giorno"]} · {s["stanza"]}',
             chi=s["chi"], notte=s["notte"], src=s["src"]) for i, s in enumerate(dati["scene"])]
vprimi = [dict(i=i, f=p["f"], t=f'Casa {next(c["n"] for c in dati["case"] if c["id"] == p["casa"])} · Giorno {p["giorno"]} · Primo piano',
               chi=p["chi"], src=p["src"]) for i, p in enumerate(dati["primi"])]

pagina = f'''<title>Le case di Malvento</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=IBM+Plex+Mono:wght@400&family=Silkscreen:wght@400;700&family=VT323&display=swap">
<style>
  /* Layout: una colonna di case, una dopo l'altra; in ogni casa i giorni, in ogni giorno le stanze con le loro
     versioni affiancate a due a due. Gli stessi colori e caratteri del gioco (un solo tema scuro, da stanza buia):
     il pixel per i comandi, il VT323 per i numeri delle case. Clic su una schermata: la si sfoglia a tutto schermo. */
  :root {{
    --notte: #0b0d0c;
    --fondo: #121513;
    --linea: rgba(236, 232, 220, 0.16);
    --testo: #ece8dc;
    --spento: #a7a294;
    --giallo: #f2d16b;
    --verde: #a6d97c;
    --rec: #e0402f;
    --vcr: "VT323", "IBM Plex Mono", ui-monospace, monospace;
    --gioco: "Silkscreen", "VT323", ui-monospace, monospace;
    --corpo: "Archivo", "Helvetica Neue", Arial, sans-serif;
    --mono: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
    color-scheme: dark;
  }}
  html {{ background: var(--notte); }}
  body {{
    background: var(--notte);
    color: var(--testo);
    font-family: var(--corpo);
    font-size: 15px;
    line-height: 1.5;
    padding-left: max(16px, env(safe-area-inset-left, 0px));
    padding-right: max(16px, env(safe-area-inset-right, 0px));
    padding-block: 0 64px;
  }}
  body::before {{ content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--notte); }}
  .pagina {{ max-width: 1360px; margin: 0 auto; }}
  button {{ font: inherit; color: inherit; }}
  :focus-visible {{ outline: 2px solid var(--giallo); outline-offset: 2px; }}

  .intro {{ padding-block: 40px 20px; display: grid; gap: 10px; }}
  .occhiello {{ margin: 0; font-family: var(--gioco); font-size: 11px; letter-spacing: 0.14em; color: var(--rec); display: flex; align-items: center; gap: 8px; }}
  .occhiello::before {{ content: ""; width: 9px; height: 9px; border-radius: 50%; background: var(--rec); }}
  h1 {{ margin: 0; font-family: var(--vcr); font-weight: 400; font-size: clamp(2.6rem, 7vw, 4.6rem); line-height: 0.95; color: var(--giallo); text-wrap: balance; }}
  .intro p.sotto {{ margin: 0; max-width: 64ch; color: var(--spento); }}
  .numeri {{ margin: 6px 0 0; display: flex; flex-wrap: wrap; gap: 6px 22px; font-family: var(--gioco); font-size: 11px; letter-spacing: 0.06em; color: var(--testo); font-variant-numeric: tabular-nums; }}
  .numeri b {{ color: var(--giallo); font-weight: 400; }}

  .barra {{
    position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5;
    display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px;
    padding-block: 10px; background: var(--notte); border-bottom: 1px solid var(--linea);
  }}
  .case {{ display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; }}
  @media (max-width: 760px) {{
    .barra {{ flex-wrap: nowrap; flex-direction: column; align-items: stretch; }}
    .case {{ flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }}
    .case::-webkit-scrollbar {{ display: none; }}
    .chip {{ flex: none; }}
    .pagina .casa {{ scroll-margin-top: 104px; }}
  }}
  .chip {{ display: inline-flex; align-items: baseline; gap: 6px; padding: 5px 9px 4px; border: 1px solid var(--linea); color: var(--testo); text-decoration: none; font-family: var(--gioco); font-size: 11px; letter-spacing: 0.04em; }}
  .chip b {{ font-weight: 400; color: var(--giallo); }}
  .chip:hover {{ border-color: var(--giallo); }}
  .comandi {{ display: flex; flex-wrap: wrap; gap: 6px; }}
  .tasto {{ cursor: pointer; padding: 6px 10px 5px; border: 1px solid var(--linea); background: var(--fondo); font-family: var(--gioco); font-size: 11px; letter-spacing: 0.04em; }}
  .tasto:hover {{ border-color: var(--giallo); color: var(--giallo); }}
  .tasto[aria-pressed="true"] {{ background: var(--giallo); border-color: var(--giallo); color: var(--notte); }}
  .scelta {{ display: inline-flex; }}
  .scelta .tasto + .tasto {{ border-left: 0; }}

  .casa {{ scroll-margin-top: 72px; padding-top: 44px; }}
  .testa-casa {{ display: flex; align-items: center; gap: 16px; padding-bottom: 6px; }}
  .numero {{ margin: 0; font-family: var(--vcr); font-size: 5.2rem; line-height: 0.8; color: var(--giallo); min-width: 1.2ch; text-align: right; font-variant-numeric: tabular-nums; }}
  h2 {{ margin: 0; font-family: var(--vcr); font-weight: 400; font-size: 2.1rem; line-height: 1; letter-spacing: 0.01em; }}
  h2 span {{ color: var(--spento); }}
  .via {{ margin: 4px 0 0; font-family: var(--gioco); font-size: 10px; letter-spacing: 0.08em; color: var(--spento); }}

  .giorno {{ margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--linea); display: grid; gap: 18px; }}
  h3 {{ margin: 0; }}
  h3 .g {{ font-family: var(--gioco); font-size: 12px; font-weight: 700; letter-spacing: 0.12em; color: var(--giallo); }}
  .stanza {{ display: grid; gap: 8px; min-width: 0; }}
  h4 {{ margin: 0; font-size: 1rem; font-weight: 600; display: flex; align-items: baseline; gap: 10px; }}
  .conta {{ font-family: var(--gioco); font-size: 10px; font-weight: 400; letter-spacing: 0.06em; color: var(--spento); }}
  .scene {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 12px; }}
  .scene.una {{ grid-template-columns: minmax(0, 1fr); max-width: calc(50% - 6px); }}
  @media (max-width: 760px) {{ .scene, .scene.una {{ grid-template-columns: minmax(0, 1fr); max-width: none; }} }}
  figure {{ margin: 0; min-width: 0; display: grid; gap: 6px; }}
  .apri {{ display: block; padding: 0; border: 0; background: #000; cursor: zoom-in; width: 100%; }}
  .apri img {{ display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: cover; }}
  .apri:hover img {{ filter: brightness(1.12); }}
  figcaption {{ display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; font-size: 0.875rem; color: var(--testo); }}
  .file {{ flex-basis: 100%; font-family: var(--mono); font-size: 11px; color: var(--spento); overflow-wrap: anywhere; }}
  .tag {{ font-family: var(--gioco); font-size: 9px; letter-spacing: 0.08em; padding: 2px 5px 1px; border: 1px solid currentColor; }}
  .tag-notte {{ color: var(--verde); }}
  .tag-esame {{ color: var(--rec); }}

  details.primi {{ border: 1px solid var(--linea); background: var(--fondo); }}
  details.primi summary {{ cursor: pointer; padding: 10px 12px; display: flex; align-items: center; gap: 10px; font-weight: 600; list-style: none; }}
  details.primi summary::-webkit-details-marker {{ display: none; }}
  details.primi summary::after {{ content: "+"; margin-left: auto; font-family: var(--gioco); color: var(--giallo); }}
  details.primi[open] summary::after {{ content: "−"; }}
  .griglia-primi {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr)); gap: 12px 10px; padding: 2px 12px 14px; }}
  .primo figcaption {{ font-size: 0.8125rem; color: var(--spento); }}

  .piede {{ margin-top: 56px; padding-top: 16px; border-top: 1px solid var(--linea); color: var(--spento); font-size: 0.875rem; max-width: 70ch; }}

  /* lo sfogliatore a tutto schermo */
  #vista {{ position: fixed; inset: 0; z-index: 20; background: var(--notte); display: grid; grid-template-rows: auto minmax(0, 1fr) auto;
    padding: calc(env(safe-area-inset-top, 0px) + 10px) max(16px, env(safe-area-inset-right, 0px)) calc(env(safe-area-inset-bottom, 0px) + 12px) max(16px, env(safe-area-inset-left, 0px)); gap: 10px; }}
  .v-testa {{ display: flex; align-items: center; justify-content: space-between; gap: 12px; font-family: var(--gioco); font-size: 11px; letter-spacing: 0.06em; }}
  .v-testa .dove {{ color: var(--giallo); min-width: 0; overflow-wrap: anywhere; }}
  .v-testa .quanti {{ color: var(--spento); font-variant-numeric: tabular-nums; white-space: nowrap; }}
  .v-centro {{ position: relative; min-height: 0; display: flex; align-items: center; justify-content: center; }}
  .v-centro img {{ max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; user-select: none; -webkit-user-drag: none; }}
  .v-freccia {{ position: absolute; top: 50%; transform: translateY(-50%); width: 46px; height: 64px; cursor: pointer; border: 1px solid var(--linea); background: rgba(11, 13, 12, 0.7); font-family: var(--gioco); font-size: 18px; color: var(--testo); }}
  .v-freccia:hover {{ color: var(--giallo); border-color: var(--giallo); }}
  .v-freccia.prima {{ left: 0; }}
  .v-freccia.dopo {{ right: 0; }}
  .v-piede {{ display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 6px 16px; }}
  .v-piede .chi {{ font-size: 1rem; }}
  .v-piede .file {{ flex-basis: auto; }}
  .v-comandi {{ display: flex; gap: 6px; }}
  @media (prefers-reduced-motion: no-preference) {{ .v-centro img {{ animation: entra 160ms ease-out; }} }}
  @keyframes entra {{ from {{ opacity: 0.4; }} to {{ opacity: 1; }} }}
</style>

<div class="pagina">
  <header class="intro">
    <p class="occhiello">REC · Malvento</p>
    <h1>Le case di Malvento</h1>
    <p class="sotto">Tutte le schermate delle visite della demo, casa per casa e giorno per giorno, come si vedono nel gioco: il filtro colore di ogni casa con la lampada della videocamera, il verde nelle stanze buie, il rosso dell'esame nei primi piani. Le stanze con più versioni ne hanno una per ogni combinazione di chi è in casa: dipende da chi hai portato al lazzaretto e da chi ha dormito da te. Clic su una schermata per sfogliarle a tutto schermo.</p>
    <p class="numeri"><span><b>{len(dati["case"])}</b> case</span><span><b>{len(dati["scene"])}</b> scene</span><span><b>{len(dati["primi"])}</b> primi piani</span><span><b>3</b> giorni</span></p>
  </header>

  <nav class="barra" aria-label="Case e comandi">
    <div class="case">{"".join(indice)}</div>
    <div class="comandi">
      <div class="scelta" role="group" aria-label="Come vederle">
        <button class="tasto" type="button" id="come-gioco" aria-pressed="true">Come nel gioco</button>
        <button class="tasto" type="button" id="come-originale" aria-pressed="false">Originale</button>
      </div>
      <button class="tasto" type="button" id="sfoglia">Sfoglia ▸</button>
    </div>
  </nav>

  {chr(10).join(sezioni)}

  <p class="piede">Le immagini vengono dai file del gioco (<span class="file">gioco/img</span> e i pacchi <span class="file">gioco/img/pacchi</span>). Il filtro è quello della videocamera senza i difetti del VHS, ricalcolato a parte: nel gioco, sopra, ci sono anche le espressioni che cambiano sulla testa, l'evidenziazione al passaggio del puntatore e lo zoom.</p>
</div>

<div id="vista" role="dialog" aria-modal="true" aria-label="Sfoglia le schermate" hidden>
  <div class="v-testa"><span class="dove" id="v-dove"></span><span class="quanti" id="v-quanti"></span></div>
  <div class="v-centro">
    <img id="v-img" alt="">
    <button class="v-freccia prima" type="button" id="v-prima" aria-label="La schermata prima">◂</button>
    <button class="v-freccia dopo" type="button" id="v-dopo" aria-label="La schermata dopo">▸</button>
  </div>
  <div class="v-piede">
    <div><span class="chi" id="v-chi"></span> <span class="file" id="v-file"></span></div>
    <div class="v-comandi">
      <button class="tasto" type="button" id="v-originale" aria-pressed="false">Originale</button>
      <button class="tasto" type="button" id="v-chiudi">Chiudi · Esc</button>
    </div>
  </div>
</div>

<script>
  const SCENE = {json.dumps(voci, ensure_ascii=False)};
  const PRIMI = {json.dumps(vprimi, ensure_ascii=False)};
  const CHIAVE = "malvento.galleria.originale";
  let originale = false;
  try {{ originale = localStorage.getItem(CHIAVE) === "1"; }} catch (e) {{}}

  const percorso = (lista, v) => lista === PRIMI ? (originale ? "q/" : "p/") + v.f : (originale ? "o/" : "s/") + v.f;
  function come(o) {{
    originale = o;
    try {{ localStorage.setItem(CHIAVE, o ? "1" : "0"); }} catch (e) {{}}
    document.getElementById("come-gioco").setAttribute("aria-pressed", String(!o));
    document.getElementById("come-originale").setAttribute("aria-pressed", String(o));
    document.getElementById("v-originale").setAttribute("aria-pressed", String(o));
    for (const img of document.querySelectorAll("img[data-gioco]")) img.src = o ? img.dataset.originale : img.dataset.gioco;
    if (!vista.hidden) mostra();
  }}

  const vista = document.getElementById("vista");
  const vImg = document.getElementById("v-img");
  let lista = SCENE, at = 0, tornaA = null;
  function mostra() {{
    const v = lista[at];
    vImg.src = percorso(lista, v);
    vImg.alt = v.t + ": " + v.chi;
    document.getElementById("v-dove").textContent = v.t + (v.notte ? " · notte" : "");
    document.getElementById("v-quanti").textContent = (at + 1) + " / " + lista.length;
    document.getElementById("v-chi").textContent = v.chi;
    document.getElementById("v-file").textContent = v.src;
    // le vicine, gia' pronte
    for (const d of [1, -1]) {{ const w = lista[(at + d + lista.length) % lista.length]; new Image().src = percorso(lista, w); }}
  }}
  function apri(l, i, da) {{
    lista = l; at = i; tornaA = da || null;
    vista.hidden = false;
    document.documentElement.style.overflow = "hidden";
    mostra();
    document.getElementById("v-dopo").focus({{ preventScroll: true }});
  }}
  function chiudi() {{
    vista.hidden = true;
    document.documentElement.style.overflow = "";
    if (tornaA) tornaA.focus({{ preventScroll: true }});
  }}
  const passa = (d) => {{ at = (at + d + lista.length) % lista.length; mostra(); }};

  document.addEventListener("click", (ev) => {{
    const b = ev.target.closest(".apri");
    if (!b) return;
    const f = b.closest("figure");
    if (f.dataset.i != null) apri(SCENE, Number(f.dataset.i), b);
    else apri(PRIMI, Number(f.dataset.p), b);
  }});
  document.getElementById("v-prima").addEventListener("click", () => passa(-1));
  document.getElementById("v-dopo").addEventListener("click", () => passa(1));
  document.getElementById("v-chiudi").addEventListener("click", chiudi);
  document.getElementById("v-originale").addEventListener("click", () => come(!originale));
  document.getElementById("come-gioco").addEventListener("click", () => come(false));
  document.getElementById("come-originale").addEventListener("click", () => come(true));
  document.getElementById("sfoglia").addEventListener("click", (ev) => apri(SCENE, 0, ev.currentTarget));
  document.addEventListener("keydown", (ev) => {{
    if (vista.hidden) return;
    if (ev.key === "ArrowRight") {{ passa(1); ev.preventDefault(); }}
    else if (ev.key === "ArrowLeft") {{ passa(-1); ev.preventDefault(); }}
    else if (ev.key === "Escape") chiudi();
    else if (ev.key === "o" || ev.key === "O") come(!originale);
  }});
  // col dito: si trascina a destra o a sinistra
  let x0 = null;
  vImg.addEventListener("pointerdown", (ev) => {{ x0 = ev.clientX; }});
  vImg.addEventListener("pointerup", (ev) => {{
    if (x0 == null) return;
    const dx = ev.clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) passa(dx < 0 ? 1 : -1);
  }});
  vista.addEventListener("click", (ev) => {{ if (ev.target === vista) chiudi(); }});
  if (originale) come(true);
</script>
'''
open(os.path.join(OUT, "index.html"), "w").write(pagina)
print("pagina", len(pagina) // 1024, "KB")
