// La prima pagina del giornale sulla scrivania della stanza del medico, per Blender: la disegna gioco/js/primapagina.js
// (la stessa che il gioco ridisegna col giornale del giorno) col giornale del primo giorno, in Chromium coi caratteri
// del gioco, e la salva in art/stanza_hq/texture/giornale.jpg. art/stanza_hq/costruisci.py la mette sul giornale.
// Uso: python3 -m http.server 8765 --directory gioco (in un'altra finestra), poi node tools/prima_pagina.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RADICE = path.resolve(__dirname, '..');
const USCITA = path.join(RADICE, 'art/stanza_hq/texture/giornale.jpg');
const INDIRIZZO = process.env.GIOCO || 'http://127.0.0.1:8765/';

(async () => {
  const proxy = process.env.https_proxy || process.env.HTTPS_PROXY;
  const browser = await chromium.launch(proxy ? { proxy: { server: proxy, bypass: '127.0.0.1,localhost' } } : {});
  const page = await browser.newPage({ ignoreHTTPSErrors: true });
  await page.goto(INDIRIZZO + 'index.html#vuota', { waitUntil: 'domcontentloaded' }).catch(() => {});
  const dati = await page.evaluate(async () => {
    const { primaPagina, caratteri } = await import('./js/primapagina.js');
    const { GIORNALE } = await import('./js/dati.js');
    await caratteri();
    const foto = new Image();
    foto.src = 'img/foto_medico.jpg';
    await foto.decode();
    const tela = document.createElement('canvas');
    primaPagina(tela, GIORNALE, foto);
    const caricati = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family);
    return { url: tela.toDataURL('image/jpeg', 0.93), caricati: [...new Set(caricati)] };
  });
  fs.writeFileSync(USCITA, Buffer.from(dati.url.split(',')[1], 'base64'));
  console.log('caratteri:', dati.caricati.join(', '));
  console.log('salvata', path.relative(RADICE, USCITA));
  await browser.close();
})();
