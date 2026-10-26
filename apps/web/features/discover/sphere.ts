/**
 * The Discover sphere: a hand-built 3D scene on a 2D canvas, ported from ARPIT's prototype
 * (docs/design/discovery-prototype.html). No WebGL, so it works where WebGL is weak, and
 * cross-origin photos draw without CORS (we never read pixels back).
 *
 * - Counter-rotating orbit rings of hero cards (people, events and places, interest tokens),
 *   two slowly turning shells of tiny portrait tiles, and airborne dust on shared currents.
 * - Depth cues: perspective size, depth fade, three focus bands (sharp, soft, very soft).
 * - Behaviours: ORBIT → ATTRACTION (matches glow, others recede) → EXTRACTION (curved flights
 *   with trails) → ALIGNMENT (a floating formation the page lays DOM buttons over).
 * - Framerate-independent springs, adaptive quality, and reduced motion = a still frame with
 *   instant arrangement.
 *
 * The room transition from the prototype is left out: rooms are phase 2.
 */

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sstep = (t: number) => {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
};
const easeOut = (t: number, p = 3) => 1 - Math.pow(1 - clamp(t, 0, 1), p);
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}
type Vec3 = [number, number, number];
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(...v);
  return v.map((x) => x / l) as Vec3;
};

/** critically damped spring: x → target, no overshoot, framerate independent (sub-stepped) */
class Spring {
  x: number;
  v = 0;
  t: number;
  constructor(
    value: number,
    private k = 60,
  ) {
    this.x = value;
    this.t = value;
  }
  step(dt: number) {
    const n = Math.ceil(dt / 0.012);
    const h = dt / n;
    const c = 2 * Math.sqrt(this.k);
    for (let i = 0; i < n; i++) {
      const a = this.k * (this.t - this.x) - c * this.v;
      this.v += a * h;
      this.x += this.v * h;
    }
    return this.x;
  }
  snap(v: number) {
    this.x = this.t = v;
    this.v = 0;
  }
}

const CAM = 3.2; // camera distance in sphere radii
const FOCUS = -0.25; // focal plane (toward the camera is negative)
const PERSON_AR = 0.77;
const WORLD_AR = 1.36;
// warm alpine palette, matching the theme tokens in app/globals.css
const KIND_COL: Record<string, string> = { event: "#D97757", place: "#2F6B5C" };
const PEARL = ["#E9F0E9", "#F6EEE1", "#F4E7DD", "#EEF0E4"];
const INK = "#242B28";
const FONT = "Manrope, system-ui, sans-serif";

export type SpherePerson = { uid: string; title: string; photoUrl?: string; pos?: string };
export type SphereWorld = { uid: string; kind: "event" | "place"; photoUrl?: string };
export type SphereTag = { id: string; label: string; col: string };
/** one slot of the formation, in CSS pixels of the canvas */
export type Slot = { x: number; y: number; h: number; rot: number };
/** where a formed card is this frame, so the page can lay a button over it */
export type Formed = { uid: string; x: number; y: number; w: number; h: number; rot: number; slot: number };

export type SphereItem =
  | { kind: "person"; e: SpherePerson }
  | { kind: "tag"; e: SphereTag }
  | { kind: "world"; e: SphereWorld };

type Sprite = { c: HTMLCanvasElement; w: number; h: number; bw?: number; bh?: number; pad: number; down: HTMLCanvasElement[]; ar: number; tag?: boolean };
type Ring = { r: number; om: number; ang: number; u: Vec3; v: Vec3; wob: number };
type Shell = { r: number; ax: Vec3; om: number; ang: number };
type Flight = { phase: "out" | "form" | "back"; t0: number; dur: number; seed: number; active?: boolean; from?: { x: number; y: number } };
type Pos = { x: number; y: number; h: number; rot: number };

type Item = {
  kind: "person" | "world" | "tag" | "crowd";
  uid: string;
  n: number;
  person?: SpherePerson;
  world?: SphereWorld;
  tag?: SphereTag;
  img?: HTMLImageElement;
  built?: boolean;
  spr: Sprite | null;
  hero: boolean;
  ring?: Ring;
  th: number;
  rj: number;
  ph: number;
  fl: number;
  size: number;
  // crowd
  shell?: Shell;
  f?: Vec3;
  dot?: number;
  cr?: Vec3;
  personIdx?: number;
  sz?: number;
  rr?: number;
  // per-frame
  x: number;
  y: number;
  z: number;
  zc: number;
  zs: number;
  k: number;
  sx: number;
  sy: number;
  cx: number;
  cy: number;
  ck: number;
  a: number;
  psx?: number;
  psy?: number;
  drawn: boolean;
  glow: Spring;
  dim: Spring;
  pushS: Spring;
  fx: Spring;
  fy: Spring;
  fk: Spring;
  fly: Flight | null;
  slot: number;
  pos: Pos | null;
  lastH?: number;
  hist: { x: number; y: number }[];
};

/* ---------------------------------------------------------------- sprites */
function mk(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  return c;
}
function ctx(c: HTMLCanvasElement) {
  return c.getContext("2d")!;
}
function rrect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function cover(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, pos?: string) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!iw || !ih) return;
  const [px, py] = (pos ?? "50% 30%").split(" ").map((p) => parseFloat(p) / 100);
  const s = Math.max(w / iw, h / ih);
  const sw = w / s;
  const sh = h / s;
  const sx = clamp((iw - sw) * (isNaN(px) ? 0.5 : px), 0, iw - sw);
  const sy = clamp((ih - sh) * (isNaN(py) ? 0.3 : py), 0, ih - sh);
  g.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
export const initials = (n: string) =>
  n
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
const ready = (img?: HTMLImageElement) => !!img && img.complete && img.naturalWidth > 0;

function soft(c: HTMLCanvasElement, f: number) {
  const s = mk(c.width / f, c.height / f);
  const g = ctx(s);
  g.imageSmoothingQuality = "high";
  g.drawImage(c, 0, 0, s.width, s.height);
  return s;
}

/** a portrait card: soft shadow, white paper border, photo (or an initials tile until the photo arrives) */
function personSprite(sc: number, img: HTMLImageElement | undefined, name: string, pos: string | undefined, seed: number): Sprite {
  const bw = 60 * sc;
  const bh = (60 / PERSON_AR) * sc;
  const pad = 0.12;
  const cw = Math.round(bw * (1 + pad * 2));
  const ch = Math.round(bh * (1 + pad * 2));
  const c = mk(cw, ch);
  const g = ctx(c);
  const x = bw * pad;
  const y = bh * pad * 0.9;
  const r = bw * 0.13;
  const b = bw * 0.055;
  g.save();
  g.shadowColor = "rgba(23,52,45,.26)";
  g.shadowBlur = bw * 0.2;
  g.shadowOffsetY = bw * 0.07;
  g.fillStyle = "#fff";
  rrect(g, x, y, bw, bh, r);
  g.fill();
  g.restore();
  g.fillStyle = "#fff";
  rrect(g, x, y, bw, bh, r);
  g.fill();
  g.save();
  rrect(g, x + b, y + b, bw - 2 * b, bh - 2 * b, r - b * 0.6);
  g.clip();
  if (img && ready(img)) cover(g, img, x + b, y + b, bw - 2 * b, bh - 2 * b, pos);
  else {
    const gr = g.createLinearGradient(x, y, x + bw, y + bh);
    gr.addColorStop(0, PEARL[seed % 4]);
    gr.addColorStop(1, "#DCE2D6");
    g.fillStyle = gr;
    g.fillRect(x, y, bw, bh);
    g.fillStyle = "rgba(23,61,53,.55)";
    g.font = `700 ${bw * 0.34}px ${FONT}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(initials(name), x + bw / 2, y + bh * 0.46);
  }
  g.restore();
  const gl = g.createLinearGradient(0, y + b, 0, y + bh);
  gl.addColorStop(0, "rgba(255,255,255,.22)");
  gl.addColorStop(0.35, "rgba(255,255,255,0)");
  g.fillStyle = gl;
  rrect(g, x + b, y + b, bw - 2 * b, bh - 2 * b, r - b * 0.6);
  g.fill();
  return { c, w: cw, h: ch, bw, bh, pad, down: [soft(c, 3), soft(c, 7)], ar: PERSON_AR };
}

function worldSprite(sc: number, img: HTMLImageElement | undefined, kind: string, seed: number): Sprite {
  const bh = 46 * sc;
  const bw = bh * WORLD_AR;
  const pad = 0.12;
  const cw = Math.round(bw * (1 + pad * 2));
  const ch = Math.round(bh * (1 + pad * 2.2));
  const c = mk(cw, ch);
  const g = ctx(c);
  const x = bw * pad;
  const y = bh * pad;
  const r = bh * 0.16;
  const b = bh * 0.07;
  g.save();
  g.shadowColor = "rgba(23,52,45,.22)";
  g.shadowBlur = bh * 0.28;
  g.shadowOffsetY = bh * 0.1;
  g.fillStyle = "#fff";
  rrect(g, x, y, bw, bh, r);
  g.fill();
  g.restore();
  g.save();
  rrect(g, x + b, y + b, bw - 2 * b, bh - 2 * b, r - b * 0.5);
  g.clip();
  if (img && ready(img)) cover(g, img, x + b, y + b, bw - 2 * b, bh - 2 * b, "50% 50%");
  else {
    const gr = g.createLinearGradient(x, y, x + bw, y + bh);
    gr.addColorStop(0, PEARL[seed % 4]);
    gr.addColorStop(1, "#D8DFD2");
    g.fillStyle = gr;
    g.fillRect(x, y, bw, bh);
  }
  g.fillStyle = KIND_COL[kind] ?? "#E7BC69";
  g.globalAlpha = 0.95;
  g.fillRect(x + b, y + bh - b - bh * 0.1, bw - 2 * b, bh * 0.1);
  g.restore();
  return { c, w: cw, h: ch, bw, bh, pad, down: [soft(c, 3), soft(c, 7)], ar: WORLD_AR };
}

function tagSprite(sc: number, label: string, col: string): Sprite {
  const f = 15 * sc;
  const g0 = ctx(mk(4, 4));
  g0.font = `700 ${f}px ${FONT}`;
  const tw = g0.measureText("#" + label).width;
  const bh = f * 2.1;
  const bw = tw + f * 2.2;
  const cw = Math.round(bw + f * 1.2);
  const ch = Math.round(bh + f * 1.4);
  const c = mk(cw, ch);
  const g = ctx(c);
  const x = f * 0.6;
  const y = f * 0.55;
  g.save();
  g.shadowColor = "rgba(23,52,45,.2)";
  g.shadowBlur = f * 0.7;
  g.shadowOffsetY = f * 0.25;
  g.fillStyle = "#fff";
  rrect(g, x, y, bw, bh, bh / 2);
  g.fill();
  g.restore();
  g.fillStyle = col;
  g.beginPath();
  g.arc(x + f * 0.95, y + bh / 2, f * 0.34, 0, TAU);
  g.fill();
  g.fillStyle = INK;
  g.font = `700 ${f}px ${FONT}`;
  g.textBaseline = "middle";
  g.fillText("#" + label, x + f * 1.55, y + bh / 2 + f * 0.04);
  return { c, w: cw, h: ch, bw, bh, pad: 0.25, down: [soft(c, 2), soft(c, 4)], ar: cw / ch, tag: true };
}

/** a face-sized crop of a person card for the crowd shells */
function tileSprite(sc: number, src: Sprite): Sprite {
  const s = Math.round(34 * sc);
  const c = mk(s, s);
  const g = ctx(c);
  g.save();
  rrect(g, 0, 0, s, s, s * 0.2);
  g.clip();
  g.fillStyle = "#fff";
  g.fillRect(0, 0, s, s);
  g.drawImage(src.c, src.w * 0.2, src.h * 0.17, src.w * 0.6, src.w * 0.6, s * 0.06, s * 0.06, s * 0.88, s * 0.88);
  g.restore();
  return { c, w: s, h: s, pad: 0, down: [soft(c, 2), soft(c, 4)], ar: 1 };
}

function glowSprite() {
  const c = mk(160, 160);
  const g = ctx(c);
  const gr = g.createRadialGradient(80, 80, 6, 80, 80, 80);
  gr.addColorStop(0, "rgba(231,188,105,.6)");
  gr.addColorStop(0.35, "rgba(217,119,87,.26)");
  gr.addColorStop(0.7, "rgba(231,188,105,.10)");
  gr.addColorStop(1, "rgba(231,188,105,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 160, 160);
  return c;
}

export type SphereOptions = {
  reduced?: boolean;
  onPick?: (it: SphereItem) => void;
  onHover?: (it: SphereItem | null, p?: { x: number; y: number }) => void;
  /** called every drawn frame with the formed cards, so DOM buttons can ride on them */
  onFormed?: (formed: Formed[]) => void;
};

type Dust = { n: number; p: Float32Array; g: Uint8Array; s: Float32Array; c: Uint8Array; out: Float32Array; groups: Shell[] };

export class Sphere {
  private g: CanvasRenderingContext2D;
  private items: Item[] = [];
  private byUid = new Map<string, Item>();
  private persons: Item[] = [];
  private tiles = new Map<number, Sprite>();
  private rings: Ring[] = [];
  private shells: Shell[] = [];
  private dust!: Dust;
  private t = 0;
  private last = 0;
  private frame = 0;
  private running = false;
  private dirty = true;
  private needSprites = false;
  private reduced: boolean;
  private paused = false;
  private quality = 0;
  private ema = 16;
  private yaw = new Spring(0, 40);
  private pitch = new Spring(0, 40);
  private yawView = 0;
  private pitchView = 0;
  private spinV = 0;
  private drag: { x: number; y: number; moved: number; ts: number } | null = null;
  private vYaw = 0;
  private px = 0.5;
  private py = 0.5;
  private speed = new Spring(1, 14);
  private boost = 0;
  private punch = new Spring(0, 30);
  private flash = 0;
  private L = { cx: new Spring(0, 36), cy: new Spring(0, 36), S: new Spring(1, 36), a: new Spring(1, 30) };
  private intro = 0;
  private mode: "idle" | "form" = "idle";
  private slots: Slot[] = [];
  private searching = false;
  private rel = new Map<string, number>();
  private hover: Item | null = null;
  private hit: { it: Item; x0: number; x1: number; y0: number; y1: number }[] = [];
  private glow: HTMLCanvasElement | null = null;
  private sc = 2;
  private dpr = 1;
  private W = 0;
  private H = 0;
  private bg: HTMLCanvasElement | null = null;
  private lastFormH = 150;
  private ro: ResizeObserver;
  private disposed = false;
  private cleanups: (() => void)[] = [];

  constructor(
    private cv: HTMLCanvasElement,
    private o: SphereOptions = {},
  ) {
    this.g = cv.getContext("2d", { alpha: false })!;
    this.reduced = !!o.reduced;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(cv.parentElement ?? cv);
    this.bind();
    this.resize();
  }

  /* ---------- setup ---------- */
  load(people: SpherePerson[], worlds: SphereWorld[], tags: SphereTag[]) {
    const R = rng(7);
    this.sc = clamp(this.dpr * 1.3, 1.5, 2.6);
    this.glow = glowSprite();
    const tilts: [number, number][] = [[0.15, 0], [0.6, 0.5], [1.0, -0.7], [1.35, 0.2], [0.4, -1.1], [0.85, 1.2], [1.2, -0.3], [1.5, 0.9]];
    const radii = [0.84, 0.96, 1.08, 1.2, 1.3, 1.02, 1.16, 1.26];
    const oms = [0.52, -0.64, 0.78, -0.9, 1.1, -0.72, 0.96, -1.2];
    this.rings = tilts.map(([a, b], i) => ({
      r: radii[i],
      om: oms[i],
      ang: R() * TAU,
      u: [Math.cos(b), Math.sin(b), 0],
      v: [-Math.cos(a) * Math.sin(b), Math.cos(a) * Math.cos(b), Math.sin(a)],
      wob: 0.03 + R() * 0.03,
    }));
    this.shells = [
      { r: 0.58, ax: norm([0.3, 1, 0.2]), om: -0.16, ang: 0 },
      { r: 0.99, ax: norm([-0.25, 1, -0.4]), om: 0.1, ang: 0 },
    ];
    // hero pool: every person once, worlds and tags interleaved, spread across the rings
    const pool: SphereItem[] = [
      ...people.map((e) => ({ kind: "person" as const, e })),
      ...worlds.map((e) => ({ kind: "world" as const, e })),
      ...tags.map((e) => ({ kind: "tag" as const, e })),
    ];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(R() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const per = pool.length / this.rings.length;
    const ringOf = pool.map((_, idx) => this.rings[Math.min(this.rings.length - 1, Math.floor(idx / per))]);
    const th = new Map<number, number>();
    this.rings.forEach((ring) => {
      const mine = pool.map((_, i) => i).filter((i) => ringOf[i] === ring);
      mine.forEach((i, k) => th.set(i, (k / mine.length) * TAU + (R() - 0.5) * 0.25));
    });
    this.items = [];
    this.byUid.clear();
    pool.forEach((p, i) => {
      const uid = p.kind === "tag" ? "t:" + p.e.id : p.e.uid;
      const it = this.item(p.kind, uid, i);
      it.ring = ringOf[i];
      it.th = th.get(i)!;
      it.rj = 1 + (R() - 0.5) * 0.06;
      it.ph = R() * TAU;
      it.fl = 0.6 + R() * 0.8;
      it.hero = true;
      it.size = p.kind === "person" ? 0.27 : p.kind === "world" ? 0.17 : 0.07;
      if (p.kind === "person") it.person = p.e;
      else if (p.kind === "world") it.world = p.e;
      else it.tag = p.e;
      this.items.push(it);
      this.byUid.set(uid, it);
    });
    this.persons = this.items.filter((it) => it.kind === "person");
    // crowd shells: tiny portrait tiles on Fibonacci spheres; decorative, never interactive
    const nCrowd = [110, 300];
    this.shells.forEach((sh, si) => {
      const n = nCrowd[si];
      for (let k = 0; k < n; k++) {
        const y = 1 - (2 * (k + 0.5)) / n;
        const rr = Math.sqrt(1 - y * y);
        const phi = k * 2.399963;
        const f: Vec3 = [Math.cos(phi) * rr, y, Math.sin(phi) * rr];
        const a = sh.ax;
        const it = this.item("crowd", `c:${si}:${k}`, 1000 + si * 1000 + k);
        it.f = f;
        it.dot = a[0] * f[0] + a[1] * f[1] + a[2] * f[2];
        it.cr = [a[1] * f[2] - a[2] * f[1], a[2] * f[0] - a[0] * f[2], a[0] * f[1] - a[1] * f[0]];
        it.shell = sh;
        it.personIdx = Math.floor(R() * Math.max(1, people.length));
        it.sz = (si ? 0.115 : 0.09) * (0.85 + R() * 0.4);
        it.rr = R();
        it.fl = 0.6 + R() * 0.8;
        it.ph = R() * TAU;
        this.items.push(it);
      }
    });
    // dust: airborne motes on a few shared currents
    const nd = 1100;
    const dust: Dust = { n: nd, p: new Float32Array(nd * 3), g: new Uint8Array(nd), s: new Float32Array(nd), c: new Uint8Array(nd), out: new Float32Array(nd * 4), groups: [] };
    for (let i = 0; i < nd; i++) {
      const r = 0.25 + Math.pow(R(), 0.7) * 2.5;
      const a = R() * TAU;
      const y = R() * 2 - 1;
      const rr = Math.sqrt(1 - y * y);
      dust.p[i * 3] = Math.cos(a) * rr * r;
      dust.p[i * 3 + 1] = y * r;
      dust.p[i * 3 + 2] = Math.sin(a) * rr * r;
      dust.g[i] = i % 6;
      dust.s[i] = R() < 0.07 ? 2.2 : R() < 0.35 ? 1.5 : 1;
      dust.c[i] = R() < 0.1 ? 1 : R() < 0.2 ? 2 : R() < 0.55 ? 0 : 3;
    }
    for (let gI = 0; gI < 6; gI++) dust.groups.push({ r: 1, ax: norm([R() - 0.5, 1 + R(), R() - 0.5]), om: (gI % 2 ? -1 : 1) * (0.07 + R() * 0.2), ang: R() * TAU });
    this.dust = dust;
    this.loadImages();
    this.buildSprites(true);
    this.dirty = true;
  }

  private item(kind: Item["kind"], uid: string, n: number): Item {
    return {
      kind, uid, n, spr: null, hero: false, th: 0, rj: 1, ph: 0, fl: 1, size: 0.3,
      x: 0, y: 0, z: 0, zc: 0, zs: 0, k: 1, sx: 0, sy: 0, cx: 0, cy: 0, ck: 1, a: 1, drawn: false,
      glow: new Spring(0, 60), dim: new Spring(0, 40), pushS: new Spring(0, 40),
      fx: new Spring(0, 60), fy: new Spring(0, 60), fk: new Spring(1, 60), fly: null, slot: 0, pos: null, hist: [],
    };
  }

  private loadImages() {
    for (const it of this.items) {
      const url = it.person?.photoUrl ?? it.world?.photoUrl;
      if (!url) continue;
      const im = new Image();
      im.decoding = "async";
      im.onload = () => {
        this.needSprites = true;
        this.dirty = true;
      };
      im.src = url;
      it.img = im;
    }
  }

  /** (re)build sprites; photos that have arrived replace the initials tiles without any layout change */
  private buildSprites(first: boolean) {
    let budget = first ? Infinity : 4;
    const stale = new Set<number>();
    for (const it of this.items) {
      if (budget <= 0 || it.kind === "crowd") continue;
      const ok = ready(it.img);
      if (it.spr && (it.built || !ok)) continue;
      budget--;
      if (it.kind === "person") {
        it.spr = personSprite(this.sc, ok ? it.img : undefined, it.person!.title, it.person!.pos, it.n);
        it.built = ok;
        if (ok) stale.add(this.persons.indexOf(it));
      } else if (it.kind === "world") {
        it.spr = worldSprite(this.sc, ok ? it.img : undefined, it.world!.kind, it.n);
        it.built = ok;
      } else {
        it.spr = tagSprite(this.sc, it.tag!.label, it.tag!.col);
        it.built = true;
      }
    }
    // crowd tiles reuse the person sprites; a tile is rebuilt only when its person's photo has arrived
    stale.forEach((i) => this.tiles.delete(i));
    const np = this.persons.length;
    for (const it of this.items) {
      if (it.kind !== "crowd" || !np) continue;
      const idx = it.personIdx! % np;
      if (it.spr && !stale.has(idx)) continue;
      const src = this.persons[idx].spr;
      if (!src) continue;
      let tile = this.tiles.get(idx);
      if (!tile) {
        tile = tileSprite(this.sc, src);
        this.tiles.set(idx, tile);
      }
      it.spr = tile;
    }
    this.needSprites = this.items.some((it) => (it.kind === "person" || it.kind === "world") && ready(it.img) && !it.built);
    this.dirty = true;
  }

  /* ---------- events ---------- */
  private bind() {
    const cv = this.cv;
    const pt = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const move = (e: PointerEvent) => {
      const p = pt(e);
      this.px = p.x / this.W;
      this.py = p.y / this.H;
      if (this.drag) {
        const dx = p.x - this.drag.x;
        const dy = p.y - this.drag.y;
        this.drag.moved += Math.abs(dx) + Math.abs(dy);
        const S = this.L.S.x;
        this.yaw.x += dx / (S * 1.2);
        this.yaw.t = this.yaw.x;
        this.pitch.x = clamp(this.pitch.x + dy / (S * 1.6), -0.7, 0.7);
        this.pitch.t = this.pitch.x;
        this.vYaw = dx / (S * 1.2) / Math.max(0.008, (e.timeStamp - this.drag.ts) / 1000);
        this.drag.x = p.x;
        this.drag.y = p.y;
        this.drag.ts = e.timeStamp;
      } else this.setHover(this.pick(p.x, p.y), p);
      this.dirty = true;
    };
    const down = (e: PointerEvent) => {
      if (e.button > 0) return;
      const p = pt(e);
      this.drag = { x: p.x, y: p.y, moved: 0, ts: e.timeStamp };
      try {
        cv.setPointerCapture(e.pointerId);
      } catch {
        /* not all pointers can be captured */
      }
    };
    const up = (e: PointerEvent) => {
      if (!this.drag) return;
      const d = this.drag;
      this.drag = null;
      const p = pt(e);
      if (d.moved < 6) {
        const it = this.pick(p.x, p.y);
        if (it) this.o.onPick?.(this.public(it));
      } else this.spinV = clamp(this.vYaw, -2.2, 2.2) * 0.5;
    };
    const cancel = () => (this.drag = null);
    const leave = () => {
      this.px = 0.5;
      this.py = 0.5;
      this.setHover(null);
    };
    const vis = () => (document.hidden ? this.stop() : this.start());
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", cancel);
    cv.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", vis);
    this.cleanups.push(() => {
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerdown", down);
      cv.removeEventListener("pointerup", up);
      cv.removeEventListener("pointercancel", cancel);
      cv.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", vis);
    });
  }
  private public(it: Item): SphereItem {
    if (it.kind === "person") return { kind: "person", e: it.person! };
    if (it.kind === "tag") return { kind: "tag", e: it.tag! };
    return { kind: "world", e: it.world! };
  }
  private setHover(it: Item | null, p?: { x: number; y: number }) {
    if (it !== this.hover) {
      this.hover = it;
      this.cv.style.cursor = it ? "pointer" : "";
    }
    this.o.onHover?.(it ? this.public(it) : null, p);
  }
  private pick(x: number, y: number) {
    for (let i = this.hit.length - 1; i >= 0; i--) {
      const h = this.hit[i];
      if (x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1) return h.it;
    }
    return null;
  }

  resize() {
    const par = this.cv.parentElement ?? this.cv;
    const r = par.getBoundingClientRect();
    const W = Math.max(320, Math.round(r.width));
    const H = Math.max(320, Math.round(r.height));
    const dpr = Math.min(this.quality >= 2 ? 1 : 2, window.devicePixelRatio || 1, 1.75);
    if (W === this.W && H === this.H && dpr === this.dpr) return;
    this.W = W;
    this.H = H;
    this.dpr = dpr;
    this.cv.width = Math.round(W * dpr);
    this.cv.height = Math.round(H * dpr);
    this.cv.style.width = W + "px";
    this.cv.style.height = H + "px";
    this.layoutTargets(true);
    this.bake();
    this.dirty = true;
    this.draw(0);
  }
  get narrow() {
    return this.W < 720;
  }
  /** where the sphere sits for the current mode */
  private layoutTargets(snap: boolean) {
    const { W, H, L } = this;
    const n = this.narrow;
    const base = n ? Math.min(W * 0.33, H * 0.2) : Math.min(W * 0.24, H * 0.262);
    let cy = n ? H * 0.37 : H * 0.475;
    let S = base;
    let a = 1;
    if (this.mode === "form") {
      cy = n ? H * 0.2 : H * 0.28;
      S = base * 0.62;
      a = 0.62;
    }
    L.cx.t = W / 2;
    L.cy.t = cy;
    L.S.t = S;
    L.a.t = a;
    if (snap || this.reduced) Object.values(L).forEach((s) => s.snap(s.t));
  }
  private bake() {
    const { W, H, dpr: d } = this;
    const c = mk(W * d, H * d);
    const g = ctx(c);
    g.scale(d, d);
    const gr = g.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H * 0.5, Math.max(W, H) * 0.78);
    gr.addColorStop(0, "#FFFEFA");
    gr.addColorStop(0.5, "#F8F6F0");
    gr.addColorStop(1, "#EBE7DC");
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    // faint sage and gold tints in the corners and soft sunlight from the upper right
    const t1 = g.createRadialGradient(W * 0.08, H * 0.1, 0, W * 0.08, H * 0.1, W * 0.5);
    t1.addColorStop(0, "rgba(120,165,135,.1)");
    t1.addColorStop(1, "rgba(120,165,135,0)");
    g.fillStyle = t1;
    g.fillRect(0, 0, W, H);
    const t2 = g.createRadialGradient(W * 0.95, H * 0.95, 0, W * 0.95, H * 0.95, W * 0.5);
    t2.addColorStop(0, "rgba(231,188,105,.12)");
    t2.addColorStop(1, "rgba(231,188,105,0)");
    g.fillStyle = t2;
    g.fillRect(0, 0, W, H);
    g.save();
    g.translate(W * 1.05, -H * 0.1);
    for (const [ang, w, al] of [[2.25, 0.13, 0.07], [2.5, 0.08, 0.045], [2.05, 0.06, 0.05]]) {
      const len = Math.max(W, H) * 1.6;
      const gg = g.createLinearGradient(0, 0, Math.cos(ang) * len, Math.sin(ang) * len);
      gg.addColorStop(0, `rgba(240,200,130,${al * 1.2})`);
      gg.addColorStop(1, "rgba(240,200,130,0)");
      g.fillStyle = gg;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(ang - w) * len, Math.sin(ang - w) * len);
      g.lineTo(Math.cos(ang + w) * len, Math.sin(ang + w) * len);
      g.closePath();
      g.fill();
    }
    g.restore();
    this.bg = c;
  }

  /* ---------- public controls ---------- */
  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame((t) => this.tick(t));
  }
  stop() {
    this.running = false;
  }
  dispose() {
    this.disposed = true;
    this.stop();
    this.ro.disconnect();
    this.cleanups.forEach((f) => f());
  }
  setReduced(v: boolean) {
    this.reduced = v;
    this.layoutTargets(true);
    this.dirty = true;
    this.start();
  }
  setPaused(v: boolean) {
    this.paused = v;
    this.dirty = true;
  }
  /** what matches the thought (uid → 0..1) glows; the rest recedes. null = no thought yet */
  setRelevance(map: Map<string, number> | null) {
    this.rel = map ?? new Map();
    this.searching = !!map;
    if (map) this.boost = Math.max(this.boost, 0.8);
    this.dirty = true;
  }
  setFormation(slots: Slot[]) {
    this.slots = slots;
    this.dirty = true;
  }
  /** pull these people out of the sphere, in order; anyone no longer listed returns to orbit */
  extract(uids: string[]) {
    const now = this.t;
    const set = new Set(uids);
    uids.forEach((uid, i) => {
      const it = this.byUid.get(uid);
      if (!it || it.kind !== "person" || !this.slots[i]) return;
      it.slot = i;
      if (it.fly && (it.fly.phase === "form" || it.fly.phase === "out")) return; // already on its way: only the slot changes
      const delay = this.reduced ? 0 : 0.05 + i * 0.085 + (it.n % 3) * 0.03;
      it.fly = { phase: "out", t0: now + delay, dur: this.reduced ? 0.01 : 1.05 + (i % 4) * 0.1, seed: (it.n * 37) % 11 };
      it.hist.length = 0;
    });
    for (const it of this.items) if (it.fly && it.fly.phase !== "back" && !set.has(it.uid)) this.release1(it);
    if (uids.length) {
      this.boost = 1;
      this.punch.t = 1;
      this.flash = 1;
      setTimeout(() => (this.punch.t = 0), 520);
      this.setMode("form");
    } else this.setMode("idle");
    this.dirty = true;
    this.start();
  }
  release() {
    this.extract([]);
  }
  private release1(it: Item) {
    if (it.fly?.phase === "out" && !it.fly.active) {
      it.fly = null;
      return;
    }
    it.fly = { phase: "back", t0: this.t, dur: this.reduced ? 0.01 : 1.1, seed: 0, from: { x: it.cx, y: it.cy } };
  }
  private setMode(m: "idle" | "form") {
    this.mode = m;
    this.layoutTargets(false);
  }

  /* ---------- frame ---------- */
  private tick(now: number) {
    if (!this.running) return;
    requestAnimationFrame((t) => this.tick(t));
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (!(dt > 0)) return;
    dt = Math.min(dt, 0.05);
    this.ema = this.ema * 0.95 + dt * 1000 * 0.05;
    // adaptive quality: drop detail on slow devices
    if (this.frame++ % 90 === 89 && this.ema > 26 && this.quality < 2) {
      this.quality++;
      if (this.quality === 2) this.resize();
      this.dirty = true;
    }
    const moving = !this.reduced && !this.paused;
    if (!this.dirty && !moving && !this.busy()) return;
    if (this.needSprites) this.buildSprites(false);
    this.t += dt;
    this.update(dt);
    this.draw(dt);
    this.dirty = false;
  }
  private busy() {
    return this.items.some((it) => it.fly) || this.intro < 1 || Math.abs(this.L.cy.x - this.L.cy.t) > 0.5 || Math.abs(this.L.S.x - this.L.S.t) > 0.5;
  }

  private update(dt: number) {
    Object.values(this.L).forEach((s) => s.step(dt));
    if (this.intro < 1) this.intro = Math.min(1, this.intro + dt / (this.reduced ? 0.3 : 2.4));
    // speed: calm on hover, boosted when the thought changes, frozen when paused or reduced
    const hov = this.hover ? 0.5 : 1;
    this.boost = Math.max(0, this.boost - dt * 0.75);
    this.speed.t = this.paused || this.reduced ? 0 : hov * (1 + this.boost * 1.15);
    this.speed.step(dt);
    const gust = 1 + 0.16 * Math.sin(this.t * 0.7) + 0.1 * Math.sin(this.t * 1.9 + 1);
    const sp = this.speed.x * gust;
    this.rings.forEach((r) => (r.ang += r.om * sp * dt));
    this.shells.forEach((s) => (s.ang += s.om * this.speed.x * dt));
    this.dust.groups.forEach((g) => (g.ang += g.om * this.speed.x * dt));
    // orientation: slow idle spin + pointer parallax + dragged inertia
    if (!this.drag) this.spinV *= Math.pow(0.1, dt);
    const free = this.paused || this.reduced ? 0 : 0.055;
    if (!this.drag) {
      this.yaw.t += (free + this.spinV) * dt;
      this.yaw.x += (free + this.spinV) * dt;
    }
    const ptY = this.reduced ? 0 : (this.px - 0.5) * 0.32;
    const ptX = this.reduced ? 0 : (this.py - 0.5) * 0.2;
    this.pitch.t = clamp(this.pitch.t, -0.7, 0.7);
    this.pitchView = this.pitch.step(dt) + ptX;
    this.yawView = this.yaw.x + ptY;
    this.punch.step(dt);
    this.flash = Math.max(0, this.flash - dt * 1.4);
  }

  private draw(dt: number) {
    if (!this.bg || !this.dust) return;
    const { g, dpr: d, W, H, L, t } = this;
    const cx = L.cx.x;
    const cy = L.cy.x;
    const S = L.S.x * (1 + this.punch.x * 0.05);
    const sphA = L.a.x;
    const cosY = Math.cos(this.yawView);
    const sinY = Math.sin(this.yawView);
    const cosX = Math.cos(this.pitchView);
    const sinX = Math.sin(this.pitchView);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.drawImage(this.bg, 0, 0);
    g.setTransform(d, 0, 0, d, 0, 0);
    this.hit.length = 0;
    const intro = this.intro;
    const zoom = (1 + this.punch.x * 0.035) * (this.reduced ? 1 : lerp(0.82, 1, easeOut(intro, 3)));
    const out = { ok: false, x: 0, y: 0, z: 0, k: 1, sx: 0, sy: 0 };
    const proj = (x0: number, y0: number, z0: number) => {
      const x1 = x0 * cosY + z0 * sinY;
      const z1 = -x0 * sinY + z0 * cosY;
      const y2 = y0 * cosX - z1 * sinX;
      const z2 = y0 * sinX + z1 * cosX;
      const den = CAM + z2;
      if (den < 0.45) {
        out.ok = false;
        return out;
      }
      const k = (CAM / den) * zoom;
      out.ok = true;
      out.x = x1;
      out.y = y2;
      out.z = z2;
      out.k = k;
      out.sx = cx + x1 * S * k;
      out.sy = cy + y2 * S * k;
      return out;
    };

    // light: soft glow behind the sphere, a faint contact shadow beneath
    const R1 = S * 1.7;
    const glow = g.createRadialGradient(cx, cy, S * 0.1, cx, cy, R1);
    glow.addColorStop(0, `rgba(255,255,255,${0.95 * sphA})`);
    glow.addColorStop(0.5, `rgba(236,232,214,${0.35 * sphA + this.flash * 0.1})`);
    glow.addColorStop(1, "rgba(236,232,214,0)");
    g.fillStyle = glow;
    g.fillRect(cx - R1, cy - R1, R1 * 2, R1 * 2);
    g.save();
    g.translate(cx, cy + S * 1.62);
    g.scale(1, 0.12);
    const sh = g.createRadialGradient(0, 0, 0, 0, 0, S * 1.1);
    sh.addColorStop(0, `rgba(23,61,53,${0.16 * sphA})`);
    sh.addColorStop(1, "rgba(23,61,53,0)");
    g.fillStyle = sh;
    g.fillRect(-S * 1.2, -S * 1.2, S * 2.4, S * 2.4);
    g.restore();

    // orbit paths
    if (this.quality < 2) {
      g.lineWidth = 1;
      for (const ring of this.rings) {
        const front = new Path2D();
        const back = new Path2D();
        let pf = false;
        let pb = false;
        for (let i = 0; i <= 72; i++) {
          const a = (i / 72) * TAU;
          const c = Math.cos(a) * ring.r;
          const s = Math.sin(a) * ring.r;
          const p = proj(c * ring.u[0] + s * ring.v[0], c * ring.u[1] + s * ring.v[1], c * ring.u[2] + s * ring.v[2]);
          if (!p.ok) {
            pf = pb = false;
            continue;
          }
          if (p.z < 0) {
            if (!pf) front.moveTo(p.sx, p.sy);
            else front.lineTo(p.sx, p.sy);
            pf = true;
            pb = false;
          } else {
            if (!pb) back.moveTo(p.sx, p.sy);
            else back.lineTo(p.sx, p.sy);
            pb = true;
            pf = false;
          }
        }
        g.strokeStyle = `rgba(140,145,132,${0.15 * sphA})`;
        g.stroke(back);
        g.strokeStyle = `rgba(104,112,100,${0.28 * sphA})`;
        g.stroke(front);
      }
    }

    // dust
    const dst = this.dust;
    const nd = Math.floor(dst.n * (this.quality === 0 ? 1 : this.quality === 1 ? 0.55 : 0.25));
    const gc = dst.groups.map((q) => ({ c: Math.cos(q.ang), s: Math.sin(q.ang), a: q.ax }));
    for (let i = 0; i < nd; i++) {
      const q = gc[dst.g[i]];
      const ax = q.a;
      const x = dst.p[i * 3];
      const y = dst.p[i * 3 + 1];
      const z = dst.p[i * 3 + 2];
      const dot = ax[0] * x + ax[1] * y + ax[2] * z;
      const { c, s } = q;
      const rx = x * c + (ax[1] * z - ax[2] * y) * s + ax[0] * dot * (1 - c);
      const ry = y * c + (ax[2] * x - ax[0] * z) * s + ax[1] * dot * (1 - c);
      const rz = z * c + (ax[0] * y - ax[1] * x) * s + ax[2] * dot * (1 - c);
      const p = proj(rx, ry, rz);
      const o = dst.out;
      if (!p.ok || p.sx < -20 || p.sx > W + 20 || p.sy < -20 || p.sy > H + 20) {
        o[i * 4 + 3] = 0;
        continue;
      }
      o[i * 4] = p.sx;
      o[i * 4 + 1] = p.sy;
      o[i * 4 + 2] = p.z;
      o[i * 4 + 3] = p.k;
    }
    const dustPass = (near: boolean) => {
      const colors = ["#2F5A4F", "#D97757", "#E7BC69", "#A9ADA2"];
      for (let ci = 0; ci < 4; ci++) {
        g.fillStyle = colors[ci];
        for (let i = 0; i < nd; i++) {
          if (dst.c[i] !== ci) continue;
          const o = dst.out;
          const k = o[i * 4 + 3];
          if (k === 0) continue;
          const zc = o[i * 4 + 2];
          if (zc < -0.15 !== near) continue;
          g.globalAlpha = clamp(0.5 - zc * 0.16, 0.1, 0.55) * (ci === 3 ? 0.7 : 1) * Math.max(0.35, sphA + 0.25);
          const sz = dst.s[i] * clamp(k, 0.5, 2) * (ci === 0 ? 1.1 : 1);
          g.fillRect(o[i * 4], o[i * 4 + 1], sz, sz);
        }
      }
      g.globalAlpha = 1;
    };
    dustPass(false);

    /* ---- cards: project, resolve flights, sort back → front ---- */
    const qualCrowd = this.quality === 0 ? 1 : this.quality === 1 ? 0.55 : 0.28;
    const visible: Item[] = [];
    for (const it of this.items) {
      it.drawn = false;
      if (!it.spr) continue;
      if (it.kind === "crowd" && it.rr! > qualCrowd) continue;
      let wx: number;
      let wy: number;
      let wz: number;
      if (it.kind === "crowd") {
        const shl = it.shell!;
        const c = Math.cos(shl.ang);
        const s = Math.sin(shl.ang);
        const a = shl.ax;
        const f = it.f!;
        const cr = it.cr!;
        wx = (f[0] * c + cr[0] * s + a[0] * it.dot! * (1 - c)) * shl.r;
        wy = (f[1] * c + cr[1] * s + a[1] * it.dot! * (1 - c)) * shl.r;
        wz = (f[2] * c + cr[2] * s + a[2] * it.dot! * (1 - c)) * shl.r;
      } else {
        const ring = it.ring!;
        const th = it.th + ring.ang + Math.sin(t * 0.8 + it.ph) * 0.012 * it.fl;
        const rr = ring.r * it.rj * (1 + 0.035 * Math.sin(t * 0.9 + it.ph)) * (1 + it.pushS.x * 0.16);
        const c = Math.cos(th) * rr;
        const s = Math.sin(th) * rr;
        wx = c * ring.u[0] + s * ring.v[0];
        wy = c * ring.u[1] + s * ring.v[1] + Math.sin(th * 3 + it.ph) * ring.wob * rr * 0.5;
        wz = c * ring.u[2] + s * ring.v[2];
      }
      const p = proj(wx, wy, wz);
      if (!p.ok) continue;
      it.x = p.x;
      it.y = p.y;
      it.z = p.z;
      it.zc = p.z;
      it.k = p.k;
      it.sx = p.sx;
      it.sy = p.sy;
      // appear: staggered rise from the dust while the scene assembles
      it.a = this.reduced ? 1 : clamp((intro * 1.4 - ((it.n % 97) / 97) * 0.6) / 0.5, 0, 1);
      if (it.a <= 0.01) continue;
      // orbit position this frame; a flight starts from here and overwrites it with where the card is
      it.cx = it.sx;
      it.cy = it.sy;
      it.ck = it.k;
      it.zs = p.z;
      // relevance → glow, dim, recede
      const r = it.hero ? (this.searching ? (this.rel.get(it.uid) ?? 0) : -1) : -1;
      it.glow.t = r > 0 ? r : 0;
      it.dim.t = this.searching && it.hero && r <= 0 ? 1 : 0;
      it.pushS.t = it.dim.t;
      it.glow.step(dt);
      it.dim.step(dt);
      it.pushS.step(dt);
      if (it.fly) this.flight(it, dt);
      visible.push(it);
    }
    visible.sort((a, b) => b.zs - a.zs); // far → near

    const formed: Formed[] = [];
    for (const it of visible) {
      const spr = it.spr!;
      const own = !!it.fly?.active && !!it.pos;
      let sx = it.sx;
      let sy = it.sy;
      const k = it.k;
      const zc = it.zc;
      if (own) {
        sx = it.pos!.x;
        sy = it.pos!.y;
      }
      const base = it.kind === "crowd" ? it.sz! * S : it.size * S;
      let h = base * k;
      if (own && it.kind === "person") h = it.pos!.h;
      let w = h * spr.ar;
      // depth of field band + fade
      const dist = Math.abs(zc - FOCUS);
      let lvl = dist < 0.8 ? 0 : dist < 1.45 ? 1 : 2;
      if (zc < -1.6) lvl = 2;
      if (this.quality === 2 && lvl === 1) lvl = 0;
      let a = clamp(1 - Math.max(0, zc + 0.2) * 0.3, 0.2, 1);
      if (own) {
        a = 1;
        lvl = 0;
      }
      a *= it.a * (own ? 1 : sphA);
      a *= 1 - (own ? 0 : it.dim.x * 0.66);
      if (it.kind === "crowd") a *= 0.82;
      if (a < 0.02) continue;
      // facing: cards turn to follow the curve of the sphere → foreshortened edges, no flat carousel
      let xs = 1;
      let skew = 0;
      let roll = 0;
      if (!own && it.kind !== "tag") {
        const r = Math.hypot(it.x, it.y, it.z) || 1;
        xs = lerp(1, Math.max(0.42, Math.abs(-it.z / r) * 0.6 + 0.4), 0.85);
        skew = -(it.x / r) * 0.18;
      }
      if (!this.reduced) roll = Math.sin(t * 1.3 * it.fl + it.ph) * 0.045 + (it.hero ? it.ring!.om * this.speed.x * 0.012 * (it.x > 0 ? 1 : -1) : 0);
      if (own) roll = it.pos!.rot;
      // motion streak behind fast hero cards
      if (!this.reduced && it.hero && !own && this.quality === 0) {
        const vx = sx - (it.psx ?? sx);
        const vy = sy - (it.psy ?? sy);
        const sp = Math.hypot(vx, vy) / Math.max(dt, 0.001);
        if (sp > 420 && lvl < 2) {
          const n = Math.min(3, Math.floor(sp / 450));
          for (let m = 1; m <= n; m++) {
            g.globalAlpha = (a * 0.16) / m;
            this.blit(spr, 0, sx - vx * m * 1.1, sy - vy * m * 1.1, w, h, xs, skew, roll);
          }
        }
      }
      it.psx = sx;
      it.psy = sy;
      if (own && it.hist.length > 1 && !this.reduced) this.trail(it, h);
      // halo for what matches the thought
      if (it.glow.x > 0.02 && this.glow) {
        const gw = h * spr.ar * 2.1 + h * 0.5;
        g.globalAlpha = clamp(it.glow.x * 0.85 * (own ? 1 : a), 0, 0.9);
        g.drawImage(this.glow, sx - gw / 2, sy - gw / 2, gw, gw);
      }
      g.globalAlpha = a;
      const hv = this.hover === it;
      if (hv) {
        w *= 1.07;
        h *= 1.07;
      }
      this.blit(spr, own ? 0 : lvl, sx, sy, w, h, xs, skew, roll);
      it.drawn = true;
      if (hv) {
        g.globalAlpha = 0.9;
        g.strokeStyle = "rgba(217,119,87,.85)";
        g.lineWidth = 1.6;
        const ww = w * xs;
        g.strokeRect(sx - ww / 2 - 1, sy - h / 2 - 1, ww + 2, h + 2);
      }
      // hit-testing: orbiting people and interest tokens only; formed cards are DOM buttons
      if (it.hero && !it.fly && a > 0.45 && lvl < 2 && (it.kind === "person" || it.kind === "tag")) {
        const ww = w * xs * (it.kind === "tag" ? 0.9 : 0.85);
        const hh = h * (it.kind === "tag" ? 0.62 : 0.84);
        this.hit.push({ it, x0: sx - ww / 2 - 3, x1: sx + ww / 2 + 3, y0: sy - hh / 2 - 3, y1: sy + hh / 2 + 3 });
      }
      if (it.fly?.phase === "form") formed.push({ uid: it.uid, x: sx, y: sy, w: h * PERSON_AR, h, rot: roll, slot: it.slot });
    }
    g.globalAlpha = 1;
    if (this.searching && this.quality < 2) this.links(sphA);
    dustPass(true);
    this.o.onFormed?.(formed);
  }

  private blit(spr: Sprite, level: number, sx: number, sy: number, w: number, h: number, xs: number, skew: number, roll: number) {
    const { g, dpr: d } = this;
    const src = level === 0 ? spr.c : spr.down[level - 1];
    // destination rect for the full sprite, including its shadow margin
    const sw = spr.tag ? w * (spr.w / (spr.bw ?? spr.w)) : w * (1 + spr.pad * 2);
    const shh = spr.tag ? h * (spr.h / (spr.bh ?? spr.h)) : h * (1 + spr.pad * 2);
    const cs = Math.cos(roll);
    const sn = Math.sin(roll);
    g.setTransform((cs * xs - sn * skew) * d, (sn * xs + cs * skew) * d, -sn * d, cs * d, sx * d, sy * d);
    g.drawImage(src, -sw / 2, -shh / 2, sw, shh);
    g.setTransform(d, 0, 0, d, 0, 0);
  }
  private trail(it: Item, h: number) {
    const { g } = this;
    const H = it.hist;
    g.lineCap = "round";
    for (let i = H.length - 1; i > 0; i--) {
      const f = i / H.length;
      g.globalAlpha = (1 - f) * 0.55;
      g.strokeStyle = f < 0.5 ? "#E7BC69" : "#D97757";
      g.lineWidth = Math.max(1, h * 0.34 * (1 - f));
      g.beginPath();
      g.moveTo(H[i].x, H[i].y);
      g.lineTo(H[i - 1].x, H[i - 1].y);
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  /** thin dashed links between the people who match */
  private links(sphA: number) {
    const { g } = this;
    const lit = this.items.filter((it) => it.hero && it.drawn && it.glow.x > 0.5 && !it.fly && it.zc < 0.9 && it.kind === "person");
    if (lit.length < 2) return;
    g.lineWidth = 1;
    g.setLineDash([2, 5]);
    g.lineDashOffset = -this.t * 14;
    g.strokeStyle = `rgba(23,61,53,${0.3 * sphA})`;
    const top = lit.sort((a, b) => a.zc - b.zc).slice(0, 12);
    for (const a of top) {
      const near = top
        .filter((b) => b !== a)
        .map((b) => ({ b, d: Math.hypot(a.sx - b.sx, a.sy - b.sy) }))
        .sort((x, y) => x.d - y.d)
        .slice(0, 2);
      for (const { b } of near) {
        if (b.uid < a.uid) continue;
        g.beginPath();
        g.moveTo(a.sx, a.sy);
        g.quadraticCurveTo((a.sx + b.sx) / 2, (a.sy + b.sy) / 2 - 18, b.sx, b.sy);
        g.stroke();
      }
    }
    g.setLineDash([]);
  }

  /** one card's flight: orbit → (curved, fast, decelerating) → floating formation, or back */
  private flight(it: Item, dt: number) {
    const f = it.fly!;
    const S = this.L.S.x;
    const cx = this.L.cx.x;
    const now = this.t;
    const slot = this.slots[it.slot];
    if (f.phase === "out") {
      if (now < f.t0) {
        it.pos = null;
        f.active = false;
        return;
      }
      if (!slot) {
        it.fly = null;
        return;
      }
      f.active = true;
      const pr = clamp((now - f.t0) / f.dur, 0, 1);
      // accelerate out, then brake into the slot
      const e = sstep(1 - Math.pow(1 - pr, 1.9));
      const ex = Math.sin(Math.PI * e);
      const sx0 = it.cx;
      const sy0 = it.cy;
      const z0 = it.zs;
      const behind = z0 > 0.15;
      const side = behind ? (f.seed % 2 ? 1 : -1) * (sx0 > cx + 4 ? 1 : sx0 < cx - 4 ? -1 : 1) : sx0 < cx ? -1 : 1;
      const bulgeX = side * S * (behind ? 1.25 : 0.55) * ex;
      const bulgeY = (behind ? -0.34 : f.seed % 2 ? 0.22 : -0.2) * S * ex;
      const tx = slot.x + Math.sin(now * 0.7 + it.ph) * 4;
      const ty = slot.y + Math.cos(now * 0.6 + it.ph) * 5;
      const pos: Pos = {
        x: lerp(sx0, tx, e) + bulgeX,
        y: lerp(sy0, ty, e) + bulgeY,
        h: lerp(0.3 * S * it.ck, slot.h, e) * (1 + 0.14 * ex),
        rot: lerp(0, (slot.rot * Math.PI) / 180, e) + side * 0.22 * (1 - e) * ex,
      };
      // depth: cards from behind stay behind until they have cleared the sphere's edge
      it.zs = behind ? lerp(z0, -2.2, sstep((e - 0.42) / 0.35)) : lerp(z0, -2.2, e);
      it.pos = pos;
      it.hist.unshift({ x: pos.x, y: pos.y });
      if (it.hist.length > 12) it.hist.pop();
      if (pr >= 1) {
        f.phase = "form";
        it.fx.snap(pos.x);
        it.fy.snap(pos.y);
        it.fk.snap(pos.h);
        it.hist.length = 0;
      }
    }
    if (f.phase === "form") {
      if (!slot) {
        this.release1(it);
        return;
      }
      f.active = true;
      const jx = this.reduced ? 0 : Math.sin(now * 0.7 + it.ph) * 4 + (this.px - 0.5) * -14;
      const jy = this.reduced ? 0 : Math.cos(now * 0.6 + it.ph) * 5 + (this.py - 0.5) * -10;
      it.fx.t = slot.x + jx;
      it.fy.t = slot.y + jy;
      it.fk.t = slot.h;
      it.fx.step(dt);
      it.fy.step(dt);
      it.fk.step(dt);
      if (this.reduced) {
        it.fx.snap(it.fx.t);
        it.fy.snap(it.fy.t);
        it.fk.snap(it.fk.t);
      }
      it.pos = { x: it.fx.x, y: it.fy.x, h: it.fk.x, rot: (slot.rot * Math.PI) / 180 };
      it.zs = -2.2;
      this.lastFormH = it.pos.h;
    }
    if (f.phase === "back") {
      const pr = clamp((now - f.t0) / f.dur, 0, 1);
      const e = sstep(pr);
      f.active = pr < 1;
      const from = f.from!;
      it.pos = { x: lerp(from.x, it.sx, e), y: lerp(from.y, it.sy, e) - Math.sin(Math.PI * e) * S * 0.12, h: lerp(it.lastH ?? this.lastFormH, 0.3 * S * it.k, e), rot: 0 };
      it.zs = lerp(-2.2, it.zs, e);
      if (pr >= 1) {
        it.fly = null;
        it.pos = null;
      }
    }
    if (it.fly?.active && it.pos) {
      it.cx = it.pos.x;
      it.cy = it.pos.y;
      if (f.phase !== "back") it.lastH = it.pos.h;
    }
  }
}
