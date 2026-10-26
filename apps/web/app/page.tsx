import Link from "next/link";
import { HealthStatus } from "@/components/HealthStatus";

export default function HomePage() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Vibers Club</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Find your people in Manali. Connect, explore, experience and contribute.
        </p>
      </div>
      <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-2 text-sm font-medium text-zinc-500">System status</h2>
        <HealthStatus />
      </div>
      <Link href="/explore" className="inline-block text-sm underline">
        Explore Manali
      </Link>
    </section>
  );
}
