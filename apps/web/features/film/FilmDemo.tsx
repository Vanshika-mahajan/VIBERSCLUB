"use client";

import { useEffect, useRef, useState } from "react";
import { FILM, type DepthFilm } from "./depthFilm";

/**
 * Review page for ARPIT's entry film played with real depth in three.js. Move the pointer to look round
 * the edges of things; on phones the camera drifts on its own.
 */
export function FilmDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const filmRef = useRef<DepthFilm | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    let raf = 0;
    let disposed = false;
    let film: DepthFilm | null = null;
    const onResize = () => film?.resize();
    const onMove = (e: PointerEvent) => {
      film?.pointer(
        (e.clientX / window.innerWidth) * 2 - 1,
        -((e.clientY / window.innerHeight) * 2 - 1),
      );
    };
    import("./depthFilm").then(({ createDepthFilm }) => {
      if (disposed) return;
      film = createDepthFilm(canvas, video);
      filmRef.current = film;
      // dev review hook: seek to a moment and hold it, for frames on a review page
      (
        window as unknown as {
          __film?: { seek(t: number): void; look(x: number, y: number): void };
        }
      ).__film = {
        look(x: number, y: number) {
          film?.pointer(x, y);
          film?.snap();
        },
        seek(t: number) {
          video.pause();
          video.currentTime = t;
        },
      };
      const loop = (time: number) => {
        film?.render(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      film?.dispose();
      filmRef.current = null;
    };
  }, []);

  const start = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().then(() => setPlaying(true));
  };

  return (
    <main
      style={{ position: "fixed", inset: 0, background: "#000", zIndex: 200 }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
      <video
        ref={videoRef}
        src={FILM.src}
        muted
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        onEnded={() => setPlaying(false)}
        style={{
          position: "absolute",
          width: 2,
          height: 2,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      {!playing && (
        <button
          type="button"
          onClick={start}
          style={{
            position: "absolute",
            left: "50%",
            bottom: "12%",
            transform: "translateX(-50%)",
            padding: "14px 28px",
            background: "#2A1B13",
            color: "#F7F2E8",
            border: "1px solid #F7F2E8",
            font: "600 14px/1 var(--font-inter, system-ui)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Play the entry
        </button>
      )}
    </main>
  );
}
