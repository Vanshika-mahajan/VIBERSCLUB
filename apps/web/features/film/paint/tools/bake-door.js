// Bake the painted door experiment (2026-11-20): ARPIT's meadow with the door, painted in the camp's knife
// strokes, plus the door leaf on its own (finer strokes, so it can swing) and the warm light behind it.
// img/meadow-clean.png is ARPIT's meadow-door.webp with the painted title and wordmark filled in (clean-meadow.py).
import { Ref, paintRef } from './engine/plate.js';
import { pack } from './pack.js';
const W = 1920, H = 1080, K = W / 1671;
// the door leaf in ARPIT's picture (features/entry/scene.ts PAINTED), in plate units
export const DOOR = { l: 862 * K, t: 247 * K, w: 266 * K, h: 554 * K };
const blurred = (c, blur) => { const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const x = o.getContext('2d'); x.filter = `blur(${blur}px)`; x.drawImage(c, 0, 0); return o; };
const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
const plate = (R, st, w, h, blur = 1.5) => ({ b: new Float32Array(st.data()), tex: blurred(R.ctx.canvas, blur), w, h, ox: 0, oy: 0 });
window.bake = async () => {
  const out = {};
  const bg = await loadImg('img/meadow-clean.png');
  const R = new Ref(W, H, 0.42);
  R.fill(c => c.rect(0, 0, W, H), c => { c.drawImage(bg, 0, 0, W, H); return 'rgba(0,0,0,0)'; }, { dir: 'edge', fallback: -10, group: 'all' });
  out.meadow = plate(R, paintRef(R, { R: [18, 9, 4.5, 2.6], T: 12, seed: 21 }), W, H);
  const leaf = await loadImg('img/door-leaf-painted.webp');
  const D = new Ref(DOOR.w, DOOR.h, 1.1);
  D.fill(c => c.rect(0, 0, DOOR.w, DOOR.h), c => { c.drawImage(leaf, 0, 0, DOOR.w, DOOR.h); return 'rgba(0,0,0,0)'; }, { dir: 90, fallback: 90, group: 'door' });
  out.door = plate(D, paintRef(D, { R: [7, 3.5, 1.8, 1], T: 10, seed: 5 }), DOOR.w, DOOR.h, 0.8);
  // the light through the doorway: warm at the floor, paper-pale above, so the camp can paint in on it
  const L = new Ref(DOOR.w, DOOR.h, 0.6);
  L.fill(c => c.rect(0, 0, DOOR.w, DOOR.h), c => { const g = c.createLinearGradient(0, 0, 0, DOOR.h); g.addColorStop(0, '#fbf3e2'); g.addColorStop(0.6, '#f8e2b4'); g.addColorStop(1, '#efc27a'); return g; }, { dir: 90, fallback: 90, group: 'light' });
  out.light = plate(L, paintRef(L, { R: [8, 4, 2], T: 10, seed: 9 }), DOOR.w, DOOR.h, 2);
  return pack(out);
};
window.ready = true;
