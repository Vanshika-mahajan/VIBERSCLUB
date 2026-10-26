import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatsScreen } from "@/features/chats/ChatsScreen";

export const metadata: Metadata = { title: "Chats" };

export default function ChatsPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading chats…</p>}>
      <ChatsScreen />
    </Suspense>
  );
}
