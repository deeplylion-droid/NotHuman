# La traduzione inglese: la guida

Per chi traduce il catalogo (`catalogo.json`, diviso in parti in `parti/`). Ogni voce è un testo italiano del gioco, con
`dove` (file e riga) e `riga` (la riga di codice, per capire chi parla e come il testo si attacca agli altri). Si
scrive un JSON con le stesse chiavi e la traduzione inglese come valore; `node tools/lingua/controlla.mjs <parte>`
controlla le regole tecniche.

## Il gioco in breve

Un horror narrativo. La peste è tornata in Malvento, un paese povero e sperduto di oggi (23 case, stufe a legna,
santini, un vecchio televisore). Il giocatore è un medico della peste in abiti antichi, maschera a becco col dentro una
videocamera anni '90 (REC, infrarosso, nastri VHS). Lavora a contratto per la Panacea, una ditta farmaceutica che ogni
mattina manda il protocollo via fax e paga a paziente portato al lazzaretto, il «recinto» della ditta. Visita le case,
esamina le persone, confronta quello che dicono con quello che vede, e decide chi portare via. Nessuno muore: chi
arriva all'ultimo stadio «cambia» e diventa un mostro (occhi bianchi, dita lunghe e nere, a quattro zampe). La storia
nascosta: la ditta usa il paese come cavia, c'è una persona che non si ammala, il paese ha un segreto antico (una
cripta, la peste del 1630) e il medico stesso porta il contagio («il medico è la peste»).

Il tono: asciutto, inquietante, mai urlato. Frasi brevi. La gente del paese parla in modo semplice e diffidente; il
medico (le battute di `TU`) è clinico e formale. Le descrizioni sono al presente, in seconda persona.

## Le regole tecniche

1. **I segnaposto** `{0}`, `{1}`... restano tutti (anche in un altro ordine): il gioco ci mette dentro nomi, numeri o
   altri pezzi di frase già tradotti. Guarda `riga` per capire cosa sono.
2. **Le parole chiave tra asterischi** (`*botta*`): stesso numero di coppie, attorno alla parola inglese che vuol dire
   la stessa cosa (`È una *botta*.` → `It's a *bruise*.`). Si accendono e si cliccano.
3. **Le parentesi quadre** sono gesti e suoni: un testo tutto tra `[ ]` resta tutto tra `[ ]`.
4. **Gli spazi all'inizio e alla fine** restano come sono: sono pezzi di frase che il codice attacca ad altri.
5. Le virgolette italiane `«»` diventano `“ ”` (e dentro `‘ ’`).
6. **Il MAIUSCOLO** resta maiuscolo (timbri, intestazioni, il fax, le voci).
7. Restano uguali i segni `·`, `—`, `…`, `★`, `✓`, `→`, `€`, `×`, i numeri e le ore (`13:00`). I soldi restano
   all'europea: `{0} €`. Le date in cifre dei documenti restano all'italiana (`3.3.2025`); quelle scritte si scrivono
   all'inglese (`martedì 27 ottobre` → `Tuesday, October 27`).
8. **Lunghezza:** più o meno come l'italiano. I tasti e le etichette devono restare corti.
9. **Niente parole italiane** (29 ottobre, sera: «basta parole italiane»): resta italiano solo il nome del gioco e del
   paese, Malvento. Le persone, i paesi vicini, le vie, il giornale e il cane hanno un nome inglese (la tabella in fondo,
   applicata da `tools/lingua/nomi_en.py`); la ditta resta Panacea.
10. Inglese americano, semplice e naturale; il «Lei» e il «tu» diventano tutti e due `you`. Nessuna nota o commento nel
    JSON: solo la traduzione.

## Il glossario

| Italiano | English |
|---|---|
| il medico; Medico 6, MEDICO 6 | the doctor; Doctor 6, DOCTOR 6 |
| dottore (chi gli parla) | Doctor |
| la ditta; la Panacea; «Ci prendiamo cura di voi» | the Company; Panacea; “We take care of you” |
| il protocollo | the protocol |
| il recinto (della ditta) | the compound |
| il lazzaretto; «Al lazzaretto» | the lazaretto; “To the lazaretto” |
| lo stato di famiglia (il foglio); «Stato di famiglia» | the family register; “Family register” |
| CERTIFICATO DI STATO DI FAMIGLIA | FAMILY REGISTER CERTIFICATE |
| l'anagrafe; UFFICIO ANAGRAFE | the registry; REGISTRY OFFICE |
| intestatario, intestataria | head of household |
| il nastro delle frasi | the statement tape |
| i nastri; il videoregistratore; la cassetta (VHS) | the tapes; the VCR; the cassette |
| il coprifuoco | the curfew |
| la pazienza (della famiglia); il tempo | patience; time |
| i timbri: SANO, SOSPETTO, MALATO, GRAVE, MOSTRO | the stamps: HEALTHY, SUSPECT, SICK, CRITICAL, MONSTER |
| sano/sana, malato/malata, grave, mostro | healthy, sick, critical (in prosa anche *gravely ill*), monster |
| cambiato/cambiata («è cambiata»: diventata un mostro) | changed (“she has changed”) |
| quelli che cambiano | those who change |
| l'ospite; «Ospite stanotte» | the guest; “Guest tonight” |
| la stanzetta (dell'ospite); la brandina | the spare room; the cot |
| consegnare alla ditta; i consegnati | hand over to the Company; the handed-over |
| il profilo richiesto | the requested profile |
| contestare; CONTESTA; CONTRADDIZIONE; COMBACIA; CONFRONTA | challenge; CHALLENGE; CONTRADICTION; MATCH; COMPARE |
| le prove; INDIZIO; NASTRO IR | the evidence; CLUE; IR TAPE |
| l'infrarosso | infrared |
| i segni: FEBBRE, BUBBONI, PALLORE, TOSSE, DITA NERE | the signs: FEVER, BUBOES, PALLOR, COUGH, BLACK FINGERS |
| occhi, bocca, collo, ascelle, mani | eyes, mouth, neck, armpits, hands |
| croce sulla porta; tornare domani | a cross on the door; come back tomorrow |
| la maschera; il becco; la lente d'ottone; il bastone | the mask; the beak; the brass lens; the cane |
| la corriera; il furgone bianco | the bus; the white van |
| la cripta; la sacrestia; il campanile; le campane | the crypt; the sacristy; the bell tower; the bells |
| la santa di cera; il radicato; l'allungato; il bozzolo | the Wax Saint; the Rooted One; the Long One; the cocoon |
| il malvento (il detto: «chi dorme solo, il malvento se lo prende») | the ill wind (“sleep alone and the ill wind takes you”) |
| il santino; San Rocco | the holy card; Saint Roch |
| il sindaco; il parroco; la canonica | the mayor; the parish priest; the rectory |
| La Voce (il giornale); LA VOCE | The Voice; THE VOICE |
| Le voci, in maiuscolo: PADRE, MADRE, FIGLIA, UOMO, RAGAZZA, RAGAZZO, NONNA, MOGLIE, MARITO, SUOCERA, NUORA, SACRESTANO, VOCE | FATHER, MOTHER, DAUGHTER, MAN, GIRL, BOY, GRANDMOTHER, WIFE, HUSBAND, MOTHER-IN-LAW, DAUGHTER-IN-LAW, SEXTON, VOICE |
| I nomi delle persone nelle frasi: il padre, la madre, la figlia, l'uomo in tuta, la ragazza, la nonna, la moglie, il marito, la suocera, la nuora, il sacrestano | the father, the mother, the daughter, the man in overalls, the girl, the grandmother, the wife, the husband, the mother-in-law, the daughter-in-law, the sexton (minuscolo con l'articolo: il gioco mette la maiuscola quando servono a inizio frase) |

## Chi c'è nelle case

- **Casa 3:** il padre (Mario Rossi, meccanico), la madre (Anna Bianchi, nascosta in camera), la figlia (Giulia); il
  nonno è «sparito», cambiato.
- **Casa 5:** l'uomo in tuta (Luigi Ferri, muratore), la ragazza (Marta), la nonna; il ragazzo, Davide, nascosto dietro
  la porta del ripostiglio e poi in cantina (il bozzolo).
- **Casa 2:** la moglie (Lucia Marini, lavora di notte nel recinto) e il marito (Ernesto Galli, cavatore in pensione,
  i polmoni della cava).
- **Casa 10:** la suocera e la nuora (Chiara Lorenzi, vedova di Paolo Serra): la nuora non si ammala.
- **Casa 7:** il sacrestano, Giona (il campanaro muto) e Assunta (la moglie, la santa di cera nella cripta).
- **Casa 4:** le gemelle sarte, Ada e Lia.

## I nomi in inglese

Nei registri l'ordine resta COGNOME NOME (ROSS MARK); a voce il nome prima (Peter Ross). Gli indirizzi col numero
prima (12 Church Street).

| Italiano | English |
|---|---|
| Casa 3: Rossi Mario, Bianchi Anna, Rossi Giulia, il nonno Rossi Pietro | Ross Mark, White Anna, Ross Julia, the grandfather Ross Peter |
| Casa 5: Ferri Luigi, Ferri Marta, Ferri Davide, Costa Adele ved. Ferri | Ferris Lewis, Ferris Martha, Ferris David, Cole Adele wid. Ferris |
| Casa 2: Galli Ernesto, Marini Lucia («da Galli») | Gale Ernest, Marsh Lucy (“at the Gales'”) |
| Casa 10: Serra Paolo, Lorenzi Chiara, Fontana Rosa ved. Serra | Searle Paul, Lawrence Claire, Fenton Rose wid. Searle |
| Casa 7: Barbieri Anselmo (il sacrestano), Barbieri Giona, Colombo Assunta | Barber Anselm, Barber Jonah, Coleman Agnes |
| Casa 4: le gemelle De Rosa, Ada e Lia | the Rowe twins, Ada and Leah |
| Via della Chiesa, Vicolo Stretto, via dei Mulini, Strada del Cimitero, Via del Fiume, il torrente | Church Street, Narrow Lane, Mill Street, Cemetery Road, River Street, the creek |
| Valcupa, Pietrascura | Darkvale, Blackstone |
| La Voce | The Voice |
| Lupo (il cane) | Wolf |
| la Madonna | the Virgin |
