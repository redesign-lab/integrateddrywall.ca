"""Compose the IFD mark onto worker imagery and export optimized web assets."""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC = "assets-src/generated"
OUT = "assets/images"
os.makedirs(OUT, exist_ok=True)

WHITE = (243, 241, 236)
MARK_WHITE = Image.open(os.path.join(os.path.dirname(__file__), "mark-white.png")).convert("RGBA")
MARK_DARK = Image.open(os.path.join(os.path.dirname(__file__), "mark-dark.png")).convert("RGBA")

def mark(size, color="white"):
    """The original house mark, traced from the live logo and rendered vector-crisp."""
    src = MARK_WHITE if color == "white" else MARK_DARK
    pad = int(size * 0.06)
    canvas = Image.new("RGBA", (size + pad * 2, size + pad * 2), (0, 0, 0, 0))
    canvas.alpha_composite(src.resize((size, size), Image.LANCZOS), (pad, pad))
    return canvas.crop(src.resize((size, size), Image.LANCZOS).getbbox())

def wordmark(width, color=WHITE, tone="white"):
    """IFD lock-up: house mark + stacked type, matched to the existing site's identity."""
    mark_size = int(width * 0.30)
    m = mark(mark_size, tone)
    f1 = ImageFont.truetype("/tmp/ttf/Oswald-SemiBold.ttf", int(mark_size * 0.62))
    f2 = ImageFont.truetype("/tmp/ttf/Inter-SemiBold.ttf", int(mark_size * 0.135))
    t1, t2 = "INTEGRATED", "FRAMING & DRYWALL"
    probe = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
    b1 = probe.textbbox((0, 0), t1, font=f1)
    b2 = probe.textbbox((0, 0), t2, font=f2)
    w1, h1 = b1[2] - b1[0], b1[3] - b1[1]
    w2, h2 = b2[2] - b2[0], b2[3] - b2[1]
    block_w = max(w1, w2)
    gap = int(mark_size * 0.24)
    total_h = mark_size
    # optically balance: tall condensed caps, small tracking-out label beneath
    text_top = int(total_h * 0.255)
    img = Image.new("RGBA", (int(mark_size + gap + block_w + 4), total_h), (0, 0, 0, 0))
    img.alpha_composite(m, (0, 0))
    d = ImageDraw.Draw(img)
    x = mark_size + gap
    d.text((x - b1[0], text_top - b1[1]), t1, font=f1, fill=color)
    d.text((x - b2[0], text_top + h1 + int(total_h * 0.055) - b2[1]), t2, font=f2, fill=color)
    return img.crop(img.getbbox())

def mark_alpha():
    return MARK_WHITE

def composite_mark(base_path, out_path, cx, cy, w, rotate=-3, opacity=222, softness=0.35):
    base = Image.open(base_path).convert("RGBA")
    W, H = base.size
    badge = MARK_WHITE.resize((int(max(14, W * w)),) * 2, Image.LANCZOS)
    tinted = Image.new("RGBA", badge.size, (255, 255, 255, 0))
    tinted.alpha_composite(badge)
    alpha = tinted.split()[3].point(lambda v: int(v * opacity / 255))
    tinted.putalpha(alpha)
    badge = tinted.rotate(rotate, resample=Image.BICUBIC, expand=True)
    if softness:
        a = badge.split()[3].filter(ImageFilter.GaussianBlur(W * 0.0009))
        badge.putalpha(a)
    px, py = int(W * cx - badge.width / 2), int(H * cy - badge.height / 2)
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    layer.alpha_composite(badge, (px, py))
    base.alpha_composite(layer)
    base.convert("RGB").save(out_path, quality=92)

def export(src, out, size, quality=82, sharpen=1.0, grayscale=False, crop=None):
    im = Image.open(src).convert("RGB")
    if crop:
        im = im.crop(crop)
    im = im.resize(size, Image.LANCZOS)
    if im.mode == "L":
        im = im.convert("RGB")
    if sharpen != 1.0:
        from PIL import ImageEnhance
        im = ImageEnhance.Sharpness(im).enhance(sharpen)
    im.save(out, quality=quality, optimize=True, progressive=True, subsampling=1)

# 1. Logo lock-ups (header uses SVG; these are the raster fallbacks / OG assets)
wordmark(1200, WHITE, "white").save("assets/logo/ifd-logo-light.png")
wordmark(1200, WHITE, "dark").save("assets/logo/ifd-logo-dark.png")

# 2. Worker portraits with the brand mark on the shirt
composite_mark(f"{SRC}/worker-portrait.jpg", f"{OUT}/work-taping-detail.jpg",
               cx=0.50, cy=0.375, w=0.045, rotate=-2.5, opacity=205)
composite_mark(f"{SRC}/svc-drywall.jpg", f"{OUT}/_drywall-branded.jpg",
               cx=0.335, cy=0.40, w=0.030, rotate=-3, opacity=200)
composite_mark(f"{SRC}/svc-insulation.jpg", f"{OUT}/_insulation-branded.jpg",
               cx=0.545, cy=0.40, w=0.028, rotate=2, opacity=150)  # placed on the dark shirt under the vest
composite_mark(f"{SRC}/hero-framing.jpg", f"{OUT}/_hero-branded.jpg",
               cx=0.672, cy=0.415, w=0.016, rotate=-2, opacity=190)

# 3. Hero — 16:9 and a 4:5 mobile crop
export(f"{OUT}/_hero-branded.jpg", f"{OUT}/hero-framing-1600.jpg", (1600, 900), 80, 1.05)
W, H = Image.open(f"{OUT}/_hero-branded.jpg").size
mob = Image.open(f"{OUT}/_hero-branded.jpg").crop((int(W*0.34), 0, int(W*0.34)+int(H*0.8), H))
mob.resize((900, 1125), Image.LANCZOS).save(f"{OUT}/hero-framing-mobile.jpg", quality=80, optimize=True, progressive=True)

# 4. Service cards — 4:3
export(f"{OUT}/_drywall-branded.jpg",  f"{OUT}/service-drywall.jpg", (880, 660), 82, 1.05)
export(f"{SRC}/svc-steel.jpg",         f"{OUT}/service-steel.jpg",   (880, 660), 82, 1.05)
export(f"{SRC}/svc-taping.jpg",        f"{OUT}/service-taping.jpg",  (880, 660), 82, 1.05)
export(f"{OUT}/_insulation-branded.jpg", f"{OUT}/service-insulation.jpg", (880, 660), 82, 1.05)

# 5. Authentic project photo from the existing site (living room rebuild), 4:5 editorial crop
im = Image.open("assets-src/originals/ifd-project-living-room-original.jpg").convert("RGB")
im = im.resize((1200, 800), Image.LANCZOS)
im.crop((150, 0, 950, 800)).resize((760, 950), Image.LANCZOS).save(
    f"{OUT}/project-living-room.jpg", quality=84, optimize=True, progressive=True)

# 6. Original brand hero (from the live site) kept for the introduction strip
export("assets-src/originals/ifd-hero-original.jpg",
       f"{OUT}/intro-drafting.jpg", (1100, 740), 80, 1.02)

# 7. OG card
og = Image.new("RGB", (1200, 630), (14, 15, 15))
hero = Image.open(f"{OUT}/hero-framing-1600.jpg").resize((1200, 675), Image.LANCZOS)
og.paste(hero.crop((0, 20, 1200, 650)), (0, 0))
veil = Image.new("RGBA", (1200, 630), (14, 15, 15, 150))
og = Image.alpha_composite(og.convert("RGBA"), veil)
lg = wordmark(620)
og.alpha_composite(lg, (72, (630 - lg.height) // 2 - 10))
og.convert("RGB").save("assets/images/og-home.jpg", quality=88, optimize=True)

for f in os.listdir(OUT):
    if f.startswith("_"):
        os.remove(os.path.join(OUT, f))
print("brand assets written")
