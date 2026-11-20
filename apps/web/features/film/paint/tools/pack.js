// Shared by the bake pages: plates to one quantized strokes.bin (24 bytes a stroke) plus webp underpaintings.
export function pack(out) {
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
}
window.chunk = (i, n) => { const u = window.__bin.subarray(i, i + n); let s = ''; for (let k = 0; k < u.length; k += 8192) s += String.fromCharCode(...u.subarray(k, k + 8192)); return btoa(s); };
