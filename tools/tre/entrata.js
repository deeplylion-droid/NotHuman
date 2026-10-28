// Three.js, il caricatore dei modelli GLB (col decoder della geometria compressa) e la stanza d'ambiente (la luce
// morbida che si riflette sui materiali) in un solo file per il gioco (npm run impacchetta)
export * from "three";
export { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
export { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
export { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
// lo stesso decoder in JavaScript, per le pagine che non lasciano usare WebAssembly (e' piu' lento); non e' tra i file
// che il pacchetto di meshoptimizer espone, per questo il percorso
export { MeshoptDecoder as MeshoptDecoderJS } from "./node_modules/meshoptimizer/meshopt_decoder_reference.js";
// la stanza ad alta qualita': i passaggi dopo il disegno (l'alone delle luci forti, il tone mapping e la correzione
// del colore alla fine)
export { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
export { RenderPass } from "three/addons/postprocessing/RenderPass.js";
export { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
export { OutputPass } from "three/addons/postprocessing/OutputPass.js";
export { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
