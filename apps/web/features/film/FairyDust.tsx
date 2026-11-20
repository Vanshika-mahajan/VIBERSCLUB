"use client";

import { useEffect, useRef } from "react";

/**
 * Fairy dust behind the pointer (ARPIT, 2026-11-20, painted door experiment): tiny gold and ivory sparkles that
 * twinkle, drift down and fade. A plain Canvas 2D layer over the intro that never takes a click. Off for reduced
 * motion and on screens without a pointer that hovers (a tap still leaves a little burst).
 */
type Mote = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  c: string;
  star: boolean;
};
const COLS = ["#fff4d6", "#f6d58a", "#e9b45a", "#ffffff", "#f3c56b"];

export function FairyDust() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const x = c.getContext("2d");
    if (!x) return;
    const motes: Mote[] = [];
    let raf = 0,
      last = performance.now(),
      px = -1,
      py = -1;
    const size = () => {
      const d = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(innerWidth * d);
      c.height = Math.round(innerHeight * d);
      x.setTransform(d, 0, 0, d, 0, 0);
    };
    size();
    const spawn = (mx: number, my: number, n: number, burst = 0) => {
      for (let i = 0; i < n && motes.length < 260; i++) {
        const a = Math.random() * Math.PI * 2,
          sp = burst ? 40 + Math.random() * burst : 6 + Math.random() * 22;
        const max = 0.7 + Math.random() * 0.8;
        motes.push({
          x: mx + (Math.random() - 0.5) * 8,
          y: my + (Math.random() - 0.5) * 8,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 8,
          life: max,
          max,
          r: 0.8 + Math.random() * 2.2,
          c: COLS[(Math.random() * COLS.length) | 0],
          star: Math.random() < 0.3,
        });
      }
    };
    const move = (e: PointerEvent) => {
      const d = px < 0 ? 0 : Math.hypot(e.clientX - px, e.clientY - py);
      px = e.clientX;
      py = e.clientY;
      if (e.pointerType === "mouse" || e.pointerType === "pen")
        spawn(px, py, Math.min(6, 1 + d / 6));
    };
    const down = (e: PointerEvent) => spawn(e.clientX, e.clientY, 18, 120);
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      x.clearRect(0, 0, innerWidth, innerHeight);
      x.globalCompositeOperation = "lighter";
      for (let i = motes.length - 1; i >= 0; i--) {
        const m = motes[i];
        m.life -= dt;
        if (m.life <= 0) {
          motes.splice(i, 1);
          continue;
        }
        m.vx *= 1 - 1.8 * dt;
        m.vy = m.vy * (1 - 1.8 * dt) + 26 * dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        const k = m.life / m.max,
          tw = 0.6 + 0.4 * Math.sin(now / 70 + m.r * 9),
          al = k * tw;
        x.globalAlpha = al * 0.35;
        x.fillStyle = m.c;
        x.beginPath();
        x.arc(m.x, m.y, m.r * 3.2, 0, Math.PI * 2);
        x.fill();
        x.globalAlpha = al;
        if (m.star) {
          const r = m.r * 2.6 * (0.6 + 0.4 * k);
          x.fillRect(m.x - r, m.y - 0.5, r * 2, 1);
          x.fillRect(m.x - 0.5, m.y - r, 1, r * 2);
        }
        x.beginPath();
        x.arc(m.x, m.y, m.r * (0.5 + 0.5 * k), 0, Math.PI * 2);
        x.fill();
      }
      x.globalAlpha = 1;
      x.globalCompositeOperation = "source-over";
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("resize", size);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("resize", size);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 75,
        pointerEvents: "none",
      }}
    />
  );
}
