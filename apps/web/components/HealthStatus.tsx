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
    return <p role="status" className="text-muted">Checking the API…</p>;
  }
  if (state.kind === "ok") {
    return (
      <p role="status" className="font-medium text-ok">
        API OK
      </p>
    );
  }
  return (
    <div role="alert" className="space-y-2">
      <p className="font-medium text-danger">API unavailable</p>
      <p className="text-sm text-muted">{state.message}</p>
      <button
        type="button"
        onClick={() => {
          setState({ kind: "loading" });
          setAttempt((n) => n + 1);
        }}
        className="rounded-full border border-line2 px-4 py-1.5 text-sm hover:border-brand hover:text-brand"
      >
        Try again
      </button>
    </div>
  );
}
