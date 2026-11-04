"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Match } from "@/features/discover/types";
import { hashtag } from "@/features/discover/interpret";
import { firstName } from "@/lib/demo/people";
import type { Connection } from "@/lib/demo/store";
import { areas, interestById, intents } from "@/lib/taxonomy";
import { Icon, Photo, SampleTag, portrait } from "./shared";
import s from "./club.module.css";

/**
 * A Viber's overview, opened from the gallery without leaving the page: the photo grows into a card
 * with who they are, what you share, and the two next steps (their full profile, or connect).
 */
export function ProfileOverview({
  match,
  liked,
  connection,
  onConnect,
  onClose,
}: {
  match: Match;
  liked: boolean;
  connection?: Connection;
  onConnect: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const v = match.viber;
  const shared = new Set(match.shared);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
    // leaving the page keeps it alive but hidden; a modal left open would block the next page
    return () => d?.close();
  }, []);

  const name = firstName(v);
  return (
    <dialog
      ref={ref}
      className={s.ov}
      aria-labelledby="ov-name"
      // a close that arrives after it opened again (StrictMode runs effects twice) is stale
      onClose={(e) => !e.currentTarget.open && onClose()}
      onClick={(e) => {
        // a click on the dark around the card closes it
        if (e.target === e.currentTarget) ref.current?.close();
      }}
    >
      <div className={s.ovCard}>
        <Photo src={v.photoUrl?.replace(/w=\d+/, "w=900") || portrait(v.name)} name={v.name} className={s.ovPhoto} position={v.photoPosition}>
          <span className={s.ovShade} aria-hidden="true" />
          <p className={s.ovPhotoName} aria-hidden="true">
            {name}
          </p>
        </Photo>
        <div className={s.ovBody}>
          <button type="button" className={s.ovClose} aria-label="Close" onClick={() => ref.current?.close()}>
            <Icon name="x" size={18} />
          </button>
          <p className={s.detailsMeta}>
            {v.status === "local" ? "Local" : "Visiting"} · {areas[v.area].label} {v.sample && <SampleTag />}
          </p>
          <h2 id="ov-name" className={s.ovName}>
            {v.name}
          </h2>
          <p className={s.ovRole}>{v.role}</p>

          <p className={s.ovFit}>
            <Icon name="spark" size={15} />
            {match.shared.length
              ? `You share ${match.shared.length} ${match.shared.length === 1 ? "interest" : "interests"}`
              : "New to your circle"}
            {match.reasons[0] ? <span> · {match.reasons[0]}</span> : null}
          </p>

          <p className={s.ovBio}>{v.bio}</p>

          {match.shared.length > 0 && (
            <>
              <h3 className={s.ovH}>You both love</h3>
              <div className={s.chips}>
                {match.shared.map((x) => (
                  <span key={x} className={s.tag}>
                    {x}
                  </span>
                ))}
              </div>
            </>
          )}

          <h3 className={s.ovH}>Into</h3>
          <p className={s.ovTags}>
            {v.interests.map((i) => {
              const label = interestById[i]?.label ?? i;
              return (
                <span key={i} data-shared={shared.has(label) || undefined}>
                  {hashtag(label)}
                </span>
              );
            })}
          </p>

          {v.intents.length > 0 && (
            <>
              <h3 className={s.ovH}>Here for</h3>
              <p className={s.ovSmall}>{v.intents.map((i) => intents[i].label).join(" · ")}</p>
            </>
          )}

          <div className={s.ovActions}>
            <Link href={`/vibers/${v.id}`} className={s.ghost}>
              View full profile
            </Link>
            {connection === "connected" ? (
              <Link href={`/chats?with=${v.id}`} className={s.btn}>
                <Icon name="send" size={16} /> Open chat
              </Link>
            ) : liked || connection ? (
              <span className={s.ovDone} role="status">
                {connection === "incoming" ? `${name} wants to connect` : `Waiting for ${name}`}
              </span>
            ) : (
              <button type="button" className={s.btn} onClick={onConnect}>
                <Icon name="heart" size={16} /> Connect
              </button>
            )}
          </div>
          <p className={s.ovNote}>Chats open when you both connect. Only a general area is ever shown.</p>
        </div>
      </div>
    </dialog>
  );
}
