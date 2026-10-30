#!/usr/bin/env python3
"""Il gioco servito in locale per le prove, le foto e il trailer, come lo serve il visualizzatore degli Artifact: la
pagina in utf-8. Con `python3 -m http.server` la pagina arriva senza la codifica e il "▸" dei suggerimenti diventava
"â–¸" (anche negli screenshot per Steam del 29 ottobre, rifatti il 30).

Uso: python3 tools/prove/servi.py [porta]      (di partenza 8765; serve la cartella gioco/)
"""
import functools
import http.server
import pathlib
import sys

GIOCO = pathlib.Path(__file__).resolve().parents[2] / "gioco"


class Gestore(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".mjs": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8",
    }

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    server = http.server.ThreadingHTTPServer(("127.0.0.1", porta), functools.partial(Gestore, directory=str(GIOCO)))
    print(f"http://127.0.0.1:{porta}/ ({GIOCO})", flush=True)
    server.serve_forever()
