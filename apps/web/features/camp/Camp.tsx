"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { canUse3D } from "@/features/journey/world/support";
import { handover, preloadHome } from "./handover";
import s from "./camp.module.css";

type Scene = Awaited<ReturnType<typeof import("./campScene").createCampScene>>;

/** After the door has gone, the camp is alive for this long before the paraglider starts its flight. */
const BEFORE_FLIGHT = 0.35;
/** Without 3D the still camp shows this long, then Home. */
const STILL_FOR = 2500;

/**
 * Where the door opens to (ARPIT, 2026-11-18): their sunset hilltop camp over the valley, with the
 * Vibers Club sign, the tent, the lanterns and the seats. The trees and flags move, the Vibers in
 * ARPIT's reference picture sit in the camp as cut-out videos, and a paraglider waits in the sky
 * (campScene.ts). As the door begins to open the camp comes alive; once the door has gone the
 * paraglider flies at us by itself (ARPIT: no Take off button) until its canopy covers the screen,
 * and Home appears from behind it (handover.ts). Without 3D, or with reduced motion, the still picture
 * shows for a moment and then Home.
 */
export function Camp() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/home");
    const el = canvas.current;
    if (!el || !canUse3D()) {
      const t = window.setTimeout(() => router.push("/home"), STILL_FOR);
      return () => window.clearTimeout(t);
    }
    let scene: Scene | null = null;
    let frame = 0;
    let last = 0;
    let gone = false;
    let clear = -1; // seconds since the door went
    let phase: "waiting" | "flying" | "left" = "waiting";
    let sawDoor = false; // the flight follows the door opening, never on its own
    const homeReady = preloadHome();

    const fly = async () => {
      phase = "flying";
      await scene?.takeOff();
      if (gone || !scene) return;
      // the canopy covers the screen: lay this frame over everything and move on to Home underneath
      handover.show(scene.snapshot(), homeReady);
      phase = "left";
      router.push("/home");
      // pages stay mounted after leaving them: put the camp back as it was for next time
      window.setTimeout(() => {
        scene?.reset();
        phase = "waiting";
        sawDoor = false;
        clear = -1;
      }, 1500);
    };

    const loop = (now: number) => {
      const dt = last ? Math.min(now - last, 50) / 1000 : 0;
      last = now;
      const entry = document.querySelector<HTMLElement>("[data-entry]");
      if (!entry) {
        scene?.wake();
        scene?.render(dt);
        clear = clear < 0 ? 0 : clear + dt;
        if (phase === "waiting" && sawDoor && clear >= BEFORE_FLIGHT) void fly();
      } else if (entry.dataset.state === "going") {
        // the door is opening: the camp shows through the doorway, alive from the first moment
        sawDoor = true;
        scene?.wake();
        scene?.render(dt);
      }
      frame = requestAnimationFrame(loop);
    };
    import("./campScene")
      .then(({ createCampScene }) => createCampScene(el))
      .then((sc) => {
        if (gone) return sc.dispose();
        scene = sc;
        el.dataset.live = "";
        frame = requestAnimationFrame(loop);
      })
      .catch(() => {});
    return () => {
      gone = true;
      cancelAnimationFrame(frame);
      scene?.dispose();
      scene = null;
    };
  }, [router]);

  return (
    <section className={s.camp} aria-label="Vibers Club camp">
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
