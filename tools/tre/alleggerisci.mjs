// Alleggerisce un modello per la stanza 3D del gioco (lo usa tools/prepara_stanza.py).
//
// Uso: node alleggerisci.mjs <sorgente.glb> <cartella di uscita> <nome> <lato delle texture>
//
// - Riduce le texture a <lato> punti, in WebP.
// - Quantizza e comprime la geometria (EXT_meshopt_compression, che Three.js legge con MeshoptDecoder): pesa meta'
//   di prima e il modello resta identico. Semplificarla invece non conviene: i modelli di Meshy hanno la texture
//   tagliata in tanti pezzi, e la semplificazione normale si ferma lungo i tagli (26.600 triangoli -> 22.500),
//   mentre quella che li scavalca (meshoptimizer in modo "Permissive") sbava la texture (prove del 26 ottobre).
// - Scrive <nome>.json: il glTF con la geometria dentro in base64 (gli Artifact non servono i .glb ne' i .bin) e
//   le texture accanto (<nome>_0.webp...).
import fs from "node:fs";
import path from "node:path";
import { NodeIO, Format } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, weld, textureCompress, meshopt } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
import sharp from "sharp";

const [sorgente, uscita, nome, lato] = process.argv.slice(2);
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const doc = await io.read(sorgente);
await doc.transform(
  dedup(),
  weld(),
  prune(),
  textureCompress({ encoder: sharp, targetFormat: "webp", resize: [Number(lato), Number(lato)] }),
  meshopt({ encoder: MeshoptEncoder, level: "high" }),
);

// il glTF separato: la geometria in base64 dentro il .json, le texture accanto col nome del modello
const { json, resources } = await io.writeJSON(doc, { format: Format.GLTF, basename: nome });
// il buffer con i dati deve essere il primo (nel gioco diventa il blocco binario di un GLB); l'altro e' quello vuoto
// di riserva della compressione
const dati = json.buffers.findIndex((b) => b.uri);
if (dati > 0) {
  [json.buffers[0], json.buffers[dati]] = [json.buffers[dati], json.buffers[0]];
  const scambia = (i) => (i === 0 ? dati : i === dati ? 0 : i);
  for (const bv of json.bufferViews) {
    bv.buffer = scambia(bv.buffer);
    const m = bv.extensions?.EXT_meshopt_compression;
    if (m) m.buffer = scambia(m.buffer);
  }
}
for (const b of json.buffers) {
  if (b.uri) b.uri = "data:application/octet-stream;base64," + Buffer.from(resources[b.uri]).toString("base64");
}
fs.mkdirSync(uscita, { recursive: true });
for (const f of fs.readdirSync(uscita)) if (f.startsWith(`${nome}_`) && f.endsWith(".webp")) fs.unlinkSync(path.join(uscita, f));
(json.images || []).forEach((im, i) => {
  if (!im.uri) return;
  const file = `${nome}_${i}${path.extname(im.uri)}`;
  fs.writeFileSync(path.join(uscita, file), resources[im.uri]);
  im.uri = file;
});
fs.writeFileSync(path.join(uscita, `${nome}.json`), JSON.stringify(json));
