import { describe, expect, it } from "vitest";
import { interpret } from "@/features/discover/interpret";
import { discover, diversify, scoreViber } from "@/features/discover/rank";
import { sampleVibers } from "@/features/discover/sample-data";
import type { Viber } from "@/features/discover/types";
import { interestById } from "@/lib/taxonomy";

const v = (over: Partial<Viber>): Viber => ({
  id: over.name ?? "x",
  name: "X",
  role: "",
  area: "old_manali",
  status: "visiting",
  interests: [],
  intents: [],
  bio: "",
  sample: true,
  ...over,
});
const flat = () => 1;

describe("sample roster", () => {
  it("only uses interests that exist in the taxonomy", () => {
    for (const p of sampleVibers) for (const i of p.interests) expect(interestById[i], `${p.name}: ${i}`).toBeDefined();
  });
});

describe("scoreViber", () => {
  it("leaves out people who share nothing with the thought", () => {
    expect(scoreViber(interpret("yoga"), v({ interests: ["clubbing"] }), flat)).toBeNull();
  });

  it("ranks a fuller overlap higher and explains it from visible fields", () => {
    const t = interpret("camping and stargazing");
    const both = scoreViber(t, v({ name: "A", interests: ["camping", "stargazing"] }), flat)!;
    const one = scoreViber(t, v({ name: "B", interests: ["camping"] }), flat)!;
    expect(both.score).toBeGreaterThan(one.score);
    expect(both.reasons[0]).toBe("You both love camping and stargazing.");
  });

  it("counts a matching intent and a host for someone who wants to join", () => {
    const t = interpret("looking for people to go camping");
    const host = scoreViber(t, v({ interests: ["camping"], intents: ["host_events"] }), flat)!;
    const none = scoreViber(t, v({ interests: ["camping"] }), flat)!;
    expect(host.score).toBeGreaterThan(none.score);
    expect(host.reasons).toContain("They host small get-togethers.");
  });

  it("halves the score when someone is into what the thought rules out", () => {
    const t = interpret("live music, no clubbing");
    const clubber = scoreViber(t, v({ interests: ["live_music", "clubbing"] }), flat)!;
    const other = scoreViber(t, v({ interests: ["live_music"] }), flat)!;
    expect(clubber.score).toBeCloseTo(other.score / 2);
  });

  it("matches on area alone and says so", () => {
    const m = scoreViber(interpret("anyone in Naggar"), v({ area: "naggar", status: "local" }), flat)!;
    expect(m.reasons).toEqual(["They live around Naggar."]);
    expect(m.shared).toEqual(["Naggar"]);
  });
});

describe("diversify", () => {
  it("keeps one main interest from filling the whole screen while others exist", () => {
    const ms = [...Array(6)].map((_, n) => ({ viber: v({ name: `T${n}`, interests: ["multi_day_treks"] }), shared: [], reasons: [], score: 1 - n / 100 }));
    ms.push({ viber: v({ name: "C", interests: ["camping"] }), shared: [], reasons: [], score: 0.1 });
    const top = diversify(ms, 5).slice(0, 5).map((m) => m.viber.name);
    expect(top).toContain("C");
    expect(top.filter((n) => n.startsWith("T"))).toHaveLength(4);
  });
});

describe("discover", () => {
  it("finds trekkers for a trekking thought and suggests what they also share", () => {
    const r = discover(interpret("trek Hampta this weekend"), sampleVibers);
    expect(r.matches.length).toBeGreaterThan(5);
    expect(r.matches.slice(0, 7).every((m) => m.viber.interests.includes("multi_day_treks"))).toBe(true);
    expect(r.thought.suggestions.map((s) => s.id)).toContain("camping");
    expect(r.pathways[0].title.startsWith("Treks / ")).toBe(true);
  });

  it("returns nothing, not everyone, when the thought is not understood", () => {
    expect(discover(interpret("asdf"), sampleVibers).matches).toEqual([]);
  });
});
