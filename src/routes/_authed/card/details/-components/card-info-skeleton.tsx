export function CardInfoSkeleton() {
  return (
    <section className="rounded-3xl border border-border/80 bg-card/80 p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <span className="h-3.5 w-24 rounded-full bg-muted animate-pulse" />
          <span className="h-2.5 w-16 rounded-full bg-muted/70 animate-pulse" />
        </div>
        <span className="h-6 w-16 rounded-full bg-muted/80 animate-pulse" />
      </div>
    </section>
  );
}
