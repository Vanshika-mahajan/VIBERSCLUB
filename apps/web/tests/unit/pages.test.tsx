import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatsScreen } from "@/features/chats/ChatsScreen";
import { EventScreen } from "@/features/events/EventScreen";
import { EventsScreen } from "@/features/events/EventsScreen";
import { HostForm, validate } from "@/features/events/HostForm";
import { ExploreScreen } from "@/features/explore/ExploreScreen";
import { ProfileScreen } from "@/features/profile/ProfileScreen";
import { Toaster } from "@/components/ui";
import { getState } from "@/lib/demo/store";

const push = vi.fn();
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => search,
  usePathname: () => "/",
}));

describe("Events", () => {
  it("filters by free and paid", async () => {
    const user = userEvent.setup();
    render(<EventsScreen />);
    const count = () => Number(screen.getByText(/^\d+ events?$/).textContent!.split(" ")[0]);
    const all = count();
    await user.click(screen.getByRole("button", { name: "Free" }));
    const free = count();
    await user.click(screen.getByRole("button", { name: "Paid" }));
    expect(free + count()).toBe(all);
    expect(screen.queryByText("Free", { selector: "span" })).not.toBeInTheDocument();
  });

  it("joins an event with seats, and waitlists a full one", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<EventScreen id="sunrise-jogini" />);
    await user.click(screen.getByRole("button", { name: "Join" }));
    expect(screen.getByText("You're going.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Leave event" }));
    expect(getState().rsvps["sunrise-jogini"]).toBeUndefined();
    unmount();

    render(<EventScreen id="hampta-pass" />);
    expect(screen.getByText(/host collects payment directly/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Join waitlist" }));
    expect(screen.getByText("You're on the waitlist.")).toBeInTheDocument();
  });

  it("shows not found for an unknown event", () => {
    render(<EventScreen id="nope" />);
    expect(screen.getByRole("heading", { name: "Event not found" })).toBeInTheDocument();
  });

  it("validates the host form, then publishes", async () => {
    expect(validate({ title: "ab", meetingPoint: "", time: "", capacity: 1, priceInr: -1, interests: [] })).toEqual({
      title: expect.any(String),
      meetingPoint: expect.any(String),
      time: expect.any(String),
      capacity: expect.any(String),
      price: expect.any(String),
      interests: expect.any(String),
    });
    const user = userEvent.setup();
    render(<HostForm />);
    await user.click(screen.getByRole("button", { name: "Publish event" }));
    expect(screen.getByText(/at least 4 characters/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/^Title/), "Sunset at Lamadugh");
    await user.type(screen.getByLabelText(/^Meeting point/), "Slow Pine café");
    await user.click(screen.getByRole("button", { name: "Day hikes" }));
    await user.click(screen.getByRole("button", { name: "Publish event" }));
    const hosted = getState().hosted[0];
    expect(hosted).toMatchObject({ title: "Sunset at Lamadugh", hostId: "me", priceInr: 0, interests: ["day_hikes"] });
    expect(getState().rsvps[hosted.id]).toBe("going");
    expect(push).toHaveBeenCalledWith(`/events/${hosted.id}`);
  });
});

describe("Explore", () => {
  it("filters by area and saves a place", async () => {
    const user = userEvent.setup();
    render(<ExploreScreen />);
    await user.click(screen.getByRole("button", { name: "Vashisht" }));
    expect(screen.getByText("3 places")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save Jogini falls" }));
    expect(getState().savedPlaces).toEqual(["jogini"]);
    expect(screen.getByRole("button", { name: "Unsave Jogini falls" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("Chats", () => {
  it("accepts a request, which moves them to chats", async () => {
    search = new URLSearchParams();
    const user = userEvent.setup();
    render(<ChatsScreen />);
    expect(screen.getByRole("tab", { name: "Chats (2)" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Requests (2)" }));
    const row = screen.getByText("Pooja Rana").closest("li")!;
    await user.click(within(row).getByRole("button", { name: "Accept" }));
    expect(screen.getByRole("tab", { name: "Chats (3)" })).toBeInTheDocument();
  });

  it("sends a message in a mutual chat, and blocks with confirmation", async () => {
    search = new URLSearchParams("with=tashi");
    const user = userEvent.setup();
    render(<ChatsScreen />);
    await user.type(screen.getByLabelText(/Message Tashi/), "Count me in");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByText("Count me in")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Block" }));
    await user.click(screen.getByRole("button", { name: "Confirm block" }));
    expect(getState().blocked).toContain("tashi");
    expect(push).toHaveBeenCalledWith("/chats");
  });

  it("does not open a chat with someone you are not connected to", () => {
    search = new URLSearchParams("with=pooja-rana");
    render(<ChatsScreen />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chats" })).toBeInTheDocument();
  });
});

describe("Profile", () => {
  it("reads the vibe live and saving adds the interests it found", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ProfileScreen />
        <Toaster />
      </>,
    );
    const box = screen.getByLabelText(/what are you here for/);
    await user.clear(box);
    await user.type(box, "Yoga and hot springs");
    expect(screen.getByText("#Yoga")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save vibe" }));
    expect(getState().me.vibe).toBe("Yoga and hot springs");
    expect(getState().me.interests).toEqual(expect.arrayContaining(["yoga", "hot_springs", "multi_day_treks"]));
    expect(await screen.findByText(/Vibe saved, and 2 interests added/)).toBeInTheDocument();
  });

  it("toggles privacy settings", async () => {
    const user = userEvent.setup();
    render(<ProfileScreen />);
    await user.click(screen.getByRole("switch", { name: /Women-only discovery/ }));
    expect(getState().me.privacy.womenOnly).toBe(true);
  });
});
