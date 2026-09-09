'use client';

import { Link } from '@tanstack/react-router';
import { KeyRound, Landmark, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { cn } from '~/lib/utils';

/**
 * `topup`/`send`/BRE-B all fail deep inside their own flow with a confusing
 * "no destination account" error when the user has no account at all yet
 * (see BQE-2653) — disabling them up front, before that flow is ever
 * reached, is cheaper to understand than any error message once inside it.
 */
export function QuickActions({ hasAccount }: { hasAccount: boolean }) {
  const { t } = useTranslation();
  const actions = [
    {
      label: t('home.quickActions.topup'),
      href: '/topup',
      icon: Landmark,
    },
    {
      label: t('home.quickActions.send'),
      href: '/send',
      icon: Send,
    },
    {
      label: 'BRE-B',
      href: '/breb-keys',
      icon: KeyRound,
    },
  ];

  return (
    <section className="flex flex-col gap-3">
      <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
        {t('home.quickActions.title')}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          const content = (
            <div
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-2xl border border-border/85 px-2 py-3.5 transition-all duration-200',
                hasAccount
                  ? 'bg-card shadow-[0_14px_28px_-30px_color-mix(in_oklch,var(--foreground)_55%,transparent)] dark:shadow-[0_14px_28px_-30px_rgb(0_0_0_/_0.7)] hover:bg-muted/70 cursor-pointer'
                  : 'bg-card/50 opacity-50 cursor-not-allowed',
              )}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/[0.07]">
                <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium text-foreground leading-tight text-center">
                {action.label}
              </span>
            </div>
          );

          if (!hasAccount) {
            return (
              <button
                key={action.label}
                type="button"
                onClick={() => toast.info(t('home.quickActions.needsAccount'))}
              >
                {content}
              </button>
            );
          }

          return (
            <Link key={action.label} to={action.href}>
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
