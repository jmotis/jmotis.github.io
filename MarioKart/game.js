/* The Queens' Gallop — a horse race round Tudor London on the Agas map.
   World units are pixels of the source map (4730 x 2000). The ground is drawn by a WebGL
   shader as a flat perspective plane; riders, houses and landmarks are billboards on a 2D canvas. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const wrapA = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

/* ======================= the queens ======================= */
// Gown colours follow the colour-coding of the queens in “Six: the Musical”:
// Aragon gold, Boleyn green, Seymour white (with black), Cleves red, Howard pink, Parr blue.
const QUEENS = [
  { id: 'aragon', name: 'Catherine of Aragon', short: 'Aragon', dates: 'Queen 1509–1533', motto: '“Humble and Loyal”',
    gown: '#e0b020', trim: '#2a2118', hood: '#e8dcc0', gable: true, coat: '#ece6da', mane: '#bdb5a5',
    spd: 3, acc: 3, han: 5, note: '' },
  { id: 'boleyn', name: 'Anne Boleyn', short: 'Boleyn', dates: 'Queen 1533–1536', motto: '“The Most Happy”',
    gown: '#2e9b4e', trim: '#101010', hood: '#1a1a1a', gable: false, coat: '#2a211c', mane: '#0e0b09',
    spd: 5, acc: 3, han: 3, note: '' },
  { id: 'seymour', name: 'Jane Seymour', short: 'Seymour', dates: 'Queen 1536–1537', motto: '“Bound to Obey and Serve”',
    gown: '#f1f1ee', trim: '#141414', hood: '#c9a24a', gable: true, coat: '#8a5a33', mane: '#2b1a10',
    spd: 3, acc: 4, han: 4, note: '' },
  { id: 'cleves', name: 'Anne of Cleves', short: 'Cleves', dates: 'Queen January–July 1540', motto: '“God Send Me Well to Keep”',
    gown: '#c8201f', trim: '#101010', hood: '#e2c56a', gable: false, coat: '#a9a39b', mane: '#5f5a54',
    spd: 4, acc: 3, han: 4, note: '' },
  { id: 'howard', name: 'Catherine Howard', short: 'Howard', dates: 'Queen 1540–1541', motto: '“No Other Will but His”',
    gown: '#e85fa3', trim: '#101010', hood: '#7a2a1c', gable: false, coat: '#b5793f', mane: '#e6d3a8',
    spd: 4, acc: 5, han: 2, note: 'Sitter uncertain: a “Portrait of a Lady” from Holbein’s workshop, traditionally called Catherine Howard.' },
  { id: 'parr', name: 'Katherine Parr', short: 'Parr', dates: 'Queen 1543–1547', motto: '“To Be Useful in All I Do”',
    gown: '#2a5fc4', trim: '#101010', hood: '#f4f0e6', gable: false, coat: '#5a3a22', mane: '#1d130c',
    spd: 4, acc: 4, han: 3, note: '' },
];
for (const q of QUEENS) {
  q.vmax = 178 + q.spd * 6;          // map px per second
  q.accel = 62 + q.acc * 9;
  q.turn = 1.95 + q.han * 0.12;      // radians per second
  q.face = new Image(); q.face.src = `img/face-${q.id}.jpg`;
}

/* ======================= the track ======================= */
// K game units = 1 map pixel. Everything below (speeds, sizes, the camera) is in game units.
const K = 0.75, T = window.TRACK, P = T.pts.map(p => [p[0] * K, p[1] * K]), N = P.length, HW = T.halfWidth * K, STEP = 6;
const TX = new Float32Array(N), TY = new Float32Array(N), CURV = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const a = P[(i - 1 + N) % N], b = P[(i + 1) % N];
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
  TX[i] = dx / l; TY[i] = dy / l;
}
for (let i = 0; i < N; i++) {
  const a = (i - 5 + N) % N, b = (i + 5) % N;
  CURV[i] = Math.abs(wrapA(Math.atan2(TY[b], TX[b]) - Math.atan2(TY[a], TX[a]))) / (10 * STEP);
}
const mod = i => ((i % N) + N) % N;
const trackPos = (i, lat) => { i = mod(Math.round(i)); return [P[i][0] - TY[i] * lat, P[i][1] + TX[i] * lat]; };
function nearestIdx(x, y) { x *= K; y *= K; let b = 0, bd = 1e18;   // takes map pixels
  for (let i = 0; i < N; i++) { const d = (P[i][0] - x) ** 2 + (P[i][1] - y) ** 2; if (d < bd) { bd = d; b = i; } } return b; }

const STREET_AT = T.nameIdx.map(k => T.names[k]);      // street name for every point of the circuit

/* ======================= procedural art ======================= */
function mk(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
const ell = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.fill(); };
function shade(hex, f) { const n = parseInt(hex.slice(1), 16); const ch = s => clamp(Math.round(((n >> s) & 255) * f), 0, 255); return `rgb(${ch(16)},${ch(8)},${ch(0)})`; }

// horse and rider seen from behind, 4 gallop frames
function rearSprite(q, k) {
  return mk(160, 204, c => {
    const bob = (k % 2) ? -4 : 0;
    c.lineJoin = 'round';
    for (const s of [-1, 1]) {                       // hind legs
      const lift = ((k < 2) === (s < 0)) ? 14 : 0;
      c.fillStyle = shade(q.coat, .72); c.fillRect(80 + s * 21 - 8, 118 + bob, 16, 76 - lift - bob);
      c.fillStyle = '#1b1510'; c.fillRect(80 + s * 21 - 9, 192 - lift, 18, 9);
    }
    c.fillStyle = q.coat; ell(c, 80, 108 + bob, 38, 36);              // rump
    c.fillStyle = shade(q.coat, .85); ell(c, 80, 122 + bob, 30, 20);
    c.fillStyle = q.mane;                                             // tail
    c.beginPath(); const sw = [-5, 0, 5, 0][k];
    c.moveTo(72, 96 + bob); c.quadraticCurveTo(66 + sw, 140 + bob, 76 + sw * 1.6, 176 + bob); c.quadraticCurveTo(92 + sw, 142 + bob, 88, 96 + bob); c.fill();
    c.fillStyle = q.gown;                                             // skirts over the crupper
    c.beginPath(); c.moveTo(62, 60 + bob); c.lineTo(98, 60 + bob); c.quadraticCurveTo(128, 84 + bob, 132, 122 + bob);
    c.quadraticCurveTo(80, 104 + bob, 28, 122 + bob); c.quadraticCurveTo(32, 84 + bob, 62, 60 + bob); c.fill();
    c.strokeStyle = q.trim; c.lineWidth = 4; c.beginPath(); c.moveTo(29, 120 + bob); c.quadraticCurveTo(80, 102 + bob, 131, 120 + bob); c.stroke();
    c.fillStyle = shade(q.gown, .82); c.beginPath(); c.roundRect(62, 26 + bob, 36, 42, 8); c.fill();   // bodice
    c.fillStyle = q.gown; ell(c, 56, 50 + bob, 11, 17, .25); ell(c, 104, 50 + bob, 11, 17, -.25);    // sleeves
    c.fillStyle = q.trim; c.fillRect(62, 60 + bob, 36, 4);
    c.fillStyle = '#17120e';                                          // veil falling from the hood
    c.beginPath(); c.moveTo(67, 14 + bob); c.lineTo(93, 14 + bob); c.lineTo(96, 44 + bob); c.lineTo(64, 44 + bob); c.fill();
    c.fillStyle = q.hood;
    if (q.gable) { c.beginPath(); c.moveTo(80, -2 + bob + 4); c.lineTo(97, 16 + bob); c.lineTo(93, 24 + bob); c.lineTo(80, 10 + bob); c.lineTo(67, 24 + bob); c.lineTo(63, 16 + bob); c.fill(); }
    else { c.beginPath(); c.ellipse(80, 15 + bob, 15, 12, 0, Math.PI, TAU); c.fill(); c.fillStyle = q.trim; c.fillRect(65, 13 + bob, 30, 3); }
  });
}
// horse and rider from the side (facing right), riding aside
function sideSprite(q, k) {
  return mk(240, 204, c => {
    const bob = (k % 2) ? -4 : 0, f = [[.75, -.75], [.25, -.2], [-.55, .5], [.1, .15]][k];
    c.lineCap = 'round';
    const leg = (x, a, col) => { c.strokeStyle = col; c.lineWidth = 11; c.beginPath(); c.moveTo(x, 122 + bob); const kx = x + Math.sin(a) * 36, ky = 122 + bob + Math.cos(a) * 36;
      c.lineTo(kx, ky); c.lineTo(kx + Math.sin(a * .3) * 34, Math.min(196, ky + 34)); c.stroke(); };
    leg(150, f[0] - .2, shade(q.coat, .7)); leg(74, f[1] - .2, shade(q.coat, .7));
    c.fillStyle = q.mane; c.beginPath(); c.moveTo(56, 96 + bob); c.quadraticCurveTo(14, 96 + bob + k * 3, 16, 160 + bob); c.quadraticCurveTo(36, 124 + bob, 62, 110 + bob); c.fill();
    c.fillStyle = q.coat; ell(c, 110, 112 + bob, 60, 29);
    c.beginPath(); c.moveTo(146, 92 + bob); c.lineTo(182, 46 + bob); c.lineTo(204, 60 + bob); c.lineTo(172, 124 + bob); c.fill();   // neck
    ell(c, 204, 58 + bob, 22, 11, .5); c.beginPath(); c.moveTo(184, 44 + bob); c.lineTo(188, 28 + bob); c.lineTo(196, 46 + bob); c.fill();
    c.fillStyle = q.mane; c.beginPath(); c.moveTo(180, 42 + bob); c.quadraticCurveTo(158, 60 + bob, 146, 94 + bob); c.lineTo(156, 96 + bob); c.quadraticCurveTo(168, 66 + bob, 188, 50 + bob); c.fill();
    c.fillStyle = '#111'; ell(c, 206, 54 + bob, 2.4, 2.4);
    leg(160, f[0], q.coat); leg(64, f[1], q.coat);
    c.fillStyle = q.gown;                                            // skirts
    c.beginPath(); c.moveTo(92, 70 + bob); c.lineTo(126, 72 + bob); c.quadraticCurveTo(150, 110 + bob, 140, 150 + bob); c.lineTo(84, 146 + bob); c.quadraticCurveTo(74, 100 + bob, 92, 70 + bob); c.fill();
    c.strokeStyle = q.trim; c.lineWidth = 4; c.beginPath(); c.moveTo(85, 145 + bob); c.lineTo(140, 149 + bob); c.stroke();
    c.fillStyle = shade(q.gown, .82); c.beginPath(); c.roundRect(96, 36 + bob, 28, 42, 8); c.fill();
    c.fillStyle = q.gown; ell(c, 118, 58 + bob, 10, 16, -.5);
    c.fillStyle = '#17120e'; c.beginPath(); c.moveTo(98, 14 + bob); c.lineTo(112, 12 + bob); c.lineTo(102, 46 + bob); c.lineTo(92, 44 + bob); c.fill();
    c.fillStyle = '#e9c9a8'; ell(c, 114, 24 + bob, 10, 12);
    c.fillStyle = q.hood; c.beginPath(); c.ellipse(111, 20 + bob, 13, 13, -.3, Math.PI * .9, Math.PI * 1.9); c.fill();
  });
}
for (const q of QUEENS) { q.rear = [0, 1, 2, 3].map(k => rearSprite(q, k)); q.side = [0, 1, 2, 3].map(k => sideSprite(q, k)); }

// timber-framed houses
function houseSprite(seed) {
  const r = rng(seed);
  return mk(150, 230, (c, w, h) => {
    const plaster = ['#efe6cf', '#e7d6a6', '#f3ecdc', '#e3c9a4', '#d9c7b0'][r() * 5 | 0], beam = ['#3a2a1c', '#2b2018', '#4a3422'][r() * 3 | 0];
    const roof = r() < .75 ? '#9a4a2c' : '#b79a56', gable = r() < .65, top = gable ? 104 : 86;
    c.fillStyle = plaster; c.fillRect(18, 160, 114, 70); c.fillRect(8, top, 134, 60);
    if (gable) { c.beginPath(); c.moveTo(4, top); c.lineTo(75, 28); c.lineTo(146, top); c.fill(); }
    c.strokeStyle = beam; c.lineWidth = 5;
    const ln = (a, b, d, e) => { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); };
    for (let x = 18; x <= 132; x += 19) ln(x, 160, x, 230);
    for (let x = 8; x <= 142; x += 19.2) ln(x, top, x, 160);
    ln(8, top, 142, top); ln(4, 160, 146, 160); ln(8, 132, 142, 132);
    if (r() < .6) { ln(8, 160, 27, 132); ln(142, 160, 123, 132); } else { for (let x = 27; x < 130; x += 38.4) { ln(x, 132, x + 19, top); } }
    if (gable) { ln(75, 28, 75, top); ln(40, top, 75, 66); ln(110, top, 75, 66); c.lineWidth = 9; c.strokeStyle = roof; ln(0, top + 3, 75, 24); ln(150, top + 3, 75, 24); }
    else { c.fillStyle = roof; c.beginPath(); c.moveTo(0, top + 2); c.lineTo(18, 40); c.lineTo(132, 40); c.lineTo(150, top + 2); c.fill(); c.strokeStyle = shade('#9a4a2c', .7); c.lineWidth = 2; for (let y = 52; y < top; y += 11) ln(14 - (y - 40) * .25, y, 136 + (y - 40) * .25, y);
      c.fillStyle = '#7b4a3a'; c.fillRect(100, 14, 16, 30); }
    const win = (x, y, ww, hh) => { c.fillStyle = '#2f3f4a'; c.fillRect(x, y, ww, hh); c.strokeStyle = '#b9c3bd'; c.lineWidth = 1; for (let i = 4; i < ww; i += 5) { c.beginPath(); c.moveTo(x + i, y); c.lineTo(x + i, y + hh); c.stroke(); } c.strokeStyle = beam; c.lineWidth = 3; c.strokeRect(x, y, ww, hh); };
    win(30, top + 8, 34, 18); win(88, top + 8, 34, 18); if (gable) win(63, 70, 24, 18);
    win(86, 174, 36, 24);
    c.fillStyle = beam; c.fillRect(36, 178, 26, 52); c.fillStyle = '#6a4a30'; c.fillRect(40, 182, 18, 48);
  });
}
const HOUSES = Array.from({ length: 10 }, (_, i) => houseSprite(101 + i * 37));
const CHURCH = mk(170, 330, c => {
  const st = '#cfc8b6', dk = '#8f887a';
  c.fillStyle = st; c.fillRect(8, 210, 154, 120); c.fillStyle = '#6d6f73'; c.beginPath(); c.moveTo(0, 214); c.lineTo(85, 150); c.lineTo(170, 214); c.fill();
  c.fillStyle = st; c.fillRect(55, 60, 60, 270); c.fillStyle = dk; for (let x = 55; x < 115; x += 15) c.fillRect(x, 48, 9, 14);
  c.fillStyle = '#3a3f45'; for (const [x, y] of [[76, 90], [76, 150], [24, 250], [130, 250]]) { c.beginPath(); c.moveTo(x, y + 44); c.lineTo(x, y + 12); c.quadraticCurveTo(x + 9, y - 6, x + 18, y + 12); c.lineTo(x + 18, y + 44); c.fill(); }
  c.fillStyle = '#4a3422'; c.beginPath(); c.moveTo(70, 330); c.lineTo(70, 290); c.quadraticCurveTo(85, 268, 100, 290); c.lineTo(100, 330); c.fill();
  c.strokeStyle = dk; c.lineWidth = 2; c.strokeRect(55, 60, 60, 270);
});
function treeSprite(seed) { const r = rng(seed); return mk(120, 160, c => {
  c.fillStyle = '#5b4028'; c.fillRect(54, 96, 12, 64);
  for (let i = 0; i < 7; i++) { c.fillStyle = ['#3f6b35', '#4c7c3c', '#35602f', '#5a8a45'][i % 4]; ell(c, 60 + (r() - .5) * 56, 62 + (r() - .5) * 60, 26 + r() * 10, 24 + r() * 8); }
}); }
const TREES = [treeSprite(5), treeSprite(9), treeSprite(14)];
const HEDGE = mk(160, 60, c => { for (let i = 0; i < 9; i++) { c.fillStyle = i % 2 ? '#3f6b35' : '#4c7c3c'; ell(c, 14 + i * 16.5, 34 + (i % 3) * 3, 20, 24); } });
const GATE = mk(320, 250, c => {
  const st = '#c9c0aa', dk = '#857d6c';
  c.fillStyle = st; c.fillRect(0, 30, 66, 220); c.fillRect(254, 30, 66, 220); c.fillRect(60, 70, 200, 60);
  c.beginPath(); c.moveTo(60, 130); c.lineTo(66, 130); c.quadraticCurveTo(160, 96, 254, 130); c.lineTo(260, 130); c.fill();
  c.fillStyle = dk; for (let x = 0; x < 66; x += 18) { c.fillRect(x, 16, 11, 16); c.fillRect(254 + x, 16, 11, 16); } for (let x = 66; x < 254; x += 20) c.fillRect(x, 58, 12, 14);
  c.fillStyle = '#3a3f45'; for (const x of [24, 280]) { c.fillRect(x, 70, 14, 34); c.fillRect(x, 140, 14, 34); }
  c.strokeStyle = dk; c.lineWidth = 2; for (let y = 50; y < 250; y += 22) { c.beginPath(); c.moveTo(0, y); c.lineTo(66, y); c.moveTo(254, y); c.lineTo(320, y); c.stroke(); }
  c.fillStyle = '#8c1c13'; c.fillRect(140, 78, 40, 26); c.fillStyle = '#d8b24a'; c.fillRect(144, 82, 14, 8); c.fillRect(162, 92, 14, 8);
});
const CROSS = mk(110, 300, c => {
  const st = '#d8d0bb', dk = '#8f887a';
  c.fillStyle = dk; c.fillRect(0, 282, 110, 18); c.fillStyle = st; c.fillRect(10, 264, 90, 20); c.fillRect(20, 246, 70, 20);
  for (const [x, y, w, h] of [[28, 170, 54, 78], [35, 104, 40, 68], [42, 52, 26, 54]]) { c.fillStyle = st; c.fillRect(x, y, w, h); c.fillStyle = dk; c.fillRect(x - 4, y - 4, w + 8, 6);
    c.fillStyle = '#4a4f55'; c.beginPath(); c.moveTo(x + w * .3, y + h - 6); c.lineTo(x + w * .3, y + h * .35); c.quadraticCurveTo(x + w / 2, y + h * .1, x + w * .7, y + h * .35); c.lineTo(x + w * .7, y + h - 6); c.fill(); }
  c.fillStyle = st; c.beginPath(); c.moveTo(44, 50); c.lineTo(55, 18); c.lineTo(66, 50); c.fill();
  c.fillStyle = '#d8b24a'; c.fillRect(52, 0, 6, 24); c.fillRect(45, 6, 20, 5);
});
const STPAULS = mk(420, 520, c => {
  const st = '#cfc8b6', dk = '#8f887a', lead = '#6d7379';
  c.fillStyle = st; c.fillRect(10, 400, 400, 120); c.fillStyle = lead; c.beginPath(); c.moveTo(0, 404); c.lineTo(30, 350); c.lineTo(390, 350); c.lineTo(420, 404); c.fill();
  c.fillStyle = st; c.fillRect(165, 250, 90, 270); c.fillStyle = dk; for (let x = 165; x < 255; x += 15) c.fillRect(x, 238, 9, 14);
  c.fillStyle = lead; c.beginPath(); c.moveTo(168, 240); c.lineTo(210, 0); c.lineTo(252, 240); c.fill();
  c.fillStyle = '#d8b24a'; c.fillRect(207, -2, 6, 22); c.fillRect(200, 6, 20, 5);
  c.fillStyle = '#3a3f45'; for (let x = 26; x < 400; x += 34) { if (x > 150 && x < 250) continue; c.beginPath(); c.moveTo(x, 500); c.lineTo(x, 440); c.quadraticCurveTo(x + 9, 416, x + 18, 440); c.lineTo(x + 18, 500); c.fill(); }
  for (const y of [280, 350]) for (const x of [183, 219]) { c.beginPath(); c.moveTo(x, y + 48); c.lineTo(x, y + 12); c.quadraticCurveTo(x + 9, y - 8, x + 18, y + 12); c.lineTo(x + 18, y + 48); c.fill(); }
  c.fillStyle = dk; for (let x = 10; x < 410; x += 34) c.fillRect(x, 392, 8, 128);
});
const TOWER = mk(460, 330, c => {
  const st = '#d9d2c0', dk = '#8f887a';
  c.fillStyle = '#b9b19c'; c.fillRect(0, 250, 460, 80); c.fillStyle = dk; for (let x = 0; x < 460; x += 24) c.fillRect(x, 238, 14, 14);
  for (const x of [20, 400]) { c.fillStyle = '#b9b19c'; c.fillRect(x, 200, 44, 130); c.fillStyle = dk; for (let i = 0; i < 44; i += 14) c.fillRect(x + i, 190, 9, 12); }
  c.fillStyle = st; c.fillRect(120, 90, 220, 190); c.fillStyle = dk; for (let x = 120; x < 340; x += 20) c.fillRect(x, 78, 12, 14);
  for (const x of [104, 178, 262, 322]) { c.fillStyle = st; c.fillRect(x, 50, 34, 230); c.fillStyle = '#6d7379'; c.beginPath(); c.moveTo(x - 3, 52); c.quadraticCurveTo(x + 17, 2, x + 37, 52); c.fill(); c.fillStyle = '#d8b24a'; c.fillRect(x + 15, 6, 4, 16); }
  c.fillStyle = '#3a3f45'; for (let x = 150; x < 320; x += 38) for (const y of [120, 180]) { c.beginPath(); c.moveTo(x, y + 32); c.lineTo(x, y + 8); c.quadraticCurveTo(x + 7, y - 4, x + 14, y + 8); c.lineTo(x + 14, y + 32); c.fill(); }
});
const BALE = mk(120, 70, c => { c.fillStyle = '#d2a93f'; c.beginPath(); c.roundRect(2, 6, 116, 64, 10); c.fill(); c.strokeStyle = '#a9832a'; c.lineWidth = 2; for (let y = 14; y < 66; y += 8) { c.beginPath(); c.moveTo(6, y); c.lineTo(114, y + 3); c.stroke(); } c.strokeStyle = '#5b4028'; c.lineWidth = 5; for (const x of [34, 86]) { c.beginPath(); c.moveTo(x, 6); c.lineTo(x, 70); c.stroke(); } });
const ROSE = mk(140, 140, c => {
  c.translate(70, 70); c.fillStyle = 'rgba(255,240,180,.35)'; ell(c, 0, 0, 68, 68);
  for (let i = 0; i < 5; i++) { c.fillStyle = '#b3261e'; ell(c, Math.sin(i * TAU / 5) * 34, -Math.cos(i * TAU / 5) * 34, 27, 27); }
  for (let i = 0; i < 5; i++) { c.fillStyle = '#f6f1e6'; ell(c, Math.sin((i + .5) * TAU / 5) * 18, -Math.cos((i + .5) * TAU / 5) * 18, 15, 15); }
  c.fillStyle = '#d8b24a'; ell(c, 0, 0, 10, 10); c.strokeStyle = '#14663c'; c.lineWidth = 5; for (let i = 0; i < 5; i++) { const a = (i + .5) * TAU / 5; c.beginPath(); c.moveTo(Math.sin(a) * 44, -Math.cos(a) * 44); c.lineTo(Math.sin(a) * 62, -Math.cos(a) * 62); c.stroke(); }
});
const PUDDLE = mk(160, 60, c => { c.fillStyle = '#6b5a2a'; ell(c, 80, 30, 78, 28); c.fillStyle = '#8a7636'; ell(c, 66, 26, 44, 14); c.fillStyle = '#4e411e'; ell(c, 110, 36, 22, 8); });
const ICONS = {
  marchpane: mk(128, 128, c => { c.fillStyle = '#e8d8a8'; c.beginPath(); c.roundRect(18, 58, 92, 44, 8); c.fill(); c.fillStyle = '#f6efd8'; ell(c, 64, 58, 46, 16); c.fillStyle = '#d8b24a'; for (let i = 0; i < 6; i++) ell(c, 30 + i * 13.5, 58 + (i % 2) * 4 - 2, 5, 5); c.fillStyle = '#b3261e'; ell(c, 64, 46, 9, 9); c.strokeStyle = '#a58a4a'; c.lineWidth = 3; c.strokeRect(18, 80, 92, 1); }),
  bull: mk(128, 128, c => { c.save(); c.translate(64, 60); c.rotate(-.35); c.fillStyle = '#efe3c2'; c.fillRect(-46, -22, 92, 44); c.fillStyle = '#d6c79c'; ell(c, -46, 0, 9, 22); ell(c, 46, 0, 9, 22); c.strokeStyle = '#6b5a45'; c.lineWidth = 2; for (let y = -12; y <= 12; y += 8) { c.beginPath(); c.moveTo(-34, y); c.lineTo(34, y); c.stroke(); } c.restore(); c.strokeStyle = '#8c1c13'; c.lineWidth = 4; c.beginPath(); c.moveTo(70, 72); c.lineTo(84, 98); c.stroke(); c.fillStyle = '#7d7a72'; ell(c, 86, 104, 15, 15); c.fillStyle = '#5b5850'; ell(c, 86, 104, 8, 8); }),
  pot: mk(128, 128, c => { c.fillStyle = '#e9e4d6'; c.beginPath(); c.moveTo(26, 44); c.lineTo(102, 44); c.quadraticCurveTo(100, 104, 64, 106); c.quadraticCurveTo(28, 104, 26, 44); c.fill(); c.fillStyle = '#cfc8b6'; ell(c, 64, 44, 42, 10); c.fillStyle = '#6b5a2a'; ell(c, 64, 45, 34, 6); c.strokeStyle = '#e9e4d6'; c.lineWidth = 8; c.beginPath(); c.arc(106, 66, 14, -1.2, 1.4); c.stroke(); c.strokeStyle = '#2b4c9b'; c.lineWidth = 3; c.beginPath(); c.moveTo(34, 66); c.quadraticCurveTo(64, 78, 94, 66); c.stroke(); }),
  favour: mk(128, 128, c => { c.drawImage(ROSE, 14, 26, 100, 100); c.fillStyle = '#d8b24a'; c.beginPath(); c.moveTo(34, 40); c.lineTo(34, 12); c.lineTo(48, 26); c.lineTo(64, 6); c.lineTo(80, 26); c.lineTo(94, 12); c.lineTo(94, 40); c.fill(); c.fillStyle = '#b3261e'; ell(c, 64, 30, 5, 5); }),
};
const ITEMS = {
  marchpane: { name: 'Marchpane', hint: 'a sugared burst of speed' },
  bull: { name: 'Papal Bull', hint: 'hurl it at the queen ahead' },
  pot: { name: 'Chamber Pot', hint: 'empty it behind you' },
  favour: { name: 'Royal Favour', hint: 'untouchable — for now' },
};
const BULLSPR = mk(64, 64, c => c.drawImage(ICONS.bull, 0, 0, 64, 64));
const HENRY = [0, 1].map(i => { const im = new Image(); im.src = `img/henry${i}.png`; return im; });
const SKYLINE = mk(2048, 120, (c, w, h) => {
  const r = rng(77); c.fillStyle = 'rgba(96,104,112,.55)';
  for (let x = 0; x < w;) { const bw = 10 + r() * 26, bh = 8 + r() * 22; c.fillRect(x, h - bh, bw + 1, bh);
    if (r() < .5) { c.beginPath(); c.moveTo(x, h - bh); c.lineTo(x + bw / 2, h - bh - 6 - r() * 8); c.lineTo(x + bw, h - bh); c.fill(); }
    if (r() < .13) { const th = 40 + r() * 55; c.fillRect(x + bw / 2 - 4, h - th, 8, th); c.beginPath(); c.moveTo(x + bw / 2 - 5, h - th); c.lineTo(x + bw / 2, h - th - 18 - r() * 20); c.lineTo(x + bw / 2 + 5, h - th); c.fill(); }
    x += bw; }
});

/* ======================= scenery ======================= */
const scenery = [];        // {x,y,img,w,h,label,flip}
const solids = [];         // {x,y,r}
const gates = [];
function addLandmark(x, y, img, w, h, label, solidR) { x *= K; y *= K; scenery.push({ x, y, img, w, h, label, big: true }); if (solidR) solids.push({ x, y, r: solidR }); }
const CONDUIT = mk(120, 150, c => {
  const st = '#d3cbb6', dk = '#8f887a';
  c.fillStyle = st; c.fillRect(10, 40, 100, 110); c.fillStyle = dk; for (let x = 10; x < 110; x += 20) c.fillRect(x, 28, 12, 14);
  c.fillStyle = st; c.fillRect(44, 6, 32, 30); c.fillStyle = '#6d7379'; c.beginPath(); c.moveTo(40, 8); c.lineTo(60, -6); c.lineTo(80, 8); c.fill();
  c.fillStyle = '#3a3f45'; c.beginPath(); c.moveTo(44, 150); c.lineTo(44, 100); c.quadraticCurveTo(60, 76, 76, 100); c.lineTo(76, 150); c.fill();
  c.fillStyle = '#5f8fa8'; c.fillRect(20, 112, 12, 6); c.fillRect(88, 112, 12, 6); c.strokeStyle = dk; c.lineWidth = 2; c.strokeRect(10, 40, 100, 110);
});
for (const m of T.landmarks) {
  const i = nearestIdx(m.x, m.y), tx = P[i][0] / K, ty = P[i][1] / K;
  if (m.kind === 'stpauls') addLandmark(m.x, m.y, STPAULS, 230, 285, m.label);
  else if (m.kind === 'tower') addLandmark(m.x, m.y, TOWER, 330, 237, m.label);
  else if (m.kind === 'cross') addLandmark(m.x, m.y, CROSS, 20, 55, m.label);
  else if (m.kind === 'church') addLandmark(m.x, m.y, CHURCH, 44, 85, m.label);
  else if (m.kind === 'midcross') addLandmark(tx, ty, CROSS, 16, 44, m.label, 6);      // stands in the roadway
  else if (m.kind === 'mid') addLandmark(tx, ty, CONDUIT, 15, 19, m.label, 6);
  else if (m.kind === 'gate') { gates.push(i); scenery.push({ x: P[i][0], y: P[i][1], img: GATE, w: (HW + 3) * 2 / .5875, h: (HW + 3) * 2 / .5875 * 250 / 320, label: m.label, gate: true }); }
}
const START_HENRY = { x: 0, y: 0, img: null, w: 15, h: 20, label: 'Henry VIII', henry: true };
{ const [x, y] = trackPos(4, -(HW + 9)); START_HENRY.x = x; START_HENRY.y = y; scenery.push(START_HENRY); }
{
  const r = rng(1547);
  const urban = i => T.zone[i] === 1;
  const free = (x, y, clear) => { for (let j = 0; j < N; j += 3) if ((P[j][0] - x) ** 2 + (P[j][1] - y) ** 2 < clear * clear) return false; return true; };
  for (let i = 0; i < N; i += 6) {
    if (gates.some(g => Math.min(mod(i - g), mod(g - i)) < 4)) continue;
    for (const s of [-1, 1]) {
      const u = urban(i), east = T.zone[i] === 2;
      if (!u && !east && r() < .45) continue;
      const off = HW + (u ? 21 : 17 + r() * 14);
      const [x, y] = trackPos(i, s * off);
      if (!free(x, y, off - 3)) continue;
      if (scenery.some(o => o.big && Math.hypot(o.x - x, o.y - y) < o.w * .8 + 14)) continue;
      if (Math.hypot(START_HENRY.x - x, START_HENRY.y - y) < 26) continue;
      if (u) { if (r() < .06) scenery.push({ x, y, img: CHURCH, w: 34, h: 66 }); else scenery.push({ x, y, img: HOUSES[r() * HOUSES.length | 0], w: 34, h: 44 + r() * 12, flip: r() < .5 }); }
      else if (east && s > 0) scenery.push({ x, y, img: HOUSES[r() * HOUSES.length | 0], w: 34, h: 42, flip: r() < .5 });
      else if (r() < .7) scenery.push({ x, y, img: TREES[r() * 3 | 0], w: 26, h: 34 + r() * 10 });
      else scenery.push({ x, y, img: HEDGE, w: 34, h: 12 });
    }
  }
}
// hay bales to jump, and Tudor roses that give items
const bales = [], roses = [];
for (const [f, lats] of [[.07, [-18, -6, 6]], [.125, [0, 12, 22]], [.19, [-20, -8]], [.245, [-6, 6, 18]], [.30, [-22, -10, 14]], [.36, [-8, 4, 16]], [.40, [-18, 8, 20]], [.50, [-20, -8, 4]], [.575, [-6, 6, 18]], [.63, [8, 20]], [.69, [-22, -10, 14]], [.745, [-4, 8, 20]], [.80, [-8, 4, 16]], [.85, [-20, -8]], [.90, [-18, 8, 20]]]) {
  const i = Math.round(f * N); for (const l of lats) { const [x, y] = trackPos(i, l); bales.push({ x, y, i, lat: l }); }
}
for (const f of [.03, .095, .16, .22, .275, .33, .385, .44, .475, .53, .60, .66, .72, .775, .825, .875, .93, .975]) { const i = Math.round(f * N); for (const l of [-17, 0, 17]) { const [x, y] = trackPos(i, l); roses.push({ x, y, i, lat: l, t: 0 }); } }

/* ======================= sound ======================= */
let AC = null, muted = false;
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
function tone(f, d, type = 'square', v = .08, slide = 0) { if (muted || !AC) return; const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime; o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0005, t + d); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d); }
let noiseBuf = null;
function clop(v = .12) { if (muted || !AC) return; if (!noiseBuf) { noiseBuf = AC.createBuffer(1, 2205, 44100); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2; }
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = 700 + Math.random() * 500; f.Q.value = 3; g.gain.value = v; s.connect(f).connect(g).connect(AC.destination); s.start(); }
const sfx = {
  item: () => { tone(660, .09, 'triangle', .1); setTimeout(() => tone(990, .14, 'triangle', .1), 90); },
  boost: () => tone(300, .4, 'sawtooth', .06, 600),
  hit: () => tone(220, .35, 'sawtooth', .1, -150),
  throw: () => tone(700, .2, 'square', .05, -400),
  jump: () => tone(260, .16, 'triangle', .07, 240),
  lap: () => { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, .16, 'triangle', .1), i * 110)); },
  fanfare: () => { [523, 523, 659, 784, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, .22, 'square', .07), i * 150)); },
};

/* ======================= WebGL ground ======================= */
const glc = $('gl'), fx = $('fx'), ctx = fx.getContext('2d');
const gl = glc.getContext('webgl2', { antialias: false, alpha: false });
let prog = null, U = {}, texReady = false;
const VS = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;
const FS = `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform vec2 uRes, uCam, uDir, uMap; uniform float uF, uCamH, uHor;
out vec4 o;
void main(){
  vec2 p = gl_FragCoord.xy; float dy = (uRes.y - p.y) - uHor;
  vec3 haze = vec3(.87, .89, .86);
  if (dy <= 0.) { float t = clamp(-dy / uHor, 0., 1.); o = vec4(mix(haze, vec3(.42, .60, .80), pow(t, .65)), 1.); return; }
  float z = uF * uCamH / dy, xr = (p.x - uRes.x * .5) * z / uF;
  vec2 w = uCam + uDir * z + vec2(-uDir.y, uDir.x) * xr, uv = w / uMap;
  vec3 c = texture(uTex, uv).rgb;
  vec2 e = smoothstep(vec2(0.), vec2(.003), uv) * smoothstep(vec2(0.), vec2(.003), 1. - uv);
  c = mix(vec3(.78, .80, .62), c, e.x * e.y);
  o = vec4(mix(c, haze, smoothstep(260., 1700., z) * .92), 1.);
}`;
function initGL(img) {
  if (!gl) return false;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); gl.useProgram(prog);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  for (const n of ['uTex', 'uRes', 'uCam', 'uDir', 'uMap', 'uF', 'uCamH', 'uHor']) U[n] = gl.getUniformLocation(prog, n);
  let src = img; const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  if (img.width > max) { src = mk(max, Math.round(img.height * max / img.width), (c, w, h) => c.drawImage(img, 0, 0, w, h)); }
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src); gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const an = gl.getExtension('EXT_texture_filter_anisotropic'); if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(16, gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  texReady = true; return true;
}

/* ======================= view ======================= */
let W = 0, H = 0, F = 0, HOR = 0, DPR = 1;
const CAM_H = 25, CAM_D = 66;
const cam = { x: 0, y: 0, h: 0, cd: 1, sd: 0 };
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = Math.round(innerWidth * DPR); H = Math.round(innerHeight * DPR);
  for (const c of [glc, fx]) { c.width = W; c.height = H; }
  F = Math.max(W, H * 1.35) * .62; HOR = Math.round(H * .37);
  if (gl) gl.viewport(0, 0, W, H);
}
addEventListener('resize', resize); resize();

/* ======================= race state ======================= */
const LAPS = 2;
/* Difficulty. skill: each rival's top speed as a share of her horse's true top speed (yours is always 100%).
   behind / ahead: how rivals pace themselves when trailing you, or when leading you by more than aheadGap.
   jump: chance a rival clears each row of hay bales.
   The start grid is not part of the level: the queens always line up in the order Henry married them. */
const LEVELS = {
  easy:   { skill: [.78, .86], behind: 1,    ahead: .88, aheadGap: 120, jump: .6 },
  normal: { skill: [.85, .92], behind: 1,    ahead: .92, aheadGap: 180, jump: .8 },
  hard:   { skill: [.90, .97], behind: 1.05, ahead: .93, aheadGap: 220, jump: .95 },
};
const LEVEL_KEY = 'gallop-level-2';
let level = 'normal';
try { const v = localStorage.getItem(LEVEL_KEY); if (LEVELS[v]) level = v; } catch (e) { }
let state = 'menu', racers = [], player = null, raceT = 0, countT = 0, lastCount = 0, finishedOrder = [];
let puddles = [], bulls = [], minimap = new Image(); minimap.src = 'img/minimap.jpg';
const keys = {};
let playerQ = 0;

function newRace(qi) {
  playerQ = qi; racers = []; puddles = []; bulls = []; finishedOrder = []; raceT = 0;
  const order = QUEENS.map((_, i) => i);   // the grid is always marriage order: Aragon at the front, Parr at the back (QUEENS is listed in that order)
  order.forEach((q, slot) => {
    const i = mod(-5 - slot * 4), lat = (slot % 2 ? 1 : -1) * 11;
    const [x, y] = trackPos(i, lat);
    racers.push({ q: QUEENS[q], isPlayer: q === qi, x, y, h: Math.atan2(TY[i], TX[i]), speed: 0, idx: i, lat, lap: 0, prog: i - N,
      item: null, roul: 0, boost: 0, favour: 0, stun: 0, safe: 0, jump: 0, anim: Math.random() * 4, steer: 0, finished: false, time: 0,
      lane: lat, laneT: 0, skill: LEVELS[level].skill[0] + Math.random() * (LEVELS[level].skill[1] - LEVELS[level].skill[0]), useT: 0, rank: slot + 1 });
  });
  player = racers.find(r => r.isPlayer);
  for (const r of roses) r.t = 0;
  cam.h = player.h; state = 'countdown'; countT = 3.6; lastCount = 4;
  $('menu').style.display = 'none'; $('results').style.display = 'none'; $('hud').style.display = 'block'; $('count').style.display = 'flex';
  setItemHud(); audio();
}

function locate(r) {
  let b = r.idx, bd = 1e18;
  for (let k = -14; k <= 14; k++) { const j = mod(r.idx + k), d = (P[j][0] - r.x) ** 2 + (P[j][1] - r.y) ** 2; if (d < bd) { bd = d; b = j; } }
  const prev = r.idx; r.idx = b;
  if (prev > N - 60 && b < 60) r.lap++; else if (prev < 60 && b > N - 60) r.lap--;
  r.lat = (r.x - P[b][0]) * -TY[b] + (r.y - P[b][1]) * TX[b];
  r.prog = (r.lap - 1) * N + b;
}

function hitRacer(r, how) {
  if (r.favour > 0 || r.stun > 0 || r.safe > 0 || r.finished) return false;
  r.stun = 1.25; r.safe = 1.25 + 1.6;      // a moment's grace after every tumble, so nothing can hit you twice running r.speed *= .35; r.boost = 0;
  if (r.isPlayer) { sfx.hit(); flash(how); }
  return true;
}

function giveItem(r) {
  const back = (r.rank - 1) / 5;                                  // 0 = leading, 1 = last
  const w = { marchpane: 3, pot: 3 - back * 2, bull: 1.5 + back * 2, favour: .2 + back * 1.6 };
  let t = Math.random() * Object.values(w).reduce((a, b) => a + b, 0);
  for (const k in w) { if ((t -= w[k]) <= 0) { r.item = k; break; } }
  if (!r.item) r.item = 'marchpane';
  if (r.isPlayer) { sfx.item(); setItemHud(); }
}
function useItem(r) {
  const it = r.item; if (!it || r.stun > 0) return; r.item = null;
  if (it === 'marchpane') { r.boost = 2.2; if (r.isPlayer) sfx.boost(); }
  else if (it === 'favour') { r.favour = 6; if (r.isPlayer) sfx.fanfare(); }
  else if (it === 'pot') { const bx = r.x - Math.cos(r.h) * 14, by = r.y - Math.sin(r.h) * 14; puddles.push({ x: bx, y: by, t: 25, owner: r, arm: .4 }); if (r.isPlayer) sfx.throw(); }
  else if (it === 'bull') { bulls.push({ s: r.idx + 2, lat: clamp(r.lat, -HW + 4, HW - 4), owner: r, t: 3.2, x: r.x, y: r.y }); if (r.isPlayer) sfx.throw(); }
  if (r.isPlayer) setItemHud();
}

function updateRacer(r, dt, throttle, steer, wantJump, wantItem) {
  if (r.stun > 0) { r.stun -= dt; throttle = 0; steer = 0; wantJump = false; }
  if (r.boost > 0) r.boost -= dt; if (r.favour > 0) r.favour -= dt; if (r.safe > 0) r.safe -= dt;
  if (r.jump > 0) r.jump -= dt; else if (wantJump && r.speed > 30) { r.jump = .62; if (r.isPlayer) sfx.jump(); }
  if (wantItem) useItem(r);
  const off = Math.abs(r.lat) > HW + 1 && r.favour <= 0;
  let vmax = r.q.vmax * (r.aiMul || 1) * (r.boost > 0 ? 1.4 : 1) * (r.favour > 0 ? 1.18 : 1) * (off ? .55 : 1);
  if (throttle > 0) { if (r.speed < vmax) r.speed = Math.min(vmax, r.speed + r.q.accel * (r.boost > 0 ? 2.4 : 1) * throttle * dt); }
  else if (throttle < 0) r.speed = Math.max(-45, r.speed - 230 * dt);
  else r.speed -= Math.sign(r.speed) * Math.min(Math.abs(r.speed), 55 * dt);
  if (r.speed > vmax) r.speed -= Math.min(r.speed - vmax, (off ? 260 : 130) * dt);
  r.steer += (steer - r.steer) * Math.min(1, dt * 10);
  r.h = wrapA(r.h + r.steer * r.q.turn * clamp(Math.abs(r.speed) / 60, .55, 1) * dt);   // turns on the spot too, always the way you press
  r.x += Math.cos(r.h) * r.speed * dt; r.y += Math.sin(r.h) * r.speed * dt;
  locate(r);
  const wall = HW + 4;                                            // the house fronts
  if (Math.abs(r.lat) > wall) {
    const over = r.lat - Math.sign(r.lat) * wall, i = r.idx;
    r.x -= -TY[i] * over; r.y -= TX[i] * over; r.lat -= over;
    const tang = Math.atan2(TY[i], TX[i]), into = Math.abs(Math.sin(wrapA(r.h - tang)));   // 0 = riding along the wall, 1 = straight at it
    r.speed *= Math.max(0, 1 - (.4 + 2.2 * into) * dt);
    // the horse shies away from the wall and back toward the way the street runs (either direction)
    const along = Math.cos(wrapA(r.h - tang)) >= -.5 ? tang : tang + Math.PI;
    r.h = wrapA(r.h + wrapA(along - r.h) * Math.min(1, dt * 4));
  }
  for (const s of solids) { const dx = r.x - s.x, dy = r.y - s.y, d = Math.hypot(dx, dy); if (d < s.r + 3 && d > 0) { r.x = s.x + dx / d * (s.r + 3); r.y = s.y + dy / d * (s.r + 3); r.speed *= .5; } }
  const air = r.jump > .08 && r.jump < .56;
  if (!air && r.stun <= 0) {
    for (const b of bales) if (Math.abs(r.speed) > 45 && (b.x - r.x) ** 2 + (b.y - r.y) ** 2 < 36) { if (hitRacer(r, 'Into the hay!')) break; }
    for (const p of puddles) if (p.arm <= 0 && (p.x - r.x) ** 2 + (p.y - r.y) ** 2 < 49) { if (hitRacer(r, 'Gardyloo!')) p.t = 0; }
  }
  for (const o of roses) if (o.t <= 0 && (o.x - r.x) ** 2 + (o.y - r.y) ** 2 < 64) { o.t = 4; if (!r.item && r.roul <= 0) { r.roul = r.isPlayer ? 1 : .6; if (r.isPlayer) tone(880, .05, 'triangle', .06); } }
  if (r.roul > 0) { r.roul -= dt; if (r.roul <= 0) giveItem(r); }
  r.anim += Math.abs(r.speed) * dt * .075;
  if (!r.finished && r.lap > LAPS) { r.finished = true; r.time = raceT; finishedOrder.push(r); if (r.isPlayer) endRace(); else if (state === 'finished') resultsTable(); }
}

function aiControl(r, dt) {
  // rubber band, gently
  const gap = player.prog - r.prog, D = LEVELS[level];
  r.aiMul = r.finished ? .4 : r.skill * (gap > 60 ? D.behind : gap < -D.aheadGap ? D.ahead : 1);   // after the finish, ease to a canter
  r.laneT -= dt; if (r.laneT <= 0) { r.laneT = 2 + Math.random() * 3; r.laneTarget = (Math.random() * 2 - 1) * (HW - 9); }
  let want = r.laneTarget ?? r.lane, jump = false;
  const look = 6 + r.speed / 22;
  for (const b of bales) { const d = mod(b.i - r.idx); if (d < 14 && Math.abs(b.lat - r.lat) < 9) { if (r.baleSeen !== b.i) { r.baleSeen = b.i; r.willJump = Math.random() < D.jump; }   // decide once per row of bales
    if (d <= 4 && d > 0) jump = r.willJump; } }
  for (const p of puddles) { if (p.owner === r) continue; const d = Math.hypot(p.x - r.x, p.y - r.y); if (d < 70) { const i = nearestIdxNear(p, r.idx), pl = (p.x - P[i][0]) * -TY[i] + (p.y - P[i][1]) * TX[i]; if (Math.abs(pl - want) < 10) want = pl + (pl > 0 ? -16 : 16); } }
  for (const s of solids) { const d = Math.hypot(s.x - r.x, s.y - r.y); if (d < 110 && Math.abs(want) < 13) want = r.lat >= 0 ? 16 : -16; }
  r.lane += clamp(want - r.lane, -30 * dt, 30 * dt);
  const [tx, ty] = trackPos(r.idx + look, r.lane);
  const diff = wrapA(Math.atan2(ty - r.y, tx - r.x) - r.h);
  let cmax = 0; for (let k = 0; k < 16; k++) cmax = Math.max(cmax, CURV[mod(r.idx + k)]);
  const vt = Math.min(1e4, r.q.turn * .82 / (cmax + 1e-4));
  const throttle = r.speed > vt * 1.08 ? -1 : r.speed > vt ? 0 : 1;
  // items
  let use = false;
  if (r.item) { r.useT += dt; if (r.useT > .8) {
    if (r.item === 'marchpane') use = cmax < .004;
    else if (r.item === 'favour') use = true;
    else if (r.item === 'bull') use = racers.some(o => o !== r && !o.finished && mod(o.idx - r.idx) < 45 && mod(o.idx - r.idx) > 3 && Math.abs(o.lat - r.lat) < 9);
    else if (r.item === 'pot') use = racers.some(o => o !== r && mod(r.idx - o.idx) < 16 && mod(r.idx - o.idx) > 2) || r.useT > 9;
    if (use) r.useT = 0; } }
  updateRacer(r, dt, throttle, clamp(diff * 3.2, -1, 1), jump, use);
}
function nearestIdxNear(p, around) { let b = around, bd = 1e18; for (let k = -20; k <= 20; k++) { const j = mod(around + k), d = (P[j][0] - p.x) ** 2 + (P[j][1] - p.y) ** 2; if (d < bd) { bd = d; b = j; } } return b; }

let itemLatch = false, jumpLatch = false, clopT = 0;
let autopilot = false;   // testing aid: GALLOP.auto = true lets the computer ride for you
function update(dt) {
  if (state === 'countdown') {
    countT -= dt; const n = Math.ceil(countT - .6);
    if (n !== lastCount) { lastCount = n; if (n > 0) { $('count').textContent = n; tone(440, .15, 'square', .08); } else { $('count').textContent = 'Ride!'; tone(880, .4, 'square', .08); state = 'race'; } }
  } else if ($('count').style.display !== 'none' && (countT -= dt) < -.3) $('count').style.display = 'none';
  if (state === 'race' || state === 'finished') {
    if (state === 'race' || racers.some(r => !r.finished)) raceT += dt;   // the clock runs until the last queen is home
    for (const r of racers) {
      if (r.isPlayer && state === 'race' && !autopilot) {
        const th = (keys.ArrowUp || keys.KeyW ? 1 : 0) - (keys.ArrowDown || keys.KeyS ? 1 : 0);
        const st = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
        const it = keys.ShiftLeft || keys.ShiftRight || keys.KeyE || keys.KeyX, jp = keys.Space;
        updateRacer(r, dt, th, st, jp && !jumpLatch, it && !itemLatch); itemLatch = !!it; jumpLatch = !!jp;
      } else aiControl(r, dt);
    }
    // riders jostle
    for (let a = 0; a < racers.length; a++) for (let b = a + 1; b < racers.length; b++) {
      const A = racers[a], B = racers[b], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
      if (d < 8 && d > 0) { const p = (8 - d) / 2; A.x -= dx / d * p; A.y -= dy / d * p; B.x += dx / d * p; B.y += dy / d * p;
        if (A.favour > 0 && B.favour <= 0) hitRacer(B, 'Out of favour!'); if (B.favour > 0 && A.favour <= 0) hitRacer(A, 'Out of favour!'); }
    }
    for (const p of puddles) { p.t -= dt; p.arm -= dt; } puddles = puddles.filter(p => p.t > 0);
    for (const b of bulls) {
      b.t -= dt; b.s += 400 * dt / STEP; [b.x, b.y] = trackPos(b.s, b.lat);
      for (const r of racers) if (r !== b.owner && (r.x - b.x) ** 2 + (r.y - b.y) ** 2 < 70 && !(r.jump > .08 && r.jump < .56)) { if (hitRacer(r, 'Excommunicated!')) { if (b.owner.isPlayer) { flash('A hit!'); tone(520, .2, 'triangle', .1); } } b.t = 0; break; }
    }
    bulls = bulls.filter(b => b.t > 0);
    for (const o of roses) if (o.t > 0) o.t -= dt;
    const sorted = [...racers].sort((a, b) => (b.finished - a.finished) || (a.finished ? a.time - b.time : b.prog - a.prog));
    sorted.forEach((r, i) => r.rank = i + 1);
    clopT -= dt * Math.abs(player.speed) / 30; if (clopT <= 0 && Math.abs(player.speed) > 8 && player.jump <= 0) { clopT = 1; clop(.1); setTimeout(() => clop(.07), 60); }
  }
  // camera
  const ta = player ? player.h : 0;
  cam.h = wrapA(cam.h + wrapA(ta - cam.h) * Math.min(1, dt * 7));
  cam.cd = Math.cos(cam.h); cam.sd = Math.sin(cam.h);
  if (player) { cam.x = player.x - cam.cd * CAM_D; cam.y = player.y - cam.sd * CAM_D; }
}

/* ======================= drawing ======================= */
const draws = [];
function push(x, y, img, w, h, o = {}) {
  const dx = x - cam.x, dy = y - cam.y, z = dx * cam.cd + dy * cam.sd;
  if (z < 7 || z > 1500) return;
  const xr = -dx * cam.sd + dy * cam.cd, s = F / z, sx = W / 2 + xr * s;
  if (sx + w * s < -40 || sx - w * s > W + 40) return;
  draws.push({ z, sx, gy: HOR + CAM_H * s, s, img, w, h, o });
}
function render(now) {
  ctx.clearRect(0, 0, W, H);
  if (gl && texReady) {
    gl.uniform2f(U.uRes, W, H); gl.uniform2f(U.uCam, cam.x, cam.y); gl.uniform2f(U.uDir, cam.cd, cam.sd); gl.uniform2f(U.uMap, T.mapW * K, T.mapH * K);
    gl.uniform1f(U.uF, F); gl.uniform1f(U.uCamH, CAM_H); gl.uniform1f(U.uHor, HOR);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  if (state === 'menu') return;
  // distant skyline
  const sw = F * TAU, sh = sw * 120 / 2048 * 1.0, ox = -((cam.h / TAU) % 1 + 1) % 1 * sw;
  for (let x = ox - sw; x < W; x += sw) if (x + sw > 0) ctx.drawImage(SKYLINE, x, HOR - sh + 1, sw, sh);

  draws.length = 0;
  START_HENRY.img = HENRY[(now / 350 | 0) % 2];
  for (const o of scenery) push(o.x, o.y, o.img, o.w, o.h, o);
  for (const b of bales) push(b.x, b.y, BALE, 11, 6.5);
  for (const p of puddles) push(p.x, p.y, PUDDLE, 14, 0, { flat: true });
  for (const o of roses) if (o.t <= 0) push(o.x, o.y, ROSE, 9, 9, { lift: 4 + Math.sin(now / 300 + o.i) * 1.2 });
  for (const b of bulls) push(b.x, b.y, BULLSPR, 8, 8, { lift: 5, spin: now / 60 });
  for (const r of racers) push(r.x, r.y, null, 13, 16, { racer: r });
  draws.sort((a, b) => b.z - a.z);

  for (const d of draws) {
    const o = d.o, s = d.s; let w = d.w * s, h = d.h * s;
    ctx.globalAlpha = clamp((1500 - d.z) / 500, 0, 1);
    if (o.racer) { drawRacer(d, o.racer, now); continue; }
    if (!d.img || (d.img instanceof HTMLImageElement && !d.img.complete)) continue;
    if (o.flat) { ctx.drawImage(d.img, d.sx - w / 2, d.gy - w * .16, w, w * .32); continue; }
    // things between the camera and the player go see-through so they never hide her
    if (!o.gate && d.z < CAM_D + 12 && Math.abs(d.sx - W / 2) < w / 2 + 120 * DPR) ctx.globalAlpha *= .3;
    if (o.gate && d.z < 26) ctx.globalAlpha *= clamp((d.z - 8) / 18, 0, 1);
    const y = d.gy - h - (o.lift || 0) * s;
    if (o.spin !== undefined) { ctx.save(); ctx.translate(d.sx, y + h / 2); ctx.rotate(o.spin); ctx.drawImage(d.img, -w / 2, -h / 2, w, h); ctx.restore(); }
    else if (o.flip) { ctx.save(); ctx.translate(d.sx, 0); ctx.scale(-1, 1); ctx.drawImage(d.img, -w / 2, y, w, h); ctx.restore(); }
    else ctx.drawImage(d.img, d.sx - w / 2, y, w, h);
    if (o.label && d.z < 520 && d.z > 30) plate(o.label, d.sx, Math.max(26 * DPR, y - 10 * DPR), clamp((520 - d.z) / 120, 0, 1));
  }
  ctx.globalAlpha = 1;
  drawMinimap();
}
function plate(text, x, y, a) {
  ctx.save(); ctx.globalAlpha = a; ctx.font = `${Math.round(15 * DPR)}px "Hoefler Text", Baskerville, Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText(text).width + 16 * DPR, th = 22 * DPR;
  ctx.fillStyle = 'rgba(239,227,194,.93)'; ctx.fillRect(x - tw / 2, y - th / 2, tw, th); ctx.strokeStyle = '#2b1d12'; ctx.lineWidth = DPR; ctx.strokeRect(x - tw / 2, y - th / 2, tw, th);
  ctx.fillStyle = '#2b1d12'; ctx.fillText(text, x, y + DPR); ctx.restore();
}
function drawRacer(d, r, now) {
  const s = d.s, q = r.q, rel = wrapA(r.h - cam.h), frame = (r.anim | 0) % 4;
  const jh = r.jump > 0 ? Math.sin((1 - r.jump / .62) * Math.PI) * 8 : 0;
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * .28; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(d.sx, d.gy, 6.5 * s * (1 - jh / 30), 1.6 * s, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = a0;
  const side = Math.abs(rel) > .8 && Math.abs(rel) < 2.5;
  const img = side ? q.side[frame] : q.rear[frame];
  const h = 16 * s, w = h * img.width / img.height, y = d.gy - h - jh * s;
  ctx.save(); ctx.translate(d.sx, y + h);
  if (r.stun > 0) ctx.rotate(Math.sin(r.stun * 16) * .35); else if (!side) ctx.rotate(r.steer * .1);
  if (side && rel < 0) ctx.scale(-1, 1);
  if (r.favour > 0) { ctx.shadowColor = '#ffd75a'; ctx.shadowBlur = 26 * DPR; }
  ctx.drawImage(img, -w / 2, -h, w, h);
  if (r.boost > 0) { ctx.globalAlpha = a0 * .5; ctx.fillStyle = '#fff6d0'; for (let i = 0; i < 3; i++) ctx.fillRect(-w * .3 + i * w * .3 - 1.5 * DPR, 2 * DPR, 3 * DPR, h * (.25 + ((now / 40 + i * 7) % 5) / 10)); }
  ctx.restore(); ctx.globalAlpha = a0;
  // portrait roundel
  const R = clamp(3.6 * s, 9 * DPR, 44 * DPR), cy = y - R - 2 * s;
  if (q.face.complete && d.z < 700) {
    ctx.save(); ctx.beginPath(); ctx.arc(d.sx, cy, R, 0, TAU); ctx.clip(); ctx.drawImage(q.face, d.sx - R, cy - R, R * 2, R * 2); ctx.restore();
    ctx.lineWidth = Math.max(2, R * .14); ctx.strokeStyle = r.isPlayer ? '#f3d36b' : q.gown; ctx.beginPath(); ctx.arc(d.sx, cy, R, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = '#1b140e'; ctx.beginPath(); ctx.arc(d.sx, cy, R + ctx.lineWidth + R * .07, 0, TAU); ctx.stroke();
  }
}
const MM = { x0: 1e9, y0: 1e9, x1: 0, y1: 0 };      // minimap window: the circuit plus a margin, in map pixels
for (const p of T.pts) { MM.x0 = Math.min(MM.x0, p[0] - 320); MM.x1 = Math.max(MM.x1, p[0] + 320); MM.y0 = Math.min(MM.y0, p[1] - 260); MM.y1 = Math.max(MM.y1, p[1] + 260); }
function drawMinimap() {
  if (!minimap.complete) return;
  const w = Math.min(380 * DPR, W * .34), h = w * (MM.y1 - MM.y0) / (MM.x1 - MM.x0), x = W - w - 14 * DPR, y = H - h - 14 * DPR, k = minimap.width / T.mapW;
  ctx.fillStyle = '#2b1d12'; ctx.fillRect(x - 3 * DPR, y - 3 * DPR, w + 6 * DPR, h + 6 * DPR);
  ctx.drawImage(minimap, MM.x0 * k, MM.y0 * k, (MM.x1 - MM.x0) * k, (MM.y1 - MM.y0) * k, x, y, w, h);
  const sc = w / (MM.x1 - MM.x0);
  for (const r of [...racers].sort((a, b) => a.isPlayer - b.isPlayer)) {
    const px = x + (r.x / K - MM.x0) * sc, py = y + (r.y / K - MM.y0) * sc, R = (r.isPlayer ? 6 : 4.5) * DPR;
    ctx.fillStyle = r.q.gown; ctx.strokeStyle = r.isPlayer ? '#fff' : '#1b140e'; ctx.lineWidth = (r.isPlayer ? 2.5 : 1.5) * DPR;
    ctx.beginPath(); ctx.arc(px, py, R, 0, TAU); ctx.fill(); ctx.stroke();
  }
}

/* ======================= HUD ======================= */
const ORD = ['st', 'nd', 'rd', 'th', 'th', 'th'];
const fmt = t => `${t / 60 | 0}:${(t % 60).toFixed(2).padStart(5, '0')}`;
let hudT = 0, msgTimer = 0;
function flash(text) { const m = $('msg'); m.textContent = text; m.style.opacity = 1; clearTimeout(msgTimer); msgTimer = setTimeout(() => m.style.opacity = 0, 1300); }
function setItemHud() {
  const c = $('itemicon').getContext('2d'); c.clearRect(0, 0, 128, 128);
  if (player && player.item) { c.drawImage(ICONS[player.item], 0, 0); $('itemname').innerHTML = `<b>${ITEMS[player.item].name}</b><br>${ITEMS[player.item].hint}`; }
  else $('itemname').textContent = 'no item';
}
function hud(dt) {
  if (!player) return;
  if (player.roul > 0) { const c = $('itemicon').getContext('2d'), ks = Object.keys(ICONS); c.clearRect(0, 0, 128, 128); c.drawImage(ICONS[ks[(performance.now() / 80 | 0) % 4]], 0, 0); $('itemname').textContent = '…'; }
  hudT -= dt; if (hudT > 0) return; hudT = .12;
  $('pos').innerHTML = `${player.rank}<sup>${ORD[player.rank - 1]}</sup>`;
  $('street').textContent = STREET_AT[player.idx];
  $('lapline').textContent = `Lap ${clamp(player.lap, 1, LAPS)} of ${LAPS} · ${fmt(player.finished ? player.time : raceT)}`;
  $('standings').innerHTML = [...racers].sort((a, b) => a.rank - b.rank).map(r => `<div class="${r.isPlayer ? 'me' : ''}"><img src="img/face-${r.q.id}.jpg" alt="">${r.rank}. ${r.q.short}</div>`).join('');
}
let lastLap = 0;
function lapWatch() { if (player && state === 'race' && player.lap !== lastLap) { if (player.lap > lastLap && player.lap > 1 && player.lap <= LAPS) { sfx.lap(); flash(player.lap === LAPS ? 'Final lap!' : `Lap ${player.lap}`); } lastLap = player.lap; } }

// The results table: redrawn each time another queen crosses the line, so the times fill in as they finish.
function resultsTable() {
  const order = [...racers].sort((a, b) => (b.finished - a.finished) || (a.finished ? a.time - b.time : b.prog - a.prog));
  $('rtable').innerHTML = order.map((r, i) => `<tr class="${r.isPlayer ? 'me' : ''}"><td>${i + 1}</td><td><img src="img/face-${r.q.id}.jpg" alt=""> ${r.q.name}</td><td>${r.finished ? fmt(r.time) : '<i>still riding…</i>'}</td></tr>`).join('');
}
function endRace() {
  state = 'finished'; sfx.fanfare();
  const order = [...racers].sort((a, b) => (b.finished - a.finished) || (a.finished ? a.time - b.time : b.prog - a.prog));
  const place = order.indexOf(player) + 1;
  $('rtitle').textContent = place === 1 ? `${player.q.name} wins!` : `${player.q.name} finishes ${place}${ORD[place - 1]}`;
  $('rsub').textContent = place === 1 ? 'First past Charing Cross — and, for the moment, first in the King’s favour.' : place <= 3 ? 'A creditable ride. The court takes note.' : 'The King is not amused.';
  resultsTable();
  setTimeout(() => { if (state === 'finished') $('results').style.display = 'flex'; }, 1400);
}
function toMenu() { state = 'menu'; player = null; racers = []; lastLap = 0; $('menu').style.display = 'block'; $('hud').style.display = 'none'; $('results').style.display = 'none'; $('count').style.display = 'none'; }

/* ======================= menu ======================= */
let sel = 0;
function buildMenu() {
  $('cards').innerHTML = QUEENS.map((q, i) => `<button class="card panel" data-i="${i}">
    <img src="img/portrait-${q.id}.jpg" alt="Portrait of ${q.name}">
    <h2>${q.name}</h2><div class="dates">${q.dates}</div><div class="motto">${q.motto}</div>
    ${[['Speed', q.spd], ['Spur', q.acc], ['Handling', q.han]].map(([n, v]) => `<div class="stat"><span>${n}</span><span class="bar"><i style="width:${v * 20}%"></i></span></div>`).join('')}
    <div class="note">${q.note}</div></button>`).join('');
  document.querySelectorAll('.card').forEach(c => c.addEventListener('click', () => start(+c.dataset.i)));
  markSel();
}
function setLevel(v) { level = v; try { localStorage.setItem(LEVEL_KEY, v); } catch (e) { } document.querySelectorAll('#levels button').forEach(b => b.classList.toggle('on', b.dataset.level === v)); }
document.querySelectorAll('#levels button').forEach(b => b.addEventListener('click', () => setLevel(b.dataset.level)));
setLevel(level);
function markSel() { document.querySelectorAll('.card').forEach((c, i) => c.classList.toggle('sel', i === sel)); }
function start(i) { sel = i; lastLap = 0; newRace(i); }
$('again').onclick = () => start(playerQ); $('tomenu').onclick = toMenu;

addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  keys[e.code] = true;
  if (e.code === 'KeyM') { muted = !muted; flash(muted ? 'Sound off' : 'Sound on'); }
  if (state === 'menu') {
    if (e.code === 'ArrowRight') { sel = (sel + 1) % 6; markSel(); } if (e.code === 'ArrowLeft') { sel = (sel + 5) % 6; markSel(); }
    if (e.code === 'Enter') start(sel);
    const lv = { Digit1: 'easy', Digit2: 'normal', Digit3: 'hard' }[e.code]; if (lv) setLevel(lv);
  } else if (e.code === 'Escape') toMenu();
  else if (state === 'finished' && e.code === 'Enter' && $('results').style.display === 'flex') start(playerQ);
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

/* ======================= main loop ======================= */
let last = 0, menuSpin = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
  if (state === 'menu') {            // slow fly-over behind the menu
    menuSpin = (menuSpin + dt * 9) % N; const i = menuSpin | 0; cam.x = P[i][0]; cam.y = P[i][1]; cam.h = Math.atan2(TY[i], TX[i]); cam.cd = Math.cos(cam.h); cam.sd = Math.sin(cam.h);
  } else { update(dt); lapWatch(); hud(dt); }
  render(now);
  requestAnimationFrame(frame);
}
buildMenu();
$('loading').style.display = 'flex';
const ground = new Image();
ground.onload = () => { try { if (!initGL(ground)) throw new Error('WebGL2 is not available in this browser.'); $('loading').style.display = 'none'; requestAnimationFrame(frame); } catch (err) { $('loading').textContent = 'Could not start: ' + err.message; } };
ground.onerror = () => { $('loading').textContent = 'Could not load img/ground.jpg — run tools/build_assets.py, and open the game with “Play Game.command”.'; };
// the full-size map needs a graphics card that takes 12588-pixel textures; otherwise use the 8192 one
const bigOK = gl && gl.getParameter(gl.MAX_TEXTURE_SIZE) >= 12588 && !/[?&]small\b/.test(location.search);
ground.src = bigOK ? 'img/ground-hi.jpg' : 'img/ground.jpg';

// small hooks for testing from the console
window.GALLOP = { get state() { return state; }, get player() { return player; }, get racers() { return racers; }, get level() { return level; }, setLevel, bales, set auto(v) { autopilot = v; }, cam, start, keys, QUEENS };
})();
