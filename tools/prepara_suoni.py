#!/usr/bin/env python3
"""Prepara i suoni del gioco (gioco/js/suoni.js) da quelli generati in art/suoni.

Uso: python3 tools/prepara_suoni.py

I suoni si generano con ElevenLabs Sound Effects v2 su fal (fal-ai/elevenlabs/sound-effects/v2, circa 2 decimi di
centesimo al secondo): i lavori sono in art/suoni/lavori.json, si lanciano con
"python3 tools/fal_batch.py art/suoni/lavori.json art/suoni" e arrivano in mp3. Qui:
- gli ambienti (quelli con "loop") diventano anelli senza stacco: l'ultimo secondo sfuma dentro il primo;
- i colpi perdono il silenzio all'inizio e alla fine (cosi' partono subito), i passi si fermano dopo mezzo secondo;
- tutto e' mono, alla stessa intensita' percepita (gli ambienti a -24 LUFS, i colpi a -20, senza superare il picco di
  -1 dB; i volumi li sceglie il gioco), in mp3 da 64 kbps (gli ambienti) o 96 kbps (i colpi) in gioco/suoni.
Le parole "quiet" e "barely audible" nei prompt fanno suoni quasi muti: meglio chiedere il suono ben udibile.

La musica (29 ottobre, sera) si genera con ElevenLabs Music su fal (fal-ai/elevenlabs/music, 0,60 dollari al minuto):
i lavori sono in art/musica/lavori.json ("python3 tools/fal_batch.py art/musica/lavori.json art/musica"); qui i
brani scelti (MUSICA) vanno in gioco/suoni/musica col nome che usa il gioco, stereo, alla stessa intensita' percepita
(-18 LUFS), in mp3 da 96 kbps. Solo la musica: python3 tools/prepara_suoni.py musica
"""
import json
import pathlib
import re
import subprocess
import sys

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIR = ROOT / "art/suoni"
OUT = ROOT / "gioco/suoni"
SR = 44100
# quanto dura al massimo un colpo, in secondi dall'inizio
TAGLIA = {"passo1": 0.5, "passo2": 0.5, "passo3": 0.5}
# la musica: il nome nel gioco -> il brano scelto in art/musica (le proposte del 29 ottobre: giorno a e b, sera a e b,
# visita a e b; nel gioco per primi il pianoforte, le campane e il ticchettio)
MUSICA = {"stanza_giorno": "stanza_giorno_a", "stanza_sera": "stanza_sera_b", "visita": "visita_a"}


def leggi(f):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(f), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def scrivi(x, f, kbps):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                    "-c:a", "libmp3lame", "-b:a", f"{kbps}k", str(f)], input=x.astype(np.float32).tobytes(), check=True)


def db(v):
    return 20 * np.log10(max(v, 1e-9))


def lufs(x):
    """L'intensita' percepita (EBU R128, integrata), misurata da ffmpeg; None se il suono e' troppo corto."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                        "-af", "ebur128", "-f", "null", "-"], input=x.astype(np.float32).tobytes(), capture_output=True)
    righe = [r for r in r.stderr.decode().splitlines() if r.strip().startswith("I:")]
    v = float(righe[-1].split()[1]) if righe else -70.0
    return None if v <= -69 else v


def livella(x, bersaglio):
    """Alla stessa intensita' percepita, senza superare -1 dB di picco (i colpi troppo corti per misurarla: al picco)."""
    picco = db(np.abs(x).max())
    misura = lufs(x)
    guadagno = (bersaglio - misura) if misura is not None else (-2 - picco)
    return x * 10 ** (min(guadagno, -1 - picco) / 20)


def anello(x, sfuma=1.0):
    """L'ultimo pezzo sfuma (a potenza costante) dentro il primo: la fine si attacca all'inizio senza stacco."""
    n = int(sfuma * SR)
    t = np.linspace(0, np.pi / 2, n)
    y = x[:-n].copy()
    y[:n] = x[:n] * np.sin(t) + x[-n:] * np.cos(t)
    return y


def colpo(x, nome):
    """Senza silenzio all'inizio e alla fine, con un attacco e una coda brevissimi per non fare clic."""
    soglia = np.abs(x).max() * 10 ** (-45 / 20)
    sopra = np.nonzero(np.abs(x) > soglia)[0]
    a, b = max(0, sopra[0] - int(0.005 * SR)), min(len(x), sopra[-1] + int(0.05 * SR))
    if nome in TAGLIA:
        b = min(b, a + int(TAGLIA[nome] * SR))
    y = x[a:b].copy()
    na, nb = int(0.004 * SR), min(int(0.06 * SR), len(y) // 3)
    y[:na] *= np.linspace(0, 1, na)
    y[-nb:] *= np.linspace(1, 0, nb)
    return y


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for j in json.loads((DIR / "lavori.json").read_text()):
        nome, f = j["nome"], DIR / f"{j['nome']}.mp3"
        if not f.exists():
            print(f"manca   {f.name}")
            continue
        x = leggi(f)
        if j["input"].get("loop"):
            y, kbps = livella(anello(x), -24), 64
        else:
            y, kbps = livella(colpo(x, nome), -20), 96
        y = np.clip(y, -1, 1)
        scrivi(y, OUT / f"{nome}.mp3", kbps)
        misura = lufs(y)
        print(f"{nome:18s} {len(x) / SR:5.2f} s -> {len(y) / SR:5.2f} s, "
              f"{'%.1f LUFS' % misura if misura is not None else 'corto':>10s}, picco {db(np.abs(y).max()):5.1f} dB, "
              f"{(OUT / f'{nome}.mp3').stat().st_size // 1024} KB")


def musica():
    out = OUT / "musica"
    out.mkdir(parents=True, exist_ok=True)
    for nome, fonte in MUSICA.items():
        f = ROOT / "art/musica" / f"{fonte}.mp3"
        # l'intensita' di adesso, per portarla a -18 LUFS con un guadagno fisso (i brani escono tutti piu' forti: si
        # abbassano soltanto, quindi niente picchi)
        r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(f), "-af", "ebur128", "-f", "null", "-"],
                           capture_output=True, text=True)
        prima = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)[-1])
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(f), "-af", f"volume={-18 - prima:.2f}dB", "-ac", "2",
                        "-ar", str(SR), "-c:a", "libmp3lame", "-b:a", "96k", str(out / f"{nome}.mp3")], check=True)
        print(f"{nome:14s} <- {fonte:16s} {prima:6.1f} LUFS -> -18, {(out / f'{nome}.mp3').stat().st_size // 1024} KB")


if __name__ == "__main__":
    if sys.argv[1:] == ["musica"]:
        musica()
    else:
        main()
        musica()
