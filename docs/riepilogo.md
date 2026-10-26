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
  - **Tre filtri finali, tutti tenuti** (26 ottobre): **VHS** per il giorno, **VHS verde** per la notte e le scene al buio, **VHS infrarosso** (rosso tendente al rosa, più scuro e più tenue del verde). Come usarli nel gioco si decide più avanti; per l'infrarosso c'è l'idea degli indizi (vedi "Il Medico della peste"). Filtri in `tools/filtri.py` (prove in `art/prove-stile/08-filtri`), confronto sulle due stanze in `art/scene/foglio_scene_filtri.jpg`. **VHS al 50% di intensità** (26 ottobre): i difetti della videocassetta sono a metà, il colore dei filtri resta pieno (`VHS_AMOUNT` in `tools/filtri.py`; nell'anteprima animata è il valore di partenza). **Senza la banda di disturbo grossa** che scorreva sull'immagine: tolta il 26 ottobre, sia dal filtro fisso sia da quello animato. Le prove in `art/prove-stile` sono di prima: hanno ancora la banda e il VHS al 100%.
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
- **Domande e prove.** Si scelgono le domande da fare. Un indizio trovato (un piatto in più, una porta chiusa a chiave, il calore all'infrarosso) si può mettere davanti alla famiglia per smascherare una bugia o farsi aprire una porta. Le frasi delle persone compaiono in basso come sottotitoli della videocassetta; le domande del medico sono un elenco corto che appare solo quando tocca a lui.
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

- **La scrivania del medico**, vista dall'alto, in una stanza in affitto: la mappa di carta con le puntine, il fax col protocollo, il giornale del mattino, il televisore col videoregistratore per i nastri della sera. Tutto dentro il mondo, niente menu.

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
- `tools/filtri.py`: filtri finali per rendere omogenee immagini di stili diversi (verdi, infrarosso, VHS, fotocopia). Non usa l'AI, quindi non costa niente.
- Servizio: **fal.ai**. La chiave si legge da `FAL_KEY` (impostazioni dell'ambiente cloud) o da `~/.config/fal/key`; mai nel repo.
- Modelli:
  - **GPT Image 2** (`openai/gpt-image-2`, `/edit`): il migliore per scene nuove e trasformazioni di stile. Non fa sfondi trasparenti, e il filtro dei contenuti blocca parole come "soldato ferito" o "insanguinato", e anche i bambini in una scena horror: nelle scene niente bambini.
  - **Nano Banana Pro** (`fal-ai/nano-banana-pro/edit`): per modificare un'immagine lasciando il resto al suo posto (togliere persone, semplificare una stanza, sfondi nello stile, cambiare lo stato di un personaggio) e per mettere un personaggio di riferimento dentro la foto di una stanza.
  - **SAM 3** (`fal-ai/sam-3/image`): maschere dei personaggi da un testo ("person").
  - **BiRefNet v2** (`fal-ai/birefnet/v2`): ritaglio di una figura su fondo neutro.
  - **Flux 2 Max**: scartato, resa inferiore.
- Spesa per tutte le prove: circa 15 dollari.
- Steam chiede di dichiarare sulla pagina del gioco i contenuti generati con l'AI.

### 3D

NINAH è quasi tutto 2D. Per ora bastano sfondi 2D generati; il 3D servirebbe solo se il giocatore deve muoversi liberamente nelle stanze. Su fal ci sono modelli per oggetti 3D (Hunyuan3D, Trellis, Meshy); World Labs Marble genera stanze intere, ma richiede un account a parte.

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

- Nomi: il paese, i personaggi, la ditta. E in che paese siamo (l'Italia è accantonata).
- Tempi e budget.

## Prossimi passi

1. **Prototipo giocabile di una giornata** (scelto il 26 ottobre): la scrivania con fax, giornale e mappa; le due case con REC, zoom e sottotitoli, domande e prove, decisioni; la sera i nastri all'infrarosso.
2. Schede dei personaggi: un riferimento per ognuno, da usare in tutte le scene e in tutti gli stati.
3. Il gioco completo: famiglie, storia, giorni.

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
