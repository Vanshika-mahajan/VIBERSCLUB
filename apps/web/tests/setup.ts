import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { __resetForTests } from "@/lib/demo/store";

beforeEach(() => {
  localStorage.clear();
  __resetForTests();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// jsdom has no layout, so scrolling is a no-op
Element.prototype.scrollIntoView ??= function () {};
