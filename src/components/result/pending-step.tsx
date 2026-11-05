'use client';

import { Clock, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { formatAmountWithCode } from '~/lib/formatters';
import { cn } from '~/lib/utils';

function formatCopWithCode(amount: number) {
  return formatAmountWithCode('COP', amount);
}

interface PendingStepProps {
  amount: number;
  fee?: number;
  receivedAmount?: number;
  receivedLabel?: string;
  orderId?: string;
  actionLabel?: string;
  /** Defaults to COP with its code — pass a USD formatter for the RTP/ACH US-bank flows. */
  formatAmount?: (amount: number) => string;
  /** Makes the action the main button, e.g. a payment link the user must open. */
  emphasizeAction?: boolean;
  reportProblemHref: string;
  onRefresh: () => void;
  onDone: () => void;
}

export function TopUpPendingStep({
  amount,
  fee,
  receivedAmount,
  receivedLabel,
  orderId,
  actionLabel,
  formatAmount = formatCopWithCode,
  emphasizeAction = false,
  reportProblemHref,
  onRefresh,
  onDone,
}: PendingStepProps) {
  const { t } = useTranslation();
  const hasBreakdown =
    typeof fee === 'number' || typeof receivedAmount === 'number';

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-primary/25 bg-primary/[0.06]">
        <Clock className="h-7 w-7 text-primary" strokeWidth={1.5} />
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-lg font-bold text-foreground">
          {t('topup.pendingStep.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('topup.pendingStep.description')}
        </p>
        <p className="text-2xl font-bold tabular-nums text-foreground">
          {formatAmount(amount)}
        </p>
        {orderId && (
          <p className="text-xs text-muted-foreground">
            {t('topup.pendingStep.orderId', { orderId })}
          </p>
        )}
      </div>

      {hasBreakdown && (
        <div className="flex w-full flex-col gap-2 rounded-2xl border border-border/85 bg-background/70 p-4 text-sm">
          {typeof fee === 'number' && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">
                {t('topup.amountStep.fee')}
              </span>
              <span className="font-medium tabular-nums text-foreground">
                {formatAmount(fee)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">
              {t('topup.pendingStep.total')}
            </span>
            <span className="font-medium tabular-nums text-foreground">
              {formatAmount(amount)}
            </span>
          </div>
          {typeof receivedAmount === 'number' && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">
                {receivedLabel ?? t('topup.amountStep.youWillReceive')}
              </span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatAmount(receivedAmount)}
              </span>
            </div>
          )}
        </div>
      )}

      <ResultActions
        doneLabel={t('common.done')}
        actionLabel={actionLabel ?? t('topup.pendingStep.checkStatus')}
        reportProblemHref={reportProblemHref}
        emphasizeAction={emphasizeAction}
        onAction={onRefresh}
        onDone={onDone}
      />

      <p className="text-[11px] text-muted-foreground text-center">
        {t('topup.pendingStep.contactSupportDisclaimer')}
      </p>
    </div>
  );
}

export function ResultActions({
  doneLabel,
  actionLabel,
  reportProblemHref,
  emphasizeAction = false,
  onAction,
  onDone,
}: {
  doneLabel: string;
  actionLabel: string;
  reportProblemHref: string;
  emphasizeAction?: boolean;
  onAction: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const done = (
    <Button
      key="done"
      onClick={onDone}
      variant={emphasizeAction ? 'outline' : 'default'}
      className={cn(
        'h-12 w-full rounded-2xl text-sm font-medium',
        emphasizeAction && 'bg-transparent',
      )}
    >
      {doneLabel}
    </Button>
  );
  const action = (
    <Button
      key="action"
      onClick={onAction}
      variant={emphasizeAction ? 'default' : 'outline'}
      className={cn(
        'h-12 w-full gap-2 rounded-2xl text-sm font-medium',
        !emphasizeAction && 'bg-transparent',
      )}
    >
      <RefreshCw className="h-4 w-4" />
      {actionLabel}
    </Button>
  );

  return (
    <div className="flex w-full flex-col gap-3">
      {emphasizeAction ? [action, done] : [done, action]}
      <Button
        variant="ghost"
        nativeButton={false}
        render={<a href={reportProblemHref} />}
        className="h-12 w-full rounded-2xl text-sm font-medium"
      >
        {t('topup.executionOutcome.reportProblem')}
      </Button>
    </div>
  );
}
