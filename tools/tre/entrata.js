// Three.js, il caricatore dei modelli GLB e la stanza d'ambiente (la luce morbida che si riflette sui materiali) in
// un solo file per il gioco (npm run impacchetta)
export * from "three";
export { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
export { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
