"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { canUse3D } from "@/features/journey/world/support";
import s from "./camp.module.css";

/**
 * Where the door opens to (ARPIT, 2026-11-18): their sunset hilltop camp over the valley, with the
 * Vibers Club sign, the tent, the lanterns and the seats. ARPIT adds the pieces on it one step at a
 * time. Step 2: the scenery moves like ThreeUI's Temple Night (campScene.ts). The still picture shows
 * first, and stays when 3D is off or motion is reduced.
 */
export function Camp() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = canvas.current;
    const host = root.current;
    if (!el || !host || !canUse3D()) return;
    let scene: Awaited<ReturnType<typeof import("./campScene").createCampScene>> | null = null;
    let frame = 0;
    let last = 0;
    let gone = false;
    const loop = (now: number) => {
      const dt = last ? Math.min(now - last, 50) / 1000 : 0;
      last = now;
      scene?.render(dt);
      frame = requestAnimationFrame(loop);
    };
    import("./campScene")
      .then(({ createCampScene }) => createCampScene(el))
      .then((sc) => {
        if (gone) return sc.dispose();
        scene = sc;
        frame = requestAnimationFrame(loop);
        setLive(true);
      })
      .catch(() => setLive(false));
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      scene?.setPointer(((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1, 1 - ((e.clientY - r.top) / Math.max(1, r.height)) * 2, true);
    };
    const leave = () => scene?.setPointer(0, 0, false);
    host.addEventListener("pointermove", move, { passive: true });
    host.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    return () => {
      gone = true;
      cancelAnimationFrame(frame);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
      scene?.dispose();
    };
  }, []);

  return (
    <section ref={root} className={s.camp} aria-label="Vibers Club camp" data-live={live || undefined}>
      <h1 className={s.title}>Vibers Club</h1>
      <Image
        className={s.picture}
        src="/camp/sunset.webp"
        alt="A hilltop camp at sunset above a river valley: the Vibers Club sign, a tent, lanterns and seats on the grass."
        fill
        priority
        sizes="100vw"
      />
      <canvas ref={canvas} className={s.canvas} aria-hidden="true" />
    </section>
  );
}
