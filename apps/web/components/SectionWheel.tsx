"use client";

import { useEffect, useState } from "react";
import OptionWheel from "@/components/reactbits/OptionWheel";
import { useSound } from "@/lib/sound";

/** a part of the page the wheel names: its label, and the element id it scrolls to (null = page top) */
export type WheelSection = { label: string; id: string | null };

/**
 * A small React Bits OptionWheel that names the parts of a page, so it is clear there is more below.
 * Turning it (or tapping a name) scrolls there with a soft tick; scrolling the page turns it back.
 * `layout` "side" floats it at the right edge; "inline" sits it in the page flow.
 */
export function SectionWheel({
  sections,
  label,
  layout = "side",
  className = "",
}: {
  sections: WheelSection[];
  label: string;
  layout?: "side" | "inline";
  className?: string;
}) {
  const [at, setAt] = useState(0);
  const sound = useSound();

  // follow the page: the wheel shows whichever part sits in the middle of the screen
  useEffect(() => {
    const seen = new Set<number>();
    const els = sections.map((x) => (x.id ? document.getElementById(x.id) : null));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = els.indexOf(e.target as HTMLElement);
          if (e.isIntersecting) seen.add(i);
          else seen.delete(i);
        }
        setAt(seen.size ? Math.max(...seen) : 0);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    els.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  const inline = layout === "inline";
  return (
    <nav className={`vc-wheel${inline ? " vc-wheel--inline" : ""} ${className}`} aria-label={label}>
      <OptionWheel
        items={sections.map((x) => x.label)}
        selected={at}
        defaultSelected={0}
        ariaLabel={`${label}: ${sections.map((x) => x.label).join(", ")}`}
        side={inline ? "left" : "right"}
        fontSize={inline ? 1.05 : 0.95}
        spacing={1.9}
        curve={inline ? 0.35 : 1}
        tilt={inline ? 8 : 14}
        blur={inline ? 0.5 : 1.2}
        fade={0.12}
        smoothing={220}
        inset={inline ? 6 : 0}
        draggable
        textColor="#4a2a4e"
        activeColor="#320B35"
        soundUrl={sound.enabled ? "/sounds/wheel-tick.wav" : ""}
        soundVolume={sound.volume * 0.6}
        onChange={(i: number) => {
          setAt(i);
          const id = sections[i]?.id;
          const el = id ? document.getElementById(id) : null;
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          else window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </nav>
  );
}
