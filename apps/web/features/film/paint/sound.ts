/**
 * Sound for the painted intro (PaintedIntro.tsx). Browsers only allow sound after a click, so it all
 * starts inside the Unveil click: ARPIT's door sound, then an original fingerpicked guitar loop
 * (public/film/paint/intro-loop.mp3, made in code like the films). Each Viber who connects rings a
 * little chime, the glide brings wind and a held chord, and the music fades as Home appears.
 */
const FILES = {
  door: "/film/door.mp3",
  loop: "/film/paint/intro-loop.mp3",
  c1: "/film/paint/intro-connect-1.mp3",
  c2: "/film/paint/intro-connect-2.mp3",
  c3: "/film/paint/intro-connect-3.mp3",
  glide: "/film/paint/intro-glide.mp3",
} as const;
type Name = keyof typeof FILES;
const LOOP_LEN = 12.8;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let music: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
const raw = new Map<Name, Promise<ArrayBuffer>>();
const decoded = new Map<Name, Promise<AudioBuffer>>();

/** fetch the files early, so they are ready by the click */
export function preloadSound() {
  for (const n of Object.keys(FILES) as Name[]) {
    if (raw.has(n)) continue;
    const p = fetch(FILES[n]).then((r) => r.arrayBuffer());
    p.catch(() => raw.delete(n));
    raw.set(n, p);
  }
}

function buffer(n: Name) {
  const c = ctx;
  if (!c) return Promise.reject(new Error("no audio"));
  let d = decoded.get(n);
  if (!d) {
    preloadSound();
    d = raw.get(n)!.then((b) => c.decodeAudioData(b.slice(0)));
    d.catch(() => decoded.delete(n));
    decoded.set(n, d);
  }
  return d;
}

function play(n: Name, level: number, delay = 0) {
  const c = ctx;
  if (!c || !master) return;
  const out = master;
  buffer(n)
    .then((b) => {
      const src = c.createBufferSource();
      src.buffer = b;
      const g = c.createGain();
      g.gain.value = level;
      src.connect(g).connect(out);
      src.start(c.currentTime + delay);
    })
    .catch(() => {});
}

/** call inside the click: the door creaks open, then the guitar fades in */
export function startSound() {
  if (typeof window === "undefined" || !window.AudioContext) return;
  ctx ??= new AudioContext();
  void ctx.resume();
  const c = ctx;
  if (!master) {
    master = c.createGain();
    master.connect(c.destination);
  }
  master.gain.cancelScheduledValues(c.currentTime);
  master.gain.setValueAtTime(1, c.currentTime);
  for (const n of Object.keys(FILES) as Name[]) void buffer(n).catch(() => {});
  play("door", 0.7);
  if (music) return;
  const out = master;
  buffer("loop")
    .then((b) => {
      if (music) return;
      const src = c.createBufferSource();
      src.buffer = b;
      src.loop = true;
      src.loopEnd = Math.min(LOOP_LEN, b.duration);
      const gain = c.createGain();
      const t = c.currentTime + 0.6;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.75, t + 2);
      src.connect(gain).connect(out);
      src.start(t);
      music = { src, gain };
    })
    .catch(() => {});
}

/** a Viber connected (0, 1, 2) */
export function chime(i: number) {
  play((["c1", "c2", "c3"] as const)[Math.max(0, Math.min(2, i))], 0.6);
}

/** the paraglider sweeps in */
export function glide() {
  play("glide", 0.85);
}

/** fade everything away (Home is appearing, or the page is left) */
export function stopSound(fade = 1.4) {
  const c = ctx;
  if (!c || !master) return;
  const g = master.gain;
  g.cancelScheduledValues(c.currentTime);
  g.setValueAtTime(g.value, c.currentTime);
  g.linearRampToValueAtTime(0, c.currentTime + fade);
  const m = music;
  music = null;
  if (m) m.src.stop(c.currentTime + fade + 0.05);
}
