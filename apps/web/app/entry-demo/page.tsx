import type { Metadata } from "next";
import { ClubHome } from "@/features/club/ClubHome";
import { EntryDoor } from "@/features/entry/EntryDoor";

export const metadata: Metadata = { title: "Vibers Club" };

/** Review address for the new entry (ARPIT's reference): the door in the clouds, opening onto Home. */
export default function EntryDemoPage() {
  return (
    <>
      <ClubHome />
      <EntryDoor />
    </>
  );
}
