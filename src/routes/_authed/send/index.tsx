import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Building2, KeyRound, Users, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { cn } from '~/lib/utils';

export const Route = createFileRoute('/_authed/send/')({
  component: RouteComponent,
});

type SendOption = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  search?: Record<string, string>;
  group?: 'colombia' | 'us';
} & ({ to: string; onClick?: never } | { to?: never; onClick: () => void });

function RouteComponent() {
  const { t } = useTranslation();

  const options: SendOption[] = [
    {
      title: t('send.options.bloqueFriends.title'),
      description: t('send.options.bloqueFriends.description'),
      to: '/send/bloque-friends',
      icon: Users,
    },
    {
      title: t('send.options.brebKeys.title'),
      description: t('send.options.brebKeys.description'),
      to: '/breb-keys/pay-transfer',
      search: { from: '/send' },
      icon: KeyRound,
      group: 'colombia',
    },
    {
      title: t('send.options.colombianBanks.title'),
      description: t('send.options.colombianBanks.description'),
      to: '/send/colombian-banks',
      icon: Building2,
      group: 'colombia',
    },
    {
      title: t('send.options.usBanks.title'),
      description: t('send.options.usBanks.description'),
      to: '/send/us-banks',
      icon: Building2,
      group: 'us',
    },
    {
      title: t('send.options.blockchain.title'),
      description: t('send.options.blockchain.description'),
      icon: Wallet,
      onClick: () => toast.info(t('send.options.blockchain.comingSoon')),
    },
  ];

  const ungrouped = options.filter((option) => !option.group);
  const colombiaOptions = options.filter(
    (option) => option.group === 'colombia',
  );
  const usOptions = options.filter((option) => option.group === 'us');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link
          to="/"
          replace
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('common.back')}
        </Link>
        <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">
          {t('send.title')}
        </h1>
      </div>

      <section className="flex flex-col gap-3">
        {ungrouped.map((option) => renderSendOption(option))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('send.groups.colombia')}
        </h2>
        {colombiaOptions.map((option) => renderSendOption(option))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('send.groups.us')}
        </h2>
        {usOptions.map((option) => renderSendOption(option))}
      </section>
    </div>
  );
}

function renderSendOption(option: SendOption) {
  const Icon = option.icon;
  const isDisabled = !option.to;
  const content = (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border border-border/75 bg-card/80 p-4 transition-all',
        isDisabled ? 'opacity-60' : 'hover:bg-muted/70',
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex flex-col">
        <p className="text-sm font-medium text-foreground">{option.title}</p>
        <p className="text-xs text-muted-foreground">{option.description}</p>
      </div>
    </div>
  );

  if (option.to) {
    return (
      <Link key={option.title} to={option.to} search={option.search}>
        {content}
      </Link>
    );
  }

  return (
    <button
      key={option.title}
      type="button"
      onClick={option.onClick}
      className="text-left"
    >
      {content}
    </button>
  );
}
