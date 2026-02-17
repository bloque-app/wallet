export function MovementsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3].map((key) => (
        <div
          key={key}
          className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/80 px-3 py-3"
        >
          <div className="flex flex-col gap-1.5">
            <span className="h-3.5 w-24 rounded-full bg-muted animate-pulse" />
            <span className="h-2.5 w-16 rounded-full bg-muted/70 animate-pulse" />
          </div>
          <span className="h-3.5 w-20 rounded-full bg-muted/80 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
