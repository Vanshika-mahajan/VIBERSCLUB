import { ClubHome } from "@/features/club/ClubHome";
import { EntryDoor } from "@/features/entry/EntryDoor";

/**
 * The first page: Home, with the entry lying over it (features/entry). The door in the clouds opens
 * and the camera goes through the doorway into Home, which was underneath all along.
 */
export default function HomePage() {
  return (
    <>
      <ClubHome />
      <EntryDoor />
    </>
  );
}
