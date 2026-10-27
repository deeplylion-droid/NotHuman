#!/usr/bin/env node
// Le facce di ricambio dei pupazzi (27 ottobre): vedi tools/facce/facce.js.
//
// Uso: node tools/facce.mjs foto  <modello.json> <foto.png> [ampio su]
//      node tools/facce.mjs cuoci <modello.json> <prima.png> <dopo.png> <texture.png> [ampio su]
// "foto" fotografa la testa del pupazzo dal davanti (senza luci, solo i colori); la foto si ritocca con Nano Banana
// Pro (la stessa faccia che piange, si arrabbia...); "cuoci" ridipinge la faccia ritoccata sulla texture dei colori
// del modello e scrive la texture nuova (le stesse coordinate di quella di prima: nel gioco basta scambiarle).
// "ampio" e' il lato in metri del quadrato attorno alla faccia (0.3), "su" quanto sopra l'osso della testa sta il
// centro della faccia (0.09). Serve un server nella cartella del progetto: lo apre lo script, sulla porta 8790.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const RADICE = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const [azione, ...arg] = process.argv.slice(2);
const rel = (f) => "/" + path.relative(RADICE, path.resolve(f)).split(path.sep).join("/");
const dati = (f) => "data:image/png;base64," + fs.readFileSync(f).toString("base64");
const scrivi = (f, url) => fs.writeFileSync(f, Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));

const server = spawn("python3", ["-m", "http.server", "8790", "--bind", "127.0.0.1"], { cwd: RADICE, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("errore nella pagina:", e.message));
  await page.goto("http://127.0.0.1:8790/tools/facce/index.html");
  await page.waitForFunction(() => window.pronta, null, { timeout: 60000 });
  if (azione === "foto") {
    const [modello, uscita, ampio = "0.3", su = "0.09"] = arg;
    scrivi(uscita, await page.evaluate(([m, a, s]) => window.foto(m, a, s), [rel(modello), Number(ampio), Number(su)]));
    console.log("foto:", uscita);
  } else if (azione === "cuoci") {
    const [modello, prima, dopo, uscita, ampio = "0.3", su = "0.09"] = arg;
    const r = await page.evaluate(([m, a, s, p, d]) => window.cuoci(m, a, s, p, d),
      [rel(modello), Number(ampio), Number(su), dati(prima), dati(dopo)]);
    scrivi(uscita, r.texture);
    scrivi(uscita.replace(/\.png$/, "_maschera.png"), r.maschera);
    console.log("texture:", uscita);
  } else console.error("azione sconosciuta: foto o cuoci");
} finally {
  await browser.close();
  server.kill();
}
