"use client";

import Link from "next/link";
import { useImperativeHandle, useRef, useState, type Ref } from "react";
import type { JourneyCard } from "../match";
import { ProfileCard } from "./ProfileCard";
import s from "../discovery.module.css";

export type DiscoveryHandle = {
  root: HTMLElement;
  /** the CSS version's sphere and close-up (hidden when the 3D world draws them) */
  planet: HTMLElement;
  valley: HTMLElement;
  place: HTMLElement;
  head: HTMLElement;
  row: HTMLElement;
  items: HTMLElement[];
  more: HTMLElement;
};

type Props = {
  ref?: Ref<DiscoveryHandle>;
  cards: JourneyCard[];
  /** the cards can be used (they have settled into the row) */
  settled: boolean;
  /** the 3D world draws the sphere, so the CSS one stays hidden */
  world3d: boolean;
};

/**
 * Scenes three to five, in the page: the CSS sphere (fallback), the Manali label, the profile cards
 * and the discovery row. The timeline and the orbit driver move these; this component only lays out
 * where everything ends up: the heading at the top, the row of cards below the sphere.
 */
export function Discovery({ ref, cards, settled, world3d }: Props) {
  const root = useRef<HTMLElement>(null);
  const planet = useRef<HTMLDivElement>(null);
  const valley = useRef<HTMLDivElement>(null);
  const place = useRef<HTMLParagraphElement>(null);
  const head = useRef<HTMLElement>(null);
  const row = useRef<HTMLUListElement>(null);
  const more = useRef<HTMLAnchorElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<JourneyCard | null>(null);

  useImperativeHandle(ref, () => ({
    root: root.current!,
    planet: planet.current!,
    valley: valley.current!,
    place: place.current!,
    head: head.current!,
    row: row.current!,
    items: Array.from(row.current!.children) as HTMLElement[],
    more: more.current!,
  }));

  const view = (card: JourneyCard) => {
    setOpen(card);
    dialog.current?.showModal();
  };

  return (
    <section
      ref={root}
      className={s.discovery}
      aria-label="Vibers who might see the world the way you do"
      data-settled={settled}
      data-world={world3d ? "3d" : "css"}
    >
      <div ref={planet} className={s.planet} aria-hidden="true" />
      <div ref={valley} className={s.valley} aria-hidden="true" />
      <p ref={place} className={s.place}>
        <span className={s.placeDot} aria-hidden="true" />
        Manali, India
      </p>

      <header ref={head} className={s.head}>
        <h2 className={s.title} tabIndex={-1}>
          Your vibe has a universe.
        </h2>
        <p className={s.sub}>
          Here are some Vibers who might see the world the way you do.
        </p>
      </header>

      <ul ref={row} className={s.row} inert={!settled}>
        {cards.map((card) => (
          <li key={card.id} className={s.item}>
            <ProfileCard card={card} active={settled} onView={view} />
          </li>
        ))}
      </ul>

      <Link
        ref={more}
        href="/home?tab=community"
        className={s.more}
        tabIndex={settled ? 0 : -1}
      >
        Explore more Vibers <span aria-hidden="true">&rarr;</span>
      </Link>
      <p className={s.sample}>Sample Vibers, for the demo.</p>

      <dialog
        ref={dialog}
        className={s.dialog}
        aria-labelledby="journey-profile-name"
        onClose={() => setOpen(null)}
      >
        {open && (
          <>
            <h3 id="journey-profile-name" className={s.dialogName}>
              {open.name}
            </h3>
            <p className={s.dialogRole}>{open.role}</p>
            <p className={s.meta}>
              {open.status} · {open.dates}
            </p>
            <p className={s.dialogIntro}>{open.intro}</p>
            <p className={s.dialogWhy}>{open.reason}</p>
            <p className={s.tags}>{open.hashtags.join(" ")}</p>
            <form method="dialog">
              <button className={s.view} autoFocus>
                Close
              </button>
            </form>
          </>
        )}
      </dialog>
    </section>
  );
}
