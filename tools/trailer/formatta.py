#!/usr/bin/env python3
"""Riscrive tools/trailer/montaggio.json leggibile: una riga per taglio e per suono (json.dump con indent le spezza
in decine di righe). Uso: python3 tools/trailer/formatta.py"""
import json
import pathlib

P = pathlib.Path(__file__).parent / "montaggio.json"


def riga(x):
    return json.dumps(x, ensure_ascii=False)


M = json.loads(P.read_text())
parti = []
for k, v in M.items():
    if k in ("tagli", "suoni"):
        dentro = ",\n".join(f"    {riga(x)}" for x in v)
        parti.append(f'  "{k}": [\n{dentro}\n  ]')
    elif k == "cartelli":
        dentro = ",\n".join(f'    "{n}": {riga(t)}' for n, t in v.items())
        parti.append(f'  "{k}": {{\n{dentro}\n  }}')
    elif k in ("musica", "finale"):
        dentro = ",\n".join(f'    "{n}": {riga(t)}' for n, t in v.items())
        parti.append(f'  "{k}": {{\n{dentro}\n  }}')
    else:
        parti.append(f'  "{k}": {riga(v)}')
P.write_text("{\n" + ",\n".join(parti) + "\n}\n")
