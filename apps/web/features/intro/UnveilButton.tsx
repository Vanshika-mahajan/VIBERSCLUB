"use client";

import "@fontsource-variable/geist-mono";
import { useEffect, useRef, type Ref } from "react";
import { prefersReducedMotion } from "@/lib/motion/useReducedMotion";
import s from "./unveil.module.css";

type Props = {
  ref?: Ref<HTMLButtonElement>;
  /** where it sits on the screen */
  className?: string;
  onClick: () => void;
  disabled: boolean;
};

/** A hairline of light left on the metal by the pointer; it fades over about a second. */
type Scratch = { x: number; y: number; dx: number; dy: number; born: number; light: boolean };
/** A tiny glint of grit in the brushed metal that twinkles now and then. */
type Glint = { x: number; y: number; phase: number; speed: number; size: number };

const SCRATCH_LIFE = 1400;

/**
 * "Unveil What Awaits", ARPIT's liquid-chrome button (built from their recording of a ThreeUI
 * preview): a polished chrome rim around a frosted, brushed-metal face, a glass orb that holds the
 * arrow and lights up amber on hover, glints of grit that twinkle in the metal, and fine light
 * scratches the pointer draws across the face as it moves. The canvas only adds the glints and the
 * scratches; everything else is CSS, so the button looks right before any script runs.
 */
export function UnveilButton({ ref, className, onClick, disabled }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const hover = useRef(false);
  const scratches = useRef<Scratch[]>([]);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx || prefersReducedMotion()) return;
    let frame = 0;
    let glints: Glint[] = [];
    let w = 0;
    let h = 0;
    const size = () => {
      const r = el.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width;
      h = r.height;
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      glints = Array.from({ length: Math.round((w * h) / 260) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 1.8,
        size: 0.5 + Math.random() * 0.9,
      }));
    };
    size();
    const observer = new ResizeObserver(size);
    observer.observe(el);

    const draw = (now: number) => {
      ctx.clearRect(0, 0, w, h);
      const t = now / 1000;
      for (const g of glints) {
        const a = Math.max(0, Math.sin(t * g.speed + g.phase)) ** 6;
        if (a < 0.02) continue;
        ctx.fillStyle = `rgba(255,255,255,${a * (hover.current ? 0.95 : 0.7)})`;
        ctx.fillRect(g.x, g.y, g.size, g.size);
      }
      scratches.current = scratches.current.filter((sc) => now - sc.born < SCRATCH_LIFE);
      ctx.lineWidth = 0.8;
      for (const sc of scratches.current) {
        const a = 1 - (now - sc.born) / SCRATCH_LIFE;
        ctx.strokeStyle = sc.light ? `rgba(255,250,240,${a * 0.85})` : `rgba(60,48,40,${a * 0.35})`;
        ctx.beginPath();
        ctx.moveTo(sc.x - sc.dx, sc.y - sc.dy);
        ctx.lineTo(sc.x + sc.dx, sc.y + sc.dy);
        ctx.stroke();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const scratch = (e: React.PointerEvent<HTMLButtonElement>) => {
    const r = canvas.current?.getBoundingClientRect();
    if (!r) return;
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const prev = last.current;
    last.current = { x, y };
    if (!prev || Math.hypot(x - prev.x, y - prev.y) < 6 || scratches.current.length > 40) return;
    // each scratch runs roughly along the pointer's path, a little scattered around it
    const angle = Math.atan2(y - prev.y, x - prev.x) + (Math.random() - 0.5) * 0.9;
    const len = 6 + Math.random() * 16;
    scratches.current.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 14,
      dx: Math.cos(angle) * len,
      dy: Math.sin(angle) * len,
      born: performance.now(),
      light: Math.random() > 0.3,
    });
  };

  return (
    <button
      ref={ref}
      type="button"
      className={`${s.unveil} ${className ?? ""}`}
      onClick={onClick}
      disabled={disabled}
      onPointerEnter={() => void (hover.current = true)}
      onPointerLeave={() => {
        hover.current = false;
        last.current = null;
      }}
      onPointerMove={scratch}
    >
      <span className={s.face}>
        <canvas ref={canvas} className={s.canvas} aria-hidden="true" />
        <span className={s.label}>Unveil What Awaits</span>
        <span className={s.orb} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M5 12h13M13 6.5 18.5 12 13 17.5" />
          </svg>
        </span>
      </span>
    </button>
  );
}
