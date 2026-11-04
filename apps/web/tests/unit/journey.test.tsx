import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { JourneyScreen } from "@/features/journey/JourneyScreen";

const stage = () => document.querySelector("[data-phase]")!;

describe("JourneyScreen, scene one", () => {
  it("asks the question with a labelled field and the brand", () => {
    render(<JourneyScreen />);
    expect(screen.getByRole("heading", { level: 1, name: "Every journey begins with a thought." })).toBeInTheDocument();
    const field = screen.getByLabelText("What’s on your mind?");
    expect(field).toHaveAttribute("placeholder", "Tell us what kind of experience you're looking for…");
    expect(screen.getByRole("link", { name: "Enter the app" })).toHaveAttribute("href", "/universe");
    expect(stage()).toHaveAttribute("data-phase", "idle");
  });

  it("an empty thought gives a hint and stays on the door", async () => {
    const user = userEvent.setup();
    render(<JourneyScreen />);
    await user.click(screen.getByRole("button", { name: /find your vibe/ }));
    expect(screen.getByText(/Write a few words first/)).toBeInTheDocument();
    expect(screen.getByLabelText("What’s on your mind?")).toHaveAttribute("aria-invalid", "true");
    expect(stage()).toHaveAttribute("data-phase", "idle");
  });

  it("Enter sends the thought, keeps it visible and locks the field", async () => {
    const user = userEvent.setup();
    render(<JourneyScreen />);
    const field = screen.getByLabelText("What’s on your mind?");
    await user.type(field, "  Hidden cafés in   Old Manali {Enter}");
    expect(stage()).toHaveAttribute("data-phase", "opening");
    expect(field).toHaveValue("  Hidden cafés in   Old Manali ");
    expect(field).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: /find your vibe/ })).toBeDisabled();
  });
});
