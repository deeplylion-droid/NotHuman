// Le facce di ricambio dei pupazzi (27 ottobre): come negli stop-motion, dove per cambiare espressione si cambia la
// faccia, ma qui cambia solo la pittura. La pagina la guida tools/facce.mjs:
// - foto(modello): la testa del pupazzo, nella sua posa, vista dal davanti senza luci (solo i colori della texture),
//   in un quadrato di LATO punti; restituisce l'immagine;
// - cuoci(modello, prima, dopo): la faccia cambiata (dopo, la stessa foto ritoccata da Nano Banana Pro) si ridipinge
//   sulla texture dei colori del modello, punto per punto: ogni punto della texture si cerca nella foto (dove cade,
//   se la videocamera lo vede e quanto guarda verso di lei) e prende il colore nuovo solo dove la foto e' cambiata.
//   Restituisce la texture nuova, con le stesse coordinate di quella di prima.
import * as THREE from "../../gioco/lib/three.js";

const LATO = 1024;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("c"), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;

// i modelli sono glTF in un .json con la geometria compressa dentro in base64 (come nella prova e nella stanza)
async function modello(percorso) {
  const j = await (await fetch(percorso)).json();
  const uri = j.buffers[0].uri;
  const bin = Uint8Array.from(atob(uri.slice(uri.indexOf(",") + 1)), (c) => c.charCodeAt(0));
  delete j.buffers[0].uri;
  const testo = new TextEncoder().encode(JSON.stringify(j));
  const lj = (testo.length + 3) & ~3, lb = (bin.length + 3) & ~3;
  const glb = new Uint8Array(28 + lj + lb), v = new DataView(glb.buffer);
  v.setUint32(0, 0x46546c67, true); v.setUint32(4, 2, true); v.setUint32(8, glb.length, true);
  v.setUint32(12, lj, true); v.setUint32(16, 0x4e4f534a, true); glb.set(testo, 20); glb.fill(0x20, 20 + testo.length, 20 + lj);
  v.setUint32(20 + lj, lb, true); v.setUint32(24 + lj, 0x004e4942, true); glb.set(bin, 28 + lj);
  const cartella = percorso.slice(0, percorso.lastIndexOf("/") + 1);
  const gltf = await new THREE.GLTFLoader().setMeshoptDecoder(THREE.MeshoptDecoderJS).parseAsync(glb.buffer, cartella);
  const scena = gltf.scene;
  scena.updateMatrixWorld(true);
  let mesh = null, testa = null;
  scena.traverse((o) => {
    if (o.isMesh && !mesh) mesh = o;
    if (o.isBone && /^head$/i.test(o.name)) testa = o;
  });
  return { scena, mesh, testa };
}

// la videocamera davanti alla testa: ortografica, un quadrato di "ampio" metri attorno al centro della faccia
function videocamera(m, ampio = 0.3, su = 0.09) {
  const c = new THREE.Vector3();
  m.testa.getWorldPosition(c);
  c.y += su;
  const cam = new THREE.OrthographicCamera(-ampio / 2, ampio / 2, ampio / 2, -ampio / 2, 0.01, 4);
  cam.position.set(c.x, c.y, c.z + 2);
  cam.lookAt(c);
  cam.updateMatrixWorld(true);
  return cam;
}

function leggi(rt, w, h) {
  const px = new Uint8Array(w * h * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, w, h, px);
  return px;
}

// l'immagine (righe dall'alto) in un PNG come data URL
function png(px, w, h, capovolgi) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  const im = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const da = capovolgi ? (h - 1 - y) * w * 4 : y * w * 4;
    im.data.set(px.subarray(da, da + w * 4), y * w * 4);
  }
  g.putImageData(im, 0, 0);
  return c.toDataURL("image/png");
}

async function immagine(url) {
  const im = new Image();
  im.src = url;
  await im.decode();
  return im;
}

window.foto = async (percorso, ampio, su) => {
  const m = await modello(percorso);
  const cam = videocamera(m, ampio, su);
  const scena = new THREE.Scene();
  scena.background = new THREE.Color(0x808080);
  m.mesh.material = new THREE.MeshBasicMaterial({ map: m.mesh.material.map });
  scena.add(m.scena);
  const rt = new THREE.WebGLRenderTarget(LATO, LATO, { colorSpace: THREE.SRGBColorSpace, samples: 4 });
  renderer.setRenderTarget(rt);
  renderer.render(scena, cam);
  renderer.setRenderTarget(null);
  return png(leggi(rt, LATO, LATO), LATO, LATO, true);
};

// il margine: i punti tra un pezzo e l'altro della texture (fuori da tutti i triangoli) prendono il colore cotto dei
// vicini, per qualche punto. Se no la scheda video, che ai bordi dei pezzi mescola i punti vicini, ci prende il colore
// di prima e lungo le cuciture si vedono delle righe (il secondo giorno, sulla fronte del padre)
function margine(cotta, pezzi, W, H, giri = 8) {
  let a = cotta;
  for (let giro = 0; giro < giri; giro++) {
    const b = new Uint8Array(a);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (a[i + 3] || pezzi[i]) continue;
        let n = 0, r = 0, g = 0, bl = 0, al = 0;
        for (const j of [x > 0 ? i - 4 : -1, x < W - 1 ? i + 4 : -1, y > 0 ? i - W * 4 : -1, y < H - 1 ? i + W * 4 : -1]) {
          if (j < 0 || !a[j + 3]) continue;
          r += a[j]; g += a[j + 1]; bl += a[j + 2]; al += a[j + 3]; n++;
        }
        if (n) b.set([r / n, g / n, bl / n, al / n], i);
      }
    }
    a = b;
  }
  return a;
}

window.cuoci = async (percorso, ampio, su, primaUrl, dopoUrl) => {
  const m = await modello(percorso);
  const cam = videocamera(m, ampio, su);
  const mappa = m.mesh.material.map;
  const W = mappa.image.width, H = mappa.image.height;
  // dove la foto e' cambiata: la differenza tra prima e dopo, allargata e sfumata
  const [prima, dopo] = await Promise.all([immagine(primaUrl), immagine(dopoUrl)]);
  const tela = (im) => {
    const c = document.createElement("canvas");
    c.width = LATO;
    c.height = LATO;
    const g = c.getContext("2d");
    g.drawImage(im, 0, 0, LATO, LATO);
    return [c, g.getImageData(0, 0, LATO, LATO).data];
  };
  const [, pa] = tela(prima);
  const [cDopo, pd] = tela(dopo);
  const diff = document.createElement("canvas");
  diff.width = LATO;
  diff.height = LATO;
  const gd = diff.getContext("2d");
  const md = gd.createImageData(LATO, LATO);
  for (let i = 0; i < LATO * LATO; i++) {
    const d = Math.abs(pa[i * 4] - pd[i * 4]) + Math.abs(pa[i * 4 + 1] - pd[i * 4 + 1]) + Math.abs(pa[i * 4 + 2] - pd[i * 4 + 2]);
    const v = d > 36 ? 255 : 0;
    md.data.set([v, v, v, 255], i * 4);
  }
  gd.putImageData(md, 0, 0);
  // allarga (sfocatura forte, poi soglia bassa) e sfuma
  const maschera = document.createElement("canvas");
  maschera.width = LATO;
  maschera.height = LATO;
  const gm = maschera.getContext("2d");
  gm.filter = "blur(10px)";
  gm.drawImage(diff, 0, 0);
  const mm = gm.getImageData(0, 0, LATO, LATO);
  for (let i = 0; i < LATO * LATO; i++) {
    const v = Math.min(255, mm.data[i * 4] * 6);
    mm.data.set([v, v, v, 255], i * 4);
  }
  gm.filter = "none";
  gm.putImageData(mm, 0, 0);
  const sfumata = document.createElement("canvas");
  sfumata.width = LATO;
  sfumata.height = LATO;
  const gs = sfumata.getContext("2d");
  gs.filter = "blur(6px)";
  gs.drawImage(maschera, 0, 0);

  const tex = (c) => {
    const t = new THREE.CanvasTexture(c);
    t.flipY = true;
    return t;
  };
  // la profondita' vista dalla videocamera, per sapere cosa vede
  const scena = new THREE.Scene();
  scena.add(m.scena);
  const rtProf = new THREE.WebGLRenderTarget(LATO, LATO, { type: THREE.FloatType });
  m.mesh.material = new THREE.ShaderMaterial({
    vertexShader: "#include <common>\n#include <skinning_pars_vertex>\nvoid main() {\n#include <skinbase_vertex>\n#include <begin_vertex>\n#include <skinning_vertex>\n#include <project_vertex>\n}",
    fragmentShader: "void main() { gl_FragColor = vec4(gl_FragCoord.z, 0.0, 0.0, 1.0); }",
  });
  renderer.setRenderTarget(rtProf);
  renderer.setClearColor(0xffffff, 1);
  renderer.clear();
  renderer.render(scena, cam);
  // la cottura: ogni triangolo si disegna nella posizione della sua texture e prende il colore dalla foto
  const rtCotta = new THREE.WebGLRenderTarget(W, H, { colorSpace: THREE.SRGBColorSpace });
  const camMat = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  m.mesh.material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { tFoto: { value: tex(cDopo) }, tMaschera: { value: tex(sfumata) }, tProf: { value: rtProf.texture }, camMat: { value: camMat } },
    vertexShader: `
      #include <common>
      #include <skinning_pars_vertex>
      varying vec3 vPos;
      varying vec3 vNor;
      void main() {
        #include <skinbase_vertex>
        #include <beginnormal_vertex>
        #include <skinnormal_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        vPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vNor = normalize(mat3(modelMatrix) * objectNormal);
        gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D tFoto, tMaschera, tProf;
      uniform mat4 camMat;
      varying vec3 vPos;
      varying vec3 vNor;
      void main() {
        vec4 c = camMat * vec4(vPos, 1.0);
        vec3 ndc = c.xyz / c.w;
        vec2 st = ndc.xy * 0.5 + 0.5;
        if (st.x < 0.0 || st.x > 1.0 || st.y < 0.0 || st.y > 1.0) discard;
        float vede = step(ndc.z * 0.5 + 0.5, texture2D(tProf, st).r + 0.0015);
        float guarda = smoothstep(0.2, 0.6, dot(normalize(vNor), vec3(0.0, 0.0, 1.0)));
        float a = vede * guarda * texture2D(tMaschera, st).r;
        if (a < 0.003) discard;
        gl_FragColor = vec4(texture2D(tFoto, st).rgb, a);
      }`,
  });
  renderer.setRenderTarget(rtCotta);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scena, cam);
  // dove ci sono i pezzi della texture: tutti i triangoli, pieni
  const rtPezzi = new THREE.WebGLRenderTarget(W, H);
  m.mesh.material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    vertexShader: "void main() { gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0); }",
    fragmentShader: "void main() { gl_FragColor = vec4(1.0); }",
  });
  renderer.setRenderTarget(rtPezzi);
  renderer.clear();
  renderer.render(scena, cam);
  renderer.setRenderTarget(null);
  const cotta = margine(leggi(rtCotta, W, H), leggi(rtPezzi, W, H), W, H);
  // sopra la texture di prima (righe dall'alto, come nell'immagine del glTF)
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  g.drawImage(mappa.image, 0, 0, W, H);
  const base = g.getImageData(0, 0, W, H);
  for (let i = 0; i < W * H; i++) {
    const a = cotta[i * 4 + 3] / 255;
    if (!a) continue;
    for (let k = 0; k < 3; k++) base.data[i * 4 + k] = base.data[i * 4 + k] * (1 - a) + cotta[i * 4 + k] * a;
  }
  g.putImageData(base, 0, 0);
  return { texture: c.toDataURL("image/png"), maschera: maschera.toDataURL("image/png") };
};
window.pronta = true;
