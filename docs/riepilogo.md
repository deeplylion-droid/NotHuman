# Riepilogo del progetto

Ultimo aggiornamento: 25 ottobre 2026.

## Obiettivo

Un gioco originale da vendere su Steam, nel filone dei giochi di ispezione e paranoia: *No, I'm Not a Human* (NINAH), *That's Not My Neighbor*, *Papers, Please*.

## Decisioni prese

- **Riferimento principale: NINAH.** È il preferito dei tre e vogliamo il suo "feel" grafico, ma il gioco non deve somigliargli troppo.
- **Candidato unico, per ora: il Medico della peste.** Ospedale, Barbiere e Confessionale sono accantonati.
- **Ambientazione: moderna.** Case povere di oggi in un paese sperduto dove la peste è tornata. Il villaggio rurale è accantonato.
- **Ambientazione italiana: accantonata** per ora.
- **Lo stile grafico è deciso:**
  - **Stanza:** foto con lo stile 07 fumetto underground al 20%, come nella combinazione 02 (`art/prove-stile/06-cucina`).
  - **Personaggi grotteschi ma ammorbiditi, quasi fotografici** (scelta del 26 ottobre): `art/prove-stile/11-personaggi-50/c_ammorbiditi_sfondo20.jpg`. Hanno preso il posto dei personaggi a fumetto al 100%. Metodo in "Personaggi ammorbiditi".
  - **Filtro finale: VHS** per le scene normali e **VHS verde** per le scene al buio (`art/prove-stile/08-filtri`, `tools/filtri.py`). Se il VHS dà fastidio, si attenua.
  - **Il VHS sarà animato**, calcolato in tempo reale (uno shader): grana e tremolio delle righe a ogni fotogramma, una banda di disturbo che sale lentamente, il rumore della testina in fondo, uno strappo ogni tanto, e uno strappo più forte quando si passa alla scena al buio. Anteprima con intensità regolabile: https://claude.ai/artifact/RU45gcnW8J3ttttUTSde2R (copia in `art/prove-stile/09-vhs-animato`; lo shader WebGL è la base per quello del gioco).
  - La mano e il bastone del medico seguono i personaggi.
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
- Idea da valutare: anche il medico può ammalarsi.
- Idea da valutare: la peste potrebbe essere l'unica cosa rossa sullo schermo (macchie e bubboni), così l'occhio va dritto agli indizi.
- Rischio: è un progetto grande (tante case, tante famiglie).
- Concorrenza: *Pathologic*, che però è un gioco di ruolo enorme e di altro genere, e qualche gioco da game jam su itch.io.

## Grafica

### Metodo attuale (stile al 20% sullo sfondo, 100% sui personaggi)

1. **Scena di partenza:** una stanza semplice con i personaggi e la mano del medico, in resa fotografica. Si genera intera, oppure si monta con `tools/schermata.py` da sfondo e ritagli.
2. **Stile pieno:** la scena viene ridisegnata da capo nello stile scelto (GPT Image 2, modifica di immagine), con personaggi deformi e disegnati.
3. **Maschere:** SAM 3 ritaglia i personaggi ("person") e il bastone dalla versione trasformata.
4. **Sfondo pulito:** la stanza senza persone né mano, ottenuta togliendole dalla foto (Nano Banana Pro), oppure la stanza vuota già esistente.
5. **Sfondo nello stile:** la stanza vuota trasformata nello stesso stile. Va fatta con Nano Banana Pro, che lascia gli oggetti al loro posto; con GPT gli oggetti si spostano e nel mescolamento compaiono doppi.
6. **Montaggio:** `tools/intensita.py` fa lo sfondo con 80% di foto e 20% di sfondo trasformato, e sopra mette i personaggi nello stile pieno. L'intensità dello sfondo è un numero nel file della scena.
7. **Filtro:** `tools/filtri.py` con `vhs` o `vhs_verde` (nel gioco sarà lo shader animato).

Attenzione: i modelli a volte inventano dettagli (per esempio una faccia nel televisore). Si guardano sempre i risultati e si rigenera chiedendo di non aggiungerli.

### Personaggi ammorbiditi (il metodo scelto)

1. Scena a fumetto, come al passo 2 del metodo sopra.
2. Nano Banana Pro rifà in foto solo i personaggi e la mano del medico, lasciando il resto com'è e **senza** passare il riferimento a fumetto: le deformità si ammorbidiscono, ed è proprio l'effetto voluto (prompt in `art/prove-stile/11-personaggi-50/lavori.json`).
3. SAM 3 fa le maschere dei personaggi e del bastone sulla versione in foto.
4. `tools/intensita.py` monta i personaggi sulla stanza al 20% (esempio: `art/prove-stile/11-personaggi-50/scena_c.json`), poi `tools/filtri.py` applica il VHS.

D'ora in poi il riferimento del padre per gli altri stati e inquadrature è `art/prove-stile/11-personaggi-50/padre_riferimento_ammorbidito.jpg`.

Mescolare i personaggi a un'intensità intermedia (per esempio 50% foto e 50% fumetto) funziona solo se le due versioni hanno le stesse sagome e le stesse facce, altrimenti si vedono due paia di occhi (`intensita_personaggi` e `personaggi_originale` in `tools/intensita.py`).

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
- `09-vhs-animato`: anteprima del VHS animato in tempo reale, con intensità regolabile.
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
- Scelta finale: VHS e VHS verde, sulla 02.

### Strumenti

- `tools/fal_batch.py`: genera immagini su fal.ai da un file di lavori JSON; passa immagini locali con `@file:` e salva anche le maschere dei modelli di segmentazione.
- `tools/schermata.py`: monta una schermata a strati; con un "trattamento" applica la resa unica, senza fa solo il montaggio.
- `tools/intensita.py`: applica lo stile con intensità diverse a sfondo e personaggi; con "buio" fa sprofondare la stanza nel buio fuori da un cono di luce.
- `tools/filtri.py`: filtri finali per rendere omogenee immagini di stili diversi (verdi, VHS, fotocopia). Non usa l'AI, quindi non costa niente.
- Servizio: **fal.ai**. La chiave si legge da `FAL_KEY` (impostazioni dell'ambiente cloud) o da `~/.config/fal/key`; mai nel repo.
- Modelli:
  - **GPT Image 2** (`openai/gpt-image-2`, `/edit`): il migliore per scene nuove e trasformazioni di stile. Non fa sfondi trasparenti, e il filtro dei contenuti blocca parole come "soldato ferito" o "insanguinato".
  - **Nano Banana Pro** (`fal-ai/nano-banana-pro/edit`): per modificare un'immagine lasciando il resto al suo posto (togliere persone, semplificare una stanza, sfondi nello stile, cambiare lo stato di un personaggio) e per mettere un personaggio di riferimento dentro la foto di una stanza.
  - **SAM 3** (`fal-ai/sam-3/image`): maschere dei personaggi da un testo ("person").
  - **BiRefNet v2** (`fal-ai/birefnet/v2`): ritaglio di una figura su fondo neutro.
  - **Flux 2 Max**: scartato, resa inferiore.
- Spesa per tutte le prove: circa 13,5 dollari.
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

- Metodo di produzione delle scene: "passaggio unico" con Nano Banana Pro, o la ricetta 20% / 100%?
- Tono: cupo fino in fondo, o con un filo di umorismo nero?
- Motore: proposto Godot 4, da confermare.
- Tempi e budget.

## Prossimi passi

1. Decidere il metodo di produzione delle scene, guardando la prova di coerenza.
2. Schede dei personaggi: un riferimento per ognuno, da usare in tutte le scene.
3. Schermata completa nello stile scelto (02 con VHS): interfaccia e riquadro del dettaglio esaminato.
4. Prototipo giocabile del ciclo base (motore proposto: Godot 4).

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
