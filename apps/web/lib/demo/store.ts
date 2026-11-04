"use client";

import { useSyncExternalStore } from "react";
import type { Itinerary, Post, Stop } from "./club";
import {
  likedMe,
  seedConnections,
  seedMe,
  seedMessages,
  type ChatMessage,
  type DemoEvent,
  type Me,
} from "./data";

/**
 * The pitch demo's state: one small store shared by every page and kept in this browser
 * (localStorage, when allowed). Each action mirrors an API call that a later milestone makes real:
 * swipes and connections (M5), chats (M6), RSVPs and hosting (M7), saved places (M8), profile (M2).
 */
export type Connection = "requested" | "incoming" | "connected";

/** a public photo album on my profile, like a highlight: photos are shrunk data URLs in the demo */
export type AlbumPhoto = { id: string; url: string };
export type Album = { id: string; title: string; coverId: string; photos: AlbumPhoto[]; createdAt: number };

export type DemoState = {
  version: 1;
  me: Me;
  liked: string[];
  saved: string[];
  passed: string[];
  blocked: string[];
  reported: string[];
  connections: Record<string, Connection>;
  messages: Record<string, ChatMessage[]>;
  rsvps: Record<string, "going" | "waitlist">;
  savedPlaces: string[];
  hosted: DemoEvent[];
  /** the club home: what I posted (its keywords find matching Vibers) and my itineraries */
  posts: Post[];
  itineraries: Itinerary[];
  /** public photo albums on my profile (M2 moves the photos to Storage) */
  albums: Album[];
};

export const initialState = (): DemoState => ({
  version: 1,
  me: seedMe,
  liked: [],
  saved: [],
  passed: [],
  blocked: [],
  reported: [],
  connections: { ...seedConnections },
  messages: structuredClone(seedMessages),
  rsvps: {},
  savedPlaces: [],
  hosted: [],
  posts: [],
  itineraries: [],
  albums: [],
});

const KEY = "vibers.demo.v1";
let state: DemoState = initialState();
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed.version === 1) state = { ...initialState(), ...parsed };
    }
  } catch {
    /* blocked or corrupt storage: start fresh */
  }
}

let kept = true;
function set(fn: (s: DemoState) => DemoState) {
  load();
  state = fn(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    kept = true;
  } catch {
    /* storage can be blocked or full (photos are large); the demo then lasts until reload */
    kept = false;
  }
  listeners.forEach((l) => l());
}

/** whether the last change was saved in this browser (false when storage is blocked or full) */
export const lastChangeKept = () => kept;

export function getState(): DemoState {
  load();
  return state;
}

const server = initialState();

/** Subscribe to one slice. `select` must return part of the state as is (not a new object or array),
 * or React re-renders forever; derive new values with useMemo in the component. */
export function useDemo<T>(select: (s: DemoState) => T): T {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => select(getState()),
    () => select(server),
  );
}

const add = (xs: string[], x: string) => (xs.includes(x) ? xs : [...xs, x]);
const drop = (xs: string[], x: string) => xs.filter((y) => y !== x);

export const actions = {
  /** returns whether the like is mutual (sample Vibers in `likedMe` already liked you) */
  like(id: string): { mutual: boolean } {
    const mutual = likedMe.includes(id);
    set((s) => ({ ...s, liked: add(s.liked, id), passed: drop(s.passed, id) }));
    return { mutual };
  },
  pass(id: string) {
    set((s) => ({ ...s, passed: add(s.passed, id), liked: drop(s.liked, id) }));
  },
  toggleSave(id: string): boolean {
    const on = !getState().saved.includes(id);
    set((s) => ({ ...s, saved: on ? add(s.saved, id) : drop(s.saved, id) }));
    return on;
  },
  /** a connection request; only allowed after a mutual like (the API enforces this in M5) */
  requestConnection(id: string) {
    // sample Vibers who liked you accept straight away in the demo
    set((s) => ({
      ...s,
      connections: {
        ...s.connections,
        [id]: likedMe.includes(id) ? "connected" : "requested",
      },
    }));
  },
  acceptConnection(id: string) {
    set((s) => ({
      ...s,
      connections: { ...s.connections, [id]: "connected" },
    }));
  },
  declineConnection(id: string) {
    set((s) => {
      const c = { ...s.connections };
      delete c[id];
      return { ...s, connections: c };
    });
  },
  /** messages only between connected Vibers (mutual-only messaging) */
  send(id: string, text: string): boolean {
    const clean = text.trim().slice(0, 2000);
    if (!clean || getState().connections[id] !== "connected") return false;
    set((s) => ({
      ...s,
      messages: {
        ...s.messages,
        [id]: [
          ...(s.messages[id] ?? []),
          { id: crypto.randomUUID(), from: "me", text: clean, minutesAgo: 0 },
        ],
      },
    }));
    return true;
  },
  /** block hides both people from each other everywhere: discovery, chats, events */
  block(id: string) {
    set((s) => {
      const c = { ...s.connections };
      delete c[id];
      return {
        ...s,
        blocked: add(s.blocked, id),
        connections: c,
        liked: drop(s.liked, id),
        saved: drop(s.saved, id),
      };
    });
  },
  unblock(id: string) {
    set((s) => ({ ...s, blocked: drop(s.blocked, id) }));
  },
  report(id: string) {
    set((s) => ({ ...s, reported: add(s.reported, id) }));
  },
  /** join if there is a seat, otherwise join the waitlist */
  rsvp(event: DemoEvent): "going" | "waitlist" {
    const status =
      event.goingIds.length < event.capacity ? "going" : "waitlist";
    set((s) => ({ ...s, rsvps: { ...s.rsvps, [event.id]: status } }));
    return status;
  },
  leave(eventId: string) {
    set((s) => {
      const r = { ...s.rsvps };
      delete r[eventId];
      return { ...s, rsvps: r };
    });
  },
  toggleSavePlace(id: string): boolean {
    const on = !getState().savedPlaces.includes(id);
    set((s) => ({
      ...s,
      savedPlaces: on ? add(s.savedPlaces, id) : drop(s.savedPlaces, id),
    }));
    return on;
  },
  host(event: DemoEvent) {
    set((s) => ({
      ...s,
      hosted: [event, ...s.hosted],
      rsvps: { ...s.rsvps, [event.id]: "going" },
    }));
  },
  /** a thread (text), or a photo with an optional caption */
  post(text: string, placeId?: string, photoUrl?: string): Post | null {
    const clean = text.trim().slice(0, 1000);
    if (!clean && !photoUrl) return null;
    const p: Post = {
      id: crypto.randomUUID(),
      authorId: "me",
      text: clean,
      placeId,
      photoUrl,
      minutesAgo: 0,
      sample: false,
    };
    set((s) => ({ ...s, posts: [p, ...s.posts] }));
    return p;
  },
  deletePost(id: string) {
    set((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== id) }));
  },
  /** a new itinerary of empty days, or a copy of a template (Vibers Club's or another Viber's) */
  createItinerary(title: string, days: number, from?: Itinerary): Itinerary {
    const id = crypto.randomUUID();
    const it: Itinerary = from
      ? {
          ...structuredClone(from),
          id,
          by: "me",
          sample: false,
          // a copy is mine and starts private, whoever shared the original
          visibility: "private",
          title: title || from.title,
          days: from.days.map((d, i) => ({
            id: `${id}-d${i}`,
            stops: d.stops.map((st) => ({ ...st, id: crypto.randomUUID() })),
          })),
        }
      : {
          id,
          title: title.trim() || "My Manali trip",
          summary: "",
          by: "me",
          sample: false,
          visibility: "private",
          days: Array.from(
            { length: Math.min(Math.max(days, 1), 14) },
            (_, i) => ({ id: `${id}-d${i}`, stops: [] }),
          ),
        };
    set((s) => ({ ...s, itineraries: [it, ...s.itineraries] }));
    return it;
  },
  deleteItinerary(id: string) {
    set((s) => ({
      ...s,
      itineraries: s.itineraries.filter((i) => i.id !== id),
    }));
  },
  addDay(itineraryId: string) {
    set((s) => ({
      ...s,
      itineraries: s.itineraries.map((it) =>
        it.id === itineraryId && it.days.length < 14
          ? {
              ...it,
              days: [...it.days, { id: crypto.randomUUID(), stops: [] }],
            }
          : it,
      ),
    }));
  },
  addStop(
    itineraryId: string,
    dayId: string,
    placeId: string,
    time: string,
    note = "",
  ) {
    set((s) => ({
      ...s,
      itineraries: s.itineraries.map((it) =>
        it.id !== itineraryId
          ? it
          : {
              ...it,
              days: it.days.map((d) =>
                d.id !== dayId
                  ? d
                  : {
                      ...d,
                      stops: [
                        ...d.stops,
                        { id: crypto.randomUUID(), placeId, time, note },
                      ].sort((a, b) => a.time.localeCompare(b.time)),
                    },
              ),
            },
      ),
    }));
  },
  /** title, description, dates, style, notes or visibility */
  updateItinerary(
    id: string,
    patch: Partial<Pick<Itinerary, "title" | "summary" | "startDate" | "travelStyle" | "notes" | "visibility">>,
  ) {
    set((s) => ({ ...s, itineraries: s.itineraries.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  },
  updateStop(itineraryId: string, dayId: string, stopId: string, patch: Partial<Omit<Stop, "id">>) {
    set((s) => ({
      ...s,
      itineraries: s.itineraries.map((it) =>
        it.id !== itineraryId
          ? it
          : {
              ...it,
              days: it.days.map((d) =>
                d.id !== dayId ? d : { ...d, stops: d.stops.map((x) => (x.id === stopId ? { ...x, ...patch } : x)) },
              ),
            },
      ),
    }));
  },
  /** a place dropped on a day: added at `index` (the end when left out), not re-sorted by time */
  insertStop(itineraryId: string, dayId: string, placeId: string, index?: number) {
    set((s) => ({
      ...s,
      itineraries: s.itineraries.map((it) =>
        it.id !== itineraryId
          ? it
          : {
              ...it,
              days: it.days.map((d) => {
                if (d.id !== dayId) return d;
                const stops = [...d.stops];
                const at = index === undefined ? stops.length : Math.max(0, Math.min(index, stops.length));
                const before = stops[at - 1]?.time;
                // an hour and a half after the stop before it, or ten in the morning
                const time = before
                  ? (() => {
                      const [h, m] = before.split(":").map(Number);
                      const t = Math.min(h * 60 + m + 90, 23 * 60);
                      return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
                    })()
                  : "10:00";
                stops.splice(at, 0, { id: crypto.randomUUID(), placeId, time, note: "" });
                return { ...d, stops };
              }),
            },
      ),
    }));
  },
  /** reorder within a day, or move to another day, at `index` there */
  moveStop(itineraryId: string, stopId: string, toDayId: string, index: number) {
    set((s) => ({
      ...s,
      itineraries: s.itineraries.map((it) => {
        if (it.id !== itineraryId) return it;
        const stop = it.days.flatMap((d) => d.stops).find((x) => x.id === stopId);
        if (!stop) return it;
        const days = it.days.map((d) => ({ ...d, stops: d.stops.filter((x) => x.id !== stopId) }));
        return {
          ...it,
          days: days.map((d) => {
            if (d.id !== toDayId) return d;
            const stops = [...d.stops];
            stops.splice(Math.max(0, Math.min(index, stops.length)), 0, stop);
            return { ...d, stops };
          }),
        };
      }),
    }));
  },
  /** a day and what was on it; the last day stays */
  removeDay(itineraryId: string, dayId: string) {
    set((s) => ({
      ...s,
      itineraries: s.itineraries.map((it) =>
        it.id === itineraryId && it.days.length > 1 ? { ...it, days: it.days.filter((d) => d.id !== dayId) } : it,
      ),
    }));
  },
  removeStop(itineraryId: string, dayId: string, stopId: string) {
    set((s) => ({
      ...s,
      itineraries: s.itineraries.map((it) =>
        it.id !== itineraryId
          ? it
          : {
              ...it,
              days: it.days.map((d) =>
                d.id !== dayId
                  ? d
                  : { ...d, stops: d.stops.filter((x) => x.id !== stopId) },
              ),
            },
      ),
    }));
  },
  updateMe(patch: Partial<Me>) {
    set((s) => ({ ...s, me: { ...s.me, ...patch } }));
  },
  reset() {
    set(() => initialState());
  },
  /** albums: highlights on my profile, public to other Vibers */
  createAlbum(title: string, photos: string[]): Album | null {
    const clean = title.trim().slice(0, 40);
    if (!clean || !photos.length) return null;
    const list = photos.map((url) => ({ id: crypto.randomUUID(), url }));
    const album: Album = { id: crypto.randomUUID(), title: clean, coverId: list[0].id, photos: list, createdAt: Date.now() };
    set((s) => ({ ...s, albums: [...s.albums, album] }));
    return album;
  },
  updateAlbum(id: string, patch: { title?: string; coverId?: string; photos?: AlbumPhoto[] }) {
    set((s) => ({
      ...s,
      albums: s.albums.map((a) => {
        if (a.id !== id) return a;
        const next = { ...a, ...patch, title: (patch.title ?? a.title).trim().slice(0, 40) || a.title };
        // the cover must be one of the photos; the first one stands in when it was removed
        if (!next.photos.some((p) => p.id === next.coverId)) next.coverId = next.photos[0]?.id ?? "";
        return next;
      }),
    }));
  },
  addAlbumPhotos(id: string, urls: string[]) {
    const add = urls.map((url) => ({ id: crypto.randomUUID(), url }));
    set((s) => ({ ...s, albums: s.albums.map((a) => (a.id === id ? { ...a, photos: [...a.photos, ...add] } : a)) }));
  },
  deleteAlbum(id: string) {
    set((s) => ({ ...s, albums: s.albums.filter((a) => a.id !== id) }));
  },
};

/** for tests */
export function __resetForTests() {
  state = initialState();
  loaded = true;
  listeners.forEach((l) => l());
}
