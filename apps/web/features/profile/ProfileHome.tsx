"use client";

import Link from "next/link";
import { useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { GridIcon, LockIcon, Settings01Icon } from "@hugeicons/core-free-icons";
import { Avatar } from "@/components/ui";
import { places } from "@/lib/demo/data";
import { useDemo } from "@/lib/demo/store";
import { areas, intents, interestById } from "@/lib/taxonomy";
import { Albums } from "./Albums";
import { ProfileLists } from "./ProfileLists";
import s from "./profile.module.css";

/**
 * Your profile as others see it, the way a photo app shows one: your picture, name and numbers, your
 * vibe line, albums as round highlights, then your posts as a grid. The gear opens settings. Your
 * lists sit at the end, and only you can see them.
 */
export function ProfileHome() {
  const me = useDemo((st) => st.me);
  const allPosts = useDemo((st) => st.posts);
  const albums = useDemo((st) => st.albums);
  const connections = useDemo((st) => st.connections);
  const posts = useMemo(() => allPosts.filter((p) => p.authorId === "me"), [allPosts]);
  const connected = useMemo(() => Object.values(connections).filter((c) => c === "connected").length, [connections]);

  return (
    <div className={s.home}>
      <header className={s.head}>
        <Avatar name={me.name} size={96} className={s.headAvatar} />
        <div className={s.headMain}>
          <div className={s.headTop}>
            <h1 className={`display ${s.name}`}>{me.name}</h1>
            <Link href="/profile/settings" className={s.gear} aria-label="Settings">
              <HugeiconsIcon icon={Settings01Icon} size={20} strokeWidth={1.8} />
            </Link>
          </div>
          <p className={s.where}>
            {me.status === "local" ? "Local" : "Visiting"} · {areas[me.area].label}
          </p>
          <ul className={s.stats} aria-label="Your numbers">
            <li>
              <b>{posts.length}</b> {posts.length === 1 ? "post" : "posts"}
            </li>
            <li>
              <b>{albums.length}</b> {albums.length === 1 ? "album" : "albums"}
            </li>
            <li>
              <b>{connected}</b> {connected === 1 ? "connection" : "connections"}
            </li>
          </ul>
        </div>
      </header>

      {me.vibe && <p className={s.bio}>&ldquo;{me.vibe}&rdquo;</p>}
      {(me.interests.length > 0 || me.intents.length > 0) && (
        <p className={s.tags}>
          {me.interests.slice(0, 6).map((id) => (
            <span key={id}>#{(interestById[id]?.label ?? id).replace(/\s+/g, "")}</span>
          ))}
          {me.intents.map((id) => (
            <span key={id} className={s.intent}>
              {intents[id].label}
            </span>
          ))}
        </p>
      )}

      <Albums />

      <section aria-labelledby="posts-title" className={s.postsWrap}>
        <h2 id="posts-title" className={s.tabTitle}>
          <HugeiconsIcon icon={GridIcon} size={16} /> Posts
        </h2>
        {posts.length ? (
          <ul className={s.grid}>
            {posts.map((p) => {
              const place = places.find((x) => x.id === p.placeId);
              return (
                <li key={p.id} className={s.tile}>
                  {p.photoUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element -- a photo kept in this browser */}
                      <img src={p.photoUrl} alt={p.text || "Your photo"} />
                      {p.text && <span className={s.caption}>{p.text}</span>}
                    </>
                  ) : (
                    <p className={s.thread}>
                      {p.text}
                      {place && <span className={s.threadPlace}>{place.name}</span>}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={s.emptyPosts}>
            Nothing posted yet. Tap <b>+</b> at the bottom to ignite the vibe.
          </p>
        )}
      </section>

      <section aria-labelledby="lists-title" className={s.listsWrap}>
        <h2 id="lists-title" className={s.tabTitle}>
          Your lists
          <span className={s.onlyYou}>
            <HugeiconsIcon icon={LockIcon} size={13} /> Only you can see this
          </span>
        </h2>
        <ProfileLists />
      </section>
    </div>
  );
}
