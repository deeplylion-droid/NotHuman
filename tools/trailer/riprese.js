// Le riprese del trailer per Steam (30 ottobre: «ora facciamo il trailer per steam»): il gioco vero, registrato
// fotogramma per fotogramma a 1920 × 1080 e 30 fotogrammi al secondo. Il tempo del browser è finto e fermo (page.clock
// di Playwright: Date, performance.now, i timer, requestAnimationFrame) e le animazioni CSS sono ferme e portate avanti
// a mano: a ogni fotogramma il tempo avanza di 1/30 di secondo, il gioco ridisegna, poi la foto. Così anche la stanza
// 3D, che nel browser senza scheda video impiega 8 secondi per un fotogramma, nel video va liscia. Il puntatore e i
// clic arrivano come da una persona (il cerchio del cursore è quello del gioco).
//
// Col gioco servito in locale (python3 tools/prove/servi.py):
//   LINGUA=en node tools/trailer/riprese.js [gruppo ...]      (i gruppi: uno, due, tre, stanza; senza nomi tutti)
// Ogni ripresa va in art/steam/trailer/riprese/<lingua>/<nome>/0000.jpg ... (fuori dal repository: sono grandi). I
// gruppi sono indipendenti (una pagina nuova ciascuno) e si possono far girare insieme. Il montaggio:
// tools/trailer/monta.py.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RADICE = path.resolve(__dirname, '../..');
const LINGUA = process.env.LINGUA || 'en';
const FPS = 30;
const INDIRIZZO = `http://127.0.0.1:${process.env.PORTA || 8765}/index.html`;
const USCITA = path.join(RADICE, 'art/steam/trailer/riprese', LINGUA);

// le animazioni CSS col tempo finto: la prima volta che si vedono si fermano, poi a ogni fotogramma si mettono al punto
// giusto (quelle finite si chiudono, così arrivano anche gli "animationend" che il gioco aspetta). E la stanza 3D, fuori
// dalle sue riprese, resta ferma sull'ultima immagine: la videocamera non la ridisegna (vhs.prima), se no ogni passo
// del tempo finto costerebbe secondi
function animazioniFinte() {
  const viste = new WeakMap();
  const ferma = () => {};
  window.__congela = () => {
    const p = window.prova;
    if (!p || window.__stanzaViva) return;
    const v = p.vhs();
    // (anche sotto il nastro della notte la videocamera continuerebbe a ridisegnare la stanza, che non si vede)
    if (v && v.prima && v.prima !== ferma && (p.S.schermo === 'stanza' || p.S.schermo === 'scrivania' || String(v.prima).includes('stanza.passo'))) v.prima = ferma;
  };
  window.__animazioni = () => {
    const ora = performance.now();
    for (const a of document.getAnimations()) {
      let v = viste.get(a);
      if (!v) {
        v = { t0: ora, c0: a.currentTime ?? 0 };
        viste.set(a, v);
        try { a.pause(); } catch { /* gia' finita */ }
      }
      const t = v.c0 + (ora - v.t0) * (a.playbackRate || 1);
      const fine = a.effect?.getComputedTiming?.().endTime;
      try {
        if (Number.isFinite(fine) && t >= fine) a.finish();
        else a.currentTime = t;
      } catch { /* un'animazione tolta nel frattempo */ }
    }
  };
}

const morbido = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

class Set {
  constructor(browser, errori) {
    this.browser = browser;
    this.errori = errori;
    this.page = null;
    this.mouse = [960, 540];
  }

  // una pagina nuova del gioco, col tempo finto: si aspetta la stanza del medico
  async apri(hash = 'prova') {
    if (this.page) await this.page.close();
    const page = await this.browser.newPage({ viewport: { width: 1920, height: 1080 } });
    page.on('pageerror', (e) => this.errori.push(`pageerror: ${e.message}`));
    await page.addInitScript(animazioniFinte);
    await page.clock.install();
    await page.goto(`${INDIRIZZO}#${hash}-${LINGUA}`);
    await page.waitForFunction(() => document.querySelector('#schermo')?.dataset.schermo === 'stanza' && window.prova?.stanza(), null, { timeout: 300000 });
    this.page = page;
    this.cdp = await page.context().newCDPSession(page);
    await page.waitForTimeout(2000);
    // da qui il tempo del gioco va avanti solo quando lo dice la ripresa. Prima si ferma la stanza 3D: mentre la
    // disegna, la pagina resta bloccata per secondi e l'orologio di Playwright, che segue quello vero, scavalca il punto
    // dove lo si voleva fermare («Cannot fast-forward to the past»); se succede lo stesso, si riprova
    await page.evaluate(() => window.__congela());
    for (let k = 0; ; k++) {
      const ora = await page.evaluate(() => Date.now());
      try {
        await page.clock.pauseAt(ora + 1000);
        break;
      } catch (e) {
        if (k === 5) throw e;
        await page.waitForTimeout(500);
      }
    }
    return page;
  }

  // il tempo corre come quello vero (per caricare le immagini): a passi di un quinto di secondo
  async vero(ms) {
    for (let t = 0; t < ms; t += 200) {
      await this.page.waitForTimeout(200);
      await this.passo(200);
    }
  }

  async ferma() {}

  async passo(ms) {
    await this.page.evaluate(() => window.__congela?.());
    await this.page.clock.runFor(ms);
    await this.page.evaluate(() => window.__animazioni?.());
  }

  // la stanza 3D ridisegnata a ogni fotogramma (solo nelle sue riprese)
  async stanzaViva() {
    await this.page.evaluate(() => {
      window.__stanzaViva = true;
      const s = window.prova.stanza(), v = window.prova.vhs();
      v.prima = (dt) => { s.passo(dt); v.refresh(); };
    });
  }

  // avanti veloce col tempo finto, senza foto
  async avanti(ms) {
    await this.ferma();
    for (let t = 0; t < ms; t += 50) await this.passo(Math.min(50, ms - t));
  }

  // avanti finche' la condizione (una funzione della pagina) e' vera; al massimo "max" millisecondi di gioco
  async finche(cond, arg, max = 30000) {
    await this.ferma();
    for (let t = 0; t < max; t += 50) {
      if (await this.page.evaluate(cond, arg)) return true;
      await this.passo(50);
    }
    this.errori.push(`finche: scaduto ${cond.toString().slice(0, 80)}`);
    return false;
  }

  // le frasi a schermo finite di scrivere (e nessuna attesa del gioco)
  async quiete(max = 20000) {
    return this.finche(() => !document.querySelector('#parole .frase:not(.ferma)') && !window.prova.R().occupato, null, max);
  }

  // la ripresa c'e' gia' tutta su disco (dopo un riavvio si riparte da dove si era; RIFAI=1 le rifa' tutte)
  fatta(nome, secondi) {
    if (process.env.RIFAI) return false;
    const dir = path.join(USCITA, nome);
    return fs.existsSync(dir) && fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).length >= Math.round(secondi * FPS);
  }

  // una ripresa: "secondi" di fotogrammi; prima di ogni fotogramma "ogni(i, n)" muove il puntatore, clicca... Con
  // "camera(i, n)" la videocamera si avvicina: il rettangolo della pagina da riprendere ({x, y, w}, in 16:9), che
  // Chrome ridisegna più grande (i fogli e le scritte restano nitidi), sempre a 1920 x 1080
  async gira(nome, secondi, ogni, camera) {
    await this.ferma();
    const dir = path.join(USCITA, nome);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const n = Math.round(secondi * FPS);
    const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      if (ogni) {
        try { await ogni(i, n); } catch (e) { this.errori.push(`${nome} [${i}]: ${e.message.split('\n')[0]}`); }
      }
      // 33, 33, 34 millisecondi: in media 1/30 di secondo esatto
      await this.passo(Math.round((i + 1) * 1000 / FPS) - Math.round(i * 1000 / FPS));
      const opzioni = { format: 'jpeg', quality: 94 };
      const c = camera && camera(i, n);
      if (c) opzioni.clip = { x: c.x, y: c.y, width: c.w, height: c.w * 9 / 16, scale: 1920 / c.w };
      const { data } = await this.cdp.send('Page.captureScreenshot', opzioni);
      fs.writeFileSync(path.join(dir, `${String(i).padStart(4, '0')}.jpg`), Buffer.from(data, 'base64'));
    }
    console.log(`ripresa ${nome}: ${n} fotogrammi in ${Math.round((Date.now() - t0) / 1000)} s`);
  }

  // ---------- il puntatore ----------

  async schermo() {
    return this.page.evaluate(() => { const r = document.querySelector('#schermo').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
  }

  // un punto dello schermo del gioco (frazioni) in pixel della pagina
  async px([fx, fy]) {
    const [x, y, w, h] = await this.schermo();
    return [x + fx * w, y + fy * h];
  }

  async muovi(p) {
    this.mouse = p;
    await this.page.mouse.move(p[0], p[1]);
  }

  // il puntatore da dov'e' fino a "verso" (pixel), tra il fotogramma f0 e f1, con partenza e arrivo morbidi
  mossa(verso, f0, f1) {
    let da = null;
    return async (i) => {
      if (i < f0 || i > f1) return;
      if (!da) da = [...this.mouse];
      const t = morbido((i - f0) / Math.max(1, f1 - f0));
      // un poco d'arco, come una mano
      const arco = Math.sin(t * Math.PI) * 0.06 * Math.hypot(verso[0] - da[0], verso[1] - da[1]);
      await this.muovi([da[0] + (verso[0] - da[0]) * t, da[1] + (verso[1] - da[1]) * t - arco]);
    };
  }

  // il centro di un elemento della pagina
  async centro(sel, testo) {
    return this.page.evaluate(([sel, testo]) => {
      const el = [...document.querySelectorAll(sel)].find((e) => !testo || e.textContent.includes(testo));
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2];
    }, [sel, testo]);
  }

  async premi(tasto) {
    await this.page.keyboard.press(tasto);
  }
}

const CATALOGO = LINGUA === 'en' ? import(path.join(RADICE, 'gioco/js/lingua_en.js')).then((m) => m.CATALOGO) : Promise.resolve(null);
let L = (s) => s;

// ---------- le riprese ----------

const GRUPPI = {
  // il primo giorno, dalla stanza: il fax, la mappa, la casa 3 (l'arrivo, la domanda, la contraddizione, l'esame, lo
  // stato di famiglia), la sera all'infrarosso, il nastro della notte, il contagio sulla mappa, il giornale
  async uno(set) {
    const page = await set.apri('prova');
    await set.quiete();
    await set.muovi([1500, 700]);
    await set.gira('fax', 4, async (i) => {
      if (i === 8) await page.evaluate(() => { window.prova.apriFax(); });
    });

    // la mappa: il puntatore va sulla casa 3, che si accende con la sua scheda
    await page.evaluate(() => { document.querySelector('#foglio').hidden = true; window.prova.vaiMappa(); window.prova.S.ora = 600; });
    await set.avanti(800);
    const casa3 = await page.evaluate(() => {
      const b = [...document.querySelectorAll('.pin')].find((p) => p.textContent.trim() === '3');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2 + 30];
    });
    await set.muovi([1250, 820]);
    await set.gira('mappa', 4.5, set.mossa(casa3 || [960, 540], 10, 55));

    // la casa 3: si entra una volta per caricare le immagini, poi si rientra per la ripresa
    await page.evaluate(() => { window.prova.vai('casa3'); });
    await set.vero(6000);
    await set.quiete();
    await page.evaluate(() => { window.prova.vaiMappa(); const S = window.prova.S; S.visti = {}; });
    await set.avanti(500);
    await set.muovi([1700, 950]);
    await set.gira('arrivo', 6.5, async (i) => {
      if (i === 3) await page.evaluate(() => { window.prova.vaiLuogo('cucina'); });
    });
    await set.quiete();

    // la domanda: il padre, la raggiera, «chi vive qui?», la risposta
    const padre = await set.px(await page.evaluate(() => window.prova.dovePersona('padre')));
    const vaiPadre = set.mossa(padre, 8, 38);
    let voce = null, versoVoce = null;
    await set.gira('domanda', 7, async (i) => {
      await vaiPadre(i);
      if (i === 44) await page.mouse.click(...set.mouse);
      if (i === 62) {
        voce = await set.centro('#ruota .ruota-voce', L('chi vive qui?'));
        if (voce) versoVoce = set.mossa([voce[0] - 40, voce[1]], 63, 88);
      }
      if (versoVoce) await versoVoce(i);
      if (i === 96 && voce) await page.mouse.click(...set.mouse);
    });
    await set.quiete();

    // la contraddizione: la frase dal nastro sulla tavola apparecchiata per quattro
    await page.keyboard.press('Escape');
    await set.avanti(400);
    const frase = await page.evaluate(() => {
      const f = document.querySelector('#nastro-scorri .fot[data-id="d:solo_due"]');
      f.scrollIntoView({ inline: 'center' });
      const r = f.getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2];
    });
    const tavola = await set.px(await page.evaluate(() => window.prova.dove('tavola')));
    const versoFrase = set.mossa(frase, 4, 30);
    const trascina = set.mossa(tavola, 42, 84);
    await set.gira('contraddizione', 6, async (i) => {
      await versoFrase(i);
      if (i === 36) await page.mouse.down();
      await trascina(i);
      if (i === 92) await page.mouse.up();
    });
    await set.quiete();

    // l'esame: il collo del padre, nel rosso
    const collo = await set.px(await page.evaluate(() => window.prova.dove('padre', 'collo')));
    const versoCollo = set.mossa(collo, 6, 34);
    await set.gira('esame', 5, async (i) => {
      await versoCollo(i);
      if (i === 40) await page.mouse.click(...set.mouse);
    });
    await set.quiete();
    for (let k = 0; k < 6 && await page.evaluate(() => !!window.prova.R().primo); k++) { await set.premi('Escape'); await set.avanti(500); }
    await set.quiete();

    // lo stato di famiglia: il timbro MALATO sul padre, poi «al lazzaretto»
    await page.evaluate((t) => [...document.querySelectorAll('#hud button')].find((b) => b.textContent.includes(t))?.click(), L('Concludi la visita'));
    await set.avanti(1500);
    const manico = await set.centro('.sf-manico.malato');
    const riga = await page.evaluate(() => { const r = document.querySelector('.sf-riga[data-persona="padre"]').getBoundingClientRect(); return [r.x + r.width * 0.6, r.y + r.height / 2]; });
    await set.muovi([1500, 900]);
    const versoManico = set.mossa(manico, 4, 26);
    const trascinaTimbro = set.mossa(riga, 34, 62);
    let lazzaretto = null, versoLazz = null;
    await set.gira('stato', 6.5, async (i) => {
      await versoManico(i);
      if (i === 30) await page.mouse.down();
      await trascinaTimbro(i);
      if (i === 66) await page.mouse.up();
      if (i === 100) {
        lazzaretto = await set.centro('.sf-riga[data-persona="padre"] .sf-scelta.lazzaretto');
        if (lazzaretto) versoLazz = set.mossa(lazzaretto, 101, 132);
      }
      if (versoLazz) await versoLazz(i);
      if (i === 140 && lazzaretto) await page.mouse.click(...set.mouse);
    });
    await page.evaluate(() => document.querySelector('.sf-bottone-firma')?.click());
    await set.avanti(2500);
    await page.evaluate(() => { const f = document.querySelector('#foglio'); f.dataset.bloccato = '0'; f.hidden = true; });

    // la sera: il nastro della casa 3 all'infrarosso
    await page.evaluate(() => { window.prova.sera(); });
    await set.avanti(1000);
    await set.quiete();
    await page.evaluate(() => { window.prova.apriNastri(); });
    await set.avanti(800);
    await page.evaluate(() => document.querySelector('#foglio-corpo button')?.click());
    await set.avanti(2500);
    const ir = await set.centro('#comandi .cmd-ir');
    await set.muovi([1300, 700]);
    const versoIr = set.mossa(ir, 2, 24);
    await set.gira('infrarosso', 5.5, async (i) => {
      await versoIr(i);
      if (i === 30) await page.mouse.click(...set.mouse);
      if (i === 40) await set.muovi([1700, 400]);
    });
    await page.evaluate(() => document.querySelector('#comandi .cmd-esci')?.click());
    await set.avanti(1500);
    await page.evaluate(() => { const f = document.querySelector('#foglio'); f.dataset.bloccato = '0'; f.hidden = true; });

    // la notte: il nastro (la cosa nera china sul letto), poi il contagio sulla mappa e il giornale
    await page.evaluate(() => { window.prova.dormi(); });
    await set.finche(() => window.prova.S.schermo === 'nastro-notte', null, 60000);
    // la terza immagine del nastro (la cosa nera china sul letto) arriva con la terza frase
    const righe = await page.evaluate(() => window.prova.D.OSPITE.solo.nastro);
    await set.finche((r) => document.querySelector('#parole')?.textContent.includes(r.slice(0, 10)), righe[2], 40000);
    await set.muovi([1919, 1079]);
    await set.gira('nastro_notte', 6);
    await set.finche(() => window.prova.S.schermo === 'mappa' && document.querySelector('#foglio')?.dataset.tipo === 'notte', null, 60000);
    await set.gira('mappa_notte', 5.5);
    const giornale = await set.centro('#foglio button', L('Il giornale del mattino'));
    await set.gira('giornale', 4.5, async (i) => {
      if (i === 4 && giornale) await page.mouse.click(...giornale);
      if (i === 5) await set.muovi([1919, 1079]);
    });
  },

  // il fax della ditta, la mattina del primo giorno: la videocamera si avvicina al foglio finché si legge
  async fax(set) {
    const page = await set.apri('prova');
    await set.quiete();
    await set.muovi([1500, 700]);
    await page.evaluate(() => { window.prova.apriFax(); });
    await set.avanti(1200);
    const r = await page.evaluate(() => {
      const f = [...document.querySelectorAll('#foglio *')].find((e) => e.getBoundingClientRect().width > 300 && /fx-|carta/.test(e.className));
      const b = (f || document.querySelector('#foglio')).getBoundingClientRect();
      return [b.x, b.y, b.width, b.height];
    });
    await page.evaluate(() => { const f = document.querySelector('#foglio'); f.dataset.bloccato = '0'; f.hidden = true; });
    await set.avanti(300);
    // dal quadro intero al foglio, con un poco di margine
    const w1 = Math.max(r[2] * 1.12, r[3] * 1.12 * 16 / 9);
    const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2;
    const camera = (i) => {
      const t = morbido((i - 24) / 96);
      const w = 1920 + (w1 - 1920) * t;
      const h = w * 9 / 16;
      const x = Math.min(Math.max(0, (960 + (cx - 960) * t) - w / 2), 1920 - w);
      const y = Math.min(Math.max(0, (540 + (cy - 540) * t) - h / 2), 1080 - h);
      return { x, y, w };
    };
    await set.gira('fax', 4.5, async (i) => {
      if (i === 8) await page.evaluate(() => { window.prova.apriFax(); });
    }, camera);

    // la mappa: il puntatore scende dall'alto dritto sulla casa 3 (senza passare sulle altre) e ci resta
    await page.evaluate(() => { const f = document.querySelector('#foglio'); f.dataset.bloccato = '0'; f.hidden = true; window.prova.vaiMappa(); window.prova.S.ora = 600; });
    await set.avanti(800);
    const casa3 = await page.evaluate(() => {
      const b = [...document.querySelectorAll('.pin')].find((q) => q.textContent.trim() === '3');
      const r = b.getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2 + 30];
    });
    await set.muovi([casa3[0] + 40, 6]);
    await set.gira('mappa', 4.5, set.mossa(casa3, 4, 30));
  },

  // la prima notte da sola (se nel gruppo "uno" la notte si blocca): la sera, il nastro della notte, il contagio sulla
  // mappa, il giornale
  async notte(set) {
    const page = await set.apri('prova');
    await set.quiete();
    await page.evaluate(() => { window.prova.sera(); });
    await set.avanti(1000);
    await set.quiete();
    await page.evaluate(() => { const f = document.querySelector('#foglio'); f.dataset.bloccato = '0'; f.hidden = true; window.prova.dormi(); });
    await set.finche(() => window.prova.S.schermo === 'nastro-notte', null, 60000);
    const righe = await page.evaluate(() => window.prova.D.OSPITE.solo.nastro);
    await set.finche((r) => document.querySelector('#parole')?.textContent.includes(r.slice(0, 10)), righe[2], 40000);
    await set.muovi([1919, 1079]);
    await set.gira('nastro_notte', 6);
    await set.finche(() => window.prova.S.schermo === 'mappa' && document.querySelector('#foglio')?.dataset.tipo === 'notte', null, 60000);
    await set.gira('mappa_notte', 5.5);
    const giornale = await set.centro('#foglio button', L('Il giornale del mattino'));
    await set.gira('giornale', 4.5, async (i) => {
      if (i === 4 && giornale) await page.mouse.click(...giornale);
      if (i === 5) await set.muovi([1919, 1079]);
    });
  },

  // il secondo giorno: la madre cambiata nella camera, e la sua bocca all'esame
  async due(set) {
    const page = await set.apri('prova');
    await page.evaluate(() => { window.prova.saltaAlGiorno2(); });
    await set.vero(6000);
    await set.finche(() => window.prova.S.giorno === 2 && document.querySelector('#schermo')?.dataset.schermo === 'stanza', null, 60000);
    await set.quiete();
    await page.evaluate(() => { document.querySelector('#foglio').dataset.bloccato = '0'; document.querySelector('#foglio').hidden = true; window.prova.vaiMappa(); window.prova.S.ora = 600; });
    await page.evaluate(() => { window.prova.vai('casa3'); });
    await set.vero(5000);
    await set.quiete();
    await page.evaluate(() => { window.prova.vaiLuogo('camera2'); });
    await set.vero(4000);
    await set.quiete();
    await page.evaluate(() => { window.prova.vaiLuogo('cucina2'); window.prova.S.visti.camera2 = false; });
    await set.avanti(800);
    await set.muovi([1919, 1079]);
    await set.gira('madre', 4, async (i) => { if (i === 2) await page.evaluate(() => { window.prova.vaiLuogo('camera2'); }); });
    await set.quiete();
    const bocca = await set.px(await page.evaluate(() => window.prova.dove('madre', 'bocca')));
    await set.muovi([1500, 800]);
    const versoBocca = set.mossa(bocca, 2, 22);
    await set.gira('madre_bocca', 4, async (i) => {
      await versoBocca(i);
      if (i === 26) await page.mouse.click(...set.mouse);
    });
  },

  // il terzo giorno: quelli che sono cambiati, ognuno a modo suo, e la maschera del 1630 nella cripta
  async tre(set) {
    const page = await set.apri('prova');
    await page.evaluate(() => { window.prova.saltaAlGiorno3(); });
    await set.vero(8000);
    await set.finche(() => window.prova?.S?.giorno === 3 && document.querySelector('#schermo')?.dataset.schermo === 'stanza', null, 60000);
    await set.quiete();
    await page.evaluate(() => { const f = document.querySelector('#foglio'); f.dataset.bloccato = '0'; f.hidden = true; window.prova.vaiMappa(); window.prova.S.ora = 480; });
    // ogni posto: si entra una volta per caricarlo, poi la ripresa dell'arrivo
    const posto = async (nome, casa, luogo, secondi = 4, dopo, altre = []) => {
      if (set.fatta(nome, secondi) && altre.every(([n, s]) => set.fatta(n, s))) { console.log(`ripresa ${nome}: c'e' gia'`); return; }
      await page.evaluate((c) => { window.prova.vai(c); }, casa);
      await set.vero(4000);
      await set.quiete();
      if (luogo) { await page.evaluate((l) => { window.prova.vaiLuogo(l); }, luogo); await set.vero(3000); await set.quiete(); }
      const qui = luogo || await page.evaluate(() => window.prova.S.luogo);
      await page.evaluate(() => { window.prova.vaiMappa(); });
      await set.avanti(300);
      await page.evaluate((l) => { window.prova.S.visti[l] = false; }, qui);
      await set.muovi([1919, 1079]);
      await set.gira(nome, secondi, async (i) => { if (i === 2) await page.evaluate((l) => { window.prova.vaiLuogo(l); }, qui); });
      await set.quiete();
      if (dopo) await dopo();
      await page.evaluate(() => { window.prova.vaiMappa(); });
      await set.avanti(300);
    };
    await posto('radicato', 'casa3', null, 4, async () => {
      const mani = await set.px(await page.evaluate(() => window.prova.dove('padre', 'mani')));
      await set.muovi([1500, 300]);
      const versoMani = set.mossa(mani, 2, 22);
      await set.gira('radicato_mani', 4, async (i) => { await versoMani(i); if (i === 26) await page.mouse.click(...set.mouse); });
      await set.quiete();
      for (let k = 0; k < 6 && await page.evaluate(() => !!window.prova.R().primo); k++) { await set.premi('Escape'); await set.avanti(500); }
    }, [['radicato_mani', 4]]);
    await posto('allungato', 'casa5', null);
    await posto('bozzolo', 'casa5', 'cantina5');
    await posto('gemelle', 'casa4', null);
    await posto('nuora', 'casa10', 'camera10');
    await posto('santa', 'casa7', 'cripta7', 5, async () => {
      // la maschera del 1630 nella nicchia: uguale alla tua
      const maschera = await set.px(await page.evaluate(() => window.prova.dove('maschera')));
      await set.muovi([1100, 500]);
      const versoMaschera = set.mossa(maschera, 2, 26);
      await set.gira('maschera', 9, async (i) => { await versoMaschera(i); if (i === 30) await page.mouse.click(...set.mouse); });
    }, [['maschera', 9]]);
  },

  // la stanza del medico in 3D, di giorno: lo sguardo scivola dalla finestra nella nebbia alla scrivania
  async stanza(set) {
    const page = await set.apri('prova');
    await set.quiete();
    // dopo le frasi dell'inizio, il suggerimento in basso resta: per la ripresa si toglie anche quello
    await set.avanti(9000);
    await page.evaluate(() => { document.querySelector('#parole')?.replaceChildren(); document.querySelector('#aiuto').style.visibility = 'hidden'; });
    const [yaw, pitch, x, z] = await page.evaluate(() => { const s = window.prova.stanza(); return [s.yaw, s.pitch, s.pos.x, s.pos.y]; });
    await set.muovi([1919, 1079]);
    await set.stanzaViva();
    await set.gira('stanza', 5, async (i, n) => {
      const t = morbido(i / (n - 1));
      await page.evaluate(([y, p, px, pz]) => { const s = window.prova.stanza(); s.yaw = y; s.pitch = p; s.pos.set(px, pz); },
        [yaw + 0.16 - 0.3 * t, pitch + 0.02 - 0.05 * t, x - Math.sin(yaw) * 0.35 * t, z - Math.cos(yaw) * 0.35 * t]);
    });
  },
};

(async () => {
  const nomi = process.argv.slice(2);
  const scelti = nomi.length ? nomi : Object.keys(GRUPPI);
  const cat = await CATALOGO;
  L = (s) => cat?.[s] ?? s;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars'] });
  const errori = [];
  for (const nome of scelti) {
    const set = new Set(browser, errori);
    const t0 = Date.now();
    try { await GRUPPI[nome](set); } catch (e) { errori.push(`${nome}: ${e.message.split('\n')[0]}`); }
    if (set.page) await set.page.close();
    console.log(`gruppo ${nome}: ${Math.round((Date.now() - t0) / 1000)} s`);
  }
  console.log('ERRORI', JSON.stringify(errori, null, 1));
  await browser.close();
})();
