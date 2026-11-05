"use client";

import { useEffect, useRef } from "react";
import { Dust, clamp, ease, plain, span, toned } from "./dust";
import s from "./opening.module.css";

/** the sky and trees where the two Vibers meet (the illustration with them lifted out); and our
    Earth, facing Manali, for chapter I */
const SCENE = "/home/scene.webp";
const EARTH = "/home/earth.webp";
/* the two Vibers were cut out of one 1672 x 941 illustration; these are their boxes in it, and the
   point between their fingertips */
const GIRL = { x: 191, y: 79, w: 667, h: 760 },
  BOY = { x: 858, y: 181, w: 762, h: 711 },
  TOUCH = { x: 858, y: 324 },
  PAIR_W = BOY.x + BOY.w - GIRL.x,
  PAIR_H = 813,
  PAIR_MID = 485;

/**
 * The opening of Home, scrubbed by scroll on a sticky stage (the contents sit centred over it):
 *   1. two Vibers leap in over the trees and reach for each other's hand    p .04 to .30
 *   2. a spark where their fingertips meet                                  p .30 to .48
 *   3. the sky breaks into stardust                                         p .34 to .56
 *   4. the stars gather into our Earth, facing Manali                       p .56 to .84
 *      (the live three.js planet from the journey fades in over the still and keeps turning)
 *   5. chapter I, Your vibe, rises                                          p .80 to .98
 * Scrolling back plays it in reverse. With reduced motion it is a still: the Earth and chapter I.
 */
export function Opening() {
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const globe = useRef<HTMLDivElement>(null);
  const girl = useRef<HTMLImageElement>(null);
  const boy = useRef<HTMLImageElement>(null);
  const capA = useRef<HTMLSpanElement>(null);
  const capB = useRef<HTMLSpanElement>(null);
  const word = useRef<HTMLHeadingElement>(null);
  const num = useRef<HTMLParagraphElement>(null);
  const aside = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cv = canvas.current!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let alive = true,
      raf = 0;
    let A: Dust | null = null,
      B: Dust | null = null;
    let planet: {
      render: (on: boolean, time: number) => void;
      dispose: () => void;
    } | null = null;

    Promise.all([plain(SCENE), toned(EARTH)])
      .then(([a, b]) => {
        if (!alive) return;
        A = new Dust(cv, a, 0.6);
        B = new Dust(cv, b, 0.42);
      })
      .catch(() => {});

    // the live planet, only where the 3D journey runs (it shares the same tests)
    import("@/features/journey/world/support").then(({ canUse3D }) => {
      if (!alive || !canUse3D() || !globe.current) return;
      import("./openingPlanet")
        .then(({ makeOpeningPlanet }) =>
          makeOpeningPlanet(globe.current!).then((p) => {
            if (alive) planet = p;
            else p.dispose();
          }),
        )
        .catch(() => {});
    });

    const frame = (time: number) => {
      raf = requestAnimationFrame(frame);
      const w = wrap.current!,
        st = stage.current!;
      const r = w.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) {
        planet?.render(false, time);
        return;
      }
      const total = r.height - innerHeight;
      const p = reduce ? 0.99 : clamp(-r.top / total);
      const W = st.clientWidth,
        H = st.clientHeight;
      const wide = W > 760;
      // the burst point: the middle of the screen, right of the docked contents on wider screens
      const ox = wide ? (W + 268) / 2 : W / 2,
        oy = H * 0.5;

      // 1. the two Vibers float apart, idling before you scroll, then leap in until their
      //    fingertips almost touch at the burst point, as in the illustration
      const meet = ease(span(p, 0.04, 0.3));
      const k = Math.min(
        (H * (wide ? 0.66 : 0.5)) / PAIR_H,
        ((wide ? W - 268 : W) * 0.96) / PAIR_W,
      );
      const apart = (1 - meet) * Math.min(W * 0.16, 260);
      // on a phone they come in once the contents have moved aside, as they cover the list there
      const show = wide ? 1 : span(p, 0.01, 0.06);
      const fade = Math.min(show, 1 - span(p, 0.36, 0.44));
      const place = (
        el: HTMLImageElement,
        cap: HTMLSpanElement,
        b: typeof GIRL,
        dir: number,
        phase: number,
      ) => {
        const bob = Math.sin(time * 0.00125 + phase) * 7 * (1 - meet * 0.8);
        const x = ox + (b.x - TOUCH.x) * k + dir * apart,
          y = oy + (b.y - PAIR_MID) * k + (1 - meet) * H * 0.05 + bob;
        el.style.width = `${b.w}px`;
        el.style.transform = `translate(${x}px, ${y}px) scale(${k}) rotate(${dir * 5 * (1 - meet)}deg)`;
        el.style.opacity = String(fade);
        const cx = Math.min(x + b.w * k * 0.45, W - 16 - cap.offsetWidth);
        cap.style.transform = `translate(${cx}px, ${y + b.h * k + 14}px)`;
        cap.style.opacity = String(Math.min(show, 1 - span(p, 0.2, 0.32)));
      };
      place(girl.current!, capA.current!, GIRL, -1, 0);
      place(boy.current!, capB.current!, BOY, 1, 2);
      // the spark and the burst start between the fingertips
      const tx = ox,
        ty = oy + (TOUCH.y - PAIR_MID) * k;
      aside.current!.style.opacity = String(1 - span(p, 0.02, 0.1));

      // 2 and 3. the meadow breaks into stardust, then 4. the stars gather into the Earth
      const out = span(p, 0.34, 0.56),
        back = span(p, 0.56, 0.84);
      if (back <= 0) A?.draw(1 - out, tx, ty, 1, time);
      else B?.draw(back, W * 0.5, H * 0.5, 1, time);
      // the spark where they meet
      const sp = span(p, 0.3, 0.48);
      if (A && sp > 0 && sp < 1) {
        const g = A.g,
          k = Math.sin(sp * Math.PI),
          rad = 20 + sp * Math.max(W, H) * 0.5;
        const gr = g.createRadialGradient(tx, ty, 0, tx, ty, rad);
        gr.addColorStop(0, `rgba(255,244,220,${0.95 * k})`);
        gr.addColorStop(0.18, `rgba(240,180,90,${0.7 * k})`);
        gr.addColorStop(1, "rgba(213,133,31,0)");
        g.globalCompositeOperation = "lighter";
        g.fillStyle = gr;
        g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = "source-over";
      }
      // the live planet takes over from the still as the last stars settle, and keeps turning
      const live = span(back, 0.72, 1);
      globe.current!.style.opacity = String(live);
      globe.current!.style.transform = `scale(${1.06 - 0.06 * ease(live)})`;
      planet?.render(live > 0, time);

      // 5. chapter I rises
      const rise = ease(span(p, 0.8, 0.98));
      word.current!.style.transform = `translateY(${(1 - rise) * 60}%)`;
      word.current!.style.opacity = String(rise);
      num.current!.style.opacity = String(rise);
    };
    raf = requestAnimationFrame(frame);
    const onResize = () => {
      A?.resize();
      B?.resize();
    };
    addEventListener("resize", onResize);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      removeEventListener("resize", onResize);
      planet?.dispose();
    };
  }, []);

  return (
    <div ref={wrap} className={`vc-bleed ${s.opening}`}>
      <div ref={stage} className={s.stage} data-tone="dark">
        <canvas ref={canvas} className={s.canvas} aria-hidden="true" />
        <div ref={globe} className={s.globe} aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element -- a layer moved by hand every frame */}
        <img ref={girl} src="/home/viber-girl.webp" alt="" className={s.viber} />
        {/* eslint-disable-next-line @next/next/no-img-element -- a layer moved by hand every frame */}
        <img ref={boy} src="/home/viber-boy.webp" alt="" className={s.viber} />
        <span ref={capA} className={s.cap} aria-hidden="true">
          Viber
        </span>
        <span ref={capB} className={s.cap} aria-hidden="true">
          Viber
        </span>
        <p ref={num} className={s.num} aria-hidden="true">
          I
        </p>
        <h2 ref={word} className={s.word} aria-hidden="true">
          Your vibe
        </h2>
        <div ref={aside} className={s.aside} aria-hidden="true">
          <p className={s.hint}>Scroll ↓</p>
          <p className={s.coords}>
            Solang, Manali
            <br />
            32.32° N · 77.16° E
          </p>
        </div>
      </div>
    </div>
  );
}
