"""The race circuit, assembled from the street centrelines in the Map of Early Modern London's
Agas map gazetteer (Assets/moeml-agasLocations.json, from https://mapoflondon.uvic.ca/agas.htm).

MoEML coordinates are pixels of their full 25176 x 9616 scan with y negative downwards.
Everything returned from here is in pixels of the half-size image we use (12588 x 4808),
Assets/agas-moeml-12588x4808.jpg, with y positive downwards."""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
LOC = json.load(open(os.path.join(HERE, '..', 'Assets', 'moeml-agasLocations.json'), encoding='utf-8'))
MAP_W, MAP_H = 12588, 4808
HALF_WIDTH = 40          # road half-width in map pixels
RURAL, URBAN, MINORIES = 0, 1, 2

def street(key, reverse=False, keep=None):
    pts = [(x, -y) for x, y in LOC[key]['coords'][0]]
    if reverse: pts.reverse()
    return [p for p in pts if keep is None or keep(*p)]
def free(*pts): return list(pts)

# (street name shown in the game, zone, points in MoEML full-size pixels) in riding order.
ROUTE = [
    ('The Strand', URBAN, street('STRA9', keep=lambda x, y: x > 2500)),
    ('Fleet Street', URBAN, street('FLEE6')),
    ('Ludgate Hill', URBAN, street('FLEE2')),
    # round the south side of the cathedral (no MoEML line; hand-placed inside St Paul's Churchyard)
    ("St Paul’s Churchyard", URBAN, free((12080, 5385), (12450, 5435), (12800, 5395), (12990, 5290))),
    ('Watling Street', URBAN, street('WATL1', keep=lambda x, y: x > 13200)),
    ('Budge Row', URBAN, street('BUDG1')),
    ('Candlewick Street', URBAN, street('CAND1')),
    ('Eastcheap', URBAN, street('EAST2')),
    ('Little Eastcheap', URBAN, street('LITT4')),
    ('Tower Street', URBAN, street('TOWE3', reverse=True)),
    # out by the postern gate beside the Tower, then north outside the wall (hand-placed)
    ('Tower Hill', RURAL, free((21700, 6080), (22120, 5900), (22330, 5600))),
    ('The Minories', MINORIES, street('MINO1')),
    ('Aldgate', URBAN, street('ALDG4', keep=lambda x, y: 20900 < x < 21700)),
    ('Aldgate Street', URBAN, street('ALDG4', keep=lambda x, y: x <= 20900)),
    ('Leadenhall Street', URBAN, street('LEAD2')),
    ('Cornhill', URBAN, street('CORN2')),
    ('The Poultry', URBAN, street('POUL1', reverse=True)),
    ('Cheapside', URBAN, street('CHEA2', reverse=True, keep=lambda x, y: x > 12900)),
    ('Newgate Street', URBAN, free((12790, 4417), (11642, 4392), (11228, 4351))),
    ('Snow Hill', URBAN, street('SNOW2', reverse=True, keep=lambda x, y: x > 10500)),
    ('Holborn', URBAN, street('HOLB1', reverse=True, keep=lambda x, y: 7000 < x < 10300)),
    ('Holborn', RURAL, street('HOLB1', reverse=True, keep=lambda x, y: x <= 7000)),
    ('Broad St Giles', RURAL, street('BROA1', reverse=True)),
    ('St Giles High Street', RURAL, street('STGI1', reverse=True)),
    ("St Martin’s Lane", RURAL, street('STMA23', keep=lambda x, y: y < 4950)),
    ('Charing Cross', URBAN, free((2445, 5060))),
]
START_NEAR = (3900, 4806)     # start/finish line on the Strand (MoEML pixels)

def centre(key):
    v = LOC[key]; c = v['coords']
    if v['geomType'] == 'Point': return c[0], -c[1]
    pts = c[0] if v['geomType'] == 'Polygon' else c[0][0]
    xs = [p[0] for p in pts]; ys = [-p[1] for p in pts]
    return (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2

# kind, label, position in MoEML pixels. 'gate' and 'mid' kinds are snapped onto the road by the game.
LANDMARKS = [
    ('stpauls', "St Paul’s Cathedral", (12460, 4990)),
    ('tower', 'The Tower of London', (22900, 6500)),
    ('cross', 'Charing Cross', (2000, 5030)),
    ('church', 'St Giles in the Fields', (2990, 3040)),
    ('gate', 'Temple Bar', centre('TEMP1')),
    ('gate', 'Ludgate', centre('LUDG1')),
    ('gate', 'Aldgate', centre('ALDG1')),
    ('gate', 'Newgate', centre('NEWG1')),
    ('midcross', 'Cheapside Cross', centre('ELEA1')),
    ('mid', 'The Standard', centre('STAN17')),
    ('mid', 'The Great Conduit', centre('GREA1')),
    ('mid', 'The Conduit upon Cornhill', centre('COND3')),
    ('mid', 'Fleet Street Conduit', centre('FLEE8')),
]

def build():
    """Returns (points, name index per point, zone per point, names, landmarks), all in half-size pixels."""
    # 1. chain the streets into one closed polyline, sampled every 8 px, remembering the street
    verts = [(x, y, si) for si, (_, _, pts) in enumerate(ROUTE) for x, y in pts]
    dense = []
    for (x0, y0, s0), (x1, y1, _) in zip(verts, verts[1:] + verts[:1]):
        n = max(1, round(math.hypot(x1 - x0, y1 - y0) / 8))
        dense += [(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, s0) for k in range(n)]
    # 2. round the corners: circular Gaussian blur of the polyline
    sig = 9.0; R = 27; w = [math.exp(-k * k / (2 * sig * sig)) for k in range(-R, R + 1)]; ws = sum(w); n = len(dense)
    sm = [(sum(w[k + R] * dense[(i + k) % n][0] for k in range(-R, R + 1)) / ws,
           sum(w[k + R] * dense[(i + k) % n][1] for k in range(-R, R + 1)) / ws, dense[i][2]) for i in range(n)]
    # 3. start at the start line, resample evenly (8 full-size px = 4 map px = 3 game units... the game uses 6)
    s0 = min(range(n), key=lambda i: (sm[i][0] - START_NEAR[0]) ** 2 + (sm[i][1] - START_NEAR[1]) ** 2)
    sm = sm[s0:] + sm[:s0]
    step = 16.0; out = [sm[0]]; acc = 0.0
    for a, b in zip(sm, sm[1:] + sm[:1]):
        d = math.hypot(b[0] - a[0], b[1] - a[1])
        while acc + d >= step:
            f = (step - acc) / d; a = (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2]); out.append(a)
            d = math.hypot(b[0] - a[0], b[1] - a[1]); acc = 0.0
        acc += d
    if math.hypot(out[-1][0] - out[0][0], out[-1][1] - out[0][1]) < step * .5: out.pop()
    names = []; 
    for nm, _, _ in ROUTE:
        if nm not in names: names.append(nm)
    pts = [(x / 2, y / 2) for x, y, _ in out]
    name_idx = [names.index(ROUTE[s][0]) for _, _, s in out]
    zone = [ROUTE[s][1] for _, _, s in out]
    lms = [{'kind': k, 'label': l, 'x': round(x / 2, 1), 'y': round(y / 2, 1)} for k, l, (x, y) in LANDMARKS]
    return pts, name_idx, zone, names, lms
