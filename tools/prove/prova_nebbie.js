// Le foto della nebbia della stanza del medico (29 ottobre), col gioco servito in locale:
//   python3 tools/prove/servi.py      (la pagina in utf-8; con python3 -m http.server il "▸" diventa "â–¸")
// poi: node tools/prove/prova_nebbie.js <cartella delle foto> [nebbie, "senza,stanza,colore"] [fasi, "mattina,sera"]
// la nebbia della stanza: per ogni nebbia ("senza" senza nebbia nella stanza, "stanza" quella di sempre: di giorno
// niente, la sera R'lyeh livida; "colore" la quarta mattina), mattina e sera, le viste. argv[2] cartella, argv[3]
// (facoltativo) le nebbie da provare, "stanza,colore"; argv[4] le fasi, "mattina,sera"; argv[5] le viste,
// "finestra,stanza,letto,fuori" ("fuori" e' la vista dalla finestra, da vicino, con la sua nebbia); argv[6] la
// larghezza del 3D (1280; con Chromium senza scheda video, 800 e' quattro volte piu' veloce); argv[7] altro da
// aggiungere all'indirizzo, per esempio "-senzanebbia" (la stanza senza nessuna nebbia, nemmeno fuori) o
// "-nebbiaviola" (la stanza del pomeriggio del 29 ottobre); argv[8] un prefisso per i nomi delle foto
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const nebbie = (process.argv[3] || 'senza,stanza,colore').split(',');
  const fasi = (process.argv[4] || 'mattina,sera').split(',');
  const viste = (process.argv[5] || 'finestra,stanza,letto').split(',');
  const larghezza = Number(process.argv[6] || 1280);
  const indirizzo = process.argv[7] || '';
  const prefisso = process.argv[8] || '';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/GPU stall|GL Driver|swiftshader/i.test(m.text())) errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  await page.goto('http://127.0.0.1:8765/index.html#prova' + indirizzo);
  await page.waitForFunction(() => document.querySelector('#schermo')?.dataset.schermo === 'stanza', null, { timeout: 180000 });
  await page.waitForTimeout(1500);
  await page.addStyleTag({ content: '#hud, #soldi-hud, #parole, #comparsa, #comandi, #indicatori, #mirino, #etichetta, .notifica, #notifica { visibility: hidden !important; }' });
  await page.evaluate((w) => { window.prova.stanza().adattiva = false; window.prova.stanza().adatta(w); }, larghezza);
  const VISTE = {
    finestra: [[0.9, 1.62, 2.2], [-0.8, 1.2, -3.0], 62],
    stanza: [[-0.9, 1.62, -1.6], [0.6, 1.0, 3.0], 62],
    letto: [[1.6, 1.62, -2.2], [-1.0, 0.6, 1.2], 62],
    fuori: [[-0.35, 1.62, -1.5], [-0.7, 1.62, -3.0], 50],
  };
  for (const f of fasi) {
    await page.evaluate((f) => window.prova.stanza().fase(f), f);
    await page.waitForTimeout(f === 'sera' ? 6000 : 1500);
    for (const n of nebbie) {
      await page.evaluate((n) => window.prova.stanza().nebbia(n === 'senza' ? null : n), n);
      for (const [nome, [da, a, fov]] of Object.entries(VISTE).filter(([nome]) => viste.includes(nome))) {
        await page.evaluate(([da, a, fov]) => window.prova.stanza().inquadra(da, a, fov), [da, a, fov]);
        await page.waitForTimeout(2500);
        await page.locator('#schermo').screenshot({ path: `${out}/${prefisso}n${n}_${f}_${nome}.png`, timeout: 120000 });
      }
      console.log('fatta', n, f);
    }
  }
  console.log('ERRORI:', JSON.stringify(errors, null, 1));
  await browser.close();
})();
