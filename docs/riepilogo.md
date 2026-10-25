# Riepilogo del progetto

Ultimo aggiornamento: 25 ottobre 2026.

## Obiettivo

Un gioco originale da vendere su Steam, nel filone dei giochi di ispezione e paranoia: *No, I'm Not a Human* (NINAH), *That's Not My Neighbor*, *Papers, Please*.

## Decisioni prese

- **Riferimento principale: NINAH.** È il preferito dei tre e vogliamo il suo "feel" grafico, ma il gioco non deve somigliargli troppo.
- **Ambientazione italiana: accantonata** per ora.
- **Niente ambientazioni storiche:** né Seicento né Ottocento. Tutto si svolge in un presente distopico o alternativo.
- **Candidati rimasti: Medico della peste e Ospedale.** Barbiere e Confessionale sono accantonati.
- **Grafica:** immagini generate con l'AI, montate a strati e trattate per sembrare schermate di gioco (vedi sotto). Niente fotogrammi "da film".

## Cosa prendere da NINAH, e cosa no

Come è fatto NINAH (studiato dalle schermate della pagina Steam):
- stanze ricavate da foto vere di appartamenti, ridotte a pochi colori, retinate, sgranate e virate (ombre verde-azzurre, luci rosa);
- personaggi grotteschi, a metà tra foto e disegno, ritagliati e incollati sopra lo sfondo;
- vignetta scura e arrotondata ai bordi, leggero effetto grandangolo;
- l'arma del giocatore in primo piano, come in uno sparatutto in prima persona;
- interfaccia minima: riquadri di testo con le scelte, e un riquadro con il dettaglio del corpo esaminato (per esempio le mani);
- poche parti in 3D a bassa risoluzione; il resto è 2D.

**Da tenere:** il metodo a strati e il trattamento grafico, la paranoia, l'ambiguità, i volti da vicino.

**Da evitare:** la casa da difendere, la porta con lo spioncino, il sole che uccide, la TV che dice cosa cercare, far entrare o sparare ai visitatori. Palette e interfaccia devono essere nostre, non copiate.

## I due candidati

### 1. Medico della peste

Presente distopico: la peste è tornata. In un paese sperduto di montagna, l'unico a combatterla è un medico della peste con gli abiti antichi (maschera a becco, cappello, cappotto incerato, bastone), fuori posto tra auto arrugginite, parabole e finestre sigillate col nastro.

Il medico visita le case. Le famiglie spesso nascondono un malato, o non sanno di averne uno. Confronta i sintomi e porta via le persone giuste; se sbaglia, il paese si ammala.

- Obiettivo chiaro (fermare il contagio) e un motivo per mentire: chi viene portato via spesso non torna.
- Recupera la parte migliore di NINAH, cioè esaminare le persone in cerca di segni, dentro una struttura diversa.
- Indizi nella casa, non solo sul corpo: un piatto in più a tavola, una porta socchiusa su un corridoio buio, un rumore dal piano di sopra.
- Il paese come mappa del contagio: ogni scelta cambia il modo in cui la malattia passa da una casa all'altra.
- Il dilemma: portare via un sano lo condanna, lasciare un malato condanna la strada.
- Idea da valutare: anche il medico può ammalarsi.
- Rischio: è il progetto più grande (tante case, tante famiglie).
- Concorrenza: *Pathologic*, che però è un gioco di ruolo enorme e di altro genere, e qualche gioco da game jam su itch.io.

### 2. Ospedale

Una guerra di oggi, ma in una realtà alternativa dove la tecnologia si è fermata agli anni '40: niente elettronica, solo flebo in bottiglie di vetro, telefoni a manovella, lampade a olio e lampadine nude. L'ospedale da campo è una palestra requisita.

Sei un'infermiera e decidi a chi dare le cure e chi lasciar morire, per salvare più persone possibile. Tra i pazienti si nascondono sabotatori: se non li scopri, uccidono altri pazienti.

- Ogni notte muore qualcuno: è stata la ferita o il sabotatore?
- Triage e indagine devono essere la stessa azione: i sabotatori fingono ferite per avere un letto, rubano la morfina, manomettono le cure. Visitando i pazienti per decidere chi curare, si raccolgono anche gli indizi.
- I volti bendati alleggeriscono la grafica e alimentano il sospetto: chi c'è sotto le bende?
- I soldati sotto shock si comportano in modo strano: sospetti perfetti, ma innocenti.
- Concorrenza: *War Hospital* (2024, gestionale di un ospedale da campo nella Prima guerra mondiale, accoglienza tiepida); *Intensive[S]care* (piccolo gioco su itch.io: un'infermiera e un paziente che manomette le cure).

## Grafica

### Metodo

Ogni schermata si costruisce a strati, come in NINAH:
1. **Sfondo:** foto della stanza vuota, generata con l'AI come una normale foto amatoriale ben esposta (il buio e l'atmosfera arrivano dopo, col trattamento).
2. **Personaggi, mano in prima persona, dettagli da esaminare:** generati a parte su fondo grigio neutro, poi ritagliati.
3. **Montaggio:** i personaggi vengono incollati sullo sfondo, con i colori adattati e un leggero contorno scuro "da ritaglio".
4. **Trattamento comune:** bassa risoluzione, leggero grandangolo, viraggio su una palette, pochi colori con retinatura, pixel netti, vignetta arrotondata. Così immagini diverse sembrano tutte dello stesso gioco.
5. **Interfaccia:** stato in alto, riquadro del dettaglio esaminato, dialogo con le scelte, comandi.

Palette: per il Medico della peste verde bile, ocra e osso; per l'Ospedale inchiostro, viola e ambra.

Prove fatte (in `art/prove-stile/`):
- `01-stili`: la stessa scena del Seicento in tre stili e con tre modelli. Superata: niente più ambientazioni storiche.
- `02-presente-distopico`: scene nel presente distopico. Belle, ma sembravano fotogrammi di un film, non un gioco.
- `03-schermate`: le due schermate di gioco con il metodo a strati. È la direzione attuale.

### Strumenti

- `tools/fal_batch.py`: genera immagini su fal.ai a partire da un file di lavori JSON; salva immagini e registro (parametri, seed, tempi).
- `tools/schermata.py`: monta una schermata da un file di scena JSON (sfondo, livelli, trattamento, interfaccia).
- Servizio: **fal.ai**. La chiave si legge da `FAL_KEY` (impostazioni dell'ambiente cloud) o da `~/.config/fal/key`; mai nel repo.
- Modelli:
  - **GPT Image 2** (`openai/gpt-image-2`): il migliore per sfondi e personaggi. Non fa sfondi trasparenti, e il filtro dei contenuti blocca parole come "soldato ferito" o "insanguinato".
  - **Nano Banana Pro** (`fal-ai/nano-banana-pro`, `/edit`): per modificare un'immagine esistente (per esempio togliere un oggetto) e come alternativa quando GPT rifiuta.
  - **BiRefNet v2** (`fal-ai/birefnet/v2`): per ritagliare personaggi e mani.
  - **Flux 2 Max**: scartato, resa inferiore.
- Spesa per tutte le prove: circa 5 dollari.
- Steam chiede di dichiarare sulla pagina del gioco i contenuti generati con l'AI.

### 3D

NINAH è quasi tutto 2D. Per ora bastano sfondi 2D generati; il 3D servirebbe solo se il giocatore deve muoversi liberamente nelle stanze. Su fal ci sono modelli per oggetti 3D (Hunyuan3D, Trellis, Meshy); World Labs Marble genera stanze intere, ma richiede un account a parte.

### Scartato

- Il visore a binocolo (la vista attraverso le lenti della maschera).
- Ritoccare dipinti o foto esistenti aggiungendo i sintomi sopra.
- Stili storici (olio fiammingo, Seicento) e immagini "da film".
- Librerie di foto stock: Adobe Stock vieta di mostrare le persone delle foto in luce negativa; Shutterstock lo permette solo con una licenza "sensitive use" a parte. Generated Photos vende volti sintetici, ma sono ritratti moderni da studio.
- NovelAI (fatto per lo stile anime) e Meshy (modelli 3D): non adatti ai volti di questo progetto.

## Idee accantonate

- **Barbiere:** città mineraria, il barbiere esamina i clienti mentre li rade. Ultima versione: un paese sperduto dove il tempo si è fermato al secolo scorso.
- **Confessionale:** un parroco che dalla grata vede solo frammenti dei fedeli.
- **Esistenza in vita:** impiegato dell'anagrafe che certifica che i pensionati sono vivi, ma non tutti lo sono. Legata all'Italia.
- **Lazzaretto:** Milano 1630, peste e untori. Legata all'Italia; il ciclo "posto di blocco + contagio" è già di *Quarantine Zone*.

## Mercato

- *No, I'm Not a Human* ha superato il milione di copie (annuncio dell'editore, marzo 2026).
- *Quarantine Zone: The Last Check* ha venduto 750.000 copie in meno di un mese (uscito a gennaio 2026).
- Il genere vende, ma è affollato: serve un gancio che si spieghi in una frase.

## Domande aperte

- Quale dei due candidati?
- Personaggi più "disegnati" e grotteschi come in NINAH, o più fotografici come nelle prove attuali?
- Tono: cupo fino in fondo, o con un filo di umorismo nero?
- Motore: proposto Godot 4, da confermare.
- Tempi e budget.

## Prossimi passi

1. Scegliere tra Medico della peste e Ospedale guardando le due schermate.
2. Rifinire lo stile del candidato scelto (personaggi, palette, interfaccia).
3. Prototipo giocabile del ciclo base.

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
