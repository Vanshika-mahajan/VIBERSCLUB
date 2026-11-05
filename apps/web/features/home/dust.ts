/**
 * A picture that can break into stardust and gather back. The picture is sampled on a grid; every
 * cell becomes a particle with its colour. At t = 1 the picture is whole (drawn as the image itself,
 * crisp); as t falls the cells leave in a wave from the burst point, swirl, shrink to points of light
 * and twinkle against the night. Canvas 2D, so it runs on any device.
 */

export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
/** where p sits between a and b, 0 to 1 */
export const span = (p: number, a: number, b: number) =>
  clamp((p - a) / (b - a));

const cache = new Map<string, Promise<HTMLCanvasElement>>();

/** the picture, toned in sage once (its luminosity onto deep sage, then a little deeper) */
export function toned(src: string): Promise<HTMLCanvasElement> {
  let p = cache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => {
        const c = document.createElement("canvas");
        c.width = im.naturalWidth;
        c.height = im.naturalHeight;
        const g = c.getContext("2d")!;
        g.fillStyle = "#64754b";
        g.fillRect(0, 0, c.width, c.height);
        g.globalCompositeOperation = "luminosity";
        g.drawImage(im, 0, 0);
        // deeper, so ivory type reads anywhere on it
        g.globalCompositeOperation = "source-over";
        g.fillStyle = "rgba(30,20,12,.3)";
        g.fillRect(0, 0, c.width, c.height);
        resolve(c);
      };
      im.onerror = reject;
      im.src = src;
    });
    cache.set(src, p);
  }
  return p;
}

/** the picture as it is, in its own colours (the opening scene is an illustration, not a photograph) */
export function plain(src: string): Promise<HTMLCanvasElement> {
  const key = "plain:" + src;
  let p = cache.get(key);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => {
        const c = document.createElement("canvas");
        c.width = im.naturalWidth;
        c.height = im.naturalHeight;
        c.getContext("2d")!.drawImage(im, 0, 0);
        resolve(c);
      };
      im.onerror = reject;
      im.src = src;
    });
    cache.set(key, p);
  }
  return p;
}

type Particle = {
  x: number;
  y: number;
  c: string;
  r: number;
  q: number;
  lum: number;
};

export class Dust {
  readonly g: CanvasRenderingContext2D;
  w = 1;
  h = 1;
  private dpr = 1;
  private dx = 0;
  private dy = 0;
  private dw = 1;
  private dh = 1;
  private cell = 7;
  private P: Particle[] = [];

  /** fy: where the picture sits vertically when it is cropped, 0 top to 1 bottom */
  constructor(
    private c: HTMLCanvasElement,
    private src: HTMLCanvasElement,
    private fy = 0.5,
  ) {
    this.g = c.getContext("2d")!;
    this.resize();
  }

  resize() {
    const dpr = Math.min(2, devicePixelRatio || 1),
      r = this.c.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.dpr = dpr;
    this.c.width = Math.round(this.w * dpr);
    this.c.height = Math.round(this.h * dpr);
    // cover-fit the picture into the canvas
    const k = Math.max(this.w / this.src.width, this.h / this.src.height);
    this.dw = this.src.width * k;
    this.dh = this.src.height * k;
    this.dx = (this.w - this.dw) / 2;
    this.dy = (this.h - this.dh) * this.fy;
    const cell = this.w < 600 ? 6 : 7;
    this.cell = cell;
    const sm = document.createElement("canvas");
    const cols = Math.ceil(this.w / cell),
      rows = Math.ceil(this.h / cell);
    sm.width = cols;
    sm.height = rows;
    const sg = sm.getContext("2d", { willReadFrequently: true })!;
    sg.drawImage(
      this.src,
      this.dx / cell,
      this.dy / cell,
      this.dw / cell,
      this.dh / cell,
    );
    const d = sg.getImageData(0, 0, cols, rows).data;
    const P: Particle[] = [];
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        P.push({
          x: x * cell,
          y: y * cell,
          c: `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`,
          r: rnd(),
          q: rnd(),
          lum: (d[i] + d[i + 1] + d[i + 2]) / 765,
        });
      }
    this.P = P;
  }

  /** t: 1 whole, 0 stardust. ox, oy: the burst point. night: how dark the sky behind is (0 to 1). */
  draw(t: number, ox: number, oy: number, night = 1, time = 0) {
    const { g, w, h, cell } = this;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.globalAlpha = 1;
    g.fillStyle = `rgba(18,12,8,${night})`;
    g.fillRect(0, 0, w, h);
    if (t >= 0.999) {
      g.drawImage(this.src, this.dx, this.dy, this.dw, this.dh);
      return;
    }
    const s = 1 - t,
      maxd = Math.hypot(w, h) * 0.55;
    for (const p of this.P) {
      // each cell leaves when the wave from the burst point reaches it
      const dx0 = p.x - ox,
        dy0 = p.y - oy,
        dist = Math.hypot(dx0, dy0) || 1;
      const local = clamp(s * 1.5 - (dist / maxd) * 0.5 - p.r * 0.15);
      if (local <= 0) {
        g.globalAlpha = 1;
        g.fillStyle = p.c;
        g.fillRect(p.x, p.y, cell + 0.6, cell + 0.6);
        continue;
      }
      const e = ease(local);
      const ang = Math.atan2(dy0, dx0) + e * (1.4 + p.q) * (p.r > 0.5 ? 1 : -1);
      const reach = e * (60 + p.r * 240);
      const x = ox + Math.cos(ang) * (dist + reach),
        y = oy + Math.sin(ang) * (dist + reach) - e * 40 * p.q;
      const size = cell * (1 - e) + (p.lum > 0.55 ? 1.8 : 1.1) * e;
      const tw = 0.55 + 0.45 * Math.sin(time * 0.004 + p.r * 40);
      g.globalAlpha =
        1 - e + e * (p.lum > 0.5 ? 0.9 : 0.35) * tw * (p.q > 0.55 ? 1 : 0.25);
      // a few of the stars are amber
      g.fillStyle = e > 0.7 && p.q > 0.9 ? "#f0b45a" : p.c;
      g.fillRect(x, y, size, size);
    }
    g.globalAlpha = 1;
  }
}
