// Prepara pagina/, quello che il programma per Windows apre: il gioco (gioco/, con la stanza del medico e le visite in
// plastilina) e i caratteri della pagina scaricati da Google Fonts (il programma deve funzionare anche senza rete).
// Uso: node prepara.mjs (o npm run windows).
import fs from "node:fs";
import path from "node:path";

const QUI = path.dirname(new URL(import.meta.url).pathname);
const RADICE = path.resolve(QUI, "..");
const GIOCO = path.join(RADICE, "gioco");
const PAGINA = path.join(QUI, "pagina");

fs.rmSync(PAGINA, { recursive: true, force: true });
fs.cpSync(GIOCO, PAGINA, { recursive: true });

// i caratteri: il foglio di Google Fonts (chiesto come un Chrome, per avere i woff2), i file accanto, la pagina che
// li prende da qui
let html = fs.readFileSync(path.join(GIOCO, "index.html"), "utf8");
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
// l'inizio che agli Artifact aggiunge il visualizzatore: la pagina standard, in utf-8 (senza, il "▸" del suggerimento
// diventava "â–¸"), senza margine attorno
html = '<!doctype html>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<style>body { margin: 0; }</style>\n' + html;
fs.writeFileSync(path.join(PAGINA, "index.html"), html);
console.log(`pagina/ pronta: ${fs.readdirSync(path.join(PAGINA, "modelli", "creta")).length} file di modelli in plastilina, ${locale.length} caratteri`);
