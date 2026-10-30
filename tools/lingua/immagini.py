#!/usr/bin/env python3
"""Le immagini con le scritte, nelle altre lingue (29 ottobre, sera: «basta parole italiane»).

Uso: python3 tools/lingua/immagini.py en

Scrive in tools/lingua/immagini_<lingua>/ le immagini del gioco che hanno parole dentro, coi percorsi del gioco:
- img/mappa.jpg e img/stanza/mappa.jpg: la mappa coi nomi delle vie e la legenda (tools/mappa.py componi <lingua>);
- img/stanza/calendario.jpg: il calendario della Panacea nella stanza del medico (lo slogan, il mese, i giorni);
- img/giornale.jpg: il giornale con la testata nella lingua (art/giornale/giornale_<lingua>.png, GPT Image 2 col
  ritocco della sola testata: art/giornale/lavori_<lingua>.json).
Non vanno tra i file del gioco (l'artifact ne tiene al massimo 511): `controlla.mjs scrivi` le mette nel catalogo della
lingua come data URL (IMMAGINI in lingua_<lingua>.js), e il gioco le usa al posto delle italiane (inLingua in lingua.js).
"""
import pathlib
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

RADICE = pathlib.Path(__file__).resolve().parent.parent.parent
SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-{}.ttf"
SANS = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
TESTI = {
    "en": {"slogan": "We take care of you", "mese": "OCTOBER", "giorni": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]},
}


def calendario(lingua, uscita):
    """il calendario della ditta (art/stanza3d/calendario.jpg, 768 x 1024) con le scritte nella lingua, poi come in
    tools/prepara_stanza.py: senza l'anno in fondo e largo 288"""
    t = TESTI[lingua]
    cal = Image.open(RADICE / "art/stanza3d/calendario.jpg").convert("RGB")
    d = ImageDraw.Draw(cal)
    # i colori presi dal calendario: il blu piu' scuro delle lettere del mese, il blu della fascia dei giorni, la carta
    def media(pixel):
        return tuple(round(sum(p[i] for p in pixel) / len(pixel)) for i in range(3))
    lettere = sorted(cal.crop((232, 632, 544, 677)).get_flattened_data(), key=sum)
    blu = media(lettere[: len(lettere) // 8])
    fascia = cal.getpixel((30, 691))
    carta = media(list(cal.crop((40, 632, 150, 677)).get_flattened_data()))
    # lo slogan, tra le due righe blu
    d.rectangle([224, 578, 544, 614], fill=carta)
    f = ImageFont.truetype(SERIF.format("Italic"), 34)
    d.text((384, 597), t["slogan"], font=f, fill=blu, anchor="mm")
    # il mese
    d.rectangle([150, 629, 618, 682], fill=carta)
    f = ImageFont.truetype(SERIF.format("Bold"), 58)
    d.text((384, 655), t["mese"], font=f, fill=blu, anchor="mm")
    # la fascia dei giorni, coi nomi piccoli e chiari
    d.rectangle([12, 683, 756, 700], fill=fascia)
    f = ImageFont.truetype(SANS, 11)
    for i, g in enumerate(t["giorni"]):
        d.text((64 + i * 106.3, 692), g, font=f, fill=(236, 236, 240), anchor="mm")
    cal = cal.crop((0, 0, cal.width, round(cal.height * 0.935)))
    cal = cal.resize((288, round(288 * cal.height / cal.width)), Image.LANCZOS)
    (uscita / "img/stanza").mkdir(parents=True, exist_ok=True)
    cal.save(uscita / "img/stanza/calendario.jpg", quality=86)


if __name__ == "__main__":
    lingua = sys.argv[1] if len(sys.argv) > 1 else "en"
    uscita = RADICE / f"tools/lingua/immagini_{lingua}"
    subprocess.run([sys.executable, str(RADICE / "tools/mappa.py"), "componi", lingua], check=True)
    calendario(lingua, uscita)
    # il giornale con la testata tradotta, come in tools/prepara_gioco.py
    testata = RADICE / f"art/giornale/giornale_{lingua}.png"
    if testata.exists():
        Image.open(testata).convert("RGB").save(uscita / "img/giornale.jpg", quality=86)
    for f in sorted(uscita.rglob("*.jpg")):
        print(f.relative_to(uscita), f.stat().st_size // 1024, "KB")
