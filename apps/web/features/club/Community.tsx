"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as RPointerEvent,
} from "react";
import type { Match, Viber } from "@/features/discover/types";
import { interestById, areas } from "@/lib/taxonomy";
import { actions, useDemo } from "@/lib/demo/store";
import { firstName, viberById } from "@/lib/demo/people";
import { toast } from "@/components/ui";
import { Icon, Photo, SampleTag, useDeck } from "./shared";
import s from "./club.module.css";

type Verdict = "like" | "pass" | "save";
const THRESHOLD = 110;

/**
 * Community: Vibers like me, one card at a time. Drag right (or press →) to like, left (←) to pass,
 * up (↑) to save them for later. A like that is mutual opens a "say hi" moment.
 */
export function Community({ vibe = "" }: { vibe?: string }) {
  const deck = useDeck(vibe);
  const saved = useDemo((st) => st.saved);
  const liked = useDemo((st) => st.liked);
  const connections = useDemo((st) => st.connections);
  const me = useDemo((st) => st.me);
  const [leaving, setLeaving] = useState<{
    id: string;
    verdict: Verdict;
  } | null>(null);
  const [match, setMatch] = useState<Viber | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (match && !dialog.current?.open) dialog.current?.showModal?.();
  }, [match]);

  const decide = (m: Match, verdict: Verdict) => {
    if (leaving) return;
    setLeaving({ id: m.viber.id, verdict });
    // let the card fly out, then record the choice (which removes it from the deck)
    window.setTimeout(() => {
      setLeaving(null);
      if (verdict === "like") {
        const { mutual } = actions.like(m.viber.id);
        if (mutual) setMatch(m.viber);
        else
          toast(
            `You liked ${firstName(m.viber)}. If they like you back, you can chat.`,
          );
      } else if (verdict === "pass") actions.pass(m.viber.id);
      else {
        actions.toggleSave(m.viber.id);
        toast(`${firstName(m.viber)} is saved for later.`);
      }
    }, 260);
  };

  const top = deck[0];
  const onKey = (e: React.KeyboardEvent) => {
    if (!top) return;
    const verdict = (
      { ArrowRight: "like", ArrowLeft: "pass", ArrowUp: "save" } as const
    )[e.key as "ArrowRight"];
    if (verdict) {
      e.preventDefault();
      decide(top, verdict);
    }
  };

  const likedOnly = liked.filter((id) => viberById[id]);

  return (
    <div className={s.community}>
      <div className={s.deckWrap}>
        <div
          className={s.sectionHead}
          style={{ width: "min(100%, 380px)", marginBottom: 0 }}
        >
          <div>
            <h2 className={s.h2}>Vibers like you</h2>
            <p
              className={`${s.muted} ${s.small}`}
              style={{ margin: "4px 0 0" }}
            >
              {vibe ? (
                <>
                  Picked for &ldquo;{vibe}&rdquo;.{" "}
                  <Link href="/home?tab=community" className={s.inline}>
                    Use my profile instead
                  </Link>
                </>
              ) : (
                <>
                  Picked from your vibe and your posts.{" "}
                  {deck.length ? `${deck.length} to meet.` : ""}
                </>
              )}
            </p>
          </div>
        </div>
        {top ? (
          <>
            <div
              className={s.deck}
              tabIndex={0}
              role="group"
              aria-roledescription="card stack"
              aria-label={`${top.viber.name}. Right arrow to like, left arrow to pass, up arrow to save for later.`}
              onKeyDown={onKey}
            >
              {deck
                .slice(0, 3)
                .map((m, i) => (
                  <SwipeCard
                    key={m.viber.id}
                    match={m}
                    depth={i}
                    leaving={
                      leaving?.id === m.viber.id ? leaving.verdict : null
                    }
                    onDecide={(v) => decide(m, v)}
                  />
                ))
                .reverse()}
            </div>
            <div className={s.actions}>
              <button
                type="button"
                className={s.round}
                data-kind="pass"
                aria-label={`Pass on ${top.viber.name}`}
                onClick={() => decide(top, "pass")}
              >
                <Icon name="x" size={24} />
              </button>
              <button
                type="button"
                className={s.round}
                data-kind="like"
                aria-label={`Like ${top.viber.name}`}
                onClick={() => decide(top, "like")}
              >
                <Icon name="heart" size={28} />
              </button>
              <button
                type="button"
                className={s.round}
                data-kind="save"
                aria-label={`Save ${top.viber.name} for later`}
                onClick={() => decide(top, "save")}
              >
                <Icon name="bookmark" size={22} />
              </button>
            </div>
            <p className={s.hint}>
              Drag the card, or use ← pass · → like · ↑ save for later
            </p>
          </>
        ) : (
          <div className={s.empty} style={{ width: "min(100%, 380px)" }}>
            <p className={s.h3} style={{ color: "var(--ink)" }}>
              You&apos;ve met everyone who fits your vibe today.
            </p>
            <p>
              Post what you&apos;re up to and we&apos;ll find more people who
              are into the same things.
            </p>
            <Link
              href="/home?tab=post"
              className={s.btn}
              style={{ marginTop: 10 }}
            >
              Write a post
            </Link>
          </div>
        )}
      </div>

      <aside className={s.side} aria-label="Your people">
        <div>
          <h3 className={s.h3}>Saved for later</h3>
          <p
            className={`${s.muted} ${s.small}`}
            style={{ margin: "2px 0 10px" }}
          >
            Not sure yet? They wait here.
          </p>
          {saved.length === 0 ? (
            <p className={`${s.empty} ${s.small}`} style={{ padding: 18 }}>
              Swipe up, or press the bookmark, to keep someone for later.
            </p>
          ) : (
            <ul
              className={s.mine}
              style={{ listStyle: "none", margin: 0, padding: 0 }}
            >
              {saved
                .map((id) => viberById[id])
                .filter(Boolean)
                .map((v) => (
                  <li key={v.id} className={`${s.card} ${s.mini}`}>
                    <Photo
                      src={v.photoUrl}
                      name={v.name}
                      position={v.photoPosition}
                      className={s.miniPhoto}
                    />
                    <div className={s.miniText}>
                      <p className={`${s.miniName} ${s.ellipsis}`}>{v.name}</p>
                      <p className={`${s.muted} ${s.small} ${s.ellipsis}`}>
                        {v.role}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={s.round}
                      style={{ width: 38, height: 38 }}
                      aria-label={`Like ${v.name}`}
                      onClick={() => {
                        actions.toggleSave(v.id);
                        const { mutual } = actions.like(v.id);
                        if (mutual) setMatch(v);
                        else toast(`You liked ${firstName(v)}.`);
                      }}
                    >
                      <Icon name="heart" size={16} />
                    </button>
                    <button
                      type="button"
                      className={s.round}
                      style={{ width: 38, height: 38 }}
                      aria-label={`Remove ${v.name} from saved`}
                      onClick={() => actions.toggleSave(v.id)}
                    >
                      <Icon name="x" size={16} />
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className={s.h3}>You liked</h3>
          {likedOnly.length === 0 ? (
            <p className={`${s.muted} ${s.small}`}>No one yet.</p>
          ) : (
            <ul
              className={s.mine}
              style={{ listStyle: "none", margin: "10px 0 0", padding: 0 }}
            >
              {likedOnly.map((id) => {
                const v = viberById[id];
                const c = connections[id];
                return (
                  <li key={id} className={`${s.card} ${s.mini}`}>
                    <Photo
                      src={v.photoUrl}
                      name={v.name}
                      position={v.photoPosition}
                      className={s.miniPhoto}
                    />
                    <div className={s.miniText}>
                      <p className={`${s.miniName} ${s.ellipsis}`}>{v.name}</p>
                      <p className={`${s.muted} ${s.small}`}>
                        {c === "connected"
                          ? "Connected"
                          : c === "requested"
                            ? "Request sent"
                            : "Waiting for them"}
                      </p>
                    </div>
                    {c === "connected" && (
                      <Link
                        href={`/chats?with=${id}`}
                        className={s.ghost}
                        style={{ minHeight: 34, padding: "0 12px" }}
                      >
                        Chat
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <dialog
        ref={dialog}
        className={s.match}
        aria-labelledby="match-title"
        onClose={() => setMatch(null)}
      >
        {match && (
          <>
            <div className={s.matchFaces}>
              <Photo name={me.name} className="" />
              <Photo
                src={match.photoUrl}
                name={match.name}
                position={match.photoPosition}
              />
            </div>
            <h2 id="match-title" className={s.h2}>
              It&apos;s a vibe
            </h2>
            <p className={s.muted}>
              You and {firstName(match)} liked each other. Say hi while
              it&apos;s fresh.
            </p>
            <div
              className={s.row}
              style={{ justifyContent: "center", marginTop: 14 }}
            >
              <Link
                href={`/chats?with=${match.id}`}
                className={s.btn}
                data-tone="rose"
                onClick={() => actions.requestConnection(match.id)}
              >
                Say hi to {firstName(match)}
              </Link>
              <button
                type="button"
                className={s.ghost}
                onClick={() => dialog.current?.close()}
              >
                Keep looking
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}

function SwipeCard({
  match,
  depth,
  leaving,
  onDecide,
}: {
  match: Match;
  depth: number;
  leaving: Verdict | null;
  onDecide: (v: Verdict) => void;
}) {
  const v = match.viber;
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const [d, setD] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const isTop = depth === 0;

  const down = (e: RPointerEvent) => {
    if (!isTop || leaving) return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    setDragging(true);
    ref.current?.setPointerCapture(e.pointerId);
  };
  const move = (e: RPointerEvent) => {
    if (!drag.current) return;
    setD({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
  };
  const up = () => {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    if (d.x > THRESHOLD) onDecide("like");
    else if (d.x < -THRESHOLD) onDecide("pass");
    else if (d.y < -THRESHOLD) onDecide("save");
    else setD({ x: 0, y: 0 });
  };

  let transform: string;
  let transition = dragging
    ? "none"
    : "transform 0.3s cubic-bezier(.2,.8,.2,1), opacity 0.3s";
  let opacity = 1;
  if (leaving) {
    const out = {
      like: "translate(140%, -6%) rotate(22deg)",
      pass: "translate(-140%, -6%) rotate(-22deg)",
      save: "translate(0, -130%) rotate(-3deg)",
    }[leaving];
    transform = out;
    opacity = 0;
    transition = "transform 0.26s ease-in, opacity 0.26s ease-in";
  } else if (isTop) {
    transform = `translate(${d.x}px, ${d.y}px) rotate(${d.x / 18}deg)`;
  } else {
    transform = `translateY(${depth * 12}px) scale(${1 - depth * 0.045})`;
  }
  const like = Math.max(0, Math.min(1, d.x / THRESHOLD));
  const pass = Math.max(0, Math.min(1, -d.x / THRESHOLD));
  const save =
    Math.max(0, Math.min(1, -d.y / THRESHOLD)) * (1 - Math.max(like, pass));

  return (
    <div
      ref={ref}
      className={s.swipe}
      data-top={isTop}
      aria-hidden={!isTop}
      style={{ transform, transition, opacity, zIndex: 10 - depth }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <Photo
        src={v.photoUrl}
        name={v.name}
        position={v.photoPosition}
        className={s.swipePhoto}
      >
        <span className={s.pill}>
          {v.status === "local" ? "Local" : "Visiting"} · {areas[v.area].label}
        </span>
        <div className={s.swipeName}>
          <h3>{v.name}</h3>
          <p>{v.role}</p>
        </div>
      </Photo>
      <div className={s.swipeBody}>
        <p className={s.why}>{match.reasons[0] ?? "New to the club"}</p>
        <p
          className={s.muted}
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {v.bio}
        </p>
        <div className={s.chips} style={{ gap: 5 }}>
          {v.interests.slice(0, 4).map((i) => (
            <span
              key={i}
              className={s.tag}
              data-tone={
                match.shared.includes(interestById[i]?.label)
                  ? undefined
                  : "clover"
              }
            >
              {interestById[i]?.label ?? i}
            </span>
          ))}
          {v.sample && <SampleTag />}
        </div>
      </div>
      <span className={`${s.stamp} ${s.stampLike}`} style={{ opacity: like }}>
        LIKE
      </span>
      <span className={`${s.stamp} ${s.stampPass}`} style={{ opacity: pass }}>
        PASS
      </span>
      <span className={`${s.stamp} ${s.stampSave}`} style={{ opacity: save }}>
        LATER
      </span>
    </div>
  );
}
