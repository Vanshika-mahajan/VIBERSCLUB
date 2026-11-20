import { redirect } from "next/navigation";

/** the review copy of Home with tabs is Home now */
export default function HomeDemoPage() {
  redirect("/home");
}
