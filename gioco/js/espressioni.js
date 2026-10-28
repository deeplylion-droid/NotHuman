// generato da tools/prepara_gioco.py: dove incollare le teste delle espressioni sopra la scena,
// [x0, y0, x1, y1] in frazioni dell'immagine, e quali espressioni ci sono per ogni persona
export const ESPRESSIONI = {
  cucina: {
    padre: { box: [0.2675, 0.04778, 0.40938, 0.35556], volti: ["nervoso", "arrabbiato"] },
    figlia: { box: [0.44438, 0.22667, 0.51062, 0.35889], volti: ["piange"] },
  },
  soggiorno: {
    uomo: { box: [0.56, 0.03222, 0.68625, 0.31222], volti: ["nervoso", "arrabbiato"] },
    giovane: { box: [0.4575, 0.16222, 0.54125, 0.36222], volti: ["piange"] },
  },
  cucina2: {
    figlia: { box: [0.445, 0.22556, 0.51, 0.35889], volti: ["piange"] },
  },
  soggiorno2: {
    uomo: { box: [0.56125, 0.03222, 0.68625, 0.31222], volti: ["arrabbiato"] },
  },
  monolocale: {
    moglie: { box: [0.37062, 0.05556, 0.49, 0.30556], volti: ["nervoso", "arrabbiato"] },
  },
  cucina10: {
    suocera: { box: [0.56812, 0.09556, 0.64812, 0.32556], volti: ["arrabbiato", "piange"] },
  },
  camera10: {
    nuora: { box: [0.4425, 0.11111, 0.5425, 0.39], volti: ["piange"] },
  },
  sacrestia7: {
    sacrestano: { box: [0.23062, 0.30111, 0.34938, 0.55556], volti: ["piange"] },
    giona: { box: [0.73812, 0.28333, 0.82812, 0.47556], volti: ["piange"] },
  },
  sartoria4: {
    ada: { box: [0.28813, 0.12111, 0.48812, 0.46], volti: ["piange"] },
    lia: { box: [0.51562, 0.13333, 0.7125, 0.46], volti: ["piange"] },
  },
};
