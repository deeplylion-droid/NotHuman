# NotHuman

Videogioco per Steam in fase di ideazione. C'è un primo prototipo web di una giornata in `gioco/` (immagini preparate da `tools/prepara_gioco.py`). Si lavora in italiano.

- Le decisioni prese finora sono in `docs/riepilogo.md`: leggilo prima di proporre idee nuove.
- Le immagini si generano con fal.ai; la chiave API è nella variabile d'ambiente `FAL_KEY`. Non chiederla mai in chat.
- Il gioco: il Medico della peste, in un'ambientazione moderna (case povere di oggi in un paese sperduto).
- Stile grafico definitivo: partire sempre da stanze con pochi dettagli; stanza in foto con lo stile 07 fumetto underground al 20% (confermato: niente 30-40% né stanza tutta in foto), preso dalla stanza a fumetto ripulita (solo un accenno di tratto, niente intonaco scrostato, crepe o macchie in più); personaggi grotteschi ma ammorbiditi e quasi fotografici; tre filtri finali VHS animati, al 50% di intensità e senza la banda di disturbo grossa: VHS per il giorno, VHS verde per la notte e il buio, VHS infrarosso (si usa la sera sui nastri, per scoprire il calore); per ora niente mano e bastone del medico sullo schermo (metodo in `docs/riepilogo.md`, sezione "Personaggi ammorbiditi"). Scrivania e mappa invece sono disegnate al 40% (confermato).
- Meccaniche e interfaccia decise: sezione "Meccaniche e interfaccia" di `docs/riepilogo.md` (mondo retrofuturo anni '90, la ditta e il suo protocollo, mappa e tempo contato, il VHS è la videocamera del medico, la scrivania al posto dei menu, la storia nascosta a quattro tracce).
- Dialoghi: mai riquadri neri. Nel prototipo le frasi si scrivono accanto a chi parla, le domande si aprono a raggiera e il nastro delle frasi (pellicola trasparente) si trascina su ciò che smentisce; le espressioni si cambiano solo sulla testa (`art/espressioni`, `tools/prepara_gioco.py`). Il taccuino è scartato: va sostituito (proposte in `art/prove-stile/16-taccuino`).
- Le scene nuove si fanno con `tools/scena.py` (descrizione in `scena.json`, esempio in `art/scene/02-soggiorno`): esegue tutto il procedimento deciso.
- I primi piani delle parti del corpo per l'esame si fanno con `tools/primi_piani.py` (descrizione in `primi_piani.json` nella cartella della scena), passando sempre il riferimento del personaggio.
- Per cambiare lo stato di un personaggio (febbre, bubboni...) passa sempre anche la sua immagine di riferimento, altrimenti la faccia cambia.
- GPT Image 2 rifiuta i bambini nelle scene horror: niente bambini nelle scene.
