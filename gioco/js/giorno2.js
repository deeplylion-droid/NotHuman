// Il secondo giorno (bozza del 27 ottobre, da approvare: docs/proposta_secondo_giorno.md). Le stesse case e le stesse
// stanze del primo giorno, con le persone cambiate dalle scelte di ieri: chi e' andato al lazzaretto non c'e' piu',
// chi e' rimasto in casa e' peggiorato, la madre e' morta nella notte, chi ha dormito dal medico ha la febbre (il
// medico e' il portatore, e non lo sa). giorno2(ieri) da' le tabelle del giorno, che in gioco.js prendono il posto
// di quelle di dati.js. ieri = { via: [chi e' stato portato al lazzaretto], ospite: chi ha dormito dal medico,
// contagiate: [case dove e' passato il contagio] }.
// Le scene le compone tools/prepara_gioco.py (GIORNO2), una per ogni combinazione di chi e' in casa:
// img/g2/<luogo>-<strati>.jpg, con le mappe delle persone, le sagome e il calore come le scene del primo giorno.
import * as D1 from "./dati.js";

const copia = (o) => JSON.parse(JSON.stringify(o));
// le battute di chi c'e': si scartano quelle con la voce di chi oggi non c'e' (null)
const righe = (...r) => r.filter(Boolean);

export function giorno2(ieri) {
  const via = new Set(ieri.via || []);
  const c = (id) => !via.has(id);
  const padre = c("padre"), madre = c("madre"), figlia = c("figlia");
  const uomo = c("uomo"), giovane = c("giovane"), nonna = c("nonna");
  // la figlia si ammala se e' rimasta coi genitori malati o se ha dormito dal medico; la ragazza e la nonna solo
  // se hanno dormito dal medico
  const figliaMalata = figlia && (padre || madre || ieri.ospite === "figlia");
  const giovaneMalata = giovane && ieri.ospite === "giovane";
  const nonnaMalata = nonna && ieri.ospite === "nonna";
  const ospiteF = ieri.ospite === "figlia", ospiteG = ieri.ospite === "giovane", ospiteN = ieri.ospite === "nonna";

  const tutte = {
    padre: { nome: "il padre", voce: "PADRE", casa: "casa3", luogo: "cucina2", stato: "grave", profilo: false, calore: 0.95, volto: "g2/padre" },
    figlia: { nome: "la figlia", voce: "FIGLIA", casa: "casa3", luogo: "cucina2", stato: figliaMalata ? "malato" : "sano", profilo: false,
      calore: figliaMalata ? 0.78 : 0.52, volto: figliaMalata ? "g2/figlia" : "figlia" },
    madre: { nome: "la madre", voce: "MADRE", casa: "casa3", luogo: "camera2", stato: "morto", profilo: false, calore: 0.12, volto: "g2/madre" },
    uomo: { nome: "l'uomo in tuta", voce: "UOMO", casa: "casa5", luogo: "soggiorno2", stato: "grave", profilo: false, calore: 0.95, volto: "g2/uomo" },
    giovane: { nome: "la ragazza", voce: "RAGAZZA", casa: "casa5", luogo: "soggiorno2", stato: giovaneMalata ? "malato" : "sano", profilo: false,
      calore: giovaneMalata ? 0.78 : 0.4, volto: giovaneMalata ? "g2/giovane_febbre" : "g2/giovane" },
    // la ditta oggi vuole i vecchi malati: la nonna e' il profilo, che sia malata o no
    nonna: { nome: "la nonna", voce: "NONNA", casa: "casa5", luogo: "soggiorno2", stato: nonnaMalata ? "malato" : "sano", profilo: true,
      calore: nonnaMalata ? 0.75 : 0.5, volto: "g2/nonna" },
  };
  const PERSONE = Object.fromEntries(Object.entries(tutte).filter(([id]) => c(id)));
  const VOCI = Object.fromEntries(Object.entries(tutte).map(([id, p]) => [p.voce, id]));

  // le scene: quale combinazione di strati e' in casa (i nomi dei file di prepara_gioco.py)
  const img = (luogo, strati) => `g2/${luogo}-${strati.filter(Boolean).join("-") || "vuota"}`;
  const L1 = D1.LUOGHI;
  const LUOGHI = {
    cucina2: {
      casa: "casa3", notte: false, ambiente: "cucina",
      img: img("cucina2", [padre && "padre", figlia && (figliaMalata ? "figlia" : "figlia_sana")]),
      persone: ["padre", "figlia"].filter(c),
      frasi: { padre: [0.405, 0.06, "destra"], figlia: [0.525, 0.2, "destra"] },
      parti: {
        padre: { ...copia(L1.cucina.parti.padre),
          // si regge al mobile con la mano destra; la sinistra pende
          mani: [[0.19, 0.6, 0.03, 0.06], [0.375, 0.79, 0.024, 0.066]] },
        figlia: copia(L1.cucina.parti.figlia),
      },
      zone: [
        { ...copia(L1.cucina.zone[0]), dice: [[null, "I quattro *piatti* di ieri, ancora sul tavolo. Nessuno ha mangiato.", { k: "zona:tavola" }]], poi: null },
        copia(L1.cucina.zone[1]),
      ],
      nascosti: [],
    },
    camera2: {
      casa: "casa3", notte: true, ritorno: "cucina2", conosci: ["madre"], morti: madre ? ["madre"] : [],
      // in camera, oggi, non respira piu' nessuno: solo il fruscio del nastro
      ambiente: null,
      img: img("camera2", [madre && "madre"]),
      persone: madre ? ["madre"] : [],
      frasi: { madre: [0.66, 0.2, "destra"] },
      parti: {
        madre: {
          occhi: [[0.512, 0.4, 0.03, 0.017]], bocca: [[0.512, 0.428, 0.018, 0.012]],
          collo: [[0.515, 0.462, 0.024, 0.014]], ascelle: [[0.46, 0.49, 0.018, 0.03], [0.635, 0.5, 0.018, 0.03]],
          mani: [[0.56, 0.494, 0.05, 0.035]],
        },
      },
      zone: [{ ...copia(L1.camera.zone[0]),
        dice: [[null, "Sul comodino: la scatola di *aspirine*, vuota, e un bicchiere d'acqua che nessuno ha bevuto.", { k: "zona:comodino" }]] }],
      nascosti: [],
    },
    soggiorno2: {
      casa: "casa5", notte: false, ambiente: "soggiorno",
      img: img("soggiorno2", [uomo && "uomo", giovane && (giovaneMalata ? "giovane_febbre" : "giovane"), nonna && "nonna"]),
      persone: ["uomo", "giovane", "nonna"].filter(c),
      frasi: { uomo: [0.71, 0.08, "destra"], giovane: [0.548, 0.035, "sinistra"], nonna: [0.335, 0.17, "sinistra"] },
      parti: {
        // l'uomo tiene il fazzoletto alla bocca con la destra; la ragazza ha le braccia incrociate; la nonna si regge
        // al bastone con tutte e due le mani
        uomo: { ...copia(L1.soggiorno.parti.uomo), ascelle: [[0.567, 0.36, 0.012, 0.03], [0.735, 0.36, 0.014, 0.03]],
          mani: [[0.62, 0.39, 0.045, 0.05]] },
        giovane: { ...copia(L1.soggiorno.parti.giovane), mani: [[0.505, 0.42, 0.03, 0.03]] },
        nonna: { ...copia(L1.soggiorno.parti.nonna), mani: [[0.355, 0.57, 0.03, 0.04]] },
      },
      zone: [copia(L1.soggiorno.zone[0]), copia(L1.soggiorno.zone[1])],
      // il ragazzo, portato giu' in cantina stanotte: sul nastro all'infrarosso, un calore sotto il pavimento
      nascosti: [{ x: 0.83, y: 0.965, rx: 0.08, ry: 0.035, prova: "calore_cantina" }],
    },
  };

  // ---------- l'arrivo ----------
  const ARRIVO = {
    cucina2: padre ? [[null, "[il padre è appoggiato al mobile. Respira a fatica]"], ["PADRE", "Ancora voi."],
      ["PADRE", "Fate quello che dovete. Non ho più la forza di mandarvi via."]]
      : figlia ? [["FIGLIA", "Mio padre ce l'avete voi."], ["FIGLIA", "Cosa volete ancora?"]]
        : [[null, "[la porta di casa è socchiusa. Nessuno risponde]"], [null, "In cucina non c'è nessuno."]],
    camera2: madre ? [[null, "[la madre è a letto, le mani giunte sul rosario]"], [null, "Non respira. È morta nella notte."]]
      : [[null, "[il letto è rifatto, il lenzuolo tirato]"], [null, "La madre è nel recinto della ditta, da ieri."]],
    soggiorno2: uomo ? righe([null, "[l'uomo tossisce nel fazzoletto. Sul bianco, macchie rosse]"], ["UOMO", "Ancora il becco."],
      nonna && ["NONNA", "Oggi tossiamo tutti, dottore. Si accomodi."])
      : nonna ? [["NONNA", "Mio figlio l'avete preso voi."], ["NONNA", "Adesso chi volete? Me?"]]
        : giovane ? [["RAGAZZA", "Sono rimasta sola."], ["RAGAZZA", "Cosa volete?"]]
          : [[null, "[la porta è aperta. In casa non c'è nessuno]"]],
  };

  // ---------- le porte ----------
  const chiApre = uomo ? "UOMO" : giovane ? "RAGAZZA" : nonna ? "NONNA" : null;
  const PORTE = {
    corridoio: {
      entra: { testo: "entra nel corridoio", vai: "camera2" },
      scelte: [
        { testo: "ascolta", minuti: 5, dice: [[null, "[dal fondo del corridoio non viene nessun rumore]"],
          [null, "Ieri, da lì, si sentiva respirare."]], poi: { prova: "silenzio" } },
        { testo: "entra nel corridoio", minuti: 5,
          dice: righe(["TU", "Voglio vedere di là."], padre && ["PADRE", "[non ha la forza di alzarsi]"],
            !padre && figlia && ["FIGLIA", "No! Lasciatela dormire!"]),
          poi: { sblocca: "corridoio", conosci: "madre", vai: "camera2" } },
      ],
    },
    porta: {
      scelte: [
        { testo: "chiedi di aprire", minuti: 5,
          dice: righe(["TU", "Aprite questa porta."], chiApre && [chiApre, "È aperta. Guardate pure."],
            [null, "Il ripostiglio è vuoto: una brandina sfatta, un secchio, un cuscino con una macchia scura."],
            [null, "Per terra, una *botola*, chiusa con un lucchetto nuovo.", { k: "zona:porta" }]),
          poi: { prova: "ripostiglio_vuoto" } },
        { testo: "ascolta alla porta", minuti: 5,
          dice: [[null, "[silenzio]"], [null, "Poi, da *sotto* il pavimento, un colpo di tosse.", { k: "zona:porta" }]],
          poi: { prova: "tosse_sotto" } },
        ...(chiApre ? [{ testo: "chiedi della botola", minuti: 5, se: { prova: "ripostiglio_vuoto" },
          dice: righe(["TU", "E la botola?"], [chiApre, "La cantina. Ci teniamo le *patate*.", { d: "patate", k: "zona:porta" }],
            nonna && chiApre !== "NONNA" && ["NONNA", "Le patate sono finite a settembre."]) }] : []),
      ],
    },
  };

  // ---------- gli esami ----------
  const E1 = D1.ESAMI;
  const ESAMI = {};
  if (padre) ESAMI.padre = {
    occhi: { reperto: "occhi lucidi e cerchiati, febbre altissima", segno: "febbre", foto: "g2/padre_occhi", dice: [["PADRE", "Brucio. Da stanotte."]] },
    bocca: { reperto: "labbra spaccate, sangue secco", segno: "tosse", foto: "g2/padre_bocca", dice: [["PADRE", "[respira con la bocca aperta]"]] },
    collo: { reperto: "il bubbone è viola, e si è aperto", segno: "bubbone", foto: "g2/padre_collo",
      dice: [["PADRE", "Lo so cos'è. Non serve che me lo dite."]] },
    ascelle: { reperto: "un altro bubbone sotto l'ascella", segno: "bubbone", foto: "g2/padre_ascelle", dice: [["PADRE", "[alza il braccio senza dire niente]"]] },
    mani: { reperto: "trema; due dita diventano nere", segno: "dita", foto: "g2/padre_mani", dice: [["PADRE", "Le dita. Come mio padre."]] },
  };
  if (figlia) ESAMI.figlia = figliaMalata ? {
    occhi: { reperto: "occhi lucidi, guance rosse: febbre", segno: "febbre", foto: "g2/figlia_occhi", dice: [["FIGLIA", "È il caldo della coperta."]] },
    bocca: { ...copia(E1.figlia.bocca), reperto: "labbra screpolate e secche" },
    collo: { reperto: "un gonfiore piccolo sotto l'orecchio, appena cominciato", segno: "bubbone", foto: "g2/figlia_collo",
      dice: [["FIGLIA", "[si tira su la coperta]"]] },
    ascelle: { reperto: "si è rifiutata", rifiuta: righe(["FIGLIA", "No."], padre && ["PADRE", "Lasciatela stare. Almeno lei."]) },
    mani: { ...copia(E1.figlia.mani), reperto: "unghie mangiate, mani che scottano", dice: [["FIGLIA", "Me le mangio. Lo sapete."]] },
  } : copia(E1.figlia);
  if (madre) ESAMI.madre = {
    occhi: { reperto: "occhi chiusi: non respira, è morta", foto: "g2/madre_occhi", dice: [[null, "La pelle è fredda. È morta da ore."]] },
    bocca: { reperto: "sangue secco all'angolo della bocca", segno: "tosse", foto: "g2/madre_bocca", dice: [[null, "Ha tossito sangue, prima di morire."]] },
    collo: { reperto: "bubboni duri sul collo", segno: "bubbone", dice: [[null, "[il collo è freddo e duro]"]] },
    ascelle: { reperto: "un bubbone sotto l'ascella", segno: "bubbone", dice: [[null, "[sotto il lenzuolo]"]] },
    mani: { reperto: "le dita nere, tutte", segno: "dita", foto: "g2/madre_mani", dice: [[null, "Le dita nere stringono il rosario."]] },
  };
  if (uomo) ESAMI.uomo = {
    occhi: { reperto: "occhi lucidi e cerchiati, febbre alta", segno: "febbre", foto: "g2/uomo_occhi", dice: [["UOMO", "Ho dormito poco."]] },
    bocca: { reperto: "sangue sulle labbra: viene dai polmoni", segno: "tosse", foto: "g2/uomo_bocca",
      dice: [["UOMO", "Mi sono *morso* la lingua.", { d: "lingua", k: "parte:uomo.bocca" }]] },
    collo: { reperto: "un bubbone sotto la mascella", segno: "bubbone", foto: "g2/uomo_collo", dice: [["UOMO", "[deglutisce a fatica]"]] },
    ascelle: { reperto: "si è rifiutato", rifiuta: [["UOMO", "No. Non oggi."]] },
    mani: { reperto: "sangue nel palmo: ha tossito nella mano", segno: "tosse", foto: "g2/uomo_mani", dice: [["UOMO", "[si pulisce la mano sulla tuta]"]] },
  };
  if (giovane) {
    ESAMI.giovane = copia(E1.giovane);
    if (giovaneMalata) ESAMI.giovane.occhi = { reperto: "occhi lucidi, guance rosse: febbre", segno: "febbre", foto: "g2/giovane_occhi",
      dice: [["RAGAZZA", "Ho dormito poco. Da voi."]] };
  }
  if (nonna) {
    ESAMI.nonna = copia(E1.nonna);
    ESAMI.nonna.bocca = { reperto: "tosse secca, niente sangue", dice: [["NONNA", "Tossisco dal '44, dottore."]] };
    if (nonnaMalata) ESAMI.nonna.occhi = { reperto: "cataratta, e occhi lucidi: febbre", segno: "febbre", foto: "g2/nonna_occhi",
      dice: [["NONNA", "Ecco. È arrivata anche per me."]] };
  }

  // ---------- le domande ----------
  const DOMANDE = {};
  if (padre) DOMANDE.padre = [
    { id: "come", breve: "come stai?", testo: "Come stai?",
      dice: [["PADRE", "Come uno che ha la peste, dottore."], ["PADRE", "Per vederlo non serve la vostra maschera."]] },
    ...(madre ? [{ id: "moglie", breve: "tua moglie?", testo: "Dov'è tua moglie?",
      dice: [["PADRE", "Di là. *Dorme*.", { d: "dorme_padre", k: "zona:corridoio" }], ["PADRE", "Stanotte è stata male. Adesso dorme."]] }] : []),
    ...(figlia ? [{ id: "figlia", breve: "tua figlia?", testo: "E tua figlia?",
      dice: figliaMalata ? [["PADRE", "Lei sta *bene*.", { d: "figlia_bene", k: "persona:figlia" }], ["PADRE", "[non la guarda]"]]
        : [["PADRE", "Lei sta bene. Lei sì."]] }] : []),
    ...(ospiteF ? [{ id: "notte", breve: "stanotte?", testo: "Dov'era tua figlia stanotte?",
      dice: [["PADRE", "Da voi. Ve la siete portata a casa."], ["PADRE", "Ed è tornata che *scottava*.", { d: "tornata_scottava", k: "persona:figlia" }]] }] : []),
  ];
  if (figlia) DOMANDE.figlia = [
    { id: "bene", breve: "stai bene?", testo: "Stai bene?",
      dice: figliaMalata ? [["FIGLIA", "*Sì*. Sto bene.", { d: "sto_bene", k: "parte:figlia.occhi" }], ["FIGLIA", "[trema sotto la coperta]"]]
        : [["FIGLIA", "Sì."], ["FIGLIA", "Sono sola, dottore. Stanotte ho sentito il vento."]] },
    { id: "madre", breve: "tua madre?", testo: "Dov'è tua madre?",
      dice: madre ? [["FIGLIA", "*Dorme*.", { d: "dorme_figlia", k: "zona:corridoio" }], ["FIGLIA", "Non svegliatela."]]
        : [["FIGLIA", "Ce l'avete voi. Nel recinto."], ["FIGLIA", "Come sta? Ditemi come sta."], [null, "Non lo sai. Dal recinto non esce nessuna notizia."]] },
    ...(ospiteF ? [{ id: "notte", breve: "dove hai dormito?", testo: "Come hai dormito, stanotte?",
      dice: [["FIGLIA", "Da voi. Sulla brandina."], ["FIGLIA", "Stamattina mi sono svegliata che *scottavo*.", { d: "svegliata_scottavo", k: "parte:figlia.occhi" }]] }] : []),
  ];
  if (uomo) DOMANDE.uomo = [
    { id: "sangue", breve: "il fazzoletto?", testo: "Cos'è quel sangue sul fazzoletto?",
      dice: [["UOMO", "Mi sono *morso* la lingua.", { d: "lingua", k: "parte:uomo.bocca" }]] },
    { id: "figlio", breve: "il ragazzo?", testo: "Dov'è il ragazzo di ieri?",
      dice: [["UOMO", "Quale ragazzo?"], ["UOMO", "Mio figlio è *partito*. Stanotte, per la città.", { d: "partito", k: "zona:porta" }]] },
    { id: "porta", breve: "la porta?", testo: "Cosa c'è dietro quella porta?",
      dice: [["UOMO", "Il ripostiglio. Oggi è aperto: guardate pure.", { k: "zona:porta" }]] },
  ];
  if (giovane) DOMANDE.giovane = [
    { id: "come", breve: "come stai?", testo: "Come stai?",
      dice: giovaneMalata ? [["RAGAZZA", "*Bene*.", { d: "bene_ragazza", k: "parte:giovane.occhi" }], ["RAGAZZA", "[ha le guance rosse]"]]
        : [["RAGAZZA", "Ho fame."], ["RAGAZZA", "E freddo. Come ieri."]] },
    { id: "fratello", breve: "tuo fratello?", testo: "Dov'è tuo fratello?",
      dice: [["RAGAZZA", "È *partito*. Stanotte.", { d: "partito_ragazza", k: "zona:porta" }], ["RAGAZZA", "[guarda il pavimento]"]] },
    ...(ospiteG ? [{ id: "notte", breve: "dove hai dormito?", testo: "Come hai dormito, stanotte?",
      dice: [["RAGAZZA", "Da voi. Sulla brandina, col termosifone spento."], ["RAGAZZA", "Stamattina avevo la *febbre*.", { d: "febbre_mattina", k: "parte:giovane.occhi" }]] }] : []),
  ];
  if (nonna) DOMANDE.nonna = [
    { id: "tosse", breve: "la tosse?", testo: "E quella tosse, signora?",
      dice: [["NONNA", "Tossisco dal '44, dottore.", { d: "tosse_vecchia", k: "parte:nonna.bocca" }], ["NONNA", "Non è la vostra peste. È la mia età."]] },
    { id: "ragazzo", breve: "il ragazzo?", testo: "Dov'è il ragazzo?",
      dice: righe(["NONNA", "Davide sta *sotto*. Al riparo.", { d: "sotto", k: "zona:porta" }],
        uomo ? ["UOMO", "Mamma!"] : giovane ? ["RAGAZZA", "Nonna!"] : null) },
    { id: "ditta", breve: "la ditta?", testo: "Cosa sa della ditta?",
      dice: [["NONNA", "Che vogliono i vecchi. Per le loro prove."], ["NONNA", "Lo dicono al bar. E lo dice anche il vostro fax.", { d: "vecchi_prove" }]] },
    ...(ospiteN ? [{ id: "notte", breve: "come ha dormito?", testo: "Come ha dormito, stanotte?",
      dice: [["NONNA", "Da lei, dottore. Ho sognato mia nonna."], ["NONNA", "Stamattina *scottavo*.", { d: "nonna_scottava", k: "parte:nonna.occhi" }]] }] : []),
  ];

  const DICHIARAZIONI = {
    dorme_padre: { chi: "padre", testo: "«Mia moglie dorme.»" },
    figlia_bene: { chi: "padre", testo: "«Lei sta bene.»" },
    tornata_scottava: { chi: "padre", testo: "«È tornata da voi che scottava.»" },
    dorme_figlia: { chi: "figlia", testo: "«La mamma dorme.»" },
    sto_bene: { chi: "figlia", testo: "«Sto bene.»" },
    svegliata_scottavo: { chi: "figlia", testo: "«Dopo la notte da voi, scottavo.»" },
    le_tenevo: { chi: "figlia", testo: "«Le tenevo la mano.»" },
    bruciate: { chi: figlia ? "figlia" : "padre", testo: "«Voi i morti li bruciate.»" },
    lingua: { chi: "uomo", testo: "«Mi sono morso la lingua.»" },
    partito: { chi: "uomo", testo: "«Mio figlio è partito stanotte.»" },
    chi_sfama: { chi: "uomo", testo: "«Chi li sfama, se mi portate via?»" },
    patate: { chi: chiApre === "UOMO" ? "uomo" : chiApre === "RAGAZZA" ? "giovane" : "nonna", testo: "«In cantina ci sono le patate.»" },
    bene_ragazza: { chi: "giovane", testo: "«Sto bene.»" },
    partito_ragazza: { chi: "giovane", testo: "«È partito stanotte.»" },
    febbre_mattina: { chi: "giovane", testo: "«Dopo la notte da voi, la febbre.»" },
    in_cantina: { chi: giovane ? "giovane" : uomo ? "uomo" : "nonna", testo: "«È giù in cantina.»" },
    tosse_vecchia: { chi: "nonna", testo: "«Tossisco dal '44.»" },
    sotto: { chi: "nonna", testo: "«Davide sta sotto, al riparo.»" },
    vecchi_prove: { chi: "nonna", testo: "«La ditta vuole i vecchi, per le prove.»" },
    nonna_scottava: { chi: "nonna", testo: "«Dopo la notte da lei, scottavo.»" },
  };

  const PROVE = {
    silenzio: { casa: "casa3", testo: "Dal fondo del corridoio, oggi, nessun respiro.", breve: "Nessun respiro di là.", zona: ["cucina2", "corridoio"] },
    madre_morta: { casa: "casa3", testo: "La madre è morta nella notte, in casa. Non l'hanno detto.", breve: "La madre è morta.", parte: ["madre", "occhi"] },
    febbre_figlia: { casa: "casa3", testo: "La figlia ha la febbre: occhi lucidi, guance rosse.", breve: "La figlia ha la febbre.", parte: ["figlia", "occhi"] },
    sangue_uomo: { casa: "casa5", testo: "L'uomo tossisce sangue: viene dai polmoni, non dalla lingua.", breve: "Tosse col sangue.", parte: ["uomo", "bocca"] },
    ripostiglio_vuoto: { casa: "casa5", testo: "Il ripostiglio è vuoto: una brandina sfatta, un cuscino macchiato, una botola col lucchetto nuovo.",
      breve: "Il ripostiglio vuoto, la botola.", zona: ["soggiorno2", "porta"] },
    tosse_sotto: { casa: "casa5", testo: "Da sotto il pavimento, un colpo di tosse.", breve: "Una tosse sotto il pavimento.", zona: ["soggiorno2", "porta"] },
    febbre_giovane: { casa: "casa5", testo: "La ragazza ha la febbre, da stamattina.", breve: "La ragazza ha la febbre.", parte: ["giovane", "occhi"] },
    febbre_nonna: { casa: "casa5", testo: "La nonna ha la febbre, da stamattina.", breve: "La nonna ha la febbre.", parte: ["nonna", "occhi"] },
    calore_cantina: { casa: "casa5", testo: "Dal nastro: un calore debole sotto il pavimento, vicino alla porta. In cantina c'è qualcuno.",
      breve: "Calore sotto il pavimento.", zona: ["soggiorno2", "porta"], ir: true },
  };

  // ---------- le contestazioni ----------
  const CONTESTAZIONI = [
    // casa 3: la madre non dorme, e' morta
    ...(madre ? [{ id: "morta",
      coppie: [[["d:dorme_padre", "d:dorme_figlia"], ["persona:madre", "parte:madre.occhi", "parte:madre.bocca", "parte:madre.collo",
        "parte:madre.ascelle", "parte:madre.mani", "p:silenzio"]],
        [["p:silenzio"], ["persona:padre", "persona:figlia"]]],
      dice: righe(["TU", "Non dorme. È morta."],
        figlia && ["FIGLIA", "[piange]", { volto: "piange" }],
        figlia && ["FIGLIA", "Stanotte. Le tenevo la *mano*.", { d: "le_tenevo", k: "persona:madre", volto: "piange" }],
        padre && ["PADRE", "Volevamo seppellirla noi. Al cimitero, con i suoi."],
        [figlia ? "FIGLIA" : "PADRE", "Voi i morti li *bruciate*, nel recinto.", { d: "bruciate", ...(figlia ? { volto: "piange" } : {}) }]),
      poi: { prova: "madre_morta", ...(figlia ? { volti: { figlia: "piange" } } : {}) } }] : []),
    ...(figliaMalata ? [{ id: "febbre_figlia", coppie: [[["d:sto_bene"], ["parte:figlia.occhi", "persona:figlia"]]], se: { esame: "figlia_occhi" },
      dice: righe(["TU", "Hai la febbre."], ["FIGLIA", "È il caldo della coperta."],
        padre ? ["PADRE", "Lasciatela stare! Lei no!"] : ["FIGLIA", "Non portatemi via. Qui non c'è più nessuno."]),
      poi: { prova: "febbre_figlia" } },
    { id: "figlia_bene", coppie: [[["d:figlia_bene"], ["parte:figlia.occhi", "p:febbre_figlia"]]],
      dice: [["TU", "Tua figlia ha la febbre."], ["PADRE", "[chiude gli occhi]"], ["PADRE", "Lo so. Lo so che ce l'ha."]] }] : []),
    // casa 5
    ...(uomo ? [{ id: "lingua", coppie: [[["d:lingua"], ["parte:uomo.bocca", "p:sangue_uomo"]]], se: { esame: "uomo_bocca" },
      dice: [["TU", "Non è la lingua. Viene dai polmoni."], ["UOMO", "E allora? Mi portate via?", { volto: "arrabbiato" }],
        ["UOMO", "Chi li sfama, questi, se mi portate via?", { d: "chi_sfama", volto: "arrabbiato" }]],
      poi: { prova: "sangue_uomo" } }] : []),
    { id: "partito",
      coppie: [[["d:partito", "d:partito_ragazza"], ["p:tosse_sotto", "p:ripostiglio_vuoto", "d:sotto"]],
        [["p:tosse_sotto", "d:sotto"], ["persona:uomo", "persona:giovane"]]],
      dice: righe(["TU", "Partito. E chi tossisce sotto il pavimento?"],
        giovane ? ["RAGAZZA", "[le tremano le labbra]"] : null,
        giovane ? ["RAGAZZA", "È giù in *cantina*. L'abbiamo portato giù stanotte.", { d: "in_cantina", k: "zona:porta" }]
          : uomo ? ["UOMO", "È giù in *cantina*. Al buio non lo trovate, pensavamo.", { d: "in_cantina", k: "zona:porta" }]
            : ["NONNA", "Ve l'avevo detto. Sta *sotto*, in cantina.", { d: "in_cantina", k: "zona:porta" }],
        uomo && giovane ? ["UOMO", "Basta così!", { volto: "arrabbiato" }] : null) },
    { id: "patate", coppie: [[["d:patate"], ["p:tosse_sotto", "d:sotto"]]],
      dice: righe(["TU", "Le patate tossiscono?"], nonna && chiApre !== "NONNA" ? ["NONNA", "Le patate sono finite a settembre."] : null,
        uomo ? ["UOMO", "Andate via, dottore.", { volto: "arrabbiato" }] : null) },
    ...(nonna ? [nonnaMalata
      ? { id: "febbre_nonna", coppie: [[["d:tosse_vecchia"], ["parte:nonna.occhi", "persona:nonna"]]], se: { esame: "nonna_occhi" },
        dice: [["TU", "Ha la febbre, signora."], ["NONNA", "Allora è arrivata anche per me."], ["NONNA", "Come diceva mia nonna: arriva col medico."]],
        poi: { prova: "febbre_nonna" } }
      : { id: "tosse_vecchia", timbro: "COMBACIA", coppie: [[["d:tosse_vecchia"], ["parte:nonna.bocca"]]], se: { esame: "nonna_bocca" },
        dice: [["TU", "Tosse secca, niente sangue."], ["NONNA", "Ve l'ho detto. È la mia età."]] }] : []),
    ...(giovaneMalata ? [{ id: "febbre_giovane", coppie: [[["d:bene_ragazza"], ["parte:giovane.occhi", "persona:giovane"]]], se: { esame: "giovane_occhi" },
      dice: [["TU", "Hai la febbre."], ["RAGAZZA", "Da stamattina."], ["RAGAZZA", "Ieri stavo bene. Ho dormito da voi."]],
      poi: { prova: "febbre_giovane" } }] : []),
  ];

  const REAZIONI = {
    padre: { _: [["PADRE", "[non ha la forza di rispondere]"]] },
    figlia: { _: [["FIGLIA", "[scuote la testa]"]] },
    madre: { _: [[null, "[non risponde. Non risponderà più]"]] },
    uomo: { leggenda: [["UOMO", "Favole da vecchi."]], vecchi_prove: [["UOMO", "Mia madre non la tocca nessuno."]], _: [["UOMO", "Non so di cosa parlate."]] },
    giovane: { _: [["RAGAZZA", "[silenzio]"]] },
    nonna: { partito: [["NONNA", "Partito? Mio figlio non ha mai saputo mentire."]], _: [["NONNA", "Eh? Parli più forte, con quel becco."]] },
  };

  const ANNOTA = {
    // casa 3
    "d:dorme_padre": { madre: "«dorme» (il marito)" },
    "d:dorme_figlia": { madre: "«dorme» (la figlia)" },
    "p:silenzio": { madre: "dalla camera, nessun respiro" },
    "p:madre_morta": { madre: { testo: "morta stanotte, in casa", barra: ["d:dorme_padre", "d:dorme_figlia"], morto: true } },
    "d:le_tenevo": { madre: { testo: "morta stanotte: la figlia le teneva la mano", morto: true }, figlia: "è rimasta con la madre morta" },
    "d:bruciate": { madre: "volevano seppellirla al cimitero: «voi li bruciate»" },
    "d:sto_bene": { figlia: "«sto bene»" },
    "p:febbre_figlia": { figlia: { testo: "ha la febbre: occhi lucidi, guance rosse", barra: ["d:sto_bene", "d:figlia_bene"] } },
    "d:figlia_bene": { figlia: "«lei sta bene» (il padre)" },
    "d:tornata_scottava": { figlia: "ha dormito dal medico: è tornata che scottava" },
    "d:svegliata_scottavo": { figlia: "dopo la notte dal medico, la febbre" },
    // casa 5
    "d:lingua": { uomo: "«mi sono morso la lingua»" },
    "p:sangue_uomo": { uomo: { testo: "tossisce sangue, dai polmoni", barra: "d:lingua" } },
    "d:chi_sfama": { uomo: "«chi li sfama, se mi portate via?»" },
    "d:partito": { ragazzo: "«partito stanotte per la città» (il padre)" },
    "d:partito_ragazza": { ragazzo: "«partito stanotte» (la sorella)" },
    "p:ripostiglio_vuoto": { ragazzo: "il ripostiglio è vuoto: una brandina sfatta, una botola col lucchetto" },
    "p:tosse_sotto": { ragazzo: "una tosse sotto il pavimento" },
    "d:sotto": { ragazzo: "«sta sotto, al riparo» (la nonna)" },
    "d:patate": { ragazzo: "«in cantina ci sono le patate»" },
    "d:in_cantina": { ragazzo: { testo: "è giù in cantina, sotto la botola", barra: ["d:partito", "d:partito_ragazza", "d:patate", "anagrafe"] } },
    "p:calore_cantina": { ragazzo: { testo: "il nastro all'infrarosso: caldo sotto il pavimento", barra: "anagrafe" } },
    "d:tosse_vecchia": { nonna: "«tossisco dal '44»" },
    "d:vecchi_prove": { nonna: "la ditta vuole i vecchi «per le prove»" },
    "d:nonna_scottava": { nonna: "dopo la notte dal medico, la febbre" },
    "p:febbre_nonna": { nonna: { testo: "ha la febbre", barra: "d:tosse_vecchia" } },
    "d:bene_ragazza": { giovane: "«sto bene»" },
    "d:febbre_mattina": { giovane: "dopo la notte dal medico, la febbre" },
    "p:febbre_giovane": { giovane: { testo: "ha la febbre", barra: "d:bene_ragazza" } },
  };

  // lo stato di famiglia: le stesse righe del comune; chi ieri e' andato al lazzaretto ha il timbro della ditta
  const ANAGRAFE = copia(D1.ANAGRAFE);
  for (const A of Object.values(ANAGRAFE)) for (const r of A.righe) if (via.has(r.persona)) r.ditta = "AL LAZZARETTO DAL 26.10";
  const ALTRI = { ...copia(D1.ALTRI), ...Object.fromEntries([...via].map((id) => [id, { stato: "lazzaretto" }])) };

  const CACCIATA = {
    casa3: righe(padre ? ["PADRE", "Andate via. Lasciateci morire in pace."] : figlia ? ["FIGLIA", "Andate via!"] : null,
      [null, "Ti chiudono la porta alle spalle."]),
    casa5: righe(uomo ? ["UOMO", "Fuori. Adesso.", { volto: "arrabbiato" }] : nonna ? ["NONNA", "Fuori, becco."] : giovane ? ["RAGAZZA", "Andate via!"] : null,
      [null, "Ti sbattono la porta alle spalle."]),
  };

  // la mappa: le case 3 e 5 di nuovo da visitare; dove stanotte e' passato il contagio, il segno (per ora non si visita)
  const CASE = Object.fromEntries(Object.entries(D1.CASE).map(([id, k]) => [id, { ...k }]));
  CASE.casa3.luogo = "cucina2";
  CASE.casa3.segnalata = madre ? "Un vicino: «Stanotte la ragazza gridava. Poi più niente.»"
    : "Un vicino: «Il padre tossisce tutta la notte. Si sente dalla strada.»";
  CASE.casa5.luogo = "soggiorno2";
  CASE.casa5.segnalata = "Un altro biglietto: «Stanotte hanno portato giù qualcosa in cantina.»";
  for (const id of ieri.contagiate || []) if (CASE[id] && !CASE[id].luogo) CASE[id].nota = "Stanotte qui si è ammalato qualcuno. (Nella bozza non si visita.)";

  // l'ospite della seconda notte: gli stessi, ma chi dorme solo vede la cosa nera piu' vicina
  const OSPITE = copia(D1.OSPITE);
  OSPITE.solo = {
    arriva: "Stanotte dormi di nuovo solo. Chi dorme solo, il malvento se lo prende.",
    controllo: [[null, "Il buio della stanzetta. La brandina è vuota."], [null, "Sulla coperta piegata c'è un incavo, come se qualcuno ci fosse stato seduto."]],
    nastro: ["[la stanza al buio. Il medico dorme]", "[qualcosa è chino sul letto, come ieri notte]", "[adesso è seduto sul letto. Ti tiene una mano sul petto]"],
    immagini: ["notte_dorme", "notte_solo_2", "notte_solo_3"],
    mattina: "Hai dormito solo. Sul nastro la cosa nera è seduta sul tuo letto, con una mano sul tuo petto. È la seconda notte: in paese dicono che alla terza ti porta via.",
  };
  for (const p of ["figlia", "giovane", "nonna"]) OSPITE[p].mattina += " Aveva la fronte calda.";

  return {
    PERSONE, VOCI, NASCOSTI: { casa5: [{ nome: "il ragazzo in cantina", stato: "grave" }] }, LUOGHI, ARRIVO, PORTE, ESAMI, DOMANDE,
    DICHIARAZIONI, PROVE, CONTESTAZIONI, REAZIONI, ANNOTA, ANAGRAFE, ALTRI, CACCIATA, CASE, OSPITE,
    SOLDI: { ...D1.SOLDI, paziente: 450, profilo: 300 },
    // il protocollo cambia: entra la tosse col sangue, il pallore resta (la ditta continua a mentire), e il profilo
    // richiesto sono i vecchi malati
    FAX: {
      giorno: 2, case: [3, 5],
      segni: [
        { icona: "febbre", nome: "FEBBRE", nota: "occhi lucidi, sudore" },
        { icona: "bubboni", nome: "BUBBONI", nota: "collo, ascelle" },
        { icona: "tosse", nome: "TOSSE", nota: "col sangue: grave" },
        { icona: "pallore", nome: "PALLORE", nota: "labbra viola" },
        { icona: "dita", nome: "DITA NERE", nota: "lazzaretto subito" },
      ],
      profilo: "oltre 70 anni, malati",
      motto: "Un paziente consegnato è un paziente salvato.",
    },
    INTRO: [[null, "Giorno 2. Il fax nuovo è arrivato all'alba, col protocollo cambiato."],
      [null, "Le case 3 e 5 sono di nuovo sulla lista."]],
  };
}

// la verita' del secondo giorno, per la fine della bozza
export function verita2(ieri) {
  const via = new Set(ieri.via || []);
  const c = (id) => !via.has(id);
  const figliaMalata = c("figlia") && (c("padre") || c("madre") || ieri.ospite === "figlia");
  const t = [];
  t.push(`Casa 3: ${c("madre") ? "la madre è morta nella notte, in casa: era grave da giorni" : "la madre era nel recinto della ditta"}. `
    + `${c("padre") ? "Il padre era grave: bubbone aperto, dita che diventano nere" : "Il padre era nel recinto"}. `
    + (c("figlia") ? (figliaMalata ? `La figlia si è ammalata: ${ieri.ospite === "figlia" ? "aveva dormito da te" : "viveva coi malati"}.` : "La figlia era ancora sana.") : "La figlia era nel recinto."));
  t.push(`Casa 5: ${c("uomo") ? "l'uomo era grave, tossiva sangue" : "l'uomo era nel recinto"}. `
    + (c("giovane") ? (ieri.ospite === "giovane" ? "La ragazza aveva la febbre: aveva dormito da te. " : "La ragazza era sana, pallida di freddo e di fame. ") : "")
    + (c("nonna") ? (ieri.ospite === "nonna" ? "La nonna aveva la febbre: aveva dormito da te. " : "La nonna era sana: la sua tosse è vecchiaia. ") : "")
    + "Il ragazzo era giù in cantina, sotto la botola: grave.");
  t.push("Il protocollo mentiva ancora sul pallore. La tosse col sangue era vera.");
  t.push("Chi dorme dal medico si ammala: il medico è il portatore, e non lo sa.");
  return t;
}

// il giornale del terzo giorno, dopo la seconda notte (n: calcolaNotte di gioco.js; oggi: lo stato del secondo giorno)
export function giornale3(n, oggi) {
  const presi = n.portati;
  let titolo = "Il medico torna nelle stesse case";
  let sommario = "Secondo giro alla casa 3 e alla casa 5. In paese ci si chiede cosa cerchi.";
  if (presi.includes("nonna")) {
    titolo = "Portata via la nonna del vicolo";
    sommario = "Ottantasei anni. La Panacea: «Rientrava nel profilo». La nipote l'ha seguita fino al recinto.";
  } else if (oggi.morti.madre) {
    titolo = "Morta la moglie del meccanico";
    sommario = "La famiglia l'aveva nascosta anche da morta. Il parroco chiede di seppellirla in paese.";
  } else if (n.ospite) {
    const nome = n.ospite.chi === "giovane" ? "la ragazza del vicolo" : n.ospite.chi === "nonna" ? "la nonna del vicolo" : "la figlia del meccanico";
    titolo = `Il medico ospita ${nome}`;
    sommario = "«Chi va a dormire da lui, il giorno dopo scotta», dice qualcuno al bar.";
  } else if (n.contagiate.length) {
    titolo = "La peste si allarga ancora";
    sommario = `Nuovi malati nelle case ${n.contagiate.map((c) => D1.CASE[c].n).join(", ")}.`;
  }
  const umore = n.fiducia >= 60 ? "«Almeno lui ci prova», dice il barista."
    : n.fiducia >= 35 ? "Al bar, quando entra il discorso del medico, si abbassa la voce."
      : "Stanotte qualcuno ha dipinto una croce nera sulla porta del bar, sotto la stanza del medico.";
  return {
    testata: "LA VOCE", data: "Foglio del paese · mercoledì 28 ottobre", titolo, sommario, articolo: umore,
    lettera: n.ospite ? "«Chi dorme con lui si ammala. Non è una favola.» Lettera non firmata."
      : "«Due notti da solo. Alla terza, il malvento se lo prende.» Lettera non firmata.",
    breve: "La Panacea alza i compensi: «Il profilo cambia ogni giorno, come il virus».",
    pubblicita: "PANACEA · Ci prendiamo cura di voi.",
    didascalia: "Il medico, ieri, davanti a una delle case segnalate.",
  };
}
