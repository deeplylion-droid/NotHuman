// I suoni del gioco: sotto a tutto il fruscio del nastro (la videocamera registra sempre), poi l'ambiente del posto
// (il vento fuori dalla stanza del medico, il frigorifero della cucina, l'orologio del soggiorno, il respiro della
// madre in camera) e i colpi delle azioni (il fax, i timbri, la firma, le porte, lo zoom, i passi sulle assi).
// Con Web Audio: parte al primo tocco o clic (prima i browser non lasciano suonare), ogni file si carica la prima
// volta che serve, gli ambienti sfumano uno nell'altro, i colpi cambiano un poco ogni volta. L'icona
// dell'altoparlante toglie e rimette l'audio, e il browser se lo ricorda. I file si preparano con
// tools/prepara_suoni.py.

const DIR = "suoni/";
// il volume di ogni suono: i file arrivano tutti alla stessa intensita' percepita (tools/prepara_suoni.py), qui gli
// ambienti stanno sotto i colpi e il fruscio del nastro si sente appena
const VOLUMI = {
  nastro: 0.1, vento: 0.25, notte: 0.8, cucina: 0.2, soggiorno: 0.34, camera: 0.28,
  passo1: 0.42, passo2: 0.42, passo3: 0.42, fax: 1, carta: 0.57, giornale: 1, timbro: 0.7, firma: 0.45, porta: 0.56,
  zoom: 0.32, rec: 0.32, videoregistratore: 0.84, sedia: 0.8, contraddizione: 0.63, malvento: 0.8, monete: 0.84,
  disturbo: 0.4, interruttore: 0.5,
};
const SFUMA = 1.2; // secondi per far entrare e uscire un ambiente
const CHIAVE = "malvento-muto";

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
    this.uscita.gain.value = this.muto ? 0 : 1;
    // un limitatore in fondo: quando si sommano piu' suoni (la notte, il malvento, il nastro) non si distorce
    const limite = this.ctx.createDynamicsCompressor();
    limite.threshold.value = -6;
    limite.knee.value = 4;
    limite.ratio.value = 12;
    limite.attack.value = 0.003;
    limite.release.value = 0.25;
    this.uscita.connect(limite).connect(this.ctx.destination);
    this.ambiente(...this.voluti);
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
    if (!ctx || this.muto) return;
    this.carica(nome).then((buf) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = 1 + (Math.random() * 2 - 1) * varia;
      const g = ctx.createGain();
      g.gain.value = (VOLUMI[nome] ?? 0.5) * volume;
      src.connect(g).connect(this.uscita);
      src.start(ctx.currentTime + ritardo);
    }).catch(() => {});
  }

  // un passo sulle assi del pavimento: uno dei tre, ogni volta un po' diverso
  passo() {
    this.suona(`passo${1 + Math.floor(Math.random() * 3)}`, { volume: 0.75 + Math.random() * 0.25, varia: 0.08 });
  }

  silenzia(muto) {
    this.muto = muto;
    try { localStorage.setItem(CHIAVE, muto ? "1" : "0"); } catch { /* il browser non salva: pazienza */ }
    if (this.uscita) this.uscita.gain.setTargetAtTime(muto ? 0 : 1, this.ctx.currentTime, 0.08);
  }
}
