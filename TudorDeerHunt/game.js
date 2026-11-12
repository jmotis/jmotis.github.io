/* Darest Thou Hunt with Henry VIII? — Henry VIII, a crossbow, and ten deer per round.
   Scene art is drawn in code on a 480x270 pixel buffer; Henry uses the PNG sprites. */
(() => {
'use strict';

// ---------------------------------------------------------------- setup
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const K = 2;                 // device pixels per design pixel
const W = 960, H = 540;      // design size
const LW = 480, LH = 270;    // low-res scene buffer
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const loC = mk(LW, LH), lo = loC.getContext('2d');
lo.imageSmoothingEnabled = false;
const ovC = mk(LW, LH), ov = ovC.getContext('2d');   // foreground layer: particles + platform
ov.imageSmoothingEnabled = false;

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

const FONT_H = "'Luminari','Trattatello','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif";
const FONT_B = "Georgia,'Times New Roman',serif";

// ---------------------------------------------------------------- images
const HENRY_META = {
  cheer0: { w: 218, h: 300, ax: 110 }, cheer1: { w: 330, h: 331, ax: 224 },
  feast0: { w: 185, h: 300, ax: 104 }, feast1: { w: 190, h: 300, ax: 110 }, feast2: { w: 189, h: 300, ax: 108 },
  shoot0: { w: 216, h: 300, ax: 106 }, shoot1: { w: 220, h: 299, ax: 100 }, shoot2: { w: 228, h: 297, ax: 116 },
  sulk0: { w: 200, h: 300, ax: 106 },
};
const IMG = {};
let pending = 0;
function loadImg(name) {
  const im = new Image(); pending++;
  im.onload = () => { im.ok = true; pending--; };
  im.onerror = () => { pending--; };
  im.src = 'sprites/' + name + '.png?v=13';
  IMG[name] = im;
}
const LADY_META = {   // 0,1 running  2 falling to her knees  3 weeping
  lady0: { w: 211, h: 300, ax: 105 }, lady1: { w: 198, h: 302, ax: 99 }, lady2: { w: 244, h: 195, ax: 122 }, lady3: { w: 211, h: 197, ax: 105 },
};
const LADY_H = 114;      // her standing height in design pixels at lane scale 1
Object.keys(HENRY_META).forEach(loadImg);
const SERV_META = {   // 0 standing  1 stepping forward  2 blowing the horn
  serv0: { w: 112, h: 300, ax: 62 }, serv1: { w: 138, h: 300, ax: 70 }, serv2: { w: 208, h: 312, ax: 63 },
  serv3: { w: 145, h: 338, ax: 82 },   // both hands in the air
  // servant 2 (slashed doublet, red hose): 0 trumpet, 1-3 arms folded, 4-5 fists raised
  sb0: { w: 126, h: 296, ax: 60 }, sb1: { w: 137, h: 300, ax: 68 }, sb2: { w: 138, h: 296, ax: 69 }, sb3: { w: 146, h: 294, ax: 73 }, sb4: { w: 167, h: 313, ax: 95 }, sb5: { w: 141, h: 313, ax: 79 },
  // servant 3 (yellow sleeves, striped breeches): 0-1 standing, 2 horn, 3-4 hands up
  sc0: { w: 131, h: 300, ax: 76 }, sc1: { w: 127, h: 300, ax: 72 }, sc2: { w: 145, h: 293, ax: 62 }, sc3: { w: 179, h: 310, ax: 119 }, sc4: { w: 142, h: 309, ax: 79 },
  // servant 4 (young, plain red tunic, black hose): 0-1 standing, 2 horn, 3-4 hands up
  sd0: { w: 112, h: 300, ax: 60 }, sd1: { w: 112, h: 300, ax: 60 }, sd2: { w: 160, h: 296, ax: 59 }, sd3: { w: 126, h: 347, ax: 66 }, sd4: { w: 122, h: 344, ax: 62 },
};
const SERV_H = 110;     // a servant's height in design pixels at lane scale 1
// two servants per side (lo coords for the left side; mirrored on the right). They stand nearer than every deer lane.
const SERV_POS = [[48, 190], [21, 237]];
Object.keys(LADY_META).forEach(loadImg);
// Four different men. CAST[side][spot]: side 0 = left, 1 = right; spot 0 = further up the field (he blows the horn), 1 = nearest.
const SERVANTS = {
  one:   { idle: 'serv0', horn: 'serv2', wave: ['serv3', 'serv1'] },
  two:   { idle: 'sb1',   horn: 'sb0',   wave: ['sb4', 'sb5'] },
  three: { idle: 'sc0',   horn: 'sc2',   wave: ['sc3', 'sc4'] },
  four:  { idle: 'sd0',   horn: 'sd2',   wave: ['sd3', 'sd4'] },
};
const CAST = [['one', 'two'], ['four', 'three']];
Object.keys(SERV_META).forEach(loadImg);
loadImg('sky');
loadImg('treeline'); loadImg('castle'); loadImg('platform'); loadImg('standard'); loadImg('bush');
// deer sheets: frames 0-2 gallop, 3 collapsing, 4 lying still. ay = distance from the frame top to the ground line.
const DEER_META = {
  doe0: { w: 215, h: 153, ax: 107, ay: 160 }, doe1: { w: 190, h: 160, ax: 95, ay: 161 }, doe2: { w: 187, h: 160, ax: 93, ay: 160 }, doe3: { w: 233, h: 83, ax: 116, ay: 83 }, doe4: { w: 235, h: 55, ax: 117, ay: 55 },
  stag0: { w: 244, h: 195, ax: 122, ay: 202 }, stag1: { w: 200, h: 203, ax: 100, ay: 203 }, stag2: { w: 237, h: 202, ax: 118, ay: 202 }, stag3: { w: 278, h: 111, ax: 139, ay: 111 }, stag4: { w: 303, h: 72, ax: 151, ay: 72 },
  pet0: { w: 221, h: 167, ax: 110, ay: 167 }, pet1: { w: 202, h: 166, ax: 101, ay: 166 }, pet2: { w: 177, h: 166, ax: 88, ay: 166 }, pet3: { w: 228, h: 77, ax: 114, ay: 77 }, pet4: { w: 233, h: 56, ax: 116, ay: 56 },
};
const DEER_KEY = { ordinary: 'doe', stag: 'stag', pet: 'pet' };
const DEER_SC = 0.5;    // design pixels per sprite pixel at lane scale 1
Object.keys(DEER_META).forEach(loadImg);
// two hounds: 'doga' white-and-tan (3 gallop frames), 'dogb' dark brown (4 frames)
const HOUND_META = {
  doga0: { w: 136, h: 86, ax: 68, ay: 86 }, doga1: { w: 144, h: 84, ax: 72, ay: 86 }, doga2: { w: 150, h: 86, ax: 75, ay: 86 },
  dogb0: { w: 138, h: 68, ax: 69, ay: 70 }, dogb1: { w: 143, h: 70, ax: 71, ay: 70 }, dogb2: { w: 150, h: 70, ax: 75, ay: 70 }, dogb3: { w: 150, h: 70, ax: 75, ay: 70 },
};
const HOUND_FRAMES = { doga: 3, dogb: 4 };
Object.keys(HOUND_META).forEach(loadImg);

// ---------------------------------------------------------------- pixel-art helpers
function crisp(c) {
  const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 3; i < p.length; i += 4) p[i] = p[i] >= 110 ? 255 : 0;
  g.putImageData(d, 0, 0);
}
function disc(g, cx, cy, r, col) {
  g.fillStyle = col; cx = Math.round(cx); cy = Math.round(cy);
  for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y)); g.fillRect(cx - w, cy + y, 2 * w + 1, 1); }
}
function limb(g, x, y, ang, len, w, col) {
  const x2 = x + Math.sin(ang) * len, y2 = y + Math.cos(ang) * len;
  g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
  return [x2, y2];
}
function ell(g, x, y, rx, ry, col, rot = 0) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill(); }
function poly(g, pts, col) { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); }

// ---------------------------------------------------------------- background
let bgC = null, bgAlt = [];   // bgAlt[0] uses the painted tree line, bgAlt[1] the code-drawn one (T toggles)
function buildBG(useTreeImg) {
  const bgC = mk(LW, LH); const g = bgC.getContext('2d'); const R = rng(1509);
  g.imageSmoothingEnabled = false;
  if (IMG.sky.ok) g.drawImage(IMG.sky, 0, 0, 480, 190, 0, 0, 480, 130);
  else { const s = g.createLinearGradient(0, 0, 0, 130); s.addColorStop(0, '#50617c'); s.addColorStop(1, '#8a97a8'); g.fillStyle = s; g.fillRect(0, 0, LW, 130); }
  const glow = g.createLinearGradient(0, 40, 0, 128);
  glow.addColorStop(0, 'rgba(255,226,170,0)'); glow.addColorStop(1, 'rgba(255,226,170,0.62)');
  g.fillStyle = glow; g.fillRect(0, 40, LW, 90);
  // far hills
  const hill = (base, amp, col, ph) => { g.fillStyle = col; for (let x = 0; x < LW; x++) { const y = base - amp * (Math.sin(x / 61 + ph) + 0.5 * Math.sin(x / 23 + ph * 2)); g.fillRect(x, Math.round(y), 1, 140 - Math.round(y)); } };
  hill(104, 7, '#7d98a0', 1.3); hill(110, 6, '#6a8b78', 4.1);
  if (useTreeImg && IMG.castle.ok) g.drawImage(IMG.castle, 300, 23);     // Greenwich, rising above the trees
  else {
  // a distant palace
  const px = 338, py = 101, brick = '#9a5846', brickD = '#7c4336';
  g.fillStyle = brick; g.fillRect(px, py - 9, 34, 12);
  g.fillStyle = brickD; g.fillRect(px - 3, py - 15, 6, 18); g.fillRect(px + 31, py - 15, 6, 18); g.fillRect(px + 13, py - 14, 8, 17);
  g.fillStyle = '#d9d2c0'; for (let i = 0; i < 3; i++) { g.fillRect(px - 3 + i * 2 + (i ? 1 : 0), py - 17, 1, 2); g.fillRect(px + 31 + i * 2 + (i ? 1 : 0), py - 17, 1, 2); }
  g.fillStyle = '#2b1f1a'; g.fillRect(px + 16, py - 4, 2, 7);
  g.fillStyle = '#f3d98a'; for (let i = 0; i < 5; i++) g.fillRect(px + 5 + i * 6, py - 6, 1, 2);
  g.fillStyle = '#c8202a'; g.fillRect(px + 17, py - 20, 4, 2); g.fillStyle = '#3a2a22'; g.fillRect(px + 16, py - 20, 1, 6);
  }
  // treeline
  const greens = ['#2c5a33', '#34683a', '#27502d', '#3b7140'];
  if (useTreeImg && IMG.treeline.ok) {
    const im = IMG.treeline, tw = im.width, th = im.height, ty = 121 - th;
    for (let n = 0, x = -12; x < LW; n++, x += tw) {            // tiled, every other copy mirrored
      if (n % 2) { g.save(); g.translate(x + tw, ty); g.scale(-1, 1); g.drawImage(im, 0, 0); g.restore(); }
      else g.drawImage(im, x, ty);
    }
  } else
  for (let x = -8; x < LW + 8; x += 5 + Math.floor(R() * 5)) {
    const r = 7 + Math.floor(R() * 7), y = 113 + Math.floor(R() * 7) - r / 3;
    disc(g, x, y, r, greens[Math.floor(R() * 4)]);
    disc(g, x - 2, y - 3, Math.max(2, r - 5), '#4a8348');
  }
  // field
  for (let y = 118; y < LH; y++) {
    const t = (y - 118) / (LH - 118);
    const c1 = [134, 170, 86], c2 = [70, 122, 50];
    const band = Math.floor(t * 9) / 9;
    g.fillStyle = `rgb(${Math.round(lerp(c1[0], c2[0], band))},${Math.round(lerp(c1[1], c2[1], band))},${Math.round(lerp(c1[2], c2[2], band))})`;
    g.fillRect(0, y, LW, 1);
  }
  for (let i = 0; i < 1100; i++) {
    const x = Math.floor(R() * LW), y = 120 + Math.floor(R() * R() * 150 + R() * 20);
    g.fillStyle = R() < 0.5 ? 'rgba(40,80,30,0.55)' : 'rgba(190,215,120,0.5)';
    g.fillRect(x, y, 1 + Math.floor(R() * 2), 1);
  }
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(R() * LW), y = 135 + Math.floor(R() * 130);
    g.fillStyle = ['#fff6d8', '#ffd84a', '#f2a7c0'][Math.floor(R() * 3)]; g.fillRect(x, y, 1, 1);
  }
  // great oaks and thickets at both edges, where the beaters wait
  if (useTreeImg) {
    // no side trees with the painted tree line (removed for now)
  } else for (const side of [0, 1]) {
    const fx = x => side ? LW - x : x;
    g.fillStyle = '#5a3d24'; g.fillRect(fx(side ? 16 : 8), 96, 9, 104);
    g.fillStyle = '#48301c'; g.fillRect(fx(side ? 16 : 8) + (side ? 6 : 0), 96, 3, 104);
    const blobs = [[6, 84, 24], [26, 96, 17], [-2, 108, 18], [18, 72, 16], [34, 112, 10]];
    for (const [bx, by, br] of blobs) { disc(g, fx(bx), by, br, greens[Math.floor(R() * 4)]); disc(g, fx(bx) - 3, by - 4, br - 6, '#4a8348'); }
    const bushes = [[4, 176, 13], [20, 184, 10], [2, 222, 15], [22, 232, 11], [8, 200, 9], [36, 190, 6]];
    for (const [bx, by, br] of bushes) { disc(g, fx(bx), by, br, greens[Math.floor(R() * 4)]); disc(g, fx(bx) - 2, by - 3, Math.max(2, br - 5), '#4f8a4a'); }
  }
  return bgC;
}

// ---------------------------------------------------------------- the royal standing (platform)
const PLAT = { x0: 138, x1: 342, top: 238 };
const HENRY_X = 250, HENRY_FEET = 243;       // lo coords
function drawPlatform(g, t) {
  const { x0, x1, top } = PLAT, R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  // posts + pennants
  for (const [px, col] of [[x0 + 3, '#1f7a3c'], [x1 - 6, '#f0ece0']]) {
    R(px, 186, 3, 60, '#6b4a2a'); R(px + 2, 186, 1, 60, '#4d341c');
    const flip = Math.floor(t * 4 + px) % 2;
    const dir = px < 240 ? -1 : 1;
    for (let i = 0; i < 16; i++) {
      const yy = 187 + Math.round(Math.sin((i + (flip ? 3 : 0)) / 2.4) * 1.2);
      const hh = Math.max(1, 9 - Math.floor(i / 2));
      R(px + (dir > 0 ? 3 + i : -1 - i), yy + Math.floor((9 - hh) / 2), 1, hh, i % 6 < 3 ? col : (col === '#1f7a3c' ? '#f0ece0' : '#1f7a3c'));
    }
    R(px, 184, 3, 2, '#e7b93c');
  }
  // deck
  R(x0, top, x1 - x0, 6, '#c2955c'); R(x0, top, x1 - x0, 1, '#dcb47c');
  for (let x = x0 + 14; x < x1; x += 17) R(x, top + 1, 1, 5, '#96703f');
  R(x0 + 2, top + 6, x1 - x0 - 4, 30, '#8a6238');
  for (let x = x0 + 10; x < x1 - 4; x += 12) R(x, top + 6, 1, 30, '#6e4c2a');
  R(x0 + 2, top + 6, x1 - x0 - 4, 2, '#5c3f22');
  // hanging cloth with a Tudor rose
  const cx = 240;
  R(cx - 30, top + 4, 30, 28, '#1f7a3c'); R(cx, top + 4, 30, 28, '#f0ece0');
  R(cx - 30, top + 4, 60, 2, '#e7b93c');
  disc(g, cx, top + 18, 7, '#c8202a'); disc(g, cx, top + 18, 4, '#f6efe2'); disc(g, cx, top + 18, 1, '#e7b93c');
  // feasting table
  const tx = 156, ty = 221;
  R(tx + 3, ty + 4, 3, 14, '#5c3f22'); R(tx + 46, ty + 4, 3, 14, '#5c3f22');
  R(tx, ty, 52, 5, '#f4efe4'); R(tx, ty + 5, 52, 6, '#e0d8c6');
  for (let x = tx + 3; x < tx + 52; x += 7) R(x, ty + 9, 3, 2, '#c8202a');
  R(tx + 5, ty - 2, 18, 2, '#c9ccd4');                                        // platter
  ell(g, tx + 14, ty - 5, 7, 4, '#b5652a'); R(tx + 20, ty - 7, 4, 2, '#f0e3c8'); R(tx + 9, ty - 8, 4, 1, '#d98a45');
  R(tx + 28, ty - 8, 4, 6, '#e7b93c'); R(tx + 29, ty - 2, 2, 2, '#e7b93c'); R(tx + 27, ty - 9, 6, 1, '#f8dc7a'); // goblet
  R(tx + 36, ty - 4, 11, 4, '#c98f4a'); R(tx + 36, ty - 5, 11, 1, '#e8be7c');   // pie
  disc(g, tx + 49, ty - 2, 2, '#c8202a');
  // barrel of spare bolts
  const bx = 300, by = 220;
  R(bx, by, 16, 18, '#8a5a30'); R(bx, by + 3, 16, 2, '#4a4a52'); R(bx, by + 13, 16, 2, '#4a4a52'); R(bx + 5, by, 1, 18, '#6b4322'); R(bx + 10, by, 1, 18, '#6b4322');
  for (let i = 0; i < 4; i++) { R(bx + 3 + i * 3, by - 9 + (i % 2), 1, 10, '#6b4a2a'); R(bx + 2 + i * 3, by - 10 + (i % 2), 3, 3, i % 2 ? '#f0ece0' : '#c8202a'); }
}

// ---------------------------------------------------------------- audio (all synthesised)
const Sound = (() => {
  let ac = null, master = null, muted = false, musicTimer = null, nextNote = 0, step = 0;
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.7; master.connect(ac.destination);
    nextNote = ac.currentTime + 0.3;
    musicTimer = setInterval(schedule, 120);
  }
  function tone(o) {
    if (!ac) return;
    const t0 = ac.currentTime + (o.t || 0), d = o.d || 0.2;
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + d);
    if (o.detune) osc.detune.value = o.detune;
    if (o.vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = o.vib; lg.gain.value = o.vibDepth || 10; l.connect(lg); lg.connect(osc.frequency); l.start(t0); l.stop(t0 + d + 0.1); }
    const a = o.attack || 0.006, peak = o.g || 0.2;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + a);
    if (o.pluck) g.gain.exponentialRampToValueAtTime(0.0005, t0 + d);
    else { g.gain.setValueAtTime(peak, t0 + Math.max(a, d - (o.release || 0.05))); g.gain.linearRampToValueAtTime(0.0001, t0 + d); }
    let node = osc;
    if (o.lp || o.bp) { const f = ac.createBiquadFilter(); f.type = o.bp ? 'bandpass' : 'lowpass'; f.frequency.value = o.bp || o.lp; f.Q.value = o.q || 0.8; osc.connect(f); node = f; }
    node.connect(g); g.connect(master); osc.start(t0); osc.stop(t0 + d + 0.05);
  }
  function noise(o) {
    if (!ac) return;
    const t0 = ac.currentTime + (o.t || 0), d = o.d || 0.1;
    const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * d), ac.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = o.type || 'lowpass'; f.frequency.value = o.freq || 1000; f.Q.value = o.q || 0.7;
    const g = ac.createGain(); g.gain.setValueAtTime(o.g || 0.2, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + d);
    src.connect(f); f.connect(g); g.connect(master); src.start(t0);
  }
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  // Greensleeves (traditional), plucked like a lute. Durations are in sixths of a bar.
  const E4 = 64, Fs4 = 66, G4 = 67, Gs4 = 68, A4 = 69, B4 = 71, C5 = 72, D5 = 74, E5 = 76, Fs5 = 78, G5 = 79;
  const LINE_A = [[C5, 4], [D5, 2], [E5, 3], [Fs5, 1], [E5, 2], [D5, 4], [B4, 2], [G4, 3], [A4, 1], [B4, 2]];
  const LINE_B = [[G5, 6], [G5, 3], [Fs5, 1], [E5, 2], [D5, 4], [B4, 2], [G4, 3], [A4, 1], [B4, 2]];
  const HALF = [[C5, 4], [A4, 2], [A4, 3], [Gs4, 1], [A4, 2], [B4, 4], [Gs4, 2]];
  const CLOSE = [[C5, 3], [B4, 1], [A4, 2], [Gs4, 3], [Fs4, 1], [Gs4, 2], [A4, 6]];
  const TUNE = [...LINE_A, ...HALF, [E4, 4], [A4, 2], ...LINE_A, ...CLOSE, [A4, 6],
                ...LINE_B, ...HALF, [E4, 6], ...LINE_B, ...CLOSE, [A4, 4], [A4, 2]];
  const A2 = 45, G2 = 43, E2 = 40, C3 = 48, F2 = 41;
  const BASS = [A2, A2, G2, E2, A2, F2, E2, E2,  A2, A2, G2, E2, A2, E2, A2, A2,
                C3, C3, G2, E2, A2, F2, E2, E2,  C3, C3, G2, E2, A2, E2, A2, A2];
  const UNIT = 0.26;
  const EVENTS = [];
  { let u = 0; for (const [m, d] of TUNE) { EVENTS.push({ u, m, d }); u += d; }
    EVENTS.sort((a, b) => a.u - b.u); }
  const LOOP = BASS.length * 6;
  function schedule() {
    if (!ac) return;
    for (;;) {
      const ev = EVENTS[step % EVENTS.length];
      const when = nextNote + (Math.floor(step / EVENTS.length) * LOOP + ev.u) * UNIT;
      if (when > ac.currentTime + 0.4) break;
      const t = Math.max(0, when - ac.currentTime);
      if (ev.bass) tone({ type: 'triangle', f: hz(ev.m), t, d: 0.9, g: 0.05, pluck: true, lp: 900 });
      else { const d = Math.max(0.45, ev.d * UNIT * 1.5); tone({ type: 'triangle', f: hz(ev.m), t, d, g: 0.06, pluck: true, lp: 2600 }); tone({ type: 'square', f: hz(ev.m), t, d: 0.16, g: 0.008, pluck: true, lp: 1800 }); }
      step++;
    }
  }
  const brass = (f, t, d, g = 0.1) => { tone({ type: 'sawtooth', f, t, d, g, attack: 0.04, lp: 1150, release: 0.08, vib: 5.5, vibDepth: f * 0.006 }); tone({ type: 'sawtooth', f, t, d, g: g * 0.7, attack: 0.05, lp: 900, detune: 9, release: 0.08 }); };
  return {
    init,
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.7; return muted; },
    get muted() { return muted; },
    shot() { tone({ type: 'triangle', f: 330, f2: 70, d: 0.16, g: 0.3 }); noise({ d: 0.07, g: 0.25, type: 'highpass', freq: 2500 }); tone({ type: 'square', f: 140, f2: 60, d: 0.06, g: 0.1, lp: 800 }); },
    thunk() { noise({ t: 0.09, d: 0.09, g: 0.3, freq: 420 }); },
    hit(big) {
      noise({ t: 0.08, d: 0.12, g: 0.4, freq: 300 }); tone({ f: 120, f2: 50, t: 0.08, d: 0.15, g: 0.3 });
      const notes = big ? [72, 76, 79, 84, 88] : [76, 83];
      notes.forEach((m, i) => tone({ type: 'square', f: hz(m), t: 0.2 + i * 0.075, d: 0.12, g: 0.07, lp: 3000 }));
    },
    horn() { // the call that announces a great stag
      const G = 196, D = 293.7;
      [[G, 0, 0.2], [G, 0.26, 0.2], [D, 0.52, 0.75], [G, 1.4, 0.18], [D, 1.62, 0.95]].forEach(([f, t, d]) => brass(f, t, d, 0.13));
    },
    fanfare() { [[392, 0, 0.14], [392, 0.16, 0.14], [523, 0.32, 0.14], [659, 0.48, 0.5]].forEach(([f, t, d]) => brass(f, t, d, 0.07)); },
    cheer() { [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.28]].forEach(([f, t, d]) => brass(f, t + 0.35, d, 0.06)); },
    sulk() { tone({ type: 'sawtooth', f: 180, f2: 130, d: 0.4, g: 0.12, lp: 500 }); tone({ type: 'sawtooth', f: 135, f2: 90, t: 0.42, d: 0.6, g: 0.12, lp: 450 }); },
    bark(n = 2) { for (let i = 0; i < n; i++) { const t = i * 0.17 + Math.random() * 0.04; tone({ type: 'sawtooth', f: 520 + Math.random() * 80, f2: 250, t, d: 0.09, g: 0.12, bp: 900, q: 1.5 }); noise({ t, d: 0.07, g: 0.1, type: 'bandpass', freq: 1200 }); } },
    weep() {
      const sobs = [0, 0.36, 0.72, 1.5, 1.86, 2.22, 3.0, 3.36, 3.72];
      sobs.forEach((t, i) => { const f = 760 - (i % 3) * 90; tone({ type: 'triangle', f, f2: f * 0.68, t, d: 0.3, g: 0.14, attack: 0.03, bp: 950, q: 2, vib: 9, vibDepth: 30 }); });
      [1.15, 2.65].forEach(t => noise({ t, d: 0.22, g: 0.06, type: 'bandpass', freq: 2600, q: 3 }));
    },
    coins() { [0, 0.07, 0.15, 0.24, 0.36, 0.5].forEach((t, i) => tone({ type: 'triangle', f: 2200 + (i * 7 % 4) * 310, t, d: 0.22, g: 0.07, pluck: true })); },
    doom() { [[294, 0, 0.3], [262, 0.32, 0.3], [233, 0.64, 0.3], [147, 0.96, 1.1]].forEach(([f, t, d]) => brass(f, t, d, 0.1)); },
    over() { [[392, 0, 0.35], [349, 0.4, 0.35], [311, 0.8, 0.35], [196, 1.2, 1.2]].forEach(([f, t, d]) => brass(f, t, d, 0.1)); },
  };
})();

// ---------------------------------------------------------------- game state
const POINTS = { ordinary: 100, stag: 500 };
const G = {
  state: 'loading', t: 0, timer: 0, paused: false,
  score: 0, shown: 0, best: 0, round: 1,
  queue: [], idx: -1, results: [], bagged: 0, roundPts: 0,
  bolts: 3, deer: null, hounds: [], lady: null, stuck: [], parts: [], pops: [], flight: null,
  hornSide: 0, beaterPose: [0, 0], beaterT: [0, 0],
  banner: null, bonus: 0, passed: false,
  henry: { anim: 'feast', t: 0, face: 1 }, paintedPlat: true, paid: 0, aboutOpen: false, touch: false, rotateOpen: false, rotateSkipped: false, bigText: false, noKeys: false, edu: false, fact: null, factT: 0, orig: false, won: false,
  mouse: { x: W / 2, y: H / 2, shown: false },
};
try { G.edu = localStorage.getItem('kingsDeerHuntEdu') === '1'; } catch (e) { /* storage unavailable */ }
try { G.best = parseInt(localStorage.getItem('kingsDeerHuntBest') || '0', 10) || 0; } catch (e) { /* storage unavailable */ }

const MAX_ROUNDS = 20;     // 200 deer, then the light fades
const ROUND_GOAL = 1000;   // points that must be won within a round to hunt on
const laneScale = y => 0.72 + (y - 140) / 85 * 0.43;

// ---- compensation for her ladyship's deer
const DEER_PRICE = 90;                                   // pence: 7 shillings 6 pence
const PAY_BTN = { x: W / 2 - 140, y: 224, w: 280, h: 42 };
const money = d => { const L = Math.floor(d / 240), sh = Math.floor(d % 240 / 12), p = d % 12; return [L ? '£' + L : '', sh ? sh + 's' : '', p ? p + 'd' : ''].filter(Boolean).join(' ') || '0d'; };
const payDue = () => G.state === 'compensate' && G.lady && G.lady.state === 'weep' && G.lady.t > 1.6;
const inPayBtn = (x, y) => x >= PAY_BTN.x && x <= PAY_BTN.x + PAY_BTN.w && y >= PAY_BTN.y && y <= PAY_BTN.y + PAY_BTN.h;
function payLady() {
  const L = G.lady; G.paid += DEER_PRICE; Sound.coins();
  for (let i = 0; i < 14; i++) G.parts.push({ x: L.x + rand(-6, 6), y: L.y - 30, vx: rand(-45, 45), vy: rand(-90, -30), t: 0, life: rand(0.5, 0.9), col: i % 3 ? '#ffd84a' : '#fff3b0', g: 220 });
  L.state = 'leave'; L.t = 0; L.dir = -L.dir;
  banner('', 'Her ladyship withdraws and the hunt resumes!', 2.4, '#ffe08a');
}
// ---- education mode (E): learn a fact about Henry with every deer taken, read from facts.md
let FACTS = [], factsFromFile = false;
// Each round owns its own block of facts: round 1 shows facts 1-9, round 2 facts 10-18, and so on. Within a round the
// first deer taken shows the block's first fact, the second its second... This holds whether or not education mode was on
// earlier, so a player can leave it off for the early rounds and switch it on later to read the later facts.
const FACTS_PER_ROUND = 9;      // a round has at most nine deer that can be taken (ten, less her ladyship's pet)
const factIndex = (round, takenThisRound) => (round - 1) * FACTS_PER_ROUND + (takenThisRound - 1);
const BUILTIN_FACTS = [   // the first nine facts of facts.md; used only if that file cannot be read (e.g. the page was opened straight from disk)
  "Henry was born on June 28, 1491 in Greenwich. The castle in the background of this game is Greenwich Castle, but he was born in the nearby royal Palace of Placentia.",
  "Henry was the second son of King Henry VII of England and Queen Elizabeth of York. According to the laws of primogeniture, Elizabeth was arguably the rightful heir to the throne on the death of her father and brothers. Henry VII won the throne at the Battle of Bosworth in 1485 then married her to secure his dynasty.",
  "Henry had an older brother, Arthur, an older sister, Margaret, and a younger sister, Mary, who survived to be at least teenagers.",
  "As a small child, Henry was invested with numerous honors, including being made the Duke of York at age three.",
  "When Henry was ten years old, his older brother Arthur married a princess named Catherine of Aragon, the daughter of King Ferdinand II of Aragon and Queen Isabella I of Castile (who famously sponsored Christopher Columbus' voyages to the New World).",
  "In 1502, his older brother Arthur died at the age of 15 and Henry became heir to the throne.",
  "Henry's father died on April 22, 1509, leaving the seventeen-year-old to take the throne as Henry VIII. This was the first uncontested succession in over half a century.",
  "Henry inherited a stable kingdom and a full treasury, thanks to his father's careful (and sometimes ruthless) handling of money. Henry spent most of that money within a few years.",
  "The young Henry was over six feet tall, athletic, and considered very handsome, with reddish-gold hair. He was also stubborn and had a fierce temper.",
];
function parseFacts(md) {     // bullets under the "## Facts" heading (or every bullet, if there is no such heading)
  const m = /^##\s*facts\s*$/im.exec(md), body = m ? md.slice(m.index + m[0].length) : md;
  return body.split(/\r?\n/).map(l => /^\s*(?:[-*+]|\d+[.)])\s+(.+)$/.exec(l)).filter(Boolean)
    .map(x => x[1].replace(/\*\*|__|`/g, '').trim()).filter(Boolean);
}
// The same facts grouped under the "### ..." headings of facts.md, for the Read the history page.
function parseSections(md) {
  const m = /^##\s*facts\s*$/im.exec(md), body = m ? md.slice(m.index + m[0].length) : md;
  const out = []; let cur = null;
  for (const line of body.split(/\r?\n/)) {
    const hd = /^\s*#{3,}\s+(.+?)\s*$/.exec(line), it = /^\s*(?:[-*+]|\d+[.)])\s+(.+)$/.exec(line);
    if (hd) { cur = { title: hd[1], facts: [] }; out.push(cur); }
    else if (it) { const f = it[1].replace(/\*\*|__|`/g, '').trim(); if (!f) continue; if (!cur) { cur = { title: '', facts: [] }; out.push(cur); } cur.facts.push(f); }
  }
  return out.filter(sec => sec.facts.length);
}
FACTS = BUILTIN_FACTS;
let SECTIONS = [{ title: 'Childhood and accession, 1491–1509', facts: BUILTIN_FACTS }];
fetch('facts.md?t=' + Date.now()).then(r => r.ok ? r.text() : Promise.reject()).then(t => { const f = parseFacts(t); if (f.length) { FACTS = f; SECTIONS = parseSections(t); factsFromFile = true; } }).catch(() => {});
function renderHistory() {      // fills the Read the history page with real text: a heading and a numbered list for each period
  const body = document.getElementById('historyBody'), note = document.getElementById('historyNote'); if (!body) return;
  body.textContent = ''; let n = 1;
  for (const sec of SECTIONS) {
    if (sec.title) { const h2 = document.createElement('h2'); h2.textContent = sec.title; body.appendChild(h2); }
    const ol = document.createElement('ol'); ol.start = n;
    for (const f of sec.facts) { const li = document.createElement('li'); li.textContent = f; ol.appendChild(li); n++; }
    body.appendChild(ol);
  }
  note.hidden = factsFromFile;
  note.textContent = factsFromFile ? '' : 'Only the first nine facts are shown, because the game was opened directly from a disk. Opened from a website, or with the Play Game launcher, this page lists every fact.';
}
const tapWord = () => G.touch ? 'Tap' : 'Click or press Enter';
function toggleEdu() {
  G.edu = !G.edu;
  try { localStorage.setItem('kingsDeerHuntEdu', G.edu ? '1' : '0'); } catch (e) { /* ignore */ }
  if (G.state !== 'title' && G.state !== 'gameOver') banner('', G.edu ? 'Education mode on: learn a fact about Henry with every deer taken.' : 'Education mode off.', 2, '#cfe8ff');
}
function dismissFact() { G.fact = null; nextDeer(); }
function wrapLines(str, maxW) {
  const out = []; let line = '';
  for (const w of str.split(/\s+/)) { const t = line ? line + ' ' + w : w; if (line && ctx.measureText(t).width > maxW) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}
function drawFactPanel() {
  const f = G.fact, pw = G.bigText ? 760 : 640, lh = fs(18) + 7;
  ctx.font = `${fs(18)}px ${FONT_B}`;
  const lines = wrapLines(f.text, pw - 64), ph = 62 + lines.length * lh, px = (W - pw) / 2, py = Math.max(70, 250 - ph / 2);
  parchment(px, py, pw, ph, 12);
  lines.forEach((l, i) => plain(l, W / 2, py + 34 + i * lh, 18, '#3a2410'));
  if (G.factT > 0.6) plain(`${tapWord()} to continue the hunt`, W / 2, py + ph - 20, 14, '#7a1420', FONT_B, 'center', 'bold');
}
function setHenry(anim, face) { G.henry.anim = anim; G.henry.t = 0; if (face) G.henry.face = face; }
function banner(text, sub, dur = 2, color = '#fff3d0') { G.banner = { text, sub, t: 0, dur, color }; }
function pop(text, x, y, color = '#fff3d0', size = 26) { G.pops.push({ text, x, y, t: 0, color, size }); }

function startGame() {
  G.score = 0; G.shown = 0; G.round = 1; G.paid = 0; G.fact = null; G.won = false;
  startRound();
}
function startRound() {
  G.queue = shuffle(['ordinary', 'ordinary', 'ordinary', 'ordinary', 'ordinary', 'ordinary', 'ordinary', 'stag', 'stag', 'pet']);
  if (G.round === 1 && G.queue[0] !== 'ordinary') { const i = G.queue.indexOf('ordinary'); [G.queue[0], G.queue[i]] = [G.queue[i], G.queue[0]]; }
  G.idx = -1; G.results = new Array(10).fill(null); G.bagged = 0; G.bonus = 0; G.roundPts = 0;
  G.deer = null; G.lady = null; G.hounds = []; G.stuck = [];
  G.state = 'roundIntro'; G.timer = 2.2;
  banner(`Round ${G.round} of ${MAX_ROUNDS}`, `Win ${ROUND_GOAL} points this round to please the King`, 2.2);
  setHenry('feast'); Sound.fanfare();
}
function nextDeer() {
  G.idx++;
  if (G.idx >= 10) return endRound();
  G.deer = null; G.lady = null; G.bolts = 3;
  const type = G.queue[G.idx];
  G.pendingDir = Math.random() < 0.5 ? 1 : -1;
  G.state = 'wait';
  if (G.henry.anim !== 'feast') setHenry('feast');
  if (type === 'stag') {
    G.timer = 2.6; Sound.horn();
    const s = G.pendingDir > 0 ? 0 : 1; G.beaterPose[s] = 2; G.beaterT[s] = 2.5;
    banner('', 'Hark, the horn! A great stag is headed your way!', 2.4, '#ffe08a');
  } else G.timer = 1.1;
}
function spawnDeer() {
  const type = G.queue[G.idx], dir = G.pendingDir, r = G.round;
  const mult = { ordinary: 1, stag: 1.3, pet: 0.82 }[type];
  const y = rand(148, 210);
  G.deer = {
    type, dir, x: dir > 0 ? -45 : LW + 45, y, ty: rand(148, 210), tyT: rand(0.8, 1.6),
    speed: (88 + r * 13) * mult, turns: randInt(type === 'pet' ? 1 : 0, Math.min(3, 1 + Math.floor(r / 2))), turnX: dir > 0 ? rand(170, 400) : rand(80, 310),
    phase: Math.random(), state: 'run', st: 0, age: 0, flee: false, glint: 0,
  };
  const s = dir > 0 ? 0 : 1; G.beaterPose[s] = 1; G.beaterT[s] = 2.2;
  // two hounds, each with its own pace, gap behind the deer, line across the field and stamina
  const lead = Math.random() < 0.5 ? 0 : 1;
  for (let i = 0; i < 2; i++) {
    const hy = clamp(y + rand(8, 26) * (i ? 1 : -1) * (Math.random() < 0.8 ? 1 : -1), 150, 212);
    G.hounds.push({
      x: G.deer.x - dir * (i === lead ? rand(35, 60) : rand(85, 150)), y: hy, baseY: hy, dir, home: dir, t: 0, back: false,
      run: rand(1.5, 3.6), seen: 0, phase: Math.random(), speed: G.deer.speed * rand(0.72, 1.0), backSpeed: rand(60, 110),
      stride: rand(2.6, 3.8), sway: rand(4, 10), swayRate: rand(0.9, 1.8), swayPh: rand(0, 6.28), kind: i ? 'dogb' : 'doga',
    });
  }
  Sound.bark(3);
  G.state = 'deer';
}
function resolve(result, delay) {
  G.results[G.idx] = result; G.state = 'resolve'; G.timer = delay;
}
function endRound() {
  G.deer = null; G.lady = null;
  const petSpared = G.results.includes('spared');
  G.passed = G.roundPts >= ROUND_GOAL;
  G.bonus = (G.bagged === 9 && petSpared) ? 1000 : 0;
  G.score += G.bonus;
  G.state = 'roundEnd'; G.timer = 4.5;
  if (G.passed) { setHenry('cheer'); Sound.fanfare(); } else { setHenry('sulk'); Sound.over(); }
}
function gameOver() {
  G.state = 'gameOver'; G.timer = 1.2;
  if (G.score > G.best) { G.best = G.score; try { localStorage.setItem('kingsDeerHuntBest', String(G.best)); } catch (e) { /* ignore */ } }
}

// ---------------------------------------------------------------- shooting
function deerHit(d, px, py) {
  const s = laneScale(d.y) * (d.type === 'stag' ? 1.25 : 1);
  const hop = -3 * laneScale(d.y) * Math.abs(Math.sin(Math.PI * d.phase));
  const dx = (px - d.x) * d.dir / s, dy = (py - (d.y + hop)) / s;
  if (G.orig) {      // the code-drawn deer are a slightly different shape
    const dyo = (py - (d.y - 6 * laneScale(d.y) * Math.abs(Math.sin(Math.PI * d.phase)))) / s;
    return (Math.abs(dx) <= 20 && dyo >= -39 && dyo <= 1) || (dx >= 7 && dx <= 32 && dyo >= -54 && dyo <= -32);
  }
  if (Math.abs(dx) <= 25 && dy >= -34 && dy <= 1) return true;      // body + legs
  if (dx >= 10 && dx <= 31 && dy >= -43 && dy <= -24) return true;  // neck + head (antlers don't count)
  return false;
}
// A fingertip is far less exact than a mouse pointer and hides the target, so a tap that lands just beside a deer still counts.
function touchHit(d, px, py) {
  if (deerHit(d, px, py)) return true;
  for (const r of [5, 10]) for (let a = 0; a < 8; a++) if (deerHit(d, px + Math.cos(a * Math.PI / 4) * r, py + Math.sin(a * Math.PI / 4) * r)) return true;
  return false;
}
function fire(mx, my, touch) {
  if (G.state !== 'deer' || !G.deer || G.deer.state !== 'run' || G.bolts <= 0) return;
  const px = mx / 2, py = my / 2;
  G.bolts--;
  const face = mx >= HENRY_X * 2 ? 1 : -1;
  setHenry('shoot', face);
  Sound.shot();
  const ox = HENRY_X * 2 + face * 62, oy = HENRY_FEET * 2 - 122;
  G.flight = { x0: ox, y0: oy, x1: mx, y1: my, t: 0 };
  const d = G.deer;
  if (touch ? touchHit(d, px, py) : deerHit(d, px, py)) {
    d.state = 'hit'; d.st = 0;
    for (let i = 0; i < 10; i++) G.parts.push({ x: px, y: py, vx: rand(-60, 60), vy: rand(-80, 10), t: 0, life: rand(0.3, 0.6), col: i % 2 ? '#fff3b0' : '#ffffff', g: 160 });
    if (d.type === 'pet') {
      G.score = 0; G.roundPts = 0; Sound.hit(false); Sound.doom();
      pop('Score forfeit!', d.x * 2, (d.y - 50) * 2, '#ff8a8a', 30);
      const fromLeft = d.x < LW / 2;
      G.lady = { x: fromLeft ? -30 : LW + 30, y: d.y + 3, tx: d.x + (fromLeft ? -32 : 32), dir: fromLeft ? 1 : -1, state: 'run', t: 0, wept: false };
      setTimeout(() => { if (G.henry.anim !== 'sulk') setHenry('sulk'); }, 450);
      banner("You slew her ladyship's pet deer!", 'Alas, all thy points are forfeit.', 3.2, '#ffb0b0');
      G.results[G.idx] = 'slain'; G.state = 'compensate';     // play waits until her ladyship has been paid
    } else {
      const pts = POINTS[d.type]; G.score += pts; G.roundPts += pts; G.bagged++;
      Sound.hit(d.type === 'stag'); Sound.cheer();
      if (G.edu && FACTS.length) G.fact = { text: FACTS[factIndex(G.round, G.bagged) % FACTS.length] };
      pop('+' + pts, d.x * 2, (d.y - 55) * 2, d.type === 'stag' ? '#ffd84a' : '#fff3d0', d.type === 'stag' ? 40 : 30);
      if (d.type === 'stag') banner('', 'A magnificent stag!', 1.6, '#ffe08a');
      setTimeout(() => setHenry('cheer'), 380);
      resolve(d.type === 'stag' ? 'stag' : 'hit', 2.1);
    }
  } else {
    Sound.thunk();
    if (py > 122) { G.stuck.push({ x: px, y: py, t: 0 }); for (let i = 0; i < 5; i++) G.parts.push({ x: px, y: py, vx: rand(-25, 25), vy: rand(-45, -10), t: 0, life: 0.4, col: '#6b4a2a', g: 200 }); }
    if (G.bolts <= 0) { d.flee = true; }
  }
}

// ---------------------------------------------------------------- update
function update(dt) {
  G.t += dt; G.henry.t += dt;
  const diff = G.score - G.shown;
  if (diff) G.shown = Math.abs(diff) < 5 ? G.score : G.shown + Math.sign(diff) * Math.max(5, Math.ceil(Math.abs(diff) * dt * 6));
  if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.dur) G.banner = null; }
  for (const p of G.pops) { p.t += dt; p.y -= 34 * dt; } G.pops = G.pops.filter(p => p.t < 1.5);
  for (const p of G.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; } G.parts = G.parts.filter(p => p.t < p.life);
  for (const b of G.stuck) b.t += dt; G.stuck = G.stuck.filter(b => b.t < 6);
  if (G.flight) { G.flight.t += dt / 0.09; if (G.flight.t >= 1) G.flight = null; }
  for (let s = 0; s < 2; s++) if (G.beaterT[s] > 0) { G.beaterT[s] -= dt; if (G.beaterT[s] <= 0) G.beaterPose[s] = 0; }

  // Henry's animations time out back to something sensible
  const h = G.henry;
  if (h.anim === 'shoot' && h.t > 0.55) { h.anim = 'ready'; h.t = 0; }
  if (h.anim === 'cheer' && h.t > 1.5 && G.state !== 'roundEnd') setHenry('feast');
  if (h.anim === 'sulk' && h.t > 1.7 && G.state !== 'roundEnd' && G.state !== 'gameOver' && !G.lady) setHenry('feast');

  // hounds
  for (const o of G.hounds) {
    o.t += dt; o.phase = (o.phase + dt * (o.back ? o.stride * 0.7 : o.stride)) % 1;
    o.y = clamp(o.baseY + Math.sin(o.t * o.swayRate + o.swayPh) * o.sway, 150, 212);          // each drifts on its own line
    if (o.x > 0 && o.x < LW) o.seen += dt;                     // stamina only counts once it is on the field
    if (!o.back && o.seen > o.run) { o.back = true; o.dir = -o.home; }
    o.x += o.dir * (o.back ? o.backSpeed : o.speed * laneScale(o.y) * (1 + 0.12 * Math.sin(o.t * 2.1 + o.swayPh))) * dt;
  }
  G.hounds = G.hounds.filter(o => !(o.back && (o.x < -40 || o.x > LW + 40)));

  // deer
  const d = G.deer;
  if (d) {
    d.st += dt;
    if (d.state === 'run') {
      d.age += dt; d.glint += dt;
      const s = laneScale(d.y);
      const sp = d.speed * (d.flee ? 1.7 : 1);
      d.x += d.dir * sp * s * dt;
      d.phase = (d.phase + dt * sp / 52) % 1;
      d.tyT -= dt; if (d.tyT <= 0) { d.ty = rand(146, 210); d.tyT = rand(0.8, 1.8); }
      d.y += clamp(d.ty - d.y, -1, 1) * 26 * dt;
      if (d.age > 9) d.flee = true;
      if (!d.flee && d.turns > 0 && (d.dir > 0 ? d.x >= d.turnX : d.x <= d.turnX)) {   // wheel about somewhere mid-field
        d.dir *= -1; d.turns--;
        d.turnX = d.dir > 0 ? Math.min(LW - 50, rand(d.x + 80, LW - 60)) : Math.max(50, rand(60, d.x - 80));
      }
      if (G.state === 'deer' && (d.x < -50 || d.x > LW + 50)) {
        if (d.type === 'pet') { banner('', "Her ladyship's pet has left the area.", 1.6, '#c8f0c0'); resolve('spared', 1.4); }
        else if (d.type === 'stag') { banner('', 'The great stag got away!', 1.3, '#ffd0a0'); setHenry('sulk'); Sound.sulk(); resolve('miss', 1.5); }
        else { if (G.henry.anim !== 'feast') setHenry('feast'); resolve('miss', 0.9); }   // an ordinary deer? His Majesty keeps eating
        G.deer = null;
      }
    } else if (d.state === 'hit' && d.st > 0.32) { d.state = 'fall'; d.st = 0; }
    else if (d.state === 'fall' && d.st > 0.5) { d.state = 'down'; d.st = 0; }
  }

  // the weeping noblewoman
  const L = G.lady;
  if (L) {
    L.t += dt;
    if (L.state === 'run') {
      L.x += L.dir * 120 * dt;
      if ((L.dir > 0 && L.x >= L.tx) || (L.dir < 0 && L.x <= L.tx)) { L.x = L.tx; L.state = 'weep'; L.t = 0; L.sob = 0; Sound.weep(); }
    } else if (L.state === 'leave') {                               // paid: she gathers herself and goes
      L.x += L.dir * 105 * dt;
      if (L.x < -40 || L.x > LW + 40) { G.lady = null; G.state = 'resolve'; G.timer = 0.5; }
    } else {
      L.sob += dt; if (L.sob > 4.4) { L.sob = 0; Sound.weep(); }    // she will not stop until she is compensated
      if (L.t > 0.45 && Math.random() < dt * 11) {
      const hd = G.orig ? 52 * laneScale(L.y) : LADY_H * laneScale(L.y) / 2;
      G.parts.push({ x: L.x + L.dir * 0.13 * hd + rand(-2, 2), y: L.y - 0.5 * hd, vx: rand(-26, 26), vy: rand(-34, -8), t: 0, life: 0.7, col: Math.random() < 0.3 ? '#e8f8ff' : '#8fd8ff', g: 150 });
      }
    }
  }

  // state machine
  G.timer -= dt;
  switch (G.state) {
    case 'loading': if (pending === 0) { bgAlt = [buildBG(true), buildBG(false)]; bgC = bgAlt[0]; G.state = 'title'; } break;
    case 'roundIntro': if (G.timer <= 0) nextDeer(); break;
    case 'wait': if (G.timer <= 0) spawnDeer(); break;
    case 'resolve': if (G.timer <= 0) { if (G.fact) { G.state = 'fact'; G.factT = 0; } else nextDeer(); } break;
    case 'fact': G.factT += dt; break;                       // the hunt waits while the fact is read
    case 'roundEnd': if (G.timer <= 0) {
      if (!G.passed) gameOver();
      else if (G.round >= MAX_ROUNDS) { G.won = true; gameOver(); setHenry('feast'); Sound.fanfare(); }   // the hunt is complete
      else { G.round++; startRound(); }
    } break;
  }
}

// ---------------------------------------------------------------- drawing: low-res scene
// ---- the original code-drawn look (O key)
const OA = window.ORIGINAL_ART;
function drawDeerOrig(d) {
  const ls = laneScale(d.y), set = OA.DEER[d.type];
  shadow(d.x, d.y, 15 * ls * (d.type === 'stag' ? 1.25 : 1));
  if (d.state === 'run') {
    const fr = set.run[Math.floor(d.phase * OA.RUN_FRAMES) % OA.RUN_FRAMES];
    const hop = -6 * ls * Math.abs(Math.sin(Math.PI * d.phase));
    drawSprite(fr, d.x, d.y + hop, d.dir * ls, ls);
    if (d.type === 'pet' && d.glint % 1.1 < 0.16) {
      const jx = Math.round(d.x + d.dir * 18 * ls), jy = Math.round(d.y + hop - 33 * ls);
      lo.fillStyle = '#ffffff'; lo.fillRect(jx - 2, jy, 5, 1); lo.fillRect(jx, jy - 2, 1, 5);
    }
    return;
  }
  const fr = set.dead;
  const k = d.state === 'hit' ? 0 : d.state === 'fall' ? d.st / 0.5 : 1;
  const arc = d.state === 'fall' ? Math.sin(k * Math.PI) * 16 * ls : 0;
  const shake = d.state === 'hit' ? Math.sin(d.st * 80) * 1.5 : 0;
  const alpha = d.state === 'down' && d.type !== 'pet' ? clamp(1.6 - d.st, 0, 1) : 1;
  const cy = lerp(d.y - fr.bc * ls, d.y - fr.bc * ls * 0.36, k) - arc;
  lo.save(); lo.globalAlpha = alpha;
  lo.translate(Math.round(d.x + shake), Math.round(cy)); lo.rotate(k * Math.PI * d.dir); lo.scale(d.dir * ls, ls);
  lo.drawImage(fr.c, -fr.ox, -fr.oy + fr.bc);
  lo.restore();
}
function origEntities(ents) {
  for (let s = 0; s < 2; s++) {
    const pose = G.beaterPose[s], bob = Math.floor(G.t * 2 + s) % 2;
    const ex = s ? LW - 30 : 30, ex2 = s ? LW - 14 : 14;
    ents.push({ y: 206, f: () => drawSprite(OA.BEATER[pose], ex, 206 - (pose === 1 ? bob : 0), s ? -1 : 1, 1) });
    ents.push({ y: 164, f: () => drawSprite(OA.BEATER[pose === 2 ? 0 : pose], ex2, 164, s ? -0.8 : 0.8, 0.8) });
    if (pose === 2) for (let i = 0; i < 3; i++) {
      const a = (G.t * 0.9 + i / 3) % 1;
      ents.push({ y: 999, f: () => { lo.fillStyle = `rgba(255,224,138,${1 - a})`; const nx = Math.round(ex + (s ? -18 : 18) + (s ? -1 : 1) * a * 22), ny = Math.round(166 - a * 26 + Math.sin(a * 9) * 3); lo.fillRect(nx, ny, 2, 2); lo.fillRect(nx + 2, ny - 5, 1, 6); lo.fillRect(nx + 2, ny - 5, 3, 1); } });
    }
  }
  for (const o of G.hounds) ents.push({ y: o.y, f: () => { const s = laneScale(o.y); shadow(o.x, o.y, 9 * s); drawSprite(OA.HOUND[Math.floor(o.phase * 4) % 4], o.x, o.y - 2 * s * Math.abs(Math.sin(o.phase * Math.PI)), o.dir * s, s); } });
  if (G.deer) ents.push({ y: G.deer.y, f: () => drawDeerOrig(G.deer) });
  if (G.lady) { const L = G.lady; ents.push({ y: L.y + 0.5, f: () => { const s = laneScale(L.y) * 1.05; const fr = L.state !== 'weep' ? OA.LADY[Math.floor(L.t * 9) % 2] : OA.LADY[2 + Math.floor(L.t * 5) % 2]; shadow(L.x, L.y, 11 * s); drawSprite(fr, L.x, L.y, L.dir * s, s); } }); }
}
function setOriginal(on) {
  G.orig = on; G.paintedPlat = !on;
  if (bgAlt.length) bgC = bgAlt[on ? 1 : 0];
  if (G.state !== 'title' && G.state !== 'gameOver') banner('', on ? 'Original code-drawn artwork (O to switch back)' : 'Painted artwork', 1.8, '#cfe8ff');
}
function drawSprite(fr, x, y, sx, sy) {
  lo.save(); lo.translate(Math.round(x), Math.round(y)); lo.scale(sx, sy); lo.drawImage(fr.c, -fr.ox, -fr.oy); lo.restore();
}
function shadow(x, y, w) { lo.fillStyle = 'rgba(20,40,15,0.3)'; lo.fillRect(Math.round(x - w), Math.round(y - 1), Math.round(w * 2), 2); lo.fillRect(Math.round(x - w + 2), Math.round(y + 1), Math.round(w * 2 - 4), 1); }

function drawDeer(d) {      // low-res layer: just the shadow; the deer itself is drawn on the hi-res layer
  if (d.state === 'down' && d.type !== 'pet' && d.st > 1.2) return;
  shadow(d.x, d.y, 21 * laneScale(d.y) * (d.type === 'stag' ? 1.2 : 1));
}
function drawHoundHi(o) {
  {
    const key = o.kind + Math.floor(o.phase * HOUND_FRAMES[o.kind]) % HOUND_FRAMES[o.kind], im = IMG[key], m = HOUND_META[key];
    if (!im || !im.ok) return;
    const sc = 0.5 * laneScale(o.y) * (o.kind === 'dogb' ? 1.2 : 1);      // the brown hound is the bigger dog
    ctx.save(); ctx.translate(o.x * 2, o.y * 2 + 2); if (o.dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(im, -m.ax * sc, -m.ay * sc, m.w * sc, m.h * sc);
    ctx.restore();
  }
}
function drawDeerHi() {
  const d = G.deer; if (!d) return;
  const ls = laneScale(d.y), sc = DEER_SC * ls * (d.type === 'stag' ? 1.15 : 1);
  let idx = Math.floor(d.phase * 3) % 3, hop = 0, shake = 0, alpha = 1;
  if (d.state === 'run') hop = -6 * ls * Math.abs(Math.sin(Math.PI * d.phase));
  else if (d.state === 'hit') shake = Math.sin(d.st * 80) * 3;
  else if (d.state === 'fall') idx = d.st < 0.3 ? 3 : 4;
  else { idx = 4; if (d.type !== 'pet') alpha = clamp(1.6 - d.st, 0, 1); }
  const key = DEER_KEY[d.type] + idx, im = IMG[key], m = DEER_META[key]; if (!im || !im.ok) return;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.translate(d.x * 2 + shake, d.y * 2 + 2 + hop); if (d.dir < 0) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(im, -m.ax * sc, -m.ay * sc, m.w * sc, m.h * sc);
  if (d.type === 'pet' && d.state === 'run' && d.glint % 1.1 < 0.16) {     // the jewels catch the light
    const jx = 46 * sc, jy = -92 * sc;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(jx - 7, jy - 1, 14, 2); ctx.fillRect(jx - 1, jy - 7, 2, 14);
  }
  ctx.restore();
}
function renderScene() {
  if (!bgC) { lo.fillStyle = '#1b1712'; lo.fillRect(0, 0, LW, LH); return; }
  lo.drawImage(bgC, 0, 0);
  const ents = [];
  if (G.orig) origEntities(ents);
  // shadows under the servants (the servants themselves are drawn on the hi-res layer)
  else for (let sd = 0; sd < 2; sd++) for (const [px, py] of SERV_POS) { const x = sd ? LW - px : px; ents.push({ y: py, f: () => shadow(x, py, 11 * laneScale(py)) }); }
  for (const b of G.stuck) ents.push({ y: b.y, f: () => { lo.globalAlpha = clamp(6 - b.t, 0, 1); lo.fillStyle = '#5c3f22'; for (let i = 0; i < 6; i++) lo.fillRect(Math.round(b.x) + i, Math.round(b.y) - 1 - i, 1, 1); lo.fillStyle = '#f0ece0'; lo.fillRect(Math.round(b.x) + 5, Math.round(b.y) - 8, 2, 2); lo.globalAlpha = 1; } });
  if (!G.orig) for (const o of G.hounds) ents.push({ y: o.y, f: () => shadow(o.x, o.y, 15 * laneScale(o.y)) });
  if (!G.orig && G.deer) ents.push({ y: G.deer.y, f: () => drawDeer(G.deer) });
  if (!G.orig && G.lady) { const L = G.lady; ents.push({ y: L.y + 0.5, f: () => shadow(L.x, L.y, 13 * laneScale(L.y)) }); }
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) e.f();
}
// Two bushes, deliberately unmatched, each cut off by the edge of the screen. Design coords: cx = centre, base = foot of the bush.
const BUSHES = [
  { cx: -2,  base: 318, w: 85, flip: false },      // left: about half showing
  { cx: 978, base: 352, w: 108, flip: true },       // right: lower, bigger, about a third showing
];
function drawBush(b) {
  const im = IMG.bush; if (!im.ok) return;
  {
    const h = b.w * im.height / im.width;
    ctx.fillStyle = 'rgba(20,40,15,0.3)'; ctx.beginPath(); ctx.ellipse(b.cx, b.base - 2, b.w * 0.48, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(b.cx, b.base); if (b.flip) ctx.scale(-1, 1);
    ctx.drawImage(im, -b.w / 2, -h, b.w, h);
    ctx.restore();
  }
}
function drawServant(sd, i) {
  const [px, py] = SERV_POS[i];
  {
    const pose = G.beaterPose[sd];
    const who = SERVANTS[CAST[sd][i]];
    let key = who.idle;
    if (pose === 2 && i === 0) key = who.horn;                                  // the man further up the field carries the horn
    else if (pose === 1) key = who.wave[Math.floor(G.t * 5 + i) % 2];             // waving his arms to drive the deer
    const im = IMG[key], m = SERV_META[key]; if (!im || !im.ok) return;
    const sc = SERV_H * laneScale(py) / 300 * (i === 0 ? 1.155 : 1), x = (sd ? LW - px : px) * 2;   // the further-up pair drawn larger (10%, then 5% more)
    ctx.save(); ctx.translate(x, py * 2 + 2); if (sd) ctx.scale(-1, 1);
    ctx.drawImage(im, -m.ax * sc, -m.h * sc, m.w * sc, m.h * sc);
    ctx.restore();
  }
}
// Everything standing on the field is drawn strictly back-to-front by where its feet are (y in low-res scene units),
// so a hound, deer or the lady passes behind anyone standing nearer than it and in front of anyone further away.
function drawFieldHi() {
  const items = [];
  for (const b of BUSHES) items.push({ y: b.base / 2, f: () => drawBush(b) });
  for (let sd = 0; sd < 2; sd++) SERV_POS.forEach(([, py], i) => items.push({ y: py, f: () => drawServant(sd, i) }));
  for (const o of G.hounds) items.push({ y: o.y, f: () => drawHoundHi(o) });
  if (G.deer) items.push({ y: G.deer.y, f: drawDeerHi });
  if (G.lady) items.push({ y: G.lady.y + 0.5, f: drawLady });
  items.sort((a, b) => a.y - b.y);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  for (const it of items) it.f();
}
// ---- painted platform + Henry's royal standard (hi-res layer). F switches back to the code-drawn platform.
const PLAT_IMG = { w: 820, h: 711, dx: 274.5, dy: 276.8, sc: 0.5 };
const MAST = { x: 294, top: 132, foot: 280 };            // design coords: extends the platform's left pole upward
const FLAG = { len: 170, strips: 68 };
const flagC = mk(FLAG.len * 2 + 40, 200), flagG = flagC.getContext('2d');
function drawStandard(t) {
  const im = IMG.standard; if (!im.ok) return;
  const fh = FLAG.len * im.height / im.width, n = FLAG.strips, sw = im.width / n, dw = FLAG.len / n;
  const wave = u => Math.sin(u * 8.5 - t * 5.2) * 6 * u + Math.sin(u * 3.1 - t * 2.3) * 4 * u + u * u * 9;   // ripple + sag toward the fly
  flagG.setTransform(2, 0, 0, 2, 0, 0); flagG.clearRect(0, 0, flagC.width, flagC.height);
  flagG.globalCompositeOperation = 'source-over';
  for (let i = 0; i < n; i++) flagG.drawImage(im, i * sw, 0, sw, im.height, i * dw, 14 + wave(i / n), dw + 0.6, fh);
  flagG.globalCompositeOperation = 'source-atop';         // light and shade along the folds
  for (let i = 0; i < n; i++) {
    const u = i / n, slope = Math.cos(u * 8.5 - t * 5.2) * u;
    flagG.fillStyle = slope > 0 ? `rgba(0,0,0,${0.28 * slope})` : `rgba(255,255,255,${-0.2 * slope})`;
    flagG.fillRect(i * dw, 0, dw + 0.6, 100);
  }
  flagG.globalCompositeOperation = 'source-over';
  ctx.drawImage(flagC, MAST.x + 3, MAST.top - 8, flagC.width / 2, flagC.height / 2);
}
function drawPlatformHi(t) {
  const im = IMG.platform, P = PLAT_IMG;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  drawStandard(t);
  ctx.fillStyle = '#3a2410'; ctx.fillRect(MAST.x - 4, MAST.top, 8, MAST.foot - MAST.top);          // mast
  ctx.fillStyle = '#7a5230'; ctx.fillRect(MAST.x - 2.5, MAST.top + 1, 5, MAST.foot - MAST.top);
  ctx.fillStyle = '#93683e'; ctx.fillRect(MAST.x - 2.5, MAST.top + 1, 1.5, MAST.foot - MAST.top);
  ctx.fillStyle = '#3a2410'; ctx.beginPath(); ctx.arc(MAST.x, MAST.top - 3, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e7b93c'; ctx.beginPath(); ctx.arc(MAST.x, MAST.top - 3, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(im, P.dx, P.dy, P.w * P.sc, P.h * P.sc);
}
const paintedPlatform = () => G.paintedPlat && IMG.platform.ok;
function renderOverlay() {
  ov.clearRect(0, 0, LW, LH);
  if (!bgC) return;
  if (!G.orig) for (let sd = 0; sd < 2; sd++) if (G.beaterPose[sd] === 2) {                    // notes drifting from the horn
    const [px, py] = SERV_POS[0], hd = SERV_H * laneScale(py) / 2, dir = sd ? -1 : 1;
    const bx = (sd ? LW - px : px) + dir * 0.46 * hd, by = py - 1.0 * hd;
    for (let i = 0; i < 3; i++) {
      const a = (G.t * 0.9 + i / 3) % 1;
      ov.fillStyle = `rgba(255,224,138,${1 - a})`;
      const nx = Math.round(bx + dir * a * 24), ny = Math.round(by - a * 26 + Math.sin(a * 9) * 3);
      ov.fillRect(nx, ny, 2, 2); ov.fillRect(nx + 2, ny - 5, 1, 6); ov.fillRect(nx + 2, ny - 5, 3, 1);
    }
  }
  for (const p of G.parts) { ov.fillStyle = p.col; ov.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }
  if (!paintedPlatform()) drawPlatform(ov, G.t);
}
function drawLady() {
  const L = G.lady; if (!L) return;
  let key, bob = 0;
  if (L.state !== 'weep') { key = Math.floor(L.t * 8) % 2 ? 'lady1' : 'lady0'; bob = key === 'lady1' ? -3 : 0; }
  else if (L.t < 0.45) key = 'lady2';
  else { key = 'lady3'; bob = Math.floor(L.t * 6) % 2 ? 1.5 : 0; }      // shoulders shaking with sobs
  const im = IMG[key], m = LADY_META[key]; if (!im || !im.ok) return;
  const sc = LADY_H * laneScale(L.y) / 300;
  ctx.save(); ctx.translate(L.x * 2, L.y * 2 + 2 + bob); if (L.dir < 0) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(im, -m.ax * sc, -m.h * sc, m.w * sc, m.h * sc);
  ctx.restore();
}

// ---------------------------------------------------------------- drawing: hi-res layer
// Larger-text option (About page): small and medium text is drawn about a quarter bigger; headings are already large.
const fs = size => G.bigText && size < 20 ? Math.round(size * 1.25 + 1) : size;
function text(str, x, y, size, color, font = FONT_H, align = 'center', weight = 'bold') {
  size = fs(size);
  ctx.font = `${weight} ${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = 'rgba(30,18,8,0.9)';
  ctx.strokeText(str, x, y); ctx.fillStyle = color; ctx.fillText(str, x, y);
}
function plain(str, x, y, size, color, font = FONT_B, align = 'center', weight = 'normal') {
  size = fs(size);
  ctx.font = `${weight} ${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(str, x, y);
}
function drawHenry() {
  const h = G.henry; let key, flip = false, bob = 0;
  switch (h.anim) {
    case 'feast': { const t = h.t % 2.6; key = t < 1.2 ? 'feast0' : t < 1.45 ? 'feast2' : t < 2.25 ? 'feast1' : 'feast2'; if (key === 'feast1') bob = Math.floor(t * 8) % 2; break; }
    case 'shoot': key = h.t < 0.07 ? 'shoot1' : h.t < 0.32 ? 'shoot2' : 'shoot1'; flip = h.face < 0; break;
    case 'ready': key = 'shoot0'; flip = h.face < 0; break;
    case 'cheer': key = Math.floor(h.t * 4) % 2 ? 'cheer0' : 'cheer1'; bob = key === 'cheer1' ? -6 : 0; break;
    case 'sulk': key = 'sulk0'; break;
  }
  const im = IMG[key], m = HENRY_META[key]; if (!im || !im.ok) return;
  const sc = 0.56, fx = HENRY_X * 2, fy = HENRY_FEET * 2 + 4 + bob;
  ctx.fillStyle = 'rgba(40,25,10,0.35)'; ctx.beginPath(); ctx.ellipse(fx, HENRY_FEET * 2 + 2, 52, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(fx, fy); if (flip) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(im, -m.ax * sc, -m.h * sc, m.w * sc, m.h * sc);
  ctx.restore();
}
function parchment(x, y, w, h, r = 10) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 3;
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#f1e2b8'); g.addColorStop(1, '#dcc48e');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#7a5a2c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x + 1, y + 1, w - 2, h - 2, r); ctx.stroke();
  ctx.strokeStyle = 'rgba(122,90,44,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x + 5, y + 5, w - 10, h - 10, Math.max(2, r - 4)); ctx.stroke();
}
const TALLY_BASE = 55, TALLY_DEPTH = 82, TALLY_K = 0.215, TALLY_Y = 46;   // design px: icon bottoms, crop depth, scale, row centre
function tallyIcon(x, y, r) {
  const ink = '#4a3015';
  if (!r) { ctx.strokeStyle = '#75613c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.stroke(); return; }
  if (r === 'miss') { ctx.strokeStyle = '#6a6353'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5); ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5); ctx.stroke(); return; }
  if (r === 'spared') { ctx.fillStyle = '#236b35'; ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.bezierCurveTo(x - 11, y - 2, x - 5, y - 9, x, y - 3); ctx.bezierCurveTo(x + 5, y - 9, x + 11, y - 2, x, y + 6); ctx.fill(); return; }
  if (G.orig) {      // the original drawn icons
    if (r === 'slain') { ctx.fillStyle = '#2f7fc4'; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.bezierCurveTo(x + 8, y + 1, x + 5, y + 7, x, y + 7); ctx.bezierCurveTo(x - 5, y + 7, x - 8, y + 1, x, y - 8); ctx.fill(); return; }
    ctx.fillStyle = r === 'stag' ? '#b8860b' : '#8a5a30';
    ctx.beginPath(); ctx.ellipse(x, y + 2, 4.5, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x - 6, y - 2, 3.5, 2, -0.5, 0, Math.PI * 2); ctx.ellipse(x + 6, y - 2, 3.5, 2, 0.5, 0, Math.PI * 2); ctx.fill();
    if (r === 'stag') { ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1.6; ctx.beginPath(); for (const s of [-1, 1]) { ctx.moveTo(x + s * 2, y - 3); ctx.lineTo(x + s * 5, y - 11); ctx.moveTo(x + s * 3.5, y - 7); ctx.lineTo(x + s * 8, y - 9); ctx.moveTo(x + s * 4.5, y - 9.5); ctx.lineTo(x + s * 2, y - 13); } ctx.stroke(); }
    ctx.fillStyle = ink; ctx.fillRect(x - 1, y + 5, 2, 2); return;
  }
  if (r === 'slain') { ctx.fillStyle = 'rgba(160,24,40,0.28)'; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill(); }   // her pet: marked in red
  // head-and-shoulders cut from the matching deer sprite
  // One scale for all three, and one shared bottom edge (TALLY_BASE). Each crop runs from `top` (the crown of the head)
  // down TALLY_DEPTH sprite pixels, so the heads are level and the same size; only the stag's antlers stand higher.
  const [key, sx, sw, top] = { hit: ['doe0', 128, 87, 0], stag: ['stag0', 120, 124, 46], slain: ['pet0', 116, 105, 0] }[r];
  const im = IMG[key]; if (!im || !im.ok) return;
  const k = TALLY_K, sh = top + TALLY_DEPTH;
  ctx.drawImage(im, sx, 0, sw, sh, x - sw * k / 2, TALLY_BASE - sh * k, sw * k, sh * k);
}
function boltIcon(x, y, on) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.35); ctx.scale(0.75, 0.75);
  if (!on) {      // a spent bolt: a plain grey outline, still clearly visible against the parchment
    ctx.strokeStyle = '#6f675a'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(9, 0); ctx.moveTo(15, 0); ctx.lineTo(8, -4.5); ctx.lineTo(8, 4.5); ctx.closePath();
    ctx.moveTo(-6, 0); ctx.lineTo(-9, -6); ctx.lineTo(-17, -6); ctx.lineTo(-13, 0); ctx.lineTo(-17, 6); ctx.lineTo(-9, 6); ctx.closePath(); ctx.stroke();
    ctx.restore(); return;
  }
  ctx.fillStyle = '#6b4a2a'; ctx.fillRect(-13, -1.5, 24, 3);
  ctx.fillStyle = '#5a5f6a'; ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(8, -4.5); ctx.lineTo(8, 4.5); ctx.fill();
  ctx.fillStyle = '#c8202a'; ctx.beginPath(); ctx.moveTo(-13, -1.5); ctx.lineTo(-17, -6); ctx.lineTo(-9, -6); ctx.lineTo(-6, -1.5); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-13, 1.5); ctx.lineTo(-17, 6); ctx.lineTo(-9, 6); ctx.lineTo(-6, 1.5); ctx.fill();
  ctx.restore();
}
function drawHUD() {
  parchment(10, 8, W - 20, 54, 8);       // inner border lines at y = 13 and y = 57
  plain('SCORE', 28, 27, 11, '#5e4320', FONT_B, 'left', 'bold');
  plain(String(Math.round(G.shown)).padStart(5, '0'), 28, 45, 20, '#3a2410', FONT_B, 'left', 'bold');
  plain('BEST', 128, 27, 11, '#5e4320', FONT_B, 'left', 'bold');
  plain(String(Math.max(G.best, G.score)).padStart(5, '0'), 128, 45, 16, '#6b4a2a', FONT_B, 'left', 'bold');
  // the bag: ten deer per round
  const x0 = W / 2 - 9 * 15;
  plain(`THIS ROUND:  ${G.roundPts} of 1000 points needed`, W / 2, 21, 10, G.roundPts >= ROUND_GOAL ? '#24592b' : '#5e4320', FONT_B, 'center', 'bold');
  for (let i = 0; i < 10; i++) {
    const x = x0 + i * 30;
    if (i === G.idx && (G.state === 'deer' || G.state === 'wait')) { ctx.fillStyle = 'rgba(200,32,42,0.25)'; ctx.beginPath(); ctx.arc(x, TALLY_Y, 10, 0, Math.PI * 2); ctx.fill(); }
    tallyIcon(x, TALLY_Y, G.results[i]);
  }
  plain('BOLTS', W - 232, 27, 11, '#5e4320', FONT_B, 'left', 'bold');
  for (let i = 0; i < 3; i++) boltIcon(W - 220 + i * 26, 43, i < G.bolts);
  plain('ROUND', W - 28, 27, 11, '#5e4320', FONT_B, 'right', 'bold');
  plain(String(G.round), W - 28, 45, 20, '#3a2410', FONT_B, 'right', 'bold');
}
function drawCrosshair() {
  if (!G.mouse.shown) return;
  const { x, y } = G.mouse;
  for (const [col, lw] of [['rgba(20,10,5,0.85)', 5], ['#ffd84a', 2]]) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(x + dx * 8, y + dy * 8); ctx.lineTo(x + dx * 21, y + dy * 21); }
    ctx.stroke();
  }
  ctx.fillStyle = '#c8202a'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
}
function drawMiniDeer(type, x, y) {
  if (G.orig) { const fr = OA.DEER[type].run[1], s = type === 'stag' ? 0.62 : 0.9; ctx.imageSmoothingEnabled = false; ctx.drawImage(fr.c, x - fr.ox * s, y - 2 - fr.oy * s, fr.c.width * s, fr.c.height * s); ctx.imageSmoothingEnabled = true; return; }
  const key = DEER_KEY[type] + '0', im = IMG[key], m = DEER_META[key]; if (!im || !im.ok) return;
  const sc = 0.3;
  ctx.drawImage(im, x - m.ax * sc, y - m.ay * sc, m.w * sc, m.h * sc);
}
// Width a parchment needs so every line fits: the widest of `lines` ([text, size, style, font, extra]) plus padding,
// never narrower than minW and never wider than the screen. `extra` is space taken beside a line (e.g. an icon column).
function fitWidth(minW, lines, pad = 64) {
  let w = minW;
  for (const [str, size, style = 'normal', font = FONT_B, extra = 0] of lines) {
    ctx.font = `${style} ${fs(size)}px ${font}`;
    w = Math.max(w, ctx.measureText(str).width + pad + extra);
  }
  return Math.min(W - 24, Math.ceil(w));
}
function drawTitle() {
  ctx.fillStyle = 'rgba(15,10,5,0.45)'; ctx.fillRect(0, 0, W, H);
  const TITLE = 'Darest Thou Hunt with Henry VIII?';
  const SUB = 'by the Grace of God, King of England and France, Defender of the Faith and Lord of Ireland';
  const rows = [
    ['ordinary', 'A deer', '100 points', '#3a2410'],
    ['stag', 'A great stag', '500 points', '#6b4600'],
    ['pet', "A deer in a jewelled collar", 'lose ALL thy points', '#a01828'],
  ];
  const NOTES = [
    '',
    G.touch || G.noKeys ? 'Use the buttons for the about page, the history, education mode, music and pause.'
            : `E starts education mode, M mutes the music, P pauses the game, A brings up the about page.`,
    `Education mode is ${G.edu ? 'ON : learn a fact about Henry with every deer taken.' : 'off : play the game without interruption.'}`,
  ];
  const py = 34, ph = 424;
  const pw = fitWidth(W - 300, [[SUB, 16, 'italic'], ...NOTES.map(n => [n, 14, 'bold']),
    ...rows.flatMap(r => [[r[1], 17, 'normal', FONT_B, 240], [r[2], 17, 'bold', FONT_B, 240]])]);
  const px = (W - pw) / 2, cx0 = W / 2 - 330;       // cx0: left edge of the deer-and-points column
  parchment(px, py, pw, ph, 14);
  ctx.font = `bold 40px ${FONT_H}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#7a1420'; ctx.fillText(TITLE, W / 2, py + 52, pw - 50);
  plain(SUB, W / 2, py + 92, 16, '#4a3015', FONT_B, 'center', 'italic');
  ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + 60, py + 112); ctx.lineTo(px + pw - 60, py + 112); ctx.stroke();
  rows.forEach(([type, label, pts, col], i) => {
    const y = py + 168 + i * 68;
    drawMiniDeer(type, cx0 + 95, y + 28);
    plain(label, cx0 + 150, y - 8, 17, '#3a2410', FONT_B, 'left');
    plain(pts, cx0 + 150, y + 15, 17, col, FONT_B, 'left', 'bold');
  });
  plain(NOTES[0], W / 2, py + 350, 14, '#4a3015', FONT_B, 'center', 'italic');
  plain(NOTES[1], W / 2, py + 372, 14, '#4a3015', FONT_B, 'center', 'italic');
  plain(NOTES[2], W / 2, py + 396, 14, G.edu ? '#24592b' : '#4a3015', FONT_B, 'center', G.edu ? 'bold' : 'italic');
  text(`${tapWord()} to begin the hunt`, W / 2, py + ph + 26, 26, '#ffe08a');
}
function drawPayPanel() {
  const MSG = 'Compensate her ladyship for her lost property.', BTN = 'Pay her 7 shillings 6 pence', B = PAY_BTN;
  B.w = fitWidth(280, [[BTN, 17, 'bold']], 44); B.x = (W - B.w) / 2;       // the button grows with its label
  const pw = Math.max(fitWidth(420, [[MSG, 17, 'italic']]), B.w + 60), ph = 118, px = (W - pw) / 2, py = 162;
  parchment(px, py, pw, ph, 12);
  plain(MSG, W / 2, py + 34, 17, '#3a2410', FONT_B, 'center', 'italic');
  const hot = inPayBtn(G.mouse.x, G.mouse.y);
  ctx.fillStyle = hot ? '#9a1c2a' : '#7a1420'; ctx.beginPath(); ctx.roundRect(B.x, B.y, B.w, B.h, 8); ctx.fill();
  ctx.strokeStyle = '#e7b93c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(B.x + 2, B.y + 2, B.w - 4, B.h - 4, 6); ctx.stroke();
  ctx.font = `bold ${fs(17)}px ${FONT_B}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffe9a8';
  ctx.fillText(BTN, W / 2, B.y + B.h / 2 + 1, B.w - 28);     // squeezed to stay inside the gold border
}
function drawRoundEnd() {
  const head = G.passed ? `Round ${G.round} complete` : 'The King is displeased';
  const pts = `Points this round: ${G.roundPts}   (needed ${ROUND_GOAL})`;
  const pet = G.results.includes('slain') ? "Her ladyship's pet: slain. She is inconsolable." : "Her ladyship's pet: safe.";
  const last = G.bonus ? `A perfect hunt!  Royal bonus +${G.bonus}` : !G.passed ? 'You have failed.' : G.round >= MAX_ROUNDS ? 'Your servants cannot find any more deer.' : 'More deer are being driven in…';
  const pw = fitWidth(440, [[head, 34, 'bold', FONT_H], [pts, 18], [pet, 16, 'italic'], [last, 18, 'bold']]), ph = 190, px = (W - pw) / 2, py = 120;
  parchment(px, py, pw, ph, 12);
  ctx.font = `bold 34px ${FONT_H}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#7a1420'; ctx.fillText(head, W / 2, py + 40);
  plain(pts, W / 2, py + 86, 18, '#3a2410');
  plain(pet, W / 2, py + 114, 16, G.results.includes('slain') ? '#a01828' : '#24592b', FONT_B, 'center', 'italic');
  if (G.bonus) plain(last, W / 2, py + 146, 18, '#6b4600', FONT_B, 'center', 'bold');
  else plain(last, W / 2, py + 146, 16, '#4a3015');
}
function drawVictory() {
  const HEAD = 'A Most Excellent Hunt!', REC = 'A new record for the royal game book!', AGAIN = `${tapWord()} to hunt again`;
  const msg = "His Majesty Henry VIII declares this was an excellent hunt, but the light is fading so now it's time to feast!";
  const stats = `All ${MAX_ROUNDS} rounds completed   ·   Best: ${G.best}` + (G.paid ? `   ·   Funds spent from the royal purse: ${money(G.paid)}` : '');
  const pw = fitWidth(600, [[HEAD, 40, 'bold', FONT_H], [stats, 16], [REC, 16, 'bold'], [AGAIN, 18, 'bold']]), ph = 290, px = (W - pw) / 2, py = 84;
  parchment(px, py, pw, ph, 12);
  ctx.font = `bold 40px ${FONT_H}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#7a1420'; ctx.fillText(HEAD, W / 2, py + 46);
  ctx.font = `italic ${fs(18)}px ${FONT_B}`;
  wrapLines(msg, pw - 90).forEach((l, i) => plain(l, W / 2, py + 96 + i * 25, 18, '#3a2410', FONT_B, 'center', 'italic'));
  plain(`Final score: ${G.score}`, W / 2, py + 172, 24, '#3a2410', FONT_B, 'center', 'bold');
  plain(stats, W / 2, py + 206, 16, '#4a3015');
  if (G.score > 0 && G.score >= G.best) plain(REC, W / 2, py + 232, 16, '#6b4600', FONT_B, 'center', 'bold');
  if (G.timer <= 0) plain(AGAIN, W / 2, py + 262, 18, '#7a1420', FONT_B, 'center', 'bold');
}
function drawGameOver() {
  ctx.fillStyle = 'rgba(15,10,5,0.5)'; ctx.fillRect(0, 0, W, H);
  if (G.won) return drawVictory();
  const HEAD = 'The Hunt Is Ended', REC = 'A new record for the royal game book!', AGAIN = `${tapWord()} to hunt again`;
  const stats = `Reached round ${G.round}   ·   Best: ${G.best}` + (G.paid ? `   ·   Funds spent from the royal purse: ${money(G.paid)}` : '');
  const pw = fitWidth(460, [[HEAD, 44, 'bold', FONT_H], [`Final score: ${G.score}`, 24, 'bold'], [stats, 16], [REC, 16, 'bold'], [AGAIN, 18, 'bold']]), ph = 220, px = (W - pw) / 2, py = 110;
  parchment(px, py, pw, ph, 12);
  ctx.font = `bold 44px ${FONT_H}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#7a1420'; ctx.fillText(HEAD, W / 2, py + 48);
  plain(`Final score: ${G.score}`, W / 2, py + 100, 24, '#3a2410', FONT_B, 'center', 'bold');
  plain(stats, W / 2, py + 134, 16, '#4a3015');
  if (G.score > 0 && G.score >= G.best) plain(REC, W / 2, py + 160, 16, '#6b4600', FONT_B, 'center', 'bold');
  if (G.timer <= 0) plain(AGAIN, W / 2, py + 192, 18, '#7a1420', FONT_B, 'center', 'bold');
}

function render() {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  renderScene();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(loC, 0, 0, W, H);
  if (!G.orig) drawFieldHi();
  renderOverlay();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(ovC, 0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
  if (paintedPlatform()) drawPlatformHi(G.t);
  if (G.state === 'loading') { text('Sending out the servants and hounds…', W / 2, H / 2, 28, '#ffe08a'); return; }
  if (G.flight) {
    const f = G.flight, t = f.t, t0 = Math.max(0, t - 0.25);
    ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(lerp(f.x0, f.x1, t0), lerp(f.y0, f.y1, t0)); ctx.lineTo(lerp(f.x0, f.x1, t), lerp(f.y0, f.y1, t)); ctx.stroke();
    ctx.strokeStyle = '#e8d8b0'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  drawHenry();
  for (const p of G.pops) { ctx.globalAlpha = clamp(1.5 - p.t, 0, 1) / 0.5 > 1 ? 1 : clamp(1.5 - p.t, 0, 1) * 2; text(p.text, p.x, p.y, p.size, p.color, FONT_B); ctx.globalAlpha = 1; }
  if (G.state !== 'title') drawHUD();
  if (G.banner && G.state !== 'gameOver') {
    const b = G.banner, a = clamp(Math.min(b.t * 5, (b.dur - b.t) * 3), 0, 1);
    ctx.globalAlpha = a;
    if (b.text) text(b.text, W / 2, 96, 40, b.color);
    if (b.sub) text(b.sub, W / 2, b.text ? 136 : 92, 22, b.color, FONT_B, 'center', 'italic bold');
    ctx.globalAlpha = 1;
  }
  if (G.state === 'title') drawTitle();
  if (payDue()) drawPayPanel();
  if (G.state === 'fact' && G.fact) drawFactPanel();
  if (G.edu && G.state !== 'title') text('Education mode on' + (G.touch || G.noKeys ? '' : ' (E)'), 22, 76, 12, '#e6f2ff', FONT_B, 'left', 'bold');
  if (Sound.muted && G.state !== 'title') text('Muted' + (G.touch || G.noKeys ? '' : ' (M)'), W - 22, 76, 12, '#e6f2ff', FONT_B, 'right', 'bold');   // mirrors the education label, on the right
  if (G.state === 'roundEnd') drawRoundEnd();
  if (G.state === 'gameOver') drawGameOver();
  if (G.paused) { ctx.fillStyle = 'rgba(15,10,5,0.5)'; ctx.fillRect(0, 0, W, H); text('Paused', W / 2, H / 2, 44, '#ffe08a'); }
  drawCrosshair();
}

// ---------------------------------------------------------------- input + loop
function toDesign(e) { const r = canvas.getBoundingClientRect(); if (!r.width || !r.height) return [G.mouse.x, G.mouse.y]; return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
canvas.addEventListener('pointermove', e => { const [x, y] = toDesign(e); G.mouse.x = x; G.mouse.y = y; G.mouse.shown = e.pointerType !== 'touch'; });
canvas.addEventListener('pointerleave', () => { G.mouse.shown = false; pressArmed = false; });
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  const [x, y] = toDesign(e); G.mouse.x = x; G.mouse.y = y; G.mouse.shown = e.pointerType !== 'touch';
  if (e.pointerType === 'touch') setTouch();
  Sound.init();
  // Shooting happens the instant you press, as a game needs. Everything else (starting, continuing, paying, resuming)
  // waits for the release, so a press made by mistake can be cancelled by sliding off before letting go.
  if (G.paused || PRESS_STATES.includes(G.state)) { pressArmed = true; return; }
  fire(x, y, e.pointerType === 'touch');
});
const PRESS_STATES = ['title', 'gameOver', 'fact', 'compensate'];
let pressArmed = false;
function activate(x, y, viaKey) {
  if (G.paused) { G.paused = false; return; }
  if (G.state === 'title') startGame();
  else if (G.state === 'gameOver') { if (G.timer <= 0) startGame(); }
  else if (G.state === 'fact') { if (G.factT > 0.6) dismissFact(); }
  else if (G.state === 'compensate') { if (payDue() && (viaKey || inPayBtn(x, y))) payLady(); }
}
canvas.addEventListener('pointerup', e => { if (!pressArmed) return; pressArmed = false; const [x, y] = toDesign(e); activate(x, y, false); });
canvas.addEventListener('pointercancel', () => { pressArmed = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
// ---- Touch devices: on-screen buttons stand in for the keyboard, and a prompt asks for the phone to be turned sideways
const $ = id => document.getElementById(id);
const canPause = () => G.state !== 'title' && G.state !== 'gameOver';
function setTouch() { if (G.touch) return; G.touch = true; document.body.classList.add('touch'); checkRotate(); }
function checkRotate() {
  const el = $('rotate'); if (!el) return;
  G.rotateOpen = G.touch && !G.rotateSkipped && window.matchMedia('(orientation: portrait)').matches;
  el.hidden = !G.rotateOpen;
}
function syncTouchBar() {
  if (!$('touchbar')) return;
  const set = (id, on, html) => { const b = $(id); if (b.dataset.s !== html) { b.dataset.s = html; b.innerHTML = html; } b.classList.toggle('on', on); };
  set('tbEdu', G.edu, G.edu ? 'Facts<br>on' : 'Facts<br>off');
  set('tbMute', !Sound.muted, Sound.muted ? 'Music<br>off' : 'Music<br>on');
  set('tbPause', G.paused, G.paused ? 'Resume' : 'Pause');
  $('tbPause').disabled = !canPause();
}
if ($('touchbar')) {
  $('tbAbout').addEventListener('click', () => toggleAbout());
  $('tbEdu').addEventListener('click', () => toggleEdu());
  $('tbMute').addEventListener('click', () => { Sound.init(); Sound.toggleMute(); });
  $('tbPause').addEventListener('click', () => { if (canPause()) G.paused = !G.paused; });
  $('aboutClose').addEventListener('click', () => toggleAbout(false));
  $('touchbar').addEventListener('click', syncTouchBar);            // update the button labels straight away
  $('rotateSkip').addEventListener('click', () => { G.rotateSkipped = true; checkRotate(); });
  window.addEventListener('resize', checkRotate);
  window.addEventListener('orientationchange', checkRotate);
  if (navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches) setTouch();   // a phone or tablet
}
// ---- About page (A): an HTML overlay in index.html, so it can scroll and hold images. The game waits while it is open.
const aboutEl = document.getElementById('about');
const PAGES = { about: aboutEl, history: document.getElementById('history') };
let pageOpen = null, pageReturn = null;
function showPage(name, show) {
  const el = PAGES[name]; if (!el) return;
  const open = show === undefined ? pageOpen !== name : show;
  if (open) {
    if (pageOpen === name) return;
    if (pageOpen) PAGES[pageOpen].hidden = true; else pageReturn = document.activeElement;     // switching pages keeps the original return point
    pageOpen = name; el.hidden = false;
    if (name === 'history') renderHistory();
    const sheet = el.querySelector('.sheet'); sheet.scrollTop = 0; sheet.focus();              // focused so arrow keys and Page Down scroll it
  } else {
    if (pageOpen !== name) return;
    el.hidden = true; pageOpen = null;
  }
  G.aboutOpen = !!pageOpen; held.clear();                                                    // the game waits while either page is open
  for (const id of ['game', 'touchbar', 'historyLink']) { const x = $(id); if (x) x.inert = G.aboutOpen; }   // nothing behind the page can be reached
  if (!pageOpen && pageReturn && pageReturn !== document.body && pageReturn.focus) pageReturn.focus();       // put focus back where it was
}
const toggleAbout = show => showPage('about', show);
const toggleHistory = show => showPage('history', show);
// ---- Accessibility options (ticked on the About page, remembered between visits)
function setOption(key, on) {
  G[key] = on;
  if (key === 'noKeys') document.body.classList.toggle('nokeys', on);
  try { localStorage.setItem('kingsDeerHunt_' + key, on ? '1' : '0'); } catch (e) { /* ignore */ }
}
for (const [id, key] of [['optBig', 'bigText'], ['optKeys', 'noKeys']]) {
  const box = $(id); if (!box) continue;
  let saved = false; try { saved = localStorage.getItem('kingsDeerHunt_' + key) === '1'; } catch (e) { /* ignore */ }
  box.checked = saved; setOption(key, saved);
  box.addEventListener('change', () => setOption(key, box.checked));
}
// ---- Keyboard play: arrow keys aim, Space or Enter shoots and presses whatever is on offer
const held = new Set();
const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
let fineAim = false;
function moveCrosshair(dt) {
  if (!held.size || G.paused || G.aboutOpen || G.rotateOpen) return;
  let dx = 0, dy = 0; for (const k of held) { dx += ARROWS[k][0]; dy += ARROWS[k][1]; }
  const v = (fineAim ? 150 : 480) * dt;
  G.mouse.x = clamp(G.mouse.x + dx * v, 0, W); G.mouse.y = clamp(G.mouse.y + dy * v, 0, H); G.mouse.shown = true;
}
window.addEventListener('keyup', e => { held.delete(e.key); fineAim = e.shiftKey; });
window.addEventListener('blur', () => held.clear());
for (const name of Object.keys(PAGES)) if (PAGES[name]) PAGES[name].addEventListener('pointerdown', e => { if (e.target === PAGES[name]) showPage(name, false); });   // click outside the sheet closes it
if ($('historyLink')) {
  $('historyLink').addEventListener('click', e => { e.preventDefault(); toggleHistory(true); });
  $('historyClose').addEventListener('click', () => toggleHistory(false));
  $('aboutToHistory').addEventListener('click', () => toggleHistory(true));
  $('tbHistory').addEventListener('click', () => toggleHistory());
}
window.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const letters = !G.noKeys, k = e.key.toLowerCase();        // single-letter shortcuts can be switched off on the About page
  fineAim = e.shiftKey;
  if (letters && k === 'a') { toggleAbout(); return; }
  if (letters && k === 'h') { toggleHistory(); return; }
  if (G.aboutOpen) {       // while reading, only Escape (close) and M (music) do anything
    if (e.key === 'Escape' && pageOpen) showPage(pageOpen, false);
    if (letters && k === 'm') Sound.toggleMute();
    return;
  }
  const onControl = e.target instanceof Element && e.target.closest('button, input');   // Space and Enter belong to a focused button
  if (ARROWS[e.key]) { e.preventDefault(); held.add(e.key); G.mouse.shown = true; return; }
  if ((e.key === ' ' || e.key === 'Enter') && !onControl) {
    e.preventDefault(); if (e.repeat) return;
    Sound.init();
    if (!G.paused && !PRESS_STATES.includes(G.state)) fire(G.mouse.x, G.mouse.y, false);
    else activate(G.mouse.x, G.mouse.y, true);
    return;
  }
  if (!letters) return;
  if (k === 'm') Sound.toggleMute();
  if (k === 'e') toggleEdu();
  if (k === 'o') setOriginal(!G.orig);   // the original code-drawn artwork
  if (k === 'p' && G.state !== 'title' && G.state !== 'gameOver') G.paused = !G.paused;
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  moveCrosshair(dt);
  if (!G.paused && !G.aboutOpen && !G.rotateOpen) update(dt);
  syncTouchBar();
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__game = G; G.factsInfo = () => ({ n: FACTS.length, fromFile: factsFromFile }); G.step = update; G.draw = render;   // handy for debugging in the console
})();
