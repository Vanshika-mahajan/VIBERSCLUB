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
