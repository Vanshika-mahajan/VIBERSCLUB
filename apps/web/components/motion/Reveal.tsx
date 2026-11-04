"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/motion/gsap";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** How far, in px, the content rises as it fades in. */
  y?: number;
  delay?: number;
  /** Seconds between each direct child; leave out to reveal the block as one piece. */
  stagger?: number;
};

/** Fades and lifts its content in once, when it scrolls into view. Does nothing with reduced motion. */
export function Reveal({ children, className, y = 28, delay = 0, stagger }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(stagger ? el.children : el, {
          autoAlpha: 0,
          y,
          duration: 0.9,
          delay,
          stagger,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
