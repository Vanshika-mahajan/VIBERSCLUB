import { describe, expect, it } from "vitest";
import { events, likedMe, places, roadmaps, seedConnections, seedMe } from "@/lib/demo/data";
import { viberById } from "@/lib/demo/people";
import { actions, getState } from "@/lib/demo/store";
import { areas, interestById } from "@/lib/taxonomy";

describe("sample data", () => {
  it("only points at sample Vibers, interests and areas that exist", () => {
    for (const e of events) {
      expect(viberById[e.hostId], e.id).toBeDefined();
      e.goingIds.forEach((g) => expect(viberById[g], `${e.id} → ${g}`).toBeDefined());
      e.interests.forEach((i) => expect(interestById[i], `${e.id} → ${i}`).toBeDefined());
      expect(areas[e.area]).toBeDefined();
      expect(e.goingIds.length).toBeLessThanOrEqual(e.capacity);
    }
    places.forEach((p) => p.interests.forEach((i) => expect(interestById[i], `${p.id} → ${i}`).toBeDefined()));
    roadmaps.forEach((r) => r.stops.forEach((s) => expect(places.some((p) => p.id === s.placeId), s.placeId).toBe(true)));
    [...likedMe, ...Object.keys(seedConnections)].forEach((id) => expect(viberById[id], id).toBeDefined());
    seedMe.interests.forEach((i) => expect(interestById[i]).toBeDefined());
  });

  it("has a full event to show the waitlist, and both free and paid events", () => {
    expect(events.some((e) => e.goingIds.length >= e.capacity)).toBe(true);
    expect(events.some((e) => e.priceInr === 0)).toBe(true);
    expect(events.some((e) => e.priceInr > 0)).toBe(true);
  });
});

describe("demo store", () => {
  it("a like is mutual only when they already liked you", () => {
    expect(actions.like(likedMe[0]).mutual).toBe(true);
    expect(actions.like("jiya-kohli").mutual).toBe(false);
    expect(getState().liked).toEqual([likedMe[0], "jiya-kohli"]);
  });

  it("passing undoes a like", () => {
    actions.like("jiya-kohli");
    actions.pass("jiya-kohli");
    expect(getState().liked).not.toContain("jiya-kohli");
    expect(getState().passed).toContain("jiya-kohli");
  });

  it("messages only go to connected Vibers, trimmed and capped", () => {
    expect(actions.send("jiya-kohli", "hi")).toBe(false);
    expect(actions.send("pooja-rana", "hi")).toBe(false); // incoming request, not yet accepted
    expect(actions.send("tashi", "   ")).toBe(false);
    expect(actions.send("tashi", "  see you at the bridge  ")).toBe(true);
    expect(getState().messages.tashi.at(-1)?.text).toBe("see you at the bridge");
    actions.send("tashi", "x".repeat(3000));
    expect(getState().messages.tashi.at(-1)?.text).toHaveLength(2000);
  });

  it("accepting a request opens the chat; declining removes it", () => {
    actions.acceptConnection("pooja-rana");
    expect(actions.send("pooja-rana", "hello")).toBe(true);
    actions.declineConnection("kabir-anand");
    expect(getState().connections["kabir-anand"]).toBeUndefined();
  });

  it("a connection request to someone who liked you connects in the demo", () => {
    actions.requestConnection(likedMe[0]);
    expect(getState().connections[likedMe[0]]).toBe("connected");
    actions.requestConnection("jiya-kohli");
    expect(getState().connections["jiya-kohli"]).toBe("requested");
  });

  it("blocking removes the connection, like and save, and stops messages", () => {
    actions.like("tashi");
    actions.toggleSave("tashi");
    actions.block("tashi");
    const s = getState();
    expect(s.blocked).toContain("tashi");
    expect(s.connections.tashi).toBeUndefined();
    expect(s.liked).not.toContain("tashi");
    expect(s.saved).not.toContain("tashi");
    expect(actions.send("tashi", "hi")).toBe(false);
  });

  it("RSVP joins when there is a seat and waitlists when full; leaving clears it", () => {
    const open = events.find((e) => e.goingIds.length < e.capacity)!;
    const full = events.find((e) => e.goingIds.length >= e.capacity)!;
    expect(actions.rsvp(open)).toBe("going");
    expect(actions.rsvp(full)).toBe("waitlist");
    actions.leave(open.id);
    expect(getState().rsvps).toEqual({ [full.id]: "waitlist" });
  });

  it("persists to localStorage and reset starts over", () => {
    actions.toggleSavePlace("jogini");
    expect(JSON.parse(localStorage.getItem("vibers.demo.v1")!).savedPlaces).toEqual(["jogini"]);
    actions.reset();
    expect(getState().savedPlaces).toEqual([]);
    expect(getState().connections).toEqual(seedConnections);
  });
});
