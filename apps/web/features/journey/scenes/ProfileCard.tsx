"use client";

import { useState } from "react";
import type { JourneyCard } from "../match";
import s from "../discovery.module.css";

type Props = {
  card: JourneyCard;
  /** false while the card is still orbiting: it can't be focused or pressed yet */
  active: boolean;
  onView: (card: JourneyCard) => void;
};

/** One Viber: photo, name, where and when, a line about them, what you share, and the two actions. */
export function ProfileCard({ card, active, onView }: Props) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const [requested, setRequested] = useState(false);
  const tab = active ? 0 : -1;
  return (
    <article className={s.card} aria-label={card.name}>
      <div className={s.photo}>
        {card.photoUrl && !photoFailed ? (
          // remote sample portraits, sized by CSS; next/image would need their host configured
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.photoUrl}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ objectPosition: card.photoPosition }}
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          <span className={s.initials} aria-hidden="true">
            {card.initials}
          </span>
        )}
        <span className={s.status} data-local={card.local}>
          {card.local ? "Local" : "Visiting"}
        </span>
      </div>
      <div className={s.body}>
        <h3 className={s.name}>{card.name}</h3>
        <p className={s.meta}>
          {card.status.replace(/^(Local|Visiting), /, "")} · {card.dates}
        </p>
        <p className={s.intro}>{card.intro}</p>
        {card.shared.length > 0 ? (
          <p className={s.shared}>
            <span className={s.sharedLabel}>You share</span>
            {card.shared.map((x) => (
              <span key={x} className={s.sharedChip}>
                {x}
              </span>
            ))}
          </p>
        ) : (
          <p className={s.shared}>
            <span className={s.sharedLabel}>{card.reason}</span>
          </p>
        )}
        <p className={s.tags}>{card.hashtags.join(" ")}</p>
        <div className={s.actions}>
          <button
            type="button"
            className={s.connect}
            tabIndex={tab}
            aria-pressed={requested}
            onClick={() => setRequested(true)}
          >
            {requested ? "Request sent" : "Connect"}
          </button>
          <button
            type="button"
            className={s.view}
            tabIndex={tab}
            onClick={() => onView(card)}
          >
            View profile
          </button>
        </div>
      </div>
    </article>
  );
}
