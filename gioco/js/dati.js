// Contenuti della giornata del prototipo: persone, verita', scene, esami, domande, prove, fax, giornale.
// Le coordinate sono frazioni dell'immagine (0-1, da sinistra e dall'alto).
// Nelle battute, chi parla e' la prima voce: "TU" e' il medico, null una descrizione; le parentesi quadre
// sono suoni e gesti, come nei sottotitoli per sordi.

export const DATA_OSD = "OTT. 26 2026";
export const INIZIO = { ora: 13 * 60, coprifuoco: 20 * 60, soldi: 180, fiducia: 50 };
export const MINUTI = { domanda: 10, esame: 10, prova: 10, indizio: 5, porta: 5, forzare: 20, viaggio: 30 };
export const SOLDI = { paziente: 400, profilo: 200, stanza: 40, cena: 15, cassetta: 10, mancia: 50 };

export const PERSONE = {
  padre: { nome: "il padre", voce: "PADRE", casa: "casa3", luogo: "cucina", stato: "malato", profilo: false, calore: 0.8 },
  figlia: { nome: "la figlia", voce: "FIGLIA", casa: "casa3", luogo: "cucina", stato: "sano", profilo: true, calore: 0.52 },
  madre: { nome: "la madre", voce: "MADRE", casa: "casa3", luogo: "camera", stato: "grave", profilo: false, calore: 1.0 },
  uomo: { nome: "l'uomo in tuta", voce: "UOMO", casa: "casa5", luogo: "soggiorno", stato: "malato", profilo: false, calore: 0.78 },
  giovane: { nome: "la ragazza", voce: "RAGAZZA", casa: "casa5", luogo: "soggiorno", stato: "sano", profilo: true, calore: 0.4 },
  nonna: { nome: "la nonna", voce: "NONNA", casa: "casa5", luogo: "soggiorno", stato: "sano", profilo: false, calore: 0.5 },
};
// chi non si puo' vedere oggi: il ragazzo chiuso dietro la porta della casa 5
export const NASCOSTI = { casa5: [{ nome: "il ragazzo dietro la porta", stato: "grave" }] };

export const PARTI = { occhi: "occhi", bocca: "bocca", collo: "collo", ascelle: "ascelle", mani: "mani" };

// le scene: immagine, mappa dei personaggi (un grigio per persona), maschere per evidenziarli, mappa di
// calore per l'infrarosso, zone delle parti del corpo [cx, cy, rx, ry] e zone della stanza [x0, y0, x1, y1]
export const LUOGHI = {
  cucina: {
    casa: "casa3", notte: false,
    persone: ["padre", "figlia"],
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
        dice: [[null, "Quattro piatti apparecchiati. Dicono di essere in due."]], poi: { prova: "piatti" } },
      { id: "corridoio", nome: "il corridoio", box: [0.395, 0.13, 0.52, 0.62], tipo: "porta" },
    ],
    // in fondo al corridoio, nella camera, c'e' la madre: all'infrarosso si vede il suo calore
    nascosti: [{ x: 0.433, y: 0.37, rx: 0.03, ry: 0.06, prova: "calore_corridoio" }],
  },
  camera: {
    casa: "casa3", notte: true,
    persone: ["madre"],
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
        dice: [[null, "Sul comodino: un rosario e una scatola di aspirine vuota."]] },
    ],
    nascosti: [],
  },
  soggiorno: {
    casa: "casa5", notte: false,
    persone: ["uomo", "giovane", "nonna"],
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
      { id: "porta", nome: "la porta chiusa", box: [0.745, 0.03, 0.925, 0.92], tipo: "porta" },
      { id: "termosifone", nome: "il termosifone", box: [0.09, 0.46, 0.27, 0.57], tipo: "indizio",
        dice: [[null, "Il termosifone è freddo. Spento da giorni."]], poi: { prova: "termosifone" } },
    ],
    // dietro la porta chiusa, sdraiato: il ragazzo
    nascosti: [{ x: 0.83, y: 0.62, rx: 0.08, ry: 0.09, prova: "calore_porta" }],
  },
};

export const ARRIVO = {
  cucina: [["PADRE", "Dottore."], ["PADRE", "Qui stiamo tutti bene. Faccia in fretta."]],
  camera: [["MADRE", "Chi è?"], ["MADRE", "[vede il medico]"], ["MADRE", "No. No, vi prego."]],
  soggiorno: [["UOMO", "Il medico."], ["NONNA", "Che bel becco. Mio marito ce l'aveva uguale."]],
};

// le porte: cosa si puo' fare davanti a ognuna
export const PORTE = {
  corridoio: {
    entra: { testo: "Entra nel corridoio", vai: "camera" },
    scelte: [
      { testo: "Pretendi di passare", minuti: 20,
        dice: [["TU", "Voglio vedere di là."], ["PADRE", "Di là non c'è niente!"], ["PADRE", "[si scansa]"],
          ["PADRE", "Va bene. Ma non la toccate."]],
        poi: { fiducia: -15, forzata: true, sblocca: "corridoio", conosci: "madre", vai: "camera" } },
      { testo: "Offri 50 € al padre", minuti: 5, soldi: 50,
        dice: [["TU", "Cinquanta euro, e non ho visto niente."], ["PADRE", "[prende i soldi]"],
          ["PADRE", "Cinque minuti."]],
        poi: { soldi: -50, sblocca: "corridoio", conosci: "madre", vai: "camera" } },
    ],
  },
  porta: {
    scelte: [
      { testo: "Chiedi di aprire", minuti: 5,
        dice: [["TU", "Aprite questa porta."], ["UOMO", "È il ripostiglio. Roba vecchia."],
          ["UOMO", "La chiave non so dove sia."]], poi: { prova: "porta_chiusa" } },
      { testo: "Ascolta alla porta", minuti: 5,
        dice: [[null, "[da dietro la porta: una tosse lunga, soffocata]"]], poi: { prova: "tosse" } },
      { testo: "Pretendi di passare", minuti: 10,
        dice: [["TU", "Spostatevi."], ["UOMO", "Provateci."], ["UOMO", "[si mette davanti alla porta]"],
          [null, "È grosso il doppio di te. Senza una prova, oggi non passi."]], poi: { fiducia: -10 } },
      { testo: "Offri 50 € all'uomo", minuti: 5, soldi: 50,
        dice: [["TU", "Cinquanta euro per aprire."], ["UOMO", "Non sono in vendita, dottore."]] },
    ],
  },
};

// gli esami: "rifiuta" se la persona non si fa guardare, altrimenti il primo piano e cosa dice
export const ESAMI = {
  padre: {
    occhi: { dice: [["PADRE", "Ho dormito poco."]] },
    bocca: { dice: [["PADRE", "I denti sono così da sempre."]] },
    collo: { dice: [["PADRE", "[tira su il colletto]"], ["PADRE", "È una botta."]] },
    ascelle: { rifiuta: [["PADRE", "Non mi spoglio davanti a mia figlia."]] },
    mani: { dice: [["PADRE", "È grasso. Faccio il meccanico."]] },
  },
  figlia: {
    occhi: { dice: [["FIGLIA", "Non dormo bene."]] },
    bocca: { dice: [["FIGLIA", "[silenzio]"]] },
    collo: { dice: [["FIGLIA", "[trattiene il respiro]"]] },
    ascelle: { rifiuta: [["FIGLIA", "No."], ["PADRE", "Lasciatela stare."]] },
    mani: { dice: [["FIGLIA", "Me le mangio. Da quando..."], ["FIGLIA", "[si ferma]"]] },
  },
  madre: {
    occhi: { dice: [["MADRE", "[non riesce a tenere gli occhi aperti]"]] },
    bocca: { dice: [["MADRE", "Acqua..."]] },
    collo: { dice: [["MADRE", "[geme]"]] },
    ascelle: { dice: [["MADRE", "Fa male. Fa tanto male."]] },
    mani: { dice: [["MADRE", "Non le sento più, le dita."]] },
  },
  uomo: {
    occhi: { dice: [["UOMO", "È il termosifone, vi ho detto."]] },
    bocca: { dice: [["UOMO", "[ringhia]"]] },
    collo: { dice: [["UOMO", "Avete finito?"]] },
    ascelle: { rifiuta: [["UOMO", "Toccatemi e vi rompo il becco."]] },
    mani: { dice: [["UOMO", "[stringe i pugni]"]] },
  },
  giovane: {
    occhi: { dice: [["RAGAZZA", "[silenzio]"]] },
    bocca: { dice: [["RAGAZZA", "Ho freddo."]] },
    collo: { dice: [["RAGAZZA", "[deglutisce]"]] },
    ascelle: { dice: [["RAGAZZA", "Va bene."]] },
    mani: { dice: [["RAGAZZA", "Sono sempre fredde."]] },
  },
  nonna: {
    occhi: { dice: [["NONNA", "Ci vedo poco. Ma lei la vedo benissimo."]] },
    bocca: { dice: [["NONNA", "L'ultimo dente. Lo tengo per le feste."]] },
    collo: { dice: [["NONNA", "La Madonna. Contro i medici."]] },
    ascelle: { rifiuta: [["NONNA", "Alla mia età? Si vergogni, dottore."]] },
    mani: { dice: [["NONNA", "Ottant'anni di lavoro. Guardi pure."]] },
  },
};

// domande: "se" la condizione per farla (un esame fatto o una prova trovata), "poi" cosa succede dopo
export const DOMANDE = {
  padre: [
    { id: "chi", testo: "Chi vive in questa casa?", dice: [["PADRE", "Io e mia figlia. Basta."]] },
    { id: "febbre", testo: "Qualcuno ha avuto la febbre?", dice: [["PADRE", "Nessuno. Stiamo bene, ve l'ho detto."]] },
    { id: "collo", testo: "Cos'è quel gonfiore sul collo?", se: { esame: "padre_collo" },
      dice: [["PADRE", "Una botta. Al lavoro."], ["PADRE", "Faccio il meccanico."]] },
    { id: "corridoio", testo: "Chi c'è nel corridoio?",
      dice: [["PADRE", "Nessuno. È saltata la luce, di là non ci andiamo."]] },
  ],
  figlia: [
    { id: "bene", testo: "Stai bene?", dice: [["FIGLIA", "Sì."], ["FIGLIA", "[guarda il padre]"]] },
    { id: "corridoio", testo: "Chi c'è nel corridoio?", dice: [["FIGLIA", "Nessuno."], ["FIGLIA", "Nessuno, dottore."]] },
    { id: "madre", testo: "Dov'è tua madre?",
      dice: [["FIGLIA", "In città. Dalla zia."], ["PADRE", "È partita prima che chiudessero la strada."]] },
  ],
  madre: [
    { id: "febbre", testo: "Da quanto hai la febbre?",
      dice: [["MADRE", "Tre giorni. Forse quattro."], ["MADRE", "Mio suocero è morto così."]] },
    { id: "nasconde", testo: "Perché ti nascondi?",
      dice: [["MADRE", "Quelli che portate via non tornano."], ["MADRE", "Lo sanno tutti."]] },
    { id: "cibo", testo: "Chi ti porta da mangiare?",
      dice: [["MADRE", "Mia figlia. Lei sta bene."], ["MADRE", "Non toccatela."]] },
  ],
  uomo: [
    { id: "chi", testo: "Chi vive in questa casa?", dice: [["UOMO", "Io, mia madre e mia figlia."]] },
    { id: "febbre", testo: "Avete avuto la febbre?", dice: [["UOMO", "Io sudo sempre. È il termosifone."]] },
    { id: "porta", testo: "Cosa c'è dietro quella porta?", dice: [["UOMO", "Il ripostiglio. Roba vecchia."]] },
  ],
  giovane: [
    { id: "pallida", testo: "Sei molto pallida. Stai bene?", dice: [["RAGAZZA", "Non mangio molto, ultimamente."]] },
    { id: "porta", testo: "Chi c'è dietro la porta?", dice: [["RAGAZZA", "[guarda il padre]"], ["RAGAZZA", "Nessuno."]] },
    { id: "fratelli", testo: "Hai fratelli?", dice: [["RAGAZZA", "Uno. Lavora in città."], ["UOMO", "Da un anno."]] },
  ],
  nonna: [
    { id: "come", testo: "Come sta, signora?",
      dice: [["NONNA", "Ho ottantasei anni e un dente solo."], ["NONNA", "Benissimo."]] },
    { id: "porta", testo: "Chi c'è dietro la porta?",
      dice: [["NONNA", "Il ragazzo dorme. Lasciatelo dormire."], ["UOMO", "Mamma!"]], poi: { prova: "ragazzo" } },
    { id: "peste", testo: "Ha mai visto la peste?",
      dice: [["NONNA", "Io no. Mia nonna sì."], ["NONNA", "Diceva che arrivò insieme al medico."],
        ["NONNA", "Uno vestito come lei."]], poi: { prova: "leggenda" } },
  ],
};

// le prove, come finiscono nel taccuino
export const PROVE = {
  piatti: { casa: "casa3", testo: "Quattro piatti in tavola. Dicono di essere in due." },
  nonno: { casa: "casa3", testo: "Un piatto è per il nonno, morto la settimana scorsa. E il quarto?" },
  nonno_dita: { casa: "casa3", testo: "La figlia: il nonno è morto in tre giorni, con le dita nere." },
  figlia_madre: { casa: "casa3", testo: "La figlia: la madre è di là, con la febbre da tre giorni." },
  calore_corridoio: { casa: "casa3", testo: "Dal nastro: calore in fondo al corridoio. C'è qualcuno." },
  porta_chiusa: { casa: "casa5", testo: "La porta chiusa: «il ripostiglio», e la chiave non si trova." },
  tosse: { casa: "casa5", testo: "Una tosse dietro la porta chiusa." },
  termosifone: { casa: "casa5", testo: "Il termosifone è freddo, ma l'uomo dice che suda per il caldo." },
  ragazzo: { casa: "casa5", testo: "La nonna: «Il ragazzo dorme. Lasciatelo dormire»." },
  ragazza_fratello: { casa: "casa5", testo: "La ragazza: «Lasciatelo stare»." },
  leggenda: { casa: "casa5", testo: "La nonna: la peste arrivò insieme a un medico vestito come te." },
  calore_porta: { casa: "casa5", testo: "Dal nastro: calore dietro la porta chiusa. C'è qualcuno sdraiato." },
};

// cosa dice ognuno davanti a una prova; "_" quando la prova non gli dice niente
export const REAZIONI = {
  padre: {
    piatti: { dice: [["PADRE", "Uno è per mio padre. È morto la settimana scorsa."],
      ["PADRE", "Da noi si apparecchia per i morti. Quaranta giorni."]], poi: { prova: "nonno" } },
    nonno: { dice: [["TU", "Tu, tua figlia, tuo padre. E il quarto piatto?"], ["PADRE", "..."],
      ["PADRE", "Avete finito? Allora andate."]], poi: { fiducia: -5 } },
    nonno_dita: { dice: [["PADRE", "[si irrigidisce]"], ["PADRE", "Mio padre era vecchio. Basta."]] },
    figlia_madre: { dice: [["PADRE", "[guarda la figlia]"], ["PADRE", "Stupida."]] },
    _: { dice: [["PADRE", "E allora?"]] },
  },
  figlia: {
    piatti: { dice: [["FIGLIA", "[piange]"], ["FIGLIA", "La mamma è di là. Ha la febbre da tre giorni."],
      ["FIGLIA", "Vi prego, non portatela via."]], poi: { prova: "figlia_madre", sblocca: "corridoio", conosci: "madre" } },
    nonno: { dice: [["FIGLIA", "Il nonno è morto in tre giorni."], ["FIGLIA", "Aveva le dita nere."]],
      poi: { prova: "nonno_dita" } },
    _: { dice: [["FIGLIA", "[scuote la testa]"]] },
  },
  madre: {
    nonno_dita: { dice: [["MADRE", "Le dita nere. Come lui."], ["MADRE", "[si guarda le mani]"]] },
    figlia_madre: { dice: [["MADRE", "Non è colpa sua. Gliel'ho chiesto io."]] },
    _: { dice: [["MADRE", "[tossisce]"]] },
  },
  uomo: {
    termosifone: { dice: [["UOMO", "Si sarà spento adesso."], ["NONNA", "È spento da una settimana."]] },
    tosse: { dice: [["UOMO", "Sarà il gatto."], ["NONNA", "Non abbiamo il gatto."]] },
    ragazzo: { dice: [["UOMO", "Mamma, stai zitta."], ["UOMO", "Non c'è nessun ragazzo. Andate via."]],
      poi: { fiducia: -5 } },
    porta_chiusa: { dice: [["UOMO", "Vi ho detto che la chiave non c'è."]] },
    leggenda: { dice: [["UOMO", "Favole da vecchi."]] },
    _: { dice: [["UOMO", "Non so di cosa parlate."]] },
  },
  giovane: {
    ragazzo: { dice: [["RAGAZZA", "[le tremano le labbra]"], ["RAGAZZA", "Lasciatelo stare. Vi prego."]],
      poi: { prova: "ragazza_fratello" } },
    tosse: { dice: [["RAGAZZA", "[abbassa gli occhi]"]] },
    termosifone: { dice: [["RAGAZZA", "Non abbiamo i soldi per il gasolio."]] },
    _: { dice: [["RAGAZZA", "[silenzio]"]] },
  },
  nonna: {
    tosse: { dice: [["NONNA", "Il ragazzo ha sempre avuto i polmoni deboli."], ["UOMO", "Mamma!"]],
      poi: { prova: "ragazzo" } },
    termosifone: { dice: [["NONNA", "Freddo come una tomba. Ci siamo abituati."]] },
    porta_chiusa: { dice: [["NONNA", "Le porte chiuse non fermano niente. Lo diceva mia nonna."]] },
    _: { dice: [["NONNA", "Eh? Parli più forte, con quel becco."]] },
  },
};

// la scrivania: zone [x0, y0, x1, y1]
export const SCRIVANIA = [
  { id: "fax", nome: "Il fax", box: [0.03, 0.12, 0.3, 0.57] },
  { id: "giornale", nome: "Il giornale", box: [0.38, 0.05, 0.6, 0.26] },
  { id: "mappa", nome: "La mappa del paese", box: [0.33, 0.27, 0.67, 0.64] },
  { id: "nastri", nome: "Il videoregistratore", box: [0.69, 0.0, 0.97, 0.88] },
  { id: "taccuino", nome: "Il taccuino", box: [0.1, 0.67, 0.2, 0.89] },
  { id: "soldi", nome: "I soldi", box: [0.205, 0.65, 0.29, 0.82] },
  { id: "maschera", nome: "La maschera", box: [0.32, 0.61, 0.67, 0.95] },
  { id: "lampada", nome: "La lampada", box: [0.03, 0.0, 0.16, 0.12] },
];

// la mappa: le case (x, y del tetto) e i vicini, da cui passa il contagio di notte
export const CASE = {
  casa1: { n: 1, x: 0.448, y: 0.265, nota: "Croce sulla porta. Chiusa da ieri.", croce: true },
  casa2: { n: 2, x: 0.37, y: 0.325, nota: "Nessuna segnalazione." },
  casa3: { n: 3, x: 0.41, y: 0.47, segnalata: "Un vicino: «Di notte tossiscono. E la moglie non si vede da giorni.»",
    vicini: ["casa2", "casa4"], luogo: "cucina" },
  casa4: { n: 4, x: 0.525, y: 0.565, nota: "Nessuna segnalazione." },
  casa5: { n: 5, x: 0.585, y: 0.655, segnalata: "Biglietto anonimo: «Tengono un ragazzo chiuso in casa.»",
    vicini: ["casa4", "casa6"], luogo: "soggiorno" },
  casa6: { n: 6, x: 0.73, y: 0.665, nota: "Nessuna segnalazione." },
  casa7: { n: 7, x: 0.545, y: 0.385, nota: "Nessuna segnalazione." },
  casa8: { n: 8, x: 0.67, y: 0.275, nota: "Nessuna segnalazione." },
  casa9: { n: 9, x: 0.22, y: 0.505, nota: "Nessuna segnalazione." },
  casa10: { n: 10, x: 0.19, y: 0.71, nota: "Nessuna segnalazione." },
};
export const LUOGHI_MAPPA = [
  { id: "chiesa", nome: "La chiesa", x: 0.785, y: 0.36, nota: "Il campanile suona solo per i funerali." },
  { id: "cimitero", nome: "Il cimitero", x: 0.88, y: 0.29, nota: "Tre tombe nuove questa settimana." },
];

export const FAX = {
  testata: "PANACEA S.A. · DIVISIONE CONTENIMENTO",
  sotto: "PROTOCOLLO DEL GIORNO 1 · 26.10 · 12:04",
  righe: [
    "Al medico incaricato.",
    "Case segnalate oggi: n. 3, n. 5.",
  ],
  segni: [
    ["FEBBRE", "occhi lucidi e arrossati, sudore."],
    ["BUBBONI", "gonfiori duri e scuri al collo o sotto le ascelle."],
    ["PALLORE", "pelle bianca e labbra viola indicano il contagio iniziale."],
    ["DITA NERE", "peste avanzata. Ricovero immediato."],
  ],
  profilo: "Soggetti tra i 18 e i 35 anni in apparente buona salute. Premio: 200 € a soggetto consegnato.",
  compenso: "400 € per paziente consegnato al lazzaretto.",
  chiusura: "La Panacea ricorda che il compenso è calcolato a paziente, non a ora. Il tempo è salute. La salute è nostra.",
  firma: "PANACEA · Ci prendiamo cura di voi.",
};

export const GIORNALE = {
  testata: "LA VOCE",
  data: "Foglio del paese · lunedì 26 ottobre",
  titolo: "È arrivato il medico",
  sommario: "La ditta Panacea ha mandato un medico per la peste. Il sindaco: «Aprite le porte e collaborate». Il coprifuoco resta alle 20.",
  articolo: "Il medico alloggia nella stanza sopra il bar. Gira con la maschera e il bastone, come nei quadri della chiesa. «Mi ha fatto paura», dice una vicina. «Ma se serve, serve.»",
  lettera: "«Mia nonna diceva che la peste arrivò in paese insieme a un medico. Chiudete le porte.» Lettera firmata.",
  breve: "Tre funerali questa settimana. Il parroco: «Vecchiaia e freddo».",
  pubblicita: "PANACEA · Ci prendiamo cura di voi.",
};

// il nastro vecchio nel cassetto: il passato del medico
export const NASTRO_VECCHIO = {
  titolo: "NASTRO 7 · NON CANCELLARE",
  data: "MAR. 14 1998",
  righe: [[null, "[neve]"], ["VOCE", "...è arrivato il medico..."], ["VOCE", "...chiudete le porte..."], [null, "[neve]"],
    ["VOCE", "...le case dove entra lui..."], [null, "[il nastro si interrompe]"]],
};
