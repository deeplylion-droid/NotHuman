#!/usr/bin/env python3
"""Riallinea un'immagine ridisegnata (per esempio la versione a fumetto) all'originale.

Uso: python3 tools/allinea.py <originale> <ridisegnata> <uscita>

Il ridisegno con l'AI a volte sposta un po' case e oggetti, e mescolando le due versioni (il 20%, il 40%)
compaiono contorni doppi. Qui prima si cerca lo spostamento d'insieme (affine, con ECC), poi quello punto per
punto (flusso ottico DIS), e la ridisegnata viene deformata finche' non combacia con l'originale.
Serve OpenCV (pip install opencv-python-headless).
"""
import sys

import cv2
import numpy as np


def prep(im):
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    g = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(16, 16)).apply(g)
    return cv2.GaussianBlur(g, (0, 0), 2.0)


def main():
    orig_path, moving_path, out = sys.argv[1:4]
    orig = cv2.imread(orig_path)
    h, w = orig.shape[:2]
    moving = cv2.resize(cv2.imread(moving_path), (w, h), interpolation=cv2.INTER_AREA)
    a, b = prep(orig), prep(moving)
    warp = np.eye(2, 3, dtype=np.float32)
    try:
        _, warp = cv2.findTransformECC(a, b, warp, cv2.MOTION_AFFINE,
                                       (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), None, 5)
    except cv2.error:
        pass  # se non converge si passa direttamente al flusso ottico
    moving = cv2.warpAffine(moving, warp, (w, h), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP,
                            borderMode=cv2.BORDER_REPLICATE)
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    dis.setFinestScale(1)
    flow = cv2.GaussianBlur(dis.calc(a, prep(moving), None), (0, 0), w / 320)
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    aligned = cv2.remap(moving, gx + flow[..., 0], gy + flow[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    cv2.imwrite(out, aligned, [cv2.IMWRITE_JPEG_QUALITY, 93])
    print(out, f"spostamento medio {np.abs(flow).mean():.1f} px")


if __name__ == "__main__":
    main()
