"use client";

import { useEffect, useRef } from "react";
import { Dust, clamp, ease, span, toned } from "./dust";
import s from "./opening.module.css";
import c from "./chapter.module.css";

/**
 * A chapter opener on Home: a wide photograph that gathers out of stardust as it scrolls into view,
 * with the chapter's name rising over it and its numeral at the top right. The photographs are
 * placeholders; any wide picture works.
 */
export function Chapter({
  n,
  title,
  img,
  y = 0.5,
}: {
  n: string;
  title: string;
  img: string;
  y?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const word = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let alive = true,
      raf = 0,
      D: Dust | null = null;
    toned(img)
      .then((src) => {
        if (alive) D = new Dust(canvas.current!, src, y);
      })
      .catch(() => {});
    const frame = (time: number) => {
      raf = requestAnimationFrame(frame);
      const r = box.current!.getBoundingClientRect();
      if (!D || r.bottom < 0 || r.top > innerHeight) return;
      const t = reduce
        ? 1
        : ease(clamp((innerHeight - r.top) / (innerHeight * 0.75)));
      D.draw(t, D.w * 0.5, D.h * 0.55, 1, time);
      const rise = ease(span(t, 0.7, 1));
      word.current!.style.transform = `translateY(${(1 - rise) * 50}%)`;
      word.current!.style.opacity = String(rise);
    };
    raf = requestAnimationFrame(frame);
    const onResize = () => D?.resize();
    addEventListener("resize", onResize);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      removeEventListener("resize", onResize);
    };
  }, [img, y]);

  return (
    <div ref={box} className={c.chapter} data-tone="dark">
      <canvas ref={canvas} className={s.canvas} aria-hidden="true" />
      <span className={c.n} aria-hidden="true">
        {n}
      </span>
      <h2 ref={word} className={c.title}>
        {title}
      </h2>
    </div>
  );
}
