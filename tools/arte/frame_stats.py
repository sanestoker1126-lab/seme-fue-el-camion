"""Frame review: size, alpha bbox, baseline (lowest opaque row), horizontal center of mass, opaque area.
Usage: python3 -I frame_stats.py <dir> [glob]"""
import sys, os, glob
from PIL import Image
import numpy as np

def stats(path, thr=24):
    im = Image.open(path).convert('RGBA')
    a = np.array(im)[:, :, 3]
    h, w = a.shape
    mask = a > thr
    if not mask.any():
        return dict(w=w, h=h, empty=True)
    ys, xs = np.nonzero(mask)
    # center of mass in x for the bottom 25% of the opaque region (feet) and the whole body
    y1, y2 = ys.min(), ys.max()
    body_cx = xs.mean()
    feet_band = ys >= y2 - max(3, (y2 - y1) * 0.12)
    feet_cx = xs[feet_band].mean()
    # semi-transparent pixel ratio (fringe/matte quality)
    semi = ((a > 8) & (a < 200)).sum() / max(1, (a > 8).sum())
    # stray islands: count opaque pixels far (>12px) from the main bbox core using a coarse grid
    return dict(w=w, h=h, x1=int(xs.min()), x2=int(xs.max()), y1=int(y1), y2=int(y2), bw=int(xs.max()-xs.min()+1), bh=int(y2-y1+1),
                cx=round(float(body_cx), 1), feet_cx=round(float(feet_cx), 1), area=int(mask.sum()), semi=round(float(semi), 3))

if __name__ == '__main__':
    d = sys.argv[1]
    pat = sys.argv[2] if len(sys.argv) > 2 else '*.png'
    for p in sorted(glob.glob(os.path.join(d, pat))):
        s = stats(p)
        print(os.path.basename(p).ljust(28), ' '.join(f'{k}={v}' for k, v in s.items()))
