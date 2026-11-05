import type { DemoState } from "./store";
import { likedMe } from "./data";
import { allEvents, firstName, viberById } from "./people";
import { groupStatus, eventWindow } from "./groups";

/**
 * What the bell on Home holds, worked out from what already happened: matches (you both liked each
 * other), connection requests, events you joined that are close, their group chats, and new events
 * that fit your interests. The API sends these as real notifications later (M7).
 */
export type Note = {
  id: string;
  kind: "match" | "request" | "event" | "group" | "suggest";
  text: string;
  href: string;
  /** a person or an event, for the picture */
  viberId?: string;
  eventId?: string;
};

export function notesFor(s: DemoState, now = Date.now()): Note[] {
  const out: Note[] = [];
  const events = allEvents(s.hosted);

  for (const id of s.liked) {
    const v = viberById[id];
    if (!v || !likedMe.includes(id) || s.blocked.includes(id)) continue;
    const connected = s.connections[id] === "connected";
    out.push({
      id: `match:${id}`,
      kind: "match",
      viberId: id,
      text: connected ? `You and ${firstName(v)} are connected. Say hello.` : `It's a match: you and ${firstName(v)} like each other.`,
      href: connected ? `/chats?with=${id}` : `/vibers/${id}`,
    });
  }
  for (const [id, c] of Object.entries(s.connections)) {
    const v = viberById[id];
    if (c !== "incoming" || !v || s.blocked.includes(id)) continue;
    out.push({ id: `request:${id}`, kind: "request", viberId: id, text: `${firstName(v)} wants to connect.`, href: "/inbox?tab=chats" });
  }
  for (const [eventId, status] of Object.entries(s.rsvps)) {
    const e = events.find((x) => x.id === eventId);
    if (!e) continue;
    const g = groupStatus(e, s.joinedAt[eventId], now);
    if (g === "gone") continue;
    // calendar days from today to the event's day
    const day = eventWindow(e, s.joinedAt[eventId] ?? now).start;
    const today = new Date(now);
    const days = Math.round((new Date(day).setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / 86_400_000);
    const when = g === "ended" ? "has ended" : days <= 0 ? "is today" : days === 1 ? "is tomorrow" : `is in ${days} days`;
    out.push({
      id: `event:${eventId}:${g}`,
      kind: "event",
      eventId,
      text: status === "waitlist" ? `You're on the waitlist for ${e.title}.` : `${e.title} ${when}.`,
      href: `/events/${eventId}`,
    });
    if (status === "going" && g === "open")
      out.push({ id: `group:${eventId}`, kind: "group", eventId, text: `You're in the group chat for ${e.title}.`, href: `/chats?group=${eventId}` });
  }
  const mine = new Set(s.me.interests);
  for (const e of events) {
    if (s.rsvps[e.id] || s.blocked.includes(e.hostId) || !e.interests.some((i) => mine.has(i))) continue;
    out.push({ id: `suggest:${e.id}`, kind: "suggest", eventId: e.id, text: `New for your vibe: ${e.title}.`, href: `/events/${e.id}` });
  }
  return out;
}

export const unseen = (notes: Note[], seen: string[]) => notes.filter((n) => !seen.includes(n.id));
