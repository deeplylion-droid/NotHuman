// Gli screenshot per la pagina Steam (29 ottobre, sera), a 1920 × 1080 come chiede Steam, in una lingua (LINGUA=en o
// it, di partenza en). Col gioco servito in locale:
//   cd gioco && python3 -m http.server 8765 --bind 127.0.0.1
// poi: LINGUA=en node tools/prove/foto_steam.js <cartella>
// Il titolo; la stanza del medico; la prima visita (la domanda, la frase che si smentisce, l'esame); lo stato di
// famiglia; la sera, un nastro all'infrarosso; la notte sulla mappa; il giornale; la cripta del terzo giorno.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const out = process.argv[2];
  const lingua = process.env.LINGUA || 'en';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errori = [];
  page.on('pageerror', (e) => errori.push(`pageerror: ${e}`));
  const CATALOGO = lingua === 'en' ? (await import(path.resolve(__dirname, '../../gioco/js/lingua_en.js'))).CATALOGO : null;
  const L = (s) => (CATALOGO?.[s] ?? s);
  const foto = async (nome) => {
    try { await page.screenshot({ path: `${out}/${lingua}_${nome}.png`, timeout: 240000 }); console.log('foto', nome); } catch (e) { errori.push(`foto ${nome}: ${e.message.split('\n')[0]}`); }
  };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { errori.push(`${nome}: ${e.message.split('\n')[0]}`); } };
  const inCorso = () => page.evaluate(() => !!document.querySelector('#parole .frase:not(.ferma)'));
  const salta = async () => { for (let i = 0; i < 80; i++) { if (!(await inCorso())) { await page.waitForTimeout(250); if (!(await inCorso())) return; } await page.keyboard.press(' '); await page.waitForTimeout(120); } };
  const libero = async () => { for (let i = 0; i < 40 && await page.evaluate(() => window.prova.R().occupato); i++) { await page.keyboard.press(' '); await page.waitForTimeout(200); } };
  const box = () => page.locator('#schermo').boundingBox();
  const clic = async (x, y) => { const b = await box(); const p = { x: b.x + x * b.width, y: b.y + y * b.height }; await page.mouse.move(p.x, p.y); await page.waitForTimeout(150); await page.mouse.click(p.x, p.y); await page.waitForTimeout(400); };
  const punto = (c, pa) => page.evaluate(([c, pa]) => (pa ? window.prova.dove(c, pa) : window.prova.dovePersona(c) || window.prova.dove(c)), [c, pa]);
  const chiudi = () => page.evaluate(() => { const f = document.querySelector('#foglio'); f.dataset.bloccato = '0'; f.hidden = true; });

  // il titolo
  await passo('titolo', async () => {
    await page.goto(`http://127.0.0.1:8765/index.html#-${lingua}`);
    await page.waitForSelector('#foglio .ti-nome img', { timeout: 240000 });
    await page.waitForTimeout(4000);
    await page.keyboard.press('Shift');
    await page.waitForTimeout(2500);
    await page.mouse.move(5, 5);
    await foto('01_titolo');
  });

  // la partita, dalla stanza del medico
  await page.goto(`http://127.0.0.1:8765/index.html#prova-${lingua}`);
  await page.waitForFunction(() => document.querySelector('#schermo')?.dataset.schermo === 'stanza' && window.prova?.stanza(), null, { timeout: 240000 });
  await page.waitForTimeout(3000);
  await salta(); await libero();
  await passo('stanza', async () => { await page.mouse.move(960, 400); await page.waitForTimeout(2500); await foto('02_stanza'); });

  // la prima visita: la cucina della casa 3
  await passo('visita', async () => {
    await page.evaluate(() => { window.prova.vaiMappa(); window.prova.S.ora = 600; });
    await page.waitForTimeout(800);
    await page.evaluate(() => window.prova.vai('casa3'));
    await page.waitForFunction(() => window.prova.S.schermo === 'visita', null, { timeout: 60000 });
    await page.waitForTimeout(1500); await salta(); await libero();
    const [x, y] = await punto('padre');
    await clic(x, y);
    await page.waitForTimeout(600);
    await foto('03_domande');
    await page.locator('#ruota .ruota-voce', { hasText: L('chi vive qui?') }).first().click({ timeout: 6000 });
    // la frase a meta': si ferma la scrittura quando e' intera
    for (let i = 0; i < 40 && !(await page.evaluate(() => document.querySelector('#parole .frase.finita'))); i++) await page.waitForTimeout(150);
    await foto('04_risposta');
    await salta(); await libero();
  });
  await passo('contraddizione', async () => {
    const [x, y] = await punto('tavola');
    await clic(x, y); await salta(); await libero();
    await page.keyboard.press('Escape');
    const f = page.locator('#nastro-scorri .fot[data-id="d:solo_due"]');
    await f.scrollIntoViewIfNeeded();
    const b = await f.boundingBox();
    const [tx, ty] = await punto('tavola');
    const s = await box();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y - 30, { steps: 4 });
    await page.mouse.move(s.x + tx * s.width, s.y + ty * s.height, { steps: 12 });
    await page.waitForTimeout(300);
    await page.mouse.up();
    await page.waitForTimeout(900);
    await foto('05_contraddizione');
    await salta(); await libero();
  });
  await passo('esame', async () => {
    await page.evaluate(() => window.prova.R().primo || null);
    const [x, y] = await punto('padre', 'collo');
    await clic(x, y);
    await page.waitForTimeout(2500);
    await salta();
    await foto('06_esame');
    for (let i = 0; i < 6 && await page.evaluate(() => !!window.prova.R().primo); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(500); }
    await salta(); await libero();
  });
  await passo('stato di famiglia', async () => {
    const b = await box();
    await page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.45); await page.mouse.move(b.x + b.width * 0.5 + 6, b.y + b.height * 0.45 + 3);
    await page.waitForTimeout(300);
    await page.locator('#hud button', { hasText: L('Concludi la visita') }).click({ timeout: 8000 });
    await page.waitForTimeout(1200);
    const da = page.locator('.sf-manico.malato').first(), a = page.locator('.sf-riga[data-persona="padre"]').first();
    await a.scrollIntoViewIfNeeded(); await da.scrollIntoViewIfNeeded();
    const p = await da.boundingBox(), q = await a.boundingBox();
    await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2); await page.mouse.down();
    await page.mouse.move(q.x + q.width * 0.6, q.y + q.height / 2, { steps: 10 }); await page.mouse.up();
    await page.waitForTimeout(900);
    await page.locator('.sf-riga[data-persona="padre"] .sf-scelta.lazzaretto').click(); await page.waitForTimeout(600);
    await page.evaluate(() => document.querySelector('#foglio .carta')?.scrollTo(0, 0));
    await foto('07_stato_di_famiglia');
    await page.locator('.sf-bottone-firma').click(); await page.waitForTimeout(1800);
    await chiudi();
  });

  // la sera: un nastro all'infrarosso
  await passo('infrarosso', async () => {
    await page.evaluate(() => window.prova.sera()); await page.waitForTimeout(2000); await salta(); await libero();
    await page.evaluate(() => window.prova.apriNastri()); await page.waitForTimeout(800);
    await page.locator('#foglio button').first().click(); await page.waitForTimeout(2500);
    await page.locator('#comandi .cmd-ir').click(); await page.waitForTimeout(2500);
    await foto('08_infrarosso');
    await page.locator('#comandi .cmd-esci').click(); await page.waitForTimeout(1500);
    await chiudi();
  });

  // la notte sulla mappa, poi il giornale
  await passo('notte', async () => {
    await page.evaluate(() => window.prova.dormi());
    for (let i = 0; i < 150; i++) {
      if (await page.evaluate(() => window.prova.S.schermo === 'mappa' && document.querySelector('#foglio')?.dataset.tipo === 'notte')) break;
      await page.keyboard.press(' '); await page.waitForTimeout(400);
    }
    await page.waitForTimeout(3000);
    await foto('09_notte');
    await page.locator('#foglio button', { hasText: L('Il giornale del mattino') }).click(); await page.waitForTimeout(2500);
    await foto('10_giornale');
  });

  // il terzo giorno: la cripta della casa 7
  await passo('cripta', async () => {
    await page.goto(`http://127.0.0.1:8765/index.html#giorno3-${lingua}`);
    await page.waitForFunction(() => window.prova?.S?.giorno === 3 && document.querySelector('#schermo')?.dataset.schermo === 'stanza', null, { timeout: 240000 });
    await page.waitForTimeout(2000); await salta(); await libero(); await chiudi();
    await page.evaluate(() => { window.prova.vaiMappa(); window.prova.S.ora = 600; });
    await page.waitForTimeout(800);
    await page.evaluate(() => window.prova.vai('casa7'));
    await page.waitForFunction(() => window.prova.S.schermo === 'visita', null, { timeout: 60000 });
    await page.waitForTimeout(1500); await salta(); await libero();
    await page.evaluate(() => window.prova.vaiLuogo('cripta7'));
    await page.waitForTimeout(3000); await salta(); await libero();
    await foto('11_cripta');
  });
  console.log('ERRORI', JSON.stringify(errori, null, 1));
  await browser.close();
})();
