"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/motion/gsap";
import { prefersReducedMotion } from "@/lib/motion/useReducedMotion";
import { handoff, useHandoff } from "./handoff";
import s from "./canopy.module.css";

/**
 * Phase 6 on Home's side. Renders nothing, unless the entry has just handed over (handoff.ts): then
 * the paraglider's canopy covers the page on the first frame, exactly as the entry left it, and opens
 * from the middle outward, about 1.6 seconds, revealing Home underneath. A normal visit to Home never
 * sees it.
 */
export function CanopyReveal() {
  const pending = useHandoff();
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pending || !el.current) return;
    const node = el.current;
    window.scrollTo(0, 0);
    const done = () => handoff.finish();
    const tl = prefersReducedMotion()
      ? gsap.timeline({ onComplete: done }).to(node, { autoAlpha: 0, duration: 0.4 })
      : gsap
          .timeline({ onComplete: done })
          .to(node, { "--open": 130, duration: 1.6, ease: "power2.inOut" }, 0.2)
          .to(node, { scale: 1.25, duration: 1.8, ease: "power1.in" }, 0.2);
    // development only: the review script steps through the curtain frame by frame
    if (process.env.NODE_ENV !== "production") {
      Object.assign(window, { __canopyTimeline: tl });
      if ((window as { __holdCanopy?: boolean }).__holdCanopy) tl.pause();
    }
    // (if the page is left mid-way, the canopy simply opens again on the next visit, then lets go)
    return () => void tl.kill();
  }, [pending]);

  if (!pending) return null;
  return <div ref={el} className={`${s.fabric} ${s.reveal}`} aria-hidden="true" />;
}
