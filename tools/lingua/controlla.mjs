// Controlla una parte tradotta del catalogo e, a lavoro finito, scrive il catalogo del gioco.
//   node tools/lingua/controlla.mjs <parte>     controlla parti/<parte>_en.json rispetto a parti/<parte>.json
//   node tools/lingua/controlla.mjs scrivi      controlla tutte le parti e scrive gioco/js/lingua_en.js
// Le regole sono quelle di GUIDA.md: i segnaposto, gli asterischi, le parentesi quadre, gli spazi ai lati, il
// maiuscolo, niente virgolette italiane; in piu' avvisa delle parole italiane rimaste.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const QUI = path.dirname(fileURLToPath(import.meta.url));
const PARTI = path.join(QUI, "parti");
const ITALIANO = /(^|[\s(“"])(il|della|delle|degli|che|non|è|sono|perché|anche|questa|quello|nella|dalla|alla|una|uno|gli|lui|lei|casa|sempre|niente|ancora)(?=[\s,.;:!?)”"]|$)/i;

function controlla(parte) {
  const fonte = JSON.parse(fs.readFileSync(path.join(PARTI, `${parte}.json`), "utf8"));
  const file = path.join(PARTI, `${parte}_en.json`);
  if (!fs.existsSync(file)) return { errori: [`manca ${file}`], avvisi: [], tradotte: {} };
  const tradotte = JSON.parse(fs.readFileSync(file, "utf8"));
  const errori = [], avvisi = [];
  for (const k of Object.keys(fonte)) {
    const t = tradotte[k];
    const no = (cosa) => errori.push(`${JSON.stringify(k).slice(0, 90)}: ${cosa}`);
    if (typeof t !== "string") { no("manca la traduzione"); continue; }
    if (!t.trim() && k.trim()) no("traduzione vuota");
    const segnaposto = (s) => (s.match(/\{\d+\}/g) || []).sort().join();
    if (segnaposto(k) !== segnaposto(t)) no(`segnaposto ${segnaposto(k) || "nessuno"} → ${segnaposto(t) || "nessuno"}`);
    const asterischi = (s) => (s.match(/\*/g) || []).length;
    if (asterischi(k) !== asterischi(t)) no(`asterischi ${asterischi(k)} → ${asterischi(t)}`);
    const quadre = (s) => /^\s*\[.*\]\s*$/s.test(s);
    if (quadre(k) !== quadre(t)) no("le parentesi quadre attorno a tutto il testo");
    const lati = (s) => [s.match(/^\s*/)[0], s.match(/\s*$/)[0]].join("|");
    if (lati(k) !== lati(t)) no("gli spazi all'inizio o alla fine");
    if (/[«»]/.test(t)) no("virgolette italiane «»");
    if (/[A-Za-zÀ-ÿ]{2}/.test(k) && k === k.toUpperCase() && t !== t.toUpperCase()) no("era tutto maiuscolo");
    if (ITALIANO.test(t.replace(/\{\d+\}/g, ""))) avvisi.push(`${JSON.stringify(t).slice(0, 110)}: sembra italiano`);
  }
  for (const k of Object.keys(tradotte)) if (!(k in fonte)) errori.push(`${JSON.stringify(k).slice(0, 90)}: chiave in piu'`);
  return { errori, avvisi, tradotte };
}

const [cosa] = process.argv.slice(2);
if (!cosa) {
  console.error("node tools/lingua/controlla.mjs <parte> | scrivi");
  process.exit(1);
}
if (cosa === "scrivi") {
  const catalogo = JSON.parse(fs.readFileSync(path.join(QUI, "catalogo.json"), "utf8"));
  const tutte = {};
  let male = 0;
  for (const f of fs.readdirSync(PARTI).filter((f) => f.endsWith(".json") && !f.endsWith("_en.json"))) {
    const { errori, avvisi, tradotte } = controlla(f.replace(/\.json$/, ""));
    male += errori.length;
    for (const e of errori) console.log(`${f}: ERRORE ${e}`);
    for (const a of avvisi) console.log(`${f}: avviso ${a}`);
    Object.assign(tutte, tradotte);
  }
  const mancano = Object.keys(catalogo).filter((k) => !(k in tutte));
  for (const k of mancano) console.log(`manca: ${JSON.stringify(k).slice(0, 100)}`);
  if (male || mancano.length) {
    console.log(`${male} errori, ${mancano.length} testi senza traduzione: lingua_en.js non scritto`);
    process.exit(1);
  }
  // nell'ordine del catalogo (quello dei file), una voce per riga
  const righe = Object.keys(catalogo).map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(tutte[k])},`);
  // le immagini con le scritte (tools/lingua/immagini.py): data URL, col percorso del gioco come chiave
  const IMM = path.join(QUI, "immagini_en");
  const immagini = [];
  const giro = (dir) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) giro(p);
      else if (/\.(jpe?g|png|webp)$/i.test(f.name)) {
        const tipo = /png$/i.test(f.name) ? "image/png" : /webp$/i.test(f.name) ? "image/webp" : "image/jpeg";
        immagini.push(`  ${JSON.stringify(path.relative(IMM, p).split(path.sep).join("/"))}: "data:${tipo};base64,${fs.readFileSync(p).toString("base64")}",`);
      }
    }
  };
  if (fs.existsSync(IMM)) giro(IMM);
  fs.writeFileSync(path.join(QUI, "../../gioco/js/lingua_en.js"),
    "// Il catalogo inglese (scritto da tools/lingua/controlla.mjs scrivi: non si modifica a mano; le traduzioni stanno\n"
    + "// in tools/lingua/parti/*_en.json). La chiave e' il testo italiano, coi valori al posto di {0}, {1}...\n"
    + `export const CATALOGO = {\n${righe.join("\n")}\n};\n`
    + "\n// le immagini con le scritte in inglese (tools/lingua/immagini.py en), al posto delle italiane\n"
    + `export const IMMAGINI = {\n${immagini.join("\n")}\n};\n`);
  console.log(`gioco/js/lingua_en.js: ${righe.length} testi, ${immagini.length} immagini`);
} else {
  const { errori, avvisi, tradotte } = controlla(cosa);
  for (const e of errori) console.log(`ERRORE ${e}`);
  for (const a of avvisi) console.log(`avviso ${a}`);
  console.log(`${Object.keys(tradotte).length} tradotte, ${errori.length} errori, ${avvisi.length} avvisi`);
  process.exit(errori.length ? 1 : 0);
}
