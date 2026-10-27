// La plastilina, lo stile del gioco scelto dall'utente il 27 ottobre: materiali, texture, geometria, modelli di
// Meshy, mobili e pupazzi per le scene in 3D. Viene dalla prova della cucina (art/prove-stile/21-cucina-3d).
// - I materiali hanno le impronte delle dita e "bollono" a ogni posa, come in uno stop-motion: i vertici si spostano
//   con un rumore che dipende solo dal punto dove stanno, mai lungo le normali (aprirebbero i modelli lungo le
//   cuciture, dove i vertici sono doppi).
// - I modelli sono glTF in un .json con la geometria compressa dentro (meshopt, tools/tre/alleggerisci.mjs) e le
//   texture WebP accanto: gli Artifact non servono i .glb.
// - I pupazzi sono di Meshy con lo scheletro. La posa e la vita (il respiro, il tremito, le occhiate, la tosse, i
//   singhiozzi) le fa il codice girando le ossa; i segni della malattia sono pezzi attaccati alle ossa (i bubboni) o
//   colori dei vertici (le dita nere); le espressioni sono facce di ricambio, texture ridipinte da tools/facce.mjs.
import * as THREE from "../lib/three.js";

export const MOD = "modelli/creta/";
export const TEX = "img/creta/";

// ---------- numeri a caso, sempre gli stessi ----------
export function caso(seme) {
  let s = seme >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function hash3(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
// rumore lento in 3D, tra -1 e 1
export function rumore3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const f = (t) => t * t * (3 - 2 * t);
  const u = f(x - xi), v = f(y - yi), w = f(z - zi);
  let r = 0;
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++)
    r += hash3(xi + a, yi + b, zi + c) * (a ? u : 1 - u) * (b ? v : 1 - v) * (c ? w : 1 - w);
  return r * 2 - 1;
}
export const onda = (t, f, fase = 0) => Math.sin((t * f + fase) * Math.PI * 2);
export const vaga = (t, f, seme) => rumore3(t * f, seme, seme * 0.37);
export const liscio = (a, b, x) => { const k = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };

// ---------- le texture dipinte qui (le piccole cose) ----------
export function tela(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

// macchie morbide, ripetute ai bordi perche' la texture si ripeta senza tagli
export function macchie(g, w, h, n, colori, r, rnd, alfa = 1) {
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

export function texture(canvas, ripeti = [1, 1]) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(ripeti[0], ripeti[1]);
  t.anisotropy = 8;
  return t;
}

// una tinta unita con qualche macchia (stipiti, interruttori...)
export function tinta(colore, macchia, seme = 3) {
  const n = 128, rnd = caso(seme);
  const [c, g] = tela(n, n);
  g.fillStyle = colore;
  g.fillRect(0, 0, n, n);
  macchie(g, n, n, 24, macchia, 16, rnd, 0.6);
  return texture(c);
}

// le impronte delle dita, per le cose fatte qui: una mappa delle altezze (anelli d'impronta, strisciate di pollice,
// bozzi larghi) trasformata in mappa delle normali
let IMPRONTE = null;
export function impronte() {
  if (IMPRONTE) return IMPRONTE;
  const n = 512, rnd = caso(7);
  const [c, g] = tela(n, n);
  g.fillStyle = "#808080";
  g.fillRect(0, 0, n, n);
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
  IMPRONTE = new THREE.CanvasTexture(c);
  IMPRONTE.wrapS = IMPRONTE.wrapT = THREE.RepeatWrapping;
  IMPRONTE.colorSpace = THREE.NoColorSpace;
  return IMPRONTE;
}

// ---------- i materiali ----------
// il seme del "bollire", nuovo a ogni posa, e quanto bolle (meno nello zoom)
export const BOLLE = { value: 0 }, FORZA_BOLLE = { value: 1 };
const RUMORE_GLSL = `
uniform float uBolle, uForzaBolle;
float hb(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float nb(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hb(i), hb(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hb(i + vec3(0.0, 1.0, 0.0)), hb(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(hb(i + vec3(0.0, 0.0, 1.0)), hb(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hb(i + vec3(0.0, 1.0, 1.0)), hb(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}`;

export function materiale(o = {}) {
  const m = new THREE.MeshPhysicalMaterial({ map: o.map || null, color: o.color ?? 0xffffff, emissive: o.emissive ?? 0x000000,
    roughness: o.ruvido ?? 0.62, metalness: 0, sheen: 0.4, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xfff2e0),
    normalMap: o.normalMap === undefined ? impronte() : o.normalMap, side: o.side ?? THREE.FrontSide, envMapIntensity: 0.15,
    vertexColors: !!o.vertexColors, transparent: !!o.trasparente, opacity: o.opacita ?? 1, dithering: true });
  m.normalScale.setScalar(o.impronte ?? 0.9);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uBolle = BOLLE;
    sh.uniforms.uForzaBolle = FORZA_BOLLE;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + RUMORE_GLSL)
      .replace("#include <project_vertex>", `#include <project_vertex>
  vec3 bolleP = (modelMatrix * vec4(transformed, 1.0)).xyz * 11.0 + uBolle;
  vec3 spinta = vec3(nb(bolleP), nb(bolleP + 17.3), nb(bolleP + 31.7)) - 0.5;
  mvPosition.xyz += mat3(viewMatrix) * spinta * (0.003 * uForzaBolle);
  gl_Position = projectionMatrix * mvPosition;`);
  };
  return m;
}

// le superfici della stanza (muri, pavimenti): il colore e le normali, generati e resi ripetibili da
// tools/texture_creta.py, ripetuti ogni tot metri (le coordinate dei muri sono in metri)
const caricatore = new THREE.TextureLoader();
const SUPERFICI = {};
export function superficie(nome, metri) {
  const chiave = `${nome}@${metri}`;
  SUPERFICI[chiave] ??= Promise.all([caricatore.loadAsync(`${TEX}${nome}.webp`), caricatore.loadAsync(`${TEX}${nome}_n.webp`)])
    .then(([map, normalMap]) => {
      map.colorSpace = THREE.SRGBColorSpace;
      for (const t of [map, normalMap]) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.setScalar(1 / metri);
        t.anisotropy = 8;
      }
      return { map, normalMap };
    });
  return SUPERFICI[chiave];
}

// una faccia di ricambio: la texture dei colori del pupazzo, ridipinta (le coordinate sono quelle del glTF)
const FACCE = {};
export function faccia(nome) {
  FACCE[nome] ??= caricatore.loadAsync(`${MOD}${nome}.webp`).then((t) => {
    t.flipY = false;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
  return FACCE[nome];
}

// ---------- la geometria ----------
// una scatola con gli spigoli tondi (la normale va dal centro dell'angolo) e qualche bozzo, come modellata a mano
export function scatola(w, h, d, r = 0.025, bozzi = 0.0035, seme = 0) {
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

// un piano (pavimento, soffitto) un po' ondulato, con le coordinate della texture in metri
export function piano(w, h, seme = 0) {
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

// un muro largo w e alto h (centrato in x, da terra in su) coi buchi dei vani: [x0, x1, y0, y1] (una porta parte da
// terra, y0 = 0). Un poligono solo, senza fessure tra i pezzi; le coordinate della texture sono in metri
export function muro(w, h, vani = []) {
  const f = new THREE.Shape();
  const terra = vani.filter((v) => v[2] <= 0.001).sort((a, b) => a[0] - b[0]);
  f.moveTo(-w / 2, 0);
  for (const [x0, x1, , y1] of terra) {
    f.lineTo(x0, 0);
    f.lineTo(x0, y1);
    f.lineTo(x1, y1);
    f.lineTo(x1, 0);
  }
  f.lineTo(w / 2, 0);
  f.lineTo(w / 2, h);
  f.lineTo(-w / 2, h);
  f.closePath();
  for (const [x0, x1, y0, y1] of vani.filter((v) => v[2] > 0.001)) {
    const b = new THREE.Path();
    b.moveTo(x0, y0);
    b.lineTo(x0, y1);
    b.lineTo(x1, y1);
    b.lineTo(x1, y0);
    b.closePath();
    f.holes.push(b);
  }
  return new THREE.ShapeGeometry(f);
}

// ---------- i modelli di Meshy ----------
const DECODER = THREE.MeshoptDecoder.supported
  ? THREE.MeshoptDecoder.ready.then(() => THREE.MeshoptDecoder, () => THREE.MeshoptDecoderJS)
  : Promise.resolve(THREE.MeshoptDecoderJS);
const MODELLI = {};

// dal .json col glTF si rimette insieme un GLB in memoria, come fa la stanza del medico (stanza.js). La texture di
// metallo e ruvidezza non serve (la plastilina e' tutta uguale): non si carica, risparmia memoria
export function modello(nome, avanzamento, nuovo = false) {
  // "nuovo": un'altra copia, non quella gia' in scena (la cosa nera della notte e' un altro pupazzo)
  const carica = async () => {
    const risposta = await fetch(`${MOD}${nome}.json`);
    if (!risposta.ok) throw new Error(`${nome}: ${risposta.status}`);
    const j = await risposta.json();
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
    const gltf = await loader.parseAsync(glb.buffer, MOD);
    avanzamento?.();
    return gltf;
  };
  if (nuovo) return carica();
  MODELLI[nome] ??= carica();
  return MODELLI[nome];
}

// i materiali di Meshy diventano plastilina: il colore e le normali del modello, la luce morbida della creta
export function aCreta(o, ruvido = 0.62, colore = 0xffffff) {
  const vecchio = o.material;
  o.material = materiale({ map: vecchio.map, normalMap: vecchio.normalMap || impronte(), impronte: vecchio.normalMap ? 1 : 0.4,
    ruvido, side: vecchio.side, color: colore });
  o.castShadow = true;
  o.receiveShadow = true;
  return vecchio;
}

// un mobile alle misure volute: m = { nome, x, y, z, dim: [larghezza, altezza, profondita'], gira, calore, colore }.
// Appoggiato a terra (o all'altezza y), centrato in x e z, girato (i modelli guardano verso +z)
export async function mobile(m) {
  const o = (await modello(m.modello || m.nome)).scene.clone(true);
  const box = new THREE.Box3().setFromObject(o);
  const size = box.getSize(new THREE.Vector3()), centro = box.getCenter(new THREE.Vector3());
  const scala = new THREE.Group();
  scala.scale.set(m.dim[0] / size.x, m.dim[1] / size.y, m.dim[2] / size.z);
  scala.position.set(-centro.x * scala.scale.x, -box.min.y * scala.scale.y, -centro.z * scala.scale.z);
  scala.add(o);
  const pezzo = new THREE.Group();
  pezzo.add(scala);
  pezzo.position.set(m.x ?? 0, m.y ?? 0, m.z ?? 0);
  pezzo.rotation.set(m.inclina ?? 0, m.gira ?? 0, 0, "YXZ");
  pezzo.traverse((x) => {
    if (!x.isMesh) return;
    aCreta(x, m.ruvido ?? 0.62, m.colore ?? 0xffffff);
    x.userData.calore = m.calore ?? 0.05;
    if (m.zona) x.userData.zona = m.zona;
  });
  pezzo.name = m.id || m.nome;
  return pezzo;
}

// una porta di Meshy aperta: d = { cardine: [x, z], apre (radianti), larga, alta, modello }. La maniglia (sul lato
// -x del modello) va dalla parte opposta al cardine
export async function porta(d) {
  const o = await mobile({ nome: d.modello || "porta", x: d.larga / 2, z: 0, dim: [d.larga, d.alta ?? 2.04, d.spessa ?? 0.12],
    gira: Math.PI, colore: d.colore, zona: d.zona });
  const anta = new THREE.Group();
  anta.position.set(d.cardine[0], 0, d.cardine[1]);
  anta.rotation.y = d.apre ?? 0;
  anta.add(o);
  anta.name = d.id || "porta";
  return anta;
}

// ---------- i pupazzi ----------
const GRADI = Math.PI / 180;
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _w = new THREE.Vector3();
const SU = new THREE.Vector3(0, 1, 0), AVANTI = new THREE.Vector3(0, 0, 1);

// la tosse (ogni 6 secondi e mezzo, tre colpi in un secondo) e i singhiozzi (due scosse ogni due secondi e poco piu')
function tosse(t) {
  const s = (t + 2) % 6.5;
  return s > 1 ? 0 : Math.pow(Math.abs(Math.sin(s * Math.PI * 3)), 0.6) * (1 - s * 0.45);
}
function singhiozzo(t) {
  const s = (t + 0.7) % 2.3;
  return s > 0.55 ? 0 : Math.abs(Math.sin(s * Math.PI * 3.7)) * (1 - s) * (0.7 + 0.3 * vaga(t, 0.4, 41));
}

// le pose degli esami: mostrare le mani (in avanti, i palmi in su) e l'ascella (il braccio alzato); il resto lo fa la
// vita (la testa piegata dall'altra parte per il collo)
export const POSE_ESAME = {
  mani: { braccia: [[0.14, -0.62, 0.77], [0.08, -0.05, 1]] },
  ascelle: { braccia: { Left: [[0.8, 0.55, 0.22], [0.35, 0.92, 0.15]] } },
};

// la pelle del colore di un bubbone, alla base: il colore della pelle di ognuno
const ROSSO = new THREE.Color(0x8c3236), VIOLA = new THREE.Color(0x4a1828), PUS = new THREE.Color(0xa58d4a), BUCO = new THREE.Color(0x140605);

// una cupola di plastilina che esce dalla pelle: alla base il colore della pelle, poi rosso infiammato, viola scuro in
// cima; aperta, in cima il buco bagnato, nero, col bordo di pus giallo
function cupola(r, pelle, aperto, seme) {
  const geo = new THREE.SphereGeometry(r, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2 + 0.3);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  const base = new THREE.Color(pelle);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = y / r;
    let k = 1 + rumore3(x / r * 2 + seme, y / r * 2, z / r * 2) * 0.1;
    if (aperto) k *= 1 + 0.05 * liscio(0.7, 0.8, t) - 0.25 * liscio(0.82, 0.92, t);
    pos.setXYZ(i, x * k, y * k, z * k);
    c.copy(base).lerp(ROSSO, liscio(0.0, 0.45, t)).lerp(VIOLA, liscio(0.45, 0.85, t));
    if (aperto) c.lerp(PUS, liscio(0.7, 0.78, t)).lerp(BUCO, liscio(0.82, 0.88, t));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, materiale({ vertexColors: true, ruvido: aperto ? 0.34 : 0.46, impronte: 0.4 }));
  m.castShadow = true;
  return m;
}

// le mani: un colore per vertice che moltiplica la texture. "nere": grigie, livide verso la punta delle dita, poi nere
// (la peste che va in cancrena); "fredde": le unghie bluastre (il freddo, la ragazza)
// ---------- le mani di ricambio ----------
// Lo scheletro di Meshy non ha le dita: le mani del modello restano aperte, a dita larghe, in ogni posa (sul bastone, a
// pugno, giunte). Come negli stop-motion veri le mani si cambiano: quella del modello si chiude nel polso (l'osso
// schiacciato) e al suo posto c'e' una mano di plastilina in una delle forme, della misura e del colore della pelle del
// pupazzo, che segue l'osso del polso. I modelli sono mani destre (art/plastilina/mani): la sinistra e' la stessa allo
// specchio. Per ogni forma, nel riferimento del modello e a occhio: da che parte sta il polso e dove guarda il dorso;
// il resto (il punto del polso, la direzione delle dita, quella esatta del dorso, la lunghezza) lo misura misuraMano.
export const MANI_RICAMBIO = {
  rilassata: { polso: [0, 1, -0.3], dorso: [0, 0.3, 1] },
  pugno: { polso: [0, -1, 0], dorso: [0, 0, -1] },
  presa: { polso: [0.5, -1, 0], dorso: [0.3, 0, 1] },
  aperta: { polso: [0.6, -1, 0], dorso: [0, 0, -1] },
};
export const MODELLI_MANI = {};
let MANI_PRONTE = null;
// le mani si caricano una volta per tutti i pupazzi (se non arrivano, restano le mani del modello)
export function caricaMani() {
  MANI_PRONTE ??= Promise.all(Object.keys(MANI_RICAMBIO).map(async (f) => {
    try {
      const gltf = await modello(`mano_${f}`);
      MODELLI_MANI[f] = { scene: gltf.scene, misure: misuraMano(gltf.scene, MANI_RICAMBIO[f]) };
    } catch (err) {
      console.warn("Mano di ricambio non caricata:", f, err);
    }
  }));
  return MANI_PRONTE;
}

// la direzione piu' sottile di una nuvola di punti, perpendicolare a "via" (il dorso di una mano), verso "verso"
function piuSottile(punti, centro, via, verso) {
  const u = new THREE.Vector3(1, 0, 0);
  if (Math.abs(u.dot(via)) > 0.9) u.set(0, 1, 0);
  u.addScaledVector(via, -u.dot(via)).normalize();
  const v = new THREE.Vector3().crossVectors(via, u);
  let meglio = null, minimo = Infinity;
  const n = new THREE.Vector3(), d = new THREE.Vector3();
  for (let a = 0; a < 180; a += 2) {
    const r = (a * Math.PI) / 180;
    n.copy(u).multiplyScalar(Math.cos(r)).addScaledVector(v, Math.sin(r));
    let val = 0;
    for (const p of punti) val += d.subVectors(p, centro).dot(n) ** 2;
    if (val < minimo) { minimo = val; meglio = n.clone(); }
  }
  return meglio.dot(verso) < 0 ? meglio.negate() : meglio;
}

// una mano di ricambio misurata: il polso (i punti piu' in fondo dalla sua parte), le dita (dal polso verso il centro
// della mano), il dorso (la direzione piu' sottile, dalla parte detta), la lunghezza dal polso alla punta
function misuraMano(scena, { polso: versoPolso, dorso: versoDorso }) {
  scena.updateMatrixWorld(true);
  const punti = [];
  scena.traverse((o) => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position;
    const passo = Math.max(1, Math.floor(p.count / 4000));
    for (let k = 0; k < p.count; k += passo) punti.push(new THREE.Vector3().fromBufferAttribute(p, k).applyMatrix4(o.matrixWorld));
  });
  const vp = new THREE.Vector3(...versoPolso).normalize();
  const proiezioni = punti.map((p) => p.dot(vp)).sort((a, b) => a - b);
  const soglia = proiezioni[Math.floor(proiezioni.length * 0.96)];
  const fondo = punti.filter((p) => p.dot(vp) >= soglia);
  const polso = fondo.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(fondo.length);
  const centro = punti.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(punti.length);
  const dita = centro.clone().sub(polso).normalize();
  const dorso = piuSottile(punti, centro, dita, new THREE.Vector3(...versoDorso).normalize());
  const lungo = Math.max(...punti.map((p) => p.clone().sub(polso).dot(dita)));
  return { polso, dita, dorso, lungo };
}
const UNO = new THREE.Vector3(1, 1, 1);
const _m4 = new THREE.Matrix4(), _p3 = new THREE.Vector3(), _s3 = new THREE.Vector3();

const MANI = {
  nere: [new THREE.Color(0.58, 0.6, 0.64), new THREE.Color(0.32, 0.2, 0.26), new THREE.Color(0.035, 0.028, 0.03), 0.38, 0.55, 0.78],
  fredde: [new THREE.Color(0.9, 0.92, 0.98), new THREE.Color(0.72, 0.78, 0.95), new THREE.Color(0.6, 0.68, 0.95), 0.5, 0.7, 0.95],
};

export class Pupazzo {
  static async carica(chi, nome = `${chi}_creta`, avanzamento) {
    return new Pupazzo(chi, await modello(nome, avanzamento));
  }

  constructor(chi, gltf) {
    this.chi = chi;
    this.radice = gltf.scene;
    this.radice.rotation.order = "YXZ";
    this.ossa = {};
    this.pelle = [];
    this.radice.traverse((o) => {
      if (o.isBone) this.ossa[o.name] = o;
      if (!o.isMesh) return;
      const vecchio = aCreta(o, 0.58);
      o.userData = { chi, calore: 0.5, mappa: vecchio.map };
      o.frustumCulled = false;
      this.pelle.push(o);
    });
    // nella posa del modello (a braccia aperte, la radice nell'origine): dove stanno le ossa e com'e' girato il
    // genitore di ognuna, visti dal pupazzo
    this.radice.updateMatrixWorld(true);
    this.dove = {};
    this.guida = {};
    for (const [nome, b] of Object.entries(this.ossa)) {
      this.dove[nome] = b.getWorldPosition(new THREE.Vector3());
      const qp = b.parent.getWorldQuaternion(new THREE.Quaternion());
      this.guida[nome] = { b, base: b.quaternion.clone(), qp, qpi: qp.clone().invert() };
    }
    this.punti = this.misura();
    this.posa = { vita: {} };
    this.mire = {};
    this.mireEsame = {};
    this.esame = null;
    this.bubboni = [];
    this.attaccati = [];
    this.mani = null;
    this.alto = this.dove.head_end?.y ?? 1.7;
    this.ricambio = { Left: null, Right: null };
    this.manoModello = this.misuraMani();
  }

  // le mani del modello, nella sua posa: per ogni lato il polso, la direzione delle dita, quella del dorso, la lunghezza
  // (dai vertici che seguono l'osso della mano), e la rotazione che porta una mano di ricambio (dita +y, dorso +z) al
  // suo posto, vista dall'osso
  misuraMani() {
    const o = this.pelle.find((m) => m.isSkinnedMesh);
    if (!o) return {};
    const g = o.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    const ossa = o.skeleton.bones, mani = {};
    for (const lato of ["Left", "Right"]) {
      const nome = `${lato}Hand`, i = ossa.findIndex((b) => b.name === nome);
      if (i < 0 || !this.ossa[nome]) continue;
      const polso = this.dove[nome].clone();
      const punti = [];
      for (let k = 0; k < pos.count; k++) {
        let w = 0;
        for (let j = 0; j < 4; j++) if (si.getComponent(k, j) === i) w += sw.getComponent(k, j);
        // nella posa del modello il vertice sta dove lo mette la sua mesh (le ossa non spostano niente)
        if (w >= 0.5) punti.push(new THREE.Vector3().fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld));
      }
      if (punti.length < 20) continue;
      const centro = punti.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(punti.length);
      const dita = centro.clone().sub(polso).normalize();
      const lungo = Math.max(...punti.map((p) => p.clone().sub(polso).dot(dita)));
      // il dorso: la direzione in cui la mano e' piu' sottile (la piu' piccola della covarianza), verso fuori e in su
      const cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for (const p of punti) {
        const d = [p.x - centro.x, p.y - centro.y, p.z - centro.z];
        for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) cov[a][b] += d[a] * d[b];
      }
      let dorso = null, minimo = Infinity;
      // la direzione piu' sottile: si prova un po' di direzioni perpendicolari alle dita
      const u = new THREE.Vector3(1, 0, 0);
      if (Math.abs(u.dot(dita)) > 0.9) u.set(0, 1, 0);
      u.addScaledVector(dita, -u.dot(dita)).normalize();
      const v = new THREE.Vector3().crossVectors(dita, u);
      for (let a = 0; a < 180; a += 3) {
        const r = a * GRADI, n = u.clone().multiplyScalar(Math.cos(r)).addScaledVector(v, Math.sin(r));
        const q = [n.x, n.y, n.z];
        let val = 0;
        for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) val += q[x] * cov[x][y] * q[y];
        if (val < minimo) { minimo = val; dorso = n; }
      }
      const fuori = new THREE.Vector3(lato === "Left" ? 1 : -1, 1, 0);
      if (dorso.dot(fuori) < 0) dorso.negate();
      // la mano di ricambio: il polso nell'origine, le dita su +y, il dorso su +z; vista dall'osso della mano
      const x = new THREE.Vector3().crossVectors(dita, dorso);
      const qMano = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, dita, dorso));
      const qOsso = this.ossa[nome].getWorldQuaternion(new THREE.Quaternion());
      mani[lato] = { polso, dita, dorso, lungo, ruota: qOsso.invert().multiply(qMano) };
    }
    return mani;
  }

  // le mani di ricambio della posa: forme = { Left, Right } (le forme di MANI_RICAMBIO); senza la forma o il modello,
  // la mano del modello
  maniDiRicambio(forme = {}) {
    for (const lato of ["Left", "Right"]) {
      const forma = forme[lato] ?? "rilassata";
      const ora = this.ricambio[lato];
      if (ora?.forma === forma) continue;
      if (ora) this.radice.remove(ora.oggetto);
      this.ricambio[lato] = null;
      const osso = this.ossa[`${lato}Hand`];
      if (!osso) continue;
      if (!MODELLI_MANI[forma] || !this.manoModello[lato]) { osso.scale.setScalar(1); continue; }
      osso.scale.setScalar(0.001);
      const oggetto = this.manoDiRicambio(lato, forma);
      this.radice.add(oggetto);
      this.ricambio[lato] = { forma, oggetto };
    }
    this.seguiMani();
  }

  manoDiRicambio(lato, forma) {
    const M = this.manoModello[lato];
    const { scene: originale, misure } = MODELLI_MANI[forma];
    const scena = originale.clone(true);
    const { polso, dita, dorso, lungo } = misure;
    // la mano di ricambio lunga come quella del modello (dal polso alla punta delle dita)
    const scala = M.lungo / Math.max(lungo, 1e-4);
    scena.updateMatrixWorld(true);
    // dal modello al riferimento della mano (polso nell'origine, dita +y, dorso +z), allo specchio per la sinistra
    const dentro = new THREE.Group();
    dentro.position.copy(polso).negate();
    dentro.add(scena);
    const giro = new THREE.Group();
    giro.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(dita, dorso), dita, dorso)).invert();
    giro.add(dentro);
    const specchio = new THREE.Group();
    specchio.scale.set(lato === "Left" ? -scala : scala, scala, scala);
    // il moncherino un po' dentro il polso, a coprire la mano schiacciata
    specchio.position.y = -0.012;
    specchio.add(giro);
    const oggetto = new THREE.Group();
    oggetto.matrixAutoUpdate = false;
    oggetto.add(specchio);
    const colore = this.coloreMani ?? this.pelleColore ?? 0xcbb596;
    scena.traverse((o) => {
      if (!o.isMesh) return;
      aCreta(o, 0.6, colore);
      o.userData = { chi: this.chi, calore: this.pelle[0]?.userData.calore ?? 0.5, manoDiRicambio: true };
      if (this.mani && MANI[this.mani]) {
        o.geometry = o.geometry.clone();
        o.geometry.setAttribute("color", new THREE.BufferAttribute(this.coloriRicambio(o, polso, dita, lungo, MANI[this.mani]), 3));
        o.material.vertexColors = true;
      }
      if (this.coloreMani != null) o.material.map = null;
    });
    return oggetto;
  }

  // le dita nere o fredde sulla mano di ricambio: piu' scure verso la punta delle dita
  coloriRicambio(o, polso, dita, lungo, [mano, livido, punta, da, mezzo, a]) {
    const p = o.geometry.attributes.position, colori = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let k = 0; k < p.count; k++) {
      const d = _v.fromBufferAttribute(p, k).applyMatrix4(o.matrixWorld).sub(polso).dot(dita) / lungo;
      c.copy(mano).lerp(livido, liscio(da, mezzo, d)).lerp(punta, liscio(mezzo, a, d));
      colori.set([c.r, c.g, c.b], k * 3);
    }
    return colori;
  }

  // le mani di ricambio seguono l'osso del polso (senza la sua scala schiacciata)
  seguiMani() {
    if (!this.ricambio.Left && !this.ricambio.Right) return;
    this.radice.updateMatrixWorld(true);
    const inv = (this._inv ??= new THREE.Matrix4()).copy(this.radice.matrixWorld).invert();
    for (const lato of ["Left", "Right"]) {
      const r = this.ricambio[lato];
      if (!r) continue;
      _m4.multiplyMatrices(inv, this.ossa[`${lato}Hand`].matrixWorld).decompose(_p3, _q, _s3);
      _q.multiply(this.manoModello[lato].ruota);
      r.oggetto.matrix.compose(_p3, _q, UNO);
      r.oggetto.matrixWorldNeedsUpdate = true;
    }
  }

  // i punti della faccia e del collo, cercati sul modello coi raggi (nella posa del modello il pupazzo guarda +z), e
  // tenuti nel riferimento dell'osso che li porta: il naso, gli occhi, la bocca, il davanti del collo
  misura() {
    const raggio = new THREE.Raycaster();
    const davanti = (y) => {
      raggio.set(new THREE.Vector3(this.dove.Head.x, y, 2), new THREE.Vector3(0, 0, -1));
      return raggio.intersectObjects(this.pelle, false)[0]?.point;
    };
    // il naso: il punto piu' avanti della faccia, tra l'osso della testa e i due terzi della testa (sopra ci sono i
    // capelli, che possono sporgere)
    const y0 = this.dove.Head.y, y1 = y0 + ((this.dove.head_end ?? this.dove.Head).y - y0) * 0.7;
    let naso = null;
    for (let y = y0; y <= y1; y += 0.005) {
      const p = davanti(y);
      if (p && (!naso || p.z > naso.z)) naso = p;
    }
    naso ??= this.dove.Head.clone().add(new THREE.Vector3(0, 0.08, 0.1));
    const punto = (osso, p) => ({ osso, p: this.ossa[osso].worldToLocal(p.clone()) });
    const occhi = davanti(naso.y + 0.035) ?? naso.clone();
    const bocca = davanti(naso.y - 0.045) ?? naso.clone();
    const gola = davanti((this.dove.neck.y + this.dove.Head.y) / 2) ?? this.dove.neck.clone().add(new THREE.Vector3(0, 0, 0.05));
    const petto = davanti(this.dove.neck.y - 0.09) ?? this.dove.neck.clone().add(new THREE.Vector3(0, -0.09, 0.1));
    occhi.z = Math.max(occhi.z, naso.z - 0.03);
    occhi.z += 0.01;
    bocca.z += 0.01;
    // gli stessi punti nella posa del modello, visti dal pupazzo (per gli oggetti da attaccare e le mani alla bocca)
    this.puntiModello = { naso: naso.clone(), occhi: occhi.clone(), bocca: bocca.clone(), gola: gola.clone(), petto: petto.add(new THREE.Vector3(0, 0, 0.006)) };
    return {
      naso: punto("Head", naso),
      occhi: punto("Head", occhi),
      bocca: punto("Head", bocca),
      gola: punto("neck", gola),
    };
  }

  // dove sta il pupazzo e in che posa: qui = { x, y, z, gira (radianti; senza, guarda verso "occhio") }
  metti(qui, posa, occhio) {
    const r = this.radice;
    const su = posa.seduta != null ? posa.seduta - this.dove.Hips.y : (posa.su ?? 0);
    r.position.set(qui.x, (qui.y ?? 0) + su, qui.z);
    const gira = qui.gira ?? Math.atan2(occhio.x - qui.x, occhio.z - qui.z);
    r.rotation.set((posa.sdraiato ?? 0) * GRADI, gira, 0);
    r.updateMatrixWorld(true);
    this.posa = posa;
    this.mire = this.calcolaMire(posa.braccia);
    this.mireEsame = {};
    for (const [parte, pe] of Object.entries(posa.esami ?? POSE_ESAME)) if (pe?.braccia) this.mireEsame[parte] = this.calcolaMire(pe.braccia, this.mire);
  }

  // le braccia, viste dal pupazzo (x verso la sua sinistra, y in alto, z in avanti): [direzione del braccio, direzione
  // dell'avambraccio] per tutte e due (il destro allo specchio), oppure { Left, Right } ognuno col suo, oppure per un lato
  // dove arriva il polso: { punto: [x, y, z] } della stanza, { davanti: [x, y, z] } visto dal pupazzo (dai piedi), o
  // { verso: "bocca", avanti } (la mano alla bocca)
  calcolaMire(braccia, base = {}) {
    const mire = { ...base };
    if (!braccia) return mire;
    const lati = Array.isArray(braccia) ? { Left: braccia, Right: braccia.map(([x, y, z]) => [-x, y, z]) } : braccia;
    for (const lato of ["Left", "Right"]) {
      const s = lati[lato];
      if (!s) continue;
      if (s.punto || s.davanti || s.verso) {
        const q = s.punto ? new THREE.Vector3(...s.punto)
          : this.radice.localToWorld(s.davanti ? new THREE.Vector3(...s.davanti)
            : this.puntiModello[s.verso].clone().add(new THREE.Vector3(lato === "Left" ? 0.02 : -0.02, -0.03, s.avanti ?? 0.06)));
        this.appoggia(mire, lato, q, s.polo);
        continue;
      }
      this.punta(mire, `${lato}Arm`, `${lato}ForeArm`, new THREE.Vector3(...s[0]));
      this.punta(mire, `${lato}ForeArm`, `${lato}Hand`, new THREE.Vector3(...s[1]), mire[`${lato}Arm`]);
    }
    return mire;
  }

  // la rotazione che porta l'osso a puntare nella direzione voluta (vista dal pupazzo); "prima" e' quanto e' gia'
  // girato il genitore
  punta(mire, osso, figlio, verso, prima) {
    if (!this.dove[osso] || !this.dove[figlio]) return;
    const ora = this.dove[figlio].clone().sub(this.dove[osso]).normalize();
    const voluto = verso.clone().normalize();
    if (prima) voluto.applyQuaternion(prima.clone().invert());
    mire[osso] = new THREE.Quaternion().setFromUnitVectors(ora, voluto);
  }

  // il braccio che si appoggia: spalla, gomito e polso, col polso nel punto voluto e il gomito un po' indietro e in fuori
  appoggia(mire, lato, punto, polo = [lato === "Left" ? 0.5 : -0.5, 0, -1]) {
    const S = this.dove[`${lato}Arm`], E = this.dove[`${lato}ForeArm`], W = this.dove[`${lato}Hand`];
    const a = E.distanceTo(S), b = W.distanceTo(E);
    const verso = this.radice.worldToLocal(punto.clone()).sub(S);
    const d = THREE.MathUtils.clamp(verso.length(), Math.abs(a - b) + 0.01, a + b - 0.005);
    verso.normalize();
    const cosA = (a * a + d * d - b * b) / (2 * a * d);
    const p = new THREE.Vector3(...polo);
    p.addScaledVector(verso, -p.dot(verso)).normalize();
    const gomito = S.clone().addScaledVector(verso, a * cosA).addScaledVector(p, a * Math.sqrt(Math.max(0, 1 - cosA * cosA)));
    const polso = S.clone().addScaledVector(verso, d);
    this.punta(mire, `${lato}Arm`, `${lato}ForeArm`, gomito.clone().sub(S));
    this.punta(mire, `${lato}ForeArm`, `${lato}Hand`, polso.sub(gomito), mire[`${lato}Arm`]);
  }

  // girare un osso di qualche grado attorno agli assi del pupazzo (x: piegarsi in avanti, y: voltarsi, z: inclinarsi
  // di lato), a partire dalla sua posa, dopo averlo puntato (mira)
  gira(nome, r, mira) {
    const g = this.guida[nome];
    if (!g) return;
    if (r) _q.setFromEuler(_e.set(r[0] * GRADI, r[1] * GRADI, r[2] * GRADI, "YXZ"));
    else _q.identity();
    if (mira) _q.multiply(mira);
    g.b.quaternion.copy(g.qpi).multiply(_q).multiply(g.qp).multiply(g.base);
  }

  // la vita, a ogni posa: la posa, il respiro, il tremito, le occhiate, la tosse, i singhiozzi; "fermo" (0-1) quando lo si
  // esamina: sta quasi fermo e mostra la parte (esame: occhi, bocca, collo, ascelle, mani)
  aggiorna(t, fermo = 0, esame = null) {
    const P = this.posa, V = P.vita || {};
    const calma = 1 - 0.7 * fermo, mostra = fermo * fermo * (3 - 2 * fermo);
    const R = {};
    const add = (b, x, y, z) => { const r = R[b] ||= [0, 0, 0]; r[0] += x; r[1] += y; r[2] += z; };
    for (const [b, v] of Object.entries(P.ossa || {})) add(b, v[0], v[1], v[2]);
    if (V.respiro) {
      const [f, a] = V.respiro, r = onda(t, f) * calma;
      add("Spine01", -a * r, 0, 0);
      add("Spine02", -0.72 * a * r, 0, 0);
      add("LeftShoulder", 0, 0, 0.78 * a * r);
      add("RightShoulder", 0, 0, -0.78 * a * r);
    }
    if (V.ondeggia) {
      add("Hips", 0, vaga(t, 0.08, 17) * V.ondeggia * calma, 0);
      add("Spine01", 0, vaga(t, 0.15, 3) * V.ondeggia * calma, 0);
    }
    if (V.testa) {
      add("neck", vaga(t, 0.2, 7) * V.testa * calma, vaga(t, 0.13, 9) * V.testa * 1.3 * calma, 0);
      add("Head", vaga(t, 0.25, 11) * V.testa * 0.7 * calma, vaga(t, 0.17, 13) * V.testa * calma, vaga(t, 0.1, 5) * V.testa * calma);
    }
    if (V.tremito) {
      add("LeftHand", vaga(t, 7, 1) * V.tremito, 0, vaga(t, 6, 2) * V.tremito);
      add("RightHand", vaga(t, 7, 3) * V.tremito, 0, vaga(t, 6, 4) * V.tremito);
    }
    if (V.occhiata) {
      // ogni tanto uno sguardo di lato (gradi: + verso la sinistra del pupazzo)
      const o = liscio(0.6, 0.85, onda(t, 1 / 7.5) * 0.5 + 0.5) * calma;
      add("Spine02", 0, V.occhiata * 0.4 * o, 0);
      add("neck", 0, V.occhiata * 0.8 * o, 0);
      add("Head", 0, V.occhiata * o, Math.abs(V.occhiata) * 0.3 * o);
    }
    if (V.tosse) {
      const c = tosse(t) * calma;
      add("Spine01", 9 * c, 0, 0);
      add("Spine02", 7 * c, 0, 0);
      add("neck", 6 * c, 0, 0);
      add("Head", 10 * c, 0, 0);
      add("LeftShoulder", 0, 0, 3 * c);
      add("RightShoulder", 0, 0, -3 * c);
    }
    if (V.singhiozzi) {
      const s = singhiozzo(t) * calma;
      add("Spine01", 3 * s, 0, 0);
      add("Spine02", 3 * s, 0, 0);
      add("LeftShoulder", 0, 0, 4 * s);
      add("RightShoulder", 0, 0, -4 * s);
      add("neck", 3 * s, 0, 0);
      add("Head", 2 * s, 0, 0);
    }
    // l'esame del collo: la testa piegata dall'altra parte e un po' in su (il bubbone e' a sinistra)
    if (esame === "collo" && !P.immobile) {
      add("neck", -(P.mostraCollo ?? 8) * mostra, -9 * mostra, 13 * mostra);
    }
    const mireE = esame && this.mireEsame[esame];
    for (const nome of Object.keys(this.guida)) {
      let mira = this.mire[nome];
      if (mireE?.[nome] && mostra > 0) mira = (mira ? mira.clone() : new THREE.Quaternion()).slerp(mireE[nome], mostra);
      this.gira(nome, R[nome], mira);
    }
    // le mani di ricambio: quelle della posa; nell'esame delle mani si cambiano con quelle aperte (a meta' movimento)
    const forme = esame === "mani" && mostra > 0.5 ? { Left: "aperta", Right: "aperta" } : (P.mani ?? {});
    this.maniDiRicambio(typeof forme === "string" ? { Left: forme, Right: forme } : forme);
  }

  // la faccia: la texture dei colori (null: quella del modello)
  faccia(texture) {
    for (const o of this.pelle) {
      o.material.map = texture || o.userData.mappa;
      o.material.needsUpdate = true;
    }
  }

  calore(v) {
    for (const o of this.pelle) o.userData.calore = v;
    for (const r of Object.values(this.ricambio)) r?.oggetto.traverse((o) => { if (o.isMesh) o.userData.calore = v; });
    for (const b of this.bubboni) b.traverse((o) => { o.userData.calore = Math.min(1, v + 0.08); });
  }

  // le mani: "nere", "fredde" o null
  coloraMani(tipo) {
    if (tipo === this.mani) return;
    this.mani = tipo;
    // le mani di ricambio si rifanno coi colori nuovi alla prossima posa
    for (const lato of ["Left", "Right"]) if (this.ricambio[lato]) this.ricambio[lato].forma = null;
    for (const o of this.pelle) {
      if (!o.isSkinnedMesh) continue;
      if (tipo) o.geometry.setAttribute("color", new THREE.BufferAttribute(this.coloriMani(o, MANI[tipo]), 3));
      o.material.vertexColors = !!tipo;
      o.material.needsUpdate = true;
    }
  }

  // i colori dei vertici delle mani: i vertici che seguono gli ossi delle mani, piu' scuri verso la punta delle dita
  // (la parte piu' lontana dal polso)
  coloriMani(o, [mano, livido, punta, da, mezzo, a]) {
    const g = o.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    const ossa = o.skeleton.bones;
    const colori = new Float32Array(pos.count * 3).fill(1);
    const c = new THREE.Color();
    for (const nome of ["LeftHand", "RightHand"]) {
      const i = ossa.findIndex((b) => b.name === nome);
      if (i < 0) continue;
      const polso = new THREE.Vector3().setFromMatrixPosition(o.skeleton.boneInverses[i].clone().invert());
      const lista = [];
      for (let k = 0; k < pos.count; k++) {
        let w = 0;
        for (let j = 0; j < 4; j++) if (si.getComponent(k, j) === i) w += sw.getComponent(k, j);
        if (w < 0.05) continue;
        _v.fromBufferAttribute(pos, k).applyMatrix4(o.bindMatrix);
        lista.push([k, _v.distanceTo(polso), w]);
      }
      const lungo = Math.max(...lista.map((m) => m[1]));
      for (const [k, d, w] of lista) {
        c.copy(mano).lerp(livido, liscio(da, mezzo, d / lungo)).lerp(punta, liscio(mezzo, a, d / lungo));
        colori[k * 3] = 1 + (c.r - 1) * w;
        colori[k * 3 + 1] = 1 + (c.g - 1) * w;
        colori[k * 3 + 2] = 1 + (c.b - 1) * w;
      }
    }
    return colori;
  }

  // i bubboni: [{ dove: "collo" | "collo_destra" | "ascella", r, aperto }]. Il punto della pelle lo trova un raggio,
  // nella posa del modello: per il collo dall'osso del collo in avanti e di lato (da fuori troverebbe prima il bavero),
  // per l'ascella dal petto verso il braccio sinistro, sotto la spalla
  segni(lista = [], pelleColore = 0xcbb596) {
    // il colore della pelle serve anche alle mani di ricambio
    if (this.pelleColore !== pelleColore) {
      this.pelleColore = pelleColore;
      for (const lato of ["Left", "Right"]) if (this.ricambio[lato]) this.ricambio[lato].forma = null;
    }
    for (const b of this.bubboni) b.parent?.remove(b);
    this.bubboni = [];
    if (!lista.length) return;
    // nella posa del modello: la radice nell'origine, le ossa come all'inizio
    const salva = { p: this.radice.position.clone(), r: this.radice.rotation.clone() };
    this.radice.position.set(0, 0, 0);
    this.radice.rotation.set(0, 0, 0);
    for (const g of Object.values(this.guida)) g.b.quaternion.copy(g.base);
    this.radice.updateMatrixWorld(true);
    const raggio = new THREE.Raycaster();
    for (const s of lista) {
      const destra = s.dove.endsWith("destra");
      let osso, dentro, verso;
      if (s.dove.startsWith("collo")) {
        osso = this.ossa.neck;
        dentro = this.dove.neck.clone();
        dentro.y += s.su ?? 0.012;
        verso = new THREE.Vector3(destra ? -1.1 : 1.1, 0, 1).normalize();
      } else {
        // l'ascella: dal petto, all'altezza di sotto la spalla, verso il fianco
        osso = this.ossa[destra ? "RightArm" : "LeftArm"] ?? this.ossa.Spine02;
        const spalla = this.dove[destra ? "RightArm" : "LeftArm"];
        dentro = new THREE.Vector3(spalla.x * 0.3, spalla.y - 0.09, spalla.z);
        verso = new THREE.Vector3(destra ? -1 : 1, -0.15, 0.25).normalize();
      }
      raggio.set(dentro, verso);
      raggio.near = 0.005;
      raggio.far = 0.3;
      const colpo = raggio.intersectObjects(this.pelle, false)[0];
      const qui = colpo ? colpo.point : dentro.clone().addScaledVector(verso, 0.06);
      const fuori = (colpo ? colpo.face.normal.clone().transformDirection(colpo.object.matrixWorld).lerp(verso, 0.5).normalize() : verso);
      const scala = osso.getWorldScale(_w).x;
      const fuoriLocale = fuori.clone().transformDirection(osso.matrixWorld.clone().invert());
      osso.worldToLocal(qui);
      const r = s.r ?? (s.aperto ? 0.04 : 0.03);
      const m = cupola(r, pelleColore, !!s.aperto, s.aperto ? 7 : 3);
      m.position.copy(qui).addScaledVector(fuoriLocale, -0.35 * r / scala);
      m.quaternion.setFromUnitVectors(SU, fuoriLocale);
      m.scale.set(1.15, s.aperto ? 0.8 : 0.72, 1).divideScalar(scala);
      m.userData.chi = this.chi;
      m.userData.calore = 1;
      m.userData.dove = s.dove;
      osso.add(m);
      this.bubboni.push(m);
    }
    this.radice.position.copy(salva.p);
    this.radice.rotation.copy(salva.r);
    this.radice.updateMatrixWorld(true);
  }

  // un oggetto attaccato a un osso (la medaglietta al collo, il bastone in mano, il rosario): posizione e rotazione
  // nel riferimento del pupazzo, nella posa del modello
  attacca(oggetto, nomeOsso, pos = [0, 0, 0], rot = [0, 0, 0]) {
    // l'osso della mano e' schiacciato dalle mani di ricambio: le cose in mano seguono l'avambraccio
    if (/Hand$/.test(nomeOsso) && this.ossa[nomeOsso.replace("Hand", "ForeArm")]) nomeOsso = nomeOsso.replace("Hand", "ForeArm");
    const osso = this.ossa[nomeOsso];
    if (!osso) return;
    oggetto.traverse((o) => { o.userData.chi = this.chi; });
    const scala = osso.getWorldScale(_w).x;
    const g = this.guida[nomeOsso];
    // dal riferimento del pupazzo (posa del modello) a quello dell'osso
    const qOsso = g.qp.clone().multiply(g.base);
    const p = new THREE.Vector3(...pos).sub(this.dove[nomeOsso]).applyQuaternion(qOsso.clone().invert()).divideScalar(scala);
    oggetto.position.copy(p);
    oggetto.quaternion.copy(qOsso.clone().invert().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0] * GRADI, rot[1] * GRADI, rot[2] * GRADI))));
    oggetto.scale.divideScalar(scala);
    osso.add(oggetto);
    this.attaccati.push(oggetto);
  }

  stacca() {
    for (const o of this.attaccati) o.parent?.remove(o);
    this.attaccati = [];
  }

  // i punti degli esami e delle frasi, nella posa di adesso: una lista di [punto, raggio] (le ascelle e le mani sono due)
  ancore(parte) {
    const p = (osso, q) => this.ossa[osso].localToWorld(q.clone());
    switch (parte) {
      case "occhi": return [[p("Head", this.punti.occhi.p), 0.05]];
      case "bocca": return [[p("Head", this.punti.bocca.p), 0.035]];
      case "naso": return [[p("Head", this.punti.naso.p), 0.03]];
      case "collo": {
        const b = this.bubboni.find((x) => x.userData.dove?.startsWith("collo") && x.visible);
        return [[b ? b.getWorldPosition(new THREE.Vector3()) : p("neck", this.punti.gola.p), 0.05]];
      }
      case "ascelle": return ["Left", "Right"].map((l) => {
        const b = this.bubboni.find((x) => x.userData.dove === (l === "Left" ? "ascella" : "ascella_destra") && x.visible);
        if (b) return [b.getWorldPosition(new THREE.Vector3()), 0.055];
        const spalla = this.ossa[`${l}Arm`].getWorldPosition(new THREE.Vector3());
        const petto = this.ossa.Spine02.getWorldPosition(new THREE.Vector3());
        return [spalla.lerp(petto, 0.22).add(new THREE.Vector3(0, -0.07, 0)), 0.055];
      });
      case "mani": return ["Left", "Right"].map((l) => {
        const polso = this.ossa[`${l}Hand`].getWorldPosition(new THREE.Vector3());
        const gomito = this.ossa[`${l}ForeArm`].getWorldPosition(new THREE.Vector3());
        return [polso.addScaledVector(polso.clone().sub(gomito).normalize(), 0.06), 0.075];
      });
      case "testa": return [[p("Head", this.punti.naso.p).add(new THREE.Vector3(0, 0.12, 0)), 0.1]];
      default: return [];
    }
  }
}
