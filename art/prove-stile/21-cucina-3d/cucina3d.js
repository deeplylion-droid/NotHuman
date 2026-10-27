// La prova 3D della cucina della casa 3, nello stile scelto il 27 ottobre: la plastilina. Stanza, mobili e pupazzi
// modellati, con le impronte delle dita; la cucina e' buia, la illumina la lampada della videocamera del medico; il
// mondo si muove a scatti (12 pose al secondo) e "bolle" a ogni posa, come uno stop-motion. Niente VHS: la videocamera
// registra, ha la lampada, lo zoom e l'infrarosso, ma l'immagine e' pulita.
// La videocamera e' ferma sulla porta: la testa segue un poco il puntatore e la lampada con lei; "Esamina il collo"
// stringe lo zoom sul bubbone del padre, "Guarda la figlia" sulla sua faccia; "Infrarosso" mostra il calore.
// Due giorni sugli stessi pupazzi: il secondo il padre e' piu' malato (la faccia cerea, le dita nere, il bubbone
// aperto, il respiro a fatica e la tosse) e si regge al mobile; la figlia piange. Le facce di ricambio sono texture
// ridipinte da tools/facce.mjs.
// Pupazzi e mobili sono di Meshy (da immagine a 3D: i disegni sono in personaggi/ e mobili/); le texture di muri e
// pavimenti sono generate (texture/, rese ripetibili da tools/texture_creta.py); il resto e' costruito qui.
import * as THREE from "./lib/three.js";

const $ = (s) => document.querySelector(s);
const palco = $("#palco"), schermo = $("#schermo"), frase = $("#frase"), attesa = $("#attesa");

// ---------- le misure, in metri: x verso destra, y in alto, z verso chi guarda (la porta della cucina e' a z = 0) ----
const L = 3.4, P = 4.4, A = 2.7;
const VANO = { x0: -0.35, x1: 0.5, h: 2.08 };                  // la porta del corridoio, nel muro di fondo
const CORR = { x0: -0.62, x1: 0.78, p: 3.2, h: 2.45 };          // il corridoio buio, dietro
const OCCHIO = new THREE.Vector3(0.14, 1.66, 0.32);            // la maschera del medico, sulla porta
const MIRA = new THREE.Vector3(-0.06, 1.2, -3.2);
const FARO_MIRA = new THREE.Vector3(-0.5, 1.25, -2.3);          // dove punta la lampada della videocamera
const FOV = 54;
const ZOOM = { padre: 13, figlia: 9 };                          // quanto stringe lo zoom su ognuno (gradi)
const PIANO_LAVORO = 0.9;

// i mobili di Meshy alle misure della cucina: larghezza, altezza e profondita' del mobile, e di quanto e' girato (i
// modelli guardano verso +z). La base col lavello e' piu' alta del piano di lavoro per il rubinetto (il piano e' all'81%)
const MOBILI = [
  { nome: "frigo", x: -L / 2 + 0.32, z: -0.52, dim: [0.64, 1.72, 0.62], gira: Math.PI / 2, calore: 0.2 },
  { nome: "base", x: -L / 2 + 0.3, z: -2.0, dim: [2.1, PIANO_LAVORO / 0.81, 0.6], gira: Math.PI / 2 },
  { nome: "pensili", x: -L / 2 + 0.18, y: 1.5, z: -2.0, dim: [2.1, 0.7, 0.36], gira: Math.PI / 2 },
  { nome: "tavolo", x: 0.95, z: -2.35, dim: [1.3, 0.78, 1.0], gira: Math.PI / 2 },
  { nome: "sedia", x: 0.95, z: -3.32, dim: [0.55, 0.82, 0.53], gira: 0.12 },
  { nome: "sedia", x: 1.02, z: -1.38, dim: [0.55, 0.82, 0.53], gira: Math.PI + 0.3 },
  { nome: "mobiletto_tv", x: 1.3, z: -P + 0.25, dim: [0.72, 1.0, 0.47], gira: 0, calore: 0.34 },
  // il neon sul soffitto, a destra (il tubo verso il muro di destra)
  { nome: "neon", x: 1.02, y: A - 0.172, z: -1.75, dim: [1.24, 0.172, 0.15], gira: Math.PI / 2, calore: 0.62 },
];
// le porte: dove sta il cardine, di quanto e' aperta, quanto e' larga (la porta del corridoio, aperta verso la cucina;
// quella chiusa in fondo al corridoio)
const PORTE = [
  { cardine: [VANO.x0 + 0.01, -P + 0.03], apre: -1.3, larga: VANO.x1 - VANO.x0 - 0.02 },
  { cardine: [(CORR.x0 + CORR.x1) / 2 - 0.29, -P - CORR.p + 0.06], apre: 0, larga: 0.78 },
];
// le superfici della stanza: la texture generata e quanti metri copre
const SUPERFICI = { muro: 1.6, pavimento: 1.2, soffitto: 1.6, corridoio: 1.4, piastrelle: 1.2 };

// i due giorni: dove stanno il padre e la figlia, quanto scottano all'infrarosso, cosa dice il padre (le frasi del
// gioco, gioco/js/giorno2.js) e con che faccia
const GIORNI = {
  1: {
    padre: { x: -0.66, z: -1.4, calore: 0.86 },
    figlia: { x: 0.08, z: -4.82, calore: 0.55 },
    arrivo: ["Dottore.", "Qui stiamo tutti bene. Faccia in fretta."],
    esame: ["È una botta."],
  },
  2: {
    // si regge al mobile con la mano destra, come nella scena del secondo giorno
    padre: { x: -0.86, z: -1.55, calore: 0.95, faccia: "padre_creta_grave" },
    // stanotte la madre e' morta: la figlia e' sulla porta del corridoio, piange e ha la febbre
    figlia: { x: 0.08, z: -4.6, calore: 0.78, faccia: "figlia_creta_piange" },
    arrivo: ["Ancora voi.", "Fate quello che dovete. Non ho più la forza di mandarvi via."],
    esame: ["Lo so cos'è. Non serve che me lo dite."],
  },
};

// ---------- numeri a caso, sempre gli stessi ----------
function caso(seme) {
  let s = seme >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function hash3(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
// rumore lento in 3D, tra -1 e 1
function rumore3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const f = (t) => t * t * (3 - 2 * t);
  const u = f(x - xi), v = f(y - yi), w = f(z - zi);
  let r = 0;
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++)
    r += hash3(xi + a, yi + b, zi + c) * (a ? u : 1 - u) * (b ? v : 1 - v) * (c ? w : 1 - w);
  return r * 2 - 1;
}

// ---------- le texture dipinte qui (le piccole cose) ----------
function tela(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

// macchie morbide, ripetute ai bordi perche' la texture si ripeta senza tagli
function macchie(g, w, h, n, colori, r, rnd, alfa = 1) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h, col = colori[Math.floor(rnd() * colori.length)];
    for (const [ox, oy] of [[0, 0], [-w, 0], [0, -h], [-w, -h]]) {
      const s = r * (0.5 + rnd() * 0.8);
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, s);
      gr.addColorStop(0, col);
      gr.addColorStop(1, col + "00");
      g.globalAlpha = alfa;
      g.fillStyle = gr;
      g.fillRect(x + ox - s, y + oy - s, 2 * s, 2 * s);
      g.globalAlpha = 1;
    }
  }
}

function fondo(g, w, h, col) {
  g.fillStyle = col;
  g.fillRect(0, 0, w, h);
}

const PITTURE = {
  // il piatto bianco col bordo blu (sul tondo del cilindro)
  piatto() {
    const n = 256, k = n / 32;
    const [c, g] = tela(n, n);
    fondo(g, n, n, "#f2f1ec");
    g.strokeStyle = "#3b5ea6";
    g.lineWidth = 1.6 * k;
    g.beginPath(); g.arc(n / 2, n / 2, 13.3 * k, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "#d9d8d0";
    g.lineWidth = 1 * k;
    g.beginPath(); g.arc(n / 2, n / 2, 8.5 * k, 0, Math.PI * 2); g.stroke();
    return c;
  },
  // il muro della stanza attorno agli stipiti: lo stesso intonaco, piu' chiaro dove c'e' la vernice
  stipite() {
    const n = 128, rnd = caso(3);
    const [c, g] = tela(n, n);
    fondo(g, n, n, "#d9cfb8");
    macchie(g, n, n, 24, ["#cfc3a8", "#e4dbc6", "#bfb397"], 16, rnd, 0.6);
    return c;
  },
};

// le impronte delle dita sulla plastilina, per le cose fatte qui: una mappa delle altezze (anelli d'impronta,
// strisciate di pollice, bozzi larghi) trasformata in mappa delle normali
function impronte() {
  const n = 512, rnd = caso(7);
  const [c, g] = tela(n, n);
  fondo(g, n, n, "#808080");
  macchie(g, n, n, 70, ["#a0a0a0", "#606060"], 55, rnd, 0.5);
  for (let i = 0; i < 40; i++) {
    const x = rnd() * n, y = rnd() * n, rx = 10 + rnd() * 16, ry = rx * (0.55 + rnd() * 0.3);
    g.save();
    g.translate(x, y);
    g.rotate(rnd() * Math.PI);
    for (let k = 1; k < 10; k++) {
      g.beginPath();
      g.ellipse(0, 0, (rx * k) / 10, (ry * k) / 10, 0, rnd() * 1.4, Math.PI * 2 - rnd() * 1.1);
      g.strokeStyle = "rgba(255,255,255,0.16)";
      g.lineWidth = 1.1;
      g.stroke();
    }
    g.restore();
  }
  for (let i = 0; i < 26; i++) {
    const x = rnd() * n, y = rnd() * n, l = 30 + rnd() * 60, a = rnd() * Math.PI;
    const gr = g.createLinearGradient(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
    gr.addColorStop(0, "rgba(0,0,0,0)");
    gr.addColorStop(0.5, "rgba(0,0,0,0.22)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.strokeStyle = gr;
    g.lineWidth = 8 + rnd() * 10;
    g.lineCap = "round";
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const alt = g.getImageData(0, 0, n, n).data;
  const out = g.createImageData(n, n);
  const H = (x, y) => alt[(((y + n) % n) * n + ((x + n) % n)) * 4] / 255;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * 2.2, dy = (H(x, y + 1) - H(x, y - 1)) * 2.2;
      const l = Math.hypot(dx, dy, 1), o = (y * n + x) * 4;
      out.data[o] = (-dx / l * 0.5 + 0.5) * 255;
      out.data[o + 1] = (dy / l * 0.5 + 0.5) * 255;
      out.data[o + 2] = (1 / l * 0.5 + 0.5) * 255;
      out.data[o + 3] = 255;
    }
  }
  g.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

// ---------- i materiali: la plastilina ----------
// il seme del "bollire", nuovo a ogni posa, e quanto bolle (meno nello zoom)
const BOLLE = { value: 0 }, FORZA_BOLLE = { value: 1 };
let IMPRONTE = null;
const RUMORE_GLSL = `
uniform float uBolle, uForzaBolle;
float hb(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float nb(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hb(i), hb(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hb(i + vec3(0.0, 1.0, 0.0)), hb(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(hb(i + vec3(0.0, 0.0, 1.0)), hb(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hb(i + vec3(0.0, 1.0, 1.0)), hb(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}`;

function materiale(o = {}) {
  const m = new THREE.MeshPhysicalMaterial({ map: o.map || null, color: o.color ?? 0xffffff, emissive: o.emissive ?? 0x000000,
    roughness: o.ruvido ?? 0.62, metalness: 0, sheen: 0.4, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xfff2e0),
    normalMap: o.normalMap === undefined ? IMPRONTE : o.normalMap, side: o.side ?? THREE.FrontSide, envMapIntensity: 0.15,
    vertexColors: !!o.vertexColors, dithering: true });
  m.normalScale.setScalar(o.impronte ?? 0.9);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uBolle = BOLLE;
    sh.uniforms.uForzaBolle = FORZA_BOLLE;
    // le bolle: ogni punto si sposta un poco nella direzione che dice il rumore nel punto dove sta, non lungo la
    // normale. I vertici doppi delle cuciture (stesso punto, normali diverse) si muovono insieme e il modello non si
    // apre: prima, nello zoom, si vedevano le fessure nere tra i pezzi
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + RUMORE_GLSL)
      .replace("#include <project_vertex>", `#include <project_vertex>
  vec3 bolleP = (modelMatrix * vec4(transformed, 1.0)).xyz * 11.0 + uBolle;
  vec3 spinta = vec3(nb(bolleP), nb(bolleP + 17.3), nb(bolleP + 31.7)) - 0.5;
  mvPosition.xyz += mat3(viewMatrix) * spinta * (0.003 * uForzaBolle);
  gl_Position = projectionMatrix * mvPosition;`);
  };
  return m;
}

function texture(nome, ripeti = [1, 1]) {
  const t = new THREE.CanvasTexture(PITTURE[nome]());
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(ripeti[0], ripeti[1]);
  t.anisotropy = 8;
  return t;
}

// le superfici generate: il colore e le normali, ripetute ogni tot metri (le coordinate dei muri sono in metri)
const caricatore = new THREE.TextureLoader();
async function superficie(nome) {
  const [map, normalMap] = await Promise.all([caricatore.loadAsync(`texture/${nome}.webp`), caricatore.loadAsync(`texture/${nome}_n.webp`)]);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [map, normalMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.setScalar(1 / SUPERFICI[nome]);
    t.anisotropy = 8;
  }
  return { map, normalMap };
}

// ---------- la geometria ----------
// una scatola con gli spigoli tondi (la normale va dal centro dell'angolo) e qualche bozzo, come modellata a mano
function scatola(w, h, d, r = 0.025, bozzi = 0.0035, seme = 0) {
  const seg = (s) => Math.max(3, Math.min(16, Math.round(s * 16)));
  const geo = new THREE.BoxGeometry(w, h, d, seg(w), seg(h), seg(d));
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const v = new THREE.Vector3(), q = new THREE.Vector3(), n = new THREE.Vector3();
  r = Math.min(r, w / 2.2, h / 2.2, d / 2.2);
  const mx = w / 2 - r, my = h / 2 - r, mz = d / 2 - r;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    q.set(THREE.MathUtils.clamp(v.x, -mx, mx), THREE.MathUtils.clamp(v.y, -my, my), THREE.MathUtils.clamp(v.z, -mz, mz));
    n.subVectors(v, q);
    if (n.lengthSq() < 1e-12) n.fromBufferAttribute(nor, i);
    n.normalize();
    v.copy(q).addScaledVector(n, r);
    v.addScaledVector(n, rumore3(v.x * 3.3 + seme, v.y * 3.3, v.z * 3.3) * bozzi);
    pos.setXYZ(i, v.x, v.y, v.z);
    nor.setXYZ(i, n.x, n.y, n.z);
  }
  return geo;
}

// un piano (muro, pavimento) un po' ondulato, con le coordinate della texture in metri
function piano(w, h, seme = 0) {
  w += 0.04;
  h += 0.04;
  const geo = new THREE.PlaneGeometry(w, h, Math.max(4, Math.round(w * 10)), Math.max(4, Math.round(h * 10)));
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, rumore3(pos.getX(i) * 1.7 + seme, pos.getY(i) * 1.7, seme) * 0.008);
    uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h);
  }
  geo.computeVertexNormals();
  return geo;
}

// un muro con il vano di una porta che arriva a terra: un poligono solo, senza fessure tra i pezzi (le coordinate
// della texture sono gia' in metri)
function muroVano(w, h, x0, x1, hv) {
  const f = new THREE.Shape();
  f.moveTo(-w / 2, 0);
  for (const [x, y] of [[x0, 0], [x0, hv], [x1, hv], [x1, 0], [w / 2, 0], [w / 2, h], [-w / 2, h]]) f.lineTo(x, y);
  f.closePath();
  return new THREE.ShapeGeometry(f);
}

// ---------- la cucina ----------
// le luci, da aggiornare a ogni giro (il tubo e' il materiale del neon, che si accende e si spegne con la luce)
let faro = null, neon = null, tubo = null;
const SCARTO_FARO = new THREE.Vector3(0.05, 0.08, 0);

// la stanza vuota (muri, pavimento, soffitto, corridoio, stipiti, la porta aperta, il neon) e le luci
async function stanza() {
  const g = new THREE.Group();
  const mesh = (geo, mat, x, y, z, ry = 0, calore = 0.05) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.userData.calore = calore;
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  const S = Object.fromEntries(await Promise.all(Object.keys(SUPERFICI).map(async (n) => [n, await superficie(n)])));
  const mat = (nome, impronte = 1) => materiale({ ...S[nome], impronte });

  // pavimento e soffitto
  const pav = mesh(piano(L, P, 1), mat("pavimento"), 0, 0, -P / 2);
  pav.rotation.x = -Math.PI / 2;
  const sof = mesh(piano(L, P, 2), mat("soffitto", 0.8), 0, A, -P / 2);
  sof.rotation.x = Math.PI / 2;
  // i muri: sinistra, destra, il fondo col vano della porta, e quello della porta da cui si entra
  const muro = mat("muro");
  mesh(piano(P, A, 3), muro, -L / 2, A / 2, -P / 2, Math.PI / 2);
  mesh(piano(P, A, 4), muro, L / 2, A / 2, -P / 2, -Math.PI / 2);
  mesh(muroVano(L, A, VANO.x0, VANO.x1, VANO.h), muro, 0, 0, -P);
  mesh(muroVano(L, A, -0.7, 0.42, 2.06), muro, 0, 0, 0, Math.PI);
  // gli stipiti delle due porte
  const stipiteM = materiale({ map: texture("stipite"), impronte: 0.7 });
  for (const [x, z] of [[VANO.x0 - 0.035, -P + 0.02], [VANO.x1 + 0.035, -P + 0.02]]) mesh(scatola(0.07, VANO.h + 0.05, 0.06), stipiteM, x, (VANO.h + 0.05) / 2, z);
  mesh(scatola(VANO.x1 - VANO.x0 + 0.14, 0.07, 0.06), stipiteM, (VANO.x0 + VANO.x1) / 2, VANO.h + 0.035, -P + 0.02);
  for (const x of [-0.46, 0.74]) mesh(scatola(0.08, 2.08, 0.07), stipiteM, x, 1.04, -0.03);

  // il corridoio buio dietro la porta, con la porta chiusa in fondo
  const cw = CORR.x1 - CORR.x0, cx = (CORR.x0 + CORR.x1) / 2, cz = -P - CORR.p / 2;
  const corrM = mat("corridoio");
  const cp = mesh(piano(cw, CORR.p, 11), mat("piastrelle"), cx, 0, cz);
  cp.rotation.x = -Math.PI / 2;
  const cs = mesh(piano(cw, CORR.p, 12), corrM, cx, CORR.h, cz);
  cs.rotation.x = Math.PI / 2;
  mesh(piano(CORR.p, CORR.h, 13), corrM, CORR.x0, CORR.h / 2, cz, Math.PI / 2);
  mesh(piano(CORR.p, CORR.h, 14), corrM, CORR.x1, CORR.h / 2, cz, -Math.PI / 2);
  mesh(piano(cw, CORR.h, 15), corrM, cx, CORR.h / 2, -P - CORR.p);
  // l'architrave tra cucina e corridoio, sopra il vano (lo spessore del muro)
  mesh(scatola(VANO.x1 - VANO.x0, A - VANO.h, 0.2), muro, (VANO.x0 + VANO.x1) / 2, (A + VANO.h) / 2, -P - 0.1);
  // l'interruttore accanto alla porta
  mesh(scatola(0.08, 0.08, 0.02, 0.01, 0), materiale({ color: 0xf0ede4, impronte: 0.5 }), 0.66, 1.12, -P + 0.01);

  // nel corridoio, una lampadina nuda
  mesh(new THREE.SphereGeometry(0.04, 16, 12), materiale({ color: 0xffffff, emissive: 0xffd9a0, impronte: 0.2 }),
    cx, CORR.h - 0.18, -P - 1.6, 0, 0.7);

  // le luci. Buio: le tapparelle sono giu' e il neon e' quasi morto (ogni tanto sfarfalla); la luce vera e' la lampada
  // della videocamera, dalla porta, che fa le ombre dietro le persone. Le ombre hanno vicino e lontano stretti attorno
  // alla stanza: con quelli di serie (fino a 500 metri) la profondita' e' grossolana e le ombre si staccano o sbavano
  g.add(new THREE.HemisphereLight(0xc9d4e0, 0x1a1712, 0.05));
  neon = new THREE.SpotLight(0xcfe8d8, 3, 0, 1.1, 0.9, 1.6);
  neon.position.set(1.0, A - 0.12, -1.8);
  neon.target.position.set(0.1, 0, -2.2);
  ombre(neon, 2048, 0.1, 6, 3);
  neon.userData.forza = 3;
  g.add(neon, neon.target);
  faro = new THREE.SpotLight(0xffe6c4, 9.5, 0, 0.49, 0.75, 1.3);
  faro.position.copy(OCCHIO).add(SCARTO_FARO);
  faro.target.position.copy(FARO_MIRA);
  ombre(faro, 2048, 0.25, 10, 2);
  faro.userData.forza = 9.5;
  g.add(faro, faro.target);
  // in fondo al corridoio la lampadina, che illumina in giu': la figlia quasi non si vede
  const lamp = new THREE.SpotLight(0xffb870, 0.7, 0, 1.25, 0.8, 1.8);
  lamp.position.set(cx, CORR.h - 0.22, -P - 1.6);
  lamp.target.position.set(cx, 0, -P - 1.1);
  ombre(lamp, 1024, 0.05, 5, 2);
  g.add(lamp, lamp.target);
  return g;
}

function ombre(luce, lato, vicino, lontano, morbide) {
  luce.castShadow = true;
  luce.shadow.mapSize.set(lato, lato);
  luce.shadow.camera.near = vicino;
  luce.shadow.camera.far = lontano;
  luce.shadow.bias = -0.0002;
  luce.shadow.normalBias = 0.006;
  luce.shadow.radius = morbide;
}

// ---------- i modelli di Meshy ----------
const DECODER = THREE.MeshoptDecoder.supported
  ? THREE.MeshoptDecoder.ready.then(() => THREE.MeshoptDecoder, () => THREE.MeshoptDecoderJS)
  : Promise.resolve(THREE.MeshoptDecoderJS);
const MODELLI = {};

// i modelli sono glTF in un .json con la geometria compressa dentro in base64 (gli Artifact non servono i .glb): si
// rimette insieme un GLB in memoria, come fa la stanza del gioco (gioco/js/stanza.js)
function modello(nome) {
  MODELLI[nome] ??= (async () => {
    const risposta = await fetch(`modelli/${nome}.json`);
    if (!risposta.ok) throw new Error(`${nome}: ${risposta.status}`);
    const j = await risposta.json();
    // la texture di metallo e ruvidezza non serve (la plastilina e' tutta uguale): non si carica, risparmia memoria
    for (const m of j.materials || []) delete m.pbrMetallicRoughness?.metallicRoughnessTexture;
    const uri = j.buffers[0].uri;
    const bin = Uint8Array.from(atob(uri.slice(uri.indexOf(",") + 1)), (c) => c.charCodeAt(0));
    delete j.buffers[0].uri;
    const testo = new TextEncoder().encode(JSON.stringify(j));
    const lj = (testo.length + 3) & ~3, lb = (bin.length + 3) & ~3;
    const glb = new Uint8Array(28 + lj + lb);
    const v = new DataView(glb.buffer);
    v.setUint32(0, 0x46546c67, true);
    v.setUint32(4, 2, true);
    v.setUint32(8, glb.length, true);
    v.setUint32(12, lj, true);
    v.setUint32(16, 0x4e4f534a, true);
    glb.set(testo, 20);
    glb.fill(0x20, 20 + testo.length, 20 + lj);
    v.setUint32(20 + lj, lb, true);
    v.setUint32(24 + lj, 0x004e4942, true);
    glb.set(bin, 28 + lj);
    const loader = new THREE.GLTFLoader().setMeshoptDecoder(await DECODER);
    return loader.parseAsync(glb.buffer, "modelli/");
  })();
  return MODELLI[nome];
}

// i materiali di Meshy diventano plastilina: il colore e le normali del modello, la luce morbida della creta
function aCreta(o, ruvido = 0.62) {
  const vecchio = o.material;
  o.material = materiale({ map: vecchio.map, normalMap: vecchio.normalMap || IMPRONTE, impronte: vecchio.normalMap ? 1 : 0.4,
    ruvido, side: vecchio.side });
  o.castShadow = true;
  o.receiveShadow = true;
  return vecchio;
}

// un mobile alle misure volute: appoggiato a terra (o all'altezza y), centrato in x e z, girato
async function mobile(m) {
  const o = (await modello(m.nome)).scene.clone(true);
  const box = new THREE.Box3().setFromObject(o);
  const size = box.getSize(new THREE.Vector3()), centro = box.getCenter(new THREE.Vector3());
  const scala = new THREE.Group();
  scala.scale.set(m.dim[0] / size.x, m.dim[1] / size.y, m.dim[2] / size.z);
  scala.position.set(-centro.x * scala.scale.x, -box.min.y * scala.scale.y, -centro.z * scala.scale.z);
  scala.add(o);
  const pezzo = new THREE.Group();
  pezzo.add(scala);
  pezzo.position.set(m.x, m.y ?? 0, m.z);
  pezzo.rotation.y = m.gira;
  pezzo.traverse((x) => {
    if (!x.isMesh) return;
    aCreta(x);
    x.userData.calore = m.calore ?? 0.05;
  });
  pezzo.name = m.nome;
  return pezzo;
}

// una porta di Meshy: la maniglia (sul lato -x del modello) va dalla parte opposta al cardine
async function porta(d) {
  const o = await mobile({ nome: "porta", x: d.larga / 2, z: 0, dim: [d.larga, 2.04, 0.12], gira: Math.PI });
  const anta = new THREE.Group();
  anta.position.set(d.cardine[0], 0, d.cardine[1]);
  anta.rotation.y = d.apre;
  anta.add(o);
  return anta;
}

// i quattro piatti sulla tovaglia (anche il secondo giorno: "nessuno ha mangiato"), dove li trova un raggio dall'alto
function piatti(tavolo) {
  const g = new THREE.Group();
  const piattoM = materiale({ map: texture("piatto"), ruvido: 0.38, impronte: 0.25 }), bordoM = materiale({ color: 0xf2f1ec, ruvido: 0.38, impronte: 0.25 });
  const posate = materiale({ color: 0xb8b9b4, ruvido: 0.3, impronte: 0.2 });
  const giu = new THREE.Raycaster();
  tavolo.updateMatrixWorld(true);
  for (const [dx, dz] of [[-0.22, -0.36], [0.22, -0.36], [-0.22, 0.36], [0.22, 0.36]]) {
    const x = tavolo.position.x + dx, z = tavolo.position.z + dz;
    giu.set(new THREE.Vector3(x, 2, z), new THREE.Vector3(0, -1, 0));
    const y = giu.intersectObject(tavolo, true)[0]?.point.y ?? 0.78;
    for (const [geo, m, px, py] of [[new THREE.CylinderGeometry(0.115, 0.085, 0.018, 40), [bordoM, piattoM, bordoM], x, y + 0.009],
      [scatola(0.014, 0.006, 0.17, 0.003, 0.0005), posate, x + (dx < 0 ? -0.15 : 0.15), y + 0.004]]) {
      const p = new THREE.Mesh(geo, m);
      p.position.set(px, py, z);
      p.castShadow = p.receiveShadow = true;
      p.userData.calore = 0.05;
      g.add(p);
    }
  }
  return g;
}

// ---------- i pupazzi ----------
// dove puntano braccio e avambraccio sinistro, giorno per giorno (il destro e' allo specchio): il padre le lascia
// pendere, le mani un po' in avanti; la figlia tiene le mani davanti alla pancia, una nell'altra, e il secondo giorno
// le stringe al petto
const BRACCIA = {
  padre: { 1: [[0.15, -1, 0.08], [0.06, -1, 0.32]], 2: [[0.12, -1, 0.06], [0.05, -1, 0.24]] },
  figlia: { 1: [[0.1, -1, 0.1], [-0.55, -0.45, 0.75]], 2: [[0.16, -1, 0.22], [-0.62, -0.08, 0.78]] },
};
// il secondo giorno il padre si regge al mobile con la mano destra: dove sta il polso, sul piano di lavoro
const APPOGGIO = new THREE.Vector3(-1.2, PIANO_LAVORO + 0.1, -1.5);

// un pupazzo: i materiali di plastilina e, nella posa del modello (a braccia aperte), dove stanno le ossa e com'e'
// girato il genitore di ognuna, visti dal pupazzo. L'animazione d'attesa di Meshy non serve (si guarda attorno e
// torce la giacca): vivo() piega la schiena, abbassa le braccia e fa il resto
async function personaggio(chi) {
  const radice = (await modello(`${chi}_creta`)).scene;
  const ossa = {}, pelle = [];
  radice.traverse((o) => {
    if (o.isBone) ossa[o.name] = o;
    if (!o.isMesh) return;
    const vecchio = aCreta(o, 0.58);
    o.userData = { chi, calore: 0.5, mappa: vecchio.map };
    o.frustumCulled = false;
    pelle.push(o);
  });
  radice.updateMatrixWorld(true);
  const dove = {}, guida = {};
  for (const [nome, b] of Object.entries(ossa)) {
    dove[nome] = b.getWorldPosition(new THREE.Vector3());
    const qp = b.parent.getWorldQuaternion(new THREE.Quaternion());
    guida[nome] = { b, base: b.quaternion.clone(), qp, qpi: qp.clone().invert() };
  }
  return { radice, chi, ossa, dove, guida, pelle, posa: {}, collo: ossa.neck || ossa.Head, testa: ossa.Head };
}

// la rotazione che porta l'osso a puntare nella direzione voluta (vista dal pupazzo). Le braccia del modello sono aperte
// e un po' indietro: girarle di un angolo fisso le manda dietro la schiena. "prima" e' quanto e' gia' girato il genitore
function punta(p, osso, figlio, verso, prima) {
  if (!p.dove[osso] || !p.dove[figlio]) return;
  const ora = p.dove[figlio].clone().sub(p.dove[osso]).normalize();
  const voluto = verso.clone().normalize();
  if (prima) voluto.applyQuaternion(prima.clone().invert());
  p.posa[osso] = new THREE.Quaternion().setFromUnitVectors(ora, voluto);
}

// il braccio che si appoggia: spalla, gomito e polso, col polso nel punto voluto e il gomito un po' indietro e in fuori
function appoggia(p, lato, punto) {
  const S = p.dove[`${lato}Arm`], E = p.dove[`${lato}ForeArm`], W = p.dove[`${lato}Hand`];
  const a = E.distanceTo(S), b = W.distanceTo(E);
  const verso = p.radice.worldToLocal(punto.clone()).sub(S);
  const d = THREE.MathUtils.clamp(verso.length(), Math.abs(a - b) + 0.01, a + b - 0.005);
  verso.normalize();
  const cosA = (a * a + d * d - b * b) / (2 * a * d);
  const polo = new THREE.Vector3(lato === "Left" ? 0.5 : -0.5, 0, -1);
  polo.addScaledVector(verso, -polo.dot(verso)).normalize();
  const gomito = S.clone().addScaledVector(verso, a * cosA).addScaledVector(polo, a * Math.sqrt(Math.max(0, 1 - cosA * cosA)));
  const polso = S.clone().addScaledVector(verso, d);
  punta(p, `${lato}Arm`, `${lato}ForeArm`, gomito.clone().sub(S));
  punta(p, `${lato}ForeArm`, `${lato}Hand`, polso.sub(gomito), p.posa[`${lato}Arm`]);
}

// il pupazzo al suo posto nel giorno n, girato verso la videocamera, con le braccia in posa
function mettiInPosa(p, n) {
  const qui = GIORNI[n][p.chi];
  p.radice.position.set(qui.x, 0, qui.z);
  p.radice.rotation.y = Math.atan2(OCCHIO.x - qui.x, OCCHIO.z - qui.z);
  p.radice.updateMatrixWorld(true);
  p.posa = {};
  const [braccio, avambraccio] = BRACCIA[p.chi][n];
  for (const [lato, k] of [["Left", 1], ["Right", -1]]) {
    if (p.chi === "padre" && n === 2 && lato === "Right") {
      appoggia(p, lato, APPOGGIO);
      continue;
    }
    punta(p, `${lato}Arm`, `${lato}ForeArm`, new THREE.Vector3(braccio[0] * k, braccio[1], braccio[2]));
    punta(p, `${lato}ForeArm`, `${lato}Hand`, new THREE.Vector3(avambraccio[0] * k, avambraccio[1], avambraccio[2]), p.posa[`${lato}Arm`]);
  }
}

// girare un osso di qualche grado attorno agli assi del pupazzo (x: annuire o piegarsi in avanti, y: voltarsi,
// z: inclinarsi di lato), a partire dalla sua posa
const GRADI = Math.PI / 180;
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
function gira(p, nome, rx, ry, rz) {
  const g = p.guida[nome];
  if (!g) return;
  _q.setFromEuler(_e.set(rx * GRADI, ry * GRADI, rz * GRADI, "YXZ"));
  if (p.posa[nome]) _q.multiply(p.posa[nome]);
  g.b.quaternion.copy(g.qpi).multiply(_q).multiply(g.qp).multiply(g.base);
}
const onda = (t, f, fase = 0) => Math.sin((t * f + fase) * Math.PI * 2);
const vaga = (t, f, seme) => rumore3(t * f, seme, seme * 0.37);
const liscio = (a, b, x) => { const k = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
// la tosse del padre, il secondo giorno: ogni 6 secondi e mezzo, tre colpi in un secondo
function tosse(t) {
  const s = (t + 2) % 6.5;
  return s > 1 ? 0 : Math.pow(Math.abs(Math.sin(s * Math.PI * 3)), 0.6) * (1 - s * 0.45);
}
// i singhiozzi della figlia: due scosse ogni due secondi e poco piu', non sempre uguali
function singhiozzo(t) {
  const s = (t + 0.7) % 2.3;
  return s > 0.55 ? 0 : Math.abs(Math.sin(s * Math.PI * 3.7)) * (1 - s) * (0.7 + 0.3 * vaga(t, 0.4, 41));
}

// la vita dei pupazzi. Il primo giorno il padre respira in fretta (ha la febbre) e gli tremano le mani, la figlia
// respira piano e ogni tanto guarda il padre, di nascosto. Il secondo il padre respira a fatica, piegato verso il
// mobile, e tossisce; la figlia piange. Quando lo si esamina sta (quasi) fermo e piega la testa dall'altra parte, per
// far vedere il bubbone
function vivo(p, t, n, fermo) {
  const calma = 1 - 0.7 * fermo, mostra = fermo * fermo * (3 - 2 * fermo);
  if (p.chi === "padre" && n === 1) {
    const r = onda(t, 0.48) * calma;
    gira(p, "Hips", 0, vaga(t, 0.08, 17) * 1.5 * calma, 0);
    gira(p, "Spine01", 4 - 1.8 * r, vaga(t, 0.15, 3) * 1.5 * calma, 0);
    gira(p, "Spine02", 5 - 1.3 * r, 0, 0);
    gira(p, "LeftShoulder", 0, 0, 1.4 * r);
    gira(p, "RightShoulder", 0, 0, -1.4 * r);
    for (const o of ["LeftArm", "RightArm", "LeftForeArm", "RightForeArm"]) gira(p, o, 0, 0, 0);
    gira(p, "neck", 10 - 6 * mostra + vaga(t, 0.2, 7) * 3 * calma, vaga(t, 0.13, 9) * 4 * calma - 8 * mostra, 12 * mostra);
    gira(p, "Head", -8 + vaga(t, 0.25, 11) * 2 * calma, vaga(t, 0.17, 13) * 3 * calma, vaga(t, 0.1, 5) * 3 * calma);
    gira(p, "LeftHand", vaga(t, 7, 1) * 3, 0, vaga(t, 6, 2) * 3);
    gira(p, "RightHand", vaga(t, 7, 3) * 3, 0, vaga(t, 6, 4) * 3);
  } else if (p.chi === "padre") {
    const r = onda(t, 0.72) * calma, c = tosse(t) * calma;
    gira(p, "Hips", 0, vaga(t, 0.08, 17) * calma, 2);
    gira(p, "Spine01", 7 - 3 * r + 9 * c, vaga(t, 0.15, 3) * 1.5 * calma, 3);
    gira(p, "Spine02", 7 - 2.4 * r + 7 * c, 0, 2);
    gira(p, "LeftShoulder", 0, 0, 2.6 * r + 3 * c);
    gira(p, "RightShoulder", 0, 0, -2.6 * r - 3 * c);
    for (const o of ["LeftArm", "RightArm", "LeftForeArm", "RightForeArm"]) gira(p, o, 0, 0, 0);
    gira(p, "neck", 16 - 14 * mostra + vaga(t, 0.2, 7) * 3 * calma + 6 * c, vaga(t, 0.13, 9) * 3 * calma - 10 * mostra, 14 * mostra);
    gira(p, "Head", -10 + vaga(t, 0.25, 11) * 2 * calma + 10 * c, vaga(t, 0.17, 13) * 3 * calma, -4 + vaga(t, 0.1, 5) * 3 * calma);
    gira(p, "LeftHand", vaga(t, 8, 1) * 5, 0, vaga(t, 7, 2) * 5);
    gira(p, "RightHand", 0, 0, 0);
  } else if (n === 1) {
    const r = onda(t, 0.27);
    const occhiata = liscio(0.6, 0.85, onda(t, 1 / 7.5) * 0.5 + 0.5);
    // le spalle su, la testa bassa: guarda da sotto in su
    gira(p, "Spine01", 2 - 1.0 * r, 0, 0);
    gira(p, "Spine02", 2 - 0.8 * r, -5 * occhiata, 0);
    gira(p, "LeftShoulder", 0, 0, 3 + 0.9 * r);
    gira(p, "RightShoulder", 0, 0, -3 - 0.9 * r);
    for (const o of ["LeftArm", "RightArm", "LeftForeArm", "RightForeArm"]) gira(p, o, 0, 0, 0);
    gira(p, "neck", 6 + vaga(t, 0.2, 21) * 2, -10 * occhiata + vaga(t, 0.15, 25) * 2, 0);
    gira(p, "Head", 4 + vaga(t, 0.3, 23) * 2, -12 * occhiata, 4 * occhiata);
  } else {
    // piange: la testa un poco bassa (la faccia si deve vedere), le spalle strette che sobbalzano
    const r = onda(t, 0.4), s = singhiozzo(t) * calma;
    gira(p, "Spine01", 3 - 1.2 * r + 3 * s, 0, 0);
    gira(p, "Spine02", 4 - 1 * r + 3 * s, 0, 0);
    gira(p, "LeftShoulder", 0, 0, 5 + 1.2 * r + 4 * s);
    gira(p, "RightShoulder", 0, 0, -5 - 1.2 * r - 4 * s);
    for (const o of ["LeftArm", "RightArm", "LeftForeArm", "RightForeArm"]) gira(p, o, 0, 0, 0);
    gira(p, "neck", 7 + vaga(t, 0.2, 21) * 2 + 3 * s, vaga(t, 0.12, 25) * 3, 0);
    gira(p, "Head", 3 + 2 * s, vaga(t, 0.15, 27) * 4, 5 + vaga(t, 0.2, 29) * 2);
  }
}

// il bubbone sul collo del padre, sotto la mascella sul suo lato sinistro (a destra per chi guarda), attaccato
// all'osso del collo: si muove con lui. E' una cupola di plastilina che esce dalla pelle: alla base il colore della
// pelle, poi rosso infiammato, viola scuro in cima. Il secondo giorno e' piu' grosso e si e' aperto: in cima il buco
// bagnato, nero, col bordo di pus giallo. Dalla porta la testa curva del padre copre la gola e il lato si vede di
// taglio: sta in basso sul collo, tra il davanti e il fianco. Il punto della pelle lo trova un raggio che parte da
// dentro il collo e va verso li' (da fuori troverebbe prima il bavero della giacca), nella posa del modello
const PELLE = { 1: 0xcbb596, 2: 0xc4bea6 };
// dove: il raggio va in avanti e un po' di lato (quanto di lato), un poco sopra l'osso del collo
const BUBBONE = { lato: 1.1, su: 0.012 };
function cupola(r, pelle, aperto, seme) {
  const geo = new THREE.SphereGeometry(r, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2 + 0.3);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  const base = new THREE.Color(pelle), rosso = new THREE.Color(0x8c3236), viola = new THREE.Color(0x4a1828);
  const pus = new THREE.Color(0xa58d4a), buco = new THREE.Color(0x140605);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = y / r;
    let k = 1 + rumore3(x / r * 2 + seme, y / r * 2, z / r * 2) * 0.1;
    // il buco: la cima sprofonda, il bordo si alza un poco
    if (aperto) k *= 1 + 0.05 * liscio(0.7, 0.8, t) - 0.25 * liscio(0.82, 0.92, t);
    pos.setXYZ(i, x * k, y * k, z * k);
    c.copy(base).lerp(rosso, liscio(0.0, 0.45, t)).lerp(viola, liscio(0.45, 0.85, t));
    if (aperto) c.lerp(pus, liscio(0.7, 0.78, t)).lerp(buco, liscio(0.82, 0.88, t));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, materiale({ vertexColors: true, ruvido: aperto ? 0.34 : 0.46, impronte: 0.4 }));
  m.castShadow = true;
  return m;
}

function bubboni(p) {
  p.radice.updateMatrixWorld(true);
  const avanti = new THREE.Vector3(0, 0, 1).applyQuaternion(p.radice.quaternion);
  const sinistra = new THREE.Vector3(avanti.z, 0, -avanti.x);
  const verso = sinistra.clone().multiplyScalar(BUBBONE.lato).add(avanti).normalize();
  const dentro = p.collo.getWorldPosition(new THREE.Vector3());
  dentro.y += BUBBONE.su;
  const colpo = new THREE.Raycaster(dentro, verso, 0.005, 0.2).intersectObjects(p.pelle, false)[0];
  const qui = colpo ? colpo.point : dentro.addScaledVector(verso, 0.05);
  const scala = p.collo.getWorldScale(new THREE.Vector3()).x;
  const fuori = (colpo ? colpo.face.normal.clone().transformDirection(colpo.object.matrixWorld).lerp(verso, 0.5).normalize() : verso)
    .transformDirection(p.collo.matrixWorld.clone().invert());
  p.collo.worldToLocal(qui);
  const su = new THREE.Vector3(0, 1, 0);
  const b = {};
  for (const [n, r, aperto] of [["chiuso", 0.03, false], ["aperto", 0.04, true]]) {
    const m = cupola(r, PELLE[aperto ? 2 : 1], aperto, aperto ? 7 : 3);
    // la base affonda nel collo
    m.position.copy(qui).addScaledVector(fuori, -0.35 * r / scala);
    m.quaternion.setFromUnitVectors(su, fuori);
    m.scale.set(1.15, aperto ? 0.8 : 0.72, 1).divideScalar(scala);
    m.userData.chi = "padre";
    m.userData.calore = aperto ? 1 : 0.95;
    p.collo.add(m);
    b[n] = m;
  }
  return b;
}

// le dita nere del secondo giorno (la peste che va in cancrena): un colore per vertice, che moltiplica la texture.
// Le mani sono i vertici che seguono gli ossi delle mani: grigie; verso la punta delle dita (la parte piu' lontana dal
// polso) livide, poi nere
function ditaNere(p) {
  const grigio = new THREE.Color(0.58, 0.6, 0.64), livido = new THREE.Color(0.32, 0.2, 0.26), nero = new THREE.Color(0.035, 0.028, 0.03);
  const c = new THREE.Color();
  for (const o of p.pelle) {
    if (!o.isSkinnedMesh || o.geometry.attributes.color) continue;
    const g = o.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    const ossa = o.skeleton.bones;
    const colori = new Float32Array(pos.count * 3).fill(1);
    for (const nome of ["LeftHand", "RightHand"]) {
      const i = ossa.findIndex((b) => b.name === nome);
      if (i < 0) continue;
      const polso = new THREE.Vector3().setFromMatrixPosition(o.skeleton.boneInverses[i].clone().invert());
      const mano = [];
      const v = new THREE.Vector3();
      for (let k = 0; k < pos.count; k++) {
        let w = 0;
        for (let j = 0; j < 4; j++) if (si.getComponent(k, j) === i) w += sw.getComponent(k, j);
        if (w < 0.05) continue;
        v.fromBufferAttribute(pos, k).applyMatrix4(o.bindMatrix);
        mano.push([k, v.distanceTo(polso), w]);
      }
      const lungo = Math.max(...mano.map((m) => m[1]));
      for (const [k, d, w] of mano) {
        c.copy(grigio).lerp(livido, liscio(0.38, 0.55, d / lungo)).lerp(nero, liscio(0.55, 0.78, d / lungo));
        colori[k * 3] = 1 + (c.r - 1) * w;
        colori[k * 3 + 1] = 1 + (c.g - 1) * w;
        colori[k * 3 + 2] = 1 + (c.b - 1) * w;
      }
    }
    g.setAttribute("color", new THREE.BufferAttribute(colori, 3));
  }
}

// ---------- il disegno ----------
// niente VHS: Three.js disegna sullo schermo, a piena risoluzione (fino a due punti per pixel dello schermo)
const renderer = new THREE.WebGLRenderer({ canvas: schermo, antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.05, 40);
const quadro = (frag, uniforms) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms, fragmentShader: frag,
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    depthTest: false, depthWrite: false }));
  m.frustumCulled = false;
  const sc = new THREE.Scene();
  sc.add(m);
  return sc;
};

// l'infrarosso: la scena (per i contorni) e il calore di ogni cosa, poi i colori della videocamera termica: il freddo
// scuro, il caldo rosso, il caldo forte quasi bianco
const rtScena = new THREE.WebGLRenderTarget(16, 9, { type: THREE.HalfFloatType });
const rtCalore = new THREE.WebGLRenderTarget(16, 9, { type: THREE.HalfFloatType });
const passoCalore = { value: new THREE.Vector2(1 / 16, 1 / 9) };
const scenaIr = quadro(`
  uniform sampler2D tScena, tCalore;
  uniform vec2 passo;
  varying vec2 vUv;
  vec3 irMap(float l) {
    float t = clamp(l, 0.0, 1.0) * 5.0;
    vec3 c = mix(vec3(6.0, 2.0, 4.0), vec3(34.0, 10.0, 17.0), clamp(t, 0.0, 1.0));
    c = mix(c, vec3(84.0, 30.0, 44.0), clamp(t - 1.0, 0.0, 1.0));
    c = mix(c, vec3(150.0, 80.0, 94.0), clamp(t - 2.0, 0.0, 1.0));
    c = mix(c, vec3(214.0, 162.0, 172.0), clamp(t - 3.0, 0.0, 1.0));
    return mix(c, vec3(255.0, 236.0, 232.0), clamp(t - 4.0, 0.0, 1.0)) / 255.0;
  }
  void main() {
    vec3 c = texture2D(tScena, vUv).rgb;
    float y = sqrt(clamp(dot(c, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0));
    float h = 0.0;
    for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) h += texture2D(tCalore, vUv + vec2(float(i), float(j)) * passo).r;
    h /= 25.0;
    vec3 col = irMap(y * 0.3 + h * 0.86);
    vec2 v = (vUv - 0.5) * vec2(1.0, 0.9);
    col *= 1.0 - 0.35 * pow(clamp(length(v) * 1.41, 0.0, 1.0), 2.2);
    gl_FragColor = vec4(col, 1.0);
  }`, { tScena: { value: rtScena.texture }, tCalore: { value: rtCalore.texture }, passo: passoCalore });

let scena = null, persone = {}, bub = null, giornoOra = 0, ir = false;
const FACCE = {};

function misura() {
  const w = Math.min(2560, Math.max(640, Math.round(palco.clientWidth * Math.min(2, window.devicePixelRatio || 1))));
  const h = Math.round(w * 9 / 16);
  renderer.setSize(w, h, false);
  rtScena.setSize(w, h);
  rtCalore.setSize(Math.max(64, Math.round(w / 3)), Math.max(36, Math.round(h / 3)));
  passoCalore.value.set(1 / rtCalore.width, 1 / rtCalore.height);
}
if (window.ResizeObserver) new ResizeObserver(() => misura()).observe(palco);

// la cucina, i mobili, i pupazzi e le facce di ricambio: tutto all'inizio, poi i giorni cambiano solo i pupazzi
async function costruisci() {
  IMPRONTE = impronte();
  const nuova = new THREE.Scene();
  const [vuota, mobili, porte, padre, figlia] = await Promise.all([stanza(), Promise.all(MOBILI.map(mobile)),
    Promise.all(PORTE.map(porta)), personaggio("padre"), personaggio("figlia"),
    ...Object.values(GIORNI).flatMap((g) => [g.padre.faccia, g.figlia.faccia]).filter(Boolean).map(async (f) => {
      const t = await caricatore.loadAsync(`modelli/${f}.webp`);
      t.flipY = false;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      FACCE[f] = t;
    })]);
  nuova.add(vuota, ...mobili, ...porte, piatti(mobili.find((m) => m.name === "tavolo")), padre.radice, figlia.radice);
  // il tubo del neon fa luce: il materiale del neon brilla dei suoi colori (il tubo, bianco, piu' di tutto)
  tubo = [];
  mobili.find((m) => m.name === "neon").traverse((o) => {
    if (!o.isMesh) return;
    Object.assign(o.material, { emissive: new THREE.Color(0xffffff), emissiveMap: o.material.map, emissiveIntensity: 0.4 });
    tubo.push(o.material);
  });
  bub = bubboni(padre);
  ditaNere(padre);
  nuova.fog = new THREE.Fog(0x060504, 4, 12);
  nuova.background = new THREE.Color(0x000000);
  scena = nuova;
  persone = { padre, figlia };
  misura();
}

// il giorno n: dove stanno, che faccia hanno, le dita del padre e il bubbone, cosa dice il padre
function giorno(n) {
  if (!scena || n === giornoOra) return;
  giornoOra = n;
  for (const b of document.querySelectorAll("[id^=giorno-]")) b.setAttribute("aria-pressed", String(b.id === `giorno-${n}`));
  esci(true);
  for (const p of Object.values(persone)) {
    const qui = GIORNI[n][p.chi];
    mettiInPosa(p, n);
    for (const o of p.pelle) {
      o.material.map = qui.faccia ? FACCE[qui.faccia] : o.userData.mappa;
      // le dita nere: il colore dei vertici solo il secondo giorno
      o.material.vertexColors = p.chi === "padre" && n === 2;
      o.material.needsUpdate = true;
      o.userData.calore = qui.calore;
    }
  }
  bub.chiuso.visible = n === 1;
  bub.aperto.visible = n === 2;
  parla(GIORNI[n].arrivo);
}

// ---------- la testa e lo zoom della videocamera ----------
const SU = new THREE.Vector3(0, 1, 0);
const testa = { x: 0, y: 0, tx: 0, ty: 0 };
let zoom = 0, zoomVerso = 0, zoomSu = null;
const dove = new THREE.Vector3(), base = new THREE.Vector3(), destra = new THREE.Vector3(), bersaglio = new THREE.Vector3();
const mirino = new THREE.Vector3(), luce = new THREE.Vector3(), lato = new THREE.Vector3();

// il punto da guardare nello zoom: il bubbone del padre, la faccia della figlia
function puntoZoom(chi, v) {
  if (chi === "padre") return (bub.aperto.visible ? bub.aperto : bub.chiuso).getWorldPosition(v);
  const p = persone.figlia;
  p.testa.getWorldPosition(v);
  v.y += 0.07;
  return v.addScaledVector(new THREE.Vector3(Math.sin(p.radice.rotation.y), 0, Math.cos(p.radice.rotation.y)), 0.06);
}

function inquadra(dt, t) {
  testa.x += (testa.tx - testa.x) * Math.min(1, dt * 4);
  testa.y += (testa.ty - testa.y) * Math.min(1, dt * 4);
  zoom += Math.sign(zoomVerso - zoom) * Math.min(Math.abs(zoomVerso - zoom), dt / 1.1);
  const z = zoom * zoom * (3 - 2 * zoom);
  if (!zoom && !zoomVerso) zoomSu = null;
  // la maschera non sta mai ferma: un respiro e un tremito leggero
  camera.position.set(OCCHIO.x + Math.sin(t * 0.7) * 0.004, OCCHIO.y + Math.sin(t * 1.3) * 0.006, OCCHIO.z);
  const volta = -testa.x * 0.2 * (1 - z), china = -testa.y * 0.11 * (1 - z);
  base.subVectors(MIRA, OCCHIO).normalize();
  base.applyAxisAngle(SU, volta);
  destra.crossVectors(base, SU).normalize();
  base.applyAxisAngle(destra, china);
  bersaglio.copy(camera.position).addScaledVector(base, 3);
  if (zoomSu) {
    // il mirino insegue il punto con calma: il pupazzo si muove a scatti, la videocamera no
    puntoZoom(zoomSu, dove);
    mirino.lerp(dove, 1 - Math.exp(-dt * 3));
    bersaglio.lerp(mirino, z);
  }
  camera.fov = FOV + ((zoomSu ? ZOOM[zoomSu] : FOV) - FOV) * z;
  FORZA_BOLLE.value = 1 - 0.5 * z;
  faro.intensity = faro.userData.forza * (1 + 0.6 * z);
  // la lampada sta sulla maschera: si sposta e si gira con la testa (nello zoom va dove si guarda)
  faro.position.copy(camera.position).add(SCARTO_FARO);
  luce.subVectors(FARO_MIRA, OCCHIO).applyAxisAngle(SU, volta);
  lato.crossVectors(luce, SU).normalize();
  luce.applyAxisAngle(lato, china).add(camera.position);
  faro.target.position.lerpVectors(luce, bersaglio, z);
  camera.updateProjectionMatrix();
  camera.lookAt(bersaglio);
}

// ---------- le frasi accanto a chi parla ----------
let turnoFrase = 0;
const attendi = (ms) => new Promise((r) => setTimeout(r, ms));
async function parla(righe) {
  const turno = ++turnoFrase;
  for (const testo of righe) {
    frase.style.opacity = "1";
    for (let i = 1; i <= testo.length; i++) {
      if (turno !== turnoFrase) return;
      frase.textContent = testo.slice(0, i);
      await attendi(38);
    }
    await attendi(1600);
  }
  if (turno === turnoFrase) frase.style.opacity = "0";
}

// la frase accanto alla testa del padre, dentro lo schermo anche nello zoom
const proietta = new THREE.Vector3();
function mettiFrase() {
  const p = persone.padre;
  p.testa.getWorldPosition(proietta);
  proietta.y += 0.12;
  proietta.project(camera);
  const x = THREE.MathUtils.clamp((proietta.x * 0.5 + 0.5) * 100 + 6, 3, 66);
  const y = THREE.MathUtils.clamp((-proietta.y * 0.5 + 0.5) * 100 - 4, 8, 80);
  frase.style.left = `${x}%`;
  frase.style.top = `${y}%`;
}

// ---------- il tempo: la plastilina a scatti ----------
// il mondo cambia posa 12 volte al secondo, e a ogni posa la superficie "bolle" un poco; il neon ogni tanto si spegne
const POSE = 12;
let tempo = 0, ultimaPosa = -1;
function anima(dt) {
  tempo += dt;
  const n = Math.floor(tempo * POSE);
  if (n !== ultimaPosa) {
    ultimaPosa = n;
    BOLLE.value = Math.random() * 50;
    const k = Math.random() < 0.07 ? 0.1 + Math.random() * 0.3 : 1;
    neon.intensity = neon.userData.forza * k;
    for (const m of tubo) m.emissiveIntensity = 0.4 * k;
  }
  const t = n / POSE;
  for (const p of Object.values(persone)) vivo(p, t, giornoOra, zoomSu === p.chi ? zoom : 0);
}

// ---------- l'infrarosso: la scena col calore di ogni cosa, in grigi ----------
const caloreMat = new Map();
function grigio(v) {
  if (!caloreMat.has(v)) caloreMat.set(v, new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v), fog: false }));
  return caloreMat.get(v);
}
function disegnaCalore() {
  const scambi = [];
  scena.traverse((o) => {
    if (!o.isMesh) return;
    scambi.push([o, o.material]);
    o.material = grigio(o.userData.calore ?? 0.05);
  });
  const fog = scena.fog, tm = renderer.toneMapping;
  scena.fog = null;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = false;
  renderer.setRenderTarget(rtCalore);
  renderer.render(scena, camera);
  for (const [o, m] of scambi) o.material = m;
  scena.fog = fog;
  renderer.toneMapping = tm;
  renderer.shadowMap.enabled = true;
}

function disegna() {
  if (ir) {
    renderer.setRenderTarget(rtScena);
    renderer.render(scena, camera);
    disegnaCalore();
    renderer.setRenderTarget(null);
    renderer.render(scenaIr, camera);
  } else {
    renderer.setRenderTarget(null);
    renderer.render(scena, camera);
  }
}

let prima = null, fermo = false;
function giro(ora) {
  const dt = prima == null ? 0 : Math.min(0.1, (ora - prima) / 1000);
  prima = ora;
  if (scena && giornoOra && !fermo) {
    anima(dt);
    inquadra(dt, tempo);
    disegna();
    mettiFrase();
  }
  requestAnimationFrame(giro);
}

// la messa a fuoco della videocamera che cerca il soggetto, quando lo zoom arriva
async function aFuoco() {
  for (const [px, ms] of [[6, 0], [0, 380], [2, 180], [0, 320]]) {
    schermo.style.transition = ms ? `filter ${ms}ms ease-in-out` : "none";
    schermo.style.filter = px ? `blur(${px}px)` : "none";
    await attendi(ms || 30);
  }
}

// ---------- i comandi ----------
const BOTTONI = { padre: [$("#esamina"), "Esamina il collo"], figlia: [$("#figlia"), "Guarda la figlia"] };
let trascina = null;
palco.addEventListener("pointermove", (e) => {
  const r = palco.getBoundingClientRect();
  if (e.pointerType === "mouse") {
    testa.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    testa.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
  } else if (trascina) {
    testa.tx = THREE.MathUtils.clamp(trascina.tx + ((e.clientX - trascina.x) / r.width) * 2.4, -1, 1);
    testa.ty = THREE.MathUtils.clamp(trascina.ty + ((e.clientY - trascina.y) / r.height) * 2.4, -1, 1);
  }
});
palco.addEventListener("pointerdown", (e) => {
  trascina = { x: e.clientX, y: e.clientY, tx: testa.tx, ty: testa.ty };
});
palco.addEventListener("pointerup", (e) => {
  const mosso = trascina && Math.hypot(e.clientX - trascina.x, e.clientY - trascina.y) > 8;
  trascina = null;
  if (mosso || !scena) return;
  if (zoomVerso) return esci();
  // un clic sul padre esamina il collo, uno sulla figlia la guarda
  const r = palco.getBoundingClientRect();
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const chi = ray.intersectObjects(scena.children, true).find((h) => h.object.visible)?.object.userData.chi;
  if (chi) esamina(chi);
});

async function esamina(chi) {
  if (!scena || zoomVerso) return;
  zoomSu = chi;
  zoomVerso = 1;
  puntoZoom(chi, mirino);
  BOTTONI[chi][0].textContent = "Torna";
  if (chi === "padre") parla(GIORNI[giornoOra].esame);
  await attendi(1000);
  if (zoomVerso) aFuoco();
}

function esci(subito = false) {
  zoomVerso = 0;
  if (subito) {
    zoom = 0;
    zoomSu = null;
  }
  for (const [b, testo] of Object.values(BOTTONI)) b.textContent = testo;
}

for (const [chi, [b]] of Object.entries(BOTTONI)) b.addEventListener("click", () => (zoomVerso ? esci() : esamina(chi)));
$("#ir").addEventListener("click", () => cambiaIr());
function cambiaIr() {
  ir = !ir;
  $("#ir").setAttribute("aria-pressed", String(ir));
}
for (const n of [1, 2]) $(`#giorno-${n}`).addEventListener("click", () => giorno(n));
// la tastiera (nel programma per Windows non ci sono i bottoni sotto): 1 e 2 i giorni, E il collo, F la figlia,
// I l'infrarosso, Esc torna indietro, F11 lo schermo intero
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === "1" || k === "2") giorno(Number(k));
  else if (k === "e" || k === "f") zoomVerso ? esci() : esamina(k === "e" ? "padre" : "figlia");
  else if (k === "i") cambiaIr();
  else if (k === "escape") esci();
  else if (k === "f11") {
    e.preventDefault();
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }
});

// per le prove (Playwright): lo stato e i comandi. avanti() ferma il giro e fa passare il tempo senza disegnare, poi
// disegna una volta sola (nel browser delle prove, senza scheda video, un'immagine costa secondi)
window.prova = { giorno, esamina, esci, get oggi() { return giornoOra; }, get pronta() { return !!scena && attesa.hidden; },
  avanti(secondi, vista) {
    fermo = true;
    for (let i = 0; i < secondi * 30; i++) { anima(1 / 30); inquadra(1 / 30, tempo); }
    if (vista) {
      camera.position.fromArray(vista[0]);
      camera.fov = vista[2];
      camera.updateProjectionMatrix();
      camera.lookAt(new THREE.Vector3().fromArray(vista[1]));
    }
    const t = performance.now();
    disegna();
    mettiFrase();
    return Math.round(performance.now() - t);
  },
  posizioni() {
    const v = (o) => o.getWorldPosition(new THREE.Vector3()).toArray().map((x) => +x.toFixed(3));
    const p = persone.padre;
    return { collo: v(p.collo), testa: v(p.testa), mano: v(p.ossa.RightHand), bubbone: v(bub.aperto.visible ? bub.aperto : bub.chiuso), occhio: OCCHIO.toArray() };
  } };

requestAnimationFrame(giro);
costruisci().then(() => {
  attesa.hidden = true;
  giorno(location.hash === "#giorno2" ? 2 : 1);
}).catch((err) => {
  attesa.textContent = "Il nastro non parte";
  console.error(err);
});
