// Le basi delle immagini dell'ospite della notte (tools/ospite.py), dalla stanza 3D del gioco: la stanzetta vista
// dalla porta (senza l'anta, con una luce dentro) e la stanza vista dall'alto della scrivania, dove la maschera
// registra la notte. Senza VHS, 1600x900, in art/ospite/basi.
// Uso: servire gioco/ in locale sulla porta 8765 (per esempio: python3 -m http.server 8765 -d gioco), poi
//      node tools/viste_ospite.js art/ospite/basi
// Serve Playwright con Chromium.
const { chromium } = require("playwright");
const fs = require("fs");
const OUT = process.argv[2] || "art/ospite/basi";
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const log = [];
  page.on("pageerror", (e) => log.push("ERRORE: " + e.message));
  await page.goto("http://127.0.0.1:8765/index.html#prova");
  await page.waitForFunction(() => document.querySelector("#schermo")?.dataset.schermo === "stanza", null, { timeout: 120000 });
  await page.evaluate(() => { window.prova.risoluzione = 320; window.prova.stanza().adatta(320); });
  const viste = {
    stanzetta: { pos: [2.42, 1.45, 1.72], guarda: [4.05, 0.42, 1.75], fov: 60, senzaAnta: true, luce: [3.3, 2.3, 1.7, 5], cielo: 0.6, fase: "sera" },
    notte: { pos: [-1.2, 1.55, -2.6], guarda: [1.8, 0.6, -0.3], fov: 64, porta: -0.6, cielo: 0.9, fase: "sera" },
    notte_bassa: { pos: [-0.9, 1.15, -2.45], guarda: [1.9, 0.6, -0.1], fov: 66, porta: -0.6, cielo: 0.9, fase: "sera" },
  };
  for (const [nome, v] of Object.entries(viste)) {
    const url = await page.evaluate(([v]) => {
      const st = window.prova.stanza();
      st.fase(v.fase);
      st.cardine.rotation.y = v.porta || 0;
      st.cardine.visible = !v.senzaAnta;
      if (v.cielo) st.L.cielo.intensity = v.cielo;
      st.renderer.shadowMap.needsUpdate = true;
      let luce = null;
      if (v.luce) {
        luce = new st.L.alone.constructor(0xfff0dd, v.luce[3], 6, 2);
        luce.position.set(v.luce[0], v.luce[1], v.luce[2]);
        st.scena.add(luce);
      }
      const cam = new st.camera.constructor(v.fov, 16 / 9, 0.03, 40);
      cam.position.set(...v.pos);
      cam.lookAt(...v.guarda);
      cam.updateMatrixWorld();
      st.renderer.setSize(1600, 900, false);
      st.renderer.render(st.scena, cam);
      const u = st.canvas.toDataURL("image/jpeg", 0.92);
      if (luce) st.scena.remove(luce);
      st.cardine.visible = true;
      return u;
    }, [v]);
    fs.writeFileSync(`${OUT}/${nome}.jpg`, Buffer.from(url.split(",")[1], "base64"));
  }
  console.log(log.join("\n") || "nessun errore");
  await browser.close();
})();
