"use client";

import Link from "next/link";
import { useMemo } from "react";
import { toast } from "@/components/ui";
import { Icon, Photo, SampleTag, portrait, useMyThought } from "@/features/club/shared";
import s from "@/features/club/club.module.css";
import { hashtag } from "@/features/discover/interpret";
import { discover } from "@/features/discover/rank";
import { firstName, viberById } from "@/lib/demo/people";
import { actions, useDemo } from "@/lib/demo/store";
import { areas, interestById, intents } from "@/lib/taxonomy";

/** A Viber's full profile: everything they show, what you share, and like, save, pass or connect. */
export function FullProfile({ id }: { id: string }) {
  const v = viberById[id];
  const thought = useMyThought();
  const liked = useDemo((st) => st.liked);
  const saved = useDemo((st) => st.saved);
  const blocked = useDemo((st) => st.blocked);
  const connection = useDemo((st) => st.connections[id]);
  const match = useMemo(() => (v ? discover(thought, [v], 1).matches[0] : undefined), [thought, v]);

  if (!v || blocked.includes(id)) {
    return (
      <div className={`${s.club} ${s.night}`}>
        <h1 className="display text-3xl">Profile not found</h1>
        <p className="mt-2 text-muted">
          They may have left the club. <Link href="/discover" className="link">Back to Discover</Link>
        </p>
      </div>
    );
  }

  const name = firstName(v);
  const isLiked = liked.includes(id);
  const isSaved = saved.includes(id);
  const shared = new Set(match?.shared ?? []);
  const connect = () => {
    const { mutual } = actions.like(id);
    if (mutual) {
      actions.requestConnection(id);
      toast(`It's mutual: you and ${name} are connected.`);
    } else toast(`You liked ${name}. If they like you back, you can chat.`);
  };

  return (
    <div className={`${s.club} ${s.night}`}>
      <Link href="/discover#community" className="link mb-5 inline-flex text-sm">
        ← Back to Discover
      </Link>
      <article className={s.fullCard}>
        <Photo src={v.photoUrl?.replace(/w=\d+/, "w=1100") || portrait(v.name)} name={v.name} className={s.ovPhoto} position={v.photoPosition}>
          <span className={s.ovShade} aria-hidden="true" />
        </Photo>
        <div className={s.fullBody}>
          <p className={s.detailsMeta}>
            {v.status === "local" ? "Local" : "Visiting"} · {areas[v.area].label} (general area) {v.sample && <SampleTag />}
          </p>
          <h1 className={s.ovName}>{v.name}</h1>
          <p className={s.ovRole}>{v.role}</p>
          {match && (
            <p className={s.ovFit}>
              <Icon name="spark" size={15} />
              {match.shared.length
                ? `You share ${match.shared.length} ${match.shared.length === 1 ? "interest" : "interests"}`
                : "New to your circle"}
            </p>
          )}
          <p className={s.ovBio}>{v.bio}</p>

          <h2 className={s.ovH}>Into</h2>
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
              <h2 className={s.ovH}>Here for</h2>
              <p className={s.ovSmall}>{v.intents.map((i) => intents[i].label).join(" · ")}</p>
            </>
          )}

          {match && match.reasons.length > 0 && (
            <>
              <h2 className={s.ovH}>Why you might get on</h2>
              <ul className={s.fullReasons}>
                {match.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </>
          )}

          <div className={s.ovActions}>
            <button
              type="button"
              className={s.ghost}
              aria-pressed={isSaved}
              onClick={() => toast(actions.toggleSave(id) ? `${name} is saved for later.` : `${name} removed from saved.`)}
            >
              <Icon name="bookmark" size={16} /> {isSaved ? "Saved" : "Save"}
            </button>
            {connection === "connected" ? (
              <Link href={`/chats?with=${id}`} className={s.btn}>
                <Icon name="send" size={16} /> Open chat
              </Link>
            ) : isLiked || connection ? (
              <span className={s.ovDone} role="status">
                {connection === "incoming" ? `${name} wants to connect` : `Waiting for ${name}`}
              </span>
            ) : (
              <button type="button" className={s.btn} onClick={connect}>
                <Icon name="heart" size={16} /> Connect
              </button>
            )}
          </div>
          <p className={s.ovNote}>Chats open when you both connect. Only a general area is ever shown.</p>
        </div>
      </article>
    </div>
  );
}
