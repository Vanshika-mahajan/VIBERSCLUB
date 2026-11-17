import * as THREE from "three";

/**
 * Textures drawn in code, so the stand-in door needs no image files. When the final art arrives,
 * the door can take photographed wood instead: pass a texture to makeWoodenDoor.
 */

function rand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function star(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  inner: number,
) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * inner : r;
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath();
}

/**
 * Planks of weathered warm wood, side by side, with grain, knots, gaps between the planks, nail heads
 * and a carved star (as on the door in the storyboard). Returns the colour map and a matching bump map.
 */
export function plankTextures(
  planks = 5,
  opts: { star?: boolean; seed?: number } = {},
) {
  const W = 512,
    H = 1024;
  const [c, g] = canvas(W, H);
  const [b, h] = canvas(W, H);
  const r = rand(opts.seed ?? 7);
  const pw = W / planks;
  h.fillStyle = "#808080";
  h.fillRect(0, 0, W, H);
  for (let p = 0; p < planks; p++) {
    const x0 = p * pw;
    // each plank a slightly different brown
    const l = 0.85 + r() * 0.3;
    const base = [104 * l, 66 * l, 38 * l];
    g.fillStyle = `rgb(${base.map(Math.round).join(",")})`;
    g.fillRect(x0, 0, pw, H);
    // grain: long wavy lines running down the plank
    for (let i = 0; i < 46; i++) {
      const gx = x0 + r() * pw;
      const amp = 2 + r() * 5;
      const freq = 0.004 + r() * 0.01;
      const phase = r() * 10;
      const dark = r() < 0.6;
      g.strokeStyle = dark
        ? `rgba(40,22,10,${0.12 + r() * 0.22})`
        : `rgba(196,140,90,${0.06 + r() * 0.12})`;
      h.strokeStyle = dark ? "rgba(70,70,70,0.35)" : "rgba(160,160,160,0.25)";
      g.lineWidth = h.lineWidth = 0.6 + r() * 1.6;
      g.beginPath();
      h.beginPath();
      for (let y = 0; y <= H; y += 8) {
        const xx = gx + Math.sin(y * freq + phase) * amp;
        if (y === 0) {
          g.moveTo(xx, y);
          h.moveTo(xx, y);
        } else {
          g.lineTo(xx, y);
          h.lineTo(xx, y);
        }
      }
      g.stroke();
      h.stroke();
    }
    // a knot or two
    for (let k = 0; k < (r() < 0.5 ? 1 : 2); k++) {
      const kx = x0 + pw * (0.3 + r() * 0.4),
        ky = r() * H;
      const grd = g.createRadialGradient(kx, ky, 1, kx, ky, 14);
      grd.addColorStop(0, "rgba(35,18,8,0.85)");
      grd.addColorStop(1, "rgba(35,18,8,0)");
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(kx, ky, 9, 16, 0, 0, Math.PI * 2);
      g.fill();
    }
    // worn, lighter edges and a dark gap between planks
    const edge = g.createLinearGradient(x0, 0, x0 + pw, 0);
    edge.addColorStop(0, "rgba(20,10,4,0.55)");
    edge.addColorStop(0.06, "rgba(20,10,4,0)");
    edge.addColorStop(0.94, "rgba(20,10,4,0)");
    edge.addColorStop(1, "rgba(20,10,4,0.55)");
    g.fillStyle = edge;
    g.fillRect(x0, 0, pw, H);
    h.fillStyle = "#202020";
    h.fillRect(x0, 0, 3, H);
    g.fillStyle = "rgba(15,8,3,0.9)";
    g.fillRect(x0, 0, 2, H);
    // nail heads where the cross battens sit behind
    for (const ny of [0.12, 0.5, 0.88]) {
      for (const nx of [0.3, 0.7]) {
        const X = x0 + pw * nx,
          Y = H * ny;
        g.fillStyle = "#2a2522";
        g.beginPath();
        g.arc(X, Y, 3.4, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "rgba(200,180,150,0.35)";
        g.beginPath();
        g.arc(X - 1, Y - 1, 1.3, 0, Math.PI * 2);
        g.fill();
        h.fillStyle = "#e0e0e0";
        h.beginPath();
        h.arc(X, Y, 3.4, 0, Math.PI * 2);
        h.fill();
      }
    }
  }
  if (opts.star) {
    // the carving: a groove (dark, sunk in the bump map) with a lit lower lip
    const cx = W / 2,
      cy = H * 0.3,
      R = W * 0.2;
    g.lineJoin = h.lineJoin = "round";
    star(g, cx, cy + 3, R, 0.42);
    g.strokeStyle = "rgba(230,170,110,0.35)";
    g.lineWidth = 9;
    g.stroke();
    star(g, cx, cy, R, 0.42);
    g.strokeStyle = "rgba(25,12,5,0.85)";
    g.lineWidth = 8;
    g.stroke();
    star(h, cx, cy, R, 0.42);
    h.strokeStyle = "#151515";
    h.lineWidth = 10;
    h.stroke();
  }
  // a little sun-bleaching toward the top, dirt toward the bottom
  const age = g.createLinearGradient(0, 0, 0, H);
  age.addColorStop(0, "rgba(255,220,170,0.08)");
  age.addColorStop(0.75, "rgba(0,0,0,0)");
  age.addColorStop(1, "rgba(30,20,10,0.35)");
  g.fillStyle = age;
  g.fillRect(0, 0, W, H);

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const bump = new THREE.CanvasTexture(b);
  bump.anisotropy = 8;
  return { map, bump };
}

/** A soft dark ellipse, for the shadow the door casts on the grass. */
export function softShadow() {
  const [c, g] = canvas(256, 256);
  const grd = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  grd.addColorStop(0, "rgba(0,0,0,0.75)");
  grd.addColorStop(0.5, "rgba(0,0,0,0.35)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A round soft dot, for pollen and the fairy lights inside the doorway. */
export function dotSprite() {
  const [c, g] = canvas(64, 64);
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.3, "rgba(255,255,255,0.6)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
