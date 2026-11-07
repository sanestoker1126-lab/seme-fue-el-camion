"""Tamaño de la cara (mancha de piel más grande) por cuadro, para igualar la escala con los cuadros del juego."""
import sys, json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
import cv2

def face_area(path):
    im = np.array(Image.open(path).convert('RGBA'))
    rgb, a = im[..., :3], im[..., 3] > 128
    hsv = cv2.cvtColor(np.ascontiguousarray(rgb), cv2.COLOR_RGB2HSV_FULL).astype(int)
    H, S, V = hsv[..., 0] * 360 // 256, hsv[..., 1], hsv[..., 2]
    R, B = rgb[..., 0].astype(int), rgb[..., 2].astype(int)
    skin = a & (((H <= 45) | (H >= 345)) & (S >= 35) & (S <= 190) & (V >= 125) & (R > B + 15))
    lab, n = ndi.label(skin)
    if not n: return 0, 0
    sizes = ndi.sum(skin, lab, np.arange(1, n + 1))
    i = int(np.argmax(sizes)) + 1
    ys, xs = np.nonzero(lab == i)
    # Solo la cara: el cuello y el escote (piel bajo la barbilla) inflarían la medida en los cuadros de frente.
    wdt = xs.max() - xs.min() + 1
    keep = ys <= ys.min() + 1.05 * wdt
    return int(keep.sum()), int(min(ys.max(), ys.min() + 1.05 * wdt) - ys.min() + 1)

if __name__ == '__main__':
    d = sys.argv[1]
    ref = face_area(sys.argv[2])
    print('referencia (juego)', sys.argv[2], 'área', ref[0], 'alto', ref[1])
    man = json.load(open(os.path.join(d, 'manifest.json')))
    secs = {}
    for m in man:
        secs.setdefault(m['section'], []).append(face_area(os.path.join(d, m['file']))[0])
    for s, v in secs.items():
        v2 = [x for x in v if x > 0]
        med = float(np.median(v2)) if v2 else 0
        print('%-16s caras %s  mediana %5.0f  escala≈%.3f' % (s, v, med, (ref[0] / med) ** 0.5 if med else 0))
