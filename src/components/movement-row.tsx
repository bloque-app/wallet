'use client';

import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Landmark,
  RefreshCw,
} from 'lucide-react';
import {
  formatAmount,
  formatDate,
  getMovementLabel,
  type Movement,
} from '~/lib/mock-data';
import { StatusPill } from './status-pill';

interface MovementRowProps {
  movement: Movement;
  onClick?: () => void;
}

function MovementIcon({
  type,
  direction,
}: {
  type: Movement['type'];
  direction: Movement['direction'];
}) {
  const className = 'h-4 w-4 text-foreground';
  switch (type) {
    case 'topup':
      return <Landmark className={className} />;
    case 'convert':
      return <RefreshCw className={className} />;
    case 'card':
      return <CreditCard className={className} />;
    default:
      return direction === 'incoming' ? (
        <ArrowDownLeft className={className} />
      ) : (
        <ArrowUpRight className={className} />
      );
  }
}

export function MovementRow({ movement, onClick }: MovementRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/65 bg-card/75 px-3 py-3 text-left transition-all duration-200 hover:bg-muted/75"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-background/85">
          <MovementIcon type={movement.type} direction={movement.direction} />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-foreground">
            {getMovementLabel(movement.type, movement.direction)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(movement.createdAt)}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <p className="text-sm font-medium tabular-nums text-foreground">
          {movement.direction === 'incoming' ? '+' : '-'}
          {formatAmount(movement.asset, movement.amount)}
        </p>
        <StatusPill status={movement.status} />
      </div>
    </button>
  );
}
