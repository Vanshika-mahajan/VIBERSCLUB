export function Placeholder({ title, milestone }: { title: string; milestone: string }) {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted">Coming in {milestone}.</p>
    </section>
  );
}
