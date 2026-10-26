// NEXT_PUBLIC_* values are copied into the browser bundle at build time,
// so only public settings (never secrets) may live here.
export const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
