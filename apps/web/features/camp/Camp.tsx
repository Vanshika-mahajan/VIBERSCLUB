"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { canUse3D } from "@/features/journey/world/support";
import { portal } from "@/features/entry/portal";
import { handover, preloadHome } from "./handover";
import s from "./camp.module.css";

type Scene = Awaited<ReturnType<typeof import("./campScene").createCampScene>>;

/** After the door has gone, the paraglider glides on this long before it comes at us. */
const BEFORE_FLIGHT = 0.3;
/** Without 3D the still camp shows this long, then Home. */
const STILL_FOR = 2500;

/**
 * Where the door opens to (ARPIT, 2026-11-18): their sunset hilltop camp over the valley, with the
 * Vibers Club sign, the tent, the lanterns and the seats. The trees and flags move, the Vibers in
 * ARPIT's reference picture sit in the camp as cut-out videos, and a paraglider waits in the sky
 * (campScene.ts). As the door begins to open the camp comes alive, seen through the doorway as the
 * world on the other side (portal.ts), the paraglider already gliding in it; just after the door has
 * gone it comes at us (no Take off button) until its canopy covers the screen, and Home appears from
 * behind it (handover.ts). Without 3D, or with reduced motion, the still picture
 * shows for a moment and then Home.
 */
export function Camp({ glider = true }: { glider?: boolean } = {}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLElement>(null);
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/home");
    const el = canvas.current;
    if (!el || !canUse3D()) {
      // without the paraglider the camp is where the visit ends, so it stays
      if (!glider) return;
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

    // the camp as the world seen through the doorway: centred in it, the whole camp from sky to grass
    // filling its height, growing with it as the camera goes through, and full screen by the time the
    // door fades away
    const place = () => {
      const host = root.current;
      const r = portal.rect;
      if (!host) return;
      if (!r || !document.querySelector("[data-entry]")) {
        if (host.style.transform) host.style.transform = "";
        return;
      }
      // once the camp fills the screen the camera walks straight on into it, with no pause
      if (r.push >= 0.85) scene?.walkOn();
      const t = Math.min(1, Math.max(0, (r.push - 0.5) / 0.35));
      const b = t * t * (3 - 2 * t);
      const s0 = Math.min(1, Math.max(0.35, r.h * 1.12));
      // never smaller than the doorway itself, wherever it sits, so no gap ever shows at its edges
      const sc = Math.min(1, Math.max(s0 + (1 - s0) * b, r.h + 2 * Math.abs(r.cy - 0.5) * b + 0.06));
      // keep the camp over the part of the doorway that is on screen
      const top = Math.max(0, r.cy - r.h / 2);
      const bottom = Math.min(1, r.cy + r.h / 2);
      const ty = Math.min(Math.max((r.cy - 0.5) * (1 - b), bottom - 0.5 - sc / 2), top - 0.5 + sc / 2);
      host.style.transform = `translate(${(r.cx - 0.5) * 100 * (1 - b)}vw, ${ty * 100}vh) scale(${sc})`;
    };

    const loop = (now: number) => {
      const dt = last ? Math.min(now - last, 50) / 1000 : 0;
      last = now;
      const entry = document.querySelector<HTMLElement>("[data-entry]");
      place();
      if (!entry) {
        scene?.wake();
        if (sawDoor) scene?.walkOn();
        scene?.render(dt);
        clear = clear < 0 ? 0 : clear + dt;
        if (glider && phase === "waiting" && sawDoor && clear >= BEFORE_FLIGHT) void fly();
      } else if (entry.dataset.state === "going") {
        // the door is opening: the camp shows through the doorway, alive from the first moment
        sawDoor = true;
        scene?.wake();
        scene?.render(dt);
      }
      frame = requestAnimationFrame(loop);
    };
    import("./campScene")
      .then(({ createCampScene }) => createCampScene(el, { glider }))
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
  }, [router, glider]);

  return (
    <section ref={root} className={s.camp} aria-label="Vibers Club camp">
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
