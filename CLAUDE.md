# NotHuman

Videogioco per Steam in fase di ideazione: per ora non c'è codice di gioco. Si lavora in italiano.

- Le decisioni prese finora sono in `docs/riepilogo.md`: leggilo prima di proporre idee nuove.
- Le immagini si generano con fal.ai; la chiave API è nella variabile d'ambiente `FAL_KEY`. Non chiederla mai in chat.
- Il gioco: il Medico della peste, in un'ambientazione moderna (case povere di oggi in un paese sperduto).
- Regole di stile già decise: partire sempre da stanze con pochi dettagli; stanza in foto con lo stile 07 fumetto underground al 20%; personaggi grotteschi ma ammorbiditi e quasi fotografici; filtro finale VHS animato, e VHS verde per le scene al buio (metodo in `docs/riepilogo.md`, sezione "Personaggi ammorbiditi").
- Le scene nuove si fanno con `tools/scena.py` (descrizione in `scena.json`, esempio in `art/scene/02-soggiorno`): esegue tutto il procedimento deciso.
- Per cambiare lo stato di un personaggio (febbre, bubboni...) passa sempre anche la sua immagine di riferimento, altrimenti la faccia cambia.
- GPT Image 2 rifiuta i bambini nelle scene horror: niente bambini nelle scene.
