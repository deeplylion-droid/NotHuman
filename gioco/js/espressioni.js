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
    moglie: { box: [0.3575, 0.03556, 0.4775, 0.29556], volti: ["nervoso", "arrabbiato"] },
  },
  cucina10: {
    suocera: { box: [0.58562, 0.19111, 0.715, 0.51], volti: ["arrabbiato", "piange"] },
  },
  camera10: {
    nuora: { box: [0.4575, 0.04111, 0.5675, 0.42], volti: ["piange"] },
  },
};
