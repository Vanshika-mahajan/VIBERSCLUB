"use client";

import { useImperativeHandle, useRef, type Ref } from "react";
import s from "../discovery.module.css";

export type DiscoveryHandle = {
  root: HTMLElement;
  /** the CSS version's sphere and close-up (hidden when the 3D world draws them) */
  planet: HTMLElement;
  valley: HTMLElement;
  place: HTMLElement;
  /** warm light that rises out of the valley at the end; the club home is under it */
  arrive: HTMLElement;
};

type Props = {
  ref?: Ref<DiscoveryHandle>;
  /** the 3D world draws the sphere, so the CSS one stays hidden */
  world3d: boolean;
};

/**
 * Scenes three and four, in the page: the CSS sphere (fallback), the Manali label and the light we
 * arrive through. The timeline and the driver move these; the club home takes over after.
 */
export function Discovery({ ref, world3d }: Props) {
  const root = useRef<HTMLElement>(null);
  const planet = useRef<HTMLDivElement>(null);
  const valley = useRef<HTMLDivElement>(null);
  const place = useRef<HTMLParagraphElement>(null);
  const arrive = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    root: root.current!,
    planet: planet.current!,
    valley: valley.current!,
    place: place.current!,
    arrive: arrive.current!,
  }));

  return (
    <section
      ref={root}
      className={s.discovery}
      aria-label="Manali"
      data-world={world3d ? "3d" : "css"}
    >
      <div ref={planet} className={s.planet} aria-hidden="true" />
      <div ref={valley} className={s.valley} aria-hidden="true" />
      <p ref={place} className={s.place}>
        <span className={s.placeDot} aria-hidden="true" />
        Manali, India
      </p>
      <div ref={arrive} className={s.arrive} aria-hidden="true">
        <p className={s.arriveLine}>Travel solo. Just not alone.</p>
      </div>
    </section>
  );
}
