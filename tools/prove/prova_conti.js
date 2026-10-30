// La prova dei conti (30 ottobre: «come su Papers, Please»): il primo giorno chiuso con qualche timbro giusto e uno
// sbagliato, il foglio dei conti della sera senza cena, luce e stufa, in debito con la padrona; la mattina dopo la
// stanza col piatto delle croste, al buio, col ghiaccio sui vetri e il biglietto sotto la porta; la sera senza corrente
// (il verde della maschera, il videoregistratore spento); la seconda notte in debito (la brandina portata via). Col
// gioco servito in locale (python3 tools/prove/servi.py), poi:
//   node tools/prove/prova_conti.js <cartella delle foto>        (LINGUA=en per l'inglese)
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const lingua = process.env.LINGUA;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errori = [];
  const log = [];
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/GPU stall|GL Driver|swiftshader/i.test(m.text())) errori.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errori.push('pageerror: ' + e));
  const CATALOGO = lingua === 'en' ? (await import(require('path').resolve(__dirname, '../../gioco/js/lingua_en.js'))).CATALOGO : null;
  const L = (s) => (CATALOGO && CATALOGO[s]) || s;
  await page.goto(`http://127.0.0.1:8765/index.html#prova${lingua ? `-${lingua}` : ''}`);
  await page.waitForFunction(() => document.querySelector('#schermo')?.dataset.schermo === 'stanza', null, { timeout: 180000 });
  await page.waitForTimeout(1000);
  const foto = async (n) => { await page.screenshot({ path: `${out}/conti_${n}.png`, timeout: 150000 }); };
  const inCorso = async () => page.evaluate(() => !!document.querySelector('#parole .frase:not(.ferma)'));
  const salta = async () => {
    for (let i = 0; i < 80; i++) {
      if (!(await inCorso())) { await page.waitForTimeout(250); if (!(await inCorso())) return; }
      await page.keyboard.press(' ');
      await page.waitForTimeout(120);
    }
  };
  const libero = async () => { for (let i = 0; i < 40 && await page.evaluate(() => window.prova.R().occupato); i++) { await page.keyboard.press(' '); await page.waitForTimeout(200); } };
  const testo = async () => page.evaluate(() => document.querySelector('#foglio-corpo').innerText.replace(/\s+/g, ' '));
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { errori.push(`passo ${nome}: ` + e.message.split('\n')[0]); await foto('err_' + nome); } };
  // la giornata chiusa a mano: le case visitate, firmate, coi timbri dati e nessuno al lazzaretto; una cassetta a casa
  const chiudiGiornata = (timbri) => page.evaluate((timbri) => {
    const S = window.prova.S, D = window.prova.D;
    for (const n of D.FAX.case) {
      const casa = `casa${n}`;
      S.nastri.push({ casa, titolo: `NASTRO ${S.nastri.length + 1}`, inizio: S.ora, fine: S.ora, riprese: [] });
      S.visitate[casa] = true;
      S.decisioni[casa] = { via: [], ospite: null, provvedimento: 'nessuno', ora: S.ora };
    }
    Object.assign(S.diagnosi, timbri);
  }, timbri);
  // la notte: il nastro avanza con lo spazio fino al resoconto sulla mappa
  const notte = async () => {
    for (let i = 0; i < 150; i++) {
      if (await page.evaluate(() => window.prova.S.schermo === 'mappa' && document.querySelector('#foglio')?.dataset.tipo === 'notte')) break;
      await page.keyboard.press(' ');
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(1500);
  };
  const stanzaPronta = async () => {
    await page.waitForFunction(() => window.prova.S.schermo === 'stanza', null, { timeout: 180000 });
    await page.waitForTimeout(1200);
  };

  // ---------- il primo giorno: cinque timbri giusti e uno sbagliato (la nonna sana timbrata malata), senza soldi ----------
  await passo('conti1', async () => {
    await page.evaluate(() => { window.prova.S.soldi = 0; });
    await chiudiGiornata({ padre: 'malato', figlia: 'sano', madre: 'grave', uomo: 'sospetto', giovane: 'sano', nonna: 'malato' });
    await page.evaluate(() => window.prova.sera());
    await salta(); await libero();
    await page.evaluate(() => window.prova.apriConti());
    await page.waitForTimeout(600);
    await foto('1_sera');
    log.push('conti 1: ' + await testo());
    // a zero soldi: l'affitto non basta, la cena, la luce e la stufa non si possono pagare
    const spente = await page.evaluate(() => [...document.querySelectorAll('.ct-scelta')].map((b) => `${b.dataset.voce}:${b.disabled ? 'spenta' : b.getAttribute('aria-pressed')}`).join(' '));
    log.push('scelte 1: ' + spente);
    await page.locator('#foglio button', { hasText: L('Spegni la luce e dormi') }).click();
    await notte();
    await foto('2_resoconto');
    log.push('resoconto 1: ' + await testo());
    log.push('dopo la notte: ' + await page.evaluate(() => JSON.stringify({ soldi: window.prova.S.soldi, senza: window.prova.S.senza, debito: window.prova.S.debito })));
  });

  // ---------- il secondo giorno: la stanza col piatto, al buio, col ghiaccio e il biglietto ----------
  await passo('mattina2', async () => {
    await page.locator('#foglio button', { hasText: L('Il giornale del mattino') }).click(); await page.waitForTimeout(1500);
    await page.locator('#foglio button', { hasText: L('Il secondo giorno') }).click();
    await stanzaPronta();
    await page.evaluate(() => window.prova.stanza().adatta(1280));
    await page.waitForTimeout(1500);
    await foto('3_mattina_piatto');
    const righe = [];
    for (let i = 0; i < 12 && await inCorso(); i++) {
      righe.push(await page.evaluate(() => document.querySelector('#parole .frase')?.textContent || ''));
      await page.keyboard.press(' '); await page.waitForTimeout(150); await page.keyboard.press(' '); await page.waitForTimeout(250);
    }
    await salta(); await libero();
    log.push('mattina 2: ' + righe.join(' / '));
    log.push('ora: ' + await page.evaluate(() => window.prova.S.ora));
    // la finestra col ghiaccio, poi la porta col biglietto
    await page.evaluate(() => { const s = window.prova.stanza(); s.entra('scrivania'); s.pitch = 0.1; });
    await page.waitForTimeout(1500);
    await foto('4_finestra_gelo');
    await page.evaluate(() => { const s = window.prova.stanza(); s.entra('porta'); s.pos.set(-1.45, 1.6); s.yaw = Math.PI - 0.1; s.pitch = -0.85; });
    await page.waitForTimeout(1500);
    await foto('5_biglietto');
    log.push('biglietto: ' + await page.evaluate(() => { const s = window.prova.stanza(); const c = s.colpisci(0.5, 0.5); return c?.oggetto; }));
  });

  // ---------- la sera del secondo giorno, senza corrente; poi la seconda notte in debito ----------
  await passo('sera2', async () => {
    await page.evaluate(() => window.prova.apriNastri());
    await salta(); await libero();
    await chiudiGiornata({});
    await page.evaluate(() => { window.prova.S.soldi = -20; });
    await page.evaluate(() => window.prova.sera());
    await page.waitForTimeout(1500);
    await foto('6_sera_buio');
    await salta(); await libero();
    await page.evaluate(() => window.prova.apriConti());
    await page.waitForTimeout(600);
    await foto('7_conti2');
    log.push('conti 2: ' + await testo());
    await page.locator('#foglio button', { hasText: L('Dormi') }).first().click();
    await notte();
    log.push('resoconto 2: ' + await testo());
    log.push('dopo la notte 2: ' + await page.evaluate(() => JSON.stringify({ soldi: window.prova.S.soldi, senza: window.prova.S.senza, debito: window.prova.S.debito })));
    await page.locator('#foglio button', { hasText: L('Il giornale del mattino') }).click(); await page.waitForTimeout(1500);
    await page.locator('#foglio button', { hasText: L('Il terzo giorno') }).click();
    await stanzaPronta();
    await salta(); await libero();
    await page.evaluate(() => { const s = window.prova.stanza(); s.entra('ospite'); });
    await page.waitForTimeout(1200);
    await foto('8_stanzetta_vuota');
    log.push('brandina: ' + await page.evaluate(() => !!window.prova.stanza().modelli.brandina.parent));
  });

  console.log(log.join('\n'));
  console.log(errori.length ? 'ERRORI:\n' + errori.join('\n') : 'nessun errore');
  await browser.close();
})();
