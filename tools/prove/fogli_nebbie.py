# i fogli di confronto delle proposte lovecraftiane (art/stanza_hq/nebbie), dalle foto di prova_nebbie.js: per ogni
# nebbia le viste fatte, mattina e sera; e la stessa vista per tutte, con la stanza
# com'era accanto. Uso: python3 fogli_nebbie.py <cartella delle foto> <cartella di uscita> [nebbie]
import os, sys
from PIL import Image, ImageDraw, ImageFont
IN, OUT = sys.argv[1], sys.argv[2]
nebbie = [int(x) for x in (sys.argv[3] if len(sys.argv) > 3 else "1,2,3,4").split(",")]
NOMI = {0: "La stanza com'era", 1: "1 · Nebbia viola", 2: "2 · L'abisso", 3: "3 · Il colore venuto dallo spazio", 4: "4 · R'lyeh"}
os.makedirs(OUT, exist_ok=True)
try:
    F = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
except OSError:
    F = ImageFont.load_default()
W, H = 640, 360
def foto(n, f, v):
    p = os.path.join(IN, f"n{n}_{f}_{v}.png")
    return Image.open(p).convert("RGB").resize((W, H), Image.LANCZOS) if os.path.exists(p) else Image.new("RGB", (W, H), (30, 30, 30))
for n in nebbie:
    viste = [v for v in ["finestra", "stanza", "letto"] if os.path.exists(os.path.join(IN, f"n{n}_mattina_{v}.png"))]
    foglio = Image.new("RGB", (W * len(viste), H * 2 + 40), (12, 13, 12))
    d = ImageDraw.Draw(foglio)
    d.text((12, 8), f"{NOMI[n]}  —  sopra la mattina, sotto la sera", fill=(242, 209, 107), font=F)
    for i, v in enumerate(viste):
        foglio.paste(foto(n, "mattina", v), (i * W, 40))
        foglio.paste(foto(n, "sera", v), (i * W, 40 + H))
    foglio.save(os.path.join(OUT, f"nebbia{n}.jpg"), quality=86)
# il confronto: la stessa vista per tutte
for f, v in [("mattina", "finestra"), ("sera", "stanza")]:
    tutte = [0] + nebbie
    foglio = Image.new("RGB", (W * len(tutte), H + 40), (12, 13, 12))
    d = ImageDraw.Draw(foglio)
    for i, n in enumerate(tutte):
        foglio.paste(foto(n, f, v), (i * W, 40))
        d.text((i * W + 10, 8), NOMI[n], fill=(242, 209, 107), font=F)
    foglio.save(os.path.join(OUT, f"confronto_{f}_{v}.jpg"), quality=86)
print("ok")
