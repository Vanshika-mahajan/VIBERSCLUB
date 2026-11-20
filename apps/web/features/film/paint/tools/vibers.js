// Painted Vibers: chibi characters built from painted parts (Lemo-Opuscar Impasto, like the cellist in its demo).
// Each part is drawn clean in Canvas2D, painted once into knife strokes, then moved every frame by its joint
// matrices, so the characters move while the paint itself never boils.
import { Ref, paintRef } from './engine/plate.js';

export const mul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
export const TR = (x, y) => [1, 0, 0, 1, x, y], SC = (s, t = s) => [s, 0, 0, t, 0, 0], RO = a => [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
const M3 = (...ms) => ms.reduce((a, b) => mul(a, b));

const SKIN = '#f2c9a6', SKIN_D = '#d9a07c', BLUSH = 'rgba(232,120,120,.55)', INK = '#2a1b13';
const D = Math.PI / 180;

// a part: Ref in pivot space. box = [x0, y0, x1, y1] around the pivot (local units, character height 1000)
export function part(E, box, draw, { scale = 0.28, R = [8, 4, 2, 1.1], T = 9, seed = 1 } = {}) {
  const [x0, y0, x1, y1] = box, w = x1 - x0, h = y1 - y0;
  const ref = new Ref(w, h, scale);
  for (const c of [ref.ctx, ref.idc]) c.translate(-x0, -y0);
  draw(ref);
  const st = paintRef(ref, { R, T, seed, app: (x, y, level) => level * 0.09 + ((Math.sin(x * 12.99 + y * 78.23) * 43758.55 % 1 + 1) % 1) * 0.06 });
  return { b: E.batch(st.data()), tex: E.texture(ref.ctx.canvas, 0.5), w, h, ox: -x0, oy: -y0, n: st.n };
}
const ell = (x, y, rx, ry, r = 0) => c => c.ellipse(x, y, rx, ry, r, 0, Math.PI * 2);
const rr = (x, y, w, h, r) => c => c.roundRect(x, y, w, h, r);
const poly = pts => c => { c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); c.closePath(); };
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };

// ---------- heads ----------
function head(E, L, mood, seed) {
  // pivot at the chin/neck join; head circle r 205 centred at (0,-195)
  return part(E, [-300, -470, 300, 60], R => {
    const hair = L.hair, hairD = shade(hair, 0.72);
    // back hair (long / bun base) behind the face
    if (L.style === 'long') R.fill(c => { c.moveTo(-215, -230); c.bezierCurveTo(-260, -40, -230, 20, -150, 30); c.lineTo(150, 30); c.bezierCurveTo(230, 20, 260, -40, 215, -230); c.closePath(); }, hairD, { dir: 90, group: 'hb', maxR: 6 });
    if (L.style === 'bun') R.fill(ell(40, -420, 82, 70), hair, { dir: 'edge', group: 'bun', maxR: 5 });
    // neck + face
    R.fill(rr(-48, -60, 96, 110, 30), SKIN_D, { dir: 90, group: 'neck', maxR: 4 });
    R.fill(c => { c.moveTo(-200, -230); c.bezierCurveTo(-210, -40, -110, 10, 0, 12); c.bezierCurveTo(110, 10, 210, -40, 200, -230); c.bezierCurveTo(190, -380, -190, -380, -200, -230); }, SKIN, { dir: 'edge', fallback: 90, group: 'face', maxR: 7, detail: 0.8 });
    R.tint(ell(-112, -112, 46, 26), BLUSH); R.tint(ell(112, -112, 46, 26), BLUSH);
    // eyes
    if (mood === 'laugh') {
      for (const s of [-1, 1]) R.line(c => { c.moveTo(s * 80 - 38, -150); c.quadraticCurveTo(s * 80, -196, s * 80 + 38, -150); }, INK, 13, { group: 'eye' + s, maxR: 1.6 });
      R.fill(c => { c.moveTo(-44, -88); c.quadraticCurveTo(0, -84, 44, -88); c.quadraticCurveTo(30, -30, 0, -28); c.quadraticCurveTo(-30, -30, -44, -88); }, '#8c2a2a', { group: 'mouth', maxR: 2 });
      R.fill(c => { c.moveTo(-24, -46); c.quadraticCurveTo(0, -60, 24, -46); c.quadraticCurveTo(0, -30, -24, -46); }, '#e07a72', { group: 'tongue', maxR: 1.4 });
    } else {
      for (const s of [-1, 1]) {
        R.fill(ell(s * 82, -158, 30, mood === 'blink' ? 6 : 42), INK, { group: 'eye' + s, maxR: 1.8 });
        if (mood !== 'blink') {
          R.fill(ell(s * 82, -150, 20, 28), L.eye || '#6b3f22', { group: 'iris' + s, maxR: 1.4 });
          R.fill(ell(s * 82 - 10, -172, 10, 12), '#fff8ec', { group: 'shine' + s, maxR: 1 });
        }
        R.line(c => { c.moveTo(s * 82 - 34, -214); c.quadraticCurveTo(s * 82, -228, s * 82 + 34, -214); }, shade(hair, 0.6), 9, { group: 'brow' + s, maxR: 1.4 });
      }
      R.line(c => { c.moveTo(-26, -78); c.quadraticCurveTo(0, -58, 26, -78); }, '#8c3a30', 9, { group: 'mouth', maxR: 1.4 });
    }
    // front hair
    if (L.style === 'short' || L.style === 'cap') {
      R.fill(c => { c.moveTo(-214, -190); c.bezierCurveTo(-240, -420, 240, -440, 214, -190); c.bezierCurveTo(170, -250, 120, -270, 60, -262); c.lineTo(20, -228); c.lineTo(-10, -262); c.bezierCurveTo(-90, -268, -170, -250, -214, -190); }, hair, { dir: 'edge', fallback: 60, group: 'hair', maxR: 6 });
    } else if (L.style === 'curly') {
      R.fill(c => { for (const [x, y, r] of [[-180, -230, 70], [-150, -320, 80], [-60, -370, 85], [50, -375, 85], [150, -325, 80], [185, -235, 66], [-110, -270, 60], [100, -275, 60], [0, -300, 60]]) { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); } }, hair, { dir: 'edge', fallback: 40, group: 'hair', maxR: 6 });
    } else {
      // long / bun: centre part with side-swept bangs
      R.fill(c => { c.moveTo(-216, -170); c.bezierCurveTo(-250, -420, 250, -430, 216, -170); c.bezierCurveTo(200, -250, 120, -300, 20, -300); c.bezierCurveTo(-40, -250, -120, -230, -216, -170); }, hair, { dir: 'edge', fallback: 30, group: 'hair', maxR: 6 });
    }
    if (L.style === 'cap') {
      R.fill(c => { c.moveTo(-205, -270); c.bezierCurveTo(-200, -440, 200, -440, 205, -270); c.closePath(); }, L.capCol, { dir: 0, group: 'cap', maxR: 6 });
      R.fill(ell(110, -268, 150, 30, -0.06), shade(L.capCol, 0.8), { dir: 0, group: 'brim', maxR: 4 });
    }
    if (L.beanie) R.fill(c => { c.moveTo(-210, -250); c.bezierCurveTo(-210, -470, 210, -470, 210, -250); c.closePath(); }, L.beanie, { dir: 90, group: 'beanie', maxR: 5 });
    if (L.phones) {
      R.line(c => { c.moveTo(-214, -170); c.bezierCurveTo(-230, -440, 230, -440, 214, -170); }, L.phones, 26, { group: 'band', maxR: 2 });
      for (const sx of [-1, 1]) R.fill(rr(sx * 214 - 36, -230, 72, 120, 30), L.phones, { group: 'cup' + sx, maxR: 2.5 });
    }
    // ears
    for (const s of [-1, 1]) if (L.style !== 'long' && !L.phones) R.fill(ell(s * 205, -170, 26, 40), SKIN_D, { group: 'ear' + s, maxR: 2 });
  }, { seed, scale: 0.26, R: [6, 3, 1.6] });
}

// ---------- body parts ----------
function torso(E, L, seed) {
  // pivot at the hip; neck at (0,-300)
  return part(E, [-170, -330, 170, 40], R => {
    if (L.pack) R.fill(rr(-150, -300, 300, 250, 50), L.pack, { dir: 90, group: 'pack', maxR: 6 });
    R.fill(c => { c.moveTo(-110, -300); c.bezierCurveTo(-150, -280, -150, -200, -140, 20); c.lineTo(140, 20); c.bezierCurveTo(150, -200, 150, -280, 110, -300); c.closePath(); }, L.top, { dir: 90, fallback: 90, group: 'top', maxR: 6 });
    R.tint(c => c.rect(40, -300, 120, 330), 'rgba(40,20,10,.16)');
    if (L.under) R.fill(poly([[-46, -300], [46, -300], [0, -190]]), L.under, { group: 'under', maxR: 3 });
    R.line(c => { c.moveTo(0, -190); c.lineTo(0, 10); }, shade(L.top, 0.62), 7, { group: 'zip', maxR: 1.2 });
    if (L.pack) for (const s of [-1, 1]) R.line(c => { c.moveTo(s * 70, -300); c.lineTo(s * 84, -120); }, shade(L.pack, 0.7), 22, { group: 'strap' + s, maxR: 2 });
  }, { seed });
}
function upperArm(E, L, seed) { return part(E, [-50, -30, 50, 175], R => { R.fill(rr(-44, -26, 88, 196, 42), L.top, { dir: 90, group: 'a', maxR: 4 }); R.tint(c => c.rect(14, -30, 40, 210), 'rgba(40,20,10,.14)'); }, { seed }); }
function foreArm(E, L, seed) {
  return part(E, [-50, -30, 50, 205], R => {
    R.fill(rr(-40, -26, 80, 150, 38), L.top, { dir: 90, group: 'f', maxR: 4 });
    R.fill(rr(-42, 104, 84, 26, 10), shade(L.top, 0.8), { dir: 0, group: 'cuff', maxR: 2 });
    R.fill(ell(0, 160, 38, 42), SKIN, { dir: 'edge', group: 'hand', maxR: 3 });
  }, { seed });
}
function thigh(E, L, seed) { return part(E, [-58, -20, 58, 190], R => R.fill(rr(-52, -18, 104, 204, 46), L.legs, { dir: 90, group: 't', maxR: 4 }), { seed }); }
function shin(E, L, seed) {
  return part(E, [-80, -20, 110, 210], R => {
    R.fill(rr(-46, -18, 92, 170, 38), L.legs, { dir: 90, group: 's', maxR: 4 });
    R.fill(c => { c.moveTo(-56, 140); c.lineTo(46, 140); c.bezierCurveTo(100, 150, 108, 200, 92, 206); c.lineTo(-58, 206); c.closePath(); }, L.shoe, { dir: 0, group: 'shoe', maxR: 3 });
    R.line(c => { c.moveTo(-58, 200); c.lineTo(96, 200); }, '#efe6d6', 10, { group: 'sole', maxR: 1.2 });
  }, { seed });
}

export function buildViber(E, L, seed) {
  return {
    L, head: head(E, L, 'open', seed), blink: head(E, L, 'blink', seed), laugh: head(E, L, 'laugh', seed),
    torso: torso(E, L, seed + 1), ua: upperArm(E, L, seed + 2), fa: foreArm(E, L, seed + 3), th: thigh(E, L, seed + 4), sh: shin(E, L, seed + 5),
  };
}
export function buildMap(E) {
  return part(E, [-170, -120, 170, 120], R => {
    R.fill(poly([[-160, -100], [-50, -112], [55, -96], [160, -110], [158, 104], [52, 112], [-52, 98], [-162, 110]]), '#efe2c2', { dir: 0, group: 'paper', maxR: 4 });
    R.tint(poly([[-50, -112], [55, -96], [52, 112], [-52, 98]]), 'rgba(120,90,50,.12)');
    R.fill(c => { c.moveTo(-120, 40); c.bezierCurveTo(-60, -60, 20, 60, 70, -20); c.bezierCurveTo(90, -50, 110, -60, 130, -70); c.lineTo(132, -62); c.bezierCurveTo(100, -40, 90, 60, 20, 66); c.bezierCurveTo(-40, 60, -80, -20, -116, 48); c.closePath(); }, '#8fae7a', { dir: 'edge', group: 'land', maxR: 2 });
    R.line(c => { c.setLineDash([14, 12]); c.moveTo(-110, 70); c.bezierCurveTo(-40, 0, 40, 40, 120, -60); }, '#c0392b', 7, { group: 'route', maxR: 1.2 });
    R.fill(ell(120, -60, 14, 14), '#D5851F', { group: 'pin', maxR: 1.2 });
  }, { seed: 93, scale: 0.5 });
}
// a sitting golden dog, side view (pivot on the ground), and its tail (pivot at the base)
export function buildDog(E) {
  const body = part(E, [-260, -420, 230, 20], R => {
    const C = '#d9a256', Cd = '#b07a36';
    R.fill(c => { c.ellipse(-40, -150, 150, 140, -0.2, 0, 7); }, C, { dir: 'edge', fallback: 70, group: 'body', maxR: 6 });
    for (const x of [-150, 60]) R.fill(rr(x, -90, 70, 100, 30), Cd, { dir: 90, group: 'leg' + x, maxR: 3 });
    R.fill(rr(30, -150, 66, 160, 30), C, { dir: 90, group: 'fl', maxR: 3 });
    R.fill(ell(70, -300, 110, 100), C, { dir: 'edge', group: 'head', maxR: 4 });
    R.fill(ell(160, -270, 62, 44), '#e8c48a', { dir: 0, group: 'snout', maxR: 2.5 });
    R.fill(ell(212, -282, 20, 16), '#2a1b13', { group: 'nose', maxR: 1.2 });
    R.fill(ell(100, -318, 13, 17), '#2a1b13', { group: 'eye', maxR: 1 });
    R.fill(c => c.ellipse(20, -280, 46, 90, 0.35, 0, 7), Cd, { dir: 90, group: 'ear', maxR: 3 });
    R.fill(c => { c.moveTo(150, -240); c.quadraticCurveTo(180, -200, 200, -244); c.closePath(); }, '#e07a72', { group: 'tongue', maxR: 1 });
  }, { seed: 97, scale: 0.3 });
  const tail = part(E, [-30, -180, 40, 20], R => R.fill(c => { c.moveTo(-20, 0); c.quadraticCurveTo(-30, -100, 10, -170); c.quadraticCurveTo(30, -100, 22, 0); c.closePath(); }, '#d09a4e', { dir: 'edge', group: 't', maxR: 3 }), { seed: 98, scale: 0.3 });
  return { body, tail };
}
export function buildProps(E) {
  const guitar = part(E, [-120, -330, 120, 160], R => {
    R.fill(c => { c.moveTo(-14, -320); c.lineTo(14, -320); c.lineTo(12, -40); c.lineTo(-12, -40); c.closePath(); }, '#5a3420', { dir: 90, group: 'neck', maxR: 2 });
    R.fill(rr(-26, -330, 52, 46, 10), '#3a2214', { group: 'headstock', maxR: 2 });
    R.fill(c => { c.ellipse(0, 20, 108, 120, 0, 0, 7); c.moveTo(80, -80); c.ellipse(0, -80, 80, 82, 0, 0, 7); }, '#c27a3a', { dir: 'edge', group: 'body', maxR: 4 });
    R.fill(ell(0, -30, 30, 30), '#3a2214', { group: 'hole', maxR: 1.6 });
    R.fill(rr(-40, 70, 80, 16, 4), '#3a2214', { group: 'bridge', maxR: 1.4 });
    for (const x of [-6, 0, 6]) R.line(c => { c.moveTo(x, -320); c.lineTo(x, 76); }, 'rgba(250,240,220,.8)', 2.4, { group: 'str', maxR: 0.8 });
  }, { seed: 91, scale: 0.5 });
  const log = part(E, [-260, -60, 260, 60], R => {
    R.fill(rr(-250, -50, 500, 100, 46), '#6b4a30', { dir: 0, group: 'log', maxR: 5 });
    R.fill(ell(-236, 0, 34, 48), '#c9a074', { group: 'end', maxR: 2 });
    R.line(c => { c.moveTo(-180, -12); c.lineTo(160, -18); }, '#4a3020', 7, { group: 'bark', maxR: 1.2 });
  }, { seed: 92, scale: 0.5 });
  const laptop = part(E, [-170, -140, 170, 20], R => {
    R.fill(poly([[-150, -130], [150, -130], [160, 0], [-160, 0]]), '#9aa0a6', { dir: 0, group: 'lid', maxR: 4 });
    R.tint(c => c.rect(-160, -130, 160, 140), 'rgba(255,255,255,.12)');
    R.fill(ell(0, -66, 18, 18), '#D5851F', { group: 'sticker', maxR: 1.2 });
    R.fill(rr(-170, -4, 340, 18, 6), '#6c7176', { dir: 0, group: 'base', maxR: 2 });
  }, { seed: 94, scale: 0.5 });
  const camera = part(E, [-90, -70, 90, 60], R => {
    R.fill(rr(-80, -46, 160, 100, 14), '#2c2a2a', { dir: 0, group: 'body', maxR: 2.4 });
    R.fill(rr(-60, -64, 50, 22, 6), '#3a3838', { group: 'top', maxR: 1.6 });
    R.fill(ell(10, 4, 40, 40), '#141414', { group: 'lens', maxR: 1.6 });
    R.fill(ell(4, -4, 14, 14), '#7f9bb8', { group: 'glass', maxR: 1 });
  }, { seed: 95, scale: 0.5 });
  const mug = part(E, [-50, -70, 70, 50], R => { R.fill(rr(-40, -60, 80, 100, 14), '#e8dcc4', { dir: 90, group: 'mug', maxR: 2 }); R.line(c => c.arc(46, -10, 22, -1.4, 1.4), '#e8dcc4', 12, { group: 'h', maxR: 1.4 }); }, { seed: 96, scale: 0.5 });
  return { guitar, log, laptop, camera, mug };
}

// ---------- posing ----------
// pose: {x, y, s, f(lip), walk phase, stride, sit, lean, headTilt, bob, armL:[shoulder, elbow], armR, mood}
// angles in degrees, 0 = arm hanging down, positive = outward/up on that side
export function viberParts(V, p) {
  const out = [], s = p.s, fl = p.f || 1;
  const base = M3(TR(p.x, p.y), SC(s * fl, s));
  const bob = p.bob || 0;
  let hipY, legs;
  if (p.sit) {
    hipY = -150 + bob;
    legs = [[-1, 64 * D, -64 * D], [1, -64 * D, 64 * D]];
  } else {
    const ph = p.walk || 0, st = p.stride ?? 0;
    hipY = -360 - Math.abs(Math.sin(ph)) * 22 * st + bob;
    legs = [[-1, Math.sin(ph) * 26 * D * st, Math.max(0, -Math.sin(ph)) * 30 * D * st], [1, -Math.sin(ph) * 26 * D * st, Math.max(0, Math.sin(ph)) * 30 * D * st]];
  }
  const hip = M3(base, TR(0, hipY), RO((p.lean || 0) * D));
  const legM = ([side, a1, a2]) => { const t = M3(hip, TR(side * 62, -10), RO(a1)); return [t, M3(t, TR(0, 170), RO(a2))]; };
  const neck = M3(hip, TR(0, -296));
  const arm = (side, [a1, a2]) => { const u = M3(neck, TR(side * 116, 26), RO(-side * a1 * D)); return [u, M3(u, TR(0, 150), RO(-side * a2 * D))]; };
  const [lu, lf] = arm(-1, p.armL || [8, 6]), [ru, rf] = arm(1, p.armR || [8, 6]);
  const [lt, ls] = legM(legs[0]), [rt, rs] = legM(legs[1]);
  const H = M3(neck, TR(0, 4), RO((p.headTilt || 0) * D));
  const hd = p.mood === 'laugh' ? V.laugh : p.mood === 'blink' ? V.blink : V.head;
  // back to front
  if (p.sit) out.push([V.sh, ls], [V.sh, rs], [V.th, lt], [V.th, rt]); else out.push([V.th, lt], [V.sh, ls], [V.th, rt], [V.sh, rs]);
  out.push([V.ua, lu], [V.fa, lf], [V.ua, ru], [V.fa, rf], [V.torso, hip]);
  if (p.prop) out.push([p.prop, M3(hip, ...p.propM)]);
  if (p.frontArms) out.push([V.ua, ru], [V.fa, rf]);
  out.push([hd, H]);
  return out;
}
// blink now and then, from a fixed seed (so every frame computes the same answer)
export const blinking = (t, seed) => { const per = 2.6 + (seed % 7) * 0.31, ph = (t + seed * 0.77) % per; return ph < 0.12; };
