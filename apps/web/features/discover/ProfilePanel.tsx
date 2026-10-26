"use client";

import { useEffect, useRef, useState } from "react";
import { areas, interestById } from "@/lib/taxonomy";
import s from "./discover.module.css";
import { Icon } from "./icons";
import { hashtag } from "./interpret";
import { initials } from "./sphere";
import type { Match, Viber } from "./types";

type Props = {
  viber: Viber;
  match?: Match;
  liked: boolean;
  saved: boolean;
  onClose: () => void;
  onLike: () => void;
  onPass: () => void;
  onSave: () => void;
  onAddInterest: (id: string) => void;
};

/** A Viber's profile, side panel on wide screens and bottom sheet on phones. Visible fields only. */
export function ProfilePanel({ viber: v, match, liked, saved, onClose, onLike, onPass, onSave, onAddInterest }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [v.id]);
  const sharedIds = new Set(match ? v.interests.filter((i) => match.shared.includes(interestById[i].label)) : []);

  return (
    <aside ref={ref} className={s.peek} role="dialog" aria-label={`${v.name}'s profile`} tabIndex={-1}>
      <button type="button" className={s.xb} aria-label="Close profile" onClick={onClose}>
        <Icon name="x" />
      </button>
      <div className={s.ph} data-ready={loaded === v.id}>
        <span className={s.ini} aria-hidden="true">
          {initials(v.name)}
        </span>
        {v.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- remote sample photos; real photos come from Storage in M2
          <img
            key={v.id}
            src={v.photoUrl.replace("w=480", "w=640")}
            alt={`Portrait of ${v.name}${v.sample ? " (sample photo)" : ""}`}
            style={{ objectPosition: v.photoPosition }}
            onLoad={() => setLoaded(v.id)}
          />
        )}
        {v.sample && <span className={s.badge}>Sample</span>}
      </div>
      <h2>{v.name}</h2>
      <p className={s.role}>{v.role}</p>
      <span className={s.where}>
        <Icon name="pin" />
        {areas[v.area].label} · {v.status === "local" ? "lives here" : "visiting"}{" "}
        <small style={{ color: "var(--muted)", fontWeight: 600 }}>(general area)</small>
      </span>
      <p className={s.bio}>{v.bio}</p>

      {match && match.shared.length > 0 && (
        <>
          <h3>Shares with your thought</h3>
          <div className={s.tags}>
            {match.shared.map((x) => (
              <span key={x} className={s.tg} data-shared="true" style={{ display: "inline-flex", alignItems: "center" }}>
                {hashtag(x)}
              </span>
            ))}
          </div>
        </>
      )}

      <h3>Into</h3>
      <div className={s.tags}>
        {v.interests.map((id) => (
          <button key={id} type="button" className={s.tg} data-shared={sharedIds.has(id)} title="Add to your thought" onClick={() => onAddInterest(id)}>
            {hashtag(interestById[id].label)}
          </button>
        ))}
      </div>

      {match && match.reasons.length > 0 && (
        <>
          <h3>Why they&apos;re here</h3>
          <ul className={s.reasons}>
            {match.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </>
      )}

      <div className={s.acts}>
        <button type="button" className={`${s.btn} ${s.ghost}`} onClick={onPass}>
          Pass
        </button>
        <button type="button" className={`${s.btn} ${s.ghost} ${saved ? s.on : ""}`} aria-pressed={saved} onClick={onSave}>
          <Icon name="bookmark" />
          {saved ? "Saved" : "Save"}
        </button>
        <button type="button" className={`${s.btn} ${s.grow} ${liked ? s.on : ""}`} aria-pressed={liked} onClick={onLike}>
          <Icon name="heart" />
          {liked ? "Liked" : "Like"}
        </button>
      </div>

      <p className={s.note}>
        {v.sample ? "Sample profile: a fictional person; the portrait is a free-licence stand-in. " : ""}
        Only a general area is ever shown. If you both like each other, you can send a connection request and then chat.
      </p>
    </aside>
  );
}
