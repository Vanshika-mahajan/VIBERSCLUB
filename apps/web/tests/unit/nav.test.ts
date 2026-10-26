import { describe, expect, it } from "vitest";
import { isActive } from "@/lib/nav";

describe("isActive", () => {
  it("matches Home only on the root", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/events", "/")).toBe(false);
  });

  it("matches a section and its sub-pages, not look-alikes", () => {
    expect(isActive("/events", "/events")).toBe(true);
    expect(isActive("/events/123", "/events")).toBe(true);
    expect(isActive("/eventsx", "/events")).toBe(false);
  });
});
