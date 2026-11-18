import { Camp } from "@/features/camp/Camp";
import { EntryDemo } from "@/features/entry/EntryDemo";

/**
 * The first page: the door in ARPIT's meadow opens onto their sunset camp (features/camp), which is
 * built up step by step. Home is at /home.
 */
export default function FirstPage() {
  return (
    <>
      <Camp />
      <EntryDemo />
    </>
  );
}
