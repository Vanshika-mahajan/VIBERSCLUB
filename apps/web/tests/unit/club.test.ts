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
});
