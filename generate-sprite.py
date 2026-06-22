"""Generate collectibles-sprite.png — 5x2 grid, 256x256 frames, 1280x512 total."""
from PIL import Image, ImageDraw
import math, os

COLS, ROWS, F = 5, 2, 256
W, H = COLS * F, ROWS * F
C = F // 2  # frame center

INK       = (34,  24,  20,  255)
GOLD      = (200, 146, 42,  255)
GOLD_LT   = (240, 208, 96,  255)
RUST      = (191, 78,  27,  255)
RUST_LT   = (240, 144, 96,  255)
BLUE      = (58,  110, 168, 255)
BLUE_LT   = (144, 188, 224, 255)
TEAL      = (58,  136, 112, 255)
TEAL_LT   = (128, 200, 176, 255)
VIOLET    = (104, 69,  168, 255)
VIOLET_LT = (192, 160, 232, 255)
RED       = (200, 50,  50,  255)
PAPER     = (250, 245, 238, 255)
WHITE     = (255, 255, 255, 255)

LW = 9   # outline stroke width
PAD = 30 # min padding from frame edge
R = C - PAD  # usable radius


def star_pts(cx, cy, n, ro, ri, start=-90):
    pts = []
    for i in range(n * 2):
        a = math.radians(start + i * 180 / n)
        r = ro if i % 2 == 0 else ri
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return [(int(x), int(y)) for x, y in pts]


def reg_poly(cx, cy, n, r, start=0):
    pts = []
    for i in range(n):
        a = math.radians(start + i * 360 / n)
        pts.append((int(cx + r * math.cos(a)), int(cy + r * math.sin(a))))
    return pts


def draw_outlined_ellipse(d, box, fill, lw=LW):
    d.ellipse(box, fill=fill, outline=INK, width=lw)


def draw_outlined_polygon(d, pts, fill, lw=LW):
    d.polygon(pts, fill=fill, outline=INK, width=lw)


# ── Frame drawers ────────────────────────────────────────────────────────────

def frame_star(f, d):
    """0: Golden star."""
    pts = star_pts(C, C, 5, R, int(R * 0.42))
    draw_outlined_polygon(d, pts, GOLD)
    # shine
    shine = star_pts(C - 22, C - 22, 5, int(R * 0.28), int(R * 0.12))
    d.polygon(shine, fill=GOLD_LT)


def frame_gem(f, d):
    """1: Blue faceted gem."""
    top = [
        (C,            C - R),
        (C + int(R*.8), C - int(R*.15)),
        (C + int(R*.6), C + int(R*.15)),
        (C - int(R*.6), C + int(R*.15)),
        (C - int(R*.8), C - int(R*.15)),
    ]
    bot = [
        (C - int(R*.6), C + int(R*.15)),
        (C + int(R*.6), C + int(R*.15)),
        (C, C + R),
    ]
    draw_outlined_polygon(d, top, BLUE_LT)
    draw_outlined_polygon(d, bot, BLUE)
    # divider lines
    d.line([(C, C - R), (C, C + R)], fill=INK, width=4)
    d.line([(C - int(R*.6), C + int(R*.15)), (C, C - R * .4)], fill=INK, width=3)
    d.line([(C + int(R*.6), C + int(R*.15)), (C, C - R * .4)], fill=INK, width=3)
    # shine
    d.ellipse([C - 55, C - R + 12, C - 18, C - R + 42], fill=(255, 255, 255, 160))


def frame_crown(f, d):
    """2: Gold crown."""
    # main body
    crown = [
        (C - R,           C + int(R*.5)),
        (C - R,           C - int(R*.05)),
        (C - int(R*.5),   C + int(R*.35)),
        (C,               C - R),
        (C + int(R*.5),   C + int(R*.35)),
        (C + R,           C - int(R*.05)),
        (C + R,           C + int(R*.5)),
    ]
    draw_outlined_polygon(d, crown, GOLD)
    # base band
    band_top = C + int(R * .3)
    band_bot = C + int(R * .6)
    d.rectangle([C - R, band_top, C + R, band_bot], fill=GOLD_LT, outline=INK, width=4)
    # jewels
    for jx, jy in [(C, C - int(R*.2)), (C - int(R*.65), C + int(R*.44)), (C + int(R*.65), C + int(R*.44))]:
        draw_outlined_ellipse(d, [jx - 14, jy - 14, jx + 14, jy + 14], RUST, lw=4)


def frame_key(f, d):
    """3: Gold key."""
    bow_r = int(R * .52)
    bow_cx, bow_cy = C, C - int(R * .28)
    shaft_w = int(R * .2)
    shaft_top = bow_cy + bow_r - 6
    shaft_bot = C + R

    # bow
    draw_outlined_ellipse(d, [bow_cx - bow_r, bow_cy - bow_r, bow_cx + bow_r, bow_cy + bow_r], GOLD)
    # shaft
    d.rectangle([bow_cx - shaft_w, shaft_top, bow_cx + shaft_w, shaft_bot], fill=GOLD)
    d.rectangle([bow_cx - shaft_w, shaft_top, bow_cx + shaft_w, shaft_bot], outline=INK, width=LW)
    # teeth
    t1_top = shaft_top + int((shaft_bot - shaft_top) * .28)
    t1_bot = t1_top + int(R * .22)
    d.rectangle([bow_cx + shaft_w, t1_top, bow_cx + shaft_w + int(R*.28), t1_bot], fill=GOLD, outline=INK, width=5)
    t2_top = shaft_top + int((shaft_bot - shaft_top) * .56)
    t2_bot = t2_top + int(R * .18)
    d.rectangle([bow_cx + shaft_w, t2_top, bow_cx + shaft_w + int(R*.2), t2_bot], fill=GOLD, outline=INK, width=5)
    # hole (draw PAPER circle over bow)
    hole_r = int(bow_r * .42)
    draw_outlined_ellipse(d, [bow_cx - hole_r, bow_cy - hole_r, bow_cx + hole_r, bow_cy + hole_r], PAPER, lw=4)


def frame_lightning(f, d):
    """4: Yellow lightning bolt."""
    bolt = [
        (C + int(R*.3),  C - R),
        (C - int(R*.1),  C - int(R*.05)),
        (C + int(R*.22), C - int(R*.05)),
        (C - int(R*.3),  C + R),
        (C + int(R*.1),  C + int(R*.05)),
        (C - int(R*.22), C + int(R*.05)),
    ]
    draw_outlined_polygon(d, bolt, GOLD_LT)
    # inner highlight
    inner = [(int(x - 5), int(y + 5)) for x, y in bolt[:3]]
    d.polygon(inner, fill=WHITE)


def frame_flower(f, d):
    """5: Teal flower, 6 petals."""
    petal_r = int(R * .58)
    petal_dist = int(R * .44)
    for i in range(6):
        a = math.radians(i * 60)
        px = int(C + petal_dist * math.cos(a))
        py = int(C + petal_dist * math.sin(a))
        draw_outlined_ellipse(d, [px - petal_r, py - petal_r, px + petal_r, py + petal_r], TEAL_LT, lw=5)
    center_r = int(R * .34)
    draw_outlined_ellipse(d, [C - center_r, C - center_r, C + center_r, C + center_r], GOLD)
    # center highlight
    d.ellipse([C - 20, C - 20, C + 6, C + 6], fill=GOLD_LT)


def frame_mushroom(f, d):
    """6: Red mushroom with white spots."""
    stem_w = int(R * .42)
    stem_top = C + int(R * .08)
    stem_bot = C + R
    # stem
    d.rectangle([C - stem_w, stem_top, C + stem_w, stem_bot], fill=(230, 220, 210, 255))
    d.rectangle([C - stem_w, stem_top, C + stem_w, stem_bot], outline=INK, width=LW)
    # cap
    cap_pts = reg_poly(C, C - int(R * .06), 40, int(R * .9), -180)
    cap_pts = [(x, y) for x, y in cap_pts if y <= C + int(R * .1)]
    if not cap_pts:
        cap_pts = [(C - R, C + int(R*.1)), (C + R, C + int(R*.1))]
    cap_top = min(y for _, y in reg_poly(C, C - int(R*.06), 40, int(R*.9), -180))
    cap_shape = [(C - int(R*.9), C + int(R*.08)), (C + int(R*.9), C + int(R*.08))]
    # Draw as large ellipse clipped at bottom
    cap_layer = Image.new('RGBA', (F, F), (0, 0, 0, 0))
    cd = ImageDraw.Draw(cap_layer)
    cap_cx, cap_cy = C, C - int(R * .04)
    cd.ellipse([cap_cx - int(R*.9), cap_cy - int(R*.86), cap_cx + int(R*.9), cap_cy + int(R*.86)], fill=RUST)
    # mask bottom half below stem_top
    cd.rectangle([0, stem_top + 2, F, F], fill=(0, 0, 0, 0))
    f.alpha_composite(cap_layer)
    # cap outline
    d2 = ImageDraw.Draw(f)
    d2.ellipse([cap_cx - int(R*.9), cap_cy - int(R*.86), cap_cx + int(R*.9), cap_cy + int(R*.86)], outline=INK, width=LW)
    d2.line([(C - int(R*.9), stem_top), (C + int(R*.9), stem_top)], fill=INK, width=LW)
    # white spots
    for sx, sy, sr in [(C - 30, cap_cy - 30, 22), (C + 44, cap_cy - 10, 16), (C + 4, cap_cy - 62, 17), (C - 60, cap_cy + 10, 14)]:
        d2.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=WHITE, outline=INK, width=3)


def frame_snowflake(f, d):
    """7: Ice blue snowflake."""
    # 6 arms
    arm_len = int(R * .9)
    for i in range(6):
        a = math.radians(i * 60)
        ex = int(C + arm_len * math.cos(a))
        ey = int(C + arm_len * math.sin(a))
        d.line([(C, C), (ex, ey)], fill=BLUE, width=12)
        # branch
        for t in [0.45, 0.7]:
            bx = int(C + arm_len * t * math.cos(a))
            by = int(C + arm_len * t * math.sin(a))
            br = int(arm_len * 0.22)
            for da in [60, -60]:
                ba = a + math.radians(da)
                d.line([(bx, by), (int(bx + br * math.cos(ba)), int(by + br * math.sin(ba)))], fill=BLUE, width=7)
    # outline pass (same but INK)
    for i in range(6):
        a = math.radians(i * 60)
        ex = int(C + arm_len * math.cos(a))
        ey = int(C + arm_len * math.sin(a))
        d.line([(C, C), (ex, ey)], fill=INK, width=2)
    # center
    draw_outlined_ellipse(d, [C - 18, C - 18, C + 18, C + 18], BLUE_LT, lw=4)


def frame_moon(f, d):
    """8: Gold crescent moon."""
    # Full circle layer
    moon_layer = Image.new('RGBA', (F, F), (0, 0, 0, 0))
    md = ImageDraw.Draw(moon_layer)
    md.ellipse([C - R, C - R, C + R, C + R], fill=GOLD_LT)
    # Cut out offset circle
    cut = Image.new('RGBA', (F, F), (0, 0, 0, 0))
    cd = ImageDraw.Draw(cut)
    ox, oy = int(R * .42), int(-R * .15)
    cr = int(R * .82)
    cd.ellipse([C + ox - cr, C + oy - cr, C + ox + cr, C + oy + cr], fill=(0, 0, 0, 255))
    moon_layer.paste((0, 0, 0, 0), mask=cut.split()[3])
    f.alpha_composite(moon_layer)
    d2 = ImageDraw.Draw(f)
    # Outline of outer circle
    d2.ellipse([C - R, C - R, C + R, C + R], outline=INK, width=LW)
    # small stars near crescent
    for sx, sy in [(C + int(R*.72), C - int(R*.55)), (C + int(R*.85), C + int(R*.3))]:
        d2.ellipse([sx - 9, sy - 9, sx + 9, sy + 9], fill=INK)


def frame_compass(f, d):
    """9: Compass with N needle."""
    # Outer ring
    draw_outlined_ellipse(d, [C - R, C - R, C + R, C + R], PAPER)
    # Inner ring
    draw_outlined_ellipse(d, [C - int(R*.82), C - int(R*.82), C + int(R*.82), C + int(R*.82)], (240, 234, 224, 255), lw=3)
    # Cardinal tick marks
    tick = int(R * .14)
    for angle, length in [(0, tick), (90, tick), (180, tick), (270, tick)]:
        a = math.radians(angle - 90)
        x1 = int(C + R * .82 * math.cos(a))
        y1 = int(C + R * .82 * math.sin(a))
        x2 = int(C + (R * .82 - length) * math.cos(a))
        y2 = int(C + (R * .82 - length) * math.sin(a))
        d.line([(x1, y1), (x2, y2)], fill=INK, width=6)
    # N needle (RUST, pointing up)
    needle_len = int(R * .62)
    needle_w = int(R * .12)
    north = [(C, C - needle_len), (C - needle_w, C + needle_w), (C, C + int(needle_w*.4)), (C + needle_w, C + needle_w)]
    draw_outlined_polygon(d, north, RUST, lw=4)
    # S needle (INK, pointing down)
    south = [(C, C + needle_len), (C - needle_w, C - needle_w), (C, C - int(needle_w*.4)), (C + needle_w, C - needle_w)]
    draw_outlined_polygon(d, south, INK, lw=3)
    # Center pin
    draw_outlined_ellipse(d, [C - 14, C - 14, C + 14, C + 14], PAPER, lw=4)


# ── Assemble ─────────────────────────────────────────────────────────────────

drawers = [
    frame_star, frame_gem, frame_crown, frame_key, frame_lightning,
    frame_flower, frame_mushroom, frame_snowflake, frame_moon, frame_compass,
]

sheet = Image.new('RGBA', (W, H), (0, 0, 0, 0))

for idx, drawer in enumerate(drawers):
    col = idx % COLS
    row = idx // COLS
    frame = Image.new('RGBA', (F, F), (0, 0, 0, 0))
    d = ImageDraw.Draw(frame)
    drawer(frame, d)
    sheet.paste(frame, (col * F, row * F))

out = os.path.join(os.path.dirname(__file__), 'collectibles-sprite.png')
sheet.save(out, 'PNG')
print(f'Saved {W}x{H} sprite sheet to {out}')
