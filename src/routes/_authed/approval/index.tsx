import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  CircleCheck,
  KeyRound,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import type { ApprovalOutcome } from '~/domain/approval/ports';
import {
  ApprovalFailedError,
  type ApprovalFailureReason,
  type ApprovalOperation,
  type ApprovalOperationKind,
  type SavedApproval,
} from '~/domain/approval/types';
import { bloqueApprovalRepository } from '~/infra/bloque/approval-repository';
import {
  brebKeyDeletionRefusal,
  pocketDeletionRefusal,
} from '~/lib/deletion-errors';
import { formatAmountWithCode } from '~/lib/formatters';
import {
  clearPendingApproval,
  readPendingApproval,
  savePendingApproval,
} from '~/lib/pending-approval';
import { safeRedirectPath } from '~/lib/safe-redirect';
import { ExecutionOutcomeStep } from '../topup/-components/execution-outcome-step';

/**
 * Where the identity app sends the person back after the approval page.
 * Collects the approval for the operation saved before leaving and repeats
 * it once. Coming back without approving runs nothing.
 *
 * Once the repeat is sent its outcome can only be confirmed by its answer:
 * the SDK retries lost responses with the same single-use approval, so a
 * refused or expired answer may follow an operation that did run.
 */
export const Route = createFileRoute('/_authed/approval/')({
  component: RouteComponent,
});

type State =
  | { kind: 'working' }
  | { kind: 'none' }
  | { kind: 'done'; saved: SavedApproval; outcome: ApprovalOutcome }
  | { kind: 'failed'; saved: SavedApproval; reason: ApprovalFailureReason }
  | { kind: 'refused'; saved: SavedApproval; message: string }
  | { kind: 'unconfirmed'; saved: SavedApproval };

/** Refusals of the repeat that are certain to have run nothing. */
const NOTHING_RAN: ReadonlySet<ApprovalFailureReason> = new Set([
  'mismatch',
  'passkey_not_registered',
  'rate_expired',
]);

/** Operations that change a card instead of moving money. */
const CARD_CHANGES: ReadonlySet<ApprovalOperationKind> = new Set([
  'create-card',
  'activate-card',
  'card-preferred-asset',
]);

const ACCOUNT_DELETIONS: ReadonlySet<ApprovalOperationKind> = new Set([
  'delete-pocket',
]);

const KEY_DELETIONS: ReadonlySet<ApprovalOperationKind> = new Set([
  'delete-breb-key',
]);

/** Why a repeated deletion was refused, when the refusal proves it ran nothing. */
function deletionRefusal(
  operation: ApprovalOperation,
  error: unknown,
): string | undefined {
  switch (operation.kind) {
    case 'delete-breb-key':
      return brebKeyDeletionRefusal(error);
    case 'delete-pocket':
      return pocketDeletionRefusal(error);
    default:
      return undefined;
  }
}

function RouteComponent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>({ kind: 'working' });
  // The approval is single-use: never collect or repeat it twice, even when
  // the effect runs again.
  const started = useRef(false);

  const process = useCallback(async () => {
    const saved = readPendingApproval();
    if (!saved) {
      setState({ kind: 'none' });
      return;
    }
    // A repeat already sent from an earlier load (reload, second tab).
    if (saved.replayStartedAt !== undefined) {
      const reconciled = await bloqueApprovalRepository
        .reconcile(saved.operation, saved.replayStartedAt)
        .catch(() => null);
      clearPendingApproval();
      setState(
        reconciled
          ? { kind: 'done', saved, outcome: reconciled }
          : { kind: 'unconfirmed', saved },
      );
      return;
    }
    setState({ kind: 'working' });

    let approval: string;
    try {
      approval = await bloqueApprovalRepository.collect(saved.pending);
    } catch (error) {
      const reason =
        error instanceof ApprovalFailedError ? error.reason : 'unavailable';
      // Expired or already collected can never succeed. Anything else keeps
      // it, so the person can approve or try again.
      if (reason === 'expired') clearPendingApproval();
      setState({ kind: 'failed', saved, reason });
      return;
    }
    const replayStartedAt = Date.now();
    if (!savePendingApproval({ ...saved, replayStartedAt })) {
      clearPendingApproval();
    }

    try {
      const outcome = await bloqueApprovalRepository.run(
        saved.operation,
        approval,
      );
      setState({ kind: 'done', saved, outcome });
    } catch (error) {
      const refusal = deletionRefusal(saved.operation, error);
      if (
        error instanceof ApprovalFailedError &&
        NOTHING_RAN.has(error.reason)
      ) {
        setState({ kind: 'failed', saved, reason: error.reason });
      } else if (refusal) {
        setState({ kind: 'refused', saved, message: refusal });
      } else {
        const reconciled = await bloqueApprovalRepository
          .reconcile(saved.operation, replayStartedAt)
          .catch(() => null);
        setState(
          reconciled
            ? { kind: 'done', saved, outcome: reconciled }
            : { kind: 'unconfirmed', saved },
        );
      }
    } finally {
      clearPendingApproval();
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['card-detail'] });
    }
  }, [queryClient]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void process();
  }, [process]);

  const goBack = (saved?: SavedApproval) =>
    void navigate({ href: safeRedirectPath(saved?.returnTo) });

  if (state.kind === 'working') {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 py-16 text-center"
      >
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t('approval.working')}</p>
      </div>
    );
  }

  if (state.kind === 'none') {
    return (
      <ApprovalScreen
        icon="alert"
        title={t('approval.none.title')}
        description={t('approval.none.description')}
        primary={{ label: t('approval.goHome'), onClick: () => goBack() }}
      />
    );
  }

  if (state.kind === 'done') {
    const { saved, outcome } = state;
    const { amount, asset, fee, receivedAmount, receivedLabel } =
      saved.display ?? {};
    const format = (value: number) =>
      formatAmountWithCode(asset ?? 'COP', value);
    if (outcome.kind === 'order') {
      return (
        <ExecutionOutcomeStep
          amount={amount ?? 0}
          fee={fee}
          receivedAmount={receivedAmount}
          receivedLabel={receivedLabel}
          orderId={outcome.orderId}
          execution={outcome.execution}
          formatAmount={format}
        />
      );
    }
    if (CARD_CHANGES.has(saved.operation.kind)) {
      return (
        <ApprovalScreen
          icon="success"
          title={t('approval.done.cardTitle')}
          description={t('approval.done.cardDescription')}
          primary={{ label: t('common.done'), onClick: () => goBack(saved) }}
        />
      );
    }
    if (KEY_DELETIONS.has(saved.operation.kind)) {
      return (
        <ApprovalScreen
          icon="success"
          title={t('approval.done.keyDeletedTitle')}
          description={t('approval.done.keyDeletedDescription')}
          primary={{ label: t('common.done'), onClick: () => goBack(saved) }}
        />
      );
    }
    if (ACCOUNT_DELETIONS.has(saved.operation.kind)) {
      return (
        <ApprovalScreen
          icon="success"
          title={t('approval.done.accountDeletedTitle')}
          description={t('approval.done.accountDeletedDescription')}
          primary={{
            label: t('common.done'),
            onClick: () => void navigate({ to: '/accounts' }),
          }}
        />
      );
    }
    return (
      <ApprovalScreen
        icon="success"
        title={t('approval.done.title')}
        description={
          amount !== undefined
            ? t('approval.done.descriptionAmount', { amount: format(amount) })
            : t('approval.done.description')
        }
        primary={{ label: t('common.done'), onClick: () => goBack(saved) }}
      />
    );
  }

  if (state.kind === 'refused') {
    return (
      <ApprovalScreen
        icon="cancelled"
        title={t('approval.refused.title')}
        description={state.message}
        primary={{
          label: t('common.back'),
          onClick: () => goBack(state.saved),
        }}
      />
    );
  }

  if (state.kind === 'unconfirmed') {
    const { kind } = state.saved.operation;
    if (KEY_DELETIONS.has(kind)) {
      return (
        <ApprovalScreen
          icon="alert"
          title={t('approval.unconfirmed.title')}
          description={t('approval.unconfirmed.keyDeletionDescription')}
          primary={{
            label: t('approval.seeKeys'),
            onClick: () => goBack(state.saved),
          }}
        />
      );
    }
    if (ACCOUNT_DELETIONS.has(kind)) {
      return (
        <ApprovalScreen
          icon="alert"
          title={t('approval.unconfirmed.title')}
          description={t('approval.unconfirmed.pocketDeletionDescription')}
          primary={{
            label: t('approval.seePockets'),
            onClick: () => void navigate({ to: '/accounts' }),
          }}
        />
      );
    }
    return (
      <ApprovalScreen
        icon="alert"
        title={t('approval.unconfirmed.title')}
        description={t('approval.unconfirmed.description')}
        primary={{
          label: t('approval.seeMovements'),
          onClick: () => void navigate({ to: '/movements' }),
        }}
        secondary={{
          label: t('common.back'),
          onClick: () => goBack(state.saved),
        }}
      />
    );
  }

  const { saved, reason } = state;
  const cancel = () => {
    clearPendingApproval();
    goBack(saved);
  };

  if (reason === 'not_approved') {
    const { approvalUrl, expiresAt } = saved.pending;
    const canApprove = !!approvalUrl && Date.now() < expiresAt;
    return (
      <ApprovalScreen
        icon="cancelled"
        title={t('approval.failed.not_approved.title')}
        description={t('approval.failed.not_approved.description')}
        primary={
          canApprove
            ? {
                label: t('approval.approveNow'),
                onClick: () => window.location.assign(approvalUrl),
              }
            : undefined
        }
        secondary={{ label: t('approval.cancel'), onClick: cancel }}
      />
    );
  }

  if (reason === 'passkey_not_registered') {
    return (
      <ApprovalScreen
        icon="passkey"
        title={t('approval.failed.passkey_not_registered.title')}
        description={t('approval.failed.passkey_not_registered.description')}
        primary={{
          label: t('approval.registerPasskey'),
          onClick: () => void navigate({ to: '/passkey' }),
        }}
        secondary={{ label: t('common.back'), onClick: cancel }}
      />
    );
  }

  // Still saved: collecting failed for a reason retrying may fix.
  const canRetry = reason === 'unavailable' && readPendingApproval() !== null;
  return (
    <ApprovalScreen
      icon={reason === 'unavailable' ? 'alert' : 'cancelled'}
      title={t(`approval.failed.${reason}.title`)}
      description={t(`approval.failed.${reason}.description`)}
      primary={
        canRetry
          ? { label: t('common.retry'), onClick: () => void process() }
          : { label: t('common.back'), onClick: cancel }
      }
      secondary={
        canRetry ? { label: t('approval.cancel'), onClick: cancel } : undefined
      }
    />
  );
}

const ICONS = {
  success: { Icon: CircleCheck, tone: 'text-primary' },
  cancelled: { Icon: OctagonX, tone: 'text-destructive' },
  alert: { Icon: TriangleAlert, tone: 'text-destructive' },
  passkey: { Icon: KeyRound, tone: 'text-primary' },
} as const;

function ApprovalScreen({
  icon,
  title,
  description,
  primary,
  secondary,
}: {
  icon: keyof typeof ICONS;
  title: string;
  description: string;
  primary?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}) {
  const { Icon, tone } = ICONS[icon];
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-border/85 bg-card/80">
        <Icon className={`h-7 w-7 ${tone}`} strokeWidth={1.5} />
      </div>
      <div
        role="status"
        className="flex flex-col items-center gap-2 text-center"
      >
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex w-full flex-col gap-3">
        {primary && (
          <Button
            onClick={primary.onClick}
            className="h-12 w-full rounded-2xl text-sm font-medium"
          >
            {primary.label}
          </Button>
        )}
        {secondary && (
          <Button
            variant="outline"
            onClick={secondary.onClick}
            className="h-12 w-full rounded-2xl bg-transparent text-sm font-medium"
          >
            {secondary.label}
          </Button>
        )}
      </div>
    </div>
  );
}
