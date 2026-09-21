import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Building2, KeyRound, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BackButton } from '~/components/back-button';
import { FeeInfo } from '~/components/fee-info';
import { formatCOP, formatUSD } from '~/lib/formatters';
import { cn } from '~/lib/utils';

export const Route = createFileRoute('/_authed/send/')({
  validateSearch: (search: Record<string, unknown>): { from?: 'convert' } =>
    search.from === 'convert' ? { from: 'convert' } : {},
  component: RouteComponent,
});

type SendOption = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  search?: Record<string, string>;
  group?: 'colombia' | 'us';
  fee?: string;
  hasFeeInfo?: boolean;
} & ({ to: string; onClick?: never } | { to?: never; onClick: () => void });

function RouteComponent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { from } = Route.useSearch();

  const options: SendOption[] = [
    {
      title: t('send.options.bloqueFriends.title'),
      description: t('send.options.bloqueFriends.description'),
      to: '/send/bloque-friends',
      icon: Users,
      fee: t('send.noFee'),
    },
    {
      title: t('send.options.brebKeys.title'),
      description: t('send.options.brebKeys.description'),
      to: '/breb-keys/pay-transfer',
      search: { from: '/send' },
      icon: KeyRound,
      group: 'colombia',
      fee: `${formatCOP(500)} + 0.4%`,
      hasFeeInfo: true,
    },
    {
      title: t('send.options.colombianBanks.title'),
      description: t('send.options.colombianBanks.description'),
      to: '/send/colombian-banks',
      icon: Building2,
      group: 'colombia',
      fee: `${formatCOP(5500)} + 0.2%`,
      hasFeeInfo: true,
    },
    {
      title: t('send.options.usBanks.title'),
      description: t('send.options.usBanks.description'),
      to: '/send/us-banks',
      icon: Building2,
      group: 'us',
      fee: `${formatUSD(1)} + 1%`,
      hasFeeInfo: true,
    },
  ];

  const ungrouped = options.filter((option) => !option.group);
  const colombiaOptions = options.filter(
    (option) => option.group === 'colombia',
  );
  const usOptions = options.filter((option) => option.group === 'us');
  const feeInfoDescription = t('send.feeInfo');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <BackButton
          onClick={() =>
            void navigate({ to: from === 'convert' ? '/convert' : '/' })
          }
        />
        <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">
          {t('send.title')}
        </h1>
      </div>

      <section className="flex flex-col gap-3">
        {ungrouped.map((option) =>
          renderSendOption(option, feeInfoDescription),
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('send.groups.colombia')}
        </h2>
        {colombiaOptions.map((option) =>
          renderSendOption(option, feeInfoDescription),
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('send.groups.us')}
        </h2>
        {usOptions.map((option) =>
          renderSendOption(option, feeInfoDescription),
        )}
      </section>
    </div>
  );
}

function renderSendOption(option: SendOption, feeInfoDescription: string) {
  const Icon = option.icon;
  const isDisabled = !option.to;
  const inner = (
    <>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex flex-1 flex-col">
        <p className="text-sm font-medium text-foreground">{option.title}</p>
        <p className="text-xs text-muted-foreground">{option.description}</p>
      </div>
      {option.fee && !option.hasFeeInfo && (
        <span className="shrink-0 text-[11px] font-medium text-primary">
          {option.fee}
        </span>
      )}
    </>
  );

  const clickable = option.to ? (
    <Link
      to={option.to}
      search={option.search}
      className="flex flex-1 items-start gap-3"
    >
      {inner}
    </Link>
  ) : (
    <button
      type="button"
      onClick={option.onClick}
      className="flex flex-1 items-start gap-3 text-left"
    >
      {inner}
    </button>
  );

  return (
    <div
      key={option.title}
      className={cn(
        'flex items-start gap-3 rounded-2xl border border-border/75 bg-card/80 p-4 transition-all',
        isDisabled ? 'opacity-60' : 'hover:bg-muted/70',
      )}
    >
      {clickable}
      {option.fee && option.hasFeeInfo && (
        <FeeInfo fee={option.fee} description={feeInfoDescription} />
      )}
    </div>
  );
}
