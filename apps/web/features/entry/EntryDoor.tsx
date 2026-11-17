"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "@/lib/motion/gsap";
import { canUse3D } from "@/features/journey/world/support";
import { createEntryScene, initialEntryParams } from "./scene";
import s from "./entry.module.css";

/**
 * The entry, after ARPIT's reference: it lies over Home. An arched doorway stands in the clouds with a
 * sign over a closed door; on the click (or Enter) the sign lights up, the door swings outward, Home
 * shows through the doorway, and the camera pushes straight in until Home fills the screen. Then the
 * entry steps aside and moves to /home, the real Home with its contents and top bar, unchanged.
 *
 * Timeline (seconds from the click):
 *   0.00  the hint fades
 *   0.10  the sign catches and lights up, flickering once            (sign)
 *   0.60  the door swings outward on its right-hand hinge, to 90°     (door)
 *   1.55  the push, straight in through the doorway, faster and faster (push)
 *   2.55  the canvas lets go; Home is there (it was showing through the doorway already)
 *
 * Without WebGL, or with reduced motion, there is no entry: Home shows straight away.
 */
export function EntryDoor() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const params = useRef(initialEntryParams());
  const running = useRef<gsap.core.Timeline | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "going" | "done">("loading");
  const router = useRouter();

  useEffect(() => {
    if (!canUse3D() || !canvas.current) {
      // no entry: straight on to Home
      router.replace("/home");
      setState("done");
      return;
    }
    router.prefetch("/home");
    // pages stay mounted when left, so coming back starts the entry afresh
    Object.assign(params.current, initialEntryParams());
    gsap.set([root.current, hint.current], { clearProps: "all" });
    setState("loading");
    let scene: Awaited<ReturnType<typeof createEntryScene>> | null = null;
    let cancelled = false;
    const tick = (_t: number, delta: number) => scene?.render(Math.min(delta, 50) / 1000);
    createEntryScene(canvas.current, params.current).then((sc) => {
      if (cancelled) return sc.dispose();
      scene = sc;
      gsap.ticker.add(tick);
      setState("ready");
    });
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __gsap: gsap });
    return () => {
      cancelled = true;
      setState("loading");
      gsap.ticker.remove(tick);
      running.current?.kill();
      scene?.dispose();
    };
  }, [router]);

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
    if (state !== "ready") return;
    setState("going");
    const p = params.current;
    const tl = gsap.timeline({ onComplete: () => router.replace("/home") });
    if (hint.current) tl.to(hint.current, { autoAlpha: 0, y: 8, duration: 0.4, ease: "power2.in" }, 0);
    tl.to(p, { sign: 1, duration: 0.5, ease: "power2.out" }, 0.1)
      .to(p, { door: 1, duration: 1.2, ease: "power2.inOut" }, 0.6)
      .to(p, { life: 0.4, duration: 1.0, ease: "none" }, 0.6)
      // one quick push straight in, accelerating all the way
      .to(p, { push: 1, duration: 1.0, ease: "power3.in" }, 1.55)
      // the push ends with the open doorway over the whole screen, so the canvas is clear by then
      .to(root.current, { autoAlpha: 0, duration: 0.1, ease: "none" }, 2.55);
    running.current = tl;
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __entryTimeline: tl });
  }, [state, router]);

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
      <div ref={hint} className={s.hint} aria-hidden="true">
        Tap the door to enter
      </div>
    </div>
  );
}
