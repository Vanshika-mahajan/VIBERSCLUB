"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
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
      <TemplateGallery onUse={use} />
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
            <PlanEditor plan={open} />
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
function TemplateGallery({ onUse }: { onUse: (p: Plan) => void }) {
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const [index, setIndex] = useState(0);
  const items = useMemo(
    () =>
      templates.map((p) => {
        const first = p.days[0]?.stops[0]?.placeId ?? "";
        return {
          image: placePhoto(first) || (mounted ? landscape(p.title) : ""),
          fallback: mounted ? landscape(p.title) : undefined,
          label: p.title,
          alt: `${p.title}: ${placeName(first)}`,
        };
      }),
    [mounted],
  );
  const p = templates[index] ?? templates[0];
  const author = viberById[p.by];
  const stops = p.days.flatMap((d) => d.stops);
  return (
    <section aria-labelledby="templates-title">
      <div className={s.sectionHead}>
        <div>
          <h2 id="templates-title" className={s.h2}>
            Start from a plan
          </h2>
          <p className={`${s.muted} ${s.small}`} style={{ margin: "4px 0 0" }}>
            Ways to spend a few days, by Vibers Club and by Vibers who have done
            them.
          </p>
        </div>
      </div>
      <div className={s.accordion}>
        <AccordionGallery
          items={items}
          defaultIndex={0}
          ariaLabel="Itinerary templates"
          onChange={setIndex}
          height={380}
          gap={10}
          radius={20}
          expandRatio={0.5}
          tilt={4}
          parallax={0.35}
          grayscale={false}
          overlayColor="#1f0c11"
          accentColor="#b98a95"
          textColor="#f3ebdd"
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
              {author ? `by ${firstName(author)}` : "by Vibers Club"} ·{" "}
              {p.days.length} {p.days.length === 1 ? "day" : "days"} ·{" "}
              {stops.length} stops
            </p>
          </div>
          {p.sample && <SampleTag />}
        </div>
        <p className={s.templateSummary}>{p.summary}</p>
        <p className={s.templateStops}>
          {stops.map((st) => placeName(st.placeId)).join(" → ")}
        </p>
        <div>
          <button type="button" className={s.btn} onClick={() => onUse(p)}>
            Use this plan
          </button>
        </div>
      </article>
    </section>
  );
}

function PlanEditor({ plan }: { plan: Plan }) {
  return (
    <div className={`${s.card} ${s.timeline}`}>
      <div className={s.row}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className={s.h3} style={{ fontSize: "1.2rem" }}>
            {plan.title}
          </h3>
          {plan.summary && (
            <p
              className={`${s.muted} ${s.small}`}
              style={{ margin: "2px 0 0" }}
            >
              {plan.summary}
            </p>
          )}
        </div>
        <button
          type="button"
          className={s.round}
          style={{ width: 38, height: 38 }}
          aria-label={`Delete ${plan.title}`}
          onClick={() => {
            actions.deleteItinerary(plan.id);
            toast(`"${plan.title}" deleted.`);
          }}
        >
          <Icon name="trash" size={16} />
        </button>
      </div>
      {plan.days.map((d, i) => (
        <div key={d.id} className={s.day}>
          <p className={s.dayLabel}>Day {i + 1}</p>
          {d.stops.length === 0 && (
            <p
              className={`${s.muted} ${s.small}`}
              style={{ margin: "0 0 6px" }}
            >
              Nothing planned yet.
            </p>
          )}
          {d.stops.map((st) => (
            <div key={st.id} className={s.stop}>
              <span className={s.time}>{st.time}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className={s.miniName} style={{ margin: 0 }}>
                  {placeName(st.placeId)}
                </p>
                {st.note && (
                  <p className={`${s.muted} ${s.small}`} style={{ margin: 0 }}>
                    {st.note}
                  </p>
                )}
              </div>
              <button
                type="button"
                className={s.round}
                style={{ width: 32, height: 32, boxShadow: "none" }}
                aria-label={`Remove ${placeName(st.placeId)} from day ${i + 1}`}
                onClick={() => actions.removeStop(plan.id, d.id, st.id)}
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
          <AddStop planId={plan.id} dayId={d.id} day={i + 1} />
        </div>
      ))}
      {plan.days.length < 14 && (
        <div>
          <button
            type="button"
            className={s.ghost}
            onClick={() => actions.addDay(plan.id)}
          >
            <Icon name="plus" size={16} /> Add a day
          </button>
        </div>
      )}
    </div>
  );
}

function AddStop({
  planId,
  dayId,
  day,
}: {
  planId: string;
  dayId: string;
  day: number;
}) {
  const [place, setPlace] = useState("");
  const [time, setTime] = useState("10:00");
  return (
    <form
      className={s.addStop}
      onSubmit={(e) => {
        e.preventDefault();
        if (!place) return;
        actions.addStop(planId, dayId, place, time);
        setPlace("");
      }}
    >
      <select
        className={s.select}
        aria-label={`Place to add on day ${day}`}
        value={place}
        onChange={(e) => setPlace(e.target.value)}
      >
        <option value="">Add a place…</option>
        {places.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <input
        className={s.field}
        type="time"
        aria-label={`Time on day ${day}`}
        value={time}
        onChange={(e) => setTime(e.target.value)}
      />
      <button type="submit" className={s.btn} disabled={!place}>
        Add
      </button>
    </form>
  );
}
