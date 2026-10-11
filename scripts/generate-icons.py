"""Generate raster PWA icons from the simple Porsi mark."""
from PIL import Image, ImageDraw
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "public"

for size in (192, 512):
    scale = size / 512
    image = Image.new("RGB", (size, size), "#264d3c")
    draw = ImageDraw.Draw(image)
    def box(values):
        return tuple(round(value * scale) for value in values)
    draw.rounded_rectangle(box((0, 0, 511, 511)), radius=round(124 * scale), fill="#264d3c")
    draw.ellipse(box((96, 96, 416, 416)), fill="#f6f5ed")
    draw.ellipse(box((133, 133, 379, 379)), outline="#d1ddc8", width=max(4, round(13 * scale)))
    draw.polygon([box((177, 272))[:2], box((233, 181))[:2], box((271, 279))[:2], box((216, 336))[:2]], fill="#84a76c")
    draw.polygon([box((297, 187))[:2], box((348, 235))[:2], box((329, 306))[:2], box((245, 336))[:2]], fill="#e5ad68")
    image.save(ROOT / f"icon-{size}.png", optimize=True)
