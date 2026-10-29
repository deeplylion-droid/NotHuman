// La prova automatica dei quindici finali della demo (29 ottobre). Col gioco servito in locale:
//   cd gioco && python3 -m http.server 8765 --bind 127.0.0.1
// poi: node tools/prove/prova_finali.js <cartella delle foto> [nomi dei finali, "cripta,ferma"]
// (Playwright, col Chromium del sistema; ogni finale ha lo stato preparato prima della quarta mattina)
// i quindici finali, uno per uno, nella stessa pagina (ricomincia e salta al terzo giorno), con lo stato preparato
// prima della quarta mattina; poi la verita' con la lista dei finali e il titolo col conto. argv[2] cartella delle foto
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const solo = process.argv[3] ? process.argv[3].split(',') : null;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  const log = [];
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/GPU stall|GL Driver|swiftshader/i.test(m.text())) errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  // LINGUA=en (o xx, la lingua finta: alla fine i testi rimasti fuori dalla traduzione) per provarla in un'altra lingua
  const lingua = process.env.LINGUA;
  const { sorveglia, fuori } = require('./lingua_fuori.js');
  if (lingua === 'xx') await sorveglia(page);
  // in inglese i tasti si cercano col testo del catalogo
  const CATALOGO = lingua === 'en' ? (await import(require('path').resolve(__dirname, '../../gioco/js/lingua_en.js'))).CATALOGO : null;
  const L = (s) => (CATALOGO?.[s] ?? s);
  await page.goto(`http://127.0.0.1:8765/index.html#prova${lingua ? `-${lingua}` : ''}`);
  await page.waitForFunction(() => document.querySelector('#schermo')?.dataset.schermo === 'stanza', null, { timeout: 180000 });
  await page.evaluate(() => { window.prova.risoluzione = 320; window.prova.stanza()?.adatta?.(320); });
  const foglio = () => page.evaluate(() => {
    const f = document.querySelector('#foglio');
    if (f.hidden) return '(nessun foglio)';
    return `[${f.dataset.tipo}] ` + [...document.querySelectorAll('#foglio-corpo > *')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()).join(' / ');
  });
  const tasto = async (testo) => {
    await page.locator('#foglio button', { hasText: L(testo) }).first().click({ timeout: 8000 });
    await page.waitForTimeout(1500);
  };
  const al3 = async () => {
    await page.evaluate(() => { window.prova.ricomincia(); return window.prova.saltaAlGiorno3(); });
    await page.waitForFunction(() => window.prova.S.giorno === 3 && document.querySelector('#schermo').dataset.schermo === 'stanza', null, { timeout: 180000 });
    await page.waitForTimeout(800);
    await page.evaluate(() => { const S = window.prova.S; S.notte = JSON.parse(JSON.stringify(S.notte)); });
  };
  // un ospite la prima notte (se no e' "la stanzetta") e un po' di contagio (se no e' "il malvento si ferma")
  const BASE = `const S = window.prova.S; S.giorni[0].notte.ospite = { chi: 'giovane', malato: false };
    for (const g of S.giorni) { g.notte.contagiate = []; g.notte.diffusione = []; }
    S.notte.contagiate = ['casa9']; S.notte.diffusione = [{ da: 'casa10', a: ['casa9'] }]; S.notte.portati = [];`;
  const CAPITO = `S.prove.push('maschera_1630'); S.giorni[0].dette.push('leggenda');`;
  const scenari = [
    { nome: 'cripta', scelta: 'Scendi nella cripta', prepara: `${BASE} ${CAPITO} S.tracce.nastro7 = true;` },
    { nome: 'mute', scelta: 'Scendi nella cripta', prepara: `${BASE} ${CAPITO} S.notte.portati = ['giona'];` },
    { nome: 'fax', scelta: 'Scrivi alla ditta', prepara: `${BASE} S.prove.push('maschera_1630'); S.giorni[1].dette.push('febbre_mattina', 'medico6');` },
    { nome: 'via', scelta: 'Vai via senza maschera', prepara: `${BASE} S.prove.push('maschera_1630'); S.giorni[1].dette.push('svegliata_scottavo');` },
    { nome: 'pagina', scelta: 'Porta tutto alla Voce', prepara: `${BASE} ${CAPITO} S.prove.push('cartella', 'immune');` },
    { nome: 'corriera', scelta: 'Accompagna la nuora alla corriera', prepara: `${BASE} ${CAPITO} S.prove.push('cartella', 'immune'); S.notte.ospite = { chi: 'nuora', malato: false };` },
    { nome: 'corriera_sola', atteso: 'corriera', prepara: `${BASE} S.prove.push('cartella'); S.giorni[1].dette.push('non_si_ammala'); S.notte.ospite = { chi: 'nuora', malato: false };` },
    { nome: 'ferma', prepara: `${BASE} S.notte.contagiate = []; S.notte.diffusione = []; S.giorni[0].croci = 2; S.giorni[1].croci = 3;` },
    { nome: 'stanzetta', prepara: `` },
    { nome: 'cambiano', prepara: `const S = window.prova.S; S.giorni[0].notte.ospite = { chi: 'giovane', malato: false };` },
    { nome: 'direttore', prepara: `${BASE} S.giorni[0].notte.portati = ['giovane', 'figlia']; S.notte.portati = ['lia', 'ada', 'giona', 'sacrestano'];` },
    { nome: 'rocco', prepara: `${BASE} S.fiducia = 80; S.notte.portati = ['lia'];` },
    { nome: 'premio', prepara: `${BASE} S.notte.portati = ['giovane', 'nonna', 'lia', 'giona']; S.fiducia = 20;` },
    { nome: 'croce', prepara: `${BASE} S.fiducia = 15; S.notte.portati = ['lia'];` },
    { nome: 'furgone', prepara: `${BASE} S.fiducia = 50;` },
    { nome: 'quarto', prepara: `${BASE} S.notte.portati = ['lia']; S.fiducia = 55;` },
  ].filter((s) => !solo || solo.includes(s.nome));
  for (const sc of scenari) {
    await al3();
    await page.evaluate(sc.prepara);
    await page.evaluate(() => window.prova.quartaMattina());
    await page.waitForTimeout(2000);
    const id = await page.evaluate(() => window.prova.R().finale.id);
    log.push(`${sc.nome}: calcolato ${id} | ${(await foglio()).slice(0, 300)}`);
    if (sc.scelta) {
      await page.screenshot({ path: `${out}/${sc.nome}_0.png`, timeout: 150000 });
      await tasto(sc.scelta);
      log.push(`  scelta -> ${(await foglio()).slice(0, 300)}`);
    }
    // la quarta mattina nella stanza (i finali senza fax), il fax, l'edizione straordinaria: tutti con "Avanti"
    for (let i = 0; i < 3; i++) {
      const tipo = await page.evaluate(() => document.querySelector('#foglio')?.dataset.tipo);
      const avanti = await page.locator('#foglio button', { hasText: L('Avanti') }).count();
      if (!avanti) break;
      await page.screenshot({ path: `${out}/${sc.nome}_${i}_${tipo}.png`, timeout: 150000 });
      log.push(`  ${tipo}: ${(await foglio()).slice(0, 400)}`);
      await tasto('Avanti');
      await page.waitForTimeout(2000);
    }
    const chi = await page.evaluate(() => window.prova.R().finale.chi);
    const atteso = sc.atteso || sc.nome;
    log.push(`  FINALE ${chi} ${chi === atteso ? 'OK' : 'SBAGLIATO, atteso ' + atteso} | ${(await foglio()).slice(0, 600)}`);
    await page.screenshot({ path: `${out}/${sc.nome}_finale.png`, timeout: 150000 });
  }
  // la verita' con la lista dei finali
  await tasto("Com'era davvero");
  log.push('verita: ' + (await foglio()).slice(0, 1600));
  await page.evaluate(() => { const l = document.querySelector('.fn-finali'); l?.scrollIntoView(); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/verita_finali.png`, timeout: 150000 });
  log.push('trovati: ' + JSON.stringify([...(await page.evaluate(() => [...window.prova.finaliTrovati()]))]));
  // il titolo col conto
  const t = await ctx.newPage();
  await t.goto(`http://127.0.0.1:8765/index.html${lingua ? `#-${lingua}` : ''}`);
  await t.waitForFunction(() => document.querySelector('#schermo')?.dataset.schermo === 'stanza', null, { timeout: 180000 });
  await t.waitForTimeout(1500);
  log.push('titolo: ' + await t.evaluate(() => [...document.querySelectorAll('#foglio-corpo > *')].map((e) => e.textContent.trim()).join(' / ')));
  await t.screenshot({ path: `${out}/titolo.png`, timeout: 150000 });
  console.log(log.join('\n'));
  if (lingua === 'xx') console.log('FUORI DALLA TRADUZIONE:\n' + (await fuori(page)).join('\n'));
  console.log('ERRORI:', JSON.stringify(errors, null, 1));
  await browser.close();
})();
