// La prima pagina della Voce, il giornale del paese, disegnata su una tela: e' il giornale piegato sulla scrivania
// della stanza del medico (28 ottobre: quello di Meshy era sfocato, «low quality»). Il gioco ci disegna il giornale del
// giorno (stanza.js, giornale()); la stessa pagina, col giornale del primo giorno, la salva tools/prima_pagina.js per
// Blender (art/stanza_hq/texture/giornale.jpg). La tela e' quadrata: in alto, fino a PIEGA, la meta' della prima pagina
// che si vede sopra la piega (la testata, la data, il titolo, il sommario, la foto con la didascalia e due colonne);
// sotto, le pagine di dentro, che si vedono sulla piega, e in fondo i bordi dei fogli uno sopra l'altro.

export const LATO = 2048;
export const PIEGA = 0.7;
// la striscia in fondo coi bordi dei fogli (per i lati del giornale), in frazioni della tela
export const BORDI = [0.965, 1.0];

const CARTA = [231, 222, 199];
const INCHIOSTRO = "#211b16";
const SERIF = '"Old Standard TT", Georgia, "Times New Roman", serif';
const TESTATA = '"Alfa Slab One", "Old Standard TT", Georgia, serif';

// le notizie piccole che riempiono le colonne, uguali tutti i giorni (il paese non cambia)
const RIEMPI1 = [
  ["IL FORNO", "Il forno di via dei Mulini resta chiuso fino a nuovo avviso. Il pane si ritira in canonica, la mattina, fino alle nove."],
  ["LA CORRIERA", "La corriera per la città passa una volta al giorno, alle 6.10. Chi parte deve avere il foglio della ditta."],
  ["LEGNA", "Si cercano uomini per la legna della scuola. Paga il comune, in natura."],
];
const RIEMPI2 = [
  ["SMARRITO", "Un cane da pastore, nero, risponde al nome di Lupo. Manca da giovedì notte. Chi lo vede lo dica al bar."],
  ["ORARI", "Il coprifuoco resta alle otto di sera. Le campane suonano mezz'ora prima."],
];
const METEO = ["IL TEMPO", "Nebbia al mattino,", "vento da nord.", "Minima 4 gradi."];
const DENTRO = "Il consiglio comunale si è riunito ieri sera in canonica, a porte chiuse. Il sindaco ha letto la lettera della ditta e ha chiesto a tutti di collaborare con il medico. Qualcuno ha domandato chi paga le case chiuse con la croce, e quando riapre la scuola. Nessuna risposta. In fondo alla sala si parlava del recinto: le luci accese tutta la notte, i camion senza targa. ";

// i caratteri del giornale (Google Fonts, come nel gioco): la tela li usa solo se sono gia' arrivati
export async function caratteri() {
  if (!document.fonts) return;
  await Promise.all([`400 40px ${SERIF}`, `700 40px ${SERIF}`, `italic 400 40px ${SERIF}`, `400 40px ${TESTATA}`]
    .map((f) => document.fonts.load(f).catch(() => null)));
}

// un numero a caso, ma sempre lo stesso (la carta non cambia da un giorno all'altro)
function caso(seme) {
  let s = seme >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// le righe di un testo che stanno in "largo"
function righe(c, testo, largo) {
  const out = [];
  let r = "";
  for (const p of testo.split(/\s+/).filter(Boolean)) {
    const prova = r ? `${r} ${p}` : p;
    if (r && c.measureText(prova).width > largo) {
      out.push(r);
      r = p;
    } else r = prova;
  }
  if (r) out.push(r);
  return out;
}

// una riga giustificata (l'ultima di un paragrafo no)
function riga(c, testo, x, y, largo, giusta) {
  const parole = testo.split(" ");
  const spazi = parole.length - 1;
  const pieno = parole.reduce((s, p) => s + c.measureText(p).width, 0);
  if (!giusta || !spazi || largo - pieno > largo * 0.35) {
    c.fillText(testo, x, y);
    return;
  }
  const spazio = (largo - pieno) / spazi;
  let xx = x;
  for (const p of parole) {
    c.fillText(p, xx, y);
    xx += c.measureText(p).width + spazio;
  }
}

// la carta: il colore della carta di giornale, la grana, le fibre, i bordi piu' scuri e un alone di caffe'
function carta(c, W, H) {
  c.fillStyle = `rgb(${CARTA.join(",")})`;
  c.fillRect(0, 0, W, H);
  const im = c.getImageData(0, 0, W, H);
  const d = im.data;
  const r = caso(7);
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 14;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n * 0.9;
  }
  c.putImageData(im, 0, 0);
  const r2 = caso(11);
  c.lineWidth = 1.2;
  for (let i = 0; i < 900; i++) {
    const x = r2() * W, y = r2() * H, a = r2() * Math.PI, l = 6 + r2() * 22;
    c.strokeStyle = `rgba(90, 70, 40, ${0.05 + r2() * 0.08})`;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    c.stroke();
  }
  // i bordi ingialliti
  const g = c.createRadialGradient(W / 2, H * 0.4, W * 0.35, W / 2, H * 0.4, W * 0.78);
  g.addColorStop(0, "rgba(120, 90, 40, 0)");
  g.addColorStop(1, "rgba(120, 90, 40, 0.22)");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

function alone(c, x, y, r) {
  c.save();
  for (const [rr, w, a] of [[r, 10, 0.16], [r * 0.97, 4, 0.12], [r * 0.9, 22, 0.05]]) {
    c.strokeStyle = `rgba(110, 66, 28, ${a})`;
    c.lineWidth = w;
    c.beginPath();
    c.ellipse(x, y, rr, rr * 0.96, 0.3, 0.2, Math.PI * 2 - 0.5);
    c.stroke();
  }
  c.restore();
}

// un testo in colonna, paragrafo dopo paragrafo, da (x, y) finche' c'e' posto; restituisce dove e' arrivato
function colonna(c, paragrafi, x, y, largo, fondo, corpo) {
  const passo = corpo * 1.27;
  for (const [titolo, testo] of paragrafi) {
    if (y + passo > fondo) break;
    if (titolo) {
      c.font = `700 ${Math.round(corpo * 0.86)}px ${SERIF}`;
      c.fillText(titolo, x, y + corpo * 0.86);
      y += passo;
    }
    c.font = `400 ${corpo}px ${SERIF}`;
    const rr = righe(c, testo, largo);
    for (let i = 0; i < rr.length && y + passo <= fondo; i++) {
      riga(c, rr[i], x, y + corpo, largo, i < rr.length - 1);
      y += passo;
    }
    y += corpo * 0.55;
  }
  return y;
}

// la prima pagina del giornale "g" (testata, data, titolo, sommario, articolo, lettera, breve, pubblicita,
// didascalia) sulla tela; "foto": la foto del medico (un'immagine gia' caricata) o niente
export function primaPagina(tela, g, foto) {
  tela.width = tela.height = LATO;
  const c = tela.getContext("2d");
  const W = LATO, H = Math.round(LATO * PIEGA);
  carta(c, W, LATO);
  c.fillStyle = INCHIOSTRO;
  c.strokeStyle = INCHIOSTRO;
  c.textBaseline = "alphabetic";
  const m = 84;
  // la testata, e ai lati le due "orecchie": la pubblicita' della ditta e il tempo
  c.textAlign = "center";
  let fs = 330;
  c.font = `400 ${fs}px ${TESTATA}`;
  while (c.measureText(g.testata || "LA VOCE").width > (W - 2 * m) * 0.62 && fs > 120) c.font = `400 ${(fs -= 6)}px ${TESTATA}`;
  c.fillText(g.testata || "LA VOCE", W / 2, m + fs * 0.8);
  const orecchio = (W - 2 * m) * 0.17, oh = fs * 0.78;
  c.lineWidth = 4;
  c.strokeRect(m, m + 6, orecchio, oh);
  c.strokeRect(W - m - orecchio, m + 6, orecchio, oh);
  const [ditta, motto] = (g.pubblicita || "PANACEA · Ci prendiamo cura di voi.").split(" · ");
  const tx = m + orecchio / 2, ty = m + 6 + oh * 0.28;
  c.beginPath();
  c.moveTo(tx, ty - 34);
  c.lineTo(tx + 38, ty + 32);
  c.lineTo(tx - 38, ty + 32);
  c.closePath();
  c.lineWidth = 6;
  c.stroke();
  c.font = `700 38px ${SERIF}`;
  c.fillText(ditta, tx, ty + 78);
  c.font = `italic 400 23px ${SERIF}`;
  righe(c, motto || "", orecchio - 30).slice(0, 2).forEach((r, i) => c.fillText(r, tx, ty + 110 + i * 27));
  const mx = W - m - orecchio / 2;
  c.font = `700 30px ${SERIF}`;
  c.fillText(METEO[0], mx, m + 6 + oh * 0.3);
  c.font = `italic 400 27px ${SERIF}`;
  METEO.slice(1).forEach((r, i) => c.fillText(r, mx, m + 6 + oh * 0.3 + 46 + i * 34));
  let y = m + fs * 0.8 + 46;
  c.fillRect(m, y, W - 2 * m, 12);
  c.fillRect(m, y + 20, W - 2 * m, 4);
  // la data, tra due filetti
  y += 74;
  c.font = `400 34px ${SERIF}`;
  c.textAlign = "left";
  c.fillText("MALVENTO", m, y);
  c.textAlign = "right";
  c.fillText("ANNO XLII · N. 301", W - m, y);
  c.textAlign = "center";
  c.font = `400 36px ${SERIF}`;
  c.fillText((g.data || "").toUpperCase(), W / 2, y);
  c.fillRect(m, y + 22, W - 2 * m, 3);
  // il titolo, grande quanto ci sta
  const titolo = (g.titolo || "").toUpperCase();
  fs = 176;
  c.font = `700 ${fs}px ${SERIF}`;
  while (c.measureText(titolo).width > W - 2 * m && fs > 70) c.font = `700 ${(fs -= 4)}px ${SERIF}`;
  y += 22 + fs * 1.02;
  c.fillText(titolo, W / 2, y);
  // il sommario
  c.font = `italic 400 50px ${SERIF}`;
  const somm = righe(c, g.sommario || "", W - 2 * m - 160).slice(0, 2);
  y += 30;
  for (const r of somm) {
    y += 60;
    c.fillText(r, W / 2, y);
  }
  y += 36;
  c.fillRect(m, y, W - 2 * m, 3);
  // sotto: la foto con la didascalia a sinistra, due colonne a destra
  const top = y + 30;
  const fondo = H - 70;
  const fotoL = Math.round((W - 2 * m) * 0.44);
  const didH = 96;
  const fotoH = fondo - top - didH;
  c.save();
  if (foto && foto.naturalWidth) {
    // la foto in bianco e nero, un po' impastata come sulla carta di giornale
    const k = Math.max(fotoL / foto.naturalWidth, fotoH / foto.naturalHeight);
    const sw = fotoL / k, sh = fotoH / k;
    c.filter = "grayscale(1) contrast(1.25) brightness(0.92)";
    c.drawImage(foto, (foto.naturalWidth - sw) / 2, (foto.naturalHeight - sh) / 2, sw, sh, m, top, fotoL, fotoH);
    c.filter = "none";
    c.globalCompositeOperation = "multiply";
    c.fillStyle = `rgb(${CARTA.join(",")})`;
    c.fillRect(m, top, fotoL, fotoH);
  } else {
    c.fillStyle = "#6d675d";
    c.fillRect(m, top, fotoL, fotoH);
  }
  c.restore();
  c.lineWidth = 4;
  c.strokeRect(m, top, fotoL, fotoH);
  c.fillStyle = INCHIOSTRO;
  c.textAlign = "left";
  c.font = `italic 400 34px ${SERIF}`;
  righe(c, g.didascalia || "Il medico, ieri sera, nella via principale.", fotoL).slice(0, 2)
    .forEach((r, i) => c.fillText(r, m, top + fotoH + 44 + i * 40));
  const x1 = m + fotoL + 54;
  const largo = (W - m - x1 - 48) / 2;
  const x2 = x1 + largo + 48;
  c.fillRect(x1 + largo + 22, top, 3, fondo - top);
  // le colonne arrivano alla piega: il testo continua sotto, come sui giornali veri
  colonna(c, [["CRONACA", g.articolo || ""], ...RIEMPI1], x1, top, largo, H - 8, 32);
  colonna(c, [["LETTERE", g.lettera || ""], ["IN BREVE", g.breve || ""], ...RIEMPI2], x2, top, largo, H - 8, 32);
  alone(c, W - 520, 330, 150);
  // sotto la piega: le pagine di dentro, testo fitto e piccolo
  c.fillStyle = "rgba(0, 0, 0, 0.04)";
  c.fillRect(0, H, W, LATO - H);
  c.fillStyle = INCHIOSTRO;
  c.font = `400 26px ${SERIF}`;
  const dentro = righe(c, DENTRO.repeat(6), (W - 2 * m - 3 * 40) / 4);
  let k = 0;
  for (let col = 0; col < 4; col++) {
    for (let yy = H + 70; yy < LATO * BORDI[0] - 30; yy += 33) {
      riga(c, dentro[k++ % dentro.length], m + col * ((W - 2 * m - 120) / 4 + 40), yy, (W - 2 * m - 120) / 4, true);
    }
  }
  // in fondo i bordi dei fogli: righe chiare e scure, come i fogli uno sopra l'altro
  const b0 = Math.round(LATO * BORDI[0]);
  const r3 = caso(5);
  for (let yy = b0; yy < LATO; yy += 3) {
    const l = 0.72 + r3() * 0.28;
    c.fillStyle = `rgb(${CARTA.map((v) => Math.round(v * l)).join(",")})`;
    c.fillRect(0, yy, W, 3);
  }
}
