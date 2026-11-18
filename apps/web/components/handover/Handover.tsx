"use client";

import { useEffect, useRef } from "react";
import { handover } from "@/features/camp/handover";

/**
 * Lays the camp's last frame (the canopy covering the screen) over every page while Home gets ready,
 * then sweeps it up and away like the canopy passing overhead (features/camp/handover.ts).
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
      // the canopy sweeps on up over our heads and away, uncovering Home underneath, its shadow
      // trailing at the lower edge; no cross-fade, so the two pictures never show through each other
      el.style.boxShadow = "0 40px 80px rgba(20, 10, 4, 0.45)";
      const anim = el.animate(
        [
          { transform: "translateY(0) scale(1)" },
          { transform: "translateY(-112%) scale(1.06)" },
        ],
        { duration: 1000, easing: "cubic-bezier(0.6, 0, 0.25, 1)", fill: "forwards" },
      );
      await anim.finished.catch(() => {});
      if (!alive) return;
      anim.cancel();
      el.style.opacity = "0";
      el.style.boxShadow = "";
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
