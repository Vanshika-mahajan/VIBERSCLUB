"use client";

import { useEffect, useRef } from "react";
import { handover } from "@/features/camp/handover";

/**
 * Lays the camp's last frame (the canopy covering the screen) over every page while Home gets ready,
 * then plays the hand-over (features/camp/handover.ts). ARPIT asked for it to be clean, premium and
 * intuitive, so it reads as the paraglider passing over you:
 *   0.00  the low sun glows through the fabric for a breath
 *   0.15  the canopy lifts up and away over your head, gathering speed and softening with motion,
 *         its shadow trailing across Home as it goes
 *   0.75  the sun comes back: a warm wash of light over Home, fading out
 * Nothing cross-fades, so the camp and Home never show through each other.
 */
export function Handover() {
  const host = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const sun = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      const s = handover.take();
      const el = host.current;
      const cloth = sheet.current;
      const glow = sun.current;
      if (!s || !el || !cloth || !glow) return;
      s.frame.style.cssText = "width:100%;height:100%;display:block;object-fit:cover";
      await s.frame.decode().catch(() => {});
      cloth.replaceChildren(s.frame);
      el.style.visibility = "visible";
      // Home's pictures decoded and the new page on screen (at most a few seconds)
      const onHome = new Promise<void>((res) => {
        const start = performance.now();
        const look = () => {
          if (!alive) return res();
          if (location.pathname === "/home" || performance.now() - start > 4000) return res();
          requestAnimationFrame(look);
        };
        look();
      });
      await Promise.race([Promise.all([s.ready, onHome]), new Promise((r) => setTimeout(r, 4500))]);
      // two frames so Home has painted underneath
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (!alive) return;
      // review only: window.__handoverSlow stretches the hand-over to look at it frame by frame
      const slow = process.env.NODE_ENV !== "production" ? Number((window as { __handoverSlow?: number }).__handoverSlow ?? 1) : 1;
      const lift = cloth.animate(
        [
          { transform: "translateY(0) scale(1)", filter: "brightness(1) blur(0px)", offset: 0 },
          { transform: "translateY(0) scale(1.01)", filter: "brightness(1.14) blur(0px)", offset: 0.14 },
          { transform: "translateY(-55%) scale(1.05)", filter: "brightness(1.08) blur(2px)", offset: 0.6 },
          { transform: "translateY(-125%) scale(1.1)", filter: "brightness(1) blur(5px)", offset: 1 },
        ],
        { duration: 1150 * slow, easing: "cubic-bezier(0.55, 0, 0.35, 1)", fill: "forwards" },
      );
      const light = glow.animate(
        [
          { opacity: 0, offset: 0 },
          { opacity: 0, offset: 0.45 },
          { opacity: 1, offset: 0.68 },
          { opacity: 0, offset: 1 },
        ],
        { duration: 1700 * slow, easing: "ease-out", fill: "forwards" },
      );
      await Promise.all([lift.finished, light.finished]).catch(() => {});
      if (!alive) return;
      lift.cancel();
      light.cancel();
      el.style.visibility = "hidden";
      cloth.replaceChildren();
    };
    const off = handover.subscribe(() => void run());
    return () => {
      alive = false;
      off();
    };
  }, []);

  return (
    <div
      ref={host}
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex: 100, pointerEvents: "none", visibility: "hidden", overflow: "hidden" }}
    >
      <div
        ref={sun}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          background: "radial-gradient(120% 80% at 50% 0%, rgba(255, 196, 120, 0.42), rgba(255, 170, 90, 0.14) 45%, rgba(255, 160, 80, 0) 75%)",
          mixBlendMode: "screen",
        }}
      />
      <div
        ref={sheet}
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: "50% 0%",
          // the canopy's shadow, trailing below its lower edge as it passes over
          boxShadow: "0 60px 140px 40px rgba(20, 10, 4, 0.5)",
          willChange: "transform, filter",
        }}
      />
    </div>
  );
}
