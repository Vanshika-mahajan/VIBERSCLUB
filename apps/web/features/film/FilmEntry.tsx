"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { canUse3D } from "@/features/journey/world/support";
import { UnveilButton } from "@/features/intro/UnveilButton";
import { handover, preloadHome } from "@/features/camp/handover";
import { useJourneySound } from "@/features/journey/sound";
import { FILM, type DepthFilm } from "./depthFilm";
import { preloadAmbience, startAmbience, stopAmbience } from "./ambience";
import s from "./film.module.css";

type State = "ready" | "playing" | "leaving";

/**
 * The first page (ARPIT, 2026-11-19: "ok lets build it"). ARPIT's own film, made in their video tool
 * from frames we prepared: the door in the sunset meadow opens, the camera walks through into the
 * hilltop camp, and the paraglider comes at us until its canopy covers the screen. three.js plays it
 * with real depth (depthFilm.ts): before the click the first frame already lives, the near things
 * shifting against the far valley as the pointer moves, pollen drifting between them. "Unveil What
 * Awaits" (or Enter, or a tap on the picture) plays the film; on its last frame, the canopy, the
 * hand-over lifts it away into Home (handover.ts, components/handover/Handover.tsx). The door
 * sounds as it opens (ARPIT's own sound, public/film/door.mp3), over their soft nature recording
 * (ambience.ts). Without 3D the same film plays flat; with reduced motion the still shows and the button goes straight to Home.
 */
export function FilmEntry() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const door = useRef<HTMLAudioElement>(null);
  // the entry keeps the sound on/off the visitor chose before (on unless they ask for reduced motion)
  const soundOn = useJourneySound();
  const film = useRef<DepthFilm | null>(null);
  const [state, setState] = useState<State>("ready");
  const [flat, setFlat] = useState(false);
  // phones get the lighter film; chosen once on the device, so the first render matches the server
  const [src, setSrc] = useState(FILM.src);
  useEffect(() => {
    if (Math.min(window.innerWidth, window.innerHeight) < 700)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the screen size is only known here
      setSrc(FILM.small);
  }, []);
  const router = useRouter();
  const path = usePathname();
  const home = useRef<Promise<unknown> | null>(null);

  // pages stay mounted after leaving them: coming back, the film starts again from the closed door
  useEffect(() => {
    if (path !== "/") return;
    const v = video.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
    stopAmbience(0.3);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when the page is shown again
    setState("ready");
  }, [path]);

  useEffect(() => {
    router.prefetch("/home");
    home.current = preloadHome();
    preloadAmbience();
    const el = canvas.current;
    const v = video.current;
    if (!el || !v) return;
    if (!canUse3D()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- whether 3D works is only known here
      setFlat(true);
      return;
    }
    let raf = 0;
    let gone = false;
    let made: DepthFilm | null = null;
    const onResize = () => made?.resize();
    const onMove = (e: PointerEvent) =>
      made?.pointer(
        (e.clientX / window.innerWidth) * 2 - 1,
        -((e.clientY / window.innerHeight) * 2 - 1),
      );
    import("./depthFilm")
      .then(({ createDepthFilm }) => {
        if (gone) return;
        made = createDepthFilm(el, v);
        film.current = made;
        const loop = (t: number) => {
          made?.render(t);
          // show the canvas once the film has a picture to draw
          if (!("live" in el.dataset) && v.readyState >= 2)
            el.dataset.live = "";
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        if (process.env.NODE_ENV !== "production") {
          // review hook: hold a moment of the film and set the camera, for frames on a review page
          (window as unknown as { __film?: object }).__film = {
            seek(t: number) {
              v.pause();
              v.currentTime = t;
            },
            look(x: number, y: number) {
              made?.pointer(x, y);
              made?.snap();
            },
          };
        }
      })
      .catch(() => setFlat(true));
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove);
    return () => {
      gone = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      made?.dispose();
      film.current = null;
    };
  }, [router]);

  const unveil = () => {
    if (state !== "ready") return;
    const v = video.current;
    if (!v || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push("/home");
      return;
    }
    setState("playing");
    v.currentTime = 0;
    void v.play().catch(() => router.push("/home"));
    // the door sound starts with the film, inside the click, so the browser lets it play
    const a = door.current;
    if (a && soundOn) {
      a.currentTime = 0;
      a.volume = 0.85;
      void a.play().catch(() => {});
    }
    if (soundOn) startAmbience();
  };

  // the canopy covers the screen on the film's last frame: lay that frame over everything and go Home
  const ended = () => {
    if (state !== "playing") return;
    setState("leaving");
    const v = video.current;
    let frame: HTMLImageElement | null = film.current?.snapshot() ?? null;
    if (!frame && v) {
      const c = document.createElement("canvas");
      c.width = 1920;
      c.height = 1080;
      c.getContext("2d")?.drawImage(v, 0, 0, 1920, 1080, 0, 0, 1920, 1080);
      frame = new Image();
      frame.src = c.toDataURL("image/jpeg", 0.9);
    }
    if (frame) handover.show(frame, home.current ?? Promise.resolve());
    // the nature sound fades away as Home appears
    stopAmbience(3);
    router.push("/home");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && path === "/") unveil();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <section
      className={s.entry}
      data-film
      data-state={state}
      aria-label="Vibers Club"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- the film's own first frame, shown before it loads */}
      <img
        className={s.still}
        src={FILM.first}
        alt="A wooden door wrapped in vines stands alone on a stone path in a mountain meadow at sunset."
      />
      <div className={flat ? s.flat : s.hidden}>
        <video
          ref={video}
          src={src}
          muted
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          onEnded={ended}
          aria-hidden="true"
        />
      </div>
      <audio ref={door} src={FILM.door} preload="auto" />
      <canvas
        ref={canvas}
        className={s.canvas}
        hidden={flat}
        aria-hidden="true"
        onClick={unveil}
      />
      <p className={s.wordmark}>Vibers Club</p>
      <div className={s.words}>
        <h1 className={s.title}>
          A World <em>Awaits</em>
        </h1>
        <UnveilButton
          tone="brown"
          onClick={unveil}
          disabled={state !== "ready"}
        />
      </div>
    </section>
  );
}
