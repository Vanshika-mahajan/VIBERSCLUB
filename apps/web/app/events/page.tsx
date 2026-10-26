import type { Metadata } from "next";
import { EventsScreen } from "@/features/events/EventsScreen";

export const metadata: Metadata = { title: "Events" };

export default function EventsPage() {
  return <EventsScreen />;
}
