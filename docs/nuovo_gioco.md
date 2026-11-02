# Il gioco delle cento porte (il nome è da trovare)

Un gioco nuovo, in preparazione dal 2 novembre 2026. **Si parte solo al via** («Non partiamo subito ma dammi delle
domande e inquadriamo il progetto in attesa del mio via!»). Intanto **Malvento è in stand-by** («malvento per ora in
stand by»).

Qui c'è tutto quello che è stato detto finora: l'idea, le risposte alle domande, quello che resta da decidere e, tenute
a parte, le proposte di Claude.

## L'idea

Con le parole di chi l'ha avuta (2 novembre):

> Grafica 3D alta qualità. Multiplayer fino a 4 giocatori. Inizi chiuso in una stanza, c'è una porta di legno
> sgangherata. Puoi darle pugni per sfondarla. Animazioni ed effetti dei pugni sulla porta devono essere molto
> soddisfacenti. Quando riesci a sfondarla trovi una nuova stanza piccola con una nuova porta, leggermente più robusta.
> A terra un nuovo strumento per sfondarla, leggermente migliore dei pugni. Così via per 100 porte diverse. Alla fine
> qualcosa di figo!

E subito dopo:

> Possiamo anche fare che in ogni stanza intermedia trovi qualcosa a terra che puoi portare nella prima stanza dove c'è
> un buco dove puoi buttarla e in cambio ti dà soldi, che puoi spendere a un terminale per avere upgrade della tua
> forza/resistenza o comprare bevande o cibo per tornare in forze senza dover riposare. O anche upgrade degli strumenti
> sbloccati!

## Il giro di gioco

1. Sfondi la porta a colpi: all'inizio a pugni.
2. Nella stanza nuova, piccola, trovi a terra lo strumento nuovo (vale per tutti i giocatori) e un oggetto.
3. Riporti l'oggetto nella prima stanza e lo butti nel buco: ti dà soldi.
4. Al terminale spendi i soldi: forza, resistenza, cibo e bevande, potenziamenti degli strumenti.
5. Torni avanti e sfondi la porta dopo, un po' più robusta.

Cento porte, due o tre ore; alla fine, il finale.

## Deciso (le risposte del 2 novembre)

### Il colpo

- **In prima persona:** si vedono i propri pugni, e poi lo strumento in mano.
- **Come si colpisce:** a clic ripetuti, oppure col tempo giusto (un ritmo, o un punto debole che si illumina): «a o
  c». Si decide provandoli tutti e due nel primo prototipo.
- **Distruzione esagerata, da cartone:** le porte esplodono in pezzi.
- Le animazioni e gli effetti dei colpi devono essere **molto soddisfacenti**: è il cuore del gioco.

### Le porte

- Cento porte, una per stanza; ogni porta un po' più robusta di quella prima; le stanze sono piccole.
- Si comincia da una porta di legno sgangherata.
- Alcune porte **cambiano le regole** («ci sta»).

### Gli strumenti

- In ogni stanza, a terra, uno strumento nuovo, un po' migliore di quello prima. Si comincia coi pugni.
- Anche **strumenti assurdi** («assolutamente anche assurde»).
- Quelli trovati restano e **si potenziano al terminale**.
- In cooperativa lo strumento a terra **vale per tutti**.

### I soldi: il buco e il terminale

- Nelle stanze tra una porta e l'altra c'è un oggetto a terra, da riportare nella prima stanza: lì c'è un **buco**, ci
  butti l'oggetto e ricevi soldi.
- Al **terminale** si comprano:
  - potenziamenti di **forza** e **resistenza**;
  - **cibo e bevande**, per tornare in forze senza dover riposare;
  - **potenziamenti degli strumenti** trovati.
- Quindi i colpi consumano un'energia, che si recupera riposando oppure subito mangiando e bevendo. Come funzioni di
  preciso è da decidere (domanda 21).

### Durata e difficoltà

- La partita intera dura **due o tre ore**.
- **Per ora non si perde**, «ma pensiamoci».

### Multiplayer

- **Cooperativo**, fino a quattro giocatori, **online**.
- Deve essere **bello anche da soli**.

### Il mondo e la storia

- **Un bunker.** Ti sei nascosto lì dentro tempo fa, ma ora vuoi uscire. **Ma da cosa ti sei nascosto?**
- Il finale, «qualcosa di figo», è la risposta a quella domanda.

### Produzione

- Esce su **Steam**, per PC.
- Motore: **Godot o Unity** (da scegliere: vedi le proposte).
- Grafica 3D di alta qualità, con **Meshy usato bene e Blender**.
- **Fa tutto Claude** («Farai tutto tu»): codice, modelli, animazioni, effetti, suoni, musica, pagina Steam.

## Da decidere

- **Il nome** (domanda 14).
- **Da cosa ti sei nascosto**, e quindi il finale (12 e 13). E il tono: la domanda fa pensare al mistero, la
  distruzione da cartone al divertimento; tutti e due insieme possono funzionare.
- **Si può perdere?** Per ora no (8).
- **Il motore:** Godot o Unity (16).
- **Dove sta il progetto:** un repository nuovo o una cartella di questo (18). Per ora questo foglio sta qui, nel
  repository di Malvento.
- **Il modo di colpire:** clic ripetuti o tempo giusto (2), da decidere sul prototipo.
- **Le domande sui soldi**, ancora senza risposta:
  - 19. Gli oggetti si portano in mano, uno alla volta, e si possono far cadere o lanciare, o vanno in uno zaino? Ci
    sono oggetti pesanti da portare in due?
  - 20. La strada del ritorno: va bene camminare, o ogni tanto si apre una scorciatoia (un montacarichi, uno scivolo,
    un buco nuovo ogni 10 porte)?
  - 21. L'energia cala a ogni colpo? Senza cibo come si recupera: sedendosi o dormendo per un po'? E se finisce cosa
    succede: svieni, o i colpi diventano deboli?
  - 22. Il terminale è solo nella prima stanza? Oltre a forza, resistenza, cibo, bevande e potenziamenti degli
    strumenti, vende altro (indizi, mappe, cosmetici)?
  - 23. In quattro, i soldi sono di squadra o di ognuno? E i potenziamenti?
  - 24. Gli oggetti sono tutti dello stesso tipo, per esempio rottami, o diversi, con alcuni rari e preziosi e alcuni
    strani o pericolosi?
  - 25. Le stanze già passate si riempiono di nuovo di oggetti, o quelli che ci sono restano gli unici?

## Le proposte di Claude (non ancora decise)

### Il motore: Godot 4

- **Si può provare qui.** Godot gira su Linux anche senza scheda video, più lento: posso giocarlo, fare foto e video e
  preparare il programma per Windows. Con Unity scriverei codice senza poterlo provare. Da verificare per prima cosa al
  via.
- È gratuito, senza percentuali sulle vendite.
- Per Steam (inviti, lobby, la rete tra i quattro giocatori) c'è GodotSteam.
- Per i pezzi che volano c'è la fisica Jolt, dentro Godot dalla versione 4.4.
- La grafica di alta qualità (luci, ombre, riflessi, post-processing) la fa il motore di disegno Forward+.

### Il repository

Un repository nuovo su GitHub solo per questo gioco, così Malvento resta com'è. Lo crei tu, o me lo chiedi, e lo
collego alla sessione; questo foglio poi ci si sposta.

### Il buco

Il buco che paga è un mistero da usare: chi c'è là sotto, e perché paga? Può essere il filo che porta al finale, e alla
domanda «da cosa ti sei nascosto?».

### La strada del ritorno

Alla porta 80 il buco è a 80 stanze di distanza: senza scorciatoie si cammina più che giocare. Per esempio ogni 10 porte
un montacarichi, uno scivolo o un tubo pneumatico che riporta alla prima stanza.

### Il colpo che soddisfa (la lista di lavoro)

- Il suono a strati: l'impatto, il materiale (legno, metallo, vetro), l'eco del bunker; e la vibrazione del controller.
- Un istante di fermo immagine all'impatto, e la telecamera che trema.
- La porta che cede a stadi: crepe che crescono, assi che saltano, cardini che si piegano.
- Schegge, polvere, scintille secondo il materiale; i pezzi restano a terra.
- L'ultimo colpo al rallentatore, con la porta che esplode.

### Porte che cambiano le regole (idee)

- Di vetro: si rompe solo col colpo al momento giusto.
- Che si ripara da sola se smetti di colpire.
- Da colpire in più giocatori nello stesso istante (da soli, con un aiuto che si compra).
- Elettrificata: prima va staccata la corrente.
- Blindata, da aprire con la leva invece che a colpi.

### Strumenti (idee, dai normali agli assurdi)

Pugni, bastone, martello, piede di porco, ascia, mazza, ariete, trapano, motosega, martello pneumatico, esplosivo; e gli
assurdi: un pesce surgelato, una padella, un'ancora, un guanto a razzo.

### I rischi

- **La ripetizione:** cento porte annoiano se cambiano solo i numeri; ogni tanto una porta deve cambiare le regole.
- **Il ritorno al buco**, sempre più lungo (vedi sopra).
- **L'equilibrio:** se i potenziamenti contano troppo, gli strumenti nuovi non servono, e viceversa; e se si possono
  accumulare soldi all'infinito, basta tornare indietro a raccogliere roba.
- **Il multiplayer:** gli oggetti da portare e i pezzi che volano vanno sincronizzati tra i quattro giocatori.

## Il piano, al via

1. **Il prototipo del colpo:** una stanza, tre porte (legno marcio, legno pieno, una con la serratura), tre strumenti
   (pugni, bastone, martello), da soli; si provano i due modi di colpire.
2. **Il giro dei soldi** sulle prime dieci porte: il buco, il terminale, l'energia.
3. **Il multiplayer** a quattro, con Steam.
4. **Le cento porte**, gli strumenti, il bunker, la storia, il finale.
5. **Steam:** la pagina, il trailer, la demo.
