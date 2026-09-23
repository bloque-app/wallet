import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { BackButton } from '~/components/back-button';
import { formatCOP, formatUSD } from '~/lib/formatters';

export const Route = createFileRoute('/_authed/legal/fees/')({
  component: RouteComponent,
});

function FeeRow({ label, fee }: { label: string; fee: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <span className="text-sm text-foreground">{label}</span>
      <span className="text-xs font-medium text-primary">{fee}</span>
    </div>
  );
}

function RouteComponent() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Mirrors the fee values shown via FeeInfo on the send and topup screens
  // (src/routes/_authed/send/index.tsx, src/routes/_authed/topup/index.tsx)
  // — update both places if a fee changes.
  const sendFees = [
    { label: t('send.options.bloqueFriends.title'), fee: t('send.noFee') },
    {
      label: t('send.options.brebKeys.title'),
      fee: `${formatCOP(500)} + 0.4%`,
    },
    {
      label: t('send.options.colombianBanks.title'),
      fee: `${formatCOP(5500)} + 0.2%`,
    },
    {
      label: t('send.options.usBanks.title'),
      fee: `${formatUSD(1)} + 1%`,
    },
  ];

  const topupFees = [
    {
      label: t('topup.methods.colombianBanks.title'),
      fee: `${formatCOP(2500)} + 1%`,
    },
    {
      label: t('topup.methods.brebKeys.title'),
      fee: `${formatCOP(500)} + 0.2%`,
    },
    {
      label: t('topup.methods.usBanks.title'),
      fee: `${formatUSD(0.25)} + 1%`,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <BackButton onClick={() => navigate({ to: '/profile' })} />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-[-0.025em] text-foreground">
          {t('profile.rows.feesAndCommissions')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('legal.fees.description')}
        </p>
      </div>

      <section className="flex flex-col gap-1">
        <p className="mb-1 px-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          {t('legal.fees.sendSection')}
        </p>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border/85 bg-card/85">
          {sendFees.map((row) => (
            <FeeRow key={row.label} {...row} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-1">
        <p className="mb-1 px-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          {t('legal.fees.topupSection')}
        </p>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border/85 bg-card/85">
          {topupFees.map((row) => (
            <FeeRow key={row.label} {...row} />
          ))}
        </div>
      </section>
    </div>
  );
}
