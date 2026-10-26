import { apiUrl } from "./config";

export type Health = { status: "ok"; database: "ok" };

/** An error from the API, shaped like its RFC 9457 problem responses. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function fetchHealth(signal?: AbortSignal): Promise<Health> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/healthz`, { signal, cache: "no-store" });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(0, "network_error", "Can't reach the API. Is it running?");
  }
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      problem.code ?? "unknown_error",
      problem.detail ?? `The API answered ${response.status}.`,
    );
  }
  return response.json();
}
