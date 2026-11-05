import type { DemoEvent } from "./data";

/**
 * Event group chats. Joining an event puts you in its group with everyone going; the group closes
 * (read only) when the event ends, and is gone from your chats at the end of the next day.
 * Sample events are set "N days from today", so their day counts from the day you joined.
 */
export type GroupStatus = "open" | "ended" | "gone";

/** when the event starts and ends, counting its day from `joinedAt` (ms) */
export function eventWindow(e: DemoEvent, joinedAt: number): { start: Date; end: Date } {
  const start = new Date(joinedAt);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + e.dayOffset);
  const [h, m] = e.time.split(":").map(Number);
  start.setHours(h, m);
  return { start, end: new Date(start.getTime() + e.durationHours * 3_600_000) };
}

export function groupStatus(e: DemoEvent, joinedAt: number | undefined, now: number): GroupStatus {
  const { end } = eventWindow(e, joinedAt ?? now);
  if (now < end.getTime()) return "open";
  const nextDayEnds = new Date(end);
  nextDayEnds.setHours(0, 0, 0, 0);
  nextDayEnds.setDate(nextDayEnds.getDate() + 2);
  return now < nextDayEnds.getTime() ? "ended" : "gone";
}
