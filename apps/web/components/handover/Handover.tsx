"use client";

import { useEffect, useRef } from "react";
import { handover } from "@/features/camp/handover";

/**
 * Lays the camp's last frame (the canopy covering the screen) over every page while Home gets ready,
 * then opens it out and fades it away (features/camp/handover.ts).
 */
export function Handover() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      const s = handover.take();
      const el = host.current;
      if (!s || !el) return;
      s.frame.style.cssText = "width:100%;height:100%;display:block";
      el.replaceChildren(s.frame);
      el.style.opacity = "1";
      el.style.transform = "scale(1)";
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
      const anim = el.animate(
        [
          { opacity: 1, transform: "scale(1)" },
          { opacity: 0, transform: "scale(1.15)" },
        ],
        { duration: 900, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" },
      );
      await anim.finished.catch(() => {});
      if (!alive) return;
      anim.cancel();
      el.style.opacity = "0";
      el.replaceChildren();
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
      style={{ position: "fixed", inset: 0, zIndex: 100, pointerEvents: "none", opacity: 0, transformOrigin: "50% 40%" }}
    />
  );
}
