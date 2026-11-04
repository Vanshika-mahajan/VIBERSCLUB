import type { Metadata } from "next";
import { Suspense } from "react";
import { FullProfile } from "@/features/vibers/FullProfile";
import { vibers } from "@/lib/demo/people";

export const metadata: Metadata = { title: "Viber" };

export function generateStaticParams() {
  return vibers.map((v) => ({ id: v.id }));
}

async function Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FullProfile id={id} />;
}

export default function ViberPage(props: PageProps<"/vibers/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading profile…</p>}>
      <Profile params={props.params} />
    </Suspense>
  );
}
