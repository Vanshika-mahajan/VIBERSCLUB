import { Suspense } from "react";
import { EventScreen } from "@/features/events/EventScreen";
import { events } from "@/lib/demo/data";

// sample events are prerendered; events you host in the demo live in your browser and render on demand
export function generateStaticParams() {
  return events.map((e) => ({ id: e.id }));
}

async function Event({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventScreen id={id} />;
}

export default function EventPage(props: PageProps<"/events/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading event…</p>}>
      <Event params={props.params} />
    </Suspense>
  );
}
