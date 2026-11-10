'use client';

import { Copy, Download, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '~/components/ui/drawer';
import { receivedAmount } from '~/domain/accounts/movements';
import {
  formatAmount,
  formatFullDate,
  getMovementLabel,
  type Movement,
} from '~/lib/formatters';
import { downloadReceipt, receiptFileName } from '~/lib/receipt';
import { StatusPill } from './status-pill';

interface MovementDetailDrawerProps {
  movement: Movement | null;
  open: boolean;
  onClose: () => void;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">
        {value}
      </span>
    </div>
  );
}

export function MovementDetailDrawer({
  movement,
  open,
  onClose,
}: MovementDetailDrawerProps) {
  const { t } = useTranslation();
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload(current: Movement) {
    setIsDownloading(true);
    const received = receivedAmount(current);
    try {
      const sign = current.direction === 'incoming' ? '+' : '-';
      await downloadReceipt(
        {
          title: t('movements.detail.receiptTitle'),
          amount: `${sign}${formatAmount(current.asset, current.amount)}`,
          status: t(`movements.status.${current.status}`),
          rows: [
            {
              label: t('movements.detail.type'),
              value: getMovementLabel(current.type, current.direction),
            },
            { label: t('movements.detail.asset'), value: current.asset },
            {
              label: t('movements.detail.date'),
              value: formatFullDate(current.createdAt),
            },
            ...(current.counterparty
              ? [
                  {
                    label: t('movements.detail.counterparty'),
                    value: current.counterparty,
                  },
                ]
              : []),
            ...(current.fee
              ? [
                  {
                    label: t('movements.detail.fee'),
                    value: formatAmount(current.fee.asset, current.fee.amount),
                  },
                ]
              : []),
            ...(received !== undefined
              ? [
                  {
                    label: t('movements.detail.received'),
                    value: formatAmount(current.asset, received),
                  },
                ]
              : []),
            {
              label: t('movements.detail.reference'),
              value: current.reference,
            },
          ],
          footer: t('movements.detail.receiptFooter', {
            date: formatFullDate(new Date().toISOString()),
          }),
        },
        receiptFileName(current.reference),
      );
      toast.success(t('movements.detail.receiptDownloadedToast'));
    } catch {
      toast.error(t('movements.detail.receiptErrorToast'));
    } finally {
      setIsDownloading(false);
    }
  }

  const received = movement ? receivedAmount(movement) : undefined;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      {movement && (
        <DrawerContent>
          <DrawerHeader className="text-left">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-lg font-bold text-foreground">
                {t('movements.detail.title')}
              </DrawerTitle>
              <DrawerClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                  aria-label={t('common.close')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
            <DrawerDescription className="sr-only">
              {t('movements.detail.description')}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-5 pb-2">
            {/* Amount hero */}
            <div className="mb-3 flex flex-col items-center gap-2 rounded-2xl border border-border/80 bg-card/80 py-5">
              <p className="text-3xl font-bold tabular-nums text-foreground">
                {movement.direction === 'incoming' ? '+' : '-'}
                {formatAmount(movement.asset, movement.amount)}
              </p>
              <StatusPill status={movement.status} />
            </div>

            {/* Details */}
            <div className="flex flex-col rounded-2xl border border-border/80 bg-card/70 px-4">
              <DetailRow
                label={t('movements.detail.type')}
                value={getMovementLabel(movement.type, movement.direction)}
              />
              <DetailRow
                label={t('movements.detail.asset')}
                value={movement.asset}
              />
              <DetailRow
                label={t('movements.detail.date')}
                value={formatFullDate(movement.createdAt)}
              />
              {movement.counterparty && (
                <DetailRow
                  label={t('movements.detail.counterparty')}
                  value={movement.counterparty}
                />
              )}
              {movement.fee && (
                <DetailRow
                  label={t('movements.detail.fee')}
                  value={formatAmount(movement.fee.asset, movement.fee.amount)}
                />
              )}
              {received !== undefined && (
                <DetailRow
                  label={t('movements.detail.received')}
                  value={formatAmount(movement.asset, received)}
                />
              )}
              <DetailRow
                label={t('movements.detail.reference')}
                value={
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-xs">
                      {movement.reference}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard.writeText(movement.reference)
                      }
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={t('movements.detail.copyReferenceAria')}
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </span>
                }
              />
            </div>
          </div>

          <DrawerFooter>
            <Button
              variant="outline"
              onClick={() => void handleDownload(movement)}
              disabled={isDownloading}
              className="h-12 w-full gap-2 rounded-2xl text-sm bg-transparent"
            >
              <Download className="h-4 w-4" />
              {t('movements.detail.downloadReceipt')}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      )}
    </Drawer>
  );
}
