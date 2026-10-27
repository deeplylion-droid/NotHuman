// Le visite in plastilina (27 ottobre: l'utente ha scelto la plastilina per tutto il gioco). Ogni luogo e' una stanza
// 3D (scene3d.js) coi pupazzi della famiglia, ripresa dalla videocamera del medico ferma sulla porta: la testa segue
// appena il puntatore, la lampada sulla maschera illumina dove si guarda, lo zoom stringe sulla parte del corpo da
// esaminare (e la persona la mostra: le mani in avanti, il braccio alzato, la testa piegata). Le stanze buie si vedono
// in verde (la visione notturna), i nastri della sera anche all'infrarosso: il calore di ogni cosa, e quello che sta
// dietro i muri. Il mondo si muove a scatti, 12 pose al secondo, come uno stop-motion.
// La logica del gioco resta quella delle scene 2D (gioco.js): questa classe tiene aggiornati, a ogni fotogramma, i
// punti che il gioco usa (le parti del corpo, dove si scrivono le frasi, le zone, i calori nascosti) proiettando sullo
// schermo i punti della scena 3D, e risponde ai clic col raggio.
// Three.js disegna su un canvas fuori dallo schermo, che diventa la sorgente della videocamera (vhs.js, senza effetti).
import * as THREE from "../lib/three.js";
import * as C from "./plastilina.js";
import { STANZE, POSE, POSTI, ASPETTO, FACCE, stanzaDi, CALORE_MORTO } from "./scene3d.js";

const FOV = 54;
const SU = new THREE.Vector3(0, 1, 0);
const POSE_AL_SECONDO = 12;
const PARTI = ["occhi", "bocca", "collo", "ascelle", "mani"];
// quanto occupa nello zoom la parte guardata (frazione dell'altezza dello schermo)
const IN_ZOOM = 0.24;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// i colori della videocamera termica (gli stessi di vhs.js) e della visione notturna
const GLSL_COLORI = `
  vec3 irMap(float l) {
    float t = clamp(l, 0.0, 1.0) * 5.0;
    vec3 c = mix(vec3(6.0, 2.0, 4.0), vec3(34.0, 10.0, 17.0), clamp(t, 0.0, 1.0));
    c = mix(c, vec3(84.0, 30.0, 44.0), clamp(t - 1.0, 0.0, 1.0));
    c = mix(c, vec3(150.0, 80.0, 94.0), clamp(t - 2.0, 0.0, 1.0));
    c = mix(c, vec3(214.0, 162.0, 172.0), clamp(t - 3.0, 0.0, 1.0));
    return mix(c, vec3(255.0, 236.0, 232.0), clamp(t - 4.0, 0.0, 1.0)) / 255.0;
  }
  vec3 greenMap(float l) {
    float t = clamp(l, 0.0, 1.0) * 4.0;
    vec3 c = mix(vec3(2.0, 10.0, 8.0), vec3(8.0, 38.0, 30.0), clamp(t, 0.0, 1.0));
    c = mix(c, vec3(22.0, 96.0, 80.0), clamp(t - 1.0, 0.0, 1.0));
    c = mix(c, vec3(80.0, 178.0, 150.0), clamp(t - 2.0, 0.0, 1.0));
    return mix(c, vec3(196.0, 248.0, 224.0), clamp(t - 3.0, 0.0, 1.0)) / 255.0;
  }
  float vignetta(vec2 uv, float forza) {
    vec2 v = (uv - 0.5) * vec2(1.0, 0.9);
    return 1.0 - forza * pow(clamp(length(v) * 1.41, 0.0, 1.0), 2.2);
  }`;

function quadro(frag, uniforms) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms, fragmentShader: GLSL_COLORI + frag,
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    depthTest: false, depthWrite: false }));
  m.frustumCulled = false;
  const sc = new THREE.Scene();
  sc.add(m);
  return sc;
}

// i piccoli oggetti fatti qui: il bastone della nonna, la medaglietta, il rosario, il fazzoletto con il sangue
function oggetto(cosa) {
  const g = new THREE.Group();
  const pezzo = (geo, colore, ruvido = 0.6, impronte = 0.5) => {
    const m = new THREE.Mesh(geo, C.materiale({ color: colore, ruvido, impronte }));
    m.castShadow = true;
    g.add(m);
    return m;
  };
  if (cosa === "medaglietta") {
    const d = pezzo(new THREE.CylinderGeometry(0.012, 0.012, 0.003, 20), 0xc9a24a, 0.35, 0.2);
    d.rotation.x = Math.PI / 2;
    const c = pezzo(new THREE.TorusGeometry(0.004, 0.0012, 6, 12), 0xc9a24a, 0.35, 0.2);
    c.position.y = 0.014;
  } else if (cosa === "rosario") {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const b = pezzo(new THREE.SphereGeometry(0.0065, 8, 6), 0x3b2a1e, 0.5, 0.2);
      b.position.set(Math.cos(a) * 0.04, Math.sin(a) * 0.055 - 0.02, 0);
    }
    const v = pezzo(C.scatola(0.006, 0.04, 0.004, 0.001, 0), 0x3b2a1e);
    v.position.set(0, -0.1, 0);
    const o = pezzo(C.scatola(0.026, 0.006, 0.004, 0.001, 0), 0x3b2a1e);
    o.position.set(0, -0.09, 0);
  } else if (cosa === "fazzoletto") {
    const geo = new THREE.SphereGeometry(0.05, 20, 14);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const k = 1 + C.rumore3(x * 40, y * 40, z * 40) * 0.25;
      pos.setXYZ(i, x * k, y * k * 0.7, z * k * 0.55);
      // il bianco sporco, con le macchie di sangue scuro da una parte
      const s = C.liscio(0.15, 0.6, C.rumore3(x * 60 + 3, y * 60, z * 60) * 0.5 + 0.5) * C.liscio(-0.01, 0.03, z);
      col.set([0.92 - 0.5 * s, 0.9 - 0.75 * s, 0.86 - 0.74 * s], i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, C.materiale({ vertexColors: true, ruvido: 0.7, impronte: 0.6 }));
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

// il bastone: dal pavimento alla mano, col manico curvo
function bastone(alto) {
  const g = new THREE.Group();
  const mat = C.materiale({ color: 0x5a3d26, ruvido: 0.55, impronte: 0.6 });
  const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, alto - 0.04, 10), mat);
  asta.position.y = (alto - 0.04) / 2;
  const manico = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.011, 8, 16, Math.PI), mat);
  manico.position.set(0.04, alto - 0.04, 0);
  for (const m of [asta, manico]) { m.castShadow = true; g.add(m); }
  return g;
}

export class Visita3D {
  static disponibile() {
    try {
      return !!document.createElement("canvas").getContext("webgl2");
    } catch {
      return false;
    }
  }

  constructor() {
    this.canvas = document.createElement("canvas");
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    r.setPixelRatio(1);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.8;
    this.renderer = r;
    this.camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.05, 40);
    this.scena = new THREE.Scene();
    this.scena.background = new THREE.Color(0x000000);
    this.scena.add(new THREE.HemisphereLight(0xc9d4e0, 0x1a1712, 0.05));
    // la lampada sulla maschera: segue la testa; meno forte del primo giorno della prova (27 ottobre: "la luce
    // illumina ancora troppo intensamente")
    this.faro = new THREE.SpotLight(0xffe6c4, 6.2, 0, 0.5, 0.8, 1.3);
    this.faro.userData.forza = 6.2;
    this.ombre(this.faro, 2048, 0.25, 10, 2);
    this.scena.add(this.faro, this.faro.target);
    this.raggio = new THREE.Raycaster();
    this.stanze = {};
    this.pupazzi = {}; // le promesse dei pupazzi che si caricano
    this.attori = {}; // i pupazzi caricati
    this.presenti = [];
    this.attivi = []; // i calori nascosti del luogo
    this.stanza = null;
    this.luogo = null;
    this.modo = "giorno";
    this.testa = { x: 0, y: 0, tx: 0, ty: 0 };
    this.zoom = { v: 0, verso: 0, chi: null, parte: null, mirino: new THREE.Vector3(), fatto: null, fov: FOV };
    this.tempo = 0;
    this.ultimaPosa = -1;
    this.sopra = null;
    this.facce = {};
    // l'infrarosso e la visione notturna: la scena in un quadro, il calore in un altro, poi i colori
    this.rtScena = new THREE.WebGLRenderTarget(16, 9, { type: THREE.HalfFloatType });
    this.rtCalore = new THREE.WebGLRenderTarget(16, 9, { type: THREE.HalfFloatType });
    this.passo = { value: new THREE.Vector2(1 / 16, 1 / 9) };
    this.scenaIr = quadro(`
      uniform sampler2D tScena, tCalore;
      uniform vec2 passo;
      varying vec2 vUv;
      void main() {
        vec3 c = texture2D(tScena, vUv).rgb;
        float y = sqrt(clamp(dot(c, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0));
        float h = 0.0;
        for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) h += texture2D(tCalore, vUv + vec2(float(i), float(j)) * passo).r;
        h /= 25.0;
        gl_FragColor = vec4(irMap(y * 0.3 + h * 0.86) * vignetta(vUv, 0.35), 1.0);
      }`, { tScena: { value: this.rtScena.texture }, tCalore: { value: this.rtCalore.texture }, passo: this.passo });
    this.scenaNotte = quadro(`
      uniform sampler2D tScena;
      varying vec2 vUv;
      void main() {
        vec3 c = texture2D(tScena, vUv).rgb;
        float y = sqrt(clamp(dot(c, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0));
        gl_FragColor = vec4(greenMap(clamp((y - 0.35) * 1.5 + 0.5, 0.0, 1.0)) * vignetta(vUv, 0.45), 1.0);
      }`, { tScena: { value: this.rtScena.texture } });
    this.dimensione(1280);
  }

  ombre(luce, lato, vicino, lontano, morbide) {
    luce.castShadow = true;
    luce.shadow.mapSize.set(lato, lato);
    luce.shadow.camera.near = vicino;
    luce.shadow.camera.far = lontano;
    luce.shadow.bias = -0.0002;
    luce.shadow.normalBias = 0.006;
    luce.shadow.radius = morbide;
  }

  // la risoluzione: quella dello schermo (fino a 2560 punti di larghezza)
  dimensione(larghezza) {
    const w = Math.round(clamp(larghezza, 640, 2560) / 16) * 16, h = Math.round(w * 9 / 16);
    if (this.canvas.width === w && this.canvas.height === h) return;
    this.renderer.setSize(w, h, false);
    this.rtScena.setSize(w, h);
    this.rtCalore.setSize(Math.round(w / 3), Math.round(h / 3));
    this.passo.value.set(1 / this.rtCalore.width, 1 / this.rtCalore.height);
  }

  // ---------- costruire ----------

  // prepara le stanze e i pupazzi di un giorno (i luoghi del gioco e chi ci sta), per non aspettare entrando
  async prepara(luoghi, avanzamento = () => {}) {
    const stanze = [...new Set(Object.keys(luoghi).map(stanzaDi))].filter((s) => STANZE[s]);
    const persone = [...new Set(Object.values(luoghi).flatMap((L) => L.persone))];
    let fatti = 0;
    const totale = stanze.length + persone.length;
    const uno = () => avanzamento(++fatti / totale);
    // le mani di ricambio servono a tutti i pupazzi: prima di loro
    await C.caricaMani();
    await Promise.all([...stanze.map((s) => this.preparaStanza(s).then(uno)), ...persone.map((p) => this.pupazzo(p).then(uno))]);
  }

  pupazzo(chi) {
    this.pupazzi[chi] ??= C.Pupazzo.carica(chi).then((pp) => (this.attori[chi] = pp));
    return this.pupazzi[chi];
  }

  preparaStanza(nome) {
    this.stanze[nome] ??= this.costruisci(nome);
    return this.stanze[nome];
  }

  async costruisci(nome) {
    const s = STANZE[nome];
    const [L, P, A] = s.misure;
    const g = new THREE.Group();
    g.name = nome;
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
    const mat = async ([tex, metri], impronte = 1) => C.materiale({ ...(await C.superficie(tex, metri)), impronte });
    const muri = await mat(s.superfici.muri);
    // pavimento e soffitto
    const pav = mesh(C.piano(L, P, 1), await mat(s.superfici.pavimento), 0, 0, -P / 2);
    pav.rotation.x = -Math.PI / 2;
    const sof = mesh(C.piano(L, P, 2), await mat(s.superfici.soffitto, 0.8), 0, A, -P / 2);
    sof.rotation.x = Math.PI / 2;
    // i muri: sinistra, destra, il fondo coi suoi vani, quello della porta da cui si guarda
    mesh(C.piano(P, A, 3), muri, -L / 2, A / 2, -P / 2, Math.PI / 2);
    mesh(C.piano(P, A, 4), muri, L / 2, A / 2, -P / 2, -Math.PI / 2);
    const fondo = s.vani.filter((v) => v.muro === "fondo");
    mesh(C.muro(L, A, fondo.map((v) => [v.x0, v.x1, 0, v.h])), muri, 0, 0, -P);
    const [i0, i1, ih] = s.ingresso;
    mesh(C.muro(L, A, [[-i1, -i0, 0, ih]]), muri, 0, 0, 0, Math.PI);
    // gli stipiti delle porte
    const stipite = C.materiale({ map: C.tinta("#d9cfb8", ["#cfc3a8", "#e4dbc6", "#bfb397"]), impronte: 0.7 });
    const stipiti = (x0, x1, h, z) => {
      for (const x of [x0 - 0.035, x1 + 0.035]) mesh(C.scatola(0.07, h + 0.05, 0.06), stipite, x, (h + 0.05) / 2, z);
      mesh(C.scatola(x1 - x0 + 0.14, 0.07, 0.06), stipite, (x0 + x1) / 2, h + 0.035, z);
    };
    stipiti(i0, i1, ih, -0.03);
    // dietro i vani: il corridoio buio con la lampadina in fondo, o uno stanzino
    const luci = [];
    for (const v of fondo) {
      stipiti(v.x0, v.x1, v.h, -P + 0.02);
      // lo spessore del muro sopra il vano
      mesh(C.scatola(v.x1 - v.x0, A - v.h, 0.2), muri, (v.x0 + v.x1) / 2, (A + v.h) / 2, -P - 0.1);
      const dietro = v.corridoio || v.stanzino;
      if (!dietro) continue;
      const x0 = dietro.x0 ?? v.x0 - 0.3, x1 = dietro.x1 ?? v.x1 + 0.4;
      const cw = x1 - x0, cx = (x0 + x1) / 2, ch = dietro.h ?? 2.4, cz = -P - dietro.p / 2;
      const cm = await mat(dietro.muri);
      const cp = mesh(C.piano(cw, dietro.p, 11), await mat(dietro.pavimento), cx, 0, cz);
      cp.rotation.x = -Math.PI / 2;
      const cs = mesh(C.piano(cw, dietro.p, 12), cm, cx, ch, cz);
      cs.rotation.x = Math.PI / 2;
      mesh(C.piano(dietro.p, ch, 13), cm, x0, ch / 2, cz, Math.PI / 2);
      mesh(C.piano(dietro.p, ch, 14), cm, x1, ch / 2, cz, -Math.PI / 2);
      mesh(C.piano(cw, ch, 15), cm, cx, ch / 2, -P - dietro.p);
      if (dietro.lampadina) {
        // una lampadina nuda, debole, che illumina in giu'
        mesh(new THREE.SphereGeometry(0.04, 16, 12), C.materiale({ color: 0xffffff, emissive: 0xffd9a0, impronte: 0.2 }), cx, ch - 0.18, -P - dietro.lampadina, 0, 0.7);
        const lamp = new THREE.SpotLight(0xffb870, 0.7, 0, 1.25, 0.8, 1.8);
        lamp.position.set(cx, ch - 0.22, -P - dietro.lampadina);
        lamp.target.position.set(cx, 0, -P - dietro.lampadina + 0.5);
        this.ombre(lamp, 1024, 0.05, 5, 2);
        g.add(lamp, lamp.target);
      }
    }
    for (const [x, y, z, ry = 0] of s.interruttori || [])
      mesh(C.scatola(0.08, 0.08, 0.02, 0.01, 0), C.materiale({ color: 0xf0ede4, impronte: 0.5 }), x, y, z, ry);

    // i mobili e le porte di Meshy
    const mobili = {};
    for (const m of await Promise.all(s.mobili.map((m) => C.mobile(m)))) {
      g.add(m);
      mobili[m.name] = m;
    }
    for (const p of await Promise.all(s.porte.map((d) => C.porta(d)))) {
      g.add(p);
      mobili[p.name] = p;
    }
    // i piatti sulla tovaglia, dove li trova un raggio dall'alto
    if (s.piatti) g.add(this.piatti(mobili[s.piatti.su], s.piatti.dove));
    // le luci della stanza
    const accese = [];
    for (const l of s.luci) {
      if (l.tipo === "neon") {
        const neon = new THREE.SpotLight(l.colore, l.forza, 0, l.angolo ?? 1.1, 0.9, 1.6);
        neon.position.set(...l.pos);
        neon.target.position.set(...l.mira);
        this.ombre(neon, 2048, 0.1, 6, 3);
        neon.userData = { forza: l.forza, sfarfalla: true };
        g.add(neon, neon.target);
        accese.push(neon);
      } else {
        // una lampada (il comodino, il lampadario): una luce che illumina in giu' e attorno, senza ombre care
        const lamp = new THREE.PointLight(l.colore, l.forza, 0, 1.7);
        lamp.position.set(...l.pos);
        lamp.userData = { forza: l.forza };
        g.add(lamp);
        accese.push(lamp);
      }
    }
    // il neon e il lampadario brillano dei loro colori (il tubo, bianco, piu' di tutto)
    const brillano = [];
    for (const m of s.mobili.filter((m) => m.luce)) {
      mobili[m.id || m.nome].traverse((o) => {
        if (!o.isMesh) return;
        Object.assign(o.material, { emissive: new THREE.Color(0xffffff), emissiveMap: o.material.map, emissiveIntensity: m.luce === "neon" ? 0.4 : 0.55 });
        brillano.push(o.material);
      });
    }
    // le zone che si cliccano: i mobili, o una scatola invisibile (il vano del corridoio)
    const zone = {};
    for (const [id, z] of Object.entries(s.zone || {})) {
      zone[id] = [];
      for (const n of z.mobili || []) {
        const m = mobili[n];
        if (!m) continue;
        m.traverse((o) => { if (o.isMesh) o.userData.zona = id; });
        zone[id].push(m);
      }
      if (z.scatola) {
        const [x0, y0, z0, x1, y1, z1] = z.scatola;
        const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), new THREE.MeshBasicMaterial({ visible: false }));
        b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
        b.userData = { zona: id, invisibile: true };
        g.add(b);
        zone[id].push(b);
      }
    }
    // i calori nascosti, per l'infrarosso dei nastri: si vedono anche attraverso i muri
    const nascosti = {};
    for (const [prova, n] of Object.entries(s.nascosti || {})) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: false, depthWrite: false }));
      m.position.set(...n.pos);
      m.scale.set(n.raggio[0], n.raggio[1], n.raggio[0]);
      m.visible = false;
      m.renderOrder = 10;
      m.userData = { calore: n.calore ?? 0.85, nascosto: prova };
      g.add(m);
      nascosti[prova] = m;
    }
    return { nome, gruppo: g, spec: s, mobili, zone, nascosti, accese, brillano };
  }

  piatti(tavolo, dove) {
    const g = new THREE.Group();
    const piatto = (() => {
      const n = 256, k = n / 32;
      const [c, x] = C.tela(n, n);
      x.fillStyle = "#f2f1ec";
      x.fillRect(0, 0, n, n);
      x.strokeStyle = "#3b5ea6";
      x.lineWidth = 1.6 * k;
      x.beginPath(); x.arc(n / 2, n / 2, 13.3 * k, 0, Math.PI * 2); x.stroke();
      x.strokeStyle = "#d9d8d0";
      x.lineWidth = k;
      x.beginPath(); x.arc(n / 2, n / 2, 8.5 * k, 0, Math.PI * 2); x.stroke();
      return C.texture(c);
    })();
    const piattoM = C.materiale({ map: piatto, ruvido: 0.38, impronte: 0.25 }), bordoM = C.materiale({ color: 0xf2f1ec, ruvido: 0.38, impronte: 0.25 });
    const posate = C.materiale({ color: 0xb8b9b4, ruvido: 0.3, impronte: 0.2 });
    const giu = new THREE.Raycaster();
    tavolo.updateMatrixWorld(true);
    for (const [dx, dz] of dove) {
      const x = tavolo.position.x + dx, z = tavolo.position.z + dz;
      giu.set(new THREE.Vector3(x, 2, z), new THREE.Vector3(0, -1, 0));
      const y = giu.intersectObject(tavolo, true)[0]?.point.y ?? 0.78;
      for (const [geo, m, px, py] of [[new THREE.CylinderGeometry(0.115, 0.085, 0.018, 40), [bordoM, piattoM, bordoM], x, y + 0.009],
        [C.scatola(0.014, 0.006, 0.17, 0.003, 0.0005), posate, x + (dx < 0 ? -0.15 : 0.15), y + 0.004]]) {
        const p = new THREE.Mesh(geo, m);
        p.position.set(px, py, z);
        p.castShadow = p.receiveShadow = true;
        p.userData = { calore: 0.05, zona: "tavola" };
        g.add(p);
      }
    }
    return g;
  }

  // ---------- entrare in un luogo ----------

  // luogo: il nome del gioco; persone: chi c'e'; come(p): { stato, calore } dalla tabella delle persone del giorno;
  // giorno: 1 o 2; volti: le espressioni che restano (chi ha pianto piange ancora); notte: la visione notturna;
  // nascosti: le prove dei calori nascosti del luogo (quelli da accendere all'infrarosso)
  async apri(luogo, { persone, come, giorno, volti = {}, notte = false, nascosti = [] }) {
    const nome = stanzaDi(luogo);
    await C.caricaMani();
    const st = await this.preparaStanza(nome);
    if (this.stanza && this.stanza !== st) this.scena.remove(this.stanza.gruppo);
    this.stanza = st;
    this.luogo = luogo;
    this.scena.add(st.gruppo);
    const s = st.spec;
    this.occhio = new THREE.Vector3(...s.occhio);
    this.mira = new THREE.Vector3(...s.mira);
    this.faroMira = new THREE.Vector3(...s.faro);
    this.scena.fog = new THREE.Fog(0x060504, ...(s.ambiente?.nebbia ?? [4, 12]));
    // i pupazzi: chi c'e' entra, chi non c'e' esce
    for (const p of this.presenti) this.scena.remove((await this.pupazzo(p)).radice);
    this.attivi = nascosti;
    this.presenti = persone.filter((p) => POSTI[nome]?.[p]);
    for (const p of this.presenti) {
      const pp = await this.pupazzo(p);
      const c = come(p);
      const posto = POSTI[nome][p].find((x) => !x.se || ((!x.se.stato || x.se.stato === c.stato) && (!x.se.giorno || x.se.giorno === giorno)));
      const posa = POSE[posto.posa];
      pp.metti(posto, posa, this.occhio);
      this.vesti(pp, posa, c);
      pp.calore(c.stato === "morto" ? CALORE_MORTO : (c.calore ?? 0.5));
      pp.stato = c.stato;
      await this.volto(p, volti[p] ?? null);
      this.scena.add(pp.radice);
    }
    // le porte che il secondo giorno sono aperte
    for (const d of s.porte) if (d.apre2 != null && st.mobili[d.id || "porta"]) st.mobili[d.id || "porta"].rotation.y = giorno === 2 ? d.apre2 : (d.apre ?? 0);
    this.modo = notte ? "notte" : "giorno";
    this.zoom.v = this.zoom.verso = 0;
    this.zoom.chi = this.zoom.parte = null;
    this.evidenzia(null);
    this.anima(0, true);
    // la videocamera subito al suo posto (le proiezioni e le foto non aspettano il primo fotogramma)
    this.inquadra(0);
  }

  // l'aspetto di un pupazzo nel suo stato: le mani, i bubboni, gli oggetti addosso e in mano
  vesti(pp, posa, c) {
    const A = ASPETTO[pp.chi] || {};
    const a = A[c.stato] || {};
    pp.aspetto = a;
    pp.coloraMani(a.mani ?? null);
    pp.segni(a.bubboni ?? [], a.pelle ?? A.pelle);
    pp.stacca();
    for (const o of pp.attrezzi || []) o.parent?.remove(o);
    pp.attrezzi = [];
    for (const cosa of a.oggetti || []) {
      const ogg = oggetto(cosa);
      if (cosa === "medaglietta") pp.attacca(ogg, "neck", pp.puntiModello.petto.toArray(), [0, 0, 0]);
      else if (cosa === "rosario") pp.attacca(ogg, "LeftHand", pp.dove.LeftHand.clone().lerp(pp.dove.RightHand, 0.0).add(new THREE.Vector3(0, -0.06, 0.04)).toArray(), [0, 0, 0]);
      else if (cosa === "fazzoletto") pp.attacca(ogg, "RightHand", pp.dove.RightHand.clone().add(new THREE.Vector3(-0.07, -0.02, 0.02)).toArray(), [0, 0, 90]);
    }
    for (const at of posa.attrezzi || []) {
      if (at.cosa !== "bastone") continue;
      const b = bastone(at.alto);
      b.position.set(...at.davanti);
      b.traverse((o) => { o.userData.chi = pp.chi; o.userData.calore = 0.05; });
      pp.radice.add(b);
      pp.attrezzi.push(b);
    }
  }

  // un'espressione (null: la faccia del suo stato); pp.volto e' quella che ha addosso adesso (per le foto)
  async volto(chi, volto) {
    const pp = this.attori[chi];
    if (!pp) return;
    const giro = (pp.giroVolto = (pp.giroVolto || 0) + 1);
    const stato = pp.aspetto?.faccia;
    const nomi = [stato && volto && `${chi}_creta_${stato}_${volto}`, volto && `${chi}_creta_${volto}`, stato && `${chi}_creta_${stato}`]
      .filter((n) => n && FACCE.has(n) && this.facce[n] !== false);
    let t = null;
    for (const n of nomi) {
      try {
        t = await C.faccia(n);
        break;
      } catch {
        this.facce[n] = false;
      }
    }
    // un cambio arrivato dopo vince
    if (pp.giroVolto !== giro) return;
    pp.faccia(t);
    pp.volto = volto ?? null;
  }

  // ---------- ogni fotogramma ----------

  // il puntatore sullo schermo (0-1): la testa del medico lo segue appena
  guarda(x, y) {
    this.testa.tx = clamp(x * 2 - 1, -1, 1);
    this.testa.ty = clamp(y * 2 - 1, -1, 1);
  }

  // il passo del tempo e il disegno: la plastilina cambia posa 12 volte al secondo
  aggiorna(dt) {
    if (!this.stanza) return;
    this.anima(dt);
    this.inquadra(dt);
    this.disegna();
  }

  anima(dt, subito = false) {
    this.tempo += dt;
    const n = Math.floor(this.tempo * POSE_AL_SECONDO);
    if (n === this.ultimaPosa && !subito) return;
    this.ultimaPosa = n;
    C.BOLLE.value = Math.random() * 50;
    // il neon ogni tanto si spegne
    const k = Math.random() < 0.07 ? 0.1 + Math.random() * 0.3 : 1;
    for (const l of this.stanza.accese) if (l.userData.sfarfalla) l.intensity = l.userData.forza * k;
    for (const m of this.stanza.brillano) m.emissiveIntensity = (m.userData.brilla ??= m.emissiveIntensity) * k;
    const t = n / POSE_AL_SECONDO;
    for (const p of this.presenti) {
      const pp = this.pronti(p);
      if (!pp) continue;
      const fermo = this.zoom.chi === p ? this.zoom.v : 0;
      pp.aggiorna(t, fermo, this.zoom.chi === p ? this.zoom.parte : null);
      for (const b of pp.attrezzi) b.updateMatrixWorld(true);
    }
  }

  // i pupazzi gia' caricati
  pronti(p) {
    return this.attori[p] ?? null;
  }

  // il punto dello zoom: la parte (le ascelle: quella sinistra, alzata; le mani: tra le due)
  puntoZoom(v = new THREE.Vector3()) {
    return this.punto(this.zoom.chi, this.zoom.parte, v);
  }

  punto(chi, parte, v = new THREE.Vector3()) {
    const pp = this.pronti(chi);
    if (!pp) return null;
    const a = pp.ancore(parte);
    if (!a.length) return null;
    if (parte === "mani" && a.length > 1) return { p: v.copy(a[0][0]).lerp(a[1][0], 0.5), r: a[0][1] * 1.6 };
    return { p: v.copy(a[0][0]), r: a[0][1] };
  }

  inquadra(dt) {
    const T = this.testa, Z = this.zoom;
    T.x += (T.tx - T.x) * Math.min(1, dt * 3);
    T.y += (T.ty - T.y) * Math.min(1, dt * 3);
    Z.v += Math.sign(Z.verso - Z.v) * Math.min(Math.abs(Z.verso - Z.v), dt / 1.0);
    if (Z.fatto && Z.v === Z.verso) { Z.fatto(); Z.fatto = null; }
    if (!Z.v && !Z.verso) Z.chi = Z.parte = null;
    const z = Z.v * Z.v * (3 - 2 * Z.v);
    // la maschera non sta mai ferma: un respiro e un tremito leggero
    const c = this.camera;
    c.position.set(this.occhio.x + Math.sin(this.tempo * 0.7) * 0.004, this.occhio.y + Math.sin(this.tempo * 1.3) * 0.006, this.occhio.z);
    const volta = -T.x * 0.07 * (1 - z), china = -T.y * 0.05 * (1 - z);
    const base = this._b ??= new THREE.Vector3(), destra = this._d ??= new THREE.Vector3(), bers = this._t ??= new THREE.Vector3();
    base.subVectors(this.mira, this.occhio).normalize();
    base.applyAxisAngle(SU, volta);
    destra.crossVectors(base, SU).normalize();
    base.applyAxisAngle(destra, china);
    bers.copy(c.position).addScaledVector(base, 3);
    let fov = FOV;
    if (Z.chi) {
      const pz = this.puntoZoom(this._p ??= new THREE.Vector3());
      if (pz) {
        // il mirino insegue il punto con calma: il pupazzo si muove a scatti, la videocamera no
        if (Z.salta) { Z.mirino.copy(pz.p); Z.salta = false; } else Z.mirino.lerp(pz.p, 1 - Math.exp(-dt * 3));
        const d = Z.mirino.distanceTo(c.position);
        Z.fov = clamp(2 * Math.atan(pz.r / IN_ZOOM / d) / (Math.PI / 180), 5, 30);
      }
      bers.lerp(Z.mirino, z);
      fov = FOV + (Z.fov - FOV) * z;
    }
    c.fov = fov;
    c.updateProjectionMatrix();
    c.lookAt(bers);
    C.FORZA_BOLLE.value = 1 - 0.5 * z;
    // la lampada sta sulla maschera: si sposta e si gira con la testa (nello zoom va dove si guarda); di notte e' la luce
    // invisibile della visione notturna, piu' forte
    const f = this.faro;
    f.intensity = f.userData.forza * (1 + 0.3 * z) * (this.modo === "notte" ? 2.2 : 1);
    f.position.copy(c.position).add(new THREE.Vector3(0.05, 0.08, 0));
    const luce = this._l ??= new THREE.Vector3();
    luce.subVectors(this.faroMira, this.occhio).applyAxisAngle(SU, volta);
    const lato = new THREE.Vector3().crossVectors(luce, SU).normalize();
    luce.applyAxisAngle(lato, china).add(c.position);
    f.target.position.lerpVectors(luce, bers, z);
    f.target.updateMatrixWorld();
  }

  disegna() {
    const r = this.renderer;
    if (this.modo === "ir") {
      r.setRenderTarget(this.rtScena);
      r.render(this.scena, this.camera);
      this.disegnaCalore();
      r.setRenderTarget(null);
      r.render(this.scenaIr, this.camera);
    } else if (this.modo === "notte") {
      r.setRenderTarget(this.rtScena);
      r.render(this.scena, this.camera);
      r.setRenderTarget(null);
      r.render(this.scenaNotte, this.camera);
    } else {
      r.setRenderTarget(null);
      r.render(this.scena, this.camera);
    }
  }

  // il calore di ogni cosa, in grigi; i calori nascosti si vedono attraverso i muri
  disegnaCalore() {
    const r = this.renderer, grigi = this._grigi ??= new Map();
    const grigio = (v) => {
      if (!grigi.has(v)) grigi.set(v, new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v), fog: false }));
      return grigi.get(v);
    };
    const scambi = [];
    this.scena.traverse((o) => {
      if (!o.isMesh) return;
      scambi.push([o, o.material, o.visible]);
      if (o.userData.nascosto) {
        o.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(o.userData.calore, o.userData.calore, o.userData.calore),
          depthTest: false, depthWrite: false, transparent: true, opacity: 0.85, fog: false });
        o.visible = this.attivi.includes(o.userData.nascosto);
      } else if (o.userData.invisibile) o.visible = false;
      else o.material = grigio(o.userData.calore ?? 0.05);
    });
    const fog = this.scena.fog, tm = r.toneMapping;
    this.scena.fog = null;
    r.toneMapping = THREE.NoToneMapping;
    r.shadowMap.enabled = false;
    r.setRenderTarget(this.rtCalore);
    r.render(this.scena, this.camera);
    for (const [o, m, v] of scambi) {
      if (o.userData.nascosto) o.material.dispose();
      o.material = m;
      o.visible = v;
    }
    this.scena.fog = fog;
    r.toneMapping = tm;
    r.shadowMap.enabled = true;
  }

  // "giorno", "notte" o "ir"
  imposta(modo) {
    this.modo = modo;
  }

  // ---------- lo zoom degli esami ----------

  esamina(chi, parte) {
    const Z = this.zoom;
    Z.chi = chi;
    Z.parte = parte;
    Z.verso = 1;
    Z.salta = Z.v === 0;
    return new Promise((res) => { Z.fatto = res; });
  }

  // gia' nello zoom (i nastri della sera): senza il movimento
  inZoom(chi, parte) {
    const Z = this.zoom;
    Z.chi = chi;
    Z.parte = parte;
    Z.v = Z.verso = 1;
    Z.salta = true;
    this.anima(0, true);
    this.inquadra(0);
  }

  torna(subito = false) {
    const Z = this.zoom;
    Z.verso = 0;
    if (subito) {
      Z.v = 0;
      Z.chi = Z.parte = null;
      return Promise.resolve();
    }
    return new Promise((res) => { Z.fatto = res; });
  }

  // ---------- i pupazzi prestati alla stanza del medico, la notte ----------

  // l'ospite (il pupazzo delle visite: esce dalla scena della visita) o la "cosa" nera di chi dorme solo, un pupazzo a
  // parte, piu' alto e tutto nero
  async prestito(chi) {
    if (chi === "cosa") {
      this.cosa ??= C.modello("uomo_creta", null, true).then((gltf) => {
        const pp = new C.Pupazzo("cosa", gltf);
        const nero = C.materiale({ color: 0x0b0a09, ruvido: 0.95, impronte: 1 });
        for (const o of pp.pelle) { o.material = nero; o.userData.calore = 0.05; }
        // le mani di ricambio nere come il resto
        pp.coloreMani = 0x0b0a09;
        pp.radice.scale.set(0.9, 1.22, 0.9);
        pp.attrezzi = [];
        return pp;
      });
      return this.cosa;
    }
    const pp = await this.pupazzo(chi);
    this.presenti = this.presenti.filter((p) => p !== chi);
    return pp;
  }

  // in posa in un punto della stanza del medico: qui = { x, z, gira, posa } (scene3d.js, NOTTE); stato per vestirlo
  async inPosa(pp, qui, stato) {
    const posa = POSE[qui.posa];
    pp.metti(qui, posa, new THREE.Vector3(qui.x, 1.6, qui.z + 1));
    if (pp.chi === "cosa") {
      pp.posa = posa;
      if (posa.seduta != null) pp.radice.position.y = posa.seduta - pp.dove.Hips.y * pp.radice.scale.y;
    } else {
      this.vesti(pp, posa, { stato });
      pp.stato = stato;
      await this.volto(pp.chi, null);
    }
    pp.aggiorna(0);
    pp.radice.updateMatrixWorld(true);
  }

  // ---------- le foto della videocamera ----------

  // un fotogramma 6:7 (un canvas w x h) per il nastro delle frasi, lo stato di famiglia e la scheda della casa, preso
  // dalla scena com'e' adesso (la notte in verde, i nastri all'infrarosso):
  // - chi: il ritratto (la testa e le spalle, con la faccia che ha adesso), dalla porta, con la lampada su di lui;
  //   con parte: la parte del corpo, stretta come nello zoom dell'esame;
  // - box [x0, y0, x1, y1] (frazioni dello schermo): un ritaglio attorno a una zona;
  // - niente: il centro dello schermo (lo zoom dell'esame, quando la videocamera e' gia' li').
  scatta({ chi = null, parte = null, box = null, w = 240, h = 280 } = {}) {
    if (!this.stanza) return null;
    const W = this.canvas.width, H = this.canvas.height;
    let sw = H * (w / h), sh = H, sx = (W - sw) / 2, sy = 0;
    let rimetti = null;
    if (chi) {
      const pp = this.pronti(chi);
      if (!pp || !this.presenti.includes(chi)) return null;
      let bers, mezzo;
      if (parte) {
        const pz = this.punto(chi, parte);
        if (!pz) return null;
        bers = pz.p;
        mezzo = pz.r / IN_ZOOM;
      } else {
        const [testa, r] = pp.ancore("testa")[0];
        bers = testa.clone().add(new THREE.Vector3(0, -r * 0.9, 0));
        mezzo = r * 2.6;
      }
      const c = this.camera, f = this.faro;
      const fov = c.fov, q = c.quaternion.clone(), t = f.target.position.clone();
      c.fov = clamp((2 * Math.atan(mezzo / bers.distanceTo(c.position)) * 180) / Math.PI, 3, 40);
      c.updateProjectionMatrix();
      c.lookAt(bers);
      f.target.position.copy(bers);
      f.target.updateMatrixWorld();
      rimetti = () => {
        c.fov = fov;
        c.updateProjectionMatrix();
        c.quaternion.copy(q);
        f.target.position.copy(t);
        f.target.updateMatrixWorld();
      };
    } else if (box) {
      const [x0, y0, x1, y1] = box;
      const fh = clamp((y1 - y0) * 1.15, 0.22, 0.6), fw = (fh * (w / h) * H) / W;
      sx = clamp((x0 + x1) / 2 - fw / 2, 0, 1 - fw) * W;
      sy = clamp((y0 + y1) / 2 - fh / 2, 0, 1 - fh) * H;
      sw = fw * W;
      sh = fh * H;
    }
    // il canvas di WebGL si legge solo subito dopo averci disegnato (nello stesso giro)
    this.disegna();
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    out.getContext("2d").drawImage(this.canvas, sx, sy, sw, sh, 0, 0, w, h);
    if (rimetti) {
      rimetti();
      this.disegna();
    }
    return out;
  }

  // ---------- quello che il gioco chiede: i punti sullo schermo, i clic ----------

  // un punto della scena sullo schermo (0-1, da sinistra e dall'alto) e un raggio (in metri) in frazioni dello schermo
  schermo(p, r = 0) {
    const v = p.clone().project(this.camera);
    const x = v.x * 0.5 + 0.5, y = -v.y * 0.5 + 0.5;
    if (!r) return [x, y];
    const d = p.distanceTo(this.camera.position);
    const alto = 2 * d * Math.tan((this.camera.fov * Math.PI) / 360);
    const ry = r / alto;
    return [x, y, ry * (9 / 16), ry, v.z];
  }

  // aggiorna i punti del luogo che usa il gioco (L di D.LUOGHI): le parti del corpo [cx, cy, rx, ry], dove si scrivono le
  // frasi [x, y, lato], le zone (box e segni), i calori nascosti
  aggiornaLuogo(L) {
    if (!this.stanza) return;
    this.camera.updateMatrixWorld();
    L.parti ??= {};
    L.frasi ??= {};
    for (const p of this.presenti) {
      const pp = this.pronti(p);
      if (!pp) continue;
      L.parti[p] = {};
      for (const parte of PARTI) L.parti[p][parte] = pp.ancore(parte).map(([q, r]) => this.schermo(q, r).slice(0, 4));
      const [tx, ty] = this.schermo(pp.ancore("testa")[0][0]);
      L.frasi[p] = tx < 0.62 ? [clamp(tx + 0.045, 0.02, 0.8), clamp(ty - 0.07, 0.03, 0.8), "destra"] : [clamp(tx - 0.045, 0.2, 0.98), clamp(ty - 0.07, 0.03, 0.8), "sinistra"];
    }
    for (const z of L.zone || []) {
      const ogg = this.stanza.zone[z.id];
      if (!ogg?.length) continue;
      const box = new THREE.Box3();
      for (const o of ogg) box.expandByObject(o);
      let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
      for (const cx of [box.min.x, box.max.x]) for (const cy of [box.min.y, box.max.y]) for (const cz of [box.min.z, box.max.z]) {
        const [x, y] = this.schermo(new THREE.Vector3(cx, cy, cz));
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
      z.box = [clamp(x0, 0, 1), clamp(y0, 0, 1), clamp(x1, 0, 1), clamp(y1, 0, 1)];
      z.segni = [[(z.box[0] + z.box[2]) / 2, (z.box[1] + z.box[3]) / 2, (z.box[2] - z.box[0]) / 2 + 0.01, (z.box[3] - z.box[1]) / 2 + 0.01]];
    }
    L.nascosti = Object.entries(this.stanza.nascosti).filter(([prova]) => this.attivi.includes(prova)).map(([prova, m]) => {
      const [x, y, rx, ry] = this.schermo(m.position, Math.max(m.scale.x, m.scale.y));
      return { x, y, rx, ry, prova };
    });
  }

  // cosa c'e' sotto il punto (0-1): { persona } o { zona: id }
  colpisci(x, y) {
    if (!this.stanza) return null;
    this.raggio.setFromCamera(new THREE.Vector2(x * 2 - 1, -(y * 2 - 1)), this.camera);
    const oggetti = [this.stanza.gruppo, ...this.presenti.map((p) => this.pronti(p)?.radice).filter(Boolean)];
    for (const h of this.raggio.intersectObjects(oggetti, true)) {
      const u = h.object.userData;
      if (u.nascosto) continue;
      if (u.chi && this.presenti.includes(u.chi)) return { persona: u.chi };
      if (u.zona) return { zona: u.zona };
      if (!u.invisibile) return null;
    }
    return null;
  }

  // la persona sotto il puntatore si illumina un poco
  evidenzia(chi) {
    if (chi === this.sopra) return;
    for (const p of [this.sopra, chi]) {
      const pp = p && this.pronti(p);
      if (!pp) continue;
      const v = p === chi ? 0x1c150d : 0x000000;
      for (const o of pp.pelle) o.material.emissive.setHex(v);
    }
    this.sopra = chi;
  }

}
