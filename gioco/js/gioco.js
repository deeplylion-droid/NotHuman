// Il prototipo di una giornata: la scrivania col fax, la mappa, le visite (REC, zoom, sottotitoli,
// domande e prove, porte), il modulo della ditta, i nastri della sera all'infrarosso e la notte.
import { Vhs } from "./vhs.js";
import * as D from "./dati.js";

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const maiuscolo = (s) => s.toUpperCase();

const schermo = $("#schermo");
const canvas = $("#vhs");
const statico = $("#statico");
const osd = { box: $("#osd"), stato: $("#osd-stato"), modo: $("#osd-modo"), data: $("#osd-data"), ora: $("#osd-ora") };
const zoneBox = $("#zone");
const etichetta = $("#etichetta");
const cursore = $("#cursore");
const sottotitoli = $("#sottotitoli");
const menu = $("#menu");
const hud = $("#hud");
const didascalia = $("#didascalia");
const avviso = $("#avviso");
const comandi = $("#comandi");
const foglio = $("#foglio");
const foglioCorpo = $("#foglio-corpo");
const orologio = $("#orologio");

const W = 1600, H = 900;
const IMG = {};
const ID = {};
const PRIMI = {};

// ---------- stato ----------

function nuovoStato() {
  return {
    schermo: "scrivania", fase: "mattina", ora: D.INIZIO.ora, soldi: D.INIZIO.soldi, fiducia: D.INIZIO.fiducia,
    casa: null, luogo: null, prove: [], esami: {}, fatte: {}, sbloccate: {}, conosciute: {}, visti: {},
    forzate: {}, decisioni: {}, visitate: {}, nastri: [], intro: false, notte: null,
  };
}
let S = nuovoStato();
// quello che non si salva: cosa c'e' sotto il puntatore, sottotitoli in corso, primo piano, nastro in riproduzione
const R = { hover: null, hoverKey: "", occupato: false, primo: null, play: null, salta: null, turno: 0, blocco: 0,
  ctx: null, scena: null, animaSpilli: false };
let vhs = null;

// ---------- immagini ----------

const carica = (src) => new Promise((res, rej) => {
  const i = new Image();
  i.onload = () => res(i);
  i.onerror = () => rej(new Error(src));
  i.src = src;
});

async function caricaTutto() {
  const lista = { scrivania: "img/scrivania.jpg", mappa: "img/mappa.jpg" };
  for (const [luogo, L] of Object.entries(D.LUOGHI)) {
    lista[luogo] = `img/${luogo}.jpg`;
    lista[`${luogo}_persone`] = `img/${luogo}_persone.png`;
    lista[`${luogo}_calore`] = `img/${luogo}_calore.png`;
    for (const p of L.persone) lista[`${luogo}_${p}`] = `img/${luogo}_${p}.png`;
  }
  const voci = await Promise.all(Object.entries(lista).map(async ([k, src]) => [k, await carica(src)]));
  for (const [k, im] of voci) IMG[k] = im;
  // mappe dei personaggi: un grigio per persona (40, 80, 120...) da leggere sotto il puntatore
  for (const luogo of Object.keys(D.LUOGHI)) {
    const im = IMG[`${luogo}_persone`];
    const c = document.createElement("canvas");
    c.width = im.naturalWidth; c.height = im.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(im, 0, 0);
    ID[luogo] = { w: c.width, h: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data };
  }
}

function primoPiano(persona, parte) {
  const k = `${persona}_${parte}`;
  if (!PRIMI[k]) PRIMI[k] = carica(`img/pp/${k}.jpg`);
  return PRIMI[k];
}

function precaricaPrimi() {
  for (const [persona, esami] of Object.entries(D.ESAMI))
    for (const [parte, e] of Object.entries(esami)) if (!e.rifiuta) primoPiano(persona, parte).catch(() => {});
}

// ---------- schermo e videocamera ----------

function mostra(sorgente, src) {
  if (vhs) vhs.setSource(sorgente);
  statico.src = src || sorgente.src || "";
}

function disegnaScena() {
  const ctx = R.ctx;
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.drawImage(IMG[S.luogo], 0, 0, W, H);
  if (R.hover && R.hover.persona && !R.primo) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = R.hover.parte ? 0.07 : 0.14;
    ctx.drawImage(IMG[`${S.luogo}_${R.hover.persona}`], 0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }
  if (vhs && vhs.source === R.scena) vhs.refresh();
}

function osdSpento() {
  osd.box.hidden = true;
}

function osdRec() {
  osd.box.hidden = false;
  osd.box.classList.remove("play");
  osd.stato.innerHTML = "";
  osd.stato.append(el("i", "punto"), document.createTextNode("REC"));
  osd.data.textContent = D.DATA_OSD;
  osd.ora.textContent = hhmm(S.ora);
}

function osdPlay(data, ora) {
  osd.box.hidden = false;
  osd.box.classList.add("play");
  osd.stato.innerHTML = "";
  osd.stato.append(el("i", "triangolo"), document.createTextNode("PLAY"));
  osd.data.textContent = data;
  osd.ora.textContent = ora;
}

function aggiornaOrologio() {
  orologio.textContent = `LUN 26 OTT · ${hhmm(S.ora)} · ${S.soldi} €`;
  if (!osd.box.hidden && !osd.box.classList.contains("play")) osd.ora.textContent = hhmm(S.ora);
}

function avanza(min) {
  S.ora += min;
  aggiornaOrologio();
}

function notifica(testo) {
  avviso.textContent = testo;
  avviso.hidden = false;
  avviso.classList.remove("via");
  void avviso.offsetWidth;
  avviso.classList.add("via");
  clearTimeout(notifica.t);
  notifica.t = setTimeout(() => { avviso.hidden = true; }, 2600);
}

function pulisci() {
  R.turno++;
  if (R.salta) {
    const s = R.salta;
    R.salta = null;
    s();
  }
  R.occupato = false;
  R.blocco = 0;
  R.hoverKey = "";
  zoneBox.replaceChildren();
  menu.replaceChildren();
  menu.hidden = true;
  hud.replaceChildren();
  comandi.replaceChildren();
  comandi.hidden = true;
  didascalia.hidden = true;
  etichetta.hidden = true;
  sottotitoli.replaceChildren();
  R.hover = null;
  schermo.dataset.schermo = S.schermo;
}

function bottone(testo, azione, cls = "") {
  const b = el("button", cls, testo);
  b.type = "button";
  b.addEventListener("click", (e) => { e.stopPropagation(); azione(); });
  return b;
}

// ---------- sottotitoli ----------

function riga(chi, testo) {
  const p = el("p", "riga" + (chi === "TU" ? " tu" : chi ? "" : " descr"));
  if (chi && chi !== "TU") p.append(el("b", null, `${chi}: `));
  p.append(document.createTextNode(chi === "TU" ? `— ${testo}` : testo));
  return p;
}

function registra(chi, testo) {
  const n = S.nastri[S.nastri.length - 1];
  if (S.casa && n && n.riprese.length) n.riprese[n.riprese.length - 1].righe.push([chi, testo]);
}

// mostra le battute una dopo l'altra; un clic passa alla successiva. Nuove battute o un cambio di schermo
// interrompono quelle in corso. Con "blocca" intanto non si puo' fare altro (la narrazione non blocca).
async function dici(righe, salva = true, blocca = true) {
  const turno = ++R.turno;
  if (R.salta) R.salta();
  if (blocca) {
    R.occupato = true;
    R.blocco = turno;
    menu.hidden = true;
  }
  etichetta.hidden = true;
  for (const [chi, testo] of righe) {
    if (R.turno !== turno) break;
    sottotitoli.replaceChildren(riga(chi, testo));
    if (salva) registra(chi, testo);
    const ms = Math.max(1600, 800 + testo.length * 52);
    await new Promise((res) => {
      const t = setTimeout(res, ms);
      R.salta = () => { clearTimeout(t); res(); };
    });
  }
  if (R.turno === turno) {
    R.salta = null;
    sottotitoli.replaceChildren();
  }
  if (R.blocco === turno) {
    R.occupato = false;
    R.blocco = 0;
  }
  return R.turno === turno;
}

// ---------- nastri: ogni visita registra le inquadrature e le battute ----------

function nuovaRipresa(r) {
  const n = S.nastri[S.nastri.length - 1];
  if (S.casa && n) n.riprese.push({ ...r, ora: S.ora, righe: [] });
}

// ---------- effetti di domande, prove, porte ----------

function applica(poi) {
  if (!poi) return;
  if (poi.prova && !S.prove.includes(poi.prova)) {
    S.prove.push(poi.prova);
    notifica("Annotato nel taccuino");
  }
  if (poi.fiducia) S.fiducia += poi.fiducia;
  if (poi.soldi) { S.soldi += poi.soldi; aggiornaOrologio(); }
  if (poi.sblocca) S.sbloccate[poi.sblocca] = true;
  if (poi.conosci) S.conosciute[poi.conosci] = true;
  if (poi.forzata) S.forzate[S.casa] = true;
}

function condizione(se) {
  if (!se) return true;
  if (se.esame) return !!S.esami[se.esame];
  if (se.prova) return S.prove.includes(se.prova);
  return true;
}

// ---------- la scrivania ----------

function vaiScrivania() {
  S.schermo = "scrivania";
  S.casa = null;
  S.luogo = null;
  pulisci();
  osdSpento();
  if (vhs) {
    vhs.mode("giorno", false);
    vhs.setHeat(null);
    vhs.set({ zoom: 1, cx: 0.5, cy: 0.5, blur: 0, snow: 0 });
    vhs.setDark(S.fase === "sera" ? 1 : 0);
  }
  mostra(IMG.scrivania);
  for (const z of D.SCRIVANIA) zoneBox.append(zonaHtml(z, () => azioneScrivania(z.id)));
  hud.append(el("span", "suggerimento", S.fase === "sera"
    ? "Sera. Rivedi i nastri al videoregistratore, poi spegni la lampada."
    : "Leggi il fax, poi prendi la maschera ed esci."));
  aggiornaOrologio();
}

function zonaHtml(z, azione) {
  const [x0, y0, x1, y1] = z.box;
  const b = el("button", "zona");
  b.type = "button";
  b.setAttribute("aria-label", z.nome);
  Object.assign(b.style, { left: `${x0 * 100}%`, top: `${y0 * 100}%`, width: `${(x1 - x0) * 100}%`, height: `${(y1 - y0) * 100}%` });
  b.addEventListener("pointerenter", () => mostraEtichetta(z.nome));
  b.addEventListener("pointerleave", () => { etichetta.hidden = true; });
  b.addEventListener("click", (e) => { e.stopPropagation(); if (!R.occupato) azione(); });
  return b;
}

async function azioneScrivania(id) {
  if (id === "fax") return apriFax();
  if (id === "giornale") return apriGiornale(false);
  if (id === "taccuino") return apriTaccuino();
  if (id === "soldi") return apriSoldi();
  if (id === "nastri") return apriNastri();
  if (id === "mappa" || id === "maschera") {
    if (S.fase === "sera") return dici([[null, "È il coprifuoco. Fino a domattina non si esce."]], false);
    return vaiMappa();
  }
  if (id === "lampada") {
    if (S.fase === "sera") return dormi();
    return dici([[null, "La lampada. Si spegne quando è ora di dormire."]], false);
  }
}

// ---------- fogli: fax, giornale, taccuino, soldi, modulo, notte ----------

function apriFoglio(tipo, contenuto) {
  foglio.hidden = false;
  foglio.dataset.tipo = tipo;
  foglioCorpo.replaceChildren(...contenuto);
  foglioCorpo.scrollTop = 0;
  foglio.querySelector(".chiudi")?.focus();
}

function chiudiFoglio() {
  if (foglio.dataset.bloccato === "1") return;
  foglio.hidden = true;
}

function apriFax() {
  const f = D.FAX;
  const corpo = [el("p", "fax-testata", f.testata), el("p", "fax-sotto", f.sotto), el("hr")];
  for (const r of f.righe) corpo.push(el("p", null, r));
  corpo.push(el("h3", null, "SEGNI DA CERCARE"));
  const ol = el("ol");
  for (const [nome, desc] of f.segni) {
    const li = el("li");
    li.append(el("b", null, `${nome}: `), document.createTextNode(desc));
    ol.append(li);
  }
  corpo.push(ol, el("h3", null, "PROFILO RICHIESTO"), el("p", null, f.profilo), el("h3", null, "COMPENSO"),
    el("p", null, f.compenso), el("p", "fax-chiusura", f.chiusura), el("hr"), el("p", "fax-firma", f.firma));
  apriFoglio("fax", corpo);
}

function apriGiornale(domani) {
  const g = domani ? giornaleDomani() : D.GIORNALE;
  const corpo = [
    el("p", "gio-testata", g.testata), el("p", "gio-data", g.data), el("h2", "gio-titolo", g.titolo),
    el("p", "gio-sommario", g.sommario),
  ];
  const col = el("div", "gio-colonne");
  col.append(el("p", null, g.articolo));
  const lett = el("p", "gio-lettera");
  lett.append(el("b", null, "LETTERE · "), document.createTextNode(g.lettera));
  col.append(lett, el("p", "gio-breve", g.breve));
  corpo.push(col, el("p", "gio-pubblicita", g.pubblicita));
  if (domani) corpo.push(azioni([["Com'era davvero", verita]]));
  apriFoglio("giornale", corpo);
}

function apriTaccuino() {
  const corpo = [el("h2", null, "Taccuino")];
  const prot = el("p", "nota");
  prot.append(el("b", null, "Protocollo: "), document.createTextNode(
    "febbre (occhi lucidi, sudore) · bubboni (collo, ascelle) · pallore e labbra viola · dita nere."));
  corpo.push(prot);
  for (const casa of ["casa3", "casa5"]) {
    const prove = S.prove.filter((p) => D.PROVE[p].casa === casa);
    corpo.push(el("h3", null, `Casa ${D.CASE[casa].n}`));
    if (!prove.length) corpo.push(el("p", "vuoto", "Ancora niente."));
    const ul = el("ul");
    for (const p of prove) ul.append(el("li", null, D.PROVE[p].testo));
    if (prove.length) corpo.push(ul);
  }
  const esami = Object.keys(S.esami);
  if (esami.length) {
    corpo.push(el("h3", null, "Esami fatti"));
    corpo.push(el("p", null, esami.map((k) => {
      const [persona, parte] = k.split("_");
      return `${D.PERSONE[persona].nome}: ${parte}`;
    }).join(" · ")));
  }
  apriFoglio("taccuino", corpo);
}

function apriSoldi() {
  apriFoglio("soldi", [
    el("h2", null, `${S.soldi} €`),
    el("p", null, `Ogni notte: stanza ${D.SOLDI.stanza} €, cena ${D.SOLDI.cena} €, ${D.SOLDI.cassetta} € per ogni cassetta usata.`),
    el("p", null, `La ditta paga ${D.SOLDI.paziente} € a paziente consegnato, ${D.SOLDI.profilo} € in più per il profilo richiesto.`),
  ]);
}

function azioni(lista) {
  const div = el("div", "azioni");
  for (const [testo, fn, cls] of lista) div.append(bottone(testo, fn, cls || ""));
  return div;
}

// ---------- la mappa ----------

function vaiMappa() {
  S.schermo = "mappa";
  pulisci();
  osdSpento();
  if (vhs) {
    vhs.mode("giorno", false);
    vhs.setHeat(null);
    vhs.setDark(0);
    vhs.set({ zoom: 1, cx: 0.5, cy: 0.5, blur: 0, snow: 0 });
  }
  mostra(IMG.mappa);
  const spillo = (cls, testo, x, y, nome, azione) => {
    const b = el("button", cls, testo);
    b.type = "button";
    b.dataset.x = x;
    b.dataset.y = y;
    b.setAttribute("aria-label", nome);
    b.addEventListener("pointerenter", () => mostraEtichetta(maiuscolo(nome)));
    b.addEventListener("pointerleave", () => { etichetta.hidden = true; });
    b.addEventListener("click", (e) => { e.stopPropagation(); azione(); });
    zoneBox.append(b);
    return b;
  };
  for (const [id, c] of Object.entries(D.CASE)) {
    const b = spillo("pin", String(c.n), c.x, c.y, `Casa ${c.n}${c.segnalata ? " · segnalata" : ""}`, () => schedaCasa(id));
    if (c.segnalata) b.classList.add("segnalata");
    if (c.croce || S.decisioni[id]?.provvedimento === "chiudi") b.classList.add("croce");
    if (S.visitate[id]) b.classList.add("visitata");
    if (S.notte?.contagiate?.includes(id)) b.classList.add("contagiata");
  }
  for (const l of D.LUOGHI_MAPPA) spillo("pin luogo", l.segno, l.x, l.y, l.nome, () => scheda(l.nome, l.nota, []));
  posizionaSpilli();
  const visite = Object.keys(S.visitate).length;
  hud.append(el("span", "suggerimento", "Tocca la mappa per ingrandire"),
    bottone(visite ? "Torna in stanza · finisce la giornata" : "Torna alla scrivania",
      () => (visite ? sera() : vaiScrivania()), "hud-b"));
  aggiornaOrologio();
}

// gli spilli seguono l'ingrandimento della videocamera
function posizionaSpilli() {
  const v = vhs ? vhs.p : { zoom: 1, cx: 0.5, cy: 0.5 };
  for (const b of zoneBox.querySelectorAll(".pin")) {
    const sx = (Number(b.dataset.x) - v.cx) * v.zoom + 0.5;
    const sy = (Number(b.dataset.y) - v.cy) * v.zoom + 0.5;
    b.style.left = `${sx * 100}%`;
    b.style.top = `${sy * 100}%`;
    b.hidden = sx < 0.01 || sx > 0.99 || sy < 0.06 || sy > 1;
  }
}

async function zoomMappa(x, y) {
  if (!vhs) return;
  const v = vhs.p;
  const ix = v.cx + (x - 0.5) / v.zoom;
  const iy = v.cy + (y - 0.5) / v.zoom;
  const z = v.zoom > 1.05 ? 1 : 2.2;
  const meta = z === 1 ? { zoom: 1, cx: 0.5, cy: 0.5 }
    : { zoom: z, cx: clamp(ix, 0.5 / z, 1 - 0.5 / z), cy: clamp(iy, 0.5 / z, 1 - 0.5 / z) };
  const fine = vhs.tween(meta, 380);
  R.animaSpilli = true;
  const segui = () => {
    if (!R.animaSpilli || S.schermo !== "mappa") return;
    posizionaSpilli();
    requestAnimationFrame(segui);
  };
  requestAnimationFrame(segui);
  await fine;
  R.animaSpilli = false;
  if (S.schermo === "mappa") posizionaSpilli();
}

function scheda(titolo, testo, bottoni) {
  etichetta.hidden = true;
  menu.replaceChildren(el("p", "menu-titolo", titolo), el("p", "menu-testo", testo));
  for (const b of bottoni) menu.append(b);
  menu.append(bottone("Chiudi", () => { menu.hidden = true; }, "secondario"));
  menu.hidden = false;
}

function schedaCasa(id) {
  const c = D.CASE[id];
  const bott = [];
  let testo = c.segnalata || c.nota;
  if (S.visitate[id]) testo = "Visitata oggi.";
  else if (c.segnalata) {
    if (S.ora + D.MINUTI.viaggio >= D.INIZIO.coprifuoco) testo += " Non fai in tempo prima del coprifuoco.";
    else bott.push(bottone(`Vai · ${D.MINUTI.viaggio} min`, () => vai(id)));
  } else if (!c.croce) testo += " Oggi no: la ditta paga le case segnalate.";
  scheda(`Casa ${c.n}`, testo, bott);
}

async function vai(id) {
  menu.hidden = true;
  avanza(D.MINUTI.viaggio);
  await entraCasa(id);
}

// ---------- la visita ----------

async function entraCasa(id) {
  const c = D.CASE[id];
  S.casa = id;
  S.nastri.push({ casa: id, titolo: `NASTRO ${S.nastri.length + 1} · CASA ${c.n}`, inizio: S.ora, fine: null, riprese: [] });
  await vaiLuogo(c.luogo);
}

async function vaiLuogo(luogo) {
  S.schermo = "visita";
  S.luogo = luogo;
  const L = D.LUOGHI[luogo];
  pulisci();
  R.primo = null;
  if (vhs) {
    vhs.mode(L.notte ? "notte" : "giorno");
    vhs.setHeat(null);
    vhs.setDark(0);
    vhs.set({ zoom: 1, cx: 0.5, cy: 0.5, blur: 0, snow: 0 });
  }
  disegnaScena();
  mostra(R.scena, IMG[luogo].src);
  osdRec();
  osd.modo.textContent = L.notte ? "NOTTE" : "";
  hudVisita();
  nuovaRipresa({ tipo: "scena", luogo });
  if (!S.visti[luogo]) {
    S.visti[luogo] = true;
    if (luogo === "camera") S.conosciute.madre = true;
    await dici(D.ARRIVO[luogo]);
  }
}

function hudVisita() {
  hud.replaceChildren();
  if (S.luogo === "camera") hud.append(bottone("Torna in cucina", () => tornaCucina(), "hud-b"));
  hud.append(bottone("Taccuino", apriTaccuino, "hud-b"), bottone("Concludi la visita", () => apriModulo(false), "hud-b forte"));
}

async function tornaCucina() {
  if (R.occupato) return;
  avanza(D.MINUTI.porta);
  await vaiLuogo("cucina");
}

function colpisci(x, y) {
  const L = D.LUOGHI[S.luogo];
  for (const p of L.persone)
    for (const [parte, ellissi] of Object.entries(L.parti[p]))
      for (const [cx, cy, rx, ry] of ellissi)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) return { persona: p, parte };
  const m = ID[S.luogo];
  const v = m.data[(Math.floor(clamp(y, 0, 0.999) * m.h) * m.w + Math.floor(clamp(x, 0, 0.999) * m.w)) * 4];
  const i = Math.round(v / 40);
  if (i >= 1 && i <= L.persone.length) return { persona: L.persone[i - 1] };
  for (const z of L.zone) {
    const [x0, y0, x1, y1] = z.box;
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return { zona: z };
  }
  return null;
}

function testoColpo(c) {
  if (!c) return "";
  if (c.zona) return maiuscolo(c.zona.nome);
  const nome = maiuscolo(D.PERSONE[c.persona].nome);
  return c.parte ? `${nome} · ${maiuscolo(D.PARTI[c.parte])}` : `${nome} · PARLA`;
}

async function cliccaVisita(x, y) {
  if (R.primo) return chiudiPrimo();
  const c = colpisci(x, y);
  if (!c) { menu.hidden = true; return; }
  if (c.parte) return esamina(c.persona, c.parte);
  if (c.persona) return parla(c.persona);
  if (c.zona.tipo === "porta") return menuPorta(c.zona);
  menu.hidden = true;
  avanza(D.MINUTI.indizio);
  await dici(c.zona.dice);
  applica(c.zona.poi);
  dopoAzione();
}

async function esamina(persona, parte) {
  menu.hidden = true;
  const e = D.ESAMI[persona][parte];
  avanza(D.MINUTI.esame);
  if (e.rifiuta) {
    await dici(e.rifiuta);
    return dopoAzione();
  }
  R.occupato = true;
  R.hover = null;
  etichetta.hidden = true;
  const [cx, cy] = D.LUOGHI[S.luogo].parti[persona][parte][0];
  const z = 3.2;
  const img = primoPiano(persona, parte);
  if (vhs) await vhs.tween({ zoom: z, cx: clamp(cx, 0.5 / z, 1 - 0.5 / z), cy: clamp(cy, 0.5 / z, 1 - 0.5 / z), blur: 0.7 }, 550);
  const im = await img;
  mostra(im);
  if (vhs) {
    vhs.set({ zoom: 1, cx: 0.5, cy: 0.5 });
    vhs.burst(0.3);
    vhs.hunt();
  }
  R.primo = { persona, parte, cx, cy };
  S.esami[`${persona}_${parte}`] = true;
  didascalia.textContent = `${maiuscolo(D.PARTI[parte])} · ${maiuscolo(D.PERSONE[persona].nome)}`;
  didascalia.hidden = false;
  hud.replaceChildren(bottone("Torna alla stanza", chiudiPrimo, "hud-b forte"));
  nuovaRipresa({ tipo: "primo", persona, parte });
  R.occupato = false;
  await dici(e.dice);
}

async function chiudiPrimo() {
  if (!R.primo || R.occupato) return;
  R.occupato = true;
  const { cx, cy } = R.primo;
  R.primo = null;
  didascalia.hidden = true;
  disegnaScena();
  mostra(R.scena, IMG[S.luogo].src);
  if (vhs) {
    const z = 2.6;
    vhs.set({ zoom: z, cx: clamp(cx, 0.5 / z, 1 - 0.5 / z), cy: clamp(cy, 0.5 / z, 1 - 0.5 / z), blur: 0.6 });
    await vhs.tween({ zoom: 1, cx: 0.5, cy: 0.5, blur: 0 }, 420);
  }
  nuovaRipresa({ tipo: "scena", luogo: S.luogo });
  hudVisita();
  R.occupato = false;
  dopoAzione();
}

// dopo ogni azione: se e' arrivato il coprifuoco, la visita finisce
async function dopoAzione() {
  if (S.schermo !== "visita" || S.ora < D.INIZIO.coprifuoco) return false;
  await dici([[null, "Sono le otto: coprifuoco. Devi andare."]]);
  apriModulo(true);
  return true;
}

function parla(persona) {
  if (R.occupato) return;
  etichetta.hidden = true;
  const lista = D.DOMANDE[persona].filter((q) => !S.fatte[`${persona}_${q.id}`] && condizione(q.se));
  menu.replaceChildren(el("p", "menu-titolo", maiuscolo(D.PERSONE[persona].nome)));
  for (const q of lista) menu.append(bottone(q.testo, () => chiedi(persona, q)));
  if (S.prove.length) menu.append(bottone("Mostra una prova…", () => menuProve(persona)));
  if (!lista.length && !S.prove.length) menu.append(el("p", "menu-testo", "Non hai altro da chiedere."));
  menu.append(bottone("Basta così", () => { menu.hidden = true; }, "secondario"));
  menu.hidden = false;
}

async function chiedi(persona, q) {
  menu.hidden = true;
  S.fatte[`${persona}_${q.id}`] = true;
  avanza(D.MINUTI.domanda);
  await dici([["TU", q.testo], ...q.dice]);
  applica(q.poi);
  if (!(await dopoAzione())) parla(persona);
}

function menuProve(persona) {
  menu.replaceChildren(el("p", "menu-titolo", `MOSTRA A ${maiuscolo(D.PERSONE[persona].nome)}`));
  for (const id of S.prove) menu.append(bottone(D.PROVE[id].testo, () => mostraProva(persona, id), "prova"));
  menu.append(bottone("Indietro", () => parla(persona), "secondario"));
  menu.hidden = false;
}

async function mostraProva(persona, id) {
  menu.hidden = true;
  const r = D.REAZIONI[persona][id] || D.REAZIONI[persona]._;
  const chiave = `${persona}_prova_${id}`;
  avanza(D.MINUTI.prova);
  await dici([["TU", D.PROVE[id].testo], ...r.dice]);
  if (!S.fatte[chiave]) applica(r.poi);
  S.fatte[chiave] = true;
  if (!(await dopoAzione())) parla(persona);
}

function menuPorta(zona) {
  etichetta.hidden = true;
  const P = D.PORTE[zona.id];
  menu.replaceChildren(el("p", "menu-titolo", maiuscolo(zona.nome)));
  if (P.entra && S.sbloccate[zona.id]) {
    menu.append(bottone(P.entra.testo, async () => {
      menu.hidden = true;
      avanza(D.MINUTI.porta);
      await vaiLuogo(P.entra.vai);
    }));
  } else {
    for (const s of P.scelte) {
      const b = bottone(s.soldi ? `${s.testo}` : s.testo, () => sceltaPorta(s));
      if (s.soldi && s.soldi > S.soldi) b.disabled = true;
      menu.append(b);
    }
  }
  menu.append(bottone("Lascia stare", () => { menu.hidden = true; }, "secondario"));
  menu.hidden = false;
}

async function sceltaPorta(s) {
  menu.hidden = true;
  avanza(s.minuti);
  await dici(s.dice);
  applica(s.poi);
  if (await dopoAzione()) return;
  if (s.poi?.vai) await vaiLuogo(s.poi.vai);
}

// ---------- il modulo della ditta ----------

function personeDellaCasa(casa) {
  return Object.entries(D.PERSONE).filter(([id, p]) => p.casa === casa && (p.luogo !== "camera" || S.conosciute[id]));
}

function apriModulo(obbligato) {
  if (R.occupato && !obbligato) return;
  const casa = S.casa;
  const c = D.CASE[casa];
  const form = el("form", "modulo");
  form.append(el("p", "mod-testata", "PANACEA S.A. · DIVISIONE CONTENIMENTO"),
    el("h2", null, "Verbale di visita"),
    el("p", "mod-dati", `Casa n. ${c.n} · 26.10 · ore ${hhmm(S.ora)}`));
  const tab = el("fieldset");
  tab.append(el("legend", null, "Persone viste"));
  for (const [id, p] of personeDellaCasa(casa)) {
    const lab = el("label", "mod-riga");
    const cb = el("input");
    cb.type = "checkbox";
    cb.name = "via";
    cb.value = id;
    cb.id = `via-${id}`;
    const testo = el("span", null, `${p.nome[0].toUpperCase()}${p.nome.slice(1)}: consegnare al lazzaretto`);
    lab.append(cb, testo);
    const comp = el("span", "mod-comp", `${D.SOLDI.paziente} €`);
    if (p.profilo) comp.append(el("em", "mod-profilo", ` ★ profilo richiesto +${D.SOLDI.profilo} €`));
    lab.append(comp);
    tab.append(lab);
  }
  form.append(tab);
  const prov = el("fieldset");
  prov.append(el("legend", null, "Provvedimento per la casa"));
  for (const [v, testo] of [["nessuno", "Nessuno"], ["chiudi", "Chiudere la casa (croce sulla porta)"], ["domani", "Tornare domani"]]) {
    const lab = el("label", "mod-riga");
    const r = el("input");
    r.type = "radio";
    r.name = "provvedimento";
    r.value = v;
    r.id = `prov-${v}`;
    if (v === "nessuno") r.checked = true;
    lab.append(r, el("span", null, testo));
    prov.append(lab);
  }
  form.append(prov);
  const firma = el("button", "firma", "Firma e consegna");
  firma.type = "submit";
  form.append(firma, el("p", "mod-piede", "Il tempo è salute. La salute è nostra."));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const dati = new FormData(form);
    S.decisioni[casa] = { via: dati.getAll("via"), provvedimento: dati.get("provvedimento") };
    S.visitate[casa] = true;
    const n = S.nastri[S.nastri.length - 1];
    if (n) n.fine = S.ora;
    foglio.dataset.bloccato = "0";
    foglio.hidden = true;
    S.casa = null;
    if (S.ora >= D.INIZIO.coprifuoco) sera();
    else vaiMappa();
  });
  foglio.dataset.bloccato = obbligato ? "1" : "0";
  apriFoglio("modulo", obbligato ? [form] : [form, azioni([["Torna alla visita", chiudiFoglio, "secondario"]])]);
}

// ---------- la sera e i nastri ----------

async function sera() {
  S.fase = "sera";
  S.ora = Math.max(S.ora, D.INIZIO.coprifuoco);
  vaiScrivania();
  await dici([[null, "Le otto. Coprifuoco."], [null, "I nastri di oggi sono nel videoregistratore."]], false, false);
}

function apriNastri() {
  const corpo = [el("h2", null, "Nastri")];
  if (!S.nastri.length) corpo.push(el("p", "vuoto", "Nessuna visita registrata, per ora."));
  for (const n of S.nastri) {
    const durata = `${hhmm(n.inizio)}–${hhmm(n.fine ?? S.ora)}`;
    corpo.push(azioni([[`${n.titolo} · ${durata}`, () => { chiudiFoglio(); riproduci(n); }]]));
  }
  corpo.push(azioni([[`${D.NASTRO_VECCHIO.titolo}`, () => { chiudiFoglio(); riproduciVecchio(); }, "secondario"]]));
  corpo.push(el("p", "nota", "Durante la riproduzione tocca l'immagine per ingrandire. Con l'infrarosso si vede il calore: tocca quello che non torna."));
  apriFoglio("nastri", corpo);
}

function riproduci(nastro) {
  S.schermo = "nastro";
  pulisci();
  R.play = { nastro, i: 0, inPausa: false, ir: false, token: 0 };
  comandi.hidden = false;
  comandi.append(
    bottone("◀◀", () => ripresa(R.play.i - 1), "cmd"),
    bottone("❚❚", pausa, "cmd cmd-play"),
    bottone("▶▶", () => ripresa(R.play.i + 1), "cmd"),
    bottone("IR", infrarosso, "cmd cmd-ir"),
    bottone("Esci", () => { R.play = null; vaiScrivania(); }, "cmd cmd-esci"));
  if (vhs) vhs.setDark(0);
  ripresa(0);
}

function pausa() {
  const p = R.play;
  p.inPausa = !p.inPausa;
  comandi.querySelector(".cmd-play").textContent = p.inPausa ? "▶" : "❚❚";
  if (vhs) vhs.paused = p.inPausa;
  if (!p.inPausa) ripresa(p.i);
}

function infrarosso() {
  const p = R.play;
  p.ir = !p.ir;
  comandi.querySelector(".cmd-ir").classList.toggle("attivo", p.ir);
  modoRipresa();
}

function modoRipresa() {
  const p = R.play;
  const r = p.nastro.riprese[p.i];
  const notte = r.tipo === "scena" ? D.LUOGHI[r.luogo].notte : D.PERSONE[r.persona].luogo === "camera";
  if (vhs) vhs.mode(p.ir ? "ir" : notte ? "notte" : "giorno");
  osd.modo.textContent = p.ir ? "IR" : notte ? "NOTTE" : "";
}

async function ripresa(i) {
  const p = R.play;
  if (!p) return;
  const n = p.nastro;
  if (i < 0) i = 0;
  if (i >= n.riprese.length) {
    sottotitoli.replaceChildren(riga(null, "[fine del nastro]"));
    return;
  }
  p.i = i;
  const tok = ++p.token;
  const r = n.riprese[i];
  if (r.tipo === "scena") {
    mostra(IMG[r.luogo]);
    if (vhs) vhs.setHeat(IMG[`${r.luogo}_calore`]);
    didascalia.hidden = true;
  } else {
    mostra(await primoPiano(r.persona, r.parte));
    if (vhs) vhs.setHeat(null, D.PERSONE[r.persona].calore);
    didascalia.textContent = `${maiuscolo(D.PARTI[r.parte])} · ${maiuscolo(D.PERSONE[r.persona].nome)}`;
    didascalia.hidden = false;
  }
  if (vhs) { vhs.set({ zoom: 1, cx: 0.5, cy: 0.5, blur: 0 }); vhs.burst(0.35); }
  modoRipresa();
  osdPlay(D.DATA_OSD, hhmm(r.ora));
  sottotitoli.replaceChildren();
  // le battute registrate, poi la ripresa dopo
  for (const [chi, testo] of r.righe) {
    if (p.token !== tok || p.inPausa) return;
    sottotitoli.replaceChildren(riga(chi, testo));
    await new Promise((res) => setTimeout(res, Math.max(1600, 800 + testo.length * 52)));
  }
  if (p.token !== tok || p.inPausa) return;
  await new Promise((res) => setTimeout(res, r.righe.length ? 600 : 2400));
  if (p.token === tok && !p.inPausa && R.play === p) ripresa(i + 1);
}

function cliccaNastro(x, y) {
  const p = R.play;
  const r = p.nastro.riprese[p.i];
  const v = vhs ? vhs.p : { zoom: 1, cx: 0.5, cy: 0.5 };
  // dal punto dello schermo al punto dell'immagine, con l'ingrandimento
  const ix = v.cx + (x - 0.5) / v.zoom;
  const iy = v.cy + (y - 0.5) / v.zoom;
  if (p.ir && r.tipo === "scena") {
    for (const t of D.LUOGHI[r.luogo].nascosti) {
      if (((ix - t.x) / t.rx) ** 2 + ((iy - t.y) / t.ry) ** 2 <= 1) {
        if (S.prove.includes(t.prova)) notifica("Già annotato");
        else applica({ prova: t.prova });
        return;
      }
    }
  }
  if (!vhs) return;
  if (v.zoom > 1.05) vhs.tween({ zoom: 1, cx: 0.5, cy: 0.5 }, 350);
  else {
    const z = 2.5;
    vhs.tween({ zoom: z, cx: clamp(ix, 0.5 / z, 1 - 0.5 / z), cy: clamp(iy, 0.5 / z, 1 - 0.5 / z) }, 350);
  }
}

async function riproduciVecchio() {
  S.schermo = "nastro";
  pulisci();
  R.play = null;
  comandi.hidden = false;
  comandi.append(bottone("Esci", () => vaiScrivania(), "cmd cmd-esci"));
  const nero = document.createElement("canvas");
  nero.width = 16; nero.height = 9;
  nero.getContext("2d").fillRect(0, 0, 16, 9);
  mostra(nero, IMG.scrivania.src);
  if (vhs) { vhs.mode("giorno", true); vhs.setDark(0); vhs.set({ snow: 1 }); }
  osdPlay(D.NASTRO_VECCHIO.data, "03:12");
  await dici(D.NASTRO_VECCHIO.righe, false);
  if (S.schermo === "nastro") vaiScrivania();
}

// ---------- la notte ----------

function calcolaNotte() {
  const righe = [];
  const contagiate = [];
  let incasso = 0;
  let fiducia = S.fiducia;
  const portati = [];
  for (const casa of ["casa3", "casa5"]) {
    const c = D.CASE[casa];
    const dec = S.decisioni[casa];
    const membri = Object.entries(D.PERSONE).filter(([, p]) => p.casa === casa);
    const via = dec ? dec.via : [];
    for (const id of via) {
      const p = D.PERSONE[id];
      incasso += D.SOLDI.paziente + (p.profilo ? D.SOLDI.profilo : 0);
      fiducia += p.stato === "sano" ? -20 : 5;
      portati.push(id);
    }
    const malati = membri.filter(([id, p]) => p.stato !== "sano" && !via.includes(id)).length + (D.NASCOSTI[casa] || []).length;
    const sani = membri.filter(([id, p]) => p.stato === "sano" && !via.includes(id)).map(([, p]) => p.nome);
    const vicini = c.vicini.map((v) => D.CASE[v].n).join(" e ");
    if (!dec) {
      righe.push(`Casa ${c.n}: nessuna visita. Il contagio passa alle case ${vicini}.`);
      contagiate.push(...c.vicini);
    } else if (dec.provvedimento === "chiudi") {
      if (malati) righe.push(`Casa ${c.n}: chiusa con la croce. Il contagio non esce, ma dentro ci sono ancora malati${sani.length ? `: domani rischiano anche ${sani.join(", ")}` : ""}.`);
      else { righe.push(`Casa ${c.n}: chiusa con la croce, ma dentro non c'erano più malati.`); fiducia -= 10; }
    } else if (malati) {
      righe.push(`Casa ${c.n}: dentro restano malati. Il contagio passa alle case ${vicini}.${dec.provvedimento === "domani" ? " Domani ci torni." : ""}`);
      contagiate.push(...c.vicini);
    } else righe.push(`Casa ${c.n}: nessun malato rimasto in casa.`);
  }
  const spese = D.SOLDI.stanza + D.SOLDI.cena + D.SOLDI.cassetta * S.nastri.length;
  return { righe, contagiate: [...new Set(contagiate)], incasso, spese, fiducia, portati };
}

function dormi() {
  const n = calcolaNotte();
  S.notte = n;
  S.soldi += n.incasso - n.spese;
  S.fiducia = n.fiducia;
  S.schermo = "notte";
  pulisci();
  osdSpento();
  vaiMappa();
  hud.replaceChildren();
  const corpo = [el("h2", null, "Notte tra il 26 e il 27 ottobre")];
  corpo.push(el("h3", null, "Al lazzaretto"));
  const portati = n.portati.map((id) => D.PERSONE[id].nome).join(", ");
  corpo.push(el("p", null, portati ? `${portati[0].toUpperCase()}${portati.slice(1)}.` : "Nessuno."));
  corpo.push(el("h3", null, "Il contagio"));
  const ul = el("ul");
  for (const r of n.righe) ul.append(el("li", null, r));
  corpo.push(ul);
  corpo.push(el("h3", null, "I conti"));
  corpo.push(el("p", null, `Compenso della ditta: ${n.incasso} €. Spese: ${n.spese} € (stanza, cena, ${S.nastri.length} cassette). Restano ${S.soldi} €.`));
  corpo.push(azioni([["Il giornale del mattino", () => apriGiornale(true)]]));
  foglio.dataset.bloccato = "1";
  apriFoglio("notte", corpo);
}

function giornaleDomani() {
  const n = S.notte;
  const presi = n.portati;
  let titolo = "Un altro giorno di paura";
  let sommario = "Il medico ha girato per il paese fino al coprifuoco. Nessuno sa ancora quante case visiterà domani.";
  if (presi.includes("giovane")) {
    titolo = "Portata via una ragazza sana";
    sommario = "La famiglia della casa 5: «Aveva solo freddo». La Panacea: «Procedura corretta».";
  } else if (presi.includes("figlia")) {
    titolo = "Portata via la figlia del meccanico";
    sommario = "«Stava bene», giurano i vicini. La ditta non risponde.";
  } else if (S.forzate.casa3) {
    titolo = "Il medico entra con la forza";
    sommario = "Alla casa 3 ha spinto via il padrone di casa per entrare nel corridoio.";
  } else if (n.contagiate.length) {
    titolo = "La peste si allarga";
    sommario = `Nuovi malati nelle case ${n.contagiate.map((c) => D.CASE[c].n).join(", ")}.`;
  } else if (Object.values(S.decisioni).some((d) => d.provvedimento === "chiudi")) {
    titolo = "Croci sulle porte";
    sommario = "Il medico ha chiuso delle case. In paese c'è chi applaude e chi sputa per terra.";
  }
  const umore = n.fiducia >= 60 ? "«Almeno qualcuno fa qualcosa», dicono al bar."
    : n.fiducia >= 35 ? "Al bar si parla solo del medico. Nessuno gli si siede vicino."
      : "Sul muro della chiesa, stanotte, qualcuno ha scritto: IL MEDICO È LA PESTE.";
  return {
    testata: "LA VOCE", data: "Foglio del paese · martedì 27 ottobre", titolo, sommario,
    articolo: umore,
    lettera: "«Le case dove entra lui si ammalano. Contate.» Lettera non firmata.",
    breve: "La Panacea annuncia un premio di produzione per il medico.",
    pubblicita: "PANACEA · Ci prendiamo cura di voi.",
  };
}

function verita() {
  const corpo = [el("h2", null, "Com'era davvero")];
  const ul = el("ul");
  for (const t of [
    "Casa 3: il padre era malato (febbre, bubbone al collo). La madre era grave, nascosta in camera, con le dita nere. La figlia era sana.",
    "Casa 5: l'uomo aveva la febbre, il contagio era all'inizio. La ragazza era sana: pallida per il freddo e la fame, non per la peste. La nonna era sana. Dietro la porta c'era il figlio, grave.",
    "Il protocollo mentiva sul pallore, e la ditta paga di più per i giovani sani.",
    "La nonna e il nastro 7 dicono la stessa cosa: la peste arriva con il medico.",
  ]) ul.append(el("li", null, t));
  corpo.push(ul, el("p", "nota", "Fine del prototipo: una giornata. Nel gioco, domani torneresti alla casa 5 con le prove."));
  corpo.push(azioni([["Ricomincia la giornata", ricomincia]]));
  apriFoglio("verita", corpo);
}

function ricomincia() {
  S = nuovoStato();
  foglio.dataset.bloccato = "0";
  foglio.hidden = true;
  R.play = null;
  vaiScrivania();
  introduzione();
}

async function introduzione() {
  if (S.intro) return;
  S.intro = true;
  await dici([[null, "Giorno 1. La ditta ti ha mandato in paese ieri sera."],
    [null, "Il fax con il protocollo è arrivato a mezzogiorno."]], false, false);
}

// ---------- puntatore, tastiera ----------

function punto(e) {
  const r = schermo.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, px: e.clientX - r.left, py: e.clientY - r.top };
}

function mostraEtichetta(testo) {
  if (!testo) { etichetta.hidden = true; return; }
  etichetta.textContent = testo;
  etichetta.hidden = false;
}

schermo.addEventListener("pointermove", (e) => {
  const p = punto(e);
  cursore.style.transform = `translate(${p.px}px, ${p.py}px)`;
  etichetta.style.transform = `translate(${p.px}px, ${p.py}px)`;
  if (S.schermo !== "visita" || R.occupato || R.primo || e.pointerType === "touch") return;
  if (e.target !== canvas && e.target !== statico && e.target !== zoneBox) return;
  const c = colpisci(p.x, p.y);
  const chiave = c ? `${c.persona || ""}|${c.parte || ""}|${c.zona ? c.zona.id : ""}` : "";
  if (chiave === R.hoverKey) return;
  R.hoverKey = chiave;
  R.hover = c && c.persona ? c : null;
  mostraEtichetta(testoColpo(c));
  disegnaScena();
});

schermo.addEventListener("pointerleave", () => {
  etichetta.hidden = true;
  if (S.schermo === "visita" && R.hover) { R.hover = null; disegnaScena(); }
});

schermo.addEventListener("click", (e) => {
  if (R.salta) { R.salta(); return; }
  if (R.occupato) return;
  if (e.target.closest("button, #menu, #comandi, #hud")) return;
  const p = punto(e);
  if (S.schermo === "visita") cliccaVisita(p.x, p.y);
  else if (S.schermo === "nastro" && R.play) cliccaNastro(p.x, p.y);
  else if (S.schermo === "mappa" && menu.hidden && foglio.hidden) zoomMappa(p.x, p.y);
  else menu.hidden = true;
});

foglio.addEventListener("click", (e) => {
  if (e.target === foglio) chiudiFoglio();
});
$("#foglio .chiudi").addEventListener("click", chiudiFoglio);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!foglio.hidden) return chiudiFoglio();
    if (R.primo) return chiudiPrimo();
    if (!menu.hidden) { menu.hidden = true; return; }
  }
  if (e.key === " " && R.salta && foglio.hidden) { e.preventDefault(); R.salta(); }
});

$("#schermo-intero").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await $("#app").requestFullscreen();
  } catch { /* non tutti i telefoni lo permettono */ }
});

// ---------- avvio ----------

async function avvia(dati) {
  sottotitoli.replaceChildren(riga(null, "Carico i nastri…"));
  try {
    vhs = new Vhs(canvas);
    vhs.start();
  } catch {
    vhs = null;
    schermo.classList.add("senza-webgl");
  }
  try {
    await caricaTutto();
  } catch (err) {
    sottotitoli.replaceChildren(riga(null, `Non riesco a caricare ${err.message}. Ricarica la pagina.`));
    return;
  }
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  R.ctx = c.getContext("2d");
  R.scena = c;
  sottotitoli.replaceChildren();
  if (dati && dati.S) S = Object.assign(nuovoStato(), dati.S);
  if (S.schermo === "visita" && S.casa && S.luogo) vaiLuogo(S.luogo);
  else if (S.schermo === "mappa") vaiMappa();
  else vaiScrivania();
  precaricaPrimi();
  introduzione();
}

window.claude?.hot?.snapshot?.(() => ({ S }));
if (window.claude?.hot?.ready) window.claude.hot.ready(avvia);
else avvia(window.claude?.hot?.data ?? {});
