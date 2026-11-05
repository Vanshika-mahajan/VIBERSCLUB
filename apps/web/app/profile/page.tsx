import type { Metadata } from "next";
import { ProfileHome } from "@/features/profile/ProfileHome";

export const metadata: Metadata = { title: "Your profile" };

export default function ProfilePage() {
  return <ProfileHome />;
}
