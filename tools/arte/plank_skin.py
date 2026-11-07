"""V51 · Deriva assets/platforms/plank.png (tablón atravesable) de las tablas superiores de wood_table.png:
filas 0..23 = tablas + canto oscuro (debajo empiezan el bastidor y las patas de la mesa).
Uso: python3 -I plank_skin.py <wood_table.png> <plank.png>"""
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGBA')
c = im.crop((0, 0, im.width, 24))
c.save(sys.argv[2]); print('ok', c.size)
