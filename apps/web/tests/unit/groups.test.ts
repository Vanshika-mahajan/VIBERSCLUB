import { beforeEach, describe, expect, it } from "vitest";
import { events } from "@/lib/demo/data";
import { eventWindow, groupStatus } from "@/lib/demo/groups";
import { notesFor, unseen } from "@/lib/demo/notifications";
import { __resetForTests, actions, getState } from "@/lib/demo/store";

beforeEach(() => __resetForTests());

const jogini = events.find((e) => e.id === "sunrise-jogini")!; // tomorrow, 05:30
const HOUR = 3_600_000;

describe("event group chats", () => {
  it("open until the event ends, read only the day after, then gone", () => {
    const joined = new Date("2026-11-04T20:00:00").getTime();
    const { start, end } = eventWindow(jogini, joined);
    expect(start.toISOString()).toBe(new Date(`2026-11-05T${jogini.time}:00`).toISOString());
    expect(end.getTime() - start.getTime()).toBe(jogini.durationHours * HOUR);
    expect(groupStatus(jogini, joined, end.getTime() - 1)).toBe("open");
    expect(groupStatus(jogini, joined, end.getTime() + 1)).toBe("ended");
    expect(groupStatus(jogini, joined, new Date("2026-11-06T23:00:00").getTime())).toBe("ended");
    expect(groupStatus(jogini, joined, new Date("2026-11-07T00:01:00").getTime())).toBe("gone");
  });

  it("only people going can write, and only while it is open", () => {
    expect(actions.sendGroup(jogini, "Hi all")).toBe(false); // not joined
    actions.rsvp(jogini);
    expect(actions.sendGroup(jogini, "Hi all")).toBe(true);
    expect(getState().groupMessages[jogini.id]).toHaveLength(1);
    const after = getState().joinedAt[jogini.id] + 3 * 24 * HOUR;
    expect(actions.sendGroup(jogini, "Too late", after)).toBe(false);
    actions.deleteGroup(jogini.id);
    expect(getState().hiddenGroups).toContain(jogini.id);
  });
});

describe("notifications", () => {
  it("tell you about requests, matches, your events and their chats, then count as seen", () => {
    actions.like("meera-kapoor"); // she already liked you
    actions.rsvp(jogini);
    const notes = notesFor(getState());
    const kinds = notes.map((n) => n.kind);
    expect(kinds).toEqual(expect.arrayContaining(["match", "request", "event", "group"]));
    expect(notes.find((n) => n.kind === "event")!.text).toMatch(/tomorrow/);
    expect(unseen(notes, getState().seenNotes)).toHaveLength(notes.length);
    actions.markNotesSeen(notes.map((n) => n.id));
    expect(unseen(notesFor(getState()), getState().seenNotes)).toHaveLength(0);
  });

  it("leaves out people you blocked", () => {
    actions.block("pooja-rana");
    expect(notesFor(getState()).some((n) => n.viberId === "pooja-rana")).toBe(false);
  });
});
