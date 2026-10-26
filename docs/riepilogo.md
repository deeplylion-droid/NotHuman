# Riepilogo del progetto

Ultimo aggiornamento: 26 ottobre 2026.

## Obiettivo

Un gioco originale da vendere su Steam, nel filone dei giochi di ispezione e paranoia: *No, I'm Not a Human* (NINAH), *That's Not My Neighbor*, *Papers, Please*.

## Decisioni prese

- **Riferimento principale: NINAH.** È il preferito dei tre e vogliamo il suo "feel" grafico, ma il gioco non deve somigliargli troppo.
- **Candidato unico, per ora: il Medico della peste.** Ospedale, Barbiere e Confessionale sono accantonati.
- **Ambientazione: moderna.** Case povere di oggi in un paese sperduto dove la peste è tornata. Il villaggio rurale è accantonato.
- **Ambientazione italiana: accantonata** per ora.
- **Lo stile grafico è definitivo** (26 ottobre):
  - **Stanza:** foto con lo stile 07 fumetto underground al 20%, come nella combinazione 02 (`art/prove-stile/06-cucina`). Del fumetto si vuole solo un accenno: niente elementi in più che confondano lo sfondo (intonaco scrostato, crepe, macchie), quindi il 20% si prende dalla stanza a fumetto ripulita (26 ottobre). **Il 20% è confermato** (26 ottobre): fa più contrasto con i personaggi. Scartati il 30%, il 40% e la stanza tutta in foto (vedi "Scene fatte").
  - **Personaggi grotteschi ma ammorbiditi, quasi fotografici** (scelta del 26 ottobre): `art/prove-stile/11-personaggi-50/c_ammorbiditi_sfondo20.jpg`. Hanno preso il posto dei personaggi a fumetto al 100%. Metodo in "Personaggi ammorbiditi".
  - **Tre filtri finali, tutti tenuti** (26 ottobre): **VHS** per il giorno, **VHS verde** per la notte e le scene al buio, **VHS infrarosso** (rosso tendente al rosa, più scuro e più tenue del verde). Come usarli nel gioco si decide più avanti; per l'infrarosso c'è l'idea degli indizi (vedi "Il Medico della peste"). Filtri in `tools/filtri.py` (prove in `art/prove-stile/08-filtri`), confronto sulle due stanze in `art/scene/foglio_scene_filtri.jpg`. **VHS al 50% di intensità** (26 ottobre): i difetti della videocassetta sono a metà, il colore dei filtri resta pieno (`VHS_AMOUNT` in `tools/filtri.py`; nell'anteprima animata è il valore di partenza). **Senza la banda di disturbo grossa** che scorreva sull'immagine: tolta il 26 ottobre, sia dal filtro fisso sia da quello animato. Le prove in `art/prove-stile` sono di prima: hanno ancora la banda e il VHS al 100%. **Di giorno, nelle case, la luce della videocamera** (scelta il 26 ottobre tra le proposte di `art/prove-stile/15-giorno`, per nascondere l'aspetto "da AI" che di giorno si vedeva troppo): la stanza è buia e la illumina solo la lampada della videocamera, quindi il centro è chiaro, i bordi sprofondano nel buio, le luci bruciano e i neri si chiudono. Nel gioco è nello shader del VHS (`u_luce` in `gioco/js/vhs.js`: accesa nelle visite e nei nastri di giorno, spenta su scrivania, mappa, notte e infrarosso); per le immagini ferme è in `tools/filtri.py` (`luce_videocamera`, dentro il filtro `vhs`).
  - **Il VHS sarà animato**, calcolato in tempo reale (uno shader): grana e tremolio delle righe a ogni fotogramma, il rumore della testina in fondo, uno strappo ogni tanto, e uno strappo più forte quando si cambia filtro. Anteprima sul soggiorno con i tre filtri e intensità regolabile: https://claude.ai/artifact/RU45gcnW8J3ttttUTSde2R (copia in `art/prove-stile/09-vhs-animato`; lo shader WebGL è la base per quello del gioco).
- **Per ora niente mano e bastone del medico sullo schermo** (26 ottobre): non piacciono. Le scene si fanno senza (`"mano": false` in `scena.json`, il valore di base).
- **Meccaniche e interfaccia:** decise il 26 ottobre, vedi "Meccaniche e interfaccia".
- **Motore: tecnologie web** (26 ottobre). Il gioco gira in un browser e per Steam si impacchetta come programma (per esempio con Electron), come ha fatto all'inizio *Vampire Survivors*. Ogni versione si prova subito come pagina, anche dal telefono; lo shader del VHS è già pronto. Godot 4 è scartato.
- **Regola per le stanze:** partire sempre da stanze con pochi dettagli (muri lisci, pochi oggetti), altrimenti i personaggi si perdono.
- **Grafica generata con l'AI**, montata a strati come in NINAH. Niente fotogrammi "da film".

## Cosa prendere da NINAH, e cosa no

Come è fatto NINAH (studiato dalle schermate della pagina Steam):
- stanze ricavate da foto vere di appartamenti, ridotte a pochi colori, retinate, sgranate e virate (ombre verde-azzurre, luci rosa);
- personaggi grotteschi, a metà tra foto e disegno, ritagliati e incollati sopra lo sfondo;
- vignetta scura e arrotondata ai bordi, leggero effetto grandangolo;
- l'arma del giocatore in primo piano, come in uno sparatutto in prima persona;
- interfaccia minima: riquadri di testo con le scelte, e un riquadro con il dettaglio del corpo esaminato (per esempio le mani);
- poche parti in 3D a bassa risoluzione; il resto è 2D.

**Da tenere:** il metodo a strati, sfondi quasi fotografici con personaggi disegnati sopra, la paranoia, l'ambiguità, i volti da vicino.

**Da evitare:** la casa da difendere, la porta con lo spioncino, il sole che uccide, la TV che dice cosa cercare, far entrare o sparare ai visitatori. Palette e interfaccia devono essere nostre, non copiate.

## Il Medico della peste

La peste è tornata. In un paese sperduto di oggi, l'unico a combatterla è un medico della peste con gli abiti antichi (maschera a becco, cappello, cappotto incerato, bastone), fuori posto tra case povere, televisori vecchi e sedie di plastica.

Il medico visita le case. Le famiglie spesso nascondono un malato, o non sanno di averne uno. Confronta i sintomi e porta via le persone giuste; se sbaglia, il paese si ammala.

- Obiettivo chiaro (fermare il contagio) e un motivo per mentire: chi viene portato via spesso non torna.
- Recupera la parte migliore di NINAH, cioè esaminare le persone in cerca di segni, dentro una struttura diversa.
- Indizi nella casa, non solo sul corpo: un piatto in più a tavola, una porta socchiusa su un corridoio buio, un rumore dalla camera accanto.
- Il paese come mappa del contagio: ogni scelta cambia il modo in cui la malattia passa da una casa all'altra.
- Il dilemma: portare via un sano lo condanna, lasciare un malato condanna la strada.
- I sintomi peggiorano di giorno in giorno sulla stessa persona (sano, febbre, bubboni): la prova di coerenza dice che si può fare.
- Idea da valutare: anche il medico può ammalarsi. (Non scelta come limite di gioco il 26 ottobre.)
- Idea da valutare: la peste potrebbe essere l'unica cosa rossa sullo schermo (macchie e bubboni), così l'occhio va dritto agli indizi.
- Con il filtro infrarosso si vedono gli indizi, come con una termocamera vera, che mostra il calore: chi ha la febbre, qualcuno nascosto dietro una porta. Deciso il 26 ottobre: si usa la sera sui nastri (vedi "La videocamera").
- Rischio: è un progetto grande (tante case, tante famiglie).
- Concorrenza: *Pathologic*, che però è un gioco di ruolo enorme e di altro genere, e qualche gioco da game jam su itch.io.

## Meccaniche e interfaccia

Decise il 26 ottobre, con le domande in chat.

### Il mondo

- **Retrofuturo anni '90.** Il mondo è quello di oggi, ma la tecnologia del medico e del potere ha l'aspetto degli anni '80-'90: cassette, monitor a fosfori verdi, fax, floppy. Le case povere restano come sono.
- **Elementi cyberpunk** (26 ottobre): il medico della peste è futuristico, in un mondo distopico dove alcune tecnologie sono rimaste ma cozzano con la vita povera e arretrata della gente comune. **Approvate tutte e quattro le proposte** (26 ottobre):
  - **la maschera è la tecnologia:** dentro c'è la videocamera (il REC è il suo occhio), le lenti leggono battito, temperatura e voce (la proposta C dei dialoghi), il filtro dell'aria ronza. Il medico non si vede mai, la maschera sì: sulla scrivania e nella foto del giornale. **Scheda della maschera e del bastone** (da approvare): `art/medico/maschera.jpg` (GPT Image 2, lavoro in `art/medico/lavori.json`). Maschera a becco di cuoio scuro con le cinghie; l'occhio destro è una lente d'ottone col vetro graffiato e un riflesso verde, al posto del sinistro c'è il blocco grigio di una videocamera anni '90 con la luce rossa del REC, legato con una cinghia, coi cavi che vanno a una batteria sulla nuca; il filtro dell'aria in punta al becco; un adesivo PANACEA consumato e rattoppi di nastro grigio. Il bastone nero ha il manico a T, un cavo a spirale lungo l'asta e la punta di metallo con una lucina, il sensore;
  - **il bastone-sonda:** la punta con cui si indicano le parti del corpo è un sensore, e come il protocollo può sbagliare;
  - **la ditta:** il recinto con prefabbricati, antenna e fari (già sulla mappa), il fax, il computer a fosfori verdi, il furgone bianco che porta via i malati di notte;
  - **il paese:** stufe a legna, termosifoni spenti, santini e medagliette, nessuno schermo tranne il vecchio televisore.
- **La ditta.** Il medico lavora a contratto per una multinazionale farmaceutica. Ogni mattina la ditta manda via fax il protocollo, cioè i segni da cercare, e paga a paziente. A volte il protocollo è sbagliato apposta, perché alla ditta servono cavie: il giocatore impara da sé di cosa fidarsi.

### La giornata

- **Mappa e tempo contato.** Ogni mattina si scelgono sulla mappa del paese le case da visitare; il tempo non basta per tutte. Di notte il contagio si sposta da una casa all'altra.
- **La sera si rivedono i nastri** della videocamera: riavvolgere, fermare l'immagine, ingrandire, passare all'infrarosso. Si scoprono cose sfuggite durante la visita, da usare il giorno dopo.
- **Limiti: il tempo, la fiducia del paese e i soldi.** Ogni porta forzata e ogni sano portato via fanno crescere l'odio verso il medico: le famiglie mentono di più e qualcuno non apre. Non scelti come limiti: i posti al lazzaretto, la salute del medico, le scorte di aceto, guanti ed erbe.
- **Il giornale del mattino.** Ogni mattina sulla scrivania c'è il foglio del paese: titoli, lettere e scritte sui muri dicono come il paese vede il medico. È l'unico segno della fiducia (niente numeri) e può nascondere indizi della storia.
- **I soldi si spendono.** La ditta paga a paziente; con i soldi si pagano affitto, cibo, cassette nuove e mance per farsi aprire. È la spinta a portare via qualcuno in più.

### La visita

- **Una stanza più le porte.** La famiglia riceve il medico in una stanza; si può pretendere di aprire una porta (camera, cantina) e vedere un'altra inquadratura. Aprire costa tempo e fiducia.
- **Esame per parti del corpo.** Si indica col bastone cosa si vuole vedere (occhi, bocca, collo, ascelle, mani), come facevano i medici della peste per non toccare i malati, e la videocamera zooma sul punto, a tutto schermo, con la messa a fuoco che va e viene; poi si torna alla stanza. La persona può rifiutarsi, coprirsi o mentire.
- **Domande e prove.** Si scelgono le domande da fare. Un indizio trovato (un piatto in più, una porta chiusa a chiave, il calore all'infrarosso) o una frase detta prima si può mettere davanti alla famiglia per smascherare una bugia o farsi aprire una porta.
- **Dialoghi e prove nel prototipo: A + B** (scelte il 26 ottobre, niente riquadri neri):
  - **le parole addosso (A):** le frasi si scrivono lettera per lettera accanto alla testa di chi parla; il medico, le descrizioni e chi non si vede scrivono in basso. Le parole chiave, in giallo, illuminano la parte della scena collegata con un filo puntinato, e cliccandole ci si va (un esame, una zona, una porta, una persona);
  - **le domande a raggiera:** si aprono attorno al punto toccato, in giallo quelle nuove; anche le porte usano la raggiera;
  - **il nastro delle frasi (B):** in basso una pellicola trasparente raccoglie le dichiarazioni (con la faccia di chi le ha dette, nell'espressione che aveva) e gli indizi (con la foto della cosa). Si trascinano su una persona, una parte del corpo, una zona o un'altra frase: se la smentiscono scatta la contraddizione, con il timbro e il filo rosso. Col tocco si sceglie la frase e poi la cosa;
  - **le espressioni:** chi mente cambia faccia mentre parla (nervoso, arrabbiato, piange); la faccia nuova si incolla solo sulla testa, il resto della scena resta identico. Chi crolla resta così per tutta la visita, e i nastri della sera rivedono le facce com'erano;
  - i contenuti sono in `gioco/js/dati.js` (DICHIARAZIONI, CONTESTAZIONI, REAZIONI).
- **Il misto B + C non convince ancora** (26 ottobre): il nastro delle frasi più la maschera che legge le persone (battito, temperatura, voce, sguardo), una barra della tensione e l'approccio (calmo, pressante, minaccia). Per ora si resta su A + B, com'è nel prototipo. Prove in `art/prove-stile/14-dialoghi` (`proposta_bc1.jpg`, `proposta_bc2.jpg`).
- **Decisioni a fine visita:**
  - **portare via** una persona al lazzaretto: se era sana, la si condanna;
  - **chiudere la casa**, con la croce sulla porta: ferma il contagio verso i vicini, ma i sani chiusi dentro rischiano di ammalarsi;
  - **tornare domani**: i sintomi saranno più chiari, ma intanto il contagio può passare ai vicini.

  Scartato: bruciare le cose del malato.

### La videocamera

- **Il VHS è la videocamera del medico**, che riprende ogni visita. REC, ora e data fanno da interfaccia (il tempo che passa, il giorno); notte e infrarosso sono le modalità della videocamera. Durante le visite la scritta sarà REC; PLAY resta per i nastri rivisti la sera.
- **Notte: automatica al buio.** La videocamera passa da sola alla visione notturna verde nelle ultime visite della giornata, che cadono di sera, e nelle stanze buie dietro le porte (cantine, camere con le tapparelle abbassate).
- **Infrarosso: solo la sera, sui nastri.** Durante la visita si vede normale; riguardando il nastro all'infrarosso si scopre il calore sfuggito (qualcuno dietro una porta, una febbre nascosta) e il giorno dopo si torna in quella casa con la prova.
- **Comandi:** mouse (il puntatore è la punta del bastone) e controller, per giocare anche su Steam Deck.

### Fuori dalle case

- **La scrivania del medico**, vista dall'alto, in una stanza in affitto: la mappa di carta con le puntine, il fax col protocollo, il giornale del mattino, il televisore col videoregistratore per i nastri della sera. Tutto dentro il mondo, niente menu. **Scrivania e mappa sono disegnate al 40%** (confermato il 26 ottobre): 60% foto e 40% versione disegnata; per la mappa quella riallineata.
- **La mappa del paese** (26 ottobre, rifatta più grande): 50 case numerate attorno alla chiesa, il fiume con due ponti, il cimitero e, ai margini, il recinto della Panacea (prefabbricati bianchi, antenna, fari): la tecnologia della ditta fuori posto nel paese. I tetti sono rossi apposta, per trovare le case in automatico e metterci gli spilli. Nel gioco la mappa si ingrandisce toccandola. La mappa di prima, più piccola, è in `art/scrivania/mappa_prima.jpg`.
- **Le case sulla mappa** (26 ottobre): passandoci sopra la casa si illumina e il medico la cerchia a matita rossa; accanto appare la sua scheda, un cartoncino con la segnalazione e gli occupanti. Prima della visita le foto sono vuote (punti di domanda); dopo la visita la scheda è piena: foto degli occupanti visti, cosa ha visto l'esame, chi è finito al lazzaretto, le prove, il provvedimento. Le foto sono ritagli delle scene (`gioco/img/volti`).
- **Il giornale** (26 ottobre): disegnato nello stile a fumetto, inclinato, con le pagine dietro storte come se fosse piegato male (`art/giornale/giornale.jpg`, GPT Image 2). Sulla carta c'è solo la testata: titolo, sommario, foto e colonne li stampa il gioco con la stessa prospettiva della pagina (`PAGINA` in `gioco/js/dati.js`), con un filtro che fa tremare un po' l'inchiostro. Così il testo cambia ogni giorno e resta leggibile. In prima pagina la foto del medico di spalle nella via del paese (`art/giornale/foto_medico.jpg`). Sugli schermi piccoli sotto la pagina c'è lo stesso testo da leggere.
- **I comandi del medico** (Stato di famiglia, Concludi la visita, Torna alla scrivania) stanno in una barra sotto lo schermo, così l'immagine della videocamera resta libera; dentro lo schermo solo l'OSD, le frasi, la raggiera e il nastro delle frasi.
- **Il taccuino è scartato** (26 ottobre: laborioso e antipatico, un elenco da leggere). **Al suo posto lo stato di famiglia** (proposta A, realizzata nel prototipo e confermata il 26 ottobre), che sostituisce anche il modulo della ditta:
  - per ogni casa segnalata il certificato dell'anagrafe del comune (`ANAGRAFE` in `gioco/js/dati.js`), con chi ci risulta: può essere vecchio o sbagliato (il nonno è morto, il figlio della casa 5 risulta emigrato in città). Si legge già dalla scrivania, prima delle visite;
  - le foto arrivano da sole dalla videocamera, quando la persona si vede (con la faccia che ha adesso, per esempio la figlia che ha pianto); chi non si è visto resta un punto di domanda, chi è morto una croce;
  - accanto a ogni nome un corpo con i cinque punti dell'esame: rossi i segni del protocollo trovati, neri le dita nere, grigi gli esami senza niente, vuoti quelli non fatti (passandoci sopra si legge il reperto). Il protocollo mente sul pallore, quindi la ragazza sana ha i pallini rossi;
  - sul tavolo a destra i timbri e le frasi del nastro di quella casa. **Un timbro trascinato su una persona è la diagnosi** (sano, sospetto, malato, grave). **Una frase o una prova lasciata sul nome giusto diventa una nota a penna** (`ANNOTA`), che barra le note che smentisce e anche la nota del comune; sul nome sbagliato la riga trema e la nota non si scrive. Col tocco: si sceglie il timbro o la frase, poi si tocca la riga;
  - si spunta chi va al lazzaretto (con il compenso e il timbro viola della ditta sul profilo richiesto), si sceglie il provvedimento (croce sulla porta o tornare domani) e si firma: la firma chiude la visita e consegna tutto alla ditta;
  - alla fine, nella verità, le diagnosi timbrate si confrontano con com'era davvero.

  Le tre proposte erano in `art/prove-stile/16-taccuino`:
  - **A · Lo stato di famiglia:** quella scelta;
  - **B · La cartella della ditta:** il computer a fosfori verdi della Panacea mette insieme esami e letture della maschera e dà una probabilità di contagio e una raccomandazione; ma usa il protocollo del giorno, che a volte mente (la figlia sana all'81% perché pallida, e la ditta la vuole). Si conferma o si smentisce;
  - **C · La parete:** una bacheca nella stanza del medico con foto, frasi e nastri di ogni casa, collegati col filo rosso (il filo si tende se il legame è vero); resta da un giorno all'altro e racconta la storia del paese. Si legherebbe alla casa in 3D.

  B e C non sono state scelte.

### Fine della partita e storia

- **Giorni contati e più finali.** La partita dura un numero fisso di giorni (per esempio 14); il finale dipende da quanti si sono ammalati e da quanto il paese si fida del medico.
- **Famiglie scritte a mano**, ben pensate, con una **storia principale ben definita e nascosta**, da scoprire giocando, più storie a parte per le famiglie più importanti.
- **La storia nascosta intreccia quattro tracce:** la ditta e le cavie (la peste è tornata per colpa della ditta e il lazzaretto è un laboratorio); l'immune nascosto (qualcuno che non si ammala, cercato dalla ditta e nascosto dalle famiglie di casa in casa); il passato del medico (i nastri vecchi mostrano che ha già fatto questo lavoro in altri paesi, ed è finita male); il segreto del paese (la peste di secoli fa, vecchi riti, una cripta, una promessa).
- **Come si legano: il medico è la peste** (26 ottobre). Secoli fa un medico della peste portò il contagio in paese, e il paese se lo ricorda: per questo le famiglie temono il medico e nascondono i loro cari. Il medico di oggi è un portatore sano e non lo sa. La ditta lo manda di paese in paese (lo dicono i nastri vecchi), usa i malati come cavie e cerca chi non si ammala, per farne il vaccino da vendere. Lo si scopre anche giocando: le case dove entra il medico si ammalano di più. Il gancio in una frase: il medico della peste è la peste.
- **Tono: cupo, con umorismo nero** (26 ottobre). Il paese e le famiglie sono tragici, la ditta è grottesca: fax burocratici, premi di produzione, slogan aziendali. Come in *Papers, Please*, il riso amaro rende il cupo ancora più cupo.

## Grafica

### Metodo attuale (stile al 20% sullo sfondo, 100% sui personaggi)

1. **Scena di partenza:** una stanza semplice con i personaggi e la mano del medico, in resa fotografica. Si genera intera, oppure si monta con `tools/schermata.py` da sfondo e ritagli.
2. **Stile pieno:** la scena viene ridisegnata da capo nello stile scelto (GPT Image 2, modifica di immagine), con personaggi deformi e disegnati.
3. **Maschere:** SAM 3 ritaglia i personaggi ("person") e il bastone dalla versione trasformata.
4. **Sfondo pulito:** la stanza senza persone né mano, ottenuta togliendole dalla foto (Nano Banana Pro), oppure la stanza vuota già esistente.
5. **Sfondo nello stile:** la stanza vuota trasformata nello stesso stile. Va fatta con Nano Banana Pro, che lascia gli oggetti al loro posto; con GPT gli oggetti si spostano e nel mescolamento compaiono doppi.
6. **Montaggio:** `tools/intensita.py` fa lo sfondo con 80% di foto e 20% di sfondo trasformato, e sopra mette i personaggi nello stile pieno. L'intensità dello sfondo è un numero nel file della scena.
7. **Filtro:** `tools/filtri.py` con `vhs`, `vhs_verde` o `vhs_infrarosso` (nel gioco sarà lo shader animato).

Attenzione: i modelli a volte inventano dettagli (per esempio una faccia nel televisore). Si guardano sempre i risultati e si rigenera chiedendo di non aggiungerli.

### Personaggi ammorbiditi (il metodo scelto)

**Tutto il procedimento è automatico in `tools/scena.py`**: si scrive la descrizione della scena in `scena.json` (stanza, persone, pose, oggetti; esempio in `art/scene/02-soggiorno/scena.json`) e lo script fa i passaggi:
1. **Foto di partenza** (GPT Image 2): stanza con pochi dettagli e persone; la mano del medico in primo piano solo con `"mano": true`.
2. **Fumetto** (GPT Image 2): la scena ridisegnata nello stile 07, personaggi deformi.
3. **Personaggi ammorbiditi** (Nano Banana Pro): rifà in foto solo i personaggi (e la mano, se c'è), lasciando il resto com'è e **senza** passare un riferimento a fumetto: le deformità si ammorbidiscono, ed è proprio l'effetto voluto.
4. **Stanza nello stile** (Nano Banana Pro): il fumetto senza persone (né mano).
4b. **Stanza nello stile ripulita** (Nano Banana Pro): la stessa, con muri e soffitto ripuliti dagli elementi che il disegno aggiunge (intonaco scrostato, crepe, macchie), mantenendo il tratto. È il 20% che va sopra la foto.
5. **Stanza in foto** (Nano Banana Pro): la stanza nello stile rifatta in foto, con i muri puliti. Le due stanze vuote vengono dal fumetto e non dalla foto di partenza, perché GPT ridisegnando sposta un po' l'inquadratura: così stanza e personaggi combaciano sempre. Attenzione: il ridisegno a fumetto aggiunge segni che nella foto non devono esserci (intonaco scrostato, crepe), quindi nel prompt si descrivono i muri come devono essere (`"muri"` in `scena.json`, di base intonaco liscio e chiaro con qualche macchia di umidità). Passare anche la foto di partenza come riferimento non funziona: i muri vengono giusti, ma porta e mobili si spostano.
6. **Maschere** (SAM 3): persone e bastoni (quelli delle persone, per esempio della nonna), più il guanto se c'è la mano. Con `"ritagli"` in `scena.json` si sceglie cosa ritagliare.
7. **Montaggio** (`tools/intensita.py`): personaggi sulla stanza al 20% (80% stanza in foto, 20% stanza nello stile ripulita). Con `"escludi_maschere"` si toglie qualcosa dalla scena senza rigenerarla (così è stata tolta la mano dal soggiorno).
8. **Filtri** (`tools/filtri.py`): VHS, VHS verde e VHS infrarosso.

Costa circa 1 dollaro a scena. Ogni passaggio salta se il suo file esiste già: per rifarne uno basta cancellarlo.

La cucina (scena 01) è stata fatta a mano prima dello script, con gli stessi passaggi: le immagini sono in `art/prove-stile/11-personaggi-50`, il montaggio senza mano in `art/scene/01-cucina/montaggio.json`. D'ora in poi il riferimento del padre per gli altri stati e inquadrature è `art/prove-stile/11-personaggi-50/padre_riferimento_ammorbidito.jpg`.

Mescolare i personaggi a un'intensità intermedia (per esempio 50% foto e 50% fumetto) funziona solo se le due versioni hanno le stesse sagome e le stesse facce, altrimenti si vedono due paia di occhi (`intensita_personaggi` e `personaggi_originale` in `tools/intensita.py`).

### Scene fatte

Ogni scena ha `finale.jpg` (senza filtro), `finale_vhs.jpg`, `finale_vhs_verde.jpg` e `finale_vhs_infrarosso.jpg`, tutte senza la mano del medico. Confronto dei filtri: `art/scene/foglio_scene_filtri.jpg`.

Prove sulla quantità di fumetto nella stanza (26 ottobre), **scelto il 20%**, che fa più contrasto con i personaggi:

- **stanza tutta in foto** (0% di fumetto, `"intensita_sfondo": 0` nel montaggio): scartata. Confronto: `art/scene/confronto_20_foto.jpg`;
- **fumetto ripulito al 30% e al 40%**, sul soggiorno: scartati. Confronto: `art/scene/02-soggiorno/confronto_20_30_40.jpg`. Con il VHS la differenza quasi spariva.

I file delle prove scartate sono stati tolti dalle cartelle delle scene (restano nella storia del repo); restano i confronti. Nel soggiorno il 20% viene dal fumetto ripulito: resta un accenno di tratto, senza l'intonaco scrostato (confronto prima/dopo: `art/scene/02-soggiorno/confronto_20_ripulito.jpg`). La cucina usa ancora il suo fumetto originale, con tratteggi negli angoli e retino sul muro: si può ripulire allo stesso modo. (La prima versione della stanza in foto del soggiorno si portava dietro l'intonaco scrostato del fumetto: corretta.)

- **01 Cucina** (`art/scene/01-cucina`): il padre e la figlia; quattro piatti in tavola, una porta socchiusa su un corridoio buio.
- **02 Soggiorno** (`art/scene/02-soggiorno`): una nonna col bastone, una giovane donna pallida e un uomo in tuta davanti a una porta chiusa; dietro la porta nascondono qualcuno.

Se un giorno la mano del medico tornerà sullo schermo, conviene che sia un elemento fisso, disegnato una volta sola e uguale in tutte le scene (come l'arma in NINAH), non generata ogni volta con la scena: nel soggiorno il bastone era venuto col manico ricurvo, diverso da quello della cucina.

### Coerenza dei personaggi (`art/prove-stile/10-coerenza`)

Prova sul padre della cucina, nello stile scelto e con il VHS.

- **Stessa stanza, tre giorni** (sano, febbre, bubboni). Nano Banana Pro modifica solo il personaggio: il padre resta lui, e la stanza, la figlia e la mano del medico restano identiche. Al primo tentativo la febbre gli aveva "ammorbidito" la faccia, rendendola meno deforme; passando anche l'immagine di riferimento del personaggio il problema è sparito.
- **Nuove inquadrature** (a tavola, a letto al buio, primo piano del collo), partendo dal ritaglio del personaggio. Con entrambi i modelli resta riconoscibile: occhi, orecchie, capelli, denti, giacca.
  - **Nano Banana Pro** tiene identica la stanza e mette il personaggio disegnato dentro la foto della stanza in un solo passaggio. Però ignora le richieste di luce (la camera da letto è venuta illuminata, ha rimediato il filtro verde) e a volte mette male il bastone.
  - **GPT Image 2** segue meglio luce e composizione, ma ridisegna la stanza ogni volta: non va bene per le stanze che tornano.

Regole che ne vengono fuori:
- per ogni personaggio serve un'immagine di riferimento (ritaglio su fondo neutro), da passare sempre insieme alla scena quando si cambia lo stato;
- per le scene nuove si può provare il "passaggio unico": riferimento del personaggio + foto della stanza, con Nano Banana Pro. È più semplice della ricetta 20% / 100% (niente maschere né mescolamenti); va verificato con più personaggi insieme.

### Metodo precedente (trattamento unico)

Sfondo e personaggi fotografici montati a strati, poi un trattamento comune (bassa risoluzione, palette, retinatura, vignetta) e l'interfaccia: `art/prove-stile/03-schermate`. Il trattamento è ancora disponibile in `tools/schermata.py` e si può combinare con gli stili.

### Prove fatte (in `art/prove-stile/`)

- `01-stili`: scena del Seicento in tre stili e tre modelli. Superata.
- `02-presente-distopico`: scene "da film". Superata: non sembravano un gioco.
- `03-schermate`: schermate di gioco con il trattamento unico (Medico della peste e Ospedale).
- `04-villaggio`: capanna rurale trasformata in 15 stili più 2 trattamenti col codice.
- `05-intensita`: quattro stili (01, 04, 07, 13) con sfondo al 20% e personaggi al 100%. Scelti 04 e 07.
- `06-cucina`: la cucina moderna semplificata: 04 e 07 al 20% / 100%, tutto al 100%, sfondo 04 al 100% con personaggi 04 al 20%, sfondo 04 all'80% con personaggi 07 al 100%.
- `07-combo-inventate`: tre proposte di Claude sulla cucina: "il rosso è la peste" (tutto in bianco e nero, rossi solo i sintomi), "al buio" (stanza nel buio, luce sui personaggi), "schermata di gioco" (trattamento leggero e interfaccia).
- `08-filtri`: le combinazioni approvate 02 e 04 con sette filtri finali: verde, verde acido, verde retinato, verde con il rosso, VHS, VHS verde, fotocopia.
- `09-vhs-animato`: anteprima del VHS animato in tempo reale sul soggiorno nello stile definitivo, con i tre filtri (giorno, notte in verde, infrarosso) e intensità regolabile, che parte dal 50%. Senza la banda di disturbo, tolta il 26 ottobre.
- `10-coerenza`: lo stesso personaggio in più stati e inquadrature (vedi sopra).
- `13-mappa`: la mappa nuova com'è nel gioco (con il VHS) e varianti senza VHS: pixellata, a fumetto pieno, a fumetto e pixellata, disegnata al 40% (**scelta**, 26 ottobre). Nella versione a fumetto il modello ha spostato un po' le case e mescolandola le sdoppiava: per il 40% è stata riallineata all'originale con `tools/allinea.py` (`art/scrivania/mappa_paese_stile_allineata.jpg`).
- `14-dialoghi`: tre proposte per dialoghi e prove, su immagini di esempio della cucina: A "Le parole addosso", B "Il nastro delle frasi", C "La maschera legge" (scelte A e B, realizzate nel prototipo); e il padre con altre due espressioni, nervoso e arrabbiato (Nano Banana Pro cambia solo la faccia). Poi il misto B + C con la pellicola più trasparente (`proposta_bc1.jpg`: la maschera legge e il nastro registra; `proposta_bc2.jpg`: il nastro smentisce e la tensione sale). Le espressioni usate nel gioco sono in `art/espressioni`.
- `12-scrivania`: la scrivania del medico com'è nel gioco (20% di fumetto e VHS al 50%) e varianti senza VHS: pixellata (il trattamento delle prime schermate: bassa risoluzione, pochi colori, retinatura), disegnata al 60%, disegnata al 60% e pixellata, disegnata al 40% (**scelta**, 26 ottobre).
- `15-giorno`: come nascondere l'aspetto "da AI" delle scene di giorno (la notte e l'infrarosso vanno già bene), sulla cucina e sul soggiorno: 0 com'è ora; 1 vera definizione del VHS (luminanza a circa 430 punti per riga, colore a circa 80, alone sui contorni); 2 luce della videocamera (stanza buia, centro chiaro, bordi nel buio, luci bruciate); 3 colore da videocamera economica (bilanciamento del bianco sbagliato, poco saturo, ombre verdastre, rumore di colore); 4 copia di copia (più morbida, eco, colore che scappa, buchi nel nastro); 5 = 1 + 2 + 3. Fogli `foglio_cucina.jpg`, `foglio_soggiorno.jpg` e le facce al 100% in `dettaglio_soggiorno.jpg`; lo script è `giorno.py`. **Scelta la 2, luce della videocamera** (26 ottobre), ora nello shader del gioco e nel filtro `vhs`.
- `16-taccuino`: tre proposte per sostituire il taccuino (vedi "Fuori dalle case"); la parete vuota della C è generata con GPT Image 2 (`parete.jpg`).
- `17-casa-del-medico`: la stanza del medico sopra il bar (`stanza.jpg`), da cui doveva partire il panorama a 360°; il panorama è scartato (vedi "3D").
- `11-personaggi-50`: prove per avere personaggi meno disegnati. **Scelta:** la prima prova, con i personaggi rifatti in foto e ammorbiditi, montati sulla stanza al 20% (`c_ammorbiditi_sfondo20.jpg`, con il VHS `c_ammorbiditi_sfondo20_vhs.jpg`, in versione notturna con il VHS verde `c_ammorbiditi_sfondo20_vhs_verde.jpg`). Scartate: il mescolamento 50% foto e 50% fumetto (`a_mescolati_50_vhs.jpg`) e i personaggi ridisegnati "a metà" (`b_meta_disegnati.jpg`).

Questionario delle combinazioni della cucina (06 e 07), con i voti salvati: https://claude.ai/artifact/3TEf1Gyxsk5XU5saPN3K6r
- **Approvate:** 01 (linoleografia, stanza 20% e personaggi 100%), 02 (fumetto, stanza 20% e personaggi 100%), 04 (stanza in linoleografia all'80%, personaggi in fumetto al 100%), 10 (la 04 come schermata di gioco, con trattamento leggero e interfaccia).
- **Scartate:** 03 (personaggi al 20%), 05 e 06 (tutto al 100%), 07 (trattamento retinato della prima prova), 09 (al buio).
- **Non votata:** 08 (il rosso è la peste).
- In tutte le approvate i personaggi sono al 100%, deformi e disegnati.

Questionario dei filtri (08), con i voti salvati: https://claude.ai/artifact/MQTM96TzxD7idhqAUXdp86
- **Approvati, tutti sulla 02:** verde, verde retinato, verde con il rosso, VHS, VHS verde.
- **Scartati:** tutti i filtri sulla 04; verde acido e fotocopia anche sulla 02.
- Scelta finale: VHS e VHS verde, sulla 02. Il 26 ottobre si è aggiunto il VHS infrarosso.

### Strumenti

- `tools/scena.py`: produce una scena intera nello stile scelto, dalla descrizione all'immagine finale con i filtri (vedi "Personaggi ammorbiditi").
- `tools/fal_batch.py`: genera immagini su fal.ai da un file di lavori JSON; passa immagini locali con `@file:` e salva anche le maschere dei modelli di segmentazione.
- `tools/schermata.py`: monta una schermata a strati; con un "trattamento" applica la resa unica, senza fa solo il montaggio.
- `tools/intensita.py`: applica lo stile con intensità diverse a sfondo e personaggi; con "buio" fa sprofondare la stanza nel buio fuori da un cono di luce.
- `tools/primi_piani.py`: i primi piani delle parti del corpo per l'esame, con il riferimento del personaggio (descrizione in `primi_piani.json` nella cartella della scena).
- `tools/prepara_gioco.py`: prepara le immagini del prototipo in `gioco/img` (scene, mappe dei personaggi per i clic, sagome, mappe di calore per l'infrarosso, scrivania e mappa al 40%, primi piani, foto degli occupanti) e le espressioni: da ogni variante in `art/espressioni` ritaglia la testa riallineata alla scena (`gioco/img/espressioni`, posizioni in `gioco/js/espressioni.js`).
- `tools/allinea.py`: riallinea un'immagine ridisegnata all'originale (spostamento d'insieme e poi punto per punto, con OpenCV), per mescolarle senza contorni doppi.
- `tools/filtri.py`: filtri finali per rendere omogenee immagini di stili diversi (verdi, infrarosso, VHS, fotocopia). Non usa l'AI, quindi non costa niente.
- `tools/prepara_stanza.py`: texture, ritagli della scrivania e modelli della stanza 3D (vedi "La stanza 3D nel prototipo"); usa gltf-transform da `tools/tre`, dove si impacchetta anche Three.js.
- Servizio: **fal.ai**. La chiave si legge da `FAL_KEY` (impostazioni dell'ambiente cloud) o da `~/.config/fal/key`; mai nel repo.
- Modelli:
  - **GPT Image 2** (`openai/gpt-image-2`, `/edit`): il migliore per scene nuove e trasformazioni di stile. Non fa sfondi trasparenti, e il filtro dei contenuti blocca parole come "soldato ferito" o "insanguinato", e anche i bambini in una scena horror: nelle scene niente bambini.
  - **Nano Banana Pro** (`fal-ai/nano-banana-pro/edit`): per modificare un'immagine lasciando il resto al suo posto (togliere persone, semplificare una stanza, sfondi nello stile, cambiare lo stato di un personaggio) e per mettere un personaggio di riferimento dentro la foto di una stanza.
  - **SAM 3** (`fal-ai/sam-3/image`): maschere dei personaggi da un testo ("person").
  - **BiRefNet v2** (`fal-ai/birefnet/v2`): ritaglio di una figura su fondo neutro.
  - **Tripo H3.1** (`tripo3d/h3.1/image-to-3d`): un modello 3D con texture da una foto, 30 centesimi; con `face_limit` resta leggero. `tools/fal_batch.py` salva il GLB e l'anteprima.
  - **Flux 2 Max**: scartato, resa inferiore.
- Spesa per tutte le prove: circa 15 dollari, più circa 4 per la stanza 3D (texture, foto degli oggetti e modelli di Tripo).
- Steam chiede di dichiarare sulla pagina del gioco i contenuti generati con l'AI.

### 3D

- **NINAH ha una parte in 3D:** la casa del protagonista si esplora in prima persona. (Correzione del 26 ottobre: all'inizio avevo scritto che era quasi tutto 2D.)
- **La casa del medico in 3D** (idea del 26 ottobre): la stanza in affitto sopra il bar, dove ci si muove; cliccando la scrivania la si rivede in 2D com'è adesso. **Scelta la stanza 3D vera** (26 ottobre), dopo il panorama scartato; la prima prova è nel prototipo (vedi "La stanza 3D nel prototipo").
- **Il panorama a 360° è scartato** (26 ottobre): non piace. La prova è stata fermata prima del panorama; resta la stanza da cui partiva, generata con GPT Image 2 (`art/prove-stile/17-casa-del-medico/stanza.jpg`: porta, scrivania sotto la finestra con le tapparelle, fax, mappa con gli spilli, maschera, guanti, televisore sul videoregistratore, cassette, letto), utile come riferimento della stanza.
- **Tre strade, dalla più semplice:**
  1. **panorami a 360°** (scartata): la stanza generata come panorama sferico con Hunyuan World su fal (`fal-ai/hunyuan_world`, anche da un'immagine con `image-to-world`), vista dall'interno di una sfera. Ci si guarda attorno e si salta tra due o tre punti; non si cammina liberamente;
  2. **stanza 3D vera** (**scelta**), come NINAH: stanza semplice in Three.js, mobili da immagine a 3D (Hunyuan 3D 3.1, Tripo H3.1, Meshy 7.1 su fal), il VHS come filtro sopra, luci e collisioni. Si cammina, ma è molto più lavoro, i modelli fatti dall'AI hanno un'aria di plastica che il VHS nasconde solo in parte, ed è più pesante sui telefoni;
  3. **gaussian splat** (`tripo3d/triposplat` su fal): stanze quasi fotografiche in 3D, ancora sperimentali e pesanti.
- Il motore web le regge tutte e tre (Three.js). World Labs Marble genera stanze intere, ma richiede un account a parte.

### La stanza 3D nel prototipo

Fatta il 26 ottobre (`gioco/js/stanza.js`). La giornata comincia qui, e qui si torna.

- **La stanza:** 3,4 x 4 metri, alta 2,75. Davanti la finestra con la scrivania sotto (come nel disegno della scrivania: lampada, fax, giornali, mappa, stato di famiglia, soldi, maschera, guanti, televisore, videoregistratore rosso scuro col display delle 12:00 che lampeggia, tre cassette); a sinistra la porta con la luce delle scale che passa sotto, l'interruttore, il calendario della Panacea (qualcuno ha cerchiato il 17) e l'attaccapanni col cappotto incerato e il cappello; dietro l'armadio; a destra il letto con la coperta a fiori, il comodino con la radiosveglia che segna l'ora del gioco, un santino del santo degli appestati, il termosifone freddo; la borsa del medico per terra; una lampadina nuda spenta.
- **Come è fatta:** muri, pavimento e mobili semplici sono scatole con texture generate con GPT Image 2 (qualità media, circa 5 centesimi l'una): carta da parati, pavimento, legno, coperta, il davanti di porta, finestra, armadio, comodino e testiera. Gli oggetti piccoli e piatti della scrivania sono ritagliati dalla scrivania disegnata, così la scrivania in 3D somiglia a quella in 2D. Gli otto oggetti complicati (sedia, lampada, fax, televisore, maschera, borsa, termosifone, attaccapanni col cappotto) sono modelli fatti da una foto con **Tripo H3.1** su fal (`tripo3d/h3.1/image-to-3d`, 30 centesimi l'uno, 4.000-12.000 triangoli); le foto degli oggetti sono di GPT Image 2, la maschera è la vista di tre quarti della scheda. Tutto in `art/stanza3d` (`lavori.json`, `lavori_3d.json`); `tools/prepara_stanza.py` riduce le texture in `gioco/img/stanza` e alleggerisce i modelli in `gioco/modelli` (150-450 KB l'uno): glTF in un file `.json` con la texture WebP a 512 punti accanto, perché gli Artifact di claude.ai non servono i `.glb`.
- **La luce:** la mattina la tapparella è alzata e dai vetri entra il giorno, la lampada è accesa; la sera la tapparella è abbassata e resta la lampada, con le ombre. Sopra c'è il VHS del gioco: Three.js disegna su un canvas fuori dallo schermo, a bassa risoluzione (960 punti, 720 sui telefoni), che diventa la sorgente della videocamera.
- **Come ci si muove:** si trascina per guardarsi attorno; si clicca (o si tocca) il pavimento per andarci, o una cosa per andarci e usarla (il percorso gira attorno ai mobili). Sul computer anche WASD e le frecce, ed E o Invio per usare quello che si guarda. Passandoci sopra, le cose si illuminano e si legge il nome.
- **Le cose che si usano:** la scrivania si apre in 2D com'era (con **Alzati** si torna nella stanza); la porta porta alla mappa (la sera c'è il coprifuoco); il videoregistratore apre i nastri; la sera il letto chiude la giornata. Finestra, armadio, cappotto, calendario, santino, termosifone, borsa e radiosveglia hanno una frase (`STANZA` in `gioco/js/dati.js`).
- **Three.js** 0.186.1 con il caricatore dei modelli, impacchettato in un solo file (`gioco/lib/three.js`, 770 KB) con `tools/tre` (`npm install`, poi `npm run impacchetta`). Se il browser non ha WebGL 2, si gioca dalla scrivania in 2D come prima.
- **Da decidere:** la maschera in 3D è quella nuova con la videocamera, mentre la scrivania disegnata ha ancora quella vecchia. Lo stile delle texture è foto, senza il 20% di fumetto delle scene.

### Scartato

- Il visore a binocolo (la vista attraverso le lenti della maschera).
- Ritoccare dipinti o foto esistenti aggiungendo i sintomi sopra.
- Stili storici (olio fiammingo, Seicento) e immagini "da film".
- Stanze troppo cariche di dettagli.
- Il villaggio rurale.
- Librerie di foto stock: Adobe Stock vieta di mostrare le persone delle foto in luce negativa; Shutterstock lo permette solo con una licenza "sensitive use" a parte. Generated Photos vende volti sintetici, ma sono ritratti moderni da studio.
- NovelAI (fatto per lo stile anime) e Meshy (modelli 3D): non adatti ai volti di questo progetto.

## Idee accantonate

- **Ospedale:** un'infermiera in un ospedale da campo, in una guerra di oggi in una realtà dove la tecnologia si è fermata agli anni '40; decide chi curare e scova i sabotatori tra i pazienti. Schermata di prova in `art/prove-stile/03-schermate`.
- **Barbiere:** il barbiere di un paese sperduto esamina i clienti mentre li rade.
- **Confessionale:** un parroco che dalla grata vede solo frammenti dei fedeli.
- **Esistenza in vita:** impiegato dell'anagrafe che certifica che i pensionati sono vivi, ma non tutti lo sono. Legata all'Italia.
- **Lazzaretto:** Milano 1630, peste e untori. Legata all'Italia; il ciclo "posto di blocco + contagio" è già di *Quarantine Zone*.

## Mercato

- *No, I'm Not a Human* ha superato il milione di copie (annuncio dell'editore, marzo 2026).
- *Quarantine Zone: The Last Check* ha venduto 750.000 copie in meno di un mese (uscito a gennaio 2026).
- Il genere vende, ma è affollato: serve un gancio che si spieghi in una frase.

## Domande aperte

- Nomi: il paese, i personaggi, la ditta. E in che paese siamo (l'Italia è accantonata). Per il paese **San Rocco è scartato** (26 ottobre; nel prototipo resta per prova nello stato di famiglia, `COMUNE` in `gioco/js/dati.js`). Nuove proposte, nomi inventati che non risultano comuni italiani: **Malvento** (il "mal vento", l'aria cattiva da cui i medici della peste si riparavano col becco; esiste solo un belvedere con questo nome nel Pollino), **Acquaferma** (l'acqua stagnante, un paese dove non cambia niente; esistono Acquafredda e Acquafondata), **Valcupa** (la valle cupa) e **Borgofreddo** (case senza riscaldamento, dove all'infrarosso si vede chi è caldo; è anche il nome di una casa vacanze a Monopoli).
- Tempi e budget.

## Prossimi passi

1. **Prototipo giocabile di una giornata** (26 ottobre): https://claude.ai/artifact/PWFyiToQ3fwPAjNgiHYJYT. La scrivania (al 40%) con fax, giornale, stati di famiglia e mappa; le case 3 e 5 con REC, luce della videocamera, zoom, frasi addosso a chi parla, domande a raggiera, nastro delle frasi da contestare, espressioni, porte; lo stato di famiglia con timbri, note a penna e firma (al posto del taccuino e del modulo della ditta); la sera i nastri all'infrarosso; la notte con il contagio, i conti, il giornale del giorno dopo, la verità e il confronto delle diagnosi. Il codice è in `gioco/`; le immagini si preparano con `tools/prepara_gioco.py`, i primi piani si generano con `tools/primi_piani.py`. Provato tutto in Chromium sul computer e a misura di telefono. Da giocare e commentare.
2. Dialoghi: per ora A + B; l'interfaccia va ancora trovata (il misto B + C non ha convinto).
3. Il nome del paese, tra le proposte in "Domande aperte".
4. La stanza del medico in 3D: provarla e dire cosa cambiare (vedi "La stanza 3D nel prototipo").
5. Elementi cyberpunk (approvati): approvare la scheda della maschera e del bastone (`art/medico/maschera.jpg`), poi metterla sulla scrivania e nella foto del giornale.
6. Schede dei personaggi: un riferimento per ognuno, da usare in tutte le scene e in tutti gli stati.
7. Il gioco completo: famiglie, storia, giorni.

## Fonti

- [No, I'm Not a Human su Steam](https://store.steampowered.com/app/3180070/)
- [No, I'm Not a Human: vendite (Multiplayer.it)](https://multiplayer.it/notizie/lhorror-indie-no-im-not-a-human-ha-venduto-bene-ecco-quanto.html)
- [Quarantine Zone: oltre 750.000 copie](https://lnt.ma/?p=552852)
- [Recensione di NINAH (Adventure Game Hotspot)](https://adventuregamehotspot.com/review/5252/no-im-not-a-human)
- [Recensione di NINAH (Steam Deck HQ)](https://steamdeckhq.com/game-reviews/no-im-not-a-human/)
- [Pathologic 3 su Steam](https://store.steampowered.com/app/3199650/Pathologic_3)
- [War Hospital (Wikipedia)](https://en.wikipedia.org/wiki/War_Hospital)
- [Intensive[S]care (itch.io)](https://leinartlabs.itch.io/intensivescare)
- [fal.ai: prezzi](https://fal.ai/pricing)
- [World Labs Marble: esportazione](https://docs.worldlabs.ai/marble/export/gaussian-splat)
- [Shutterstock: licenza "sensitive use"](https://submit.shutterstock.com/help/en/articles/10594576-what-is-a-sensitive-use-license)
- [Adobe Stock: licenze](https://helpx.adobe.com/stock/how-to/adobe-stock-licenses.html)
- [Recensione di Generated Photos](https://fritz.ai/generated-photos-review/)
- Nomi del paese: [il belvedere Malvento nel Pollino (Komoot)](https://www.komoot.com/highlight/490741), [Malvito (Wikipedia)](https://en.wikipedia.org/wiki/Malvito), [Acquafredda (Tuttitalia)](https://www.tuttitalia.it/lombardia/87-acquafredda/), [Acquafondata (Tuttitalia)](https://www.tuttitalia.it/lazio/68-acquafondata/), [Borgofreddo, Monopoli (Hotels.com)](https://lookup.hotels.com/ho3291061856/borgofreddo-monopoli-italy)
