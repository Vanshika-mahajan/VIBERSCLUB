"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { ItineraryBuilder } from "./ItineraryBuilder";
import { interestById } from "@/lib/taxonomy";
import AccordionGallery from "@/components/reactbits/AccordionGallery";
import {
  clubTemplates,
  viberTemplates,
  type Itinerary as Plan,
} from "@/lib/demo/club";
import { places } from "@/lib/demo/data";
import { actions, useDemo } from "@/lib/demo/store";
import { firstName, viberById } from "@/lib/demo/people";
import { toast } from "@/components/ui";
import { Icon, Photo, SampleTag, landscape } from "./shared";
import s from "./club.module.css";

const placeName = (id: string) => places.find((p) => p.id === id)?.name ?? id;
const placePhoto = (id: string) =>
  places.find((p) => p.id === id)?.photoUrl?.replace(/w=\d+/, "w=1100");
const templates = [...clubTemplates, ...viberTemplates];

/** what you would do on a plan: the activities written on its stops, else what its places are known for */
export function activitiesOf(p: Plan, max = 5): string[] {
  const stops = p.days.flatMap((d) => d.stops);
  const written = stops.map((st) => st.activity?.trim()).filter((a): a is string => !!a);
  const known = stops.flatMap((st) => places.find((x) => x.id === st.placeId)?.interests.slice(0, 1) ?? []).map((id) => interestById[id]?.label ?? id);
  return [...new Set([...written, ...known])].slice(0, max);
}
const noop = () => () => {};

/** My itinerary: build my own day by day, or start from a plan by Vibers Club or another Viber. */
export function Itinerary() {
  const mine = useDemo((st) => st.itineraries);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = mine.find((i) => i.id === openId) ?? mine[0];
  const [title, setTitle] = useState("");
  const [days, setDays] = useState(3);

  const use = (t: Plan) => {
    const it = actions.createItinerary("", t.days.length, t);
    setOpenId(it.id);
    toast(`"${t.title}" is now in your plans. Change anything you like.`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
      <TemplateGallery onUse={use} mine={mine.filter((i) => i.visibility === "public")} />
      <div className={s.itinGrid}>
        <section
          aria-labelledby="mine-title"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div className={s.sectionHead} style={{ marginBottom: 0 }}>
            <div>
              <h2 id="mine-title" className={s.h2}>
                My itinerary
              </h2>
              <p
                className={`${s.muted} ${s.small}`}
                style={{ margin: "4px 0 0" }}
              >
                Day by day, stop by stop.
              </p>
            </div>
          </div>

          {mine.length > 1 && (
            <div className={s.chips} role="group" aria-label="My plans">
              {mine.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  className={s.chip}
                  aria-pressed={open?.id === it.id}
                  onClick={() => setOpenId(it.id)}
                >
                  {it.title}
                </button>
              ))}
            </div>
          )}

          {open ? (
            <ItineraryBuilder plan={open} />
          ) : (
            <div className={s.empty}>
              <p className={s.h3} style={{ color: "var(--ink)" }}>
                Your itinerary is missing a few people.
              </p>
              <p>
                Start your own below, or borrow a plan from Vibers Club or
                another Viber.
              </p>
            </div>
          )}

          <form
            className={`${s.card} ${s.create}`}
            style={{ padding: 16 }}
            onSubmit={(e) => {
              e.preventDefault();
              const it = actions.createItinerary(title, days);
              setOpenId(it.id);
              setTitle("");
              toast(`"${it.title}" created. Add your first stop.`);
            }}
          >
            <div>
              <label className={s.label} htmlFor="it-title">
                Create your own
              </label>
              <input
                id="it-title"
                className={s.field}
                placeholder="My Manali trip"
                value={title}
                maxLength={60}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className={s.label} htmlFor="it-days">
                Days
              </label>
              <input
                id="it-days"
                className={s.field}
                type="number"
                min={1}
                max={14}
                value={days}
                onChange={(e) => setDays(Number(e.target.value) || 1)}
              />
            </div>
            <button type="submit" className={s.btn}>
              <Icon name="plus" size={16} /> Create
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

/**
 * Plans to start from, by Vibers Club and by other Vibers, as a row of photographs: hover, tap or
 * focus one to open it, and its details and "Use this plan" appear below.
 */
function TemplateGallery({ onUse, mine }: { onUse: (p: Plan) => void; mine: Plan[] }) {
  const all = useMemo(() => [...mine, ...templates], [mine]);
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const [index, setIndex] = useState(0);
  const items = useMemo(
    () =>
      all.map((p) => {
        const first = p.days[0]?.stops[0]?.placeId ?? "";
        return {
          image: placePhoto(first) || (mounted ? landscape(p.title) : ""),
          fallback: mounted ? landscape(p.title) : undefined,
          label: p.title,
          alt: `${p.title}: ${placeName(first)}`,
        };
      }),
    [mounted, all],
  );
  const p = all[index] ?? all[0];
  const mineShown = p.by === "me";
  const author = viberById[p.by];
  const stops = p.days.flatMap((d) => d.stops);
  return (
    <section aria-labelledby="templates-title">
      <div className={s.sectionHead}>
        <div>
          <h2 id="templates-title" className={s.h2}>
            Public itineraries
          </h2>
          <p className={`${s.muted} ${s.small}`} style={{ margin: "4px 0 0" }}>
            Ways to spend a few days, shared by Vibers Club and by Vibers who have done
            them. Copy one and make it yours.
          </p>
        </div>
      </div>
      <div className={s.accordion}>
        <AccordionGallery
          items={items}
          defaultIndex={0}
          ariaLabel="Public itineraries, as photos"
          onChange={setIndex}
          height={380}
          gap={10}
          radius={20}
          expandRatio={0.5}
          tilt={4}
          parallax={0.35}
          grayscale={false}
          overlayColor="#2a0a2e"
          accentColor="#9b82b5"
          textColor="#f5f0c9"
          trigger="hover"
        />
      </div>
      <article className={`${s.card} ${s.templateDetail}`} aria-live="polite">
        <div className={s.row}>
          {author ? (
            <Photo
              src={author.photoUrl?.replace(/w=\d+/, "w=96")}
              name={author.name}
              position={author.photoPosition}
              className={s.avatar}
            />
          ) : (
            <span className={`${s.avatar} ${s.clubMark}`} aria-hidden="true">
              <Icon name="spark" size={16} />
            </span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 className={s.templateTitle}>{p.title}</h3>
            <p className={`${s.muted} ${s.small}`}>
              {mineShown ? "by you" : author ? `by ${firstName(author)}` : "by Vibers Club"} ·{" "}
              {p.days.length} {p.days.length === 1 ? "day" : "days"} ·{" "}
              {stops.length} stops
            </p>
          </div>
          <span className={s.visTag}>{p.visibility === "private" ? "Private" : "Public"}</span>
          {p.sample && <SampleTag />}
        </div>
        {p.summary && <p className={s.templateSummary}>{p.summary}</p>}
        <dl className={s.planFacts}>
          {p.travelStyle && (
            <div>
              <dt>Travel style</dt>
              <dd>{p.travelStyle}</dd>
            </div>
          )}
          <div>
            <dt>Places</dt>
            <dd className={s.templateStops}>{stops.length ? stops.map((st) => placeName(st.placeId)).join(" → ") : "None yet"}</dd>
          </div>
          {activitiesOf(p).length > 0 && (
            <div>
              <dt>Activities</dt>
              <dd className={s.chips}>
                {activitiesOf(p).map((a) => (
                  <span key={a} className={s.chip}>
                    {a}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
        <div>
          <button type="button" className={s.btn} data-sound="add" onClick={() => onUse(p)}>
            {mineShown ? "Make a copy" : "Use this plan"}
          </button>
        </div>
      </article>
    </section>
  );
}
