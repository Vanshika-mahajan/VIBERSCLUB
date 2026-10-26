import { areas, interestById, intents, type IntentId } from "@/lib/taxonomy";
import type { DiscoveryResult, Match, Pathway, Suggestion, Thought, Viber } from "./types";

/**
 * Rules-only ranking for a thought (AI_MATCHING_DESIGN section 7, the parts a thought can use).
 * Who may appear at all is decided before this runs (eligibility). Scores only order results and are
 * never shown. Dates, semantic similarity and freshness join on the API side (M5, M10).
 */
export const WEIGHTS = { interest: 0.58, intent: 0.25, area: 0.17, excludedPenalty: 0.5 } as const;
/** within one screen, at most this share of people may have the same main interest */
export const DIVERSITY_SHARE = 0.4;

const lower = (id: string) => interestById[id].label.toLowerCase();
const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

/** rarer interests count more (inverse document frequency over the pool) */
function idf(pool: Viber[]): (id: string) => number {
  const df = new Map<string, number>();
  pool.forEach((v) => v.interests.forEach((i) => df.set(i, (df.get(i) ?? 0) + 1)));
  return (id) => Math.log(1 + pool.length / (1 + (df.get(id) ?? 0)));
}

function intentFit(want: IntentId[], v: Viber): { value: number; reason?: string } {
  if (!want.length) return { value: 0 };
  const same = want.find((w) => v.intents.includes(w));
  if (same) return { value: 1, reason: `They're also looking for ${intents[same].label.toLowerCase()}.` };
  if (want.includes("meet_locals") && v.status === "local") return { value: 1, reason: "They live here and like meeting visitors." };
  if ((want.includes("join_events") || want.includes("activity_buddy")) && v.intents.includes("host_events"))
    return { value: 1, reason: "They host small get-togethers." };
  if (want.includes("just_exploring") || v.intents.includes("just_exploring")) return { value: 0.5 };
  return { value: 0 };
}

export function scoreViber(thought: Thought, v: Viber, weight: (id: string) => number): Match | null {
  const shared = thought.interests.filter((i) => v.interests.includes(i));
  const sameArea = thought.area !== null && v.area === thought.area;
  if (!shared.length && !sameArea) return null;

  const union = new Set([...thought.interests, ...shared]);
  const interest = union.size ? shared.reduce((s, i) => s + weight(i), 0) / [...union].reduce((s, i) => s + weight(i), 0) : 0;
  const intent = intentFit(thought.intents, v);
  // weights are normalised over the signals the thought actually gives
  const parts: [number, number][] = [];
  if (thought.interests.length) parts.push([WEIGHTS.interest, interest]);
  if (thought.intents.length) parts.push([WEIGHTS.intent, intent.value]);
  if (thought.area) parts.push([WEIGHTS.area, sameArea ? 1 : 0]);
  const total = parts.reduce((s, [w]) => s + w, 0);
  let score = parts.reduce((s, [w, x]) => s + w * x, 0) / total;
  if (thought.excluded.some((x) => v.interests.includes(x))) score *= WEIGHTS.excludedPenalty;

  const reasons: string[] = [];
  if (shared.length) reasons.push(`You both love ${list(shared.map(lower))}.`);
  if (intent.reason) reasons.push(intent.reason);
  if (sameArea) reasons.push(`${v.status === "local" ? "They live" : "They're staying"} around ${areas[v.area].label}.`);

  const labels = [...(sameArea ? [areas[v.area].label] : []), ...shared.map((i) => interestById[i].label)];
  return { viber: v, shared: labels.slice(0, 3), reasons, score };
}

/** best first, with a diversity rule so one screen is never a single kind of person */
export function diversify(matches: Match[], screen: number): Match[] {
  const sorted = [...matches].sort((a, b) => b.score - a.score || a.viber.name.localeCompare(b.viber.name));
  const cap = Math.max(1, Math.ceil(screen * DIVERSITY_SHARE));
  const head: Match[] = [];
  const rest: Match[] = [];
  const count = new Map<string, number>();
  for (const m of sorted) {
    const main = m.viber.interests[0];
    if (head.length < screen && (count.get(main) ?? 0) < cap) {
      head.push(m);
      count.set(main, (count.get(main) ?? 0) + 1);
    } else rest.push(m);
  }
  // fill any empty seats with the best remaining people
  while (head.length < screen && rest.length) head.push(rest.shift()!);
  return [...head, ...rest];
}

/** what the strongest matches often share that the thought doesn't say yet */
function coInterests(thought: Thought, matches: Match[]): [string, Viber[]][] {
  const by = new Map<string, Viber[]>();
  // never suggest what the thought already has, rules out, or what the person just removed
  const skip = new Set([...thought.interests, ...thought.excluded, ...thought.removed.map((r) => r.id)]);
  matches.slice(0, 12).forEach((m) =>
    m.viber.interests.forEach((i) => {
      if (!skip.has(i)) by.set(i, [...(by.get(i) ?? []), m.viber]);
    }),
  );
  return [...by].filter(([, vs]) => vs.length >= 2).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
}

export function discover(thought: Thought, pool: Viber[], screen = 7): DiscoveryResult {
  const weight = idf(pool);
  const scored = pool.map((v) => scoreViber(thought, v, weight)).filter((m): m is Match => m !== null);
  const matches = diversify(scored, screen);
  const co = coInterests(thought, matches);
  const suggestions: Suggestion[] = co
    .slice(0, 3)
    .map(([id, vs]) => ({ id, label: interestById[id].label, why: `${vs.length} of the people who match are also into ${lower(id)}` }));
  const main = thought.interests[0];
  const pathways: Pathway[] = main
    ? co.slice(0, 4).map(([id, vs]) => ({ add: id, title: `${interestById[main].label} / ${interestById[id].label}`, count: vs.length, members: vs }))
    : [];
  return { thought: { ...thought, suggestions }, matches, pathways };
}
