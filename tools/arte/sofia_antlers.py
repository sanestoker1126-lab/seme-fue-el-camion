"""Step 1: extract antlers from pose_idle_hand; detect headband in target frames; preview placements."""
import sys, os, json, math
from PIL import Image, ImageDraw
import numpy as np
SRC = sys.argv[1]; OUT = sys.argv[2]
def load(n): return Image.open(os.path.join(SRC, n + '.png')).convert('RGBA')
def hsv(arr):
    rgb = arr[:, :, :3].astype(float) / 255
    mx = rgb.max(2); mn = rgb.min(2); d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    h = np.zeros_like(mx); m = d > 1e-6
    for cond, val in (((mx == r), ((g - b) / np.maximum(d, 1e-6)) % 6), ((mx == g), (b - r) / np.maximum(d, 1e-6) + 2), ((mx == b), (r - g) / np.maximum(d, 1e-6) + 4)):
        sel = m & cond & (h == 0); h[sel] = val[sel]
    return h * 60, s, mx
# --- antler sprite from the idle pose
idle = np.array(load('pose_idle_hand'))
H, S, V = hsv(idle)
a = idle[:, :, 3]
ant = np.zeros_like(idle)
for y in range(0, 42):
    for x in range(84, 130):
        if a[y, x] < 10: continue
        antler_col = 14 <= H[y, x] <= 45 and S[y, x] > 0.35 and V[y, x] > 0.42
        if y < 37 or (antler_col and y <= 41):
            ant[y, x] = idle[y, x]
ys, xs = np.nonzero(ant[:, :, 3] > 0)
x1, y1, x2, y2 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
antler = Image.fromarray(ant[y1:y2, x1:x2], 'RGBA')
pivot = (106 - x1, 39 - y1)   # headband top-centre in the idle pose
antler.save(os.path.join(OUT, 'antlers.png'))
print('antler', antler.size, 'pivot', pivot)

def headband(n):
    arr = np.array(load(n)); a = arr[:, :, 3]
    r, g, b = [arr[:, :, i].astype(int) for i in range(3)]
    ys, xs = np.nonzero(a > 24); top, bot = ys.min(), ys.max()
    m = (a > 120) & (r > 170) & (g < 110) & (b < 140) & (r - g > 85)
    m[int(top + (bot - top) * 0.42):, :] = False
    yy, xx = np.nonzero(m)
    # keep the cluster nearest the top (the band), drop skirt bits
    order = np.argsort(yy); yy, xx = yy[order], xx[order]
    keep = yy <= yy.min() + 22
    yy, xx = yy[keep], xx[keep]
    # upper edge of the band per column
    cols = {}
    for x, y in zip(xx, yy): cols[x] = min(cols.get(x, 999), y)
    cx = sorted(cols); pts = [(x, cols[x]) for x in cx]
    left, right = pts[0], pts[-1]
    topmost = min(pts, key=lambda p: p[1])
    ang = math.degrees(math.atan2(right[1] - left[1], right[0] - left[0]))
    return dict(left=left, right=right, top=topmost, angle=round(ang, 1), n=len(xx))
info = {n: headband(n) for n in ['pose_idle_hand', 'fall_fall_airborne', 'fall_fall_forward', 'land_crouch_landing', 'kick_01', 'kick_02', 'kick_03', 'kick_04', 'fall_damage_01', 'fall_damage_02']}
for n, v in info.items(): print(n, v)
json.dump({'pivot': pivot, 'size': antler.size, 'headbands': {k: {kk: (list(map(int, vv)) if isinstance(vv, tuple) else vv) for kk, vv in v.items()} for k, v in info.items()}}, open(os.path.join(OUT, 'antler_probe.json'), 'w'), indent=1, default=int)
