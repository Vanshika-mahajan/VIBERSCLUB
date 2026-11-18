"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { canUse3D } from "@/features/journey/world/support";
import s from "./camp.module.css";

type Scene = Awaited<ReturnType<typeof import("./campScene").createCampScene>>;

/**
 * Where the door opens to (ARPIT, 2026-11-18): their sunset hilltop camp over the valley, with the
 * Vibers Club sign, the tent, the lanterns and the seats, built up one step at a time. The trees and
 * flags move, the Vibers in ARPIT's reference picture sit in the camp as cut-out videos, and a
 * paraglider waits in the sky (campScene.ts). Take off flies it at us until its canopy covers the
 * screen, then the club Home opens. The still picture shows first, and stays when 3D is off or motion
 * is reduced; then Take off goes straight to Home.
 */
export function Camp() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLElement>(null);
  const scene = useRef<Scene | null>(null);
  const router = useRouter();
  const [live, setLive] = useState(false);
  const [flying, setFlying] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const el = canvas.current;
    const host = root.current;
    if (!el || !host || !canUse3D()) return;
    let frame = 0;
    let last = 0;
    let gone = false;
    const loop = (now: number) => {
      const dt = last ? Math.min(now - last, 50) / 1000 : 0;
      last = now;
      // while the door is still shut on top, the camp is hidden: skip it; while it opens, only the
      // doorway shows the camp, so draw it at half resolution and leave the door its frames
      const entry = document.querySelector<HTMLElement>("[data-entry]");
      if (!entry) scene.current?.render(dt);
      else if (entry.dataset.state === "going") scene.current?.render(dt, 0.5);
      frame = requestAnimationFrame(loop);
    };
    import("./campScene")
      .then(({ createCampScene }) => createCampScene(el))
      .then((sc) => {
        if (gone) return sc.dispose();
        scene.current = sc;
        frame = requestAnimationFrame(loop);
        setLive(true);
      })
      .catch(() => setLive(false));
    return () => {
      gone = true;
      cancelAnimationFrame(frame);
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);

  // pages stay mounted after leaving them, so put the camp back as it was when it is shown again
  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => {
      scene.current?.reset();
      setFlying(false);
      setLeaving(false);
    }, 1500);
    return () => window.clearTimeout(t);
  }, [leaving]);

  const takeOff = async () => {
    if (flying) return;
    setFlying(true);
    await scene.current?.takeOff();
    setLeaving(true);
    // the page fades in over the canopy, then Home opens
    window.setTimeout(() => router.push("/home"), 700);
  };

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
      <button type="button" className={s.takeOff} onClick={takeOff} hidden={flying}>
        Take off
      </button>
      <div className={s.veil} data-on={leaving || undefined} aria-hidden="true" />
    </section>
  );
}
