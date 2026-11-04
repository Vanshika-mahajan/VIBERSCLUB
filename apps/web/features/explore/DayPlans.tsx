import { Section } from "@/components/ui";
import { places, roadmaps } from "@/lib/demo/data";

const placeById = Object.fromEntries(places.map((p) => [p.id, p]));

/** Day plans by locals, stop by stop. Each one has an anchor (#id), so Home can link straight to it. */
export function DayPlans() {
  return (
    <Section title="Day plans">
      <div className="grid gap-4 md:grid-cols-3">
        {roadmaps.map((r) => (
          <article key={r.id} id={r.id} className="card scroll-mt-6 p-5">
            <h3 className="text-lg font-extrabold">{r.title}</h3>
            <p className="text-sm text-muted">{r.summary}</p>
            <ol className="mt-4 space-y-3 border-l-2 border-line pl-4">
              {r.stops.map((s) => (
                <li key={s.placeId}>
                  <span className="text-xs font-bold text-accent">{s.time}</span>
                  <b className="block">{placeById[s.placeId]?.name}</b>
                  <small className="text-muted">{s.note}</small>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </Section>
  );
}
