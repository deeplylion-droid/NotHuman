// Come parlano le persone nel gioco: "le parole addosso" e "il nastro delle frasi".
// Le frasi si scrivono lettera per lettera accanto alla faccia di chi parla, senza riquadri. Le parole chiave
// (tra asterischi nei dati) si accendono: passandoci sopra si illumina la parte della scena collegata, cliccandole
// si va li'. Le domande del medico si aprono a raggiera attorno al puntatore. Le dichiarazioni e gli indizi
// finiscono nel nastro in basso, da trascinare su qualcosa o qualcuno che li contraddice.
// Tutte le coordinate sono frazioni dello schermo (0-1, da sinistra e dall'alto).

const aspetta = (ms) => new Promise((res) => setTimeout(res, ms));
const SVG = "http://www.w3.org/2000/svg";
const VW = 1000, VH = 562.5;

function svgEl(tag, attributi) {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attributi)) e.setAttribute(k, v);
  return e;
}

// "Una *botta*. Al lavoro." -> pezzi di testo, con le parole chiave a parte
function pezzi(testo) {
  return testo.split(/(\*[^*]+\*)/).filter(Boolean).map((p) => (p.startsWith("*") ? { testo: p.slice(1, -1), chiave: true } : { testo: p }));
}

export function senzaAsterischi(testo) {
  return testo.replace(/\*/g, "");
}

export class Parole {
  constructor(strato) {
    this.strato = strato;
    this.turno = 0;
    this.salta = null;
    this.onChiave = null;
    this.onSopraChiave = null;
    this.timer = 0;
  }

  // c'e' una frase che si sta scrivendo o che si sta leggendo: un clic la fa andare avanti
  occupata() {
    return !!this.salta;
  }

  pulisci() {
    this.turno++;
    this.salta = null;
    clearTimeout(this.timer);
    this.strato.replaceChildren();
    this.onSopraChiave?.(null, null);
  }

  // scrive una battuta. ancora: { x, y, lato } con lato "destra" (x, y e' l'angolo in alto a sinistra della frase),
  // "sinistra" (x e' il bordo destro) o "sotto" (in basso al centro, per il medico, le descrizioni e chi non si vede);
  // "nome" per dire chi parla quando non si vede. chiavi: parola -> collegamento.
  // Risolve true quando la battuta e' finita (un clic la completa, un secondo la chiude), false se e' stata interrotta.
  async scrivi(chi, testo, ancora, chiavi = {}, opzioni = {}) {
    const turno = ++this.turno;
    clearTimeout(this.timer);
    this.onSopraChiave?.(null, null);
    for (const vecchia of this.strato.querySelectorAll(".frase")) vecchia.remove();
    const lato = ancora.lato || "sotto";
    const gesto = /^\[.*\]$/.test(testo.trim());
    const f = document.createElement("div");
    f.className = `frase ${lato}${chi === "TU" ? " tu" : chi ? "" : " descr"}${gesto ? " gesto" : ""}`;
    if (lato === "destra") {
      f.style.left = `${ancora.x * 100}%`;
      f.style.top = `${ancora.y * 100}%`;
      f.style.maxWidth = `min(36cqw, ${(0.985 - ancora.x) * 100}cqw)`;
    } else if (lato === "sinistra") {
      f.style.right = `${(1 - ancora.x) * 100}%`;
      f.style.top = `${ancora.y * 100}%`;
      f.style.maxWidth = `min(36cqw, ${(ancora.x - 0.015) * 100}cqw)`;
    }
    // chi parla, per chi legge con lo screen reader (e scritto davvero quando non si vede)
    const nome = document.createElement("span");
    nome.className = ancora.nome ? "chi" : "chi solo-lettori";
    nome.textContent = ancora.nome ? `${ancora.nome} · ` : chi === "TU" ? "Tu: " : chi ? `${chi}: ` : "";
    f.append(nome);
    const nodi = [];
    for (const p of pezzi(chi === "TU" ? `— ${testo}` : testo)) {
      const span = document.createElement("span");
      if (p.chiave) {
        span.className = "chiave";
        const link = chiavi[p.testo] ?? chiavi["*"];
        if (link) {
          span.dataset.link = link;
          span.addEventListener("pointerenter", () => this.onSopraChiave?.(link, span));
          span.addEventListener("pointerleave", () => this.onSopraChiave?.(null, null));
          span.addEventListener("click", (e) => { e.stopPropagation(); this.onChiave?.(link, span); });
        }
      }
      f.append(span);
      nodi.push([span, p.testo]);
    }
    const cursore = document.createElement("span");
    cursore.className = "cursore";
    f.append(cursore);
    this.strato.append(f);
    // si scrive lettera per lettera; un clic completa la frase, un secondo clic passa alla prossima
    let completa = false;
    let chiusa = false;
    this.salta = () => { if (!completa) completa = true; else chiusa = true; };
    const passo = opzioni.veloce ? 14 : 28;
    for (const [span, t] of nodi) {
      for (const ch of t) {
        if (this.turno !== turno) return false;
        if (completa) break;
        span.textContent += ch;
        await aspetta(ch === " " ? passo / 2 : /[.,?!…]/.test(ch) ? passo * 3 : passo);
      }
      if (completa) break;
    }
    if (this.turno !== turno) return false;
    for (const [span, t] of nodi) span.textContent = t;
    completa = true;
    cursore.remove();
    f.classList.add("finita");
    const ms = Math.max(1400, 600 + senzaAsterischi(testo).length * 42);
    const t0 = performance.now();
    while (performance.now() - t0 < ms && !chiusa) {
      if (this.turno !== turno) return false;
      await aspetta(40);
    }
    if (this.turno !== turno) return false;
    this.salta = null;
    return true;
  }

  // a fine discorso l'ultima frase resta ancora un po', piu' tenue, con le parole chiave da toccare
  attenua(ms = 7000) {
    const turno = this.turno;
    for (const f of this.strato.querySelectorAll(".frase")) f.classList.add("ferma");
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.turno !== turno) return;
      for (const f of this.strato.querySelectorAll(".frase")) f.classList.add("via");
      this.timer = setTimeout(() => { if (this.turno === turno) this.pulisci(); }, 700);
    }, ms);
  }
}

// le domande del medico a raggiera attorno al puntatore
export class Ruota {
  constructor(strato) {
    this.strato = strato;
  }

  aperta() {
    return !this.strato.hidden;
  }

  chiudi() {
    this.strato.replaceChildren();
    this.strato.hidden = true;
  }

  // voci: [{ testo, nuova, secondaria, disattiva, azione }]; basso: fin dove possono scendere le voci
  apri(x, y, voci, titolo, basso = 0.8) {
    this.strato.replaceChildren();
    const svg = svgEl("svg", { viewBox: `0 0 ${VW} ${VH}`, preserveAspectRatio: "none", class: "ruota-fili" });
    this.strato.append(svg);
    const cx = x * VW, cy = y * VH;
    // le voci si aprono dal lato dove c'e' piu' spazio, e restano dentro lo schermo
    const destra = x < 0.55;
    const n = voci.length;
    const ventaglio = Math.min(124, 26 * (n - 1));
    const centro = clampa((0.45 - y) * 140, -50, 50);
    const da = centro - ventaglio / 2;
    const r = 150;
    voci.forEach((v, i) => {
      const gradi = n === 1 ? centro : da + ventaglio * (i / (n - 1));
      const ang = gradi * Math.PI / 180;
      const lx = destra ? cx + Math.cos(ang) * r : cx - Math.cos(ang) * r;
      const ly = clampa(cy + Math.sin(ang) * r * 0.8, 0.07 * VH, basso * VH);
      svg.append(svgEl("line", { x1: cx + (lx - cx) * 0.12, y1: cy + (ly - cy) * 0.12, x2: lx, y2: ly, class: "ruota-filo" }));
      const b = document.createElement("button");
      b.type = "button";
      b.className = `ruota-voce ${destra ? "a-destra" : "a-sinistra"}${v.nuova ? " nuova" : ""}${v.secondaria ? " secondaria" : ""}`;
      b.textContent = v.testo;
      b.style.left = `${(lx / VW) * 100}%`;
      b.style.top = `${(ly / VH) * 100}%`;
      if (v.disattiva) b.disabled = true;
      b.addEventListener("click", (e) => { e.stopPropagation(); this.chiudi(); v.azione?.(); });
      this.strato.append(b);
    });
    svg.append(svgEl("circle", { cx, cy, r: 13, class: "ruota-anello" }), svgEl("circle", { cx, cy, r: 2.2, class: "ruota-punto" }));
    // l'anello chiude la raggiera
    const chiudi = document.createElement("button");
    chiudi.type = "button";
    chiudi.className = "ruota-chiudi";
    chiudi.setAttribute("aria-label", "Chiudi le domande");
    chiudi.style.left = `${x * 100}%`;
    chiudi.style.top = `${y * 100}%`;
    chiudi.addEventListener("click", (e) => { e.stopPropagation(); this.chiudi(); });
    this.strato.append(chiudi);
    if (titolo) {
      const t = document.createElement("div");
      t.className = `ruota-titolo ${destra ? "a-sinistra" : "a-destra"}`;
      t.textContent = titolo;
      t.style.left = `${x * 100}%`;
      t.style.top = `${y * 100}%`;
      this.strato.append(t);
    }
    this.strato.hidden = false;
  }
}

function clampa(v, a, b) {
  return Math.min(b, Math.max(a, v));
}

// il nastro delle frasi: dichiarazioni (con la faccia di chi le ha dette) e indizi, da trascinare
export class Striscia {
  constructor(el, scorri, segni) {
    this.el = el;
    this.scorri = scorri;
    this.segni = segni;
    this.onSopra = null;
    this.onRilascio = null;
    this.onTocco = null;
    this.trascina = null;
    this.fineTrascina = 0;
    this.mostrati = new Set();
  }

  // un clic appena dopo aver lasciato una frase trascinata non e' un clic vero
  appenaTrascinato() {
    return performance.now() - this.fineTrascina < 400;
  }

  // fotogrammi: [{ id, tipo ("detta" o "prova"), foto: { src, x, y, w, h, filtro }, testo, meta }]
  mostra(fotogrammi, vuoto) {
    this.scorri.replaceChildren();
    for (const f of fotogrammi) {
      const d = document.createElement("div");
      d.className = `fot ${f.tipo}`;
      d.dataset.id = f.id;
      d.tabIndex = 0;
      d.setAttribute("role", "button");
      d.setAttribute("aria-label", `${f.testo} (${f.meta}). Trascina su chi o cosa lo contraddice.`);
      const foto = document.createElement("span");
      foto.className = "fot-foto";
      if (f.foto) {
        foto.style.backgroundImage = `url(${f.foto.src})`;
        // la porzione dell'immagine da mostrare: x, y, w, h in frazioni
        const { x = 0, y = 0, w = 1, h = 1 } = f.foto;
        foto.style.backgroundSize = `${100 / w}% ${100 / h}%`;
        foto.style.backgroundPosition = `${w < 1 ? (x / (1 - w)) * 100 : 50}% ${h < 1 ? (y / (1 - h)) * 100 : 50}%`;
        if (f.foto.filtro) foto.classList.add(f.foto.filtro);
      }
      const t = document.createElement("span");
      t.className = "fot-testo";
      const frase = document.createElement("span");
      frase.className = "fot-frase";
      frase.textContent = f.testo;
      const meta = document.createElement("span");
      meta.className = "fot-meta";
      meta.textContent = f.meta;
      t.append(frase, meta);
      d.append(foto, t);
      if (!this.mostrati.has(f.id)) {
        d.classList.add("nuovo");
        this.mostrati.add(f.id);
      }
      d.addEventListener("pointerdown", (e) => this.inizia(e, d, f));
      d.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.onTocco?.(f, d); }
      });
      this.scorri.append(d);
    }
    if (!fotogrammi.length && vuoto) {
      const v = document.createElement("div");
      v.className = "fot vuoto";
      v.textContent = vuoto;
      this.scorri.append(v);
    }
    this.el.hidden = false;
    requestAnimationFrame(() => { this.scorri.scrollLeft = this.scorri.scrollWidth; });
  }

  nascondi() {
    this.el.hidden = true;
    this.annulla();
  }

  annulla() {
    const t = this.trascina;
    if (!t) return;
    t.fantasma?.remove();
    t.d.classList.remove("presa");
    t.togli();
    this.segni.togli("trascina");
    this.trascina = null;
  }

  inizia(e, d, f) {
    if (e.button > 0) return;
    // niente fuoco col clic: lo spazio deve continuare a far andare avanti le frasi
    e.preventDefault();
    e.stopPropagation();
    const schermo = this.el.closest("#schermo");
    const r = schermo.getBoundingClientRect();
    const rd = d.getBoundingClientRect();
    const origine = { x: (rd.left + rd.width / 2 - r.left) / r.width, y: (rd.top - r.top) / r.height };
    const t = { f, d, origine, x0: e.clientX, y0: e.clientY, mosso: false, fantasma: null, togli: () => {} };
    this.trascina = t;
    const punto = (ev) => ({ x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height });
    const muovi = (ev) => {
      if (this.trascina !== t) return;
      if (!t.mosso && Math.hypot(ev.clientX - t.x0, ev.clientY - t.y0) > 7) {
        // la foto si stacca dal nastro solo quando si comincia a trascinarla
        t.mosso = true;
        t.fantasma = d.cloneNode(true);
        t.fantasma.classList.remove("nuovo", "scelta");
        t.fantasma.classList.add("fantasma");
        t.fantasma.style.width = `${rd.width}px`;
        t.fantasma.style.height = `${rd.height}px`;
        schermo.append(t.fantasma);
        d.classList.add("presa");
      }
      if (!t.mosso) return;
      ev.preventDefault();
      const p = punto(ev);
      t.fantasma.style.left = `${p.x * 100}%`;
      t.fantasma.style.top = `${p.y * 100}%`;
      this.segni.filo("trascina", t.origine.x, t.origine.y, p.x, p.y, "rosso");
      t.fantasma.hidden = true;
      const sotto = document.elementFromPoint(ev.clientX, ev.clientY);
      t.fantasma.hidden = false;
      this.onSopra?.(f, p.x, p.y, sotto);
    };
    const fine = (ev) => {
      window.removeEventListener("pointermove", muovi);
      window.removeEventListener("pointerup", fine);
      window.removeEventListener("pointercancel", fine);
      if (this.trascina !== t) return;
      let sotto = null;
      if (t.fantasma) {
        t.fantasma.hidden = true;
        sotto = document.elementFromPoint(ev.clientX, ev.clientY);
      }
      const mosso = t.mosso;
      // il browser manda anche un clic a chi contiene sia il nastro sia la scena: va ignorato
      if (mosso) this.fineTrascina = performance.now();
      this.annulla();
      this.onSopra?.(null);
      // pointercancel: il browser ha preso il gesto per scorrere il nastro
      if (ev.type !== "pointerup") return;
      const p = punto(ev);
      if (mosso) this.onRilascio?.(f, p.x, p.y, sotto);
      else this.onTocco?.(f, d);
    };
    window.addEventListener("pointermove", muovi, { passive: false });
    window.addEventListener("pointerup", fine);
    window.addEventListener("pointercancel", fine);
  }
}

// i segni sopra la scena: ellissi tratteggiate sulle cose indicate, fili tra frasi e scena
export class Segni {
  constructor(svg) {
    this.svg = svg;
  }

  gruppo(nome) {
    let g = this.svg.querySelector(`g[data-g="${nome}"]`);
    if (!g) {
      g = svgEl("g", { "data-g": nome });
      this.svg.append(g);
    }
    return g;
  }

  // ellissi: [[cx, cy, rx, ry], ...]
  ellissi(nome, lista, stile) {
    const g = this.gruppo(nome);
    g.replaceChildren(...lista.map(([cx, cy, rx, ry]) => svgEl("ellipse", {
      cx: cx * VW, cy: cy * VH, rx: rx * VW, ry: ry * VH, class: `segno ${stile}` })));
  }

  filo(nome, x1, y1, x2, y2, stile) {
    const g = this.gruppo(nome);
    const X1 = x1 * VW, Y1 = y1 * VH, X2 = x2 * VW, Y2 = y2 * VH;
    // un filo che pende un po', come uno spago
    const mx = (X1 + X2) / 2, my = (Y1 + Y2) / 2 + Math.min(50, Math.hypot(X2 - X1, Y2 - Y1) * 0.16);
    g.replaceChildren(svgEl("path", { d: `M ${X1} ${Y1} Q ${mx} ${my} ${X2} ${Y2}`, class: `filo ${stile}` }));
  }

  togli(nome) {
    this.svg.querySelector(`g[data-g="${nome}"]`)?.remove();
  }

  svuota() {
    for (const g of this.svg.querySelectorAll("g[data-g]")) g.remove();
  }
}
