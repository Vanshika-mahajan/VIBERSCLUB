import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HealthStatus } from "@/components/HealthStatus";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("HealthStatus", () => {
  it("shows loading until the API answers", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    render(<HealthStatus />);
    expect(screen.getByRole("status")).toHaveTextContent("Checking the API");
  });

  it("shows API OK when /healthz is ok", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json(200, { status: "ok", database: "ok" }),
    );
    render(<HealthStatus />);
    expect(await screen.findByText("API OK")).toBeInTheDocument();
    expect(fetch.mock.calls[0][0]).toBe("http://localhost:8000/healthz");
  });

  it("shows the API's problem detail when the database is down", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      json(503, { code: "database_unavailable", detail: "The database is not reachable." }),
    );
    render(<HealthStatus />);
    expect(await screen.findByRole("alert")).toHaveTextContent("The database is not reachable.");
  });

  it("explains a network failure and recovers on retry", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(json(200, { status: "ok", database: "ok" }));
    render(<HealthStatus />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Can't reach the API");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("API OK")).toBeInTheDocument();
  });
});
