import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { BackButton } from '~/components/back-button';
import { formatCOP, formatUSD } from '~/lib/formatters';

export const Route = createFileRoute('/_authed/legal/fees/')({
  component: RouteComponent,
});

function FeeRow({
  method,
  direction,
  fee,
}: {
  method: string;
  direction: string;
  fee: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="flex flex-col">
        <span className="text-sm text-foreground">{method}</span>
        <span className="text-xs text-muted-foreground">{direction}</span>
      </div>
      <span className="text-xs font-medium text-primary">{fee}</span>
    </div>
  );
}

function RouteComponent() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const sendLabel = t('legal.fees.direction.send');
  const topupLabel = t('legal.fees.direction.topup');

  // Mirrors the fee values shown via FeeInfo on the send and topup screens
  // (src/routes/_authed/send/index.tsx, src/routes/_authed/topup/index.tsx)
  // — update both places if a fee changes.
  const generalFees = [
    {
      method: t('send.options.bloqueFriends.title'),
      direction: sendLabel,
      fee: t('send.noFee'),
    },
  ];

  const colombiaFees = [
    {
      method: t('send.options.brebKeys.title'),
      direction: sendLabel,
      fee: `${formatCOP(500)} + 0.4%`,
    },
    {
      method: t('topup.methods.brebKeys.title'),
      direction: topupLabel,
      fee: `${formatCOP(500)} + 0.2%`,
    },
    {
      method: t('send.options.colombianBanks.title'),
      direction: sendLabel,
      fee: `${formatCOP(5500)} + 0.2%`,
    },
    {
      method: t('topup.methods.colombianBanks.title'),
      direction: topupLabel,
      fee: `${formatCOP(2500)} + 1%`,
    },
  ];

  const usFees = [
    {
      method: t('send.options.usBanks.title'),
      direction: sendLabel,
      fee: `${formatUSD(1)} + 1%`,
    },
    {
      method: t('topup.methods.usBanks.title'),
      direction: topupLabel,
      fee: `${formatUSD(0.25)} + 1%`,
    },
  ];

  const groups = [
    {
      key: 'general',
      title: t('legal.fees.generalSection'),
      rows: generalFees,
    },
    { key: 'co', title: t('legal.fees.colombiaSection'), rows: colombiaFees },
    { key: 'us', title: t('legal.fees.usSection'), rows: usFees },
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

      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-1">
          <p className="mb-1 px-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {group.title}
          </p>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border/85 bg-card/85">
            {group.rows.map((row) => (
              <FeeRow key={`${row.method}-${row.direction}`} {...row} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
