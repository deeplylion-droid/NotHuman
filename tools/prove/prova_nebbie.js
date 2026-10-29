// Le foto delle proposte lovecraftiane della stanza del medico (29 ottobre), col gioco servito in locale:
//   cd gioco && python3 -m http.server 8765 --bind 127.0.0.1
// poi: node tools/prove/prova_nebbie.js <cartella delle foto> [nebbie, "0,1,2"] [fasi, "mattina,sera"]
// le proposte lovecraftiane della stanza: per ogni nebbia (0 = com'era), mattina e sera, tre viste. argv[2] cartella,
// argv[3] (facoltativo) le nebbie da provare, "1,2"; argv[4] le fasi, "mattina,sera"; argv[5] le viste,
// "finestra,stanza,letto"; argv[6] la larghezza del 3D (1280; con Chromium senza scheda video, 800 e' quattro volte
// piu' veloce)
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const nebbie = (process.argv[3] || '0,1,2,3,4').split(',').map(Number);
  const fasi = (process.argv[4] || 'mattina,sera').split(',');
  const viste = (process.argv[5] || 'finestra,stanza,letto').split(',');
  const larghezza = Number(process.argv[6] || 1280);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/GPU stall|GL Driver|swiftshader/i.test(m.text())) errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  await page.goto('http://127.0.0.1:8765/index.html#prova');
  await page.waitForFunction(() => document.querySelector('#schermo')?.dataset.schermo === 'stanza', null, { timeout: 180000 });
  await page.waitForTimeout(1500);
  await page.addStyleTag({ content: '#hud, #soldi-hud, #parole, #comparsa, #comandi, #indicatori, #mirino, #etichetta, .notifica, #notifica { visibility: hidden !important; }' });
  await page.evaluate((w) => { window.prova.stanza().adattiva = false; window.prova.stanza().adatta(w); }, larghezza);
  const VISTE = {
    finestra: [[0.9, 1.62, 2.2], [-0.8, 1.2, -3.0], 62],
    stanza: [[-0.9, 1.62, -1.6], [0.6, 1.0, 3.0], 62],
    letto: [[1.6, 1.62, -2.2], [-1.0, 0.6, 1.2], 62],
  };
  for (const f of fasi) {
    await page.evaluate((f) => window.prova.stanza().fase(f), f);
    await page.waitForTimeout(f === 'sera' ? 6000 : 1500);
    for (const n of nebbie) {
      await page.evaluate((n) => window.prova.stanza().nebbia(n), n);
      for (const [nome, [da, a, fov]] of Object.entries(VISTE).filter(([nome]) => viste.includes(nome))) {
        await page.evaluate(([da, a, fov]) => window.prova.stanza().inquadra(da, a, fov), [da, a, fov]);
        await page.waitForTimeout(2500);
        await page.locator('#schermo').screenshot({ path: `${out}/n${n}_${f}_${nome}.png`, timeout: 120000 });
      }
      console.log('fatta', n, f);
    }
  }
  console.log('ERRORI:', JSON.stringify(errors, null, 1));
  await browser.close();
})();
