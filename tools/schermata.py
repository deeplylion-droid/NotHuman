#!/usr/bin/env python3
"""Monta una schermata di gioco a strati e le applica il trattamento grafico.

Uso: python3 tools/schermata.py <scena.json>

La scena descrive: lo sfondo, i livelli da incollare sopra (personaggi, mano in
prima persona), il trattamento (palette, dimensione dei pixel, livelli di
colore, vignetta) e l'interfaccia (stato, dialogo con scelte, riquadro del
dettaglio esaminato). I percorsi sono relativi al file della scena.

Trattamento: riduzione a bassa risoluzione, leggera distorsione a barilotto,
viraggio su una palette a gradiente, riduzione dei colori con retinatura
ordinata, ingrandimento a pixel netti, vignetta arrotondata. L'interfaccia si
disegna dopo, a piena risoluzione.
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1920, 1080
BAYER4 = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def arr(im):
    return np.asarray(im).astype(np.float32) / 255.0


def img(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def trim(im):
    box = im.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    return im.crop(box) if box else im


def ink(im, forza):
    """Contorni piu' marcati e colori piu' netti: effetto ritaglio disegnato."""
    if forza <= 0:
        return im
    rgb = im.convert("RGB").filter(ImageFilter.UnsharpMask(radius=3, percent=int(120 * forza), threshold=2))
    out = rgb.convert("RGBA")
    out.putalpha(im.getchannel("A"))
    return out


def match(layer, bg_patch, forza):
    """Avvicina i colori del livello a quelli dello sfondo dove viene incollato."""
    a = arr(layer)
    alpha = a[..., 3:4]
    if alpha.sum() < 1 or forza <= 0:
        return layer
    mean_l = (a[..., :3] * alpha).sum((0, 1)) / alpha.sum()
    mean_b = arr(bg_patch.convert("RGB")).reshape(-1, 3).mean(0)
    gain = ((mean_b + 0.02) / (mean_l + 0.02)) ** (0.45 * forza)
    a[..., :3] = np.clip(a[..., :3] * gain, 0, 1)
    return img(a)


def place(canvas, spec, base):
    im = trim(Image.open(base / spec["file"]).convert("RGBA"))
    if "altezza" in spec:
        h = int(spec["altezza"] * H)
        w = int(im.width * h / im.height)
    else:
        w = int(spec["larghezza"] * W)
        h = int(im.height * w / im.width)
    im = im.resize((w, h), Image.LANCZOS)
    if spec.get("esposizione", 1.0) != 1.0:
        a = arr(im)
        a[..., :3] = np.clip(a[..., :3] * spec["esposizione"], 0, 1)
        im = img(a)
    if spec.get("specchia"):
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if spec.get("ancora") == "basso-destra":
        x = W - w + int(spec.get("dx", 0) * W)
        y = H - h + int(spec.get("dy", 0) * H)
    else:
        x = int(spec["x"] * W - w / 2)
        y = int(spec["y_piedi"] * H - h)
    bx0, by0 = max(0, x), max(0, y)
    patch = canvas.crop((bx0, by0, min(W, x + w), min(H, y + h)))
    im = match(im, patch, spec.get("adatta_colore", 0.6))
    im = ink(im, spec.get("inchiostro", 0.8))
    if spec.get("ombra"):
        sh = Image.new("L", (W, H), 0)
        d = ImageDraw.Draw(sh)
        cx, fy = x + w / 2, y + h
        d.ellipse([cx - w * 0.42, fy - h * 0.025, cx + w * 0.42, fy + h * 0.02], fill=150)
        sh = sh.filter(ImageFilter.GaussianBlur(14))
        dark = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        dark.putalpha(sh)
        canvas.alpha_composite(dark)
    if spec.get("contorno", True):
        # alone scuro di un paio di pixel intorno alla sagoma, come un adesivo
        halo = im.getchannel("A").filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.5))
        edge = Image.new("RGBA", im.size, (8, 8, 8, 0))
        edge.putalpha(halo.point(lambda v: int(v * 0.85)))
        canvas.alpha_composite(edge, (x, y)) if x >= 0 and y >= 0 else canvas.paste(edge, (x, y), edge)
    canvas.paste(im, (x, y), im)


def treat(im, t, size=(W, H)):
    """Il trattamento grafico comune a tutte le schermate."""
    p = t.get("pixel", 3)
    sw, sh = size[0] // p, size[1] // p
    a = arr(im.convert("RGB").resize((sw, sh), Image.BOX))
    # distorsione a barilotto leggera
    k = t.get("barilotto", 0.06)
    if k:
        yy, xx = np.mgrid[0:sh, 0:sw].astype(np.float32)
        u, v = (xx - sw / 2) / (sw / 2), (yy - sh / 2) / (sw / 2)
        f = 1 - k + k * (u * u + v * v)
        sx = np.clip(sw / 2 + u * f * sw / 2, 0, sw - 1.001)
        sy = np.clip(sh / 2 + v * f * sw / 2, 0, sh - 1.001)
        x0, y0 = sx.astype(int), sy.astype(int)
        fx, fy = (sx - x0)[..., None], (sy - y0)[..., None]
        a = (a[y0, x0] * (1 - fx) * (1 - fy) + a[y0, x0 + 1] * fx * (1 - fy)
             + a[y0 + 1, x0] * (1 - fx) * fy + a[y0 + 1, x0 + 1] * fx * fy)
    # contrasto e luminosita'
    a = np.clip((a - 0.5) * t.get("contrasto", 1.15) + 0.5 + t.get("luce", 0.0), 0, 1) ** t.get("gamma", 1.0)
    # viraggio sulla palette a gradiente, mescolato ai colori originali
    stops = np.array(t["palette"], np.float32) / 255.0
    lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    pos = lum * (len(stops) - 1)
    i0 = np.clip(pos.astype(int), 0, len(stops) - 2)
    fr = (pos - i0)[..., None]
    mapped = stops[i0] * (1 - fr) + stops[i0 + 1] * fr
    keep = t.get("colore_originale", 0.3)
    a = mapped * (1 - keep) + a * keep
    # grana
    rng = np.random.default_rng(t.get("seme", 1))
    a = a + rng.normal(0, t.get("grana", 0.025), (sh, sw, 1))
    # riduzione dei colori con retinatura ordinata
    n = t.get("livelli_colore", 6) - 1
    thr = np.tile(BAYER4, (sh // 4 + 1, sw // 4 + 1))[:sh, :sw, None]
    a = np.floor(np.clip(a, 0, 1) * n + thr) / n
    out = img(a).resize(size, Image.NEAREST)
    # vignetta arrotondata
    vig = t.get("vignetta", 0.9)
    if vig:
        yy, xx = np.mgrid[0:size[1], 0:size[0]].astype(np.float32)
        d = (np.abs((xx - size[0] / 2) / (size[0] / 2)) ** 3.2 + np.abs((yy - size[1] / 2) / (size[1] / 2)) ** 3.2) ** (1 / 3.2)
        m = 1 - vig * smoothstep(0.62, 1.05, d)
        out = img(arr(out) * m[..., None])
    return out


def wrap(draw, text, font, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if draw.textlength(test, font=font) <= width:
            cur = test
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def ui(im, u, t, base, font_path):
    col = tuple(u.get("colore", [236, 226, 200]))
    acc = tuple(u.get("accento", [214, 74, 52]))
    panel = tuple(u.get("pannello", [10, 9, 7, 214]))
    fb, fm, fs = u.get("dimensioni", [50, 42, 34])
    big = ImageFont.truetype(font_path, fb)
    mid = ImageFont.truetype(font_path, fm)
    small = ImageFont.truetype(font_path, fs)
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # stato in alto a sinistra
    if u.get("stato"):
        x = 56
        for part in u["stato"]:
            tw = d.textlength(part, font=small)
            d.rectangle([x - 12, 34, x + tw + 12, 82], fill=panel)
            d.text((x, 38), part, font=small, fill=col)
            x += tw + 40
    # dettaglio esaminato, in alto a destra
    if u.get("dettaglio"):
        det = u["dettaglio"]
        x0, y0, dw, dh = det.get("box", [W - 720 - 96, 112, 720, 480])
        ins = Image.open(base / det["file"]).convert("RGB")
        if det.get("ritaglio"):
            fx0, fy0, fx1, fy1 = det["ritaglio"]
            ins = ins.crop((int(fx0 * ins.width), int(fy0 * ins.height), int(fx1 * ins.width), int(fy1 * ins.height)))
        r = max(dw / ins.width, dh / ins.height)
        ins = ins.resize((int(ins.width * r) + 1, int(ins.height * r) + 1), Image.LANCZOS)
        ins = ins.crop(((ins.width - dw) // 2, (ins.height - dh) // 2, (ins.width - dw) // 2 + dw, (ins.height - dh) // 2 + dh))
        tt = dict(t, **det.get("trattamento", {}), vignetta=0.5, barilotto=0.0)
        ins = treat(ins, tt, (dw, dh))
        d.rectangle([x0 - 10, y0 - 10, x0 + dw + 10, y0 + dh + fs + 22], fill=col + (255,))
        layer.paste(ins, (x0, y0))
        d.text((x0 + 4, y0 + dh + 6), det["etichetta"], font=small, fill=(20, 18, 14))
    # dialogo
    if u.get("dialogo"):
        dl = u["dialogo"]
        bx0, bx1, by1 = dl.get("box", [260 / W, 1 - 260 / W, 1 - 70 / H])
        x0, x1, y1 = int(bx0 * W), int(bx1 * W), int(by1 * H)
        lines = wrap(d, dl["testo"], big, x1 - x0 - 80)
        h = fs + 36 + len(lines) * (fb + 4) + 24 + len(dl.get("scelte", [])) * (fm + 8) + 30
        y0 = y1 - h
        d.rectangle([x0, y0, x1, y1], fill=panel)
        d.rectangle([x0 + 8, y0 + 8, x1 - 8, y1 - 8], outline=col + (110,), width=2)
        d.text((x0 + 40, y0 + 22), dl["chi"].upper(), font=small, fill=acc)
        y = y0 + fs + 30
        for ln in lines:
            d.text((x0 + 40, y), ln, font=big, fill=col)
            y += fb + 4
        y += 24
        for i, s in enumerate(dl.get("scelte", []), 1):
            d.text((x0 + 40, y), f"{i}  {s}", font=mid, fill=col if i > 1 else acc)
            y += fm + 8
    if u.get("comandi"):
        tw = d.textlength(u["comandi"], font=small)
        d.text((W - tw - 56, H - 56), u["comandi"], font=small, fill=col + (170,))
    out = im.convert("RGBA")
    out.alpha_composite(layer)
    return out.convert("RGB")


def main():
    scene_path = pathlib.Path(sys.argv[1])
    sc = json.loads(scene_path.read_text())
    base = scene_path.parent
    canvas = Image.open(base / sc["sfondo"]).convert("RGBA").resize((W, H), Image.LANCZOS)
    for spec in sc.get("livelli", []):
        if not spec.get("sopra_buio"):
            place(canvas, spec, base)
    if sc.get("buio"):
        # notte: tutto si spegne tranne il cono di luce (torcia, lampada)
        b = sc["buio"]
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        d = np.hypot((xx - b["x"] * W) / (b["raggio"] * W), (yy - b["y"] * H) / (b["raggio"] * W * b.get("schiaccia", 1.0)))
        light = 1 - b["quanto"] * smoothstep(0.35, 1.0, d)
        c = arr(canvas)
        c[..., :3] *= light[..., None]
        canvas = img(c)
    for spec in sc.get("livelli", []):
        if spec.get("sopra_buio"):   # es. la mano del giocatore, che non deve sparire nel buio
            place(canvas, spec, base)
    shot = treat(canvas, sc["trattamento"])
    if sc.get("ui"):
        shot = ui(shot, sc["ui"], sc["trattamento"], base, str(base / sc["font"]))
    out = base / sc["uscita"]
    shot.save(out, quality=92)
    print(out)


if __name__ == "__main__":
    main()
