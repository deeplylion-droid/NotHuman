// Per le prove nella lingua finta (#prova-xx, vedi gioco/js/lingua.js): ogni testo che passa da T si vede tra ⟦ ⟧, e
// questo raccoglie quello che resta fuori, cioe' i testi che non si tradurrebbero (le scritte sullo schermo, le
// etichette per lo screen reader, il titolo della pagina). Si usa cosi':
//   const { sorveglia, fuori } = require('./lingua_fuori.js');
//   await sorveglia(page);            // prima di page.goto
//   ...
//   console.log(await fuori(page));   // alla fine
// Le frasi che si scrivono lettera per lettera si guardano solo intere (.frase.finita).

// le parole che restano uguali in tutte le lingue (le scritte della videocamera e le unita')
const UGUALI = /^(REC|PLAY|IR|MIN|AM|PM|WASD|Esc|E|F11|Alt|VHS|OK|SP|LP)$/;

function guardia(uguali) {
  const visti = new Map();
  window.__fuori = visti;
  const togli = (s) => {
    for (let p = null; p !== s;) { p = s; s = s.replace(/⟦[^⟦⟧]*⟧/g, ' '); }
    return s.replace(/[⟦⟧]/g, ' ');
  };
  const re = new RegExp(uguali);
  const guarda = (testo, dove) => {
    if (!testo || !/[A-Za-zÀ-ÿ]/.test(testo)) return;
    const parole = togli(testo).match(/[A-Za-zÀ-ÿ']{2,}/g);
    if (!parole || parole.every((p) => re.test(p))) return;
    const k = `${dove}: ${testo.trim().replace(/\s+/g, ' ').slice(0, 180)}`;
    visti.set(k, (visti.get(k) || 0) + 1);
  };
  const nome = (e) => (e.id ? `#${e.id}` : e.className && typeof e.className === 'string' ? `.${e.className.split(' ')[0]}` : e.tagName.toLowerCase());
  const giro = () => {
    guarda(document.title, 'title');
    for (const e of document.body.querySelectorAll('*')) {
      if (e.closest('[hidden], script, style, defs')) continue;
      for (const a of ['aria-label', 'title', 'alt', 'placeholder']) if (e.getAttribute(a)) guarda(e.getAttribute(a), `${nome(e)}[${a}]`);
      const frase = e.closest('.frase');
      if (frase) {
        if (e === frase && frase.classList.contains('finita')) guarda(frase.textContent, '.frase');
        continue;
      }
      let t = '';
      for (const n of e.childNodes) if (n.nodeType === 3) t += n.nodeValue;
      guarda(t, nome(e));
    }
  };
  setInterval(giro, 400);
  window.__giroLingua = giro;
}

exports.sorveglia = async (page) => {
  await page.addInitScript(guardia, UGUALI.source);
};

exports.fuori = async (page) => page.evaluate(() => {
  window.__giroLingua?.();
  return [...(window.__fuori || new Map()).entries()].map(([k, n]) => `${n}× ${k}`).sort();
});
