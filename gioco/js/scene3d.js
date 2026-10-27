// Le stanze delle visite in plastilina (27 ottobre): com'e' fatta ogni stanza, chi ci sta e come, i segni della
// malattia di ognuno. Le costruisce gioco/js/visita3d.js con i pezzi di gioco/js/plastilina.js.
// Le misure sono in metri: x verso destra, y in alto, z verso chi guarda. Il medico e' sulla porta d'ingresso, nel
// muro davanti (z = 0), e guarda verso -z: la stanza va da z = 0 a z = -lunga, da x = -larga/2 a x = +larga/2.
// I mobili sono modelli di Meshy (art/plastilina/mobili e art/prove-stile/21-cucina-3d/mobili) messi alle misure vere:
// dim = [larghezza, altezza, profondita'] del mobile, gira = di quanto e' girato (i modelli guardano verso +z).

const A = 2.7;

export const STANZE = {
  // la cucina della casa 3: a sinistra il frigo, il lavello e i pensili, a destra il tavolo con la tovaglia a rose e i
  // quattro piatti, in fondo la porta aperta del corridoio buio (in fondo al corridoio c'e' la camera della madre)
  cucina: {
    misure: [3.4, 4.4, A],
    ingresso: [-0.42, 0.7, 2.06],
    occhio: [0.14, 1.66, 0.32], mira: [-0.06, 1.2, -3.2], faro: [-0.5, 1.25, -2.3],
    superfici: { muri: ["muro", 1.6], pavimento: ["pavimento", 1.2], soffitto: ["soffitto", 1.6] },
    vani: [{ muro: "fondo", x0: -0.35, x1: 0.5, h: 2.08,
      corridoio: { x0: -0.62, x1: 0.78, p: 3.2, h: 2.45, muri: ["corridoio", 1.4], pavimento: ["piastrelle", 1.2], lampadina: 1.6 } }],
    interruttori: [[0.66, 1.12, -4.39]],
    mobili: [
      { nome: "frigo", x: -1.38, z: -0.52, dim: [0.64, 1.72, 0.62], gira: Math.PI / 2, calore: 0.2 },
      { nome: "base", x: -1.4, z: -2.0, dim: [2.1, 0.9 / 0.81, 0.6], gira: Math.PI / 2 },
      { nome: "pensili", x: -1.52, y: 1.5, z: -2.0, dim: [2.1, 0.7, 0.36], gira: Math.PI / 2 },
      { nome: "tavolo", x: 0.95, z: -2.35, dim: [1.3, 0.78, 1.0], gira: Math.PI / 2, zona: "tavola" },
      { nome: "sedia", id: "sedia1", x: 0.95, z: -3.32, dim: [0.55, 0.82, 0.53], gira: 0.12 },
      { nome: "sedia", id: "sedia2", x: 1.02, z: -1.38, dim: [0.55, 0.82, 0.53], gira: Math.PI + 0.3 },
      { nome: "mobiletto_tv", x: 1.3, z: -4.15, dim: [0.72, 1.0, 0.47], gira: 0, calore: 0.34 },
      { nome: "neon", x: 1.02, y: A - 0.172, z: -1.75, dim: [1.24, 0.172, 0.15], gira: Math.PI / 2, calore: 0.62, luce: "neon" },
    ],
    porte: [
      { cardine: [-0.34, -4.37], apre: -1.3, larga: 0.83 },
      { cardine: [-0.21, -7.54], apre: 0, larga: 0.78 },
    ],
    piatti: { su: "tavolo", dove: [[-0.22, -0.36], [0.22, -0.36], [-0.22, 0.36], [0.22, 0.36]] },
    // il neon e' quasi morto e ogni tanto sfarfalla
    luci: [{ tipo: "neon", pos: [1.0, A - 0.12, -1.8], mira: [0.1, 0, -2.2], forza: 3, angolo: 1.1, colore: 0xcfe8d8 }],
    zone: {
      tavola: { mobili: ["tavolo"] },
      corridoio: { scatola: [-0.35, 0, -4.6, 0.5, 2.08, -4.35] },
    },
    // in fondo al corridoio, dietro la porta chiusa, la madre: all'infrarosso si vede il suo calore
    nascosti: { calore_corridoio: { pos: [0.15, 1.0, -7.9], raggio: [0.35, 0.6] } },
    ambiente: { nebbia: [4, 12] },
  },

  // la camera della casa 3: stretta, buia (la tapparella e' giu'), il letto di ferro contro il muro di fondo sotto la
  // finestra, il comodino con la lampada accesa, l'armadio a destra. Il primo giorno la madre e' seduta sul letto,
  // avvolta nello scialle; il secondo e' morta, sdraiata, con le mani giunte sul rosario
  camera: {
    misure: [2.8, 3.5, A],
    ingresso: [-0.42, 0.42, 2.04],
    occhio: [0.0, 1.62, 0.3], mira: [0.1, 1.0, -3.0], faro: [0.15, 0.95, -2.6],
    superfici: { muri: ["muro_camera", 1.6], pavimento: ["pavimento_legno", 1.4], soffitto: ["soffitto", 1.6] },
    vani: [],
    interruttori: [[-0.62, 1.12, -0.01, Math.PI]],
    mobili: [
      // il letto e' lungo in profondita' nel modello (la testata verso -z): girato, la testata va a sinistra
      { nome: "letto_ferro", x: 0.2, z: -2.98, dim: [0.98, 1.15, 2.0], gira: Math.PI / 2 },
      { nome: "comodino", x: -1.1, z: -3.2, dim: [0.56, 0.95, 0.48], gira: 0, zona: "comodino", calore: 0.3 },
      { nome: "armadio", x: 1.12, z: -1.1, dim: [1.0, 2.0, 0.55], gira: -Math.PI / 2 },
      { nome: "finestra", x: 0.2, y: 1.05, z: -3.35, dim: [1.15, 1.15, 0.3], gira: 0 },
    ],
    porte: [],
    // la lampada del comodino, accesa e debole
    luci: [{ tipo: "lampada", pos: [-1.18, 0.9, -3.22], forza: 0.6, colore: 0xffc27a }],
    zone: { comodino: { mobili: ["comodino"] } },
    nascosti: {},
    ambiente: { nebbia: [3, 9] },
  },

  // il soggiorno della casa 5: a sinistra la finestra con la tapparella e sotto il termosifone freddo, il divano e il
  // tavolino; in fondo a destra la porta chiusa del ripostiglio (dietro c'e' il ragazzo, sdraiato), il lampadario
  // acceso al soffitto, l'orologio a muro
  soggiorno: {
    misure: [4.0, 4.3, A],
    ingresso: [-0.45, 0.45, 2.06],
    occhio: [0.0, 1.66, 0.32], mira: [0.0, 1.25, -3.2], faro: [0.05, 1.3, -2.5],
    superfici: { muri: ["muro_soggiorno", 1.6], pavimento: ["pavimento_legno", 1.4], soffitto: ["soffitto", 1.6] },
    vani: [{ muro: "fondo", x0: 0.72, x1: 1.6, h: 2.06, stanzino: { x0: 0.25, x1: 2.0, p: 1.6, muri: ["intonaco_grezzo", 1.2], pavimento: ["cemento", 1.4] } }],
    interruttori: [[0.5, 1.12, -4.29]],
    mobili: [
      { nome: "finestra", x: -1.0, y: 1.0, z: -4.15, dim: [1.2, 1.2, 0.3], gira: 0 },
      { nome: "termosifone", x: -1.0, z: -4.2, dim: [0.9, 0.62, 0.16], gira: 0, zona: "termosifone", calore: 0.02 },
      { nome: "divano", x: -1.6, z: -2.1, dim: [1.5, 0.8, 0.77], gira: Math.PI / 2 },
      { nome: "tavolino", x: -0.92, z: -2.1, dim: [0.95, 0.42, 0.6], gira: Math.PI / 2 },
      { nome: "lampadario", x: 0.1, y: A - 0.62, z: -2.2, dim: [0.42, 0.62, 0.42], gira: 0, calore: 0.5, luce: "lampadario" },
      { nome: "orologio", x: 1.965, y: 1.7, z: -1.7, dim: [0.34, 0.34, 0.07], gira: -Math.PI / 2 },
      // nel ripostiglio, dietro la porta: la brandina (il primo giorno ci e' sdraiato il ragazzo), lo scaffale e, nel
      // pavimento, la botola col lucchetto nuovo
      { nome: "brandina", x: 1.5, z: -5.35, dim: [1.4, 0.45, 1.04], gira: -Math.PI / 2 },
      { nome: "scaffale", x: 0.65, z: -5.75, dim: [0.75, 1.05, 0.24], gira: 0 },
      { nome: "botola", x: 1.02, y: -0.06, z: -4.85, dim: [0.75, 0.1, 0.75], gira: 0 },
    ],
    // il secondo giorno il ripostiglio e' aperto (e vuoto)
    porte: [{ modello: "porta_marrone", cardine: [0.73, -4.28], apre: 0, apre2: 1.35, larga: 0.86, alta: 2.04, zona: "porta", id: "ripostiglio" }],
    luci: [{ tipo: "lampadario", pos: [0.1, A - 0.5, -2.2], forza: 1.3, colore: 0xffd59a }],
    zone: { porta: { mobili: ["ripostiglio"] }, termosifone: { mobili: ["termosifone"] } },
    // dietro la porta chiusa il ragazzo, sdraiato; il secondo giorno e' sotto il pavimento, in cantina
    nascosti: {
      calore_porta: { pos: [1.25, 0.5, -5.2], raggio: [0.55, 0.3] },
      calore_cantina: { pos: [1.1, -0.4, -4.85], raggio: [0.6, 0.22] },
    },
    ambiente: { nebbia: [4.5, 12] },
  },
};

// in che stanza 3D si svolge un luogo del gioco (quelli del secondo giorno hanno il 2 in fondo)
export const stanzaDi = (luogo) => luogo.replace(/2$/, "");

// le pose, viste dal pupazzo: ossa = gradi attorno agli assi del pupazzo [x: piegarsi in avanti, y: voltarsi a
// sinistra, z: inclinarsi verso destra], braccia = vedi Pupazzo.calcolaMire, su = di quanto si alza o si abbassa,
// seduta = a che altezza sta il bacino (seduti),
// sdraiato = gradi (sulla schiena: -90), vita = respiro [frequenza, ampiezza], ondeggia, testa, tremito, occhiata
// (gradi verso la sua sinistra), tosse, singhiozzi; esami = le pose degli esami (di serie POSE_ESAME), immobile = niente
// movimenti nell'esame del collo
export const POSE = {
  // il padre del primo giorno: curvo, la testa in avanti che guarda in su, le braccia lungo i fianchi
  curvo: { ossa: { Spine01: [4, 0, 0], Spine02: [5, 0, 0], neck: [10, 0, 0], Head: [-8, 0, 0] },
    braccia: [[0.15, -1, 0.08], [0.06, -1, 0.32]],
    vita: { respiro: [0.48, 1.8], ondeggia: 1.5, testa: 3, tremito: 3 } },
  // il padre grave: si regge al mobile con la destra (come nella scena del secondo giorno), piegato verso il mobile;
  // respira a fatica e tossisce
  appoggiato: { ossa: { Hips: [0, 0, 2], Spine01: [7, 0, 3], Spine02: [7, 0, 2], neck: [16, 0, 0], Head: [-10, 0, -4] },
    braccia: { Left: [[0.12, -1, 0.06], [0.05, -1, 0.24]], Right: { punto: [-1.2, 1.0, -1.5] } },
    vita: { respiro: [0.72, 3], ondeggia: 1, testa: 3, tremito: 5, tosse: true }, mostraCollo: 22 },
  // la figlia che spia dalla porta del corridoio: le spalle su, le mani giunte davanti alla pancia, ogni tanto guarda il padre
  spia: { ossa: { Spine01: [2, 0, 0], Spine02: [2, 0, 0], LeftShoulder: [0, 0, 3], RightShoulder: [0, 0, -3], neck: [6, 0, 0], Head: [4, 0, 0] },
    braccia: [[0.1, -1, 0.1], [-0.55, -0.45, 0.75]],
    vita: { respiro: [0.27, 1.0], testa: 2, occhiata: -12 } },
  // la figlia il secondo giorno: stanotte e' morta la madre; le mani strette al petto, singhiozza
  affranta: { ossa: { Spine01: [3, 0, 0], Spine02: [4, 0, 0], LeftShoulder: [0, 0, 5], RightShoulder: [0, 0, -5], neck: [7, 0, 0], Head: [3, 0, 5] },
    braccia: [[0.16, -1, 0.22], [-0.62, -0.08, 0.78]],
    vita: { respiro: [0.4, 1.2], testa: 2, singhiozzi: true } },
  // la madre seduta sul bordo del letto, le mani sulle ginocchia, la testa che pende; respira affannata
  seduta_letto: { seduta: 0.68,
    ossa: { LeftUpLeg: [-86, 0, -4], RightUpLeg: [-86, 0, 4], LeftLeg: [84, 0, 0], RightLeg: [84, 0, 0], Spine01: [9, 0, 0],
      Spine02: [8, 0, 0], neck: [12, 0, 0], Head: [-4, 0, 0] },
    braccia: [[0.12, -0.75, 0.62], [0.04, -0.55, 0.84]],
    vita: { respiro: [0.9, 2.4], testa: 2.5, tremito: 4 },
    esami: { mani: { braccia: [[0.12, -0.55, 0.82], [0.06, -0.1, 1]] }, ascelle: { braccia: { Left: [[0.8, 0.5, 0.25], [0.3, 0.92, 0.2]] } } } },
  // la madre morta, a letto sulla schiena, le mani giunte sul petto
  // (sdraiata sulla schiena "in avanti" e' in su e "in giu'" e' verso i piedi: le braccia lungo il corpo, gli avambracci
  // sul petto)
  morta: { sdraiato: -90, su: 0.74, immobile: true, ossa: { Head: [-6, 0, 0], neck: [-4, 0, 0] },
    braccia: [[0.18, -0.9, 0.38], [-0.82, 0.45, 0.35]], vita: {}, esami: {} },
  // l'uomo in tuta: largo, i pugni lungo i fianchi, il mento in fuori
  uomo: { ossa: { Spine01: [-2, 0, 0], neck: [5, 0, 0], Head: [-6, 0, 0] },
    braccia: [[0.24, -1, 0.04], [0.12, -1, 0.12]],
    vita: { respiro: [0.5, 1.6], ondeggia: 1, testa: 2, tremito: 1.5 } },
  // l'uomo grave: tiene il fazzoletto alla bocca con la destra e tossisce
  fazzoletto: { ossa: { Spine01: [6, 0, 0], Spine02: [4, 0, 0], neck: [8, 0, 0], Head: [-4, 0, 0] },
    braccia: { Left: [[0.24, -1, 0.04], [0.12, -1, 0.12]], Right: { verso: "bocca", avanti: 0.07 } },
    vita: { respiro: [0.6, 2.4], ondeggia: 1, testa: 1.5, tosse: true },
    // nell'esame della bocca abbassa il fazzoletto
    esami: { mani: { braccia: [[0.14, -0.62, 0.77], [0.08, -0.05, 1]] }, ascelle: { braccia: { Left: [[0.8, 0.55, 0.22], [0.35, 0.92, 0.15]] } },
      bocca: { braccia: { Right: [[-0.3, -0.95, 0.15], [-0.15, -0.6, 0.78]] } } } },
  // la ragazza: le mani una nell'altra davanti, ogni tanto guarda l'uomo
  giovane: { ossa: { Spine01: [2, 0, 0], neck: [5, 0, 0], Head: [3, 0, 0], LeftShoulder: [0, 0, 2], RightShoulder: [0, 0, -2] },
    braccia: [[0.1, -1, 0.12], [-0.55, -0.42, 0.75]],
    vita: { respiro: [0.3, 1.0], testa: 1.5, occhiata: -14 } },
  // la ragazza il secondo giorno: le braccia incrociate
  braccia_conserte: { ossa: { Spine01: [1, 0, 0], neck: [4, 0, 0], Head: [2, 0, 0] },
    braccia: { Left: [[0.18, -0.85, 0.42], [-0.95, 0.18, 0.25]], Right: [[-0.18, -0.85, 0.42], [0.95, 0.24, 0.3]] },
    vita: { respiro: [0.32, 1.0], testa: 1.5, occhiata: -10 } },
  // la nonna: curva, le due mani sul bastone davanti a se'
  bastone: { ossa: { Spine01: [12, 0, 0], Spine02: [10, 0, 0], neck: [-4, 0, 0], Head: [-12, 0, 0] },
    braccia: { Left: { davanti: [0.02, 0.88, 0.3] }, Right: { davanti: [-0.04, 0.88, 0.3] } },
    vita: { respiro: [0.36, 1.2], testa: 2.5, tremito: 2.5 },
    attrezzi: [{ cosa: "bastone", davanti: [-0.01, 0, 0.3], alto: 0.86 }] },
};

// chi sta dove, stanza per stanza: la prima voce che vale (se: stato della persona o giorno). x, z (e y) nella stanza;
// gira in radianti (senza: guarda verso il medico)
export const POSTI = {
  cucina: {
    padre: [{ se: { stato: "grave" }, x: -0.86, z: -1.55, posa: "appoggiato" }, { x: -0.66, z: -1.4, posa: "curvo" }],
    figlia: [{ se: { giorno: 2 }, x: 0.08, z: -4.6, posa: "affranta" }, { x: 0.08, z: -4.82, posa: "spia" }],
  },
  camera: {
    madre: [{ se: { stato: "morto" }, x: 0.95, z: -2.98, gira: Math.PI / 2, posa: "morta" }, { x: 0.15, z: -2.6, posa: "seduta_letto" }],
  },
  soggiorno: {
    // il primo giorno l'uomo sta davanti alla porta chiusa; il secondo la porta e' aperta e lui si e' spostato
    uomo: [{ se: { giorno: 2 }, x: 0.3, z: -2.25, posa: "fazzoletto" }, { x: 0.68, z: -2.4, posa: "uomo" }],
    giovane: [{ se: { giorno: 2 }, x: -0.22, z: -3.0, posa: "braccia_conserte" }, { x: 0.1, z: -3.0, posa: "giovane" }],
    nonna: [{ se: { giorno: 2 }, x: -0.72, z: -2.7, posa: "bastone" }, { x: -0.42, z: -2.75, posa: "bastone" }],
  },
};

// com'e' ognuno, stato per stato: la faccia (texture in gioco/modelli/creta, senza: quella del modello), le mani
// ("nere": le dita nere; "fredde": le unghie bluastre), i bubboni (vedi Pupazzo.segni), la pelle alla base dei
// bubboni, gli oggetti addosso. Le espressioni sono facce col nome dello stato e dell'espressione
// (padre_creta_nervoso, padre_creta_grave_arrabbiato): se non c'e' quella dello stato, quella di base
export const ASPETTO = {
  padre: { pelle: 0xcbb596,
    malato: { bubboni: [{ dove: "collo" }] },
    grave: { faccia: "grave", mani: "nere", pelle: 0xc4bea6, bubboni: [{ dove: "collo", aperto: true }, { dove: "ascella" }] } },
  figlia: { pelle: 0xd8c4a8,
    sano: {},
    malato: { faccia: "febbre" } },
  madre: { pelle: 0xc2b39a,
    grave: { mani: "nere", bubboni: [{ dove: "collo" }, { dove: "collo_destra", r: 0.026 }, { dove: "ascella", r: 0.045 }] },
    morto: { faccia: "morta", mani: "nere", bubboni: [{ dove: "collo", aperto: true }, { dove: "collo_destra", r: 0.026 }, { dove: "ascella", aperto: true }],
      oggetti: ["rosario"] } },
  uomo: { pelle: 0xc99a86,
    malato: {},
    grave: { faccia: "grave", oggetti: ["fazzoletto"] } },
  giovane: { pelle: 0xd6c8b4,
    sano: { mani: "fredde" },
    malato: { faccia: "febbre", mani: "fredde" } },
  nonna: { pelle: 0xcdb9a0,
    sano: { oggetti: ["medaglietta"] },
    malato: { faccia: "febbre", oggetti: ["medaglietta"] } },
};

// quanto scotta ognuno all'infrarosso, se il gioco non lo dice (D.PERSONE[...].calore)
export const CALORE_MORTO = 0.12;
