import { useTranslation } from 'react-i18next';
import { Badge } from '~/components/ui/badge';
import type { MovementStatus } from '~/lib/formatters';
import { cn } from '~/lib/utils';

interface StatusPillProps {
  status: MovementStatus;
}

const statusClassName: Record<MovementStatus, string> = {
  completed: 'bg-foreground text-background border-transparent',
  pending: 'bg-muted text-muted-foreground border-border',
  failed: 'bg-background text-foreground border-foreground',
};

export function StatusPill({ status }: StatusPillProps) {
  const { t } = useTranslation();
  const statusLabel: Record<MovementStatus, string> = {
    completed: t('movements.status.completed'),
    pending: t('movements.status.pending'),
    failed: t('movements.status.failed'),
  };
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] font-medium', statusClassName[status])}
    >
      {statusLabel[status]}
    </Badge>
  );
}
