export function Placeholder({ title, milestone }: { title: string; milestone: string }) {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-zinc-500">Coming in {milestone}.</p>
    </section>
  );
}
