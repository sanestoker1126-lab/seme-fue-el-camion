"""Build the cleaned, consistent Sofía frame set (V50).
- kick_01: teal skirt/headband recoloured to the red of the other frames (hue swap + value remap).
- antlers (cut from pose_idle_hand) added to frames that lacked them, so the reindeer headband never pops.
- tiny detached specks removed (islands far from the body).
- per-frame metadata: head-scale k (relative to pose_idle_hand), anchor x (torso centre) and y (feet).
Usage: sofia_build.py <srcdir> <antlers.png> <params.json> <outdir>"""
import sys, os, json, math
from PIL import Image
import numpy as np
from collections import deque
SRC, ANT, PARAMS, OUT = sys.argv[1:5]
os.makedirs(OUT, exist_ok=True)
params = json.load(open(PARAMS))
ant = Image.open(ANT).convert('RGBA'); PVX, PVY = 20, 23

def rgb2hsv(rgb):
    mx = rgb.max(2); mn = rgb.min(2); d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.zeros_like(mx); m = d > 1e-6
    hr = ((g - b) / np.maximum(d, 1e-6)) % 6; hg = (b - r) / np.maximum(d, 1e-6) + 2; hb = (r - g) / np.maximum(d, 1e-6) + 4
    h = np.where(m & (mx == r), hr, np.where(m & (mx == g), hg, np.where(m, hb, 0)))
    return (h * 60) % 360, s, mx
def hsv2rgb(h, s, v):
    h = (h % 360) / 60; i = np.floor(h).astype(int) % 6; f = h - np.floor(h)
    p = v * (1 - s); q = v * (1 - s * f); t = v * (1 - s * (1 - f))
    r = np.choose(i, [v, q, p, p, t, v]); g = np.choose(i, [t, v, v, q, p, p]); b = np.choose(i, [p, p, t, v, v, q])
    return np.stack([r, g, b], -1)

def recolor_teal(im):
    arr = np.array(im).astype(float) / 255
    h, s, v = rgb2hsv(arr[..., :3])
    m = (arr[..., 3] > 0) & (h >= 140) & (h <= 205) & (s > 0.18)
    v2 = np.interp(v, [0.0, 0.12, 0.22, 0.34, 0.57, 1.0], [0.0, 0.10, 0.26, 0.74, 0.97, 1.0])
    s2 = np.clip(s * 0.95, 0, 1)
    rgb2 = hsv2rgb(np.full_like(h, 356.0), s2, v2)
    out = arr.copy(); out[..., :3] = np.where(m[..., None], rgb2, arr[..., :3])
    return Image.fromarray((out * 255 + 0.5).astype(np.uint8), 'RGBA'), int(m.sum())

def add_antlers(im, px, py, ang, sc):
    a = ant.resize((max(1, round(ant.width * sc)), max(1, round(ant.height * sc))), Image.LANCZOS)
    W = int(max(a.width, a.height) * 3); canvas = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    canvas.alpha_composite(a, (int(W / 2 - PVX * sc), int(W / 2 - PVY * sc)))
    rot = canvas.rotate(-ang, resample=Image.BICUBIC, center=(W / 2, W / 2))
    big = Image.new('RGBA', (im.width + W * 2, im.height + W * 2), (0, 0, 0, 0))
    big.alpha_composite(rot, (int(round(px - W / 2 + W)), int(round(py - W / 2 + W))))
    out = im.copy(); out.alpha_composite(big.crop((W, W, W + im.width, W + im.height)))
    return out

def clean_islands(im, min_keep=60, near=6):
    arr = np.array(im); a = arr[..., 3]; h, w = a.shape
    lab = np.zeros((h, w), int); sizes = {}; boxes = {}; cur = 0
    for y in range(h):
        for x in range(w):
            if a[y, x] > 16 and lab[y, x] == 0:
                cur += 1; q = deque([(y, x)]); lab[y, x] = cur; n = 0; bx = [x, y, x, y]
                while q:
                    cy, cx = q.popleft(); n += 1
                    bx[0] = min(bx[0], cx); bx[1] = min(bx[1], cy); bx[2] = max(bx[2], cx); bx[3] = max(bx[3], cy)
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and a[ny, nx] > 16 and lab[ny, nx] == 0:
                                lab[ny, nx] = cur; q.append((ny, nx))
                sizes[cur] = n; boxes[cur] = bx
    if not sizes: return im, 0
    main = max(sizes, key=sizes.get); mb = boxes[main]; removed = 0
    for k, n in sizes.items():
        if k == main or n >= min_keep: continue
        b = boxes[k]
        inside = b[0] >= mb[0] - near and b[2] <= mb[2] + near and b[1] >= mb[1] - near and b[3] <= mb[3] + near
        # keep small pieces that sit right next to the body (hair strands, antler tips); drop far specks
        dist = max(mb[0] - b[2], b[0] - mb[2], mb[1] - b[3], b[1] - mb[3], 0)
        if dist > near or (n < 6 and not inside):
            arr[lab == k] = 0; removed += n
    # also clear faint dust (alpha < 16) to avoid smudges
    arr[a <= 16] = 0
    return Image.fromarray(arr, 'RGBA'), removed

def anchors(im):
    a = np.array(im)[..., 3]; ys, xs = np.nonzero(a > 60)
    y1, y2 = ys.min(), ys.max(); bh = y2 - y1
    band = (ys >= y1 + bh * 0.38) & (ys <= y1 + bh * 0.70)
    ax = float(xs[band].mean()) if band.any() else float(xs.mean())
    # feet: lowest row with >= 3 opaque pixels
    rows = (a > 60).sum(1); feet = int(max(y for y in range(len(rows)) if rows[y] >= 3))
    return round(ax, 1), feet + 1, [int(xs.min()), int(y1), int(xs.max()) + 1, int(y2) + 1]

FRAMES = {
    # name: (k, add_antlers?, recolor?)
    'pose_idle_hand': (1.00, False, False), 'pose_victory_hand': (1.00, False, False),
    'pose_victory_fist': (1.00, False, False), 'pose_victory_hands': (1.00, False, False),
    'fall_damage_01': (1.05, False, False), 'fall_damage_02': (1.05, False, False),
    'fall_damage_03': (1.05, False, False), 'fall_damage_04': (1.05, False, False),
    'fall_fall_airborne': (0.95, True, False), 'fall_fall_forward': (1.00, True, False),
    'land_crouch_landing': (1.45, True, False),
    'kick_01': (1.03, True, True), 'kick_02': (1.03, True, False), 'kick_03': (1.03, True, False), 'kick_04': (1.03, True, False)
}
RENAME = {'pose_idle_hand': 'idle_01', 'pose_victory_hand': 'cheer_01', 'pose_victory_fist': 'cheer_02', 'pose_victory_hands': 'cheer_03',
          'fall_damage_01': 'run_01', 'fall_damage_02': 'run_02', 'fall_damage_03': 'run_03', 'fall_damage_04': 'run_04',
          'fall_fall_airborne': 'air_01', 'fall_fall_forward': 'dive_01', 'land_crouch_landing': 'land_01',
          'kick_01': 'kick_01', 'kick_02': 'kick_02', 'kick_03': 'kick_03', 'kick_04': 'kick_04'}
meta = {'base': 'idle_01', 'note': 'k = tamaño de cabeza relativo a idle_01; escala de dibujo = BASE/k. ax/ay = ancla (centro del torso, pies) en px de la imagen.', 'frames': {}}
log = []
for n, (k, addA, rec) in FRAMES.items():
    im = Image.open(os.path.join(SRC, n + '.png')).convert('RGBA')
    if rec: im, cnt = recolor_teal(im); log.append(f'{n}: recolor {cnt}px')
    if addA: im = add_antlers(im, *params[n]); log.append(f'{n}: antlers {params[n]}')
    im, rem = clean_islands(im)
    if rem: log.append(f'{n}: removed {rem}px specks')
    ax, ay, bb = anchors(im)
    out = RENAME[n]
    im.save(os.path.join(OUT, out + '.png'), optimize=True)
    meta['frames'][out] = {'src': n, 'k': k, 'ax': ax, 'ay': ay, 'bbox': bb, 'w': im.width, 'h': im.height}
json.dump(meta, open(os.path.join(OUT, 'sofia_frames.json'), 'w'), indent=1, ensure_ascii=False)
print('\n'.join(log)); print(json.dumps({k: (v['k'], v['ax'], v['ay']) for k, v in meta['frames'].items()}))
