"use client";

import { useEffect, useMemo, useRef } from "react";
import { hashtag, interpret } from "@/features/discover/interpret";
import { discover } from "@/features/discover/rank";
import { vibers } from "@/lib/demo/people";
import { useDemo } from "@/lib/demo/store";
import { interestById } from "@/lib/taxonomy";
import { Dust, clamp, ease, span, toned } from "./dust";
import s from "./opening.module.css";

/** the meadow by day, where the two thoughts meet; and our Earth, facing Manali, for chapter I */
const MEADOW = "/journey/day.webp";
const EARTH = "/home/earth.webp";

/**
 * The opening of Home, scrubbed by scroll on a sticky stage (the contents sit centred over it):
 *   1. two matching thoughts, yours and a local's, drift toward each other   p .04 to .30
 *   2. a spark where they meet                                              p .30 to .48
 *   3. the meadow breaks into stardust                                      p .34 to .56
 *   4. the stars gather into our Earth, facing Manali                       p .56 to .84
 *      (the live three.js planet from the journey fades in over the still and keeps turning)
 *   5. chapter I, Your vibe, rises                                          p .80 to .98
 * Scrolling back plays it in reverse. With reduced motion it is a still: the Earth and chapter I.
 */
export function Opening() {
  const me = useDemo((st) => st.me);
  const blocked = useDemo((st) => st.blocked);
  // the other thought: the best match for your vibe, with the interest you share
  const other = useMemo(() => {
    const t = interpret(me.vibe, { added: me.interests, removed: [] });
    const m = discover(
      t,
      vibers.filter((v) => !blocked.includes(v.id)),
      4,
    ).matches[0];
    const v = m?.viber;
    const shared = v
      ? me.interests.find((i) => v.interests.includes(i))
      : undefined;
    const tag = hashtag(
      interestById[shared ?? me.interests[0]]?.label ?? "Sunrise",
    );
    return {
      name: v?.name.split(" ")[0] ?? "Tashi",
      status: v?.status === "local" ? "local" : "visiting",
      tag,
    };
  }, [me, blocked]);
  const mine = {
    name: me.name.split(" ")[0],
    status: me.status === "local" ? "local" : "visiting",
  };

  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const globe = useRef<HTMLDivElement>(null);
  const tA = useRef<HTMLDivElement>(null);
  const tB = useRef<HTMLDivElement>(null);
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

    Promise.all([toned(MEADOW), toned(EARTH)])
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

      // 1. the two thoughts drift toward each other, idling before you scroll
      const meet = ease(span(p, 0.04, 0.3));
      const bob = Math.sin(time * 0.0012) * 6;
      const a = tA.current!,
        b = tB.current!;
      const gap = 18,
        aw = a.offsetWidth,
        bw = b.offsetWidth;
      const fade = 1 - span(p, 0.36, 0.44);
      if (wide) {
        // side by side: you from the left, them from the right
        const ax0 = W * 0.08,
          bx0 = W * 0.92 - bw,
          ax1 = ox - aw - gap / 2,
          bx1 = ox + gap / 2;
        a.style.transform = `translate(${ax0 + (ax1 - ax0) * meet}px, ${-a.offsetHeight / 2 - 40 + bob + 40 * meet}px)`;
        b.style.transform = `translate(${bx0 + (bx1 - bx0) * meet}px, ${-b.offsetHeight / 2 + 30 - bob - 30 * meet}px)`;
        a.style.opacity = b.style.opacity = String(fade);
      } else {
        // on a phone they come from above and below, once the contents have moved aside
        const h = a.offsetHeight,
          ay0 = -H * 0.3,
          by0 = H * 0.26,
          ay1 = -h - gap / 2,
          by1 = gap / 2;
        a.style.transform = `translate(${(W - aw) / 2}px, ${ay0 + (ay1 - ay0) * meet + bob}px)`;
        b.style.transform = `translate(${(W - bw) / 2}px, ${by0 + (by1 - by0) * meet - bob}px)`;
        a.style.opacity = b.style.opacity = String(
          Math.min(fade, span(p, 0.01, 0.06)),
        );
      }
      aside.current!.style.opacity = String(1 - span(p, 0.02, 0.1));

      // 2 and 3. the meadow breaks into stardust, then 4. the stars gather into the Earth
      const out = span(p, 0.34, 0.56),
        back = span(p, 0.56, 0.84);
      if (back <= 0) A?.draw(1 - out, ox, oy, 1, time);
      else B?.draw(back, W * 0.5, H * 0.5, 1, time);
      // the spark where they meet
      const sp = span(p, 0.3, 0.48);
      if (A && sp > 0 && sp < 1) {
        const g = A.g,
          k = Math.sin(sp * Math.PI),
          rad = 20 + sp * Math.max(W, H) * 0.5;
        const gr = g.createRadialGradient(ox, oy, 0, ox, oy, rad);
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
        <div ref={tA} className={s.thought} aria-hidden="true">
          <b>{mine.name[0]}</b>
          <span>
            <small>
              {mine.name} · {mine.status}
            </small>
            <em>{other.tag}</em>
          </span>
        </div>
        <div ref={tB} className={s.thought} aria-hidden="true">
          <b>{other.name[0]}</b>
          <span>
            <small>
              {other.name} · {other.status}
            </small>
            <em>{other.tag}</em>
          </span>
        </div>
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
