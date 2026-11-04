import { describe, expect, it } from "vitest";
import { matchThought, widen } from "@/features/journey/match";

const today = new Date(2026, 10, 4);

describe("matching a thought on the first page", () => {
  it("finds Vibers who share what the thought is about", () => {
    const cards = matchThought("hidden cafés in Old Manali", 6, today);
    expect(cards).toHaveLength(6);
    expect(cards[0].shared.length).toBeGreaterThan(0);
    expect(cards.some((c) => c.shared.includes("Cafés"))).toBe(true);
  });

  it("reads broad words generously", () => {
    expect(widen("people who love mountain adventures")).toMatch(/treks/);
    const cards = matchThought("people who love mountain adventures", 6, today);
    expect(cards.every((c) => c.shared.length > 0)).toBe(true);
  });

  it("still brings up people for a thought it can't read", () => {
    const cards = matchThought("asdf qwer", 6, today);
    expect(cards.map((c) => c.name)).toEqual([
      "Aarav",
      "Meera",
      "Zoya",
      "Lena",
      "Rohan",
      "Tara",
    ]);
    expect(cards.every((c) => c.shared.length === 0 && c.reason)).toBe(true);
  });

  it("gives each card a status, stay dates and hashtags", () => {
    for (const c of matchThought("trekking and cafés", 6, today)) {
      expect(c.status).toMatch(/^(Local|Visiting), /);
      expect(c.dates).toMatch(c.local ? /^Around all season$/ : /^Here \d+/);
      expect(c.hashtags.every((h) => h.startsWith("#"))).toBe(true);
      expect(c.initials).toMatch(/^[A-Z]{1,2}$/);
    }
  });

  it("is stable: the same thought gives the same Vibers and dates", () => {
    expect(matchThought("yoga and slow mornings", 6, today)).toEqual(
      matchThought("yoga and slow mornings", 6, today),
    );
  });

  it("never gives a stay that ends before it starts", () => {
    for (const c of matchThought("asdf", 6, today).filter((x) => !x.local)) {
      const [from, to] = c.dates.match(/\d+/g)!.map(Number);
      expect(to === undefined || to > from || c.dates.includes(" – ")).toBe(
        true,
      );
    }
  });
});
