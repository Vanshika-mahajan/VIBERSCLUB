"use client";

import { useMemo, useState } from "react";
import { Cover, Empty, PageHeader, Section, toast } from "@/components/ui";
import { places, roadmaps } from "@/lib/demo/data";
import { actions, useDemo } from "@/lib/demo/store";
import { areas, interestById, type AreaId } from "@/lib/taxonomy";

const placeById = Object.fromEntries(places.map((p) => [p.id, p]));

export function ExploreScreen() {
  const saved = useDemo((s) => s.savedPlaces);
  const [area, setArea] = useState<AreaId | "all">("all");
  const [interest, setInterest] = useState<string | null>(null);
  const [onlySaved, setOnlySaved] = useState(false);

  const usedAreas = useMemo(() => [...new Set(places.map((p) => p.area))], []);
  const usedInterests = useMemo(() => [...new Set(places.flatMap((p) => p.interests))].slice(0, 10), []);
  const list = places
    .filter((p) => area === "all" || p.area === area)
    .filter((p) => !interest || p.interests.includes(interest))
    .filter((p) => !onlySaved || saved.includes(p.id));

  const save = (id: string, name: string) => toast(actions.toggleSavePlace(id) ? `Saved ${name}.` : `Removed ${name} from saved.`);

  return (
    <div>
      <PageHeader kicker="Explore" title="Explore Manali">
        Places Vibers love, and day plans you can follow. Curated by locals; reviews come later.
      </PageHeader>

      <div className="space-y-2" role="group" aria-label="Filter places">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="chip" aria-pressed={area === "all"} onClick={() => setArea("all")}>
            All areas
          </button>
          {usedAreas.map((a) => (
            <button key={a} type="button" className="chip" aria-pressed={area === a} onClick={() => setArea(a)}>
              {areas[a].label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {usedInterests.map((i) => (
            <button key={i} type="button" className="chip" aria-pressed={interest === i} onClick={() => setInterest(interest === i ? null : i)}>
              {interestById[i].label}
            </button>
          ))}
          <button type="button" className="chip" aria-pressed={onlySaved} onClick={() => setOnlySaved(!onlySaved)}>
            Saved ({saved.length})
          </button>
        </div>
      </div>

      <Section title={`${list.length} ${list.length === 1 ? "place" : "places"}`}>
        {list.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => {
              const on = saved.includes(p.id);
              return (
                <li key={p.id} className="card overflow-hidden">
                  <Cover src={p.photoUrl} className="h-32">
                    <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-extrabold capitalize">{p.kind}</span>
                  </Cover>
                  <div className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-lg leading-tight font-extrabold">{p.name}</h3>
                        <p className="text-sm text-muted">{areas[p.area].label}</p>
                      </div>
                      <button type="button" className="btn-ghost btn-sm" aria-pressed={on} aria-label={`${on ? "Unsave" : "Save"} ${p.name}`} onClick={() => save(p.id, p.name)}>
                        {on ? "Saved" : "Save"}
                      </button>
                    </div>
                    <p className="text-sm text-ink2">{p.blurb}</p>
                    <p className="rounded-2xl bg-haze p-3 text-sm text-ink2">
                      <b>Local tip:</b> {p.tip}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty>No places match. Try another area or clear a filter.</Empty>
        )}
      </Section>

      <Section title="Day plans">
        <div className="grid gap-4 md:grid-cols-3">
          {roadmaps.map((r) => (
            <article key={r.id} id={r.id} className="card scroll-mt-6 p-5">
              <h3 className="text-lg font-extrabold">{r.title}</h3>
              <p className="text-sm text-muted">{r.summary}</p>
              <ol className="mt-4 space-y-3 border-l-2 border-line pl-4">
                {r.stops.map((s) => (
                  <li key={s.placeId}>
                    <span className="text-xs font-bold text-blue">{s.time}</span>
                    <b className="block">{placeById[s.placeId]?.name}</b>
                    <small className="text-muted">{s.note}</small>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </Section>
    </div>
  );
}
