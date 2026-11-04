"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Bookmark01Icon, Calendar03Icon, FavouriteIcon, Location01Icon, Route01Icon, UserBlock01Icon } from "@hugeicons/core-free-icons";
import AnimatedList from "@/components/reactbits/AnimatedList";
import { toast } from "@/components/ui";
import { places } from "@/lib/demo/data";
import { allEvents, viberById } from "@/lib/demo/people";
import { actions, useDemo } from "@/lib/demo/store";
import { areas } from "@/lib/taxonomy";
import s from "./profile.module.css";

const glyph = (icon: typeof FavouriteIcon) => <HugeiconsIcon icon={icon} size={18} strokeWidth={1.8} />;

type Row = { id: string; icon: ReactNode; image?: string; title: string; description?: string; meta?: string; go: () => void };

function List({ title, rows, empty }: { title: string; rows: Row[]; empty: ReactNode }) {
  return (
    <section aria-label={title}>
      <div className={s.listHead}>
        <h3 className={s.listTitle}>{title}</h3>
        <span className={s.kicker}>{rows.length}</span>
      </div>
      {rows.length ? (
        <AnimatedList
          items={rows}
          ariaLabel={title}
          theme="winewood"
          animation="pop"
          animateOnce
          width="100%"
          maxHeight={320}
          selectOnHover={false}
          onItemSelect={(row) => row.go()}
        />
      ) : (
        <p className={s.listEmpty}>{empty}</p>
      )}
    </section>
  );
}

/** Everything I keep, one list per kind: plans, itineraries, places, people. Enter or a tap opens one. */
export function ProfileLists() {
  const router = useRouter();
  const rsvps = useDemo((st) => st.rsvps);
  const hosted = useDemo((st) => st.hosted);
  const itineraries = useDemo((st) => st.itineraries);
  const savedPlaces = useDemo((st) => st.savedPlaces);
  const liked = useDemo((st) => st.liked);
  const saved = useDemo((st) => st.saved);
  const blocked = useDemo((st) => st.blocked);

  const person = (id: string, icon: typeof FavouriteIcon): Row | null => {
    const v = viberById[id];
    return v
      ? {
          id,
          icon: glyph(icon),
          title: v.name,
          description: `${v.status === "local" ? "Local" : "Visiting"} · ${areas[v.area].label}`,
          go: () => router.push(`/vibers/${id}`),
        }
      : null;
  };
  const plans: Row[] = allEvents(hosted)
    .filter((e) => rsvps[e.id] || e.hostId === "me")
    .map((e) => ({
      id: e.id,
      icon: glyph(Calendar03Icon),
      title: e.title,
      description: `${e.dayOffset === 0 ? "Today" : e.dayOffset === 1 ? "Tomorrow" : `In ${e.dayOffset} days`} · ${e.time}`,
      meta: e.hostId === "me" ? "Hosting" : rsvps[e.id] === "going" ? "Going" : "Waitlist",
      go: () => router.push(`/events/${e.id}`),
    }));
  const plansOfMine: Row[] = itineraries.map((it) => ({
    id: it.id,
    icon: glyph(Route01Icon),
    title: it.title || "Untitled plan",
    description: `${it.days.length} ${it.days.length === 1 ? "day" : "days"}`,
    meta: `${it.days.reduce((n, d) => n + d.stops.length, 0)} stops`,
    go: () => router.push("/explore?section=itinerary"),
  }));
  const placesKept: Row[] = savedPlaces
    .map((id) => places.find((p) => p.id === id))
    .filter((p) => !!p)
    .map((p) => ({
      id: p.id,
      icon: glyph(Location01Icon),
      title: p.name,
      description: `${p.kind} · ${areas[p.area].label}`,
      go: () => router.push("/explore"),
    }));
  const people = (ids: string[], icon: typeof FavouriteIcon) => ids.map((id) => person(id, icon)).filter((r): r is Row => !!r);
  const blockedRows: Row[] = blocked.map((id) => ({
    id,
    icon: glyph(UserBlock01Icon),
    title: viberById[id]?.name ?? id,
    description: "Hidden from you everywhere",
    meta: "Tap to unblock",
    go: () => {
      if (!window.confirm(`Unblock ${viberById[id]?.name ?? "them"}?`)) return;
      actions.unblock(id);
      toast("Unblocked.");
    },
  }));

  return (
    <div className={s.lists}>
      <List title="Your plans" rows={plans} empty="No plans yet. Join an event from Home or Events." />
      <List title="Your itineraries" rows={plansOfMine} empty="Plan your days in Explore, under Itinerary." />
      <List title="Saved places" rows={placesKept} empty="Save places in Explore to find them here." />
      <List title="Liked" rows={people(liked, FavouriteIcon)} empty="Vibers you like in Discover show up here." />
      <List title="Saved Vibers" rows={people(saved, Bookmark01Icon)} empty="Save Vibers to come back to them later." />
      {blockedRows.length > 0 && <List title="Blocked" rows={blockedRows} empty="" />}
    </div>
  );
}
