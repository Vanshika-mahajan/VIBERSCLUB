import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useIntro } from "@/features/intro/useIntro";
import { cameraAt, DOOR, framingFor } from "@/features/intro/world/params";

describe("the entry sequence", () => {
  it("starts once: a second click while it runs is refused", () => {
    const { result } = renderHook(() => useIntro());
    let first = false,
      second = true;
    act(() => {
      first = result.current.start();
      second = result.current.start();
    });
    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(result.current.phase).toBe("door");
  });

  it("only moves forward", () => {
    const { result } = renderHook(() => useIntro());
    act(() => {
      result.current.start();
      result.current.advance("world");
      result.current.advance("entering");
    });
    expect(result.current.phase).toBe("world");
    act(() => result.current.reset());
    expect(result.current.phase).toBe("idle");
  });
});

describe("the camera", () => {
  it("ends centred on the doorway, close enough for it to fill the screen", () => {
    for (const aspect of [16 / 9, 4 / 3, 390 / 844]) {
      const f = framingFor(aspect);
      const end = cameraAt(f, 1, 1);
      expect(end.x).toBeCloseTo(DOOR.x);
      expect(end.y).toBeCloseTo(DOOR.y + DOOR.height / 2);
      const viewH = 2 * (end.z - DOOR.thickness) * Math.tan((20 * Math.PI) / 180);
      expect(viewH).toBeLessThanOrEqual(DOOR.height);
      expect(viewH * aspect).toBeLessThanOrEqual(DOOR.width);
    }
  });

  it("starts with the door in view on every screen shape", () => {
    for (const aspect of [21 / 9, 16 / 9, 4 / 3, 390 / 844]) {
      const f = framingFor(aspect);
      const viewH = 2 * f.start.z * Math.tan((20 * Math.PI) / 180);
      const halfW = (viewH * aspect) / 2;
      expect(Math.abs(DOOR.x - f.start.x) + DOOR.width / 2).toBeLessThanOrEqual(halfW);
    }
  });
});

describe("the hand-over to the site", () => {
  it("places the paraglider on the painting where the world is drawn", async () => {
    const { worldToScreen, WORLD } = await import("@/features/intro/world/cover");
    // the painting's corners land on the screen's edges on a screen of the same shape
    const a = worldToScreen(0, 0, WORLD.w, WORLD.h);
    const b = worldToScreen(WORLD.w, WORLD.h, WORLD.w, WORLD.h);
    expect(a.x).toBeCloseTo(0);
    expect(a.y).toBeCloseTo(0);
    expect(b.x).toBeCloseTo(WORLD.w);
    expect(b.y).toBeCloseTo(WORLD.h);
    // a phone shows the middle: the painted paraglider (x 1172) is off to the right of a 430 px screen
    const g = worldToScreen(1172, 60, 430, 932);
    expect(g.x).toBeGreaterThan(430);
    // drifting closer moves points away from the focus
    const near = worldToScreen(1172, 60, 1280, 720, { push: 1, lookX: 0, lookY: 0 });
    const far = worldToScreen(1172, 60, 1280, 720);
    expect(near.x).toBeGreaterThan(far.x);
  });

  it("raises the canopy flag once and lets go of it", async () => {
    const { handoff, useHandoff } = await import("@/features/intro/handoff");
    const { result } = renderHook(() => useHandoff());
    expect(result.current).toBe(false);
    act(() => handoff.start());
    expect(result.current).toBe(true);
    act(() => handoff.finish());
    expect(result.current).toBe(false);
  });
});
