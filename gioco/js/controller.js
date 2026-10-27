// Il controller (per esempio sullo Steam Deck), con la mappatura standard dei gamepad.
// - Nelle schermate 2D (la scrivania, la mappa, le visite, i fogli) la levetta sinistra muove la punta del bastone,
//   il puntatore del gioco (la croce direzionale la muove piano, per la precisione), A clicca dove punta e,
//   tenuto premuto, trascina (le frasi del nastro, i timbri); B torna indietro (chiude i fogli, la raggiera, il
//   primo piano; seduti alla scrivania, Alzati); la levetta destra scorre i fogli lunghi e il nastro delle frasi.
//   Il controller fa come il mouse: gli eventi del puntatore vanno a quello che c'e' sotto la punta.
// - Nella stanza 3D la levetta sinistra cammina, la destra gira lo sguardo, A usa quello che c'e' nel mirino (o fa
//   andare avanti le frasi).
// Appena si muove il mouse o si tocca lo schermo, il controller si fa da parte.

const MORTA = 0.2; // la zona morta delle levette
const VELOCITA = 1000; // punti al secondo, a levetta tutta piegata
const LENTA = 260; // punti al secondo con la croce direzionale
const SCORRI = 1100; // punti al secondo, per scorrere i fogli
const ID = 31; // il numero del puntatore finto

const leva = (v) => (Math.abs(v) < MORTA ? 0 : Math.sign(v) * ((Math.abs(v) - MORTA) / (1 - MORTA)) ** 1.6);

// opzioni: schermo (l'elemento del gioco), nellaStanza() (si cammina nella stanza 3D), stanza(), usa() (A nella
// stanza), indietro() (B), mirino(si) (il mirino al centro, come col mouse bloccato)
export function avviaController(o) {
  const punta = document.createElement("div");
  punta.id = "punta-leva";
  punta.hidden = true;
  document.body.append(punta);
  let attivo = false;
  let x = 0, y = 0;
  let premuto = null; // A tenuto giu': dove era la punta quando si e' premuto
  let prima = [];
  let inStanza = false;
  let ultimo = 0;
  let giro = 0;

  const sotto = () => {
    punta.hidden = true;
    const el = document.elementFromPoint(x, y);
    punta.hidden = !attivo || inStanza;
    return el;
  };
  const evento = (tipo, el, bottoni) => {
    if (!el) return;
    el.dispatchEvent(new PointerEvent(tipo, {
      bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, pointerId: ID, pointerType: "mouse",
      isPrimary: true, button: tipo === "pointermove" ? -1 : 0, buttons: bottoni,
    }));
  };
  const clic = (el) => {
    if (!el) return;
    // i bottoni, le caselle e i link come un clic vero; il resto col punto preciso (la scena, la mappa)
    const controllo = el.closest?.("button, input, label, select, a");
    if (controllo) controllo.click();
    else el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
  };
  // il clic va dove il pulsante e' stato premuto e lasciato (il loro antenato comune), come fa il browser col mouse
  const comune = (a, b) => {
    if (!a?.isConnected) return b?.isConnected ? b : null;
    for (let e = a; e; e = e.parentElement) if (e.contains(b)) return e;
    return null;
  };
  const scorribile = (el, asse) => {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (asse === "y" && /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 2) return e;
      if (asse === "x" && /(auto|scroll)/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 2) return e;
    }
    return asse === "y" ? document.scrollingElement : null;
  };
  const metti = () => {
    punta.style.transform = `translate(${x}px, ${y}px)`;
    punta.classList.toggle("sopra", o.schermo.dataset.sopra === "1");
  };

  const accendi = () => {
    if (attivo) return;
    attivo = true;
    document.documentElement.classList.add("con-leva");
    const r = o.schermo.getBoundingClientRect();
    if (!x && !y) { x = r.left + r.width / 2; y = r.top + r.height / 2; }
    metti();
  };
  const spegni = () => {
    if (!attivo) return;
    attivo = false;
    premuto = null;
    punta.hidden = true;
    document.documentElement.classList.remove("con-leva");
    if (inStanza) { inStanza = false; o.mirino(false); o.stanza()?.leve(0, 0, 0, 0, 0); }
  };
  // il mouse vero o il dito: il controller si fa da parte
  for (const ev of ["pointermove", "pointerdown"]) {
    window.addEventListener(ev, (e) => { if (e.isTrusted && attivo && (ev === "pointerdown" || Math.abs(e.movementX) + Math.abs(e.movementY) > 2)) spegni(); }, true);
  }

  const passo = (t) => {
    giro = requestAnimationFrame(passo);
    const dt = Math.min(0.05, ultimo ? (t - ultimo) / 1000 : 0);
    ultimo = t;
    const g = [...(navigator.getGamepads?.() || [])].find((p) => p && p.connected);
    if (!g) return;
    const b = g.buttons.map((t) => t.pressed);
    const p = prima;
    prima = b;
    const giu = (i) => b[i] && !p[i];
    const su = (i) => !b[i] && p[i];
    const [lx, ly, rx, ry] = [0, 1, 2, 3].map((i) => leva(g.axes[i] || 0));
    const croce = [(b[15] ? 1 : 0) - (b[14] ? 1 : 0), (b[13] ? 1 : 0) - (b[12] ? 1 : 0)];
    const usato = lx || ly || rx || ry || croce[0] || croce[1] || b.some((t, i) => t && !p[i]);
    if (usato) accendi();
    if (!attivo) return;

    // nella stanza 3D: camminare, guardarsi attorno, usare
    const stanza = o.nellaStanza();
    if (stanza !== inStanza) {
      inStanza = stanza;
      o.mirino(stanza);
      if (!stanza) o.stanza()?.leve(0, 0, 0, 0, 0);
      punta.hidden = stanza;
    }
    if (stanza) {
      o.stanza().leve(lx + croce[0] * 0.6, ly + croce[1] * 0.6, rx, ry, dt);
      if (giu(0)) o.usa();
      if (giu(1)) o.indietro();
      return;
    }

    // nelle schermate 2D: la punta del bastone
    const vx = lx * VELOCITA + croce[0] * LENTA, vy = ly * VELOCITA + croce[1] * LENTA;
    if (vx || vy) {
      x = Math.min(window.innerWidth - 1, Math.max(0, x + vx * dt));
      y = Math.min(window.innerHeight - 1, Math.max(0, y + vy * dt));
      evento("pointermove", sotto(), premuto ? 1 : 0);
    }
    metti();
    if (giu(0)) {
      premuto = sotto();
      evento("pointerdown", premuto, 1);
    }
    if (su(0) && premuto) {
      const el = sotto();
      evento("pointerup", el, 0);
      clic(comune(premuto, el));
      premuto = null;
    }
    if (giu(1)) o.indietro();
    if (ry) scorribile(sotto(), "y")?.scrollBy(0, ry * SCORRI * dt);
    if (rx) scorribile(sotto(), "x")?.scrollBy(rx * SCORRI * dt, 0);
  };
  window.addEventListener("gamepadconnected", () => { if (!giro) giro = requestAnimationFrame(passo); });
  // se il controller era gia' collegato prima che la pagina lo chiedesse
  if ([...(navigator.getGamepads?.() || [])].some((p) => p)) giro = requestAnimationFrame(passo);
  // per le prove: la punta in un punto preciso dello schermo
  const porta = (px, py) => {
    accendi();
    x = px;
    y = py;
    evento("pointermove", sotto(), premuto ? 1 : 0);
    metti();
  };
  return { spegni, porta };
}
