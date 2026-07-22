"""One-off: replace the maroon velvet background of the trophy photo with white.
Flood-fills from the image border inward so the gold trophy (enclosed) is kept.
"""
from PIL import Image, ImageDraw

SRC = "trophy-champions-2026.png"
OUT = "trophy-champions-2026-white.png"
WHITE = (255, 255, 255)
THRESH = 78  # tolerance for "same as background velvet"

img = Image.open(SRC).convert("RGB")
w, h = img.size

# Seed points all around the border (velvet touches every edge).
seeds = []
step = max(2, w // 40)
for x in range(0, w, step):
    seeds.append((x, 1))
    seeds.append((x, h - 2))
step = max(2, h // 40)
for y in range(0, h, step):
    seeds.append((1, y))
    seeds.append((w - 2, y))

for s in seeds:
    ImageDraw.floodfill(img, s, WHITE, thresh=THRESH)

# Anything left that is still very dark-maroon AND not already white → whiten,
# but only outside a central column band to avoid eating trophy shadows.
px = img.load()
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        if (r, g, b) == WHITE:
            continue
        # maroon velvet: reddish, dark, low blue/green
        if r < 120 and g < 70 and b < 80 and r >= g and r >= b:
            px[x, y] = WHITE

img.save(OUT)
print("wrote", OUT, img.size)
