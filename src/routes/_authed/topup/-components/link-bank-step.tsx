'use client';

import { AlertTriangle, Building2, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';

interface LinkBankStepProps {
  status: 'idle' | 'linking' | 'failed' | 'needs_update';
  isStarting: boolean;
  onStartLink: () => void;
  onCheckAgain: () => void;
  onCancel: () => void;
}

/** CTA + pending/failed states for linking a US bank account via hosted Plaid Link. */
export function LinkBankStep({
  status,
  isStarting,
  onStartLink,
  onCheckAgain,
  onCancel,
}: LinkBankStepProps) {
  const { t } = useTranslation();

  if (status === 'linking') {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-primary/25 bg-primary/[0.06]">
          <RefreshCw
            className="h-7 w-7 animate-spin text-primary"
            strokeWidth={1.5}
          />
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-lg font-bold text-foreground">
            {t('topup.usBanks.linkStep.linking')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('topup.usBanks.linkStep.linkingDescription')}
          </p>
        </div>
        <Button
          onClick={onCheckAgain}
          variant="outline"
          className="h-12 w-full gap-2 rounded-2xl text-sm font-medium bg-transparent"
        >
          <RefreshCw className="h-4 w-4" />
          {t('topup.usBanks.linkStep.checkAgain')}
        </Button>
        <Button
          onClick={onCancel}
          variant="ghost"
          className="h-auto p-0 text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          {t('topup.usBanks.linkStep.cancel')}
        </Button>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-foreground bg-card">
          <AlertTriangle
            className="h-7 w-7 text-foreground"
            strokeWidth={1.5}
          />
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-lg font-bold text-foreground">
            {t('topup.usBanks.linkStep.failed')}
          </h2>
        </div>
        <Button
          onClick={onStartLink}
          disabled={isStarting}
          className="h-12 w-full rounded-2xl text-sm font-medium"
        >
          {t('topup.usBanks.linkStep.retry')}
        </Button>
      </div>
    );
  }

  if (status === 'needs_update') {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-foreground bg-card">
          <AlertTriangle
            className="h-7 w-7 text-foreground"
            strokeWidth={1.5}
          />
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-lg font-bold text-foreground">
            {t('topup.usBanks.linkStep.needsUpdate')}
          </h2>
        </div>
        <Button
          onClick={onStartLink}
          disabled={isStarting}
          className="h-12 w-full rounded-2xl text-sm font-medium"
        >
          {t('topup.usBanks.linkStep.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-primary/25 bg-primary/[0.06]">
        <Building2 className="h-7 w-7 text-primary" strokeWidth={1.5} />
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-lg font-bold text-foreground">
          {t('topup.usBanks.linkStep.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('topup.usBanks.linkStep.description')}
        </p>
      </div>
      <Button
        onClick={onStartLink}
        disabled={isStarting}
        className="h-12 w-full rounded-2xl text-sm font-medium"
      >
        {t('topup.usBanks.linkStep.cta')}
      </Button>
    </div>
  );
}
