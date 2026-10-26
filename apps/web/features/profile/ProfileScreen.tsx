"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar, Empty, PageHeader, Section, Toggle, toast } from "@/components/ui";
import { hashtag, interpret } from "@/features/discover/interpret";
import { allEvents, viberById } from "@/lib/demo/people";
import { actions, useDemo } from "@/lib/demo/store";
import { areas, categories, intents, interests, type AreaId, type IntentId } from "@/lib/taxonomy";

const MAX_INTERESTS = 12;

export function ProfileScreen() {
  const me = useDemo((s) => s.me);
  const liked = useDemo((s) => s.liked);
  const saved = useDemo((s) => s.saved);
  const blocked = useDemo((s) => s.blocked);
  const rsvps = useDemo((s) => s.rsvps);
  const hosted = useDemo((s) => s.hosted);
  // null = not edited yet, so the box shows the saved vibe
  const [draft, setDraft] = useState<string | null>(null);
  const vibe = draft ?? me.vibe;
  const thought = useMemo(() => interpret(vibe), [vibe]);
  const fresh = thought.interests.filter((i) => !me.interests.includes(i));
  const myEvents = allEvents(hosted).filter((e) => rsvps[e.id] || e.hostId === "me");

  const saveVibe = () => {
    const text = vibe.trim().slice(0, 280);
    if (!text) return toast("Write a line or two first.");
    const merged = [...me.interests, ...fresh].slice(0, MAX_INTERESTS);
    const intentsNext = thought.intents.length ? [...new Set([...me.intents, ...thought.intents])] : me.intents;
    actions.updateMe({ vibe: text, interests: merged, intents: intentsNext as IntentId[] });
    setDraft(null);
    toast(fresh.length ? `Vibe saved, and ${fresh.length} ${fresh.length === 1 ? "interest" : "interests"} added.` : "Vibe saved.");
  };
  const toggleInterest = (id: string) => {
    const on = me.interests.includes(id);
    if (!on && me.interests.length >= MAX_INTERESTS) return toast(`Up to ${MAX_INTERESTS} interests; remove one first.`);
    actions.updateMe({ interests: on ? me.interests.filter((x) => x !== id) : [...me.interests, id] });
  };
  const toggleIntent = (id: IntentId) =>
    actions.updateMe({ intents: me.intents.includes(id) ? me.intents.filter((x) => x !== id) : [...me.intents, id] });

  const people = (ids: string[]) =>
    ids.filter((id) => viberById[id]).length ? (
      <ul className="flex flex-wrap gap-3">
        {ids
          .filter((id) => viberById[id])
          .map((id) => (
            <li key={id} className="flex items-center gap-2 text-sm font-semibold">
              <Avatar name={viberById[id].name} src={viberById[id].photoUrl} size={34} /> {viberById[id].name}
            </li>
          ))}
      </ul>
    ) : null;

  return (
    <div className="max-w-3xl">
      <PageHeader kicker="Profile" title="Your profile">
        What others see is your first name, general area, vibe and interests. Never your exact location.
      </PageHeader>

      <section className="card flex flex-col items-start gap-4 p-5 sm:flex-row">
        <Avatar name={me.name} size={64} />
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-bold">First name</span>
            <input className="field mt-1" value={me.name} maxLength={30} onChange={(e) => actions.updateMe({ name: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-sm font-bold">Area</span>
            <select className="field mt-1" value={me.area} onChange={(e) => actions.updateMe({ area: e.target.value as AreaId })}>
              {Object.entries(areas).map(([id, a]) => (
                <option key={id} value={id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-bold">I am</span>
            <select className="field mt-1" value={me.status} onChange={(e) => actions.updateMe({ status: e.target.value as "visiting" | "local" })}>
              <option value="visiting">Visiting</option>
              <option value="local">A local</option>
            </select>
          </label>
          {me.status === "visiting" && (
            <>
              <label className="block">
                <span className="text-sm font-bold">From</span>
                <input type="date" className="field mt-1" value={me.dateFrom} onChange={(e) => actions.updateMe({ dateFrom: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-sm font-bold">To</span>
                <input type="date" className="field mt-1" value={me.dateTo} min={me.dateFrom || undefined} onChange={(e) => actions.updateMe({ dateTo: e.target.value })} />
              </label>
            </>
          )}
        </div>
      </section>

      <Section title="Your vibe">
        <div className="card p-5">
          <label htmlFor="vibe" className="font-bold">
            In a line or two, what are you here for?
          </label>
          <textarea id="vibe" className="field mt-2 min-h-24" maxLength={280} value={vibe} onChange={(e) => setDraft(e.target.value)} />
          <div className="mt-3 flex flex-wrap gap-2" aria-live="polite" aria-label="What we read from your vibe">
            {thought.chips.map((c) => (
              <span key={`${c.kind}-${c.id}`} className="chip" title={c.why} style={c.kind === "not" ? { textDecoration: "line-through", opacity: 0.7 } : undefined}>
                {c.kind === "area" ? c.label : hashtag(c.label)}
              </span>
            ))}
            {thought.intents.map((i) => (
              <span key={i} className="chip">
                {intents[i].label}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className="btn" onClick={saveVibe} disabled={draft === null}>
              Save vibe
            </button>
            {fresh.length > 0 && draft !== null && <span className="text-sm text-muted">Saving adds {fresh.length} new {fresh.length === 1 ? "interest" : "interests"}.</span>}
          </div>
          <p className="mt-3 text-xs text-muted">Read by simple rules in your browser. You can always fix the interests below.</p>
        </div>
      </Section>

      <Section title={`Interests (${me.interests.length}/${MAX_INTERESTS})`}>
        <div className="card space-y-4 p-5">
          {categories.map((c) => (
            <fieldset key={c.id}>
              <legend className="mb-2 text-sm font-bold text-ink2">{c.label}</legend>
              <div className="flex flex-wrap gap-2">
                {interests
                  .filter((i) => i.category === c.id)
                  .map((i) => (
                    <button key={i.id} type="button" className="chip" aria-pressed={me.interests.includes(i.id)} onClick={() => toggleInterest(i.id)}>
                      {i.label}
                    </button>
                  ))}
              </div>
            </fieldset>
          ))}
        </div>
      </Section>

      <Section title="Looking for">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(intents) as IntentId[]).map((id) => (
            <button key={id} type="button" className="chip" aria-pressed={me.intents.includes(id)} onClick={() => toggleIntent(id)}>
              {intents[id].label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Privacy and safety">
        <div className="card divide-y divide-line px-5">
          <Toggle label="Show me in Discover" hint="Turn off to browse without being found." checked={me.privacy.discoverable} onChange={(v) => actions.updateMe({ privacy: { ...me.privacy, discoverable: v } })} />
          <Toggle label="Women-only discovery" hint="Only women can find you, and you see only women." checked={me.privacy.womenOnly} onChange={(v) => actions.updateMe({ privacy: { ...me.privacy, womenOnly: v } })} />
          <Toggle label="Show my travel dates" hint="Helps people plan with you; hidden when off." checked={me.privacy.showDates} onChange={(v) => actions.updateMe({ privacy: { ...me.privacy, showDates: v } })} />
        </div>
      </Section>

      <Section title="Your plans">
        {myEvents.length ? (
          <ul className="card divide-y divide-line">
            {myEvents.map((e) => (
              <li key={e.id}>
                <Link href={`/events/${e.id}`} className="flex justify-between gap-3 p-4 font-semibold hover:bg-haze/60">
                  {e.title}
                  <small className="text-muted">{e.hostId === "me" ? "Hosting" : rsvps[e.id] === "going" ? "Going" : "Waitlist"}</small>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>
            No plans yet. <Link href="/events" className="font-bold text-blue">Find an event</Link>
          </Empty>
        )}
      </Section>

      <Section title="Liked">{people(liked) ?? <p className="text-sm text-muted">Vibers you like in Discover show up here.</p>}</Section>
      <Section title="Saved">{people(saved) ?? <p className="text-sm text-muted">Save Vibers to come back to them later.</p>}</Section>
      {blocked.length > 0 && (
        <Section title="Blocked">
          <ul className="space-y-2">
            {blocked.map((id) => (
              <li key={id} className="flex items-center justify-between gap-3">
                <span className="font-semibold">{viberById[id]?.name ?? id}</span>
                <button type="button" className="btn-ghost btn-sm" onClick={() => actions.unblock(id)}>
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Demo">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            actions.reset();
            setDraft(null);
            toast("Demo reset to the start.");
          }}
        >
          Reset the demo
        </button>
        <p className="mt-2 text-xs text-muted">This preview keeps your clicks in this browser only. Nothing is sent anywhere.</p>
      </Section>
    </div>
  );
}
