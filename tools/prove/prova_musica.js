// La prova della musica (29 ottobre, sera): il brano giusto in ogni posto (la stanza di giorno e di sera, la mappa,
// le visite, il nastro della notte senza musica), i brani che escono dimenticati, e l'anello che riparte sfumando.
// Col gioco servito in locale:
//   python3 tools/prove/servi.py      (la pagina in utf-8; con python3 -m http.server il "▸" diventa "â–¸")
// poi: node tools/prove/prova_musica.js
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errori = [], ok = [];
  const verifica = (c, t) => (c ? ok : errori).push((c ? 'ok: ' : 'NO: ') + t);
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/GPU stall|GL Driver|swiftshader/i.test(m.text())) errori.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errori.push(`pageerror: ${e}`));
  page.on('requestfailed', (r) => errori.push(`requestfailed: ${r.url()}`));
  await page.goto('http://127.0.0.1:8765/index.html#prova');
  await page.waitForFunction(() => document.querySelector('#schermo')?.dataset.schermo === 'stanza' && window.prova?.stanza(), null, { timeout: 180000 });
  await page.evaluate(() => { window.prova.risoluzione = 320; window.prova.stanza().adatta(320); });
  // l'audio parte al primo tasto
  await page.keyboard.press('Shift');
  const brano = () => page.evaluate(() => { const s = window.prova.suoni(); return { nome: s.brano?.nome ?? null, suona: s.brano?.sorgenti.length ?? 0, stato: s.ctx?.state, in_memoria: Object.keys(s.buffer).filter((k) => k.startsWith('musica/')) }; });
  const aspetta = async (nome) => {
    for (let i = 0; i < 40; i++) { const b = await brano(); if (b.nome === nome && (nome === null || b.suona > 0)) return b; await page.waitForTimeout(250); }
    return brano();
  };
  let b = await aspetta('stanza_giorno');
  verifica(b.stato === 'running' && b.nome === 'stanza_giorno' && b.suona === 1, `nella stanza di giorno: ${JSON.stringify(b)}`);
  for (let i = 0; i < 30 && await page.evaluate(() => window.prova.R().occupato); i++) { await page.keyboard.press(' '); await page.waitForTimeout(200); }
  // una visita
  await page.evaluate(() => { window.prova.vaiMappa(); window.prova.S.ora = 540; });
  await page.waitForTimeout(800);
  b = await brano();
  verifica(b.nome === 'stanza_giorno', `sulla mappa la musica della stanza: ${b.nome}`);
  await page.evaluate(() => window.prova.vai('casa3'));
  await page.waitForFunction(() => window.prova.S.schermo === 'visita', null, { timeout: 60000 });
  b = await aspetta('visita');
  verifica(b.nome === 'visita' && b.suona === 1, `nella visita: ${JSON.stringify(b)}`);
  await page.waitForTimeout(5000);
  b = await brano();
  verifica(!b.in_memoria.includes('musica/stanza_giorno'), `il brano della stanza, uscito, e' dimenticato: ${b.in_memoria}`);
  // la sera nella stanza
  await page.evaluate(() => { const f = document.querySelector('#foglio'); f.dataset.bloccato = '0'; f.hidden = true; window.prova.sera(); });
  b = await aspetta('stanza_sera');
  verifica(b.nome === 'stanza_sera' && b.suona === 1, `la sera nella stanza: ${JSON.stringify(b)}`);
  // il nastro della notte: niente musica
  await page.evaluate(() => { for (let i = 0; i < 20; i++) window.prova.parole().salta?.(); const f = document.querySelector('#foglio'); f.dataset.bloccato = '0'; f.hidden = true; window.prova.dormi(); });
  b = await aspetta(null);
  verifica(b.nome === null, `nel nastro della notte niente musica: ${JSON.stringify(b)}`);
  // l'anello: un brano di 10 secondi riparte a 7,5 sfumando dentro se stesso (per due secondi e mezzo suonano in due)
  const anello = await page.evaluate(async () => {
    const s = window.prova.suoni(), ctx = s.ctx;
    const buf = ctx.createBuffer(2, ctx.sampleRate * 10, ctx.sampleRate);
    const b = { nome: 'prova', gain: ctx.createGain(), sorgenti: [], giro: 0, finito: false };
    b.gain.connect(ctx.destination);
    s.giro(b, buf, ctx.currentTime, true);
    const conta = [];
    for (const t of [3000, 5300, 3000]) { await new Promise((r) => setTimeout(r, t)); conta.push(b.sorgenti.length); }
    b.finito = true;
    clearTimeout(b.giro);
    return conta;
  });
  verifica(anello.join() === '1,2,1', `l'anello (sorgenti a 3, 8,3 e 11,3 secondi): ${anello}`);
  console.log(ok.join('\n'));
  console.log('ERRORI:', JSON.stringify(errori, null, 1));
  await browser.close();
})();
