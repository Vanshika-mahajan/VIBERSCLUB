import type { Metadata } from "next";
import { FilmDemo } from "@/features/film/FilmDemo";

export const metadata: Metadata = { title: "Vibers Club" };

/** Review address for ARPIT's entry film played with real depth in three.js. */
export default function FilmDemoPage() {
  return <FilmDemo />;
}
