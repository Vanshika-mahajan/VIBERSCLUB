"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";

/**
 * Vanta's three.js effects. Each one is loaded only when a page uses it, together with three.js,
 * so pages without a Vanta background never download WebGL code.
 */
const effects = {
  fog: () => import("vanta/dist/vanta.fog.min"),
  clouds: () => import("vanta/dist/vanta.clouds.min"),
  waves: () => import("vanta/dist/vanta.waves.min"),
  birds: () => import("vanta/dist/vanta.birds.min"),
  net: () => import("vanta/dist/vanta.net.min"),
  cells: () => import("vanta/dist/vanta.cells.min"),
  halo: () => import("vanta/dist/vanta.halo.min"),
};

export type VantaEffectName = keyof typeof effects;

/** Reads a colour token from globals.css and turns "#173d35" into 0x173d35, the form Vanta wants. */
function token(name: string, fallback: number): number {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
  return /^#[0-9a-f]{6}$/i.test(hex) ? parseInt(hex.slice(1), 16) : fallback;
}

/** Brand colours for the effects we are likely to use; anything in `options` overrides them. */
function brandColours(effect: VantaEffectName): Record<string, number> {
  const brand = token("brand", 0x173d35);
  const sage = token("sage", 0xdce7de);
  const gold = token("gold", 0xe7bc69);
  const canvas = token("canvas", 0xf8f6f0);
  switch (effect) {
    case "fog":
      return { highlightColor: gold, midtoneColor: sage, lowlightColor: brand, baseColor: canvas };
    case "clouds":
      return { skyColor: sage, cloudColor: canvas, sunColor: gold, sunGlareColor: token("terracotta", 0xd97757) };
    case "waves":
      return { color: brand };
    case "net":
      return { color: gold, backgroundColor: brand };
    case "birds":
      return { backgroundColor: canvas, color1: brand, color2: gold };
    default:
      return { color: brand, backgroundColor: canvas };
  }
}

type VantaBackgroundProps = {
  effect?: VantaEffectName;
  /** Extra Vanta options, such as speed or zoom. Pass a stable object (a constant or useMemo). */
  options?: Record<string, unknown>;
  className?: string;
  children?: ReactNode;
};

/**
 * A section with an animated Vanta background behind its children.
 * The CSS gradient underneath is what people see while it loads, with reduced motion,
 * or when the device has no WebGL.
 */
export function VantaBackground({ effect = "fog", options, className = "", children }: VantaBackgroundProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (reduced || !el) return;
    let fx: { destroy: () => void } | undefined;
    let cancelled = false;
    (async () => {
      try {
        const [THREE, mod] = await Promise.all([import("three"), effects[effect]()]);
        if (cancelled) return;
        fx = mod.default({
          el,
          THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          ...brandColours(effect),
          ...options,
        });
        el.dataset.vanta = "on";
      } catch {
        /* no WebGL or the effect failed: the gradient stays */
      }
    })();
    return () => {
      cancelled = true;
      fx?.destroy();
      delete el.dataset.vanta;
    };
  }, [effect, options, reduced]);

  return (
    <div
      ref={ref}
      className={`relative isolate overflow-hidden bg-[radial-gradient(120%_90%_at_20%_10%,var(--color-sage)_0%,var(--color-canvas)_55%,var(--color-gold-wash)_100%)] ${className}`}
    >
      {children}
    </div>
  );
}
