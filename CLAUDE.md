# NotHuman

Videogioco per Steam in fase di ideazione: per ora non c'è codice di gioco. Si lavora in italiano.

- Le decisioni prese finora sono in `docs/riepilogo.md`: leggilo prima di proporre idee nuove.
- Le immagini si generano con fal.ai; la chiave API è nella variabile d'ambiente `FAL_KEY`. Non chiederla mai in chat.
- Il gioco: il Medico della peste, in un'ambientazione moderna (case povere di oggi in un paese sperduto).
- Stile grafico definitivo: partire sempre da stanze con pochi dettagli; stanza in foto con lo stile 07 fumetto underground al 20% (confermato: niente 30-40% né stanza tutta in foto), preso dalla stanza a fumetto ripulita (solo un accenno di tratto, niente intonaco scrostato, crepe o macchie in più); personaggi grotteschi ma ammorbiditi e quasi fotografici; tre filtri finali VHS animati, senza la banda di disturbo grossa: VHS per il giorno, VHS verde per la notte e il buio, VHS infrarosso (come usarli è da decidere; idea: con l'infrarosso si vedono gli indizi); per ora niente mano e bastone del medico sullo schermo (metodo in `docs/riepilogo.md`, sezione "Personaggi ammorbiditi").
- Le scene nuove si fanno con `tools/scena.py` (descrizione in `scena.json`, esempio in `art/scene/02-soggiorno`): esegue tutto il procedimento deciso.
- Per cambiare lo stato di un personaggio (febbre, bubboni...) passa sempre anche la sua immagine di riferimento, altrimenti la faccia cambia.
- GPT Image 2 rifiuta i bambini nelle scene horror: niente bambini nelle scene.
