import type { Metadata } from "next";
import { DiscoverScreen } from "@/features/discover/DiscoverScreen";

export const metadata: Metadata = { title: "Discover Vibers" };

export default function DiscoverPage() {
  return (
    <>
      <h1 className="sr-only">Discover Vibers</h1>
      <DiscoverScreen />
    </>
  );
}
