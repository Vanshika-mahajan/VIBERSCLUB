"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EntryDoor } from "@/features/entry/EntryDoor";
import { portal } from "@/features/entry/portal";
import { handover, preloadHome } from "@/features/camp/handover";
import { UnveilButton } from "@/features/intro/UnveilButton";
import {
  DOOR_LEN,
  LEAVE_AFTER_SKY,
  PaintedScene,
  SKY_AFTER,
  loadPack,
} from "./paint/scene.js";
import {
  chime,
  glide,
  preloadSound,
  startSound,
  stopSound,
} from "./paint/sound";
import s from "./painted.module.css";

/**
 * ARPIT's interactive intro (2026-11-20): the meadow door opens onto ARPIT's camp, painted live in knife
 * strokes (Lemo-Opuscar Impasto, features/film/paint). A Viber stands alone and checks his phone; the
 * visitor taps Connect on the Vibers nearby and each one paints into the scene, waving (if nobody taps,
 * they connect by themselves). Then the hero paraglides in and the canopy fills the screen, and that
 * frame is lifted away over Home (components/handover). Skip intro (or Escape) goes straight to Home.
 * Without WebGL2 the door does not run or the painting cannot start, and the page goes to Home.
 * Sound (features/film/paint/sound.ts): ARPIT's door sound, a guitar loop, a chime per Viber, wind for the glide.
 */
const NEARBY = [
  { name: "Kabir", line: "Guitar by the fire", swatch: "#3c3a36" },
  { name: "Meera", line: "Chai and sunsets", swatch: "#e8dcc4" },
  { name: "Arjun", line: "Treks at dawn", swatch: "#5f6b45" },
];
const CARD_AT = 2.9; // the phone card shows once we are through the doorway
const CARD_AT_PAINTED = 1.4; // with the painted door we are through when the camp starts
const AUTO_AFTER = 3.2; // seconds without a tap before the next Viber connects by itself

type State = {
  joins: (number | null)[];
  all: number | null;
  sky: number | null;
};

/**
 * `paintedDoor` (ARPIT's experiment, 2026-11-20, /film-experiment): instead of the meadow door scene, the door is
 * painted in the same knife strokes as the camp, in the same canvas. "A World Awaits" is set in type, Unveil swings
 * the painted door open and the camera walks through into the light the camp paints itself on.
 */
export function PaintedIntro({ paintedDoor = false }: { paintedDoor?: boolean } = {}) {
  const router = useRouter();
  const layer = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<PaintedScene | null>(null);
  const t0 = useRef<number | null>(null);
  const st = useRef<State>({ joins: [null, null, null], all: null, sky: null });
  const lastAct = useRef(0);
  const leaving = useRef(false);
  const started = useRef(false);
  const failed = useRef(false);
  const through = useRef(false);
  const glided = useRef(false); // the door is gone: the card may show
  const shown = useRef(0); // painted door: when the page showed, for the meadow's breathing
  const tapped = useRef<number | null>(null); // painted door: when Unveil was tapped
  const [door, setDoor] = useState(!paintedDoor);
  const [closed, setClosed] = useState(paintedDoor); // painted door: title and Unveil showing
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<"wait" | "card" | "joined" | "sky">(
    "wait",
  );
  const [joined, setJoined] = useState<boolean[]>([false, false, false]);

  const fixedT = useRef<number | null>(null); // dev only: a frozen clock for review captures
  const now = () =>
    fixedT.current ??
    (t0.current == null ? 0 : (performance.now() - t0.current) / 1000);

  const leave = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    stopSound(1.6);
    const c = canvas.current;
    if (c && scene.current && t0.current != null) {
      const img = new Image();
      img.src = c.toDataURL("image/jpeg", 0.9);
      handover.show(img, preloadHome());
    }
    router.push("/home");
  }, [router]);

  // each time the page shows again (pages stay mounted): closed door, empty camp
  useEffect(() => {
    leaving.current = false;
    started.current = false;
    through.current = false;
    glided.current = false;
    t0.current = null;
    st.current = { joins: [null, null, null], all: null, sky: null };
    shown.current = performance.now();
    tapped.current = null;
    /* eslint-disable react-hooks/set-state-in-effect -- reset when the page shows again */
    setDoor(!paintedDoor);
    setClosed(paintedDoor);
    setRun((n) => n + 1);
    setPhase("wait");
    setJoined([false, false, false]);
    /* eslint-enable react-hooks/set-state-in-effect */
    router.prefetch("/home");
    preloadSound();
    return () => stopSound(0.3);
  }, [router, paintedDoor]);

  // load the painted pack and set up the renderer at the screen's shape
  useEffect(() => {
    let alive = true;
    const c = canvas.current;
    if (!c) return;
    const H = 1080;
    const W = Math.round(
      Math.min(
        1920,
        Math.max(480, (H * window.innerWidth) / window.innerHeight),
      ),
    );
    Promise.all([
      loadPack("/film/paint"),
      paintedDoor ? loadPack("/film/paint-door") : null,
    ])
      .then(([pack, doorPack]) => {
        if (!alive) return;
        scene.current = new PaintedScene(c, pack, { W, H }, doorPack);
        if (doorPack) scene.current.doorFrame(0, null);
        else scene.current.frame(0, st.current);
      })
      .catch(() => {
        failed.current = true;
      });
    return () => {
      alive = false;
    };
  }, [paintedDoor]);

  // dev only: window.__painted.at(t) freezes the clock at t seconds after the door opened; open() skips the door
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as {
      __painted?: { at: (t: number | null) => void; open: () => void };
    };
    w.__painted = {
      at: (t) => void (fixedT.current = t),
      open: () => {
        started.current = true;
        through.current = true;
        setDoor(false);
      },
    };
    return () => void delete w.__painted;
  }, []);

  const connect = useCallback((i: number) => {
    const s0 = st.current;
    if (s0.joins[i] != null) return;
    const t = now();
    s0.joins[i] = t;
    chime(s0.joins.filter((j) => j != null).length - 1);
    lastAct.current = t;
    setJoined((j) => j.map((v, k) => v || k === i));
    if (s0.joins.every((j) => j != null)) {
      s0.all = t + 0.6;
      s0.sky = t + SKY_AFTER;
      setPhase("joined");
    }
  }, []);

  // the clock: draw every frame, show the card, connect the next Viber if nobody taps, leave at the end
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const sc = scene.current;
      if (leaving.current) return;
      // the painted door: the meadow until Unveil, then the swing and the walk through, then the camp
      if (paintedDoor && !started.current) {
        if (failed.current) return leave();
        if (!sc) return;
        const p = performance.now(),
          idle = (p - shown.current) / 1000;
        const o =
          fixedT.current != null && fixedT.current < 0
            ? DOOR_LEN + fixedT.current
            : tapped.current == null
              ? null
              : (p - tapped.current) / 1000;
        if (o != null && o >= DOOR_LEN && fixedT.current == null) {
          started.current = true;
          through.current = true;
          t0.current = tapped.current! + DOOR_LEN * 1000;
          lastAct.current = 0;
        } else {
          sc.doorFrame(idle, o == null ? null : Math.min(o, DOOR_LEN));
          return;
        }
      }
      if (!started.current) return;
      if (!sc) {
        if (failed.current) leave();
        return;
      }
      if (t0.current == null) {
        t0.current = performance.now();
        lastAct.current = 0;
      }
      const t = now(),
        s0 = st.current;
      const cardAt = paintedDoor ? CARD_AT_PAINTED : CARD_AT;
      if (t > cardAt && through.current && s0.all == null) {
        if (lastAct.current < cardAt) lastAct.current = t; // the idle timer starts when the card shows
        setPhase((p) => (p === "wait" ? "card" : p));
        if (t - lastAct.current > AUTO_AFTER)
          connect(s0.joins.findIndex((j) => j == null));
      }
      if (s0.sky != null && t > s0.sky)
        setPhase((p) => (p === "sky" ? p : "sky"));
      if (s0.sky != null && t > s0.sky + 0.35 && !glided.current) {
        glided.current = true;
        glide();
      }
      sc.frame(t, s0);
      if (s0.sky != null && t > s0.sky + LEAVE_AFTER_SKY) leave();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [connect, leave, paintedDoor]);

  // the painting behind the doorway, the size of the world seen through it, growing as we go through
  useEffect(() => {
    let frame = 0;
    const place = () => {
      const host = layer.current;
      const r = portal.rect;
      if (host) {
        if (!r || !document.querySelector("[data-entry]"))
          host.style.transform = "";
        else {
          const t = Math.min(1, Math.max(0, (r.push - 0.5) / 0.35));
          const b = t * t * (3 - 2 * t);
          const s0 = Math.min(1, Math.max(0.35, r.h * 1.12));
          const sc = Math.min(
            1,
            Math.max(
              s0 + (1 - s0) * b,
              r.h + 2 * Math.abs(r.cy - 0.5) * b + 0.06,
            ),
          );
          const top = Math.max(0, r.cy - r.h / 2);
          const bottom = Math.min(1, r.cy + r.h / 2);
          const ty = Math.min(
            Math.max((r.cy - 0.5) * (1 - b), bottom - 0.5 - sc / 2),
            top - 0.5 + sc / 2,
          );
          host.style.transform = `translate(${(r.cx - 0.5) * 100 * (1 - b)}vw, ${ty * 100}vh) scale(${sc})`;
        }
      }
      frame = requestAnimationFrame(place);
    };
    frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") leave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [leave]);

  const start = useCallback(() => {
    started.current = true;
    startSound();
  }, []);
  // painted door: Unveil (or Enter) swings it open
  const unveil = useCallback(() => {
    if (tapped.current != null || !scene.current) return;
    tapped.current = performance.now();
    setClosed(false);
    startSound();
  }, []);
  const doorDone = useCallback(() => {
    through.current = true;
    setDoor(false);
    // the door never ran (no WebGL or reduced motion): straight to Home
    if (!started.current) leave();
  }, [leave]);

  const sky = phase === "sky";
  return (
    <>
      <div ref={layer} className={s.film}>
        <canvas
          ref={canvas}
          className={s.canvas}
          role="img"
          aria-label="A painted Viber in a camp in Manali connects with Vibers nearby on his phone; they join him waving, then he paraglides over the valley until the canopy fills the view."
        />
      </div>
      {(phase === "card" || phase === "joined" || sky) && (
        <div className={s.caption} aria-live="polite">
          <span className={s.kicker}>{sky ? "II" : "I"}</span>
          <p className={s.headline}>
            {sky ? "Find your vibe." : "New in Manali?"}
          </p>
          <p className={s.sub}>
            {sky ? "Vibers Club · Manali" : "Tap a Viber nearby to connect."}
          </p>
        </div>
      )}
      {(phase === "card" || phase === "joined") && (
        <section
          className={`${s.phone} ${phase === "joined" ? s.out : ""}`}
          aria-label="Vibers nearby"
        >
          <p className={s.eyebrow}>Vibers nearby</p>
          <p className={s.title}>3 Vibers like you</p>
          <ul className={s.list}>
            {NEARBY.map((v, i) => (
              <li key={v.name} className={s.row}>
                <span
                  className={s.dot}
                  style={{ background: v.swatch }}
                  aria-hidden
                />
                <span className={s.who}>
                  <span className={s.name}>{v.name}</span>
                  <span className={s.line}>{v.line}</span>
                </span>
                <button
                  type="button"
                  className={joined[i] ? s.done : s.connect}
                  onClick={() => connect(i)}
                  disabled={joined[i]}
                  aria-label={
                    joined[i]
                      ? `${v.name}, connected`
                      : `Connect with ${v.name}`
                  }
                >
                  {joined[i] ? "Connected" : "Connect"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {paintedDoor && (
        <div className={`${s.paintedDoor} ${closed ? "" : s.opening}`}>
          <p className={s.mark}>Vibers Club</p>
          <h1 className={s.awaits}>
            <span>A World</span>
            <span className={s.awaitsRed}>Awaits</span>
            <svg className={s.swoosh} viewBox="0 0 200 12" aria-hidden="true">
              <path d="M4 9 C 60 3, 130 2, 196 5 C 140 5, 70 7, 10 11 Z" />
            </svg>
          </h1>
          <div className={s.unveil}>
            <UnveilButton tone="brown" onClick={unveil} disabled={!closed} />
          </div>
        </div>
      )}
      {door && (
        <EntryDoor
          key={run}
          backdrop="meadow"
          alive
          through
          onStart={start}
          onDone={doorDone}
        />
      )}
      <button type="button" className={s.skip} onClick={leave}>
        Skip intro
      </button>
    </>
  );
}
