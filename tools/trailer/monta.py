#!/usr/bin/env python3
"""Il montaggio del trailer per Steam (30 ottobre: «ora facciamo il trailer per steam»).

Uso: python3 tools/trailer/monta.py [lingua] [--anteprima]

Dal montaggio (tools/trailer/montaggio.json) mette in fila le riprese del gioco (tools/trailer/riprese.js), i cartelli
(tools/trailer/cartelli.js) e il finale col logo; sotto, la musica del trailer (art/steam/trailer/musica, ElevenLabs
Music con le sezioni sulle durate del montaggio) con i suoni del gioco nei punti giusti. Esce
art/steam/trailer/malvento_trailer_<lingua>.mp4 come lo chiede Steam: 1920 x 1080, 30 fotogrammi al secondo, H.264
ad alto bitrate, audio AAC stereo a 48 kHz, a -16 LUFS. Con --anteprima: 960 x 540, veloce, per controllare i tagli.
Anche la miniatura (un fotogramma del video, 1920 x 1080: Steam la vuole così) e il foglio dei tagli per controllo.

Ogni taglio del montaggio comincia a "da" (secondi) e finisce dove comincia il successivo:
- {"ripresa": nome, "dal": secondi dentro la ripresa, "velocita": 1, "zoom": [1, 1.04], "centro": [0.5, 0.5]}
  (lo zoom va dal primo valore al secondo; "centro" può essere anche [[x0, y0], [x1, y1]]; "morbido": partenza e
  arrivo dolci)
- {"cartello": nome} (la frase è in "cartelli", nella lingua), {"finale": true}, {"nero": true}
- "entra" / "esce": secondi di dissolvenza dal nero e verso il nero.
"""
import json
import pathlib
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

RADICE = pathlib.Path(__file__).resolve().parent.parent.parent
TRAILER = RADICE / "art/steam/trailer"
SR = 48000


def carica_audio(percorso, filtro=None):
    """un file audio come float32 stereo a 48 kHz (con un filtro di ffmpeg, se c'è)"""
    cmd = ["ffmpeg", "-v", "error", "-i", str(percorso)]
    if filtro:
        cmd += ["-af", filtro]
    cmd += ["-ac", "2", "-ar", str(SR), "-f", "f32le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def inviluppo(punti, n):
    """una curva a tratti dritti, [[secondi, valore], ...], campione per campione"""
    t = np.arange(n) / SR
    xs = [p[0] for p in punti]
    ys = [p[1] for p in punti]
    return np.interp(t, xs, ys).astype(np.float32)


def audio(M, durata, uscita):
    n = int(durata * SR)
    mix = np.zeros((n, 2), np.float32)
    musica = carica_audio(RADICE / M["musica"]["file"])[:n]
    musica *= inviluppo(M["musica"]["volume"], len(musica))[:, None]
    mix[: len(musica)] += musica * (10 ** (M["musica"].get("db", 0) / 20))
    for s in M["suoni"]:
        filtro = []
        if s.get("dal"):
            filtro.append(f"atrim=start={s['dal']}")
            filtro.append("asetpts=PTS-STARTPTS")
        if s.get("durata"):
            filtro.append(f"atrim=duration={s['durata']}")
            filtro.append(f"afade=t=out:st={max(0, s['durata'] - s.get('sfuma', 0.4))}:d={s.get('sfuma', 0.4)}")
        # come nel gioco (gioco/js/suoni.js): i colpi più gravi e smorzati, come sentiti attraverso la maschera
        if s.get("grave", True):
            filtro.append(f"asetrate={round(44100 * 0.93)},aresample={SR}")
        filtro.append(f"lowpass=f={s.get('cupo', 2400)}")
        x = carica_audio(RADICE / "gioco/suoni" / f"{s['suono']}.mp3", ",".join(filtro))
        x *= 10 ** (s.get("db", 0) / 20)
        a = int(s["t"] * SR)
        b = min(n, a + len(x))
        if b > a:
            mix[a:b] += x[: b - a]
    grezzo = uscita.with_suffix(".grezzo.wav")
    scrivi_wav(grezzo, mix)
    # il volume come lo vogliono le piattaforme: -16 LUFS, il picco vero sotto -1,5 dB (loudnorm in due passate)
    misura = subprocess.run(["ffmpeg", "-v", "info", "-i", str(grezzo), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                            capture_output=True, text=True).stderr
    m = json.loads(misura[misura.rindex("{"): misura.rindex("}") + 1])
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(grezzo), "-af",
                    f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
                    f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true", "-ar", str(SR), str(uscita)], check=True)
    grezzo.unlink()
    print(f"audio: {m['input_i']} LUFS -> -16, picco {m['input_tp']} dB")


def scrivi_wav(percorso, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-", str(percorso)], input=pcm.tobytes(), check=True)


class Fotogrammi:
    """i fotogrammi di una ripresa o di un cartello, con una piccola memoria"""

    def __init__(self, cartella):
        self.cartella = cartella
        self.file = sorted(cartella.glob("*.jpg"))
        if not self.file:
            raise FileNotFoundError(f"nessun fotogramma in {cartella}")
        self.memoria = {}

    def __call__(self, i):
        i = max(0, min(len(self.file) - 1, i))
        if i not in self.memoria:
            if len(self.memoria) > 8:
                self.memoria.clear()
            self.memoria[i] = Image.open(self.file[i]).convert("RGB")
        return self.memoria[i]


def fotogramma(taglio, sorgente, j, fps, w, h):
    """il fotogramma j del taglio (j da 0): la ripresa al punto giusto, con lo zoom lento se c'è"""
    v = taglio.get("velocita", 1)
    pos = taglio.get("dal", 0) * fps + j * v
    a = int(np.floor(pos))
    im = sorgente(a)
    if v != 1 and pos - a > 0.01:
        im = Image.blend(im, sorgente(a + 1), pos - a)
    if taglio.get("cursore_via"):
        im = senza_cursore(im)
    z0, z1 = taglio.get("zoom", [1, 1])
    if z0 != 1 or z1 != 1:
        n = max(1, taglio["_n"] - 1)
        t = j / n
        if taglio.get("morbido", False):
            t = t * t * (3 - 2 * t)
        z = z0 + (z1 - z0) * t
        # il centro dello zoom: un punto fermo, o due ([[x0, y0], [x1, y1]]) tra cui scivolare
        c = taglio.get("centro", [0.5, 0.5])
        if isinstance(c[0], list):
            c = [c[0][0] + (c[1][0] - c[0][0]) * t, c[0][1] + (c[1][1] - c[0][1]) * t]
        cx, cy = c
        W, H = im.size
        cw, ch = W / z, H / z
        x0 = min(max(0, cx * W - cw / 2), W - cw)
        y0 = min(max(0, cy * H - ch / 2), H - ch)
        return im.resize((w, h), Image.BICUBIC, box=(x0, y0, x0 + cw, y0 + ch))
    return im if im.size == (w, h) else im.resize((w, h), Image.BICUBIC)


def senza_cursore(im):
    """il cerchio del cursore del gioco, rimasto nell'angolo in alto a sinistra dove sta prima che il puntatore si muova
    (in alcune riprese il puntatore non è passato sullo schermo): coperto col pezzo di quadro appena sotto, senza
    toccare i soldi lì accanto"""
    im = im.copy()
    W = im.width / 1920
    # lo schermo del gioco comincia a (24, 22): l'anello va da lì a (49, 46); il bordo nero intorno resta com'è
    x0, y0, x1, y1 = (round(v * W) for v in (24, 22, 51, 48))
    sotto = im.crop((x0, y1, x1, y1 + (y1 - y0)))
    im.paste(sotto, (x0, y0))
    return im


def foglio_tagli(M, lingua, uscita):
    """un foglio con un fotogramma per taglio (a metà), per controllare il montaggio senza guardare il video"""
    tagli = M["tagli"]
    voci = [t for t in tagli[:-1]]
    cols = 6
    tw, th = 320, 180
    righe = (len(voci) + cols - 1) // cols
    foglio = Image.new("RGB", (cols * tw, righe * (th + 22)), "black")
    d = ImageDraw.Draw(foglio)
    f = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", 14)
    for k, t in enumerate(voci):
        durata = tagli[k + 1]["da"] - t["da"]
        t["_n"] = round(durata * M["fps"])
        sorg = sorgente_di(t, lingua)
        im = fotogramma(t, sorg, t["_n"] // 2, M["fps"], tw, th) if sorg else Image.new("RGB", (tw, th))
        x, y = (k % cols) * tw, (k // cols) * (th + 22)
        foglio.paste(im, (x, y + 22))
        nome = t.get("ripresa") or t.get("cartello") or ("finale" if t.get("finale") else "nero")
        d.text((x + 4, y + 3), f"{t['da']:.2f}  {nome}  {durata:.2f}s", font=f, fill=(242, 209, 107))
    foglio.save(uscita, quality=85)


def sorgente_di(t, lingua):
    cartella = None
    if t.get("ripresa"):
        cartella = TRAILER / "riprese" / lingua / t["ripresa"]
    elif t.get("cartello"):
        cartella = TRAILER / "cartelli" / lingua / t["cartello"]
    elif t.get("finale"):
        cartella = TRAILER / "cartelli" / lingua / "finale"
    if cartella is None:
        return None
    if not any(cartella.glob("*.jpg")):
        # (nell'anteprima, una ripresa che manca ancora è un riquadro grigio col suo nome)
        print(f"manca {cartella}")
        return Mancante(cartella.name)
    return Fotogrammi(cartella)


class Mancante:
    def __init__(self, nome):
        self.im = Image.new("RGB", (1920, 1080), (40, 40, 40))
        ImageDraw.Draw(self.im).text((80, 80), f"manca: {nome}", fill=(242, 209, 107),
                                     font=ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", 64))

    def __call__(self, i):
        return self.im


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    lingua = args[0] if args else "en"
    anteprima = "--anteprima" in sys.argv
    M = json.loads((pathlib.Path(__file__).parent / "montaggio.json").read_text())
    fps = M["fps"]
    tagli = M["tagli"]
    durata = tagli[-1]["da"]
    w, h = (960, 540) if anteprima else (1920, 1080)
    nome = f"malvento_trailer_{lingua}{'_anteprima' if anteprima else ''}"
    video = TRAILER / f"{nome}.mp4"
    suono = TRAILER / f"{nome}.wav"
    audio(M, durata, suono)
    foglio_tagli(M, lingua, TRAILER / f"tagli_{lingua}.jpg")

    codifica = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23"] if anteprima else \
        ["-c:v", "libx264", "-preset", "slow", "-crf", "15", "-maxrate", "30M", "-bufsize", "60M", "-profile:v", "high", "-level", "4.2"]
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-r", str(fps), "-i", "-",
                           "-i", str(suono), *codifica, "-pix_fmt", "yuv420p", "-g", str(fps), "-movflags", "+faststart",
                           "-c:a", "aac", "-b:a", "320k", "-ar", str(SR), "-shortest", str(video)], stdin=subprocess.PIPE)
    totale = round(durata * fps)
    miniatura = M.get("miniatura")
    for k, t in enumerate(tagli[:-1]):
        a, b = round(t["da"] * fps), round(tagli[k + 1]["da"] * fps)
        t["_n"] = b - a
        sorg = sorgente_di(t, lingua)
        for j in range(b - a):
            im = fotogramma(t, sorg, j, fps, w, h) if sorg else Image.new("RGB", (w, h))
            # le dissolvenze dal nero e verso il nero
            luce = 1.0
            if t.get("entra"):
                luce = min(luce, (j + 1) / (t["entra"] * fps))
            if t.get("esce"):
                luce = min(luce, (b - a - j) / (t["esce"] * fps))
            if luce < 1:
                im = Image.fromarray((np.asarray(im, np.float32) * max(0.0, luce)).astype(np.uint8))
            if miniatura and a + j == round(miniatura * fps) and not anteprima:
                im.save(TRAILER / f"miniatura_{lingua}.jpg", quality=92)
            ff.stdin.write(im.tobytes())
        print(f"{k:2d} {t['da']:6.2f} {t.get('ripresa') or t.get('cartello') or ('finale' if t.get('finale') else 'nero')}", flush=True)
    ff.stdin.close()
    ff.wait()
    suono.unlink()
    info = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration,bit_rate,size", "-of", "json", str(video)], capture_output=True, text=True).stdout
    print(video, totale, "fotogrammi", info)


if __name__ == "__main__":
    main()
