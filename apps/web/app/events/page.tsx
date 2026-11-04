import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { Events } from "@/features/club/Events";
import s from "@/features/club/club.module.css";

export const metadata: Metadata = { title: "Events" };

export default function EventsPage() {
  return (
    <div className={s.club}>
      <PageHeader kicker="Manali this week" title="Events">
        Small plans hosted by Vibers. Free ones are the default; paid hosts collect payment themselves.
      </PageHeader>
      <Events />
    </div>
  );
}
