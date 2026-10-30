#!/usr/bin/env python3
"""I nomi propri della versione inglese (29 ottobre, sera: «basta parole italiane. I nomi dei membri delle famiglie me
li fai inglesi, così come il nome del giornale etc»; resta italiano solo il nome del gioco, Malvento).

Uso: python3 tools/lingua/nomi_en.py   cambia i nomi nelle traduzioni (tools/lingua/parti/*_en.json)

I nomi si scelgono vicini a quelli italiani (Rossi -> Ross, Bianchi -> White, Ferri -> Ferris); nei registri l'ordine
resta COGNOME NOME. Le stesse scelte sono nel glossario di GUIDA.md.
"""
import json
import pathlib
import re

QUI = pathlib.Path(__file__).resolve().parent
# l'ordine conta: prima le frasi lunghe (le vie col numero, «De Rosa» prima di «Rosa»)
NOMI = [
    # le vie, i paesi, il giornale, il cane, il detto
    (r"Via della Chiesa (\d+)", r"\1 Church Street"),
    (r"Via della Chiesa", "Church Street"),
    (r"via dei Mulini", "Mill Street"),
    (r"Strada del Cimitero", "Cemetery Road"),
    (r"Vicolo Stretto", "Narrow Lane"),
    (r"La Voce", "The Voice"), (r"LA VOCE", "THE VOICE"), (r"\bla Voce\b", "The Voice"), (r"\bVoce\b", "Voice"),
    (r"Valcupa", "Darkvale"), (r"VALCUPA", "DARKVALE"),
    (r"Pietrascura", "Blackstone"), (r"PIETRASCURA", "BLACKSTONE"),
    (r"\bLupo\b", "Wolf"),
    (r"\bThe malvento\b", "The ill wind"), (r"\bthe malvento\b", "the ill wind"), (r"\bmalvento\b", "ill wind"),
    (r"\bThe Madonna\b", "The Virgin"),
    # le famiglie
    (r"\bDe Rosa\b", "Rowe"), (r"\bDE ROSA\b", "ROWE"),
    (r"\bRossi\b", "Ross"), (r"\bROSSI\b", "ROSS"),
    (r"\bMario\b", "Mark"), (r"\bMARIO\b", "MARK"),
    (r"\bBianchi\b", "White"), (r"\bBIANCHI\b", "WHITE"),
    (r"\bGiulia\b", "Julia"), (r"\bGIULIA\b", "JULIA"),
    (r"\bPietro\b", "Peter"), (r"\bPIETRO\b", "PETER"),
    (r"\bLuigi\b", "Lewis"), (r"\bLUIGI\b", "LEWIS"),
    (r"\bFerri\b", "Ferris"), (r"\bFERRI\b", "FERRIS"),
    (r"\bMarta\b", "Martha"), (r"\bMARTA\b", "MARTHA"),
    (r"\bDavide\b", "David"), (r"\bDAVIDE\b", "DAVID"),
    (r"\bCosta\b", "Cole"), (r"\bCOSTA\b", "COLE"),
    (r"\bErnesto\b", "Ernest"), (r"\bERNESTO\b", "ERNEST"),
    (r"\bGallis'", "Gales'"), (r"\bGallis\b", "Gales"), (r"\bGalli\b", "Gale"), (r"\bGALLI\b", "GALE"),
    (r"\bLucia\b", "Lucy"), (r"\bLUCIA\b", "LUCY"),
    (r"\bMarini\b", "Marsh"), (r"\bMARINI\b", "MARSH"),
    (r"\bPaolo\b", "Paul"), (r"\bPAOLO\b", "PAUL"),
    (r"\bSerra\b", "Searle"), (r"\bSERRA\b", "SEARLE"),
    (r"\bChiara\b", "Claire"), (r"\bCHIARA\b", "CLAIRE"),
    (r"\bLorenzi\b", "Lawrence"), (r"\bLORENZI\b", "LAWRENCE"),
    (r"\bFontana\b", "Fenton"), (r"\bFONTANA\b", "FENTON"),
    (r"\bRosa\b", "Rose"), (r"\bROSA\b", "ROSE"),
    (r"\bAnselmo\b", "Anselm"), (r"\bANSELMO\b", "ANSELM"),
    (r"\bBarbieri\b", "Barber"), (r"\bBARBIERI\b", "BARBER"),
    (r"\bColombo\b", "Coleman"), (r"\bCOLOMBO\b", "COLEMAN"),
    (r"\bAssunta\b", "Agnes"), (r"\bASSUNTA\b", "AGNES"),
    (r"\bGiona\b", "Jonah"), (r"\bGIONA\b", "JONAH"),
    (r"\bLia\b", "Leah"), (r"\bLIA\b", "LEAH"),
    # gli indirizzi all'inglese (il numero prima) e, a voce, il nome prima del cognome
    (r"\b(Church Street|Narrow Lane|Mill Street|Cemetery Road) (\d+)\b", r"\2 \1"),
    (r"\bRoss Peter\b", "Peter Ross"), (r"\bSearle Paul\b", "Paul Searle"),
]


def cambia(testo):
    for da, a in NOMI:
        testo = re.sub(da, a, testo)
    return testo


if __name__ == "__main__":
    for f in sorted((QUI / "parti").glob("*_en.json")):
        d = json.loads(f.read_text())
        nuovo = {k: cambia(v) for k, v in d.items()}
        n = sum(nuovo[k] != d[k] for k in d)
        if n:
            f.write_text(json.dumps(nuovo, ensure_ascii=False, indent=1) + "\n")
        print(f"{f.name}: {n} testi cambiati")
