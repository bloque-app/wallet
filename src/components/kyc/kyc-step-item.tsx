interface KycStepItemProps {
  label: string;
  state: 'done' | 'in_progress' | 'pending' | 'error';
  stepNumber: number;
}

export function KycStepItem({ label, state, stepNumber }: KycStepItemProps) {
  const circleClass =
    state === 'done'
      ? 'bg-foreground text-background border-foreground'
      : state === 'error'
        ? 'border-destructive text-destructive bg-destructive/10'
        : state === 'in_progress'
          ? 'border-foreground text-foreground bg-background'
          : 'border-border text-muted-foreground bg-background';

  const textClass =
    state === 'pending'
      ? 'text-muted-foreground'
      : state === 'error'
        ? 'text-destructive'
        : 'text-foreground';

  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold ${circleClass}`}
      >
        {state === 'done' ? '✓' : state === 'error' ? '×' : stepNumber}
      </span>
      <span className={`text-[10px] ${textClass}`}>{label}</span>
    </div>
  );
}
