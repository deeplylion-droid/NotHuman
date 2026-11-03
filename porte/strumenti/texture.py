#!/usr/bin/env python3
"""Le texture del bunker da Poly Haven (CC0: si possono usare nel gioco per Steam senza citarle), a 2K, nel progetto
Godot (porte/progetto/texture/<nome>/): il colore (diff), le normali per OpenGL (nor_gl, quelle che vuole Godot) e
l'immagine "arm" (occlusione, ruvidita', metallo nei tre canali: e' l'ORM dei materiali di Godot).

Uso: python3 porte/strumenti/texture.py [nomi...]
"""
import json
import pathlib
import sys
import urllib.request

RADICE = pathlib.Path(__file__).resolve().parent.parent
USCITA = RADICE / "progetto" / "texture"
# a cosa serve ognuna, nella stanza e nella porta
TEXTURE = {
    "concrete_layers_02": "i muri: cemento gettato a strati, come in un bunker",
    "dirty_concrete": "il pavimento: cemento macchiato",
    "concrete_wall_006": "il soffitto, piu' scuro",
    "rough_wood": "le assi della porta: legno vecchio e consumato",
    "wood_peeling_paint_weathered": "le traverse della porta: legno con la vernice che si stacca",
    "rusty_metal_02": "i cardini, la maniglia, lo stipite: ferro arrugginito",
    "green_metal_rust": "i tubi lungo il soffitto: ferro verniciato di verde, arrugginito",
}
MAPPE = {"Diffuse": "diff", "nor_gl": "nor", "arm": "arm"}
# Poly Haven rifiuta le richieste senza un nome del programma
INTESTAZIONI = {"User-Agent": "porte-prototipo/0.1"}


def apri(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=INTESTAZIONI), timeout=120)


def scarica(nome):
    with apri(f"https://api.polyhaven.com/files/{nome}") as r:
        file = json.load(r)
    cartella = USCITA / nome
    cartella.mkdir(parents=True, exist_ok=True)
    for chiave, corto in MAPPE.items():
        url = file[chiave]["2k"]["jpg"]["url"]
        dest = cartella / f"{corto}.jpg"
        if not dest.exists():
            with apri(url) as r:
                dest.write_bytes(r.read())
        print(nome, corto, dest.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    for n in (sys.argv[1:] or TEXTURE):
        scarica(n)
