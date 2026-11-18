"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/motion/gsap";
import { canUse3D } from "@/features/journey/world/support";
import { UnveilButton } from "@/features/intro/UnveilButton";
import { createEntryScene, initialEntryParams, type EntryBackdrop } from "./scene";
import s from "./entry.module.css";

/** The middle of the button painted on ARPIT's meadow picture (painted out now), where the real one stands. */
const MEADOW_BUTTON = { u: 381 / 1671, v: 600 / 941 };

/**
 * The entry, after ARPIT's reference: it lies over Home. An arched doorway stands in the clouds with a
 * sign over a closed door; on the click (or Enter) the sign lights up, the door swings outward, Home
 * shows through the doorway, and the camera pushes straight in until Home fills the screen. Then the
 * entry steps aside. It lies over the real Home (EntryOnHome, on /home), so Home is simply there,
 * contents and top bar included, with no change of page.
 *
 * Timeline (seconds from the click):
 *   0.00  the hint fades
 *   0.10  the sign catches and lights up, flickering once            (sign)
 *   0.60  the door swings outward on its right-hand hinge, to 90°     (door)
 *   1.50  the push, straight in through the doorway, gathering speed  (push)
 *   2.45  the door and clouds dissolve into Home as we pass through (Home was showing in the doorway)
 *
 * Without WebGL, or with reduced motion, there is no entry: Home shows straight away.
 */
export function EntryDoor({
  onDone,
  backdrop = "clouds",
  alive = false,
}: {
  onDone: () => void;
  backdrop?: EntryBackdrop;
  /** the meadow's scenery moving, after Temple Night (scenery.ts) */
  alive?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const unveil = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  // where the meadow's button stands: over its spot on the picture, or along the bottom when that is off screen
  const [spot, setSpot] = useState<{ x: number; y: number } | null>(null);
  const params = useRef(initialEntryParams());
  const running = useRef<gsap.core.Timeline | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "going" | "done">("loading");
  const done = useRef(onDone);
  useEffect(() => void (done.current = onDone), [onDone]);

  useEffect(() => {
    if (!canUse3D() || !canvas.current) {
      // no entry: Home straight away
      setState("done");
      done.current();
      return;
    }
    let scene: Awaited<ReturnType<typeof createEntryScene>> | null = null;
    let cancelled = false;
    const tick = (_t: number, delta: number) => scene?.render(Math.min(delta, 50) / 1000);
    const place = () => {
      const a = scene?.anchor(MEADOW_BUTTON.u, MEADOW_BUTTON.v);
      const box = canvas.current?.getBoundingClientRect();
      if (!a || !box) return setSpot(null);
      // on narrow screens the spot is off the picture's visible part, so the button stands at the bottom;
      // on wider ones it stands on the spot, kept just inside the edge when the picture is cropped there
      const half = (unveil.current?.offsetWidth ?? 340) / 2;
      if (box.width < 760) return setSpot(null);
      const x = Math.min(Math.max(a.x * box.width, 24 + half), box.width - 24 - half);
      setSpot({ x, y: a.y * box.height });
    };
    createEntryScene(canvas.current, params.current, backdrop, { alive }).then((sc) => {
      if (cancelled) return sc.dispose();
      scene = sc;
      gsap.ticker.add(tick);
      place();
      setState("ready");
    });
    window.addEventListener("resize", place);
    // the pointer, for the camera to ease after and the wisps to trail
    const host = root.current;
    const move = (e: PointerEvent) => {
      const r = canvas.current?.getBoundingClientRect();
      if (!r) return;
      scene?.setPointer(((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1, 1 - ((e.clientY - r.top) / Math.max(1, r.height)) * 2, true);
    };
    const leave = () => scene?.setPointer(0, 0, false);
    host?.addEventListener("pointermove", move, { passive: true });
    host?.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __gsap: gsap });
    return () => {
      cancelled = true;
      window.removeEventListener("resize", place);
      host?.removeEventListener("pointermove", move);
      host?.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
      gsap.ticker.remove(tick);
      running.current?.kill();
      scene?.dispose();
    };
  }, [backdrop, alive]);

  // while the entry is up, the page under it does not scroll
  useEffect(() => {
    if (state === "done") return;
    window.scrollTo(0, 0);
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => void (html.style.overflow = prev);
  }, [state]);

  const enter = useCallback(() => {
    if (state !== "ready" || started.current) return;
    started.current = true;
    setState("going");
    const p = params.current;
    const tl = gsap.timeline({
      onComplete: () => {
        setState("done");
        done.current();
      },
    });
    if (hint.current) tl.to(hint.current, { autoAlpha: 0, y: 8, duration: 0.4, ease: "power2.in" }, 0);
    if (unveil.current) tl.to(unveil.current, { autoAlpha: 0, duration: 0.35, ease: "power2.in" }, 0.05);
    tl.to(p, { sign: 1, duration: 0.5, ease: "power2.out" }, 0.1)
      .to(p, { door: 1, duration: 1.2, ease: "power2.inOut" }, 0.6)
      .to(p, { life: 0.4, duration: 1.0, ease: "none" }, 0.6)
      // the push straight in, gathering speed smoothly as the door finishes opening
      .to(p, { push: 1, duration: 1.15, ease: "power2.in" }, 1.5)
      // over the last steps through the doorway the door and the clouds dissolve softly into Home
      .to(root.current, { autoAlpha: 0, duration: 0.22, ease: "power1.in" }, 2.45);
    running.current = tl;
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __entryTimeline: tl });
  }, [state]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") enter();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enter]);

  if (state === "done") return null;
  return (
    <div ref={root} className={s.entry} data-state={state} data-entry>
      <canvas ref={canvas} className={s.canvas} aria-hidden="true" />
      <button type="button" className={s.door} onClick={enter} disabled={state !== "ready"} aria-label="Open the door to Vibers Club" />
      {backdrop === "meadow" && (
        <div
          ref={unveil}
          className={s.unveil}
          data-spot={spot ? "picture" : "bottom"}
          style={spot ? { left: spot.x, top: spot.y } : undefined}
        >
          <UnveilButton tone="brown" onClick={enter} disabled={state !== "ready"} />
        </div>
      )}
      {/* on the meadow the button invites instead of the hint */}
      <div ref={hint} className={s.hint} aria-hidden="true" hidden={backdrop === "meadow"}>
        Tap the door to enter
      </div>
    </div>
  );
}
