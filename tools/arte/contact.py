"""Contact sheet: frames on checkerboard with baseline/center guides.
Usage: python3 -I contact.py out.png baselineFrac cols scale file1 file2 ..."""
import sys, os
from PIL import Image, ImageDraw, ImageFont

out = sys.argv[1]; base_frac = float(sys.argv[2]); cols = int(sys.argv[3]); scale = float(sys.argv[4]); files = sys.argv[5:]
ims = [Image.open(f).convert('RGBA') for f in files]
cw = int(max(i.width for i in ims) * scale); chh = int(max(i.height for i in ims) * scale)
rows = (len(ims) + cols - 1) // cols
lab = 14
sheet = Image.new('RGBA', (cols * (cw + 6), rows * (chh + lab + 6)), (40, 40, 48, 255))
d = ImageDraw.Draw(sheet)
for k, (im, f) in enumerate(zip(ims, files)):
    r, c = divmod(k, cols)
    x0, y0 = c * (cw + 6) + 3, r * (chh + lab + 6) + lab + 3
    # checkerboard
    for yy in range(0, chh, 8):
        for xx in range(0, cw, 8):
            col = (90, 90, 100, 255) if ((xx // 8 + yy // 8) % 2) else (120, 120, 130, 255)
            d.rectangle([x0 + xx, y0 + yy, min(x0 + xx + 7, x0 + cw - 1), min(y0 + yy + 7, y0 + chh - 1)], fill=col)
    imr = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
    sheet.alpha_composite(imr, (x0, y0))
    by = y0 + int(im.height * base_frac * scale)
    d.line([x0, by, x0 + cw, by], fill=(255, 60, 60, 255), width=1)
    d.line([x0 + int(im.width * scale / 2), y0, x0 + int(im.width * scale / 2), y0 + chh], fill=(60, 255, 255, 160), width=1)
    d.text((x0 + 2, y0 - lab), os.path.basename(f)[:30], fill=(255, 255, 255, 255))
sheet.save(out)
print(out, sheet.size)
