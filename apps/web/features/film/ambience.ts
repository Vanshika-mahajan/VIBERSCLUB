/**
 * The soft nature sound under the entry (ARPIT's own recording, public/film/nature.mp3): a seamless
 * 27 second loop of birds and mountain air. Browsers only allow sound after a click, so it starts
 * inside the Unveil click, fades in as the door opens, and fades away as Home appears.
 */
import { FILM } from "./depthFilm";

const LEVEL = 0.8;
let ctx: AudioContext | null = null;
let data: Promise<ArrayBuffer> | null = null;
let playing: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

/** fetch the file early, so it is ready by the click */
export function preloadAmbience() {
  data ??= fetch(FILM.nature).then((r) => r.arrayBuffer());
  data.catch(() => {
    data = null;
  });
}

/** call inside the click */
export function startAmbience() {
  if (playing || typeof window === "undefined" || !window.AudioContext) return;
  ctx ??= new AudioContext();
  void ctx.resume();
  preloadAmbience();
  const c = ctx;
  void data
    ?.then((buf) => c.decodeAudioData(buf.slice(0)))
    .then((buffer) => {
      if (playing) return;
      const src = c.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const gain = c.createGain();
      gain.gain.setValueAtTime(0, c.currentTime);
      gain.gain.linearRampToValueAtTime(LEVEL, c.currentTime + 1.5);
      src.connect(gain).connect(c.destination);
      src.start();
      playing = { src, gain };
    })
    .catch(() => {});
}

export function stopAmbience(fade = 3) {
  if (!playing || !ctx) return;
  const { src, gain } = playing;
  playing = null;
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0, now + fade);
  src.stop(now + fade + 0.05);
}
