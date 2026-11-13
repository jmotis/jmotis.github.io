#!/usr/bin/env python3
"""Builds everything in img/ and track.js from the source images in Assets/.
Run from the MarioKart folder:  python3 tools/build_assets.py
Needs Pillow."""
import json, math, os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops
sys.path.insert(0, os.path.dirname(__file__))
from track import HALF_WIDTH, build as build_track
Image.MAX_IMAGE_PIXELS = None

A = 'Assets/'
BW = A + 'agas-moeml-12588x4808.jpg'   # stitched from MoEML's zoom tiles (half of their full size)
COL = A + 'agas-edg_1531x573-1.jpg'
OUT = 'img/'
os.makedirs(OUT, exist_ok=True)
TEX_W = 12588                     # ground texture width = the map's own width
TEX_W_SMALL = 8192                # fallback for graphics cards that cannot take the big one

# ---------- 1. colour wash: borrow colour from the small coloured facsimile ----------
# Matching points (x,y in the big b&w map) -> (x,y in the small coloured map).
CONTROL = [
    ((1038, 661), (125, 60)),     # royal arms, top left
    ((11568, 554), (1393, 55)),   # City arms, top right
    ((9202, 3600), (1108, 432)),  # London Bridge, north end
    ((11172, 3273), (1372, 385)), # White Tower
    ((1000, 2515), (119, 298)),   # Charing Cross
    ((6230, 2485), (737, 302)),   # St Paul's
    ((2882, 4122), (335, 490)),   # cartouche, bottom left
    ((10740, 2160), (1287, 243)), # Aldgate
]
def solve3(Mx, v):
    """Solve a 3x3 linear system by Gaussian elimination."""
    m = [row[:] + [v[i]] for i, row in enumerate(Mx)]
    for i in range(3):
        p = max(range(i, 3), key=lambda r: abs(m[r][i])); m[i], m[p] = m[p], m[i]
        for r in range(3):
            if r != i:
                f = m[r][i] / m[i][i]
                m[r] = [a - f*b for a, b in zip(m[r], m[i])]
    return [m[i][3] / m[i][i] for i in range(3)]

def fit_affine(pairs):
    """Least-squares affine map (big map px -> small coloured map px)."""
    src = [(x, y, 1.0) for (x, y), _ in pairs]
    AtA = [[sum(r[i]*r[j] for r in src) for j in range(3)] for i in range(3)]
    rows = []
    for k in (0, 1):
        Atb = [sum(r[i]*d[k] for r, (_, d) in zip(src, pairs)) for i in range(3)]
        rows.append(solve3(AtA, Atb))
    resid = max(abs(sum(a*b for a, b in zip(rows[k], r)) - d[k]) for r, (_, d) in zip(src, pairs) for k in (0, 1))
    return rows, resid

def build_ground():
    bw = Image.open(BW).convert('L')
    W, H = bw.size
    col = Image.open(COL).convert('RGB')
    # knock out the coloured map's own dark linework and lettering, keep the washes
    col = col.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(2.5))
    M, resid = fit_affine(CONTROL)
    print('affine max residual (small-map px):', round(resid, 1))
    s = TEX_W / W
    TW, TH = TEX_W, round(H * s)
    # PIL affine wants output->input: texture px -> coloured-map px
    coef = (M[0][0]/s, M[0][1]/s, M[0][2], M[1][0]/s, M[1][1]/s, M[1][2])
    wash = col.transform((TW, TH), Image.AFFINE, coef, Image.BICUBIC)
    # outside the coloured map's coverage, fall back to parchment
    cover = Image.new('L', col.size, 255).transform((TW, TH), Image.AFFINE, coef)
    parch = Image.new('RGB', (TW, TH), (232, 219, 186))
    wash = Image.composite(wash, parch, cover.filter(ImageFilter.GaussianBlur(40)))
    wash = Image.blend(wash, parch, 0.12)            # soften toward parchment
    ink = bw.resize((TW, TH), Image.LANCZOS)
    ink = ink.point(lambda v: 40 + v * 215 // 255)   # sepia-ish ink, not pure black
    ground = ImageChops.multiply(wash, Image.merge('RGB', (ink, ink, ink)))
    return ground, s

# ---------- 2. the road ----------
def draw_road(ground, s, pts):
    TW, TH = ground.size
    hw = HALF_WIDTH * s
    P = [(x*s, y*s) for x, y in pts]
    loop = P + P[:2]
    layer = Image.new('RGBA', (TW, TH), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    def stroke(width, fill):
        d.line(loop, fill=fill, width=round(width), joint='curve')
        r = width/2
        for x, y in P[::4]: d.ellipse((x-r, y-r, x+r, y+r), fill=fill)
    stroke(hw*2 + 10, (70, 48, 30, 190))            # kerb
    stroke(hw*2, (206, 180, 132, 150))               # packed earth; the engraved street shows through
    # start line: Tudor green-and-white chequers across the road at point 0
    (x0, y0), (x1, y1) = P[0], P[1]
    L = math.hypot(x1-x0, y1-y0); tx, ty = (x1-x0)/L, (y1-y0)/L; nx, ny = -ty, tx
    n = 10; cw = 2*hw/n
    for row in range(2):
        for i in range(n):
            a = -hw + i*cw; b = row*cw
            quad = [(x0+nx*(a+u)+tx*(b+v), y0+ny*(a+u)+ty*(b+v)) for u, v in ((0, 0), (cw, 0), (cw, cw), (0, cw))]
            d.polygon(quad, fill=(250, 250, 240, 255) if (i+row) % 2 else (20, 110, 60, 255))
    ground = Image.alpha_composite(ground.convert('RGBA'), layer).convert('RGB')
    # a little grit so the road is not a flat fill when magnified
    noise = Image.effect_noise((TW//2, TH//2), 90).resize((TW, TH), Image.BILINEAR)
    mask = layer.split()[3].point(lambda v: 30 if v > 0 else 0)
    dark = Image.eval(ground, lambda v: v * 3 // 4)
    ground = Image.composite(dark, ground, ImageChops.multiply(mask, noise))
    return ground

# ---------- 3. portraits ----------
# (id, file, face centre x, y, radius) in each portrait's own pixels
QUEENS = [
    ('aragon',  "Catherine_of_Aragon_(1485-1536).jpg", 601, 373, 300),
    ('boleyn',  "AnneBoleynHever.jpg", 403, 375, 300),
    ('seymour', "Hans_Holbein_the_Younger_-_Jane_Seymour,_Queen_of_England_-_Google_Art_Project.jpg", 420, 330, 265),
    ('cleves',  "Portrait_d'Anne_de_Clèves_-_Hans_Holbein.jpg", 474, 275, 235),
    ('howard',  "Workshop_of_Hans_Holbein_the_Younger_portrait_of_a_Lady.jpg", 245, 168, 128),
    ('parr',    "Catherine_Parr_from_NPG.jpg", 590, 454, 305),
]
def build_portraits():
    import unicodedata
    names = {unicodedata.normalize('NFC', f): f for f in os.listdir(A)}
    for qid, f, cx, cy, r in QUEENS:
        im = Image.open(A + names[unicodedata.normalize('NFC', f)]).convert('RGB')
        im.crop((cx-r, cy-r, cx+r, cy+r)).resize((192, 192), Image.LANCZOS).save(f'{OUT}face-{qid}.jpg', quality=90)
        h = 560; im.resize((round(im.width*h/im.height), h), Image.LANCZOS).save(f'{OUT}portrait-{qid}.jpg', quality=88)

def main():
    pts, name_idx, zone, names, lms = build_track()
    ground, s = build_ground()
    small = lambda im, w, f, q=85: im.resize((w, round(w*im.height/im.width)), Image.LANCZOS).save(OUT + f, quality=q)
    small(ground, 1600, 'map-plain.jpg')
    ground = draw_road(ground, s, pts)
    ground.save(OUT + 'ground-hi.jpg', quality=86, subsampling=1)
    small(ground, TEX_W_SMALL, 'ground.jpg', 86)
    small(ground, 2000, 'minimap.jpg')
    build_portraits()
    W, H = Image.open(BW).size
    with open('track.js', 'w', encoding='utf-8') as f:
        f.write('// Generated by tools/build_assets.py from tools/track.py. Coordinates are pixels of the 12588x4808 map.\n')
        f.write('window.TRACK = ' + json.dumps({'mapW': W, 'mapH': H, 'halfWidth': HALF_WIDTH, 'names': names, 'landmarks': lms,
                'nameIdx': name_idx, 'zone': zone, 'pts': [[round(x, 1), round(y, 1)] for x, y in pts]}, ensure_ascii=False) + ';\n')
    L = sum(math.dist(a, b) for a, b in zip(pts, pts[1:] + pts[:1]))
    print('points', len(pts), 'lap length (map px)', round(L), 'ground', ground.size)
main()
