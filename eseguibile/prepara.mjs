// Prepara pagina/, quello che il programma per Windows apre: la prova della cucina in plastilina
// (art/prove-stile/21-cucina-3d) con Three.js, i modelli e le texture che usa, e i caratteri della pagina scaricati
// da Google Fonts (il programma deve funzionare anche senza rete). Uso: node prepara.mjs (o npm run windows).
import fs from "node:fs";
import path from "node:path";

const QUI = path.dirname(new URL(import.meta.url).pathname);
const RADICE = path.resolve(QUI, "..");
const PROVA = path.join(RADICE, "art/prove-stile/21-cucina-3d");
const PAGINA = path.join(QUI, "pagina");

fs.rmSync(PAGINA, { recursive: true, force: true });
fs.mkdirSync(PAGINA, { recursive: true });
const copia = (da, a) => {
  fs.mkdirSync(path.dirname(path.join(PAGINA, a)), { recursive: true });
  fs.copyFileSync(da, path.join(PAGINA, a));
};
copia(path.join(PROVA, "cucina3d.js"), "cucina3d.js");
copia(path.join(RADICE, "gioco/lib/three.js"), "lib/three.js");
// i modelli (non quelli dello stile scartato del 1998) e le texture gia' pronte (non i disegni di partenza)
for (const f of fs.readdirSync(path.join(PROVA, "modelli"))) if (!f.includes("_ps1")) copia(path.join(PROVA, "modelli", f), `modelli/${f}`);
for (const f of fs.readdirSync(path.join(PROVA, "texture"))) if (f.endsWith(".webp")) copia(path.join(PROVA, "texture", f), `texture/${f}`);

// i caratteri: il foglio di Google Fonts (chiesto come un Chrome, per avere i woff2), i file accanto, la pagina che
// li prende da qui
let html = fs.readFileSync(path.join(PROVA, "index.html"), "utf8");
const url = html.match(/href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)"/)[1].replaceAll("&amp;", "&");
const foglio = await (await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" } })).text();
fs.mkdirSync(path.join(PAGINA, "caratteri"));
let n = 0;
const locale = await Promise.all([...foglio.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(async ([, u]) => {
  const nome = `caratteri/${n++}.woff2`;
  fs.writeFileSync(path.join(PAGINA, nome), Buffer.from(await (await fetch(u)).arrayBuffer()));
  return [u, nome];
}));
fs.writeFileSync(path.join(PAGINA, "caratteri.css"), locale.reduce((css, [u, nome]) => css.replaceAll(u, nome), foglio));
html = html.replace(/<link rel="preconnect"[^>]*>\n/g, "").replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="caratteri.css">');
fs.writeFileSync(path.join(PAGINA, "index.html"), html);
console.log(`pagina/ pronta: ${fs.readdirSync(path.join(PAGINA, "modelli")).length} file di modelli, ${locale.length} caratteri`);
