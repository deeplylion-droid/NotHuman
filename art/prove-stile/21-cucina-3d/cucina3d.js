// La prova 3D della cucina della casa 3 (27 ottobre, chiesta dall'utente: "fai una prova con gli stili 1 e 2"). La
// stessa stanza, con le stesse misure, in due stili da confrontare:
// 1 · il nastro del 1998: pochi poligoni, texture piccole e nette (senza filtro), 15 bit di colore col retino, i
//     vertici agganciati alla griglia dello schermo che tremano, la nebbia scura, l'ombra a disco sotto i piedi;
// 2 · la plastilina: stanza e pupazzi modellati, spigoli tondi e bozzi, impronte delle dita, luce morbida con le
//     ombre, e il mondo che si muove a scatti (12 pose al secondo) e "bolle" a ogni posa, come uno stop-motion.
// Niente VHS (deciso il 27 ottobre: questi stili non hanno niente da nascondere): la videocamera del medico c'e' ancora
// (registra, ha la lampada, lo zoom e l'infrarosso), ma l'immagine e' pulita. La videocamera e' ferma sulla porta: la
// testa segue un poco il puntatore e la lampada con lei; "Esamina il collo" stringe lo zoom sul bubbone del padre;
// "Infrarosso" mostra il calore. I personaggi sono di Meshy (da immagine a 3D, con lo scheletro e l'animazione di attesa), fatti dai
// disegni dei due stili in personaggi/; la stanza e' costruita qui, con le texture dipinte qui.
import * as THREE from "./lib/three.js";

const $ = (s) => document.querySelector(s);
const palco = $("#palco"), schermo = $("#schermo"), frase = $("#frase"), attesa = $("#attesa");

// ---------- le misure, in metri: x verso destra, y in alto, z verso chi guarda (la porta della cucina e' a z = 0) ----
const L = 3.4, P = 4.4, A = 2.7;
const VANO = { x0: -0.35, x1: 0.5, h: 2.08 };                  // la porta del corridoio, nel muro di fondo
const CORR = { x0: -0.62, x1: 0.78, p: 3.2, h: 2.45 };          // il corridoio buio, dietro
const OCCHIO = new THREE.Vector3(0.14, 1.66, 0.32);            // la maschera del medico, sulla porta
const MIRA = new THREE.Vector3(-0.06, 1.2, -3.2);
const FOV = 54, FOV_ESAME = { ps1: 17, creta: 9 };
const PADRE = { x: -0.66, z: -1.4 }, FIGLIA = { x: 0.08, z: -4.82 };
// il calore per l'infrarosso (0-1): il padre ha la febbre
const CALORE = { padre: 0.86, figlia: 0.55, tv: 0.34, frigo: 0.2, neon: 0.62, lampadina: 0.7 };

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

// ---------- le texture, dipinte qui: piccole e a pixel per il 1998, morbide e piu' grandi per la plastilina ----------
function tela(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

// macchie: a pixel (r e' il lato) o morbide (r e' il raggio), ripetute ai bordi perche' la texture si ripeta senza tagli
function macchie(g, w, h, n, colori, r, rnd, morbide = false, alfa = 1) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h, col = colori[Math.floor(rnd() * colori.length)];
    for (const [ox, oy] of [[0, 0], [-w, 0], [0, -h], [-w, -h]]) {
      if (morbide) {
        const s = r * (0.5 + rnd() * 0.8);
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, s);
        gr.addColorStop(0, col);
        gr.addColorStop(1, col + "00");
        g.globalAlpha = alfa;
        g.fillStyle = gr;
        g.fillRect(x + ox - s, y + oy - s, 2 * s, 2 * s);
        g.globalAlpha = 1;
      } else {
        g.fillStyle = col;
        g.fillRect(Math.floor(x + ox), Math.floor(y + oy), r, r);
      }
    }
  }
}

function fondo(g, w, h, col) {
  g.fillStyle = col;
  g.fillRect(0, 0, w, h);
}

const PITTURE = {
  // il linoleum verde a puntini della cucina
  pavimento(st) {
    const n = st === "ps1" ? 64 : 256, rnd = caso(11);
    const [c, g] = tela(n, n);
    fondo(g, n, n, st === "ps1" ? "#6b7246" : "#4a5730");
    if (st === "ps1") macchie(g, n, n, 430, ["#596035", "#7e8756", "#4b5130", "#8b9460", "#646b40"], 1, rnd);
    else {
      macchie(g, n, n, 60, ["#7a8352", "#5c6339"], 30, rnd, true, 0.7);
      macchie(g, n, n, 700, ["#535a33", "#879060", "#4a5030", "#9aa46e"], 2.6, rnd, true);
    }
    return c;
  },
  // l'intonaco chiaro, con qualche macchia di umidita'
  muro(st) {
    const n = st === "ps1" ? 64 : 256, rnd = caso(23);
    const [c, g] = tela(n, n);
    if (st === "ps1") {
      fondo(g, n, n, "#d3cab3");
      macchie(g, n, n, 220, ["#ccc3ab", "#d9d0bb", "#c8bfa6"], 1, rnd);
      macchie(g, n, n, 5, ["#bfb294"], 2, rnd);
    } else {
      fondo(g, n, n, "#9a8763");
      macchie(g, n, n, 50, ["#8d7a56", "#a8946e", "#7f6c4a"], 46, rnd, true, 0.65);
      macchie(g, n, n, 6, ["#5f5035"], 34, rnd, true, 0.45);
    }
    return c;
  },
  soffitto(st) {
    const n = st === "ps1" ? 32 : 128, rnd = caso(5);
    const [c, g] = tela(n, n);
    fondo(g, n, n, st === "ps1" ? "#ddd5c3" : "#a39a87");
    if (st === "ps1") macchie(g, n, n, 50, ["#d2c9b6", "#e3dccd"], 1, rnd);
    else macchie(g, n, n, 20, ["#968d7a", "#b0a793"], 20, rnd, true, 0.6);
    return c;
  },
  // l'anta di un mobile di legno chiaro, con la cornice e il pomello
  anta(st) {
    const w = st === "ps1" ? 32 : 128, h = st === "ps1" ? 48 : 192, rnd = caso(31), k = w / 32;
    const [c, g] = tela(w, h);
    fondo(g, w, h, st === "ps1" ? "#ccb68b" : "#c29a60");
    if (st === "ps1") {
      for (let i = 0; i < 14; i++) {
        g.fillStyle = rnd() < 0.5 ? "#bea67b" : "#d8c49b";
        g.fillRect(Math.floor(rnd() * w), 0, 1, h);
      }
      g.fillStyle = "#8f7a55";
      g.fillRect(0, 0, w, 1); g.fillRect(0, h - 1, w, 1); g.fillRect(0, 0, 1, h); g.fillRect(w - 1, 0, 1, h);
      g.fillStyle = "#a8926b";
      g.fillRect(3, 3, w - 6, 1); g.fillRect(3, h - 4, w - 6, 1); g.fillRect(3, 3, 1, h - 6); g.fillRect(w - 4, 3, 1, h - 6);
      g.fillStyle = "#4f4231";
      g.fillRect(w - 7, Math.floor(h / 2) - 1, 2, 3);
    } else {
      macchie(g, w, h, 30, ["#b38b52", "#d0aa70"], 16 * k, rnd, true, 0.7);
      g.strokeStyle = "#8a663a";
      g.lineWidth = 3 * k;
      g.beginPath(); g.roundRect(5 * k, 5 * k, w - 10 * k, h - 10 * k, 4 * k); g.stroke();
      g.fillStyle = "#5c4c38";
      g.beginPath(); g.arc(w - 6.5 * k, h / 2, 1.8 * k, 0, Math.PI * 2); g.fill();
    }
    return c;
  },
  // il piano di lavoro di laminato
  ripiano(st) {
    const n = st === "ps1" ? 32 : 128, rnd = caso(41);
    const [c, g] = tela(n, n);
    fondo(g, n, n, "#d8d2c1");
    if (st === "ps1") macchie(g, n, n, 90, ["#ccc5b2", "#e0dbcc", "#bfb8a5"], 1, rnd);
    else macchie(g, n, n, 400, ["#c8c1ad", "#e4dfd2"], 2, rnd, true);
    return c;
  },
  // il frigorifero bianco, con la maniglia
  frigo(st) {
    const w = st === "ps1" ? 32 : 128, h = st === "ps1" ? 64 : 256, k = w / 32, rnd = caso(51);
    const [c, g] = tela(w, h);
    fondo(g, w, h, "#e6e1d5");
    if (st === "creta") macchie(g, w, h, 20, ["#dcd6c8", "#efebe1"], 20 * k, rnd, true, 0.7);
    g.fillStyle = "#bdb7aa";
    g.fillRect(0, Math.round(22 * k), w, Math.max(1, Math.round(k)));
    g.fillStyle = "#8a867e";
    g.fillRect(Math.round(25 * k), Math.round(28 * k), Math.round(2 * k), Math.round(18 * k));
    g.fillRect(Math.round(25 * k), Math.round(8 * k), Math.round(2 * k), Math.round(10 * k));
    return c;
  },
  // la tovaglia cerata a rose, come nella cucina del prototipo
  tovaglia(st) {
    const n = st === "ps1" ? 64 : 256, k = n / 64, rnd = caso(61);
    const [c, g] = tela(n, n);
    fondo(g, n, n, "#efe1d7");
    g.fillStyle = "#dcbcc4";
    for (let i = 0; i < 4; i++) {
      g.fillRect(i * 16 * k, 0, Math.max(1, k * 0.8), n);
      g.fillRect(0, i * 16 * k, n, Math.max(1, k * 0.8));
    }
    for (const [x, y] of [[8, 8], [40, 10], [24, 40], [56, 42]]) {
      const cx = x * k, cy = y * k;
      g.fillStyle = "#5e8a46";
      g.fillRect(cx - 6 * k, cy + 2 * k, 4 * k, 2 * k);
      g.fillRect(cx + 3 * k, cy - 4 * k, 3 * k, 2 * k);
      if (st === "ps1") {
        g.fillStyle = "#b63a52"; g.fillRect(cx - 3, cy - 3, 6, 6);
        g.fillStyle = "#d9677b"; g.fillRect(cx - 2, cy - 2, 3, 3);
        g.fillStyle = "#7d2235"; g.fillRect(cx + 1, cy + 1, 2, 2);
      } else {
        for (const [r, col] of [[7.5, "#a8344b"], [5.5, "#c84c64"], [3.6, "#e07a8e"], [1.6, "#f2a8b4"]]) {
          g.fillStyle = col;
          g.beginPath(); g.arc(cx + rnd() * k, cy + rnd() * k, r * k, 0, Math.PI * 2); g.fill();
        }
      }
    }
    return c;
  },
  // il piatto bianco col bordo blu (sul tondo del cilindro)
  piatto(st) {
    const n = st === "ps1" ? 32 : 128, k = n / 32;
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
  // lo schermo del televisore spento
  schermo(st) {
    const n = st === "ps1" ? 32 : 128, k = n / 32;
    const [c, g] = tela(n, n);
    fondo(g, n, n, "#1e2622");
    g.fillStyle = "#33433b";
    g.fillRect(4 * k, 4 * k, 12 * k, 3 * k);
    g.fillRect(4 * k, 7 * k, 4 * k, 6 * k);
    return c;
  },
  // la porta del corridoio, aperta: pannelli e maniglia
  porta(st) {
    const w = st === "ps1" ? 32 : 128, h = st === "ps1" ? 64 : 256, k = w / 32, rnd = caso(71);
    const [c, g] = tela(w, h);
    fondo(g, w, h, "#e2d7bd");
    if (st === "creta") macchie(g, w, h, 18, ["#d6caae", "#ece4d0"], 18 * k, rnd, true, 0.7);
    g.strokeStyle = "#b9ad90";
    g.lineWidth = Math.max(1, k);
    g.strokeRect(5 * k + 0.5, 5 * k + 0.5, w - 10 * k, 24 * k);
    g.strokeRect(5 * k + 0.5, 34 * k + 0.5, w - 10 * k, 25 * k);
    g.fillStyle = "#8f8a80";
    g.fillRect(w - 6 * k, 31 * k, 4 * k, Math.max(1, k * 1.5));
    return c;
  },
  // il corridoio: muri piu' scuri e pavimento a piastrelle
  corridoio(st) {
    const n = st === "ps1" ? 32 : 128, rnd = caso(81);
    const [c, g] = tela(n, n);
    fondo(g, n, n, "#8d8470");
    if (st === "ps1") macchie(g, n, n, 60, ["#837a66", "#978e7a"], 1, rnd);
    else macchie(g, n, n, 20, ["#80776a", "#9a917c"], 18, rnd, true, 0.6);
    return c;
  },
  piastrelle(st) {
    const n = st === "ps1" ? 32 : 128, k = n / 32, rnd = caso(91);
    const [c, g] = tela(n, n);
    fondo(g, n, n, "#5a5244");
    g.fillStyle = "#463f33";
    g.fillRect(0, 0, n, Math.max(1, k)); g.fillRect(0, 0, Math.max(1, k), n);
    g.fillRect(0, n / 2, n, Math.max(1, k)); g.fillRect(n / 2, 0, Math.max(1, k), n);
    if (st === "creta") macchie(g, n, n, 14, ["#625a4b", "#504839"], 12 * k, rnd, true, 0.6);
    return c;
  },
};

// le impronte delle dita sulla plastilina: una mappa delle altezze (anelli d'impronta, strisciate di pollice, bozzi
// larghi) trasformata in mappa delle normali
function impronte() {
  const n = 512, rnd = caso(7);
  const [c, g] = tela(n, n);
  fondo(g, n, n, "#808080");
  macchie(g, n, n, 70, ["#a0a0a0", "#606060"], 55, rnd, true, 0.5);
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

// ---------- i materiali ----------
// il 1998: i vertici si agganciano alla griglia di uno schermo piccolo e tremano quando ci si muove
const SNAP = { value: new THREE.Vector2(170, 96) };
// la plastilina: il seme del "bollire", nuovo a ogni posa
const BOLLE = { value: 0 };
let IMPRONTE = null;
const RUMORE_GLSL = `
uniform float uBolle;
float hb(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float nb(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hb(i), hb(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hb(i + vec3(0.0, 1.0, 0.0)), hb(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(hb(i + vec3(0.0, 0.0, 1.0)), hb(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hb(i + vec3(0.0, 1.0, 1.0)), hb(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}`;

function materiale(st, o = {}) {
  if (st === "ps1") {
    const m = new THREE.MeshLambertMaterial({ map: o.map || null, color: o.color ?? 0xffffff, emissive: o.emissive ?? 0x000000,
      side: o.side ?? THREE.FrontSide, transparent: !!o.transparent, depthWrite: !o.transparent });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uSnap = SNAP;
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform vec2 uSnap;")
        .replace("#include <project_vertex>",
          "#include <project_vertex>\n  gl_Position.xy = floor(gl_Position.xy / gl_Position.w * uSnap + 0.5) / uSnap * gl_Position.w;");
    };
    return m;
  }
  const m = new THREE.MeshPhysicalMaterial({ map: o.map || null, color: o.color ?? 0xffffff, emissive: o.emissive ?? 0x000000,
    roughness: o.ruvido ?? 0.62, metalness: 0, sheen: 0.4, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xfff2e0),
    normalMap: o.normalMap === undefined ? IMPRONTE : o.normalMap, side: o.side ?? THREE.FrontSide, envMapIntensity: 0.15 });
  m.normalScale.setScalar(o.impronte ?? 0.9);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uBolle = BOLLE;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + RUMORE_GLSL)
      .replace("#include <project_vertex>", `#include <project_vertex>
  vec3 bollePos = (modelMatrix * vec4(transformed, 1.0)).xyz;
  mvPosition.xyz += normalize(transformedNormal) * (nb(bollePos * 11.0 + uBolle) - 0.5) * 0.0026;
  gl_Position = projectionMatrix * mvPosition;`);
  };
  return m;
}

function texture(st, nome, ripeti = [1, 1]) {
  const t = new THREE.CanvasTexture(PITTURE[nome](st));
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(ripeti[0], ripeti[1]);
  if (st === "ps1") {
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
  } else t.anisotropy = 4;
  return t;
}

// ---------- la geometria ----------
// una scatola: semplice nel 1998; nella plastilina con gli spigoli tondi (la normale va dal centro dell'angolo) e
// qualche bozzo, come modellata a mano
function scatola(st, w, h, d, r = 0.025, bozzi = 0.0035, seme = 0) {
  if (st === "ps1") return new THREE.BoxGeometry(w, h, d);
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

// un piano (muro, pavimento): nel 1998 diviso in pezzi grandi, che tremano; nella plastilina un po' ondulato
function piano(st, w, h, seme = 0) {
  w += 0.04;
  h += 0.04;
  const sx = st === "ps1" ? Math.max(1, Math.round(w / 0.55)) : Math.max(4, Math.round(w * 10));
  const sy = st === "ps1" ? Math.max(1, Math.round(h / 0.55)) : Math.max(4, Math.round(h * 10));
  const geo = new THREE.PlaneGeometry(w, h, sx, sy);
  if (st === "creta") {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, rumore3(pos.getX(i) * 1.7 + seme, pos.getY(i) * 1.7, seme) * 0.008);
    geo.computeVertexNormals();
  }
  return geo;
}

// un muro con il vano di una porta che arriva a terra: un poligono solo, senza fessure tra i pezzi (le coordinate
// della texture sono in metri)
function muroVano(w, h, x0, x1, hv) {
  const f = new THREE.Shape();
  f.moveTo(-w / 2, 0);
  for (const [x, y] of [[x0, 0], [x0, hv], [x1, hv], [x1, 0], [w / 2, 0], [w / 2, h], [-w / 2, h]]) f.lineTo(x, y);
  f.closePath();
  return new THREE.ShapeGeometry(f);
}

// ---------- la cucina ----------
// Restituisce il gruppo con la stanza, le luci e i punti che servono (dove mettere i personaggi)
function cucina(st) {
  const g = new THREE.Group();
  const mesh = (geo, mat, x, y, z, ry = 0, calore = 0.05) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.userData.calore = calore;
    if (st === "creta") { m.castShadow = true; m.receiveShadow = true; }
    g.add(m);
    return m;
  };
  const tx = (nome, r) => texture(st, nome, r);
  const mat = (o) => materiale(st, o);
  const ripetiMuro = (w, h) => mat({ map: tx("muro", [w / 1.5, h / 1.5]), impronte: 1.6 });

  // pavimento e soffitto
  const pav = mesh(piano(st, L, P, 1), mat({ map: tx("pavimento", [L / 1.1, P / 1.1]) }), 0, 0, -P / 2);
  pav.rotation.x = -Math.PI / 2;
  const sof = mesh(piano(st, L, P, 2), mat({ map: tx("soffitto", [L / 1.4, P / 1.4]) }), 0, A, -P / 2);
  sof.rotation.x = Math.PI / 2;
  // i muri: sinistra, destra, il fondo col vano della porta, e quello della porta da cui si entra
  mesh(piano(st, P, A, 3), ripetiMuro(P, A), -L / 2, A / 2, -P / 2, Math.PI / 2);
  mesh(piano(st, P, A, 4), ripetiMuro(P, A), L / 2, A / 2, -P / 2, -Math.PI / 2);
  const muroM = () => mat({ map: tx("muro", [1 / 1.5, 1 / 1.5]), impronte: 1.6 });
  mesh(muroVano(L, A, VANO.x0, VANO.x1, VANO.h), muroM(), 0, 0, -P);
  mesh(muroVano(L, A, -0.7, 0.42, 2.06), muroM(), 0, 0, 0, Math.PI);
  // gli stipiti delle due porte
  const stipiteM = mat({ color: 0xece6d6 });
  for (const [x, z] of [[VANO.x0 - 0.035, -P + 0.02], [VANO.x1 + 0.035, -P + 0.02]]) mesh(scatola(st, 0.07, VANO.h + 0.05, 0.06), stipiteM, x, (VANO.h + 0.05) / 2, z);
  mesh(scatola(st, VANO.x1 - VANO.x0 + 0.14, 0.07, 0.06), stipiteM, (VANO.x0 + VANO.x1) / 2, VANO.h + 0.035, -P + 0.02);
  for (const x of [-0.46, 0.74]) mesh(scatola(st, 0.08, 2.08, 0.07), stipiteM, x, 1.04, -0.03);

  // il corridoio buio dietro la porta, con la porta chiusa in fondo
  const cw = CORR.x1 - CORR.x0, cx = (CORR.x0 + CORR.x1) / 2, cz = -P - CORR.p / 2;
  const corrM = (w, h) => mat({ map: tx("corridoio", [w / 1.2, h / 1.2]) });
  const cp = mesh(piano(st, cw, CORR.p, 11), mat({ map: tx("piastrelle", [cw / 0.6, CORR.p / 0.6]) }), cx, 0, cz);
  cp.rotation.x = -Math.PI / 2;
  const cs = mesh(piano(st, cw, CORR.p, 12), corrM(cw, CORR.p), cx, CORR.h, cz);
  cs.rotation.x = Math.PI / 2;
  mesh(piano(st, CORR.p, CORR.h, 13), corrM(CORR.p, CORR.h), CORR.x0, CORR.h / 2, cz, Math.PI / 2);
  mesh(piano(st, CORR.p, CORR.h, 14), corrM(CORR.p, CORR.h), CORR.x1, CORR.h / 2, cz, -Math.PI / 2);
  mesh(piano(st, cw, CORR.h, 15), corrM(cw, CORR.h), cx, CORR.h / 2, -P - CORR.p);
  mesh(scatola(st, 0.78, 2.0, 0.05), mat({ map: tx("porta") }), cx + 0.1, 1.0, -P - CORR.p + 0.04);
  // l'architrave tra cucina e corridoio, sopra il vano (lo spessore del muro)
  mesh(scatola(st, VANO.x1 - VANO.x0, A - VANO.h, 0.2), ripetiMuro(1, 0.4), (VANO.x0 + VANO.x1) / 2, (A + VANO.h) / 2, -P - 0.1);
  // la porta del corridoio, aperta verso la cucina (cardine a sinistra)
  const anta = new THREE.Group();
  anta.position.set(VANO.x0 + 0.01, 0, -P + 0.03);
  anta.rotation.y = -1.3;
  g.add(anta);
  const portaM = mat({ map: tx("porta") });
  const ap = new THREE.Mesh(scatola(st, VANO.x1 - VANO.x0 - 0.02, 2.04, 0.04), portaM);
  ap.position.set((VANO.x1 - VANO.x0) / 2, 1.02, 0);
  if (st === "creta") { ap.castShadow = true; ap.receiveShadow = true; }
  ap.userData.calore = 0.05;
  anta.add(ap);

  // i mobili a sinistra: le basi col ripiano e il lavello, i pensili sopra
  const anteM = mat({ map: tx("anta") }), fiancoM = mat({ color: 0xbca883 }), ripM = mat({ map: tx("ripiano", [2, 0.5]) });
  const metallo = mat({ color: 0xa9aaa4, ruvido: 0.35 });
  for (let i = 0; i < 4; i++) {
    const z = -0.95 - i * 0.6 - 0.3;
    // le facce della scatola: +x (l'anta), -x, +y, -y, +z, -z
    mesh(scatola(st, 0.6, 0.86, 0.58, 0.02, 0.003, i), [anteM, fiancoM, fiancoM, fiancoM, fiancoM, fiancoM], -L / 2 + 0.3, 0.43, z);
    mesh(scatola(st, 0.34, 0.7, 0.58, 0.02, 0.003, i + 9), [anteM, fiancoM, fiancoM, fiancoM, fiancoM, fiancoM], -L / 2 + 0.17, 1.85, z);
  }
  mesh(scatola(st, 0.64, 0.045, 2.42, 0.012, 0.002), ripM, -L / 2 + 0.32, 0.882, -0.95 - 1.2);
  mesh(scatola(st, 0.4, 0.03, 0.46, 0.04, 0.001), mat({ color: 0x8e908b, ruvido: 0.3 }), -L / 2 + 0.33, 0.9, -2.2);
  const rub = mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.24, st === "ps1" ? 5 : 12), metallo, -L / 2 + 0.1, 1.02, -2.2);
  const bocca = mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.16, st === "ps1" ? 5 : 12), metallo, -L / 2 + 0.17, 1.13, -2.2);
  bocca.rotation.z = Math.PI / 2;
  void rub;
  // il frigorifero, vicino alla porta da cui si entra
  mesh(scatola(st, 0.64, 1.74, 0.62, 0.05, 0.003, 3), [mat({ map: tx("frigo") }), fiancoM, mat({ color: 0xe6e1d5 }), fiancoM,
    mat({ color: 0xdcd6c9 }), mat({ color: 0xdcd6c9 })], -L / 2 + 0.33, 0.87, -0.5, 0, CALORE.frigo);

  // il tavolo con la tovaglia cerata, i quattro piatti, e le sedie di plastica verde
  const tavolo = { x: 0.95, z: -2.35, w: 0.84, d: 1.36 };
  const tovM = mat({ map: tx("tovaglia", [(tavolo.w + 0.06) / 0.62, (tavolo.d + 0.06) / 0.62]) });
  mesh(scatola(st, tavolo.w + 0.06, 0.03, tavolo.d + 0.06, 0.012, 0.002), tovM, tavolo.x, 0.765, tavolo.z);
  // la tovaglia che pende dai lati
  const lembo = (l) => mat({ map: tx("tovaglia", [l / 0.62, 0.16 / 0.62]) });
  const lunghi = lembo(tavolo.d + 0.06), corti = lembo(tavolo.w + 0.06);
  for (const [dx, dz, w, d, m] of [[0, tavolo.d / 2 + 0.03, tavolo.w + 0.06, 0.012, corti], [0, -tavolo.d / 2 - 0.03, tavolo.w + 0.06, 0.012, corti],
    [tavolo.w / 2 + 0.03, 0, 0.012, tavolo.d + 0.06, lunghi], [-tavolo.w / 2 - 0.03, 0, 0.012, tavolo.d + 0.06, lunghi]])
    mesh(scatola(st, w, 0.16, d, 0.004, 0.002), m, tavolo.x + dx, 0.69, tavolo.z + dz);
  const gambaM = mat({ color: 0x6d6a63, ruvido: 0.4 });
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
    mesh(scatola(st, 0.04, 0.74, 0.04, 0.01, 0.001), gambaM, tavolo.x + dx * (tavolo.w / 2 - 0.06), 0.37, tavolo.z + dz * (tavolo.d / 2 - 0.08));
  const piattoM = mat({ map: tx("piatto") }), bordoM = mat({ color: 0xf2f1ec });
  const posate = mat({ color: 0xb8b9b4, ruvido: 0.3 });
  for (const [dx, dz] of [[-0.2, -0.36], [0.2, -0.36], [-0.2, 0.36], [0.2, 0.36]]) {
    const pg = new THREE.CylinderGeometry(0.115, 0.085, 0.018, st === "ps1" ? 10 : 36);
    mesh(pg, [bordoM, piattoM, bordoM], tavolo.x + dx, 0.79, tavolo.z + dz);
    mesh(scatola(st, 0.014, 0.006, 0.17, 0.003, 0.0005), posate, tavolo.x + dx + (dx < 0 ? -0.15 : 0.15), 0.785, tavolo.z + dz);
  }
  const verdeM = mat({ color: 0x2f7d50, ruvido: 0.45 });
  const sedia = (x, z, ry) => {
    const s = new THREE.Group();
    s.position.set(x, 0, z);
    s.rotation.y = ry;
    const pezzo = (geo, px, py, pz, rx = 0) => {
      const m = new THREE.Mesh(geo, verdeM);
      m.position.set(px, py, pz);
      m.rotation.x = rx;
      m.userData.calore = 0.05;
      if (st === "creta") { m.castShadow = true; m.receiveShadow = true; }
      s.add(m);
    };
    pezzo(scatola(st, 0.46, 0.04, 0.44, 0.015, 0.002), 0, 0.44, 0);
    pezzo(scatola(st, 0.46, 0.42, 0.04, 0.02, 0.002), 0, 0.68, -0.21, -0.12);
    for (const [lx, lz] of [[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]]) pezzo(scatola(st, 0.045, 0.44, 0.045, 0.012, 0.001), lx, 0.22, lz);
    for (const lx of [-0.24, 0.24]) pezzo(scatola(st, 0.03, 0.05, 0.4, 0.012, 0.001), lx, 0.6, 0);
    g.add(s);
  };
  sedia(tavolo.x, tavolo.z - tavolo.d / 2 - 0.3, 0);
  sedia(tavolo.x + 0.02, tavolo.z + tavolo.d / 2 + 0.36, Math.PI + 0.25);

  // in fondo a destra il mobiletto col televisore vecchio
  mesh(scatola(st, 0.56, 0.62, 0.44, 0.02, 0.003, 4), [fiancoM, fiancoM, fiancoM, fiancoM, anteM, fiancoM], 1.3, 0.31, -P + 0.25);
  const tvM = mat({ color: 0xa3a39b, ruvido: 0.4 });
  mesh(scatola(st, 0.5, 0.4, 0.42, 0.04, 0.002, 5), [tvM, tvM, tvM, tvM, mat({ map: tx("schermo"), ruvido: 0.2 }), tvM], 1.3, 0.82, -P + 0.25, 0, CALORE.tv);
  // l'interruttore accanto alla porta
  mesh(scatola(st, 0.08, 0.08, 0.02, 0.01, 0), mat({ color: 0xf0ede4 }), 0.66, 1.12, -P + 0.01);

  // il neon sul soffitto, a destra
  mesh(scatola(st, 0.12, 0.05, 1.24, 0.02, 0.001), mat({ color: 0xd9d6cf }), 1.02, A - 0.03, -1.75);
  mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.16, st === "ps1" ? 5 : 16), mat({ color: 0xffffff, emissive: 0xf4f6ee }),
    1.02, A - 0.075, -1.75, 0, CALORE.neon).rotation.x = Math.PI / 2;
  // nel corridoio, una lampadina nuda
  mesh(new THREE.SphereGeometry(0.04, st === "ps1" ? 6 : 16, st === "ps1" ? 4 : 12), mat({ color: 0xffffff, emissive: 0xffd9a0 }),
    cx, CORR.h - 0.18, -P - 1.6, 0, CALORE.lampadina);

  // le luci
  if (st === "ps1") {
    g.add(new THREE.AmbientLight(0xfff1dc, 0.6));
    const neon = new THREE.PointLight(0xf1f5ff, 4.2, 0, 1.4);
    neon.position.set(1.0, A - 0.25, -1.8);
    g.add(neon);
    const faro = new THREE.SpotLight(0xffe2bd, 3, 0, 0.6, 1, 1.2);
    faro.position.copy(OCCHIO).add(new THREE.Vector3(0.05, 0.08, 0));
    faro.target.position.copy(FARO_MIRA.ps1);
    faro.userData.forza = 3;
    g.userData.faro = faro;
    g.add(faro, faro.target);
    const lamp = new THREE.PointLight(0xffcf8f, 1.6, 0, 1.6);
    lamp.position.set(cx, CORR.h - 0.3, -P - 1.6);
    g.add(lamp);
  } else {
    // buio: le tapparelle sono giu' e il neon e' quasi morto (ogni tanto sfarfalla); la luce vera e' la lampada della
    // videocamera, dalla porta, che fa le ombre dietro le persone
    g.add(new THREE.HemisphereLight(0xc9d4e0, 0x1a1712, 0.05));
    const neon = new THREE.SpotLight(0xcfe8d8, 3, 0, 1.25, 0.9, 1.6);
    neon.position.set(1.0, A - 0.12, -1.8);
    neon.target.position.set(0.1, 0, -2.2);
    neon.castShadow = true;
    neon.shadow.mapSize.set(1024, 1024);
    neon.shadow.bias = -0.0004;
    neon.shadow.normalBias = 0.02;
    neon.shadow.radius = 6;
    neon.userData.forza = 3;
    g.userData.neon = neon;
    g.add(neon, neon.target);
    const faro = new THREE.SpotLight(0xffe6c4, 9.5, 0, 0.49, 0.75, 1.3);
    faro.position.copy(OCCHIO).add(new THREE.Vector3(0.05, 0.08, 0));
    faro.target.position.copy(FARO_MIRA.creta);
    faro.castShadow = true;
    faro.shadow.mapSize.set(1024, 1024);
    faro.shadow.bias = -0.0005;
    faro.shadow.normalBias = 0.02;
    faro.shadow.radius = 4;
    faro.userData.forza = 9.5;
    g.userData.faro = faro;
    g.add(faro, faro.target);
    // in fondo al corridoio una lampadina debole: la figlia quasi non si vede
    const lamp = new THREE.PointLight(0xffb870, 0.7, 0, 1.8);
    lamp.position.set(cx, CORR.h - 0.3, -P - 1.6);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(512, 512);
    lamp.shadow.bias = -0.001;
    g.add(lamp);
  }
  return g;
}

// ---------- i personaggi ----------
const DECODER = THREE.MeshoptDecoder.supported
  ? THREE.MeshoptDecoder.ready.then(() => THREE.MeshoptDecoder, () => THREE.MeshoptDecoderJS)
  : Promise.resolve(THREE.MeshoptDecoderJS);
const MODELLI = {};

// i modelli sono glTF in un .json con la geometria compressa dentro in base64 (gli Artifact non servono i .glb): si
// rimette insieme un GLB in memoria, come fa la stanza del gioco (gioco/js/stanza.js)
async function modello(nome) {
  if (MODELLI[nome]) return MODELLI[nome];
  const risposta = await fetch(`modelli/${nome}.json`);
  if (!risposta.ok) throw new Error(`${nome}: ${risposta.status}`);
  const j = await risposta.json();
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
  MODELLI[nome] = await loader.parseAsync(glb.buffer, "modelli/");
  return MODELLI[nome];
}

// un personaggio nello stile: i materiali rifatti (texture piccola e netta, o plastilina) e la posa. L'animazione
// d'attesa di Meshy non serve: si guarda attorno, e gia' il primo fotogramma ha il bacino girato e le gambe incrociate,
// che torcono la giacca. Si parte dalla posa del modello (a braccia aperte) e vivo() abbassa le braccia, piega la
// schiena e fa il resto (il respiro, il tremito della febbre, le occhiate), con lo sguardo sempre verso il medico
async function personaggio(st, chi, x, z) {
  const gltf = await modello(`${chi}_${st}`);
  const radice = gltf.scene;
  radice.position.set(x, 0, z);
  // guarda verso la videocamera (i modelli guardano verso +z)
  radice.rotation.y = Math.atan2(OCCHIO.x - x, OCCHIO.z - z);
  radice.traverse((o) => {
    if (!o.isMesh) return;
    o.userData.calore = CALORE[chi];
    o.userData.chi = chi;
    o.frustumCulled = false;
    const vecchio = o.userData.originale || o.material;
    o.userData.originale = vecchio;
    const map = vecchio.map;
    if (st === "ps1") {
      if (map) {
        map.magFilter = THREE.NearestFilter;
        map.minFilter = THREE.NearestFilter;
        map.generateMipmaps = false;
        map.needsUpdate = true;
      }
      o.material = materiale(st, { map });
    } else {
      o.material = materiale(st, { map, normalMap: vecchio.normalMap || IMPRONTE, impronte: vecchio.normalMap ? 1 : 0.3, ruvido: 0.58 });
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  // per ogni osso: la posa di partenza e com'e' girato il suo genitore, visto dal personaggio
  radice.updateMatrixWorld(true);
  const ossa = {};
  radice.traverse((o) => { if (o.isBone) ossa[o.name] = o; });
  if (!radice.userData.posa) {
    radice.userData.posa = Object.fromEntries(Object.entries(ossa).map(([n, b]) => [n, b.quaternion.clone()]));
  }
  for (const [n, q] of Object.entries(radice.userData.posa)) ossa[n].quaternion.copy(q);
  radice.updateMatrixWorld(true);
  const qr = radice.getWorldQuaternion(new THREE.Quaternion()).invert();
  const guida = {};
  for (const [nome, b] of Object.entries(ossa)) {
    const qp = qr.clone().multiply(b.parent.getWorldQuaternion(new THREE.Quaternion()));
    guida[nome] = { b, base: b.quaternion.clone(), qp, qpi: qp.clone().invert() };
  }
  // la posa: le braccia e gli avambracci puntati dove servono. Nel modello le braccia sono aperte e un po' indietro:
  // girarle di un angolo fisso le manda dietro la schiena, quindi si calcola la rotazione che le porta nella direzione voluta
  const posa = {};
  const punta = (osso, figlio, verso, prima) => {
    const a = ossa[osso], b = ossa[figlio];
    if (!a || !b) return;
    const ora = b.getWorldPosition(new THREE.Vector3()).sub(a.getWorldPosition(new THREE.Vector3())).applyQuaternion(qr).normalize();
    const voluto = verso.clone().normalize();
    if (prima) voluto.applyQuaternion(prima.clone().invert());
    posa[osso] = new THREE.Quaternion().setFromUnitVectors(ora, voluto);
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  for (const [lato, k] of [["Left", 1], ["Right", -1]]) {
    const [braccio, avambraccio] = BRACCIA[chi];
    punta(`${lato}Arm`, `${lato}ForeArm`, V(braccio[0] * k, braccio[1], braccio[2]));
    punta(`${lato}ForeArm`, `${lato}Hand`, V(avambraccio[0] * k, avambraccio[1], avambraccio[2]), posa[`${lato}Arm`]);
  }
  return { radice, chi, guida, posa, collo: ossa.neck || ossa.Head, testa: ossa.Head };
}
// dove puntano braccio e avambraccio sinistro (il destro e' allo specchio): il padre le lascia pendere, le mani un po'
// in avanti; la figlia tiene le mani davanti alla pancia, una nell'altra
const BRACCIA = {
  padre: [[0.15, -1, 0.08], [0.06, -1, 0.32]],
  figlia: [[0.1, -1, 0.1], [-0.55, -0.45, 0.75]],
};

// girare un osso di qualche grado attorno agli assi del personaggio (x: annuire o piegarsi in avanti, y: voltarsi,
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

// la vita dei personaggi: il padre respira in fretta (ha la febbre) e gli tremano le mani; la figlia respira piano e
// ogni tanto guarda il padre, di nascosto
function vivo(p, t) {
  if (p.chi === "padre") {
    const r = onda(t, 0.48);
    // curvo, la testa in avanti che guarda in su, le braccia lungo i fianchi
    gira(p, "Hips", 0, vaga(t, 0.08, 17) * 1.5, 0);
    gira(p, "Spine01", 4 - 1.8 * r, vaga(t, 0.15, 3) * 1.5, 0);
    gira(p, "Spine02", 5 - 1.3 * r, 0, 0);
    gira(p, "LeftShoulder", 0, 0, 1.4 * r);
    gira(p, "RightShoulder", 0, 0, -1.4 * r);
    gira(p, "LeftArm", 0, 0, 0);
    gira(p, "RightArm", 0, 0, 0);
    gira(p, "LeftForeArm", 0, 0, 0);
    gira(p, "RightForeArm", 0, 0, 0);
    gira(p, "neck", 10 + vaga(t, 0.2, 7) * 3, vaga(t, 0.13, 9) * 4, 0);
    gira(p, "Head", -8 + vaga(t, 0.25, 11) * 2, vaga(t, 0.17, 13) * 3, vaga(t, 0.1, 5) * 3);
    gira(p, "LeftHand", vaga(t, 7, 1) * 3, 0, vaga(t, 6, 2) * 3);
    gira(p, "RightHand", vaga(t, 7, 3) * 3, 0, vaga(t, 6, 4) * 3);
  } else {
    const r = onda(t, 0.27);
    const occhiata = liscio(0.6, 0.85, onda(t, 1 / 7.5) * 0.5 + 0.5);
    // le spalle su, la testa bassa: guarda da sotto in su
    gira(p, "Spine01", 2 - 1.0 * r, 0, 0);
    gira(p, "Spine02", 2 - 0.8 * r, -5 * occhiata, 0);
    gira(p, "LeftShoulder", 0, 0, 3 + 0.9 * r);
    gira(p, "RightShoulder", 0, 0, -3 - 0.9 * r);
    gira(p, "LeftArm", 0, 0, 0);
    gira(p, "RightArm", 0, 0, 0);
    gira(p, "LeftForeArm", 0, 0, 0);
    gira(p, "RightForeArm", 0, 0, 0);
    gira(p, "neck", 6 + vaga(t, 0.2, 21) * 2, -10 * occhiata + vaga(t, 0.15, 25) * 2, 0);
    gira(p, "Head", 4 + vaga(t, 0.3, 23) * 2, -12 * occhiata, 4 * occhiata);
  }
}

// il bubbone sul collo del padre, sotto la mascella sul suo lato sinistro (a destra per chi guarda), attaccato
// all'osso del collo: si muove con lui
function bubbone(st, p) {
  const geo = st === "ps1" ? new THREE.IcosahedronGeometry(0.031, 0) : new THREE.SphereGeometry(0.031, 28, 20);
  if (st === "creta") {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const k = 1 + rumore3(x * 60, y * 60, z * 60) * 0.12;
      pos.setXYZ(i, x * k, y * k, z * k);
    }
    geo.computeVertexNormals();
  }
  // gonfio, lucido, viola scuro e rosso, la pelle tesa
  const m = new THREE.Mesh(geo, materiale(st, { color: st === "ps1" ? 0x7c2a42 : 0x6c2236, emissive: 0x140306, ruvido: 0.22, impronte: 0.1 }));
  m.userData.calore = 0.95;
  m.userData.chi = "padre";
  if (st === "creta") m.castShadow = true;
  // dove: sul lato sinistro del collo (a destra per chi guarda), sotto l'orecchio, dietro l'angolo della mascella: dalla
  // porta la testa curva del padre copre la gola, il lato invece si vede. Il punto della pelle lo trova un raggio che
  // arriva di lato
  p.radice.updateMatrixWorld(true);
  const testa = new THREE.Vector3();
  p.testa.getWorldPosition(testa);
  const avanti = new THREE.Vector3(Math.sin(p.radice.rotation.y), 0, Math.cos(p.radice.rotation.y));
  const sinistra = new THREE.Vector3(avanti.z, 0, -avanti.x);
  const mira = testa.clone().addScaledVector(avanti, 0.01);
  mira.y -= 0.02;
  const corpo = [];
  p.radice.traverse((o) => { if (o.isMesh && o !== m) corpo.push(o); });
  const colpo = new THREE.Raycaster(mira.clone().addScaledVector(sinistra, 0.35), sinistra.clone().negate(), 0, 0.35)
    .intersectObjects(corpo, false)[0];
  const qui = colpo ? colpo.point.addScaledVector(sinistra, -0.004) : mira.addScaledVector(sinistra, 0.05);
  const scala = new THREE.Vector3();
  p.collo.getWorldScale(scala);
  p.collo.worldToLocal(qui);
  m.position.copy(qui);
  m.scale.set(1.1, 0.95, 0.85).divideScalar(scala.x);
  p.collo.add(m);
  return m;
}


// l'ombra a disco sotto i piedi, del 1998
function ombraDisco(x, z, r) {
  const [c, g] = tela(32, 32);
  const gr = g.createRadialGradient(16, 16, 2, 16, 16, 16);
  gr.addColorStop(0, "rgba(0,0,0,0.75)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 10), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.004, z);
  m.userData.calore = 0;
  return m;
}

// ---------- il disegno ----------
// niente VHS (deciso il 27 ottobre: con questi stili non c'e' niente da nascondere): Three.js disegna sullo schermo
const renderer = new THREE.WebGLRenderer({ canvas: schermo, antialias: true, alpha: false });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
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

// il 1998: la scena in un quadro piccolo, poi il retino a 15 bit di colore; sullo schermo si ingrandisce a pixel
const BASSA = { w: 384, h: 216 };
const rtBassa = new THREE.WebGLRenderTarget(BASSA.w, BASSA.h, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const scenaRetino = quadro(`
  uniform sampler2D tScena;
  varying vec2 vUv;
  const float B[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  void main() {
    vec3 c = srgb(clamp(texture2D(tScena, vUv).rgb, 0.0, 1.0));
    ivec2 p = ivec2(mod(gl_FragCoord.xy, 4.0));
    float d = B[p.x + p.y * 4] / 16.0 - 0.47;
    c = floor(c * 31.0 + 0.5 + d) / 31.0;
    gl_FragColor = vec4(c, 1.0);
  }`, { tScena: { value: rtBassa.texture } });

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

let stile = null, scena = null, persone = {}, bub = null;
let ir = false;

function misura(st) {
  let w, h;
  if (st === "ps1") {
    [w, h] = [BASSA.w, BASSA.h];
    schermo.classList.remove("liscio");
  } else {
    w = Math.min(1600, Math.max(640, Math.round(palco.clientWidth * Math.min(2, window.devicePixelRatio || 1))));
    h = Math.round(w * 9 / 16);
    schermo.classList.add("liscio");
  }
  renderer.setSize(w, h, false);
  rtScena.setSize(w, h);
  rtCalore.setSize(Math.max(64, Math.round(w / 3)), Math.max(36, Math.round(h / 3)));
  passoCalore.value.set(1 / rtCalore.width, 1 / rtCalore.height);
}
if (window.ResizeObserver) new ResizeObserver(() => { if (stile === "creta") misura(stile); }).observe(palco);

function libera(o) {
  o.traverse((x) => {
    if (x.userData.chi) return; // i personaggi restano in memoria, per tornare allo stile in fretta
    x.geometry?.dispose();
    for (const m of [].concat(x.material || [])) {
      for (const k of ["map", "normalMap"]) if (m[k] && m[k] !== IMPRONTE) m[k].dispose();
      m.dispose();
    }
  });
}

async function scegli(st) {
  if (st === stile) return;
  stile = st;
  for (const b of document.querySelectorAll("[id^=stile-]")) b.setAttribute("aria-pressed", String(b.id === `stile-${st}`));
  attesa.hidden = false;
  esci(true);
  if (bub) bub.parent?.remove(bub);
  if (scena) libera(scena);
  if (st === "creta" && !IMPRONTE) IMPRONTE = impronte();
  const nuova = new THREE.Scene();
  const stanza = cucina(st);
  nuova.add(stanza);
  faro = stanza.userData.faro;
  neon = stanza.userData.neon || null;
  const [padre, figlia] = await Promise.all([personaggio(st, "padre", PADRE.x, PADRE.z), personaggio(st, "figlia", FIGLIA.x, FIGLIA.z)]);
  if (stile !== st) return;
  nuova.add(padre.radice, figlia.radice);
  bub = bubbone(st, padre);
  if (st === "ps1") {
    nuova.fog = new THREE.Fog(0x0d0a07, 4.2, 10.5);
    nuova.add(ombraDisco(PADRE.x, PADRE.z, 0.32), ombraDisco(FIGLIA.x, FIGLIA.z, 0.28));
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.NoToneMapping;
  } else {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    nuova.fog = new THREE.Fog(0x060504, 4, 12);
  }
  nuova.environment = null;
  nuova.background = new THREE.Color(0x000000);
  scena = nuova;
  persone = { padre, figlia };
  misura(st);
  attesa.hidden = true;
  parla([["Dottore."], ["Qui stiamo tutti bene. Faccia in fretta."]]);
}

// ---------- la testa e lo zoom della videocamera ----------
const SU = new THREE.Vector3(0, 1, 0);
const testa = { x: 0, y: 0, tx: 0, ty: 0 };
let zoom = 0, zoomVerso = 0;
const dove = new THREE.Vector3(), base = new THREE.Vector3(), destra = new THREE.Vector3(), bersaglio = new THREE.Vector3();
// dove punta la lampada della videocamera: nella plastilina sul padre, che e' quasi l'unica cosa illuminata
const FARO_MIRA = { ps1: new THREE.Vector3(-0.3, 1.2, -3), creta: new THREE.Vector3(-0.5, 1.25, -2.3) };
let faro = null, neon = null;
const SCARTO_FARO = new THREE.Vector3(0.05, 0.08, 0), luce = new THREE.Vector3(), lato = new THREE.Vector3();

function inquadra(dt, t) {
  testa.x += (testa.tx - testa.x) * Math.min(1, dt * 4);
  testa.y += (testa.ty - testa.y) * Math.min(1, dt * 4);
  zoom += Math.sign(zoomVerso - zoom) * Math.min(Math.abs(zoomVerso - zoom), dt / 0.9);
  const z = zoom * zoom * (3 - 2 * zoom);
  // la maschera non sta mai ferma: un respiro e un tremito leggero
  const respiro = new THREE.Vector3(Math.sin(t * 0.7) * 0.004, Math.sin(t * 1.3) * 0.006, 0);
  camera.position.copy(OCCHIO).add(respiro);
  const volta = -testa.x * 0.2 * (1 - z), china = -testa.y * 0.11 * (1 - z);
  base.subVectors(MIRA, OCCHIO).normalize();
  base.applyAxisAngle(SU, volta);
  destra.crossVectors(base, SU).normalize();
  base.applyAxisAngle(destra, china);
  bersaglio.copy(camera.position).addScaledVector(base, 3);
  if (bub && z > 0) {
    bub.getWorldPosition(dove);
    bersaglio.lerp(dove, z);
  }
  camera.fov = FOV + (FOV_ESAME[stile] - FOV) * z;
  if (faro) {
    faro.intensity = faro.userData.forza * (1 + (stile === "ps1" ? 3 : 0.6) * z);
    // la lampada sta sulla maschera: si sposta e si gira con la testa (nell'esame va sul bubbone)
    faro.position.copy(camera.position).add(SCARTO_FARO);
    luce.subVectors(FARO_MIRA[stile], OCCHIO).applyAxisAngle(SU, volta);
    lato.crossVectors(luce, SU).normalize();
    luce.applyAxisAngle(lato, china).add(camera.position);
    faro.target.position.lerpVectors(luce, bersaglio, z);
  }
  camera.updateProjectionMatrix();
  camera.lookAt(bersaglio);
}

// ---------- le frasi accanto a chi parla ----------
let turnoFrase = 0;
async function parla(righe) {
  const turno = ++turnoFrase;
  for (const [testo] of righe) {
    frase.style.opacity = "1";
    for (let i = 1; i <= testo.length; i++) {
      if (turno !== turnoFrase) return;
      frase.textContent = testo.slice(0, i);
      await new Promise((r) => setTimeout(r, 38));
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  if (turno === turnoFrase) frase.style.opacity = "0";
}

const proietta = new THREE.Vector3();
function mettiFrase() {
  const p = persone.padre;
  if (!p?.testa || zoom > 0.05) { frase.style.visibility = "hidden"; return; }
  frase.style.visibility = "visible";
  p.testa.getWorldPosition(proietta);
  proietta.y += 0.12;
  proietta.project(camera);
  frase.style.left = `${(proietta.x * 0.5 + 0.5) * 100 + 6}%`;
  frase.style.top = `${(-proietta.y * 0.5 + 0.5) * 100 - 4}%`;
}

// ---------- il tempo: la plastilina a scatti ----------
// nella plastilina il mondo cambia posa 12 volte al secondo, e a ogni posa la superficie "bolle" un poco
const POSE = 12;
let tempo = 0, ultimaPosa = -1;
function anima(dt) {
  tempo += dt;
  let t = tempo;
  if (stile === "creta") {
    const n = Math.floor(tempo * POSE);
    t = n / POSE;
    if (n !== ultimaPosa) {
      ultimaPosa = n;
      BOLLE.value = Math.random() * 50;
      if (neon) neon.intensity = neon.userData.forza * (Math.random() < 0.07 ? 0.1 + Math.random() * 0.3 : 1);
    }
  }
  for (const p of Object.values(persone)) vivo(p, t);
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
  const fog = scena.fog, tm = renderer.toneMapping, ombre = renderer.shadowMap.enabled;
  scena.fog = null;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = false;
  renderer.setRenderTarget(rtCalore);
  renderer.render(scena, camera);
  for (const [o, m] of scambi) o.material = m;
  scena.fog = fog;
  renderer.toneMapping = tm;
  renderer.shadowMap.enabled = ombre;
}

function disegna() {
  SNAP.value.set(BASSA.w * 0.44, BASSA.h * 0.44);
  if (ir) {
    renderer.setRenderTarget(rtScena);
    renderer.render(scena, camera);
    disegnaCalore();
    renderer.setRenderTarget(null);
    renderer.render(scenaIr, camera);
  } else if (stile === "ps1") {
    renderer.setRenderTarget(rtBassa);
    renderer.render(scena, camera);
    renderer.setRenderTarget(null);
    renderer.render(scenaRetino, camera);
  } else {
    renderer.setRenderTarget(null);
    renderer.render(scena, camera);
  }
}

let prima = null;
function giro(ora) {
  const dt = prima == null ? 0 : Math.min(0.1, (ora - prima) / 1000);
  prima = ora;
  if (scena) {
    anima(dt);
    inquadra(dt, tempo);
    disegna();
    mettiFrase();
  }
  requestAnimationFrame(giro);
}

// la messa a fuoco della videocamera che cerca il soggetto, quando lo zoom arriva
async function aFuoco() {
  const passi = [[7, 0], [0, 380], [2.5, 180], [0, 320]];
  for (const [px, ms] of passi) {
    schermo.style.transition = ms ? `filter ${ms}ms ease-in-out` : "none";
    schermo.style.filter = px ? `blur(${px}px)` : "none";
    await new Promise((r) => setTimeout(r, ms || 30));
  }
}

// ---------- i comandi ----------
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
  trascina = { x: e.clientX, y: e.clientY, tx: testa.tx, ty: testa.ty, t: performance.now() };
});
palco.addEventListener("pointerup", (e) => {
  const mosso = trascina && Math.hypot(e.clientX - trascina.x, e.clientY - trascina.y) > 8;
  trascina = null;
  if (mosso || !scena) return;
  if (zoomVerso) return esci();
  // un clic sul padre: si esamina il collo
  const r = palco.getBoundingClientRect();
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const colpo = ray.intersectObjects(scena.children, true).find((h) => h.object.visible);
  if (colpo?.object.userData.chi === "padre") esamina();
});

async function esamina() {
  if (!scena || zoomVerso) return;
  zoomVerso = 1;
  $("#esamina").textContent = "Torna";
  parla([["È una botta."]]);
  await new Promise((r) => setTimeout(r, 900));
  if (!zoomVerso) return;
  aFuoco();
}

function esci(subito = false) {
  zoomVerso = 0;
  if (subito) zoom = 0;
  $("#esamina").textContent = "Esamina il collo";
}

$("#esamina").addEventListener("click", () => (zoomVerso ? esci() : esamina()));
$("#ir").addEventListener("click", (e) => {
  ir = !ir;
  e.currentTarget.setAttribute("aria-pressed", String(ir));
});
$("#stile-ps1").addEventListener("click", () => scegli("ps1"));
$("#stile-creta").addEventListener("click", () => scegli("creta"));

// per le prove (Playwright): lo stato e i comandi
window.prova = { scegli, esamina, esci, get stile() { return stile; }, get pronta() { return !!scena && attesa.hidden; },
  posizioni() {
    const v = (o) => o.getWorldPosition(new THREE.Vector3()).toArray().map((x) => +x.toFixed(3));
    const p = persone.padre;
    return { collo: v(p.collo), testa: v(p.testa), bubbone: v(bub), occhio: OCCHIO.toArray() };
  } };

const iniziale = location.hash === "#plastilina" ? "creta" : "ps1";
requestAnimationFrame(giro);
scegli(iniziale).catch((err) => {
  attesa.textContent = "Il nastro non parte";
  console.error(err);
});
