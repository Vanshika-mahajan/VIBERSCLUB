import { redirect } from "next/navigation";

/** The entry was reviewed here before it became the first page; old links land on it. */
export default function IntroDemoPage() {
  redirect("/");
}
