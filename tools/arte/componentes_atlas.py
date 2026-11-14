"""Cajas de los objetos de un atlas RGBA por componentes conexas del alfa.
Uso: python3 -I componentes.py <png> <umbralAlfa> <areaMin> [salidaDebug.jpg]"""
import sys
import numpy as np
from PIL import Image, ImageDraw
im = Image.open(sys.argv[1]).convert('RGBA'); thr = int(sys.argv[2]); amin = int(sys.argv[3])
a = np.array(im)[:, :, 3]
mask = a > thr
H, W = mask.shape
lab = np.zeros((H, W), np.int32); n = 0; boxes = []
ys, xs = np.nonzero(mask)
seen = np.zeros((H, W), bool)
for y0, x0 in zip(ys, xs):
    if seen[y0, x0]: continue
    n += 1; st = [(y0, x0)]; seen[y0, x0] = True
    x1 = x2 = x0; y1 = y2 = y0; area = 0
    while st:
        y, x = st.pop(); area += 1
        if x < x1: x1 = x
        if x > x2: x2 = x
        if y < y1: y1 = y
        if y > y2: y2 = y
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < H and 0 <= xx < W and mask[yy, xx] and not seen[yy, xx]:
                seen[yy, xx] = True; st.append((yy, xx))
    if area >= amin: boxes.append((x1, y1, x2 + 1, y2 + 1, area))
boxes.sort(key=lambda b: (round(b[1] / 120), b[0]))
print('alfa min/max', a.min(), a.max(), '| objetos', len(boxes))
for i, b in enumerate(boxes): print(i, 'x', b[0], 'y', b[1], 'w', b[2] - b[0], 'h', b[3] - b[1], 'area', b[4])
if len(sys.argv) > 4:
    bg = Image.new('RGBA', im.size, (40, 44, 60, 255)); bg.alpha_composite(im); d = ImageDraw.Draw(bg)
    for i, b in enumerate(boxes):
        d.rectangle(b[:4], outline=(255, 255, 0, 255), width=2); d.text((b[0] + 4, b[1] + 2), str(i), fill=(255, 255, 0, 255))
    bg.convert('RGB').save(sys.argv[4], quality=88)
