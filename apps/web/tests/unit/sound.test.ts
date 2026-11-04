import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { __activate, __resetSoundForTests, __soundNames, playSound, useSound } from "@/lib/sound";

/** a stand-in AudioContext that counts the notes started */
let started = 0;
let contexts = 0;
class FakeParam {
  value = 0;
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
  cancelScheduledValues() {}
}
class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  type = "";
  connect<T>(n: T) {
    return n;
  }
  disconnect() {}
  start() {
    started++;
  }
  stop() {}
}
class FakeAudioContext {
  currentTime = 0;
  state = "running";
  destination = new FakeNode();
  constructor() {
    contexts++;
  }
  createGain() {
    return new FakeNode();
  }
  createOscillator() {
    return new FakeNode();
  }
  createBiquadFilter() {
    return new FakeNode();
  }
  resume() {
    return Promise.resolve();
  }
}

const reducedMotion = (on: boolean) =>
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: on && q.includes("reduce"), addEventListener() {}, removeEventListener() {} }));

beforeEach(() => {
  started = 0;
  contexts = 0;
  localStorage.clear();
  vi.stubGlobal("AudioContext", FakeAudioContext);
  reducedMotion(false);
  __resetSoundForTests();
});

describe("sound", () => {
  it("stays silent until the person has interacted, then plays", () => {
    playSound("tap");
    expect(contexts).toBe(0);
    __activate();
    playSound("tap");
    expect(contexts).toBe(1);
    expect(started).toBe(1);
  });

  it("plays the same sound once when it fires twice at the same moment", () => {
    __activate();
    playSound("open");
    playSound("open");
    expect(started).toBe(3); // "open" is three notes, played once
    playSound("close");
    expect(started).toBe(5);
  });

  it("has a tone for every kind of moment", () => {
    __activate();
    for (const n of __soundNames) playSound(n);
    expect(__soundNames).toEqual(
      expect.arrayContaining(["tap", "nav", "open", "close", "select", "post", "connect", "add", "remove"]),
    );
    expect(started).toBeGreaterThan(__soundNames.length);
  });

  it("can be turned off and the volume set, and remembers both", () => {
    __activate();
    const { result } = renderHook(() => useSound());
    expect(result.current.enabled).toBe(true);
    act(() => result.current.setEnabled(false));
    expect(result.current.enabled).toBe(false);
    playSound("tap");
    expect(started).toBe(0);
    act(() => result.current.setVolume(1.7));
    expect(result.current.volume).toBe(1);
    expect(JSON.parse(localStorage.getItem("vc-sound")!)).toEqual({ enabled: false, volume: 1 });
    __resetSoundForTests();
    const again = renderHook(() => useSound());
    expect(again.result.current.enabled).toBe(false);
  });

  it("starts off for people who ask for reduced motion", () => {
    reducedMotion(true);
    __activate();
    playSound("tap");
    expect(started).toBe(0);
    const { result } = renderHook(() => useSound());
    expect(result.current.enabled).toBe(false);
  });
});
