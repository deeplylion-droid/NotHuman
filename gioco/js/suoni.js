// I suoni del gioco: sotto a tutto il fruscio del nastro (la videocamera registra sempre), poi l'ambiente del posto
// (il vento fuori dalla stanza del medico, il frigorifero della cucina, l'orologio del soggiorno, il respiro della
// madre in camera, il nebulizzatore della casa 2) e i colpi delle azioni (il fax, i timbri, la firma, le porte, lo zoom, i passi sulle assi).
// Con Web Audio: parte al primo tocco o clic (prima i browser non lasciano suonare), ogni file si carica la prima
// volta che serve, gli ambienti sfumano uno nell'altro, i colpi cambiano un poco ogni volta. L'icona
// dell'altoparlante toglie e rimette l'audio, e il browser se lo ricorda. I file si preparano con
// tools/prepara_suoni.py.
// Piu' cupi e piu' rari (deciso il 27 ottobre): tutto passa da un filtro che toglie gli acuti, come sentire
// attraverso la maschera, e suona un poco piu' grave; alcuni colpi non ci sono piu' (TOLTI), altri non si ripetono
// troppo spesso (PAUSE), dei passi se ne sente uno si' e uno no.

const DIR = "suoni/";
// il volume di ogni suono: i file arrivano tutti alla stessa intensita' percepita (tools/prepara_suoni.py), qui gli
// ambienti stanno sotto i colpi e il fruscio del nastro si sente appena
const VOLUMI = {
  nastro: 0.08, vento: 0.18, notte: 0.6, cucina: 0.14, soggiorno: 0.24, camera: 0.22, nebulizzatore: 0.16,
  passo1: 0.32, passo2: 0.32, passo3: 0.32, fax: 0.8, carta: 0.57, giornale: 0.8, timbro: 0.6, firma: 0.35, porta: 0.45,
  zoom: 0.32, rec: 0.3, videoregistratore: 0.7, sedia: 0.8, contraddizione: 0.63, malvento: 0.85, monete: 0.84,
  disturbo: 0.3, interruttore: 0.4,
};
// i colpi che non suonano piu' (troppi, per un gioco cupo): i fogli, lo zoom, la sedia, le monete
const TOLTI = new Set(["carta", "zoom", "sedia", "monete"]);
// secondi minimi tra due volte lo stesso colpo
const PAUSE = { disturbo: 4 };
// quanto piu' grave: la velocita' (e l'altezza) degli ambienti e dei colpi
const GRAVE = { ambienti: 0.9, colpi: 0.93 };
// sopra questa frequenza il suono si smorza (Hz): come sentire attraverso la maschera
const CUPO = 1900;
const SFUMA = 1.2; // secondi per far entrare e uscire un ambiente
const CHIAVE = "malvento-muto";
// la musica (29 ottobre, sera: «su I'm Not a Human uno dei punti forti è la musica. Iniziamo a creare una colonna
// sonora anche noi? Diverse canzoni tra stanza del medico e visite?»): un brano alla volta (suoni/musica, preparati da
// tools/prepara_suoni.py), che sfuma nell'altro quando si cambia posto; ogni brano gira in anello: prima della fine
// riparte da capo sfumando dentro se stesso. Non passa dal filtro della maschera (e' la musica del gioco, non un suono
// della stanza) e ha il suo volume, nelle impostazioni
const MUSICA = "musica/";
const MUSICA_BASE = 0.55; // sotto gli ambienti e i colpi
const MUSICA_SFUMA = 3; // secondi tra un brano e l'altro
const MUSICA_ANELLO = 8; // secondi in cui il brano sfuma dentro se stesso

// dove comincia e finisce davvero il suono (l'mp3 puo' avere un po' di silenzio ai lati: nell'anello farebbe un buco)
function bordi(buf) {
  const d = buf.getChannelData(0);
  let a = 0, b = d.length - 1;
  while (a < b && Math.abs(d[a]) < 1e-4) a++;
  while (b > a && Math.abs(d[b]) < 1e-4) b--;
  return [a / buf.sampleRate, (b + 1) / buf.sampleRate];
}

export class Suoni {
  constructor() {
    this.ctx = null;
    this.buffer = {};
    this.ambienti = {}; // nome -> { src, gain }
    this.voluti = []; // gli ambienti di adesso, anche prima che l'audio possa partire
    try { this.muto = localStorage.getItem(CHIAVE) === "1"; } catch { this.muto = false; }
    this.livello = 1; // il volume delle impostazioni (0-1), sotto l'altoparlante che toglie l'audio
    this.livelloMusica = 1; // il volume della musica (0-1), sotto il volume di tutto
    this.musicaVoluta = null; // il brano di adesso, anche prima che l'audio possa partire
    this.brano = null;
    const sblocca = () => this.avvia();
    for (const ev of ["pointerdown", "keydown", "touchend"]) window.addEventListener(ev, sblocca, true);
  }

  avvia() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      return;
    }
    const Contesto = window.AudioContext || window.webkitAudioContext;
    if (!Contesto) return;
    this.ctx = new Contesto();
    this.uscita = this.ctx.createGain();
    this.uscita.gain.value = this.muto ? 0 : this.livello;
    // un limitatore in fondo: quando si sommano piu' suoni (la notte, il malvento, il nastro) non si distorce
    const limite = this.ctx.createDynamicsCompressor();
    limite.threshold.value = -6;
    limite.knee.value = 4;
    limite.ratio.value = 12;
    limite.attack.value = 0.003;
    limite.release.value = 0.25;
    // piu' cupo: via gli acuti, un poco di bassi in piu'
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = CUPO;
    filtro.Q.value = 0.5;
    const bassi = this.ctx.createBiquadFilter();
    bassi.type = "lowshelf";
    bassi.frequency.value = 180;
    bassi.gain.value = 3;
    this.uscita.connect(filtro).connect(bassi).connect(limite).connect(this.ctx.destination);
    // la musica entra direttamente nel limitatore, senza il filtro della maschera
    this.musicaUscita = this.ctx.createGain();
    this.musicaUscita.gain.value = this.guadagnoMusica();
    this.musicaUscita.connect(limite);
    this.ambiente(...this.voluti);
    this.musica(this.musicaVoluta);
  }

  guadagnoMusica() {
    return this.muto ? 0 : this.livello * this.livelloMusica * MUSICA_BASE;
  }

  // il brano di adesso ("stanza_giorno", "stanza_sera", "visita"; null: niente musica)
  musica(nome) {
    this.musicaVoluta = nome || null;
    const ctx = this.ctx;
    if (!ctx || this.brano?.nome === this.musicaVoluta || (!this.brano && !nome)) return;
    // esce quello di prima
    if (this.brano) {
      const b = this.brano, t = ctx.currentTime;
      b.finito = true;
      clearTimeout(b.giro);
      b.gain.gain.cancelScheduledValues(t);
      b.gain.gain.setValueAtTime(b.gain.gain.value, t);
      b.gain.gain.linearRampToValueAtTime(0, t + MUSICA_SFUMA);
      for (const src of b.sorgenti) src.stop(t + MUSICA_SFUMA + 0.05);
      this.brano = null;
      // un brano decodificato pesa una quarantina di MB: quello che esce si dimentica (se torna, si rilegge)
      setTimeout(() => { if (this.brano?.nome !== b.nome) delete this.buffer[MUSICA + b.nome]; }, (MUSICA_SFUMA + 1) * 1000);
    }
    if (!nome) return;
    const b = { nome, gain: ctx.createGain(), sorgenti: [], giro: 0, finito: false };
    b.gain.gain.value = 0;
    b.gain.connect(this.musicaUscita);
    this.brano = b;
    this.carica(MUSICA + nome).then((buf) => {
      if (b.finito) return;
      const t = ctx.currentTime;
      b.gain.gain.setValueAtTime(0, t);
      b.gain.gain.linearRampToValueAtTime(1, t + MUSICA_SFUMA);
      this.giro(b, buf, t, true);
    }).catch(() => {});
  }

  // un giro del brano: comincia (sfumando, se non e' il primo) e, quando sta per finire, fa partire il giro dopo, che
  // entra mentre questo esce (i brani finiscono gia' sfumando: cosi' l'anello non si sente)
  giro(b, buf, quando, primo) {
    const ctx = this.ctx;
    const anello = Math.min(MUSICA_ANELLO, buf.duration / 4);
    const fine = quando + buf.duration;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    src.connect(g).connect(b.gain);
    if (!primo) {
      g.gain.setValueAtTime(0, quando);
      g.gain.linearRampToValueAtTime(1, quando + anello);
    }
    g.gain.setValueAtTime(1, fine - anello);
    g.gain.linearRampToValueAtTime(0, fine);
    src.start(quando);
    src.stop(fine + 0.05);
    b.sorgenti.push(src);
    src.onended = () => { b.sorgenti = b.sorgenti.filter((x) => x !== src); };
    // il giro dopo si prepara un secondo prima (l'orologio dell'audio lo fa partire al momento giusto)
    const prossimo = fine - anello;
    b.giro = setTimeout(() => { if (!b.finito) this.giro(b, buf, Math.max(prossimo, ctx.currentTime), false); },
      Math.max(0, (prossimo - ctx.currentTime - 1) * 1000));
  }

  carica(nome) {
    this.buffer[nome] ||= fetch(DIR + nome + ".mp3")
      .then((r) => r.arrayBuffer())
      .then((b) => this.ctx.decodeAudioData(b));
    return this.buffer[nome];
  }

  // gli ambienti di adesso (per esempio "nastro", "vento"): i nuovi entrano sfumando, gli altri escono
  ambiente(...nomi) {
    this.voluti = nomi;
    const ctx = this.ctx;
    if (!ctx) return;
    const ora = ctx.currentTime;
    for (const [n, a] of Object.entries(this.ambienti)) {
      if (nomi.includes(n)) continue;
      a.gain.gain.cancelScheduledValues(ora);
      a.gain.gain.setValueAtTime(a.gain.gain.value, ora);
      a.gain.gain.linearRampToValueAtTime(0, ora + SFUMA);
      a.src?.stop(ora + SFUMA + 0.05);
      delete this.ambienti[n];
    }
    for (const n of nomi) {
      if (this.ambienti[n]) continue;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(this.uscita);
      const a = { gain, src: null };
      this.ambienti[n] = a;
      this.carica(n).then((buf) => {
        if (this.ambienti[n] !== a) return;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.playbackRate.value = GRAVE.ambienti;
        [src.loopStart, src.loopEnd] = bordi(buf);
        src.connect(gain);
        // ogni volta da un punto diverso dell'anello, cosi' non suona sempre uguale
        src.start(0, src.loopStart + Math.random() * (src.loopEnd - src.loopStart));
        a.src = src;
        const t = ctx.currentTime;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(VOLUMI[n] ?? 0.4, t + SFUMA);
      }).catch(() => {});
    }
  }

  // un colpo: "varia" cambia un poco la velocita' (e l'altezza) ogni volta
  suona(nome, { volume = 1, varia = 0.03, ritardo = 0 } = {}) {
    const ctx = this.ctx;
    if (!ctx || this.muto || TOLTI.has(nome)) return;
    if (PAUSE[nome]) {
      if (ctx.currentTime - (this.ultimo?.[nome] ?? -99) < PAUSE[nome]) return;
      (this.ultimo ||= {})[nome] = ctx.currentTime;
    }
    this.carica(nome).then((buf) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = GRAVE.colpi * (1 + (Math.random() * 2 - 1) * varia);
      const g = ctx.createGain();
      g.gain.value = (VOLUMI[nome] ?? 0.5) * volume;
      src.connect(g).connect(this.uscita);
      src.start(ctx.currentTime + ritardo);
    }).catch(() => {});
  }

  // un passo sulle assi del pavimento: uno dei tre, ogni volta un po' diverso; se ne sente uno si' e uno no
  passo() {
    this.passi = (this.passi || 0) + 1;
    if (this.passi % 2) return;
    this.suona(`passo${1 + Math.floor(Math.random() * 3)}`, { volume: 0.6 + Math.random() * 0.25, varia: 0.08 });
  }

  silenzia(muto) {
    this.muto = muto;
    try { localStorage.setItem(CHIAVE, muto ? "1" : "0"); } catch { /* il browser non salva: pazienza */ }
    this.alza();
  }

  // il volume delle impostazioni (0-1)
  volume(v) {
    this.livello = v;
    this.alza();
  }

  // il volume della musica (0-1)
  volumeMusica(v) {
    this.livelloMusica = v;
    this.alza();
  }

  alza() {
    if (this.uscita) this.uscita.gain.setTargetAtTime(this.muto ? 0 : this.livello, this.ctx.currentTime, 0.08);
    if (this.musicaUscita) this.musicaUscita.gain.setTargetAtTime(this.guadagnoMusica(), this.ctx.currentTime, 0.08);
  }
}
