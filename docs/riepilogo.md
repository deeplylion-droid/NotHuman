# Riepilogo del progetto

Ultimo aggiornamento: 25 ottobre 2026.

## Obiettivo

Un gioco originale da vendere su Steam, nel filone dei giochi di ispezione e paranoia: *No, I'm Not a Human* (NINAH), *That's Not My Neighbor*, *Papers, Please*.

## Decisioni prese

- **Riferimento principale: NINAH.** È il preferito dei tre, ma il nostro gioco non deve somigliargli troppo. Ci piace il suo stile grafico.
- **Ambientazione italiana: accantonata** per ora.
- **Grafica: immagini generate interamente con l'AI**, di qualità alta. Niente ritocchi sopra immagini esistenti.
- **Ordine delle proposte:** 1. Medico della peste, 2. Ospedale, 3. Confessionale, 4. Barbiere.

## Cosa prendere da NINAH, e cosa no

Lo stile di NINAH, secondo le recensioni:
- sfondi che sembrano fotografie, mescolati a personaggi disegnati a mano e deformati;
- nessun volto è del tutto normale, quindi l'impostore non si riconosce "a occhio" e bisogna cercare gli indizi veri;
- filtro da videocassetta anni '80 rovinata (il filone "analog horror"), che diventa sempre più strano man mano che si gioca.

**Da tenere:** la paranoia, l'ambiguità, il disagio di avere i volti a un palmo dal naso.

**Da evitare:** la casa, la porta con lo spioncino, il sole che uccide, la TV che dice cosa cercare, far entrare o sparare ai visitatori.

## Le quattro proposte

### 1. Medico della peste

Nasce dall'idea del "Censimento", modificata. Durante un'epidemia di peste sei il medico e visiti le case. Le famiglie spesso nascondono un malato, o non sanno di averne uno. Confronti i sintomi e porti via le persone giuste; se sbagli, il paese si ammala.

- Obiettivo chiaro (fermare il contagio) e un motivo per mentire: chi viene portato via spesso non torna.
- Recupera la parte migliore di NINAH, cioè esaminare le persone in cerca di segni, dentro una struttura del tutto diversa.
- Indizi nella casa, non solo sul corpo: un piatto in più a tavola, bende sporche, una porta chiusa a chiave, un rumore dal piano di sopra.
- Il paese come mappa del contagio: ogni scelta cambia il modo in cui la malattia passa da una casa all'altra.
- Il dilemma: portare via un sano lo condanna, lasciare un malato condanna la strada.
- Idea da valutare: anche il medico può ammalarsi.
- Rischio: è il progetto più grande (tante case, tante famiglie).
- Concorrenza: *Pathologic*, che però è un gioco di ruolo enorme e di altro genere, e qualche gioco da game jam su itch.io.

### 2. Ospedale

Sei un'infermiera in un ospedale (in guerra o durante un'epidemia) e decidi a chi dare le cure e chi lasciar morire, per salvare più persone possibile. Tra i pazienti si nascondono sabotatori: se non li scopri, uccidono altri pazienti.

- Ogni notte muore qualcuno: è stata la ferita o il sabotatore?
- Triage e indagine devono essere la stessa azione: i sabotatori fingono ferite per avere un letto, rubano la morfina, manomettono le cure. Visitando i pazienti per decidere chi curare, si raccolgono anche gli indizi.
- Meglio in guerra che in epidemia, per non sovrapporsi al Medico della peste. La guerra dà al sabotatore un ruolo chiaro (una spia).
- I volti bendati alleggeriscono la grafica e alimentano il sospetto: chi c'è sotto le bende?
- I soldati sotto shock si comportano in modo strano: sospetti perfetti, ma innocenti.
- Concorrenza: *War Hospital* (2024, gestionale di un ospedale da campo nella Prima guerra mondiale, accoglienza tiepida); *Intensive[S]care* (piccolo gioco su itch.io: un'infermiera e un paziente che manomette le cure).

### 3. Confessionale

Sei il nuovo parroco di un paese isolato nella nebbia. Di notte i fedeli si confessano e dalla grata vedi solo frammenti: occhi, bocca, mani. Alcuni non sono più loro, e il segreto confessionale ti impedisce di dirlo.

- Pro: il più economico da realizzare graficamente (lo schermo è quasi tutto buio) e vive di scrittura.
- Contro: la nicchia del prete-horror si sta riempiendo (*What Have You Done, Father?*, *Seal of Confession* in sviluppo, *Deathless Death*). Tanto testo da scrivere e tradurre, che tende a rendere meno in streaming.

### 4. Barbiere

Una città mineraria isolata, anni '20. Ogni sabato i minatori vengono per barba e capelli. Da quando la Compagnia ha aperto il pozzo nuovo, alcuni di quelli che risalgono non sono più loro.

- L'ispezione è il mestiere: lavare la fuliggine, radere, tagliare i capelli. Ogni gesto rivela qualcosa.
- I pettegolezzi dei clienti sono indizi, da confrontare con il registro dei clienti abituali.
- In bottega c'è un canarino che a volte smette di cantare, ma non sempre ha ragione.
- Si decide col rasoio alla gola: lasciarlo andare, segnarlo con un piccolo taglio (il segnale per chi in città "se ne occupa") o fare da sé.
- La miniera rovina i corpi (dita mozzate, tosse nera, cicatrici): falsi sospetti naturali.
- Rischio: dipende moltissimo dalla qualità dei volti in primo piano.
- Concorrenza: *I Fell for Her*, un horror in stile PS1 in cui fai il barbiere, ma senza deduzione.

## Grafica

### Strada scelta

Immagini generate interamente con modelli di AI via API. Claude scrive i prompt, genera, guarda i risultati e scarta quelli venuti male.

- Servizio: **fal.ai**, una sola chiave per più modelli.
  - Nano Banana 2 (0,08 $ a immagine) e Nano Banana Pro (0,15 $): i più forti nel mantenere identico lo stesso personaggio in immagini diverse.
  - GPT Image 2, Flux 2 e Seedream 5: da confrontare per la resa.
- Ogni variante di un personaggio (sano, malato, nascosto...) si rigenera da capo partendo dal personaggio di riferimento.
- La chiave va salvata nelle impostazioni dell'ambiente cloud con il nome `FAL_KEY` (sotto "Network secrets" o "API credentials", altrimenti come variabile d'ambiente), mai incollata in chat. Viene letta solo all'avvio di una nuova sessione.
- Steam chiede di dichiarare sulla pagina del gioco i contenuti generati con l'AI.

### Prova prevista

Sul Medico della peste:
- la stessa scena (una famiglia in una casa del Seicento a lume di candela, con un malato nascosto) in tre stili e con tre modelli diversi;
- un test di coerenza: lo stesso personaggio in quattro stati (sano, con la febbre, con i segni della malattia avanzata, nascosto nel letto).

Stili da provare:
- **Foto sporca:** realismo quasi fotografico, desaturato, con grana analogica.
- **Grottesco dipinto:** illustrazione con volti esagerati e un po' sbagliati, come i personaggi di NINAH.
- **Olio fiammingo:** chiaroscuro alla Rembrandt, neri profondi, luce di candela.

### Scartato

- Il visore a binocolo (la vista attraverso le lenti della maschera).
- Ritoccare dipinti o foto esistenti aggiungendo i sintomi sopra.
- Librerie di foto stock: Adobe Stock vieta di mostrare le persone delle foto in luce negativa; Shutterstock lo permette solo con una licenza "sensitive use" a parte. Generated Photos vende volti sintetici, ma sono ritratti moderni da studio.
- NovelAI (fatto per lo stile anime) e Meshy (modelli 3D): non adatti ai volti di questo progetto.

## Idee accantonate

- **Esistenza in vita:** impiegato dell'anagrafe che certifica che i pensionati sono vivi, ma non tutti lo sono. Legata all'Italia.
- **Lazzaretto:** Milano 1630, peste e untori. Legata all'Italia; il ciclo "posto di blocco + contagio" è già di *Quarantine Zone*.

## Mercato

- *No, I'm Not a Human* ha superato il milione di copie (annuncio dell'editore, marzo 2026).
- *Quarantine Zone: The Last Check* ha venduto 750.000 copie in meno di un mese (uscito a gennaio 2026).
- Il genere vende, ma è affollato: serve un gancio che si spieghi in una frase.

## Domande aperte

- Tono: cupo fino in fondo come NINAH, o con un filo di umorismo nero?
- Motore: proposto Godot 4, da confermare.
- Tempi e budget.

## Prossimi passi

1. Creare la chiave su fal.ai e salvarla nell'ambiente come `FAL_KEY`.
2. Aprire una nuova sessione.
3. Fare la prova di stile e di coerenza sul Medico della peste, poi scegliere lo stile.

## Fonti

- [No, I'm Not a Human: vendite (Multiplayer.it)](https://multiplayer.it/notizie/lhorror-indie-no-im-not-a-human-ha-venduto-bene-ecco-quanto.html)
- [Quarantine Zone: oltre 750.000 copie](https://lnt.ma/?p=552852)
- [Recensione di NINAH (Adventure Game Hotspot)](https://adventuregamehotspot.com/review/5252/no-im-not-a-human)
- [Recensione di NINAH (Steam Deck HQ)](https://steamdeckhq.com/game-reviews/no-im-not-a-human/)
- [Pathologic 3 su Steam](https://store.steampowered.com/app/3199650/Pathologic_3)
- [War Hospital (Wikipedia)](https://en.wikipedia.org/wiki/War_Hospital)
- [Intensive[S]care (itch.io)](https://leinartlabs.itch.io/intensivescare)
- [What Have You Done, Father? (CogConnected)](https://cogconnected.com/2026/06/what-have-you-done-father-brings-its-chilling-confessional-horror-to-consoles/)
- [Seal of Confession su Steam](https://store.steampowered.com/app/4964530)
- [I Fell for Her](https://www.dekudeals.com/items/i-fell-for-her)
- [fal.ai: prezzi](https://fal.ai/pricing)
- [Confronto tra modelli di editing immagini 2026 (Atlas Cloud)](https://www.atlascloud.ai/blog/best-ai-image-editing-models-2026)
- [Shutterstock: licenza "sensitive use"](https://submit.shutterstock.com/help/en/articles/10594576-what-is-a-sensitive-use-license)
- [Adobe Stock: licenze](https://helpx.adobe.com/stock/how-to/adobe-stock-licenses.html)
- [Recensione di Generated Photos](https://fritz.ai/generated-photos-review/)
