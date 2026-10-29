#!/usr/bin/env python3
"""Le immagini della pagina Steam di Malvento, nelle misure di Steamworks (docs/steam.md).

Uso: python3 tools/steam.py

Parte dal logo scelto (art/logo/logo_a_trasparente.png: il logo A, «il becco», con lo sfondo tolto da BiRefNet) e dalle
due illustrazioni senza scritte (art/steam/illustrazione_larga.png, quella ingrandita da ESRGAN per l'hero, e
illustrazione_alta.png). Scrive in art/steam/uscita: le capsule (header, small, main, vertical), quelle della libreria
(capsule, header, hero, logo), lo sfondo della pagina e le icone (anche quella del programma per Windows, che
eseguibile/ usa per Malvento.exe) e il logo del titolo del gioco (gioco/img/logo.webp).
"""
import pathlib

from PIL import Image, ImageEnhance, ImageFilter

QUI = pathlib.Path(__file__).resolve().parent.parent
LOGO = QUI / "art/logo/logo_a_trasparente.png"
LARGA = QUI / "art/steam/illustrazione_larga.png"
LARGA_X2 = QUI / "art/steam/illustrazione_larga_x2.png"
ALTA = QUI / "art/steam/illustrazione_alta.png"
ICONA = QUI / "art/steam/icona.png"
USCITA = QUI / "art/steam/uscita"
# il verde malato del gioco, per l'alone dietro le lettere (come nel logo prima di togliere lo sfondo)
ALONE = (150, 170, 110)


def logo_ritagliato():
    im = Image.open(LOGO).convert("RGBA")
    return im.crop(im.getchannel("A").getbbox())


def con_alone(logo, forza=0.55, raggio=None, ombra=0.75):
    """Il logo con un'ombra scura (per staccarlo dall'illustrazione) e un alone verde malato tenue."""
    raggio = raggio or max(4, logo.width // 90)
    m = logo.width // 12
    tela = Image.new("RGBA", (logo.width + 2 * m, logo.height + 2 * m), (0, 0, 0, 0))
    a = Image.new("L", tela.size, 0)
    a.paste(logo.getchannel("A"), (m, m))
    scuro = Image.new("RGBA", tela.size, (0, 0, 0, 255))
    scuro.putalpha(a.filter(ImageFilter.GaussianBlur(raggio * 1.6)).point(lambda v: int(v * ombra)))
    verde = Image.new("RGBA", tela.size, ALONE + (255,))
    verde.putalpha(a.filter(ImageFilter.GaussianBlur(raggio * 4)).point(lambda v: int(v * forza)))
    tela = Image.alpha_composite(tela, verde)
    tela = Image.alpha_composite(tela, scuro)
    tela.alpha_composite(logo, (m, m))
    return tela


def taglia(im, w, h, cx=0.5, cy=0.5):
    """Ritaglia im alla proporzione w:h attorno a (cx, cy) e lo porta a w x h."""
    r = w / h
    if im.width / im.height > r:
        cw, ch = int(im.height * r), im.height
    else:
        cw, ch = im.width, int(im.width / r)
    x = min(max(0, int(im.width * cx - cw / 2)), im.width - cw)
    y = min(max(0, int(im.height * cy - ch / 2)), im.height - ch)
    return im.crop((x, y, x + cw, y + ch)).resize((w, h), Image.LANCZOS)


def scurisci_zona(im, cx, cy, rx, ry, quanto=0.55):
    """Una macchia scura morbida dove va il logo, perche' si legga sopra l'illustrazione."""
    m = Image.new("L", im.size, 0)
    piccola = Image.new("L", (200, 200), 0)
    for i in range(100, 0, -1):
        v = int(255 * quanto * (1 - (i / 100) ** 2))
        piccola.paste(v, (100 - i, 100 - i, 100 + i, 100 + i))
    piccola = piccola.filter(ImageFilter.GaussianBlur(18))
    w, h = int(im.width * rx * 2), int(im.height * ry * 2)
    m.paste(piccola.resize((w, h)), (int(im.width * cx - w / 2), int(im.height * cy - h / 2)))
    nero = Image.new("RGB", im.size, (0, 0, 0))
    return Image.composite(nero, im.convert("RGB"), m)


def metti_logo(im, logo, larghezza, cx, cy):
    lg = con_alone(logo)
    s = larghezza / logo.width
    lg = lg.resize((int(lg.width * s), int(lg.height * s)), Image.LANCZOS)
    out = im.convert("RGBA")
    out.alpha_composite(lg, (int(im.width * cx - lg.width / 2), int(im.height * cy - lg.height / 2)))
    return out.convert("RGB")


def main():
    USCITA.mkdir(parents=True, exist_ok=True)
    logo = logo_ritagliato()
    larga = Image.open(LARGA).convert("RGB")
    alta = Image.open(ALTA).convert("RGB")

    # le capsule larghe: il medico a destra, il logo sulla via a sinistra
    for nome, (w, h), larg in [("header_capsule", (920, 430), 0.56), ("library_header", (920, 430), 0.56),
                               ("main_capsule", (1232, 706), 0.52)]:
        im = taglia(larga, w, h, cx=0.5, cy=0.42)
        im = scurisci_zona(im, 0.31, 0.47, 0.34, 0.36)
        metti_logo(im, logo, w * larg, 0.32, 0.47).save(USCITA / f"{nome}_{w}x{h}.png")

    # la piccola: quasi solo il logo, sull'illustrazione scura
    w, h = 462, 174
    fondo = ImageEnhance.Brightness(taglia(larga, w, h, cx=0.55, cy=0.4)).enhance(0.45)
    metti_logo(fondo, logo, w * 0.9, 0.5, 0.52).save(USCITA / f"small_capsule_{w}x{h}.png")

    # le verticali: il logo in alto, nel cielo
    for nome, (w, h) in [("vertical_capsule", (748, 896)), ("library_capsule", (600, 900))]:
        im = taglia(alta, w, h, cx=0.5, cy=0.55)
        im = scurisci_zona(im, 0.5, 0.17, 0.55, 0.16, 0.45)
        metti_logo(im, logo, w * 0.86, 0.5, 0.17).save(USCITA / f"{nome}_{w}x{h}.png")

    # l'hero della libreria: solo l'illustrazione (Steam ci mette sopra il logo)
    hero = Image.open(LARGA_X2).convert("RGB") if LARGA_X2.exists() else larga
    taglia(hero, 3840, 1240, cx=0.5, cy=0.36).save(USCITA / "library_hero_3840x1240.png")

    # il logo della libreria: trasparente, 1280 di larghezza
    lg = con_alone(logo, forza=0.35, ombra=0.6)
    s = min(1280 / lg.width, 720 / lg.height)
    lg.resize((int(lg.width * s), int(lg.height * s)), Image.LANCZOS).save(USCITA / "library_logo_1280.png")

    # lo sfondo della pagina: tenue e scuro
    sf = taglia(larga, 1438, 810, cx=0.5, cy=0.45).filter(ImageFilter.GaussianBlur(3))
    sf = ImageEnhance.Color(ImageEnhance.Brightness(sf).enhance(0.38)).enhance(0.7)
    sf.save(USCITA / "page_background_1438x810.png")

    # le icone: la maschera del logo, da sola (art/steam/icona.png, GPT Image 2 col logo e la scheda come riferimento),
    # un po' piu' stretta attorno alla maschera
    icona = Image.open(ICONA).convert("RGBA").crop((62, 30, 962, 930))
    for s in (184, 256, 512):
        icona.resize((s, s), Image.LANCZOS).save(USCITA / f"icona_{s}.png")
    icona.resize((256, 256), Image.LANCZOS).save(QUI / "eseguibile/icona.ico",
                                                  sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    # il logo per il titolo del gioco (gioco/img/logo.webp), con l'alone, largo 1200
    lg = con_alone(logo, forza=0.5, ombra=0.8)
    s = 1200 / lg.width
    lg.resize((1200, int(lg.height * s)), Image.LANCZOS).save(QUI / "gioco/img/logo.webp", quality=88, method=6)
    print("gioco/img/logo.webp:", (QUI / "gioco/img/logo.webp").stat().st_size // 1024, "KB")
    for f in sorted(USCITA.iterdir()):
        with Image.open(f) as im:
            print(f"{f.name}: {im.size[0]}x{im.size[1]} {im.mode}")


if __name__ == "__main__":
    main()
