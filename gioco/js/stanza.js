// La stanza del medico in 3D: la camera in affitto sopra il bar, dove si cammina in prima persona come nella
// casa di NINAH. Three.js disegna su un canvas fuori dallo schermo, che diventa la sorgente della videocamera
// (vhs.js): la stanza ha lo stesso VHS del resto del gioco.
// Sul computer si clicca nella stanza e il mouse gira lo sguardo (il puntatore resta bloccato, Esc lo libera); si
// cammina con WASD o con le frecce, e con un clic o con E si usa quello che c'e' nel mirino. Col dito si trascina
// per guardarsi attorno e si tocca dove andare o cosa usare. Cosa succede usando una cosa (la porta, il letto...)
// lo decide gioco.js con onUsa. Alla scrivania ci si siede (siedi): la camera guarda il piano dall'alto, il
// puntatore e' libero e si usano le cose che ci sono sopra (onScrivania), fatte con Meshy come i mobili.
// Texture e modelli si preparano con tools/prepara_stanza.py: i mobili sono di Meshy, gli oggetti piccoli di Tripo.
// Dal 27 ottobre la stanza e' in plastilina come le visite (CRETA): muri, pavimento e soffitto di creta, i mobili in
// plastilina dove ci sono gia' (gioco/modelli/creta), gli altri con la creta sopra (le texture di prima ammorbidite,
// come lisciate col dito, e le impronte), il mondo che "bolle" a scatti; niente filtro catrame. La sera stessa la
// plastilina e' scartata (resta con #creta): la stanza si rifa' ad alta qualita' (HQ), "tipo Poppy Playtime", e poi
// "piu' americana". La si costruisce e la si illumina in Blender (art/stanza_hq: modelli e materiali di Poly Haven,
// la luce cotta della mattina e della sera) e qui arriva gia' fatta (gioco/modelli/hq, tools/stanza_hq.py gioco):
// niente luci da calcolare, la luce e' nelle "lightmap" (le seconde coordinate di ogni oggetto), i riflessi da una
// foto della stanza stessa, e alla fine l'alone delle luci forti e il colore (caricaHQ). Con #2d la stanza di prima.
import * as THREE from "../lib/three.js";
import * as C from "./plastilina.js";
import { caratteri, primaPagina } from "./primapagina.js";

const IMG = "img/stanza/";
const MOD = "modelli/";
// la stanza in plastilina con #creta (come le visite); la versione 2D di prima con #2d (la stanza com'era, col filtro
// catrame); altrimenti quella ad alta qualita' (se non si carica, quella di prima)
const INDIRIZZO = typeof location !== "undefined" ? location.hash : "";
const CRETA = /creta/.test(INDIRIZZO);
const HQ = !CRETA && !/2d/.test(INDIRIZZO);
// in plastilina le texture di creta si ripetono ogni tot metri (la carta da parati di prima ogni 55 centimetri)
const METRI_MURO = CRETA ? 1.5 : 0.55;

// la stanza: 5 x 6 metri, alta 3 (una casa vecchia, coi soffitti alti). x verso destra (est), z verso la porta;
// all'inizio si guarda verso -z, la parete della finestra con la scrivania sotto; la porta e' sulla parete di fronte
const X0 = -2.5, X1 = 2.5, Z0 = -3.0, Z1 = 3.0, ALTA = 3.0;
const OCCHI = 1.62;
const RAGGIO = 0.22;
const PASSO = 1.7; // metri al secondo
const MOUSE = 0.0022; // radianti per punto, col puntatore bloccato
const VISTA = 58; // il campo visivo in piedi, in gradi
// la finestra, incassata nel muro sopra la scrivania, e la porta
const FIN = { x0: -1.35, x1: -0.05, y0: 0.95, y1: 2.4, fondo: 0.24 };
const PORTA = { x: -1.5, largo: 0.96, alto: 2.08 };
// la scrivania sotto la finestra (centro); il piano si misura sul modello
const SCRIVANIA = { x: -0.7, z: -2.62 };
// seduti alla scrivania: da dove si guarda il piano (piu' in alto degli occhi di chi siede, quasi da sopra, come la
// scrivania disegnata), dove, e con che campo visivo
const SEDUTO = { pos: [SCRIVANIA.x, 1.78, SCRIVANIA.z + 0.59], guarda: [SCRIVANIA.x, 0.77, SCRIVANIA.z - 0.01], fov: 52 };
// la porta della stanzetta dove dorme l'ospite della notte, sulla parete a est (z del centro; "muro" e' lo spessore
// del muro), e la stanzetta dietro: buia, con la brandina in fondo. Non ci si entra, la si guarda dalla porta
const OSPITE = { z: 1.7, largo: 0.84, alto: 2.05, muro: 0.12 };
const STANZETTA = { x1: X1 + 2.0, z0: 0.35, z1: Z1 };

// le cose che si usano: dove si ferma il medico [x, z] e dove guarda [x, y, z]. La sosta dev'essere libera: a
// RAGGIO dai mobili (la sedia della scrivania arriva a z -1,46)
const OGGETTI = {
  scrivania: { nome: "La scrivania", sosta: [-0.7, -1.35], guarda: [-0.7, 0.78, -2.65] },
  videoregistratore: { nome: "Il videoregistratore", sosta: [-0.15, -1.55], guarda: [-0.15, 0.84, -2.55] },
  finestra: { nome: "La finestra", sosta: [-0.7, -1.35], guarda: [-0.7, 1.7, -3.1] },
  porta: { nome: "La porta", sosta: [-1.5, 2.3], guarda: [-1.5, 1.15, 3.0] },
  letto: { nome: "Il letto", sosta: [1.15, -1.5], guarda: [1.95, 0.55, -1.9] },
  armadio: { nome: "L'armadio", sosta: [-1.35, -1.8], guarda: [-2.2, 1.2, -1.8] },
  cappotto: CRETA || HQ ? { nome: "Il cappotto", sosta: [1.9, 0.45], guarda: [2.5, 1.5, 0.45] }
    : { nome: "Il cappotto", sosta: [-0.75, 2.35], guarda: [-0.55, 1.5, 3.0] },
  calendario: { nome: "Il calendario della ditta", sosta: [-1.55, 0.25], guarda: [-2.5, 1.62, 0.25] },
  santino: { nome: "Il santino", sosta: [1.1, -1.7], guarda: [2.5, 1.7, -2.3] },
  termosifone: { nome: "Il termosifone", sosta: [0.6, -2.15], guarda: [0.6, 0.35, -2.95] },
  borsa: { nome: "La borsa", sosta: [-1.5, -1.95], guarda: [-2.1, 0.15, -2.72] },
  orologio: { nome: "La radiosveglia", sosta: [0.95, -2.1], guarda: [1.18, 0.6, -2.75] },
  tavolo: { nome: "Il tavolino", sosta: [-0.75, 1.65], guarda: [0.05, 0.75, 1.65] },
  credenza: { nome: "La credenza", sosta: [-1.45, 0.25], guarda: [-2.25, 0.95, 0.25] },
  lavandino: { nome: "Il lavandino", sosta: [-1.55, 1.75], guarda: [-2.35, 1.1, 1.75] },
  ospite: { nome: "La stanzetta dell'ospite", sosta: [1.75, 1.7], guarda: [2.6, 1.15, 1.7] },
};

// da dove si parte entrando nella stanza: [x, z, direzione dello sguardo in radianti, inclinazione]
const ARRIVI = {
  inizio: [1.0, -0.9, 0.82, -0.12],
  scrivania: [-0.7, -1.35, 0, -0.34],
  porta: [-1.5, 2.3, -0.16, -0.06],
  nastri: [-0.15, -1.55, 0, -0.3],
  ospite: [1.75, 1.7, -Math.PI / 2, -0.05],
};

// i modelli, uno per oggetto, fatti da una foto. I mobili sono di Meshy: "allinea" li raddrizza (Meshy li consegna
// un po' girati, come nella foto), poi rotY li volta verso la stanza. Gli oggetti di Tripo arrivano col davanti verso
// +x. Grandezza: "alto", "largo" (lungo x), "lungo" (il lato piu' lungo); "dim" da' le misure vere in metri lungo x,
// y e z della stanza (Meshy sbaglia le proporzioni: la scrivania veniva alta un metro e dieci); "fondo" schiaccia la
// profondita' (il cappotto sporgeva troppo dal muro); "sopra" li appoggia sul piano della scrivania, spostati di dx,
// dz dal centro; la lampada non fa ombra, se no il paralume coprirebbe la sua stessa luce
const MODELLI = [
  { nome: "scrivania", x: SCRIVANIA.x, z: SCRIVANIA.z, dim: [1.6, 0.77, 0.75], allinea: true, rotY: 0, oggetto: "scrivania", meshy: true },
  { nome: "letto", x: 1.98, z: -1.96, dim: [1.0, 1.05, 2.05], allinea: true, rotY: 0, oggetto: "letto", meshy: true, creta: "letto_ferro" },
  { nome: "comodino", x: 1.2, z: -2.78, dim: [0.46, 0.58, 0.4], allinea: true, rotY: 0, meshy: true, creta: "comodino" },
  { nome: "armadio", x: -2.19, z: -1.75, dim: [0.6, 2.05, 1.2], allinea: true, rotY: Math.PI / 2, oggetto: "armadio", meshy: true, creta: "armadio" },
  { nome: "credenza", x: -2.23, z: 0.25, dim: [0.52, 1.15, 1.4], allinea: true, rotY: Math.PI / 2, oggetto: "credenza", meshy: true },
  { nome: "lavandino", x: -2.27, z: 1.75, dim: [0.45, 0.88, 0.55], allinea: true, rotY: Math.PI / 2, oggetto: "lavandino", meshy: true },
  { nome: "tavolo", x: 0.05, z: 1.65, dim: [0.85, 0.76, 0.85], allinea: true, rotY: 0, oggetto: "tavolo", meshy: true },
  { nome: "brandina", x: STANZETTA.x1 - 0.42, z: 1.75, dim: [0.7, 0.45, 1.9], allinea: true, rotY: Math.PI / 2, oggetto: "ospite", meshy: true, creta: "brandina" },
  { nome: "sedia", x: -0.7, z: -1.95, alto: 0.88, rotY: Math.PI / 2, oggetto: "scrivania", creta: "sedia", giraCreta: Math.PI },
  { nome: "sedia", x: 0.05, z: 0.98, alto: 0.88, rotY: -Math.PI / 2 + 0.15, oggetto: "tavolo", creta: "sedia", giraCreta: 0.15 },
  { nome: "sedia", x: 0.12, z: 2.32, alto: 0.88, rotY: Math.PI / 2 - 0.2, oggetto: "tavolo", creta: "sedia", giraCreta: Math.PI - 0.2 },
  { nome: "termosifone", x: 0.6, z: -2.93, alto: 0.62, rotY: -Math.PI / 2, oggetto: "termosifone", creta: "termosifone", giraCreta: 0 },
  // il cappotto e' appeso alla parete dell'ospite, tra il letto e la stanzetta (la maschera, dalla scrivania, lo riprende)
  CRETA ? { nome: "cappotto", x: 2.43, y: 0.45, z: 0.45, alto: 1.42, rotY: Math.PI, fondo: 0.6, oggetto: "cappotto" }
    : { nome: "cappotto", x: -0.55, y: 0.45, z: 2.93, alto: 1.42, rotY: Math.PI / 2, fondo: 0.6, oggetto: "cappotto" },
  { nome: "borsa", x: -2.12, z: -2.72, alto: 0.3, rotY: -0.9, oggetto: "borsa" },
  // sulla scrivania gli oggetti di Meshy, messi come nella scrivania disegnata, col davanti verso chi siede; "pezzo"
  // e' cosa si usa da seduti (gli id della scrivania in gioco.js): i guanti vanno con la maschera, per uscire
  { nome: "lampada", sopra: [-0.64, -0.24], alto: 0.45, rotY: 2.75, oggetto: "scrivania", pezzo: "lampada", ombra: false },
  { nome: "fax", sopra: [-0.46, -0.05], lungo: 0.32, rotY: 0.18, oggetto: "scrivania", pezzo: "fax" },
  { nome: "giornale", sopra: [-0.03, -0.27], lungo: 0.3, rotY: 0.04, oggetto: "scrivania", pezzo: "giornale" },
  { nome: "televisore", sopra: [0.5, -0.21], largo: 0.36, rotY: -0.15, oggetto: "videoregistratore", pezzo: "nastri" },
  { nome: "videoregistratore", sopra: [0.5, 0.08], largo: 0.36, rotY: -0.06, oggetto: "videoregistratore", pezzo: "nastri" },
  { nome: "cassette", sopra: [0.4, 0.3], lungo: 0.19, rotY: -0.2, oggetto: "videoregistratore", pezzo: "nastri" },
  { nome: "cartella", sopra: [-0.57, 0.22], lungo: 0.3, rotY: 0.1, oggetto: "scrivania", pezzo: "taccuino" },
  { nome: "soldi", sopra: [-0.33, 0.22], lungo: 0.2, rotY: -0.3, oggetto: "scrivania", pezzo: "soldi" },
  // la maschera e' sdraiata sul fianco destro, un po' inclinata, davanti alla mappa: il becco verso destra, la lente
  // e la videocamera verso chi siede
  { nome: "maschera", sopra: [-0.06, 0.24], lungo: 0.36, rotZ: 1.25, rotY: 1.35, oggetto: "scrivania", pezzo: "maschera" },
  { nome: "guanti", sopra: [0.2, 0.22], lungo: 0.24, rotY: 0.5, oggetto: "scrivania", pezzo: "maschera" },
];

// il display sul davanti del videoregistratore di Meshy: centro (frazioni della larghezza e dell'altezza del modello)
// e larghezza (frazione della larghezza)
const DISPLAY = { x: 0.77, y: 0.69, largo: 0.3 };
const ALTO = new THREE.Vector3(0, 1, 0);

// la luce della mattina e della sera; "ambiente" e' la luce morbida che si riflette sui materiali
const LUCI = CRETA ? {
  // in plastilina, senza il filtro catrame che scuriva tutto: una mattina grigia, la stanza in penombra
  mattina: { giorno: true, sole: 1.5, cielo: 0.22, lampada: 1.1, alone: 0.3, porta: 0.0, ambiente: 0.1, esposizione: 0.82 },
  sera: { giorno: false, sole: 0, cielo: 0.05, lampada: 2.4, alone: 1.7, porta: 2.0, ambiente: 0.03, esposizione: 1.0 },
} : {
  mattina: { giorno: true, sole: 2.6, cielo: 0.55, lampada: 1.2, alone: 0.35, porta: 0.0, ambiente: 0.32, esposizione: 1.05 },
  sera: { giorno: false, sole: 0, cielo: 0.08, lampada: 2.6, alone: 2.2, porta: 2.2, ambiente: 0.05, esposizione: 1.3 },
};

// il filtro plumbeo, color catrame, per un tono piu' cupo: dopo il tone mapping ACES restano pochi colori, le ombre
// virano al bruno nero del catrame e le luci al grigio sporco del piombo, e tutto si scurisce. Si fa nel tone mapping
// di Three.js (CustomToneMapping), cioe' alla fine dello shader di ogni materiale: niente passaggi in piu'
const PLUMBEO = { saturazione: 0.35, ombre: [1.0, 0.8, 0.55], luci: [0.9, 0.88, 0.8], cupo: 0.8, curva: 1.15 };
const SENZA_FILTRO = THREE.ShaderChunk.tonemapping_pars_fragment;
{
  const f = (v) => v.toFixed(3);
  const v3 = (c) => `vec3( ${c.map(f).join(", ")} )`;
  THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(
    "vec3 CustomToneMapping( vec3 color ) { return color; }",
    `vec3 CustomToneMapping( vec3 color ) {
	color = ACESFilmicToneMapping( color );
	float l = dot( color, vec3( 0.2126, 0.7152, 0.0722 ) );
	color = l + ( color - l ) * ${f(PLUMBEO.saturazione)};
	color *= mix( ${v3(PLUMBEO.ombre)}, ${v3(PLUMBEO.luci)}, smoothstep( 0.0, 0.5, l ) ) * ${f(PLUMBEO.cupo)};
	return pow( max( color, 0.0 ), vec3( ${f(PLUMBEO.curva)} ) );
}`);
}

// la stanza ad alta qualita': la cartella, l'esposizione della mattina e della sera (la luce cotta e' in unita' vere;
// dal 28 ottobre piu' bassa, "rendila piu' tenebrosa": la luce viene dalla finestra e dalle lampade, gli angoli
// restano bui), le luci che fanno luce da se', l'alone delle luci forti (forza, raggio, soglia prima
// dell'esposizione) e il colore alla fine (contrasto, saturazione, vignetta)
const HQ_DIR = MOD + "hq/";
const HQ_LUCE = {
  mattina: { esposizione: 2.6, lampadina: 6, tenda: 0.45, fessura: 0, vista: 1.0 },
  sera: { esposizione: 1.25, lampadina: 14, tenda: 0, fessura: 1.6, vista: 1.0 },
};
const HQ_ALONE = { forza: 0.22, raggio: 0.4, soglia: 2.2 };
const HQ_COLORE = { contrasto: 0.45, saturazione: 1.0, vignetta: 0.5 };
// il filtro colore della stanza ("dagli un bel filtro di quelli delle stanze", 28 ottobre): uno dei quattro delle
// visite (tonoColore in vhs.js, con gli stessi colori: le ombre vanno verso un colore e le luci verso un altro), qui
// alla fine del 3D. Il verde malato; con #stanza4, #stanza5 e #stanza6 nell'indirizzo si provano gli altri
const TONI_STANZA = {
  3: { nome: "verde malato", ombre: [0.5, 0.86, 0.74], luci: [1.0, 1.0, 0.68] },
  4: { nome: "ottanio e arancio", ombre: [0.42, 0.76, 1.0], luci: [1.0, 0.82, 0.6] },
  5: { nome: "blu freddo", ombre: [0.5, 0.66, 1.0], luci: [0.86, 0.95, 1.0] },
  6: { nome: "livido", ombre: [0.74, 0.55, 1.0], luci: [1.0, 0.86, 0.92] },
};
const TONO_STANZA = TONI_STANZA[/stanza([3-6])/.exec(INDIRIZZO)?.[1]] || TONI_STANZA[3];
// la luce cotta ha gia' tutta la luce diffusa: dalla foto della stanza (scene.environment) si prendono solo i riflessi
const SOLO_RIFLESSI = THREE.ShaderChunk.lights_fragment_maps.replace("iblIrradiance += getIBLIrradiance( geometryNormal );", "");
const soloRiflessi = (sh) => { sh.fragmentShader = sh.fragmentShader.replace("#include <lights_fragment_maps>", SOLO_RIFLESSI); };
// il colore alla fine, dopo il tone mapping (AgX): un po' di contrasto a "S", la saturazione, il filtro colore della
// stanza e la vignetta
const COLORE_FINALE = {
  uniforms: { tDiffuse: { value: null }, contrasto: { value: HQ_COLORE.contrasto }, saturazione: { value: HQ_COLORE.saturazione },
    vignetta: { value: HQ_COLORE.vignetta }, tinta: { value: 1 }, ombre: { value: new THREE.Vector3(...TONO_STANZA.ombre) },
    luci: { value: new THREE.Vector3(...TONO_STANZA.luci) }, tempo: { value: 0 }, deforma: { value: 0 }, aberrazione: { value: 0 },
    tentacoli: { value: 0 }, tRumore: { value: null } },
  vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `uniform sampler2D tDiffuse; uniform float contrasto, saturazione, vignetta, tinta; uniform vec3 ombre, luci;
varying vec2 vUv;
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
vec3 tonoColore(vec3 c) {
  float l = dot(c, LUMA);
  vec3 t = mix(ombre, luci, smoothstep(0.05, 0.7, l));
  t /= max(dot(t, LUMA), 0.001);
  vec3 g = c * t;
  float lg = dot(g, LUMA);
  g = mix(vec3(lg), g, 0.85);
  return pow(max(g, vec3(0.0)), vec3(1.12)) * 0.9;
}
// le proposte lovecraftiane (NEBBIE, sotto) qui aggiungono lo schermo che si deforma e respira, i colori che si
// separano ai bordi e il buio a tentacoli che entra dai lati; a zero non fanno niente
uniform float tempo, deforma, aberrazione, tentacoli;
uniform sampler2D tRumore;
float rumore2(vec2 x) { return texture2D(tRumore, (x + 0.5) / 256.0).x; }
void main() {
  vec2 uv = vUv;
  if (deforma > 0.0) {
    vec2 w = vec2(rumore2(uv * 7.0 + vec2(tempo * 0.35, 0.0)), rumore2(uv * 7.0 + vec2(41.0, tempo * 0.31))) - 0.5;
    uv += w * deforma * (0.35 + dot(uv - 0.5, uv - 0.5) * 5.0);
    uv = 0.5 + (uv - 0.5) * (1.0 - deforma * 0.8 * (0.5 + 0.5 * sin(tempo * 0.6)));
  }
  vec4 c = texture2D(tDiffuse, uv);
  if (aberrazione > 0.0) {
    vec2 a = (uv - 0.5) * aberrazione;
    c.r = texture2D(tDiffuse, uv + a).r;
    c.b = texture2D(tDiffuse, uv - a).b;
  }
  vec3 x = clamp(c.rgb, 0.0, 1.0);
  float l = dot(x, LUMA);
  x = clamp(mix(vec3(l), x, saturazione), 0.0, 1.0);
  x = mix(x, x * x * (3.0 - 2.0 * x), contrasto);
  x = mix(x, tonoColore(x), tinta);
  vec2 d = vUv - 0.5;
  x *= mix(1.0, smoothstep(0.85, 0.25, length(d * vec2(1.0, 0.75))), vignetta);
  if (tentacoli > 0.0) {
    // il buio a tentacoli: sette braccia nere che entrano dai bordi, curve, sempre piu' sottili verso la punta, che
    // ondeggiano, avanzano e si ritirano piano; dietro, un velo scuro ai bordi
    vec2 e = d * vec2(1.778, 1.0);
    float r = length(e);
    float a = atan(e.y, e.x);
    float buio = smoothstep(0.62, 1.0, r);
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      float asse = fi * 0.8976 + 0.25 * sin(tempo * 0.11 + fi * 2.1) + 0.45 * sin(r * 6.0 - tempo * 0.5 + fi * 1.3) * (r - 0.3);
      float scarto = abs(atan(sin(a - asse), cos(a - asse))) * r;
      float punta = 0.42 + 0.1 * sin(tempo * 0.4 + fi * 1.7);
      float largo = 0.07 * smoothstep(punta, punta + 0.5, r);
      float bordo = largo * (0.8 + 0.4 * rumore2(vec2(r * 30.0 - tempo * 0.8, fi * 13.0)));
      buio = max(buio, (1.0 - smoothstep(bordo * 0.2, bordo, scarto)) * smoothstep(punta, punta + 0.12, r));
    }
    x *= 1.0 - tentacoli * buio;
  }
  gl_FragColor = vec4(x, c.a);
}`,
};

// ---------- la stanza lovecraftiana (29 ottobre, da scegliere: "dobbiamo renderla lovecraftiana, quasi nebbiosa, sui
// toni del viola, blu, ma non solo con un filtro colore. Fammi delle proposte"). Una nebbia vera, calcolata nel 3D con
// la profondita' della scena, prima dell'alone e del tone mapping: si marcia lungo il raggio dall'occhio alla cosa
// vista, e a ogni passo la nebbia toglie un po' della luce di dietro e ci mette la sua: il colore dell'aria, il sole
// che entra a raggi dai vetri della finestra (la mattina), la lampadina e la lampada della scrivania. Quattro proposte,
// con #nebbia1 ... #nebbia4 nell'indirizzo, o col tasto N nella stanza ----------
// densita' dell'aria e dello strato basso (per metro), quanto e' alto lo strato, i ciuffi (quanto il rumore la fa a
// banchi, e la loro grandezza), il vento; i colori in luce vera: l'aria, i raggi del sole, la luce delle lampade; poi
// gli effetti di ogni proposta e, alla fine, il filtro colore (ombre, luci, quanto) e gli effetti sullo schermo
const NEBBIE = {
  1: { nome: "Nebbia viola", densita: 0.08, strato: 0.8, altezza: 3.0, ciuffi: 1, scala: 1.3, vento: [0.06, 0.01, -0.035],
    aria: [0.02, 0.018, 0.055], raggi: [0.24, 0.2, 0.42], caldo: [1.0, 0.5, 0.62], particelle: 0.35,
    ombre: [0.56, 0.54, 1.0], luci: [0.84, 0.88, 1.0], tinta: 0.9 },
  2: { nome: "L'abisso", densita: 0.2, strato: 0.25, altezza: 1.0, ciuffi: 0.5, scala: 0.6, vento: [0.0, 0.03, 0.02],
    aria: [0.022, 0.045, 0.095], raggi: [0.12, 0.23, 0.36], caldo: [0.5, 0.65, 1.0], caustiche: 0.75, particelle: 1,
    ombre: [0.45, 0.58, 1.0], luci: [0.7, 0.95, 1.0], deforma: 0.004 },
  3: { nome: "Il colore venuto dallo spazio", densita: 0.06, strato: 0.5, altezza: 1.8, ciuffi: 0.9, scala: 0.9,
    vento: [0.03, 0.05, 0.02], aria: [0.03, 0.02, 0.05], raggi: [0.3, 0.16, 0.42], caldo: [0.8, 0.45, 1.0], particelle: 0.6,
    bagliore: 0.4, ombre: [0.62, 0.48, 1.0], luci: [0.78, 0.95, 1.0], tinta: 0.5, aberrazione: 0.008, deforma: 0.0015 },
  4: { nome: "R'lyeh", densita: 0.3, strato: 0.6, altezza: 2.5, ciuffi: 0.8, scala: 1.0, vento: [0.02, 0.0, 0.04],
    aria: [0.008, 0.005, 0.02], raggi: [0.13, 0.11, 0.26], caldo: [0.6, 0.3, 0.8], abisso: 0.7,
    ombre: [0.6, 0.45, 1.0], luci: [0.75, 0.8, 1.0], tinta: 0.9, deforma: 0.006, tentacoli: 0.92 },
};
const NEBBIA_INIZIO = Number(/nebbia([1-4])/.exec(INDIRIZZO)?.[1] || 0);

// il rumore per la nebbia: 256 x 256 valori a caso, e nel verde gli stessi spostati di (37, 17), per avere il rumore
// in 3D con una lettura sola (la "fetta" dopo e' la stessa tabella spostata)
function texturaRumore() {
  const n = 256, r = new Uint8Array(n * n), d = new Uint8Array(n * n * 4);
  let s = 1234567;
  for (let i = 0; i < r.length; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; r[i] = s >>> 24; }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = (y * n + x) * 4;
    d[i] = r[y * n + x];
    d[i + 1] = r[((y - 17 + n) % n) * n + ((x - 37 + n) % n)];
    d[i + 3] = 255;
  }
  const t = new THREE.DataTexture(d, n, n, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

// il passaggio della nebbia, subito dopo il disegno della stanza: legge il colore (in luce vera, prima del tone
// mapping) e la profondita'. Le luci sono quelle della cottura in Blender (art/stanza_hq/costruisci.py): il sole della
// mattina, che entra di sbieco dalla finestra sul muro di fondo, la lampadina nuda al centro e la lampada della scrivania
const NEBBIA_FRAG = `uniform sampler2D tDiffuse, tDepth, tRumore;
uniform mat4 proiezioneInv, mondoCamera;
uniform vec3 occhio, vento, aria, raggi, caldo;
uniform float tempo, densita, strato, altezza, ciuffi, scala, sole, lampadina, lampada, caustiche, particelle, abisso, bagliore;
varying vec2 vUv;
const vec3 SOLE = vec3(0.472, -0.377, 0.797);
const vec3 LAMPADINA = vec3(0.0, 2.37, 0.3);
const vec3 LAMPADA = vec3(-1.25, 1.12, -2.72);
const float MURO = -3.0;
float rumore(vec3 x) {
  vec3 p = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  vec2 uv = p.xy + vec2(37.0, 17.0) * p.z + f.xy;
  vec2 rg = texture2D(tRumore, (uv + 0.5) / 256.0).yx;
  return mix(rg.x, rg.y, f.z);
}
float fbm(vec3 p) { return 0.55 * rumore(p) + 0.3 * rumore(p * 2.07 + 13.1) + 0.15 * rumore(p * 4.3 + 7.7); }
// il sole che passa dai vetri: il punto, guardando verso il sole, vede un vetro? Le due finestre a ghigliottina col
// montante e le traverse; le tende avvolgibili, abbassate a meta' e a un quarto, ne lasciano passare poco
float vetro(vec2 q, vec2 a, vec2 b) { vec2 s = smoothstep(a, a + 0.025, q) * smoothstep(b, b - 0.025, q); return s.x * s.y; }
float finestra(vec3 p) {
  float s = (p.z - MURO) / SOLE.z;
  if (s <= 0.0) return 0.0;
  vec2 q = (p - SOLE * s).xy;
  return vetro(q, vec2(-1.25, 1.01), vec2(-0.78, 1.66)) + 0.12 * vetro(q, vec2(-1.25, 1.73), vec2(-0.78, 2.31))
    + vetro(q, vec2(-0.62, 1.01), vec2(-0.15, 1.66)) + vetro(q, vec2(-0.62, 1.73), vec2(-0.15, 2.02))
    + 0.12 * vetro(q, vec2(-0.62, 2.02), vec2(-0.15, 2.31));
}
vec3 iride(float t) { return 0.5 + 0.5 * cos(6.2832 * (t + vec3(0.0, 0.33, 0.67))); }
// la luce dell'acqua che balla: dove due rumori si incrociano
float caustica(vec3 p) {
  vec3 q = vec3(p.x * 2.4 + p.y * 0.7, p.z * 2.4 - p.y * 0.7, tempo * 0.3);
  float k = 1.0 - abs(rumore(q) - rumore(q * 1.6 + vec3(3.1, 7.4, tempo * 0.17))) * 3.5;
  return pow(clamp(k, 0.0, 1.0), 5.0);
}
void main() {
  vec3 col = texture2D(tDiffuse, vUv).rgb;
  float z = texture2D(tDepth, vUv).x;
  vec4 v = proiezioneInv * vec4(vUv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
  v /= v.w;
  vec3 P = (mondoCamera * vec4(v.xyz, 1.0)).xyz;
  vec3 rd = P - occhio;
  float L = length(rd);
  rd /= max(L, 0.0001);
  L = min(L, 14.0);
#if VARIANTE == 2
  // le caustiche sulle cose (non sul cielo): piu' forti in basso, dove l'acqua e' piu' vicina
  if (z < 1.0) col *= 1.0 + caustiche * 1.6 * caustica(P) * (0.4 + 0.6 * exp(-max(P.y, 0.0) * 0.6));
#endif
  float dt = L / float(PASSI);
  // la nebbia sparpaglia la luce soprattutto in avanti: i raggi si vedono di piu' guardando verso la finestra
  float c = dot(-rd, SOLE);
  float fase = 0.35 + 0.65 * 0.64 / pow(1.36 - 1.2 * c, 1.5);
  // un inizio diverso per ogni punto dello schermo (rumore a gradiente intrecciato): pochi passi senza strisce
  float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float T = 1.0;
  vec3 S = vec3(0.0);
  for (int i = 0; i < PASSI; i++) {
    float t = (float(i) + j) * dt;
    vec3 p = occhio + rd * t;
    float n = fbm(p * vec3(scala, scala * 1.8, scala) + vento * tempo);
    float d = (densita + strato * exp(-max(p.y, 0.0) * altezza)) * mix(1.0, smoothstep(0.3, 0.75, n) * 2.0, ciuffi);
    vec3 luce = aria;
#if VARIANTE == 3
    // il colore che non e' di questo mondo: l'aria cangiante, e banchi che fanno luce da se', magenta, viola e ciano,
    // che si accendono e si spengono piano
    luce *= 0.35 + 1.4 * iride(n * 1.8 + p.y * 0.3 + tempo * 0.04);
    float m = rumore(p * 0.55 + vec3(0.0, tempo * 0.05, tempo * 0.03));
    vec3 tinta3 = mix(vec3(1.0, 0.2, 0.85), vec3(0.45, 0.25, 1.0), smoothstep(0.3, 0.6, n));
    tinta3 = mix(tinta3, vec3(0.2, 0.95, 1.0), smoothstep(0.55, 0.8, m));
    S += T * dt * bagliore * tinta3 * smoothstep(0.5, 0.75, m) * (0.6 + 0.4 * sin(tempo * 1.3 + n * 9.0));
#endif
    float raggio = sole * fase * finestra(p);
    luce += raggi * raggio;
    vec3 a = p - LAMPADINA;
    vec3 b = p - LAMPADA;
    luce += caldo * (lampadina / (dot(a, a) + 0.08) + lampada / (dot(b, b) + 0.05));
#if VARIANTE == 4
    // dal pavimento sale una luce viola che respira
    luce += vec3(0.05, 0.012, 0.11) * abisso * (0.6 + 0.4 * sin(tempo * 0.9 + n * 6.0)) * exp(-max(p.y, 0.0) * 5.0);
#endif
    // la polvere (o la neve del mare): puntini che salgono piano, visibili nella luce
    float g = rumore(p * 22.0 + vec3(0.0, -tempo * 0.25, tempo * 0.05));
    luce += particelle * smoothstep(0.86, 0.97, g) * (0.15 + raggio * 3.0 + lampadina * 0.02 / (dot(a, a) + 0.3)) * raggi;
    float tr = exp(-d * dt);
    S += T * (1.0 - tr) * luce;
    T *= tr;
  }
  gl_FragColor = vec4(col * T + S, 1.0);
}`;

class PassoNebbia extends THREE.ShaderPass {
  constructor(camera, rumore, passi) {
    super(new THREE.ShaderMaterial({
      defines: { VARIANTE: 1, PASSI: passi },
      uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, tRumore: { value: rumore },
        proiezioneInv: { value: camera.projectionMatrixInverse }, mondoCamera: { value: camera.matrixWorld },
        occhio: { value: new THREE.Vector3() }, tempo: { value: 0 }, vento: { value: new THREE.Vector3() },
        aria: { value: new THREE.Vector3() }, raggi: { value: new THREE.Vector3() }, caldo: { value: new THREE.Vector3() },
        densita: { value: 0 }, strato: { value: 0 }, altezza: { value: 1 }, ciuffi: { value: 0 }, scala: { value: 1 },
        sole: { value: 0 }, lampadina: { value: 0 }, lampada: { value: 0 }, caustiche: { value: 0 }, particelle: { value: 0 },
        abisso: { value: 0 }, bagliore: { value: 0 } },
      vertexShader: COLORE_FINALE.vertexShader,
      fragmentShader: NEBBIA_FRAG,
    }));
    this.camera = camera;
  }

  render(renderer, writeBuffer, readBuffer, dt, mask) {
    this.uniforms.tDepth.value = readBuffer.depthTexture;
    this.camera.getWorldPosition(this.uniforms.occhio.value);
    super.render(renderer, writeBuffer, readBuffer, dt, mask);
  }
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const angolo = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// la geometria compressa dei modelli si decodifica con WebAssembly; se la pagina non lo lascia usare, con la versione
// in JavaScript (piu' lenta, ma la stanza c'e' lo stesso)
const DECODER = THREE.MeshoptDecoder.supported
  ? THREE.MeshoptDecoder.ready.then(() => THREE.MeshoptDecoder, () => THREE.MeshoptDecoderJS)
  : Promise.resolve(THREE.MeshoptDecoderJS);

// scarica un file di testo contando i byte: "parte(f)" dice a che punto e' (0-1), se il server dice quanto pesa
async function scarica(url, parte) {
  const risposta = await fetch(url);
  if (!risposta.ok) throw new Error(`${url}: ${risposta.status}`);
  const tot = Number(risposta.headers.get("content-length")) || 0;
  if (!tot || !risposta.body) return risposta.text();
  const lettore = risposta.body.getReader();
  const pezzi = [];
  let letti = 0;
  for (;;) {
    const { done, value } = await lettore.read();
    if (done) break;
    pezzi.push(value);
    letti += value.length;
    // compresso dal server, il file arriva piu' grande di quanto annunciato
    parte(Math.min(0.99, letti / tot));
  }
  return new Blob(pezzi).text();
}

// i modelli sono glTF in un file .json (gli Artifact non servono i .glb), con la geometria compressa dentro in
// base64 (tools/tre/alleggerisci.mjs): la si decodifica qui e si rimette insieme un GLB in memoria, cosi' il browser
// non deve leggere un indirizzo data: (che il sito della pagina potrebbe bloccare); le texture WebP arrivano dai
// file accanto
async function caricaModello(loader, nome, parte) {
  const j = JSON.parse(await scarica(MOD + nome + ".json", parte));
  // i mobili in plastilina: senza la texture di metallo e ruvidezza (troppa memoria sul telefono, e la creta non luccica)
  if (nome.startsWith("creta/")) for (const m of j.materials || []) delete m.pbrMetallicRoughness?.metallicRoughnessTexture;
  const uri = j.buffers[0].uri;
  const bin = Uint8Array.from(atob(uri.slice(uri.indexOf(",") + 1)), (c) => c.charCodeAt(0));
  delete j.buffers[0].uri;
  const testo = new TextEncoder().encode(JSON.stringify(j));
  const lj = (testo.length + 3) & ~3, lb = (bin.length + 3) & ~3;
  const glb = new Uint8Array(28 + lj + lb);
  const v = new DataView(glb.buffer);
  v.setUint32(0, 0x46546c67, true); // "glTF"
  v.setUint32(4, 2, true);
  v.setUint32(8, glb.length, true);
  v.setUint32(12, lj, true);
  v.setUint32(16, 0x4e4f534a, true); // "JSON"
  glb.set(testo, 20);
  glb.fill(0x20, 20 + testo.length, 20 + lj);
  v.setUint32(20 + lj, lb, true);
  v.setUint32(24 + lj, 0x004e4942, true); // "BIN"
  glb.set(bin, 28 + lj);
  return (await loader.parseAsync(glb.buffer, MOD + nome.replace(/[^/]*$/, ""))).scene;
}

// le texture dei mobili fatti prima della plastilina (quasi foto): rimpicciolite e ingrandite di nuovo, come creta
// lisciata col dito (le impronte le mette il materiale)
function ammorbidisci(t, lato = 256) {
  const im = t?.image;
  if (!im || !im.width || im.width <= lato) return t;
  const k = lato / Math.max(im.width, im.height);
  const c = document.createElement("canvas");
  c.width = Math.max(8, Math.round(im.width * k));
  c.height = Math.max(8, Math.round(im.height * k));
  const g = c.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.drawImage(im, 0, 0, c.width, c.height);
  const n = new THREE.CanvasTexture(c);
  for (const k2 of ["colorSpace", "flipY", "wrapS", "wrapT", "channel"]) n[k2] = t[k2];
  n.repeat.copy(t.repeat);
  n.offset.copy(t.offset);
  n.anisotropy = 4;
  return n;
}

// un materiale copiato (per illuminare un oggetto da solo) tiene il "bollire" della creta e l'ombra degli angoli
function copia(m) {
  const c = m.clone();
  c.onBeforeCompile = m.onBeforeCompile;
  if (Object.hasOwn(m, "customProgramCacheKey")) c.customProgramCacheKey = m.customProgramCacheKey;
  return c;
}

// l'angolo che raddrizza un mobile: quello per cui il rettangolo che contiene la sua pianta e' il piu' piccolo
function raddrizza(obj) {
  const xs = [], zs = [];
  const p = new THREE.Vector3();
  obj.updateMatrixWorld(true);
  obj.traverse((o) => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position;
    const passo = Math.max(1, Math.floor(pos.count / 2500));
    for (let i = 0; i < pos.count; i += passo) {
      p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      xs.push(p.x);
      zs.push(p.z);
    }
  });
  let meglio = 0, area = Infinity;
  for (let g = 0; g < 90; g += 0.5) {
    const a = g * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i] * c - zs[i] * s, z = xs[i] * s + zs[i] * c;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (z < z0) z0 = z;
      if (z > z1) z1 = z;
    }
    const ar = (x1 - x0) * (z1 - z0);
    if (ar < area - 1e-9) { area = ar; meglio = a; }
  }
  return meglio;
}

export class Stanza {
  static disponibile() {
    try {
      return !!document.createElement("canvas").getContext("webgl2");
    } catch {
      return false;
    }
  }

  // "schermo" e' l'elemento su cui arrivano puntatore e tocchi
  constructor(schermo) {
    this.schermo = schermo;
    this.canvas = document.createElement("canvas");
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    r.outputColorSpace = THREE.SRGBColorSpace;
    // ACES col filtro plumbeo (se una versione nuova di Three.js non lo lascia mettere, ACES da solo)
    r.toneMapping = !CRETA && THREE.ShaderChunk.tonemapping_pars_fragment !== SENZA_FILTRO ? THREE.CustomToneMapping : THREE.ACESFilmicToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    // le ombre si ricalcolano solo quando qualcosa cambia (la luce, la porta dell'ospite): la stanza e' ferma, e
    // ogni ricalcolo ridisegna tutti i modelli due volte (per il sole e per la lampada)
    r.shadowMap.autoUpdate = false;
    r.setPixelRatio(1);
    this.renderer = r;
    this.scala = 1;
    this.adattiva = true;
    this.ritmo = { tempo: 0, fotogrammi: 0 };
    this.adatta(1280);
    this.scena = new THREE.Scene();
    this.scena.background = new THREE.Color(0x050403);
    this.camera = new THREE.PerspectiveCamera(VISTA, 16 / 9, 0.03, 40);
    this.camera.rotation.order = "YXZ";
    this.raggio = new THREE.Raycaster();
    this.pezzi = {}; // id dell'oggetto (o "@" e il pezzo della scrivania) -> mesh, per illuminarle passandoci sopra
    this.nomiPezzi = {}; // id del pezzo della scrivania -> nome da scrivere (li da' gioco.js)
    this.seduto = null; // alla scrivania: da dove parte la camera e a che punto e' del movimento
    this.puntatore = [0.5, 0.5];
    this.ingombri = []; // la pianta dei mobili [x0, z0, x1, z1]: li' non si cammina
    // chi cammina: posizione sul pavimento, velocita', sguardo, percorso verso un punto o un oggetto
    this.pos = new THREE.Vector2(0, 0);
    this.vel = new THREE.Vector2(0, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.percorso = [];
    this.meta = null;
    this.verso = null;
    this.tasti = {};
    this.passi = 0;
    this.attiva = false;
    this.sopra = null;
    this.giu = null;
    this.ultimoSopra = 0;
    // il puntatore bloccato (lo sguardo col mouse); senzaBlocco: il browser non lo permette, si trascina
    this.bloccato = false;
    this.senzaBlocco = !("requestPointerLock" in schermo);
    // chi usa la stanza: cosa fare con un oggetto, cosa scrivere sotto il mirino, se ora si puo' muovere, e
    // cosa fare quando il puntatore si blocca o si libera
    this.onUsa = () => {};
    this.onScrivania = () => {};
    this.onPasso = () => {};
    // il controller (gioco/js/controller.js): la levetta sinistra, e se c'e' il mirino al centro
    this.levetta = new THREE.Vector2(0, 0);
    this.conLeva = false;
    this.onSopra = () => {};
    this.onBlocco = () => {};
    this.puoi = () => true;
    this.ascolta();
  }

  // la risoluzione del 3D: quella dello schermo, fino a 1600 punti, per la "scala" che si adatta alla velocita'
  // (regola); sopra c'e' comunque il VHS, che ammorbidisce
  adatta(larghezza) {
    this.larghezza = larghezza;
    const w = Math.round(clamp(larghezza * this.scala, 480, 1600) / 16) * 16;
    const h = Math.round(w * 9 / 16);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.renderer.setSize(w, h, false);
      this.composer?.setSize(w, h);
    }
  }

  // se per un paio di secondi i fotogrammi sono lenti (un telefono debole) il 3D si disegna piu' piccolo, se
  // tornano veloci risale; le pause lunghe (la scheda nascosta, un caricamento) non contano
  regola(dt) {
    if (!this.adattiva || dt > 0.25) return;
    const r = this.ritmo;
    r.tempo += dt;
    r.fotogrammi++;
    if (r.tempo < 2) return;
    const medio = r.tempo / r.fotogrammi;
    r.tempo = r.fotogrammi = 0;
    const prima = this.scala;
    if (medio > 1 / 28) this.scala = Math.max(0.55, this.scala - 0.15);
    else if (medio < 1 / 50) this.scala = Math.min(1, this.scala + 0.15);
    if (this.scala !== prima) this.adatta(this.larghezza);
  }

  // carica texture e modelli e costruisce la stanza; "avanzamento(f)" dice a che punto e' (0-1): le texture sono il
  // primo decimo, il resto sono i modelli, che sono una ventina e pesano parecchio (ognuno conta per la sua parte)
  async carica(avanzamento = () => {}) {
    if (HQ) {
      try {
        await this.caricaHQ(avanzamento);
        return;
      } catch (err) {
        console.warn("La stanza ad alta qualità non si carica, resta quella di prima:", err);
        Object.assign(this, { hq: null, composer: null, cardine: null, pezzi: {}, ingombri: [], modelli: {} });
        OGGETTI.cappotto = { nome: "Il cappotto", sosta: [-0.75, 2.35], guarda: [-0.55, 1.5, 3.0] };
      }
    }
    const sorgente = (m) => (CRETA && m.creta ? `creta/${m.creta}` : m.nome);
    const nomiModelli = [...new Set(MODELLI.map(sorgente))];
    const parti = new Map(nomiModelli.map((n) => [n, 0]));
    let texture = 0;
    const dici = () => avanzamento(0.1 * texture + (0.9 * [...parti.values()].reduce((a, b) => a + b, 0)) / parti.size);
    const tl = new THREE.TextureLoader();
    const nomi = ["carta_parati.jpg", "pavimento.jpg", "pavimento_normale.jpg", "legno.jpg", "porta.jpg",
      "santino.jpg", "calendario.jpg", "finestra.jpg", "finestra_chiusa.jpg", "finestra_luce.jpg", "mappa.jpg",
      "tappeto.jpg"];
    const T = {};
    await Promise.all(nomi.map(async (n) => {
      const t = await tl.loadAsync(IMG + n);
      t.colorSpace = n.includes("normale") ? THREE.NoColorSpace : THREE.SRGBColorSpace;
      t.anisotropy = 8;
      T[n.replace(/\.\w+$/, "")] = t;
    }));
    for (const n of ["carta_parati", "pavimento", "pavimento_normale", "legno"]) T[n].wrapS = T[n].wrapT = THREE.RepeatWrapping;
    if (CRETA) {
      // le superfici di creta (tools/texture_creta.py): le coordinate dei muri sono gia' in "metri"
      const [muro, pavimento, soffitto, grezzo] = await Promise.all(["muro_camera", "pavimento_legno", "soffitto", "intonaco_grezzo"]
        .map((n) => C.superficie(n, 1)));
      Object.assign(T, { creta: { muro, pavimento, soffitto, grezzo } });
      // le immagini di prima (quasi foto) ammorbidite: dalla finestra si vede appena, come da un vetro sporco
      for (const [n, lato] of [["legno", 128], ["finestra", 40], ["finestra_luce", 40], ["finestra_chiusa", 160], ["porta", 192],
        ["calendario", 160], ["santino", 128], ["tappeto", 128]]) T[n] = ammorbidisci(T[n], lato);
    }
    this.T = T;
    texture = 1;
    dici();
    // la luce morbida che si riflette sui materiali (soprattutto il ferro del letto, il rubinetto, i vetri)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scena.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    // un modello che non arriva non ferma la stanza: manca solo quell'oggetto
    const gltf = new THREE.GLTFLoader().setMeshoptDecoder(await DECODER);
    const caricati = await Promise.allSettled(nomiModelli.map(async (n) => {
      try {
        return [n, await caricaModello(gltf, n, (f) => { parti.set(n, f); dici(); })];
      } finally {
        parti.set(n, 1);
        dici();
      }
    }));
    const scene = {};
    for (const r of caricati) {
      if (r.status === "fulfilled") scene[r.value[0]] = r.value[1];
      else console.warn("Modello non caricato:", r.reason);
    }
    this.costruisci(T);
    this.modelli = {};
    const usati = {};
    for (const m of MODELLI) {
      if (m.sopra && !this.su) this.pianoScrivania();
      const n = sorgente(m), s = scene[n];
      if (!s) continue;
      // la prima volta il modello com'e', le altre una copia (le sedie)
      this.mettiModello(m, usati[n] ? s.clone(true) : s);
      usati[n] = true;
    }
    if (!this.su) this.pianoScrivania();
    this.sullaScrivania(T);
    this.ombreSulPavimento();
    this.luci();
    this.fase("mattina");
  }

  // ---------- la stanza ad alta qualita' ----------

  // la stanza di Blender: il modello (cosa e' cosa e' negli userData di ogni oggetto, come li mette registra), la luce
  // cotta della mattina e della sera, la vista dalla finestra, i punti (la pianta dei mobili, i display, il piano
  // della scrivania). Si mette nella scena solo alla fine: se qualcosa non arriva, carica() fa la stanza di prima
  async caricaHQ(avanzamento) {
    const risposta = await fetch(HQ_DIR + "stanza_dati.json");
    if (!risposta.ok) throw new Error(`stanza_dati.json: ${risposta.status}`);
    const dati = await risposta.json();
    const fasi = Object.keys(dati.luce || {});
    if (!fasi.length) throw new Error("manca la luce cotta");
    const tl = new THREE.TextureLoader();
    // le coordinate dei modelli glTF hanno l'origine in alto: le immagini non si capovolgono (come le loro texture)
    const texture = async (url) => {
      const t = await tl.loadAsync(url);
      t.flipY = false;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    };
    let modello = 0, pacco = 0, altre = 0;
    const dici = () => avanzamento(0.62 * modello + 0.33 * pacco + 0.05 * altre);
    // le texture del modello arrivano in un file solo (gli Artifact hanno un limite al numero dei file): ognuna
    // diventa un indirizzo blob:, che il caricatore usa al posto del suo nome
    const blob = {};
    const manager = new THREE.LoadingManager();
    manager.setURLModifier((url) => blob[url.split("/").pop()] || url);
    const gltf = new THREE.GLTFLoader(manager).setMeshoptDecoder(await DECODER);
    const texModello = scarica(HQ_DIR + "stanza_texture.json", (f) => { pacco = f; dici(); }).then((testo) => {
      for (const [n, b64] of Object.entries(JSON.parse(testo))) {
        const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        blob[n] = URL.createObjectURL(new Blob([bin], { type: "image/webp" }));
      }
      pacco = 1;
      dici();
    });
    const luce = (elenco) => Promise.all(Object.entries(elenco || {}).map(async ([f, l]) => [f, { tex: await texture(HQ_DIR + l.file), scala: l.scala }]));
    const [radice, luci, piccoli, viste, mappa] = await Promise.all([
      // il modello si legge dopo le sue texture (le cerca subito)
      texModello.then(() => caricaModello(gltf, "hq/stanza", (f) => { modello = f; dici(); })),
      luce(dati.luce),
      luce(dati.piccoli),
      Promise.all(Object.entries(dati.vista || {}).map(async ([f, n]) => [f, await texture(HQ_DIR + n)])),
      texture(IMG + "mappa.jpg").catch(() => null),
    ]);
    modello = altre = 1;
    dici();
    for (const u of Object.values(blob)) URL.revokeObjectURL(u);
    const hq = { dati, luci: Object.fromEntries(luci), piccoli: Object.fromEntries(piccoli), viste: Object.fromEntries(viste),
      materiali: [], ambiente: {} };
    // la luce cotta sulle seconde coordinate, senza mipmap: le isole sono vicinissime, e rimpicciolita la luce di un
    // oggetto finirebbe su quello accanto
    for (const l of [...Object.values(hq.luci), ...Object.values(hq.piccoli)]) {
      l.tex.channel = 1;
      l.tex.generateMipmaps = false;
      l.tex.minFilter = THREE.LinearFilter;
    }
    const nodo = (n) => radice.getObjectByName(n);
    // le cose piccole (sulla scrivania, la lampada, la televisione...) hanno la loro luce cotta, in un'altra immagine
    // piu' fitta ("atlante" negli userData, del modello o del gruppo dei suoi pezzi): i loro materiali si copiano, se
    // li usa anche altro, e si segnano
    const atlante = (o) => { for (let x = o; x && x !== radice; x = x.parent) if (x.userData.atlante) return x.userData.atlante; return null; };
    const copie = new Map();
    const perPiccoli = (m) => {
      if (!copie.has(m)) {
        const c = m.clone();
        c.userData.piccoli = true;
        copie.set(m, c);
      }
      return copie.get(m);
    };
    const prima = (l) => l.mattina || Object.values(l)[0];
    // i materiali: la luce cotta su tutto quello che ha le seconde coordinate (niente occlusione: e' gia' nella luce,
    // e dalla foto della stanza solo i riflessi); la vista e il vetro si rifanno qui
    radice.traverse((o) => {
      if (!o.isMesh) return;
      if (o.name.startsWith("vista")) {
        o.material = new THREE.MeshStandardMaterial({ name: "vista", color: 0x000000, emissive: 0xffffff, roughness: 1,
          emissiveMap: hq.viste.mattina || null });
        return;
      }
      if (o.name.startsWith("vetro")) {
        o.material = new THREE.MeshPhysicalMaterial({ name: "vetro", color: 0xffffff, roughness: 0.03, metalness: 0,
          transparent: true, opacity: 0.08, depthWrite: false });
        return;
      }
      // il vetro della lampadina: nel modello e' un vetro che rifrange, e qui veniva nero, una palla scura che copriva
      // il filamento acceso (28 ottobre). Un vetro smerigliato che fa luce, come una lampadina accesa: la sua luce
      // segue quella della lampadina (faseHQ), meno forte di quella del filamento
      if (o.material?.name === "lightbulb_01_glass") {
        o.material = new THREE.MeshStandardMaterial({ name: "lightbulb_01_vetro", color: 0x000000, emissive: 0xffd49a,
          roughness: 0.5, transparent: true, opacity: 0.9 });
        o.material.userData.vetro = true;
        return;
      }
      // i colori dei vertici non servono (tolti gia' nell'esportazione; se ne arrivano, tingerebbero il materiale)
      if (o.geometry.attributes.color) {
        o.geometry.deleteAttribute("color");
        for (const m of [].concat(o.material)) m.vertexColors = false;
      }
      if (!o.geometry.attributes.uv1) return;
      if (piccoli.length && atlante(o) === "piccoli") o.material = Array.isArray(o.material) ? o.material.map(perPiccoli) : perPiccoli(o.material);
      for (const m of [].concat(o.material)) {
        const l = prima(m.userData.piccoli ? hq.piccoli : hq.luci);
        m.aoMap = null;
        m.onBeforeCompile = soloRiflessi;
        m.customProgramCacheKey = () => "hq";
        m.lightMap = l.tex;
        m.lightMapIntensity = Math.PI * l.scala;
        m.envMapIntensity = 1;
        m.needsUpdate = true;
      }
    });
    // le tende hanno una texture bianca per la loro luce: cosi' evidenzia() non la spegne (illumina solo i materiali
    // senza)
    const bianco = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    bianco.needsUpdate = true;
    radice.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material)) if (m.name === "tenda") m.emissiveMap = bianco; });
    // cosa e' cosa: gli oggetti che si usano e i pezzi della scrivania (registra copia i materiali, per illuminarli)
    this.pezzi = {};
    for (const n of [...radice.children]) {
      if (n.userData.oggetto) this.registra(n.userData.oggetto, n);
      if (n.userData.pezzo) this.segna(n.userData.pezzo, n);
    }
    // le cose che fanno luce da se', coi materiali gia' copiati: la vista dalla finestra, le tende che la mattina il
    // sole attraversa, la lampadina nuda e quella della lampada (piu' forti la sera), la luce delle scale sotto la porta
    hq.vista = [];
    hq.tende = [];
    hq.lampadina = [];
    hq.scale = [];
    radice.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of [].concat(o.material)) {
        if (m.name === "vista") hq.vista.push(m);
        if (m.name === "tenda") hq.tende.push(m);
        if (m.name === "luce_scale") hq.scale.push(m);
        if (m.name.startsWith("lightbulb_01") && (m.emissiveMap || m.emissive?.getHex())) hq.lampadina.push(m);
        if (m.name === "desk_lamp_arm_01_light") hq.lampadina.push(m);
      }
    });
    // la mappa sulla scrivania: quella del gioco (nel modello ce n'e' una piccola, al suo posto)
    if (mappa) nodo("mappa")?.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material)) { m.map = mappa; m.needsUpdate = true; } });
    // il giornale piegato sulla scrivania: la prima pagina la ridisegna giornale() col giornale del giorno
    this.giornaleNodo = nodo("giornale") || null;
    this.giornaleDi = null;
    // i modelli che servono ad altri (il letto per la coperta di chi dorme, la porta della stanzetta che gira)
    radice.updateMatrixWorld(true);
    const letto = new THREE.Group();
    radice.add(letto);
    for (const n of ["old_bed_frame", "materasso", "cuscino", "lenzuolo", "coperta"]) { const o = nodo(n); if (o) letto.attach(o); }
    this.modelli = { letto, brandina: nodo("brandina"), comodino: nodo("painted_wooden_nightstand"),
      videoregistratore: nodo("videoregistratore"), lampada: nodo("desk_lamp_arm_01") };
    // la porta della stanzetta gira sul cardine (a sud): un gruppo li', con dentro la porta (la compressione della
    // geometria sposta l'origine dei modelli, il cardine e' nei punti)
    const porta = nodo("porta_ospite");
    this.cardine = null;
    if (porta && dati.cerniera) {
      this.cardine = new THREE.Group();
      this.cardine.position.set(...dati.cerniera);
      radice.add(this.cardine);
      this.cardine.updateMatrixWorld(true);
      this.cardine.attach(porta);
    }
    this.aperturaOspite = 0;
    this.ingombri = (dati.ingombri || []).map((r) => r.slice());
    this.su = dati.su || 0.77;
    // i display: le 12:00 del videoregistratore e l'ora della radiosveglia, disegnati qui, appena davanti a quelli
    // del modello; si accendono da soli, anche al buio
    const display = (punto, largo, alto, tex, spessore) => {
      const m = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, roughness: 0.35 });
      const d = new THREE.Mesh(new THREE.PlaneGeometry(largo, alto), m);
      const g = punto.giro;
      d.position.set(punto.pos[0] + Math.sin(g) * (spessore / 2 + 0.0012), punto.pos[1], punto.pos[2] + Math.cos(g) * (spessore / 2 + 0.0012));
      d.rotation.y = g;
      radice.add(d);
      return d;
    };
    hq.display = [];
    this.display = this.disegnaDisplay();
    if (dati.display) {
      const d = display(dati.display, 0.088, 0.021, this.display, 0.004);
      this.registra("videoregistratore", d);
      this.segna("nastri", d);
      hq.display.push(d.material);
    }
    this.sveglia = this.disegnaSveglia();
    if (dati.sveglia) {
      const d = display(dati.sveglia, 0.098, 0.033, this.sveglia, 0.003);
      this.registra("orologio", d);
      hq.display.push(d.material);
    }
    // la luce delle scale che passa sotto la porta, la sera
    this.matFessura = new THREE.MeshBasicMaterial({ color: 0xffb066 });
    const fessura = new THREE.Mesh(new THREE.PlaneGeometry(PORTA.largo - 0.08, 0.009), this.matFessura);
    fessura.rotation.y = Math.PI;
    fessura.position.set(PORTA.x, 0.0045, Z1 + 0.016);
    radice.add(fessura);
    // tutti i materiali con la luce cotta (anche le copie di registra): fase() cambia la luce a tutti
    radice.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material)) if (m.lightMap && !hq.materiali.includes(m)) hq.materiali.push(m); });
    // il disegno: AgX come le anteprime di Blender, poi l'alone delle luci forti e il colore
    const r = this.renderer;
    r.toneMapping = THREE.AgXToneMapping;
    r.shadowMap.enabled = false;
    const w = this.canvas.width, h = this.canvas.height;
    const tocco = typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: tocco ? 0 : 4 });
    // la profondita' della scena, per la nebbia delle proposte lovecraftiane
    rt.depthTexture = new THREE.DepthTexture(w, h);
    const c = new THREE.EffectComposer(r, rt);
    c.addPass(new THREE.RenderPass(this.scena, this.camera));
    this.rumore = texturaRumore();
    this.passoNebbia = new PassoNebbia(this.camera, this.rumore, tocco ? 10 : 20);
    this.passoNebbia.enabled = false;
    c.addPass(this.passoNebbia);
    this.alone = new THREE.UnrealBloomPass(new THREE.Vector2(w, h), HQ_ALONE.forza, HQ_ALONE.raggio, HQ_ALONE.soglia);
    c.addPass(this.alone);
    c.addPass(new THREE.OutputPass());
    this.colore = new THREE.ShaderPass(COLORE_FINALE);
    this.colore.uniforms.tRumore.value = this.rumore;
    c.addPass(this.colore);
    c.setSize(w, h);
    this.scena.background = new THREE.Color(0x000000);
    this.scena.add(radice);
    this.hq = hq;
    this.composer = c;
    this.nebbiaN = 0;
    this.fase("mattina");
    this.nebbia(NEBBIA_INIZIO);
  }

  // la proposta lovecraftiana n (NEBBIE; 0 e' la stanza com'era): la nebbia, e alla fine il colore, la deformazione,
  // i colori separati e il buio a tentacoli
  nebbia(n) {
    if (!this.passoNebbia) return;
    const N = NEBBIE[n];
    this.nebbiaN = N ? n : 0;
    const p = this.passoNebbia, u = p.uniforms, k = this.colore.uniforms;
    p.enabled = !!N;
    k.ombre.value.set(...(N?.ombre || TONO_STANZA.ombre));
    k.tinta.value = N?.tinta ?? 1;
    k.luci.value.set(...(N?.luci || TONO_STANZA.luci));
    k.deforma.value = N?.deforma || 0;
    k.aberrazione.value = N?.aberrazione || 0;
    k.tentacoli.value = N?.tentacoli || 0;
    if (!N) return;
    if (p.material.defines.VARIANTE !== n) {
      p.material.defines.VARIANTE = n;
      p.material.needsUpdate = true;
    }
    for (const c of ["altezza", "ciuffi", "scala"]) u[c].value = N[c];
    for (const c of ["caustiche", "particelle", "abisso", "bagliore"]) u[c].value = N[c] || 0;
    u.vento.value.set(...N.vento);
    u.raggi.value.set(...N.raggi);
    u.caldo.value.set(...N.caldo);
    this.luceNebbia();
  }

  // le luci della nebbia secondo la fase: la mattina il sole a raggi, la sera la lampada della scrivania e l'alone
  // della lampadina; la sera l'aria e' piu' scura e la nebbia piu' fitta
  luceNebbia() {
    const N = NEBBIE[this.nebbiaN];
    if (!N) return;
    const u = this.passoNebbia.uniforms;
    const sera = this.faseOra === "sera";
    const L = HQ_LUCE[this.faseOra] || HQ_LUCE.mattina;
    u.sole.value = sera ? 0 : 1;
    u.lampadina.value = L.lampadina * 0.03;
    u.lampada.value = sera ? L.lampadina * 0.012 : 0;
    u.aria.value.set(...N.aria).multiplyScalar(sera ? 0.7 : 1);
    u.densita.value = N.densita * (sera ? 1.4 : 1);
    u.strato.value = N.strato * (sera ? 1.2 : 1);
  }

  // la luce della mattina o della sera nella stanza HQ: la luce cotta, la vista, la lampadina, la tenda, la luce sotto
  // la porta, l'esposizione; e i riflessi, da una foto della stanza con quella luce (una volta per luce)
  faseHQ(f) {
    const hq = this.hq;
    this.faseOra = f;
    const L = HQ_LUCE[f] || HQ_LUCE.mattina;
    // se manca la luce cotta della sera, quella della mattina piu' scura; le cose piccole hanno la loro
    const scegli = (l) => ({ luce: l[f] || l.mattina || Object.values(l)[0], piu: l[f] ? 1 : 0.25 });
    const stanza = scegli(hq.luci);
    const piccole = Object.keys(hq.piccoli).length ? scegli(hq.piccoli) : stanza;
    for (const m of hq.materiali) {
      const { luce, piu } = m.userData.piccoli ? piccole : stanza;
      m.lightMap = luce.tex;
      m.lightMapIntensity = Math.PI * luce.scala * piu;
    }
    for (const m of hq.vista) {
      m.emissiveMap = hq.viste[f] || hq.viste.mattina || null;
      m.emissiveIntensity = L.vista;
      m.needsUpdate = true;
    }
    for (const m of hq.lampadina) m.emissiveIntensity = L.lampadina * (m.userData.vetro ? 0.3 : 1);
    for (const m of hq.scale) m.emissiveIntensity = L.fessura ? 1 : 0;
    for (const m of hq.tende) {
      m.emissive.setHex(0xffe8c4);
      m.emissiveIntensity = L.tenda;
    }
    // i display non devono bruciare con l'esposizione
    for (const m of hq.display) m.emissiveIntensity = 1.7 / L.esposizione;
    this.matFessura.color.setHex(0xffb066).multiplyScalar(L.fessura);
    this.renderer.toneMappingExposure = L.esposizione;
    if (!hq.ambiente[f]) {
      // la foto della stanza dal centro, all'altezza degli occhi: i riflessi del pavimento, del ferro, dei vetri
      const rt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
      const cam = new THREE.CubeCamera(0.05, 30, rt);
      cam.position.set(0.2, 1.5, -0.6);
      this.scena.environment = null;
      cam.update(this.renderer, this.scena);
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      hq.ambiente[f] = pmrem.fromCubemap(rt.texture).texture;
      pmrem.dispose();
      rt.dispose();
    }
    this.scena.environment = hq.ambiente[f];
    this.scena.environmentIntensity = 1;
    this.luceNebbia();
  }

  // ---------- la stanza ----------

  costruisci(T) {
    const S = this.scena;
    // in plastilina tutto e' creta (tranne lo specchio, che resta vetro); le immagini intere (la porta, il calendario,
    // la mappa...) con impronte leggere
    const creta = ({ map = null, normalMap, color = 0xffffff, roughness = 0.8, emissive, emissiveMap, aoMap, impronte = 0.9, normalScale, ...resto }) => {
      const m = C.materiale({ map, normalMap, color, ruvido: Math.max(0.45, roughness), emissive, impronte });
      if (normalScale) m.normalScale.copy(normalScale);
      if (emissiveMap) m.emissiveMap = emissiveMap;
      if (aoMap) m.aoMap = aoMap;
      if (resto.envMapIntensity != null) m.envMapIntensity = resto.envMapIntensity * 0.4;
      return m;
    };
    const mat = (o) => CRETA && !(o.metalness > 0.5) ? creta(o) : new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
    const intera = (o) => { const m = mat(CRETA ? { impronte: 0.35, ...o } : o); m.userData.intera = true; return m; };
    this.mat = { mat, intera };
    const K = T.creta;
    // l'ombra negli angoli: piu' scuro vicino al pavimento, al soffitto e negli spigoli
    this.aoMuri = this.angoli();
    const carta = this.conAngoli(CRETA ? mat({ map: K.muro.map, normalMap: K.muro.normalMap, color: 0xb9a586, aoMap: this.aoMuri, impronte: 1 })
      : mat({ map: T.carta_parati, color: 0xe4d8bf, aoMap: this.aoMuri }));
    const intonaco = mat({ color: 0xd8cfbd, roughness: 0.95 });
    const scuro = mat({ map: T.legno, color: 0x5e3f2a, roughness: 0.7 });
    const bianco = mat({ color: 0xe9e4d8, roughness: 0.6 });
    this.mat.scuro = scuro;

    // il pavimento: le assi col loro rilievo; l'ombra sotto i mobili arriva dopo (ombreSulPavimento)
    const pav = this.superficie(X1 - X0, Z1 - Z0, CRETA ? mat({ map: K.pavimento.map, normalMap: K.pavimento.normalMap, color: 0xb7a089, roughness: 0.7, impronte: 1 })
      : mat({ map: T.pavimento, normalMap: T.pavimento_normale, normalScale: new THREE.Vector2(0.55, 0.55), color: 0xc6b49c, roughness: 0.78 }), CRETA ? 1.5 : 1.2);
    pav.rotation.x = -Math.PI / 2;
    pav.userData.pavimento = true;
    S.add(pav);
    this.pavimento = pav;
    // il soffitto: fa ombra, se no il sole entrerebbe da sopra
    const sof = this.superficie(X1 - X0, Z1 - Z0, this.conAngoli(CRETA ? mat({ map: K.soffitto.map, normalMap: K.soffitto.normalMap, color: 0xd6cdbb, roughness: 1, aoMap: this.aoMuri })
      : mat({ color: 0xd6cdbb, roughness: 1, aoMap: this.aoMuri })), CRETA ? 1.5 : null);
    sof.rotation.x = Math.PI / 2;
    sof.position.y = ALTA;
    sof.castShadow = true;
    S.add(sof);

    // le pareti, con la carta da parati che continua da un pezzo all'altro; quella della finestra e' fatta a pezzi
    // attorno al buco della finestra, e fa ombra: il sole entra solo dai vetri
    const parete = (verso, a0, a1, y0, y1) => {
      const m = this.muro(verso, a0, a1, y0, y1, carta, METRI_MURO);
      m.castShadow = true;
      S.add(m);
      return m;
    };
    parete("nord", X0, FIN.x0, 0, ALTA);
    parete("nord", FIN.x1, X1, 0, ALTA);
    parete("nord", FIN.x0, FIN.x1, 0, FIN.y0);
    parete("nord", FIN.x0, FIN.x1, FIN.y1, ALTA);
    parete("sud", X0, X1, 0, ALTA);
    parete("ovest", Z0, Z1, 0, ALTA);
    const o0 = OSPITE.z - OSPITE.largo / 2, o1 = OSPITE.z + OSPITE.largo / 2;
    parete("est", Z0, o0, 0, ALTA);
    parete("est", o1, Z1, 0, ALTA);
    parete("est", o0, o1, OSPITE.alto, ALTA);

    // il battiscopa e la cornice in alto
    for (const [verso, a0, a1] of [["nord", X0, X1], ["sud", X0, PORTA.x - PORTA.largo / 2 - 0.08],
      ["sud", PORTA.x + PORTA.largo / 2 + 0.08, X1], ["ovest", Z0, Z1], ["est", Z0, o0 - 0.08], ["est", o1 + 0.08, Z1]]) {
      this.listello(verso, a0, a1, 0.05, 0.1, 0.018, scuro);
    }
    for (const [verso, a0, a1] of [["nord", X0, X1], ["sud", X0, X1], ["ovest", Z0, Z1], ["est", Z0, Z1]]) {
      this.listello(verso, a0, a1, ALTA - 0.05, 0.1, 0.05, bianco);
    }

    // la finestra incassata: gli sguanci d'intonaco, il davanzale di marmo che sporge, i vetri in fondo. La mattina i
    // vetri fanno luce; la sera la tapparella e' abbassata
    const fondo = Z0 - FIN.fondo;
    const lw = FIN.x1 - FIN.x0, lh = FIN.y1 - FIN.y0;
    for (const [x, ry] of [[FIN.x0, Math.PI / 2], [FIN.x1, -Math.PI / 2]]) {
      const g = this.superficie(FIN.fondo, lh, intonaco);
      g.rotation.y = ry;
      g.position.set(x, FIN.y0 + lh / 2, Z0 - FIN.fondo / 2);
      g.castShadow = true;
      S.add(g);
    }
    const cielo = this.superficie(lw, FIN.fondo, intonaco);
    cielo.rotation.x = Math.PI / 2;
    cielo.position.set((FIN.x0 + FIN.x1) / 2, FIN.y1, Z0 - FIN.fondo / 2);
    cielo.castShadow = true;
    S.add(cielo);
    const davanzale = this.scatola(lw + 0.08, 0.035, FIN.fondo + 0.07, mat({ color: 0xd7d1c4, roughness: 0.32 }));
    davanzale.position.set((FIN.x0 + FIN.x1) / 2, FIN.y0 - 0.0175, Z0 - FIN.fondo / 2 + 0.035);
    S.add(davanzale);
    const fin = this.superficie(lw, lh, intera({ map: T.finestra, emissiveMap: T.finestra_luce, emissive: 0xffffff, roughness: 0.6 }));
    fin.position.set((FIN.x0 + FIN.x1) / 2, FIN.y0 + lh / 2, fondo + 0.01);
    this.registra("finestra", fin);
    S.add(fin);
    // la cornice di legno attorno al buco, verso la stanza
    for (const [w, h, x, y] of [[lw + 0.12, 0.06, (FIN.x0 + FIN.x1) / 2, FIN.y1 + 0.03], [0.06, lh, FIN.x0 - 0.03, FIN.y0 + lh / 2],
      [0.06, lh, FIN.x1 + 0.03, FIN.y0 + lh / 2]]) {
      const c = this.scatola(w, h, 0.025, bianco);
      c.position.set(x, y, Z0 + 0.0125);
      S.add(c);
    }

    // la porta sulla parete di fronte, con lo stipite, la luce delle scale che passa sotto e l'interruttore
    const porta = this.superficie(PORTA.largo, PORTA.alto, intera({ map: T.porta }));
    porta.rotation.y = Math.PI;
    porta.position.set(PORTA.x, PORTA.alto / 2, Z1 - 0.012);
    this.registra("porta", porta);
    S.add(porta);
    for (const [w, h, x, y] of [[PORTA.largo + 0.2, 0.08, PORTA.x, PORTA.alto + 0.04], [0.08, PORTA.alto, PORTA.x - PORTA.largo / 2 - 0.04, PORTA.alto / 2],
      [0.08, PORTA.alto, PORTA.x + PORTA.largo / 2 + 0.04, PORTA.alto / 2]]) {
      const c = this.scatola(w, h, 0.03, bianco);
      c.position.set(x, y, Z1 - 0.015);
      S.add(c);
    }
    this.matFessura = new THREE.MeshBasicMaterial({ color: 0xffb066 });
    const fessura = new THREE.Mesh(new THREE.PlaneGeometry(PORTA.largo - 0.1, 0.012), this.matFessura);
    fessura.rotation.y = Math.PI;
    fessura.position.set(PORTA.x, 0.006, Z1 - 0.016);
    S.add(fessura);
    const interruttore = this.scatola(0.075, 0.11, 0.014, mat({ color: 0xe8e2d2, roughness: 0.4 }));
    interruttore.position.set(PORTA.x + PORTA.largo / 2 + 0.25, 1.05, Z1 - 0.007);
    S.add(interruttore);
    const presa = this.scatola(0.075, 0.075, 0.012, mat({ color: 0xe8e2d2, roughness: 0.4 }));
    presa.position.set(0.25, 0.32, Z0 + 0.006);
    S.add(presa);

    // la porta della stanzetta dell'ospite: il buco nel muro con gli sguanci d'intonaco, lo stipite e l'anta, che
    // gira sul cardine dalla parte di sud (la maniglia e' a nord) e si apre verso la stanzetta
    for (const [z, ry] of [[o0, 0], [o1, Math.PI]]) {
      const g = this.superficie(OSPITE.muro, OSPITE.alto, intonaco);
      g.rotation.y = ry;
      g.position.set(X1 + OSPITE.muro / 2, OSPITE.alto / 2, z);
      S.add(g);
    }
    const architrave = this.superficie(OSPITE.muro, OSPITE.largo, intonaco);
    architrave.rotation.x = Math.PI / 2;
    architrave.position.set(X1 + OSPITE.muro / 2, OSPITE.alto, OSPITE.z);
    S.add(architrave);
    for (const [d, h, z, y] of [[OSPITE.largo + 0.2, 0.08, OSPITE.z, OSPITE.alto + 0.04], [0.08, OSPITE.alto, o0 - 0.04, OSPITE.alto / 2],
      [0.08, OSPITE.alto, o1 + 0.04, OSPITE.alto / 2]]) {
      const c = this.scatola(0.03, h, d, bianco);
      c.position.set(X1 - 0.015, y, z);
      S.add(c);
    }
    const faccia = intera({ map: T.porta });
    const costa = mat({ map: T.legno, color: 0xb8a68e, roughness: 0.7 });
    const anta = this.scatola(0.04, OSPITE.alto - 0.01, OSPITE.largo - 0.01, [faccia, faccia, costa, costa, costa, costa]);
    anta.position.set(0, (OSPITE.alto - 0.01) / 2, -(OSPITE.largo - 0.01) / 2);
    this.cardine = new THREE.Group();
    this.cardine.position.set(X1 + 0.03, 0, o1 - 0.005);
    this.cardine.add(anta);
    this.registra("ospite", this.cardine);
    S.add(this.cardine);
    this.aperturaOspite = 0;
    // la stanzetta: pareti, pavimento e soffitto scuri (la luce della stanza ci arriva appena); fanno ombra, cosi' il
    // sole non ci entra da sopra
    const sx0 = X1 + OSPITE.muro, { x1: sx1, z0: sz0, z1: sz1 } = STANZETTA;
    const sw = sx1 - sx0, sd = sz1 - sz0, mx = (sx0 + sx1) / 2, mz = (sz0 + sz1) / 2;
    const buio = (o) => mat({ envMapIntensity: 0.35, ...o });
    const muroBuio = CRETA ? buio({ map: K.grezzo.map, normalMap: K.grezzo.normalMap, color: 0x6a5d4c }) : buio({ map: T.carta_parati, color: 0x4a4034 });
    const pavBuio = CRETA ? buio({ map: K.pavimento.map, normalMap: K.pavimento.normalMap, color: 0x5a4a3c }) : buio({ map: T.pavimento, color: 0x5a4a3c });
    for (const [w, h, m, metri, pos, rot] of [
      [sw, sd, pavBuio, CRETA ? 1.5 : 1.2, [mx, 0, mz], [-Math.PI / 2, 0, 0]],
      [sw, sd, buio({ color: 0x3a342c }), null, [mx, ALTA, mz], [Math.PI / 2, 0, 0]],
      [sd, ALTA, muroBuio, METRI_MURO, [sx1, ALTA / 2, mz], [0, -Math.PI / 2, 0]],
      [sw, ALTA, muroBuio, METRI_MURO, [mx, ALTA / 2, sz0], [0, 0, 0]],
      [sw, ALTA, muroBuio, METRI_MURO, [mx, ALTA / 2, sz1], [0, Math.PI, 0]],
    ]) {
      const f = this.superficie(w, h, m, metri);
      f.position.set(...pos);
      f.rotation.set(...rot);
      f.castShadow = true;
      S.add(f);
    }

    // il calendario della ditta sopra la credenza, il santino sopra il letto
    const cal = this.superficie(0.3, 0.39, intera({ map: T.calendario }));
    cal.rotation.y = Math.PI / 2;
    cal.position.set(X0 + 0.01, 1.62, 0.25);
    this.registra("calendario", cal);
    S.add(cal);
    const san = this.superficie(0.24, 0.32, intera({ map: T.santino, roughness: 0.5 }));
    san.rotation.y = -Math.PI / 2;
    san.position.set(X1 - 0.012, 1.7, -2.3);
    this.registra("santino", san);
    S.add(san);

    // lo specchio sopra il lavandino: vecchio, opaco, macchiato
    const cornice = this.scatola(0.03, 0.62, 0.48, scuro);
    cornice.position.set(X0 + 0.015, 1.58, 1.75);
    S.add(cornice);
    const vetro = this.superficie(0.42, 0.56, mat({ color: 0xa9b2b4, metalness: 0.85, roughness: 0.3, envMapIntensity: 3 }));
    vetro.rotation.y = Math.PI / 2;
    vetro.position.set(X0 + 0.032, 1.58, 1.75);
    this.registra("lavandino", vetro);
    S.add(vetro);

    // il tappeto consumato in mezzo alla stanza
    const tappeto = this.superficie(2.4, 1.6, mat({ map: T.tappeto, roughness: 1 }));
    tappeto.rotation.set(-Math.PI / 2, 0, 0.04);
    tappeto.position.set(0.15, 0.004, -0.45);
    tappeto.userData.pavimento = true;
    S.add(tappeto);

    // la lampadina nuda al soffitto, spenta
    const nero = mat({ color: 0x141414, roughness: 0.6 });
    const filo = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.5), nero);
    filo.position.set(0, ALTA - 0.25, 0.3);
    S.add(filo);
    const bulbo = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), mat({ color: 0xd8d2c4, roughness: 0.2 }));
    bulbo.position.set(0, ALTA - 0.55, 0.3);
    S.add(bulbo);
    this.mat.nero = nero;
  }

  // l'ombra negli angoli dei muri e del soffitto: una texture con i bordi scuri, sulle seconde coordinate (uv1)
  angoli() {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, 256, 256);
    const bordo = (x0, y0, x1, y1, forza) => {
      const gr = g.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, `rgba(0,0,0,${forza})`);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 256, 256);
    };
    bordo(0, 256, 0, 226, 0.5); // vicino al pavimento
    bordo(0, 0, 0, 22, 0.32); // vicino al soffitto
    bordo(0, 0, 24, 0, 0.42); // negli spigoli
    bordo(256, 0, 232, 0, 0.42);
    const t = new THREE.CanvasTexture(c);
    t.channel = 1;
    return t;
  }

  // l'ombra degli angoli anche sulla luce diretta (la lampada), non solo su quella d'ambiente
  conAngoli(m, forza = 0.7) {
    const prima = Object.hasOwn(m, "onBeforeCompile") ? m.onBeforeCompile : null;
    m.onBeforeCompile = (sh, r) => {
      prima?.(sh, r);
      sh.fragmentShader = sh.fragmentShader.replace("#include <aomap_fragment>",
        `#include <aomap_fragment>\n#ifdef USE_AOMAP\nreflectedLight.directDiffuse *= mix(1.0, texture2D(aoMap, vAoMapUv).r, ${forza.toFixed(2)});\n#endif`);
    };
    // la forza cambia lo shader: programmi diversi
    m.customProgramCacheKey = () => `angoli${forza}${prima ? "creta" : ""}`;
    return m;
  }

  // un pezzo di muro: "nord" e "sud" vanno lungo x (a0..a1), "ovest" ed "est" lungo z; le coordinate della carta da
  // parati seguono il mondo, cosi' il disegno continua da un pezzo all'altro; uv1 per l'ombra degli angoli
  muro(verso, a0, a1, y0, y1, materiale, metri = 0.55) {
    const w = a1 - a0, h = y1 - y0;
    const g = new THREE.PlaneGeometry(w, h);
    const m = new THREE.Matrix4();
    const lungoX = verso === "nord" || verso === "sud";
    const ry = { nord: 0, sud: Math.PI, ovest: Math.PI / 2, est: -Math.PI / 2 }[verso];
    const centro = (a0 + a1) / 2, cy = (y0 + y1) / 2;
    const pos = { nord: [centro, cy, Z0], sud: [centro, cy, Z1], ovest: [X0, cy, centro], est: [X1, cy, centro] }[verso];
    // sud ed est sono girati: la x locale va al contrario
    m.makeRotationY(ry).setPosition(...pos);
    g.applyMatrix4(m);
    const p = g.attributes.position, uv = g.attributes.uv;
    const uv1 = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      const a = lungoX ? p.getX(i) : p.getZ(i);
      const lungo = lungoX ? X1 - X0 : Z1 - Z0, inizio = lungoX ? X0 : Z0;
      uv.setXY(i, (a - inizio) / metri, p.getY(i) / metri);
      uv1[i * 2] = (a - inizio) / lungo;
      uv1[i * 2 + 1] = p.getY(i) / ALTA;
    }
    g.setAttribute("uv1", new THREE.BufferAttribute(uv1, 2));
    const mesh = new THREE.Mesh(g, materiale);
    mesh.receiveShadow = true;
    return mesh;
  }

  // un listello lungo un muro (battiscopa, cornice): alto h, profondo d, alla quota y
  listello(verso, a0, a1, y, h, d, materiale) {
    const lungoX = verso === "nord" || verso === "sud";
    const b = this.scatola(lungoX ? a1 - a0 : d, h, lungoX ? d : a1 - a0, materiale, 0.6);
    const c = (a0 + a1) / 2;
    if (verso === "nord") b.position.set(c, y, Z0 + d / 2);
    if (verso === "sud") b.position.set(c, y, Z1 - d / 2);
    if (verso === "ovest") b.position.set(X0 + d / 2, y, c);
    if (verso === "est") b.position.set(X1 - d / 2, y, c);
    this.scena.add(b);
  }

  // una superficie piana; con "metri" la texture si ripete ogni tot metri; ha anche uv1 da 0 a 1 (per le ombre)
  superficie(w, h, m, metri = null) {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv;
    g.setAttribute("uv1", uv.clone());
    if (metri) for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / metri, uv.getY(i) * h / metri);
    const mesh = new THREE.Mesh(g, m);
    mesh.receiveShadow = true;
    return mesh;
  }

  // una scatola con un materiale (o uno per faccia: +x, -x, +y, -y, +z, -z); con "metri" le facce ripetono la
  // texture ogni tot metri, tranne quelle con un'immagine intera
  scatola(w, h, d, mats, metri = null) {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    const dim = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) {
      const m = Array.isArray(mats) ? mats[f] : mats;
      if (!metri || m.userData.intera) continue;
      for (let i = f * 4; i < f * 4 + 4; i++) uv.setXY(i, uv.getX(i) * dim[f][0] / metri, uv.getY(i) * dim[f][1] / metri);
    }
    const mesh = new THREE.Mesh(g, mats);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // un modello: raddrizzato, girato, messo in scala e appoggiato al suo posto (o sulla scrivania)
  mettiModello(m, scena) {
    const obj = new THREE.Group();
    const dentro = new THREE.Group();
    dentro.add(scena);
    obj.add(dentro);
    scena.traverse((o) => {
      if (!o.isMesh) return;
      if (CRETA) {
        // i mobili in plastilina come nelle visite; quelli di prima con la texture ammorbidita e la creta sopra
        if (!m.creta && o.material.map) o.material.map = ammorbidisci(o.material.map);
        C.aCreta(o, m.creta ? 0.62 : 0.7);
        o.castShadow = m.ombra !== false;
        return;
      }
      o.castShadow = m.ombra !== false;
      o.receiveShadow = true;
      for (const mt of [].concat(o.material)) {
        // i modelli di Tripo non hanno materiali fisici: niente metallo, poco lucidi. Quelli di Meshy si', e restano
        if (!m.meshy) {
          mt.metalness = 0;
          mt.roughness = Math.max(mt.roughness ?? 0.85, 0.65);
        }
        mt.envMapIntensity = 1;
      }
    });
    // i mobili in plastilina sono gia' dritti (guardano verso +z): "giraCreta" li volta come quelli di prima
    const plastilina = CRETA && m.creta;
    if (m.allinea && !plastilina) dentro.rotation.y = -raddrizza(dentro);
    obj.rotation.set(m.rotX || 0, plastilina ? (m.giraCreta ?? m.rotY ?? 0) : (m.rotY || 0), m.rotZ || 0, "YXZ");
    obj.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(obj);
    const dim = box.getSize(new THREE.Vector3());
    if (m.dim) {
      // la scala e' nel verso del modello: girato di traverso, la sua x va lungo la z della stanza
      const sc = new THREE.Vector3(m.dim[0] / dim.x, m.dim[1] / dim.y, m.dim[2] / dim.z);
      if (Math.abs(Math.sin(m.rotY || 0)) > 0.7) [sc.x, sc.z] = [sc.z, sc.x];
      obj.scale.copy(sc);
    } else {
      const s = m.alto ? m.alto / dim.y : m.largo ? m.largo / dim.x : m.lungo ? m.lungo / Math.max(dim.x, dim.z) : 1;
      obj.scale.set(s * (m.fondo || 1), s, s);
    }
    obj.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(obj);
    const c = box.getCenter(new THREE.Vector3());
    const [x, z] = m.sopra ? [SCRIVANIA.x + m.sopra[0], SCRIVANIA.z + m.sopra[1]] : [m.x, m.z];
    const y = m.sopra ? this.su : (m.y || 0);
    obj.position.set(x - c.x, y - box.min.y, z - c.z);
    obj.updateMatrixWorld(true);
    if (m.oggetto) this.registra(m.oggetto, obj);
    if (m.pezzo) this.segna(m.pezzo, obj);
    this.scena.add(obj);
    this.modelli[m.nome] = this.modelli[m.nome] || obj;
    // la pianta del mobile, per non camminarci attraverso (non quello che sta sulla scrivania)
    if (!m.sopra) {
      box = new THREE.Box3().setFromObject(obj);
      this.ingombri.push([box.min.x + 0.02, box.min.z + 0.02, box.max.x - 0.02, box.max.z - 0.02]);
    }
    if (m.nome === "scrivania") this.su = box.max.y;
    return obj;
  }

  // se il modello della scrivania non arriva: un tavolo semplice, piano e gambe
  pianoScrivania() {
    const { x, z } = SCRIVANIA;
    const t = new THREE.Group();
    const piano = this.scatola(1.6, 0.04, 0.75, this.mat.mat({ map: this.T.legno }), 0.8);
    piano.position.set(x, 0.74, z);
    t.add(piano);
    for (const [dx, dz] of [[-0.76, -0.33], [0.76, -0.33], [-0.76, 0.33], [0.76, 0.33]]) {
      const g = this.scatola(0.05, 0.72, 0.05, this.mat.scuro, 0.6);
      g.position.set(x + dx, 0.36, z + dz);
      t.add(g);
    }
    this.registra("scrivania", t);
    this.scena.add(t);
    this.ingombri.push([x - 0.8, z - 0.375, x + 0.8, z + 0.375]);
    this.su = 0.76;
  }

  // sulla scrivania, oltre agli oggetti di Meshy: la mappa del paese aperta in mezzo e il display del
  // videoregistratore (le 12:00 che lampeggiano, su un piano davanti a quello stampato nella texture); e la
  // radiosveglia sul comodino
  sullaScrivania(T) {
    const S = this.scena;
    const { intera, nero } = this.mat;
    const mappa = this.superficie(0.5, 0.28, intera({ map: T.mappa, roughness: 0.8 }));
    mappa.rotation.x = -Math.PI / 2;
    mappa.position.set(SCRIVANIA.x, this.su + 0.002, SCRIVANIA.z - 0.03);
    this.registra("scrivania", mappa);
    this.segna("mappa", mappa);
    S.add(mappa);

    this.display = this.disegnaDisplay();
    const vcr = this.modelli.videoregistratore;
    if (vcr) {
      // il punto del display sul davanti del modello, col modello dritto; poi lo si gira come il modello
      const ry = vcr.rotation.y;
      vcr.rotation.y = 0;
      vcr.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(vcr);
      vcr.rotation.y = ry;
      vcr.updateMatrixWorld(true);
      const w = b.max.x - b.min.x, h = b.max.y - b.min.y;
      const punto = new THREE.Vector3(b.min.x + w * DISPLAY.x, b.min.y + h * DISPLAY.y, b.max.z + 0.008)
        .sub(vcr.position).applyAxisAngle(ALTO, ry).add(vcr.position);
      // le cifre verdi si accendono da sole, anche al buio
      const d = this.superficie(w * DISPLAY.largo, w * DISPLAY.largo * 0.24,
        intera({ map: this.display, emissiveMap: this.display, emissive: 0xffffff, roughness: 0.4 }));
      d.position.copy(punto);
      d.rotation.y = ry;
      this.registra("videoregistratore", d);
      this.segna("nastri", d);
      S.add(d);
    }

    // la radiosveglia sul comodino (o per terra accanto al letto, se il comodino non c'e')
    this.sveglia = this.disegnaSveglia();
    const radio = this.scatola(0.2, 0.08, 0.1, [nero, nero, nero, nero, intera({ map: this.sveglia, roughness: 0.4 }), nero]);
    const com = this.modelli.comodino;
    const sopra = com ? new THREE.Box3().setFromObject(com).max.y : 0;
    radio.position.set(1.18, sopra + 0.04, -2.8);
    radio.rotation.y = 0.35;
    this.registra("orologio", radio);
    S.add(radio);
  }

  // l'ombra morbida sul pavimento sotto e attorno ai mobili, e lungo i muri: una texture sulle seconde coordinate
  ombreSulPavimento() {
    const c = document.createElement("canvas");
    const k = 80; // punti per metro
    c.width = Math.round((X1 - X0) * k);
    c.height = Math.round((Z1 - Z0) * k);
    const g = c.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, c.width, c.height);
    g.filter = "blur(10px)";
    g.fillStyle = "rgba(0,0,0,0.5)";
    for (const [x0, z0, x1, z1] of this.ingombri) {
      g.fillRect((x0 - X0) * k - 4, (z0 - Z0) * k - 4, (x1 - x0) * k + 8, (z1 - z0) * k + 8);
    }
    g.filter = "blur(14px)";
    g.strokeStyle = "rgba(0,0,0,0.45)";
    g.lineWidth = 16;
    g.strokeRect(0, 0, c.width, c.height);
    const t = new THREE.CanvasTexture(c);
    t.channel = 1;
    const m = this.pavimento.material;
    m.aoMap = t;
    m.aoMapIntensity = 1;
    this.conAngoli(m, 0.75);
    m.needsUpdate = true;
  }

  // collega una mesh (o un gruppo) a un oggetto che si usa; i materiali si copiano per poterli illuminare da soli
  registra(id, obj) {
    obj.traverse((o) => {
      if (!o.isMesh) return;
      o.userData.oggetto = id;
      o.material = Array.isArray(o.material) ? o.material.map(copia) : copia(o.material);
      (this.pezzi[id] = this.pezzi[id] || []).push(o);
    });
  }

  // segna una mesh (o un gruppo) come pezzo della scrivania, da usare da seduti; i materiali li ha gia' copiati registra
  segna(id, obj) {
    obj.traverse((o) => {
      if (!o.isMesh) return;
      o.userData.pezzo = id;
      (this.pezzi["@" + id] = this.pezzi["@" + id] || []).push(o);
    });
  }

  // la porta della stanzetta dell'ospite: socchiusa per guardarci dentro, o chiusa ("subito": senza muoversi, per le
  // riprese della notte; "quanto": aperta di quanti radianti)
  socchiudi(aperta, subito = false, quanto = 0.75) {
    this.aperturaOspite = aperta ? -quanto : 0;
    if (subito && this.cardine) {
      this.cardine.rotation.y = this.aperturaOspite;
      this.renderer.shadowMap.needsUpdate = true;
    }
  }

  // ---------- la notte: l'ospite nella stanzetta e il nastro della notte (solo in plastilina) ----------

  // i pupazzi delle visite, prestati per la notte (gioco.js li veste e li mette in posa): si animano a scatti
  mettiPupazzo(pp) {
    this.pupazzi ??= [];
    if (!this.pupazzi.includes(pp)) this.pupazzi.push(pp);
    this.scena.add(pp.radice);
    this.renderer.shadowMap.needsUpdate = true;
  }

  togliPupazzi() {
    for (const pp of this.pupazzi || []) this.scena.remove(pp.radice);
    this.pupazzi = [];
    this.renderer.shadowMap.needsUpdate = true;
  }

  // l'altezza del materasso (del letto o della brandina): un raggio dall'alto sul modello
  piano(nome, x, z) {
    const m = this.modelli?.[nome];
    if (!m) return 0.5;
    const r = new THREE.Raycaster(new THREE.Vector3(x, 3, z), new THREE.Vector3(0, -1, 0));
    return r.intersectObject(m, true)[0]?.point.y ?? 0.5;
  }

  // il medico che dorme: non si vede mai, e' tutto sotto la coperta (la testa compresa). Una coperta di lana sul letto,
  // gonfia dove c'e' il corpo
  dormiente(si) {
    if (!this.coperta && si) {
      const b = new THREE.Box3().setFromObject(this.modelli?.letto || new THREE.Object3D());
      const largo = b.isEmpty() ? 1.0 : b.max.x - b.min.x, lungo = b.isEmpty() ? 2.0 : b.max.z - b.min.z;
      const cx = b.isEmpty() ? 1.98 : (b.min.x + b.max.x) / 2, z0 = b.isEmpty() ? -2.98 : b.min.z;
      const su = this.piano("letto", cx, z0 + lungo * 0.6);
      this.coperta = this.coperta3d(largo - 0.06, lungo - 0.16, 0x8a8178);
      this.coperta.position.set(cx, su + 0.01, z0 + 0.12);
      this.scena.add(this.coperta);
    }
    if (this.coperta) this.coperta.visible = !!si;
    this.renderer.shadowMap.needsUpdate = true;
  }

  // una coperta che copre un corpo sdraiato a pancia in su (la testa dalla parte di z0): un piano gonfio con le pieghe,
  // che ricade ai lati
  coperta3d(largo, lungo, colore, corpo = true) {
    const nx = 28, nz = 56;
    const g = new THREE.PlaneGeometry(largo, lungo, nx, nz);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, lungo / 2);
    const pos = g.attributes.position;
    const gauss = (d, s) => Math.exp(-(d * d) / (2 * s * s));
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      let h = 0;
      if (corpo) {
        const t = z / lungo;
        // la testa sotto la coperta, il busto, le gambe (due), i piedi in fondo
        h = Math.max(h, 0.2 * gauss(x, 0.12) * gauss(z - 0.2, 0.11));
        h = Math.max(h, 0.25 * gauss(x, 0.2) * C.liscio(0.1, 0.2, t) * (1 - C.liscio(0.5, 0.62, t)));
        for (const lx of [-0.1, 0.1]) h = Math.max(h, 0.15 * gauss(x - lx, 0.08) * C.liscio(0.45, 0.55, t) * (1 - C.liscio(0.9, 0.97, t)));
        h = Math.max(h, 0.19 * gauss(x, 0.16) * gauss(z - lungo * 0.92, 0.08));
      }
      // ai lati la coperta ricade oltre il materasso
      const bordo = C.liscio(largo / 2 - 0.12, largo / 2, Math.abs(x));
      h = h * (1 - bordo) - 0.12 * bordo + 0.025;
      h += C.rumore3(x * 9, z * 9, 3) * 0.007 + C.rumore3(x * 3, z * 2.5, 8) * 0.012;
      pos.setY(i, h);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, C.materiale({ color: colore, ruvido: 0.9, impronte: 1, side: THREE.DoubleSide }));
    m.castShadow = m.receiveShadow = true;
    return m;
  }

  // la luce della notte: tutte le luci spente; resta la lampada infrarossa della videocamera (invisibile, la si vede
  // solo nel verde della visione notturna), da "da" verso "a". null: la luce di prima
  notte(da, a, forza = 5) {
    if (!da) {
      if (this.ir) this.ir.visible = false;
      this.fase(this.faseOra || "mattina");
      return;
    }
    if (!this.ir) {
      this.ir = new THREE.SpotLight(0xffffff, forza, 0, 0.75, 0.9, 1.4);
      this.ir.castShadow = true;
      this.ir.shadow.mapSize.set(1024, 1024);
      this.ir.shadow.bias = -0.0004;
      this.ir.shadow.normalBias = 0.02;
      this.ir.shadow.camera.near = 0.1;
      this.ir.shadow.camera.far = 9;
      this.scena.add(this.ir, this.ir.target);
    }
    this.ir.visible = true;
    this.ir.intensity = forza;
    this.ir.position.set(...da);
    this.ir.target.position.set(...a);
    this.ir.target.updateMatrixWorld();
    if (this.hq) {
      // al buio: niente luce cotta, niente riflessi, solo la lampada infrarossa
      for (const m of this.hq.materiali) m.lightMapIntensity = 0;
      for (const m of this.hq.vista) m.emissiveIntensity = 0.02;
      this.matFessura.color.setHex(0x000000);
      this.scena.environment = null;
      this.renderer.toneMappingExposure = 1;
      return;
    }
    const L = this.L;
    L.lamp.intensity = 0;
    L.lamp.castShadow = false;
    L.alone.intensity = 0;
    L.cielo.intensity = 0.03;
    L.sole.intensity = 0;
    L.sole.visible = false;
    this.scena.environmentIntensity = 0.01;
    this.renderer.toneMappingExposure = 1;
    for (const o of this.pezzi.finestra || []) {
      o.material.map = this.T.finestra_chiusa;
      o.material.emissiveIntensity = 0;
      o.material.needsUpdate = true;
    }
    this.matFessura.color.setHex(0x000000);
    this.renderer.shadowMap.needsUpdate = true;
  }

  // la videocamera ferma in un punto (la maschera sulla scrivania, la porta della stanzetta): niente passi, niente mouse
  inquadra(da, a, fov) {
    this.attiva = false;
    this.seduto = null;
    this.camera.position.set(...da);
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(new THREE.Vector3(...a));
  }

  // il giornale piegato sulla scrivania (la stanza ad alta qualita'): la prima pagina del giornale "g" disegnata su una
  // tela (primapagina.js) al posto di quella di Blender, cosi' sulla scrivania c'e' sempre il giornale di oggi
  async giornale(g) {
    if (!this.giornaleNodo || !g) return;
    const chiave = `${g.data}|${g.titolo}`;
    if (this.giornaleDi === chiave) return;
    this.giornaleDi = chiave;
    const foto = new Image();
    foto.src = "img/foto_medico.jpg";
    await Promise.all([caratteri(), foto.decode().catch(() => null)]);
    if (this.giornaleDi !== chiave) return;
    const tela = document.createElement("canvas");
    primaPagina(tela, g, foto);
    const t = new THREE.CanvasTexture(tela);
    t.flipY = false;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    // solo il giornale piegato di Blender (il materiale "giornale"): quello di Meshy di prima ha altre coordinate
    this.giornaleNodo.traverse((o) => {
      if (o.isMesh) for (const m of [].concat(o.material)) if (m.name.startsWith("giornale")) { m.map = t; m.needsUpdate = true; }
    });
    this.giornaleTex?.dispose();
    this.giornaleTex = t;
  }

  // dove sta un oggetto (il centro dei suoi pezzi): per le prove
  centro(id) {
    const b = new THREE.Box3();
    for (const o of this.pezzi[id] || []) b.expandByObject(o);
    const c = b.getCenter(new THREE.Vector3());
    return [c.x, c.y, c.z];
  }

  // il display del videoregistratore: le 12:00 che lampeggiano, come in ogni casa negli anni '90
  disegnaDisplay() {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 58;
    this.ctxDisplay = c.getContext("2d");
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    this.texDisplay = t;
    this.aggiornaDisplay(true);
    return t;
  }

  // la finestrella del display: le 12:00 verdi che lampeggiano, su fondo nero
  aggiornaDisplay(acceso) {
    const g = this.ctxDisplay;
    g.fillStyle = "#070404";
    g.fillRect(0, 0, 256, 58);
    if (acceso) {
      g.fillStyle = "#64ffb0";
      g.font = "bold 40px monospace";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("12:00", 128, 31);
    }
    this.texDisplay.needsUpdate = true;
  }

  // la radiosveglia sul comodino segna l'ora del gioco
  disegnaSveglia() {
    const c = document.createElement("canvas");
    c.width = 128; c.height = 64;
    this.ctxSveglia = c.getContext("2d");
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    this.texSveglia = t;
    this.segnaOra("13:00");
    return t;
  }

  segnaOra(testo) {
    const g = this.ctxSveglia;
    if (!g) return;
    g.fillStyle = "#151313";
    g.fillRect(0, 0, 128, 64);
    g.fillStyle = "#050404";
    g.fillRect(12, 12, 104, 40);
    g.fillStyle = "#ff3a26";
    g.font = "bold 30px monospace";
    g.textAlign = "center";
    g.fillText(testo, 64, 43);
    this.texSveglia.needsUpdate = true;
  }

  // ---------- le luci ----------

  luci() {
    const S = this.scena;
    // la testa della lampada: il paralume, cioe' il centro dei punti piu' alti del modello; la lampadina appena sotto
    let testa = new THREE.Vector3(SCRIVANIA.x - 0.6, this.su + 0.4, SCRIVANIA.z - 0.22);
    const lm = this.modelli?.lampada;
    if (lm) testa = this.paralume(lm);
    const lampadina = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff1d6 }));
    lampadina.position.copy(testa).add(new THREE.Vector3(0, -0.03, 0));
    S.add(lampadina);
    const lamp = new THREE.SpotLight(0xffb46b, 2, 7, 1.0, 0.7, 2);
    lamp.position.copy(testa);
    lamp.target.position.set(SCRIVANIA.x + 0.1, this.su, SCRIVANIA.z + 0.1);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(2048, 2048);
    lamp.shadow.radius = 3;
    lamp.shadow.bias = -0.0005;
    lamp.shadow.normalBias = 0.02;
    lamp.shadow.camera.near = 0.05;
    lamp.shadow.camera.far = 7;
    S.add(lamp, lamp.target);
    // la luce che rimbalza dal paralume sul resto della stanza
    const alone = new THREE.PointLight(0xffa35a, 1.5, 12, 2);
    alone.position.copy(testa).add(new THREE.Vector3(0.15, 0.3, 0.5));
    S.add(alone);
    const cielo = new THREE.HemisphereLight(0xb9c4d2, 0x3a2a1e, 0.5);
    S.add(cielo);
    // il sole entra solo dalla finestra (i muri e il soffitto fanno ombra) e disegna i vetri sul pavimento
    const sole = new THREE.DirectionalLight(0xffe9c8, 2.5);
    sole.position.set(-0.2, 5.2, -7.2);
    sole.target.position.set(-0.6, 0, -0.6);
    sole.castShadow = true;
    sole.shadow.mapSize.set(2048, 2048);
    sole.shadow.radius = 4;
    sole.shadow.bias = -0.0004;
    sole.shadow.normalBias = 0.03;
    const sc = sole.shadow.camera;
    sc.left = -5.6; sc.right = 5.6; sc.top = 4.5; sc.bottom = -4.5; sc.near = 1; sc.far = 16;
    S.add(sole, sole.target);
    this.L = { lamp, alone, cielo, sole };
  }

  // il centro del quinto piu' alto dei punti di un modello, un po' piu' giu': dove sta la lampadina nel paralume
  paralume(obj) {
    const punti = [];
    obj.updateMatrixWorld(true);
    obj.traverse((o) => {
      if (!o.isMesh) return;
      const pos = o.geometry.attributes.position;
      const passo = Math.max(1, Math.floor(pos.count / 3000));
      for (let i = 0; i < pos.count; i += passo) punti.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld));
    });
    const ys = punti.map((p) => p.y).sort((a, b) => a - b);
    const soglia = ys[Math.floor(ys.length * 0.8)];
    const c = new THREE.Vector3();
    let n = 0;
    for (const p of punti) if (p.y >= soglia) { c.add(p); n++; }
    return c.divideScalar(Math.max(1, n)).add(new THREE.Vector3(0, -0.035, 0));
  }

  // la mattina la tapparella e' alzata e dai vetri entra il giorno; la sera e' abbassata e resta la lampada
  fase(f) {
    if (this.hq) return this.faseHQ(f);
    this.faseOra = f;
    const l = LUCI[f] || LUCI.mattina;
    this.L.lamp.castShadow = true;
    this.L.lamp.intensity = l.lampada;
    this.L.alone.intensity = l.alone;
    this.L.cielo.intensity = l.cielo;
    this.L.sole.intensity = l.sole;
    this.L.sole.visible = l.sole > 0;
    this.scena.environmentIntensity = l.ambiente;
    this.renderer.toneMappingExposure = l.esposizione;
    this.renderer.shadowMap.needsUpdate = true;
    for (const o of this.pezzi.finestra || []) {
      o.material.map = l.giorno ? this.T.finestra : this.T.finestra_chiusa;
      o.material.emissiveIntensity = l.giorno ? 1.25 : 0;
      o.material.needsUpdate = true;
    }
    this.matFessura.color.setHex(0xffb066).multiplyScalar(l.porta ? 1 : 0.12);
  }

  // ---------- entrare, uscire, camminare ----------

  entra(dove = "inizio") {
    const [x, z, yaw, pitch] = ARRIVI[dove] || ARRIVI.inizio;
    this.pos.set(x, z);
    this.vel.set(0, 0);
    this.yaw = yaw;
    this.pitch = pitch;
    this.percorso = [];
    this.meta = null;
    this.verso = null;
    this.tasti = {};
    this.attiva = true;
    this.seduto = null;
    this.camera.fov = VISTA;
    this.camera.updateProjectionMatrix();
    this.schermo.dataset.sopra = "";
  }

  // ci si siede alla scrivania: il puntatore si libera e la camera va a guardare il piano, da dov'era
  siedi() {
    this.rilascia();
    this.evidenzia(null);
    this.percorso = [];
    this.meta = null;
    this.verso = null;
    this.vel.set(0, 0);
    this.tasti = {};
    this.giu = null;
    this.attiva = true;
    this.seduto = { t: 0, pos: this.camera.position.clone(), rot: this.camera.quaternion.clone(), fov: this.camera.fov };
    this.schermo.dataset.sopra = "";
  }

  esci() {
    this.attiva = false;
    this.seduto = null;
    this.percorso = [];
    this.meta = null;
    this.verso = null;
    this.giu = null;
    this.rilascia();
    this.evidenzia(null);
  }

  // libera il puntatore (per esempio quando si apre un foglio sopra la stanza)
  rilascia() {
    if (document.pointerLockElement === this.schermo) document.exitPointerLock();
  }

  libero(x, z) {
    if (x < X0 + RAGGIO || x > X1 - RAGGIO || z < Z0 + RAGGIO || z > Z1 - RAGGIO) return false;
    for (const [a, b, c, d] of this.ingombri)
      if (x > a - RAGGIO && x < c + RAGGIO && z > b - RAGGIO && z < d + RAGGIO) return false;
    return true;
  }

  // si muove scivolando lungo i mobili e le pareti
  sposta(dx, dz) {
    const p = this.pos;
    if (this.libero(p.x + dx, p.y + dz)) { p.x += dx; p.y += dz; return true; }
    if (dx && this.libero(p.x + dx, p.y)) { p.x += dx; return true; }
    if (dz && this.libero(p.x, p.y + dz)) { p.y += dz; return true; }
    return false;
  }

  // il percorso sul pavimento: una griglia di 10 cm, A* e poi i tratti in linea retta
  strada(ax, az, bx, bz) {
    const C = 0.1;
    const nx = Math.round((X1 - X0) / C), nz = Math.round((Z1 - Z0) / C);
    const cella = (x, z) => [clamp(Math.floor((x - X0) / C), 0, nx - 1), clamp(Math.floor((z - Z0) / C), 0, nz - 1)];
    const centro = (i, j) => [X0 + (i + 0.5) * C, Z0 + (j + 0.5) * C];
    const ok = (i, j) => i >= 0 && j >= 0 && i < nx && j < nz && this.libero(...centro(i, j));
    let [si, sj] = cella(ax, az);
    let [ti, tj] = cella(bx, bz);
    // se la meta e' dentro un mobile, la cella libera piu' vicina
    if (!ok(ti, tj)) {
      let best = null, bd = Infinity;
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        if (!ok(i, j)) continue;
        const d = (i - ti) ** 2 + (j - tj) ** 2;
        if (d < bd) { bd = d; best = [i, j]; }
      }
      if (!best) return [];
      [ti, tj] = best;
      [bx, bz] = centro(ti, tj);
    }
    if (!ok(si, sj)) {
      const vicini = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]];
      const v = vicini.find(([di, dj]) => ok(si + di, sj + dj));
      if (!v) return [];
      si += v[0]; sj += v[1];
    }
    const key = (i, j) => j * nx + i;
    const g = new Map([[key(si, sj), 0]]);
    const da = new Map();
    const aperti = [[si, sj]];
    const h = (i, j) => Math.hypot(i - ti, j - tj);
    let trovato = false;
    while (aperti.length) {
      let k = 0;
      for (let n = 1; n < aperti.length; n++)
        if (g.get(key(...aperti[n])) + h(...aperti[n]) < g.get(key(...aperti[k])) + h(...aperti[k])) k = n;
      const [i, j] = aperti.splice(k, 1)[0];
      if (i === ti && j === tj) { trovato = true; break; }
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue;
        const ii = i + di, jj = j + dj;
        if (!ok(ii, jj) || (di && dj && (!ok(i + di, j) || !ok(i, j + dj)))) continue;
        const ng = g.get(key(i, j)) + Math.hypot(di, dj);
        if (ng < (g.get(key(ii, jj)) ?? Infinity)) {
          g.set(key(ii, jj), ng);
          da.set(key(ii, jj), [i, j]);
          if (!aperti.some(([a, b]) => a === ii && b === jj)) aperti.push([ii, jj]);
        }
      }
    }
    if (!trovato) return [];
    const celle = [[ti, tj]];
    while (celle[0][0] !== si || celle[0][1] !== sj) celle.unshift(da.get(key(...celle[0])));
    const punti = celle.map(([i, j]) => centro(i, j));
    punti[punti.length - 1] = [bx, bz];
    // toglie i punti intermedi quando si vede dritto
    const visto = (a, b) => {
      const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.04);
      for (let s = 1; s < n; s++) if (!this.libero(a[0] + (b[0] - a[0]) * s / n, a[1] + (b[1] - a[1]) * s / n)) return false;
      return true;
    };
    const liscio = [];
    let corrente = [ax, az];
    let i = 0;
    while (i < punti.length) {
      let j = punti.length - 1;
      while (j > i && !visto(corrente, punti[j])) j--;
      liscio.push(punti[j]);
      corrente = punti[j];
      i = j + 1;
    }
    return liscio;
  }

  // va verso un punto del pavimento, oppure verso un oggetto per usarlo
  vai(x, z, oggetto = null) {
    this.percorso = this.strada(this.pos.x, this.pos.y, x, z);
    this.meta = oggetto;
    this.verso = null;
    this.fermo = 0;
    if (!this.percorso.length && oggetto) this.arriva();
  }

  arriva() {
    const id = this.meta;
    this.meta = null;
    this.percorso = [];
    if (!id) return;
    const [gx, gy, gz] = OGGETTI[id].guarda;
    const dx = gx - this.pos.x, dz = gz - this.pos.y;
    const yaw = Math.atan2(-dx, -dz);
    const pitch = Math.atan2(gy - OCCHI, Math.hypot(dx, dz));
    this.verso = { yaw, pitch, t: 0, id };
  }

  passo(dt) {
    this.regola(dt);
    if (CRETA) {
      // la plastilina "bolle" a ogni posa, 12 volte al secondo, come nelle visite
      this.tempoPose = (this.tempoPose || 0) + dt;
      const n = Math.floor(this.tempoPose * 12);
      if (n !== this.ultimaPosa) {
        this.ultimaPosa = n;
        C.BOLLE.value = Math.random() * 50;
        // i pupazzi della notte cambiano posa con la plastilina (e le loro ombre con loro)
        for (const pp of this.pupazzi || []) pp.aggiorna(n / 12);
        if (this.pupazzi?.length) this.renderer.shadowMap.needsUpdate = true;
      }
    }
    if (this.attiva) {
      if (this.seduto) this.alTavolo(dt);
      else this.aggiorna(Math.min(dt, 0.1));
    }
    // il display del videoregistratore lampeggia ogni mezzo secondo
    this.tempo = (this.tempo || 0) + dt;
    const acceso = Math.floor(this.tempo * 2) % 2 === 0;
    if (acceso !== this.acceso) { this.acceso = acceso; this.aggiornaDisplay(acceso); }
    // la porta della stanzetta va piano verso la sua apertura (e intanto le ombre cambiano)
    if (this.cardine && Math.abs(this.aperturaOspite - this.cardine.rotation.y) > 0.0005) {
      this.cardine.rotation.y += (this.aperturaOspite - this.cardine.rotation.y) * Math.min(1, dt * 2.2);
      this.renderer.shadowMap.needsUpdate = true;
    }
    if (this.passoNebbia) {
      this.passoNebbia.uniforms.tempo.value = this.tempo;
      this.colore.uniforms.tempo.value = this.tempo;
    }
    if (this.composer) this.composer.render(dt);
    else this.renderer.render(this.scena, this.camera);
  }

  aggiorna(dt) {
    const k = this.tasti;
    const puoi = this.puoi();
    // WASD o le frecce: avanti, indietro e di lato (lo sguardo si gira col mouse); o la levetta del controller
    const lv = this.levetta;
    const avanti = puoi ? clamp((k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) - lv.y, -1, 1) : 0;
    const lato = puoi ? clamp((k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + lv.x, -1, 1) : 0;
    let cammina = false;
    // la velocita' cresce e cala in fretta ma non di colpo: il passo e' meno meccanico
    const voluta = new THREE.Vector2(0, 0);
    if (avanti || lato) {
      this.percorso = [];
      this.meta = null;
      this.verso = null;
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      // con la levetta poco piegata si va piano
      voluta.set(fx * avanti + rx * lato, fz * avanti + rz * lato).normalize()
        .multiplyScalar(PASSO * Math.min(1, Math.hypot(avanti, lato)));
    }
    this.vel.lerp(voluta, Math.min(1, dt * 10));
    if (this.vel.lengthSq() > 0.0004) {
      cammina = this.sposta(this.vel.x * dt, this.vel.y * dt);
      if (!cammina) this.vel.multiplyScalar(0.5);
    }
    if (!avanti && !lato && this.percorso.length) {
      const [tx, tz] = this.percorso[0];
      const dx = tx - this.pos.x, dz = tz - this.pos.y;
      const d = Math.hypot(dx, dz);
      const s = Math.min(d, PASSO * dt);
      let ok = false;
      if (d > 0.001) {
        // lo sguardo segue la strada (non col mouse bloccato: lo sguardo lo decide chi gioca)
        if (!this.bloccato) {
          const voluto = Math.atan2(-dx, -dz);
          this.yaw += angolo(voluto - this.yaw) * Math.min(1, dt * 5);
        }
        ok = this.sposta(dx / d * s, dz / d * s);
        cammina = cammina || ok;
        // strisciando contro un mobile si muove senza avvicinarsi: dopo un attimo cosi' la tappa si salta (e
        // all'ultima si usa la cosa da li')
        const dopo = Math.hypot(tx - this.pos.x, tz - this.pos.y);
        this.fermo = dopo < d - s * 0.3 ? 0 : (this.fermo || 0) + dt;
        if (this.fermo > 0.4) ok = false;
      }
      if (d < 0.03 || !ok) {
        this.fermo = 0;
        this.percorso.shift();
        if (!this.percorso.length) this.arriva();
      }
    } else if (!avanti && !lato && this.verso) {
      // arrivato: si gira verso l'oggetto, poi lo usa. Se intanto chi gioca muove lo sguardo (il mouse, la levetta),
      // non si gira piu' ma la cosa si usa subito: prima il gesto si annullava, e bisognava cliccare di nuovo
      const v = this.verso;
      v.t += dt;
      if (!v.fermo) {
        const f = Math.min(1, dt * 7);
        this.yaw += angolo(v.yaw - this.yaw) * f;
        this.pitch += (v.pitch - this.pitch) * f;
      }
      if (v.t > 0.4 || v.fermo) {
        this.verso = null;
        this.onUsa(v.id);
      }
    }
    if (cammina) {
      // un passo sulle assi a ogni dondolio della testa (onPasso: il suono lo fa il gioco)
      const prima = Math.floor(this.passi / (2 * Math.PI));
      this.passi += dt * 9.5;
      if (Math.floor(this.passi / (2 * Math.PI)) > prima) this.onPasso();
    }
    const dondola = cammina ? Math.sin(this.passi) * 0.014 : 0;
    this.camera.position.set(this.pos.x, OCCHI + dondola, this.pos.y);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
    // col mouse bloccato (o col controller), si illumina quello che c'e' nel mirino
    this.mira = (this.mira || 0) + dt;
    if ((this.bloccato || this.conLeva) && this.mira > 0.08) {
      this.mira = 0;
      const c = this.colpisci(0.5, 0.5);
      this.evidenzia(c && c.oggetto && this.puoi() ? c.oggetto : null);
    }
  }

  // seduti: la camera va da dov'era alla vista sul piano, poi la testa segue appena il puntatore
  alTavolo(dt) {
    const s = this.seduto;
    s.t = Math.min(1, s.t + dt / 0.75);
    const k = s.t * s.t * (3 - 2 * s.t);
    const [px, py] = this.puntatore;
    const pos = new THREE.Vector3(SEDUTO.pos[0] + (px - 0.5) * 0.05, SEDUTO.pos[1] - (py - 0.5) * 0.03, SEDUTO.pos[2]);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(pos, new THREE.Vector3(...SEDUTO.guarda), ALTO));
    this.camera.position.lerpVectors(s.pos, pos, k);
    this.camera.quaternion.slerpQuaternions(s.rot, q, k);
    this.camera.fov = s.fov + (SEDUTO.fov - s.fov) * k;
    this.camera.updateProjectionMatrix();
  }

  // ---------- puntatore, tocchi, tastiera ----------

  // cosa c'e' sotto un punto dello schermo (frazioni da 0 a 1)
  colpisci(fx, fy) {
    this.raggio.setFromCamera(new THREE.Vector2(fx * 2 - 1, 1 - fy * 2), this.camera);
    const hit = this.raggio.intersectObjects(this.scena.children, true)[0];
    if (!hit) return null;
    const u = hit.object.userData;
    return { punto: hit.point, oggetto: u.oggetto || null, pezzo: u.pezzo || null, pavimento: !!u.pavimento, d: hit.distance };
  }

  // da seduti: quale pezzo della scrivania c'e' sotto un punto dello schermo (il raggio prova solo quelli)
  colpisciPezzo(fx, fy) {
    this.tuttiPezzi = this.tuttiPezzi || Object.keys(this.pezzi).filter((k) => k[0] === "@").flatMap((k) => this.pezzi[k]);
    this.raggio.setFromCamera(new THREE.Vector2(fx * 2 - 1, 1 - fy * 2), this.camera);
    const hit = this.raggio.intersectObjects(this.tuttiPezzi, false)[0];
    return hit ? hit.object.userData.pezzo : null;
  }

  // dove cade sullo schermo un punto della stanza (frazioni da 0 a 1)
  proietta(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return [(v.x + 1) / 2, (1 - v.y) / 2];
  }

  evidenzia(id) {
    if (id === this.sopra) return;
    for (const o of this.pezzi[this.sopra] || []) for (const m of [].concat(o.material)) if (!m.emissiveMap) m.emissive.setHex(0);
    this.sopra = id;
    for (const o of this.pezzi[id] || []) for (const m of [].concat(o.material)) if (!m.emissiveMap) m.emissive.setHex(0x221a08);
    this.schermo.dataset.sopra = id ? "1" : "";
    this.onSopra(!id ? null : id[0] === "@" ? this.nomiPezzi[id.slice(1)] || null : OGGETTI[id].nome);
  }

  // il controller: la levetta sinistra cammina (come WASD, ma piu' piano se e' poco piegata), la destra gira lo
  // sguardo
  leve(lx, ly, rx, ry, dt) {
    this.levetta.set(lx, ly);
    if (rx || ry) {
      this.yaw -= rx * 2.6 * dt;
      this.pitch = clamp(this.pitch - ry * 1.9 * dt, -1.2, 1.2);
      if (this.verso) this.verso.fermo = true;
    }
  }

  // il controller: A usa quello che c'e' nel mirino (ci si va, se e' lontano)
  usaMirino() {
    const c = this.colpisci(0.5, 0.5);
    if (c && c.oggetto && this.puoi()) this.usa(c);
  }

  usa(c) {
    if (!c) return;
    if (c.oggetto) {
      const [x, z] = OGGETTI[c.oggetto].sosta;
      this.vai(x, z, c.oggetto);
    } else {
      // sul pavimento ci va; su un muro o un mobile si ferma un po' prima
      const p = c.punto;
      let x = p.x, z = p.z;
      if (!c.pavimento) {
        const dx = x - this.pos.x, dz = z - this.pos.y;
        const d = Math.hypot(dx, dz) || 1;
        x -= dx / d * 0.45;
        z -= dz / d * 0.45;
      }
      this.vai(x, z);
    }
  }

  ascolta() {
    const fuori = (e) => e.target.closest?.("button, #hud, #comparsa, #comandi, #foglio, .chiave, #ruota");
    const frazioni = (e) => {
      const r = this.schermo.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, r.width];
    };
    // il puntatore bloccato: il mouse gira lo sguardo; Esc (il browser) lo libera
    document.addEventListener("pointerlockchange", () => {
      const b = document.pointerLockElement === this.schermo;
      if (b === this.bloccato) return;
      this.bloccato = b;
      this.schermo.classList.toggle("bloccato", b);
      if (!b) this.evidenzia(null);
      this.onBlocco(b);
    });
    document.addEventListener("pointerlockerror", () => { this.senzaBlocco = true; });
    const blocca = () => {
      try {
        const p = this.schermo.requestPointerLock();
        if (p && p.catch) p.catch(() => { this.senzaBlocco = true; });
      } catch {
        this.senzaBlocco = true;
      }
    };
    this.schermo.addEventListener("pointerdown", (e) => {
      if (!this.attiva || fuori(e) || this.giu || (e.pointerType === "mouse" && e.button !== 0)) return;
      if (this.seduto) {
        // seduti: un clic (o un tocco) usa il pezzo che c'e' sotto
        const [fx, fy] = frazioni(e);
        this.giu = { id: e.pointerId, x: e.clientX, y: e.clientY, fx, fy, mosso: false, tipo: e.pointerType };
        return;
      }
      if (this.bloccato) {
        // col mouse bloccato, il clic usa quello che c'e' nel mirino
        const c = this.colpisci(0.5, 0.5);
        if (c && c.oggetto && this.puoi()) this.usa(c);
        return;
      }
      if (e.pointerType === "mouse" && !this.senzaBlocco && this.puoi()) {
        // il primo clic blocca il puntatore; se era su una cosa, la usa anche
        const [fx, fy] = frazioni(e);
        const c = this.colpisci(fx, fy);
        blocca();
        if (c && c.oggetto) this.usa(c);
        return;
      }
      const [fx, fy] = frazioni(e);
      this.giu = { id: e.pointerId, x: e.clientX, y: e.clientY, fx, fy, mosso: false, tipo: e.pointerType };
      try { this.schermo.setPointerCapture(e.pointerId); } catch { /* il puntatore e' gia' sparito */ }
    });
    this.schermo.addEventListener("pointermove", (e) => {
      if (!this.attiva) return;
      if (this.seduto) {
        const [fx, fy] = frazioni(e);
        this.puntatore = [fx, fy];
        const g = this.giu;
        if (g && g.id === e.pointerId && Math.hypot(e.clientX - g.x, e.clientY - g.y) > 12) g.mosso = true;
        if (e.pointerType === "touch" || fuori(e)) return;
        const ora = performance.now();
        if (ora - this.ultimoSopra < 40) return;
        this.ultimoSopra = ora;
        const pezzo = this.colpisciPezzo(fx, fy);
        this.evidenzia(pezzo && this.puoi() ? "@" + pezzo : null);
        return;
      }
      if (this.bloccato) {
        this.yaw -= e.movementX * MOUSE;
        this.pitch = clamp(this.pitch - e.movementY * MOUSE, -1.2, 1.2);
        if (this.verso) this.verso.fermo = true;
        return;
      }
      const g = this.giu;
      if (g && g.id === e.pointerId) {
        const dx = e.clientX - g.x, dy = e.clientY - g.y;
        if (!g.mosso && Math.hypot(dx, dy) > 7) { g.mosso = true; this.schermo.classList.add("guarda"); }
        if (g.mosso) {
          // trascinare di uno schermo gira lo sguardo di un campo visivo
          const [, , largo] = frazioni(e);
          const k = 1.6 / largo;
          this.yaw -= dx * k;
          this.pitch = clamp(this.pitch - dy * k, -1.1, 0.9);
          if (this.verso) this.verso.fermo = true;
          g.x = e.clientX;
          g.y = e.clientY;
        }
        return;
      }
      if (e.pointerType === "touch" || fuori(e)) return;
      const ora = performance.now();
      if (ora - this.ultimoSopra < 40) return;
      this.ultimoSopra = ora;
      const [fx, fy] = frazioni(e);
      const c = this.colpisci(fx, fy);
      this.evidenzia(c && c.oggetto && this.puoi() ? c.oggetto : null);
    });
    const su = (e) => {
      const g = this.giu;
      if (!g || g.id !== e.pointerId) return;
      this.giu = null;
      this.schermo.classList.remove("guarda");
      if (e.type === "pointercancel" || g.mosso || !this.attiva || !this.puoi()) return;
      if (this.seduto) {
        const pezzo = this.colpisciPezzo(g.fx, g.fy);
        this.evidenzia(null);
        // dopo il clic: se no il clic stesso arriva alla schermata che si apre (la mappa si ingrandiva)
        if (pezzo) setTimeout(() => this.onScrivania(pezzo), 0);
        return;
      }
      this.usa(this.colpisci(g.fx, g.fy));
    };
    this.schermo.addEventListener("pointerup", su);
    this.schermo.addEventListener("pointercancel", su);
    this.schermo.addEventListener("pointerleave", () => { if (this.attiva && !this.giu && !this.bloccato) this.evidenzia(null); });
    const tasti = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    window.addEventListener("keydown", (e) => {
      if (!this.attiva || this.seduto || e.target.closest?.("input, textarea, #foglio")) return;
      if (tasti.includes(e.code)) {
        this.tasti[e.code] = true;
        e.preventDefault();
      } else if (e.code === "KeyN" && this.passoNebbia) {
        // le proposte lovecraftiane, una dopo l'altra, e poi la stanza com'era
        this.nebbia((this.nebbiaN + 1) % (Object.keys(NEBBIE).length + 1));
        this.onNebbia?.(NEBBIE[this.nebbiaN]?.nome || "La stanza com'era");
      } else if ((e.code === "KeyE" || e.code === "Enter") && this.puoi() && !e.target.closest?.("button")) {
        // usa quello che c'e' al centro dello sguardo, se e' a portata
        const c = this.colpisci(0.5, 0.5);
        if (c && c.oggetto && c.d < 3.5) { e.preventDefault(); this.usa(c); }
      }
    });
    window.addEventListener("keyup", (e) => { delete this.tasti[e.code]; });
    window.addEventListener("blur", () => { this.tasti = {}; });
  }
}
