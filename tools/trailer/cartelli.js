// I cartelli del trailer, fotogramma per fotogramma (tools/trailer/cartelli.html): le frasi che si scrivono come nel
// gioco e il cartello finale col logo sopra la stanza del medico. Le frasi e quanto dura ogni cartello sono nel
// montaggio (tools/trailer/montaggio.json), i fotogrammi vanno in art/steam/trailer/cartelli/<lingua>/<nome>/.
// Lo sfondo del finale è l'ultimo fotogramma della ripresa della stanza (tools/trailer/riprese.js stanza).
//   LINGUA=en node tools/trailer/cartelli.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const RADICE = path.resolve(__dirname, '../..');
const LINGUA = process.env.LINGUA || 'en';
const M = JSON.parse(fs.readFileSync(path.join(__dirname, 'montaggio.json'), 'utf8'));
const FPS = M.fps;
const USCITA = path.join(RADICE, 'art/steam/trailer/cartelli', LINGUA);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(pathToFileURL(path.join(__dirname, 'cartelli.html')).href);
  await page.evaluate(() => document.fonts.ready);
  const tagli = M.tagli;
  for (let k = 0; k < tagli.length - 1; k++) {
    const t = tagli[k];
    if (!t.cartello && !t.finale) continue;
    const durata = tagli[k + 1].da - t.da;
    const n = Math.round(durata * FPS) + 2;
    const nome = t.cartello || 'finale';
    const dir = path.join(USCITA, nome);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    let dati;
    if (t.cartello) dati = { testo: M.cartelli[t.cartello][LINGUA] };
    else {
      const f = M.finale;
      const sfondo = path.join(RADICE, 'art/steam/trailer/riprese', LINGUA, f.sfondo);
      if (!fs.existsSync(sfondo)) { console.log(`finale: manca lo sfondo ${sfondo} (la ripresa della stanza)`); continue; }
      dati = { sfondo: pathToFileURL(sfondo).href, logo: pathToFileURL(path.join(RADICE, f.logo)).href, sotto: f.sotto[LINGUA], invito: f.invito[LINGUA], durata };
      // il logo e lo sfondo prima di cominciare
      await page.evaluate((d) => window.finale({ ...d, t: 0 }), dati);
      await page.waitForFunction(() => document.querySelector('#logo').complete, null, { timeout: 30000 });
      await page.waitForTimeout(500);
    }
    for (let i = 0; i < n; i++) {
      await page.evaluate(([d, tempo, fin]) => (fin ? window.finale({ ...d, t: tempo }) : window.cartello({ ...d, t: tempo })), [dati, i / FPS, !t.cartello]);
      await page.screenshot({ path: path.join(dir, `${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 95 });
    }
    console.log(`cartello ${nome}: ${n} fotogrammi`);
  }
  await browser.close();
})();
