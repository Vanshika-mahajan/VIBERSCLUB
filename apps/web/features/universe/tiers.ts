import type { DiscoveryResult, Match, Thought } from "@/features/discover/types";
import type { Screen } from "./sample-screens";

/**
 * Which orbit each card rides in the home universe. Pure, so it is easy to test.
 * - inner orbit: the strongest people and conversations for the thought (relevance 1)
 * - middle orbit: everything else that shares something with it (relevance 0.6)
 * - outer orbit: the rest of the universe (not in the map)
 * The sphere reads the map as uid → relevance; uids are viber ids, "s:<screen id>" and "t:<interest id>".
 */
export const INNER = { people: 6, screens: 4 } as const;

export const screenUid = (id: string) => "s:" + id;

/** how well a thread or photo fits the thought: share of the thought's interests, plus a little for the same area */
export function scoreScreen(thought: Thought, sc: Screen): number {
  if (thought.excluded.some((x) => sc.interests.includes(x))) return 0;
  const shared = thought.interests.filter((i) => sc.interests.includes(i)).length;
  const sameArea = thought.area !== null && sc.area === thought.area;
  if (!shared && !sameArea) return 0;
  const interest = thought.interests.length ? shared / thought.interests.length : 0;
  return Math.min(1, interest + (sameArea ? 0.25 : 0));
}

export type ScreenMatch = { screen: Screen; score: number };

export type Orbits = {
  /** uid → relevance for the sphere */
  relevance: Map<string, number>;
  inner: { people: Match[]; screens: ScreenMatch[] };
  middle: { people: Match[]; screens: ScreenMatch[] };
};

export function orbitsFor(result: DiscoveryResult, screens: Screen[], hidden: Set<string> = new Set()): Orbits {
  const t = result.thought;
  const people = result.matches.filter((m) => !hidden.has(m.viber.id));
  const ranked = screens
    .map((screen) => ({ screen, score: scoreScreen(t, screen) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.screen.minutesAgo - b.screen.minutesAgo);
  // a conversation only reaches the inner orbit when it covers at least half of the thought
  const innerScreens = ranked.filter((x) => x.score >= 0.5).slice(0, INNER.screens);
  const out: Orbits = {
    relevance: new Map(),
    inner: { people: people.slice(0, INNER.people), screens: innerScreens },
    middle: { people: people.slice(INNER.people), screens: ranked.filter((x) => !innerScreens.includes(x)) },
  };
  out.inner.people.forEach((m) => out.relevance.set(m.viber.id, 1));
  out.middle.people.forEach((m) => out.relevance.set(m.viber.id, 0.6));
  out.inner.screens.forEach((x) => out.relevance.set(screenUid(x.screen.id), 1));
  out.middle.screens.forEach((x) => out.relevance.set(screenUid(x.screen.id), 0.6));
  t.interests.forEach((id) => out.relevance.set("t:" + id, 1));
  t.suggestions.forEach((x) => out.relevance.set("t:" + x.id, 0.35));
  return out;
}

/** "12m", "3h", "2d" */
export function ago(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 60 / 24)}d`;
}
