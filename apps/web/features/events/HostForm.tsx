"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PageHeader, toast } from "@/components/ui";
import type { DemoEvent } from "@/lib/demo/data";
import { actions } from "@/lib/demo/store";
import { areas, interests, type AreaId } from "@/lib/taxonomy";

type Errors = Partial<Record<"title" | "meetingPoint" | "time" | "capacity" | "price" | "interests", string>>;

/** the same rules the API will apply in M7 (title, a public meeting point, 2–50 people, price 0–50,000) */
export function validate(f: { title: string; meetingPoint: string; time: string; capacity: number; priceInr: number; interests: string[] }): Errors {
  const e: Errors = {};
  if (f.title.trim().length < 4) e.title = "Give it a title of at least 4 characters.";
  if (f.meetingPoint.trim().length < 3) e.meetingPoint = "Add a public meeting point, like a café or a temple square.";
  if (!/^\d{2}:\d{2}$/.test(f.time)) e.time = "Pick a start time.";
  if (!Number.isInteger(f.capacity) || f.capacity < 2 || f.capacity > 50) e.capacity = "Between 2 and 50 people.";
  if (!Number.isInteger(f.priceInr) || f.priceInr < 0 || f.priceInr > 50000) e.price = "From ₹0 (free) to ₹50,000.";
  if (f.interests.length === 0) e.interests = "Pick at least one interest so the right people find it.";
  return e;
}

export function HostForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [area, setArea] = useState<AreaId>("old_manali");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [dayOffset, setDayOffset] = useState(1);
  const [time, setTime] = useState("17:00");
  const [capacity, setCapacity] = useState(8);
  const [paid, setPaid] = useState(false);
  const [priceInr, setPrice] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const f = { title, meetingPoint, time, capacity, priceInr: paid ? priceInr : 0, interests: picked };
    const e = validate(f);
    setErrors(e);
    if (Object.keys(e).length) return;
    const event: DemoEvent = {
      ...f,
      id: `my-${Date.now().toString(36)}`,
      title: title.trim(),
      meetingPoint: meetingPoint.trim(),
      hostId: "me",
      area,
      dayOffset,
      durationHours: 2,
      goingIds: [],
      description: description.trim() || "Hosted by you.",
      sample: false,
    };
    actions.host(event);
    toast("Your event is live. Vibers who match it will see it on Events.");
    router.push(`/events/${event.id}`);
  };

  const err = (k: keyof Errors) =>
    errors[k] ? (
      <p id={`${k}-error`} className="mt-1 text-sm font-semibold text-coral">
        {errors[k]}
      </p>
    ) : null;
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 5 ? [...p, id] : p));

  return (
    <div className="max-w-2xl">
      <PageHeader kicker="Host" title="Host an event">
        Any Viber can host. Keep it public: meet at a café, a trailhead or a temple square, never a private room.
      </PageHeader>
      <form className="card space-y-5 p-5" onSubmit={submit} noValidate>
        <label className="block">
          <span className="font-bold">Title</span>
          <input className="field mt-1" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!errors.title} aria-describedby="title-error" placeholder="Sunset walk to Lamadugh" />
          {err("title")}
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="font-bold">Area</span>
            <select className="field mt-1" value={area} onChange={(e) => setArea(e.target.value as AreaId)}>
              {Object.entries(areas).map(([id, a]) => (
                <option key={id} value={id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-bold">Meeting point</span>
            <input className="field mt-1" value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)} aria-invalid={!!errors.meetingPoint} aria-describedby="meetingPoint-error" placeholder="The Slow Pine café" />
            {err("meetingPoint")}
          </label>
          <label className="block">
            <span className="font-bold">Day</span>
            <select className="field mt-1" value={dayOffset} onChange={(e) => setDayOffset(Number(e.target.value))}>
              <option value={0}>Today</option>
              <option value={1}>Tomorrow</option>
              {[2, 3, 4, 5, 6].map((d) => (
                <option key={d} value={d}>
                  In {d} days
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-bold">Start time</span>
            <input type="time" className="field mt-1" value={time} onChange={(e) => setTime(e.target.value)} aria-invalid={!!errors.time} aria-describedby="time-error" />
            {err("time")}
          </label>
          <label className="block">
            <span className="font-bold">How many people</span>
            <input type="number" min={2} max={50} className="field mt-1" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} aria-invalid={!!errors.capacity} aria-describedby="capacity-error" />
            {err("capacity")}
          </label>
          <fieldset>
            <legend className="font-bold">Price</legend>
            <div className="mt-1 flex gap-2">
              <button type="button" className="chip" aria-pressed={!paid} onClick={() => setPaid(false)}>
                Free
              </button>
              <button type="button" className="chip" aria-pressed={paid} onClick={() => setPaid(true)}>
                Paid
              </button>
            </div>
            {paid && (
              <label className="mt-2 block">
                <span className="text-sm text-muted">Price in ₹ (you collect it yourself)</span>
                <input type="number" min={0} className="field mt-1" value={priceInr} onChange={(e) => setPrice(Number(e.target.value))} aria-invalid={!!errors.price} aria-describedby="price-error" />
              </label>
            )}
            {err("price")}
          </fieldset>
        </div>
        <fieldset>
          <legend className="font-bold">Interests (up to 5)</legend>
          <div className="mt-2 flex max-h-44 flex-wrap gap-2 overflow-y-auto">
            {interests.map((i) => (
              <button key={i.id} type="button" className="chip" aria-pressed={picked.includes(i.id)} onClick={() => toggle(i.id)}>
                {i.label}
              </button>
            ))}
          </div>
          {err("interests")}
        </fieldset>
        <label className="block">
          <span className="font-bold">What to expect (optional)</span>
          <textarea className="field mt-1 min-h-24" maxLength={600} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <button type="submit" className="btn w-full sm:w-auto">
          Publish event
        </button>
      </form>
    </div>
  );
}
