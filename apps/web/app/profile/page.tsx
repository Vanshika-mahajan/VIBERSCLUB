import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Your profile" };

export default function ProfilePage() {
  return <Placeholder title="Your profile" milestone="M2" />;
}
