"use client";

import { Reveal } from "@/components/motion/Reveal";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { VantaBackground } from "@/components/motion/VantaBackground";
import SplitText from "@/components/reactbits/SplitText";

const FOG = { speed: 1.2, zoom: 0.8, blurFactor: 0.6 };

const blocks = [
  { name: "Vanta", what: "The animated fog behind the headline. three.js loads only here." },
  { name: "React Bits SplitText", what: "The headline rises in letter by letter, using GSAP's SplitText." },
  { name: "GSAP ScrollTrigger", what: "These cards fade up as they scroll into view, once." },
  { name: "Lenis", what: "Scrolling on this page eases instead of jumping." },
];

/** Shows each motion building block working, so we can check them before the landing page uses them. */
export function MotionLab() {
  return (
    <SmoothScroll>
      <VantaBackground effect="fog" options={FOG} className="flex min-h-[70vh] items-end rounded-3xl p-6 md:p-12">
        <div className="max-w-xl">
          <SplitText
            tag="h1"
            text="Find your people,"
            textAlign="left"
            splitType="chars"
            delay={30}
            trigger="load"
            className="display text-5xl text-brand italic md:text-7xl"
          />
          <SplitText
            tag="h1"
            text="not just places."
            textAlign="left"
            splitType="chars"
            delay={30}
            trigger="load"
            className="display block text-5xl text-accent italic md:text-7xl"
          />
          <p className="mt-4 max-w-md text-ink2">Motion lab: each building block the landing page will use.</p>
        </div>
      </VantaBackground>

      <Reveal stagger={0.12} className="mt-16 grid gap-4 md:grid-cols-2">
        {blocks.map((b) => (
          <article key={b.name} className="rounded-2xl bg-surface p-6 shadow-card" data-testid="lab-block">
            <h2 className="font-extrabold text-brand">{b.name}</h2>
            <p className="mt-2 text-muted">{b.what}</p>
          </article>
        ))}
      </Reveal>
      <div className="h-[60vh]" aria-hidden="true" />
    </SmoothScroll>
  );
}
