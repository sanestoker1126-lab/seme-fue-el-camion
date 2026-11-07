"""Hoja de contacto de los cuadros extraídos (fondo gris medio para ver orillas y restos de tablero).
Uso: python3 -I swim_contact.py <frames_dir> <salida.png> [secciones csv]"""
import sys, json, os
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]; out = sys.argv[2]
man = json.load(open(os.path.join(d, 'manifest.json')))
secs = sys.argv[3].split(',') if len(sys.argv) > 3 else sorted({m['section'] for m in man}, key=lambda s: [m['section'] for m in man].index(s))
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 13)
rows = []
for s in secs:
    ims = [Image.open(os.path.join(d, m['file'])) for m in man if m['section'] == s]
    rows.append((s, ims))
S = 1.6
W = max(sum(int(i.width * S) + 8 for i in ims) + 10 for _, ims in rows) + 140
H = sum(max([int(i.height * S) for i in ims] + [20]) + 14 for _, ims in rows) + 10
sheet = Image.new('RGB', (min(W, 2600), H), (118, 122, 128)); dr = ImageDraw.Draw(sheet)
y = 6
for s, ims in rows:
    dr.text((6, y + 4), s, font=F, fill=(255, 255, 255))
    x = 140; rh = max([int(i.height * S) for i in ims] + [20])
    for k, im in enumerate(ims):
        z = im.resize((int(im.width * S), int(im.height * S)), Image.NEAREST)
        dr.rectangle([x - 1, y - 1, x + z.width, y + z.height], outline=(90, 94, 100))
        sheet.paste(z, (x, y), z); dr.text((x + 2, y + 1), str(k + 1), font=F, fill=(255, 255, 0))
        x += z.width + 8
    y += rh + 14
sheet.save(out); print(out, sheet.size)
