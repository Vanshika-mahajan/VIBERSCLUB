"use client";

import { useEffect, useState } from "react";
import { ApiError, fetchHealth } from "@/lib/api";

type State = { kind: "loading" } | { kind: "ok" } | { kind: "error"; message: string };

export function HealthStatus() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchHealth(controller.signal)
      .then(() => setState({ kind: "ok" }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof ApiError ? error.message : "Something went wrong.";
        setState({ kind: "error", message });
      });
    return () => controller.abort();
  }, [attempt]);

  if (state.kind === "loading") {
    return <p role="status" className="text-zinc-500">Checking the API…</p>;
  }
  if (state.kind === "ok") {
    return (
      <p role="status" className="font-medium text-emerald-700 dark:text-emerald-400">
        API OK
      </p>
    );
  }
  return (
    <div role="alert" className="space-y-2">
      <p className="font-medium text-red-700 dark:text-red-400">API unavailable</p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{state.message}</p>
      <button
        type="button"
        onClick={() => {
          setState({ kind: "loading" });
          setAttempt((n) => n + 1);
        }}
        className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm dark:border-zinc-700"
      >
        Try again
      </button>
    </div>
  );
}
