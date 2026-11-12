/* The original code-drawn sprites (deer, hounds, servants, noblewoman), kept so the O key can show
   the game as it looked before the painted sprite sheets were added. Exposes window.ORIGINAL_ART. */
(() => {
'use strict';
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function crisp(c) {
  const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 3; i < p.length; i += 4) p[i] = p[i] >= 110 ? 255 : 0;
  g.putImageData(d, 0, 0);
}
function limb(g, x, y, ang, len, w, col) {
  const x2 = x + Math.sin(ang) * len, y2 = y + Math.cos(ang) * len;
  g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
  return [x2, y2];
}
function ell(g, x, y, rx, ry, col, rot = 0) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill(); }
function poly(g, pts, col) { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); }

// ---------------------------------------------------------------- deer
const DEER_PAL = {
  ordinary: { body: '#b47b45', dark: '#7f5330', belly: '#e6cfa6', far: '#8f6238' },
  pet:      { body: '#b47b45', dark: '#7f5330', belly: '#e6cfa6', far: '#8f6238' },
  stag:     { body: '#96552c', dark: '#5c2f17', belly: '#cfab7b', far: '#733f20' },
};
function deerFrame(type, p, dead) {
  const big = type === 'stag';
  const sc = big ? 1.25 : 1;
  const w = big ? 112 : 76, h = big ? 112 : 66, ox = big ? 48 : 34, oy = h - 4;
  const c = mk(w, h), g = c.getContext('2d');
  g.translate(ox, oy); g.scale(sc, sc);
  const pal = DEER_PAL[type];
  const leg = (hx, hy, th, front, col) => {
    let up, low;
    if (dead) { up = front ? 0.5 : -0.5; low = up; }
    else if (front) { const a = 0.95 * Math.sin(th); up = a; low = a - 1.1 * Math.max(0, Math.cos(th)); }
    else { const a = -0.95 * Math.sin(th); up = a + 0.25; low = a - 0.3 - 0.8 * Math.max(0, -Math.cos(th)); }
    const [kx, ky] = limb(g, hx, hy, up, 10, 3.2, col);
    const [fx, fy] = limb(g, kx, ky, low, 11, 2.2, col);
    g.fillStyle = '#2a1a10'; g.fillRect(Math.round(fx) - 1, Math.round(fy) - 1, 2, 2);
  };
  const th = p * Math.PI * 2;
  leg(-10, -23, th + 0.6, false, pal.far); leg(10, -23, th + 0.6, true, pal.far);
  poly(g, [-17, -33, -22, -30, -17, -27], '#fff6e0');
  ell(g, 0, -27, 15, 8.5, pal.body); ell(g, 9, -28, 8, 9, pal.body); ell(g, -10, -28, 8, 8.5, pal.body);
  ell(g, 0, -21.5, 11, 3, pal.belly);
  ell(g, -15, -28, 2.5, 5, '#fff6e0');
  poly(g, [9, -34, 17, -25, 23, -43, 16, -47], pal.body);
  if (big) poly(g, [10, -33, 17, -25, 20, -34, 14, -40], pal.dark);
  ell(g, 21, -46, 6, 4.2, pal.body, 0.15);
  ell(g, 26.5, -44.5, 3.6, 2.6, pal.body);
  ell(g, 27, -43.2, 2.5, 1.2, pal.belly);
  poly(g, [15, -49, 11, -56, 19, -51], pal.dark);
  g.fillStyle = '#1a0f08'; g.fillRect(29, -46, 2, 2);
  if (dead) { g.fillRect(20, -49, 1, 1); g.fillRect(22, -47, 1, 1); g.fillRect(22, -49, 1, 1); g.fillRect(20, -47, 1, 1); g.fillRect(21, -48, 1, 1); }
  else g.fillRect(21, -48, 2, 2);
  leg(-11, -22, th, false, pal.dark); leg(11, -22, th, true, pal.dark);
  if (big) {
    const antler = (dx, col) => {
      g.strokeStyle = col; g.lineWidth = 1.8; g.lineCap = 'round'; g.lineJoin = 'round';
      const beam = [[19, -50], [14, -60], [13, -70], [18, -79], [26, -84]];
      g.beginPath(); g.moveTo(beam[0][0] + dx, beam[0][1]); for (const b of beam.slice(1)) g.lineTo(b[0] + dx, b[1]); g.stroke();
      const tines = [[17, -54, 27, -58], [14, -60, 24, -66], [13, -66, 5, -73], [13, -70, 23, -75], [18, -79, 12, -88], [18, -79, 21, -90], [26, -84, 30, -92], [26, -84, 33, -83]];
      for (const t of tines) { g.beginPath(); g.moveTo(t[0] + dx, t[1]); g.lineTo(t[2] + dx, t[3]); g.stroke(); }
    };
    antler(5, '#b9a47a'); antler(0, '#f1e3bd');
  }
  if (type === 'pet') {
    g.strokeStyle = '#c21d2b'; g.lineWidth = 3.4; g.lineCap = 'butt';
    g.beginPath(); g.moveTo(11.5, -39); g.lineTo(20.5, -35); g.stroke();
    g.fillStyle = '#ffd84a'; g.fillRect(13, -39, 1, 1); g.fillRect(16, -38, 1, 1); g.fillRect(19, -36, 1, 1);
    g.fillStyle = '#ffd84a'; g.fillRect(17, -34, 3, 3);
    g.fillStyle = '#3fd8ff'; g.fillRect(18, -33, 1, 1);
  }
  crisp(c);
  return { c, ox, oy, bc: 27 * sc };
}
const RUN_FRAMES = 6;
const DEER = {};
for (const t of ['ordinary', 'stag', 'pet']) {
  DEER[t] = { run: [], dead: deerFrame(t, 0, true) };
  for (let i = 0; i < RUN_FRAMES; i++) DEER[t].run.push(deerFrame(t, i / RUN_FRAMES, false));
}

// ---------------------------------------------------------------- hounds
function houndFrame(p) {
  const c = mk(44, 30), g = c.getContext('2d'); g.translate(20, 27);
  const th = p * Math.PI * 2;
  const leg = (hx, th2, front, col) => {
    const a = (front ? 1 : -1) * 0.9 * Math.sin(th2);
    const [kx, ky] = limb(g, hx, -10, a, 5, 2.2, col); limb(g, kx, ky, a - (front ? 0.5 : -0.3), 5, 1.8, col);
  };
  leg(-7, th + 0.7, false, '#b9a58c'); leg(7, th + 0.7, true, '#b9a58c');
  limb(g, -10, -13, -2.3, 7, 1.6, '#f3ead8');
  ell(g, 0, -12, 10, 4.2, '#f3ead8'); ell(g, -4, -13, 4, 3, '#9a5a2c'); ell(g, 6, -11, 3, 2.5, '#9a5a2c');
  ell(g, 12, -16, 3.6, 3.2, '#f3ead8'); ell(g, 16, -15, 3, 2, '#f3ead8');
  ell(g, 10.5, -15, 2, 3.6, '#7a4320');
  g.fillStyle = '#1a0f08'; g.fillRect(18, -16, 2, 2); g.fillRect(13, -18, 1, 1);
  leg(-8, th, false, '#e2d6bf'); leg(8, th, true, '#e2d6bf');
  crisp(c); return { c, ox: 20, oy: 27 };
}
const HOUND = [0, 1, 2, 3].map(i => houndFrame(i / 4));

// ---------------------------------------------------------------- servants in green & white livery
function beaterFrame(pose) { // 0 idle, 1 shouting, 2 blowing horn
  const c = mk(34, 48), g = c.getContext('2d'); g.translate(16, 46);
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  R(-4, -14, 3, 14, '#e8e4d8'); R(1, -14, 3, 14, '#1f6b34');
  R(-5, -1, 4, 2, '#3a2616'); R(1, -1, 4, 2, '#3a2616');
  R(-6, -28, 6, 15, '#1f7a3c'); R(0, -28, 6, 15, '#f0ece0');
  R(-6, -17, 12, 2, '#3a2616');
  R(-1, -25, 2, 2, '#c8202a');
  R(-3, -35, 7, 7, '#e2b08c');
  R(-4, -37, 9, 3, '#27221d'); R(-5, -35, 2, 2, '#27221d');
  R(2, -32, 1, 1, '#1a0f08');
  if (pose === 0) {
    R(-8, -27, 2, 10, '#1f7a3c'); R(6, -27, 2, 9, '#f0ece0');
    R(8, -40, 1, 40, '#7a5530');
  } else if (pose === 1) {
    R(-8, -36, 2, 10, '#1f7a3c'); R(6, -36, 2, 10, '#f0ece0'); R(-8, -38, 2, 2, '#e2b08c'); R(6, -38, 2, 2, '#e2b08c');
    R(8, -46, 1, 16, '#7a5530'); R(3, -30, 2, 2, '#5a1a14');
  } else {
    R(-8, -27, 2, 10, '#1f7a3c'); R(5, -31, 4, 2, '#f0ece0');
    g.strokeStyle = '#e7b93c'; g.lineWidth = 2; g.beginPath(); g.moveTo(4, -31); g.quadraticCurveTo(11, -29, 14, -37); g.stroke();
    R(12, -40, 5, 3, '#e7b93c');
  }
  crisp(c); return { c, ox: 16, oy: 46 };
}
const BEATER = [0, 1, 2].map(beaterFrame);

// ---------------------------------------------------------------- noblewoman
function ladyFrame(pose) { // 0,1 run  2,3 kneel weeping
  const c = mk(44, 50), g = c.getContext('2d'); g.translate(20, 48);
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const gown = '#8c1c4a', gownD = '#641235', gold = '#e7b93c', skin = '#f0c4a4';
  if (pose < 2) {
    const sw = pose ? 2 : -2;
    poly(g, [-4, -24, 5, -24, 12 + sw, 0, -11 + sw, 0], gown);
    poly(g, [-1, -24, 2, -24, 4 + sw, 0, -2 + sw, 0], gold);
    R(-9 + sw, -2, 22, 2, gownD);
    R(-4, -33, 9, 10, gown); R(-4, -25, 9, 1, gold);
    R(-3, -34, 7, 2, skin);
    R(4, -31, 8, 3, gown); R(11, -32 + pose, 2, 3, skin);
    R(-7, -30, 4, 8, gownD);
    R(-2, -41, 7, 7, skin);
    poly(g, [-4, -40, 1, -46, 6, -40, 6, -42, 1, -47, -4, -42], gold);
    poly(g, [-4, -41, -3, -45, 1, -46, -3, -40, -6, -30, -8, -30], '#1d1a1a');
    R(3, -38, 1, 1, '#1a0f08'); R(2, -36, 3, 1, '#7a2a2a');
  } else {
    const sob = pose === 3 ? 1 : 0;
    poly(g, [-5, -15, 6, -15, 17, 0, -15, 0], gown);
    R(-15, -2, 33, 2, gownD);
    poly(g, [-1, -15, 2, -15, 5, 0, -3, 0], gold);
    R(-3, -24 + sob, 9, 10, gown);
    R(-1, -31 + sob, 7, 7, skin);
    poly(g, [-3, -30 + sob, 2, -36 + sob, 7, -30 + sob, 7, -32 + sob, 2, -37 + sob, -3, -32 + sob], gold);
    poly(g, [-3, -31 + sob, -2, -35 + sob, 2, -36 + sob, -2, -30 + sob, -5, -18, -7, -18], '#1d1a1a');
    R(4, -24 + sob, 3, 5, gown); R(1, -29 + sob, 6, 4, skin);
    R(-4, -23 + sob, 3, 6, gownD);
  }
  crisp(c); return { c, ox: 20, oy: 48 };
}
const LADY = [0, 1, 2, 3].map(ladyFrame);

window.ORIGINAL_ART = { DEER, HOUND, BEATER, LADY, RUN_FRAMES };
})();
