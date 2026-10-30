// La prova di tutta la demo, giocata come farebbe una persona (29 ottobre): il primo giorno (la nonna e la leggenda, la
// ragazza ospite, il nastro 7), il secondo (la ragazza con la febbre, la cartella della ditta e "Medico 6", la nuora
// che non si ammala), il terzo (la cripta e la maschera del 1630), le tre notti, i giornali, la quarta mattina e il
// finale; i salvataggi di ogni mattina. Col gioco servito in locale:
//   python3 tools/prove/servi.py      (la pagina in utf-8; con python3 -m http.server il "▸" diventa "â–¸")
// poi: node tools/prove/prova_demo.js <cartella delle foto> (circa 7 minuti; alla fine scrive i passi e gli errori)
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  const log = [];
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/GPU stall|GL Driver|swiftshader/i.test(m.text())) errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e));
  page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url()));
  // LINGUA=en (o xx, la lingua finta: alla fine i testi rimasti fuori dalla traduzione) per provarla in un'altra lingua
  const lingua = process.env.LINGUA;
  const { sorveglia, fuori } = require('./lingua_fuori.js');
  if (lingua === 'xx') await sorveglia(page);
  // in inglese i testi da cliccare si cercano nel catalogo: la chiave uguale o, per un pezzo di testo, la piu' corta che lo
  // contiene ("Concludi" -> "Concludi la visita" -> "End the visit")
  const CATALOGO = lingua === 'en' ? (await import(require('path').resolve(__dirname, '../../gioco/js/lingua_en.js'))).CATALOGO : null;
  const L = (s) => {
    if (!CATALOGO) return s;
    if (CATALOGO[s]) return CATALOGO[s];
    const k = Object.keys(CATALOGO).filter((k) => k.includes(s)).sort((a, b) => a.length - b.length)[0];
    return k ? CATALOGO[k] : s;
  };
  await page.goto(`http://127.0.0.1:8765/index.html#prova${lingua ? `-${lingua}` : ''}`);
  await page.waitForFunction(() => document.querySelector('#schermo')?.dataset.schermo === 'stanza', null, { timeout: 180000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => { window.prova.risoluzione = 320; window.prova.stanza().adatta(320); });
  const box = await page.locator('#schermo').boundingBox();
  const at = (x, y) => ({ x: box.x + x * box.width, y: box.y + y * box.height });
  const shot = async (n) => { await page.screenshot({ path: `${out}/x_${n}.png`, timeout: 150000 }); };
  const inCorso = async () => page.evaluate(() => !!document.querySelector('#parole .frase:not(.ferma)'));
  const frase = async () => page.evaluate(() => document.querySelector('#parole .frase')?.textContent || '');
  const skip = async () => {
    for (let i = 0; i < 80; i++) {
      if (!(await inCorso())) { await page.waitForTimeout(250); if (!(await inCorso())) return; }
      await page.keyboard.press(' ');
      await page.waitForTimeout(120);
    }
  };
  const click = async (x, y) => { const p = at(x, y); await page.mouse.move(p.x, p.y); await page.waitForTimeout(120); await page.mouse.click(p.x, p.y); await page.waitForTimeout(300); };
  const premi = async (nome) => {
    const p = at(0.5, 0.45);
    await page.mouse.move(p.x, p.y); await page.mouse.move(p.x + 6, p.y + 3);
    await page.waitForTimeout(300);
    await page.locator('#hud button', { hasText: L(nome) }).click({ timeout: 8000 });
  };
  const voce = async (txt) => { await page.locator('#ruota .ruota-voce', { hasText: L(txt) }).first().click({ timeout: 4000 }); await page.waitForTimeout(250); };
  const voci = async () => page.evaluate(() => [...document.querySelectorAll('#ruota .ruota-voce')].map((b) => b.textContent).join(' | '));
  const chiudiRuota = async () => { if (await page.locator('#ruota').isVisible()) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); } };
  const libero = async () => { for (let i = 0; i < 40 && await page.evaluate(() => window.prova.R().occupato); i++) { await page.keyboard.press(' '); await page.waitForTimeout(200); } };
  const nastro = async () => page.evaluate(() => [...document.querySelectorAll('#nastro-scorri .fot')].map((d) => d.dataset.id || 'vuoto').join(' '));
  const stato = async () => page.evaluate(() => { const S = window.prova.S; return `giorno ${S.giorno} prove=${S.prove.join(',')} dette=${Object.keys(S.dette).join(',')}`; });
  const step = async (name, fn) => { try { await fn(); } catch (e) { errors.push(`passo ${name}: ` + e.message.split('\n')[0]); await shot('err_' + name); } };
  const aspetta = (s, ms = 180000) => page.waitForFunction((s) => document.querySelector('#schermo').dataset.schermo === s, s, { timeout: ms });
  // dove cliccare: una persona (fuori dalle parti del corpo), una sua parte, una zona (gli strumenti di #prova)
  const punto = async (cosa, parte) => {
    const p = await page.evaluate(([c, pa]) => (pa ? window.prova.dove(c, pa) : window.prova.dovePersona(c) || window.prova.dove(c)), [cosa, parte]);
    if (!p) throw new Error(`non trovo ${cosa}${parte ? '.' + parte : ''} in ${await page.evaluate(() => window.prova.S.luogo)}`);
    return p;
  };
  const chiedi = async (persona, testo) => {
    await chiudiRuota();
    const [x, y] = await punto(persona);
    await click(x, y);
    log.push(`  voci ${persona}: ${await voci()}`);
    await voce(testo); await skip(); await libero(); await chiudiRuota();
  };
  const zona = async (id, testo) => {
    await chiudiRuota();
    const [x, y] = await punto(id);
    await click(x, y);
    if (testo) { log.push(`  voci ${id}: ${await voci()}`); await voce(testo); }
    await skip(); await libero(); await chiudiRuota();
  };
  const trascina = async (id, bersaglio) => {
    const f = page.locator(`#nastro-scorri .fot[data-id="${id}"]`);
    await f.scrollIntoViewIfNeeded();
    const b = await f.boundingBox();
    let p;
    if (bersaglio.startsWith('p:') || bersaglio.startsWith('d:')) { const q = await page.locator(`#nastro-scorri .fot[data-id="${bersaglio}"]`).boundingBox(); p = { x: q.x + q.width / 2, y: q.y + q.height / 2 }; }
    else { const [x, y] = await punto(...bersaglio.split('.')); p = at(x, y); }
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y - 30, { steps: 4 });
    await page.mouse.move(p.x, p.y, { steps: 12 });
    await page.waitForTimeout(250);
    await page.mouse.up();
    await page.waitForTimeout(800);
    await skip(); await libero();
  };
  const sposta = async (da, a) => {
    await page.locator(a).first().scrollIntoViewIfNeeded();
    await page.locator(da).first().scrollIntoViewIfNeeded();
    const b = await page.locator(da).first().boundingBox();
    const t = await page.locator(a).first().boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 - 20, b.y + b.height / 2 - 20, { steps: 3 });
    await page.mouse.move(t.x + t.width * 0.6, t.y + t.height / 2, { steps: 10 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    await page.waitForTimeout(700);
  };
  const concludi = async (prima) => {
    await premi('Concludi la visita'); await page.waitForTimeout(800);
    if (prima) await prima();
    await page.locator('.sf-bottone-firma').click(); await page.waitForTimeout(1800);
    await page.evaluate(() => { const f = document.querySelector('#foglio'); f.dataset.bloccato = '0'; f.hidden = true; });
  };
  const vai = async (casa) => {
    await page.evaluate(() => { const f = document.querySelector('#foglio'); f.dataset.bloccato = '0'; f.hidden = true; window.prova.vaiMappa(); });
    await page.waitForTimeout(600);
    await page.evaluate(() => { window.prova.S.ora = 540; });
    await page.evaluate((c) => window.prova.vai(c), casa);
    await page.waitForFunction((c) => window.prova.S.schermo === 'visita' && window.prova.S.casa === c, casa, { timeout: 60000 });
    await page.waitForTimeout(1500); await skip(); await libero();
  };
  // la notte: il nastro avanza con lo spazio fino al resoconto sulla mappa, poi il giornale e il tasto dopo
  const notte = async (n, dopo) => {
    await page.evaluate(() => { const f = document.querySelector('#foglio'); f.dataset.bloccato = '0'; f.hidden = true; window.prova.dormi(); });
    for (let i = 0; i < 150; i++) {
      if (await page.evaluate(() => window.prova.S.schermo === 'mappa' && document.querySelector('#foglio')?.dataset.tipo === 'notte')) break;
      await page.keyboard.press(' ');
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(2500); await shot(`notte${n}`);
    log.push(`notte ${n}: ` + await page.evaluate(() => document.querySelector('#foglio-corpo').innerText.replace(/\s+/g, ' ').slice(0, 400)));
    await page.locator('#foglio button', { hasText: L('Il giornale del mattino') }).click(); await page.waitForTimeout(2000); await shot(`giornale${n + 1}`);
    log.push(`giornale ${n + 1}: ` + await page.evaluate(() => document.querySelector('.gio-titolo')?.textContent));
    await page.locator('#foglio button', { hasText: L(dopo) }).click(); await page.waitForTimeout(1500);
  };

  // ---------- il primo giorno ----------
  await step('giorno1', async () => { await skip(); });
  await step('casa3', async () => {
    await vai('casa3');
    await chiedi('padre', 'chi vive qui?');
    await zona('tavola');
    await trascina('d:solo_due', 'tavola');
    log.push('casa 3: ' + await stato());
    await concludi(async () => {
      await sposta('.sf-manico.malato', '.sf-riga[data-persona="padre"]');
      await page.locator('.sf-riga[data-persona="padre"] .sf-scelta.lazzaretto').click(); await page.waitForTimeout(300);
    });
  });
  await step('casa5', async () => {
    await vai('casa5');
    await chiedi('nonna', 'la peste?');
    await chiedi('uomo', 'la febbre?');
    log.push('casa 5: ' + await stato());
    await concludi(async () => {
      await sposta('.sf-manico.sano', '.sf-riga[data-persona="giovane"]');
      await page.locator('.sf-riga[data-persona="giovane"] .sf-scelta.ospite').click(); await page.waitForTimeout(300);
      log.push('ospite: ' + await page.evaluate(() => window.prova.S.ospite));
    });
  });
  await step('sera1', async () => {
    await page.evaluate(() => window.prova.sera()); await page.waitForTimeout(1500); await skip();
    await page.evaluate(() => window.prova.apriNastri()); await page.waitForTimeout(800);
    await page.locator('#foglio button', { hasText: L('NASTRO 7 · NON CANCELLARE') }).click(); await page.waitForTimeout(1000);
    for (let i = 0; i < 60 && await page.evaluate(() => window.prova.S.schermo === 'nastro'); i++) { await page.keyboard.press(' '); await page.waitForTimeout(300); }
    log.push('nastro 7: ' + await page.evaluate(() => JSON.stringify(window.prova.S.tracce)));
  });
  await step('notte1', async () => { await notte(1, 'Il secondo giorno'); await aspetta('stanza'); await page.waitForTimeout(1200); await skip(); });
  await step('salvato2', async () => { log.push('salvataggio: ' + await page.evaluate(() => window.prova.leggiSalvataggio()?.S.giorno)); });

  // ---------- il secondo giorno ----------
  await step('g2casa5', async () => {
    await vai('casa5');
    await chiedi('giovane', 'dove hai dormito?');
    log.push('g2 casa 5: ' + await stato());
    await concludi();
  });
  await step('g2casa2', async () => {
    await vai('casa2');
    await zona('letto', 'solleva il materasso');
    log.push('  nastro: ' + await nastro());
    await trascina('p:cartella', 'moglie');
    log.push('g2 casa 2: ' + await stato());
    await concludi();
  });
  await step('g2casa10', async () => {
    await vai('casa10');
    await chiedi('suocera', 'e la nuora?');
    await zona('cappotto');
    log.push('  nastro: ' + await nastro());
    await trascina('d:nuora_partita', 'p:cappotto');
    log.push('g2 casa 10: ' + await stato());
    await concludi();
  });
  await step('notte2', async () => {
    await page.evaluate(() => window.prova.sera()); await page.waitForTimeout(1500); await skip();
    await notte(2, 'Il terzo giorno'); await aspetta('stanza'); await page.waitForTimeout(1200); await skip();
  });
  await step('salvato3', async () => { log.push('salvataggio: ' + await page.evaluate(() => window.prova.leggiSalvataggio()?.S.giorno)); });

  // ---------- il terzo giorno: la casa 7 e la cripta (i punti della prova del terzo giorno) ----------
  await step('g3casa7', async () => {
    await vai('casa7');
    const tocca = async (x, y) => { await chiudiRuota(); await click(x, y); };
    await chiedi('sacrestano', 'chi vive qui?');
    await tocca(0.63, 0.57); log.push('  voci porta7: ' + await voci()); await voce('ascolta'); await skip(); await libero();
    await chiudiRuota();
    log.push('  nastro: ' + await nastro());
    await trascina('d:dalla_sorella', 'porta7');
    await tocca(0.63, 0.57); log.push('  voci porta7: ' + await voci()); await voce('scendi nella cripta'); await page.waitForTimeout(1600); await skip(); await libero();
    await shot('cripta');
    await zona('maschera'); await shot('maschera');
    log.push('g3 casa 7: ' + await stato());
    await premi('Torna di sopra'); await page.waitForTimeout(1200); await skip();
    await concludi();
  });
  await step('notte3', async () => {
    await page.evaluate(() => window.prova.sera()); await page.waitForTimeout(1500); await skip();
    await notte(3, 'La quarta mattina'); await page.waitForTimeout(2500);
  });
  await step('finale', async () => {
    log.push('finale: ' + await page.evaluate(() => { const f = window.prova.R().finale; return JSON.stringify({ id: f.id, tracce: f.tracce, prese: f.prese.length, consegnati: f.consegnati.map((p) => p.id), cambiati: f.cambiati }); }));
    log.push('  ' + await page.evaluate(() => document.querySelector('#foglio-corpo').innerText.replace(/\s+/g, ' ').slice(0, 600)));
    await shot('quarta_mattina');
    await page.locator('#foglio button', { hasText: L('Scendi nella cripta') }).click(); await page.waitForTimeout(3000);
    log.push('  ' + await page.evaluate(() => document.querySelector('#foglio-corpo').innerText.replace(/\s+/g, ' ').slice(0, 600)));
    await shot('finale');
    await page.locator('#foglio button', { hasText: L("Com'era davvero") }).click(); await page.waitForTimeout(1500);
    log.push('  ' + await page.evaluate(() => document.querySelector('#foglio-corpo').innerText.replace(/\s+/g, ' ').slice(0, 900)));
    await shot('verita');
  });
  console.log(log.join('\n'));
  if (lingua === 'xx') console.log('FUORI DALLA TRADUZIONE:\n' + (await fuori(page)).join('\n'));
  console.log('ERRORI:', JSON.stringify(errors, null, 1));
  await browser.close();
})();
