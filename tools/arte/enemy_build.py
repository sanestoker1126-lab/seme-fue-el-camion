"""Clean enemy frames (detached specks/stray tails, red FX smudges on the dog's legs), pick the complete
frames per state and compute per-frame anchors so frames don't jump around. Writes a manifest.
Usage: enemy_build.py <enemiesDir> <outDir>"""
import sys, os, json
from PIL import Image
import numpy as np
from collections import deque
SRC, OUT = sys.argv[1], sys.argv[2]
SETS = {
    'kid': {'dir': 'nino', 'states': {
        'idle': ['idle_01', 'idle_02', 'idle_03', 'idle_04', 'idle_05', 'idle_06'],
        'walk': ['walk_01', 'walk_02', 'walk_03', 'walk_04', 'walk_05', 'walk_06'],
        'alert': ['alert_01', 'alert_04'],            # wind-up: angry, fists
        'aim': ['alert_02', 'alert_03', 'alert_05'],   # pointing/throwing gesture
        'hurt': ['hurt_01', 'hurt_02'],
        'dizzy': ['hurt_01'],
        'dead': ['hurt_02', 'hurt_03', 'dead_02']}},   # dead_01/dead_03 are cut at the image edge
    'rat': {'dir': 'rat', 'states': {
        'walk': ['walk_01', 'walk_02', 'walk_03'],
        'alert': ['alert_01', 'alert_02', 'alert_04'],  # alert_03 is cut at the right edge
        'hurt': ['hurt_01', 'hurt_02', 'hurt_03', 'hurt_04'],
        'dizzy': ['hurt_01', 'hurt_03'],
        'dead': ['hurt_04', 'dead_01']}},
    'dog': {'dir': 'dog', 'states': {
        'walk': ['walk_02', 'walk_03', 'walk_04'],      # walk_01 has the back cut flat
        'alert': ['alert_02', 'alert_03'],              # alert_01 is cut at the bottom (floats)
        'hurt': ['alert_03', 'alert_02'],
        'dizzy': ['walk_03'],
        'dead': ['dead_01']}},
}
def components(a):
    h, w = a.shape; lab = np.zeros((h, w), int); info = {}; cur = 0
    for y in range(h):
        for x in range(w):
            if a[y, x] > 20 and lab[y, x] == 0:
                cur += 1; q = deque([(y, x)]); lab[y, x] = cur; n = 0; b = [x, y, x, y]
                while q:
                    cy, cx = q.popleft(); n += 1
                    b[0] = min(b[0], cx); b[1] = min(b[1], cy); b[2] = max(b[2], cx); b[3] = max(b[3], cy)
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and a[ny, nx] > 20 and lab[ny, nx] == 0:
                                lab[ny, nx] = cur; q.append((ny, nx))
                info[cur] = (n, b)
    return lab, info
def clean(arr, kind, name):
    a = arr[..., 3]
    lab, info = components(a)
    if not info: return arr, 0
    main = max(info, key=lambda k: info[k][0]); mn, mb = info[main]; removed = 0
    for k, (n, b) in info.items():
        if k == main: continue
        gap = max(mb[0] - b[2], b[0] - mb[2], mb[1] - b[3], b[1] - mb[3], 0)
        # detached pieces: keep only sizeable ones hugging the body (e.g. shadow under the feet)
        if n < mn * 0.04 or gap > 2:
            arr[lab == k] = 0; removed += n
    ERASE = {('rat', 'alert_01'): (146, 40, 170, 112), ('rat', 'alert_02'): (119, 66, 170, 112)}
    if (kind, name) in ERASE:
        # stray second tail floating in front of the snout (bled in from the neighbouring cell of the sheet)
        x1, y1, x2, y2 = ERASE[(kind, name)]
        removed += int((arr[y1:y2, x1:x2, 3] > 0).sum()); arr[y1:y2, x1:x2] = 0
    if kind == 'dog' and name != 'dead_01':  # dead_01 keeps its tongue
        r, g, b = [arr[..., i].astype(int) for i in range(3)]
        h = arr.shape[0]; ys = np.arange(h)[:, None].repeat(arr.shape[1], 1)
        fx = (arr[..., 3] > 0) & (ys > h * 0.64) & (r > 140) & (g < 125) & (b < 140) & (r - g > 55)
        arr[fx, 0] = 52; arr[fx, 1] = 44; arr[fx, 2] = 46; removed += int(fx.sum())
    arr[a <= 20] = 0
    return arr, removed
def anchors(arr):
    a = arr[..., 3]; ys, xs = np.nonzero(a > 60); y1, y2 = ys.min(), ys.max(); bh = y2 - y1
    band = (ys >= y1 + bh * 0.25) & (ys <= y1 + bh * 0.85)
    rows = (a > 60).sum(1); feet = int(max(y for y in range(len(rows)) if rows[y] >= 3))
    return round(float(xs[band].mean()), 1), feet + 1, [int(xs.min()), int(y1), int(xs.max()) + 1, int(y2) + 1]
manifest = {}
for kind, spec in SETS.items():
    os.makedirs(os.path.join(OUT, kind), exist_ok=True)
    used = sorted({f for lst in spec['states'].values() for f in lst})
    frames = {}
    for name in used:
        arr = np.array(Image.open(os.path.join(SRC, spec['dir'], name + '.png')).convert('RGBA'))
        arr, rem = clean(arr, kind, name)
        ax, ay, bb = anchors(arr)
        Image.fromarray(arr, 'RGBA').save(os.path.join(OUT, kind, name + '.png'), optimize=True)
        frames[name] = {'ax': ax, 'ay': ay, 'bbox': bb, 'w': arr.shape[1], 'h': arr.shape[0], 'cleaned': rem}
    manifest[kind] = {'states': spec['states'], 'frames': frames}
json.dump(manifest, open(os.path.join(OUT, 'enemies_frames.json'), 'w'), indent=1)
for k, m in manifest.items():
    print(k, {n: (f['ax'], f['ay'], f['cleaned']) for n, f in m['frames'].items()})
