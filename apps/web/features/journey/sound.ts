"use client";

import { useSyncExternalStore } from "react";

/**
 * The journey's own sounds, made in the browser with the Web Audio API: no audio files, so nothing to
 * licence and nothing to download. They have their own on/off (the speaker on the door page), kept apart
 * from the app's Sounds setting.
 *
 * - wind over the grass, looping softly while the door page is open;
 * - a magic shimmer the moment light breaks at the door's seam;
 * - the door: a latch, a long wooden creak, a soft thump against the wall;
 * - the Earth: a low airy hum while it turns, a rising rush as we dive into Manali, a bell as the
 *   Manali marker lights, and a warm chime as the club home appears.
 *
 * Browsers only allow sound after the visitor first taps, clicks or types, so everything is set up
 * on arrival and starts playing at the first touch if the browser held it back.
 * On by default, except for people who ask their device for reduced motion (they can turn it on).
 */

const KEY = "vc-journey-sound";
const MASTER = 0.8;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
type Loop = { gain: GainNode; stop: (fade?: number) => void };
let wind: Loop | null = null;
let hum: Loop | null = null;
let rush: Loop | null = null;
/** after Skip, the one-off sounds the timeline races past stay quiet */
let hushed = false;
const listeners = new Set<() => void>();

function readEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === "on") return true;
    if (raw === "off") return false;
  } catch {
    /* private mode: fall back to the default */
  }
  return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
let enabled = false;
let read = false;
function isEnabled() {
  if (!read && typeof window !== "undefined") {
    enabled = readEnabled();
    read = true;
  }
  return enabled;
}

/** the speaker button reads this */
export function useJourneySound(): boolean {
  return useSyncExternalStore(
    (fn) => (listeners.add(fn), () => listeners.delete(fn)),
    isEnabled,
    () => false,
  );
}

export function setJourneySound(on: boolean) {
  enabled = on;
  read = true;
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* not kept, still works for this visit */
  }
  listeners.forEach((fn) => fn());
  if (!master || !ctx) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(on ? MASTER : 0, ctx.currentTime, 0.12);
  if (on) void ctx.resume();
}

/* ---------- the engine ---------- */

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  master = ctx.createGain();
  master.gain.value = isEnabled() ? MASTER : 0;
  master.connect(comp).connect(ctx.destination);
  // two seconds of soft noise, reused by the wind and the rushes
  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    // a little smoothing makes it warmer than plain white noise
    last = 0.86 * last + 0.14 * (Math.random() * 2 - 1);
    data[i] = last * 3;
  }
  return ctx;
}

function noiseSource(c: AudioContext) {
  const src = c.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  return src;
}

function lfo(c: AudioContext, rate: number, depth: number, target: AudioParam) {
  const o = c.createOscillator();
  o.frequency.value = rate;
  const g = c.createGain();
  g.gain.value = depth;
  o.connect(g).connect(target);
  o.start();
  return o;
}

/** a loop that fades in, and fades out and stops when asked */
function loop(build: (c: AudioContext, out: GainNode) => AudioScheduledSourceNode[], level: number, fadeIn: number): Loop | null {
  const c = audio();
  if (!c || !master) return null;
  const gain = c.createGain();
  gain.gain.value = 0;
  gain.connect(master);
  const nodes = build(c, gain);
  gain.gain.setTargetAtTime(level, c.currentTime, fadeIn / 3);
  return {
    gain,
    stop: (fade = 1) => {
      const t = c.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + fade);
      nodes.forEach((n) => n.stop(t + fade + 0.05));
    },
  };
}

/** start playing at the first tap, click or key if the browser held the sound back */
export function unlockJourneySound() {
  const c = audio();
  if (!c) return () => {};
  const go = () => void c.resume();
  go();
  const events = ["pointerdown", "keydown", "touchstart", "click"] as const;
  events.forEach((e) => window.addEventListener(e, go, { passive: true }));
  return () => events.forEach((e) => window.removeEventListener(e, go));
}

/* ---------- the sounds ---------- */

/** wind moving through the grass: a soft gusting breath with a rustle on top */
export function startWind() {
  if (wind) return;
  hushed = false;
  wind = loop(
    (c, out) => {
      const body = noiseSource(c);
      const band = c.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 520;
      band.Q.value = 0.6;
      const swell = c.createGain();
      swell.gain.value = 0.55;
      body.connect(band).connect(swell).connect(out);
      const rustle = noiseSource(c);
      const hi = c.createBiquadFilter();
      hi.type = "highpass";
      hi.frequency.value = 3200;
      const rg = c.createGain();
      rg.gain.value = 0.08;
      rustle.connect(hi).connect(rg).connect(out);
      body.start();
      rustle.start(c.currentTime, 0.7);
      // gusts: the level and the pitch of the wind drift slowly, the rustle a little faster
      const a = lfo(c, 0.11, 0.3, swell.gain);
      const b = lfo(c, 0.07, 260, band.frequency);
      const d = lfo(c, 0.37, 0.05, rg.gain);
      return [body, rustle, a, b, d];
    },
    0.32,
    1.6,
  );
}

export function stopWind(fade = 1.2) {
  wind?.stop(fade);
  wind = null;
}

/** light breaks at the seam: a rising sparkle of bells over a soft swell, with a shimmering tail */
export function magic() {
  const c = audio();
  if (!c || !master || hushed) return;
  const t0 = c.currentTime + 0.02;
  const out = c.createGain();
  out.gain.value = 0.5;
  const echo = c.createDelay(1);
  echo.delayTime.value = 0.19;
  const fb = c.createGain();
  fb.gain.value = 0.38;
  const tone = c.createBiquadFilter();
  tone.type = "highpass";
  tone.frequency.value = 900;
  out.connect(master);
  out.connect(echo);
  echo.connect(tone).connect(fb).connect(echo);
  fb.connect(master);
  const notes = [1047, 1319, 1568, 2093, 2637, 3136];
  notes.forEach((f, i) => {
    const at = t0 + i * 0.07;
    for (const detune of [-6, 6]) {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.detune.value = detune;
      const g = c.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.09, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0008, at + 1.6);
      o.connect(g).connect(out);
      o.start(at);
      o.stop(at + 1.7);
    }
  });
  // the warm swell underneath
  for (const f of [523, 784]) {
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.06, t0 + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + 2.4);
    o.connect(g).connect(out);
    o.start(t0);
    o.stop(t0 + 2.5);
  }
}

/** the door: a latch, a long wooden creak as it swings, a soft thump as it meets the wall */
export function doorOpen(length = 2.2) {
  const c = audio();
  if (!c || !master || hushed) return;
  const t0 = c.currentTime + 0.02;
  // the latch: a tiny dry click
  const click = c.createBufferSource();
  click.buffer = noise;
  const ch = c.createBiquadFilter();
  ch.type = "bandpass";
  ch.frequency.value = 2400;
  ch.Q.value = 3;
  const cg = c.createGain();
  cg.gain.setValueAtTime(0.5, t0);
  cg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.05);
  click.connect(ch).connect(cg).connect(master);
  click.start(t0, 0.3, 0.06);
  // the creak: a buzzing wooden tone whose pitch wobbles unevenly, through a resonant filter
  const o = c.createOscillator();
  o.type = "sawtooth";
  const steps = 40;
  const curve = new Float32Array(steps);
  for (let i = 0; i < steps; i++) {
    const x = i / (steps - 1);
    curve[i] = 70 + 55 * Math.sin(x * Math.PI) + (Math.random() - 0.5) * 22;
  }
  o.frequency.setValueCurveAtTime(curve, t0 + 0.12, length);
  const res = c.createBiquadFilter();
  res.type = "bandpass";
  res.frequency.value = 820;
  res.Q.value = 7;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0 + 0.12);
  g.gain.linearRampToValueAtTime(0.16, t0 + 0.35);
  g.gain.setValueAtTime(0.13, t0 + length * 0.7);
  g.gain.linearRampToValueAtTime(0, t0 + 0.12 + length);
  o.connect(res).connect(g).connect(master);
  o.start(t0 + 0.12);
  o.stop(t0 + 0.2 + length);
  // the thump: a low, padded knock
  const k = c.createOscillator();
  k.type = "sine";
  const kt = t0 + 0.1 + length;
  k.frequency.setValueAtTime(95, kt);
  k.frequency.exponentialRampToValueAtTime(48, kt + 0.25);
  const kg = c.createGain();
  kg.gain.setValueAtTime(0, kt);
  kg.gain.linearRampToValueAtTime(0.35, kt + 0.01);
  kg.gain.exponentialRampToValueAtTime(0.001, kt + 0.4);
  k.connect(kg).connect(master);
  k.start(kt);
  k.stop(kt + 0.45);
}

/** a soft rush of air as we fall through the doorway into the stars */
export function throughTheDoor() {
  const c = audio();
  if (!c || !master || hushed) return;
  const t0 = c.currentTime;
  const src = noiseSource(c);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 0.9;
  f.frequency.setValueAtTime(300, t0);
  f.frequency.exponentialRampToValueAtTime(1800, t0 + 1.0);
  f.frequency.exponentialRampToValueAtTime(500, t0 + 1.8);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.3, t0 + 0.9);
  g.gain.linearRampToValueAtTime(0, t0 + 1.9);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + 2);
}

/** the Earth turning: a low, airy hum that breathes */
export function startHum() {
  if (hum) return;
  hum = loop(
    (c, out) => {
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 420;
      const breath = c.createGain();
      breath.gain.value = 0.8;
      lp.connect(breath).connect(out);
      const tones = [55, 82.4, 110, 164.8].map((f, i) => {
        const o = c.createOscillator();
        o.type = i % 2 ? "triangle" : "sine";
        o.frequency.value = f;
        o.detune.value = i * 3;
        const g = c.createGain();
        g.gain.value = [0.5, 0.25, 0.22, 0.08][i];
        o.connect(g).connect(lp);
        o.start();
        return o;
      });
      const air = noiseSource(c);
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 340;
      bp.Q.value = 0.8;
      const ag = c.createGain();
      ag.gain.value = 0.12;
      air.connect(bp).connect(ag).connect(out);
      air.start(c.currentTime, 1.1);
      const a = lfo(c, 0.18, 0.2, breath.gain);
      return [...tones, air, a];
    },
    0.3,
    2.2,
  );
}

export function stopHum(fade = 1.4) {
  hum?.stop(fade);
  hum = null;
}

/** the dive into Manali: a long rising rush, gathering speed */
export function dive(length = 3.4) {
  const c = audio();
  if (!c || !master || hushed || rush) return;
  rush = loop(
    (cc, out) => {
      const t0 = cc.currentTime;
      const src = noiseSource(cc);
      const f = cc.createBiquadFilter();
      f.type = "bandpass";
      f.Q.value = 1.1;
      f.frequency.setValueAtTime(180, t0);
      f.frequency.exponentialRampToValueAtTime(2600, t0 + length);
      const g = cc.createGain();
      g.gain.setValueAtTime(0.25, t0);
      g.gain.linearRampToValueAtTime(1, t0 + length);
      src.connect(f).connect(g).connect(out);
      src.start(t0, 0.4);
      const sub = cc.createOscillator();
      sub.type = "sine";
      sub.frequency.setValueAtTime(42, t0);
      sub.frequency.exponentialRampToValueAtTime(90, t0 + length);
      const sg = cc.createGain();
      sg.gain.value = 0.3;
      sub.connect(sg).connect(out);
      sub.start(t0);
      return [src, sub];
    },
    0.26,
    0.6,
  );
}

export function endDive(fade = 0.6) {
  rush?.stop(fade);
  rush = null;
}

/** a clear bell as the Manali marker lights */
export function markerBell() {
  const c = audio();
  if (!c || !master || hushed) return;
  const t0 = c.currentTime + 0.01;
  for (const [f, level] of [
    [1318.5, 0.14],
    [1975.5, 0.06],
    [2637, 0.03],
  ] as const) {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(level, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0006, t0 + 1.4);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + 1.5);
  }
}

/** arriving home: a warm chord that settles */
export function arrivalChime() {
  const c = audio();
  if (!c || !master) return;
  const t0 = c.currentTime + 0.02;
  [523.3, 659.3, 784, 1046.5].forEach((f, i) => {
    const at = t0 + i * 0.09;
    const o = c.createOscillator();
    o.type = i === 3 ? "sine" : "triangle";
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.09, at + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0008, at + 2.2);
    o.connect(g).connect(master!);
    o.start(at);
    o.stop(at + 2.3);
  });
}

/** Skip: the timeline races ahead, so the one-off sounds it passes stay quiet; the loops fade */
export function hushJourney() {
  hushed = true;
  stopWind(0.4);
  endDive(0.4);
}

/** leaving the page: the loops fade out; a chime already ringing finishes */
export function leaveJourney() {
  stopWind(0.6);
  stopHum(0.8);
  endDive(0.4);
}
