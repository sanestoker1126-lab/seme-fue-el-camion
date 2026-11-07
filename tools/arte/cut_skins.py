"""Cut platform skins from plataformas_referencia.png: crop, remove the flat dark background
by flood-fill from the crop border (colour-distance tolerance), defringe, and save RGBA PNGs.
Usage: python3 -I cut_skins.py <ref.png> <outdir> <preview.png>"""
import sys, os
from PIL import Image, ImageFilter
import numpy as np
from collections import deque

ref, outdir, preview = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(outdir, exist_ok=True)
src = np.array(Image.open(ref).convert('RGB')).astype(int)
BG = np.array([26, 25, 30])

# name: (x1, y1, x2, y2) in source pixels (inclusive-exclusive), generous margins
PIECES = {
    'stone_moss':   (12, 48, 165, 124),
    'stone_long':   (172, 38, 398, 98),
    'stone_small':  (172, 90, 285, 146),
    'stone_slim':   (294, 108, 398, 144),
    'concrete':     (12, 122, 165, 177),
    'tiles_a':      (174, 160, 338, 205),
    'brick':        (13, 191, 162, 240),
    'tiles_b':      (173, 216, 323, 264),
    'stone_rocks':  (12, 251, 165, 309),
    'scaffold':     (175, 271, 277, 322),
    'wood_table':   (12, 323, 127, 386),
    'hazard':       (138, 330, 232, 384),
}

def cut(name, box):
    x1, y1, x2, y2 = box
    c = src[y1:y2, x1:x2]
    h, w, _ = c.shape
    dist = np.sqrt(((c - BG) ** 2).sum(axis=2))
    bgish = dist < 22
    alpha = np.full((h, w), 255, np.uint8)
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bgish[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if bgish[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft(); alpha[y, x] = 0
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and bgish[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    # soften: pixels next to removed bg that are still close to bg colour get partial alpha
    near = (dist < 40) & (alpha > 0)
    pad = np.pad(alpha == 0, 1)
    nb = pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]
    alpha[near & nb] = 120
    # drop tiny islands (< 12 px) that are not connected to the main body
    lab = np.zeros((h, w), int); cur = 0; sizes = {}
    for y in range(h):
        for x in range(w):
            if alpha[y, x] > 0 and lab[y, x] == 0:
                cur += 1; q = deque([(y, x)]); lab[y, x] = cur; n = 0
                while q:
                    cy, cx = q.popleft(); n += 1
                    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and alpha[ny, nx] > 0 and lab[ny, nx] == 0:
                            lab[ny, nx] = cur; q.append((ny, nx))
                sizes[cur] = n
    main = max(sizes, key=sizes.get)
    ysM, xsM = np.nonzero(lab == main); mb = (xsM.min(), ysM.min(), xsM.max(), ysM.max())
    for k, n in sizes.items():
        if k == main: continue
        ys_, xs_ = np.nonzero(lab == k)
        gap = max(mb[0] - xs_.max(), xs_.min() - mb[2], mb[1] - ys_.max(), ys_.min() - mb[3], 0)
        if n < 12 or gap > 3: alpha[lab == k] = 0
    rgba = np.dstack([c.astype(np.uint8), alpha])
    im = Image.fromarray(rgba, 'RGBA')
    bb = im.getbbox()
    im = im.crop(bb)
    im.save(os.path.join(outdir, name + '.png'))
    return im

ims = {n: cut(n, b) for n, b in PIECES.items()}
import json
meta = {}
for n, im in ims.items():
    a = np.array(im)[:, :, 3] > 100
    cov = a.mean(axis=1)
    top = int(next(y for y in range(len(cov)) if cov[y] >= 0.55))
    meta[n] = {'w': im.width, 'h': im.height, 'top': top}
json.dump(meta, open(os.path.join(outdir, 'skins.json'), 'w'), indent=1)
print(meta)
# preview on two backgrounds
cols = 4; cell_w = 170 * 3; cell_h = 90 * 3
sheet = Image.new('RGBA', (cols * cell_w, ((len(ims) + cols - 1) // cols) * cell_h), (0, 0, 0, 255))
for k, (n, im) in enumerate(ims.items()):
    r, c = divmod(k, cols)
    bg = Image.new('RGBA', (cell_w, cell_h), (235, 170, 110, 255) if k % 2 else (70, 110, 160, 255))
    big = im.resize((im.width * 3, im.height * 3), Image.NEAREST)
    bg.alpha_composite(big, (6, 20))
    from PIL import ImageDraw
    ImageDraw.Draw(bg).text((4, 4), f'{n} {im.size}', fill=(0, 0, 0, 255))
    sheet.alpha_composite(bg, (c * cell_w, r * cell_h))
sheet.save(preview)
print({n: im.size for n, im in ims.items()})
