// Le lingue del gioco (29 ottobre, sera: «comincia dalla versione inglese», per Steam). L'italiano resta la lingua del
// codice: ogni testo che si vede passa da T("...") o, se dentro ci sono dei valori, dal tag T`... ${x} ...`. In
// italiano T restituisce il testo com'e'; nelle altre lingue lo cerca nel catalogo (lingua_en.js, preparato da
// tools/lingua: la chiave e' il testo italiano, coi valori al posto di {0}, {1}...) e, se manca, lo lascia in italiano.
// La lingua si sceglie dal titolo (Impostazioni) e si ricorda nel browser; di partenza e' quella del sistema
// (l'italiano per chi ha il computer in italiano, l'inglese per tutti gli altri), ma le prove automatiche partono in
// italiano. Cambiarla ricarica la pagina: i testi dei giorni si scrivono quando i loro moduli si caricano.
// Per le prove, in fondo all'indirizzo: "-it", "-en", o "-xx", la lingua finta che mette ogni testo tradotto tra ⟦ ⟧
// (quello che resta fuori non passa da T).

const CHIAVE = "malvento.lingua";
export const LINGUE = { it: "Italiano", en: "English" };

function scegli() {
  const h = typeof location !== "undefined" ? /-(it|en|xx)\b/.exec(location.hash)?.[1] : null;
  if (h) return h;
  if (typeof location === "undefined" || typeof navigator === "undefined" || navigator.webdriver) return "it";
  try {
    const l = localStorage.getItem(CHIAVE);
    if (LINGUE[l]) return l;
  } catch { /* niente memoria: quella del sistema */ }
  return (navigator.language || "it").toLowerCase().startsWith("it") ? "it" : "en";
}

export const LINGUA = scegli();
const FINTA = LINGUA === "xx";

// il catalogo si carica solo se serve (in italiano non c'e'); se manca, si gioca in italiano. Dentro ci sono anche le
// immagini con le scritte nella lingua (IMMAGINI: la mappa, il calendario della ditta; tools/lingua/immagini.py)
let CATALOGO = null, IMMAGINI = {};
if (LINGUA !== "it" && !FINTA) {
  try {
    ({ CATALOGO, IMMAGINI = {} } = await import(`./lingua_${LINGUA}.js`));
  } catch (err) {
    console.warn(`Il catalogo "${LINGUA}" non si carica, resta l'italiano:`, err);
  }
}

export function T(testo, ...valori) {
  // T`... ${x} ...`: la chiave ha i valori al posto di {0}, {1}...
  if (Array.isArray(testo) && testo.raw) {
    const chiave = testo.reduce((s, pezzo, i) => s + (i ? `{${i - 1}}` : "") + pezzo, "");
    const tradotto = (CATALOGO?.[chiave] ?? chiave).replace(/\{(\d+)\}/g, (_, i) => valori[i] ?? "");
    return FINTA ? `⟦${tradotto}⟧` : tradotto;
  }
  return FINTA ? `⟦${testo}⟧` : CATALOGO?.[testo] ?? testo;
}

// un'immagine del gioco nella lingua scelta, se il catalogo ce l'ha (un data URL), se no quella italiana
export function inLingua(src) {
  return IMMAGINI[src] ?? src;
}

export function scegliLingua(l) {
  try { localStorage.setItem(CHIAVE, l); } catch { /* il browser non salva: vale solo per ora */ }
}

// i testi scritti nella pagina (index.html): le scritte e le etichette per chi legge con lo screen reader
export function traduciPagina(radice = document.body) {
  if (LINGUA === "it") return;
  document.documentElement.lang = FINTA ? "en" : LINGUA;
  document.title = T(document.title);
  const giro = document.createTreeWalker(radice, NodeFilter.SHOW_TEXT);
  for (let n = giro.nextNode(); n; n = giro.nextNode()) {
    const t = n.nodeValue.trim();
    if (t && /[A-Za-zÀ-ÿ]/.test(t)) n.nodeValue = n.nodeValue.replace(t, T(t));
  }
  for (const e of radice.querySelectorAll("[aria-label], [title], [alt]")) {
    for (const a of ["aria-label", "title", "alt"]) if (e.getAttribute(a)) e.setAttribute(a, T(e.getAttribute(a)));
  }
}
