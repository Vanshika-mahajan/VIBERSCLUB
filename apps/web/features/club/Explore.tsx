"use client";

import { useMemo, useState } from "react";
import ScrollStack, {
  ScrollStackItem,
} from "@/components/reactbits/ScrollStack";
import { interpret } from "@/features/discover/interpret";
import { areas, interestById, type AreaId } from "@/lib/taxonomy";
import { places, type PlaceKind } from "@/lib/demo/data";
import { actions, useDemo } from "@/lib/demo/store";
import { viberById } from "@/lib/demo/people";
import { toast } from "@/components/ui";
import {
  ago,
  Icon,
  Photo,
  SampleTag,
  useAllPosts,
  useMyThought,
} from "./shared";
import s from "./club.module.css";

const KINDS: (PlaceKind | "all" | "saved")[] = [
  "all",
  "saved",
  "café",
  "trail",
  "viewpoint",
  "temple",
  "waterfall",
  "hot spring",
  "market",
];
/** the areas that have places, in the order they first appear */
const AREAS = [...new Set(places.map((p) => p.area))];
const kindLabel = (k: string) =>
  k === "all"
    ? "All places"
    : k === "saved"
      ? "Saved"
      : k[0].toUpperCase() + k.slice(1) + "s";

/** Explore: places worth the walk, and posts from Vibers who are into the same things as you. */
export function Explore() {
  const savedPlaces = useDemo((st) => st.savedPlaces);
  const thought = useMyThought();
  const allPosts = useAllPosts();
  const [kind, setKind] = useState<(typeof KINDS)[number]>("all");
  const [area, setArea] = useState<AreaId | "all">("all");

  const shown = places
    .filter((p) =>
      kind === "all"
        ? true
        : kind === "saved"
          ? savedPlaces.includes(p.id)
          : p.kind === kind,
    )
    .filter((p) => area === "all" || p.area === area);

  // posts that share the most keywords with my vibe and my own posts (mine are left out)
  const similar = useMemo(() => {
    const mine = new Set(thought.interests);
    return allPosts
      .filter((p) => p.authorId !== "me")
      .map((p) => {
        const place = places.find((x) => x.id === p.placeId);
        const keys = [
          ...new Set([
            ...interpret(p.text).interests,
            ...(place?.interests ?? []),
          ]),
        ];
        return { post: p, keys, shared: keys.filter((k) => mine.has(k)) };
      })
      .sort(
        (a, b) =>
          b.shared.length - a.shared.length ||
          a.post.minutesAgo - b.post.minutesAgo,
      )
      .slice(0, 6);
  }, [allPosts, thought]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
      <section aria-labelledby="places-title">
        <div className={s.sectionHead}>
          <div>
            <h2 id="places-title" className={s.h2}>
              Places to visit
            </h2>
            <p
              className={`${s.muted} ${s.small}`}
              style={{ margin: "4px 0 0" }}
            >
              Locals&apos; picks, with the tip that makes the visit.
            </p>
          </div>
        </div>
        <div
          className={s.chips}
          role="group"
          aria-label="Filter places"
          style={{ marginBottom: 18 }}
        >
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              className={s.chip}
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
            >
              {kindLabel(k)}
              {k === "saved" && savedPlaces.length
                ? ` (${savedPlaces.length})`
                : ""}
            </button>
          ))}
        </div>
        <div
          className={s.chips}
          role="group"
          aria-label="Filter places by area"
          style={{ marginBottom: 18 }}
        >
          {(["all", ...AREAS] as const).map((a) => (
            <button
              key={a}
              type="button"
              className={s.chip}
              aria-pressed={area === a}
              onClick={() => setArea(a)}
            >
              {a === "all" ? "All areas" : areas[a].label}
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <div className={s.empty}>
            {kind === "saved" && area === "all"
              ? "Tap the heart on a place to keep it here."
              : "No places match. Try another area or kind."}
          </div>
        ) : (
          // the places pile up as you scroll: each one settles on the last, like pages of a travel journal
          <ScrollStack
            key={`${kind}-${area}`}
            className={s.stack}
            useWindowScroll
            smoothScroll={false}
            itemDistance={60}
            itemStackDistance={18}
            stackPosition="12%"
            itemScale={0.035}
            baseScale={0.86}
            dimAmount={0.22}
            holdDistance={120}
          >
            {shown.map((p, i) => {
              const on = savedPlaces.includes(p.id);
              return (
                <ScrollStackItem key={p.id} itemClassName={s.stackCard}>
                  <Photo
                    src={p.photoUrl?.replace(/w=\d+/, "w=1100")}
                    className={s.stackPhoto}
                  >
                    <span className={s.pill}>{p.kind}</span>
                  </Photo>
                  <div className={s.stackBody}>
                    <p className={s.stackIndex}>
                      {String(i + 1).padStart(2, "0")} /{" "}
                      {String(shown.length).padStart(2, "0")}
                    </p>
                    <h3 className={s.stackName}>{p.name}</h3>
                    <p className={`${s.muted} ${s.small}`}>
                      <Icon name="pin" size={13} /> {areas[p.area].label}
                    </p>
                    <p className={s.stackBlurb}>{p.blurb}</p>
                    <p className={s.tip}>
                      <b>Local tip</b> {p.tip}
                    </p>
                    <div className={s.stackActions}>
                      <button
                        type="button"
                        className={on ? s.btn : s.ghost}
                        aria-pressed={on}
                        aria-label={
                          on ? `Remove ${p.name} from saved` : `Save ${p.name}`
                        }
                        onClick={() =>
                          toast(
                            actions.toggleSavePlace(p.id)
                              ? `${p.name} saved.`
                              : `${p.name} removed.`,
                          )
                        }
                      >
                        <Icon name="heart" size={16} /> {on ? "Saved" : "Save"}
                      </button>
                    </div>
                  </div>
                </ScrollStackItem>
              );
            })}
          </ScrollStack>
        )}
      </section>

      <section aria-labelledby="similar-title">
        <div className={s.sectionHead}>
          <div>
            <h2 id="similar-title" className={s.h2}>
              Posts like yours
            </h2>
            <p
              className={`${s.muted} ${s.small}`}
              style={{ margin: "4px 0 0" }}
            >
              From Vibers into the same things, matched on the keywords in your
              vibe and your posts.
            </p>
          </div>
        </div>
        <ul
          className={s.posts}
          style={{ listStyle: "none", margin: 0, padding: 0 }}
        >
          {similar.map(({ post, keys, shared }) => (
            <li key={post.id}>
              <PostCard post={post} keys={keys} shared={shared} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function PostCard({
  post,
  keys,
  shared = [],
  onDelete,
}: {
  post: import("@/lib/demo/club").Post;
  keys: string[];
  shared?: string[];
  onDelete?: () => void;
}) {
  const author = post.authorId === "me" ? null : viberById[post.authorId];
  const me = useDemo((st) => st.me);
  const place = places.find((x) => x.id === post.placeId);
  const name = author?.name ?? me.name;
  return (
    <article className={`${s.card} ${s.post}`}>
      {post.photoUrl && <Photo src={post.photoUrl} className={s.postPhoto} />}
      <div className={s.postBody}>
        <div className={s.author}>
          <Photo
            src={author?.photoUrl?.replace(/w=\d+/, "w=96")}
            name={name}
            position={author?.photoPosition}
            className={s.avatar}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className={s.miniName} style={{ margin: 0 }}>
              {author ? name : "You"}
            </p>
            <p className={`${s.muted} ${s.small}`} style={{ margin: 0 }}>
              {ago(post.minutesAgo)}
              {place ? ` · ${place.name}` : ""}
            </p>
          </div>
          {post.sample && <SampleTag />}
          {onDelete && (
            <button
              type="button"
              className={s.round}
              style={{ width: 36, height: 36 }}
              aria-label="Delete post"
              onClick={onDelete}
            >
              <Icon name="trash" size={16} />
            </button>
          )}
        </div>
        <p>{post.text}</p>
        {keys.length > 0 && (
          <div className={s.chips} style={{ gap: 5 }} aria-label="Keywords">
            {keys.slice(0, 5).map((k) => (
              <span
                key={k}
                className={s.tag}
                data-tone={shared.includes(k) ? undefined : "clover"}
              >
                {shared.includes(k) ? "✓ " : "#"}
                {interestById[k]?.label ?? k}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
