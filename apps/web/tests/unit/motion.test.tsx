import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Reveal } from "@/components/motion/Reveal";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { VantaBackground } from "@/components/motion/VantaBackground";

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: query.includes(": reduce") ? reduce : !reduce,
        media: query,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
      }) as unknown as MediaQueryList,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("motion building blocks with reduced motion", () => {
  it("VantaBackground shows its content and never loads three.js", async () => {
    mockReducedMotion(true);
    const { container } = render(
      <VantaBackground>
        <h1>Hello Manali</h1>
      </VantaBackground>,
    );
    expect(screen.getByRole("heading", { name: "Hello Manali" })).toBeVisible();
    await new Promise((r) => setTimeout(r, 50));
    expect(container.querySelector("canvas")).toBeNull();
    expect((container.firstChild as HTMLElement).dataset.vanta).toBeUndefined();
  });

  it("Reveal leaves its content fully visible", () => {
    mockReducedMotion(true);
    render(
      <Reveal stagger={0.1}>
        <p>One</p>
        <p>Two</p>
      </Reveal>,
    );
    for (const text of ["One", "Two"]) expect(screen.getByText(text).style.opacity).toBe("");
  });

  it("SmoothScroll renders children without Lenis", () => {
    mockReducedMotion(true);
    render(
      <SmoothScroll>
        <p>Page</p>
      </SmoothScroll>,
    );
    expect(screen.getByText("Page")).toBeInTheDocument();
    expect(document.documentElement.classList.contains("lenis")).toBe(false);
  });
});
