# Il gioco delle cento porte (il nome è da trovare)

Un gioco nuovo, in preparazione dal 2 novembre 2026. Intanto **Malvento è in stand-by** («malvento per ora in stand
by»). Il 3 novembre il primo via, per una prova sola: **il primo prototipo**, in Godot, la stanza e la porta da
sfondare a pugni (vedi "Il primo prototipo", in fondo).

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
3. Riporti l'oggetto indietro e lo butti nel buco: ti dà soldi. Il buco c'è nella prima stanza e poi, nuovo, ogni dieci
   stanze.
4. Al terminale, accanto al buco, spendi i soldi: forza, resistenza, cibo e bevande, potenziamenti degli strumenti.
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

- Nelle stanze tra una porta e l'altra c'è un oggetto a terra, da riportare indietro fino al **buco**: ci butti
  l'oggetto e ricevi soldi.
- **Ogni dieci stanze un buco nuovo e un terminale nuovo** (3 novembre: «Ogni 10 stanze nuovo buco e terminale»): la
  strada del ritorno non si allunga mai oltre le dieci stanze (domande 20 e 22).
- Gli oggetti si portano **in mano, uno alla volta**; se così non funziona, **nello zaino** (19).
- Al **terminale** si comprano **solo** (22):
  - potenziamenti di **forza** e **resistenza**;
  - **cibo e bevande**, per tornare in forze senza dover riposare;
  - **potenziamenti degli strumenti** trovati.
- **L'energia cala a ogni colpo** e si recupera riposando, oppure subito mangiando e bevendo (21: «esatto»). Restano
  da decidere come si riposa e cosa succede quando l'energia finisce.
- In cooperativa **è tutto di squadra**: i soldi e i potenziamenti (23: «di squadra. Tutto.»).
- **Le stanze non si riempiono di nuovo:** gli oggetti che ci sono restano gli unici (25). Che oggetti, li sceglie
  Claude (24: «fai tu»; la proposta è tra le proposte di Claude).

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
- **Il motore:** Godot o Unity (16). Il primo prototipo è in Godot, come proposto.
- **Dove sta il progetto:** un repository nuovo o una cartella di questo (18). Per ora sta qui, nel repository di
  Malvento: questo foglio e la cartella `porte/`.
- **Il modo di colpire:** clic ripetuti o tempo giusto (2). Il primo prototipo ha i clic ripetuti; il tempo giusto si
  prova in uno dei prossimi.
- **L'energia:** come si riposa, e cosa succede quando finisce (svieni, o i colpi diventano deboli) (21).

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
domanda «da cosa ti sei nascosto?». Con un buco nuovo ogni dieci stanze il mistero può crescere: ogni buco un po'
diverso dal primo (più profondo, più caldo, qualcosa che risponde quando ci butti dentro le cose).

### Gli oggetti da buttare nel buco (24: «fai tu»)

Tre famiglie, che cambiano andando avanti nel bunker:

- **I rottami**, i più comuni: bulloni, tubi, lattine, una batteria scarica. Poco, ma sempre.
- **Le cose di chi c'era prima**, più rare e pagate meglio: una radio, una maschera antigas, un diario, una foto, una
  scatola di cartucce. Sono anche gli indizi della storia: chi si è nascosto nel bunker prima di te, e cosa è successo.
- **Le cose strane**, poche, pagate tanto: un barattolo che si muove, un sasso tiepido, un orologio che va al
  contrario. Alcune pesanti, da portare in due, o fastidiose: fanno rumore, perdono, scottano.

Gli oggetti di valore stanno più avanti: tornare indietro a raccogliere non conviene, e le stanze non si riempiono di
nuovo (25).

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
   (pugni, bastone, martello), da soli; si provano i due modi di colpire. Il 3 novembre la prima parte: **solo la
   stanza, la porta e i pugni** (vedi sotto).
2. **Il giro dei soldi** sulle prime dieci porte: il buco, il terminale, l'energia.
3. **Il multiplayer** a quattro, con Steam.
4. **Le cento porte**, gli strumenti, il bunker, la storia, il finale.
5. **Steam:** la pagina, il trailer, la demo.

## Il primo prototipo (3 novembre)

> Prima di tutto mi fai una prova con godot di solo la stanza e la porta, e l'animazione di picchiarla. Suoni effetti
> e tutto, fino a buttarla giù. Niente menu né niente, solo questo.

Sta in `porte/`: il progetto Godot in `porte/progetto` (Godot 4.7.2, Forward+, la fisica Jolt), i materiali di
partenza in `porte/art`, gli strumenti in `porte/strumenti`.

**Cosa c'è.** La stanza del bunker (cemento, tubi, casse, la lampadina nella gabbia che oscilla e sfarfalla ai colpi,
la polvere nell'aria) e la porta di legno sgangherata nel telaio di ferro, fatta di assi vere: ogni pugno lascia
un'ammaccatura con le crepe, la porta trema sui cardini e l'asse colpita rimbalza; dopo qualche colpo l'asse si spacca
in pezzi frastagliati, col legno chiaro dentro, e si vede di là; con tre assi rotte la porta cede, e il colpo dopo la
fa esplodere al rallentatore. Dietro, la stanza dopo, piccola, con la luce fredda, la porta più robusta (le fasce di
ferro e il lucchetto) e il bastone per terra. Le braccia in prima persona (Meshy), con le nocche fasciate: in guardia
respirano e ondeggiano, il pugno parte da un braccio alla volta, gira all'impatto e tocca davvero il legno; se la porta
è un po' più in là del braccio, il corpo si sporge col pugno. A ogni colpo il fermo immagine, la telecamera che trema,
la vibrazione del controller, le schegge che rimbalzano a terra, la polvere, i suoni a strati (le nocche, il legno, i
cardini, le crepe, l'asse che si spezza, l'esplosione, i detriti, il fruscio del braccio).

**I comandi.** Mouse per guardare, WASD per camminare, clic per il pugno (tenendo il ritmo, i pugni si alternano); R
rifà la porta; F11 o Alt+Invio lo schermo intero; Esc libera il mouse. Col controller: levette, RT, X o RB per il
pugno, Y per rifare la porta.

**Come si rifà.**

- Le texture (Poly Haven, CC0): `python3 porte/strumenti/texture.py`; le crepe e la polvere:
  `python3 porte/strumenti/texture_effetti.py`.
- Il braccio (GPT Image 2 e Meshy) e i suoni (ElevenLabs): i lavori in `porte/art/pugni/lavori.json` e
  `porte/art/suoni/lavori.json`, con `tools/fal_batch.py`.
- Il programma per Windows: `godot --headless --path porte/progetto --export-release "Windows Desktop"
  ../uscita/Porte.exe` (servono i modelli di esportazione di Godot 4.7.2).
- Il video: `godot --path porte/progetto --write-movie <cartella>/f.png --fixed-fps 30 -- --demo` (la dimostrazione
  gioca da sola: guarda la lampada, va alla porta, la sfonda, guarda di là e fa due passi verso il bastone; dopo un
  minuto si chiude comunque). La misura del video è quella della finestra: per cambiarla, un `override.cfg` nel
  progetto con `window/size/viewport_width` e `viewport_height` sotto `[display]` (non va nel repository); poi
  `ffmpeg` dai fotogrammi e da `f.wav`.
- Qui senza scheda video si disegna con lavapipe (`VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/lvp_icd.json`, sotto
  `xvfb-run`): va tutto, ombre e nebbia comprese, ma piano.

**Le prove** (`porte/progetto/prove`): `orienta.tscn` fa le foto del braccio girato, per scegliere la posa. Da lì si è
visto che il modello di Meshy è un braccio sinistro e che il materiale è a due facce: il destro è una copia specchiata
della mesh (con la scala negativa veniva nero).

**Spesa:** circa 2,50 dollari (le due foto del braccio con GPT Image 2, il modello di Meshy da 1,20, i quattordici
suoni di ElevenLabs); le texture di Poly Haven sono gratis (CC0).
