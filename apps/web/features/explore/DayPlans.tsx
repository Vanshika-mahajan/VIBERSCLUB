"use client";

import { Section, toast } from "@/components/ui";
import { places, roadmaps, type Roadmap } from "@/lib/demo/data";
import type { Itinerary } from "@/lib/demo/club";
import { actions, useDemo } from "@/lib/demo/store";

const placeById = Object.fromEntries(places.map((p) => [p.id, p]));

/** a local day plan as a one-day itinerary of mine, ready for the builder */
function asItinerary(r: Roadmap): Itinerary {
  return {
    id: r.id,
    title: r.title,
    summary: r.summary,
    by: "club",
    sample: false,
    visibility: "private",
    fromRoadmap: r.id,
    days: [{ id: `${r.id}-d1`, stops: r.stops.map((st, i) => ({ id: `${r.id}-${i}`, ...st })) }],
  };
}

/**
 * Day plans by locals, stop by stop. Each one has an anchor (#id), so Home can link straight to it.
 * "Save for later" keeps a copy in your itineraries to use as it is; "Customize" opens that copy in the
 * itinerary builder (saving it first if needed), so you can change it and it stays saved.
 */
export function DayPlans({ onCustomize }: { onCustomize?: (itineraryId: string) => void }) {
  const mine = useDemo((st) => st.itineraries);
  const savedCopy = (r: Roadmap) => mine.find((i) => i.fromRoadmap === r.id);

  const save = (r: Roadmap) => {
    const have = savedCopy(r);
    if (have) return have;
    const it = actions.createItinerary("", 1, asItinerary(r));
    return it;
  };

  return (
    <section id="day-plans" className="scroll-mt-6">
      <Section title="Day plans">
        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          {roadmaps.map((r) => {
            const saved = !!savedCopy(r);
            return (
              <article key={r.id} id={r.id} className="flex scroll-mt-6 flex-col border-t border-ink pt-4">
                <h3 className="font-display text-[1.4rem] leading-[1.02] font-bold tracking-[-0.025em]">{r.title}</h3>
                <p className="mt-2 text-sm text-muted">{r.summary}</p>
                <ol className="mt-4 space-y-3 border-l border-line2 pl-4">
                  {r.stops.map((s) => (
                    <li key={s.placeId}>
                      <span className="kicker text-accent">{s.time}</span>
                      <b className="block font-medium">{placeById[s.placeId]?.name}</b>
                      <small className="text-muted">{s.note}</small>
                    </li>
                  ))}
                </ol>
                <div className="mt-auto flex flex-wrap gap-2 pt-5">
                  <button
                    type="button"
                    className="btn btn-sm"
                    data-sound="add"
                    aria-label={`Customize ${r.title}`}
                    onClick={() => {
                      const it = save(r);
                      if (!saved) toast(`"${r.title}" saved to your itineraries. Change anything you like.`);
                      onCustomize?.(it.id);
                    }}
                  >
                    Customize
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    data-sound="add"
                    aria-label={saved ? `${r.title} is saved for later` : `Save ${r.title} for later`}
                    aria-pressed={saved}
                    onClick={() => {
                      if (saved) return toast(`"${r.title}" is already in your itineraries.`);
                      save(r);
                      toast(`"${r.title}" saved for later. Find it in Itinerary, ready to use as it is.`);
                    }}
                  >
                    {saved ? "Saved ✓" : "Save for later"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </Section>
    </section>
  );
}
