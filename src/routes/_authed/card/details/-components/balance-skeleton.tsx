export function BalanceSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <span className="h-6 w-14 rounded-full bg-muted animate-pulse" />
        <span className="h-6 w-14 rounded-full bg-muted/80 animate-pulse" />
        <span className="h-6 w-14 rounded-full bg-muted/70 animate-pulse" />
      </div>
      <span className="h-9 w-40 rounded-full bg-muted animate-pulse" />
      <span className="h-3 w-52 rounded-full bg-muted/70 animate-pulse" />
    </div>
  );
}
