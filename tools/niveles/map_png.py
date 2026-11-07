"""Render a map (JSON dump) to a PNG for a quick visual check. Usage: map_png.py <maps.json> <mapName> <out.png>"""
import sys, json
from PIL import Image, ImageDraw
maps = json.load(open(sys.argv[1])); m = maps[sys.argv[2]]; out = sys.argv[3]
W, H = m['width'], m['height']; Z = 1 if W > 900 else 1.4
im = Image.new('RGB', (int(W * Z) + 20, int(H * Z) + 20), (24, 30, 44)); d = ImageDraw.Draw(im)
T = lambda x, y: (10 + x * Z, 10 + y * Z)
d.rectangle([T(0, 0), T(W, H)], outline=(90, 100, 120))
for s in m['surfaces']:
    col = (90, 255, 140) if not s.get('exit') else (255, 220, 80)
    if s.get('start'): col = (120, 200, 255)
    d.line([T(s['x1'], s['y']), T(s['x2'], s['y'])], fill=col, width=4)
    if s.get('start'): d.text(T(s['startX'] - 4, s['y'] - 16), 'S', fill=col)
for s in m.get('stairs', []): d.line([T(s['x1'], s['y']), T(s['x2'], s['y'])], fill=(255, 90, 220), width=3)
for s in m.get('planks', []): d.line([T(s['x1'], s['y']), T(s['x2'], s['y'])], fill=(190, 140, 90), width=3)
for s in m.get('crumbles', []): d.line([T(s['x1'], s['y']), T(s['x2'], s['y'])], fill=(255, 140, 60), width=4)
for s in m.get('belts', []):
    d.line([T(s['x1'], s['y']), T(s['x2'], s['y'])], fill=(80, 170, 255), width=4)
    d.text(T((s['x1'] + s['x2']) / 2, s['y'] - 14), '>>' if s['speed'] > 0 else '<<', fill=(80, 170, 255))
for s in m.get('bouncers', []): d.line([T(s['x1'], s['y']), T(s['x2'], s['y'])], fill=(255, 80, 255), width=5)
for s in m.get('movers', []):
    r = s.get('range', 0)
    d.line([T(s['x1'] - r, s['y']), T(s['x2'] + r, s['y'])], fill=(120, 110, 40), width=1)
    d.line([T(s['x1'], s['y']), T(s['x2'], s['y'])], fill=(255, 240, 60), width=4)
for s in m.get('pigeons', []): d.line([T(s['x1'], s['y']), T(s['x2'], s['y'])], fill=(170, 190, 255), width=4)
for g in m['gems']: d.ellipse([T(g['x'] - 4, g['y'] - 4), T(g['x'] + 4, g['y'] + 4)], outline=(217, 255, 101))
ex = [s for s in m['surfaces'] if s.get('exit')][0]
d.text(T(m['exitX'] - 4, ex['y'] + 4), 'E', fill=(255, 220, 80))
for y in range(0, H, 100): d.text(T(-8, y), str(y), fill=(120, 130, 150))
im.save(out); print(out, im.size)
