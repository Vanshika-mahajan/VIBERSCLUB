"use client";

import { useMemo, useState } from "react";
import { interpret } from "@/features/discover/interpret";
import { discover } from "@/features/discover/rank";
import { places } from "@/lib/demo/data";
import { actions, lastChangeKept, useDemo } from "@/lib/demo/store";
import { PHOTO_TYPES, shrinkPhoto, PhotoError } from "@/lib/demo/photos";
import { firstName, vibers } from "@/lib/demo/people";
import { toast } from "@/components/ui";
import { PostCard } from "./Explore";
import { Icon, Photo } from "./shared";
import s from "./club.module.css";
import { playSound } from "@/lib/sound";

type Kind = "thread" | "photo";

/**
 * Post: say what you're up to, as a thread (text) or a photo with a caption. The keywords in a post
 * (read the same way Discover reads a thought) find the Vibers who are into the same things, live
 * while you type.
 */
export function PostTab({
  onSeeCommunity,
  title = "Post your vibe",
}: {
  onSeeCommunity: () => void;
  title?: string;
}) {
  const mine = useDemo((st) => st.posts);
  const liked = useDemo((st) => st.liked);
  const blocked = useDemo((st) => st.blocked);
  const [text, setText] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [kind, setKind] = useState<Kind>("thread");
  const [photo, setPhoto] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    setPreparing(true);
    try {
      setPhoto(await shrinkPhoto(file));
    } catch (e) {
      toast(e instanceof PhotoError ? e.message : "That photo could not be added.");
    } finally {
      setPreparing(false);
    }
  };
  const ready = kind === "photo" ? !!photo : !!text.trim();

  // what to match on: the draft while typing, otherwise my latest post
  const source = text.trim() || mine[0]?.text || "";
  const reading = useMemo(() => {
    const place = places.find((p) => p.id === placeId);
    const t = interpret(source);
    return place && text.trim()
      ? { ...t, interests: [...new Set([...t.interests, ...place.interests])] }
      : t;
  }, [source, placeId, text]);
  const matches = useMemo(
    () =>
      reading.interests.length
        ? discover(
            reading,
            vibers.filter((v) => !blocked.includes(v.id)),
            5,
          ).matches.slice(0, 5)
        : [],
    [reading, blocked],
  );
  const chips = reading.chips.filter((c) => c.kind !== "not");

  return (
    <div className={s.postGrid}>
      <section
        aria-labelledby="post-title"
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        <div>
          <h2 id="post-title" className={s.h2}>
            {title}
          </h2>
          <p className={`${s.muted} ${s.small}`} style={{ margin: "4px 0 0" }}>
            What are you up to, or looking for? We read the keywords and find
            your people.
          </p>
        </div>
        <form
          className={`${s.card} ${s.composer}`}
          onSubmit={(e) => {
            e.preventDefault();
            const p = actions.post(
              text,
              placeId || undefined,
              kind === "photo" ? (photo ?? undefined) : undefined,
            );
            if (!p) return;
            playSound("post");
            setText("");
            setPlaceId("");
            setPhoto(null);
            toast(
              !lastChangeKept()
                ? "Posted, but this browser is out of room: it will be gone after a reload."
                : matches.length
                  ? `Posted. ${matches.length} Vibers match it.`
                  : "Posted.",
            );
          }}
        >
          <div className={s.segment} role="group" aria-label="What to post">
            {(["thread", "photo"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
              >
                {k === "thread" ? "Thread" : "Photo"}
              </button>
            ))}
          </div>
          {kind === "photo" && (
            <div className={s.photoPick}>
              {photo ? (
                <figure className={s.photoPreview}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- a photo picked on this device */}
                  <img src={photo} alt="The photo you picked" />
                  <button
                    type="button"
                    className={s.ghost}
                    onClick={() => setPhoto(null)}
                  >
                    Change photo
                  </button>
                </figure>
              ) : (
                <label className={s.photoDrop}>
                  <Icon name="plus" size={22} />
                  <span>{preparing ? "Preparing the photo…" : "Choose a photo"}</span>
                  <input
                    type="file"
                    accept={PHOTO_TYPES}
                    className="sr-only"
                    aria-label="Choose a photo"
                    onChange={(e) => {
                      void pick(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          )}
          <label className="sr-only" htmlFor="post-text">
            {kind === "photo" ? "Caption" : "Your post"}
          </label>
          <textarea
            id="post-text"
            className={s.textarea}
            placeholder={
              kind === "photo"
                ? "Say something about it (optional)"
                : "Sunrise trek to Lamadugh on Saturday, then pancakes in Old Manali. Anyone?"
            }
            maxLength={1000}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className={s.keywords} aria-live="polite">
            {text.trim() && chips.length === 0 && (
              <p className={`${s.muted} ${s.small}`} style={{ margin: 0 }}>
                Mention a place, an activity or a plan, and the keywords appear
                here.
              </p>
            )}
            {chips.length > 0 && (
              <div
                className={s.chips}
                style={{ gap: 5 }}
                aria-label="Keywords we found"
              >
                {chips.map((c) => (
                  <span
                    key={`${c.kind}-${c.id}`}
                    className={s.tag}
                    data-tone={c.kind === "area" ? "clover" : undefined}
                    title={c.why}
                  >
                    #{c.label.replace(/\s+/g, "")}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className={s.row}>
            <select
              className={s.select}
              style={{ flex: 1, minWidth: 160 }}
              aria-label="Tag a place (optional)"
              value={placeId}
              onChange={(e) => setPlaceId(e.target.value)}
            >
              <option value="">Tag a place (optional)</option>
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className={s.btn}
              data-tone="rose"
              disabled={!ready || preparing}
            >
              <Icon name="send" size={16} /> Post
            </button>
          </div>
        </form>

        <div>
          <h3 className={s.h3} style={{ marginBottom: 10 }}>
            Your posts
          </h3>
          {mine.length === 0 ? (
            <p className={`${s.empty} ${s.small}`} style={{ padding: 18 }}>
              Nothing yet. Your first post helps the club find people like you.
            </p>
          ) : (
            <ul
              className={s.mine}
              style={{ listStyle: "none", margin: 0, padding: 0 }}
            >
              {mine.map((p) => (
                <li key={p.id}>
                  <PostCard
                    post={p}
                    keys={interpret(p.text).interests}
                    onDelete={() => actions.deletePost(p.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <aside aria-labelledby="matches-title" className={s.matches}>
        <h3 id="matches-title" className={s.h3}>
          {text.trim()
            ? "Vibers who match this post"
            : mine.length
              ? "Vibers who match your latest post"
              : "Vibers who'll match"}
        </h3>
        {matches.length === 0 ? (
          <p className={`${s.empty} ${s.small}`} style={{ padding: 18 }}>
            Start typing. As soon as we spot a keyword, matching Vibers show up
            here.
          </p>
        ) : (
          <>
            <ul
              className={s.mine}
              style={{ listStyle: "none", margin: 0, padding: 0 }}
            >
              {matches.map((m) => (
                <li
                  key={m.viber.id}
                  className={`${s.card} ${s.mini}`}
                  style={{ alignItems: "flex-start" }}
                >
                  <Photo
                    src={m.viber.photoUrl}
                    name={m.viber.name}
                    position={m.viber.photoPosition}
                    className={s.miniPhoto}
                  />
                  <div className={s.miniText}>
                    <p className={s.miniName}>{m.viber.name}</p>
                    <p className={`${s.small} ${s.why}`}>{m.reasons[0]}</p>
                    <div className={s.chips} style={{ gap: 4, marginTop: 6 }}>
                      {m.shared.slice(0, 3).map((l) => (
                        <span key={l} className={s.tag}>
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={s.round}
                    style={{ width: 38, height: 38, flex: "none" }}
                    aria-label={
                      liked.includes(m.viber.id)
                        ? `You liked ${m.viber.name}`
                        : `Like ${m.viber.name}`
                    }
                    aria-pressed={liked.includes(m.viber.id)}
                    data-kind={liked.includes(m.viber.id) ? "like" : undefined}
                    onClick={() => {
                      if (liked.includes(m.viber.id)) return;
                      playSound("connect");
                      const { mutual } = actions.like(m.viber.id);
                      toast(
                        mutual
                          ? `You and ${firstName(m.viber)} liked each other. Say hi in Chats.`
                          : `You liked ${firstName(m.viber)}.`,
                      );
                    }}
                  >
                    <Icon name="heart" size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className={s.ghost} onClick={onSeeCommunity}>
              Meet more in Community
            </button>
          </>
        )}
      </aside>
    </div>
  );
}
