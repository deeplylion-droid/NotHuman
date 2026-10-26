// La stanza del medico in 3D: la camera in affitto sopra il bar, dove si cammina in prima persona come nella
// casa di NINAH. Three.js disegna su un canvas fuori dallo schermo, che diventa la sorgente della videocamera
// (vhs.js): la stanza ha lo stesso VHS del resto del gioco. Cliccando un oggetto il medico ci va e lo usa;
// cosa succede (la scrivania che si apre in 2D, la porta, il letto...) lo decide gioco.js con onUsa.
// Texture e modelli si preparano con tools/prepara_stanza.py.
import * as THREE from "../lib/three.js";

const IMG = "img/stanza/";
const MOD = "modelli/";

// la stanza: 3,4 x 4 metri, alta 2,75. x verso destra (est), z verso chi entra; all'inizio si guarda verso -z,
// la parete della finestra con la scrivania sotto
const X0 = -1.7, X1 = 1.7, Z0 = -2.0, Z1 = 2.0, ALTA = 2.75;
const OCCHI = 1.62;
const RAGGIO = 0.24;
const PASSO = 1.45; // metri al secondo
const GIRO = 1.9; // radianti al secondo, con le frecce

// gli ingombri sul pavimento [x0, z0, x1, z1]: qui non si cammina
const INGOMBRI = {
  scrivania: [-0.65, -2.0, 0.95, -1.2],
  sedia: [-0.14, -1.2, 0.34, -0.78],
  letto: [0.74, -0.2, 1.7, 2.0],
  comodino: [0.26, 1.54, 0.74, 2.0],
  armadio: [-1.64, 1.38, -0.42, 2.0],
  termosifone: [1.5, -1.9, 1.7, -1.0],
  borsa: [-1.14, -1.95, -0.7, -1.55],
  cappotto: [-1.7, 0.6, -1.3, 1.3],
};

// le cose che si usano: dove si ferma il medico [x, z] e dove guarda [x, y, z]
const OGGETTI = {
  scrivania: { nome: "La scrivania", sosta: [0.12, -0.52], guarda: [0.12, 0.78, -1.62] },
  videoregistratore: { nome: "Il videoregistratore", sosta: [0.62, -0.62], guarda: [0.7, 0.84, -1.55] },
  finestra: { nome: "La finestra", sosta: [0.12, -0.52], guarda: [0.15, 1.75, -2.0] },
  porta: { nome: "La porta", sosta: [-1.05, -0.85], guarda: [-1.7, 1.15, -0.85] },
  letto: { nome: "Il letto", sosta: [0.3, 0.55], guarda: [1.2, 0.55, 0.75] },
  armadio: { nome: "L'armadio", sosta: [-1.0, 0.72], guarda: [-1.0, 1.25, 1.4] },
  cappotto: { nome: "Il cappotto", sosta: [-0.95, 0.95], guarda: [-1.6, 1.35, 0.95] },
  calendario: { nome: "Il calendario della ditta", sosta: [-1.0, 0.4], guarda: [-1.7, 1.5, 0.42] },
  santino: { nome: "Il santino", sosta: [0.3, 0.95], guarda: [1.7, 1.55, 0.95] },
  termosifone: { nome: "Il termosifone", sosta: [1.05, -0.75], guarda: [1.62, 0.35, -1.45] },
  borsa: { nome: "La borsa", sosta: [-0.75, -0.9], guarda: [-0.92, 0.15, -1.75] },
  orologio: { nome: "La radiosveglia", sosta: [0.3, 1.1], guarda: [0.5, 0.6, 1.77] },
};

// da dove si parte entrando nella stanza: [x, z, direzione dello sguardo in radianti, inclinazione]
const ARRIVI = {
  inizio: [0.25, 0.75, 0.08, -0.1],
  scrivania: [0.12, -0.52, 0, -0.32],
  porta: [-1.15, -0.85, -Math.PI / 2, -0.06],
  nastri: [0.62, -0.62, -0.05, -0.3],
};

// i modelli fatti con Tripo da una foto: dove stanno, quanto sono grandi, come vanno girati (Tripo li consegna
// col davanti verso +x) e a cosa servono; "fondo" schiaccia la profondita' (il cappotto sporgeva troppo dal muro),
// la lampada non fa ombra, se no il paralume coprirebbe la sua stessa luce
const MODELLI = [
  { nome: "sedia", x: 0.1, z: -0.99, alto: 0.88, rotY: Math.PI / 2, oggetto: "scrivania" },
  { nome: "lampada", x: -0.5, y: 0.76, z: -1.84, alto: 0.46, rotY: 1.15, oggetto: "scrivania", ombra: false },
  { nome: "fax", x: -0.31, y: 0.76, z: -1.6, largo: 0.33, rotY: -1.42, oggetto: "scrivania" },
  { nome: "televisore", x: 0.69, y: 0.76, z: -1.79, largo: 0.36, rotY: -1.75, oggetto: "videoregistratore" },
  // la maschera e' sdraiata sul fianco destro: il becco di profilo e la videocamera verso l'alto
  { nome: "maschera", x: 0.0, y: 0.76, z: -1.35, lungo: 0.36, rotX: Math.PI / 2, rotY: -0.25, oggetto: "scrivania" },
  { nome: "borsa", x: -0.92, z: -1.75, alto: 0.3, rotY: -1.4, oggetto: "borsa" },
  { nome: "termosifone", x: 1.58, z: -1.45, alto: 0.62, rotY: 0, oggetto: "termosifone" },
  { nome: "cappotto", x: -1.52, y: 0.42, z: 0.95, alto: 1.42, rotY: 0, fondo: 0.6, oggetto: "cappotto" },
];

// la luce della mattina e della sera
const LUCI = {
  mattina: { giorno: true, sole: 2.4, cielo: 1.1, lampada: 1.4, alone: 0.5, porta: 0.0, esposizione: 1.1 },
  sera: { giorno: false, sole: 0, cielo: 0.12, lampada: 2.4, alone: 2.6, porta: 2.2, esposizione: 1.15 },
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const angolo = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// i modelli sono glTF in un file .json (gli Artifact non servono i .glb), con la geometria dentro in base64:
// la si decodifica qui e si rimette insieme un GLB in memoria, cosi' il browser non deve leggere un indirizzo
// data: (che il sito della pagina potrebbe bloccare); le texture WebP arrivano dai file accanto
async function caricaModello(loader, nome) {
  const risposta = await fetch(MOD + nome + ".json");
  if (!risposta.ok) throw new Error(`${nome}: ${risposta.status}`);
  const j = await risposta.json();
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
  return (await loader.parseAsync(glb.buffer, MOD)).scene;
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
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, alpha: false, powerPreference: "default" });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.setPixelRatio(1);
    this.renderer = r;
    this.adatta(960);
    this.scena = new THREE.Scene();
    this.scena.background = new THREE.Color(0x050403);
    this.camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.03, 30);
    this.camera.rotation.order = "YXZ";
    this.raggio = new THREE.Raycaster();
    this.pezzi = {}; // id dell'oggetto -> mesh, per illuminarle quando ci si passa sopra
    // chi cammina: posizione sul pavimento, sguardo, percorso verso un punto o un oggetto
    this.pos = new THREE.Vector2(0, 0);
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
    // chi usa la stanza: cosa fare con un oggetto, cosa scrivere sotto il puntatore, se ora si puo' muovere
    this.onUsa = () => {};
    this.onSopra = () => {};
    this.puoi = () => true;
    this.ascolta();
  }

  // la risoluzione del 3D: bassa, tanto sopra c'e' il VHS
  adatta(larghezza) {
    const w = Math.round(clamp(larghezza, 480, 960) / 16) * 16;
    const h = Math.round(w * 9 / 16);
    if (this.canvas.width !== w || this.canvas.height !== h) this.renderer.setSize(w, h, false);
  }

  async carica() {
    const tl = new THREE.TextureLoader();
    const nomi = ["carta_parati.jpg", "pavimento.jpg", "legno.jpg", "coperta.jpg", "porta.jpg", "armadio.jpg",
      "testiera.jpg", "comodino.jpg", "santino.jpg", "calendario.jpg", "finestra.jpg", "finestra_chiusa.jpg",
      "finestra_luce.jpg", "mappa.jpg", "giornali.jpg", "cassetta.jpg", "taccuino.png", "soldi.png", "guanti.png"];
    const T = {};
    await Promise.all(nomi.map(async (n) => {
      const t = await tl.loadAsync(IMG + n);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      T[n.replace(/\.\w+$/, "")] = t;
    }));
    for (const n of ["carta_parati", "pavimento", "legno", "coperta"]) T[n].wrapS = T[n].wrapT = THREE.MirroredRepeatWrapping;
    this.T = T;
    // un modello che non arriva non ferma la stanza: manca solo quell'oggetto
    const gltf = new THREE.GLTFLoader();
    const modelli = await Promise.allSettled(MODELLI.map(async (m) => [m, await caricaModello(gltf, m.nome)]));
    this.costruisci(T);
    for (const r of modelli) {
      if (r.status === "fulfilled") this.mettiModello(...r.value);
      else console.warn("Modello non caricato:", r.reason);
    }
    this.luci();
    this.fase("mattina");
  }

  // ---------- la stanza ----------

  costruisci(T) {
    const S = this.scena;
    const mat = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
    const intera = (o) => { const m = mat(o); m.userData.intera = true; return m; };
    const carta = mat({ map: T.carta_parati, color: 0xe8dcc4 });
    const legno = mat({ map: T.legno });
    const scuro = mat({ map: T.legno, color: 0x6a4630 });
    const nero = mat({ color: 0x141414, roughness: 0.6 });
    this.mat = { scuro, nero };

    // pavimento, soffitto, pareti con la carta da parati, battiscopa
    const pav = this.piano(X1 - X0, Z1 - Z0, mat({ map: T.pavimento, color: 0xc8b8a0 }), 1.1);
    pav.rotation.x = -Math.PI / 2;
    pav.receiveShadow = true;
    pav.userData.pavimento = true;
    S.add(pav);
    this.pavimento = pav;
    const sof = this.piano(X1 - X0, Z1 - Z0, mat({ color: 0xcfc6b4, roughness: 1 }));
    sof.rotation.x = Math.PI / 2;
    sof.position.y = ALTA;
    S.add(sof);
    const pareti = [
      [X1 - X0, [0, ALTA / 2, Z0], 0], [X1 - X0, [0, ALTA / 2, Z1], Math.PI],
      [Z1 - Z0, [X0, ALTA / 2, 0], Math.PI / 2], [Z1 - Z0, [X1, ALTA / 2, 0], -Math.PI / 2],
    ];
    for (const [lungo, [x, y, z], ry] of pareti) {
      const p = this.piano(lungo, ALTA, carta, 0.55);
      p.position.set(x, y, z);
      p.rotation.y = ry;
      p.receiveShadow = true;
      S.add(p);
      const b = this.scatola(lungo, 0.08, 0.016, scuro, 0.6);
      b.position.set(x, 0.04, z);
      b.rotation.y = ry;
      b.translateZ(0.008);
      S.add(b);
    }

    // la finestra sopra la scrivania, col davanzale; di giorno i vetri fanno luce
    const fin = this.piano(1.25, 1.35, intera({ map: T.finestra, emissiveMap: T.finestra_luce, emissive: 0xffffff, roughness: 0.7 }));
    fin.position.set(0.15, 1.0 + 0.675, Z0 + 0.012);
    this.registra("finestra", fin);
    S.add(fin);
    const davanzale = this.scatola(1.36, 0.03, 0.09, mat({ color: 0xcdc6b8, roughness: 0.5 }));
    davanzale.position.set(0.15, 0.985, Z0 + 0.045);
    S.add(davanzale);

    // la porta, con la luce delle scale che passa sotto; l'interruttore
    const porta = this.piano(1.02, 2.06, intera({ map: T.porta }));
    porta.position.set(X0 + 0.012, 1.03, -0.85);
    porta.rotation.y = Math.PI / 2;
    this.registra("porta", porta);
    S.add(porta);
    this.matFessura = new THREE.MeshBasicMaterial({ color: 0xffb066 });
    const fessura = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.012), this.matFessura);
    fessura.position.set(X0 + 0.016, 0.006, -0.85);
    fessura.rotation.y = Math.PI / 2;
    S.add(fessura);
    const interruttore = this.scatola(0.014, 0.11, 0.075, mat({ color: 0xe8e2d2, roughness: 0.4 }));
    interruttore.position.set(X0 + 0.007, 1.05, -0.12);
    S.add(interruttore);

    // il calendario della ditta e il santino
    const cal = this.piano(0.3, 0.39, intera({ map: T.calendario }));
    cal.position.set(X0 + 0.01, 1.52, 0.42);
    cal.rotation.y = Math.PI / 2;
    this.registra("calendario", cal);
    S.add(cal);
    const san = this.piano(0.24, 0.32, intera({ map: T.santino, roughness: 0.5 }));
    san.position.set(X1 - 0.012, 1.55, 0.95);
    san.rotation.y = -Math.PI / 2;
    this.registra("santino", san);
    S.add(san);

    // la scrivania: piano, gambe, fascia
    const tavolo = new THREE.Group();
    const piano = this.scatola(1.6, 0.04, 0.78, legno, 0.8);
    piano.position.set(0.15, 0.74, -1.59);
    tavolo.add(piano);
    for (const [x, z] of [[-0.61, -1.94], [0.91, -1.94], [-0.61, -1.24], [0.91, -1.24]]) {
      const g = this.scatola(0.05, 0.72, 0.05, scuro, 0.6);
      g.position.set(x, 0.36, z);
      tavolo.add(g);
    }
    for (const [w, d, x, z] of [[1.47, 0.02, 0.15, -1.235], [1.47, 0.02, 0.15, -1.945], [0.02, 0.66, -0.61, -1.59], [0.02, 0.66, 0.91, -1.59]]) {
      const f = this.scatola(w, 0.1, d, scuro, 0.6);
      f.position.set(x, 0.67, z);
      tavolo.add(f);
    }
    this.registra("scrivania", tavolo);
    S.add(tavolo);

    // sulla scrivania, come nel disegno: giornali, mappa, stato di famiglia, soldi, guanti, videoregistratore,
    // cassette
    const su = 0.76;
    const carte = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const top = i === 3;
      const g = this.scatola(0.34, 0.008, 0.24, [mat({ color: 0xd9d2bf }), mat({ color: 0xd9d2bf }),
        top ? intera({ map: T.giornali }) : mat({ color: 0xd9d2bf }), mat({ color: 0xd9d2bf }),
        mat({ color: 0xcfc7b2 }), mat({ color: 0xcfc7b2 })]);
      g.position.set(0.15 + (i % 2) * 0.008, su + 0.004 + i * 0.008, -1.84 + i * 0.004);
      g.rotation.y = (i - 1.5) * 0.02;
      carte.add(g);
    }
    const mappa = this.piano(0.5, 0.28, intera({ map: T.mappa, roughness: 0.8 }));
    mappa.rotation.x = -Math.PI / 2;
    mappa.position.set(0.15, su + 0.002, -1.6);
    carte.add(mappa);
    for (const [n, w, d, x, z, ry] of [["taccuino", 0.12, 0.16, -0.43, -1.33, 0.06], ["soldi", 0.13, 0.14, -0.25, -1.36, -0.1],
      ["guanti", 0.21, 0.21, 0.27, -1.34, 0.05]]) {
      const p = this.piano(w, d, intera({ map: T[n], transparent: true, alphaTest: 0.4 }));
      p.rotation.set(-Math.PI / 2, 0, ry);
      p.position.set(x, su + 0.003, z);
      p.receiveShadow = true;
      carte.add(p);
    }
    this.registra("scrivania", carte);
    S.add(carte);

    // il videoregistratore e le cassette: il display segna l'ora
    this.display = this.disegnaDisplay();
    const vcr = this.scatola(0.38, 0.085, 0.27, [mat({ color: 0x3a1714, roughness: 0.5 }), mat({ color: 0x3a1714, roughness: 0.5 }),
      mat({ color: 0x45201b, roughness: 0.5 }), nero, intera({ map: this.display, roughness: 0.4 }), nero]);
    vcr.position.set(0.7, su + 0.0425, -1.5);
    vcr.rotation.y = -0.03;
    this.registra("videoregistratore", vcr);
    S.add(vcr);
    const nastri = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const c = this.scatola(0.105, 0.026, 0.19, [nero, nero, intera({ map: T.cassetta, roughness: 0.5 }), nero, nero, nero]);
      c.position.set(0.6 + i * 0.118, su + 0.013, -1.29);
      c.rotation.y = (i - 1) * 0.04;
      nastri.add(c);
    }
    this.registra("videoregistratore", nastri);
    S.add(nastri);

    // il letto lungo la parete di destra, il comodino con la radiosveglia
    const letto = new THREE.Group();
    const telaio = this.scatola(0.94, 0.22, 2.1, scuro, 0.7);
    telaio.position.set(1.22, 0.24, 0.9);
    letto.add(telaio);
    for (const [x, z] of [[0.79, -0.12], [1.65, -0.12], [0.79, 1.9], [1.65, 1.9]]) {
      const g = this.scatola(0.05, 0.13, 0.05, scuro, 0.6);
      g.position.set(x, 0.065, z);
      letto.add(g);
    }
    const coperta = this.scatola(0.98, 0.2, 1.8, mat({ map: T.coperta, roughness: 1 }), 0.45);
    coperta.position.set(1.22, 0.43, 0.74);
    letto.add(coperta);
    const cuscino = this.scatola(0.7, 0.12, 0.34, mat({ color: 0xe6dfcf, roughness: 1 }));
    cuscino.position.set(1.22, 0.58, 1.72);
    cuscino.rotation.y = 0.04;
    letto.add(cuscino);
    const testiera = this.scatola(0.98, 0.95, 0.04, [scuro, scuro, scuro, scuro, scuro, intera({ map: T.testiera })], 0.6);
    testiera.position.set(1.22, 0.6, 1.965);
    letto.add(testiera);
    this.registra("letto", letto);
    S.add(letto);
    const comodino = this.scatola(0.46, 0.55, 0.42, [scuro, scuro, scuro, scuro, scuro, intera({ map: T.comodino })], 0.6);
    comodino.position.set(0.5, 0.275, 1.77);
    S.add(comodino);
    this.sveglia = this.disegnaSveglia();
    const radio = this.scatola(0.2, 0.08, 0.1, [nero, nero, nero, nero, nero, intera({ map: this.sveglia, roughness: 0.4 })]);
    radio.position.set(0.5, 0.59, 1.75);
    radio.rotation.y = 0.25;
    this.registra("orologio", radio);
    S.add(radio);

    // l'armadio nell'angolo
    const armadio = this.scatola(1.2, 2.0, 0.6, [scuro, scuro, scuro, scuro, scuro, intera({ map: T.armadio })], 0.7);
    armadio.position.set(-1.03, 1.0, 1.69);
    this.registra("armadio", armadio);
    S.add(armadio);

    // la lampadina nuda al soffitto, spenta
    const filo = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.36), nero);
    filo.position.set(0, ALTA - 0.18, 0.2);
    S.add(filo);
    const bulbo = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), mat({ color: 0xd8d2c4, roughness: 0.2 }));
    bulbo.position.set(0, ALTA - 0.4, 0.2);
    S.add(bulbo);
  }

  // un piano che ripete la texture ogni "metri"
  piano(w, h, m, metri = null) {
    const g = new THREE.PlaneGeometry(w, h);
    if (metri) {
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / metri, uv.getY(i) * h / metri);
    }
    const mesh = new THREE.Mesh(g, m);
    mesh.receiveShadow = true;
    return mesh;
  }

  // una scatola con un materiale (o uno per faccia: +x, -x, +y, -y, +z, -z); con "metri" le facce ripetono la
  // texture ogni tot metri, tranne quelle con un'immagine intera (il davanti di armadio, comodino...)
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

  // un modello di Tripo: girato, messo in scala e appoggiato al suo posto
  mettiModello(m, scena) {
    const obj = new THREE.Group();
    obj.add(scena);
    scena.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = m.ombra !== false;
      o.receiveShadow = true;
      for (const mt of [].concat(o.material)) {
        mt.metalness = 0;
        mt.roughness = Math.max(mt.roughness ?? 0.85, 0.65);
      }
    });
    obj.rotation.set(m.rotX || 0, m.rotY || 0, m.rotZ || 0, "YXZ");
    obj.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(obj);
    const dim = box.getSize(new THREE.Vector3());
    const s = m.alto ? m.alto / dim.y : m.largo ? m.largo / dim.x : m.lungo ? m.lungo / Math.max(dim.x, dim.z) : 1;
    obj.scale.set(s * (m.fondo || 1), s, s);
    obj.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(obj);
    const c = box.getCenter(new THREE.Vector3());
    obj.position.set(m.x - c.x, (m.y || 0) - box.min.y, m.z - c.z);
    if (m.oggetto) this.registra(m.oggetto, obj);
    this.scena.add(obj);
    this.modelli = this.modelli || {};
    this.modelli[m.nome] = obj;
    return obj;
  }

  // collega una mesh (o un gruppo) a un oggetto che si usa; i materiali si copiano per poterli illuminare da soli
  registra(id, obj) {
    obj.traverse((o) => {
      if (!o.isMesh) return;
      o.userData.oggetto = id;
      o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
      (this.pezzi[id] = this.pezzi[id] || []).push(o);
    });
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

  aggiornaDisplay(acceso) {
    const g = this.ctxDisplay;
    g.fillStyle = "#2a100d";
    g.fillRect(0, 0, 256, 58);
    g.fillStyle = "#120807";
    g.fillRect(14, 12, 120, 10);
    g.fillStyle = "#0c0606";
    g.fillRect(150, 10, 74, 30);
    g.fillStyle = "#5a3029";
    for (let i = 0; i < 5; i++) g.fillRect(16 + i * 22, 34, 16, 8);
    if (acceso) {
      g.fillStyle = "#64ffb0";
      g.font = "bold 24px monospace";
      g.fillText("12:00", 152, 34);
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
    // la testa della lampada: in alto, dalla parte verso cui guarda il paralume; dentro, la lampadina accesa
    let testa = new THREE.Vector3(-0.41, 1.12, -1.8);
    const lm = this.modelli?.lampada;
    if (lm) {
      const b = new THREE.Box3().setFromObject(lm);
      const s = b.getSize(new THREE.Vector3());
      const dir = new THREE.Vector3(Math.sin(lm.rotation.y), 0, Math.cos(lm.rotation.y));
      testa = b.getCenter(new THREE.Vector3()).addScaledVector(dir, (Math.abs(dir.x) * s.x + Math.abs(dir.z) * s.z) / 2 - 0.1);
      testa.y = b.max.y - 0.1;
    }
    const lampadina = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff1d6 }));
    lampadina.position.copy(testa).add(new THREE.Vector3(0, -0.03, 0));
    S.add(lampadina);
    const lamp = new THREE.SpotLight(0xffb46b, 2, 5, 0.95, 0.65, 2);
    lamp.position.copy(testa);
    lamp.target.position.set(0.1, 0.76, -1.5);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(1024, 1024);
    lamp.shadow.bias = -0.0006;
    lamp.shadow.normalBias = 0.02;
    lamp.shadow.camera.near = 0.05;
    lamp.shadow.camera.far = 5;
    S.add(lamp, lamp.target);
    // la luce che rimbalza dal paralume sul resto della stanza
    const alone = new THREE.PointLight(0xffa35a, 1.5, 9, 2);
    alone.position.copy(testa).add(new THREE.Vector3(0.1, 0.25, 0.35));
    S.add(alone);
    const cielo = new THREE.HemisphereLight(0xb9c4d2, 0x3a2a1e, 0.5);
    S.add(cielo);
    const sole = new THREE.DirectionalLight(0xcfd6e2, 1.2);
    sole.position.set(0.15, 2.3, -2.6);
    sole.target.position.set(0.25, 0.2, 0.8);
    S.add(sole, sole.target);
    this.L = { lamp, alone, cielo, sole };
  }

  // la mattina la tapparella e' alzata e dai vetri entra il giorno; la sera e' abbassata e resta la lampada
  fase(f) {
    const l = LUCI[f] || LUCI.mattina;
    this.L.lamp.intensity = l.lampada;
    this.L.alone.intensity = l.alone;
    this.L.cielo.intensity = l.cielo;
    this.L.sole.intensity = l.sole;
    this.L.sole.visible = l.sole > 0;
    this.renderer.toneMappingExposure = l.esposizione;
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
    this.yaw = yaw;
    this.pitch = pitch;
    this.percorso = [];
    this.meta = null;
    this.verso = null;
    this.tasti = {};
    this.attiva = true;
    this.schermo.dataset.sopra = "";
  }

  esci() {
    this.attiva = false;
    this.percorso = [];
    this.meta = null;
    this.verso = null;
    this.giu = null;
    this.evidenzia(null);
  }

  libero(x, z) {
    if (x < X0 + RAGGIO || x > X1 - RAGGIO || z < Z0 + RAGGIO || z > Z1 - RAGGIO) return false;
    for (const [a, b, c, d] of Object.values(INGOMBRI))
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
    if (this.attiva) this.aggiorna(Math.min(dt, 0.1));
    this.renderer.render(this.scena, this.camera);
  }

  aggiorna(dt) {
    const k = this.tasti;
    const puoi = this.puoi();
    const avanti = puoi ? (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) : 0;
    const lato = puoi ? (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0) : 0;
    const gira = puoi ? (k.ArrowRight ? 1 : 0) - (k.ArrowLeft ? 1 : 0) : 0;
    let cammina = false;
    if (gira) this.yaw -= gira * GIRO * dt;
    if (avanti || lato) {
      this.percorso = [];
      this.meta = null;
      this.verso = null;
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      let vx = fx * avanti + rx * lato, vz = fz * avanti + rz * lato;
      const n = Math.hypot(vx, vz);
      vx /= n; vz /= n;
      cammina = this.sposta(vx * PASSO * dt, vz * PASSO * dt);
    } else if (this.percorso.length) {
      const [tx, tz] = this.percorso[0];
      const dx = tx - this.pos.x, dz = tz - this.pos.y;
      const d = Math.hypot(dx, dz);
      const s = Math.min(d, PASSO * dt);
      if (d > 0.001) {
        // lo sguardo segue la strada
        const voluto = Math.atan2(-dx, -dz);
        this.yaw += angolo(voluto - this.yaw) * Math.min(1, dt * 5);
        cammina = this.sposta(dx / d * s, dz / d * s);
      }
      if (d < 0.03 || !cammina) {
        this.percorso.shift();
        if (!this.percorso.length) this.arriva();
      }
    } else if (this.verso) {
      // arrivato: si gira verso l'oggetto, poi lo usa
      const v = this.verso;
      v.t += dt;
      const f = Math.min(1, dt * 7);
      this.yaw += angolo(v.yaw - this.yaw) * f;
      this.pitch += (v.pitch - this.pitch) * f;
      if (v.t > 0.4) {
        this.verso = null;
        this.onUsa(v.id);
      }
    }
    if (cammina) this.passi += dt * 9;
    const dondola = cammina ? Math.sin(this.passi) * 0.012 : 0;
    this.camera.position.set(this.pos.x, OCCHI + dondola, this.pos.y);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
    // il display del videoregistratore lampeggia ogni mezzo secondo
    this.tempo = (this.tempo || 0) + dt;
    const acceso = Math.floor(this.tempo * 2) % 2 === 0;
    if (acceso !== this.acceso) { this.acceso = acceso; this.aggiornaDisplay(acceso); }
  }

  // ---------- puntatore, tocchi, tastiera ----------

  // cosa c'e' sotto un punto dello schermo (frazioni da 0 a 1)
  colpisci(fx, fy) {
    this.raggio.setFromCamera(new THREE.Vector2(fx * 2 - 1, 1 - fy * 2), this.camera);
    const hit = this.raggio.intersectObjects(this.scena.children, true)[0];
    if (!hit) return null;
    return { punto: hit.point, oggetto: hit.object.userData.oggetto || null, pavimento: !!hit.object.userData.pavimento, d: hit.distance };
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
    this.onSopra(id ? OGGETTI[id].nome : null);
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
    const fuori = (e) => e.target.closest?.("button, #hud, #comandi, #foglio, .chiave, #ruota");
    const frazioni = (e) => {
      const r = this.schermo.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, r.width];
    };
    this.schermo.addEventListener("pointerdown", (e) => {
      if (!this.attiva || fuori(e) || this.giu || (e.pointerType === "mouse" && e.button !== 0)) return;
      const [fx, fy] = frazioni(e);
      this.giu = { id: e.pointerId, x: e.clientX, y: e.clientY, fx, fy, mosso: false, tipo: e.pointerType };
      try { this.schermo.setPointerCapture(e.pointerId); } catch { /* il puntatore e' gia' sparito */ }
    });
    this.schermo.addEventListener("pointermove", (e) => {
      if (!this.attiva) return;
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
          this.verso = null;
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
      this.usa(this.colpisci(g.fx, g.fy));
    };
    this.schermo.addEventListener("pointerup", su);
    this.schermo.addEventListener("pointercancel", su);
    this.schermo.addEventListener("pointerleave", () => { if (this.attiva && !this.giu) this.evidenzia(null); });
    const tasti = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    window.addEventListener("keydown", (e) => {
      if (!this.attiva || e.target.closest?.("input, textarea, #foglio")) return;
      if (tasti.includes(e.code)) {
        this.tasti[e.code] = true;
        e.preventDefault();
      } else if ((e.code === "KeyE" || e.code === "Enter") && this.puoi() && !e.target.closest?.("button")) {
        // usa quello che c'e' al centro dello sguardo, se e' a portata
        const c = this.colpisci(0.5, 0.5);
        if (c && c.oggetto && c.d < 3.2) { e.preventDefault(); this.usa(c); }
      }
    });
    window.addEventListener("keyup", (e) => { delete this.tasti[e.code]; });
    window.addEventListener("blur", () => { this.tasti = {}; });
  }
}
