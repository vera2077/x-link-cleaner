"""Generates the extension icons (dev only, not needed at runtime)."""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

S = 1024
OUT = "icons"


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def build_tile():
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    t = np.clip((xx / S) * 0.55 + (yy / S) * 0.45, 0, 1)
    c1 = np.array([90, 210, 255], dtype=np.float32)
    c2 = np.array([4, 68, 150], dtype=np.float32)
    grad = c1[None, None, :] * (1 - t[..., None]) + c2[None, None, :] * t[..., None]

    d = np.sqrt((xx / S - 0.22) ** 2 + (yy / S - 0.10) ** 2)
    glow = (np.clip(1 - d / 0.80, 0, 1) ** 2) * 0.24
    grad = grad + (255.0 - grad) * glow[..., None]

    d2 = np.sqrt((xx / S - 1.05) ** 2 + (yy / S - 1.05) ** 2)
    dark = (np.clip(1 - d2 / 1.15, 0, 1) ** 2) * 0.20
    grad = grad * (1 - dark[..., None])

    img = Image.fromarray(np.clip(grad, 0, 255).astype("uint8")).convert("RGBA")
    img.putalpha(rounded_mask(S, int(S * 0.225)))

    line = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(line).rounded_rectangle(
        [int(S * 0.014), int(S * 0.014), S - int(S * 0.014), S - int(S * 0.014)],
        radius=int(S * 0.212), outline=(255, 255, 255, 52), width=max(2, int(S * 0.005)),
    )
    img.alpha_composite(line)
    return img


def ring(box, stroke):
    m = Image.new("L", (S, S), 0)
    x0, y0, x1, y1 = [int(v) for v in box]
    ImageDraw.Draw(m).rounded_rectangle([x0, y0, x1, y1], radius=(y1 - y0) // 2, outline=255, width=stroke)
    return m


def chain(link_w=0.400, link_h=0.340, overlap=0.290, angle=-26, stroke_ratio=0.086, back_gray=230):
    stroke = int(S * stroke_ratio)
    w = link_w * S
    h = link_h * S
    y0 = S * 0.5 - h / 2
    y1 = S * 0.5 + h / 2
    total = 2 * w - w * overlap
    xs = (S - total) / 2
    fx = xs + w * (1 - overlap)

    back = ring([xs, y0, xs + w, y1], stroke)
    front = ring([fx, y0, fx + w, y1], stroke)

    glyph = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    back_layer = Image.new("RGBA", (S, S), (back_gray, back_gray + 6, min(255, back_gray + 12), 255))
    back_layer.putalpha(back)
    glyph.alpha_composite(back_layer)

    front_layer = Image.new("RGBA", (S, S), (255, 255, 255, 255))
    front_layer.putalpha(front)
    glyph.alpha_composite(front_layer)

    return glyph.rotate(angle, resample=Image.BICUBIC, center=(S / 2, S / 2))


def sparkle_polygon(cx, cy, R, inner=0.24, steps=28):
    axes = [(0, -1), (1, 0), (0, 1), (-1, 0)]
    pts = []
    for i in range(4):
        ax, ay = axes[i]
        bx, by = axes[(i + 1) % 4]
        p0 = (cx + ax * R, cy + ay * R)
        p2 = (cx + bx * R, cy + by * R)
        ctrl = (cx + (ax + bx) * R * inner, cy + (ay + by) * R * inner)
        for j in range(steps + 1):
            t = j / steps
            pts.append((
                (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * ctrl[0] + t ** 2 * p2[0],
                (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * ctrl[1] + t ** 2 * p2[1],
            ))
    return pts


def add_sparkles(img):
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.polygon(sparkle_polygon(S * 0.802, S * 0.200, S * 0.118), fill=(255, 255, 255, 255))
    d.polygon(sparkle_polygon(S * 0.884, S * 0.336, S * 0.050), fill=(255, 255, 255, 230))
    img.alpha_composite(layer)
    return img


def compose():
    tile = build_tile()
    glyph = chain()
    shadow_alpha = glyph.getchannel("A").filter(ImageFilter.GaussianBlur(S * 0.013))
    shadow = Image.new("RGBA", (S, S), (3, 26, 56, 105))
    shadow.putalpha(shadow_alpha)
    tile.alpha_composite(shadow, (0, int(S * 0.011)))
    tile.alpha_composite(glyph)
    add_sparkles(tile)
    return tile


if __name__ == "__main__":
    import os
    os.makedirs(OUT, exist_ok=True)
    master = compose()
    for size in (128, 48, 32, 16):
        master.resize((size, size), Image.LANCZOS).save(f"{OUT}/icon-{size}.png")
    print("icons written")
