// Bake every painted plate of the interactive intro once (strokes + underpainting), so the site only uploads them.
import { Ref, paintRef } from './engine/plate.js';
import { part, buildViber, buildDog } from './vibers.js';
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
  // pack: index + one Float32 blob; textures as webp data URLs
  const index = [], blobs = []; let off = 0;
  for (const [name, p] of Object.entries(out)) { index.push({ name, off, n: p.b.length, w: p.w, h: p.h, ox: p.ox, oy: p.oy, tw: p.tex.width, th: p.tex.height }); blobs.push(p.b); off += p.b.length; }
  const all = new Float32Array(off); let o = 0; for (const b of blobs) { all.set(b, o); o += b.length; }
  const n = off / 20, q = new DataView(new ArrayBuffer(n * 24));
  const i16 = (v, lo = -32768, hi = 32767) => Math.max(lo, Math.min(hi, Math.round(v)));
  for (let i = 0; i < n; i++) {
    const a = all.subarray(i * 20, i * 20 + 20), p = i * 24;
    q.setInt16(p, i16(a[0] * 4), true); q.setInt16(p + 2, i16(a[1] * 4), true); q.setInt16(p + 4, i16(a[2] * 10000), true);
    q.setUint16(p + 6, i16(a[3] * 32, 0, 65535), true); q.setUint16(p + 8, i16(a[4] * 32, 0, 65535), true);
    for (let k = 0; k < 6; k++) q.setUint8(p + 10 + k, i16(a[5 + k] * 255, 0, 255));
    q.setUint16(p + 16, i16((a[11] % 1000) * 60, 0, 65535), true); q.setUint8(p + 18, a[12]); q.setUint8(p + 19, i16(a[14] * 100, 0, 255));
    q.setUint8(p + 20, i16(a[15] * 255, 0, 255)); q.setUint8(p + 21, i16(a[16] * 100, 0, 255)); q.setInt8(p + 22, i16(a[18] * 100, -128, 127)); q.setUint8(p + 23, i16(a[19] * 100, 0, 255));
  }
  const tex = Object.fromEntries(Object.entries(out).map(([n, p]) => [n, p.tex.toDataURL('image/webp', 0.8)]));
  window.__bin = new Uint8Array(q.buffer); for (const e of index) { e.off /= 20; e.n /= 20; }
  return { index, tex, bytes: window.__bin.length };
};
window.chunk = (i, n) => { const u = window.__bin.subarray(i, i + n); let s = ''; for (let k = 0; k < u.length; k += 8192) s += String.fromCharCode(...u.subarray(k, k + 8192)); return btoa(s); };
window.ready = true;
