export function CardsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none">
        {[1, 2, 3].map((key) => (
          <div
            key={key}
            className="relative flex h-[7.4rem] w-[11.5rem] shrink-0 snap-center flex-col justify-between rounded-2xl border border-border bg-card/80 p-3.5 shadow-[0_14px_25px_-26px_color-mix(in_oklch,var(--foreground)_55%,transparent)]"
          >
            <div className="flex items-center justify-between">
              <span className="h-2 w-14 rounded-full bg-muted animate-pulse" />
              <span className="h-2 w-8 rounded-full bg-muted/80 animate-pulse" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="h-2.5 w-20 rounded-full bg-muted animate-pulse" />
              <span className="h-2 w-10 rounded-full bg-muted/70 animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-border/75 bg-card/80 p-5 shadow-[0_18px_36px_-34px_color-mix(in_oklch,var(--foreground)_40%,transparent)]">
        <div className="flex items-center justify-between">
          <span className="h-3 w-24 rounded-full bg-muted animate-pulse" />
          <span className="h-3 w-16 rounded-full bg-muted/80 animate-pulse" />
        </div>
        <div className="h-6 w-32 rounded-full bg-muted animate-pulse" />
        <div className="h-4 w-20 rounded-full bg-muted/70 animate-pulse" />
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="h-11 rounded-2xl border border-border/70 bg-muted/40 animate-pulse" />
          <div className="h-11 rounded-2xl border border-border/70 bg-muted/40 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
