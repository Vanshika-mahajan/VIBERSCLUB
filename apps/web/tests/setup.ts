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

// jsdom has no matchMedia; GSAP needs one when its plugins register. Nothing matches by default.
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }) as MediaQueryList;
