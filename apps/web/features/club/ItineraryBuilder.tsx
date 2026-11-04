"use client";

import { useState, type DragEvent } from "react";
import { TRAVEL_STYLES, type Itinerary as Plan } from "@/lib/demo/club";
import { places } from "@/lib/demo/data";
import { actions, useDemo } from "@/lib/demo/store";
import { areas } from "@/lib/taxonomy";
import { toast } from "@/components/ui";
import { Icon, Photo } from "./shared";
import s from "./club.module.css";

const PLACE = "application/x-vibers-place";
const STOP = "application/x-vibers-stop";
const placeName = (id: string) => places.find((p) => p.id === id)?.name ?? id;

/** "Thu 6 Nov" for day `i` of a plan that starts on `start` (yyyy-mm-dd) */
export function dayDate(start: string | undefined, i: number): string {
  if (!start) return "";
  const d = new Date(`${start}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + i);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/** where in a day a drop lands: before the stop under the pointer, or after it in its lower half */
const dropIndex = (e: DragEvent<HTMLElement>, count: number) => {
  const rows = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-stop-row]"));
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i].getBoundingClientRect();
    if (e.clientY < r.top + r.height / 2) return i;
  }
  return count;
};

/**
 * The itinerary builder: what the plan is (title, description, dates or a duration, style, notes,
 * who can see it), then day by day. Places come from Explore, by drag and drop or by the "Add to a
 * day" menu on each card (the way on phones and keyboards); stops reorder, move between days and go.
 */
export function ItineraryBuilder({ plan }: { plan: Plan }) {
  const [over, setOver] = useState<{ day: string; index: number } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const visibility = plan.visibility ?? "private";

  const onDrop = (dayId: string, count: number) => (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    const index = dropIndex(e, count);
    setOver(null);
    setDragging(null);
    const placeId = e.dataTransfer.getData(PLACE);
    const stopId = e.dataTransfer.getData(STOP);
    if (placeId) {
      actions.insertStop(plan.id, dayId, placeId, index);
      toast(`${placeName(placeId)} added.`);
    } else if (stopId) {
      // the dragged stop was still counted when measuring; it leaves its old place first
      const from = plan.days.find((d) => d.id === dayId)?.stops.findIndex((x) => x.id === stopId) ?? -1;
      actions.moveStop(plan.id, stopId, dayId, from !== -1 && from < index ? index - 1 : index);
    }
  };

  return (
    <div className={s.builder}>
      <div className={`${s.card} ${s.timeline}`}>
        <div className={s.planHead}>
          <label className={s.label} htmlFor={`t-${plan.id}`}>
            Title
          </label>
          <div className={s.row} style={{ flexWrap: "nowrap" }}>
            <input
              id={`t-${plan.id}`}
              className={`${s.field} ${s.planTitle}`}
              value={plan.title}
              maxLength={60}
              onChange={(e) => actions.updateItinerary(plan.id, { title: e.target.value })}
            />
            <button
              type="button"
              className={s.round}
              style={{ width: 40, height: 40, flex: "none" }}
              aria-label={`Delete ${plan.title || "this plan"}`}
              onClick={() => {
                if (!window.confirm(`Delete "${plan.title}"? This can't be undone.`)) return;
                actions.deleteItinerary(plan.id);
                toast(`"${plan.title}" deleted.`);
              }}
            >
              <Icon name="trash" size={16} />
            </button>
          </div>

          <label className={s.label} htmlFor={`d-${plan.id}`}>
            Description
          </label>
          <textarea
            id={`d-${plan.id}`}
            className={s.textarea}
            style={{ minHeight: 70 }}
            maxLength={400}
            placeholder="What's the idea of this trip?"
            value={plan.summary}
            onChange={(e) => actions.updateItinerary(plan.id, { summary: e.target.value })}
          />

          <div className={s.planGrid}>
            <div>
              <label className={s.label} htmlFor={`sd-${plan.id}`}>
                First day <span className={s.muted}>(optional)</span>
              </label>
              <input
                id={`sd-${plan.id}`}
                type="date"
                className={s.field}
                value={plan.startDate ?? ""}
                onChange={(e) => actions.updateItinerary(plan.id, { startDate: e.target.value || undefined })}
              />
            </div>
            <div>
              <span className={s.label}>Duration</span>
              <p className={s.duration}>
                {plan.days.length} {plan.days.length === 1 ? "day" : "days"}
                {plan.startDate && ` · ${dayDate(plan.startDate, 0)} to ${dayDate(plan.startDate, plan.days.length - 1)}`}
              </p>
            </div>
            <div>
              <label className={s.label} htmlFor={`st-${plan.id}`}>
                Travel style
              </label>
              <select
                id={`st-${plan.id}`}
                className={s.select}
                value={plan.travelStyle ?? ""}
                onChange={(e) => actions.updateItinerary(plan.id, { travelStyle: e.target.value || undefined })}
              >
                <option value="">Choose one</option>
                {TRAVEL_STYLES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <span className={s.label} id={`v-${plan.id}`}>
                Who can see it
              </span>
              <div className={s.segment} role="group" aria-labelledby={`v-${plan.id}`}>
                {(["private", "public"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={visibility === v}
                    onClick={() => {
                      actions.updateItinerary(plan.id, { visibility: v });
                      toast(v === "public" ? "Public: other Vibers can find and copy it." : "Private: only you can see it.");
                    }}
                  >
                    {v === "public" ? "Public" : "Private"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {plan.days.map((d, i) => {
          const isOver = over?.day === d.id;
          return (
            <section
              key={d.id}
              className={s.day}
              data-over={isOver || undefined}
              aria-label={`Day ${i + 1}`}
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes(PLACE) && !e.dataTransfer.types.includes(STOP)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = e.dataTransfer.types.includes(PLACE) ? "copy" : "move";
                const index = dropIndex(e, d.stops.length);
                if (over?.day !== d.id || over.index !== index) setOver({ day: d.id, index });
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null);
              }}
              onDrop={onDrop(d.id, d.stops.length)}
            >
              <div className={s.row} style={{ justifyContent: "space-between" }}>
                <p className={s.dayLabel}>
                  Day {i + 1}
                  {plan.startDate && <span className={s.dayDate}> · {dayDate(plan.startDate, i)}</span>}
                </p>
                {plan.days.length > 1 && (
                  <button
                    type="button"
                    className={s.textBtn}
                    onClick={() => {
                      if (d.stops.length && !window.confirm(`Remove day ${i + 1} and its ${d.stops.length} stops?`)) return;
                      actions.removeDay(plan.id, d.id);
                    }}
                  >
                    Remove day
                  </button>
                )}
              </div>
              {d.stops.length === 0 && (
                <p className={s.dropHint}>{isOver ? "Drop it here" : "Drag a place here, or use Add to a day on a place."}</p>
              )}
              {d.stops.map((st, j) => (
                <div key={st.id}>
                  {isOver && over.index === j && <div className={s.dropLine} aria-hidden="true" />}
                  <div
                    className={s.stopCard}
                    data-stop-row=""
                    data-dragging={dragging === st.id || undefined}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(STOP, st.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragging(st.id);
                    }}
                    onDragEnd={() => {
                      setDragging(null);
                      setOver(null);
                    }}
                  >
                    <span className={s.grip} aria-hidden="true">
                      ⋮⋮
                    </span>
                    <input
                      type="time"
                      className={`${s.field} ${s.stopTime}`}
                      aria-label={`Time for ${placeName(st.placeId)}`}
                      value={st.time}
                      onChange={(e) => actions.updateStop(plan.id, d.id, st.id, { time: e.target.value })}
                    />
                    <div className={s.stopMain}>
                      <p className={s.miniName}>{placeName(st.placeId)}</p>
                      <input
                        className={s.inline2}
                        placeholder="Activity (trek, swim, lunch…)"
                        aria-label={`Activity at ${placeName(st.placeId)}`}
                        maxLength={60}
                        value={st.activity ?? ""}
                        onChange={(e) => actions.updateStop(plan.id, d.id, st.id, { activity: e.target.value })}
                      />
                      <input
                        className={s.inline2}
                        placeholder="Note"
                        aria-label={`Note for ${placeName(st.placeId)}`}
                        maxLength={120}
                        value={st.note}
                        onChange={(e) => actions.updateStop(plan.id, d.id, st.id, { note: e.target.value })}
                      />
                    </div>
                    <div className={s.stopTools}>
                      <button
                        type="button"
                        className={s.mini2}
                        aria-label={`Move ${placeName(st.placeId)} earlier`}
                        disabled={j === 0}
                        onClick={() => actions.moveStop(plan.id, st.id, d.id, j - 1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={s.mini2}
                        aria-label={`Move ${placeName(st.placeId)} later`}
                        disabled={j === d.stops.length - 1}
                        onClick={() => actions.moveStop(plan.id, st.id, d.id, j + 1)}
                      >
                        ↓
                      </button>
                      {plan.days.length > 1 && (
                        <select
                          className={s.mini2}
                          aria-label={`Move ${placeName(st.placeId)} to another day`}
                          value=""
                          onChange={(e) => {
                            const to = plan.days.find((x) => x.id === e.target.value);
                            if (!to) return;
                            actions.moveStop(plan.id, st.id, to.id, to.stops.length);
                            toast(`Moved to day ${plan.days.indexOf(to) + 1}.`);
                          }}
                        >
                          <option value="">Day…</option>
                          {plan.days.map((x, k) =>
                            x.id === d.id ? null : (
                              <option key={x.id} value={x.id}>
                                Day {k + 1}
                              </option>
                            ),
                          )}
                        </select>
                      )}
                      <button
                        type="button"
                        className={s.mini2}
                        aria-label={`Remove ${placeName(st.placeId)} from day ${i + 1}`}
                        onClick={() => actions.removeStop(plan.id, d.id, st.id)}
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {isOver && over.index === d.stops.length && d.stops.length > 0 && <div className={s.dropLine} aria-hidden="true" />}
            </section>
          );
        })}

        {plan.days.length < 14 && (
          <div>
            <button type="button" className={s.ghost} onClick={() => actions.addDay(plan.id)}>
              <Icon name="plus" size={16} /> Add a day
            </button>
          </div>
        )}

        <div>
          <label className={s.label} htmlFor={`n-${plan.id}`}>
            Notes
          </label>
          <textarea
            id={`n-${plan.id}`}
            className={s.textarea}
            style={{ minHeight: 70 }}
            maxLength={1000}
            placeholder="Packing, budget, who's coming…"
            value={plan.notes ?? ""}
            onChange={(e) => actions.updateItinerary(plan.id, { notes: e.target.value })}
          />
        </div>
      </div>

      <PlacesTray plan={plan} />
    </div>
  );
}

/** Places from Explore, to drag onto a day, or to add with the menu (phones and keyboards). */
function PlacesTray({ plan }: { plan: Plan }) {
  return (
    <aside className={s.tray} aria-labelledby={`tray-${plan.id}`}>
      <h3 id={`tray-${plan.id}`} className={s.h3}>
        Places from Explore
      </h3>
      <p className={`${s.muted} ${s.small}`} style={{ margin: "2px 0 10px" }}>
        Drag a place onto a day, or pick the day with Add.
      </p>
      <ul className={s.trayList}>
        {places.map((p) => (
          <li
            key={p.id}
            className={s.trayCard}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(PLACE, p.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
          >
            <Photo src={p.photoUrl?.replace(/w=\d+/, "w=200")} className={s.trayPhoto} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className={s.miniName}>{p.name}</p>
              <p className={`${s.muted} ${s.small}`}>
                {p.kind} · {areas[p.area].label}
              </p>
            </div>
            <select
              className={s.mini2}
              aria-label={`Add ${p.name} to a day`}
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                actions.insertStop(plan.id, e.target.value, p.id);
                toast(`${p.name} added to day ${plan.days.findIndex((d) => d.id === e.target.value) + 1}.`);
              }}
            >
              <option value="">Add…</option>
              {plan.days.map((d, i) => (
                <option key={d.id} value={d.id}>
                  Day {i + 1}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/**
 * "Add to plan" on a place in Explore: pick one of your plans and a day, or start a new plan with it.
 * A select, so it works the same with a finger, a mouse or a keyboard.
 */
export function AddToPlan({ placeId, name }: { placeId: string; name: string }) {
  const mine = useDemo((st) => st.itineraries);
  return (
    <select
      className={`${s.select} ${s.addPlan}`}
      aria-label={`Add ${name} to a plan`}
      value=""
      onChange={(e) => {
        const v = e.target.value;
        if (!v) return;
        if (v === "new") {
          const it = actions.createItinerary("", 1);
          actions.insertStop(it.id, it.days[0].id, placeId);
          toast(`${name} is day 1 of a new plan, in Itinerary.`);
          return;
        }
        const [itId, dayId] = v.split("|");
        const it = mine.find((x) => x.id === itId);
        actions.insertStop(itId, dayId, placeId);
        toast(`${name} added to "${it?.title}", day ${(it?.days.findIndex((d) => d.id === dayId) ?? 0) + 1}.`);
      }}
    >
      <option value="">Add to plan…</option>
      {mine.map((it) => (
        <optgroup key={it.id} label={it.title}>
          {it.days.map((d, i) => (
            <option key={d.id} value={`${it.id}|${d.id}`}>
              {it.title} · Day {i + 1}
            </option>
          ))}
        </optgroup>
      ))}
      <option value="new">A new plan</option>
    </select>
  );
}
