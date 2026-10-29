// La prova del programma per Windows (29 ottobre), aperto su Linux con lo stesso Electron del pacchetto: il titolo con
// Esci, le impostazioni, F11, la memoria tra due aperture, Esci che chiude il programma. Prima la pagina:
//   cd eseguibile && npm install && npm run prepara
// poi, con uno schermo finto: xvfb-run -a -s "-screen 0 1600x900x24" node tools/prove/prova_electron.js <cartella delle foto>
const { _electron: electron } = require('playwright');
const path = require('node:path');
const DIR = path.resolve(__dirname, '../../eseguibile');
const out = process.argv[2];
const apri = () => electron.launch({
  executablePath: `${DIR}/node_modules/electron/dist/electron`,
  args: [DIR, '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' },
  timeout: 120000,
});
(async () => {
  const ok = [], errori = [];
  const verifica = (c, t) => (c ? ok : errori).push((c ? 'ok: ' : 'NO: ') + t);
  let app = await apri();
  let win = await app.firstWindow();
  win.on('console', (m) => { if (m.type() === 'error') errori.push('console: ' + m.text()); });
  win.on('pageerror', (e) => errori.push('pageerror: ' + e));
  await win.waitForFunction(() => document.querySelector('#foglio')?.dataset.tipo === 'titolo' && !document.querySelector('#foglio').hidden, null, { timeout: 300000 });
  await win.waitForTimeout(1500);
  const info = await win.evaluate(() => ({ ua: navigator.userAgent.match(/Electron\/[\d.]+/)?.[0], voci: [...document.querySelectorAll('.ti-menu button')].map((b) => b.textContent), webgl2: !!document.createElement('canvas').getContext('webgl2'), schermo: document.querySelector('#schermo').dataset.schermo, caratteri: document.fonts.check('12px Silkscreen') }));
  console.log(JSON.stringify(info));
  verifica(info.voci.includes('Impostazioni') && info.voci.at(-1) === 'Esci', `titolo: ${info.voci.join(' | ')}`);
  verifica(info.caratteri, 'il carattere a pixel e\' dentro il programma');
  await win.screenshot({ path: `${out}/el_titolo.png`, timeout: 150000 });
  await win.locator('.ti-menu button', { hasText: 'Impostazioni' }).click();
  await win.waitForTimeout(600);
  const fine = await win.evaluate(() => [...document.querySelectorAll('.im-fine button')].map((b) => b.textContent));
  verifica(fine.join() === 'Indietro,Esci dal gioco', `impostazioni dal titolo: ${fine}`);
  await win.locator('.im-scelta', { hasText: 'Bassa' }).click();
  await win.locator('.im-passo').first().click();
  await win.locator('.im-passo').first().click();
  await win.screenshot({ path: `${out}/el_impostazioni.png`, timeout: 150000 });
  // F11: lo schermo intero
  await win.keyboard.press('F11');
  await win.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 20000 }).catch(() => {});
  await win.waitForTimeout(500);
  const intero = await win.evaluate(() => [!!document.fullscreenElement, document.querySelector('.im-scelta[data-scelta="intero"]')?.getAttribute('aria-pressed')]);
  verifica(intero[0] && intero[1] === 'true', `F11: schermo intero ${intero}`);
  await win.keyboard.press('F11');
  await win.waitForFunction(() => !document.fullscreenElement, null, { timeout: 20000 }).catch(() => {});
  await win.waitForTimeout(500);
  verifica(!(await win.evaluate(() => !!document.fullscreenElement)), 'F11 di nuovo: finestra');
  await win.keyboard.press('Escape');
  await win.waitForTimeout(500);
  verifica(await win.evaluate(() => document.querySelector('#foglio').dataset.tipo === 'titolo'), 'Esc torna al titolo');
  // un salvataggio finto, per vedere che resta tra un'apertura e l'altra
  await win.evaluate(() => localStorage.setItem('malvento.prova', 'resta'));
  await app.close();
  // seconda apertura: le impostazioni sono rimaste
  app = await apri();
  win = await app.firstWindow();
  await win.waitForFunction(() => document.querySelector('#foglio')?.dataset.tipo === 'titolo' && !document.querySelector('#foglio').hidden, null, { timeout: 300000 });
  const dopo = await win.evaluate(() => ({ imp: localStorage.getItem('malvento.impostazioni'), prova: localStorage.getItem('malvento.prova') }));
  console.log(JSON.stringify(dopo));
  verifica(dopo.prova === 'resta' && JSON.parse(dopo.imp || '{}').qualita === 'bassa' && JSON.parse(dopo.imp || '{}').volume === 8, 'alla seconda apertura le impostazioni e la memoria restano');
  await win.evaluate(() => { localStorage.removeItem('malvento.prova'); localStorage.removeItem('malvento.impostazioni'); });
  // Esci: il programma si chiude
  const chiuso = app.waitForEvent('close', { timeout: 30000 }).then(() => true).catch(() => false);
  // il programma si chiude mentre il clic finisce: per Playwright e' un errore, per noi e' giusto
  await win.locator('.ti-menu button', { hasText: 'Esci' }).click().catch(() => {});
  verifica(await chiuso, 'Esci chiude il programma');
  console.log(ok.join('\n'));
  console.log('ERRORI:', JSON.stringify(errori, null, 1));
  process.exit(0);
})().catch((e) => { console.log('ERRORE', e.message.split('\n').slice(0, 6).join('\n')); process.exit(1); });
