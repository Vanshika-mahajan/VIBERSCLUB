// Bake every painted plate of the interactive intro once (strokes + underpainting), so the site only uploads them.
import { Ref, paintRef } from './engine/plate.js';
import { part, buildViber, buildDog } from './vibers.js';
import { pack } from './pack.js';
const W = 1920, H = 1080;
const rnd01 = (x, y) => ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1) + 1) % 1;
const FAKE = { batch: d => new Float32Array(d), texture: (c, blur = 1.5) => { const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const x = o.getContext('2d'); x.filter = `blur(${blur}px)`; x.drawImage(c, 0, 0); return o; } };
const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
const LOOKS = {
  hero: { style: 'curly', hair: '#5a3422', top: '#8e2f2c', under: '#efe6d6', legs: '#e3d6bd', shoe: '#7a4a2a', pack: '#b08a4e', eye: '#5a3418' },
  guitar: { style: 'short', hair: '#2e1d14', top: '#3c3a36', under: '#c9b48a', legs: '#4a4f5a', shoe: '#2a2420' },
  bun: { style: 'bun', hair: '#4a2c1c', top: '#e8dcc4', under: '#8e2f2c', legs: '#5a4636', shoe: '#6a4028' },
  cap: { style: 'cap', capCol: '#c99a3a', hair: '#2e1d14', top: '#5f6b45', under: '#e8dcc4', legs: '#c2a882', shoe: '#5a3a24' },
};
window.bake = async () => {
  const out = {};
  const img = await loadImg('img/blue-bg.webp');
  const R = new Ref(W, H, 0.42);
  R.fill(c => c.rect(0, 0, W, H), c => { c.drawImage(img, 0, 0, W, H); return 'rgba(0,0,0,0)'; }, { dir: 'edge', fallback: -10, group: 'all' });
  const sweep = (x, y) => (1 - x) * 0.55 + Math.abs(y - 0.55) * 0.5;   // paints in from the doorway outward
  const st = paintRef(R, { R: [18, 9, 4.5, 2.6], T: 12, seed: 12, app: (x, y, level) => sweep(x / W, y / H) * 0.9 + level * 0.08 + rnd01(x, y) * 0.08 });
  out.bg = { b: new Float32Array(st.data()), tex: FAKE.texture(R.ctx.canvas), w: W, h: H, ox: 0, oy: 0 };
  // canopy + lines
  const canopy = await loadImg('img/canopy.webp');
  const GW = 1883, GH = 1000, G = new Ref(GW, GH, 0.45);
  G._id({ dir: 'edge', fallback: 0, group: 'g' });
  const c = G.ctx, under = x => 376 + 264 * ((x - 940) / 880) ** 2, hp = [[975, 640], [1105, 640]];
  c.strokeStyle = 'rgba(52,40,34,.85)'; c.lineWidth = 3; c.lineCap = 'round';
  for (const x of [90, 300, 520, 740, 1140, 1360, 1580, 1790]) { const h = x < 1040 ? hp[0] : hp[1]; c.beginPath(); c.moveTo(x, under(x) - 6); c.lineTo(h[0], h[1]); c.stroke(); }
  c.drawImage(canopy, 0, 0);
  const d = G.idc; d.save(); d.setTransform(1, 0, 0, 1, 0, 0); d.drawImage(G.ctx.canvas, 0, 0); d.globalCompositeOperation = 'source-in'; d.fillStyle = G._idStyle(1); d.fillRect(0, 0, G.pw, G.ph); d.restore();
  const id = d.getImageData(0, 0, G.pw, G.ph); for (let i = 3; i < id.data.length; i += 4) id.data[i] = id.data[i] > 110 ? 255 : 0; d.putImageData(id, 0, 0);
  const gs = paintRef(G, { R: [10, 5, 2.5, 1.3], T: 10, seed: 7 });
  out.glider = { b: new Float32Array(gs.data()), tex: FAKE.texture(G.ctx.canvas, 0.6), w: GW, h: GH, ox: 0, oy: 0 };
  let k = 1;
  for (const [n, L] of Object.entries(LOOKS)) { const v = buildViber(FAKE, L, 10 * k++); for (const [p, pl] of Object.entries(v)) if (p !== 'L') out[`${n}.${p}`] = pl; }
  const dog = buildDog(FAKE); out['dog.body'] = dog.body; out['dog.tail'] = dog.tail;
  out.phone = part(FAKE, [-60, -100, 60, 100], R => { R.fill(c => c.roundRect(-50, -92, 100, 184, 16), '#1e1a1a', { dir: 90, group: 'ph', maxR: 2 }); R.fill(c => c.roundRect(-40, -78, 80, 150, 8), '#f3d08a', { dir: 90, group: 'scr', maxR: 1.6 }); }, { seed: 99, scale: 0.3 });
  return pack(out);
};
window.ready = true;
