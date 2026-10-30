// La prova del pannello delle impostazioni (29 ottobre): dal titolo, durante la partita, ricordate dopo il
// ricaricamento, col puntatore finto del controller, la larghezza della stanza nella qualita' media.
// Col gioco servito in locale:
//   python3 tools/prove/servi.py      (la pagina in utf-8; con python3 -m http.server il "▸" diventa "â–¸")
// poi: node tools/prove/prova_impostazioni.js <cartella delle foto>
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
  const errors = [];
  const ok = [];
  const verifica = (cond, testo) => { (cond ? ok : errors).push((cond ? 'ok: ' : 'NO: ') + testo); };
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/GPU stall|GL Driver|swiftshader/i.test(m.text())) errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e));
  const pronto = async () => {
    await page.waitForFunction(() => document.querySelector('#schermo')?.dataset.schermo === 'stanza' && window.prova?.stanza(), null, { timeout: 180000 });
    await page.waitForTimeout(800);
    await page.evaluate(() => { window.prova.risoluzione = 320; window.prova.stanza().adatta(320); });
  };
  await page.goto('http://127.0.0.1:8765/index.html#prova');
  await pronto();
  const base = await page.evaluate(() => ({ imp: window.prova.impostazioni(), passi: window.prova.stanza().passoNebbia.material.defines.PASSI, sguardo: window.prova.stanza().sguardo, w: window.prova.stanza().canvas.width }));
  console.log('base', JSON.stringify(base));
  verifica(base.imp.volume === 10 && base.imp.musica === 8 && base.imp.sguardo === 5 && base.imp.qualita === 'alta' && base.passi === 20 && base.sguardo === 1, 'impostazioni di base come prima (la musica a 80)');
  // il titolo
  await page.evaluate(() => { window.prova.parole().pulisci?.(); window.prova.titolo(); });
  await page.waitForTimeout(800);
  // prima del primo tasto l'audio non puo' partire: "premi un tasto" al posto dei comandi; il tasto li mostra e fa
  // partire il tema del titolo
  const prima = await page.evaluate(() => ({ premi: document.querySelector('.ti-premi')?.textContent, menu: document.querySelector('.ti-menu').hidden }));
  verifica(prima.premi === 'Premi un tasto' && prima.menu, `prima del tasto: ${JSON.stringify(prima)}`);
  await page.keyboard.press('Shift');
  await page.waitForTimeout(1200);
  const dopoTasto = await page.evaluate(() => ({ premi: !!document.querySelector('.ti-premi'), menu: document.querySelector('.ti-menu').hidden, brano: window.prova.suoni().brano?.nome }));
  verifica(!dopoTasto.premi && !dopoTasto.menu && dopoTasto.brano === 'titolo', `dopo il tasto: ${JSON.stringify(dopoTasto)}`);
  const voci = await page.evaluate(() => [...document.querySelectorAll('.ti-menu button')].map((b) => b.textContent));
  console.log('titolo:', voci.join(' | '));
  verifica(voci.includes('Impostazioni') && !voci.includes('Esci'), 'nel titolo c\'e\' Impostazioni (e niente Esci nel browser)');
  await page.screenshot({ timeout: 150000, path: `${out}/titolo.png` });
  await page.locator('.ti-menu button', { hasText: 'Impostazioni' }).click();
  await page.waitForTimeout(600);
  verifica(await page.evaluate(() => document.querySelector('#foglio').dataset.tipo === 'impostazioni' && document.activeElement?.getAttribute('role') === 'slider'), 'il pannello si apre col volume in mano');
  await page.screenshot({ timeout: 150000, path: `${out}/pannello_titolo.png` });
  // il volume: un clic sulla quinta tacca, poi la freccia a destra
  const barre = page.locator('.im-barra');
  let b = await barre.nth(0).boundingBox();
  await page.mouse.click(b.x + b.width * 0.45, b.y + b.height / 2);
  verifica((await page.evaluate(() => window.prova.impostazioni().volume)) === 5, 'clic sulla quinta tacca: volume 50');
  await page.keyboard.press('ArrowRight');
  verifica((await page.evaluate(() => window.prova.impostazioni().volume)) === 6, 'freccia a destra: volume 60');
  verifica((await page.evaluate(() => window.prova.suoni().livello)) === 0.36, 'il suono va a 0,36');
  // la musica: un clic sulla terza tacca
  b = await page.locator('.im-barra[aria-label="Musica"]').boundingBox();
  await page.mouse.click(b.x + b.width * 0.25, b.y + b.height / 2);
  const mus = await page.evaluate(() => [window.prova.impostazioni().musica, window.prova.suoni().livelloMusica]);
  verifica(mus[0] === 3 && Math.abs(mus[1] - 0.09) < 1e-9, `musica alla terza tacca: ${mus}`);
  // la sensibilita': trascinata fino in fondo
  b = await page.locator('.im-barra[aria-label="Sensibilità"]').boundingBox();
  await page.mouse.move(b.x + 5, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.6, b.y + b.height / 2, { steps: 5 });
  await page.mouse.move(b.x + b.width + 40, b.y + b.height / 2, { steps: 5 });
  await page.mouse.up();
  const sg = await page.evaluate(() => [window.prova.impostazioni().sguardo, window.prova.stanza().sguardo]);
  verifica(sg[0] === 10 && sg[1] === 2.5, `trascinata fino in fondo: sensibilita' ${sg}`);
  // meno, col bottone
  await page.locator('.im-passo[aria-label="Sensibilità: meno"]').click();
  verifica((await page.evaluate(() => window.prova.impostazioni().sguardo)) === 9, 'il meno della sensibilita\': 9');
  // la qualita' media
  await page.locator('.im-scelta', { hasText: 'Media' }).click();
  await page.waitForTimeout(300);
  const q = await page.evaluate(() => ({ q: window.prova.impostazioni().qualita, passi: window.prova.stanza().passoNebbia.material.defines.PASSI, premuto: document.querySelector('.im-scelta[aria-pressed="true"]')?.textContent }));
  verifica(q.q === 'media' && q.passi === 14 && q.premuto === 'Media', `qualita' media: ${JSON.stringify(q)}`);
  await page.screenshot({ timeout: 150000, path: `${out}/pannello_cambiato.png` });
  // Esc: si torna al titolo
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  verifica(await page.evaluate(() => document.querySelector('#foglio').dataset.tipo === 'titolo' && !document.querySelector('#foglio').hidden), 'Esc torna al titolo');
  // nuova partita, poi l'ingranaggio
  await page.locator('.ti-menu button', { hasText: 'Nuova partita' }).click();
  await page.waitForTimeout(1500);
  verifica((await page.evaluate(() => window.prova.suoni().brano?.nome)) === 'stanza_giorno', 'Nuova partita: la musica della stanza');
  for (let i = 0; i < 20 && await page.evaluate(() => window.prova.R().occupato); i++) { await page.keyboard.press(' '); await page.waitForTimeout(200); }
  const sch = await page.locator('#schermo').boundingBox();
  await page.evaluate(() => { document.querySelector('#schermo').dataset.comparsa = '1'; });
  await page.screenshot({ timeout: 150000, path: `${out}/icone.png` });
  await page.mouse.move(sch.x + sch.width * 0.5, sch.y + sch.height * 0.5);
  await page.mouse.move(sch.x + sch.width * 0.52, sch.y + sch.height * 0.51);
  await page.waitForTimeout(350);
  await page.locator('#impostazioni').click();
  await page.waitForTimeout(600);
  const fine = await page.evaluate(() => [...document.querySelectorAll('.im-fine button')].map((b) => b.textContent));
  verifica(fine.join() === 'Torna a giocare', `in partita: ${fine}`);
  // la barra presa e lasciata andare fuori dal pannello (col controller): il clic finisce sullo sfondo, il pannello resta
  const resta = await page.evaluate(() => {
    const barra = document.querySelectorAll('.im-barra')[0];
    const r = barra.getBoundingClientRect();
    const f = document.querySelector('#foglio');
    barra.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + 5, clientY: r.top + r.height / 2, pointerId: 31, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1 }));
    f.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 5, clientY: 5, pointerId: 31, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 0 }));
    f.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 5, clientY: 5, button: 0 }));
    return !f.hidden && f.dataset.tipo === 'impostazioni';
  });
  verifica(resta, 'lasciata fuori dal pannello: il pannello resta');
  await page.waitForTimeout(500);
  // il puntatore finto del controller: giu' sulla prima tacca del volume, trascinato a meta', su
  const v = await page.evaluate(() => {
    const barra = document.querySelectorAll('.im-barra')[0];
    const r = barra.getBoundingClientRect();
    const ev = (tipo, x, bottoni) => barra.dispatchEvent(new PointerEvent(tipo, { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: r.top + r.height / 2, pointerId: 31, pointerType: 'mouse', isPrimary: true, button: tipo === 'pointermove' ? -1 : 0, buttons: bottoni }));
    ev('pointerdown', r.left + r.width * 0.05, 1);
    const a = window.prova.impostazioni().volume;
    ev('pointermove', r.left + r.width * 0.75, 1);
    const b = window.prova.impostazioni().volume;
    ev('pointerup', r.left + r.width * 0.75, 0);
    ev('pointermove', r.left + r.width * 0.95, 0);
    return [a, b, window.prova.impostazioni().volume];
  });
  verifica(v.join() === '1,8,8', `col controller: ${v}`);
  await page.screenshot({ timeout: 150000, path: `${out}/pannello_partita.png` });
  await page.locator('.im-fine button', { hasText: 'Torna a giocare' }).click();
  await page.waitForTimeout(400);
  verifica(await page.evaluate(() => document.querySelector('#foglio').hidden && document.querySelector('#foglio').dataset.bloccato === '0'), 'Torna a giocare chiude il pannello');
  await page.evaluate(() => window.prova.apriImpostazioni(false));
  await page.keyboard.press('Escape');
  verifica(await page.evaluate(() => document.querySelector('#foglio').hidden), 'in partita Esc chiude il pannello');
  // un foglio bloccato resta bloccato: il pannello aperto sopra la quarta mattina
  await page.evaluate(() => { const f = document.querySelector('#foglio'); f.dataset.bloccato = '1'; window.prova.apriImpostazioni(false); });
  await page.keyboard.press('Escape');
  verifica(await page.evaluate(() => document.querySelector('#foglio').hidden && document.querySelector('#foglio').dataset.bloccato === '1'), 'il blocco di prima resta');
  await page.evaluate(() => { document.querySelector('#foglio').dataset.bloccato = '0'; });
  // ricaricata: le impostazioni restano, e la stanza nasce con la nebbia media
  await page.reload();
  await pronto();
  const dopo = await page.evaluate(() => ({ imp: window.prova.impostazioni(), passi: window.prova.stanza().passoNebbia.material.defines.PASSI, sguardo: window.prova.stanza().sguardo, livello: window.prova.suoni().livello }));
  console.log('dopo', JSON.stringify(dopo));
  verifica(dopo.imp.volume === 8 && dopo.imp.musica === 3 && dopo.imp.sguardo === 9 && dopo.imp.qualita === 'media' && dopo.passi === 14 && dopo.sguardo === 2.1 && Math.abs(dopo.livello - 0.64) < 1e-9, 'ricordate dopo il ricaricamento');
  // la stanza in media: al massimo 1280 punti
  await page.evaluate(() => { window.prova.risoluzione = 0; window.prova.vaiStanza('inizio'); });
  await page.waitForTimeout(500);
  const w = await page.evaluate(() => [window.prova.stanza().canvas.width, document.querySelector('#vhs').width]);
  verifica(w[0] <= 1280, `larghezza della stanza in media: ${w}`);
  await page.evaluate(() => localStorage.removeItem('malvento.impostazioni'));
  console.log(ok.join('\n'));
  console.log('ERRORI:', JSON.stringify(errors, null, 1));
  await browser.close();
})();
