"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { useEffect, type ReactNode } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion/gsap";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";

/** Drives Lenis from GSAP's clock, so smooth scrolling and ScrollTrigger reveals stay in step. */
function GsapSync() {
  const lenis = useLenis(ScrollTrigger.update);
  useEffect(() => {
    if (!lenis) return;
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => gsap.ticker.remove(tick);
  }, [lenis]);
  return null;
}

/**
 * Smooth page scrolling for long marketing pages. Not for app screens: chats, panels and
 * the universe have their own scrolling, which Lenis would fight.
 * With reduced motion, the page keeps the browser's normal scrolling.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <>{children}</>;
  return (
    <ReactLenis root options={{ autoRaf: false, lerp: 0.1, anchors: true }}>
      <GsapSync />
      {children}
    </ReactLenis>
  );
}
