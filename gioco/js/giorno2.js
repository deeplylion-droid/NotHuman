// Il secondo giorno (bozza del 27 ottobre, da approvare: docs/proposta_secondo_giorno.md). Le stesse case e le stesse
// stanze del primo giorno, con le persone cambiate dalle scelte di ieri: chi e' andato al lazzaretto non c'e' piu',
// chi e' rimasto in casa e' peggiorato, la madre nella notte e' diventata un mostro (dal 27 ottobre, sera, nessuno
// muore: all'ultimo stadio il male trasforma), chi ha dormito dal medico ha la febbre (il
// medico e' il portatore, e non lo sa). giorno2(ieri) da' le tabelle del giorno, che in gioco.js prendono il posto
// di quelle di dati.js. ieri = { via: [chi e' stato portato al lazzaretto], ospite: chi ha dormito dal medico,
// contagiate: [case dove e' passato il contagio] }.
// Le scene le compone tools/prepara_gioco.py (GIORNO2), una per ogni combinazione di chi e' in casa:
// img/g2/<luogo>-<strati>.jpg, con le mappe delle persone, le sagome e il calore come le scene del primo giorno.
// Due case nuove (28 ottobre, dalle proposte di docs/proposte_famiglie.md), vicine a quelle di ieri: la casa 2, la
// moglie che lavora di notte nel recinto della ditta e il marito malato di cava (la traccia della ditta e delle
// cavie: la cartella sotto il materasso), e la casa 10, la vedova che non si ammala chiusa in camera dalla suocera
// (la traccia dell'immune). Se stanotte il contagio e' passato di li', si ammalano i vecchi: il marito e la suocera.
// Le loro immagini stanno nei pacchi di prepara_gioco.py (img/pacchi).
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
  // le case nuove: stanotte il contagio passa dalla casa 3 alla 2 e dalla 5 alla 10, se non le hai chiuse
  const contagiate = new Set(ieri.contagiate || []);
  const maritoMalato = contagiate.has("casa2"), suoceraMalata = contagiate.has("casa10");

  const tutte = {
    padre: { nome: "il padre", voce: "PADRE", casa: "casa3", luogo: "cucina2", stato: "grave", profilo: false, calore: 0.95, volto: "g2/padre" },
    figlia: { nome: "la figlia", voce: "FIGLIA", casa: "casa3", luogo: "cucina2", stato: figliaMalata ? "malato" : "sano", profilo: false,
      calore: figliaMalata ? 0.78 : 0.52, volto: figliaMalata ? "g2/figlia" : "figlia" },
    // la madre non e' morta: e' cambiata. Fredda all'infrarosso, come un morto, eppure si muove
    madre: { nome: "la madre", voce: "MADRE", casa: "casa3", luogo: "camera2", stato: "mostro", profilo: false, calore: 0.12, volto: "g2/madre" },
    uomo: { nome: "l'uomo in tuta", voce: "UOMO", casa: "casa5", luogo: "soggiorno2", stato: "grave", profilo: false, calore: 0.95, volto: "g2/uomo" },
    giovane: { nome: "la ragazza", voce: "RAGAZZA", casa: "casa5", luogo: "soggiorno2", stato: giovaneMalata ? "malato" : "sano", profilo: false,
      calore: giovaneMalata ? 0.78 : 0.4, volto: giovaneMalata ? "g2/giovane_febbre" : "g2/giovane" },
    // la ditta oggi vuole i vecchi malati: la nonna e' il profilo, che sia malata o no
    nonna: { nome: "la nonna", voce: "NONNA", casa: "casa5", luogo: "soggiorno2", stato: nonnaMalata ? "malato" : "sano", profilo: true,
      calore: nonnaMalata ? 0.75 : 0.5, volto: "g2/nonna" },
    // casa 2: la moglie lavora di notte nel recinto, con la mascherina, e non si ammala; il marito ha i polmoni della
    // cava (le labbra viola del protocollo, che non sono la peste) e oltre i settanta e' il profilo. "ospite": perche'
    // non puo' dormire dal medico
    moglie: { nome: "la moglie", voce: "MOGLIE", casa: "casa2", luogo: "monolocale", stato: "sano", profilo: false, calore: 0.5, volto: "g2/moglie" },
    marito: { nome: "il marito", voce: "MARITO", casa: "casa2", luogo: "monolocale", stato: maritoMalato ? "malato" : "sano", profilo: true,
      calore: maritoMalato ? 0.85 : 0.5, volto: "g2/marito", ospite: "non si regge in piedi" },
    // casa 10: la suocera in cucina, la nuora chiusa a chiave in camera. La nuora non si ammala mai
    suocera: { nome: "la suocera", voce: "SUOCERA", casa: "casa10", luogo: "cucina10", stato: suoceraMalata ? "malato" : "sano", profilo: true,
      calore: suoceraMalata ? 0.8 : 0.5, volto: "g2/suocera", ospite: "non lascia la casa" },
    nuora: { nome: "la nuora", voce: "NUORA", casa: "casa10", luogo: "camera10", stato: "sano", profilo: false, calore: 0.5, volto: "g2/nuora" },
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
      // in camera, oggi, solo il fruscio del nastro: la madre non respira, ma graffia il ferro della testiera
      ambiente: null,
      img: img("camera2", [madre && "madre"]),
      persone: madre ? ["madre"] : [],
      frasi: { madre: [0.62, 0.1, "destra"] },
      // rannicchiata sulla testiera, sotto la finestra, a quattro zampe: le mani sul ferro
      parti: {
        madre: {
          occhi: [[0.503, 0.128, 0.032, 0.016]], bocca: [[0.503, 0.176, 0.022, 0.016]],
          collo: [[0.503, 0.222, 0.026, 0.016]], ascelle: [[0.437, 0.25, 0.018, 0.03], [0.572, 0.24, 0.018, 0.03]],
          mani: [[0.418, 0.415, 0.03, 0.035], [0.6, 0.408, 0.03, 0.035]],
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
      nascosti: [{ x: 0.83, y: 0.94, rx: 0.09, ry: 0.045, prova: "calore_cantina" }],
    },
    // casa 2: una stanza sola, con la stufa spenta, il letto di lei e il divano dove lui respira col nebulizzatore.
    // Col contagio cambia solo il calore (il marito con la febbre)
    monolocale: {
      casa: "casa2", notte: false, ambiente: "nebulizzatore",
      img: "g2/monolocale", calore: maritoMalato ? "g2/monolocale_calore_febbre" : null,
      persone: ["moglie", "marito"],
      frasi: { moglie: [0.345, 0.14, "sinistra"], marito: [0.97, 0.07, "sinistra"] },
      parti: {
        // la moglie ha le braccia incrociate; il marito tiene una mano sul bracciolo e l'altra sul ginocchio (le dita le
        // copre il nastro delle frasi: la zona di quella mano e' il polso, appena sopra)
        moglie: {
          occhi: [[0.44, 0.152, 0.032, 0.016]], bocca: [[0.44, 0.214, 0.018, 0.012]], collo: [[0.44, 0.268, 0.02, 0.014]],
          ascelle: [[0.36, 0.285, 0.012, 0.025], [0.522, 0.29, 0.012, 0.025]],
          mani: [[0.397, 0.33, 0.02, 0.018], [0.489, 0.35, 0.018, 0.018]],
        },
        marito: {
          occhi: [[0.818, 0.409, 0.03, 0.016]], bocca: [[0.82, 0.5, 0.022, 0.014]], collo: [[0.815, 0.545, 0.02, 0.018]],
          ascelle: [[0.755, 0.55, 0.015, 0.03], [0.885, 0.55, 0.015, 0.03]],
          mani: [[0.668, 0.745, 0.022, 0.035], [0.742, 0.808, 0.03, 0.016]],
        },
      },
      zone: [
        { id: "stufa", nome: "la stufa", box: [0.0, 0.55, 0.33, 1.0], tipo: "indizio", segni: [[0.215, 0.83, 0.03, 0.07]],
          dice: [[null, "La stufa è fredda. Dentro, al posto della legna, un *camice* bianco appallottolato.", { k: "zona:stufa" }],
            [null, "Sul taschino, ricamato in blu, il triangolo della Panacea."]], poi: { prova: "camice" } },
        // sotto il materasso, la cartella della ditta: si solleva dal menu, come una porta
        { id: "letto", nome: "il letto", box: [0.55, 0.42, 0.74, 0.75], tipo: "porta", segni: [[0.64, 0.6, 0.08, 0.08]] },
        { id: "nebulizzatore", nome: "il nebulizzatore", box: [0.86, 0.7, 1.0, 0.98], tipo: "indizio", segni: [[0.935, 0.83, 0.055, 0.1]],
          dice: [[null, "Il nebulizzatore è nuovo, ancora con l'etichetta: «PANACEA · Programma Respiro»."],
            [null, "«Riservato ai *dipendenti* e ai loro familiari.»", { k: "zona:nebulizzatore" }]], poi: { prova: "nebulizzatore" } },
      ],
      nascosti: [],
    },
    // casa 10: la cucina della suocera; la porta della camera e' chiusa a chiave, la chiave nella toppa
    cucina10: {
      casa: "casa10", notte: false, ambiente: "cucina",
      img: "g2/cucina10", calore: suoceraMalata ? "g2/cucina10_calore_febbre" : null,
      persone: ["suocera"],
      frasi: { suocera: [0.57, 0.14, "sinistra"] },
      parti: {
        // si regge alla sedia con la destra
        suocera: {
          occhi: [[0.61, 0.185, 0.028, 0.016]], bocca: [[0.61, 0.257, 0.015, 0.011]], collo: [[0.612, 0.32, 0.02, 0.02]],
          ascelle: [[0.556, 0.355, 0.012, 0.025], [0.662, 0.355, 0.012, 0.025]],
          mani: [[0.538, 0.62, 0.022, 0.04], [0.672, 0.64, 0.016, 0.045]],
        },
      },
      zone: [
        { id: "cappotto", nome: "il cappotto rosso", box: [0.16, 0.14, 0.29, 0.67], tipo: "indizio", segni: [[0.225, 0.42, 0.055, 0.22]],
          dice: [[null, "Un *cappotto* rosso da ragazza, appeso dietro la porta. Non è roba da vecchia.", { k: "zona:cappotto" }],
            [null, "In tasca, un biglietto della corriera per la città. Mai timbrato."]], poi: { prova: "cappotto" } },
        { id: "foto", nome: "la foto", box: [0.37, 0.4, 0.47, 0.58], tipo: "indizio", segni: [[0.42, 0.49, 0.045, 0.08]],
          dice: [[null, "La foto delle nozze col nastro nero: Paolo e una ragazza dai capelli neri."],
            [null, "Davanti, un lumino rosso acceso. La cera è colata sul mobile."]] },
        { id: "porta10", nome: "la porta della camera", box: [0.665, 0.12, 0.82, 0.92], tipo: "porta", segni: [[0.745, 0.52, 0.075, 0.4]] },
      ],
      // la nuora seduta sul letto, dietro la porta: all'infrarosso del nastro, un calore attraverso il legno
      nascosti: [{ x: 0.735, y: 0.55, rx: 0.06, ry: 0.2, prova: "calore_camera10" }],
    },
    camera10: {
      casa: "casa10", notte: true, ritorno: "cucina10", conosci: ["nuora"],
      // la camera e' muta: solo il fruscio del nastro
      ambiente: null,
      img: "g2/camera10",
      persone: ["nuora"],
      frasi: { nuora: [0.44, 0.16, "sinistra"] },
      parti: {
        nuora: {
          occhi: [[0.491, 0.242, 0.038, 0.02]], bocca: [[0.497, 0.321, 0.017, 0.011]],
          collo: [[0.497, 0.375, 0.02, 0.03], [0.5, 0.59, 0.014, 0.02]],
          ascelle: [[0.436, 0.44, 0.012, 0.03], [0.558, 0.44, 0.012, 0.03]],
          mani: [[0.482, 0.775, 0.024, 0.04], [0.523, 0.775, 0.024, 0.04]],
        },
      },
      zone: [
        { id: "cuscini", nome: "il letto", box: [0.08, 0.44, 0.42, 0.76], tipo: "indizio",
          segni: [[0.19, 0.64, 0.1, 0.07], [0.33, 0.53, 0.08, 0.06]],
          dice: [[null, "Il letto matrimoniale: due *cuscini*, tutti e due schiacciati, come se ci dormissero ancora in due.", { k: "zona:cuscini" }],
            [null, "Su quello di sinistra, lunghi capelli neri."]], poi: { prova: "due_cuscini" } },
        { id: "comodino", nome: "il comodino", box: [0.6, 0.38, 0.72, 0.6], tipo: "indizio", segni: [[0.668, 0.5, 0.022, 0.045]],
          dice: [[null, "Sul comodino, la foto di un ragazzo dagli occhi chiari: Paolo."],
            [null, "Sotto la foto, una *ricevuta* della Panacea: «Restituiti alla famiglia: fede nuziale (1), orologio (1).»", { k: "zona:comodino" }],
            [null, "«Salma: trattenuta per gli accertamenti.»"]], poi: { prova: "ricevuta" } },
        { id: "candeggina", nome: "la candeggina", box: [0.69, 0.6, 0.8, 0.8], tipo: "indizio",
          segni: [[0.72, 0.7, 0.03, 0.08], [0.77, 0.72, 0.022, 0.075]],
          dice: [[null, "Un secchio e una tanica di *candeggina*, quasi vuota. L'odore passa anche il becco.", { k: "zona:candeggina" }]],
          poi: { prova: "candeggina" } },
      ],
      nascosti: [],
    },
  };

  // ---------- l'arrivo ----------
  const ARRIVO = {
    cucina2: padre ? [[null, "[il padre è appoggiato al mobile. Respira a fatica]"], ["PADRE", "Ancora voi."],
      ["PADRE", "Fate quello che dovete. Non ho più la forza di mandarvi via."]]
      : figlia ? [["FIGLIA", "Mio padre ce l'avete voi."], ["FIGLIA", "Cosa volete ancora?"]]
        : [[null, "[la porta di casa è socchiusa. Nessuno risponde]"], [null, "In cucina non c'è nessuno."]],
    camera2: madre ? [[null, "[il letto è vuoto. Il lenzuolo strappato, la coperta per terra]"],
      [null, "[sopra la testiera, sotto la finestra, qualcosa graffia il ferro]"], [null, "È la madre. Non è morta: è cambiata."]]
      : [[null, "[il letto è rifatto, il lenzuolo tirato]"], [null, "La madre è nel recinto della ditta, da ieri."]],
    soggiorno2: uomo ? righe([null, "[l'uomo tossisce nel fazzoletto. Sul bianco, macchie rosse]"], ["UOMO", "Ancora il becco."],
      nonna && ["NONNA", "Oggi tossiamo tutti, dottore. Si accomodi."])
      : nonna ? [["NONNA", "Mio figlio l'avete preso voi."], ["NONNA", "Adesso chi volete? Me?"]]
        : giovane ? [["RAGAZZA", "Sono rimasta sola."], ["RAGAZZA", "Cosa volete?"]]
          : [[null, "[la porta è aperta. In casa non c'è nessuno]"]],
    monolocale: [[null, "[una stanza sola: la cucina, il letto, la stufa. Odore di disinfettante]"],
      ["MOGLIE", "Mio marito non si alza. Fate in fretta: stanotte lavoro."],
      ["MARITO", maritoMalato ? "[tossisce nel tubo del nebulizzatore. Suda]" : "[respira dal tubo del nebulizzatore]"]],
    cucina10: [[null, "[la vecchia apre appena la porta. Poi si fa da parte]"],
      ["SUOCERA", "Entrate, se dovete. In questa casa il malvento è già passato."],
      suoceraMalata ? ["SUOCERA", "[si asciuga il sudore sotto il fazzoletto]"] : ["SUOCERA", "[resta davanti alla porta della camera]"]],
    camera10: [[null, "[la camera è al buio. Sul letto, una ragazza vestita di nero]"], ["NUORA", "Chi è?"],
      ["NUORA", "[vede la maschera]"], ["NUORA", "Siete della ditta? Siete venuti a prendermi?"]],
  };

  // la cartella della ditta, sotto il materasso della moglie della casa 2: le schede di chi e' stato portato via, con un
  // numero di prova. Prima il nonno della casa 3 e il marito della nuora della casa 10, poi chi hai mandato tu ieri
  const RIGHE1 = Object.fromEntries(Object.values(D1.ANAGRAFE).flatMap((A) => A.righe.map((r) => [r.persona, r])));
  const esito = (id) => {
    const donna = !!RIGHE1[id].donna;
    const s = D1.PERSONE[id].stato;
    return s === "grave" ? (donna ? "cambiata" : "cambiato") : s === "sano" ? (donna ? "sana, idonea" : "sano, idoneo") : "in osservazione";
  };
  const provati = [...via].filter((id) => RIGHE1[id] && D1.PERSONE[id]).map((id, i) => ({ id, n: i + 3, nome: RIGHE1[id].nome, esito: esito(id) }));
  const schede = ["ROSSI PIETRO, PROVA 1, «cambiato»", "SERRA PAOLO, PROVA 2, «cambiato»",
    ...provati.map((p) => `${p.nome}, PROVA ${p.n}, «${p.esito}»`)];

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
    // casa 2: il letto della moglie (il marito dorme sul divano); sotto il materasso, la cartella
    letto: {
      scelte: [
        { testo: "solleva il materasso", minuti: 10,
          dice: righe(["TU", "Fatemi vedere sotto il materasso."], ["MOGLIE", "Quello è il mio letto!", { volto: "arrabbiato" }],
            [null, "Sotto il materasso, una *cartella* grigia col triangolo della Panacea.", { k: "zona:letto" }],
            [null, `Dentro, schede con una foto e un numero. ${schede.slice(0, 2).join(". ")}.`],
            provati.length && [null, `E quelli che hai mandato tu, ieri: ${schede.slice(2).join(". ")}.`],
            [null, "In fondo, un foglio: «MEDICO 6 · MALVENTO». E uno vecchio, ingiallito: «MEDICO 6 · PIETRASCURA · MARZO 1998»."],
            ["MOGLIE", "[non dice niente. Ti guarda]", { volto: "arrabbiato" }]),
          poi: { prova: "cartella", volti: { moglie: "arrabbiato" } } },
      ],
    },
    // casa 10: la camera della nuora, chiusa a chiave dalla suocera
    porta10: {
      entra: { testo: "entra nella camera", vai: "camera10" },
      scelte: [
        { testo: "chiedi di aprire", minuti: 5,
          dice: [["TU", "Aprite questa porta."], ["SUOCERA", "È la camera di Paolo. Non ci entra più nessuno.", { volto: "arrabbiato" }],
            ["SUOCERA", "Lasciategli almeno quella.", { volto: "arrabbiato" }]] },
        { testo: "ascolta alla porta", minuti: 5,
          dice: [[null, "[dietro la porta: un *respiro*, piano. Poi la molla di un letto]", { k: "zona:porta10" }]], poi: { prova: "respiro_camera" } },
        { testo: "gira la chiave", minuti: 10,
          dice: [["TU", "La chiave è nella toppa. Giro io."], ["SUOCERA", "No! Non toccate!", { volto: "arrabbiato" }],
            ["SUOCERA", "[ti si aggrappa al braccio. Pesa come un uccello]", { volto: "arrabbiato" }]],
          poi: { fiducia: -15, forzata: true, sblocca: "porta10", conosci: "nuora", vai: "camera10", volti: { suocera: "arrabbiato" } } },
        { testo: "offri 50 € alla suocera", minuti: 5, soldi: 50,
          dice: [["TU", "Cinquanta euro, e non ho visto niente."],
            ["SUOCERA", "Soldi della ditta? Tenetevi i vostri soldi.", { volto: "arrabbiato" }]] },
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
    occhi: { reperto: "occhi bianchi, senza pupille: non ti riconosce", foto: "g2/mostro_occhi",
      dice: [[null, "[gli occhi bianchi ti seguono, senza battere le palpebre]"]] },
    bocca: { reperto: "la bocca troppo larga, le gengive nere, la bava nera", segno: "tosse", foto: "g2/mostro_bocca",
      dice: [[null, "[ringhia. Un filo di bava nera cola sulla testiera]"]] },
    collo: { reperto: "la pelle grigia, le vene nere: i bubboni si sono aperti", segno: "bubbone", dice: [[null, "[non si lascia avvicinare]"]] },
    ascelle: { reperto: "non si lascia toccare", rifiuta: [[null, "[ti soffia contro e si schiaccia contro la finestra]"]] },
    mani: { reperto: "le dita lunghe e nere, le unghie come artigli", segno: "dita", foto: "g2/mostro_mani",
      dice: [[null, "Le unghie nere graffiano il ferro della testiera."]] },
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
  // casa 2: la moglie porta addosso il recinto (i segni della mascherina, il timbro d'ingresso sulla mano); il marito
  // ha le labbra viola e le unghie blu della cava, che per il protocollo sono il pallore
  ESAMI.moglie = {
    occhi: { reperto: "occhi arrossati ai bordi, niente febbre: non dorme di notte", foto: "g2/moglie_occhi",
      dice: [["MOGLIE", "Faccio le notti. Ve l'ho detto."]] },
    bocca: { reperto: "niente", foto: "g2/moglie_bocca", dice: [["MOGLIE", "[stringe le labbra]"]] },
    collo: { reperto: "due righe rosse dietro l'orecchio e sulla guancia: l'elastico di una mascherina, portata per ore",
      foto: "g2/moglie_collo", dice: [["MOGLIE", "[si tira su il collo del golf]", { volto: "nervoso" }]] },
    ascelle: { reperto: "si è rifiutata", rifiuta: [["MOGLIE", "Non ci penso nemmeno.", { volto: "arrabbiato" }]] },
    mani: { reperto: "screpolate dal disinfettante; sul dorso, un timbro blu: un triangolo con un numero", foto: "g2/moglie_mani",
      dice: [["MOGLIE", "[nasconde la mano destra nella manica]", { volto: "nervoso" }]] },
  };
  ESAMI.marito = {
    occhi: maritoMalato
      ? { reperto: "occhi lucidi e arrossati, sudore: febbre", segno: "febbre", foto: "g2/marito_occhi_febbre", dice: [["MARITO", "Brucio. Da stanotte."]] }
      : { reperto: "occhi stanchi, niente febbre", foto: "g2/marito_occhi", dice: [["MARITO", "Ci vedo ancora. Purtroppo."]] },
    bocca: { reperto: "labbra viola, fiato corto, catarro grigio", segno: "pallore", foto: "g2/marito_bocca",
      dice: [["MARITO", "[respira a fatica, sotto i baffi]"]] },
    collo: maritoMalato
      ? { reperto: "un bubbone sotto la mascella, appena cominciato", segno: "bubbone", foto: "g2/marito_collo_febbre", dice: [["MARITO", "Ieri non c'era."]] }
      : { reperto: "i tendini tirati dal respiro, niente gonfiori", foto: "g2/marito_collo", dice: [["MARITO", "[deglutisce]"]] },
    ascelle: { reperto: "si è rifiutato", rifiuta: [["MARITO", "Lasciatemi la coperta. Ho freddo da quarant'anni."]] },
    mani: { reperto: "dita a spatola, unghie blu: i polmoni malati da anni, non da giorni", segno: "pallore", foto: "g2/marito_mani",
      dice: [["MARITO", "Mani da cava."]] },
  };
  // casa 10: la suocera ha la terra del cimitero sotto le unghie; la nuora non ha niente, solo le mani bruciate
  // dalla candeggina
  ESAMI.suocera = {
    occhi: suoceraMalata
      ? { reperto: "occhi lucidi, sudore sotto il fazzoletto: febbre", segno: "febbre", foto: "g2/suocera_occhi_febbre",
        dice: [["SUOCERA", "Ho pianto. Si piange, quando si seppellisce un figlio."]] }
      : { reperto: "palpebre gonfie di pianto, occhi asciutti: niente febbre", foto: "g2/suocera_occhi",
        dice: [["SUOCERA", "Ho pianto. Si piange, quando si seppellisce un figlio."]] },
    bocca: { reperto: "denti vecchi ma tutti suoi, niente", foto: "g2/suocera_bocca", dice: [["SUOCERA", "[serra le labbra]"]] },
    collo: suoceraMalata
      ? { reperto: "un bubbone sotto la mascella, appena cominciato", segno: "bubbone", foto: "g2/suocera_collo_febbre",
        dice: [["SUOCERA", "Il malvento. Adesso ce l'ho anch'io."]] }
      : { reperto: "un nastro nero al collo, niente gonfiori", foto: "g2/suocera_collo", dice: [["SUOCERA", "Il lutto. Lo porto per Paolo."]] },
    ascelle: { reperto: "si è rifiutata", rifiuta: [["SUOCERA", "Ho ottant'anni, dottore. Abbiate rispetto.", { volto: "arrabbiato" }]] },
    mani: { reperto: "terra nera sotto le unghie, una crosta di cera rossa su un dito", foto: "g2/suocera_mani",
      dice: [["SUOCERA", "L'*orto*.", { d: "orto", k: "parte:suocera.mani" }]] },
  };
  ESAMI.nuora = {
    occhi: { reperto: "occhi grandi e scuri, bordi arrossati di pianto; niente febbre", foto: "g2/nuora_occhi", dice: [["NUORA", "Non dormo. Da una settimana."]] },
    bocca: { reperto: "labbra morse, niente", foto: "g2/nuora_bocca", dice: [["NUORA", "[si morde il labbro]"]] },
    collo: { reperto: "al collo, su una catenina, la fede di un uomo; niente gonfiori", foto: "g2/nuora_collo",
      dice: [["NUORA", "La *fede* di Paolo. Me l'hanno data loro, in una busta.", { d: "fede_busta", k: "parte:nuora.collo" }]] },
    ascelle: { reperto: "pelle sana, niente bubboni", foto: "g2/nuora_ascelle", dice: [["NUORA", "[alza il braccio senza dire niente]"]] },
    mani: { reperto: "screpolate e spellate dalla candeggina: lavate cento volte al giorno", foto: "g2/nuora_mani",
      dice: [["NUORA", "[le richiude subito]"]] },
  };

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
  // casa 2
  DOMANDE.moglie = [
    { id: "lavoro", breve: "che lavoro fai?", testo: "Che lavoro fai?",
      dice: [["MOGLIE", "Faccio le notti alla *mensa*. Lavo i piatti.", { d: "mensa", k: "zona:stufa" }],
        ["MOGLIE", "Torno all'alba. Dormo di giorno, quando lui mi lascia."]] },
    { id: "marito", breve: "tuo marito?", testo: "Cos'ha tuo marito?",
      dice: [["MOGLIE", "L'*asma*. Da sempre.", { d: "asma", k: "parte:marito.mani" }], ["MOGLIE", "Non è la vostra peste, se è quello che cercate."]] },
    { id: "coprifuoco", breve: "il coprifuoco?", testo: "Il coprifuoco è alle otto. Come fai a uscire di notte?", se: { detta: "mensa" },
      dice: [["MOGLIE", "Ho un permesso.", { volto: "nervoso" }], ["MOGLIE", "[non dice chi gliel'ha dato]", { volto: "nervoso" }]] },
    { id: "recinto", breve: "cosa c'è nel recinto?", testo: "Cosa c'è, dentro il recinto?", se: { detta: "recinto" },
      dice: [["MOGLIE", "Brande. Flebo. Un odore che non va via nemmeno con la candeggina."],
        ["MOGLIE", "Quelli che *cambiano* li portano nel prefabbricato in fondo. Lì non entra nessuno di noi.", { d: "prefabbricato" }],
        ["MOGLIE", "Di notte li sento grattare contro le pareti."]] },
    { id: "portati", breve: "e i portati via?", testo: "Quelli che porto al lazzaretto, come stanno?", se: { detta: "recinto" },
      dice: [["MOGLIE", "Non è un ospedale, dottore."], ["MOGLIE", "Non ne ho mai visto uscire uno."]] },
  ];
  DOMANDE.marito = [
    { id: "come", breve: "come sta?", testo: "Come sta?",
      dice: [...(maritoMalato ? [["MARITO", "Da stanotte brucio."], ["MARITO", "[tossisce]"]] : [["MARITO", "Come uno che respira col tubo."]]),
        ["MARITO", "Lei dice che è l'*asma*. Lei dice tante cose.", { k: "persona:moglie" }]] },
    { id: "moglie", breve: "sua moglie?", testo: "Dove va sua moglie, di notte?",
      dice: [["MARITO", "Alla mensa, dice."],
        ["MARITO", "Torna all'alba, puzza di candeggina e nasconde la roba sotto il *materasso*, come una gazza.", { k: "zona:letto" }]] },
    { id: "lavoro", breve: "che lavoro faceva?", testo: "Che lavoro faceva?",
      dice: [["MARITO", "Il cavatore. Quarant'anni alla cava di pietra, sopra il paese."], ["MARITO", "Poi l'hanno chiusa. Adesso la collina è della ditta."]] },
  ];
  // casa 10
  DOMANDE.suocera = [
    { id: "chi", breve: "chi vive qui?", testo: "Chi vive in questa casa?",
      dice: [["SUOCERA", "Io *sola*, adesso.", { d: "sola", k: "zona:porta10" }],
        ["SUOCERA", "Mio figlio Paolo l'abbiamo *seppellito* martedì. Bara chiusa.", { d: "sepolto" }]] },
    { id: "nuora", breve: "e la nuora?", testo: "Nello stato di famiglia c'è anche sua nuora, Chiara.",
      dice: [["SUOCERA", "*Partita*. Dai suoi, giù in città, il giorno dopo il funerale.", { d: "nuora_partita", k: "zona:cappotto" }],
        ["SUOCERA", "Qui non ci voleva più stare."]] },
    { id: "porta", breve: "la porta?", testo: "Cosa c'è dietro quella porta?",
      dice: [["SUOCERA", "La camera di Paolo. Non ci entra più nessuno.", { volto: "arrabbiato" }], ["SUOCERA", "Lasciategli almeno quella."]] },
    { id: "figlio", breve: "suo figlio?", testo: "Com'è morto suo figlio?",
      dice: [["SUOCERA", "La febbre, i bubboni, le dita nere. In quattro giorni."],
        ["SUOCERA", "Poi sono venuti quelli della ditta e se lo sono portato via. Non ce l'hanno più fatto vedere."]] },
    { id: "perche", breve: "perché la nasconde?", testo: "Perché la tiene chiusa a chiave?", se: { detta: "non_si_ammala" },
      dice: [["SUOCERA", "Al bar dicono che la ditta paga per chi non si ammala. Tanto. Che li cercano casa per casa."],
        ["SUOCERA", "Mi hanno già preso un figlio. Lei no.", { volto: "piange" }]] },
  ];
  DOMANDE.nuora = [
    { id: "come", breve: "come stai?", testo: "Come stai?", dice: [["NUORA", "Sto bene. Sto sempre bene."], ["NUORA", "È questo che non va."]] },
    { id: "marito", breve: "tuo marito?", testo: "Gli sei stata vicina, quando era malato?",
      dice: [["NUORA", "No. Non l'ho mai *toccato*. Dormivo sulla sedia, in cucina.", { d: "mai_toccato", k: "zona:cuscini" }],
        ["NUORA", "Me l'aveva detto lei."]] },
    { id: "chiusa", breve: "perché sei chiusa qui?", testo: "Perché sei chiusa qui dentro?",
      dice: [["NUORA", "Dice che è per il mio bene."], ["NUORA", "Mi porta da mangiare due volte al giorno. Di notte la sento pregare dietro la porta."]] },
    { id: "ditta", breve: "la ditta?", testo: "Cosa ti hanno detto, quelli della ditta?", se: { detta: "niente_nuora" },
      dice: [["NUORA", "Il giorno che l'hanno portato via mi hanno fatto un prelievo. Uno solo."],
        ["NUORA", "Il giorno dopo sono tornati a cercarmi. Lei ha detto che ero partita."]] },
  ];

  const DICHIARAZIONI = {
    dorme_padre: { chi: "padre", testo: "«Mia moglie dorme.»" },
    figlia_bene: { chi: "padre", testo: "«Lei sta bene.»" },
    tornata_scottava: { chi: "padre", testo: "«È tornata da voi che scottava.»" },
    dorme_figlia: { chi: "figlia", testo: "«La mamma dorme.»" },
    sto_bene: { chi: "figlia", testo: "«Sto bene.»" },
    svegliata_scottavo: { chi: "figlia", testo: "«Dopo la notte da voi, scottavo.»" },
    le_tenevo: { chi: "figlia", testo: "«Le tenevo la mano.»" },
    bruciate: { chi: figlia ? "figlia" : "padre", testo: "«Voi quelli come lei li portate nel recinto.»" },
    lingua: { chi: "uomo", testo: "«Mi sono morso la lingua.»" },
    partito: { chi: "uomo", testo: "«Mio figlio è partito stanotte.»" },
    chi_sfama: { chi: "uomo", testo: "«Chi li sfama, se mi portate via?»" },
    patate: { chi: chiApre === "UOMO" ? "uomo" : chiApre === "RAGAZZA" ? "giovane" : "nonna", testo: "«In cantina ci sono le patate.»" },
    bene_ragazza: { chi: "giovane", testo: "«Sto bene.»" },
    // l'esame della bocca della ragazza e' quello di ieri: dice ancora che ha freddo
    freddo: { chi: "giovane", testo: "«Ho freddo.»" },
    partito_ragazza: { chi: "giovane", testo: "«È partito stanotte.»" },
    febbre_mattina: { chi: "giovane", testo: "«Dopo la notte da voi, la febbre.»" },
    in_cantina: { chi: giovane ? "giovane" : uomo ? "uomo" : "nonna", testo: "«È giù in cantina.»" },
    tosse_vecchia: { chi: "nonna", testo: "«Tossisco dal '44.»" },
    sotto: { chi: "nonna", testo: "«Davide sta sotto, al riparo.»" },
    vecchi_prove: { chi: "nonna", testo: "«La ditta vuole i vecchi, per le prove.»" },
    nonna_scottava: { chi: "nonna", testo: "«Dopo la notte da lei, scottavo.»" },
    // casa 2
    mensa: { chi: "moglie", testo: "«Faccio le notti alla mensa.»" },
    asma: { chi: "moglie", testo: "«Mio marito ha l'asma.»" },
    recinto: { chi: "moglie", testo: "«Lavoro di notte nel recinto.»" },
    prefabbricato: { chi: "moglie", testo: "«Quelli che cambiano li portano nel prefabbricato.»" },
    medico6: { chi: "moglie", testo: "«Medico 6 siete voi.»" },
    // casa 10
    sola: { chi: "suocera", testo: "«Io sola, adesso.»" },
    sepolto: { chi: "suocera", testo: "«Paolo l'abbiamo seppellito martedì.»" },
    nuora_partita: { chi: "suocera", testo: "«Chiara è partita, dai suoi.»" },
    non_si_ammala: { chi: "suocera", testo: "«Ha dormito con lui e non si è ammalata.»" },
    bara_leggera: { chi: "suocera", testo: "«Nella bara c'erano sassi.»" },
    orto: { chi: "suocera", testo: "«È la terra dell'orto.»" },
    mai_toccato: { chi: "nuora", testo: "«Non l'ho mai toccato.»" },
    niente_nuora: { chi: "nuora", testo: "«Non mi è venuto niente.»" },
    fede_busta: { chi: "nuora", testo: "«La fede me l'hanno data loro, in una busta.»" },
  };

  const PROVE = {
    silenzio: { casa: "casa3", testo: "Dal fondo del corridoio, oggi, nessun respiro: solo unghie sul ferro.", breve: "Unghie sul ferro, di là.",
      zona: ["cucina2", "corridoio"] },
    madre_morta: { casa: "casa3", testo: "La madre stanotte è diventata un mostro, in casa. Non l'hanno detto.", breve: "La madre è cambiata.",
      parte: ["madre", "occhi"] },
    febbre_figlia: { casa: "casa3", testo: "La figlia ha la febbre: occhi lucidi, guance rosse.", breve: "La figlia ha la febbre.", parte: ["figlia", "occhi"] },
    sangue_uomo: { casa: "casa5", testo: "L'uomo tossisce sangue: viene dai polmoni, non dalla lingua.", breve: "Tosse col sangue.", parte: ["uomo", "bocca"] },
    ripostiglio_vuoto: { casa: "casa5", testo: "Il ripostiglio è vuoto: una brandina sfatta, un cuscino macchiato, una botola col lucchetto nuovo.",
      breve: "Il ripostiglio vuoto, la botola.", zona: ["soggiorno2", "porta"] },
    tosse_sotto: { casa: "casa5", testo: "Da sotto il pavimento, un colpo di tosse.", breve: "Una tosse sotto il pavimento.", zona: ["soggiorno2", "porta"] },
    febbre_giovane: { casa: "casa5", testo: "La ragazza ha la febbre, da stamattina.", breve: "La ragazza ha la febbre.", parte: ["giovane", "occhi"] },
    // il termosifone e' quello di ieri, ancora spento
    termosifone: { ...copia(D1.PROVE.termosifone), zona: ["soggiorno2", "termosifone"] },
    febbre_nonna: { casa: "casa5", testo: "La nonna ha la febbre, da stamattina.", breve: "La nonna ha la febbre.", parte: ["nonna", "occhi"] },
    calore_cantina: { casa: "casa5", testo: "Dal nastro: un calore debole sotto il pavimento, vicino alla porta. In cantina c'è qualcuno.",
      breve: "Calore sotto il pavimento.", zona: ["soggiorno2", "porta"], ir: true },
    // casa 2
    camice: { casa: "casa2", testo: "Nella stufa spenta, al posto della legna, un camice bianco col triangolo della Panacea.",
      breve: "Il camice della Panacea.", zona: ["monolocale", "stufa"] },
    nebulizzatore: { casa: "casa2", testo: "Il nebulizzatore del marito è nuovo, della Panacea: «riservato ai dipendenti e ai loro familiari».",
      breve: "Il nebulizzatore della ditta.", zona: ["monolocale", "nebulizzatore"] },
    // la cartella vale anche nelle case dei portati via: "anche" sono le case dove si puo' usare
    cartella: { casa: "casa2", anche: ["casa3", "casa5", "casa10"],
      testo: `Sotto il materasso della moglie, una cartella della Panacea: le schede dei portati via, con un numero. ${schede.join("; ")}. In fondo: «MEDICO 6 · MALVENTO», e un foglio del 1998: «MEDICO 6 · PIETRASCURA».`,
      breve: "La cartella della ditta.", zona: ["monolocale", "letto"] },
    silicosi: { casa: "casa2", testo: "Il marito ha le labbra viola e le unghie blu da vent'anni: è la polvere della cava, non la peste.",
      breve: "Labbra viola: la cava.", parte: ["marito", "mani"] },
    ...(maritoMalato ? { febbre_marito: { casa: "casa2", testo: "Il marito ha la febbre da stanotte: non è l'asma.", breve: "Il marito ha la febbre.",
      parte: ["marito", "occhi"] } } : {}),
    // casa 10
    cappotto: { casa: "casa10", testo: "In cucina, un cappotto rosso da ragazza; in tasca, un biglietto della corriera mai timbrato.",
      breve: "Il cappotto rosso.", zona: ["cucina10", "cappotto"] },
    respiro_camera: { casa: "casa10", testo: "Dietro la porta della camera, chiusa a chiave, qualcuno respira.", breve: "Un respiro dietro la porta.",
      zona: ["cucina10", "porta10"] },
    calore_camera10: { casa: "casa10", testo: "Dal nastro: calore dietro la porta della camera. C'è qualcuno seduto.", breve: "Calore dietro la porta.",
      zona: ["cucina10", "porta10"], ir: true },
    ricevuta: { casa: "casa10", testo: "Sul comodino, una ricevuta della Panacea: «Restituiti alla famiglia: fede nuziale, orologio. Salma: trattenuta per gli accertamenti».",
      breve: "«Salma trattenuta».", zona: ["camera10", "comodino"] },
    due_cuscini: { casa: "casa10", testo: "Nel letto matrimoniale due cuscini schiacciati: ci dormivano in due, fino all'ultimo.", breve: "Due cuscini.",
      zona: ["camera10", "cuscini"] },
    candeggina: { casa: "casa10", testo: "Una tanica di candeggina quasi vuota: qualcuno ha lavato un malato, per giorni.", breve: "La candeggina.",
      zona: ["camera10", "candeggina"] },
    immune: { casa: "casa10", testo: "La nuora ha dormito col marito malato fino alla fine, e non si è ammalata: né febbre né segni.",
      breve: "Non si ammala.", da: "nuora" },
  };

  // ---------- le contestazioni ----------
  const CONTESTAZIONI = [
    // casa 3: la madre non dorme, e' cambiata
    ...(madre ? [{ id: "morta",
      coppie: [[["d:dorme_padre", "d:dorme_figlia"], ["persona:madre", "parte:madre.occhi", "parte:madre.bocca", "parte:madre.collo",
        "parte:madre.ascelle", "parte:madre.mani", "p:silenzio"]],
        [["p:silenzio"], ["persona:padre", "persona:figlia"]]],
      dice: righe(["TU", "Non dorme. Guardatela."],
        figlia && ["FIGLIA", "[piange]", { volto: "piange" }],
        figlia && ["FIGLIA", "Stanotte si è alzata. Le tenevo la *mano*.", { d: "le_tenevo", k: "persona:madre", volto: "piange" }],
        padre && ["PADRE", "È ancora lei. Ogni tanto mi guarda come prima."],
        [figlia ? "FIGLIA" : "PADRE", "Voi quelli come lei li portate nel *recinto*.", { d: "bruciate", ...(figlia ? { volto: "piange" } : {}) }]),
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
    // casa 2: la moglie lavora per la ditta; il marito non ha l'asma
    { id: "mensa",
      coppie: [[["d:mensa"], ["p:camice", "p:nebulizzatore", "zona:stufa", "zona:nebulizzatore", "parte:moglie.mani", "parte:moglie.collo"]],
        [["p:camice", "p:nebulizzatore"], ["persona:moglie"]]],
      dice: [["TU", "Non lavori alla mensa. Lavori per la Panacea."], ["MOGLIE", "[stringe le braccia]", { volto: "nervoso" }],
        ["MOGLIE", "Va bene. Lavoro per loro. Di notte, nel *recinto*.", { d: "recinto", k: "persona:moglie", volto: "nervoso" }],
        ["MOGLIE", "Lavo i pavimenti, cambio le brande. Con quello che pagano, compro le medicine a lui.", { volto: "nervoso" }],
        ["MOGLIE", "In paese non lo deve sapere nessuno. Mi ammazzano.", { volto: "nervoso" }]],
      poi: { volti: { moglie: "nervoso" } } },
    { id: "asma", coppie: [[["d:asma"], ["parte:marito.mani"]]], se: { esame: "marito_mani" },
      dice: [["TU", "Dita a spatola, unghie blu. Non è asma: è da anni che ti manca l'aria."], ["MARITO", "Asma… La chiama così, lei."],
        ["MARITO", "È la cava. Quarant'anni a tagliare la pietra: ho i polmoni pieni di polvere."],
        ["MARITO", "Le labbra viola ce le ho da vent'anni, dottore. La vostra peste non c'entra."]],
      poi: { prova: "silicosi" } },
    ...(maritoMalato ? [{ id: "febbre_marito", coppie: [[["d:asma"], ["parte:marito.occhi"]]], se: { esame: "marito_occhi" },
      dice: [["TU", "L'asma non fa venire la febbre."], ["MOGLIE", "[guarda il marito]", { volto: "nervoso" }],
        ["MOGLIE", "Da stanotte. Scotta da stanotte.", { volto: "nervoso" }],
        ["MOGLIE", "Non portatelo via. Io lo so cosa c'è, là dentro.", { volto: "nervoso" }]],
      poi: { prova: "febbre_marito" } }] : []),
    { id: "cartella_moglie", coppie: [[["p:cartella"], ["persona:moglie"]]],
      dice: [["TU", "Questa l'hai presa nel recinto."], ["MOGLIE", "Sì. Dall'ufficio, una notte che non c'era nessuno.", { volto: "arrabbiato" }],
        ["MOGLIE", "Volevo che qualcuno sapesse cosa fanno, là dentro.", { volto: "arrabbiato" }],
        ["MOGLIE", "Guardate l'ultimo foglio. «Medico 6, Malvento.»", { volto: "arrabbiato" }],
        ["MOGLIE", "Medico sei siete *voi*, dottore.", { d: "medico6", k: "persona:moglie", volto: "arrabbiato" }]],
      poi: { volti: { moglie: "arrabbiato" } } },
    // casa 10: la nuora non e' partita; Paolo non e' nella bara; la nuora l'ha curato fino alla fine
    { id: "nuora_di_la",
      coppie: [[["d:sola", "d:nuora_partita"], ["p:cappotto", "p:respiro_camera", "zona:cappotto"]],
        [["p:cappotto", "p:respiro_camera"], ["persona:suocera"]]],
      dice: [["TU", "In questa casa non sei sola."], ["SUOCERA", "[piange]", { volto: "piange" }],
        ["SUOCERA", "È di là. L'ho chiusa io, a chiave.", { volto: "piange" }],
        ["SUOCERA", "Ha dormito con Paolo fino all'ultima notte, e non si è *ammalata*. Niente.", { d: "non_si_ammala", k: "zona:porta10", volto: "piange" }],
        ["SUOCERA", "Se la ditta lo viene a sapere, se la prende. Come si sono presi lui.", { volto: "piange" }]],
      poi: { sblocca: "porta10", conosci: "nuora", volti: { suocera: "piange" } } },
    { id: "bara", coppie: [[["d:sepolto"], ["p:cartella", "p:ricevuta"]], [["p:cartella", "p:ricevuta"], ["persona:suocera"]]],
      dice: [["TU", "Paolo non è in quella bara. La ditta se l'è tenuto."], ["SUOCERA", "[si porta le mani alla bocca]", { volto: "piange" }],
        ["SUOCERA", "Lo sapevo. La bara era *leggera*. Troppo leggera, per il mio Paolo.", { d: "bara_leggera", k: "parte:suocera.mani", volto: "piange" }],
        ["SUOCERA", "Domenica notte sono andata al cimitero e l'ho aperta. Con le mani.", { volto: "piange" }],
        ["SUOCERA", "Dentro c'erano sassi.", { volto: "piange" }]],
      poi: { volti: { suocera: "piange" } } },
    { id: "mai_toccato",
      coppie: [[["d:mai_toccato"], ["p:due_cuscini", "p:candeggina", "zona:cuscini", "zona:candeggina", "parte:nuora.mani"]],
        [["p:due_cuscini", "p:candeggina"], ["persona:nuora"]]],
      dice: [["TU", "L'hai curato tu. Fino all'ultimo."], ["NUORA", "[piange]", { volto: "piange" }],
        ["NUORA", "Ho dormito con lui fino all'ultima notte. Lo lavavo io, lo cambiavo io.", { volto: "piange" }],
        ["NUORA", "E non mi è venuto *niente*. Né la febbre, né i segni. Niente.", { d: "niente_nuora", k: "persona:nuora", volto: "piange" }],
        ["NUORA", "Perché io no, dottore? Perché lui sì e io no?", { volto: "piange" }]],
      poi: { prova: "immune", volti: { nuora: "piange" } } },
    { id: "fede", coppie: [[["d:fede_busta"], ["p:cartella", "p:ricevuta"]]],
      dice: [["TU", "A te hanno dato la fede. E Paolo?"], ["NUORA", "Mi hanno detto che era morto. Che era meglio non vederlo."],
        ["NUORA", "Allora dov'è, adesso?", { volto: "piange" }]],
      poi: { volti: { nuora: "piange" } } },
  ];

  const REAZIONI = {
    padre: { _: [["PADRE", "[non ha la forza di rispondere]"]] },
    figlia: { _: [["FIGLIA", "[scuote la testa]"]] },
    madre: { _: [[null, "[non risponde. Non risponderà più]"]] },
    uomo: { leggenda: [["UOMO", "Favole da vecchi."]], vecchi_prove: [["UOMO", "Mia madre non la tocca nessuno."]], _: [["UOMO", "Non so di cosa parlate."]] },
    giovane: { _: [["RAGAZZA", "[silenzio]"]] },
    nonna: { partito: [["NONNA", "Partito? Mio figlio non ha mai saputo mentire."]], _: [["NONNA", "Eh? Parli più forte, con quel becco."]] },
    moglie: { asma: [["MOGLIE", "Gliel'ha detto il medico della mutua. Asma."]], _: [["MOGLIE", "E allora?"]] },
    marito: { mensa: [["MARITO", "La mensa… Sì. Così dice lei."]], recinto: [["MARITO", "Lo so. Lo so da un pezzo."]],
      cartella: [["MARITO", "Gliel'avevo detto, di non portare niente a casa."]], _: [["MARITO", "[tossisce]"]] },
    suocera: { non_si_ammala: [["SUOCERA", "Ve l'ho detto. Non si ammala. Non so se è una grazia o un castigo."]],
      orto: [["SUOCERA", "Ho l'orto dietro casa. Le patate non si cavano da sole."]], _: [["SUOCERA", "Non capisco cosa volete da me."]] },
    nuora: { cappotto: [["NUORA", "È il mio. Me l'ha regalato lui, per le nozze."]], nuora_partita: [["NUORA", "Partita? È lei che non mi lascia uscire."]],
      _: [["NUORA", "[non ti guarda]"]] },
  };
  // la cartella della casa 2 messa davanti a chi ha un nome dentro, o un parente
  REAZIONI.padre.cartella = [["PADRE", "Rossi Pietro. È mio padre."], ["PADRE", "«Cambiato»… Cosa gli fanno, là dentro?"]];
  REAZIONI.figlia.cartella = [["FIGLIA", "Il nonno…"], ["FIGLIA", "[legge il foglio due volte, senza dire niente]"]];
  REAZIONI.uomo.cartella = [["UOMO", "Non so leggere quella roba. Portatela via."]];
  REAZIONI.giovane.cartella = [["RAGAZZA", "Ci sono anche i nomi di quelli di ieri?"]];
  REAZIONI.nonna.cartella = [["NONNA", "Prova uno, prova due… Come i conigli di mio padre."]];
  REAZIONI.nuora.cartella = [["NUORA", "Serra Paolo, prova due."], ["NUORA", "[si stringe la fede in mano]"]];

  const ANNOTA = {
    // casa 3
    "d:dorme_padre": { madre: "«dorme» (il marito)" },
    "d:dorme_figlia": { madre: "«dorme» (la figlia)" },
    "p:silenzio": { madre: "dalla camera, nessun respiro: unghie sul ferro" },
    "p:madre_morta": { madre: { testo: "cambiata stanotte, in casa: non è più lei", barra: ["d:dorme_padre", "d:dorme_figlia"], morto: true } },
    "d:le_tenevo": { madre: { testo: "si è alzata stanotte, cambiata: la figlia le teneva la mano", morto: true },
      figlia: "è rimasta con la madre cambiata" },
    "d:bruciate": { madre: "la tenevano in casa: «voi li portate nel recinto»" },
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
    "d:freddo": { giovane: "«ho freddo»" },
    "p:termosifone": { giovane: "pallida per il freddo e la fame, non per la peste?" },
    "d:febbre_mattina": { giovane: "dopo la notte dal medico, la febbre" },
    "p:febbre_giovane": { giovane: { testo: "ha la febbre", barra: "d:bene_ragazza" } },
    // casa 2
    "d:mensa": { moglie: "«faccio le notti alla mensa»" },
    "p:camice": { moglie: { testo: "nella stufa spenta, il suo camice della Panacea", barra: "d:mensa" } },
    "p:nebulizzatore": { moglie: "il nebulizzatore è della Panacea: «per i dipendenti e i familiari»",
      marito: "il nebulizzatore gliel'ha dato la Panacea" },
    "d:recinto": { moglie: { testo: "lavora di notte nel recinto della ditta: lava i pavimenti, cambia le brande", barra: "d:mensa" } },
    "d:prefabbricato": { moglie: "«quelli che cambiano li portano nel prefabbricato in fondo»" },
    "d:medico6": { moglie: "«medico 6 siete voi»" },
    "d:asma": { marito: "«ha l'asma» (la moglie)" },
    "p:silicosi": { marito: { testo: "labbra viola e unghie blu da vent'anni: la polvere della cava, non la peste", barra: "d:asma" } },
    ...(maritoMalato ? { "p:febbre_marito": { marito: { testo: "ha la febbre, da stanotte", barra: "d:asma" } } } : {}),
    // la cartella: chi c'e' scritto dentro (anche nelle altre case)
    "p:cartella": {
      moglie: "ha preso nel recinto la cartella della ditta",
      nonno: { testo: "nella cartella della ditta: «PROVA 1 · cambiato»", morto: true },
      paolo: { testo: "nella cartella della ditta: «PROVA 2 · cambiato». Non è morto", barra: "anagrafe", morto: true },
      ...Object.fromEntries(provati.map((p) => [p.id, `nella cartella della ditta: «PROVA ${p.n} · ${p.esito}»`])),
    },
    // casa 10
    "d:sola": { suocera: "«io sola, adesso»", nuora: "«io sola» (la suocera)" },
    "d:nuora_partita": { nuora: "«partita dai suoi, il giorno dopo il funerale» (la suocera)" },
    "p:cappotto": { nuora: { testo: "il suo cappotto rosso è in cucina, col biglietto della corriera mai timbrato", barra: "d:nuora_partita" } },
    "p:respiro_camera": { nuora: { testo: "qualcuno respira dietro la porta chiusa a chiave", barra: "d:nuora_partita" } },
    "p:calore_camera10": { nuora: { testo: "il nastro all'infrarosso: qualcuno seduto dietro la porta della camera", barra: "d:nuora_partita" } },
    "d:non_si_ammala": { nuora: { testo: "chiusa in camera dalla suocera: ha dormito col marito malato e non si è ammalata", barra: ["d:nuora_partita", "d:sola"] },
      suocera: "nasconde la nuora: «se la ditta lo scopre, se la prende»" },
    "d:orto": { suocera: "«la terra sotto le unghie è dell'orto»" },
    "d:sepolto": { paolo: "«sepolto martedì, bara chiusa» (la madre)" },
    "p:ricevuta": { paolo: { testo: "la ricevuta della Panacea: «salma trattenuta per gli accertamenti»", barra: "d:sepolto" } },
    "d:bara_leggera": { paolo: { testo: "nella bara c'erano sassi: la madre l'ha aperta, di notte", barra: ["anagrafe", "d:sepolto"], morto: true },
      suocera: { testo: "ha aperto la bara del figlio, di notte, con le mani", barra: "d:orto" } },
    "d:fede_busta": { paolo: "la fede l'ha restituita la ditta, in una busta (la moglie)" },
    "d:mai_toccato": { nuora: "«non l'ho mai toccato»" },
    "p:due_cuscini": { nuora: "due cuscini schiacciati nel letto: dormivano in due" },
    "p:candeggina": { nuora: "la candeggina, e le mani bruciate: l'ha lavato lei, per giorni" },
    "p:immune": { nuora: { testo: "ha curato il marito fino alla fine e non si è ammalata", barra: "d:mai_toccato" } },
    "d:niente_nuora": { nuora: "«non mi è venuto niente»" },
  };

  // lo stato di famiglia: le stesse righe del comune; chi ieri e' andato al lazzaretto ha il timbro della ditta
  const ANAGRAFE = copia(D1.ANAGRAFE);
  for (const A of Object.values(ANAGRAFE)) for (const r of A.righe) if (via.has(r.persona)) r.ditta = "AL LAZZARETTO DAL 26.10";
  // le case nuove. Per il comune Paolo Serra e' morto: la ditta ha restituito una bara chiusa
  ANAGRAFE.casa2 = { via: "Via della Chiesa 8", righe: [
    { persona: "marito", nome: "GALLI ERNESTO", ruolo: "intestatario", nato: 1953, mestiere: "cavatore in pensione" },
    { persona: "moglie", nome: "MARINI LUCIA", ruolo: "moglie", nato: 1971, mestiere: "casalinga", donna: true },
  ] };
  ANAGRAFE.casa10 = { via: "Vicolo Stretto 7", righe: [
    { persona: "paolo", nome: "SERRA PAOLO", ruolo: "intestatario", nato: 1992, mestiere: "boscaiolo", anagrafe: "deceduto il 18.10.2026" },
    { persona: "nuora", nome: "LORENZI CHIARA", ruolo: "moglie", nato: 1994, donna: true },
    { persona: "suocera", nome: "FONTANA ROSA ved. SERRA", ruolo: "madre dell'intestatario", nato: 1946, donna: true },
  ] };
  // Paolo non e' morto: e' cambiato, ed e' la PROVA 2 della ditta
  const ALTRI = { ...copia(D1.ALTRI), paolo: { stato: "mostro" }, ...Object.fromEntries([...via].map((id) => [id, { stato: "lazzaretto" }])) };

  const CACCIATA = {
    casa3: righe(padre ? ["PADRE", "Andate via. Lasciateci in pace, con lei."] : figlia ? ["FIGLIA", "Andate via!"] : null,
      [null, "Ti chiudono la porta alle spalle."]),
    casa5: righe(uomo ? ["UOMO", "Fuori. Adesso.", { volto: "arrabbiato" }] : nonna ? ["NONNA", "Fuori, becco."] : giovane ? ["RAGAZZA", "Andate via!"] : null,
      [null, "Ti sbattono la porta alle spalle."]),
    casa2: [["MOGLIE", "Fuori. Ho dormito tre ore.", { volto: "arrabbiato" }],
      [null, "Ti chiude la porta alle spalle. Dentro, il nebulizzatore continua a borbottare."]],
    casa10: [["SUOCERA", "Fuori da casa mia. Che il malvento vi porti via.", { volto: "arrabbiato" }], [null, "Senti girare la chiave due volte."]],
  };

  // la mappa: le case 3 e 5 di nuovo da visitare; dove stanotte e' passato il contagio, il segno (per ora non si visita)
  const CASE = Object.fromEntries(Object.entries(D1.CASE).map(([id, k]) => [id, { ...k }]));
  CASE.casa3.luogo = "cucina2";
  CASE.casa3.segnalata = madre ? "Un vicino: «Stanotte la ragazza gridava. Poi più niente.»"
    : "Un vicino: «Il padre tossisce tutta la notte. Si sente dalla strada.»";
  CASE.casa5.luogo = "soggiorno2";
  CASE.casa5.segnalata = "Un altro biglietto: «Stanotte hanno portato giù qualcosa in cantina.»";
  // le case nuove, sulla lista perche' vicine a quelle di ieri
  CASE.casa2.luogo = "monolocale";
  CASE.casa2.segnalata = maritoMalato ? "Un vicino: «Da Galli stanotte tossivano forte. E la moglie è uscita lo stesso, col coprifuoco.»"
    : "Un vicino: «La moglie di Galli esce ogni notte, col coprifuoco, e torna all'alba. Dove va?»";
  CASE.casa10.luogo = "cucina10";
  CASE.casa10.segnalata = suoceraMalata ? "Biglietto anonimo: «Stanotte la vecchia Serra si lamentava. E in casa sua parlano in due.»"
    : "Biglietto anonimo: «Dalla vedova Serra, dopo il funerale, la luce della camera resta accesa tutta la notte.»";
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
  // le case nuove: la moglie esce alle undici per il recinto; la nuora e' l'unica che non si ammala
  OSPITE.moglie = {
    arriva: "La moglie di Galli è venuta con te. «Tanto alle undici attacco», ha detto. Aspetta nella stanzetta, vestita.",
    controllo: [["MOGLIE", "Chiudete pure. Non dormo, tanto."], [null, "È seduta sulla brandina, vestita e con le scarpe. Guarda l'orologio."]],
    nastro: ["[la stanza al buio. Il medico dorme]", "[la moglie di Galli è sulla porta della stanzetta, vestita. Ti guarda dormire]",
      "[alla scrivania legge il tuo fax, alla luce del televisore. Poi lo rimette a posto]"],
    mattina: "La moglie di Galli è uscita alle undici, col coprifuoco, verso il recinto. Sul nastro, prima di andare, legge il tuo fax e lo rimette a posto. Uscendo ti ha chiesto un'aspirina: aveva la fronte calda.",
  };
  OSPITE.nuora = {
    arriva: "La nuora è venuta con te, di nascosto dalla suocera. Ha portato la sua candeggina. Dorme nella stanzetta.",
    controllo: [["NUORA", "Lasciate uno spiraglio. Al buio sento ancora il suo respiro."], [null, "È seduta sulla brandina e si rigira la fede di Paolo tra le dita."]],
    nastro: ["[la stanza al buio. Il medico dorme]", "[la nuora è sulla porta della stanzetta, con la candeggina e uno straccio]",
      "[in ginocchio, lava il pavimento attorno al tuo letto]"],
    mattina: "All'alba la nuora è tornata a casa, prima che la suocera si svegliasse. Sul nastro lava con la candeggina il pavimento attorno al tuo letto, per un'ora. Le hai sentito la fronte: non scotta. È l'unica.",
  };

  return {
    PERSONE, VOCI, NASCOSTI: { casa5: [{ nome: "il ragazzo in cantina", stato: "grave" }] }, LUOGHI, ARRIVO, PORTE, ESAMI, DOMANDE,
    DICHIARAZIONI, PROVE, CONTESTAZIONI, REAZIONI, ANNOTA, ANAGRAFE, ALTRI, CACCIATA, CASE, OSPITE,
    SOLDI: { ...D1.SOLDI, paziente: 450, profilo: 300 },
    // il protocollo cambia: entra la tosse col sangue, il pallore resta (la ditta continua a mentire), e il profilo
    // richiesto sono i vecchi malati
    FAX: {
      giorno: 2, case: [3, 5, 2, 10],
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
      [null, "Le case 3 e 5 sono di nuovo sulla lista. E due case nuove, vicine a quelle di ieri: la 2 e la 10."]],
  };
}

// la verita' del secondo giorno, per la fine della bozza
export function verita2(ieri) {
  const via = new Set(ieri.via || []);
  const c = (id) => !via.has(id);
  const figliaMalata = c("figlia") && (c("padre") || c("madre") || ieri.ospite === "figlia");
  const t = [];
  t.push(`Casa 3: ${c("madre") ? "la madre nella notte è diventata un mostro, in casa: era grave da giorni" : "la madre era nel recinto della ditta"}. `
    + `${c("padre") ? "Il padre era grave: bubbone aperto, dita che diventano nere" : "Il padre era nel recinto"}. `
    + (c("figlia") ? (figliaMalata ? `La figlia si è ammalata: ${ieri.ospite === "figlia" ? "aveva dormito da te" : "viveva coi malati"}.` : "La figlia era ancora sana.") : "La figlia era nel recinto."));
  t.push(`Casa 5: ${c("uomo") ? "l'uomo era grave, tossiva sangue" : "l'uomo era nel recinto"}. `
    + (c("giovane") ? (ieri.ospite === "giovane" ? "La ragazza aveva la febbre: aveva dormito da te. " : "La ragazza era sana, pallida di freddo e di fame. ") : "")
    + (c("nonna") ? (ieri.ospite === "nonna" ? "La nonna aveva la febbre: aveva dormito da te. " : "La nonna era sana: la sua tosse è vecchiaia. ") : "")
    + "Il ragazzo era giù in cantina, sotto la botola: grave.");
  const contagiate = new Set(ieri.contagiate || []);
  t.push("Casa 2: la moglie lavorava di notte nel recinto della Panacea, e sotto il materasso teneva la cartella delle prove. "
    + `Il marito aveva i polmoni della cava: le labbra viola non erano la peste${contagiate.has("casa2") ? ", ma stanotte il contagio era arrivato anche da lui: la febbre era vera" : ""}.`);
  t.push("Casa 10: Paolo Serra non era morto. Era cambiato, e la ditta lo teneva come PROVA 2: nella bara c'erano sassi. "
    + "La nuora, chiusa in camera dalla suocera, non si ammala: ha dormito col marito malato fino alla fine. È lei che la ditta cerca."
    + (contagiate.has("casa10") ? " La suocera si era ammalata stanotte." : ""));
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
  } else if (presi.includes("nuora")) {
    titolo = "Portata via la vedova di Vicolo Stretto";
    sommario = "Non aveva febbre né segni. La Panacea: «Un caso di grande interesse». La suocera l'ha seguita a piedi fino al recinto.";
  } else if (presi.includes("moglie")) {
    titolo = "L'inserviente del recinto ci entra da paziente";
    sommario = "La moglie di Galli lavorava di notte per la ditta. Il marito è rimasto solo, col nebulizzatore.";
  } else if (oggi.morti.madre) {
    titolo = "Qualcosa sul tetto di Via della Chiesa";
    sommario = "Stanotte i vicini hanno sentito graffiare le tegole. La moglie del meccanico non si vede da giorni.";
  } else if (oggi.forzate?.casa10) {
    titolo = "Il medico gira la chiave";
    sommario = "In Vicolo Stretto ha aperto la camera di una vedova, chiusa a chiave. «Come i ladri», dice la suocera.";
  } else if (n.ospite) {
    const nome = { giovane: "la ragazza del vicolo", nonna: "la nonna del vicolo", moglie: "la moglie di Galli", nuora: "la vedova Serra" }[n.ospite.chi]
      || "la figlia del meccanico";
    titolo = `Il medico ospita ${nome}`;
    sommario = n.ospite.chi === "nuora" ? "«È l'unica che il giorno dopo non scotta», dice qualcuno al bar. In paese la guardano come una santa."
      : "«Chi va a dormire da lui, il giorno dopo scotta», dice qualcuno al bar.";
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
