import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { KeyRound, Send, Settings2, Vault } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BackButton } from '~/components/back-button';

export const Route = createFileRoute('/_authed/breb-keys/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-5">
      <div className="flex items-center gap-2">
        <BackButton onClick={() => void navigate({ to: '/' })} />
        <div>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-foreground">
            BRE-B
          </h1>
          <p className="text-xs text-muted-foreground">
            {t('brebKeys.subtitle')}
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <Link to="/breb-keys/pay-transfer" search={{ from: '/breb-keys' }}>
          <div className="flex items-center gap-3 rounded-2xl border border-border/75 bg-card/80 p-4 transition-all hover:bg-muted/70">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
              <Send className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('brebKeys.menu.sendWithKeys.title')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('brebKeys.menu.sendWithKeys.description')}
              </p>
            </div>
          </div>
        </Link>

        <Link to="/breb-keys/deposit" search={{ from: '/breb-keys' }}>
          <div className="flex items-center gap-3 rounded-2xl border border-border/75 bg-card/80 p-4 transition-all hover:bg-muted/70">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
              <Vault className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('brebKeys.menu.deposit.title')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('brebKeys.menu.deposit.description')}
              </p>
            </div>
          </div>
        </Link>

        <Link to="/breb-keys/manage-keys" search={{ ledgerId: undefined }}>
          <div className="flex items-center gap-3 rounded-2xl border border-border/75 bg-card/80 p-4 transition-all hover:bg-muted/70">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.06]">
              <Settings2 className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('brebKeys.menu.yourKeys.title')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('brebKeys.menu.yourKeys.description')}
              </p>
            </div>
          </div>
        </Link>
      </section>

      <div className="mt-auto rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
        <p className="text-sm font-semibold tracking-[-0.015em] text-foreground">
          {t('brebKeys.discoverZone.title')}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t('brebKeys.discoverZone.description')}
        </p>
        <Link
          to="/breb-keys/manage-keys"
          search={{ ledgerId: undefined }}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary"
        >
          <KeyRound className="h-3 w-3" />
          {t('brebKeys.discoverZone.cta')}
        </Link>
      </div>
    </div>
  );
}
