import { sampleVibers } from "@/features/discover/sample-data";
import type { Viber } from "@/features/discover/types";
import { events, type DemoEvent } from "./data";

export const vibers: Viber[] = sampleVibers;
export const viberById: Record<string, Viber> = Object.fromEntries(sampleVibers.map((v) => [v.id, v]));
export const firstName = (v: Viber) => v.name.split(" ")[0];

export const allEvents = (hosted: DemoEvent[]): DemoEvent[] => [...hosted, ...events];
export const findEvent = (id: string, hosted: DemoEvent[] = []) => allEvents(hosted).find((e) => e.id === id);

export function eventDate(e: DemoEvent, today: Date): Date {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + e.dayOffset);
  const [h, m] = e.time.split(":").map(Number);
  d.setHours(h, m);
  return d;
}

export function formatWhen(e: DemoEvent, today: Date): string {
  const day = e.dayOffset === 0 ? "Today" : e.dayOffset === 1 ? "Tomorrow" : eventDate(e, today).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return `${day} · ${e.time}`;
}

export const price = (e: DemoEvent) => (e.priceInr === 0 ? "Free" : `₹${e.priceInr.toLocaleString("en-IN")}`);
