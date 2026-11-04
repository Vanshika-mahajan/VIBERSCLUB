"use client";

import { useSyncExternalStore } from "react";

/**
 * Vibers Club sounds: small, warm tones made in the browser with the Web Audio API (no audio files,
 * nothing to download). One engine for the whole app:
 * - nothing plays until the person has tapped, clicked or typed (browsers require it, and it is polite);
 * - one sound at a time: a new one fades the last out, and the same sound twice within 70 ms plays once;
 * - a volume and an on/off switch, kept in this browser;
 * - off by default for people who ask their device for reduced motion (they can turn it on).
 */
export type SoundName =
  | "tap" // a primary button
  | "nav" // moving between Home, Discover and Explore
  | "open" // a profile, a card or an overlay opens
  | "close" // and closes
  | "select" // choosing an interest or an option
  | "deselect"
  | "post" // a post goes out
  | "connect" // a like or a connection request
  | "add" // something added to an itinerary
  | "remove"; // something taken out

type Note = { f: number; at: number; len: number; type?: OscillatorType; gain?: number };

/** each sound as a few soft notes (frequency in Hz, start and length in seconds) */
const SOUNDS: Record<SoundName, Note[]> = {
  tap: [{ f: 520, at: 0, len: 0.09, gain: 0.5 }],
  nav: [
    { f: 440, at: 0, len: 0.1, gain: 0.45 },
    { f: 587, at: 0.06, len: 0.14, gain: 0.4 },
  ],
  open: [
    { f: 392, at: 0, len: 0.12, gain: 0.4 },
    { f: 523, at: 0.05, len: 0.12, gain: 0.35 },
    { f: 659, at: 0.1, len: 0.2, gain: 0.3 },
  ],
  close: [
    { f: 587, at: 0, len: 0.1, gain: 0.35 },
    { f: 440, at: 0.06, len: 0.16, gain: 0.35 },
  ],
  select: [{ f: 784, at: 0, len: 0.1, type: "triangle", gain: 0.35 }],
  deselect: [{ f: 523, at: 0, len: 0.09, type: "triangle", gain: 0.3 }],
  post: [
    { f: 523, at: 0, len: 0.25, gain: 0.35 },
    { f: 659, at: 0.08, len: 0.25, gain: 0.3 },
    { f: 784, at: 0.16, len: 0.4, gain: 0.3 },
  ],
  connect: [
    { f: 440, at: 0, len: 0.22, gain: 0.4 },
    { f: 554, at: 0.1, len: 0.35, gain: 0.35 },
  ],
  add: [
    { f: 660, at: 0, len: 0.08, type: "triangle", gain: 0.35 },
    { f: 880, at: 0.05, len: 0.14, type: "triangle", gain: 0.3 },
  ],
  remove: [{ f: 330, at: 0, len: 0.14, type: "triangle", gain: 0.4 }],
};

const KEY = "vc-sound";
type Prefs = { enabled: boolean; volume: number };

function readPrefs(): Prefs {
  const reduced =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const fallback = { enabled: !reduced, volume: 0.6 };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Partial<Prefs>;
    return {
      enabled: typeof p.enabled === "boolean" ? p.enabled : fallback.enabled,
      volume: typeof p.volume === "number" ? Math.min(Math.max(p.volume, 0), 1) : fallback.volume,
    };
  } catch {
    return fallback;
  }
}

let prefs: Prefs | null = null;
const listeners = new Set<() => void>();
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let current: { out: GainNode; name: SoundName; at: number } | null = null;
let activated = false;

const getPrefs = () => (prefs ??= readPrefs());
const SERVER_PREFS: Prefs = { enabled: false, volume: 0.6 };

function savePrefs(next: Prefs) {
  prefs = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // private windows can refuse; the choice still holds for this visit
  }
  if (master) master.gain.value = next.volume * 0.22;
  if (!next.enabled) stopAll();
  listeners.forEach((l) => l());
}

/** the first real tap, click or key press unlocks sound for the visit */
function markActive() {
  activated = true;
}
if (typeof window !== "undefined") {
  for (const t of ["pointerdown", "keydown"] as const)
    window.addEventListener(t, markActive, { capture: true, passive: true });
}

function audio(): AudioContext | null {
  if (ctx) return ctx;
  const AC = typeof window !== "undefined" ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = getPrefs().volume * 0.22;
  // a gentle low pass keeps every tone warm, never shrill
  const warm = ctx.createBiquadFilter();
  warm.type = "lowpass";
  warm.frequency.value = 2400;
  master.connect(warm).connect(ctx.destination);
  return ctx;
}

/** fade out whatever is playing, quickly, so sounds never pile up */
export function stopAll() {
  if (!current || !ctx) return;
  const g = current.out.gain;
  g.cancelScheduledValues(ctx.currentTime);
  g.setValueAtTime(g.value, ctx.currentTime);
  g.linearRampToValueAtTime(0, ctx.currentTime + 0.03);
  const out = current.out;
  window.setTimeout(() => out.disconnect(), 80);
  current = null;
}

export function playSound(name: SoundName) {
  const p = getPrefs();
  if (!p.enabled || p.volume === 0 || !activated) return;
  const ac = audio();
  if (!ac || !master) return;
  if (ac.state === "suspended") void ac.resume();
  const now = ac.currentTime;
  if (current && current.name === name && now - current.at < 0.07) return;
  stopAll();
  const out = ac.createGain();
  out.connect(master);
  let end = 0;
  for (const n of SOUNDS[name]) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = n.type ?? "sine";
    o.frequency.value = n.f;
    const t0 = now + n.at;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(n.gain ?? 0.4, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.len);
    o.connect(g).connect(out);
    o.start(t0);
    o.stop(t0 + n.len + 0.02);
    end = Math.max(end, n.at + n.len);
  }
  const mine = { out, name, at: now };
  current = mine;
  window.setTimeout(() => {
    out.disconnect();
    if (current === mine) current = null;
  }, (end + 0.1) * 1000);
}

/** the sound settings and a way to play, for components */
export function useSound() {
  const state = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getPrefs,
    () => SERVER_PREFS,
  );
  return {
    play: playSound,
    enabled: state.enabled,
    volume: state.volume,
    setEnabled: (enabled: boolean) => savePrefs({ ...getPrefs(), enabled }),
    setVolume: (volume: number) => savePrefs({ ...getPrefs(), volume: Math.min(Math.max(volume, 0), 1) }),
  };
}

/** for tests */
export function __resetSoundForTests() {
  prefs = null;
  activated = false;
  current = null;
  ctx = null;
  master = null;
}
export const __soundNames = Object.keys(SOUNDS) as SoundName[];
export const __isActivated = () => activated;
export const __activate = markActive;
