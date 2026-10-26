"use client";

import { useSyncExternalStore } from "react";
import { likedMe, seedConnections, seedMe, seedMessages, type ChatMessage, type DemoEvent, type Me } from "./data";

/**
 * The pitch demo's state: one small store shared by every page and kept in this browser
 * (localStorage, when allowed). Each action mirrors an API call that a later milestone makes real:
 * swipes and connections (M5), chats (M6), RSVPs and hosting (M7), saved places (M8), profile (M2).
 */
export type Connection = "requested" | "incoming" | "connected";

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

function set(fn: (s: DemoState) => DemoState) {
  load();
  state = fn(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage can be blocked; the demo then lasts until reload */
  }
  listeners.forEach((l) => l());
}

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
    set((s) => ({ ...s, connections: { ...s.connections, [id]: likedMe.includes(id) ? "connected" : "requested" } }));
  },
  acceptConnection(id: string) {
    set((s) => ({ ...s, connections: { ...s.connections, [id]: "connected" } }));
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
      messages: { ...s.messages, [id]: [...(s.messages[id] ?? []), { id: crypto.randomUUID(), from: "me", text: clean, minutesAgo: 0 }] },
    }));
    return true;
  },
  /** block hides both people from each other everywhere: discovery, chats, events */
  block(id: string) {
    set((s) => {
      const c = { ...s.connections };
      delete c[id];
      return { ...s, blocked: add(s.blocked, id), connections: c, liked: drop(s.liked, id), saved: drop(s.saved, id) };
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
    const status = event.goingIds.length < event.capacity ? "going" : "waitlist";
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
    set((s) => ({ ...s, savedPlaces: on ? add(s.savedPlaces, id) : drop(s.savedPlaces, id) }));
    return on;
  },
  host(event: DemoEvent) {
    set((s) => ({ ...s, hosted: [event, ...s.hosted], rsvps: { ...s.rsvps, [event.id]: "going" } }));
  },
  updateMe(patch: Partial<Me>) {
    set((s) => ({ ...s, me: { ...s.me, ...patch } }));
  },
  reset() {
    set(() => initialState());
  },
};

/** for tests */
export function __resetForTests() {
  state = initialState();
  loaded = true;
  listeners.forEach((l) => l());
}
