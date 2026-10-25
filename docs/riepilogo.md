# Riepilogo del progetto

Ultimo aggiornamento: 25 ottobre 2026.

## Obiettivo

Un gioco originale da vendere su Steam, nel filone dei giochi di ispezione e paranoia: *No, I'm Not a Human* (NINAH), *That's Not My Neighbor*, *Papers, Please*.

## Decisioni prese

- **Riferimento principale: NINAH.** È il preferito dei tre e vogliamo il suo "feel" grafico, ma il gioco non deve somigliargli troppo.
- **Candidato unico, per ora: il Medico della peste.** Ospedale, Barbiere e Confessionale sono accantonati.
- **Ambientazione italiana: accantonata** per ora.
- **Stili scelti: 04 linoleografia espressionista e 07 fumetto underground** (vedi `art/prove-stile/04-villaggio`).
- **Tecnica:** lo stile si applica al 20% sullo sfondo e al 100% sui personaggi (anche mano e bastone del medico). I personaggi devono essere deformi e disegnati.
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

La peste è tornata. In un paese sperduto l'unico a combatterla è un medico della peste con gli abiti antichi (maschera a becco, cappello, cappotto incerato, bastone).

Il medico visita le case. Le famiglie spesso nascondono un malato, o non sanno di averne uno. Confronta i sintomi e porta via le persone giuste; se sbaglia, il paese si ammala.

- Obiettivo chiaro (fermare il contagio) e un motivo per mentire: chi viene portato via spesso non torna.
- Recupera la parte migliore di NINAH, cioè esaminare le persone in cerca di segni, dentro una struttura diversa.
- Indizi nella casa, non solo sul corpo: un piatto o una ciotola in più a tavola, una porta socchiusa su un corridoio buio, una tenda che nasconde un'alcova, un rumore dal piano di sopra.
- Il paese come mappa del contagio: ogni scelta cambia il modo in cui la malattia passa da una casa all'altra.
- Il dilemma: portare via un sano lo condanna, lasciare un malato condanna la strada.
- Idea da valutare: anche il medico può ammalarsi.
- Idea da valutare: con uno stile in bianco e nero, la peste potrebbe essere l'unica cosa a colori (macchie e bubboni in rosso).
- Rischio: è un progetto grande (tante case, tante famiglie).
- Concorrenza: *Pathologic*, che però è un gioco di ruolo enorme e di altro genere, e qualche gioco da game jam su itch.io.

**Ambientazione, ancora da decidere tra due prove:**
- un villaggio rurale povero, epoca indefinita: capanne, candele, niente elettricità (`art/prove-stile/04-villaggio`, `05-intensita`);
- un presente distopico: case moderne e povere, come la cucina con il televisore (`art/prove-stile/06-cucina`).

## Grafica

### Metodo attuale (stile al 20% sullo sfondo, 100% sui personaggi)

1. **Scena di partenza:** una stanza semplice con i personaggi e la mano del medico, in resa fotografica. Si genera intera, oppure si monta con `tools/schermata.py` da sfondo e ritagli.
2. **Stile pieno:** la scena viene ridisegnata da capo nello stile scelto (GPT Image 2, modifica di immagine), con personaggi deformi e disegnati.
3. **Maschere:** SAM 3 ritaglia i personaggi ("person") e il bastone dalla versione trasformata.
4. **Sfondo pulito:** la stanza senza persone né mano, ottenuta togliendole dalla foto (Nano Banana Pro), oppure la stanza vuota già esistente.
5. **Sfondo nello stile:** la stanza vuota trasformata nello stesso stile. Va fatta con Nano Banana Pro, che lascia gli oggetti al loro posto; con GPT gli oggetti si spostano e nel mescolamento compaiono doppi.
6. **Montaggio:** `tools/intensita.py` fa lo sfondo con 80% di foto e 20% di sfondo trasformato, e sopra mette i personaggi nello stile pieno. L'intensità dello sfondo è un numero nel file della scena.

Attenzione: i modelli a volte inventano dettagli (per esempio una faccia nel televisore). Si guardano sempre i risultati e si rigenera chiedendo di non aggiungerli.

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

Questionario con tutte le combinazioni della cucina, con i voti salvati: https://claude.ai/artifact/3TEf1Gyxsk5XU5saPN3K6r

### Strumenti

- `tools/fal_batch.py`: genera immagini su fal.ai da un file di lavori JSON; passa immagini locali con `@file:` e salva anche le maschere dei modelli di segmentazione.
- `tools/schermata.py`: monta una schermata a strati; con un "trattamento" applica la resa unica, senza fa solo il montaggio.
- `tools/intensita.py`: applica lo stile con intensità diverse a sfondo e personaggi; con "buio" fa sprofondare la stanza nel buio fuori da un cono di luce.
- Servizio: **fal.ai**. La chiave si legge da `FAL_KEY` (impostazioni dell'ambiente cloud) o da `~/.config/fal/key`; mai nel repo.
- Modelli:
  - **GPT Image 2** (`openai/gpt-image-2`, `/edit`): il migliore per scene e trasformazioni di stile. Non fa sfondi trasparenti, e il filtro dei contenuti blocca parole come "soldato ferito" o "insanguinato".
  - **Nano Banana Pro** (`fal-ai/nano-banana-pro/edit`): per modificare un'immagine lasciando gli oggetti al loro posto (togliere persone, semplificare una stanza, sfondi nello stile).
  - **SAM 3** (`fal-ai/sam-3/image`): maschere dei personaggi da un testo ("person").
  - **BiRefNet v2** (`fal-ai/birefnet/v2`): ritaglio di una figura su fondo neutro.
  - **Flux 2 Max**: scartato, resa inferiore.
- Spesa per tutte le prove: circa 11 dollari.
- Steam chiede di dichiarare sulla pagina del gioco i contenuti generati con l'AI.

### 3D

NINAH è quasi tutto 2D. Per ora bastano sfondi 2D generati; il 3D servirebbe solo se il giocatore deve muoversi liberamente nelle stanze. Su fal ci sono modelli per oggetti 3D (Hunyuan3D, Trellis, Meshy); World Labs Marble genera stanze intere, ma richiede un account a parte.

### Scartato

- Il visore a binocolo (la vista attraverso le lenti della maschera).
- Ritoccare dipinti o foto esistenti aggiungendo i sintomi sopra.
- Stili storici (olio fiammingo, Seicento) e immagini "da film".
- Stanze troppo cariche di dettagli.
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

- Villaggio rurale o presente distopico?
- 04 linoleografia o 07 fumetto underground?
- Tono: cupo fino in fondo, o con un filo di umorismo nero?
- Motore: proposto Godot 4, da confermare.
- Tempi e budget.

## Prossimi passi

1. Scegliere ambientazione e stile.
2. Schermata completa nello stile scelto: interfaccia e riquadro del dettaglio esaminato.
3. Prova di coerenza: lo stesso personaggio in più stati (sano, malato, nascosto), sempre riconoscibile.
4. Prototipo giocabile del ciclo base.

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
