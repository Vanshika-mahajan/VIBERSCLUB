import { describe, expect, it } from "vitest";
import { corrections, emptyCorrections, hashtag, interpret } from "@/features/discover/interpret";
import { interestById, interests } from "@/lib/taxonomy";

describe("taxonomy", () => {
  it("has the 62 interests from AI_MATCHING_DESIGN with unique ids", () => {
    expect(interests).toHaveLength(62);
    expect(new Set(interests.map((i) => i.id)).size).toBe(62);
  });
});

describe("interpret", () => {
  it("turns a thought into interests, intent and area", () => {
    const t = interpret("Looking for people to trek Hampta pass this weekend from Old Manali");
    expect(t.interests).toEqual(["multi_day_treks"]);
    expect(t.intents).toContain("activity_buddy");
    expect(t.area).toBe("old_manali");
    expect(t.chips.map((c) => c.label)).toEqual(["Old Manali", "Treks"]);
  });

  it("prefers the longer phrase: 'live music' is not 'jamming'", () => {
    expect(interpret("live music tonight").interests).toEqual(["live_music"]);
  });

  it("reads negation as something you don't want", () => {
    const t = interpret("cafes and sunsets, no clubbing");
    expect(t.interests.sort()).toEqual(["cafe_hopping", "sunrise_and_sunset"]);
    expect(t.excluded).toEqual(["clubbing"]);
    expect(t.chips.find((c) => c.kind === "not")?.label).toBe("Clubbing");
  });

  it("does not read 'but' as negation", () => {
    expect(interpret("no plans but trekking").interests).toEqual(["multi_day_treks"]);
  });

  it("lets the person's edits win", () => {
    let c = corrections.remove(emptyCorrections(), "photography");
    c = corrections.add(c, "stargazing");
    const t = interpret("photography and camping", c);
    expect(t.interests).toEqual(["camping", "stargazing"]);
    expect(t.removed.map((r) => r.id)).toEqual(["photography"]);
    expect(interpret("photography and camping", corrections.restore(c, "photography")).interests).toContain("photography");
  });

  it("is unsure when nothing is recognised", () => {
    const t = interpret("asdf qwerty");
    expect(t.interests).toEqual([]);
    expect(t.confidence).toBe("low");
  });

  it("is sure when every content word is understood", () => {
    expect(interpret("yoga and meditation in Vashisht").confidence).toBe("high");
  });

  it("explains what it read", () => {
    expect(interpret("bonfire nights").explanation[0]).toBe('"bonfire" → #Bonfires');
  });

  it("makes hashtags without spaces", () => {
    expect(hashtag(interestById.sunrise_and_sunset.label)).toBe("#Sunrise");
    expect(hashtag("Veg and vegan")).toBe("#Vegandvegan");
  });
});
