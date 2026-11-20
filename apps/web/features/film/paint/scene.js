// The interactive painted intro, drawn live with the Lemo-Opuscar Impasto renderer (impasto.js, MIT).
//
// Everything painted was baked once into knife strokes (public/film/paint: strokes.bin + an underpainting
// webp per plate): ARPIT's camp picture, the paraglider's canopy, and the Vibers, who are painted parts
// (heads, torsos, arms, legs) moved every frame by their joints, so they move while the paint never boils.
//
// Story, in seconds after the door is opened:
//   0     the camp paints itself in while the camera goes through the doorway; the hero stands alone
//   2.4   the hero looks at his phone (the "Vibers nearby" card is HTML, in PaintedIntro.tsx)
//   join  each Viber the visitor connects with paints into the scene, waving
//   all   everyone laughs; then the sky is painted over the camp, the hero paraglides in, turns to us,
//         and the canopy grows until it fills the frame (the page hands that frame over to Home)
import { Impasto, Strokes, F, KNIFE, DAB, BRUSH, hex } from "./impasto.js";

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const hash = (n) => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const mul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
const M3 = (...ms) => ms.reduce((a, b) => mul(a, b));
const TR = (x, y) => [1, 0, 0, 1, x, y], SC = (s, t = s) => [s, 0, 0, t, 0, 0], RO = (a) => [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
const D = Math.PI / 180;
const GROUND = [0.96, 0.94, 0.9];
const PW = 1920, PH = 1080; // the camp plate

// the painted door experiment (pack public/film/paint-door): ARPIT's meadow, the door leaf on its own, the light behind it
const DK = PW / 1671, DOOR = { l: 862 * DK, t: 247 * DK, w: 266 * DK, h: 554 * DK };
/** Seconds from the tap on Unveil to the camp: the door swings, the camera walks through into the light. */
export const DOOR_LEN = 2.5;

/** Times after all three have joined (seconds). */
export const SKY_AFTER = 2.2, LEAVE_AFTER_SKY = 3.9;

// ---------- the baked pack ----------
export async function loadPack(base) {
  const [index, bin] = await Promise.all([fetch(`${base}/index.json`).then((r) => r.json()), fetch(`${base}/strokes.bin`).then((r) => r.arrayBuffer())]);
  const q = new DataView(bin);
  const plates = {};
  await Promise.all(index.map(async (e) => {
    const a = new Float32Array(e.n * F);
    for (let i = 0; i < e.n; i++) {
      const p = (e.off + i) * 24, o = i * F;
      a[o] = q.getInt16(p, true) / 4; a[o + 1] = q.getInt16(p + 2, true) / 4; a[o + 2] = q.getInt16(p + 4, true) / 10000;
      a[o + 3] = q.getUint16(p + 6, true) / 32; a[o + 4] = q.getUint16(p + 8, true) / 32;
      for (let k = 0; k < 6; k++) a[o + 5 + k] = q.getUint8(p + 10 + k) / 255;
      a[o + 11] = q.getUint16(p + 16, true) / 60; a[o + 12] = q.getUint8(p + 18); a[o + 13] = 0; a[o + 14] = q.getUint8(p + 19) / 100;
      a[o + 15] = q.getUint8(p + 20) / 255; a[o + 16] = q.getUint8(p + 21) / 100; a[o + 17] = 0; a[o + 18] = q.getInt8(p + 22) / 100; a[o + 19] = q.getUint8(p + 23) / 100;
    }
    const img = new Image();
    img.src = `${base}/${e.name}.webp`;
    await img.decode();
    plates[e.name] = { data: a, img, w: e.w, h: e.h, ox: e.ox, oy: e.oy };
  }));
  return plates;
}

// ---------- posing (character height 1000 units, pivot between the feet) ----------
function viberParts(V, p) {
  const out = [], s = p.s, fl = p.f || 1, base = M3(TR(p.x, p.y), SC(s * fl, s)), bob = p.bob || 0;
  let hipY, legs;
  if (p.sit) { hipY = -150 + bob; legs = [[-1, 64 * D, -64 * D], [1, -64 * D, 64 * D]]; }
  else {
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
  const hd = p.mood === "laugh" ? V.laugh : p.mood === "blink" ? V.blink : V.head;
  if (p.sit) out.push([V.sh, ls], [V.sh, rs], [V.th, lt], [V.th, rt]); else out.push([V.th, lt], [V.sh, ls], [V.th, rt], [V.sh, rs]);
  out.push([V.ua, lu], [V.fa, lf], [V.ua, ru], [V.fa, rf], [V.torso, hip], [hd, H]);
  return out;
}
const blinking = (t, seed) => { const per = 2.6 + (seed % 7) * 0.31, ph = (t + seed * 0.77) % per; return ph < 0.12; };
const wave = (t, sp = 13) => [150, 20 + Math.sin(t * sp) * 22];

export class PaintedScene {
  /** @param {HTMLCanvasElement} canvas @param {Record<string, any>} pack @param {{W:number,H:number}} size @param {Record<string, any> | null} [doorPack] */
  constructor(canvas, pack, { W, H }, doorPack = null) {
    this.W = W; this.H = H;
    const E = (this.E = new Impasto(canvas, { W, H, ss: 1 }));
    this.dyn = new Strokes(2048);
    const P = (this.P = {});
    for (const [n, p] of Object.entries(pack)) P[n] = { b: E.batch(p.data), tex: E.texture(p.img, 0), w: p.w, h: p.h, ox: p.ox, oy: p.oy };
    this.Q = null;
    if (doorPack) { this.Q = {}; for (const [n, p] of Object.entries(doorPack)) this.Q[n] = { b: E.batch(p.data), tex: E.texture(p.img, 0), w: p.w, h: p.h, ox: p.ox, oy: p.oy }; }
    this.V = {};
    for (const n of ["hero", "guitar", "bun", "cap"]) this.V[n] = Object.fromEntries(["head", "blink", "laugh", "torso", "ua", "fa", "th", "sh"].map((k) => [k, P[`${n}.${k}`]]));
    // camera and cast spacing from the screen shape: wide screens see more of the camp
    const wide = W / H >= 1.2;
    this.zoom = wide ? 1.5 : 1.04;
    const visW = W / this.zoom;
    this.k = Math.min(1, visW / 1400);
    this.S = 0.29 * clamp(this.k * 1.3, 0.66, 1);
    this.wide = wide;
    this.C = [1, 0, 0, 1, 0, 0]; this.cam = null; this.AP = -1e6;
  }
  setCam(cx, cy, z) {
    const { W, H } = this, hx = W / 2 / z, hy = H / 2 / z;
    cx = clamp(cx, hx, PW - hx); cy = clamp(cy, hy, PH - hy);
    this.cam = { x: cx, y: cy, zoom: z, rot: 0 };
    this.C = mul(TR(W / 2, H / 2), mul(SC(z), TR(-cx, -cy)));
  }
  put(pl, M, t, ap = this.AP) {
    const Mu = mul(this.C, mul(M, TR(-pl.ox, -pl.oy))), settled = t > ap + 0.45;
    if (settled) this.E.under(pl.tex, pl.w, pl.h, { t, M: Mu, grey: 0 });
    this.E.draw(pl.b, { t, M: Mu, grey: 0, appear: settled ? -1e6 : ap, appDur: 0.1 });
  }
  viber(name, p, t, ap) {
    const V = this.V[name];
    // a little pop as a Viber paints in
    const pop = ap !== undefined ? 1 + 0.12 * Math.sin(Math.PI * seg(t, ap + 0.2, ap + 0.6)) : 1;
    for (const [pl, M] of viberParts(V, { ...p, s: p.s * pop, mood: p.mood ?? (blinking(t, name.length * 3 + 1) ? "blink" : "open") })) this.put(pl, M, t, ap ?? this.AP);
  }
  shadow(x, y, w) { this.dyn.push({ x, y, ang: 0, len: w, wid: w * 0.22, c: [0.16, 0.12, 0.08], type: DAB, alpha: 0.28, hgt: 0.05, seed: x }); }
  fire(t, x, y, s) {
    const f = Math.floor(t * 12), d = this.dyn;
    d.push({ x, y: y - 40 * s, ang: 0, len: 620 * s, wid: 380 * s, c: hex("#ffb24a"), type: DAB, alpha: 0.16 + 0.04 * Math.sin(t * 9), hgt: 0.1, seed: 1 });
    for (const a of [0.25, -0.3]) d.push({ x, y: y + 6 * s, ang: a, len: 200 * s, wid: 28 * s, c: hex("#4a2c1c"), type: KNIFE, seed: a * 10 });
    for (let i = 0; i < 16; i++) {
      const r1 = hash(i * 3.1 + f * 0.37), r2 = hash(i * 7.7 + f * 1.3), ox = (i / 15 - 0.5) * 130 * s;
      const L = (90 + 140 * r1) * s * (1 - Math.abs(i / 15 - 0.5) * 1.1);
      const c = [hex("#d8461e"), hex("#f07a22"), hex("#ffb83a"), hex("#ffe08a")][(i + f) % 4];
      d.push({ x: x + ox + (r2 - 0.5) * 10 * s, y: y - L * 0.5, ang: -Math.PI / 2 + (r2 - 0.5) * 0.5, len: L, wid: (28 + 20 * r2) * s, c, c2: hex("#ffe9a8"), type: BRUSH, taper: 0.9, alpha: 0.95, hgt: 0.6, seed: i + f * 0.1 });
    }
  }
  flush(t, ap) { if (this.dyn.n) { this.E.drawNow(this.dyn.data(), { t, M: this.C, grey: 0, appear: t > ap + 0.45 ? -1e6 : ap, appDur: 0.1 }); this.dyn.clear(); } }
  dog(t, x, y, s, ap) {
    const P = this.P, M = mul(TR(x, y), SC(s));
    this.put(P["dog.tail"], mul(M, mul(TR(-170, -70), RO(-0.6 + Math.sin(t * 14) * 0.45))), t, ap);
    this.put(P["dog.body"], mul(M, RO(Math.sin(t * 2.4) * 0.02)), t, ap);
  }

  camp(t, joins, all) {
    const { P, S, k } = this, cx = 940;
    const kk = ss(seg(t, 0, 10));
    this.setCam(lerp(cx + 40, cx, kk), 700, lerp(this.zoom * 1.06, this.zoom, kk));
    // the camp paints in from t = 0
    const o = { t, cam: this.cam, grey: 0 };
    if (t > 1.3) this.E.under(P.bg.tex, P.bg.w, P.bg.h, o);
    this.E.draw(P.bg.b, { ...o, appear: t < 1.4 ? 0 : -1e6, appDur: 0.14 });
    const X = (dx) => cx + dx * k, Y = 1010;
    const n = joins.filter((j) => j != null).length;
    const laugh = all != null && t > all;
    // shadows and the fire (lit once the first Viber joins)
    this.shadow(X(-60), Y, 170 * S / 0.29);
    if (joins[0] != null) { this.shadow(X(-400), Y, 160 * S / 0.29); this.fire(t, X(-230), Y - 4, 0.5 * S / 0.29); }
    if (joins[1] != null) this.shadow(X(250), Y, 170 * S / 0.29);
    if (joins[2] != null) this.shadow(X(500), Y, 160 * S / 0.29);
    this.flush(t, joins[0] ?? 0.9);
    // the hero: alone, then on the phone, then waving with everyone
    const phone = t > 2.4 && n < 3;
    this.viber("hero", { x: X(-60), y: Y, s: S, armL: phone ? [24, 118] : laugh ? wave(t) : [10, 12], armR: phone ? [24, 118] : [10, 12], headTilt: phone ? 8 : 0, mood: laugh ? "laugh" : undefined, bob: laugh ? Math.sin(t * 6) * 4 : 0 }, t, 0.9);
    if (phone) this.put(P.phone, mul(TR(X(-60), Y), mul(SC(S), TR(0, -585))), t, 2.3);
    if (joins[0] != null) this.viber("guitar", { x: X(-400), y: Y, s: S, armL: t < joins[0] + 1.6 || laugh ? wave(t, 12) : [10, 12], armR: [10, 12], mood: t < joins[0] + 1.6 || laugh ? "laugh" : undefined }, t, joins[0]);
    if (joins[1] != null) this.viber("bun", { x: X(250), y: Y, s: S, f: -1, armL: [10, 12], armR: t < joins[1] + 1.6 || laugh ? wave(t) : [14, 20], mood: t < joins[1] + 1.6 || laugh ? "laugh" : undefined }, t, joins[1]);
    if (joins[2] != null) {
      const j = joins[2];
      this.viber("cap", { x: X(500), y: Y, s: S, f: -1, bob: -Math.max(0, Math.sin((t - j) * 6)) * 14, armL: [150, 10], armR: [150, 10], mood: "laugh" }, t, j);
      if (this.wide) this.dog(t, X(680), Y, 0.2 * S / 0.29, j + 0.3);
    }
  }

  sky(t, t0) {
    const { P, W, H } = this;
    this.setCam(960, lerp(this.wide ? 420 : 540, this.wide ? 380 : 520, seg(t, t0, t0 + 4)), this.wide ? 1.25 : 1.0);
    const inTrans = t < t0 + 1.1, ua = seg(t, t0 + 0.7, t0 + 1.1);
    const o = { t, cam: this.cam, grey: 0 };
    if (ua > 0) this.E.under(P.bg.tex, P.bg.w, P.bg.h, { ...o, alpha: ua });
    this.E.draw(P.bg.b, { ...o, appear: inTrans ? t0 : -1e6, appDur: 0.14 });
    // the paraglider, placed on screen
    const tg = t0 + 0.4, tt = t0 + 1.8, tf = t0 + LEAVE_AFTER_SKY - 0.2;
    if (t < tg) return;
    const A = [940, 200], u = H / 1080, end = Math.max(H / 150, W / 300);
    let s, x, y, a;
    if (t < tt) { const kk = seg(t, tg, tt); s = lerp(0.075, 0.12, kk) * u; x = lerp(W * 0.88, W * 0.55, kk); y = lerp(H * 0.28, H * 0.31, kk) + Math.sin(kk * 5) * 10 * u; a = -0.1 + Math.sin(kk * 3.1) * 0.06; }
    else { const kk = seg(t, tt, tf), e = ss(kk); s = 0.12 * u * Math.pow(end / (0.12 * u), Math.pow(kk, 1.35)); x = lerp(W * 0.55, W / 2, e); y = lerp(H * 0.31, H / 2, e); a = lerp(-0.05, 0, e); }
    const G = mul(TR(x, y), mul(SC(s), mul(RO(a), TR(-A[0], -A[1]))));
    const keep = this.C; this.C = [1, 0, 0, 1, 0, 0];
    for (const [pl, M] of viberParts(this.V.hero, { x: 1040, y: 1090, s: 0.62, sit: true, armL: [166, 4], armR: [166, 4], mood: "laugh", bob: Math.sin(t * 3) * 6 })) this.put(pl, mul(G, M), t, -1e6);
    this.put(P.glider, G, t, -1e6);
    this.C = keep;
  }

  /**
   * The painted door (experiment): the meadow breathes and leaves fall; after the tap (o seconds ago) the door
   * swings outward on its left hinge, warm light behind it, and the camera walks into the doorway until the
   * light fills the screen, which is the paper the camp then paints itself on.
   * @param {number} t seconds since the page showed @param {number|null} o seconds since Unveil was tapped
   */
  doorFrame(t, o) {
    const { Q, W, H, E } = this;
    E.begin(GROUND);
    const fit = Math.max(W / PW, H / PH) * (1.02 + 0.01 * Math.sin(t * 0.6));
    const sw = o == null ? 0 : ss(seg(o, 0.05, 1.25));
    const pk = o == null ? 0 : seg(o, 0.6, DOOR_LEN), push = pk * pk * (1.6 - 0.6 * pk);
    const dx = DOOR.l + DOOR.w / 2, dy = DOOR.t + DOOR.h * 0.52;
    const zEnd = Math.max(W / DOOR.w, H / DOOR.h) * 1.3;
    this.setCam(lerp(dx, dx, push), lerp(PH / 2, dy, push), fit * Math.pow(zEnd / fit, push));
    const o2 = { t, cam: this.cam, grey: 0 };
    E.under(Q.meadow.tex, Q.meadow.w, Q.meadow.h, o2);
    E.draw(Q.meadow.b, { ...o2, appear: -1e6, appDur: 0.14 });
    // a few leaves drifting down across the meadow, until we are through
    if (push < 0.5) {
      for (let i = 0; i < 12; i++) {
        const sp = 40 + hash(i) * 50, y = ((hash(i * 3.3) * PH + t * sp) % (PH + 80)) - 40;
        const x = (hash(i * 7.1) * PW + Math.sin(t * 0.8 + i) * 60 + t * 18) % PW;
        const c = [hex("#9aa63a"), hex("#c9a23a"), hex("#6f8a2e")][i % 3];
        this.dyn.push({ x, y, ang: t * (1 + hash(i)) + i, len: 22 + hash(i * 2) * 14, wid: 11, c, type: DAB, alpha: 0.9, hgt: 0.4, seed: i });
      }
      this.flush(t, -1e6);
    }
    const at = TR(DOOR.l, DOOR.t);
    if (sw > 0) this.put(Q.light, at, t, -1e6);
    // outward on the left hinge: the leaf narrows, its free edge drifts down a little as it comes toward us
    const a = sw * 82 * D;
    this.put(Q.door, mul(at, [Math.cos(a), Math.sin(a) * 0.1, 0, 1, 0, 0]), t, -1e6);
    E.finish({ ground: GROUND, sat: 1.05, contrast: 1.04, expo: 1.02 + push * 0.12, vig: 0.18 * (1 - push), weave: 0, spec: 0.12, norm: 2.6 });
  }

  /** @param {number} t seconds since the door opened @param {{joins:(number|null)[], all:number|null, sky:number|null}} st */
  frame(t, st) {
    this.E.begin(GROUND);
    if (st.sky == null || t < st.sky + 1.1) this.camp(t, st.joins, st.all);
    if (st.sky != null && t >= st.sky) this.sky(t, st.sky);
    this.E.finish({ ground: GROUND, sat: 1.05, contrast: 1.04, expo: 1.02, vig: 0.18, weave: 0, spec: 0.12, norm: 2.6 });
  }
}
