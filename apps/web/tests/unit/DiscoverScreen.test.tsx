import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createSampleAdapter } from "@/features/discover/adapter";
import { DiscoverScreen, formationSlots } from "@/features/discover/DiscoverScreen";
import { actions, getState } from "@/lib/demo/store";

// jsdom has no canvas; the sphere is covered by the browser tests
vi.mock("@/features/discover/sphere", () => ({
  initials: (n: string) => n.slice(0, 1),
  Sphere: class {
    constructor(
      _cv: unknown,
      private o: { onFormed?: (f: { uid: string; x: number; y: number; w: number; h: number; rot: number; slot: number }[]) => void },
    ) {}
    // formed cards are placed by the canvas each frame; here, place them once
    extract(uids: string[]) {
      queueMicrotask(() => this.o.onFormed?.(uids.map((uid, i) => ({ uid, x: i * 100, y: 100, w: 80, h: 100, rot: 0, slot: i }))));
    }
    load() {}
    start() {}
    dispose() {}
    setReduced() {}
    setPaused() {}
    setRelevance() {}
    setFormation() {}
  },
}));
globalThis.ResizeObserver ??= class {
  observe() {}
  disconnect() {}
  unobserve() {}
} as unknown as typeof ResizeObserver;

async function think(text: string) {
  const user = userEvent.setup();
  render(<DiscoverScreen adapter={createSampleAdapter()} />);
  await act(async () => {}); // universe loads
  await user.type(screen.getByRole("textbox", { name: "What's on your mind?" }), text + "{Enter}");
  await screen.findByText(/who share this thought/, {}, { timeout: 2000 });
  await act(async () => {}); // cards placed
  return user;
}

describe("DiscoverScreen", () => {
  it("starts with an invitation and example thoughts", () => {
    render(<DiscoverScreen adapter={createSampleAdapter()} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Somewhere, someone\s*is thinking like you\./);
    expect(screen.getByRole("group", { name: "Try one of these thoughts" })).toBeInTheDocument();
  });

  it("reads a thought into chips and brings matching Vibers forward", async () => {
    await think("trek Hampta this weekend");
    const chips = screen.getByRole("list", { name: "What I understood" });
    expect(within(chips).getByText("#Treks")).toBeInTheDocument();
    const formed = within(screen.getByRole("list", { name: /Vibers who share your thought/ })).getAllByRole("button");
    expect(formed.length).toBeGreaterThan(3);
    expect(formed[0]).toHaveAccessibleName(/Shares Treks/);
  });

  it("lets the person remove a chip, and the results follow", async () => {
    const user = await think("camping and photography");
    await user.click(screen.getByRole("button", { name: "Remove #Photography" }));
    const chips = screen.getByRole("list", { name: "What I understood" });
    await waitFor(() => expect(within(chips).queryByText("#Photography")).not.toBeInTheDocument());
    expect(within(chips).queryByText("+ #Photography")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bring back #Photography" })).toBeInTheDocument();
  });

  it("explains why when asked", async () => {
    const user = await think("bonfire nights");
    await user.click(screen.getByRole("button", { name: "Why these?" }));
    expect(screen.getByText('"bonfire" → #Bonfires')).toBeInTheDocument();
  });

  it("opens a profile with reasons and Like, Pass, Save; Escape closes it", async () => {
    const user = await think("trek Hampta");
    const first = within(screen.getByRole("list", { name: /Vibers who share your thought/ })).getAllByRole("button")[0];
    await user.click(first);
    const panel = screen.getByRole("dialog", { name: /profile/ });
    expect(within(panel).getByText("Why they're here")).toBeInTheDocument();
    expect(within(panel).getByText("Sample")).toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: "Like" }));
    expect(within(panel).getByRole("button", { name: "Liked" })).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByText(/If they like you back, you can connect/)).toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: "Save" }));
    expect(within(panel).getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: /profile/ })).not.toBeInTheDocument();
    expect(first).toHaveFocus();
  });

  it("passing someone removes them from the results", async () => {
    const user = await think("trek Hampta");
    const list = () => screen.getByRole("list", { name: /Vibers who share your thought/ });
    const first = within(list()).getAllByRole("button")[0];
    const name = first.getAttribute("aria-label")!.split(",")[0];
    await user.click(first);
    await user.click(screen.getByRole("button", { name: "Pass" }));
    expect(within(list()).queryByRole("button", { name: new RegExp(`^${name},`) })).not.toBeInTheDocument();
  });

  it("says plainly when it can't read a thought", async () => {
    const user = userEvent.setup();
    render(<DiscoverScreen adapter={createSampleAdapter()} />);
    await user.type(screen.getByRole("textbox"), "asdfgh{Enter}");
    expect(await screen.findByText(/couldn't match that/)).toBeInTheDocument();
  });

  it("offers the same people as a plain list", async () => {
    const user = userEvent.setup();
    render(<DiscoverScreen adapter={createSampleAdapter()} />);
    await act(async () => {});
    await user.click(screen.getByRole("button", { name: "List view" }));
    const list = screen.getByRole("region", { name: "Discover as a list" });
    expect(within(list).getByText("40 Vibers")).toBeInTheDocument();
  });
});

describe("formationSlots", () => {
  it("lays people in a 3-column grid on phones and an arch on wide screens", () => {
    const phone = formationSlots(6, 412, 800);
    expect(new Set(phone.map((p) => Math.round(p.y))).size).toBe(2);
    const wide = formationSlots(7, 1200, 800);
    expect(wide[0].x).toBe(600); // slot 0 is the centre
    expect(wide[0].y).toBeLessThan(wide[6].y); // and the highest point of the arch
  });

  it("a mutual like offers a connection request, which opens a chat", async () => {
    const user = userEvent.setup();
    render(<DiscoverScreen adapter={createSampleAdapter()} />);
    await act(async () => {});
    await user.click(screen.getByRole("button", { name: "List view" }));
    await user.click(within(screen.getByRole("region", { name: "Discover as a list" })).getByRole("button", { name: /Meera Kapoor/ }));
    const panel = screen.getByRole("dialog", { name: /profile/ });
    await user.click(within(panel).getByRole("button", { name: "Like" }));
    expect(await screen.findByText(/You and Meera like each other/)).toBeInTheDocument();
    await user.click(within(panel).getByRole("button", { name: /send a connection request/ }));
    expect(getState().connections["meera-kapoor"]).toBe("connected");
    expect(within(panel).getByRole("link", { name: "Open chat" })).toHaveAttribute("href", "/chats?with=meera-kapoor");
  });

  it("leaves out people you blocked, and offers your own vibe as a thought", async () => {
    actions.block("tashi");
    render(<DiscoverScreen adapter={createSampleAdapter()} />);
    await act(async () => {});
    expect(screen.getByRole("button", { name: "Use my vibe" })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "List view" }));
    expect(within(screen.getByRole("region", { name: "Discover as a list" })).getByText("39 Vibers")).toBeInTheDocument();
  });
});
