"use client";

import { useEffect, useState } from "react";
import OptionWheel from "@/components/reactbits/OptionWheel";
import { useSound } from "@/lib/sound";

/**
 * A small wheel at the side of Discover naming its two parts, the thought sphere and the gallery
 * below it, so it is clear there is more under the globe. Turning it (or tapping a name) scrolls
 * there with a soft tick; scrolling the page turns it back.
 */
const ITEMS = ["The orbit of thoughts", "Faces waiting below ↓"];

export function DiscoverWheel() {
  const [at, setAt] = useState(0);
  const sound = useSound();

  // follow the page: the wheel shows whichever part you are looking at
  useEffect(() => {
    const below = document.getElementById("community");
    if (!below) return;
    const io = new IntersectionObserver(([e]) => setAt(e.isIntersecting ? 1 : 0), { rootMargin: "-45% 0px -45% 0px" });
    io.observe(below);
    return () => io.disconnect();
  }, []);

  return (
    <nav className="vc-wheel" aria-label="Parts of Discover">
      <OptionWheel
        items={ITEMS}
        selected={at}
        defaultSelected={0}
        ariaLabel="Parts of Discover: the sphere, and the gallery below"
        side="right"
        fontSize={0.95}
        spacing={1.9}
        curve={1}
        tilt={14}
        blur={1.2}
        fade={0.45}
        smoothing={220}
        inset={0}
        draggable
        textColor="rgba(245, 240, 201, 0.45)"
        activeColor="#F5F0C9"
        soundUrl={sound.enabled ? "/sounds/wheel-tick.wav" : ""}
        soundVolume={sound.volume * 0.6}
        onChange={(i: number) => {
          setAt(i);
          const target = i === 1 ? document.getElementById("community") : document.body;
          if (i === 1) target?.scrollIntoView({ behavior: "smooth", block: "start" });
          else window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </nav>
  );
}
