import { beforeEach, describe, expect, it } from "vitest";
import { clubTemplates, samplePosts, viberTemplates } from "@/lib/demo/club";
import { places } from "@/lib/demo/data";
import { viberById } from "@/lib/demo/people";
import { __resetForTests, actions, getState } from "@/lib/demo/store";
import { areas } from "@/lib/taxonomy";

beforeEach(() => __resetForTests());

describe("club sample content", () => {
  it("only points at sample Vibers, places and areas that exist", () => {
    for (const p of samplePosts) {
      expect(viberById[p.authorId], p.id).toBeDefined();
      if (p.placeId)
        expect(
          places.some((x) => x.id === p.placeId),
          p.id,
        ).toBe(true);
      if (p.area) expect(areas[p.area]).toBeDefined();
    }
    for (const t of [...clubTemplates, ...viberTemplates]) {
      if (t.by !== "club") expect(viberById[t.by], t.id).toBeDefined();
      t.days
        .flatMap((d) => d.stops)
        .forEach((s) =>
          expect(
            places.some((x) => x.id === s.placeId),
            `${t.id} → ${s.placeId}`,
          ).toBe(true),
        );
    }
  });
});

describe("posts", () => {
  it("keeps a trimmed post and ignores an empty one", () => {
    expect(actions.post("   ")).toBeNull();
    const p = actions.post("  Bonfire tonight?  ", "kasol-river")!;
    expect(p.text).toBe("Bonfire tonight?");
    expect(getState().posts[0]).toMatchObject({
      authorId: "me",
      placeId: "kasol-river",
      sample: false,
    });
    actions.deletePost(p.id);
    expect(getState().posts).toEqual([]);
  });
});

describe("itineraries", () => {
  it("creates empty days, clamped to 1–14", () => {
    expect(actions.createItinerary("", 0).days).toHaveLength(1);
    expect(actions.createItinerary("Long", 40).days).toHaveLength(14);
    expect(getState().itineraries[1].title).toBe("My Manali trip");
  });

  it("copies a template as mine without changing the template", () => {
    const t = clubTemplates[0];
    const it = actions.createItinerary("", 0, t);
    expect(it).toMatchObject({ by: "me", sample: false, title: t.title });
    expect(it.days).toHaveLength(t.days.length);
    actions.removeStop(it.id, it.days[0].id, it.days[0].stops[0].id);
    expect(getState().itineraries[0].days[0].stops).toHaveLength(
      t.days[0].stops.length - 1,
    );
    expect(t.by).toBe("club");
    expect(t.days[0].stops).toHaveLength(3);
  });

  it("keeps stops in time order and adds days", () => {
    const it = actions.createItinerary("Trip", 1);
    const day = it.days[0].id;
    actions.addStop(it.id, day, "jogini", "14:00");
    actions.addStop(it.id, day, "hadimba", "08:30");
    expect(
      getState().itineraries[0].days[0].stops.map((s) => s.placeId),
    ).toEqual(["hadimba", "jogini"]);
    actions.addDay(it.id);
    expect(getState().itineraries[0].days).toHaveLength(2);
    actions.deleteItinerary(it.id);
    expect(getState().itineraries).toEqual([]);
  });

  it("starts private and edits the plan's details", () => {
    const it = actions.createItinerary("Trip", 2);
    expect(it.visibility).toBe("private");
    expect(actions.createItinerary("", 0, clubTemplates[0]).visibility).toBe("private");
    expect(clubTemplates[0].visibility).toBe("public");
    actions.updateItinerary(it.id, { visibility: "public", travelStyle: "Slow travel", startDate: "2026-11-20", notes: "Pack warm" });
    expect(getState().itineraries.find((x) => x.id === it.id)).toMatchObject({
      visibility: "public",
      travelStyle: "Slow travel",
      startDate: "2026-11-20",
      notes: "Pack warm",
    });
  });

  it("drops places where they land, and moves stops between days", () => {
    const it = actions.createItinerary("Trip", 2);
    const [d1, d2] = it.days.map((d) => d.id);
    actions.insertStop(it.id, d1, "jogini");
    actions.insertStop(it.id, d1, "hadimba");
    actions.insertStop(it.id, d1, "solang", 0);
    const day1 = () => getState().itineraries[0].days[0].stops;
    expect(day1().map((x) => x.placeId)).toEqual(["solang", "jogini", "hadimba"]);
    // a stop after another is an hour and a half later
    expect(day1()[2].time).toBe("11:30");
    actions.updateStop(it.id, d1, day1()[0].id, { activity: "Paragliding", time: "09:00" });
    expect(day1()[0]).toMatchObject({ activity: "Paragliding", time: "09:00" });
    // reorder within the day, then move one to day 2
    actions.moveStop(it.id, day1()[0].id, d1, 2);
    expect(day1().map((x) => x.placeId)).toEqual(["jogini", "hadimba", "solang"]);
    actions.moveStop(it.id, day1()[1].id, d2, 0);
    expect(day1().map((x) => x.placeId)).toEqual(["jogini", "solang"]);
    expect(getState().itineraries[0].days[1].stops.map((x) => x.placeId)).toEqual(["hadimba"]);
    // remove a day with what was on it, but never the last one
    actions.removeDay(it.id, d2);
    expect(getState().itineraries[0].days).toHaveLength(1);
    actions.removeDay(it.id, d1);
    expect(getState().itineraries[0].days).toHaveLength(1);
  });
});
