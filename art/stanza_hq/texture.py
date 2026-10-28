"""Le texture della stanza del medico ad alta qualita' che non vengono gia' pronte da Poly Haven (27 ottobre, sera:
"non rendere la stanza cosi' moscia come era quella di prima. Dalle piu' carattere, piu' contrasto, meno cupa").

Poi, la stessa sera: "troppo italiana anni 80 con quel pavimento e quella carta da parati oscena. Puoi renderla piu'
americana?". La tavolozza di una vecchia casa americana: il pavimento di assi di quercia scure (Poly Haven, com'e'),
sotto la boiserie a doghe dipinta di bianco sporco, sopra la carta da parati a righe verde salvia e crema, sbiadita,
porte e finestre bianche, la coperta di lana rossa. Si parte dalle texture di Poly Haven (tools/stanza_hq.py le
scarica in sorgenti/) e si ricolorano tenendo le loro venature, la grana e i segni; la carta da parati si disegna qui,
ripetibile senza giunte.

Uso: python3 art/stanza_hq/texture.py   (scrive in art/stanza_hq/texture/)
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

QUI = Path(__file__).resolve().parent
SORG = QUI / "sorgenti" / "materiali"
OUT = QUI / "texture"
LUMA = np.array([0.2126, 0.7152, 0.0722], np.float32)


def carica(nome, mappa, lato=2048):
    f = next((SORG / nome).glob(f"{nome}_{mappa}_2k.jpg"))
    return np.asarray(Image.open(f).convert("RGB").resize((lato, lato), Image.LANCZOS), np.float32) / 255


def salva(arr, nome, q=92):
    OUT.mkdir(exist_ok=True)
    Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8)).save(OUT / nome, quality=q)


def lin(c):
    return np.asarray(c, np.float32) / 255


def tingi(img, colore, dettaglio=1.0):
    """porta l'immagine verso un colore tenendo le variazioni di luminosita' (venature, macchie, segni)"""
    l = img @ LUMA
    rel = l / max(float(l.mean()), 1e-4)
    rel = 1 + (rel - 1) * dettaglio
    return lin(colore)[None, None, :] * rel[..., None]


def boiserie():
    """la boiserie a doghe sotto il listello (le doghe bianche di Poly Haven, larghe 1,8 metri nella texture): bianco
    sporco caldo, e un po' piu' scura in basso, dove la sfregano le scarpe e la scopa (la texture parte dal pavimento)"""
    d = carica("white_planks_clean", "diff")
    out = tingi(d, (232, 226, 210), 1.0)
    lato = d.shape[0]
    # l'altezza di ogni riga: la prima riga dell'immagine e' in cima (1,8 m), l'ultima sul pavimento
    h = (1.0 - (np.arange(lato, dtype=np.float32) + 0.5) / lato) * 1.8
    sporco = np.clip(1 - h / 0.4, 0, 1) ** 2 * 0.14
    rumore = np.asarray(Image.fromarray((np.random.default_rng(3).random((lato // 16, lato // 16)) * 255).astype(np.uint8))
                        .resize((lato, lato), Image.BICUBIC), np.float32) / 255
    out = out * (1 - sporco[:, None, None] * (0.6 + 0.8 * rumore[..., None]))
    salva(out, "boiserie_diff.jpg")
    r = carica("white_planks_clean", "rough")
    salva(np.clip(0.34 + (r - r.mean()) * 0.5, 0.2, 0.7), "boiserie_rough.jpg")


def smalto():
    """porte, telai, battiscopa e finestre: legno smaltato bianco sporco, con un po' di venatura che traspare"""
    d = carica("wood_table_worn", "diff")
    salva(tingi(d, (234, 229, 216), 0.2), "smalto_diff.jpg")
    r = carica("wood_table_worn", "rough")
    salva(np.clip(0.28 + (r - r.mean()) * 0.3, 0.15, 0.6), "smalto_rough.jpg")


def soffitto():
    """il soffitto: l'intonaco dipinto di Poly Haven, bianco (all'americana), coi suoi segni appena"""
    d = carica("painted_plaster_wall", "diff")
    salva(tingi(d, (238, 235, 227), 0.45), "soffitto_diff.jpg")


def coperta():
    """la coperta di lana: rossa"""
    d = carica("poly_wool_herringbone", "diff")
    salva(tingi(d, (138, 30, 28), 1.2), "coperta_diff.jpg")


def carta_parati(lato=1024, scala=4):
    """carta da parati a righe da vecchia casa americana: una riga larga verde salvia coi bordi piu' scuri, e nel crema
    due filetti verdi e una fila di rametti piccoli, sbiadita e ingiallita. Un riquadro e' largo 53 cm (un rotolo) con
    4 righe da 13,25 cm; si disegna grande e si rimpicciolisce per i bordi lisci. La grana, gli aloni e le macchie
    vengono dalla carta vecchia di Poly Haven (decrepit_wallpaper), piano"""
    L = lato * scala
    crema, salvia, scuro = (224, 214, 188), (128, 146, 118), (92, 112, 88)
    img = Image.new("RGB", (L, L), crema)
    dr = ImageDraw.Draw(img)
    passo = L / 4
    cm = passo / 13.25

    def riga(x0, x1, c):
        dr.rectangle([x0, 0, x1, L], fill=c)

    for k in range(5):
        x = k * passo
        # la riga larga (4,4 cm) col bordino scuro, al centro del motivo
        c0, c1 = x + 4.4 * cm, x + 8.8 * cm
        riga(c0, c1, salvia)
        riga(c0, c0 + 0.25 * cm, scuro)
        riga(c1 - 0.25 * cm, c1, scuro)
        # i due filetti nel crema
        for f in (1.6, 11.6):
            riga(x + f * cm, x + (f + 0.18) * cm, scuro)
        # i rametti: tre foglioline a punta su uno stelo, ogni 6,6 cm, sfalsati
        fx = x + 0.0 * cm
        for j in range(-1, 9):
            fy = (j + 0.5 * (k % 2)) * L / 8
            for cx, cy in [(fx, fy)]:
                dr.line([cx, cy - 1.0 * cm, cx, cy + 1.0 * cm], fill=scuro, width=max(1, int(0.12 * cm)))
                for dx, dy in [(-0.5, -0.3), (0.5, -0.3), (0, -1.1)]:
                    dr.ellipse([cx + dx * cm - 0.32 * cm, cy + dy * cm - 0.5 * cm, cx + dx * cm + 0.32 * cm,
                                cy + dy * cm + 0.5 * cm], fill=salvia)
    img = img.resize((lato, lato), Image.LANCZOS)
    a = np.asarray(img, np.float32) / 255
    # la carta vecchia: grana, aloni e macchie, piano; e un po' ingiallita
    vecchia = carica("decrepit_wallpaper", "diff", lato)
    v = (vecchia @ LUMA) / float((vecchia @ LUMA).mean())
    a = a * np.clip(0.82 + 0.18 * v, 0.6, 1.1)[..., None]
    a = a * 0.95 + np.array([0.035, 0.025, 0.0], np.float32)
    salva(a, "carta_parati_diff.jpg")
    # il rilievo: la grana della carta vecchia piu' un filo di spessore dell'inchiostro
    n = carica("decrepit_wallpaper", "nor_gl", lato) * 2 - 1
    n[..., :2] *= 0.6
    l = a @ LUMA
    gx = np.roll(l, -1, 1) - np.roll(l, 1, 1)
    gy = np.roll(l, -1, 0) - np.roll(l, 1, 0)
    n[..., 0] += -gx * 1.2
    n[..., 1] += gy * 1.2
    n = n / np.linalg.norm(n, axis=-1, keepdims=True)
    salva(n * 0.5 + 0.5, "carta_parati_nor.jpg")


if __name__ == "__main__":
    boiserie()
    smalto()
    soffitto()
    coperta()
    carta_parati()
    print("texture fatte in", OUT)
