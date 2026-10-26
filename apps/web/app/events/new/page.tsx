import type { Metadata } from "next";
import { HostForm } from "@/features/events/HostForm";

export const metadata: Metadata = { title: "Host an event" };

export default function HostPage() {
  return <HostForm />;
}
