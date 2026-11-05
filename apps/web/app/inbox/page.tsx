import type { Metadata } from "next";
import { Suspense } from "react";
import { Inbox } from "@/features/inbox/Inbox";

export const metadata: Metadata = { title: "Inbox" };

export default function InboxPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Inbox />
    </Suspense>
  );
}
