import { areas, interestById, interests, intents, type AreaId, type IntentId } from "@/lib/taxonomy";
import type { Chip, Corrections, Suggestion, Thought } from "./types";

/**
 * Rules-first reading of a thought: synonyms → taxonomy ids, with negation, intents and area.
 * This is the same first step the API will run (AI_MATCHING_DESIGN section 4); the LLM is only
 * consulted there when the rules are unsure. Pure and deterministic, so it is easy to test.
 */

export const hashtag = (label: string) => "#" + label.replace(/[^\p{L}\p{N}]+/gu, "");

const NEGATORS = ["no", "not", "without", "avoid", "hate", "skip", "nothing", "never", "dont", "don't", "except"];
const STOP = new Set(
  "a an the and or but to of in on at for with from by is am are be i im i'm me my we our you some any this that these those just want wanna looking look find someone people anyone who like love into really very so this weekend week today tomorrow tonight next month here there manali also too it its".split(
    " ",
  ),
);

type Phrase = { re: RegExp; words: number; apply: (at: number) => void };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// whole words only; a plain plural ("sunsets", "beaches") counts as the word
const wordRe = (phrase: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${escape(phrase)}(?:e?s)?(?=$|[^\\p{L}\\p{N}])`, "giu");

function normalise(text: string): string {
  return text.toLowerCase().normalize("NFKC").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

/** index of the first character of each word, so a match position can be turned into a word index */
function wordStarts(text: string): number[] {
  const starts: number[] = [];
  const re = /[\p{L}\p{N}']+/gu;
  for (let m = re.exec(text); m; m = re.exec(text)) starts.push(m.index);
  return starts;
}

function isNegated(text: string, at: number): boolean {
  const before = text.slice(0, at).split(/[^\p{L}\p{N}']+/u).filter(Boolean).slice(-3);
  // a negator within the three words before, and no "but" in between ("no plans but trekking")
  const n = before.findLastIndex((w) => NEGATORS.includes(w));
  return n >= 0 && !before.slice(n + 1).includes("but");
}

export function emptyCorrections(): Corrections {
  return { added: [], removed: [] };
}

export function interpret(raw: string, corrections: Corrections = emptyCorrections()): Thought {
  const text = normalise(raw);
  const found = new Map<string, { word: string; negated: boolean }>();
  const foundIntents = new Map<IntentId, string>();
  let area: { id: AreaId; word: string } | null = null;
  const covered = new Set<number>();
  const starts = wordStarts(text);
  const cover = (at: number, phrase: string) => {
    const first = starts.findIndex((s) => s >= at);
    const n = phrase.split(/\s+/).length;
    for (let k = 0; k < n && first >= 0; k++) covered.add(first + k);
  };

  const phrases: Phrase[] = [];
  for (const it of interests) {
    for (const syn of [it.label.toLowerCase(), ...it.synonyms]) {
      phrases.push({
        re: wordRe(syn),
        words: syn.split(" ").length,
        apply: (at) => {
          const negated = isNegated(text, at);
          const prev = found.get(it.id);
          if (!prev || (prev.negated && !negated)) found.set(it.id, { word: syn, negated });
          cover(at, syn);
        },
      });
    }
  }
  for (const [id, a] of Object.entries(areas) as [AreaId, (typeof areas)[AreaId]][]) {
    for (const syn of a.synonyms) {
      phrases.push({ re: wordRe(syn), words: syn.split(" ").length, apply: (at) => { area ??= { id, word: syn }; cover(at, syn); } });
    }
  }
  for (const [id, x] of Object.entries(intents) as [IntentId, (typeof intents)[IntentId]][]) {
    for (const syn of x.synonyms) {
      phrases.push({ re: wordRe(syn), words: syn.split(" ").length, apply: (at) => { if (!foundIntents.has(id)) foundIntents.set(id, syn); cover(at, syn); } });
    }
  }
  // longer phrases first, so "live music" wins over "music"
  phrases.sort((a, b) => b.words - a.words);
  const taken: [number, number][] = [];
  for (const p of phrases) {
    p.re.lastIndex = 0;
    for (let m = p.re.exec(text); m; m = p.re.exec(text)) {
      const at = m.index + m[1].length;
      const end = m.index + m[0].length;
      if (taken.some(([s, e]) => at < e && end > s)) continue;
      taken.push([at, end]);
      p.apply(at);
    }
  }

  // corrections: the person's edits always win
  const removed: Suggestion[] = [];
  for (const id of corrections.removed) {
    if (found.has(id) && interestById[id]) removed.push({ id, label: interestById[id].label, why: "You removed this" });
    found.delete(id);
  }
  const chosen = [...found].filter(([, f]) => !f.negated).map(([id]) => id);
  const excluded = [...found].filter(([, f]) => f.negated).map(([id]) => id);
  const added = corrections.added.filter((id) => interestById[id] && !chosen.includes(id));

  const chips: Chip[] = [];
  const a = area as { id: AreaId; word: string } | null;
  if (a) chips.push({ kind: "area", id: a.id, label: areas[a.id].label, why: `You mentioned "${a.word}"`, source: "text" });
  for (const id of chosen) {
    chips.push({ kind: "interest", id, label: interestById[id].label, why: `You said "${found.get(id)!.word}"`, source: "text" });
  }
  for (const id of added) chips.push({ kind: "interest", id, label: interestById[id].label, why: "You added this", source: "added" });
  for (const id of excluded) {
    chips.push({ kind: "not", id, label: interestById[id].label, why: `You said you don't want "${found.get(id)!.word}"` });
  }

  const content = starts.map((s, n) => ({ n, w: text.slice(s).match(/^[\p{L}\p{N}']+/u)![0] })).filter(({ w }) => !STOP.has(w) && !NEGATORS.includes(w));
  const unknown = content.filter(({ n }) => !covered.has(n)).map(({ w }) => w);
  const interestsAll = [...chosen, ...added];
  const confidence: Thought["confidence"] =
    interestsAll.length === 0 && !a ? "low" : unknown.length <= 2 ? "high" : unknown.length <= 5 ? "medium" : "low";

  const explanation: string[] = [];
  for (const id of chosen) explanation.push(`"${found.get(id)!.word}" → ${hashtag(interestById[id].label)}`);
  for (const id of added) explanation.push(`You added ${hashtag(interestById[id].label)}`);
  for (const id of excluded) explanation.push(`"${found.get(id)!.word}" is something you don't want, so it counts against a match`);
  if (a) explanation.push(`"${a.word}" → ${areas[a.id].label}`);
  for (const [id, w] of foundIntents) explanation.push(`"${w}" → looking for: ${intents[id].label.toLowerCase()}`);
  if (unknown.length) explanation.push(`Not used: ${unknown.slice(0, 6).map((w) => `"${w}"`).join(", ")}`);

  return {
    text: raw,
    interests: interestsAll,
    excluded,
    intents: [...foundIntents.keys()],
    area: a?.id ?? null,
    chips,
    suggestions: [],
    removed,
    confidence,
    explanation,
  };
}

export const corrections = {
  add: (c: Corrections, id: string): Corrections => ({ added: [...new Set([...c.added, id])], removed: c.removed.filter((x) => x !== id) }),
  remove: (c: Corrections, id: string): Corrections => ({ added: c.added.filter((x) => x !== id), removed: [...new Set([...c.removed, id])] }),
  restore: (c: Corrections, id: string): Corrections => ({ ...c, removed: c.removed.filter((x) => x !== id) }),
};
