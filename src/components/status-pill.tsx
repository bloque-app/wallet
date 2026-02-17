import { Badge } from '~/components/ui/badge';
import type { MovementStatus } from '~/lib/mock-data';
import { cn } from '~/lib/utils';

interface StatusPillProps {
  status: MovementStatus;
}

const statusConfig: Record<
  MovementStatus,
  { label: string; className: string }
> = {
  completed: {
    label: 'Completado',
    className: 'bg-foreground text-background border-transparent',
  },
  pending: {
    label: 'Pendiente',
    className: 'bg-muted text-muted-foreground border-border',
  },
  failed: {
    label: 'Fallido',
    className: 'bg-background text-foreground border-foreground',
  },
};

export function StatusPill({ status }: StatusPillProps) {
  const config = statusConfig[status];
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] font-medium', config.className)}
    >
      {config.label}
    </Badge>
  );
}
