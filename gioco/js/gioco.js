// Il prototipo di una giornata: la stanza del medico in 3D (stanza.js), la scrivania col fax, la mappa, le
// visite (REC, zoom, le frasi addosso a chi parla, le domande a raggiera, il nastro delle frasi da contestare,
// le porte), lo stato di famiglia, i nastri della sera all'infrarosso e la notte.
import { Vhs } from "./vhs.js";
import * as D1 from "./dati.js";
import { giorno2, verita2, giornale3, IMMUNE } from "./giorno2.js";
import { giorno3, verita3, giornale4 } from "./giorno3.js";
import { ESPRESSIONI } from "./espressioni.js";
import { PACCHI } from "./pacchi.js";
import { Parole, Ruota, Striscia, Segni } from "./parole.js";
import { icona, pittogramma } from "./icone.js";
import { Suoni } from "./suoni.js";
import { avviaController } from "./controller.js";
import { T, LINGUA, LINGUE, scegliLingua, traduciPagina, inLingua } from "./lingua.js";

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

// i testi scritti in index.html, nella lingua scelta
traduciPagina();

const schermo = $("#schermo");
const canvas = $("#vhs");
const statico = $("#statico");
const osd = { box: $("#osd"), stato: $("#osd-stato"), modo: $("#osd-modo") };
const zoneBox = $("#zone");
const etichetta = $("#etichetta");
const cursore = $("#cursore");
const hud = $("#hud");
const comparsa = $("#comparsa");
const aiutoBox = $("#aiuto");
const didascalia = $("#didascalia");
const avviso = $("#avviso");
const comandi = $("#comandi");
const foglio = $("#foglio");
const foglioCorpo = $("#foglio-corpo");
const soldiHud = $("#soldi-hud");
const indicatori = $("#indicatori");
const caricamento = $("#caricamento");
const indPazienza = $("#ind-pazienza");
const indTempo = $("#ind-tempo");
const schedaCasa = $("#scheda-casa");
const nastroFrasi = $("#nastro-frasi");
const segni = new Segni($("#segni"));
const parole = new Parole($("#parole"));
const suoni = new Suoni();
const ruota = new Ruota($("#ruota"));
const striscia = new Striscia(nastroFrasi, $("#nastro-scorri"), segni);

// i contenuti del giorno: quelli di dati.js, e dal secondo giorno quelli di giorno2.js (dal terzo di giorno3.js) al
// posto delle tabelle che cambiano (persone, scene, domande, esami, frasi, fax...)
let D = { ...D1 };

const W = 1600, H = 900;
const IMG = {};
const ID = {};
const PRIMI = {};

// ---------- stato ----------

function nuovoStato() {
  return {
    schermo: "stanza", fase: "mattina", ora: D.INIZIO.ora, soldi: D.INIZIO.soldi, fiducia: D.INIZIO.fiducia,
    casa: null, luogo: null, prove: [], esami: {}, fatte: {}, sbloccate: {}, conosciute: {}, visti: {},
    forzate: {}, decisioni: {}, visitate: {}, nastri: [], intro: false, notte: null,
    // il nastro delle frasi: dichiarazioni ("d:...") e prove ("p:...") nell'ordine in cui sono arrivate
    dette: {}, frasi: [], contestate: {}, volti: {},
    // lo stato di famiglia: note a penna per persona, chi e' morto, i timbri della diagnosi, chi va al lazzaretto,
    // il provvedimento per casa, le note del comune barrate
    note: {}, morti: {}, diagnosi: {}, lazzaretto: {}, provv: {}, barrati: {},
    // l'ospite della notte: chi si porta a casa (solo un sano, uno per notte)
    ospite: null,
    // la pazienza di ogni famiglia e le case da cui ti hanno cacciato
    pazienza: {}, cacciato: {},
    // il giorno (la bozza ne ha due), i giorni passati (diagnosi e morti, per la verita' alla fine) e il giornale
    // di stamattina
    giorno: 1, giorni: [], giornale: null,
    // quello che resta da un giorno all'altro per il finale, oltre alle prove e alle frasi dei giorni passati (il nastro 7)
    tracce: {},
  };
}
let S = nuovoStato();
// quello che non si salva: cosa c'e' sotto il puntatore, battute in corso, primo piano, nastro in riproduzione,
// le facce di adesso (con la dissolvenza da una all'altra), la frase del nastro scelta col tocco
const R = { hover: null, hoverKey: "", occupato: false, primo: null, play: null, turno: 0, blocco: 0,
  ctx: null, scena: null, animaSpilli: false, mctx: null, mappa: null, casaSopra: null, casaScelta: null,
  facce: {}, animaVolti: false, ritorni: {}, scelta: null, bersaglio: null, sfScelta: null, sfCasa: null };
const DISSOLVENZA = 260;
let vhs = null;
// la stanza del medico in 3D; se il browser non regge WebGL 2 si resta sulla scrivania in 2D
let stanza = null;
let controller = null;
// le visite in plastilina (visita3d.js, dal 27 ottobre): le stanze 3D coi pupazzi. Si caricano dopo la stanza del
// medico, in sottofondo (visitaPronta); senza WebGL 2 restano le scene 2D di prima
let visita = null;
let visitaPronta = null;
// le foto della videocamera nelle visite in plastilina (data URL): i ritratti ("ritratto:giorno:persona:volto"), lo
// zoom degli esami ("parte:giorno:persona:parte") e i fotogrammi delle prove ("prova:giorno:id"). Non si salvano:
// arrivano quando la persona o la cosa si e' vista
const FOTO = {};

// ---------- immagini ----------

// le immagini delle case nuove del secondo giorno stanno in pacchi (img/pacchi/<pacco>.json, percorso -> data URL;
// quale immagine sta in quale pacco lo dice pacchi.js), perche' l'artifact tiene al massimo 511 file. Un pacco si
// apre la prima volta che serve una sua immagine; all'inizio di un giorno si aprono tutti quelli del giorno, cosi'
// anche le foto messe direttamente nelle pagine (lo stato di famiglia, il nastro delle frasi) le trovano gia'
// pronte. Quelli del terzo giorno si chiamano g3_*
const DAI_PACCHI = {};
const APERTI = {};
const apriPacco = (nome) => (APERTI[nome] ||= fetch(`img/pacchi/${nome}.json`)
  .then((r) => { if (!r.ok) throw new Error(`img/pacchi/${nome}.json`); return r.json(); })
  .then((o) => { Object.assign(DAI_PACCHI, o); }));
const apriPacchi = () => Promise.all([...new Set(Object.values(PACCHI))]
  .filter((nome) => S.giorno >= 3 || !nome.startsWith("g3_")).map(apriPacco));
// l'indirizzo di un'immagine: il data URL, se sta in un pacco gia' aperto
const url = (src) => DAI_PACCHI[src] || src;

const carica = async (src) => {
  if (PACCHI[src]) await apriPacco(PACCHI[src]);
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error(src));
    i.src = url(src);
  });
};

// le visite (27 ottobre, sera): si torna alle scene 2D; quelle in plastilina restano per riferimento con #creta
// nell'indirizzo. Niente VHS da nessuna parte (restano la lampada, lo zoom, la notte verde e l'infrarosso)
const VISITE_3D = /creta/.test(location.hash);
// al posto del catrame un filtro colore per casa, alternati col numero della casa (vhs.js): 3 verde malato,
// 4 ottanio e arancio, 5 blu freddo, 6 livido. Per confronto #catrame, #rosso (grigio coi rossi) e #blu (blu col
// bianco) mettono lo stesso tono in tutte le case
const TONO = /catrame/.test(location.hash) ? 0 : /rosso/.test(location.hash) ? 1 : /blu/.test(location.hash) ? 2 : null;
const tonoCasa = (casa) => TONO ?? 3 + ((D1.CASE[casa]?.n ?? 1) - 1) % 4;

// le scene 2D di prima servono solo se le visite in plastilina non partono (senza WebGL 2): allora si caricano dopo
const conWebgl2 = (() => {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
})();

async function caricaTutto() {
  const lista = { scrivania: "img/scrivania.jpg", mappa: inLingua("img/mappa.jpg") };
  const voci = await Promise.all(Object.entries(lista).map(async ([k, src]) => [k, await carica(src)]));
  for (const [k, im] of voci) IMG[k] = im;
  if (!vhs || !conWebgl2 || !VISITE_3D) await caricaLuoghi(D.LUOGHI);
}

// le scene di un giorno: l'immagine, le persone (un grigio per persona), il calore, le sagome, le espressioni. Il nome
// dei file e' quello del luogo, o "img" (le scene del secondo giorno cambiano con chi e' rimasto in casa)
async function caricaLuoghi(luoghi) {
  const lista = {};
  for (const [luogo, L] of Object.entries(luoghi)) {
    const f = L.img || luogo;
    lista[luogo] = `img/${f}.jpg`;
    lista[`${luogo}_persone`] = `img/${f}_persone.png`;
    // "calore": un'altra mappa del calore (le case nuove, quando stanotte qualcuno si e' ammalato); "vivo": la fa il
    // gioco (caloreVivo)
    if (L.calore !== "vivo") lista[`${luogo}_calore`] = `img/${L.calore || `${f}_calore`}.png`;
    for (const p of L.persone) lista[`${luogo}_${p}`] = `img/${f}_${p}.png`;
    for (const [persona, E] of Object.entries(ESPRESSIONI[luogo] || {}))
      for (const volto of E.volti) lista[`esp_${luogo}_${persona}_${volto}`] = `img/espressioni/${luogo}_${persona}_${volto}.png`;
  }
  const voci = await Promise.all(Object.entries(lista).map(async ([k, src]) => [k, await carica(src)]));
  for (const [k, im] of voci) IMG[k] = im;
  // mappe dei personaggi: un grigio per persona (40, 80, 120...) da leggere sotto il puntatore
  for (const [luogo, L] of Object.entries(luoghi)) {
    const im = IMG[`${luogo}_persone`];
    const c = document.createElement("canvas");
    c.width = im.naturalWidth; c.height = im.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(im, 0, 0);
    ID[luogo] = { w: c.width, h: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data };
    if (L.calore === "vivo") IMG[`${luogo}_calore`] = caloreVivo(luogo, L);
  }
}

// la mappa del calore per l'infrarosso dei nastri, fatta qui (le scene del terzo giorno): le sagome di chi c'e', col
// calore di oggi (piu' caldo dove si vede la pelle, come in tools/prepara_gioco.py), e le macchie del luogo, sfumate:
// lampade, candele, chi sta dietro una porta o sotto il pavimento ([x, y, r, calore] o [x, y, rx, ry, calore])
function caloreVivo(luogo, L) {
  const w = 800, h = 450;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(IMG[luogo], 0, 0, w, h);
  const scena = ctx.getImageData(0, 0, w, h).data;
  const caldo = new Float32Array(w * h);
  for (const p of L.persone) {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(IMG[`${luogo}_${p}`], 0, 0, w, h);
    const m = ctx.getImageData(0, 0, w, h).data;
    const k = D.PERSONE[p]?.calore ?? 0.5;
    for (let i = 0; i < w * h; i++) {
      const a = m[i * 4 + 3] / 255;
      if (!a) continue;
      const r = scena[i * 4] / 255, g = scena[i * 4 + 1] / 255, b = scena[i * 4 + 2] / 255;
      const pelle = clamp((r - b - 0.06) / 0.12, 0, 1) * clamp((r - g + 0.02) / 0.08, 0, 1);
      caldo[i] = Math.max(caldo[i], a * k * (0.55 + 0.45 * pelle));
    }
  }
  const dati = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const v = caldo[i] * 255;
    dati.data[i * 4] = dati.data[i * 4 + 1] = dati.data[i * 4 + 2] = v;
    dati.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(dati, 0, 0);
  const persone = document.createElement("canvas");
  persone.width = w; persone.height = h;
  persone.getContext("2d").drawImage(c, 0, 0);
  const macchie = document.createElement("canvas");
  macchie.width = w; macchie.height = h;
  const mctx = macchie.getContext("2d");
  mctx.fillStyle = "#000";
  mctx.fillRect(0, 0, w, h);
  for (const m of L.macchie || []) {
    const [x, y, rx, ry, v] = m.length === 4 ? [m[0], m[1], m[2], m[2] * 16 / 9, m[3]] : m;
    const g = Math.round(v * 255);
    mctx.fillStyle = `rgb(${g}, ${g}, ${g})`;
    mctx.beginPath();
    mctx.ellipse(x * w, y * h, rx * w, ry * h, 0, 0, Math.PI * 2);
    mctx.fill();
  }
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.filter = "blur(3px)";
  ctx.drawImage(persone, 0, 0);
  ctx.globalCompositeOperation = "lighten";
  ctx.filter = `blur(${w * 0.012}px)`;
  ctx.drawImage(macchie, 0, 0);
  ctx.filter = "none";
  ctx.globalCompositeOperation = "source-over";
  return c;
}

// le immagini che servono solo a volte (l'ospite della notte): caricate la prima volta che servono
const IMMAGINI = {};
const immagine = (src) => (IMMAGINI[src] ||= carica(src));

// il primo piano di una parte del corpo: quello del primo giorno, o "foto" se oggi e' cambiata (img/pp/g2/...)
function fotoPrimo(persona, parte) {
  return D.ESAMI[persona]?.[parte]?.foto || `${persona}_${parte}`;
}

function primoPiano(persona, parte) {
  const k = fotoPrimo(persona, parte);
  if (!PRIMI[k]) PRIMI[k] = carica(`img/pp/${k}.jpg`);
  return PRIMI[k];
}

function precaricaPrimi() {
  if (visita || visitaPronta) return;
  for (const [persona, esami] of Object.entries(D.ESAMI))
    for (const [parte, e] of Object.entries(esami)) if (!e.rifiuta) primoPiano(persona, parte).catch(() => {});
}

// ---------- schermo e videocamera ----------

function mostra(sorgente, src) {
  if (vhs) vhs.setSource(sorgente);
  statico.src = src || sorgente.src || "";
}

function disegnaScena() {
  if (visita && S.schermo === "visita") {
    visita.evidenzia(R.hover && R.hover.persona && !R.primo ? R.hover.persona : null);
    return;
  }
  const ctx = R.ctx;
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.drawImage(IMG[S.luogo], 0, 0, W, H);
  disegnaVolti(ctx, S.luogo, R.facce);
  if (R.hover && R.hover.persona && !R.primo) {
    // chi e' sotto il puntatore: un velo di luce che schiarisce gli scuri ma non i chiari ("screen"), e l'alone
    // attorno alla sagoma. Prima era luce aggiunta su tutta la persona ("lighter"), e la videocamera la bruciava
    // ancora (la lampada e l'alone delle luci forti, in vhs.js): sulle gemelle si accendevano chiazze
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = R.hover.parte ? 0.06 : 0.12;
    ctx.drawImage(IMG[`${S.luogo}_${R.hover.persona}`], 0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = R.hover.parte ? 0.35 : 0.7;
    ctx.drawImage(alone(S.luogo, R.hover.persona), 0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }
  if (vhs && vhs.source === R.scena) vhs.refresh();
}

// l'alone di una persona: la luce che esce dal bordo della sua sagoma, solo fuori (dentro resta com'e')
const ALONI = {};
function alone(luogo, persona) {
  const k = `${luogo}_${persona}`;
  const s = IMG[k];
  if (ALONI[k]?.sagoma === s) return ALONI[k].canvas;
  const c = document.createElement("canvas");
  c.width = s.naturalWidth;
  c.height = s.naturalHeight;
  const ctx = c.getContext("2d");
  ctx.shadowColor = "rgba(255, 234, 184, 1)";
  ctx.shadowBlur = Math.round(c.width / 90);
  ctx.drawImage(s, 0, 0);
  ctx.drawImage(s, 0, 0);
  ctx.shadowColor = "transparent";
  ctx.globalCompositeOperation = "destination-out";
  ctx.drawImage(s, 0, 0);
  ALONI[k] = { sagoma: s, canvas: c };
  return c;
}

// ---------- le facce: le espressioni sono teste ritagliate da incollare sopra la scena ----------

// facce: { persona: { da, a, t0 } }, da una espressione all'altra (null e' la faccia della scena)
function disegnaVolti(ctx, luogo, facce) {
  const adesso = performance.now();
  for (const [persona, f] of Object.entries(facce)) {
    const E = ESPRESSIONI[luogo]?.[persona];
    if (!E) continue;
    const [x0, y0, x1, y1] = E.box;
    const p = clamp((adesso - f.t0) / DISSOLVENZA, 0, 1);
    const testa = (volto, a) => {
      const im = volto && IMG[`esp_${luogo}_${persona}_${volto}`];
      if (!im || a <= 0) return;
      ctx.globalAlpha = a;
      ctx.drawImage(im, x0 * W, y0 * H, (x1 - x0) * W, (y1 - y0) * H);
    };
    if (p < 1) testa(f.da, 1 - p);
    testa(f.a, p);
  }
  ctx.globalAlpha = 1;
}

function cambiaVolto(persona, volto) {
  clearTimeout(R.ritorni[persona]);
  const E = ESPRESSIONI[S.luogo]?.[persona];
  // chi e' cambiato non ha piu' espressioni (le teste di ieri, nello stesso luogo, sono di un'altra faccia)
  if (!D.LUOGHI[S.luogo].persone.includes(persona) || D.PERSONE[persona]?.stato === "mostro") return;
  // in plastilina ogni pupazzo ha le sue facce di ricambio (visita3d.js: se manca, resta la sua)
  if (!visita && !E) return;
  if (!visita && volto && !E.volti.includes(volto)) volto = null;
  const f = R.facce[persona];
  const ora = f ? f.a : null;
  if (ora === volto) return;
  R.facce[persona] = { da: ora, a: volto, t0: performance.now() };
  // in plastilina si cambia la faccia del pupazzo, come negli stop-motion; la videocamera ne tiene la foto
  if (visita) {
    const luogo = S.luogo;
    visita.volto(persona, volto).then(() => { if (S.luogo === luogo) ritratto(persona, volto); });
    return;
  }
  // la videocamera "sente" il cambio: un piccolo disturbo
  if (vhs && !R.primo) vhs.burst(0.14);
  if (R.animaVolti) return;
  R.animaVolti = true;
  const giro = () => {
    if (S.schermo !== "visita") { R.animaVolti = false; return; }
    disegnaScena();
    if (Object.values(R.facce).some((x) => performance.now() - x.t0 < DISSOLVENZA)) requestAnimationFrame(giro);
    else R.animaVolti = false;
  };
  requestAnimationFrame(giro);
}

// entrando in una stanza le facce sono quelle rimaste (chi ha pianto, piange ancora)
function facceDellaStanza() {
  for (const t of Object.values(R.ritorni)) clearTimeout(t);
  R.ritorni = {};
  R.facce = {};
  for (const [persona, volto] of Object.entries(S.volti))
    if (D.LUOGHI[S.luogo]?.persone.includes(persona)) R.facce[persona] = { da: null, a: volto, t0: 0 };
}

function osdSpento() {
  osd.box.hidden = true;
}

function osdRec() {
  osd.box.hidden = false;
  osd.box.classList.remove("play");
  osd.stato.innerHTML = "";
  osd.stato.append(el("i", "punto"), document.createTextNode(T("REC")));
}

function osdPlay() {
  osd.box.hidden = false;
  osd.box.classList.add("play");
  osd.stato.innerHTML = "";
  osd.stato.append(el("i", "triangolo"), document.createTextNode(T("PLAY")));
}

// in alto i soldi, come in un videogioco; data e ora non si vedono (resta la radiosveglia nella stanza)
function aggiornaHud() {
  soldiHud.innerHTML = `${icona("moneta")}<span>${S.soldi} €</span>`;
  if (stanza) stanza.segnaOra(hhmm(S.ora));
  disegnaIndicatori();
}

function avanza(min) {
  S.ora += min;
  aggiornaHud();
  if (min > 0) colpo("tempo", T`−${min} MIN`);
}

// ---------- gli indicatori: la pazienza della famiglia e il tempo che resta fino al coprifuoco ----------

const ORE = (D.INIZIO.coprifuoco - D.INIZIO.ora) / 60;

function pazienza() {
  return S.casa ? S.pazienza[S.casa] ?? D.PAZIENZA : D.PAZIENZA;
}

// "visita": tutti e due; "mappa": solo il tempo; null: nessuno
function mostraIndicatori(modo) {
  indicatori.hidden = !modo;
  indicatori.dataset.modo = modo || "";
  indPazienza.hidden = modo !== "visita";
  disegnaIndicatori();
}

function tacche(ind, n, pieno) {
  const barra = ind.querySelector(".ind-barra");
  if (barra.children.length !== n)
    barra.replaceChildren(...Array.from({ length: n }, () => { const t = el("span", "tacca"); t.append(el("i")); return t; }));
  [...barra.children].forEach((t, i) => t.style.setProperty("--pieno", pieno(i)));
}

function disegnaIndicatori() {
  if (indicatori.hidden) return;
  const p = pazienza();
  indPazienza.dataset.livello = p >= 4 ? "alto" : p >= 3 ? "medio" : "basso";
  indPazienza.querySelector(".ind-ic").innerHTML = icona(p >= 4 ? "calma" : p >= 3 ? "seria" : "arrabbiata");
  tacche(indPazienza, D.PAZIENZA, (i) => (i < p ? 1 : 0));
  // una tacca per ogni ora fino al coprifuoco; quella in corso si svuota a poco a poco
  const resta = Math.max(0, D.INIZIO.coprifuoco - S.ora) / 60;
  indTempo.dataset.livello = resta > 2 ? "alto" : resta > 1 ? "medio" : "basso";
  indTempo.querySelector(".ind-ic").innerHTML = icona("clessidra");
  tacche(indTempo, ORE, (i) => clamp(resta - i, 0, 1));
}

// un indicatore che cala: la cifra che sale e svanisce, l'icona che trema
function colpo(nome, testo) {
  const ind = nome === "tempo" ? indTempo : indPazienza;
  if (indicatori.hidden || ind.hidden) return;
  const d = el("span", "ind-delta", testo);
  ind.append(d);
  setTimeout(() => d.remove(), 1700);
  ind.classList.remove("colpito");
  void ind.offsetWidth;
  ind.classList.add("colpito");
}

// qualcuno della famiglia si arrabbia: la pazienza cala di uno (a zero, dopo l'azione, ti cacciano)
function arrabbia(n = 1) {
  if (S.schermo !== "visita" || !S.casa || pazienza() <= 0) return;
  S.pazienza[S.casa] = Math.max(0, pazienza() - n);
  disegnaIndicatori();
  colpo("pazienza", `−${n}`);
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
  parole.pulisci();
  ruota.chiudi();
  striscia.annulla();
  segni.svuota();
  for (const t of schermo.querySelectorAll(".timbro-schermo")) t.remove();
  R.occupato = false;
  R.blocco = 0;
  R.hoverKey = "";
  R.scelta = null;
  R.bersaglio = null;
  zoneBox.replaceChildren();
  schedaCasa.hidden = true;
  delete schedaCasa.dataset.x;
  hud.replaceChildren();
  aiuto(null);
  comandi.replaceChildren();
  comandi.hidden = true;
  didascalia.hidden = true;
  etichetta.hidden = true;
  nastroFrasi.hidden = true;
  R.hover = null;
  mostraIndicatori(null);
  if (stanza) stanza.esci();
  if (vhs) { vhs.prima = null; vhs.setEsame(0); }
  schermo.classList.remove("contagio");
  schermo.dataset.schermo = S.schermo;
}

// ---------- le icone a comparsa: i comandi del medico in basso a destra e il suggerimento in basso a sinistra.
// Compaiono quando si muove il puntatore sullo schermo o lo si tocca (e per qualche secondo a ogni schermata
// nuova), poi spariscono e lasciano libera l'immagine della videocamera ----------

let comparsaTimer = 0;
const tocco = () => matchMedia("(pointer: coarse)").matches;

function mostraComparsa(ms = tocco() ? 4000 : 2600) {
  schermo.dataset.comparsa = "1";
  clearTimeout(comparsaTimer);
  comparsaTimer = setTimeout(nascondiComparsa, ms);
}

function nascondiComparsa() {
  // non sparisce mentre il puntatore e' sopra un'icona o una e' selezionata dalla tastiera
  if (comparsa.matches(":hover, :focus-within")) { comparsaTimer = setTimeout(nascondiComparsa, 1200); return; }
  delete schermo.dataset.comparsa;
}

// un comando: l'icona, col nome che compare passandoci sopra (col dito e' sempre accanto)
function tasto(testo, azione, ic, forte = false) {
  const b = el("button", forte ? "tasto forte" : "tasto");
  b.type = "button";
  b.setAttribute("aria-label", testo);
  b.insertAdjacentHTML("beforeend", icona(ic));
  b.append(el("span", "tasto-nome", testo));
  b.addEventListener("click", (e) => { e.stopPropagation(); azione(); });
  return b;
}

// i comandi di questa schermata (lo schermo intero c'e' sempre, a destra)
function tasti(...lista) {
  hud.replaceChildren(...lista);
  mostraComparsa(3500);
}

function aiuto(testo) {
  aiutoBox.textContent = testo || "";
}

schermo.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse" && !document.pointerLockElement) mostraComparsa(); });
schermo.addEventListener("pointerdown", () => { if (!document.pointerLockElement) mostraComparsa(); });
// premere su un'icona non e' un clic sulla scena (ne' l'inizio di uno sguardo attorno nella stanza 3D)
comparsa.addEventListener("pointerdown", (e) => e.stopPropagation());

function bottone(testo, azione, cls = "", ic = null) {
  const b = el("button", cls);
  b.type = "button";
  if (ic) b.insertAdjacentHTML("beforeend", icona(ic));
  b.append(el("span", null, testo));
  b.addEventListener("click", (e) => { e.stopPropagation(); azione(); });
  return b;
}

// ---------- le battute: scritte addosso a chi parla ----------

// sul nastro della visita: ogni battuta, con le facce che restano in quel momento (per rivederle la sera)
function registra(chi, testo, extra) {
  const n = S.nastri[S.nastri.length - 1];
  if (S.casa && n && n.riprese.length) n.riprese[n.riprese.length - 1].righe.push([chi, testo, { ...extra, fermi: { ...S.volti } }]);
}

// dove si scrive una battuta: accanto alla testa di chi parla, se si vede; in basso il medico, le descrizioni
// e chi non si vede (col nome)
function ancora(chi, luogo = S.luogo, primo = R.primo) {
  if (!chi || chi === "TU") return { lato: "sotto" };
  const persona = D.VOCI[chi];
  const L = luogo && D.LUOGHI[luogo];
  if (primo) return primo.persona === persona ? { lato: "sotto" } : { lato: "sotto", nome: chi };
  if (L && persona && L.persone.includes(persona)) {
    const [x, y, lato] = L.frasi[persona];
    return { x, y, lato };
  }
  return { lato: "sotto", nome: chi };
}

function chiaviDi(extra) {
  if (!extra || !extra.k) return {};
  return typeof extra.k === "string" ? { "*": extra.k } : extra.k;
}

// le battute una dopo l'altra, lettera per lettera; un clic completa la frase, un altro passa alla successiva.
// Nuove battute o un cambio di schermo interrompono quelle in corso. Con "blocca" intanto non si puo' fare altro
// (la narrazione non blocca). Le dichiarazioni finiscono sul nastro delle frasi; le facce cambiano, e a fine
// discorso tornano com'erano (tranne quelle che restano, in S.volti).
async function dici(righe, salva = true, blocca = true) {
  const turno = ++R.turno;
  if (blocca) {
    R.occupato = true;
    R.blocco = turno;
    ruota.chiudi();
  }
  etichetta.hidden = true;
  const cambiate = new Set();
  let rabbia = false;
  for (const [chi, testo, extra = {}] of righe) {
    if (R.turno !== turno) break;
    const persona = D.VOCI[chi];
    // la prima faccia arrabbiata di un discorso costa un punto di pazienza
    if (extra.volto === "arrabbiato" && !rabbia) {
      rabbia = true;
      arrabbia();
    }
    if (extra.volto && persona && S.schermo === "visita") {
      cambiaVolto(persona, extra.volto);
      cambiate.add(persona);
    }
    if (salva) registra(chi, testo, extra);
    const finita = await parole.scrivi(chi, testo, ancora(chi), chiaviDi(extra));
    if (!finita || R.turno !== turno) break;
    // (una frase di ieri ripetuta oggi non torna sul nastro: vale solo quella del giorno)
    if (extra.d && D.DICHIARAZIONI[extra.d]) mettiSulNastro(`d:${extra.d}`, persona && R.facce[persona]?.a);
  }
  if (R.turno === turno) parole.attenua();
  if (R.blocco === turno) {
    R.occupato = false;
    R.blocco = 0;
  }
  // a fine discorso le facce tornano com'erano (o come restano, in S.volti)
  const luogo = S.luogo;
  for (const p of cambiate) {
    clearTimeout(R.ritorni[p]);
    R.ritorni[p] = setTimeout(() => {
      if (S.schermo === "visita" && S.luogo === luogo) cambiaVolto(p, S.volti[p] || null);
    }, 2600);
  }
  return R.turno === turno;
}

// ---------- il nastro delle frasi ----------

function casaDi(id) {
  const k = id.slice(2);
  return id.startsWith("d:") ? D.PERSONE[D.DICHIARAZIONI[k].chi].casa : D.PROVE[k].casa;
}

// una frase vale nella sua casa; una prova con "anche" pure nelle altre (la cartella della ditta, il secondo giorno)
function valeIn(id, casa) {
  return casaDi(id) === casa || (id.startsWith("p:") && !!D.PROVE[id.slice(2)].anche?.includes(casa));
}

function mettiSulNastro(id, volto) {
  if (S.frasi.some((f) => f.id === id)) return;
  if (id.startsWith("d:")) S.dette[id.slice(2)] = true;
  S.frasi.push({ id, ora: S.ora, volto: volto || null });
  if (S.schermo === "visita") aggiornaNastro();
}

// la porzione di un'immagine 16:9 da mettere nella foto del nastro (6:7), attorno a una zona della scena
function ritaglioZona(luogo, zid) {
  const z = D.LUOGHI[luogo].zone.find((q) => q.id === zid);
  const [x0, y0, x1, y1] = z.box;
  const h = clamp((y1 - y0) * 1.15, 0.22, 0.6);
  const w = h * (6 / 7) * (9 / 16);
  return { src: url(`img/${D.LUOGHI[luogo]?.img || luogo}.jpg`), w, h, x: clamp((x0 + x1) / 2 - w / 2, 0, 1 - w), y: clamp((y0 + y1) / 2 - h / 2, 0, 1 - h) };
}

// la foto di una persona (per lo stato di famiglia, la scheda della casa, il nastro delle frasi): quella del primo
// giorno, o "volto" se oggi la faccia e' cambiata (img/volti/g2/...)
function fotoVolto(persona) {
  return D.PERSONE[persona]?.volto || persona;
}

// in plastilina: il ritratto di una persona con una faccia, preso dalla videocamera se adesso e' davanti con quella
// faccia (e non nella posa di un esame), altrimenti quello gia' preso (o quello con la faccia di sempre)
function ritratto(persona, volto = null) {
  const k = (v) => `ritratto:${S.giorno}:${persona}:${v || ""}`;
  if (!FOTO[k(volto)] && visita && S.schermo === "visita" && visita.presenti.includes(persona) && !visita.zoom.chi
    && (visita.pronti(persona)?.volto ?? null) === (volto || null))
    FOTO[k(volto)] = visita.scatta({ chi: persona })?.toDataURL("image/jpeg", 0.86);
  return FOTO[k(volto)] || FOTO[k(null)] || null;
}

// in plastilina: il fotogramma di una prova, nel momento in cui si trova (la zona della scena, la parte del corpo
// com'era nello zoom dell'esame, l'infrarosso del nastro), o la foto di chi l'ha detta
function fotoProva(id) {
  const P = D.PROVE[id];
  const k = `prova:${S.giorno}:${id}`;
  if (!FOTO[k] && visita && visita.luogo) {
    let f = null;
    if (P.parte) {
      const [persona, parte] = P.parte;
      if (R.primo?.persona === persona && R.primo?.parte === parte) f = visita.scatta();
      else if (!FOTO[`parte:${S.giorno}:${persona}:${parte}`] && !visita.zoom.chi) f = visita.scatta({ chi: persona, parte });
    } else if (P.zona && visita.luogo === P.zona[0] && !visita.zoom.chi) {
      const z = D.LUOGHI[P.zona[0]]?.zone.find((q) => q.id === P.zona[1]);
      if (z) f = visita.scatta({ box: z.box });
    }
    if (f) FOTO[k] = f.toDataURL("image/jpeg", 0.86);
  }
  if (FOTO[k]) return FOTO[k];
  if (P.parte) return FOTO[`parte:${S.giorno}:${P.parte[0]}:${P.parte[1]}`] || ritratto(P.parte[0]);
  if (P.da) return ritratto(P.da);
  return null;
}

function fotogramma(v) {
  const k = v.id.slice(2);
  if (v.id.startsWith("d:")) {
    const d = D.DICHIARAZIONI[k];
    const volto = v.volto && ESPRESSIONI[D.PERSONE[d.chi]?.luogo]?.[d.chi]?.volti.includes(v.volto) ? `_${v.volto}` : "";
    const src = visita ? ritratto(d.chi, v.volto) : url(`img/volti/${fotoVolto(d.chi)}${volto}.jpg`);
    return { id: v.id, tipo: "detta", foto: src ? { src } : null, testo: d.testo,
      meta: D.PERSONE[d.chi]?.voce ? T(D.PERSONE[d.chi].voce) : "", icona: icona("fumetto") };
  }
  const P = D.PROVE[k];
  let foto = null;
  if (visita) {
    const src = fotoProva(k);
    return { id: v.id, tipo: "prova", foto: src ? { src } : null, testo: P.breve, meta: P.ir ? T("NASTRO IR") : T("INDIZIO"),
      icona: icona(P.ir ? "fiamma" : "lente") };
  }
  if (P.zona) foto = ritaglioZona(...P.zona);
  else if (P.parte) foto = { src: url(`img/pp/${fotoPrimo(...P.parte)}.jpg`), w: (6 / 7) * (9 / 16), h: 1, x: 0.5 - (6 / 7) * (9 / 32), y: 0 };
  else if (P.da) foto = { src: url(`img/volti/${fotoVolto(P.da)}.jpg`) };
  if (foto && P.ir) foto.filtro = "ir";
  return { id: v.id, tipo: "prova", foto, testo: P.breve, meta: P.ir ? T("NASTRO IR") : T("INDIZIO"), icona: icona(P.ir ? "fiamma" : "lente") };
}

function aggiornaNastro() {
  if (S.schermo !== "visita") return;
  const lista = S.frasi.filter((f) => valeIn(f.id, S.casa)).map(fotogramma);
  striscia.mostra(lista, T("Il nastro delle frasi: quello che conta finisce qui. Trascinalo su chi o cosa lo smentisce."));
  for (const d of nastroFrasi.querySelectorAll(".fot")) d.classList.toggle("scelta", !!R.scelta && d.dataset.id === R.scelta.id);
}

// ---------- nastri: ogni visita registra le inquadrature e le battute ----------

function nuovaRipresa(r) {
  const n = S.nastri[S.nastri.length - 1];
  if (S.casa && n) n.riprese.push({ ...r, ora: S.ora, volti: { ...S.volti }, righe: [] });
}

// ---------- effetti di domande, prove, porte ----------

function applica(poi) {
  if (!poi) return;
  if (poi.prova && D.PROVE[poi.prova] && !S.prove.includes(poi.prova)) {
    if (visita) fotoProva(poi.prova);
    S.prove.push(poi.prova);
    mettiSulNastro(`p:${poi.prova}`);
    notifica(T("Sul nastro delle frasi"));
  }
  if (poi.volti) {
    Object.assign(S.volti, poi.volti);
    for (const [persona, volto] of Object.entries(poi.volti)) cambiaVolto(persona, volto);
  }
  if (poi.fiducia) S.fiducia += poi.fiducia;
  if (poi.soldi) { S.soldi += poi.soldi; aggiornaHud(); }
  if (poi.sblocca) S.sbloccate[poi.sblocca] = true;
  if (poi.conosci) S.conosciute[poi.conosci] = true;
  if (poi.forzata) S.forzate[S.casa] = true;
}

function condizione(se) {
  if (!se) return true;
  if (se.esame) return !!S.esami[se.esame];
  if (se.prova) return S.prove.includes(se.prova);
  if (se.detta) return !!S.dette[se.detta];
  if (se.contestata) return !!S.contestate[se.contestata];
  return true;
}

// l'esame di una parte adesso: con "se", finche' la condizione non c'e' vale "prima" (Lia, il terzo giorno, si lascia
// guardare collo e ascelle solo dopo che le gemelle sono state smentite)
function esame(persona, parte) {
  const e = D.ESAMI[persona]?.[parte];
  return e?.se && !condizione(e.se) ? e.prima : e;
}

// l'esame com'era quando l'hai fatto (S.esami "prima": si e' rifiutata, prima della condizione)
function esameFatto(persona, parte) {
  const e = D.ESAMI[persona]?.[parte];
  return S.esami[`${persona}_${parte}`] === "prima" ? e.prima : e;
}

// ---------- la scrivania ----------

// il suono della stanza del medico: sotto il fruscio del nastro, di giorno il vento fuori, la sera la notte; e la
// musica della stanza, di giorno e di sera (anche sulla mappa, che si guarda da casa). Nel finale niente musica
function ambienteStanza() {
  suoni.ambiente("nastro", S.fase === "sera" ? "notte" : "vento");
  suoni.musica(R.finale ? null : S.fase === "sera" ? "stanza_sera" : "stanza_giorno");
}

function vaiScrivania() {
  S.schermo = "scrivania";
  S.casa = null;
  S.luogo = null;
  pulisci();
  osdSpento();
  ambienteStanza();
  if (vhs) {
    vhs.mode("giorno", false);
    vhs.setLuce(0);
    vhs.setHeat(null);
    vhs.set({ zoom: 1, cx: 0.5, cy: 0.5, blur: 0, snow: 0 });
    // la scrivania disegnata la sera si scurisce; quella in 3D ha gia' la luce della sera
    vhs.setDark(S.fase === "sera" && !stanza ? 1 : 0);
    vhs.salta();
  }
  if (stanza) {
    // la scrivania in 3D: ci si siede nella stanza e si usano le cose sul piano (stanza.onScrivania)
    stanza.fase(S.fase === "sera" ? "sera" : "mattina");
    stanza.adatta(larghezza3d());
    stanza.giornale(S.giornale || D.GIORNALE);
    stanza.siedi();
    suoni.suona("sedia");
    mostra(stanza.canvas, IMG.scrivania.src);
    vhs.prima = (dt) => { stanza.passo(dt); vhs.refresh(); };
  } else {
    // senza WebGL 2 resta la scrivania disegnata, con le sue zone
    mostra(IMG.scrivania);
    for (const z of D.SCRIVANIA) zoneBox.append(zonaHtml(z, () => azioneScrivania(z.id)));
  }
  tasti(...(stanza ? [tasto(T("Alzati"), () => vaiStanza("scrivania"), "su")] : []));
  aiuto(S.fase === "sera"
    ? T("Sera. Rivedi i nastri al videoregistratore, poi spegni la lampada.")
    : T("Leggi il fax, poi prendi la maschera ed esci."));
  aggiornaHud();
}

// ---------- la stanza del medico in 3D ----------

function vaiStanza(dove = "inizio") {
  if (!stanza) return vaiScrivania();
  S.schermo = "stanza";
  S.casa = null;
  S.luogo = null;
  pulisci();
  osdSpento();
  ambienteStanza();
  if (vhs) {
    vhs.mode("giorno", false);
    vhs.setLuce(0);
    vhs.setHeat(null);
    vhs.setDark(0);
    vhs.set({ zoom: 1, cx: 0.5, cy: 0.5, blur: 0, snow: 0 });
    vhs.salta();
  }
  stanza.fase(S.fase === "sera" ? "sera" : "mattina");
  stanza.adatta(larghezza3d());
  stanza.giornale(S.giornale || D.GIORNALE);
  stanza.entra(dove);
  // si rientra dalla porta di casa (dalla mappa, o la sera al coprifuoco)
  if (dove === "porta") suoni.suona("porta", { volume: 0.7 });
  mostra(stanza.canvas, IMG.scrivania.src);
  vhs.prima = (dt) => { stanza.passo(dt); vhs.refresh(); };
  tasti();
  aiutoStanza();
  aggiornaHud();
}

// il suggerimento della stanza: col mouse si clicca per girare lo sguardo (Esc libera il puntatore), col dito si
// trascina; la sera, cosa resta da fare
function aiutoStanza() {
  const come = tocco() ? T("Trascina per guardarti attorno, tocca dove andare o cosa usare.")
    : stanza.senzaBlocco ? T("Trascina per guardarti attorno, clicca dove andare o cosa usare. Si cammina con WASD.")
      : T("Clicca per guardarti attorno col mouse. WASD per camminare, clic o E per usare. Esc libera il mouse.");
  aiuto(S.fase === "sera" ? T`Sera: i nastri sono nel videoregistratore, poi a letto. ${come}` : come);
}

// quando il mouse si blocca nella stanza: niente icone ne' suggerimento, il mirino al centro e il nome di quello
// che si guarda sotto il mirino; quando si libera, tornano le icone
function bloccoStanza(bloccato) {
  if (bloccato) {
    clearTimeout(comparsaTimer);
    delete schermo.dataset.comparsa;
    const r = schermo.getBoundingClientRect();
    etichetta.style.transform = `translate(${r.width / 2}px, ${r.height / 2 + 14}px)`;
  } else {
    etichetta.hidden = true;
    if (S.schermo === "stanza") mostraComparsa();
  }
}

async function usaStanza(id) {
  if (R.occupato || !foglio.hidden) return;
  if (id === "scrivania") {
    vaiScrivania();
    // all'inizio del gioco, la prima volta, la scrivania apre subito il fax (29 ottobre), appena ci si e' seduti
    if (S.giorno === 1 && !S.faxStampato) {
      setTimeout(() => { if (S.schermo === "scrivania" && foglio.hidden && !R.occupato && !S.faxStampato) apriFax(); }, 800);
    }
    return;
  }
  if (id === "videoregistratore") { R.ritorno = "stanza"; return apriNastri(); }
  if (id === "porta") {
    if (S.fase === "sera") return dici([[null, T("È il coprifuoco. Fino a domattina non si esce.")]], false, false);
    suoni.suona("porta", { volume: 0.7 });
    return vaiMappa();
  }
  if (id === "letto") {
    if (S.fase === "sera") return dormi();
    return dici([[null, T("Non è ancora ora di dormire. La ditta paga a paziente.")]], false, false);
  }
  if (id === "ospite" && S.fase === "sera") return controllaOspite();
  const testi = D.STANZA[id];
  const righe = testi && (testi[S.fase] || testi.sempre);
  if (!righe) return;
  // la porta della stanzetta dell'ospite si socchiude mentre si guarda dentro
  if (id === "ospite") {
    stanza.socchiudi(true);
    suoni.suona("porta", { volume: 0.6 });
  }
  await dici(righe.map((r) => [null, r]), false, false);
  if (id === "ospite") stanza.socchiudi(false);
}

// dai nastri si torna dove li si era presi: il videoregistratore della stanza o la scrivania
function tornaDaiNastri() {
  R.play = null;
  if (R.ritorno === "stanza" && stanza) vaiStanza("nastri");
  else vaiScrivania();
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
  if (id === "taccuino") return apriStato(null);
  if (id === "soldi") return apriSoldi();
  if (id === "nastri") { R.ritorno = "scrivania"; return apriNastri(); }
  if (id === "mappa" || id === "maschera") {
    if (S.fase === "sera") return dici([[null, T("È il coprifuoco. Fino a domattina non si esce.")]], false, false);
    return vaiMappa();
  }
  if (id === "lampada") {
    if (S.fase === "sera") return dormi();
    return dici([[null, T("La lampada. Si spegne quando è ora di dormire.")]], false, false);
  }
}

// ---------- fogli: fax, giornale, soldi, nastri, notte (lo stato di famiglia ha la sua parte) ----------

function apriFoglio(tipo, contenuto) {
  if (stanza) stanza.rilascia();
  R.indietroFoglio = null;
  foglio.hidden = false;
  foglio.dataset.tipo = tipo;
  foglioCorpo.replaceChildren(...contenuto);
  foglioCorpo.scrollTop = 0;
  foglio.querySelector(".chiudi")?.focus();
}

// un foglio bloccato non si chiude, ma puo' dire dove tornare (le impostazioni: al titolo o a giocare)
function chiudiFoglio() {
  if (foglio.dataset.bloccato === "1") return R.indietroFoglio?.();
  foglio.hidden = true;
}

// il fax della ditta: il protocollo del giorno a simboli, da capire in un colpo d'occhio
function apriFax() {
  const f = D.FAX;
  // la prima volta il fax arriva e si stampa, poi e' solo un foglio
  suoni.suona(S.faxStampato ? "carta" : "fax");
  S.faxStampato = true;
  const testa = testaFax(T`PROTOCOLLO · GIORNO ${f.giorno}`);
  const segni = el("div", "fx-segni");
  for (const s of f.segni) segni.append(segnoFax(s.icona, s.nome, s.nota));
  const case_ = el("div", "fx-fila");
  for (const n of f.case) case_.append(segnoFax("casa", T`CASA ${n}`, null, "piccolo"));
  const paga = el("div", "fx-fila");
  paga.append(segnoFax("moneta", `${D.SOLDI.paziente} €`, T("a paziente"), "piccolo"),
    segnoFax("mirino", `+${D.SOLDI.profilo} €`, f.profilo, "piccolo"));
  const riga = el("div", "fx-riga");
  riga.append(bloccoFax(T("DA VISITARE"), case_), bloccoFax(T("PAGA"), paga));
  apriFoglio("fax", [testa, bloccoFax(T("SEGNI DA CERCARE"), segni), riga, el("p", "fx-motto", f.motto)]);
}

// i pezzi del fax: un pittogramma con la sua scritta, un blocco col titolo, la testata della ditta
function segnoFax(pitto, nome, nota, cls = "") {
  const d = el("figure", `fx-segno ${cls}`);
  const ic = el("div", "fx-pitto");
  ic.innerHTML = pittogramma(pitto);
  d.append(ic, el("b", null, nome));
  if (nota) d.append(el("span", null, nota));
  return d;
}

function bloccoFax(titolo, ...figli) {
  const s = el("section", "fx-blocco");
  s.append(el("h3", null, titolo), ...figli);
  return s;
}

function testaFax(giorno) {
  const testa = el("header", "fx-testa");
  const logo = el("div", "fx-logo");
  logo.innerHTML = pittogramma("panacea");
  testa.append(logo, el("b", "fx-ditta", T("PANACEA")), el("span", "fx-giorno", giorno));
  return testa;
}

// il giornale: la carta e' disegnata, il testo e' stampato sopra con la stessa prospettiva della pagina
const U = 400, V0 = -0.72;

// "domani": il giornale del mattino dopo la notte; "speciale" e "dopo": una pagina fatta apposta (l'edizione
// straordinaria di un finale) e il tasto sotto
function apriGiornale(domani, speciale, dopo) {
  const g = speciale || (domani ? [giornaleDomani, giornale3, giornale4][S.giorno - 1](S.notte, S) : S.giornale || D.GIORNALE);
  if (domani && !speciale) S.giornaleDomani = g;
  suoni.suona("giornale");
  const stampa = el("div", "gio-stampa");
  const carta = el("img", "gio-carta");
  carta.src = "img/giornale.jpg";
  carta.alt = T`La Voce, il giornale del paese: ${g.titolo}`;
  const piano = el("div", "gio-piano");
  const blocco = (nome, cls, ...figli) => {
    const [u0, v0, u1, v1] = D.PAGINA.blocchi[nome];
    const b = el("div", `gio-blocco ${cls}`);
    Object.assign(b.style, { left: T`${u0 * U}px`, top: T`${(v0 - V0) * U}px`, width: T`${(u1 - u0) * U}px`,
      height: T`${(v1 - v0) * U}px` });
    b.append(...figli);
    return b;
  };
  const foto = el("img", "gio-foto");
  foto.src = "img/foto_medico.jpg";
  foto.alt = "";
  const lettera = el("p");
  lettera.append(el("b", null, T("LETTERE · ")), document.createTextNode(g.lettera));
  piano.append(
    blocco("data", "gio-data", document.createTextNode(g.data)),
    blocco("titolo", "gio-titolo", el("span", null, g.titolo)),
    blocco("sommario", "gio-sommario", document.createTextNode(g.sommario)),
    blocco("foto", "gio-riquadro", foto),
    blocco("didascalia", "gio-didascalia", document.createTextNode(g.didascalia)),
    blocco("colonna1", "gio-colonna", el("p", null, g.articolo)),
    blocco("colonna2", "gio-colonna", lettera, el("p", null, g.breve), el("p", "gio-pubblicita", g.pubblicita)),
  );
  stampa.append(carta, piano);
  // sugli schermi stretti la pagina e' troppo piccola: sotto c'e' lo stesso testo da leggere
  const leggibile = el("div", "gio-leggibile");
  leggibile.append(el("h2", null, g.titolo), el("p", "gio-l-sommario", g.sommario), el("p", null, g.articolo),
    el("p", null, T`LETTERE · ${g.lettera}`), el("p", null, g.breve));
  const corpo = [stampa, leggibile];
  // dopo la prima notte comincia il secondo giorno, dopo la seconda il terzo; dopo la terza, il finale della demo
  if (dopo) corpo.push(azioni([dopo]));
  else if (domani) corpo.push(azioni([[[T("Il secondo giorno"), iniziaGiorno2], [T("Il terzo giorno"), iniziaGiorno3]][S.giorno - 1]
    || [T("La quarta mattina"), quartaMattina]]));
  apriFoglio("giornale", corpo);
  const proietta = () => {
    const r = stampa.getBoundingClientRect();
    if (!r.width) return;
    const A = [[1 / U, 0, 0], [0, 1 / U, V0], [0, 0, 1]];
    const S2 = [[r.width, 0, 0], [0, r.height, 0], [0, 0, 1]];
    const M = moltiplica(moltiplica(S2, D.PAGINA.Hf), A);
    const k = M[2][2];
    const m = M.map((riga) => riga.map((v) => v / k));
    piano.style.transform = `matrix3d(${m[0][0]},${m[1][0]},0,${m[2][0]},${m[0][1]},${m[1][1]},0,${m[2][1]},0,0,1,0,${m[0][2]},${m[1][2]},0,${m[2][2]})`;
  };
  // il titolo si stringe finche' non entra nella fascia
  const titolo = piano.querySelector(".gio-titolo span");
  const adatta = () => {
    let fs = 68;
    titolo.style.fontSize = `${fs}px`;
    while (fs > 34 && titolo.offsetWidth > D.PAGINA.blocchi.titolo[2] * U * 0.98) {
      fs -= 2;
      titolo.style.fontSize = `${fs}px`;
    }
  };
  requestAnimationFrame(() => { adatta(); proietta(); });
  if (document.fonts) document.fonts.ready.then(() => { adatta(); proietta(); });
  if (window.ResizeObserver) new ResizeObserver(proietta).observe(stampa);
}

function moltiplica(A, B) {
  return A.map((riga, i) => B[0].map((_, j) => riga.reduce((s, _, k) => s + A[i][k] * B[k][j], 0)));
}

function apriSoldi() {
  suoni.suona("monete");
  apriFoglio("soldi", [
    el("h2", null, `${S.soldi} €`),
    el("p", null, T`Ogni notte: stanza ${D.SOLDI.stanza} €, cena ${D.SOLDI.cena} €, ${D.SOLDI.cassetta} € per ogni cassetta usata.`),
    el("p", null, T`La ditta paga ${D.SOLDI.paziente} € a paziente consegnato, ${D.SOLDI.profilo} € in più per il profilo richiesto.`),
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
  ambienteStanza();
  if (vhs) {
    vhs.mode("giorno", false);
    vhs.setLuce(0);
    vhs.setHeat(null);
    vhs.setDark(0);
    vhs.set({ zoom: 1, cx: 0.5, cy: 0.5, blur: 0, snow: 0 });
    vhs.salta();
  }
  R.casaSopra = null;
  R.casaScelta = null;
  schedaCasa.hidden = true;
  disegnaMappa();
  mostra(R.mappa, IMG.mappa.src);
  const spillo = (cls, testo, x, y, nome, azione) => {
    const b = el("button", cls, testo);
    b.type = "button";
    b.dataset.x = x;
    b.dataset.y = y;
    b.setAttribute("aria-label", nome);
    b.addEventListener("click", (e) => { e.stopPropagation(); azione(); });
    zoneBox.append(b);
    return b;
  };
  for (const [id, c] of Object.entries(D.CASE)) {
    const b = spillo("pin", String(c.n), c.x, c.y, T`Casa ${c.n}${c.segnalata ? T(" · segnalata") : ""}`, () => scegli(id));
    b.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") evidenzia(id); });
    if (c.segnalata) b.classList.add("segnalata");
    if (c.croce || S.decisioni[id]?.provvedimento === "chiudi") b.classList.add("croce");
    if (S.visitate[id]) b.classList.add("visitata");
    if (S.notte?.contagiate?.includes(id) || R.contagio?.prese?.includes(id)) b.classList.add("contagiata");
  }
  for (const l of D.LUOGHI_MAPPA) {
    const b = spillo("pin luogo", l.segno, l.x, l.y, l.nome, () => mostraLuogo(l));
    b.addEventListener("pointerenter", () => mostraEtichetta(maiuscolo(l.nome)));
    b.addEventListener("pointerleave", () => { etichetta.hidden = true; });
  }
  posizionaSpilli();
  const visite = Object.keys(S.visitate).length;
  aiuto(T("Tocca la mappa per ingrandire"));
  tasti(tasto(visite ? T("Torna in stanza · finisce la giornata") : stanza ? T("Torna in stanza") : T("Torna alla scrivania"),
    () => (visite ? sera() : stanza ? vaiStanza("porta") : vaiScrivania()), stanza ? "casa" : "indietro"));
  mostraIndicatori("mappa");
  aggiornaHud();
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
  if (!schedaCasa.hidden) {
    if (schedaCasa.dataset.x && !R.casaScelta && !R.casaSopra) posizionaScheda(Number(schedaCasa.dataset.x), Number(schedaCasa.dataset.y));
    else posizionaScheda();
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

// ---------- la scheda della casa: appare passando sopra una casa, piena se la casa e' stata visitata ----------

function casaSotto(x, y) {
  const v = vhs ? vhs.p : { zoom: 1, cx: 0.5, cy: 0.5 };
  const ix = v.cx + (x - 0.5) / v.zoom;
  const iy = v.cy + (y - 0.5) / v.zoom;
  let migliore = null;
  let dmin = 1.35;
  for (const [id, c] of Object.entries(D.CASE)) {
    const d = Math.hypot((ix - c.ex) / c.rx, (iy - c.ey) / c.ry);
    if (d < dmin) { dmin = d; migliore = id; }
  }
  return migliore;
}

function disegnaMappa() {
  if (!R.mctx) return;
  const ctx = R.mctx;
  const w = R.mappa.width, h = R.mappa.height;
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.drawImage(IMG.mappa, 0, 0, w, h);
  if (R.contagio?.diffusione) frecceContagio(ctx, w, h);
  for (const id of new Set([R.casaScelta, R.casaSopra])) {
    if (!id) continue;
    const c = D.CASE[id];
    mirino(ctx, c.ex * w, c.ey * h, c.rx * w * 1.25, c.ry * h * 1.15);
  }
  if (vhs && vhs.source === R.mappa) vhs.refresh();
}

// la casa sotto il puntatore, sulla mappa in 3D: un alone giallo e gli angoli di un mirino, col giallo
// dell'interfaccia (--giallo)
function mirino(ctx, cx, cy, rx, ry) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
  g.addColorStop(0, "rgba(242, 209, 107, 0.3)");
  g.addColorStop(1, "rgba(242, 209, 107, 0)");
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = "#f2d16b";
  ctx.lineWidth = Math.max(3, R.mappa.width / 640);
  ctx.lineCap = "square";
  const l = Math.min(rx, ry) * 0.45;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const x = cx + sx * rx, y = cy + sy * ry;
    ctx.beginPath();
    ctx.moveTo(x - sx * l, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y - sy * l);
    ctx.stroke();
  }
  ctx.restore();
}

function evidenzia(id) {
  if (R.casaSopra === id) return;
  R.casaSopra = id;
  disegnaMappa();
  if (!R.casaScelta) {
    if (id) mostraScheda(id, false);
    else schedaCasa.hidden = true;
  }
}

function scegli(id) {
  R.casaScelta = id;
  R.casaSopra = id;
  disegnaMappa();
  if (id) mostraScheda(id, true);
  else schedaCasa.hidden = true;
}

function timbro(testo, cls) {
  return el("span", `timbro ${cls}`, testo);
}

function mostraScheda(id, fissa) {
  const c = D.CASE[id];
  const card = schedaCasa;
  card.replaceChildren();
  const testa = el("div", "sc-testa");
  testa.append(el("b", null, T`Casa ${c.n}`));
  if (c.segnalata) testa.append(timbro(T("segnalata"), "rosso"));
  if (c.croce || S.decisioni[id]?.provvedimento === "chiudi") testa.append(timbro(T("croce"), "nero"));
  if (S.visitate[id]) testa.append(timbro(T("visitata"), "blu"));
  if (S.notte?.contagiate?.includes(id)) testa.append(timbro(T("contagio"), "rosso"));
  card.append(testa);
  card.append(el("p", "sc-nota", c.segnalata || c.nota));
  card.append(el("p", "sc-titolo", T("Occupanti")));
  if (S.visitate[id]) {
    const dec = S.decisioni[id] || { via: [], provvedimento: "nessuno" };
    for (const [pid, persona] of personeDellaCasa(id)) {
      const riga = el("div", "sc-persona");
      const src = visita ? ritratto(pid) : url(`img/volti/${fotoVolto(pid)}.jpg`);
      const foto = el(src ? "img" : "span", src ? "sc-foto" : "sc-foto ignota", src ? null : "?");
      if (src) {
        foto.src = src;
        foto.alt = persona.nome;
      }
      const testo = el("div", "sc-dati");
      const nome = el("b", null, `${persona.nome[0].toUpperCase()}${persona.nome.slice(1)} `);
      if (S.diagnosi[pid]) nome.append(timbro(D.TIMBRI.find((t) => t.id === S.diagnosi[pid]).testo, S.diagnosi[pid] === "sano" ? "blu" : "rosso"));
      testo.append(nome);
      const visti = Object.keys(D.ESAMI[pid] || {}).filter((parte) => S.esami[`${pid}_${parte}`]);
      const reperti = visti.map((parte) => `${parte}: ${esameFatto(pid, parte).reperto}`);
      testo.append(el("span", null, reperti.length ? reperti.join(" · ") : T("non esaminato")));
      testo.append(el("em", dec.via.includes(pid) ? "via" : dec.ospite === pid ? "ospite" : "",
        dec.via.includes(pid) ? T("al lazzaretto") : dec.ospite === pid ? T("ospite stanotte") : T("resta in casa")));
      riga.append(foto, testo);
      card.append(riga);
    }
    for (const n of D.NASCOSTI[id] || []) {
      if (S.prove.some((p) => D.PROVE[p].casa === id && /calore|tosse/.test(p))
        || ["ragazzo_dorme", "lasciatelo", "polmoni"].some((d) => S.dette[d])) {
        const riga = el("div", "sc-persona");
        riga.append(el("span", "sc-foto ignota", "?"));
        const testo = el("div", "sc-dati");
        testo.append(el("b", null, T("Qualcuno dietro la porta")), el("span", null, T("non visto")));
        riga.append(testo);
        card.append(riga);
      }
    }
    const prove = S.prove.filter((p) => D.PROVE[p].casa === id);
    if (prove.length) {
      card.append(el("p", "sc-titolo", T("Prove")));
      const ul = el("ul", "sc-prove");
      for (const p of prove) ul.append(el("li", null, D.PROVE[p].testo));
      card.append(ul);
    }
    const prov = { nessuno: T("nessuno"), chiudi: T("croce sulla porta"), domani: T("tornare domani") }[dec.provvedimento];
    card.append(el("p", "sc-nota", T`Provvedimento: ${prov}.`));
  } else {
    const vuoti = el("div", "sc-vuoti");
    for (let i = 0; i < 3; i++) vuoti.append(el("span", "sc-foto ignota", "?"));
    card.append(vuoti, el("p", "sc-nota", c.croce ? T("Chiusa: nessuno entra o esce.") : T("Non ancora visitata.")));
  }
  if (fissa) {
    const azioni = el("div", "sc-azioni");
    if (c.segnalata && !S.visitate[id] && S.fase !== "sera" && S.schermo === "mappa") {
      if (S.ora + D.MINUTI.viaggio >= D.INIZIO.coprifuoco) azioni.append(el("span", null, T("Non fai in tempo prima del coprifuoco.")));
      else azioni.append(bottone(T`Vai · ${D.MINUTI.viaggio} min`, () => vai(id), "sc-vai"));
    } else if (!c.segnalata && !c.croce && S.schermo === "mappa") {
      azioni.append(el("span", null, T("La ditta paga solo le case segnalate.")));
    }
    azioni.append(bottone(T("Chiudi"), () => scegli(null), "sc-chiudi"));
    card.append(azioni);
  }
  card.hidden = false;
  // troppo lunga per lo schermo: si allarga un passo alla volta, invece di far comparire la barra
  delete card.dataset.lunga;
  for (const passo of ["1", "2", "3"]) {
    if (card.scrollHeight <= card.clientHeight) break;
    card.dataset.lunga = passo;
  }
  posizionaScheda();
}

function mostraLuogo(l) {
  R.casaScelta = null;
  disegnaMappa();
  const card = schedaCasa;
  delete card.dataset.lunga;
  card.replaceChildren(el("div", "sc-testa", l.nome), el("p", "sc-nota", l.nota));
  const azioni = el("div", "sc-azioni");
  azioni.append(bottone(T("Chiudi"), () => { card.hidden = true; }, "sc-chiudi"));
  card.append(azioni);
  card.dataset.x = l.x;
  card.dataset.y = l.y;
  card.hidden = false;
  posizionaScheda(l.x, l.y);
}

// la scheda sta accanto alla casa, dal lato dove c'e' piu' spazio
function posizionaScheda(px, py) {
  const id = R.casaScelta || R.casaSopra;
  const c = id ? D.CASE[id] : null;
  const x = px ?? c?.ex;
  const y = py ?? c?.ey;
  if (x == null) return;
  const v = vhs ? vhs.p : { zoom: 1, cx: 0.5, cy: 0.5 };
  const sx = (x - v.cx) * v.zoom + 0.5;
  const sy = (y - v.cy) * v.zoom + 0.5;
  const card = schedaCasa;
  const r = schermo.getBoundingClientRect();
  const w = card.offsetWidth / r.width;
  const h = card.offsetHeight / r.height;
  let left = sx < 0.55 ? sx + 0.04 : sx - 0.04 - w;
  left = clamp(left, 0.01, 0.99 - w);
  const top = clamp(sy - h / 2, 0.02, 0.98 - h);
  card.style.left = `${left * 100}%`;
  card.style.top = `${top * 100}%`;
}

async function vai(id) {
  avanza(D.MINUTI.viaggio);
  await entraCasa(id);
}

// ---------- la visita ----------

async function entraCasa(id) {
  const c = D.CASE[id];
  S.casa = id;
  S.nastri.push({ casa: id, titolo: T`NASTRO ${S.nastri.length + 1} · CASA ${c.n}`, inizio: S.ora, fine: null, riprese: [] });
  suoni.suona("rec");
  await vaiLuogo(c.luogo);
}

async function vaiLuogo(luogo) {
  if (visitaPronta && !visita) await aspettaVisite();
  S.schermo = "visita";
  S.luogo = luogo;
  const L = D.LUOGHI[luogo];
  pulisci();
  R.primo = null;
  // il suono del posto: di base quello col suo nome; "ambiente" per un altro (null: solo il nastro); e la musica
  // delle visite
  suoni.ambiente(...["nastro", L.ambiente === undefined ? luogo : L.ambiente].filter(Boolean));
  suoni.musica("visita");
  facceDellaStanza();
  if (visita) {
    // la stanza 3D: il buio e l'infrarosso li fa il 3D, la videocamera passa l'immagine pulita
    if (vhs) {
      vhs.mode("giorno", false);
      vhs.setLuce(0);
      vhs.setHeat(null);
      vhs.setDark(0);
      vhs.set({ zoom: 1, cx: 0.5, cy: 0.5, blur: 0, snow: 0 });
      vhs.salta();
    }
    await apriVisita(luogo, Object.fromEntries(Object.entries(R.facce).map(([p, f]) => [p, f.a])));
    // la videocamera tiene la foto di chi c'e' (per il nastro delle frasi e lo stato di famiglia)
    for (const p of L.persone) ritratto(p, R.facce[p]?.a ?? null);
  } else {
    if (vhs) {
      vhs.mode(L.notte ? "notte" : "giorno");
      vhs.setLuce(L.notte ? 0 : 1);
      vhs.tono = tonoCasa(L.casa);
      vhs.setHeat(null);
      vhs.setDark(0);
      vhs.set({ zoom: 1, cx: 0.5, cy: 0.5, blur: 0, snow: 0 });
      vhs.salta();
    }
    disegnaScena();
    mostra(R.scena, IMG[luogo].src);
  }
  osdRec();
  osd.modo.textContent = L.notte ? T("NOTTE") : "";
  S.pazienza[S.casa] ??= D.PAZIENZA;
  mostraIndicatori("visita");
  hudVisita();
  aggiornaNastro();
  nuovaRipresa({ tipo: "scena", luogo });
  if (!S.visti[luogo]) {
    S.visti[luogo] = true;
    // chi si conosce entrando (la madre nascosta in camera), chi si trova cambiato e le porte gia' aperte (la camera
    // della nuora, il terzo giorno, se la suocera non c'e' piu' a tenerla chiusa)
    for (const p of L.conosci || []) S.conosciute[p] = true;
    for (const p of L.morti || []) S.morti[p] = true;
    for (const z of L.aperte || []) S.sbloccate[z] = true;
    await dici(D.ARRIVO[luogo]);
  }
}

// la stanza 3D del luogo coi pupazzi di oggi: Three.js la ridisegna a ogni fotogramma e la videocamera la riprende; i
// punti del luogo (le parti del corpo, dove si scrivono le frasi, le zone, i calori nascosti) seguono la scena 3D.
// modo: "giorno", "notte" (la visione notturna delle stanze buie) o "ir" (i nastri della sera)
async function apriVisita(luogo, volti, modo) {
  const L = D.LUOGHI[luogo];
  visita.dimensione(schermo.clientWidth * Math.min(2, window.devicePixelRatio || 1));
  await visita.apri(luogo, { persone: L.persone, come: (p) => D.PERSONE[p], giorno: S.giorno || 1, volti, notte: !!L.notte,
    nascosti: (L.nascosti || []).map((n) => n.prova) });
  visita.imposta(modo || (L.notte ? "notte" : "giorno"));
  visita.aggiornaLuogo(L);
  mostra(visita.canvas);
  if (vhs) vhs.prima = (dt) => { visita.aggiorna(dt); visita.aggiornaLuogo(L); vhs.refresh(); };
}

// la prima volta che si entra in una casa le visite 3D potrebbero essere ancora in viaggio: le tacche del caricamento
async function aspettaVisite() {
  caricamento.hidden = false;
  caricamento.querySelector(".ind-ic").innerHTML = icona("clessidra");
  const t = setInterval(() => riempiCaricamento(R.caricoVisite || 0), 150);
  try {
    await visitaPronta;
  } finally {
    clearInterval(t);
    caricamento.hidden = true;
  }
}

function hudVisita() {
  const L = D.LUOGHI[S.luogo];
  // "ritornoNome": da sotto si torna di sopra (la cantina della casa 5, la cripta della casa 7)
  tasti(...(L.ritorno ? [tasto(L.ritornoNome || T("Torna in cucina"), () => tornaCucina(), "indietro")] : []),
    tasto(T("Stato di famiglia"), () => apriStato(S.casa), "foglio"),
    tasto(T("Concludi la visita"), () => apriStato(S.casa, { firma: true }), "firma", true));
}

async function tornaCucina() {
  if (R.occupato) return;
  avanza(D.MINUTI.porta);
  suoni.suona("porta", { volume: 0.6 });
  await vaiLuogo(D.LUOGHI[S.luogo].ritorno);
}

function colpisci(x, y) {
  const L = D.LUOGHI[S.luogo];
  // la parte del corpo piu' vicina al puntatore (le zone si toccano: la bocca e il collo, nella stanza 3D)
  let migliore = null, dist = 1;
  for (const p of L.persone)
    for (const [parte, ellissi] of Object.entries(L.parti[p] || {}))
      for (const [cx, cy, rx, ry] of ellissi) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d <= dist) { dist = d; migliore = { persona: p, parte }; }
      }
  if (migliore) return migliore;
  if (visita) {
    // nella stanza 3D: il raggio dalla videocamera
    const c = visita.colpisci(x, y);
    if (!c) return null;
    if (c.persona) return L.persone.includes(c.persona) ? { persona: c.persona } : null;
    const z = L.zone.find((q) => q.id === c.zona);
    return z ? { zona: z } : null;
  }
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
  return c.parte ? `${nome} · ${maiuscolo(D.PARTI[c.parte])}` : T`${nome} · PARLA`;
}

// il bersaglio di una contestazione: "parte:padre.collo", "persona:padre", "zona:tavola"
function bersaglioDi(c) {
  if (!c) return null;
  if (c.parte) return `parte:${c.persona}.${c.parte}`;
  if (c.persona) return `persona:${c.persona}`;
  return `zona:${c.zona.id}`;
}

async function cliccaVisita(x, y) {
  if (ruota.aperta()) { ruota.chiudi(); return; }
  if (R.scelta) {
    // una frase del nastro scelta col tocco: il tocco dopo dice contro cosa usarla
    const f = R.scelta;
    const b = R.primo ? `parte:${R.primo.persona}.${R.primo.parte}` : bersaglioDi(colpisci(x, y));
    scegliFrase(null);
    if (b) return contesta(f, b, x, y);
    return;
  }
  if (R.primo) return chiudiPrimo();
  const c = colpisci(x, y);
  if (!c) return;
  if (c.parte) return esamina(c.persona, c.parte);
  if (c.persona) return apriDomande(c.persona, x, y);
  if (c.zona.tipo === "porta") return menuPorta(c.zona, x, y);
  guardaZona(c.zona);
}

async function guardaZona(zona) {
  avanza(D.MINUTI.indizio);
  await dici(zona.dice);
  applica(zona.poi);
  dopoAzione();
}

async function esamina(persona, parte) {
  ruota.chiudi();
  const e = esame(persona, parte);
  avanza(D.MINUTI.esame);
  if (e.rifiuta) {
    // un rifiuto che puo' cambiare (Lia) resta "prima": dopo, l'esame si puo' rifare
    S.esami[`${persona}_${parte}`] = e === D.ESAMI[persona][parte] ? true : "prima";
    await dici(e.rifiuta);
    return dopoAzione();
  }
  R.occupato = true;
  R.hover = null;
  etichetta.hidden = true;
  const [cx, cy] = D.LUOGHI[S.luogo].parti[persona][parte][0];
  suoni.suona("zoom");
  if (visita) {
    // la videocamera stringe sulla parte, e la persona la mostra (le mani in avanti, il braccio alzato, la testa piegata)
    disegnaScena();
    await visita.esamina(persona, parte);
    FOTO[`parte:${S.giorno}:${persona}:${parte}`] ??= visita.scatta()?.toDataURL("image/jpeg", 0.86);
    if (vhs) vhs.hunt();
  } else {
    const z = 3.2;
    const img = primoPiano(persona, parte);
    if (vhs) await vhs.tween({ zoom: z, cx: clamp(cx, 0.5 / z, 1 - 0.5 / z), cy: clamp(cy, 0.5 / z, 1 - 0.5 / z), blur: 0.7 }, 550);
    const im = await img;
    mostra(im);
    if (vhs) {
      vhs.set({ zoom: 1, cx: 0.5, cy: 0.5 });
      // nel primo piano la videocamera passa al rosso scuro dell'esame
      vhs.setEsame(1);
      vhs.burst(0.3);
      vhs.hunt();
    }
  }
  R.primo = { persona, parte, cx, cy };
  S.esami[`${persona}_${parte}`] = true;
  didascalia.textContent = `${maiuscolo(D.PARTI[parte])} · ${maiuscolo(D.PERSONE[persona].nome)}`;
  didascalia.hidden = false;
  tasti(tasto(T("Torna alla stanza"), chiudiPrimo, "indietro", true));
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
  suoni.suona("zoom", { volume: 0.7 });
  if (visita) await visita.torna();
  else {
    disegnaScena();
    mostra(R.scena, IMG[S.luogo].src);
    if (vhs) {
      vhs.setEsame(0);
      const z = 2.6;
      vhs.set({ zoom: z, cx: clamp(cx, 0.5 / z, 1 - 0.5 / z), cy: clamp(cy, 0.5 / z, 1 - 0.5 / z), blur: 0.6 });
      await vhs.tween({ zoom: 1, cx: 0.5, cy: 0.5, blur: 0 }, 420);
    }
  }
  nuovaRipresa({ tipo: "scena", luogo: S.luogo });
  hudVisita();
  R.occupato = false;
  dopoAzione();
}

// dopo ogni azione: se la famiglia ha perso la pazienza ti cacciano; se e' arrivato il coprifuoco, la visita finisce
async function dopoAzione() {
  if (S.schermo !== "visita") return false;
  if (pazienza() <= 0 && !S.cacciato[S.casa]) {
    S.cacciato[S.casa] = true;
    await dici(D.CACCIATA[S.casa]);
    apriStato(S.casa, { firma: true, obbligato: true });
    return true;
  }
  if (S.ora < D.INIZIO.coprifuoco) return false;
  await dici([[null, T("Sono le otto: coprifuoco. Devi andare.")]]);
  apriStato(S.casa, { firma: true, obbligato: true });
  return true;
}

// dove aprire la raggiera di una persona quando ci si arriva da una parola chiave: sul petto
function petto(persona) {
  const [cx, cy] = D.LUOGHI[S.luogo].parti[persona].collo[0];
  return [cx, Math.min(0.72, cy + 0.12)];
}

// le domande a raggiera attorno al punto toccato; in giallo quelle nuove, sbloccate da un esame o da una frase
function apriDomande(persona, x, y) {
  if (R.occupato) return;
  etichetta.hidden = true;
  const lista = (D.DOMANDE[persona] || []).filter((q) => !S.fatte[`${persona}_${q.id}`] && condizione(q.se));
  const voci = lista.map((q) => ({ testo: q.breve, nuova: !!q.se, icona: icona("domanda"), azione: () => chiedi(persona, q, x, y) }));
  // chi e' diventato un mostro non risponde piu' (la madre, il secondo giorno); "muto": cosa fa invece (il terzo
  // giorno ognuno cambia a modo suo: il padre scricchiola, la moglie del sacrestano canta a bocca chiusa)
  const P = D.PERSONE[persona];
  if (!voci.length) voci.push({ testo: P.muto || (P.stato === "mostro" ? T("ringhia, non risponde più") : T("nient'altro da chiedere")), disattiva: true });
  ruota.apri(x, y, voci, maiuscolo(T(D.PERSONE[persona].voce)), 0.8);
}

async function chiedi(persona, q, x, y) {
  S.fatte[`${persona}_${q.id}`] = true;
  avanza(D.MINUTI.domanda);
  await dici([["TU", q.testo], ...q.dice]);
  applica(q.poi);
  if (await dopoAzione()) return;
  // la raggiera si riapre dov'era, per la domanda dopo
  if (S.schermo === "visita" && !R.primo && D.DOMANDE[persona].some((d) => !S.fatte[`${persona}_${d.id}`] && condizione(d.se)))
    apriDomande(persona, x, y);
}

// ---------- contestare: una frase del nastro contro qualcosa o qualcuno ----------

function trovaContestazione(a, b) {
  return D.CONTESTAZIONI.find((c) => condizione(c.se) && c.coppie.some(([X, Y]) =>
    (X.includes(a) && Y.includes(b)) || (X.includes(b) && Y.includes(a))));
}

function personaDi(bersaglio) {
  if (bersaglio.startsWith("persona:")) return bersaglio.slice(8);
  if (bersaglio.startsWith("parte:")) return bersaglio.slice(6).split(".")[0];
  return null;
}

// dove sta il bersaglio sullo schermo, per il filo rosso e il timbro
function centroDi(bersaglio) {
  if (bersaglio.startsWith("d:") || bersaglio.startsWith("p:")) {
    const d = nastroFrasi.querySelector(`.fot[data-id="${bersaglio}"]`);
    if (!d) return [0.5, 0.85];
    const r = schermo.getBoundingClientRect(), q = d.getBoundingClientRect();
    return [(q.left + q.width / 2 - r.left) / r.width, (q.top - r.top) / r.height];
  }
  const f = formeDi(bersaglio);
  return f ? f.centro : [0.5, 0.45];
}

function timbra(testo, x, y, cls = "") {
  const t = el("div", `timbro-schermo ${cls}`, testo);
  t.style.left = `${clamp(x, 0.14, 0.86) * 100}%`;
  t.style.top = `${clamp(y - 0.07, 0.1, 0.58) * 100}%`;
  schermo.append(t);
  setTimeout(() => t.remove(), 2800);
}

async function contesta(f, bersaglio, x, y) {
  if (R.occupato || !bersaglio || bersaglio === f.id) return;
  ruota.chiudi();
  const c = trovaContestazione(f.id, bersaglio);
  if (c && S.contestate[c.id]) { notifica(T("L'hai già fatto notare")); return; }
  const da = centroDi(f.id);
  const [tx, ty] = x == null ? centroDi(bersaglio) : [x, y];
  segni.filo("contesta", da[0], da[1], tx, ty, "rosso fermo");
  if (c) {
    S.contestate[c.id] = true;
    avanza(D.MINUTI.prova);
    timbra(c.timbro || T("CONTRADDIZIONE"), tx, ty, c.timbro ? "combacia" : "");
    suoni.suona("contraddizione");
    if (vhs && !R.primo) vhs.burst(0.3);
    await dici(c.dice);
    applica(c.poi);
  } else {
    // niente che non torni: chi la vede reagisce a modo suo, e il tempo passa lo stesso
    avanza(D.MINUTI.sbaglio);
    const persona = personaDi(bersaglio);
    const k = f.id.slice(2);
    const testo = f.id.startsWith("d:") ? D.DICHIARAZIONI[k].testo : D.PROVE[k].breve;
    const r = persona ? (D.REAZIONI[persona][k] || D.REAZIONI[persona]._) : [[null, T("Le due cose stanno insieme. Niente da contestare.")]];
    if (persona) arrabbia();
    await dici(persona ? [["TU", testo], ...r] : r);
  }
  segni.togli("contesta");
  dopoAzione();
}

// toccare una frase del nastro la sceglie (o la lascia): il tocco dopo dice contro cosa usarla
function scegliFrase(f) {
  R.scelta = f && R.scelta?.id !== f.id ? f : null;
  for (const d of nastroFrasi.querySelectorAll(".fot")) d.classList.toggle("scelta", !!R.scelta && d.dataset.id === R.scelta.id);
  if (R.scelta) {
    // il suggerimento sopra la frase scelta (col tocco non c'e' un puntatore da seguire)
    const d = nastroFrasi.querySelector(`.fot[data-id="${f.id}"]`);
    if (d) {
      const r = schermo.getBoundingClientRect(), q = d.getBoundingClientRect();
      etichetta.style.transform = `translate(${q.left - r.left}px, ${q.top - r.top - q.height * 0.9}px)`;
    }
    mostraEtichetta(T("TOCCA CHI O COSA LA SMENTISCE"));
  } else etichetta.hidden = true;
}

// cosa c'e' sotto una frase trascinata: un'altra frase del nastro, o qualcosa nella scena
function bersaglioSotto(f, x, y, sotto) {
  const fot = sotto?.closest?.(".fot");
  if (fot) return fot.dataset.id && fot.dataset.id !== f.id ? fot.dataset.id : null;
  if (!sotto || !sotto.closest("#schermo") || sotto.closest("#nastro-frasi, #comandi")) return null;
  return R.primo ? `parte:${R.primo.persona}.${R.primo.parte}` : bersaglioDi(colpisci(x, y));
}

// mentre si trascina una frase: cosa c'e' sotto, da illuminare
function sopraFrase(f, x, y, sotto) {
  const b = f ? bersaglioSotto(f, x, y, sotto) : null;
  if (b === R.bersaglio) return;
  R.bersaglio = b;
  for (const d of nastroFrasi.querySelectorAll(".fot.bersaglio")) d.classList.remove("bersaglio");
  segni.togli("bersaglio");
  const prima = R.hover;
  R.hover = null;
  if (b && (b.startsWith("d:") || b.startsWith("p:"))) {
    nastroFrasi.querySelector(`.fot[data-id="${b}"]`)?.classList.add("bersaglio");
    mostraEtichetta(T("CONFRONTA"));
  } else if (b) {
    const forme = formeDi(b);
    if (forme?.ellissi) segni.ellissi("bersaglio", forme.ellissi, "rosso");
    if (forme?.persona) R.hover = { persona: forme.persona };
    mostraEtichetta(T`CONTESTA · ${testoBersaglio(b)}`);
  } else etichetta.hidden = true;
  if (S.schermo === "visita" && !R.primo && (prima || R.hover)) disegnaScena();
}

function testoBersaglio(b) {
  const [tipo, resto] = b.split(":");
  if (tipo === "zona") return maiuscolo(D.LUOGHI[S.luogo].zone.find((z) => z.id === resto)?.nome || "");
  const [persona, parte] = resto.split(".");
  const nome = maiuscolo(D.PERSONE[persona].nome);
  return parte ? `${nome} · ${maiuscolo(D.PARTI[parte])}` : nome;
}

// ---------- le parole chiave: dove portano ----------

// le forme da illuminare per un collegamento, in frazioni dello schermo; null se non e' in questa stanza
function formeDi(link) {
  const L = D.LUOGHI[S.luogo];
  if (!L || R.primo || S.schermo !== "visita") return null;
  const [tipo, resto] = link.split(":");
  if (tipo === "zona") {
    const z = L.zone.find((q) => q.id === resto);
    if (!z) return null;
    const [x0, y0, x1, y1] = z.box;
    const ellissi = z.segni || [[(x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2]];
    const xs = ellissi.map((e) => e[0]), ys = ellissi.map((e) => e[1]);
    return { ellissi, centro: [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2] };
  }
  const [persona, parte] = resto.split(".");
  if (!L.persone.includes(persona)) return null;
  if (tipo === "parte") {
    const ellissi = L.parti[persona][parte].map(([cx, cy, rx, ry]) => [cx, cy, rx * 1.6 + 0.008, ry * 1.6 + 0.012]);
    return { ellissi, centro: [ellissi[0][0], ellissi[0][1]] };
  }
  return { persona, centro: petto(persona) };
}

function sopraChiave(link, span) {
  segni.togli("chiave");
  segni.togli("chiave-filo");
  const prima = R.hover;
  R.hover = null;
  const forme = link && formeDi(link);
  if (forme) {
    if (forme.ellissi) segni.ellissi("chiave", forme.ellissi, "giallo");
    if (forme.persona) R.hover = { persona: forme.persona };
    // il filo puntinato dalla parola alla cosa
    const r = schermo.getBoundingClientRect(), q = span.getBoundingClientRect();
    segni.filo("chiave-filo", (q.left + q.width / 2 - r.left) / r.width, (q.bottom - r.top) / r.height + 0.004,
      forme.centro[0], forme.centro[1], "giallo");
  }
  if (S.schermo === "visita" && !R.primo && (prima || R.hover)) disegnaScena();
}

function seguiChiave(link) {
  if (R.occupato || S.schermo !== "visita") return;
  const forme = formeDi(link);
  if (!forme) { notifica(T("Non è qui")); return; }
  sopraChiave(null);
  const [tipo, resto] = link.split(":");
  if (tipo === "parte") return esamina(...resto.split("."));
  if (tipo === "persona") return apriDomande(resto, ...petto(resto));
  const z = D.LUOGHI[S.luogo].zone.find((q) => q.id === resto);
  if (z.tipo === "porta") return menuPorta(z, ...forme.centro);
  return guardaZona(z);
}

function menuPorta(zona, x, y) {
  if (R.occupato) return;
  etichetta.hidden = true;
  const P = D.PORTE[zona.id];
  const voci = [];
  if (P.entra && S.sbloccate[zona.id]) {
    voci.push({ testo: P.entra.testo, nuova: true, icona: icona("porta"), azione: async () => {
      avanza(D.MINUTI.porta);
      await vaiLuogo(P.entra.vai);
    } });
  } else {
    // "se": una scelta che compare solo dopo una prova (la botola, dopo aver visto il ripostiglio vuoto)
    for (const s of P.scelte.filter((x) => condizione(x.se)))
      voci.push({ testo: s.minuti > 5 ? T`${s.testo} · −${s.minuti} min` : s.testo, disattiva: !!(s.soldi && s.soldi > S.soldi),
        icona: icona(s.soldi ? "moneta" : "porta"), azione: () => sceltaPorta(s) });
  }
  ruota.apri(x, y, voci, maiuscolo(zona.nome), 0.8);
}

async function sceltaPorta(s) {
  avanza(s.minuti);
  await dici(s.dice);
  applica(s.poi);
  if (await dopoAzione()) return;
  if (s.poi?.vai) {
    suoni.suona("porta");
    await vaiLuogo(s.poi.vai);
  }
}

// ---------- lo stato di famiglia: il certificato del comune, al posto del taccuino e del modulo ----------

// chi della casa si e' visto (la madre solo se si e' entrati in camera)
function vista(persona) {
  const p = D.PERSONE[persona];
  return !!(p && S.visti[p.luogo] && (!D.LUOGHI[p.luogo].ritorno || S.conosciute[persona]));
}

function personeDellaCasa(casa) {
  return Object.entries(D.PERSONE).filter(([id, p]) => p.casa === casa && vista(id));
}

function maiuscolaIniziale(t) {
  return `${t[0].toUpperCase()}${t.slice(1)}`;
}

const NUMERI = [T("ZERO"), T("UNO"), T("DUE"), T("TRE"), T("QUATTRO"), T("CINQUE"), T("SEI")];

// una frase o una prova del nastro lasciata sul nome di una persona: se c'entra diventa una nota a penna.
// Risponde "nuova", "gia" (gia' annotata) o "no" (non c'entra)
function annota(fid, persona) {
  const a = D.ANNOTA[fid]?.[persona];
  if (!a) return "no";
  const n = typeof a === "string" ? { testo: a } : a;
  const lista = S.note[persona] || (S.note[persona] = []);
  if (lista.some((x) => x.id === fid)) return "gia";
  const barra = [].concat(n.barra || []);
  if (barra.includes("anagrafe")) S.barrati[persona] = true;
  for (const x of lista) if (barra.includes(x.id)) x.barrata = true;
  // se una nota arrivata prima smentisce questa, nasce gia' barrata
  const smentita = lista.some((x) => {
    const b = D.ANNOTA[x.id]?.[persona];
    return typeof b === "object" && [].concat(b.barra || []).includes(fid);
  });
  lista.push({ id: fid, testo: n.testo, barrata: smentita, nuova: true });
  if (n.morto) S.morti[persona] = true;
  return "nuova";
}

function sagoma(persona) {
  // il corpo con i cinque punti dell'esame: rosso un segno del protocollo, nero le dita nere, grigio niente,
  // vuoto non esaminato
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 80 130");
  svg.setAttribute("class", "sf-corpo");
  const esaminabile = !!D.ESAMI[persona];
  const g = document.createElementNS(ns, "path");
  g.setAttribute("d", "M40 28 L40 34 M22 37 Q40 31 58 37 L54 80 L26 80 Z M22 39 L10 72 L8 82 M58 39 L70 72 L72 82 M31 80 L29 124 M49 80 L51 124");
  g.setAttribute("class", esaminabile ? "sf-linea" : "sf-linea vuota");
  const testa = document.createElementNS(ns, "circle");
  Object.entries({ cx: 40, cy: 16, r: 12, class: esaminabile ? "sf-linea" : "sf-linea vuota" }).forEach(([k, v]) => testa.setAttribute(k, v));
  svg.append(g, testa);
  if (!esaminabile) return svg;
  const punti = { occhi: [[40, 14]], bocca: [[40, 22]], collo: [[40, 31]], ascelle: [[24, 44], [56, 44]], mani: [[8, 85], [72, 85]] };
  for (const [parte, xy] of Object.entries(punti)) {
    const e = esameFatto(persona, parte);
    const fatto = S.esami[`${persona}_${parte}`];
    const cls = !fatto ? "non" : e.rifiuta ? "rifiuto" : e.segno === "dita" ? "dita" : e.segno ? "segno" : "niente";
    for (const [cx, cy] of xy) {
      const c = document.createElementNS(ns, "circle");
      Object.entries({ cx, cy, r: cls === "segno" || cls === "dita" ? 4.6 : 3.6, class: `sf-punto ${cls}` }).forEach(([k, v]) => c.setAttribute(k, v));
      const t = document.createElementNS(ns, "title");
      t.textContent = `${D.PARTI[parte]}: ${!fatto ? T("non esaminato") : e.reperto}`;
      c.append(t);
      svg.append(c);
    }
  }
  return svg;
}

function timbroDiagnosi(id, nuovo) {
  const t = D.TIMBRI.find((x) => x.id === id);
  const s = el("span", `sf-timbro ${id}${nuovo ? " nuovo" : ""}`, t.testo);
  s.style.rotate = `${-4 - (id.length % 4) * 1.5}deg`;
  return s;
}

function rigaStato(casa, r, firmata) {
  const persona = r.persona;
  const P = D.PERSONE[persona];
  const riga = el("div", "sf-riga");
  riga.dataset.persona = persona;
  // la foto arriva da sola dalla videocamera, quando la persona si e' vista
  const foto = el("div", "sf-foto");
  const v = S.volti[persona];
  const src = !vista(persona) ? null : visita ? ritratto(persona, v) || ritratto(persona)
    : url(`img/volti/${fotoVolto(persona)}${v && ESPRESSIONI[P.luogo]?.[persona]?.volti.includes(v) ? `_${v}` : ""}.jpg`);
  if (src) {
    const im = el("img");
    im.src = src;
    im.alt = P.nome;
    foto.append(el("span", "sf-graffetta"), im);
    // chi e' diventato un mostro: il timbro rosso sopra la foto
    if (S.morti[persona]) foto.append(el("span", "sf-timbro-mostro", T("MOSTRO")));
  } else {
    foto.classList.add("vuota");
    // chi e' diventato un mostro: al posto della foto il timbro rosso
    foto.textContent = S.morti[persona] ? T("MOSTRO") : "?";
    if (S.morti[persona]) foto.classList.add("mostro");
  }
  const dati = el("div", "sf-dati");
  const nome = el("b", S.morti[persona] ? "barrato" : "", r.nome);
  const info = el("small", null, T`${r.ruolo} · ${r.donna ? T("nata") : T("nato")} nel ${r.nato}${r.mestiere ? ` · ${r.mestiere}` : ""}`.toUpperCase());
  dati.append(nome, info);
  if (r.anagrafe) dati.append(el("small", `sf-anagrafe${S.barrati[persona] ? " barrato" : ""}`, r.anagrafe.toUpperCase()));
  // i segni particolari del comune: le gemelle si distinguono solo dal neo
  if (r.segni) dati.append(el("small", "sf-segni", T`SEGNI PARTICOLARI: ${r.segni.toUpperCase()}`));
  // il secondo giorno: chi ieri e' andato al lazzaretto ha il timbro della ditta
  if (r.ditta) dati.append(el("small", "sf-ditta-nota", r.ditta));
  const note = el("ul", "sf-note");
  for (const n of S.note[persona] || []) {
    const li = el("li", `penna${n.barrata ? " barrata" : ""}${n.nuova ? " nuova" : ""}`, n.testo);
    n.nuova = false;
    note.append(li);
  }
  dati.append(note);
  const esito = el("div", "sf-esito");
  if (S.diagnosi[persona]) esito.append(timbroDiagnosi(S.diagnosi[persona], R.sfNuovoTimbro === persona));
  else esito.append(el("span", "sf-vuoto-timbro", T("diagnosi")));
  // la diagnosi dei giorni prima, a matita
  const ieri = S.giorni[S.giorni.length - 1]?.diagnosi[persona];
  if (ieri) esito.append(el("small", "sf-ieri", T`ieri: ${D.TIMBRI.find((t) => t.id === ieri).testo}`));
  if (P?.profilo) esito.append(el("span", "sf-ditta", T`★ PROFILO RICHIESTO · +${D.SOLDI.profilo} €`));
  // le decisioni, ben visibili: al lazzaretto, o ospite stanotte (solo un sano, uno per notte; mai tutte e due)
  const decidi = el("div", "sf-decidi");
  if (P && vista(persona) && !S.morti[persona]) {
    const dec = firmata ? S.decisioni[casa] : null;
    const via = dec ? dec.via.includes(persona) : !!S.lazzaretto[persona];
    const ospite = dec ? dec.ospite === persona : S.ospite === persona;
    const sano = S.diagnosi[persona] === "sano";
    // un altro ospite gia' deciso, in una casa gia' firmata: stanotte il posto e' preso
    const preso = S.ospite && S.ospite !== persona && S.decisioni[D.PERSONE[S.ospite].casa];
    decidi.append(
      sceltaStato("lazzaretto", T("Al lazzaretto"), `+${D.SOLDI.paziente} €`, via, !!firmata, () => {
        S.lazzaretto[persona] = !S.lazzaretto[persona];
        if (S.lazzaretto[persona] && S.ospite === persona) S.ospite = null;
        ridisegnaStato(casa);
      }),
      // "ospite" della persona: perche' non puo' venire (il marito della casa 2 non si regge in piedi); chi non ha la
      // sua notte in D.OSPITE (un mostro timbrato sano per sbaglio) non viene
      sceltaStato("ospite", T("Ospite stanotte"), ospite ? T("dorme da te") : P.ospite || (!D.OSPITE[persona] ? T("non può venire")
        : !sano ? T("solo chi è sano") : preso ? T`c'è già ${D.PERSONE[S.ospite].nome}` : T("dorme da te")), ospite,
      !!firmata || !sano || !!preso || !!P.ospite || !D.OSPITE[persona], () => {
        S.ospite = S.ospite === persona ? null : persona;
        if (S.ospite === persona) S.lazzaretto[persona] = false;
        ridisegnaStato(casa);
      }));
  }
  riga.append(foto, dati, sagoma(persona), esito, decidi);
  return riga;
}

// un interruttore grande dello stato di famiglia: un riquadro col segno a penna, il nome e una nota sotto
function sceltaStato(tipo, nome, nota, attiva, spenta, azione) {
  const b = el("button", `sf-scelta ${tipo}`);
  b.type = "button";
  b.setAttribute("aria-pressed", attiva ? "true" : "false");
  b.disabled = spenta;
  b.append(el("span", "sf-quadro", attiva ? "✗" : ""), el("span", "sf-scelta-nome", nome), el("small", null, nota));
  b.addEventListener("click", (e) => { e.stopPropagation(); azione(); });
  return b;
}

// lo stato di famiglia ridisegnato dopo una scelta, allo stesso punto
function ridisegnaStato(casa) {
  const scroll = foglioCorpo.scrollTop;
  apriStato(R.sfCasa === casa && !S.casa ? null : casa, { obbligato: foglio.dataset.bloccato === "1" });
  foglioCorpo.scrollTop = scroll;
}

// il certificato di una casa; casa null: dalla scrivania, con le linguette delle case segnalate.
// opzioni.firma: si apre in fondo, sulla firma; opzioni.obbligato: non si chiude finche' non si firma
function apriStato(casa, opzioni = {}) {
  if (R.occupato && !opzioni.obbligato) return;
  suoni.suona("carta");
  const segnalate = Object.keys(D.ANAGRAFE);
  const daScrivania = casa == null;
  casa = casa || R.sfCasa || segnalate.find((c) => !S.decisioni[c]) || segnalate[0];
  R.sfCasa = casa;
  R.sfScelta = null;
  const A = D.ANAGRAFE[casa];
  const c = D.CASE[casa];
  const firmata = !!S.decisioni[casa];
  const puoFirmare = S.casa === casa && !firmata;
  const sf = el("div", "sf");
  const tavolo = el("div", "sf-tavolo");
  {
    const linguette = el("div", "sf-linguette");
    for (const k of segnalate) {
      linguette.append(bottone(T`Casa ${D.CASE[k].n}`, () => { R.sfCasa = k; apriStato(daScrivania ? null : k, opzioni); },
        k === casa ? "attiva" : ""));
    }
    if (!opzioni.obbligato) linguette.append(bottone(T("Chiudi"), chiudiFoglio, "sf-chiudi"));
    tavolo.append(linguette);
  }
  const carta = el("div", "sf-carta");
  carta.append(
    el("div", "sf-comune", T`COMUNE DI ${D.COMUNE}`),
    el("div", "sf-ufficio", T("UFFICIO ANAGRAFE · SERVIZIO DEMOGRAFICO")),
    el("div", "sf-titolo", T("CERTIFICATO DI STATO DI FAMIGLIA")),
    el("p", "sf-premessa", T`Si certifica che nell'abitazione di ${A.via} (casa n. ${c.n}) la famiglia anagrafica risulta così composta:`));
  const righe = el("div", "sf-righe");
  for (const r of A.righe) righe.append(rigaStato(casa, r, firmata));
  carta.append(righe);
  const piede = el("div", "sf-piede");
  const vivi = A.righe.filter((r) => !S.morti[r.persona]).length;
  const comp = el("p", null, T`Componenti risultanti: ${NUMERI[A.righe.length] || A.righe.length}.`);
  if (vivi < A.righe.length) comp.append(el("span", "penna", T` vivi: ${vivi}`));
  piede.append(comp);
  const prov = el("p", "sf-prov");
  prov.append(document.createTextNode(T("Provvedimento: ")));
  const scelto = firmata ? S.decisioni[casa].provvedimento : S.provv[casa] || "nessuno";
  for (const [v, testo] of [["chiudi", T("croce sulla porta")], ["domani", T("tornare domani")]]) {
    const lab = el("label", "sf-casella");
    const cb = el("input");
    cb.type = "checkbox";
    cb.checked = scelto === v;
    cb.disabled = firmata;
    cb.addEventListener("change", () => {
      S.provv[casa] = cb.checked ? v : "nessuno";
      for (const altro of prov.querySelectorAll("input")) if (altro !== cb) altro.checked = false;
    });
    lab.append(cb, el("span", null, testo));
    prov.append(lab);
  }
  piede.append(prov);
  const firma = el("div", "sf-firma");
  firma.append(el("span", null, T("Il medico: ")));
  if (firmata) {
    firma.append(el("span", "sf-scarabocchio", T("Dott. ———")), el("span", "sf-consegnato", T("CONSEGNATO ALLA DITTA")));
  } else if (puoFirmare) {
    const b = bottone(T("firma e consegna alla ditta"), () => firmaStato(casa, b), "sf-bottone-firma");
    firma.append(b);
    if (opzioni.firma) b.classList.add("invito");
  } else firma.append(el("span", "sf-spiega", S.casa ? T("si firma a fine visita, nella sua casa") : T("si firma a fine visita")));
  piede.append(firma);
  carta.append(piede);

  // sul tavolo, a destra: i timbri e le frasi del nastro di questa casa
  const lato = el("div", "sf-lato");
  lato.append(el("h3", null, T("Timbri")));
  const rastrelliera = el("div", "sf-rastrelliera");
  for (const t of D.TIMBRI) {
    const b = el("button", `sf-manico ${t.id}`);
    b.type = "button";
    b.setAttribute("aria-label", T`Timbro ${t.testo}`);
    b.append(el("span", "sf-legno"), el("span", "sf-base"), el("span", "sf-gomma", t.testo));
    trascinabile(b, { tipo: "timbro", id: t.id, testo: t.testo }, casa);
    rastrelliera.append(b);
  }
  lato.append(rastrelliera, el("h3", null, T("Dal nastro delle frasi")));
  const frasi = el("div", "sf-frasi");
  const mie = S.frasi.filter((f) => valeIn(f.id, casa));
  if (!mie.length) frasi.append(el("p", "sf-spiega", T("Ancora niente: le frasi arrivano dalle visite.")));
  for (const v of mie) {
    const f = fotogramma(v);
    const usata = Object.values(S.note).some((l) => l.some((n) => n.id === v.id));
    const d = el("div", `fot ${f.tipo}${usata ? " usata" : ""}`);
    d.tabIndex = 0;
    d.setAttribute("role", "button");
    const foto = el("span", "fot-foto");
    if (f.foto) {
      foto.style.backgroundImage = `url(${f.foto.src})`;
      const { x = 0, y = 0, w = 1, h = 1 } = f.foto;
      foto.style.backgroundSize = `${100 / w}% ${100 / h}%`;
      foto.style.backgroundPosition = `${w < 1 ? (x / (1 - w)) * 100 : 50}% ${h < 1 ? (y / (1 - h)) * 100 : 50}%`;
      if (f.foto.filtro) foto.classList.add(f.foto.filtro);
    }
    const t = el("span", "fot-testo");
    t.append(el("span", "fot-frase", f.testo), el("span", "fot-meta", f.meta));
    d.append(foto, t);
    trascinabile(d, { tipo: "frase", id: v.id, testo: f.testo }, casa);
    frasi.append(d);
  }
  lato.append(frasi, el("p", "sf-aiuto", T("Trascina un timbro su una persona: è la tua diagnosi. Trascina una frase sul nome giusto: la penna la scrive, e barra quello che smentisce. Decidi chi porti al lazzaretto e chi ospiti stanotte (solo un sano: chi dorme solo, il malvento se lo prende), poi firma.")));
  tavolo.append(carta, lato);
  sf.append(tavolo);
  // il clic su una riga, dopo aver scelto un timbro o una frase col tocco
  righe.addEventListener("click", (e) => {
    const riga = e.target.closest(".sf-riga");
    if (!riga || !R.sfScelta || e.target.closest("label, input")) return;
    usaSu(R.sfScelta, riga.dataset.persona, casa);
  });
  foglio.dataset.bloccato = opzioni.obbligato ? "1" : "0";
  apriFoglio("stato", [sf]);
  R.sfNuovoTimbro = null;
  adattaStato(sf);
  if (opzioni.firma) requestAnimationFrame(() => firma.scrollIntoView({ block: "end" }));
}

// il certificato e' disegnato a misura fissa e si rimpicciolisce per stare nello schermo; sotto i 1200 punti
// il tavolo va sotto la carta
function adattaStato(sf) {
  const largo = Math.min(window.innerWidth, document.documentElement.clientWidth) - 32;
  const stretto = largo < 1200;
  sf.classList.toggle("stretta", stretto);
  sf.style.zoom = String(Math.min(1, largo / (stretto ? 1100 : 1580)));
}

// timbri e frasi si trascinano sulle righe; toccati, si scelgono e si usa la riga toccata dopo
function trascinabile(elem, dato, casa) {
  elem.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    e.preventDefault();
    const x0 = e.clientX, y0 = e.clientY;
    let fantasma = null;
    let sopra = null;
    const muovi = (ev) => {
      if (!fantasma && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 6) {
        fantasma = elem.cloneNode(true);
        fantasma.classList.add("sf-fantasma");
        fantasma.style.zoom = elem.closest(".sf")?.style.zoom || "1";
        document.body.append(fantasma);
      }
      if (!fantasma) return;
      const z = Number(fantasma.style.zoom) || 1;
      fantasma.style.left = `${ev.clientX / z}px`;
      fantasma.style.top = `${ev.clientY / z}px`;
      fantasma.hidden = true;
      const riga = document.elementFromPoint(ev.clientX, ev.clientY)?.closest(".sf-riga");
      fantasma.hidden = false;
      if (riga !== sopra) { sopra?.classList.remove("sotto"); riga?.classList.add("sotto"); sopra = riga; }
    };
    const fine = (ev) => {
      window.removeEventListener("pointermove", muovi);
      window.removeEventListener("pointerup", fine);
      window.removeEventListener("pointercancel", fine);
      sopra?.classList.remove("sotto");
      if (fantasma) {
        fantasma.remove();
        R.sfTrascinato = performance.now();
        // il foglio si ridisegna dopo il clic che il browser manda alla fine del trascinamento
        if (ev.type === "pointerup" && sopra) setTimeout(() => usaSu(dato, sopra.dataset.persona, casa), 0);
        return;
      }
      if (ev.type !== "pointerup") return;
      // un tocco: sceglie (o lascia) il timbro o la frase
      const gia = R.sfScelta && R.sfScelta.tipo === dato.tipo && R.sfScelta.id === dato.id;
      R.sfScelta = gia ? null : dato;
      for (const x of foglio.querySelectorAll(".sf-scelto")) x.classList.remove("sf-scelto");
      if (!gia) elem.classList.add("sf-scelto");
      foglio.querySelector(".sf-carta")?.classList.toggle("in-attesa", !gia);
    };
    window.addEventListener("pointermove", muovi);
    window.addEventListener("pointerup", fine);
    window.addEventListener("pointercancel", fine);
  });
  elem.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    R.sfScelta = dato;
    for (const x of foglio.querySelectorAll(".sf-scelto")) x.classList.remove("sf-scelto");
    elem.classList.add("sf-scelto");
    notifica(T("Ora scegli una persona"));
  });
}

function usaSu(dato, persona, casa) {
  R.sfScelta = null;
  if (dato.tipo === "timbro") {
    suoni.suona("timbro");
    S.diagnosi[persona] = dato.id;
    R.sfNuovoTimbro = persona;
    if (dato.id !== "sano" && S.ospite === persona) S.ospite = null;
  } else {
    const esito = annota(dato.id, persona);
    if (esito === "gia") notifica(T("Già annotato"));
    if (esito === "no") {
      notifica(T("Non c'entra"));
      const riga = foglio.querySelector(`.sf-riga[data-persona="${persona}"]`);
      riga?.classList.add("no");
      setTimeout(() => riga?.classList.remove("no"), 600);
      return;
    }
    if (esito === "nuova") suoni.suona("firma", { volume: 0.6 });
  }
  ridisegnaStato(casa);
}

function firmaStato(casa, bottoneFirma) {
  bottoneFirma.disabled = true;
  bottoneFirma.replaceWith(el("span", "sf-scarabocchio scrive", T("Dott. ———")));
  suoni.suona("firma");
  const via = personeDellaCasa(casa).map(([id]) => id).filter((id) => S.lazzaretto[id]);
  const ospite = S.ospite && D.PERSONE[S.ospite].casa === casa ? S.ospite : null;
  S.decisioni[casa] = { via, ospite, provvedimento: S.provv[casa] || "nessuno", ora: S.ora };
  S.visitate[casa] = true;
  const n = S.nastri[S.nastri.length - 1];
  if (n) n.fine = S.ora;
  setTimeout(() => {
    foglio.dataset.bloccato = "0";
    foglio.hidden = true;
    S.casa = null;
    if (S.ora >= D.INIZIO.coprifuoco) sera();
    else vaiMappa();
  }, 900);
}

window.addEventListener("resize", () => {
  const sf = foglio.querySelector(".sf");
  if (sf && !foglio.hidden) adattaStato(sf);
});

// ---------- la sera e i nastri ----------

async function sera() {
  S.fase = "sera";
  S.ora = Math.max(S.ora, D.INIZIO.coprifuoco);
  if (stanza) vaiStanza("porta");
  else vaiScrivania();
  await dici([[null, T("Le otto. Coprifuoco.")], [null, D.OSPITE[S.ospite || "solo"].arriva],
    [null, T("I nastri di oggi sono nel videoregistratore.")]], false, false);
}

// la stanzetta, la sera: la porta 3D si socchiude e si guarda dentro, al buio (un'immagine in verde), con l'ospite
// o con la brandina vuota; "Chiudi la porta" riporta nella stanza
async function controllaOspite() {
  const O = D.OSPITE[S.ospite || "solo"];
  if (visita && stanza?.mettiPupazzo) return controllaOspite3D(O);
  const quadro = immagine(`img/ospite/${S.ospite ? `ospite_${S.ospite}` : "stanzetta_20"}.jpg`);
  R.occupato = true;
  stanza.socchiudi(true);
  suoni.suona("porta");
  await new Promise((r) => setTimeout(r, 700));
  let im;
  try {
    im = await quadro;
  } catch {
    R.occupato = false;
    stanza.socchiudi(false);
    return dici(O.controllo, false);
  }
  S.schermo = "stanzetta";
  pulisci();
  osdRec();
  osd.modo.textContent = T("NOTTE");
  if (vhs) {
    vhs.mode("notte");
    vhs.setLuce(0);
    vhs.setHeat(null);
    vhs.setDark(0);
    vhs.set({ zoom: 1, cx: 0.5, cy: 0.5, blur: 0, snow: 0 });
    vhs.hunt();
    vhs.salta();
  }
  mostra(im);
  // la videocamera si abitua al buio e stringe sulla brandina
  if (vhs) vhs.tween({ zoom: 1.5, cx: 0.45, cy: 0.55 }, 1800);
  tasti(tasto(T("Chiudi la porta"), () => { stanza.socchiudi(false); suoni.suona("porta", { volume: 0.5 }); vaiStanza("ospite"); }, "indietro", true));
  aiuto(T("Chiudi la porta per tornare nella stanza."));
  await dici(O.controllo, false);
}

// in plastilina: la porta si socchiude e la videocamera guarda dentro, al buio (la visione notturna, in verde, con la
// sua lampada infrarossa): l'ospite sulla brandina, o la brandina vuota
async function controllaOspite3D(O) {
  const { NOTTE } = await import("./scene3d.js");
  const chi = S.ospite, N = NOTTE[chi || "solo"];
  R.occupato = true;
  // la porta si apre quasi tutta: dalla soglia si vede la brandina
  stanza.socchiudi(true, false, 1.3);
  suoni.suona("porta");
  try {
    if (chi && N?.stanzetta) {
      const pp = await visita.prestito(chi);
      await visita.inPosa(pp, N.stanzetta, D.PERSONE[chi]?.stato || "sano");
      stanza.mettiPupazzo(pp);
    }
  } catch (err) {
    console.warn("L'ospite non si vede:", err);
  }
  await new Promise((r) => setTimeout(r, 600));
  S.schermo = "stanzetta";
  pulisci();
  osdRec();
  osd.modo.textContent = T("NOTTE");
  // pulisci() ferma la stanza: qui la si riprende ancora
  mostra(stanza.canvas, IMG.scrivania.src);
  vhs.prima = (dt) => { stanza.passo(dt); vhs.refresh(); };
  if (vhs) {
    vhs.mode("notte");
    vhs.setLuce(0);
    vhs.setHeat(null);
    vhs.setDark(0);
    vhs.set({ zoom: 1, cx: 0.5, cy: 0.5, blur: 0, snow: 0 });
    vhs.hunt();
    vhs.salta();
  }
  stanza.inquadra([1.85, 1.5, 1.7], [4.0, 0.6, 1.75], 50);
  stanza.notte([1.9, 1.55, 1.6], [4.0, 0.5, 1.75], 2.2);
  tasti(tasto(T("Chiudi la porta"), () => {
    stanza.togliPupazzi();
    stanza.notte(null);
    stanza.socchiudi(false);
    suoni.suona("porta", { volume: 0.5 });
    vaiStanza("ospite");
  }, "indietro", true));
  aiuto(T("Chiudi la porta per tornare nella stanza."));
  R.occupato = false;
  await dici(O.controllo, false);
}

// il nastro della notte in plastilina: la stanza ripresa dalla maschera rimasta accesa sulla scrivania, al buio, con la
// sua lampada infrarossa; il medico dorme sotto la coperta. Tre riprese: la stanza ferma, la porta della stanzetta
// aperta (con l'ospite, o qualcosa nel buio), l'ospite (o la cosa nera) accanto al letto
async function nastroNotte3D(O) {
  const { NOTTE } = await import("./scene3d.js");
  const chi = S.ospite;
  const N = NOTTE[chi || (S.giorno >= 2 ? "solo2" : "solo")] || NOTTE.solo;
  // la cosa nera e' un pupazzo in piu': lo si carica subito, mentre scorre la prima ripresa
  if (N.nastro.some((q) => q?.cosa)) visita.prestito("cosa").catch(() => {});
  S.schermo = "nastro-notte";
  pulisci();
  osdPlay();
  osd.modo.textContent = T("NOTTE");
  if (vhs) {
    vhs.mode("notte");
    vhs.setLuce(0);
    vhs.setHeat(null);
    vhs.setDark(0);
    vhs.set({ zoom: 1, cx: 0.5, cy: 0.5, blur: 0, snow: 0 });
    vhs.salta();
  }
  aiuto(T("Il nastro della notte: la maschera è rimasta accesa sulla scrivania."));
  suoni.suona("videoregistratore");
  suoni.ambiente("nastro", "notte");
  suoni.musica(null);
  mostra(stanza.canvas, IMG.scrivania.src);
  vhs.prima = (dt) => { stanza.passo(dt); vhs.refresh(); };
  // la maschera in fondo alla scrivania, accanto al videoregistratore: larga come le videocamere di sorveglianza, prende
  // il letto, il cappotto e la porta della stanzetta
  const MASCHERA = [0.0, 1.25, -2.42], GUARDA = [2.4, 0.55, -0.8];
  stanza.inquadra(MASCHERA, GUARDA, 70);
  stanza.notte(MASCHERA, GUARDA, 3.2);
  stanza.dormiente(true);
  for (let i = 0; i < 3; i++) {
    const q = N.nastro[i];
    stanza.togliPupazzi();
    stanza.socchiudi(!!q?.porta, true, 1.25);
    if (q) {
      try {
        const pp = await visita.prestito(q.cosa ? "cosa" : chi);
        await visita.inPosa(pp, q, D.PERSONE[chi]?.stato || "sano");
        stanza.mettiPupazzo(pp);
      } catch (err) {
        console.warn("Il nastro della notte senza pupazzo:", err);
      }
    }
    if (vhs) vhs.burst(0.45);
    if (!chi && i > 0) suoni.suona("malvento", { volume: 0.8 + 0.2 * i, ritardo: 0.3 });
    await dici([[null, O.nastro[i]]], false);
    await attendi(7000);
  }
  // la mattina: la stanza com'era
  stanza.togliPupazzi();
  stanza.dormiente(false);
  stanza.socchiudi(false, true);
  stanza.notte(null);
  osdSpento();
}

// il nastro della notte: la maschera e' rimasta accesa sulla scrivania. Tre riprese al buio, in verde, ognuna con
// la sua frase; si guarda la mattina, prima del resoconto
async function nastroNotte() {
  const chi = S.ospite;
  const O = D.OSPITE[chi || "solo"];
  if (visita && stanza?.mettiPupazzo) return nastroNotte3D(O);
  // la seconda notte chi dorme solo ha le sue riprese (la cosa nera piu' vicina): "immagini"
  const quadri = O.immagini || ["notte_dorme", ...(chi ? [`notte_${chi}_1`, `notte_${chi}_2`] : ["notte_solo_1", "notte_solo_2"])];
  let imgs;
  try {
    imgs = await Promise.all(quadri.map((q) => immagine(`img/ospite/${q}.jpg`)));
  } catch {
    return; // senza le immagini, niente nastro: si passa al resoconto
  }
  S.schermo = "nastro-notte";
  pulisci();
  osdPlay();
  osd.modo.textContent = T("NOTTE");
  if (vhs) {
    vhs.mode("notte");
    vhs.setLuce(0);
    vhs.setHeat(null);
    vhs.setDark(0);
    vhs.set({ zoom: 1, cx: 0.5, cy: 0.5, blur: 0, snow: 0 });
    vhs.salta();
  }
  aiuto(T("Il nastro della notte: la maschera è rimasta accesa sulla scrivania."));
  suoni.suona("videoregistratore");
  suoni.ambiente("nastro", "notte");
  suoni.musica(null);
  for (let i = 0; i < quadri.length; i++) {
    mostra(imgs[i]);
    if (vhs) vhs.burst(0.45);
    if (!chi && i > 0) suoni.suona("malvento", { volume: 0.8 + 0.2 * i, ritardo: 0.3 });
    await dici([[null, O.nastro[i]]], false);
    await attendi(7000);
  }
  osdSpento();
}

// aspetta un clic sullo schermo (o Spazio, Invio), al massimo "ms" millisecondi: il nastro va avanti da solo
function attendi(ms) {
  return new Promise((ok) => {
    const tasto = (e) => { if (e.key === " " || e.key === "Enter") fine(); };
    const fine = () => {
      clearTimeout(t);
      schermo.removeEventListener("pointerdown", fine);
      window.removeEventListener("keydown", tasto);
      ok();
    };
    const t = setTimeout(fine, ms);
    schermo.addEventListener("pointerdown", fine);
    window.addEventListener("keydown", tasto);
  });
}

function apriNastri() {
  suoni.suona("videoregistratore");
  const corpo = [el("h2", null, T("Nastri"))];
  if (!S.nastri.length) corpo.push(el("p", "vuoto", T("Nessuna visita registrata, per ora.")));
  for (const n of S.nastri) {
    corpo.push(azioni([[n.titolo, () => { chiudiFoglio(); riproduci(n); }]]));
  }
  corpo.push(azioni([[`${D.NASTRO_VECCHIO.titolo}`, () => { chiudiFoglio(); riproduciVecchio(); }, "secondario"]]));
  corpo.push(el("p", "nota", T("Durante la riproduzione tocca l'immagine per ingrandire. Con l'infrarosso si vede il calore: tocca quello che non torna.")));
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
    bottone(T("IR"), infrarosso, "cmd cmd-ir"),
    bottone(T("Esci"), tornaDaiNastri, "cmd cmd-esci"));
  if (vhs) vhs.setDark(0);
  ripresa(0);
}

function pausa() {
  const p = R.play;
  p.inPausa = !p.inPausa;
  comandi.querySelector(".cmd-play").textContent = p.inPausa ? "▶" : "❚❚";
  if (vhs) vhs.paused = p.inPausa;
  if (p.inPausa) parole.pulisci();
  else ripresa(p.i);
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
  const notte = r.tipo === "scena" ? D.LUOGHI[r.luogo].notte : !!D.LUOGHI[D.PERSONE[r.persona]?.luogo]?.notte;
  if (visita) {
    // l'infrarosso e la notte li fa il 3D
    visita.imposta(p.ir ? "ir" : notte ? "notte" : "giorno");
    if (vhs) { vhs.mode("giorno", false); vhs.setLuce(0); vhs.setEsame(0); vhs.salta(); }
  } else if (vhs) {
    vhs.mode(p.ir ? "ir" : notte ? "notte" : "giorno");
    vhs.setLuce(p.ir || notte ? 0 : 1);
    if (p.nastro.casa) vhs.tono = tonoCasa(p.nastro.casa);
    vhs.setEsame(!p.ir && r.tipo === "primo" ? 1 : 0);
    vhs.salta();
  }
  osd.modo.textContent = p.ir ? T("IR") : notte ? T("NOTTE") : "";
}

// la scena del nastro con le facce che avevano in quel momento
function componiNastro(luogo, volti) {
  if (visita) {
    for (const p of D.LUOGHI[luogo].persone) visita.volto(p, volti[p] ?? null);
    return;
  }
  const ctx = R.ctx;
  ctx.globalAlpha = 1;
  ctx.drawImage(IMG[luogo], 0, 0, W, H);
  const facce = {};
  for (const [persona, volto] of Object.entries(volti)) facce[persona] = { da: null, a: volto, t0: 0 };
  disegnaVolti(ctx, luogo, facce);
  if (vhs && vhs.source === R.scena) vhs.refresh();
}

async function ripresa(i) {
  const p = R.play;
  if (!p) return;
  const n = p.nastro;
  if (i < 0) i = 0;
  parole.pulisci();
  if (i >= n.riprese.length) {
    p.token++;
    parole.scrivi(null, T("[fine del nastro]"), { lato: "sotto" });
    return;
  }
  p.i = i;
  const tok = ++p.token;
  const r = n.riprese[i];
  // le facce di una battuta: quelle che restavano, piu' l'espressione di chi parla
  const facceDi = (fermi, persona, volto) => {
    const v = {};
    for (const [p, x] of Object.entries(fermi || {})) if (D.LUOGHI[r.luogo].persone.includes(p)) v[p] = x;
    if (persona && volto && D.LUOGHI[r.luogo].persone.includes(persona)) v[persona] = volto;
    return v;
  };
  let volti = {};
  if (r.tipo === "scena" && visita) {
    volti = facceDi(r.volti);
    await apriVisita(r.luogo, volti, p.ir ? "ir" : null);
    if (p.token !== tok) return;
    didascalia.hidden = true;
  } else if (r.tipo === "scena") {
    volti = facceDi(r.volti);
    componiNastro(r.luogo, volti);
    mostra(R.scena, IMG[r.luogo].src);
    if (vhs) vhs.setHeat(IMG[`${r.luogo}_calore`]);
    didascalia.hidden = true;
  } else if (visita) {
    // il primo piano rivisto: la stessa stanza, gia' nello zoom sulla parte
    const luogo = D.PERSONE[r.persona].luogo;
    await apriVisita(luogo, facceDi(r.volti), p.ir ? "ir" : null);
    if (p.token !== tok) return;
    visita.inZoom(r.persona, r.parte);
    didascalia.textContent = `${maiuscolo(D.PARTI[r.parte])} · ${maiuscolo(D.PERSONE[r.persona].nome)}`;
    didascalia.hidden = false;
  } else {
    mostra(await primoPiano(r.persona, r.parte));
    if (vhs) vhs.setHeat(null, D.PERSONE[r.persona].calore);
    didascalia.textContent = `${maiuscolo(D.PARTI[r.parte])} · ${maiuscolo(D.PERSONE[r.persona].nome)}`;
    didascalia.hidden = false;
  }
  if (vhs) { vhs.set({ zoom: 1, cx: 0.5, cy: 0.5, blur: 0 }); vhs.burst(0.35); }
  modoRipresa();
  osdPlay();
  // le battute registrate, scritte di nuovo addosso a chi parla, poi la ripresa dopo
  const primo = r.tipo === "primo" ? { persona: r.persona, parte: r.parte } : null;
  for (const [chi, testo, extra = {}] of r.righe) {
    if (p.token !== tok || p.inPausa) return;
    if (r.tipo === "scena") {
      const ora = facceDi(extra.fermi || r.volti, D.VOCI[chi], extra.volto);
      if (JSON.stringify(ora) !== JSON.stringify(volti)) {
        volti = ora;
        componiNastro(r.luogo, volti);
      }
    }
    const finita = await parole.scrivi(chi, testo, ancora(chi, r.tipo === "scena" ? r.luogo : null, primo));
    if (!finita) return;
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
        if (S.prove.includes(t.prova)) notifica(T("Già annotato"));
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
  S.tracce.nastro7 = true;
  S.schermo = "nastro";
  pulisci();
  R.play = null;
  comandi.hidden = false;
  comandi.append(bottone(T("Esci"), tornaDaiNastri, "cmd cmd-esci"));
  const nero = document.createElement("canvas");
  nero.width = 16; nero.height = 9;
  nero.getContext("2d").fillRect(0, 0, 16, 9);
  mostra(nero, IMG.scrivania.src);
  if (vhs) { vhs.mode("giorno", true); vhs.setLuce(0); vhs.setDark(0); vhs.set({ snow: 1 }); }
  osdPlay();
  await dici(D.NASTRO_VECCHIO.righe, false);
  if (S.schermo === "nastro") tornaDaiNastri();
}

// ---------- la notte ----------

function calcolaNotte() {
  const contagiate = [];
  // casa per casa com'e' andata ("passa": il contagio va ai vicini, "fermo": la croce lo tiene dentro, "pulita": niente
  // malati) e da dove a dove e' passato il contagio, per le frecce sulla mappa
  const case_ = [];
  const diffusione = [];
  let incasso = 0;
  let fiducia = S.fiducia;
  const portati = [];
  for (const casa of D.FAX.case.map((n) => `casa${n}`)) {
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
    const sani = membri.some(([id, p]) => p.stato === "sano" && !via.includes(id));
    let esito = "pulita", perche = T("nessun malato in casa");
    if (!dec) {
      esito = "passa";
      perche = T("nessuna visita");
    } else if (dec.provvedimento === "chiudi") {
      if (malati) {
        esito = "fermo";
        perche = sani ? T("la croce lo tiene dentro, coi sani") : T("la croce lo tiene dentro");
      } else {
        fiducia -= 10;
        perche = T("la croce, ma non c'erano malati");
      }
    } else if (malati) {
      esito = "passa";
      perche = T("malati rimasti in casa");
    }
    if (esito === "passa") {
      contagiate.push(...c.vicini);
      diffusione.push({ da: casa, a: [...c.vicini] });
    }
    // chi ti ha cacciato lo racconta in giro
    if (S.cacciato[casa]) fiducia -= 10;
    case_.push({ casa, n: c.n, esito, perche, a: esito === "passa" ? [...c.vicini] : [], cacciato: !!S.cacciato[casa] });
  }
  // l'ospite: averne preso uno sano si sa in giro, e piace; uno malato in casa del medico no
  let ospite = null;
  if (S.ospite) {
    const malato = D.PERSONE[S.ospite].stato !== "sano";
    ospite = { chi: S.ospite, malato };
    fiducia += malato ? -5 : 5;
  }
  const spese = D.SOLDI.stanza + D.SOLDI.cena + D.SOLDI.cassetta * S.nastri.length;
  return { contagiate: [...new Set(contagiate)], case: case_, diffusione, incasso, spese, fiducia, portati, ospite };
}

async function dormi() {
  if (S.schermo === "notte" || S.schermo === "nastro-notte") return;
  suoni.suona("interruttore");
  await nastroNotte();
  const n = calcolaNotte();
  S.notte = n;
  S.soldi += n.incasso - n.spese;
  S.fiducia = n.fiducia;
  S.schermo = "notte";
  pulisci();
  osdSpento();
  // la mattina, sulla mappa: il contagio della notte, con le frecce rosse dalle case ai vicini (28 ottobre: "la cosa
  // importante e' sapere come si e' diffuso il contagio"), e accanto un resoconto corto
  R.contagio = { diffusione: n.diffusione, t0: performance.now() };
  vaiMappa();
  hud.replaceChildren();
  aiuto(null);
  mostraIndicatori(null);
  schermo.classList.add("contagio");
  foglio.dataset.bloccato = "1";
  apriFoglio("notte", resoconto(n));
  inquadraContagio(n);
  animaContagio();
}

// la videocamera stringe sulle case da cui e' passato il contagio e su quelle prese, nella parte di mappa che il
// foglio del resoconto lascia libera (a destra; sul telefono in piedi il foglio sta sotto e copre tutta la larghezza)
function inquadraContagio(n) {
  const coinvolte = n.diffusione.flatMap(({ da, a }) => [da, ...a]).map((id) => D.CASE[id]);
  if (!vhs || !coinvolte.length) return;
  const s = schermo.getBoundingClientRect();
  const c = foglio.querySelector(".carta").getBoundingClientRect();
  const coperta = c.width < s.width * 0.6 ? clamp((c.right - s.left) / s.width, 0, 0.5) : 0;
  const xs = coinvolte.map((k) => k.ex), ys = coinvolte.map((k) => k.ey);
  // un po' di margine attorno alle case, di piu' sopra per le puntine
  const x0 = Math.min(...xs) - 0.05, x1 = Math.max(...xs) + 0.05;
  const y0 = Math.min(...ys) - 0.1, y1 = Math.max(...ys) + 0.05;
  const z = clamp(Math.min((0.96 - coperta) / (x1 - x0), 0.9 / (y1 - y0)), 1, 1.8);
  // il centro delle case va al centro della parte libera
  vhs.tween({ zoom: z, cx: clamp((x0 + x1) / 2 - coperta / 2 / z, 0.5 / z, 1 - 0.5 / z),
    cy: clamp((y0 + y1) / 2, 0.5 / z, 1 - 0.5 / z) }, 1400);
}

// il resoconto della notte: il contagio prima di tutto, casa per casa; poi una riga per chi e' andato al
// lazzaretto, una per l'ospite e una per i soldi
function resoconto(n) {
  const casella = (num, cls = "") => el("span", `nt-casa ${cls}`, String(num));
  const contagio = el("ul", "nt-contagio");
  // prima le case da cui il contagio e' passato, poi quelle chiuse con la croce, poi le pulite
  const ordine = { passa: 0, fermo: 1, pulita: 2 };
  for (const c of [...n.case].sort((a, b) => ordine[a.esito] - ordine[b.esito])) {
    const li = el("li", `nt-${c.esito}`);
    li.append(casella(c.n, c.esito === "passa" ? "fonte" : ""));
    if (c.esito === "passa") {
      li.append(el("span", "nt-freccia", "→"));
      for (const v of c.a) li.append(casella(D.CASE[v].n, "presa"));
    } else li.append(el("span", "nt-segno", c.esito === "fermo" ? "✝" : "·"));
    li.append(el("small", null, c.perche + (c.cacciato ? T(" · ti hanno cacciato") : "")));
    contagio.append(li);
  }
  // l'ospite malato porta il contagio nella stanza del medico
  if (n.ospite?.malato) {
    const li = el("li", "nt-passa");
    li.append(casella("✚", "fonte"), el("span", "nt-freccia", "→"), el("span", "nt-casa presa nt-tua", T("la tua stanza")),
      el("small", null, T`${D.PERSONE[n.ospite.chi].nome}, ${donna(n.ospite.chi) ? T("malata") : T("malato")}, ha dormito da te`));
    contagio.append(li);
  }
  const nuove = n.contagiate.length;
  const riga = (titolo, testo) => {
    const p = el("p", "nt-riga");
    p.append(el("b", null, titolo), document.createTextNode(testo));
    return p;
  };
  const portati = n.portati.map((id) => D.PERSONE[id].nome).join(", ");
  const O = D.OSPITE[n.ospite ? n.ospite.chi : "solo"];
  return [
    el("h2", null, [T("La prima notte"), T("La seconda notte"), T("La terza notte")][S.giorno - 1]),
    el("h3", "nt-titolo", nuove ? T`Il contagio: ${nuove === 1 ? T("una casa nuova") : T`${nuove} case nuove`}` : T("Il contagio non è passato")),
    contagio,
    riga(T("Al lazzaretto "), portati ? `${portati}.` : T("nessuno.")),
    riga(n.ospite ? T("Ospite ") : T("Da solo "), O.mattina),
    riga(T("Soldi "), T`+${n.incasso} € dalla ditta, −${n.spese} € di spese: restano ${S.soldi} €.`),
    azioni([[T("Il giornale del mattino"), () => { R.contagio = null; apriGiornale(true); }]]),
  ];
}

// chi e' donna, dallo stato di famiglia (per accordare "malato" e "malata")
function donna(persona) {
  return Object.values(D.ANAGRAFE).some((A) => A.righe.some((r) => r.persona === persona && r.donna));
}

// mentre le frecce crescono e la videocamera stringe, la mappa si ridisegna e le puntine la seguono; poi tutto resta
// fermo (ogni immagine nuova della mappa torna intera alla videocamera, e costa), e pulsano solo le puntine (CSS)
function animaContagio() {
  const fine = R.contagio.t0 + Math.max(1500, FRECCIA.via + R.contagio.diffusione.length * FRECCIA.dopo + FRECCIA.cresce);
  const giro = (t) => {
    if (!R.contagio || S.schermo !== "mappa") return;
    posizionaSpilli();
    disegnaMappa();
    if (t < fine + 100) requestAnimationFrame(giro);
  };
  requestAnimationFrame(giro);
}

// i tempi delle frecce, in millisecondi: quando parte la prima, ogni quanto la casa dopo, quanto ci mette a crescere
const FRECCIA = { via: 300, dopo: 300, cresce: 800 };

// il contagio della notte sulla mappa: da ogni casa da cui e' passato una freccia rossa cresce fino a ogni vicina (una
// casa dopo l'altra; le frecce di una casa insieme), poi resta; attorno alla casa presa, quando arriva, un cerchio rosso
function frecceContagio(ctx, w, h) {
  const ora = performance.now() - R.contagio.t0;
  const s = w / 1600;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  R.contagio.diffusione.forEach(({ da, a }, i) => {
    const p = clamp((ora - FRECCIA.via - i * FRECCIA.dopo) / FRECCIA.cresce, 0, 1);
    if (!p) return;
    const c0 = D.CASE[da];
    for (const v of a) {
      const c1 = D.CASE[v];
      const x0 = c0.ex * w, y0 = c0.ey * h, x1 = c1.ex * w, y1 = c1.ey * h;
      const d = Math.hypot(x1 - x0, y1 - y0) || 1;
      const ux = (x1 - x0) / d, uy = (y1 - y0) / d;
      // si parte e si arriva un po' fuori dalla casa, con una curva leggera
      const ax = x0 + ux * 14 * s, ay = y0 + uy * 14 * s, bx = x1 - ux * 22 * s, by = y1 - uy * 22 * s;
      const mx = (ax + bx) / 2 - uy * d * 0.18, my = (ay + by) / 2 + ux * d * 0.18;
      const punto = (u) => [(1 - u) ** 2 * ax + 2 * (1 - u) * u * mx + u * u * bx, (1 - u) ** 2 * ay + 2 * (1 - u) * u * my + u * u * by];
      const traccia = () => {
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        for (let k = 1; k <= 24; k++) ctx.lineTo(...punto(p * k / 24));
      };
      // sotto un'ombra scura, perche' il rosso si legga sulla mappa
      ctx.strokeStyle = "rgba(20, 4, 4, 0.6)";
      ctx.lineWidth = 11 * s;
      traccia();
      ctx.stroke();
      ctx.strokeStyle = "#ff4a36";
      ctx.lineWidth = 5.5 * s;
      traccia();
      ctx.stroke();
      // la punta, nella direzione della curva
      const [hx, hy] = punto(p);
      const tx = 2 * (1 - p) * (mx - ax) + 2 * p * (bx - mx), ty = 2 * (1 - p) * (my - ay) + 2 * p * (by - my);
      const tl = Math.hypot(tx, ty) || 1;
      const px = tx / tl, py = ty / tl, l = 21 * s, k = 11 * s;
      ctx.beginPath();
      ctx.moveTo(hx + px * l * 0.6, hy + py * l * 0.6);
      ctx.lineTo(hx - px * l * 0.6 - py * k, hy - py * l * 0.6 + px * k);
      ctx.lineTo(hx - px * l * 0.6 + py * k, hy - py * l * 0.6 - px * k);
      ctx.closePath();
      ctx.lineWidth = 4 * s;
      ctx.strokeStyle = "rgba(20, 4, 4, 0.6)";
      ctx.stroke();
      ctx.fillStyle = "#ff4a36";
      ctx.fill();
      if (p < 1) continue;
      ctx.strokeStyle = "rgba(255, 74, 54, 0.85)";
      ctx.lineWidth = 4 * s;
      ctx.beginPath();
      ctx.ellipse(c1.ex * w, c1.ey * h, c1.rx * w * 1.2, c1.ry * h * 1.2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
  ctx.restore();
}

function giornaleDomani() {
  const n = S.notte;
  const presi = n.portati;
  let titolo = T("Un altro giorno di paura");
  let sommario = T("Il medico ha girato per il paese fino al coprifuoco. Nessuno sa ancora quante case visiterà domani.");
  if (presi.includes("giovane")) {
    titolo = T("Portata via una ragazza sana");
    sommario = T("La famiglia della casa 5: «Aveva solo freddo». La Panacea: «Procedura corretta».");
  } else if (presi.includes("figlia")) {
    titolo = T("Portata via la figlia del meccanico");
    sommario = T("«Stava bene», giurano i vicini. La ditta non risponde.");
  } else if (n.ospite) {
    const nome = D.PERSONE[n.ospite.chi].nome;
    titolo = n.ospite.malato ? T("Il medico si porta a casa un malato") : T`Il medico ospita ${nome}`;
    sommario = n.ospite.malato ? T("Lo hanno visto entrare con lui sopra il bar. «Così ci ammaliamo tutti», dice il barista.")
      : T("«Chi dorme solo, il malvento se lo prende», dicono in paese. Qualcuno ride, qualcuno no.");
  } else if (S.forzate.casa3) {
    titolo = T("Il medico entra con la forza");
    sommario = T("Alla casa 3 ha spinto via il padrone di casa per entrare nel corridoio.");
  } else if (n.contagiate.length) {
    titolo = T("La peste si allarga");
    sommario = T`Nuovi malati nelle case ${n.contagiate.map((c) => D.CASE[c].n).join(", ")}.`;
  } else if (Object.values(S.decisioni).some((d) => d.provvedimento === "chiudi")) {
    titolo = T("Croci sulle porte");
    sommario = T("Il medico ha chiuso delle case. In paese c'è chi applaude e chi sputa per terra.");
  }
  const umore = n.fiducia >= 60 ? T("«Almeno qualcuno fa qualcosa», dicono al bar.")
    : n.fiducia >= 35 ? T("Al bar si parla solo del medico. Nessuno gli si siede vicino.")
      : T("Sul muro della chiesa, stanotte, qualcuno ha scritto: IL MEDICO È LA PESTE.");
  return {
    testata: T("LA VOCE"), data: T("Foglio del paese · martedì 27 ottobre"), titolo, sommario,
    articolo: umore,
    lettera: n.ospite ? T("«Le case dove entra lui si ammalano. Contate.» Lettera non firmata.")
      : T("«Ha dormito solo. Chi dorme solo, il malvento se lo prende.» Lettera non firmata."),
    breve: T("La Panacea annuncia un premio di produzione per il medico."),
    pubblicita: T("PANACEA · Ci prendiamo cura di voi."),
    didascalia: T("Il medico, ieri, davanti a una delle case segnalate."),
  };
}

// le diagnosi timbrate sugli stati di famiglia di un giorno, contro com'era davvero
function confronto(diagnosi, morti, anagrafe, persone, altri) {
  const stati = { sano: T("sano"), malato: T("malato"), grave: T("grave"), mostro: T("diventato un mostro"), lazzaretto: T("nel recinto") };
  const ul = el("ul");
  let giuste = 0, date = 0;
  for (const A of Object.values(anagrafe)) {
    for (const r of A.righe) {
      const vero = persone[r.persona]?.stato || altri[r.persona]?.stato;
      const mio = diagnosi[r.persona];
      // chi era diventato un mostro e lo hai segnato (il timbro sullo stato di famiglia)
      if (vero === "mostro" && morti[r.persona] && persone[r.persona]) {
        date++; giuste++;
        ul.append(el("li", null, T`✓ ${r.nome}: l'hai ${r.donna ? T("trovata cambiata") : T("trovato cambiato")}, un mostro.`));
        continue;
      }
      if (!mio) continue;
      date++;
      const giusta = mio === vero || (mio === "sospetto" && vero !== "sano" && vero !== "mostro");
      if (giusta) giuste++;
      ul.append(el("li", null, T`${giusta ? "✓" : "✗"} ${r.nome}: hai timbrato ${D.TIMBRI.find((t) => t.id === mio).testo}, era ${stati[vero] || vero}.`));
    }
  }
  return { giuste, date, ul };
}

const VERITA1 = [
  T("Casa 3: il padre era malato (febbre, bubbone al collo). La madre era grave, nascosta in camera, con le dita nere. La figlia era sana."),
  T("Il nonno della casa 3 non era morto: una settimana fa si è alzato dal letto, cambiato, ed è uscito scalzo. È uno di quelli che la ditta cerca di notte."),
  T("Casa 5: l'uomo aveva la febbre, il contagio era all'inizio. La ragazza era sana: pallida per il freddo e la fame, non per la peste. La nonna era sana. Dietro la porta c'era il figlio, grave."),
  T("Il protocollo mentiva sul pallore, e la ditta paga di più per i giovani sani."),
  T("La nonna e il nastro 7 dicono la stessa cosa: la peste arriva con il medico."),
];

const GIORNI = [T("Il primo giorno"), T("Il secondo giorno"), T("Il terzo giorno")];

// ---------- il finale della demo (29 ottobre: "chiudere la demo"): dopo la terza notte e il giornale, la quarta
// mattina. Il finale dipende da quello che hai scoperto nei tre giorni (le quattro tracce della storia), dal contagio,
// da chi hai consegnato alla ditta e dalla fiducia del paese (docs/proposta_finale.md) ----------

// le quattro tracce della storia: quando si contano trovate ("p:" una prova, "d:" una frase sentita, il resto un segno
// di S.tracce) e cosa dire se sono sfuggite
const OSPITI_FEBBRE = ["d:tornata_scottava", "d:svegliata_scottavo", "d:febbre_mattina", "d:nonna_scottava"];
const TRACCE = [
  { id: "medico", nome: T("Il medico è la peste"),
    trovata: (ha) => ha("p:maschera_1630") && ["d:leggenda", "nastro7", "d:medico6", ...OSPITI_FEBBRE].some(ha),
    sfuggita: T("Chi dorme da te, la mattina dopo scotta. E sotto la chiesa c'è una maschera come la tua.") },
  { id: "ditta", nome: T("La ditta e le cavie"), trovata: (ha) => ["p:cartella", "p:peste_lenzuola"].some(ha),
    sfuggita: T("Sotto il materasso della casa 2 c'è una cartella; nella casa 4, le lenzuola del recinto.") },
  { id: "immune", nome: T("Chi non si ammala"), trovata: (ha) => IMMUNE.some(ha),
    sfuggita: T("Nella casa 10 qualcuno ha dormito accanto a un malato e non si è ammalato.") },
  { id: "paese", nome: T("Il segreto del paese"),
    trovata: (ha) => ["p:maschera_1630", "p:canto", "p:chiave_cripta", "p:calore_cripta", "d:cripta", "d:campane_buoni"].some(ha),
    sfuggita: T("Il sacrestano della casa 7 non dice dov'è sua moglie. Ascolta dietro la porta della cantina.") },
];

// il conto dei tre giorni: le tracce trovate, le case prese dal contagio, chi hai consegnato alla ditta (com'era quel
// giorno), chi e' cambiato, le frecce del contagio di tutte e tre le notti, le notti dormite da solo, le croci sulle
// porte, e il finale che ne viene: il primo che vale, nell'ordine di docs/proposta_finale.md
function calcolaFinale() {
  const giorni = [...S.giorni, oggi()];
  const prove = new Set(giorni.flatMap((g) => g.prove || []));
  const dette = new Set(giorni.flatMap((g) => g.dette || []));
  const ha = (k) => (k.startsWith("p:") ? prove.has(k.slice(2)) : k.startsWith("d:") ? dette.has(k.slice(2)) : !!S.tracce[k]);
  const notti = giorni.map((g) => g.notte).filter(Boolean);
  const consegnati = giorni.flatMap((g) => (g.notte?.portati || []).map((id) => ({ id, ...g.persone?.[id] })));
  // chi e' cambiato: chi lo era gia' oggi, chi era grave e stanotte non e' andato nel recinto, e chi non si incontra
  // (il nonno, Paolo Serra, la madre uscita dalla finestra)
  const via = S.notte?.portati || [];
  const cambiati = Object.entries(D.PERSONE).filter(([id, p]) => p.stato === "mostro" || (p.stato === "grave" && !via.includes(id))).length
    + Object.entries(D.ALTRI || {}).filter(([id, a]) => a.stato === "mostro" && !D.PERSONE[id]).length;
  const f = { ha, tracce: Object.fromEntries(TRACCE.map((t) => [t.id, t.trovata(ha)])), consegnati, cambiati,
    prese: [...new Set(notti.flatMap((n) => n.contagiate || []))], diffusione: notti.flatMap((n) => n.diffusione || []),
    sani: consegnati.filter((p) => p.stato === "sano").length, profili: consegnati.filter((p) => p.profilo).length,
    giona: consegnati.some((p) => p.id === "giona"),
    // le notti senza ospite (alla terza da solo la cosa nera ti porta nella stanzetta) e le porte segnate con la croce
    soli: notti.filter((n) => !n.ospite).length, croci: giorni.reduce((s, g) => s + (g.croci || 0), 0) };
  f.tutte = TRACCE.every((t) => f.tracce[t.id]);
  // la corriera: chi non si ammala e' ancora in paese e ha dormito da te l'ultima notte, e sai cosa ne farebbe la ditta
  f.corriera = f.tracce.immune && f.tracce.ditta && S.notte?.ospite?.chi === "nuora";
  f.id = f.tracce.medico ? "verita" : f.corriera ? "corriera" : !f.prese.length ? "ferma" : f.soli >= 3 ? "stanzetta"
    : f.prese.length >= 6 ? "cambiano" : consegnati.length >= 6 && f.profili >= 2 ? "direttore"
      : S.fiducia >= 75 && !f.sani ? "rocco" : consegnati.length >= 4 ? "premio" : S.fiducia < 30 ? "croce"
        : consegnati.length ? "quarto" : "furgone";
  return f;
}

const quante = (n, una, tante) => (n === 1 ? una : `${n} ${tante}`);
const elenco = (v) => (v.length > 1 ? T`${v.slice(0, -1).join(", ")} e ${v[v.length - 1]}` : v[0] || "");
// la luce della quarta mattina, nella stanza (il colore venuto dallo spazio)
const COLORE_MATTINA = T("Nella stanza c'è una luce di un colore che non ha nome, e non viene dalla finestra.");

// i finali (29 ottobre: "tanti finali diversi, alcuni difficili, almeno 6 nella demo"), nell'ordine della lista dei
// finali trovati: il titolo, l'indizio per chi non l'ha ancora visto e le righe. "fax", "cripta", "mute", "via",
// "pagina" e "corriera" si scelgono alla scrivania, dopo aver capito che il medico e' la peste
const FINALI = {
  fax: { titolo: T("Medico 6"), indizio: T("Capisci chi sei, e scrivilo alla ditta."), righe: () => [
    T("Scrivi sul fax tutto quello che sai: la lente d'ottone, gli ospiti che la mattina scottavano, le case dove entri tu."),
    T("Mezz'ora dopo il fax risponde, coi timbri: PRESO ATTO. PROSEGUA. Nuova destinazione: Valcupa, 31 case."),
    T("Lo sapevano dal primo giorno. Ti hanno mandato apposta.")] },
  cripta: { titolo: T("Le campane"), indizio: T("Capisci chi sei, e scendi nella cripta."), righe: () => [
    T("Prendi la chiave nera e scendi. Le candele sono ancora accese, e la santa di cera canta a bocca chiusa."),
    T("Nella nicchia accanto alla sua c'è posto. Ti metti la maschera del 1630 e ti siedi."),
    T("Giona suona le campane tutta la notte, e tutte le notti dopo. A Malvento non si ammala più nessuno."),
    T("Nella stanza vuota, per tre giorni, suona il fax della Panacea.")] },
  mute: { titolo: T("Le campane mute"), indizio: T("Scendi nella cripta quando le campane non suonano più."), righe: () => [
    T("Prendi la chiave nera e scendi. Le candele sono ancora accese, e la santa di cera canta a bocca chiusa."),
    T("Nella nicchia accanto alla sua c'è posto. Ti metti la maschera del 1630 e ti siedi."),
    T("Ma le campane tacciono: Giona è nel recinto, e nessuno sale sul campanile."),
    T("Al buio, nelle nicchie, qualcuno apre gli occhi. Sono più di quanti credevi.")] },
  via: { titolo: T("Senza maschera"), indizio: T("Capisci chi sei, e vattene."), righe: () => [
    T("Lasci la maschera sulla scrivania, con la videocamera accesa, e all'alba te ne vai a piedi per la Strada del Cimitero."),
    T("Senza il becco nessuno ti riconosce. Il nastro riprende la stanza vuota per sei ore."),
    T("A valle, nel primo paese, una donna ti offre un caffè. Il malvento cammina con te.")] },
  pagina: { titolo: T("La prima pagina"), indizio: T("Trova tutte e quattro le tracce, e portale alla Voce."), righe: () => [
    T("Al giornale ti ascoltano fino a sera, e fermano la macchina per te. La mattina dopo la Voce esce in edizione straordinaria."),
    T("Il recinto apre i cancelli. I parenti entrano a cercare i loro, e il furgone bianco riparte vuoto per Valcupa."),
    T("A sera bussano alla tua porta, con le lanterne. Ti accompagnano giù nella cripta, gentili, come fecero nel 1630."),
    T("La nicchia accanto alla santa di cera è pronta. Il malvento resta a Malvento, con te.")] },
  corriera: { titolo: T("La corriera"), indizio: T("Chi non si ammala deve dormire da te l'ultima notte."), righe: () => [
    T("All'alba svegli la nuora nella stanzetta. Le dai il tuo cappotto e i soldi che ti restano, e non le dici perché."),
    T("Aspettate la corriera delle sei alla fermata della Strada del Cimitero. Lei stringe la fede di Paolo, sulla catenina."),
    T("Sale, si siede in fondo e non si volta. Alle sette il furgone bianco si ferma davanti alla casa 10, e riparte vuoto."),
    T("Senza di lei la ditta non avrà il suo vaccino. E nemmeno Malvento.")] },
  ferma: { titolo: T("Il malvento si ferma"), indizio: T("Tre notti senza nessuna casa presa dal contagio."), righe: (f) => [
    T("In tre notti il contagio non è uscito da nessuna casa. Il malvento si è fermato."),
    f.croci >= 3 ? T`Ti sono servite ${f.croci} croci: Malvento è un paese di porte segnate, e dietro ognuna una famiglia aspetta che tu torni ad aprire.`
      : T("Hai portato via i malati prima di sera, ogni giorno, e hai chiuso le porte giuste."),
    T("La quarta mattina il paese tace. Nessuno tossisce, nessuno chiama."),
    f.croci ? T("Di notte, dietro le porte con la croce, qualcuno gratta il legno. Piano, con le unghie lunghe.")
      : T("Di notte, nel recinto, qualcuno gratta il legno delle brande. Piano, con le unghie lunghe.")] },
  stanzetta: { titolo: T("La stanzetta"), indizio: T("Dormi da solo tutte e tre le notti."),
    mattina: [T("Ti svegli sulla brandina della stanzetta, sotto la coperta. Non ricordi di esserci venuto."),
      T`Torni di là. ${COLORE_MATTINA}`], righe: () => [
    T("Dal tuo letto alla brandina, sul pavimento, ci sono impronte nere di piedi nudi. Lunghi."),
    T("Sul nastro la cosa nera ti porta di là in braccio, come un bambino. Non ha faccia: solo le mani."),
    T("Ti guardi le mani. Le dita sono più lunghe di ieri, e le unghie nere.")] },
  cambiano: { titolo: T("Quelli che cambiano"), indizio: T("Lascia correre il contagio."),
    mattina: [T("Il fax non suona: la linea è muta."), COLORE_MATTINA], righe: (f) => [
    T`In tre notti il contagio ha preso ${quante(f.prese.length, T("una casa"), T("case"))}, e ${quante(f.cambiati, T("una persona è cambiata"), T("persone sono cambiate"))}.`,
    T("Di giorno il paese è vuoto, le porte segnate con la croce. Di notte, lungo i muri, camminano quelli che cambiano."),
    T("Dalla strada, qualcuno guarda la tua finestra. Non bussa.")] },
  direttore: { titolo: T("Direttore del recinto"), indizio: T("Consegna alla ditta sei persone, e almeno due col profilo che cerca."), righe: (f) => [
    T`Hai consegnato alla ditta ${f.consegnati.length} persone, e ${f.profili} avevano il profilo che cerca. Nessun medico prima di te aveva fatto tanto.`,
    T("La quarta mattina il furgone bianco viene a prendere te, e ti fa sedere davanti: il tuo ufficio è nella baracca 1, dentro il recinto."),
    T("Dalla finestra si vedono le brande in fila. Da una, qualcuno ti saluta con la mano: ha le dita nere."),
    T("Sulla porta c'è già la targa: DIRETTORE. Sotto, a pennarello: MEDICO 6.")] },
  rocco: { titolo: T("San Rocco"), indizio: T("Fatti amare dal paese, senza consegnare un sano."),
    mattina: [COLORE_MATTINA, T("In strada, sotto la finestra, passa la processione: il santo col bastone e il cane, portato a spalla.")],
    righe: (f) => [
    T("Davanti alla tua porta si ferma. Le vecchie lasciano pane, uova e un santino nuovo: al posto del santo c'è un medico col becco."),
    f.giona ? T("Le campane tacciono, ma il paese canta lo stesso.") : T("Giona suona a festa."),
    T("Il paese si fida di te: ti apre tutte le porte, anche quelle con la croce. Il malvento entra con te in ogni casa.")] },
  premio: { titolo: T("Premio di produzione"), indizio: T("Consegna alla ditta quattro persone."), righe: (f) => [
    T("Prepari la valigia. Dalla finestra vedi il furgone bianco davanti al recinto."),
    T`Hai consegnato alla ditta ${f.consegnati.length} persone${f.sani ? `, ${quante(f.sani, T("una sana"), T("sane"))}` : ""}.`,
    S.fiducia < 30 ? T("Sulla porta qualcuno ha inchiodato una croce di legno. Nessuno ti saluta.") : T("Nessuno ti saluta."),
    T("A Valcupa, ancora, nessuno sa niente.")] },
  croce: { titolo: T("La croce sulla porta"), indizio: T("Perdi la fiducia del paese."), righe: () => [
    T("La quarta mattina la porta non si apre: è inchiodata da fuori, con una croce di legno."),
    T("Il paese ti ha chiuso dentro, come tu chiudevi le case."),
    T("Il fax della ditta arriva alle nove: rendimento insufficiente. Ti sostituirà il Medico 7."),
    T("Di notte, sotto la porta, qualcuno respira.")] },
  furgone: { titolo: T("Il furgone bianco"), indizio: T("Non consegnare nessuno alla ditta."), righe: () => [
    T("In tre giorni non hai consegnato nessuno alla ditta."),
    T("Alle sette il furgone bianco si ferma sotto la tua finestra. Scendono due uomini con la tuta e la mascherina."),
    T("Ti chiamano dottore, con gentilezza. Ti dicono di portare anche la maschera: «Serve a noi»."),
    T("Nel recinto ti danno la branda numero 6 e un prelievo ogni ora. La cavia migliore, per la ditta, sei tu.")] },
  quarto: { titolo: T("Il quarto giorno"), indizio: T("Arriva alla quarta mattina senza niente di tutto questo."), righe: (f) => [
    T("Il fax del quarto giorno arriva a mezzogiorno, come sempre."),
    f.prese.length ? T`In tre notti il contagio ha preso ${quante(f.prese.length, T("una casa"), T("case"))}.` : T("In tre notti il contagio non è uscito dalle case."),
    T("Il paese ti apre ancora la porta, ma ti guarda le mani."),
    T("La giornata comincia. Qui finisce la demo: la peste no.")] },
};

// il giudizio della ditta alla quarta mattina: il timbro e sotto due righe (chi non e' qui non riceve il fax)
const GIUDIZI = {
  fax: [T("PRESO ATTO · PROSEGUA"), T("NUOVA DESTINAZIONE: VALCUPA · 31 CASE")],
  corriera: [T("SOGGETTO 0 IRREPERIBILE"), T("IL MEDICO 6 È PREGATO DI RINTRACCIARLO"), T("PREMIO: 5.000 €")],
  ferma: [T("CONTENIMENTO ESEMPLARE"), T("CONSEGNE SOTTO L'OBIETTIVO"), T("SI RACCOMANDA PIÙ ELASTICITÀ")],
  direttore: [T("PROMOZIONE"), T("RESPONSABILE DEL RECINTO DI MALVENTO"), T("UFFICIO: BARACCA 1 · DA OGGI")],
  premio: [T("PREMIO DI PRODUZIONE"), T("TRASFERIMENTO: VALCUPA · 31 CASE"), T("IL FURGONE PASSA ALLE 7:00")],
  croce: [T("RENDIMENTO INSUFFICIENTE"), T("SOSTITUZIONE: MEDICO 7")],
  furgone: [T("RENDIMENTO NULLO"), T("IL MEDICO 6 RIENTRA AL RECINTO PER CONTROLLI"), T("IL FURGONE PASSA ALLE 7:00")],
  quarto: [T("PROSEGUA"), T("PROTOCOLLO DEL GIORNO 4 IN ARRIVO")],
};

// i finali visti, in questo browser; senza memoria del browser valgono quelli di questa partita
const FINALI_VISTI = "malvento.finali";
const vistiQui = new Set();

function finaliTrovati() {
  let visti = [];
  try {
    visti = JSON.parse(localStorage.getItem(FINALI_VISTI) || "[]");
  } catch {
    visti = [];
  }
  return new Set([...(Array.isArray(visti) ? visti : []), ...vistiQui].filter((id) => FINALI[id]));
}

// segna il finale tra quelli visti; vero se e' la prima volta
function segnaFinale(id) {
  const nuovo = !finaliTrovati().has(id);
  vistiQui.add(id);
  try {
    localStorage.setItem(FINALI_VISTI, JSON.stringify([...finaliTrovati()]));
  } catch {
    // niente memoria: resta in vistiQui
  }
  return nuovo;
}

// la quarta mattina comincia nella stanza, vista dalla porta, ferma: la luce ha un colore che non ha nome (29 ottobre:
// "Il colore venuto dallo spazio nella quarta mattina esclusivamente"). Chi ha capito che il medico e' la peste sceglie
// cosa fare; agli altri arriva il fax della ditta, o non arriva (la linea e' muta), poi il finale
function quartaMattina() {
  R.contagio = null;
  const f = R.finale = calcolaFinale();
  foglio.dataset.bloccato = "1";
  S.fase = "mattina";
  S.giornale = S.giornaleDomani || S.giornale;
  if (stanza) {
    // la stanza ferma, vista dalla porta all'altezza degli occhi: la finestra, la scrivania, il letto
    vaiStanza("inizio");
    stanza.nebbia("colore");
    stanza.inquadra([0.9, 1.62, 2.2], [-0.8, 1.2, -3.0], 62);
    tasti();
  } else vaiScrivania();
  hud.replaceChildren();
  aiuto(null);
  if (f.id === "verita") capisci(f);
  else if (GIUDIZI[f.id]) concludi(f, f.id);
  else apriFoglio("finale", [el("h2", null, T("La quarta mattina")), ...FINALI[f.id].mattina.map((r) => el("p", null, r)),
    azioni([[T("Avanti"), () => apriFinale(f, f.id)]])]);
}

// dopo la scelta (o subito): il fax della ditta, se ha qualcosa da dire, poi il finale. La prima pagina passa prima
// dall'edizione straordinaria della Voce
function concludi(f, chi) {
  if (chi === "pagina") apriGiornale(false, primaPagina(f), [T("Avanti"), () => apriFinale(f, chi)]);
  else if (GIUDIZI[chi]) faxFinale(f, chi, () => apriFinale(f, chi));
  else apriFinale(f, chi);
}

// l'edizione straordinaria della Voce, il giorno dopo la quarta mattina
function primaPagina(f) {
  const prove = elenco([f.ha("p:cartella") && T("la cartella della Panacea"), f.ha("p:peste_lenzuola") && T("le lenzuola del recinto"),
    T("i nastri"), T("la maschera del 1630")].filter(Boolean));
  return {
    testata: T("LA VOCE"), data: T("Edizione straordinaria · venerdì 30 ottobre"), titolo: T("Il medico è la peste"),
    sommario: T`Il Medico 6 porta alla Voce le sue prove: ${prove}. Il recinto apre i cancelli.`,
    articolo: T("Nel recinto della Panacea i malati sono cavie: la ditta cerca chi non si ammala, per farne un vaccino. E il medico che manda di paese in paese porta il contagio senza saperlo: le case dove entra si ammalano. La Panacea smentisce."),
    lettera: T("«Lo sapevamo dal 1630. Adesso lo sa anche lui, e sa dove deve stare.» Lettera non firmata."),
    breve: T("Stanotte il furgone bianco è ripartito vuoto per Valcupa."),
    pubblicita: T("PANACEA · Smentiamo tutto. Ci prendiamo cura di voi."),
    didascalia: T("Il Medico 6, ieri, alla redazione della Voce."),
  };
}

// il fax della ditta: il rendimento a simboli (consegnati, profili, case prese) e il timbro del giudizio
function faxFinale(f, chi, poi) {
  suoni.suona("fax");
  const [timbro, ...righe] = GIUDIZI[chi];
  const resa = el("div", "fx-fila");
  resa.append(segnoFax("moneta", String(f.consegnati.length), T("consegnati"), "piccolo"),
    segnoFax("mirino", String(f.profili), T("profili"), "piccolo"), segnoFax("casa", String(f.prese.length), T("case prese"), "piccolo"));
  const esito = el("div", "fx-esito");
  esito.append(el("p", "fx-timbro", timbro), ...righe.map((r) => el("p", null, r)));
  const riga = el("div", "fx-riga");
  riga.append(bloccoFax(T("RENDIMENTO"), resa), bloccoFax(T("ESITO"), esito));
  apriFoglio("fax", [testaFax(T("COMUNICAZIONE · MEDICO 6")), riga, el("p", "fx-motto", T("PANACEA · Ci prendiamo cura di voi.")),
    azioni([[T("Avanti"), poi]])]);
}

// hai capito: alla scrivania, davanti alla maschera, torna in mente quello che hai trovato; poi cosa fai. Chi ha
// trovato tutte e quattro le tracce puo' portarle alla Voce; chi ha la nuora nella stanzetta puo' portarla alla corriera
function capisci(f) {
  const righe = [COLORE_MATTINA, T("Sulla scrivania la maschera è dove l'hai lasciata, con la videocamera spenta."),
    T("La sua lente d'ottone è la stessa della maschera nella cripta. Il medico del 1630 portò il malvento a Malvento."),
    ...(f.ha("d:leggenda") ? [T("La nonna l'aveva detto il primo giorno: la peste arrivò col medico.")] : []),
    ...(f.ha("nastro7") ? [T("Il nastro 7: «...le case dove entra lui...».")] : []),
    ...(OSPITI_FEBBRE.some(f.ha) ? [T("Chi ha dormito da te, la mattina dopo scottava.")] : []),
    ...(f.ha("d:medico6") ? [T("Per la ditta sei il Medico 6. Prima di te ce ne sono stati cinque.")] : [])];
  const scelta = (titolo, nota, fn, rara) => {
    const b = el("button", rara ? "fn-scelta fn-rara" : "fn-scelta");
    b.type = "button";
    b.append(el("b", null, titolo), el("small", null, nota));
    b.addEventListener("click", (e) => { e.stopPropagation(); fn(); });
    return b;
  };
  const scelte = el("div", "azioni fn-scelte");
  scelte.append(scelta(T("Scrivi alla ditta"), T("Il fax è sulla scrivania."), () => concludi(f, "fax")),
    scelta(T("Scendi nella cripta"), T("La chiave nera è al chiodo, in sacrestia."), () => concludi(f, f.giona ? "mute" : "cripta")),
    scelta(T("Vai via senza maschera"), T("La porta non è chiusa a chiave."), () => concludi(f, "via")));
  if (f.tutte) scelte.append(scelta(T("Porta tutto alla Voce"), T("Hai trovato tutte e quattro le tracce."), () => concludi(f, "pagina"), true));
  if (f.corriera) scelte.append(scelta(T("Accompagna la nuora alla corriera"), T("Ha dormito nella stanzetta, e non si ammala."),
    () => concludi(f, "corriera"), true));
  apriFoglio("finale", [el("h2", null, T("La quarta mattina")), ...righe.map((r) => el("p", null, r)),
    el("p", "fn-forte", T("Il medico della peste è la peste.")), el("h3", "fn-domanda", T("Cosa fai?")), scelte]);
}

// il finale: sulla mappa i tre giorni di contagio (le frecce di tutte e tre le notti, le case prese in rosso), accanto
// il foglio col titolo, quanti finali hai trovato, poche righe e i numeri; poi com'era davvero
function apriFinale(f, chi) {
  const E = FINALI[chi];
  f.chi = chi;
  const nuovo = segnaFinale(chi);
  const visti = finaliTrovati().size;
  S.schermo = "notte";
  R.contagio = { diffusione: f.diffusione, prese: f.prese, t0: performance.now() };
  vaiMappa();
  hud.replaceChildren();
  aiuto(null);
  mostraIndicatori(null);
  schermo.classList.add("contagio");
  foglio.dataset.bloccato = "1";
  apriFoglio("finale", [el("p", "fn-conta", T`${nuovo ? T("Nuovo finale") : T("Finale")} · ${visti} su ${Object.keys(FINALI).length}`),
    el("h2", null, E.titolo), ...E.righe(f).map((r) => el("p", null, r)), numeri(f),
    azioni([[T("Com'era davvero"), verita], [T("Ricomincia dal primo giorno"), ricomincia, "secondario"]])]);
  inquadraContagio(f);
  animaContagio();
}

// i numeri dei tre giorni
function numeri(f) {
  const ul = el("ul", "fn-numeri");
  const riga = (nome, valore) => {
    const li = el("li");
    li.append(el("b", null, nome), document.createTextNode(valore));
    return li;
  };
  ul.append(riga(T("Case prese "), String(f.prese.length)), riga(T("Cambiati "), String(f.cambiati)),
    riga(T("Alla ditta "), `${f.consegnati.length}${f.sani ? ` (${quante(f.sani, T("una sana"), T("sane"))})` : ""}`),
    riga(T("Soldi "), `${S.soldi} €`),
    riga(T("Il paese "), S.fiducia >= 60 ? T("ti apre la porta") : S.fiducia >= 35 ? T("ti guarda storto") : T("ti chiude la porta")));
  return ul;
}

// tutti i finali: quelli visti col titolo, gli altri con un indizio
function elencoFinali(f) {
  const visti = finaliTrovati();
  const ul = el("ul", "fn-finali");
  for (const [id, E] of Object.entries(FINALI)) {
    const li = el("li", visti.has(id) ? (id === f?.chi ? "visto ora" : "visto") : "nascosto");
    li.append(el("b", null, visti.has(id) ? E.titolo : "???"));
    if (!visti.has(id)) li.append(el("small", null, E.indizio));
    ul.append(li);
  }
  return [el("h3", null, T`I finali: ${visti.size} su ${Object.keys(FINALI).length}`), ul];
}

function verita() {
  const corpo = [el("h2", null, T("Com'era davvero"))];
  // alla fine della demo, prima di tutto le quattro tracce della storia (trovate, o un indizio) e i numeri
  if (S.giorno === 3) {
    const f = R.finale || calcolaFinale();
    const ul = el("ul", "fn-tracce");
    for (const t of TRACCE) {
      const li = el("li", f.tracce[t.id] ? "trovata" : "sfuggita");
      li.append(el("b", null, `${f.tracce[t.id] ? "✓" : "✗"} ${t.nome}`));
      if (!f.tracce[t.id]) li.append(el("small", null, T`Ti è sfuggita. ${t.sfuggita}`));
      ul.append(li);
    }
    corpo.push(el("h3", null, T`Le quattro tracce: ${Object.values(f.tracce).filter(Boolean).length} su 4`), ul,
      el("h3", null, T("In tre giorni")), numeri(f), ...elencoFinali(f));
  }
  // i giorni: quelli passati (archiviati) e oggi
  const giorni = [...S.giorni, oggi()];
  let tutte = 0, tutteDate = 0;
  for (const g of giorni) {
    if (giorni.length > 1) corpo.push(el("h3", null, GIORNI[g.giorno - 1]));
    const ul = el("ul");
    for (const t of [() => VERITA1, verita2, verita3][g.giorno - 1](g.ieri)) ul.append(el("li", null, t));
    corpo.push(ul);
    if (g.saltato) corpo.push(el("p", "nota", T`${GIORNI[g.giorno - 1]} l'hai saltato: come se nessuno fosse andato al lazzaretto, e senza ospiti.`));
    const { giuste, date, ul: dg } = confronto(g.diagnosi, g.morti, g.anagrafe, g.persone, g.altri);
    tutte += giuste;
    tutteDate += date;
    corpo.push(el("h3", null, T`Le tue diagnosi: ${giuste} giuste su ${date}`));
    if (date) corpo.push(dg);
    else corpo.push(el("p", "vuoto", T("Non hai timbrato nessuno stato di famiglia.")));
  }
  if (giorni.length > 1) corpo.push(el("p", "nota", T`In tutto: ${tutte} giuste su ${tutteDate}.`));
  corpo.push(el("p", "nota", [
    T("Fine del prototipo: una giornata. Nel gioco, domani torneresti alla casa 5 con le prove."),
    T("Fine della bozza: due giornate. Nel gioco, domani torneresti alla casa 5, dove il ragazzo è giù in cantina, e alla casa 10, dove la ditta cerca chi non si ammala."),
    T("Fine della demo: tre giorni a Malvento. Dal titolo, «Continua» riporta alla terza mattina, per cercare gli altri finali."),
  ][S.giorno - 1]));
  corpo.push(azioni([[T("Ricomincia dal primo giorno"), ricomincia]]));
  apriFoglio("verita", corpo);
}

// un giorno nuovo (bozza): le tabelle del giorno (giorno2.js, giorno3.js), calcolate dalle scelte dei giorni prima,
// prendono il posto di quelle di dati.js; dello stato restano i soldi, la fiducia, la notte (il contagio sulla mappa),
// il giornale di stamattina e chi e' diventato un mostro. Il giorno di oggi va tra i giorni passati, per la verita'
// il giorno di oggi, da mettere tra i giorni passati: per la verita' le diagnosi e com'era davvero, per il finale le
// prove trovate, le frasi sentite e la notte
function oggi() {
  return { giorno: S.giorno, diagnosi: S.diagnosi, morti: S.morti, ieri: S.ieri, saltato: S.saltato, anagrafe: D.ANAGRAFE,
    persone: D.PERSONE, altri: D.ALTRI, prove: [...S.prove], dette: Object.keys(S.dette), notte: S.notte,
    croci: Object.values(S.decisioni).filter((d) => d.provvedimento === "chiudi").length };
}

function nuovoGiorno(n, tabelle, ieri) {
  const giorni = [...S.giorni, oggi()];
  const resta = { soldi: S.soldi, fiducia: S.fiducia, notte: S.notte, giornale: S.giornaleDomani, morti: { ...S.morti },
    tracce: { ...S.tracce } };
  D = { ...D1, ...tabelle };
  S = Object.assign(nuovoStato(), resta, { giorno: n, giorni, ieri });
}

// il giorno nuovo comincia: le scene di oggi (con chi e' rimasto in casa) e i primi piani nuovi; sul telefono ci
// vuole qualche secondo
async function apriGiorno() {
  foglio.dataset.bloccato = "0";
  foglio.hidden = true;
  stanza?.nebbia("stanza");
  R.contagio = null;
  R.play = null;
  R.primo = null;
  R.scelta = null;
  parole.scrivi(null, T("Riavvolgo i nastri…"), { lato: "sotto" }, {}, { veloce: true });
  try {
    await apriPacchi();
    if (visitaPronta && !visita) await visitaPronta;
    // le visite in plastilina (#creta) arrivano al secondo giorno: dal terzo si torna alle scene 2D
    if (visita && S.giorno >= 3) {
      visita = null;
      visitaPronta = null;
    }
    if (visita) await visita.prepara(D.LUOGHI);
    else await caricaLuoghi(D.LUOGHI);
  } catch (err) {
    notifica(T`Le scene del ${["", "", T("secondo"), T("terzo")][S.giorno]} giorno non si caricano`);
    console.error(err);
  }
  parole.pulisci();
  precaricaPrimi();
  aggiornaNastro();
  if (stanza) vaiStanza("inizio");
  else vaiScrivania();
  salvaPartita();
  introduzione();
}

// il secondo giorno: chi e' andato al lazzaretto, chi ha dormito dal medico, dove e' passato il contagio
async function iniziaGiorno2() {
  const ieri = { via: Object.values(S.decisioni).flatMap((d) => d.via), ospite: S.ospite, contagiate: S.notte?.contagiate || [] };
  nuovoGiorno(2, giorno2(ieri), ieri);
  await apriGiorno();
}

// il terzo giorno: lo stesso per il secondo, e in piu' quello che hai scritto ieri sugli stati di famiglia (le note a
// penna non barrate, "persona:id"), perche' la ditta lo legge
async function iniziaGiorno3() {
  const scritto = Object.entries(S.note).flatMap(([persona, l]) => l.filter((n) => !n.barrata).map((n) => `${persona}:${n.id}`));
  const ieri = { ...S.ieri, via2: Object.values(S.decisioni).flatMap((d) => d.via), ospite2: S.ospite,
    contagiate2: S.notte?.contagiate || [], scritto };
  nuovoGiorno(3, giorno3(ieri), ieri);
  await apriGiorno();
}

// la giornata di oggi chiusa senza nessuno al lazzaretto e senza ospiti, per saltarla (#giorno2, #giorno3)
function saltaGiorno() {
  S.saltato = true;
  for (const n of D.FAX.case) {
    S.visitate[`casa${n}`] = true;
    S.decisioni[`casa${n}`] = { via: [], ospite: null, provvedimento: "nessuno", ora: D.INIZIO.coprifuoco };
  }
  S.notte = calcolaNotte();
  S.soldi += S.notte.incasso - S.notte.spese;
  S.fiducia = S.notte.fiducia;
}

// il secondo giorno come se il primo fosse finito senza nessuno al lazzaretto e senza ospiti (con #giorno2)
function saltaAlGiorno2() {
  saltaGiorno();
  S.giornaleDomani = giornaleDomani();
  return iniziaGiorno2();
}

// il terzo giorno come se i primi due fossero finiti cosi' (con #giorno3)
function saltaAlGiorno3() {
  saltaGiorno();
  S.giornaleDomani = giornaleDomani();
  const ieri = { via: [], ospite: null, contagiate: S.notte.contagiate };
  nuovoGiorno(2, giorno2(ieri), ieri);
  saltaGiorno();
  S.giornaleDomani = giornale3(S.notte, S);
  return iniziaGiorno3();
}

function ricomincia() {
  D = { ...D1 };
  S = nuovoStato();
  foglio.dataset.bloccato = "0";
  foglio.hidden = true;
  stanza?.nebbia("stanza");
  R.contagio = null;
  R.finale = null;
  R.play = null;
  aggiornaNastro();
  if (stanza) vaiStanza("inizio");
  else vaiScrivania();
  introduzione();
}

// ---------- il titolo e il salvataggio (29 ottobre, "chiudere la demo"): ogni mattina, dal secondo giorno, la
// partita si salva nel browser; dal titolo "Continua" la riprende da quella mattina, con le tabelle del giorno
// ricalcolate dalle scelte di prima (S.ieri). Senza memoria del browser si gioca lo stesso, senza salvataggi ----------

const SALVATAGGIO = "malvento.partita";
const VERSIONE = 1;

function salvaPartita() {
  if (S.giorno < 2) return;
  try {
    localStorage.setItem(SALVATAGGIO, JSON.stringify({ v: VERSIONE, S }));
  } catch {
    // niente salvataggio (memoria piena o negata): si gioca lo stesso
  }
}

function leggiSalvataggio() {
  try {
    const d = JSON.parse(localStorage.getItem(SALVATAGGIO) || "null");
    return d?.v === VERSIONE && d.S?.giorno >= 2 ? d : null;
  } catch {
    return null;
  }
}

// il titolo, sopra la stanza del medico: "Continua" (se c'e' un salvataggio) e "Nuova partita"
function titolo() {
  const salvato = leggiSalvataggio();
  const menu = el("div", "ti-menu");
  const voce = (testo, fn) => bottone(testo, () => {
    foglio.dataset.bloccato = "0";
    foglio.hidden = true;
    fn();
  }, "ti-voce");
  if (salvato) menu.append(voce(T`Continua · ${GIORNI[salvato.S.giorno - 1].toLowerCase()}`, () => riprendi(salvato)));
  // "Nuova partita" torna alla musica della stanza ("Continua" la cambia aprendo il giorno)
  menu.append(voce(T("Nuova partita"), () => { ambienteStanza(); introduzione(); }),
    voce(T("Impostazioni"), () => apriImpostazioni(true)));
  if (ELECTRON) menu.append(voce(T("Esci"), () => window.close()));
  foglio.dataset.bloccato = "1";
  const visti = finaliTrovati().size;
  // il nome del gioco (29 ottobre: «va bene malvento») resta uguale in tutte le lingue: il logo scelto, «il becco»
  // (art/logo, gioco/img/logo.webp da tools/steam.py), e il nome scritto se l'immagine non arriva
  const nome = el("h1", "ti-nome");
  const logo = new Image();
  logo.alt = "Malvento";
  logo.onerror = () => { nome.textContent = "Malvento"; };
  logo.src = "img/logo.webp";
  nome.append(logo);
  apriFoglio("titolo", [nome, el("p", "ti-sotto", T("Il medico della peste · tre giorni · demo")), menu,
    ...(visti ? [el("p", "ti-finali", T`Finali trovati: ${visti} su ${Object.keys(FINALI).length}`)] : []),
    el("p", "ti-nota", T`Il mouse gira lo sguardo, clic o E per usare, Esc libera il puntatore. Col controller: levette e A.${ELECTRON ? T(" F11 o Alt+Invio: schermo intero.") : ""}`)]);
  // il tema del titolo (29 ottobre, sera). Il browser lascia suonare solo dopo un tasto o un clic: finche' l'audio non
  // e' partito, al posto dei comandi c'e' "premi un tasto", come nei giochi; il primo tasto (o clic, o tocco) fa
  // partire il tema e mostra i comandi. Il clic che li mostra non preme anche il comando che compare sotto, e il
  // primo comando prende il fuoco solo dopo, perche' la barra spaziatica lasciata andare non lo prema
  suoni.musica("titolo");
  if (suoni.ctx?.state === "running") return menu.querySelector("button")?.focus();
  menu.hidden = true;
  const premi = el("p", "ti-premi", tocco() ? T("Tocca lo schermo") : T("Premi un tasto"));
  menu.before(premi);
  const mostra = (e) => {
    if (e.type === "click") { e.preventDefault(); e.stopPropagation(); }
    window.removeEventListener("keydown", mostra, true);
    window.removeEventListener("click", mostra, true);
    premi.remove();
    menu.hidden = false;
    setTimeout(() => { if (!foglio.hidden) menu.querySelector("button")?.focus(); }, 400);
  };
  window.addEventListener("keydown", mostra, true);
  window.addEventListener("click", mostra, true);
}

// la partita salvata: lo stato di quella mattina e le tabelle del suo giorno
function riprendi(salvato) {
  S = Object.assign(nuovoStato(), salvato.S);
  D = { ...D1, ...(S.giorno === 3 ? giorno3 : giorno2)(S.ieri) };
  return apriGiorno();
}

async function introduzione() {
  if (S.intro) return;
  S.intro = true;
  const righe = D.INTRO || [[null, T("Giorno 1. La ditta ti ha mandato in paese ieri sera.")],
    [null, T("Il fax con il protocollo è arrivato a mezzogiorno.")]];
  await dici([...righe, ...(stanza ? [[null, T("È sulla scrivania, sotto la finestra.")]] : [])], false, false);
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

// cosa c'e' sotto il puntatore: la scena, non le frasi o la raggiera sopra
function sullaScena(t) {
  return t === canvas || t === statico || t === zoneBox || t?.closest?.("#parole, #segni") && !t.closest(".chiave");
}

schermo.addEventListener("pointermove", (e) => {
  if (document.pointerLockElement) return;
  const p = punto(e);
  cursore.style.transform = `translate(${p.px}px, ${p.py}px)`;
  etichetta.style.transform = `translate(${p.px}px, ${p.py}px)`;
  // vicino al bordo destro l'etichetta passa a sinistra del puntatore, per non uscire dallo schermo
  etichetta.classList.toggle("sinistra", p.px + etichetta.offsetWidth + 40 > schermo.clientWidth);
  if (visita && S.schermo === "visita" && !R.primo) visita.guarda(p.x, p.y);
  if (S.schermo === "mappa" && e.pointerType !== "touch" && foglio.hidden) {
    if (e.target === canvas || e.target === statico || e.target === zoneBox) evidenzia(casaSotto(p.x, p.y));
    return;
  }
  if (striscia.trascina || R.scelta) return;
  if (S.schermo !== "visita" || R.occupato || R.primo || e.pointerType === "touch" || ruota.aperta()) return;
  if (!sullaScena(e.target)) {
    if (R.hoverKey) { R.hoverKey = ""; etichetta.hidden = true; if (R.hover) { R.hover = null; disegnaScena(); } }
    return;
  }
  const c = colpisci(p.x, p.y);
  const chiave = c ? `${c.persona || ""}|${c.parte || ""}|${c.zona ? c.zona.id : ""}` : "";
  if (chiave === R.hoverKey) return;
  R.hoverKey = chiave;
  R.hover = c && c.persona ? c : null;
  mostraEtichetta(testoColpo(c));
  disegnaScena();
});

schermo.addEventListener("pointerleave", () => {
  if (striscia.trascina || R.scelta) return;
  etichetta.hidden = true;
  if (S.schermo === "visita" && R.hover) { R.hover = null; disegnaScena(); }
});

schermo.addEventListener("click", (e) => {
  if (striscia.appenaTrascinato()) return;
  if (e.target.closest("button, #comandi, #hud, #nastro-frasi, #ruota, .chiave")) return;
  if (parole.occupata()) { parole.salta(); return; }
  if (R.occupato) return;
  const p = punto(e);
  if (S.schermo === "visita") cliccaVisita(p.x, p.y);
  else if (S.schermo === "nastro" && R.play) cliccaNastro(p.x, p.y);
  else if (S.schermo === "mappa" && foglio.hidden) {
    const id = casaSotto(p.x, p.y);
    if (id) scegli(id);
    else if (R.casaScelta || !schedaCasa.hidden) { scegli(null); schedaCasa.hidden = true; }
    else zoomMappa(p.x, p.y);
  }
});

foglio.addEventListener("click", (e) => {
  if (performance.now() - (R.sfTrascinato || 0) < 400) return;
  if (e.target === foglio) chiudiFoglio();
});
$("#foglio .chiudi").addEventListener("click", chiudiFoglio);

// B del controller: come Esc (chiude il foglio, la raggiera, la frase scelta, il primo piano); seduti alla
// scrivania ci si alza
function indietro() {
  if (!foglio.hidden) return chiudiFoglio();
  if (ruota.aperta()) return ruota.chiudi();
  if (R.scelta) return scegliFrase(null);
  if (R.primo) return chiudiPrimo();
  if (S.schermo === "scrivania" && stanza && !R.occupato) return vaiStanza("scrivania");
}

document.addEventListener("keydown", (e) => {
  // nel programma per Windows F11 o Alt+Invio mettono e tolgono lo schermo intero, come nei giochi (nel browser F11 e'
  // gia' del browser)
  if (ELECTRON && (e.key === "F11" || (e.key === "Enter" && e.altKey))) {
    e.preventDefault();
    schermoIntero(!document.fullscreenElement);
    return;
  }
  if (e.key === "Escape") {
    if (!foglio.hidden) return chiudiFoglio();
    if (ruota.aperta()) return ruota.chiudi();
    if (R.scelta) return scegliFrase(null);
    if (R.primo) return chiudiPrimo();
  }
  if (e.key === " " && parole.occupata() && foglio.hidden && !e.target.closest?.("button, .fot")) {
    e.preventDefault();
    parole.salta();
  }
});

// le parole chiave e il nastro delle frasi
parole.onSopraChiave = (link, span) => sopraChiave(link, span);
parole.onChiave = (link) => seguiChiave(link);
striscia.onSopra = (f, x, y, sotto) => sopraFrase(f, x, y, sotto);
striscia.onRilascio = (f, x, y, sotto) => {
  const b = bersaglioSotto(f, x, y, sotto);
  sopraFrase(null);
  if (!b) return;
  if (R.occupato) { notifica(T("Aspetta che finisca di parlare")); return; }
  contesta(f, b, b.startsWith("d:") || b.startsWith("p:") ? null : x, y);
};
striscia.onTocco = (f) => {
  if (R.scelta && R.scelta.id !== f.id) {
    // due frasi del nastro, una contro l'altra
    const prima = R.scelta;
    scegliFrase(null);
    return contesta(prima, f.id);
  }
  scegliFrase(f);
};

// lo schermo intero, l'ultima icona a destra; dove non si puo' (per esempio sull'iPhone) non c'e'
const tastoIntero = $("#schermo-intero");
function iconaIntero() {
  const dentro = !!document.fullscreenElement;
  const nome = dentro ? T("Esci dallo schermo intero") : T("Schermo intero");
  tastoIntero.querySelector(".pix")?.remove();
  tastoIntero.insertAdjacentHTML("afterbegin", icona(dentro ? "ridotto" : "intero"));
  tastoIntero.setAttribute("aria-label", nome);
  tastoIntero.querySelector(".tasto-nome").textContent = nome;
}
tastoIntero.hidden = !document.fullscreenEnabled;
iconaIntero();

// l'audio: l'altoparlante lo toglie e lo rimette (il browser se lo ricorda)
const tastoAudio = $("#audio");
function iconaAudio() {
  const nome = suoni.muto ? T("Rimetti l'audio") : T("Togli l'audio");
  tastoAudio.querySelector(".pix")?.remove();
  tastoAudio.insertAdjacentHTML("afterbegin", icona(suoni.muto ? "muto" : "audio"));
  tastoAudio.setAttribute("aria-label", nome);
  tastoAudio.querySelector(".tasto-nome").textContent = nome;
}
iconaAudio();
tastoAudio.addEventListener("click", (e) => {
  e.stopPropagation();
  suoni.silenzia(!suoni.muto);
  iconaAudio();
});
document.addEventListener("fullscreenchange", () => {
  iconaIntero();
  // le impostazioni aperte: la riga dello schermo
  for (const d of foglio.querySelectorAll(".im-scelte")) d.dispatchEvent(new Event("aggiorna"));
});
async function schermoIntero(si) {
  try {
    // tutta la pagina, non solo il gioco: i fogli (fax, giornale, stato di famiglia...) stanno fuori da #app
    if (!si && document.fullscreenElement) await document.exitFullscreen();
    else if (si && !document.fullscreenElement) await document.documentElement.requestFullscreen();
  } catch { /* non tutti i telefoni lo permettono */ }
}
tastoIntero.addEventListener("click", (e) => {
  e.stopPropagation();
  schermoIntero(!document.fullscreenElement);
});

// ---------- le impostazioni (29 ottobre, la demo da far provare ad altri): il volume, la sensibilita' dello sguardo
// (il mouse, il dito, la levetta), la qualita' della stanza 3D e lo schermo intero. Si aprono dal titolo e
// dall'ingranaggio tra le icone a comparsa, e il browser se le ricorda. Nel programma per Windows c'e' anche "Esci" ----------

const IMPOSTAZIONI = "malvento.impostazioni";
// la qualita': quanto e' larga al massimo la stanza 3D (in punti) e quanti passi fa la nebbia lungo ogni raggio;
// "bassa" e' quella di prima sui telefoni, "alta" quella di prima sul computer
const QUALITA = {
  alta: { nome: T("Alta"), larghezza: 1600, nebbia: 20 },
  media: { nome: T("Media"), larghezza: 1280, nebbia: 14 },
  bassa: { nome: T("Bassa"), larghezza: 960, nebbia: 10 },
};
// le dieci tacche della sensibilita': quanto gira lo sguardo rispetto a prima (la quinta)
const SGUARDO = [0.4, 0.55, 0.7, 0.85, 1, 1.2, 1.45, 1.75, 2.1, 2.5];
const ELECTRON = /Electron/.test(navigator.userAgent);

function leggiImpostazioni() {
  let d = {};
  try { d = JSON.parse(localStorage.getItem(IMPOSTAZIONI) || "{}") || {}; } catch { /* niente memoria: quelle di base */ }
  const tacca = (v, a, b, base) => (Number.isInteger(v) && v >= a && v <= b ? v : base);
  return {
    volume: tacca(d.volume, 0, 10, 10),
    musica: tacca(d.musica, 0, 10, 8),
    sguardo: tacca(d.sguardo, 1, SGUARDO.length, 5),
    qualita: Object.keys(QUALITA).includes(d.qualita) ? d.qualita : tocco() ? "bassa" : "alta",
  };
}

const imp = leggiImpostazioni();

function salvaImpostazioni() {
  try { localStorage.setItem(IMPOSTAZIONI, JSON.stringify(imp)); } catch { /* il browser non salva: valgono fino alla chiusura */ }
}

// la larghezza della stanza 3D: quella dello schermo, fino al massimo della qualita' scelta
function larghezza3d() {
  return window.prova?.risoluzione || Math.min(canvas.width, QUALITA[imp.qualita].larghezza);
}

function applicaImpostazioni() {
  suoni.volume((imp.volume / 10) ** 2);
  suoni.volumeMusica((imp.musica / 10) ** 2);
  if (!stanza) return;
  stanza.sguardo = SGUARDO[imp.sguardo - 1];
  stanza.qualita(QUALITA[imp.qualita].nebbia);
  if (S.schermo === "stanza" || S.schermo === "scrivania") stanza.adatta(larghezza3d());
}
applicaImpostazioni();

// il pannello: dal titolo (bloccato: si torna al titolo) o dall'ingranaggio, durante la partita (si torna a giocare;
// il blocco resta quello di prima, cosi' un foglio che il gioco apre intanto, o il finale sotto, resta com'era)
function apriImpostazioni(dalTitolo = false) {
  const torna = dalTitolo ? titolo : () => { foglio.hidden = true; };
  const righe = el("div", "im-righe");
  righe.append(
    ...rigaTacche(T("Volume"), 0, 10, () => imp.volume, (v) => {
      imp.volume = v;
      // un colpo, per sentire quanto e' forte
      suoni.suona("interruttore", { varia: 0 });
    }, (v) => `${v * 10}`),
    ...rigaTacche(T("Musica"), 0, 10, () => imp.musica, (v) => { imp.musica = v; }, (v) => `${v * 10}`),
    ...rigaTacche(T("Sensibilità"), 1, SGUARDO.length, () => imp.sguardo, (v) => { imp.sguardo = v; },
      (v) => `×${String(SGUARDO[v - 1]).replace(".", LINGUA === "en" ? "." : ",")}`),
  );
  // la qualita' e' quella della stanza 3D: senza (niente WebGL 2) non serve
  if (stanza) {
    righe.append(...rigaScelte(T("Qualità"), Object.entries(QUALITA).map(([k, q]) => [k, q.nome]), () => imp.qualita, (k) => {
      imp.qualita = k;
      salvaImpostazioni();
      applicaImpostazioni();
    }));
  }
  if (document.fullscreenEnabled) {
    righe.append(...rigaScelte(T("Schermo"), [["intero", T("Intero")], ["finestra", T("Finestra")]],
      () => (document.fullscreenElement ? "intero" : "finestra"), (k) => schermoIntero(k === "intero")));
  }
  // la lingua si cambia solo dal titolo, perche' ricarica la pagina (la partita riparte dall'ultima mattina salvata);
  // la scritta e' in tutte e due le lingue, per chi si ritrova in quella che non legge
  if (dalTitolo) {
    righe.append(...rigaScelte("Lingua · Language", Object.entries(LINGUE), () => LINGUA, (k) => {
      if (k === LINGUA) return;
      scegliLingua(k);
      history.replaceState(null, "", location.href.replace(/-(it|en|xx)\b/, ""));
      location.reload();
    }));
  }
  const fine = el("div", "im-fine");
  fine.append(bottone(dalTitolo ? T("Indietro") : T("Torna a giocare"), torna, "ti-voce"));
  if (ELECTRON) fine.append(bottone(T("Esci dal gioco"), () => window.close(), "ti-voce secondario"));
  if (dalTitolo) foglio.dataset.bloccato = "1";
  apriFoglio("impostazioni", [el("h2", null, T("Impostazioni")), righe,
    ...(stanza ? [el("p", "im-nota", T("Se la stanza va a scatti, prova la qualità media o bassa: si disegna più piccola, con una nebbia più semplice."))] : []),
    fine]);
  R.indietroFoglio = torna;
  righe.querySelector("[role=slider]")?.focus();
}

// una riga con le tacche, come gli indicatori del gioco: si clicca (o si trascina) sulla tacca, o su meno e piu', o
// si usano le frecce della tastiera
function rigaTacche(nome, min, max, leggi, scrivi, scritta) {
  const barra = el("div", "im-barra");
  barra.tabIndex = 0;
  barra.setAttribute("role", "slider");
  barra.setAttribute("aria-label", nome);
  barra.setAttribute("aria-valuemin", min);
  barra.setAttribute("aria-valuemax", max);
  for (let i = 0; i < max; i++) barra.append(el("span", "im-tacca"));
  const valore = el("span", "im-valore");
  const segna = () => {
    const v = leggi();
    [...barra.children].forEach((t, i) => t.classList.toggle("piena", i < v));
    valore.textContent = scritta(v);
    barra.setAttribute("aria-valuenow", v);
    barra.setAttribute("aria-valuetext", scritta(v));
  };
  const metti = (v) => {
    v = clamp(v, min, max);
    if (v === leggi()) return;
    scrivi(v);
    salvaImpostazioni();
    applicaImpostazioni();
    segna();
  };
  const sotto = (e) => {
    const r = barra.getBoundingClientRect();
    return Math.ceil(((e.clientX - r.left) / r.width) * max);
  };
  let tiene = false;
  barra.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    tiene = true;
    // col controller il puntatore e' finto e non si cattura: basta restare sopra la barra
    try { barra.setPointerCapture(e.pointerId); } catch { /* niente cattura */ }
    // lasciata andare anche fuori dal pannello: non e' un clic sullo sfondo (che chiuderebbe il foglio)
    window.addEventListener("pointerup", () => {
      tiene = false;
      R.sfTrascinato = performance.now();
    }, { once: true, capture: true });
    metti(sotto(e));
  });
  barra.addEventListener("pointermove", (e) => { if (tiene && e.buttons & 1) metti(sotto(e)); });
  barra.addEventListener("pointercancel", () => { tiene = false; });
  barra.addEventListener("keydown", (e) => {
    const verso = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key];
    if (verso) metti(leggi() + verso);
    else if (e.key === "Home") metti(min);
    else if (e.key === "End") metti(max);
    else return;
    e.preventDefault();
  });
  const passo = (ic, d, testo) => {
    const b = bottone("", () => metti(leggi() + d), "im-passo", ic);
    b.setAttribute("aria-label", `${nome}: ${testo}`);
    return b;
  };
  const comando = el("div", "im-comando");
  comando.append(passo("meno", -1, T("meno")), barra, passo("piu", 1, T("più")));
  segna();
  return [el("span", "im-nome", nome), comando, valore];
}

// una riga di scelte, una sola accesa
function rigaScelte(nome, scelte, leggi, scegli) {
  const div = el("div", "im-scelte");
  div.setAttribute("role", "group");
  div.setAttribute("aria-label", nome);
  const segna = () => {
    for (const b of div.children) b.setAttribute("aria-pressed", b.dataset.scelta === leggi() ? "true" : "false");
  };
  for (const [k, testo] of scelte) {
    const b = bottone(testo, () => {
      scegli(k);
      segna();
    }, "im-scelta");
    b.dataset.scelta = k;
    div.append(b);
  }
  div.addEventListener("aggiorna", segna);
  segna();
  return [el("span", "im-nome", nome), div];
}

// l'ingranaggio, tra le icone a comparsa
const tastoImpostazioni = $("#impostazioni");
tastoImpostazioni.insertAdjacentHTML("afterbegin", icona("impostazioni"));
tastoImpostazioni.addEventListener("click", (e) => {
  e.stopPropagation();
  apriImpostazioni(false);
});

// ---------- avvio ----------

// le tacche del caricamento (0-1)
function riempiCaricamento(f) {
  tacche(caricamento, 10, (i) => clamp(f * 10 - i, 0, 1));
  caricamento.setAttribute("aria-valuenow", Math.round(f * 100));
}

// le visite in plastilina: stanze e pupazzi del giorno, caricati in sottofondo
async function caricaVisite() {
  if (!vhs || !conWebgl2 || !VISITE_3D) return;
  try {
    const { Visita3D } = await import("./visita3d.js");
    if (!Visita3D.disponibile()) throw new Error("niente WebGL 2");
    const v = new Visita3D();
    await v.prepara(D.LUOGHI, (f) => { R.caricoVisite = f; });
    visita = v;
  } catch (err) {
    console.warn("Visite 3D non disponibili:", err);
    visita = null;
    // si torna alle scene 2D di prima (intanto chi entra in una casa aspetta)
    await caricaLuoghi(D.LUOGHI).catch((e) => notifica(T`Non riesco a caricare ${e.message}`));
    visitaPronta = null;
    precaricaPrimi();
  }
}

// la stanza 3D si carica a parte: se manca WebGL 2 o qualcosa non arriva, si gioca dalla scrivania in 2D
async function caricaStanza() {
  if (!vhs) return;
  try {
    const { Stanza } = await import("./stanza.js");
    if (!Stanza.disponibile()) return;
    // a che punto e' il caricamento: dieci tacche che si riempiono (i modelli pesano parecchio)
    parole.pulisci();
    caricamento.querySelector(".ind-ic").innerHTML = icona("clessidra");
    const riempi = (f) => {
      tacche(caricamento, 10, (i) => clamp(f * 10 - i, 0, 1));
      caricamento.setAttribute("aria-valuenow", Math.round(f * 100));
    };
    riempi(0);
    caricamento.hidden = false;
    const s = new Stanza(schermo);
    s.passiNebbia = QUALITA[imp.qualita].nebbia;
    s.sguardo = SGUARDO[imp.sguardo - 1];
    await s.carica(riempi);
    s.onUsa = (id) => usaStanza(id);
    s.onScrivania = (id) => { if (!R.occupato && foglio.hidden) azioneScrivania(id); };
    s.nomiPezzi = Object.fromEntries(D.SCRIVANIA.map((z) => [z.id, z.nome]));
    s.onSopra = (nome) => mostraEtichetta(nome);
    s.onPasso = () => suoni.passo();
    s.onBlocco = (b) => bloccoStanza(b);
    if (location.hash.startsWith("#prova")) {
      // le prove automatiche: niente mouse bloccato, e la risoluzione la scelgono loro
      s.senzaBlocco = true;
      s.adattiva = false;
    }
    // nella stanza le frasi non fermano le mani: un clic su una cosa la usa anche se c'e' ancora una frase a schermo
    // (prima il primo clic serviva solo a farla andare avanti, e la cosa non si usava)
    s.puoi = () => (S.schermo === "stanza" || S.schermo === "scrivania") && !R.occupato && foglio.hidden;
    stanza = s;
  } catch (err) {
    console.warn("Stanza 3D non disponibile:", err);
    stanza = null;
  } finally {
    caricamento.hidden = true;
  }
}

async function avvia(dati) {
  parole.scrivi(null, T("Carico i nastri…"), { lato: "sotto" }, {}, { veloce: true });
  try {
    vhs = new Vhs(canvas);
    // niente VHS (27 ottobre): niente difetti del nastro; restano la lampada, lo zoom, la notte e l'infrarosso
    vhs.pulito = false;
    vhs.difetti = 0;
    vhs.start();
    // gli strappi del nastro si sentono: un crepitio, piu' forte quanto piu' e' forte lo strappo
    // solo gli strappi forti (i cambi di inquadratura, lo zoom, la contraddizione), non i piccoli disturbi
    vhs.onBurst = (v) => { if (v >= 0.3) suoni.suona("disturbo", { volume: Math.min(1, 0.35 + v * 0.65), varia: 0.1 }); };
  } catch {
    vhs = null;
    schermo.classList.add("senza-webgl");
  }
  try {
    await caricaTutto();
  } catch (err) {
    parole.scrivi(null, T`Non riesco a caricare ${err.message}. Ricarica la pagina.`, { lato: "sotto" });
    return;
  }
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  R.ctx = c.getContext("2d");
  R.scena = c;
  const m = document.createElement("canvas");
  m.width = IMG.mappa.naturalWidth;
  m.height = IMG.mappa.naturalHeight;
  R.mctx = m.getContext("2d");
  R.mappa = m;
  await caricaStanza();
  parole.pulisci();
  if (dati && dati.S) S = Object.assign(nuovoStato(), dati.S);
  // ripreso a meta' del secondo o del terzo giorno (il codice ricaricato tiene lo stato): le tabelle e le scene di
  // quel giorno
  if (S.giorno >= 2) {
    D = { ...D1, ...(S.giorno === 3 ? giorno3 : giorno2)(S.ieri) };
    await apriPacchi().catch(() => {});
    if (!vhs || !conWebgl2 || !VISITE_3D || S.giorno >= 3) await caricaLuoghi(D.LUOGHI).catch(() => {});
  }
  visitaPronta = VISITE_3D && S.giorno < 3 ? caricaVisite() : null;
  if (S.schermo === "visita" && S.casa && S.luogo) vaiLuogo(S.luogo);
  else if (S.schermo === "mappa") vaiMappa();
  else if (S.schermo === "scrivania") vaiScrivania();
  else vaiStanza("inizio");
  precaricaPrimi();
  // per giudicare la bozza del secondo giorno senza rigiocare il primo: #giorno2 nell'indirizzo; del terzo, #giorno3
  // (non quando il codice si ricarica a meta' partita: lo stato e' gia' quello)
  if (location.hash.startsWith("#giorno2") && !(dati && dati.S)) saltaAlGiorno2();
  else if (location.hash.startsWith("#giorno3") && !(dati && dati.S)) saltaAlGiorno3();
  // il titolo, se si comincia da capo (non quando il codice si ricarica a meta' partita, ne' nelle prove automatiche)
  else if ((dati && dati.S) || location.hash.startsWith("#prova")) introduzione();
  else titolo();
  // il controller (per lo Steam Deck): nella stanza 3D si cammina e si guarda con le levette, altrove la levetta
  // muove la punta del bastone
  controller = avviaController({
    schermo,
    nellaStanza: () => S.schermo === "stanza" && !!stanza && !stanza.seduto && foglio.hidden,
    stanza: () => stanza,
    usa: () => { if (parole.occupata()) parole.salta(); if (!R.occupato) stanza?.usaMirino(); },
    indietro,
    // il mirino al centro, come col mouse bloccato
    mirino: (si) => {
      if (!stanza) return;
      stanza.conLeva = si;
      schermo.classList.toggle("bloccato", si || document.pointerLockElement === schermo);
      if (!si) stanza.evidenzia(null);
      bloccoStanza(si);
    },
  });
}

// per le prove automatiche: dove cliccare, nella scena di adesso, una zona o una parte del corpo (il centro), e una
// persona fuori dalle parti del corpo (per aprirle le domande): il punto piu' vicino al centro della sua sagoma
function dove(cosa, parte) {
  const L = D.LUOGHI[S.luogo];
  if (parte) return L.parti?.[cosa]?.[parte]?.[0]?.slice(0, 2) || null;
  const z = L.zone.find((q) => q.id === cosa);
  return z ? [(z.box[0] + z.box[2]) / 2, (z.box[1] + z.box[3]) / 2] : null;
}

function dovePersona(persona) {
  const m = ID[S.luogo];
  const i = D.LUOGHI[S.luogo].persone.indexOf(persona) + 1;
  if (!m || !i) return null;
  const punti = [];
  for (let y = 2; y < m.h; y += 4) for (let x = 2; x < m.w; x += 4) {
    if (Math.round(m.data[(y * m.w + x) * 4] / 40) !== i) continue;
    const c = colpisci((x + 0.5) / m.w, (y + 0.5) / m.h);
    if (c?.persona === persona && !c.parte) punti.push([(x + 0.5) / m.w, (y + 0.5) / m.h]);
  }
  if (!punti.length) return null;
  const cx = punti.reduce((t, q) => t + q[0], 0) / punti.length, cy = punti.reduce((t, q) => t + q[1], 0) / punti.length;
  return punti.reduce((a, q) => (Math.hypot(q[0] - cx, q[1] - cy) < Math.hypot(a[0] - cx, a[1] - cy) ? q : a));
}

// per le prove automatiche: con #prova nell'indirizzo il gioco si puo' guidare da fuori
if (location.hash.startsWith("#prova")) window.prova = { get S() { return S; }, get D() { return D; }, visita: () => visita, visitaPronta: () => visitaPronta, iniziaGiorno2, saltaAlGiorno2, iniziaGiorno3, saltaAlGiorno3, riproduci, apriNastri, controllaOspite, nastroNotte, verita, dormi, quartaMattina, calcolaFinale, apriFinale, titolo, riprendi, leggiSalvataggio, apriImpostazioni, impostazioni: () => imp, ricomincia, finaliTrovati, dove, dovePersona, vaiStanza, vaiScrivania, vaiMappa, vai, vaiLuogo, apriFax, apriGiornale, sera, stanza: () => stanza, vhs: () => vhs, suoni: () => suoni, controller: () => controller, R: () => R, parole: () => parole };

window.claude?.hot?.snapshot?.(() => ({ S }));
if (window.claude?.hot?.ready) window.claude.hot.ready(avvia);
else avvia(window.claude?.hot?.data ?? {});
