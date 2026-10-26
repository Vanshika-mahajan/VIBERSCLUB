import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createSampleAdapter } from "@/features/discover/adapter";
import { interpret } from "@/features/discover/interpret";
import { discover } from "@/features/discover/rank";
import { sampleVibers } from "@/features/discover/sample-data";
import { roomFor, sampleRooms } from "@/features/universe/sample-rooms";
import { sampleScreens } from "@/features/universe/sample-screens";
import { INNER, ago, orbitsFor, scoreScreen, screenUid } from "@/features/universe/tiers";
import { UniverseScreen } from "@/features/universe/UniverseScreen";

// jsdom has no canvas; the universe is covered by the browser tests
const relevance: (Map<string, number> | null)[] = [];
const pulled: string[] = [];
vi.mock("@/features/discover/sphere", () => ({
  initials: (n: string) => n.slice(0, 1),
  Sphere: class {
    load() {}
    start() {}
    dispose() {}
    setReduced() {}
    setPaused() {}
    setRelevance(m: Map<string, number> | null) {
      relevance.push(m);
    }
    pull(uids: string[]) {
      pulled.push(...uids);
      return 0;
    }
    unpull() {}
    setBackdrop() {}
  },
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
globalThis.ResizeObserver ??= class {
  observe() {}
  disconnect() {}
  unobserve() {}
} as unknown as typeof ResizeObserver;

const orbits = (text: string) => orbitsFor(discover(interpret(text), sampleVibers, 40), sampleScreens);

describe("sample screens", () => {
  it("are written by sample Vibers", () => {
    const ids = new Set(sampleVibers.map((v) => v.id));
    for (const s of sampleScreens) expect(ids, s.title).toContain(s.authorId);
  });
});

describe("sample rooms", () => {
  it("are written by sample Vibers", () => {
    const ids = new Set(sampleVibers.map((v) => v.id));
    for (const r of sampleRooms) for (const id of [...r.memberIds, ...r.messages.map((m) => m.authorId)]) expect(ids, r.title).toContain(id);
  });

  it("opens the room that shares the most with the thought", () => {
    expect(roomFor(interpret("people who love photography"))?.id).toBe("lens");
    expect(roomFor(interpret("trek Hampta and camp"))?.id).toBe("trail");
    expect(roomFor(interpret("good wifi for a workation"))?.id).toBe("work");
    expect(roomFor(interpret("Old Manali"))).toBeNull();
  });
});

describe("orbits", () => {
  it("scores a screen by the share of the thought it covers", () => {
    const t = interpret("photography and sunrise");
    const golden = sampleScreens.find((s) => s.title.startsWith("Golden hour"))!;
    const wifi = sampleScreens.find((s) => s.title.startsWith("Laptop-friendly"))!;
    expect(scoreScreen(t, golden)).toBe(1);
    expect(scoreScreen(t, wifi)).toBe(0);
    expect(scoreScreen(interpret("photography, no sunrise"), golden)).toBe(0);
  });

  it("puts the strongest people and conversations in the inner orbit, the rest in the middle", () => {
    const o = orbits("I want to explore Manali with people who love photography");
    expect(o.inner.people).toHaveLength(INNER.people);
    expect(o.inner.screens.length).toBeGreaterThan(0);
    expect(o.inner.screens.length).toBeLessThanOrEqual(INNER.screens);
    o.inner.people.forEach((m) => expect(o.relevance.get(m.viber.id)).toBe(1));
    o.middle.people.forEach((m) => expect(o.relevance.get(m.viber.id)).toBe(0.6));
    o.inner.screens.forEach((x) => expect(x.screen.interests).toContain("photography"));
    expect(o.relevance.get("t:photography")).toBe(1);
  });

  it("narrows as the thought grows", () => {
    const one = orbits("photography");
    const more = orbits("photography and sunrise hikes");
    const golden = screenUid(sampleScreens.find((s) => s.title.startsWith("Golden hour"))!.id);
    expect(more.relevance.get(golden)).toBe(1);
    // a thread that only shares photography fits "photography" fully, but only partly once sunrise and hikes join
    const film = sampleScreens.find((s) => s.title.startsWith("Film or digital"))!;
    expect(scoreScreen(interpret("photography"), film)).toBe(1);
    expect(more.relevance.get(screenUid(film.id))).toBe(0.6);
    expect(more.inner.screens.length).toBeLessThanOrEqual(one.inner.screens.length);
  });

  it("leaves out people you passed", () => {
    const first = orbits("photography").inner.people[0].viber.id;
    const o = orbitsFor(discover(interpret("photography"), sampleVibers, 40), sampleScreens, new Set([first]));
    expect(o.relevance.has(first)).toBe(false);
  });

  it("formats how long ago", () => {
    expect([ago(0), ago(45), ago(130), ago(60 * 50)]).toEqual(["1m", "45m", "2h", "2d"]);
  });
});

describe("UniverseScreen", () => {
  it("rearranges the universe word by word and lists the inner orbit", async () => {
    const user = userEvent.setup();
    render(<UniverseScreen adapter={createSampleAdapter()} />);
    await act(async () => {});
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Say a thought/);
    await user.type(screen.getByRole("textbox", { name: "What's on your mind?" }), "people who love photography");
    expect(await screen.findByText(/in the inner orbit/, {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "What I understood" })).toHaveTextContent("#Photography");
    expect(relevance.at(-1)?.get("t:photography")).toBe(1);

    await user.click(screen.getByRole("button", { name: "See as a list" }));
    const list = screen.getByRole("region", { name: "The universe as a list" });
    expect(list).toHaveTextContent(/Inner orbit: 6 Vibers/);
  });

  it("pulls the inner orbit into the core and opens a room that was already talking", async () => {
    const user = userEvent.setup();
    render(<UniverseScreen adapter={createSampleAdapter()} />);
    await act(async () => {});
    await user.type(screen.getByRole("textbox", { name: "What's on your mind?" }), "people who love photography");
    await screen.findAllByRole("button", { name: "Step into Manali through a lens" }, { timeout: 2000 });
    await user.keyboard("{Enter}");
    const room = await screen.findByRole("region", { name: "Manali through a lens" });
    expect(pulled.length).toBeGreaterThanOrEqual(6);
    expect(within(room).getByRole("list", { name: "Conversation" }).children.length).toBeGreaterThan(3);
    expect(within(room).getByText("Active threads")).toBeInTheDocument();

    await user.type(within(room).getByRole("textbox", { name: /Say something/ }), "Can I join the Lamadugh walk?{Enter}");
    expect(within(room).getByText("Can I join the Lamadugh walk?")).toBeInTheDocument();

    await user.click(within(room).getByRole("button", { name: "Trail talk: Hampta and beyond" }));
    expect(await screen.findByRole("region", { name: "Trail talk: Hampta and beyond" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back to the universe" }));
    await waitFor(() => expect(screen.queryByRole("region", { name: /Trail talk/ })).not.toBeInTheDocument());
    expect(screen.getByRole("textbox", { name: "What's on your mind?" })).toHaveValue("people who love photography");
  });

  it("offers the rest of the site from the menu", async () => {
    const user = userEvent.setup();
    render(<UniverseScreen adapter={createSampleAdapter()} />);
    await user.click(screen.getByRole("button", { name: "Menu" }));
    const nav = screen.getByRole("navigation", { name: "Main" });
    for (const name of ["Today", "Discover", "Events", "Chats", "Profile"]) expect(nav).toContainElement(screen.getByRole("link", { name }));
  });
});
