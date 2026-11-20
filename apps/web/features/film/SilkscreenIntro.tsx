"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EntryDoor } from "@/features/entry/EntryDoor";
import { portal } from "@/features/entry/portal";
import { handover, preloadHome } from "@/features/camp/handover";
import s from "./silkscreen.module.css";

/**
 * ARPIT's experiment (2026-11-20): the meadow door opens onto the silkscreen film about the club.
 *
 *   click   the door swings out; the film starts at once (inside the click, so its sound may play),
 *           so the first squeegee pulls print the sky while we see it through the doorway
 *   ~2.7 s  the camera has passed through the doorway: the film fills the screen
 *   25 s    the film ends on the finished poster taped to a workbench; that frame is lifted away
 *           over Home (components/handover/Handover.tsx), the same hand-over the paraglider uses
 *
 * "Skip intro" stands in the corner the whole time (Escape too) and goes straight to Home, lifting
 * the film's current frame away when it is playing. Without WebGL or with reduced motion the door
 * does not run, so the page goes straight to Home.
 */
const FILM = "/film/silkscreen-intro.mp4";

export function SilkscreenIntro() {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const leaving = useRef(false);
  const [door, setDoor] = useState(true);
  const [run, setRun] = useState(0);

  // each time the page shows again (pages stay mounted), back to the closed door and the film at the start
  useEffect(() => {
    started.current = false;
    leaving.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when the page shows again
    setDoor(true);
    setRun((n) => n + 1);
    router.prefetch("/home");
    const v = video.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
    return () => v?.pause();
  }, [router]);

  const leave = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    const v = video.current;
    if (v && started.current && v.readyState >= 2) {
      // lift the film's current frame away over Home
      const c = document.createElement("canvas");
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext("2d")?.drawImage(v, 0, 0);
      const img = new Image();
      img.src = c.toDataURL("image/jpeg", 0.9);
      v.pause();
      handover.show(img, preloadHome());
    } else v?.pause();
    router.push("/home");
  }, [router]);

  // the film behind the doorway, the size of the world seen through it, growing as we go through
  useEffect(() => {
    let frame = 0;
    const place = () => {
      const host = layer.current;
      const r = portal.rect;
      if (host) {
        if (!r || !document.querySelector("[data-entry]")) host.style.transform = "";
        else {
          const t = Math.min(1, Math.max(0, (r.push - 0.5) / 0.35));
          const b = t * t * (3 - 2 * t);
          const s0 = Math.min(1, Math.max(0.35, r.h * 1.12));
          const sc = Math.min(1, Math.max(s0 + (1 - s0) * b, r.h + 2 * Math.abs(r.cy - 0.5) * b + 0.06));
          const top = Math.max(0, r.cy - r.h / 2);
          const bottom = Math.min(1, r.cy + r.h / 2);
          const ty = Math.min(Math.max((r.cy - 0.5) * (1 - b), bottom - 0.5 - sc / 2), top - 0.5 + sc / 2);
          host.style.transform = `translate(${(r.cx - 0.5) * 100 * (1 - b)}vw, ${ty * 100}vh) scale(${sc})`;
        }
      }
      frame = requestAnimationFrame(place);
    };
    frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") leave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [leave]);

  const start = useCallback(() => {
    const v = video.current;
    if (!v || started.current) return;
    started.current = true;
    v.currentTime = 0;
    v.muted = false;
    // inside the click, so the sound may start; if the browser still refuses, play it silent
    v.play().catch(() => {
      v.muted = true;
      return v.play().catch(() => {});
    });
  }, []);

  const doorDone = useCallback(() => {
    setDoor(false);
    // the door never ran (no WebGL or reduced motion): straight to Home
    if (!started.current) leave();
  }, [leave]);

  return (
    <>
      <div ref={layer} className={s.film}>
        <video
          ref={video}
          className={s.video}
          src={FILM}
          poster="/film/silkscreen-first.webp"
          playsInline
          preload="auto"
          onEnded={leave}
          aria-label="Vibers Club, a short film: one Manali travel poster printed by hand, from morning to a bonfire night."
        />
      </div>
      {door && <EntryDoor key={run} backdrop="meadow" alive through onStart={start} onDone={doorDone} />}
      <button type="button" className={s.skip} onClick={leave}>
        Skip intro
      </button>
    </>
  );
}
