// Il terzo giorno (28 ottobre, sera: docs/proposta_terzo_giorno.md). «Continua a inserire famiglie, cerca di variare
// nell'aspetto delle persone. Tutti quelli che possono diventare mostri devono avere una trasformazione diversa.»
// Le case di ieri cambiate dalle scelte dei primi due giorni, e due case nuove: la 7, il sacrestano con la moglie
// cambiata nascosta nella cripta (il segreto del paese), e la 4, le gemelle sarte che rammendano le lenzuola del
// recinto (la ditta e le cavie). Ogni giorno chi e' malato peggiora di uno: sano, malato, grave, mostro; e ognuno
// cambia a modo suo: il padre si radica al suo posto a tavola, l'uomo in tuta si allunga fino al soffitto, Davide si
// chiude in un bozzolo in cantina, la moglie del sacrestano diventa una santa di cera. La madre, cambiata ieri, e'
// uscita dalla finestra. Quello che il medico scrive sullo stato di famiglia la ditta lo legge: se ieri ha scritto che
// la nuora non si ammala, stanotte il furgone se l'e' presa; se ha scritto della cartella, alla moglie della casa 2
// hanno tolto il permesso. giorno3(ieri) da' le tabelle del giorno, che in gioco.js prendono il posto di quelle di
// dati.js. ieri = { via, ospite, contagiate (il primo giorno), via2, ospite2, contagiate2 (il secondo), scritto: le
// note a penna di ieri, "persona:id" }.
// Le scene le compone tools/prepara_gioco.py (GIORNO3 a strati, LUOGHI3 una per luogo): img/g3/<luogo>-<strati>.jpg,
// coi luoghi di ieri, cosi' restano le espressioni; il calore lo fa il gioco dalle sagome ("vivo"). Le immagini
// stanno nei pacchi g3_* (img/pacchi).
import * as D1 from "./dati.js";
import { giorno2, IMMUNE } from "./giorno2.js";
import { T } from "./lingua.js";

const copia = (o) => JSON.parse(JSON.stringify(o));
// le battute di chi c'e': si scartano quelle con la voce di chi oggi non c'e' (null)
const righe = (...r) => r.filter(Boolean);
// la malattia va avanti di uno al giorno
const PEGGIO = { malato: "grave", grave: "mostro", mostro: "mostro" };
// il calore all'infrarosso, secondo lo stato
const CALDO = { sano: 0.5, malato: 0.8, grave: 0.92 };

export function giorno3(ieri) {
  const G2 = giorno2(ieri);
  const via2 = new Set(ieri.via2 || []);
  const contagiate2 = new Set(ieri.contagiate2 || []);
  const scritto = new Set(ieri.scritto || []);
  const ospite2 = ieri.ospite2 || null;
  // lo stato di ieri (undefined: ieri non c'era, gia' nel recinto)
  const ieri2 = (id) => G2.PERSONE[id]?.stato;
  // in casa oggi: c'era ieri e ieri non l'hai portato al lazzaretto
  const c = (id) => !!ieri2(id) && !via2.has(id);
  // lo stato di oggi: chi era malato peggiora; chi era sano si ammala se...
  const oggi = (id, siAmmala) => (ieri2(id) === "sano" ? (siAmmala ? "malato" : "sano") : PEGGIO[ieri2(id)]);

  // casa 3: il padre, grave ieri, stanotte e' cambiato; la madre, cambiata ieri, e' uscita dalla finestra
  const padre = c("padre"), figlia = c("figlia");
  const madreUscita = !!ieri2("madre");
  const figlia3 = figlia ? oggi("figlia", ospite2 === "figlia") : null;
  // casa 5: l'uomo e' cambiato; Davide in cantina e' cambiato da stanotte, sempre
  const uomo = c("uomo"), giovane = c("giovane"), nonna = c("nonna");
  const giovane3 = giovane ? oggi("giovane", ospite2 === "giovane") : null;
  const nonna3 = nonna ? oggi("nonna", ospite2 === "nonna") : null;
  // casa 2: il marito peggiora o si ammala (se il contagio e' passato di qui stanotte); la moglie si ammala se ha
  // dormito dal medico. Se ieri hai scritto della cartella, la ditta lo sa
  const moglie = c("moglie"), marito = c("marito");
  const moglie3 = moglie ? oggi("moglie", ospite2 === "moglie") : null;
  const marito3 = marito ? oggi("marito", contagiate2.has("casa2")) : null;
  const dittaSa = scritto.has("moglie:p:cartella");
  // casa 10: la nuora non si ammala mai; se ieri hai scritto che non si ammala, stanotte il furgone se l'e' presa
  // (se non dormiva da te)
  const suocera = c("suocera");
  const suocera3 = suocera ? oggi("suocera", contagiate2.has("casa10")) : null;
  const presa = c("nuora") && ospite2 !== "nuora" && IMMUNE.some((id) => scritto.has(`nuora:${id}`));
  const nuora = c("nuora") && !presa;
  // casa 7 e casa 4: col contagio di stanotte si ammalano anche il sacrestano e la gemella sana
  const sacrestano3 = contagiate2.has("casa7") ? "malato" : "sano";
  const ada3 = contagiate2.has("casa4") ? "malato" : "sano";
  const grave = (s) => s === "grave", malato = (s) => s === "malato";

  const tutte = {
    // casa 3. "muto": cosa fa chi e' cambiato, al posto delle domande
    padre: { nome: T("il padre"), voce: "PADRE", casa: "casa3", luogo: "cucina2", stato: "mostro", profilo: false, calore: 0.12,
      volto: "g3/padre", muto: T("scricchiola, non risponde più") },
    figlia: { nome: T("la figlia"), voce: "FIGLIA", casa: "casa3", luogo: "cucina2", stato: figlia3 || "sano", profilo: figlia3 === "sano",
      calore: CALDO[figlia3 || "sano"], volto: figlia3 === "sano" ? "figlia" : "g2/figlia" },
    // casa 5
    uomo: { nome: T("l'uomo in tuta"), voce: "UOMO", casa: "casa5", luogo: "soggiorno2", stato: "mostro", profilo: false, calore: 0.95,
      volto: "g3/uomo", muto: T("ti guarda dall'alto, non risponde") },
    giovane: { nome: T("la ragazza"), voce: "RAGAZZA", casa: "casa5", luogo: "soggiorno2", stato: giovane3 || "sano", profilo: giovane3 === "sano",
      calore: CALDO[giovane3 || "sano"] - (giovane3 === "sano" ? 0.1 : 0), volto: giovane3 === "sano" ? "g2/giovane" : "g2/giovane_febbre" },
    nonna: { nome: T("la nonna"), voce: "NONNA", casa: "casa5", luogo: "soggiorno2", stato: nonna3 || "sano", profilo: nonna3 === "sano",
      calore: CALDO[nonna3 || "sano"], volto: "g2/nonna" },
    // Davide, chiuso nel bozzolo, in cantina: tiepido come un nido
    ragazzo: { nome: T("il ragazzo"), voce: "RAGAZZO", casa: "casa5", luogo: "cantina5", stato: "mostro", profilo: false, calore: 0.55,
      volto: "g3/ragazzo", muto: T("dorme, non risponde") },
    // casa 2
    moglie: { nome: T("la moglie"), voce: "MOGLIE", casa: "casa2", luogo: "monolocale", stato: moglie3 || "sano", profilo: moglie3 === "sano",
      calore: CALDO[moglie3 || "sano"], volto: "g2/moglie" },
    marito: { nome: T("il marito"), voce: "MARITO", casa: "casa2", luogo: "monolocale", stato: marito3 || "sano", profilo: false,
      calore: CALDO[marito3 || "sano"], volto: "g2/marito", ospite: T("non si regge in piedi") },
    // casa 10
    suocera: { nome: T("la suocera"), voce: "SUOCERA", casa: "casa10", luogo: "cucina10", stato: suocera3 || "sano", profilo: false,
      calore: CALDO[suocera3 || "sano"], volto: "g2/suocera", ospite: T("non lascia la casa") },
    nuora: { nome: T("la nuora"), voce: "NUORA", casa: "casa10", luogo: "camera10", stato: "sano", profilo: true, calore: 0.5, volto: "g2/nuora" },
    // casa 7: il sacrestano, il figlio campanaro (muto, ha la febbre: un morso), la moglie nella cripta
    sacrestano: { nome: T("il sacrestano"), voce: "SACRESTANO", casa: "casa7", luogo: "sacrestia7", stato: sacrestano3, profilo: sacrestano3 === "sano",
      calore: CALDO[sacrestano3], volto: "g3/sacrestano", ospite: T("all'alba deve suonare") },
    giona: { nome: T("Giona"), voce: "GIONA", casa: "casa7", luogo: "sacrestia7", stato: "malato", profilo: false, calore: 0.82,
      volto: "g3/giona", ospite: T("dorme sotto le campane") },
    assunta: { nome: T("la moglie del sacrestano"), voce: "ASSUNTA", casa: "casa7", luogo: "cripta7", stato: "mostro", profilo: false,
      calore: 0.1, volto: "g3/assunta", muto: T("canta a bocca chiusa, non risponde") },
    // casa 4: le gemelle. Lia ha la febbre (sotto la cipria) e un bubbone sotto l'ascella
    ada: { nome: T("Ada"), voce: "ADA", casa: "casa4", luogo: "sartoria4", stato: ada3, profilo: ada3 === "sano", calore: CALDO[ada3],
      volto: "g3/ada", ospite: T("non lascia la sorella") },
    lia: { nome: T("Lia"), voce: "LIA", casa: "casa4", luogo: "sartoria4", stato: "malato", profilo: false, calore: 0.86,
      volto: "g3/lia", ospite: T("non lascia la sorella") },
  };
  const presenti = { padre, figlia, uomo, giovane, nonna, ragazzo: true, moglie, marito, suocera, nuora,
    sacrestano: true, giona: true, assunta: true, ada: true, lia: true };
  const PERSONE = Object.fromEntries(Object.entries(tutte).filter(([id]) => presenti[id]));
  const VOCI = Object.fromEntries(Object.entries(tutte).map(([id, p]) => [p.voce, id]));

  // le scene: quale combinazione di strati e' in casa (i nomi dei file di prepara_gioco.py)
  const img = (luogo, strati) => `g3/${luogo}-${strati.filter(Boolean).join("-") || "vuota"}`;
  const L1 = D1.LUOGHI, L2 = G2.LUOGHI;
  const LUOGHI = {
    // casa 3: il padre radicato al suo posto a tavola, col caffe' davanti; la figlia sulla porta
    cucina2: {
      casa: "casa3", notte: false, ambiente: "cucina", calore: "vivo",
      img: img("cucina2", [padre && "padre", figlia && (figlia3 === "sano" ? "figlia_sana" : "figlia")]),
      persone: ["padre", "figlia"].filter((id) => presenti[id]),
      morti: padre ? ["padre"] : [],
      frasi: { padre: [0.62, 0.17, "sinistra"], figlia: [0.525, 0.2, "destra"] },
      parti: {
        padre: {
          occhi: [[0.753, 0.365, 0.022, 0.012]], bocca: [[0.756, 0.405, 0.012, 0.01]], collo: [[0.752, 0.442, 0.018, 0.015]],
          ascelle: [[0.685, 0.516, 0.012, 0.03], [0.823, 0.505, 0.012, 0.03]],
          mani: [[0.717, 0.653, 0.03, 0.04], [0.839, 0.63, 0.03, 0.04]],
        },
        figlia: copia(L1.cucina.parti.figlia),
      },
      zone: [
        ...(padre ? [{ id: "tazza", nome: T("la tazza"), box: [0.745, 0.58, 0.8, 0.65], tipo: "indizio", segni: [[0.771, 0.612, 0.025, 0.025]],
          dice: [[null, T("Il *caffè* davanti al padre è freddo. Ha fatto la pelle."), { k: "zona:tazza" }],
            [null, T("Accanto, il cucchiaino. Pulito.")]], poi: { prova: "caffe_freddo" } }] : []),
        copia(L1.cucina.zone[1]),
      ],
      nascosti: [],
    },
    // la camera: se la madre ieri c'era, stanotte e' uscita dalla finestra, rotta verso fuori
    camera2: {
      casa: "casa3", notte: true, ritorno: "cucina2", ambiente: null, calore: "vivo",
      img: madreUscita ? "g3/camera2" : "g2/camera2-vuota", persone: [], frasi: {}, parti: {},
      macchie: [[0.305, 0.42, 0.018, 0.9]],
      zone: [
        ...(madreUscita ? [{ id: "finestra", nome: T("la finestra"), box: [0.33, 0.0, 0.64, 0.45], tipo: "indizio",
          segni: [[0.485, 0.17, 0.15, 0.16]],
          dice: [[null, T("La finestra è aperta, i vetri rotti verso *fuori*: qualcuno è uscito, non entrato."), { k: "zona:finestra" }],
            [null, T("Sul davanzale e sul muro sotto, graffi lunghi e neri. Fuori, sulle tegole, gli stessi.")]], poi: { prova: "finestra_rotta" } }] : []),
        copia(L2.camera2.zone[0]),
      ],
      nascosti: [],
    },
    // casa 5: l'uomo allungato nell'angolo, chino sotto il soffitto; nessuno lo guarda
    soggiorno2: {
      casa: "casa5", notte: false, ambiente: "soggiorno", calore: "vivo",
      img: img("soggiorno2", [uomo && "uomo", giovane && (giovane3 === "sano" ? "giovane" : "giovane_febbre"), nonna && "nonna"]),
      persone: ["uomo", "giovane", "nonna"].filter((id) => presenti[id]),
      morti: uomo ? ["uomo"] : [],
      frasi: { uomo: [0.76, 0.06, "destra"], giovane: [0.548, 0.035, "sinistra"], nonna: [0.335, 0.17, "sinistra"] },
      parti: {
        uomo: {
          occhi: [[0.582, 0.07, 0.025, 0.018]], bocca: [[0.604, 0.125, 0.012, 0.018]], collo: [[0.647, 0.194, 0.012, 0.035]],
          ascelle: [[0.596, 0.255, 0.012, 0.03], [0.716, 0.265, 0.012, 0.03]],
          mani: [[0.596, 0.663, 0.015, 0.05], [0.696, 0.678, 0.017, 0.05]],
        },
        giovane: copia(L2.soggiorno2.parti.giovane),
        nonna: copia(L2.soggiorno2.parti.nonna),
      },
      zone: [copia(L1.soggiorno.zone[0]), copia(L1.soggiorno.zone[1])],
      // Davide sotto il pavimento: il bozzolo e' tiepido
      macchie: [[0.83, 0.94, 0.09, 0.04, 0.45], [0.385, 0.02, 0.03, 0.55]],
      nascosti: [{ x: 0.83, y: 0.94, rx: 0.09, ry: 0.045, prova: "calore_sotto" }],
    },
    // la cantina sotto la botola: Davide e' un bozzolo appeso alla trave
    cantina5: {
      casa: "casa5", notte: true, ritorno: "soggiorno2", ritornoNome: T("Torna di sopra"), ambiente: null, calore: "vivo",
      conosci: ["ragazzo"], morti: ["ragazzo"],
      img: "g3/cantina5", persone: ["ragazzo"],
      frasi: { ragazzo: [0.6, 0.12, "destra"] },
      parti: {
        ragazzo: {
          occhi: [[0.5, 0.276, 0.025, 0.013]], bocca: [[0.5, 0.335, 0.012, 0.008]], collo: [[0.5, 0.375, 0.03, 0.015]],
          ascelle: [[0.43, 0.45, 0.015, 0.04], [0.57, 0.45, 0.015, 0.04]],
          mani: [[0.455, 0.55, 0.03, 0.04]],
        },
      },
      macchie: [[0.62, 0.31, 0.012, 0.8]],
      zone: [
        { id: "materasso", nome: T("il materasso"), box: [0.64, 0.68, 0.95, 0.82], tipo: "indizio", segni: [[0.78, 0.75, 0.12, 0.05]],
          dice: [[null, T("Il materasso dove dormiva, il primo giorno. La coperta è macchiata di scuro.")],
            [null, T("Accanto, una scodella di *latte*, piena. E un'altra, vuota, con dentro un ciuffo di fili grigi."), { k: "zona:materasso" }]],
          poi: { prova: "scodella" } },
      ],
      nascosti: [],
    },
    // casa 2: la stessa stanza di ieri, a strati (chi e' andato al lazzaretto non c'e')
    monolocale: {
      casa: "casa2", notte: false, ambiente: "nebulizzatore", calore: "vivo",
      img: img("monolocale", [moglie && "moglie", marito && "marito"]),
      persone: ["moglie", "marito"].filter((id) => presenti[id]),
      frasi: copia(L2.monolocale.frasi), parti: copia(L2.monolocale.parti),
      // la stufa e il nebulizzatore di ieri, come sono oggi (le prove di ieri non tornano sul nastro)
      zone: copia(L2.monolocale.zone).filter((z) => z.id !== "letto").map((z) => ({ ...z, poi: undefined,
        dice: z.id === "stufa" ? (dittaSa
          ? [[null, T("Nella stufa spenta, il *camice* della Panacea e i fogli strappati della cartella."), { k: "zona:stufa" }],
            [null, T("Sopra, tre fiammiferi bruciati. Non ha avuto il coraggio di accenderla.")]]
          : [[null, T("La stufa è fredda. Dentro, il *camice* appallottolato: lo nasconde lì ogni mattina, quando torna dal turno."), { k: "zona:stufa" }]])
          : dittaSa ? [[null, T("Il nebulizzatore è spento. L'etichetta del Programma Respiro è strappata, la *fiala* non c'è più."), { k: "zona:nebulizzatore" }]]
            : [[null, T("Il nebulizzatore borbotta. «PANACEA · Programma Respiro. Riservato ai *dipendenti*.»"), { k: "zona:nebulizzatore" }]] })),
      nascosti: [],
    },
    // casa 10: la cucina della suocera e la camera della nuora, a strati
    cucina10: {
      casa: "casa10", notte: false, ambiente: "cucina", calore: "vivo",
      img: img("cucina10", [suocera && "suocera"]), persone: suocera ? ["suocera"] : [],
      frasi: copia(L2.cucina10.frasi), parti: copia(L2.cucina10.parti),
      // il cappotto rosso della nuora, oggi
      zone: copia(L2.cucina10.zone).map((z) => (z.id !== "cappotto" ? z : { ...z, poi: undefined,
        dice: presa ? [[null, T("Il *cappotto* rosso della nuora è ancora dietro la porta. Se la sono presa senza."), { k: "zona:cappotto" }]]
          : nuora ? [[null, T("Il *cappotto* rosso, dietro la porta. In tasca il biglietto della corriera, mai timbrato."), { k: "zona:cappotto" }]]
            : [[null, T("Il *cappotto* rosso della nuora, dietro la porta. Nel recinto non se l'è portato."), { k: "zona:cappotto" }]] })),
      // se la nuora c'e', dietro la porta: il calore passa dal legno
      macchie: [[0.419, 0.53, 0.008, 0.85], [0.441, 0.01, 0.025, 0.6], ...(nuora ? [[0.735, 0.6, 0.03, 0.13, 0.5]] : [])],
      // la porta della camera oggi e' aperta, se la suocera non c'e' (o se la nuora non c'e' piu')
      aperte: !suocera || !nuora ? ["porta10"] : [],
      nascosti: nuora ? [{ x: 0.735, y: 0.55, rx: 0.06, ry: 0.2, prova: "calore_camera10" }] : [],
    },
    camera10: {
      casa: "casa10", notte: true, ritorno: "cucina10", ambiente: null, calore: "vivo",
      conosci: nuora ? ["nuora"] : [],
      img: img("camera10", [nuora && "nuora"]), persone: nuora ? ["nuora"] : [],
      frasi: copia(L2.camera10.frasi), parti: copia(L2.camera10.parti),
      macchie: [[0.638, 0.42, 0.018, 0.8]],
      zone: copia(L2.camera10.zone).map((z) => ({ ...z, poi: undefined,
        ...(z.id === "candeggina" ? { dice: [[null, T("La tanica di *candeggina* è vuota. Il pavimento attorno al letto è ancora bagnato."), { k: "zona:candeggina" }]] } : {}) })),
      nascosti: [],
    },
    // casa 7: la stanza davanti della casa del sacrestano, attaccata al campanile
    sacrestia7: {
      casa: "casa7", notte: false, ambiente: "camera", calore: "vivo",
      img: "g3/sacrestia7", persone: ["sacrestano", "giona"],
      frasi: { sacrestano: [0.345, 0.24, "destra"], giona: [0.665, 0.16, "sinistra"] },
      parti: {
        sacrestano: {
          occhi: [[0.293, 0.405, 0.04, 0.02]], bocca: [[0.293, 0.475, 0.015, 0.012]], collo: [[0.295, 0.52, 0.02, 0.015]],
          ascelle: [[0.215, 0.56, 0.012, 0.03], [0.375, 0.56, 0.012, 0.03]],
          mani: [[0.28, 0.62, 0.02, 0.025], [0.325, 0.62, 0.02, 0.025]],
        },
        giona: {
          occhi: [[0.78, 0.355, 0.03, 0.015]], bocca: [[0.783, 0.405, 0.015, 0.01]], collo: [[0.785, 0.44, 0.025, 0.015]],
          ascelle: [[0.705, 0.5, 0.014, 0.035], [0.95, 0.52, 0.015, 0.035]],
          mani: [[0.7, 0.78, 0.035, 0.05], [0.79, 0.795, 0.04, 0.03]],
        },
      },
      zone: [
        { id: "minestra", nome: T("la minestra"), box: [0.385, 0.72, 0.48, 0.8], tipo: "indizio", segni: [[0.432, 0.763, 0.045, 0.03]],
          dice: [[null, T("Sotto il piattino, una scodella di minestra. Ancora tiepida.")],
            [null, T("Il cucchiaio è pulito. Non è per nessuno di loro due."), { k: "zona:minestra" }]], poi: { prova: "minestra" } },
        { id: "chiavi", nome: T("le chiavi"), box: [0.36, 0.3, 0.48, 0.47], tipo: "indizio", segni: [[0.415, 0.385, 0.06, 0.07]],
          dice: [[null, T("Al chiodo, le chiavi della chiesa. Una è più grande delle altre, nera, antica.")],
            [null, T("Sull'anello, inciso: *CRIPTA*."), { k: "zona:chiavi" }]], poi: { prova: "chiave_cripta" } },
        { id: "corde", nome: T("le corde delle campane"), box: [0.76, 0.04, 0.88, 0.3], tipo: "indizio",
          segni: [[0.785, 0.17, 0.02, 0.1], [0.855, 0.17, 0.02, 0.1]],
          dice: [[null, T("Le corde delle campane. Sulle impugnature rosse e bianche, impronte scure: *sangue* secco."), { k: "zona:corde" }],
            [null, T("Qualcuno ha suonato con un braccio ferito.")]], poi: { prova: "sangue_corde" } },
        { id: "porta7", nome: T("la porta della cantina"), box: [0.57, 0.39, 0.7, 0.75], tipo: "porta", segni: [[0.63, 0.57, 0.06, 0.17]] },
      ],
      // le candele accese giu' nella cripta: sul nastro all'infrarosso, sotto la porta, una luce calda
      macchie: [[0.51, 0.06, 0.03, 0.7], [0.53, 0.72, 0.025, 0.6], [0.63, 0.73, 0.05, 0.02, 0.55]],
      nascosti: [{ x: 0.63, y: 0.73, rx: 0.05, ry: 0.025, prova: "calore_cripta" }],
    },
    // la cripta sotto la chiesa: la moglie del sacrestano, cambiata in una santa di cera, nella nicchia in fondo
    cripta7: {
      casa: "casa7", notte: true, ritorno: "sacrestia7", ritornoNome: T("Torna di sopra"), ambiente: null, calore: "vivo",
      conosci: ["assunta"], morti: ["assunta"],
      img: "g3/cripta7", persone: ["assunta"],
      frasi: { assunta: [0.665, 0.12, "destra"] },
      parti: {
        assunta: {
          occhi: [[0.575, 0.19, 0.02, 0.012]], bocca: [[0.576, 0.24, 0.012, 0.01]], collo: [[0.575, 0.28, 0.018, 0.015]],
          ascelle: [[0.525, 0.36, 0.012, 0.025], [0.625, 0.36, 0.012, 0.025]],
          mani: [[0.575, 0.33, 0.02, 0.035]],
        },
      },
      macchie: [[0.33, 0.78, 0.04, 0.6], [0.37, 0.57, 0.03, 0.55], [0.74, 0.79, 0.03, 0.6], [0.8, 0.58, 0.03, 0.55], [0.2, 0.66, 0.02, 0.5],
        [0.575, 0.33, 0.012, 0.75]],
      zone: [
        { id: "maschera", nome: T("la maschera"), box: [0.03, 0.09, 0.16, 0.68], tipo: "indizio", segni: [[0.09, 0.27, 0.05, 0.16]],
          dice: [[null, T("In una nicchia, una maschera a becco di cuoio, nera di secoli.")],
            [null, T("Al posto dell'occhio destro, una lente d'ottone. Uguale alla *tua*."), { k: "zona:maschera" }],
            [null, T("Sotto, una lapide: «MEDICO · 1630 · PORTÒ IL MALVENTO E QUI LO TENNE».")]], poi: { prova: "maschera_1630" } },
        { id: "ossario", nome: T("le ossa"), box: [0.3, 0.3, 0.4, 0.6], tipo: "indizio", segni: [[0.35, 0.45, 0.05, 0.15]],
          dice: [[null, T("I morti della peste di allora, impilati nella nicchia. Sui teschi, gocce di cera fresca.")],
            [null, T("Qualcuno scende tutte le sere ad accendere le candele.")]] },
      ],
      nascosti: [],
    },
    // casa 4: la sartoria delle gemelle
    sartoria4: {
      casa: "casa4", notte: false, ambiente: "cucina", calore: "vivo",
      img: "g3/sartoria4", persone: ["ada", "lia"],
      frasi: { ada: [0.3, 0.17, "sinistra"], lia: [0.705, 0.17, "destra"] },
      parti: {
        ada: {
          occhi: [[0.385, 0.315, 0.05, 0.022]], bocca: [[0.388, 0.39, 0.014, 0.01]], collo: [[0.39, 0.46, 0.015, 0.035]],
          ascelle: [[0.3, 0.6, 0.012, 0.035], [0.48, 0.6, 0.012, 0.035]],
          mani: [[0.385, 0.795, 0.05, 0.02]],
        },
        lia: {
          occhi: [[0.617, 0.32, 0.05, 0.022]], bocca: [[0.617, 0.395, 0.014, 0.01]], collo: [[0.617, 0.46, 0.015, 0.035]],
          ascelle: [[0.525, 0.6, 0.012, 0.035], [0.715, 0.6, 0.012, 0.035]],
          mani: [[0.615, 0.795, 0.05, 0.02]],
        },
      },
      macchie: [[0.49, 0.08, 0.015, 0.6]],
      zone: [
        { id: "macchina", nome: T("la macchina da cucire"), box: [0.0, 0.64, 0.25, 0.82], tipo: "indizio", segni: [[0.11, 0.73, 0.08, 0.07]],
          dice: [[null, T("Sulla macchina da cucire, accanto al rocchetto, un *termometro*."), { k: "zona:macchina" }],
            [null, T("Segna trentanove e due. È ancora caldo.")]], poi: { prova: "termometro" } },
        { id: "lenzuola", nome: T("le lenzuola"), box: [0.77, 0.47, 0.98, 0.82], tipo: "indizio", segni: [[0.875, 0.62, 0.09, 0.13]],
          dice: [[null, T("Lenzuola bianche, piegate. Su quella in cima, il triangolo della *Panacea*."), { k: "zona:lenzuola" }],
            [null, T("Sono le lenzuola delle brande del recinto. Sotto la piega, una macchia scura che il lavaggio non ha tolto.")]],
          poi: { prova: "lenzuola" } },
        { id: "manichini", nome: T("i manichini"), box: [0.0, 0.08, 0.3, 0.62], tipo: "indizio",
          segni: [[0.09, 0.4, 0.08, 0.22], [0.23, 0.4, 0.07, 0.22]],
          dice: [[null, T("Due giacche nere da uomo, da funerale, imbastite col filo bianco.")],
            [null, T("Uguali. Senza un nome sul cartellino."), { k: "zona:manichini" }]], poi: { prova: "giacche" } },
      ],
      nascosti: [],
    },
  };

  // ---------- l'arrivo ----------
  const sottoIlTetto = [null, T("[nell'angolo, accanto alla porta, qualcosa di altissimo, chino sotto il soffitto]")];
  const ARRIVO = {
    cucina2: padre && figlia ? righe([null, T("[la tavola è apparecchiata per due. Il padre è seduto al suo posto, la schiena dritta]")],
      ["FIGLIA", T("Entrate pure. Papà oggi sta *meglio*."), { d: "sta_meglio", k: "persona:padre" }],
      ["FIGLIA", T("Ha fatto colazione con me.")],
      grave(figlia3) ? [null, T("[la ragazza trema. Si regge allo stipite]")] : null)
      : padre ? [[null, T("[la porta è socchiusa. In cucina, seduto a tavola, il padre]")], [null, T("[non si gira. Davanti a lui una tazza di caffè]")]]
        : figlia ? righe(["FIGLIA", T("Siete tornati.")], ["FIGLIA", T("Qui non c'è più niente da prendere.")],
          madreUscita ? [null, T("[ogni tanto alza gli occhi al soffitto]")] : null)
          : righe([null, T("[la porta di casa è aperta. Dentro non c'è nessuno]")], madreUscita ? [null, T("[dal corridoio entra un vento freddo]")] : null),
    camera2: madreUscita ? [[null, T("[la camera è vuota. La finestra è aperta, i vetri rotti]")], [null, T("[entra il vento. Le tende sbattono]")]]
      : [[null, T("[il letto è rifatto, il lenzuolo tirato]")], [null, T("La madre è nel recinto della ditta, dal primo giorno.")]],
    soggiorno2: nonna ? righe(["NONNA", giovane ? T("Entrate. Siamo rimaste in due, adesso.") : T("Entrate. Sono rimasta io.")],
      uomo && sottoIlTetto, uomo && [null, T("[nessuno lo guarda]")])
      : giovane ? righe(["RAGAZZA", T("[apre senza dire niente. Non alza gli occhi]")], uomo && sottoIlTetto)
        : righe([null, T("[la porta è aperta. In casa non c'è nessuno]")], uomo && [null, T("[quasi nessuno: nell'angolo, accanto alla porta, qualcosa di altissimo, chino sotto il soffitto]")]),
    cantina5: [[null, T("[una scala ripida. Sotto, l'odore della terra e del latte]")], [null, T("[appeso alla trave, un bozzolo grande come un uomo]")],
      [null, T("Dentro, la faccia di un ragazzo. Gli occhi sono aperti.")]],
    monolocale: moglie && marito ? (dittaSa
      ? [[null, T("[la moglie è seduta davanti alla stufa spenta, con una scatola di fiammiferi in mano]")],
        ["MOGLIE", T("Siete contento? Stanotte al cancello mi hanno tolto il permesso.")],
        ["MOGLIE", T("Mi hanno chiesto della *cartella*. Sapevano che ce l'avevo io."), { d: "sapevano" }],
        ["MOGLIE", T("L'avete scritto sul vostro foglio. Loro leggono tutto.")]]
      : [[null, T("[la moglie è appena tornata dal turno. Ha ancora i segni della mascherina]")],
        ["MOGLIE", T("Di nuovo voi. Stanotte, nel recinto, c'era movimento.")]])
      : moglie ? [["MOGLIE", T("Mio marito ce l'avete voi. Nel recinto.")], ["MOGLIE", T("Stanotte l'ho visto da lontano, dietro un vetro. Respirava ancora.")]]
        : marito ? [[null, T("[il marito è solo, sulla poltrona]")], ["MARITO", T("Lei non c'è. L'avete portata voi, dove lavorava.")],
          ["MARITO", T("Adesso chi me la cambia, la fiala?")]]
          : [[null, T("[la porta è aperta. Nella stanza non c'è nessuno. Il nebulizzatore borbotta da solo]")]],
    cucina10: suocera ? (presa
      ? [["SUOCERA", T("Siete contento, adesso?")],
        ["SUOCERA", T("Stanotte è venuto il *furgone* bianco. Sapevano della camera. Sapevano della chiave."), { d: "furgone" }],
        ["SUOCERA", T("Sul vostro foglio c'era scritto, vero? «Non si ammala».")], [null, T("[la porta della camera è aperta. Dentro non c'è nessuno]")]]
      : nuora ? righe(["SUOCERA", T("Di nuovo voi.")], ["SUOCERA", T("Stanotte sono passati quelli della ditta. Porta a porta. Chiedevano di lei.")],
        suocera3 !== "sano" ? ["SUOCERA", T("[tossisce. Si tiene il fazzoletto stretto sotto il mento]")] : null)
        : [["SUOCERA", T("Ve la siete presa voi. Siete contento?")], ["SUOCERA", T("Adesso in questa casa c'è solo una vecchia che aspetta il malvento.")]])
      : nuora ? [[null, T("[la cucina è vuota. La porta della camera è aperta]")], ["NUORA", T("Sono qui. Di là.")]]
        : [[null, T("[la casa è vuota. Le due porte sono aperte]")]],
    camera10: nuora ? righe([null, T("[la nuora è seduta sul letto, vestita, con le scarpe ai piedi]")],
      suocera ? ["NUORA", T("Stanotte bussavano a tutte le porte del vicolo. Lei mi ha nascosta sotto il letto.")]
        : ["NUORA", T("Me l'avete presa. L'unica che mi voleva bene, qui.")],
      ["NUORA", T("Io voglio *andare* con loro."), { d: "voglio_andare", k: "persona:nuora" }])
      : [[null, T("[la camera è vuota. I due cuscini sono ancora schiacciati]")]],
    sacrestia7: [[null, T("[il sacrestano apre prima che tu bussi. Ha in mano un mazzo di chiavi]")],
      ["SACRESTANO", T("Dottore. Vi aspettavo. Il Signore vede tutto, anche voi.")],
      [null, T("[seduto sotto le corde delle campane, un uomo enorme ti guarda. Ha la fronte bagnata]")]],
    cripta7: [[null, T("[una scala di pietra. Giù, decine di candele accese]")],
      [null, T("[nella nicchia in fondo, una donna in piedi, bianca come la cera. Canta a bocca chiusa]")], [null, T("Non è una statua. Respira.")]],
    sartoria4: [[null, T("[due donne identiche, sedute dietro il tavolo da lavoro, le mani giunte]")], ["ADA", T("Buongiorno, dottore.")],
      ["LIA", T("Buongiorno, dottore.")], [null, T("[l'hanno detto insieme, con la stessa voce]")]],
  };

  // ---------- le porte ----------
  const chiApre = nonna ? "NONNA" : giovane ? "RAGAZZA" : null;
  const PORTE = {
    corridoio: {
      entra: { testo: T("entra nel corridoio"), vai: "camera2" },
      scelte: [
        { testo: T("ascolta"), minuti: 5, dice: madreUscita ? [[null, T("[dal fondo del corridoio, solo il vento]")], [null, T("Entra da una finestra aperta.")]]
          : [[null, T("[dal fondo del corridoio non viene nessun rumore]")]] },
        { testo: T("entra nel corridoio"), minuti: 5,
          dice: righe(["TU", T("Voglio vedere di là.")], figlia ? ["FIGLIA", T("Andate. Di là non c'è più nessuno.")] : null),
          poi: { sblocca: "corridoio", vai: "camera2" } },
      ],
    },
    // il ripostiglio, la botola, la cantina: oggi la chiave ce l'ha la nonna al collo
    porta: {
      entra: { testo: T("scendi in cantina"), vai: "cantina5" },
      scelte: [
        { testo: T("chiedi di aprire"), minuti: 5,
          dice: righe(["TU", T("Aprite questa porta.")], chiApre && [chiApre, T("È aperta. Guardate pure.")],
            [null, T("Il ripostiglio è vuoto. Per terra, la *botola*, chiusa col lucchetto."), { k: "zona:porta" }]),
          poi: { prova: "botola" } },
        { testo: T("ascolta alla porta"), minuti: 5,
          dice: [[null, T("[da sotto il pavimento, un respiro lento. Profondo. Come di qualcuno che dorme]")],
            [null, T("Poi un fruscio, come di stoffa che si stira.")]], poi: { prova: "respiro_sotto" } },
        { testo: T("scendi in cantina"), minuti: 10, se: { prova: "botola" },
          dice: chiApre === "NONNA" ? [["TU", T("Datemi la chiave della botola.")], ["NONNA", T("Ce l'ho io. Al collo.")],
            ["NONNA", T("Scendete pure. Ma piano: dorme.")]]
            : chiApre ? [["TU", T("Datemi la chiave della botola.")], ["RAGAZZA", T("È sul chiodo, dietro la porta.")], ["RAGAZZA", T("Io non scendo.")]]
              : [[null, T("Il lucchetto è aperto, appeso all'anello. Qualcuno è sceso stamattina.")]],
          poi: { sblocca: "porta", vai: "cantina5" } },
      ],
    },
    // casa 2: il letto non nasconde piu' niente (la cartella la moglie l'ha bruciata, o la ditta l'ha ripresa)
    // casa 10: la camera della nuora
    porta10: {
      entra: { testo: T("entra nella camera"), vai: "camera10" },
      scelte: [
        { testo: T("chiedi di aprire"), minuti: 5,
          dice: nuora ? [["TU", T("Fatemi entrare.")], ["SUOCERA", T("Ormai lo sapete. Entrate.")]] : [["TU", T("Fatemi entrare.")], ["SUOCERA", T("Entrate. Non c'è più nessuno.")]],
          poi: { sblocca: "porta10", vai: "camera10" } },
      ],
    },
    // casa 7: la porta della cantina, e sotto la scala della cripta
    porta7: {
      entra: { testo: T("scendi nella cripta"), vai: "cripta7" },
      scelte: [
        { testo: T("ascolta alla porta"), minuti: 5,
          dice: [[null, T("[da sotto, un *canto*. Una voce di donna, a bocca chiusa. Sempre la stessa nota]"), { k: "zona:porta7" }]], poi: { prova: "canto" } },
        { testo: T("chiedi di aprire"), minuti: 5,
          dice: [["TU", T("Aprite.")], ["SACRESTANO", T("È la cantina. Il vino della messa, e la scala della cripta.")],
            ["SACRESTANO", T("Chiusa da cent'anni. La chiave ce l'ha il *parroco*."), { d: "chiave_parroco", k: "zona:chiavi" }]] },
        { testo: T("apri con la chiave antica"), minuti: 10, se: { prova: "chiave_cripta" },
          dice: [["TU", T("La chiave è qui, al vostro chiodo.")], ["SACRESTANO", T("No! Dottore, vi prego..."), { volto: "piange" }],
            [null, T("[il chiavistello cede. Una scala di pietra scende nel buio]")]],
          poi: { fiducia: -10, forzata: true, sblocca: "porta7", vai: "cripta7", volti: { sacrestano: "piange" } } },
      ],
    },
  };

  // ---------- gli esami ----------
  const E1 = D1.ESAMI, E2 = G2.ESAMI;
  const ESAMI = {};
  // il padre radicato
  if (padre) ESAMI.padre = {
    occhi: { reperto: T("una pellicola bianca sugli occhi, come latte: non sbatte le palpebre"), foto: "g3/padre_occhi",
      dice: [[null, T("[la testa si gira verso la tua luce. Troppo. Si sente il collo scricchiolare]")]] },
    bocca: { reperto: T("la bocca secca e grigia, mezza aperta; la lingua dura come legno"), foto: "g3/padre_bocca",
      dice: [[null, T("[dalla bocca esce un soffio secco, come da una crepa]")]] },
    collo: { reperto: T("la pelle grigia e crepata come corteccia; i bubboni seccati in nodi"), segno: "bubbone", foto: "g3/padre_collo",
      dice: [[null, T("[sotto la pelle qualcosa scricchiola, come un ramo]")]] },
    ascelle: { reperto: T("le braccia non si staccano dal tavolo"), rifiuta: [[null, T("[le braccia non si staccano dal tavolo. Le radici tengono]")]] },
    mani: { reperto: T("le dita lunghe come radici, entrate nel legno del tavolo"), segno: "dita", foto: "g3/padre_mani",
      dice: [[null, T("Le dita sono entrate nel *tavolo*. Il legno si è spaccato attorno."), { k: "parte:padre.mani" }]] },
  };
  if (figlia) ESAMI.figlia = grave(figlia3) ? {
    occhi: { reperto: T("occhi infossati e lucidi: febbre altissima"), segno: "febbre", foto: "g3/figlia_occhi_grave", dice: [["FIGLIA", T("Ho freddo. Tanto freddo.")]] },
    bocca: { ...copia(E1.figlia.bocca), reperto: T("labbra spaccate") },
    collo: { reperto: T("il bubbone sotto l'orecchio è viola, e si è aperto"), segno: "bubbone", foto: "g3/figlia_collo_grave",
      dice: [["FIGLIA", T("[non ha più la forza di coprirlo]")]] },
    ascelle: { reperto: T("si è rifiutata"), rifiuta: [["FIGLIA", T("No. Non davanti a lui.")]] },
    mani: { reperto: T("le punte di due dita diventano nere"), segno: "dita", foto: "g3/figlia_mani_grave", dice: [["FIGLIA", T("Come il nonno. Come papà.")]] },
  } : malato(figlia3) ? {
    ...copia(E1.figlia),
    occhi: { reperto: T("occhi lucidi, guance rosse: febbre"), segno: "febbre", foto: "g2/figlia_occhi", dice: [["FIGLIA", T("Ho dormito da voi. Stamattina scottavo.")]] },
    collo: { reperto: T("un gonfiore piccolo sotto l'orecchio, appena cominciato"), segno: "bubbone", foto: "g2/figlia_collo", dice: [["FIGLIA", T("[si tira su il cappuccio]")]] },
  } : copia(E1.figlia);
  // l'uomo allungato
  if (uomo) ESAMI.uomo = {
    occhi: { reperto: T("occhi piccoli e neri, senza bianco, in fondo alla faccia tirata"), foto: "g3/uomo_occhi",
      dice: [[null, T("[non ti guarda. Guarda il soffitto]")]] },
    bocca: { reperto: T("la bocca è un ovale nero, troppo lungo; il fiato caldo come un forno"), segno: "tosse", foto: "g3/uomo_bocca",
      dice: [[null, T("[dalla bocca aperta esce un fiato caldo, senza rumore]")]] },
    collo: { reperto: T("il collo allungato di un palmo; le vertebre come nodi"), foto: "g3/uomo_collo",
      dice: [[null, T("[la testa batte piano contro il soffitto. Tac. Tac.]")]] },
    ascelle: { reperto: T("non abbassa le braccia"), rifiuta: [[null, T("[le braccia restano lungo i fianchi, fino alle ginocchia]")]] },
    mani: { reperto: T("le dita troppo lunghe, con una falange in più; le unghie bianche di intonaco"), segno: "dita", foto: "g3/uomo_mani",
      dice: [[null, T("Le unghie sono piene di *intonaco*. Sul soffitto, sopra di lui, graffi."), { k: "parte:uomo.mani" }]] },
  };
  if (giovane) ESAMI.giovane = grave(giovane3) ? {
    ...copia(E1.giovane),
    occhi: { reperto: T("occhi infossati e lucidi: febbre altissima"), segno: "febbre", foto: "g3/giovane_occhi_grave", dice: [["RAGAZZA", T("Da due giorni. Da quando ho dormito da voi.")]] },
    collo: { reperto: T("un bubbone sotto la mascella, grande come un uovo"), segno: "bubbone", foto: "g3/giovane_collo_grave", dice: [["RAGAZZA", T("[deglutisce a fatica]")]] },
    mani: { reperto: T("le punte di due dita diventano nere"), segno: "dita", foto: "g3/giovane_mani_grave", dice: [["RAGAZZA", T("[nasconde le mani nelle maniche]")]] },
  } : malato(giovane3) ? { ...copia(E1.giovane),
    occhi: { reperto: T("occhi lucidi, guance rosse: febbre"), segno: "febbre", foto: "g2/giovane_occhi", dice: [["RAGAZZA", T("Ho dormito da voi.")]] } }
    : copia(E1.giovane);
  if (nonna) {
    ESAMI.nonna = copia(E1.nonna);
    ESAMI.nonna.bocca = { reperto: T("tosse secca, niente sangue"), dice: [["NONNA", T("Tossisco dal '44, dottore.")]] };
    if (grave(nonna3)) Object.assign(ESAMI.nonna, {
      occhi: { reperto: T("cataratta, e febbre altissima"), segno: "febbre", foto: "g3/nonna_occhi_grave", dice: [["NONNA", T("Vedo mia madre, dottore. È qui accanto.")]] },
      collo: { reperto: T("un bubbone sotto la mascella, grande come un uovo"), segno: "bubbone", foto: "g3/nonna_collo_grave", dice: [["NONNA", T("Eccolo. Il malvento.")]] },
      mani: { reperto: T("le punte di tre dita diventano nere"), segno: "dita", foto: "g3/nonna_mani_grave", dice: [["NONNA", T("Come le mani di mia nonna. Nel '44.")]] },
    });
    else if (malato(nonna3)) ESAMI.nonna.occhi = { reperto: T("cataratta, e occhi lucidi: febbre"), segno: "febbre", foto: "g2/nonna_occhi",
      dice: [["NONNA", T("Ecco. È arrivata anche per me.")]] };
  }
  // Davide nel bozzolo
  ESAMI.ragazzo = {
    occhi: { reperto: T("occhi aperti, neri e bagnati: non sbattono"), foto: "g3/ragazzo_occhi", dice: [[null, T("[gli occhi seguono la tua luce. Lentamente]")]] },
    bocca: { reperto: T("labbra grigie; fili sottili escono dagli angoli della bocca"), foto: "g3/ragazzo_bocca",
      dice: [[null, T("[respira piano. I fili tremano a ogni respiro]")]] },
    collo: { reperto: T("sotto il mento la pelle diventa fili grigi e neri, caldi e bagnati"), foto: "g3/ragazzo_collo",
      dice: [[null, T("[sotto i fili qualcosa pulsa, piano]")]] },
    ascelle: { reperto: T("dentro il bozzolo"), rifiuta: [[null, T("[il bozzolo è chiuso. Non c'è niente da aprire]")]] },
    mani: { reperto: T("una mano bianca: dalle unghie escono fili come radici di muffa"), segno: "dita", foto: "g3/ragazzo_mani",
      dice: [[null, T("La mano è *calda*. I fili escono da sotto le unghie."), { k: "parte:ragazzo.mani" }]] },
  };
  // casa 2
  if (moglie) {
    ESAMI.moglie = copia(E2.moglie);
    if (malato(moglie3)) ESAMI.moglie.occhi = { reperto: T("occhi lucidi e arrossati: febbre"), segno: "febbre", foto: "g3/moglie_occhi_febbre",
      dice: [["MOGLIE", T("Non ho dormito. Ve l'ho detto.")]] };
  }
  if (marito) ESAMI.marito = grave(marito3) ? {
    ...copia(E2.marito),
    occhi: { reperto: T("occhi infossati e lucidi: febbre altissima"), segno: "febbre", foto: "g3/marito_occhi_grave", dice: [["MARITO", T("[non riesce a tenere gli occhi aperti]")]] },
    collo: { reperto: T("un bubbone sotto la mascella, grande come un uovo"), segno: "bubbone", foto: "g3/marito_collo_grave", dice: [["MARITO", T("[respira dal naso, a fatica]")]] },
    mani: { reperto: T("le punte delle dita diventano nere, sopra le unghie blu della cava"), segno: "dita", foto: "g3/marito_mani_grave",
      dice: [["MARITO", T("Le *dita*. Non le sento più."), { k: "parte:marito.mani" }]] },
  } : malato(marito3) ? {
    ...copia(E2.marito),
    occhi: { reperto: T("occhi lucidi e arrossati, sudore: febbre"), segno: "febbre", foto: "g2/marito_occhi_febbre", dice: [["MARITO", T("Brucio. Da stanotte.")]] },
    collo: { reperto: T("un bubbone sotto la mascella, appena cominciato"), segno: "bubbone", foto: "g2/marito_collo_febbre", dice: [["MARITO", T("Ieri non c'era.")]] },
  } : {
    ...copia(E2.marito),
    occhi: { reperto: T("occhi stanchi, niente febbre"), foto: "g2/marito_occhi", dice: [["MARITO", T("Ci vedo ancora. Purtroppo.")]] },
    collo: { reperto: T("i tendini tirati dal respiro, niente gonfiori"), foto: "g2/marito_collo", dice: [["MARITO", T("[deglutisce]")]] },
  };
  // casa 10
  if (suocera) ESAMI.suocera = grave(suocera3) ? {
    ...copia(E2.suocera),
    occhi: { reperto: T("occhi infossati e lucidi: febbre altissima"), segno: "febbre", foto: "g3/suocera_occhi_grave", dice: [["SUOCERA", T("Ho pianto. Ancora.")]] },
    collo: { reperto: T("un bubbone sotto la mascella, viola, aperto"), segno: "bubbone", foto: "g3/suocera_collo_grave", dice: [["SUOCERA", T("[si sfila il fazzoletto senza dire niente]")]] },
    mani: { reperto: T("terra sotto le unghie, e tre dita diventano nere"), segno: "dita", foto: "g3/suocera_mani_grave", dice: [["SUOCERA", T("Come le mani di Paolo, l'ultimo giorno.")]] },
  } : malato(suocera3) ? {
    ...copia(E2.suocera),
    occhi: { reperto: T("occhi lucidi, sudore sotto il fazzoletto: febbre"), segno: "febbre", foto: "g2/suocera_occhi_febbre", dice: [["SUOCERA", T("Ho pianto. Si piange.")]] },
    collo: { reperto: T("un bubbone sotto la mascella, appena cominciato"), segno: "bubbone", foto: "g2/suocera_collo_febbre", dice: [["SUOCERA", T("Il malvento. Adesso ce l'ho anch'io.")]] },
  } : {
    ...copia(E2.suocera),
    occhi: { reperto: T("palpebre gonfie di pianto, occhi asciutti: niente febbre"), foto: "g2/suocera_occhi", dice: [["SUOCERA", T("Ho pianto. Si piange.")]] },
    collo: { reperto: T("un nastro nero al collo, niente gonfiori"), foto: "g2/suocera_collo", dice: [["SUOCERA", T("Il lutto. Lo porto per Paolo.")]] },
  };
  if (nuora) ESAMI.nuora = copia(E2.nuora);
  // casa 7
  ESAMI.sacrestano = {
    occhi: malato(sacrestano3)
      ? { reperto: T("dietro le lenti, occhi lucidi e arrossati: febbre"), segno: "febbre", foto: "g3/sacrestano_occhi_febbre", dice: [["SACRESTANO", T("È il fumo dei ceri, dottore.")]] }
      : { reperto: T("occhi enormi dietro le lenti spesse; niente febbre"), foto: "g3/sacrestano_occhi", dice: [["SACRESTANO", T("Ci vedo poco, ma vedo tutto.")]] },
    bocca: { reperto: T("niente"), foto: "g3/sacrestano_bocca", dice: [["SACRESTANO", T("[stringe la bocca piccola]")]] },
    collo: malato(sacrestano3)
      ? { reperto: T("un bubbone sotto la mascella, appena cominciato"), segno: "bubbone", foto: "g3/sacrestano_collo_febbre", dice: [["SACRESTANO", T("[si abbottona il colletto fino in cima]")]] }
      : { reperto: T("un cordoncino nero sotto il colletto; niente gonfiori"), foto: "g3/sacrestano_collo", dice: [["SACRESTANO", T("La chiave della sacrestia. Non la tolgo mai.")]] },
    ascelle: { reperto: T("si è rifiutato"), rifiuta: [["SACRESTANO", T("Abbiate pudore, dottore. Siamo in casa di Dio.")]] },
    mani: { reperto: T("mani morbide, cera sotto le unghie; sul dorso, tre graffi freschi"), foto: "g3/sacrestano_mani",
      dice: [["SACRESTANO", T("Il *gatto*. Abbiamo un gatto."), { d: "gatto", k: "parte:sacrestano.mani" }]] },
  };
  ESAMI.giona = {
    occhi: { reperto: T("occhi lucidi, la fronte bagnata: febbre"), segno: "febbre", foto: "g3/giona_occhi", dice: [["GIONA", T("[abbassa gli occhi]")]] },
    bocca: { reperto: T("labbra secche; è muto"), foto: "g3/giona_bocca", dice: [["GIONA", T("[apre la bocca, ma non esce niente]")]] },
    collo: { reperto: T("un bubbone sotto la mascella, appena cominciato"), segno: "bubbone", foto: "g3/giona_collo", dice: [["GIONA", T("[si tira giù il collo del maglione]")]] },
    ascelle: { reperto: T("si è rifiutato"), rifiuta: [["SACRESTANO", T("Lasciatelo stare. Si vergogna.")]] },
    mani: { reperto: T("sull'avambraccio, sotto una fascia sporca, un morso: denti umani"), foto: "g3/giona_mani",
      dice: [["GIONA", T("[cerca di riavvolgere la fascia]")]] },
  };
  ESAMI.assunta = {
    occhi: { reperto: T("occhi sigillati sotto la cera"), foto: "g3/assunta_occhi", dice: [[null, T("[il canto si ferma. La faccia di cera si gira verso di te]")]] },
    bocca: { reperto: T("la bocca chiusa sotto un velo di cera: il canto viene da dentro"), foto: "g3/assunta_bocca",
      dice: [[null, T("[le labbra non si muovono. Il canto continua]")]] },
    collo: { reperto: T("la pelle è cera, liscia e fredda; sotto, vene come stoppini"), foto: "g3/assunta_collo", dice: [[null, T("[una goccia di cera cola sul colletto]")]] },
    ascelle: { reperto: T("le braccia saldate alla cera"), rifiuta: [[null, T("[non si muove. Le braccia sono saldate al corpo dalla cera]")]] },
    mani: { reperto: T("le mani giunte; le dita fuse in una punta nera, come uno stoppino"), segno: "dita", foto: "g3/assunta_mani",
      dice: [[null, T("Tra le dita fuse brucia una fiammella. Le mani sono *calde*."), { k: "parte:assunta.mani" }]] },
  };
  // casa 4: Lia non si fa guardare collo e ascelle finche' non la smentisci ("prima", finche' non e' fatta la
  // contraddizione "uguali"); Ada si offre al posto suo
  ESAMI.ada = {
    occhi: malato(ada3)
      ? { reperto: T("occhi chiari, lucidi di febbre; il neo sotto l'occhio destro"), segno: "febbre", foto: "g3/ada_occhi_febbre", dice: [["ADA", T("Come Lia. Siamo uguali.")]] }
      : { reperto: T("occhi chiari; un neo sotto l'occhio destro; niente febbre"), foto: "g3/ada_occhi", dice: [["ADA", T("Guardate pure. Non c'è niente.")]] },
    bocca: { reperto: T("niente"), foto: "g3/ada_bocca", dice: [["ADA", T("[stringe le labbra. Lia, accanto, fa lo stesso]")]] },
    collo: { reperto: T("niente"), foto: "g3/ada_collo", dice: [["ADA", T("Il collo lungo ce l'abbiamo tutte e due. Da bambine ci chiamavano le giraffe.")]] },
    ascelle: { reperto: T("pelle sana, niente bubboni"), foto: "g3/ada_ascelle", dice: [["ADA", T("Visto? Niente.")], ["LIA", T("Niente.")]] },
    mani: { reperto: T("punture d'ago sull'indice: cuce"), foto: "g3/ada_mani", dice: [["ADA", T("Il ditale non lo usiamo. Ci rallenta.")]] },
  };
  ESAMI.lia = {
    occhi: { reperto: T("occhi lucidi sotto la cipria, guance rosse: febbre"), segno: "febbre", foto: "g3/lia_occhi",
      dice: [["LIA", T("È la cipria. Mi brucia.")], ["ADA", T("È la cipria.")]] },
    bocca: { reperto: T("labbra secche e screpolate"), foto: "g3/lia_bocca", dice: [["LIA", T("[si passa la lingua sulle labbra]")]] },
    collo: { se: { contestata: "uguali" }, prima: { reperto: T("si è rifiutata"), rifiuta: [["LIA", T("[si stringe il colletto]")],
      ["ADA", T("Guardate me. Siamo uguali: quello che non ho io, non ce l'ha lei.")]] },
    reperto: T("niente sul collo; sudore"), foto: "g3/lia_collo", dice: [["LIA", T("[non si muove più]")]] },
    ascelle: { se: { contestata: "uguali" }, prima: { reperto: T("si è rifiutata"), rifiuta: [["LIA", T("No.")],
      ["ADA", T("Guardate le mie, dottore. Sono uguali.")]] },
    reperto: T("un bubbone sotto l'ascella, grande come un uovo"), segno: "bubbone", foto: "g3/lia_ascelle",
    dice: [["LIA", T("[alza il braccio. Ada guarda da un'altra parte]")]] },
    mani: { reperto: T("dita umide che tremano; punture d'ago"), foto: "g3/lia_mani", dice: [["LIA", T("[le mani le tremano. Ada gliele prende tra le sue]")]] },
  };

  // ---------- le domande ----------
  const DOMANDE = { padre: [], uomo: [], ragazzo: [], assunta: [] };
  if (figlia) DOMANDE.figlia = [
    { id: "come", breve: T("come stai?"), testo: T("Come stai?"),
      dice: grave(figlia3) ? [["FIGLIA", T("*Bene*."), { d: "bene_figlia", k: "parte:figlia.occhi" }], ["FIGLIA", T("[batte i denti]")]]
        : malato(figlia3) ? [["FIGLIA", T("Ho la febbre. Lo vedete da voi.")], ["FIGLIA", T("Da quando ho dormito da voi.")]]
          : [["FIGLIA", T("Sto bene. Solo io, qui, sto bene.")], ["FIGLIA", T("Non so perché.")]] },
    ...(padre ? [{ id: "padre", breve: T("tuo padre?"), testo: T("E tuo padre?"),
      dice: [["FIGLIA", T("Sta *meglio*. Stanotte non ha tossito per niente."), { d: "sta_meglio", k: "persona:padre" }],
        ["FIGLIA", T("Si è seduto lì e ha dormito seduto. Come faceva il nonno.")]] }]
      : [{ id: "padre", breve: T("tuo padre?"), testo: T("E tuo padre?"), dice: [["FIGLIA", T("Ce l'avete voi. Nel recinto.")], ["FIGLIA", T("Da lì non esce nessuna notizia.")]] }]),
    { id: "madre", breve: T("tua madre?"), testo: T("E tua madre?"),
      dice: madreUscita ? [["FIGLIA", T("La mamma è nel *recinto*. L'avete presa voi."), { d: "mamma_recinto", k: "zona:corridoio" }],
        ["FIGLIA", T("[non ti guarda]")]]
        : [["FIGLIA", T("Ce l'avete voi. Dal primo giorno.")]] },
    { id: "nonno", breve: T("il nonno?"), testo: T("E il nonno?"),
      dice: [["FIGLIA", T("Il nonno è uscito una notte, scalzo. Non è più tornato.")], ["FIGLIA", T("Di notte, a volte, sento qualcuno camminare lungo il muro di casa.")]] },
  ];
  if (nonna) DOMANDE.nonna = [
    ...(uomo ? [{ id: "figlio", breve: T("suo figlio?"), testo: T("E suo figlio, signora?"),
      dice: [["NONNA", T("Luigi è *uscito*. A cercare lavoro, giù in città."), { d: "uscito", k: "persona:uomo" }], ["NONNA", T("[non si gira verso l'angolo]")]] }]
      : [{ id: "figlio", breve: T("suo figlio?"), testo: T("E suo figlio, signora?"), dice: [["NONNA", T("Ce l'avete voi.")], ["NONNA", T("Era il più buono dei miei figli.")]] }]),
    { id: "davide", breve: T("Davide?"), testo: T("E Davide?"),
      dice: [["NONNA", T("Davide *dorme*. Giù, in cantina."), { d: "dorme_davide", k: "zona:porta" }],
        ["NONNA", T("Sta facendo il bozzolo, come i bachi da seta di mia madre.")]] },
    { id: "ditta", breve: T("la ditta?"), testo: T("La ditta, adesso, cosa vuole?"),
      dice: [["NONNA", T("Ieri volevano i vecchi. Oggi vogliono i sani.")], ["NONNA", T("Domani vorranno quelli come Davide.")]] },
  ];
  if (giovane) DOMANDE.giovane = [
    { id: "come", breve: T("come stai?"), testo: T("Come stai?"),
      dice: grave(giovane3) ? [["RAGAZZA", T("Male. Lo vedete.")], ["RAGAZZA", T("Da quando ho dormito da voi.")]]
        : malato(giovane3) ? [["RAGAZZA", T("*Bene*."), { d: "bene_ragazza", k: "parte:giovane.occhi" }], ["RAGAZZA", T("[ha le guance rosse]")]]
          : [["RAGAZZA", T("Ho fame.")], ["RAGAZZA", T("E freddo. Come sempre.")]] },
    ...(uomo ? [{ id: "padre", breve: T("tuo padre?"), testo: T("Dov'è tuo padre?"),
      dice: [["RAGAZZA", T("È *uscito*."), { d: "uscito_ragazza", k: "persona:uomo" }], ["RAGAZZA", T("[guarda il pavimento. Mai l'angolo]")]] }] : []),
    { id: "davide", breve: T("tuo fratello?"), testo: T("E tuo fratello?"),
      dice: [["RAGAZZA", T("Gli portiamo il *latte*. Giù."), { d: "latte", k: "zona:porta" }], ["RAGAZZA", T("Lo beve dai fili. Non so come.")]] },
  ];
  if (moglie) DOMANDE.moglie = [
    ...(dittaSa ? [{ id: "cancello", breve: T("il cancello?"), testo: T("Cos'è successo al cancello?"),
      dice: [["MOGLIE", T("Mi hanno preso il tesserino. E la fiala del nebulizzatore di mio marito."), { volto: "arrabbiato" }],
        ["MOGLIE", T("«Programma Respiro: revocato.»"), { volto: "arrabbiato" }],
        ["MOGLIE", T("Mi hanno detto che se parlo, la prossima scheda nella cartella è la mia."), { volto: "arrabbiato" }]],
      poi: { volti: { moglie: "arrabbiato" } } }]
      : [{ id: "notte", breve: T("stanotte, nel recinto?"), testo: T("Cos'è successo stanotte, nel recinto?"),
        dice: [["MOGLIE", T("Hanno portato uno nuovo nel prefabbricato in fondo. Lo tenevano in quattro.")],
          ["MOGLIE", T("E in bacheca c'è una lista nuova: «*Sani, esposti*». Il primo nome è Serra Chiara."), { d: "lista_sani" }],
          ["MOGLIE", T("Sotto, un foglio col vostro nome. Medico 6. E una data: venerdì.")]] }]),
    { id: "marito", breve: T("tuo marito?"), testo: T("Come sta tuo marito?"),
      dice: !marito ? [["MOGLIE", T("Ce l'avete voi.")]]
        : grave(marito3) ? [["MOGLIE", T("Sta *meglio*. Ha passato una notte tranquilla."), { d: "marito_meglio", k: "parte:marito.mani" }]]
          : malato(marito3) ? [["MOGLIE", T("La febbre. Da stanotte.")], ["MOGLIE", T("Non portatelo via.")]]
            : [["MOGLIE", T("Respira male. Come sempre.")]] },
    ...(malato(moglie3) ? [{ id: "come", breve: T("come stai?"), testo: T("E tu, come stai?"),
      dice: [["MOGLIE", T("*Bene*. Ho dormito da voi, non avete visto?"), { d: "moglie_bene", k: "parte:moglie.occhi" }]] }] : []),
  ];
  if (marito) DOMANDE.marito = [
    { id: "come", breve: T("come sta?"), testo: T("Come sta?"),
      dice: righe(grave(marito3) ? ["MARITO", T("Brucio. E le dita non le sento più.")] : malato(marito3) ? ["MARITO", T("Da stanotte brucio.")]
        : ["MARITO", T("Come uno che respira col tubo.")], dittaSa ? ["MARITO", T("Senza la fiala, respiro la metà.")] : null) },
    { id: "moglie", breve: T("sua moglie?"), testo: T("E sua moglie?"),
      dice: moglie ? [["MARITO", T("Ieri sera è tornata con la faccia bianca.")], ["MARITO", T("Non mi ha detto niente. Non mi dice mai niente.")]]
        : [["MARITO", T("Ce l'avete voi. Dove lavorava.")]] },
  ];
  if (suocera) DOMANDE.suocera = [
    { id: "come", breve: T("come sta?"), testo: T("Come sta, signora?"),
      dice: suocera3 !== "sano" ? [["SUOCERA", T("Il *raffreddore*. Alla mia età."), { d: "raffreddore", k: "parte:suocera.collo" }]]
        : [["SUOCERA", T("Come una madre senza figlio.")]] },
    { id: "nuora", breve: T("la nuora?"), testo: T("E la nuora?"),
      dice: presa ? [["SUOCERA", T("Se la sono presa. Per colpa vostra.")], ["SUOCERA", T("Hanno detto: «Prelievo programmato». Come una bestia.")]]
        : nuora ? [["SUOCERA", T("È di là. Stanotte cercavano lei.")], ["SUOCERA", T("L'ho nascosta sotto il letto, come una scarpa vecchia.")]]
          : [["SUOCERA", T("Ce l'avete voi.")]] },
    { id: "paolo", breve: T("Paolo?"), testo: T("E Paolo?"),
      dice: [["SUOCERA", T("Stanotte ho sognato che bussava alla finestra. Con le nocche, come faceva da bambino.")], ["SUOCERA", T("Non ho aperto.")]] },
  ];
  if (nuora) DOMANDE.nuora = [
    { id: "come", breve: T("come stai?"), testo: T("Come stai?"), dice: [["NUORA", T("Sto bene. Sto sempre bene.")]] },
    { id: "andare", breve: T("perché vuoi andare?"), testo: T("Perché vuoi andare con loro?"),
      dice: [["NUORA", T("Se il mio sangue serve a fare la medicina, che lo prendano.")],
        ["NUORA", T("Almeno qualcuno guarisce. Almeno quello che è successo a Paolo serve a qualcosa.")]] },
  ];
  DOMANDE.sacrestano = [
    { id: "chi", breve: T("chi vive qui?"), testo: T("Chi vive in questa casa?"),
      dice: [["SACRESTANO", T("Io e mio figlio Giona. È muto, ma le campane le fa parlare lui.")],
        ["SACRESTANO", T("Mia moglie Assunta è dalla *sorella*, a valle. Da due settimane."), { d: "dalla_sorella", k: "zona:porta7" }]] },
    { id: "figlio", breve: T("tuo figlio?"), testo: T("Vostro figlio ha la febbre."),
      dice: [["SACRESTANO", T("Ha preso *freddo* sul campanile. Lassù il vento non perdona."), { d: "freddo", k: "persona:giona" }]] },
    { id: "campane", breve: T("le campane?"), testo: T("Le campane suonano anche adesso?"),
      dice: [["SACRESTANO", T("Tre volte al giorno. All'alba, a mezzogiorno, al tramonto.")], ["SACRESTANO", T("Anche adesso, con la peste. Soprattutto adesso.")]] },
    { id: "minestra", breve: T("la minestra?"), testo: T("Per chi è quella minestra?"), se: { prova: "minestra" },
      dice: [["SACRESTANO", T("Per Giona. Per dopo.")], ["GIONA", T("[scuote la testa, piano]")]] },
    { id: "rito", breve: T("perché la tenete là sotto?"), testo: T("Perché la tenete là sotto?"), se: { detta: "cripta" },
      dice: [["SACRESTANO", T("Perché si è sempre fatto così, a Malvento. Lo faceva mio nonno, nel '44.")],
        ["SACRESTANO", T("Quelli che cambiano si portano giù, coi morti di allora. Le campane li tengono buoni.")],
        ["SACRESTANO", T("Se le campane si fermano, si svegliano. Tutti quanti."), { d: "campane_buoni" }]] },
  ];
  DOMANDE.giona = [
    { id: "male", breve: T("stai male?"), testo: T("Stai male?"), dice: [["GIONA", T("[scuote la testa. Due volte]")], ["SACRESTANO", T("Vedete? Sta bene. Il freddo.")]] },
    { id: "madre", breve: T("dov'è tua madre?"), testo: T("Dov'è tua madre?"),
      dice: [["GIONA", T("[guarda il pavimento. Poi la porta della cantina]"), { k: "zona:porta7" }]] },
  ];
  DOMANDE.ada = [
    { id: "come", breve: T("come state?"), testo: T("Come state?"),
      dice: [["ADA", T("*Bene*. Tutte e due."), { d: "bene_tutte", k: "persona:lia" }], ["LIA", T("Tutte e due.")]] },
    { id: "chi", breve: T("chi è chi?"), testo: T("Chi è Ada, e chi è Lia?"),
      dice: [["ADA", T("Io sono Ada.")], ["LIA", T("Io sono Lia.")], [null, T("[una delle due ha un neo sotto l'occhio. È l'unica differenza]")]] },
    { id: "lavoro", breve: T("per chi cucite?"), testo: T("Per chi cucite?"),
      dice: [["ADA", T("Per il *paese*. Orli, vestiti da sposa, quello che capita."), { d: "per_il_paese", k: "zona:lenzuola" }]] },
    { id: "giacche", breve: T("le giacche?"), testo: T("Per chi sono quelle giacche?"), se: { prova: "giacche" },
      dice: [["ADA", T("Ne hanno ordinate cinque. Tutte della stessa misura.")], ["LIA", T("Senza nome.")], ["ADA", T("Le vengono a prendere venerdì.")]] },
  ];
  DOMANDE.lia = [
    { id: "come", breve: T("come stai?"), testo: T("E tu, come stai?"), dice: [["LIA", T("Come Ada.")], ["ADA", T("Come me. Siamo uguali, dottore. Sempre state.")]] },
  ];

  const DICHIARAZIONI = {
    // casa 3
    sta_meglio: { chi: "figlia", testo: T("«Papà oggi sta meglio.»") },
    bene_figlia: { chi: "figlia", testo: T("«Sto bene.»") },
    mamma_recinto: { chi: "figlia", testo: T("«La mamma è nel recinto.»") },
    sul_tetto: { chi: "figlia", testo: T("«Di notte la sento camminare sul tetto.»") },
    // casa 5
    uscito: { chi: "nonna", testo: T("«Luigi è uscito a cercare lavoro.»") },
    uscito_ragazza: { chi: "giovane", testo: T("«Papà è uscito.»") },
    dorme_davide: { chi: "nonna", testo: T("«Davide dorme, giù in cantina.»") },
    latte: { chi: "giovane", testo: T("«Gli portiamo il latte, giù.»") },
    bene_ragazza: { chi: "giovane", testo: T("«Sto bene.»") },
    // casa 2
    sapevano: { chi: "moglie", testo: T("«Sapevano della cartella.»") },
    lista_sani: { chi: "moglie", testo: T("«In bacheca c'è la lista dei sani esposti.»") },
    marito_meglio: { chi: "moglie", testo: T("«Mio marito sta meglio.»") },
    moglie_bene: { chi: "moglie", testo: T("«Sto bene.»") },
    // casa 10
    furgone: { chi: "suocera", testo: T("«Stanotte è venuto il furgone bianco.»") },
    raffreddore: { chi: "suocera", testo: T("«È il raffreddore.»") },
    voglio_andare: { chi: "nuora", testo: T("«Voglio andare con loro.»") },
    // casa 7
    dalla_sorella: { chi: "sacrestano", testo: T("«Mia moglie è dalla sorella, a valle.»") },
    freddo: { chi: "sacrestano", testo: T("«Giona ha preso freddo sul campanile.»") },
    chiave_parroco: { chi: "sacrestano", testo: T("«La chiave della cripta ce l'ha il parroco.»") },
    gatto: { chi: "sacrestano", testo: T("«I graffi sono del gatto.»") },
    cripta: { chi: "sacrestano", testo: T("«È sotto, nella cripta, coi morti di allora.»") },
    campane_buoni: { chi: "sacrestano", testo: T("«Le campane li tengono buoni.»") },
    // casa 4
    bene_tutte: { chi: "ada", testo: T("«Stiamo bene, tutte e due.»") },
    per_il_paese: { chi: "ada", testo: T("«Cuciamo per il paese.»") },
    dopo_carico: { chi: "ada", testo: T("«Lia scotta dal giorno dopo l'ultimo carico.»") },
  };

  const PROVE = {
    // casa 3
    caffe_freddo: { casa: "casa3", testo: T("Il caffè davanti al padre è freddo, con la pelle sopra: nessuno l'ha toccato."), breve: T("Il caffè freddo."),
      zona: ["cucina2", "tazza"] },
    padre_cambiato: { casa: "casa3", testo: T("Il padre stanotte è cambiato: seduto al suo posto, le dita entrate nel tavolo come radici."),
      breve: T("Il padre è cambiato."), parte: ["padre", "mani"] },
    finestra_rotta: { casa: "casa3", testo: T("In camera la finestra è rotta verso fuori, coi graffi sul davanzale: la madre è uscita da lì."),
      breve: T("La finestra rotta."), zona: ["camera2", "finestra"] },
    figlia_grave: { casa: "casa3", testo: T("La figlia è grave: il bubbone aperto, due dita che diventano nere."), breve: T("La figlia è grave."),
      parte: ["figlia", "mani"] },
    // casa 5
    uomo_cambiato: { casa: "casa5", testo: T("L'uomo in tuta è cambiato: altissimo, chino sotto il soffitto nell'angolo."), breve: T("L'uomo è cambiato."),
      parte: ["uomo", "mani"] },
    botola: { casa: "casa5", testo: T("Nel ripostiglio vuoto, la botola della cantina, chiusa col lucchetto."), breve: T("La botola."), zona: ["soggiorno2", "porta"] },
    respiro_sotto: { casa: "casa5", testo: T("Da sotto il pavimento, un respiro lento e un fruscio di stoffa."), breve: T("Un respiro sotto."),
      zona: ["soggiorno2", "porta"] },
    calore_sotto: { casa: "casa5", testo: T("Dal nastro: un calore tiepido sotto il pavimento, vicino alla porta. In cantina c'è qualcuno."),
      breve: T("Calore sotto il pavimento."), zona: ["soggiorno2", "porta"], ir: true },
    scodella: { casa: "casa5", testo: T("In cantina, una scodella di latte piena e una vuota, con dentro fili grigi: lo nutrono."),
      breve: T("La scodella di latte."), zona: ["cantina5", "materasso"] },
    // casa 2
    marito_grave: { casa: "casa2", testo: T("Il marito è grave: le punte delle dita diventano nere."), breve: T("Il marito è grave."), parte: ["marito", "mani"] },
    febbre_moglie: { casa: "casa2", testo: T("La moglie ha la febbre, da quando ha dormito dal medico."), breve: T("La moglie ha la febbre."),
      parte: ["moglie", "occhi"] },
    // casa 10
    suocera_malata: { casa: "casa10", testo: T("La suocera non ha il raffreddore: ha la peste."), breve: T("La suocera è malata."), parte: ["suocera", "collo"] },
    calore_camera10: { casa: "casa10", testo: T("Dal nastro: calore dietro la porta della camera. La nuora è ancora lì."), breve: T("Calore dietro la porta."),
      zona: ["cucina10", "porta10"], ir: true },
    // casa 7
    minestra: { casa: "casa7", testo: T("Sul tavolo, una minestra tiepida coperta da un piattino: non è per nessuno dei due."), breve: T("La minestra."),
      zona: ["sacrestia7", "minestra"] },
    chiave_cripta: { casa: "casa7", testo: T("Al chiodo, una chiave nera e antica, con inciso CRIPTA."), breve: T("La chiave della cripta."),
      zona: ["sacrestia7", "chiavi"] },
    sangue_corde: { casa: "casa7", testo: T("Sulle impugnature delle corde delle campane, sangue secco: qualcuno ha suonato con un braccio ferito."),
      breve: T("Sangue sulle corde."), zona: ["sacrestia7", "corde"] },
    canto: { casa: "casa7", testo: T("Da sotto la porta della cantina, un canto di donna, a bocca chiusa."), breve: T("Un canto, sotto."),
      zona: ["sacrestia7", "porta7"] },
    calore_cripta: { casa: "casa7", testo: T("Dal nastro: sotto la porta della cantina, una luce calda che trema. Giù ci sono candele accese."),
      breve: T("Candele accese, giù."), zona: ["sacrestia7", "porta7"], ir: true },
    morso: { casa: "casa7", testo: T("Sull'avambraccio di Giona, un morso umano di due giorni: non è il freddo."), breve: T("Il morso."), parte: ["giona", "mani"] },
    maschera_1630: { casa: "casa7", anche: ["casa3", "casa5", "casa2", "casa10", "casa4"],
      testo: T("Nella cripta, la maschera del medico del 1630: al posto dell'occhio destro, una lente d'ottone uguale alla tua. «Portò il malvento e qui lo tenne.»"),
      breve: T("La maschera del 1630."), zona: ["cripta7", "maschera"] },
    // casa 4
    termometro: { casa: "casa4", testo: T("Sulla macchina da cucire, un termometro ancora caldo: trentanove e due."), breve: T("Il termometro: 39,2."),
      zona: ["sartoria4", "macchina"] },
    lenzuola: { casa: "casa4", testo: T("Sulla sedia, le lenzuola delle brande del recinto, col triangolo della Panacea e una macchia che non va via."),
      breve: T("Le lenzuola del recinto."), zona: ["sartoria4", "lenzuola"] },
    giacche: { casa: "casa4", testo: T("Sui manichini, due giacche nere da funerale, uguali, senza nome."), breve: T("Le giacche da funerale."),
      zona: ["sartoria4", "manichini"] },
    febbre_lia: { casa: "casa4", testo: T("Lia ha la febbre da ieri: trentanove e due, sotto la cipria."), breve: T("Lia ha la febbre."), parte: ["lia", "occhi"] },
    peste_lenzuola: { casa: "casa4", anche: ["casa2"],
      testo: T("Lia si è ammalata rammendando le lenzuola delle brande del recinto: la peste esce dalla ditta, nelle lenzuola."),
      breve: T("La peste nelle lenzuola."), zona: ["sartoria4", "lenzuola"] },
  };

  // ---------- le contestazioni ----------
  const CONTESTAZIONI = [
    // casa 3: il padre non sta meglio; la madre non e' nel recinto; la figlia non sta bene
    ...(padre && figlia ? [{ id: "sta_meglio",
      coppie: [[["d:sta_meglio"], ["persona:padre", "parte:padre.occhi", "parte:padre.bocca", "parte:padre.collo", "parte:padre.mani",
        "p:caffe_freddo", "zona:tazza"]], [["p:caffe_freddo"], ["persona:figlia"]]],
      dice: [["TU", T("Non sta meglio. Non è più lui.")], ["FIGLIA", T("[piange]"), { volto: "piange" }],
        ["FIGLIA", T("Ieri sera si è seduto al suo posto e non si è più alzato."), { volto: "piange" }],
        ["FIGLIA", T("Stanotte ho sentito il tavolo scricchiolare. Tutta la notte."), { volto: "piange" }],
        ["FIGLIA", T("Stamattina gli ho fatto il caffè. Come sempre. Se si sveglia, lo trova caldo."), { volto: "piange" }]],
      poi: { prova: "padre_cambiato", volti: { figlia: "piange" } } }] : []),
    ...(madreUscita && figlia ? [{ id: "mamma_recinto", coppie: [[["d:mamma_recinto"], ["p:finestra_rotta", "zona:finestra"]],
      [["p:finestra_rotta"], ["persona:figlia"]]],
      dice: [["TU", T("Tua madre non è nel recinto. È uscita da quella finestra.")], ["FIGLIA", T("[piange]"), { volto: "piange" }],
        ["FIGLIA", T("L'altra notte. Ho sentito il vetro, poi le tegole."), { volto: "piange" }],
        ["FIGLIA", T("Adesso la sento di notte, sopra la cucina. Cammina sul *tetto*."), { d: "sul_tetto", volto: "piange" }]],
      poi: { volti: { figlia: "piange" } } }] : []),
    ...(grave(figlia3) ? [{ id: "bene_figlia", coppie: [[["d:bene_figlia"], ["parte:figlia.occhi", "parte:figlia.collo", "parte:figlia.mani"]]],
      dice: [["TU", T("Non stai bene. Stai come tuo padre due giorni fa.")], ["FIGLIA", T("Lo so.")],
        ["FIGLIA", padre ? T("Se mi portate via, chi gli fa il caffè?") : T("Se mi portate via, la casa resta vuota.")]],
      poi: { prova: "figlia_grave" } }] : []),
    // casa 5: l'uomo non e' uscito
    ...(uomo && (nonna || giovane) ? [{ id: "uscito",
      coppie: [[["d:uscito", "d:uscito_ragazza"], ["persona:uomo", "parte:uomo.occhi", "parte:uomo.bocca", "parte:uomo.collo", "parte:uomo.mani"]]],
      dice: righe(["TU", T("Non è uscito. È lì, nell'angolo.")],
        nonna ? ["NONNA", T("Non guardatelo. Se non lo guardate, sta buono.")] : ["RAGAZZA", T("Non guardatelo!")],
        nonna ? ["NONNA", T("Stanotte è cresciuto. Ha battuto la testa sul soffitto fino all'alba.")] : null,
        nonna ? ["NONNA", T("Era il mio bambino. È ancora lì dentro, da qualche parte.")] : ["RAGAZZA", T("[si copre la faccia con le mani]")]),
      poi: { prova: "uomo_cambiato" } }] : []),
    ...(malato(giovane3) ? [{ id: "bene_ragazza", coppie: [[["d:bene_ragazza"], ["parte:giovane.occhi"]]],
      dice: [["TU", T("Hai la febbre.")], ["RAGAZZA", T("Da stamattina.")], ["RAGAZZA", T("Ho dormito da voi. Come tutti quelli che dormono da voi.")]] }] : []),
    // casa 2: il marito non sta meglio; la moglie ha la febbre
    ...(grave(marito3) && moglie ? [{ id: "marito_meglio", coppie: [[["d:marito_meglio"], ["parte:marito.mani", "parte:marito.collo", "parte:marito.occhi"]]],
      dice: [["TU", T("Non sta meglio. Le dita diventano nere.")], ["MOGLIE", T("Lo so."), { volto: "nervoso" }],
        ["MOGLIE", T("Se lo portate nel recinto, lo mettono nel prefabbricato in fondo. Lo so dove finiscono."), { volto: "nervoso" }],
        ["MOGLIE", T("Lasciatemelo un altro giorno."), { volto: "nervoso" }]],
      poi: { prova: "marito_grave", volti: { moglie: "nervoso" } } }] : []),
    ...(malato(moglie3) ? [{ id: "moglie_bene", coppie: [[["d:moglie_bene"], ["parte:moglie.occhi"]]],
      dice: [["TU", T("Hai la febbre.")], ["MOGLIE", T("Da stamattina. Dopo la notte da voi."), { volto: "nervoso" }],
        ["MOGLIE", T("Adesso al recinto non mi fanno più entrare. Mi mettono dall'altra parte del vetro."), { volto: "nervoso" }]],
      poi: { prova: "febbre_moglie", volti: { moglie: "nervoso" } } }] : []),
    // casa 10: non e' il raffreddore
    ...(suocera && suocera3 !== "sano" ? [{ id: "raffreddore", coppie: [[["d:raffreddore"], ["parte:suocera.collo", "parte:suocera.occhi", "parte:suocera.mani"]]],
      dice: [["TU", T("Non è il raffreddore.")], ["SUOCERA", T("Lo so cos'è."), { volto: "piange" }],
        ["SUOCERA", T("Il malvento è entrato anche da me. Va bene così."), { volto: "piange" }],
        ["SUOCERA", nuora ? T("Ma lei no. Lei non me la toccate.") : T("Adesso almeno raggiungo Paolo."), { volto: "piange" }]],
      poi: { prova: "suocera_malata", volti: { suocera: "piange" } } }] : []),
    // casa 7: non e' il freddo; la moglie non e' a valle; la chiave non ce l'ha il parroco; non e' il gatto
    { id: "freddo", coppie: [[["d:freddo"], ["parte:giona.mani", "p:sangue_corde", "zona:corde"]], [["p:sangue_corde"], ["persona:giona"]]],
      dice: [["TU", T("Non è il freddo. Giona ha un morso sul braccio.")], ["SACRESTANO", T("[si fa il segno della croce]")],
        ["SACRESTANO", T("Giona le porta da mangiare. Ieri sera lei aveva fame."), { volto: "piange" }],
        ["GIONA", T("[si tira giù la manica. Piange senza fare rumore]"), { volto: "piange" }]],
      poi: { prova: "morso", volti: { sacrestano: "piange", giona: "piange" } } },
    { id: "dalla_sorella",
      coppie: [[["d:dalla_sorella"], ["p:canto", "p:minestra", "p:morso", "p:calore_cripta", "zona:porta7"]],
        [["p:canto", "p:calore_cripta"], ["persona:sacrestano"]]],
      dice: [["TU", T("Vostra moglie non è a valle.")], ["SACRESTANO", T("[le chiavi gli tremano in mano]"), { volto: "piange" }],
        ["SACRESTANO", T("È sotto. Nella *cripta*. Coi morti di allora."), { d: "cripta", k: "zona:porta7", volto: "piange" }],
        ["SACRESTANO", T("Dieci giorni fa si è addormentata. Si è svegliata così."), { volto: "piange" }],
        ["SACRESTANO", T("Scendete pure, se dovete. Ma non toccatela."), { volto: "piange" }]],
      poi: { sblocca: "porta7", volti: { sacrestano: "piange" } } },
    { id: "chiave_parroco", coppie: [[["d:chiave_parroco"], ["p:chiave_cripta", "zona:chiavi"]]],
      dice: [["TU", T("Il parroco? La chiave è qui, al vostro chiodo.")], ["SACRESTANO", T("Il parroco è scappato in città il primo giorno, dottore.")],
        ["SACRESTANO", T("Le chiavi della chiesa le ho io. Tutte.")]] },
    { id: "gatto", coppie: [[["d:gatto"], ["p:morso", "p:canto", "parte:giona.mani"]]],
      dice: [["TU", T("Non avete un gatto.")], ["SACRESTANO", T("No."), { volto: "piange" }], ["SACRESTANO", T("Ieri sera mi ha preso la mano, quando le ho dato la minestra."), { volto: "piange" }],
        ["SACRESTANO", T("Aveva le mani calde. Come una volta."), { volto: "piange" }]],
      poi: { volti: { sacrestano: "piange" } } },
    // casa 4: non state bene tutte e due; non cucite per il paese
    { id: "uguali", coppie: [[["d:bene_tutte"], ["parte:lia.occhi", "p:termometro", "zona:macchina"]], [["p:termometro"], ["persona:lia", "persona:ada"]]],
      dice: [["TU", T("Non state bene tutte e due. Lia ha la febbre.")], ["ADA", T("[guarda la sorella]"), { volto: "piange" }],
        ["LIA", T("Trentanove e due. Da ieri."), { volto: "piange" }],
        ["ADA", T("Se lo sa la ditta, ci separano. Lei nel recinto, io... non lo so."), { volto: "piange" }],
        ["LIA", T("Non siamo mai state separate. Mai. Nemmeno un giorno."), { volto: "piange" }],
        [null, T("Adesso Lia si lascia guardare.")]],
      poi: { prova: "febbre_lia", volti: { ada: "piange", lia: "piange" } } },
    { id: "per_il_paese", coppie: [[["d:per_il_paese"], ["p:lenzuola", "p:giacche", "zona:lenzuola", "zona:manichini"]]],
      dice: [["TU", T("Non cucite per il paese. Cucite per la Panacea.")], ["ADA", T("Le lenzuola delle brande. Ce le porta un furgone bianco, il martedì.")],
        ["LIA", T("Cinque euro al pezzo. Le laviamo e le rammendiamo.")],
        ["ADA", T("Lia scotta dal giorno dopo l'ultimo *carico*."), { d: "dopo_carico" }]],
      poi: { prova: "peste_lenzuola" } },
  ];

  const REAZIONI = {
    padre: { _: [[null, T("[non si muove. Il tavolo scricchiola]")]] },
    figlia: { _: [["FIGLIA", T("[scuote la testa]")]] },
    uomo: { _: [[null, T("[la testa batte piano contro il soffitto]")]] },
    giovane: { _: [["RAGAZZA", T("[silenzio]")]] },
    nonna: { _: [["NONNA", T("Eh? Parli più forte, con quel becco.")]] },
    ragazzo: { _: [[null, T("[non risponde. Respira]")]] },
    moglie: { _: [["MOGLIE", T("E allora?")]] },
    marito: { _: [["MARITO", T("[tossisce]")]] },
    suocera: { _: [["SUOCERA", T("Non capisco cosa volete da me.")]] },
    nuora: { _: [["NUORA", T("[non ti guarda]")]] },
    sacrestano: { _: [["SACRESTANO", T("Il Signore vi perdoni, dottore. Io non capisco.")]], maschera_1630: [["SACRESTANO", T("Il medico di allora. Dorme là sotto da quattrocento anni.")],
      ["SACRESTANO", T("Mio nonno diceva che un giorno sarebbe tornato a prendersi quello che è suo.")]] },
    giona: { _: [["GIONA", T("[ti guarda, e non capisce]")]] },
    assunta: { _: [[null, T("[il canto non si ferma]")]] },
    ada: { _: [["ADA", T("Non capiamo.")], ["LIA", T("Non capiamo.")]] },
    lia: { _: [["LIA", T("Chiedetelo ad Ada.")]] },
  };
  // la maschera del 1630 messa davanti agli altri
  REAZIONI.figlia.maschera_1630 = [["FIGLIA", T("La nonna diceva che il medico porta il malvento.")], ["FIGLIA", T("Pensavo fosse una favola.")]];
  REAZIONI.nonna.maschera_1630 = [["NONNA", T("Ve l'avevo detto, il primo giorno. La peste arriva col medico.")]];
  REAZIONI.moglie.maschera_1630 = [["MOGLIE", T("Medico 6. Medico 1. Ce ne sono stati altri, prima di voi.")]];
  REAZIONI.ada.maschera_1630 = [["ADA", T("La stessa lente.")], ["LIA", T("La stessa lente.")]];

  const ANNOTA = {
    // casa 3
    "d:sta_meglio": { padre: T("«sta meglio» (la figlia)") },
    "p:caffe_freddo": { padre: T("il caffè davanti a lui è freddo: non mangia più") },
    "p:padre_cambiato": { padre: { testo: T("cambiato stanotte, seduto al suo posto: le dita entrate nel tavolo come radici"), barra: "d:sta_meglio", morto: true } },
    "d:mamma_recinto": { madre: T("«nel recinto» (la figlia)") },
    "p:finestra_rotta": { madre: { testo: T("uscita dalla finestra della camera, cambiata: cammina sui tetti"), barra: "d:mamma_recinto", morto: true } },
    "d:sul_tetto": { madre: { testo: T("di notte cammina sul tetto, sopra la cucina"), barra: "d:mamma_recinto", morto: true } },
    "d:bene_figlia": { figlia: T("«sto bene»") },
    "p:figlia_grave": { figlia: { testo: T("grave: il bubbone aperto, le dita che diventano nere"), barra: "d:bene_figlia" } },
    // casa 5
    "d:uscito": { uomo: T("«uscito a cercare lavoro» (la madre)") },
    "d:uscito_ragazza": { uomo: T("«è uscito» (la figlia)") },
    "p:uomo_cambiato": { uomo: { testo: T("cambiato: altissimo, chino sotto il soffitto nell'angolo"), barra: ["d:uscito", "d:uscito_ragazza"], morto: true } },
    "d:dorme_davide": { ragazzo: T("«dorme giù in cantina, fa il bozzolo» (la nonna)") },
    "d:latte": { ragazzo: T("gli portano il latte in cantina (la sorella)") },
    "p:botola": { ragazzo: T("la botola della cantina, chiusa col lucchetto") },
    "p:respiro_sotto": { ragazzo: T("un respiro lento sotto il pavimento") },
    "p:calore_sotto": { ragazzo: T("il nastro all'infrarosso: tiepido, sotto il pavimento") },
    "p:scodella": { ragazzo: { testo: T("cambiato in cantina: un bozzolo di fili appeso alla trave. Lo nutrono col latte"), barra: "anagrafe", morto: true } },
    "d:bene_ragazza": { giovane: T("«sto bene»") },
    // casa 2
    "d:sapevano": { moglie: T("la ditta sapeva della cartella: le hanno tolto il permesso") },
    "d:lista_sani": { moglie: T("nel recinto c'è la lista dei «sani, esposti»: il primo nome è Serra Chiara") },
    "d:marito_meglio": { marito: T("«sta meglio» (la moglie)") },
    "p:marito_grave": { marito: { testo: T("grave: le dita diventano nere"), barra: "d:marito_meglio" } },
    "d:moglie_bene": { moglie: T("«sto bene»") },
    "p:febbre_moglie": { moglie: { testo: T("ha la febbre, dopo la notte dal medico"), barra: "d:moglie_bene" } },
    // casa 10
    "d:furgone": { nuora: T("stanotte il furgone bianco della ditta se l'è presa (la suocera)") },
    "d:raffreddore": { suocera: T("«è il raffreddore»") },
    "p:suocera_malata": { suocera: { testo: T("ha la peste, non il raffreddore"), barra: "d:raffreddore" } },
    "d:voglio_andare": { nuora: T("vuole andare con la ditta: «se il mio sangue serve, che lo prendano»") },
    "p:calore_camera10": { nuora: T("il nastro all'infrarosso: è ancora dietro la porta") },
    // casa 7
    "d:dalla_sorella": { assunta: T("«dalla sorella, a valle» (il marito)") },
    "p:canto": { assunta: T("un canto di donna sotto la porta della cantina") },
    "p:minestra": { assunta: T("una minestra tiepida, per qualcuno che non c'è") },
    "p:calore_cripta": { assunta: T("il nastro all'infrarosso: candele accese sotto la porta della cantina") },
    "d:cripta": { assunta: { testo: T("nella cripta sotto la chiesa, cambiata: la tiene lì il marito"), barra: ["d:dalla_sorella", "anagrafe"], morto: true },
      sacrestano: T("tiene la moglie cambiata nella cripta, come si è sempre fatto") },
    "d:campane_buoni": { sacrestano: T("«le campane li tengono buoni»"), giona: T("suona le campane per tenerli buoni") },
    "d:freddo": { giona: T("«ha preso freddo sul campanile» (il padre)") },
    "p:morso": { giona: { testo: T("un morso sul braccio: le porta da mangiare"), barra: "d:freddo" } },
    "p:sangue_corde": { giona: T("sangue sulle corde delle campane: suona col braccio ferito") },
    "d:chiave_parroco": { sacrestano: T("«la chiave ce l'ha il parroco»") },
    "p:chiave_cripta": { sacrestano: { testo: T("ha lui la chiave della cripta"), barra: "d:chiave_parroco" } },
    "d:gatto": { sacrestano: T("«i graffi sono del gatto»") },
    "p:maschera_1630": { assunta: T("nella cripta, la maschera del medico del 1630, con la tua lente") },
    // casa 4
    "d:bene_tutte": { ada: T("«stiamo bene tutte e due»"), lia: T("«stiamo bene tutte e due» (la sorella)") },
    "p:termometro": { lia: T("un termometro a 39,2 sulla macchina da cucire") },
    "p:febbre_lia": { lia: { testo: T("ha la febbre da ieri, sotto la cipria"), barra: "d:bene_tutte" } },
    "d:per_il_paese": { ada: T("«cuciamo per il paese»") },
    "p:lenzuola": { ada: T("rammendano le lenzuola delle brande del recinto"), lia: T("rammendano le lenzuola delle brande del recinto") },
    "p:peste_lenzuola": { lia: { testo: T("si è ammalata rammendando le lenzuola del recinto"), barra: "d:per_il_paese" },
      ada: { testo: T("cuce per la Panacea, non per il paese"), barra: "d:per_il_paese" } },
    "d:dopo_carico": { lia: T("scotta dal giorno dopo l'ultimo carico di lenzuola") },
    "p:giacche": { ada: T("cuce giacche da funerale per la ditta, senza nome") },
  };

  // lo stato di famiglia: le righe di ieri, coi timbri della ditta per chi e' andato al lazzaretto ieri; le case nuove
  const ANAGRAFE = copia(G2.ANAGRAFE);
  for (const A of Object.values(ANAGRAFE)) for (const r of A.righe) {
    if (via2.has(r.persona)) r.ditta = T("AL LAZZARETTO DAL 27.10");
    if (presa && r.persona === "nuora") Object.assign(r, { ditta: T("PRELEVATA DALLA DITTA IL 28.10"), prelevata: true });
  }
  ANAGRAFE.casa7 = { via: T("Via della Chiesa 2"), righe: [
    { persona: "sacrestano", nome: T("BARBIERI ANSELMO"), ruolo: T("intestatario"), nato: 1952, mestiere: T("sacrestano") },
    { persona: "assunta", nome: T("COLOMBO ASSUNTA"), ruolo: T("moglie"), nato: 1956, mestiere: T("casalinga"), donna: true },
    { persona: "giona", nome: T("BARBIERI GIONA"), ruolo: T("figlio"), nato: 1983, mestiere: T("campanaro") },
  ] };
  ANAGRAFE.casa4 = { via: T("Vicolo Stretto 1"), righe: [
    { persona: "ada", nome: T("DE ROSA ADA"), ruolo: T("intestataria"), nato: 1990, mestiere: T("sarta"), donna: true, segni: T("neo sotto l'occhio destro") },
    { persona: "lia", nome: T("DE ROSA LIA"), ruolo: T("sorella dell'intestataria"), nato: 1990, mestiere: T("sarta"), donna: true },
  ] };
  // la verita' su chi oggi non si incontra
  const ALTRI = { ...copia(G2.ALTRI), ...(madreUscita ? { madre: { stato: "mostro" } } : {}),
    ...Object.fromEntries([...via2].map((id) => [id, { stato: "lazzaretto" }])), ...(presa ? { nuora: { stato: "lazzaretto" } } : {}) };

  const CACCIATA = {
    casa3: righe(figlia ? ["FIGLIA", T("Andate via! Lasciatelo stare!")] : null, [null, T("Ti chiudono la porta alle spalle.")]),
    casa5: righe(nonna ? ["NONNA", T("Fuori, becco. Lo svegliate.")] : giovane ? ["RAGAZZA", T("Andate via!")] : null, [null, T("Ti chiudono la porta alle spalle.")]),
    casa2: righe(moglie ? ["MOGLIE", T("Fuori. Avete già fatto abbastanza."), { volto: "arrabbiato" }] : ["MARITO", T("Fuori.")], [null, T("La porta si chiude.")]),
    casa10: righe(suocera ? ["SUOCERA", T("Fuori da casa mia."), { volto: "arrabbiato" }] : ["NUORA", T("Andate via.")], [null, T("Senti girare la chiave.")]),
    casa7: [["SACRESTANO", T("Fuori dalla casa di Dio, dottore.")], [null, T("Dietro di te, le campane cominciano a suonare.")]],
    casa4: [["ADA", T("Fuori.")], ["LIA", T("Fuori.")], [null, T("Chiudono la porta insieme.")]],
  };

  // la mappa: le sei case del fax, coi biglietti di oggi
  const CASE = Object.fromEntries(Object.entries(D1.CASE).map(([id, k]) => [id, { ...k }]));
  CASE.casa3.luogo = "cucina2";
  CASE.casa3.segnalata = padre ? T("Un vicino: «Il meccanico è seduto a tavola da ieri sera. Non si alza nemmeno per aprire.»")
    : madreUscita ? T("Un vicino: «Stanotte camminavano sul tetto. Sopra la casa del meccanico.»") : T("Un vicino: «La ragazza è rimasta sola.»");
  CASE.casa5.luogo = "soggiorno2";
  CASE.casa5.segnalata = uomo ? T("Biglietto anonimo: «Dalla finestra si vede uno altissimo, in piedi nell'angolo. Non si muove mai.»")
    : T("Biglietto anonimo: «In cantina tengono qualcosa. Gli portano il latte.»");
  CASE.casa2.luogo = "monolocale";
  CASE.casa2.segnalata = dittaSa ? T("Un vicino: «Stanotte la ditta è venuta da Galli. Hanno portato via una scatola.»")
    : T("Un vicino: «La moglie di Galli è tornata dal turno di corsa. Piangeva.»");
  CASE.casa10.luogo = "cucina10";
  CASE.casa10.segnalata = presa ? T("Un vicino: «Stanotte il furgone bianco è entrato in Vicolo Stretto. Si è fermato dalla vedova.»")
    : T("Biglietto anonimo: «Quelli della ditta chiedevano della vedova Serra, porta a porta.»");
  CASE.casa7.luogo = "sacrestia7";
  CASE.casa7.segnalata = T("Un vicino: «Il parroco è partito. Le campane suonano a ore strane, e di notte dalla chiesa qualcuno canta.»");
  CASE.casa4.luogo = "sartoria4";
  CASE.casa4.segnalata = T("Un vicino: «Le gemelle De Rosa non escono da due giorni. Una delle due tossisce, ma non si sa quale.»");

  // l'ospite della terza notte. Chi dorme solo vede la cosa nera un passo piu' vicina per ogni notte che ha gia'
  // dormito solo: alla terza notte da solo su tre, la cosa nera lo porta nella stanzetta
  const OSPITE = copia(G2.OSPITE);
  const soli = [ieri.ospite, ospite2].filter((o) => !o).length;
  // la moglie senza permesso non va piu' al recinto; la nuora senza la suocera non ha da chi nascondersi
  if (dittaSa) Object.assign(OSPITE.moglie, {
    arriva: T("La moglie di Galli è venuta con te. «Tanto al recinto non mi fanno più entrare», ha detto. Aspetta nella stanzetta, vestita."),
    mattina: T("La moglie di Galli. Non ha dormito: sul nastro, alle tre, legge il tuo fax. Aveva la fronte calda."),
  });
  if (!suocera) Object.assign(OSPITE.nuora, {
    arriva: T("La nuora è venuta con te. A casa non l'aspetta più nessuno. Ha portato la sua candeggina. Dorme nella stanzetta."),
    mattina: T("La nuora, che a casa non ha più nessuno. Sul nastro lava il pavimento attorno al tuo letto. La fronte non scotta: è l'unica."),
  });
  if (soli === 0) OSPITE.solo = copia(D1.OSPITE.solo);
  else if (soli === 2) OSPITE.solo = {
    arriva: T("Stanotte dormi solo, per la terza volta. Dicono che alla terza il malvento ti porta via."),
    controllo: [[null, T("Il buio della stanzetta. La brandina è vuota, la coperta piegata.")], [null, T("Sul cuscino, l'incavo di una testa. Non è la tua.")]],
    nastro: [T("[la stanza al buio. Il medico dorme]"), T("[la cosa nera è seduta sul letto, come ieri notte]"),
      T("[adesso il letto è vuoto. La cosa nera ti porta nella stanzetta, avvolto nella coperta]")],
    immagini: ["notte_dorme", "notte_solo_3", "notte_solo_4"],
    mattina: T("Ti sei svegliato nella stanzetta, sulla brandina. Sul nastro la cosa nera ti porta di là, in braccio, come un bambino. Il malvento ti ha preso, e ti ha lasciato andare."),
  };

  // quello che arriva dai giorni prima (le zone e gli esami copiati) non mette sul nastro frasi e prove che oggi
  // non ci sono (l'orto della suocera, la fede della nuora, il termosifone della casa 5)
  const pulisci = (rr) => { for (const r of rr || []) if (r[2]?.d && !DICHIARAZIONI[r[2].d]) delete r[2].d; };
  for (const L of Object.values(LUOGHI)) for (const z of L.zone) {
    pulisci(z.dice);
    if (z.poi?.prova && !PROVE[z.poi.prova]) delete z.poi;
  }
  for (const E of Object.values(ESAMI)) for (const e of Object.values(E)) { pulisci(e.dice); pulisci(e.rifiuta); }

  return {
    PERSONE, VOCI, NASCOSTI: {}, LUOGHI, ARRIVO, PORTE, ESAMI, DOMANDE, DICHIARAZIONI, PROVE, CONTESTAZIONI, REAZIONI, ANNOTA,
    ANAGRAFE, ALTRI, CACCIATA, CASE, OSPITE,
    SOLDI: { ...D1.SOLDI, paziente: 500, profilo: 800 },
    // il protocollo: i segni di ieri; il profilo adesso sono i sani esposti al contagio (chi non si ammala)
    FAX: {
      giorno: 3, case: [3, 5, 2, 10, 7, 4],
      segni: copia(G2.FAX.segni),
      profilo: T("sani, esposti al contagio"),
      motto: T("Chi non si ammala è un dono. I doni si condividono."),
    },
    INTRO: [[null, T("Giorno 3. Il fax è arrivato prima dell'alba. Adesso la ditta cerca i sani.")],
      [null, T("Le case di ieri sono di nuovo sulla lista, e due case nuove: la 7, accanto alla chiesa, e la 4, nel vicolo.")]],
  };
}

// la verita' del terzo giorno, per la fine della bozza
export function verita3(ieri) {
  const G = giorno3(ieri);
  const P = G.PERSONE;
  const stato = { sano: T("sana"), malato: T("malata"), grave: T("grave") };
  const t = [];
  const ieri2 = giorno2(ieri).PERSONE;
  t.push(T`Casa 3: ${P.padre ? T("il padre stanotte era cambiato: il radicato, seduto al suo posto, con le dita nel tavolo") : T("il padre era nel recinto")}. `
    + `${ieri2.madre ? T("La madre, cambiata il giorno prima, era uscita dalla finestra: di notte cammina sui tetti di Via della Chiesa. ") : ""}`
    + (P.figlia ? T`La figlia era ${stato[P.figlia.stato]}.` : T("La figlia era nel recinto.")));
  t.push(T`Casa 5: ${P.uomo ? T("l'uomo era cambiato: l'allungato, nell'angolo, chino sotto il soffitto. ") : T("L'uomo era nel recinto. ")}`
    + T("Davide era cambiato in cantina: il bozzolo. La famiglia lo nutriva col latte. ")
    + (P.giovane ? T`La ragazza era ${stato[P.giovane.stato]}. ` : "") + (P.nonna ? T`La nonna era ${stato[P.nonna.stato]}.` : ""));
  t.push(T("Casa 2: ") + (P.marito ? T`il marito era ${{ sano: T("sano"), malato: T("malato"), grave: T("grave") }[P.marito.stato]}. ` : T("il marito era nel recinto. "))
    + (P.moglie ? T`La moglie era ${stato[P.moglie.stato]}.` : T("La moglie era nel recinto."))
    + (ieri.scritto?.includes("moglie:p:cartella") ? T(" La ditta aveva letto della cartella sul tuo stato di famiglia.") : ""));
  t.push(T("Casa 10: ") + (P.suocera ? T`la suocera era ${stato[P.suocera.stato]}. ` : T("la suocera era nel recinto. "))
    + (P.nuora ? T("La nuora non si ammala.") : G.ANAGRAFE.casa10.righe.find((r) => r.persona === "nuora")?.prelevata
      ? T("La nuora l'aveva presa la ditta, di notte: l'avevi scritto tu che non si ammala.") : T("La nuora era nel recinto.")));
  t.push(T`Casa 7: Assunta Colombo era cambiata dieci giorni prima: la santa di cera. Il sacrestano la teneva nella cripta, come si è sempre fatto a Malvento, e Giona le portava da mangiare: il morso era suo, e anche la febbre. Il sacrestano era ${P.sacrestano.stato === "sano" ? T("sano") : T("malato")}.`);
  t.push(T`Casa 4: Lia aveva la febbre e un bubbone sotto l'ascella: si era ammalata rammendando le lenzuola delle brande del recinto. Ada era ${stato[P.ada.stato]}.`);
  t.push(T("Nella cripta c'è la maschera del medico del 1630, con la tua stessa lente: il medico di allora portò il malvento. Il medico è la peste."));
  t.push(T("Quello che scrivi sullo stato di famiglia, la ditta lo legge. Il terzo giorno cercava i sani esposti al contagio: per il vaccino, o per le prove."));
  return t;
}

// il giornale del quarto giorno, dopo la terza notte (n: calcolaNotte di gioco.js; oggi: lo stato del terzo giorno)
export function giornale4(n, oggi) {
  const presi = n.portati;
  const sempreSolo = !n.ospite && !oggi.ieri?.ospite && !oggi.ieri?.ospite2;
  let titolo = T("Il terzo giorno del medico");
  let sommario = T("Sei case sulla lista della ditta. In paese si contano le porte chiuse.");
  if (presi.includes("giona")) {
    titolo = T("Le campane mute");
    sommario = T("Stamattina il campanile non ha suonato. Il sacrestano piangeva sul sagrato. Di notte, dalla chiesa, un canto.");
  } else if (presi.includes("lia") && presi.includes("ada")) {
    titolo = T("Le gemelle De Rosa nel recinto");
    sommario = T("Portate via insieme. «Non si sono lasciate la mano nemmeno sul furgone», dice un vicino.");
  } else if (presi.includes("lia")) {
    titolo = T("Separate le gemelle De Rosa");
    sommario = T("Lia nel recinto, Ada sulla porta di casa. È rimasta lì tutta la notte.");
  } else if (presi.includes("nuora")) {
    titolo = T("La vedova Serra nel recinto");
    sommario = T("«Si è offerta lei», dice la Panacea. La suocera non apre più a nessuno.");
  } else if (sempreSolo) {
    titolo = T("Il medico cammina di notte");
    sommario = T("Lo hanno visto passare per Via della Chiesa alle tre, senza maschera. «La faccia non l'ha vista nessuno.»");
  } else if (n.contagiate.length) {
    titolo = T("La peste non si ferma");
    sommario = T`Nuovi malati nelle case ${n.contagiate.map((c) => D1.CASE[c].n).join(", ")}.`;
  }
  const umore = n.fiducia >= 60 ? T("«È l'unico che entra nelle case», dicono al bar.")
    : n.fiducia >= 35 ? T("Al bar, quando passa il medico, si smette di parlare.")
      : T("Stanotte qualcuno ha inchiodato una croce di legno alla porta della stanza del medico.");
  return {
    testata: T("LA VOCE"), data: T("Foglio del paese · giovedì 29 ottobre"), titolo, sommario, articolo: umore,
    lettera: sempreSolo ? T("«Tre notti da solo. Il malvento l'ha preso e l'ha rimesso giù. Adesso è dei suoi.» Lettera non firmata.")
      : T("«Quelli che cambiano non muoiono. Aspettano.» Lettera non firmata."),
    breve: T("La Panacea annuncia la consegna di cinque divise nuove per il personale del recinto."),
    pubblicita: T("PANACEA · Il vostro sangue vale. Donatelo a chi se lo merita."),
    didascalia: T("Il medico, ieri, sulla porta della sacrestia."),
  };
}
