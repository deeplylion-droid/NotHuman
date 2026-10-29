// Contenuti della giornata del prototipo: persone, verita', scene, esami, domande, prove, fax, giornale.
// Le coordinate sono frazioni dell'immagine (0-1, da sinistra e dall'alto).
// Le battute sono [chi, testo, extra]: chi e' la voce ("TU" e' il medico, null una descrizione); le parentesi
// quadre sono suoni e gesti. Tra asterischi le parole chiave, che si accendono: extra.k dice dove portano
// ("parte:padre.collo", "zona:tavola", "persona:figlia"; una stringa per tutte, o { parola: collegamento }).
// extra.d e' una dichiarazione che finisce sul nastro delle frasi, extra.volto l'espressione di chi parla.
import { MAPPA_3D } from "./mappa3d.js";

export const INIZIO = { ora: 13 * 60, coprifuoco: 20 * 60, soldi: 180, fiducia: 50 };
// la pazienza di ogni famiglia: cala di uno quando qualcuno si arrabbia o lo accusi a torto; a zero ti cacciano
export const PAZIENZA = 5;
export const CACCIATA = {
  casa3: [["PADRE", "Basta. Fuori da casa mia!", { volto: "arrabbiato" }], [null, "Ti sbattono la porta alle spalle."]],
  casa5: [["UOMO", "Fuori di qui, dottore. Adesso.", { volto: "arrabbiato" }], [null, "Ti sbattono la porta alle spalle."]],
};
export const MINUTI = { domanda: 10, esame: 10, prova: 10, sbaglio: 5, indizio: 5, porta: 5, forzare: 20, viaggio: 30 };
export const SOLDI = { paziente: 400, profilo: 200, stanza: 40, cena: 15, cassetta: 10, mancia: 50 };

export const PERSONE = {
  padre: { nome: "il padre", voce: "PADRE", casa: "casa3", luogo: "cucina", stato: "malato", profilo: false, calore: 0.8 },
  figlia: { nome: "la figlia", voce: "FIGLIA", casa: "casa3", luogo: "cucina", stato: "sano", profilo: true, calore: 0.52 },
  madre: { nome: "la madre", voce: "MADRE", casa: "casa3", luogo: "camera", stato: "grave", profilo: false, calore: 1.0 },
  uomo: { nome: "l'uomo in tuta", voce: "UOMO", casa: "casa5", luogo: "soggiorno", stato: "malato", profilo: false, calore: 0.78 },
  giovane: { nome: "la ragazza", voce: "RAGAZZA", casa: "casa5", luogo: "soggiorno", stato: "sano", profilo: true, calore: 0.4 },
  nonna: { nome: "la nonna", voce: "NONNA", casa: "casa5", luogo: "soggiorno", stato: "sano", profilo: false, calore: 0.5 },
};
// dalla voce delle battute alla persona
export const VOCI = Object.fromEntries(Object.entries(PERSONE).map(([id, p]) => [p.voce, id]));
// chi non si puo' vedere oggi: il ragazzo chiuso dietro la porta della casa 5
export const NASCOSTI = { casa5: [{ nome: "il ragazzo dietro la porta", stato: "grave" }] };

export const PARTI = { occhi: "occhi", bocca: "bocca", collo: "collo", ascelle: "ascelle", mani: "mani" };

// le scene: immagine, mappa dei personaggi (un grigio per persona), maschere per evidenziarli, mappa di
// calore per l'infrarosso, zone delle parti del corpo [cx, cy, rx, ry] e zone della stanza [x0, y0, x1, y1].
// "frasi": dove si scrivono le battute di ognuno, [x, y, lato] (vedi Parole.scrivi in parole.js), accanto alla
// testa senza coprire le facce. "segni" di una zona: cosa cerchiare quando la si indica [cx, cy, rx, ry].
export const LUOGHI = {
  cucina: {
    casa: "casa3", notte: false,
    persone: ["padre", "figlia"],
    frasi: { padre: [0.405, 0.07, "destra"], figlia: [0.525, 0.2, "destra"] },
    parti: {
      padre: {
        occhi: [[0.347, 0.222, 0.032, 0.022]], bocca: [[0.332, 0.282, 0.026, 0.02]],
        collo: [[0.328, 0.335, 0.036, 0.026]],
        ascelle: [[0.215, 0.43, 0.024, 0.04], [0.385, 0.42, 0.02, 0.04]],
        mani: [[0.25, 0.84, 0.032, 0.072], [0.372, 0.775, 0.024, 0.066]],
      },
      figlia: {
        occhi: [[0.483, 0.279, 0.013, 0.01]], bocca: [[0.484, 0.3, 0.011, 0.008]],
        collo: [[0.485, 0.317, 0.012, 0.008]],
        ascelle: [[0.458, 0.362, 0.009, 0.016], [0.501, 0.368, 0.009, 0.016]],
        mani: [[0.489, 0.35, 0.013, 0.017]],
      },
    },
    zone: [
      { id: "tavola", nome: "la tavola", box: [0.66, 0.58, 0.97, 0.84], tipo: "indizio",
        segni: [[0.766, 0.618, 0.03, 0.017], [0.727, 0.676, 0.036, 0.021], [0.875, 0.68, 0.038, 0.021], [0.896, 0.785, 0.048, 0.034]],
        dice: [[null, "Quattro *piatti* apparecchiati. Dicono di essere in due.", { k: "zona:tavola" }]], poi: { prova: "piatti" } },
      { id: "corridoio", nome: "il corridoio", box: [0.395, 0.13, 0.52, 0.62], tipo: "porta",
        segni: [[0.459, 0.385, 0.05, 0.235]] },
    ],
    // in fondo al corridoio, nella camera, c'e' la madre: all'infrarosso si vede il suo calore
    nascosti: [{ x: 0.433, y: 0.37, rx: 0.03, ry: 0.06, prova: "calore_corridoio" }],
  },
  camera: {
    // dietro la porta del corridoio: si torna in cucina, e chi c'e' si conosce entrando
    casa: "casa3", notte: true, ritorno: "cucina", conosci: ["madre"],
    persone: ["madre"],
    frasi: { madre: [0.635, 0.15, "destra"] },
    parti: {
      madre: {
        occhi: [[0.555, 0.296, 0.028, 0.017]], bocca: [[0.558, 0.367, 0.018, 0.015]],
        collo: [[0.558, 0.42, 0.02, 0.022]],
        ascelle: [[0.503, 0.49, 0.014, 0.03], [0.6, 0.49, 0.014, 0.03]],
        mani: [[0.553, 0.715, 0.042, 0.072]],
      },
    },
    zone: [
      { id: "comodino", nome: "il comodino", box: [0.26, 0.5, 0.38, 0.8], tipo: "indizio",
        segni: [[0.316, 0.6, 0.055, 0.15]],
        dice: [[null, "Sul comodino: un rosario e una scatola di *aspirine* vuota.", { k: "zona:comodino" }]] },
    ],
    nascosti: [],
  },
  soggiorno: {
    casa: "casa5", notte: false,
    persone: ["uomo", "giovane", "nonna"],
    frasi: { uomo: [0.695, 0.08, "destra"], giovane: [0.548, 0.035, "sinistra"], nonna: [0.335, 0.17, "sinistra"] },
    parti: {
      uomo: {
        occhi: [[0.615, 0.175, 0.032, 0.022]], bocca: [[0.625, 0.232, 0.022, 0.016]],
        collo: [[0.63, 0.28, 0.026, 0.02]],
        ascelle: [[0.575, 0.385, 0.015, 0.032], [0.735, 0.375, 0.016, 0.032]],
        mani: [[0.563, 0.668, 0.02, 0.052], [0.694, 0.73, 0.032, 0.066]],
      },
      giovane: {
        occhi: [[0.501, 0.261, 0.022, 0.014]], bocca: [[0.505, 0.32, 0.013, 0.011]],
        collo: [[0.505, 0.362, 0.014, 0.018]],
        ascelle: [[0.465, 0.443, 0.009, 0.02], [0.558, 0.443, 0.009, 0.02]],
        mani: [[0.477, 0.527, 0.022, 0.03]],
      },
      nonna: {
        occhi: [[0.409, 0.309, 0.026, 0.015]], bocca: [[0.409, 0.367, 0.015, 0.012]],
        collo: [[0.407, 0.405, 0.015, 0.015]],
        ascelle: [[0.309, 0.489, 0.013, 0.026], [0.447, 0.48, 0.01, 0.025]],
        mani: [[0.368, 0.578, 0.026, 0.04]],
      },
    },
    zone: [
      { id: "porta", nome: "la porta chiusa", box: [0.745, 0.03, 0.925, 0.92], tipo: "porta",
        segni: [[0.806, 0.5, 0.115, 0.455]] },
      { id: "termosifone", nome: "il termosifone", box: [0.08, 0.515, 0.275, 0.6], tipo: "indizio",
        segni: [[0.176, 0.568, 0.098, 0.04]],
        dice: [[null, "Il termosifone è *freddo*. Spento da giorni.", { k: "zona:termosifone" }]], poi: { prova: "termosifone" } },
    ],
    // dietro la porta chiusa, sdraiato: il ragazzo
    nascosti: [{ x: 0.83, y: 0.62, rx: 0.08, ry: 0.09, prova: "calore_porta" }],
  },
};

export const ARRIVO = {
  cucina: [["PADRE", "Dottore."], ["PADRE", "Qui stiamo tutti bene. Faccia in fretta.", { d: "tutti_bene" }]],
  camera: [["MADRE", "Chi è?"], ["MADRE", "[vede il medico]"], ["MADRE", "No. No, vi prego."]],
  soggiorno: [["UOMO", "Il medico."], ["NONNA", "Che bel becco. Mio marito ce l'aveva uguale."]],
};

// le porte: cosa si puo' fare davanti a ognuna (le voci della raggiera)
export const PORTE = {
  corridoio: {
    entra: { testo: "entra nel corridoio", vai: "camera" },
    scelte: [
      { testo: "pretendi di passare", minuti: 20,
        dice: [["TU", "Voglio vedere di là."], ["PADRE", "Di là non c'è niente!", { volto: "arrabbiato" }],
          ["PADRE", "[si scansa]", { volto: "arrabbiato" }], ["PADRE", "Va bene. Ma non la toccate.", { volto: "arrabbiato" }]],
        poi: { fiducia: -15, forzata: true, sblocca: "corridoio", conosci: "madre", vai: "camera" } },
      { testo: "offri 50 € al padre", minuti: 5, soldi: 50,
        dice: [["TU", "Cinquanta euro, e non ho visto niente."], ["PADRE", "[prende i soldi]", { volto: "nervoso" }],
          ["PADRE", "Cinque minuti."]],
        poi: { soldi: -50, sblocca: "corridoio", conosci: "madre", vai: "camera" } },
    ],
  },
  porta: {
    scelte: [
      { testo: "chiedi di aprire", minuti: 5,
        dice: [["TU", "Aprite questa porta."],
          ["UOMO", "È il *ripostiglio*. Roba vecchia.", { d: "ripostiglio", k: "zona:porta", volto: "nervoso" }],
          ["UOMO", "La chiave non so dove sia.", { d: "chiave", volto: "nervoso" }]] },
      { testo: "ascolta alla porta", minuti: 5,
        dice: [[null, "[da dietro la porta: una *tosse* lunga, soffocata]", { k: "zona:porta" }]], poi: { prova: "tosse" } },
      { testo: "pretendi di passare", minuti: 10,
        dice: [["TU", "Spostatevi."], ["UOMO", "Provateci.", { volto: "arrabbiato" }],
          ["UOMO", "[si mette davanti alla porta]", { volto: "arrabbiato" }],
          [null, "È grosso il doppio di te. Oggi non ti faranno passare."]], poi: { fiducia: -10 } },
      { testo: "offri 50 € all'uomo", minuti: 5, soldi: 50,
        dice: [["TU", "Cinquanta euro per aprire."], ["UOMO", "Non sono in vendita, dottore.", { volto: "arrabbiato" }]] },
    ],
  },
};

// gli esami: "rifiuta" se la persona non si fa guardare, altrimenti il primo piano e cosa dice;
// "reperto" e' cosa ha visto il medico, per la scheda della casa; "segno" e' il segno del protocollo che si vede
// (febbre, bubbone, pallore, dita), per i pallini rossi sul corpo nello stato di famiglia
export const ESAMI = {
  padre: {
    occhi: { reperto: "occhi lucidi e arrossati", segno: "febbre", dice: [["PADRE", "Ho dormito poco."]] },
    bocca: { reperto: "denti marci", dice: [["PADRE", "I denti sono così da sempre."]] },
    collo: { reperto: "gonfiore duro sotto la mascella", segno: "bubbone",
      dice: [["PADRE", "[tira su il colletto]"], ["PADRE", "È una *botta*.", { d: "botta", k: "parte:padre.collo" }]] },
    ascelle: { reperto: "si è rifiutato", rifiuta: [["PADRE", "Non mi spoglio davanti a mia figlia.", { volto: "arrabbiato" }]] },
    mani: { reperto: "grasso da meccanico sotto le unghie", dice: [["PADRE", "È grasso. Faccio il meccanico."]] },
  },
  figlia: {
    occhi: { reperto: "occhiaie, occhi chiari", dice: [["FIGLIA", "Non dormo bene."]] },
    bocca: { reperto: "labbra screpolate", dice: [["FIGLIA", "[silenzio]"]] },
    collo: { reperto: "niente", dice: [["FIGLIA", "[trattiene il respiro]"]] },
    ascelle: { reperto: "si è rifiutata", rifiuta: [["FIGLIA", "No."], ["PADRE", "Lasciatela stare.", { volto: "arrabbiato" }]] },
    mani: { reperto: "unghie mangiate", dice: [["FIGLIA", "Me le mangio. Da quando..."], ["FIGLIA", "[si ferma]"]] },
  },
  madre: {
    occhi: { reperto: "occhi lucidi, febbre alta", segno: "febbre", dice: [["MADRE", "[non riesce a tenere gli occhi aperti]"]] },
    bocca: { reperto: "labbra secche", dice: [["MADRE", "Acqua..."]] },
    collo: { reperto: "ghiandole gonfie", segno: "bubbone", dice: [["MADRE", "[geme]"]] },
    ascelle: { reperto: "bubbone sotto l'ascella", segno: "bubbone", dice: [["MADRE", "Fa male. Fa tanto male."]] },
    mani: { reperto: "punte delle dita nere", segno: "dita", dice: [["MADRE", "Non le sento più, le dita."]] },
  },
  uomo: {
    occhi: { reperto: "occhi lucidi e arrossati, sudore", segno: "febbre",
      dice: [["UOMO", "È il *termosifone*, vi ho detto.", { d: "sudo", k: "zona:termosifone" }]] },
    bocca: { reperto: "niente", dice: [["UOMO", "[ringhia]"]] },
    collo: { reperto: "sudato, niente gonfiori", dice: [["UOMO", "Avete finito?"]] },
    ascelle: { reperto: "si è rifiutato", rifiuta: [["UOMO", "Toccatemi e vi rompo il becco.", { volto: "arrabbiato" }]] },
    mani: { reperto: "niente", dice: [["UOMO", "[stringe i pugni]"]] },
  },
  giovane: {
    occhi: { reperto: "occhiaie, occhi chiari", dice: [["RAGAZZA", "[silenzio]"]] },
    bocca: { reperto: "labbra pallide, quasi viola", segno: "pallore", dice: [["RAGAZZA", "Ho *freddo*.", { d: "freddo", k: "zona:termosifone" }]] },
    collo: { reperto: "pallido, niente gonfiori", segno: "pallore", dice: [["RAGAZZA", "[deglutisce]"]] },
    ascelle: { reperto: "niente", dice: [["RAGAZZA", "Va bene."]] },
    mani: { reperto: "mani fredde, unghie bluastre", segno: "pallore", dice: [["RAGAZZA", "Sono sempre fredde."]] },
  },
  nonna: {
    occhi: { reperto: "cataratta", dice: [["NONNA", "Ci vedo poco. Ma lei la vedo benissimo."]] },
    bocca: { reperto: "un dente solo", dice: [["NONNA", "L'ultimo dente. Lo tengo per le feste."]] },
    collo: { reperto: "una medaglietta", dice: [["NONNA", "La Madonna. Contro i medici."]] },
    ascelle: { reperto: "si è rifiutata", rifiuta: [["NONNA", "Alla mia età? Si vergogni, dottore."]] },
    mani: { reperto: "artrite", dice: [["NONNA", "Ottant'anni di lavoro. Guardi pure."]] },
  },
};

// le domande, a raggiera attorno a chi si interroga: "breve" e' la voce della raggiera, "testo" cosa dice il
// medico; "se" la condizione per farla (un esame fatto o una prova trovata), "poi" cosa succede dopo
export const DOMANDE = {
  padre: [
    { id: "chi", breve: "chi vive qui?", testo: "Chi vive in questa casa?",
      dice: [["PADRE", "Io e mia *figlia*. Basta.", { d: "solo_due", k: "persona:figlia" }]] },
    { id: "febbre", breve: "la febbre?", testo: "Qualcuno ha avuto la febbre?",
      dice: [["PADRE", "Nessuno ha la *febbre*. Stiamo bene.", { d: "nessuna_febbre", k: "parte:padre.occhi" }]] },
    { id: "collo", breve: "il gonfiore?", testo: "Cos'è quel gonfiore sul collo?", se: { esame: "padre_collo" },
      dice: [["PADRE", "Una *botta*. Al lavoro.", { d: "botta", k: "parte:padre.collo", volto: "nervoso" }],
        ["PADRE", "Faccio il meccanico.", { volto: "nervoso" }]] },
    { id: "corridoio", breve: "il corridoio?", testo: "Chi c'è nel corridoio?",
      dice: [["PADRE", "Nessuno. È saltata la luce.", { volto: "nervoso" }],
        ["PADRE", "*Di là* non ci andiamo.", { d: "luce", k: "zona:corridoio", volto: "nervoso" }]] },
    { id: "nonno", breve: "tuo padre?", testo: "Dov'è tuo padre?", se: { detta: "piatto_morto" },
      dice: [["PADRE", "Era vecchio.", { volto: "nervoso" }], ["PADRE", "Una notte si è alzato ed è uscito. Scalzo.", { volto: "nervoso" }]] },
  ],
  figlia: [
    { id: "bene", breve: "stai bene?", testo: "Stai bene?", dice: [["FIGLIA", "Sì."], ["FIGLIA", "[guarda il padre]"]] },
    { id: "corridoio", breve: "il corridoio?", testo: "Chi c'è nel corridoio?",
      dice: [["FIGLIA", "Nessuno."], ["FIGLIA", "*Nessuno*, dottore.", { d: "nessuno_figlia", k: "zona:corridoio" }]] },
    { id: "madre", breve: "tua madre?", testo: "Dov'è tua madre?",
      dice: [["FIGLIA", "In città. Dalla zia.", { d: "madre_citta" }],
        ["PADRE", "È partita prima che chiudessero la strada.", { volto: "nervoso" }]] },
    { id: "nonno", breve: "il nonno?", testo: "Dov'è il nonno?", se: { detta: "piatto_morto" },
      dice: [["FIGLIA", "In tre giorni è cambiato. Poi non c'era più."], ["FIGLIA", "Aveva le dita nere.", { d: "dita_nere" }]] },
  ],
  madre: [
    { id: "febbre", breve: "da quanto?", testo: "Da quanto hai la febbre?",
      dice: [["MADRE", "Tre giorni. Forse quattro."], ["MADRE", "Mio suocero è finito così.", { d: "suocero" }]] },
    { id: "nasconde", breve: "perché ti nascondi?", testo: "Perché ti nascondi?",
      dice: [["MADRE", "Quelli che portate via non tornano.", { d: "non_tornano" }], ["MADRE", "Lo sanno tutti."]] },
    { id: "cibo", breve: "chi ti dà da mangiare?", testo: "Chi ti porta da mangiare?",
      dice: [["MADRE", "Mia figlia. Lei sta bene."], ["MADRE", "Non toccatela."]] },
  ],
  uomo: [
    { id: "chi", breve: "chi vive qui?", testo: "Chi vive in questa casa?",
      dice: [["UOMO", "Io, mia madre e mia figlia. Siamo in tre.", { d: "tre_in_casa" }]] },
    { id: "febbre", breve: "la febbre?", testo: "Avete avuto la febbre?",
      dice: [["UOMO", "Io sudo sempre. È il *termosifone*.", { d: "sudo", k: "zona:termosifone" }]] },
    { id: "porta", breve: "la porta?", testo: "Cosa c'è dietro quella porta?",
      dice: [["UOMO", "Il *ripostiglio*. Roba vecchia.", { d: "ripostiglio", k: "zona:porta", volto: "nervoso" }]] },
  ],
  giovane: [
    { id: "pallida", breve: "sei pallida", testo: "Sei molto pallida. Stai bene?",
      dice: [["RAGAZZA", "Non mangio molto, ultimamente."], ["RAGAZZA", "E ho *freddo*.", { d: "freddo", k: "zona:termosifone" }]] },
    { id: "porta", breve: "la porta?", testo: "Chi c'è dietro la porta?",
      dice: [["RAGAZZA", "[guarda il padre]"], ["RAGAZZA", "*Nessuno*.", { d: "nessuno_ragazza", k: "zona:porta" }]] },
    { id: "fratelli", breve: "fratelli?", testo: "Hai fratelli?",
      dice: [["RAGAZZA", "Uno. Lavora in città.", { d: "fratello_citta" }], ["UOMO", "Da un anno.", { volto: "nervoso" }]] },
  ],
  nonna: [
    { id: "come", breve: "come sta?", testo: "Come sta, signora?",
      dice: [["NONNA", "Ho ottantasei anni e un dente solo."], ["NONNA", "Benissimo."]] },
    { id: "porta", breve: "la porta?", testo: "Chi c'è dietro la porta?",
      dice: [["NONNA", "Il *ragazzo* dorme. Lasciatelo dormire.", { d: "ragazzo_dorme", k: "zona:porta" }],
        ["UOMO", "Mamma!", { volto: "arrabbiato" }]] },
    { id: "peste", breve: "la peste?", testo: "Ha mai visto la peste?",
      dice: [["NONNA", "Io no. Mia nonna sì."], ["NONNA", "Diceva che arrivò insieme al medico.", { d: "leggenda" }],
        ["NONNA", "Uno vestito come lei."]] },
  ],
};

// le dichiarazioni che finiscono sul nastro delle frasi, con la faccia di chi le ha dette
export const DICHIARAZIONI = {
  tutti_bene: { chi: "padre", testo: "«Stiamo tutti bene.»" },
  solo_due: { chi: "padre", testo: "«Io e mia figlia. Basta.»" },
  nessuna_febbre: { chi: "padre", testo: "«Nessuno ha la febbre.»" },
  botta: { chi: "padre", testo: "«Una botta. Al lavoro.»" },
  luce: { chi: "padre", testo: "«Di là non ci andiamo.»" },
  piatto_morto: { chi: "padre", testo: "«Un piatto è per mio padre. Se torna.»" },
  nessuno_figlia: { chi: "figlia", testo: "«Nel corridoio? Nessuno.»" },
  madre_citta: { chi: "figlia", testo: "«La mamma è in città.»" },
  mamma_di_la: { chi: "figlia", testo: "«La mamma è di là, con la febbre.»" },
  dita_nere: { chi: "figlia", testo: "«Il nonno aveva le dita nere.»" },
  suocero: { chi: "madre", testo: "«Mio suocero è finito così.»" },
  non_tornano: { chi: "madre", testo: "«Quelli che portate via non tornano.»" },
  tre_in_casa: { chi: "uomo", testo: "«Siamo in tre.»" },
  sudo: { chi: "uomo", testo: "«Sudo per il termosifone.»" },
  ripostiglio: { chi: "uomo", testo: "«È il ripostiglio.»" },
  chiave: { chi: "uomo", testo: "«La chiave non so dove sia.»" },
  freddo: { chi: "giovane", testo: "«Ho freddo.»" },
  nessuno_ragazza: { chi: "giovane", testo: "«Dietro la porta? Nessuno.»" },
  fratello_citta: { chi: "giovane", testo: "«Mio fratello è in città.»" },
  lasciatelo: { chi: "giovane", testo: "«È mio fratello. Lasciatelo stare.»" },
  ragazzo_dorme: { chi: "nonna", testo: "«Il ragazzo dorme.»" },
  leggenda: { chi: "nonna", testo: "«La peste arrivò col medico.»" },
  polmoni: { chi: "nonna", testo: "«Ha i polmoni deboli.»" },
};

// le prove: cose viste o capite. "testo" per il taccuino, "breve" per il nastro; la foto sul nastro viene da
// una zona della scena, dal primo piano di una parte del corpo o dalla faccia di chi l'ha detto ("da")
export const PROVE = {
  piatti: { casa: "casa3", testo: "Quattro piatti in tavola. Dicono di essere in due.", breve: "Quattro piatti in tavola.",
    zona: ["cucina", "tavola"] },
  bubbone_padre: { casa: "casa3", testo: "Il padre ha un gonfiore duro sotto la mascella. Dice che è una botta.",
    breve: "Il collo: non è una botta.", parte: ["padre", "collo"] },
  febbre_padre: { casa: "casa3", testo: "Il padre ha gli occhi lucidi e suda, ma dice che nessuno ha la febbre.",
    breve: "Il padre ha la febbre.", parte: ["padre", "occhi"] },
  madre_nonno: { casa: "casa3", testo: "La madre ha le dita nere, come il nonno prima di sparire.",
    breve: "Dita nere, come il nonno.", parte: ["madre", "mani"] },
  calore_corridoio: { casa: "casa3", testo: "Dal nastro: calore in fondo al corridoio. C'è qualcuno.",
    breve: "Calore nel corridoio.", zona: ["cucina", "corridoio"], ir: true },
  tosse: { casa: "casa5", testo: "Una tosse dietro la porta chiusa.", breve: "Una tosse dietro la porta.",
    zona: ["soggiorno", "porta"] },
  termosifone: { casa: "casa5", testo: "Il termosifone è freddo: spento da giorni.", breve: "Il termosifone è spento.",
    zona: ["soggiorno", "termosifone"] },
  febbre_uomo: { casa: "casa5", testo: "L'uomo suda con il termosifone spento: è febbre.", breve: "L'uomo suda al freddo.",
    parte: ["uomo", "occhi"] },
  tosse_ripostiglio: { casa: "casa5", testo: "Nel «ripostiglio» qualcuno tossisce. E non hanno il gatto.",
    breve: "Il ripostiglio tossisce.", da: "nonna" },
  calore_porta: { casa: "casa5", testo: "Dal nastro: calore dietro la porta chiusa. C'è qualcuno sdraiato.",
    breve: "Calore dietro la porta.", zona: ["soggiorno", "porta"], ir: true },
};

// le contestazioni: trascinando una frase del nastro su qualcosa (una zona, una persona, una parte del corpo,
// un'altra frase) che la contraddice. "coppie": [[frasi, bersagli], ...], in qualunque ordine; "se" una condizione;
// "timbro" se non e' una contraddizione ma due cose che combaciano
export const CONTESTAZIONI = [
  // casa 3
  { id: "quattro_piatti", coppie: [[["d:solo_due"], ["zona:tavola", "p:piatti"]], [["p:piatti"], ["persona:padre"]]],
    dice: [["TU", "Siete in due. E quattro piatti?"], ["PADRE", "[guarda la tavola]", { volto: "nervoso" }],
      ["PADRE", "Uno è per mio padre. È *sparito* la settimana scorsa.", { d: "piatto_morto", k: "zona:tavola", volto: "nervoso" }],
      ["PADRE", "Da noi si apparecchia per chi non torna. Quaranta giorni.", { volto: "nervoso" }]] },
  { id: "quarto_piatto", coppie: [[["d:piatto_morto"], ["zona:tavola", "p:piatti", "persona:padre"]]],
    dice: [["TU", "Tu, tua figlia, tuo padre. E il quarto piatto?"], ["PADRE", "...", { volto: "arrabbiato" }],
      ["PADRE", "Avete finito? Allora andate.", { volto: "arrabbiato" }]], poi: { fiducia: -5 } },
  { id: "figlia_cede",
    coppie: [[["d:nessuno_figlia", "d:madre_citta"], ["zona:tavola", "p:piatti", "d:piatto_morto"]],
      [["p:piatti", "d:piatto_morto"], ["persona:figlia"]]],
    dice: [["TU", "Quattro piatti. Per chi è il quarto?"], ["FIGLIA", "[piange]", { volto: "piange" }],
      ["FIGLIA", "La mamma è *di là*. Ha la febbre da tre giorni.", { d: "mamma_di_la", k: "zona:corridoio", volto: "piange" }],
      ["FIGLIA", "Vi prego, non portatela via.", { volto: "piange" }], ["PADRE", "Stupida.", { volto: "arrabbiato" }]],
    poi: { sblocca: "corridoio", conosci: "madre", volti: { figlia: "piange" } } },
  { id: "botta", coppie: [[["d:botta", "d:tutti_bene"], ["parte:padre.collo"]]], se: { esame: "padre_collo" },
    dice: [["TU", "Una botta non diventa dura e nera così."], ["PADRE", "[si tira su il colletto]", { volto: "nervoso" }],
      ["PADRE", "Sono affari miei.", { volto: "arrabbiato" }]], poi: { prova: "bubbone_padre" } },
  { id: "febbre_padre", coppie: [[["d:nessuna_febbre", "d:tutti_bene"], ["parte:padre.occhi"]]], se: { esame: "padre_occhi" },
    dice: [["TU", "Occhi lucidi, sudore. Questa è febbre."], ["PADRE", "Ho dormito poco.", { volto: "nervoso" }],
      ["PADRE", "Faccio il turno di notte, in officina.", { volto: "nervoso" }]], poi: { prova: "febbre_padre" } },
  { id: "luce", coppie: [[["d:luce"], ["d:mamma_di_la"]], [["d:mamma_di_la"], ["persona:padre"]]],
    dice: [["TU", "Di là non ci andate. Ma tua moglie è di là."], ["PADRE", "[guarda la figlia]", { volto: "arrabbiato" }],
      ["PADRE", "Cosa volete da noi?", { volto: "arrabbiato" }]] },
  { id: "come_il_nonno", timbro: "COMBACIA", coppie: [[["d:dita_nere", "d:suocero"], ["parte:madre.mani", "persona:madre"]]],
    dice: [["TU", "Tuo suocero aveva le dita nere."], ["MADRE", "Come le mie."], ["MADRE", "[si guarda le mani]"]],
    poi: { prova: "madre_nonno" } },
  // casa 5
  { id: "termosifone", coppie: [[["d:sudo"], ["zona:termosifone", "p:termosifone"]]],
    dice: [["TU", "Il termosifone è freddo. Perché sudi?"], ["UOMO", "Si sarà spento adesso.", { volto: "nervoso" }],
      ["NONNA", "È spento da una settimana."]], poi: { prova: "febbre_uomo" } },
  { id: "ripostiglio_tosse", coppie: [[["d:ripostiglio", "d:chiave", "d:tre_in_casa"], ["p:tosse"]], [["p:tosse"], ["persona:uomo"]]],
    dice: [["TU", "Dietro quella porta qualcuno tossisce."], ["UOMO", "Sarà il gatto.", { volto: "nervoso" }],
      ["NONNA", "Non abbiamo il gatto."]], poi: { prova: "tosse_ripostiglio" } },
  { id: "ragazzo_dorme",
    coppie: [[["d:ripostiglio", "d:tre_in_casa", "d:chiave"], ["d:ragazzo_dorme", "d:polmoni"]],
      [["d:ragazzo_dorme", "d:polmoni"], ["persona:uomo"]]],
    dice: [["TU", "Siete in tre. E il ragazzo che dorme di là?"], ["UOMO", "Mamma, stai zitta.", { volto: "arrabbiato" }],
      ["UOMO", "Non c'è nessun ragazzo. Andate via.", { volto: "arrabbiato" }]], poi: { fiducia: -5 } },
  { id: "ragazza_cede",
    coppie: [[["d:fratello_citta", "d:nessuno_ragazza"], ["d:ragazzo_dorme", "d:polmoni", "p:tosse", "p:tosse_ripostiglio"]],
      [["d:ragazzo_dorme", "d:polmoni", "p:tosse", "p:tosse_ripostiglio"], ["persona:giovane"]]],
    dice: [["TU", "Chi c'è davvero dietro quella porta?"], ["RAGAZZA", "[le tremano le labbra]", { volto: "piange" }],
      ["RAGAZZA", "È mio *fratello*. Lasciatelo stare.", { d: "lasciatelo", k: "zona:porta", volto: "piange" }],
      ["RAGAZZA", "Vi prego.", { volto: "piange" }], ["UOMO", "Basta così!", { volto: "arrabbiato" }]],
    poi: { volti: { giovane: "piange" } } },
  { id: "polmoni", timbro: "COMBACIA", coppie: [[["p:tosse", "p:tosse_ripostiglio"], ["persona:nonna"]]],
    dice: [["TU", "Chi tossisce così, signora?"],
      ["NONNA", "Il ragazzo ha sempre avuto i *polmoni* deboli.", { d: "polmoni", k: "zona:porta" }],
      ["UOMO", "Mamma!", { volto: "arrabbiato" }]] },
];

// cosa dice ognuno quando gli si mette davanti una frase o una prova che non lo contraddice; "_" per tutto il resto
export const REAZIONI = {
  padre: {
    dita_nere: [["PADRE", "[si irrigidisce]", { volto: "nervoso" }], ["PADRE", "Mio padre era vecchio. Basta."]],
    madre_citta: [["PADRE", "È partita prima che chiudessero la strada.", { volto: "nervoso" }]],
    _: [["PADRE", "E allora?"]],
  },
  figlia: {
    solo_due: [["FIGLIA", "[guarda il padre]"], ["FIGLIA", "Sì. Io e lui."]],
    _: [["FIGLIA", "[scuote la testa]"]],
  },
  madre: {
    mamma_di_la: [["MADRE", "Non è colpa sua. Gliel'ho chiesto io."]],
    madre_citta: [["MADRE", "In città? Ha detto così?"], ["MADRE", "Brava. Brava bambina."]],
    piatto_morto: [["MADRE", "Gli mettiamo il piatto. Così non si offende."]],
    _: [["MADRE", "[tossisce]"]],
  },
  uomo: {
    leggenda: [["UOMO", "Favole da vecchi."]],
    termosifone: [["UOMO", "Il gasolio costa. E allora?"]],
    _: [["UOMO", "Non so di cosa parlate."]],
  },
  giovane: {
    termosifone: [["RAGAZZA", "Non abbiamo i soldi per il gasolio."]],
    tre_in_casa: [["RAGAZZA", "[guarda il padre]"], ["RAGAZZA", "Sì. In tre."]],
    _: [["RAGAZZA", "[silenzio]"]],
  },
  nonna: {
    termosifone: [["NONNA", "Freddo come una tomba. Ci siamo abituati."]],
    chiave: [["NONNA", "Le porte chiuse non fermano niente. Lo diceva mia nonna."]],
    tre_in_casa: [["NONNA", "Tre? Mio figlio non ha mai saputo contare."]],
    _: [["NONNA", "Eh? Parli più forte, con quel becco."]],
  },
};

// lo stato di famiglia: cosa risulta all'anagrafe del comune per ogni casa segnalata, nell'ordine del
// certificato. Puo' essere vecchio o sbagliato (il nonno e' sparito, il figlio risulta in citta'). "persona" lega
// la riga a chi si incontra; chi non e' tra le PERSONE non si vede mai (il nonno, il ragazzo). "donna" per
// scrivere "nata".
export const COMUNE = "MALVENTO";
export const ANAGRAFE = {
  casa3: { via: "Via della Chiesa 12", righe: [
    { persona: "padre", nome: "ROSSI MARIO", ruolo: "intestatario", nato: 1971, mestiere: "meccanico" },
    { persona: "madre", nome: "BIANCHI ANNA", ruolo: "moglie", nato: 1974, donna: true },
    { persona: "figlia", nome: "ROSSI GIULIA", ruolo: "figlia", nato: 2004, donna: true },
    { persona: "nonno", nome: "ROSSI PIETRO", ruolo: "padre dell'intestatario", nato: 1941 },
  ] },
  casa5: { via: "Vicolo Stretto 3", righe: [
    { persona: "uomo", nome: "FERRI LUIGI", ruolo: "intestatario", nato: 1968, mestiere: "muratore" },
    { persona: "nonna", nome: "COSTA ADELE ved. FERRI", ruolo: "madre dell'intestatario", nato: 1940, donna: true },
    { persona: "giovane", nome: "FERRI MARTA", ruolo: "figlia", nato: 2003, donna: true },
    { persona: "ragazzo", nome: "FERRI DAVIDE", ruolo: "figlio", nato: 2006, anagrafe: "emigrato in città il 3.3.2025" },
  ] },
};
// la verita' su chi nel certificato non si incontra, per il confronto con le diagnosi alla fine
// il nonno non e' morto: la settimana scorsa e' diventato un mostro ed e' uscito di casa (dal 27 ottobre, sera)
export const ALTRI = { nonno: { stato: "mostro" }, ragazzo: { stato: "grave" } };

// le annotazioni: una frase o una prova del nastro lasciata sul nome giusto nello stato di famiglia diventa una
// nota a penna. "barra" cancella una o piu' note di prima (o "anagrafe", la nota del comune); "morto" segna chi e'
// diventato un mostro (il segno al posto della foto, il nome barrato).
export const ANNOTA = {
  // casa 3
  "d:tutti_bene": { padre: "«stiamo tutti bene»" },
  "d:solo_due": { padre: "«io e mia figlia, basta»: ma risultano in quattro" },
  "d:botta": { padre: "«una botta» al collo" },
  "p:bubbone_padre": { padre: { testo: "è un bubbone, sotto la mascella", barra: "d:botta" } },
  "p:febbre_padre": { padre: { testo: "ha la febbre: occhi lucidi, sudore", barra: "d:tutti_bene" } },
  "d:nessuna_febbre": { padre: "«nessuno ha la febbre»" },
  "d:luce": { padre: "«di là non ci andiamo»" },
  "d:madre_citta": { madre: "«è in città, dalla zia» (la figlia)" },
  "d:mamma_di_la": { madre: { testo: "nascosta di là, in camera: febbre da tre giorni", barra: "d:madre_citta" },
    figlia: "ha nascosto la madre" },
  "d:non_tornano": { madre: "ha paura: «quelli che portate via non tornano»" },
  "p:madre_nonno": { madre: "dita nere, come il suocero prima che sparisse" },
  "p:calore_corridoio": { madre: "il nastro all'infrarosso: calore in fondo al corridoio" },
  "d:nessuno_figlia": { figlia: "«nel corridoio non c'è nessuno»" },
  "d:piatto_morto": { nonno: { testo: "sparito la settimana scorsa: il quarto piatto è per lui", morto: true } },
  "d:dita_nere": { nonno: { testo: "cambiato in tre giorni, con le dita nere, poi sparito", morto: true } },
  "d:suocero": { nonno: { testo: "«è finito così» (la nuora)", morto: true } },
  // casa 5
  "d:tre_in_casa": { uomo: "«siamo in tre»: ma risultano in quattro" },
  "d:sudo": { uomo: "«sudo per il termosifone»" },
  "p:febbre_uomo": { uomo: { testo: "ha la febbre: suda col termosifone spento", barra: "d:sudo" } },
  "d:ripostiglio": { uomo: "«dietro la porta c'è il ripostiglio»" },
  "d:chiave": { uomo: "«la chiave non so dove sia»" },
  "d:freddo": { giovane: "«ho freddo»" },
  "p:termosifone": { giovane: "pallida per il freddo e la fame, non per la peste?" },
  "d:nessuno_ragazza": { giovane: "«dietro la porta nessuno»" },
  "d:fratello_citta": { ragazzo: "«lavora in città» (la sorella)" },
  "d:ragazzo_dorme": { ragazzo: { testo: "«il ragazzo dorme» (la nonna): è in casa", barra: ["d:fratello_citta", "anagrafe"] } },
  "d:lasciatelo": { ragazzo: { testo: "è dietro la porta chiusa (la sorella)", barra: ["d:fratello_citta", "anagrafe"] },
    giovane: "protegge il fratello" },
  "d:polmoni": { ragazzo: "ha i polmoni deboli (la nonna)" },
  "p:tosse": { ragazzo: "una tosse dietro la porta chiusa" },
  "p:tosse_ripostiglio": { ragazzo: { testo: "tossisce nel «ripostiglio»", barra: "anagrafe" } },
  "p:calore_porta": { ragazzo: { testo: "il nastro all'infrarosso: sdraiato dietro la porta, caldo", barra: "anagrafe" } },
  "d:leggenda": { nonna: "la peste arrivò con un medico vestito come te" },
};

// i timbri della diagnosi, dal piu' leggero al piu' grave
export const TIMBRI = [
  { id: "sano", testo: "SANO" }, { id: "sospetto", testo: "SOSPETTO" },
  { id: "malato", testo: "MALATO" }, { id: "grave", testo: "GRAVE" },
];

// la stanza del medico in 3D: cosa si legge usando le cose che non portano altrove (per la mattina, la sera o
// sempre); scrivania, videoregistratore, porta e letto li gestisce gioco.js
export const STANZA = {
  finestra: {
    mattina: ["La strada: le case di legno scrostate, i fili della luce, il campanile bianco della chiesa."],
    sera: ["Le tende tirate giù a metà. Ogni tanto ci passa sopra la luce dei fari della ditta."],
  },
  armadio: { sempre: ["Due camicie, un maglione, e una bottiglia lasciata da chi stava qui prima."] },
  cappotto: { sempre: ["Il cappotto incerato e il cappello. La ditta li vuole addosso a ogni visita."] },
  calendario: { sempre: ["Il calendario della Panacea: «Ci prendiamo cura di voi».", "Qualcuno, prima di te, ha cerchiato il 17."] },
  santino: { sempre: ["Un santino della padrona di casa: il santo che curava gli appestati, col bastone e il cane."] },
  termosifone: { sempre: ["Freddo. La padrona di casa lo accende a dicembre, se va bene."] },
  borsa: { sempre: ["La borsa: il termometro, i guanti di ricambio, le cassette vergini."] },
  orologio: {
    mattina: ["La radiosveglia. Il coprifuoco è alle otto."],
    sera: ["La radiosveglia. Domani a mezzogiorno arriva il fax nuovo."],
  },
  tavolo: { sempre: ["Il tavolino di legno, coi cerchi delle tazze. Due sedie: una in più, per chi non viene mai."] },
  credenza: { sempre: ["Il bollitore e la cassetta della ditta. Dentro: fagioli in scatola, crackers, il caffè solubile."] },
  lavandino: {
    mattina: ["L'acqua esce gialla, poi diventa fredda."],
    sera: ["Lo specchio è macchiato. Di notte è meglio non guardarci dentro."],
  },
  // la stanzetta dove dorme l'ospite della notte, la mattina (gioco.js socchiude la porta mentre si legge); la sera
  // la si controlla, vedi OSPITE
  ospite: {
    mattina: ["La stanzetta per l'ospite: una brandina dell'esercito e una coperta piegata.", "In paese dicono: chi dorme solo, il malvento se lo prende."],
  },
};

// l'ospite della notte (deciso il 26 ottobre): chi dorme solo, il malvento se lo prende. Nello stato di famiglia si
// sceglie chi si porta a casa (solo chi e' timbrato SANO, uno per notte). La sera dorme nella stanzetta: lo si
// controlla dalla porta (img/ospite/ospite_<persona>.jpg, al buio, in verde); la mattina c'e' il nastro della notte,
// girato dalla maschera rimasta accesa sulla scrivania (notte_dorme, poi notte_<persona>_1 e _2, una frase per
// ripresa). Chi dorme solo ha il suo nastro ("solo"). "mattina" va nel resoconto della notte: una riga sola
export const OSPITE = {
  figlia: {
    arriva: "La figlia ti ha seguito fino a casa senza dire una parola. Dorme nella stanzetta.",
    controllo: [["FIGLIA", "Non riesco a dormire."], [null, "Tiene gli occhi aperti nel buio, finché non chiudi la porta."]],
    nastro: ["[la stanza al buio. Il medico dorme]", "[la porta della stanzetta si apre. La figlia resta lì, a guardarti dormire]", "[fruga nelle tasche del tuo cappotto]"],
    mattina: "La figlia. Sul nastro fruga nelle tasche del tuo cappotto.",
  },
  giovane: {
    arriva: "La ragazza è venuta con te senza fare domande. Ha freddo. Dorme nella stanzetta.",
    controllo: [["RAGAZZA", "Qui almeno c'è il termosifone."], [null, "Il termosifone è spento. Lei trema lo stesso, seduta sulla brandina."]],
    nastro: ["[la stanza al buio. Il medico dorme]", "[la ragazza è sulla porta della stanzetta. Ti guarda]", "[si china su di te. Resta così, a lungo]"],
    mattina: "La ragazza. Sul nastro resta china su di te quasi un'ora.",
  },
  nonna: {
    arriva: "La nonna ha voluto venire. «Così vedo chi sei», ha detto. Dorme nella stanzetta.",
    controllo: [["NONNA", "Ave Maria, piena di grazia…"], [null, "Prega a occhi aperti. Non smette quando apri la porta."]],
    nastro: ["[la stanza al buio. Il medico dorme]", "[la nonna è sulla porta della stanzetta, col rosario]", "[ai piedi del letto ti benedice con l'acqua santa]"],
    mattina: "La nonna. Sul nastro ti benedice nel sonno, come si fa con i morti.",
  },
  padre: {
    arriva: "Il padre ti ha seguito fino a casa. Suda, ma dice che è la stanchezza. Dorme nella stanzetta.",
    controllo: [["PADRE", "Sto bene, dottore. È solo il freddo."], [null, "Trema sotto la coperta. Sul collo il gonfiore è più grosso di stamattina."]],
    nastro: ["[la stanza al buio. Il medico dorme]", "[il padre è sulla porta della stanzetta. Tossisce sangue nella mano]", "[ti respira addosso, chino sul letto]"],
    mattina: "Il padre, malato. Sul nastro ti respira addosso per ore.",
  },
  uomo: {
    arriva: "L'uomo in tuta è venuto con te, a malincuore. Suda. Dorme nella stanzetta.",
    controllo: [["UOMO", "Chiudi quella porta. Sto bene."], [null, "Tossisce nel pugno. La brandina è troppo piccola per lui."]],
    nastro: ["[la stanza al buio. Il medico dorme]", "[l'uomo si regge alla porta della stanzetta. Barcolla]", "[si siede sul tuo letto, ai tuoi piedi, e tossisce verso la videocamera]"],
    mattina: "L'uomo in tuta, malato. Sul nastro tossisce seduto sul tuo letto.",
  },
  madre: {
    arriva: "La madre è venuta con te, appoggiata al tuo braccio. Brucia di febbre. Dorme nella stanzetta.",
    controllo: [["MADRE", "Non dite niente a mio marito."], [null, "Respira con la bocca aperta. Le dita nere pendono fuori dalla brandina."]],
    nastro: ["[la stanza al buio. Il medico dorme]", "[la madre striscia fuori dalla stanzetta, sul pavimento]", "[è in piedi accanto al letto. Allunga la mano verso di te]"],
    mattina: "La madre, grave. Sul nastro allunga verso di te le dita nere.",
  },
  solo: {
    arriva: "Stanotte dormi solo. In paese dicono: chi dorme solo, il malvento se lo prende.",
    controllo: [[null, "Il buio della stanzetta. La brandina è vuota."], [null, "Chi dorme solo, il malvento se lo prende."]],
    nastro: ["[la stanza al buio. Il medico dorme]", "[la porta della stanzetta si apre da sola. Nel buio c'è qualcosa]", "[qualcosa è in piedi accanto al letto, chino su di te]"],
    mattina: "Sul nastro, accanto al letto, c'è qualcosa di alto e nero. Alla terza notte, dicono, ti porta via.",
  },
};

// la scrivania disegnata (senza WebGL 2): zone [x0, y0, x1, y1]; id e nomi valgono anche per quella in 3D
export const SCRIVANIA = [
  { id: "fax", nome: "Il fax", box: [0.03, 0.12, 0.3, 0.57] },
  { id: "giornale", nome: "Il giornale", box: [0.38, 0.05, 0.6, 0.26] },
  { id: "mappa", nome: "La mappa del paese", box: [0.33, 0.27, 0.67, 0.64] },
  { id: "nastri", nome: "Il videoregistratore", box: [0.69, 0.0, 0.97, 0.88] },
  { id: "taccuino", nome: "Gli stati di famiglia", box: [0.1, 0.67, 0.2, 0.89] },
  { id: "soldi", nome: "I soldi", box: [0.205, 0.65, 0.29, 0.82] },
  { id: "maschera", nome: "La maschera", box: [0.32, 0.61, 0.67, 0.95] },
  { id: "lampada", nome: "La lampada", box: [0.03, 0.0, 0.16, 0.12] },
];

// la mappa del paese, vista da sopra: le case, numerate per file dall'alto. Per ognuna: x, y dello spillo (un po'
// sotto il centro, cosi' la testa sta sulla casa) e l'ellisse che copre tutta la casa (centro, raggi), da illuminare
// quando ci si passa sopra; frazioni della mappa. Due edifici della mappa restano senza spillo: quello piccolo
// accanto alla casa 3 e quello sulla piazza, a destra della chiesa
const TETTI = [
  [0.3363, 0.3202, 0.3363, 0.2934, 0.0247, 0.0467], [0.4033, 0.2584, 0.4033, 0.2322, 0.0283, 0.0479], [0.4812, 0.237, 0.4812, 0.2136, 0.0228, 0.04],
  [0.6078, 0.2725, 0.6078, 0.2537, 0.0234, 0.0361], [0.6833, 0.3091, 0.6833, 0.2785, 0.0226, 0.0518], [0.3741, 0.4134, 0.3741, 0.3886, 0.0208, 0.0424],
  [0.4347, 0.3638, 0.4347, 0.3416, 0.0177, 0.0416], [0.5366, 0.3768, 0.5366, 0.358, 0.0187, 0.0372], [0.5876, 0.3937, 0.5876, 0.3665, 0.0206, 0.0463],
  [0.6402, 0.4011, 0.6402, 0.383, 0.0187, 0.0361], [0.3316, 0.5367, 0.3316, 0.5189, 0.0206, 0.0424], [0.3886, 0.5058, 0.3886, 0.4842, 0.0206, 0.0372],
  [0.7009, 0.4894, 0.7009, 0.4651, 0.0193, 0.0416], [0.3125, 0.6707, 0.3125, 0.641, 0.0267, 0.0502], [0.4061, 0.599, 0.4061, 0.5768, 0.022, 0.0392],
  [0.4469, 0.6429, 0.4469, 0.6193, 0.0173, 0.0404], [0.5266, 0.6137, 0.5266, 0.5865, 0.0238, 0.0463], [0.5986, 0.5952, 0.5986, 0.5738, 0.0202, 0.0369],
  [0.6722, 0.6154, 0.6722, 0.5906, 0.0193, 0.0435], [0.4343, 0.7645, 0.4343, 0.743, 0.0208, 0.0392], [0.5289, 0.7218, 0.5289, 0.7009, 0.0283, 0.0416],
  [0.61, 0.7249, 0.61, 0.7038, 0.0163, 0.0365], [0.5165, 0.8072, 0.5165, 0.7913, 0.0181, 0.0313],
];
export const CASE = {};
// dal 27 ottobre, sera, la mappa e' il paese in 3D visto in obliquo (tools/mappa.py): dove cadono le case sullo schermo
// lo dice MAPPA_3D (x, y, ex, ey, rx, ry come sopra); la pianta di TETTI resta in gx, gy, per le distanze del contagio
TETTI.forEach(([gx, gy], i) => {
  const [x, y, ex, ey, rx, ry] = MAPPA_3D.case[i];
  CASE[`casa${i + 1}`] = { n: i + 1, x, y, ex, ey, rx, ry, gx, gy, nota: "Nessuna segnalazione." };
});
Object.assign(CASE.casa1, { nota: "Croce sulla porta. Chiusa da ieri.", croce: true });
Object.assign(CASE.casa3, { luogo: "cucina",
  segnalata: "Un vicino: «Di notte tossiscono. E la moglie non si vede da giorni.»" });
Object.assign(CASE.casa5, { luogo: "soggiorno", segnalata: "Biglietto anonimo: «Tengono un ragazzo chiuso in casa.»" });
// i vicini: le due case piu' vicine, da cui passa il contagio di notte
const distanza = (a, b) => Math.hypot((a.gx - b.gx) * 16 / 9, a.gy - b.gy);
for (const c of Object.values(CASE)) {
  c.vicini = Object.keys(CASE).filter((id) => CASE[id] !== c)
    .sort((a, b) => distanza(CASE[a], c) - distanza(CASE[b], c)).slice(0, 2);
}
// i luoghi: sulla mappa in 3D hanno la loro lettera gialla (A, B, C, come nel pannello: le case hanno i numeri)
export const LUOGHI_MAPPA = [
  { id: "chiesa", nome: "La chiesa", segno: "A", x: MAPPA_3D.luoghi.chiesa[0], y: MAPPA_3D.luoghi.chiesa[1], nota: "Il campanile suona solo per i funerali." },
  { id: "cimitero", nome: "Il cimitero", segno: "B", x: MAPPA_3D.luoghi.cimitero[0], y: MAPPA_3D.luoghi.cimitero[1], nota: "Tre bare chiuse questa settimana. Nessuno le ha viste aprire." },
  { id: "ditta", nome: "Il recinto della Panacea", segno: "C", x: MAPPA_3D.luoghi.ditta[0], y: MAPPA_3D.luoghi.ditta[1],
    nota: "Il lazzaretto della ditta: tre prefabbricati bianchi, un'antenna, i fari accesi tutta la notte. Nessuno del paese ci è mai entrato." },
];

// il fax della ditta: il protocollo del giorno a simboli, da capire in un colpo d'occhio (i pittogrammi sono in
// icone.js); il pallore e' la bugia del protocollo
export const FAX = {
  giorno: 1,
  case: [3, 5],
  segni: [
    { icona: "febbre", nome: "FEBBRE", nota: "occhi lucidi, sudore" },
    { icona: "bubboni", nome: "BUBBONI", nota: "collo, ascelle" },
    { icona: "pallore", nome: "PALLORE", nota: "labbra viola" },
    { icona: "dita", nome: "DITA NERE", nota: "lazzaretto subito" },
  ],
  profilo: "18–35 anni, sani",
  motto: "Il tempo è salute. La salute è nostra.",
};

// la prima pagina del giornale disegnato (img/giornale.jpg, 1920x1072): Hf porta le coordinate della pagina (u, v),
// dove il riquadro della foto e' il quadrato 0-1, alle frazioni dell'immagine; i blocchi di testo sono in (u, v)
export const PAGINA = {
  Hf: [[0.296124, 0.022831, 0.2104], [-0.056189, 0.324735, 0.5858], [-0.000545, -0.004989, 1.0]],
  rapporto: 1920 / 1072,
  blocchi: {
    data: [0.04, -0.69, 1.9, -0.62], titolo: [0.04, -0.6, 1.88, -0.31], sommario: [0.08, -0.29, 1.82, -0.06],
    foto: [0.03, 0.03, 0.97, 0.83], didascalia: [0.03, 0.85, 0.97, 0.98],
    colonna1: [1.06, 0.03, 1.47, 1.03], colonna2: [1.56, 0.03, 1.93, 1.03],
  },
};

export const GIORNALE = {
  testata: "LA VOCE",
  data: "Foglio del paese · lunedì 26 ottobre",
  titolo: "È arrivato il medico",
  sommario: "La ditta Panacea ha mandato un medico per la peste. Il sindaco: «Aprite le porte e collaborate». Il coprifuoco resta alle 20.",
  articolo: "Il medico alloggia nella stanza sopra il bar. Gira con la maschera e il bastone, come nei quadri della chiesa. «Mi ha fatto paura», dice una vicina. «Ma se serve, serve.»",
  lettera: "«Mia nonna diceva che la peste arrivò in paese insieme a un medico. Chiudete le porte.» Lettera firmata.",
  breve: "Tre funerali a bara chiusa questa settimana. Il parroco: «Vecchiaia e freddo».",
  pubblicita: "PANACEA · Ci prendiamo cura di voi.",
  didascalia: "Il medico, ieri sera, nella via principale.",
};

// il nastro vecchio nel cassetto: il passato del medico
export const NASTRO_VECCHIO = {
  titolo: "NASTRO 7 · NON CANCELLARE",
  data: "MAR. 14 1998",
  righe: [[null, "[neve]"], ["VOCE", "...è arrivato il medico..."], ["VOCE", "...chiudete le porte..."], [null, "[neve]"],
    ["VOCE", "...le case dove entra lui..."], [null, "[il nastro si interrompe]"]],
};
